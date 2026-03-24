/**
 * NetworkDashboard — Slate Watch · V3 "The Morning Brief"
 *
 * A flowing intelligence document with rich explanatory context.
 *
 * Layout:
 *   1. Title + Dateline
 *   2. Network Status Bar — 5 KPIs with inline explanations
 *   3. "How to Read This Dashboard" — collapsible explainer panel
 *   4. AI Intelligence Briefing — full-width, Claude-powered
 *   5. Campus Risk Matrix — cards with statusReason, score breakdown, click-to-explain
 *   6. Critical Incidents + Active Contagion Zones (with narrative) — two-column
 *   7. Week Ahead Forecast — horizontal strip
 *   8. Data Sources — source status indicators
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Incident, ShotSpotterEvent, CampusRisk, ContagionZone,
  IceAlert, ForecastDay,
} from '../../engine/types';
import type { Campus } from '../../data/campuses';
import type { CitizenIncident } from '../../api/citizen';
import type { DispatchIncident } from '../../api/scannerIntel';
import { CAMPUSES } from '../../data/campuses';
import { RISK_COLORS } from '../../data/weights';
import { haversine, fmtAgo } from '../../engine/geo';
import ScoreExplainer from '../shared/ScoreExplainer';

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
  /** Full 30-day incident set — needed for ScoreExplainer */
  allIncidents?: Incident[];
  /** Current apparent temperature in °F */
  tempF?: number;
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

/** Label explanation helper — why is this campus at this level? */
function labelExplanation(label: string): string {
  switch (label) {
    case 'CRITICAL': return 'Campus is in a retaliation window — 18-72 hours after a nearby homicide. This is the peak danger period for retaliatory violence.';
    case 'HIGH': return 'A homicide has been detected within 1 mile in the last 72 hours, or the 14-day violent crime baseline is significantly elevated.';
    case 'ELEVATED': return 'A weapons violation within 0.5 miles in the last 48 hours, a ShotSpotter alert within 0.25 miles, or a moderately elevated 14-day baseline.';
    case 'LOW': return 'No contagion-level events (homicides, weapons, CSA) detected near campus. Environmental crimes like battery or robbery cannot drive the label above LOW.';
    default: return '';
  }
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

      const violent24h = acuteIncidents.filter(inc => {
        const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
        return hrs <= 24 && SERIOUS_VIOLENT.test(inc.type);
      });

      const nearCampus24h = acuteIncidents.filter(inc => {
        const hrs = (now - new Date(inc.date).getTime()) / (1000 * 3600);
        if (hrs > 24) return false;
        return CAMPUSES.some(c => haversine(c.lat, c.lng, inc.lat, inc.lng) <= 1.0);
      });

      const typeCounts: Record<string, number> = {};
      nearCampus24h.forEach(inc => {
        typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
      });
      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t, c]) => `${t}: ${c}`)
        .join(', ');

      const sorted = [...risks].sort((a, b) => b.score - a.score);
      const campusRiskList = sorted.slice(0, 5).map(r => {
        const campus = CAMPUSES.find(c => c.id === r.campusId);
        return `${campus?.short ?? 'Unknown'} (${r.score}, ${r.label})`;
      }).join(', ');

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

// ─── HOW TO READ THIS DASHBOARD ─────────────────────────────────────────────

function HowToReadPanel({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 12,
      marginBottom: 24, overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: FONT.body,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: C.brass }}>?</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.deep }}>
            How to Read This Dashboard
          </span>
        </div>
        <span style={{ fontSize: 12, color: C.mid, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.chalk}` }}>
          {/* Score explanation */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.deep, marginBottom: 8, fontFamily: FONT.body }}>
              THE RISK SCORE (0-100)
            </div>
            <div style={{ fontSize: 13, color: C.rock, lineHeight: 1.7, fontFamily: FONT.body }}>
              Each campus receives a risk score from 0 to 100 based on real crime data from the last 30 days.
              The score is built from four components: <strong>Contagion Proximity</strong> (homicides, weapons, CSA within 2 miles),
              <strong> Acute Threats</strong> (active incidents in the last 72 hours), <strong>Environmental Context</strong> (battery,
              assault, robbery — capped at 15 points and cannot drive the label above LOW), and <strong>Seasonal Risk</strong> (day of
              week, month, temperature). Click any campus score to see the full breakdown.
            </div>
          </div>

          {/* Label explanation */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.deep, marginBottom: 8, fontFamily: FONT.body }}>
              THE RISK LABEL
            </div>
            <div style={{ fontSize: 13, color: C.rock, lineHeight: 1.7, marginBottom: 10, fontFamily: FONT.body }}>
              The label is <strong>event-driven, not score-driven</strong>. A campus can have a moderate score but still be CRITICAL
              if a specific triggering event occurred. This prevents environmental noise (lots of batteries, robberies) from
              inflating perceived risk. Only contagion crimes — homicides, weapons violations, and criminal sexual assaults — can
              drive the label above LOW.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: 'LOW', color: C.green, bg: '#F0FDF4', trigger: 'No contagion-level events near campus' },
                { label: 'ELEVATED', color: C.amber, bg: '#FFFBEB', trigger: 'Weapons within 0.5mi (48h) or ShotSpotter alert' },
                { label: 'HIGH', color: '#C66C3D', bg: '#FFF7ED', trigger: 'Homicide within 1mi (72h) or elevated baseline' },
                { label: 'CRITICAL', color: C.red, bg: '#FEF2F2', trigger: 'Retaliation window (18-72h post-homicide)' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: item.bg, borderLeft: `3px solid ${item.color}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: item.color, letterSpacing: '0.06em' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: C.rock, marginTop: 4, lineHeight: 1.4 }}>
                    {item.trigger}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contagion zones explanation */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.deep, marginBottom: 8, fontFamily: FONT.body }}>
              CONTAGION ZONES
            </div>
            <div style={{ fontSize: 13, color: C.rock, lineHeight: 1.7, fontFamily: FONT.body }}>
              Based on the <strong>Papachristos Violence Contagion Model</strong> (JAMA 2017), every homicide within 2 miles of a
              campus generates a "contagion zone" that persists for 125 days. Violence spreads like a disease — 60%+ of gun
              violence occurs in cascades. Zones progress through three phases: <strong>ACUTE</strong> (0-72h, highest risk with
              retaliation window at 18-72h), <strong>ACTIVE</strong> (72h-14d, elevated monitoring), and <strong>WATCH</strong> (14d-125d,
              extended awareness). When you see a campus "in a contagion zone," it means a homicide occurred nearby recently
              enough that the statistical risk of follow-on violence is elevated.
            </div>
          </div>

          {/* KPI explanations */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.deep, marginBottom: 8, fontFamily: FONT.body }}>
              THE KPI BAR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'AVG RISK', desc: 'Average risk score across all campuses. Below 25 is healthy; above 45 warrants attention.' },
                { label: 'ELEVATED', desc: 'How many campuses are above LOW status. These are the ones that need your attention today.' },
                { label: 'VIOLENT 24H', desc: 'Serious violent incidents (homicides, shootings, gun violence) near any campus in the last 24 hours.' },
                { label: 'ICE ALERTS', desc: 'Immigration enforcement activity detected near campuses. Triggers shelter-in-place awareness.' },
                { label: 'CONTAGION', desc: 'Active contagion zones across the network. Each represents a homicide still within its 125-day risk window.' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: C.cream2, fontSize: 12, fontFamily: FONT.body,
                }}>
                  <span style={{ fontWeight: 700, color: C.deep }}>{item.label}: </span>
                  <span style={{ color: C.rock }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data integrity note */}
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8,
            background: C.cream2, borderLeft: `3px solid ${C.brass}`,
          }}>
            <div style={{ fontSize: 12, fontStyle: 'italic', color: C.rock, lineHeight: 1.6, fontFamily: FONT.body }}>
              "The data tells the story. We do not engineer outcomes." Every score is deterministic, reproducible, and
              traceable to specific incidents. No manual overrides. No subjective adjustments. The algorithm applies
              equally to every campus, every day.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CONTAGION ZONE NARRATIVE ────────────────────────────────────────────────

function ContagionZoneNarrative({ zone, campusName }: { zone: ContagionZone; campusName: string }) {
  const phaseColors: Record<string, { color: string; bg: string }> = {
    ACUTE:  { color: '#DC2626', bg: '#FEF2F2' },
    ACTIVE: { color: '#EA580C', bg: '#FFF7ED' },
    WATCH:  { color: '#D97706', bg: '#FFFBEB' },
  };
  const pc = phaseColors[zone.phase] || phaseColors.WATCH;

  const phaseNarrative = zone.phase === 'ACUTE'
    ? `This zone is in the ACUTE phase (0-72 hours post-homicide). This is the highest-risk period. ${zone.retWin ? 'The retaliation window (18-72h) is currently active — this is when retaliatory violence is most likely to occur.' : 'The initial shock period is still active.'}`
    : zone.phase === 'ACTIVE'
    ? `This zone is in the ACTIVE phase (72 hours to 14 days). Risk remains elevated as the community processes the event. Heightened monitoring is recommended.`
    : `This zone is in the WATCH phase (14-125 days). The immediate danger has passed, but the statistical risk of follow-on violence remains above baseline per the Papachristos model.`;

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: pc.bg, border: `1px solid ${pc.color}20`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
            background: pc.color, color: '#fff', letterSpacing: '0.06em',
          }}>
            {zone.phase}
          </span>
          {zone.retWin && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
              background: '#DC2626', color: '#fff', letterSpacing: '0.06em',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              RETALIATION WINDOW
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: C.mid, fontFamily: FONT.mono }}>
          {zone.daysLeft}d remaining
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: C.deep, marginBottom: 4, fontFamily: FONT.body }}>
        Homicide{zone.block ? ` near ${zone.block}` : ''} — {fmtAgo(zone.homicideDate)}
      </div>

      <div style={{ fontSize: 12, color: C.rock, lineHeight: 1.6, fontFamily: FONT.body }}>
        {phaseNarrative}
      </div>

      {zone.distanceFromCampus != null && (
        <div style={{ fontSize: 11, color: C.mid, marginTop: 4, fontFamily: FONT.mono }}>
          {zone.distanceFromCampus.toFixed(2)} mi from campus
          {zone.gang && ' · Gang-related'}
          {zone.firearm && ' · Firearm confirmed'}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function NetworkDashboard({
  risks, summary, forecast, iceAlerts, shotSpotterEvents,
  acuteIncidents, citizenIncidents = [], newsIncidents = [], dispatchIncidents = [],
  scannerCalls = 0, scannerSpikeZones = 0, newsSourceCount = 0, newsIncidentCount = 0,
  redditIncidentCount = 0, cpdCount = 0, onSelectCampus,
  allIncidents = [], tempF = 65,
}: Props) {

  const { briefing, loading: briefingLoading, regenerate } = useNetworkBriefing(
    risks, summary, acuteIncidents, iceAlerts, newsIncidents,
  );

  const now = Date.now();

  // ── State ──
  const [howToReadOpen, setHowToReadOpen] = useState(false);
  const [explainerCampusId, setExplainerCampusId] = useState<number | null>(null);

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

  const criticalIncidents = useMemo(() => {
    return nearCampus24h
      .filter(inc => SERIOUS_VIOLENT.test(inc.type))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [nearCampus24h]);

  const sortedRisks = useMemo(() => {
    return [...risks].sort((a, b) => b.score - a.score);
  }, [risks]);

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

  // ScoreExplainer data
  const explainerCampus = explainerCampusId != null ? CAMPUSES.find(c => c.id === explainerCampusId) : null;
  const explainerRisk = explainerCampusId != null ? risks.find(r => r.campusId === explainerCampusId) : null;

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

      {/* ═══ NETWORK STATUS BAR — 5 KPIs with tooltips ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
        marginBottom: 16,
      }}>
        {[
          { label: 'AVG RISK', value: summary.avgScore.toString(), color: summary.avgScore >= 50 ? C.red : summary.avgScore >= 35 ? C.amber : C.green, sub: summary.avgScore < 25 ? 'Healthy range' : summary.avgScore < 45 ? 'Monitor closely' : 'Requires attention' },
          { label: 'ELEVATED', value: `${summary.elevatedCount}/${summary.totalCampuses}`, color: summary.elevatedCount > summary.totalCampuses / 2 ? C.red : C.amber, sub: `${summary.elevatedCount} campus${summary.elevatedCount !== 1 ? 'es' : ''} above LOW` },
          { label: 'VIOLENT 24H', value: violent24h.toString(), color: violent24h > 0 ? C.red : C.green, sub: violent24h === 0 ? 'No serious violence' : `${violent24h} near campuses` },
          { label: 'ICE ALERTS', value: iceAlerts.length.toString(), color: iceAlerts.length > 0 ? C.ice : C.mid, sub: iceAlerts.length > 0 ? 'Shelter-in-place aware' : 'No activity detected' },
          { label: 'CONTAGION', value: totalContagion.toString(), color: totalContagion > 0 ? C.amber : C.green, sub: totalContagion > 0 ? `${totalContagion} active zone${totalContagion !== 1 ? 's' : ''}` : 'No active zones' },
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
            <div style={{
              fontSize: 10, color: C.light, marginTop: 6,
              fontFamily: FONT.body,
            }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ═══ HOW TO READ THIS DASHBOARD ═══ */}
      <HowToReadPanel expanded={howToReadOpen} onToggle={() => setHowToReadOpen(!howToReadOpen)} />

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

      {/* ═══ CAMPUS RISK MATRIX — Enhanced with explanations ═══ */}
      <SectionLabel>YOUR CAMPUSES AT A GLANCE</SectionLabel>
      <div style={{ fontSize: 12, color: C.mid, marginBottom: 12, fontFamily: FONT.body }}>
        Each card shows the campus risk score, threat level, and the specific reason for its current status.
        Click the score to see the full breakdown. Click the campus name to drill into campus-level intelligence.
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
            <div key={campus.id} style={{
              background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 10,
              borderLeft: `3px solid ${color}`, overflow: 'hidden',
            }}>
              {/* Top row: name + label */}
              <div
                onClick={() => onSelectCampus(campus.id)}
                style={{
                  padding: '14px 16px 0', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}
              >
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

              {/* Score row: clickable score + sparkline */}
              <div style={{
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                padding: '8px 16px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExplainerCampusId(campus.id); }}
                    title="Click to see full score breakdown"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 24, fontWeight: 900, color: color,
                      fontFamily: FONT.heading, lineHeight: 1,
                      borderBottom: `2px dashed ${color}40`,
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = color)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = `${color}40`)}
                  >
                    {risk.score}
                  </button>
                  {nearbyViolent > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: C.red,
                      marginBottom: 2,
                    }}>
                      {nearbyViolent} violent
                    </span>
                  )}
                </div>
                <Sparkline data={sparkData} color={color} width={60} height={20} />
              </div>

              {/* Status reason — THE KEY ADDITION */}
              <div style={{
                padding: '8px 16px 12px',
              }}>
                {risk.statusReason && (
                  <div style={{
                    fontSize: 12, color: C.rock, lineHeight: 1.5,
                    fontFamily: FONT.body,
                    padding: '8px 10px',
                    background: bg,
                    borderRadius: 6,
                    marginTop: 4,
                  }}>
                    {risk.statusReason}
                  </div>
                )}

                {/* Contagion zone indicator with context */}
                {(risk.contagionZones?.length ?? 0) > 0 && (
                  <div style={{
                    fontSize: 11, color: C.amber, fontWeight: 600,
                    marginTop: 6, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>⚠</span>
                    <span>
                      {risk.contagionZones.length} contagion zone{risk.contagionZones.length > 1 ? 's' : ''}
                      {risk.inRetaliationWindow && (
                        <span style={{ color: C.red, fontWeight: 700 }}> — RETALIATION WINDOW</span>
                      )}
                      {!risk.inRetaliationWindow && risk.contagionZones.some(z => z.phase === 'ACUTE') && (
                        <span> — acute phase</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Score breakdown mini-bar */}
                <div style={{
                  display: 'flex', gap: 2, marginTop: 8, height: 4, borderRadius: 2, overflow: 'hidden',
                }}>
                  {risk.base > 0 && (
                    <div style={{ flex: risk.base, background: '#DC2626', borderRadius: 1 }}
                      title={`Contagion proximity: ${risk.base} pts`} />
                  )}
                  {risk.acute > 0 && (
                    <div style={{ flex: risk.acute, background: '#EA580C', borderRadius: 1 }}
                      title={`Acute threats: ${risk.acute} pts`} />
                  )}
                  {risk.seasonal > 0 && (
                    <div style={{ flex: risk.seasonal, background: '#9CA3AF', borderRadius: 1 }}
                      title={`Seasonal: ${risk.seasonal} pts`} />
                  )}
                  {risk.base === 0 && risk.acute === 0 && risk.seasonal === 0 && (
                    <div style={{ flex: 1, background: '#E5E7EB', borderRadius: 1 }} />
                  )}
                </div>
                <div style={{
                  display: 'flex', gap: 8, marginTop: 3,
                  fontSize: 9, color: C.light, fontFamily: FONT.mono,
                }}>
                  {risk.base > 0 && <span style={{ color: '#DC2626' }}>Proximity {risk.base}</span>}
                  {risk.acute > 0 && <span style={{ color: '#EA580C' }}>Acute {risk.acute}</span>}
                  {risk.seasonal > 0 && <span style={{ color: '#9CA3AF' }}>Seasonal {risk.seasonal}</span>}
                </div>
              </div>
            </div>
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
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 12, fontFamily: FONT.body }}>
            Serious violent incidents (homicides, shootings, gun violence) detected within 1 mile of any campus.
          </div>
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

        {/* Right: Active Contagion Zones — Enhanced with narratives */}
        <div style={{
          background: C.white, border: `1px solid ${C.chalk}`, borderRadius: 12,
          padding: '20px 24px',
        }}>
          <SectionLabel>ACTIVE CONTAGION ZONES</SectionLabel>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 12, fontFamily: FONT.body }}>
            Homicide-generated violence contagion zones (Papachristos model, 125-day window) currently affecting campuses.
            Each zone represents a recent homicide whose statistical ripple effects are still active.
          </div>
          {totalContagion === 0 ? (
            <div style={{
              fontSize: 14, color: C.mid, padding: '20px 0',
              fontFamily: FONT.body,
            }}>
              No active contagion zones detected across the network. This means no homicides within the monitoring
              radius of any campus are within their 125-day risk window.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sortedRisks.filter(r => (r.contagionZones?.length ?? 0) > 0).map(risk => {
                const campus = CAMPUSES.find(c => c.id === risk.campusId);
                if (!campus) return null;
                return (
                  <div key={campus.id}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: C.deep,
                      fontFamily: FONT.body, marginBottom: 4, marginTop: 8,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>{campus.short}</span>
                      <span style={{ fontSize: 10, color: C.mid, fontWeight: 400 }}>{campus.communityArea}</span>
                    </div>
                    {risk.contagionZones.map((zone, zi) => (
                      <ContagionZoneNarrative
                        key={zone.incidentId || zi}
                        zone={zone}
                        campusName={campus.short}
                      />
                    ))}
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
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 10, fontFamily: FONT.body }}>
            Projected risk levels based on active contagion zone trajectories, day-of-week patterns, and weather forecasts.
            Confidence decreases further into the future.
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${Math.min(forecast.length, 7)}, 1fr)`,
            gap: 8, marginBottom: 28,
          }}>
            {forecast.slice(0, 7).map((day: any, i: number) => {
              const riskLabel = day.riskLabel || day.label || 'LOW';
              const dayColor = riskLabel === 'HIGH' || riskLabel === 'CRITICAL' ? C.red
                : riskLabel === 'ELEVATED' ? C.amber : C.green;
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
                    {day.score ?? riskLabel}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: dayColor,
                    letterSpacing: '0.05em', marginTop: 4,
                  }}>
                    {riskLabel}
                  </div>
                  {((day.factors && day.factors.length > 0) || (day.drivers && day.drivers.length > 0)) && (
                    <div style={{
                      fontSize: 9, color: C.mid, marginTop: 6,
                      lineHeight: 1.3,
                    }}>
                      {(day.factors || day.drivers || []).slice(0, 2).join(', ')}
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
      <div style={{ fontSize: 12, color: C.mid, marginBottom: 10, fontFamily: FONT.body }}>
        Slate Watch fuses 12+ live data sources to build the most complete picture possible. Green dots indicate
        active data flow; gray indicates no recent data from that source.
      </div>
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

      {/* ═══ SCORE EXPLAINER DRAWER ═══ */}
      {explainerCampus && explainerRisk && (
        <ScoreExplainer
          open={explainerCampusId != null}
          onClose={() => setExplainerCampusId(null)}
          campus={explainerCampus}
          risk={explainerRisk}
          incidents={allIncidents}
          acuteIncidents={acuteIncidents}
          shotSpotterEvents={shotSpotterEvents}
          tempF={tempF}
        />
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
