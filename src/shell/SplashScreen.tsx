/**
 * Slate v3 — Splash Screen v9 "Signal"
 *
 * Design principle: authoritative minimalism.
 * One gesture. One wordmark. Stillness.
 *
 * Sequence:
 *   0.0s  Pure deep navy void
 *   0.8s  Single hairline gold ring expands from center (sonar pulse)
 *   2.2s  "Slate." materializes — opacity 0→1, very slight upward drift
 *   3.4s  Gold rule draws left→right
 *   4.5s  Tagline fades in
 *   5.0s  Subtitle fades in
 *   5.6s  Footer fades in
 *   7.5s  Disclaimer card rises
 *  14.0s  Auto-advance (fallback)
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

    // Two pulses: primary at 0.8s, faint echo at 1.8s
    const pulses = [
      { delay: 800,  maxR: 0.68, alpha: 0.50, width: 0.7, duration: 2400 },
      { delay: 1800, maxR: 0.50, alpha: 0.18, width: 0.4, duration: 1800 },
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
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const r = eased * (maxDim * p.maxR);

        const fadeIn  = Math.min(t / 300, 1);
        const fadeOut = 1 - Math.pow(progress, 1.6);
        const alpha   = p.alpha * fadeIn * fadeOut;

        if (alpha <= 0.004) continue;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
        ctx.lineWidth   = p.width;
        ctx.stroke();
      }

      if (elapsed < 5500) {
        animId = requestAnimationFrame(draw);
      }
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Gold Rule ────────────────────────────────────────────────────────────────

function GoldRule({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        width: visible ? 300 : 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent 0%, #C9A84C 25%, #C9A84C 75%, transparent 100%)',
        opacity: visible ? 0.65 : 0,
        transition: visible
          ? 'width 0.95s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
          : 'none',
        margin: '0 auto',
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SplashScreen({ onComplete }: Props) {
  const [showWordmark,   setShowWordmark]   = useState(false);
  const [showRule,       setShowRule]       = useState(false);
  const [showTagline,    setShowTagline]    = useState(false);
  const [showSubtitle,   setShowSubtitle]   = useState(false);
  const [showFooter,     setShowFooter]     = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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

  return (
    <div
      onClick={onComplete}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 110% 90% at 50% 42%, #0d1b35 0%, #080f1e 50%, #040a14 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Sonar pulse */}
      <SonarCanvas />

      {/* Center content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            opacity:    showWordmark ? 1 : 0,
            transform:  showWordmark ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            marginBottom: 22,
            lineHeight: 1,
          }}
        >
          <span
            style={{
              fontFamily: '"Playfair Display", "Georgia", serif',
              fontSize: 'clamp(68px, 8.5vw, 104px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#F5F0E8',
              lineHeight: 1,
            }}
          >
            Slate
          </span>
          <span
            style={{
              fontFamily: '"Playfair Display", "Georgia", serif',
              fontSize: 'clamp(68px, 8.5vw, 104px)',
              fontWeight: 700,
              color: '#C9A84C',
              lineHeight: 1,
            }}
          >
            .
          </span>
        </div>

        {/* Gold rule */}
        <div style={{ marginBottom: 26 }}>
          <GoldRule visible={showRule} />
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity:    showTagline ? 1 : 0,
            transform:  showTagline ? 'translateY(0)' : 'translateY(5px)',
            transition: 'opacity 0.9s ease, transform 0.9s ease',
            fontFamily: '"Inter", "Helvetica Neue", sans-serif',
            fontSize: 'clamp(10px, 1.05vw, 12px)',
            fontWeight: 500,
            letterSpacing: '0.24em',
            color: '#C9A84C',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Clarity in Complexity&nbsp;&nbsp;·&nbsp;&nbsp;Intelligence in Motion
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity:    showSubtitle ? 1 : 0,
            transform:  showSubtitle ? 'translateY(0)' : 'translateY(5px)',
            transition: 'opacity 0.9s ease, transform 0.9s ease',
            fontFamily: '"Playfair Display", "Georgia", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(14px, 1.4vw, 17px)',
            fontWeight: 400,
            color: 'rgba(245, 240, 232, 0.50)',
            letterSpacing: '0.01em',
          }}
        >
          The operating system for school system leaders
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 44,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity:    showFooter ? 1 : 0,
          transform:  showFooter ? 'translateY(0)' : 'translateY(5px)',
          transition: 'opacity 0.9s ease, transform 0.9s ease',
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: '"Inter", "Helvetica Neue", sans-serif',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.30em',
            color: 'rgba(201, 168, 76, 0.55)',
            textTransform: 'uppercase',
          }}
        >
          Madden Education Advisory
        </div>
      </div>

      {/* Disclaimer card */}
      <div
        style={{
          position: 'absolute',
          bottom: 96,
          left: '50%',
          transform: showDisclaimer
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(18px)',
          opacity:    showDisclaimer ? 1 : 0,
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          zIndex: 20,
          maxWidth: 500,
          width: '88%',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.035)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(201, 168, 76, 0.16)',
            borderRadius: 6,
            padding: '14px 22px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"Inter", "Helvetica Neue", sans-serif',
              fontSize: 11,
              color: 'rgba(245, 240, 232, 0.42)',
              lineHeight: 1.65,
              letterSpacing: '0.01em',
            }}
          >
            <strong style={{ color: 'rgba(245, 240, 232, 0.62)', fontWeight: 600 }}>
              Demonstration Platform
            </strong>
            {' '}— All data is synthetic and for illustrative purposes only.
            This platform is confidential and intended solely for authorized preview.
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            style={{
              marginTop: 14,
              padding: '9px 34px',
              background: 'transparent',
              border: '1px solid rgba(201, 168, 76, 0.45)',
              borderRadius: 3,
              color: '#C9A84C',
              fontFamily: '"Inter", "Helvetica Neue", sans-serif',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background    = 'rgba(201, 168, 76, 0.08)';
              e.currentTarget.style.borderColor   = 'rgba(201, 168, 76, 0.75)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background    = 'transparent';
              e.currentTarget.style.borderColor   = 'rgba(201, 168, 76, 0.45)';
            }}
          >
            Enter Slate
          </button>
        </div>
      </div>
    </div>
  );
}
