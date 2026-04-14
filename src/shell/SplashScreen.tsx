/**
 * Slate v3 — Splash Screen v8 "The Reveal"
 *
 * Design concept: A camera aperture opens slowly in the dark,
 * revealing the deep navy world behind it. The wordmark materializes.
 * Gold flecks fall gently from the period. A gold rule draws itself.
 * Then stillness. Then the disclaimer card rises.
 *
 * Timeline:
 *   0.0s  — Black void
 *   0.6s  — Thin gold ring appears
 *   1.0s  — Aperture begins opening (2.5s duration)
 *   2.0s  — Navy background fades in behind aperture
 *   3.2s  — "Slate." wordmark materializes
 *   3.8s  — Gold flecks begin falling from period
 *   4.6s  — Gold rule draws left to right
 *   5.4s  — Tagline + subtitle fade in
 *   8.0s  — Disclaimer card rises
 */
import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

// ─── Aperture Canvas ──────────────────────────────────────────────────────────
// 12 precision blades rotate open from closed (overlapping) to open (spread)
// Rendered on canvas for smooth 60fps animation
function ApertureCanvas({ phase }: { phase: 'closed' | 'opening' | 'open' | 'fading' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const cx = W / 2;
    const cy = H / 2;
    const BLADES = 12;
    const OUTER_R = Math.min(W, H) * 0.22;
    const INNER_R = OUTER_R * 0.06;
    const BLADE_WIDTH_ANGLE = (Math.PI * 2) / BLADES * 0.72; // overlap factor

    function easeInOutCubic(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function drawFrame(progress: number, globalAlpha: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = globalAlpha;

      // Outer ring — always visible when aperture is visible
      ctx.beginPath();
      ctx.arc(cx, cy, OUTER_R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212,175,55,${0.18 * globalAlpha})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, INNER_R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212,175,55,${0.35 * globalAlpha})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,175,55,${0.6 * globalAlpha})`;
      ctx.fill();

      // Blades — each is a thin trapezoid radiating from inner ring to outer ring
      // At progress=0: blades overlap (closed aperture, dark center)
      // At progress=1: blades spread open (open aperture, clear center)
      const openAngle = (Math.PI * 2) / BLADES; // fully open: each blade at its own slot
      const closedAngle = 0; // fully closed: all blades at same angle (stacked)

      for (let i = 0; i < BLADES; i++) {
        const baseAngle = (i / BLADES) * Math.PI * 2;
        // Each blade rotates from its closed position to its open position
        const closedOffset = 0;
        const openOffset = openAngle * 0.5; // rotate half a slot open
        const currentOffset = closedOffset + (openOffset - closedOffset) * progress;
        const bladeAngle = baseAngle + currentOffset;

        // Blade shape: thin arc segment from inner to outer radius
        const halfW = BLADE_WIDTH_ANGLE * (1 - progress * 0.3); // blades thin as they open

        ctx.beginPath();
        // Inner arc
        ctx.arc(cx, cy, INNER_R + 2, bladeAngle - halfW * 0.3, bladeAngle + halfW * 0.3);
        // Outer arc (reverse)
        ctx.arc(cx, cy, OUTER_R - 2, bladeAngle + halfW, bladeAngle - halfW, true);
        ctx.closePath();

        // Blade fill — very subtle gold gradient
        const grad = ctx.createRadialGradient(cx, cy, INNER_R, cx, cy, OUTER_R);
        grad.addColorStop(0, `rgba(212,175,55,${0.08 * globalAlpha})`);
        grad.addColorStop(0.5, `rgba(180,150,40,${0.12 * globalAlpha})`);
        grad.addColorStop(1, `rgba(212,175,55,${0.04 * globalAlpha})`);
        ctx.fillStyle = grad;
        ctx.fill();

        // Blade edge — hairline gold stroke
        ctx.strokeStyle = `rgba(212,175,55,${0.55 * globalAlpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    let targetProgress = 0;
    let targetAlpha = 0;

    if (phase === 'closed') {
      targetProgress = 0;
      targetAlpha = 0.15;
    } else if (phase === 'opening') {
      // Animate from 0 to 1 over 2500ms
      startTimeRef.current = null;
      const DURATION = 2500;

      function animate(ts: number) {
        if (!startTimeRef.current) startTimeRef.current = ts;
        const elapsed = ts - startTimeRef.current;
        const t = Math.min(elapsed / DURATION, 1);
        const p = easeInOutCubic(t);
        progressRef.current = p;
        drawFrame(p, 1.0);
        if (t < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          progressRef.current = 1;
        }
      }
      animRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animRef.current);
    } else if (phase === 'open') {
      drawFrame(1, 1.0);
    } else if (phase === 'fading') {
      // Fade out over 800ms
      startTimeRef.current = null;
      const DURATION = 800;
      const startP = progressRef.current;

      function fadeOut(ts: number) {
        if (!startTimeRef.current) startTimeRef.current = ts;
        const elapsed = ts - startTimeRef.current;
        const t = Math.min(elapsed / DURATION, 1);
        const alpha = 1 - easeInOutCubic(t);
        drawFrame(startP, alpha);
        if (t < 1) {
          animRef.current = requestAnimationFrame(fadeOut);
        } else {
          ctx.clearRect(0, 0, W, H);
        }
      }
      animRef.current = requestAnimationFrame(fadeOut);
      return () => cancelAnimationFrame(animRef.current);
    }

    if (phase !== 'opening' && phase !== 'fading') {
      drawFrame(targetProgress, targetAlpha);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5,
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Gold Fleck Canvas ────────────────────────────────────────────────────────
// Tiny elongated teardrops fall gently from the period position
function GoldFleckCanvas({ active, periodX, periodY }: {
  active: boolean;
  periodX: number;
  periodY: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const flecksRef = useRef<Array<{
    x: number; y: number; vy: number; vx: number;
    size: number; alpha: number; maxAlpha: number;
    rotation: number; rotV: number; born: number;
  }>>([]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    let lastSpawn = 0;
    const SPAWN_INTERVAL = 280; // ms between new flecks
    let startTime: number | null = null;

    function spawnFleck(now: number) {
      flecksRef.current.push({
        x: periodX + (Math.random() - 0.5) * 8,
        y: periodY + 10,
        vy: 0.4 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.25,
        size: 1.8 + Math.random() * 2.2,
        alpha: 0,
        maxAlpha: 0.55 + Math.random() * 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.015,
        born: now,
      });
    }

    function drawFleck(f: typeof flecksRef.current[0]) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      ctx.globalAlpha = f.alpha;

      // Elongated teardrop / fleck shape
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size * 0.38, f.size, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#D4AF37';
      ctx.fill();

      // Subtle inner highlight
      ctx.beginPath();
      ctx.ellipse(0, -f.size * 0.2, f.size * 0.15, f.size * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,240,180,0.5)';
      ctx.fill();

      ctx.restore();
    }

    function animate(ts: number) {
      if (!startTime) startTime = ts;
      ctx.clearRect(0, 0, W, H);

      // Spawn new fleck
      if (ts - lastSpawn > SPAWN_INTERVAL) {
        spawnFleck(ts);
        lastSpawn = ts;
      }

      // Update and draw
      flecksRef.current = flecksRef.current.filter(f => f.alpha > 0.01 || ts - f.born < 200);

      for (const f of flecksRef.current) {
        const age = ts - f.born;
        // Fade in over 300ms, then fade out starting at 1800ms
        if (age < 300) {
          f.alpha = (age / 300) * f.maxAlpha;
        } else if (age > 1800) {
          f.alpha = Math.max(0, f.maxAlpha * (1 - (age - 1800) / 800));
        }

        f.x += f.vx;
        f.y += f.vy;
        f.rotation += f.rotV;
        f.vy += 0.008; // very gentle gravity

        drawFleck(f);
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, periodX, periodY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Animated Gold Rule ───────────────────────────────────────────────────────
function AnimatedRule({ visible }: { visible: boolean }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: 420,
      height: 1,
      margin: '32px 0 28px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        height: '100%',
        width: '100%',
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.6) 50%, transparent 100%)',
        transform: visible ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'left center',
        transition: visible ? 'transform 1.1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        transitionDelay: visible ? '0.1s' : '0s',
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
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34,1.4,0.64,1)',
      pointerEvents: visible ? 'auto' : 'none',
      background: visible ? 'rgba(4,8,18,0.85)' : 'transparent',
      backdropFilter: visible ? 'blur(20px)' : 'none',
    }}>
      <div style={{
        background: 'linear-gradient(160deg, rgba(18,28,52,0.98) 0%, rgba(10,16,32,0.99) 100%)',
        backdropFilter: 'blur(32px)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 20,
        padding: '44px 48px',
        maxWidth: 500,
        width: '90%',
        boxShadow: [
          '0 60px 140px rgba(0,0,0,0.75)',
          '0 0 0 1px rgba(255,255,255,0.03) inset',
          '0 1px 0 rgba(212,175,55,0.12) inset',
        ].join(', '),
      }}>
        {/* Logo + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #D4AF37 0%, #A8880A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: '#0A1220',
            fontFamily: 'Playfair Display, serif',
            boxShadow: '0 2px 16px rgba(212,175,55,0.4)',
            flexShrink: 0,
          }}>S</div>
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em',
            color: 'rgba(212,175,55,0.7)', fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase' as const,
          }}>IMPORTANT NOTICE</span>
        </div>

        <p style={{
          fontSize: 14.5, lineHeight: 1.8, color: 'rgba(255,255,255,0.8)',
          fontFamily: 'Inter, sans-serif', marginBottom: 14, fontWeight: 400,
        }}>
          This platform contains <strong style={{ color: '#fff', fontWeight: 600 }}>confidential financial, operational, and student data</strong> for authorized users only.
        </p>
        <p style={{
          fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.48)',
          fontFamily: 'Inter, sans-serif', marginBottom: 34, fontWeight: 400,
        }}>
          All data shown is <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>simulated demo data</strong> for demonstration purposes only.
        </p>

        <button
          onClick={onEnter}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: '100%', padding: '15px 24px',
            background: hovered
              ? 'linear-gradient(135deg, #E8C84A 0%, #C9A020 100%)'
              : 'linear-gradient(135deg, #D4AF37 0%, #B08A0A 100%)',
            border: 'none', borderRadius: 11,
            fontSize: 13.5, fontWeight: 700, letterSpacing: '0.07em',
            color: '#080E1C', fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: hovered
              ? '0 20px 50px rgba(212,175,55,0.5)'
              : '0 8px 28px rgba(212,175,55,0.3)',
            transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
            letterSpacing: '0.06em' as any,
          }}
        >
          I Understand — Enter Slate
        </button>

        <div style={{
          marginTop: 20, textAlign: 'center' as const,
          fontSize: 10.5, color: 'rgba(255,255,255,0.18)',
          fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em',
          textTransform: 'uppercase' as const,
        }}>
          Madden Education Advisory · Confidential · Not for distribution
        </div>
      </div>
    </div>
  );
}

// ─── Main Splash ──────────────────────────────────────────────────────────────
export default function SplashScreen({ onComplete }: SplashScreenProps) {
  // Phase states
  const [bgVisible, setBgVisible] = useState(false);
  const [aperturePhase, setAperturePhase] = useState<'closed' | 'opening' | 'open' | 'fading'>('closed');
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [flecksActive, setFlecksActive] = useState(false);
  const [ruleVisible, setRuleVisible] = useState(false);
  const [taglineVisible, setTaglineVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  // Period position for flecks — measured after wordmark renders
  const periodRef = useRef<HTMLSpanElement>(null);
  const [periodPos, setPeriodPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight * 0.42 });

  useEffect(() => {
    // 0.0s — black void (initial state)
    // 0.6s — aperture appears (closed)
    const t1 = setTimeout(() => setAperturePhase('closed'), 600);
    // 1.0s — navy bg begins fading in
    const t2 = setTimeout(() => setBgVisible(true), 1000);
    // 1.2s — aperture begins opening (takes 2.5s)
    const t3 = setTimeout(() => setAperturePhase('opening'), 1200);
    // 3.2s — wordmark materializes
    const t4 = setTimeout(() => setWordmarkVisible(true), 3200);
    // 3.8s — gold flecks begin
    const t5 = setTimeout(() => {
      // Measure period position
      if (periodRef.current) {
        const rect = periodRef.current.getBoundingClientRect();
        setPeriodPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.7 });
      }
      setFlecksActive(true);
    }, 3800);
    // 4.6s — aperture fades out
    const t6 = setTimeout(() => setAperturePhase('fading'), 4600);
    // 4.8s — rule draws
    const t7 = setTimeout(() => setRuleVisible(true), 4800);
    // 5.6s — tagline fades in
    const t8 = setTimeout(() => setTaglineVisible(true), 5600);
    // 6.2s — footer fades in
    const t9 = setTimeout(() => setFooterVisible(true), 6200);
    // 8.2s — disclaimer card rises
    const t10 = setTimeout(() => setCardVisible(true), 8200);

    return () => {
      [t1,t2,t3,t4,t5,t6,t7,t8,t9,t10].forEach(clearTimeout);
    };
  }, []);

  const handleEnter = () => {
    setCardVisible(false);
    setFlecksActive(false);
    setWordmarkVisible(false);
    setBgVisible(false);
    setTimeout(onComplete, 500);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      background: '#030810',
    }}>
      {/* Deep navy background — fades in as aperture opens */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 100% 80% at 50% 40%, #0d1b36 0%, #080f1e 50%, #040a14 100%)',
        opacity: bgVisible ? 1 : 0,
        transition: 'opacity 1.8s ease',
        zIndex: 1,
      }} />

      {/* Aperture */}
      <ApertureCanvas phase={aperturePhase} />

      {/* Gold flecks */}
      <GoldFleckCanvas
        active={flecksActive}
        periodX={periodPos.x}
        periodY={periodPos.y}
      />

      {/* Main content */}
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '60px 48px',
        zIndex: 10,
      }}>
        {/* Top spacer */}
        <div />

        {/* Center — Brand Block */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: wordmarkVisible ? 1 : 0,
          transform: wordmarkVisible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 1.4s ease, transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Wordmark */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 0,
          }}>
            <span style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 900,
              fontSize: 'clamp(72px, 10vw, 120px)',
              color: '#F2EDE4',
              letterSpacing: '-0.025em',
              lineHeight: 1,
            }}>
              Slate
            </span>
            <span
              ref={periodRef}
              style={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: 900,
                fontSize: 'clamp(72px, 10vw, 120px)',
                color: '#D4AF37',
                lineHeight: 1,
                textShadow: '0 0 30px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.2)',
              }}
            >
              .
            </span>
          </div>

          {/* Animated gold rule */}
          <AnimatedRule visible={ruleVisible} />

          {/* Tagline */}
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.26em',
            color: 'rgba(212,175,55,0.55)',
            textTransform: 'uppercase' as const,
            fontFamily: 'Inter, sans-serif',
            marginBottom: 16,
            opacity: taglineVisible ? 1 : 0,
            transform: taglineVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 1.0s ease, transform 1.0s ease',
          }}>
            CLARITY IN COMPLEXITY · INTELLIGENCE IN MOTION
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 18,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.32)',
            letterSpacing: '0.02em',
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'italic' as const,
            opacity: taglineVisible ? 1 : 0,
            transform: taglineVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 1.0s ease 0.2s, transform 1.0s ease 0.2s',
          }}>
            The operating system for school system leaders
          </div>
        </div>

        {/* Bottom — Footer */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          opacity: footerVisible ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.22)',
            textTransform: 'uppercase' as const,
            fontFamily: 'Inter, sans-serif',
          }}>
            MADDEN EDUCATION ADVISORY
          </div>
          <div style={{
            fontSize: 9.5,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.1)',
            textTransform: 'uppercase' as const,
            fontFamily: 'Inter, sans-serif',
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
