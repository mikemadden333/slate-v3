/**
 * ResponseWarRoom.tsx
 * The sixth Watch v3 innovation: a live command-center panel for the Response tab.
 *
 * Features:
 *   1. Live Situation Clock — elapsed time since the most recent incident
 *   2. Network Threat Banner — real-time tier status derived from campus threat levels
 *   3. Priority Action Queue — role-filtered "do this NOW" cards for CEO / Principal / Safety Director
 *   4. Affected Campus Roster — compact grid of campuses at ORANGE or RED with incident counts
 *
 * Design principle: a CEO opening this tab at 3 PM on a school day should immediately
 * know (a) how serious the situation is, (b) which campuses are affected, and
 * (c) exactly what they personally need to do right now — without reading a playbook.
 */
import React, { useState, useEffect, useMemo } from 'react';
import type { WatchDataState } from '../v2/useWatchData';
import type { ContagionZone } from '../engine/types';

// ─── Design tokens (match WatchAppV3 W object) ────────────────────────────────
const W = {
  bgDark:   '#0B1220',
  bgCard:   '#141C2E',
  bgDeep:   '#0D1525',
  border:   'rgba(255,255,255,0.08)',
  gold:     '#C9A84C',
  goldDim:  'rgba(201,168,76,0.15)',
  cream:    '#F5F0E8',
  muted:    'rgba(245,240,232,0.45)',
  dim:      'rgba(245,240,232,0.25)',
  red:      '#DC2626',
  redDim:   'rgba(220,38,38,0.15)',
  orange:   '#EA580C',
  orangeDim:'rgba(234,88,12,0.12)',
  amber:    '#D97706',
  amberDim: 'rgba(217,119,6,0.12)',
  green:    '#16A34A',
  greenDim: 'rgba(22,163,74,0.12)',
  font:     "'Inter', system-ui, sans-serif",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type AlertTier = 1 | 2 | 3 | 4;
type Role = 'CEO' | 'PRINCIPAL' | 'SAFETY_DIRECTOR';

interface WarRoomProps {
  data: WatchDataState;
  contagionZones: ContagionZone[];
}

// ─── Tier derivation ──────────────────────────────────────────────────────────
function deriveTier(data: WatchDataState): AlertTier {
  const threats = data.campusThreats;
  const redCount   = threats.filter(t => t.threatLevel === 'RED').length;
  const orangeCount = threats.filter(t => t.threatLevel === 'ORANGE').length;
  const amberCount  = threats.filter(t => t.threatLevel === 'AMBER').length;
  if (redCount >= 2)                          return 4;
  if (redCount >= 1 || orangeCount >= 3)      return 3;
  if (orangeCount >= 1 || amberCount >= 3)    return 2;
  return 1;
}

const TIER_META: Record<AlertTier, { label: string; color: string; dimColor: string; borderColor: string; desc: string }> = {
  1: { label: 'WATCH',    color: W.green,  dimColor: W.greenDim,  borderColor: W.green,  desc: 'Routine monitoring. No immediate action required.' },
  2: { label: 'ELEVATED', color: W.amber,  dimColor: W.amberDim,  borderColor: W.amber,  desc: 'Enhanced awareness. Principals should be notified.' },
  3: { label: 'HIGH',     color: W.orange, dimColor: W.orangeDim, borderColor: W.orange, desc: 'Active protocols. Security posture change required.' },
  4: { label: 'CRITICAL', color: W.red,    dimColor: W.redDim,    borderColor: W.red,    desc: 'Full response activation. CEO must be engaged immediately.' },
};

// ─── Priority actions per tier per role ──────────────────────────────────────
const PRIORITY_ACTIONS: Record<AlertTier, Record<Role, { action: string; timeframe: string }[]>> = {
  1: {
    CEO:            [{ action: 'Review weekly Watch summary', timeframe: 'This week' }],
    PRINCIPAL:      [{ action: 'Confirm standard security protocols are active', timeframe: 'Daily, 8 AM' }],
    SAFETY_DIRECTOR:[{ action: 'Update campus risk scores from overnight log', timeframe: 'Daily, 7 AM' }],
  },
  2: {
    CEO:            [
      { action: 'Confirm affected principals have been briefed', timeframe: 'Within 3 hours' },
      { action: 'Review campus status summary in Watch', timeframe: 'Within 3 hours' },
    ],
    PRINCIPAL:      [
      { action: 'Sweep campus perimeter — confirm all exterior doors secured', timeframe: 'Within 2 hours' },
      { action: 'Notify all staff via internal channel only', timeframe: 'Within 2 hours' },
    ],
    SAFETY_DIRECTOR:[
      { action: 'Brief all campus security staff on elevated status', timeframe: 'Within 1 hour' },
      { action: 'Add staff to exterior positions before dismissal', timeframe: 'Before dismissal' },
    ],
  },
  3: {
    CEO:            [
      { action: 'Activate network-wide HIGH protocol — notify all principals directly', timeframe: 'Immediately' },
      { action: 'Brief board chair on situation status', timeframe: 'Within 2 hours' },
      { action: 'Authorize modified dismissal procedures if warranted', timeframe: 'Before dismissal' },
    ],
    PRINCIPAL:      [
      { action: 'Lock down all exterior access points — staff and security only', timeframe: 'Immediately' },
      { action: 'Account for all students and staff — report to Safety Director', timeframe: 'Within 30 min' },
      { action: 'Prepare parent communication for CEO approval', timeframe: 'Within 1 hour' },
    ],
    SAFETY_DIRECTOR:[
      { action: 'Contact CPD liaison — request increased patrol near affected campuses', timeframe: 'Immediately' },
      { action: 'Coordinate modified dismissal with all campus security leads', timeframe: 'Before dismissal' },
      { action: 'Activate real-time incident tracking — report to CEO every 30 min', timeframe: 'Ongoing' },
    ],
  },
  4: {
    CEO:            [
      { action: 'Activate CRITICAL protocol — all campuses on full lockdown posture', timeframe: 'Immediately' },
      { action: 'Call board chair and legal counsel', timeframe: 'Within 15 min' },
      { action: 'Authorize emergency parent notification — all families', timeframe: 'Within 30 min' },
      { action: 'Coordinate with CPD and city officials directly', timeframe: 'Within 30 min' },
    ],
    PRINCIPAL:      [
      { action: 'Initiate full lockdown — all students inside, no movement', timeframe: 'Immediately' },
      { action: 'Account for every student and staff member', timeframe: 'Within 15 min' },
      { action: 'Do not release students without direct CEO authorization', timeframe: 'Until cleared' },
    ],
    SAFETY_DIRECTOR:[
      { action: 'Establish command post — coordinate all campus security leads', timeframe: 'Immediately' },
      { action: 'Maintain direct line with CPD incident commander', timeframe: 'Ongoing' },
      { action: 'Report status to CEO every 15 minutes', timeframe: 'Ongoing' },
    ],
  },
};

// ─── Elapsed time helper ──────────────────────────────────────────────────────
function useElapsedSince(date: Date | null): string {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!date) return '—';
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResponseWarRoom({ data, contagionZones }: WarRoomProps) {
  const [activeRole, setActiveRole] = useState<Role>('CEO');
  const tier = useMemo(() => deriveTier(data), [data]);
  const meta = TIER_META[tier];

  // Most recent incident timestamp
  const latestIncident = useMemo(() => {
    if (!data.incidents.length) return null;
    const sorted = [...data.incidents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return new Date(sorted[0].timestamp);
  }, [data.incidents]);

  const elapsed = useElapsedSince(latestIncident);

  // Campuses at ORANGE or RED
  const elevatedCampuses = useMemo(
    () => data.campusThreats.filter(t => t.threatLevel === 'ORANGE' || t.threatLevel === 'RED'),
    [data.campusThreats]
  );

  const actions = PRIORITY_ACTIONS[tier][activeRole];

  const ROLES: Role[] = ['CEO', 'PRINCIPAL', 'SAFETY_DIRECTOR'];
  const ROLE_LABELS: Record<Role, string> = {
    CEO: 'CEO',
    PRINCIPAL: 'Principal',
    SAFETY_DIRECTOR: 'Safety Director',
  };

  return (
    <div style={{
      background: W.bgDeep,
      borderBottom: `1px solid ${W.border}`,
      fontFamily: W.font,
    }}>
      {/* ── Tier Banner ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        background: meta.dimColor,
        borderBottom: `1px solid ${meta.borderColor}22`,
      }}>
        {/* Tier badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: meta.color,
            boxShadow: `0 0 8px ${meta.color}`,
            animation: tier >= 3 ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: meta.color,
          }}>TIER {tier} — {meta.label}</span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: W.border }} />

        {/* Description */}
        <span style={{ fontSize: 12, color: W.muted, flex: 1 }}>{meta.desc}</span>

        {/* Situation clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, letterSpacing: '0.08em', color: W.dim }}>LAST INCIDENT</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: W.cream }}>{elapsed}</span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 0,
        minHeight: 160,
      }}>
        {/* Left: Priority Action Queue */}
        <div style={{
          flex: '1 1 60%',
          padding: '14px 20px',
          borderRight: `1px solid ${W.border}`,
        }}>
          {/* Role selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            marginBottom: 12,
          }}>
            <span style={{
              fontSize: 9,
              letterSpacing: '0.12em',
              color: W.dim,
              marginRight: 10,
              textTransform: 'uppercase',
            }}>ROLE</span>
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  fontWeight: activeRole === role ? 700 : 400,
                  letterSpacing: '0.06em',
                  color: activeRole === role ? W.bgDark : W.muted,
                  background: activeRole === role ? W.gold : 'transparent',
                  border: `1px solid ${activeRole === role ? W.gold : W.border}`,
                  borderRadius: role === 'CEO' ? '4px 0 0 4px' : role === 'SAFETY_DIRECTOR' ? '0 4px 4px 0' : '0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: W.font,
                }}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {/* Action cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actions.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 12px',
                  background: W.bgCard,
                  border: `1px solid ${W.border}`,
                  borderRadius: 4,
                }}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `1.5px solid ${W.gold}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}>
                  <span style={{ fontSize: 9, color: W.gold, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: W.cream, lineHeight: 1.4 }}>{item.action}</div>
                  <div style={{ fontSize: 10, color: W.dim, marginTop: 2 }}>{item.timeframe}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Affected Campus Roster */}
        <div style={{
          flex: '0 0 40%',
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: 9,
            letterSpacing: '0.12em',
            color: W.dim,
            marginBottom: 10,
            textTransform: 'uppercase',
          }}>
            AFFECTED CAMPUSES
            {elevatedCampuses.length > 0 && (
              <span style={{
                marginLeft: 8,
                padding: '1px 6px',
                background: W.redDim,
                border: `1px solid ${W.red}44`,
                borderRadius: 10,
                color: W.red,
                fontSize: 9,
                fontWeight: 700,
              }}>{elevatedCampuses.length}</span>
            )}
          </div>

          {elevatedCampuses.length === 0 ? (
            <div style={{
              fontSize: 12,
              color: W.dim,
              fontStyle: 'italic',
              paddingTop: 8,
            }}>
              No campuses at elevated threat level.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {elevatedCampuses.map(campus => {
                const isRed = campus.threatLevel === 'RED';
                const color = isRed ? W.red : W.orange;
                const dimBg = isRed ? W.redDim : W.orangeDim;
                return (
                  <div
                    key={campus.campusId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: dimBg,
                      border: `1px solid ${color}33`,
                      borderRadius: 4,
                    }}
                  >
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: W.cream }}>
                        {campus.campusShort}
                      </div>
                      <div style={{ fontSize: 10, color: W.dim }}>
                        {campus.communityArea}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color,
                      flexShrink: 0,
                    }}>
                      {campus.incidentCount} incident{campus.incidentCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Contagion zone count */}
          {contagionZones.length > 0 && (
            <div style={{
              marginTop: 10,
              padding: '6px 10px',
              background: W.goldDim,
              border: `1px solid ${W.gold}33`,
              borderRadius: 4,
              fontSize: 11,
              color: W.gold,
            }}>
              {contagionZones.length} active contagion zone{contagionZones.length !== 1 ? 's' : ''} — see Contagion tab
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
