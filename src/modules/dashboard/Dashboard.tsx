/**
 * Slate v3 — Dashboard
 * ═══════════════════════════════════════════════════
 * The morning intelligence briefing. The first thing a CEO or Principal sees.
 * Designed to answer: "What do I need to know RIGHT NOW?"
 *
 * CEO View: Network-wide pulse — enrollment, financials, safety, risks, deadlines.
 * Principal View: Campus-specific intelligence — their school, their students, their building.
 */

import React, { useState, useEffect } from 'react';
import { Card, KPICard, StatusBadge, DataFreshness, AIInsight, Section, EmptyState } from '../../components/Card';
import { bg, text, brand, border, status, font, fontSize, fontWeight, shadow, radius, transition, modules as moduleColors, chart } from '../../core/theme';
import { useDataStore, useEnrollment, useFinancials, useStaff, useRisks, useFundraising, useCompliance, useFacilities, useCivic, useRole, useNetwork } from '../../data/DataStore';
import { fmt, fmtFull, fmtPct, fmtDscr, fmtNum, fmtCompact, fmtDate, fmtRelative, fmtVariance, fmtDaysOut } from '../../core/formatters';
import { AI_CONFIG } from '../../core/constants';

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
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <div style={{
        height: 6,
        background: border.light,
        borderRadius: radius.full,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: isOver ? status.red : color,
          borderRadius: radius.full,
          transition: transition.smooth,
        }} />
      </div>
    </div>
  );
}

// ─── Risk Tier Badge ──────────────────────────────────────────────────────

function RiskScore({ likelihood, impact }: { likelihood: number; impact: number }) {
  const score = likelihood * impact;
  const color = score >= 20 ? status.red : score >= 12 ? status.amber : status.green;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 20,
      borderRadius: radius.sm,
      background: `${color}15`,
      border: `1px solid ${color}40`,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color,
    }}>
      {score}
    </span>
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

  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(true);

  // Generate morning briefing on mount
  useEffect(() => {
    generateBriefing();
  }, []);

  async function generateBriefing() {
    setAiLoading(true);
    try {
      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 1024,
          system: `${AI_CONFIG.systemPrompt}\n\nGenerate a concise morning intelligence briefing (3-4 paragraphs) for the CEO of ${network.name}. Focus on what demands attention TODAY. Be direct, specific, and connect data points across domains. Use the Slate voice: authoritative, warm, no fluff.`,
          messages: [{
            role: 'user',
            content: `Generate my morning briefing based on this data:
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
      setAiInsight('Morning briefing unavailable. Showing data summary below.');
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
      {/* Morning Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: fontSize['3xl'],
          fontWeight: fontWeight.bold,
          color: text.primary,
          fontFamily: font.serif,
          margin: 0,
        }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
        </h1>
        <p style={{
          fontSize: fontSize.md,
          color: text.muted,
          margin: '4px 0 0 0',
        }}>
          {network.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* AI Morning Briefing */}
      <div style={{ marginBottom: 28 }}>
        <AIInsight
          content={aiInsight}
          loading={aiLoading}
          label="Morning Intelligence Briefing"
        />
      </div>

      {/* Critical KPIs — The Big Four */}
      <Section title="Vital Signs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <KPICard
            label="Enrollment"
            value={fmtCompact(enrollment.networkTotal)}
            subValue={`of ${fmtCompact(enrollment.targetEnrollment)} target`}
            trend={{ value: `${enrollGap > 0 ? '-' : '+'}${Math.abs(enrollGap)} gap`, positive: enrollGap <= 0 }}
            icon="◈"
            accent={moduleColors.scholar}
            onClick={() => onNavigate('scholar')}
          />
          <KPICard
            label="YTD Surplus"
            value={fmt(financials.ytdSummary.surplus * 1_000_000)}
            subValue={`DSCR: ${fmtDscr(financials.ytdSummary.dscr)}`}
            trend={{ value: revVariance.text + ' rev', positive: revVariance.positive }}
            icon="▤"
            accent={moduleColors.ledger}
            onClick={() => onNavigate('ledger')}
          />
          <KPICard
            label="Days Cash"
            value={String(financials.ytdSummary.daysCash)}
            subValue={`Minimum: ${financials.covenants.daysCashMinimum}`}
            trend={{
              value: financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum ? 'Above covenant' : 'BELOW COVENANT',
              positive: financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum,
            }}
            icon="▤"
            accent={financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum ? moduleColors.ledger : status.red}
            onClick={() => onNavigate('ledger')}
          />
          <KPICard
            label="Tier 1 Risks"
            value={String(tier1Risks.length)}
            subValue={`of ${risks.register.length} total risks`}
            icon="◇"
            accent={tier1Risks.length > 3 ? status.red : moduleColors.shield}
            onClick={() => onNavigate('shield')}
          />
        </div>
      </Section>

      {/* Two-Column: Financial Health + Enrollment Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {/* Financial Health */}
        <Card accent={moduleColors.ledger} hover onClick={() => onNavigate('ledger')}>
          <div style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 16,
          }}>
            Financial Health · {financials.fiscalYear} YTD
          </div>
          <MiniBar actual={financials.ytdSummary.revActual} budget={financials.ytdSummary.revBudget} label="Revenue" color={moduleColors.ledger} />
          <MiniBar actual={financials.ytdSummary.expActual} budget={financials.ytdSummary.expBudget} label="Expenses" color={status.amber} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${border.light}`,
          }}>
            <div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>DSCR</div>
              <div style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                color: financials.ytdSummary.dscr >= financials.covenants.dscrMinimum ? status.green : status.red,
              }}>
                {fmtDscr(financials.ytdSummary.dscr)}
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>min: {fmtDscr(financials.covenants.dscrMinimum)}</div>
            </div>
            <div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>Current Ratio</div>
              <div style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                color: financials.ytdSummary.currentRatio >= financials.covenants.currentRatioMinimum ? status.green : status.red,
              }}>
                {financials.ytdSummary.currentRatio.toFixed(2)}x
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>min: {financials.covenants.currentRatioMinimum.toFixed(2)}x</div>
            </div>
            <div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>Net Assets</div>
              <div style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                color: financials.ytdSummary.netAssetRatio >= financials.covenants.netAssetMinimum ? status.green : status.red,
              }}>
                {fmtPct(financials.ytdSummary.netAssetRatio)}
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.light }}>min: {fmtPct(financials.covenants.netAssetMinimum)}</div>
            </div>
          </div>
        </Card>

        {/* Enrollment Trend + Campus Grid */}
        <Card accent={moduleColors.scholar} hover onClick={() => onNavigate('scholar')}>
          <div style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 12,
          }}>
            Enrollment · {enrollment.currentSY}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: text.primary }}>
                {fmtNum(enrollment.networkTotal)}
              </div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>
                {fmtPct(enrollPct)} of target
              </div>
            </div>
            <Sparkline data={historicalEnrollment} color={moduleColors.scholar} width={140} height={40} />
          </div>
          {/* Campus mini-grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
          }}>
            {enrollment.byCampus.slice(0, 9).map((c) => {
              const pct = c.capacity > 0 ? (c.enrolled / c.capacity) * 100 : 0;
              const color = pct >= 95 ? status.green : pct >= 85 ? status.amber : status.red;
              return (
                <div key={c.campusId} style={{
                  padding: '6px 8px',
                  background: bg.subtle,
                  borderRadius: radius.sm,
                  borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.short}
                  </div>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: text.primary }}>
                    {fmtNum(c.enrolled)}
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: text.light }}>
                    {fmtPct(pct)} cap
                  </div>
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
          <div style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 12,
          }}>
            Top Risks
          </div>
          {tier1Risks.slice(0, 4).map((r, i) => (
            <div key={r.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
              borderBottom: i < 3 ? `1px solid ${border.light}` : 'none',
            }}>
              <RiskScore likelihood={r.likelihood} impact={r.impact} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>
                  {r.name}
                </div>
                <div style={{ fontSize: fontSize.xs, color: text.light }}>
                  {r.owner} · {r.trend}
                </div>
              </div>
            </div>
          ))}
          {tier1Risks.length === 0 && (
            <div style={{ fontSize: fontSize.sm, color: text.light, fontStyle: 'italic' }}>
              No Tier 1 risks. Remarkable.
            </div>
          )}
        </Card>

        {/* Compliance Deadlines */}
        <Card accent={status.amber} hover onClick={() => onNavigate('shield')}>
          <div style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 12,
          }}>
            Upcoming Deadlines
          </div>
          {compliance.deadlines.slice(0, 5).map((d, i) => {
            const urgency = fmtDaysOut(d.daysOut);
            return (
              <div key={d.item} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < 4 ? `1px solid ${border.light}` : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>
                    {d.item}
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: text.light }}>
                    {d.owner}
                  </div>
                </div>
                <StatusBadge
                  label={urgency.text}
                  variant={d.status === 'overdue' ? 'red' : d.status === 'at-risk' ? 'amber' : 'green'}
                  size="sm"
                />
              </div>
            );
          })}
        </Card>

        {/* Staff & Fundraising */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card accent={moduleColors.signal}>
            <div style={{
              fontSize: fontSize.xs,
              fontWeight: fontWeight.semibold,
              color: text.muted,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 8,
            }}>
              Staff
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: text.primary }}>
                {fmtNum(staff.activeStaff)}
              </div>
              <div style={{ fontSize: fontSize.sm, color: staff.vacancies > 10 ? status.red : text.muted }}>
                {staff.vacancies} vacancies
              </div>
            </div>
            <div style={{
              height: 6,
              background: border.light,
              borderRadius: radius.full,
              marginTop: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(staff.activeStaff / staff.totalPositions) * 100}%`,
                background: moduleColors.signal,
                borderRadius: radius.full,
              }} />
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>
              {fmtPct(staff.licensureRate)} licensure rate
            </div>
          </Card>

          <Card accent={moduleColors.fund} hover onClick={() => onNavigate('fund')}>
            <div style={{
              fontSize: fontSize.xs,
              fontWeight: fontWeight.semibold,
              color: text.muted,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 8,
            }}>
              Fundraising
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: text.primary }}>
                {fmt(fundraising.closedYTD)}
              </div>
              <div style={{ fontSize: fontSize.sm, color: text.muted }}>
                of {fmt(fundraising.goal)}
              </div>
            </div>
            <div style={{
              height: 6,
              background: border.light,
              borderRadius: radius.full,
              marginTop: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((fundraising.closedYTD / fundraising.goal) * 100, 100)}%`,
                background: moduleColors.fund,
                borderRadius: radius.full,
              }} />
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.light, marginTop: 4 }}>
              {fundraising.pipeline.length} opportunities in pipeline
            </div>
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

  const campus = network.campuses.find(c => c.id === selectedCampusId);
  const campusEnrollment = enrollment.byCampus.find(c => c.campusId === selectedCampusId);
  const campusStaff = staff.byCampus.find(c => c.campusId === selectedCampusId);
  const campusWOs = facilities.workOrders.filter(w => w.campus === campus?.short);

  if (!campus || !campusEnrollment) {
    return <EmptyState icon="◈" title="Select a Campus" description="Choose a campus from the sidebar to view its dashboard." />;
  }

  const capacityPct = campusEnrollment.capacity > 0 ? (campusEnrollment.enrolled / campusEnrollment.capacity) * 100 : 0;

  return (
    <div>
      {/* Campus Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: fontSize['3xl'],
          fontWeight: fontWeight.bold,
          color: text.primary,
          fontFamily: font.serif,
          margin: 0,
        }}>
          {campus.name}
        </h1>
        <p style={{
          fontSize: fontSize.md,
          color: text.muted,
          margin: '4px 0 0 0',
        }}>
          {campus.communityArea} · {campus.addr}
        </p>
      </div>

      {/* Campus KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KPICard
          label="Enrolled"
          value={fmtNum(campusEnrollment.enrolled)}
          subValue={`${fmtPct(capacityPct)} of ${campusEnrollment.capacity} capacity`}
          accent={moduleColors.scholar}
        />
        <KPICard
          label="Attrition"
          value={fmtPct(campusEnrollment.attrition)}
          subValue="Current school year"
          accent={campusEnrollment.attrition > 10 ? status.red : status.green}
        />
        <KPICard
          label="Staff"
          value={String(campusStaff?.total || 0)}
          subValue={`${campusStaff?.vacancies || 0} vacancies`}
          accent={moduleColors.signal}
        />
        <KPICard
          label="Work Orders"
          value={String(campusWOs.length)}
          subValue={`${campusWOs.filter(w => w.priority === 'urgent').length} urgent`}
          accent={moduleColors.grounds}
        />
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
                <div style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: text.primary }}>
                  {fmtNum(g.value)}
                </div>
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
              <div key={wo.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < campusWOs.length - 1 ? `1px solid ${border.light}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>
                    {wo.description}
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: text.light }}>
                    Submitted {fmtDate(wo.dateSubmitted)} · {wo.assignedTo}
                  </div>
                </div>
                <StatusBadge
                  label={wo.priority}
                  variant={wo.priority === 'urgent' ? 'red' : wo.priority === 'high' ? 'amber' : 'gray'}
                />
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

  return role === 'ceo'
    ? <CEODashboard onNavigate={onNavigate} />
    : <PrincipalDashboard onNavigate={onNavigate} />;
}
