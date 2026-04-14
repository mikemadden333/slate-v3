/**
 * Slate v3 — Splash Screen v10 "Restored"
 *
 * Restores original text from reference screenshot:
 *   - Top pill: PLATFORM DESIGN SYSTEM — VERSION 3.0 — CONFIDENTIAL
 *   - Tagline: START WITH THE FACTS
 *   - Subtitle: Intelligence for School Systems
 *   - Footer: MADDEN EDUCATION ADVISORY + copyright line + social icons
 *
 * Visual enhancements:
 *   - Subtle SVG noise texture over gradient for multi-dimensional depth
 *   - Vignette edges for glass-like dimensionality
 *   - Glass pill (backdrop-filter) at top
 *   - Very subtle gold flecks (2-4 tiny dots) falling from the period
 *   - Sonar pulse reveal (kept from v9)
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
      { delay: 800,  maxR: 0.68, alpha: 0.48, width: 0.7, duration: 2400 },
      { delay: 1800, maxR: 0.50, alpha: 0.16, width: 0.4, duration: 1800 },
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

      if (elapsed < 5500) animId = requestAnimationFrame(draw);
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
      return { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.72 };
    };

    const spawn = (now: number) => {
      const pos = getPeriodPos();
      flecks.push({
        x: pos.x + (Math.random() - 0.5) * 3,
        y: pos.y,
        vx: (Math.random() - 0.5) * 0.25,
        vy: 0.35 + Math.random() * 0.45,
        size: 1.0 + Math.random() * 1.2,
        born: now,
        maxAge: 2000 + Math.random() * 1000,
      });
    };

    const draw = (now: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn a fleck every ~450ms — very sparse
      if (now - lastSpawn > 420 + Math.random() * 120) {
        spawn(now);
        lastSpawn = now;
      }

      for (let i = flecks.length - 1; i >= 0; i--) {
        const f = flecks[i];
        const age = now - f.born;
        if (age > f.maxAge) { flecks.splice(i, 1); continue; }

        const t = age / f.maxAge;
        // Fade in 0-15%, hold, fade out 65-100%
        const opacity = t < 0.15
          ? (t / 0.15) * 0.50
          : t > 0.65
            ? 0.50 * (1 - (t - 0.65) / 0.35)
            : 0.50;

        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.005; // gentle gravity

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${opacity})`;
        ctx.fill();
      }

      if (running) requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
    const stopTimer = setTimeout(() => { running = false; }, 20000);

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
      width: visible ? 280 : 0,
      height: 1,
      background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.6) 20%, rgba(201,168,76,0.6) 80%, transparent 100%)',
      opacity: visible ? 1 : 0,
      transition: visible
        ? 'width 0.95s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease'
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
      setTimeout(() => setShowWordmark(true),   2200),
      setTimeout(() => setShowRule(true),        3400),
      setTimeout(() => setShowTagline(true),     4500),
      setTimeout(() => setShowSubtitle(true),    5000),
      setTimeout(() => setShowFooter(true),      5600),
      setTimeout(() => setShowDisclaimer(true),  7500),
      setTimeout(() => onComplete(),            14000),
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
      {/* ── Noise texture — multi-dimensional depth ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
        opacity: 0.032,
        mixBlendMode: 'overlay',
      }} />

      {/* ── Vignette — glass-like edge depth ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 35%, rgba(2,6,14,0.60) 100%)',
      }} />

      {/* ── Subtle top-left highlight — dimensionality ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '45%', height: '45%',
        pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at 20% 20%, rgba(30,60,110,0.18) 0%, transparent 70%)',
      }} />

      {/* ── Sonar pulse ── */}
      <SonarCanvas />

      {/* ── Gold flecks from period ── */}
      {showWordmark && <FleckCanvas periodRef={periodRef} />}

      {/* ── Top pill ── */}
      <div style={{
        position: 'absolute', top: 34, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, ...fade(showFooter),
      }}>
        <div style={{
          padding: '7px 20px', borderRadius: 40,
          border: '1px solid rgba(201,168,76,0.20)',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 1px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '9.5px', letterSpacing: '2.8px', fontWeight: 600,
            color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase',
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
              fontSize: 'clamp(68px, 8.5vw, 104px)',
              fontWeight: 700, color: '#C9A84C', lineHeight: 1,
            }}
          >.</span>
        </div>

        {/* Gold rule */}
        <div style={{ marginBottom: 26 }}>
          <GoldRule visible={showRule} />
        </div>

        {/* Tagline — START WITH THE FACTS */}
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

        {/* Subtitle — Intelligence for School Systems */}
        <div style={{
          ...fade(showSubtitle, 100),
          fontFamily: '"Inter", "Helvetica Neue", sans-serif',
          fontSize: 'clamp(14px, 1.4vw, 17px)',
          fontWeight: 400, letterSpacing: '0.01em',
          color: 'rgba(245,240,232,0.62)',
        }}>
          Intelligence for School Systems
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        position: 'absolute', bottom: 44,
        left: 0, right: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6,
        ...fade(showFooter),
      }}>
        <div style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '10px', letterSpacing: '3.5px', fontWeight: 600,
          color: 'rgba(245,240,232,0.50)', textTransform: 'uppercase',
        }}>
          MADDEN EDUCATION ADVISORY
        </div>
        <div style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '8.5px', letterSpacing: '1.8px', fontWeight: 400,
          color: 'rgba(245,240,232,0.25)', textTransform: 'uppercase',
        }}>
          PROPRIETARY &amp; CONFIDENTIAL &nbsp;&middot;&nbsp; ALL RIGHTS RESERVED &nbsp;&middot;&nbsp; 2026
        </div>
        {/* Social icons */}
        <div style={{ display: 'flex', gap: 18, marginTop: 4, opacity: 0.32 }}>
          {/* LinkedIn */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(245,240,232,0.9)">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
            <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
          </svg>
          {/* X / Twitter */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(245,240,232,0.9)">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {/* Globe */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,240,232,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
      </div>

      {/* ── Disclaimer card ── */}
      <div style={{
        position: 'absolute', bottom: 100,
        left: '50%',
        transform: showDisclaimer
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(18px)',
        opacity:    showDisclaimer ? 1 : 0,
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        zIndex: 20, maxWidth: 500, width: '88%',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.035)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,168,76,0.16)',
          borderRadius: 6, padding: '14px 22px', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 11, color: 'rgba(245,240,232,0.42)',
            lineHeight: 1.65, letterSpacing: '0.01em',
          }}>
            <strong style={{ color: 'rgba(245,240,232,0.62)', fontWeight: 600 }}>
              Demonstration Platform
            </strong>
            {' '}— All data is synthetic and for illustrative purposes only.
            This platform is confidential and intended solely for authorized preview.
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            style={{
              marginTop: 14, padding: '9px 34px',
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.45)',
              borderRadius: 3, color: '#C9A84C',
              fontFamily: '"Inter", sans-serif',
              fontSize: 10, fontWeight: 600,
              letterSpacing: '0.20em', textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background  = 'rgba(201,168,76,0.08)';
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.75)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)';
            }}
          >
            Enter Slate
          </button>
        </div>
      </div>
    </div>
  );
}
