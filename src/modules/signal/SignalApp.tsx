/**
 * Slate v3 — Signal
 * ═══════════════════════════════════════════════════
 * Network Health Intelligence.
 * The strategic risk register and organizational health monitor.
 * Tier-based risk classification, heat maps, trend tracking,
 * and AI-driven risk intelligence.
 *
 * CEO sees the full risk landscape. Principal sees campus-relevant risks.
 */

import React, { useState, useMemo } from 'react';
import { useRisks, useRole, useNetwork, useEnrollment, useFinancials } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge } from '../../components/Card';
import { fmt, fmtNum, fmtPct } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { Risk, RiskTier } from '../../core/types';

// ─── Risk Score Badge ────────────────────────────────────────────────────

function RiskScoreBadge({ likelihood, impact }: { likelihood: number; impact: number }) {
  const score = likelihood * impact;
  const color = score >= 20 ? statusColor.red : score >= 12 ? statusColor.amber : score >= 6 ? statusColor.blue : statusColor.green;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 40, height: 40, borderRadius: radius.md,
      background: `${color}15`, border: `2px solid ${color}`,
      fontFamily: font.mono, fontWeight: fontWeight.bold, fontSize: fontSize.base, color,
    }}>
      {score}
    </div>
  );
}

// ─── Risk Row ────────────────────────────────────────────────────────────

function RiskRow({ risk, expanded, onToggle }: { risk: Risk; expanded: boolean; onToggle: () => void }) {
  const score = risk.likelihood * risk.impact;
  const trendColor = risk.trend.includes('Increasing') ? statusColor.red
    : risk.trend.includes('Decreasing') ? statusColor.green : textColor.muted;
  const tierColor = risk.tier.includes('Tier 1') ? statusColor.red
    : risk.tier.includes('Tier 2') ? statusColor.amber : statusColor.blue;

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      marginBottom: 8, overflow: 'hidden', transition: transition.base,
      borderLeft: `4px solid ${tierColor}`,
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 100px 80px',
          alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer',
        }}
      >
        <RiskScoreBadge likelihood={risk.likelihood} impact={risk.impact} />
        <div>
          <div style={{ fontWeight: fontWeight.semibold, color: textColor.primary, fontSize: fontSize.sm }}>{risk.name}</div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>{risk.category} · {risk.lens}</div>
        </div>
        <StatusBadge
          label={risk.tier.replace(' — ', ': ').replace('Tier ', 'T')}
          variant={risk.tier.includes('Tier 1') ? 'red' : risk.tier.includes('Tier 2') ? 'amber' : 'blue'}
          size="sm"
        />
        <div style={{ fontSize: fontSize.sm, color: trendColor, fontWeight: fontWeight.semibold }}>{risk.trend}</div>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{risk.owner}</div>
        <div style={{ fontSize: fontSize.sm, color: textColor.muted, textAlign: 'right' }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div style={{
          padding: '0 16px 16px 78px',
          borderTop: `1px solid ${border.light}`,
          paddingTop: 16,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6 }}>{risk.description}</div>
            </div>
            <div>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Mitigation</div>
              <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6 }}>{risk.mitigation}</div>
              <div style={{ marginTop: 8 }}>
                <StatusBadge label={risk.mitigationStatus} variant={risk.mitigationStatus === 'Active' ? 'green' : 'amber'} size="sm" />
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12,
            marginTop: 16, padding: 12, background: bg.subtle, borderRadius: radius.md,
          }}>
            {[
              { label: 'Likelihood', value: `${risk.likelihood}/5` },
              { label: 'Impact', value: `${risk.impact}/5` },
              { label: 'Velocity', value: risk.velocity },
              { label: 'Target Score', value: risk.targetScore.toString() },
              { label: 'KRI', value: risk.kri },
              { label: 'Next Review', value: risk.nextReview },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{m.label}</div>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.primary, marginTop: 2 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {risk.notes && (
            <div style={{ marginTop: 12, padding: 10, background: `${brand.gold}08`, borderRadius: radius.sm, border: `1px solid ${brand.gold}20` }}>
              <div style={{ fontSize: fontSize.xs, color: brand.brass, fontWeight: fontWeight.bold, marginBottom: 4 }}>NOTES</div>
              <div style={{ fontSize: fontSize.sm, color: textColor.secondary }}>{risk.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Heat Map ────────────────────────────────────────────────────────────

function RiskHeatMap({ risks }: { risks: Risk[] }) {
  const grid: Risk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  risks.forEach(r => {
    grid[5 - r.impact][r.likelihood - 1].push(r);
  });

  const cellColor = (li: number, im: number) => {
    const score = (li + 1) * (5 - im);
    if (score >= 20) return statusColor.red;
    if (score >= 12) return statusColor.amber;
    if (score >= 6) return '#FBBF24';
    return statusColor.green;
  };

  return (
    <Card title="Risk Heat Map" subtitle="Likelihood vs. Impact">
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(5, 1fr)', gap: 3 }}>
          <div />
          {[1, 2, 3, 4, 5].map(l => (
            <div key={l} style={{ textAlign: 'center', fontSize: fontSize.xs, color: textColor.muted, padding: 4 }}>
              L{l}
            </div>
          ))}
          {grid.map((row, im) => (
            <React.Fragment key={im}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                fontSize: fontSize.xs, color: textColor.muted, paddingRight: 8,
              }}>
                I{5 - im}
              </div>
              {row.map((cell, li) => (
                <div key={li} style={{
                  background: `${cellColor(li, im)}${cell.length > 0 ? '30' : '08'}`,
                  border: `1px solid ${cellColor(li, im)}${cell.length > 0 ? '50' : '15'}`,
                  borderRadius: radius.sm,
                  minHeight: 48,
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: 4,
                }}>
                  {cell.map(r => (
                    <div key={r.id} title={r.name} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: cellColor(li, im),
                    }} />
                  ))}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
          {[
            { label: 'Critical (20-25)', color: statusColor.red },
            { label: 'High (12-19)', color: statusColor.amber },
            { label: 'Medium (6-11)', color: '#FBBF24' },
            { label: 'Low (1-5)', color: statusColor.green },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Tier Summary ────────────────────────────────────────────────────────

function TierSummary({ risks }: { risks: Risk[] }) {
  const tiers: { tier: RiskTier; color: string; label: string }[] = [
    { tier: 'Tier 1 — Board Focus', color: statusColor.red, label: 'Tier 1: Board Focus' },
    { tier: 'Tier 2 — Executive Team', color: statusColor.amber, label: 'Tier 2: Executive Team' },
    { tier: 'Tier 3 — Working Group', color: statusColor.blue, label: 'Tier 3: Working Group' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
      {tiers.map(t => {
        const tierRisks = risks.filter(r => r.tier === t.tier);
        const increasing = tierRisks.filter(r => r.trend.includes('Increasing'));
        return (
          <div key={t.tier} style={{
            background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
            borderTop: `3px solid ${t.color}`, padding: 20, boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>{t.label}</div>
            <div style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: t.color, margin: '8px 0' }}>
              {tierRisks.length}
            </div>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>
              {increasing.length > 0
                ? <span style={{ color: statusColor.red }}>{increasing.length} trending up</span>
                : 'All stable or improving'
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AI Risk Intelligence ────────────────────────────────────────────────

function RiskIntelligence({ risks }: { risks: Risk[] }) {
  const tier1 = risks.filter(r => r.tier.includes('Tier 1'));
  const increasing = risks.filter(r => r.trend.includes('Increasing'));
  const highScore = risks.filter(r => r.likelihood * r.impact >= 20);

  const insights: string[] = [];

  if (tier1.length === 0) {
    insights.push('No Tier 1 risks are active. The board-level risk posture is clean.');
  } else {
    insights.push(`${tier1.length} Tier 1 risk${tier1.length > 1 ? 's' : ''} require board attention: ${tier1.map(r => r.name).join(', ')}.`);
  }

  if (increasing.length > 0) {
    insights.push(`${increasing.length} risk${increasing.length > 1 ? 's are' : ' is'} trending upward: ${increasing.map(r => r.name).join(', ')}. These should be prioritized in the next risk review.`);
  }

  if (highScore.length > 0) {
    insights.push(`${highScore.length} risk${highScore.length > 1 ? 's' : ''} in the critical zone (score 20+). Mitigation plans should be reviewed immediately.`);
  }

  const avgScore = risks.reduce((s, r) => s + r.likelihood * r.impact, 0) / risks.length;
  insights.push(`Average risk score across the register: ${avgScore.toFixed(1)}. ${avgScore > 12 ? 'This is elevated — consider accelerating mitigation timelines.' : 'This is within acceptable range.'}`);

  return (
    <AIInsight title="Risk Intelligence Analysis">
      {insights.map((ins, i) => (
        <p key={i} style={{ margin: i === insights.length - 1 ? 0 : '0 0 8px' }}>{ins}</p>
      ))}
    </AIInsight>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SIGNAL APP
// ═══════════════════════════════════════════════════════════════════════════

export default function SignalApp() {
  const { role } = useRole();
  const riskData = useRisks();
  const risks = riskData.register;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterTrend, setFilterTrend] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'tier' | 'trend'>('score');

  const filtered = useMemo(() => {
    let r = [...risks];
    if (filterTier !== 'all') r = r.filter(x => x.tier.includes(filterTier));
    if (filterTrend !== 'all') r = r.filter(x => x.trend.includes(filterTrend));
    r.sort((a, b) => {
      if (sortBy === 'score') return (b.likelihood * b.impact) - (a.likelihood * a.impact);
      if (sortBy === 'tier') return a.tier.localeCompare(b.tier);
      return a.trend.localeCompare(b.trend);
    });
    return r;
  }, [risks, filterTier, filterTrend, sortBy]);

  const tier1Count = risks.filter(r => r.tier.includes('Tier 1')).length;
  const increasingCount = risks.filter(r => r.trend.includes('Increasing')).length;
  const avgScore = risks.length > 0 ? risks.reduce((s, r) => s + r.likelihood * r.impact, 0) / risks.length : 0;

  return (
    <div>
      <ModuleHeader
        title="Signal"
        subtitle="Network Health Intelligence"
        accent={modColors.signal}
        freshness={{ lastUpdated: riskData.lastUpdated, source: riskData.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Total Risks" value={risks.length.toString()} />
        <KPICard label="Tier 1 (Board)" value={tier1Count.toString()} delta={tier1Count > 0 ? 'Action Required' : 'Clear'} deltaColor={tier1Count > 0 ? statusColor.red : statusColor.green} />
        <KPICard label="Trending Up" value={increasingCount.toString()} delta={increasingCount > 0 ? 'Monitor' : 'Stable'} deltaColor={increasingCount > 0 ? statusColor.amber : statusColor.green} />
        <KPICard label="Avg Score" value={avgScore.toFixed(1)} delta={avgScore > 12 ? 'Elevated' : 'Acceptable'} deltaColor={avgScore > 12 ? statusColor.amber : statusColor.green} />
      </div>

      <TierSummary risks={risks} />
      <RiskIntelligence risks={risks} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <RiskHeatMap risks={risks} />

        {/* Category Breakdown */}
        <Card title="Risk by Category" subtitle="Distribution across domains">
          <div style={{ padding: '8px 0' }}>
            {Object.entries(
              risks.reduce((acc, r) => {
                acc[r.category] = (acc[r.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                borderBottom: `1px solid ${border.light}`,
              }}>
                <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.primary }}>{cat}</div>
                <div style={{
                  width: 120, height: 6, background: bg.subtle, borderRadius: 3, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(count / risks.length) * 100}%`, height: '100%',
                    background: modColors.signal, borderRadius: 3,
                  }} />
                </div>
                <div style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: textColor.muted, width: 24, textAlign: 'right' }}>{count}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center',
        padding: '12px 16px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      }}>
        <span style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Filter:</span>
        {['all', 'Tier 1', 'Tier 2', 'Tier 3'].map(t => (
          <button key={t} onClick={() => setFilterTier(t)} style={{
            padding: '4px 12px', borderRadius: radius.full, border: `1px solid ${filterTier === t ? modColors.signal : border.light}`,
            background: filterTier === t ? `${modColors.signal}15` : 'transparent',
            color: filterTier === t ? modColors.signal : textColor.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', transition: transition.base,
          }}>
            {t === 'all' ? 'All Tiers' : t}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: border.light, margin: '0 4px' }} />
        {['all', 'Increasing', 'Stable', 'Decreasing'].map(t => (
          <button key={t} onClick={() => setFilterTrend(t)} style={{
            padding: '4px 12px', borderRadius: radius.full, border: `1px solid ${filterTrend === t ? modColors.signal : border.light}`,
            background: filterTrend === t ? `${modColors.signal}15` : 'transparent',
            color: filterTrend === t ? modColors.signal : textColor.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', transition: transition.base,
          }}>
            {t === 'all' ? 'All Trends' : t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Sort:</span>
        {(['score', 'tier', 'trend'] as const).map(s => (
          <button key={s} onClick={() => setSortBy(s)} style={{
            padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${sortBy === s ? modColors.signal : border.light}`,
            background: sortBy === s ? `${modColors.signal}15` : 'transparent',
            color: sortBy === s ? modColors.signal : textColor.muted,
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Risk Register Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 100px 80px',
        gap: 12, padding: '8px 16px', marginBottom: 4,
      }}>
        {['Score', 'Risk', 'Tier', 'Trend', 'Owner', ''].map(h => (
          <div key={h} style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
        ))}
      </div>

      {/* Risk Register */}
      {filtered.map(r => (
        <RiskRow
          key={r.id}
          risk={r}
          expanded={expandedId === r.id}
          onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
        />
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: textColor.muted }}>
          No risks match the current filters.
        </div>
      )}

      {/* Last Review Footer */}
      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: textColor.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        Last full risk review: {riskData.lastReviewDate} · {risks.length} risks tracked · Signal Intelligence
      </div>
    </div>
  );
}
