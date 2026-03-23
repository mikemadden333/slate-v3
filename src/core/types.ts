/**
 * Slate v3 — Unified Type System
 * SINGLE SOURCE OF TRUTH for all shared interfaces.
 * Every module imports from here. No duplicates. No drift.
 */

// ─── Network & Campus ─────────────────────────────────────────────────────

export interface Campus {
  id: number;
  name: string;
  short: string;
  addr: string;
  lat: number;
  lng: number;
  communityArea: string;
  areaNumber: number;
  enroll: number;
  arrH: number;
  arrM: number;
  dH: number;
  dM: number;
}

export interface NetworkConfig {
  name: string;
  city: string;
  state: string;
  campusCount: number;
  grades: string;
  foundedYear: number;
  authorizer: string;
  revenuePerPupil: number;
  campuses: Campus[];
}

// ─── Enrollment (Scholar) ─────────────────────────────────────────────────

export interface CampusEnrollment {
  campusId: number;
  name: string;
  short: string;
  capacity: number;
  enrolled: number;
  applied: number;
  accepted: number;
  yield: number;
  attrition: number;
  grade9: number;
  grade10: number;
  grade11: number;
  grade12: number;
  history: number[];
  forecast: number[];
}

export interface HistoricalEnrollment {
  year: string;
  label: string;
  totalEnrolled: number;
  applications: number;
  accepted: number;
  yieldRate: number;
  attritionRate: number;
  campusCount: number;
  revenuePerPupil: number;
  isActual: boolean;
}

export interface EnrollmentForecast {
  year: string;
  label: string;
  optimistic: number;
  probable: number;
  pessimistic: number;
  revenueOptimistic: number;
  revenueProbable: number;
  revenuePessimistic: number;
}

export interface EnrollmentData {
  currentSY: string;
  networkTotal: number;
  targetEnrollment: number;
  byCampus: CampusEnrollment[];
  historical: HistoricalEnrollment[];
  forecasts: EnrollmentForecast[];
  lastUpdated: string;
  source: string;
}

// ─── Financials (Ledger) ──────────────────────────────────────────────────

export interface RevenueRow {
  cps: number;
  otherPublic: number;
  philanthropy: number;
  campus: number;
  other: number;
  total: number;
}

export interface ExpenseRow {
  personnel: number;
  baseSalaries: number;
  benefits: number;
  stipends: number;
  directStudent: number;
  occupancy: number;
  other: number;
  total: number;
}

export interface MonthlyActual {
  month: string;
  monthIndex: number;
  revenue: RevenueRow;
  expenses: ExpenseRow;
  ebitda: number;
  netSurplus: number;
  daysCash?: number;
  dscr?: number;
}

export interface AnnualBudget {
  fiscalYear: string;
  enrollment: number;
  enrollmentC1: number;
  revenue: RevenueRow;
  expenses: ExpenseRow;
  ebitda: number;
  netSurplus: number;
  dscr: number;
  mads: number;
  contingency: number;
  daysCashTarget: number;
}

export interface CovenantConfig {
  dscrMinimum: number;
  dscrBondDoc: number;
  madsPostRefunding: number;
  daysCashMinimum: number;
  currentRatioMinimum: number;
  netAssetMinimum: number;
  depreciation: number;
  interestExpense: number;
}

export interface HistoricalFinancial {
  year: string;
  enrollment: number;
  totalRevenue: number;
  totalExpenses: number;
  ebitda: number;
  netSurplus: number;
  dscr: number;
  personnel: number;
  cpsRevenue: number;
}

export interface ScenarioYear {
  year: string;
  enrollmentC1: number;
  totalRevenue: number;
  totalExpenses: number;
  ebitda: number;
  netSurplus: number;
  dscr: number;
  cushion: number;
}

export interface ScenarioSet {
  optimistic: ScenarioYear[];
  reasonable: ScenarioYear[];
  pessimistic: ScenarioYear[];
}

export interface NSTDepartment {
  name: string;
  actual: number;
  budget: number;
  variance: number;
}

export interface CompensationData {
  fy26: {
    personnelTotal: number;
    baseSalaries: number;
    benefits: number;
    stipends: number;
    personnelPctOfOpex: number;
  };
  historicalPersonnel: Array<{
    year: string;
    base: number;
    benefits: number;
    stipends: number;
    total: number;
  }>;
  cpsGap: {
    cpsL1Step0: number;
    veritasStarting: number;
    gapPct: number;
  };
  fiveYearPressure: number;
}

export interface FinancialData {
  fiscalYear: string;
  budget: AnnualBudget;
  actuals: MonthlyActual[];
  covenants: CovenantConfig;
  historical: HistoricalFinancial[];
  scenarios: ScenarioSet;
  nstDepartments: NSTDepartment[];
  compensation: CompensationData;
  ytdSummary: {
    revActual: number;
    revBudget: number;
    expActual: number;
    expBudget: number;
    surplus: number;
    dscr: number;
    daysCash: number;
    currentRatio: number;
    netAssetRatio: number;
  };
  lastUpdated: string;
  source: string;
}

// ─── Staff (Roster) ───────────────────────────────────────────────────────

export interface CampusStaff {
  campusId: number;
  name: string;
  total: number;
  licensed: number;
  vacancies: number;
}

export interface VacancyByDept {
  dept: string;
  count: number;
}

export interface StaffData {
  totalPositions: number;
  activeStaff: number;
  vacancies: number;
  onLeave: number;
  licensureRate: number;
  byCampus: CampusStaff[];
  vacanciesByDept: VacancyByDept[];
  lastUpdated: string;
  source: string;
}

// ─── Risks (Shield) ──────────────────────────────────────────────────────

export type RiskLens = 'Core' | 'Existential' | 'Emergent';
export type RiskVelocity = 'Slow' | 'Moderate' | 'Fast';
export type RiskTrend = '↑ Increasing' | '→ Stable' | '↓ Decreasing';
export type RiskTier = 'Tier 1 — Board Focus' | 'Tier 2 — Executive Team' | 'Tier 3 — Working Group';

export interface Risk {
  id: string;
  name: string;
  dateIdentified: string;
  description: string;
  lens: RiskLens;
  category: string;
  owner: string;
  likelihood: number;
  impact: number;
  velocity: RiskVelocity;
  controls: string;
  mitigation: string;
  mitigationStatus: string;
  targetScore: number;
  tier: RiskTier;
  kri: string;
  lastReview: string;
  nextReview: string;
  trend: RiskTrend;
  notes: string;
}

export interface RiskData {
  register: Risk[];
  lastReviewDate: string;
  lastUpdated: string;
  source: string;
}

// ─── Fundraising (Fund) ──────────────────────────────────────────────────

export type FundStage = 'identification' | 'qualification' | 'cultivation' | 'solicitation' | 'negotiation' | 'closed';

export interface FundOpportunity {
  id: string;
  funder: string;
  amount: number;
  stage: FundStage;
  probability: number;
  weighted: number;
  type: string;
  contact: string;
  nextAction: string;
  dueDate: string;
  notes: string;
}

export interface FundData {
  pipeline: FundOpportunity[];
  closedYTD: number;
  goal: number;
  lastUpdated: string;
  source: string;
}

// ─── Compliance (Guard) ──────────────────────────────────────────────────

export interface Deadline {
  item: string;
  daysOut: number;
  owner: string;
  status: 'on-track' | 'at-risk' | 'overdue';
}

export interface ComplianceData {
  deadlines: Deadline[];
  auditReadiness: number;
  openPolicies: number;
  lastUpdated: string;
  source: string;
}

// ─── Facilities (Grounds) ────────────────────────────────────────────────

export type WorkOrderPriority = 'urgent' | 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'open' | 'in-progress' | 'completed';

export interface WorkOrder {
  id: string;
  campus: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  dateSubmitted: string;
  assignedTo: string;
}

export interface CapitalProject {
  id: string;
  name: string;
  campus: string;
  budget: number;
  spent: number;
  status: 'on-track' | 'at-risk' | 'over-budget';
  completion: number;
}

export interface FacilitiesData {
  workOrders: WorkOrder[];
  capitalProjects: CapitalProject[];
  vendorContractsExpiring: number;
  lastUpdated: string;
  source: string;
}

// ─── Civic (Public Affairs) ──────────────────────────────────────────────

export interface PendingBill {
  name: string;
  summary: string;
  risk: 'POSITIVE' | 'WATCH' | 'THREAT';
  status: string;
}

export interface CivicData {
  pendingBills: PendingBill[];
  upcomingHearings: number;
  hearingDate: string;
  hearingTopic: string;
  mediaMonitoring: string;
  staleStakeholderRelationships: number;
  lastUpdated: string;
  source: string;
}

// ─── The Complete Data Store ─────────────────────────────────────────────

export type UserRole = 'ceo' | 'principal';

export interface SlateStore {
  network: NetworkConfig;
  enrollment: EnrollmentData;
  financials: FinancialData;
  staff: StaffData;
  risks: RiskData;
  fundraising: FundData;
  compliance: ComplianceData;
  facilities: FacilitiesData;
  civic: CivicData;
  role: UserRole;
  selectedCampusId: number;
}

// ─── Data Freshness ──────────────────────────────────────────────────────

export type FreshnessLevel = 'fresh' | 'aging' | 'stale';

export function getFreshness(lastUpdated: string, thresholdDays: number = 30): FreshnessLevel {
  const age = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  if (age <= thresholdDays * 0.5) return 'fresh';
  if (age <= thresholdDays) return 'aging';
  return 'stale';
}

// ─── Module Metadata ─────────────────────────────────────────────────────

export interface ModuleMeta {
  id: string;
  label: string;
  icon: string;
  color: string;
  category: 'intelligence' | 'operations' | 'strategy' | 'communications';
  description: string;
}
