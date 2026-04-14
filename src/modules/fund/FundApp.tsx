/**
 * Slate v3 — Fund
 * ═══════════════════════════════════════════════════════════════════
 * PHILANTHROPIC INTELLIGENCE ENGINE
 *
 * Fund is the fundraising intelligence and pipeline management system.
 * It tracks donor relationships, manages grant opportunities, provides
 * AI-powered meeting briefs and solicitation drafts, and maintains
 * stewardship oversight.
 *
 * KEY CAPABILITIES:
 * 1. Pipeline — full donor pipeline with stage funnel and detail drill-down
 * 2. Grant Sourcer — AI-powered grant discovery and fit analysis
 * 3. Stewardship — overdue actions, upcoming touchpoints, closed gifts log
 * 4. AI Actions — Pre-Meeting Intelligence Brief, Solicitation Letter, Stewardship Report
 */

import React, { useState, useMemo } from 'react';
import { useFundraising, useNetwork, useFinancials, useEnrollment } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, StatusBadge, Section, AIInsight, EmptyState } from '../../components/Card';
import { AI_CONFIG } from '../../core/constants';
import { fmt, fmtFull, fmtNum, fmtPct, fmtCompact } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { FundOpportunity, FundStage } from '../../core/types';

// ─── Extended Types ─────────────────────────────────────────────────────────

interface ExtendedOpp extends FundOpportunity {
  askAmount: number;
  assignedTo: string;
  openedDate: string;
  tags: string[];
  history: { date: string; action: string; by: string }[];
  priority: 'high' | 'medium' | 'low';
  capacity?: string;
  connection?: string;
}

interface GrantOpportunity {
  id: string;
  funder: string;
  program: string;
  type: 'federal' | 'state' | 'local' | 'foundation' | 'corporate';
  amountMin: number;
  amountMax: number;
  deadline: string;
  eligibility: string;
  fitScore: number;
  summary: string;
  url: string;
  tags: string[];
  status: 'new' | 'reviewing' | 'applying' | 'submitted' | 'awarded' | 'declined';
  discoveredDate: string;
}

// ─── Stage Config ───────────────────────────────────────────────────────────

const STAGES: { key: FundStage; label: string; prob: number; color: string }[] = [
  { key: 'identification', label: 'Identification', prob: 0.05, color: '#94A3B8' },
  { key: 'qualification',  label: 'Qualification',  prob: 0.15, color: '#60A5FA' },
  { key: 'cultivation',    label: 'Cultivation',    prob: 0.35, color: '#A78BFA' },
  { key: 'solicitation',   label: 'Solicitation',   prob: 0.60, color: '#F59E0B' },
  { key: 'negotiation',    label: 'Negotiation',    prob: 0.80, color: '#F97316' },
  { key: 'closed',         label: 'Closed Won',     prob: 1.00, color: statusColor.green },
];

const TYPE_LABELS: Record<string, string> = {
  Foundation: 'Foundation Grant',
  Government: 'Government Grant',
  Individual: 'Major Gift',
  Corporate: 'Corporate',
  Event: 'Event Revenue',
};

const GRANT_TYPE_LABELS: Record<string, string> = {
  federal: 'Federal', state: 'State', local: 'Local/City', foundation: 'Foundation', corporate: 'Corporate',
};

const GRANT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: 'New',       color: statusColor.blue,  bg: `${statusColor.blue}10` },
  reviewing: { label: 'Reviewing', color: statusColor.amber, bg: `${statusColor.amber}10` },
  applying:  { label: 'Applying',  color: '#7C3AED',         bg: '#F5F3FF' },
  submitted: { label: 'Submitted', color: '#0F766E',         bg: '#F0FDFA' },
  awarded:   { label: 'Awarded',   color: statusColor.green, bg: `${statusColor.green}10` },
  declined:  { label: 'Declined',  color: statusColor.red,   bg: `${statusColor.red}10` },
};

// ─── Rich Seed Data ─────────────────────────────────────────────────────────

const SEED_OPPS: ExtendedOpp[] = [
  {
    id: 'F-001', funder: 'MacArthur Foundation', amount: 500000, stage: 'solicitation', probability: 0.60, weighted: 300000,
    type: 'Foundation', contact: 'Sarah Chen', nextAction: 'Submit full proposal', dueDate: '2026-03-29',
    notes: 'Strong relationship. Focus on safety innovation. Multi-year potential.',
    askAmount: 500000, assignedTo: 'Development Director', openedDate: '2025-09-15',
    tags: ['safety', 'innovation', 'multi-year'], history: [
      { date: '2025-09-15', action: 'Initial outreach via board connection', by: 'CEO' },
      { date: '2025-11-01', action: 'LOI submitted', by: 'Sara' },
      { date: '2026-01-15', action: 'Invited to submit full proposal', by: 'Sara' },
    ],
    priority: 'high', capacity: '$500K-$2M', connection: 'Board member James Thompson',
  },
  {
    id: 'F-002', funder: 'ISBE Innovation Grant', amount: 350000, stage: 'solicitation', probability: 0.60, weighted: 210000,
    type: 'Government', contact: 'James Wright', nextAction: 'Submit application', dueDate: '2026-04-03',
    notes: 'Competitive. Emphasize data-driven approach and college persistence outcomes.',
    askAmount: 350000, assignedTo: 'Grants Manager', openedDate: '2025-12-01',
    tags: ['state', 'innovation', 'data-driven'], history: [
      { date: '2025-12-01', action: 'RFP released', by: 'System' },
      { date: '2026-02-15', action: 'Intent to apply submitted', by: 'James' },
    ],
    priority: 'high', capacity: 'Up to $500K',
  },
  {
    id: 'F-003', funder: 'Walton Family Foundation', amount: 1000000, stage: 'cultivation', probability: 0.35, weighted: 350000,
    type: 'Foundation', contact: 'Maria Lopez', nextAction: 'Site visit scheduled', dueDate: '2026-04-15',
    notes: 'Multi-year potential. Interested in network model and replication strategy.',
    askAmount: 1000000, assignedTo: 'CEO', openedDate: '2025-08-01',
    tags: ['replication', 'network model', 'multi-year'], history: [
      { date: '2025-08-01', action: 'Introduced at NACSA conference', by: 'CEO' },
      { date: '2025-10-15', action: 'Follow-up call with program officer', by: 'CEO' },
      { date: '2026-02-01', action: 'Concept paper submitted', by: 'Sara' },
      { date: '2026-03-10', action: 'Site visit confirmed for April', by: 'Maria' },
    ],
    priority: 'high', capacity: '$1M-$5M', connection: 'NACSA conference introduction',
  },
  {
    id: 'F-004', funder: 'Chicago Community Trust', amount: 250000, stage: 'negotiation', probability: 0.80, weighted: 200000,
    type: 'Foundation', contact: 'David Kim', nextAction: 'Final terms review', dueDate: '2026-03-25',
    notes: 'Near close. Annual renewal. Strong track record.',
    askAmount: 250000, assignedTo: 'Development Director', openedDate: '2025-11-01',
    tags: ['annual', 'renewal', 'community'], history: [
      { date: '2025-11-01', action: 'Renewal application submitted', by: 'Sara' },
      { date: '2026-02-20', action: 'Approved pending final terms', by: 'David' },
    ],
    priority: 'medium', capacity: '$100K-$500K', connection: 'Long-standing relationship',
  },
  {
    id: 'F-005', funder: 'Individual Major Gift — Thompson', amount: 100000, stage: 'solicitation', probability: 0.60, weighted: 60000,
    type: 'Individual', contact: 'Robert Thompson', nextAction: 'Dinner meeting', dueDate: '2026-04-10',
    notes: 'Board member referral. First-time donor. Interested in college persistence.',
    askAmount: 100000, assignedTo: 'CEO', openedDate: '2026-01-05',
    tags: ['individual', 'first-time', 'college persistence'], history: [
      { date: '2026-01-05', action: 'Board member introduction', by: 'James T.' },
      { date: '2026-02-10', action: 'Coffee meeting — expressed interest', by: 'CEO' },
    ],
    priority: 'medium', capacity: '$50K-$250K', connection: 'Board member James Thompson',
  },
  {
    id: 'F-006', funder: 'Federal CSP Replication Grant', amount: 2000000, stage: 'qualification', probability: 0.15, weighted: 300000,
    type: 'Government', contact: 'DOE Program Office', nextAction: 'Intent to apply', dueDate: '2026-05-01',
    notes: 'High value, competitive. 18-month timeline. Requires expansion plan.',
    askAmount: 2000000, assignedTo: 'Grants Manager', openedDate: '2026-01-15',
    tags: ['federal', 'CSP', 'replication', 'expansion'], history: [
      { date: '2026-01-15', action: 'NOFO released', by: 'System' },
      { date: '2026-02-28', action: 'Internal feasibility review completed', by: 'CFO' },
    ],
    priority: 'high', capacity: '$1M-$3M',
  },
  {
    id: 'F-007', funder: 'Crown Family Philanthropies', amount: 750000, stage: 'cultivation', probability: 0.35, weighted: 262500,
    type: 'Foundation', contact: 'Lisa Park', nextAction: 'Concept paper', dueDate: '2026-04-20',
    notes: 'Interested in college persistence outcomes. Data-driven approach resonates.',
    askAmount: 750000, assignedTo: 'Development Director', openedDate: '2025-10-01',
    tags: ['college persistence', 'outcomes', 'data'], history: [
      { date: '2025-10-01', action: 'Initial inquiry via website', by: 'Sara' },
      { date: '2025-12-15', action: 'Introductory meeting', by: 'CEO, Sara' },
      { date: '2026-03-01', action: 'Invited to submit concept paper', by: 'Lisa' },
    ],
    priority: 'high', capacity: '$500K-$2M', connection: 'Proactive outreach',
  },
  {
    id: 'F-008', funder: 'Annual Gala (Net Revenue)', amount: 800000, stage: 'negotiation', probability: 0.80, weighted: 640000,
    type: 'Event', contact: 'Development Team', nextAction: 'Confirm sponsors', dueDate: '2026-05-15',
    notes: 'On track. 85% of sponsorships confirmed. Table sales strong.',
    askAmount: 1000000, assignedTo: 'Events Manager', openedDate: '2025-07-01',
    tags: ['event', 'gala', 'annual'], history: [
      { date: '2025-07-01', action: 'Planning committee formed', by: 'Events' },
      { date: '2025-11-01', action: 'Save the date sent', by: 'Events' },
      { date: '2026-02-01', action: 'Sponsorship deck distributed', by: 'Events' },
      { date: '2026-03-15', action: '85% sponsorships confirmed', by: 'Events' },
    ],
    priority: 'medium',
  },
];

const SEED_GRANTS: GrantOpportunity[] = [
  { id: 'G-001', funder: 'U.S. Department of Education', program: 'Charter School Program — Replication & Expansion', type: 'federal', amountMin: 1000000, amountMax: 3000000, deadline: '2026-06-15', eligibility: 'High-performing charter networks with 3+ years of data', fitScore: 7, summary: 'Federal CSP grant for replication of high-performing charter models. Requires expansion plan and evidence of student outcomes.', url: 'https://oese.ed.gov/csp', tags: ['CSP', 'replication', 'expansion'], status: 'reviewing', discoveredDate: '2026-01-15' },
  { id: 'G-002', funder: 'Bill & Melinda Gates Foundation', program: 'Networks for School Improvement', type: 'foundation', amountMin: 500000, amountMax: 2000000, deadline: '2026-05-01', eligibility: 'Charter networks serving high-poverty communities with evidence of improvement', fitScore: 8, summary: 'Multi-year grant supporting continuous improvement networks. Focus on instructional practice and data use.', url: 'https://gatesfoundation.org', tags: ['improvement', 'instruction', 'data'], status: 'new', discoveredDate: '2026-03-01' },
  { id: 'G-003', funder: 'Illinois State Board of Education', program: 'Innovation & Improvement Grant', type: 'state', amountMin: 100000, amountMax: 500000, deadline: '2026-04-15', eligibility: 'Illinois schools with innovative programs serving underserved populations', fitScore: 9, summary: 'State grant for innovative educational approaches. Strong fit for data-driven charter models.', url: 'https://isbe.net', tags: ['state', 'innovation', 'underserved'], status: 'applying', discoveredDate: '2025-12-01' },
  { id: 'G-004', funder: 'Chicago Community Foundation', program: 'Youth Development Initiative', type: 'local', amountMin: 50000, amountMax: 200000, deadline: '2026-07-01', eligibility: 'Chicago-based organizations serving youth ages 14-24', fitScore: 8, summary: 'Local foundation supporting youth development programs in Chicago. Emphasis on college and career readiness.', url: 'https://chicagocf.org', tags: ['youth', 'college readiness', 'Chicago'], status: 'new', discoveredDate: '2026-03-10' },
  { id: 'G-005', funder: 'Bezos Family Foundation', program: 'Student-Centered Learning', type: 'foundation', amountMin: 250000, amountMax: 1000000, deadline: '2026-08-01', eligibility: 'Schools implementing personalized learning models', fitScore: 6, summary: 'Foundation grant for personalized and student-centered learning approaches. Requires evidence of implementation.', url: 'https://bezosfamilyfoundation.org', tags: ['personalized learning', 'student-centered'], status: 'new', discoveredDate: '2026-03-15' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function fitColor(score: number): string {
  return score >= 8 ? statusColor.green : score >= 5 ? statusColor.amber : statusColor.red;
}

const priorityColor = (p: string) => p === 'high' ? statusColor.red : p === 'medium' ? statusColor.amber : textColor.muted;

// ─── Pipeline Funnel ────────────────────────────────────────────────────────

function PipelineFunnel({ pipeline }: { pipeline: ExtendedOpp[] }) {
  const stageCounts = STAGES.map(s => ({
    ...s,
    count: pipeline.filter(p => p.stage === s.key).length,
    total: pipeline.filter(p => p.stage === s.key).reduce((sum, p) => sum + p.amount, 0),
    weighted: pipeline.filter(p => p.stage === s.key).reduce((sum, p) => sum + p.weighted, 0),
  }));
  const maxTotal = Math.max(...stageCounts.map(s => s.total), 1);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Pipeline Funnel
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stageCounts.map(s => {
          const pct = Math.max((s.total / maxTotal) * 100, 6);
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 90, fontSize: fontSize.xs, color: textColor.muted, textAlign: 'right', flexShrink: 0 }}>{s.label}</div>
              <div style={{ flex: 1, height: 24, background: border.light, borderRadius: radius.sm, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: s.color, borderRadius: radius.sm,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 40,
                  transition: 'width 0.5s ease',
                }}>
                  <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#FFF', fontFamily: font.mono, whiteSpace: 'nowrap' }}>
                    {s.count > 0 ? fmtCompact(s.total) : ''}
                  </span>
                </div>
              </div>
              <div style={{ width: 30, fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: s.color, fontFamily: font.mono, textAlign: 'center' }}>{s.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Opportunity Card ───────────────────────────────────────────────────────

function OppCard({ opp, selected, onSelect }: { opp: ExtendedOpp; selected: boolean; onSelect: () => void }) {
  const stageInfo = STAGES.find(s => s.key === opp.stage);
  const days = daysUntil(opp.dueDate);
  const urgent = days <= 7;

  return (
    <div
      onClick={onSelect}
      style={{
        background: bg.card, borderRadius: radius.lg,
        border: `1px solid ${selected ? modColors.fund : border.light}`,
        borderLeft: `4px solid ${stageInfo?.color || border.light}`,
        padding: '14px 18px', cursor: 'pointer', marginBottom: 8,
        transition: transition.fast,
        boxShadow: selected ? `0 0 0 1px ${modColors.fund}40` : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = `${modColors.fund}60`; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = border.light; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: textColor.primary }}>{opp.funder}</div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{TYPE_LABELS[opp.type] || opp.type} · {opp.assignedTo}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold, fontFamily: font.mono, color: modColors.fund }}>{fmt(opp.amount)}</div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>wtd: {fmt(opp.weighted)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusBadge label={stageInfo?.label || opp.stage} variant={opp.stage === 'closed' ? 'green' : opp.stage === 'negotiation' ? 'amber' : 'blue'} size="sm" />
        <span style={{
          fontSize: fontSize.xs, padding: '1px 6px', borderRadius: radius.full,
          background: `${priorityColor(opp.priority)}10`, color: priorityColor(opp.priority),
          fontWeight: fontWeight.bold, textTransform: 'uppercase',
        }}>{opp.priority}</span>
        <span style={{
          fontSize: fontSize.xs, color: urgent ? statusColor.red : textColor.muted,
          fontWeight: urgent ? fontWeight.bold : fontWeight.medium,
        }}>
          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d to next action`}
        </span>
      </div>
      <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 6 }}>{opp.nextAction}</div>
    </div>
  );
}

// ─── Opportunity Detail Panel ───────────────────────────────────────────────

function OppDetail({ opp, onGenerate }: { opp: ExtendedOpp; onGenerate: (mode: string) => void }) {
  const stageInfo = STAGES.find(s => s.key === opp.stage);

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      padding: 20, position: 'sticky', top: 20, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{
          fontSize: fontSize.xs, padding: '2px 8px', borderRadius: radius.full,
          background: `${priorityColor(opp.priority)}10`, color: priorityColor(opp.priority),
          fontWeight: fontWeight.bold, textTransform: 'uppercase',
        }}>{opp.priority} priority</span>
        <StatusBadge label={stageInfo?.label || opp.stage} variant={opp.stage === 'closed' ? 'green' : 'blue'} size="sm" />
      </div>

      <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 4 }}>{opp.funder}</div>
      <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 14 }}>{TYPE_LABELS[opp.type] || opp.type} · {opp.assignedTo}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Ask Amount', value: fmtFull(opp.askAmount), color: textColor.primary },
          { label: 'Projected', value: fmtFull(opp.amount), color: modColors.fund },
          { label: 'Weighted', value: fmtFull(opp.weighted), color: textColor.muted },
          { label: 'Probability', value: fmtPct(opp.probability), color: opp.probability >= 0.6 ? statusColor.green : statusColor.amber },
          { label: 'Next Action', value: opp.nextAction, color: textColor.primary },
          { label: 'Due Date', value: opp.dueDate, color: daysUntil(opp.dueDate) <= 7 ? statusColor.red : textColor.muted },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: fontSize.sm, color: f.color, fontWeight: fontWeight.semibold }}>{f.value}</div>
          </div>
        ))}
      </div>

      {opp.connection && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>Connection</div>
          <div style={{ fontSize: fontSize.sm, color: textColor.primary }}>{opp.connection}</div>
        </div>
      )}

      {opp.capacity && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>Estimated Capacity</div>
          <div style={{ fontSize: fontSize.sm, color: textColor.primary }}>{opp.capacity}</div>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>Notes</div>
        <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6 }}>{opp.notes}</div>
      </div>

      {opp.tags.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {opp.tags.map(t => (
              <span key={t} style={{
                fontSize: fontSize.xs, padding: '2px 8px', borderRadius: radius.full,
                background: bg.subtle, color: textColor.muted, border: `1px solid ${border.light}`,
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Activity History */}
      {opp.history.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Activity History</div>
          <div style={{ borderLeft: `2px solid ${border.light}`, paddingLeft: 12 }}>
            {opp.history.map((h, i) => (
              <div key={i} style={{ marginBottom: 8, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: -17, top: 4, width: 8, height: 8,
                  borderRadius: '50%', background: i === opp.history.length - 1 ? modColors.fund : border.light,
                }} />
                <div style={{ fontSize: fontSize.xs, color: textColor.muted, fontFamily: font.mono }}>{h.date}</div>
                <div style={{ fontSize: fontSize.xs, color: textColor.secondary }}>{h.action}</div>
                <div style={{ fontSize: fontSize.xs, color: textColor.light }}>{h.by}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Actions */}
      <div style={{ borderTop: `1px solid ${border.light}`, paddingTop: 14 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>AI Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => onGenerate('meeting_brief')} style={{
            padding: '10px 14px', borderRadius: radius.md, background: brand.navy, color: brand.brass,
            fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: `1.5px solid ${brand.brass}`,
            cursor: 'pointer', textAlign: 'left', letterSpacing: '0.02em',
          }}>
            Pre-Meeting Intelligence Brief
          </button>
          <button onClick={() => onGenerate('solicitation')} style={{
            padding: '9px 14px', borderRadius: radius.md, background: modColors.fund, color: '#FFF',
            fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: 'none', cursor: 'pointer', textAlign: 'left',
          }}>
            Draft Solicitation Letter
          </button>
          <button onClick={() => onGenerate('stewardship')} style={{
            padding: '9px 14px', borderRadius: radius.md, background: bg.card, color: textColor.primary,
            fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: `1px solid ${border.light}`,
            cursor: 'pointer', textAlign: 'left',
          }}>
            Draft Stewardship Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUND APP
// ═══════════════════════════════════════════════════════════════════════════

export default function FundApp() {
  const fund = useFundraising();
  const network = useNetwork();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'sourcer' | 'stewardship'>('pipeline');
  const [opps] = useState<ExtendedOpp[]>(SEED_OPPS);
  const [grants, setGrants] = useState<GrantOpportunity[]>(SEED_GRANTS);

  // Pipeline state
  const [selectedOpp, setSelectedOpp] = useState<ExtendedOpp | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');

  // Grant Sourcer state
  const [selectedGrant, setSelectedGrant] = useState<GrantOpportunity | null>(null);
  const [grantTypeFilter, setGrantTypeFilter] = useState<string>('all');
  const [grantStatusFilter, setGrantStatusFilter] = useState<string>('all');
  const [scanning, setScanning] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // AI draft state
  const [draft, setDraft] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);

  const GOAL = fund.goal || 10000000;
  const closedYTD = fund.closedYTD || 1850000;
  const totalPipeline = opps.reduce((s, o) => s + o.amount, 0);
  const totalWeighted = opps.reduce((s, o) => s + o.weighted, 0);
  const pctToGoal = closedYTD / GOAL;
  const overdue = opps.filter(o => daysUntil(o.dueDate) < 0 && o.stage !== 'closed');

  const filteredOpps = useMemo(() => {
    return opps
      .filter(o => stageFilter === 'all' || o.stage === stageFilter)
      .filter(o => typeFilter === 'all' || o.type === typeFilter)
      .sort((a, b) => {
        if (sortBy === 'dueDate') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (sortBy === 'amount') return b.amount - a.amount;
        if (sortBy === 'weighted') return b.weighted - a.weighted;
        return 0;
      });
  }, [opps, stageFilter, typeFilter, sortBy]);

  const filteredGrants = useMemo(() => {
    return grants
      .filter(g => grantTypeFilter === 'all' || g.type === grantTypeFilter)
      .filter(g => grantStatusFilter === 'all' || g.status === grantStatusFilter)
      .sort((a, b) => b.fitScore - a.fitScore);
  }, [grants, grantTypeFilter, grantStatusFilter]);

  // Generate AI draft for opportunity
  const generateOppDraft = async (mode: string) => {
    if (!selectedOpp) return;
    setDraftLoading(true);
    setDraft('');
    const opp = selectedOpp;

    try {
      let prompt = '';
      let systemMsg = AI_CONFIG.systemPrompt;

      if (mode === 'meeting_brief') {
        systemMsg = 'You are an elite development strategist with deep knowledge of major foundation priorities, corporate giving programs, and high-net-worth donor psychology. You have researched thousands of funders and know what makes each one tick.';
        prompt = `You are preparing a Pre-Meeting Intelligence Brief for a development director at ${network.name} who is about to meet with ${opp.funder}.

DONOR PROFILE FROM CRM:
- Name: ${opp.funder}
- Type: ${TYPE_LABELS[opp.type] || opp.type}
- Ask Amount: ${fmtFull(opp.askAmount)}
- Stage: ${opp.stage}
- Connection: ${opp.connection ?? 'None noted'}
- Notes: ${opp.notes}
- Tags: ${opp.tags.join(', ')}
- Capacity: ${opp.capacity ?? 'Unknown'}

NETWORK DATA:
- Network: ${network.name}, ${network.campusCount} campuses, Chicago
- Student outcomes: 98%+ college acceptance rate, predominantly first-generation college students
- Neighborhoods served: South Side and West Side Chicago

Using your knowledge of this funder and their publicly known priorities, generate a Pre-Meeting Intelligence Brief with these exact sections:

**WHO THEY ARE**
2-3 sentences on this funder — their mission, what they care about most, their giving philosophy.

**WHY THIS MEETING MATTERS**
1-2 sentences on why this is a high-value relationship for ${network.name} right now.

**WHAT THEY CARE ABOUT — CONNECTED TO ${network.name.toUpperCase()}**
3-4 specific connections between this funder's known priorities and ${network.name}'s actual work and outcomes.

**YOUR ASK**
One paragraph: the specific ask of ${fmtFull(opp.askAmount)}, what it funds, why now, and the case for why this amount is right.

**QUESTIONS THEY WILL ASK**
3 questions this funder is likely to ask, with a one-sentence answer to each.

**THINGS TO AVOID**
2 things NOT to say or do in this meeting based on this funder's known sensitivities.

**YOUR OPENING LINE**
One sentence — the ideal way to open the meeting.

Write this as a professional briefing document. Specific, confident, actionable. No generic nonprofit language.`;
      } else if (mode === 'solicitation') {
        prompt = `Draft a professional solicitation letter to ${opp.funder} on behalf of ${network.name} (${network.campusCount} campuses, Chicago).

Ask Amount: ${fmtFull(opp.askAmount)}
Type: ${TYPE_LABELS[opp.type] || opp.type}
Notes: ${opp.notes}
Tags: ${opp.tags.join(', ')}

Include: compelling opening, 3-4 paragraphs connecting their priorities to our work, specific ask with impact statement, and professional closing. Be specific about student outcomes and community impact. No generic language.`;
      } else {
        prompt = `Draft a stewardship report for ${opp.funder} on behalf of ${network.name} (${network.campusCount} campuses, Chicago).

Gift Amount: ${fmtFull(opp.amount)}
Type: ${TYPE_LABELS[opp.type] || opp.type}
Notes: ${opp.notes}

Include: thank you, impact summary with specific metrics, student stories (create realistic examples), financial stewardship statement, and forward-looking vision. Professional but warm tone.`;
      }

      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 1500,
          system: systemMsg,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const j = await res.json();
      setDraft(j.content?.find((b: any) => b.type === 'text')?.text || 'Unable to generate.');
    } catch {
      setDraft('Generation unavailable. Check API configuration.');
    } finally {
      setDraftLoading(false);
    }
  };

  // AI Grant Scan
  const scanGrants = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 2048,
          system: 'You are a grants research specialist. Return ONLY valid JSON arrays.',
          messages: [{
            role: 'user',
            content: `Identify 3 real grant opportunities for ${network.name}, a high-performing Chicago charter school network with ${network.campusCount} campuses serving predominantly low-income students.

Return a JSON array with objects having these fields:
- funder (string)
- program (string)
- type (one of: federal, state, local, foundation, corporate)
- amountMin (number)
- amountMax (number)
- deadline (string, YYYY-MM-DD format, within next 12 months)
- eligibility (string, one sentence)
- fitScore (number 1-10)
- summary (string, 2-3 sentences)
- url (string)
- tags (string array)

Focus on grants that are a strong fit for urban charter school networks with strong outcomes data. Return ONLY the JSON array, no other text.`,
          }],
        }),
      });
      const j = await res.json();
      const txt = j.content?.find((b: any) => b.type === 'text')?.text || '[]';
      const match = txt.match(/\[[\s\S]*\]/);
      if (match) {
        const newGrants: GrantOpportunity[] = JSON.parse(match[0]).map((g: any, i: number) => ({
          ...g,
          id: `G-AI-${Date.now()}-${i}`,
          status: 'new' as const,
          discoveredDate: new Date().toISOString().split('T')[0],
        }));
        setGrants(prev => [...prev, ...newGrants]);
      }
    } catch (e) {
      console.error('Grant scan error:', e);
    } finally {
      setScanning(false);
    }
  };

  // AI Grant Fit Analysis
  const analyzeGrant = async (grant: GrantOpportunity) => {
    setAnalysisLoading(true);
    setAiAnalysis('');
    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 1000,
          system: AI_CONFIG.systemPrompt,
          messages: [{
            role: 'user',
            content: `Analyze this grant opportunity for ${network.name}, a premier public charter network. ${network.campusCount} campuses, Chicago, 98% college acceptance, predominantly low-income and first-generation.

Grant: ${grant.funder} — ${grant.program}
Amount: ${fmt(grant.amountMin)}–${fmt(grant.amountMax)}
Deadline: ${grant.deadline}
Eligibility: ${grant.eligibility}
Summary: ${grant.summary}

Provide: (1) Application fit analysis — what's strong, what's a risk, (2) the single strongest argument we can make in 2–3 sentences, (3) application timeline — what needs to happen and when, (4) who should be the application lead, (5) likelihood score 1–10 with rationale. Be specific and direct. Under 300 words.`,
          }],
        }),
      });
      const j = await res.json();
      setAiAnalysis(j.content?.find((b: any) => b.type === 'text')?.text || 'Analysis unavailable.');
    } catch {
      setAiAnalysis('Analysis unavailable.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const tabs = [
    { id: 'pipeline' as const, label: 'Pipeline', icon: '◉' },
    { id: 'sourcer' as const, label: 'Grant Sourcer', icon: '◈' },
    { id: 'stewardship' as const, label: 'Stewardship', icon: '▤' },
  ];

  return (
    <div>
      <ModuleHeader
        title="Fund"
        subtitle="Philanthropic Intelligence"
        accent={modColors.fund}
        freshness={{ lastUpdated: fund.lastUpdated, source: fund.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'CLOSED YTD', value: fmtCompact(closedYTD), sub: `${fmtPct(pctToGoal)} of ${fmtCompact(GOAL)} goal`, color: statusColor.green },
          { label: 'PIPELINE', value: fmtCompact(totalPipeline), sub: `${opps.length} opportunities`, color: modColors.fund },
          { label: 'WEIGHTED', value: fmtCompact(totalWeighted), sub: 'Probability-adjusted', color: statusColor.blue },
          { label: 'GAP TO GOAL', value: fmtCompact(Math.max(GOAL - closedYTD - totalWeighted, 0)), sub: closedYTD + totalWeighted >= GOAL ? 'On track' : 'Needs attention', color: closedYTD + totalWeighted >= GOAL ? statusColor.green : statusColor.amber },
          { label: 'OVERDUE', value: overdue.length.toString(), sub: overdue.length > 0 ? 'Actions past due' : 'All current', color: overdue.length > 0 ? statusColor.red : statusColor.green },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
            borderTop: `3px solid ${kpi.color}`, padding: '16px 18px', boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 6 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Goal Progress Bar */}
      <div style={{
        background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
        padding: '14px 20px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase' }}>FY26 Goal Progress</span>
          <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: modColors.fund, fontFamily: font.mono }}>{fmt(closedYTD)} / {fmt(GOAL)}</span>
        </div>
        <div style={{ height: 12, background: border.light, borderRadius: radius.full, overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: `${Math.min(pctToGoal * 100, 100)}%`, height: '100%', background: statusColor.green, borderRadius: radius.full, transition: 'width 0.5s ease' }} />
          <div style={{
            position: 'absolute', left: `${Math.min((closedYTD + totalWeighted) / GOAL * 100, 100)}%`, top: 0, height: '100%',
            width: 2, background: modColors.fund, opacity: 0.6,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: fontSize.xs, color: statusColor.green }}>Closed: {fmtPct(pctToGoal)}</span>
          <span style={{ fontSize: fontSize.xs, color: modColors.fund }}>+ Weighted: {fmtPct((closedYTD + totalWeighted) / GOAL)}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: 2, background: bg.card,
        borderRadius: `${radius.lg} ${radius.lg} 0 0`,
        border: `1px solid ${border.light}`, borderBottom: 'none', padding: '0 8px',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '14px 24px', border: 'none', cursor: 'pointer',
              fontSize: fontSize.sm,
              fontWeight: activeTab === t.id ? fontWeight.bold : fontWeight.medium,
              color: activeTab === t.id ? modColors.fund : textColor.muted,
              background: 'transparent',
              borderBottom: `2px solid ${activeTab === t.id ? modColors.fund : 'transparent'}`,
              transition: transition.fast,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: '14px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: bg.card, border: `1px solid ${border.light}`,
        borderRadius: `0 0 ${radius.lg} ${radius.lg}`,
        padding: 24, minHeight: 400,
      }}>
        {/* ─── PIPELINE ──────────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <div>
            <PipelineFunnel pipeline={opps} />

            {/* Filters */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
              padding: '10px 14px', background: bg.subtle, borderRadius: radius.md,
            }}>
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{
                padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${border.light}`,
                fontSize: fontSize.xs, background: bg.card, color: textColor.primary,
              }}>
                <option value="all">All Stages</option>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
                padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${border.light}`,
                fontSize: fontSize.xs, background: bg.card, color: textColor.primary,
              }}>
                <option value="all">All Types</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${border.light}`,
                fontSize: fontSize.xs, background: bg.card, color: textColor.primary, marginLeft: 'auto',
              }}>
                <option value="dueDate">Sort: Due Date</option>
                <option value="amount">Sort: Amount</option>
                <option value="weighted">Sort: Weighted</option>
              </select>
            </div>

            {/* Opps + Detail */}
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {filteredOpps.map(o => (
                  <OppCard key={o.id} opp={o} selected={selectedOpp?.id === o.id} onSelect={() => { setSelectedOpp(o); setDraft(''); }} />
                ))}
                {filteredOpps.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: textColor.muted, fontSize: fontSize.sm }}>
                    No opportunities match your filters.
                  </div>
                )}
              </div>
              <div style={{ width: 340, flexShrink: 0 }}>
                {selectedOpp ? (
                  <>
                    <OppDetail opp={selectedOpp} onGenerate={generateOppDraft} />
                    {/* AI Draft Output */}
                    {(draftLoading || draft) && (
                      <div style={{
                        background: bg.subtle, borderRadius: radius.lg, border: `1px solid ${border.light}`,
                        padding: 16, marginTop: 12,
                      }}>
                        {draftLoading ? (
                          <div style={{ textAlign: 'center', padding: 20, color: textColor.muted, fontSize: fontSize.sm, fontStyle: 'italic' }}>
                            Generating intelligence brief...
                          </div>
                        ) : (
                          <>
                            <textarea
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              rows={14}
                              style={{
                                width: '100%', padding: 10, borderRadius: radius.md,
                                border: `1px solid ${border.light}`, fontSize: fontSize.xs,
                                lineHeight: 1.7, resize: 'vertical', fontFamily: font.body,
                                boxSizing: 'border-box',
                              }}
                            />
                            <button
                              onClick={() => navigator.clipboard?.writeText(draft)}
                              style={{
                                marginTop: 8, padding: '7px 14px', borderRadius: radius.md,
                                background: brand.navy, color: '#FFF',
                                fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: 'none', cursor: 'pointer',
                              }}
                            >
                              Copy
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    background: bg.subtle, borderRadius: radius.lg, padding: 40, textAlign: 'center', color: textColor.muted,
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: 8, opacity: 0.5 }}>◇</div>
                    <div style={{ fontSize: fontSize.sm }}>Select an opportunity to see<br />full details and AI actions</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── GRANT SOURCER ─────────────────────────────────────── */}
        {activeTab === 'sourcer' && (
          <div>
            {/* Toolbar */}
            <div style={{
              background: bg.subtle, border: `1px solid ${border.light}`, borderRadius: radius.md,
              padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <select value={grantTypeFilter} onChange={e => setGrantTypeFilter(e.target.value)} style={{
                padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${border.light}`,
                fontSize: fontSize.xs, background: bg.card,
              }}>
                <option value="all">All Types</option>
                {Object.entries(GRANT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={grantStatusFilter} onChange={e => setGrantStatusFilter(e.target.value)} style={{
                padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${border.light}`,
                fontSize: fontSize.xs, background: bg.card,
              }}>
                <option value="all">All Statuses</option>
                {Object.entries(GRANT_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: fontSize.xs, color: textColor.light }}>{grants.length} grants tracked</span>
                <button onClick={scanGrants} disabled={scanning} style={{
                  padding: '7px 16px', borderRadius: radius.md,
                  background: scanning ? bg.card : '#7C3AED', color: scanning ? textColor.muted : '#FFF',
                  fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: 'none',
                  cursor: scanning ? 'not-allowed' : 'pointer',
                }}>
                  {scanning ? 'Scanning...' : 'AI Grant Scan'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
              {/* Left: grants list */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {filteredGrants.map(g => {
                  const sc = GRANT_STATUS_CONFIG[g.status];
                  return (
                    <div
                      key={g.id}
                      onClick={() => { setSelectedGrant(g); setAiAnalysis(''); }}
                      style={{
                        background: bg.card, borderRadius: radius.lg,
                        border: `1px solid ${selectedGrant?.id === g.id ? '#7C3AED' : border.light}`,
                        padding: '14px 18px', cursor: 'pointer', marginBottom: 8,
                        transition: transition.fast,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: textColor.primary }}>{g.funder}</div>
                          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{g.program}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <span style={{
                            fontSize: fontSize.xs, padding: '2px 6px', borderRadius: radius.full,
                            background: sc?.bg, color: sc?.color, fontWeight: fontWeight.bold,
                          }}>{sc?.label}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, fontFamily: font.mono, color: textColor.primary }}>
                          {fmt(g.amountMin)}–{fmt(g.amountMax)}
                        </span>
                        <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Deadline: {g.deadline}</span>
                        <span style={{
                          fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                          color: fitColor(g.fitScore), fontFamily: font.mono,
                        }}>Fit: {g.fitScore}/10</span>
                      </div>
                    </div>
                  );
                })}
                {filteredGrants.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: textColor.muted }}>
                    <div style={{ fontSize: '28px', marginBottom: 8, opacity: 0.5 }}>◈</div>
                    <div style={{ fontSize: fontSize.sm }}>No grants match your filters.<br />Run an AI Grant Scan to discover new opportunities.</div>
                  </div>
                )}
              </div>

              {/* Right: grant detail */}
              <div style={{ width: 340, flexShrink: 0 }}>
                {selectedGrant ? (
                  <div style={{
                    background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
                    padding: 20, position: 'sticky', top: 20,
                  }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span style={{
                        fontSize: fontSize.xs, padding: '2px 8px', borderRadius: radius.full,
                        background: bg.subtle, color: textColor.muted, border: `1px solid ${border.light}`,
                      }}>{GRANT_TYPE_LABELS[selectedGrant.type]}</span>
                      <span style={{
                        fontSize: fontSize.xs, padding: '2px 8px', borderRadius: radius.full,
                        background: GRANT_STATUS_CONFIG[selectedGrant.status]?.bg,
                        color: GRANT_STATUS_CONFIG[selectedGrant.status]?.color,
                        fontWeight: fontWeight.bold,
                      }}>{GRANT_STATUS_CONFIG[selectedGrant.status]?.label}</span>
                    </div>
                    <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 4 }}>{selectedGrant.funder}</div>
                    <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 14 }}>{selectedGrant.program}</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      {[
                        { label: 'Fit Score', value: `${selectedGrant.fitScore}/10`, color: fitColor(selectedGrant.fitScore) },
                        { label: 'Amount Range', value: `${fmt(selectedGrant.amountMin)}–${fmt(selectedGrant.amountMax)}`, color: textColor.primary },
                        { label: 'Deadline', value: selectedGrant.deadline, color: daysUntil(selectedGrant.deadline) <= 30 ? statusColor.amber : textColor.muted },
                        { label: 'Discovered', value: selectedGrant.discoveredDate, color: textColor.muted },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>{f.label}</div>
                          <div style={{ fontSize: fontSize.sm, color: f.color, fontWeight: fontWeight.semibold }}>{f.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>Eligibility</div>
                      <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6 }}>{selectedGrant.eligibility}</div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>Summary</div>
                      <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6 }}>{selectedGrant.summary}</div>
                    </div>

                    <button
                      onClick={() => analyzeGrant(selectedGrant)}
                      disabled={analysisLoading}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: radius.md,
                        background: analysisLoading ? bg.subtle : '#7C3AED', color: analysisLoading ? textColor.muted : '#FFF',
                        fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: 'none',
                        cursor: analysisLoading ? 'not-allowed' : 'pointer', marginBottom: 12,
                      }}
                    >
                      {analysisLoading ? 'Analyzing...' : 'AI Fit Analysis & Application Plan'}
                    </button>

                    {aiAnalysis && (
                      <div style={{
                        background: bg.subtle, borderRadius: radius.md, padding: 14,
                        fontSize: fontSize.xs, color: textColor.secondary, lineHeight: 1.8,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {aiAnalysis}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    background: bg.subtle, borderRadius: radius.lg, padding: 40, textAlign: 'center', color: textColor.muted,
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: 8, opacity: 0.5 }}>◈</div>
                    <div style={{ fontSize: fontSize.sm }}>Select a grant to see<br />details and AI analysis</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEWARDSHIP ───────────────────────────────────────── */}
        {activeTab === 'stewardship' && (
          <div>
            {/* Overdue Actions */}
            {overdue.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: statusColor.red,
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  Overdue Actions ({overdue.length})
                </div>
                {overdue.map(o => (
                  <div key={o.id} style={{
                    background: `${statusColor.red}04`, border: `1px solid ${statusColor.red}20`,
                    borderRadius: radius.md, padding: '12px 16px', marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: textColor.primary }}>{o.funder}</div>
                        <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{o.nextAction}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: statusColor.red }}>{Math.abs(daysUntil(o.dueDate))}d overdue</div>
                        <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{fmt(o.amount)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Actions */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Upcoming Stewardship Actions
              </div>
              {opps.filter(o => daysUntil(o.dueDate) >= 0 && o.stage !== 'closed').length === 0 ? (
                <div style={{ background: bg.subtle, borderRadius: radius.md, padding: 24, textAlign: 'center', color: textColor.muted, fontSize: fontSize.sm }}>
                  No upcoming actions scheduled.
                </div>
              ) : (
                <div style={{ background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg, overflow: 'hidden' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px',
                    padding: '10px 18px', background: bg.subtle, borderBottom: `1px solid ${border.light}`,
                    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase',
                  }}>
                    <div>Due Date</div><div>Funder</div><div>Next Action</div><div style={{ textAlign: 'right' }}>Amount</div>
                  </div>
                  {opps
                    .filter(o => daysUntil(o.dueDate) >= 0 && o.stage !== 'closed')
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((o, i) => (
                      <div key={o.id} style={{
                        display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px',
                        padding: '14px 18px', borderBottom: `1px solid ${border.light}`,
                        background: i % 2 === 0 ? bg.card : bg.subtle, alignItems: 'center',
                      }}>
                        <div style={{
                          fontSize: fontSize.xs, fontWeight: fontWeight.bold, fontFamily: font.mono,
                          color: daysUntil(o.dueDate) <= 14 ? statusColor.amber : textColor.muted,
                        }}>{o.dueDate}</div>
                        <div>
                          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: textColor.primary }}>{o.funder}</div>
                          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{o.assignedTo}</div>
                        </div>
                        <div style={{ fontSize: fontSize.xs, color: textColor.secondary }}>{o.nextAction}</div>
                        <div style={{ textAlign: 'right', fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: modColors.fund, fontFamily: font.mono }}>{fmt(o.amount)}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Closed Gifts Log */}
            <div>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Closed Gifts & Grants — FY26
              </div>
              <div style={{
                background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg, overflow: 'hidden',
              }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 130px',
                  padding: '10px 18px', background: bg.subtle, borderBottom: `1px solid ${border.light}`,
                  fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase',
                }}>
                  <div>Donor / Funder</div><div>Type</div><div style={{ textAlign: 'right' }}>Amount</div>
                </div>
                <div style={{ padding: '20px 18px', textAlign: 'center', color: textColor.muted, fontSize: fontSize.sm }}>
                  Closed YTD: <span style={{ fontWeight: fontWeight.bold, color: statusColor.green, fontFamily: font.mono }}>{fmtFull(closedYTD)}</span>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 130px',
                  padding: '10px 18px', borderTop: `2px solid ${border.light}`,
                  background: `${statusColor.green}06`,
                }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: statusColor.green }}>Total Closed YTD</div>
                  <div />
                  <div style={{ textAlign: 'right', fontSize: fontSize.base, fontWeight: fontWeight.bold, color: statusColor.green, fontFamily: font.mono }}>{fmtFull(closedYTD)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        textAlign: 'center', padding: '16px 0', fontSize: fontSize.xs, color: textColor.light, marginTop: 16,
      }}>
        {opps.length} opportunities · {fmtCompact(totalPipeline)} pipeline · {grants.length} grants tracked · Fund Intelligence
      </div>
    </div>
  );
}
