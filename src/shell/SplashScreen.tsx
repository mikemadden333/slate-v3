/**
 * Slate v3 — Splash Screen: "Clean Slate"
 *
 * Each letter of "Slate" is DRAWN — the actual glyph outline traces itself
 * as if being written by an invisible hand. Not a reveal, not a fade — the
 * pen traces the path of each letter in sequence: S... l... a... t... e...
 * Then the fill materializes behind the strokes. Then the gold period settles.
 *
 * The SVG paths are extracted from Playfair Display Black (900 weight)
 * using fonttools. Each path is animated with stroke-dasharray/dashoffset.
 *
 * Design: restraint, motion, story. Sharp, classy, modern.
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

// ─── Background palette (matches app sidebar — rich deep slate gray) ────
const BG_CENTER = '#1E2735';  // Lighter center for glass-like depth
const BG_MID    = '#171F2C';  // Mid tone
const BG_BASE   = '#131A25';  // Deep base — matches sidebar

// ─── Letter path data (Playfair Display Black, extracted via fonttools) ──
const LETTERS = [
  {
    char: 'S',
    xOffset: 0,
    pathLength: 4011,
    path: 'M302 722Q367 722 403.0 709.0Q439 696 464 682Q476 675 483.5 671.5Q491 668 498 668Q508 668 512.5 679.0Q517 690 520 712H543Q542 691 540.5 663.0Q539 635 538.5 589.0Q538 543 538 468H515Q511 523 489.5 575.0Q468 627 430.5 661.0Q393 695 341 695Q297 695 268.0 671.0Q239 647 239 602Q239 565 257.0 538.5Q275 512 313.5 483.0Q352 454 415 410Q460 379 496.5 348.0Q533 317 555.0 278.0Q577 239 577 184Q577 117 539.5 73.0Q502 29 440.0 7.5Q378 -14 305 -14Q237 -14 196.5 -2.0Q156 10 128 23Q106 37 94 37Q84 37 79.5 26.0Q75 15 72 -7H49Q51 19 51.5 53.5Q52 88 52.5 143.0Q53 198 53 283H76Q80 213 98.5 152.0Q117 91 155.5 53.5Q194 16 258 16Q295 16 321.5 27.5Q348 39 363.0 61.0Q378 83 378 114Q378 156 359.0 187.5Q340 219 307.5 246.5Q275 274 232 302Q185 334 144.0 366.0Q103 398 78.5 438.0Q54 478 54 533Q54 599 89.0 640.5Q124 682 181.0 702.0Q238 722 302 722Z',
  },
  {
    char: 'l',
    xOffset: 613,
    pathLength: 2184,
    path: 'M254 782V93Q254 51 266.5 36.0Q279 21 310 21V0Q290 1 250.0 2.5Q210 4 168 4Q126 4 83.0 2.5Q40 1 18 0V21Q49 21 61.5 36.0Q74 51 74 93V662Q74 707 62.0 728.5Q50 750 18 750V771Q50 768 80 768Q130 768 173.5 771.5Q217 775 254 782Z',
  },
  {
    char: 'a',
    xOffset: 941,
    pathLength: 3214,
    path: 'M156 -7Q109 -7 79.0 11.0Q49 29 35.5 58.0Q22 87 22 119Q22 161 41.0 187.5Q60 214 90.5 230.5Q121 247 155.0 258.0Q189 269 219.5 279.5Q250 290 269.0 304.5Q288 319 288 342V431Q288 447 282.5 466.0Q277 485 262.0 499.0Q247 513 217 513Q201 513 186.5 508.5Q172 504 161 496Q196 483 212.0 459.5Q228 436 228 408Q228 368 200.0 345.0Q172 322 134 322Q94 322 72.0 347.0Q50 372 50 409Q50 440 65.5 461.5Q81 483 112 501Q142 518 184.0 525.5Q226 533 272 533Q321 533 363.0 523.5Q405 514 435 483Q456 461 462.0 428.0Q468 395 468 343V75Q468 50 471.5 41.0Q475 32 484 32Q492 32 499.5 37.0Q507 42 514 47L524 30Q502 11 469.5 2.0Q437 -7 401 -7Q358 -7 334.5 3.5Q311 14 301.5 31.5Q292 49 291 69Q270 36 238.5 14.5Q207 -7 156 -7ZM251 73Q262 73 270.5 76.5Q279 80 288 90V301Q281 288 269.5 275.5Q258 263 246.0 250.0Q234 237 223.5 222.0Q213 207 206.5 187.5Q200 168 200 142Q200 104 214.5 88.5Q229 73 251 73Z',
  },
  {
    char: 't',
    xOffset: 1472,
    pathLength: 2177,
    path: 'M252 681V519H350V499H252V84Q252 65 259.0 56.5Q266 48 282 48Q293 48 308.0 54.5Q323 61 336 77L351 65Q330 29 295.5 7.5Q261 -14 209 -14Q176 -14 149.5 -5.5Q123 3 106 20Q84 42 78.0 74.5Q72 107 72 159V499H-4V519H72V637Q125 637 168.5 647.5Q212 658 252 681Z',
  },
  {
    char: 'e',
    xOffset: 1822,
    pathLength: 2826,
    path: 'M288 533Q376 533 426.5 481.5Q477 430 477 309H164L162 328H331Q332 377 327.0 418.5Q322 460 311.0 485.0Q300 510 281 510Q254 510 237.0 467.5Q220 425 215 322L219 314Q218 304 218.0 294.0Q218 284 218 273Q218 203 235.5 164.0Q253 125 279.5 110.0Q306 95 333 95Q347 95 366.5 99.0Q386 103 409.0 117.5Q432 132 454 162L471 156Q459 116 432.5 76.5Q406 37 364.0 11.5Q322 -14 262 -14Q198 -14 145.5 12.0Q93 38 62.0 98.0Q31 158 31 259Q31 355 65.0 415.5Q99 476 157.5 504.5Q216 533 288 533Z',
  },
];

const UPEM = 1000;
const TOTAL_WIDTH = 2325;

// ─── Gold Flecks ────────────────────────────────────────────────────────
// Subtle gold motes that gently fall away from the gold period dot.
// All flecks originate from the period's position — like tiny sparks
// drifting off the dot as it appears.
function GoldFlecks({ active }: { active: boolean }) {
  const flecks = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      // All originate from the gold period dot area
      // The period is at ~76% horizontal in the SVG (x=2385 of 2500 viewBox width)
      // and vertically centered around ~42% of the page
      x: 73 + (Math.random() - 0.5) * 4,  // tight cluster around the dot
      startY: 40 + (Math.random() - 0.5) * 3,
      delay: 0.1 + Math.random() * 1.8,  // staggered gently
      size: 1.5 + Math.random() * 2,     // small and delicate
      drift: -12 + Math.random() * 24,   // gentle horizontal wander
      fallDistance: 25 + Math.random() * 50, // gentle fall
      opacity: 0.35 + Math.random() * 0.3,  // subtle
      duration: 2.5 + Math.random() * 2.5,  // slow, graceful
    })), []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes goldFleckDrift {
          0% { opacity: 0; transform: translate(0, 0) scale(0.3); }
          10% { opacity: var(--f-opacity); transform: translate(1px, 2px) scale(1); }
          60% { opacity: calc(var(--f-opacity) * 0.6); }
          100% { opacity: 0; transform: translate(var(--f-drift), var(--f-fall)) scale(0.1); }
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
            boxShadow: `0 0 ${f.size * 1.5}px ${brand.gold}60`,
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

// ─── Drawn Text ─────────────────────────────────────────────────────────
// Each letter's outline traces itself via stroke-dashoffset animation,
// then the fill fades in. Letters are sequenced with staggered delays.
function DrawnText({ drawPhase, fillVisible, showPeriod }: {
  drawPhase: number; // 0=nothing, 1=drawing S, 2=drawing l, 3=a, 4=t, 5=e, 6=done
  fillVisible: boolean;
  showPeriod: boolean;
}) {
  // Timing: each letter takes ~0.5s to draw, with slight overlaps
  // drawPhase maps to which letters have started drawing
  const getLetterState = (index: number) => {
    if (drawPhase > index + 1) return 'drawn';  // fully traced
    if (drawPhase > index) return 'drawing';      // currently tracing
    return 'hidden';                               // not started
  };

  return (
    <div style={{ position: 'relative', width: 520, height: 140 }}>
      <svg
        viewBox={`0 -50 ${TOTAL_WIDTH} ${UPEM + 100}`}
        width="520"
        height="140"
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          {/* Chalk grain — rougher, more visible texture like real chalk */}
          <filter id="chalkGrain" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="5" seed="42" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="grayNoise" />
            <feComponentTransfer in="grayNoise" result="thresh">
              <feFuncA type="discrete" tableValues="0 0 0.2 0.5 0.7 0.85 0.95 1" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="thresh" operator="in" />
          </filter>

          {/* Rough edge filter for strokes — makes them look chalky, not digital */}
          <filter id="roughEdge" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" seed="3" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Warm stroke gradient */}
          <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E8DCC0" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8DCC0" />
          </linearGradient>
        </defs>

        {/* Fill layer — fades in after all strokes complete */}
        {LETTERS.map((letter, i) => (
          <g key={`fill-${i}`} transform={`translate(${letter.xOffset}, 0) scale(1,-1) translate(0,-${UPEM})`}>
            {/* Base white fill — slightly rough */}
            <path
              d={letter.path}
              fill="#FFFFFF"
              filter="url(#roughEdge)"
              style={{
                opacity: fillVisible ? 0.85 : 0,
                transition: `opacity 0.8s ease ${i * 0.08}s`,
              }}
            />
            {/* Chalk grain overlay — more visible */}
            <path
              d={letter.path}
              fill="#E8DCC0"
              filter="url(#chalkGrain)"
              style={{
                opacity: fillVisible ? 0.5 : 0,
                transition: `opacity 0.8s ease ${i * 0.08}s`,
              }}
            />
          </g>
        ))}

        {/* Stroke layer — each letter traces itself */}
        {LETTERS.map((letter, i) => {
          const state = getLetterState(i);
          const isDrawing = state === 'drawing';
          const isDrawn = state === 'drawn';

          return (
            <g key={`stroke-${i}`} transform={`translate(${letter.xOffset}, 0) scale(1,-1) translate(0,-${UPEM})`}>
              <path
                d={letter.path}
                fill="none"
                stroke="url(#strokeGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#roughEdge)"
                style={{
                  strokeDasharray: letter.pathLength,
                  strokeDashoffset: (isDrawing || isDrawn) ? 0 : letter.pathLength,
                  transition: isDrawing
                    ? `stroke-dashoffset 0.55s cubic-bezier(0.25, 0.1, 0.25, 1)`
                    : 'none',
                  opacity: (isDrawing || isDrawn) ? (fillVisible ? 0 : 1) : 0,
                }}
              />
            </g>
          );
        })}

        {/* Gold period */}
        <g transform={`translate(2325, 0) scale(1,-1) translate(0,-${UPEM})`}>
          <circle
            cx="60"
            cy="60"
            r="50"
            fill={brand.gold}
            style={{
              opacity: showPeriod ? 1 : 0,
              transition: 'opacity 0.5s ease',
              filter: `drop-shadow(0 0 8px ${brand.gold}40)`,
            } as React.CSSProperties}
          />
        </g>
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<'splash' | 'fadeout' | 'disclaimer'>('splash');
  const [drawPhase, setDrawPhase] = useState(0);
  const [fillVisible, setFillVisible] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const debug = window.location.search.includes('debug');

    // Letter drawing sequence — each letter starts 0.45s after the previous
    // S starts at 0.8s, then l at 1.25s, a at 1.7s, t at 2.15s, e at 2.6s
    const DRAW_START = 800;
    const LETTER_GAP = 450;

    const timers = [
      setTimeout(() => setBadgeVisible(true), 300),

      // Draw each letter in sequence
      setTimeout(() => setDrawPhase(1), DRAW_START),           // S
      setTimeout(() => setDrawPhase(2), DRAW_START + LETTER_GAP),     // l
      setTimeout(() => setDrawPhase(3), DRAW_START + LETTER_GAP * 2), // a
      setTimeout(() => setDrawPhase(4), DRAW_START + LETTER_GAP * 3), // t
      setTimeout(() => setDrawPhase(5), DRAW_START + LETTER_GAP * 4), // e
      setTimeout(() => setDrawPhase(6), DRAW_START + LETTER_GAP * 5), // done

      // Gold flecks start when the period appears
      setTimeout(() => setDustActive(true), DRAW_START + LETTER_GAP * 5 + 600),

      // Fill materializes after all strokes complete
      setTimeout(() => setFillVisible(true), DRAW_START + LETTER_GAP * 5 + 200),

      // Period settles in
      setTimeout(() => setShowPeriod(true), DRAW_START + LETTER_GAP * 5 + 600),

      // Rest cascades
      setTimeout(() => setTaglineVisible(true), DRAW_START + LETTER_GAP * 5 + 1000),
      setTimeout(() => setDotsVisible(true), DRAW_START + LETTER_GAP * 5 + 1400),
      setTimeout(() => setSubtitleVisible(true), DRAW_START + LETTER_GAP * 5 + 1800),
      setTimeout(() => setFooterVisible(true), DRAW_START + LETTER_GAP * 5 + 2000),

      // Auto-advance
      ...(debug ? [] : [
        setTimeout(() => setPhase('fadeout'), DRAW_START + LETTER_GAP * 5 + 3500),
        setTimeout(() => setPhase('disclaimer'), DRAW_START + LETTER_GAP * 5 + 4100),
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
      {/* Subtle warm light */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 40% 35%, rgba(240,180,41,0.025) 0%, transparent 45%),
          radial-gradient(circle at 60% 65%, rgba(183,145,69,0.015) 0%, transparent 40%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Gold flecks */}
      <GoldFlecks active={dustActive} />

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

      {/* The Drawing — "Slate." traced letter by letter */}
      <div style={{ marginBottom: 14 }}>
        <DrawnText drawPhase={drawPhase} fillVisible={fillVisible} showPeriod={showPeriod} />
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
