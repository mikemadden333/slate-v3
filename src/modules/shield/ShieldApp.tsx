/**
 * Slate v3 — Shield
 * ═══════════════════════════════════════════════════
 * Compliance & Governance Intelligence.
 * Tracks regulatory deadlines, audit readiness, policy status,
 * and charter compliance. Never miss a filing again.
 *
 * CEO sees the full compliance landscape. Principal sees campus-relevant items.
 */

import React, { useState, useMemo } from 'react';
import { useCompliance, useRole, useNetwork } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge } from '../../components/Card';
import { fmtPct } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { Deadline } from '../../core/types';

// ─── Deadline Row ────────────────────────────────────────────────────────

function DeadlineRow({ d }: { d: Deadline }) {
  const statusMap = {
    'overdue': { color: statusColor.red, bg: `${statusColor.red}08`, label: 'OVERDUE', icon: '!' },
    'at-risk': { color: statusColor.amber, bg: `${statusColor.amber}08`, label: 'AT RISK', icon: '⚠' },
    'on-track': { color: statusColor.green, bg: `${statusColor.green}08`, label: 'ON TRACK', icon: '✓' },
  };
  const s = statusMap[d.status];
  const daysText = d.daysOut < 0 ? `${Math.abs(d.daysOut)}d overdue` : d.daysOut === 0 ? 'Due today' : `${d.daysOut}d remaining`;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px',
      alignItems: 'center', gap: 12, padding: '14px 16px',
      background: s.bg, borderRadius: radius.md, marginBottom: 6,
      borderLeft: `3px solid ${s.color}`,
    }}>
      <div>
        <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: textColor.primary }}>{d.item}</div>
      </div>
      <div style={{ fontSize: fontSize.sm, color: textColor.muted }}>{d.owner}</div>
      <div style={{
        fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold, color: s.color,
      }}>
        {daysText}
      </div>
      <StatusBadge label={s.label} variant={d.status === 'overdue' ? 'red' : d.status === 'at-risk' ? 'amber' : 'green'} size="sm" />
    </div>
  );
}

// ─── Audit Readiness Gauge ───────────────────────────────────────────────

function AuditGauge({ score }: { score: number }) {
  const color = score >= 90 ? statusColor.green : score >= 75 ? statusColor.amber : statusColor.red;
  const circumference = 2 * Math.PI * 60;
  const offset = circumference * (1 - score / 100);

  return (
    <Card title="Audit Readiness" subtitle="Overall compliance posture">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="60" fill="none" stroke={border.light} strokeWidth="12" />
          <circle
            cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          <text x="80" y="72" textAnchor="middle" style={{ fontSize: '28px', fontWeight: 700, fontFamily: font.mono, fill: color }}>
            {score}%
          </text>
          <text x="80" y="95" textAnchor="middle" style={{ fontSize: '11px', fill: textColor.muted }}>
            {score >= 90 ? 'STRONG' : score >= 75 ? 'ADEQUATE' : 'NEEDS WORK'}
          </text>
        </svg>
      </div>
    </Card>
  );
}

// ─── Timeline Visualization ──────────────────────────────────────────────

function DeadlineTimeline({ deadlines }: { deadlines: Deadline[] }) {
  const sorted = [...deadlines].sort((a, b) => a.daysOut - b.daysOut);
  const maxDays = Math.max(...sorted.map(d => Math.abs(d.daysOut)), 90);

  return (
    <Card title="Deadline Timeline" subtitle="Next 90 days">
      <div style={{ padding: '12px 0', position: 'relative' }}>
        {/* Timeline axis */}
        <div style={{
          position: 'relative', height: 4, background: border.light, borderRadius: 2,
          margin: '20px 0 40px',
        }}>
          {/* Today marker */}
          <div style={{
            position: 'absolute', left: `${(Math.max(...sorted.filter(d => d.daysOut < 0).map(d => Math.abs(d.daysOut)), 0) / maxDays) * 100}%`,
            top: -8, width: 2, height: 20, background: brand.navy,
          }} />
          <div style={{
            position: 'absolute', left: `${(Math.max(...sorted.filter(d => d.daysOut < 0).map(d => Math.abs(d.daysOut)), 0) / maxDays) * 100}%`,
            top: 16, fontSize: fontSize.xs, color: textColor.muted, transform: 'translateX(-50%)',
          }}>
            Today
          </div>
        </div>

        {/* Deadline items */}
        {sorted.slice(0, 8).map((d, i) => {
          const color = d.status === 'overdue' ? statusColor.red : d.status === 'at-risk' ? statusColor.amber : statusColor.green;
          return (
            <div key={d.item} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              borderBottom: i < 7 ? `1px solid ${border.light}` : 'none',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.primary }}>{d.item}</div>
              <div style={{ fontSize: fontSize.xs, fontFamily: font.mono, color, fontWeight: fontWeight.semibold }}>
                {d.daysOut < 0 ? `${Math.abs(d.daysOut)}d ago` : `${d.daysOut}d`}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── AI Compliance Intelligence ──────────────────────────────────────────

function ComplianceIntelligence() {
  const comp = useCompliance();
  const overdue = comp.deadlines.filter(d => d.status === 'overdue');
  const atRisk = comp.deadlines.filter(d => d.status === 'at-risk');
  const next30 = comp.deadlines.filter(d => d.daysOut > 0 && d.daysOut <= 30);

  const insights: string[] = [];

  if (overdue.length > 0) {
    insights.push(`URGENT: ${overdue.length} compliance item${overdue.length > 1 ? 's are' : ' is'} overdue: ${overdue.map(d => d.item).join(', ')}. These require immediate attention to avoid regulatory consequences.`);
  }

  if (atRisk.length > 0) {
    insights.push(`${atRisk.length} item${atRisk.length > 1 ? 's are' : ' is'} at risk of missing deadline: ${atRisk.map(d => `${d.item} (${d.daysOut}d, ${d.owner})`).join('; ')}.`);
  }

  if (next30.length > 0) {
    insights.push(`${next30.length} deadline${next30.length > 1 ? 's' : ''} approaching in the next 30 days. All currently on track.`);
  }

  insights.push(`Audit readiness score: ${fmtPct(comp.auditReadiness)}. ${comp.auditReadiness >= 90 ? 'Strong compliance posture.' : 'Consider accelerating documentation and policy updates.'} ${comp.openPolicies} open policy items remain.`);

  return (
    <AIInsight title="Compliance Intelligence Analysis">
      {insights.map((ins, i) => (
        <p key={i} style={{ margin: i === insights.length - 1 ? 0 : '0 0 8px' }}>{ins}</p>
      ))}
    </AIInsight>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SHIELD APP
// ═══════════════════════════════════════════════════════════════════════════

export default function ShieldApp() {
  const comp = useCompliance();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const overdue = comp.deadlines.filter(d => d.status === 'overdue');
  const atRisk = comp.deadlines.filter(d => d.status === 'at-risk');
  const onTrack = comp.deadlines.filter(d => d.status === 'on-track');

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return [...comp.deadlines].sort((a, b) => a.daysOut - b.daysOut);
    return comp.deadlines.filter(d => d.status === filterStatus).sort((a, b) => a.daysOut - b.daysOut);
  }, [comp.deadlines, filterStatus]);

  return (
    <div>
      <ModuleHeader
        title="Shield"
        subtitle="Compliance & Governance Intelligence"
        accent={modColors.shield}
        freshness={{ lastUpdated: comp.lastUpdated, source: comp.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Audit Readiness" value={`${comp.auditReadiness}%`} delta={comp.auditReadiness >= 90 ? 'Strong' : 'Needs Work'} deltaColor={comp.auditReadiness >= 90 ? statusColor.green : statusColor.amber} />
        <KPICard label="Overdue" value={overdue.length.toString()} delta={overdue.length > 0 ? 'Action Required' : 'Clear'} deltaColor={overdue.length > 0 ? statusColor.red : statusColor.green} />
        <KPICard label="At Risk" value={atRisk.length.toString()} delta={atRisk.length > 0 ? 'Monitor' : 'Clear'} deltaColor={atRisk.length > 0 ? statusColor.amber : statusColor.green} />
        <KPICard label="Open Policies" value={comp.openPolicies.toString()} />
      </div>

      <ComplianceIntelligence />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <AuditGauge score={comp.auditReadiness} />
        <DeadlineTimeline deadlines={comp.deadlines} />
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center',
        padding: '10px 16px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      }}>
        <span style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 8 }}>Status:</span>
        {[
          { key: 'all', label: 'All', count: comp.deadlines.length },
          { key: 'overdue', label: 'Overdue', count: overdue.length },
          { key: 'at-risk', label: 'At Risk', count: atRisk.length },
          { key: 'on-track', label: 'On Track', count: onTrack.length },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
            padding: '4px 12px', borderRadius: radius.full,
            border: `1px solid ${filterStatus === f.key ? modColors.shield : border.light}`,
            background: filterStatus === f.key ? `${modColors.shield}15` : 'transparent',
            color: filterStatus === f.key ? modColors.shield : textColor.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
          }}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Deadline Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px',
        gap: 12, padding: '8px 16px', marginBottom: 4,
      }}>
        {['Compliance Item', 'Owner', 'Timeline', 'Status'].map(h => (
          <div key={h} style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
        ))}
      </div>

      {/* Deadline List */}
      {filtered.map(d => <DeadlineRow key={d.item} d={d} />)}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: textColor.muted }}>
          No deadlines match the current filter.
        </div>
      )}

      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: textColor.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        {comp.deadlines.length} compliance items tracked · Shield Intelligence
      </div>
    </div>
  );
}
