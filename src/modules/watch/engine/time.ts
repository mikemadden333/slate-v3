/**
 * School period detection and time utilities.
 * Seven operational states based on time of day and calendar.
 */

import type { SchoolPeriod } from './types';
import type { Campus } from '../data/campuses';
import { isSchoolDay, getCalendarContext as _getCalendarContext } from '../data/calendar';

export { isSchoolDay, isHoliday, getCalendarContext } from '../data/calendar';

/**
 * Determine the current school period for a campus at a given time.
 *
 * PRE_SCHOOL:   before 7:00am on school days
 * ARRIVAL:      7:00 — 8:00am
 * SCHOOL_DAY:   8:00am — 2:10pm
 * DISMISSAL:    2:10pm — 4:00pm
 * AFTER_SCHOOL: 4:00pm — 8:00pm
 * OVERNIGHT:    8:00pm — 7:00am
 * NO_SCHOOL:    weekends, holidays, breaks
 */
export function getSchoolPeriod(now: Date, _campus: Campus): SchoolPeriod {
  if (!isSchoolDay(now)) return 'NO_SCHOOL';

  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;

  // PRE_SCHOOL: before 7:00am
  if (totalMin < 420) return 'PRE_SCHOOL';
  // ARRIVAL: 7:00 — 8:00
  if (totalMin < 480) return 'ARRIVAL';
  // SCHOOL_DAY: 8:00 — 14:10
  if (totalMin < 850) return 'SCHOOL_DAY';
  // DISMISSAL: 14:10 (2:10pm) — 16:00 (4:00pm)
  if (totalMin < 960) return 'DISMISSAL';
  // AFTER_SCHOOL: 16:00 — 20:00
  if (totalMin < 1200) return 'AFTER_SCHOOL';
  // OVERNIGHT: 20:00+
  return 'OVERNIGHT';
}

/** Minutes from now until the campus arrival time (arrH:arrM). Negative if past. */
export function minutesToArrival(now: Date, campus: Campus): number {
  const arrMin = campus.arrH * 60 + campus.arrM;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return arrMin - nowMin;
}

/** Minutes from now until the campus dismissal time (dH:dM). Negative if past. */
export function minutesToDismissal(now: Date, campus: Campus): number {
  // dH is 15, dM is 10 → 3:10pm = 15*60+10 = 910
  // But spec says dismissal hour 15 minute 10 → that's 15:10 = 3:10pm
  const disMin = campus.dH * 60 + campus.dM;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return disMin - nowMin;
}

/** Format minutes until an event as a human-readable countdown. */
export function fmtCountdown(minutes: number): string {
  if (minutes <= 0) return 'Now';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Get the Noble calendar context for a date (re-export for convenience). */
export function getNobleCalendarContext(d: Date): string {
  return _getCalendarContext(d);
}
