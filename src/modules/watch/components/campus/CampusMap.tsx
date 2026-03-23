/**
 * CampusMap — Interactive Leaflet incident map for a single campus.
 * Lives between ContagionPanel and IncidentList. Always visible.
 * Control panel: time/distance/opacity sliders, type filters, layer toggles.
 * Fullscreen command mode. Toast notifications for new incidents.
 *
 * D3 FIXES:
 *   1. Time slider now filters ALL sources (CPD included) — no more bypass
 *   2. Default distance reduced to 1.0mi (was 3.0) for focused campus view
 *   3. Scanner + corridor layers default OFF to reduce visual noise
 *   4. Banner text clarified with exact filter state
 */

const appStartTime = Date.now();
const SETTLE_TIME_MS = 15_000;
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  MapContainer, TileLayer, Circle, CircleMarker,
  Marker, Popup, Tooltip, Polyline, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Campus } from '../../data/campuses';
import type { Incident, ShotSpotterEvent, ContagionZone, CampusRisk, SafeCorridor } from '../../engine/types';
import type { ScannerSummary } from '../../api/scanner';
import { RISK_COLORS } from '../../data/weights';
import { haversine, bearing, compassLabel, fmtAgo } from '../../engine/geo';
import 'leaflet/dist/leaflet.css';

interface Props {
  campus: Campus;
  risk: CampusRisk;
  incidents: Incident[];
  shotSpotterEvents: ShotSpotterEvent[];
  contagionZones: ContagionZone[];
  corridors: SafeCorridor[];
  scannerData?: ScannerSummary | null;
}

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const MI_TO_M = 1609.34;

const TYPE_STYLES: Record<string, { fill: string; radius: number }> = {
  'HOMICIDE':            { fill: '#D45B4F', radius: 7 },
  'WEAPONS VIOLATION':   { fill: '#C66C3D', radius: 5.5 },
  'BATTERY':             { fill: '#B79145', radius: 4.5 },
  'ASSAULT':             { fill: '#EAB308', radius: 4 },
  'ROBBERY':             { fill: '#7C3AED', radius: 4 },
  'NARCOTICS':           { fill: '#0D9488', radius: 3.5 },
  'NEWS':                { fill: '#2563EB', radius: 5 },
};
const DEFAULT_STYLE = { fill: '#6B7280', radius: 3 };

const TYPE_COLORS: Record<string, string> = {
  'HOMICIDE': '#D45B4F', 'WEAPONS VIOLATION': '#C66C3D', 'BATTERY': '#B79145',
  'ASSAULT': '#EAB308', 'ROBBERY': '#7C3AED', 'NARCOTICS': '#0D9488', 'SHOTSPOTTER': '#0D9488',
  'NEWS': '#2563EB',
};

const TYPE_LABELS: Record<string, string> = {
  'HOMICIDE': 'HOMICIDE', 'WEAPONS VIOLATION': 'WEAPONS', 'BATTERY': 'BATTERY',
  'ASSAULT': 'ASSAULT', 'ROBBERY': 'ROBBERY', 'NARCOTICS': 'NARCOTICS', 'SHOTSPOTTER': 'SHOTSPOTTER',
  'NEWS': '🗞 NEWS',
};

const ALL_TYPES = ['HOMICIDE', 'WEAPONS VIOLATION', 'BATTERY', 'ASSAULT', 'ROBBERY', 'NARCOTICS', 'SHOTSPOTTER', 'NEWS'] as const;

const CORRIDOR_COLORS: Record<string, string> = { CLEAR: '#16A34A', CAUTION: '#B79145', AVOID: '#D45B4F' };

const TALKGROUP_DISTRICTS: Record<number, { name: string; lat: number; lng: number }> = {
  2:  { name: 'D2 Wentworth',      lat: 41.830, lng: -87.629 },
  3:  { name: 'D3 Grand Crossing', lat: 41.760, lng: -87.612 },
  4:  { name: 'D4 South Chicago',  lat: 41.738, lng: -87.565 },
  6:  { name: 'D6 Gresham',        lat: 41.749, lng: -87.694 },
  7:  { name: 'D7 Englewood',      lat: 41.779, lng: -87.645 },
  8:  { name: 'D8 Chicago Lawn',   lat: 41.773, lng: -87.720 },
  9:  { name: 'D9 Deering',        lat: 41.714, lng: -87.624 },
  11: { name: 'D11 Harrison',      lat: 41.881, lng: -87.728 },
  12: { name: 'D12 Near West',     lat: 41.872, lng: -87.676 },
  13: { name: 'D13 Wood',          lat: 41.838, lng: -87.661 },
  15: { name: 'D15 Austin',        lat: 41.893, lng: -87.766 },
  17: { name: 'D17 Albany Park',   lat: 41.970, lng: -87.720 },
  20: { name: 'D20 Rogers Park',   lat: 42.009, lng: -87.670 },
};

const SNAP_HOURS = [2, 6, 24, 168, 336, 720];
const SNAP_LABELS = ['2h', '6h', '24h', '7d', '14d', '30d'];

const ZONE_FILLS: Record<string, { color: string; baseOp: number }> = {
  ACUTE:  { color: '#D45B4F', baseOp: 0.35 },
  ACTIVE: { color: '#B79145', baseOp: 0.20 },
  WATCH:  { color: '#6B7280', baseOp: 0.08 },
};

function fmtTimeLabel(h: number): string {
  if (h < 24) return `${h} hours`;
  if (h === 24) return '24 hours';
  return `${Math.round(h / 24)} days`;
}

function getStyle(type: string) { return TYPE_STYLES[type] ?? DEFAULT_STYLE; }

/* ═══════════════════════════════════════════════════════
   CSS Keyframes
   ═══════════════════════════════════════════════════════ */

const KEYFRAMES = `
@keyframes sonarPing {
  0% { transform: scale(0.4); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes newIncPulse {
  0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.6); }
  70% { box-shadow: 0 0 0 14px rgba(220,38,38,0); }
  100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
}
.pulse-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}
.pulse-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #121315;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
}
.pulse-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #121315;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  border: none;
}
`;

/* ═══════════════════════════════════════════════════════
   Leaflet DivIcons
   ═══════════════════════════════════════════════════════ */

function makeShieldIcon(label: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
      <svg width="28" height="34" viewBox="0 0 28 34">
        <path d="M14 1L2 7v12c0 9.3 5.1 17.9 12 21.5 6.9-3.6 12-12.2 12-21.5V7L14 1z" fill="#121315" stroke="#fff" stroke-width="1.5"/>
        <text x="14" y="20" text-anchor="middle" fill="#fff" font-size="10" font-weight="800" font-family="system-ui">N</text>
      </svg>
      <div style="font-size:10px;font-weight:700;color:#121315;white-space:nowrap;margin-top:1px;text-shadow:0 0 3px #fff,0 0 3px #fff;">${label}</div>
    </div>`,
    className: '',
    iconSize: [80, 50],
    iconAnchor: [40, 34],
  });
}

function makeSonarIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="position:relative;width:28px;height:28px;">
      <div style="position:absolute;inset:0;border-radius:50%;border:2px solid #0D9488;animation:sonarPing 2s ease-out infinite;"></div>
      <div style="position:absolute;inset:0;border-radius:50%;border:2px solid #0D9488;animation:sonarPing 2s ease-out infinite 0.66s;"></div>
      <div style="position:absolute;inset:0;border-radius:50%;border:2px solid #0D9488;animation:sonarPing 2s ease-out infinite 1.33s;"></div>
      <div style="position:absolute;top:50%;left:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#0D9488;"></div>
    </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/* ═══════════════════════════════════════════════════════
   Inner component: Map controller (fitBounds, center)
   ═══════════════════════════════════════════════════════ */

function MapController({ fitTrigger, bounds }: { fitTrigger: number; bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (fitTrigger > 0 && bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      if (map.getZoom() < 13) map.setZoom(13);
    }
  }, [fitTrigger, map, bounds]);
  return null;
}

function CampusCenterController({ campusId, lat, lng }: { campusId: number; lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14, { animate: true, duration: 0.5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);
  return null;
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

interface ToastItem { id: string; text: string; isHomicide: boolean }

export default function CampusMap({ campus, risk, incidents, shotSpotterEvents, contagionZones, corridors, scannerData }: Props) {
  /* ---- Slider state ---- */
  const [timeSnapIdx, setTimeSnapIdx] = useState(2); // 24h default
  const timeWindowH = SNAP_HOURS[timeSnapIdx];
  const [distanceRadius, setDistanceRadius] = useState(1.0); // D3 FIX: was 3.0, now 1.0 for focused view
  const [zoneOpacity, setZoneOpacity] = useState(60);

  /* ---- Type filters ---- */
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>(() => {
    const f: Record<string, boolean> = {};
    for (const t of ALL_TYPES) f[t] = true;
    return f;
  });

  /* ---- Layer toggles ---- */
  const [showInc, setShowInc] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showRadius, setShowRadius] = useState(true);
  const [showCorridors, setShowCorridors] = useState(false); // D3 FIX: default OFF
  const [showScanner, setShowScanner] = useState(false);     // D3 FIX: default OFF

  /* ---- UI ---- */
  const [fullscreen, setFullscreen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /* ---- Toast: detect new incidents ---- */
  const prevIdsRef = useRef<Set<string>>(new Set());
  const hasSeededRef = useRef(false);
  useEffect(() => {
    const ids = new Set(incidents.map(i => i.id));

    if (Date.now() - appStartTime < SETTLE_TIME_MS) {
      prevIdsRef.current = ids;
      hasSeededRef.current = incidents.length > 0;
      return;
    }

    if (!hasSeededRef.current) {
      if (incidents.length > 0) {
        prevIdsRef.current = ids;
        hasSeededRef.current = true;
      }
      return;
    }
    for (const inc of incidents) {
      if (prevIdsRef.current.has(inc.id)) continue;
      const d = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      if (d > 3.0) continue;
      const dir = compassLabel(bearing(campus.lat, campus.lng, inc.lat, inc.lng));
      const t: ToastItem = {
        id: inc.id,
        text: `New incident — ${inc.type} — ${d.toFixed(1)}mi ${dir} — ${fmtAgo(inc.date)}`,
        isHomicide: inc.type === 'HOMICIDE',
      };
      setToasts(prev => [...prev, t].slice(-3));
      const dur = inc.type === 'HOMICIDE' ? 8000 : 4000;
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), dur);
    }
    prevIdsRef.current = ids;
  }, [incidents, campus.lat, campus.lng]);

  /* ---- Filtered incidents ---- */
  /* D3 FIX: Time filter now applies to ALL sources uniformly.
     CPD data is 7-10 days old, so set the time slider to 14d or 30d to see it.
     This eliminates the confusing behavior where the slider appeared broken. */
  const filteredInc = useMemo(() => {
    const cutoffMs = Date.now() - (timeWindowH * 60 * 60 * 1000);

    const result = incidents.filter(inc => {
      if (!inc.date) return false;
      const incMs = new Date(inc.date).getTime();
      if (isNaN(incMs)) return false;

      // Distance filter — applies to all sources
      const d = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      if (d > distanceRadius) return false;

      // Time filter — applies to ALL sources uniformly (D3 FIX)
      if (incMs < cutoffMs) return false;

      // Type filter
      if (inc.source === 'NEWS') {
        if (!typeFilters['NEWS']) return false;
      } else {
        const key = TYPE_STYLES[inc.type] ? inc.type : null;
        if (key && !typeFilters[key]) return false;
      }
      return true;
    });

    return result;
  }, [incidents, timeSnapIdx, timeWindowH, distanceRadius, campus.lat, campus.lng, typeFilters]);

  /* ---- Filtered ShotSpotter ---- */
  const filteredSS = useMemo(() => {
    if (!typeFilters['SHOTSPOTTER']) return [];
    const cutoffMs = Date.now() - (timeWindowH * 60 * 60 * 1000);
    return shotSpotterEvents.filter(e => {
      if (!e.date) return false;
      const eMs = new Date(e.date).getTime();
      if (isNaN(eMs) || eMs < cutoffMs) return false;
      return haversine(campus.lat, campus.lng, e.lat, e.lng) <= distanceRadius;
    });
  }, [shotSpotterEvents, timeWindowH, distanceRadius, campus.lat, campus.lng, typeFilters]);

  /* ---- Type counts ---- */
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of ALL_TYPES) c[t] = 0;
    for (const inc of filteredInc) {
      if (inc.source === 'NEWS') {
        c['NEWS'] = (c['NEWS'] || 0) + 1;
      } else if (TYPE_STYLES[inc.type]) {
        c[inc.type] = (c[inc.type] || 0) + 1;
      }
    }
    c['SHOTSPOTTER'] = filteredSS.length;
    return c;
  }, [filteredInc, filteredSS]);

  const visibleCount = filteredInc.length + filteredSS.length;

  /* ---- Campus popup stats ---- */
  const inc24h1mi = useMemo(() => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    return incidents.filter(i => {
      const ms = new Date(i.date).getTime();
      return !isNaN(ms) && ms >= cutoff && haversine(campus.lat, campus.lng, i.lat, i.lng) <= 1.0;
    }).length;
  }, [incidents, campus.lat, campus.lng]);

  /* ---- Map bounds ---- */
  const mapBounds = useMemo(() => {
    const pts: [number, number][] = [[campus.lat, campus.lng]];
    for (const inc of filteredInc) pts.push([inc.lat, inc.lng]);
    for (const e of filteredSS) pts.push([e.lat, e.lng]);
    for (const z of contagionZones) pts.push([z.lat, z.lng]);
    return pts.length > 1 ? L.latLngBounds(pts) : null;
  }, [campus.lat, campus.lng, filteredInc, filteredSS, contagionZones]);

  /* ---- Icons ---- */
  const shieldIcon = useMemo(() => makeShieldIcon(campus.short), [campus.short]);
  const sonarIcon = useMemo(() => makeSonarIcon(), []);

  /* ---- Slider background ---- */
  const sliderBg = (pct: number) => `linear-gradient(to right, #121315 ${pct}%, #E5E7EB ${pct}%)`;
  const timePct = (timeSnapIdx / (SNAP_HOURS.length - 1)) * 100;
  const distPct = ((distanceRadius - 0.1) / 2.9) * 100;

  const toggleType = useCallback((t: string) => {
    setTypeFilters(prev => ({ ...prev, [t]: !prev[t] }));
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const mapH = fullscreen ? '100%' : (isMobile ? 380 : 480);

  const riskColors = risk ? RISK_COLORS[risk.label] : RISK_COLORS.LOW;

  /* ═══ Control Panel JSX ═══ */
  const controlPanel = (
    <div style={{
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      fontSize: 14,
    }}>
      {/* Slider 1: Time Window */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: '#121315' }}>Time Window</span>
          <span style={{ color: '#6B7280', fontSize: 13 }}>Last {fmtTimeLabel(timeWindowH)}</span>
        </div>
        <input
          type="range" min={0} max={SNAP_HOURS.length - 1} value={timeSnapIdx}
          onChange={e => setTimeSnapIdx(Number(e.target.value))}
          className="pulse-slider"
          style={{ background: sliderBg(timePct) }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
          {SNAP_LABELS.map(l => <span key={l}>{l}</span>)}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          All sources filtered to last {fmtTimeLabel(timeWindowH)} · CPD data is typically 7-10 days old — use 14d+ to see it
        </div>
      </div>

      {/* Slider 2: Distance */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: '#121315' }}>Distance from Campus</span>
          <span style={{ color: '#6B7280', fontSize: 13 }}>{distanceRadius.toFixed(1)} miles</span>
        </div>
        <input
          type="range" min={1} max={30} value={Math.round(distanceRadius * 10)}
          onChange={e => setDistanceRadius(Number(e.target.value) / 10)}
          className="pulse-slider"
          style={{ background: sliderBg(distPct) }}
        />
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
          Campus radius: {distanceRadius.toFixed(1)} miles — {visibleCount} incident{visibleCount !== 1 ? 's' : ''} visible
        </div>
      </div>

      {/* Slider 3: Zone Opacity */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: '#121315' }}>Contagion Zone Visibility</span>
          <span style={{ color: '#6B7280', fontSize: 13 }}>{zoneOpacity}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={zoneOpacity}
          onChange={e => setZoneOpacity(Number(e.target.value))}
          className="pulse-slider"
          style={{ background: sliderBg(zoneOpacity) }}
        />
      </div>

      {/* Type filter toggles */}
      <div>
        <div style={{ fontWeight: 600, color: '#121315', marginBottom: 8 }}>Incident Types</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_TYPES.map(t => (
            <button key={t} onClick={() => toggleType(t)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 20, border: '1px solid #E5E7EB',
              background: typeFilters[t] ? TYPE_COLORS[t] : '#F9FAFB',
              color: typeFilters[t] ? '#fff' : '#6B7280',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              minHeight: 44,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: typeFilters[t] ? '#fff' : TYPE_COLORS[t],
              }} />
              {TYPE_LABELS[t]} ({typeCounts[t] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Layer toggles */}
      <div>
        <div style={{ fontWeight: 600, color: '#121315', marginBottom: 8 }}>Layers</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <LayerToggle label="Incidents" on={showInc} onToggle={() => setShowInc(v => !v)} />
          <LayerToggle label="Contagion Zones" on={showZones} onToggle={() => setShowZones(v => !v)} />
          <LayerToggle label="Campus Radius" on={showRadius} onToggle={() => setShowRadius(v => !v)} />
          <LayerToggle label="Safe Corridors" on={showCorridors} onToggle={() => setShowCorridors(v => !v)} />
          <LayerToggle label="Scanner Activity" on={showScanner} onToggle={() => setShowScanner(v => !v)} />
        </div>
      </div>
    </div>
  );

  /* ═══ Render ═══ */
  return (
    <div style={fullscreen ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', display: 'flex', flexDirection: 'column' } : {}}>
      <style>{KEYFRAMES}</style>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10001, display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: t.isHomicide ? '#D45B4F' : '#121315', color: '#fff',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>{t.text}</div>
          ))}
        </div>
      )}

      {/* Incident count banner */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', fontSize: 13, color: '#374151',
        background: visibleCount > 0 ? '#FEF9C3' : '#F0FDF4',
        border: `1px solid ${visibleCount > 0 ? '#FDE68A' : '#BBF7D0'}`,
        borderRadius: fullscreen ? 0 : '12px 12px 0 0',
        borderBottom: 'none',
      }}>
        <span>
          <strong>Showing {visibleCount} incident{visibleCount !== 1 ? 's' : ''}</strong> within {distanceRadius.toFixed(1)}mi · last {fmtTimeLabel(timeWindowH)}
        </span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>
          {incidents.length} total loaded
        </span>
      </div>

      {/* Approximate location banner */}
      {typeFilters['NEWS'] && (typeCounts['NEWS'] ?? 0) > 0 && (
        <div style={{
          padding: '6px 14px', fontSize: 11, color: '#92400E',
          background: '#FFFBEB', borderBottom: '1px solid #FDE68A',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ℹ️ News locations are approximate — geocoded from headlines by AI
        </div>
      )}

      {/* Map container */}
      <div style={{
        height: mapH, borderRadius: fullscreen ? 0 : `0 0 12px 12px`,
        overflow: 'hidden', border: fullscreen ? 'none' : '1px solid #E5E7EB',
        borderTop: fullscreen ? 'none' : 'none',
        position: 'relative', flex: fullscreen ? 1 : undefined,
      }}>
        <MapContainer
          center={[campus.lat, campus.lng]}
          zoom={14}
          minZoom={11}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController fitTrigger={fitTrigger} bounds={mapBounds} />
          <CampusCenterController campusId={campus.id} lat={campus.lat} lng={campus.lng} />

          {/* Safe corridor polylines */}
          {showCorridors && corridors.map(c => (
            <Polyline
              key={c.name}
              positions={c.waypoints.map(w => [w.lat, w.lng] as [number, number])}
              pathOptions={{
                color: CORRIDOR_COLORS[c.status] ?? '#6B7280',
                weight: c.status === 'AVOID' ? 4 : 3,
                opacity: 0.7,
                dashArray: c.status === 'CLEAR' ? '6 6' : undefined,
              }}
            >
              <Tooltip sticky>
                <span style={{ fontSize: 11 }}>{c.name} — {c.status}
                  {c.incidentCount24h > 0 && ` — ${c.incidentCount24h} incident${c.incidentCount24h !== 1 ? 's' : ''}`}
                </span>
              </Tooltip>
            </Polyline>
          ))}

          {/* Campus radius ring */}
          {showRadius && (
            <Circle
              center={[campus.lat, campus.lng]}
              radius={distanceRadius * MI_TO_M}
              pathOptions={{
                color: '#121315', fillColor: 'transparent', fillOpacity: 0,
                weight: 1.5, opacity: 0.3, dashArray: '8 6',
              }}
            />
          )}

          {/* Contagion zones */}
          {showZones && contagionZones.map(zone => {
            const zf = ZONE_FILLS[zone.phase];
            const op = zf.baseOp * (zoneOpacity / 100);
            return (
              <Circle
                key={zone.incidentId}
                center={[zone.lat, zone.lng]}
                radius={zone.radius * MI_TO_M}
                pathOptions={{
                  color: zf.color, fillColor: zf.color,
                  fillOpacity: op, weight: zone.phase === 'ACUTE' ? 2 : 1,
                  dashArray: '6 4', opacity: zoneOpacity / 100,
                }}
              >
                {zone.phase !== 'WATCH' && (
                  <Tooltip permanent direction="center">
                    <span style={{ fontSize: 10, fontWeight: 700, color: zf.color }}>{zone.phase}</span>
                  </Tooltip>
                )}
                <Popup>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong>Homicide</strong>{zone.block && <> — {zone.block}</>}
                    <br />{fmtAgo(zone.homicideDate)} — <strong>{zone.phase}</strong>
                    <br />{zone.daysLeft} days remaining on 125-day clock
                    {zone.retWin && <><br /><strong style={{ color: '#D45B4F' }}>RETALIATION WINDOW ACTIVE</strong></>}
                  </div>
                </Popup>
              </Circle>
            );
          })}

          {/* Scanner activity district bubbles */}
          {showScanner && scannerData && Object.entries(scannerData.talkgroupCounts).map(([tgStr, count]) => {
            const tg = Number(tgStr);
            const district = TALKGROUP_DISTRICTS[tg];
            if (!district) return null;
            const maxCount = Math.max(...Object.values(scannerData.talkgroupCounts));
            const intensity = count / Math.max(maxCount, 1);
            const radius = 400 + intensity * 1200;
            const color = intensity > 0.6 ? '#D95F0C' : intensity > 0.3 ? '#B79145' : '#6B7280';
            const dist = haversine(campus.lat, campus.lng, district.lat, district.lng);
            if (dist > 8) return null;
            return (
              <Circle
                key={`scanner_${tg}`}
                center={[district.lat, district.lng]}
                radius={radius}
                pathOptions={{
                  color, fillColor: color,
                  fillOpacity: 0.08 + intensity * 0.12,
                  weight: 1.5, opacity: 0.4 + intensity * 0.4,
                  dashArray: '6 4',
                }}
              >
                <Tooltip>
                  <span style={{ fontSize: 11 }}>
                    📡 {district.name} — {count} scanner call{count !== 1 ? 's' : ''} (2h window)
                  </span>
                </Tooltip>
              </Circle>
            );
          })}

          {/* Campus shield marker */}
          <Marker position={[campus.lat, campus.lng]} icon={shieldIcon}>
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.6, minWidth: 180 }}>
                <strong>{campus.name}</strong>
                <br />Risk: <span style={{ fontWeight: 700, color: riskColors.color }}>
                  {risk.score} ({risk.label})
                </span>
                <br />{inc24h1mi} incident{inc24h1mi !== 1 ? 's' : ''} within 1mi in last 24h
              </div>
            </Popup>
          </Marker>

          {/* Incident markers */}
          {showInc && filteredInc.map(inc => {
            const isNews = inc.source === 'NEWS';
            const s = isNews ? TYPE_STYLES['NEWS'] : getStyle(inc.type);
            const d = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
            const dir = compassLabel(bearing(campus.lat, campus.lng, inc.lat, inc.lng));
            const inZone = contagionZones.find(z =>
              haversine(z.lat, z.lng, inc.lat, inc.lng) <= z.radius,
            );
            return (
              <CircleMarker
                key={inc.id}
                center={[inc.lat, inc.lng]}
                radius={s.radius}
                pathOptions={{
                  color: s.fill, fillColor: s.fill,
                  fillOpacity: isNews ? 0.8 : 0.7,
                  weight: inc.type === 'HOMICIDE' ? 2 : isNews ? 2 : 1,
                  dashArray: isNews ? '4 3' : undefined,
                }}
              >
                <Popup>
                  <div style={{ fontSize: 13, lineHeight: 1.6, minWidth: 200 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                      fontSize: 11, fontWeight: 700, color: '#fff', background: s.fill,
                    }}>{isNews ? `🗞 ${inc.type !== 'BATTERY' ? inc.type : 'NEWS'}` : inc.type}</span>
                    {isNews && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#B79145',
                        background: '#FFFBEB', padding: '1px 6px', borderRadius: 3,
                      }}>~ APPROXIMATE LOCATION</span>
                    )}
                    {isNews && inc.block && (
                      <><br /><span style={{ fontSize: 11, color: '#6B7280' }}>{inc.block}</span></>
                    )}
                    {inc.headline ? (
                      <><br /><strong style={{ color: '#2563EB' }}>{inc.headline}</strong></>
                    ) : !isNews ? (
                      <><br />{inc.block}</>
                    ) : null}
                    <br />{d.toFixed(1)} miles {dir.toLowerCase()}
                    <br />{fmtAgo(inc.date)}
                    {inc.url && <><br /><a href={inc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontSize: 11 }}>Read full story →</a></>}
                    {!isNews && inZone ? (
                      <><br />In contagion zone: <strong style={{ color: ZONE_FILLS[inZone.phase].color }}>
                        YES — {inZone.phase} phase, {inZone.daysLeft} days remaining
                      </strong></>
                    ) : !isNews && inc.type === 'HOMICIDE' ? (
                      <><br />In contagion zone: <span style={{ color: '#6B7280' }}>NO</span></>
                    ) : null}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* ShotSpotter sonar markers */}
          {showInc && filteredSS.map(evt => (
            <Marker key={evt.id} position={[evt.lat, evt.lng]} icon={sonarIcon}>
              <Popup>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 700, color: '#fff', background: '#0D9488',
                  }}>SHOTSPOTTER</span>
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#B79145',
                    background: '#FFFBEB', padding: '1px 6px', borderRadius: 3,
                  }}>UNCONFIRMED</span>
                  <br />{evt.rounds} round{evt.rounds !== 1 ? 's' : ''} detected
                  <br />{fmtAgo(evt.date)}
                  <br />{haversine(campus.lat, campus.lng, evt.lat, evt.lng).toFixed(1)} mi {compassLabel(bearing(campus.lat, campus.lng, evt.lat, evt.lng)).toLowerCase()}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map buttons */}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <MapBtn label={'⊞ Fit all'} onClick={() => setFitTrigger(n => n + 1)} />
          <MapBtn label={fullscreen ? '✕ Exit' : '⛶ Full'} onClick={() => { setFullscreen(f => !f); setPanelOpen(true); }} />
        </div>
      </div>

      {/* Control Panel */}
      {fullscreen ? (
        <div style={{
          position: 'absolute', top: 60, left: 10,
          width: panelOpen ? 330 : 44, maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto', background: 'rgba(255,255,255,0.95)',
          borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          zIndex: 10000, transition: 'width 300ms ease',
        }}>
          <button onClick={() => setPanelOpen(p => !p)} style={{
            width: 44, height: 44, border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 16, color: '#121315', fontWeight: 700,
          }}>
            {panelOpen ? '◀' : '▶'}
          </button>
          {panelOpen && controlPanel}
        </div>
      ) : (
        <div style={{
          border: '1px solid #E5E7EB', borderTop: 'none',
          borderRadius: '0 0 12px 12px', background: '#FAFAFA',
        }}>
          {controlPanel}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

function MapBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(255,255,255,0.92)', border: '1px solid #D1D5DB',
      borderRadius: 8, padding: '6px 10px', fontSize: 13,
      cursor: 'pointer', color: '#121315', fontWeight: 600,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)', minHeight: 44,
    }}>
      {label}
    </button>
  );
}

function LayerToggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', borderRadius: 8,
      border: '1px solid #E5E7EB',
      background: on ? '#F7F5F1' : '#fff',
      cursor: 'pointer', fontSize: 12,
      color: on ? '#121315' : '#9CA3AF',
      fontWeight: on ? 600 : 400,
      minHeight: 44,
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: on ? '#16A34A' : '#D1D5DB',
        transition: 'background 200ms',
      }} />
      {label}
    </button>
  );
}
