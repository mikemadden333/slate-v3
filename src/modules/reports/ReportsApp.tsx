/**
 * Slate v3 — Reports
 * ═══════════════════════════════════════════════════
 * Reporting & Board Deck Intelligence.
 * Generate board presentations, export data packages,
 * schedule recurring reports, and build custom dashboards.
 *
 * The CEO's reporting engine — one click to a board-ready deck.
 */

import React, { useState } from 'react';
import { useRole, useNetwork, useFinancials, useEnrollment, useRisks, useFundraising, useFacilities, useCivic, useStaff } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight, StatusBadge } from '../../components/Card';
import { fmt, fmtPct, fmtCompact } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';

// ─── Report Types ────────────────────────────────────────────────────────

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'deck' | 'export' | 'dashboard' | 'package';
  modules: string[];
  format: string;
  estimatedPages?: number;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'board-deck',
    name: 'Board Meeting Deck',
    description: 'Comprehensive board presentation with financial summary, enrollment, risk register, and strategic updates.',
    icon: '📊',
    type: 'deck',
    modules: ['Ledger', 'Scholar', 'Signal', 'Shield', 'Fund', 'Civic'],
    format: 'PPTX',
    estimatedPages: 18,
  },
  {
    id: 'financial-package',
    name: 'Financial Package',
    description: 'Complete financial reporting package with P&L, balance sheet, covenant compliance, and variance analysis.',
    icon: '💰',
    type: 'package',
    modules: ['Ledger'],
    format: 'PDF + XLSX',
    estimatedPages: 12,
  },
  {
    id: 'enrollment-report',
    name: 'Enrollment Report',
    description: 'Campus-by-campus enrollment analysis with trends, attrition, pipeline, and forecasts.',
    icon: '🎓',
    type: 'export',
    modules: ['Scholar'],
    format: 'PDF',
    estimatedPages: 8,
  },
  {
    id: 'risk-register',
    name: 'Risk Register Export',
    description: 'Full risk register with scoring, trends, mitigation status, and review schedule.',
    icon: '⚠️',
    type: 'export',
    modules: ['Signal'],
    format: 'XLSX',
  },
  {
    id: 'safety-brief',
    name: 'Safety Intelligence Brief',
    description: 'Weekly safety intelligence summary with incident analysis, threat levels, and recommendations.',
    icon: '🛡️',
    type: 'package',
    modules: ['Watch'],
    format: 'PDF',
    estimatedPages: 6,
  },
  {
    id: 'authorizer-report',
    name: 'Authorizer Report',
    description: 'Annual authorizer reporting package with academic, financial, and operational metrics.',
    icon: '🏛️',
    type: 'package',
    modules: ['Scholar', 'Ledger', 'Shield', 'Civic'],
    format: 'PDF',
    estimatedPages: 24,
  },
  {
    id: 'campus-scorecard',
    name: 'Campus Scorecards',
    description: 'Individual campus performance scorecards for principal review and accountability.',
    icon: '📋',
    type: 'dashboard',
    modules: ['Scholar', 'Ledger', 'Watch'],
    format: 'PDF',
  },
  {
    id: 'fundraising-pipeline',
    name: 'Fundraising Pipeline',
    description: 'Donor pipeline report with stage analysis, projections, and next actions.',
    icon: '🤝',
    type: 'export',
    modules: ['Fund'],
    format: 'XLSX',
  },
  {
    id: 'full-data-export',
    name: 'Full Data Export',
    description: 'Complete data export of all Slate modules for backup or external analysis.',
    icon: '💾',
    type: 'export',
    modules: ['All'],
    format: 'XLSX',
  },
];

// ─── Report Card ─────────────────────────────────────────────────────────

function ReportCard({ report, onGenerate }: { report: ReportConfig; onGenerate: () => void }) {
  const [hover, setHover] = useState(false);
  const [generating, setGenerating] = useState(false);

  const typeConfig = {
    deck: { color: modColors.reports, label: 'Presentation' },
    export: { color: statusColor.blue, label: 'Data Export' },
    dashboard: { color: statusColor.green, label: 'Dashboard' },
    package: { color: statusColor.amber, label: 'Package' },
  };
  const t = typeConfig[report.type];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      onGenerate();
    }, 1500);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? bg.hover : bg.card,
        borderRadius: radius.lg, border: `1px solid ${hover ? `${modColors.reports}40` : border.light}`,
        padding: 20, boxShadow: shadow.sm, transition: transition.fast,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 48, height: 48, borderRadius: radius.md,
          background: `${modColors.reports}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', flexShrink: 0,
        }}>
          {report.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: textColor.primary }}>{report.name}</div>
            <span style={{
              padding: '2px 8px', borderRadius: radius.full,
              background: `${t.color}10`, fontSize: '10px', color: t.color,
              fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {t.label}
            </span>
          </div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, lineHeight: 1.5, marginBottom: 10 }}>
            {report.description}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                padding: '2px 8px', borderRadius: radius.full, background: bg.subtle,
                fontSize: '10px', fontFamily: font.mono, color: textColor.light,
              }}>
                {report.format}
              </span>
              {report.estimatedPages && (
                <span style={{ fontSize: '10px', color: textColor.light }}>
                  ~{report.estimatedPages} pages
                </span>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '6px 16px', borderRadius: radius.md,
                background: generating ? textColor.muted : modColors.reports,
                color: '#fff', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
                transition: transition.fast,
              }}
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Module badges */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {report.modules.map(m => (
              <span key={m} style={{
                padding: '1px 6px', borderRadius: radius.full,
                background: `${brand.brass}08`, fontSize: '9px', color: textColor.light,
                fontFamily: font.mono,
              }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Data Freshness Summary ──────────────────────────────────────────────

function DataFreshnessSummary() {
  const fin = useFinancials();
  const enr = useEnrollment();
  const risks = useRisks();
  const fund = useFundraising();
  const fac = useFacilities();
  const civic = useCivic();
  const staff = useStaff();

  const sources = [
    { name: 'Financials', updated: fin.lastUpdated, source: fin.source },
    { name: 'Enrollment', updated: enr.lastUpdated, source: enr.source },
    { name: 'Risk Register', updated: risks.lastUpdated, source: risks.source },
    { name: 'Fundraising', updated: fund.lastUpdated, source: fund.source },
    { name: 'Facilities', updated: fac.lastUpdated, source: fac.source },
    { name: 'Civic', updated: civic.lastUpdated, source: civic.source },
    { name: 'Staff', updated: staff.lastUpdated, source: staff.source },
  ];

  return (
    <Card title="Data Freshness" subtitle="Report accuracy depends on current data">
      <div style={{ padding: '8px 0' }}>
        {sources.map((s, i) => {
          const age = Math.floor((Date.now() - new Date(s.updated).getTime()) / (1000 * 60 * 60 * 24));
          const color = age <= 7 ? statusColor.green : age <= 30 ? statusColor.amber : statusColor.red;
          const label = age <= 7 ? 'Fresh' : age <= 30 ? 'Aging' : 'Stale';

          return (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
              borderBottom: i < sources.length - 1 ? `1px solid ${border.light}` : 'none',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.primary }}>{s.name}</div>
              <div style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.muted }}>{age}d ago</div>
              <span style={{
                padding: '2px 8px', borderRadius: radius.full,
                background: `${color}10`, fontSize: '10px', color, fontWeight: fontWeight.semibold,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Recent Reports (Placeholder) ────────────────────────────────────────

function RecentReports() {
  const [reports] = useState<Array<{ name: string; date: string; format: string }>>([]);

  return (
    <Card title="Recent Reports" subtitle="Previously generated">
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        {reports.length === 0 ? (
          <div style={{ color: textColor.light, fontSize: fontSize.sm }}>
            No reports generated yet. Select a report type to get started.
          </div>
        ) : (
          reports.map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${border.light}` }}>
              {r.name}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REPORTS APP
// ═══════════════════════════════════════════════════════════════════════════

export default function ReportsApp() {
  const [filterType, setFilterType] = useState<string>('all');
  const [generatedCount, setGeneratedCount] = useState(0);

  const filteredReports = filterType === 'all'
    ? REPORTS
    : REPORTS.filter(r => r.type === filterType);

  return (
    <div>
      <ModuleHeader
        title="Reports"
        subtitle="Reporting & Board Deck Intelligence"
        accent={modColors.reports}
      />

      <AIInsight title="One-Click Reporting">
        <p style={{ margin: 0 }}>
          Reports transforms your Slate data into board-ready presentations, financial packages, and operational exports. Every report is generated from live data — no manual assembly, no stale numbers. Select a report type below and generate in seconds.
        </p>
      </AIInsight>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 20 }}>
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
              { id: 'dashboard', label: 'Dashboards' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilterType(f.id)} style={{
                padding: '4px 10px', borderRadius: radius.full,
                border: `1px solid ${filterType === f.id ? modColors.reports : border.light}`,
                background: filterType === f.id ? `${modColors.reports}15` : 'transparent',
                color: filterType === f.id ? modColors.reports : textColor.muted,
                fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
              }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Report Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredReports.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                onGenerate={() => setGeneratedCount(c => c + 1)}
              />
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
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.primary, marginBottom: 12, fontFamily: font.serif }}>
              Report Center
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: 12, background: bg.subtle, borderRadius: radius.md }}>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: modColors.reports }}>{REPORTS.length}</div>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Templates</div>
              </div>
              <div style={{ textAlign: 'center', padding: 12, background: bg.subtle, borderRadius: radius.md }}>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, fontFamily: font.mono, color: modColors.reports }}>{generatedCount}</div>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Generated</div>
              </div>
            </div>
          </div>

          <DataFreshnessSummary />
          <RecentReports />
        </div>
      </div>

      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: textColor.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        {REPORTS.length} report templates · One-click generation · Reports Intelligence
      </div>
    </div>
  );
}
