/**
 * Chicago Data Portal — CPD Incident Reports & ShotSpotter Activations
 * Primary verified data source for PULSE scoring engine.
 *
 * CRITICAL: Date format must be ISO without milliseconds or Z suffix.
 * Socrata returns 400 with milliseconds.
 */

import type { Incident, ShotSpotterEvent } from '../engine/types';

/**
 * Noble campuses span roughly lat 41.70–41.92, lng -87.77–-87.62.
 * Add ~0.05° buffer on each side to capture incidents near campus edges.
 * This bounding box filter reduces API payload from all-Chicago to Noble geography.
 */

/**
 * Fetch CPD incidents from Chicago Data Portal.
 * @param hours - lookback window (720 = 30 days, 24 = acute)
 * @param limit - max rows (5000 for full, 500 for acute)
 */
export async function fetchIncidents(
  hours: number,
  limit: number,
): Promise<Incident[]> {
  console.log(`CPD fetchIncidents called: hours=${hours}, limit=${limit}`);
  try {
    const params = new URLSearchParams({
      $limit: String(limit),
      $where: `latitude IS NOT NULL AND longitude IS NOT NULL AND latitude > 41.65 AND latitude < 41.97 AND longitude > -87.82 AND longitude < -87.57 AND date > '${new Date(Date.now() - hours * 3600000).toISOString().slice(0, 19)}'`,
      $order: 'date DESC',
      $select: 'id,date,primary_type,block,latitude,longitude,description',
    });

    const url = `https://data.cityofchicago.org/resource/ijzp-q8t2.json?${params}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`CPD fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const rows: unknown[] = await res.json();
    const label = hours <= 48 ? `CPD acute fetch (${hours}h)` : 'CPD full fetch (30d)';
    console.log(`${label}:`, rows.length, 'rows');

    // Diagnostic: log first row's raw fields including date format
    if (rows.length > 0) {
      const sample = rows[0] as Record<string, unknown>;
      console.log('CPD sample row keys:', Object.keys(sample).join(', '));
      console.log('CPD sample coords:', {
        latitude: sample.latitude,
        longitude: sample.longitude,
        location: sample.location,
      });
      // Date format diagnostic — critical for time filter debugging
      const rawDate = sample.date as string;
      const parsedMs = new Date(rawDate).getTime();
      const ageH = isNaN(parsedMs) ? 'INVALID' : ((Date.now() - parsedMs) / 3600000).toFixed(1);
      console.log(`CPD date format: raw="${rawDate}" parsed=${parsedMs} age=${ageH}h`);
    }

    const incidents = rows.map((r: unknown) => {
      const row = r as Record<string, string>;
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);

      // Validate coordinates — must be real numbers inside Chicago bounds
      if (isNaN(lat) || isNaN(lng)) return null;
      if (lat === 0 || lng === 0) return null;
      if (lat < 41.6 || lat > 42.1) return null; // Chicago latitude bounds
      if (lng < -87.95 || lng > -87.5) return null; // Chicago longitude bounds

      return {
        id: row.id ?? '',
        date: row.date ?? '',
        type: row.primary_type ?? '',
        block: row.block ?? '',
        lat,
        lng,
        description: row.description ?? '',
      };
    }).filter((inc): inc is Incident => inc !== null);

    const dropped = rows.length - incidents.length;
    if (dropped > 0) {
      console.warn(`CPD: dropped ${dropped} rows with invalid/out-of-bounds coordinates`);
    }
    if (incidents.length > 0) {
      console.log('CPD sample incident:', JSON.stringify({
        lat: incidents[0].lat,
        lng: incidents[0].lng,
        type: incidents[0].type,
        block: incidents[0].block,
      }));
      // Log most recent incident date — shows how stale CPD data is
      const newestDate = incidents[0].date; // already sorted date DESC
      const newestMs = new Date(newestDate).getTime();
      const staleness = isNaN(newestMs) ? 'INVALID' : `${((Date.now() - newestMs) / 3600000).toFixed(1)}h`;
      console.log(`CPD most recent incident: "${newestDate}" — ${staleness} old`);
    }
    return incidents;
  } catch (err) {
    console.error('CPD fetch error:', err);
    return [];
  }
}

/**
 * Fetch ShotSpotter activations from Chicago Data Portal.
 * Acoustic gunshot detection — fastest real-time signal available.
 * Single verified endpoint: 3h7q-7mdb.json
 */
const SHOTSPOTTER_URL = 'https://data.cityofchicago.org/resource/3h7q-7mdb.json';

export async function fetchShotSpotter(
  hours: number = 2,
  limit: number = 100,
): Promise<ShotSpotterEvent[]> {
  const since = new Date(Date.now() - hours * 3_600_000)
    .toISOString()
    .slice(0, 19);

  const params = new URLSearchParams({
    $limit: String(limit),
    $where: `date > '${since}' AND latitude IS NOT NULL`,
    $order: 'date DESC',
  });

  try {
    const url = `${SHOTSPOTTER_URL}?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`ShotSpotter fetch failed: ${res.status}`);
      return [];
    }

    const rows: unknown[] = await res.json();
    console.log(`ShotSpotter: ${rows.length} activations (${hours}h window)`);
    return rows.map((r: unknown) => {
      const row = r as Record<string, string>;
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);

      if (isNaN(lat) || isNaN(lng)) return null;
      if (lat === 0 || lng === 0) return null;
      if (lat < 41.6 || lat > 42.1) return null;
      if (lng < -87.95 || lng > -87.5) return null;

      return {
        id: row.unique_id ?? row.id ?? '',
        date: row.date ?? '',
        lat,
        lng,
        type: row.type ?? '',
        rounds: Number(row.rounds ?? row.incident_rounds_cnt ?? 0),
      };
    }).filter((evt): evt is ShotSpotterEvent => evt !== null);
  } catch (err) {
    console.log('ShotSpotter fetch error:', err);
    return [];
  }
}
