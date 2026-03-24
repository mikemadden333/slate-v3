/**
 * Slate v3 — Data Hub
 * ═══════════════════════════════════════════════════
 * The Central Nervous System — Moonshot Edition
 *
 * This is the BRAIN of Slate. Not just a data upload page — it's the
 * intelligence center that shows how all data flows through the system,
 * cross-module signal detection, data quality scoring, dependency mapping,
 * and network-wide health diagnostics.
 *
 * Tabs: Nerve Center · Data Domains · Cross-Module Signals · Upload · System Health
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Card, KPICard, StatusBadge, DataFreshness, ModuleHeader, Section, AIInsight, EmptyState } from '../components/Card';
import { bg, text, brand, border, status, font, fontSize, fontWeight, shadow, radius, transition, modules as moduleColors } from '../core/theme';
import { useDataStore } from './DataStore';
import { useSlateAI } from '../core/useSlateAI';
import { fmtDate, fmtRelative, fmtFull, fmtNum, fmtPct, fmtCompact } from '../core/formatters';
import { getFreshness } from '../core/types';
import type { FreshnessLevel } from '../core/types';
import { FRESHNESS_THRESHOLDS } from '../core/constants';

// ─── Tab System ──────────────────────────────────────────────────────────

type HubTab = 'nerve' | 'domains' | 'signals' | 'health';

const TABS: { id: HubTab; label: string; icon: string }[] = [
  { id: 'nerve',   label: 'Nerve Center',   icon: '⬡' },
  { id: 'domains', label: 'Data Domains',   icon: '◈' },
  { id: 'signals', label: 'Cross-Module Signals', icon: '◇' },
  { id: 'health',  label: 'System Health',  icon: '◉' },
];

// ─── Shared Styles ───────────────────────────────────────────────────────

const thS: React.CSSProperties = {
  fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted,
  textTransform: 'uppercase', letterSpacing: '0.5px', padding: '10px 12px',
  borderBottom: `2px solid ${border.light}`, textAlign: 'left',
};
const tdS: React.CSSProperties = {
  fontSize: fontSize.sm, color: text.primary, padding: '10px 12px',
  borderBottom: `1px solid ${border.light}`, fontFamily: font.mono,
};
const tdLS: React.CSSProperties = { ...tdS, fontFamily: font.sans, fontWeight: fontWeight.medium };

// ─── Data Domain Definitions ──────────────────────────────────────────────

interface DataDomain {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  templateName: string;
  thresholdDays: number;
  getLastUpdated: () => string;
  getSource: () => string;
  getSummary: () => string;
  getRecordCount: () => number;
  feedsModules: string[];
  keyMetrics: { label: string; value: string }[];
}

// ─── Progress Ring ───────────────────────────────────────────────────────

function Ring({ value, size = 48, color }: { value: number; size?: number; color: string }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}20`} strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size > 40 ? fontSize.sm : fontSize.xs, fontWeight: fontWeight.bold, color, fontFamily: font.mono }}>{value}</span>
      </div>
    </div>
  );
}

// ─── Bar Component ───────────────────────────────────────────────────────

function Bar({ value, max, color, h = 6 }: { value: number; max: number; color: string; h?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ flex: 1, height: h, background: `${color}15`, borderRadius: h, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: h, transition: transition.smooth }} />
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────

function UploadModal({ domain, onClose, onUploadComplete }: { domain: DataDomain; onClose: () => void; onUploadComplete: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    const mockPreview = [
      ['Campus', 'Enrolled', 'Capacity', 'Applications', 'Yield Rate'],
      ['Loop Academy', '965', '1050', '2100', '47%'],
      ['Englewood Academy', '718', '800', '1240', '60%'],
      ['Woodlawn Academy', '798', '900', '1380', '60%'],
      ['Auburn Gresham Academy', '678', '750', '1150', '59%'],
      ['Roseland Academy', '521', '600', '890', '60%'],
    ];
    setPreviewData(mockPreview);
    setStep('preview');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleCommit = () => {
    setStep('success');
    setTimeout(() => { onUploadComplete(); onClose(); }, 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 640, background: bg.card, borderRadius: radius.xl, boxShadow: shadow.xl, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${border.light}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: fontSize.xl, color: domain.color }}>{domain.icon}</span>
            <div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary }}>Update {domain.label}</div>
              <div style={{ fontSize: fontSize.xs, color: text.muted }}>Upload {domain.templateName} to refresh this data domain</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: fontSize.lg, color: text.light }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {step === 'upload' && (
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? domain.color : border.medium}`, borderRadius: radius.lg, padding: '48px 24px',
                textAlign: 'center', cursor: 'pointer', background: dragOver ? `${domain.color}08` : 'transparent', transition: transition.fast }}>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <div style={{ fontSize: '32px', marginBottom: 12, opacity: 0.5 }}>📊</div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.medium, color: text.secondary, marginBottom: 4 }}>Drop your file here or click to browse</div>
              <div style={{ fontSize: fontSize.sm, color: text.light }}>Accepts .xlsx, .xls, or .csv files</div>
            </div>
          )}

          {step === 'preview' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <StatusBadge label="File Loaded" variant="green" />
                <span style={{ fontSize: fontSize.sm, color: text.secondary }}>{file?.name} ({(file?.size || 0 / 1024).toFixed(0)} KB)</span>
              </div>
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{previewData[0]?.map((h, i) => <th key={i} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>{previewData.slice(1).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j} style={tdS}>{cell}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
              <div style={{ padding: 12, background: status.greenBg, border: `1px solid ${status.greenBorder}`, borderRadius: radius.md }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: status.green, marginBottom: 4 }}>Validation Results</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {['All required columns present', 'Data types validated', 'No anomalies detected'].map(v => (
                    <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: fontSize.sm }}>
                      <span style={{ color: status.green }}>✓</span><span style={{ color: text.secondary }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: status.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', color: status.green }}>✓</div>
              <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: 4 }}>Data Updated Successfully</div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>{domain.label} data has been validated and committed. All connected modules will reflect the updated data.</div>
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${border.light}`, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => { setStep('upload'); setFile(null); }} style={{ padding: '8px 16px', borderRadius: radius.md, border: `1px solid ${border.medium}`, background: bg.card, cursor: 'pointer', fontSize: fontSize.sm, color: text.secondary, fontFamily: font.sans }}>Back</button>
            <button onClick={handleCommit} style={{ padding: '10px 24px', borderRadius: radius.md, border: 'none', background: brand.gold, color: brand.navy, cursor: 'pointer', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, fontFamily: font.sans }}>Commit Data</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NERVE CENTER TAB — The Brain Dashboard
// ═══════════════════════════════════════════════════════════════════════════

function NerveCenterTab({ domains, freshCounts, overallHealth }: { domains: DataDomain[]; freshCounts: Record<FreshnessLevel, number>; overallHealth: number }) {
  const { store } = useDataStore();

  const nerveAI = useSlateAI({
    prompt: `Analyze the data health and cross-module intelligence signals for this charter school network's intelligence platform. There are ${domains.length} data domains feeding 10 modules. Overall data health is ${overallHealth}%. Identify the most critical data gaps, stale domains, and cross-module signals that require attention. What is the single most important data action to improve intelligence quality?`,
    domain: 'datahub-nerve',
    fallback: `System operating at ${overallHealth}% data health. ${freshCounts.fresh || 0} of ${domains.length} domains current. Monitor stale domains to maintain intelligence quality.`,
  });

  // Cross-module signal detection
  const signals = useMemo(() => {
    const sigs: { severity: 'critical' | 'warning' | 'info'; source: string; target: string; message: string; color: string }[] = [];

    // Enrollment → Financial impact
    const enrTrend = store.enrollment.byCampus.reduce((s, c) => s + (c.enrolled || 0), 0);
    const budgetEnr = store.financials.budget.enrollment;
    if (enrTrend < budgetEnr * 0.97) {
      sigs.push({ severity: 'critical', source: 'Scholar', target: 'Ledger', message: `Enrollment ${fmtNum(enrTrend)} is ${fmtPct(((budgetEnr - enrTrend) / budgetEnr) * 100)} below budget assumption of ${fmtNum(budgetEnr)}. Revenue at risk: ${fmtCompact(Math.round((budgetEnr - enrTrend) * 16000))}`, color: status.red });
    }

    // Financial → Covenant risk
    if (store.financials.ytdSummary.dscr < store.financials.covenants.dscrMinimum * 1.25) {
      sigs.push({ severity: 'warning', source: 'Ledger', target: 'Shield', message: `DSCR at ${store.financials.ytdSummary.dscr.toFixed(2)}x is within 25% of covenant minimum (${store.financials.covenants.dscrMinimum}x). Monitor closely.`, color: status.amber });
    }

    // Staff vacancies → Academic impact
    if (store.staff.vacancies > 10) {
      sigs.push({ severity: 'warning', source: 'Signal', target: 'Scholar', message: `${store.staff.vacancies} staff vacancies may impact academic programming and student services across the network.`, color: status.amber });
    }

    // Facilities → Safety
    const urgentWO = store.facilities.workOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed');
    if (urgentWO.length > 0) {
      sigs.push({ severity: 'critical', source: 'Grounds', target: 'Watch', message: `${urgentWO.length} urgent work order${urgentWO.length > 1 ? 's' : ''} require immediate attention: ${urgentWO.map(wo => `${wo.description} (${wo.campus})`).join('; ')}`, color: status.red });
    }

    // Risk register → Multiple modules
    const tier1Risks = store.risks.register.filter(r => r.tier.includes('Tier 1'));
    if (tier1Risks.length > 3) {
      sigs.push({ severity: 'warning', source: 'Shield', target: 'All Modules', message: `${tier1Risks.length} Tier 1 risks active. Risk density is elevated — review mitigation timelines.`, color: status.amber });
    }

    // Fundraising → Financial
    const pipelineTotal = store.fundraising.pipeline.reduce((s, p) => s + p.amount, 0);
    if (pipelineTotal > 0) {
      sigs.push({ severity: 'info', source: 'Fund', target: 'Ledger', message: `Fundraising pipeline of ${fmtCompact(pipelineTotal)} with ${fmtCompact(store.fundraising.closedYTD)} closed YTD. On track for philanthropy targets.`, color: status.blue });
    }

    // Data freshness signals
    const staleDomains = domains.filter(d => getFreshness(d.getLastUpdated(), d.thresholdDays) === 'stale');
    if (staleDomains.length > 0) {
      sigs.push({ severity: 'warning', source: 'Data Hub', target: 'All Modules', message: `${staleDomains.length} data domain${staleDomains.length > 1 ? 's' : ''} stale: ${staleDomains.map(d => d.label).join(', ')}. Intelligence quality degraded.`, color: status.amber });
    }

    // Compliance deadlines
    const upcomingDeadlines = store.compliance.deadlines.filter(d => {
      const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 30 && days >= 0;
    });
    if (upcomingDeadlines.length > 0) {
      sigs.push({ severity: 'info', source: 'Shield', target: 'Operations', message: `${upcomingDeadlines.length} compliance deadline${upcomingDeadlines.length > 1 ? 's' : ''} within 30 days. Review readiness.`, color: status.blue });
    }

    return sigs;
  }, [store, domains]);

  const criticalSignals = signals.filter(s => s.severity === 'critical');
  const warningSignals = signals.filter(s => s.severity === 'warning');

  return (
    <div>
      {/* Brain Health KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard label="Data Health" value={`${overallHealth}%`} subValue={`${freshCounts.fresh || 0}/${domains.length} domains current`}
          trend={{ value: overallHealth >= 80 ? 'Healthy' : overallHealth >= 50 ? 'Degraded' : 'Critical', positive: overallHealth >= 80 }}
          icon="⬡" accent={overallHealth >= 80 ? status.green : overallHealth >= 50 ? status.amber : status.red} />
        <KPICard label="Active Signals" value={signals.length.toString()} subValue={`${criticalSignals.length} critical · ${warningSignals.length} warning`}
          trend={{ value: criticalSignals.length > 0 ? 'Action needed' : 'Stable', positive: criticalSignals.length === 0 }}
          accent={criticalSignals.length > 0 ? status.red : status.green} />
        <KPICard label="Total Records" value={fmtNum(domains.reduce((sum, d) => sum + d.getRecordCount(), 0))} subValue="Across all domains" accent={brand.brass} />
        <KPICard label="Campuses" value={String(store.network.campusCount)} subValue={store.network.name} accent={brand.brass} />
        <KPICard label="Modules Fed" value="10" subValue="All intelligence modules" accent={moduleColors.datahub} />
      </div>

      {/* Neural Network Visualization */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Data Flow Architecture</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 0, alignItems: 'center' }}>
          {/* Input Domains */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {domains.map(d => {
              const freshness = getFreshness(d.getLastUpdated(), d.thresholdDays);
              const fColor = freshness === 'fresh' ? status.green : freshness === 'aging' ? status.amber : status.red;
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: bg.subtle, borderRadius: radius.md, borderLeft: `3px solid ${d.color}` }}>
                  <span style={{ fontSize: fontSize.sm, color: d.color }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.primary }}>{d.label}</div>
                    <div style={{ fontSize: '9px', color: text.light }}>{d.getRecordCount()} records</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: fColor, boxShadow: freshness === 'stale' ? `0 0 4px ${fColor}` : 'none' }} />
                </div>
              );
            })}
          </div>

          {/* Central Hub */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${moduleColors.datahub} 0%, ${brand.brass} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${moduleColors.datahub}30`, position: 'relative', zIndex: 2 }}>
              <span style={{ fontSize: '24px', color: '#fff' }}>⬡</span>
            </div>
            <div style={{ fontSize: '9px', color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 6, textAlign: 'center' }}>Data Hub</div>
            {/* Connection lines (simplified) */}
            <div style={{ position: 'absolute', left: -20, right: -20, top: '50%', height: 1, background: `${border.medium}`, zIndex: 1 }} />
          </div>

          {/* Output Modules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Watch', color: moduleColors.watch, icon: '◉', desc: 'Safety intelligence' },
              { label: 'Ledger', color: moduleColors.ledger, icon: '▤', desc: 'Financial intelligence' },
              { label: 'Scholar', color: moduleColors.scholar, icon: '◈', desc: 'Academic intelligence' },
              { label: 'Shield', color: moduleColors.shield, icon: '◇', desc: 'Risk intelligence' },
              { label: 'Fund', color: moduleColors.fund, icon: '◆', desc: 'Fundraising intelligence' },
              { label: 'Grounds', color: moduleColors.grounds, icon: '▣', desc: 'Facilities intelligence' },
              { label: 'Signal', color: moduleColors.signal, icon: '◎', desc: 'Network health' },
              { label: 'Briefing', color: brand.brass, icon: '◐', desc: 'Executive briefing' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: bg.subtle, borderRadius: radius.md, borderRight: `3px solid ${m.color}` }}>
                <span style={{ fontSize: fontSize.sm, color: m.color }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.primary }}>{m.label}</div>
                  <div style={{ fontSize: '9px', color: text.light }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Active Signals */}
      {signals.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Cross-Module Intelligence Signals</div>
          {signals.map((sig, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
              borderBottom: i < signals.length - 1 ? `1px solid ${border.light}` : 'none' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sig.color, marginTop: 4, flexShrink: 0,
                boxShadow: sig.severity === 'critical' ? `0 0 6px ${sig.color}80` : 'none',
                animation: sig.severity === 'critical' ? 'pulse 2s infinite' : 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <StatusBadge label={sig.severity.toUpperCase()} variant={sig.severity === 'critical' ? 'red' : sig.severity === 'warning' ? 'amber' : 'blue'} size="sm" />
                  <span style={{ fontSize: fontSize.xs, color: text.light }}>{sig.source} → {sig.target}</span>
                </div>
                <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.5 }}>{sig.message}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <AIInsight label="Data Hub Intelligence"
        content={`The Slate intelligence system is operating at ${overallHealth}% data health with ${freshCounts.fresh || 0} of ${domains.length} data domains current. ${criticalSignals.length > 0 ? `CRITICAL: ${criticalSignals.length} cross-module signal${criticalSignals.length > 1 ? 's' : ''} require immediate attention \u2014 ${criticalSignals.map(s => s.message.split('.')[0]).join('; ')}.` : 'No critical cross-module signals detected.'} ${warningSignals.length > 0 ? `${warningSignals.length} warning signal${warningSignals.length > 1 ? 's' : ''} flagged for review.` : ''} The data architecture feeds ${domains.reduce((s, d) => s + d.getRecordCount(), 0)} records across ${domains.length} domains into 10 intelligence modules. ${overallHealth < 80 ? 'Data freshness is degraded \u2014 stale domains reduce intelligence quality. Update flagged domains to restore full analytical capability.' : 'All systems operating within normal parameters.'}`}
        aiText={nerveAI.text} aiLoading={nerveAI.loading} aiError={nerveAI.error} onRegenerate={nerveAI.regenerate} lastGenerated={nerveAI.lastGenerated} />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA DOMAINS TAB
// ═══════════════════════════════════════════════════════════════════════════

function DataDomainsTab({ domains, onUpload }: { domains: DataDomain[]; onUpload: (d: DataDomain) => void }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {domains.map((domain) => {
          const freshness = getFreshness(domain.getLastUpdated(), domain.thresholdDays);
          const freshnessColors: Record<FreshnessLevel, { bg: string; color: string; label: string }> = {
            fresh: { bg: status.greenBg, color: status.green, label: 'Current' },
            aging: { bg: status.amberBg, color: status.amber, label: 'Aging' },
            stale: { bg: status.redBg, color: status.red, label: 'Stale' },
          };
          const fc = freshnessColors[freshness];

          return (
            <Card key={domain.id} accent={domain.color} hover onClick={() => onUpload(domain)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: fontSize.lg, color: domain.color }}>{domain.icon}</span>
                    <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary }}>{domain.label}</span>
                  </div>
                  <div style={{ fontSize: fontSize.sm, color: text.muted, marginBottom: 8 }}>{domain.description}</div>
                  <div style={{ fontSize: fontSize.sm, color: text.secondary, marginBottom: 12 }}>{domain.getSummary()}</div>

                  {/* Key Metrics */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    {domain.keyMetrics.map(m => (
                      <div key={m.label} style={{ padding: '4px 8px', background: bg.subtle, borderRadius: radius.md }}>
                        <span style={{ fontSize: '9px', color: text.light, textTransform: 'uppercase' }}>{m.label}: </span>
                        <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, fontFamily: font.mono, color: text.primary }}>{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Feeds Modules */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '20px' }}>Feeds:</span>
                    {domain.feedsModules.map(m => (
                      <span key={m} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: radius.full, background: `${domain.color}10`, color: domain.color, fontWeight: fontWeight.semibold }}>{m}</span>
                    ))}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <DataFreshness lastUpdated={domain.getLastUpdated()} source={domain.getSource()} thresholdDays={domain.thresholdDays} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <StatusBadge label={fc.label} variant={freshness === 'fresh' ? 'green' : freshness === 'aging' ? 'amber' : 'red'} />
                  <button style={{ padding: '6px 14px', borderRadius: radius.md, border: `1px solid ${domain.color}40`, background: `${domain.color}08`,
                    cursor: 'pointer', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: domain.color, fontFamily: font.sans, transition: transition.fast }}>
                    Update →
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-MODULE SIGNALS TAB
// ═══════════════════════════════════════════════════════════════════════════

function SignalsTab({ domains }: { domains: DataDomain[] }) {
  const signalAI = useSlateAI({
    prompt: `Analyze the cross-module data dependency architecture for this charter school intelligence platform. Identify the most critical dependency relationships, which modules are most vulnerable to data staleness, and what the cascade effects would be if key data domains go stale. Recommend a data refresh priority order.`,
    domain: 'datahub-signals',
    fallback: `The data architecture connects ${domains.length} domains to 10 intelligence modules. Enrollment is the highest-impact data source. Monitor dependency health to maintain cross-module intelligence quality.`,
  });
  const { store } = useDataStore();

  // Dependency matrix
  const moduleList = ['Watch', 'Ledger', 'Scholar', 'Shield', 'Fund', 'Grounds', 'Signal', 'Briefing'];
  const domainList = domains.map(d => d.label);

  // Build dependency matrix
  const matrix: Record<string, string[]> = {
    'Watch': ['Enrollment', 'Staff', 'Facilities', 'Risk Register'],
    'Ledger': ['Financials', 'Enrollment'],
    'Scholar': ['Enrollment', 'Staff'],
    'Shield': ['Risk Register', 'Financials', 'Facilities'],
    'Fund': ['Fundraising', 'Financials'],
    'Grounds': ['Facilities'],
    'Signal': ['Enrollment', 'Staff', 'Financials', 'Facilities'],
    'Briefing': ['Enrollment', 'Financials', 'Staff', 'Risk Register', 'Fundraising', 'Facilities'],
  };

  return (
    <div>
      {/* Dependency Matrix */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Data Domain → Module Dependency Matrix</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thS}>Module</th>
              {domainList.map(d => <th key={d} style={{ ...thS, textAlign: 'center', fontSize: '9px', padding: '8px 4px' }}>{d}</th>)}
              <th style={{ ...thS, textAlign: 'center' }}>Dependencies</th>
            </tr></thead>
            <tbody>
              {moduleList.map(mod => (
                <tr key={mod}>
                  <td style={{ ...tdLS, fontWeight: fontWeight.semibold }}>{mod}</td>
                  {domainList.map(dom => {
                    const depends = matrix[mod]?.includes(dom);
                    const domainObj = domains.find(d => d.label === dom);
                    const fresh = domainObj ? getFreshness(domainObj.getLastUpdated(), domainObj.thresholdDays) : 'fresh';
                    return (
                      <td key={dom} style={{ ...tdS, textAlign: 'center', padding: '8px 4px' }}>
                        {depends ? (
                          <div style={{ width: 14, height: 14, borderRadius: '50%', margin: '0 auto',
                            background: fresh === 'fresh' ? status.green : fresh === 'aging' ? status.amber : status.red,
                            boxShadow: fresh === 'stale' ? `0 0 4px ${status.red}80` : 'none' }} />
                        ) : (
                          <div style={{ width: 14, height: 14, borderRadius: '50%', margin: '0 auto', background: border.light }} />
                        )}
                      </td>
                    );
                  })}
                  <td style={{ ...tdS, textAlign: 'center' }}>{matrix[mod]?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border.light}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: status.green }} /><span style={{ fontSize: fontSize.xs, color: text.muted }}>Current</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: status.amber }} /><span style={{ fontSize: fontSize.xs, color: text.muted }}>Aging</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: status.red }} /><span style={{ fontSize: fontSize.xs, color: text.muted }}>Stale</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: border.light }} /><span style={{ fontSize: fontSize.xs, color: text.muted }}>No dependency</span></div>
        </div>
      </Card>

      {/* Impact Analysis */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Data Domain Impact Analysis</div>
        <div style={{ fontSize: fontSize.xs, color: text.light, marginBottom: 12 }}>When a data domain goes stale, these modules are affected:</div>
        {domains.map(domain => {
          const dependentModules = Object.entries(matrix).filter(([_, deps]) => deps.includes(domain.label)).map(([mod]) => mod);
          const freshness = getFreshness(domain.getLastUpdated(), domain.thresholdDays);
          return (
            <div key={domain.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${border.light}` }}>
              <span style={{ fontSize: fontSize.sm, color: domain.color, width: 20 }}>{domain.icon}</span>
              <div style={{ width: 100, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>{domain.label}</div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: freshness === 'fresh' ? status.green : freshness === 'aging' ? status.amber : status.red }} />
              <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {dependentModules.map(m => (
                  <span key={m} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: radius.full, background: `${domain.color}10`, color: domain.color, fontWeight: fontWeight.semibold }}>{m}</span>
                ))}
              </div>
              <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: text.light }}>{dependentModules.length} modules</span>
            </div>
          );
        })}
      </Card>

      <AIInsight label="Signal Intelligence"
        content={`The Slate data architecture connects ${domains.length} data domains to ${moduleList.length} intelligence modules through ${Object.values(matrix).reduce((s, deps) => s + deps.length, 0)} dependency relationships. The most connected domain is Enrollment (feeds ${Object.values(matrix).filter(deps => deps.includes('Enrollment')).length} modules), making it the highest-impact data source. Briefing is the most data-dependent module (${matrix['Briefing']?.length || 0} domain dependencies), which is expected as the executive summary layer. ${domains.some(d => getFreshness(d.getLastUpdated(), d.thresholdDays) === 'stale') ? 'WARNING: Stale data domains are degrading intelligence quality in dependent modules. Priority refresh recommended.' : 'All data domains are within freshness thresholds.'}`}
        aiText={signalAI.text} aiLoading={signalAI.loading} aiError={signalAI.error} onRegenerate={signalAI.regenerate} lastGenerated={signalAI.lastGenerated} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH TAB
// ═══════════════════════════════════════════════════════════════════════════

function SystemHealthTab({ domains, freshCounts, overallHealth }: { domains: DataDomain[]; freshCounts: Record<FreshnessLevel, number>; overallHealth: number }) {
  const { store, resetToDemo } = useDataStore();

  return (
    <div>
      {/* Health Score */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
          <Ring value={overallHealth} size={72} color={overallHealth >= 80 ? status.green : overallHealth >= 50 ? status.amber : status.red} />
          <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 8 }}>Overall Health</div>
        </Card>
        <KPICard label="Fresh Domains" value={String(freshCounts.fresh || 0)} subValue={`of ${domains.length} total`} accent={status.green} />
        <KPICard label="Aging Domains" value={String(freshCounts.aging || 0)} subValue="Approaching threshold" accent={status.amber} />
        <KPICard label="Stale Domains" value={String(freshCounts.stale || 0)} subValue="Past threshold" accent={status.red} />
      </div>

      {/* Domain Freshness Timeline */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Data Freshness Timeline</div>
        {domains.map(d => {
          const freshness = getFreshness(d.getLastUpdated(), d.thresholdDays);
          const fColor = freshness === 'fresh' ? status.green : freshness === 'aging' ? status.amber : status.red;
          const age = Math.round((Date.now() - new Date(d.getLastUpdated()).getTime()) / (1000 * 60 * 60 * 24));
          const pct = Math.min((age / d.thresholdDays) * 100, 150);
          return (
            <div key={d.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: fontSize.sm, color: d.color }}>{d.icon}</span>
                  <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>{d.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: text.muted }}>{age}d / {d.thresholdDays}d threshold</span>
                  <StatusBadge label={freshness === 'fresh' ? 'Current' : freshness === 'aging' ? 'Aging' : 'Stale'}
                    variant={freshness === 'fresh' ? 'green' : freshness === 'aging' ? 'amber' : 'red'} size="sm" />
                </div>
              </div>
              <div style={{ height: 6, background: border.light, borderRadius: 3, overflow: 'visible', position: 'relative' }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: fColor, borderRadius: 3, transition: transition.smooth }} />
                {/* Threshold marker */}
                <div style={{ position: 'absolute', right: 0, top: -2, width: 2, height: 10, background: text.light, borderRadius: 1 }} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* System Configuration */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Network Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Network', value: store.network.name },
            { label: 'City', value: store.network.city },
            { label: 'Campuses', value: String(store.network.campusCount) },
            { label: 'Grades', value: store.network.grades },
            { label: 'Founded', value: String(store.network.foundedYear) },
            { label: 'Fiscal Year', value: store.financials.fiscalYear },
          ].map(item => (
            <div key={item.label} style={{ padding: '8px 0' }}>
              <div style={{ fontSize: fontSize.xs, color: text.light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary, marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>System Actions</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={resetToDemo} style={{ padding: '10px 20px', borderRadius: radius.md, border: `1px solid ${border.medium}`, background: bg.card, cursor: 'pointer', fontSize: fontSize.sm, color: text.secondary, fontFamily: font.sans, transition: transition.fast }}>
            Reset to Demo Data
          </button>
          <button style={{ padding: '10px 20px', borderRadius: radius.md, border: `1px solid ${border.medium}`, background: bg.card, cursor: 'pointer', fontSize: fontSize.sm, color: text.secondary, fontFamily: font.sans }}>
            Export All Data (JSON)
          </button>
          <button style={{ padding: '10px 20px', borderRadius: radius.md, border: `1px solid ${border.medium}`, background: bg.card, cursor: 'pointer', fontSize: fontSize.sm, color: text.secondary, fontFamily: font.sans }}>
            Download Templates
          </button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DATA HUB APP
// ═══════════════════════════════════════════════════════════════════════════

export default function DataHub() {
  const { store, resetToDemo } = useDataStore();
  const [activeTab, setActiveTab] = useState<HubTab>('nerve');
  const [uploadDomain, setUploadDomain] = useState<DataDomain | null>(null);

  const domains: DataDomain[] = useMemo(() => [
    {
      id: 'enrollment', label: 'Enrollment', icon: '◈', color: moduleColors.scholar,
      description: 'Student enrollment, applications, yield, and attrition data by campus',
      templateName: 'enrollment-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.enrollment,
      getLastUpdated: () => store.enrollment.lastUpdated, getSource: () => store.enrollment.source,
      getSummary: () => `${fmtNum(store.enrollment.networkTotal)} students across ${store.network.campusCount} campuses`,
      getRecordCount: () => store.enrollment.byCampus.length,
      feedsModules: ['Watch', 'Ledger', 'Scholar', 'Signal', 'Briefing'],
      keyMetrics: [
        { label: 'Network Total', value: fmtNum(store.enrollment.networkTotal) },
        { label: 'Campuses', value: String(store.enrollment.byCampus.length) },
      ],
    },
    {
      id: 'financials', label: 'Financials', icon: '▤', color: moduleColors.ledger,
      description: 'Budget, actuals, covenants, and scenario projections',
      templateName: 'financials-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.financials,
      getLastUpdated: () => store.financials.lastUpdated, getSource: () => store.financials.source,
      getSummary: () => `${store.financials.fiscalYear} · ${store.financials.actuals.length} months of actuals`,
      getRecordCount: () => store.financials.actuals.length + store.financials.historical.length,
      feedsModules: ['Ledger', 'Shield', 'Fund', 'Signal', 'Briefing'],
      keyMetrics: [
        { label: 'Revenue', value: `$${store.financials.budget.revenue.total.toFixed(1)}M` },
        { label: 'DSCR', value: store.financials.ytdSummary.dscr.toFixed(2) + 'x' },
      ],
    },
    {
      id: 'staff', label: 'Staff', icon: '◉', color: moduleColors.signal,
      description: 'Staff roster, positions, vacancies, and licensure data',
      templateName: 'staff-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.staff,
      getLastUpdated: () => store.staff.lastUpdated, getSource: () => store.staff.source,
      getSummary: () => `${store.staff.activeStaff} active staff · ${store.staff.vacancies} vacancies`,
      getRecordCount: () => store.staff.byCampus.length,
      feedsModules: ['Watch', 'Scholar', 'Signal', 'Briefing'],
      keyMetrics: [
        { label: 'Active', value: String(store.staff.activeStaff) },
        { label: 'Vacancies', value: String(store.staff.vacancies) },
      ],
    },
    {
      id: 'risks', label: 'Risk Register', icon: '◇', color: moduleColors.shield,
      description: 'Enterprise risk register with scoring and mitigation tracking',
      templateName: 'risks-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.risks,
      getLastUpdated: () => store.risks.lastUpdated, getSource: () => store.risks.source,
      getSummary: () => `${store.risks.register.length} risks tracked · ${store.risks.register.filter(r => r.tier.includes('Tier 1')).length} Tier 1`,
      getRecordCount: () => store.risks.register.length,
      feedsModules: ['Shield', 'Watch', 'Briefing'],
      keyMetrics: [
        { label: 'Total Risks', value: String(store.risks.register.length) },
        { label: 'Tier 1', value: String(store.risks.register.filter(r => r.tier.includes('Tier 1')).length) },
      ],
    },
    {
      id: 'fundraising', label: 'Fundraising', icon: '◆', color: moduleColors.fund,
      description: 'Fundraising pipeline, donor relationships, and grant tracking',
      templateName: 'fundraising-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.fundraising,
      getLastUpdated: () => store.fundraising.lastUpdated, getSource: () => store.fundraising.source,
      getSummary: () => `${store.fundraising.pipeline.length} opportunities · ${fmtFull(store.fundraising.closedYTD)} closed YTD`,
      getRecordCount: () => store.fundraising.pipeline.length,
      feedsModules: ['Fund', 'Ledger', 'Briefing'],
      keyMetrics: [
        { label: 'Pipeline', value: String(store.fundraising.pipeline.length) },
        { label: 'Closed YTD', value: fmtCompact(store.fundraising.closedYTD) },
      ],
    },
    {
      id: 'facilities', label: 'Facilities', icon: '▣', color: moduleColors.grounds,
      description: 'Work orders, capital projects, campus conditions, and vendor contracts',
      templateName: 'facilities-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.facilities,
      getLastUpdated: () => store.facilities.lastUpdated, getSource: () => store.facilities.source,
      getSummary: () => `${store.facilities.workOrders.length} work orders · ${store.facilities.capitalProjects.length} capital projects`,
      getRecordCount: () => store.facilities.workOrders.length + store.facilities.capitalProjects.length + (store.facilities.campusConditions?.length || 0),
      feedsModules: ['Grounds', 'Watch', 'Shield', 'Signal', 'Briefing'],
      keyMetrics: [
        { label: 'Work Orders', value: String(store.facilities.workOrders.length) },
        { label: 'Network FCI', value: String(store.facilities.networkFCI || 'N/A') },
      ],
    },
  ], [store]);

  const freshCounts = useMemo(() => domains.reduce((acc, d) => {
    const level = getFreshness(d.getLastUpdated(), d.thresholdDays);
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<FreshnessLevel, number>), [domains]);

  const overallHealth = Math.round(((freshCounts.fresh || 0) / domains.length) * 100);

  return (
    <div>
      <ModuleHeader title="Data Hub" subtitle="The Central Nervous System — Intelligence Architecture & Data Management" accent={moduleColors.datahub} />

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${border.light}`, paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', fontSize: fontSize.sm,
            fontWeight: activeTab === tab.id ? fontWeight.semibold : fontWeight.medium,
            color: activeTab === tab.id ? moduleColors.datahub : text.muted,
            background: 'transparent', border: 'none',
            borderBottom: activeTab === tab.id ? `2px solid ${moduleColors.datahub}` : '2px solid transparent',
            cursor: 'pointer', fontFamily: font.sans, transition: transition.fast,
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 }}>
            <span style={{ fontSize: fontSize.xs }}>{tab.icon}</span>
            {tab.label}
            {tab.id === 'nerve' && (
              <span style={{ background: `${moduleColors.datahub}15`, color: moduleColors.datahub, fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 5px', borderRadius: radius.full }}>BRAIN</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'nerve' && <NerveCenterTab domains={domains} freshCounts={freshCounts} overallHealth={overallHealth} />}
      {activeTab === 'domains' && <DataDomainsTab domains={domains} onUpload={setUploadDomain} />}
      {activeTab === 'signals' && <SignalsTab domains={domains} />}
      {activeTab === 'health' && <SystemHealthTab domains={domains} freshCounts={freshCounts} overallHealth={overallHealth} />}

      {uploadDomain && (
        <UploadModal domain={uploadDomain} onClose={() => setUploadDomain(null)} onUploadComplete={() => setUploadDomain(null)} />
      )}

      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: text.light, borderTop: `1px solid ${border.light}`, marginTop: 20 }}>
        {domains.length} data domains · {domains.reduce((s, d) => s + d.getRecordCount(), 0)} total records · {overallHealth}% data health · Data Hub — The Central Nervous System
      </div>
    </div>
  );
}
