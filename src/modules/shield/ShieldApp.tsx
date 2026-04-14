/**
 * Slate v3 — Shield
 * ═══════════════════════════════════════════════════════════════════
 * ENTERPRISE RISK & COMPLIANCE INTELLIGENCE
 *
 * Shield is the operational risk management and compliance engine.
 * Unlike Signal (which scans the external environment for existential
 * threats), Shield manages the INTERNAL risk register, compliance
 * deadlines, audit readiness, and governance posture.
 *
 * KEY CAPABILITIES:
 * 1. Interactive 5×5 heat map with velocity overlay
 * 2. Full risk register with drill-down detail view
 * 3. Compliance deadline tracker with urgency timeline
 * 4. Audit readiness gauge and policy tracker
 * 5. AI-powered risk intelligence analysis
 * 6. Risk-by-lens and risk-by-category analytics
 * 7. Mitigation status tracking and governance monitoring
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useCompliance, useRisks, useRole, useNetwork } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, StatusBadge, Section } from '../../components/Card';
import { fmtPct } from '../../core/formatters';
import { AI_CONFIG } from '../../core/constants';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';
import type { Risk, RiskTier, RiskVelocity, Deadline } from '../../core/types';

// ─── Velocity Config ────────────────────────────────────────────────────────

const VELOCITY: Record<string, { icon: string; label: string; color: string; multiplier: number; desc: string }> = {
  Fast:     { icon: '▲▲', label: 'Fast',     color: statusColor.red,   multiplier: 1.3, desc: 'Could materialize within weeks' },
  Moderate: { icon: '▲',  label: 'Moderate', color: statusColor.amber, multiplier: 1.0, desc: 'Months to develop fully' },
  Slow:     { icon: '—',  label: 'Slow',     color: statusColor.green, multiplier: 0.8, desc: 'Evolves over quarters/years' },
};

const LENS_CONFIG: Record<string, { color: string; bg: string; border: string; desc: string }> = {
  Existential: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', desc: 'Endurance — Board & exec oversight' },
  Core:        { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', desc: 'Foundational — leadership teams' },
  Emergent:    { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', desc: 'Signals — working group monitoring' },
};

const MITIGATION_STATUS: Record<string, { color: string; pct: number }> = {
  'Not Started':  { color: statusColor.red,   pct: 0 },
  'In Progress':  { color: statusColor.amber, pct: 50 },
  'Advanced':     { color: statusColor.blue,  pct: 75 },
  'Complete':     { color: statusColor.green, pct: 100 },
};

// ─── Heat Map Color ─────────────────────────────────────────────────────────

function heatColor(score: number): string {
  if (score >= 20) return '#DC2626';
  if (score >= 15) return '#EA580C';
  if (score >= 10) return '#D97706';
  if (score >= 5)  return '#0EA5E9';
  return '#10B981';
}

function getAdjustedScore(r: Risk): number {
  const inherent = r.likelihood * r.impact;
  const mult = VELOCITY[r.velocity]?.multiplier || 1;
  return Math.round(inherent * mult);
}

// ─── Velocity Badge ─────────────────────────────────────────────────────────

function VelocityBadge({ velocity }: { velocity: string }) {
  const v = VELOCITY[velocity];
  if (!v) return null;
  return (
    <span style={{
      fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: v.color,
      padding: '2px 8px', borderRadius: radius.full,
      border: `1px solid ${v.color}30`, background: `${v.color}08`,
    }}>
      {v.icon} {v.label}
    </span>
  );
}

// ─── Lens Badge ─────────────────────────────────────────────────────────────

function LensBadge({ lens }: { lens: string }) {
  const l = LENS_CONFIG[lens];
  if (!l) return <span>{lens}</span>;
  return (
    <span style={{
      fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: l.color,
      padding: '2px 8px', borderRadius: radius.full,
      border: `1px solid ${l.border}`, background: l.bg,
    }}>
      {lens}
    </span>
  );
}

// ─── Mitigation Bar ─────────────────────────────────────────────────────────

function MitigationBar({ status }: { status: string }) {
  const m = MITIGATION_STATUS[status] || { color: textColor.muted, pct: 25 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 4, background: border.light, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${m.pct}%`, height: '100%', background: m.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: fontSize.xs, color: m.color, fontWeight: fontWeight.semibold }}>{status}</span>
    </div>
  );
}

// ─── Trend Indicator ────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: string }) {
  const color = trend.includes('Increasing') ? statusColor.red
    : trend.includes('Decreasing') ? statusColor.green : textColor.muted;
  return (
    <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color }}>
      {trend}
    </span>
  );
}

// ─── Score Badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: radius.md,
      background: `${heatColor(score)}18`, border: `2px solid ${heatColor(score)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: font.mono, fontWeight: fontWeight.bold, fontSize: fontSize.base, color: heatColor(score),
    }}>
      {score}
    </div>
  );
}

// ─── Deadline Row ───────────────────────────────────────────────────────────

function DeadlineRow({ d }: { d: Deadline }) {
  const statusMap: Record<string, { color: string; bg: string; label: string }> = {
    'overdue':  { color: statusColor.red,   bg: `${statusColor.red}08`,   label: 'OVERDUE' },
    'at-risk':  { color: statusColor.amber, bg: `${statusColor.amber}08`, label: 'AT RISK' },
    'on-track': { color: statusColor.green, bg: `${statusColor.green}08`, label: 'ON TRACK' },
  };
  const s = statusMap[d.status] || statusMap['on-track'];
  const daysText = d.daysOut < 0 ? `${Math.abs(d.daysOut)}d overdue` : d.daysOut === 0 ? 'Due today' : `${d.daysOut}d remaining`;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px',
      alignItems: 'center', gap: 12, padding: '14px 16px',
      background: s.bg, borderRadius: radius.md, marginBottom: 6,
      borderLeft: `3px solid ${s.color}`,
    }}>
      <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: textColor.primary }}>{d.item}</div>
      <div style={{ fontSize: fontSize.sm, color: textColor.muted }}>{d.owner}</div>
      <div style={{ fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold, color: s.color }}>{daysText}</div>
      <StatusBadge label={s.label} variant={d.status === 'overdue' ? 'red' : d.status === 'at-risk' ? 'amber' : 'green'} size="sm" />
    </div>
  );
}

// ─── Heat Map View ──────────────────────────────────────────────────────────

function HeatMapView({ risks, onSelectRisk }: { risks: Risk[]; onSelectRisk: (r: Risk) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
      {/* 5×5 Grid */}
      <div style={{ position: 'relative', padding: '0 0 0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gap: 3 }}>
          {[5, 4, 3, 2, 1].map(impact =>
            [1, 2, 3, 4, 5].map(likelihood => {
              const cellScore = likelihood * impact;
              const cellRisks = risks.filter(r => r.likelihood === likelihood && r.impact === impact);
              return (
                <div key={`${impact}-${likelihood}`} style={{
                  background: `${heatColor(cellScore)}${cellRisks.length > 0 ? '20' : '08'}`,
                  border: `1px solid ${heatColor(cellScore)}30`,
                  borderRadius: radius.sm,
                  minHeight: 64,
                  padding: 6,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  alignContent: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {cellRisks.map(r => (
                    <div
                      key={r.id}
                      onClick={() => onSelectRisk(r)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: heatColor(cellScore),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '8px', fontWeight: 700, color: '#FFF', cursor: 'pointer',
                        border: '2px solid #FFF',
                        boxShadow: `0 1px 3px ${heatColor(cellScore)}60`,
                        transition: 'transform 0.15s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      title={r.name}
                    >
                      {r.id.replace('R-', '')}
                      {r.velocity && (
                        <span style={{
                          position: 'absolute', top: -6, right: -6,
                          fontSize: '8px', fontWeight: 800,
                          color: VELOCITY[r.velocity]?.color || '#999',
                        }}>
                          {VELOCITY[r.velocity]?.icon}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
        {/* Axis labels */}
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, letterSpacing: '1px' }}>
          LIKELIHOOD →
        </div>
        <div style={{
          position: 'absolute', left: -4, top: '50%', transform: 'rotate(-90deg) translateX(-50%)',
          fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.muted, letterSpacing: '1px',
        }}>
          ← IMPACT
        </div>
      </div>

      {/* Sidebar: Velocity Legend + Risk List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: bg.card, borderRadius: radius.lg, padding: 16,
          border: `1px solid ${border.light}`,
        }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Velocity Overlay
          </div>
          {Object.entries(VELOCITY).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: v.color, width: 30 }}>{v.icon}</span>
              <div>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.primary }}>{v.label}</div>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: bg.card, borderRadius: radius.lg, padding: 16,
          border: `1px solid ${border.light}`, flex: 1,
        }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Plotted Risks ({risks.length})
          </div>
          {risks
            .sort((a, b) => getAdjustedScore(b) - getAdjustedScore(a))
            .map(r => (
              <div
                key={r.id}
                onClick={() => onSelectRisk(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                  borderRadius: radius.sm, cursor: 'pointer', fontSize: fontSize.xs,
                  transition: transition.fast,
                  marginBottom: 2,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${modColors.shield}10`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: heatColor(r.likelihood * r.impact),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '7px', fontWeight: 700, color: '#FFF',
                }}>
                  {r.id.replace('R-', '')}
                </div>
                <div style={{ flex: 1, fontWeight: fontWeight.medium, color: textColor.secondary, lineHeight: 1.2 }}>
                  {r.name}
                </div>
              </div>
            ))}
        </div>

        {/* Scoring guardrail */}
        <div style={{
          background: bg.subtle, borderRadius: radius.md, padding: '12px 14px',
          borderLeft: `3px solid ${brand.brass}`, fontSize: fontSize.xs, color: textColor.muted, lineHeight: 1.6,
        }}>
          <strong style={{ color: textColor.primary }}>Guardrail:</strong> Scoring is directional, not precise. The goal is relative priority, not false precision.
        </div>
      </div>
    </div>
  );
}

// ─── Risk Detail View ───────────────────────────────────────────────────────

function RiskDetail({ risk, onBack }: { risk: Risk; onBack: () => void }) {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const inherent = risk.likelihood * risk.impact;
  const adjusted = getAdjustedScore(risk);

  const generateAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 2048,
          system: AI_CONFIG.systemPrompt,
          messages: [{
            role: 'user',
            content: `Analyze this enterprise risk for a Chicago charter school network (10 campuses, 6,752 students):

Risk: ${risk.name}
Description: ${risk.description}
Lens: ${risk.lens} | Category: ${risk.category} | Owner: ${risk.owner}
Likelihood: ${risk.likelihood}/5 | Impact: ${risk.impact}/5 | Velocity: ${risk.velocity}
Current Controls: ${risk.controls}
Mitigation Strategy: ${risk.mitigation}
Mitigation Status: ${risk.mitigationStatus}
KRIs: ${risk.kri}
Trend: ${risk.trend}
Notes: ${risk.notes}

Provide a concise risk intelligence analysis (3-4 paragraphs):
1. Current assessment — is the scoring appropriate? What peer networks are experiencing.
2. What could accelerate this risk — specific triggers to watch.
3. Recommended next 90-day actions — be specific and actionable.
4. Board-ready summary — one sentence for the board risk committee.`,
          }],
        }),
      });
      const d = await res.json();
      setAiAnalysis(d.content?.find((b: any) => b.type === 'text')?.text || 'Analysis unavailable.');
    } catch {
      setAiAnalysis('Unable to generate analysis. Check API configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} style={{
        padding: '6px 16px', borderRadius: radius.md, border: `1px solid ${border.light}`,
        background: bg.card, color: textColor.muted, fontSize: fontSize.sm,
        cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        ← Back to Register
      </button>

      {/* Header */}
      <div style={{
        background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
        padding: 24, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, fontFamily: font.mono, marginBottom: 4 }}>{risk.id}</div>
            <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: textColor.primary, fontFamily: font.body }}>{risk.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <LensBadge lens={risk.lens} />
            <StatusBadge
              label={risk.tier.replace('Tier ', 'T').replace(' — ', ': ')}
              variant={risk.tier.includes('Tier 1') ? 'red' : risk.tier.includes('Tier 2') ? 'amber' : 'blue'}
            />
          </div>
        </div>
        <p style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.8, margin: 0 }}>
          {risk.description}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Scoring */}
        <div style={{
          background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`, padding: 24,
        }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Risk Scoring
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 4 }}>Likelihood</div>
              <div style={{ fontSize: '24px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: textColor.primary }}>{risk.likelihood}/5</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 4 }}>Impact</div>
              <div style={{ fontSize: '24px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: textColor.primary }}>{risk.impact}/5</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 4 }}>Velocity</div>
              <VelocityBadge velocity={risk.velocity} />
            </div>
          </div>
          <div style={{
            background: bg.subtle, borderRadius: radius.md, padding: '12px 16px',
          }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 4 }}>Score Calculation</div>
            <div style={{ fontSize: fontSize.sm, color: textColor.secondary, fontFamily: font.mono }}>
              {risk.likelihood} × {risk.impact} = {inherent} inherent × {VELOCITY[risk.velocity]?.multiplier || 1} velocity = <strong style={{ color: heatColor(adjusted) }}>{adjusted} adjusted</strong>
            </div>
          </div>
          {risk.targetScore > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: fontSize.xs, color: textColor.muted }}>Target Score</span>
              <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: statusColor.green, fontFamily: font.mono }}>{risk.targetScore}</span>
            </div>
          )}
        </div>

        {/* Controls & Mitigation */}
        <div style={{
          background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`, padding: 24,
        }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Controls & Mitigation
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 6, textTransform: 'uppercase' }}>Current Controls</div>
            <p style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.7, margin: 0 }}>{risk.controls}</p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 6, textTransform: 'uppercase' }}>Mitigation Strategy</div>
            <p style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.7, margin: 0 }}>{risk.mitigation}</p>
          </div>
          <div>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 8, textTransform: 'uppercase' }}>Mitigation Status</div>
            <MitigationBar status={risk.mitigationStatus} />
          </div>
        </div>
      </div>

      {/* Governance & Monitoring */}
      <div style={{
        background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`, padding: 24, marginBottom: 16,
      }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Governance & Monitoring
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 4, textTransform: 'uppercase' }}>Key Risk Indicators</div>
            <p style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6, margin: 0 }}>{risk.kri}</p>
          </div>
          <div>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 4, textTransform: 'uppercase' }}>Last Review</div>
            <p style={{ fontSize: fontSize.sm, color: textColor.secondary, margin: 0, fontFamily: font.mono }}>{risk.lastReview}</p>
          </div>
          <div>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 4, textTransform: 'uppercase' }}>Next Review</div>
            <p style={{ fontSize: fontSize.sm, color: textColor.secondary, margin: 0, fontFamily: font.mono }}>{risk.nextReview}</p>
          </div>
          <div>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 4, textTransform: 'uppercase' }}>Trend</div>
            <TrendIndicator trend={risk.trend} />
          </div>
        </div>
        {risk.notes && (
          <div style={{
            marginTop: 16, padding: '12px 16px', background: bg.subtle, borderRadius: radius.md,
            borderLeft: `3px solid ${modColors.shield}`,
          }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 4 }}>NOTES / BOARD COMMENTS</div>
            <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6 }}>{risk.notes}</div>
          </div>
        )}
      </div>

      {/* AI Risk Analysis */}
      <div style={{
        background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`, padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AI Risk Intelligence
          </div>
          <button
            onClick={generateAnalysis}
            disabled={aiLoading}
            style={{
              padding: '6px 16px', borderRadius: radius.md,
              background: aiLoading ? bg.subtle : `${modColors.shield}12`,
              color: aiLoading ? textColor.muted : modColors.shield,
              border: `1px solid ${aiLoading ? border.light : modColors.shield}40`,
              fontSize: fontSize.xs, fontWeight: fontWeight.bold, cursor: aiLoading ? 'default' : 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {aiLoading ? 'Analyzing...' : 'Generate Analysis'}
          </button>
        </div>
        {aiAnalysis ? (
          <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
            {aiAnalysis}
          </div>
        ) : (
          <div style={{ fontSize: fontSize.sm, color: textColor.muted, textAlign: 'center', padding: 24 }}>
            Click "Generate Analysis" for AI-powered risk intelligence on this specific risk.
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SHIELD APP
// ═══════════════════════════════════════════════════════════════════════════

export default function ShieldApp() {
  const comp = useCompliance();
  const riskData = useRisks();
  const network = useNetwork();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'heatmap' | 'register' | 'compliance' | 'detail'>('dashboard');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const risks = riskData.register;
  const overdue = comp.deadlines.filter(d => d.status === 'overdue');
  const atRisk = comp.deadlines.filter(d => d.status === 'at-risk');
  const onTrack = comp.deadlines.filter(d => d.status === 'on-track');

  const tier1 = risks.filter(r => r.tier.includes('Tier 1'));
  const tier2 = risks.filter(r => r.tier.includes('Tier 2'));
  const tier3 = risks.filter(r => r.tier.includes('Tier 3'));
  const increasing = risks.filter(r => r.trend.includes('Increasing'));
  const avgScore = risks.length > 0
    ? risks.reduce((s, r) => s + getAdjustedScore(r), 0) / risks.length
    : 0;

  const handleSelectRisk = (r: Risk) => {
    setSelectedRisk(r);
    setActiveTab('detail');
  };

  // Generate AI compliance intelligence
  const generateComplianceAI = async () => {
    setAiLoading(true);
    setAiInsight('');
    try {
      const riskSummary = risks.map(r => `${r.name} (${r.tier}, ${r.trend}, score: ${getAdjustedScore(r)})`).join('; ');
      const deadlineSummary = comp.deadlines.map(d => `${d.item}: ${d.status}, ${d.daysOut}d, owner: ${d.owner}`).join('; ');

      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 2048,
          system: AI_CONFIG.systemPrompt,
          messages: [{
            role: 'user',
            content: `Generate a comprehensive risk and compliance intelligence briefing for ${network.name} (${network.campusCount} campuses, Chicago).

RISK REGISTER: ${riskSummary}

COMPLIANCE DEADLINES: ${deadlineSummary}

AUDIT READINESS: ${comp.auditReadiness}% | OPEN POLICIES: ${comp.openPolicies}

Provide 4-5 paragraphs covering:
1. Overall risk posture assessment — what's the headline?
2. Critical compliance items requiring immediate attention
3. Risk trends and convergence patterns — what's getting worse?
4. Recommended board-level actions for the next 90 days
5. One thing the CEO should lose sleep over

Be direct, specific, and connect dots. No hedging.`,
          }],
        }),
      });
      const d = await res.json();
      setAiInsight(d.content?.find((b: any) => b.type === 'text')?.text || 'Analysis unavailable.');
    } catch {
      setAiInsight('Unable to generate analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '◉' },
    { id: 'heatmap' as const, label: 'Heat Map', icon: '▦' },
    { id: 'register' as const, label: 'Risk Register', icon: '▤' },
    { id: 'compliance' as const, label: 'Compliance', icon: '◇' },
  ];

  return (
    <div>
      <ModuleHeader
        title="Shield"
        subtitle="Enterprise Risk & Compliance Intelligence"
        accent={modColors.shield}
        freshness={{ lastUpdated: comp.lastUpdated, source: comp.source }}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'TOTAL RISKS', value: risks.length.toString(), sub: `${tier1.length} Tier 1`, color: modColors.shield },
          { label: 'AVG ADJUSTED SCORE', value: avgScore.toFixed(1), sub: avgScore > 12 ? 'Elevated' : 'Acceptable', color: avgScore > 12 ? statusColor.amber : statusColor.green },
          { label: 'TRENDING UP', value: increasing.length.toString(), sub: increasing.length > 0 ? 'Monitor closely' : 'Stable', color: increasing.length > 0 ? statusColor.red : statusColor.green },
          { label: 'AUDIT READINESS', value: `${comp.auditReadiness}%`, sub: comp.auditReadiness >= 90 ? 'Strong' : 'Needs work', color: comp.auditReadiness >= 90 ? statusColor.green : statusColor.amber },
          { label: 'OVERDUE ITEMS', value: overdue.length.toString(), sub: overdue.length > 0 ? 'Action required' : 'Clear', color: overdue.length > 0 ? statusColor.red : statusColor.green },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
            borderTop: `3px solid ${kpi.color}`, padding: '16px 18px', boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 6 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: 2, background: bg.card,
        borderRadius: `${radius.lg} ${radius.lg} 0 0`,
        border: `1px solid ${border.light}`, borderBottom: 'none', padding: '0 8px',
      }}>
        {(activeTab === 'detail' ? [...tabs, { id: 'detail' as const, label: 'Risk Detail', icon: '◈' }] : tabs).map(t => (
          <button
            key={t.id}
            onClick={() => { if (t.id !== 'detail') { setActiveTab(t.id); setSelectedRisk(null); } }}
            style={{
              padding: '14px 24px', border: 'none', cursor: t.id === 'detail' ? 'default' : 'pointer',
              fontSize: fontSize.sm,
              fontWeight: activeTab === t.id ? fontWeight.bold : fontWeight.medium,
              color: activeTab === t.id ? modColors.shield : textColor.muted,
              background: 'transparent',
              borderBottom: `2px solid ${activeTab === t.id ? modColors.shield : 'transparent'}`,
              transition: transition.fast,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: '14px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: bg.card, border: `1px solid ${border.light}`,
        borderRadius: `0 0 ${radius.lg} ${radius.lg}`,
        padding: 24, minHeight: 400,
      }}>
        {/* ─── DASHBOARD TAB ──────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div>
            {/* AI Intelligence */}
            <div style={{
              background: `${modColors.shield}04`, border: `1px solid ${modColors.shield}20`,
              borderRadius: radius.lg, padding: 20, marginBottom: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: modColors.shield, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Risk & Compliance Intelligence
                </div>
                <button
                  onClick={generateComplianceAI}
                  disabled={aiLoading}
                  style={{
                    padding: '6px 16px', borderRadius: radius.md,
                    background: aiLoading ? bg.subtle : `${modColors.shield}12`,
                    color: aiLoading ? textColor.muted : modColors.shield,
                    border: `1px solid ${aiLoading ? border.light : modColors.shield}40`,
                    fontSize: fontSize.xs, fontWeight: fontWeight.bold, cursor: aiLoading ? 'default' : 'pointer',
                  }}
                >
                  {aiLoading ? 'Analyzing...' : 'Generate Briefing'}
                </button>
              </div>
              {aiInsight ? (
                <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                  {aiInsight}
                </div>
              ) : (
                <div style={{ fontSize: fontSize.sm, color: textColor.muted }}>
                  Click "Generate Briefing" for an AI-powered risk and compliance intelligence analysis.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* By Lens */}
              <div>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Risks by Lens
                </div>
                {Object.entries(LENS_CONFIG).map(([lens, cfg]) => {
                  const count = risks.filter(r => r.lens === lens).length;
                  return (
                    <div key={lens} style={{
                      background: cfg.bg, borderRadius: radius.md, padding: '14px 18px',
                      marginBottom: 8, border: `1px solid ${cfg.border}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: cfg.color }}>{lens}</span>
                        <span style={{ fontSize: '22px', fontWeight: fontWeight.bold, color: cfg.color, fontFamily: font.mono }}>{count}</span>
                      </div>
                      <div style={{ fontSize: fontSize.xs, color: cfg.color, opacity: 0.75 }}>{cfg.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* By Category */}
              <div>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Risks by Category
                </div>
                {Object.entries(
                  risks.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc; }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: `1px solid ${border.light}`,
                  }}>
                    <span style={{ fontSize: fontSize.sm, color: textColor.primary }}>{cat}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: bg.subtle, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${(count / risks.length) * 100}%`, height: '100%', background: modColors.shield, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, fontFamily: font.mono, color: textColor.primary, minWidth: 20, textAlign: 'right' }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier 1 Risks */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tier 1 — Board Focus Risks
              </div>
              {tier1.map(r => {
                const adj = getAdjustedScore(r);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRisk(r)}
                    style={{
                      display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 90px 120px',
                      alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: radius.md,
                      cursor: 'pointer', background: bg.subtle, border: `1px solid ${border.light}`,
                      marginBottom: 6, transition: transition.fast,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${modColors.shield}40`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = border.light; }}
                  >
                    <ScoreBadge score={adj} />
                    <div>
                      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.primary }}>{r.name}</div>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>{r.category}</div>
                    </div>
                    <LensBadge lens={r.lens} />
                    <VelocityBadge velocity={r.velocity} />
                    <TrendIndicator trend={r.trend} />
                    <MitigationBar status={r.mitigationStatus} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── HEAT MAP TAB ───────────────────────────────────────── */}
        {activeTab === 'heatmap' && (
          <HeatMapView risks={risks} onSelectRisk={handleSelectRisk} />
        )}

        {/* ─── REGISTER TAB ──────────────────────────────────────── */}
        {activeTab === 'register' && (
          <div>
            {/* Tier filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Risks', count: risks.length },
                { key: 'Tier 1', label: 'Tier 1: Board', count: tier1.length, color: statusColor.red },
                { key: 'Tier 2', label: 'Tier 2: Exec', count: tier2.length, color: statusColor.amber },
                { key: 'Tier 3', label: 'Tier 3: WG', count: tier3.length, color: statusColor.blue },
              ].map(f => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
                  padding: '6px 14px', borderRadius: radius.full,
                  border: `1px solid ${filterStatus === f.key ? (f.color || modColors.shield) : border.light}`,
                  background: filterStatus === f.key ? `${f.color || modColors.shield}15` : 'transparent',
                  color: filterStatus === f.key ? (f.color || modColors.shield) : textColor.muted,
                  fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
                }}>
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Register header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 90px 90px 120px',
              gap: 12, padding: '8px 16px', marginBottom: 4,
            }}>
              {['Score', 'Risk', 'Lens', 'Tier', 'Velocity', 'Trend', 'Mitigation'].map(h => (
                <div key={h} style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
              ))}
            </div>

            {/* Risk rows */}
            {risks
              .filter(r => filterStatus === 'all' || r.tier.includes(filterStatus))
              .sort((a, b) => getAdjustedScore(b) - getAdjustedScore(a))
              .map(r => {
                const adj = getAdjustedScore(r);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRisk(r)}
                    style={{
                      display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 90px 90px 120px',
                      alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: radius.md,
                      cursor: 'pointer', border: `1px solid ${border.light}`, marginBottom: 4,
                      transition: transition.fast,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = bg.subtle; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <ScoreBadge score={adj} />
                    <div>
                      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.primary }}>{r.name}</div>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>{r.category} · {r.owner}</div>
                    </div>
                    <LensBadge lens={r.lens} />
                    <StatusBadge
                      label={r.tier.replace('Tier ', 'T').replace(' — ', ': ')}
                      variant={r.tier.includes('Tier 1') ? 'red' : r.tier.includes('Tier 2') ? 'amber' : 'blue'}
                      size="sm"
                    />
                    <VelocityBadge velocity={r.velocity} />
                    <TrendIndicator trend={r.trend} />
                    <MitigationBar status={r.mitigationStatus} />
                  </div>
                );
              })}
          </div>
        )}

        {/* ─── COMPLIANCE TAB ─────────────────────────────────────── */}
        {activeTab === 'compliance' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Audit Readiness Gauge */}
              <div style={{
                background: bg.subtle, borderRadius: radius.lg, padding: 24, textAlign: 'center',
              }}>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Audit Readiness
                </div>
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ margin: '0 auto' }}>
                  <circle cx="80" cy="80" r="60" fill="none" stroke={border.light} strokeWidth="12" />
                  <circle
                    cx="80" cy="80" r="60" fill="none"
                    stroke={comp.auditReadiness >= 90 ? statusColor.green : comp.auditReadiness >= 75 ? statusColor.amber : statusColor.red}
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - comp.auditReadiness / 100)}
                    strokeLinecap="round" transform="rotate(-90 80 80)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                  <text x="80" y="72" textAnchor="middle" style={{ fontSize: '28px', fontWeight: 700, fontFamily: font.mono, fill: comp.auditReadiness >= 90 ? statusColor.green : comp.auditReadiness >= 75 ? statusColor.amber : statusColor.red }}>
                    {comp.auditReadiness}%
                  </text>
                  <text x="80" y="95" textAnchor="middle" style={{ fontSize: '11px', fill: textColor.muted }}>
                    {comp.auditReadiness >= 90 ? 'STRONG' : comp.auditReadiness >= 75 ? 'ADEQUATE' : 'NEEDS WORK'}
                  </text>
                </svg>
                <div style={{ fontSize: fontSize.sm, color: textColor.muted, marginTop: 12 }}>
                  {comp.openPolicies} open policy items remaining
                </div>
              </div>

              {/* Deadline Summary */}
              <div>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Deadline Summary
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Overdue', count: overdue.length, color: statusColor.red },
                    { label: 'At Risk', count: atRisk.length, color: statusColor.amber },
                    { label: 'On Track', count: onTrack.length, color: statusColor.green },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: `${s.color}08`, borderRadius: radius.md, padding: 14,
                      borderTop: `3px solid ${s.color}`, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: s.color }}>{s.count}</div>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Next 90 Days
                </div>
                {[...comp.deadlines].sort((a, b) => a.daysOut - b.daysOut).slice(0, 6).map((d, i) => {
                  const color = d.status === 'overdue' ? statusColor.red : d.status === 'at-risk' ? statusColor.amber : statusColor.green;
                  return (
                    <div key={d.item} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                      borderBottom: i < 5 ? `1px solid ${border.light}` : 'none',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.primary }}>{d.item}</div>
                      <div style={{ fontSize: fontSize.xs, fontFamily: font.mono, color, fontWeight: fontWeight.semibold }}>
                        {d.daysOut < 0 ? `${Math.abs(d.daysOut)}d ago` : `${d.daysOut}d`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full Deadline List */}
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: textColor.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              All Compliance Items
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px',
              gap: 12, padding: '8px 16px', marginBottom: 4,
            }}>
              {['Compliance Item', 'Owner', 'Timeline', 'Status'].map(h => (
                <div key={h} style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
              ))}
            </div>
            {[...comp.deadlines].sort((a, b) => a.daysOut - b.daysOut).map(d => (
              <DeadlineRow key={d.item} d={d} />
            ))}
          </div>
        )}

        {/* ─── DETAIL TAB ─────────────────────────────────────────── */}
        {activeTab === 'detail' && selectedRisk && (
          <RiskDetail risk={selectedRisk} onBack={() => { setActiveTab('register'); setSelectedRisk(null); }} />
        )}
      </div>

      <div style={{
        textAlign: 'center', padding: '16px 0', fontSize: fontSize.xs, color: textColor.light,
        marginTop: 16,
      }}>
        {risks.length} risks · {comp.deadlines.length} compliance items · Shield Intelligence
      </div>
    </div>
  );
}
