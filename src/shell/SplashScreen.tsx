/**
 * Slate v3 — Splash Screen
 * The cinematic entry point. Sets the tone before the user enters the platform.
 * Matches the original v2 design: confidential badge, Slate logo with gold dot,
 * tagline, module color dots, footer with Madden Education Advisory branding.
 */

import React, { useState, useEffect } from 'react';
import { brand, font, modules as modColors } from '../core/theme';

// Module dots in the order shown on the original splash
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

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [phase, setPhase] = useState<'splash' | 'disclaimer'>('splash');
  const [fadeIn, setFadeIn] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeIn(true), 200);
    const t2 = setTimeout(() => setDotsVisible(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleSplashClick = () => setPhase('disclaimer');
  const handleEnter = () => onEnter();

  if (phase === 'disclaimer') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10, 14, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '48px 40px',
          maxWidth: 480,
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            fontSize: 11,
            fontFamily: font.mono,
            letterSpacing: 2,
            color: brand.gold,
            fontWeight: 700,
            marginBottom: 16,
            textTransform: 'uppercase',
          }}>
            Important Notice
          </div>
          <h2 style={{
            fontFamily: font.serif,
            fontSize: 22,
            fontWeight: 700,
            color: '#0A0E14',
            margin: '0 0 16px',
          }}>
            Illustrative Platform Demo
          </h2>
          <p style={{
            fontFamily: font.sans,
            fontSize: 14,
            lineHeight: 1.7,
            color: '#4A5568',
            margin: '0 0 8px',
          }}>
            All data, organizations, names, figures, and scenarios in Slate
            are <strong style={{ color: '#0A0E14' }}>fictional and for demonstration purposes only</strong>.
            This platform is not connected to any live systems and does not
            represent any real institution, school network, or organization.
          </p>
          <p style={{
            fontFamily: font.sans,
            fontSize: 14,
            lineHeight: 1.7,
            color: '#4A5568',
            margin: '0 0 28px',
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
              background: brand.navy,
              border: 'none',
              borderRadius: 8,
              padding: '14px 32px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = '#1A2332';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = brand.navy;
            }}
          >
            I Understand — Enter Slate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleSplashClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(ellipse at 50% 40%, #1A2332 0%, ${brand.navy} 50%, #060A10 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {/* Subtle animated gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 20%, rgba(183, 145, 69, 0.03) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(183, 145, 69, 0.02) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Confidential badge */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'all 0.8s ease',
        marginBottom: 48,
      }}>
        <div style={{
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: 3,
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding: '8px 20px',
        }}>
          Platform Design System — Version 3.0 — Confidential
        </div>
      </div>

      {/* Slate icon */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 1s ease 0.2s',
        marginBottom: 12,
      }}>
        <div style={{
          width: 32,
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${brand.gold}, ${brand.brass})`,
        }} />
      </div>

      {/* Slate. logo */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 1s ease 0.3s',
        marginBottom: 12,
      }}>
        <span style={{
          fontFamily: font.serif,
          fontSize: 72,
          fontWeight: 900,
          color: '#FFFFFF',
          letterSpacing: -2,
        }}>
          Slate
        </span>
        <span style={{
          fontFamily: font.serif,
          fontSize: 72,
          fontWeight: 900,
          color: brand.gold,
        }}>
          .
        </span>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transition: 'all 0.8s ease 0.6s',
        fontFamily: font.mono,
        fontSize: 11,
        letterSpacing: 4,
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        marginBottom: 40,
      }}>
        Start with the Facts
      </div>

      {/* Module dots */}
      <div style={{
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        marginBottom: 16,
        opacity: dotsVisible ? 1 : 0,
        transition: 'all 1s ease',
      }}>
        {MODULE_DOTS.map((mod, i) => (
          <div key={mod.label} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            opacity: dotsVisible ? 1 : 0,
            transform: dotsVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: `all 0.5s ease ${i * 0.08}s`,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: mod.color,
              boxShadow: `0 0 8px ${mod.color}40`,
            }} />
            <div style={{
              fontFamily: font.mono,
              fontSize: 7,
              letterSpacing: 1.5,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
            }}>
              {mod.label}
            </div>
          </div>
        ))}
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: dotsVisible ? 1 : 0,
        transition: 'all 1s ease 1s',
        fontFamily: font.sans,
        fontSize: 13,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 1,
        marginTop: 24,
      }}>
        Intelligence for School Systems
      </div>

      {/* Click to enter hint */}
      <div style={{
        opacity: dotsVisible ? 0.4 : 0,
        transition: 'all 1s ease 2s',
        fontFamily: font.mono,
        fontSize: 10,
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: 60,
      }}>
        Click anywhere to continue
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
        transition: 'all 1s ease 1.5s',
      }}>
        <div style={{
          fontFamily: font.mono,
          fontSize: 9,
          letterSpacing: 2.5,
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          Madden Education Advisory
        </div>
        <div style={{
          fontFamily: font.mono,
          fontSize: 8,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.15)',
          textTransform: 'uppercase',
        }}>
          Intelligence for School Systems
        </div>
        <div style={{
          fontFamily: font.mono,
          fontSize: 7,
          letterSpacing: 1.5,
          color: 'rgba(255,255,255,0.12)',
          textTransform: 'uppercase',
        }}>
          Proprietary & Confidential · All Rights Reserved · 2026
        </div>
        {/* Easter egg icons */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 8,
          fontSize: 14,
          opacity: 0.15,
        }}>
          <span>🐇</span>
          <span>🦋</span>
          <span>🐩</span>
        </div>
      </div>
    </div>
  );
}
