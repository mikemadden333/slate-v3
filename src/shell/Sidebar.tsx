/**
 * Slate v3 — Sidebar
 * Premium navigation with grouped modules, role switcher, and network identity.
 */

import React, { useState } from 'react';
import { MODULES, NAV_GROUPS, APP_NAME, APP_TAGLINE } from '../core/constants';
import { bg, text, brand, border, modules as moduleColors, font, fontSize, fontWeight, shadow, radius, transition } from '../core/theme';
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
      width: collapsed ? 64 : 240,
      minWidth: collapsed ? 64 : 240,
      height: '100vh',
      background: bg.sidebarGlass,
      display: 'flex',
      flexDirection: 'column',
      transition: transition.smooth,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 100,
      boxShadow: '1px 0 8px rgba(0,0,0,0.15)',
    }}>
      {/* ── Brand ── */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 20px',
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }} onClick={onToggleCollapse}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: radius.md,
          background: `linear-gradient(135deg, ${brand.gold} 0%, ${brand.brass} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: font.serif,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
          color: brand.navy,
          flexShrink: 0,
        }}>
          S
        </div>
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: font.serif,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold,
              color: text.inverse,
              letterSpacing: '0.5px',
            }}>
              {APP_NAME}
            </div>
            <div style={{
              fontSize: '9px',
              color: brand.brass,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>
              {APP_TAGLINE}
            </div>
          </div>
        )}
      </div>

      {/* ── Network Identity ── */}
      {!collapsed && (
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
        }}>
          <div style={{
            fontSize: fontSize.xs,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 6,
          }}>
            Network
          </div>
          <div style={{
            fontSize: fontSize.sm,
            color: text.inverse,
            fontWeight: fontWeight.medium,
          }}>
            {network.name}
          </div>
          <div style={{
            fontSize: fontSize.xs,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 2,
          }}>
            {network.campusCount} campuses · {network.city}, {network.state}
          </div>
        </div>
      )}

      {/* ── Navigation Groups ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: collapsed ? '12px 8px' : '12px 12px',
      }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            {!collapsed && (
              <div style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                padding: '0 8px',
                marginBottom: 6,
              }}>
                {group.label}
              </div>
            )}
            {group.modules.map((moduleId) => {
              const mod = moduleMap[moduleId];
              if (!mod) return null;
              const isActive = activeModule === moduleId;
              const isHovered = hoveredItem === moduleId;

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
                    padding: collapsed ? '10px 0' : '8px 10px',
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    transition: transition.fast,
                    background: isActive
                      ? 'rgba(255,255,255,0.08)'
                      : isHovered
                        ? 'rgba(255,255,255,0.04)'
                        : 'transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                  }}
                  title={collapsed ? mod.label : undefined}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: collapsed ? '50%' : 0,
                      top: collapsed ? 'auto' : '50%',
                      bottom: collapsed ? -2 : 'auto',
                      transform: collapsed ? 'translateX(-50%)' : 'translateY(-50%)',
                      width: collapsed ? 20 : 3,
                      height: collapsed ? 3 : 20,
                      borderRadius: radius.full,
                      background: mod.color,
                    }} />
                  )}

                  <span style={{
                    fontSize: collapsed ? fontSize.lg : fontSize.md,
                    color: isActive ? mod.color : 'rgba(255,255,255,0.5)',
                    transition: transition.fast,
                    width: collapsed ? 'auto' : 20,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {mod.icon}
                  </span>

                  {!collapsed && (
                    <span style={{
                      fontSize: fontSize.sm,
                      fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                      color: isActive ? text.inverse : 'rgba(255,255,255,0.6)',
                      transition: transition.fast,
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
        borderTop: `1px solid rgba(255,255,255,0.08)`,
      }}>
        {!collapsed && (
          <div style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: 8,
          }}>
            View As
          </div>
        )}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: radius.md,
          padding: 3,
        }}>
          {(['ceo', 'principal'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1,
                padding: collapsed ? '6px 4px' : '6px 12px',
                borderRadius: radius.sm,
                border: 'none',
                cursor: 'pointer',
                fontSize: collapsed ? fontSize.xs : fontSize.xs,
                fontWeight: role === r ? fontWeight.semibold : fontWeight.normal,
                color: role === r ? brand.navy : 'rgba(255,255,255,0.5)',
                background: role === r ? brand.gold : 'transparent',
                transition: transition.fast,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {collapsed ? (r === 'ceo' ? 'C' : 'P') : (r === 'ceo' ? 'CEO' : 'Principal')}
            </button>
          ))}
        </div>

        {/* Campus selector for principal view */}
        {role === 'principal' && !collapsed && (
          <select
            value={selectedCampusId}
            onChange={(e) => setCampus(Number(e.target.value))}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '6px 8px',
              borderRadius: radius.sm,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: text.inverse,
              fontSize: fontSize.xs,
              fontFamily: font.sans,
              outline: 'none',
            }}
          >
            {network.campuses.map((c) => (
              <option key={c.id} value={c.id} style={{ background: '#1E2A3A', color: text.inverse }}>
                {c.short}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
