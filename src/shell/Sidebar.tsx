/**
 * Slate — Sidebar
 * Dark slate shell: #1A2332 background, light text on dark.
 * Left rail 88 collapsed / 248 expanded.
 */
import React, { useState } from 'react';
import { MODULES, NAV_GROUPS, APP_NAME } from '../core/constants';
import { bg, text, modules as moduleColors, font, fontSize, fontWeight, radius, transition } from '../core/theme';
import { useRole, useNetwork } from '../data/DataStore';

// Shell-specific color constants (dark slate surface)
const SHELL = {
  border:      'rgba(255, 255, 255, 0.08)',
  groupLabel:  'rgba(255, 255, 255, 0.30)',
  itemText:    'rgba(255, 255, 255, 0.65)',
  itemTextActive: '#FFFFFF',
  itemHover:   'rgba(255, 255, 255, 0.06)',
  itemActive:  'rgba(255, 255, 255, 0.10)',
  networkLabel:'rgba(255, 255, 255, 0.35)',
  networkName: 'rgba(255, 255, 255, 0.90)',
  networkSub:  'rgba(255, 255, 255, 0.45)',
  roleBg:      'rgba(255, 255, 255, 0.08)',
  roleActive:  'rgba(255, 255, 255, 0.15)',
  roleText:    'rgba(255, 255, 255, 0.50)',
  roleTextActive: '#FFFFFF',
};

interface SidebarProps {
  activeModule: string;
  onNavigate: (moduleId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ activeModule, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const { role, setRole, selectedCampusId, setCampus } = useRole();
  const network = useNetwork();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const moduleMap = Object.fromEntries(MODULES.map(m => [m.id, m]));

  return (
    <div style={{
      width: collapsed ? 72 : 240,
      minWidth: collapsed ? 72 : 240,
      height: '100vh',
      background: bg.sidebar,
      borderRight: `1px solid ${SHELL.border}`,
      display: 'flex',
      flexDirection: 'column',
      transition: transition.smooth,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 100,
    }}>

      {/* ── Brand ── */}
      <div style={{
        padding: collapsed ? '18px 0' : '18px 18px',
        borderBottom: `1px solid ${SHELL.border}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }} onClick={onToggleCollapse}>
        {/* Logo mark — gold square with S */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #C9A54E 0%, #D4B978 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(201, 165, 78, 0.35)',
        }}>
          <span style={{
            fontFamily: font.body,
            fontSize: '14px',
            fontWeight: fontWeight.bold,
            color: '#1A2332',
            letterSpacing: '-0.5px',
          }}>S</span>
        </div>
        {!collapsed && (
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: fontWeight.bold,
              color: '#FFFFFF',
              fontFamily: font.body,
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}>{APP_NAME}</div>
            <div style={{
              fontSize: '10px',
              color: SHELL.groupLabel,
              fontFamily: font.body,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: 2,
            }}>Intelligence Platform</div>
          </div>
        )}
      </div>

      {/* ── Network Context ── */}
      {!collapsed && (
        <div style={{
          padding: '10px 18px',
          borderBottom: `1px solid ${SHELL.border}`,
        }}>
          <div style={{
            fontSize: '10px',
            color: SHELL.networkLabel,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            fontFamily: font.body,
            fontWeight: fontWeight.semibold,
            marginBottom: 3,
          }}>Network</div>
          <div style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: SHELL.networkName,
            fontFamily: font.body,
            lineHeight: 1.3,
          }}>{network.name}</div>
          <div style={{
            fontSize: '11px',
            color: SHELL.networkSub,
            fontFamily: font.body,
            marginTop: 1,
          }}>{network.campuses.length} campuses · {network.city}</div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '10px 8px' : '10px 10px' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 2 }}>
            {!collapsed && (
              <div style={{
                fontSize: '10px',
                color: SHELL.groupLabel,
                textTransform: 'uppercase',
                letterSpacing: '0.9px',
                fontFamily: font.body,
                fontWeight: fontWeight.semibold,
                padding: '10px 8px 4px',
              }}>{group.label}</div>
            )}
            {group.modules.map((moduleId) => {
              const mod = moduleMap[moduleId];
              if (!mod) return null;
              const isActive = activeModule === moduleId;
              const isHovered = hoveredItem === moduleId;
              const accentColor = moduleColors[moduleId as keyof typeof moduleColors] || '#4F7CFF';

              return (
                <div
                  key={moduleId}
                  onClick={() => onNavigate(moduleId)}
                  onMouseEnter={() => setHoveredItem(moduleId)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: collapsed ? '9px 0' : '7px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: transition.fast,
                    background: isActive
                      ? SHELL.itemActive
                      : isHovered
                        ? SHELL.itemHover
                        : 'transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    marginBottom: 1,
                  }}
                  title={collapsed ? mod.label : undefined}
                >
                  {/* Active indicator — left edge bar */}
                  {isActive && !collapsed && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 18,
                      borderRadius: radius.full,
                      background: accentColor,
                    }} />
                  )}
                  <span style={{
                    fontSize: collapsed ? fontSize.lg : fontSize.md,
                    color: isActive ? accentColor : SHELL.itemText,
                    transition: transition.fast,
                    width: collapsed ? 'auto' : 18,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {mod.icon}
                  </span>
                  {!collapsed && (
                    <span style={{
                      fontSize: '13px',
                      fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                      color: isActive ? SHELL.itemTextActive : SHELL.itemText,
                      transition: transition.fast,
                      fontFamily: font.body,
                    }}>
                      {mod.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Role Switcher ── */}
      <div style={{
        padding: collapsed ? '12px 8px' : '14px 14px',
        borderTop: `1px solid ${SHELL.border}`,
      }}>
        {!collapsed && (
          <div style={{
            fontSize: '10px',
            color: SHELL.networkLabel,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 6,
            fontFamily: font.body,
            fontWeight: fontWeight.semibold,
          }}>View As</div>
        )}
        <div style={{
          display: 'flex',
          gap: 3,
          background: SHELL.roleBg,
          borderRadius: '8px',
          padding: 3,
        }}>
          {(['ceo', 'principal'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1,
                padding: collapsed ? '6px 4px' : '5px 8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: fontSize.xs,
                fontWeight: role === r ? fontWeight.semibold : fontWeight.normal,
                color: role === r ? SHELL.roleTextActive : SHELL.roleText,
                background: role === r ? SHELL.roleActive : 'transparent',
                transition: transition.fast,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: font.body,
              }}
            >
              {collapsed ? (r === 'ceo' ? 'C' : 'P') : (r === 'ceo' ? 'CEO' : 'Principal')}
            </button>
          ))}
        </div>
        {role === 'principal' && !collapsed && (
          <select
            value={selectedCampusId}
            onChange={(e) => setCampus(Number(e.target.value))}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '6px 8px',
              borderRadius: '8px',
              border: `1px solid ${SHELL.border}`,
              background: SHELL.roleBg,
              color: SHELL.networkName,
              fontSize: fontSize.sm,
              fontFamily: font.body,
              outline: 'none',
            }}
          >
            {network.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.short}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
