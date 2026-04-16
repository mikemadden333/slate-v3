/**
 * SituationRoom — The Watch Opening Statement
 * ═══════════════════════════════════════════════════════════════════════════
 * The first thing a CEO sees when they open Watch.
 *
 * Design philosophy: CIA morning brief meets Bloomberg terminal.
 * One paragraph. The entire story. In 8 seconds.
 *
 * "As of 10:47 AM Tuesday, the Veritas network is operating under elevated
 *  threat conditions. Three campuses in the South Side corridor are within
 *  active contagion zones following a homicide at 63rd and Halsted 14 hours
 *  ago. The retaliation window closes Thursday at 8 AM. Two actions are
 *  required before dismissal."
 *
 * Features:
 *   - Auto-generated situation statement (no button required — fires on mount)
 *   - Live pulse heartbeat with data source indicators
 *   - Dismissal countdown (visible 1:30 PM to 3:15 PM)
 *   - CEO One-Pager share button
 *   - Contextual explainer tooltips on every key term
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { WatchDataState } from '../v2/useWatchData';
import type { ContagionZone } from '../engine/types';
import { haversine } from '../engine/geo';

// ─── Design Tokens (Watch dark header aesthetic) ──────────────────────────
const W = {
  bgDark:        '#0F1728',
  bgDarkCard:    '#1A2540',
  bgDarkSurface: '#141E30',
  textOnDark:    '#E8EDF5',
  textMutedDark: '#8899AA',
  textDimDark:   '#5A6A7E',
  gold:          '#C9A54E',
  goldDim:       'rgba(201, 165, 78, 0.12)',
  goldBorder:    'rgba(201, 165, 78, 0.20)',
  red:           '#E5484D',
  redDim:        'rgba(229, 72, 77, 0.15)',
  orange:        '#E07020',
  amber:         '#F59E0B',
  green:         '#17B26A',
  greenDim:      'rgba(23, 178, 106, 0.15)',
  border:        'rgba(255,255,255,0.06)',
  borderMd:      'rgba(255,255,255,0.10)',
} as const;

const FONT_BODY = "'Inter', 'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";

// ─── Helpers ──────────────────────────────────────────────────────────────

function isDismissalWindow(): boolean {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  return totalMin >= 90 && totalMin <= 195; // 1:30 PM to 3:15 PM
}

function getDismissalCountdown(): { minutes: number; seconds: number; pct: number } {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  // Dismissal window: 90 min to 195 min (1:30 PM to 3:15 PM)
  // Peak dismissal: 150 min (2:30 PM)
  const peakMin = 150;
  const distToPeak = Math.abs(totalMin - peakMin);
  const minutesLeft = Math.max(0, peakMin - totalMin);
  const seconds = now.getSeconds();
  const pct = Math.max(0, Math.min(100, (1 - minutesLeft / 60) * 100));
  return { minutes: minutesLeft, seconds, pct };
}

function getOverallThreat(data: WatchDataState): 'RED' | 'ORANGE' | 'AMBER' | 'GREEN' {
  const threats = data.campusThreats.map(c => c.threatLevel);
  if (threats.includes('RED')) return 'RED';
  if (threats.includes('ORANGE')) return 'ORANGE';
  if (threats.includes('AMBER')) return 'AMBER';
  return 'GREEN';
}

function buildSituationStatement(data: WatchDataState, zones: ContagionZone[]): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });

  const redCampuses = data.campusThreats.filter(c => c.threatLevel === 'RED');
  const orangeCampuses = data.campusThreats.filter(c => c.threatLevel === 'ORANGE');
  const elevatedCampuses = data.campusThreats.filter(c => c.threatLevel !== 'GREEN');
  const acuteZones = zones.filter(z => z.phase === 'ACUTE');
  const activeZones = zones.filter(z => z.phase === 'ACTIVE');
  const retWindows = zones.filter(z => z.retWin);
  const totalIncidents = data.incidents.filter(i => i.ageMinutes <= 360).length;
  const dismissal = isDismissalWindow();

  // Build the statement paragraph by paragraph
  const parts: string[] = [];

  // Opening: time and overall status
  const overallThreat = getOverallThreat(data);
  const statusMap = {
    RED: 'critical threat conditions',
    ORANGE: 'elevated threat conditions',
    AMBER: 'monitoring conditions',
    GREEN: 'normal operating conditions',
  };
  parts.push(`As of ${timeStr} ${dayStr}, the Veritas network is operating under ${statusMap[overallThreat]}.`);

  // Campus specifics
  if (redCampuses.length > 0) {
    const names = redCampuses.map(c => c.campusShort).join(' and ');
    const nearest = redCampuses[0].nearestIncident;
    const dist = redCampuses[0].nearestDistance;
    if (nearest && dist !== null) {
      const ageH = Math.round(nearest.ageMinutes / 60);
      const ageStr = ageH < 1 ? 'less than an hour ago' : ageH === 1 ? '1 hour ago' : `${ageH} hours ago`;
      parts.push(`${names} ${redCampuses.length === 1 ? 'is' : 'are'} at RED status — a ${nearest.crimeType.toLowerCase()} was reported ${dist.toFixed(2)} miles away ${ageStr}.`);
    } else {
      parts.push(`${names} ${redCampuses.length === 1 ? 'is' : 'are'} at RED status with active threats in the immediate vicinity.`);
    }
  } else if (orangeCampuses.length > 0) {
    const names = orangeCampuses.slice(0, 2).map(c => c.campusShort).join(' and ');
    parts.push(`${names} ${orangeCampuses.length === 1 ? 'is' : 'are'} at ELEVATED status with confirmed incidents within a half-mile radius.`);
  }

  // Contagion context
  if (acuteZones.length > 0) {
    const retStr = retWindows.length > 0
      ? ` The retaliation window is active — the 18 to 72 hour period of highest follow-on violence risk.`
      : '';
    parts.push(`${acuteZones.length} contagion zone${acuteZones.length !== 1 ? 's are' : ' is'} in the ACUTE phase, meaning a homicide occurred within the last 72 hours within proximity of the network.${retStr}`);
  } else if (activeZones.length > 0) {
    parts.push(`${activeZones.length} contagion zone${activeZones.length !== 1 ? 's are' : ' is'} in the ACTIVE phase — homicides from the past two weeks whose violence risk has not yet fully decayed.`);
  } else if (zones.length === 0) {
    parts.push('No active contagion zones are present. The network is operating in a clear threat environment.');
  }

  // Dismissal urgency
  if (dismissal) {
    const countdown = getDismissalCountdown();
    if (countdown.minutes > 0) {
      parts.push(`Dismissal is ${countdown.minutes} minutes away. This is the highest-exposure window of the school day — all exterior security positions should be confirmed now.`);
    } else {
      parts.push('Dismissal is underway. This is the highest-exposure window of the school day. All exterior security positions should be active.');
    }
  }

  // Closing action count
  const actionCount = (redCampuses.length > 0 ? 2 : 0) + (retWindows.length > 0 ? 1 : 0) + (dismissal ? 1 : 0);
  if (actionCount > 0) {
    parts.push(`${actionCount} action${actionCount !== 1 ? 's require' : ' requires'} your attention before end of day. See the Decision Engine below.`);
  } else if (elevatedCampuses.length === 0) {
    parts.push('No immediate actions are required. Continue standard monitoring protocols.');
  }

  return parts.join(' ');
}

// ─── Tooltip ──────────────────────────────────────────────────────────────

function Tooltip({ term, explanation }: { term: string; explanation: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          borderBottom: `1px dotted ${W.gold}`,
          color: W.gold,
          cursor: 'help',
          fontFamily: FONT_BODY,
        }}
      >
        {term}
      </span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: 'translateX(-50%)',
          background: '#0A1020',
          border: `1px solid ${W.goldBorder}`,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 11,
          color: W.textOnDark,
          lineHeight: 1.5,
          whiteSpace: 'normal',
          width: 220,
          zIndex: 1000,
          marginBottom: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {explanation}
        </span>
      )}
    </span>
  );
}

// ─── Live Pulse Indicator ─────────────────────────────────────────────────

function LivePulse({ sources, isRefreshing, lastRefresh }: {
  sources: string[];
  isRefreshing: boolean;
  lastRefresh: Date | null;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secAgo = lastRefresh ? Math.round((Date.now() - lastRefresh.getTime()) / 1000) : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 14px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 20,
      border: `1px solid ${W.border}`,
    }}>
      {/* Heartbeat dot */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isRefreshing ? W.amber : W.green,
        boxShadow: `0 0 ${isRefreshing ? '8px' : '6px'} ${isRefreshing ? W.amber : W.green}`,
        animation: 'srPulse 1.8s ease-in-out infinite',
        flexShrink: 0,
      }} />
      {/* Source pills */}
      <div style={{ display: 'flex', gap: 4 }}>
        {sources.map((s, i) => (
          <span key={i} style={{
            fontSize: 9, fontFamily: FONT_MONO, fontWeight: 600,
            color: W.textDimDark, letterSpacing: '0.06em',
            padding: '1px 5px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 3,
          }}>
            {s}
          </span>
        ))}
      </div>
      {/* Time */}
      <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: W.textDimDark }}>
        {secAgo !== null ? (secAgo < 60 ? `${secAgo}s ago` : `${Math.round(secAgo / 60)}m ago`) : 'Live'}
      </span>
    </div>
  );
}

// ─── Dismissal Countdown Banner ───────────────────────────────────────────

function DismissalBanner({ data, zones }: { data: WatchDataState; zones: ContagionZone[] }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalMin = time.getHours() * 60 + time.getMinutes();
  const inWindow = totalMin >= 90 && totalMin <= 195;
  const approaching = totalMin >= 75 && totalMin < 90; // 30 min warning

  if (!inWindow && !approaching) return null;

  const peakMin = 150; // 2:30 PM
  const minutesToPeak = Math.max(0, peakMin - totalMin);
  const secondsLeft = 60 - time.getSeconds();

  // Find highest-risk campus for dismissal
  const riskyCampuses = data.campusThreats
    .filter(c => c.threatLevel === 'RED' || c.threatLevel === 'ORANGE')
    .map(c => c.campusShort);

  const acuteNearby = zones.filter(z => z.phase === 'ACUTE' || z.retWin);
  const retActive = zones.some(z => z.retWin);

  let recommendation = 'Standard dismissal protocols in effect.';
  if (retActive && riskyCampuses.length > 0) {
    recommendation = `Enhanced security required at ${riskyCampuses.slice(0, 2).join(' and ')} — retaliation window is active. Add exterior staff now.`;
  } else if (riskyCampuses.length > 0) {
    recommendation = `${riskyCampuses.slice(0, 2).join(' and ')} ${riskyCampuses.length === 1 ? 'requires' : 'require'} additional exterior coverage at dismissal.`;
  } else if (acuteNearby.length > 0) {
    recommendation = `${acuteNearby.length} acute contagion zone${acuteNearby.length !== 1 ? 's are' : ' is'} active near the network. Confirm all exterior staff positions.`;
  }

  const isUrgent = riskyCampuses.length > 0 || retActive;
  const accentColor = isUrgent ? W.red : W.amber;

  return (
    <div style={{
      background: isUrgent
        ? 'linear-gradient(135deg, rgba(229,72,77,0.15) 0%, rgba(15,23,40,0.95) 60%)'
        : 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(15,23,40,0.95) 60%)',
      borderBottom: `1px solid ${isUrgent ? W.redDim : 'rgba(245,158,11,0.15)'}`,
      padding: '10px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Countdown clock */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          minWidth: 52,
        }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700,
            color: accentColor, lineHeight: 1,
            animation: minutesToPeak <= 5 ? 'srBlink 1s ease-in-out infinite' : 'none',
          }}>
            {approaching ? `${peakMin - totalMin}m` : minutesToPeak === 0 ? 'NOW' : `${minutesToPeak}m`}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: W.textDimDark, letterSpacing: '0.08em', marginTop: 2 }}>
            {approaching ? 'TO DISMISSAL' : minutesToPeak === 0 ? 'DISMISSAL' : 'TO PEAK'}
          </div>
        </div>
        {/* Divider */}
        <div style={{ width: 1, height: 32, background: W.border }} />
        {/* Label + recommendation */}
        <div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            color: accentColor, letterSpacing: '0.12em', marginBottom: 3,
          }}>
            {approaching ? 'DISMISSAL APPROACHING' : isUrgent ? 'DISMISSAL WINDOW — ELEVATED RISK' : 'DISMISSAL WINDOW ACTIVE'}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: W.textOnDark, lineHeight: 1.4 }}>
            {recommendation}
          </div>
        </div>
      </div>
      {/* Progress arc */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: W.textDimDark }}>
          {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: accentColor,
          animation: 'srPulse 1s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

// ─── CEO One-Pager ────────────────────────────────────────────────────────

function CEOOnePager({ data, zones, situationText }: {
  data: WatchDataState;
  zones: ContagionZone[];
  situationText: string;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateText = useCallback(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const redCampuses = data.campusThreats.filter(c => c.threatLevel === 'RED').map(c => c.campusShort);
    const orangeCampuses = data.campusThreats.filter(c => c.threatLevel === 'ORANGE').map(c => c.campusShort);
    const clearCampuses = data.campusThreats.filter(c => c.threatLevel === 'GREEN').map(c => c.campusShort);
    const acuteZones = zones.filter(z => z.phase === 'ACUTE').length;
    const retActive = zones.some(z => z.retWin);
    const totalInc = data.incidents.filter(i => i.ageMinutes <= 360).length;

    return `SLATE WATCH — NETWORK INTELLIGENCE BRIEF
${dateStr} · ${timeStr} CDT
Veritas Charter Schools · 10 Campuses · Chicago

SITUATION
${situationText}

CAMPUS STATUS
${redCampuses.length > 0 ? `RED ALERT: ${redCampuses.join(', ')}` : ''}
${orangeCampuses.length > 0 ? `ELEVATED: ${orangeCampuses.join(', ')}` : ''}
${clearCampuses.length > 0 ? `CLEAR: ${clearCampuses.join(', ')}` : ''}

CONTAGION INTELLIGENCE
Active zones: ${zones.length} total (${acuteZones} acute, ${zones.filter(z => z.phase === 'ACTIVE').length} active, ${zones.filter(z => z.phase === 'WATCH').length} watch)
Retaliation window: ${retActive ? 'ACTIVE — 18-72h elevated risk period' : 'Not active'}
Incidents tracked (6h): ${totalInc}

DATA SOURCES
Citizen App · CPD Scanner · CPD Socrata · News RSS · Weather API
Confidence model: Papachristos et al. (JAMA 2017) · 125-day decay window

Generated by Slate Intelligence Platform
Madden Education Advisory, LLC · Proprietary & Confidential`;
  }, [data, zones, situationText]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generateText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generateText]);

  return (
    <>
      <button
        onClick={() => setShow(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: W.goldDim,
          border: `1px solid ${W.goldBorder}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
          color: W.gold, letterSpacing: '0.06em',
          transition: 'all 0.15s ease',
        }}
      >
        <span>↗</span>
        <span>SHARE BRIEF</span>
      </button>

      {show && (
        <div
          onClick={() => setShow(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0F1728',
              border: `1px solid ${W.borderMd}`,
              borderRadius: 16,
              padding: '28px 32px',
              maxWidth: 600, width: '90%',
              maxHeight: '80vh', overflowY: 'auto',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: W.gold, letterSpacing: '0.1em' }}>
                CEO ONE-PAGER
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    background: copied ? W.greenDim : W.goldDim,
                    border: `1px solid ${copied ? W.green : W.goldBorder}`,
                    color: copied ? W.green : W.gold,
                    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', letterSpacing: '0.06em',
                  }}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
                <button
                  onClick={() => setShow(false)}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    background: 'transparent', border: `1px solid ${W.border}`,
                    color: W.textMutedDark, fontFamily: FONT_MONO, fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
            <pre style={{
              fontFamily: FONT_MONO, fontSize: 11, color: W.textOnDark,
              lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0,
            }}>
              {generateText()}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main SituationRoom Component ─────────────────────────────────────────

interface SituationRoomProps {
  data: WatchDataState;
  contagionZones: ContagionZone[];
  isRefreshing: boolean;
}

const SITUATION_CSS = `
@keyframes srPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}
@keyframes srBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
@keyframes srFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes srTypewriter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes srScan {
  0%   { transform: translateY(-100%); opacity: 0.6; }
  100% { transform: translateY(100%); opacity: 0; }
}
`;

export function SituationRoom({ data, contagionZones, isRefreshing }: SituationRoomProps) {
  const [situationText, setSituationText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [showDismissal, setShowDismissal] = useState(isDismissalWindow() || (new Date().getHours() * 60 + new Date().getMinutes() >= 75 && new Date().getHours() * 60 + new Date().getMinutes() < 90));
  const hasGenerated = useRef(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-generate on mount when data is ready
  useEffect(() => {
    if (hasGenerated.current || data.isLoading || data.campusThreats.length === 0) return;
    hasGenerated.current = true;
    generateSituation();
  }, [data.isLoading, data.campusThreats.length]);

  // Check dismissal window every minute
  useEffect(() => {
    const id = setInterval(() => {
      const totalMin = new Date().getHours() * 60 + new Date().getMinutes();
      setShowDismissal(totalMin >= 75 && totalMin <= 195);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!situationText) return;
    setDisplayedText('');
    setCharIndex(0);
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    let i = 0;
    typewriterRef.current = setInterval(() => {
      i++;
      setDisplayedText(situationText.slice(0, i));
      setCharIndex(i);
      if (i >= situationText.length) {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
      }
    }, 12); // 12ms per character = ~80 chars/sec
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current); };
  }, [situationText]);

  const generateSituation = useCallback(async () => {
    setIsGenerating(true);
    // Build the statement from data
    const statement = buildSituationStatement(data, contagionZones);
    // Try AI enhancement, fall back to data-driven statement
    try {
      const redCampuses = data.campusThreats.filter(c => c.threatLevel === 'RED');
      const orangeCampuses = data.campusThreats.filter(c => c.threatLevel === 'ORANGE');
      const acuteZones = contagionZones.filter(z => z.phase === 'ACUTE');
      const retWindows = contagionZones.filter(z => z.retWin);
      const totalInc = data.incidents.filter(i => i.ageMinutes <= 360).length;
      const dismissal = isDismissalWindow();

      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system: `You are the Slate Watch intelligence system for Veritas Charter Schools, a 10-campus network in Chicago. 
Write a single intelligence briefing paragraph (3-5 sentences, 60-100 words) that reads like a CIA morning brief.
Rules:
- Start with "As of [time] [day]," 
- State the overall network threat level in plain language
- Name specific campuses and distances if RED or ORANGE
- Mention contagion zones and retaliation windows if active
- End with a count of actions required if any
- Be direct, specific, authoritative. No hedging. No bullet points. No markdown.
- This is for a CEO making real decisions about 5,000 students.`,
          messages: [{
            role: 'user',
            content: `Time: ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
RED campuses: ${redCampuses.map(c => `${c.campusShort} (${c.nearestDistance?.toFixed(2) ?? '?'} mi)`).join(', ') || 'None'}
ORANGE campuses: ${orangeCampuses.map(c => c.campusShort).join(', ') || 'None'}
Acute contagion zones: ${acuteZones.length}
Retaliation window active: ${retWindows.length > 0 ? 'YES' : 'NO'}
Total incidents (6h): ${totalInc}
Dismissal window: ${dismissal ? 'ACTIVE' : 'Not active'}
Write the situation statement.`,
          }],
        }),
      });
      const d = await res.json();
      const aiText = d?.content?.[0]?.text?.trim();
      setSituationText(aiText || statement);
    } catch {
      setSituationText(statement);
    } finally {
      setIsGenerating(false);
    }
  }, [data, contagionZones]);

  const overallThreat = getOverallThreat(data);
  const threatConfig = {
    RED:    { color: W.red,    label: 'CRITICAL',  pulse: true },
    ORANGE: { color: W.orange, label: 'ELEVATED',  pulse: true },
    AMBER:  { color: W.amber,  label: 'MONITORING', pulse: false },
    GREEN:  { color: W.green,  label: 'CLEAR',     pulse: false },
  }[overallThreat];

  const sources = ['CITIZEN', 'SCANNER', 'CPD', 'NEWS', 'WEATHER'];
  const acuteCount = contagionZones.filter(z => z.phase === 'ACUTE').length;
  const retActive = contagionZones.some(z => z.retWin);

  return (
    <>
      <style>{SITUATION_CSS}</style>

      {/* ═══ DISMISSAL BANNER (conditional) ═══ */}
      {showDismissal && <DismissalBanner data={data} zones={contagionZones} />}

      {/* ═══ SITUATION ROOM HEADER ═══ */}
      <div style={{
        background: `linear-gradient(180deg, ${W.bgDark} 0%, ${W.bgDarkCard} 100%)`,
        borderBottom: `1px solid ${W.border}`,
        padding: '20px 32px 24px',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Scan line animation */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${W.gold}20 50%, transparent 100%)`,
            animation: 'srScan 4s linear infinite',
          }} />
        </div>

        {/* Top row: Status badge + Live pulse + Share */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Threat badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px',
              background: `${threatConfig.color}18`,
              border: `1px solid ${threatConfig.color}40`,
              borderRadius: 6,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: threatConfig.color,
                boxShadow: `0 0 8px ${threatConfig.color}`,
                animation: threatConfig.pulse ? 'srPulse 1.5s ease-in-out infinite' : 'none',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
                color: threatConfig.color, letterSpacing: '0.1em',
              }}>
                NETWORK {threatConfig.label}
              </span>
            </div>
            {/* Contagion badge */}
            {acuteCount > 0 && (
              <div style={{
                padding: '4px 10px',
                background: W.redDim,
                border: `1px solid rgba(229,72,77,0.25)`,
                borderRadius: 6,
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                color: W.red, letterSpacing: '0.08em',
              }}>
                {acuteCount} ACUTE ZONE{acuteCount !== 1 ? 'S' : ''}
              </div>
            )}
            {retActive && (
              <div style={{
                padding: '4px 10px',
                background: 'rgba(220,38,38,0.15)',
                border: `1px solid rgba(220,38,38,0.30)`,
                borderRadius: 6,
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                color: '#FF6B6B', letterSpacing: '0.08em',
                animation: 'srBlink 2s ease-in-out infinite',
              }}>
                RET. WINDOW ACTIVE
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LivePulse
              sources={sources}
              isRefreshing={isRefreshing}
              lastRefresh={data.lastRefresh}
            />
            <CEOOnePager data={data} zones={contagionZones} situationText={situationText} />
          </div>
        </div>

        {/* The Situation Statement */}
        <div style={{ position: 'relative' }}>
          {isGenerating && !displayedText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                border: `2px solid ${W.goldBorder}`, borderTopColor: W.gold,
                animation: 'v3Spin 0.8s linear infinite',
              }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: W.textDimDark, letterSpacing: '0.06em' }}>
                GENERATING SITUATION ASSESSMENT...
              </span>
            </div>
          )}

          {displayedText && (
            <div style={{ animation: 'srFadeIn 0.3s ease-out' }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                color: W.gold, letterSpacing: '0.12em', marginBottom: 10,
              }}>
                SITUATION ASSESSMENT · {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} CDT
              </div>
              <p style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                lineHeight: 1.75,
                color: W.textOnDark,
                margin: 0,
                maxWidth: 820,
                fontWeight: 300,
                letterSpacing: '0.01em',
              }}>
                {displayedText}
                {charIndex < situationText.length && (
                  <span style={{
                    display: 'inline-block', width: 2, height: '1em',
                    background: W.gold, marginLeft: 2, verticalAlign: 'text-bottom',
                    animation: 'srBlink 0.7s ease-in-out infinite',
                  }} />
                )}
              </p>
            </div>
          )}

          {!displayedText && !isGenerating && (
            <button
              onClick={generateSituation}
              style={{
                background: 'transparent', border: `1px solid ${W.goldBorder}`,
                borderRadius: 6, padding: '8px 18px', cursor: 'pointer',
                fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
                color: W.gold, letterSpacing: '0.06em',
              }}
            >
              ✦ GENERATE SITUATION ASSESSMENT
            </button>
          )}
        </div>

        {/* Bottom row: Data freshness + refresh button */}
        {situationText && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            marginTop: 14, paddingTop: 14,
            borderTop: `1px solid ${W.border}`,
          }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: W.textDimDark }}>
              Auto-refreshes every 2 minutes · Based on live data from {sources.length} source types
            </span>
            <button
              onClick={() => { hasGenerated.current = false; generateSituation(); }}
              style={{
                background: 'transparent', border: `1px solid ${W.border}`,
                borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
                fontFamily: FONT_MONO, fontSize: 9, color: W.textDimDark,
              }}
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default SituationRoom;
