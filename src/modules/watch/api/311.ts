/**
 * Chicago 311 Service Requests — Neighborhood stress indicator.
 * High density of certain request types correlates with elevated criminal activity.
 * Slow-moving signal — refreshed every 6 hours.
 */

import type { Campus } from '../data/campuses';

/** Fetch 311 request density within 0.5mi of a campus (last 7 days). */
export async function fetch311Density(campus: Campus): Promise<number> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 3_600_000)
      .toISOString()
      .slice(0, 19);

    const types = [
      'Street Light Out',
      'Graffiti Removal',
      'Abandoned Vehicle',
      'Alley Light Out',
      'Sanitation Code Complaint',
    ].map(t => `'${t}'`).join(',');

    const params = new URLSearchParams({
      $limit: '200',
      $where: [
        `created_date > '${since}'`,
        `latitude IS NOT NULL`,
        `type_of_service_request IN (${types})`,
        `within_circle(location, ${campus.lat}, ${campus.lng}, 805)`, // ~0.5mi in meters
      ].join(' AND '),
      $select: 'count(*) as cnt',
    });

    const url = `https://data.cityofchicago.org/resource/v6vf-nfxy.json?${params}`;
    const res = await fetch(url);
    if (!res.ok) return 0;

    const rows = await res.json() as Array<{ cnt: string }>;
    const count = Number(rows[0]?.cnt ?? 0);

    // High 311 density → +2 base score modifier
    return count > 20 ? 2 : 0;
  } catch {
    return 0;
  }
}
