/**
 * Slate v3 — Grounds
 * ═══════════════════════════════════════════════════
 * Facilities Intelligence Engine — Moonshot Edition
 *
 * Campus condition scoring (FCI), clickable capital project detail drawers,
 * emergency project entry, vendor intelligence, deferred maintenance tracker,
 * work order management, and AI-powered facilities analysis.
 *
 * CEO sees network-wide facilities health. Principal sees their campus.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useFacilities, useRole, useNetwork, useEmergencies } from '../../data/DataStore';
import { useSlateAI } from '../../core/useSlateAI';
import { Card, KPICard, ModuleHeader, Section, AIInsight, StatusBadge, EmptyState } from '../../components/Card';
import { fmt, fmtPct, fmtCompact, fmtNum, fmtFull } from '../../core/formatters';
import {
  bg, text, brand, border, status, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors, chart,
} from '../../core/theme';
import type { WorkOrder, CapitalProject, WorkOrderPriority, CampusCondition, VendorContract } from '../../core/types';

// ─── Tab System ──────────────────────────────────────────────────────────

type GroundsTab = 'overview' | 'projects' | 'workorders' | 'conditions' | 'vendors' | 'emergency';

const TABS: { id: GroundsTab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Overview',         icon: '◉' },
  { id: 'projects',   label: 'Capital Projects', icon: '▣' },
  { id: 'workorders', label: 'Work Orders',      icon: '◈' },
  { id: 'conditions', label: 'Campus Health',     icon: '◇' },
  { id: 'vendors',    label: 'Vendors',          icon: '◆' },
  { id: 'emergency',  label: 'Emergency',        icon: '⚠' },
];

// ─── Constants ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<WorkOrderPriority, { color: string; label: string }> = {
  urgent: { color: status.red, label: 'URGENT' },
  high:   { color: status.amber, label: 'HIGH' },
  medium: { color: status.blue, label: 'MEDIUM' },
  low:    { color: status.green, label: 'LOW' },
};

const SYSTEM_COLORS: Record<string, string> = {
  good: status.green, fair: status.amber, poor: '#F97316', critical: status.red, 'n/a': status.gray,
};

const FCI_GRADES: { min: number; label: string; color: string; description: string }[] = [
  { min: 80, label: 'A', color: status.green, description: 'Excellent' },
  { min: 70, label: 'B', color: '#22C55E', description: 'Good' },
  { min: 60, label: 'C', color: status.amber, description: 'Fair' },
  { min: 50, label: 'D', color: '#F97316', description: 'Poor' },
  { min: 0,  label: 'F', color: status.red, description: 'Critical' },
];

function getFCIGrade(score: number) {
  return FCI_GRADES.find(g => score >= g.min) || FCI_GRADES[FCI_GRADES.length - 1];
}

// ─── Shared Styles ───────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted,
  textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 12px',
  borderBottom: `2px solid ${border.light}`, textAlign: 'left',
};
const tdStyle: React.CSSProperties = {
  fontSize: fontSize.sm, color: text.primary, padding: '10px 12px',
  borderBottom: `1px solid ${border.light}`, fontFamily: font.mono,
};
const tdLabel: React.CSSProperties = { ...tdStyle, fontFamily: font.sans, fontWeight: fontWeight.medium };

// ─── Progress Bar ────────────────────────────────────────────────────────

function Bar({ value, max, color, h = 8 }: { value: number; max: number; color: string; h?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ flex: 1, height: h, background: `${color}15`, borderRadius: h, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: h, transition: transition.smooth }} />
    </div>
  );
}

// ─── FCI Score Ring ──────────────────────────────────────────────────────

function FCIRing({ score, size = 64 }: { score: number; size?: number }) {
  const grade = getFCIGrade(score);
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${grade.color}20`} strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={grade.color} strokeWidth={4}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size > 50 ? fontSize.lg : fontSize.sm, fontWeight: fontWeight.bold, color: grade.color, fontFamily: font.mono }}>{score}</span>
      </div>
    </div>
  );
}

function SystemDot({ rating, label }: { rating: string; label: string }) {
  const color = SYSTEM_COLORS[rating] || status.gray;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color,
        boxShadow: rating === 'critical' ? `0 0 6px ${color}80` : 'none' }} />
      <span style={{ fontSize: fontSize.xs, color: text.muted }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT DETAIL DRAWER
// ═══════════════════════════════════════════════════════════════════════════

function ProjectDetailDrawer({ project, onClose }: { project: CapitalProject; onClose: () => void }) {
  const sc = { 'on-track': { color: status.green, label: 'On Track', v: 'green' as const },
    'at-risk': { color: status.amber, label: 'At Risk', v: 'amber' as const },
    'over-budget': { color: status.red, label: 'Over Budget', v: 'red' as const } };
  const s = sc[project.status];
  const spentPct = (project.spent / project.budget) * 100;
  const ms = project.milestones || [];
  const doneMs = ms.filter(m => m.completed).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 640, height: '100%', background: bg.card, boxShadow: shadow.xl,
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${border.light}`,
          background: `linear-gradient(135deg, ${bg.subtle} 0%, ${bg.card} 100%)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {project.isEmergency && (
                  <span style={{ background: status.redBg, color: status.red, padding: '2px 8px',
                    borderRadius: radius.full, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                    border: `1px solid ${status.redBorder}` }}>EMERGENCY</span>
                )}
                <StatusBadge label={s.label} variant={s.v} />
              </div>
              <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: text.primary, fontFamily: font.body }}>{project.name}</div>
              <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 4 }}>{project.campus} · {project.category || 'Capital Project'}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontSize: fontSize.xl, color: text.light, padding: '4px 8px' }}>✕</button>
          </div>
          {project.description && (
            <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.6, marginTop: 8 }}>{project.description}</div>
          )}
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          {/* Budget & Completion KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: bg.subtle, borderRadius: radius.lg, padding: 16 }}>
              <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Budget</div>
              <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>{fmtCompact(project.spent)}</div>
              <div style={{ fontSize: fontSize.sm, color: text.muted, marginBottom: 8 }}>of {fmtCompact(project.budget)}</div>
              <Bar value={project.spent} max={project.budget} color={spentPct > 100 ? status.red : spentPct > 90 ? status.amber : status.green} h={6} />
              <div style={{ fontSize: fontSize.xs, color: spentPct > 90 ? status.amber : text.light, marginTop: 4 }}>
                {fmtPct(spentPct)} utilized · {fmtCompact(project.budget - project.spent)} remaining
              </div>
            </div>
            <div style={{ background: bg.subtle, borderRadius: radius.lg, padding: 16 }}>
              <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Completion</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FCIRing score={project.completion} size={56} />
                <div>
                  <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>{project.completion}%</div>
                  <div style={{ fontSize: fontSize.xs, color: text.muted }}>{ms.length > 0 ? `${doneMs}/${ms.length} milestones` : 'No milestones set'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { l: 'Project Manager', v: project.projectManager || 'TBD' },
              { l: 'Contractor', v: project.contractor || 'TBD' },
              { l: 'Start Date', v: project.startDate || 'TBD' },
              { l: 'Target Completion', v: project.targetDate || 'TBD' },
              { l: 'Project ID', v: project.id },
              { l: 'Campus', v: project.campus },
            ].map(item => (
              <div key={item.l} style={{ padding: '8px 0' }}>
                <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.l}</div>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary, marginTop: 2 }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* Milestones Timeline */}
          {ms.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Project Timeline</div>
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2,
                  background: `linear-gradient(to bottom, ${modColors.grounds} ${(doneMs / ms.length) * 100}%, ${border.light} ${(doneMs / ms.length) * 100}%)` }} />
                {ms.map((m, i) => {
                  const past = m.completed;
                  const cur = !m.completed && (i === 0 || ms[i - 1].completed);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < ms.length - 1 ? 16 : 0, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -24 + 3, top: 2, width: 12, height: 12, borderRadius: '50%',
                        background: past ? modColors.grounds : cur ? status.amber : bg.card,
                        border: `2px solid ${past ? modColors.grounds : cur ? status.amber : border.medium}`,
                        boxShadow: cur ? `0 0 8px ${status.amber}40` : 'none', zIndex: 1 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: fontSize.sm, fontWeight: cur ? fontWeight.semibold : fontWeight.medium,
                          color: past ? text.muted : cur ? text.primary : text.light }}>
                          {m.label}
                          {past && <span style={{ color: status.green, marginLeft: 6 }}>✓</span>}
                          {cur && <span style={{ color: status.amber, marginLeft: 6, fontSize: fontSize.xs }}>● IN PROGRESS</span>}
                        </div>
                        <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 2 }}>{m.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Risk Notes */}
          {project.riskNotes && (
            <div style={{
              background: project.status === 'at-risk' ? status.amberBg : project.status === 'over-budget' ? status.redBg : status.greenBg,
              border: `1px solid ${project.status === 'at-risk' ? status.amberBorder : project.status === 'over-budget' ? status.redBorder : status.greenBorder}`,
              borderRadius: radius.lg, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Risk Notes</div>
              <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.6 }}>{project.riskNotes}</div>
            </div>
          )}

          {/* Budget Burn Rate */}
          {project.startDate && project.targetDate && (() => {
            const start = new Date(project.startDate!).getTime();
            const end = new Date(project.targetDate!).getTime();
            const now = Date.now();
            const timePct = Math.min(Math.max((now - start) / (end - start) * 100, 0), 100);
            const budPct = spentPct;
            const ratio = timePct > 0 ? budPct / timePct : 0;
            const lbl = ratio > 1.15 ? 'Burning Fast' : ratio > 0.85 ? 'On Pace' : 'Under-Burning';
            const clr = ratio > 1.15 ? status.red : ratio > 0.85 ? status.green : status.blue;
            const v = ratio > 1.15 ? 'red' as const : ratio > 0.85 ? 'green' as const : 'blue' as const;
            return (
              <div style={{ background: bg.subtle, borderRadius: radius.lg, padding: 16 }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Budget Burn Analysis</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: fontSize.sm, color: text.muted }}>Time: <strong style={{ color: text.primary, fontFamily: font.mono }}>{fmtPct(timePct)}</strong></span>
                  <span style={{ fontSize: fontSize.sm, color: text.muted }}>Budget: <strong style={{ color: text.primary, fontFamily: font.mono }}>{fmtPct(budPct)}</strong></span>
                  <StatusBadge label={lbl} variant={v} />
                </div>
                <div style={{ position: 'relative', height: 20, background: border.light, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '50%', width: `${Math.min(timePct, 100)}%`, background: `${status.blue}60` }} />
                  <div style={{ position: 'absolute', left: 0, bottom: 0, height: '50%', width: `${Math.min(budPct, 100)}%`, background: `${clr}60` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: fontSize.xs, color: status.blue }}>■ Time</span>
                  <span style={{ fontSize: fontSize.xs, color: clr }}>■ Budget</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WORK ORDER DETAIL DRAWER
// ═══════════════════════════════════════════════════════════════════════════

function WorkOrderDrawer({ wo, onClose }: { wo: WorkOrder; onClose: () => void }) {
  const p = PRIORITY_CONFIG[wo.priority];
  const sm = { 'open': { label: 'Open', v: 'amber' as const }, 'in-progress': { label: 'In Progress', v: 'blue' as const }, 'completed': { label: 'Completed', v: 'green' as const } };
  const s = sm[wo.status];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 520, height: '100%', background: bg.card, boxShadow: shadow.xl,
        display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${border.light}`, borderLeft: `4px solid ${p.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <StatusBadge label={p.label} variant={wo.priority === 'urgent' ? 'red' : wo.priority === 'high' ? 'amber' : wo.priority === 'medium' ? 'blue' : 'green'} />
                <StatusBadge label={s.label} variant={s.v} />
              </div>
              <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: text.primary }}>{wo.description}</div>
              <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 4 }}>{wo.campus} · {wo.id}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: fontSize.xl, color: text.light, padding: '4px 8px' }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[
              { l: 'Date Submitted', v: wo.dateSubmitted },
              { l: 'Days Open', v: wo.daysOpen !== undefined ? `${wo.daysOpen} days` : 'N/A' },
              { l: 'Assigned To', v: wo.assignedTo },
              { l: 'Category', v: wo.category ? wo.category.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'General' },
              { l: 'Estimated Cost', v: wo.estimatedCost ? fmtFull(wo.estimatedCost) : 'TBD' },
              { l: 'Work Order ID', v: wo.id },
            ].map(item => (
              <div key={item.l}>
                <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.l}</div>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary, marginTop: 2 }}>{item.v}</div>
              </div>
            ))}
          </div>
          {wo.notes && (
            <div style={{ background: wo.priority === 'urgent' ? status.redBg : bg.subtle,
              border: `1px solid ${wo.priority === 'urgent' ? status.redBorder : border.light}`,
              borderRadius: radius.lg, padding: 16 }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Notes & Updates</div>
              <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.6 }}>{wo.notes}</div>
            </div>
          )}
          {wo.priority === 'urgent' && wo.status === 'open' && (
            <div style={{ marginTop: 16, padding: 16, background: status.redBg, border: `1px solid ${status.redBorder}`, borderRadius: radius.lg, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '24px' }}>⚠</span>
              <div>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: status.red }}>Immediate Action Required</div>
                <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>This urgent work order is unassigned. Escalate to facilities leadership immediately.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const fac = useFacilities();
  const net = useNetwork();
  const [selectedProject, setSelectedProject] = useState<CapitalProject | null>(null);

  const openOrders = fac.workOrders.filter(wo => wo.status !== 'completed');
  const urgentOrders = fac.workOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed');
  const totalCapBudget = fac.capitalProjects.reduce((s, p) => s + p.budget, 0);
  const totalCapSpent = fac.capitalProjects.reduce((s, p) => s + p.spent, 0);
  const atRiskProjects = fac.capitalProjects.filter(p => p.status !== 'on-track');
  const networkFCI = fac.networkFCI || 70;
  const totalDeferred = fac.totalDeferredMaintenance || 0;
  const conditions = fac.campusConditions || [];
  const criticalCampuses = conditions.filter(c => c.fciScore < 65);

  const ai = useSlateAI({
    prompt: `Analyze the facilities health for this charter school network. Cover the network FCI score, campus conditions, deferred maintenance backlog, urgent work orders, capital project status, and vendor contract expirations. What is the biggest facilities risk and what action should the CEO take? Be specific with numbers.`,
    domain: 'grounds-overview',
    fallback: `Network FCI of ${networkFCI} (Grade ${getFCIGrade(networkFCI).label}) indicates ${getFCIGrade(networkFCI).description.toLowerCase()} overall condition across ${conditions.length} campuses. ${criticalCampuses.length > 0 ? `${criticalCampuses.length} campus${criticalCampuses.length > 1 ? 'es' : ''} below 65 FCI require priority attention.` : 'All campuses above critical threshold.'} Deferred maintenance backlog of ${fmtCompact(totalDeferred)}. ${urgentOrders.length > 0 ? `${urgentOrders.length} urgent work orders require immediate response.` : 'No urgent work orders.'}`,
  });

  return (
    <div>
      {/* 5-KPI Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Network FCI" value={`${networkFCI}`} subValue={getFCIGrade(networkFCI).description}
          trend={{ value: `Grade ${getFCIGrade(networkFCI).label}`, positive: networkFCI >= 70 }} icon="▣" accent={getFCIGrade(networkFCI).color} />
        <KPICard label="Open Work Orders" value={openOrders.length.toString()} subValue={urgentOrders.length > 0 ? `${urgentOrders.length} urgent` : 'None urgent'}
          trend={{ value: urgentOrders.length > 0 ? 'Action needed' : 'Under control', positive: urgentOrders.length === 0 }} accent={urgentOrders.length > 0 ? status.red : status.green} />
        <KPICard label="Capital Program" value={fmtCompact(totalCapSpent)} subValue={`of ${fmtCompact(totalCapBudget)} budget`}
          trend={{ value: `${atRiskProjects.length} at risk`, positive: atRiskProjects.length === 0 }} accent={modColors.grounds} />
        <KPICard label="Deferred Maintenance" value={fmtCompact(totalDeferred)} subValue={`${conditions.length} campuses`}
          trend={{ value: totalDeferred > 5000000 ? 'High backlog' : 'Manageable', positive: totalDeferred <= 5000000 }} accent={totalDeferred > 5000000 ? status.amber : status.green} />
        <KPICard label="Contracts Expiring" value={fac.vendorContractsExpiring.toString()} subValue="Within 90 days"
          trend={{ value: fac.vendorContractsExpiring > 2 ? 'Review needed' : 'On track', positive: fac.vendorContractsExpiring <= 2 }} accent={fac.vendorContractsExpiring > 2 ? status.amber : status.green} />
      </div>

      {/* AI Intelligence */}
      <AIInsight label="Facilities Intelligence"
        content={`Network FCI of ${networkFCI} (Grade ${getFCIGrade(networkFCI).label}) indicates ${getFCIGrade(networkFCI).description.toLowerCase()} overall condition across ${conditions.length} campuses. ${criticalCampuses.length > 0 ? `${criticalCampuses.length} campus${criticalCampuses.length > 1 ? 'es' : ''} below 65 FCI require priority attention: ${criticalCampuses.map(c => `${c.campusName} (${c.fciScore})`).join(', ')}.` : 'All campuses above critical threshold.'} Deferred maintenance backlog of ${fmtCompact(totalDeferred)} represents ${conditions.length > 0 ? fmtCompact(Math.round(totalDeferred / conditions.length)) : '$0'} per campus. ${urgentOrders.length > 0 ? `URGENT: ${urgentOrders.length} work order${urgentOrders.length > 1 ? 's' : ''} require immediate response: ${urgentOrders.map(wo => `${wo.description} (${wo.campus})`).join('; ')}.` : 'No urgent work orders.'} ${atRiskProjects.length > 0 ? `Capital projects at risk: ${atRiskProjects.map(p => `${p.name} \u2014 ${p.status}`).join('; ')}.` : 'All capital projects on track.'}`}
        aiText={ai.text} aiLoading={ai.loading} aiError={ai.error} onRegenerate={ai.regenerate} lastGenerated={ai.lastGenerated} />

      {/* Capital Projects Quick View */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Active Capital Projects</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(fac.capitalProjects.length, 3)}, 1fr)`, gap: 16 }}>
          {fac.capitalProjects.slice(0, 3).map(project => {
            const ps = { 'on-track': { color: status.green, label: 'On Track', v: 'green' as const }, 'at-risk': { color: status.amber, label: 'At Risk', v: 'amber' as const }, 'over-budget': { color: status.red, label: 'Over Budget', v: 'red' as const } }[project.status];
            return (
              <Card key={project.id} accent={ps.color} hover onClick={() => setSelectedProject(project)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: text.primary }}>{project.name}</div>
                    <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>{project.campus} · {project.category || 'Capital'}</div>
                  </div>
                  <StatusBadge label={ps.label} variant={ps.v} size="sm" />
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                  <div><div style={{ fontSize: fontSize.xs, color: text.light }}>Budget</div><div style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold }}>{fmtCompact(project.spent)} / {fmtCompact(project.budget)}</div></div>
                  <div><div style={{ fontSize: fontSize.xs, color: text.light }}>Complete</div><div style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold }}>{project.completion}%</div></div>
                </div>
                <Bar value={project.completion} max={100} color={modColors.grounds} h={6} />
                <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 8, textAlign: 'center' }}>Click for full project details →</div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Campus FCI Heatmap Strip */}
      {conditions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Campus Condition Index (FCI)</div>
          <div style={{ display: 'flex', gap: 4, borderRadius: radius.lg, overflow: 'hidden' }}>
            {[...conditions].sort((a, b) => b.fciScore - a.fciScore).map(c => {
              const grade = getFCIGrade(c.fciScore);
              return (
                <div key={c.campusId} style={{ flex: 1, padding: '12px 8px', textAlign: 'center',
                  background: `${grade.color}15`, borderBottom: `3px solid ${grade.color}` }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.primary }}>{c.campusName}</div>
                  <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontFamily: font.mono, color: grade.color, marginTop: 4 }}>{c.fciScore}</div>
                  <div style={{ fontSize: '9px', color: text.light, textTransform: 'uppercase' }}>{grade.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Urgent Work Orders */}
      {urgentOrders.length > 0 && (
        <div style={{ background: status.redBg, border: `1px solid ${status.redBorder}`, borderRadius: radius.lg, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: status.red, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Urgent Work Orders</div>
          {urgentOrders.map(wo => (
            <div key={wo.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${status.redBorder}40` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: status.red, animation: 'pulse 2s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>{wo.description}</div>
                <div style={{ fontSize: fontSize.xs, color: text.muted }}>{wo.campus} · {wo.assignedTo} · {wo.daysOpen !== undefined ? `${wo.daysOpen}d open` : wo.dateSubmitted}</div>
              </div>
              <StatusBadge label={wo.status === 'open' ? 'OPEN' : 'IN PROGRESS'} variant={wo.status === 'open' ? 'red' : 'amber'} size="sm" />
            </div>
          ))}
        </div>
      )}

      {selectedProject && <ProjectDetailDrawer project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPITAL PROJECTS TAB
// ═══════════════════════════════════════════════════════════════════════════

function ProjectsTab() {
  const fac = useFacilities();
  const { role, selectedCampusId } = useRole();
  const net = useNetwork();
  const [selectedProject, setSelectedProject] = useState<CapitalProject | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const campusName = role === 'principal' ? net.campuses.find(c => c.id === selectedCampusId)?.short : null;
  const projects = useMemo(() => {
    let cp = [...fac.capitalProjects];
    if (campusName) cp = cp.filter(p => p.campus === campusName || p.campus === 'All');
    if (filterStatus !== 'all') cp = cp.filter(p => p.status === filterStatus);
    return cp;
  }, [fac.capitalProjects, campusName, filterStatus]);

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgCompletion = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.completion, 0) / projects.length) : 0;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Active Projects" value={projects.length.toString()} subValue={`${projects.filter(p => p.status !== 'on-track').length} flagged`} accent={modColors.grounds} />
        <KPICard label="Total Budget" value={fmtCompact(totalBudget)} subValue={`${fmtCompact(totalSpent)} spent`} accent={status.blue} />
        <KPICard label="Avg Completion" value={`${avgCompletion}%`} subValue="Across all projects" accent={modColors.grounds} />
        <KPICard label="Budget Remaining" value={fmtCompact(totalBudget - totalSpent)} subValue={`${fmtPct((totalSpent / totalBudget) * 100)} utilized`} accent={totalSpent / totalBudget > 0.9 ? status.amber : status.green} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', padding: '10px 16px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}` }}>
        <span style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>Status:</span>
        {['all', 'on-track', 'at-risk', 'over-budget'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${filterStatus === s ? modColors.grounds : border.light}`,
            background: filterStatus === s ? `${modColors.grounds}15` : 'transparent', color: filterStatus === s ? modColors.grounds : text.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', textTransform: 'capitalize', fontFamily: font.sans }}>
            {s === 'all' ? 'All' : s.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {projects.map(project => {
          const ps = { 'on-track': { color: status.green, label: 'On Track', v: 'green' as const }, 'at-risk': { color: status.amber, label: 'At Risk', v: 'amber' as const }, 'over-budget': { color: status.red, label: 'Over Budget', v: 'red' as const } }[project.status];
          const ms = project.milestones || [];
          const doneMs = ms.filter(m => m.completed).length;
          return (
            <Card key={project.id} accent={ps.color} hover onClick={() => setSelectedProject(project)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {project.isEmergency && <span style={{ color: status.red, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>⚠ EMERGENCY</span>}
                    <StatusBadge label={ps.label} variant={ps.v} size="sm" />
                  </div>
                  <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.base, color: text.primary }}>{project.name}</div>
                  <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>{project.campus} · {project.category || 'Capital'}</div>
                </div>
                <FCIRing score={project.completion} size={48} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: fontSize.xs, color: text.muted }}>Budget</span>
                  <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: text.primary }}>{fmtCompact(project.spent)} / {fmtCompact(project.budget)}</span>
                </div>
                <Bar value={project.spent} max={project.budget} color={ps.color} h={6} />
              </div>
              {ms.length > 0 && (
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {ms.map((m, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: m.completed ? modColors.grounds : border.light }} />)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>{ms.length > 0 ? `${doneMs}/${ms.length} milestones` : ''}{project.projectManager ? ` · ${project.projectManager}` : ''}</div>
                <span style={{ fontSize: fontSize.xs, color: modColors.grounds, fontWeight: fontWeight.semibold }}>Details →</span>
              </div>
            </Card>
          );
        })}
      </div>
      {projects.length === 0 && <EmptyState icon="▣" title="No Projects" description="No capital projects match the current filters." />}
      {selectedProject && <ProjectDetailDrawer project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WORK ORDERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function WorkOrdersTab() {
  const fac = useFacilities();
  const { role, selectedCampusId } = useRole();
  const net = useNetwork();
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const campusName = role === 'principal' ? net.campuses.find(c => c.id === selectedCampusId)?.short : null;
  const workOrders = useMemo(() => {
    let wo = [...fac.workOrders];
    if (campusName) wo = wo.filter(w => w.campus === campusName);
    if (filterPriority !== 'all') wo = wo.filter(w => w.priority === filterPriority);
    if (filterStatus !== 'all') wo = wo.filter(w => w.status === filterStatus);
    return wo;
  }, [fac.workOrders, campusName, filterPriority, filterStatus]);

  const openOrders = fac.workOrders.filter(wo => wo.status !== 'completed');
  const totalEstCost = workOrders.reduce((s, wo) => s + (wo.estimatedCost || 0), 0);
  const avgDaysOpen = openOrders.length > 0 ? Math.round(openOrders.reduce((s, wo) => s + (wo.daysOpen || 0), 0) / openOrders.length) : 0;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Work Orders" value={workOrders.length.toString()} subValue={`${workOrders.filter(w => w.status !== 'completed').length} active`} accent={modColors.grounds} />
        <KPICard label="Estimated Cost" value={fmtCompact(totalEstCost)} subValue="All visible orders" accent={status.blue} />
        <KPICard label="Avg Days Open" value={avgDaysOpen.toString()} subValue="Active orders" trend={{ value: avgDaysOpen > 7 ? 'Aging' : 'Responsive', positive: avgDaysOpen <= 7 }} accent={avgDaysOpen > 7 ? status.amber : status.green} />
        <KPICard label="Unassigned" value={workOrders.filter(w => w.assignedTo === 'TBD').length.toString()} subValue="Need assignment" accent={status.amber} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap', padding: '10px 16px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}` }}>
        <span style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>Priority:</span>
        {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
          <button key={p} onClick={() => setFilterPriority(p)} style={{
            padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${filterPriority === p ? modColors.grounds : border.light}`,
            background: filterPriority === p ? `${modColors.grounds}15` : 'transparent', color: filterPriority === p ? modColors.grounds : text.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', textTransform: 'capitalize', fontFamily: font.sans }}>
            {p === 'all' ? 'All' : p}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: border.light, margin: '0 4px' }} />
        <span style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>Status:</span>
        {['all', 'open', 'in-progress', 'completed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${filterStatus === s ? modColors.grounds : border.light}`,
            background: filterStatus === s ? `${modColors.grounds}15` : 'transparent', color: filterStatus === s ? modColors.grounds : text.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', textTransform: 'capitalize', fontFamily: font.sans }}>
            {s === 'all' ? 'All' : s.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div style={{ background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px 100px 80px', gap: 8, padding: '8px 16px', background: bg.subtle }}>
          {['Work Order', 'Priority', 'Status', 'Assigned', 'Cost', 'Days'].map(h => (
            <div key={h} style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: fontWeight.semibold }}>{h}</div>
          ))}
        </div>
        {workOrders.map(wo => {
          const p = PRIORITY_CONFIG[wo.priority];
          return (
            <div key={wo.id} onClick={() => setSelectedWO(wo)} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px 100px 80px', alignItems: 'center', gap: 8, padding: '12px 16px',
              borderBottom: `1px solid ${border.light}`, borderLeft: `3px solid ${p.color}`, cursor: 'pointer', transition: transition.fast }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = `${modColors.grounds}08`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
              <div>
                <div style={{ fontWeight: fontWeight.medium, fontSize: fontSize.sm, color: text.primary }}>{wo.description}</div>
                <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>{wo.campus} · {wo.id}</div>
              </div>
              <StatusBadge label={p.label} variant={wo.priority === 'urgent' ? 'red' : wo.priority === 'high' ? 'amber' : wo.priority === 'medium' ? 'blue' : 'green'} size="sm" />
              <StatusBadge label={wo.status === 'open' ? 'Open' : wo.status === 'in-progress' ? 'In Progress' : 'Done'} variant={wo.status === 'open' ? 'amber' : wo.status === 'in-progress' ? 'blue' : 'green'} size="sm" />
              <div style={{ fontSize: fontSize.xs, color: wo.assignedTo === 'TBD' ? status.amber : text.muted }}>{wo.assignedTo}</div>
              <div style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: text.muted }}>{wo.estimatedCost ? fmtCompact(wo.estimatedCost) : '—'}</div>
              <div style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: (wo.daysOpen || 0) > 7 ? status.amber : text.muted }}>{wo.daysOpen !== undefined ? `${wo.daysOpen}d` : '—'}</div>
            </div>
          );
        })}
      </div>
      {workOrders.length === 0 && <EmptyState icon="◈" title="No Work Orders" description="No work orders match the current filters." />}
      {selectedWO && <WorkOrderDrawer wo={selectedWO} onClose={() => setSelectedWO(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPUS HEALTH TAB
// ═══════════════════════════════════════════════════════════════════════════

function CampusHealthTab() {
  const fac = useFacilities();
  const conditions = fac.campusConditions || [];
  const sorted = [...conditions].sort((a, b) => a.fciScore - b.fciScore);
  const networkFCI = fac.networkFCI || 70;
  const totalDeferred = fac.totalDeferredMaintenance || 0;
  const totalSqft = conditions.reduce((s, c) => s + c.sqft, 0);
  const avgAge = conditions.length > 0 ? Math.round(conditions.reduce((s, c) => s + c.buildingAge, 0) / conditions.length) : 0;
  const sysNames = ['hvac', 'roof', 'plumbing', 'electrical', 'fireSafety', 'elevator'] as const;
  const sysLabels: Record<string, string> = { hvac: 'HVAC', roof: 'Roof', plumbing: 'Plumb.', electrical: 'Elec.', fireSafety: 'Fire', elevator: 'Elev.' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Network FCI" value={`${networkFCI}`} subValue={`Grade ${getFCIGrade(networkFCI).label} — ${getFCIGrade(networkFCI).description}`} accent={getFCIGrade(networkFCI).color} icon="▣" />
        <KPICard label="Total Deferred" value={fmtCompact(totalDeferred)} subValue={`${fmtCompact(Math.round(totalDeferred / (conditions.length || 1)))} per campus`} accent={status.amber} />
        <KPICard label="Portfolio" value={fmtNum(totalSqft)} subValue={`sq ft · ${conditions.length} buildings`} accent={modColors.grounds} />
        <KPICard label="Avg Building Age" value={`${avgAge} yrs`} subValue={`Range: ${conditions.length > 0 ? Math.min(...conditions.map(c => c.buildingAge)) : 0}–${conditions.length > 0 ? Math.max(...conditions.map(c => c.buildingAge)) : 0} years`} accent={status.blue} />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Campus Condition Assessment</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thStyle}>Campus</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>FCI</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Sq Ft</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Age</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Deferred</th>
              {sysNames.map(sys => <th key={sys} style={{ ...thStyle, textAlign: 'center', fontSize: '9px' }}>{sysLabels[sys]}</th>)}
              <th style={{ ...thStyle, textAlign: 'right' }}>Inspected</th>
            </tr></thead>
            <tbody>
              {sorted.map(c => {
                const grade = getFCIGrade(c.fciScore);
                return (
                  <tr key={c.campusId}>
                    <td style={tdLabel}>{c.campusName}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 24, borderRadius: radius.md,
                        background: `${grade.color}15`, color: grade.color, fontWeight: fontWeight.bold, fontSize: fontSize.sm }}>{c.fciScore}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNum(c.sqft)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{c.buildingAge}y</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: c.deferredMaintenance > 1000000 ? status.red : c.deferredMaintenance > 500000 ? status.amber : text.primary }}>{fmtCompact(c.deferredMaintenance)}</td>
                    {sysNames.map(sys => {
                      const r = c.criticalSystems[sys];
                      return <td key={sys} style={{ ...tdStyle, textAlign: 'center', padding: '10px 4px' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: SYSTEM_COLORS[r], margin: '0 auto',
                          boxShadow: r === 'critical' ? `0 0 6px ${SYSTEM_COLORS[r]}80` : 'none' }} />
                      </td>;
                    })}
                    <td style={{ ...tdStyle, textAlign: 'right', fontSize: fontSize.xs }}>{c.lastInspection}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border.light}` }}>
          {['good', 'fair', 'poor', 'critical'].map(r => <SystemDot key={r} rating={r} label={r.charAt(0).toUpperCase() + r.slice(1)} />)}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Deferred Maintenance by Campus</div>
        {[...conditions].sort((a, b) => b.deferredMaintenance - a.deferredMaintenance).map(c => {
          const grade = getFCIGrade(c.fciScore);
          return (
            <div key={c.campusId} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: fontSize.sm, color: text.primary, fontWeight: fontWeight.medium }}>{c.campusName}</span>
                  <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: radius.full, background: `${grade.color}15`, color: grade.color, fontWeight: fontWeight.bold }}>FCI {c.fciScore}</span>
                </div>
                <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: text.primary }}>{fmtCompact(c.deferredMaintenance)}</span>
              </div>
              <Bar value={c.deferredMaintenance} max={Math.max(...conditions.map(cc => cc.deferredMaintenance))}
                color={c.deferredMaintenance > 1000000 ? status.red : c.deferredMaintenance > 500000 ? status.amber : status.green} h={6} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VENDORS TAB
// ═══════════════════════════════════════════════════════════════════════════

function VendorsTab() {
  const fac = useFacilities();
  const contracts = fac.vendorContracts || [];
  const totalAnnual = contracts.reduce((s, c) => s + c.annualValue, 0);
  const expiring = contracts.filter(c => c.status === 'expiring');
  const avgRating = contracts.length > 0 ? (contracts.reduce((s, c) => s + c.rating, 0) / contracts.length).toFixed(1) : '0';

  const ai = useSlateAI({
    prompt: `Analyze the vendor contract portfolio for this charter school network. Focus on expiring contracts, vendor performance ratings, annual spend optimization, and renewal strategy. What contracts should be renegotiated and which vendors should be replaced?`,
    domain: 'grounds-vendors',
    fallback: `${expiring.length} vendor contract${expiring.length > 1 ? 's' : ''} expiring within 90 days. Total annual vendor spend of ${fmtCompact(totalAnnual)} across ${contracts.length} contracts. ${expiring.some(c => c.rating >= 4) ? 'High-performing vendors should be prioritized for renewal.' : 'Consider competitive bidding for underperforming contracts.'}`,
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Active Contracts" value={contracts.length.toString()} subValue={`${expiring.length} expiring soon`} accent={modColors.grounds} />
        <KPICard label="Annual Spend" value={fmtCompact(totalAnnual)} subValue="All vendor contracts" accent={status.blue} />
        <KPICard label="Avg Rating" value={`${avgRating}/5`} subValue="Vendor performance" accent={Number(avgRating) >= 4 ? status.green : status.amber} />
        <KPICard label="Expiring" value={expiring.length.toString()} subValue="Need renewal" trend={{ value: expiring.length > 0 ? 'Review needed' : 'All current', positive: expiring.length === 0 }} accent={expiring.length > 0 ? status.amber : status.green} />
      </div>

      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Vendor Contract Register</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={thStyle}>Vendor</th><th style={thStyle}>Service</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Annual Value</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Rating</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>End Date</th>
            <th style={thStyle}>Campuses</th>
          </tr></thead>
          <tbody>
            {contracts.map(c => (
              <tr key={c.id}>
                <td style={{ ...tdLabel, fontWeight: fontWeight.semibold }}>{c.vendor}</td>
                <td style={{ ...tdStyle, fontFamily: font.sans }}>{c.service}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCompact(c.annualValue)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <StatusBadge label={c.status === 'active' ? 'Active' : c.status === 'expiring' ? 'Expiring' : 'Expired'}
                    variant={c.status === 'active' ? 'green' : c.status === 'expiring' ? 'amber' : 'red'} size="sm" />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(star => <span key={star} style={{ color: star <= c.rating ? brand.gold : border.light, fontSize: fontSize.xs }}>★</span>)}
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: c.status === 'expiring' ? status.amber : text.muted, fontSize: fontSize.xs }}>{c.endDate}</td>
                <td style={{ ...tdStyle, fontFamily: font.sans, fontSize: fontSize.xs, color: text.muted }}>{c.campuses.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {expiring.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <AIInsight label="Vendor Intelligence"
            content={`${expiring.length} vendor contract${expiring.length > 1 ? 's' : ''} expiring within 90 days: ${expiring.map(c => `${c.vendor} (${c.service}, ${fmtCompact(c.annualValue)}/yr, ends ${c.endDate})`).join('; ')}. ${expiring.some(c => c.rating >= 4) ? 'High-performing vendors should be prioritized for renewal.' : 'Consider competitive bidding for underperforming contracts.'} Total annual vendor spend of ${fmtCompact(totalAnnual)} across ${contracts.length} contracts.`}
            aiText={ai.text} aiLoading={ai.loading} aiError={ai.error} onRegenerate={ai.regenerate} lastGenerated={ai.lastGenerated} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY TAB
// ═══════════════════════════════════════════════════════════════════════════

function EmergencyTab() {
  const net = useNetwork();
  const { events, activeEvents, addEmergency } = useEmergencies();
  const [form, setForm] = useState({ campus: '', type: '', description: '', severity: 'high' as string, affectsOccupancy: false, estimatedCost: '', contactName: '', contactPhone: '' });
  const [submitted, setSubmitted] = useState(false);

  const EMERGENCY_TYPE_MAP: Record<string, import('../../core/types').EmergencyType> = {
    'Roof Collapse / Structural Failure': 'roof-collapse',
    'Flooding / Water Damage': 'flooding',
    'Fire Damage': 'fire',
    'HVAC System Failure (No Heat/AC)': 'hvac-failure',
    'Electrical System Failure': 'other',
    'Gas Leak': 'gas-leak',
    'Security System Failure': 'security',
    'Elevator Entrapment': 'structural',
    'Hazardous Material Exposure': 'other',
    'Other Emergency': 'other',
  };

  function handleSubmit() {
    if (!form.campus || !form.type || !form.description) return;
    const campusObj = net.campuses.find(c => c.short === form.campus);
    const costNum = parseInt(form.estimatedCost.replace(/[^0-9]/g, '')) || 50000;
    const event: import('../../core/types').EmergencyEvent = {
      id: `EMG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campus: form.campus,
      campusId: campusObj?.id || 1,
      type: EMERGENCY_TYPE_MAP[form.type] || 'other',
      severity: form.severity as import('../../core/types').EmergencySeverity,
      title: `${form.type} at ${form.campus}`,
      description: form.description,
      estimatedCost: costNum,
      occupancyImpact: form.affectsOccupancy,
      reportedBy: form.contactName || 'Facilities Team',
      contactPhone: form.contactPhone || '',
      status: 'active',
    };
    addEmergency(event);
    setSubmitted(true);
  }

  const emergencyTypes = [
    'Roof Collapse / Structural Failure', 'Flooding / Water Damage', 'Fire Damage',
    'HVAC System Failure (No Heat/AC)', 'Electrical System Failure', 'Gas Leak',
    'Security System Failure', 'Elevator Entrapment', 'Hazardous Material Exposure', 'Other Emergency',
  ];

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: status.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '36px', color: status.green }}>✓</div>
        <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: text.primary, marginBottom: 8, fontFamily: font.body }}>Emergency Project Created</div>
        <div style={{ fontSize: fontSize.sm, color: text.muted, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>Emergency work order and capital project created. Notifications sent to:</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          {['Facilities Director', 'Campus Principal', 'COO', 'Watch Module', 'Briefing Module'].map(r => (
            <span key={r} style={{ padding: '4px 12px', borderRadius: radius.full, background: status.greenBg, border: `1px solid ${status.greenBorder}`, fontSize: fontSize.xs, color: status.green, fontWeight: fontWeight.semibold }}>✓ {r}</span>
          ))}
        </div>
        <button onClick={() => { setSubmitted(false); setForm({ campus: '', type: '', description: '', severity: 'high', affectsOccupancy: false, estimatedCost: '', contactName: '', contactPhone: '' }); }}
          style={{ marginTop: 24, padding: '10px 24px', borderRadius: radius.lg, border: `1px solid ${modColors.grounds}`, background: 'transparent', color: modColors.grounds, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, cursor: 'pointer', fontFamily: font.sans }}>
          Submit Another Emergency
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: radius.md, border: `1px solid ${border.medium}`, background: bg.card, fontSize: fontSize.sm, color: text.primary, fontFamily: font.sans, boxSizing: 'border-box' as const };

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${status.redBg} 0%, ${status.amberBg} 100%)`, border: `1px solid ${status.redBorder}`, borderRadius: radius.lg, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: '32px' }}>⚠</div>
        <div>
          <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: status.red }}>Emergency Project Entry</div>
          <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4, lineHeight: 1.5 }}>
            Use this form for urgent, unplanned facilities emergencies. This creates a priority work order, flags the capital project as emergency, and alerts Watch, Briefing, and campus leadership simultaneously.
          </div>
        </div>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Campus *</label>
            <select value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })} style={inputStyle}>
              <option value="">Select campus...</option>
              {net.campuses.map(c => <option key={c.id} value={c.short}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Emergency Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              <option value="">Select type...</option>
              {emergencyTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Severity *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'critical', l: 'Critical', c: status.red, d: 'Building unsafe' }, { v: 'high', l: 'High', c: status.amber, d: 'Operations impacted' }, { v: 'medium', l: 'Medium', c: status.blue, d: 'Needs attention' }].map(s => (
                <button key={s.v} onClick={() => setForm({ ...form, severity: s.v })} style={{
                  flex: 1, padding: '10px 8px', borderRadius: radius.md, textAlign: 'center' as const,
                  border: `2px solid ${form.severity === s.v ? s.c : border.light}`, background: form.severity === s.v ? `${s.c}10` : 'transparent', cursor: 'pointer', fontFamily: font.sans }}>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: form.severity === s.v ? s.c : text.muted }}>{s.l}</div>
                  <div style={{ fontSize: '9px', color: text.light, marginTop: 2 }}>{s.d}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Estimated Cost</label>
            <input type="text" placeholder="e.g. $50,000" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the emergency situation, current impact, and any immediate actions taken..."
              rows={4} style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 }} />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.affectsOccupancy} onChange={(e) => setForm({ ...form, affectsOccupancy: e.target.checked })} />
              <span style={{ fontSize: fontSize.sm, color: text.primary }}>Building occupancy affected</span>
            </label>
            {form.affectsOccupancy && <div style={{ fontSize: fontSize.xs, color: status.red, marginTop: 4, fontWeight: fontWeight.semibold }}>⚠ This will trigger an immediate Watch alert and campus notification</div>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Contact Name</label>
              <input type="text" placeholder="On-site contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Contact Phone</label>
              <input type="tel" placeholder="(312) 555-0000" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} style={inputStyle} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSubmit} disabled={!form.campus || !form.type || !form.description}
            style={{ padding: '12px 32px', borderRadius: radius.lg, border: 'none',
              background: form.campus && form.type && form.description ? status.red : border.light,
              color: form.campus && form.type && form.description ? '#fff' : text.light,
              fontWeight: fontWeight.bold, fontSize: fontSize.sm, cursor: form.campus && form.type && form.description ? 'pointer' : 'not-allowed', fontFamily: font.sans }}>
            ⚠ Create Emergency Project
          </button>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Emergency Response Protocol</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { step: '1', title: 'Immediate Response', desc: 'Emergency work order created. Facilities director and campus principal notified via SMS and email. Watch module updated with facility alert.', color: status.red },
            { step: '2', title: 'Assessment & Triage', desc: 'Vendor dispatched within 2 hours for critical, 4 hours for high. Insurance carrier notified if estimated cost exceeds $25K.', color: status.amber },
            { step: '3', title: 'Resolution & Reporting', desc: 'Capital project created for tracking. Board notification for projects exceeding $100K. Briefing module updated with resolution timeline.', color: status.green },
          ].map(item => (
            <div key={item.step} style={{ padding: 16, background: bg.subtle, borderRadius: radius.lg, borderTop: `3px solid ${item.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: item.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{item.step}</span>
                <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>{item.title}</span>
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.muted, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GROUNDS APP
// ═══════════════════════════════════════════════════════════════════════════

export default function GroundsApp() {
  const [activeTab, setActiveTab] = useState<GroundsTab>('overview');
  const fac = useFacilities();
  const { role, selectedCampusId } = useRole();
  const net = useNetwork();
  const campusName = role === 'principal' ? net.campuses.find(c => c.id === selectedCampusId)?.name : null;
  const urgentCount = fac.workOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed').length;

  return (
    <div>
      <ModuleHeader title="Grounds" subtitle={campusName ? `${campusName} Facilities` : 'Facilities Intelligence Engine'}
        accent={modColors.grounds} freshness={{ lastUpdated: fac.lastUpdated, source: fac.source }} />

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${border.light}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', fontSize: fontSize.sm,
            fontWeight: activeTab === tab.id ? fontWeight.semibold : fontWeight.medium,
            color: activeTab === tab.id ? modColors.grounds : text.muted,
            background: 'transparent', border: 'none',
            borderBottom: activeTab === tab.id ? `2px solid ${modColors.grounds}` : '2px solid transparent',
            cursor: 'pointer', fontFamily: font.sans, transition: transition.fast,
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 }}>
            <span style={{ fontSize: fontSize.xs }}>{tab.icon}</span>
            {tab.label}
            {tab.id === 'workorders' && urgentCount > 0 && (
              <span style={{ background: status.red, color: '#fff', fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 5px', borderRadius: radius.full, minWidth: 16, textAlign: 'center' }}>{urgentCount}</span>
            )}
            {tab.id === 'emergency' && (
              <span style={{ background: status.redBg, color: status.red, fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 5px', borderRadius: radius.full }}>NEW</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'workorders' && <WorkOrdersTab />}
      {activeTab === 'conditions' && <CampusHealthTab />}
      {activeTab === 'vendors' && <VendorsTab />}
      {activeTab === 'emergency' && <EmergencyTab />}

      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: text.light, borderTop: `1px solid ${border.light}`, marginTop: 20 }}>
        {fac.workOrders.length} work orders · {fac.capitalProjects.length} capital projects · {(fac.campusConditions || []).length} campuses assessed · Grounds Intelligence Engine
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
