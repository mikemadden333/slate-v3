/**
 * Geographic utilities: haversine distance, bearing, formatting.
 */

const R_MILES = 3958.8; // Earth radius in miles
const DEG2RAD = Math.PI / 180;

/** Haversine distance between two lat/lng points, in miles. */
export function haversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.sqrt(a));
}

/** Bearing from point 1 to point 2 in degrees (0-360, 0=N). */
export function bearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLng = (lng2 - lng1) * DEG2RAD;
  const y = Math.sin(dLng) * Math.cos(lat2 * DEG2RAD);
  const x =
    Math.cos(lat1 * DEG2RAD) * Math.sin(lat2 * DEG2RAD) -
    Math.sin(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.cos(dLng);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

/** Compass label from bearing degrees. */
export function compassLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

/** Parse a date string to milliseconds since epoch. Returns NaN for invalid dates. */
export function dateToMs(dateStr: string): number {
  if (!dateStr) return NaN;
  const ms = new Date(dateStr).getTime();
  return ms;
}

/** Age in hours from a date string to now. Returns Infinity for invalid/empty dates. */
export function ageInHours(dateStr: string): number {
  const then = dateToMs(dateStr);
  if (isNaN(then)) return Infinity; // invalid dates are infinitely old → always filtered out
  const now = Date.now();
  return Math.max(0, (now - then) / 3_600_000);
}

/** Format a date string as a human-readable relative time. */
export function fmtAgo(dateStr: string): string {
  const hours = ageInHours(dateStr);
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  }
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h !== 1 ? 's' : ''} ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
}

/** Format distance in miles with one decimal. */
export function fmtDist(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}
