/**
 * Slate v3 — Sidebar
 * MEA Brand Guide v2.0 — Deep navy glass sidebar with gold accents.
 * Typography v2: IBM Plex Sans — improved legibility on dark backgrounds.
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
      boxShadow: '1px 0 8px rgba(0,0,0,0.25)',
    }}>
      {/* ── Brand ── */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 20px',
        borderBottom: `1px solid ${border.chromLight}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }} onClick={onToggleCollapse}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: radius.md,
          background: `linear-gradient(135deg, ${brand.gold} 0%, ${brand.mutedGold} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: font.display,
          fontSize: fontSize.xl,
          fontWeight: fontWeight.light,
          color: brand.navy,
          flexShrink: 0,
        }}>
          S
        </div>
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: font.display,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.light,
              color: '#FFFFFF',
              letterSpacing: '0.5px',
            }}>
              {APP_NAME}
            </div>
            <div style={{
              fontSize: fontSize.xs,
              color: brand.gold,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginTop: 2,
              fontFamily: font.body,
              fontWeight: fontWeight.medium,
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
          borderBottom: `1px solid ${border.chromLight}`,
        }}>
          <div style={{
            fontSize: fontSize.xs,
            color: 'rgba(184,201,219,0.55)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 6,
            fontFamily: font.body,
            fontWeight: fontWeight.medium,
          }}>
            Network
          </div>
          <div style={{
            fontSize: fontSize.base,
            color: '#E8ECF1',
            fontWeight: fontWeight.normal,
            fontFamily: font.body,
          }}>
            {network.name}
          </div>
          <div style={{
            fontSize: fontSize.sm,
            color: 'rgba(184,201,219,0.65)',
            marginTop: 3,
            fontFamily: font.body,
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
          <div key={group.label} style={{ marginBottom: 18 }}>
            {!collapsed && (
              <div style={{
                fontSize: fontSize.xs,
                color: 'rgba(184,201,219,0.50)',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                padding: '0 8px',
                marginBottom: 6,
                fontFamily: font.body,
                fontWeight: fontWeight.medium,
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
                    padding: collapsed ? '10px 0' : '9px 10px',
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    transition: transition.fast,
                    background: isActive
                      ? 'rgba(201,165,78,0.10)'
                      : isHovered
                        ? 'rgba(255,255,255,0.05)'
                        : 'transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                  }}
                  title={collapsed ? mod.label : undefined}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: collapsed ? '50%' : 0,
                      top: collapsed ? 'auto' : '50%',
                      bottom: collapsed ? -2 : 'auto',
                      transform: collapsed ? 'translateX(-50%)' : 'translateY(-50%)',
                      width: collapsed ? 20 : 3,
                      height: collapsed ? 3 : 22,
                      borderRadius: radius.full,
                      background: mod.color,
                    }} />
                  )}

                  <span style={{
                    fontSize: collapsed ? fontSize.lg : fontSize.md,
                    color: isActive ? mod.color : 'rgba(184,201,219,0.6)',
                    transition: transition.fast,
                    width: collapsed ? 'auto' : 22,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {mod.icon}
                  </span>

                  {!collapsed && (
                    <span style={{
                      fontSize: fontSize.base,
                      fontWeight: isActive ? fontWeight.medium : fontWeight.normal,
                      color: isActive ? '#FFFFFF' : 'rgba(210,220,232,0.75)',
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
        borderTop: `1px solid ${border.chromLight}`,
      }}>
        {!collapsed && (
          <div style={{
            fontSize: fontSize.xs,
            color: 'rgba(184,201,219,0.50)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: 8,
            fontFamily: font.body,
            fontWeight: fontWeight.medium,
          }}>
            View As
          </div>
        )}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: radius.md,
          padding: 3,
        }}>
          {(['ceo', 'principal'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1,
                padding: collapsed ? '7px 4px' : '7px 12px',
                borderRadius: radius.sm,
                border: 'none',
                cursor: 'pointer',
                fontSize: fontSize.sm,
                fontWeight: role === r ? fontWeight.semibold : fontWeight.normal,
                color: role === r ? brand.navy : 'rgba(210,220,232,0.70)',
                background: role === r ? brand.gold : 'transparent',
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
              padding: '7px 8px',
              borderRadius: radius.sm,
              border: `1px solid ${border.chromMedium}`,
              background: 'rgba(255,255,255,0.06)',
              color: '#E8ECF1',
              fontSize: fontSize.sm,
              fontFamily: font.body,
              outline: 'none',
            }}
          >
            {network.campuses.map((c) => (
              <option key={c.id} value={c.id} style={{ background: brand.navy, color: '#E8ECF1' }}>
                {c.short}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
