/**
 * Slate v3 — Splash Screen: "Glass Cathedral"
 *
 * Each letter of "Slate" is DRAWN — the actual glyph outline traces itself
 * as if being written by an invisible hand. Not a reveal, not a fade — the
 * pen traces the path of each letter in sequence: S... l... a... t... e...
 * Then the fill materializes behind the strokes. Then the gold period settles.
 *
 * v3.4 — MEA Brand Guide v1.0 — Deep Navy + Warm Gold + Cormorant Garamond + Jost
 * - Camera aperture iris that opens to reveal the glass surface
 * - 6 overlapping blades that rotate and spread apart
 * - Reflected "Slate." mirrored below (like text on a glass table)
 * - "Start with the Facts" glows bright white for emphasis
 * - Breathing ambient light pulse
 * - Frosted glass surface effect
 *
 * Design: restraint, motion, story. Sharp, classy, modern.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { brand, font } from '../core/theme';

// ─── Background palette — Deep Navy system ────
const BG_CENTER = '#122040';
const BG_MID    = '#0E1A32';
const BG_BASE   = '#0A1628';

// ─── Letter path data (Playfair Display Black) ──
const LETTERS = [
  { char: 'S', xOffset: 0, pathLength: 4011, path: 'M302 722Q367 722 403.0 709.0Q439 696 464 682Q476 675 483.5 671.5Q491 668 498 668Q508 668 512.5 679.0Q517 690 520 712H543Q542 691 540.5 663.0Q539 635 538.5 589.0Q538 543 538 468H515Q511 523 489.5 575.0Q468 627 430.5 661.0Q393 695 341 695Q297 695 268.0 671.0Q239 647 239 602Q239 565 257.0 538.5Q275 512 313.5 483.0Q352 454 415 410Q460 379 496.5 348.0Q533 317 555.0 278.0Q577 239 577 184Q577 117 539.5 73.0Q502 29 440.0 7.5Q378 -14 305 -14Q237 -14 196.5 -2.0Q156 10 128 23Q106 37 94 37Q84 37 79.5 26.0Q75 15 72 -7H49Q51 19 51.5 53.5Q52 88 52.5 143.0Q53 198 53 283H76Q80 213 98.5 152.0Q117 91 155.5 53.5Q194 16 258 16Q295 16 321.5 27.5Q348 39 363.0 61.0Q378 83 378 114Q378 156 359.0 187.5Q340 219 307.5 246.5Q275 274 232 302Q185 334 144.0 366.0Q103 398 78.5 438.0Q54 478 54 533Q54 599 89.0 640.5Q124 682 181.0 702.0Q238 722 302 722Z' },
  { char: 'l', xOffset: 613, pathLength: 2184, path: 'M254 782V93Q254 51 266.5 36.0Q279 21 310 21V0Q290 1 250.0 2.5Q210 4 168 4Q126 4 83.0 2.5Q40 1 18 0V21Q49 21 61.5 36.0Q74 51 74 93V662Q74 707 62.0 728.5Q50 750 18 750V771Q50 768 80 768Q130 768 173.5 771.5Q217 775 254 782Z' },
  { char: 'a', xOffset: 941, pathLength: 3214, path: 'M156 -7Q109 -7 79.0 11.0Q49 29 35.5 58.0Q22 87 22 119Q22 161 41.0 187.5Q60 214 90.5 230.5Q121 247 155.0 258.0Q189 269 219.5 279.5Q250 290 269.0 304.5Q288 319 288 342V431Q288 447 282.5 466.0Q277 485 262.0 499.0Q247 513 217 513Q201 513 186.5 508.5Q172 504 161 496Q196 483 212.0 459.5Q228 436 228 408Q228 368 200.0 345.0Q172 322 134 322Q94 322 72.0 347.0Q50 372 50 409Q50 440 65.5 461.5Q81 483 112 501Q142 518 184.0 525.5Q226 533 272 533Q321 533 363.0 523.5Q405 514 435 483Q456 461 462.0 428.0Q468 395 468 343V75Q468 50 471.5 41.0Q475 32 484 32Q492 32 499.5 37.0Q507 42 514 47L524 30Q502 11 469.5 2.0Q437 -7 401 -7Q358 -7 334.5 3.5Q311 14 301.5 31.5Q292 49 291 69Q270 36 238.5 14.5Q207 -7 156 -7ZM251 73Q262 73 270.5 76.5Q279 80 288 90V301Q281 288 269.5 275.5Q258 263 246.0 250.0Q234 237 223.5 222.0Q213 207 206.5 187.5Q200 168 200 142Q200 104 214.5 88.5Q229 73 251 73Z' },
  { char: 't', xOffset: 1472, pathLength: 2177, path: 'M252 681V519H350V499H252V84Q252 65 259.0 56.5Q266 48 282 48Q293 48 308.0 54.5Q323 61 336 77L351 65Q330 29 295.5 7.5Q261 -14 209 -14Q176 -14 149.5 -5.5Q123 3 106 20Q84 42 78.0 74.5Q72 107 72 159V499H-4V519H72V637Q125 637 168.5 647.5Q212 658 252 681Z' },
  { char: 'e', xOffset: 1822, pathLength: 2826, path: 'M288 533Q376 533 426.5 481.5Q477 430 477 309H164L162 328H331Q332 377 327.0 418.5Q322 460 311.0 485.0Q300 510 281 510Q254 510 237.0 467.5Q220 425 215 322L219 314Q218 304 218.0 294.0Q218 284 218 273Q218 203 235.5 164.0Q253 125 279.5 110.0Q306 95 333 95Q347 95 366.5 99.0Q386 103 409.0 117.5Q432 132 454 162L471 156Q459 116 432.5 76.5Q406 37 364.0 11.5Q322 -14 262 -14Q198 -14 145.5 12.0Q93 38 62.0 98.0Q31 158 31 259Q31 355 65.0 415.5Q99 476 157.5 504.5Q216 533 288 533Z' },
];

const UPEM = 1000;
const TOTAL_WIDTH = 2325;

// ─── Aperture Iris — Smooth Camera Lens ──────────────────────────────────
function ApertureIris({ open }: { open: boolean }) {
  const BLADE_COUNT = 8;
  const blades = useMemo(() =>
    Array.from({ length: BLADE_COUNT }, (_, i) => ({
      id: i,
      angle: (360 / BLADE_COUNT) * i,
    })), []);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes irisOpen {
          0% { clip-path: inset(0% round 0%); opacity: 1; }
          70% { clip-path: inset(0% round 50%); opacity: 0.8; }
          100% { clip-path: inset(-10% round 50%); opacity: 0; }
        }
        @keyframes lensBladeOpen {
          0% {
            transform: rotate(var(--blade-angle)) translateX(0px);
            opacity: 1;
          }
          50% {
            transform: rotate(calc(var(--blade-angle) + 8deg)) translateX(40px);
            opacity: 0.8;
          }
          100% {
            transform: rotate(calc(var(--blade-angle) + 12deg)) translateX(520px);
            opacity: 0;
          }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0,
        animation: open ? 'irisOpen 2.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards' : 'none',
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="transparent" />
              <stop offset="50%" stopColor={BG_BASE} stopOpacity="0.6" />
              <stop offset="70%" stopColor={BG_BASE} />
              <stop offset="100%" stopColor={BG_BASE} />
            </radialGradient>
          </defs>
          {/* Smooth overlapping curved blades — like a real camera iris */}
          {blades.map(blade => (
            <g key={blade.id} style={{
              transformOrigin: '500px 500px',
              ['--blade-angle' as string]: `${blade.angle}deg`,
              animation: open
                ? `lensBladeOpen 2s cubic-bezier(0.25, 0.1, 0.25, 1) ${blade.id * 0.06}s forwards`
                : 'none',
              transform: `rotate(${blade.angle}deg)`,
            } as React.CSSProperties}>
              {/* Main blade — soft curved leaf shape */}
              <ellipse cx="500" cy="340" rx="260" ry="200"
                fill={BG_BASE}
                stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"
                style={{ filter: 'blur(0.5px)' }} />
              {/* Subtle highlight edge — mimics light catching the blade edge */}
              <ellipse cx="500" cy="345" rx="255" ry="195"
                fill="none"
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </g>
          ))}
          {/* Soft vignette overlay */}
          <circle cx="500" cy="500" r="500" fill="url(#irisGrad)"
            style={{ opacity: open ? 0 : 1, transition: 'opacity 1.5s ease 0.3s' }} />
        </svg>
      </div>
    </div>
  );
}

// ─── Ambient Light ──────────────────────────────────────────────────────
function AmbientLight({ active }: { active: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes ambientBreath { 0%, 100% { opacity: 0.015; } 50% { opacity: 0.04; } }
        @keyframes ambientDrift { 0% { transform: translate(-2%, -1%) scale(1); } 50% { transform: translate(2%, 1%) scale(1.05); } 100% { transform: translate(-2%, -1%) scale(1); } }
      `}</style>
      {active && (
        <>
          <div style={{
            position: 'absolute', width: '120%', height: '120%', top: '-10%', left: '-10%',
            background: 'radial-gradient(ellipse at 50% 45%, rgba(201,165,78,0.035) 0%, transparent 50%)',
            animation: 'ambientDrift 20s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: '100%', height: '100%',
            background: 'radial-gradient(ellipse at 30% 35%, rgba(91,141,184,0.015) 0%, transparent 45%), radial-gradient(ellipse at 70% 65%, rgba(184,201,219,0.01) 0%, transparent 40%)',
            animation: 'ambientDrift 25s ease-in-out 5s infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.03) 0%, transparent 60%)',
            animation: 'ambientBreath 8s ease-in-out infinite',
          }} />
        </>
      )}
    </div>
  );
}

// ─── Ambient Light Particles ─────────────────────────────────────────────
function AmbientParticles({ active }: { active: boolean }) {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 1 + Math.random() * 3, duration: 12 + Math.random() * 20,
      delay: Math.random() * 8, opacity: 0.04 + Math.random() * 0.1,
      drift: 15 + Math.random() * 40, isGold: Math.random() > 0.7,
    })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes ambientFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: var(--p-opacity); }
          85% { opacity: var(--p-opacity); }
          100% { transform: translateY(calc(var(--p-drift) * -1px)) translateX(var(--p-drift-x)); opacity: 0; }
        }
      `}</style>
      {active && particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%',
          background: p.isGold
            ? `radial-gradient(circle, rgba(201,165,78,${p.opacity * 2}) 0%, rgba(201,165,78,${p.opacity * 0.5}) 100%)`
            : `radial-gradient(circle, rgba(240,242,245,${p.opacity * 2.5}) 0%, rgba(184,201,219,${p.opacity * 0.5}) 100%)`,
          boxShadow: p.isGold ? `0 0 ${p.size * 2}px rgba(201,165,78,${p.opacity * 0.5})` : undefined,
          animation: `ambientFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          ['--p-opacity' as string]: p.opacity,
          ['--p-drift' as string]: p.drift,
          ['--p-drift-x' as string]: `${(Math.random() - 0.5) * 25}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ─── Gold Flecks ────────────────────────────────────────────────────────
function GoldFlecks({ active, periodRef, containerRef }: {
  active: boolean;
  periodRef: React.RefObject<SVGCircleElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active || !periodRef.current || !containerRef.current) return;
    const circle = periodRef.current.getBoundingClientRect();
    const container = containerRef.current.getBoundingClientRect();
    setPos({ x: circle.left + circle.width / 2 - container.left, y: circle.top + circle.height / 2 - container.top });
  }, [active, periodRef, containerRef]);

  const flecks = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i, offsetX: (Math.random() - 0.5) * 10, offsetY: (Math.random() - 0.5) * 10,
      delay: 0.1 + Math.random() * 2, size: 1.5 + Math.random() * 2.5,
      drift: -10 + Math.random() * 20, fallDistance: 20 + Math.random() * 70,
      opacity: 0.4 + Math.random() * 0.35, duration: 2.5 + Math.random() * 3,
    })), []);

  if (!pos) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <style>{`
        @keyframes goldFleckDrift {
          0% { opacity: 0; transform: translate(0, 0) scale(0.3); }
          10% { opacity: var(--f-opacity); transform: translate(1px, 2px) scale(1); }
          60% { opacity: calc(var(--f-opacity) * 0.6); }
          100% { opacity: 0; transform: translate(var(--f-drift), var(--f-fall)) scale(0.1); }
        }
      `}</style>
      {active && flecks.map(f => (
        <div key={f.id} style={{
          position: 'absolute', left: pos.x + f.offsetX, top: pos.y + f.offsetY,
          width: f.size, height: f.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${brand.gold} 0%, ${brand.mutedGold} 80%)`,
          boxShadow: `0 0 ${f.size * 2}px ${brand.gold}60`,
          animation: `goldFleckDrift ${f.duration}s ease-out ${f.delay}s both`,
          ['--f-drift' as string]: `${f.drift}px`,
          ['--f-fall' as string]: `${f.fallDistance}px`,
          ['--f-opacity' as string]: f.opacity,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ─── Drawn Text with Reflection ─────────────────────────────────────────
function DrawnText({ drawPhase, fillVisible, showPeriod, periodRef, isReflection = false }: {
  drawPhase: number; fillVisible: boolean; showPeriod: boolean;
  periodRef: React.RefObject<SVGCircleElement | null>; isReflection?: boolean;
}) {
  const getLetterState = (index: number) => {
    if (drawPhase > index + 1) return 'drawn';
    if (drawPhase > index) return 'drawing';
    return 'hidden';
  };

  const reflectionStyle: React.CSSProperties = isReflection ? {
    transform: 'scaleY(-1)',
    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 30%, transparent 65%)',
    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 30%, transparent 65%)',
    filter: 'blur(0.8px)',
    opacity: 0.35,
  } : {};

  const prefix = isReflection ? 'R' : '';

  return (
    <div style={{ position: 'relative', width: 520, height: isReflection ? 80 : 140, ...reflectionStyle }}>
      <svg viewBox={`0 -50 ${TOTAL_WIDTH} ${UPEM + 100}`} width="520" height={isReflection ? 80 : 140}
        style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <filter id={`chalkGrain${prefix}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="5" seed="42" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="grayNoise" />
            <feComponentTransfer in="grayNoise" result="thresh">
              <feFuncA type="discrete" tableValues="0 0 0.2 0.5 0.7 0.85 0.95 1" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="thresh" operator="in" />
          </filter>
          <filter id={`roughEdge${prefix}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" seed="3" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id={`strokeGrad${prefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={brand.ivory} />
            <stop offset="50%" stopColor={brand.white} />
            <stop offset="100%" stopColor={brand.ivory} />
          </linearGradient>
        </defs>

        {/* Fill layer */}
        {LETTERS.map((letter, i) => (
          <g key={`fill-${i}`} transform={`translate(${letter.xOffset}, 0) scale(1,-1) translate(0,-${UPEM})`}>
            <path d={letter.path} fill={brand.white} filter={`url(#roughEdge${prefix})`}
              style={{ opacity: fillVisible ? (isReflection ? 0.6 : 0.85) : 0, transition: `opacity 0.8s ease ${i * 0.08}s` }} />
            <path d={letter.path} fill={brand.ivory} filter={`url(#chalkGrain${prefix})`}
              style={{ opacity: fillVisible ? (isReflection ? 0.3 : 0.5) : 0, transition: `opacity 0.8s ease ${i * 0.08}s` }} />
          </g>
        ))}

        {/* Stroke layer — only for main text */}
        {!isReflection && LETTERS.map((letter, i) => {
          const state = getLetterState(i);
          const isDrawing = state === 'drawing';
          const isDrawn = state === 'drawn';
          return (
            <g key={`stroke-${i}`} transform={`translate(${letter.xOffset}, 0) scale(1,-1) translate(0,-${UPEM})`}>
              <path d={letter.path} fill="none" stroke={`url(#strokeGrad)`} strokeWidth="6"
                strokeLinecap="round" strokeLinejoin="round" filter="url(#roughEdge)"
                style={{
                  strokeDasharray: letter.pathLength,
                  strokeDashoffset: (isDrawing || isDrawn) ? 0 : letter.pathLength,
                  transition: isDrawing ? 'stroke-dashoffset 0.55s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
                  opacity: (isDrawing || isDrawn) ? (fillVisible ? 0 : 1) : 0,
                }} />
            </g>
          );
        })}

        {/* Gold period */}
        <g transform={`translate(2325, 0) scale(1,-1) translate(0,-${UPEM})`}>
          <circle ref={isReflection ? undefined : periodRef} cx="60" cy="60" r="50" fill={brand.gold}
            style={{
              opacity: showPeriod ? 1 : 0, transition: 'opacity 0.5s ease',
              filter: isReflection ? undefined : `drop-shadow(0 0 16px ${brand.gold}60)`,
            } as React.CSSProperties} />
        </g>
      </svg>
    </div>
  );
}

// ─── Glass Surface ──────────────────────────────────────────────────────
function GlassSurface({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: 'absolute', width: '80%', maxWidth: 700, height: 1,
      top: '50%', left: '50%', transform: 'translate(-50%, 70px)',
      opacity: visible ? 1 : 0, transition: 'opacity 2s ease', pointerEvents: 'none',
    }}>
      <div style={{
        width: '100%', height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 80%, transparent 100%)',
      }} />
      <div style={{
        width: '100%', height: 60,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
        maskImage: 'linear-gradient(90deg, transparent 5%, black 25%, black 75%, transparent 95%)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 5%, black 25%, black 75%, transparent 95%)',
      }} />
    </div>
  );
}

// ─── Glass Orb ──────────────────────────────────────────────────────────
function GlassOrb({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: 'absolute', width: 700, height: 700, borderRadius: '50%',
      background: 'radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 30%, transparent 60%), radial-gradient(ellipse at 65% 75%, rgba(201,165,78,0.01) 0%, transparent 50%)',
      border: '1px solid rgba(255,255,255,0.025)',
      boxShadow: 'inset 0 0 100px rgba(255,255,255,0.01), inset 0 -40px 80px rgba(0,0,0,0.1), 0 0 200px rgba(255,255,255,0.01)',
      opacity: visible ? 1 : 0, transition: 'opacity 3s ease', pointerEvents: 'none',
      top: '50%', left: '50%', transform: 'translate(-50%, -55%)',
    }} />
  );
}

// ─── Horizontal Rule ────────────────────────────────────────────────────
function GlassRule({ visible }: { visible: boolean }) {
  return (
    <div style={{
      width: 140, height: 1,
      background: `linear-gradient(90deg, transparent 0%, ${brand.gold}59 30%, ${brand.gold}80 50%, ${brand.gold}59 70%, transparent 100%)`,
      opacity: visible ? 1 : 0, transition: 'all 1.5s ease', margin: '0 auto',
      boxShadow: visible ? `0 0 12px ${brand.gold}26` : 'none',
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SplashScreenProps { onEnter: () => void; }

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<'iris' | 'splash' | 'fadeout' | 'disclaimer'>('iris');
  const [drawPhase, setDrawPhase] = useState(0);
  const [fillVisible, setFillVisible] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [taglineGlow, setTaglineGlow] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [orbVisible, setOrbVisible] = useState(false);
  const [particlesActive, setParticlesActive] = useState(false);
  const [ruleVisible, setRuleVisible] = useState(false);
  const [ambientActive, setAmbientActive] = useState(false);
  const [reflectionVisible, setReflectionVisible] = useState(false);
  const [glassSurfaceVisible, setGlassSurfaceVisible] = useState(false);
  const [irisOpen, setIrisOpen] = useState(false);
  const periodRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const debug = window.location.search.includes('debug');
    const IRIS_DELAY = 400;
    const IRIS_DURATION = 1600;
    const DRAW_START = IRIS_DELAY + IRIS_DURATION + 200;
    const LETTER_GAP = 450;

    const timers = [
      setTimeout(() => setIrisOpen(true), IRIS_DELAY),
      setTimeout(() => { setPhase('splash'); setAmbientActive(true); }, IRIS_DELAY + 600),
      setTimeout(() => setOrbVisible(true), IRIS_DELAY + 800),
      setTimeout(() => setParticlesActive(true), IRIS_DELAY + 1000),
      setTimeout(() => setBadgeVisible(true), DRAW_START - 300),
      setTimeout(() => setDrawPhase(1), DRAW_START),
      setTimeout(() => setDrawPhase(2), DRAW_START + LETTER_GAP),
      setTimeout(() => setDrawPhase(3), DRAW_START + LETTER_GAP * 2),
      setTimeout(() => setDrawPhase(4), DRAW_START + LETTER_GAP * 3),
      setTimeout(() => setDrawPhase(5), DRAW_START + LETTER_GAP * 4),
      setTimeout(() => setDrawPhase(6), DRAW_START + LETTER_GAP * 5),
      setTimeout(() => setDustActive(true), DRAW_START + LETTER_GAP * 5 + 600),
      setTimeout(() => setFillVisible(true), DRAW_START + LETTER_GAP * 5 + 200),
      setTimeout(() => setShowPeriod(true), DRAW_START + LETTER_GAP * 5 + 600),
      setTimeout(() => setGlassSurfaceVisible(true), DRAW_START + LETTER_GAP * 5 + 700),
      setTimeout(() => setReflectionVisible(true), DRAW_START + LETTER_GAP * 5 + 900),
      setTimeout(() => setRuleVisible(true), DRAW_START + LETTER_GAP * 5 + 1100),
      setTimeout(() => setTaglineVisible(true), DRAW_START + LETTER_GAP * 5 + 1300),
      setTimeout(() => setTaglineGlow(true), DRAW_START + LETTER_GAP * 5 + 1600),
      setTimeout(() => setTaglineGlow(false), DRAW_START + LETTER_GAP * 5 + 4000),
      setTimeout(() => setSubtitleVisible(true), DRAW_START + LETTER_GAP * 5 + 1800),
      setTimeout(() => setFooterVisible(true), DRAW_START + LETTER_GAP * 5 + 2200),
      ...(debug ? [] : [
        setTimeout(() => setPhase('fadeout'), DRAW_START + LETTER_GAP * 5 + 4200),
        setTimeout(() => setPhase('disclaimer'), DRAW_START + LETTER_GAP * 5 + 4800),
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
        <AmbientLight active={true} />
        <AmbientParticles active={true} />
        <style>{`
          @keyframes fadeInDisclaimer { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUpModal { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes glassShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>
        <div style={{
          background: 'rgba(18, 32, 56, 0.9)', backdropFilter: 'blur(40px)',
          borderRadius: 20, padding: '56px 48px', maxWidth: 520, width: '90%',
          textAlign: 'center', position: 'relative', zIndex: 1,
          boxShadow: '0 32px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)',
          animation: 'slideUpModal 0.5s ease 0.1s both',
        }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
              backgroundSize: '200% 100%', animation: 'glassShimmer 4s ease-in-out 0.5s 1 forwards', opacity: 0.3,
            }} />
          </div>
          <div style={{ fontSize: 11, fontFamily: font.mono, letterSpacing: 2.5, color: brand.gold, fontWeight: 500, marginBottom: 18, textTransform: 'uppercase' as const, position: 'relative' }}>
            Important Notice
          </div>
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 300, color: brand.white, margin: '0 0 18px', position: 'relative' }}>
            Illustrative Platform Demo
          </h2>
          <p style={{ fontFamily: font.body, fontSize: 14, lineHeight: 1.75, color: brand.iceBlue, margin: '0 0 10px', position: 'relative', fontWeight: 300 }}>
            All data, organizations, names, figures, and scenarios in Slate
            are <strong style={{ color: brand.white, fontWeight: 500 }}>fictional and for demonstration purposes only</strong>.
            This platform is not connected to any live systems and does not
            represent any real institution, school network, or organization.
          </p>
          <p style={{ fontFamily: font.body, fontSize: 14, lineHeight: 1.75, color: brand.iceBlue, margin: '0 0 32px', position: 'relative', fontWeight: 300 }}>
            Slate is a product design concept by <strong style={{ color: brand.white, fontWeight: 500 }}>Madden Education Advisory</strong>.
          </p>
          <button onClick={() => onEnter()} style={{
            fontFamily: font.body, fontSize: 14, fontWeight: 500, letterSpacing: 0.5, color: brand.navy,
            background: brand.gold, border: 'none', borderRadius: 10, padding: '16px 40px', cursor: 'pointer',
            transition: 'all 0.25s ease', position: 'relative', boxShadow: `0 4px 20px rgba(201,165,78,0.3)`,
          }}
            onMouseEnter={e => { const t = e.target as HTMLButtonElement; t.style.background = brand.mutedGold; t.style.transform = 'translateY(-2px)'; t.style.boxShadow = `0 8px 30px rgba(201,165,78,0.4)`; }}
            onMouseLeave={e => { const t = e.target as HTMLButtonElement; t.style.background = brand.gold; t.style.transform = 'translateY(0)'; t.style.boxShadow = `0 4px 20px rgba(201,165,78,0.3)`; }}
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
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', opacity: isFadingOut ? 0 : 1, transition: 'opacity 0.6s ease', paddingBottom: 80,
    }}>
      <ApertureIris open={irisOpen} />
      <AmbientLight active={ambientActive} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 40% 35%, rgba(201,165,78,0.03) 0%, transparent 45%), radial-gradient(circle at 60% 65%, rgba(212,185,120,0.02) 0%, transparent 40%)`,
      }} />

      <GlassOrb visible={orbVisible} />
      <GlassSurface visible={glassSurfaceVisible} />
      <AmbientParticles active={particlesActive} />

      {/* Confidential badge */}
      <div style={{
        opacity: badgeVisible ? 1 : 0, transform: badgeVisible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'all 0.8s ease', marginBottom: 48, position: 'relative', zIndex: 1,
      }}>
        <div style={{
          fontFamily: font.mono, fontSize: 11, letterSpacing: 3.5, color: 'rgba(240,242,245,0.55)',
          textTransform: 'uppercase' as const, border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, padding: '10px 28px', backdropFilter: 'blur(8px)',
          background: 'rgba(255,255,255,0.025)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          Platform Design System — Version 3.0 — Confidential
        </div>
      </div>

      {/* The Drawing — "Slate." traced letter by letter + Gold flecks */}
      <div ref={containerRef} style={{ position: 'relative', zIndex: 1 }}>
        <DrawnText drawPhase={drawPhase} fillVisible={fillVisible} showPeriod={showPeriod} periodRef={periodRef} />
        <GoldFlecks active={dustActive} periodRef={periodRef} containerRef={containerRef} />
      </div>

      {/* Reflection */}
      <div style={{
        opacity: reflectionVisible ? 1 : 0, transition: 'opacity 2s ease',
        position: 'relative', zIndex: 1, marginTop: -8,
      }}>
        <DrawnText drawPhase={6} fillVisible={fillVisible} showPeriod={showPeriod} periodRef={periodRef} isReflection={true} />
      </div>

      {/* Gold rule */}
      <div style={{ marginTop: 8, marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <GlassRule visible={ruleVisible} />
      </div>

      {/* Tagline */}
      <div style={{
        opacity: taglineVisible ? 1 : 0, transform: taglineVisible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 0.8s ease', fontFamily: font.mono, fontSize: 13, letterSpacing: 5,
        textTransform: 'uppercase' as const,
        marginBottom: 44, position: 'relative', zIndex: 1,
        color: taglineGlow ? 'rgba(240,242,245,0.95)' : 'rgba(240,242,245,0.45)',
        textShadow: taglineGlow ? '0 0 20px rgba(240,242,245,0.6), 0 0 40px rgba(240,242,245,0.3), 0 0 80px rgba(240,242,245,0.15)' : 'none',
      }}>
        <style>{`
          @keyframes taglineGlowPulse { 0% { filter: brightness(1); } 50% { filter: brightness(1.3); } 100% { filter: brightness(1); } }
        `}</style>
        <span style={{
          animation: taglineGlow ? 'taglineGlowPulse 2s ease-in-out infinite' : 'none',
          transition: 'color 0.8s ease, text-shadow 0.8s ease',
        }}>
          Start with the Facts
        </span>
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: subtitleVisible ? 1 : 0, transition: 'all 1s ease',
        fontFamily: font.body, fontSize: 17, color: 'rgba(184,201,219,0.85)',
        letterSpacing: 1.5, position: 'relative', zIndex: 1, fontWeight: 400,
      }}>
        Intelligence for School Systems
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 40, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8, opacity: footerVisible ? 1 : 0,
        transition: 'all 1s ease', zIndex: 1,
      }}>
        <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 3, color: 'rgba(240,242,245,0.5)', textTransform: 'uppercase' as const, fontWeight: 500 }}>
          Madden Education Advisory
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 8, letterSpacing: 2, color: 'rgba(240,242,245,0.3)', textTransform: 'uppercase' as const }}>
          Proprietary & Confidential · All Rights Reserved · 2026
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 15, opacity: 0.12 }}>
          <span title="Mike">🐇</span>
          <span title="Wife">🦋</span>
          <span title="Kid">🐩</span>
        </div>
      </div>
    </div>
  );
}
