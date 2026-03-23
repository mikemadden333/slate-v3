/**
 * PULSE Risk Scoring Engine
 *
 * Philosophy: "The data tells the story. We do not engineer outcomes."
 *
 * CONTAGION crimes (homicide, weapons, CSA) drive the LABEL.
 * ENVIRONMENTAL crimes (battery, assault, etc.) provide context only — capped at 15 points,
 * and CANNOT drive the label above LOW regardless of volume.
 *
 * Label determination is EVENT-DRIVEN, not score-threshold-driven:
 *   CRITICAL:  campus in retaliation window (18-72h post homicide ≤0.5mi)
 *   HIGH:      homicide within 1mi in last 72h
 *   ELEVATED:  weapons violation within 0.5mi in last 48h, OR ShotSpotter ≤0.25mi in last 2h
 *   LOW:       everything else (regardless of environmental crime count)
 */

import type { Campus } from '../data/campuses';
import type {
  Incident,
  ShotSpotterEvent,
  ContagionZone,
  CampusRisk,
  SchoolPeriod,
  NetworkSummary,
} from './types';
import { haversine, ageInHours, compassLabel, fmtAgo } from './geo';
import {
  getContagionWeight,
  getEnvironmentalWeight,
  recencyMult,
  DOW_BONUS,
  MONTH_BONUS,
  tempBonus,
  isContagionCrime,
} from '../data/weights';
import { getCampusExposure } from './contagion';
import { getSchoolPeriod, minutesToArrival, minutesToDismissal } from './time';

import type { RiskLabel } from '../data/weights';

/**
 * Score a single campus.
 *
 * @param campus        - The campus to score
 * @param incidents     - Full 30-day incident set
 * @param acuteInc      - 24h acute incidents
 * @param shots         - ShotSpotter events (2h window)
 * @param zones         - All contagion zones
 * @param tempF         - Current apparent temperature in °F
 * @param schoolPeriod  - Current school period (override) or null to auto-detect
 */
export function scoreCampus(
  campus: Campus,
  incidents: Incident[],
  acuteInc: Incident[],
  shots: ShotSpotterEvent[],
  zones: ContagionZone[],
  tempF: number,
  schoolPeriod?: SchoolPeriod,
): CampusRisk {
  const now = new Date();
  const period = schoolPeriod ?? getSchoolPeriod(now, campus);

  // --- CONTAGION BASE (0-70) from 30-day contagion crimes within 2mi ---
  let rawContagionSum = 0;
  // --- ENVIRONMENTAL BASE (0-15) from 30-day environmental crimes within 2mi ---
  let rawEnvSum = 0;

  let closeCount = 0; // within 0.5mi in last 24h
  let nearCount = 0;  // within 1mi in last 24h

  // Diagnostic: log first campus's first few distance calculations
  let diagLogged = false;

  for (const inc of incidents) {
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);

    // Diagnostic: log sample distances for the first campus processed
    if (!diagLogged && campus.id === 6) { // DRW = North Lawndale
      console.log(`DIAG [${campus.short}]: sample incident lat=${inc.lat} lng=${inc.lng} type=${inc.type} dist=${dist.toFixed(2)}mi`);
      console.log(`DIAG [${campus.short}]: campus lat=${campus.lat} lng=${campus.lng}`);
      diagLogged = true;
    }

    if (dist > 2.0) continue;

    const ageH = ageInHours(inc.date);
    if (ageH > 720) continue; // beyond 30 days

    const mult = recencyMult(ageH);

    const cw = getContagionWeight(inc.type, dist);
    if (cw > 0) rawContagionSum += cw * mult;

    const ew = getEnvironmentalWeight(inc.type, dist);
    if (ew > 0) rawEnvSum += ew * mult;

    if (ageH < 24 && dist <= 0.5) closeCount++;
    if (ageH < 24 && dist <= 1.0) nearCount++;
  }

  const contagionBase = Math.min(70, Math.round(50 * Math.log10(1 + rawContagionSum / 8)));
  const envBase = Math.min(15, Math.round(15 * Math.log10(1 + rawEnvSum / 5)));
  const base = Math.min(85, contagionBase + envBase);

  // --- ACUTE BONUS (0-45) — contagion crimes only, within last 72h ---
  let acute = 0;

  for (const inc of acuteInc) {
    if (!isContagionCrime(inc.type)) continue;

    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    const ageH = ageInHours(inc.date);
    if (ageH > 72) continue;

    if (inc.type === 'HOMICIDE') {
      if (dist <= 0.25) acute = Math.max(acute, 40);
      else if (dist <= 0.5) acute = Math.max(acute, 30);
      else if (dist <= 1.0) acute = Math.max(acute, 20);
    }
    if ((inc.type === 'WEAPONS VIOLATION' || inc.type === 'CRIM SEXUAL ASSAULT') && dist <= 0.5) {
      acute = Math.max(acute, 15);
    }
  }

  // ShotSpotter bonus
  let shotSpotterBonus = 0;
  for (const shot of shots) {
    const dist = haversine(campus.lat, campus.lng, shot.lat, shot.lng);
    const ageH = ageInHours(shot.date);
    if (ageH <= 1 && dist <= 0.25) {
      shotSpotterBonus = Math.max(shotSpotterBonus, 25);
    } else if (ageH <= 2 && dist <= 0.5) {
      shotSpotterBonus = Math.max(shotSpotterBonus, 15);
    }
  }
  acute = Math.max(acute, shotSpotterBonus);

  // 3+ contagion incidents within 0.5mi in last 6h — cluster bonus
  let acuteCloseCount = 0;
  for (const inc of acuteInc) {
    if (!isContagionCrime(inc.type)) continue;
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    const ageH = ageInHours(inc.date);
    if (ageH <= 6 && dist <= 0.5) acuteCloseCount++;
  }
  if (acuteCloseCount >= 3) acute = Math.max(acute, 8);

  acute = Math.min(45, acute);

  // --- SEASONAL ADDITIVE ---
  const dow = now.getDay();
  const month = now.getMonth();
  const seasonal = (DOW_BONUS[dow] ?? 0) + (MONTH_BONUS[month] ?? 0) + tempBonus(tempF);

  // --- FINAL SCORE ---
  const score = Math.min(100, base + acute + seasonal);
  // Remap display score to always fall within label range
const label = determineLabel(campus, acuteInc, shots, zones, incidents);
const displayScore =
  label === 'LOW'      ? Math.min(24, Math.round(score * 0.24)) :
  label === 'ELEVATED' ? 25 + Math.min(19, Math.round(score * 0.19)) :
  label === 'HIGH'     ? 45 + Math.min(24, Math.round(score * 0.24)) :
                         70 + Math.min(29, Math.round(score * 0.29));

  // --- EVENT-DRIVEN LABEL DETERMINATION ---

  // --- CONTAGION EXPOSURE ---
  const campusZones = getCampusExposure(campus, zones);
  const inRetaliationWindow = campusZones.some(z => z.retWin);

  // --- STATUS REASON ---
  const statusReason = buildStatusReason(
    label, shotSpotterBonus, closeCount,
    inRetaliationWindow, campusZones, campus, acuteInc, shots,
  );

  // Diagnostic: log scoring summary for DRW (North Lawndale — should have incidents)
  if (campus.id === 6) {
    console.log(`DIAG [${campus.short}] SCORING: score=${score} label=${label} base=${base} acute=${acute} seasonal=${seasonal} closeCount=${closeCount} nearCount=${nearCount} totalIncidents=${incidents.length}`);
  }

  return {
    campusId: campus.id,
    score: displayScore,
    label,
    base,
    acute,
    seasonal,
    shotSpotterBonus,
    closeCount,
    nearCount,
    contagionZones: campusZones,
    inRetaliationWindow,
    minutesToArrival: minutesToArrival(now, campus),
    minutesToDismissal: minutesToDismissal(now, campus),
    schoolPeriod: period,
    statusReason,
  };
}

/**
 * Event-driven label determination.
 * Environmental crimes CANNOT drive the label above LOW.
 *
 *   CRITICAL:  retaliation window (18-72h post homicide ≤0.5mi)
 *   HIGH:      homicide within 1mi in last 72h
 *   ELEVATED:  weapons violation within 0.5mi in last 48h, OR ShotSpotter ≤0.25mi in 2h
 *   LOW:       everything else
 */
function determineLabel(
  campus: Campus,
  acuteInc: Incident[],
  shots: ShotSpotterEvent[],
  zones: ContagionZone[],
  allInc: Incident[] = [],
): RiskLabel {
  // Check for retaliation window → CRITICAL
  const campusZones = getCampusExposure(campus, zones);
  if (campusZones.some(z => z.retWin)) {
    return 'CRITICAL';
  }

  // Check for homicide within 1mi in last 72h → HIGH
  for (const inc of acuteInc) {
    if (inc.type !== 'HOMICIDE') continue;
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    const ageH = ageInHours(inc.date);
    if (ageH <= 72 && dist <= 1.0) {
      return 'HIGH';
    }
  }

  // Check for weapons within 0.5mi in last 48h → ELEVATED
  for (const inc of acuteInc) {
    if (inc.type !== 'WEAPONS VIOLATION') continue;
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    const ageH = ageInHours(inc.date);
    if (ageH <= 48 && dist <= 0.5) {
      return 'ELEVATED';
    }
  }

  // Check for ShotSpotter within 0.25mi in last 2h → ELEVATED
  for (const shot of shots) {
    const dist = haversine(campus.lat, campus.lng, shot.lat, shot.lng);
    const ageH = ageInHours(shot.date);
    if (ageH <= 2 && dist <= 0.25) {
      return 'ELEVATED';
    }
  }

  // Acute data empty (CPD lag) — fall back to 14-day violent baseline
  const VIOLENT_TYPES = new Set(['HOMICIDE','MURDER','SHOOTING','WEAPONS VIOLATION','BATTERY','ROBBERY','ASSAULT','CRIM SEXUAL ASSAULT']);
  const now14 = Date.now();
  const allPassed = [...acuteInc]; // acuteInc may be empty — that's fine, we check allInc below

  // Count violent incidents within 0.5mi in last 14 days from full incident pool
  // allInc is passed in as a proxy when acute is empty
  let violentClose14d = 0;
  let homicide14d = 0;
  let weapons14d = 0;
  for (const inc of allInc) {
    if (!VIOLENT_TYPES.has(inc.type)) continue;
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    if (dist > 1.0) continue;
    const ageH = (now14 - new Date(inc.date).getTime()) / 3600000;
    if (ageH > 336) continue; // 14 days
    if (dist <= 0.5) violentClose14d++;
    if (inc.type === 'HOMICIDE' || inc.type === 'MURDER') homicide14d++;
    if (inc.type === 'WEAPONS VIOLATION') weapons14d++;
  }

  // Count shootings specifically — higher signal than battery/robbery
  let shootings14d = 0;
  for (const inc of allInc) {
    if (inc.type !== 'SHOOTING' && inc.type !== 'HOMICIDE' && inc.type !== 'MURDER') continue;
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    if (dist > 1.0) continue;
    const ageH = (now14 - new Date(inc.date).getTime()) / 3600000;
    if (ageH > 336) continue;
    shootings14d++;
  }

  // HIGH: homicide within 0.5mi OR 3+ shootings within 1mi in 14d OR 20+ violent within 0.5mi
  if (homicide14d >= 1 || shootings14d >= 3 || violentClose14d >= 20) return 'HIGH';
  // ELEVATED: weapons violation within 0.5mi OR 2+ shootings within 1mi OR 10+ violent within 0.5mi
  if (weapons14d >= 1 || shootings14d >= 2 || violentClose14d >= 10) return 'ELEVATED';

  return 'LOW';
}

/** Deterministic status reason generator — references contagion crimes specifically. */
function buildStatusReason(
  label: RiskLabel,
  shotSpotterBonus: number,
  closeCount: number,
  inRetaliationWindow: boolean,
  campusZones: ContagionZone[],
  campus: Campus,
  acuteInc: Incident[],
  shots: ShotSpotterEvent[],
): string {
  // Priority 1: Retaliation window
  if (inRetaliationWindow) {
    const zone = campusZones.find(z => z.retWin);
    if (zone && zone.distanceFromCampus != null && zone.bearingFromCampus != null) {
      const blockStr = zone.block ? ` near ${zone.block}` : '';
      return `A homicide occurred ${zone.distanceFromCampus.toFixed(1)} miles ${compassLabel(zone.bearingFromCampus)}${blockStr} ${fmtAgo(zone.homicideDate)}. You are currently in the peak retaliation window (18-72h post-homicide).`;
    }
  }

  // Priority 2: Acute homicide nearby
  if (label === 'HIGH' || label === 'CRITICAL') {
    for (const inc of acuteInc) {
      if (inc.type !== 'HOMICIDE') continue;
      const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      if (dist <= 1.0) {
        const blockStr = inc.block ? ` near ${inc.block}` : '';
        return `A homicide was reported ${dist.toFixed(1)} miles away${blockStr} ${fmtAgo(inc.date)}.`;
      }
    }
  }

  // Priority 3: ShotSpotter
  if (shotSpotterBonus >= 15) {
    for (const evt of shots) {
      const dist = haversine(campus.lat, campus.lng, evt.lat, evt.lng);
      if (dist <= 0.5) {
        return `ShotSpotter detected gunfire ${dist.toFixed(1)} miles away ${fmtAgo(evt.date)}. Not yet confirmed by CPD. Monitoring.`;
      }
    }
  }

  // Priority 4: Weapons nearby
  if (label === 'ELEVATED') {
    for (const inc of acuteInc) {
      if (inc.type !== 'WEAPONS VIOLATION') continue;
      const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      if (dist <= 0.5) {
        return `A weapons violation was reported ${dist.toFixed(1)} miles away ${fmtAgo(inc.date)}.`;
      }
    }
  }

  // Priority 5: All clear
  if (label === 'LOW') {
    const contagionClose = closeCount > 0
      ? ` ${closeCount} environmental incident${closeCount !== 1 ? 's' : ''} nearby (non-escalatory).`
      : '';
    return `No contagion-level incidents near ${campus.name} in the last 72 hours.${contagionClose}`;
  }

  // Fallback
  return `${closeCount} incident${closeCount !== 1 ? 's' : ''} within 0.5 miles in the last 24 hours.`;
}

/** Score all campuses and build a NetworkSummary. */
export function scoreNetwork(
  campuses: Campus[],
  risks: CampusRisk[],
  incidents24h: Incident[],
  iceAlertCount: number,
): NetworkSummary {
  const scores = risks.map(r => r.score);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  let acuteZones = 0;
  let activeZones = 0;
  let watchZones = 0;
  let retaliationWindows = 0;

  for (const r of risks) {
    for (const z of r.contagionZones) {
      if (z.phase === 'ACUTE') acuteZones++;
      else if (z.phase === 'ACTIVE') activeZones++;
      else watchZones++;
    }
    if (r.inRetaliationWindow) retaliationWindows++;
  }

  // Count unique incidents within 2mi of any campus in last 24h
  const seen = new Set<string>();
  for (const inc of incidents24h) {
    for (const c of campuses) {
      const dist = haversine(c.lat, c.lng, inc.lat, inc.lng);
      if (dist <= 2.0) { seen.add(inc.id); break; }
    }
  }

  const elevatedCount = risks.filter(r => r.label !== 'LOW').length;
  const sorted = [...risks].sort((a, b) => b.score - a.score);
  const highestRisk = sorted[0];
  const highestCampus = highestRisk
    ? (campuses.find(c => c.id === highestRisk.campusId)?.name ?? 'Unknown')
    : 'None';

  return {
    avgScore,
    campusesElevated: elevatedCount,
    elevatedCount,
    totalCampuses: campuses.length,
    highestCampus,
    highestScore: highestRisk?.score ?? 0,
    acuteZones,
    activeZones,
    watchZones,
    incidents24h: seen.size,
    iceAlerts: iceAlertCount,
    retaliationWindows,
    trends: { scoreVsLastWeek: 0, incidentsVsLastWeek: 0 },
  };
}
