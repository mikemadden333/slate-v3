/**
 * Slate v3 — Splash Screen
 * The cinematic entry point. Sets the tone before the user enters the platform.
 * Auto-advances through: splash animation → disclaimer → platform.
 * No clicks required — the experience flows automatically.
 */

import React, { useState, useEffect } from 'react';
import { brand, font, modules as modColors } from '../core/theme';

// Module dots matching the original v2 splash
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

// Dark slate gray — matches the app's sidebar/shell, not navy blue
const SPLASH_BG = '#1A1D23';       // warm dark gray (center glow)
const SPLASH_BG_MID = '#131619';   // mid tone
const SPLASH_BG_BASE = '#0D1117';  // matches brand.navy / bg.sidebar exactly

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<'splash' | 'fadeout' | 'disclaimer'>('splash');
  const [fadeIn, setFadeIn] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);

  useEffect(() => {
    // Staggered animation sequence
    const t1 = setTimeout(() => setFadeIn(true), 150);
    const t2 = setTimeout(() => setDotsVisible(true), 900);
    // Auto-advance: fade out splash after 4s, show disclaimer
    const t3 = setTimeout(() => setPhase('fadeout'), 3800);
    const t4 = setTimeout(() => setPhase('disclaimer'), 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const handleEnter = () => onEnter();

  // ── Disclaimer Modal ──
  if (phase === 'disclaimer') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(ellipse at 50% 40%, ${SPLASH_BG} 0%, ${SPLASH_BG_MID} 55%, ${SPLASH_BG_BASE} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeInDisclaimer 0.6s ease forwards',
      }}>
        <style>{`
          @keyframes fadeInDisclaimer {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUpModal {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
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
            onClick={handleEnter}
            style={{
              fontFamily: font.sans,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: '#FFFFFF',
              background: SPLASH_BG_BASE,
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
              (e.target as HTMLButtonElement).style.background = SPLASH_BG_BASE;
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            I Understand — Enter Slate
          </button>
        </div>
      </div>
    );
  }

  // ── Main Splash Screen ──
  const isFadingOut = phase === 'fadeout';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(ellipse at 50% 38%, ${SPLASH_BG} 0%, ${SPLASH_BG_MID} 50%, ${SPLASH_BG_BASE} 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.6s ease',
        paddingBottom: 80, // shift content upward from dead center
      }}
    >
      {/* Subtle ambient glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 35% 25%, rgba(183,145,69,0.04) 0%, transparent 50%), radial-gradient(circle at 65% 75%, rgba(183,145,69,0.02) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Confidential badge */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'all 0.8s ease',
        marginBottom: 52,
      }}>
        <div style={{
          fontFamily: font.mono,
          fontSize: 11,
          letterSpacing: 3.5,
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase' as const,
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          padding: '10px 28px',
        }}>
          Platform Design System — Version 3.0 — Confidential
        </div>
      </div>

      {/* Slate icon — rounded square with two bars, matching v2 */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 1s ease 0.15s',
        marginBottom: 16,
      }}>
        <div style={{
          width: 44,
          height: 36,
          borderRadius: 8,
          border: '2px solid rgba(255,255,255,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
        }}>
          <div style={{ width: 20, height: 2.5, borderRadius: 1.5, background: 'rgba(255,255,255,0.5)' }} />
          <div style={{ width: 20, height: 2.5, borderRadius: 1.5, background: `${brand.gold}90` }} />
        </div>
      </div>

      {/* Slate. logo — BIGGER to match v2 */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'scale(1)' : 'scale(0.93)',
        transition: 'all 1s ease 0.25s',
        marginBottom: 14,
      }}>
        <span style={{
          fontFamily: font.serif,
          fontSize: 88,
          fontWeight: 900,
          color: '#FFFFFF',
          letterSpacing: -3,
        }}>
          Slate
        </span>
        <span style={{
          fontFamily: font.serif,
          fontSize: 88,
          fontWeight: 900,
          color: brand.gold,
        }}>
          .
        </span>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transition: 'all 0.8s ease 0.5s',
        fontFamily: font.mono,
        fontSize: 13,
        letterSpacing: 5,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase' as const,
        marginBottom: 44,
      }}>
        Start with the Facts
      </div>

      {/* Module dots — BIGGER to match v2 */}
      <div style={{
        display: 'flex',
        gap: 28,
        alignItems: 'center',
        marginBottom: 20,
        opacity: dotsVisible ? 1 : 0,
        transition: 'all 1s ease',
      }}>
        {MODULE_DOTS.map((mod, i) => (
          <div key={mod.label} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            opacity: dotsVisible ? 1 : 0,
            transform: dotsVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: `all 0.5s ease ${i * 0.07}s`,
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
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase' as const,
            }}>
              {mod.label}
            </div>
          </div>
        ))}
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: dotsVisible ? 1 : 0,
        transition: 'all 1s ease 0.8s',
        fontFamily: font.sans,
        fontSize: 15,
        color: 'rgba(255,255,255,0.35)',
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
        opacity: fadeIn ? 1 : 0,
        transition: 'all 1s ease 1.2s',
      }}>
        <div style={{
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: 3,
          color: 'rgba(255,255,255,0.28)',
          textTransform: 'uppercase' as const,
          fontWeight: 600,
        }}>
          Madden Education Advisory
        </div>
        <div style={{
          fontFamily: font.mono,
          fontSize: 9,
          letterSpacing: 2.5,
          color: 'rgba(255,255,255,0.18)',
          textTransform: 'uppercase' as const,
        }}>
          Intelligence for School Systems
        </div>
        <div style={{
          fontFamily: font.mono,
          fontSize: 8,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.12)',
          textTransform: 'uppercase' as const,
        }}>
          Proprietary & Confidential · All Rights Reserved · 2026
        </div>
        {/* Easter egg icons — the family */}
        <div style={{
          display: 'flex',
          gap: 14,
          marginTop: 10,
          fontSize: 15,
          opacity: 0.15,
        }}>
          <span title="Mike">🐇</span>
          <span title="Wife">🦋</span>
          <span title="Kid">🐩</span>
        </div>
      </div>
    </div>
  );
}
