/**
 * Slate — Splash Screen v4
 * Cinematic, awe-inspiring. Deep slate canvas with gold brand mark.
 * Sequence: grid fades in → "Slate." draws in gold → tagline appears →
 * glass disclaimer card rises → user enters.
 */
import React, { useState, useEffect, useRef } from 'react';

const T = {
  gridFade:       400,
  logoStart:      600,
  logoDuration:   1200,
  taglineStart:   1900,
  taglineDuration:600,
  cardStart:      2700,
  cardDuration:   500,
};

function GridBackground({ visible }: { visible: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: visible ? 1 : 0, transition: `opacity ${T.gridFade}ms ease`, overflow: 'hidden' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="splashGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(201,165,78,0.07)" strokeWidth="0.5"/>
          </pattern>
          <radialGradient id="splashGridFade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="0"/>
            <stop offset="100%" stopColor="black" stopOpacity="1"/>
          </radialGradient>
          <mask id="splashGridMask">
            <rect width="100%" height="100%" fill="url(#splashGridFade)"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#splashGrid)" mask="url(#splashGridMask)"/>
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,165,78,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(201,165,78,0.25) 50%, transparent 100%)', animation: 'splashScan 10s linear infinite' }} />
      <style>{`@keyframes splashScan { 0% { top: 0%; opacity: 0; } 5% { opacity: 1; } 95% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
    </div>
  );
}

function DataParticles({ visible }: { visible: boolean }) {
  const particles = [
    { x: 10, y: 18, label: 'DSCR 3.47x', delay: 0 },
    { x: 80, y: 14, label: '6,823 enrolled', delay: 200 },
    { x: 7,  y: 70, label: '215 days cash', delay: 400 },
    { x: 86, y: 66, label: '$138.3M budget', delay: 100 },
    { x: 18, y: 44, label: '10 campuses', delay: 300 },
    { x: 74, y: 40, label: 'Bond compliant', delay: 500 },
    { x: 44, y: 7,  label: 'AI monitoring', delay: 250 },
    { x: 50, y: 87, label: 'Chicago, IL', delay: 350 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, opacity: visible ? 0.30 : 0, transition: `opacity 1.2s ease ${p.delay}ms`, animation: visible ? `splashFloat${i % 3} ${6 + i * 0.7}s ease-in-out infinite ${p.delay}ms` : 'none' }}>
          <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(201,165,78,0.75)', letterSpacing: '0.5px', whiteSpace: 'nowrap', padding: '3px 8px', border: '1px solid rgba(201,165,78,0.15)', borderRadius: '4px', background: 'rgba(201,165,78,0.04)' }}>{p.label}</div>
        </div>
      ))}
      <style>{`
        @keyframes splashFloat0 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes splashFloat1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes splashFloat2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      `}</style>
    </div>
  );
}

function BrandMark({ progress }: { progress: number }) {
  const letters = ['S', 'l', 'a', 't', 'e', '.'];
  const letterProgress = letters.map((_, i) => {
    const start = i / letters.length;
    const end = (i + 1) / letters.length;
    return Math.max(0, Math.min(1, (progress - start) / (end - start)));
  });
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, userSelect: 'none' }}>
      {letters.map((letter, i) => (
        <span key={i} style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '96px',
          fontWeight: 800,
          letterSpacing: i < 5 ? '-4px' : '0px',
          color: i === 5 ? '#C9A54E' : '#FFFFFF',
          opacity: letterProgress[i],
          transform: `translateY(${(1 - letterProgress[i]) * 24}px)`,
          display: 'inline-block',
          lineHeight: 1,
          textShadow: i === 5
            ? '0 0 50px rgba(201,165,78,0.6), 0 0 100px rgba(201,165,78,0.2)'
            : '0 2px 30px rgba(0,0,0,0.4)',
        }}>{letter}</span>
      ))}
    </div>
  );
}

function GoldRule({ visible }: { visible: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22, opacity: visible ? 1 : 0, transform: visible ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'center', transition: 'opacity 0.7s ease, transform 0.9s cubic-bezier(0.4,0,0.2,1)' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,165,78,0.5), transparent)' }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A54E', boxShadow: '0 0 14px rgba(201,165,78,0.7)' }} />
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,165,78,0.5), transparent)' }} />
    </div>
  );
}

function DisclaimerCard({ visible, onEnter }: { visible: boolean; onEnter: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, opacity: visible ? 1 : 0, pointerEvents: visible ? 'all' : 'none', transition: `opacity ${T.cardDuration}ms ease`, background: visible ? 'rgba(10,16,28,0.80)' : 'transparent', backdropFilter: visible ? 'blur(10px)' : 'none' }}>
      <div style={{ width: 520, background: 'rgba(22,30,45,0.97)', border: '1px solid rgba(201,165,78,0.22)', borderRadius: '20px', padding: '40px 44px', boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,165,78,0.06) inset', transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)', transition: `transform ${T.cardDuration}ms cubic-bezier(0.34,1.56,0.64,1)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg, #C9A54E, #D4B978)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(201,165,78,0.45)', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1A2332', fontFamily: 'Inter, sans-serif' }}>S</span>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#C9A54E', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Important Notice</div>
        </div>
        <p style={{ fontSize: '13px', lineHeight: 1.75, color: 'rgba(255,255,255,0.68)', fontFamily: 'Inter, sans-serif', margin: '0 0 12px' }}>
          This platform contains <strong style={{ color: 'rgba(255,255,255,0.92)' }}>confidential financial, operational, and student data</strong> for authorized users only.
        </p>
        <p style={{ fontSize: '13px', lineHeight: 1.75, color: 'rgba(255,255,255,0.68)', fontFamily: 'Inter, sans-serif', margin: '0 0 28px' }}>
          All data shown is <strong style={{ color: 'rgba(255,255,255,0.92)' }}>simulated demo data</strong> for demonstration purposes. No real student, financial, or operational records are present.
        </p>
        <div style={{ height: 1, background: 'rgba(201,165,78,0.12)', marginBottom: 24 }} />
        <button
          onClick={onEnter}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ width: '100%', padding: '14px 24px', borderRadius: '12px', border: 'none', background: hovered ? 'linear-gradient(135deg, #D4B978 0%, #C9A54E 100%)' : 'linear-gradient(135deg, #C9A54E 0%, #B8943F 100%)', color: '#1A2332', fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: hovered ? '0 10px 28px rgba(201,165,78,0.50)' : '0 4px 16px rgba(201,165,78,0.30)', transform: hovered ? 'translateY(-1px)' : 'translateY(0)' }}
        >
          I Understand — Enter Slate
        </button>
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.22)', fontFamily: 'Inter, sans-serif', letterSpacing: '0.3px' }}>
          Madden Education Advisory · Confidential · Not for distribution
        </div>
      </div>
    </div>
  );
}

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [gridVisible, setGridVisible]           = useState(false);
  const [logoProgress, setLogoProgress]         = useState(0);
  const [taglineVisible, setTaglineVisible]     = useState(false);
  const [particlesVisible, setParticlesVisible] = useState(false);
  const [cardVisible, setCardVisible]           = useState(false);
  const animFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setGridVisible(true), 100);
    const t2 = setTimeout(() => setParticlesVisible(true), 900);
    const t3 = setTimeout(() => setTaglineVisible(true), T.taglineStart);
    const t4 = setTimeout(() => setCardVisible(true), T.cardStart);
    const t5 = setTimeout(() => {
      startTimeRef.current = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / T.logoDuration);
        const eased = 1 - Math.pow(1 - p, 3);
        setLogoProgress(eased);
        if (p < 1) { animFrameRef.current = requestAnimationFrame(animate); }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }, T.logoStart);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleEnter = () => {
    setCardVisible(false);
    setTimeout(onComplete, 400);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D1520', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, overflow: 'hidden' }}>
      <GridBackground visible={gridVisible} />
      <DataParticles visible={particlesVisible} />
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <BrandMark progress={logoProgress} />
        <GoldRule visible={logoProgress > 0.85} />
        <div style={{ marginTop: 22, opacity: taglineVisible ? 1 : 0, transform: taglineVisible ? 'translateY(0)' : 'translateY(12px)', transition: `opacity ${T.taglineDuration}ms ease, transform ${T.taglineDuration}ms ease` }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif', letterSpacing: '3.5px', textTransform: 'uppercase' }}>
            Intelligence Platform for School Systems
          </div>
        </div>
        <div style={{ marginTop: 10, opacity: taglineVisible ? 1 : 0, transform: taglineVisible ? 'translateY(0)' : 'translateY(8px)', transition: `opacity ${T.taglineDuration + 200}ms ease, transform ${T.taglineDuration + 200}ms ease` }}>
          <div style={{ fontSize: '11px', color: 'rgba(201,165,78,0.45)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
            Madden Education Advisory
          </div>
        </div>
      </div>
      <DisclaimerCard visible={cardVisible} onEnter={handleEnter} />
    </div>
  );
}
