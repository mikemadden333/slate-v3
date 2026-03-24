/**
 * Slate v3 — Scholar
 * ═══════════════════════════════════════════════════
 * Enrollment Intelligence Engine.
 * Network Overview · Campus Detail · Pipeline · Attrition · Forecasting · AI Analysis
 * CEO sees the full enrollment picture. Principal sees their campus.
 */

import React, { useState, useMemo } from 'react';
import { useEnrollment, useNetwork, useFinancials, useRole } from '../../data/DataStore';
import { useSlateAI } from '../../core/useSlateAI';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge } from '../../components/Card';
import { fmt, fmtNum, fmtPct, fmtFull, fmtCompact } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors, chart,
} from '../../core/theme';

// ─── Tab System ──────────────────────────────────────────────────────────

type ScholarTab = 'overview' | 'campuses' | 'pipeline' | 'attrition' | 'forecast';

const TABS: { id: ScholarTab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',    icon: '◉' },
  { id: 'campuses',  label: 'Campuses',    icon: '▣' },
  { id: 'pipeline',  label: 'Pipeline',    icon: '▲' },
  { id: 'attrition', label: 'Attrition',   icon: '▼' },
  { id: 'forecast',  label: 'Forecast',    icon: '◈' },
];

// ─── Shared Styles ───────────────────────────────────────────────────────

const th: React.CSSProperties = {
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: textColor.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  padding: '10px 12px',
  borderBottom: `2px solid ${border.light}`,
  textAlign: 'left',
};

const td: React.CSSProperties = {
  fontSize: fontSize.sm,
  color: textColor.primary,
  padding: '10px 12px',
  borderBottom: `1px solid ${border.light}`,
  fontFamily: font.mono,
};

const tdLabel: React.CSSProperties = {
  ...td,
  fontFamily: font.sans,
  fontWeight: fontWeight.medium,
};

// ─── Utilization Bar ─────────────────────────────────────────────────────

function UtilBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: `${color}15`, borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: transition.smooth }} />
      </div>
      <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.muted, minWidth: 36, textAlign: 'right' }}>
        {fmtPct(pct)}
      </span>
    </div>
  );
}

// ─── Mini Sparkline ──────────────────────────────────────────────────────

function Spark({ data, color, w = 80, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB — CEO View
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const enr = useEnrollment();
  const net = useNetwork();
  const fin = useFinancials();
  const sorted = [...enr.byCampus].sort((a, b) => b.enrolled - a.enrolled);

  const overviewAI = useSlateAI({
    prompt: `Analyze enrollment health for this charter school network. Cover total enrollment vs target, capacity utilization, revenue at risk from unfilled seats, attrition rates, campus-level performance, and the pipeline (applications, acceptances, yield). What is the single most important enrollment action the CEO should take? Be specific.`,
    domain: 'scholar-overview',
    fallback: `Network enrollment at ${enr.networkTotal} students. Capacity utilization and attrition are the key metrics to watch. Grade 9 entry point yield rate is the most predictive indicator of long-term enrollment health.`,
  });

  const totalCapacity = enr.byCampus.reduce((s, c) => s + c.capacity, 0);
  const totalApplied = enr.byCampus.reduce((s, c) => s + c.applied, 0);
  const totalAccepted = enr.byCampus.reduce((s, c) => s + c.accepted, 0);
  const avgAttrition = enr.byCampus.reduce((s, c) => s + c.attrition, 0) / enr.byCampus.length;
  const avgYield = enr.byCampus.reduce((s, c) => s + c.yield, 0) / enr.byCampus.length;
  const utilization = (enr.networkTotal / totalCapacity) * 100;

  const enrollmentGap = enr.targetEnrollment - enr.networkTotal;
  const revenueAtRisk = enrollmentGap * net.revenuePerPupil;

  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Network Enrollment"
          value={fmtNum(enr.networkTotal)}
          subValue={`Target: ${fmtNum(enr.targetEnrollment)}`}
          trend={{
            value: enrollmentGap <= 0 ? `+${Math.abs(enrollmentGap)} above target` : `${enrollmentGap} below target`,
            positive: enrollmentGap <= 0,
          }}
          icon="◈"
          accent={modColors.scholar}
        />
        <KPICard
          label="Capacity Utilization"
          value={fmtPct(utilization)}
          subValue={`${fmtNum(totalCapacity)} total seats`}
          trend={{
            value: utilization >= 95 ? 'Near capacity' : utilization >= 85 ? 'Healthy' : 'Underutilized',
            positive: utilization >= 85,
          }}
          accent={utilization >= 95 ? status.amber : utilization >= 85 ? status.green : status.red}
        />
        <KPICard
          label="Avg Attrition"
          value={fmtPct(avgAttrition)}
          subValue={`~${Math.round(enr.networkTotal * avgAttrition / 100)} students`}
          trend={{
            value: avgAttrition <= 10 ? 'Healthy' : avgAttrition <= 15 ? 'Elevated' : 'Critical',
            positive: avgAttrition <= 10,
          }}
          accent={avgAttrition <= 10 ? status.green : avgAttrition <= 15 ? status.amber : status.red}
        />
        <KPICard
          label="Revenue at Risk"
          value={enrollmentGap > 0 ? fmt(revenueAtRisk) : '$0'}
          subValue={`${fmtFull(net.revenuePerPupil)}/pupil`}
          trend={{
            value: enrollmentGap > 0 ? `${enrollmentGap} seats unfilled` : 'Target met',
            positive: enrollmentGap <= 0,
          }}
          accent={enrollmentGap > 0 ? status.red : status.green}
        />
      </div>

      {/* Campus Enrollment Grid */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Campus Enrollment Summary
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Campus</th>
              <th style={{ ...th, textAlign: 'right' }}>Enrolled</th>
              <th style={{ ...th, textAlign: 'right' }}>Capacity</th>
              <th style={{ ...th, textAlign: 'right', width: 160 }}>Utilization</th>
              <th style={{ ...th, textAlign: 'right' }}>Attrition</th>
              <th style={{ ...th, textAlign: 'right' }}>Yield</th>
              <th style={{ ...th, textAlign: 'center', width: 100 }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const util = (c.enrolled / c.capacity) * 100;
              const utilColor = util >= 95 ? status.amber : util >= 85 ? status.green : status.red;
              const attrColor = c.attrition <= 10 ? status.green : c.attrition <= 15 ? status.amber : status.red;
              return (
                <tr key={c.campusId}>
                  <td style={tdLabel}>{c.name}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>{fmtNum(c.enrolled)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(c.capacity)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <UtilBar value={c.enrolled} max={c.capacity} color={utilColor} />
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: attrColor }}>{fmtPct(c.attrition)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtPct(c.yield)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <Spark data={c.history} color={modColors.scholar} />
                  </td>
                </tr>
              );
            })}
            {/* Network total row */}
            <tr style={{ background: bg.subtle }}>
              <td style={{ ...tdLabel, fontWeight: fontWeight.bold }}>NETWORK</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.bold }}>{fmtNum(enr.networkTotal)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.bold }}>{fmtNum(totalCapacity)}</td>
              <td style={{ ...td, textAlign: 'right' }}>
                <UtilBar value={enr.networkTotal} max={totalCapacity} color={modColors.scholar} />
              </td>
              <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.bold }}>{fmtPct(avgAttrition)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.bold }}>{fmtPct(avgYield)}</td>
              <td style={{ ...td, textAlign: 'center' }}>—</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Grade Distribution */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Grade-Level Distribution by Campus
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Campus</th>
              <th style={{ ...th, textAlign: 'right' }}>Grade 9</th>
              <th style={{ ...th, textAlign: 'right' }}>Grade 10</th>
              <th style={{ ...th, textAlign: 'right' }}>Grade 11</th>
              <th style={{ ...th, textAlign: 'right' }}>Grade 12</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>9→10 Retain</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const retain910 = c.grade9 > 0 ? ((c.grade10 / c.grade9) * 100) : 0;
              return (
                <tr key={c.campusId}>
                  <td style={tdLabel}>{c.short}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.grade9}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.grade10}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.grade11}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{c.grade12}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>{c.enrolled}</td>
                  <td style={{
                    ...td,
                    textAlign: 'right',
                    color: retain910 >= 90 ? status.green : retain910 >= 80 ? status.amber : status.red,
                  }}>
                    {fmtPct(retain910)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AIInsight
        label="Enrollment Intelligence"
        content={`Veritas is at ${fmtNum(enr.networkTotal)} students against a target of ${fmtNum(enr.targetEnrollment)} — ${enrollmentGap > 0 ? `${enrollmentGap} seats below target, representing ${fmtFull(revenueAtRisk)} in unrealized revenue` : 'meeting or exceeding target'}. Capacity utilization at ${fmtPct(utilization)} is ${utilization >= 90 ? 'strong' : 'concerning'}. The highest-performing campuses by enrollment are ${sorted[0].name} (${fmtNum(sorted[0].enrolled)}) and ${sorted[1].name} (${fmtNum(sorted[1].enrolled)}). Network-wide attrition at ${fmtPct(avgAttrition)} translates to approximately ${Math.round(enr.networkTotal * avgAttrition / 100)} students lost annually — each worth ${fmtFull(net.revenuePerPupil)} in per-pupil revenue. The campuses with the highest attrition rates require immediate retention intervention plans. Grade 9 is the critical entry point: yield rate and 9-to-10 retention are the two metrics that most directly predict long-term enrollment health.`}
        aiText={overviewAI.text} aiLoading={overviewAI.loading} aiError={overviewAI.error} onRegenerate={overviewAI.regenerate} lastGenerated={overviewAI.lastGenerated}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPUS DETAIL TAB
// ═══════════════════════════════════════════════════════════════════════════

function CampusesTab() {
  const enr = useEnrollment();
  const net = useNetwork();
  const [selectedId, setSelectedId] = useState<number>(enr.byCampus[0]?.campusId ?? 1);
  const campus = enr.byCampus.find(c => c.campusId === selectedId) ?? enr.byCampus[0];
  const netCampus = net.campuses.find(c => c.id === selectedId);

  if (!campus) return null;

  const util = (campus.enrolled / campus.capacity) * 100;
  const revenueImpact = campus.enrolled * net.revenuePerPupil;
  const attritionLoss = Math.round(campus.enrolled * campus.attrition / 100);
  const revenueLoss = attritionLoss * net.revenuePerPupil;

  return (
    <div>
      {/* Campus Selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {enr.byCampus.map(c => (
          <button
            key={c.campusId}
            onClick={() => setSelectedId(c.campusId)}
            style={{
              padding: '6px 14px',
              borderRadius: radius.full,
              border: `1px solid ${selectedId === c.campusId ? modColors.scholar : border.light}`,
              background: selectedId === c.campusId ? `${modColors.scholar}15` : 'transparent',
              color: selectedId === c.campusId ? modColors.scholar : textColor.muted,
              fontWeight: fontWeight.medium,
              fontSize: fontSize.sm,
              cursor: 'pointer',
              fontFamily: font.sans,
              transition: transition.fast,
            }}
          >
            {c.short}
          </button>
        ))}
      </div>

      {/* Campus Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.serif, color: textColor.primary }}>
          {campus.name}
        </div>
        {netCampus && (
          <div style={{ fontSize: fontSize.sm, color: textColor.muted, marginTop: 4 }}>
            {netCampus.addr} · {netCampus.communityArea}
          </div>
        )}
      </div>

      {/* Campus KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Enrolled" value={fmtNum(campus.enrolled)} subValue={`Capacity: ${fmtNum(campus.capacity)}`} accent={modColors.scholar} />
        <KPICard label="Utilization" value={fmtPct(util)} accent={util >= 90 ? status.green : status.amber} />
        <KPICard label="Attrition" value={fmtPct(campus.attrition)} subValue={`~${attritionLoss} students`} accent={campus.attrition <= 10 ? status.green : status.red} />
        <KPICard label="Revenue Impact" value={fmt(revenueImpact)} subValue={`At risk: ${fmt(revenueLoss)}`} accent={modColors.ledger} />
      </div>

      {/* Grade Breakdown */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Grade-Level Enrollment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Grade 9', value: campus.grade9, color: chart.primary },
            { label: 'Grade 10', value: campus.grade10, color: chart.secondary },
            { label: 'Grade 11', value: campus.grade11, color: chart.tertiary },
            { label: 'Grade 12', value: campus.grade12, color: chart.quaternary },
          ].map(g => (
            <div key={g.label} style={{
              padding: 16,
              borderRadius: radius.md,
              background: `${g.color}08`,
              border: `1px solid ${g.color}20`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 4 }}>{g.label}</div>
              <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: g.color }}>{g.value}</div>
              <div style={{ fontSize: fontSize.xs, color: textColor.light }}>{fmtPct(g.value / campus.enrolled * 100)} of total</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Enrollment History */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Enrollment History (5-Year)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Spark data={campus.history} color={modColors.scholar} w={200} h={48} />
          <div style={{ display: 'flex', gap: 16 }}>
            {campus.history.map((v, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: textColor.light }}>Y{i + 1}</div>
                <div style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold, color: textColor.primary }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Pipeline */}
      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Admissions Pipeline
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Applied', value: campus.applied, color: chart.primary },
            { label: 'Accepted', value: campus.accepted, color: chart.secondary },
            { label: 'Yield Rate', value: `${campus.yield.toFixed(1)}%`, color: campus.yield >= 80 ? status.green : status.amber },
          ].map(item => (
            <div key={item.label} style={{
              padding: 16,
              borderRadius: radius.md,
              background: bg.subtle,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: item.color as string }}>
                {typeof item.value === 'number' ? fmtNum(item.value) : item.value}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE TAB
// ═══════════════════════════════════════════════════════════════════════════

function PipelineTab() {
  const enr = useEnrollment();
  const net = useNetwork();
  const sorted = [...enr.byCampus].sort((a, b) => b.applied - a.applied);
  const totalApplied = sorted.reduce((s, c) => s + c.applied, 0);
  const totalAccepted = sorted.reduce((s, c) => s + c.accepted, 0);

  const pipeAI = useSlateAI({
    prompt: `Analyze the admissions pipeline for this charter school network. Cover total applications, acceptance rates, yield rates, projected new enrollments, and revenue implications. Which campuses have the strongest and weakest pipelines? What is the single most impactful action to improve yield?`,
    domain: 'scholar-pipeline',
    fallback: `Pipeline shows ${totalApplied} total applications with ${totalAccepted} accepted. Yield rate is the critical conversion metric. Focus retention efforts on the 48 hours after acceptance notification.`,
  });
  const avgYield = sorted.reduce((s, c) => s + c.yield, 0) / sorted.length;
  const projectedEnroll = Math.round(totalAccepted * avgYield / 100);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Applications" value={fmtNum(totalApplied)} accent={chart.primary} />
        <KPICard label="Total Accepted" value={fmtNum(totalAccepted)} subValue={`${fmtPct(totalAccepted / totalApplied * 100)} acceptance rate`} accent={chart.secondary} />
        <KPICard label="Avg Yield Rate" value={fmtPct(avgYield)} accent={avgYield >= 80 ? status.green : status.amber} />
        <KPICard label="Projected New Enrollment" value={fmtNum(projectedEnroll)} subValue={`${fmtFull(projectedEnroll * net.revenuePerPupil)} revenue`} accent={modColors.scholar} />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Admissions Pipeline by Campus
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Campus</th>
              <th style={{ ...th, textAlign: 'right' }}>Applied</th>
              <th style={{ ...th, textAlign: 'right' }}>Accepted</th>
              <th style={{ ...th, textAlign: 'right' }}>Accept Rate</th>
              <th style={{ ...th, textAlign: 'right' }}>Yield</th>
              <th style={{ ...th, textAlign: 'right' }}>Projected</th>
              <th style={{ ...th, textAlign: 'right' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const acceptRate = (c.accepted / c.applied) * 100;
              const projected = Math.round(c.accepted * c.yield / 100);
              return (
                <tr key={c.campusId}>
                  <td style={tdLabel}>{c.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(c.applied)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(c.accepted)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtPct(acceptRate)}</td>
                  <td style={{
                    ...td,
                    textAlign: 'right',
                    color: c.yield >= 85 ? status.green : c.yield >= 75 ? status.amber : status.red,
                    fontWeight: fontWeight.semibold,
                  }}>
                    {fmtPct(c.yield)}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>{projected}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(projected * net.revenuePerPupil)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AIInsight
        label="Pipeline Intelligence"
        content={`The admissions pipeline shows ${fmtNum(totalApplied)} total applications across ${sorted.length} campuses, with ${fmtNum(totalAccepted)} accepted (${fmtPct(totalAccepted / totalApplied * 100)} acceptance rate). At the current average yield of ${fmtPct(avgYield)}, this projects to approximately ${fmtNum(projectedEnroll)} new enrollments worth ${fmtFull(projectedEnroll * net.revenuePerPupil)} in per-pupil revenue. The strongest pipeline campuses are ${sorted[0].name} (${fmtNum(sorted[0].applied)} applications) and ${sorted[1].name} (${fmtNum(sorted[1].applied)}). Yield rate is the critical conversion metric — every 1% improvement in yield across the network adds approximately ${Math.round(totalAccepted * 0.01)} students and ${fmtFull(Math.round(totalAccepted * 0.01) * net.revenuePerPupil)} in revenue. Focus retention efforts on the 48 hours after acceptance notification.`}
        aiText={pipeAI.text} aiLoading={pipeAI.loading} aiError={pipeAI.error} onRegenerate={pipeAI.regenerate} lastGenerated={pipeAI.lastGenerated}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTRITION TAB
// ═══════════════════════════════════════════════════════════════════════════

function AttritionTab() {
  const enr = useEnrollment();
  const net = useNetwork();
  const sorted = [...enr.byCampus].sort((a, b) => b.attrition - a.attrition);
  const avgAttrition = sorted.reduce((s, c) => s + c.attrition, 0) / sorted.length;
  const totalAttritionStudents = sorted.reduce((s, c) => s + Math.round(c.enrolled * c.attrition / 100), 0);
  const totalRevenueLoss = totalAttritionStudents * net.revenuePerPupil;

  const attrAI = useSlateAI({
    prompt: `Analyze student attrition for this charter school network. Cover the financial impact of attrition, which campuses have the highest and lowest rates, what the revenue recovery opportunity is from reducing attrition, and what specific retention strategies should be implemented. Be blunt about the financial cost.`,
    domain: 'scholar-attrition',
    fallback: `Network attrition is costing approximately ${totalAttritionStudents} students annually. Reducing attrition by 2 percentage points would retain significant revenue. Conduct exit interviews at high-attrition campuses.`,
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Network Attrition"
          value={fmtPct(avgAttrition)}
          subValue={`~${fmtNum(totalAttritionStudents)} students`}
          accent={avgAttrition <= 10 ? status.green : status.red}
        />
        <KPICard
          label="Revenue Impact"
          value={fmt(totalRevenueLoss)}
          subValue="Annual attrition cost"
          accent={status.red}
        />
        <KPICard
          label="Highest Attrition"
          value={`${sorted[0].short}: ${fmtPct(sorted[0].attrition)}`}
          accent={status.red}
        />
        <KPICard
          label="Lowest Attrition"
          value={`${sorted[sorted.length - 1].short}: ${fmtPct(sorted[sorted.length - 1].attrition)}`}
          accent={status.green}
        />
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Attrition by Campus — Ranked by Severity
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Campus</th>
              <th style={{ ...th, textAlign: 'right' }}>Enrolled</th>
              <th style={{ ...th, textAlign: 'right' }}>Attrition %</th>
              <th style={{ ...th, textAlign: 'right' }}>Students Lost</th>
              <th style={{ ...th, textAlign: 'right' }}>Revenue Lost</th>
              <th style={{ ...th, textAlign: 'center' }}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const lost = Math.round(c.enrolled * c.attrition / 100);
              const revLost = lost * net.revenuePerPupil;
              const severity = c.attrition >= 15 ? 'CRITICAL' : c.attrition >= 10 ? 'ELEVATED' : 'HEALTHY';
              const sevColor = c.attrition >= 15 ? 'red' : c.attrition >= 10 ? 'amber' : 'green';
              return (
                <tr key={c.campusId}>
                  <td style={tdLabel}>{c.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(c.enrolled)}</td>
                  <td style={{
                    ...td,
                    textAlign: 'right',
                    fontWeight: fontWeight.bold,
                    color: c.attrition >= 15 ? status.red : c.attrition >= 10 ? status.amber : status.green,
                  }}>
                    {fmtPct(c.attrition)}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(lost)}</td>
                  <td style={{ ...td, textAlign: 'right', color: status.red }}>{fmt(revLost)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <StatusBadge label={severity} variant={sevColor as any} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <AIInsight
        label="Attrition Intelligence"
        content={`Network-wide attrition at ${fmtPct(avgAttrition)} is costing Veritas approximately ${fmtNum(totalAttritionStudents)} students and ${fmtFull(totalRevenueLoss)} annually. ${sorted[0].name} at ${fmtPct(sorted[0].attrition)} is the most critical — losing approximately ${Math.round(sorted[0].enrolled * sorted[0].attrition / 100)} students per year. In contrast, ${sorted[sorted.length - 1].name} at ${fmtPct(sorted[sorted.length - 1].attrition)} demonstrates that low attrition is achievable within the network. The financial math is stark: reducing network attrition by just 2 percentage points would retain approximately ${Math.round(enr.networkTotal * 0.02)} students and ${fmtFull(Math.round(enr.networkTotal * 0.02) * net.revenuePerPupil)} in revenue — more than the cost of most retention programs. Recommendation: Conduct exit interviews at the top 3 attrition campuses and implement the retention practices from ${sorted[sorted.length - 1].short} across the network.`}
        aiText={attrAI.text} aiLoading={attrAI.loading} aiError={attrAI.error} onRegenerate={attrAI.regenerate} lastGenerated={attrAI.lastGenerated}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORECAST TAB
// ═══════════════════════════════════════════════════════════════════════════

function ForecastTab() {
  const enr = useEnrollment();
  const net = useNetwork();
  const historical = enr.historical;
  const forecasts = enr.forecasts;

  const forecastAI = useSlateAI({
    prompt: `Analyze the 5-year enrollment forecast for this charter school network. Cover the optimistic, probable, and pessimistic scenarios, the revenue spread between them, historical growth trajectory, and the key assumptions that drive each scenario. What is the biggest risk to enrollment growth and what is the tipping point?`,
    domain: 'scholar-forecast',
    fallback: `The 5-year forecast shows a wide range between optimistic and pessimistic scenarios. Historical growth has been driven by campus expansion and yield improvement. Key risk: pessimistic scenario could trigger covenant pressure.`,
  });

  return (
    <div>
      {/* Historical Enrollment */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Historical Enrollment
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Year</th>
              <th style={{ ...th, textAlign: 'right' }}>Enrolled</th>
              <th style={{ ...th, textAlign: 'right' }}>Applications</th>
              <th style={{ ...th, textAlign: 'right' }}>Accepted</th>
              <th style={{ ...th, textAlign: 'right' }}>Yield</th>
              <th style={{ ...th, textAlign: 'right' }}>Attrition</th>
              <th style={{ ...th, textAlign: 'right' }}>Campuses</th>
              <th style={{ ...th, textAlign: 'right' }}>Rev/Pupil</th>
            </tr>
          </thead>
          <tbody>
            {historical.map(h => (
              <tr key={h.year} style={!h.isActual ? { background: `${modColors.scholar}08` } : {}}>
                <td style={{ ...tdLabel, fontWeight: !h.isActual ? fontWeight.bold : fontWeight.medium }}>
                  {h.label} {!h.isActual && <StatusBadge label="CURRENT" variant="blue" size="sm" />}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: fontWeight.semibold }}>{fmtNum(h.totalEnrolled)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtNum(h.applications)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtNum(h.accepted)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtPct(h.yieldRate)}</td>
                <td style={{ ...td, textAlign: 'right', color: h.attritionRate <= 10 ? status.green : status.amber }}>{fmtPct(h.attritionRate)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{h.campusCount}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmtFull(h.revenuePerPupil)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Enrollment Forecasts */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          5-Year Enrollment Forecast with Revenue Impact
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th} rowSpan={2}>Year</th>
              <th style={{ ...th, textAlign: 'center', borderBottom: `1px solid ${status.green}40` }} colSpan={2}>Optimistic</th>
              <th style={{ ...th, textAlign: 'center', borderBottom: `1px solid ${status.blue}40` }} colSpan={2}>Probable</th>
              <th style={{ ...th, textAlign: 'center', borderBottom: `1px solid ${status.red}40` }} colSpan={2}>Pessimistic</th>
            </tr>
            <tr>
              <th style={{ ...th, textAlign: 'right', color: status.green }}>Students</th>
              <th style={{ ...th, textAlign: 'right', color: status.green }}>Revenue</th>
              <th style={{ ...th, textAlign: 'right', color: status.blue }}>Students</th>
              <th style={{ ...th, textAlign: 'right', color: status.blue }}>Revenue</th>
              <th style={{ ...th, textAlign: 'right', color: status.red }}>Students</th>
              <th style={{ ...th, textAlign: 'right', color: status.red }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map(f => (
              <tr key={f.year}>
                <td style={tdLabel}>{f.label}</td>
                <td style={{ ...td, textAlign: 'right', color: status.green }}>{fmtNum(f.optimistic)}</td>
                <td style={{ ...td, textAlign: 'right', color: status.green }}>{fmt(f.revenueOptimistic)}</td>
                <td style={{ ...td, textAlign: 'right', color: status.blue, fontWeight: fontWeight.semibold }}>{fmtNum(f.probable)}</td>
                <td style={{ ...td, textAlign: 'right', color: status.blue, fontWeight: fontWeight.semibold }}>{fmt(f.revenueProbable)}</td>
                <td style={{ ...td, textAlign: 'right', color: status.red }}>{fmtNum(f.pessimistic)}</td>
                <td style={{ ...td, textAlign: 'right', color: status.red }}>{fmt(f.revenuePessimistic)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Revenue Spread */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          5-Year Revenue Spread (FY31 Endpoint)
        </div>
        {forecasts.length > 0 && (() => {
          const last = forecasts[forecasts.length - 1];
          const spread = last.revenueOptimistic - last.revenuePessimistic;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Optimistic', value: last.revenueOptimistic, students: last.optimistic, color: status.green },
                { label: 'Probable', value: last.revenueProbable, students: last.probable, color: status.blue },
                { label: 'Pessimistic', value: last.revenuePessimistic, students: last.pessimistic, color: status.red },
              ].map(s => (
                <div key={s.label} style={{
                  padding: 20,
                  borderRadius: radius.md,
                  background: `${s.color}08`,
                  border: `1px solid ${s.color}20`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.mono, color: s.color }}>{fmt(s.value)}</div>
                  <div style={{ fontSize: fontSize.sm, color: textColor.muted }}>{fmtNum(s.students)} students</div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>

      <AIInsight
        label="Forecast Intelligence"
        content={`The 5-year enrollment forecast shows a range of ${fmtNum(forecasts[forecasts.length - 1]?.pessimistic ?? 0)} (pessimistic) to ${fmtNum(forecasts[forecasts.length - 1]?.optimistic ?? 0)} (optimistic) students by ${forecasts[forecasts.length - 1]?.label ?? 'FY31'}. The revenue spread between scenarios is ${fmt((forecasts[forecasts.length - 1]?.revenueOptimistic ?? 0) - (forecasts[forecasts.length - 1]?.revenuePessimistic ?? 0))} — a massive gap that underscores why enrollment management is the single most important operational lever. Historical data shows enrollment grew from ${fmtNum(historical[0]?.totalEnrolled ?? 0)} in ${historical[0]?.label ?? 'FY20'} to ${fmtNum(enr.networkTotal)} today, driven by campus expansion and yield improvement. The probable scenario assumes modest 1-2% annual growth, which is achievable if attrition holds below ${fmtPct(12)} and yield stays above ${fmtPct(80)}. Key risk: the pessimistic scenario shows enrollment declining below ${fmtNum(6500)} — a level that would trigger covenant pressure on the DSCR.`}
        aiText={forecastAI.text} aiLoading={forecastAI.loading} aiError={forecastAI.error} onRegenerate={forecastAI.regenerate} lastGenerated={forecastAI.lastGenerated}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRINCIPAL VIEW
// ═══════════════════════════════════════════════════════════════════════════

function PrincipalView() {
  const enr = useEnrollment();
  const net = useNetwork();
  const { selectedCampusId } = useRole();
  const campus = enr.byCampus.find(c => c.campusId === selectedCampusId) ?? enr.byCampus[0];
  const netCampus = net.campuses.find(c => c.id === selectedCampusId);

  if (!campus) return <div style={{ color: textColor.muted, padding: 40 }}>No campus data available.</div>;

  const util = (campus.enrolled / campus.capacity) * 100;
  const attritionStudents = Math.round(campus.enrolled * campus.attrition / 100);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, fontFamily: font.serif, color: textColor.primary }}>
          {campus.name}
        </div>
        {netCampus && (
          <div style={{ fontSize: fontSize.sm, color: textColor.muted, marginTop: 4 }}>{netCampus.addr} · {netCampus.communityArea}</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Enrolled" value={fmtNum(campus.enrolled)} subValue={`of ${fmtNum(campus.capacity)} seats`} accent={modColors.scholar} />
        <KPICard label="Utilization" value={fmtPct(util)} accent={util >= 90 ? status.green : status.amber} />
        <KPICard label="Attrition" value={fmtPct(campus.attrition)} subValue={`~${attritionStudents} students`} accent={campus.attrition <= 10 ? status.green : status.red} />
        <KPICard label="Yield Rate" value={fmtPct(campus.yield)} accent={campus.yield >= 80 ? status.green : status.amber} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Grade-Level Enrollment
          </div>
          {[
            { label: 'Grade 9', value: campus.grade9 },
            { label: 'Grade 10', value: campus.grade10 },
            { label: 'Grade 11', value: campus.grade11 },
            { label: 'Grade 12', value: campus.grade12 },
          ].map(g => (
            <div key={g.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${border.light}` }}>
              <span style={{ fontSize: fontSize.sm, color: textColor.secondary }}>{g.label}</span>
              <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold, color: textColor.primary }}>{g.value}</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Admissions Pipeline
          </div>
          {[
            { label: 'Applications', value: fmtNum(campus.applied) },
            { label: 'Accepted', value: fmtNum(campus.accepted) },
            { label: 'Yield Rate', value: fmtPct(campus.yield) },
            { label: 'Projected New', value: fmtNum(Math.round(campus.accepted * campus.yield / 100)) },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${border.light}` }}>
              <span style={{ fontSize: fontSize.sm, color: textColor.secondary }}>{item.label}</span>
              <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold, color: textColor.primary }}>{item.value}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          5-Year Enrollment History
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Spark data={campus.history} color={modColors.scholar} w={200} h={48} />
          <div style={{ display: 'flex', gap: 16 }}>
            {campus.history.map((v, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: textColor.light }}>Y{i + 1}</div>
                <div style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCHOLAR APP
// ═══════════════════════════════════════════════════════════════════════════

export default function ScholarApp() {
  const [activeTab, setActiveTab] = useState<ScholarTab>('overview');
  const enr = useEnrollment();
  const { role } = useRole();

  // Principal view is a simplified campus-specific view
  if (role === 'principal') {
    return (
      <div>
        <ModuleHeader
          title="Scholar"
          subtitle="Campus Enrollment Intelligence"
          accent={modColors.scholar}
          freshness={{ lastUpdated: enr.lastUpdated, source: enr.source }}
        />
        <PrincipalView />
      </div>
    );
  }

  return (
    <div>
      <ModuleHeader
        title="Scholar"
        subtitle="Enrollment Intelligence Engine"
        accent={modColors.scholar}
        freshness={{ lastUpdated: enr.lastUpdated, source: enr.source }}
      />

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 24,
        borderBottom: `1px solid ${border.light}`,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: fontSize.sm,
              fontWeight: activeTab === tab.id ? fontWeight.semibold : fontWeight.medium,
              color: activeTab === tab.id ? modColors.scholar : textColor.muted,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${modColors.scholar}` : '2px solid transparent',
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

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'campuses' && <CampusesTab />}
      {activeTab === 'pipeline' && <PipelineTab />}
      {activeTab === 'attrition' && <AttritionTab />}
      {activeTab === 'forecast' && <ForecastTab />}
    </div>
  );
}
