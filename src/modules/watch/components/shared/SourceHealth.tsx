/**
 * SourceHealth — Slate Watch · Data Feed Monitor
 *
 * Collapsible panel showing real-time status of every data source.
 * Tracks: source name, status (LIVE/STALE/ERROR), last pull, item count, latency.
 *
 * INTEGRATION:
 *   1. Place this file at src/sentinel-components/shared/SourceHealth.tsx
 *   2. Import and render in SentinelApp.tsx (see bottom of file for usage)
 *   3. Pass the sourceHealth state object as a prop
 *
 * The companion hook useSourceHealth() is exported from this file.
 * Wrap your existing fetch calls with sourceHealth.track() to auto-capture timing.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── DESIGN TOKENS (matches Slate Watch design system) ──────────────────────

const C = {
  cream:  '#FAF8F5',
  white:  '#FFFFFF',
  deep:   '#1A1A1A',
  mid:    '#6B7280',
  light:  '#9CA3AF',
  chalk:  '#E8E4DE',
  green:  '#16A34A',
  amber:  '#D97706',
  red:    '#DC2626',
  watch:  '#C0392B',
  blue:   '#2563EB',
};

const sans = "'Inter', system-ui, sans-serif";
const mono = "'JetBrains Mono', 'SF Mono', monospace";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface SourceStatus {
  name: string;
  description: string;
  status: 'LIVE' | 'STALE' | 'ERROR' | 'PENDING';
  lastPull: Date | null;
  itemCount: number;
  latencyMs: number | null;
  errorMessage?: string;
  refreshIntervalMs: number;  // Expected refresh interval
  category: 'crime' | 'news' | 'weather' | 'community' | 'intelligence';
}

export interface SourceHealthState {
  sources: Record<string, SourceStatus>;
  track: <T>(sourceKey: string, fetchFn: () => Promise<T>, itemCountFn?: (result: T) => number) => Promise<T>;
  getAll: () => SourceStatus[];
  getSummary: () => { live: number; stale: number; error: number; pending: number; total: number };
}

// ─── HOOK: useSourceHealth ──────────────────────────────────────────────────

export function useSourceHealth(): SourceHealthState {
  const [sources, setSources] = useState<Record<string, SourceStatus>>({
    // Crime data
    cpd_acute: {
      name: 'CPD Data Portal',
      description: 'Chicago Police 48h incident reports',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 90_000, category: 'crime',
    },
    cpd_full: {
      name: 'CPD Historical',
      description: '30-day incident archive for trend analysis',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 600_000, category: 'crime',
    },
    cpd_realtime: {
      name: 'CPD Realtime',
      description: 'Live crime reports as they are filed',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 90_000, category: 'crime',
    },
    cpd_major: {
      name: 'CPD Major Incidents',
      description: 'Homicides, shootings, major crime alerts',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 600_000, category: 'crime',
    },
    shot_spotter: {
      name: 'ShotSpotter',
      description: 'Acoustic gunfire detection sensors',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 90_000, category: 'crime',
    },
    medical_examiner: {
      name: 'Medical Examiner',
      description: 'Cook County homicide confirmations',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 600_000, category: 'crime',
    },

    // News & media
    news_rss: {
      name: 'News RSS Feeds',
      description: 'ABC7, NBC5, WGN, Sun-Times, Tribune, Block Club + 3 more',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 300_000, category: 'news',
    },
    news_geocoded: {
      name: 'News Geocoding',
      description: 'AI-powered location extraction from news stories',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 300_000, category: 'news',
    },

    // Community & intelligence
    citizen: {
      name: 'Citizen App',
      description: 'Real-time community safety reports',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 300_000, category: 'community',
    },
    scanner: {
      name: 'Police Scanner',
      description: 'CPD radio dispatch monitoring & transcription',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 300_000, category: 'community',
    },
    reddit: {
      name: 'Reddit Intel',
      description: 'r/ChicagoScanner, r/CrimeInChicago',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 300_000, category: 'intelligence',
    },
    ice: {
      name: 'ICE Activity',
      description: 'Immigration enforcement signals from news',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 300_000, category: 'intelligence',
    },

    // Weather
    weather: {
      name: 'Weather (Current)',
      description: 'Temperature, wind, precipitation',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 1_800_000, category: 'weather',
    },
    weather_forecast: {
      name: 'Weather (7-Day)',
      description: 'NWS forecast for dismissal planning',
      status: 'PENDING', lastPull: null, itemCount: 0, latencyMs: null,
      refreshIntervalMs: 1_800_000, category: 'weather',
    },
  });

  // Auto-mark stale sources
  useEffect(() => {
    const interval = setInterval(() => {
      setSources(prev => {
        const updated = { ...prev };
        let changed = false;
        for (const [key, src] of Object.entries(updated)) {
          if (src.status === 'LIVE' && src.lastPull) {
            const elapsed = Date.now() - src.lastPull.getTime();
            // Mark stale if 2x the expected interval has passed
            if (elapsed > src.refreshIntervalMs * 2) {
              updated[key] = { ...src, status: 'STALE' };
              changed = true;
            }
          }
        }
        return changed ? updated : prev;
      });
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const track = useCallback(async <T,>(
    sourceKey: string,
    fetchFn: () => Promise<T>,
    itemCountFn?: (result: T) => number,
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fetchFn();
      const latencyMs = Math.round(performance.now() - start);
      const itemCount = itemCountFn ? itemCountFn(result) : (Array.isArray(result) ? result.length : 1);
      setSources(prev => ({
        ...prev,
        [sourceKey]: {
          ...prev[sourceKey],
          status: 'LIVE',
          lastPull: new Date(),
          itemCount,
          latencyMs,
          errorMessage: undefined,
        },
      }));
      return result;
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      setSources(prev => ({
        ...prev,
        [sourceKey]: {
          ...prev[sourceKey],
          status: 'ERROR',
          lastPull: new Date(),
          latencyMs,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      }));
      throw err;
    }
  }, []);

  const getAll = useCallback(() => Object.values(sources), [sources]);

  const getSummary = useCallback(() => {
    const all = Object.values(sources);
    return {
      live: all.filter(s => s.status === 'LIVE').length,
      stale: all.filter(s => s.status === 'STALE').length,
      error: all.filter(s => s.status === 'ERROR').length,
      pending: all.filter(s => s.status === 'PENDING').length,
      total: all.length,
    };
  }, [sources]);

  return { sources, track, getAll, getSummary };
}

// ─── COMPONENT: SourceHealth ────────────────────────────────────────────────

interface SourceHealthProps {
  sources: Record<string, SourceStatus>;
  getSummary: () => { live: number; stale: number; error: number; pending: number; total: number };
}

export default function SourceHealth({ sources, getSummary }: SourceHealthProps) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every 5s to update "ago" text
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  const summary = getSummary();
  const allSources = Object.values(sources);

  // Group by category
  const categories: { key: string; label: string; icon: string }[] = [
    { key: 'crime', label: 'Crime Data', icon: '🔴' },
    { key: 'news', label: 'News & Media', icon: '📰' },
    { key: 'community', label: 'Community Intel', icon: '👥' },
    { key: 'intelligence', label: 'Intelligence', icon: '🔍' },
    { key: 'weather', label: 'Weather', icon: '🌤' },
  ];

  const formatAgo = (date: Date | null) => {
    if (!date) return '—';
    const sec = Math.floor((now - date.getTime()) / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      LIVE: C.green,
      STALE: C.amber,
      ERROR: C.red,
      PENDING: C.light,
    };
    return colors[status] ?? C.light;
  };

  const statusLabel = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      LIVE:    { bg: '#DCFCE7', text: '#14532D' },
      STALE:   { bg: '#FEF3C7', text: '#92400E' },
      ERROR:   { bg: '#FEE2E2', text: '#991B1B' },
      PENDING: { bg: '#F3F4F6', text: '#6B7280' },
    };
    const c = colors[status] ?? colors.PENDING;
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
        padding: '2px 8px', borderRadius: 10,
        background: c.bg, color: c.text, fontFamily: sans,
      }}>
        {status}
      </span>
    );
  };

  // Collapsed summary bar
  const summaryBar = (
    <button
      onClick={() => setExpanded(!expanded)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: C.white, border: `1px solid ${C.chalk}`,
        borderRadius: expanded ? '12px 12px 0 0' : 12, cursor: 'pointer',
        fontFamily: sans, fontSize: 12, color: C.deep,
        transition: 'border-radius 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: C.mid }}>
          DATA SOURCES
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {summary.live > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: C.mid, fontFamily: mono }}>{summary.live}</span>
            </span>
          )}
          {summary.stale > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: C.mid, fontFamily: mono }}>{summary.stale}</span>
            </span>
          )}
          {summary.error > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: C.mid, fontFamily: mono }}>{summary.error}</span>
            </span>
          )}
          {summary.pending > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.light, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: C.mid, fontFamily: mono }}>{summary.pending}</span>
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: C.light }}>
          {summary.live + summary.stale} of {summary.total} active
        </span>
      </div>
      <span style={{ fontSize: 16, color: C.light, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
        ▾
      </span>
    </button>
  );

  // Expanded detail panel
  const detailPanel = expanded && (
    <div style={{
      background: C.white, border: `1px solid ${C.chalk}`, borderTop: 'none',
      borderRadius: '0 0 12px 12px', padding: '4px 0 12px',
    }}>
      {categories.map(cat => {
        const catSources = allSources.filter(s => s.category === cat.key);
        if (catSources.length === 0) return null;
        return (
          <div key={cat.key} style={{ padding: '0 20px' }}>
            {/* Category header */}
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase' as const, color: C.light,
              padding: '12px 0 6px', borderBottom: `1px solid ${C.chalk}`,
              fontFamily: sans,
            }}>
              {cat.label}
            </div>

            {/* Source rows */}
            {catSources.map(src => (
              <div
                key={src.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '10px 1fr 60px 70px 60px 60px',
                  alignItems: 'center', gap: 8,
                  padding: '8px 0',
                  borderBottom: `1px solid #F5F3EF`,
                }}
              >
                {/* Status dot */}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusDot(src.status), display: 'inline-block',
                }} />

                {/* Name + description */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.deep, fontFamily: sans }}>
                    {src.name}
                  </div>
                  <div style={{ fontSize: 10, color: C.light, fontFamily: sans, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {src.description}
                  </div>
                </div>

                {/* Status badge */}
                <div>{statusLabel(src.status)}</div>

                {/* Last pull */}
                <div style={{ fontSize: 11, color: C.mid, fontFamily: mono, textAlign: 'right' as const }}>
                  {formatAgo(src.lastPull)}
                </div>

                {/* Item count */}
                <div style={{ fontSize: 11, color: C.deep, fontFamily: mono, textAlign: 'right' as const, fontWeight: 600 }}>
                  {src.itemCount > 0 ? src.itemCount.toLocaleString() : '—'}
                </div>

                {/* Latency */}
                <div style={{ fontSize: 10, color: C.light, fontFamily: mono, textAlign: 'right' as const }}>
                  {src.latencyMs !== null ? `${src.latencyMs}ms` : '—'}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Column headers (sticky feel) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '10px 1fr 60px 70px 60px 60px',
        gap: 8, padding: '8px 20px 0',
        fontSize: 8, fontWeight: 700, letterSpacing: '.1em',
        textTransform: 'uppercase' as const, color: C.light, fontFamily: sans,
      }}>
        <span />
        <span />
        <span>STATUS</span>
        <span style={{ textAlign: 'right' as const }}>LAST PULL</span>
        <span style={{ textAlign: 'right' as const }}>ITEMS</span>
        <span style={{ textAlign: 'right' as const }}>LATENCY</span>
      </div>

      {/* Error details */}
      {allSources.filter(s => s.status === 'ERROR' && s.errorMessage).length > 0 && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
            textTransform: 'uppercase' as const, color: C.red,
            marginBottom: 6, fontFamily: sans,
          }}>
            ERRORS
          </div>
          {allSources.filter(s => s.status === 'ERROR' && s.errorMessage).map(src => (
            <div key={src.name} style={{
              fontSize: 11, color: C.mid, fontFamily: mono,
              padding: '4px 0', borderLeft: `2px solid ${C.red}`, paddingLeft: 8,
              marginBottom: 4,
            }}>
              <span style={{ fontWeight: 600, color: C.deep }}>{src.name}:</span>{' '}
              {src.errorMessage}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ marginBottom: 16 }}>
      {summaryBar}
      {detailPanel}
    </div>
  );
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTEGRATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STEP 1: Add to SentinelApp.tsx imports:
 *
 *   import SourceHealth, { useSourceHealth } from './sentinel-components/shared/SourceHealth';
 *
 * STEP 2: Initialize the hook inside App():
 *
 *   const sourceHealth = useSourceHealth();
 *
 * STEP 3: Wrap your existing fetch calls with sourceHealth.track():
 *
 *   // BEFORE:
 *   const acute = await fetchIncidents(48, 500);
 *
 *   // AFTER:
 *   const acute = await sourceHealth.track('cpd_acute', () => fetchIncidents(48, 500));
 *
 *   Full mapping:
 *
 *   // refresh90s:
 *   const acute = await sourceHealth.track('cpd_acute', () => fetchIncidents(48, 500));
 *   const shots = await sourceHealth.track('shot_spotter', () => fetchShotSpotter(2, 100));
 *   const realtime = await sourceHealth.track('cpd_realtime', () => fetchRealtimeIncidents());
 *
 *   // refresh10min:
 *   const full = await sourceHealth.track('cpd_full', () => fetchIncidents(720, 5000));
 *
 *   // refresh30min:
 *   const wx = await sourceHealth.track('weather', () => fetchWeather());
 *   const wxForecast = await sourceHealth.track('weather_forecast', () => fetchWeatherForecast());
 *
 *   // refresh5min:
 *   const news = await sourceHealth.track('news_rss', () => fetchAllFeeds());
 *   const ice = await sourceHealth.track('ice', () => fetchIceSignals(news));
 *   const parsed = await sourceHealth.track('news_geocoded', () => geocodeNewsIncidents(news), r => r.length);
 *   const redditData = await sourceHealth.track('reddit', () => fetchRedditIntel(24));
 *
 *   // refreshCitizen:
 *   const citizen = await sourceHealth.track('citizen', () => fetchCitizenIncidents(campus.lat, campus.lng, 2.0));
 *
 *   // refreshScanner:
 *   const data = await sourceHealth.track('scanner', () => fetchScannerActivity(120), d => d.totalCalls);
 *
 * STEP 4: Render the component (e.g., at the bottom of the Network Dashboard or in the footer):
 *
 *   <SourceHealth sources={sourceHealth.sources} getSummary={sourceHealth.getSummary} />
 *
 * That's it. Every fetch call now auto-tracks status, timing, and item counts.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
