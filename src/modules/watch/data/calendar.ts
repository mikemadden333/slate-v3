/** Noble Schools 2025-26 Academic Calendar — Complete */

export const SCHOOL_YEAR_START = '2025-08-20';
export const SCHOOL_YEAR_END = '2026-06-09';

/** Holidays — no school, offices closed (YYYY-MM-DD) */
export const HOLIDAYS: string[] = [
  '2025-09-01', // Labor Day
  '2025-10-13', // Indigenous Peoples Day
  '2025-11-11', // Veterans Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents Day
  '2026-05-25', // Memorial Day
];

/** Break ranges — no school [start, end] inclusive */
export const BREAKS: Array<{ name: string; start: string; end: string }> = [
  { name: 'Fall Break',   start: '2025-11-24', end: '2025-11-28' },
  { name: 'Winter Break', start: '2025-12-22', end: '2026-01-02' },
  { name: 'Spring Break', start: '2026-03-23', end: '2026-03-27' },
];

/** Interim assessment weeks [start, end] inclusive */
export const INTERIMS: Array<{ name: string; start: string; end: string }> = [
  { name: 'Interim 1', start: '2025-10-03', end: '2025-10-08' },
  { name: 'Interim 2', start: '2025-12-05', end: '2025-12-11' },
  { name: 'Interim 3', start: '2026-02-20', end: '2026-02-25' },
];

/** Finals weeks */
export const FINALS: Array<{ name: string; start: string; end: string }> = [
  { name: 'Semester 1 Finals', start: '2025-12-16', end: '2025-12-18' },
  { name: 'Semester 2 Finals', start: '2026-06-04', end: '2026-06-08' },
];

/** Quarter start dates */
export const QUARTER_STARTS: string[] = [
  '2025-08-20', // Q1
  '2025-10-20', // Q2
  '2026-01-06', // Q3
  '2026-04-06', // Q4
];

/** RCPU (Report Card Pick-Up) dates */
export const RCPU_DATES: string[] = [
  '2025-10-24',
  '2026-01-09',
  '2026-04-10',
  '2026-06-11',
];

/** Helper: is a given date string within a range? (inclusive) */
function inRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

/** Format Date to YYYY-MM-DD in local time */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Is the given date within the Noble school year? */
export function isWithinSchoolYear(d: Date): boolean {
  const s = toDateStr(d);
  return s >= SCHOOL_YEAR_START && s <= SCHOOL_YEAR_END;
}

/** Is the given date a holiday? */
export function isHoliday(d: Date): boolean {
  return HOLIDAYS.includes(toDateStr(d));
}

/** Is the given date in a break? Returns break name or null */
export function getBreak(d: Date): string | null {
  const s = toDateStr(d);
  for (const b of BREAKS) {
    if (inRange(s, b.start, b.end)) return b.name;
  }
  return null;
}

/** Is the given date in an interim week? Returns interim name or null */
export function getInterim(d: Date): string | null {
  const s = toDateStr(d);
  for (const im of INTERIMS) {
    if (inRange(s, im.start, im.end)) return im.name;
  }
  return null;
}

/** Is the given date in a finals week? Returns finals name or null */
export function getFinals(d: Date): string | null {
  const s = toDateStr(d);
  for (const f of FINALS) {
    if (inRange(s, f.start, f.end)) return f.name;
  }
  return null;
}

/** Is the given date an RCPU day? */
export function isRCPU(d: Date): boolean {
  return RCPU_DATES.includes(toDateStr(d));
}

/** Is the given date a school day? (weekday, not holiday, not break, within school year) */
export function isSchoolDay(d: Date): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false; // weekend
  if (!isWithinSchoolYear(d)) return false;
  if (isHoliday(d)) return false;
  if (getBreak(d) !== null) return false;
  return true;
}

/**
 * Get calendar context string for the given date.
 * Used in AI briefing prompts to provide academic context.
 */
export function getCalendarContext(d: Date): string {
  const parts: string[] = [];

  const interim = getInterim(d);
  if (interim) parts.push(`${interim} assessment week`);

  const finals = getFinals(d);
  if (finals) parts.push(`${finals} week`);

  if (isRCPU(d)) parts.push('Report Card Pick-Up day — elevated parent presence on campus');

  const brk = getBreak(d);
  if (brk) parts.push(`${brk} — no school`);

  if (isHoliday(d)) parts.push('Holiday — no school, offices closed');

  if (!isWithinSchoolYear(d)) parts.push('Outside school year — summer break');

  if (parts.length === 0) parts.push('Regular school day');

  return parts.join('; ');
}
