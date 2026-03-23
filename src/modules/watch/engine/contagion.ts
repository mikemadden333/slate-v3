/**
 * Papachristos Contagion Model
 *
 * Every homicide within 2 miles of a Noble campus generates a ContagionZone
 * that persists for 125 days (3000 hours). Three phases:
 *   ACUTE  (0-72h):   radius 0.5mi — highest risk, retaliation window 18-72h
 *   ACTIVE (72h-14d):  radius 1.0mi — elevated risk
 *   WATCH  (14d-125d): radius 1.5mi — context only
 */

import type { Incident, ContagionZone, Campus } from './types';
import { haversine, bearing, ageInHours } from './geo';

const GANG_RE = /gang|retaliat|drive.?by|crew|faction/i;
const FIREARM_RE = /firearm|handgun|rifle|pistol|gun|shot/i;

const MAX_AGE_H = 3000; // 125 days

/**
 * Build contagion zones from all incidents (full 30-day+ set).
 * Filters to HOMICIDE type only, within 125 days.
 */
export function buildContagionZones(incidents: Incident[]): ContagionZone[] {
  const zones: ContagionZone[] = [];

  for (const inc of incidents) {
    if (inc.type !== 'HOMICIDE') continue;

    const ageH = ageInHours(inc.date);
    if (ageH > MAX_AGE_H) continue;

    let phase: 'ACUTE' | 'ACTIVE' | 'WATCH';
    let radius: number;

    if (ageH < 72) {
      phase = 'ACUTE';
      radius = 0.5;
    } else if (ageH < 336) {
      phase = 'ACTIVE';
      radius = 1.0;
    } else {
      phase = 'WATCH';
      radius = 1.5;
    }

    const retWin = ageH >= 18 && ageH <= 72;
    const desc = inc.description || '';

    zones.push({
      incidentId: inc.id,
      lat: inc.lat,
      lng: inc.lng,
      homicideDate: inc.date,
      ageH,
      phase,
      radius,
      retWin,
      gang: GANG_RE.test(desc),
      firearm: FIREARM_RE.test(desc),
      daysLeft: Math.max(0, Math.ceil((MAX_AGE_H - ageH) / 24)),
      block: inc.block,
    });
  }

  return zones;
}

/**
 * Get contagion zones that expose a specific campus.
 * A zone exposes a campus if the campus is within the zone's radius.
 * Attaches distance and bearing from the campus.
 */
export function getCampusExposure(
  campus: Campus,
  zones: ContagionZone[],
): ContagionZone[] {
  const exposed: ContagionZone[] = [];

  for (const zone of zones) {
    const dist = haversine(campus.lat, campus.lng, zone.lat, zone.lng);
    if (dist <= zone.radius) {
      exposed.push({
        ...zone,
        distanceFromCampus: dist,
        bearingFromCampus: bearing(campus.lat, campus.lng, zone.lat, zone.lng),
      });
    }
  }

  // Sort by age ascending (most recent first)
  exposed.sort((a, b) => a.ageH - b.ageH);
  return exposed;
}
