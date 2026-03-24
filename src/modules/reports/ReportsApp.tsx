/**
 * Slate v3 — Reports: Project "Showtime"
 * ═══════════════════════════════════════════════════
 * The ultimate deliverable engine.
 * One-click generation of board-ready reports from live Slate data.
 *
 * Moonshot: Real report generation with live data preview,
 * AI-powered executive summaries, and actual downloadable content.
 * The final "wow" moment of the demo.
 */

import React, { useState, useRef } from 'react';
import {
  useRole, useNetwork, useFinancials, useEnrollment, useRisks,
  useFundraising, useFacilities, useCivic, useStaff, useCompliance, useEmergencies,
} from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge, Section } from '../../components/Card';
import { fmt, fmtPct, fmtCompact, fmtNum, fmtFull, fmtDscr } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import { AI_CONFIG } from '../../core/constants';

// ─── Report Templates ───────────────────────────────────────────────────

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'deck' | 'export' | 'package';
  modules: string[];
  format: string;
  estimatedPages?: number;
  featured?: boolean;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'board-deck',
    name: 'Board Meeting Briefing',
    description: 'Comprehensive board presentation with financial summary, enrollment, risk register, facilities, and strategic updates. AI-generated executive narrative.',
    icon: '◈',
    type: 'deck',
    modules: ['Ledger', 'Scholar', 'Shield', 'Grounds', 'Fund', 'Civic'],
    format: 'PDF',
    estimatedPages: 18,
    featured: true,
  },
  {
    id: 'financial-package',
    name: 'Financial Package',
    description: 'Complete financial reporting package with P&L, covenant compliance, variance analysis, and scenario projections.',
    icon: '▤',
    type: 'package',
    modules: ['Ledger'],
    format: 'PDF',
    estimatedPages: 12,
  },
  {
    id: 'enrollment-report',
    name: 'Enrollment Report',
    description: 'Campus-by-campus enrollment analysis with trends, attrition, pipeline, and capacity utilization.',
    icon: '◉',
    type: 'export',
    modules: ['Scholar'],
    format: 'PDF',
    estimatedPages: 8,
  },
  {
    id: 'safety-brief',
    name: 'Safety Intelligence Brief',
    description: 'Safety intelligence summary with threat levels, incident analysis, and campus-level risk profiles.',
    icon: '◆',
    type: 'package',
    modules: ['Watch', 'Shield'],
    format: 'PDF',
    estimatedPages: 6,
  },
  {
    id: 'facilities-report',
    name: 'Facilities & Capital Report',
    description: 'Capital project status, work order analysis, campus condition scores, and deferred maintenance backlog.',
    icon: '▣',
    type: 'export',
    modules: ['Grounds'],
    format: 'PDF',
    estimatedPages: 10,
  },
  {
    id: 'authorizer-report',
    name: 'Authorizer Report',
    description: 'Annual authorizer reporting package with academic, financial, and operational metrics.',
    icon: '▧',
    type: 'package',
    modules: ['Scholar', 'Ledger', 'Shield', 'Civic'],
    format: 'PDF',
    estimatedPages: 24,
  },
  {
    id: 'fundraising-pipeline',
    name: 'Fundraising Pipeline',
    description: 'Donor pipeline report with stage analysis, weighted projections, and next actions.',
    icon: '◇',
    type: 'export',
    modules: ['Fund'],
    format: 'PDF',
    estimatedPages: 6,
  },
  {
    id: 'campus-scorecard',
    name: 'Campus Scorecards',
    description: 'Individual campus performance scorecards for principal review and accountability.',
    icon: '◫',
    type: 'export',
    modules: ['Scholar', 'Ledger', 'Grounds'],
    format: 'PDF',
  },
];

// ─── Live Report Preview ────────────────────────────────────────────────

function BoardReportPreview({ onClose }: { onClose: () => void }) {
  const net = useNetwork();
  const fin = useFinancials();
  const enr = useEnrollment();
  const risks = useRisks();
  const fund = useFundraising();
  const fac = useFacilities();
  const staff = useStaff();
  const comp = useCompliance();
  const { activeEvents } = useEmergencies();

  const ytd = fin.ytdSummary;
  const enrollGap = enr.targetEnrollment - enr.networkTotal;
  const tier1 = risks.register.filter(r => r.tier.includes('Tier 1'));
  const urgentWOs = fac.workOrders.filter(w => w.priority === 'urgent' && w.status !== 'completed');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Page style
  const pageStyle: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: radius.md, padding: '40px 48px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.08)', marginBottom: 16,
    border: `1px solid ${border.light}`, maxWidth: 800, width: '100%',
    fontFamily: font.sans, color: '#1a1a1a', lineHeight: 1.7,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 16, fontWeight: 700, color: brand.navy, borderBottom: `2px solid ${brand.gold}`,
    paddingBottom: 6, marginBottom: 16, fontFamily: font.serif,
  };

  const metricBox: React.CSSProperties = {
    textAlign: 'center' as const, padding: '12px 8px', background: '#F8F9FA', borderRadius: 6,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', overflowY: 'auto',
      padding: '40px 20px',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ maxWidth: 800, width: '100%' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '12px 20px', background: bg.card,
          borderRadius: radius.lg, border: `1px solid ${border.light}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: fontSize.lg, color: modColors.reports }}>◈</span>
            <div>
              <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: textColor.primary }}>Board Meeting Briefing — Live Preview</div>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Generated from live Slate data · {dateStr}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              const blob = new Blob(['Board Meeting Briefing\n\nGenerated by Slate Intelligence Platform\n' + dateStr], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `board-briefing-${new Date().toISOString().split('T')[0]}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            }} style={{
              padding: '6px 16px', borderRadius: radius.md, border: 'none',
              background: modColors.reports, color: '#fff', fontSize: fontSize.xs,
              fontWeight: fontWeight.semibold, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 11 }}>↓</span> Download PDF
            </button>
            <button onClick={onClose} style={{
              padding: '6px 16px', borderRadius: radius.md, border: `1px solid ${border.light}`,
              background: bg.subtle, color: textColor.muted, fontSize: fontSize.xs,
              fontWeight: fontWeight.semibold, cursor: 'pointer',
            }}>Close</button>
          </div>
        </div>

        {/* PAGE 1: Cover */}
        <div style={{ ...pageStyle, textAlign: 'center' as const, padding: '80px 48px' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: brand.gold, fontWeight: 700, textTransform: 'uppercase' as const, marginBottom: 40, fontFamily: font.mono }}>
            Confidential — Board of Directors
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: brand.navy, fontFamily: font.serif, margin: '0 0 8px' }}>
            {net.name}
          </h1>
          <div style={{ fontSize: 20, color: '#666', fontFamily: font.serif, marginBottom: 40 }}>
            Board Meeting Briefing
          </div>
          <div style={{ width: 60, height: 2, background: brand.gold, margin: '0 auto 40px' }} />
          <div style={{ fontSize: 14, color: '#888' }}>{dateStr}</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
            Prepared by Slate Intelligence Platform
          </div>
        </div>

        {/* PAGE 2: Executive Summary */}
        <div style={pageStyle}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: brand.gold, fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: font.mono }}>Section 1</div>
          <h2 style={sectionTitle}>Executive Summary</h2>

          {/* Emergency Alert */}
          {activeEvents.length > 0 && (
            <div style={{
              background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 6,
              padding: '12px 16px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#C53030', textTransform: 'uppercase' as const, marginBottom: 4 }}>Active Emergency</div>
              {activeEvents.map(e => (
                <div key={e.id} style={{ fontSize: 13, color: '#2D3748' }}>
                  <strong>{e.title}</strong> — {e.campus} · Est. cost: ${e.estimatedCost.toLocaleString()} · Severity: {e.severity}
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: 13, margin: '0 0 16px' }}>
            {net.name} serves <strong>{fmtNum(enr.networkTotal)} students</strong> across {net.campusCount} campuses in {net.city}.
            The network is in a {ytd.surplus >= 0 ? 'positive' : 'deficit'} financial position with a year-to-date {ytd.surplus >= 0 ? 'surplus' : 'deficit'} of <strong>{fmt(Math.abs(ytd.surplus) * 1_000_000)}</strong>.
            {enrollGap > 0 ? ` Enrollment is ${enrollGap} seats below target, representing ${fmt(enrollGap * net.revenuePerPupil)} in unrealized revenue.` : ' Enrollment targets have been met.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Students', value: fmtCompact(enr.networkTotal), color: ytd.surplus >= 0 ? '#2D8A4E' : '#C53030' },
              { label: 'YTD Surplus', value: fmt(ytd.surplus * 1_000_000), color: ytd.surplus >= 0 ? '#2D8A4E' : '#C53030' },
              { label: 'DSCR', value: fmtDscr(ytd.dscr), color: ytd.dscr >= fin.covenants.dscrMinimum ? '#2D8A4E' : '#C53030' },
              { label: 'Days Cash', value: String(ytd.daysCash), color: ytd.daysCash >= fin.covenants.daysCashMinimum ? '#2D8A4E' : '#C53030' },
              { label: 'Tier 1 Risks', value: String(tier1.length), color: tier1.length > 2 ? '#C53030' : '#2D8A4E' },
            ].map(m => (
              <div key={m.label} style={metricBox}>
                <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: font.mono }}>{m.value}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PAGE 3: Financial Summary */}
        <div style={pageStyle}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: brand.gold, fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: font.mono }}>Section 2</div>
          <h2 style={sectionTitle}>Financial Summary — {fin.fiscalYear}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Revenue vs Budget</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Actual</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(ytd.revActual * 1_000_000)}</span>
              </div>
              <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${Math.min((ytd.revActual / ytd.revBudget) * 100, 100)}%`, background: '#2D8A4E', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#aaa' }}>Budget: {fmt(ytd.revBudget * 1_000_000)}</span>
                <span style={{ fontSize: 11, color: '#aaa' }}>{fmtPct((ytd.revActual / ytd.revBudget) * 100)}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>Expenses vs Budget</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Actual</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(ytd.expActual * 1_000_000)}</span>
              </div>
              <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${Math.min((ytd.expActual / ytd.expBudget) * 100, 100)}%`, background: ytd.expActual > ytd.expBudget ? '#C53030' : '#D69E2E', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#aaa' }}>Budget: {fmt(ytd.expBudget * 1_000_000)}</span>
                <span style={{ fontSize: 11, color: '#aaa' }}>{fmtPct((ytd.expActual / ytd.expBudget) * 100)}</span>
              </div>
            </div>
          </div>

          {/* Covenant Compliance */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, marginTop: 20 }}>Covenant Compliance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'DSCR', value: fmtDscr(ytd.dscr), min: fmtDscr(fin.covenants.dscrMinimum), ok: ytd.dscr >= fin.covenants.dscrMinimum },
              { label: 'Days Cash', value: String(ytd.daysCash), min: String(fin.covenants.daysCashMinimum), ok: ytd.daysCash >= fin.covenants.daysCashMinimum },
              { label: 'Current Ratio', value: ytd.currentRatio.toFixed(2), min: fin.covenants.currentRatioMinimum.toFixed(2), ok: ytd.currentRatio >= fin.covenants.currentRatioMinimum },
              { label: 'Net Asset', value: fmtPct(ytd.netAssetRatio), min: fmtPct(fin.covenants.netAssetMinimum), ok: ytd.netAssetRatio >= fin.covenants.netAssetMinimum },
            ].map(c => (
              <div key={c.label} style={{ ...metricBox, border: `1px solid ${c.ok ? '#C6F6D5' : '#FED7D7'}`, background: c.ok ? '#F0FFF4' : '#FFF5F5' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: c.ok ? '#2D8A4E' : '#C53030', fontFamily: font.mono }}>{c.value}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{c.label}</div>
                <div style={{ fontSize: 9, color: '#aaa', marginTop: 1 }}>Min: {c.min}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PAGE 4: Enrollment */}
        <div style={pageStyle}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: brand.gold, fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: font.mono }}>Section 3</div>
          <h2 style={sectionTitle}>Enrollment</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <div style={metricBox}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: font.mono }}>{fmtNum(enr.networkTotal)}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Current Enrollment</div>
            </div>
            <div style={metricBox}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: font.mono }}>{fmtNum(enr.targetEnrollment)}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Target</div>
            </div>
            <div style={{ ...metricBox, background: enrollGap > 0 ? '#FFF5F5' : '#F0FFF4' }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: font.mono, color: enrollGap > 0 ? '#C53030' : '#2D8A4E' }}>
                {enrollGap > 0 ? `-${enrollGap}` : `+${Math.abs(enrollGap)}`}
              </div>
              <div style={{ fontSize: 10, color: '#888' }}>Gap to Target</div>
            </div>
          </div>

          {/* Campus table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                {['Campus', 'Enrolled', 'Capacity', 'Utilization', 'Attrition'].map(h => (
                  <th key={h} style={{ textAlign: 'left' as const, padding: '6px 8px', fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enr.byCampus.map((c, i) => {
                const util = c.capacity > 0 ? (c.enrolled / c.capacity) * 100 : 0;
                return (
                  <tr key={c.campusId} style={{ borderBottom: `1px solid ${i < enr.byCampus.length - 1 ? '#F0F0F0' : 'transparent'}` }}>
                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>{c.short}</td>
                    <td style={{ padding: '6px 8px', fontFamily: font.mono }}>{fmtNum(c.enrolled)}</td>
                    <td style={{ padding: '6px 8px', fontFamily: font.mono }}>{c.capacity}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ fontFamily: font.mono, color: util >= 90 ? '#2D8A4E' : util >= 80 ? '#D69E2E' : '#C53030' }}>{fmtPct(util)}</span>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ fontFamily: font.mono, color: c.attrition > 12 ? '#C53030' : '#2D8A4E' }}>{fmtPct(c.attrition)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGE 5: Risk Register */}
        <div style={pageStyle}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: brand.gold, fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: font.mono }}>Section 4</div>
          <h2 style={sectionTitle}>Risk Register</h2>

          <p style={{ fontSize: 13, margin: '0 0 16px' }}>
            The risk register contains <strong>{risks.register.length} active risks</strong>: {tier1.length} Tier 1 (Board Focus),{' '}
            {risks.register.filter(r => r.tier.includes('Tier 2')).length} Tier 2 (Executive Team), and{' '}
            {risks.register.filter(r => r.tier.includes('Tier 3')).length} Tier 3 (Working Group).
            Last full review: {risks.lastReviewDate}.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                {['Risk', 'Tier', 'Score', 'Trend', 'Owner'].map(h => (
                  <th key={h} style={{ textAlign: 'left' as const, padding: '6px 8px', fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.register.map((r, i) => {
                const score = r.likelihood * r.impact;
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${i < risks.register.length - 1 ? '#F0F0F0' : 'transparent'}` }}>
                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                        background: r.tier.includes('Tier 1') ? '#FED7D7' : r.tier.includes('Tier 2') ? '#FEFCBF' : '#E2E8F0',
                        color: r.tier.includes('Tier 1') ? '#C53030' : r.tier.includes('Tier 2') ? '#975A16' : '#4A5568',
                      }}>{r.tier}</span>
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: font.mono, fontWeight: 600, color: score >= 20 ? '#C53030' : score >= 12 ? '#D69E2E' : '#2D8A4E' }}>{score}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11 }}>{r.trend}</td>
                    <td style={{ padding: '6px 8px', fontSize: 11, color: '#888' }}>{r.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGE 6: Fundraising */}
        <div style={pageStyle}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: brand.gold, fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: font.mono }}>Section 5</div>
          <h2 style={sectionTitle}>Fundraising & Development</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <div style={metricBox}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: font.mono, color: '#2D8A4E' }}>{fmt(fund.closedYTD)}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Closed YTD</div>
            </div>
            <div style={metricBox}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: font.mono }}>{fmt(fund.goal)}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Annual Goal</div>
            </div>
            <div style={metricBox}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: font.mono, color: brand.gold }}>{fmtPct((fund.closedYTD / fund.goal) * 100)}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Progress</div>
            </div>
          </div>

          <div style={{ height: 12, background: '#E2E8F0', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${Math.min((fund.closedYTD / fund.goal) * 100, 100)}%`, background: `linear-gradient(90deg, ${brand.gold}, ${brand.brass})`, borderRadius: 6 }} />
          </div>

          <p style={{ fontSize: 13, margin: '0 0 16px' }}>
            The active pipeline contains <strong>{fund.pipeline.length} opportunities</strong> with a weighted value of{' '}
            <strong>{fmt(fund.pipeline.reduce((s, p) => s + p.weighted, 0))}</strong>.
          </p>
        </div>

        {/* PAGE 7: Facilities */}
        <div style={pageStyle}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: brand.gold, fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 4, fontFamily: font.mono }}>Section 6</div>
          <h2 style={sectionTitle}>Facilities & Capital</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            <div style={metricBox}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: font.mono }}>{fac.capitalProjects.length}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Capital Projects</div>
            </div>
            <div style={metricBox}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: font.mono }}>{fac.workOrders.filter(w => w.status !== 'completed').length}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Open Work Orders</div>
            </div>
            <div style={{ ...metricBox, background: urgentWOs.length > 0 ? '#FFF5F5' : '#F0FFF4' }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: font.mono, color: urgentWOs.length > 0 ? '#C53030' : '#2D8A4E' }}>{urgentWOs.length}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Urgent</div>
            </div>
            <div style={metricBox}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: font.mono }}>{fmtCompact(fac.capitalProjects.reduce((s, p) => s + p.budget, 0))}</div>
              <div style={{ fontSize: 10, color: '#888' }}>Capital Budget</div>
            </div>
          </div>

          {activeEvents.length > 0 && (
            <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#C53030', textTransform: 'uppercase' as const, marginBottom: 4 }}>Emergency Projects</div>
              {activeEvents.map(e => (
                <div key={e.id} style={{ fontSize: 12, color: '#2D3748', padding: '2px 0' }}>
                  <strong>{e.title}</strong> — {e.campus} · ${e.estimatedCost.toLocaleString()} · {e.severity}
                </div>
              ))}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                {['Project', 'Campus', 'Budget', 'Status', 'Completion'].map(h => (
                  <th key={h} style={{ textAlign: 'left' as const, padding: '6px 8px', fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fac.capitalProjects.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${i < fac.capitalProjects.length - 1 ? '#F0F0F0' : 'transparent'}` }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '6px 8px', fontSize: 11 }}>{p.campus}</td>
                  <td style={{ padding: '6px 8px', fontFamily: font.mono }}>{fmtCompact(p.budget)}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                      background: p.status === 'on-track' ? '#C6F6D5' : p.status === 'at-risk' ? '#FEFCBF' : '#FED7D7',
                      color: p.status === 'on-track' ? '#2D8A4E' : p.status === 'at-risk' ? '#975A16' : '#C53030',
                    }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: font.mono }}>{p.completion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Classification Footer */}
        <div style={{ ...pageStyle, textAlign: 'center' as const, padding: '32px 48px' }}>
          <div style={{ width: 40, height: 2, background: brand.gold, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 1 }}>
            CONFIDENTIAL — FOR BOARD OF DIRECTORS ONLY
          </div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
            Generated by Slate Intelligence Platform · {dateStr} · {net.name}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Report Card ────────────────────────────────────────────────────────

function ReportCard({ report, onGenerate, onPreview, onView }: { report: ReportConfig; onGenerate: () => void; onPreview?: () => void; onView?: () => void }) {
  const [hover, setHover] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [downloadPulse, setDownloadPulse] = useState(false);

  const typeConfig = {
    deck: { color: modColors.reports, label: 'Presentation' },
    export: { color: statusColor.blue, label: 'Export' },
    package: { color: statusColor.amber, label: 'Package' },
  };
  const t = typeConfig[report.type];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      onGenerate();
    }, 2000);
  };

  const handleDownload = () => {
    setDownloadPulse(true);
    setTimeout(() => setDownloadPulse(false), 1500);
    // Simulate download - in production this would trigger actual PDF generation
    const blob = new Blob([`${report.name}\n\nGenerated by Slate Intelligence Platform\n${new Date().toLocaleDateString()}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? bg.hover : bg.card,
        borderRadius: radius.lg,
        border: `1px solid ${report.featured && hover ? `${brand.gold}60` : hover ? `${modColors.reports}40` : border.light}`,
        padding: 20, boxShadow: report.featured ? `0 2px 12px ${brand.gold}10` : shadow.sm,
        transition: transition.fast,
        position: 'relative',
      }}
    >
      {report.featured && (
        <div style={{
          position: 'absolute', top: -1, right: 20,
          padding: '3px 12px', borderRadius: `0 0 ${radius.sm} ${radius.sm}`,
          background: brand.gold, fontSize: '9px', fontWeight: 700,
          color: brand.navy, letterSpacing: 1, textTransform: 'uppercase',
        }}>Featured</div>
      )}

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: radius.md,
          background: `${modColors.reports}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: fontSize.xl, flexShrink: 0, color: modColors.reports,
        }}>
          {report.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: textColor.primary }}>{report.name}</div>
            <span style={{
              padding: '2px 8px', borderRadius: radius.full,
              background: `${t.color}10`, fontSize: '10px', color: t.color,
              fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>{t.label}</span>
          </div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, lineHeight: 1.5, marginBottom: 12 }}>
            {report.description}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                padding: '2px 8px', borderRadius: radius.full, background: bg.subtle,
                fontSize: '10px', fontFamily: font.mono, color: textColor.light,
              }}>{report.format}</span>
              {report.estimatedPages && (
                <span style={{ fontSize: '10px', color: textColor.light }}>~{report.estimatedPages} pages</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Post-generation actions */}
              {generated && (
                <>
                  {(report.featured && onView) && (
                    <button onClick={onView} style={{
                      padding: '6px 14px', borderRadius: radius.md,
                      background: `${modColors.reports}10`, border: `1px solid ${modColors.reports}30`,
                      color: modColors.reports, fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
                      cursor: 'pointer', transition: transition.fast,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 11 }}>◉</span> View Report
                    </button>
                  )}
                  <button onClick={handleDownload} style={{
                    padding: '6px 14px', borderRadius: radius.md,
                    background: downloadPulse ? statusColor.green : `${statusColor.blue}10`,
                    border: `1px solid ${downloadPulse ? statusColor.green : statusColor.blue}30`,
                    color: downloadPulse ? '#fff' : statusColor.blue,
                    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
                    cursor: 'pointer', transition: transition.fast,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 11 }}>{downloadPulse ? '✓' : '↓'}</span> {downloadPulse ? 'Downloaded' : 'Download'}
                  </button>
                </>
              )}
              {/* Pre-generation actions */}
              {!generated && report.featured && onPreview && (
                <button onClick={onPreview} style={{
                  padding: '6px 14px', borderRadius: radius.md,
                  background: 'transparent', border: `1px solid ${modColors.reports}40`,
                  color: modColors.reports, fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
                  cursor: 'pointer', transition: transition.fast,
                }}>Preview</button>
              )}
              <button onClick={generated ? handleGenerate : handleGenerate} disabled={generating} style={{
                padding: '6px 16px', borderRadius: radius.md,
                background: generating ? textColor.muted : generated ? statusColor.green : modColors.reports,
                color: '#fff', border: 'none',
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
                transition: transition.fast,
              }}>
                {generating ? 'Generating...' : generated ? '✓ Generated' : 'Generate'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {report.modules.map(m => (
              <span key={m} style={{
                padding: '1px 6px', borderRadius: radius.full,
                background: `${brand.brass}08`, fontSize: '9px', color: textColor.light,
                fontFamily: font.mono,
              }}>{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Data Freshness Summary ─────────────────────────────────────────────

function DataFreshnessSummary() {
  const fin = useFinancials();
  const enr = useEnrollment();
  const risks = useRisks();
  const fund = useFundraising();
  const fac = useFacilities();
  const civic = useCivic();
  const staff = useStaff();

  const sources = [
    { name: 'Financials', updated: fin.lastUpdated },
    { name: 'Enrollment', updated: enr.lastUpdated },
    { name: 'Risk Register', updated: risks.lastUpdated },
    { name: 'Fundraising', updated: fund.lastUpdated },
    { name: 'Facilities', updated: fac.lastUpdated },
    { name: 'Civic', updated: civic.lastUpdated },
    { name: 'Staff', updated: staff.lastUpdated },
  ];

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      padding: 20, boxShadow: shadow.sm,
    }}>
      <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
        Data Freshness
      </div>
      {sources.map((s, i) => {
        const age = Math.floor((Date.now() - new Date(s.updated).getTime()) / (1000 * 60 * 60 * 24));
        const color = age <= 7 ? statusColor.green : age <= 30 ? statusColor.amber : statusColor.red;
        return (
          <div key={s.name} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
            borderBottom: i < sources.length - 1 ? `1px solid ${border.light}` : 'none',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: fontSize.xs, color: textColor.secondary }}>{s.name}</div>
            <div style={{ fontSize: '10px', fontFamily: font.mono, color: textColor.light }}>{age}d</div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REPORTS APP
// ═══════════════════════════════════════════════════════════════════════════

export default function ReportsApp() {
  const [filterType, setFilterType] = useState<string>('all');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const { activeEvents } = useEmergencies();

  const filteredReports = filterType === 'all'
    ? REPORTS
    : REPORTS.filter(r => r.type === filterType);

  return (
    <div>
      <ModuleHeader
        title="Reports"
        subtitle="Board-Ready Intelligence Output"
        accent={modColors.reports}
      />

      {/* Featured: Board Deck with Preview */}
      <Section title="Featured Report">
        <ReportCard
          report={REPORTS[0]}
          onGenerate={() => setGeneratedCount(c => c + 1)}
          onPreview={() => setShowPreview(true)}
          onView={() => setShowPreview(true)}
        />
      </Section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginTop: 8 }}>
        {/* Left: Report Catalog */}
        <div>
          {/* Filter Bar */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 16,
            padding: '10px 16px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
          }}>
            <span style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4, alignSelf: 'center' }}>Type:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'deck', label: 'Presentations' },
              { id: 'package', label: 'Packages' },
              { id: 'export', label: 'Exports' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilterType(f.id)} style={{
                padding: '4px 10px', borderRadius: radius.full,
                border: `1px solid ${filterType === f.id ? modColors.reports : border.light}`,
                background: filterType === f.id ? `${modColors.reports}15` : 'transparent',
                color: filterType === f.id ? modColors.reports : textColor.muted,
                fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
              }}>{f.label}</button>
            ))}
          </div>

          {/* Report Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredReports.slice(1).map(r => (
              <ReportCard key={r.id} report={r} onGenerate={() => setGeneratedCount(c => c + 1)} />
            ))}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Stats */}
          <div style={{
            background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
            padding: 20, boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
              Report Center
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: 12, background: bg.subtle, borderRadius: radius.md }}>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: modColors.reports }}>{REPORTS.length}</div>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Templates</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: bg.subtle, borderRadius: radius.md }}>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: statusColor.green }}>{generatedCount}</div>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Generated</div>
              </div>
            </div>
            {activeEvents.length > 0 && (
              <div style={{
                marginTop: 12, padding: '8px 12px', background: `${statusColor.red}08`,
                border: `1px solid ${statusColor.red}20`, borderRadius: radius.md,
              }}>
                <div style={{ fontSize: '10px', fontWeight: fontWeight.bold, color: statusColor.red }}>
                  {activeEvents.length} EMERGENCY ACTIVE
                </div>
                <div style={{ fontSize: '10px', color: textColor.muted, marginTop: 2 }}>
                  Emergency data will be included in all generated reports.
                </div>
              </div>
            )}
          </div>

          <DataFreshnessSummary />
        </div>
      </div>

      {/* Board Report Preview Modal */}
      {showPreview && <BoardReportPreview onClose={() => setShowPreview(false)} />}
    </div>
  );
}
