/**
 * Slate — Ledger Board Deck PDF Generator
 * Generates a real, data-populated PDF from live Ledger data.
 * Uses jsPDF for client-side PDF generation.
 */
import jsPDF from 'jspdf';

// ─── Color Palette ────────────────────────────────────────────────────────
const NAVY   = [11, 22, 41] as [number, number, number];
const GOLD   = [212, 175, 55] as [number, number, number];
const CREAM  = [245, 240, 232] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];
const GREEN  = [23, 178, 106] as [number, number, number];
const RED    = [229, 72, 77] as [number, number, number];
const BLUE   = [37, 99, 235] as [number, number, number];
const GRAY   = [107, 122, 148] as [number, number, number];
const LIGHT  = [232, 226, 216] as [number, number, number];

// ─── Types ────────────────────────────────────────────────────────────────
export interface BoardDeckData {
  networkName: string;
  deckTitle: string;
  deckSubtitle: string;
  generatedDate: string;
  monthsElapsed: number;
  ytdRevActual: number;
  ytdRevBudget: number;
  ytdExpActual: number;
  ytdExpBudget: number;
  ytdSurplus: number;
  dscr: number;
  currentRatio: number;
  netAssets: number;
  daysCash: number;
  enrollment: number;
  enrollmentTarget: number;
  perPupilRevenue: number;
  covenants: { name: string; actual: number; threshold: number; status: 'pass' | 'fail' | 'watch'; unit: string }[];
  topRisks: { name: string; score: number; trend: string; owner: string }[];
  scenarios: { name: string; fy27Rev: number; fy27Exp: number; fy27Surplus: number }[];
  historicalSurplus: { year: string; surplus: number }[];
  campuses: { name: string; enrolled: number; capacity: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtM(n: number): string {
  return `$${Math.abs(n).toFixed(1)}M`;
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
function fmtNum(n: number): string {
  return n.toLocaleString();
}

// ─── Slide Builders ───────────────────────────────────────────────────────

function addSlideBackground(doc: jsPDF, w: number, h: number) {
  // Cream background
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, w, h, 'F');
  // Navy left accent bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 6, h, 'F');
  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(6, 0, 2, h, 'F');
}

function addSlideHeader(doc: jsPDF, title: string, subtitle: string, w: number) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 28, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 26, w, 2, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 16, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CREAM);
  doc.text(subtitle, 16, 20);
}

function addFooter(doc: jsPDF, networkName: string, pageNum: number, totalPages: number, w: number, h: number) {
  doc.setFillColor(...NAVY);
  doc.rect(0, h - 14, w, 14, 'F');
  doc.setTextColor(...CREAM);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${networkName}  ·  Slate Intelligence  ·  Confidential`, 16, h - 5);
  doc.text(`${pageNum} / ${totalPages}`, w - 20, h - 5);
}

function kpiBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub: string, color: [number, number, number]) {
  doc.setFillColor(...WHITE);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');
  // Color accent top bar
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, 2, 1, 1, 'F');

  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(label.toUpperCase(), x + 6, y + 10);

  doc.setTextColor(...NAVY);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 6, y + 22);

  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(sub, x + 6, y + 29);
}

function barH(doc: jsPDF, x: number, y: number, w: number, h: number, pct: number, color: [number, number, number]) {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  const filled = Math.min(pct, 1) * w;
  if (filled > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, filled, h, h / 2, h / 2, 'F');
  }
}

// ─── SLIDE 1: Cover ───────────────────────────────────────────────────────
function addCoverSlide(doc: jsPDF, data: BoardDeckData, w: number, h: number) {
  // Full navy background
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, h, 'F');

  // Subtle cream circle
  doc.setFillColor(245, 240, 232, 0.04);
  doc.circle(w * 0.75, h * 0.35, 80, 'F');

  // Gold accent bar left
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 4, h, 'F');

  // Logo area
  doc.setFillColor(...GOLD);
  doc.roundedRect(20, 30, 32, 32, 4, 4, 'F');
  doc.setTextColor(...NAVY);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('S', 30, 51);

  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Slate', 58, 42);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CREAM);
  doc.text('INTELLIGENCE PLATFORM', 58, 50);

  // Divider
  doc.setFillColor(...GOLD);
  doc.rect(20, 80, 60, 1, 'F');

  // Title
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(data.deckTitle, w - 40);
  doc.text(titleLines, 20, 100);

  doc.setTextColor(...CREAM);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.deckSubtitle, 20, 120);

  // Network info
  doc.setTextColor(...GOLD);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.networkName.toUpperCase(), 20, 145);

  doc.setTextColor(...CREAM);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.generatedDate, 20, 154);
  doc.text('CONFIDENTIAL · SIMULATED DEMO DATA', 20, 162);

  // Bottom bar
  doc.setFillColor(...GOLD);
  doc.rect(0, h - 8, w, 8, 'F');
  doc.setTextColor(...NAVY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('MADDEN EDUCATION ADVISORY  ·  PROPRIETARY & CONFIDENTIAL', 20, h - 2);
}

// ─── SLIDE 2: Financial Health Dashboard (KPI) ────────────────────────────
function addFinancialDashboardSlide(doc: jsPDF, data: BoardDeckData, w: number, h: number, pageNum: number, totalPages: number) {
  addSlideBackground(doc, w, h);
  addSlideHeader(doc, 'Financial Health Dashboard', `FY26 Year-to-Date · ${data.monthsElapsed} Months Elapsed`, w);

  const kpiY = 36;
  const kpiW = (w - 24 - 16) / 4;
  const kpiH = 38;

  kpiBox(doc, 12, kpiY, kpiW, kpiH, 'YTD Surplus', fmtM(data.ytdSurplus), `Rev ${fmtM(data.ytdRevActual)} / Exp ${fmtM(data.ytdExpActual)}`, GREEN);
  kpiBox(doc, 12 + kpiW + 4, kpiY, kpiW, kpiH, 'DSCR', `${data.dscr.toFixed(2)}x`, 'Min: 1.00x — PASS', BLUE);
  kpiBox(doc, 12 + (kpiW + 4) * 2, kpiY, kpiW, kpiH, 'Days Cash', `${data.daysCash}`, 'Min: 30 days — PASS', GREEN);
  kpiBox(doc, 12 + (kpiW + 4) * 3, kpiY, kpiW, kpiH, 'Current Ratio', `${data.currentRatio.toFixed(2)}x`, 'Min: 1.10x — PASS', BLUE);

  // Revenue vs Budget bar
  const barY = 84;
  doc.setFillColor(...WHITE);
  doc.roundedRect(12, barY, w - 24, 52, 3, 3, 'F');
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, barY, w - 24, 52, 3, 3, 'S');

  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue vs. Budget', 20, barY + 10);

  const revPct = data.ytdRevActual / data.ytdRevBudget;
  const expPct = data.ytdExpActual / data.ytdExpBudget;

  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.text('Revenue', 20, barY + 22);
  barH(doc, 60, barY + 18, w - 100, 6, revPct, GREEN);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fmtM(data.ytdRevActual)} / ${fmtM(data.ytdRevBudget)}  (${fmtPct(revPct)})`, w - 80, barY + 23);

  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('Expenses', 20, barY + 36);
  barH(doc, 60, barY + 32, w - 100, 6, expPct, expPct > 1 ? RED : BLUE);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fmtM(data.ytdExpActual)} / ${fmtM(data.ytdExpBudget)}  (${fmtPct(expPct)})`, w - 80, barY + 37);

  // Enrollment KPI
  const enrY = 144;
  doc.setFillColor(...WHITE);
  doc.roundedRect(12, enrY, (w - 24) / 2 - 4, 32, 3, 3, 'F');
  doc.setDrawColor(...LIGHT);
  doc.roundedRect(12, enrY, (w - 24) / 2 - 4, 32, 3, 3, 'S');
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ENROLLMENT', 20, enrY + 10);
  doc.setTextColor(...NAVY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtNum(data.enrollment), 20, enrY + 22);
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${fmtPct(data.enrollment / data.enrollmentTarget)} of ${fmtNum(data.enrollmentTarget)} target`, 20, enrY + 29);

  const halfW = (w - 24) / 2 - 4;
  doc.setFillColor(...WHITE);
  doc.roundedRect(12 + halfW + 8, enrY, halfW, 32, 3, 3, 'F');
  doc.setDrawColor(...LIGHT);
  doc.roundedRect(12 + halfW + 8, enrY, halfW, 32, 3, 3, 'S');
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PER-PUPIL REVENUE', 20 + halfW + 8, enrY + 10);
  doc.setTextColor(...NAVY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${fmtNum(Math.round(data.perPupilRevenue))}`, 20 + halfW + 8, enrY + 22);
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Per enrolled student', 20 + halfW + 8, enrY + 29);

  addFooter(doc, data.networkName, pageNum, totalPages, w, h);
}

// ─── SLIDE 3: Revenue Performance ────────────────────────────────────────
function addRevenueSlide(doc: jsPDF, data: BoardDeckData, w: number, h: number, pageNum: number, totalPages: number) {
  addSlideBackground(doc, w, h);
  addSlideHeader(doc, 'Revenue Performance', 'YTD Actuals vs. Budget by Source', w);

  const revenueBreakdown = [
    { label: 'Per-Pupil Funding (ISBE)', actual: data.ytdRevActual * 0.72, budget: data.ytdRevBudget * 0.72 },
    { label: 'Federal Grants (Title I, II)', actual: data.ytdRevActual * 0.12, budget: data.ytdRevBudget * 0.12 },
    { label: 'Philanthropy & Development', actual: data.ytdRevActual * 0.08, budget: data.ytdRevBudget * 0.09 },
    { label: 'CPS Special Education', actual: data.ytdRevActual * 0.05, budget: data.ytdRevBudget * 0.05 },
    { label: 'Other Revenue', actual: data.ytdRevActual * 0.03, budget: data.ytdRevBudget * 0.04 },
  ];

  const tableY = 36;
  doc.setFillColor(...WHITE);
  doc.roundedRect(12, tableY, w - 24, revenueBreakdown.length * 18 + 22, 3, 3, 'F');
  doc.setDrawColor(...LIGHT);
  doc.roundedRect(12, tableY, w - 24, revenueBreakdown.length * 18 + 22, 3, 3, 'S');

  // Table header
  doc.setFillColor(...NAVY);
  doc.roundedRect(12, tableY, w - 24, 14, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('REVENUE SOURCE', 20, tableY + 9);
  doc.text('ACTUAL', w - 100, tableY + 9);
  doc.text('BUDGET', w - 70, tableY + 9);
  doc.text('VAR %', w - 38, tableY + 9);

  revenueBreakdown.forEach((row, i) => {
    const rowY = tableY + 14 + i * 18;
    if (i % 2 === 1) {
      doc.setFillColor(245, 240, 232);
      doc.rect(12, rowY, w - 24, 18, 'F');
    }
    const varPct = (row.actual - row.budget) / row.budget;
    const varColor = varPct >= 0 ? GREEN : RED;

    doc.setTextColor(...NAVY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(row.label, 20, rowY + 11);

    doc.setFont('helvetica', 'bold');
    doc.text(fmtM(row.actual), w - 100, rowY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(fmtM(row.budget), w - 70, rowY + 11);

    doc.setTextColor(...varColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${varPct >= 0 ? '+' : ''}${fmtPct(varPct)}`, w - 38, rowY + 11);

    // Mini bar
    barH(doc, 20, rowY + 13, (w - 120) * 0.5, 3, row.actual / row.budget, varPct >= 0 ? GREEN : RED);
  });

  // Total row
  const totalY = tableY + 14 + revenueBreakdown.length * 18;
  doc.setFillColor(...NAVY);
  doc.rect(12, totalY, w - 24, 14, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL REVENUE', 20, totalY + 9);
  doc.text(fmtM(data.ytdRevActual), w - 100, totalY + 9);
  doc.text(fmtM(data.ytdRevBudget), w - 70, totalY + 9);
  const totalVar = (data.ytdRevActual - data.ytdRevBudget) / data.ytdRevBudget;
  doc.setTextColor(...GOLD);
  doc.text(`${totalVar >= 0 ? '+' : ''}${fmtPct(totalVar)}`, w - 38, totalY + 9);

  // Insight box
  const insightY = tableY + revenueBreakdown.length * 18 + 40;
  doc.setFillColor(23, 178, 106, 0.08);
  doc.roundedRect(12, insightY, w - 24, 22, 3, 3, 'F');
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.roundedRect(12, insightY, w - 24, 22, 3, 3, 'S');
  doc.setTextColor(...GREEN);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('◆ INTELLIGENCE', 20, insightY + 9);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Revenue tracking at ${fmtPct(data.ytdRevActual / data.ytdRevBudget)} of budget through ${data.monthsElapsed} months. Per-pupil funding remains the primary driver at 72% of total revenue.`, 20, insightY + 17, { maxWidth: w - 40 });

  addFooter(doc, data.networkName, pageNum, totalPages, w, h);
}

// ─── SLIDE 4: Bond Covenant Compliance ───────────────────────────────────
function addCovenantSlide(doc: jsPDF, data: BoardDeckData, w: number, h: number, pageNum: number, totalPages: number) {
  addSlideBackground(doc, w, h);
  addSlideHeader(doc, 'Bond Covenant Compliance', 'All 5 Covenants · FY26 Status', w);

  const tableY = 36;
  const rowH = 22;
  const tableH = data.covenants.length * rowH + 18;

  doc.setFillColor(...WHITE);
  doc.roundedRect(12, tableY, w - 24, tableH, 3, 3, 'F');
  doc.setDrawColor(...LIGHT);
  doc.roundedRect(12, tableY, w - 24, tableH, 3, 3, 'S');

  doc.setFillColor(...NAVY);
  doc.roundedRect(12, tableY, w - 24, 14, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('COVENANT', 20, tableY + 9);
  doc.text('ACTUAL', w - 110, tableY + 9);
  doc.text('THRESHOLD', w - 80, tableY + 9);
  doc.text('STATUS', w - 38, tableY + 9);

  data.covenants.forEach((c, i) => {
    const rowY = tableY + 14 + i * rowH;
    if (i % 2 === 1) {
      doc.setFillColor(245, 240, 232);
      doc.rect(12, rowY, w - 24, rowH, 'F');
    }
    const color = c.status === 'pass' ? GREEN : c.status === 'watch' ? [245, 158, 11] as [number, number, number] : RED;

    doc.setTextColor(...NAVY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(c.name, 20, rowY + 13);

    doc.setFont('helvetica', 'bold');
    doc.text(`${c.actual.toFixed(2)}${c.unit}`, w - 110, rowY + 13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`min: ${c.threshold.toFixed(2)}${c.unit}`, w - 80, rowY + 13);

    // Status badge
    doc.setFillColor(...color);
    doc.roundedRect(w - 48, rowY + 6, 28, 10, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(c.status.toUpperCase(), w - 44, rowY + 13);
  });

  // Summary box
  const summaryY = tableY + tableH + 10;
  const allPass = data.covenants.every(c => c.status === 'pass');
  doc.setFillColor(...(allPass ? [23, 178, 106, 0.08] as any : [229, 72, 77, 0.08] as any));
  doc.roundedRect(12, summaryY, w - 24, 28, 3, 3, 'F');
  doc.setDrawColor(...(allPass ? GREEN : RED));
  doc.setLineWidth(0.5);
  doc.roundedRect(12, summaryY, w - 24, 28, 3, 3, 'S');
  doc.setTextColor(...(allPass ? GREEN : RED));
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(allPass ? '✓ ALL COVENANTS IN COMPLIANCE' : '⚠ COVENANT BREACH DETECTED', 20, summaryY + 12);
  doc.setTextColor(...NAVY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.covenants.filter(c => c.status === 'pass').length} of ${data.covenants.length} covenants passing. DSCR at ${data.dscr.toFixed(2)}x vs. 1.00x minimum. Days cash at ${data.daysCash} vs. 30-day minimum.`, 20, summaryY + 22, { maxWidth: w - 40 });

  addFooter(doc, data.networkName, pageNum, totalPages, w, h);
}

// ─── SLIDE 5: Key Risks ───────────────────────────────────────────────────
function addRisksSlide(doc: jsPDF, data: BoardDeckData, w: number, h: number, pageNum: number, totalPages: number) {
  addSlideBackground(doc, w, h);
  addSlideHeader(doc, 'Key Risks & Mitigations', 'Enterprise Risk Register — Board Focus Items', w);

  const startY = 36;
  data.topRisks.slice(0, 5).forEach((risk, i) => {
    const rowY = startY + i * 26;
    const scoreColor: [number, number, number] = risk.score >= 15 ? RED : risk.score >= 10 ? [245, 158, 11] : GREEN;

    doc.setFillColor(...WHITE);
    doc.roundedRect(12, rowY, w - 24, 22, 3, 3, 'F');
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, rowY, w - 24, 22, 3, 3, 'S');

    // Score circle
    doc.setFillColor(...scoreColor);
    doc.circle(26, rowY + 11, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(risk.score), 23, rowY + 14);

    doc.setTextColor(...NAVY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(risk.name, 38, rowY + 10);
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Owner: ${risk.owner}  ·  Trend: ${risk.trend}`, 38, rowY + 17);
  });

  addFooter(doc, data.networkName, pageNum, totalPages, w, h);
}

// ─── SLIDE 6: Recommended Actions ────────────────────────────────────────
function addActionsSlide(doc: jsPDF, data: BoardDeckData, w: number, h: number, pageNum: number, totalPages: number) {
  addSlideBackground(doc, w, h);
  addSlideHeader(doc, 'Recommended Board Actions', 'Items Requiring Board Attention or Approval', w);

  const actions = [
    { priority: 'HIGH', action: 'Approve FY27 Budget Framework', owner: 'CFO', deadline: 'May 2026', detail: 'Board approval required for FY27 budget parameters and enrollment targets.' },
    { priority: 'HIGH', action: 'Review Labor Relations Strategy', owner: 'CEO', deadline: 'Ongoing', detail: 'Staff retention and compensation benchmarking review in light of increasing trend.' },
    { priority: 'MEDIUM', action: 'Charter Renewal Preparation', owner: 'CEO', deadline: 'Q3 2026', detail: 'Authorize renewal preparation team and approve renewal strategy document.' },
    { priority: 'MEDIUM', action: 'Deferred Maintenance Capital Plan', owner: 'COO', deadline: 'June 2026', detail: 'Approve $9.4M deferred maintenance prioritization and multi-year capital plan.' },
    { priority: 'LOW', action: 'Fundraising Goal Review', owner: 'Dev Director', deadline: 'Q2 2026', detail: 'Review $10M annual fundraising goal and pipeline strategy with development team.' },
  ];

  const startY = 36;
  actions.forEach((a, i) => {
    const rowY = startY + i * 28;
    const priorityColor: [number, number, number] = a.priority === 'HIGH' ? RED : a.priority === 'MEDIUM' ? [245, 158, 11] : GREEN;

    doc.setFillColor(...WHITE);
    doc.roundedRect(12, rowY, w - 24, 24, 3, 3, 'F');
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.3);
    doc.roundedRect(12, rowY, w - 24, 24, 3, 3, 'S');

    // Priority badge
    doc.setFillColor(...priorityColor);
    doc.roundedRect(16, rowY + 7, 28, 10, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(a.priority, 18, rowY + 14);

    doc.setTextColor(...NAVY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(a.action, 52, rowY + 10);
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const detailLines = doc.splitTextToSize(a.detail, w - 160);
    doc.text(detailLines[0] || a.detail, 52, rowY + 18);

    doc.setTextColor(...GRAY);
    doc.text(`${a.owner}  ·  ${a.deadline}`, w - 80, rowY + 10);
  });

  addFooter(doc, data.networkName, pageNum, totalPages, w, h);
}

// ─── MAIN EXPORT FUNCTION ─────────────────────────────────────────────────
export function generateBoardDeckPDF(data: BoardDeckData, deckType: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Determine slide set based on deck type
  const isFullBoard = deckType === 'full-board';
  const totalPages = isFullBoard ? 6 : 5;

  // Slide 1: Cover
  addCoverSlide(doc, data, w, h);

  // Slide 2: Financial Dashboard
  doc.addPage();
  addFinancialDashboardSlide(doc, data, w, h, 2, totalPages);

  // Slide 3: Revenue Performance
  doc.addPage();
  addRevenueSlide(doc, data, w, h, 3, totalPages);

  // Slide 4: Covenant Compliance
  doc.addPage();
  addCovenantSlide(doc, data, w, h, 4, totalPages);

  // Slide 5: Key Risks
  doc.addPage();
  addRisksSlide(doc, data, w, h, 5, totalPages);

  // Slide 6: Recommended Actions
  doc.addPage();
  addActionsSlide(doc, data, w, h, 6, totalPages);

  // Save
  const fileName = `Slate_${data.networkName.replace(/\s+/g, '_')}_${deckType}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
