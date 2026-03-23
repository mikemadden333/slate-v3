/**
 * Slate v3 — TopBar
 * Module header bar with breadcrumb, data freshness indicator, and Ask Slate trigger.
 */

import React from 'react';
import { MODULES } from '../core/constants';
import { bg, text, brand, border, font, fontSize, fontWeight, shadow, radius, transition } from '../core/theme';
import { useNetwork, useRole } from '../data/DataStore';

interface TopBarProps {
  activeModule: string;
  onAskSlate: () => void;
}

export default function TopBar({ activeModule, onAskSlate }: TopBarProps) {
  const network = useNetwork();
  const { role, selectedCampusId } = useRole();
  const mod = MODULES.find(m => m.id === activeModule);
  const campus = role === 'principal' ? network.campuses.find(c => c.id === selectedCampusId) : null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

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
      {/* Left: Module identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {mod && (
          <>
            <span style={{
              fontSize: fontSize.xl,
              color: mod.color,
            }}>
              {mod.icon}
            </span>
            <div>
              <div style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: text.primary,
                fontFamily: font.sans,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                {mod.label}
                {campus && (
                  <span style={{
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.normal,
                    color: text.muted,
                  }}>
                    / {campus.short}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: fontSize.xs,
                color: text.light,
                marginTop: -1,
              }}>
                {mod.description}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Center: Date/Time */}
      <div style={{
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: text.secondary,
        }}>
          {dateStr}
        </div>
        <div style={{
          fontSize: fontSize.xs,
          color: text.light,
        }}>
          {timeStr} CDT
        </div>
      </div>

      {/* Right: Ask Slate + Role badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Role badge */}
        <div style={{
          padding: '4px 12px',
          borderRadius: radius.full,
          background: role === 'ceo' ? `${brand.gold}15` : `${brand.brass}15`,
          border: `1px solid ${role === 'ceo' ? brand.gold : brand.brass}30`,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          color: brand.brass,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {role === 'ceo' ? 'CEO View' : `Principal · ${campus?.short || ''}`}
        </div>

        {/* Ask Slate button */}
        <button
          onClick={onAskSlate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: radius.lg,
            border: `1px solid ${border.light}`,
            background: bg.card,
            cursor: 'pointer',
            transition: transition.fast,
            fontFamily: font.sans,
            fontSize: fontSize.sm,
            color: text.muted,
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
            fontSize: fontSize.xs,
            color: text.light,
            padding: '1px 6px',
            borderRadius: radius.sm,
            background: bg.subtle,
          }}>
            ⌘K
          </span>
        </button>
      </div>
    </div>
  );
}
