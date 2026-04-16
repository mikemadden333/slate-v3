/**
 * NetworkStoryArc — The 125-Day Contagion Story
 * ═══════════════════════════════════════════════════════════════════════════
 * The Papachristos model made visible.
 *
 * A horizontal timeline showing the full arc of each contagion event:
 *   - Origin point (the homicide)
 *   - Decay curve (risk falling over 125 days)
 *   - "You are here" vertical line
 *   - Campus exposure windows (which campuses entered risk at what point)
 *   - Phase transitions (ACUTE → ACTIVE → WATCH → CLEAR)
 *
 * Design: Bloomberg terminal meets academic research visualization.
 * The user should feel like they are looking at a scientific instrument.
 *
 * Contextual explainers on every key term.
 */
import { useState, useRef, useEffect } from 'react';
import type { ContagionZone } from '../engine/types';
import { CAMPUSES } from '../data/campuses';

// ─── Design Tokens ────────────────────────────────────────────────────────
const W = {
  bg:            '#F6F8FB',
  bgCard:        '#FFFFFF',
  bgDark:        '#0F1728',
  bgDarkCard:    '#1A2540',
  textPrimary:   '#0F1728',
  textSecondary: '#4C5A70',
  textMuted:     '#7A8699',
  textDim:       '#9CA3AF',
  textOnDark:    '#E8EDF5',
  textMutedDark: '#8899AA',
  gold:          '#C9A54E',
  goldDim:       'rgba(201, 165, 78, 0.10)',
  goldBorder:    'rgba(201, 165, 78, 0.20)',
  red:           '#E5484D',
  orange:        '#E07020',
  amber:         '#F59E0B',
  green:         '#17B26A',
  border:        'rgba(26, 35, 50, 0.08)',
  borderMd:      'rgba(26, 35, 50, 0.12)',
} as const;

const FONT_BODY = "'Inter', 'IBM Plex Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";

// Phase colors
const PHASE = {
  ACUTE:  { color: W.red,    bg: 'rgba(229,72,77,0.12)',  label: 'ACUTE',  days: '0-3 days' },
  ACTIVE: { color: W.orange, bg: 'rgba(224,112,32,0.10)', label: 'ACTIVE', days: '3-14 days' },
  WATCH:  { color: W.amber,  bg: 'rgba(245,158,11,0.08)', label: 'WATCH',  days: '14-45 days' },
  CLEAR:  { color: W.green,  bg: 'rgba(23,178,106,0.08)', label: 'CLEAR',  days: '45-125 days' },
} as const;

// ─── Tooltip ──────────────────────────────────────────────────────────────
function InfoTooltip({ children, tip }: { children: React.ReactNode; tip: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: 'translateX(-50%)',
          background: W.bgDark,
          border: `1px solid ${W.goldBorder}`,
          borderRadius: 8, padding: '8px 12px',
          fontSize: 11, color: W.textOnDark,
          lineHeight: 1.5, whiteSpace: 'normal',
          width: 240, zIndex: 1000, marginBottom: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          pointerEvents: 'none', fontFamily: FONT_BODY,
        }}>
          {tip}
        </span>
      )}
    </span>
  );
}

// ─── Decay Curve Canvas ───────────────────────────────────────────────────
function DecayCurveCanvas({
  zone,
  width,
  height,
}: {
  zone: ContagionZone;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const TOTAL_DAYS = 125;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padL = 0, padR = 0, padT = 4, padB = 20;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    // Papachristos decay function: risk = e^(-0.0185 * days)
    // Normalized so day 0 = 1.0
    const decayFn = (days: number) => Math.exp(-0.0185 * days);

    // Phase boundaries (days)
    const phases = [
      { start: 0,   end: 3,   color: W.red },
      { start: 3,   end: 14,  color: W.orange },
      { start: 14,  end: 45,  color: W.amber },
      { start: 45,  end: 125, color: W.green },
    ];

    // Draw phase background bands
    phases.forEach(p => {
      const x1 = padL + (p.start / TOTAL_DAYS) * chartW;
      const x2 = padL + (p.end / TOTAL_DAYS) * chartW;
      ctx.fillStyle = p.color + '18';
      ctx.fillRect(x1, padT, x2 - x1, chartH);
    });

    // Draw decay curve fill
    const gradient = ctx.createLinearGradient(padL, 0, padL + chartW, 0);
    gradient.addColorStop(0,    W.red + 'AA');
    gradient.addColorStop(0.024, W.orange + '88');
    gradient.addColorStop(0.112, W.amber + '55');
    gradient.addColorStop(0.36,  W.green + '33');
    gradient.addColorStop(1,    W.green + '11');

    ctx.beginPath();
    ctx.moveTo(padL, padT + chartH);
    for (let d = 0; d <= TOTAL_DAYS; d++) {
      const x = padL + (d / TOTAL_DAYS) * chartW;
      const y = padT + chartH - (decayFn(d) * chartH * 0.9);
      if (d === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw decay curve line
    ctx.beginPath();
    ctx.strokeStyle = W.gold;
    ctx.lineWidth = 1.5;
    for (let d = 0; d <= TOTAL_DAYS; d++) {
      const x = padL + (d / TOTAL_DAYS) * chartW;
      const y = padT + chartH - (decayFn(d) * chartH * 0.9);
      if (d === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw "you are here" line
    const ageDays = zone.ageH / 24;
    const nowX = padL + (Math.min(ageDays, TOTAL_DAYS) / TOTAL_DAYS) * chartW;
    ctx.beginPath();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(nowX, padT);
    ctx.lineTo(nowX, padT + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // "NOW" label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 8px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('NOW', nowX, padT + chartH + 14);

    // Day labels
    ctx.fillStyle = W.textMuted;
    ctx.font = `8px ${FONT_MONO}`;
    [0, 3, 14, 45, 125].forEach(d => {
      const x = padL + (d / TOTAL_DAYS) * chartW;
      ctx.textAlign = d === 0 ? 'left' : d === 125 ? 'right' : 'center';
      ctx.fillText(`${d}d`, x, padT + chartH + 14);
    });
  }, [zone, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
}

// ─── Zone Story Card ──────────────────────────────────────────────────────
function ZoneStoryCard({ zone }: { zone: ContagionZone }) {
  const [expanded, setExpanded] = useState(false);
  const ageDays = Math.round(zone.ageH / 24);
  const phaseCfg = PHASE[zone.phase as keyof typeof PHASE] ?? PHASE.WATCH;
  const daysRemaining = Math.max(0, 125 - ageDays);
  const riskPct = Math.round(Math.exp(-0.0185 * ageDays) * 100);

  // Find affected campuses
  const affectedCampuses = CAMPUSES.filter(c => {
    const dist = Math.sqrt(
      Math.pow((c.lat - zone.lat) * 69, 2) +
      Math.pow((c.lng - zone.lng) * 55, 2)
    );
    return dist <= zone.radius;
  });

  return (
    <div style={{
      background: W.bgCard,
      border: `1px solid ${W.borderMd}`,
      borderLeft: `4px solid ${phaseCfg.color}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s ease',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '14px 18px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        {/* Phase badge */}
        <div style={{
          padding: '3px 8px', borderRadius: 4,
          background: phaseCfg.bg,
          fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
          color: phaseCfg.color, letterSpacing: '0.08em',
          flexShrink: 0,
        }}>
          {phaseCfg.label}
        </div>

        {/* Incident info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
            color: W.textPrimary, marginBottom: 2,
          }}>
            {zone.block ? `Homicide near ${zone.block}` : 'Homicide'}
            {zone.gang && (
              <span style={{
                marginLeft: 8, fontSize: 9, fontWeight: 700,
                color: '#7C3AED', letterSpacing: '0.06em',
              }}>
                GANG
              </span>
            )}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: W.textMuted }}>
            Day {ageDays} of 125 · {daysRemaining} days remaining · {riskPct}% residual risk
          </div>
        </div>

        {/* Mini decay bar */}
        <div style={{ width: 80, flexShrink: 0 }}>
          <div style={{
            height: 4, background: W.border, borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${riskPct}%`,
              background: `linear-gradient(90deg, ${phaseCfg.color}, ${phaseCfg.color}88)`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 8, color: W.textDim, marginTop: 3, textAlign: 'right',
          }}>
            {riskPct}% risk
          </div>
        </div>

        {/* Retaliation badge */}
        {zone.retWin && (
          <div style={{
            padding: '3px 8px', borderRadius: 4,
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.25)',
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            color: '#DC2626', letterSpacing: '0.06em',
            flexShrink: 0,
          }}>
            RET. WINDOW
          </div>
        )}

        {/* Chevron */}
        <span style={{
          fontFamily: FONT_MONO, fontSize: 10, color: W.textDim,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}>
          ▼
        </span>
      </div>

      {/* Expanded: decay curve + campus exposure */}
      {expanded && (
        <div style={{
          padding: '0 18px 18px',
          borderTop: `1px solid ${W.border}`,
          animation: 'arcFadeIn 0.25s ease-out',
        }}>
          {/* Decay curve */}
          <div style={{ marginTop: 14, marginBottom: 14 }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
              color: W.textMuted, letterSpacing: '0.08em', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <InfoTooltip tip="The Papachristos decay curve shows how violence risk decreases over 125 days following a homicide. The gold line is the mathematical model. The white dashed line is today.">
                <span>DECAY CURVE</span>
                <span style={{ fontSize: 9, color: W.gold, marginLeft: 4 }}>?</span>
              </InfoTooltip>
            </div>
            <DecayCurveCanvas zone={zone} width={520} height={80} />
          </div>

          {/* Phase timeline */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
              color: W.textMuted, letterSpacing: '0.08em', marginBottom: 8,
            }}>
              PHASE TRANSITIONS
            </div>
            <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', height: 24 }}>
              {Object.entries(PHASE).map(([key, cfg]) => {
                const widths = { ACUTE: '2.4%', ACTIVE: '8.8%', WATCH: '24.8%', CLEAR: '64%' };
                const isCurrentPhase = zone.phase === key;
                return (
                  <div
                    key={key}
                    style={{
                      width: widths[key as keyof typeof widths],
                      background: isCurrentPhase ? cfg.color : cfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT_MONO, fontSize: 8, fontWeight: 700,
                      color: isCurrentPhase ? '#fff' : cfg.color,
                      letterSpacing: '0.06em',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {key}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {['0d', '3d', '14d', '45d', '125d'].map(d => (
                <span key={d} style={{ fontFamily: FONT_MONO, fontSize: 8, color: W.textDim }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Affected campuses */}
          {affectedCampuses.length > 0 && (
            <div>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                color: W.textMuted, letterSpacing: '0.08em', marginBottom: 8,
              }}>
                CAMPUSES IN EXPOSURE ZONE ({affectedCampuses.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {affectedCampuses.map(c => (
                  <div key={c.id} style={{
                    padding: '4px 10px', borderRadius: 4,
                    background: `${phaseCfg.color}15`,
                    border: `1px solid ${phaseCfg.color}30`,
                    fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
                    color: phaseCfg.color,
                  }}>
                    {c.short}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

interface NetworkStoryArcProps {
  zones: ContagionZone[];
}

const ARC_CSS = `
@keyframes arcFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export function NetworkStoryArc({ zones }: NetworkStoryArcProps) {
  const [sortBy, setSortBy] = useState<'phase' | 'age' | 'risk'>('phase');
  const [showExplainer, setShowExplainer] = useState(false);

  if (zones.length === 0) {
    return (
      <div style={{
        background: W.bgCard, border: `1px solid ${W.border}`, borderRadius: 12,
        padding: '32px 24px', textAlign: 'center',
      }}>
        <style>{ARC_CSS}</style>
        <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500, color: W.textSecondary, marginBottom: 6 }}>
          No active contagion zones
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: W.textMuted }}>
          The network is operating in a clear threat environment. No homicides have been recorded within the monitoring radius in the past 125 days.
        </div>
      </div>
    );
  }

  const phaseOrder = { ACUTE: 0, ACTIVE: 1, WATCH: 2, CLEAR: 3 };
  const sorted = [...zones].sort((a, b) => {
    if (sortBy === 'phase') return (phaseOrder[a.phase as keyof typeof phaseOrder] ?? 4) - (phaseOrder[b.phase as keyof typeof phaseOrder] ?? 4);
    if (sortBy === 'age') return a.ageH - b.ageH;
    if (sortBy === 'risk') return Math.exp(-0.0185 * (b.ageH / 24)) - Math.exp(-0.0185 * (a.ageH / 24));
    return 0;
  });

  const acuteCount  = zones.filter(z => z.phase === 'ACUTE').length;
  const activeCount = zones.filter(z => z.phase === 'ACTIVE').length;
  const watchCount  = zones.filter(z => z.phase === 'WATCH').length;
  const retCount    = zones.filter(z => z.retWin).length;

  return (
    <div>
      <style>{ARC_CSS}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
          }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
              color: W.textSecondary, letterSpacing: '0.08em',
            }}>
              NETWORK STORY ARC
            </span>
            <button
              onClick={() => setShowExplainer(e => !e)}
              style={{
                background: W.goldDim, border: `1px solid ${W.goldBorder}`,
                borderRadius: 10, padding: '1px 7px',
                fontFamily: FONT_MONO, fontSize: 9, color: W.gold,
                cursor: 'pointer', letterSpacing: '0.04em',
              }}
            >
              {showExplainer ? 'HIDE EXPLAINER' : 'WHAT IS THIS?'}
            </button>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: W.textMuted }}>
            {zones.length} active zone{zones.length !== 1 ? 's' : ''} across the 125-day monitoring window
          </div>
        </div>

        {/* Phase summary pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'ACUTE',  count: acuteCount,  color: W.red },
            { label: 'ACTIVE', count: activeCount, color: W.orange },
            { label: 'WATCH',  count: watchCount,  color: W.amber },
          ].filter(p => p.count > 0).map(p => (
            <div key={p.label} style={{
              padding: '4px 10px', borderRadius: 4,
              background: `${p.color}15`,
              border: `1px solid ${p.color}30`,
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
              color: p.color, letterSpacing: '0.06em',
            }}>
              {p.count} {p.label}
            </div>
          ))}
          {retCount > 0 && (
            <div style={{
              padding: '4px 10px', borderRadius: 4,
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.25)',
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
              color: '#DC2626', letterSpacing: '0.06em',
            }}>
              {retCount} RET. WINDOW
            </div>
          )}
        </div>
      </div>

      {/* Explainer panel */}
      {showExplainer && (
        <div style={{
          background: W.bgDark,
          border: `1px solid ${W.goldBorder}`,
          borderRadius: 10, padding: '16px 20px',
          marginBottom: 16,
          animation: 'arcFadeIn 0.25s ease-out',
        }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            color: W.gold, letterSpacing: '0.1em', marginBottom: 10,
          }}>
            THE PAPACHRISTOS CONTAGION MODEL — EXPLAINED
          </div>
          <div style={{
            fontFamily: FONT_BODY, fontSize: 12, color: W.textOnDark,
            lineHeight: 1.7, maxWidth: 680,
          }}>
            <p style={{ margin: '0 0 10px' }}>
              Research by Dr. Andrew Papachristos at Yale University (published in JAMA, 2017) demonstrated that gun violence spreads through social networks like a contagious disease. After a homicide, the risk of follow-on violence in the same area is elevated for up to 125 days, with the highest risk in the first 72 hours.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              Slate uses this model to score every homicide within 1 mile of any campus. The decay curve shows how risk falls over time using the formula: Risk = e^(-0.0185 x days). A homicide today carries 100% of its risk weight. After 14 days it carries about 77%. After 45 days, about 43%. After 125 days, it exits the monitoring window entirely.
            </p>
            <p style={{ margin: 0 }}>
              The <strong style={{ color: W.gold }}>retaliation window</strong> is the 18 to 72 hour period immediately following a homicide when retaliatory violence is statistically most likely. During this window, Slate elevates all nearby campuses to maximum alert.
            </p>
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: W.textDim, alignSelf: 'center' }}>SORT:</span>
        {(['phase', 'age', 'risk'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            style={{
              padding: '3px 10px', borderRadius: 4,
              background: sortBy === s ? W.goldDim : 'transparent',
              border: `1px solid ${sortBy === s ? W.goldBorder : W.border}`,
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: sortBy === s ? 700 : 400,
              color: sortBy === s ? W.gold : W.textDim,
              cursor: 'pointer', letterSpacing: '0.06em',
              transition: 'all 0.15s ease',
            }}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Zone cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((zone, i) => (
          <ZoneStoryCard key={zone.incidentId || i} zone={zone} />
        ))}
      </div>
    </div>
  );
}

export default NetworkStoryArc;
