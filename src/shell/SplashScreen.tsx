/**
 * Slate v3 — Splash Screen v7
 * Animated particle constellation + glass morphism wordmark panel
 * Deep navy radial gradient · Gold aperture iris · Playfair Display
 */
import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

// ─── Particle Canvas ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const COUNT = 72;
    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      r: number; alpha: number;
    };

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.4 + 0.4,
      alpha: Math.random() * 0.45 + 0.08,
    }));

    const CONNECT_DIST = 120;
    const GOLD = '212,175,55';

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      // Draw connections
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const opacity = (1 - dist / CONNECT_DIST) * 0.12;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(${GOLD},${opacity})`;
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${GOLD},${p.alpha})`;
        ctx!.fill();
      }

      // Move
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    />
  );
}

// ─── Subtle Hairline Aperture ─────────────────────────────────────────────────
function SubtleAperture({ phase }: { phase: 'closed' | 'opening' | 'gone' }) {
  const bladeCount = 8;
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = 18;
  const outerR = 148;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 15,
      pointerEvents: 'none',
      opacity: phase === 'gone' ? 0 : phase === 'opening' ? 0.38 : 0.15,
      transition: phase === 'gone'
        ? 'opacity 0.7s ease'
        : phase === 'opening'
        ? 'opacity 0.4s ease'
        : 'none',
    }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: phase === 'opening' ? 'rotate(22deg) scale(1.08)' : 'rotate(0deg) scale(1)',
          transition: phase === 'opening'
            ? 'transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'none',
        }}
      >
        {Array.from({ length: bladeCount }).map((_, i) => {
          const angle = (i / bladeCount) * Math.PI * 2;
          const x1 = cx + Math.cos(angle) * innerR;
          const y1 = cy + Math.sin(angle) * innerR;
          const x2 = cx + Math.cos(angle) * outerR;
          const y2 = cy + Math.sin(angle) * outerR;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(212,175,55,0.7)" strokeWidth={0.75} strokeLinecap="round" />
          );
        })}
        {Array.from({ length: bladeCount }).map((_, i) => {
          const startAngle = (i / bladeCount) * Math.PI * 2;
          const endAngle = ((i + 0.6) / bladeCount) * Math.PI * 2;
          const midR = 80;
          const x1 = cx + Math.cos(startAngle) * midR;
          const y1 = cy + Math.sin(startAngle) * midR;
          const x2 = cx + Math.cos(endAngle) * midR;
          const y2 = cy + Math.sin(endAngle) * midR;
          return (
            <path key={`arc-${i}`}
              d={`M ${x1} ${y1} A ${midR} ${midR} 0 0 1 ${x2} ${y2}`}
              fill="none" stroke="rgba(212,175,55,0.4)" strokeWidth={0.5} />
          );
        })}
        <circle cx={cx} cy={cy} r={3} fill="rgba(212,175,55,0.5)" />
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth={0.5} />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth={0.5} />
      </svg>
    </div>
  );
}

// ─── Ambient Background ───────────────────────────────────────────────────────
function AmbientBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 90% 70% at 50% 38%, #0f1e3a 0%, #090f1e 55%, #050b15 100%)',
      }} />
      {/* Subtle blue glow top-left */}
      <div style={{
        position: 'absolute',
        top: '-15%', left: '-10%',
        width: '55%', height: '55%',
        background: 'radial-gradient(ellipse, rgba(25,55,115,0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Subtle navy glow bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: '-10%', right: '-5%',
        width: '45%', height: '45%',
        background: 'radial-gradient(ellipse, rgba(15,40,90,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Gold center glow — very subtle, behind wordmark */}
      <div style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '40%', height: '30%',
        background: 'radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Disclaimer Card ──────────────────────────────────────────────────────────
function DisclaimerCard({ visible, onEnter }: { visible: boolean; onEnter: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents: visible ? 'auto' : 'none',
      background: visible ? 'rgba(5,10,20,0.82)' : 'transparent',
      backdropFilter: visible ? 'blur(18px)' : 'none',
    }}>
      <div style={{
        background: 'rgba(14,22,40,0.97)',
        backdropFilter: 'blur(28px)',
        border: '1px solid rgba(212,175,55,0.25)',
        borderRadius: 20,
        padding: '42px 46px',
        maxWidth: 520,
        width: '90%',
        boxShadow: '0 48px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 60px rgba(212,175,55,0.04) inset',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#0A1220',
            fontFamily: 'Playfair Display, serif',
            boxShadow: '0 2px 14px rgba(212,175,55,0.45)',
          }}>S</div>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            color: '#D4AF37', fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase' as const,
          }}>IMPORTANT NOTICE</span>
        </div>

        {/* Body */}
        <p style={{
          fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.78)',
          fontFamily: 'Inter, sans-serif', marginBottom: 12,
        }}>
          This platform contains <strong style={{ color: '#fff' }}>confidential financial, operational, and student data</strong> for authorized users only.
        </p>
        <p style={{
          fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.55)',
          fontFamily: 'Inter, sans-serif', marginBottom: 32,
        }}>
          All data shown is <strong style={{ color: 'rgba(255,255,255,0.85)' }}>simulated demo data</strong> for demonstration purposes. No real student, financial, or operational records are present.
        </p>

        {/* CTA */}
        <button
          onClick={onEnter}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: '100%', padding: '15px 24px',
            background: hovered
              ? 'linear-gradient(135deg, #E8C84A 0%, #D4A820 100%)'
              : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
            border: 'none', borderRadius: 11,
            fontSize: 13.5, fontWeight: 700, letterSpacing: '0.06em',
            color: '#0A1220', fontFamily: 'Inter, sans-serif',
            cursor: 'pointer', transition: 'all 0.18s ease',
            boxShadow: hovered
              ? '0 16px 40px rgba(212,175,55,0.55)'
              : '0 6px 22px rgba(212,175,55,0.35)',
            transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          }}
        >
          I Understand — Enter Slate
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 18, textAlign: 'center' as const,
          fontSize: 11, color: 'rgba(255,255,255,0.22)',
          fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em',
        }}>
          Madden Education Advisory · Confidential · Not for distribution
        </div>
      </div>
    </div>
  );
}

// ─── Main Splash ──────────────────────────────────────────────────────────────
export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [irisPhase, setIrisPhase] = useState<'closed' | 'opening' | 'gone'>('closed');
  const [contentVisible, setContentVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setIrisPhase('opening'), 200);
    const t2 = setTimeout(() => setContentVisible(true), 400);
    const t3 = setTimeout(() => setIrisPhase('gone'), 1200);
    const t4 = setTimeout(() => setCardVisible(true), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const handleEnter = () => {
    setCardVisible(false);
    setContentVisible(false);
    setTimeout(onComplete, 400);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
      background: '#090f1e',
    }}>
      <AmbientBackground />
      <ParticleCanvas />
      <SubtleAperture phase={irisPhase} />

      {/* Main Content */}
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '52px 48px',
        zIndex: 10,
        opacity: contentVisible ? 1 : 0,
        transition: 'opacity 1.2s ease',
      }}>

        {/* Top — Glass Pill Badge */}
        <div style={{
          background: 'rgba(212,175,55,0.07)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212,175,55,0.18)',
          borderRadius: 100,
          padding: '9px 24px',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.18em',
          color: 'rgba(212,175,55,0.65)',
          textTransform: 'uppercase' as const,
        }}>
          MADDEN EDUCATION ADVISORY · INTELLIGENCE PLATFORM
        </div>

        {/* Center — Brand Block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Glass glow panel behind wordmark */}
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Frosted glass backing */}
            <div style={{
              position: 'absolute',
              inset: '-28px -48px',
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(2px)',
              borderRadius: 32,
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 0 80px rgba(212,175,55,0.06) inset, 0 0 0 1px rgba(212,175,55,0.04) inset',
              pointerEvents: 'none',
            }} />

            {/* "Slate." wordmark */}
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <span style={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: 900,
                fontSize: 'clamp(80px, 11vw, 128px)',
                color: '#F5F0E8',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                textShadow: '0 0 80px rgba(212,175,55,0.12)',
              }}>Slate</span>
              <span style={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: 900,
                fontSize: 'clamp(80px, 11vw, 128px)',
                color: '#D4AF37',
                lineHeight: 1,
                textShadow: '0 0 40px rgba(212,175,55,0.35)',
              }}>.</span>
              {/* Gold drip dots */}
              <div style={{
                position: 'absolute', bottom: -16, right: 4,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4AF37', opacity: 0.75 }} />
                <div style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: '#D4AF37', opacity: 0.45 }} />
                <div style={{ width: 2, height: 2, borderRadius: '50%', background: '#D4AF37', opacity: 0.25 }} />
              </div>
            </div>
          </div>

          {/* Gold Rule */}
          <div style={{
            width: 360, height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.55) 50%, transparent 100%)',
            margin: '44px 0 30px',
          }} />

          {/* Tagline */}
          <div style={{
            fontSize: 13.5, fontWeight: 600, letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' as const,
            marginBottom: 18,
          }}>
            CLARITY IN COMPLEXITY · INTELLIGENCE IN MOTION
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 19, fontWeight: 300,
            color: 'rgba(255,255,255,0.38)',
            letterSpacing: '0.02em',
            fontStyle: 'italic' as const,
          }}>
            The operating system for school system leaders
          </div>
        </div>

        {/* Bottom — Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' as const,
          }}>
            MADDEN EDUCATION ADVISORY
          </div>
          <div style={{
            fontSize: 10, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.13)', textTransform: 'uppercase' as const,
          }}>
            PROPRIETARY &amp; CONFIDENTIAL · ALL RIGHTS RESERVED · 2026
          </div>
        </div>
      </div>

      {/* Disclaimer Card */}
      <DisclaimerCard visible={cardVisible} onEnter={handleEnter} />
    </div>
  );
}
