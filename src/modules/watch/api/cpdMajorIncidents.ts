/**
 * CPD Major Incidents — faster than the 5-10 day lag data portal
 * Violent types only, 72h window — appears within 24-48h of incident
 */
import type { Incident } from '../engine/types';

const CPD_MAJOR = 'https://data.cityofchicago.org/resource/ijzp-q8t2.json';

const MAJOR_TYPES = [
  'HOMICIDE','CRIM SEXUAL ASSAULT','ROBBERY','ASSAULT','BATTERY','WEAPONS VIOLATION',
].map(t => `primary_type='${t}'`).join(' OR ');

export async function fetchCPDMajorIncidents(hours = 72): Promise<Incident[]> {
  try {
    const since = new Date(Date.now() - hours * 3600000).toISOString().slice(0, 19);
    const params = new URLSearchParams({
      $where: `date > '${since}' AND (${MAJOR_TYPES})`,
      $limit: '500',
      $order: 'date DESC',
      $select: 'id,date,primary_type,block,latitude,longitude,description',
    });
    const url = `${CPD_MAJOR}?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CPD Major ${res.status}`);
    const rows = await res.json();
    console.log(`CPD Major: ${rows.length} incidents in last ${hours}h`);
    const incidents: Incident[] = [];
    for (const row of rows) {
      const lat = parseFloat(row.latitude ?? '0');
      const lng = parseFloat(row.longitude ?? '0');
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;
      incidents.push({
        id: `cpd-major-${row.id ?? row.case_number}`,
        date: row.date,
        type: row.primary_type,
        block: row.block ?? '',
        lat, lng,
        description: row.description ?? row.primary_type,
        source: 'CPD_MAJOR',
      });
    }
    console.log(`CPD Major: ${incidents.length} geocoded`);
    return incidents;
  } catch (err) {
    console.warn('CPD Major fetch failed:', err);
    return [];
  }
}
