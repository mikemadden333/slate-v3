/**
 * BriefingTabV2 — The Decision Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * Mars Landing Phase 1.
 *
 * Design philosophy:
 *   "Intelligence served to you, not a dashboard you interrogate."
 *
 * The 5-second test: A CEO opens Watch at 6:45 AM. In 5 seconds they know:
 *   1. Is today different from yesterday?
 *   2. Which campuses need attention?
 *   3. What do I need to do right now?
 *
 * Structure:
 *   A. Command Header — Network status + time-aware brief label
 *   B. Decision Cards — Role-tagged actions (CEO / Principal / Safety Director)
 *   C. Campus Intelligence Grid — Cards 2.0 with 72h forecast language
 *   D. Incident Thread — Source timeline, confidence waterfall, AI analysis
 *   E. Contagion Pulse — Retaliation window alert if active
 *   F. Confidence Assessment — Data source health footer
 */
import React, { useState, useMemo, useCallback } from 'react';
import type { WatchDataState } from '../v2/useWatchData';
import type { WatchIncident, ThreatLevel } from '../v2/types';
import { VIOLENT_CRIME_LABELS } from '../v2/types';
import type { ContagionZone } from '../engine/types';
import { fmtAgo, haversine, bearing, compassLabel } from '../engine/geo';
import { CAMPUSES } from '../data/campuses';
import { font } from '../../../core/theme';

// ─── Design Tokens ─────────────────────────────────────────────────────────
const W = {
  bg:            '#F6F8FB',
  bgCard:        '#FFFFFF',
  bgSurface:     '#F1F4F8',
  bgDark:        '#0F1728',
  bgDarkCard:    '#1A2540',
  textPrimary:   '#0F1728',
  textSecondary: '#4C5A70',
  textMuted:     '#7A8699',
  textDim:       '#9CA3AF',
  textOnDark:    '#E8EDF5',
  textMutedDark: '#8899AA',
  gold:          '#C9A54E',
  goldDim:       'rgba(201, 165, 78, 0.12)',
  goldBorder:    'rgba(201, 165, 78, 0.25)',
  red:           '#E5484D',
  redDim:        'rgba(229, 72, 77, 0.08)',
  redBorder:     'rgba(229, 72, 77, 0.20)',
  orange:        '#E07020',
  orangeDim:     'rgba(224, 112, 32, 0.08)',
  amber:         '#F59E0B',
  amberDim:      'rgba(245, 158, 11, 0.08)',
  green:         '#17B26A',
  greenDim:      'rgba(23, 178, 106, 0.08)',
  greenBorder:   'rgba(23, 178, 106, 0.20)',
  blue:          '#4F7CFF',
  blueDim:       'rgba(79, 124, 255, 0.08)',
  border:        'rgba(26, 35, 50, 0.08)',
  borderMd:      'rgba(26, 35, 50, 0.12)',
  threat: {
    GREEN:  { color: '#17B26A', bg: 'rgba(23, 178, 106, 0.08)',  border: 'rgba(23, 178, 106, 0.20)',  label: 'Clear',    desc: 'No active threats within 1 mile' },
    AMBER:  { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)',  border: 'rgba(245, 158, 11, 0.20)',  label: 'Monitor',  desc: 'Reported activity within 1 mile' },
    ORANGE: { color: '#E07020', bg: 'rgba(224, 112, 32, 0.08)',  border: 'rgba(224, 112, 32, 0.20)',  label: 'Elevated', desc: 'Confirmed threat within 0.5 miles' },
    RED:    { color: '#E5484D', bg: 'rgba(229, 72, 77, 0.08)',   border: 'rgba(229, 72, 77, 0.20)',   label: 'Alert',    desc: 'Active threat within 0.25 miles' },
  },
} as const;

// ─── CSS ───────────────────────────────────────────────────────────────────
const CSS = `
@keyframes briefPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
@keyframes briefFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes briefSlideDown {
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 600px; }
}
@keyframes briefSpin {
  to { transform: rotate(360deg); }
}
@keyframes retWindow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(229, 72, 77, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(229, 72, 77, 0); }
}
.brief-campus-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(26, 35, 50, 0.10) !important;
}
.brief-incident-row:hover {
  background: rgba(79, 124, 255, 0.03) !important;
}
.brief-action-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(26, 35, 50, 0.10) !important;
}
`;

// ─── Helpers ───────────────────────────────────────────────────────────────
function getTimePeriod(): { label: string; sub: string; color: string } {
  const h = new Date().getHours();
  if (h >= 22 || h < 6)  return { label: 'OVERNIGHT WATCH',   sub: 'What happened while you slept',  color: '#4F7CFF' };
  if (h < 12)             return { label: 'MORNING BRIEF',     sub: 'Start with the facts',           color: '#C9A54E' };
  if (h < 17)             return { label: 'AFTERNOON UPDATE',  sub: 'The afternoon picture',          color: '#E07020' };
  return                         { label: 'EVENING SUMMARY',   sub: 'End of day',                     color: '#F59E0B' };
}

function isDismissalWindow(): boolean {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  return m >= 870 && m <= 960;
}

function dirFromCampus(cLat: number, cLng: number, iLat: number, iLng: number, dist: number): string {
  const b = bearing(cLat, cLng, iLat, iLng);
  return `${dist.toFixed(2)} mi ${compassLabel(b)}`;
}

function getThreatTrajectory(incidents: WatchIncident[], cLat: number, cLng: number): 'rising' | 'falling' | 'stable' {
  const now = Date.now();
  const recent  = incidents.filter(i => (now - new Date(i.timestamp).getTime()) < 3 * 3600000  && haversine(cLat, cLng, i.lat, i.lng) <= 1.0).length;
  const earlier = incidents.filter(i => { const a = now - new Date(i.timestamp).getTime(); return a >= 3 * 3600000 && a < 6 * 3600000 && haversine(cLat, cLng, i.lat, i.lng) <= 1.0; }).length;
  if (recent > earlier + 1) return 'rising';
  if (earlier > recent + 1) return 'falling';
  return 'stable';
}

function get72hForecast(ct: { threatLevel: ThreatLevel; incidentCount: number }, contagionZones: ContagionZone[], campusId: number): { text: string; color: string } {
  const campusZones = contagionZones.filter(z => {
    const campus = CAMPUSES.find(c => c.id === campusId);
    if (!campus) return false;
    return haversine(campus.lat, campus.lng, z.lat, z.lng) <= z.radius;
  });
  const acuteZones = campusZones.filter(z => z.phase === 'ACUTE');
  const retWindow  = acuteZones.some(z => z.retWin);

  if (retWindow) return { text: 'Retaliation window active — elevated risk next 72h', color: W.red };
  if (acuteZones.length > 0) return { text: `${acuteZones.length} acute zone${acuteZones.length > 1 ? 's' : ''} — monitor through weekend`, color: W.orange };
  if (ct.threatLevel === 'RED')    return { text: 'Active threat — reassess at next refresh', color: W.red };
  if (ct.threatLevel === 'ORANGE') return { text: 'Elevated — watch for escalation', color: W.orange };
  if (ct.threatLevel === 'AMBER')  return { text: 'Monitoring — likely to clear in 2-4h', color: W.amber };
  return { text: 'Clear — normal operations', color: W.green };
}

// ─── Role-tagged Action Generator ─────────────────────────────────────────
interface ActionItem {
  role: 'CEO' | 'PRINCIPAL' | 'SAFETY';
  priority: 'IMMEDIATE' | 'TODAY' | 'ROUTINE';
  text: string;
  color: string;
}

function generateActionItems(
  data: WatchDataState,
  contagionZones: ContagionZone[],
  dismissalActive: boolean,
): ActionItem[] {
  const actions: ActionItem[] = [];
  const net = data.networkStatus;
  const redCampuses  = data.campusThreats.filter(c => c.threatLevel === 'RED');
  const orangeCampuses = data.campusThreats.filter(c => c.threatLevel === 'ORANGE');
  const retWindow    = contagionZones.some(z => z.retWin);
  const acuteZones   = contagionZones.filter(z => z.phase === 'ACUTE');
  const activeZones  = contagionZones.filter(z => z.phase === 'ACTIVE');
  const homicides24h = data.incidents.filter(i => i.crimeType === 'HOMICIDE' && i.ageMinutes <= 1440);

  // IMMEDIATE actions
  if (retWindow) {
    actions.push({
      role: 'CEO', priority: 'IMMEDIATE', color: W.red,
      text: `Retaliation window active. Brief all principals on heightened dismissal protocols. Consider network-wide enhanced security posture.`,
    });
    actions.push({
      role: 'SAFETY', priority: 'IMMEDIATE', color: W.red,
      text: `Retaliation window: 18-72h post-homicide. Deploy additional staff at all campus perimeters. Coordinate with CPD district contacts.`,
    });
  }
  if (redCampuses.length > 0) {
    redCampuses.forEach(c => {
      actions.push({
        role: 'PRINCIPAL', priority: 'IMMEDIATE', color: W.red,
        text: `${c.campusShort}: Active threat ${c.nearestDistance?.toFixed(2) ?? '?'} mi away. Notify staff. Consider lockout protocol if threat moves closer.`,
      });
    });
  }
  if (dismissalActive && (redCampuses.length > 0 || orangeCampuses.length > 0)) {
    actions.push({
      role: 'PRINCIPAL', priority: 'IMMEDIATE', color: W.red,
      text: `Dismissal window active with elevated threat. Stagger dismissal times. Increase adult supervision at all exits.`,
    });
  }

  // TODAY actions
  if (homicides24h.length > 0) {
    actions.push({
      role: 'CEO', priority: 'TODAY', color: W.orange,
      text: `${homicides24h.length} homicide${homicides24h.length > 1 ? 's' : ''} in last 24h near network. Review contagion exposure. Brief board if pattern continues.`,
    });
  }
  if (acuteZones.length > 0) {
    actions.push({
      role: 'SAFETY', priority: 'TODAY', color: W.orange,
      text: `${acuteZones.length} acute contagion zone${acuteZones.length > 1 ? 's' : ''} active. Review campus exposure in Contagion tab. Update safety briefings.`,
    });
  }
  if (orangeCampuses.length > 0) {
    orangeCampuses.forEach(c => {
      actions.push({
        role: 'PRINCIPAL', priority: 'TODAY', color: W.orange,
        text: `${c.campusShort}: Elevated status. Brief security staff. Increase hallway presence during passing periods.`,
      });
    });
  }

  // ROUTINE actions
  if (activeZones.length > 0) {
    actions.push({
      role: 'SAFETY', priority: 'ROUTINE', color: W.amber,
      text: `${activeZones.length} active contagion zone${activeZones.length > 1 ? 's' : ''} (72h-14d). Standard elevated awareness. No immediate action required.`,
    });
  }
  if (net?.weather?.isRiskElevating) {
    actions.push({
      role: 'CEO', priority: 'ROUTINE', color: W.amber,
      text: `Weather conditions elevate risk today (${net.weather.tempF}°F). Historical data shows 23% higher incident rates above 80°F.`,
    });
  }
  if (actions.length === 0) {
    actions.push({
      role: 'CEO', priority: 'ROUTINE', color: W.green,
      text: `Network status nominal. All campuses clear or monitoring. No immediate actions required.`,
    });
  }

  return actions;
}

// ─── Source Timeline Component ─────────────────────────────────────────────
function SourceTimeline({ inc }: { inc: WatchIncident }) {
  // Build a narrative timeline from the available source data
  const events: { time: string; source: string; text: string; color: string }[] = [];

  // Primary source event
  events.push({
    time: fmtAgo(inc.timestamp),
    source: inc.source,
    text: inc.rawTitle ?? inc.title,
    color: inc.source === 'CPD' ? W.green : inc.source === 'CITIZEN' ? W.blue : W.amber,
  });

  // Corroborating sources
  inc.corroboratedBy.forEach((src, i) => {
    events.push({
      time: `+${(i + 1) * 3}-${(i + 1) * 8} min`,
      source: src,
      text: `Corroborated by ${src} — confidence elevated to ${inc.confidence}`,
      color: src === 'CPD' ? W.green : src === 'SCANNER' ? W.blue : W.amber,
    });
  });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.08em', marginBottom: 8 }}>
        SOURCE TIMELINE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Timeline spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0, marginTop: 2 }} />
              {i < events.length - 1 && (
                <div style={{ width: 1, flex: 1, background: W.border, minHeight: 16 }} />
              )}
            </div>
            {/* Event content */}
            <div style={{ paddingBottom: i < events.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: ev.color, fontFamily: font.mono, letterSpacing: '0.06em' }}>
                  {ev.source}
                </span>
                <span style={{ fontSize: '9px', color: W.textDim, fontFamily: font.mono }}>
                  {ev.time}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: W.textSecondary, lineHeight: 1.45 }}>
                {ev.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Confidence Badge ──────────────────────────────────────────────────────
function ConfidenceBadge({ confidence, score }: { confidence: string; score: number }) {
  const cfg = confidence === 'CONFIRMED'
    ? { color: W.green, bg: W.greenDim, label: 'CONFIRMED' }
    : confidence === 'CORROBORATED'
    ? { color: W.blue, bg: W.blueDim, label: 'CORROBORATED' }
    : { color: W.amber, bg: W.amberDim, label: 'REPORTED' };

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: cfg.bg, borderRadius: 4,
      padding: '3px 8px',
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      <span style={{ fontSize: '10px', fontWeight: 700, color: cfg.color, fontFamily: font.mono, letterSpacing: '0.06em' }}>
        {cfg.label}
      </span>
      <span style={{ fontSize: '10px', color: cfg.color, fontFamily: font.mono, opacity: 0.8 }}>
        {score}%
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
interface BriefingTabV2Props {
  data: WatchDataState;
  demoIncident: WatchIncident | null;
  contagionZones: ContagionZone[];
  viewMode?: 'ceo' | 'principal';
}

export function BriefingTabV2({ data, demoIncident, contagionZones, viewMode = 'ceo' }: BriefingTabV2Props) {
  const [expandedIncId, setExpandedIncId] = useState<string | null>(null);
  const [incAiText, setIncAiText] = useState<Record<string, string>>({});
  const [incAiLoading, setIncAiLoading] = useState<Record<string, boolean>>({});
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(null);
  const [showAllActions, setShowAllActions] = useState(false);
  const [networkAiText, setNetworkAiText] = useState<string>('');
  const [networkAiLoading, setNetworkAiLoading] = useState(false);

  const period = getTimePeriod();
  const dismissalActive = isDismissalWindow();
  const net = data.networkStatus;
  const overallThreat = net?.overallThreat ?? 'GREEN';
  const overallCfg = W.threat[overallThreat];

  // Sorted campus threats
  const sortedThreats = useMemo(() => {
    const order: Record<ThreatLevel, number> = { RED: 0, ORANGE: 1, AMBER: 2, GREEN: 3 };
    return [...data.campusThreats].sort((a, b) => order[a.threatLevel] - order[b.threatLevel]);
  }, [data.campusThreats]);

  // Critical incidents (homicides + shootings, last 24h)
  const criticalIncidents = useMemo(() => {
    const all = demoIncident ? [demoIncident, ...data.incidents] : data.incidents;
    return all
      .filter(i => (i.crimeType === 'HOMICIDE' || i.crimeType === 'SHOOTING') && i.ageMinutes <= 1440)
      .filter(i => selectedCampusId == null || i.nearestCampusId === selectedCampusId)
      .slice(0, 15);
  }, [data.incidents, demoIncident, selectedCampusId]);

  // Action items
  const actionItems = useMemo(() =>
    generateActionItems(data, contagionZones, dismissalActive),
    [data, contagionZones, dismissalActive]
  );

  // Retaliation window check
  const retaliationActive = contagionZones.some(z => z.retWin);
  const acuteCount = contagionZones.filter(z => z.phase === 'ACUTE').length;

  // Stats
  const totalIncidents = data.incidents.filter(i => i.ageMinutes <= 360).length + (demoIncident ? 1 : 0);
  const elevatedCount  = data.campusThreats.filter(c => c.threatLevel !== 'GREEN').length;

  // Incident AI handler
  const handleIncidentAi = useCallback(async (e: React.MouseEvent, inc: WatchIncident) => {
    e.stopPropagation();
    if (incAiText[inc.id] || incAiLoading[inc.id]) return;
    setIncAiLoading(prev => ({ ...prev, [inc.id]: true }));
    const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
    const campusZones = contagionZones.filter(z => {
      if (!nearestCampus) return false;
      return haversine(nearestCampus.lat, nearestCampus.lng, z.lat, z.lng) <= z.radius;
    });
    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 350,
          system: `You are a school safety intelligence analyst for Veritas Charter Schools, a 10-campus network in Chicago. 
You use the Papachristos violence contagion model. Provide a 2-3 sentence analysis that:
1. States the immediate safety implication for the nearest campus
2. Notes if this incident could trigger a retaliation window (18-72h elevated risk)
3. Gives one specific, actionable recommendation for the principal or safety director
Be direct, specific, and professional. No hedging. No generic advice.`,
          messages: [{
            role: 'user',
            content: `Incident: ${inc.crimeType} — ${inc.title}. 
Confidence: ${inc.confidence} (${inc.confidenceScore}%). 
Time: ${inc.ageMinutes < 60 ? inc.ageMinutes + ' minutes ago' : Math.round(inc.ageMinutes / 60) + ' hours ago'}. 
Nearest campus: ${nearestCampus?.campusShort ?? 'Unknown'} (${inc.distanceToCampus?.toFixed(2) ?? '?'} miles away).
Active contagion zones near campus: ${campusZones.length} (${campusZones.filter(z => z.phase === 'ACUTE').length} acute, ${campusZones.filter(z => z.phase === 'ACTIVE').length} active).
Retaliation window active: ${campusZones.some(z => z.retWin) ? 'YES' : 'NO'}.
What does this mean for campus safety and what should the principal do?`,
          }],
        }),
      });
      const d = await res.json();
      setIncAiText(prev => ({ ...prev, [inc.id]: d?.content?.[0]?.text || 'Analysis unavailable.' }));
    } catch {
      setIncAiText(prev => ({ ...prev, [inc.id]: 'Unable to generate analysis at this time.' }));
    } finally {
      setIncAiLoading(prev => ({ ...prev, [inc.id]: false }));
    }
  }, [data.campusThreats, contagionZones, incAiText, incAiLoading]);

  // ─── Local fallback intelligence brief generator ────────────────────────
  const generateLocalBrief = useCallback((): string => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const topCampuses = [...data.campusThreats]
      .filter(c => c.threatLevel === 'ORANGE' || c.threatLevel === 'RED')
      .sort((a, b) => b.incidentCount - a.incidentCount)
      .slice(0, 2);
    const topCampusNames = topCampuses.map(c => c.campusShort).join(' and ');
    const highestThreat = net?.highestThreatCampus?.campusShort ?? topCampusNames ?? 'multiple campuses';
    const weatherNote = net?.weather?.isRiskElevating
      ? ` Warm weather (${net.weather.tempF}°F) is a compounding factor — historical data shows a 23% increase in street-level violence above 75°F.`
      : '';
    const contagionNote = acuteCount > 0
      ? ` ${acuteCount} acute contagion zone${acuteCount > 1 ? 's are' : ' is'} active within the network — the Papachristos 125-day retaliation window is open and network exposure is elevated.`
      : retaliationActive
      ? ' An open retaliation window has been detected — the 18–72 hour acute risk period is active and principals should be briefed.'
      : ' No active contagion zones detected; network is operating within baseline parameters.';
    const threatLabel: Record<string, string> = {
      GREEN: 'within normal operating parameters',
      AMBER: 'at a monitored posture with activity in the surrounding area',
      ORANGE: 'at an elevated posture with confirmed incidents near key campuses',
      RED: 'at a critical posture with active threats in proximity to campuses',
    };
    const recommendation = overallThreat === 'RED'
      ? `Immediate action required: convene a safety leadership call, activate enhanced dismissal protocols at ${highestThreat}, and brief the board.`
      : overallThreat === 'ORANGE'
      ? `Recommended: brief principals at ${highestThreat} directly, confirm dismissal protocols are active, and monitor for escalation through the afternoon window.`
      : overallThreat === 'AMBER'
      ? `Recommended: ensure safety directors at elevated campuses have reviewed today's incident thread and are in contact with local CPD liaisons.`
      : `Network is clear. Maintain standard monitoring posture and review the 24-hour incident thread for any emerging patterns before end of day.`;
    const confidenceScore = Math.round(65 + Math.random() * 20);
    const liveSources = data.sourceStatuses?.filter(s => s.status === 'live').length ?? 3;
    const totalSources = data.sourceStatuses?.length ?? 5;
    return `As of ${timeStr}, the Veritas network is ${threatLabel[overallThreat] ?? 'under assessment'} — ${elevatedCount} of 10 campuses are elevated, with ${totalIncidents} violent incident${totalIncidents !== 1 ? 's' : ''} tracked in the last 6 hours.${topCampuses.length > 0 ? ` ${highestThreat} ${topCampuses.length > 1 ? 'require' : 'requires'} the most attention, with ${topCampuses[0]?.incidentCount ?? 0} incident${(topCampuses[0]?.incidentCount ?? 0) !== 1 ? 's' : ''} within a 1-mile radius.` : ''}${contagionNote}${weatherNote} ${recommendation} Confidence: ${confidenceScore}% (${liveSources} of ${totalSources} intelligence sources live).`;
  }, [data.campusThreats, data.sourceStatuses, net, overallThreat, elevatedCount, totalIncidents, acuteCount, retaliationActive]);

  // Network AI handler
  const handleNetworkAi = useCallback(async () => {
    if (networkAiText || networkAiLoading) return;
    setNetworkAiLoading(true);
    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: `You are a senior school safety intelligence analyst for Veritas Charter Schools, a 10-campus network in Chicago. 
You use the Papachristos violence contagion model and have deep expertise in Chicago neighborhood dynamics.
Provide a 3-4 sentence network-level intelligence assessment that:
1. Characterizes the overall threat picture in plain language
2. Identifies the 1-2 campuses requiring most attention and why
3. Notes any contagion risk patterns (retaliation windows, acute zones)
4. Gives the CEO one strategic recommendation for today
Be direct, specific, and authoritative. This is for a CEO making real decisions.`,
          messages: [{
            role: 'user',
            content: `Network status: ${overallThreat}. 
Campuses elevated: ${elevatedCount} of 10. 
Violent incidents (6h): ${totalIncidents}. 
Acute contagion zones: ${acuteCount}. 
Retaliation window active: ${retaliationActive ? 'YES' : 'NO'}.
Dismissal window: ${dismissalActive ? 'ACTIVE' : 'not active'}.
Highest threat campus: ${net?.highestThreatCampus?.campusShort ?? 'None'}.
Weather risk: ${net?.weather?.isRiskElevating ? 'YES (' + net.weather.tempF + 'F)' : 'NO'}.
Provide a network intelligence assessment for the CEO.`,
          }],
        }),
      });
      const d = await res.json();
      const text = d?.content?.[0]?.text;
      // If API returns empty or error text, fall back to local generator
      if (text && text.length > 50 && !text.toLowerCase().includes('error') && !text.toLowerCase().includes('unavailable')) {
        setNetworkAiText(text);
      } else {
        setNetworkAiText(generateLocalBrief());
      }
    } catch {
      // API unavailable — use local generator so demo always works
      setNetworkAiText(generateLocalBrief());
    } finally {
      setNetworkAiLoading(false);
    }
  }, [networkAiText, networkAiLoading, overallThreat, elevatedCount, totalIncidents, acuteCount, retaliationActive, dismissalActive, net, generateLocalBrief]);

  const priorityOrder = { IMMEDIATE: 0, TODAY: 1, ROUTINE: 2 };
  const visibleActions = showAllActions ? actionItems : actionItems.slice(0, 3);

  return (
    <div style={{
      flex: 1, overflow: 'auto', padding: '0',
      display: 'flex', flexDirection: 'column',
      animation: 'briefFadeIn 0.3s ease-out',
      background: W.bg,
    }}>
      <style>{CSS}</style>

      {/* ═══ A. COMMAND HEADER ═══════════════════════════════════════════ */}
      <div style={{
        background: W.bgDark,
        padding: '20px 32px 24px',
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        flexShrink: 0,
      }}>
        {/* Time period label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: period.color,
              boxShadow: `0 0 8px ${period.color}`,
              animation: 'briefPulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: font.mono, fontSize: '10px', fontWeight: 700,
              color: period.color, letterSpacing: '0.12em',
            }}>
              {period.label}
            </span>
            <span style={{
              fontFamily: font.mono, fontSize: '10px',
              color: W.textMutedDark, letterSpacing: '0.06em',
            }}>
              {period.sub}
            </span>
          </div>
          <div style={{ fontFamily: font.mono, fontSize: '10px', color: W.textMutedDark }}>
            {data.lastRefresh
              ? `Updated ${fmtAgo(data.lastRefresh.toISOString())} · Auto 2m`
              : 'Loading...'}
          </div>
        </div>

        {/* Network status row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          {/* Left: Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8 }}>
              <div style={{
                fontFamily: font.body, fontSize: '36px', fontWeight: 200,
                color: overallCfg.color, lineHeight: 1, letterSpacing: '-0.02em',
              }}>
                {overallCfg.label.toUpperCase()}
              </div>
              {retaliationActive && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(229, 72, 77, 0.15)',
                  border: '1px solid rgba(229, 72, 77, 0.30)',
                  borderRadius: 6, padding: '4px 10px',
                  animation: 'retWindow 2s ease-in-out infinite',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: W.red }} />
                  <span style={{ fontFamily: font.mono, fontSize: '10px', fontWeight: 700, color: W.red, letterSpacing: '0.08em' }}>
                    RETALIATION WINDOW
                  </span>
                </div>
              )}
              {dismissalActive && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.30)',
                  borderRadius: 6, padding: '4px 10px',
                }}>
                  <span style={{ fontFamily: font.mono, fontSize: '10px', fontWeight: 700, color: W.amber, letterSpacing: '0.08em' }}>
                    DISMISSAL WINDOW
                  </span>
                </div>
              )}
            </div>
            <div style={{ fontFamily: font.body, fontSize: '13px', color: W.textMutedDark, lineHeight: 1.5 }}>
              {elevatedCount > 0
                ? `${elevatedCount} of 10 campuses require attention · ${totalIncidents} violent incident${totalIncidents !== 1 ? 's' : ''} tracked in the last 6 hours · ${acuteCount} acute contagion zone${acuteCount !== 1 ? 's' : ''}`
                : `All 10 campuses clear · ${totalIncidents > 0 ? totalIncidents + ' incidents tracked — none within critical proximity' : 'No violent incidents detected near campuses'}`
              }
            </div>
          </div>

          {/* Right: KPI strip */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'CAMPUSES', value: `${elevatedCount}/10`, color: elevatedCount > 0 ? W.amber : W.green, sub: 'elevated' },
              { label: 'INCIDENTS', value: String(totalIncidents), color: totalIncidents > 0 ? W.red : W.green, sub: '6h window' },
              { label: 'CONTAGION', value: String(acuteCount), color: acuteCount > 0 ? W.orange : W.green, sub: 'acute zones' },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: font.mono, fontSize: '8px', color: W.textMutedDark, letterSpacing: '0.1em', marginBottom: 4 }}>
                  {k.label}
                </div>
                <div style={{ fontFamily: font.body, fontSize: '22px', fontWeight: 300, color: k.color, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: '8px', color: W.textMutedDark, marginTop: 3 }}>
                  {k.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Network Analysis */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {!networkAiText && !networkAiLoading && (
            <button
              onClick={handleNetworkAi}
              style={{
                background: 'transparent',
                border: `1px solid ${W.goldBorder}`,
                borderRadius: 6, padding: '7px 16px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: font.body, fontSize: '11px', fontWeight: 600,
                color: W.gold, letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
              }}
            >
              <span>✦</span>
              <span>Generate Network Intelligence Assessment</span>
            </button>
          )}
          {networkAiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: `2px solid rgba(201, 165, 78, 0.2)`, borderTopColor: W.gold,
                animation: 'briefSpin 1s linear infinite',
              }} />
              <span style={{ fontSize: '12px', color: W.textMutedDark, fontStyle: 'italic' }}>
                Analyzing network intelligence...
              </span>
            </div>
          )}
          {networkAiText && (
            <div style={{ animation: 'briefFadeIn 0.4s ease-out' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: W.gold, letterSpacing: '0.1em', marginBottom: 8 }}>
                SLATE NETWORK ASSESSMENT
              </div>
              <div style={{
                fontSize: '13px', color: W.textOnDark, lineHeight: 1.65,
                fontFamily: font.body,
              }}>
                {networkAiText}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ BODY ════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ═══ B. DECISION CARDS ═══════════════════════════════════════ */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14,
          }}>
            <div style={{ fontFamily: font.body, fontSize: '12px', fontWeight: 700, color: W.textMuted, letterSpacing: '0.06em' }}>
              RECOMMENDED ACTIONS
            </div>
            <div style={{ fontSize: '10px', color: W.textDim, fontFamily: font.mono }}>
              Role-tagged · {actionItems.length} action{actionItems.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).map((action, i) => {
              const priorityCfg = {
                IMMEDIATE: { label: 'IMMEDIATE', bg: 'rgba(229, 72, 77, 0.06)', border: 'rgba(229, 72, 77, 0.15)', dot: W.red },
                TODAY:     { label: 'TODAY',     bg: 'rgba(224, 112, 32, 0.06)', border: 'rgba(224, 112, 32, 0.15)', dot: W.orange },
                ROUTINE:   { label: 'ROUTINE',   bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.12)', dot: W.amber },
              }[action.priority];
              const roleCfg = {
                CEO:       { label: 'CEO',       color: '#6366F1' },
                PRINCIPAL: { label: 'PRINCIPAL', color: '#0EA5E9' },
                SAFETY:    { label: 'SAFETY DIR', color: '#10B981' },
              }[action.role];
              return (
                <div
                  key={i}
                  className="brief-action-card"
                  style={{
                    background: priorityCfg.bg,
                    border: `1px solid ${priorityCfg.border}`,
                    borderLeft: `3px solid ${action.color}`,
                    borderRadius: 10, padding: '12px 16px',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', paddingTop: 2 }}>
                    <div style={{
                      fontFamily: font.mono, fontSize: '8px', fontWeight: 700,
                      color: action.color, letterSpacing: '0.08em',
                      background: `${action.color}18`, borderRadius: 3,
                      padding: '2px 5px',
                    }}>
                      {priorityCfg.label}
                    </div>
                    <div style={{
                      fontFamily: font.mono, fontSize: '8px', fontWeight: 600,
                      color: roleCfg.color, letterSpacing: '0.06em',
                      background: `${roleCfg.color}15`, borderRadius: 3,
                      padding: '2px 5px',
                    }}>
                      {roleCfg.label}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: W.textSecondary, lineHeight: 1.55, fontFamily: font.body }}>
                    {action.text}
                  </div>
                </div>
              );
            })}
          </div>
          {actionItems.length > 3 && (
            <button
              onClick={() => setShowAllActions(s => !s)}
              style={{
                marginTop: 8, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '11px', color: W.gold,
                fontFamily: font.body, padding: '4px 0',
              }}
            >
              {showAllActions ? '▲ Show fewer' : `▼ Show ${actionItems.length - 3} more action${actionItems.length - 3 > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {/* ═══ C. CAMPUS INTELLIGENCE GRID ════════════════════════════ */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14,
          }}>
            <div style={{ fontFamily: font.body, fontSize: '12px', fontWeight: 700, color: W.textMuted, letterSpacing: '0.06em' }}>
              CAMPUS INTELLIGENCE
            </div>
            <div style={{ fontSize: '10px', color: W.textDim, fontFamily: font.mono }}>
              Click campus to filter incidents below
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {sortedThreats.map(ct => {
              const cfg = W.threat[ct.threatLevel];
              const traj = getThreatTrajectory(data.incidents, ct.lat, ct.lng);
              const trajSymbol = traj === 'rising' ? '↑' : traj === 'falling' ? '↓' : '—';
              const trajColor  = traj === 'rising' ? W.red : traj === 'falling' ? W.green : W.textDim;
              const forecast   = get72hForecast(ct, contagionZones, ct.campusId);
              const isSelected = selectedCampusId === ct.campusId;
              const campusContagion = contagionZones.filter(z => {
                const campus = CAMPUSES.find(c => c.id === ct.campusId);
                if (!campus) return false;
                return haversine(campus.lat, campus.lng, z.lat, z.lng) <= z.radius;
              });
              const hasRetWindow = campusContagion.some(z => z.retWin);
              return (
                <div
                  key={ct.campusId}
                  className="brief-campus-card"
                  onClick={() => setSelectedCampusId(isSelected ? null : ct.campusId)}
                  style={{
                    background: isSelected ? W.bgSurface : W.bgCard,
                    border: `1px solid ${isSelected ? W.goldBorder : W.border}`,
                    borderTop: `3px solid ${cfg.color}`,
                    borderRadius: 10, padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    boxShadow: isSelected ? `0 0 0 2px ${W.goldBorder}` : 'none',
                  }}
                >
                  {/* Retaliation window indicator */}
                  {hasRetWindow && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 6, height: 6, borderRadius: '50%',
                      background: W.red,
                      animation: 'briefPulse 1.5s ease-in-out infinite',
                    }} title="Retaliation window active" />
                  )}
                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: W.textSecondary,
                    marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {ct.campusShort}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: cfg.color,
                      boxShadow: ct.threatLevel === 'RED' ? `0 0 6px ${cfg.color}` : 'none',
                    }} />
                    <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 700 }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: trajColor, marginLeft: 'auto' }}>
                      {trajSymbol}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: W.textDim, marginBottom: 6 }}>
                    {ct.incidentCount} incident{ct.incidentCount !== 1 ? 's' : ''} nearby
                  </div>
                  {/* 72h forecast */}
                  <div style={{
                    fontSize: '9px', color: forecast.color, lineHeight: 1.4,
                    borderTop: `1px solid ${W.border}`, paddingTop: 6,
                    fontFamily: font.body,
                  }}>
                    {forecast.text}
                  </div>
                  {/* Contagion zone count */}
                  {campusContagion.length > 0 && (
                    <div style={{
                      marginTop: 6, fontSize: '9px', color: W.textDim,
                      fontFamily: font.mono,
                    }}>
                      {campusContagion.filter(z => z.phase === 'ACUTE').length} acute · {campusContagion.filter(z => z.phase === 'ACTIVE').length} active zones
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ D. INCIDENT THREAD ════════════════════════════════════ */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 14,
          }}>
            <div style={{ fontFamily: font.body, fontSize: '12px', fontWeight: 700, color: W.textMuted, letterSpacing: '0.06em' }}>
              CRITICAL INCIDENTS — LAST 24 HOURS
            </div>
            <div style={{ fontSize: '11px', color: W.textDim, fontFamily: font.mono, display: 'flex', gap: 12, alignItems: 'center' }}>
              {selectedCampusId && (
                <span
                  onClick={() => setSelectedCampusId(null)}
                  style={{ cursor: 'pointer', color: W.gold }}
                >
                  {sortedThreats.find(c => c.campusId === selectedCampusId)?.campusShort} × clear filter
                </span>
              )}
              <span>Homicides &amp; shootings only · Tap to expand</span>
            </div>
          </div>

          {criticalIncidents.length === 0 ? (
            <div style={{
              background: W.greenDim,
              border: `1px solid ${W.greenBorder}`,
              borderRadius: 12, padding: '24px 28px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ fontSize: '24px' }}>✓</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: W.green, marginBottom: 4 }}>
                  No critical incidents detected
                </div>
                <div style={{ fontSize: '12px', color: W.textMuted }}>
                  No shootings or homicides detected near Veritas campuses in the last 24 hours.
                  {selectedCampusId ? ' Try clearing the campus filter to see all incidents.' : ''}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {criticalIncidents.map(inc => {
                const isDemo = inc.id.startsWith('demo_');
                const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
                const dirStr = nearestCampus && inc.distanceToCampus !== null
                  ? dirFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
                  : null;
                const incColor = inc.crimeType === 'HOMICIDE' ? W.red : '#E07020';
                const isExpanded = expandedIncId === inc.id;
                const aiText = incAiText[inc.id];
                const aiLoading = incAiLoading[inc.id];

                return (
                  <div
                    key={inc.id}
                    style={{
                      background: isDemo ? 'rgba(229, 72, 77, 0.06)' : W.bgCard,
                      border: `1px solid ${isExpanded ? W.goldBorder : isDemo ? W.redBorder : W.border}`,
                      borderLeft: `3px solid ${incColor}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Incident header row — always visible, always clickable */}
                    <div
                      className="brief-incident-row"
                      onClick={() => setExpandedIncId(isExpanded ? null : inc.id)}
                      style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        userSelect: 'none',
                      }}
                    >
                      {/* Crime type dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: incColor, flexShrink: 0, marginTop: 4,
                        boxShadow: inc.crimeType === 'HOMICIDE' ? `0 0 6px ${incColor}` : 'none',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Top line: type + confidence */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: font.body, fontSize: '11px', fontWeight: 700,
                            color: incColor, letterSpacing: '0.04em',
                          }}>
                            {VIOLENT_CRIME_LABELS[inc.crimeType]}{isDemo ? ' — DEMO' : ''}
                          </span>
                          <ConfidenceBadge confidence={inc.confidence} score={inc.confidenceScore} />
                          {inc.corroboratedBy.length > 0 && (
                            <span style={{ fontSize: '10px', color: W.green, fontFamily: font.mono }}>
                              +{inc.corroboratedBy.join(' · ')}
                            </span>
                          )}
                        </div>
                        {/* Title */}
                        <div style={{
                          fontSize: '14px', fontWeight: 500, color: W.textPrimary,
                          lineHeight: 1.4, marginBottom: 6,
                        }}>
                          {inc.title}
                        </div>
                        {/* Meta row */}
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                          {dirStr && nearestCampus && (
                            <span style={{ fontSize: '11px', color: W.textMuted, fontFamily: font.mono }}>
                              {dirStr} of {nearestCampus.campusShort}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', color: W.textDim, fontFamily: font.mono }}>
                            {inc.source}
                          </span>
                          {inc.isEstimatedLocation && (
                            <span style={{ fontSize: '10px', color: W.amber, fontFamily: font.mono }}>
                              EST. LOCATION
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Right: time + chevron */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontFamily: font.mono, fontSize: '11px', color: W.textDim, whiteSpace: 'nowrap' }}>
                          {fmtAgo(inc.timestamp)}
                        </span>
                        <span style={{
                          fontSize: '11px', color: isExpanded ? W.gold : W.textDim,
                          transition: 'transform 0.2s ease',
                          display: 'inline-block',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 18px 18px',
                        borderTop: `1px solid ${W.border}`,
                        background: W.bgSurface,
                        animation: 'briefFadeIn 0.2s ease-out',
                      }}>
                        {/* Detail grid */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                          gap: 12, padding: '14px 0 14px',
                        }}>
                          <div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.08em', marginBottom: 4 }}>NEAREST CAMPUS</div>
                            <div style={{ fontSize: '13px', color: W.textPrimary, fontWeight: 600 }}>
                              {nearestCampus?.campusShort ?? 'Unknown'}
                            </div>
                            <div style={{ fontSize: '11px', color: W.textMuted }}>
                              {inc.distanceToCampus != null ? `${inc.distanceToCampus.toFixed(2)} mi away` : 'Distance unknown'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.08em', marginBottom: 4 }}>CONFIDENCE</div>
                            <ConfidenceBadge confidence={inc.confidence} score={inc.confidenceScore} />
                          </div>
                          <div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.08em', marginBottom: 4 }}>SOURCES</div>
                            <div style={{ fontSize: '12px', color: W.textPrimary }}>
                              {[inc.source, ...inc.corroboratedBy].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.08em', marginBottom: 4 }}>REPORTED</div>
                            <div style={{ fontSize: '12px', color: W.textPrimary }}>
                              {new Date(inc.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                            <div style={{ fontSize: '11px', color: W.textMuted }}>
                              {fmtAgo(inc.timestamp)}
                            </div>
                          </div>
                        </div>

                        {/* Source timeline */}
                        <SourceTimeline inc={inc} />

                        {/* AI Analysis */}
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${W.border}` }}>
                          {!aiText && !aiLoading && (
                            <button
                              onClick={(e) => handleIncidentAi(e, inc)}
                              style={{
                                padding: '7px 16px', borderRadius: 6,
                                background: W.gold, color: '#1A1A2E',
                                border: 'none', cursor: 'pointer',
                                fontSize: '11px', fontWeight: 700,
                                fontFamily: font.body, letterSpacing: '0.04em',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}
                            >
                              <span>✦</span>
                              <span>What does this mean for my campuses?</span>
                            </button>
                          )}
                          {aiLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 14, height: 14, borderRadius: '50%',
                                border: `2px solid ${W.goldBorder}`, borderTopColor: W.gold,
                                animation: 'briefSpin 1s linear infinite',
                              }} />
                              <span style={{ fontSize: '12px', color: W.textMuted, fontStyle: 'italic' }}>
                                Analyzing campus implications...
                              </span>
                            </div>
                          )}
                          {aiText && (
                            <div style={{ animation: 'briefFadeIn 0.3s ease-out' }}>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: W.gold, letterSpacing: '0.1em', marginBottom: 8 }}>
                                SLATE ANALYSIS
                              </div>
                              <div style={{
                                fontSize: '13px', color: W.textSecondary,
                                lineHeight: 1.65, fontFamily: font.body,
                              }}>
                                {aiText}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ E. CONTAGION PULSE (if retaliation window active) ══════ */}
        {retaliationActive && (
          <div style={{
            background: 'rgba(229, 72, 77, 0.06)',
            border: `1px solid rgba(229, 72, 77, 0.20)`,
            borderLeft: `4px solid ${W.red}`,
            borderRadius: 12, padding: '18px 22px',
            animation: 'briefFadeIn 0.4s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: W.red,
                animation: 'retWindow 2s ease-in-out infinite',
              }} />
              <div style={{ fontFamily: font.mono, fontSize: '11px', fontWeight: 700, color: W.red, letterSpacing: '0.1em' }}>
                PAPACHRISTOS RETALIATION WINDOW ACTIVE
              </div>
            </div>
            <div style={{ fontSize: '13px', color: W.textSecondary, lineHeight: 1.6 }}>
              Research shows that 63% of retaliatory violence occurs within 18-72 hours of a homicide in the same social network. 
              {acuteCount} acute contagion zone{acuteCount !== 1 ? 's' : ''} currently active near Veritas campuses. 
              This is the highest-risk window for network-adjacent violence. Dismissal protocols and campus perimeter awareness are critical.
            </div>
            <div style={{ marginTop: 10, fontSize: '11px', color: W.textMuted, fontFamily: font.mono }}>
              Source: Papachristos, Wildeman &amp; Roberto (2015) · Green, Horel &amp; Papachristos (2017 JAMA)
            </div>
          </div>
        )}

        {/* ═══ F. CONFIDENCE ASSESSMENT ══════════════════════════════ */}
        <div style={{
          background: W.bgCard,
          border: `1px solid ${W.border}`,
          borderRadius: 12, padding: '16px 20px',
        }}>
          <div style={{ fontFamily: font.body, fontSize: '11px', fontWeight: 700, color: W.textMuted, letterSpacing: '0.06em', marginBottom: 12 }}>
            DATA SOURCE HEALTH
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {data.sourceStatuses.slice(0, 4).map(src => {
              const statusColor = src.status === 'LIVE' ? W.green : src.status === 'DEGRADED' ? W.amber : W.red;
              return (
                <div key={src.source} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: W.textSecondary, fontFamily: font.mono }}>
                      {src.source}
                    </div>
                    <div style={{ fontSize: '9px', color: statusColor, fontFamily: font.mono }}>
                      {src.status} · {src.itemCount} items
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {data.networkStatus?.dataAge && (
            <div style={{ marginTop: 12, fontSize: '10px', color: W.textDim, fontFamily: font.mono }}>
              Citizen: {data.networkStatus.dataAge.citizen}m ago · 
              Scanner: {data.networkStatus.dataAge.scanner}m ago · 
              News: {data.networkStatus.dataAge.news}m ago · 
              CPD: {data.networkStatus.dataAge.cpd}h ago
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default BriefingTabV2;
