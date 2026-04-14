/**
 * Slate — TopBar
 * Redesign Brief: white header, 64px height, page title + subtitle + command search + timestamp.
 * Inter only. No dark backgrounds. No gold.
 */
import React, { useState, useEffect } from 'react';
import { MODULES } from '../core/constants';
import { bg, text, border, font, fontSize, fontWeight, radius, transition, status } from '../core/theme';
import { useNetwork, useRole, useEmergencies } from '../data/DataStore';
import { usePresentationMode } from '../core/PresentationMode';

interface TopBarProps {
  activeModule: string;
  onAskSlate: () => void;
}

export default function TopBar({ activeModule, onAskSlate }: TopBarProps) {
  const network = useNetwork();
  const { role } = useRole();
  const { activeEvents } = useEmergencies();
  const { isPresentationMode } = usePresentationMode();
  const mod = MODULES.find(m => m.id === activeModule);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hasEmergency = activeEvents.length > 0;

  return (
    <div style={{
      height: 64,
      minHeight: 64,
      background: bg.header,
      borderBottom: `1px solid ${border.light}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Module icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {mod && (
          <span style={{
            fontSize: fontSize.lg,
            color: text.muted,
            flexShrink: 0,
          }}>{mod.icon}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: text.primary,
            fontFamily: font.body,
            letterSpacing: '-0.2px',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {mod?.label || 'Slate'}
          </div>
          <div style={{
            fontSize: fontSize.sm,
            color: text.muted,
            fontFamily: font.body,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}>
            {mod?.description || 'Intelligence Platform for School Systems'}
          </div>
        </div>
      </div>

      {/* Center: date/time */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: fontSize.sm,
          color: text.muted,
          fontFamily: font.body,
          textAlign: 'center',
        }}>
          <span style={{ color: text.secondary, fontWeight: fontWeight.medium }}>{dateStr}</span>
          <span style={{ margin: '0 6px', color: border.medium }}>·</span>
          <span>{timeStr} CDT</span>
        </div>

        {/* AI Monitoring indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: radius.full,
          background: hasEmergency ? 'rgba(229,72,77,0.08)' : 'rgba(23,178,106,0.08)',
          border: `1px solid ${hasEmergency ? 'rgba(229,72,77,0.20)' : 'rgba(23,178,106,0.20)'}`,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: hasEmergency ? status.red : status.green,
            animation: 'topbarPulse 2.5s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.medium,
            color: hasEmergency ? status.red : status.green,
            fontFamily: font.body,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {hasEmergency ? `${activeEvents.length} Alert${activeEvents.length > 1 ? 's' : ''}` : 'AI Monitoring'}
          </span>
        </div>
      </div>

      {/* Right: role badge + Ask Slate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          color: text.secondary,
          fontFamily: font.body,
          padding: '5px 12px',
          borderRadius: radius.sm,
          background: bg.subtle,
          border: `1px solid ${border.light}`,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {role === 'ceo' ? 'CEO View' : 'Principal View'}
        </div>

        {isPresentationMode && (
          <div style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.medium,
            color: status.amber,
            fontFamily: font.body,
            padding: '5px 10px',
            borderRadius: radius.sm,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.20)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Demo Mode
          </div>
        )}

        <button
          onClick={onAskSlate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: radius.sm,
            border: `1px solid ${border.medium}`,
            background: bg.card,
            color: text.secondary,
            fontSize: fontSize.sm,
            fontFamily: font.body,
            fontWeight: fontWeight.medium,
            cursor: 'pointer',
            transition: transition.fast,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ color: text.accent }}>✦</span>
          <span>Ask Slate</span>
          <span style={{
            fontSize: '10px',
            color: text.light,
            background: bg.subtle,
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: font.mono,
          }}>⌘K</span>
        </button>
      </div>

      <style>{`
        @keyframes topbarPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
