/**
 * Slate v3 — Splash Screen: "Clean Slate"
 *
 * Uses an AI-generated photorealistic chalk-on-slate image as the hero.
 * The word "Slate." is revealed left-to-right via clip-path animation,
 * simulating the act of writing. Gold flecks drift gently from the
 * gold period dot. The slate surface IS the background — immersive.
 *
 * Design: authentic, cinematic, restrained. Sharp, classy, modern.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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

// ─── Background palette ────────────────────────────────────────────────
const BG_CENTER = '#1A1D23';
const BG_MID    = '#131619';
const BG_BASE   = '#0D1117';

// ─── Gold Flecks ────────────────────────────────────────────────────────
// Subtle gold motes that drift gently downward from the gold period area.
// Anchored to the period position — not scattered across the whole screen.
function GoldFlecks({ active }: { active: boolean }) {
  const flecks = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      // Clustered around the gold period position (right side of text, ~72% from left)
      x: 64 + Math.random() * 16,
      startY: 38 + Math.random() * 6,
      delay: 0.1 + Math.random() * 2.0,
      size: 2 + Math.random() * 2.5,
      drift: -8 + Math.random() * 16,
      fallDistance: 30 + Math.random() * 60,
      opacity: 0.4 + Math.random() * 0.3,
      duration: 2.5 + Math.random() * 2.0,
    })), []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', overflow: 'hidden',
      zIndex: 3,
    }}>
      <style>{`
        @keyframes goldFleckDrift {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          15% { opacity: var(--f-opacity); transform: translate(1px, 3px) scale(1); }
          55% { opacity: var(--f-opacity); }
          100% { opacity: 0; transform: translate(var(--f-drift), var(--f-fall)) scale(0.15); }
        }
      `}</style>
      {active && flecks.map(f => (
        <div
          key={f.id}
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            top: `${f.startY}%`,
            width: f.size,
            height: f.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brand.gold} 0%, ${brand.brass} 80%)`,
            boxShadow: `0 0 ${f.size * 2}px ${brand.gold}70, 0 0 ${f.size * 4}px ${brand.gold}25`,
            animation: `goldFleckDrift ${f.duration}s ease-out ${f.delay}s both`,
            ['--f-drift' as string]: `${f.drift}px`,
            ['--f-fall' as string]: `${f.fallDistance}px`,
            ['--f-opacity' as string]: f.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Chalk Image with Writing Reveal ────────────────────────────────────
// The AI-generated chalk image is revealed left-to-right using clip-path,
// driven by requestAnimationFrame for smooth 60fps animation.
function ChalkReveal({ revealActive }: { revealActive: boolean }) {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const DURATION = 2400; // ms — the "writing" duration

  useEffect(() => {
    if (!revealActive) return;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      // Ease-out cubic for natural hand deceleration
      const t = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [revealActive]);

  return (
    <div style={{
      position: 'relative',
      width: 700,
      height: 220,
      overflow: 'hidden',
    }}>
      {/* The chalk image — clipped to reveal left-to-right, with aggressive edge blend */}
      <img
        src="/chalk-slate-1.png"
        alt="Slate."
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 45%',
          clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
          transition: revealActive ? 'none' : undefined,
          // Aggressive edge mask — only the text center is fully visible
          WebkitMaskImage: `
            linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%),
            linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)
          `,
          WebkitMaskComposite: 'destination-in' as any,
          maskImage: `
            linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%),
            linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)
          `,
          maskComposite: 'intersect',
        } as React.CSSProperties}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<'splash' | 'fadeout' | 'disclaimer'>('splash');
  const [revealActive, setRevealActive] = useState(false);
  const [flecksActive, setFlecksActive] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const debug = window.location.search.includes('debug');

    const WRITE_START = 800;
    const WRITE_DURATION = 2400;

    const timers = [
      setTimeout(() => setBadgeVisible(true), 300),

      // Start the writing reveal
      setTimeout(() => setRevealActive(true), WRITE_START),

      // Gold flecks start near the end of writing (when period area reveals)
      setTimeout(() => setFlecksActive(true), WRITE_START + WRITE_DURATION * 0.75),

      // Cascade the rest
      setTimeout(() => setTaglineVisible(true), WRITE_START + WRITE_DURATION + 400),
      setTimeout(() => setDotsVisible(true), WRITE_START + WRITE_DURATION + 800),
      setTimeout(() => setSubtitleVisible(true), WRITE_START + WRITE_DURATION + 1200),
      setTimeout(() => setFooterVisible(true), WRITE_START + WRITE_DURATION + 1400),

      // Auto-advance
      ...(debug ? [] : [
        setTimeout(() => setPhase('fadeout'), WRITE_START + WRITE_DURATION + 3200),
        setTimeout(() => setPhase('disclaimer'), WRITE_START + WRITE_DURATION + 3800),
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
      {/* Gold flecks — anchored to the period area */}
      <GoldFlecks active={flecksActive} />

      {/* Confidential badge */}
      <div style={{
        opacity: badgeVisible ? 1 : 0,
        transform: badgeVisible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'all 0.8s ease',
        marginBottom: 48,
        zIndex: 2,
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

      {/* The Chalk Image — revealed left-to-right like writing */}
      <div style={{ marginBottom: 14, zIndex: 2 }}>
        <ChalkReveal revealActive={revealActive} />
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
        zIndex: 2,
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
        zIndex: 2,
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
        zIndex: 2,
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
        zIndex: 2,
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
