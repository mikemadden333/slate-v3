/**
 * Slate v3 — Splash Screen: "The Mark"
 *
 * A cinematic brand reveal inspired by the chalk-on-slate metaphor.
 * The word "Slate" is drawn with an SVG stroke animation — as if written
 * by an invisible hand with luminous chalk on polished dark stone.
 * Gold shimmer trails the stroke. Chalk dust particles drift upward.
 * The gold period pulses at the end. Then the platform opens.
 *
 * Elevated. Not literal. Luxury brand energy.
 */

import React, { useState, useEffect, useRef } from 'react';
import { brand, font, modules as modColors } from '../core/theme';

// ─── Module dots ──────────────────────────────────────────────────────────
const MODULE_DOTS: { label: string; color: string }[] = [
  { label: 'SIGNAL',  color: modColors.signal },
  { label: 'WATCH',   color: modColors.watch },
  { label: 'LEDGER',  color: modColors.ledger },
  { label: 'SCHOLAR', color: modColors.scholar },
  { label: 'SHIELD',  color: modColors.shield },
  { label: 'DRAFT',   color: modColors.draft },
  { label: 'GROUNDS', color: modColors.grounds },
  { label: 'CIVIC',   color: modColors.civic },
  { label: 'FUND',    color: modColors.fund },
  { label: 'BRIEFING',color: modColors.briefing },
  { label: 'REPORTS', color: modColors.reports },
];

// ─── Background palette — dark slate gray ─────────────────────────────────
const BG_CENTER = '#1A1D23';
const BG_MID    = '#131619';
const BG_BASE   = '#0D1117';

// ─── Chalk dust particle system ───────────────────────────────────────────
function ChalkDust({ active }: { active: boolean }) {
  const particles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 42 + Math.random() * 16,       // cluster around the end of "Slate"
      delay: Math.random() * 0.8,
      size: 1.5 + Math.random() * 2.5,
      drift: -8 + Math.random() * 16,    // horizontal drift
      opacity: 0.15 + Math.random() * 0.35,
      duration: 1.8 + Math.random() * 1.2,
    }))
  ).current;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {active && particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '48%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `rgba(255, 255, 255, ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(240, 180, 41, 0.15)`,
            animation: `chalkDust ${p.duration}s ease-out ${p.delay}s both`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes chalkDust {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(1);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--drift), -60px) scale(0.3);
          }
        }
      `}</style>
    </div>
  );
}

// ─── SVG "Slate" stroke path ──────────────────────────────────────────────
// Hand-tuned SVG paths that approximate elegant serif letterforms.
// Each letter is a single stroke path for the draw-on animation.
function SlateStrokeSVG({ drawing }: { drawing: boolean }) {
  // We use text with stroke-dasharray/dashoffset animation for the draw effect.
  // This is more reliable than hand-drawn paths and uses the actual font.
  return (
    <svg
      viewBox="0 0 480 120"
      width="480"
      height="120"
      style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}
    >
      <defs>
        {/* Glow filter for the chalk luminosity */}
        <filter id="chalkGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="1 0 0 0 0.06
                    0 1 0 0 0.04
                    0 0 1 0 0.02
                    0 0 0 0.6 0"
            result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Gold shimmer gradient that moves along the stroke */}
        <linearGradient id="chalkShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="60%" stopColor="#F5E6C8" stopOpacity="1" />
          <stop offset="80%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#F0E0C0" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* "Slate" text — drawn with stroke animation */}
      <text
        x="50%"
        y="95"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="110"
        fontWeight="900"
        fill="none"
        stroke="url(#chalkShimmer)"
        strokeWidth="1.8"
        filter="url(#chalkGlow)"
        style={{
          strokeDasharray: 1600,
          strokeDashoffset: drawing ? 0 : 1600,
          transition: 'stroke-dashoffset 2.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        Slate
      </text>

      {/* Fill that fades in after the stroke completes */}
      <text
        x="50%"
        y="95"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="110"
        fontWeight="900"
        fill="#FFFFFF"
        style={{
          opacity: drawing ? 1 : 0,
          transition: 'opacity 1.2s ease 2.2s',
        }}
      >
        Slate
      </text>

      {/* Subtle chalk texture overlay on the filled text */}
      <text
        x="50%"
        y="95"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="110"
        fontWeight="900"
        fill="url(#chalkShimmer)"
        style={{
          opacity: drawing ? 0.15 : 0,
          transition: 'opacity 1s ease 2.6s',
        }}
      >
        Slate
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<'splash' | 'fadeout' | 'disclaimer'>('splash');
  const [drawing, setDrawing] = useState(false);
  const [periodVisible, setPeriodVisible] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    // Cinematic sequence — every beat is intentional
    const timers = [
      setTimeout(() => setBadgeVisible(true), 300),       // badge fades in
      setTimeout(() => setDrawing(true), 800),             // stroke begins
      setTimeout(() => setDustActive(true), 2600),         // dust as stroke nears end
      setTimeout(() => setPeriodVisible(true), 3200),      // gold period drops
      setTimeout(() => setDotsVisible(true), 3800),        // module dots cascade
      setTimeout(() => setSubtitleVisible(true), 4200),    // subtitle
      setTimeout(() => setFooterVisible(true), 4400),      // footer
      setTimeout(() => setPhase('fadeout'), 6000),         // begin fade
      setTimeout(() => setPhase('disclaimer'), 6600),      // show disclaimer
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Disclaimer Modal ──
  if (phase === 'disclaimer') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(ellipse at 50% 40%, ${BG_CENTER} 0%, ${BG_MID} 55%, ${BG_BASE} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeInDisclaimer 0.6s ease forwards',
      }}>
        <style>{`
          @keyframes fadeInDisclaimer {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUpModal {
            from { opacity: 0; transform: translateY(24px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '52px 44px',
          maxWidth: 500,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 32px 100px rgba(0,0,0,0.6)',
          animation: 'slideUpModal 0.5s ease 0.1s both',
        }}>
          <div style={{
            fontSize: 11,
            fontFamily: font.mono,
            letterSpacing: 2.5,
            color: brand.gold,
            fontWeight: 700,
            marginBottom: 18,
            textTransform: 'uppercase' as const,
          }}>
            Important Notice
          </div>
          <h2 style={{
            fontFamily: font.serif,
            fontSize: 24,
            fontWeight: 700,
            color: '#0A0E14',
            margin: '0 0 18px',
          }}>
            Illustrative Platform Demo
          </h2>
          <p style={{
            fontFamily: font.sans,
            fontSize: 14,
            lineHeight: 1.75,
            color: '#4A5568',
            margin: '0 0 10px',
          }}>
            All data, organizations, names, figures, and scenarios in Slate
            are <strong style={{ color: '#0A0E14' }}>fictional and for demonstration purposes only</strong>.
            This platform is not connected to any live systems and does not
            represent any real institution, school network, or organization.
          </p>
          <p style={{
            fontFamily: font.sans,
            fontSize: 14,
            lineHeight: 1.75,
            color: '#4A5568',
            margin: '0 0 32px',
          }}>
            Slate is a product design concept by <strong style={{ color: '#0A0E14' }}>Madden Education Advisory</strong>.
          </p>
          <button
            onClick={() => onEnter()}
            style={{
              fontFamily: font.sans,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: '#FFFFFF',
              background: BG_BASE,
              border: 'none',
              borderRadius: 8,
              padding: '15px 36px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = '#22262E';
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = BG_BASE;
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            I Understand — Enter Slate
          </button>
        </div>
      </div>
    );
  }

  // ── Main Splash ──
  const isFadingOut = phase === 'fadeout';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: `radial-gradient(ellipse at 50% 38%, ${BG_CENTER} 0%, ${BG_MID} 50%, ${BG_BASE} 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      opacity: isFadingOut ? 0 : 1,
      transition: 'opacity 0.6s ease',
      paddingBottom: 80,
    }}>
      {/* Slate stone texture — very subtle noise */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 35% 25%, rgba(183,145,69,0.03) 0%, transparent 50%),
          radial-gradient(circle at 65% 75%, rgba(183,145,69,0.02) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Faint horizontal line — like the surface of a polished slate */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '20%',
        right: '20%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.03) 70%, transparent)',
        pointerEvents: 'none',
        transform: 'translateY(30px)',
      }} />

      {/* Chalk dust particles */}
      <ChalkDust active={dustActive} />

      {/* Confidential badge */}
      <div style={{
        opacity: badgeVisible ? 1 : 0,
        transform: badgeVisible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'all 0.8s ease',
        marginBottom: 56,
      }}>
        <div style={{
          fontFamily: font.mono,
          fontSize: 11,
          letterSpacing: 3.5,
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase' as const,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '10px 28px',
        }}>
          Platform Design System — Version 3.0 — Confidential
        </div>
      </div>

      {/* The Mark — SVG stroke-drawn "Slate" + gold period */}
      <div style={{
        position: 'relative',
        marginBottom: 18,
        width: 520,
        height: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <SlateStrokeSVG drawing={drawing} />
        {/* Gold period — positioned at the end of "Slate" */}
        <span style={{
          position: 'absolute',
          right: 12,
          bottom: -2,
          fontFamily: font.serif,
          fontSize: 88,
          fontWeight: 900,
          color: brand.gold,
          opacity: periodVisible ? 1 : 0,
          transform: periodVisible ? 'scale(1)' : 'scale(0)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textShadow: periodVisible ? `0 0 20px ${brand.gold}60, 0 0 40px ${brand.gold}20` : 'none',
          lineHeight: 1,
        }}>.</span>
      </div>

      {/* Tagline — appears after the stroke */}
      <div style={{
        opacity: periodVisible ? 1 : 0,
        transform: periodVisible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 0.8s ease 0.3s',
        fontFamily: font.mono,
        fontSize: 13,
        letterSpacing: 5,
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase' as const,
        marginBottom: 44,
      }}>
        Start with the Facts
      </div>

      {/* Module dots */}
      <div style={{
        display: 'flex',
        gap: 28,
        alignItems: 'center',
        marginBottom: 20,
        opacity: dotsVisible ? 1 : 0,
        transition: 'all 0.8s ease',
      }}>
        {MODULE_DOTS.map((mod, i) => (
          <div key={mod.label} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            opacity: dotsVisible ? 1 : 0,
            transform: dotsVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: `all 0.4s ease ${i * 0.06}s`,
          }}>
            <div style={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: mod.color,
              boxShadow: `0 0 10px ${mod.color}50`,
            }} />
            <div style={{
              fontFamily: font.mono,
              fontSize: 8,
              letterSpacing: 1.8,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase' as const,
            }}>
              {mod.label}
            </div>
          </div>
        ))}
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: subtitleVisible ? 1 : 0,
        transition: 'all 1s ease',
        fontFamily: font.sans,
        fontSize: 15,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 1.2,
        marginTop: 28,
      }}>
        Intelligence for School Systems
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        opacity: footerVisible ? 1 : 0,
        transition: 'all 1s ease',
      }}>
        <div style={{
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: 3,
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase' as const,
          fontWeight: 600,
        }}>
          Madden Education Advisory
        </div>
        <div style={{
          fontFamily: font.mono,
          fontSize: 9,
          letterSpacing: 2.5,
          color: 'rgba(255,255,255,0.15)',
          textTransform: 'uppercase' as const,
        }}>
          Intelligence for School Systems
        </div>
        <div style={{
          fontFamily: font.mono,
          fontSize: 8,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.1)',
          textTransform: 'uppercase' as const,
        }}>
          Proprietary & Confidential · All Rights Reserved · 2026
        </div>
        {/* Easter egg icons — the family */}
        <div style={{
          display: 'flex',
          gap: 14,
          marginTop: 10,
          fontSize: 15,
          opacity: 0.12,
        }}>
          <span title="Mike">🐇</span>
          <span title="Wife">🦋</span>
          <span title="Kid">🐩</span>
        </div>
      </div>
    </div>
  );
}
