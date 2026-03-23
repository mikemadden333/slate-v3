/**
 * Safe Corridor Intelligence
 * Infers primary walking corridors from campus location and surrounding
 * street grid. Overlays recent incidents to generate corridor status.
 * Phase 1: inferred corridors. Phase 2: actual student route data from Noble SIS.
 */

import type { Campus } from '../data/campuses';
import type { Incident, SafeCorridor } from './types';
import { haversine, ageInHours } from './geo';

/** Offset in degrees for ~0.3mi in each cardinal direction at Chicago's latitude */
const OFFSET_LAT = 0.0043; // ~0.3mi north/south
const OFFSET_LNG = 0.0058; // ~0.3mi east/west

interface CorridorDef {
  name: string;
  direction: string;
  dlat: number;
  dlng: number;
}

const CORRIDOR_DEFS: CorridorDef[] = [
  { name: 'North',     direction: 'N',  dlat: OFFSET_LAT,   dlng: 0 },
  { name: 'South',     direction: 'S',  dlat: -OFFSET_LAT,  dlng: 0 },
  { name: 'East',      direction: 'E',  dlat: 0,            dlng: OFFSET_LNG },
  { name: 'West',      direction: 'W',  dlat: 0,            dlng: -OFFSET_LNG },
  { name: 'Northeast', direction: 'NE', dlat: OFFSET_LAT,   dlng: OFFSET_LNG },
  { name: 'Northwest', direction: 'NW', dlat: OFFSET_LAT,   dlng: -OFFSET_LNG },
  { name: 'Southeast', direction: 'SE', dlat: -OFFSET_LAT,  dlng: OFFSET_LNG },
  { name: 'Southwest', direction: 'SW', dlat: -OFFSET_LAT,  dlng: -OFFSET_LNG },
];

/**
 * Build safe corridors for a campus based on incident proximity.
 * Each corridor is a ~0.3mi extension from the campus in a cardinal/ordinal direction.
 * Incidents within 0.15mi of the corridor centerline are counted.
 */
export function buildSafeCorridors(
  campus: Campus,
  incidents: Incident[],
): SafeCorridor[] {
  return CORRIDOR_DEFS.map(def => {
    const endLat = campus.lat + def.dlat;
    const endLng = campus.lng + def.dlng;
    const midLat = campus.lat + def.dlat / 2;
    const midLng = campus.lng + def.dlng / 2;

    // Find incidents within 0.15mi of the corridor midpoint in last 24h
    const corridorIncidents: Incident[] = [];
    let mostRecent: Incident | undefined;
    let mostRecentAge = Infinity;

    for (const inc of incidents) {
      const ageH = ageInHours(inc.date);
      if (ageH > 24) continue;

      // Check proximity to corridor centerline (use midpoint as approximation)
      const distToMid = haversine(midLat, midLng, inc.lat, inc.lng);
      const distToEnd = haversine(endLat, endLng, inc.lat, inc.lng);
      const distToCampus = haversine(campus.lat, campus.lng, inc.lat, inc.lng);

      // Incident is on this corridor if it's within 0.15mi of the mid or end point
      // and within 0.4mi of campus
      if ((distToMid <= 0.15 || distToEnd <= 0.15) && distToCampus <= 0.4) {
        corridorIncidents.push(inc);
        if (ageH < mostRecentAge) {
          mostRecentAge = ageH;
          mostRecent = inc;
        }
      }
    }

    // Determine status
    let status: 'CLEAR' | 'CAUTION' | 'AVOID';
    const hasViolent = corridorIncidents.some(i =>
      ['HOMICIDE', 'WEAPONS VIOLATION', 'BATTERY', 'ASSAULT'].includes(i.type),
    );

    if (corridorIncidents.length === 0) {
      status = 'CLEAR';
    } else if (hasViolent || corridorIncidents.length >= 2) {
      status = 'AVOID';
    } else {
      status = 'CAUTION';
    }

    return {
      name: `${def.name} corridor`,
      direction: def.direction,
      status,
      incidentCount24h: corridorIncidents.length,
      mostRecentIncident: mostRecent,
      waypoints: [
        { lat: campus.lat, lng: campus.lng },
        { lat: midLat, lng: midLng },
        { lat: endLat, lng: endLng },
      ],
    };
  });
}
