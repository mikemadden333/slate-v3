/**
 * Slate v3 — Splash Screen: "Clean Slate"
 *
 * The word "Slate" is WRITTEN — revealed left to right as if an invisible
 * hand is writing it on a dark polished surface. Not cursive, not handwritten.
 * Still Playfair Display, still elegant. But the motion tells the story:
 * a clean slate, written fresh every time you enter.
 *
 * Design principles:
 * - Restraint over spectacle
 * - Motion tells the story; texture supports it
 * - A few perfect gold motes, not a particle shower
 * - Sharp, classy, modern — Cartier, not carnival
 */

import React, { useState, useEffect, useMemo } from 'react';
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

// ─── Background palette (matches app sidebar) ───────────────────────────
const BG_CENTER = '#1A1D23';
const BG_MID    = '#131619';
const BG_BASE   = '#0D1117';

// ─── Gold Dust ──────────────────────────────────────────────────────────
// A few perfect motes. Like chalk dust catching warm light in a quiet room.
// You almost wonder if you imagined them.
function GoldDust({ active }: { active: boolean }) {
  const motes = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      // Spread across the text width
      x: 30 + Math.random() * 40,
      startY: 36 + Math.random() * 8,
      delay: 0.2 + Math.random() * 1.8,
      size: 2 + Math.random() * 2.5,
      drift: -12 + Math.random() * 24,
      fallDistance: 20 + Math.random() * 50,
      opacity: 0.3 + Math.random() * 0.35,
      duration: 2.5 + Math.random() * 2.0,
    })), []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes dustDrift {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.6);
          }
          15% {
            opacity: var(--d-opacity);
            transform: translate(0, 2px) scale(1);
          }
          60% {
            opacity: var(--d-opacity);
          }
          100% {
            opacity: 0;
            transform: translate(var(--d-drift), var(--d-fall)) scale(0.3);
          }
        }
      `}</style>
      {active && motes.map(m => (
        <div
          key={m.id}
          style={{
            position: 'absolute',
            left: `${m.x}%`,
            top: `${m.startY}%`,
            width: m.size,
            height: m.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brand.gold} 0%, ${brand.brass} 100%)`,
            boxShadow: `0 0 ${m.size * 3}px ${brand.gold}60`,
            animation: `dustDrift ${m.duration}s ease-out ${m.delay}s both`,
            ['--d-drift' as string]: `${m.drift}px`,
            ['--d-fall' as string]: `${m.fallDistance}px`,
            ['--d-opacity' as string]: m.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── The Writing Reveal ─────────────────────────────────────────────────
// CSS clip-path wipe from left to right. The text is always there — it's
// revealed progressively, like an invisible hand writing it. The leading
// edge has a soft luminous glow, like chalk pressing down.
function WrittenText({ progress, showPeriod }: { progress: number; showPeriod: boolean }) {
  // progress: 0 = nothing visible, 1 = fully revealed
  // We use clip-path to reveal left-to-right
  const clipPercent = progress * 100;

  return (
    <div style={{ position: 'relative', width: 520, height: 130 }}>
      {/* The text, clipped to reveal left-to-right */}
      <div style={{
        position: 'relative',
        clipPath: `inset(0 ${100 - clipPercent}% 0 0)`,
        transition: 'none', // controlled by JS animation frame
      }}>
        {/* Chalk-textured text via SVG */}
        <svg
          viewBox="0 0 520 130"
          width="520"
          height="130"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            {/* Very subtle chalk grain — 95% clean, 5% texture */}
            <filter id="subtleChalk" x="-2%" y="-2%" width="104%" height="104%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="4"
                seed="7"
                result="noise"
              />
              <feColorMatrix
                in="noise"
                type="saturate"
                values="0"
                result="grayNoise"
              />
              <feComponentTransfer in="grayNoise" result="threshNoise">
                <feFuncA type="discrete" tableValues="0 0.1 0.4 0.7 0.85 0.95 1 1" />
              </feComponentTransfer>
              <feComposite in="SourceGraphic" in2="threshNoise" operator="in" />
            </filter>
          </defs>

          {/* Base: clean white fill for readability */}
          <text
            x="50%"
            y="100"
            textAnchor="middle"
            fontFamily="'Playfair Display', Georgia, serif"
            fontSize="115"
            fontWeight="900"
            fill="#FFFFFF"
            opacity="0.88"
          >
            Slate
          </text>

          {/* Overlay: chalk grain texture at low opacity */}
          <text
            x="50%"
            y="100"
            textAnchor="middle"
            fontFamily="'Playfair Display', Georgia, serif"
            fontSize="115"
            fontWeight="900"
            fill="#F0ECE4"
            filter="url(#subtleChalk)"
            opacity="0.35"
          >
            Slate
          </text>
        </svg>
      </div>

      {/* Leading edge glow — a soft warm light at the writing point */}
      {progress > 0.02 && progress < 0.98 && (
        <div style={{
          position: 'absolute',
          top: '15%',
          left: `${clipPercent - 1}%`,
          width: 3,
          height: '70%',
          background: `linear-gradient(180deg, transparent, rgba(240,180,41,0.15) 30%, rgba(255,255,255,0.12) 50%, rgba(240,180,41,0.15) 70%, transparent)`,
          filter: 'blur(6px)',
          pointerEvents: 'none',
          transition: 'none',
        }} />
      )}

      {/* Gold period — appears with a gentle settle after text is written */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}>
        <svg
          viewBox="0 0 520 130"
          width="520"
          height="130"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <text
            x="385"
            y="100"
            fontFamily="'Playfair Display', Georgia, serif"
            fontSize="115"
            fontWeight="900"
            fill={brand.gold}
            style={{
              opacity: showPeriod ? 1 : 0,
              transition: 'opacity 0.6s ease',
              filter: `drop-shadow(0 0 6px ${brand.gold}50)`,
            } as React.CSSProperties}
          >
            .
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<'splash' | 'fadeout' | 'disclaimer'>('splash');
  const [writeProgress, setWriteProgress] = useState(0);
  const [showPeriod, setShowPeriod] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  // Animate the writing progress with requestAnimationFrame for smoothness
  useEffect(() => {
    let startTime: number | null = null;
    let rafId: number;
    const WRITE_DELAY = 800;   // ms before writing starts
    const WRITE_DURATION = 2200; // ms to write the full word

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed >= WRITE_DELAY) {
        const writeElapsed = elapsed - WRITE_DELAY;
        // Ease-out cubic for natural hand deceleration
        const t = Math.min(writeElapsed / WRITE_DURATION, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setWriteProgress(eased);
      }

      if (elapsed < WRITE_DELAY + WRITE_DURATION + 100) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Sequence the rest of the elements
  useEffect(() => {
    const debug = window.location.search.includes('debug');
    const timers = [
      setTimeout(() => setBadgeVisible(true), 300),
      // Dust starts mid-write
      setTimeout(() => setDustActive(true), 1800),
      // Period appears after writing completes
      setTimeout(() => setShowPeriod(true), 3200),
      // Then the rest cascades in
      setTimeout(() => setTaglineVisible(true), 3800),
      setTimeout(() => setDotsVisible(true), 4200),
      setTimeout(() => setSubtitleVisible(true), 4600),
      setTimeout(() => setFooterVisible(true), 4800),
      // Auto-advance (unless debug mode)
      ...(debug ? [] : [
        setTimeout(() => setPhase('fadeout'), 6500),
        setTimeout(() => setPhase('disclaimer'), 7100),
      ]),
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
      {/* Very subtle warm light accent — barely perceptible */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 40% 35%, rgba(240,180,41,0.025) 0%, transparent 45%),
          radial-gradient(circle at 60% 65%, rgba(183,145,69,0.015) 0%, transparent 40%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Faint surface line — like a chalk ledge */}
      <div style={{
        position: 'absolute',
        top: '52%',
        left: '18%',
        right: '18%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.02) 70%, transparent)',
        pointerEvents: 'none',
      }} />

      {/* Gold dust — restrained, classy */}
      <GoldDust active={dustActive} />

      {/* Confidential badge */}
      <div style={{
        opacity: badgeVisible ? 1 : 0,
        transform: badgeVisible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'all 0.8s ease',
        marginBottom: 48,
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

      {/* The Writing — "Slate." revealed left to right */}
      <div style={{ marginBottom: 14 }}>
        <WrittenText progress={writeProgress} showPeriod={showPeriod} />
      </div>

      {/* Tagline */}
      <div style={{
        opacity: taglineVisible ? 1 : 0,
        transform: taglineVisible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 0.8s ease',
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
