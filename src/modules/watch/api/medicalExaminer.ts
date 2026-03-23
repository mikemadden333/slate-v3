/**
 * Cook County Medical Examiner — homicide data
 * Public Socrata API — updates within hours of death classification
 * Endpoint: datacatalog.cookcountyil.gov/resource/cjeq-bs86.json
 */
import type { Incident } from '../engine/types';

const ME_API = 'https://datacatalog.cookcountyil.gov/resource/cjeq-bs86.json';

export async function fetchMedicalExaminerHomicides(days = 14): Promise<Incident[]> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const params = new URLSearchParams({
      $where: `death_date > '${since}' AND manner_of_death = 'HOMICIDE'`,
      $limit: '200',
      $order: 'death_date DESC',
    });
    const url = `${ME_API}?${params}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ME API ${res.status}`);
    const rows = await res.json();
    
    console.log(`Medical Examiner: ${rows.length} homicides in last ${days} days`);
    
    const incidents: Incident[] = [];
    for (const row of rows) {
      // ME data has lat/lng for incident location
      const lat = parseFloat(row.incident_zip ? row.latitude : '0');
      const lng = parseFloat(row.longitude ?? '0');
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;
      if (lat < 41.6 || lat > 42.1 || lng < -87.95 || lng > -87.5) continue;

      incidents.push({
        id: `me-${row.casenumber ?? row.id ?? Math.random()}`,
        date: row.death_date ?? row.incident_date ?? new Date().toISOString(),
        type: 'HOMICIDE',
        block: row.incident_address ?? row.residence_city ?? 'Chicago',
        lat, lng,
        description: `${row.primary_cause ?? 'Homicide'} — Medical Examiner`,
        source: 'MEDICAL_EXAMINER',
      });
    }
    console.log(`Medical Examiner: ${incidents.length} geocoded homicides`);
    return incidents;
  } catch (err) {
    console.warn('Medical Examiner fetch failed:', err);
    return [];
  }
}
