/**
 * Slate v3 — Ledger
 * ═══════════════════════════════════════════════════
 * Financial Intelligence Engine — Moonshot Edition
 *
 * Budget vs. Actual · Covenant Monitor · Interactive Scenario Modeling
 * Support Team Spend · Compensation Intelligence · AI Financial Analysis
 *
 * CEO sees the full financial picture. Principal sees their campus allocation.
 *
 * KEY CHANGES from v2:
 * - Support Team department tracking
 * - Scenario tab now has INTERACTIVE sliders for what-if modeling
 * - Deep drill-down on every financial metric
 * - Covenant stress testing with scenario integration
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useFinancials, useEnrollment, useNetwork, useRole } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, Section, AIInsight, StatusBadge, EmptyState } from '../../components/Card';
import { fmt, fmtNum, fmtPct, fmtDscr, fmtFull, fmtCompact } from '../../core/formatters';
import {
  bg, text, brand, border, status, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors, chart,
} from '../../core/theme';

// ─── Tab System ──────────────────────────────────────────────────────────

type LedgerTab = 'overview' | 'revenue' | 'expenses' | 'covenants' | 'scenarios' | 'support';

const TABS: { id: LedgerTab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',      icon: '◉' },
  { id: 'revenue',   label: 'Revenue',       icon: '▲' },
  { id: 'expenses',  label: 'Expenses',      icon: '▼' },
  { id: 'covenants', label: 'Covenants',     icon: '◇' },
  { id: 'scenarios', label: 'Scenarios',     icon: '◈' },
  { id: 'support',   label: 'Support Team',  icon: '▤' },
];

// ─── Shared Styles ───────────────────────────────────────────────────────

const th: React.CSSProperties = {
  fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted,
  textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 12px',
  borderBottom: `2px solid ${border.light}`, textAlign: 'left',
};
const td: React.CSSProperties = {
  fontSize: fontSize.sm, color: text.primary, padding: '10px 12px',
  borderBottom: `1px solid ${border.light}`, fontFamily: font.mono,
};
const tdL: React.CSSProperties = { ...td, fontFamily: font.sans, fontWeight: fontWeight.medium };

// ─── Reusable Components ─────────────────────────────────────────────────

function Bar({ value, max, color, h = 8, showLabel = false }: { value: number; max: number; color: string; h?: number; showLabel?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{ flex: 1, height: h, background: `${color}15`, borderRadius: h, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: h, transition: transition.smooth }} />
      </div>
      {showLabel && <span style={{ fontSize: fontSize.xs, color: text.muted, fontFamily: font.mono, minWidth: 40, textAlign: 'right' }}>{fmtPct(pct)}</span>}
    </div>
  );
}

function Spark({ data, color, w = 120, h = 32 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return <svg width={w} height={h} style={{ display: 'block' }}><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function VarCell({ actual, budget, invert = false }: { actual: number; budget: number; invert?: boolean }) {
  const diff = actual - budget;
  const isGood = invert ? diff < 0 : diff >= 0;
  return (
    <td style={{ ...td, color: Math.abs(diff) < 0.05 ? text.muted : isGood ? status.green : status.red, fontWeight: fontWeight.semibold }}>
      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}M
    </td>
  );
}

// ─── Interactive Slider ──────────────────────────────────────────────────

function Slider({ label, value, min, max, step, unit, color, onChange, description }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; color: string; onChange: (v: number) => void; description?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: fontSize.sm, color: text.secondary, fontWeight: fontWeight.medium }}>{label}</span>
        <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color }}>{value.toFixed(unit === '%' ? 1 : 0)}{unit}</span>
      </div>
      {description && <div style={{ fontSize: fontSize.xs, color: text.light, marginBottom: 6 }}>{description}</div>}
      <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: `${color}15`, borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.1s' }} />
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: 'absolute', left: 0, right: 0, width: '100%', height: 24, opacity: 0, cursor: 'pointer', margin: 0 }} />
        <div style={{ position: 'absolute', left: `calc(${pct}% - 8px)`, width: 16, height: 16, borderRadius: '50%',
          background: color, border: `2px solid ${bg.card}`, boxShadow: `0 0 6px ${color}40`, pointerEvents: 'none', transition: 'left 0.1s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: '9px', color: text.light }}>{min}{unit}</span>
        <span style={{ fontSize: '9px', color: text.light }}>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Gauge Component ─────────────────────────────────────────────────────

function Gauge({ value, min, max, thresholds, label, format }: {
  value: number; min: number; max: number; thresholds: { danger: number; warning: number }; label: string; format: (n: number) => string;
}) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = -90 + pct * 180;
  const color = value < thresholds.danger ? status.red : value < thresholds.warning ? status.amber : status.green;
  const r = 50, cx = 60, cy = 55;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={120} height={70} viewBox="0 0 120 70">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={border.light} strokeWidth={8} strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={`${pct * Math.PI * r} ${Math.PI * r}`} />
        <line x1={cx} y1={cy} x2={cx + 35 * Math.cos((angle * Math.PI) / 180)} y2={cy + 35 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill={color} />
      </svg>
      <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontFamily: font.mono, color, marginTop: -4 }}>{format(value)}</div>
      <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const fin = useFinancials();
  const ytd = fin.ytdSummary;
  const bud = fin.budget;
  const actuals = fin.actuals;

  const ytdRevActual = actuals.reduce((s, m) => s + m.revenue.total, 0);
  const ytdExpActual = actuals.reduce((s, m) => s + m.expenses.total, 0);
  const ytdSurplus = ytdRevActual - ytdExpActual;
  const monthsElapsed = actuals.length;
  const ytdRevBudget = (bud.revenue.total / 12) * monthsElapsed;
  const ytdExpBudget = (bud.expenses.total / 12) * monthsElapsed;
  const revTrend = actuals.map(m => m.revenue.total);
  const expTrend = actuals.map(m => m.expenses.total);

  return (
    <div>
      {/* 5-KPI Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="YTD Revenue" value={`$${ytdRevActual.toFixed(1)}M`} subValue={`Budget: $${ytdRevBudget.toFixed(1)}M`}
          trend={{ value: `${ytdRevActual >= ytdRevBudget ? '+' : ''}${(ytdRevActual - ytdRevBudget).toFixed(1)}M`, positive: ytdRevActual >= ytdRevBudget }}
          icon="▲" accent={modColors.ledger} />
        <KPICard label="YTD Expenses" value={`$${ytdExpActual.toFixed(1)}M`} subValue={`Budget: $${ytdExpBudget.toFixed(1)}M`}
          trend={{ value: `${ytdExpActual <= ytdExpBudget ? 'Under' : 'Over'} by $${Math.abs(ytdExpActual - ytdExpBudget).toFixed(1)}M`, positive: ytdExpActual <= ytdExpBudget }}
          icon="▼" accent={status.amber} />
        <KPICard label="YTD Surplus" value={`$${ytdSurplus.toFixed(1)}M`} subValue={`Annual target: $${bud.netSurplus.toFixed(1)}M`}
          trend={{ value: ytdSurplus >= 0 ? 'Surplus' : 'Deficit', positive: ytdSurplus >= 0 }}
          icon="◆" accent={ytdSurplus >= 0 ? status.green : status.red} />
        <KPICard label="Days Cash" value={`${ytd.daysCash}`} subValue={`Target: ${bud.daysCashTarget} days`}
          trend={{ value: ytd.daysCash >= bud.daysCashTarget ? 'Above target' : 'Below target', positive: ytd.daysCash >= bud.daysCashTarget }}
          icon="◎" accent={ytd.daysCash >= bud.daysCashTarget ? status.green : status.amber} />
        <KPICard label="DSCR" value={fmtDscr(ytd.dscr)} subValue={`Min: ${fmtDscr(fin.covenants.dscrMinimum)}`}
          trend={{ value: ytd.dscr >= fin.covenants.dscrMinimum ? 'Compliant' : 'VIOLATION', positive: ytd.dscr >= fin.covenants.dscrMinimum }}
          accent={ytd.dscr >= fin.covenants.dscrMinimum ? status.green : status.red} />
      </div>

      {/* Revenue vs Expense Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card accent={modColors.ledger}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Monthly Revenue Trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Spark data={revTrend} color={status.green} w={200} h={48} />
            <div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>Latest: ${actuals[actuals.length - 1]?.revenue.total.toFixed(1)}M</div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>{monthsElapsed}-month avg: ${(ytdRevActual / monthsElapsed).toFixed(1)}M</div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Month</th><th style={{ ...th, textAlign: 'right' }}>CPS</th>
              <th style={{ ...th, textAlign: 'right' }}>Other Public</th><th style={{ ...th, textAlign: 'right' }}>Philanthropy</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr></thead>
            <tbody>{actuals.map(m => (
              <tr key={m.month}>
                <td style={tdL}>{m.month}</td>
                <td style={{ ...td, textAlign: 'right' }}>{m.revenue.cps.toFixed(1)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{m.revenue.otherPublic.toFixed(1)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{m.revenue.philanthropy.toFixed(1)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>{m.revenue.total.toFixed(1)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>

        <Card accent={status.amber}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Monthly Expense Trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Spark data={expTrend} color={status.red} w={200} h={48} />
            <div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>Latest: ${actuals[actuals.length - 1]?.expenses.total.toFixed(1)}M</div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>{monthsElapsed}-month avg: ${(ytdExpActual / monthsElapsed).toFixed(1)}M</div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Month</th><th style={{ ...th, textAlign: 'right' }}>Personnel</th>
              <th style={{ ...th, textAlign: 'right' }}>Direct</th><th style={{ ...th, textAlign: 'right' }}>Occupancy</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr></thead>
            <tbody>{actuals.map(m => (
              <tr key={m.month}>
                <td style={tdL}>{m.month}</td>
                <td style={{ ...td, textAlign: 'right' }}>{m.expenses.personnel.toFixed(1)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{m.expenses.directStudent.toFixed(1)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{m.expenses.occupancy.toFixed(1)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>{m.expenses.total.toFixed(1)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </div>

      {/* Budget Architecture */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>FY26 Budget Architecture</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: 12 }}>Revenue — ${bud.revenue.total.toFixed(1)}M</div>
            {[
              { label: 'CPS Per-Pupil', value: bud.revenue.cps, pct: bud.revenue.cps / bud.revenue.total * 100 },
              { label: 'Other Public', value: bud.revenue.otherPublic, pct: bud.revenue.otherPublic / bud.revenue.total * 100 },
              { label: 'Philanthropy', value: bud.revenue.philanthropy, pct: bud.revenue.philanthropy / bud.revenue.total * 100 },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: fontSize.sm, color: text.secondary }}>{r.label}</span>
                  <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: text.primary }}>${r.value.toFixed(1)}M ({fmtPct(r.pct)})</span>
                </div>
                <Bar value={r.value} max={bud.revenue.total} color={status.green} h={6} />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: 12 }}>Expenses — ${bud.expenses.total.toFixed(1)}M</div>
            {[
              { label: 'Personnel', value: bud.expenses.personnel, pct: bud.expenses.personnel / bud.expenses.total * 100 },
              { label: 'Direct Student', value: bud.expenses.directStudent, pct: bud.expenses.directStudent / bud.expenses.total * 100 },
              { label: 'Occupancy', value: bud.expenses.occupancy, pct: bud.expenses.occupancy / bud.expenses.total * 100 },
              { label: 'Other', value: bud.expenses.other, pct: bud.expenses.other / bud.expenses.total * 100 },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: fontSize.sm, color: text.secondary }}>{r.label}</span>
                  <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: text.primary }}>${r.value.toFixed(1)}M ({fmtPct(r.pct)})</span>
                </div>
                <Bar value={r.value} max={bud.expenses.total} color={status.red} h={6} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `2px solid ${border.light}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><span style={{ fontSize: fontSize.sm, color: text.muted }}>EBITDA: </span><span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: bud.ebitda >= 0 ? status.green : status.red }}>${bud.ebitda.toFixed(1)}M</span></div>
          <div><span style={{ fontSize: fontSize.sm, color: text.muted }}>Net Surplus: </span><span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: bud.netSurplus >= 0 ? status.green : status.red }}>${bud.netSurplus.toFixed(1)}M</span></div>
          <div><span style={{ fontSize: fontSize.sm, color: text.muted }}>Contingency: </span><span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>${bud.contingency.toFixed(1)}M</span></div>
        </div>
      </Card>

      <AIInsight label="Slate Financial Intelligence"
        content={`Through ${monthsElapsed} months of FY26, Veritas is tracking $${(ytdRevActual - ytdRevBudget).toFixed(1)}M ${ytdRevActual >= ytdRevBudget ? 'ahead of' : 'behind'} revenue budget and $${Math.abs(ytdExpActual - ytdExpBudget).toFixed(1)}M ${ytdExpActual <= ytdExpBudget ? 'under' : 'over'} on expenses. The YTD surplus of $${ytdSurplus.toFixed(1)}M provides a cushion against the budgeted annual deficit of $${Math.abs(bud.netSurplus).toFixed(1)}M. Days cash at ${ytd.daysCash} is ${(ytd.daysCash / bud.daysCashTarget * 100).toFixed(0)}% of the ${bud.daysCashTarget}-day target — a strong liquidity position. The DSCR of ${fmtDscr(ytd.dscr)} comfortably exceeds the bond document minimum of ${fmtDscr(fin.covenants.dscrBondDoc)}. Key watch: December philanthropy spike ($1.7M) inflated the surplus; January's $0.4M philanthropy is more typical. Monitor whether Q3-Q4 giving sustains the YTD advantage.`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REVENUE TAB
// ═══════════════════════════════════════════════════════════════════════════

function RevenueTab() {
  const fin = useFinancials();
  const bud = fin.budget;
  const actuals = fin.actuals;
  const historical = fin.historical;

  const ytdCPS = actuals.reduce((s, m) => s + m.revenue.cps, 0);
  const ytdOther = actuals.reduce((s, m) => s + m.revenue.otherPublic, 0);
  const ytdPhil = actuals.reduce((s, m) => s + m.revenue.philanthropy, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="CPS Revenue (YTD)" value={`$${ytdCPS.toFixed(1)}M`} subValue={`Annual budget: $${bud.revenue.cps.toFixed(1)}M`} accent={modColors.ledger} />
        <KPICard label="Other Public (YTD)" value={`$${ytdOther.toFixed(1)}M`} subValue={`Annual budget: $${bud.revenue.otherPublic.toFixed(1)}M`} accent={chart.secondary} />
        <KPICard label="Philanthropy (YTD)" value={`$${ytdPhil.toFixed(1)}M`} subValue={`Annual budget: $${bud.revenue.philanthropy.toFixed(1)}M`} accent={chart.tertiary} />
        <KPICard label="Revenue Concentration" value={`${(bud.revenue.cps / bud.revenue.total * 100).toFixed(0)}%`} subValue="CPS as % of total revenue"
          trend={{ value: 'High concentration risk', positive: false }} accent={status.amber} />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Revenue Growth History</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Year</th><th style={{ ...th, textAlign: 'right' }}>Enrollment</th>
            <th style={{ ...th, textAlign: 'right' }}>CPS Revenue</th><th style={{ ...th, textAlign: 'right' }}>Total Revenue</th>
            <th style={{ ...th, textAlign: 'right' }}>Rev/Pupil</th><th style={{ ...th, textAlign: 'right' }}>YoY Growth</th>
          </tr></thead>
          <tbody>{historical.map((h, i) => {
            const prevRev = i > 0 ? historical[i - 1].totalRevenue : null;
            const growth = prevRev ? ((h.totalRevenue - prevRev) / prevRev * 100) : null;
            return (
              <tr key={h.year}>
                <td style={tdL}>{h.year}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtNum(h.enrollment)}</td>
                <td style={{ ...td, textAlign: 'right' }}>${h.cpsRevenue.toFixed(1)}M</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>${h.totalRevenue.toFixed(1)}M</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtFull(Math.round(h.totalRevenue * 1000000 / h.enrollment))}</td>
                <td style={{ ...td, textAlign: 'right', color: growth && growth >= 0 ? status.green : status.red }}>
                  {growth !== null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : '—'}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      {/* Revenue Concentration Risk */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Revenue Concentration Analysis</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ width: 120, height: 120, position: 'relative' }}>
            <svg width={120} height={120} viewBox="0 0 120 120">
              {(() => {
                const slices = [
                  { pct: bud.revenue.cps / bud.revenue.total, color: modColors.ledger, label: 'CPS' },
                  { pct: bud.revenue.otherPublic / bud.revenue.total, color: chart.secondary, label: 'Other' },
                  { pct: bud.revenue.philanthropy / bud.revenue.total, color: chart.tertiary, label: 'Phil.' },
                ];
                let cum = 0;
                return slices.map((s, i) => {
                  const start = cum * 360;
                  cum += s.pct;
                  const end = cum * 360;
                  const r = 50, cx = 60, cy = 60;
                  const startRad = (start - 90) * Math.PI / 180;
                  const endRad = (end - 90) * Math.PI / 180;
                  const large = s.pct > 0.5 ? 1 : 0;
                  const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
                  return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={s.color} opacity={0.85} />;
                });
              })()}
              <circle cx={60} cy={60} r={25} fill={bg.card} />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            {[
              { label: 'CPS Per-Pupil', pct: bud.revenue.cps / bud.revenue.total * 100, color: modColors.ledger, risk: 'HIGH' },
              { label: 'Other Public', pct: bud.revenue.otherPublic / bud.revenue.total * 100, color: chart.secondary, risk: 'LOW' },
              { label: 'Philanthropy', pct: bud.revenue.philanthropy / bud.revenue.total * 100, color: chart.tertiary, risk: 'MEDIUM' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                <span style={{ fontSize: fontSize.sm, color: text.secondary, flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold, color: text.primary }}>{fmtPct(item.pct)}</span>
                <StatusBadge label={item.risk} variant={item.risk === 'HIGH' ? 'red' : item.risk === 'MEDIUM' ? 'amber' : 'green'} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <AIInsight label="Revenue Intelligence"
        content={`Veritas revenue has grown from $83.5M in FY20 to a budgeted $138.3M in FY26 — a ${((138.3 / 83.5 - 1) * 100).toFixed(0)}% increase driven primarily by enrollment growth and per-pupil rate increases. The critical dependency: CPS per-pupil revenue represents ${(bud.revenue.cps / bud.revenue.total * 100).toFixed(0)}% of total revenue. This concentration creates existential risk if per-pupil rates flatten or decline. Philanthropy at $${bud.revenue.philanthropy.toFixed(1)}M (${(bud.revenue.philanthropy / bud.revenue.total * 100).toFixed(1)}% of revenue) is healthy for a network this size but shows significant monthly volatility — December's $1.7M vs January's $0.4M. Recommendation: Build a 3-year revenue diversification strategy targeting 75% CPS dependency by FY29.`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSES TAB
// ═══════════════════════════════════════════════════════════════════════════

function ExpensesTab() {
  const fin = useFinancials();
  const bud = fin.budget;
  const actuals = fin.actuals;
  const historical = fin.historical;

  const ytdPersonnel = actuals.reduce((s, m) => s + m.expenses.personnel, 0);
  const ytdDirect = actuals.reduce((s, m) => s + m.expenses.directStudent, 0);
  const ytdOccupancy = actuals.reduce((s, m) => s + m.expenses.occupancy, 0);
  const ytdTotal = actuals.reduce((s, m) => s + m.expenses.total, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Personnel (YTD)" value={`$${ytdPersonnel.toFixed(1)}M`} subValue={`${(ytdPersonnel / ytdTotal * 100).toFixed(0)}% of total`} accent={modColors.ledger} />
        <KPICard label="Direct Student (YTD)" value={`$${ytdDirect.toFixed(1)}M`} subValue={`Annual budget: $${bud.expenses.directStudent.toFixed(1)}M`} accent={chart.tertiary} />
        <KPICard label="Occupancy (YTD)" value={`$${ytdOccupancy.toFixed(1)}M`} subValue={`Annual budget: $${bud.expenses.occupancy.toFixed(1)}M`} accent={chart.quaternary} />
        <KPICard label="Cost Per Student" value={fmtFull(Math.round(bud.expenses.total * 1000000 / bud.enrollment))} subValue={`${fmtNum(bud.enrollment)} budgeted students`} accent={status.amber} />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Expense Growth History</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Year</th><th style={{ ...th, textAlign: 'right' }}>Personnel</th>
            <th style={{ ...th, textAlign: 'right' }}>Total Expenses</th><th style={{ ...th, textAlign: 'right' }}>Personnel %</th>
            <th style={{ ...th, textAlign: 'right' }}>Cost/Student</th><th style={{ ...th, textAlign: 'right' }}>YoY Growth</th>
          </tr></thead>
          <tbody>{historical.map((h, i) => {
            const prevExp = i > 0 ? historical[i - 1].totalExpenses : null;
            const growth = prevExp ? ((h.totalExpenses - prevExp) / prevExp * 100) : null;
            return (
              <tr key={h.year}>
                <td style={tdL}>{h.year}</td>
                <td style={{ ...td, textAlign: 'right' }}>${h.personnel.toFixed(1)}M</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>${h.totalExpenses.toFixed(1)}M</td>
                <td style={{ ...td, textAlign: 'right' }}>{(h.personnel / h.totalExpenses * 100).toFixed(0)}%</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtFull(Math.round(h.totalExpenses * 1000000 / h.enrollment))}</td>
                <td style={{ ...td, textAlign: 'right', color: growth && growth > 0 ? status.red : status.green }}>
                  {growth !== null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : '—'}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      <AIInsight label="Expense Intelligence"
        content={`Total expenses have grown from $82.1M (FY20) to a budgeted $131.9M (FY26) — a ${((131.9 / 82.1 - 1) * 100).toFixed(0)}% increase. Personnel consistently represents 70-85% of total expenses, which is typical for charter networks. The FY23 spike to $113.5M (vs $107.8M revenue) created a -$1.7M deficit — a cautionary year. Cost per student at ${fmtFull(Math.round(bud.expenses.total * 1000000 / bud.enrollment))} is competitive for a Chicago charter. The key structural challenge: expense growth is outpacing revenue growth in the reasonable scenario, creating a potential crossover point in FY28 where expenses exceed revenue. This is the single most important financial trend for the board to understand.`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COVENANTS TAB
// ═══════════════════════════════════════════════════════════════════════════

function CovenantsTab() {
  const fin = useFinancials();
  const ytd = fin.ytdSummary;
  const cov = fin.covenants;

  const covenantItems = [
    { name: 'Debt Service Coverage Ratio (DSCR)', actual: ytd.dscr, minimum: cov.dscrMinimum, bondDoc: cov.dscrBondDoc, format: fmtDscr, description: 'Measures ability to service debt obligations. Calculated as (Net Income + Depreciation + Interest) / Annual Debt Service.', isRatio: true },
    { name: 'Days Cash on Hand', actual: ytd.daysCash, minimum: cov.daysCashMinimum, bondDoc: null as number | null, format: (n: number) => `${n} days`, description: 'Number of days the organization can operate using only available cash reserves.', isRatio: false },
    { name: 'Current Ratio', actual: ytd.currentRatio, minimum: cov.currentRatioMinimum, bondDoc: null as number | null, format: (n: number) => `${n.toFixed(2)}x`, description: 'Current assets divided by current liabilities. Measures short-term liquidity.', isRatio: true },
    { name: 'Net Asset Ratio', actual: ytd.netAssetRatio, minimum: cov.netAssetMinimum, bondDoc: null as number | null, format: (n: number) => `${n.toFixed(1)}%`, description: 'Unrestricted net assets as a percentage of total assets. Measures long-term financial health.', isRatio: false },
  ];

  return (
    <div>
      {/* Covenant Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card style={{ textAlign: 'center' }}>
          <Gauge value={ytd.dscr} min={0} max={5} thresholds={{ danger: cov.dscrMinimum, warning: cov.dscrMinimum * 1.5 }} label="DSCR" format={fmtDscr} />
          <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>Min: {fmtDscr(cov.dscrMinimum)} · Bond: {fmtDscr(cov.dscrBondDoc)}</div>
        </Card>
        <Card style={{ textAlign: 'center' }}>
          <Gauge value={ytd.daysCash} min={0} max={200} thresholds={{ danger: cov.daysCashMinimum, warning: cov.daysCashMinimum * 1.5 }} label="Days Cash" format={(n) => `${n}d`} />
          <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>Min: {cov.daysCashMinimum} days</div>
        </Card>
        <Card style={{ textAlign: 'center' }}>
          <Gauge value={ytd.currentRatio} min={0} max={3} thresholds={{ danger: cov.currentRatioMinimum, warning: cov.currentRatioMinimum * 1.5 }} label="Current Ratio" format={(n) => `${n.toFixed(2)}x`} />
          <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>Min: {cov.currentRatioMinimum.toFixed(2)}x</div>
        </Card>
        <Card style={{ textAlign: 'center' }}>
          <Gauge value={ytd.netAssetRatio} min={0} max={40} thresholds={{ danger: cov.netAssetMinimum, warning: cov.netAssetMinimum * 1.5 }} label="Net Asset Ratio" format={(n) => `${n.toFixed(1)}%`} />
          <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>Min: {cov.netAssetMinimum.toFixed(1)}%</div>
        </Card>
      </div>

      {/* Detailed Covenant Cards */}
      {covenantItems.map(c => {
        const passing = c.actual >= c.minimum;
        const cushion = ((c.actual - c.minimum) / c.minimum * 100);
        return (
          <Card key={c.name} style={{ marginBottom: 16 }} accent={passing ? status.green : status.red}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary }}>{c.name}</span>
                  <StatusBadge label={passing ? 'COMPLIANT' : 'VIOLATION'} variant={passing ? 'green' : 'red'} />
                </div>
                <div style={{ fontSize: fontSize.sm, color: text.muted, marginBottom: 12 }}>{c.description}</div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div>
                    <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual</div>
                    <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: passing ? status.green : status.red }}>{c.format(c.actual)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Minimum</div>
                    <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>{c.format(c.minimum)}</div>
                  </div>
                  {c.bondDoc && (
                    <div>
                      <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bond Doc</div>
                      <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.secondary }}>{c.format(c.bondDoc)}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cushion</div>
                    <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: passing ? status.green : status.red }}>{cushion.toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Covenant Stress Test */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Covenant Stress Test — Scenario Impact</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Metric</th><th style={{ ...th, textAlign: 'center' }}>Current</th>
            <th style={{ ...th, textAlign: 'center', color: status.green }}>Optimistic FY31</th>
            <th style={{ ...th, textAlign: 'center', color: status.blue }}>Reasonable FY31</th>
            <th style={{ ...th, textAlign: 'center', color: status.red }}>Pessimistic FY31</th>
            <th style={{ ...th, textAlign: 'center' }}>Minimum</th>
          </tr></thead>
          <tbody>
            {(() => {
              const optEnd = fin.scenarios.optimistic[fin.scenarios.optimistic.length - 1];
              const resEnd = fin.scenarios.reasonable[fin.scenarios.reasonable.length - 1];
              const pesEnd = fin.scenarios.pessimistic[fin.scenarios.pessimistic.length - 1];
              return [
                { name: 'DSCR', current: ytd.dscr, opt: optEnd.dscr, res: resEnd.dscr, pes: pesEnd.dscr, min: cov.dscrMinimum, fmt: fmtDscr },
              ].map(row => (
                <tr key={row.name}>
                  <td style={tdL}>{row.name}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: fontWeight.semibold }}>{row.fmt(row.current)}</td>
                  <td style={{ ...td, textAlign: 'center', color: row.opt >= row.min ? status.green : status.red }}>{row.fmt(row.opt)}</td>
                  <td style={{ ...td, textAlign: 'center', color: row.res >= row.min ? status.blue : status.red }}>{row.fmt(row.res)}</td>
                  <td style={{ ...td, textAlign: 'center', color: row.pes >= row.min ? status.green : status.red, fontWeight: fontWeight.bold }}>{row.fmt(row.pes)}</td>
                  <td style={{ ...td, textAlign: 'center', color: text.muted }}>{row.fmt(row.min)}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
        <div style={{ marginTop: 12, padding: 12, background: status.redBg, border: `1px solid ${status.redBorder}`, borderRadius: radius.md }}>
          <div style={{ fontSize: fontSize.sm, color: status.red, fontWeight: fontWeight.semibold }}>⚠ Pessimistic Scenario Warning</div>
          <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 4 }}>Under the pessimistic scenario, DSCR falls below the minimum covenant threshold by FY28, triggering a technical default on bond obligations. This scenario requires enrollment to decline by 5%+ annually with no expense mitigation.</div>
        </div>
      </Card>

      <AIInsight label="Covenant Intelligence"
        content={`All four financial covenants are in compliance. The DSCR of ${fmtDscr(ytd.dscr)} provides a ${((ytd.dscr - cov.dscrMinimum) / cov.dscrMinimum * 100).toFixed(0)}% cushion above the ${fmtDscr(cov.dscrMinimum)} minimum and exceeds the bond document threshold of ${fmtDscr(cov.dscrBondDoc)}. Days cash at ${ytd.daysCash} is ${((ytd.daysCash / cov.daysCashMinimum - 1) * 100).toFixed(0)}% above the ${cov.daysCashMinimum}-day minimum — the strongest liquidity position in four years. The current ratio of ${ytd.currentRatio.toFixed(2)}x and net asset ratio of ${ytd.netAssetRatio.toFixed(1)}% both reflect healthy balance sheet positioning. Recommendation: Use the covenant cushion strategically — this is the window to invest in compensation competitiveness before the CPS gap widens further.`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTIVE SCENARIOS TAB (MOONSHOT)
// ═══════════════════════════════════════════════════════════════════════════

function ScenariosTab() {
  const fin = useFinancials();
  const [activeScenario, setActiveScenario] = useState<'optimistic' | 'reasonable' | 'pessimistic' | 'custom'>('reasonable');
  const scenarios = fin.scenarios;
  const historical = fin.historical;

  // Custom scenario sliders
  const [enrollGrowth, setEnrollGrowth] = useState(0);
  const [revGrowth, setRevGrowth] = useState(3.5);
  const [expGrowth, setExpGrowth] = useState(4.0);
  const [philGrowth, setPhilGrowth] = useState(2.0);

  const scenarioColors: Record<string, string> = { optimistic: status.green, reasonable: status.blue, pessimistic: status.red, custom: chart.tertiary };
  const scenarioLabels: Record<string, string> = { optimistic: 'Optimistic', reasonable: 'Reasonable', pessimistic: 'Pessimistic', custom: 'Custom What-If' };

  // Generate custom scenario from sliders
  const customScenario = useMemo(() => {
    const base = fin.budget;
    const years: typeof scenarios.reasonable = [];
    let enr = base.enrollment;
    let rev = base.revenue.total;
    let exp = base.expenses.total;
    for (let i = 0; i < 5; i++) {
      enr = Math.round(enr * (1 + enrollGrowth / 100));
      rev = rev * (1 + revGrowth / 100);
      exp = exp * (1 + expGrowth / 100);
      const ebitda = rev - exp;
      const netSurplus = ebitda - 1.8; // debt service approx
      const dscr = ebitda > 0 ? ebitda / 1.8 : ebitda / 1.8;
      years.push({
        year: `FY${27 + i}`,
        enrollmentC1: enr,
        totalRevenue: Math.round(rev * 10) / 10,
        totalExpenses: Math.round(exp * 10) / 10,
        ebitda: Math.round(ebitda * 10) / 10,
        netSurplus: Math.round(netSurplus * 10) / 10,
        dscr: Math.round(dscr * 100) / 100,
        cushion: Math.round((dscr - fin.covenants.dscrMinimum) * 10) / 10,
      });
    }
    return years;
  }, [enrollGrowth, revGrowth, expGrowth, philGrowth, fin.budget, fin.covenants.dscrMinimum]);

  const activeData = activeScenario === 'custom' ? customScenario : scenarios[activeScenario];
  const endpoint = activeData[activeData.length - 1];

  return (
    <div>
      {/* Scenario Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['optimistic', 'reasonable', 'pessimistic', 'custom'] as const).map(s => (
          <button key={s} onClick={() => setActiveScenario(s)} style={{
            padding: '8px 20px', borderRadius: radius.full,
            border: `2px solid ${activeScenario === s ? scenarioColors[s] : border.light}`,
            background: activeScenario === s ? `${scenarioColors[s]}15` : 'transparent',
            color: activeScenario === s ? scenarioColors[s] : text.muted,
            fontWeight: fontWeight.semibold, fontSize: fontSize.sm, cursor: 'pointer', fontFamily: font.sans, transition: transition.fast }}>
            {s === 'custom' && '⚡ '}{scenarioLabels[s]}
          </button>
        ))}
      </div>

      {/* Custom Scenario Sliders */}
      {activeScenario === 'custom' && (
        <Card accent={chart.tertiary} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: fontSize.lg }}>⚡</span>
            <div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: text.primary }}>What-If Scenario Builder</div>
              <div style={{ fontSize: fontSize.xs, color: text.muted }}>Adjust assumptions to model custom financial futures. Changes update projections in real-time.</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Slider label="Enrollment Growth" value={enrollGrowth} min={-5} max={5} step={0.5} unit="%" color={chart.tertiary}
              onChange={setEnrollGrowth} description="Annual enrollment change rate" />
            <Slider label="Revenue Growth" value={revGrowth} min={0} max={10} step={0.5} unit="%" color={status.green}
              onChange={setRevGrowth} description="Annual total revenue growth (CPS + other)" />
            <Slider label="Expense Growth" value={expGrowth} min={0} max={10} step={0.5} unit="%" color={status.red}
              onChange={setExpGrowth} description="Annual total expense growth rate" />
            <Slider label="Philanthropy Growth" value={philGrowth} min={-5} max={15} step={0.5} unit="%" color={chart.secondary}
              onChange={setPhilGrowth} description="Annual philanthropy growth rate" />
          </div>
          {/* Quick Presets */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border.light}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Presets:</span>
            {[
              { label: 'Status Quo', e: 0, r: 3.5, x: 4.0, p: 2.0 },
              { label: 'Growth Mode', e: 2.0, r: 6.0, x: 4.5, p: 8.0 },
              { label: 'Enrollment Crisis', e: -3.0, r: 1.0, x: 3.0, p: 0 },
              { label: 'Cost Containment', e: 0, r: 3.5, x: 2.0, p: 2.0 },
              { label: 'CPS Rate Freeze', e: 0, r: 1.5, x: 4.0, p: 5.0 },
            ].map(preset => (
              <button key={preset.label} onClick={() => { setEnrollGrowth(preset.e); setRevGrowth(preset.r); setExpGrowth(preset.x); setPhilGrowth(preset.p); }}
                style={{ padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${border.light}`, background: 'transparent',
                  color: text.muted, fontSize: fontSize.xs, cursor: 'pointer', fontFamily: font.sans, fontWeight: fontWeight.medium }}>
                {preset.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Projection Table */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Historical Performance + {scenarioLabels[activeScenario]} Projection
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Year</th><th style={{ ...th, textAlign: 'right' }}>Enrollment</th>
              <th style={{ ...th, textAlign: 'right' }}>Revenue</th><th style={{ ...th, textAlign: 'right' }}>Expenses</th>
              <th style={{ ...th, textAlign: 'right' }}>EBITDA</th><th style={{ ...th, textAlign: 'right' }}>Net Surplus</th>
              <th style={{ ...th, textAlign: 'right' }}>DSCR</th>
            </tr></thead>
            <tbody>
              {historical.map(h => (
                <tr key={h.year}>
                  <td style={tdL}>{h.year}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(h.enrollment)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${h.totalRevenue.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${h.totalExpenses.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', color: h.ebitda >= 0 ? status.green : status.red }}>${h.ebitda.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', color: h.netSurplus >= 0 ? status.green : status.red }}>${h.netSurplus.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtDscr(h.dscr)}</td>
                </tr>
              ))}
              <tr><td colSpan={7} style={{ padding: 0 }}><div style={{ height: 3, background: `${scenarioColors[activeScenario]}40`, margin: '4px 0' }} /></td></tr>
              {activeData.map(p => (
                <tr key={p.year} style={{ background: `${scenarioColors[activeScenario]}08` }}>
                  <td style={{ ...tdL, color: scenarioColors[activeScenario], fontWeight: fontWeight.semibold }}>{p.year} ⟶</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(p.enrollmentC1)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${p.totalRevenue.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${p.totalExpenses.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', color: p.ebitda >= 0 ? status.green : status.red }}>${p.ebitda.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', color: p.netSurplus >= 0 ? status.green : status.red }}>${p.netSurplus.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', color: p.dscr >= 1.0 ? status.green : status.red }}>{fmtDscr(p.dscr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Visual Scenario Comparison */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>5-Year Net Surplus Trajectory</div>
        <div style={{ position: 'relative', height: 200, padding: '0 20px' }}>
          {/* Zero line */}
          <div style={{ position: 'absolute', left: 20, right: 20, top: '50%', height: 1, background: border.medium, zIndex: 1 }} />
          <div style={{ position: 'absolute', left: 0, top: 'calc(50% - 8px)', fontSize: fontSize.xs, color: text.light }}>$0</div>
          {/* Scenario lines */}
          {(['optimistic', 'reasonable', 'pessimistic'] as const).map(s => {
            const data = scenarios[s];
            const maxAbs = 15;
            return (
              <svg key={s} style={{ position: 'absolute', left: 20, right: 20, top: 0, width: 'calc(100% - 40px)', height: 200 }}>
                <polyline
                  points={data.map((d, i) => `${(i / (data.length - 1)) * 100}%,${100 - ((d.netSurplus + maxAbs) / (2 * maxAbs)) * 100}%`).join(' ')}
                  fill="none" stroke={scenarioColors[s]} strokeWidth={activeScenario === s ? 3 : 1.5}
                  strokeDasharray={activeScenario === s ? 'none' : '4,4'} opacity={activeScenario === s ? 1 : 0.5}
                  strokeLinecap="round" strokeLinejoin="round" />
                {data.map((d, i) => (
                  <circle key={i} cx={`${(i / (data.length - 1)) * 100}%`} cy={`${100 - ((d.netSurplus + maxAbs) / (2 * maxAbs)) * 100}%`}
                    r={activeScenario === s ? 4 : 2} fill={scenarioColors[s]} opacity={activeScenario === s ? 1 : 0.5} />
                ))}
              </svg>
            );
          })}
          {/* Custom line */}
          {activeScenario === 'custom' && (
            <svg style={{ position: 'absolute', left: 20, right: 20, top: 0, width: 'calc(100% - 40px)', height: 200 }}>
              <polyline
                points={customScenario.map((d, i) => `${(i / (customScenario.length - 1)) * 100}%,${100 - ((d.netSurplus + 15) / 30) * 100}%`).join(' ')}
                fill="none" stroke={chart.tertiary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              {customScenario.map((d, i) => (
                <circle key={i} cx={`${(i / (customScenario.length - 1)) * 100}%`} cy={`${100 - ((d.netSurplus + 15) / 30) * 100}%`}
                  r={4} fill={chart.tertiary} />
              ))}
            </svg>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
          {Object.entries(scenarioLabels).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 3, background: scenarioColors[k], borderRadius: 2 }} />
              <span style={{ fontSize: fontSize.xs, color: text.muted }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Scenario Endpoint Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {(['optimistic', 'reasonable', 'pessimistic'] as const).map(s => {
          const ep = scenarios[s][scenarios[s].length - 1];
          return (
            <Card key={s} accent={scenarioColors[s]} style={{ background: `${scenarioColors[s]}05` }}>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: scenarioColors[s], marginBottom: 12 }}>{scenarioLabels[s]}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Enrollment', value: fmtNum(ep.enrollmentC1) },
                  { label: 'Revenue', value: `$${ep.totalRevenue.toFixed(1)}M` },
                  { label: 'Expenses', value: `$${ep.totalExpenses.toFixed(1)}M` },
                  { label: 'EBITDA', value: `$${ep.ebitda.toFixed(1)}M` },
                  { label: 'Net Surplus', value: `$${ep.netSurplus.toFixed(1)}M` },
                  { label: 'DSCR', value: fmtDscr(ep.dscr) },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: fontSize.xs, color: text.light }}>{item.label}</div>
                    <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, fontFamily: font.mono, color: text.primary }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <AIInsight label="Scenario Intelligence"
        content={`The ${scenarioLabels[activeScenario]} scenario projects ${endpoint.year} enrollment at ${fmtNum(endpoint.enrollmentC1)} with revenue of $${endpoint.totalRevenue.toFixed(1)}M and expenses of $${endpoint.totalExpenses.toFixed(1)}M, yielding a net surplus of $${endpoint.netSurplus.toFixed(1)}M and DSCR of ${fmtDscr(endpoint.dscr)}. ${endpoint.netSurplus < 0 ? `WARNING: This scenario produces cumulative deficits that would erode reserves. ${endpoint.dscr < fin.covenants.dscrMinimum ? 'CRITICAL: DSCR falls below covenant minimum, triggering technical default risk.' : ''}` : `This scenario maintains covenant compliance with a DSCR cushion of ${((endpoint.dscr - fin.covenants.dscrMinimum) / fin.covenants.dscrMinimum * 100).toFixed(0)}% above minimum.`} The critical variable across all scenarios is the spread between revenue growth and expense growth — every 0.5% change in this spread compounds to $${(fin.budget.revenue.total * 0.005 * 5).toFixed(1)}M over 5 years.`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT TEAM SPEND TAB
// ═══════════════════════════════════════════════════════════════════════════

function SupportTeamTab() {
  const fin = useFinancials();
  const depts = fin.supportTeamDepartments;
  const comp = fin.compensation;
  const sorted = [...depts].sort((a, b) => b.variance - a.variance);
  const totalActual = depts.reduce((s, d) => s + d.actual, 0);
  const totalBudget = depts.reduce((s, d) => s + d.budget, 0);
  const overBudgetDepts = depts.filter(d => d.variance > 0);
  const underBudgetDepts = depts.filter(d => d.variance < 0);
  const totalOverage = overBudgetDepts.reduce((s, d) => s + d.variance, 0);
  const totalSavings = Math.abs(underBudgetDepts.reduce((s, d) => s + d.variance, 0));

  return (
    <div>
      {/* 5-KPI Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Personnel" value={`$${comp.fy26.personnelTotal.toFixed(1)}M`} subValue={`${comp.fy26.personnelPctOfOpex}% of operating expenses`} accent={modColors.ledger} />
        <KPICard label="Base Salaries" value={`$${comp.fy26.baseSalaries.toFixed(1)}M`} subValue={`Benefits: $${comp.fy26.benefits.toFixed(1)}M`} accent={status.blue} />
        <KPICard label="CPS Salary Gap" value={`${comp.cpsGap.gapPct.toFixed(1)}%`} subValue={`CPS L1: ${fmtFull(comp.cpsGap.cpsL1Step0)} vs Veritas: ${fmtFull(comp.cpsGap.veritasStarting)}`}
          trend={{ value: 'Below CPS', positive: false }} accent={status.red} />
        <KPICard label="5-Year Pressure" value={`$${comp.fiveYearPressure.toFixed(1)}M`} subValue="Cumulative compensation gap" accent={status.amber} />
        <KPICard label="Net Variance" value={`${totalActual > totalBudget ? '+' : ''}${fmtNum(totalActual - totalBudget)}K`}
          subValue={`${overBudgetDepts.length} over · ${underBudgetDepts.length} under`}
          trend={{ value: totalActual > totalBudget ? 'Over budget' : 'Under budget', positive: totalActual <= totalBudget }}
          accent={totalActual > totalBudget ? status.red : status.green} />
      </div>

      {/* Variance Waterfall Visualization */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Support Team Variance Waterfall</div>
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 120, padding: '0 4px' }}>
          {sorted.map(d => {
            const maxVar = Math.max(...depts.map(dd => Math.abs(dd.variance)));
            const h = Math.max((Math.abs(d.variance) / maxVar) * 100, 4);
            const over = d.variance > 0;
            return (
              <div key={d.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '8px', color: over ? status.red : status.green, fontFamily: font.mono, marginBottom: 2 }}>
                  {over ? '+' : ''}{d.variance}
                </div>
                <div style={{ width: '100%', height: h, background: over ? `${status.red}60` : `${status.green}60`,
                  borderRadius: '2px 2px 0 0', transition: transition.smooth }} />
                <div style={{ fontSize: '7px', color: text.light, marginTop: 4, textAlign: 'center', lineHeight: 1.1, maxWidth: '100%', overflow: 'hidden' }}>
                  {d.name.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border.light}` }}>
          <span style={{ fontSize: fontSize.xs, color: status.red }}>■ Over budget: +{fmtNum(totalOverage)}K ({overBudgetDepts.length} depts)</span>
          <span style={{ fontSize: fontSize.xs, color: status.green }}>■ Under budget: -{fmtNum(totalSavings)}K ({underBudgetDepts.length} depts)</span>
        </div>
      </Card>

      {/* Department Spend Table */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Support Team Department Spend — Actual vs Budget (in thousands)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Department</th><th style={{ ...th, textAlign: 'right' }}>Actual</th>
            <th style={{ ...th, textAlign: 'right' }}>Budget</th><th style={{ ...th, textAlign: 'right' }}>Variance</th>
            <th style={{ ...th, textAlign: 'right', width: 200 }}>Budget Utilization</th>
          </tr></thead>
          <tbody>
            {sorted.map(d => {
              const pct = d.budget > 0 ? (d.actual / d.budget) * 100 : 0;
              const over = d.variance > 0;
              return (
                <tr key={d.name}>
                  <td style={tdL}>{d.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${fmtNum(d.actual)}K</td>
                  <td style={{ ...td, textAlign: 'right' }}>${fmtNum(d.budget)}K</td>
                  <td style={{ ...td, textAlign: 'right', color: over ? status.red : status.green, fontWeight: fontWeight.semibold }}>
                    {over ? '+' : ''}{fmtNum(d.variance)}K
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Bar value={d.actual} max={d.budget} color={pct > 105 ? status.red : pct > 95 ? status.amber : status.green} h={6} showLabel />
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: bg.subtle }}>
              <td style={{ ...tdL, fontWeight: fontWeight.bold }}>TOTAL</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.bold }}>${fmtNum(totalActual)}K</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.bold }}>${fmtNum(totalBudget)}K</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.bold, color: totalActual > totalBudget ? status.red : status.green }}>
                {totalActual > totalBudget ? '+' : ''}{fmtNum(totalActual - totalBudget)}K
              </td>
              <td style={{ ...td, textAlign: 'right' }}>
                <Bar value={totalActual} max={totalBudget} color={totalActual > totalBudget ? status.red : status.green} h={6} showLabel />
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Personnel Cost Trend */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Personnel Cost Trend (in millions)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Year</th><th style={{ ...th, textAlign: 'right' }}>Base Salaries</th>
            <th style={{ ...th, textAlign: 'right' }}>Benefits</th><th style={{ ...th, textAlign: 'right' }}>Stipends</th>
            <th style={{ ...th, textAlign: 'right' }}>Total</th><th style={{ ...th, textAlign: 'right' }}>YoY Change</th>
          </tr></thead>
          <tbody>
            {comp.historicalPersonnel.map((h, i) => {
              const prev = i > 0 ? comp.historicalPersonnel[i - 1].total : null;
              const change = prev ? ((h.total - prev) / prev * 100) : null;
              return (
                <tr key={h.year}>
                  <td style={tdL}>{h.year}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${h.base.toFixed(1)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${h.benefits.toFixed(1)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${h.stipends.toFixed(1)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>${h.total.toFixed(1)}</td>
                  <td style={{ ...td, textAlign: 'right', color: change && change > 0 ? status.amber : status.green }}>
                    {change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* CPS Gap Analysis */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>CPS Compensation Gap Analysis</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          <div style={{ textAlign: 'center', padding: 20, background: bg.subtle, borderRadius: radius.lg }}>
            <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', marginBottom: 8 }}>CPS L1 Step 0</div>
            <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>{fmtFull(comp.cpsGap.cpsL1Step0)}</div>
          </div>
          <div style={{ textAlign: 'center', padding: 20, background: status.redBg, borderRadius: radius.lg, border: `1px solid ${status.redBorder}` }}>
            <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', marginBottom: 8 }}>Gap</div>
            <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: status.red }}>{comp.cpsGap.gapPct.toFixed(1)}%</div>
            <div style={{ fontSize: fontSize.xs, color: status.red, marginTop: 4 }}>{fmtFull(comp.cpsGap.cpsL1Step0 - comp.cpsGap.veritasStarting)} below CPS</div>
          </div>
          <div style={{ textAlign: 'center', padding: 20, background: bg.subtle, borderRadius: radius.lg }}>
            <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', marginBottom: 8 }}>Veritas Starting</div>
            <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>{fmtFull(comp.cpsGap.veritasStarting)}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: 12, background: status.amberBg, border: `1px solid ${status.amberBorder}`, borderRadius: radius.md }}>
          <div style={{ fontSize: fontSize.sm, color: status.amber, fontWeight: fontWeight.semibold }}>5-Year Cumulative Pressure: ${comp.fiveYearPressure.toFixed(1)}M</div>
          <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 4 }}>If Veritas maintains current salary structure while CPS continues annual increases, the cumulative gap in total compensation cost over 5 years reaches ${fmtFull(comp.fiveYearPressure * 1000000)}. This directly impacts recruitment and retention competitiveness.</div>
        </div>
      </Card>

      <AIInsight label="Support Team Intelligence"
        content={`Support Team spending is ${totalActual > totalBudget ? `$${fmtNum(totalActual - totalBudget)}K over budget` : `$${fmtNum(totalBudget - totalActual)}K under budget`} in aggregate. The largest overage is Academic at +$257K (40% over budget), followed by Health/Fitness/Athletics at +$133K. These overages are partially offset by underspending in IT (-$72K) and Education Team (-$97K). The CPS compensation gap of ${comp.cpsGap.gapPct.toFixed(1)}% (${fmtFull(comp.cpsGap.cpsL1Step0 - comp.cpsGap.veritasStarting)} per starting teacher) is a strategic risk — it directly impacts recruitment competitiveness and drives the $${comp.fiveYearPressure.toFixed(1)}M 5-year pressure. Personnel at ${comp.fy26.personnelPctOfOpex}% of operating expenses is within the typical 70-85% range for charter networks, but the trend line shows compression. Recommendation: Prioritize closing the CPS gap for high-turnover positions first.`} />
    </div>
  );
}

// ─── Principal Financial View ─────────────────────────────────────────────

function PrincipalLedger() {
  const { selectedCampusId } = useRole();
  const fin = useFinancials();
  const enr = useEnrollment();
  const net = useNetwork();
  const ytd = fin.ytdSummary;

  const campus = enr.byCampus.find(c => c.campusId === selectedCampusId);
  const campusInfo = net.campuses.find(c => c.id === selectedCampusId);
  const campusName = campusInfo?.short ?? 'Campus';
  const enrolled = campus?.enrolled ?? 0;
  const pctOfNetwork = enr.networkTotal > 0 ? enrolled / enr.networkTotal : 0;

  // Derive campus-level financials from network proportions
  const campusRev = ytd.revActual * 1_000_000 * pctOfNetwork;
  const campusExp = ytd.expActual * 1_000_000 * pctOfNetwork;
  const campusSurplus = campusRev - campusExp;
  const campusBudgetRev = ytd.revBudget * 1_000_000 * pctOfNetwork;
  const campusBudgetExp = ytd.expBudget * 1_000_000 * pctOfNetwork;
  const revVar = campusRev - campusBudgetRev;
  const expVar = campusExp - campusBudgetExp;
  const perPupilRev = enrolled > 0 ? campusRev / enrolled : 0;
  const perPupilExp = enrolled > 0 ? campusExp / enrolled : 0;

  return (
    <div>
      {/* Principal Campus Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${modColors.ledger}12 0%, ${brand.gold}08 100%)`,
        border: `1px solid ${modColors.ledger}30`,
        borderRadius: radius.lg, padding: '16px 20px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: fontSize.xs, color: modColors.ledger, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 1 }}>Principal View</div>
          <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: text.primary }}>{campusName} — Financial Summary</div>
          <div style={{ fontSize: fontSize.xs, color: text.muted }}>{enrolled} students · {fmtPct(pctOfNetwork * 100)} of network · FY{fin.fiscalYear.slice(-2)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: fontSize.xs, color: text.muted }}>Per-Pupil Revenue</div>
          <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: modColors.ledger }}>{fmt(perPupilRev)}</div>
        </div>
      </div>

      {/* Campus KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Campus Revenue" value={fmtCompact(campusRev)} accent={status.green}
          subValue={`Budget: ${fmtCompact(campusBudgetRev)}`} />
        <KPICard label="Campus Expenses" value={fmtCompact(campusExp)} accent={status.amber}
          subValue={`Budget: ${fmtCompact(campusBudgetExp)}`} />
        <KPICard label="Campus Surplus" value={fmtCompact(campusSurplus)}
          accent={campusSurplus >= 0 ? status.green : status.red}
          subValue={campusSurplus >= 0 ? 'Positive' : 'Deficit'} />
        <KPICard label="Per-Pupil Expense" value={fmt(perPupilExp)} accent={modColors.ledger}
          subValue={`${enrolled} students`} />
      </div>

      {/* Variance Analysis */}
      <Section title="Budget Variance">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Revenue Variance</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: revVar >= 0 ? status.green : status.red }}>
                  {revVar >= 0 ? '+' : ''}{fmtCompact(revVar)}
                </span>
                <span style={{ fontSize: fontSize.xs, color: text.muted }}>vs budget</span>
              </div>
              <div style={{ height: 8, background: bg.subtle, borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((campusRev / campusBudgetRev) * 100, 100)}%`, background: revVar >= 0 ? status.green : status.red, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>{fmtPct((campusRev / campusBudgetRev) * 100)} of budget</div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Expense Variance</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: expVar <= 0 ? status.green : status.red }}>
                  {expVar >= 0 ? '+' : ''}{fmtCompact(expVar)}
                </span>
                <span style={{ fontSize: fontSize.xs, color: text.muted }}>vs budget</span>
              </div>
              <div style={{ height: 8, background: bg.subtle, borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((campusExp / campusBudgetExp) * 100, 100)}%`, background: expVar <= 0 ? status.green : status.amber, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>{fmtPct((campusExp / campusBudgetExp) * 100)} of budget</div>
            </div>
          </Card>
        </div>
      </Section>

      {/* Network Context */}
      <Section title="Network Financial Context">
        <Card>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Network DSCR', value: fmtDscr(ytd.dscr), ok: ytd.dscr >= fin.covenants.dscrMinimum },
                { label: 'Days Cash', value: String(ytd.daysCash), ok: ytd.daysCash >= fin.covenants.daysCashMinimum },
                { label: 'Current Ratio', value: ytd.currentRatio.toFixed(2), ok: ytd.currentRatio >= fin.covenants.currentRatioMinimum },
                { label: 'Network Surplus', value: fmt(ytd.surplus * 1_000_000), ok: ytd.surplus >= 0 },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: 12, background: m.ok ? `${status.green}08` : `${status.red}08`, borderRadius: radius.md, border: `1px solid ${m.ok ? `${status.green}20` : `${status.red}20`}` }}>
                  <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontFamily: font.mono, color: m.ok ? status.green : status.red }}>{m.value}</div>
                  <div style={{ fontSize: '10px', color: text.muted, marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      <AIInsight label="Campus Financial Intelligence"
        content={`${campusName} represents ${fmtPct(pctOfNetwork * 100)} of network enrollment (${enrolled} students) and proportional revenue of ${fmtCompact(campusRev)}. Revenue is ${revVar >= 0 ? 'tracking above' : 'below'} budget by ${fmtCompact(Math.abs(revVar))}. Per-pupil revenue of ${fmt(perPupilRev)} is ${perPupilRev >= net.revenuePerPupil ? 'above' : 'below'} the network average of ${fmt(net.revenuePerPupil)}. Key action: ${campusSurplus < 0 ? 'Campus is in deficit — review discretionary spending and staffing levels.' : 'Campus is in surplus — maintain current trajectory and consider strategic investments.'}`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LEDGER APP
// ═══════════════════════════════════════════════════════════════════════════

export default function LedgerApp() {
  const [activeTab, setActiveTab] = useState<LedgerTab>('overview');
  const fin = useFinancials();
  const { role } = useRole();

  if (role === 'principal') {
    return (
      <div>
        <ModuleHeader title="Ledger" subtitle="Campus Financial Intelligence" accent={modColors.ledger}
          freshness={{ lastUpdated: fin.lastUpdated, source: fin.source }} />
        <PrincipalLedger />
      </div>
    );
  }

  return (
    <div>
      <ModuleHeader title="Ledger" subtitle="Financial Intelligence Engine" accent={modColors.ledger}
        freshness={{ lastUpdated: fin.lastUpdated, source: fin.source }} />

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${border.light}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', fontSize: fontSize.sm,
            fontWeight: activeTab === tab.id ? fontWeight.semibold : fontWeight.medium,
            color: activeTab === tab.id ? modColors.ledger : text.muted,
            background: 'transparent', border: 'none',
            borderBottom: activeTab === tab.id ? `2px solid ${modColors.ledger}` : '2px solid transparent',
            cursor: 'pointer', fontFamily: font.sans, transition: transition.fast,
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 }}>
            <span style={{ fontSize: fontSize.xs }}>{tab.icon}</span>
            {tab.label}
            {tab.id === 'scenarios' && (
              <span style={{ background: `${chart.tertiary}15`, color: chart.tertiary, fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 5px', borderRadius: radius.full }}>INTERACTIVE</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'covenants' && <CovenantsTab />}
      {activeTab === 'scenarios' && <ScenariosTab />}
      {activeTab === 'support' && <SupportTeamTab />}

      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: text.light, borderTop: `1px solid ${border.light}`, marginTop: 20 }}>
        {fin.actuals.length} months of actuals · {fin.historical.length} years of history · 3 scenarios + custom modeling · Ledger Intelligence Engine
      </div>
    </div>
  );
}
