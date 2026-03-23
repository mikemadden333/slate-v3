/**
 * Slate v3 — Splash Screen: "The Mark"
 *
 * Chalk-on-slate metaphor elevated to luxury brand level.
 * - Text has visible chalk grain texture via SVG turbulence filter
 * - Gold particle cascade — vibrant, visible embers that drift and fall
 * - Stroke-draw animation reveals the word, then chalk texture fills in
 * - Gold period sits tight against the text baseline
 *
 * $25,000/hour execution. Every pixel intentional.
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

// ─── Background palette ──────────────────────────────────────────────────
const BG_CENTER = '#1A1D23';
const BG_MID    = '#131619';
const BG_BASE   = '#0D1117';

// ─── Gold Particle Cascade ───────────────────────────────────────────────
// Vibrant gold sparks that cascade from the text area — like chalk dust
// catching golden light. Visible, warm, alive.
function GoldParticles({ active, phase }: { active: boolean; phase: number }) {
  // Wave 1: Main cascade — big, visible, dramatic
  const wave1 = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => {
      const isHero = i < 10;
      return {
        id: i,
        x: 28 + Math.random() * 44,
        startY: 34 + Math.random() * 12,
        delay: Math.random() * 1.5,
        size: isHero ? (6 + Math.random() * 6) : (3 + Math.random() * 4),
        drift: -50 + Math.random() * 100,
        fallDistance: 80 + Math.random() * 160,
        opacity: isHero ? (0.8 + Math.random() * 0.2) : (0.5 + Math.random() * 0.4),
        duration: 2.5 + Math.random() * 2.5,
        isGold: true,
        blur: 0,
      };
    }), []);

  // Wave 2: Period burst — concentrated near the period
  const wave2 = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i + 100,
      x: 50 + Math.random() * 14,
      startY: 36 + Math.random() * 10,
      delay: Math.random() * 0.8,
      size: 4 + Math.random() * 6,
      drift: -30 + Math.random() * 60,
      fallDistance: 60 + Math.random() * 120,
      opacity: 0.7 + Math.random() * 0.3,
      duration: 2.0 + Math.random() * 2.5,
      isGold: true,
      blur: 0,
    })), []);

  // Wave 3: Lingering ambient sparkles — smaller, slower, last longer
  const wave3 = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i + 200,
      x: 20 + Math.random() * 60,
      startY: 34 + Math.random() * 14,
      delay: 1.0 + Math.random() * 3.0,
      size: 1.5 + Math.random() * 2.5,
      drift: -20 + Math.random() * 40,
      fallDistance: 30 + Math.random() * 80,
      opacity: 0.3 + Math.random() * 0.5,
      duration: 3.0 + Math.random() * 3.0,
      isGold: Math.random() > 0.2,
      blur: Math.random() > 0.6 ? 1 : 0,
    })), []);

  const allParticles = phase >= 2
    ? [...wave1, ...wave2, ...wave3]
    : [...wave1, ...wave3];

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes goldFall {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          10% {
            opacity: var(--p-opacity);
          }
          40% {
            opacity: var(--p-opacity);
          }
          100% {
            opacity: 0;
            transform: translate(var(--p-drift), var(--p-fall)) scale(0.2) rotate(180deg);
          }
        }
        @keyframes goldTwinkle {
          0%, 100% { opacity: var(--p-opacity); }
          50% { opacity: calc(var(--p-opacity) * 0.4); }
        }
      `}</style>
      {active && allParticles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.startY}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.isGold
              ? `radial-gradient(circle, ${brand.gold} 0%, #D4941C 100%)`
              : 'radial-gradient(circle, #FFFFFF 0%, #E8DCC8 100%)',
            boxShadow: p.isGold
              ? `0 0 ${p.size * 4}px ${brand.gold}CC, 0 0 ${p.size * 8}px ${brand.gold}60, 0 0 ${p.size * 14}px ${brand.gold}25`
              : `0 0 ${p.size * 3}px rgba(255,255,255,0.7), 0 0 ${p.size * 6}px rgba(255,255,255,0.3)`,
            filter: p.blur ? `blur(${p.blur}px)` : 'none',
            animation: `goldFall ${p.duration}s ease-out ${p.delay}s both`,
            ['--p-drift' as string]: `${p.drift}px`,
            ['--p-fall' as string]: `${p.fallDistance}px`,
            ['--p-opacity' as string]: p.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── SVG Chalk Text ──────────────────────────────────────────────────────
// The key innovation: SVG turbulence filter creates chalk grain texture.
// The text is drawn with a stroke animation, then fills with a textured,
// slightly rough appearance — like real chalk on slate.
function ChalkText({ drawing, filled }: { drawing: boolean; filled: boolean }) {
  return (
    <svg
      viewBox="0 0 520 130"
      width="520"
      height="130"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        {/* Chalk grain texture — the secret sauce */}
        <filter id="chalkTexture" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            seed="2"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="grayNoise"
          />
          <feComponentTransfer in="grayNoise" result="threshNoise">
            <feFuncA type="discrete" tableValues="0 0 0.3 0.6 0.8 1 1 1" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="threshNoise" operator="in" />
        </filter>

        {/* Soft glow for the stroke phase */}
        <filter id="strokeGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="1 0.8 0.3 0 0
                    0.8 0.7 0.2 0 0
                    0.3 0.2 0.1 0 0
                    0 0 0 0.4 0"
            result="goldBlur" />
          <feMerge>
            <feMergeNode in="goldBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gold shimmer gradient for the stroke */}
        <linearGradient id="chalkStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E8D5B0" />
          <stop offset="30%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F5E6C8" />
          <stop offset="70%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E8D5B0" />
        </linearGradient>

        {/* Chalk fill — slightly warm white, not pure */}
        <linearGradient id="chalkFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0ECE4" />
          <stop offset="25%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F5F0E8" />
          <stop offset="75%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EDE8DF" />
        </linearGradient>
      </defs>

      {/* Layer 1: Stroke outline — drawn with animation, gold glow */}
      <text
        x="50%"
        y="100"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="115"
        fontWeight="900"
        fill="none"
        stroke="url(#chalkStroke)"
        strokeWidth="1.5"
        filter="url(#strokeGlow)"
        style={{
          strokeDasharray: 1800,
          strokeDashoffset: drawing ? 0 : 1800,
          transition: 'stroke-dashoffset 2.6s cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        Slate
      </text>

      {/* Layer 2: Chalk-textured fill — the grain makes it look like real chalk */}
      <text
        x="50%"
        y="100"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="115"
        fontWeight="900"
        fill="url(#chalkFill)"
        filter="url(#chalkTexture)"
        style={{
          opacity: filled ? 0.92 : 0,
          transition: 'opacity 1.0s ease',
        }}
      >
        Slate
      </text>

      {/* Layer 3: Clean fill underneath at lower opacity for readability */}
      <text
        x="50%"
        y="100"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="115"
        fontWeight="900"
        fill="#FFFFFF"
        style={{
          opacity: filled ? 0.7 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        Slate
      </text>

      {/* Layer 4: Gold period — rendered in SVG for perfect alignment */}
      <text
        x="74%"
        y="100"
        fontFamily="'Playfair Display', Georgia, serif"
        fontSize="115"
        fontWeight="900"
        fill={brand.gold}
        style={{
          opacity: filled ? 1 : 0,
          transform: filled ? 'scale(1)' : 'scale(0)',
          transformOrigin: '74% 80%',
          transition: 'opacity 0.4s ease 0.3s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
          filter: `drop-shadow(0 0 8px ${brand.gold}80) drop-shadow(0 0 20px ${brand.gold}30)`,
        } as React.CSSProperties}
      >
        .
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
  const [filled, setFilled] = useState(false);
  const [particlePhase, setParticlePhase] = useState(0);
  const [particlesActive, setParticlesActive] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setBadgeVisible(true), 300),
      setTimeout(() => setDrawing(true), 700),
      setTimeout(() => { setParticlesActive(true); setParticlePhase(1); }, 2200),
      setTimeout(() => setFilled(true), 2800),
      setTimeout(() => setParticlePhase(2), 3200),  // period particles
      setTimeout(() => setDotsVisible(true), 3800),
      setTimeout(() => setSubtitleVisible(true), 4200),
      setTimeout(() => setFooterVisible(true), 4400),
      setTimeout(() => setPhase('fadeout'), 6200),
      setTimeout(() => setPhase('disclaimer'), 6800),
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
      {/* Subtle slate stone texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 30% 20%, rgba(183,145,69,0.04) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(183,145,69,0.02) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Faint surface line */}
      <div style={{
        position: 'absolute',
        top: '52%',
        left: '15%',
        right: '15%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.025) 30%, rgba(255,255,255,0.035) 50%, rgba(255,255,255,0.025) 70%, transparent)',
        pointerEvents: 'none',
      }} />

      {/* Gold particle cascade */}
      <GoldParticles active={particlesActive} phase={particlePhase} />

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

      {/* The Mark — chalk-textured "Slate." */}
      <div style={{
        marginBottom: 14,
        width: 520,
      }}>
        <ChalkText drawing={drawing} filled={filled} />
      </div>

      {/* Tagline */}
      <div style={{
        opacity: filled ? 1 : 0,
        transform: filled ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 0.8s ease 0.4s',
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
