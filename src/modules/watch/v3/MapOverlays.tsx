/**
 * MapOverlays.tsx
 * Three elite Map tab innovations:
 * 1. ThreatPulseLayer  — CSS-animated sonar rings on the Leaflet map for each incident
 * 2. SafeCorridorPanel — dismissal-time safe routing overlay (visual panel, not GPS nav)
 * 3. TemporalReplayBar — 6-hour scrubber that animates incidents appearing in sequence
 *
 * All three are designed for storytelling first, data second.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { WatchIncident } from '../v2/types';
import type { WatchDataState } from '../v2/useWatchData';

// ─── Design tokens (match WatchAppV3 W object) ────────────────────────────────
const W = {
  bgDark:      '#0B1220',
  bgCard:      '#F9F8F6',
  bgSubtle:    '#F3F1EE',
  border:      'rgba(255,255,255,0.08)',
  borderLight: '#E8E4DC',
  gold:        '#C9A84C',
  goldBorder:  'rgba(201,168,76,0.35)',
  red:         '#E5484D',
  orange:      '#E07020',
  amber:       '#F59E0B',
  green:       '#17B26A',
  textOnDark:  '#E8E4DC',
  textDimDark: 'rgba(232,228,220,0.45)',
  textPrimary: '#1A1F2E',
  textMuted:   '#6B7280',
};
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_BODY = "'IBM Plex Sans', sans-serif";

// ─── Pulse Ring CSS ────────────────────────────────────────────────────────────
const PULSE_CSS = `
@keyframes pulseRingExpand {
  0%   { transform: scale(0.3); opacity: 0.9; }
  100% { transform: scale(1);   opacity: 0; }
}
@keyframes replayFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pulse-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: pulseRingExpand linear infinite;
  transform-origin: center center;
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. THREAT PULSE LAYER
// Renders animated SVG/div rings on the Leaflet map via L.DivIcon
// Called from WatchMap's marker useEffect — exported as a helper function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the HTML string for a pulsing ring icon to be used as L.DivIcon html.
 * Ring speed = recency (fast = recent, slow = old).
 * Ring color = crime type.
 */
export function getPulseRingHtml(
  crimeType: string,
  ageMinutes: number,
  isNew: boolean,
  isSelected?: boolean,
): string {
  const color = crimeType === 'HOMICIDE' ? '#E5484D'
    : crimeType === 'SHOOTING'  ? '#E07020'
    : crimeType === 'SHOTS_FIRED' ? '#F59E0B'
    : '#94A3B8';

  // Duration: 1.2s for <10min, 2.5s for <60min, 4s for older
  const duration = ageMinutes < 10 ? 1.2
    : ageMinutes < 60 ? 2.5
    : 4.0;

  // Size: 60px for homicide, 48px for shooting, 36px for others
  const size = crimeType === 'HOMICIDE' ? 60 : crimeType === 'SHOOTING' ? 48 : 36;
  const half = size / 2;

  const rings = isNew ? 3 : 2;
  const ringHtml = Array.from({ length: rings }).map((_, i) => `
    <div class="pulse-ring" style="
      width: ${size}px; height: ${size}px;
      border: 2px solid ${color};
      left: ${-half}px; top: ${-half}px;
      animation-duration: ${duration}s;
      animation-delay: ${(i * duration) / rings}s;
      opacity: 0.7;
    "></div>
  `).join('');

  const selectedHtml = isSelected ? `
    <div style="
      position: absolute;
      width: ${size + 16}px; height: ${size + 16}px;
      left: ${-(half + 8)}px; top: ${-(half + 8)}px;
      border: 2.5px solid #C9A54E;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(201,165,78,0.25), 0 0 12px rgba(201,165,78,0.4);
      pointer-events: none;
    "></div>
    <div style="
      position: absolute;
      width: 10px; height: 10px;
      left: -5px; top: -5px;
      border-radius: 50%;
      background: #C9A54E;
      box-shadow: 0 0 6px #C9A54E;
      pointer-events: none;
    "></div>
  ` : '';

  // Transparent center dot — fills the icon bounding box so pointer events register
  // even when the user clicks between the animated rings.
  const centerDot = `
    <div style="
      position: absolute;
      width: ${size}px; height: ${size}px;
      left: ${-half}px; top: ${-half}px;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
    "></div>
  `;

  return `
    <div style="position:relative; width:0; height:0; overflow:visible; cursor:pointer;">
      <style>${PULSE_CSS}</style>
      ${selectedHtml}
      ${ringHtml}
      ${centerDot}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SAFE CORRIDOR PANEL
// Shows during dismissal window: a visual panel listing safest routes per campus
// ═══════════════════════════════════════════════════════════════════════════════

interface SafeCorridorPanelProps {
  data: WatchDataState;
  visible: boolean;
  onClose: () => void;
}

export function SafeCorridorPanel({ data, visible, onClose }: SafeCorridorPanelProps) {
  if (!visible) return null;

  // Build corridor recommendations per campus based on threat proximity
  const corridors = useMemo(() => {
    return data.campusThreats
      .filter(ct => ct.threatLevel === 'RED' || ct.threatLevel === 'ORANGE')
      .map(ct => {
        const nearbyIncidents = data.incidents.filter(i =>
          i.nearestCampusId === ct.campusId &&
          i.ageMinutes <= 120 &&
          (i.crimeType === 'HOMICIDE' || i.crimeType === 'SHOOTING')
        );
        // Compute bearing from campus to nearest incident
        const ni = nearbyIncidents[0];
        const threatDir = ni ? (() => {
          const dLng = (ni.lng - ct.lng) * Math.PI / 180;
          const lat1 = ct.lat * Math.PI / 180;
          const lat2 = ni.lat * Math.PI / 180;
          const y = Math.sin(dLng) * Math.cos(lat2);
          const x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng);
          return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        })() : null;

        // Recommend the opposite direction from the threat
        const safeDir = threatDir !== null
          ? (threatDir + 180) % 360
          : null;

        const dirLabel = (deg: number | null) => {
          if (deg === null) return 'Standard route';
          if (deg >= 337.5 || deg < 22.5) return 'North exit';
          if (deg < 67.5) return 'Northeast exit';
          if (deg < 112.5) return 'East exit';
          if (deg < 157.5) return 'Southeast exit';
          if (deg < 202.5) return 'South exit';
          if (deg < 247.5) return 'Southwest exit';
          if (deg < 292.5) return 'West exit';
          return 'Northwest exit';
        };

        const threatDirLabel = (deg: number | null) => {
          if (deg === null) return null;
          if (deg >= 337.5 || deg < 22.5) return 'N';
          if (deg < 67.5) return 'NE';
          if (deg < 112.5) return 'E';
          if (deg < 157.5) return 'SE';
          if (deg < 202.5) return 'S';
          if (deg < 247.5) return 'SW';
          if (deg < 292.5) return 'W';
          return 'NW';
        };

        return {
          campus: ct,
          nearbyCount: nearbyIncidents.length,
          threatDirection: threatDirLabel(threatDir),
          safeExit: dirLabel(safeDir),
          recommendation: ct.threatLevel === 'RED'
            ? 'STAGGERED DISMISSAL — add exterior staff'
            : 'ENHANCED MONITORING — notify security',
        };
      });
  }, [data.campusThreats, data.incidents]);

  const threatColor = (level: string) =>
    level === 'RED' ? W.red : level === 'ORANGE' ? W.orange : W.amber;

  return (
    <div style={{
      position: 'absolute', top: 60, left: 12, zIndex: 1200,
      width: 320, maxHeight: 'calc(100% - 80px)',
      background: W.bgDark,
      border: `1px solid ${W.goldBorder}`,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'replayFadeIn 0.25s ease-out',
    }}>
      <style>{PULSE_CSS}</style>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: `linear-gradient(135deg, rgba(201,168,76,0.15) 0%, transparent 100%)`,
        borderBottom: `1px solid ${W.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            color: W.gold, letterSpacing: '0.12em', marginBottom: 2,
          }}>
            DISMISSAL SAFE CORRIDORS
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: W.textOnDark, fontWeight: 500 }}>
            Recommended exit routes · Affected campuses
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: W.textDimDark,
          fontSize: 18, cursor: 'pointer', lineHeight: 1,
        }}>×</button>
      </div>

      {/* Explainer */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${W.border}`,
        fontFamily: FONT_BODY, fontSize: 11, color: W.textDimDark, lineHeight: 1.5,
      }}>
        Routes are calculated by routing students away from active incident zones.
        Share with security staff before dismissal.
      </div>

      {/* Campus corridors */}
      <div style={{ overflowY: 'auto', maxHeight: 340 }}>
        {corridors.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: W.green, letterSpacing: '0.08em' }}>
              ALL CLEAR
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: W.textDimDark, marginTop: 4 }}>
              No elevated campuses at this time. Standard dismissal protocols apply.
            </div>
          </div>
        ) : corridors.map(c => (
          <div key={c.campus.campusId} style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${W.border}`,
            borderLeft: `3px solid ${threatColor(c.campus.threatLevel)}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
                color: W.textOnDark,
              }}>
                {c.campus.campusName}
              </div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                color: threatColor(c.campus.threatLevel),
                padding: '2px 6px',
                background: `${threatColor(c.campus.threatLevel)}18`,
                borderRadius: 4,
              }}>
                {c.campus.threatLevel}
              </div>
            </div>

            {c.threatDirection && (
              <div style={{
                fontFamily: FONT_BODY, fontSize: 11, color: W.textDimDark, marginBottom: 4,
              }}>
                Active incident to the <strong style={{ color: W.red }}>{c.threatDirection}</strong> of campus
                ({c.nearbyCount} incident{c.nearbyCount !== 1 ? 's' : ''} within 1 mi)
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 6, marginBottom: 6,
            }}>
              <span style={{ fontSize: 16 }}>🚶</span>
              <div>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 9, color: W.green,
                  fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2,
                }}>
                  RECOMMENDED EXIT
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: W.textOnDark, fontWeight: 500 }}>
                  {c.safeExit}
                </div>
              </div>
            </div>

            <div style={{
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
              color: c.campus.threatLevel === 'RED' ? W.red : W.amber,
              letterSpacing: '0.06em',
            }}>
              {c.recommendation}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${W.border}`,
        fontFamily: FONT_MONO, fontSize: 9, color: W.textDimDark,
      }}>
        Based on incident locations from the last 2 hours · Updates every 2 min
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TEMPORAL REPLAY BAR
// A scrubber at the bottom of the map that lets users drag back 6 hours
// and watch incidents appear in sequence with animated markers
// ═══════════════════════════════════════════════════════════════════════════════

interface TemporalReplayBarProps {
  incidents: WatchIncident[];
  onTimeChange: (minutesAgo: number | null) => void; // null = live mode
  currentMinutesAgo: number | null;
}

export function TemporalReplayBar({ incidents, onTimeChange, currentMinutesAgo }: TemporalReplayBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const MAX_MINUTES = 360; // 6 hours

  // Build incident timeline buckets (every 30 minutes)
  const buckets = useMemo(() => {
    const b: number[] = Array(12).fill(0);
    for (const inc of incidents) {
      const bucket = Math.min(11, Math.floor(inc.ageMinutes / 30));
      b[bucket]++;
    }
    return b;
  }, [incidents]);

  const maxBucket = Math.max(...buckets, 1);

  // Count incidents visible at current time
  const visibleCount = currentMinutesAgo === null
    ? incidents.length
    : incidents.filter(i => i.ageMinutes <= currentMinutesAgo).length;

  // Play/pause replay
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (playRef.current) clearInterval(playRef.current);
      setIsPlaying(false);
      onTimeChange(null); // return to live
      return;
    }
    setIsPlaying(true);
    let t = 0;
    onTimeChange(0);
    playRef.current = setInterval(() => {
      t += 10;
      if (t >= MAX_MINUTES) {
        if (playRef.current) clearInterval(playRef.current);
        setIsPlaying(false);
        onTimeChange(null);
      } else {
        onTimeChange(t);
      }
    }, 100); // 100ms per 10 minutes = 6 seconds total for 6 hours
  }, [isPlaying, onTimeChange]);

  useEffect(() => {
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, []);

  // Handle slider click/drag
  const handleSliderInteraction = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onTimeChange(Math.round(pct * MAX_MINUTES));
  }, [onTimeChange]);

  const sliderPct = currentMinutesAgo === null ? 100 : (currentMinutesAgo / MAX_MINUTES) * 100;

  const formatTime = (minutesAgo: number) => {
    if (minutesAgo === 0) return 'Now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    return `${Math.round(minutesAgo / 60)}h ago`;
  };

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 900,
      background: `linear-gradient(0deg, ${W.bgDark}F0 0%, ${W.bgDark}CC 100%)`,
      borderTop: `1px solid ${W.border}`,
      padding: '10px 16px 12px',
      backdropFilter: 'blur(8px)',
    }}>
      <style>{PULSE_CSS}</style>

      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            color: W.gold, letterSpacing: '0.10em',
          }}>
            TIME REPLAY
          </div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, color: W.textDimDark,
          }}>
            {currentMinutesAgo === null ? (
              <span style={{ color: W.green }}>● LIVE</span>
            ) : (
              <span>Viewing: <strong style={{ color: W.textOnDark }}>{formatTime(currentMinutesAgo)}</strong></span>
            )}
          </div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, color: W.textDimDark,
          }}>
            {visibleCount} incident{visibleCount !== 1 ? 's' : ''} visible
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Play/pause */}
          <button
            onClick={togglePlay}
            style={{
              background: isPlaying ? `${W.red}20` : `${W.gold}18`,
              border: `1px solid ${isPlaying ? W.red : W.goldBorder}`,
              borderRadius: 5, padding: '3px 10px', cursor: 'pointer',
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
              color: isPlaying ? W.red : W.gold, letterSpacing: '0.06em',
            }}
          >
            {isPlaying ? '■ STOP' : '▶ REPLAY 6H'}
          </button>
          {/* Return to live */}
          {currentMinutesAgo !== null && !isPlaying && (
            <button
              onClick={() => onTimeChange(null)}
              style={{
                background: `${W.green}15`,
                border: `1px solid ${W.green}40`,
                borderRadius: 5, padding: '3px 10px', cursor: 'pointer',
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                color: W.green, letterSpacing: '0.06em',
              }}
            >
              ● LIVE
            </button>
          )}
        </div>
      </div>

      {/* Histogram + scrubber */}
      <div style={{ position: 'relative' }}>
        {/* Histogram bars */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 2,
          height: 24, marginBottom: 4,
        }}>
          {buckets.map((count, i) => {
            const minutesAgo = (i + 0.5) * 30;
            const isActive = currentMinutesAgo === null || minutesAgo <= currentMinutesAgo;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(15, (count / maxBucket) * 100)}%`,
                  background: isActive
                    ? count > 3 ? W.red : count > 1 ? W.orange : W.amber
                    : 'rgba(255,255,255,0.08)',
                  borderRadius: '2px 2px 0 0',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                title={`${formatTime(i * 30)} to ${formatTime((i + 1) * 30)}: ${count} incident${count !== 1 ? 's' : ''}`}
              />
            );
          })}
        </div>

        {/* Scrubber track */}
        <div
          ref={sliderRef}
          onMouseDown={(e) => { setIsDragging(true); handleSliderInteraction(e); }}
          onMouseMove={(e) => { if (isDragging) handleSliderInteraction(e); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onClick={handleSliderInteraction}
          style={{
            height: 4, background: 'rgba(255,255,255,0.12)',
            borderRadius: 2, cursor: 'pointer', position: 'relative',
          }}
        >
          {/* Filled portion */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${sliderPct}%`,
            background: currentMinutesAgo === null
              ? `linear-gradient(90deg, ${W.red}, ${W.orange}, ${W.amber}, ${W.green})`
              : `linear-gradient(90deg, ${W.red}, ${W.orange})`,
            borderRadius: 2,
            transition: isPlaying ? 'none' : 'width 0.1s ease',
          }} />
          {/* Thumb */}
          <div style={{
            position: 'absolute',
            left: `calc(${sliderPct}% - 6px)`,
            top: -4,
            width: 12, height: 12,
            borderRadius: '50%',
            background: currentMinutesAgo === null ? W.green : W.gold,
            border: `2px solid ${W.bgDark}`,
            boxShadow: `0 0 8px ${currentMinutesAgo === null ? W.green : W.gold}`,
            transition: isPlaying ? 'none' : 'left 0.1s ease',
            cursor: 'grab',
          }} />
        </div>

        {/* Time labels */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 5,
          fontFamily: FONT_MONO, fontSize: 8, color: W.textDimDark,
        }}>
          <span>6h ago</span>
          <span>5h ago</span>
          <span>4h ago</span>
          <span>3h ago</span>
          <span>2h ago</span>
          <span>1h ago</span>
          <span style={{ color: W.green }}>Now</span>
        </div>
      </div>
    </div>
  );
}
