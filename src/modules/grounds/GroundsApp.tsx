/**
 * Slate v3 — Grounds
 * ═══════════════════════════════════════════════════
 * Facilities Intelligence.
 * Work order management, capital project tracking,
 * vendor contract monitoring, and campus condition intelligence.
 *
 * CEO sees network-wide facilities health. Principal sees their campus.
 */

import React, { useState, useMemo } from 'react';
import { useFacilities, useRole, useNetwork } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge } from '../../components/Card';
import { fmt, fmtPct, fmtCompact } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { WorkOrder, CapitalProject, WorkOrderPriority } from '../../core/types';

// ─── Priority Config ─────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<WorkOrderPriority, { color: string; label: string }> = {
  urgent: { color: statusColor.red, label: 'URGENT' },
  high: { color: statusColor.amber, label: 'HIGH' },
  medium: { color: statusColor.blue, label: 'MEDIUM' },
  low: { color: statusColor.green, label: 'LOW' },
};

// ─── Work Order Row ──────────────────────────────────────────────────────

function WorkOrderRow({ wo }: { wo: WorkOrder }) {
  const p = PRIORITY_CONFIG[wo.priority];
  const statusMap = {
    'open': { color: statusColor.amber, label: 'Open' },
    'in-progress': { color: statusColor.blue, label: 'In Progress' },
    'completed': { color: statusColor.green, label: 'Completed' },
  };
  const s = statusMap[wo.status];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px',
      alignItems: 'center', gap: 12, padding: '12px 16px',
      background: bg.card, borderRadius: radius.md, marginBottom: 4,
      borderLeft: `3px solid ${p.color}`,
    }}>
      <div>
        <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: textColor.primary }}>{wo.description}</div>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>{wo.campus} · {wo.dateSubmitted}</div>
      </div>
      <StatusBadge label={p.label} variant={wo.priority === 'urgent' ? 'red' : wo.priority === 'high' ? 'amber' : wo.priority === 'medium' ? 'blue' : 'green'} size="sm" />
      <StatusBadge label={s.label} variant={wo.status === 'open' ? 'amber' : wo.status === 'in-progress' ? 'blue' : 'green'} size="sm" />
      <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{wo.assignedTo}</div>
      <div style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.muted }}>{wo.id}</div>
    </div>
  );
}

// ─── Capital Project Card ────────────────────────────────────────────────

function CapitalProjectCard({ project }: { project: CapitalProject }) {
  const statusConfig = {
    'on-track': { color: statusColor.green, label: 'On Track' },
    'at-risk': { color: statusColor.amber, label: 'At Risk' },
    'over-budget': { color: statusColor.red, label: 'Over Budget' },
  };
  const s = statusConfig[project.status];
  const spentPct = (project.spent / project.budget) * 100;

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      padding: 20, boxShadow: shadow.sm,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.base, color: textColor.primary }}>{project.name}</div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>{project.campus}</div>
        </div>
        <StatusBadge label={s.label} variant={project.status === 'on-track' ? 'green' : project.status === 'at-risk' ? 'amber' : 'red'} size="sm" />
      </div>

      {/* Budget Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Budget Spent</span>
          <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.primary }}>{fmtCompact(project.spent)} / {fmtCompact(project.budget)}</span>
        </div>
        <div style={{ height: 8, background: bg.subtle, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(spentPct, 100)}%`, height: '100%',
            background: spentPct > 100 ? statusColor.red : spentPct > 85 ? statusColor.amber : s.color,
            borderRadius: 4, transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Completion Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Completion</span>
          <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.primary }}>{project.completion}%</span>
        </div>
        <div style={{ height: 8, background: bg.subtle, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${project.completion}%`, height: '100%',
            background: modColors.grounds, borderRadius: 4, transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Campus Work Order Summary ───────────────────────────────────────────

function CampusSummary({ workOrders }: { workOrders: WorkOrder[] }) {
  const byCampus = workOrders.reduce((acc, wo) => {
    if (!acc[wo.campus]) acc[wo.campus] = { total: 0, open: 0, urgent: 0 };
    acc[wo.campus].total++;
    if (wo.status !== 'completed') acc[wo.campus].open++;
    if (wo.priority === 'urgent') acc[wo.campus].urgent++;
    return acc;
  }, {} as Record<string, { total: number; open: number; urgent: number }>);

  return (
    <Card title="Work Orders by Campus" subtitle="Active maintenance load">
      <div style={{ padding: '8px 0' }}>
        {Object.entries(byCampus).sort((a, b) => b[1].open - a[1].open).map(([campus, data], i) => (
          <div key={campus} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
            borderBottom: i < Object.keys(byCampus).length - 1 ? `1px solid ${border.light}` : 'none',
          }}>
            <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.primary }}>{campus}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.muted }}>{data.total} total</span>
              <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: data.open > 0 ? statusColor.amber : statusColor.green }}>{data.open} open</span>
              {data.urgent > 0 && (
                <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: statusColor.red }}>{data.urgent} urgent</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── AI Facilities Intelligence ──────────────────────────────────────────

function FacilitiesIntelligence() {
  const fac = useFacilities();
  const openOrders = fac.workOrders.filter(wo => wo.status !== 'completed');
  const urgentOrders = fac.workOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed');
  const atRiskProjects = fac.capitalProjects.filter(p => p.status !== 'on-track');
  const totalCapBudget = fac.capitalProjects.reduce((s, p) => s + p.budget, 0);
  const totalCapSpent = fac.capitalProjects.reduce((s, p) => s + p.spent, 0);

  const insights: string[] = [];

  if (urgentOrders.length > 0) {
    insights.push(`${urgentOrders.length} urgent work order${urgentOrders.length > 1 ? 's' : ''} require immediate attention: ${urgentOrders.map(wo => `${wo.description} (${wo.campus})`).join('; ')}. These should be escalated to facilities leadership.`);
  }

  insights.push(`${openOrders.length} of ${fac.workOrders.length} work orders are active. ${openOrders.length > 15 ? 'The maintenance backlog is growing — consider additional vendor support.' : 'Maintenance load is manageable.'}`);

  if (atRiskProjects.length > 0) {
    insights.push(`${atRiskProjects.length} capital project${atRiskProjects.length > 1 ? 's are' : ' is'} flagged: ${atRiskProjects.map(p => `${p.name} (${p.status})`).join(', ')}. Review project timelines and budgets.`);
  }

  insights.push(`Capital program: ${fmtCompact(totalCapSpent)} of ${fmtCompact(totalCapBudget)} spent (${fmtPct((totalCapSpent / totalCapBudget) * 100)}). ${fac.vendorContractsExpiring} vendor contract${fac.vendorContractsExpiring !== 1 ? 's' : ''} expiring within 90 days.`);

  return (
    <AIInsight title="Facilities Intelligence Analysis">
      {insights.map((ins, i) => (
        <p key={i} style={{ margin: i === insights.length - 1 ? 0 : '0 0 8px' }}>{ins}</p>
      ))}
    </AIInsight>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GROUNDS APP
// ═══════════════════════════════════════════════════════════════════════════

export default function GroundsApp() {
  const { role, selectedCampusId } = useRole();
  const network = useNetwork();
  const fac = useFacilities();
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const openOrders = fac.workOrders.filter(wo => wo.status !== 'completed');
  const urgentOrders = fac.workOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed');
  const totalCapBudget = fac.capitalProjects.reduce((s, p) => s + p.budget, 0);
  const totalCapSpent = fac.capitalProjects.reduce((s, p) => s + p.spent, 0);

  // Filter for principal view
  const campusName = role === 'principal' ? network.campuses.find(c => c.id === selectedCampusId)?.name : null;

  const workOrders = useMemo(() => {
    let wo = [...fac.workOrders];
    if (campusName) wo = wo.filter(w => w.campus === campusName);
    if (filterPriority !== 'all') wo = wo.filter(w => w.priority === filterPriority);
    if (filterStatus !== 'all') wo = wo.filter(w => w.status === filterStatus);
    return wo;
  }, [fac.workOrders, campusName, filterPriority, filterStatus]);

  const capitalProjects = useMemo(() => {
    let cp = [...fac.capitalProjects];
    if (campusName) cp = cp.filter(p => p.campus === campusName);
    return cp;
  }, [fac.capitalProjects, campusName]);

  return (
    <div>
      <ModuleHeader
        title="Grounds"
        subtitle={campusName ? `${campusName} Facilities` : 'Facilities Intelligence'}
        accent={modColors.grounds}
        freshness={{ lastUpdated: fac.lastUpdated, source: fac.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Open Work Orders" value={openOrders.length.toString()} delta={urgentOrders.length > 0 ? `${urgentOrders.length} urgent` : 'None urgent'} deltaColor={urgentOrders.length > 0 ? statusColor.red : statusColor.green} />
        <KPICard label="Capital Projects" value={capitalProjects.length.toString()} delta={`${fac.capitalProjects.filter(p => p.status !== 'on-track').length} flagged`} deltaColor={fac.capitalProjects.filter(p => p.status !== 'on-track').length > 0 ? statusColor.amber : statusColor.green} />
        <KPICard label="Capital Spent" value={fmtCompact(totalCapSpent)} delta={`${fmtPct((totalCapSpent / totalCapBudget) * 100)} of budget`} />
        <KPICard label="Contracts Expiring" value={fac.vendorContractsExpiring.toString()} delta="Within 90 days" deltaColor={fac.vendorContractsExpiring > 2 ? statusColor.amber : statusColor.green} />
      </div>

      <FacilitiesIntelligence />

      {/* Capital Projects */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: textColor.primary, marginBottom: 12, fontFamily: font.serif }}>
          Capital Projects
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(capitalProjects.length, 3)}, 1fr)`, gap: 16 }}>
          {capitalProjects.map(p => <CapitalProjectCard key={p.id} project={p} />)}
        </div>
      </div>

      {role === 'ceo' && <CampusSummary workOrders={fac.workOrders} />}

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, marginTop: 20, alignItems: 'center',
        padding: '10px 16px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      }}>
        <span style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>Priority:</span>
        {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
          <button key={p} onClick={() => setFilterPriority(p)} style={{
            padding: '4px 10px', borderRadius: radius.full,
            border: `1px solid ${filterPriority === p ? modColors.grounds : border.light}`,
            background: filterPriority === p ? `${modColors.grounds}15` : 'transparent',
            color: filterPriority === p ? modColors.grounds : textColor.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {p === 'all' ? 'All' : p}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: border.light, margin: '0 4px' }} />
        <span style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>Status:</span>
        {['all', 'open', 'in-progress', 'completed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '4px 10px', borderRadius: radius.full,
            border: `1px solid ${filterStatus === s ? modColors.grounds : border.light}`,
            background: filterStatus === s ? `${modColors.grounds}15` : 'transparent',
            color: filterStatus === s ? modColors.grounds : textColor.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Work Order Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px',
        gap: 12, padding: '8px 16px', marginBottom: 4,
      }}>
        {['Work Order', 'Priority', 'Status', 'Assigned', 'ID'].map(h => (
          <div key={h} style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
        ))}
      </div>

      {/* Work Order List */}
      {workOrders.map(wo => <WorkOrderRow key={wo.id} wo={wo} />)}

      {workOrders.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: textColor.muted }}>
          No work orders match the current filters.
        </div>
      )}

      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: textColor.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        {fac.workOrders.length} work orders · {fac.capitalProjects.length} capital projects · Grounds Intelligence
      </div>
    </div>
  );
}
