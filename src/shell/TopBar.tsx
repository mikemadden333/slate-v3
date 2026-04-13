/**
 * Slate v3 — TopBar
 * Dark chrome header: deep navy background, light text.
 * Typography v2: IBM Plex Sans — crystal clear on dark backgrounds.
 */

import React, { useState, useEffect } from 'react';
import { MODULES } from '../core/constants';
import { bg, text, brand, border, font, fontSize, fontWeight, shadow, radius, transition } from '../core/theme';
import { useNetwork, useRole, useEmergencies } from '../data/DataStore';
import { usePresentationMode } from '../core/PresentationMode';

interface TopBarProps {
  activeModule: string;
  onAskSlate: () => void;
}

export default function TopBar({ activeModule, onAskSlate }: TopBarProps) {
  const network = useNetwork();
  const { role, selectedCampusId } = useRole();
  const { activeEvents } = useEmergencies();
  const { isPresentationMode, togglePresentationMode } = usePresentationMode();
  const mod = MODULES.find(m => m.id === activeModule);
  const campus = role === 'principal' ? network.campuses.find(c => c.id === selectedCampusId) : null;

  const activeEmergencies = activeEvents;

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const pulseKeyframes = `
    @keyframes slatePulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74, 155, 110, 0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(74, 155, 110, 0); }
    }
    @keyframes emergencyPulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(217, 79, 79, 0.5); }
      50% { opacity: 0.7; box-shadow: 0 0 0 5px rgba(217, 79, 79, 0); }
    }
  `;

  const hasEmergency = activeEmergencies.length > 0;

  return (
    <div style={{
      height: 56,
      minHeight: 56,
      background: brand.navy,
      borderBottom: `1px solid ${border.chromLight}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <style>{pulseKeyframes}</style>

      {/* Left: Module identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {mod && (
          <>
            <span style={{ fontSize: fontSize.xl, color: mod.color }}>
              {mod.icon}
            </span>
            <div>
              <div style={{
                fontSize: fontSize.lg, fontWeight: fontWeight.medium,
                color: '#FFFFFF', fontFamily: font.body,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {mod.label}
                {campus && (
                  <span style={{ fontSize: fontSize.base, fontWeight: fontWeight.normal, color: '#C8D5E3' }}>
                    / {campus.short}
                  </span>
                )}
              </div>
              <div style={{ fontSize: fontSize.sm, color: '#8FA3B8', marginTop: -1, fontFamily: font.body }}>
                {mod.description}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Center: Pulse + Date/Time */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: hasEmergency ? '#D94F4F' : '#4A9B6E',
            animation: hasEmergency ? 'emergencyPulse 1.5s ease-in-out infinite' : 'slatePulse 3s ease-in-out infinite',
          }} />
          <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.normal, color: '#C8D5E3', fontFamily: font.body }}>
            {dateStr}
          </div>
          {hasEmergency && (
            <div style={{
              padding: '2px 8px', borderRadius: radius.full,
              background: 'rgba(217, 79, 79, 0.15)', border: '1px solid rgba(217, 79, 79, 0.30)',
              fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: '#D94F4F',
              letterSpacing: 0.5, fontFamily: font.body,
            }}>
              {activeEmergencies.length} ALERT{activeEmergencies.length > 1 ? 'S' : ''}
            </div>
          )}
        </div>
        <div style={{
          fontSize: fontSize.sm, color: '#8FA3B8', fontFamily: font.mono,
          letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{timeStr} CDT</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ color: hasEmergency ? '#D94F4F' : '#4A9B6E', fontWeight: fontWeight.medium }}>
            {hasEmergency ? 'EMERGENCY ACTIVE' : 'AI MONITORING'}
          </span>
        </div>
      </div>

      {/* Right: DEMO badge + Role badge + Ask Slate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isPresentationMode && (
          <button
            onClick={togglePresentationMode}
            title="Presentation Mode active — click to exit (or Ctrl+Shift+P)"
            style={{
              padding: '3px 10px', borderRadius: radius.full,
              background: 'rgba(201,165,78,0.18)',
              border: '1px solid rgba(201,165,78,0.55)',
              fontSize: fontSize.xs, fontWeight: fontWeight.bold,
              color: brand.gold, textTransform: 'uppercase', letterSpacing: '1.5px',
              fontFamily: font.body, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: 7, color: brand.gold }}>●</span>
            DEMO
          </button>
        )}
        <div style={{
          padding: '5px 14px', borderRadius: radius.full,
          background: `${brand.gold}15`,
          border: `1px solid ${brand.gold}30`,
          fontSize: fontSize.sm, fontWeight: fontWeight.medium,
          color: brand.gold, textTransform: 'uppercase', letterSpacing: '1px',
          fontFamily: font.body,
        }}>
          {role === 'ceo' ? 'CEO View' : `Principal · ${campus?.short || ''}`}
        </div>

        <button onClick={onAskSlate} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: radius.lg,
          border: `1px solid rgba(255,255,255,0.15)`, background: 'rgba(255,255,255,0.06)',
          cursor: 'pointer', transition: transition.fast,
          fontFamily: font.body, fontSize: fontSize.base, color: '#C8D5E3',
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = brand.gold;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${brand.gold}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: fontSize.md }}>✦</span>
          Ask Slate
          <span style={{
            fontSize: fontSize.sm, color: '#8FA3B8',
            padding: '1px 6px', borderRadius: radius.sm, background: 'rgba(255,255,255,0.08)',
            fontFamily: font.mono,
          }}>
            ⌘K
          </span>
        </button>
      </div>
    </div>
  );
}
