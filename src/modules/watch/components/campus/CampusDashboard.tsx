/**
 * CampusDashboard — Slate Watch · D3 "The Nerve Center"
 *
 * Redesigned campus intelligence view:
 *   Top:    Campus header with name, status badge, KPI strip (violent crime only), sparkline, weather
 *   Below:  Full-width AI Intelligence Briefing (auto-updates on violent crime changes)
 *   Middle: Two-column grid — Large Map (60%) | Incident Timeline (40%)
 *   Below:  Risk Profile (horizontal bar metrics)
 *   Below:  Contagion Zones (if any)
 *   Footer: Ask Slate
 *
 * Key fixes over D2:
 *   1. AI briefing debounces 3s and watches VIOLENT crime counts (not total), eliminating stale narratives
 *   2. KPI strip and briefing share the same violent-crime filter — numbers always match
 *   3. Two-column layout gives the map room to breathe; risk profile is a horizontal strip below
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  Incident, ShotSpotterEvent, ContagionZone, CampusRisk,
  IceAlert, SchoolPeriod, ForecastDay, DailyWeather,
} from '../../engine/types';
import type { CitizenIncident } from '../../api/citizen';
import type { DispatchIncident } from '../../api/scannerIntel';
import type { ScannerSummary } from '../../api/scanner';
import type { SafeCorridor } from '../../engine/corridors';
import { CAMPUSES } from '../../data/campuses';
import { haversine, ageInHours } from '../../engine/geo';

// Existing campus sub-components — we reuse them inside the new layout
import CampusMap from './CampusMap';
import IntelQuery from '../shared/IntelQuery';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Campus {
  id: number; name: string; short: string; communityArea: string;
  lat: number; lng: number; address: string;
  arrivalTime?: string; dismissalTime?: string;
}

interface Props {
  campus: Campus;
  risk: CampusRisk;
  allRisks: CampusRisk[];
  incidents: Incident[];
  acuteIncidents: Incident[];
  shotSpotterEvents: ShotSpotterEvent[];
  citizenIncidents: CitizenIncident[];
  newsIncidents: Incident[];
  dispatchIncidents: DispatchIncident[];
  iceAlerts: IceAlert[];
  scannerData: ScannerSummary | null;
  corridors: SafeCorridor[];
  forecast: ForecastDay[];
  tempF: number;
  schoolPeriod: SchoolPeriod;
  onBeginProtocol: (code: string) => void;
  onAskPulse?: () => void;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const C = {
  cream:   '#FAF8F5',
  cream2:  '#F3F0EA',
  white:   '#FFFFFF',
  deep:    '#1A1A1A',
  rock:    '#2D2D2D',
  mid:     '#6B7280',
  light:   '#9CA3AF',
  chalk:   '#E5E1D8',
  brass:   '#B79145',
  watch:   '#C0392B',
  section: '#C0392B',
  ice:     '#7C3AED',
  green:   '#16A34A',
  red:     '#DC2626',
  amber:   '#D97706',
  blue:    '#3B82F6',
};

const serif = "Playfair Display, Georgia, 'Times New Roman', serif";
const sans  = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const mono  = "JetBrains Mono, 'SF Mono', Menlo, monospace";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
  @keyframes pulseRing{0%{transform:scale(1);opacity:.45}100%{transform:scale(2.1);opacity:0}}
`;

// ─── SHARED VIOLENT CRIME FILTER ────────────────────────────────────────────
// Single source of truth: used by KPI strip, briefing, and timeline highlighting
const SERIOUS_VIOLENT = /HOMICIDE|MURDER|SHOOTING|SHOT SPOTTER|CRIM SEXUAL ASSAULT|CRIMINAL SEXUAL|KIDNAPPING|AGGRAVATED ASSAULT.*HANDGUN|AGGRAVATED ASSAULT.*FIREARM/i;

function useViolentCrimeStats(campus: Campus, incidents: Incident[]) {
  return useMemo(() => {
    const now = Date.now();

    const violent7d = incidents.filter(inc => {
      const d = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      const age = (now - new Date(inc.date).getTime()) / (1000 * 3600 * 24);
      return d <= 1.0 && age <= 7 && SERIOUS_VIOLENT.test(inc.type);
    });

    const violent24h = incidents.filter(inc => {
      const d = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      const age = (now - new Date(inc.date).getTime()) / (1000 * 3600);
      return d <= 1.0 && age <= 24 && SERIOUS_VIOLENT.test(inc.type);
    });

    const typeCounts: Record<string, number> = {};
    for (const inc of violent7d) {
      typeCounts[inc.type] = (typeCounts[inc.type] ?? 0) + 1;
    }
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    return {
      violent7d: violent7d.length,
      violent24h: violent24h.length,
      violent7dList: violent7d,
      violent24hList: violent24h,
      topTypes: topTypes || 'none',
    };
  }, [campus.id, campus.lat, campus.lng, incidents]);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
}

function fmtAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 5)  return 'Overnight';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Tonight';
}

// ─── AI CAMPUS BRIEFING (REACTIVE) ──────────────────────────────────────────

function useCampusBriefing(
  campus: Campus,
  risk: CampusRisk,
  iceAlerts: IceAlert[],
  violent7d: number,
  violent24h: number,
  topTypes: string,
  tempF: number,
  dataReady: boolean,
) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef('');

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const zoneCount = risk.contagionZones?.length ?? 0;

      const ctx = {
        campus: campus.short,
        communityArea: campus.communityArea,
        riskLabel: risk.label,
        riskScore: risk.score,
        violent7d,
        violent24h,
        topViolentTypes7d: topTypes,
        contagionZones: zoneCount,
        inRetaliationWindow: risk.inRetaliationWindow,
        iceNearby: iceAlerts.length,
        tempF: Math.round(tempF),
        timeOfDay: timeOfDay(),
      };

      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: `You are Slate Watch writing a campus intelligence briefing for a school principal.

CRITICAL DATA CONSISTENCY RULE:
The dashboard KPI strip shows these exact numbers to the principal:
- "${violent7d} VIOLENT 7D" (violent crimes within 1 mile in the past 7 days)
- "${violent24h} VIOLENT 24H" (violent crimes within 1 mile in the past 24 hours)
- "${zoneCount} CONTAGION ZONE${zoneCount !== 1 ? 'S' : ''}" (active contagion zones)

Your briefing text appears directly below these numbers. You MUST reference these exact counts accurately.
- If violent24h > 0, you MUST acknowledge the violent incidents. NEVER say "no violent incidents" when the count is above zero.
- If violent7d > 0, you MUST acknowledge recent violent activity. NEVER say the area has been quiet when violent incidents exist.
- "Violent" means ONLY: homicides, murders, shootings, sexual assaults, kidnappings, and gun violence. NOT battery, robbery, or theft.
- Reference specific incident types from topViolentTypes7d when available.
- Focus your narrative EXCLUSIVELY on serious threats to student safety — gun violence, homicides, sexual predators, kidnapping.
- Data sources include CPD, news media, Citizen app, and police radio. All sources within 1 mile are included.

DO NOT echo back the raw KPI numbers as a list. Weave them naturally into your narrative.

Format rules:
- Address the principal directly: "Your campus..."
- 2-3 paragraphs max. Plain declarative sentences.
- First paragraph: current status — reference the actual violent incident numbers and types.
- Second paragraph: actionable guidance — what to do about it.
- If ICE activity: mention it and recommend contacting Network Legal.
- If cold weather (below 32°F): mention extended arrival/dismissal protocols.
- No markdown, no bullets, no headers.`,
          messages: [{ role: 'user', content: `Campus briefing context: ${JSON.stringify(ctx)}` }],
        }),
      });
      const data = await res.json();
      let raw = data?.content?.[0]?.text ?? '';

      // Strip any echoed KPI block the LLM might prepend
      raw = raw.replace(/^[\s\S]*?(Your campus)/i, '$1').trim();

      setText(raw);
    } catch { setText(''); }
    finally { setLoading(false); }
  }, [campus.id, campus.short, campus.communityArea, risk.label, risk.score,
      risk.contagionZones?.length, risk.inRetaliationWindow,
      iceAlerts.length, violent7d, violent24h, topTypes, tempF]);

  // Debounce: wait 3s after data changes before generating
  useEffect(() => {
    if (!dataReady) return;

    const key = `${campus.id}-${violent7d}-${violent24h}-${risk.label}-${iceAlerts.length}`;
    if (key === lastKeyRef.current && text) return;
    lastKeyRef.current = key;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { generate(); }, 3000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dataReady, campus.id, violent7d, violent24h, risk.label, iceAlerts.length, generate, text]);

  return { text, loading, refresh: generate };
}

// ─── SPARKLINE (7-day trend) ─────────────────────────────────────────────────

const Sparkline = ({ data, color = C.watch, width = 100, height = 32 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {(() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        return <circle cx={lastX} cy={lastY} r={2.5} fill={color} />;
      })()}
    </svg>
  );
};

// ─── STATUS BADGE ────────────────────────────────────────────────────────────

const StatusBadge = ({ label }: { label: string }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    LOW:      { bg: '#DCFCE7', text: '#14532D' },
    ELEVATED: { bg: '#FEF3C7', text: '#92400E' },
    HIGH:     { bg: '#FEE2E2', text: '#991B1B' },
    CRITICAL: { bg: '#DC2626', text: '#FFFFFF' },
  };
  const c = colors[label] ?? colors.LOW;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '.12em',
      textTransform: 'uppercase' as const,
      padding: '4px 12px', borderRadius: 20,
      background: c.bg, color: c.text, fontFamily: sans,
    }}>
      {label}
    </span>
  );
};

// ─── SECTION: CAMPUS HEADER ──────────────────────────────────────────────────

const CampusHeader = ({ campus, risk, incidents, tempF, violent7d, violent24h }: {
  campus: Campus; risk: CampusRisk; incidents: Incident[]; tempF: number;
  violent7d: number; violent24h: number;
}) => {
  const now = Date.now();
  const zoneCount = risk.contagionZones?.length ?? 0;

  // Build 7-day sparkline data (violent crime only)
  const sparkData = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * 86400000;
    const dayEnd = dayStart + 86400000;
    return incidents.filter(inc => {
      const d = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      const t = new Date(inc.date).getTime();
      return d <= 1.0 && t >= dayStart && t < dayEnd && SERIOUS_VIOLENT.test(inc.type);
    }).length;
  });

  const avg30d = Math.round(violent7d / 7 * 30);
  const trendPct = avg30d > 0 ? Math.round(((violent7d / 7 * 30) / avg30d - 1) * 100) : 0;

  return (
    <div style={{
      background: C.white, borderRadius: 12, border: `1px solid ${C.chalk}`,
      borderTop: `4px solid ${risk.label === 'LOW' ? C.green : risk.label === 'ELEVATED' ? C.amber : C.watch}`,
      padding: '24px 28px', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{
            fontFamily: serif, fontSize: 32, fontWeight: 900,
            color: C.deep, letterSpacing: '-.02em', margin: 0,
          }}>
            {campus.short.toUpperCase()}
          </h1>
          <StatusBadge label={risk.label} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <Sparkline data={sparkData} color={risk.label === 'LOW' ? C.green : C.watch} />
            <div style={{ fontSize: 10, color: C.light, fontFamily: sans, marginTop: 2 }}>
              {trendPct > 0 ? `↑ ${trendPct}%` : trendPct < 0 ? `↓ ${Math.abs(trendPct)}%` : '→ flat'} vs 30d avg
            </div>
          </div>
          <div style={{
            fontSize: 12, color: C.mid, fontFamily: sans,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ☁ {Math.round(tempF)}°F
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.light, fontFamily: sans, marginTop: 6 }}>
        {campus.address} · {campus.communityArea}
      </div>

      {/* KPI Strip — uses the shared violent crime stats passed as props */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16, marginTop: 20,
      }}>
        {[
          { value: violent7d, label: 'VIOLENT 7D', sublabel: 'within 1 mi', color: violent7d > 0 ? C.watch : C.deep },
          { value: violent24h, label: 'VIOLENT 24H', sublabel: 'within 1 mi', color: violent24h > 0 ? C.watch : C.deep },
          { value: zoneCount, label: `CONTAGION ZONE${zoneCount !== 1 ? 'S' : ''}`, sublabel: '', color: zoneCount > 0 ? C.amber : C.deep },
        ].map(kpi => (
          <div key={kpi.label} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: serif, fontSize: 36, fontWeight: 900,
              color: kpi.color, lineHeight: 1,
            }}>
              {kpi.value}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
              color: C.light, fontFamily: sans, marginTop: 6,
            }}>
              {kpi.label}
            </div>
            {kpi.sublabel && (
              <div style={{
                fontSize: 8, color: C.light, fontFamily: sans, marginTop: 2,
                fontWeight: 400, letterSpacing: '.05em',
              }}>
                {kpi.sublabel}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SECTION: AI INTELLIGENCE BRIEFING ───────────────────────────────────────

const AIBriefing = ({ briefing, campus, onNotifyDeans, onContactLegal }: {
  briefing: { text: string; loading: boolean; refresh: () => void };
  campus: Campus;
  onNotifyDeans?: () => void;
  onContactLegal?: () => void;
}) => {
  const tod = timeOfDay().toUpperCase();

  return (
    <div style={{
      background: '#FFFDF8', borderRadius: 12,
      border: `1px solid ${C.chalk}`, padding: '28px 32px',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>✦</span>
        <span style={{
          fontSize: 14, fontWeight: 700, color: C.deep,
          fontFamily: sans, letterSpacing: '-.01em',
        }}>
          AI Intelligence Briefing
        </span>
      </div>

      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.14em',
        textTransform: 'uppercase', color: C.section,
        fontFamily: sans, marginBottom: 16,
      }}>
        {tod} ASSESSMENT
      </div>

      {briefing.loading && !briefing.text ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[95, 80, 60].map((w, i) => (
            <div key={i} style={{
              height: 18, borderRadius: 4, width: `${w}%`,
              background: `linear-gradient(90deg, ${C.chalk} 0%, ${C.cream2} 50%, ${C.chalk} 100%)`,
              backgroundSize: '400px 100%', animation: 'shimmer 1.4s infinite linear',
            }} />
          ))}
        </div>
      ) : (
        <div style={{
          fontFamily: serif, fontSize: 16, lineHeight: 1.85,
          color: C.deep, whiteSpace: 'pre-wrap',
        }}>
          {briefing.text || 'Generating campus intelligence briefing…'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          onClick={onNotifyDeans}
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: `1px solid ${C.watch}`, background: 'transparent',
            color: C.watch, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: sans,
          }}
        >
          Notify Deans
        </button>
        <button
          onClick={onContactLegal}
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: `1px solid ${C.watch}`, background: 'transparent',
            color: C.watch, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: sans,
          }}
        >
          Contact Legal
        </button>
        <button
          onClick={briefing.refresh}
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: `1px solid ${C.chalk}`, background: 'transparent',
            color: C.mid, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: sans,
          }}
        >
          ↻ Refresh Briefing
        </button>
      </div>
    </div>
  );
};

// ─── SECTION: INCIDENT TIMELINE ──────────────────────────────────────────────

const IncidentTimeline = ({ campus, incidents }: {
  campus: Campus; incidents: Incident[];
}) => {
  const now = Date.now();
  const nearby = incidents
    .filter(inc => {
      const d = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      const age = (now - new Date(inc.date).getTime()) / (1000 * 3600);
      return d <= 1.0 && age <= 24;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const severityColor = (type: string) => {
    if (/HOMICIDE|MURDER/i.test(type)) return C.watch;
    if (/SHOOTING|SHOT/i.test(type)) return C.red;
    if (/ASSAULT|BATTERY/i.test(type)) return C.amber;
    if (/ROBBERY/i.test(type)) return '#F59E0B';
    return C.light;
  };

  const isViolent = (type: string) => SERIOUS_VIOLENT.test(type);

  const sourceLabel = (inc: Incident) => {
    if ((inc as any).source === 'citizen') return 'Citizen';
    if ((inc as any).source === 'news') return 'News';
    if ((inc as any).source === 'scanner') return 'Scanner';
    return 'CPD';
  };

  return (
    <div style={{
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.chalk}`, padding: '20px 22px',
      height: '100%', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
          textTransform: 'uppercase', color: C.deep, fontFamily: sans,
        }}>
          Incident Timeline
        </div>
        <div style={{ fontSize: 10, color: C.light, fontFamily: sans }}>
          24h · 1mi radius
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {nearby.length === 0 ? (
          <div style={{
            padding: '24px 0', textAlign: 'center',
            fontSize: 13, color: C.light, fontFamily: sans,
          }}>
            No incidents near campus in the last 24 hours.
          </div>
        ) : (
          nearby.map((inc, i) => {
            const t = new Date(inc.date);
            const timeStr = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
            const desc = inc.description || inc.block || inc.type.replace(/_/g, ' ').toLowerCase();
            const violent = isViolent(inc.type);

            return (
              <div key={inc.id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 0',
                borderBottom: i < nearby.length - 1 ? `1px solid #F5F3EF` : 'none',
                background: violent ? 'rgba(192,57,43,0.04)' : 'transparent',
                marginLeft: -8, marginRight: -8, paddingLeft: 8, paddingRight: 8,
                borderRadius: violent ? 6 : 0,
              }}>
                <div style={{ position: 'relative', flexShrink: 0, marginTop: 5 }}>
                  {violent && (
                    <div style={{
                      position: 'absolute', top: -4, left: -4,
                      width: 16, height: 16, borderRadius: '50%',
                      background: `${severityColor(inc.type)}20`,
                      animation: 'pulseRing 2s infinite',
                    }} />
                  )}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: severityColor(inc.type),
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: C.deep, fontFamily: sans,
                    lineHeight: 1.4, fontWeight: violent ? 600 : 500,
                  }}>
                    <span style={{ fontFamily: mono, fontSize: 11, color: C.light, marginRight: 6 }}>
                      {timeStr}
                    </span>
                    — {desc.charAt(0).toUpperCase() + desc.slice(1)}
                    <span style={{ color: C.light, fontSize: 11 }}>
                      {' '}({dist < 0.1 ? '<0.1' : dist.toFixed(1)}mi)
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: C.light, fontFamily: sans, marginTop: 2 }}>
                    · {sourceLabel(inc)}
                    {violent && <span style={{ color: C.watch, fontWeight: 700, marginLeft: 6 }}>VIOLENT</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── SECTION: RISK PROFILE (HORIZONTAL) ─────────────────────────────────────

const RiskProfile = ({ risk, campus, incidents, tempF, allRisks }: {
  risk: CampusRisk; campus: Campus; incidents: Incident[];
  tempF: number; allRisks: CampusRisk[];
}) => {
  const violenceIndex = (risk.score / 100 * 10).toFixed(1);
  const zoneCount = risk.contagionZones?.length ?? 0;
  const nearestZoneDist = zoneCount > 0
    ? Math.min(...(risk.contagionZones ?? []).map((z: any) => z.distanceFromCampus ?? 99)).toFixed(1)
    : null;
  const trendLabel = risk.inRetaliationWindow ? '↑ Rising' : risk.label === 'LOW' ? '→ Stable' : '↗ Elevated';
  const weatherDesc = tempF <= 20 ? 'Cold snap' : tempF <= 32 ? 'Freezing' : tempF >= 90 ? 'Heat advisory' : 'Normal';
  const networkAvg = allRisks.reduce((s, r) => s + r.score, 0) / allRisks.length;

  const metrics = [
    {
      label: 'Violence Index',
      value: `${violenceIndex} / 10`,
      pct: Math.min(risk.score, 100),
      color: risk.score > 65 ? C.watch : risk.score > 35 ? C.amber : C.green,
    },
    {
      label: 'Contagion Risk',
      value: zoneCount > 0 ? `${zoneCount} zone${zoneCount > 1 ? 's' : ''} · ${nearestZoneDist}mi` : 'None active',
      pct: zoneCount > 0 ? Math.min(zoneCount * 30, 100) : 0,
      color: zoneCount > 0 ? C.amber : C.green,
    },
    {
      label: 'Trend',
      value: trendLabel,
      pct: risk.inRetaliationWindow ? 80 : risk.label === 'LOW' ? 20 : 50,
      color: risk.inRetaliationWindow ? C.watch : risk.label === 'LOW' ? C.green : C.amber,
    },
    {
      label: 'Weather',
      value: `${Math.round(tempF)}°F ${weatherDesc.toLowerCase()}`,
      pct: tempF <= 20 ? 60 : tempF <= 32 ? 40 : tempF >= 90 ? 50 : 15,
      color: tempF <= 20 ? C.blue : tempF <= 32 ? C.blue : tempF >= 90 ? C.watch : C.green,
    },
    {
      label: 'vs Network',
      value: `${risk.score > networkAvg ? '+' : ''}${(risk.score - networkAvg).toFixed(0)} pts`,
      pct: Math.min(Math.max((risk.score / 100) * 100, 5), 95),
      color: risk.score > networkAvg ? C.watch : C.green,
    },
  ];

  return (
    <div style={{
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.chalk}`, padding: '20px 24px',
      marginBottom: 24,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
        textTransform: 'uppercase', color: C.deep, fontFamily: sans,
        marginBottom: 16,
      }}>
        Risk Profile
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 20,
      }}>
        {metrics.map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 11, color: C.mid, fontFamily: sans, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.deep, fontFamily: sans, marginBottom: 6 }}>{m.value}</div>
            <div style={{ height: 4, borderRadius: 2, background: '#F0EDE6', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${m.pct}%`,
                background: m.color, borderRadius: 2,
                transition: 'width .4s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SECTION: CAMPUS MAP WRAPPER ─────────────────────────────────────────────

const CampusMapSection = ({ campus, risk, incidents, shotSpotterEvents, corridors, scannerData }: {
  campus: Campus; risk: CampusRisk; incidents: Incident[];
  shotSpotterEvents: ShotSpotterEvent[]; corridors: SafeCorridor[];
  scannerData: ScannerSummary | null;
}) => {
  return (
    <div style={{
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.chalk}`, padding: '20px 22px',
      height: '100%', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
        textTransform: 'uppercase', color: C.deep, fontFamily: sans,
        marginBottom: 14,
      }}>
        Campus Map
      </div>

      <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', minHeight: 380 }}>
        <CampusMap
          campus={campus}
          risk={risk}
          incidents={incidents}
          shotSpotterEvents={shotSpotterEvents}
          contagionZones={risk.contagionZones}
          corridors={corridors}
          scannerData={scannerData}
        />
      </div>

      <div style={{
        display: 'flex', gap: 14, marginTop: 12, fontSize: 10,
        color: C.light, fontFamily: sans, flexWrap: 'wrap',
      }}>
        {(risk.contagionZones?.length ?? 0) > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(220,38,38,0.2)', border: `1px solid ${C.watch}`, display: 'inline-block' }} />
            Contagion Zone
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.watch, display: 'inline-block' }} />
          Violent
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.amber, display: 'inline-block' }} />
          Other
        </span>
      </div>
    </div>
  );
};

// ─── ASK SLATE ───────────────────────────────────────────────────────────────

const AskSlate = ({ campus, risk }: { campus: Campus; risk: CampusRisk }) => {
  const [query, setQuery] = useState('');
  const suggestions = [
    'What should I tell parents today?',
    'Show me the contagion zone details',
    `What happened near ${campus.short} overnight?`,
  ];

  return (
    <div style={{
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.chalk}`, padding: '16px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.12em',
          textTransform: 'uppercase', color: C.mid, fontFamily: sans,
          flexShrink: 0,
        }}>
          Ask Slate
        </span>
        <input
          type="text"
          placeholder="Ask anything about your campus…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 13, color: C.deep, fontFamily: sans,
            background: 'transparent', padding: '6px 0',
          }}
        />
        <button style={{
          background: C.deep, color: C.white, border: 'none',
          borderRadius: 6, padding: '6px 12px', fontSize: 11,
          cursor: 'pointer', fontFamily: sans, fontWeight: 600,
        }}>
          Ask
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => setQuery(s)}
            style={{
              fontSize: 11, color: C.mid, background: C.cream,
              border: `1px solid ${C.chalk}`, borderRadius: 20,
              padding: '4px 12px', cursor: 'pointer', fontFamily: sans,
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CampusDashboard({
  campus, risk, allRisks, incidents, acuteIncidents,
  shotSpotterEvents, citizenIncidents, newsIncidents, dispatchIncidents,
  iceAlerts, scannerData, corridors, forecast, tempF, schoolPeriod,
  onBeginProtocol, onAskPulse,
}: Props) {
  // ── Merge ALL incident sources ──
  const allIncidents = useMemo(() => {
    const seen = new Set<string>();
    const merged: Incident[] = [];
    const addAll = (arr: Incident[]) => {
      for (const inc of arr) {
        const key = inc.id || `${inc.lat}-${inc.lng}-${inc.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(inc);
        }
      }
    };
    addAll(incidents);
    addAll(acuteIncidents);
    addAll(newsIncidents);
    const citizenAsIncidents = (citizenIncidents || []).filter((c: any) => c.lat && c.lng && c.date).map((c: any) => ({
      id: c.id || `citizen-${c.lat}-${c.lng}`,
      lat: c.lat, lng: c.lng, date: c.date,
      type: c.type || c.category || 'CITIZEN REPORT',
      description: c.description || c.title || '',
      block: c.block || c.address || '',
      source: 'citizen',
    } as Incident));
    addAll(citizenAsIncidents);
    const dispatchAsIncidents = (dispatchIncidents || []).filter((d: any) => d.lat && d.lng && d.date).map((d: any) => ({
      id: d.id || `dispatch-${d.lat}-${d.lng}`,
      lat: d.lat, lng: d.lng, date: d.date,
      type: d.type || d.category || 'DISPATCH',
      description: d.description || d.title || '',
      block: d.block || d.address || '',
      source: 'scanner',
    } as Incident));
    addAll(dispatchAsIncidents);
    return merged;
  }, [incidents, acuteIncidents, newsIncidents, citizenIncidents, dispatchIncidents]);

  // ── Single source of truth for violent crime stats ──
  const stats = useViolentCrimeStats(campus, allIncidents);

  // ── Data readiness ──
  const dataReady = allIncidents.length > 0;

  // ── AI Briefing: watches violent crime counts, debounces 3s ──
  const briefing = useCampusBriefing(
    campus, risk, iceAlerts,
    stats.violent7d, stats.violent24h, stats.topTypes,
    tempF, dataReady,
  );

  return (
    <div style={{ background: C.cream, fontFamily: sans, color: C.deep }}>
      <style>{STYLES}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 0 48px' }}>

        {/* ── Campus Header with KPIs (uses shared stats) ── */}
        <CampusHeader
          campus={campus} risk={risk} incidents={allIncidents} tempF={tempF}
          violent7d={stats.violent7d} violent24h={stats.violent24h}
        />

        {/* ── AI Intelligence Briefing ── */}
        <AIBriefing
          briefing={briefing}
          campus={campus}
          onNotifyDeans={() => onBeginProtocol('notify-deans')}
          onContactLegal={() => onBeginProtocol('contact-legal')}
        />

        {/* ── ICE Alert (if active) ── */}
        {iceAlerts.length > 0 && (
          <div style={{
            background: '#EDE9FE', borderRadius: 12,
            border: '1px solid #C4B5FD', padding: '16px 22px',
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <div>
              <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: '#4C1D95' }}>
                {iceAlerts.length} ICE enforcement report{iceAlerts.length !== 1 ? 's' : ''} near campus
              </div>
              <div style={{ fontSize: 12, color: '#6D28D9', fontFamily: sans, marginTop: 2 }}>
                Lock exterior doors · Contact Network Legal · Review shelter-in-place protocol
              </div>
            </div>
          </div>
        )}

        {/* ── Two-Column Grid: Map (60%) | Timeline (40%) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 16, marginBottom: 24,
          minHeight: 440,
        }}>
          <CampusMapSection
            campus={campus} risk={risk} incidents={incidents}
            shotSpotterEvents={shotSpotterEvents} corridors={corridors}
            scannerData={scannerData}
          />
          <IncidentTimeline campus={campus} incidents={allIncidents} />
        </div>

        {/* ── Risk Profile (horizontal strip) ── */}
        <RiskProfile
          risk={risk} campus={campus} incidents={incidents}
          tempF={tempF} allRisks={allRisks}
        />

        {/* ── Contagion Zones (if any) ── */}
        {(risk.contagionZones?.length ?? 0) > 0 && (
          <div style={{
            background: C.white, borderRadius: 12,
            border: `1px solid ${C.chalk}`, padding: '20px 22px',
            marginBottom: 24,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
              textTransform: 'uppercase', color: C.deep, fontFamily: sans,
              marginBottom: 14,
            }}>
              Active Contagion Zones
            </div>
            {(risk.contagionZones ?? []).map((zone: any, i: number) => {
              const isRet = zone.retWin;
              const phaseColor = isRet ? C.watch : zone.phase === 'ACUTE' ? C.red : C.amber;
              const pct = Math.round((zone.ageH / (125 * 24)) * 100);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '12px 0',
                  borderBottom: i < (risk.contagionZones?.length ?? 0) - 1 ? `1px solid #F5F3EF` : 'none',
                }}>
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: '.1em',
                    textTransform: 'uppercase', color: phaseColor, fontFamily: sans,
                    width: 80, flexShrink: 0,
                  }}>
                    {isRet ? 'RET. WINDOW' : zone.phase}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.deep, fontFamily: sans }}>
                      {zone.block || 'Nearby corridor'} — Homicide trigger
                    </div>
                    <div style={{ fontSize: 11, color: C.mid, fontFamily: sans, marginTop: 2 }}>
                      {zone.distanceFromCampus != null ? `${zone.distanceFromCampus.toFixed(2)} mi` : '?'} from campus · {Math.round(zone.ageH)}h elapsed · {zone.daysLeft}d remaining
                    </div>
                  </div>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: '#F0EDE6', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: phaseColor, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 10, color: C.light, fontFamily: sans, marginTop: 10 }}>
              Contagion model: Papachristos et al., Yale/UChicago · Updates every 90 seconds
            </div>
          </div>
        )}

        {/* ── Ask Slate ── */}
        <AskSlate campus={campus} risk={risk} />

        {/* ── Footer attribution ── */}
        <div style={{
          fontSize: 10, color: C.light, lineHeight: 1.6,
          padding: '16px 0', marginTop: 24,
          borderTop: `1px solid ${C.chalk}`, textAlign: 'center', fontFamily: sans,
        }}>
          Data: CPD, Citizen App, CPD Radio, RSS news (9 sources), Open-Meteo weather.
          Contagion model: Papachristos et al., Yale/UChicago.
        </div>
      </div>
    </div>
  );
}
