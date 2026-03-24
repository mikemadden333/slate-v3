/**
 * Slate v3 — TopBar
 * Module header bar with breadcrumb, data freshness indicator, Pulse heartbeat,
 * and Ask Slate trigger.
 *
 * v3.2 — Added "Pulse" — a living heartbeat indicator that makes the platform
 * feel alive. A breathing dot, AI status timestamp, and emergency awareness.
 */

import React, { useState, useEffect } from 'react';
import { MODULES } from '../core/constants';
import { bg, text, brand, border, font, fontSize, fontWeight, shadow, radius, transition } from '../core/theme';
import { useNetwork, useRole, useEmergencies } from '../data/DataStore';

interface TopBarProps {
  activeModule: string;
  onAskSlate: () => void;
}

export default function TopBar({ activeModule, onAskSlate }: TopBarProps) {
  const network = useNetwork();
  const { role, selectedCampusId } = useRole();
  const { activeEvents } = useEmergencies();
  const mod = MODULES.find(m => m.id === activeModule);
  const campus = role === 'principal' ? network.campuses.find(c => c.id === selectedCampusId) : null;

  const activeEmergencies = activeEvents;

  // Live clock that updates every minute
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Pulse animation styles
  const pulseKeyframes = `
    @keyframes slatePulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
    }
    @keyframes emergencyPulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
      50% { opacity: 0.7; box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
    }
  `;

  const hasEmergency = activeEmergencies.length > 0;

  return (
    <div style={{
      height: 56,
      minHeight: 56,
      background: bg.card,
      borderBottom: `1px solid ${border.light}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: shadow.sm,
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
                fontSize: fontSize.lg, fontWeight: fontWeight.semibold,
                color: text.primary, fontFamily: font.sans,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {mod.label}
                {campus && (
                  <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.normal, color: text.muted }}>
                    / {campus.short}
                  </span>
                )}
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: -1 }}>
                {mod.description}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Center: Pulse + Date/Time + Intelligence Status */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Breathing pulse dot */}
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: hasEmergency ? '#EF4444' : '#34D399',
            animation: hasEmergency ? 'emergencyPulse 1.5s ease-in-out infinite' : 'slatePulse 3s ease-in-out infinite',
          }} />
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.secondary }}>
            {dateStr}
          </div>
          {/* Emergency count badge */}
          {hasEmergency && (
            <div style={{
              padding: '1px 7px', borderRadius: radius.full,
              background: '#FEE2E2', border: '1px solid #FECACA',
              fontSize: 10, fontWeight: 700, color: '#DC2626',
              letterSpacing: 0.5,
            }}>
              {activeEmergencies.length} ALERT{activeEmergencies.length > 1 ? 'S' : ''}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 10, color: text.light, fontFamily: font.mono,
          letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{timeStr} CDT</span>
          <span style={{ color: border.light }}>·</span>
          <span style={{ color: hasEmergency ? '#EF4444' : '#34D399' }}>
            {hasEmergency ? 'EMERGENCY ACTIVE' : 'AI MONITORING'}
          </span>
        </div>
      </div>

      {/* Right: Ask Slate + Role badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Role badge */}
        <div style={{
          padding: '4px 12px', borderRadius: radius.full,
          background: role === 'ceo' ? `${brand.gold}15` : `${brand.brass}15`,
          border: `1px solid ${role === 'ceo' ? brand.gold : brand.brass}30`,
          fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
          color: brand.brass, textTransform: 'uppercase', letterSpacing: '1px',
        }}>
          {role === 'ceo' ? 'CEO View' : `Principal · ${campus?.short || ''}`}
        </div>

        {/* Ask Slate button */}
        <button onClick={onAskSlate} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: radius.lg,
          border: `1px solid ${border.light}`, background: bg.card,
          cursor: 'pointer', transition: transition.fast,
          fontFamily: font.sans, fontSize: fontSize.sm, color: text.muted,
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = brand.brass;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${brand.brass}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = border.light;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: fontSize.md }}>✦</span>
          Ask Slate
          <span style={{
            fontSize: fontSize.xs, color: text.light,
            padding: '1px 6px', borderRadius: radius.sm, background: bg.subtle,
          }}>
            ⌘K
          </span>
        </button>
      </div>
    </div>
  );
}
