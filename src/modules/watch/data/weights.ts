/**
 * PULSE Risk Scoring Constants
 *
 * Philosophy: "The data tells the story. We do not engineer outcomes."
 *
 * Two distinct weight tables:
 *   CONTAGION_WEIGHTS — homicides, shootings, weapons (drive the LABEL)
 *   ENVIRONMENTAL_WEIGHTS — battery, assault, robbery, etc. (context only, capped, CANNOT drive label above LOW)
 */

/* ════════════════════════════════════════════════════
   Veritas Charter Schools Official Brand Colors
   ════════════════════════════════════════════════════ */
export const VERITAS_CARBON    = '#121315';
export const VERITAS_BRASS     = '#B79145';
export const VERITAS_BRASS_LT  = '#F7F3EA';
export const VERITAS_CARBON_LT = '#EDEDEE';

/** Distance buckets in miles */
export const DISTANCE_BUCKETS = [0.25, 0.5, 1.0, 2.0] as const;

/**
 * Contagion crime weights — these are the crimes that drive real risk.
 * Index: 0 = ≤0.25mi, 1 = ≤0.5mi, 2 = ≤1.0mi, 3 = ≤2.0mi
 */
export const CONTAGION_WEIGHTS: Record<string, readonly [number, number, number, number]> = {
  'HOMICIDE':              [60, 40, 20,  8],
  'WEAPONS VIOLATION':     [30, 18,  8,  3],
  'CRIM SEXUAL ASSAULT':   [25, 15,  6,  2],
};

/**
 * Environmental crime weights — context only, never dominates.
 * These cannot drive a campus label above LOW.
 */
export const ENVIRONMENTAL_WEIGHTS: Record<string, readonly [number, number, number, number]> = {
  'BATTERY':               [4,    2,    1,    0.3 ],
  'ASSAULT':               [3,    1.5,  0.5,  0.15],
  'ROBBERY':               [2,    1,    0.4,  0.1 ],
  'NARCOTICS':             [1,    0.5,  0.2,  0.05],
  'MOTOR VEHICLE THEFT':   [0.5,  0.25, 0.1,  0.02],
  'CRIMINAL DAMAGE':       [0.5,  0.25, 0.1,  0.02],
};

/** Check whether an incident type is a contagion crime */
export function isContagionCrime(type: string): boolean {
  return type in CONTAGION_WEIGHTS;
}

/** Get weight for a given incident type and distance in miles. Returns 0 if unknown type or beyond 2mi. */
export function getIncidentWeight(type: string, distanceMi: number): number {
  const buckets = CONTAGION_WEIGHTS[type] ?? ENVIRONMENTAL_WEIGHTS[type];
  if (!buckets) return 0;
  if (distanceMi <= 0.25) return buckets[0];
  if (distanceMi <= 0.5)  return buckets[1];
  if (distanceMi <= 1.0)  return buckets[2];
  if (distanceMi <= 2.0)  return buckets[3];
  return 0;
}

/** Get contagion weight only (environmental returns 0) */
export function getContagionWeight(type: string, distanceMi: number): number {
  const buckets = CONTAGION_WEIGHTS[type];
  if (!buckets) return 0;
  if (distanceMi <= 0.25) return buckets[0];
  if (distanceMi <= 0.5)  return buckets[1];
  if (distanceMi <= 1.0)  return buckets[2];
  if (distanceMi <= 2.0)  return buckets[3];
  return 0;
}

/** Get environmental weight only (contagion returns 0) */
export function getEnvironmentalWeight(type: string, distanceMi: number): number {
  const buckets = ENVIRONMENTAL_WEIGHTS[type];
  if (!buckets) return 0;
  if (distanceMi <= 0.25) return buckets[0];
  if (distanceMi <= 0.5)  return buckets[1];
  if (distanceMi <= 1.0)  return buckets[2];
  if (distanceMi <= 2.0)  return buckets[3];
  return 0;
}

/** Recency multiplier based on age in hours */
export function recencyMult(ageH: number): number {
  if (ageH < 6)   return 4.0;
  if (ageH < 24)  return 2.5;
  if (ageH < 168) return 1.5;
  if (ageH < 336) return 1.2;
  if (ageH < 720) return 1.0;
  return 0;
}

/** Day-of-week seasonal bonus (0=Sun, 6=Sat) */
export const DOW_BONUS: readonly number[] = [0, 0, 0, 0, 0, 8, 6];

/** Month seasonal bonus (0=Jan, 11=Dec) */
export const MONTH_BONUS: readonly number[] = [0, 0, 0, 0, 2, 6, 10, 8, 4, 2, 0, 0];

/** Temperature seasonal bonus based on apparent temperature in °F */
export function tempBonus(apparentTempF: number): number {
  if (apparentTempF > 88) return 8;
  if (apparentTempF > 80) return 5;
  if (apparentTempF > 70) return 3;
  return 0;
}

/** Risk score label thresholds — fallback only. Event-driven labels take precedence. */
export type RiskLabel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export function getRiskLabel(score: number): RiskLabel {
  if (score < 25) return 'LOW';
  if (score < 45) return 'ELEVATED';
  if (score < 70) return 'HIGH';
  return 'CRITICAL';
}

/** Risk label color mapping */
export const RISK_COLORS: Record<RiskLabel, { color: string; bg: string }> = {
  LOW:      { color: '#0EA5E9', bg: '#E0F2FE' },
  ELEVATED: { color: '#D97706', bg: '#FFFBEB' },
  HIGH:     { color: '#EA580C', bg: '#FFF7ED' },
  CRITICAL: { color: '#DC2626', bg: '#FEF2F2' },
};
