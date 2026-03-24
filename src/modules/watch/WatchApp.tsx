/**
 * Slate v3 — Watch Module
 * "Know what happens as it happens."
 *
 * The real-time safety intelligence system. 12+ live data sources,
 * PULSE scoring engine, contagion model, AI analysis.
 *
 * Two views:
 *   Network (CEO) — "The Morning Brief" + Map + News + Intelligence + Feed
 *   Campus (Principal) — Campus-specific intelligence + local feed
 *
 * Architecture:
 *   WatchApp orchestrates all data fetching and refresh cycles.
 *   Sub-components receive data as props — pure rendering, no side effects.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── Engine ──────────────────────────────────────────────────────────────────
import { CAMPUSES } from './data/campuses';
import { RISK_COLORS } from './data/weights';
import { buildContagionZones } from './engine/contagion';
import { scoreCampus, scoreNetwork } from './engine/scoring';
import { buildWeekForecast } from './engine/forecast';
import { buildSafeCorridors } from './engine/corridors';
import { getSchoolPeriod, minutesToArrival, minutesToDismissal } from './engine/time';
import { haversine, ageInHours } from './engine/geo';
import type {
  Incident, ShotSpotterEvent, CampusRisk, ContagionZone,
  IceAlert, ForecastDay, SchoolPeriod, WeatherCurrent, DailyWeather,
  NetworkSummary, SafeCorridor,
} from './engine/types';
import type { RiskLabel } from './data/weights';

// ─── API Fetchers ────────────────────────────────────────────────────────────
import { fetchIncidents, fetchShotSpotter } from './api/cpd';
import { fetchCitizenIncidents } from './api/citizen';
import type { CitizenIncident } from './api/citizen';
import { fetchWeather, fetchWeatherForecast } from './api/weather';
import { fetchAllFeeds, parseNewsAsIncidents } from './api/news';
import { geocodeNewsIncidents } from './api/newsGeocoder';
import { fetchIceSignals } from './api/ice';
import { fetchRealtimeIncidents } from './api/cpdRealtime';
import { fetchRedditIntel } from './api/redditIntel';
import { fetchScannerActivity } from './api/scanner';
import { transcribeSpikeCalls } from './api/scannerIntel';
import type { DispatchIncident } from './api/scannerIntel';
import type { ScannerSummary } from './api/scanner';
import { fetchMedicalExaminerHomicides } from './api/medicalExaminer';
import { fetchCPDMajorIncidents } from './api/cpdMajorIncidents';

// ─── Hooks ───────────────────────────────────────────────────────────────────
import { useRetaliationWindow } from './hooks/useRetaliationWindow';
import { useCampusMemory } from './hooks/useCampusMemory';

// ─── Components ──────────────────────────────────────────────────────────────
import { useSourceHealth } from './components/shared/SourceHealth';
import SourceHealth from './components/shared/SourceHealth';
import NetworkDashboard from './components/network/NetworkDashboard';
import NetworkMap from './components/network/NetworkMap';
import CampusDashboard from './components/campus/CampusDashboard';
import ContagionTab from './components/shared/ContagionTab';

// ─── Theme ───────────────────────────────────────────────────────────────────
import { C, bg, text, brand, border, font, fontSize, fontWeight, shadow, radius, transition, risk, modules as moduleColors, status } from '../../core/theme';

// ─── Types ───────────────────────────────────────────────────────────────────
type WatchView = 'network' | 'campus';
type NetworkTab = 'dashboard' | 'map' | 'news' | 'intelligence' | 'feed' | 'contagion';
type CampusTab = 'watch' | 'feed' | 'contagion';

// ─── Constants ───────────────────────────────────────────────────────────────
const NETWORK_TABS: { id: NetworkTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Briefing', icon: '◉' },
  { id: 'map',       label: 'Map',      icon: '◎' },
  { id: 'news',      label: 'Wire',     icon: '◈' },
  { id: 'intelligence', label: 'Intel', icon: '◇' },
  { id: 'feed',      label: 'Feed',     icon: '◆' },
  { id: 'contagion',  label: 'Contagion', icon: '◎' },
];

const CAMPUS_TABS: { id: CampusTab; label: string }[] = [
  { id: 'watch', label: 'Watch' },
  { id: 'feed',  label: 'Feed' },
  { id: 'contagion', label: 'Contagion' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  WatchApp — Main Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

export default function WatchApp() {
  // ─── View State ──────────────────────────────────────────────────────────
  const [view, setView] = useState<WatchView>('network');
  const [networkTab, setNetworkTab] = useState<NetworkTab>('dashboard');
  const [campusTab, setCampusTab] = useState<CampusTab>('watch');
  const [selectedCampusId, setSelectedCampusId] = useState(1);

  // ─── UI State ────────────────────────────────────────────────────────────
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [updatedAgoText, setUpdatedAgoText] = useState('just now');
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // ─── Source Health ───────────────────────────────────────────────────────
  const sourceHealth = useSourceHealth();

  // Update "Xs ago" text every second
  useEffect(() => {
    const tick = () => {
      const sec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (sec < 5) setUpdatedAgoText('just now');
      else if (sec < 60) setUpdatedAgoText(`${sec}s ago`);
      else setUpdatedAgoText(`${Math.floor(sec / 60)}m ago`);
    };
    tick();
    setJustRefreshed(true);
    const flashTimer = setTimeout(() => setJustRefreshed(false), 1500);
    const t = setInterval(tick, 1_000);
    return () => { clearInterval(t); clearTimeout(flashTimer); };
  }, [lastUpdated]);

  // ─── Data State ──────────────────────────────────────────────────────────
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [acuteIncidents, setAcuteIncidents] = useState<Incident[]>([]);
  const [shotSpotterEvents, setShotSpotterEvents] = useState<ShotSpotterEvent[]>([]);
  const [weather, setWeather] = useState<WeatherCurrent>({
    temperature: 65, apparentTemperature: 65, precipitation: 0, windSpeed: 0,
  });
  const [weatherForecast, setWeatherForecast] = useState<DailyWeather[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [iceAlerts, setIceAlerts] = useState<IceAlert[]>([]);
  const [citizenIncidents, setCitizenIncidents] = useState<CitizenIncident[]>([]);
  const [scannerData, setScannerData] = useState<ScannerSummary | null>(null);
  const [dispatchIncidents, setDispatchIncidents] = useState<DispatchIncident[]>([]);
  const [realtimeIncidents, setRealtimeIncidents] = useState<Incident[]>([]);
  const [newsIncidents, setNewsIncidents] = useState<Incident[]>([]);
  const [redditIncidents, setRedditIncidents] = useState<Incident[]>([]);
  const [dataFreshness, setDataFreshness] = useState({
    cpdLastUpdate: new Date(),
    cpdCount: 0,
    citizenLastUpdate: new Date(),
    citizenCount: 0,
    shotSpotterStatus: 'No activations detected',
    newsLastUpdate: new Date(),
    newsSourceCount: 0,
    realtimeCount: 0,
    realtimeLastUpdate: new Date(),
    newsIncidentCount: 0,
  });

  // ─── Derived State ───────────────────────────────────────────────────────
  const zones = useMemo<ContagionZone[]>(
    () => buildContagionZones(incidents),
    [incidents],
  );

  const selectedCampus = CAMPUSES.find(c => c.id === selectedCampusId) ?? CAMPUSES[0];
  const now = new Date();
  const tempF = weather.apparentTemperature;

  const allRisks = useMemo<CampusRisk[]>(
    () => CAMPUSES.map(c =>
      scoreCampus(c, incidents, acuteIncidents, shotSpotterEvents, zones, tempF, getSchoolPeriod(new Date(), c)),
    ),
    [incidents, acuteIncidents, shotSpotterEvents, zones, tempF],
  );

  const DEFAULT_RISK: CampusRisk = {
    campusId: selectedCampusId,
    score: 0,
    label: 'LOW' as RiskLabel,
    inRetaliationWindow: false,
    retaliationHoursRemaining: 0,
    contagionZones: [],
    factors: [],
  } as CampusRisk;

  const selectedRisk = allRisks.find(r => r.campusId === selectedCampusId) ?? allRisks[0] ?? DEFAULT_RISK;

  const forecast = useMemo(
    () => buildWeekForecast(selectedCampus, incidents, zones, weatherForecast),
    [selectedCampus, incidents, zones, weatherForecast],
  );

  const corridors = useMemo(
    () => buildSafeCorridors(selectedCampus, acuteIncidents),
    [selectedCampus, acuteIncidents],
  );

  const networkSummary = useMemo(
    () => scoreNetwork(CAMPUSES, allRisks, acuteIncidents, iceAlerts.length),
    [allRisks, acuteIncidents, iceAlerts],
  );

  const networkForecast = useMemo(() => {
    const sorted = [...allRisks].sort((a, b) => b.score - a.score);
    const topCampus = sorted.length > 0
      ? CAMPUSES.find(c => c.id === sorted[0].campusId) ?? CAMPUSES[0]
      : CAMPUSES[0];
    return buildWeekForecast(topCampus, incidents, zones, weatherForecast);
  }, [allRisks, incidents, zones, weatherForecast]);

  // Merge all incident sources
  const allIncidents = useMemo(() => {
    const merged = [...incidents, ...realtimeIncidents, ...newsIncidents, ...redditIncidents];
    const seen = new Set<string>();
    return merged.filter(inc => {
      const key = `${inc.lat.toFixed(4)}-${inc.lng.toFixed(4)}-${inc.type}-${inc.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incidents, realtimeIncidents, newsIncidents, redditIncidents]);

  // Retaliation window
  const retWin = useRetaliationWindow(selectedRisk);
  const campusMemory = useCampusMemory(selectedCampusId, selectedRisk);

  // ─── Refresh Cycles ──────────────────────────────────────────────────────
  const refresh90s = useCallback(async () => {
    const [acute, shots, realtime] = await Promise.all([
      sourceHealth.track('cpd_acute', () => fetchIncidents(48, 500)),
      sourceHealth.track('shot_spotter', () => fetchShotSpotter(2, 100)),
      sourceHealth.track('cpd_realtime', () => fetchRealtimeIncidents()),
    ]);
    setRealtimeIncidents(realtime);
    setAcuteIncidents(acute);
    setShotSpotterEvents(shots);
    setLastUpdated(new Date());
    setDataFreshness(prev => ({
      ...prev,
      cpdLastUpdate: new Date(),
      cpdCount: acute.length,
      realtimeCount: realtime.length,
      realtimeLastUpdate: new Date(),
      shotSpotterStatus: shots.length > 0
        ? `Live — ${shots.length} activation${shots.length === 1 ? '' : 's'}`
        : 'No gunfire detected near campuses in the last 2 hours.',
    }));
  }, []);

  const refresh10min = useCallback(async () => {
    const full = await sourceHealth.track('cpd_full', () => fetchIncidents(720, 5000));
    setIncidents(full);
  }, []);

  const refresh30min = useCallback(async () => {
    const [wx, wxForecast] = await Promise.all([
      sourceHealth.track('weather', () => fetchWeather()),
      sourceHealth.track('weather_forecast', () => fetchWeatherForecast()),
    ]);
    setWeather(wx);
    setWeatherForecast(wxForecast);
  }, []);

  const refresh5min = useCallback(async () => {
    const news = await sourceHealth.track('news_rss', () => fetchAllFeeds());
    setNewsItems(news);
    const ice = await sourceHealth.track('ice', () => fetchIceSignals(news));
    setIceAlerts(ice);
    let parsed = await sourceHealth.track('news_geocoded', () => geocodeNewsIncidents(news), r => r.length);
    if (parsed.length === 0) parsed = parseNewsAsIncidents(news);
    setNewsIncidents(parsed);
    const redditData = await sourceHealth.track('reddit', () => fetchRedditIntel(24));
    setRedditIncidents(redditData);
    setDataFreshness(prev => ({
      ...prev,
      newsLastUpdate: new Date(),
      newsSourceCount: new Set(news.map((n: any) => n.source)).size,
      newsIncidentCount: parsed.length,
    }));
  }, []);

  const refreshCitizen = useCallback(async () => {
    const campus = CAMPUSES.find(c => c.id === selectedCampusId) ?? CAMPUSES[0];
    const citizen = await sourceHealth.track('citizen', () => fetchCitizenIncidents(campus.lat, campus.lng, 2.0));
    setCitizenIncidents(citizen);
  }, [selectedCampusId]);

  const refreshScanner = useCallback(async () => {
    const data = await sourceHealth.track('scanner', () => fetchScannerActivity(120), (d: any) => d.totalCalls);
    setScannerData(data);
    if (data && data.spikeZones.length > 0) {
      const dispatches = await sourceHealth.track('scanner_intel', () => transcribeSpikeCalls(data.spikeZones));
      setDispatchIncidents(dispatches);
    }
  }, []);

  // ─── Initial Load + Intervals ────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      await Promise.all([refresh90s(), refresh10min(), refresh30min(), refresh5min(), refreshCitizen(), refreshScanner()]);
      setInitialLoading(false);
    }
    boot();
    const i90  = setInterval(refresh90s, 90_000);
    const i10m = setInterval(refresh10min, 600_000);
    const i30m = setInterval(refresh30min, 1_800_000);
    const i5m  = setInterval(refresh5min, 300_000);
    const iCit = setInterval(refreshCitizen, 120_000);
    const iSc  = setInterval(refreshScanner, 300_000);
    return () => { clearInterval(i90); clearInterval(i10m); clearInterval(i30m); clearInterval(i5m); clearInterval(iCit); clearInterval(iSc); };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectCampus = (id: number) => {
    setSelectedCampusId(id);
    setView('campus');
    setCampusTab('watch');
  };

  const handleBackToNetwork = () => {
    setView('network');
    setNetworkTab('dashboard');
  };

  // ─── Risk-aware styling ──────────────────────────────────────────────────
  const riskLevel = selectedRisk?.label ?? 'LOW';
  const riskStyle = risk[riskLevel.toLowerCase() as keyof typeof risk] ?? risk.low;

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ fontFamily: font.sans, color: text.primary }}>

      {/* ─── Watch Header Bar ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        marginBottom: 4,
        borderBottom: `1px solid ${border.light}`,
      }}>
        {/* Left: View toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handleBackToNetwork}
            style={{
              padding: '6px 16px',
              borderRadius: radius.full,
              border: `1px solid ${view === 'network' ? moduleColors.watch : border.light}`,
              background: view === 'network' ? `${moduleColors.watch}12` : 'transparent',
              color: view === 'network' ? moduleColors.watch : text.muted,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              cursor: 'pointer',
              fontFamily: font.sans,
              transition: transition.fast,
            }}
          >
            Network
          </button>
          <button
            onClick={() => setView('campus')}
            style={{
              padding: '6px 16px',
              borderRadius: radius.full,
              border: `1px solid ${view === 'campus' ? riskStyle.color : border.light}`,
              background: view === 'campus' ? `${riskStyle.color}12` : 'transparent',
              color: view === 'campus' ? riskStyle.color : text.muted,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              cursor: 'pointer',
              fontFamily: font.sans,
              transition: transition.fast,
            }}
          >
            Campus
          </button>
        </div>

        {/* Center: Campus selector (campus view) or tagline (network view) */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {view === 'campus' ? (
            <CampusDropdown
              campuses={CAMPUSES}
              selectedId={selectedCampusId}
              onSelect={handleSelectCampus}
              riskColor={riskStyle.color}
            />
          ) : (
            <span style={{
              fontSize: fontSize.xs,
              color: text.light,
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              Know what happens as it happens
            </span>
          )}
        </div>

        {/* Right: Status indicators */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: fontSize.xs,
          color: text.light,
        }}>
          {view === 'campus' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: radius.full,
              background: `${riskStyle.color}12`,
              color: riskStyle.color,
              fontWeight: fontWeight.bold,
              fontSize: fontSize.xs,
              letterSpacing: '1px',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: riskStyle.color,
                boxShadow: riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
                  ? `0 0 8px ${riskStyle.color}` : 'none',
                animation: riskLevel === 'CRITICAL' ? 'pulse 1.5s infinite' : 'none',
              }} />
              {riskLevel}
            </span>
          )}
          <span style={{
            color: justRefreshed ? brand.brass : text.light,
            transition: 'color 0.5s',
            fontSize: fontSize.xs,
          }}>
            Updated {updatedAgoText}
          </span>
          <span style={{
            fontSize: fontSize.xs,
            fontFamily: font.mono,
            color: text.light,
          }}>
            {weather.temperature.toFixed(0)}°F
          </span>
        </div>
      </div>

      {/* ─── Retaliation Banner ───────────────────────────────────────── */}
      {view === 'campus' && retWin.active && (
        <div style={{
          background: `linear-gradient(90deg, ${status.red} 0%, #991B1B 100%)`,
          color: text.inverse,
          padding: '12px 20px',
          borderRadius: radius.lg,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '18px' }}>⚠</span>
            <div>
              <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.md }}>
                RETALIATION WINDOW ACTIVE
              </div>
              <div style={{ fontSize: fontSize.sm, opacity: 0.9 }}>
                {selectedCampus.name} — {retWin.hoursRemaining?.toFixed(0)}h remaining
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab Navigation ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 20,
        borderBottom: `1px solid ${border.light}`,
      }}>
        {(view === 'network' ? NETWORK_TABS : CAMPUS_TABS).map((tab: any) => {
          const isActive = view === 'network'
            ? networkTab === tab.id
            : campusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => view === 'network' ? setNetworkTab(tab.id) : setCampusTab(tab.id)}
              style={{
                padding: '10px 20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: fontSize.sm,
                fontWeight: isActive ? fontWeight.bold : fontWeight.medium,
                color: isActive ? text.primary : text.muted,
                background: 'transparent',
                borderBottom: isActive ? `2px solid ${brand.brass}` : '2px solid transparent',
                transition: transition.fast,
                fontFamily: font.sans,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {tab.icon && <span style={{ fontSize: '8px', opacity: 0.5 }}>{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Loading State ────────────────────────────────────────────── */}
      {initialLoading ? (
        <WatchSkeleton />
      ) : (
        <>
          {/* ─── Network Views ──────────────────────────────────────── */}
          {view === 'network' && (
            <>
              {networkTab === 'dashboard' && (
                <NetworkDashboard
                  risks={allRisks}
                  summary={networkSummary}
                  forecast={networkForecast}
                  iceAlerts={iceAlerts}
                  shotSpotterEvents={shotSpotterEvents}
                  acuteIncidents={acuteIncidents}
                  citizenIncidents={citizenIncidents}
                  newsIncidents={newsIncidents}
                  dispatchIncidents={dispatchIncidents}
                  scannerCalls={scannerData?.totalCalls ?? 0}
                  scannerSpikeZones={scannerData?.spikeZones.length ?? 0}
                  newsSourceCount={dataFreshness.newsSourceCount}
                  newsIncidentCount={dataFreshness.newsIncidentCount}
                  redditIncidentCount={redditIncidents.length}
                  cpdCount={dataFreshness.cpdCount}
                  onSelectCampus={handleSelectCampus}
                  allIncidents={allIncidents}
                  tempF={tempF}
                />
              )}
              {networkTab === 'map' && (
                <NetworkMap
                  risks={allRisks}
                  zones={zones}
                  incidents24h={acuteIncidents}
                  iceAlerts={iceAlerts}
                  onSelectCampus={handleSelectCampus}
                />
              )}
              {networkTab === 'news' && (
                <WatchNewsFeed newsItems={newsItems} iceAlerts={iceAlerts} />
              )}
              {networkTab === 'intelligence' && (
                <WatchIntelligence
                  allRisks={allRisks}
                  incidents={allIncidents}
                  networkSummary={networkSummary}
                />
              )}
              {networkTab === 'feed' && (
                <WatchFeed incidents={allIncidents} iceAlerts={iceAlerts} />
              )}
              {networkTab === 'contagion' && (
                <ContagionTab
                  zones={zones}
                  allRisks={allRisks}
                  incidents={allIncidents}
                  selectedCampus={null}
                />
              )}
            </>
          )}

          {/* ─── Campus Views ───────────────────────────────────────── */}
          {view === 'campus' && (
            <>
              {campusTab === 'watch' && (
                <CampusDashboard
                  campus={selectedCampus}
                  risk={selectedRisk}
                  allRisks={allRisks}
                  incidents={allIncidents}
                  acuteIncidents={acuteIncidents}
                  shotSpotterEvents={shotSpotterEvents}
                  citizenIncidents={citizenIncidents}
                  newsIncidents={newsIncidents}
                  dispatchIncidents={dispatchIncidents}
                  iceAlerts={iceAlerts}
                  scannerData={scannerData}
                  corridors={corridors}
                  forecast={forecast}
                  tempF={tempF}
                  schoolPeriod={getSchoolPeriod(new Date(), selectedCampus)}
                  onBeginProtocol={() => {}}
                  onAskPulse={() => {}}
                />
              )}
              {campusTab === 'feed' && (
                <WatchFeed
                  incidents={allIncidents}
                  iceAlerts={iceAlerts}
                  campus={selectedCampus}
                />
              )}
              {campusTab === 'contagion' && (
                <ContagionTab
                  zones={zones}
                  allRisks={allRisks}
                  incidents={allIncidents}
                  selectedCampus={selectedCampus}
                />
              )}
            </>
          )}
        </>
      )}

      {/* ─── Source Health Monitor ─────────────────────────────────────── */}
      <div style={{ maxWidth: 1080, margin: '32px auto 0', padding: '0 16px' }}>
        <SourceHealth sources={sourceHealth.sources} getSummary={sourceHealth.getSummary} />
      </div>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        textAlign: 'center',
        padding: '20px 16px',
        marginTop: 16,
        fontSize: fontSize.xs,
        color: text.muted,
        borderTop: `1px solid ${border.light}`,
      }}>
        <div style={{ letterSpacing: '0.5px' }}>
          Slate Watch — Start with the Facts — {weather.temperature.toFixed(0)}°F
        </div>
        <div style={{ fontSize: '9px', color: text.light, marginTop: 4 }}>
          Madden Education Advisory · Chicago, Illinois · 2026
        </div>
      </footer>

      {/* Pulse animation for critical risk */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  Sub-components (inline for now — will be extracted as they grow)
// ═══════════════════════════════════════════════════════════════════════════════

/** Campus Dropdown Selector */
function CampusDropdown({ campuses, selectedId, onSelect, riskColor }: {
  campuses: typeof CAMPUSES;
  selectedId: number;
  onSelect: (id: number) => void;
  riskColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = campuses.find(c => c.id === selectedId);
  const sorted = [...campuses].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = search.trim()
    ? sorted.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.short.toLowerCase().includes(search.toLowerCase()) ||
        c.communityArea.toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { setOpen(!open); setSearch(''); }}
        style={{
          background: bg.subtle,
          border: `1px solid ${border.light}`,
          borderRadius: radius.lg,
          padding: '6px 16px',
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          cursor: 'pointer',
          color: text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: font.sans,
          transition: transition.fast,
        }}
      >
        {selected?.short ?? 'Select campus'}
        <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: 4,
          width: 300,
          background: bg.card,
          borderRadius: radius.lg,
          boxShadow: shadow.xl,
          zIndex: 2000,
          overflow: 'hidden',
          border: `1px solid ${border.light}`,
        }}>
          <input
            autoFocus
            type="text"
            placeholder="Search campuses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: 'none',
              borderBottom: `1px solid ${border.light}`,
              fontSize: fontSize.sm,
              outline: 'none',
              color: text.primary,
              boxSizing: 'border-box',
              fontFamily: font.sans,
            }}
          />
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); setOpen(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: `1px solid ${bg.subtle}`,
                  background: c.id === selectedId ? bg.selected : bg.card,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: fontSize.sm,
                  color: c.id === selectedId ? text.primary : text.secondary,
                  fontWeight: c.id === selectedId ? fontWeight.bold : fontWeight.normal,
                  fontFamily: font.sans,
                }}
              >
                <div>{c.short}</div>
                <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 2 }}>
                  {c.communityArea}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/** News Feed — v3 placeholder (will be fully rebuilt) */
function WatchNewsFeed({ newsItems, iceAlerts }: { newsItems: any[]; iceAlerts: IceAlert[] }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: text.muted,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: `1px solid ${border.light}`,
      }}>
        The Wire — {newsItems.length} stories from {new Set(newsItems.map((n: any) => n.source)).size} sources
      </div>
      {newsItems.slice(0, 30).map((item: any, i: number) => (
        <div key={i} style={{
          padding: '12px 0',
          borderBottom: `1px solid ${border.light}`,
        }}>
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary, marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ fontSize: fontSize.xs, color: text.light }}>
            {item.source} · {new Date(item.pubDate).toLocaleString()}
          </div>
        </div>
      ))}
      {newsItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: text.light, fontSize: fontSize.sm }}>
          Loading news feeds...
        </div>
      )}
    </div>
  );
}


/** Intelligence Page — v3 placeholder */
function WatchIntelligence({ allRisks, incidents, networkSummary }: {
  allRisks: CampusRisk[];
  incidents: Incident[];
  networkSummary: NetworkSummary;
}) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        background: `linear-gradient(135deg, ${bg.subtle} 0%, ${bg.card} 100%)`,
        border: `1px solid ${brand.brass}30`,
        borderRadius: radius.lg,
        padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: brand.gold, fontSize: fontSize.xl }}>✦</span>
          <span style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            color: brand.brass,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Slate Intelligence
          </span>
        </div>
        <div style={{
          fontSize: fontSize.md,
          color: text.secondary,
          lineHeight: 1.8,
          fontFamily: font.serif,
        }}>
          Ask Slate anything about your network's safety posture. This module provides
          AI-powered analysis of all {incidents.length} incidents across {allRisks.length} campuses,
          with {allRisks.filter(r => r.label !== 'LOW').length} currently at elevated status.
        </div>
      </div>
    </div>
  );
}


/** Feed View — chronological incident list */
function WatchFeed({ incidents, iceAlerts, campus }: {
  incidents: Incident[];
  iceAlerts: IceAlert[];
  campus?: typeof CAMPUSES[0];
}) {
  const filtered = campus
    ? incidents.filter(inc => haversine(campus.lat, campus.lng, inc.lat, inc.lng) <= 2.0)
    : incidents;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: text.muted,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: `1px solid ${border.light}`,
      }}>
        {campus ? `${campus.short} Area` : 'Network'} — {filtered.length} incidents
      </div>
      {filtered.slice(0, 50).map((inc, i) => {
        const isViolent = ['HOMICIDE', 'SHOOTING', 'WEAPONS VIOLATION', 'BATTERY', 'ROBBERY', 'ASSAULT'].includes(inc.type);
        return (
          <div key={i} style={{
            padding: '10px 0',
            borderBottom: `1px solid ${border.light}`,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isViolent ? status.red : status.amber,
              marginTop: 5,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: text.primary,
              }}>
                {inc.type}
                {inc.description && (
                  <span style={{ color: text.muted, fontWeight: fontWeight.normal }}>
                    {' '}— {inc.description}
                  </span>
                )}
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 2 }}>
                {new Date(inc.date).toLocaleString()} · {inc.block}
                {campus && (
                  <span> · {haversine(campus.lat, campus.lng, inc.lat, inc.lng).toFixed(1)}mi</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: text.light, fontSize: fontSize.sm }}>
          No incidents to display.
        </div>
      )}
    </div>
  );
}


/** Loading skeleton */
function WatchSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: i === 1 ? 200 : 120,
          borderRadius: radius.lg,
          background: `linear-gradient(90deg, ${bg.subtle} 0%, ${bg.card} 50%, ${bg.subtle} 100%)`,
          backgroundSize: '800px 100%',
          animation: 'shimmer 1.5s infinite linear',
        }} />
      ))}
    </div>
  );
}
