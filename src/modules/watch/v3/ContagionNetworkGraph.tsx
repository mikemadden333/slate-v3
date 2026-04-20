/**
 * ContagionNetworkGraph.tsx
 * Two elite Contagion tab innovations:
 *
 * 1. NetworkOrganismGraph
 *    A canvas-rendered force-directed graph showing all 10 campuses as nodes,
 *    connected by proximity edges. Nodes glow and pulse when in a contagion zone.
 *    The visual metaphor: the network as a living organism — you can see the infection spreading.
 *
 * 2. DecayClock
 *    A circular arc countdown for each active zone showing how much of the
 *    125-day Papachristos window remains. The arc depletes as time passes.
 *    Color shifts from red (acute) to amber (active) to green (watch/clear).
 *
 * Design principle: storytelling first. A CEO should be able to look at this
 * and understand "the infection is here, it's spreading toward these campuses,
 * and it will be gone in X days" without reading a single word.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { ContagionZone } from '../engine/types';
import type { WatchDataState } from '../v2/useWatchData';
import { CAMPUSES } from '../data/campuses';

// Haversine distance in miles
function distMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getAffectedCampusCount(zone: ContagionZone): number {
  const radiusMi = zone.phase === 'ACUTE' ? 0.5 : zone.phase === 'ACTIVE' ? 1.0 : 1.5;
  return CAMPUSES.filter(c => distMiles(c.lat, c.lng, zone.lat, zone.lng) <= radiusMi).length;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bgDark:     '#0D1117',
  bgCard:     '#13191F',
  border:     'rgba(255,255,255,0.08)',
  gold:       '#C9A84C',
  goldGlow:   'rgba(201,168,76,0.25)',
  red:        '#E5484D',
  redGlow:    'rgba(229,72,77,0.3)',
  orange:     '#E07020',
  orangeGlow: 'rgba(224,112,32,0.25)',
  amber:      '#F59E0B',
  amberGlow:  'rgba(245,158,11,0.2)',
  green:      '#17B26A',
  greenGlow:  'rgba(23,178,106,0.2)',
  textOnDark: '#E8E4DC',
  textDim:    'rgba(232,228,220,0.45)',
  textMuted:  'rgba(232,228,220,0.65)',
};
const FONT_MONO = "'IBM Plex Mono', monospace";
const FONT_BODY = "'IBM Plex Sans', sans-serif";

// ─── Campus positions (normalized 0-1 grid, roughly matching Chicago geography)
const CAMPUS_POSITIONS: Record<number, { x: number; y: number; label: string }> = {
  1:  { x: 0.52, y: 0.18, label: 'Loop' },
  2:  { x: 0.30, y: 0.42, label: 'Austin' },
  3:  { x: 0.48, y: 0.55, label: 'Englewood' },
  4:  { x: 0.55, y: 0.48, label: 'Chatham' },
  5:  { x: 0.42, y: 0.35, label: 'Garfield Pk' },
  6:  { x: 0.58, y: 0.62, label: 'Woodlawn' },
  7:  { x: 0.35, y: 0.52, label: 'Humboldt' },
  8:  { x: 0.62, y: 0.70, label: 'Auburn G.' },
  9:  { x: 0.65, y: 0.80, label: 'Roseland' },
  10: { x: 0.28, y: 0.60, label: 'N. Lawndale' },
};

// Proximity edges (campuses within ~3 miles of each other)
const EDGES: [number, number][] = [
  [1, 5], [1, 4], [2, 7], [2, 10], [3, 4], [3, 6], [3, 7],
  [4, 6], [4, 8], [5, 7], [6, 8], [8, 9], [9, 6], [10, 7],
];

function phaseColor(phase: string): string {
  if (phase === 'ACUTE')  return T.red;
  if (phase === 'ACTIVE') return T.orange;
  if (phase === 'WATCH')  return T.amber;
  return T.green;
}

function phaseGlow(phase: string): string {
  if (phase === 'ACUTE')  return T.redGlow;
  if (phase === 'ACTIVE') return T.orangeGlow;
  if (phase === 'WATCH')  return T.amberGlow;
  return T.greenGlow;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK ORGANISM GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

interface NetworkOrganismGraphProps {
  campusThreats: WatchDataState['campusThreats'];
  zones: ContagionZone[];
  selectedCampusId?: number | null;
  onSelectCampus?: (id: number | null) => void;
}

export function NetworkOrganismGraph({
  campusThreats,
  zones,
  selectedCampusId,
  onSelectCampus,
}: NetworkOrganismGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef(0);
  const [hoveredCampus, setHoveredCampus] = useState<number | null>(null);

  // Map campus IDs to their worst contagion phase
  const campusPhase = useMemo(() => {
    const map: Record<number, string> = {};
    for (const ct of campusThreats) {
      map[ct.campusId] = ct.threatLevel === 'RED' ? 'ACUTE'
        : ct.threatLevel === 'ORANGE' ? 'ACTIVE'
        : ct.threatLevel === 'AMBER' ? 'WATCH'
        : 'CLEAR';
    }
    // Override with actual contagion zone data (derive affected campuses from proximity)
    for (const z of zones) {
      if (z.phase === 'ACUTE' || z.phase === 'ACTIVE') {
        const radiusMi = z.phase === 'ACUTE' ? 0.5 : 1.0;
        for (const campus of CAMPUSES) {
          if (distMiles(campus.lat, campus.lng, z.lat, z.lng) <= radiusMi) {
            const cid = campus.id;
            if (!map[cid] || map[cid] === 'CLEAR' || map[cid] === 'WATCH') {
              map[cid] = z.phase;
            }
          }
        }
      }
    }
    return map;
  }, [campusThreats, zones]);

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const getPos = (id: number) => {
      const p = CAMPUS_POSITIONS[id] ?? { x: 0.5, y: 0.5 };
      return { x: p.x * W, y: p.y * H };
    };

    const draw = () => {
      pulseRef.current += 0.03;
      const pulse = pulseRef.current;

      ctx.clearRect(0, 0, W, H);

      // Draw edges
      for (const [a, b] of EDGES) {
        const pa = getPos(a);
        const pb = getPos(b);
        const phaseA = campusPhase[a] ?? 'CLEAR';
        const phaseB = campusPhase[b] ?? 'CLEAR';

        // Edge glows if both endpoints are in contagion
        const bothActive = (phaseA === 'ACUTE' || phaseA === 'ACTIVE') &&
                           (phaseB === 'ACUTE' || phaseB === 'ACTIVE');
        const eitherActive = phaseA !== 'CLEAR' || phaseB !== 'CLEAR';

        const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
        if (bothActive) {
          grad.addColorStop(0, phaseColor(phaseA) + '80');
          grad.addColorStop(1, phaseColor(phaseB) + '80');
        } else if (eitherActive) {
          grad.addColorStop(0, phaseColor(phaseA) + '40');
          grad.addColorStop(1, phaseColor(phaseB) + '40');
        } else {
          grad.addColorStop(0, 'rgba(255,255,255,0.06)');
          grad.addColorStop(1, 'rgba(255,255,255,0.06)');
        }

        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = bothActive ? 1.5 : 0.8;
        ctx.stroke();

        // Animate a traveling dot along active edges
        if (bothActive) {
          const t = (pulse * 0.4) % 1;
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dotX = pa.x + dx * t;
          const dotY = pa.y + dy * t;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
          ctx.fillStyle = phaseColor(phaseA);
          ctx.fill();
        }
      }

      // Draw campus nodes
      for (const [idStr, pos] of Object.entries(CAMPUS_POSITIONS)) {
        const id = parseInt(idStr);
        const phase = campusPhase[id] ?? 'CLEAR';
        const color = phaseColor(phase);
        const glow = phaseGlow(phase);
        const isSelected = selectedCampusId === id;
        const isHovered = hoveredCampus === id;

        const baseRadius = isSelected ? 14 : isHovered ? 12 : 10;
        const x = pos.x * W;
        const y = pos.y * H;

        // Outer glow for active nodes
        if (phase !== 'CLEAR') {
          const glowRadius = baseRadius + 8 + Math.sin(pulse * 2) * 4;
          const radGrad = ctx.createRadialGradient(x, y, baseRadius, x, y, glowRadius);
          radGrad.addColorStop(0, glow);
          radGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = radGrad;
          ctx.fill();
        }

        // Node body
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        const nodeGrad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, baseRadius);
        nodeGrad.addColorStop(0, phase === 'CLEAR' ? '#2A3040' : color + 'CC');
        nodeGrad.addColorStop(1, phase === 'CLEAR' ? '#1A2030' : color + '66');
        ctx.fillStyle = nodeGrad;
        ctx.fill();

        // Node border
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? T.gold : color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Pulse ring for ACUTE
        if (phase === 'ACUTE') {
          const ringRadius = baseRadius + 6 + Math.sin(pulse * 3) * 6;
          const ringOpacity = 0.4 + Math.sin(pulse * 3) * 0.2;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = color + Math.round(ringOpacity * 255).toString(16).padStart(2, '0');
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Label
        const label = pos.label;
        ctx.font = `${isSelected ? 600 : 500} 9px ${FONT_MONO}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isSelected ? T.gold : phase !== 'CLEAR' ? color : T.textDim;
        ctx.fillText(label, x, y + baseRadius + 12);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [campusPhase, hoveredCampus, selectedCampusId]);

  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    let found: number | null = null;
    for (const [idStr, pos] of Object.entries(CAMPUS_POSITIONS)) {
      const x = pos.x * canvas.width;
      const y = pos.y * canvas.height;
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < 18) { found = parseInt(idStr); break; }
    }
    setHoveredCampus(found);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    for (const [idStr, pos] of Object.entries(CAMPUS_POSITIONS)) {
      const x = pos.x * canvas.width;
      const y = pos.y * canvas.height;
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < 18) {
        const id = parseInt(idStr);
        onSelectCampus?.(selectedCampusId === id ? null : id);
        return;
      }
    }
    onSelectCampus?.(null);
  };

  // Count active zones
  const acuteCount = zones.filter(z => z.phase === 'ACUTE').length;
  const activeCount = zones.filter(z => z.phase === 'ACTIVE').length;
  const watchCount  = zones.filter(z => z.phase === 'WATCH').length;

  return (
    <div style={{
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `linear-gradient(135deg, rgba(201,168,76,0.08) 0%, transparent 100%)`,
      }}>
        <div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            color: T.gold, letterSpacing: '0.12em', marginBottom: 3,
          }}>
            NETWORK CONTAGION MAP
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.textOnDark, fontWeight: 500 }}>
            Live campus exposure network · Click any campus to drill down
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {acuteCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.red }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: T.red }}>{acuteCount} ACUTE</span>
            </div>
          )}
          {activeCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.orange }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: T.orange }}>{activeCount} ACTIVE</span>
            </div>
          )}
          {watchCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.amber }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: T.amber }}>{watchCount} WATCH</span>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', background: T.bgDark }}>
        <canvas
          ref={canvasRef}
          width={680}
          height={320}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredCampus(null)}
          onClick={handleClick}
          style={{
            width: '100%',
            height: 320,
            cursor: hoveredCampus ? 'pointer' : 'default',
            display: 'block',
          }}
        />

        {/* Explainer overlay (bottom-left) */}
        <div style={{
          position: 'absolute', bottom: 10, left: 14,
          fontFamily: FONT_MONO, fontSize: 8, color: T.textDim,
          lineHeight: 1.6,
        }}>
          <div>● Pulsing = ACUTE zone (0-72h)</div>
          <div>● Glowing = ACTIVE zone (3-14 days)</div>
          <div>● Lines show campus proximity network</div>
          <div>● Traveling dots = active contagion path</div>
        </div>

        {/* Hovered campus tooltip */}
        {hoveredCampus && (() => {
          const ct = campusThreats.find(c => c.campusId === hoveredCampus);
          const phase = campusPhase[hoveredCampus] ?? 'CLEAR';
          const pos = CAMPUS_POSITIONS[hoveredCampus];
          if (!ct || !pos) return null;
          const canvasEl = canvasRef.current;
          const cw = canvasEl?.offsetWidth ?? 680;
          const ch = canvasEl?.offsetHeight ?? 320;
          const px = pos.x * cw;
          const py = pos.y * ch;
          return (
            <div style={{
              position: 'absolute',
              left: Math.min(px + 16, cw - 200),
              top: Math.max(py - 60, 8),
              background: 'rgba(13,17,23,0.95)',
              border: `1px solid ${phaseColor(phase)}40`,
              borderRadius: 8,
              padding: '10px 14px',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: 160,
            }}>
              <div style={{
                fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600,
                color: T.textOnDark, marginBottom: 4,
              }}>
                {ct.campusName}
              </div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                color: phaseColor(phase), letterSpacing: '0.06em', marginBottom: 3,
              }}>
                {phase} · {ct.threatLevel}
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.textDim }}>
                {ct.incidentCount} incident{ct.incidentCount !== 1 ? 's' : ''} in 24h
              </div>
              {ct.nearestIncidentDistance != null && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: T.textDim }}>
                  Nearest: {ct.nearestIncidentDistance.toFixed(2)} mi
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Science explainer */}
      <div style={{
        padding: '10px 20px',
        borderTop: `1px solid ${T.border}`,
        fontFamily: FONT_BODY, fontSize: 11, color: T.textDim, lineHeight: 1.5,
      }}>
        Network edges represent campus proximity (&lt;3 miles). Contagion can spread between connected campuses
        within the Papachristos 125-day window. Pulsing nodes indicate active retaliation risk.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECAY CLOCK
// A circular arc showing how much of the 125-day window remains for each zone
// ═══════════════════════════════════════════════════════════════════════════════

interface DecayClockProps {
  zones: ContagionZone[];
}

export function DecayClock({ zones }: DecayClockProps) {
  const activeZones = zones.filter(z => z.phase === 'ACUTE' || z.phase === 'ACTIVE' || z.phase === 'WATCH');

  if (activeZones.length === 0) {
    return (
      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: `3px solid ${T.green}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>✓</div>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: T.green, letterSpacing: '0.1em', marginBottom: 2 }}>
            ALL ZONES CLEAR
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.textDim }}>
            No active contagion zones. Network is in standard monitoring mode.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 12, overflow: 'hidden', marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${T.border}`,
        background: `linear-gradient(135deg, rgba(201,168,76,0.08) 0%, transparent 100%)`,
      }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
          color: T.gold, letterSpacing: '0.12em', marginBottom: 3,
        }}>
          CONTAGION DECAY CLOCKS
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.textOnDark, fontWeight: 500 }}>
          Time remaining in each active zone's 125-day risk window
        </div>
      </div>

      {/* Clocks grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
        gap: 1,
        background: T.border,
      }}>
        {activeZones.map(zone => (
          <ZoneDecayClock key={zone.incidentId} zone={zone} />
        ))}
      </div>

      {/* Explainer */}
      <div style={{
        padding: '10px 20px',
        borderTop: `1px solid ${T.border}`,
        fontFamily: FONT_BODY, fontSize: 11, color: T.textDim, lineHeight: 1.5,
      }}>
        Based on Papachristos et al. (JAMA 2017): violence contagion risk decays exponentially over 125 days.
        Arc shows remaining risk window. Red = ACUTE (0-72h), Orange = ACTIVE (3-14d), Amber = WATCH (14-30d).
      </div>
    </div>
  );
}

function ZoneDecayClock({ zone }: { zone: ContagionZone }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const pulseRef = useRef(0);

  const MAX_DAYS = 125;
  const daysElapsed = zone.ageH / 24;
  const daysRemaining = Math.max(0, MAX_DAYS - daysElapsed);
  const pctRemaining = daysRemaining / MAX_DAYS;
  const color = phaseColor(zone.phase);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) / 2 - 8;

    const draw = () => {
      pulseRef.current += 0.04;
      const pulse = pulseRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background track
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI * 1.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Decay arc (remaining)
      if (pctRemaining > 0) {
        const endAngle = -Math.PI / 2 + (pctRemaining * Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow on the arc tip
        if (zone.phase === 'ACUTE') {
          const tipX = cx + radius * Math.cos(endAngle);
          const tipY = cy + radius * Math.sin(endAngle);
          const glowRadius = 6 + Math.sin(pulse * 3) * 2;
          const radGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, glowRadius);
          radGrad.addColorStop(0, color + 'CC');
          radGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(tipX, tipY, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = radGrad;
          ctx.fill();
        }
      }

      // Center text: days remaining
      ctx.textAlign = 'center';
      ctx.font = `700 ${daysRemaining >= 100 ? 18 : 22}px ${FONT_MONO}`;
      ctx.fillStyle = color;
      ctx.fillText(String(Math.round(daysRemaining)), cx, cy + 6);

      ctx.font = `500 8px ${FONT_MONO}`;
      ctx.fillStyle = 'rgba(232,228,220,0.45)';
      ctx.fillText('DAYS LEFT', cx, cy + 18);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [pctRemaining, color, daysRemaining, zone.phase]);

  return (
    <div style={{
      background: T.bgCard,
      padding: '16px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      {/* Phase badge */}
      <div style={{
        fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700,
        color, letterSpacing: '0.10em',
        padding: '2px 8px',
        background: color + '18',
        borderRadius: 4,
      }}>
        {zone.phase}
      </div>

      {/* Clock canvas */}
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        style={{ width: 100, height: 100 }}
      />

      {/* Zone info */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
          color: T.textOnDark, marginBottom: 2,
        }}>
          {zone.block ?? `Zone ${zone.incidentId.slice(0, 6)}`}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: T.textDim }}>
          Day {Math.round(daysElapsed)} of 125
        </div>
        {getAffectedCampusCount(zone) > 0 && (
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: T.textDim, marginTop: 2 }}>
            {getAffectedCampusCount(zone)} campus{getAffectedCampusCount(zone) !== 1 ? 'es' : ''} exposed
          </div>
        )}
      </div>
    </div>
  );
}
