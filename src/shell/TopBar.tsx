/**
 * Slate — TopBar
 * Dark slate shell: matches sidebar #1A2332.
 * 64px height, module title + timestamp + AI status + Ask Slate.
 */
import React, { useState, useEffect } from 'react';
import { MODULES } from '../core/constants';
import { bg, font, fontSize, fontWeight, radius, transition, status, modules as moduleColors } from '../core/theme';
import { useNetwork, useRole, useEmergencies } from '../data/DataStore';
import { usePresentationMode } from '../core/PresentationMode';

// Shell-specific dark constants
const SHELL = {
  border:     'rgba(255, 255, 255, 0.08)',
  titleText:  '#FFFFFF',
  subText:    'rgba(255, 255, 255, 0.45)',
  dateText:   'rgba(255, 255, 255, 0.55)',
  dateBold:   'rgba(255, 255, 255, 0.80)',
  divider:    'rgba(255, 255, 255, 0.15)',
  badgeBg:    'rgba(255, 255, 255, 0.08)',
  badgeBorder:'rgba(255, 255, 255, 0.12)',
  badgeText:  'rgba(255, 255, 255, 0.60)',
  btnBg:      'rgba(255, 255, 255, 0.08)',
  btnBorder:  'rgba(255, 255, 255, 0.15)',
  btnText:    'rgba(255, 255, 255, 0.80)',
};

interface TopBarProps {
  activeModule: string;
  onAskSlate: () => void;
}

export default function TopBar({ activeModule, onAskSlate }: TopBarProps) {
  const { role } = useRole();
  const { activeEvents } = useEmergencies();
  const { isPresentationMode } = usePresentationMode();
  const mod = MODULES.find(m => m.id === activeModule);
  const [now, setNow] = useState(new Date());
  const accentColor = moduleColors[activeModule as keyof typeof moduleColors] || '#4F7CFF';

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const hasEmergency = activeEvents.length > 0;

  return (
    <div style={{
      height: 60,
      minHeight: 60,
      background: bg.header,
      borderBottom: `1px solid ${SHELL.border}`,
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
            fontSize: '18px',
            color: accentColor,
            flexShrink: 0,
            opacity: 0.85,
          }}>{mod.icon}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: SHELL.titleText,
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
            fontSize: fontSize.xs,
            color: SHELL.subText,
            fontFamily: font.body,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}>
            {mod?.description || 'Intelligence Platform for School Systems'}
          </div>
        </div>
      </div>

      {/* Center: date/time + AI status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: fontSize.sm,
          color: SHELL.dateText,
          fontFamily: font.body,
          textAlign: 'center',
        }}>
          <span style={{ color: SHELL.dateBold, fontWeight: fontWeight.medium }}>{dateStr}</span>
          <span style={{ margin: '0 6px', color: SHELL.divider }}>·</span>
          <span>{timeStr} CDT</span>
        </div>

        {/* AI Monitoring indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: radius.full,
          background: hasEmergency ? 'rgba(229,72,77,0.15)' : 'rgba(23,178,106,0.15)',
          border: `1px solid ${hasEmergency ? 'rgba(229,72,77,0.30)' : 'rgba(23,178,106,0.30)'}`,
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
            fontWeight: fontWeight.semibold,
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
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          color: SHELL.badgeText,
          fontFamily: font.body,
          padding: '5px 12px',
          borderRadius: radius.sm,
          background: SHELL.badgeBg,
          border: `1px solid ${SHELL.badgeBorder}`,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
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
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.30)',
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
            border: `1px solid ${SHELL.btnBorder}`,
            background: SHELL.btnBg,
            color: SHELL.btnText,
            fontSize: fontSize.sm,
            fontFamily: font.body,
            fontWeight: fontWeight.medium,
            cursor: 'pointer',
            transition: transition.fast,
          }}
        >
          <span style={{ color: '#C9A54E' }}>✦</span>
          <span>Ask Slate</span>
          <span style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.08)',
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
