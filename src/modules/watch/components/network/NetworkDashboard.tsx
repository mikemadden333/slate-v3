/**
 * NetworkDashboard — Slate Watch · V2 "The Morning Brief"
 *
 * A flowing intelligence document, not a widget grid.
 *
 * Layout:
 *   1. Title + Dateline
 *   2. Network Status Bar — 5 KPIs at a glance
 *   3. AI Intelligence Briefing — full-width, Claude-powered
 *   4. Campus Risk Matrix — all campuses as compact cards with sparklines
 *   5. Critical Incidents + Active Contagion Zones — two-column
 *   6. Week Ahead Forecast — horizontal strip
 *   7. Data Sources — source status indicators
 *   8. Ask Slate
 *
 * Drop-in replacement for the existing NetworkDashboard component.
 * Same props interface — no changes needed in SentinelApp.tsx.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Incident, ShotSpotterEvent, CampusRisk,
  IceAlert, ForecastDay,
} from '../../engine/types';
import type { CitizenIncident } from '../../api/citizen';
import type { DispatchIncident } from '../../api/scannerIntel';
import { CAMPUSES } from '../../data/campuses';
import { RISK_COLORS } from '../../data/weights';
import { haversine } from '../../engine/geo';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface NetworkSummary {
  avgScore: number;
  highestCampus: string;
  highestScore: number;
  elevatedCount: number;
  totalCampuses: number;
  acuteZoneCount: number;
}

interface Props {
  risks: CampusRisk[];
  summary: NetworkSummary;
  forecast: ForecastDay[];
  iceAlerts: IceAlert[];
  shotSpotterEvents: ShotSpotterEvent[];
  acuteIncidents: Incident[];
  citizenIncidents?: CitizenIncident[];
  newsIncidents?: Incident[];
  dispatchIncidents?: DispatchIncident[];
  scannerCalls?: number;
  scannerSpikeZones?: number;
  newsSourceCount?: number;
  newsIncidentCount?: number;
  redditIncidentCount?: number;
  cpdCount?: number;
  onSelectCampus: (id: number) => void;
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

const FONT = {
  heading: "'Playfair Display', Georgia, serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'SF Mono', monospace",
};

const SERIOUS_VIOLENT = /HOMICIDE|MURDER|SHOOTING|SHOT.?SPOTTER|CRIM SEXUAL|KIDNAP|AGG.*HANDGUN|AGG.*FIREARM/i;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function riskColor(label: string): string {
  if (label === 'CRITICAL') return C.red;
  if (label === 'HIGH') return '#C66C3D';
  if (label === 'ELEVATED') return C.amber;
  return C.green;
}

function riskBg(label: string): string {
  if (label === 'CRITICAL') return '#FEF2F2';
  if (label === 'HIGH') return '#FFF7ED';
  if (label === 'ELEVATED') return '#FFFBEB';
  return '#F0FDF4';
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/** Mini sparkline as inline SVG */
function Sparkline({ data, color, width = 80, height = 24 }: {
  data: number[]; color: string; width?: number; height?: number;
}) {
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
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Section label in tiny red uppercase */
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: C.section,
      fontFamily: FONT.body, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

// ─── AI BRIEFING HOOK ────────────────────────────────────────────────────────

function useNetworkBriefing(
  risks: CampusRisk[],
  summary: NetworkSummary,
  acuteIncidents: Incident[],
  iceAlerts: IceAlert[],
  newsIncidents: Incident[],
) {
  const [briefing, setBriefing] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const now = Date.now();

      // Compute network-wide violent incidents (serious only) in last 24h
      const violent24h = acuteIncidents.filter(inc => {
        const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
        return hrs <= 24 && SERIOUS_VIOLENT.test(inc.type);
      });

      // All incidents within 1mi of any campus in last 24h
      const nearCampus24h = acuteIncidents.filter(inc => {
        const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
        if (hrs > 24) return false;
        return CAMPUSES.some(c => haversine(c.lat, c.lng, inc.lat, inc.lng) <= 1.0);
      });

      // Top incident types near campuses
      const typeCounts: Record<string, number> = {};
      nearCampus24h.forEach(inc => {
        typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
      });
      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t, c]) => `${t}: ${c}`)
        .join(', ');

      // Campuses sorted by risk
      const sorted = [...risks].sort((a, b) => b.score - a.score);
      const campusRiskList = sorted.slice(0, 5).map(r => {
        const campus = CAMPUSES.find(c => c.id === r.campusId);
        return `${campus?.short ?? 'Unknown'} (${r.score}, ${r.label})`;
      }).join(', ');

      // Contagion zones
      const totalContagion = risks.reduce((sum, r) => sum + (r.contagionZones?.length ?? 0), 0);

      const prompt = `You are the AI intelligence analyst for Slate Watch, a school safety platform monitoring ${CAMPUSES.length} charter school campuses across Chicago.

HARD CONSTRAINTS — YOU MUST FOLLOW THESE EXACTLY:
- The dashboard shows these KPIs: Avg Risk Score ${summary.avgScore}, Elevated ${summary.elevatedCount} of ${summary.totalCampuses}, Violent 24h ${violent24h.length}, ICE Alerts ${iceAlerts.length}, Contagion Zones ${totalContagion}.
- Your briefing appears directly below these numbers. You MUST reference them accurately.
- If violent24h (${violent24h.length}) > 0, you MUST acknowledge the violent incidents with specifics.
- NEVER say "no violent incidents" or "quiet night" when violent24h > 0.
- "Violent" means ONLY: homicides, murders, shootings, sexual assaults, kidnappings, and gun violence. NOT battery, robbery, or theft.

CONTEXT:
- Date/time: ${formatDate()}, ${formatTime()} CT
- Network avg risk: ${summary.avgScore}
- Highest risk campus: ${summary.highestCampus} at ${summary.highestScore}
- Elevated campuses: ${summary.elevatedCount} of ${summary.totalCampuses}
- Top 5 campuses by risk: ${campusRiskList}
- Serious violent incidents (24h, near any campus): ${violent24h.length}
- All incidents near campuses (24h): ${nearCampus24h.length}
- Top incident types (24h): ${topTypes || 'None detected'}
- ICE alerts: ${iceAlerts.length}
- Active contagion zones: ${totalContagion}
- News-sourced incidents: ${newsIncidents.length}

Write a 3-4 paragraph intelligence briefing for the CEO of this charter school network. Structure:
1. Opening: State the overall network posture clearly. Reference the exact KPI numbers.
2. Situation: Describe the most important developments in the last 24 hours. Name specific campuses and areas. Be specific about incident types and locations.
3. Recommendations: 2-3 concrete, actionable items for the CEO. Reference specific campuses.

Tone: Authoritative but not alarmist. Like a senior intelligence briefer speaking to a decision-maker. Complete sentences, not bullet points. Be specific — name campuses, neighborhoods, and numbers.`;

      // Try the Claude proxy
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: prompt,
          messages: [{ role: 'user', content: 'Generate the network intelligence briefing now.' }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.content?.[0]?.text ?? '';
        if (text) {
          setBriefing(text);
          setLoading(false);
          return;
        }
      }

      // Fallback: deterministic briefing
      setBriefing(generateFallbackBriefing(summary, violent24h, nearCampus24h, iceAlerts, totalContagion, sorted));
    } catch (err) {
      console.error('Network briefing error:', err);
      const now = Date.now();
      const violent24h = acuteIncidents.filter(inc => {
        const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
        return hrs <= 24 && SERIOUS_VIOLENT.test(inc.type);
      });
      const nearCampus24h = acuteIncidents.filter(inc => {
        const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
        if (hrs > 24) return false;
        return CAMPUSES.some(c => haversine(c.lat, c.lng, inc.lat, inc.lng) <= 1.0);
      });
      const totalContagion = risks.reduce((sum, r) => sum + (r.contagionZones?.length ?? 0), 0);
      const sorted = [...risks].sort((a, b) => b.score - a.score);
      setBriefing(generateFallbackBriefing(summary, violent24h, nearCampus24h, iceAlerts, totalContagion, sorted));
    }
    setLoading(false);
  }, [risks.length, summary.avgScore, acuteIncidents.length, iceAlerts.length, newsIncidents.length]);

  useEffect(() => { generate(); }, [generate]);

  return { briefing, loading, regenerate: generate };
}

function generateFallbackBriefing(
  summary: NetworkSummary,
  violent24h: Incident[],
  nearCampus24h: Incident[],
  iceAlerts: IceAlert[],
  totalContagion: number,
  sorted: CampusRisk[],
): string {
  const topCampus = CAMPUSES.find(c => c.id === sorted[0]?.campusId);

  let para1 = '';
  if (violent24h.length === 0) {
    para1 = `The network is currently at an average risk score of ${summary.avgScore} with ${summary.elevatedCount} of ${summary.totalCampuses} campuses at elevated status or above. No serious violent incidents — homicides, shootings, or gun violence — have been reported within 1 mile of any campus in the past 24 hours.`;
  } else {
    para1 = `The network is at an average risk score of ${summary.avgScore} with ${summary.elevatedCount} of ${summary.totalCampuses} campuses at elevated status or above. ${violent24h.length} serious violent incident${violent24h.length === 1 ? '' : 's'} ${violent24h.length === 1 ? 'has' : 'have'} been reported within 1 mile of campuses in the past 24 hours. This requires heightened awareness across the network.`;
  }

  let para2 = '';
  if (topCampus) {
    para2 = `${topCampus.short} in ${topCampus.communityArea} holds the highest risk score at ${sorted[0].score} (${sorted[0].label}). `;
  }
  if (nearCampus24h.length > 0) {
    para2 += `A total of ${nearCampus24h.length} incident${nearCampus24h.length === 1 ? '' : 's'} of all types ${nearCampus24h.length === 1 ? 'has' : 'have'} been logged near campuses in the last 24 hours. `;
  }
  if (totalContagion > 0) {
    para2 += `${totalContagion} active contagion zone${totalContagion === 1 ? '' : 's'} ${totalContagion === 1 ? 'is' : 'are'} being monitored. `;
  }
  if (iceAlerts.length > 0) {
    para2 += `${iceAlerts.length} ICE enforcement alert${iceAlerts.length === 1 ? '' : 's'} ${iceAlerts.length === 1 ? 'is' : 'are'} active — Network Legal has been notified.`;
  }

  let para3 = '';
  if (violent24h.length > 0) {
    para3 += 'Ensure all campus safety officers are briefed on overnight violent activity before student arrival. ';
  }
  if (iceAlerts.length > 0) {
    para3 += 'Confirm that shelter-in-place protocols are current at all campuses with nearby ICE activity. ';
  }
  if (summary.elevatedCount >= summary.totalCampuses / 2) {
    para3 += 'With more than half the network at elevated status, consider a network-wide safety stand-up this morning. ';
  }
  para3 += 'Slate Watch continues monitoring — updates every 90 seconds.';

  return `${para1}\n\n${para2}\n\n${para3}`;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function NetworkDashboard({
  risks, summary, forecast, iceAlerts, shotSpotterEvents,
  acuteIncidents, citizenIncidents = [], newsIncidents = [], dispatchIncidents = [],
  scannerCalls = 0, scannerSpikeZones = 0, newsSourceCount = 0, newsIncidentCount = 0,
  redditIncidentCount = 0, cpdCount = 0, onSelectCampus,
}: Props) {

  const { briefing, loading: briefingLoading, regenerate } = useNetworkBriefing(
    risks, summary, acuteIncidents, iceAlerts, newsIncidents,
  );

  const now = Date.now();

  // ── Compute KPIs ──
  const violent24h = useMemo(() => {
    return acuteIncidents.filter(inc => {
      const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
      return hrs <= 24 && SERIOUS_VIOLENT.test(inc.type);
    }).length;
  }, [acuteIncidents]);

  const totalContagion = useMemo(() => {
    return risks.reduce((sum, r) => sum + (r.contagionZones?.length ?? 0), 0);
  }, [risks]);

  const nearCampus24h = useMemo(() => {
    return acuteIncidents.filter(inc => {
      const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
      if (hrs > 24) return false;
      return CAMPUSES.some(c => haversine(c.lat, c.lng, inc.lat, inc.lng) <= 1.0);
    });
  }, [acuteIncidents]);

  // Critical incidents: violent + near campus + last 24h
  const criticalIncidents = useMemo(() => {
    return nearCampus24h
      .filter(inc => SERIOUS_VIOLENT.test(inc.type))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [nearCampus24h]);

  // Campus risks sorted
  const sortedRisks = useMemo(() => {
    return [...risks].sort((a, b) => b.score - a.score);
  }, [risks]);

  // 7-day sparkline data per campus (incidents per day within 1mi)
  const campusSparklines = useMemo(() => {
    const result: Record<number, number[]> = {};
    for (const campus of CAMPUSES) {
      const daily: number[] = [];
      for (let d = 6; d >= 0; d--) {
        const dayStart = now - (d + 1) * 86400000;
        const dayEnd = now - d * 86400000;
        let count = 0;
        for (const inc of acuteIncidents) {
          const t = new Date(inc.date).getTime();
          if (t >= dayStart && t < dayEnd && haversine(campus.lat, campus.lng, inc.lat, inc.lng) <= 1.0) {
            count++;
          }
        }
        daily.push(count);
      }
      result[campus.id] = daily;
    }
    return result;
  }, [acuteIncidents]);

  // ── RENDER ──

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', fontFamily: FONT.body }}>

      {/* ═══ TITLE ═══ */}
      <SectionLabel>THE {timeOfDay().toUpperCase()}</SectionLabel>
      <h1 style={{
        fontFamily: FONT.heading, fontSize: 36, fontWeight: 900,
        color: C.deep, margin: '0 0 4px 0', lineHeight: 1.15,
        letterSpacing: '-0.02em',
      }}>
        Your Network This {timeOfDay()}
      </h1>
      <div style={{
        fontSize: 12, color: C.light, marginBottom: 28,
        fontFamily: FONT.mono, letterSpacing: '0.02em',
      }}>
        {formatDate()} · {formatTime()} CT
      </div>

      {/* ═══ NETWORK STATUS BAR — 5 KPIs ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
        marginBottom: 28,
      }}>
        {[
          { label: 'AVG RISK', value: summary.avgScore.toString(), color: summary.avgScore >= 50 ? C.red : summary.avgScore >= 35 ? C.amber : C.green },
          { label: 'ELEVATED', value: `${summary.elevatedCount}/${summary.totalCampuses}`, color: summary.elevatedCount > summary.totalCampuses / 2 ? C.red : C.amber },
          { label: 'VIOLENT 24H', value: violent24h.toString(), color: violent24h > 0 ? C.red : C.green },
          { label: 'ICE ALERTS', value: iceAlerts.length.toString(), color: iceAlerts.length > 0 ? C.ice : C.mid },
          { label: 'CONTAGION', value: totalContagion.toString(), color: totalContagion > 0 ? C.amber : C.green },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 10,
            padding: '16px 18px', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: C.mid, marginBottom: 6,
              fontFamily: FONT.body,
            }}>{kpi.label}</div>
            <div style={{
              fontSize: 28, fontWeight: 900, color: kpi.color,
              fontFamily: FONT.heading, lineHeight: 1,
            }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ═══ AI INTELLIGENCE BRIEFING ═══ */}
      <div style={{
        background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 12,
        padding: '28px 32px', marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>✦</span>
          <span style={{
            fontSize: 15, fontWeight: 700, color: C.deep,
            fontFamily: FONT.body,
          }}>AI Intelligence Briefing</span>
        </div>
        <SectionLabel>{timeOfDay().toUpperCase()} ASSESSMENT</SectionLabel>

        {briefingLoading ? (
          <div style={{ padding: '20px 0' }}>
            {[95, 88, 92, 60].map((w, i) => (
              <div key={i} style={{
                height: 14, borderRadius: 4, marginBottom: 10, width: `${w}%`,
                background: `linear-gradient(90deg, ${C.chalk} 0%, ${C.cream2} 50%, ${C.chalk} 100%)`,
                backgroundSize: '800px 100%',
              }} />
            ))}
          </div>
        ) : (
          <div style={{
            fontSize: 15, lineHeight: 1.75, color: C.rock,
            fontFamily: FONT.body, whiteSpace: 'pre-line',
          }}>
            {briefing}
          </div>
        )}

        {/* Source tags */}
        <div style={{
          display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {[
            { label: `${summary.elevatedCount} ELEVATED`, color: C.amber },
            { label: `${violent24h} Violent 24h`, color: violent24h > 0 ? C.red : C.green },
            { label: `${totalContagion} Contagion zones`, color: totalContagion > 0 ? C.amber : C.mid },
            ...(iceAlerts.length > 0 ? [{ label: `${iceAlerts.length} ICE alerts`, color: C.ice }] : []),
          ].map((tag, i) => (
            <span key={i} style={{
              display: 'inline-block', padding: '4px 10px', borderRadius: 6,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
              background: tag.color + '12', color: tag.color,
              fontFamily: FONT.body,
            }}>{tag.label}</span>
          ))}
          <button onClick={regenerate} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 11, color: C.mid, cursor: 'pointer',
            fontFamily: FONT.body,
          }}>
            ↻ Refresh briefing
          </button>
        </div>
      </div>

      {/* ═══ NETWORK RISK HEATMAP ═══ */}
      <SectionLabel>NETWORK RISK HEATMAP</SectionLabel>
      <div style={{
        display: 'flex', gap: 2, marginBottom: 20, borderRadius: 8, overflow: 'hidden',
        height: 32,
      }}>
        {sortedRisks.map(risk => {
          const campus = CAMPUSES.find(c => c.id === risk.campusId);
          if (!campus) return null;
          const pct = 100 / sortedRisks.length;
          const bgColor = risk.label === 'HIGH' || risk.label === 'CRITICAL'
            ? `rgba(220,38,38,${Math.min(risk.score / 100, 1)})`
            : risk.label === 'ELEVATED'
            ? `rgba(217,119,6,${Math.min(risk.score / 100 + 0.2, 1)})`
            : `rgba(22,163,74,${Math.min(risk.score / 100 + 0.3, 1)})`;
          return (
            <div
              key={campus.id}
              onClick={() => onSelectCampus(campus.id)}
              title={`${campus.short}: ${risk.score} (${risk.label})`}
              style={{
                flex: `0 0 ${pct}%`, background: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'opacity .15s',
                position: 'relative',
              }}
            >
              <span style={{
                fontSize: 9, fontWeight: 800, color: '#fff',
                fontFamily: FONT.body, letterSpacing: '.05em',
                textShadow: '0 1px 2px rgba(0,0,0,.3)',
              }}>
                {campus.short.slice(0, 4).toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ═══ CAMPUS RISK MATRIX ═══ */}
      <SectionLabel>YOUR CAMPUSES AT A GLANCE</SectionLabel>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12, marginBottom: 28,
      }}>
        {sortedRisks.map(risk => {
          const campus = CAMPUSES.find(c => c.id === risk.campusId);
          if (!campus) return null;
          const color = riskColor(risk.label);
          const bg = riskBg(risk.label);
          const sparkData = campusSparklines[campus.id] || [];
          const nearbyViolent = acuteIncidents.filter(inc => {
            const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
            return hrs <= 24 && SERIOUS_VIOLENT.test(inc.type) &&
              haversine(campus.lat, campus.lng, inc.lat, inc.lng) <= 1.0;
          }).length;

          return (
            <button key={campus.id} onClick={() => onSelectCampus(campus.id)} style={{
              background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 10,
              padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
              borderLeft: `3px solid ${color}`, transition: 'box-shadow 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: C.deep,
                    fontFamily: FONT.body,
                  }}>{campus.short}</div>
                  <div style={{ fontSize: 11, color: C.mid, marginTop: 1 }}>{campus.communityArea}</div>
                </div>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                  background: bg, color: color,
                }}>{risk.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <span style={{
                    fontSize: 24, fontWeight: 900, color: color,
                    fontFamily: FONT.heading, lineHeight: 1,
                  }}>{risk.score}</span>
                  {nearbyViolent > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: C.red,
                      marginLeft: 6, verticalAlign: 'super',
                    }}>
                      {nearbyViolent} violent
                    </span>
                  )}
                </div>
                <Sparkline data={sparkData} color={color} width={60} height={20} />
              </div>

              {(risk.contagionZones?.length ?? 0) > 0 && (
                <div style={{
                  fontSize: 10, color: C.amber, fontWeight: 600,
                  marginTop: 6,
                }}>
                  ⚠ {risk.contagionZones.length} contagion zone{risk.contagionZones.length > 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ CRITICAL INCIDENTS + CONTAGION ZONES — Two Column ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        marginBottom: 28,
      }}>
        {/* Left: Critical Incidents */}
        <div style={{
          background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 12,
          padding: '20px 24px',
        }}>
          <SectionLabel>CRITICAL INCIDENTS — LAST 24H</SectionLabel>
          {criticalIncidents.length === 0 ? (
            <div style={{
              fontSize: 14, color: C.mid, padding: '20px 0',
              fontFamily: FONT.body,
            }}>
              No serious violent incidents near campuses in the last 24 hours.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {criticalIncidents.map((inc, i) => {
                const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
                const nearest = CAMPUSES.reduce((best, c) => {
                  const d = haversine(c.lat, c.lng, inc.lat, inc.lng);
                  return d < best.dist ? { campus: c, dist: d } : best;
                }, { campus: CAMPUSES[0], dist: Infinity });

                return (
                  <div key={inc.id || i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '10px 0',
                    borderBottom: i < criticalIncidents.length - 1 ? `1px solid ${C.chalk}` : 'none',
                  }}>
                    <div style={{
                      width: 3, minHeight: 36, borderRadius: 2,
                      background: C.red, flexShrink: 0, marginTop: 2,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: C.deep,
                        fontFamily: FONT.body, marginBottom: 3,
                      }}>
                        {inc.description || inc.type}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px',
                          borderRadius: 4, background: C.red + '15', color: C.red,
                        }}>{inc.type}</span>
                        <span style={{
                          fontSize: 10, color: C.mid, fontFamily: FONT.mono,
                        }}>
                          {hrs < 1 ? `${Math.round(hrs * 60)}m ago` : `${hrs.toFixed(1)}h ago`}
                        </span>
                        <span style={{ fontSize: 10, color: C.mid }}>
                          · {nearest.dist.toFixed(1)}mi from {nearest.campus.short}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Contagion Zones */}
        <div style={{
          background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 12,
          padding: '20px 24px',
        }}>
          <SectionLabel>ACTIVE CONTAGION ZONES</SectionLabel>
          {totalContagion === 0 ? (
            <div style={{
              fontSize: 14, color: C.mid, padding: '20px 0',
              fontFamily: FONT.body,
            }}>
              No active contagion zones detected across the network.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedRisks.filter(r => (r.contagionZones?.length ?? 0) > 0).map(risk => {
                const campus = CAMPUSES.find(c => c.id === risk.campusId);
                if (!campus) return null;
                return (
                  <div key={campus.id} style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: C.amber + '08', border: `1px solid ${C.amber}30`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: C.deep,
                          fontFamily: FONT.body,
                        }}>{campus.short}</div>
                        <div style={{ fontSize: 11, color: C.mid }}>{campus.communityArea}</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: C.amber,
                        fontFamily: FONT.mono,
                      }}>
                        {risk.contagionZones.length} zone{risk.contagionZones.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: C.mid, marginTop: 6,
                    }}>
                      Retaliation risk elevated — monitor for 72h after triggering incident
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ WEEK AHEAD FORECAST ═══ */}
      {forecast.length > 0 && (
        <>
          <SectionLabel>WHAT TO WATCH THIS WEEK</SectionLabel>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${Math.min(forecast.length, 7)}, 1fr)`,
            gap: 8, marginBottom: 28,
          }}>
            {forecast.slice(0, 7).map((day, i) => {
              const dayColor = day.riskLabel === 'HIGH' || day.riskLabel === 'CRITICAL' ? C.red
                : day.riskLabel === 'ELEVATED' ? C.amber : C.green;
              return (
                <div key={i} style={{
                  background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 8,
                  padding: '12px 10px', textAlign: 'center',
                  borderTop: `3px solid ${dayColor}`,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: C.deep,
                    fontFamily: FONT.body, marginBottom: 4,
                  }}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div style={{
                    fontSize: 10, color: C.mid, marginBottom: 6,
                  }}>
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 900, color: dayColor,
                    fontFamily: FONT.heading, lineHeight: 1,
                  }}>
                    {day.score ?? '—'}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: dayColor,
                    letterSpacing: '0.05em', marginTop: 4,
                  }}>
                    {day.riskLabel}
                  </div>
                  {day.factors && day.factors.length > 0 && (
                    <div style={{
                      fontSize: 9, color: C.mid, marginTop: 6,
                      lineHeight: 1.3,
                    }}>
                      {day.factors.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ DATA SOURCES ═══ */}
      <SectionLabel>INTELLIGENCE SOURCES</SectionLabel>
      <div style={{
        background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 12,
        padding: '16px 20px', marginBottom: 28,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
        }}>
          {[
            { name: 'CPD Data Portal', count: cpdCount, live: cpdCount > 0 },
            { name: 'Citizen App', count: citizenIncidents.length, live: citizenIncidents.length > 0 },
            { name: 'News RSS', count: newsIncidentCount, live: newsSourceCount > 0, detail: `${newsSourceCount} sources` },
            { name: 'Police Scanner', count: scannerCalls, live: scannerCalls > 0, detail: `${scannerSpikeZones} spike zones` },
            { name: 'ShotSpotter', count: shotSpotterEvents.length, live: true },
            { name: 'Reddit Intel', count: redditIncidentCount, live: redditIncidentCount > 0 },
            { name: 'Dispatch Intel', count: dispatchIncidents.length, live: dispatchIncidents.length > 0 },
          ].map((src, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: src.live ? C.green : C.light,
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.deep }}>{src.name}</div>
                <div style={{ fontSize: 10, color: C.mid, fontFamily: FONT.mono }}>
                  {src.count} items{src.detail ? ` · ${src.detail}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
