/**
 * Slate v3 — Ledger
 * ═══════════════════════════════════════════════════
 * Financial Intelligence Engine.
 * Budget vs. Actual · Covenant Monitor · Scenario Modeling · NST Spend · AI Analysis
 * CEO sees the full financial picture. Principal sees their campus allocation.
 */

import React, { useState, useMemo } from 'react';
import { useFinancials, useEnrollment, useNetwork, useRole } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, Section, AIInsight, StatusBadge } from '../../components/Card';
import { fmt, fmtNum, fmtPct, fmtDscr, fmtFull, fmtCompact } from '../../core/formatters';
import {
  bg, text, brand, border, status, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors, chart,
} from '../../core/theme';

// ─── Tab System ──────────────────────────────────────────────────────────

type LedgerTab = 'overview' | 'revenue' | 'expenses' | 'covenants' | 'scenarios' | 'nst';

const TABS: { id: LedgerTab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',    icon: '◉' },
  { id: 'revenue',   label: 'Revenue',     icon: '▲' },
  { id: 'expenses',  label: 'Expenses',    icon: '▼' },
  { id: 'covenants', label: 'Covenants',   icon: '◇' },
  { id: 'scenarios', label: 'Scenarios',   icon: '◈' },
  { id: 'nst',       label: 'NST Spend',   icon: '▤' },
];

// ─── Shared Styles ───────────────────────────────────────────────────────

const tableHeaderStyle: React.CSSProperties = {
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: text.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding: '10px 12px',
  borderBottom: `2px solid ${border.light}`,
  textAlign: 'left',
};

const tableCellStyle: React.CSSProperties = {
  fontSize: fontSize.sm,
  color: text.primary,
  padding: '10px 12px',
  borderBottom: `1px solid ${border.light}`,
  fontFamily: font.mono,
};

const tableCellLabelStyle: React.CSSProperties = {
  ...tableCellStyle,
  fontFamily: font.sans,
  fontWeight: fontWeight.medium,
};

// ─── Progress Bar Component ──────────────────────────────────────────────

function ProgressBar({ value, max, color, height = 8, showLabel = false }: {
  value: number; max: number; color: string; height?: number; showLabel?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{
        flex: 1,
        height,
        background: `${color}15`,
        borderRadius: height,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: height,
          transition: transition.smooth,
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: fontSize.xs, color: text.muted, fontFamily: font.mono, minWidth: 40, textAlign: 'right' }}>
          {fmtPct(pct)}
        </span>
      )}
    </div>
  );
}

// ─── Sparkline Component ─────────────────────────────────────────────────

function Sparkline({ data, color, width = 120, height = 32 }: {
  data: number[]; color: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Variance Cell ───────────────────────────────────────────────────────

function VarianceCell({ actual, budget, invert = false }: { actual: number; budget: number; invert?: boolean }) {
  const diff = actual - budget;
  const isGood = invert ? diff < 0 : diff >= 0;
  const sign = diff >= 0 ? '+' : '';
  return (
    <td style={{
      ...tableCellStyle,
      color: Math.abs(diff) < 0.05 ? text.muted : isGood ? status.green : status.red,
      fontWeight: fontWeight.semibold,
    }}>
      {sign}{diff.toFixed(1)}M
    </td>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const fin = useFinancials();
  const enr = useEnrollment();
  const net = useNetwork();
  const ytd = fin.ytdSummary;
  const bud = fin.budget;
  const actuals = fin.actuals;

  // Calculate YTD totals from monthly actuals
  const ytdRevActual = actuals.reduce((s, m) => s + m.revenue.total, 0);
  const ytdExpActual = actuals.reduce((s, m) => s + m.expenses.total, 0);
  const ytdSurplus = ytdRevActual - ytdExpActual;
  const monthsElapsed = actuals.length;
  const ytdRevBudget = (bud.revenue.total / 12) * monthsElapsed;
  const ytdExpBudget = (bud.expenses.total / 12) * monthsElapsed;

  // Revenue trend from actuals
  const revTrend = actuals.map(m => m.revenue.total);
  const expTrend = actuals.map(m => m.expenses.total);

  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="YTD Revenue"
          value={`$${ytdRevActual.toFixed(1)}M`}
          subValue={`Budget: $${ytdRevBudget.toFixed(1)}M`}
          trend={{
            value: `${(ytdRevActual - ytdRevBudget) >= 0 ? '+' : ''}${(ytdRevActual - ytdRevBudget).toFixed(1)}M vs budget`,
            positive: ytdRevActual >= ytdRevBudget,
          }}
          icon="▲"
          accent={modColors.ledger}
        />
        <KPICard
          label="YTD Expenses"
          value={`$${ytdExpActual.toFixed(1)}M`}
          subValue={`Budget: $${ytdExpBudget.toFixed(1)}M`}
          trend={{
            value: `${(ytdExpActual - ytdExpBudget) >= 0 ? '+' : ''}${(ytdExpActual - ytdExpBudget).toFixed(1)}M vs budget`,
            positive: ytdExpActual <= ytdExpBudget,
          }}
          icon="▼"
          accent={status.amber}
        />
        <KPICard
          label="YTD Surplus"
          value={`$${ytdSurplus.toFixed(1)}M`}
          subValue={`Annual target: $${bud.netSurplus.toFixed(1)}M`}
          trend={{
            value: ytdSurplus >= 0 ? 'Surplus' : 'Deficit',
            positive: ytdSurplus >= 0,
          }}
          icon="◆"
          accent={ytdSurplus >= 0 ? status.green : status.red}
        />
        <KPICard
          label="Days Cash"
          value={`${ytd.daysCash}`}
          subValue={`Target: ${bud.daysCashTarget} days`}
          trend={{
            value: ytd.daysCash >= bud.daysCashTarget ? 'Above target' : 'Below target',
            positive: ytd.daysCash >= bud.daysCashTarget,
          }}
          icon="◎"
          accent={ytd.daysCash >= bud.daysCashTarget ? status.green : status.amber}
        />
      </div>

      {/* Revenue vs Expense Waterfall */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card accent={modColors.ledger}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Monthly Revenue Trend
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Sparkline data={revTrend} color={status.green} width={200} height={48} />
            <div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>Latest: ${actuals[actuals.length - 1]?.revenue.total.toFixed(1)}M</div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>7-month avg: ${(ytdRevActual / monthsElapsed).toFixed(1)}M</div>
            </div>
          </div>
          {/* Monthly breakdown table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Month</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>CPS</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Other Public</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Philanthropy</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {actuals.map(m => (
                <tr key={m.month}>
                  <td style={tableCellLabelStyle}>{m.month}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{m.revenue.cps.toFixed(1)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{m.revenue.otherPublic.toFixed(1)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{m.revenue.philanthropy.toFixed(1)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: fontWeight.semibold }}>{m.revenue.total.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card accent={status.amber}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Monthly Expense Trend
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Sparkline data={expTrend} color={status.red} width={200} height={48} />
            <div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>Latest: ${actuals[actuals.length - 1]?.expenses.total.toFixed(1)}M</div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>7-month avg: ${(ytdExpActual / monthsElapsed).toFixed(1)}M</div>
            </div>
          </div>
          {/* Monthly breakdown table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Month</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Personnel</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Direct Student</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Occupancy</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {actuals.map(m => (
                <tr key={m.month}>
                  <td style={tableCellLabelStyle}>{m.month}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{m.expenses.personnel.toFixed(1)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{m.expenses.directStudent.toFixed(1)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{m.expenses.occupancy.toFixed(1)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: fontWeight.semibold }}>{m.expenses.total.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Budget Summary */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          FY26 Annual Budget Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Revenue Side */}
          <div>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: 12 }}>Revenue — ${bud.revenue.total.toFixed(1)}M</div>
            {[
              { label: 'CPS Per-Pupil', value: bud.revenue.cps, pct: bud.revenue.cps / bud.revenue.total * 100 },
              { label: 'Other Public', value: bud.revenue.otherPublic, pct: bud.revenue.otherPublic / bud.revenue.total * 100 },
              { label: 'Philanthropy', value: bud.revenue.philanthropy, pct: bud.revenue.philanthropy / bud.revenue.total * 100 },
              { label: 'Campus Revenue', value: bud.revenue.campus, pct: bud.revenue.campus / bud.revenue.total * 100 },
              { label: 'Other Revenue', value: bud.revenue.other, pct: bud.revenue.other / bud.revenue.total * 100 },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: fontSize.sm, color: text.secondary }}>{r.label}</span>
                  <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: text.primary }}>${r.value.toFixed(1)}M ({fmtPct(r.pct)})</span>
                </div>
                <ProgressBar value={r.value} max={bud.revenue.total} color={status.green} height={6} />
              </div>
            ))}
          </div>
          {/* Expense Side */}
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
                <ProgressBar value={r.value} max={bud.expenses.total} color={status.red} height={6} />
              </div>
            ))}
          </div>
        </div>
        {/* Bottom line */}
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: `2px solid ${border.light}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: fontSize.sm, color: text.muted }}>EBITDA: </span>
            <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: bud.ebitda >= 0 ? status.green : status.red }}>${bud.ebitda.toFixed(1)}M</span>
          </div>
          <div>
            <span style={{ fontSize: fontSize.sm, color: text.muted }}>Net Surplus: </span>
            <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: bud.netSurplus >= 0 ? status.green : status.red }}>${bud.netSurplus.toFixed(1)}M</span>
          </div>
          <div>
            <span style={{ fontSize: fontSize.sm, color: text.muted }}>Contingency: </span>
            <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>${bud.contingency.toFixed(1)}M</span>
          </div>
        </div>
      </Card>

      {/* AI Analysis */}
      <AIInsight
        label="Slate Financial Intelligence"
        content={`Through seven months of FY26, Veritas is tracking $${(ytdRevActual - ytdRevBudget).toFixed(1)}M ${ytdRevActual >= ytdRevBudget ? 'ahead of' : 'behind'} revenue budget and $${Math.abs(ytdExpActual - ytdExpBudget).toFixed(1)}M ${ytdExpActual <= ytdExpBudget ? 'under' : 'over'} on expenses. The YTD surplus of $${ytdSurplus.toFixed(1)}M provides a cushion against the budgeted annual deficit of $${Math.abs(bud.netSurplus).toFixed(1)}M. Days cash at ${ytd.daysCash} is ${(ytd.daysCash / bud.daysCashTarget * 100).toFixed(0)}% of the ${bud.daysCashTarget}-day target — a strong liquidity position. The DSCR of ${fmtDscr(ytd.dscr)} comfortably exceeds the bond document minimum of ${fmtDscr(fin.covenants.dscrBondDoc)}. Key watch: December philanthropy spike ($1.7M) inflated the surplus; January's $0.4M philanthropy is more typical. Monitor whether Q3-Q4 giving sustains the YTD advantage.`}
      />
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
    {
      name: 'Debt Service Coverage Ratio (DSCR)',
      actual: ytd.dscr,
      minimum: cov.dscrMinimum,
      bondDoc: cov.dscrBondDoc,
      format: fmtDscr,
      description: 'Measures ability to service debt obligations. Calculated as (Net Income + Depreciation + Interest) / Annual Debt Service.',
      isRatio: true,
    },
    {
      name: 'Days Cash on Hand',
      actual: ytd.daysCash,
      minimum: cov.daysCashMinimum,
      bondDoc: null,
      format: (n: number) => `${n} days`,
      description: 'Number of days the organization can operate using only available cash reserves.',
      isRatio: false,
    },
    {
      name: 'Current Ratio',
      actual: ytd.currentRatio,
      minimum: cov.currentRatioMinimum,
      bondDoc: null,
      format: (n: number) => `${n.toFixed(2)}x`,
      description: 'Current assets divided by current liabilities. Measures short-term liquidity.',
      isRatio: true,
    },
    {
      name: 'Net Asset Ratio',
      actual: ytd.netAssetRatio,
      minimum: cov.netAssetMinimum,
      bondDoc: null,
      format: (n: number) => `${n.toFixed(1)}%`,
      description: 'Unrestricted net assets as a percentage of total assets. Measures long-term financial health.',
      isRatio: false,
    },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {covenantItems.map(c => {
          const passing = c.actual >= c.minimum;
          return (
            <KPICard
              key={c.name}
              label={c.name.split('(')[0].trim()}
              value={c.format(c.actual)}
              subValue={`Minimum: ${c.format(c.minimum)}`}
              trend={{ value: passing ? 'Compliant' : 'VIOLATION', positive: passing }}
              accent={passing ? status.green : status.red}
            />
          );
        })}
      </div>

      {/* Detailed Covenant Cards */}
      {covenantItems.map(c => {
        const passing = c.actual >= c.minimum;
        const cushion = c.isRatio
          ? ((c.actual - c.minimum) / c.minimum * 100)
          : ((c.actual - c.minimum) / c.minimum * 100);

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

      <AIInsight
        label="Covenant Intelligence"
        content={`All four financial covenants are in compliance. The DSCR of ${fmtDscr(ytd.dscr)} provides a ${((ytd.dscr - cov.dscrMinimum) / cov.dscrMinimum * 100).toFixed(0)}% cushion above the ${fmtDscr(cov.dscrMinimum)} minimum and exceeds the bond document threshold of ${fmtDscr(cov.dscrBondDoc)}. Days cash at ${ytd.daysCash} is ${((ytd.daysCash / cov.daysCashMinimum - 1) * 100).toFixed(0)}% above the ${cov.daysCashMinimum}-day minimum — the strongest liquidity position in four years. The current ratio of ${ytd.currentRatio.toFixed(2)}x and net asset ratio of ${ytd.netAssetRatio.toFixed(1)}% both reflect healthy balance sheet positioning. Recommendation: Use the covenant cushion strategically — this is the window to invest in compensation competitiveness before the CPS gap widens further.`}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIOS TAB
// ═══════════════════════════════════════════════════════════════════════════

function ScenariosTab() {
  const fin = useFinancials();
  const [activeScenario, setActiveScenario] = useState<'optimistic' | 'reasonable' | 'pessimistic'>('reasonable');
  const scenarios = fin.scenarios;
  const historical = fin.historical;

  const scenarioColors = {
    optimistic: status.green,
    reasonable: status.blue,
    pessimistic: status.red,
  };

  const scenarioLabels = {
    optimistic: 'Optimistic',
    reasonable: 'Reasonable',
    pessimistic: 'Pessimistic',
  };

  return (
    <div>
      {/* Scenario Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['optimistic', 'reasonable', 'pessimistic'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveScenario(s)}
            style={{
              padding: '8px 20px',
              borderRadius: radius.full,
              border: `1px solid ${activeScenario === s ? scenarioColors[s] : border.light}`,
              background: activeScenario === s ? `${scenarioColors[s]}15` : 'transparent',
              color: activeScenario === s ? scenarioColors[s] : text.muted,
              fontWeight: fontWeight.semibold,
              fontSize: fontSize.sm,
              cursor: 'pointer',
              fontFamily: font.sans,
              transition: transition.fast,
            }}
          >
            {scenarioLabels[s]}
          </button>
        ))}
      </div>

      {/* Historical + Projected Table */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Historical Performance + {scenarioLabels[activeScenario]} Projection
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Year</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Enrollment</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Revenue</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Expenses</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>EBITDA</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Net Surplus</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>DSCR</th>
              </tr>
            </thead>
            <tbody>
              {/* Historical rows */}
              {historical.map(h => (
                <tr key={h.year}>
                  <td style={tableCellLabelStyle}>{h.year}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtNum(h.enrollment)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${h.totalRevenue.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${h.totalExpenses.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', color: h.ebitda >= 0 ? status.green : status.red }}>${h.ebitda.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', color: h.netSurplus >= 0 ? status.green : status.red }}>${h.netSurplus.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtDscr(h.dscr)}</td>
                </tr>
              ))}
              {/* Divider */}
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <div style={{ height: 3, background: `${scenarioColors[activeScenario]}40`, margin: '4px 0' }} />
                </td>
              </tr>
              {/* Projected rows */}
              {scenarios[activeScenario].map(p => (
                <tr key={p.year} style={{ background: `${scenarioColors[activeScenario]}08` }}>
                  <td style={{ ...tableCellLabelStyle, color: scenarioColors[activeScenario], fontWeight: fontWeight.semibold }}>{p.year} ⟶</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtNum(p.enrollmentC1)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${p.totalRevenue.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${p.totalExpenses.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', color: p.ebitda >= 0 ? status.green : status.red }}>${p.ebitda.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', color: p.netSurplus >= 0 ? status.green : status.red }}>${p.netSurplus.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', color: p.dscr >= 1.0 ? status.green : status.red }}>{fmtDscr(p.dscr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Scenario Comparison */}
      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          5-Year Scenario Comparison (FY31 Endpoint)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {(['optimistic', 'reasonable', 'pessimistic'] as const).map(s => {
            const endpoint = scenarios[s][scenarios[s].length - 1];
            return (
              <Card key={s} accent={scenarioColors[s]} style={{ background: `${scenarioColors[s]}05` }}>
                <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: scenarioColors[s], marginBottom: 12 }}>
                  {scenarioLabels[s]}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Enrollment', value: fmtNum(endpoint.enrollmentC1) },
                    { label: 'Revenue', value: `$${endpoint.totalRevenue.toFixed(1)}M` },
                    { label: 'Expenses', value: `$${endpoint.totalExpenses.toFixed(1)}M` },
                    { label: 'EBITDA', value: `$${endpoint.ebitda.toFixed(1)}M` },
                    { label: 'Net Surplus', value: `$${endpoint.netSurplus.toFixed(1)}M` },
                    { label: 'DSCR', value: fmtDscr(endpoint.dscr) },
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
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NST SPEND TAB
// ═══════════════════════════════════════════════════════════════════════════

function NSTSpendTab() {
  const fin = useFinancials();
  const depts = fin.nstDepartments;
  const comp = fin.compensation;
  const sorted = [...depts].sort((a, b) => b.variance - a.variance);
  const totalActual = depts.reduce((s, d) => s + d.actual, 0);
  const totalBudget = depts.reduce((s, d) => s + d.budget, 0);

  return (
    <div>
      {/* Compensation Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Total Personnel"
          value={`$${comp.fy26.personnelTotal.toFixed(1)}M`}
          subValue={`${comp.fy26.personnelPctOfOpex}% of operating expenses`}
          accent={modColors.ledger}
        />
        <KPICard
          label="Base Salaries"
          value={`$${comp.fy26.baseSalaries.toFixed(1)}M`}
          subValue={`Benefits: $${comp.fy26.benefits.toFixed(1)}M`}
          accent={status.blue}
        />
        <KPICard
          label="CPS Salary Gap"
          value={`${comp.cpsGap.gapPct.toFixed(1)}%`}
          subValue={`CPS L1: ${fmtFull(comp.cpsGap.cpsL1Step0)} vs Veritas: ${fmtFull(comp.cpsGap.veritasStarting)}`}
          trend={{ value: 'Below CPS', positive: false }}
          accent={status.red}
        />
        <KPICard
          label="5-Year Pressure"
          value={`$${comp.fiveYearPressure.toFixed(1)}M`}
          subValue="Cumulative compensation gap"
          accent={status.amber}
        />
      </div>

      {/* NST Department Spend Table */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          NST Department Spend — Actual vs Budget (in thousands)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Department</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Actual</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Budget</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Variance</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right', width: 200 }}>Budget Utilization</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => {
              const pct = d.budget > 0 ? (d.actual / d.budget) * 100 : 0;
              const overBudget = d.variance > 0;
              return (
                <tr key={d.name}>
                  <td style={tableCellLabelStyle}>{d.name}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${fmtNum(d.actual)}K</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${fmtNum(d.budget)}K</td>
                  <td style={{
                    ...tableCellStyle,
                    textAlign: 'right',
                    color: overBudget ? status.red : status.green,
                    fontWeight: fontWeight.semibold,
                  }}>
                    {overBudget ? '+' : ''}{d.variance > 0 ? '+' : ''}{fmtNum(d.variance)}K
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                    <ProgressBar
                      value={d.actual}
                      max={d.budget}
                      color={pct > 105 ? status.red : pct > 95 ? status.amber : status.green}
                      height={6}
                      showLabel
                    />
                  </td>
                </tr>
              );
            })}
            {/* Total row */}
            <tr style={{ background: bg.subtle }}>
              <td style={{ ...tableCellLabelStyle, fontWeight: fontWeight.bold }}>TOTAL</td>
              <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: fontWeight.bold }}>${fmtNum(totalActual)}K</td>
              <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: fontWeight.bold }}>${fmtNum(totalBudget)}K</td>
              <td style={{
                ...tableCellStyle,
                textAlign: 'right',
                fontWeight: fontWeight.bold,
                color: totalActual > totalBudget ? status.red : status.green,
              }}>
                {totalActual > totalBudget ? '+' : ''}{fmtNum(totalActual - totalBudget)}K
              </td>
              <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                <ProgressBar
                  value={totalActual}
                  max={totalBudget}
                  color={totalActual > totalBudget ? status.red : status.green}
                  height={6}
                  showLabel
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Personnel Trend */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Personnel Cost Trend (in millions)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Year</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Base Salaries</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Benefits</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Stipends</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {comp.historicalPersonnel.map(h => (
              <tr key={h.year} style={h.year === 'FY26' ? { background: `${modColors.ledger}10` } : {}}>
                <td style={{ ...tableCellLabelStyle, fontWeight: h.year === 'FY26' ? fontWeight.bold : fontWeight.medium }}>
                  {h.year} {h.year === 'FY26' && <StatusBadge label="CURRENT" variant="blue" size="sm" />}
                </td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>${h.base.toFixed(1)}M</td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>${h.benefits.toFixed(1)}M</td>
                <td style={{ ...tableCellStyle, textAlign: 'right' }}>${h.stipends.toFixed(1)}M</td>
                <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: fontWeight.semibold }}>${h.total.toFixed(1)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <AIInsight
        label="Compensation Intelligence"
        content={`Personnel costs at $${comp.fy26.personnelTotal.toFixed(1)}M represent ${comp.fy26.personnelPctOfOpex}% of operating expenses — a ratio that has been remarkably stable over six years. The critical pressure point is the CPS salary gap: Veritas starting salary of ${fmtFull(comp.cpsGap.veritasStarting)} is ${Math.abs(comp.cpsGap.gapPct).toFixed(1)}% below CPS Level 1 Step 0 at ${fmtFull(comp.cpsGap.cpsL1Step0)}. This gap creates a $${comp.fiveYearPressure.toFixed(1)}M five-year cumulative pressure that directly impacts recruitment and retention. On the NST side, Academic (+$257K) and Health/Fitness/Athletics (+$133K) are the largest over-budget departments — both driven by enrollment growth. IT (-$72K) and Education Team (-$97K) are significantly under budget, which may indicate delayed hiring or deferred investments that could create future risk.`}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REVENUE TAB
// ═══════════════════════════════════════════════════════════════════════════

function RevenueTab() {
  const fin = useFinancials();
  const enr = useEnrollment();
  const net = useNetwork();
  const bud = fin.budget;
  const actuals = fin.actuals;
  const historical = fin.historical;

  const ytdCPS = actuals.reduce((s, m) => s + m.revenue.cps, 0);
  const ytdOther = actuals.reduce((s, m) => s + m.revenue.otherPublic, 0);
  const ytdPhil = actuals.reduce((s, m) => s + m.revenue.philanthropy, 0);
  const ytdTotal = actuals.reduce((s, m) => s + m.revenue.total, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Revenue Per Pupil"
          value={fmtFull(net.revenuePerPupil)}
          subValue={`${fmtNum(enr.networkTotal)} students`}
          accent={modColors.ledger}
        />
        <KPICard
          label="CPS Revenue (YTD)"
          value={`$${ytdCPS.toFixed(1)}M`}
          subValue={`${(ytdCPS / ytdTotal * 100).toFixed(0)}% of total`}
          accent={status.green}
        />
        <KPICard
          label="Philanthropy (YTD)"
          value={`$${ytdPhil.toFixed(1)}M`}
          subValue={`Annual budget: $${bud.revenue.philanthropy.toFixed(1)}M`}
          accent={chart.tertiary}
        />
        <KPICard
          label="Revenue Concentration"
          value={`${(bud.revenue.cps / bud.revenue.total * 100).toFixed(0)}%`}
          subValue="CPS as % of total revenue"
          trend={{ value: 'High concentration risk', positive: false }}
          accent={status.amber}
        />
      </div>

      {/* Historical Revenue Trend */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Revenue Growth History
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Year</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Enrollment</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>CPS Revenue</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total Revenue</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Rev/Pupil</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>YoY Growth</th>
            </tr>
          </thead>
          <tbody>
            {historical.map((h, i) => {
              const prevRev = i > 0 ? historical[i - 1].totalRevenue : null;
              const growth = prevRev ? ((h.totalRevenue - prevRev) / prevRev * 100) : null;
              return (
                <tr key={h.year}>
                  <td style={tableCellLabelStyle}>{h.year}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtNum(h.enrollment)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${h.cpsRevenue.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: fontWeight.semibold }}>${h.totalRevenue.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtFull(Math.round(h.totalRevenue * 1000000 / h.enrollment))}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', color: growth && growth >= 0 ? status.green : status.red }}>
                    {growth !== null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AIInsight
        label="Revenue Intelligence"
        content={`Veritas revenue has grown from $83.5M in FY20 to a budgeted $138.3M in FY26 — a ${((138.3 / 83.5 - 1) * 100).toFixed(0)}% increase driven primarily by enrollment growth and per-pupil rate increases. The critical dependency: CPS per-pupil revenue represents ${(bud.revenue.cps / bud.revenue.total * 100).toFixed(0)}% of total revenue. This concentration creates existential risk if per-pupil rates flatten or decline. Philanthropy at $${bud.revenue.philanthropy.toFixed(1)}M (${(bud.revenue.philanthropy / bud.revenue.total * 100).toFixed(1)}% of revenue) is healthy for a network this size but shows significant monthly volatility — December's $1.7M vs January's $0.4M. Recommendation: Build a 3-year revenue diversification strategy targeting 75% CPS dependency by FY29.`}
      />
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
  const ytdOther = actuals.reduce((s, m) => s + m.expenses.other, 0);
  const ytdTotal = actuals.reduce((s, m) => s + m.expenses.total, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Personnel (YTD)"
          value={`$${ytdPersonnel.toFixed(1)}M`}
          subValue={`${(ytdPersonnel / ytdTotal * 100).toFixed(0)}% of total`}
          accent={modColors.ledger}
        />
        <KPICard
          label="Direct Student (YTD)"
          value={`$${ytdDirect.toFixed(1)}M`}
          subValue={`Annual budget: $${bud.expenses.directStudent.toFixed(1)}M`}
          accent={chart.tertiary}
        />
        <KPICard
          label="Occupancy (YTD)"
          value={`$${ytdOccupancy.toFixed(1)}M`}
          subValue={`Annual budget: $${bud.expenses.occupancy.toFixed(1)}M`}
          accent={chart.quaternary}
        />
        <KPICard
          label="Cost Per Student"
          value={fmtFull(Math.round(bud.expenses.total * 1000000 / bud.enrollment))}
          subValue={`${fmtNum(bud.enrollment)} budgeted students`}
          accent={status.amber}
        />
      </div>

      {/* Historical Expense Trend */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Expense Growth History
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Year</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Personnel</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total Expenses</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Personnel %</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Cost/Student</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>YoY Growth</th>
            </tr>
          </thead>
          <tbody>
            {historical.map((h, i) => {
              const prevExp = i > 0 ? historical[i - 1].totalExpenses : null;
              const growth = prevExp ? ((h.totalExpenses - prevExp) / prevExp * 100) : null;
              return (
                <tr key={h.year}>
                  <td style={tableCellLabelStyle}>{h.year}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>${h.personnel.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: fontWeight.semibold }}>${h.totalExpenses.toFixed(1)}M</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{(h.personnel / h.totalExpenses * 100).toFixed(0)}%</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>{fmtFull(Math.round(h.totalExpenses * 1000000 / h.enrollment))}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', color: growth && growth > 0 ? status.red : status.green }}>
                    {growth !== null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AIInsight
        label="Expense Intelligence"
        content={`Total expenses have grown from $82.1M (FY20) to a budgeted $131.9M (FY26) — a ${((131.9 / 82.1 - 1) * 100).toFixed(0)}% increase. Personnel consistently represents 70-85% of total expenses, which is typical for charter networks. The FY23 spike to $113.5M (vs $107.8M revenue) created a -$1.7M deficit — a cautionary year. Cost per student at ${fmtFull(Math.round(bud.expenses.total * 1000000 / bud.enrollment))} is competitive for a Chicago charter. The key structural challenge: expense growth is outpacing revenue growth in the reasonable scenario, creating a potential crossover point in FY28 where expenses exceed revenue. This is the single most important financial trend for the board to understand.`}
      />
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

  return (
    <div>
      <ModuleHeader
        title="Ledger"
        subtitle="Financial Intelligence Engine"
        accent={modColors.ledger}
        freshness={{ lastUpdated: fin.lastUpdated, source: fin.source }}
      />

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        borderBottom: `1px solid ${border.light}`,
        paddingBottom: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: fontSize.sm,
              fontWeight: activeTab === tab.id ? fontWeight.semibold : fontWeight.medium,
              color: activeTab === tab.id ? modColors.ledger : text.muted,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${modColors.ledger}` : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: font.sans,
              transition: transition.fast,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: -1,
            }}
          >
            <span style={{ fontSize: fontSize.xs }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'covenants' && <CovenantsTab />}
      {activeTab === 'scenarios' && <ScenariosTab />}
      {activeTab === 'nst' && <NSTSpendTab />}
    </div>
  );
}
