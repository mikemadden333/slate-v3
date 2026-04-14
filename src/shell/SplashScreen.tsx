/**
 * Slate v3 — Splash Screen v6
 * Subtle modern-art aperture: thin hairline SVG lines rotate and dissolve
 * as content cross-fades in. The iris is a whisper, not a feature.
 */
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

// ─── Subtle Hairline Aperture ─────────────────────────────────────────────────
// 8 thin 1px lines radiating from center, rotating slowly, then dissolving
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
      opacity: phase === 'gone' ? 0 : phase === 'opening' ? 0.35 : 0.18,
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
        {/* Hairline blades — thin lines from inner circle to outer */}
        {Array.from({ length: bladeCount }).map((_, i) => {
          const angle = (i / bladeCount) * Math.PI * 2;
          const x1 = cx + Math.cos(angle) * innerR;
          const y1 = cy + Math.sin(angle) * innerR;
          const x2 = cx + Math.cos(angle) * outerR;
          const y2 = cy + Math.sin(angle) * outerR;
          return (
            <line
              key={i}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke="rgba(212,175,55,0.7)"
              strokeWidth={0.75}
              strokeLinecap="round"
            />
          );
        })}
        {/* Thin arc segments between blades — the "petals" */}
        {Array.from({ length: bladeCount }).map((_, i) => {
          const startAngle = (i / bladeCount) * Math.PI * 2;
          const endAngle = ((i + 0.6) / bladeCount) * Math.PI * 2;
          const midR = 80;
          const x1 = cx + Math.cos(startAngle) * midR;
          const y1 = cy + Math.sin(startAngle) * midR;
          const x2 = cx + Math.cos(endAngle) * midR;
          const y2 = cy + Math.sin(endAngle) * midR;
          const largeArc = 0;
          return (
            <path
              key={`arc-${i}`}
              d={`M ${x1} ${y1} A ${midR} ${midR} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke="rgba(212,175,55,0.4)"
              strokeWidth={0.5}
            />
          );
        })}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="rgba(212,175,55,0.5)" />
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth={0.5} />
        {/* Inner ring */}
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
      <div style={{
        position: 'absolute',
        top: '-15%', left: '-10%',
        width: '55%', height: '55%',
        background: 'radial-gradient(ellipse, rgba(25,55,115,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%', right: '-5%',
        width: '45%', height: '45%',
        background: 'radial-gradient(ellipse, rgba(15,40,90,0.15) 0%, transparent 70%)',
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
      background: visible ? 'rgba(5,10,20,0.78)' : 'transparent',
      backdropFilter: visible ? 'blur(14px)' : 'none',
    }}>
      <div style={{
        background: 'rgba(14,22,40,0.96)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(212,175,55,0.22)',
        borderRadius: 18,
        padding: '38px 42px',
        maxWidth: 500,
        width: '90%',
        boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #D4AF37, #B8960C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#0A1220',
            fontFamily: 'Playfair Display, serif',
            boxShadow: '0 2px 12px rgba(212,175,55,0.4)',
          }}>S</div>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            color: '#D4AF37', fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase' as const,
          }}>IMPORTANT NOTICE</span>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter, sans-serif', marginBottom: 12 }}>
          This platform contains <strong style={{ color: '#fff' }}>confidential financial, operational, and student data</strong> for authorized users only.
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', marginBottom: 28 }}>
          All data shown is <strong style={{ color: 'rgba(255,255,255,0.85)' }}>simulated demo data</strong> for demonstration purposes. No real student, financial, or operational records are present.
        </p>
        <button
          onClick={onEnter}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: '100%', padding: '14px 24px',
            background: hovered
              ? 'linear-gradient(135deg, #E0BC45 0%, #C9A030 100%)'
              : 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)',
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
            color: '#0A1220', fontFamily: 'Inter, sans-serif',
            cursor: 'pointer', transition: 'all 0.18s ease',
            boxShadow: hovered ? '0 12px 32px rgba(212,175,55,0.5)' : '0 4px 18px rgba(212,175,55,0.3)',
            transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          }}
        >
          I Understand — Enter Slate
        </button>
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}>
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
    // Iris starts barely visible, then opens (rotates + fades) while content fades in simultaneously
    const t1 = setTimeout(() => setIrisPhase('opening'), 200);
    // Content starts fading in at 400ms — cross-fades with iris
    const t2 = setTimeout(() => setContentVisible(true), 400);
    // Iris fully gone at 1200ms
    const t3 = setTimeout(() => setIrisPhase('gone'), 1200);
    // Disclaimer card at 2400ms
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
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 100,
          padding: '9px 22px',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase' as const,
        }}>
          PLATFORM DESIGN SYSTEM — VERSION 3.0 — CONFIDENTIAL
        </div>

        {/* Center — Brand Block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* "Slate." in Playfair Display */}
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <span style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 900,
              fontSize: 'clamp(80px, 11vw, 128px)',
              color: '#F5F0E8',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>Slate</span>
            <span style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 900,
              fontSize: 'clamp(80px, 11vw, 128px)',
              color: '#D4AF37',
              lineHeight: 1,
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

          {/* Gold Rule */}
          <div style={{
            width: 340, height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.5) 50%, transparent 100%)',
            margin: '36px 0 28px',
          }} />

          {/* Tagline */}
          <div style={{
            fontSize: 13, fontWeight: 600, letterSpacing: '0.24em',
            color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const,
            marginBottom: 18,
          }}>
            START WITH THE FACTS
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 19, fontWeight: 400,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.01em',
          }}>
            Intelligence for School Systems
          </div>
        </div>

        {/* Bottom — Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const,
          }}>
            MADDEN EDUCATION ADVISORY
          </div>
          <div style={{
            fontSize: 10, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' as const,
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
