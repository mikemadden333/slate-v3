/**
 * Slate v3 — Civic
 * ═══════════════════════════════════════════════════
 * Public Affairs Intelligence.
 * Legislative tracking, hearing monitoring, media intelligence,
 * and stakeholder relationship management.
 *
 * CEO sees the full public affairs landscape.
 * Principal sees campus-relevant civic information.
 */

import React, { useState } from 'react';
import { useCivic, useRole, useNetwork } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge } from '../../components/Card';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { PendingBill } from '../../core/types';

// ─── Bill Impact Card ────────────────────────────────────────────────────

function BillCard({ bill }: { bill: PendingBill }) {
  const riskConfig = {
    'POSITIVE': { color: statusColor.green, bg: `${statusColor.green}08`, icon: '↑' },
    'WATCH': { color: statusColor.amber, bg: `${statusColor.amber}08`, icon: '⟳' },
    'THREAT': { color: statusColor.red, bg: `${statusColor.red}08`, icon: '!' },
  };
  const r = riskConfig[bill.risk];

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      borderLeft: `4px solid ${r.color}`, padding: 20, boxShadow: shadow.sm,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.base, color: textColor.primary, flex: 1, paddingRight: 12 }}>
          {bill.name}
        </div>
        <StatusBadge
          label={bill.risk}
          variant={bill.risk === 'POSITIVE' ? 'green' : bill.risk === 'WATCH' ? 'amber' : 'red'}
          size="sm"
        />
      </div>
      <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6, marginBottom: 10 }}>
        {bill.summary}
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', background: bg.subtle, borderRadius: radius.full,
        fontSize: fontSize.xs, color: textColor.muted,
      }}>
        Status: {bill.status}
      </div>
    </div>
  );
}

// ─── Hearing Card ────────────────────────────────────────────────────────

function HearingCard({ count, nextDate, topic }: { count: number; nextDate: string; topic: string }) {
  return (
    <Card title="Upcoming Hearings" subtitle="Board and public hearings">
      <div style={{ padding: '12px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: 16,
          background: `${modColors.civic}08`, borderRadius: radius.md, border: `1px solid ${modColors.civic}20`,
          marginBottom: 12,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: radius.md,
            background: `${modColors.civic}15`, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: modColors.civic }}>{count}</div>
          </div>
          <div>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.primary }}>
              {count} hearing{count !== 1 ? 's' : ''} scheduled
            </div>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>
              Next: {nextDate}
            </div>
          </div>
        </div>

        <div style={{
          padding: 12, background: bg.subtle, borderRadius: radius.md,
        }}>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Next Hearing Topic</div>
          <div style={{ fontSize: fontSize.sm, color: textColor.primary, fontWeight: fontWeight.semibold }}>{topic}</div>
        </div>
      </div>
    </Card>
  );
}

// ─── Media Monitor ───────────────────────────────────────────────────────

function MediaMonitor({ summary }: { summary: string }) {
  return (
    <Card title="Media Intelligence" subtitle="Recent coverage and sentiment">
      <div style={{ padding: '12px 0' }}>
        <div style={{
          padding: 16, background: bg.subtle, borderRadius: radius.md,
          borderLeft: `3px solid ${modColors.civic}`,
        }}>
          <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.7 }}>
            {summary}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Stakeholder Health ──────────────────────────────────────────────────

function StakeholderHealth({ stale }: { stale: number }) {
  const health = stale === 0 ? 'Excellent' : stale <= 2 ? 'Good' : stale <= 5 ? 'Needs Attention' : 'At Risk';
  const color = stale === 0 ? statusColor.green : stale <= 2 ? statusColor.green : stale <= 5 ? statusColor.amber : statusColor.red;

  return (
    <Card title="Stakeholder Relationships" subtitle="Engagement health">
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
          background: `${color}10`, border: `3px solid ${color}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color }}>{stale}</div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>stale</div>
        </div>
        <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color }}>{health}</div>
        <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 4 }}>
          {stale === 0
            ? 'All stakeholder relationships are current.'
            : `${stale} relationship${stale > 1 ? 's' : ''} need${stale === 1 ? 's' : ''} re-engagement. Consider scheduling outreach.`
          }
        </div>
      </div>
    </Card>
  );
}

// ─── AI Public Affairs Intelligence ──────────────────────────────────────

function CivicIntelligence() {
  const civic = useCivic();
  const threats = civic.pendingBills.filter(b => b.risk === 'THREAT');
  const positives = civic.pendingBills.filter(b => b.risk === 'POSITIVE');

  const insights: string[] = [];

  if (threats.length > 0) {
    insights.push(`${threats.length} legislative threat${threats.length > 1 ? 's' : ''} identified: ${threats.map(t => t.name).join(', ')}. These could negatively impact charter operations and require proactive advocacy.`);
  }

  if (positives.length > 0) {
    insights.push(`${positives.length} positive legislative development${positives.length > 1 ? 's' : ''}: ${positives.map(p => p.name).join(', ')}. Consider public support and testimony.`);
  }

  insights.push(`${civic.upcomingHearings} hearing${civic.upcomingHearings !== 1 ? 's' : ''} upcoming. Next hearing on ${civic.hearingDate}: "${civic.hearingTopic}". ${civic.upcomingHearings > 2 ? 'Heavy hearing schedule — ensure adequate preparation time.' : ''}`);

  if (civic.staleStakeholderRelationships > 0) {
    insights.push(`${civic.staleStakeholderRelationships} stakeholder relationship${civic.staleStakeholderRelationships > 1 ? 's have' : ' has'} gone stale. Regular engagement with elected officials, community leaders, and authorizer contacts is critical for charter renewal and expansion.`);
  }

  return (
    <AIInsight title="Public Affairs Intelligence Analysis">
      {insights.map((ins, i) => (
        <p key={i} style={{ margin: i === insights.length - 1 ? 0 : '0 0 8px' }}>{ins}</p>
      ))}
    </AIInsight>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CIVIC APP
// ═══════════════════════════════════════════════════════════════════════════

export default function CivicApp() {
  const civic = useCivic();
  const threats = civic.pendingBills.filter(b => b.risk === 'THREAT');
  const watches = civic.pendingBills.filter(b => b.risk === 'WATCH');
  const positives = civic.pendingBills.filter(b => b.risk === 'POSITIVE');

  return (
    <div>
      <ModuleHeader
        title="Civic"
        subtitle="Public Affairs Intelligence"
        accent={modColors.civic}
        freshness={{ lastUpdated: civic.lastUpdated, source: civic.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="Active Bills" value={civic.pendingBills.length.toString()} delta={`${threats.length} threats`} deltaColor={threats.length > 0 ? statusColor.red : statusColor.green} />
        <KPICard label="Upcoming Hearings" value={civic.upcomingHearings.toString()} delta={`Next: ${civic.hearingDate}`} />
        <KPICard label="Stale Relationships" value={civic.staleStakeholderRelationships.toString()} delta={civic.staleStakeholderRelationships === 0 ? 'All current' : 'Needs outreach'} deltaColor={civic.staleStakeholderRelationships === 0 ? statusColor.green : statusColor.amber} />
        <KPICard label="Media Posture" value="Active" delta="Monitoring" />
      </div>

      <CivicIntelligence />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <HearingCard count={civic.upcomingHearings} nextDate={civic.hearingDate} topic={civic.hearingTopic} />
        <StakeholderHealth stale={civic.staleStakeholderRelationships} />
      </div>

      <MediaMonitor summary={civic.mediaMonitoring} />

      {/* Legislative Tracker */}
      <div style={{ marginTop: 20 }}>
        <div style={{
          fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: textColor.primary,
          marginBottom: 16, fontFamily: font.serif,
        }}>
          Legislative Tracker
        </div>

        {/* Risk filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: `Threats (${threats.length})`, color: statusColor.red, count: threats.length },
            { label: `Watch (${watches.length})`, color: statusColor.amber, count: watches.length },
            { label: `Positive (${positives.length})`, color: statusColor.green, count: positives.length },
          ].map(f => (
            <div key={f.label} style={{
              padding: '6px 14px', borderRadius: radius.full,
              background: `${f.color}10`, border: `1px solid ${f.color}30`,
              fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: f.color,
            }}>
              {f.label}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {civic.pendingBills.map((bill, i) => <BillCard key={i} bill={bill} />)}
        </div>
      </div>

      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: textColor.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        {civic.pendingBills.length} bills tracked · {civic.upcomingHearings} hearings · Civic Intelligence
      </div>
    </div>
  );
}
