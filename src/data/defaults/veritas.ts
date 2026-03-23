/**
 * Slate v3 — Veritas Charter Schools Demo Dataset
 * ═══════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH for all demo data.
 * Every module reads from here via the DataStore.
 * NO other file defines campus lists, enrollment, or financials.
 */

import type {
  SlateStore, Campus, CampusEnrollment, HistoricalEnrollment,
  EnrollmentForecast, AnnualBudget, MonthlyActual, CovenantConfig,
  HistoricalFinancial, ScenarioSet, SupportTeamDepartment, CompensationData,
  CampusStaff, VacancyByDept, Risk, FundOpportunity, Deadline,
  WorkOrder, CapitalProject, PendingBill, RevenueRow, ExpenseRow,
  CampusCondition, VendorContract, ProjectMilestone,
} from '../../core/types';

// ─── CAMPUSES ─────────────────────────────────────────────────────────────

const CAMPUSES: Campus[] = [
  { id: 1,  name: 'Veritas Loop Academy',            short: 'Loop',           addr: '120 S. State St',           lat: 41.8802, lng: -87.6278, communityArea: 'Loop',               areaNumber: 32, enroll: 965,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 2,  name: 'Veritas Englewood Academy',       short: 'Englewood',      addr: '6201 S. Stewart Ave',       lat: 41.7798, lng: -87.6355, communityArea: 'Englewood',           areaNumber: 68, enroll: 718,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 3,  name: 'Veritas Woodlawn Academy',        short: 'Woodlawn',       addr: '6338 S. Cottage Grove Ave', lat: 41.7808, lng: -87.6063, communityArea: 'Woodlawn',            areaNumber: 42, enroll: 798,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 4,  name: 'Veritas Auburn Gresham Academy',  short: 'Auburn Gresham', addr: '8039 S. Halsted St',        lat: 41.7468, lng: -87.6442, communityArea: 'Auburn Gresham',      areaNumber: 71, enroll: 678,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 5,  name: 'Veritas Roseland Academy',        short: 'Roseland',       addr: '10956 S. Michigan Ave',     lat: 41.6953, lng: -87.6228, communityArea: 'Roseland',            areaNumber: 49, enroll: 521,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 6,  name: 'Veritas Chatham Academy',         short: 'Chatham',        addr: '8201 S. Cottage Grove Ave', lat: 41.7444, lng: -87.6063, communityArea: 'Chatham',             areaNumber: 44, enroll: 891,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 7,  name: 'Veritas Austin Academy',          short: 'Austin',         addr: '231 N. Pine Ave',           lat: 41.8876, lng: -87.7696, communityArea: 'Austin',              areaNumber: 25, enroll: 711,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 8,  name: 'Veritas North Lawndale Academy',  short: 'North Lawndale', addr: '1616 S. Millard Ave',       lat: 41.8555, lng: -87.7199, communityArea: 'North Lawndale',      areaNumber: 29, enroll: 329,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 9,  name: 'Veritas Garfield Park Academy',   short: 'Garfield Park',  addr: '2345 W. Congress Pkwy',     lat: 41.8752, lng: -87.6919, communityArea: 'East Garfield Park',  areaNumber: 27, enroll: 652,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
  { id: 10, name: 'Veritas Humboldt Park Academy',   short: 'Humboldt Park',  addr: '3245 W. Division St',       lat: 41.9027, lng: -87.7165, communityArea: 'Humboldt Park',       areaNumber: 23, enroll: 489,  arrH: 7, arrM: 30, dH: 15, dM: 10 },
];

// ─── ENROLLMENT ───────────────────────────────────────────────────────────

const CAMPUS_ENROLLMENT: CampusEnrollment[] = [
  { campusId: 1,  name: 'Veritas Loop Academy',           short: 'Loop',           capacity: 1050, enrolled: 965, applied: 2100, accepted: 987, yield: 0.47, attrition: 0.033, grade9: 270, grade10: 258, grade11: 247, grade12: 190, history: [820,854,891,930,942,952,958,965], forecast: [987,1005,1018,1025,1030] },
  { campusId: 2,  name: 'Veritas Englewood Academy',      short: 'Englewood',      capacity: 800,  enrolled: 718, applied: 1240, accepted: 744, yield: 0.60, attrition: 0.038, grade9: 203, grade10: 194, grade11: 185, grade12: 136, history: [580,605,623,648,670,688,703,718], forecast: [742,758,771,778,782] },
  { campusId: 3,  name: 'Veritas Woodlawn Academy',       short: 'Woodlawn',       capacity: 900,  enrolled: 798, applied: 1380, accepted: 828, yield: 0.60, attrition: 0.035, grade9: 225, grade10: 215, grade11: 206, grade12: 152, history: [650,678,701,725,745,762,780,798], forecast: [823,841,855,862,868] },
  { campusId: 4,  name: 'Veritas Auburn Gresham Academy', short: 'Auburn Gresham', capacity: 750,  enrolled: 678, applied: 1150, accepted: 702, yield: 0.59, attrition: 0.036, grade9: 191, grade10: 183, grade11: 175, grade12: 129, history: [545,568,589,612,635,651,665,678], forecast: [702,718,730,736,740] },
  { campusId: 5,  name: 'Veritas Roseland Academy',       short: 'Roseland',       capacity: 600,  enrolled: 521, applied: 890,  accepted: 540, yield: 0.60, attrition: 0.040, grade9: 147, grade10: 141, grade11: 135, grade12: 98,  history: [420,438,455,472,488,500,511,521], forecast: [540,552,561,566,570] },
  { campusId: 6,  name: 'Veritas Chatham Academy',        short: 'Chatham',        capacity: 950,  enrolled: 891, applied: 1520, accepted: 924, yield: 0.59, attrition: 0.032, grade9: 251, grade10: 240, grade11: 230, grade12: 170, history: [720,752,781,812,838,856,874,891], forecast: [924,944,958,966,972] },
  { campusId: 7,  name: 'Veritas Austin Academy',         short: 'Austin',         capacity: 800,  enrolled: 711, applied: 1210, accepted: 738, yield: 0.59, attrition: 0.037, grade9: 200, grade10: 192, grade11: 184, grade12: 135, history: [575,600,622,645,665,681,696,711], forecast: [738,754,766,773,778] },
  { campusId: 8,  name: 'Veritas North Lawndale Academy', short: 'North Lawndale', capacity: 400,  enrolled: 329, applied: 560,  accepted: 341, yield: 0.59, attrition: 0.042, grade9: 93,  grade10: 89,  grade11: 85,  grade12: 62,  history: [265,276,287,298,308,316,323,329], forecast: [341,349,355,358,360] },
  { campusId: 9,  name: 'Veritas Garfield Park Academy',  short: 'Garfield Park',  capacity: 700,  enrolled: 652, applied: 1110, accepted: 676, yield: 0.59, attrition: 0.039, grade9: 184, grade10: 176, grade11: 168, grade12: 124, history: [525,548,569,591,612,628,641,652], forecast: [676,691,702,708,713] },
  { campusId: 10, name: 'Veritas Humboldt Park Academy',  short: 'Humboldt Park',  capacity: 550,  enrolled: 489, applied: 830,  accepted: 507, yield: 0.59, attrition: 0.038, grade9: 138, grade10: 132, grade11: 126, grade12: 93,  history: [395,412,428,445,460,472,481,489], forecast: [507,518,527,531,535] },
];

const HISTORICAL_ENROLLMENT: HistoricalEnrollment[] = [
  { year: 'SY18', label: '2017-18', totalEnrolled: 5495, applications: 9200,  accepted: 5720, yieldRate: 0.58, attritionRate: 0.042, campusCount: 10, revenuePerPupil: 13200, isActual: true },
  { year: 'SY19', label: '2018-19', totalEnrolled: 5731, applications: 9650,  accepted: 5960, yieldRate: 0.58, attritionRate: 0.040, campusCount: 10, revenuePerPupil: 13600, isActual: true },
  { year: 'SY20', label: '2019-20', totalEnrolled: 5946, applications: 10100, accepted: 6183, yieldRate: 0.59, attritionRate: 0.039, campusCount: 10, revenuePerPupil: 14050, isActual: true },
  { year: 'SY21', label: '2020-21', totalEnrolled: 6178, applications: 10500, accepted: 6425, yieldRate: 0.59, attritionRate: 0.038, campusCount: 10, revenuePerPupil: 14500, isActual: true },
  { year: 'SY22', label: '2021-22', totalEnrolled: 6363, applications: 10900, accepted: 6618, yieldRate: 0.59, attritionRate: 0.037, campusCount: 10, revenuePerPupil: 15000, isActual: true },
  { year: 'SY23', label: '2022-23', totalEnrolled: 6506, applications: 11200, accepted: 6766, yieldRate: 0.59, attritionRate: 0.036, campusCount: 10, revenuePerPupil: 15450, isActual: true },
  { year: 'SY24', label: '2023-24', totalEnrolled: 6632, applications: 11500, accepted: 6898, yieldRate: 0.59, attritionRate: 0.036, campusCount: 10, revenuePerPupil: 15900, isActual: true },
  { year: 'SY25', label: '2024-25', totalEnrolled: 6752, applications: 11800, accepted: 7022, yieldRate: 0.59, attritionRate: 0.035, campusCount: 10, revenuePerPupil: 16345, isActual: true },
  { year: 'SY26', label: '2025-26', totalEnrolled: 6823, applications: 11990, accepted: 6987, yieldRate: 0.59, attritionRate: 0.035, campusCount: 10, revenuePerPupil: 16345, isActual: false },
];

const ENROLLMENT_FORECASTS: EnrollmentForecast[] = [
  { year: 'SY27', label: '2026-27', optimistic: 6910, probable: 6846, pessimistic: 6720, revenueOptimistic: 112.9, revenueProbable: 111.9, revenuePessimistic: 109.8 },
  { year: 'SY28', label: '2027-28', optimistic: 6990, probable: 6874, pessimistic: 6620, revenueOptimistic: 114.2, revenueProbable: 112.3, revenuePessimistic: 108.2 },
  { year: 'SY29', label: '2028-29', optimistic: 7060, probable: 6871, pessimistic: 6524, revenueOptimistic: 115.4, revenueProbable: 112.3, revenuePessimistic: 106.6 },
  { year: 'SY30', label: '2029-30', optimistic: 7120, probable: 6871, pessimistic: 6430, revenueOptimistic: 116.3, revenueProbable: 112.3, revenuePessimistic: 105.1 },
  { year: 'SY31', label: '2030-31', optimistic: 7175, probable: 6871, pessimistic: 6340, revenueOptimistic: 117.3, revenueProbable: 112.3, revenuePessimistic: 103.6 },
];

// ─── FINANCIALS ───────────────────────────────────────────────────────────

const BUDGET: AnnualBudget = {
  fiscalYear: 'FY26',
  enrollment: 6713,
  enrollmentC1: 6823,
  revenue: { cps: 110.5, otherPublic: 12.1, philanthropy: 10.2, campus: 1.2, other: 4.3, total: 138.3 },
  expenses: { personnel: 92.6, baseSalaries: 68.7, benefits: 20.6, stipends: 3.1, directStudent: 18.5, occupancy: 9.2, other: 11.6, total: 131.9 },
  ebitda: 4.2,
  netSurplus: -2.1,
  dscr: 3.47,
  mads: 2.0,
  contingency: 2.2,
  daysCashTarget: 60,
};

const MONTHLY_ACTUALS: MonthlyActual[] = [
  { month: 'Jul', monthIndex: 0, revenue: { cps: 9.2, otherPublic: 0.9, philanthropy: 0.8, campus: 0.1, other: 0.5, total: 11.5 }, expenses: { personnel: 7.5, baseSalaries: 5.6, benefits: 1.6, stipends: 0.3, directStudent: 1.4, occupancy: 0.7, other: 0.8, total: 10.4 }, ebitda: 0.8, netSurplus: 0.6 },
  { month: 'Aug', monthIndex: 1, revenue: { cps: 9.4, otherPublic: 1.0, philanthropy: 0.9, campus: 0.1, other: 0.5, total: 11.9 }, expenses: { personnel: 7.8, baseSalaries: 5.8, benefits: 1.7, stipends: 0.3, directStudent: 1.6, occupancy: 0.8, other: 0.9, total: 11.1 }, ebitda: 0.5, netSurplus: 0.3 },
  { month: 'Sep', monthIndex: 2, revenue: { cps: 9.5, otherPublic: 1.0, philanthropy: 1.1, campus: 0.1, other: 0.6, total: 12.3 }, expenses: { personnel: 7.8, baseSalaries: 5.8, benefits: 1.7, stipends: 0.3, directStudent: 1.7, occupancy: 0.8, other: 0.8, total: 11.1 }, ebitda: 0.9, netSurplus: 0.7 },
  { month: 'Oct', monthIndex: 3, revenue: { cps: 9.5, otherPublic: 1.0, philanthropy: 1.0, campus: 0.1, other: 0.6, total: 12.2 }, expenses: { personnel: 7.7, baseSalaries: 5.7, benefits: 1.7, stipends: 0.3, directStudent: 1.6, occupancy: 0.8, other: 0.8, total: 10.9 }, ebitda: 1.0, netSurplus: 0.8 },
  { month: 'Nov', monthIndex: 4, revenue: { cps: 9.4, otherPublic: 0.9, philanthropy: 1.2, campus: 0.1, other: 0.6, total: 12.2 }, expenses: { personnel: 7.6, baseSalaries: 5.7, benefits: 1.6, stipends: 0.3, directStudent: 1.5, occupancy: 0.7, other: 0.8, total: 10.6 }, ebitda: 1.3, netSurplus: 1.1 },
  { month: 'Dec', monthIndex: 5, revenue: { cps: 9.3, otherPublic: 0.9, philanthropy: 1.7, campus: 0.1, other: 0.6, total: 12.6 }, expenses: { personnel: 7.6, baseSalaries: 5.7, benefits: 1.6, stipends: 0.3, directStudent: 1.5, occupancy: 0.7, other: 0.8, total: 10.6 }, ebitda: 1.7, netSurplus: 1.5 },
  { month: 'Jan', monthIndex: 6, revenue: { cps: 9.5, otherPublic: 1.0, philanthropy: 0.4, campus: 0.1, other: 0.6, total: 11.6 }, expenses: { personnel: 7.9, baseSalaries: 5.9, benefits: 1.7, stipends: 0.3, directStudent: 1.4, occupancy: 0.8, other: 0.8, total: 10.9 }, ebitda: 0.4, netSurplus: 0.3, daysCash: 215, dscr: 3.47 },
];

const COVENANTS: CovenantConfig = {
  dscrMinimum: 1.0,
  dscrBondDoc: 1.10,
  madsPostRefunding: 2.8,
  daysCashMinimum: 30,
  currentRatioMinimum: 1.10,
  netAssetMinimum: 20.0,
  depreciation: 3.5,
  interestExpense: 0.7,
};

const HISTORICAL_FINANCIALS: HistoricalFinancial[] = [
  { year: 'FY20', enrollment: 5946, totalRevenue: 83.5,  totalExpenses: 82.1,  ebitda: -0.8, netSurplus: -2.2, dscr: 0.31, personnel: 69.7, cpsRevenue: 67.2 },
  { year: 'FY21', enrollment: 6178, totalRevenue: 95.2,  totalExpenses: 91.8,  ebitda: 1.2,  netSurplus: -0.5, dscr: 1.60, personnel: 78.2, cpsRevenue: 76.8 },
  { year: 'FY22', enrollment: 6363, totalRevenue: 107.8, totalExpenses: 103.2, ebitda: 2.4,  netSurplus: 0.8,  dscr: 2.20, personnel: 86.4, cpsRevenue: 86.9 },
  { year: 'FY23', enrollment: 6506, totalRevenue: 116.2, totalExpenses: 113.5, ebitda: 0.5,  netSurplus: -1.7, dscr: 1.25, personnel: 86.9, cpsRevenue: 93.8 },
  { year: 'FY24', enrollment: 6632, totalRevenue: 124.8, totalExpenses: 119.6, ebitda: 3.0,  netSurplus: 1.2,  dscr: 2.50, personnel: 86.8, cpsRevenue: 100.5 },
  { year: 'FY25', enrollment: 6752, totalRevenue: 131.5, totalExpenses: 127.3, ebitda: 2.0,  netSurplus: 0.2,  dscr: 2.00, personnel: 91.1, cpsRevenue: 105.2 },
];

const SCENARIOS: ScenarioSet = {
  optimistic: [
    { year: 'FY27', enrollmentC1: 6910, totalRevenue: 143.5, totalExpenses: 138.2, ebitda: 3.1, netSurplus: 1.3, dscr: 2.65, cushion: 3.5 },
    { year: 'FY28', enrollmentC1: 6990, totalRevenue: 149.8, totalExpenses: 143.5, ebitda: 4.1, netSurplus: 2.3, dscr: 3.15, cushion: 4.8 },
    { year: 'FY29', enrollmentC1: 7060, totalRevenue: 156.8, totalExpenses: 148.8, ebitda: 5.8, netSurplus: 3.9, dscr: 4.95, cushion: 6.2 },
    { year: 'FY30', enrollmentC1: 7120, totalRevenue: 165.1, totalExpenses: 154.3, ebitda: 8.5, netSurplus: 6.8, dscr: 6.77, cushion: 9.1 },
    { year: 'FY31', enrollmentC1: 7175, totalRevenue: 173.2, totalExpenses: 160.2, ebitda: 10.8, netSurplus: 9.9, dscr: 8.69, cushion: 12.1 },
  ],
  reasonable: [
    { year: 'FY27', enrollmentC1: 6834, totalRevenue: 140.5, totalExpenses: 140.4, ebitda: -1.1, netSurplus: -1.7, dscr: 1.49, cushion: 0.8 },
    { year: 'FY28', enrollmentC1: 6803, totalRevenue: 145.6, totalExpenses: 146.3, ebitda: -1.9, netSurplus: -2.1, dscr: 0.72, cushion: -0.4 },
    { year: 'FY29', enrollmentC1: 6793, totalRevenue: 152.9, totalExpenses: 152.0, ebitda: -0.2, netSurplus: -1.7, dscr: 1.45, cushion: 0.7 },
    { year: 'FY30', enrollmentC1: 6792, totalRevenue: 159.9, totalExpenses: 157.9, ebitda: 0.8, netSurplus: -0.4, dscr: 2.22, cushion: 1.9 },
    { year: 'FY31', enrollmentC1: 6791, totalRevenue: 167.3, totalExpenses: 164.1, ebitda: 2.0, netSurplus: 0.4, dscr: 3.12, cushion: 3.3 },
  ],
  pessimistic: [
    { year: 'FY27', enrollmentC1: 6676, totalRevenue: 137.5, totalExpenses: 141.4, ebitda: -3.9, netSurplus: -5.3, dscr: 0.85, cushion: -1.2 },
    { year: 'FY28', enrollmentC1: 6592, totalRevenue: 140.3, totalExpenses: 147.0, ebitda: -6.7, netSurplus: -8.1, dscr: 0.20, cushion: -3.1 },
    { year: 'FY29', enrollmentC1: 6508, totalRevenue: 143.1, totalExpenses: 151.5, ebitda: -8.4, netSurplus: -9.8, dscr: -0.10, cushion: -4.5 },
    { year: 'FY30', enrollmentC1: 6452, totalRevenue: 145.9, totalExpenses: 155.9, ebitda: -10.1, netSurplus: -11.5, dscr: -0.35, cushion: -5.9 },
    { year: 'FY31', enrollmentC1: 6396, totalRevenue: 148.7, totalExpenses: 159.9, ebitda: -11.2, netSurplus: -12.6, dscr: -0.50, cushion: -6.7 },
  ],
};

const SUPPORT_TEAM_DEPARTMENTS: SupportTeamDepartment[] = [
  { name: 'Academic',                    actual: 893, budget: 636, variance: 257 },
  { name: 'Health, Fitness, Athletics',  actual: 445, budget: 313, variance: 133 },
  { name: 'Facilities',                  actual: 392, budget: 317, variance: 76 },
  { name: 'Network Operations',          actual: 464, budget: 423, variance: 42 },
  { name: 'Food Services',              actual: 175, budget: 139, variance: 36 },
  { name: 'Development',                actual: 500, budget: 473, variance: 27 },
  { name: 'Human Resources',            actual: 412, budget: 392, variance: 20 },
  { name: 'Student Recruitment',         actual: 350, budget: 336, variance: 14 },
  { name: 'Safety & Security',          actual: 250, budget: 242, variance: 7 },
  { name: 'Executive Office',           actual: 318, budget: 315, variance: 3 },
  { name: 'Finance',                    actual: 456, budget: 455, variance: 1 },
  { name: 'Public Affairs',             actual: 131, budget: 134, variance: -2 },
  { name: 'Data & Analytics',           actual: 175, budget: 182, variance: -7 },
  { name: 'College Team',               actual: 250, budget: 259, variance: -10 },
  { name: 'Special Education',          actual: 380, budget: 394, variance: -13 },
  { name: 'Communications',             actual: 218, budget: 241, variance: -24 },
  { name: 'Legal',                      actual: 323, budget: 369, variance: -45 },
  { name: 'IT',                         actual: 874, budget: 946, variance: -72 },
  { name: 'Education Team',             actual: 300, budget: 397, variance: -97 },
];

const COMPENSATION: CompensationData = {
  fy26: { personnelTotal: 92.6, baseSalaries: 68.7, benefits: 20.6, stipends: 3.1, personnelPctOfOpex: 70 },
  historicalPersonnel: [
    { year: 'FY20', base: 49.4, benefits: 16.0, stipends: 4.3, total: 69.7 },
    { year: 'FY21', base: 55.7, benefits: 18.0, stipends: 4.5, total: 78.2 },
    { year: 'FY22', base: 61.6, benefits: 19.7, stipends: 5.0, total: 86.4 },
    { year: 'FY23', base: 62.3, benefits: 19.6, stipends: 4.9, total: 86.9 },
    { year: 'FY24', base: 63.1, benefits: 19.2, stipends: 4.5, total: 86.8 },
    { year: 'FY25', base: 66.2, benefits: 20.2, stipends: 4.8, total: 91.1 },
    { year: 'FY26', base: 68.7, benefits: 20.6, stipends: 3.1, total: 92.5 },
  ],
  cpsGap: { cpsL1Step0: 65090, veritasStarting: 60000, gapPct: -7.8 },
  fiveYearPressure: 13.7,
};

// ─── STAFF ────────────────────────────────────────────────────────────────

const CAMPUS_STAFF: CampusStaff[] = [
  { campusId: 1,  name: 'Loop',           total: 112, licensed: 74, vacancies: 3 },
  { campusId: 6,  name: 'Chatham',        total: 105, licensed: 69, vacancies: 4 },
  { campusId: 3,  name: 'Woodlawn',       total: 97,  licensed: 64, vacancies: 3 },
  { campusId: 2,  name: 'Englewood',      total: 88,  licensed: 58, vacancies: 4 },
  { campusId: 4,  name: 'Auburn Gresham', total: 84,  licensed: 55, vacancies: 2 },
  { campusId: 7,  name: 'Austin',         total: 84,  licensed: 55, vacancies: 3 },
  { campusId: 9,  name: 'Garfield Park',  total: 79,  licensed: 51, vacancies: 4 },
  { campusId: 10, name: 'Humboldt Park',  total: 62,  licensed: 40, vacancies: 3 },
  { campusId: 5,  name: 'Roseland',       total: 62,  licensed: 40, vacancies: 4 },
  { campusId: 8,  name: 'North Lawndale', total: 38,  licensed: 25, vacancies: 3 },
];

const VACANCIES_BY_DEPT: VacancyByDept[] = [
  { dept: 'Special Ed.',   count: 11 },
  { dept: 'Instruction',   count: 8 },
  { dept: 'Student Svcs',  count: 5 },
  { dept: 'Operations',    count: 3 },
  { dept: 'Admin',         count: 2 },
];

// ─── RISKS ────────────────────────────────────────────────────────────────

const RISKS: Risk[] = [
  {
    id: 'R-001', name: 'Charter Renewal Risk', dateIdentified: '2025-11-15',
    description: 'Charter renewal at risk due to shifting political climate, authorizer changes, or performance criteria modifications that could threaten operating authority.',
    lens: 'Existential', category: 'Legal, Policy & Compliance', owner: 'CEO',
    likelihood: 2, impact: 5, velocity: 'Slow',
    controls: 'Renewal readiness process; compliance audits; stakeholder engagement; performance dashboards',
    mitigation: 'Strengthen authorizer relations; enhance renewal evidence portfolio; invest in priority academic supports; advocacy strategy',
    mitigationStatus: 'In Progress', targetScore: 6, tier: 'Tier 1 — Board Focus',
    kri: 'Authorizer satisfaction score; compliance audit findings count',
    lastReview: '2026-01-15', nextReview: '2026-04-15', trend: '→ Stable',
    notes: 'Next renewal cycle: 2027. WG monitoring authorizer signals.',
  },
  {
    id: 'R-002', name: 'Labor Relations & Workforce Stability', dateIdentified: '2025-11-15',
    description: 'Growing labor organizing activity, wage pressure, and evolving workforce expectations could materially affect staffing stability and operating costs.',
    lens: 'Existential', category: 'Talent & Culture', owner: 'CEO',
    likelihood: 3, impact: 5, velocity: 'Fast',
    controls: 'Competitive compensation analysis; employee engagement surveys; labor relations counsel',
    mitigation: 'Proactive engagement strategy; compensation benchmarking; culture investment; leadership pipeline development',
    mitigationStatus: 'In Progress', targetScore: 8, tier: 'Tier 1 — Board Focus',
    kri: 'Staff turnover rate; engagement survey scores; organizing activity indicators',
    lastReview: '2026-01-15', nextReview: '2026-04-15', trend: '↑ Increasing',
    notes: 'National charter labor trends accelerating. WG monitoring closely.',
  },
  {
    id: 'R-003', name: 'Tier 3/4 Student Behaviors', dateIdentified: '2025-11-15',
    description: 'Rising severity and frequency of serious student behavioral incidents impacting safety, culture, and instructional continuity across campuses.',
    lens: 'Core', category: 'Operational & Safety', owner: 'Chief Schools Officer',
    likelihood: 4, impact: 4, velocity: 'Moderate',
    controls: 'MTSS framework; crisis intervention teams; behavioral health partnerships; incident reporting systems',
    mitigation: 'Expand counseling capacity; strengthen de-escalation training; implement restorative practices; community partnerships',
    mitigationStatus: 'In Progress', targetScore: 8, tier: 'Tier 1 — Board Focus',
    kri: 'Tier 3/4 incident rate; suspension rate; counselor caseload ratio',
    lastReview: '2026-01-15', nextReview: '2026-04-15', trend: '↑ Increasing',
    notes: 'Post-pandemic behavioral trends persistent across urban networks.',
  },
  {
    id: 'R-004', name: 'Cybersecurity & Data Privacy', dateIdentified: '2025-11-15',
    description: 'Increasing sophistication of cyber threats targeting K-12 institutions, combined with expanding data privacy regulations and student data protection requirements.',
    lens: 'Emergent', category: 'Technology & Cyber', owner: 'CTO',
    likelihood: 3, impact: 4, velocity: 'Fast',
    controls: 'MFA; endpoint protection; annual penetration testing; data classification policy',
    mitigation: 'Cyber insurance enhancement; incident response plan update; staff phishing training; vendor security audits',
    mitigationStatus: 'In Progress', targetScore: 6, tier: 'Tier 2 — Executive Team',
    kri: 'Phishing test failure rate; patch compliance rate; incident response time',
    lastReview: '2026-01-15', nextReview: '2026-04-15', trend: '↑ Increasing',
    notes: 'Three peer networks experienced ransomware incidents in past 12 months.',
  },
  {
    id: 'R-005', name: 'Enrollment Volatility', dateIdentified: '2025-11-15',
    description: 'Demographic shifts, competition from district schools, and economic factors creating enrollment uncertainty that directly impacts revenue stability.',
    lens: 'Core', category: 'Financial', owner: 'CFO',
    likelihood: 3, impact: 4, velocity: 'Moderate',
    controls: 'Monthly enrollment tracking; campus-level forecasting; recruitment pipeline monitoring',
    mitigation: 'Diversified recruitment strategy; retention programs; community engagement; financial scenario planning',
    mitigationStatus: 'In Progress', targetScore: 6, tier: 'Tier 2 — Executive Team',
    kri: 'Enrollment vs. projection gap; application volume trend; attrition rate by campus',
    lastReview: '2026-01-15', nextReview: '2026-04-15', trend: '→ Stable',
    notes: 'SY26 enrollment tracking slightly above projection. Watch 9th grade yield.',
  },
];

// ─── FUNDRAISING ──────────────────────────────────────────────────────────

const FUND_PIPELINE: FundOpportunity[] = [
  { id: 'F-001', funder: 'MacArthur Foundation', amount: 500000, stage: 'solicitation', probability: 0.60, weighted: 300000, type: 'Foundation', contact: 'Sarah Chen', nextAction: 'Submit full proposal', dueDate: '2026-03-29', notes: 'Strong relationship. Focus on safety innovation.' },
  { id: 'F-002', funder: 'ISBE Innovation Grant', amount: 350000, stage: 'solicitation', probability: 0.60, weighted: 210000, type: 'Government', contact: 'James Wright', nextAction: 'Submit application', dueDate: '2026-04-03', notes: 'Competitive. Emphasize data-driven approach.' },
  { id: 'F-003', funder: 'Walton Family Foundation', amount: 1000000, stage: 'cultivation', probability: 0.35, weighted: 350000, type: 'Foundation', contact: 'Maria Lopez', nextAction: 'Site visit scheduled', dueDate: '2026-04-15', notes: 'Multi-year potential. Interested in network model.' },
  { id: 'F-004', funder: 'Chicago Community Trust', amount: 250000, stage: 'negotiation', probability: 0.80, weighted: 200000, type: 'Foundation', contact: 'David Kim', nextAction: 'Final terms review', dueDate: '2026-03-25', notes: 'Near close. Annual renewal.' },
  { id: 'F-005', funder: 'Individual Major Gift — Thompson', amount: 100000, stage: 'solicitation', probability: 0.60, weighted: 60000, type: 'Individual', contact: 'Robert Thompson', nextAction: 'Dinner meeting', dueDate: '2026-04-10', notes: 'Board member referral. First-time donor.' },
  { id: 'F-006', funder: 'Federal CSP Replication Grant', amount: 2000000, stage: 'qualification', probability: 0.15, weighted: 300000, type: 'Government', contact: 'DOE Program Office', nextAction: 'Intent to apply', dueDate: '2026-05-01', notes: 'High value, competitive. 18-month timeline.' },
  { id: 'F-007', funder: 'Crown Family Philanthropies', amount: 750000, stage: 'cultivation', probability: 0.35, weighted: 262500, type: 'Foundation', contact: 'Lisa Park', nextAction: 'Concept paper', dueDate: '2026-04-20', notes: 'Interested in college persistence outcomes.' },
  { id: 'F-008', funder: 'Annual Gala (Net Revenue)', amount: 800000, stage: 'negotiation', probability: 0.80, weighted: 640000, type: 'Event', contact: 'Development Team', nextAction: 'Confirm sponsors', dueDate: '2026-05-15', notes: 'On track. 85% of sponsorships confirmed.' },
];

// ─── COMPLIANCE ───────────────────────────────────────────────────────────

const DEADLINES: Deadline[] = [
  { item: 'Annual Title I Compliance Report', daysOut: 7, owner: 'COO', status: 'at-risk' },
  { item: 'Authorizer Financial Benchmark Submission', daysOut: 14, owner: 'CFO', status: 'on-track' },
  { item: 'Board Governance Self-Assessment', daysOut: 28, owner: 'President', status: 'on-track' },
  { item: 'Special Education Compliance Audit', daysOut: 42, owner: 'Chief Schools Officer', status: 'on-track' },
  { item: 'Annual Fire Safety Inspections (All Campuses)', daysOut: 56, owner: 'COO', status: 'on-track' },
];

// ─── FACILITIES ───────────────────────────────────────────────────────────

const WORK_ORDERS: WorkOrder[] = [
  { id: 'WO-001', campus: 'Austin', description: 'HVAC failure — 3rd floor classrooms', priority: 'urgent', status: 'in-progress', dateSubmitted: '2026-03-20', assignedTo: 'Midwest Mechanical', category: 'hvac', estimatedCost: 18500, daysOpen: 3, notes: 'Compressor failure on RTU-3. Temporary portable units deployed. Parts on order — ETA 3/25.' },
  { id: 'WO-002', campus: 'Loop', description: 'Water main leak — basement level', priority: 'urgent', status: 'open', dateSubmitted: '2026-03-22', assignedTo: 'City Plumbing', category: 'plumbing', estimatedCost: 12000, daysOpen: 1, notes: 'Active leak near boiler room. Water shut off to affected section. Awaiting emergency plumber.' },
  { id: 'WO-003', campus: 'Englewood', description: 'Broken exterior door lock — main entrance', priority: 'high', status: 'in-progress', dateSubmitted: '2026-03-18', assignedTo: 'SecureTech', category: 'security', estimatedCost: 2200, daysOpen: 5, notes: 'Access control panel malfunction. Temporary manual lock installed. Security posted at entrance.' },
  { id: 'WO-004', campus: 'Chatham', description: 'Gymnasium floor refinishing', priority: 'medium', status: 'open', dateSubmitted: '2026-03-15', assignedTo: 'TBD', category: 'general', estimatedCost: 35000, daysOpen: 8 },
  { id: 'WO-005', campus: 'Woodlawn', description: 'Parking lot pothole repair', priority: 'low', status: 'open', dateSubmitted: '2026-03-10', assignedTo: 'TBD', category: 'grounds', estimatedCost: 4500, daysOpen: 13 },
  { id: 'WO-006', campus: 'Garfield Park', description: 'Classroom lighting replacement — 2nd floor', priority: 'medium', status: 'in-progress', dateSubmitted: '2026-03-12', assignedTo: 'Facilities Team', category: 'electrical', estimatedCost: 8200, daysOpen: 11 },
  { id: 'WO-007', campus: 'North Lawndale', description: 'Roof leak — science lab', priority: 'high', status: 'open', dateSubmitted: '2026-03-21', assignedTo: 'TBD', category: 'structural', estimatedCost: 15000, daysOpen: 2, notes: 'Active drip during rain. Buckets placed. Need emergency roof assessment.' },
  { id: 'WO-008', campus: 'Humboldt Park', description: 'Elevator inspection overdue', priority: 'high', status: 'open', dateSubmitted: '2026-03-19', assignedTo: 'Otis Elevator', category: 'elevator', estimatedCost: 3500, daysOpen: 4, notes: 'State inspection due by 3/31. Elevator locked out until inspection completed.' },
  { id: 'WO-009', campus: 'Roseland', description: 'Cafeteria dishwasher replacement', priority: 'medium', status: 'open', dateSubmitted: '2026-03-14', assignedTo: 'TBD', category: 'general', estimatedCost: 9800, daysOpen: 9 },
  { id: 'WO-010', campus: 'Auburn Gresham', description: 'Fire alarm panel zone 3 fault', priority: 'urgent', status: 'in-progress', dateSubmitted: '2026-03-23', assignedTo: 'Siemens Fire Safety', category: 'fire-safety', estimatedCost: 6500, daysOpen: 0, notes: 'Zone 3 showing intermittent faults. CFD notified. Technician en route.' },
  { id: 'WO-011', campus: 'Loop', description: 'ADA ramp concrete deterioration', priority: 'high', status: 'open', dateSubmitted: '2026-03-17', assignedTo: 'TBD', category: 'structural', estimatedCost: 22000, daysOpen: 6 },
  { id: 'WO-012', campus: 'Chatham', description: 'Boiler pressure fluctuation', priority: 'medium', status: 'in-progress', dateSubmitted: '2026-03-11', assignedTo: 'Midwest Mechanical', category: 'hvac', estimatedCost: 5400, daysOpen: 12 },
];

const CAPITAL_PROJECTS: CapitalProject[] = [
  {
    id: 'CP-001', name: 'Englewood Science Lab Renovation', campus: 'Englewood',
    budget: 1200000, spent: 840000, status: 'on-track', completion: 70,
    description: 'Complete renovation of 4 science labs including new lab benches, fume hoods, gas lines, and technology infrastructure. Supports AP Chemistry and Biology programs.',
    category: 'Academic Facilities', startDate: '2025-09-15', targetDate: '2026-06-30',
    projectManager: 'Maria Santos', contractor: 'Turner Construction',
    milestones: [
      { label: 'Design Complete', date: '2025-10-15', completed: true },
      { label: 'Demolition', date: '2025-11-30', completed: true },
      { label: 'Rough-In (MEP)', date: '2026-01-31', completed: true },
      { label: 'Casework Install', date: '2026-03-15', completed: true },
      { label: 'Technology Install', date: '2026-04-30', completed: false },
      { label: 'Final Inspection', date: '2026-05-31', completed: false },
      { label: 'Punch List & Handover', date: '2026-06-30', completed: false },
    ],
    riskNotes: 'Fume hood lead time extended by 2 weeks. Adjusted schedule accommodates delay.',
  },
  {
    id: 'CP-002', name: 'Austin HVAC System Replacement', campus: 'Austin',
    budget: 2100000, spent: 1890000, status: 'at-risk', completion: 85,
    description: 'Full replacement of 20-year-old rooftop units (RTU-1 through RTU-8) with high-efficiency VRF system. Includes new ductwork and BMS controls.',
    category: 'Building Systems', startDate: '2025-06-01', targetDate: '2026-04-15',
    projectManager: 'James Washington', contractor: 'Midwest Mechanical',
    milestones: [
      { label: 'Engineering Design', date: '2025-07-15', completed: true },
      { label: 'Equipment Procurement', date: '2025-09-30', completed: true },
      { label: 'RTU Removal (Phase 1)', date: '2025-11-30', completed: true },
      { label: 'New VRF Install', date: '2026-02-28', completed: true },
      { label: 'Ductwork & Controls', date: '2026-03-31', completed: false },
      { label: 'Commissioning & Balancing', date: '2026-04-15', completed: false },
    ],
    riskNotes: 'BUDGET ALERT: $1.89M spent of $2.1M budget with 15% work remaining. Change order #3 ($142K) for unforeseen asbestos abatement. Requesting $250K contingency release.',
  },
  {
    id: 'CP-003', name: 'Network-Wide Security Camera Upgrade', campus: 'All',
    budget: 800000, spent: 320000, status: 'on-track', completion: 40,
    description: 'Upgrade all 10 campuses from analog to IP-based camera systems with AI-powered analytics, license plate recognition, and centralized monitoring.',
    category: 'Safety & Security', startDate: '2025-11-01', targetDate: '2026-08-31',
    projectManager: 'David Chen', contractor: 'SecureTech Solutions',
    milestones: [
      { label: 'Network Assessment', date: '2025-12-15', completed: true },
      { label: 'Phase 1: Loop & Englewood', date: '2026-02-28', completed: true },
      { label: 'Phase 2: Woodlawn, Auburn Gresham, Chatham', date: '2026-04-30', completed: false },
      { label: 'Phase 3: Austin, North Lawndale, Garfield Park', date: '2026-06-30', completed: false },
      { label: 'Phase 4: Roseland, Humboldt Park', date: '2026-08-15', completed: false },
      { label: 'Central Monitoring Go-Live', date: '2026-08-31', completed: false },
    ],
  },
  {
    id: 'CP-004', name: 'Chatham Roof Replacement', campus: 'Chatham',
    budget: 950000, spent: 0, status: 'on-track', completion: 5,
    description: 'Full roof replacement including insulation upgrade to R-30. Current roof is 18 years old with multiple patch repairs. Scheduled for summer 2026.',
    category: 'Building Envelope', startDate: '2026-06-01', targetDate: '2026-08-15',
    projectManager: 'Maria Santos', contractor: 'Wiss Janney Elstner',
    milestones: [
      { label: 'Bid Package Released', date: '2026-03-01', completed: true },
      { label: 'Contractor Selection', date: '2026-04-15', completed: false },
      { label: 'Material Procurement', date: '2026-05-15', completed: false },
      { label: 'Tear-Off & Install', date: '2026-07-31', completed: false },
      { label: 'Final Inspection', date: '2026-08-15', completed: false },
    ],
  },
  {
    id: 'CP-005', name: 'Woodlawn Athletic Field Renovation', campus: 'Woodlawn',
    budget: 650000, spent: 195000, status: 'on-track', completion: 30,
    description: 'New synthetic turf field, track resurfacing, LED field lighting, and bleacher replacement. Community partnership with Chicago Park District.',
    category: 'Athletics', startDate: '2026-01-15', targetDate: '2026-07-31',
    projectManager: 'James Washington', contractor: 'FieldTurf Chicago',
    milestones: [
      { label: 'Grading & Drainage', date: '2026-02-28', completed: true },
      { label: 'Turf Base Install', date: '2026-04-15', completed: false },
      { label: 'Track Resurfacing', date: '2026-05-31', completed: false },
      { label: 'Lighting & Bleachers', date: '2026-07-15', completed: false },
      { label: 'Final Walkthrough', date: '2026-07-31', completed: false },
    ],
  },
];

// ─── CAMPUS CONDITIONS ───────────────────────────────────────────────────

const CAMPUS_CONDITIONS: CampusCondition[] = [
  { campusId: 1, campusName: 'Loop', fciScore: 82, buildingAge: 12, sqft: 95000, deferredMaintenance: 420000, lastInspection: '2026-01-15', criticalSystems: { hvac: 'good', roof: 'good', plumbing: 'fair', electrical: 'good', fireSafety: 'good', elevator: 'good' } },
  { campusId: 2, campusName: 'Englewood', fciScore: 71, buildingAge: 22, sqft: 78000, deferredMaintenance: 890000, lastInspection: '2025-11-20', criticalSystems: { hvac: 'fair', roof: 'fair', plumbing: 'fair', electrical: 'good', fireSafety: 'good', elevator: 'n/a' } },
  { campusId: 3, campusName: 'Woodlawn', fciScore: 76, buildingAge: 18, sqft: 82000, deferredMaintenance: 650000, lastInspection: '2025-12-10', criticalSystems: { hvac: 'fair', roof: 'good', plumbing: 'good', electrical: 'fair', fireSafety: 'good', elevator: 'n/a' } },
  { campusId: 4, campusName: 'Auburn Gresham', fciScore: 68, buildingAge: 28, sqft: 71000, deferredMaintenance: 1120000, lastInspection: '2025-10-05', criticalSystems: { hvac: 'poor', roof: 'fair', plumbing: 'poor', electrical: 'fair', fireSafety: 'fair', elevator: 'n/a' } },
  { campusId: 5, campusName: 'Roseland', fciScore: 63, buildingAge: 35, sqft: 62000, deferredMaintenance: 1450000, lastInspection: '2025-09-18', criticalSystems: { hvac: 'poor', roof: 'poor', plumbing: 'fair', electrical: 'poor', fireSafety: 'fair', elevator: 'n/a' } },
  { campusId: 6, campusName: 'Chatham', fciScore: 72, buildingAge: 20, sqft: 88000, deferredMaintenance: 780000, lastInspection: '2025-12-01', criticalSystems: { hvac: 'fair', roof: 'poor', plumbing: 'good', electrical: 'good', fireSafety: 'good', elevator: 'fair' } },
  { campusId: 7, campusName: 'Austin', fciScore: 58, buildingAge: 32, sqft: 74000, deferredMaintenance: 1680000, lastInspection: '2025-11-01', criticalSystems: { hvac: 'critical', roof: 'fair', plumbing: 'fair', electrical: 'poor', fireSafety: 'good', elevator: 'poor' } },
  { campusId: 8, campusName: 'North Lawndale', fciScore: 65, buildingAge: 25, sqft: 48000, deferredMaintenance: 920000, lastInspection: '2025-10-22', criticalSystems: { hvac: 'fair', roof: 'poor', plumbing: 'fair', electrical: 'fair', fireSafety: 'good', elevator: 'n/a' } },
  { campusId: 9, campusName: 'Garfield Park', fciScore: 74, buildingAge: 15, sqft: 68000, deferredMaintenance: 540000, lastInspection: '2026-01-08', criticalSystems: { hvac: 'good', roof: 'good', plumbing: 'fair', electrical: 'good', fireSafety: 'good', elevator: 'n/a' } },
  { campusId: 10, campusName: 'Humboldt Park', fciScore: 69, buildingAge: 24, sqft: 56000, deferredMaintenance: 980000, lastInspection: '2025-11-15', criticalSystems: { hvac: 'fair', roof: 'fair', plumbing: 'poor', electrical: 'fair', fireSafety: 'good', elevator: 'poor' } },
];

// ─── VENDOR CONTRACTS ────────────────────────────────────────────────────

const VENDOR_CONTRACTS: VendorContract[] = [
  { id: 'VC-001', vendor: 'Midwest Mechanical', service: 'HVAC Maintenance & Repair', annualValue: 285000, startDate: '2024-07-01', endDate: '2026-06-30', status: 'expiring', rating: 4, campuses: ['All'] },
  { id: 'VC-002', vendor: 'SecureTech Solutions', service: 'Security Systems & Monitoring', annualValue: 192000, startDate: '2025-01-01', endDate: '2027-12-31', status: 'active', rating: 5, campuses: ['All'] },
  { id: 'VC-003', vendor: 'CleanCorp Chicago', service: 'Janitorial Services', annualValue: 420000, startDate: '2024-09-01', endDate: '2026-08-31', status: 'active', rating: 3, campuses: ['All'] },
  { id: 'VC-004', vendor: 'Otis Elevator', service: 'Elevator Maintenance', annualValue: 48000, startDate: '2025-03-01', endDate: '2027-02-28', status: 'active', rating: 4, campuses: ['Loop', 'Chatham', 'Humboldt Park'] },
  { id: 'VC-005', vendor: 'Siemens Fire Safety', service: 'Fire Alarm Monitoring & Inspection', annualValue: 96000, startDate: '2024-01-01', endDate: '2026-12-31', status: 'active', rating: 5, campuses: ['All'] },
  { id: 'VC-006', vendor: 'City Plumbing Partners', service: 'Emergency Plumbing', annualValue: 75000, startDate: '2025-07-01', endDate: '2026-06-30', status: 'expiring', rating: 3, campuses: ['All'] },
  { id: 'VC-007', vendor: 'Wiss Janney Elstner', service: 'Building Envelope Consulting', annualValue: 45000, startDate: '2025-01-01', endDate: '2026-12-31', status: 'active', rating: 5, campuses: ['Chatham', 'Roseland', 'North Lawndale'] },
  { id: 'VC-008', vendor: 'ComEd Energy Solutions', service: 'Energy Management & LED Retrofit', annualValue: 62000, startDate: '2025-06-01', endDate: '2027-05-31', status: 'active', rating: 4, campuses: ['All'] },
];

// ─── CIVIC ────────────────────────────────────────────────────────────────

const PENDING_BILLS: PendingBill[] = [
  { name: 'HB 4821', summary: 'Charter authorization renewal process changes', risk: 'WATCH', status: 'In Committee' },
  { name: 'SB 2907', summary: 'Per-pupil funding equity adjustment', risk: 'POSITIVE', status: 'In Committee' },
  { name: 'HB 5102', summary: 'School safety reporting requirements expansion', risk: 'WATCH', status: 'Introduced' },
];

// ═══════════════════════════════════════════════════════════════════════════
// THE COMPLETE VERITAS DEMO DATASET
// ═══════════════════════════════════════════════════════════════════════════

const now = new Date().toISOString();

export const VERITAS_DEFAULTS: SlateStore = {
  network: {
    name: 'Veritas Charter Schools',
    city: 'Chicago',
    state: 'IL',
    campusCount: 10,
    grades: '9-12',
    foundedYear: 2001,
    authorizer: 'Chicago Public Schools',
    revenuePerPupil: 16345,
    campuses: CAMPUSES,
  },

  enrollment: {
    currentSY: 'SY26',
    networkTotal: 6823,
    targetEnrollment: 6823,
    byCampus: CAMPUS_ENROLLMENT,
    historical: HISTORICAL_ENROLLMENT,
    forecasts: ENROLLMENT_FORECASTS,
    lastUpdated: now,
    source: 'Demo Data',
  },

  financials: {
    fiscalYear: 'FY26',
    budget: BUDGET,
    actuals: MONTHLY_ACTUALS,
    covenants: COVENANTS,
    historical: HISTORICAL_FINANCIALS,
    scenarios: SCENARIOS,
    supportTeamDepartments: SUPPORT_TEAM_DEPARTMENTS,
    compensation: COMPENSATION,
    ytdSummary: {
      revActual: 80.8,
      revBudget: 78.5,
      expActual: 75.5,
      expBudget: 74.2,
      surplus: 5.3,
      dscr: 3.47,
      daysCash: 215,
      currentRatio: 3.00,
      netAssetRatio: 69.1,
    },
    lastUpdated: now,
    source: 'Demo Data',
  },

  staff: {
    totalPositions: 870,
    activeStaff: 831,
    vacancies: 29,
    onLeave: 10,
    licensureRate: 77,
    byCampus: CAMPUS_STAFF,
    vacanciesByDept: VACANCIES_BY_DEPT,
    lastUpdated: now,
    source: 'Demo Data',
  },

  risks: {
    register: RISKS,
    lastReviewDate: '2026-01-15',
    lastUpdated: now,
    source: 'Demo Data',
  },

  fundraising: {
    pipeline: FUND_PIPELINE,
    closedYTD: 1850000,
    goal: 10000000,
    lastUpdated: now,
    source: 'Demo Data',
  },

  compliance: {
    deadlines: DEADLINES,
    auditReadiness: 78,
    openPolicies: 4,
    lastUpdated: now,
    source: 'Demo Data',
  },

  facilities: {
    workOrders: WORK_ORDERS,
    capitalProjects: CAPITAL_PROJECTS,
    vendorContractsExpiring: 2,
    lastUpdated: now,
    source: 'Demo Data',
    campusConditions: CAMPUS_CONDITIONS,
    vendorContracts: VENDOR_CONTRACTS,
    networkFCI: 70,
    totalDeferredMaintenance: 9430000,
    annualCapitalBudget: 5700000,
    annualMaintenanceBudget: 1850000,
  },

  civic: {
    pendingBills: PENDING_BILLS,
    upcomingHearings: 1,
    hearingDate: 'March 18',
    hearingTopic: 'Charter Funding Equity Subcommittee',
    mediaMonitoring: 'No active coverage. One pending Chalkbeat inquiry.',
    staleStakeholderRelationships: 3,
    lastUpdated: now,
    source: 'Demo Data',
  },

  role: 'ceo',
  selectedCampusId: 1,
  emergencyEvents: [],
};
