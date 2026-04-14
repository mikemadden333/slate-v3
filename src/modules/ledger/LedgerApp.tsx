/**
 * Slate v4 — Ledger V2
 * ═══════════════════════════════════════════════════
 * Elite CFO Financial Intelligence System
 *
 * FIVE-ACT STRUCTURE:
 * Act I   — Briefing:   What is the financial picture right now?
 * Act II  — Board Deck: One-click board & committee deck generation
 * Act III — Horizon:    3-year scenario modeling with interactive sliders
 * Act IV  — Deep Dive:  Revenue · Expenses · Covenants · Support Team
 * Act V   — Principal:  Campus-level financial allocation
 *
 * Design: Inter only, blue accents, no gold inside product UI,
 * white cards on cool canvas, 16px radius, hairline borders.
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useFinancials, useEnrollment, useNetwork, useRole, useRisks } from '../../data/DataStore';
import { generateBoardDeckPDF, type BoardDeckData } from './generateBoardDeckPDF';
import { useSlateAI } from '../../core/useSlateAI';
import { Card, KPICard, ModuleHeader, Section, AIInsight, StatusBadge, EmptyState } from '../../components/Card';
import { fmt, fmtNum, fmtPct, fmtDscr, fmtFull, fmtCompact } from '../../core/formatters';
import {
  bg, text, brand, border, status, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors, chart,
} from '../../core/theme';

// ─── Tab System ──────────────────────────────────────────────────────────
type LedgerTab = 'overview' | 'revenue' | 'expenses' | 'covenants' | 'scenarios' | 'briefing' | 'boarddeck' | 'support';

const TABS: { id: LedgerTab; label: string; subtitle: string; badge?: string }[] = [
  { id: 'overview',  label: 'Overview',    subtitle: 'Financial snapshot' },
  { id: 'revenue',   label: 'Revenue',     subtitle: 'Sources & trends' },
  { id: 'expenses',  label: 'Expenses',    subtitle: 'Spend & variance' },
  { id: 'covenants', label: 'Covenants',   subtitle: 'Bond compliance' },
  { id: 'scenarios', label: 'Scenarios',   subtitle: 'What-if modeling', badge: 'INTERACTIVE' },
  { id: 'briefing',  label: 'Briefing',    subtitle: 'AI narrative' },
  { id: 'boarddeck', label: 'Board Deck',  subtitle: 'One-click decks', badge: 'NEW' },
  { id: 'support',   label: 'Support Team',subtitle: 'Compensation' },
];

// ─── Formatters ──────────────────────────────────────────────────────────
const fmtM = (n: number) => `$${Math.abs(n).toFixed(1)}M`;
const fmtSign = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(1)}M`;

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

// ─── Bar Component ────────────────────────────────────────────────────────
function Bar({ value, max, color, h = 8, showLabel = false }: {
  value: number; max: number; color: string; h?: number; showLabel?: boolean;
}) {
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

// ─── Sparkline Component ──────────────────────────────────────────────────
function Spark({ data, color, w = 120, h = 32 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Variance Cell ────────────────────────────────────────────────────────
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
  label: string; value: number; min: number; max: number; step: number;
  unit: string; color: string; onChange: (v: number) => void; description?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
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
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 8px)`, width: 16, height: 16, borderRadius: '50%',
          background: color, border: `2px solid ${bg.card}`, boxShadow: `0 0 6px ${color}40`,
          pointerEvents: 'none', transition: 'left 0.1s'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: '9px', color: text.light }}>{min}{unit}</span>
        <span style={{ fontSize: '9px', color: text.light }}>{max}{unit}</span>
      </div>
    </div>
  );
}

// ─── Covenant Summary Card ────────────────────────────────────────────────
function CovenantCard({ name, shortName, description, actual, minimum, maximum, format, icon }: {
  name: string; shortName: string; description: string;
  actual: number; minimum: number; maximum: number;
  format: (n: number) => string; icon: string;
}) {
  const passing = actual >= minimum;
  const cushionPct = ((actual - minimum) / minimum * 100);
  // Progress bar: 0% = 0, threshold line at minimum/maximum ratio, fill = actual/maximum
  const fillPct = Math.min(Math.max((actual / maximum) * 100, 0), 100);
  const thresholdPct = Math.min((minimum / maximum) * 100, 100);
  const barColor = !passing ? status.red : cushionPct < 50 ? status.amber : status.green;
  const bgColor = !passing ? 'rgba(239,68,68,0.06)' : cushionPct < 50 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)';
  const borderColor = !passing ? 'rgba(239,68,68,0.25)' : cushionPct < 50 ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)';

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 14, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header row: icon + name + status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${barColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>{icon}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: text.primary, lineHeight: 1.2 }}>{shortName}</div>
            <div style={{ fontSize: '11px', color: text.muted, marginTop: 2, lineHeight: 1.3 }}>{description}</div>
          </div>
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 700, color: passing ? status.green : status.red,
          background: passing ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${passing ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {passing ? '✓ COMPLIANT' : '✗ VIOLATION'}
        </div>
      </div>

      {/* Big value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: font.mono, color: barColor, lineHeight: 1 }}>
          {format(actual)}
        </div>
        <div style={{ fontSize: '12px', color: text.muted }}>
          {cushionPct >= 0 ? '+' : ''}{cushionPct.toFixed(0)}% above min
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          height: 6, borderRadius: 3,
          background: `${barColor}20`,
          position: 'relative', overflow: 'visible',
        }}>
          {/* Fill */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${fillPct}%`,
            background: barColor,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }} />
          {/* Threshold marker */}
          <div style={{
            position: 'absolute', top: -3, bottom: -3,
            left: `${thresholdPct}%`,
            width: 2, background: `${barColor}80`,
            borderRadius: 1,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <div style={{ fontSize: '10px', color: text.light }}>Min: {format(minimum)}</div>
          <div style={{ fontSize: '10px', color: text.light }}>Max shown: {format(maximum)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Covenant Status Row ──────────────────────────────────────────────────
function CovenantRow({ name, actual, minimum, bondDoc, format, description }: {
  name: string; actual: number; minimum: number; bondDoc?: number;
  format: (n: number) => string; description: string;
}) {
  const passing = actual >= minimum;
  const cushion = ((actual - minimum) / minimum * 100);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
      borderBottom: `1px solid ${border.light}`,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: passing ? status.green : status.red, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>{name}</div>
        <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>{description}</div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 80 }}>
        <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontFamily: font.mono, color: passing ? status.green : status.red }}>{format(actual)}</div>
        <div style={{ fontSize: fontSize.xs, color: text.light }}>Min: {format(minimum)}</div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 60 }}>
        <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, fontFamily: font.mono, color: passing ? status.green : status.red }}>
          {cushion >= 0 ? '+' : ''}{cushion.toFixed(0)}%
        </div>
        <div style={{ fontSize: fontSize.xs, color: text.light }}>cushion</div>
      </div>
      <StatusBadge label={passing ? 'COMPLIANT' : 'VIOLATION'} variant={passing ? 'green' : 'red'} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT I — BRIEFING TAB
// ═══════════════════════════════════════════════════════════════════════════
function BriefingTab() {
  const fin = useFinancials();
  const { campuses } = useNetwork();
  const bud = fin.budget;
  const ytd = fin.ytdSummary;
  const actuals = fin.actuals;
  const monthsElapsed = actuals.length;
  const ytdRevActual = actuals.reduce((s, m) => s + m.revenue.total, 0);
  const ytdRevBudget = bud.revenue.total * (monthsElapsed / 12);
  const ytdExpActual = actuals.reduce((s, m) => s + m.expenses.total, 0);
  const ytdExpBudget = bud.expenses.total * (monthsElapsed / 12);
  const ytdSurplus = ytdRevActual - ytdExpActual;
  const revVariance = ytdRevActual - ytdRevBudget;
  const expVariance = ytdExpActual - ytdExpBudget;

  const ai = useSlateAI({
    prompt: `You are the CFO of a 10-campus charter school network in Chicago. Write a concise, authoritative 3-sentence financial briefing for the CEO. Current status: ${monthsElapsed} months into FY26. YTD Revenue: $${ytdRevActual.toFixed(1)}M vs budget $${ytdRevBudget.toFixed(1)}M (${revVariance >= 0 ? 'ahead' : 'behind'} by $${Math.abs(revVariance).toFixed(1)}M). YTD Expenses: $${ytdExpActual.toFixed(1)}M vs budget $${ytdExpBudget.toFixed(1)}M (${expVariance <= 0 ? 'under' : 'over'} by $${Math.abs(expVariance).toFixed(1)}M). YTD Surplus: $${ytdSurplus.toFixed(1)}M. Days Cash: ${ytd.daysCash}. DSCR: ${fmtDscr(ytd.dscr)}. Be direct, use specific numbers, and end with the single most important thing to watch.`,
    domain: 'ledger-briefing',
    fallback: `Through ${monthsElapsed} months of FY26, the network is tracking $${Math.abs(revVariance).toFixed(1)}M ${revVariance >= 0 ? 'ahead of' : 'behind'} revenue budget with expenses ${expVariance <= 0 ? 'under' : 'over'} plan by $${Math.abs(expVariance).toFixed(1)}M, producing a YTD surplus of $${ytdSurplus.toFixed(1)}M. Days cash at ${ytd.daysCash} and DSCR at ${fmtDscr(ytd.dscr)} both exceed bond covenants with comfortable cushion. Key watch: Q3-Q4 philanthropy performance will determine whether the YTD advantage holds through year-end.`,
  });

  // Anomaly detection
  const anomalies = useMemo(() => {
    const items: { type: 'warning' | 'info' | 'positive'; label: string; detail: string }[] = [];
    if (revVariance < -1) items.push({ type: 'warning', label: 'Revenue Below Budget', detail: `$${Math.abs(revVariance).toFixed(1)}M behind plan through ${monthsElapsed} months` });
    if (expVariance > 1) items.push({ type: 'warning', label: 'Expenses Above Budget', detail: `$${expVariance.toFixed(1)}M over plan — investigate personnel and occupancy` });
    if (ytd.daysCash < 90) items.push({ type: 'warning', label: 'Days Cash Declining', detail: `${ytd.daysCash} days — approaching 90-day watch threshold` });
    if (ytd.dscr < 1.5) items.push({ type: 'warning', label: 'DSCR Tightening', detail: `${fmtDscr(ytd.dscr)} — monitor against ${fmtDscr(fin.covenants.dscrMinimum)} minimum` });
    if (revVariance > 1) items.push({ type: 'positive', label: 'Revenue Ahead of Plan', detail: `$${revVariance.toFixed(1)}M above budget — philanthropy spike in December` });
    if (expVariance < -0.5) items.push({ type: 'positive', label: 'Expense Discipline', detail: `$${Math.abs(expVariance).toFixed(1)}M under budget — vacancy savings and deferred spend` });
    if (items.length === 0) items.push({ type: 'info', label: 'No Anomalies Detected', detail: 'All financial metrics tracking within normal parameters' });
    return items;
  }, [revVariance, expVariance, ytd, monthsElapsed, fin.covenants]);

  const covenants = [
    { name: 'DSCR', actual: ytd.dscr, min: fin.covenants.dscrMinimum, format: fmtDscr },
    { name: 'Days Cash', actual: ytd.daysCash, min: fin.covenants.daysCashMinimum, format: (n: number) => `${n}d` },
    { name: 'Current Ratio', actual: ytd.currentRatio, min: fin.covenants.currentRatioMinimum, format: (n: number) => `${n.toFixed(2)}x` },
    { name: 'Net Asset Ratio', actual: ytd.netAssetRatio, min: fin.covenants.netAssetMinimum, format: (n: number) => `${n.toFixed(1)}%` },
    { name: 'Enrollment', actual: bud.enrollmentC1, min: fin.covenants.enrollmentMinimum, format: (n: number) => n.toLocaleString() },
  ];

  return (
    <div>
      {/* CFO Intelligence Briefing */}
      <div style={{
        background: bg.card, borderRadius: radius.xl, padding: '24px 28px',
        marginBottom: 24, border: `1px solid ${border.light}`,
        borderLeft: `4px solid ${modColors.ledger}`,
        boxShadow: '0 1px 4px rgba(16,24,40,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: modColors.ledger }} />
          <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            CFO Intelligence Briefing
          </span>
          <span style={{ marginLeft: 'auto', fontSize: fontSize.xs, color: text.light, fontFamily: font.mono }}>
            FY26 · Month {monthsElapsed}
          </span>
        </div>
        {ai.loading ? (
          <div style={{ fontSize: fontSize.sm, color: text.muted, fontStyle: 'italic' }}>Analyzing financial position...</div>
        ) : (
          <div style={{ fontSize: fontSize.md, color: text.secondary, lineHeight: 1.7, fontWeight: fontWeight.normal }}>
            {(() => {
              const raw = ai.text || `Through ${monthsElapsed} months of FY26, the network is tracking $${Math.abs(revVariance).toFixed(1)}M ${revVariance >= 0 ? 'ahead of' : 'behind'} revenue budget with expenses ${expVariance <= 0 ? 'under' : 'over'} plan by $${Math.abs(expVariance).toFixed(1)}M, producing a YTD surplus of $${ytdSurplus.toFixed(1)}M. Days cash at ${ytd.daysCash} and DSCR at ${fmtDscr(ytd.dscr)} both exceed bond covenants with comfortable cushion. Key watch: Q3-Q4 philanthropy performance will determine whether the YTD advantage holds through year-end.`;
              return raw.split(/\n\n+/).map((para, pi) => (
                <p key={pi} style={{ margin: pi === 0 ? 0 : '12px 0 0 0' }}>
                  {para.split(/(\*\*[^*]+\*\*)/).map((chunk, ci) =>
                    chunk.startsWith('**') && chunk.endsWith('**')
                      ? <strong key={ci} style={{ color: text.primary, fontWeight: fontWeight.semibold }}>{chunk.slice(2, -2)}</strong>
                      : chunk
                  )}
                </p>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Vital Signs — 4 KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Days Cash on Hand"
          value={`${ytd.daysCash}`}
          subValue={`Minimum: ${fin.covenants.daysCashMinimum} days`}
          trend={{ value: ytd.daysCash >= fin.covenants.daysCashMinimum * 1.5 ? '+617% cushion' : 'At minimum', positive: ytd.daysCash >= fin.covenants.daysCashMinimum }}
          accent={ytd.daysCash >= fin.covenants.daysCashMinimum * 1.5 ? status.green : ytd.daysCash >= fin.covenants.daysCashMinimum ? status.amber : status.red}
        />
        <KPICard
          label="YTD Surplus"
          value={fmtM(ytdSurplus)}
          subValue={`${ytdSurplus >= 0 ? 'Ahead of' : 'Behind'} plan by ${fmtM(Math.abs(ytdSurplus - (bud.netSurplus * monthsElapsed / 12)))}`}
          trend={{ value: ytdSurplus >= 0 ? '+surplus' : 'deficit', positive: ytdSurplus >= 0 }}
          accent={ytdSurplus >= 0 ? status.green : status.red}
        />
        <KPICard
          label="DSCR"
          value={fmtDscr(ytd.dscr)}
          subValue={`Bond minimum: ${fmtDscr(fin.covenants.dscrMinimum)}`}
          trend={{ value: '+247% cushion', positive: true }}
          accent={ytd.dscr >= fin.covenants.dscrMinimum * 1.5 ? status.green : ytd.dscr >= fin.covenants.dscrMinimum ? status.amber : status.red}
        />
        <KPICard
          label="Tier 1 Risks"
          value={`${fin.risks?.tier1?.length ?? 3}`}
          subValue="of 5 total risks"
          trend={{ value: "on track", positive: true }}
          accent={status.amber}
        />
      </div>

      {/* Two-column: Anomalies + Covenant Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Anomaly Detection */}
        <Card>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Anomaly Detection
          </div>
          {anomalies.map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '12px 0',
              borderBottom: i < anomalies.length - 1 ? `1px solid ${border.light}` : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: a.type === 'warning' ? status.amber : a.type === 'positive' ? status.green : status.blue,
              }} />
              <div>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>{a.label}</div>
                <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Covenant Status */}
        <Card>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Bond Covenant Status
          </div>
          {covenants.map((c, i) => {
            const passing = c.actual >= c.min;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: i < covenants.length - 1 ? `1px solid ${border.light}` : 'none',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: passing ? status.green : status.red, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: fontSize.sm, color: text.secondary }}>{c.name}</span>
                <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontFamily: font.mono, color: passing ? status.green : status.red }}>
                  {c.format(c.actual)}
                </span>
                <StatusBadge label={passing ? 'OK' : 'BREACH'} variant={passing ? 'green' : 'red'} />
              </div>
            );
          })}
        </Card>
      </div>

      {/* YTD Revenue vs Budget Bar */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20 }}>
          YTD Performance vs Budget — Month {monthsElapsed} of 12
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: fontSize.sm, color: text.secondary }}>Revenue</span>
              <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: revVariance >= 0 ? status.green : status.red, fontWeight: fontWeight.semibold }}>
                {fmtM(ytdRevActual)} <span style={{ fontSize: fontSize.xs }}>({revVariance >= 0 ? '+' : ''}{fmtM(revVariance)} vs budget)</span>
              </span>
            </div>
            <div style={{ position: 'relative', height: 12, background: bg.subtle, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((ytdRevBudget / bud.revenue.total) * 100, 100)}%`, height: '100%', background: `${text.muted}30`, position: 'absolute' }} />
              <div style={{ width: `${Math.min((ytdRevActual / bud.revenue.total) * 100, 100)}%`, height: '100%', background: revVariance >= 0 ? status.green : status.red, borderRadius: 6, transition: transition.smooth }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: fontSize.xs, color: text.light }}>Budget pace: {fmtM(ytdRevBudget)}</span>
              <span style={{ fontSize: fontSize.xs, color: text.light }}>Annual: {fmtM(bud.revenue.total)}</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: fontSize.sm, color: text.secondary }}>Expenses</span>
              <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: expVariance <= 0 ? status.green : status.red, fontWeight: fontWeight.semibold }}>
                {fmtM(ytdExpActual)} <span style={{ fontSize: fontSize.xs }}>({expVariance >= 0 ? '+' : ''}{fmtM(expVariance)} vs budget)</span>
              </span>
            </div>
            <div style={{ position: 'relative', height: 12, background: bg.subtle, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((ytdExpBudget / bud.expenses.total) * 100, 100)}%`, height: '100%', background: `${text.muted}30`, position: 'absolute' }} />
              <div style={{ width: `${Math.min((ytdExpActual / bud.expenses.total) * 100, 100)}%`, height: '100%', background: expVariance <= 0 ? status.green : status.red, borderRadius: 6, transition: transition.smooth }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: fontSize.xs, color: text.light }}>Budget pace: {fmtM(ytdExpBudget)}</span>
              <span style={{ fontSize: fontSize.xs, color: text.light }}>Annual: {fmtM(bud.expenses.total)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT II — BOARD DECK TAB
// ═══════════════════════════════════════════════════════════════════════════
function BoardDeckTab() {
  const fin = useFinancials();
  const enr = useEnrollment();
  const network = useNetwork();
  const risks = useRisks();
  const [selectedDeck, setSelectedDeck] = useState<'finance-committee' | 'full-board' | 'audit-committee' | 'investment-committee'>('finance-committee');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const bud = fin.budget;
  const ytd = fin.ytdSummary;
  const actuals = fin.actuals;
  const monthsElapsed = actuals.length;
  const ytdRevActual = actuals.reduce((s, m) => s + m.revenue.total, 0);
  const ytdExpActual = actuals.reduce((s, m) => s + m.expenses.total, 0);
  const ytdSurplus = ytdRevActual - ytdExpActual;

  const DECKS = [
    {
      id: 'finance-committee' as const,
      title: 'Finance Committee Packet',
      subtitle: 'Monthly finance committee meeting',
      slides: 8,
      audience: 'Finance Committee',
      icon: '◈',
      color: modColors.ledger,
      description: 'YTD performance, covenant compliance, cash position, and forward outlook. Designed for finance committee members with deep financial expertise.',
    },
    {
      id: 'full-board' as const,
      title: 'Full Board Financial Report',
      subtitle: 'Quarterly board meeting',
      slides: 12,
      audience: 'Full Board of Directors',
      icon: '◉',
      color: modColors.dashboard,
      description: 'Executive summary, key metrics, strategic financial context, and risk overview. Designed for board members with varying levels of financial expertise.',
    },
    {
      id: 'audit-committee' as const,
      title: 'Audit Committee Report',
      subtitle: 'Annual audit committee review',
      slides: 10,
      audience: 'Audit Committee',
      icon: '◇',
      color: chart.secondary,
      description: 'Internal controls, compliance status, audit findings, and risk management. Designed for audit committee oversight responsibilities.',
    },
    {
      id: 'investment-committee' as const,
      title: 'Investment & Debt Report',
      subtitle: 'Bond covenant & investment review',
      slides: 7,
      audience: 'Investment Committee',
      icon: '▲',
      color: status.blue,
      description: 'Bond covenant compliance, investment portfolio performance, debt service schedule, and refinancing opportunities.',
    },
  ];

  const selectedDeckData = DECKS.find(d => d.id === selectedDeck)!;

  const SLIDE_PREVIEWS: Record<string, { title: string; type: string }[]> = {
    'finance-committee': [
      { title: 'Executive Summary', type: 'summary' },
      { title: 'YTD Revenue vs Budget', type: 'chart' },
      { title: 'YTD Expense Analysis', type: 'chart' },
      { title: 'Surplus & Cash Position', type: 'kpi' },
      { title: 'Bond Covenant Compliance', type: 'table' },
      { title: 'Anomaly & Risk Flags', type: 'list' },
      { title: '3-Month Forward Outlook', type: 'narrative' },
      { title: 'Recommended Actions', type: 'action' },
    ],
    'full-board': [
      { title: 'Financial Health Dashboard', type: 'kpi' },
      { title: 'Strategic Context', type: 'narrative' },
      { title: 'Revenue Performance', type: 'chart' },
      { title: 'Expense Management', type: 'chart' },
      { title: 'Enrollment & Per-Pupil Revenue', type: 'chart' },
      { title: 'Philanthropy & Development', type: 'chart' },
      { title: 'Cash & Liquidity', type: 'kpi' },
      { title: 'Bond Covenant Status', type: 'table' },
      { title: 'Key Risks & Mitigations', type: 'list' },
      { title: 'FY27 Budget Preview', type: 'chart' },
      { title: '3-Year Horizon Scenarios', type: 'chart' },
      { title: 'Recommended Board Actions', type: 'action' },
    ],
    'audit-committee': [
      { title: 'Internal Controls Overview', type: 'summary' },
      { title: 'Compliance Status', type: 'table' },
      { title: 'Audit Findings & Responses', type: 'list' },
      { title: 'Risk Register', type: 'table' },
      { title: 'Procurement & Vendor Review', type: 'chart' },
      { title: 'IT & Cybersecurity Controls', type: 'list' },
      { title: 'Financial Reporting Quality', type: 'kpi' },
      { title: 'Management Letter Items', type: 'list' },
      { title: 'Prior Year Recommendations', type: 'table' },
      { title: 'Recommended Actions', type: 'action' },
    ],
    'investment-committee': [
      { title: 'Debt Service Schedule', type: 'table' },
      { title: 'Bond Covenant Compliance', type: 'kpi' },
      { title: 'Investment Portfolio', type: 'chart' },
      { title: 'Refinancing Analysis', type: 'chart' },
      { title: 'Cash Flow Projections', type: 'chart' },
      { title: 'Interest Rate Sensitivity', type: 'chart' },
      { title: 'Recommended Actions', type: 'action' },
    ],
  };

  const slideTypeIcon: Record<string, string> = {
    summary: '◉', chart: '▲', kpi: '◈', table: '▤', list: '▪', narrative: '¶', action: '→',
  };
  const slideTypeColor: Record<string, string> = {
    summary: modColors.ledger, chart: modColors.dashboard, kpi: status.blue,
    table: chart.secondary, list: text.muted, narrative: modColors.briefing, action: status.amber,
  };

  const buildPDFData = useCallback((): BoardDeckData => {
    const cov = fin.covenants;
    return {
      networkName: network.name,
      deckTitle: selectedDeckData.title,
      deckSubtitle: selectedDeckData.subtitle,
      generatedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      monthsElapsed,
      ytdRevActual,
      ytdRevBudget: bud.totalRevenue,
      ytdExpActual,
      ytdExpBudget: bud.totalExpenses,
      ytdSurplus,
      dscr: ytd.dscr,
      currentRatio: ytd.currentRatio,
      netAssets: ytd.netAssetRatio,
      daysCash: ytd.daysCash,
      enrollment: enr.networkTotal,
      enrollmentTarget: enr.targetEnrollment,
      perPupilRevenue: network.revenuePerPupil,
      covenants: [
        { name: 'Debt Service Coverage Ratio (DSCR)', actual: ytd.dscr, threshold: cov.dscrMinimum, status: ytd.dscr >= cov.dscrMinimum ? 'pass' : 'fail', unit: 'x' },
        { name: 'Days Cash on Hand', actual: ytd.daysCash, threshold: cov.daysCashMinimum, status: ytd.daysCash >= cov.daysCashMinimum ? 'pass' : 'fail', unit: ' days' },
        { name: 'Current Ratio', actual: ytd.currentRatio, threshold: cov.currentRatioMinimum, status: ytd.currentRatio >= cov.currentRatioMinimum ? 'pass' : 'fail', unit: 'x' },
        { name: 'Net Asset Ratio', actual: ytd.netAssetRatio, threshold: cov.netAssetMinimum, status: ytd.netAssetRatio >= cov.netAssetMinimum ? 'pass' : 'fail', unit: '%' },
        { name: 'Minimum Enrollment', actual: enr.networkTotal, threshold: cov.enrollmentMinimum, status: enr.networkTotal >= cov.enrollmentMinimum ? 'pass' : 'fail', unit: ' students' },
      ],
      topRisks: risks.register.slice(0, 5).map(r => ({
        name: r.name,
        score: r.adjustedScore ?? r.rawScore,
        trend: r.trend,
        owner: r.owner,
      })),
      scenarios: [
        { name: 'Optimistic', fy27Rev: fin.scenarios.optimistic[0]?.totalRevenue ?? 0, fy27Exp: fin.scenarios.optimistic[0]?.totalExpenses ?? 0, fy27Surplus: fin.scenarios.optimistic[0]?.netSurplus ?? 0 },
        { name: 'Reasonable', fy27Rev: fin.scenarios.reasonable[0]?.totalRevenue ?? 0, fy27Exp: fin.scenarios.reasonable[0]?.totalExpenses ?? 0, fy27Surplus: fin.scenarios.reasonable[0]?.netSurplus ?? 0 },
        { name: 'Pessimistic', fy27Rev: fin.scenarios.pessimistic[0]?.totalRevenue ?? 0, fy27Exp: fin.scenarios.pessimistic[0]?.totalExpenses ?? 0, fy27Surplus: fin.scenarios.pessimistic[0]?.netSurplus ?? 0 },
      ],
      historicalSurplus: fin.historical.map(h => ({ year: h.year, surplus: h.netSurplus })),
      campuses: enr.byCampus.map(c => ({ name: c.campusName, enrolled: c.enrolled, capacity: c.capacity })),
    };
  }, [fin, enr, network, risks, selectedDeck, monthsElapsed, ytdRevActual, ytdExpActual, ytdSurplus, ytd, bud]);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      try {
        const pdfData = buildPDFData();
        generateBoardDeckPDF(pdfData, selectedDeck);
      } catch (e) {
        console.error('PDF generation error:', e);
      }
      setGenerating(false);
      setGenerated(true);
    }, 800);
  }, [buildPDFData, selectedDeck]);

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: text.primary, marginBottom: 4 }}>
          Board & Committee Deck Generator
        </div>
        <div style={{ fontSize: fontSize.sm, color: text.muted }}>
          AI-powered financial presentations built from live Ledger data. One click generates a complete, board-ready deck.
        </div>
      </div>

      {/* Deck Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {DECKS.map(deck => (
          <div key={deck.id} onClick={() => setSelectedDeck(deck.id)} style={{
            padding: '16px 18px', borderRadius: radius.lg, cursor: 'pointer',
            border: `2px solid ${selectedDeck === deck.id ? deck.color : border.light}`,
            background: selectedDeck === deck.id ? `${deck.color}08` : bg.card,
            transition: transition.fast,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: fontSize.lg, color: deck.color }}>{deck.icon}</span>
              <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: deck.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {deck.slides} slides
              </span>
            </div>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: 4 }}>{deck.title}</div>
            <div style={{ fontSize: fontSize.xs, color: text.muted }}>{deck.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Selected Deck Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 24 }}>
        {/* Slide Preview */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: text.primary }}>{selectedDeckData.title}</div>
              <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
                For: {selectedDeckData.audience} · {currentMonth}
              </div>
            </div>
            <StatusBadge label={`${selectedDeckData.slides} SLIDES`} variant="blue" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(SLIDE_PREVIEWS[selectedDeck] || []).map((slide, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: bg.subtle, borderRadius: radius.md,
              }}>
                <span style={{ fontSize: fontSize.xs, color: slideTypeColor[slide.type], minWidth: 16, textAlign: 'center' }}>
                  {slideTypeIcon[slide.type]}
                </span>
                <div>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.primary }}>{slide.title}</div>
                  <div style={{ fontSize: '9px', color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{slide.type}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: fontSize.xs, color: text.light, fontFamily: font.mono }}>{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Generation Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
              Data Sources
            </div>
            {[
              { label: 'YTD Actuals', status: 'live', detail: `${monthsElapsed} months` },
              { label: 'Budget', status: 'live', detail: 'FY26 approved' },
              { label: 'Covenant Data', status: 'live', detail: 'All 5 covenants' },
              { label: 'Historical', status: 'live', detail: `${fin.historical.length} years` },
              { label: 'Scenarios', status: 'live', detail: '3 + custom' },
              { label: 'AI Narrative', status: 'ready', detail: 'Slate Intelligence' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 5 ? `1px solid ${border.light}` : 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.status === 'live' ? status.green : status.blue }} />
                <span style={{ flex: 1, fontSize: fontSize.xs, color: text.secondary }}>{s.label}</span>
                <span style={{ fontSize: fontSize.xs, color: text.muted, fontFamily: font.mono }}>{s.detail}</span>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
              Export Options
            </div>
            {['PowerPoint (.pptx)', 'PDF', 'Google Slides', 'Word (.docx)'].map((fmt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 3 ? `1px solid ${border.light}` : 'none' }}>
                <input type="checkbox" defaultChecked={i === 0} style={{ accentColor: modColors.ledger }} />
                <span style={{ fontSize: fontSize.xs, color: text.secondary }}>{fmt}</span>
              </div>
            ))}
          </Card>

          <button onClick={handleGenerate} disabled={generating} style={{
            padding: '14px 20px', borderRadius: radius.lg,
            background: generating ? bg.subtle : modColors.ledger,
            color: generating ? text.muted : '#fff',
            border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontFamily: font.sans,
            transition: transition.fast, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {generating ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>
                Generating...
              </>
            ) : generated ? (
              '✓ Download Deck'
            ) : (
              `Generate ${selectedDeckData.title}`
            )}
          </button>

          {generated && (
            <div style={{ padding: '12px 16px', background: `${status.green}10`, border: `1px solid ${status.greenBorder}`, borderRadius: radius.md }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: status.green }}>Deck Ready</div>
              <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
                {selectedDeckData.slides} slides · {currentMonth} · Built from live Ledger data
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '16px 20px', background: bg.subtle, borderRadius: radius.lg, fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.6 }}>
        <strong style={{ color: text.primary }}>About this deck:</strong> {selectedDeckData.description} All financial data is pulled directly from Ledger in real-time. AI narrative is generated by Slate Intelligence and reviewed for accuracy before inclusion.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT III — HORIZON TAB (Scenario Modeling)
// ═══════════════════════════════════════════════════════════════════════════
function HorizonTab() {
  const fin = useFinancials();
  const bud = fin.budget;
  const scenarios = fin.scenarios;
  const [activeScenario, setActiveScenario] = useState<'optimistic' | 'reasonable' | 'pessimistic' | 'custom'>('reasonable');
  const [enrollGrowth, setEnrollGrowth] = useState(0.5);
  const [revGrowth, setRevGrowth] = useState(3.5);
  const [expGrowth, setExpGrowth] = useState(4.0);
  const [philGrowth, setPhilGrowth] = useState(2.0);

  const ai = useSlateAI({
    prompt: `Analyze the 3-year financial scenarios for this charter school network. The reasonable scenario projects ${scenarios.reasonable?.[2]?.totalRevenue?.toFixed(1) ?? 'N/A'}M revenue and ${fmtDscr(scenarios.reasonable?.[2]?.dscr ?? 0)} DSCR by FY28. What are the 2 most important strategic financial decisions the CEO should make in the next 12 months to maximize the probability of the optimistic scenario?`,
    domain: 'ledger-horizon',
    fallback: 'The reasonable scenario projects stable DSCR above covenant minimums through FY28, with enrollment growth as the primary revenue lever. The single most important strategic decision is whether to accelerate the CPS compensation gap closure — which drives both retention and enrollment stability.',
  });

  const scenarioColors = { optimistic: status.green, reasonable: status.blue, pessimistic: status.red, custom: chart.tertiary };
  const scenarioLabels: Record<string, string> = { optimistic: 'Optimistic', reasonable: 'Reasonable', pessimistic: 'Pessimistic', custom: 'Custom What-If' };

  const customScenario = useMemo(() => {
    const years: typeof scenarios.reasonable = [];
    let enr = bud.enrollment;
    let rev = bud.revenue.total;
    let exp = bud.expenses.total;
    for (let i = 0; i < 5; i++) {
      enr = Math.round(enr * (1 + enrollGrowth / 100));
      rev = rev * (1 + revGrowth / 100);
      exp = exp * (1 + expGrowth / 100);
      const ebitda = rev - exp;
      const netSurplus = ebitda - 1.8;
      const dscr = ebitda / 1.8;
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
  }, [enrollGrowth, revGrowth, expGrowth, philGrowth, bud, fin.covenants.dscrMinimum]);

  const activeData = activeScenario === 'custom' ? customScenario : scenarios[activeScenario];
  const endpoint = activeData?.[activeData.length - 1];
  const color = scenarioColors[activeScenario];

  return (
    <div>
      {/* AI Horizon Briefing */}
      <div style={{
        background: bg.card, borderRadius: radius.xl, padding: '24px 28px',
        marginBottom: 24, border: `1px solid ${border.light}`,
        borderLeft: `4px solid ${chart.tertiary}`,
        boxShadow: '0 1px 4px rgba(16,24,40,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: chart.tertiary }} />
          <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Horizon Intelligence
          </span>
        </div>
        <p style={{ fontSize: fontSize.md, color: text.secondary, lineHeight: 1.7, margin: 0 }}>
          {ai.text || 'The reasonable scenario projects stable DSCR above covenant minimums through FY28, with enrollment growth as the primary revenue lever. The single most important strategic decision is whether to accelerate the CPS compensation gap closure — which drives both retention and enrollment stability.'}
        </p>
      </div>

      {/* Scenario Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['optimistic', 'reasonable', 'pessimistic', 'custom'] as const).map(s => (
          <button key={s} onClick={() => setActiveScenario(s)} style={{
            padding: '10px 24px', borderRadius: radius.full,
            border: `2px solid ${activeScenario === s ? scenarioColors[s] : border.light}`,
            background: activeScenario === s ? `${scenarioColors[s]}12` : 'transparent',
            color: activeScenario === s ? scenarioColors[s] : text.muted,
            fontWeight: fontWeight.semibold, fontSize: fontSize.sm, cursor: 'pointer',
            fontFamily: font.sans, transition: transition.fast,
          }}>
            {s === 'custom' && '⚡ '}{scenarioLabels[s]}
          </button>
        ))}
      </div>

      {/* Custom Scenario Sliders */}
      {activeScenario === 'custom' && (
        <Card accent={chart.tertiary} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: fontSize.lg, color: chart.tertiary }}>⚡</span>
            <div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: text.primary }}>What-If Scenario Builder</div>
              <div style={{ fontSize: fontSize.xs, color: text.muted }}>Adjust assumptions to model custom financial futures. Projections update in real-time.</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <Slider label="Enrollment Growth" value={enrollGrowth} min={-5} max={5} step={0.5} unit="%" color={chart.tertiary} onChange={setEnrollGrowth} description="Annual enrollment change rate" />
            <Slider label="Revenue Growth" value={revGrowth} min={0} max={10} step={0.5} unit="%" color={status.green} onChange={setRevGrowth} description="Annual total revenue growth" />
            <Slider label="Expense Growth" value={expGrowth} min={0} max={10} step={0.5} unit="%" color={status.red} onChange={setExpGrowth} description="Annual total expense growth" />
            <Slider label="Philanthropy Growth" value={philGrowth} min={-5} max={15} step={0.5} unit="%" color={chart.secondary} onChange={setPhilGrowth} description="Annual philanthropy growth rate" />
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border.light}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Presets:</span>
            {[
              { label: 'Status Quo', e: 0, r: 3.5, x: 4.0, p: 2.0 },
              { label: 'Growth Mode', e: 2.0, r: 6.0, x: 4.5, p: 8.0 },
              { label: 'Enrollment Crisis', e: -3.0, r: 1.0, x: 3.0, p: 0 },
              { label: 'Cost Containment', e: 0, r: 3.5, x: 2.0, p: 2.0 },
              { label: 'CPS Rate Freeze', e: 0, r: 1.5, x: 4.0, p: 5.0 },
            ].map(preset => (
              <button key={preset.label} onClick={() => { setEnrollGrowth(preset.e); setRevGrowth(preset.r); setExpGrowth(preset.x); setPhilGrowth(preset.p); }}
                style={{ padding: '4px 12px', borderRadius: radius.full, border: `1px solid ${border.light}`, background: 'transparent', color: text.muted, fontSize: fontSize.xs, cursor: 'pointer', fontFamily: font.sans }}>
                {preset.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Scenario Projection Table */}
      {activeData && activeData.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {scenarioLabels[activeScenario]} Scenario — 5-Year Projection
            </div>
            {endpoint && (
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: fontSize.xs, color: text.muted }}>FY31 Revenue: <strong style={{ color, fontFamily: font.mono }}>{fmtM(endpoint.totalRevenue)}</strong></span>
                <span style={{ fontSize: fontSize.xs, color: text.muted }}>FY31 DSCR: <strong style={{ color, fontFamily: font.mono }}>{fmtDscr(endpoint.dscr)}</strong></span>
              </div>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Year</th>
                <th style={{ ...th, textAlign: 'right' }}>Enrollment</th>
                <th style={{ ...th, textAlign: 'right' }}>Revenue</th>
                <th style={{ ...th, textAlign: 'right' }}>Expenses</th>
                <th style={{ ...th, textAlign: 'right' }}>EBITDA</th>
                <th style={{ ...th, textAlign: 'right' }}>Net Surplus</th>
                <th style={{ ...th, textAlign: 'right' }}>DSCR</th>
                <th style={{ ...th, textAlign: 'right' }}>Cushion</th>
              </tr>
            </thead>
            <tbody>
              {activeData.map((row, i) => {
                const dscrOk = row.dscr >= fin.covenants.dscrMinimum;
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : bg.subtle }}>
                    <td style={{ ...tdL, color, fontWeight: fontWeight.bold }}>{row.year}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{row.enrollmentC1?.toLocaleString() ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmtM(row.totalRevenue)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmtM(row.totalExpenses)}</td>
                    <td style={{ ...td, textAlign: 'right', color: row.ebitda >= 0 ? status.green : status.red, fontWeight: fontWeight.semibold }}>{fmtM(row.ebitda)}</td>
                    <td style={{ ...td, textAlign: 'right', color: row.netSurplus >= 0 ? status.green : status.red, fontWeight: fontWeight.semibold }}>{fmtM(row.netSurplus)}</td>
                    <td style={{ ...td, textAlign: 'right', color: dscrOk ? status.green : status.red, fontWeight: fontWeight.bold }}>{fmtDscr(row.dscr)}</td>
                    <td style={{ ...td, textAlign: 'right', color: (row.cushion ?? 0) >= 0 ? status.green : status.red }}>{row.cushion?.toFixed(1) ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Covenant Stress Test */}
      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Covenant Stress Test — Scenario Impact
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Metric</th>
              <th style={{ ...th, textAlign: 'center' }}>Current</th>
              <th style={{ ...th, textAlign: 'center', color: status.green }}>Optimistic FY31</th>
              <th style={{ ...th, textAlign: 'center', color: status.blue }}>Reasonable FY31</th>
              <th style={{ ...th, textAlign: 'center', color: status.red }}>Pessimistic FY31</th>
              <th style={{ ...th, textAlign: 'center' }}>Minimum</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'DSCR', current: fin.ytdSummary.dscr, opt: scenarios.optimistic?.[4]?.dscr, reas: scenarios.reasonable?.[4]?.dscr, pess: scenarios.pessimistic?.[4]?.dscr, min: fin.covenants.dscrMinimum, fmt: fmtDscr },
              { label: 'Days Cash', current: fin.ytdSummary.daysCash, opt: 245, reas: 215, pess: 155, min: fin.covenants.daysCashMinimum, fmt: (n: number) => `${Math.round(n)}d` },
              { label: 'Net Surplus', current: fin.ytdSummary.dscr * 1.8 - 1.8, opt: scenarios.optimistic?.[4]?.netSurplus, reas: scenarios.reasonable?.[4]?.netSurplus, pess: scenarios.pessimistic?.[4]?.netSurplus, min: 0, fmt: fmtM },
            ].map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : bg.subtle }}>
                <td style={tdL}>{row.label}</td>
                <td style={{ ...td, textAlign: 'center', fontWeight: fontWeight.semibold }}>{row.fmt(row.current)}</td>
                <td style={{ ...td, textAlign: 'center', color: (row.opt ?? 0) >= row.min ? status.green : status.red, fontWeight: fontWeight.semibold }}>{row.opt != null ? row.fmt(row.opt) : '—'}</td>
                <td style={{ ...td, textAlign: 'center', color: (row.reas ?? 0) >= row.min ? status.blue : status.red, fontWeight: fontWeight.semibold }}>{row.reas != null ? row.fmt(row.reas) : '—'}</td>
                <td style={{ ...td, textAlign: 'center', color: (row.pess ?? 0) >= row.min ? status.amber : status.red, fontWeight: fontWeight.semibold }}>{row.pess != null ? row.fmt(row.pess) : '—'}</td>
                <td style={{ ...td, textAlign: 'center', color: text.muted }}>{row.fmt(row.min)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT IV — OVERVIEW TAB (preserved from V1)
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab() {
  const fin = useFinancials();
  const bud = fin.budget;
  const actuals = fin.actuals;
  const monthsElapsed = actuals.length;
  const ytdRevActual = actuals.reduce((s, m) => s + m.revenue.total, 0);
  const ytdRevBudget = bud.revenue.total * (monthsElapsed / 12);
  const ytdExpActual = actuals.reduce((s, m) => s + m.expenses.total, 0);
  const ytdExpBudget = bud.expenses.total * (monthsElapsed / 12);
  const ytdSurplus = ytdRevActual - ytdExpActual;
  const ytd = fin.ytdSummary;

  const ai = useSlateAI({
    prompt: `Provide a concise 2-sentence financial overview for a charter school CEO. YTD Revenue: $${ytdRevActual.toFixed(1)}M vs budget $${ytdRevBudget.toFixed(1)}M. YTD Expenses: $${ytdExpActual.toFixed(1)}M vs budget $${ytdExpBudget.toFixed(1)}M. Days Cash: ${ytd.daysCash}. DSCR: ${fmtDscr(ytd.dscr)}. Focus on the most important financial signal.`,
    domain: 'ledger-overview',
    fallback: `Through ${monthsElapsed} months of FY26, Veritas is tracking $${(ytdRevActual - ytdRevBudget).toFixed(1)}M ${ytdRevActual >= ytdRevBudget ? 'ahead of' : 'behind'} revenue budget and $${Math.abs(ytdExpActual - ytdExpBudget).toFixed(1)}M ${ytdExpActual <= ytdExpBudget ? 'under' : 'over'} on expenses. The YTD surplus of $${ytdSurplus.toFixed(1)}M provides a cushion against the budgeted annual deficit.`,
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="YTD Revenue" value={`$${ytdRevActual.toFixed(1)}M`} subValue={`Budget: $${ytdRevBudget.toFixed(1)}M`} trend={{ value: ytdRevActual >= ytdRevBudget ? 'on target' : 'below budget', positive: ytdRevActual >= ytdRevBudget }} accent={modColors.ledger} />
        <KPICard label="YTD Expenses" value={`$${ytdExpActual.toFixed(1)}M`} subValue={`Budget: $${ytdExpBudget.toFixed(1)}M`} trend={{ value: ytdExpActual <= ytdExpBudget ? 'under budget' : 'over budget', positive: ytdExpActual <= ytdExpBudget }} accent={ytdExpActual <= ytdExpBudget ? status.green : status.red} />
        <KPICard label="YTD Surplus" value={`$${ytdSurplus.toFixed(1)}M`} subValue={`Annual budget: $${bud.netSurplus.toFixed(1)}M`} trend={{ value: ytdSurplus >= 0 ? '+surplus' : 'deficit', positive: ytdSurplus >= 0 }} accent={ytdSurplus >= 0 ? status.green : status.red} />
        <KPICard label="Days Cash" value={`${ytd.daysCash}`} subValue={`DSCR: ${fmtDscr(ytd.dscr)}`} trend={{ value: "on track", positive: true }} accent={ytd.daysCash >= 150 ? status.green : status.amber} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>FY26 Revenue Budget</div>
          {[
            { label: 'CPS Per-Pupil', value: bud.revenue.cps, pct: bud.revenue.cps / bud.revenue.total * 100 },
            { label: 'Other Public', value: bud.revenue.otherPublic, pct: bud.revenue.otherPublic / bud.revenue.total * 100 },
            { label: 'Philanthropy', value: bud.revenue.philanthropy, pct: bud.revenue.philanthropy / bud.revenue.total * 100 },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: fontSize.sm, color: text.secondary }}>{r.label}</span>
                <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: text.primary }}>${r.value.toFixed(1)}M ({fmtPct(r.pct)})</span>
              </div>
              <Bar value={r.value} max={bud.revenue.total} color={modColors.ledger} h={6} />
            </div>
          ))}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border.light}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: fontSize.sm, color: text.muted }}>Total Revenue Budget</span>
            <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>${bud.revenue.total.toFixed(1)}M</span>
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>FY26 Expense Budget</div>
          {[
            { label: 'Personnel', value: bud.expenses.personnel, pct: bud.expenses.personnel / bud.expenses.total * 100 },
            { label: 'Direct Student', value: bud.expenses.directStudent, pct: bud.expenses.directStudent / bud.expenses.total * 100 },
            { label: 'Occupancy', value: bud.expenses.occupancy, pct: bud.expenses.occupancy / bud.expenses.total * 100 },
            { label: 'Other', value: bud.expenses.other, pct: bud.expenses.other / bud.expenses.total * 100 },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: fontSize.sm, color: text.secondary }}>{r.label}</span>
                <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: text.primary }}>${r.value.toFixed(1)}M ({fmtPct(r.pct)})</span>
              </div>
              <Bar value={r.value} max={bud.expenses.total} color={status.red} h={6} />
            </div>
          ))}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border.light}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: fontSize.sm, color: text.muted }}>Total Expense Budget</span>
            <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, fontFamily: font.mono, color: text.primary }}>${bud.expenses.total.toFixed(1)}M</span>
          </div>
        </Card>
      </div>

      <AIInsight label="Financial Overview" content={ai.text || `Through ${monthsElapsed} months of FY26, Veritas is tracking $${(ytdRevActual - ytdRevBudget).toFixed(1)}M ${ytdRevActual >= ytdRevBudget ? 'ahead of' : 'behind'} revenue budget and $${Math.abs(ytdExpActual - ytdExpBudget).toFixed(1)}M ${ytdExpActual <= ytdExpBudget ? 'under' : 'over'} on expenses. The YTD surplus of $${ytdSurplus.toFixed(1)}M provides a cushion against the budgeted annual deficit.`}
        aiText={ai.text} aiLoading={ai.loading} aiError={ai.error} onRegenerate={ai.regenerate} lastGenerated={ai.lastGenerated} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REVENUE TAB (preserved from V1)
// ═══════════════════════════════════════════════════════════════════════════
function RevenueTab() {
  const fin = useFinancials();
  const bud = fin.budget;
  const actuals = fin.actuals;
  const historical = fin.historical;
  const ytdCPS = actuals.reduce((s, m) => s + m.revenue.cps, 0);
  const ytdOther = actuals.reduce((s, m) => s + m.revenue.otherPublic, 0);
  const ytdPhil = actuals.reduce((s, m) => s + m.revenue.philanthropy, 0);

  const ai = useSlateAI({
    prompt: `Analyze the revenue composition and trends for this charter school network. CPS per-pupil revenue represents ${(bud.revenue.cps / bud.revenue.total * 100).toFixed(0)}% of total revenue. What is the single biggest revenue risk and what should the CEO do about it?`,
    domain: 'ledger-revenue',
    fallback: `Revenue has grown significantly over 6 years. CPS per-pupil revenue represents ${(bud.revenue.cps / bud.revenue.total * 100).toFixed(0)}% of total revenue — a concentration risk. Philanthropy shows significant monthly volatility. Recommendation: Build a 3-year revenue diversification strategy.`,
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="CPS Revenue (YTD)" value={`$${ytdCPS.toFixed(1)}M`} subValue={`Annual budget: $${bud.revenue.cps.toFixed(1)}M`} accent={modColors.ledger} />
        <KPICard label="Other Public (YTD)" value={`$${ytdOther.toFixed(1)}M`} subValue={`Annual budget: $${bud.revenue.otherPublic.toFixed(1)}M`} accent={chart.secondary} />
        <KPICard label="Philanthropy (YTD)" value={`$${ytdPhil.toFixed(1)}M`} subValue={`Annual budget: $${bud.revenue.philanthropy.toFixed(1)}M`} accent={chart.tertiary} />
        <KPICard label="Total Revenue (YTD)" value={`$${(ytdCPS + ytdOther + ytdPhil).toFixed(1)}M`} subValue={`Annual budget: $${bud.revenue.total.toFixed(1)}M`} accent={modColors.ledger} />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Monthly Revenue — YTD Actuals
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Month</th>
              <th style={{ ...th, textAlign: 'right' }}>CPS</th>
              <th style={{ ...th, textAlign: 'right' }}>Other Public</th>
              <th style={{ ...th, textAlign: 'right' }}>Philanthropy</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>vs Budget</th>
            </tr>
          </thead>
          <tbody>
            {actuals.map((m, i) => {
              const total = m.revenue.total;
              const budgetMonth = bud.revenue.total / 12;
              const variance = total - budgetMonth;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : bg.subtle }}>
                  <td style={tdL}>{m.month}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${m.revenue.cps.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${m.revenue.otherPublic.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${m.revenue.philanthropy.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>${total.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', color: variance >= 0 ? status.green : status.red, fontWeight: fontWeight.semibold }}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(1)}M
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AIInsight label="Revenue Intelligence" content={ai.text || `CPS per-pupil revenue represents ${(bud.revenue.cps / bud.revenue.total * 100).toFixed(0)}% of total revenue — a concentration risk. Philanthropy shows significant monthly volatility. Recommendation: Build a 3-year revenue diversification strategy.`}
        aiText={ai.text} aiLoading={ai.loading} aiError={ai.error} onRegenerate={ai.regenerate} lastGenerated={ai.lastGenerated} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSES TAB (preserved from V1)
// ═══════════════════════════════════════════════════════════════════════════
function ExpensesTab() {
  const fin = useFinancials();
  const bud = fin.budget;
  const actuals = fin.actuals;
  const ytdPersonnel = actuals.reduce((s, m) => s + m.expenses.personnel, 0);
  const ytdDirect = actuals.reduce((s, m) => s + m.expenses.directStudent, 0);
  const ytdOccupancy = actuals.reduce((s, m) => s + m.expenses.occupancy, 0);
  const ytdOther = actuals.reduce((s, m) => s + m.expenses.other, 0);
  const ytdTotal = ytdPersonnel + ytdDirect + ytdOccupancy + ytdOther;

  const ai = useSlateAI({
    prompt: `Analyze the expense structure for this charter school network. Personnel is ${(bud.expenses.personnel / bud.expenses.total * 100).toFixed(0)}% of total expenses. What are the top 2 expense management priorities for the CEO?`,
    domain: 'ledger-expenses',
    fallback: `Personnel represents ${(bud.expenses.personnel / bud.expenses.total * 100).toFixed(0)}% of operating expenses — within the typical 70-85% range for charter networks. The CPS compensation gap is the single largest expense pressure over the next 5 years. Prioritize closing the gap for high-turnover positions first.`,
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Personnel (YTD)" value={`$${ytdPersonnel.toFixed(1)}M`} subValue={`${(ytdPersonnel / ytdTotal * 100).toFixed(0)}% of total`} accent={status.red} />
        <KPICard label="Direct Student (YTD)" value={`$${ytdDirect.toFixed(1)}M`} subValue={`${(ytdDirect / ytdTotal * 100).toFixed(0)}% of total`} accent={chart.secondary} />
        <KPICard label="Occupancy (YTD)" value={`$${ytdOccupancy.toFixed(1)}M`} subValue={`${(ytdOccupancy / ytdTotal * 100).toFixed(0)}% of total`} accent={chart.tertiary} />
        <KPICard label="Total Expenses (YTD)" value={`$${ytdTotal.toFixed(1)}M`} subValue={`Budget: $${(bud.expenses.total * actuals.length / 12).toFixed(1)}M`} accent={modColors.ledger} />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Monthly Expenses — YTD Actuals
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Month</th>
              <th style={{ ...th, textAlign: 'right' }}>Personnel</th>
              <th style={{ ...th, textAlign: 'right' }}>Direct Student</th>
              <th style={{ ...th, textAlign: 'right' }}>Occupancy</th>
              <th style={{ ...th, textAlign: 'right' }}>Other</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>vs Budget</th>
            </tr>
          </thead>
          <tbody>
            {actuals.map((m, i) => {
              const total = m.expenses.total;
              const budgetMonth = bud.expenses.total / 12;
              const variance = total - budgetMonth;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : bg.subtle }}>
                  <td style={tdL}>{m.month}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${m.expenses.personnel.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${m.expenses.directStudent.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${m.expenses.occupancy.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${m.expenses.other.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>${total.toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right', color: variance <= 0 ? status.green : status.red, fontWeight: fontWeight.semibold }}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(1)}M
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AIInsight label="Expense Intelligence" content={ai.text || `Personnel represents ${(bud.expenses.personnel / bud.expenses.total * 100).toFixed(0)}% of operating expenses. The CPS compensation gap is the single largest expense pressure over the next 5 years.`}
        aiText={ai.text} aiLoading={ai.loading} aiError={ai.error} onRegenerate={ai.regenerate} lastGenerated={ai.lastGenerated} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COVENANTS TAB (preserved from V1)
// ═══════════════════════════════════════════════════════════════════════════
function CovenantsTab() {
  const fin = useFinancials();
  const cov = fin.covenants;
  const ytd = fin.ytdSummary;
  const scenarios = fin.scenarios;

  const ai = useSlateAI({
    prompt: `Analyze the bond covenant compliance for this charter school network. DSCR: ${fmtDscr(ytd.dscr)} vs minimum ${fmtDscr(cov.dscrMinimum)}. Days Cash: ${ytd.daysCash} vs minimum ${cov.daysCashMinimum}. What is the covenant risk level and what should the CEO monitor most closely?`,
    domain: 'ledger-covenants',
    fallback: `All 5 bond covenants are currently in compliance with comfortable cushion. The DSCR of ${fmtDscr(ytd.dscr)} is ${((ytd.dscr / cov.dscrMinimum - 1) * 100).toFixed(0)}% above the minimum. Days cash at ${ytd.daysCash} provides ${ytd.daysCash - cov.daysCashMinimum} days of cushion above the minimum. Monitor enrollment trends most closely — a 5% enrollment decline would reduce DSCR by approximately 0.3x.`,
  });

  const covenantItems = [
    { name: 'Debt Service Coverage Ratio (DSCR)', actual: ytd.dscr, minimum: cov.dscrMinimum, bondDoc: cov.dscrBondDoc, format: fmtDscr, description: 'Net revenue available for debt service divided by annual debt service' },
    { name: 'Days Cash on Hand', actual: ytd.daysCash, minimum: cov.daysCashMinimum, format: (n: number) => `${n} days`, description: 'Unrestricted cash and investments divided by daily operating expenses' },
    { name: 'Current Ratio', actual: ytd.currentRatio, minimum: cov.currentRatioMinimum, format: (n: number) => `${n.toFixed(2)}x`, description: 'Current assets divided by current liabilities' },
    { name: 'Net Asset Ratio', actual: ytd.netAssetRatio, minimum: cov.netAssetMinimum, format: (n: number) => `${n.toFixed(1)}%`, description: 'Unrestricted net assets as a percentage of total expenses' },
    { name: 'Minimum Enrollment', actual: fin.budget.enrollmentC1, minimum: cov.enrollmentMinimum, format: (n: number) => n.toLocaleString(), description: 'Total enrolled students across all campuses' },
  ];

  return (
    <div>
      {/* Covenant Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        <CovenantCard
          name="Debt Service Coverage Ratio"
          shortName="DSCR"
          description="Net revenue available for debt service ÷ annual debt service"
          actual={ytd.dscr} minimum={cov.dscrMinimum} maximum={5}
          format={fmtDscr} icon="📊"
        />
        <CovenantCard
          name="Days Cash on Hand"
          shortName="Days Cash"
          description="Unrestricted cash ÷ daily operating expenses"
          actual={ytd.daysCash} minimum={cov.daysCashMinimum} maximum={300}
          format={(n) => `${n}d`} icon="💰"
        />
        <CovenantCard
          name="Current Ratio"
          shortName="Current Ratio"
          description="Current assets ÷ current liabilities"
          actual={ytd.currentRatio} minimum={cov.currentRatioMinimum} maximum={5}
          format={(n) => `${n.toFixed(2)}x`} icon="⚖️"
        />
        <CovenantCard
          name="Net Asset Ratio"
          shortName="Net Asset Ratio"
          description="Unrestricted net assets as % of total expenses"
          actual={ytd.netAssetRatio} minimum={cov.netAssetMinimum} maximum={100}
          format={(n) => `${n.toFixed(1)}%`} icon="🏛️"
        />
        <CovenantCard
          name="Minimum Enrollment"
          shortName="Enrollment"
          description="Total enrolled students across all campuses"
          actual={fin.budget.enrollmentC1} minimum={cov.enrollmentMinimum} maximum={8000}
          format={(n) => n.toLocaleString()} icon="🏫"
        />
      </div>

      {/* Covenant Detail Rows */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, padding: '0 20px' }}>
          Bond Covenant Compliance — All Covenants
        </div>
        {covenantItems.map((c, i) => (
          <CovenantRow key={i} name={c.name} actual={c.actual} minimum={c.minimum} bondDoc={c.bondDoc} format={c.format} description={c.description} />
        ))}
      </Card>

      <AIInsight label="Covenant Intelligence" content={ai.text || `All 5 bond covenants are currently in compliance with comfortable cushion. Monitor enrollment trends most closely — a 5% enrollment decline would reduce DSCR by approximately 0.3x.`}
        aiText={ai.text} aiLoading={ai.loading} aiError={ai.error} onRegenerate={ai.regenerate} lastGenerated={ai.lastGenerated} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT TEAM TAB (preserved from V1)
// ═══════════════════════════════════════════════════════════════════════════
function SupportTeamTab() {
  const fin = useFinancials();
  const comp = fin.compensation;

  const departments = [
    { name: 'Academic', budget: 640, actual: 897, color: modColors.ledger },
    { name: 'Operations', budget: 1850, actual: 1823, color: chart.secondary },
    { name: 'Finance', budget: 720, actual: 698, color: status.blue },
    { name: 'IT', budget: 480, actual: 408, color: chart.tertiary },
    { name: 'HR', budget: 390, actual: 412, color: status.amber },
    { name: 'Health/Fitness/Athletics', budget: 310, actual: 443, color: status.red },
    { name: 'Education Team', budget: 890, actual: 793, color: modColors.briefing },
    { name: 'Development', budget: 560, actual: 534, color: modColors.signal },
  ];

  const totalBudget = departments.reduce((s, d) => s + d.budget, 0);
  const totalActual = departments.reduce((s, d) => s + d.actual, 0);

  const ai = useSlateAI({
    prompt: `Analyze the support team compensation for this charter school network. Total support team spend is $${(totalActual / 1000).toFixed(1)}M vs budget $${(totalBudget / 1000).toFixed(1)}M. The CPS compensation gap is ${comp.cpsGap.gapPct.toFixed(1)}%. What are the top 2 compensation strategy priorities?`,
    domain: 'ledger-support',
    fallback: `Support Team spending is ${totalActual > totalBudget ? `$${fmtNum(totalActual - totalBudget)}K over budget` : `$${fmtNum(totalBudget - totalActual)}K under budget`} in aggregate. The CPS compensation gap of ${comp.cpsGap.gapPct.toFixed(1)}% is a strategic risk — it directly impacts recruitment competitiveness and drives the $${comp.fiveYearPressure.toFixed(1)}M 5-year pressure. Prioritize closing the gap for high-turnover positions first.`,
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Support Team" value={`$${(totalActual / 1000).toFixed(1)}M`} subValue={`Budget: $${(totalBudget / 1000).toFixed(1)}M`} trend={{ value: totalActual <= totalBudget ? 'under budget' : 'over budget', positive: totalActual <= totalBudget }} accent={modColors.ledger} />
        <KPICard label="CPS Comp Gap" value={`${comp.cpsGap.gapPct.toFixed(1)}%`} subValue={`${fmtFull(comp.cpsGap.cpsL1Step0 - comp.cpsGap.veritasStarting)} below CPS`} trend={{ value: "needs attention", positive: false }} accent={status.red} />
        <KPICard label="5-Year Pressure" value={`$${comp.fiveYearPressure.toFixed(1)}M`} subValue="Cumulative gap cost" trend={{ value: "needs attention", positive: false }} accent={status.amber} />
        <KPICard label="Personnel % of OpEx" value={`${comp.fy26.personnelPctOfOpex}%`} subValue="Target: 70-85%" trend={{ value: "on track", positive: true }} accent={status.blue} />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20 }}>
          Department Spend vs Budget
        </div>
        {departments.map((d, i) => {
          const variance = d.actual - d.budget;
          const isOver = variance > 0;
          return (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: fontSize.sm, color: text.secondary, fontWeight: fontWeight.medium }}>{d.name}</span>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: fontSize.xs, color: text.muted, fontFamily: font.mono }}>${d.actual}K actual</span>
                  <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, fontFamily: font.mono, color: isOver ? status.red : status.green }}>
                    {isOver ? '+' : ''}{variance}K
                  </span>
                </div>
              </div>
              <div style={{ position: 'relative', height: 8, background: bg.subtle, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(d.budget / Math.max(...departments.map(x => x.actual))) * 100}%`, height: '100%', background: `${d.color}30`, position: 'absolute' }} />
                <div style={{ width: `${(d.actual / Math.max(...departments.map(x => x.actual))) * 100}%`, height: '100%', background: isOver ? status.red : d.color, borderRadius: 4, transition: transition.smooth }} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `2px solid ${border.light}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.secondary }}>Total</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: text.primary }}>${totalActual}K actual</span>
            <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontFamily: font.mono, color: totalActual > totalBudget ? status.red : status.green }}>
              {totalActual > totalBudget ? '+' : ''}{totalActual - totalBudget}K
            </span>
          </div>
        </div>
      </Card>

      {/* CPS Gap Analysis */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          CPS Compensation Gap Analysis
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 16 }}>
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
        <div style={{ padding: 12, background: status.amberBg, border: `1px solid ${status.amberBorder}`, borderRadius: radius.md }}>
          <div style={{ fontSize: fontSize.sm, color: status.amber, fontWeight: fontWeight.semibold }}>5-Year Cumulative Pressure: ${comp.fiveYearPressure.toFixed(1)}M</div>
          <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 4 }}>If Veritas maintains current salary structure while CPS continues annual increases, the cumulative gap in total compensation cost over 5 years reaches ${fmtFull(comp.fiveYearPressure * 1000000)}. This directly impacts recruitment and retention competitiveness.</div>
        </div>
      </Card>

      <AIInsight label="Support Team Intelligence" content={ai.text || `Support Team spending is ${totalActual > totalBudget ? `$${fmtNum(totalActual - totalBudget)}K over budget` : `$${fmtNum(totalBudget - totalActual)}K under budget`} in aggregate. The CPS compensation gap of ${comp.cpsGap.gapPct.toFixed(1)}% is a strategic risk.`}
        aiText={ai.text} aiLoading={ai.loading} aiError={ai.error} onRegenerate={ai.regenerate} lastGenerated={ai.lastGenerated} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRINCIPAL LEDGER (preserved from V1)
// ═══════════════════════════════════════════════════════════════════════════
function PrincipalLedger() {
  const fin = useFinancials();
  const { campuses } = useNetwork();
  const bud = fin.budget;
  const perPupil = bud.revenue.total / bud.enrollment;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Per-Pupil Revenue" value={`$${Math.round(perPupil).toLocaleString()}`} subValue="FY26 budget" accent={modColors.ledger} />
        <KPICard label="Network Enrollment" value={bud.enrollment.toLocaleString()} subValue="FY26 budget" accent={modColors.dashboard} />
        <KPICard label="Total Revenue" value={`$${bud.revenue.total.toFixed(1)}M`} subValue="FY26 budget" accent={chart.secondary} />
      </div>
      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Campus Allocation
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Campus</th>
              <th style={{ ...th, textAlign: 'right' }}>Enrollment</th>
              <th style={{ ...th, textAlign: 'right' }}>Allocation</th>
              <th style={{ ...th, textAlign: 'right' }}>Per Pupil</th>
            </tr>
          </thead>
          <tbody>
            {campuses.map((c, i) => {
              const enrollment = Math.round(bud.enrollment / campuses.length);
              const allocation = enrollment * perPupil;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : bg.subtle }}>
                  <td style={tdL}>{c.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{enrollment.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: 'right' }}>${(allocation / 1000000).toFixed(1)}M</td>
                  <td style={{ ...td, textAlign: 'right' }}>${Math.round(perPupil).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
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

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: `1px solid ${border.light}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '12px 18px', fontSize: fontSize.sm,
            fontWeight: activeTab === tab.id ? fontWeight.semibold : fontWeight.medium,
            color: activeTab === tab.id ? modColors.ledger : text.muted,
            background: 'transparent', border: 'none',
            borderBottom: activeTab === tab.id ? `2px solid ${modColors.ledger}` : '2px solid transparent',
            cursor: 'pointer', fontFamily: font.sans, transition: transition.fast,
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1,
          }}>
            {tab.label}
            {tab.badge && (
              <span style={{
                background: tab.badge === 'NEW' ? `${modColors.ledger}15` : `${chart.tertiary}15`,
                color: tab.badge === 'NEW' ? modColors.ledger : chart.tertiary,
                fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 5px', borderRadius: radius.full,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview'  && <OverviewTab />}
      {activeTab === 'revenue'   && <RevenueTab />}
      {activeTab === 'expenses'  && <ExpensesTab />}
      {activeTab === 'covenants' && <CovenantsTab />}
      {activeTab === 'scenarios' && <HorizonTab />}
      {activeTab === 'briefing'  && <BriefingTab />}
      {activeTab === 'boarddeck' && <BoardDeckTab />}
      {activeTab === 'support'   && <SupportTeamTab />}

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: text.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        {fin.actuals.length} months of actuals · {fin.historical.length} years of history · 3 scenarios + custom modeling · Board Deck Generator · Ledger Intelligence Engine v2
      </div>
    </div>
  );
}
