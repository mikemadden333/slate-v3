/**
 * Slate v3 — Briefing
 * ═══════════════════════════════════════════════════
 * AI Morning Intelligence Briefing.
 * The first thing a CEO reads every morning.
 * Synthesizes Watch + Scholar + Ledger + Shield + Fund + Grounds + Civic
 * into a single, narrative-driven executive intelligence document.
 *
 * This is the "24/7 think tank" made real.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  useNetwork, useEnrollment, useFinancials, useStaff, useRisks,
  useFundraising, useCompliance, useFacilities, useCivic, useRole, useEmergencies,
} from '../../data/DataStore';
import { Card, ModuleHeader, StatusBadge } from '../../components/Card';
import { fmt, fmtNum, fmtPct, fmtFull } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';

// ─── Section Component ───────────────────────────────────────────────────

function BriefSection({
  icon, title, accent, children, priority,
}: {
  icon: string; title: string; accent: string; children: React.ReactNode;
  priority?: 'critical' | 'elevated' | 'normal';
}) {
  const priorityBorder = priority === 'critical' ? statusColor.red
    : priority === 'elevated' ? statusColor.amber : 'transparent';

  return (
    <div style={{
      background: bg.card,
      borderRadius: radius.lg,
      border: `1px solid ${border.light}`,
      borderLeft: priority ? `4px solid ${priorityBorder}` : `1px solid ${border.light}`,
      padding: 24,
      marginBottom: 20,
      boxShadow: shadow.sm,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: fontSize.lg }}>{icon}</span>
        <span style={{
          fontSize: fontSize.sm,
          fontWeight: fontWeight.bold,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          fontFamily: font.sans,
        }}>
          {title}
        </span>
        {priority === 'critical' && <StatusBadge label="ACTION REQUIRED" variant="red" size="sm" />}
        {priority === 'elevated' && <StatusBadge label="MONITOR" variant="amber" size="sm" />}
      </div>
      <div style={{
        fontSize: fontSize.base,
        lineHeight: 1.7,
        color: textColor.primary,
        fontFamily: font.sans,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Metric Inline ───────────────────────────────────────────────────────

function M({ v, c }: { v: string; c?: string }) {
  return (
    <span style={{
      fontFamily: font.mono,
      fontWeight: fontWeight.bold,
      color: c || textColor.primary,
      background: `${c || brand.navy}08`,
      padding: '1px 5px',
      borderRadius: 3,
    }}>
      {v}
    </span>
  );
}

// ─── Timestamp ───────────────────────────────────────────────────────────

function BriefTimestamp() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div style={{
      textAlign: 'center',
      padding: '24px 0 32px',
    }}>
      <div style={{
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: textColor.muted,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        Executive Intelligence Briefing
      </div>
      <div style={{
        fontSize: fontSize['2xl'],
        fontWeight: fontWeight.bold,
        fontFamily: font.serif,
        color: textColor.primary,
      }}>
        {day}
      </div>
      <div style={{
        fontSize: fontSize.sm,
        color: textColor.muted,
        marginTop: 4,
      }}>
        Generated at {time} · All data as of latest upload
      </div>
    </div>
  );
}

// ─── Executive Summary ───────────────────────────────────────────────────

function ExecutiveSummary() {
  const net = useNetwork();
  const enr = useEnrollment();
  const fin = useFinancials();
  const risks = useRisks();
  const staff = useStaff();
  const fund = useFundraising();

  const enrollGap = enr.targetEnrollment - enr.networkTotal;
  const tier1Risks = risks.register.filter(r => r.tier.includes('Tier 1'));
  const ytd = fin.ytdSummary;
  const surplusStatus = ytd.surplus >= 0 ? 'surplus' : 'deficit';

  return (
    <BriefSection icon="◈" title="Executive Summary" accent={brand.navy}>
      <p style={{ margin: '0 0 12px' }}>
        Good morning. Here is your intelligence briefing for <strong>{net.name}</strong>, a{' '}
        <M v={`${net.campusCount}-campus`} /> charter network serving{' '}
        <M v={fmtNum(enr.networkTotal)} /> students in {net.city}.
      </p>
      <p style={{ margin: '0 0 12px' }}>
        <strong>Financial Position:</strong> Year-to-date {surplusStatus} of{' '}
        <M v={fmt(Math.abs(ytd.surplus))} c={ytd.surplus >= 0 ? statusColor.green : statusColor.red} />.
        Revenue is tracking at <M v={fmtPct(ytd.revActual / ytd.revBudget * 100)} /> of budget.
        DSCR at <M v={ytd.dscr.toFixed(2)} c={ytd.dscr >= fin.covenants.dscrMinimum ? statusColor.green : statusColor.red} />{' '}
        (covenant minimum: {fin.covenants.dscrMinimum.toFixed(2)}). Days cash:{' '}
        <M v={ytd.daysCash.toString()} c={ytd.daysCash >= fin.covenants.daysCashMinimum ? statusColor.green : statusColor.amber} />.
      </p>
      <p style={{ margin: '0 0 12px' }}>
        <strong>Enrollment:</strong>{' '}
        {enrollGap > 0
          ? <><M v={enrollGap.toString()} c={statusColor.red} /> seats below target, representing <M v={fmt(enrollGap * net.revenuePerPupil)} c={statusColor.red} /> in unrealized revenue.</>
          : <>Meeting or exceeding the target of <M v={fmtNum(enr.targetEnrollment)} c={statusColor.green} />.</>
        }
      </p>
      <p style={{ margin: '0 0 12px' }}>
        <strong>Staffing:</strong> <M v={fmtNum(staff.activeStaff)} /> active staff across the network with{' '}
        <M v={staff.vacancies.toString()} c={staff.vacancies > 10 ? statusColor.amber : statusColor.green} /> open vacancies.
        Licensure rate: <M v={fmtPct(staff.licensureRate)} />.
      </p>
      <p style={{ margin: 0 }}>
        <strong>Risk Register:</strong> <M v={tier1Risks.length.toString()} c={tier1Risks.length > 0 ? statusColor.red : statusColor.green} />{' '}
        Tier 1 (Board Focus) risks active. Fundraising pipeline at{' '}
        <M v={fmt(fund.closedYTD)} /> closed of <M v={fmt(fund.goal)} /> goal ({fmtPct(fund.closedYTD / fund.goal * 100)}).
      </p>
    </BriefSection>
  );
}

// ─── Financial Intelligence ──────────────────────────────────────────────

function FinancialBrief() {
  const fin = useFinancials();
  const ytd = fin.ytdSummary;
  const cov = fin.covenants;

  const revPct = (ytd.revActual / ytd.revBudget * 100);
  const expPct = (ytd.expActual / ytd.expBudget * 100);
  const dscrOk = ytd.dscr >= cov.dscrMinimum;
  const cashOk = ytd.daysCash >= cov.daysCashMinimum;
  const ratioOk = ytd.currentRatio >= cov.currentRatioMinimum;

  const priority = (!dscrOk || !cashOk) ? 'critical' : (!ratioOk ? 'elevated' : 'normal');

  return (
    <BriefSection icon="◧" title="Financial Intelligence" accent={modColors.ledger} priority={priority}>
      <p style={{ margin: '0 0 12px' }}>
        Revenue is at <M v={fmt(ytd.revActual)} /> against a budget of <M v={fmt(ytd.revBudget)} /> ({fmtPct(revPct)} collection rate).
        Expenses are at <M v={fmt(ytd.expActual)} /> against <M v={fmt(ytd.expBudget)} /> ({fmtPct(expPct)} burn rate).
        {expPct > revPct
          ? <> <strong style={{ color: statusColor.amber }}>Expenses are outpacing revenue collection — monitor closely.</strong></>
          : <> Revenue collection is outpacing expenses — healthy trajectory.</>
        }
      </p>

      {/* Covenant Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        margin: '16px 0',
        padding: 16,
        background: bg.subtle,
        borderRadius: radius.md,
      }}>
        {[
          { label: 'DSCR', value: ytd.dscr.toFixed(2), min: cov.dscrMinimum.toFixed(2), ok: dscrOk },
          { label: 'Days Cash', value: ytd.daysCash.toString(), min: cov.daysCashMinimum.toString(), ok: cashOk },
          { label: 'Current Ratio', value: ytd.currentRatio.toFixed(2), min: cov.currentRatioMinimum.toFixed(2), ok: ratioOk },
          { label: 'Net Asset Ratio', value: fmtPct(ytd.netAssetRatio), min: fmtPct(cov.netAssetMinimum), ok: ytd.netAssetRatio >= cov.netAssetMinimum },
        ].map(c => (
          <div key={c.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 4 }}>{c.label}</div>
            <div style={{
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold,
              fontFamily: font.mono,
              color: c.ok ? statusColor.green : statusColor.red,
            }}>
              {c.value}
            </div>
            <div style={{ fontSize: fontSize.xs, color: textColor.light }}>Min: {c.min}</div>
          </div>
        ))}
      </div>

      <p style={{ margin: 0 }}>
        {!dscrOk && <><strong style={{ color: statusColor.red }}>ALERT: DSCR is below the covenant minimum of {cov.dscrMinimum.toFixed(2)}. Immediate action required to protect bond compliance.</strong> </>}
        {!cashOk && <><strong style={{ color: statusColor.red }}>ALERT: Days cash is below the minimum of {cov.daysCashMinimum}. Cash position needs urgent attention.</strong> </>}
        {dscrOk && cashOk && ratioOk && <>All covenant metrics are within compliance. Financial position is stable.</>}
      </p>
    </BriefSection>
  );
}

// ─── Enrollment Intelligence ─────────────────────────────────────────────

function EnrollmentBrief() {
  const enr = useEnrollment();
  const net = useNetwork();

  const enrollGap = enr.targetEnrollment - enr.networkTotal;
  const avgAttrition = enr.byCampus.reduce((s, c) => s + c.attrition, 0) / enr.byCampus.length;
  const highAttrition = [...enr.byCampus].sort((a, b) => b.attrition - a.attrition).slice(0, 3);
  const lowUtilization = enr.byCampus.filter(c => (c.enrolled / c.capacity) < 0.85);

  const priority = enrollGap > 200 ? 'critical' : enrollGap > 0 ? 'elevated' : 'normal';

  return (
    <BriefSection icon="◉" title="Enrollment Intelligence" accent={modColors.scholar} priority={priority}>
      <p style={{ margin: '0 0 12px' }}>
        Network enrollment stands at <M v={fmtNum(enr.networkTotal)} /> against a target of{' '}
        <M v={fmtNum(enr.targetEnrollment)} />.
        {enrollGap > 0
          ? <> The gap of <M v={enrollGap.toString()} c={statusColor.red} /> seats represents{' '}
            <M v={fmt(enrollGap * net.revenuePerPupil)} c={statusColor.red} /> in unrealized per-pupil revenue.</>
          : <> Target has been met or exceeded.</>
        }
      </p>
      <p style={{ margin: '0 0 12px' }}>
        Network attrition averages <M v={fmtPct(avgAttrition)} c={avgAttrition > 12 ? statusColor.amber : statusColor.green} />.
        The three campuses with the highest attrition are:{' '}
        {highAttrition.map((c, i) => (
          <span key={c.campusId}>
            {i > 0 && ', '}
            <strong>{c.short}</strong> (<M v={fmtPct(c.attrition)} c={c.attrition > 12 ? statusColor.red : statusColor.amber} />)
          </span>
        ))}.
      </p>
      {lowUtilization.length > 0 && (
        <p style={{ margin: 0 }}>
          <strong>{lowUtilization.length} campus{lowUtilization.length > 1 ? 'es' : ''}</strong> below 85% capacity utilization:{' '}
          {lowUtilization.map((c, i) => (
            <span key={c.campusId}>
              {i > 0 && ', '}
              {c.short} ({fmtPct(c.enrolled / c.capacity * 100)})
            </span>
          ))}.
          {' '}These represent the highest-leverage enrollment growth opportunities.
        </p>
      )}
    </BriefSection>
  );
}

// ─── Risk Intelligence ───────────────────────────────────────────────────

function RiskBrief() {
  const risks = useRisks();
  const tier1 = risks.register.filter(r => r.tier.includes('Tier 1'));
  const tier2 = risks.register.filter(r => r.tier.includes('Tier 2'));
  const increasing = risks.register.filter(r => r.trend.includes('Increasing'));

  const priority = tier1.length > 2 ? 'critical' : tier1.length > 0 ? 'elevated' : 'normal';

  return (
    <BriefSection icon="◆" title="Risk Intelligence" accent={modColors.signal} priority={priority}>
      <p style={{ margin: '0 0 12px' }}>
        The risk register contains <M v={risks.register.length.toString()} /> active risks:{' '}
        <M v={tier1.length.toString()} c={tier1.length > 0 ? statusColor.red : statusColor.green} /> Tier 1 (Board Focus),{' '}
        <M v={tier2.length.toString()} /> Tier 2 (Executive Team), and{' '}
        <M v={(risks.register.length - tier1.length - tier2.length).toString()} /> Tier 3 (Working Group).
        {increasing.length > 0 && <> <strong style={{ color: statusColor.amber }}>{increasing.length} risk{increasing.length > 1 ? 's are' : ' is'} trending upward.</strong></>}
      </p>

      {tier1.length > 0 && (
        <div style={{
          margin: '12px 0',
          padding: 16,
          background: `${statusColor.red}08`,
          borderRadius: radius.md,
          border: `1px solid ${statusColor.red}20`,
        }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: statusColor.red, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
            Tier 1 — Board Focus
          </div>
          {tier1.map(r => (
            <div key={r.id} style={{ padding: '6px 0', borderBottom: `1px solid ${statusColor.red}10` }}>
              <div style={{ fontWeight: fontWeight.semibold, color: textColor.primary }}>{r.name}</div>
              <div style={{ fontSize: fontSize.sm, color: textColor.muted, marginTop: 2 }}>
                Score: {r.likelihood * r.impact} · Owner: {r.owner} · Trend: {r.trend}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: 0 }}>
        Last full risk review: <M v={risks.lastReviewDate} />.
        {tier1.some(r => r.trend.includes('Increasing')) &&
          <> <strong style={{ color: statusColor.red }}>At least one Tier 1 risk is trending upward — escalation recommended.</strong></>
        }
      </p>
    </BriefSection>
  );
}

// ─── Fundraising Intelligence ────────────────────────────────────────────

function FundraisingBrief() {
  const fund = useFundraising();
  const pctToGoal = (fund.closedYTD / fund.goal) * 100;
  const pipeline = fund.pipeline;
  const totalWeighted = pipeline.reduce((s, p) => s + p.weighted, 0);
  const solicitation = pipeline.filter(p => p.stage === 'solicitation' || p.stage === 'negotiation');

  const priority = pctToGoal < 40 ? 'elevated' : 'normal';

  return (
    <BriefSection icon="◇" title="Fundraising Intelligence" accent={modColors.fund} priority={priority}>
      <p style={{ margin: '0 0 12px' }}>
        Year-to-date closed: <M v={fmt(fund.closedYTD)} c={pctToGoal >= 50 ? statusColor.green : statusColor.amber} /> of{' '}
        <M v={fmt(fund.goal)} /> goal (<M v={fmtPct(pctToGoal)} />).
        The active pipeline contains <M v={pipeline.length.toString()} /> opportunities with a weighted value of{' '}
        <M v={fmt(totalWeighted)} />.
      </p>
      {solicitation.length > 0 && (
        <p style={{ margin: '0 0 12px' }}>
          <strong>{solicitation.length} opportunity{solicitation.length > 1 ? 'ies' : 'y'}</strong> in solicitation or negotiation stage:{' '}
          {solicitation.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ', '}
              {s.funder} (<M v={fmt(s.amount)} />)
            </span>
          ))}.
        </p>
      )}
      <p style={{ margin: 0 }}>
        Combined closed + weighted pipeline: <M v={fmt(fund.closedYTD + totalWeighted)} />.
        {fund.closedYTD + totalWeighted < fund.goal
          ? <> <strong style={{ color: statusColor.amber }}>Current trajectory may fall short of the annual goal. Additional cultivation needed.</strong></>
          : <> Pipeline is sufficient to meet the annual goal if conversion rates hold.</>
        }
      </p>
    </BriefSection>
  );
}

// ─── Compliance Intelligence ─────────────────────────────────────────────

function ComplianceBrief() {
  const comp = useCompliance();
  const overdue = comp.deadlines.filter(d => d.status === 'overdue');
  const atRisk = comp.deadlines.filter(d => d.status === 'at-risk');
  const upcoming = comp.deadlines.filter(d => d.daysOut <= 30 && d.status === 'on-track');

  const priority = overdue.length > 0 ? 'critical' : atRisk.length > 0 ? 'elevated' : 'normal';

  return (
    <BriefSection icon="◫" title="Compliance & Deadlines" accent={modColors.shield} priority={priority}>
      <p style={{ margin: '0 0 12px' }}>
        Audit readiness score: <M v={fmtPct(comp.auditReadiness)} c={comp.auditReadiness >= 90 ? statusColor.green : statusColor.amber} />.
        Open policy items: <M v={comp.openPolicies.toString()} />.
      </p>
      {overdue.length > 0 && (
        <div style={{
          margin: '12px 0',
          padding: 12,
          background: `${statusColor.red}08`,
          borderRadius: radius.md,
          border: `1px solid ${statusColor.red}20`,
        }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: statusColor.red, marginBottom: 6 }}>OVERDUE</div>
          {overdue.map(d => (
            <div key={d.item} style={{ fontSize: fontSize.sm, padding: '3px 0' }}>
              {d.item} — Owner: {d.owner} ({Math.abs(d.daysOut)} days overdue)
            </div>
          ))}
        </div>
      )}
      {atRisk.length > 0 && (
        <div style={{
          margin: '12px 0',
          padding: 12,
          background: `${statusColor.amber}08`,
          borderRadius: radius.md,
          border: `1px solid ${statusColor.amber}20`,
        }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: statusColor.amber, marginBottom: 6 }}>AT RISK</div>
          {atRisk.map(d => (
            <div key={d.item} style={{ fontSize: fontSize.sm, padding: '3px 0' }}>
              {d.item} — Owner: {d.owner} ({d.daysOut} days)
            </div>
          ))}
        </div>
      )}
      {upcoming.length > 0 && (
        <p style={{ margin: 0 }}>
          <strong>{upcoming.length} deadline{upcoming.length > 1 ? 's' : ''}</strong> approaching in the next 30 days (all on track).
        </p>
      )}
    </BriefSection>
  );
}

// ─── GOLDEN THREAD: Emergency Intelligence ─────────────────────────────

function EmergencyBrief() {
  const { activeEvents } = useEmergencies();
  if (activeEvents.length === 0) return null;

  return (
    <BriefSection icon="⚠" title="Active Emergency" accent={statusColor.red} priority="critical">
      {activeEvents.map(event => {
        const elapsed = Math.round((Date.now() - new Date(event.timestamp).getTime()) / 60000);
        const elapsedStr = elapsed < 60 ? `${elapsed} minutes ago` : elapsed < 1440 ? `${Math.round(elapsed / 60)} hours ago` : `${Math.round(elapsed / 1440)} days ago`;
        return (
          <div key={event.id} style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px' }}>
              <strong style={{ color: statusColor.red }}>EMERGENCY ALERT:</strong>{' '}
              <M v={event.title} c={statusColor.red} /> — reported {elapsedStr}.
              Severity: <M v={event.severity.toUpperCase()} c={event.severity === 'critical' ? statusColor.red : statusColor.amber} />.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              {event.description}
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
              margin: '12px 0', padding: 12, background: `${statusColor.red}08`,
              borderRadius: radius.md, border: `1px solid ${statusColor.red}20`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Est. Cost</div>
                <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontFamily: font.mono, color: statusColor.red }}>
                  ${event.estimatedCost.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Occupancy</div>
                <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: event.occupancyImpact ? statusColor.red : statusColor.green }}>
                  {event.occupancyImpact ? 'AFFECTED' : 'OK'}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Campus</div>
                <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: textColor.primary }}>{event.campus}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>Contact</div>
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: textColor.primary }}>{event.reportedBy}</div>
              </div>
            </div>
            <p style={{ margin: 0 }}>
              <strong>Cross-Module Response:</strong>{' '}
              {event.watchAlertSent && <><M v="Watch" c={statusColor.green} /> alerted. </>}
              {event.briefingFlagged && <><M v="Briefing" c={statusColor.green} /> flagged. </>}
              {event.ledgerImpactModeled && <><M v="Ledger" c={statusColor.green} /> impact modeled. </>}
              Risk entry created in Shield.
            </p>
          </div>
        );
      })}
    </BriefSection>
  );
}

// ─── Facilities Intelligence ─────────────────────────────────────────────

function FacilitiesBrief() {
  const fac = useFacilities();
  const urgent = fac.workOrders.filter(w => w.priority === 'urgent' && w.status !== 'completed');
  const open = fac.workOrders.filter(w => w.status === 'open' || w.status === 'in-progress');
  const overBudget = fac.capitalProjects.filter(p => p.status === 'over-budget');

  const priority = urgent.length > 0 ? 'elevated' : 'normal';

  return (
    <BriefSection icon="▦" title="Facilities Intelligence" accent={modColors.grounds} priority={priority}>
      <p style={{ margin: '0 0 12px' }}>
        <M v={open.length.toString()} /> active work orders across the network.
        {urgent.length > 0 && <> <strong style={{ color: statusColor.red }}>{urgent.length} urgent work order{urgent.length > 1 ? 's' : ''} requiring immediate attention.</strong></>}
      </p>
      {urgent.length > 0 && (
        <div style={{
          margin: '12px 0',
          padding: 12,
          background: `${statusColor.red}08`,
          borderRadius: radius.md,
          border: `1px solid ${statusColor.red}20`,
        }}>
          {urgent.map(w => (
            <div key={w.id} style={{ fontSize: fontSize.sm, padding: '3px 0' }}>
              <strong>{w.campus}:</strong> {w.description} — Assigned: {w.assignedTo}
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: 0 }}>
        Capital projects: <M v={fac.capitalProjects.length.toString()} /> active.
        {overBudget.length > 0
          ? <> <strong style={{ color: statusColor.amber }}>{overBudget.length} project{overBudget.length > 1 ? 's' : ''} over budget.</strong></>
          : <> All projects within budget.</>
        }
        {' '}Vendor contracts expiring soon: <M v={fac.vendorContractsExpiring.toString()} />.
      </p>
    </BriefSection>
  );
}

// ─── Civic Intelligence ──────────────────────────────────────────────────

function CivicBrief() {
  const civic = useCivic();
  const threats = civic.pendingBills.filter(b => b.risk === 'THREAT');

  const priority = threats.length > 0 ? 'elevated' : 'normal';

  return (
    <BriefSection icon="▤" title="Civic & Public Affairs" accent={modColors.civic} priority={priority}>
      <p style={{ margin: '0 0 12px' }}>
        <M v={civic.pendingBills.length.toString()} /> pending legislative items being tracked.
        {threats.length > 0 && <> <strong style={{ color: statusColor.red }}>{threats.length} classified as THREAT to charter operations.</strong></>}
      </p>
      {threats.length > 0 && (
        <div style={{
          margin: '12px 0',
          padding: 12,
          background: `${statusColor.red}08`,
          borderRadius: radius.md,
          border: `1px solid ${statusColor.red}20`,
        }}>
          {threats.map((b, i) => (
            <div key={i} style={{ padding: '4px 0' }}>
              <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>{b.name}</div>
              <div style={{ fontSize: fontSize.sm, color: textColor.muted }}>{b.summary}</div>
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: 0 }}>
        {civic.upcomingHearings > 0
          ? <>Next hearing: <strong>{civic.hearingTopic}</strong> on <M v={civic.hearingDate} />.</>
          : <>No upcoming hearings scheduled.</>
        }
        {' '}Media monitoring: {civic.mediaMonitoring}.
        {civic.staleStakeholderRelationships > 0 &&
          <> <M v={civic.staleStakeholderRelationships.toString()} c={statusColor.amber} /> stakeholder relationships need re-engagement.</>
        }
      </p>
    </BriefSection>
  );
}

// ─── Action Items ────────────────────────────────────────────────────────

function ActionItems() {
  const fin = useFinancials();
  const enr = useEnrollment();
  const net = useNetwork();
  const risks = useRisks();
  const comp = useCompliance();
  const fac = useFacilities();

  const actions: { priority: 'critical' | 'high' | 'medium'; text: string; owner: string }[] = [];

  // Financial actions
  const ytd = fin.ytdSummary;
  if (ytd.dscr < fin.covenants.dscrMinimum) {
    actions.push({ priority: 'critical', text: `DSCR at ${ytd.dscr.toFixed(2)} is below covenant minimum of ${fin.covenants.dscrMinimum.toFixed(2)}. Develop remediation plan.`, owner: 'CFO' });
  }
  if (ytd.daysCash < fin.covenants.daysCashMinimum) {
    actions.push({ priority: 'critical', text: `Days cash at ${ytd.daysCash} is below minimum of ${fin.covenants.daysCashMinimum}. Review cash management strategy.`, owner: 'CFO' });
  }

  // Enrollment actions
  const enrollGap = enr.targetEnrollment - enr.networkTotal;
  if (enrollGap > 100) {
    actions.push({ priority: 'high', text: `Enrollment ${enrollGap} below target (${fmt(enrollGap * net.revenuePerPupil)} revenue impact). Accelerate recruitment.`, owner: 'Chief of Schools' });
  }

  // Risk actions
  const tier1Increasing = risks.register.filter(r => r.tier.includes('Tier 1') && r.trend.includes('Increasing'));
  tier1Increasing.forEach(r => {
    actions.push({ priority: 'critical', text: `Tier 1 risk "${r.name}" is trending upward. Escalate to board.`, owner: r.owner });
  });

  // Compliance actions
  const overdue = comp.deadlines.filter(d => d.status === 'overdue');
  overdue.forEach(d => {
    actions.push({ priority: 'critical', text: `"${d.item}" is ${Math.abs(d.daysOut)} days overdue.`, owner: d.owner });
  });

  // Facilities actions
  const urgentWO = fac.workOrders.filter(w => w.priority === 'urgent' && w.status !== 'completed');
  if (urgentWO.length > 0) {
    actions.push({ priority: 'high', text: `${urgentWO.length} urgent work order(s) require immediate attention.`, owner: 'COO' });
  }

  if (actions.length === 0) {
    actions.push({ priority: 'medium', text: 'No critical or high-priority actions identified. Continue monitoring.', owner: 'All' });
  }

  const priorityColor = { critical: statusColor.red, high: statusColor.amber, medium: statusColor.blue };
  const priorityLabel = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM' };

  return (
    <BriefSection icon="▶" title="Recommended Actions" accent={brand.gold}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {actions.sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2 };
          return order[a.priority] - order[b.priority];
        }).map((a, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 12px',
            background: `${priorityColor[a.priority]}06`,
            borderRadius: radius.md,
            border: `1px solid ${priorityColor[a.priority]}15`,
          }}>
            <StatusBadge label={priorityLabel[a.priority]} variant={a.priority === 'critical' ? 'red' : a.priority === 'high' ? 'amber' : 'blue'} size="sm" />
            <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.primary }}>{a.text}</div>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, whiteSpace: 'nowrap' }}>{a.owner}</div>
          </div>
        ))}
      </div>
    </BriefSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRINCIPAL BRIEFING VIEW
// ═══════════════════════════════════════════════════════════════════════════

function PrincipalBriefing() {
  const { selectedCampusId } = useRole();
  const enr = useEnrollment();
  const net = useNetwork();
  const fac = useFacilities();
  const staff = useStaff();

  const campus = enr.byCampus.find(c => c.campusId === selectedCampusId) ?? enr.byCampus[0];
  const netCampus = net.campuses.find(c => c.id === selectedCampusId);
  const campusStaff = staff.byCampus.find(s => s.campusId === selectedCampusId);
  const campusWO = fac.workOrders.filter(w => w.campus === (campus?.name ?? ''));

  if (!campus) return null;

  const util = (campus.enrolled / campus.capacity) * 100;

  return (
    <div>
      <BriefTimestamp />

      <BriefSection icon="◈" title={`${campus.name} — Morning Brief`} accent={modColors.scholar}>
        <p style={{ margin: '0 0 12px' }}>
          Good morning, Principal. Here is your campus intelligence for <strong>{campus.name}</strong>
          {netCampus && <> in {netCampus.communityArea}</>}.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          <strong>Enrollment:</strong> <M v={fmtNum(campus.enrolled)} /> students enrolled of{' '}
          <M v={fmtNum(campus.capacity)} /> capacity (<M v={fmtPct(util)} /> utilization).
          Attrition rate: <M v={fmtPct(campus.attrition)} c={campus.attrition <= 10 ? statusColor.green : statusColor.red} />.
        </p>
        {campusStaff && (
          <p style={{ margin: '0 0 12px' }}>
            <strong>Staff:</strong> <M v={campusStaff.total.toString()} /> total positions,{' '}
            <M v={campusStaff.vacancies.toString()} c={campusStaff.vacancies > 2 ? statusColor.amber : statusColor.green} /> vacancies.
            Licensure: <M v={fmtPct(campusStaff.licensed / campusStaff.total * 100)} />.
          </p>
        )}
        <p style={{ margin: 0 }}>
          <strong>Facilities:</strong> <M v={campusWO.filter(w => w.status !== 'completed').length.toString()} /> active work orders.
          {campusWO.some(w => w.priority === 'urgent') &&
            <> <strong style={{ color: statusColor.red }}>Urgent work order(s) pending.</strong></>
          }
        </p>
      </BriefSection>

      <BriefSection icon="◉" title="Admissions Pipeline" accent={modColors.scholar}>
        <p style={{ margin: 0 }}>
          Applications: <M v={fmtNum(campus.applied)} /> · Accepted: <M v={fmtNum(campus.accepted)} /> · Yield: <M v={fmtPct(campus.yield)} />.
          Projected new enrollment: <M v={Math.round(campus.accepted * campus.yield / 100).toString()} /> students.
        </p>
      </BriefSection>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BRIEFING APP
// ═══════════════════════════════════════════════════════════════════════════

export default function BriefingApp() {
  const { role } = useRole();
  const enr = useEnrollment();

  if (role === 'principal') {
    return (
      <div>
        <ModuleHeader
          title="Briefing"
          subtitle="Campus Morning Intelligence"
          accent={modColors.briefing}
          freshness={{ lastUpdated: enr.lastUpdated, source: 'All Modules' }}
        />
        <PrincipalBriefing />
      </div>
    );
  }

  return (
    <div>
      <ModuleHeader
        title="Briefing"
        subtitle="Executive Intelligence Briefing"
        accent={modColors.briefing}
        freshness={{ lastUpdated: enr.lastUpdated, source: 'All Modules' }}
      />

      <BriefTimestamp />
      <EmergencyBrief />
      <ExecutiveSummary />
      <FinancialBrief />
      <EnrollmentBrief />
      <RiskBrief />
      <FundraisingBrief />
      <ComplianceBrief />
      <FacilitiesBrief />
      <CivicBrief />
      <ActionItems />

      {/* Classification Footer */}
      <div style={{
        textAlign: 'center',
        padding: '24px 0',
        fontSize: fontSize.xs,
        color: textColor.light,
        borderTop: `1px solid ${border.light}`,
        marginTop: 24,
      }}>
        CONFIDENTIAL — FOR EXECUTIVE LEADERSHIP ONLY
        <br />
        This briefing is auto-generated by Slate Intelligence Platform from the latest available data.
        <br />
        Data freshness varies by module. Review individual modules for source details.
      </div>
    </div>
  );
}
