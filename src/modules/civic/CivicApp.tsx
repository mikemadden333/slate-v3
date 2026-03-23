/**
 * Slate v3 — Civic
 * ═══════════════════════════════════════════════════════════════════
 * PUBLIC AFFAIRS & LEGISLATIVE INTELLIGENCE
 *
 * Civic is the government relations and advocacy intelligence engine.
 * It tracks legislation at federal, state, and local levels, manages
 * stakeholder relationships, provides an AI-powered Action Center
 * for drafting testimony and communications, and maintains a full
 * advocacy history log.
 *
 * KEY CAPABILITIES:
 * 1. Legislative Radar — multi-level bill tracking with trajectory scoring
 * 2. Action Center — AI-powered drafting of emails, testimony, witness slips
 * 3. Advocacy History — complete log of all advocacy actions
 * 4. Stakeholder Intelligence — relationship health and engagement tracking
 * 5. AI-powered bill impact analysis and hearing preparation
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useCivic, useNetwork } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, StatusBadge, Section, AIInsight, EmptyState } from '../../components/Card';
import { AI_CONFIG } from '../../core/constants';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { PendingBill } from '../../core/types';

// ─── Extended Bill Type (richer than seed data) ─────────────────────────────

interface ExtendedBill extends PendingBill {
  id: string;
  level: 'federal' | 'illinois' | 'local';
  number: string;
  sponsor: string;
  sponsorParty: string;
  chamber: string;
  stage: number;
  lastAction: string;
  lastActionDate: string;
  position: 'support' | 'oppose' | 'monitor' | 'neutral';
  trajectoryScore: number;
  charterImpact: 'high' | 'medium' | 'low';
  impactType: 'positive' | 'negative' | 'mixed';
  tags: string[];
  keyContacts: string[];
}

interface HistoryEntry {
  id: string;
  date: string;
  billNumber: string;
  billTitle: string;
  actionType: string;
  who: string;
  notes: string;
  outcome?: string;
}

interface Stakeholder {
  id: string;
  name: string;
  title: string;
  organization: string;
  type: 'elected' | 'authorizer' | 'community' | 'media' | 'coalition';
  lastContact: string;
  relationship: 'strong' | 'moderate' | 'stale' | 'new';
  notes: string;
  priority: 'high' | 'medium' | 'low';
}

// ─── Rich Seed Data ─────────────────────────────────────────────────────────

const EXTENDED_BILLS: ExtendedBill[] = [
  {
    id: 'f1', level: 'federal', number: 'S. 257', name: 'Charter School Accountability & Transparency Act',
    summary: 'Increases federal reporting requirements for charter schools, mandates financial audits, and restricts CSP grants to schools meeting new transparency standards.',
    risk: 'THREAT', status: 'Senate HELP Committee', sponsor: 'Sen. Patty Murray (D-WA)', sponsorParty: 'D',
    chamber: 'Senate', stage: 2, lastAction: 'Referred to Senate HELP Committee', lastActionDate: '2025-11-14',
    position: 'oppose', trajectoryScore: 4, charterImpact: 'high', impactType: 'negative',
    tags: ['federal funding', 'accountability', 'CSP grants'], keyContacts: ['Sen. Dick Durbin', 'Sen. Tammy Duckworth'],
  },
  {
    id: 'f2', level: 'federal', number: 'H.R. 1412', name: 'Public Charter School Innovation Act',
    summary: 'Reauthorizes and expands the federal Charter School Program with increased per-school allocations and new innovation grants.',
    risk: 'POSITIVE', status: 'House Education Committee', sponsor: 'Rep. Virginia Foxx (R-NC)', sponsorParty: 'R',
    chamber: 'House', stage: 2, lastAction: 'Markup scheduled', lastActionDate: '2026-02-28',
    position: 'support', trajectoryScore: 6, charterImpact: 'high', impactType: 'positive',
    tags: ['CSP reauthorization', 'innovation grants'], keyContacts: ['Rep. Delia Ramirez', 'Rep. Jonathan Jackson'],
  },
  {
    id: 's1', level: 'illinois', number: 'HB 4821', name: 'Charter Authorization Renewal Process Changes',
    summary: 'Modifies the charter renewal process to require additional community input hearings and extends the review timeline from 90 to 180 days.',
    risk: 'WATCH', status: 'In Committee', sponsor: 'Rep. La Shawn Ford (D)', sponsorParty: 'D',
    chamber: 'House', stage: 1, lastAction: 'Assigned to Education Committee', lastActionDate: '2026-01-22',
    position: 'monitor', trajectoryScore: 5, charterImpact: 'medium', impactType: 'mixed',
    tags: ['charter renewal', 'authorization'], keyContacts: ['Rep. La Shawn Ford', 'CPS Office of Innovation'],
  },
  {
    id: 's2', level: 'illinois', number: 'SB 2907', name: 'Per-Pupil Funding Equity Adjustment',
    summary: 'Increases evidence-based funding model weights for high-poverty schools and adds charter-specific equity provisions.',
    risk: 'POSITIVE', status: 'In Committee', sponsor: 'Sen. Robert Martwick (D)', sponsorParty: 'D',
    chamber: 'Senate', stage: 2, lastAction: 'Passed Senate Education Committee', lastActionDate: '2026-02-15',
    position: 'support', trajectoryScore: 7, charterImpact: 'high', impactType: 'positive',
    tags: ['EBF', 'per-pupil funding', 'equity'], keyContacts: ['Sen. Robert Martwick', 'ISBE'],
  },
  {
    id: 's3', level: 'illinois', number: 'HB 5102', name: 'School Safety Reporting Requirements Expansion',
    summary: 'Expands mandatory safety incident reporting to include behavioral health events and requires quarterly public disclosure.',
    risk: 'WATCH', status: 'Introduced', sponsor: 'Rep. Ann Williams (D)', sponsorParty: 'D',
    chamber: 'House', stage: 1, lastAction: 'Introduced and read first time', lastActionDate: '2026-03-01',
    position: 'monitor', trajectoryScore: 3, charterImpact: 'medium', impactType: 'mixed',
    tags: ['school safety', 'reporting', 'behavioral health'], keyContacts: ['Rep. Ann Williams'],
  },
  {
    id: 'l1', level: 'local', number: 'CPS-R-2026-04', name: 'CPS Charter Performance Framework Update',
    summary: 'CPS proposes updating the charter performance framework to include new SEL metrics and community engagement scores.',
    risk: 'WATCH', status: 'Public Comment', sponsor: 'CPS Office of Innovation', sponsorParty: 'I',
    chamber: 'CPS Board', stage: 3, lastAction: 'Public comment period opened', lastActionDate: '2026-03-10',
    position: 'monitor', trajectoryScore: 7, charterImpact: 'high', impactType: 'mixed',
    tags: ['CPS', 'performance framework', 'SEL'], keyContacts: ['CPS Chief of Innovation', 'CPS Board Members'],
  },
  {
    id: 'l2', level: 'local', number: 'ORD-2026-118', name: 'Chicago Youth Safety Investment Ordinance',
    summary: 'Allocates $50M in city funds for youth safety programs, with charter schools eligible for direct grants.',
    risk: 'POSITIVE', status: 'City Council Committee', sponsor: 'Ald. Pat Dowell', sponsorParty: 'D',
    chamber: 'City Council', stage: 2, lastAction: 'Referred to Budget Committee', lastActionDate: '2026-02-20',
    position: 'support', trajectoryScore: 5, charterImpact: 'medium', impactType: 'positive',
    tags: ['city funding', 'youth safety', 'grants'], keyContacts: ['Ald. Pat Dowell', "Mayor's Office"],
  },
];

const SEED_STAKEHOLDERS: Stakeholder[] = [
  { id: 'st1', name: 'Sen. Robert Martwick', title: 'State Senator, 10th District', organization: 'Illinois Senate', type: 'elected', lastContact: '2026-02-15', relationship: 'strong', notes: 'Champion of EBF equity provisions. Met at Springfield advocacy day.', priority: 'high' },
  { id: 'st2', name: 'Rep. La Shawn Ford', title: 'State Representative, 8th District', organization: 'Illinois House', type: 'elected', lastContact: '2026-01-10', relationship: 'moderate', notes: 'Sponsor of HB 4821. Needs cultivation on charter renewal process.', priority: 'high' },
  { id: 'st3', name: 'Dr. Angela Morrison', title: 'Chief of Innovation', organization: 'Chicago Public Schools', type: 'authorizer', lastContact: '2025-12-05', relationship: 'stale', notes: 'Key authorizer contact. Relationship needs refreshing before renewal cycle.', priority: 'high' },
  { id: 'st4', name: 'Maria Santos', title: 'Education Reporter', organization: 'Chalkbeat Chicago', type: 'media', lastContact: '2026-03-01', relationship: 'moderate', notes: 'Pending inquiry about network expansion plans. Responsive and fair.', priority: 'medium' },
  { id: 'st5', name: 'James Washington', title: 'Executive Director', organization: 'Illinois Network of Charter Schools', type: 'coalition', lastContact: '2026-03-15', relationship: 'strong', notes: 'Key coalition partner for legislative advocacy. Monthly coordination calls.', priority: 'high' },
  { id: 'st6', name: 'Ald. Pat Dowell', title: 'Alderman, 3rd Ward', organization: 'Chicago City Council', type: 'elected', lastContact: '2025-11-20', relationship: 'stale', notes: 'Sponsor of youth safety ordinance. Campus in her ward.', priority: 'medium' },
  { id: 'st7', name: 'Rev. Michael Thompson', title: 'Pastor', organization: 'Greater Hope Community Church', type: 'community', lastContact: '2025-10-15', relationship: 'stale', notes: 'Influential community leader near Englewood campus. Was strong supporter.', priority: 'medium' },
  { id: 'st8', name: 'Sen. Dick Durbin', title: 'U.S. Senator', organization: 'U.S. Senate', type: 'elected', lastContact: '2026-01-20', relationship: 'moderate', notes: 'Met at education roundtable. Supportive of charter accountability.', priority: 'high' },
];

const SEED_HISTORY: HistoryEntry[] = [
  { id: 'h1', date: '2026-03-15', billNumber: 'SB 2907', billTitle: 'Per-Pupil Funding Equity', actionType: 'testimony', who: 'CEO, CFO', notes: 'Testified before Senate Education Committee on funding equity impact', outcome: 'Bill advanced out of committee' },
  { id: 'h2', date: '2026-02-28', billNumber: 'HB 4821', billTitle: 'Charter Renewal Process', actionType: 'witness_slip', who: 'Government Affairs Director', notes: 'Filed opponent witness slip with detailed impact analysis', outcome: 'Pending' },
  { id: 'h3', date: '2026-02-15', billNumber: 'S. 257', billTitle: 'Charter Accountability Act', actionType: 'email', who: 'CEO', notes: 'Sent detailed letter to Sen. Durbin outlining compliance burden concerns', outcome: 'Staff acknowledged receipt' },
  { id: 'h4', date: '2026-01-20', billNumber: 'H.R. 1412', billTitle: 'Charter Innovation Act', actionType: 'coalition', who: 'CEO, INCS Director', notes: 'Joined national coalition letter supporting CSP reauthorization', outcome: 'Letter submitted to committee' },
];

// ─── Config Maps ────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  federal:  { label: 'Federal',  color: '#6366F1', bg: '#EEF2FF' },
  illinois: { label: 'Illinois', color: '#0EA5E9', bg: '#F0F9FF' },
  local:    { label: 'Local',    color: '#10B981', bg: '#ECFDF5' },
};

const POSITION_CONFIG: Record<string, { label: string; color: string }> = {
  support: { label: 'SUPPORT', color: statusColor.green },
  oppose:  { label: 'OPPOSE',  color: statusColor.red },
  monitor: { label: 'MONITOR', color: statusColor.amber },
  neutral: { label: 'NEUTRAL', color: textColor.muted },
};

const IMPACT_CONFIG: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positive', color: statusColor.green },
  negative: { label: 'Negative', color: statusColor.red },
  mixed:    { label: 'Mixed',    color: statusColor.amber },
};

const ACTION_LABELS: Record<string, string> = {
  witness_slip: 'Witness Slip',
  email: 'Email / Letter',
  call: 'Phone Call',
  testimony: 'Testimony',
  coalition: 'Coalition Action',
  meeting: 'Meeting',
  other: 'Other',
};

// ─── Trajectory Bar ─────────────────────────────────────────────────────────

function TrajectoryBar({ score }: { score: number }) {
  const color = score >= 7 ? statusColor.red : score >= 4 ? statusColor.amber : statusColor.green;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 50, height: 4, background: border.light, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${(score / 10) * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, fontWeight: fontWeight.bold, color }}>{score}/10</span>
    </div>
  );
}

// ─── Stage Progress ─────────────────────────────────────────────────────────

function StageProgress({ stage, total = 6 }: { stage: number; total?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: 16, height: 4, borderRadius: 2,
          background: i < stage ? modColors.civic : border.light,
        }} />
      ))}
    </div>
  );
}

// ─── Bill Card ──────────────────────────────────────────────────────────────

function BillCard({ bill, selected, onSelect }: { bill: ExtendedBill; selected: boolean; onSelect: () => void }) {
  const level = LEVEL_LABELS[bill.level];
  const pos = POSITION_CONFIG[bill.position];
  const impact = IMPACT_CONFIG[bill.impactType];
  const riskColor = bill.risk === 'THREAT' ? statusColor.red : bill.risk === 'POSITIVE' ? statusColor.green : statusColor.amber;

  return (
    <div
      onClick={onSelect}
      style={{
        background: bg.card, borderRadius: radius.lg,
        border: `1px solid ${selected ? modColors.civic : border.light}`,
        borderLeft: `4px solid ${riskColor}`,
        padding: '16px 18px', cursor: 'pointer',
        transition: transition.fast, marginBottom: 8,
        boxShadow: selected ? `0 0 0 1px ${modColors.civic}40` : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = `${modColors.civic}60`; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = border.light; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontFamily: font.mono, color: textColor.primary }}>{bill.number}</span>
            <span style={{
              fontSize: fontSize.xs, padding: '1px 6px', borderRadius: radius.full,
              background: level?.bg, color: level?.color, fontWeight: fontWeight.semibold,
            }}>{level?.label}</span>
          </div>
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.primary, lineHeight: 1.4 }}>{bill.name}</div>
        </div>
        <StatusBadge label={bill.risk} variant={bill.risk === 'THREAT' ? 'red' : bill.risk === 'POSITIVE' ? 'green' : 'amber'} size="sm" />
      </div>
      <div style={{ fontSize: fontSize.xs, color: textColor.muted, lineHeight: 1.6, marginBottom: 10 }}>{bill.summary}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Position:</span>
          <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: pos?.color }}>{pos?.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Impact:</span>
          <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: impact?.color }}>{impact?.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Trajectory:</span>
          <TrajectoryBar score={bill.trajectoryScore} />
        </div>
        <StageProgress stage={bill.stage} />
      </div>
    </div>
  );
}

// ─── Bill Detail Panel ──────────────────────────────────────────────────────

function BillDetail({ bill, onDraft }: { bill: ExtendedBill; onDraft: (b: ExtendedBill, type: string) => void }) {
  const level = LEVEL_LABELS[bill.level];
  const pos = POSITION_CONFIG[bill.position];

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      padding: 20, position: 'sticky', top: 20,
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <span style={{
          fontSize: fontSize.xs, padding: '2px 8px', borderRadius: radius.full,
          background: level?.bg, color: level?.color, fontWeight: fontWeight.bold,
        }}>{level?.label}</span>
        <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontFamily: font.mono, color: textColor.primary }}>{bill.number}</span>
      </div>
      <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: textColor.primary, fontFamily: font.serif, marginBottom: 12, lineHeight: 1.4 }}>
        {bill.name}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Sponsor', value: bill.sponsor },
          { label: 'Chamber', value: bill.chamber },
          { label: 'Status', value: bill.status },
          { label: 'Last Action', value: bill.lastActionDate },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: fontSize.sm, color: textColor.primary, fontWeight: fontWeight.medium }}>{f.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 4 }}>Our Position</div>
        <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: pos?.color }}>{pos?.label}</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 4 }}>Trajectory Score</div>
        <TrajectoryBar score={bill.trajectoryScore} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 4 }}>Stage Progress</div>
        <StageProgress stage={bill.stage} />
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 4 }}>
          {['Introduced', 'Committee', 'Floor Vote', 'Second Chamber', 'Conference', 'Signed'][bill.stage - 1] || 'Unknown'}
        </div>
      </div>

      {bill.keyContacts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 6 }}>Key Contacts</div>
          {bill.keyContacts.map(c => (
            <div key={c} style={{ fontSize: fontSize.sm, color: textColor.primary, padding: '3px 0' }}>{c}</div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 6 }}>Tags</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {bill.tags.map(t => (
            <span key={t} style={{
              fontSize: fontSize.xs, padding: '2px 8px', borderRadius: radius.full,
              background: bg.subtle, color: textColor.muted, border: `1px solid ${border.light}`,
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${border.light}`, paddingTop: 14 }}>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', marginBottom: 8 }}>Quick Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(ACTION_LABELS)
            .filter(([k]) => k !== 'witness_slip' || bill.level === 'illinois')
            .map(([k, v]) => (
              <button
                key={k}
                onClick={() => onDraft(bill, k)}
                style={{
                  padding: '8px 12px', borderRadius: radius.md, fontSize: fontSize.xs,
                  fontWeight: fontWeight.semibold, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${border.light}`, background: bg.card,
                  color: textColor.primary, transition: transition.fast,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${modColors.civic}08`; e.currentTarget.style.borderColor = `${modColors.civic}40`; }}
                onMouseLeave={e => { e.currentTarget.style.background = bg.card; e.currentTarget.style.borderColor = border.light; }}
              >
                Draft {v}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CIVIC APP
// ═══════════════════════════════════════════════════════════════════════════

export default function CivicApp() {
  const civic = useCivic();
  const network = useNetwork();

  const [activeTab, setActiveTab] = useState<'radar' | 'action' | 'history' | 'stakeholders'>('radar');
  const [bills] = useState<ExtendedBill[]>(EXTENDED_BILLS);
  const [history, setHistory] = useState<HistoryEntry[]>(SEED_HISTORY);
  const [stakeholders] = useState<Stakeholder[]>(SEED_STAKEHOLDERS);

  // Radar state
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('trajectory');
  const [selectedBill, setSelectedBill] = useState<ExtendedBill | null>(null);

  // Action Center state
  const [actionBill, setActionBill] = useState<ExtendedBill | null>(null);
  const [actionType, setActionType] = useState<string>('email');
  const [actionWho, setActionWho] = useState('CEO, Veritas Charter Schools');
  const [draft, setDraft] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI state
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const threats = bills.filter(b => b.risk === 'THREAT');
  const positives = bills.filter(b => b.risk === 'POSITIVE');
  const watches = bills.filter(b => b.risk === 'WATCH');
  const staleRelationships = stakeholders.filter(s => s.relationship === 'stale');

  const filteredBills = useMemo(() => {
    return bills
      .filter(b => levelFilter === 'all' || b.level === levelFilter)
      .filter(b => positionFilter === 'all' || b.position === positionFilter)
      .sort((a, b) => {
        if (sortBy === 'trajectory') return b.trajectoryScore - a.trajectoryScore;
        if (sortBy === 'impact') {
          const impactOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
          return (impactOrder[b.charterImpact] || 0) - (impactOrder[a.charterImpact] || 0);
        }
        return b.stage - a.stage;
      });
  }, [bills, levelFilter, positionFilter, sortBy]);

  // Generate AI draft
  const generateDraft = async () => {
    if (!actionBill) return;
    setDraftLoading(true);
    setDraft('');
    setSaved(false);
    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 2048,
          system: AI_CONFIG.systemPrompt,
          messages: [{
            role: 'user',
            content: `Draft a ${ACTION_LABELS[actionType]} regarding ${actionBill.number} — "${actionBill.name}" for ${network.name}, a Chicago charter school network serving ${network.campusCount} campuses.

Bill Summary: ${actionBill.summary}
Our Position: ${actionBill.position}
Impact: ${actionBill.charterImpact} (${actionBill.impactType})
Key Contacts: ${actionBill.keyContacts.join(', ')}
Author/On Behalf Of: ${actionWho}

${actionType === 'witness_slip' ? 'Format as an Illinois General Assembly witness slip with proper fields (Name, Title, Organization, Position, Testimony).' : ''}
${actionType === 'email' ? 'Format as a professional letter/email. Include subject line, greeting, 3-4 substantive paragraphs, and closing.' : ''}
${actionType === 'testimony' ? 'Format as formal committee testimony with opening statement, key points, data citations, and closing request.' : ''}
${actionType === 'call' ? 'Format as talking points for a phone call: key message, supporting data, specific ask.' : ''}
${actionType === 'coalition' ? 'Format as a coalition sign-on letter with organizational endorsement language.' : ''}

Be specific, cite real impacts on students and operations, and maintain a professional but passionate tone.`,
          }],
        }),
      });
      const d = await res.json();
      setDraft(d.content?.find((b: any) => b.type === 'text')?.text || 'Draft unavailable.');
    } catch {
      setDraft('Unable to generate draft. Check API configuration.');
    } finally {
      setDraftLoading(false);
    }
  };

  // Save to history
  const saveToHistory = () => {
    if (!actionBill || !draft) return;
    const entry: HistoryEntry = {
      id: `h-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      billNumber: actionBill.number,
      billTitle: actionBill.name,
      actionType,
      who: actionWho,
      notes: `${ACTION_LABELS[actionType]} drafted and logged`,
      outcome: undefined,
    };
    setHistory(prev => [...prev, entry]);
    setSaved(true);
  };

  // Handle draft from bill detail
  const handleDraftFromBill = (bill: ExtendedBill, type: string) => {
    setActionBill(bill);
    setActionType(type);
    setDraft('');
    setSaved(false);
    setActiveTab('action');
  };

  // Generate legislative landscape AI
  const generateLandscapeAI = async () => {
    setAiLoading(true);
    setAiInsight('');
    try {
      const billSummary = bills.map(b => `${b.number} "${b.name}" — ${b.risk}, ${b.position}, trajectory: ${b.trajectoryScore}/10, ${b.level}`).join('\n');
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 2048,
          system: AI_CONFIG.systemPrompt,
          messages: [{
            role: 'user',
            content: `Generate a comprehensive legislative and public affairs intelligence briefing for ${network.name} (${network.campusCount} campuses, Chicago).

ACTIVE LEGISLATION:
${billSummary}

STAKEHOLDER STATUS: ${staleRelationships.length} stale relationships out of ${stakeholders.length} total
UPCOMING HEARINGS: ${civic.upcomingHearings} (next: ${civic.hearingDate} — ${civic.hearingTopic})
MEDIA: ${civic.mediaMonitoring}

Provide 4-5 paragraphs covering:
1. Legislative landscape assessment — what's the headline for the CEO?
2. Highest-priority threats and opportunities requiring immediate action
3. Stakeholder relationship gaps that could hurt us
4. Recommended advocacy priorities for the next 60 days
5. One thing that could blindside us if we're not paying attention

Be direct, specific, and connect dots across federal/state/local levels.`,
          }],
        }),
      });
      const d = await res.json();
      setAiInsight(d.content?.find((b: any) => b.type === 'text')?.text || 'Analysis unavailable.');
    } catch {
      setAiInsight('Unable to generate analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = [
    { id: 'radar' as const, label: 'Legislative Radar', icon: '◉' },
    { id: 'action' as const, label: 'Action Center', icon: '◈' },
    { id: 'history' as const, label: 'Advocacy History', icon: '▤' },
    { id: 'stakeholders' as const, label: 'Stakeholders', icon: '◇' },
  ];

  return (
    <div>
      <ModuleHeader
        title="Civic"
        subtitle="Public Affairs & Legislative Intelligence"
        accent={modColors.civic}
        freshness={{ lastUpdated: civic.lastUpdated, source: civic.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'ACTIVE BILLS', value: bills.length.toString(), sub: `${threats.length} threats, ${positives.length} positive`, color: modColors.civic },
          { label: 'THREATS', value: threats.length.toString(), sub: threats.length > 0 ? 'Requires advocacy' : 'Clear', color: threats.length > 0 ? statusColor.red : statusColor.green },
          { label: 'HEARINGS', value: civic.upcomingHearings.toString(), sub: `Next: ${civic.hearingDate}`, color: statusColor.amber },
          { label: 'STALE RELATIONSHIPS', value: staleRelationships.length.toString(), sub: staleRelationships.length > 0 ? 'Needs outreach' : 'All current', color: staleRelationships.length > 0 ? statusColor.amber : statusColor.green },
          { label: 'ADVOCACY ACTIONS', value: history.length.toString(), sub: 'This session', color: statusColor.blue },
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
              color: activeTab === t.id ? modColors.civic : textColor.muted,
              background: 'transparent',
              borderBottom: `2px solid ${activeTab === t.id ? modColors.civic : 'transparent'}`,
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
        {/* ─── LEGISLATIVE RADAR ─────────────────────────────────── */}
        {activeTab === 'radar' && (
          <div>
            {/* AI Intelligence */}
            <div style={{
              background: `${modColors.civic}04`, border: `1px solid ${modColors.civic}20`,
              borderRadius: radius.lg, padding: 20, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: modColors.civic, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Legislative Landscape Intelligence
                </div>
                <button
                  onClick={generateLandscapeAI}
                  disabled={aiLoading}
                  style={{
                    padding: '6px 16px', borderRadius: radius.md,
                    background: aiLoading ? bg.subtle : `${modColors.civic}12`,
                    color: aiLoading ? textColor.muted : modColors.civic,
                    border: `1px solid ${aiLoading ? border.light : modColors.civic}40`,
                    fontSize: fontSize.xs, fontWeight: fontWeight.bold, cursor: aiLoading ? 'default' : 'pointer',
                  }}
                >
                  {aiLoading ? 'Analyzing...' : 'Generate Briefing'}
                </button>
              </div>
              {aiInsight ? (
                <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{aiInsight}</div>
              ) : (
                <div style={{ fontSize: fontSize.sm, color: textColor.muted }}>
                  Click "Generate Briefing" for an AI-powered legislative landscape analysis.
                </div>
              )}
            </div>

            {/* Filters */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
              padding: '10px 14px', background: bg.subtle, borderRadius: radius.md,
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'all', label: 'All Levels' },
                  { key: 'federal', label: 'Federal' },
                  { key: 'illinois', label: 'Illinois' },
                  { key: 'local', label: 'Local' },
                ].map(f => (
                  <button key={f.key} onClick={() => setLevelFilter(f.key)} style={{
                    padding: '6px 12px', borderRadius: radius.full, fontSize: fontSize.xs,
                    fontWeight: fontWeight.semibold, cursor: 'pointer', border: 'none',
                    background: levelFilter === f.key ? brand.navy : 'transparent',
                    color: levelFilter === f.key ? '#FFF' : textColor.muted,
                  }}>{f.label}</button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <select
                  value={positionFilter}
                  onChange={e => setPositionFilter(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${border.light}`,
                    fontSize: fontSize.xs, background: bg.card, color: textColor.primary,
                  }}
                >
                  <option value="all">All Positions</option>
                  <option value="support">Support</option>
                  <option value="oppose">Oppose</option>
                  <option value="monitor">Monitor</option>
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${border.light}`,
                    fontSize: fontSize.xs, background: bg.card, color: textColor.primary,
                  }}
                >
                  <option value="trajectory">Sort: Trajectory</option>
                  <option value="impact">Sort: Impact</option>
                  <option value="stage">Sort: Stage</option>
                </select>
              </div>
            </div>

            {/* Bills + Detail */}
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {filteredBills.map(b => (
                  <BillCard
                    key={b.id}
                    bill={b}
                    selected={selectedBill?.id === b.id}
                    onSelect={() => setSelectedBill(b)}
                  />
                ))}
                {filteredBills.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: textColor.muted, fontSize: fontSize.sm }}>
                    No bills match your filters.
                  </div>
                )}
              </div>
              <div style={{ width: 320, flexShrink: 0 }}>
                {selectedBill ? (
                  <BillDetail bill={selectedBill} onDraft={handleDraftFromBill} />
                ) : (
                  <div style={{
                    background: bg.subtle, borderRadius: radius.lg, padding: 40, textAlign: 'center', color: textColor.muted,
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: 8, opacity: 0.5 }}>◇</div>
                    <div style={{ fontSize: fontSize.sm }}>Select a bill to see<br />full details and actions</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── ACTION CENTER ─────────────────────────────────────── */}
        {activeTab === 'action' && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
            {/* Left: Bill + Action selection */}
            <div>
              <div style={{
                background: bg.subtle, borderRadius: radius.lg, padding: 16, marginBottom: 14,
              }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Select Bill
                </div>
                {bills.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setActionBill(b); setDraft(''); setSaved(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                      marginBottom: 4, borderRadius: radius.md, fontSize: fontSize.xs,
                      fontWeight: fontWeight.semibold, cursor: 'pointer',
                      border: `1px solid ${actionBill?.id === b.id ? modColors.civic : border.light}`,
                      background: actionBill?.id === b.id ? `${modColors.civic}08` : bg.card,
                      color: textColor.primary,
                    }}
                  >
                    <div style={{ fontFamily: font.mono }}>{b.number}</div>
                    <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>{b.name}</div>
                  </button>
                ))}
              </div>

              <div style={{
                background: bg.subtle, borderRadius: radius.lg, padding: 16, marginBottom: 14,
              }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Action Type
                </div>
                {Object.entries(ACTION_LABELS)
                  .filter(([k]) => k !== 'witness_slip' || actionBill?.level === 'illinois')
                  .map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setActionType(k)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                        marginBottom: 4, borderRadius: radius.md, fontSize: fontSize.xs,
                        fontWeight: fontWeight.semibold, cursor: 'pointer',
                        border: `1px solid ${actionType === k ? modColors.civic : border.light}`,
                        background: actionType === k ? `${modColors.civic}08` : bg.card,
                        color: textColor.primary,
                      }}
                    >
                      {v}
                    </button>
                  ))}
              </div>

              <div style={{ background: bg.subtle, borderRadius: radius.lg, padding: 16 }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Author / On Behalf Of
                </div>
                <textarea
                  value={actionWho}
                  onChange={e => setActionWho(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: radius.md,
                    border: `1px solid ${border.light}`, fontSize: fontSize.xs,
                    resize: 'vertical', boxSizing: 'border-box', fontFamily: font.body,
                  }}
                />
              </div>
            </div>

            {/* Right: Draft area */}
            <div style={{
              background: bg.subtle, borderRadius: radius.lg, padding: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: textColor.primary }}>
                  {actionBill ? `${ACTION_LABELS[actionType]} — ${actionBill.number}` : 'Select a bill to draft'}
                </div>
                <button
                  onClick={generateDraft}
                  disabled={!actionBill || draftLoading}
                  style={{
                    padding: '8px 20px', borderRadius: radius.md,
                    background: !actionBill || draftLoading ? bg.card : modColors.civic,
                    color: !actionBill || draftLoading ? textColor.muted : '#FFF',
                    fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: 'none',
                    cursor: !actionBill || draftLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {draftLoading ? 'Drafting...' : 'Generate Draft'}
                </button>
              </div>

              {actionBill?.level === 'illinois' && actionType === 'witness_slip' && (
                <div style={{
                  background: `${statusColor.amber}08`, border: `1px solid ${statusColor.amber}30`,
                  borderRadius: radius.md, padding: '10px 14px', marginBottom: 16,
                  fontSize: fontSize.xs, color: statusColor.amber, lineHeight: 1.6,
                }}>
                  Illinois witness slips are submitted at ilga.gov. The draft below can be copied directly into the ILGA witness slip form.
                </div>
              )}

              {draftLoading && (
                <div style={{ textAlign: 'center', padding: 40, color: textColor.muted, fontSize: fontSize.sm, fontStyle: 'italic' }}>
                  Drafting {ACTION_LABELS[actionType]}...
                </div>
              )}

              {draft && !draftLoading && (
                <>
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={20}
                    style={{
                      width: '100%', padding: 14, borderRadius: radius.md,
                      border: `1px solid ${border.light}`, fontSize: fontSize.sm,
                      lineHeight: 1.8, resize: 'vertical', fontFamily: font.body,
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => navigator.clipboard?.writeText(draft)}
                      style={{
                        padding: '8px 16px', borderRadius: radius.md,
                        background: brand.navy, color: '#FFF',
                        fontSize: fontSize.xs, fontWeight: fontWeight.bold, border: 'none', cursor: 'pointer',
                      }}
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={saveToHistory}
                      style={{
                        padding: '8px 16px', borderRadius: radius.md,
                        background: saved ? statusColor.green : bg.card,
                        color: saved ? '#FFF' : textColor.primary,
                        fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                        border: `1px solid ${saved ? statusColor.green : border.light}`,
                        cursor: 'pointer',
                      }}
                    >
                      {saved ? 'Saved to History' : 'Log to Advocacy History'}
                    </button>
                  </div>
                </>
              )}

              {!draft && !draftLoading && (
                <div style={{ textAlign: 'center', padding: 60, color: textColor.muted }}>
                  <div style={{ fontSize: '28px', marginBottom: 8, opacity: 0.5 }}>◈</div>
                  <div style={{ fontSize: fontSize.sm }}>Select a bill and action type,<br />then click Generate Draft.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ADVOCACY HISTORY ──────────────────────────────────── */}
        {activeTab === 'history' && (
          <div>
            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Actions', value: history.length.toString(), color: textColor.primary },
                { label: 'Testimony', value: history.filter(h => h.actionType === 'testimony').length.toString(), color: modColors.civic },
                { label: 'Emails/Letters', value: history.filter(h => h.actionType === 'email').length.toString(), color: statusColor.blue },
                { label: 'Advocates', value: new Set(history.map(h => h.who.split(',')[0].trim())).size.toString(), color: statusColor.green },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: bg.subtle, borderRadius: radius.md, padding: '14px 18px',
                }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: textColor.muted }}>
                <div style={{ fontSize: '28px', marginBottom: 8, opacity: 0.5 }}>▤</div>
                <div style={{ fontSize: fontSize.sm }}>No advocacy actions logged yet.<br />Drafts saved from the Action Center will appear here.</div>
              </div>
            ) : (
              <div style={{
                background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`, overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '90px 120px 1fr 140px 120px 60px',
                  padding: '10px 16px', background: bg.subtle, borderBottom: `1px solid ${border.light}`,
                  fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <div>Date</div><div>Bill</div><div>Notes</div><div>By</div><div>Outcome</div><div></div>
                </div>
                {/* Rows */}
                {[...history].reverse().map((h, i) => (
                  <div key={h.id} style={{
                    display: 'grid', gridTemplateColumns: '90px 120px 1fr 140px 120px 60px',
                    padding: '12px 16px', borderBottom: i < history.length - 1 ? `1px solid ${border.light}` : 'none',
                    background: i % 2 === 0 ? bg.card : bg.subtle, alignItems: 'start',
                  }}>
                    <div style={{ fontSize: fontSize.xs, color: textColor.muted, fontFamily: font.mono }}>{h.date}</div>
                    <div>
                      <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary }}>{h.billNumber}</div>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{ACTION_LABELS[h.actionType] || h.actionType}</div>
                    </div>
                    <div style={{ fontSize: fontSize.xs, color: textColor.secondary, paddingRight: 12 }}>{h.notes}</div>
                    <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{h.who.split(',')[0]}</div>
                    <div style={{ fontSize: fontSize.xs, color: h.outcome ? textColor.secondary : textColor.light, fontStyle: h.outcome ? 'normal' : 'italic' }}>
                      {h.outcome || 'Pending'}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setHistory(prev => prev.filter(x => x.id !== h.id))}
                        style={{
                          padding: '3px 8px', borderRadius: radius.sm,
                          background: `${statusColor.red}08`, color: statusColor.red,
                          fontSize: fontSize.xs, border: 'none', cursor: 'pointer', fontWeight: fontWeight.bold,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STAKEHOLDERS ──────────────────────────────────────── */}
        {activeTab === 'stakeholders' && (
          <div>
            {/* Relationship Health Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Strong', count: stakeholders.filter(s => s.relationship === 'strong').length, color: statusColor.green },
                { label: 'Moderate', count: stakeholders.filter(s => s.relationship === 'moderate').length, color: statusColor.amber },
                { label: 'Stale', count: stakeholders.filter(s => s.relationship === 'stale').length, color: statusColor.red },
                { label: 'New', count: stakeholders.filter(s => s.relationship === 'new').length, color: statusColor.blue },
              ].map(s => (
                <div key={s.label} style={{
                  background: `${s.color}08`, borderRadius: radius.md, padding: 14,
                  borderTop: `3px solid ${s.color}`, textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Stakeholder Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {stakeholders
                .sort((a, b) => {
                  const order: Record<string, number> = { stale: 0, 'new': 1, moderate: 2, strong: 3 };
                  return (order[a.relationship] || 0) - (order[b.relationship] || 0);
                })
                .map(s => {
                  const relColor = s.relationship === 'strong' ? statusColor.green
                    : s.relationship === 'moderate' ? statusColor.amber
                    : s.relationship === 'stale' ? statusColor.red : statusColor.blue;
                  const typeLabel: Record<string, string> = {
                    elected: 'Elected Official', authorizer: 'Authorizer', community: 'Community',
                    media: 'Media', coalition: 'Coalition Partner',
                  };
                  return (
                    <div key={s.id} style={{
                      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
                      borderLeft: `4px solid ${relColor}`, padding: '16px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: textColor.primary }}>{s.name}</div>
                          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{s.title}</div>
                          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{s.organization}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <StatusBadge label={s.relationship.toUpperCase()} variant={s.relationship === 'strong' ? 'green' : s.relationship === 'stale' ? 'red' : 'amber'} size="sm" />
                          <span style={{
                            fontSize: fontSize.xs, padding: '2px 6px', borderRadius: radius.full,
                            background: bg.subtle, color: textColor.muted, border: `1px solid ${border.light}`,
                          }}>{typeLabel[s.type] || s.type}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: fontSize.xs, color: textColor.secondary, lineHeight: 1.6, marginBottom: 8 }}>{s.notes}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>
                          Last contact: <span style={{ fontFamily: font.mono, fontWeight: fontWeight.semibold }}>{s.lastContact}</span>
                        </div>
                        <StatusBadge label={s.priority.toUpperCase()} variant={s.priority === 'high' ? 'red' : s.priority === 'medium' ? 'amber' : 'gray'} size="sm" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div style={{
        textAlign: 'center', padding: '16px 0', fontSize: fontSize.xs, color: textColor.light, marginTop: 16,
      }}>
        {bills.length} bills tracked · {history.length} advocacy actions · {stakeholders.length} stakeholders · Civic Intelligence
      </div>
    </div>
  );
}
