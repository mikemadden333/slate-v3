/**
 * Slate v3 — Fund
 * ═══════════════════════════════════════════════════
 * Fundraising Intelligence.
 * Pipeline management, stage analysis, donor tracking,
 * conversion analytics, and AI-driven fundraising intelligence.
 *
 * CEO sees the full fundraising landscape and pipeline health.
 */

import React, { useState, useMemo } from 'react';
import { useFundraising, useRole, useFinancials } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge } from '../../components/Card';
import { fmt, fmtNum, fmtPct, fmtCompact } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { FundOpportunity, FundStage } from '../../core/types';

// ─── Stage Config ────────────────────────────────────────────────────────

const STAGES: { key: FundStage; label: string; color: string }[] = [
  { key: 'identification', label: 'Identification', color: '#94A3B8' },
  { key: 'qualification', label: 'Qualification', color: '#60A5FA' },
  { key: 'cultivation', label: 'Cultivation', color: '#A78BFA' },
  { key: 'solicitation', label: 'Solicitation', color: '#F59E0B' },
  { key: 'negotiation', label: 'Negotiation', color: '#F97316' },
  { key: 'closed', label: 'Closed', color: statusColor.green },
];

// ─── Pipeline Funnel ─────────────────────────────────────────────────────

function PipelineFunnel({ pipeline }: { pipeline: FundOpportunity[] }) {
  const stageCounts = STAGES.map(s => ({
    ...s,
    count: pipeline.filter(p => p.stage === s.key).length,
    total: pipeline.filter(p => p.stage === s.key).reduce((sum, p) => sum + p.amount, 0),
    weighted: pipeline.filter(p => p.stage === s.key).reduce((sum, p) => sum + p.weighted, 0),
  }));

  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <Card title="Pipeline Funnel" subtitle="Opportunities by stage">
      <div style={{ padding: '12px 0' }}>
        {stageCounts.map((s, i) => {
          const width = Math.max((s.count / maxCount) * 100, 8);
          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < stageCounts.length - 1 ? `1px solid ${border.light}` : 'none',
            }}>
              <div style={{ width: 100, fontSize: fontSize.xs, color: textColor.muted, textAlign: 'right' }}>{s.label}</div>
              <div style={{ flex: 1, position: 'relative', height: 28 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${width}%`, background: `${s.color}20`, borderRadius: radius.sm,
                  border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center',
                  paddingLeft: 8, transition: 'width 0.5s ease',
                }}>
                  <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: s.color }}>
                    {s.count} · {fmtCompact(s.total)}
                  </span>
                </div>
              </div>
              <div style={{ width: 80, textAlign: 'right', fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.muted }}>
                W: {fmtCompact(s.weighted)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Goal Progress ───────────────────────────────────────────────────────

function GoalProgress({ closed, goal, weighted }: { closed: number; goal: number; weighted: number }) {
  const closedPct = (closed / goal) * 100;
  const weightedPct = (weighted / goal) * 100;
  const totalPct = Math.min(closedPct + weightedPct, 100);

  return (
    <Card title="Annual Goal Progress" subtitle={`${fmt(goal)} target`}>
      <div style={{ padding: '20px 0' }}>
        {/* Progress bar */}
        <div style={{
          position: 'relative', height: 32, background: bg.subtle, borderRadius: radius.md, overflow: 'hidden',
          marginBottom: 16,
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${Math.min(closedPct, 100)}%`, background: statusColor.green,
            borderRadius: `${radius.md} 0 0 ${radius.md}`, transition: 'width 1s ease',
          }} />
          <div style={{
            position: 'absolute', left: `${closedPct}%`, top: 0, height: '100%',
            width: `${Math.min(weightedPct, 100 - closedPct)}%`,
            background: `${statusColor.green}40`,
            transition: 'width 1s ease',
          }} />
          <div style={{
            position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontFamily: font.mono,
            color: closedPct > 50 ? '#fff' : textColor.primary,
          }}>
            {fmtPct(closedPct)} Closed
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Closed</div>
            <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: statusColor.green }}>{fmt(closed)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Weighted Pipeline</div>
            <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: textColor.primary }}>{fmt(weighted)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Gap to Goal</div>
            <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: goal - closed - weighted > 0 ? statusColor.red : statusColor.green }}>
              {goal - closed - weighted > 0 ? fmt(goal - closed - weighted) : 'Covered'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Opportunity Row ─────────────────────────────────────────────────────

function OpportunityRow({ opp, expanded, onToggle }: { opp: FundOpportunity; expanded: boolean; onToggle: () => void }) {
  const stage = STAGES.find(s => s.key === opp.stage) ?? STAGES[0];

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      marginBottom: 6, overflow: 'hidden',
    }}>
      <div onClick={onToggle} style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 100px 40px',
        alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
      }}>
        <div>
          <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: textColor.primary }}>{opp.funder}</div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{opp.type} · {opp.contact}</div>
        </div>
        <div style={{ fontFamily: font.mono, fontWeight: fontWeight.bold, fontSize: fontSize.sm, color: textColor.primary }}>{fmt(opp.amount)}</div>
        <StatusBadge label={stage.label} variant={opp.stage === 'closed' ? 'green' : opp.stage === 'solicitation' || opp.stage === 'negotiation' ? 'amber' : 'blue'} size="sm" />
        <div style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: textColor.muted }}>{fmtPct(opp.probability * 100)}</div>
        <div style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: statusColor.green }}>{fmt(opp.weighted)}</div>
        <div style={{ fontSize: fontSize.sm, color: textColor.muted, textAlign: 'right' }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${border.light}`, paddingTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Next Action</div>
              <div style={{ fontSize: fontSize.sm, color: textColor.secondary }}>{opp.nextAction}</div>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 4 }}>Due: {opp.dueDate}</div>
            </div>
            <div>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: fontSize.sm, color: textColor.secondary }}>{opp.notes || 'No notes.'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Fundraising Intelligence ─────────────────────────────────────────

function FundIntelligence() {
  const fund = useFundraising();
  const fin = useFinancials();
  const pipeline = fund.pipeline;
  const totalWeighted = pipeline.reduce((s, p) => s + p.weighted, 0);
  const solicitation = pipeline.filter(p => p.stage === 'solicitation' || p.stage === 'negotiation');
  const pctToGoal = (fund.closedYTD / fund.goal) * 100;

  const insights: string[] = [];

  insights.push(`Year-to-date closed revenue: ${fmt(fund.closedYTD)} of ${fmt(fund.goal)} goal (${fmtPct(pctToGoal)}). ${pctToGoal >= 60 ? 'On track.' : pctToGoal >= 40 ? 'Slightly behind pace — acceleration needed.' : 'Significantly behind pace — urgent attention required.'}`);

  if (solicitation.length > 0) {
    const solTotal = solicitation.reduce((s, p) => s + p.amount, 0);
    insights.push(`${solicitation.length} opportunity${solicitation.length > 1 ? 'ies' : 'y'} in late-stage pipeline (solicitation/negotiation) totaling ${fmt(solTotal)}. These represent the highest-probability near-term revenue.`);
  }

  const gap = fund.goal - fund.closedYTD - totalWeighted;
  if (gap > 0) {
    insights.push(`Gap analysis: Even with full pipeline conversion, there is a ${fmt(gap)} gap to goal. New cultivation is needed to close this gap.`);
  } else {
    insights.push(`Pipeline coverage: Closed + weighted pipeline (${fmt(fund.closedYTD + totalWeighted)}) exceeds the annual goal. Focus on conversion.`);
  }

  // Cross-module: philanthropy as % of revenue
  const philPct = (fin.budget.revenue.philanthropy / fin.budget.revenue.total) * 100;
  insights.push(`Philanthropy represents ${fmtPct(philPct)} of budgeted revenue. ${philPct > 15 ? 'This is a significant dependency — diversification should be a strategic priority.' : 'Healthy diversification of revenue sources.'}`);

  return (
    <AIInsight title="Fundraising Intelligence Analysis">
      {insights.map((ins, i) => (
        <p key={i} style={{ margin: i === insights.length - 1 ? 0 : '0 0 8px' }}>{ins}</p>
      ))}
    </AIInsight>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUND APP
// ═══════════════════════════════════════════════════════════════════════════

export default function FundApp() {
  const fund = useFundraising();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'weighted' | 'stage'>('amount');

  const pipeline = fund.pipeline;
  const totalWeighted = pipeline.reduce((s, p) => s + p.weighted, 0);
  const totalPipeline = pipeline.reduce((s, p) => s + p.amount, 0);
  const pctToGoal = (fund.closedYTD / fund.goal) * 100;

  const filtered = useMemo(() => {
    let p = [...pipeline];
    if (filterStage !== 'all') p = p.filter(x => x.stage === filterStage);
    p.sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'weighted') return b.weighted - a.weighted;
      const order = STAGES.map(s => s.key);
      return order.indexOf(b.stage) - order.indexOf(a.stage);
    });
    return p;
  }, [pipeline, filterStage, sortBy]);

  return (
    <div>
      <ModuleHeader
        title="Fund"
        subtitle="Fundraising Intelligence"
        accent={modColors.fund}
        freshness={{ lastUpdated: fund.lastUpdated, source: fund.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Closed YTD" value={fmtCompact(fund.closedYTD)} delta={`${fmtPct(pctToGoal)} of goal`} deltaColor={pctToGoal >= 50 ? statusColor.green : statusColor.amber} />
        <KPICard label="Pipeline Total" value={fmtCompact(totalPipeline)} delta={`${pipeline.length} opportunities`} />
        <KPICard label="Weighted Value" value={fmtCompact(totalWeighted)} />
        <KPICard label="Annual Goal" value={fmtCompact(fund.goal)} delta={fund.closedYTD + totalWeighted >= fund.goal ? 'Covered' : `${fmtCompact(fund.goal - fund.closedYTD - totalWeighted)} gap`} deltaColor={fund.closedYTD + totalWeighted >= fund.goal ? statusColor.green : statusColor.red} />
      </div>

      <FundIntelligence />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <GoalProgress closed={fund.closedYTD} goal={fund.goal} weighted={totalWeighted} />
        <PipelineFunnel pipeline={pipeline} />
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap',
        padding: '10px 16px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      }}>
        <span style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginRight: 4 }}>Stage:</span>
        <button onClick={() => setFilterStage('all')} style={{
          padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${filterStage === 'all' ? modColors.fund : border.light}`,
          background: filterStage === 'all' ? `${modColors.fund}15` : 'transparent',
          color: filterStage === 'all' ? modColors.fund : textColor.muted,
          fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
        }}>
          All ({pipeline.length})
        </button>
        {STAGES.map(s => {
          const count = pipeline.filter(p => p.stage === s.key).length;
          if (count === 0) return null;
          return (
            <button key={s.key} onClick={() => setFilterStage(s.key)} style={{
              padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${filterStage === s.key ? s.color : border.light}`,
              background: filterStage === s.key ? `${s.color}15` : 'transparent',
              color: filterStage === s.key ? s.color : textColor.muted,
              fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
            }}>
              {s.label} ({count})
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Sort:</span>
        {(['amount', 'weighted', 'stage'] as const).map(s => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${sortBy === s ? modColors.fund : border.light}`,
            background: sortBy === s ? `${modColors.fund}15` : 'transparent',
            color: sortBy === s ? modColors.fund : textColor.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Pipeline Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 100px 40px',
        gap: 12, padding: '8px 16px', marginBottom: 4,
      }}>
        {['Funder', 'Amount', 'Stage', 'Prob.', 'Weighted', ''].map(h => (
          <div key={h} style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
        ))}
      </div>

      {/* Pipeline List */}
      {filtered.map(opp => (
        <OpportunityRow
          key={opp.id}
          opp={opp}
          expanded={expandedId === opp.id}
          onToggle={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
        />
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: textColor.muted }}>
          No opportunities match the current filter.
        </div>
      )}

      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: textColor.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        {pipeline.length} opportunities tracked · {fmt(totalPipeline)} total pipeline · Fund Intelligence
      </div>
    </div>
  );
}
