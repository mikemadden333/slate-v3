/**
 * Slate — Sidebar
 * Redesign Brief: light, clean, white sidebar. Left rail 88 collapsed / 248 expanded.
 * One accent state for active item. Inter only. No gold, no dark backgrounds.
 */
import React, { useState } from 'react';
import { MODULES, NAV_GROUPS, APP_NAME } from '../core/constants';
import { bg, text, brand, border, modules as moduleColors, font, fontSize, fontWeight, radius, transition } from '../core/theme';
import { useRole, useNetwork } from '../data/DataStore';

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
      width: collapsed ? 88 : 248,
      minWidth: collapsed ? 88 : 248,
      height: '100vh',
      background: bg.sidebar,
      borderRight: `1px solid ${border.light}`,
      display: 'flex',
      flexDirection: 'column',
      transition: transition.smooth,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 100,
    }}>

      {/* ── Brand ── */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 20px',
        borderBottom: `1px solid ${border.light}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }} onClick={onToggleCollapse}>
        {/* Logo mark */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          background: text.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: font.body,
            fontSize: '15px',
            fontWeight: fontWeight.bold,
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
          }}>S</span>
        </div>
        {!collapsed && (
          <div>
            <div style={{
              fontSize: fontSize.md,
              fontWeight: fontWeight.semibold,
              color: text.primary,
              fontFamily: font.body,
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}>{APP_NAME}</div>
            <div style={{
              fontSize: fontSize.xs,
              color: text.muted,
              fontFamily: font.body,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginTop: 2,
            }}>Intelligence Platform</div>
          </div>
        )}
      </div>

      {/* ── Network Context ── */}
      {!collapsed && (
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${border.light}`,
        }}>
          <div style={{
            fontSize: fontSize.xs,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            fontFamily: font.body,
            fontWeight: fontWeight.medium,
            marginBottom: 4,
          }}>Network</div>
          <div style={{
            fontSize: fontSize.md,
            fontWeight: fontWeight.semibold,
            color: text.primary,
            fontFamily: font.body,
            lineHeight: 1.3,
          }}>{network.name}</div>
          <div style={{
            fontSize: fontSize.sm,
            color: text.muted,
            fontFamily: font.body,
            marginTop: 2,
          }}>{network.campuses.length} campuses · {network.city}</div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '12px 12px' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                fontSize: fontSize.xs,
                color: text.light,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontFamily: font.body,
                fontWeight: fontWeight.medium,
                padding: '8px 8px 4px',
              }}>{group.label}</div>
            )}
            {group.modules.map((moduleId) => {
              const mod = moduleMap[moduleId];
              if (!mod) return null;
              const isActive = activeModule === moduleId;
              const isHovered = hoveredItem === moduleId;
              const accentColor = moduleColors[moduleId as keyof typeof moduleColors] || text.accent;

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
                    padding: collapsed ? '9px 0' : '8px 10px',
                    borderRadius: radius.sm,
                    cursor: 'pointer',
                    transition: transition.fast,
                    background: isActive
                      ? `${accentColor}10`
                      : isHovered
                        ? bg.hover
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
                      height: 20,
                      borderRadius: radius.full,
                      background: accentColor,
                    }} />
                  )}
                  <span style={{
                    fontSize: collapsed ? fontSize.lg : fontSize.md,
                    color: isActive ? accentColor : text.muted,
                    transition: transition.fast,
                    width: collapsed ? 'auto' : 20,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {mod.icon}
                  </span>
                  {!collapsed && (
                    <span style={{
                      fontSize: fontSize.md,
                      fontWeight: isActive ? fontWeight.medium : fontWeight.normal,
                      color: isActive ? text.primary : text.secondary,
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
        padding: collapsed ? '12px 8px' : '16px',
        borderTop: `1px solid ${border.light}`,
      }}>
        {!collapsed && (
          <div style={{
            fontSize: fontSize.xs,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 8,
            fontFamily: font.body,
            fontWeight: fontWeight.medium,
          }}>View As</div>
        )}
        <div style={{
          display: 'flex',
          gap: 4,
          background: bg.subtle,
          borderRadius: radius.sm,
          padding: 3,
        }}>
          {(['ceo', 'principal'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1,
                padding: collapsed ? '7px 4px' : '6px 10px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                fontSize: fontSize.sm,
                fontWeight: role === r ? fontWeight.semibold : fontWeight.normal,
                color: role === r ? text.primary : text.muted,
                background: role === r ? bg.card : 'transparent',
                transition: transition.fast,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: font.body,
                boxShadow: role === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
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
              padding: '7px 8px',
              borderRadius: radius.sm,
              border: `1px solid ${border.medium}`,
              background: bg.card,
              color: text.primary,
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
