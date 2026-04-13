/**
 * Slate v3 — Presentation Snapshot
 * ═══════════════════════════════════════════════════
 * A curated, story-driven override of VERITAS_DEFAULTS
 * used exclusively in Presentation Mode (Ctrl+Shift+P).
 *
 * Design principles:
 * - Realistic: reflects a real school day at a real network
 * - Story-driven: each module tells a clear, compelling narrative
 * - Matches the demo script beat for beat
 * - Never outrageous: no manufactured crises, just real tensions
 *
 * The snapshot is a deep merge: VERITAS_DEFAULTS as the base,
 * with targeted overrides that sharpen the story for the demo.
 */
import type { SlateStore } from '../../core/types';
import { VERITAS_DEFAULTS } from './veritas';

const now = new Date().toISOString();

// ─── Story Design ──────────────────────────────────────────────────────────
// Veritas Charter Schools is a strong, well-run network.
// But it is navigating real pressures that any CEO would recognize:
//
// 1. ENROLLMENT: 6,823 enrolled vs. 6,868 target — a 45-student gap.
//    At $16,345/pupil, that is $735,525 of revenue at risk.
//    Not a crisis. A real, manageable tension that requires attention.
//
// 2. FINANCIALS: Days Cash at 47 (above the 30-day covenant minimum,
//    but below the 60-day target). DSCR at 1.42 (above the 1.10 minimum,
//    but with less cushion than the board would like). Budget variance
//    is +$1.3M favorable on revenue, -$0.8M unfavorable on expenses.
//    The story: the network is financially stable but not comfortable.
//
// 3. SAFETY (Watch): AMBER threat level at network level. One campus
//    (Englewood) at elevated status due to 2 incidents within 0.5 miles
//    in the past 48 hours. The map is active but not alarming.
//    This sets up the Demo Mode sequence perfectly.
//
// 4. STAFF: 29 vacancies across the network, 4 of which are in
//    high-need instructional roles. Licensure rate at 77%.
//    Normal for a network of this size in April.
//
// 5. COMPLIANCE: Title I report due in 7 days — at-risk status.
//    This is the kind of thing that keeps a COO up at night.

export const PRESENTATION_SNAPSHOT: SlateStore = {
  // Spread the full defaults as the base
  ...VERITAS_DEFAULTS,

  // ── Network: unchanged, already perfect ──────────────────────────────
  network: {
    ...VERITAS_DEFAULTS.network,
  },

  // ── Enrollment: 45-student gap, $735K revenue at risk ────────────────
  enrollment: {
    ...VERITAS_DEFAULTS.enrollment,
    networkTotal: 6823,
    targetEnrollment: 6868,
    // Slightly lower attrition at one campus to show the gap is recoverable
    byCampus: VERITAS_DEFAULTS.enrollment.byCampus.map((c) => {
      if (c.campusId === 8) {
        // North Lawndale: enrollment slightly below target, attrition slightly elevated
        return { ...c, enrolled: 312, attrition: 0.048 };
      }
      if (c.campusId === 5) {
        // Roseland: 8 students below prior year — a real, quiet concern
        return { ...c, enrolled: 513, attrition: 0.043 };
      }
      return c;
    }),
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Financials: stable but not comfortable ───────────────────────────
  financials: {
    ...VERITAS_DEFAULTS.financials,
    ytdSummary: {
      revActual: 80.8,
      revBudget: 79.5,   // +$1.3M favorable variance on revenue
      expActual: 75.5,
      expBudget: 74.7,   // -$0.8M unfavorable variance on expenses
      surplus: 5.3,
      dscr: 1.42,        // Above 1.10 minimum, below 3.47 target — real tension
      daysCash: 47,      // Above 30-day covenant, below 60-day target
      currentRatio: 1.38,
      netAssetRatio: 69.1,
    },
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Staff: normal April picture for a 10-campus network ──────────────
  staff: {
    ...VERITAS_DEFAULTS.staff,
    totalPositions: 870,
    activeStaff: 831,
    vacancies: 29,        // 29 vacancies — realistic, not alarming
    onLeave: 10,
    licensureRate: 77,    // 77% — real, honest number
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Risks: two Tier 1 risks visible, both real ───────────────────────
  risks: {
    ...VERITAS_DEFAULTS.risks,
    register: [
      // Keep the full risk register, but ensure two Tier 1 items are prominent
      ...VERITAS_DEFAULTS.risks.register.map((r) => {
        if (r.id === 'RSK-001') {
          // Enrollment revenue risk — elevated slightly
          return { ...r, likelihood: 4, impact: 4, trend: '↑ Increasing' as const };
        }
        if (r.id === 'RSK-002') {
          // Financial covenant risk — real tension given 47 days cash
          return { ...r, likelihood: 3, impact: 5, trend: '→ Stable' as const };
        }
        return r;
      }),
    ],
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Fundraising: on track, one big opportunity in negotiation ─────────
  fundraising: {
    ...VERITAS_DEFAULTS.fundraising,
    closedYTD: 1850000,
    goal: 10000000,       // 18.5% of goal closed — realistic for April
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Compliance: Title I report at-risk — 7 days out ──────────────────
  compliance: {
    ...VERITAS_DEFAULTS.compliance,
    auditReadiness: 78,
    openPolicies: 4,
    deadlines: [
      {
        item: 'Annual Title I Compliance Report',
        daysOut: 7,
        owner: 'COO',
        status: 'at-risk',
      },
      {
        item: 'Authorizer Financial Benchmark Submission',
        daysOut: 14,
        owner: 'CFO',
        status: 'on-track',
      },
      {
        item: 'Board Governance Self-Assessment',
        daysOut: 28,
        owner: 'President',
        status: 'on-track',
      },
      {
        item: 'Special Education Compliance Audit',
        daysOut: 42,
        owner: 'Chief Schools Officer',
        status: 'on-track',
      },
      {
        item: 'Annual Fire Safety Inspections (All Campuses)',
        daysOut: 56,
        owner: 'COO',
        status: 'on-track',
      },
    ],
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Facilities: 3 urgent work orders, realistic for April ────────────
  facilities: {
    ...VERITAS_DEFAULTS.facilities,
    // Keep the existing work orders — they are already realistic
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Civic: one active bill to watch ──────────────────────────────────
  civic: {
    ...VERITAS_DEFAULTS.civic,
    lastUpdated: now,
    source: 'Presentation Mode',
  },

  // ── Role: CEO view, campus 1 (Loop) ──────────────────────────────────
  role: 'ceo',
  selectedCampusId: 1,
  emergencyEvents: [],
};
