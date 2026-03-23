/**
 * Slate v3 — Network Snapshot Builder
 * Aggregates data from all modules into a single JSON snapshot
 * used by Signal's AI engine for cross-system dot-connecting.
 */
import type { SlateStore } from './types';

export function buildNetworkSnapshot(store: SlateStore) {
  const { network, enrollment, financials, staff, risks, fundraising, compliance, facilities, civic } = store;

  const enrollGap = enrollment.targetEnrollment - enrollment.networkTotal;
  const rpp = network.revenuePerPupil;
  const revenueAtRisk = Math.abs(enrollGap) * rpp;

  const ytd = financials.ytdSummary;
  const budgetVar = ytd.expBudget > 0
    ? parseFloat(((ytd.expActual - ytd.expBudget) / ytd.expBudget * 100).toFixed(1))
    : 0;

  const tier1Risks = risks.register.filter(r => r.tier.includes('Tier 1'));
  const increasingRisks = risks.register.filter(r => r.trend.includes('Increasing'));
  const urgentWOs = facilities.workOrders.filter(w => w.priority === 'urgent');
  const atRiskDeadlines = compliance.deadlines.filter(d => d.status === 'at-risk' || d.status === 'overdue');

  const pipelineWeighted = fundraising.pipeline.reduce((s, o) => s + o.weighted, 0);
  const pipelineTotal = fundraising.pipeline.reduce((s, o) => s + o.amount, 0);

  return {
    generatedAt: new Date().toISOString(),
    network: network.name,
    city: network.city,
    state: network.state,
    campusCount: network.campusCount,
    studentCount: enrollment.networkTotal,
    authorizer: network.authorizer,
    grades: network.grades,
    foundedYear: network.foundedYear,

    enrollment: {
      current: enrollment.networkTotal,
      target: enrollment.targetEnrollment,
      gap: enrollGap,
      gapDirection: enrollGap >= 0 ? 'above' : 'below',
      revenueAtRisk,
      revenuePerPupil: rpp,
      historicalTrend: enrollment.historical.filter(h => h.isActual).slice(-5).map(h => ({
        year: h.label, enrolled: h.totalEnrolled, applications: h.applications, yieldRate: h.yieldRate, attritionRate: h.attritionRate,
      })),
      forecasts: enrollment.forecasts.map(f => ({
        year: f.label, optimistic: f.optimistic, probable: f.probable, pessimistic: f.pessimistic,
      })),
    },

    financials: {
      fiscalYear: financials.fiscalYear,
      revenueActual: ytd.revActual * 1_000_000,
      revenueBudget: ytd.revBudget * 1_000_000,
      expenseActual: ytd.expActual * 1_000_000,
      expenseBudget: ytd.expBudget * 1_000_000,
      surplus: ytd.surplus * 1_000_000,
      budgetVariancePct: budgetVar,
      dscr: ytd.dscr,
      daysCash: ytd.daysCash,
      currentRatio: ytd.currentRatio,
      netAssetRatio: ytd.netAssetRatio,
    },

    staff: {
      totalPositions: staff.totalPositions,
      activeStaff: staff.activeStaff,
      vacancies: staff.vacancies,
      onLeave: staff.onLeave,
      licensureRate: staff.licensureRate,
      vacancyRate: ((staff.vacancies / staff.totalPositions) * 100).toFixed(1) + '%',
    },

    risks: {
      totalRisks: risks.register.length,
      tier1Count: tier1Risks.length,
      tier1Names: tier1Risks.map(r => r.name),
      increasingCount: increasingRisks.length,
      increasingNames: increasingRisks.map(r => r.name),
      avgScore: (risks.register.reduce((s, r) => s + r.likelihood * r.impact, 0) / risks.register.length).toFixed(1),
      topRisks: risks.register
        .sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact))
        .slice(0, 5)
        .map(r => ({ name: r.name, score: r.likelihood * r.impact, trend: r.trend, tier: r.tier, velocity: r.velocity })),
    },

    fundraising: {
      closedYTD: fundraising.closedYTD,
      goal: fundraising.goal,
      goalPct: ((fundraising.closedYTD / fundraising.goal) * 100).toFixed(1) + '%',
      pipelineTotal,
      pipelineWeighted,
      activeOpportunities: fundraising.pipeline.length,
      topOpportunities: fundraising.pipeline
        .sort((a, b) => b.weighted - a.weighted)
        .slice(0, 3)
        .map(o => ({ funder: o.funder, amount: o.amount, stage: o.stage, probability: o.probability })),
    },

    compliance: {
      totalDeadlines: compliance.deadlines.length,
      atRiskCount: atRiskDeadlines.length,
      atRiskItems: atRiskDeadlines.map(d => ({ item: d.item, daysOut: d.daysOut, owner: d.owner })),
      auditReadiness: compliance.auditReadiness,
      openPolicies: compliance.openPolicies,
    },

    facilities: {
      openWorkOrders: facilities.workOrders.filter(w => w.status !== 'completed').length,
      urgentCount: urgentWOs.length,
      urgentItems: urgentWOs.map(w => ({ campus: w.campus, description: w.description })),
      capitalProjectsActive: facilities.capitalProjects.length,
      capitalProjectsAtRisk: facilities.capitalProjects.filter(p => p.status === 'at-risk').length,
    },

    civic: {
      pendingBills: civic.pendingBills.map(b => ({ name: b.name, summary: b.summary, risk: b.risk, status: b.status })),
      upcomingHearings: civic.upcomingHearings,
      hearingTopic: civic.hearingTopic,
      mediaMonitoring: civic.mediaMonitoring,
      staleStakeholderRelationships: civic.staleStakeholderRelationships,
    },
  };
}
