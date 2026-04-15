/**
 * Slate v3 — Splash Screen v11 "Cinematic"
 *
 * - No "Enter Slate" button — auto-advances after a beat
 * - Pill centered at top
 * - SVG fractal noise texture restored for multi-dimensional depth
 * - Gold flecks from period (kept — user likes them)
 * - Sonar pulse reveal
 * - Disclaimer fades in, then platform auto-opens after 2s beat
 */

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onComplete: () => void;
}

// ─── Sonar Canvas ─────────────────────────────────────────────────────────────

function SonarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let startTime: number | null = null;

    const pulses = [
      { delay: 700,  maxR: 0.70, alpha: 0.45, width: 0.7, duration: 2600 },
      { delay: 1700, maxR: 0.52, alpha: 0.14, width: 0.4, duration: 2000 },
    ];

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width  / 2;
      const cy = canvas.height / 2;
      const maxDim = Math.max(canvas.width, canvas.height);

      for (const p of pulses) {
        const t = elapsed - p.delay;
        if (t < 0) continue;
        const progress = Math.min(t / p.duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const r = eased * (maxDim * p.maxR);
        const fadeIn  = Math.min(t / 300, 1);
        const fadeOut = 1 - Math.pow(progress, 1.6);
        const alpha   = p.alpha * fadeIn * fadeOut;
        if (alpha <= 0.004) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201,168,76,${alpha})`;
        ctx.lineWidth   = p.width;
        ctx.stroke();
      }

      if (elapsed < 6000) animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }} />;
}

// ─── Gold Flecks Canvas ───────────────────────────────────────────────────────

function FleckCanvas({ periodRef }: { periodRef: React.RefObject<HTMLSpanElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface Fleck {
      x: number; y: number; vx: number; vy: number;
      size: number; born: number; maxAge: number;
    }

    const flecks: Fleck[] = [];
    let lastSpawn = 0;
    let running = true;

    const getPeriodPos = () => {
      const el = periodRef.current;
      if (!el) return { x: canvas.width * 0.615, y: canvas.height * 0.50 };
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.75 };
    };

    const spawn = (now: number) => {
      const pos = getPeriodPos();
      flecks.push({
        x: pos.x + (Math.random() - 0.5) * 6,
        y: pos.y,
        vx: (Math.random() - 0.5) * 0.38,
        vy: 0.32 + Math.random() * 0.55,
        size: 1.3 + Math.random() * 1.5,
        born: now,
        maxAge: 2800 + Math.random() * 1400,
      });
    };

    const draw = (now: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn a fleck every ~180ms — 5-7 visible at once for clear visibility
      if (now - lastSpawn > 160 + Math.random() * 60) {
        spawn(now);
        lastSpawn = now;
      }

      for (let i = flecks.length - 1; i >= 0; i--) {
        const f = flecks[i];
        const age = now - f.born;
        if (age > f.maxAge) { flecks.splice(i, 1); continue; }

        const t = age / f.maxAge;
        const opacity = t < 0.10
          ? (t / 0.10) * 0.78
          : t > 0.60
            ? 0.78 * (1 - (t - 0.60) / 0.40)
            : 0.78;

        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.004;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(215,182,88,${opacity})`;
        ctx.fill();
      }

      if (running) requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
    const stopTimer = setTimeout(() => { running = false; }, 30000);

    return () => {
      running = false;
      clearTimeout(stopTimer);
      window.removeEventListener('resize', resize);
    };
  }, [periodRef]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }} />;
}

// ─── Gold Rule ────────────────────────────────────────────────────────────────

function GoldRule({ visible }: { visible: boolean }) {
  return (
    <div style={{
      width: visible ? 260 : 0,
      height: 1,
      background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.55) 20%, rgba(201,168,76,0.55) 80%, transparent 100%)',
      opacity: visible ? 1 : 0,
      transition: visible
        ? 'width 1.0s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease'
        : 'none',
      margin: '0 auto',
    }} />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SplashScreen({ onComplete }: Props) {
  const [showWordmark,   setShowWordmark]   = useState(false);
  const [showRule,       setShowRule]       = useState(false);
  const [showTagline,    setShowTagline]    = useState(false);
  const [showSubtitle,   setShowSubtitle]   = useState(false);
  const [showFooter,     setShowFooter]     = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const periodRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowWordmark(true),   2000),
      setTimeout(() => setShowRule(true),        3200),
      setTimeout(() => setShowTagline(true),     4200),
      setTimeout(() => setShowSubtitle(true),    4700),
      setTimeout(() => setShowFooter(true),      5300),
      // Disclaimer fades in at 7s
      setTimeout(() => setShowDisclaimer(true),  7000),
      // Auto-advance 4s after disclaimer appears — linger a beat longer
      setTimeout(() => onComplete(),            13000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const fade = (show: boolean, delay = 0): React.CSSProperties => ({
    opacity:    show ? 1 : 0,
    transform:  show ? 'translateY(0)' : 'translateY(6px)',
    transition: `opacity 0.9s ease ${delay}ms, transform 0.9s ease ${delay}ms`,
  });

  return (
    <div
      onClick={onComplete}
      style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse 110% 90% at 50% 42%, #0d1b35 0%, #080f1e 50%, #040a14 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'default', overflow: 'hidden', userSelect: 'none',
      }}
    >
      {/* ── Fractal noise texture — multi-dimensional depth ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: '220px 220px',
        opacity: 0.038,
        mixBlendMode: 'overlay',
      }} />

      {/* ── Vignette — glass-like edge depth ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse 78% 68% at 50% 50%, transparent 30%, rgba(2,6,14,0.65) 100%)',
      }} />

      {/* ── Top-left atmospheric highlight ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '50%', height: '50%',
        pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at 18% 18%, rgba(28,56,105,0.20) 0%, transparent 68%)',
      }} />

      {/* ── Bottom-right counter-highlight ── */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0, width: '40%', height: '40%',
        pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at 82% 82%, rgba(15,30,60,0.14) 0%, transparent 68%)',
      }} />

      {/* ── Sonar pulse ── */}
      <SonarCanvas />

      {/* ── Gold flecks from period ── */}
      {showWordmark && <FleckCanvas periodRef={periodRef} />}

      {/* ── Top pill — CENTERED ── */}
      <div style={{
        position: 'absolute',
        top: 34,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10,
        ...fade(showFooter),
      }}>
        <div style={{
          padding: '7px 22px', borderRadius: 40,
          border: '1px solid rgba(201,168,76,0.18)',
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 1px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '9.5px', letterSpacing: '2.6px', fontWeight: 600,
            color: 'rgba(201,168,76,0.60)', textTransform: 'uppercase',
          }}>
            PLATFORM DESIGN SYSTEM &nbsp;&mdash;&nbsp; VERSION 3.0 &nbsp;&mdash;&nbsp; CONFIDENTIAL
          </span>
        </div>
      </div>

      {/* ── Center content ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center',
      }}>
        {/* Wordmark */}
        <div style={{
          ...fade(showWordmark),
          marginBottom: 22, lineHeight: 1,
        }}>
          <span style={{
            fontFamily: '"Playfair Display", "Georgia", serif',
            fontSize: 'clamp(68px, 8.5vw, 104px)',
            fontWeight: 700, letterSpacing: '-0.02em',
            color: '#F5F0E8', lineHeight: 1,
          }}>
            Slate
          </span>
          <span
            ref={periodRef}
            style={{
              fontFamily: '"Playfair Display", "Georgia", serif',
              fontSize: 'clamp(38px, 4.8vw, 58px)',
              fontWeight: 700, color: '#C9A84C', lineHeight: 1,
              verticalAlign: 'middle',
              display: 'inline-block',
              marginBottom: '0.12em',
            }}
          >.</span>
        </div>

        {/* Gold rule */}
        <div style={{ marginBottom: 26 }}>
          <GoldRule visible={showRule} />
        </div>

        {/* Tagline */}
        <div style={{
          ...fade(showTagline),
          fontFamily: '"Inter", "Helvetica Neue", sans-serif',
          fontSize: 'clamp(10px, 1.1vw, 13px)',
          fontWeight: 600, letterSpacing: '0.30em',
          color: '#C9A84C', textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          START WITH THE FACTS
        </div>

        {/* Subtitle */}
        <div style={{
          ...fade(showSubtitle, 100),
          fontFamily: '"Inter", "Helvetica Neue", sans-serif',
          fontSize: 'clamp(14px, 1.4vw, 17px)',
          fontWeight: 400, letterSpacing: '0.01em',
          color: 'rgba(245,240,232,0.60)',
        }}>
          Intelligence for School Systems
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        position: 'absolute', bottom: 36,
        left: 0, right: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6,
        ...fade(showFooter),
      }}>
        <div style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '10px', letterSpacing: '3.5px', fontWeight: 600,
          color: 'rgba(245,240,232,0.82)', textTransform: 'uppercase',
        }}>
          MADDEN EDUCATION ADVISORY, LLC
        </div>
        <div style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '8.5px', letterSpacing: '1.8px', fontWeight: 400,
          color: 'rgba(245,240,232,0.55)', textTransform: 'uppercase',
        }}>
          PROPRIETARY &amp; CONFIDENTIAL &nbsp;&middot;&nbsp; ALL RIGHTS RESERVED &nbsp;&middot;&nbsp; 2026
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 6, opacity: 0.55 }}>
          {/* Bunny */}
          <svg width="16" height="16" viewBox="0 0 100 100" fill="rgba(245,240,232,0.9)">
            <ellipse cx="50" cy="72" rx="22" ry="18"/>
            <ellipse cx="50" cy="46" rx="16" ry="14"/>
            <ellipse cx="38" cy="20" rx="7" ry="18" transform="rotate(-10 38 20)"/>
            <ellipse cx="62" cy="20" rx="7" ry="18" transform="rotate(10 62 20)"/>
            <circle cx="44" cy="48" r="2"/>
            <circle cx="56" cy="48" r="2"/>
            <ellipse cx="50" cy="53" rx="3" ry="2" fill="rgba(220,150,150,0.8)"/>
            <path d="M44 56 Q50 60 56 56" stroke="rgba(245,240,232,0.9)" strokeWidth="1.5" fill="none"/>
            <ellipse cx="36" cy="76" rx="8" ry="5" transform="rotate(-20 36 76)"/>
            <ellipse cx="64" cy="76" rx="8" ry="5" transform="rotate(20 64 76)"/>
            <ellipse cx="72" cy="65" rx="6" ry="4" transform="rotate(40 72 65)"/>
          </svg>
          {/* Butterfly */}
          <svg width="16" height="16" viewBox="0 0 100 100" fill="rgba(245,240,232,0.9)">
            <ellipse cx="28" cy="38" rx="22" ry="16" transform="rotate(-30 28 38)"/>
            <ellipse cx="72" cy="38" rx="22" ry="16" transform="rotate(30 72 38)"/>
            <ellipse cx="32" cy="65" rx="14" ry="10" transform="rotate(20 32 65)"/>
            <ellipse cx="68" cy="65" rx="14" ry="10" transform="rotate(-20 68 65)"/>
            <ellipse cx="50" cy="50" rx="4" ry="22" fill="rgba(245,240,232,0.9)"/>
            <path d="M46 30 Q50 26 54 30" stroke="rgba(245,240,232,0.7)" strokeWidth="1.2" fill="none"/>
          </svg>
          {/* Poodle */}
          <svg width="16" height="16" viewBox="0 0 100 100" fill="rgba(245,240,232,0.9)">
            <circle cx="50" cy="28" r="14"/>
            <circle cx="36" cy="20" r="8"/>
            <circle cx="64" cy="20" r="8"/>
            <ellipse cx="50" cy="55" rx="18" ry="16"/>
            <circle cx="50" cy="40" r="10"/>
            <line x1="35" y1="70" x2="30" y2="90" stroke="rgba(245,240,232,0.9)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="45" y1="71" x2="42" y2="91" stroke="rgba(245,240,232,0.9)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="55" y1="71" x2="58" y2="91" stroke="rgba(245,240,232,0.9)" strokeWidth="4" strokeLinecap="round"/>
            <line x1="65" y1="70" x2="70" y2="90" stroke="rgba(245,240,232,0.9)" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="30" cy="90" r="5"/>
            <circle cx="42" cy="91" r="5"/>
            <circle cx="58" cy="91" r="5"/>
            <circle cx="70" cy="90" r="5"/>
            <circle cx="43" cy="26" r="2" fill="rgba(10,20,40,0.9)"/>
            <circle cx="57" cy="26" r="2" fill="rgba(10,20,40,0.9)"/>
            <ellipse cx="50" cy="32" rx="4" ry="3" fill="rgba(220,150,150,0.7)"/>
            <path d="M72 50 Q82 46 80 54" stroke="rgba(245,240,232,0.9)" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <circle cx="82" cy="54" r="4"/>
          </svg>
        </div>
      </div>

      {/* ── Disclaimer — no button, just text, auto-advances ── */}
      <div style={{
        position: 'absolute',
        bottom: 140,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 20,
      }}>
        <div style={{
          maxWidth: 480,
          width: '88%',
          transform: showDisclaimer ? 'translateY(0)' : 'translateY(14px)',
          opacity: showDisclaimer ? 1 : 0,
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.028)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(201,168,76,0.13)',
            borderRadius: 5, padding: '13px 22px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 10.5, color: 'rgba(245,240,232,0.38)',
              lineHeight: 1.65, letterSpacing: '0.01em',
            }}>
              <strong style={{ color: 'rgba(245,240,232,0.55)', fontWeight: 600 }}>
                Demonstration Platform
              </strong>
              {' '}— All data is synthetic and for illustrative purposes only.
              This platform is confidential and intended solely for authorized preview.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
