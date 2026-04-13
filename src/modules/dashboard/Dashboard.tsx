/**
 * Slate v3 — Dashboard
 * ═══════════════════════════════════════════════════
 * The morning intelligence briefing. The first thing a CEO or Principal sees.
 * Designed to answer: "What do I need to know RIGHT NOW?"
 *
 * v3.1 — Golden Thread: Emergency events surface as red banners.
 * AI briefing incorporates emergency context automatically.
 *
 * CEO View: Network-wide pulse — enrollment, financials, safety, risks, deadlines.
 * Principal View: Campus-specific intelligence — their school, their students, their building.
 */

import React, { useState, useEffect } from 'react';
import { Card, KPICard, StatusBadge, DataFreshness, AIInsight, Section, EmptyState } from '../../components/Card';
import { bg, text, brand, border, status, font, fontSize, fontWeight, shadow, radius, transition, modules as moduleColors, chart } from '../../core/theme';
import { useDataStore, useEnrollment, useFinancials, useStaff, useRisks, useFundraising, useCompliance, useFacilities, useCivic, useRole, useNetwork, useEmergencies } from '../../data/DataStore';
import { fmt, fmtFull, fmtPct, fmtDscr, fmtNum, fmtCompact, fmtDate, fmtRelative, fmtVariance, fmtDaysOut } from '../../core/formatters';
import { AI_CONFIG } from '../../core/constants';
import { useWatchSummary } from '../watch/v2/useWatchSummary';
import { THREAT_CONFIG } from '../watch/v2/types';

interface DashboardProps {
  onNavigate: (moduleId: string) => void;
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────

function Sparkline({ data, color, width = 100, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data.length) return null;
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
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────

function MiniBar({ actual, budget, label, color }: { actual: number; budget: number; label: string; color: string }) {
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 120) : 0;
  const isOver = actual > budget;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: fontSize.xs, color: text.muted }}>{label}</span>
        <span style={{ fontSize: fontSize.xs, color: isOver ? status.red : text.secondary, fontWeight: fontWeight.medium }}>
          {fmt(actual * 1_000_000)} / {fmt(budget * 1_000_000)}
        </span>
      </div>
      <div style={{ height: 6, background: border.light, borderRadius: radius.full, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: isOver ? status.red : color, borderRadius: radius.full, transition: transition.smooth }} />
      </div>
    </div>
  );
}

// ─── Risk Tier Badge ──────────────────────────────────────────────────────

function RiskScore({ likelihood, impact }: { likelihood: number; impact: number }) {
  const score = likelihood * impact;
  const color = score >= 20 ? status.red : score >= 12 ? status.amber : status.green;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 20, borderRadius: radius.sm, background: `${color}15`, border: `1px solid ${color}40`, fontSize: fontSize.xs, fontWeight: fontWeight.bold, color }}>
      {score}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GOLDEN THREAD — Emergency Alert Banner
// ═══════════════════════════════════════════════════════════════════════════

function EmergencyBanner({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { activeEvents } = useEmergencies();
  if (activeEvents.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {activeEvents.map(event => {
        const elapsed = Math.round((Date.now() - new Date(event.timestamp).getTime()) / 60000);
        const elapsedStr = elapsed < 60 ? `${elapsed}m ago` : elapsed < 1440 ? `${Math.round(elapsed / 60)}h ago` : `${Math.round(elapsed / 1440)}d ago`;
        return (
          <div key={event.id} style={{
            background: `linear-gradient(135deg, ${status.red}08 0%, ${status.red}04 100%)`,
            border: `1px solid ${status.red}40`,
            borderRadius: radius.lg,
            padding: '16px 20px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            cursor: 'pointer',
            transition: transition.fast,
          }} onClick={() => onNavigate('grounds')}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: `${status.red}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', flexShrink: 0,
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              ⚠
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: status.red }}>
                  ACTIVE EMERGENCY
                </span>
                <span style={{
                  padding: '1px 8px', borderRadius: radius.full, fontSize: '9px', fontWeight: fontWeight.bold,
                  background: event.severity === 'critical' ? status.red : status.amber,
                  color: '#fff', textTransform: 'uppercase',
                }}>{event.severity}</span>
                <span style={{ fontSize: fontSize.xs, color: text.light }}>{elapsedStr}</span>
              </div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary }}>{event.title}</div>
              <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
                Est. cost: {fmtCompact(event.estimatedCost)} · {event.occupancyImpact ? 'Occupancy affected' : 'Building operational'} · Reported by {event.reportedBy}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
              {[
                { label: 'Watch', done: event.watchAlertSent },
                { label: 'Briefing', done: event.briefingFlagged },
                { label: 'Ledger', done: event.ledgerImpactModeled },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.done ? status.green : border.medium }} />
                  <span style={{ fontSize: '9px', color: s.done ? status.green : text.light }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

// ─── CEO Dashboard ────────────────────────────────────────────────────────

function CEODashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  const enrollment = useEnrollment();
  const financials = useFinancials();
  const staff = useStaff();
  const risks = useRisks();
  const fundraising = useFundraising();
  const compliance = useCompliance();
  const facilities = useFacilities();
  const civic = useCivic();
  const network = useNetwork();
  const { activeEvents } = useEmergencies();
  const watch = useWatchSummary();

  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(true);

  // Generate morning briefing on mount
  useEffect(() => {
    generateBriefing();
  }, [activeEvents.length]);

  const timeOfDay = (() => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; })();

  async function generateBriefing() {
    setAiLoading(true);
    try {
      // Build emergency context for Golden Thread
      const emergencyContext = activeEvents.length > 0
        ? `\n\nACTIVE EMERGENCIES (LEAD WITH THIS):\n${activeEvents.map(e => `- ${e.title}: ${e.description} | Severity: ${e.severity} | Est. Cost: $${e.estimatedCost.toLocaleString()} | Occupancy Impact: ${e.occupancyImpact ? 'YES' : 'No'} | Reported: ${new Date(e.timestamp).toLocaleString()}`).join('\n')}`
        : '';

      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 1024,
          system: `${AI_CONFIG.systemPrompt}\n\nGenerate a concise ${timeOfDay} intelligence briefing (3-4 paragraphs) for the CEO of ${network.name}. ${activeEvents.length > 0 ? 'CRITICAL: There are active facility emergencies. Your briefing MUST lead with the emergency situation, its operational impact, and recommended actions. Then cover other priorities.' : 'Focus on what demands attention TODAY.'} Begin with 'Good ${timeOfDay}.' Be direct, specific, and connect data points across domains. Use the Slate voice: authoritative, warm, no fluff.`,
          messages: [{
            role: 'user',
            content: `Generate my ${timeOfDay} briefing based on this data:${emergencyContext}
ENROLLMENT: ${fmtNum(enrollment.networkTotal)} students (target: ${fmtNum(enrollment.targetEnrollment)}, gap: ${fmtNum(enrollment.targetEnrollment - enrollment.networkTotal)})
FINANCIALS: Revenue ${fmt(financials.ytdSummary.revActual * 1_000_000)} vs budget ${fmt(financials.ytdSummary.revBudget * 1_000_000)} | Expenses ${fmt(financials.ytdSummary.expActual * 1_000_000)} vs budget ${fmt(financials.ytdSummary.expBudget * 1_000_000)} | DSCR: ${fmtDscr(financials.ytdSummary.dscr)} | Days Cash: ${financials.ytdSummary.daysCash}
STAFF: ${staff.vacancies} vacancies out of ${staff.totalPositions} positions
RISKS: ${risks.register.filter(r => r.tier.includes('Tier 1')).length} Tier 1 risks: ${risks.register.filter(r => r.tier.includes('Tier 1')).map(r => r.name).join(', ')}
FUNDRAISING: ${fmtFull(fundraising.closedYTD)} closed of ${fmtFull(fundraising.goal)} goal
COMPLIANCE: ${compliance.deadlines.filter(d => d.status === 'at-risk').length} at-risk deadlines
FACILITIES: ${facilities.workOrders.filter(w => w.priority === 'urgent').length} urgent work orders`,
          }],
        }),
      });
      const data = await response.json();
      setAiInsight(data?.content?.[0]?.text || 'Unable to generate briefing. Check your connection.');
    } catch {
      // Fallback: Generate a smart static briefing
      const emergencyFallback = activeEvents.length > 0
        ? `URGENT: ${activeEvents.length} active facility emergency${activeEvents.length > 1 ? 'ies' : 'y'} requiring immediate attention. ${activeEvents[0].title} — estimated cost ${fmtCompact(activeEvents[0].estimatedCost)}. ${activeEvents[0].occupancyImpact ? 'Building occupancy is affected; student safety protocols should be reviewed.' : 'Building remains operational but monitoring is active.'} This has been flagged across Watch, Shield, and Ledger for cross-functional response.\n\n`
        : '';
      setAiInsight(`${emergencyFallback}${network.name} serves ${fmtNum(enrollment.networkTotal)} students across ${network.campuses.length} campuses. YTD financial position shows ${financials.ytdSummary.surplus >= 0 ? 'a surplus' : 'a deficit'} of ${fmt(Math.abs(financials.ytdSummary.surplus) * 1_000_000)} with DSCR at ${fmtDscr(financials.ytdSummary.dscr)}. ${staff.vacancies > 5 ? `Staffing requires attention with ${staff.vacancies} open positions.` : 'Staffing levels are stable.'} ${risks.register.filter(r => r.tier.includes('Tier 1')).length} Tier 1 risks are being actively monitored. Fundraising has reached ${fmtPct((fundraising.closedYTD / fundraising.goal) * 100)} of the annual goal.`);
    } finally {
      setAiLoading(false);
    }
  }

  const enrollGap = enrollment.targetEnrollment - enrollment.networkTotal;
  const enrollPct = enrollment.targetEnrollment > 0 ? (enrollment.networkTotal / enrollment.targetEnrollment) * 100 : 0;
  const revVariance = fmtVariance((financials.ytdSummary.revActual - financials.ytdSummary.revBudget) * 1_000_000);
  const expVariance = fmtVariance((financials.ytdSummary.expBudget - financials.ytdSummary.expActual) * 1_000_000);
  const tier1Risks = risks.register.filter(r => r.tier.includes('Tier 1'));
  const atRiskDeadlines = compliance.deadlines.filter(d => d.status === 'at-risk');
  const urgentWOs = facilities.workOrders.filter(w => w.priority === 'urgent');
  const historicalEnrollment = enrollment.historical.filter(h => h.isActual).map(h => h.totalEnrolled);

  return (
    <div>
      {/* Time-Aware Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: text.primary, fontFamily: font.serif, margin: 0 }}>
          Good {(() => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; })()}
        </h1>
        <p style={{ fontSize: fontSize.md, color: text.muted, margin: '4px 0 0 0' }}>
          {network.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* GOLDEN THREAD: Emergency Banner */}
      <EmergencyBanner onNavigate={onNavigate} />

      {/* AI Morning Briefing */}
      <div style={{ marginBottom: 28 }}>
        <AIInsight content={aiInsight} loading={aiLoading} label={`${(() => { const h = new Date().getHours(); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; })()} Intelligence Briefing`} />
      </div>

      {/* Watch Safety Intelligence Card */}
      {!watch.isLoading && (
        <div style={{ marginBottom: 24 }}>
          <Card accent={moduleColors.watch} hover onClick={() => onNavigate('watch')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: THREAT_CONFIG[watch.overallThreat].color,
                  boxShadow: watch.overallThreat !== 'GREEN' ? `0 0 8px ${THREAT_CONFIG[watch.overallThreat].color}60` : 'none',
                  animation: watch.overallThreat === 'RED' ? 'pulse 2s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Safety Intelligence · Live
                </span>
              </div>
              <StatusBadge
                label={THREAT_CONFIG[watch.overallThreat].label.toUpperCase()}
                variant={watch.overallThreat === 'RED' ? 'red' : watch.overallThreat === 'GREEN' ? 'green' : 'amber'}
                size="sm"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>Active Incidents</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: watch.totalActiveIncidents > 0 ? status.amber : text.primary }}>
                  {watch.totalActiveIncidents}
                </div>
              </div>
              <div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>Campuses Elevated</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: watch.campusesElevated > 0 ? status.amber : status.green }}>
                  {watch.campusesElevated} / 10
                </div>
              </div>
              <div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>Corroborated</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: watch.corroboratedCount > 0 ? status.amber : text.primary }}>
                  {watch.corroboratedCount + watch.confirmedCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>Nearest Threat</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: watch.nearestIncidentDistance !== null && watch.nearestIncidentDistance <= 0.25 ? status.red : watch.nearestIncidentDistance !== null && watch.nearestIncidentDistance <= 0.5 ? status.amber : text.primary }}>
                  {watch.nearestIncidentDistance !== null ? `${watch.nearestIncidentDistance.toFixed(2)} mi` : '—'}
                </div>
                {watch.nearestIncidentCampus && (
                  <div style={{ fontSize: fontSize.xs, color: text.light }}>{watch.nearestIncidentCampus}</div>
                )}
              </div>
            </div>
            {/* Campus threat dots */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${border.light}` }}>
              {watch.campusThreats.map(ct => {
                const cfg = THREAT_CONFIG[ct.threatLevel];
                return (
                  <div key={ct.campusId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '9px', color: text.light }}>{ct.campusShort}</span>
                  </div>
                );
              })}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: fontSize.xs, color: text.light }}>
                {watch.lastUpdated ? watch.lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Critical KPIs — The Big Four */}
      <Section title="Vital Signs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <KPICard label="Enrollment" value={fmtCompact(enrollment.networkTotal)}
            subValue={`of ${fmtCompact(enrollment.targetEnrollment)} target`}
            trend={{ value: `${enrollGap > 0 ? '-' : '+'}${Math.abs(enrollGap)} gap`, positive: enrollGap <= 0 }}
            icon="◈" accent={moduleColors.scholar} onClick={() => onNavigate('scholar')} />
          <KPICard label="YTD Surplus" value={fmt(financials.ytdSummary.surplus * 1_000_000)}
            subValue={`DSCR: ${fmtDscr(financials.ytdSummary.dscr)}`}
            trend={{ value: revVariance.text + ' rev', positive: revVariance.positive }}
            icon="▤" accent={moduleColors.ledger} onClick={() => onNavigate('ledger')} />
          <KPICard label="Days Cash" value={String(financials.ytdSummary.daysCash)}
            subValue={`Minimum: ${financials.covenants.daysCashMinimum}`}
            trend={{ value: financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum ? 'Above covenant' : 'BELOW COVENANT', positive: financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum }}
            icon="▤" accent={financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum ? moduleColors.ledger : status.red}
            onClick={() => onNavigate('ledger')} />
          <KPICard label="Tier 1 Risks" value={String(tier1Risks.length)}
            subValue={`of ${risks.register.length} total risks`}
            icon="◇" accent={tier1Risks.length > 3 ? status.red : moduleColors.shield}
            onClick={() => onNavigate('shield')} />
        </div>
      </Section>

      {/* Two-Column: Financial Health + Enrollment Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {/* Financial Health */}
        <Card accent={moduleColors.ledger} hover onClick={() => onNavigate('ledger')}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Financial Health · {financials.fiscalYear} YTD
          </div>
          <MiniBar actual={financials.ytdSummary.revActual} budget={financials.ytdSummary.revBudget} label="Revenue" color={moduleColors.ledger} />
          <MiniBar actual={financials.ytdSummary.expActual} budget={financials.ytdSummary.expBudget} label="Expenses" color={status.amber} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border.light}` }}>
            <div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>DSCR</div>
              <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: financials.ytdSummary.dscr >= financials.covenants.dscrMinimum ? status.green : status.red }}>{fmtDscr(financials.ytdSummary.dscr)}</div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>min: {fmtDscr(financials.covenants.dscrMinimum)}</div>
            </div>
            <div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>Current Ratio</div>
              <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: financials.ytdSummary.currentRatio >= financials.covenants.currentRatioMinimum ? status.green : status.red }}>{financials.ytdSummary.currentRatio.toFixed(2)}x</div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>min: {financials.covenants.currentRatioMinimum.toFixed(2)}x</div>
            </div>
            <div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>Net Assets</div>
              <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: financials.ytdSummary.netAssetRatio >= financials.covenants.netAssetMinimum ? status.green : status.red }}>{fmtPct(financials.ytdSummary.netAssetRatio)}</div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>min: {fmtPct(financials.covenants.netAssetMinimum)}</div>
            </div>
          </div>
        </Card>

        {/* Enrollment Trend + Campus Grid */}
        <Card accent={moduleColors.scholar} hover onClick={() => onNavigate('scholar')}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Enrollment · {enrollment.currentSY}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: text.primary }}>{fmtNum(enrollment.networkTotal)}</div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>{fmtPct(enrollPct)} of target</div>
            </div>
            <Sparkline data={historicalEnrollment} color={moduleColors.scholar} width={140} height={40} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {enrollment.byCampus.slice(0, 9).map((c) => {
              const pct = c.capacity > 0 ? (c.enrolled / c.capacity) * 100 : 0;
              const color = pct >= 95 ? status.green : pct >= 85 ? status.amber : status.red;
              return (
                <div key={c.campusId} style={{ padding: '6px 8px', background: bg.subtle, borderRadius: radius.sm, borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.short}</div>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: text.primary }}>{fmtNum(c.enrolled)}</div>
                  <div style={{ fontSize: fontSize.xs, color: text.light }}>{fmtPct(pct)} cap</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Three-Column: Risks, Deadlines, Staff */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
        {/* Top Risks */}
        <Card accent={moduleColors.shield} hover onClick={() => onNavigate('shield')}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Top Risks</div>
          {tier1Risks.slice(0, 4).map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 3 ? `1px solid ${border.light}` : 'none' }}>
              <RiskScore likelihood={r.likelihood} impact={r.impact} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>{r.name}</div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>{r.owner} · {r.trend}</div>
              </div>
            </div>
          ))}
          {tier1Risks.length === 0 && (
            <div style={{ fontSize: fontSize.sm, color: text.light, fontStyle: 'italic' }}>No Tier 1 risks. Remarkable.</div>
          )}
        </Card>

        {/* Compliance Deadlines */}
        <Card accent={status.amber} hover onClick={() => onNavigate('shield')}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Upcoming Deadlines</div>
          {compliance.deadlines.slice(0, 5).map((d, i) => {
            const urgency = fmtDaysOut(d.daysOut);
            return (
              <div key={d.item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? `1px solid ${border.light}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>{d.item}</div>
                  <div style={{ fontSize: fontSize.xs, color: text.light }}>{d.owner}</div>
                </div>
                <StatusBadge label={urgency.text} variant={d.status === 'overdue' ? 'red' : d.status === 'at-risk' ? 'amber' : 'green'} size="sm" />
              </div>
            );
          })}
        </Card>

        {/* Staff & Fundraising */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card accent={moduleColors.signal}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Staff</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: text.primary }}>{fmtNum(staff.activeStaff)}</div>
              <div style={{ fontSize: fontSize.sm, color: staff.vacancies > 10 ? status.red : text.muted }}>{staff.vacancies} vacancies</div>
            </div>
            <div style={{ height: 6, background: border.light, borderRadius: radius.full, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(staff.activeStaff / staff.totalPositions) * 100}%`, background: moduleColors.signal, borderRadius: radius.full }} />
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>{fmtPct(staff.licensureRate)} licensure rate</div>
          </Card>

          <Card accent={moduleColors.fund} hover onClick={() => onNavigate('fund')}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Fundraising</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: text.primary }}>{fmt(fundraising.closedYTD)}</div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>of {fmt(fundraising.goal)}</div>
            </div>
            <div style={{ height: 6, background: border.light, borderRadius: radius.full, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((fundraising.closedYTD / fundraising.goal) * 100, 100)}%`, background: moduleColors.fund, borderRadius: radius.full }} />
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>{fundraising.pipeline.length} opportunities in pipeline</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Principal Dashboard ──────────────────────────────────────────────────

function PrincipalDashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  const enrollment = useEnrollment();
  const financials = useFinancials();
  const staff = useStaff();
  const facilities = useFacilities();
  const network = useNetwork();
  const { selectedCampusId } = useRole();
  const { activeEvents } = useEmergencies();

  const campus = network.campuses.find(c => c.id === selectedCampusId);
  const campusEnrollment = enrollment.byCampus.find(c => c.campusId === selectedCampusId);
  const campusStaff = staff.byCampus.find(c => c.campusId === selectedCampusId);
  const campusWOs = facilities.workOrders.filter(w => w.campus === campus?.short);
  const campusEmergencies = activeEvents.filter(e => e.campusId === selectedCampusId);
  const watch = useWatchSummary();
  const campusThreat = watch.campusThreats.find(ct => ct.campusId === selectedCampusId);

  if (!campus || !campusEnrollment) {
    return <EmptyState icon="◈" title="Select a Campus" description="Choose a campus from the sidebar to view its dashboard." />;
  }

  const capacityPct = campusEnrollment.capacity > 0 ? (campusEnrollment.enrolled / campusEnrollment.capacity) * 100 : 0;

  return (
    <div>
      {/* Campus Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: text.primary, fontFamily: font.serif, margin: 0 }}>{campus.name}</h1>
        <p style={{ fontSize: fontSize.md, color: text.muted, margin: '4px 0 0 0' }}>{campus.communityArea} · {campus.addr}</p>
      </div>

      {/* GOLDEN THREAD: Campus-specific emergency banner */}
      {campusEmergencies.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {campusEmergencies.map(event => (
            <div key={event.id} style={{
              background: `linear-gradient(135deg, ${status.red}08 0%, ${status.red}04 100%)`,
              border: `1px solid ${status.red}40`, borderRadius: radius.lg, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
            }} onClick={() => onNavigate('grounds')}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${status.red}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', animation: 'pulse 2s ease-in-out infinite' }}>⚠</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: status.red }}>CAMPUS EMERGENCY ACTIVE</div>
                <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary }}>{event.title}</div>
                <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>{event.description}</div>
              </div>
            </div>
          ))}
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      )}

      {/* Watch Campus Safety Card */}
      {!watch.isLoading && campusThreat && (
        <div style={{ marginBottom: 20 }}>
          <Card accent={moduleColors.watch} hover onClick={() => onNavigate('watch')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: THREAT_CONFIG[campusThreat.threatLevel].color,
                  boxShadow: campusThreat.threatLevel !== 'GREEN' ? `0 0 8px ${THREAT_CONFIG[campusThreat.threatLevel].color}60` : 'none',
                }} />
                <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Campus Safety · Live
                </span>
              </div>
              <StatusBadge
                label={THREAT_CONFIG[campusThreat.threatLevel].label.toUpperCase()}
                variant={campusThreat.threatLevel === 'RED' ? 'red' : campusThreat.threatLevel === 'GREEN' ? 'green' : 'amber'}
                size="sm"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>Incidents (1 mi)</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: campusThreat.incidentCount > 0 ? status.amber : text.primary }}>
                  {campusThreat.incidentCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>Nearest Threat</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: campusThreat.nearestDistance !== null && campusThreat.nearestDistance <= 0.25 ? status.red : campusThreat.nearestDistance !== null && campusThreat.nearestDistance <= 0.5 ? status.amber : text.primary }}>
                  {campusThreat.nearestDistance !== null ? `${campusThreat.nearestDistance.toFixed(2)} mi` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>Network Status</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: THREAT_CONFIG[watch.overallThreat].color }}>
                  {THREAT_CONFIG[watch.overallThreat].label}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Campus KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KPICard label="Enrolled" value={fmtNum(campusEnrollment.enrolled)} subValue={`${fmtPct(capacityPct)} of ${campusEnrollment.capacity} capacity`} accent={moduleColors.scholar} />
        <KPICard label="Attrition" value={fmtPct(campusEnrollment.attrition)} subValue="Current school year" accent={campusEnrollment.attrition > 10 ? status.red : status.green} />
        <KPICard label="Staff" value={String(campusStaff?.total || 0)} subValue={`${campusStaff?.vacancies || 0} vacancies`} accent={moduleColors.signal} />
        <KPICard label="Work Orders" value={String(campusWOs.length)} subValue={`${campusWOs.filter(w => w.priority === 'urgent').length} urgent`} accent={moduleColors.grounds} />
      </div>

      {/* Grade-Level Enrollment */}
      <Section title="Grade-Level Enrollment">
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Grade 9', value: campusEnrollment.grade9 },
              { label: 'Grade 10', value: campusEnrollment.grade10 },
              { label: 'Grade 11', value: campusEnrollment.grade11 },
              { label: 'Grade 12', value: campusEnrollment.grade12 },
            ].map((g) => (
              <div key={g.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: text.muted, marginBottom: 4 }}>{g.label}</div>
                <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: text.primary }}>{fmtNum(g.value)}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Campus Work Orders */}
      <Section title="Active Work Orders">
        {campusWOs.length > 0 ? (
          <Card>
            {campusWOs.slice(0, 5).map((wo, i) => (
              <div key={wo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < campusWOs.length - 1 ? `1px solid ${border.light}` : 'none' }}>
                <div>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>{wo.description}</div>
                  <div style={{ fontSize: fontSize.xs, color: text.light }}>Submitted {fmtDate(wo.dateSubmitted)} · {wo.assignedTo}</div>
                </div>
                <StatusBadge label={wo.priority} variant={wo.priority === 'urgent' ? 'red' : wo.priority === 'high' ? 'amber' : 'gray'} />
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState icon="▣" title="No Active Work Orders" description="All facilities issues are resolved for this campus." />
        )}
      </Section>
    </div>
  );
}

// ─── Main Dashboard Router ────────────────────────────────────────────────

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { role } = useRole();
  return role === 'ceo' ? <CEODashboard onNavigate={onNavigate} /> : <PrincipalDashboard onNavigate={onNavigate} />;
}
