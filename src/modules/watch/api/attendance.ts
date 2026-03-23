/**
 * Attendance Correlation Engine
 * Predicts attendance impact from weekend violence and detects
 * undetected threat signals from unexpected attendance drops.
 * Phase 1: prediction model. Phase 2: Noble SIS integration.
 */

import type { CampusRisk } from '../engine/types';

export interface AttendancePrediction {
  campusId: number;
  expectedRate: number;    // 0-100 percent
  predictedRate: number;   // 0-100 percent
  delta: number;           // predictedRate - expectedRate
  drivers: string[];
}

/**
 * Predict Monday attendance based on weekend violence activity.
 * Historical correlations:
 *   - Homicide ≤0.5mi on Friday night → 12-18% decline
 *   - ACUTE zone persisting through weekend → elevated absence 3 days
 *   - ICE enforcement activity → 1-2 week decline
 */
export function predictAttendance(
  campusId: number,
  risk: CampusRisk,
  hasWeekendIceActivity: boolean,
): AttendancePrediction {
  const baseRate = 92; // Noble average attendance
  let predicted = baseRate;
  const drivers: string[] = [];

  // Contagion zone impact
  const acuteZones = risk.contagionZones.filter(z => z.phase === 'ACUTE');
  const activeZones = risk.contagionZones.filter(z => z.phase === 'ACTIVE');

  if (acuteZones.length > 0) {
    const closestAcute = Math.min(
      ...acuteZones.map(z => z.distanceFromCampus ?? Infinity),
    );
    if (closestAcute <= 0.5) {
      predicted -= 15; // 12-18% decline
      drivers.push(`Homicide within 0.5mi during ACUTE phase`);
    } else if (closestAcute <= 1.0) {
      predicted -= 8;
      drivers.push(`Homicide within 1mi during ACUTE phase`);
    }
  }

  if (activeZones.length > 0) {
    predicted -= 3 * Math.min(activeZones.length, 3);
    drivers.push(`${activeZones.length} active contagion zone(s)`);
  }

  // ICE impact
  if (hasWeekendIceActivity) {
    predicted -= 10;
    drivers.push('ICE enforcement activity reported nearby');
  }

  // Retaliation window
  if (risk.inRetaliationWindow) {
    predicted -= 5;
    drivers.push('Active retaliation window');
  }

  predicted = Math.max(50, Math.round(predicted));

  return {
    campusId,
    expectedRate: baseRate,
    predictedRate: predicted,
    delta: predicted - baseRate,
    drivers,
  };
}

/**
 * Compute attendance delta (actual vs expected).
 * When actual deviates by more than 15% below expected without known cause,
 * PULSE flags as an undetected threat signal.
 * Phase 2: receives data from Noble SIS via CSV upload or API.
 */
export function computeAttendanceDelta(
  actual: number,
  expected: number,
): { isAnomaly: boolean; delta: number } {
  const delta = actual - expected;
  const isAnomaly = delta < -15;
  return { isAnomaly, delta };
}
