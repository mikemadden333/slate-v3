/**
 * Slate v3 — Data Hub
 * ═══════════════════════════════════════════════════
 * The self-service data management center.
 * Replaces the old Admin panel with a beautiful, guided experience.
 * Users upload Excel/CSV exports, Slate validates and ingests.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, KPICard, StatusBadge, DataFreshness, ModuleHeader, Section, EmptyState } from '../components/Card';
import { bg, text, brand, border, status, font, fontSize, fontWeight, shadow, radius, transition, modules as moduleColors } from '../core/theme';
import { useDataStore } from './DataStore';
import { fmtDate, fmtRelative, fmtFull, fmtNum } from '../core/formatters';
import { getFreshness } from '../core/types';
import type { FreshnessLevel } from '../core/types';
import { FRESHNESS_THRESHOLDS } from '../core/constants';

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
}

// ─── Upload Modal ─────────────────────────────────────────────────────────

interface UploadModalProps {
  domain: DataDomain;
  onClose: () => void;
  onUploadComplete: () => void;
}

function UploadModal({ domain, onClose, onUploadComplete }: UploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    // Simulate parsing — in production, this would use SheetJS
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
    // In production: parse file, validate, update DataStore
    setStep('success');
    setTimeout(() => {
      onUploadComplete();
      onClose();
    }, 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%',
        maxWidth: 700,
        maxHeight: '80vh',
        background: bg.card,
        borderRadius: radius.xl,
        boxShadow: shadow.xl,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${border.light}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ color: domain.color }}>{domain.icon}</span>
              Upload {domain.label} Data
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 2 }}>
              {domain.description}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: fontSize.lg, color: text.light, padding: '4px 8px',
          }}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {step === 'upload' && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? brand.gold : border.medium}`,
                  borderRadius: radius.lg,
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? `${brand.gold}08` : bg.subtle,
                  transition: transition.fast,
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: 12, opacity: 0.5 }}>
                  {dragOver ? '↓' : '📄'}
                </div>
                <div style={{
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.medium,
                  color: text.secondary,
                  marginBottom: 4,
                }}>
                  Drop your file here, or click to browse
                </div>
                <div style={{ fontSize: fontSize.sm, color: text.light }}>
                  Supports .xlsx, .xls, and .csv files
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              {/* Template download */}
              <div style={{
                marginTop: 20,
                padding: 16,
                background: bg.subtle,
                borderRadius: radius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.secondary }}>
                    Need a template?
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 2 }}>
                    Download our pre-formatted template and fill in your data.
                  </div>
                </div>
                <button style={{
                  padding: '8px 16px',
                  borderRadius: radius.md,
                  border: `1px solid ${border.medium}`,
                  background: bg.card,
                  cursor: 'pointer',
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.medium,
                  color: text.secondary,
                  fontFamily: font.sans,
                }}>
                  Download {domain.templateName}
                </button>
              </div>

              {/* Accepted formats */}
              <div style={{ marginTop: 16, fontSize: fontSize.xs, color: text.light }}>
                <strong>Tip:</strong> You can also export data directly from PowerSchool, Sage Intacct, or your SIS
                and upload the export file. Slate will auto-detect the column mappings.
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              {/* File info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: status.greenBg,
                border: `1px solid ${status.greenBorder}`,
                borderRadius: radius.md,
                marginBottom: 20,
              }}>
                <span style={{ color: status.green, fontSize: fontSize.lg }}>✓</span>
                <div>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>
                    {file?.name}
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: text.muted }}>
                    {previewData.length - 1} records detected · All columns mapped successfully
                  </div>
                </div>
              </div>

              {/* Column mapping preview */}
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Data Preview
              </div>
              <div style={{
                overflowX: 'auto',
                border: `1px solid ${border.light}`,
                borderRadius: radius.md,
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: fontSize.sm,
                }}>
                  <thead>
                    <tr style={{ background: bg.subtle }}>
                      {previewData[0]?.map((header, i) => (
                        <th key={i} style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: fontWeight.semibold,
                          color: text.secondary,
                          borderBottom: `1px solid ${border.light}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(1).map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${border.light}` }}>
                        {row.map((cell, j) => (
                          <td key={j} style={{
                            padding: '8px 12px',
                            color: text.primary,
                            whiteSpace: 'nowrap',
                          }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Validation results */}
              <div style={{
                marginTop: 16,
                padding: 12,
                background: bg.subtle,
                borderRadius: radius.md,
              }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                  Validation Results
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: fontSize.sm }}>
                    <span style={{ color: status.green }}>✓</span>
                    <span style={{ color: text.secondary }}>All required columns present</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: fontSize.sm }}>
                    <span style={{ color: status.green }}>✓</span>
                    <span style={{ color: text.secondary }}>Data types validated</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: fontSize.sm }}>
                    <span style={{ color: status.green }}>✓</span>
                    <span style={{ color: text.secondary }}>No anomalies detected</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 'success' && (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: status.greenBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '28px',
                color: status.green,
              }}>
                ✓
              </div>
              <div style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: text.primary,
                marginBottom: 4,
              }}>
                Data Updated Successfully
              </div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>
                {domain.label} data has been validated and committed. All connected modules will reflect the updated data.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <button onClick={() => { setStep('upload'); setFile(null); }} style={{
              padding: '8px 16px', borderRadius: radius.md,
              border: `1px solid ${border.medium}`, background: bg.card,
              cursor: 'pointer', fontSize: fontSize.sm, color: text.secondary,
              fontFamily: font.sans,
            }}>
              Back
            </button>
            <button onClick={handleCommit} style={{
              padding: '10px 24px', borderRadius: radius.md,
              border: 'none', background: brand.gold, color: brand.navy,
              cursor: 'pointer', fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
              fontFamily: font.sans,
            }}>
              Commit Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Data Hub Component ──────────────────────────────────────────────

export default function DataHub() {
  const { store, resetToDemo } = useDataStore();
  const [uploadDomain, setUploadDomain] = useState<DataDomain | null>(null);

  const domains: DataDomain[] = [
    {
      id: 'enrollment', label: 'Enrollment', icon: '◈', color: moduleColors.scholar,
      description: 'Student enrollment, applications, yield, and attrition data by campus',
      templateName: 'enrollment-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.enrollment,
      getLastUpdated: () => store.enrollment.lastUpdated,
      getSource: () => store.enrollment.source,
      getSummary: () => `${fmtNum(store.enrollment.networkTotal)} students across ${store.network.campusCount} campuses`,
      getRecordCount: () => store.enrollment.byCampus.length,
    },
    {
      id: 'financials', label: 'Financials', icon: '▤', color: moduleColors.ledger,
      description: 'Budget, actuals, covenants, and scenario projections',
      templateName: 'financials-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.financials,
      getLastUpdated: () => store.financials.lastUpdated,
      getSource: () => store.financials.source,
      getSummary: () => `${store.financials.fiscalYear} · ${store.financials.actuals.length} months of actuals`,
      getRecordCount: () => store.financials.actuals.length,
    },
    {
      id: 'staff', label: 'Staff', icon: '◉', color: moduleColors.signal,
      description: 'Staff roster, positions, vacancies, and licensure data',
      templateName: 'staff-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.staff,
      getLastUpdated: () => store.staff.lastUpdated,
      getSource: () => store.staff.source,
      getSummary: () => `${store.staff.activeStaff} active staff · ${store.staff.vacancies} vacancies`,
      getRecordCount: () => store.staff.byCampus.length,
    },
    {
      id: 'risks', label: 'Risk Register', icon: '◇', color: moduleColors.shield,
      description: 'Enterprise risk register with scoring and mitigation tracking',
      templateName: 'risks-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.risks,
      getLastUpdated: () => store.risks.lastUpdated,
      getSource: () => store.risks.source,
      getSummary: () => `${store.risks.register.length} risks tracked · ${store.risks.register.filter(r => r.tier.includes('Tier 1')).length} Tier 1`,
      getRecordCount: () => store.risks.register.length,
    },
    {
      id: 'fundraising', label: 'Fundraising', icon: '◆', color: moduleColors.fund,
      description: 'Fundraising pipeline, donor relationships, and grant tracking',
      templateName: 'fundraising-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.fundraising,
      getLastUpdated: () => store.fundraising.lastUpdated,
      getSource: () => store.fundraising.source,
      getSummary: () => `${store.fundraising.pipeline.length} opportunities · ${fmtFull(store.fundraising.closedYTD)} closed YTD`,
      getRecordCount: () => store.fundraising.pipeline.length,
    },
    {
      id: 'facilities', label: 'Facilities', icon: '▣', color: moduleColors.grounds,
      description: 'Work orders, capital projects, and vendor contracts',
      templateName: 'facilities-template.xlsx', thresholdDays: FRESHNESS_THRESHOLDS.facilities,
      getLastUpdated: () => store.facilities.lastUpdated,
      getSource: () => store.facilities.source,
      getSummary: () => `${store.facilities.workOrders.length} work orders · ${store.facilities.capitalProjects.length} capital projects`,
      getRecordCount: () => store.facilities.workOrders.length + store.facilities.capitalProjects.length,
    },
  ];

  // Calculate overall data health
  const freshCounts = domains.reduce((acc, d) => {
    const level = getFreshness(d.getLastUpdated(), d.thresholdDays);
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<FreshnessLevel, number>);

  const overallHealth = Math.round(((freshCounts.fresh || 0) / domains.length) * 100);

  return (
    <div>
      <ModuleHeader
        title="Data Hub"
        subtitle="Manage your network's data. Upload, validate, and monitor data freshness across all modules."
        accent={moduleColors.datahub}
      />

      {/* Data Health Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KPICard
          label="Data Health"
          value={`${overallHealth}%`}
          subValue={`${freshCounts.fresh || 0} of ${domains.length} domains current`}
          accent={moduleColors.datahub}
          icon="⬡"
        />
        <KPICard
          label="Total Records"
          value={fmtNum(domains.reduce((sum, d) => sum + d.getRecordCount(), 0))}
          subValue="Across all domains"
          accent={brand.brass}
        />
        <KPICard
          label="Campuses"
          value={String(store.network.campusCount)}
          subValue={store.network.name}
          accent={brand.brass}
        />
        <KPICard
          label="Network"
          value={store.network.city}
          subValue={`${store.network.grades} · Est. ${store.network.foundedYear}`}
          accent={brand.brass}
        />
      </div>

      {/* Data Domains Grid */}
      <Section title="Data Domains">
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
              <Card key={domain.id} accent={domain.color} hover onClick={() => setUploadDomain(domain)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}>
                      <span style={{ fontSize: fontSize.lg, color: domain.color }}>{domain.icon}</span>
                      <span style={{
                        fontSize: fontSize.md,
                        fontWeight: fontWeight.semibold,
                        color: text.primary,
                      }}>
                        {domain.label}
                      </span>
                    </div>
                    <div style={{
                      fontSize: fontSize.sm,
                      color: text.muted,
                      marginBottom: 12,
                    }}>
                      {domain.getSummary()}
                    </div>
                    <DataFreshness
                      lastUpdated={domain.getLastUpdated()}
                      source={domain.getSource()}
                      thresholdDays={domain.thresholdDays}
                    />
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 8,
                  }}>
                    <StatusBadge
                      label={fc.label}
                      variant={freshness === 'fresh' ? 'green' : freshness === 'aging' ? 'amber' : 'red'}
                    />
                    <button style={{
                      padding: '6px 14px',
                      borderRadius: radius.md,
                      border: `1px solid ${border.light}`,
                      background: bg.card,
                      cursor: 'pointer',
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.medium,
                      color: text.secondary,
                      fontFamily: font.sans,
                      transition: transition.fast,
                    }}>
                      Update
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* Quick Actions */}
      <Section title="Quick Actions">
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={resetToDemo}
            style={{
              padding: '10px 20px',
              borderRadius: radius.md,
              border: `1px solid ${border.medium}`,
              background: bg.card,
              cursor: 'pointer',
              fontSize: fontSize.sm,
              color: text.secondary,
              fontFamily: font.sans,
              transition: transition.fast,
            }}
          >
            Reset to Demo Data
          </button>
          <button style={{
            padding: '10px 20px',
            borderRadius: radius.md,
            border: `1px solid ${border.medium}`,
            background: bg.card,
            cursor: 'pointer',
            fontSize: fontSize.sm,
            color: text.secondary,
            fontFamily: font.sans,
          }}>
            Export All Data (JSON)
          </button>
        </div>
      </Section>

      {/* Upload Modal */}
      {uploadDomain && (
        <UploadModal
          domain={uploadDomain}
          onClose={() => setUploadDomain(null)}
          onUploadComplete={() => setUploadDomain(null)}
        />
      )}
    </div>
  );
}
