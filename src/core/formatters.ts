/**
 * Slate v3 — Formatters
 * Every number, date, and currency formatter in one place.
 */

/** Format as dollar: $XXX.XM for millions, $X.XK for thousands */
export function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Format as full dollar amount with commas: $1,234,567 */
export function fmtFull(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Format number with commas */
export function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

/** Format as percentage with 1 decimal place */
export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Format as DSCR ratio: X.XXx */
export function fmtDscr(n: number): string {
  return `${n.toFixed(2)}x`;
}

/** Format as compact number: 6.8K, 138M */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

/** Format a date string as "Mar 23, 2026" */
export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format a date string as relative time: "2 hours ago", "3 days ago" */
export function fmtRelative(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return fmtDate(dateStr);
}

/** Format variance with +/- sign and color hint */
export function fmtVariance(n: number, invert: boolean = false): { text: string; positive: boolean } {
  const isPositive = invert ? n < 0 : n >= 0;
  const sign = n >= 0 ? '+' : '';
  return {
    text: `${sign}${fmt(n)}`,
    positive: isPositive,
  };
}

/** Format days remaining with urgency */
export function fmtDaysOut(days: number): { text: string; urgency: 'critical' | 'warning' | 'normal' } {
  return {
    text: `${days}d`,
    urgency: days <= 7 ? 'critical' : days <= 14 ? 'warning' : 'normal',
  };
}
