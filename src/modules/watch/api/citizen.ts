/**
 * Citizen App Integration — Scanner-derived incidents 2-6h faster than CPD Data Portal.
 * No API key required — public incident feed.
 * Provides faster signals for morning awareness before CPD records appear.
 */

export interface CitizenIncident {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  timestamp: string;
  category: string;
  source: 'CITIZEN';
  confidence: 'SCANNER_DERIVED';
}

export async function fetchCitizenIncidents(
  lat: number, lng: number, radiusMiles: number = 2.0,
): Promise<CitizenIncident[]> {
  const url = `/api/citizen-proxy?lat=${lat}&lng=${lng}&radius=${radiusMiles}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Citizen fetch: HTTP ${res.status}`);
      return [];
    }
    const data: unknown = await res.json();
    const obj = data as Record<string, unknown>;

    // DIAGNOSTIC: log what Citizen actually returns
    const topKeys = Object.keys(obj);
    console.log(`Citizen API response keys: [${topKeys.join(', ')}]`);
    if (obj.error) console.log(`Citizen API error: ${JSON.stringify(obj.error)}`);

    // Try every known response format
    let raw: unknown[] = [];

    if (Array.isArray(data)) {
      raw = data;
      console.log(`Citizen: response is array, ${raw.length} items`);
    } else if (Array.isArray(obj.results)) {
      raw = obj.results;
      console.log(`Citizen: found results[], ${raw.length} items`);
    } else if (Array.isArray(obj.incidents)) {
      raw = obj.incidents;
      console.log(`Citizen: found incidents[], ${raw.length} items`);
    } else if (Array.isArray(obj.hits)) {
      raw = obj.hits;
      console.log(`Citizen: found hits[], ${raw.length} items`);
    } else if (typeof obj.results === 'object' && obj.results !== null) {
      // Citizen sometimes nests: { results: { "id1": {...}, "id2": {...} } }
      const nested = obj.results as Record<string, unknown>;
      raw = Object.values(nested);
      console.log(`Citizen: results is object with ${raw.length} entries`);
    } else if (typeof obj.incidents === 'object' && obj.incidents !== null) {
      const nested = obj.incidents as Record<string, unknown>;
      raw = Object.values(nested);
      console.log(`Citizen: incidents is object with ${raw.length} entries`);
    } else {
      // Last resort: check if the top-level object has incident-like keys
      const values = Object.values(obj);
      const hasIncidentShape = values.some(v =>
        typeof v === 'object' && v !== null && 'title' in (v as Record<string, unknown>)
      );
      if (hasIncidentShape) {
        raw = values;
        console.log(`Citizen: top-level object has ${raw.length} incident-like values`);
      } else {
        // Log first 500 chars of response for debugging
        const preview = JSON.stringify(data).slice(0, 500);
        console.log(`Citizen: unknown response structure. Preview: ${preview}`);
        return [];
      }
    }

    if (raw.length === 0) {
      console.log('Citizen fetch: 0 incidents (empty response)');
      return [];
    }

    // Log a sample item to see the structure
    console.log('Citizen sample item:', JSON.stringify(raw[0]).slice(0, 300));

    const incidents: CitizenIncident[] = [];
    for (const item of raw) {
      const i = item as Record<string, unknown>;

      // Try multiple coordinate formats
      const coords = i.coordinates as Record<string, number> | undefined;
      const geo = i.geometry as Record<string, number[]> | undefined;
      const loc = i.location as Record<string, number> | undefined;

      let cLat = coords?.latitude ?? coords?.lat ?? loc?.latitude ?? loc?.lat ?? (i.latitude as number) ?? (i.lat as number) ?? 0;
let cLng = coords?.longitude ?? coords?.lng ?? loc?.longitude ?? loc?.lng ?? (i.longitude as number) ?? (i.lng as number) ?? 0;

      // geometry: { coordinates: [lng, lat] } (GeoJSON format)
      if (cLat === 0 && geo?.coordinates && Array.isArray(geo.coordinates)) {
        cLng = geo.coordinates[0];
        cLat = geo.coordinates[1];
      }

      if (cLat === 0 && cLng === 0) continue;

      const title = String(i.title ?? i.raw ?? i.text ?? i.description ?? 'Incident reported');
      incidents.push({
        id: String(i.key ?? i.id ?? i._id ?? Math.random()),
        title,
        description: String(i.raw ?? i.text ?? i.title ?? ''),
        lat: cLat,
        lng: cLng,
                timestamp: i.cs
          ? new Date(i.cs as number).toISOString()
          : i.ts
          ? new Date((i.ts as number) * 1000).toISOString()
          : i.createdAt
          ? String(i.createdAt)
          : i.created_at
          ? String(i.created_at)
          : new Date().toISOString(),
        category: classifyCitizenCategory(title),
        source: 'CITIZEN',
        confidence: 'SCANNER_DERIVED',
      });
    }
    console.log('Citizen fetch:', incidents.length, 'incidents');
    return incidents;
  } catch (err) {
    console.log('Citizen fetch: 0 incidents (error:', String(err).slice(0, 100), ')');
    return [];
  }
}

function classifyCitizenCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('shoot') || t.includes('shot') || t.includes('gun')) return 'SHOOTING';
  if (t.includes('homicide') || t.includes('murder') || t.includes('killed')) return 'HOMICIDE';
  if (t.includes('weapon') || t.includes('armed')) return 'WEAPONS';
  if (t.includes('robbery') || t.includes('robbed')) return 'ROBBERY';
  if (t.includes('stabbing') || t.includes('stabbed')) return 'STABBING';
  if (t.includes('assault') || t.includes('battery') || t.includes('fight')) return 'BATTERY';
  return 'OTHER';
}
