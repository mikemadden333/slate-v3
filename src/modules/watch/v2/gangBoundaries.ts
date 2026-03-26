/**
 * Gang Boundary Layer — CPD 2024 Gang Boundaries
 * ═══════════════════════════════════════════════════
 * Fetches official CPD gang territory boundaries from ArcGIS
 * and renders them as a toggleable Leaflet GeoJSON layer.
 *
 * Source: Chicago Office of Public Safety Administration
 * Dataset: 2024 Gang Boundaries (published Jan 2025, 46 territories)
 * URL: https://gis.chicagopolice.org/datasets/ChicagoPD::2024-gang-boundaries
 *
 * Gang Nation color coding:
 *   People Nation (red/maroon) — Vice Lords, Stones, Latin Kings, etc.
 *   Folk Nation (blue/teal)    — GDs, BDs, Latin Eagles, etc.
 *   Neutral/Other (slate)      — Unaffiliated or mixed
 */

import L from 'leaflet';

const ARCGIS_URL = 'https://services2.arcgis.com/t3tlzCPfmaQzSWAk/arcgis/rest/services/2024_Gang_Bundaries/FeatureServer/0/query';

// ─── Gang Nation Classification ─────────────────────────────────────────
// Based on CPD intelligence and public reporting

const PEOPLE_NATION: string[] = [
  'VICE LORDS', 'CONSERVATIVE VICE LORDS', 'TRAVELING VICE LORDS',
  'CICERO INSANE VICE LORDS', 'MAFIA INSANE VICE LORDS', 'UNKNOWN VICE LORDS',
  'UNDERTAKER VICE LORDS', 'SPANISH VICE LORDS',
  'BLACK P STONES', 'LA FAMILIA STONES',
  'LATIN KINGS', 'MICKEY COBRAS',
  'FOUR CORNER HUSTLERS', 'SPANISH FOUR CORNER HUSTLERS',
  'INSANE UNKNOWNS', 'INSANE DEUCES',
  'C-NOTES', 'BISHOPS',
];

const FOLK_NATION: string[] = [
  'GANGSTER DISCIPLES', 'BLACK DISCIPLES', 'SPANISH GANGSTER DISCIPLES',
  'SATAN DISCIPLES', 'MANIAC LATIN DISCIPLES',
  'LATIN EAGLES', 'LATIN DRAGONS', 'LATIN COUNTS', 'LATIN STYLERS',
  'LATIN SAINTS', 'LATIN BROTHERS ORGANIZATION',
  'TWO SIX', 'TWO-TWO BOYS',
  'AMBROSE', 'LA RAZA',
  'SPANISH COBRAS', 'YOUNG LATIN ORGANIZATION COBRAS',
  'IMPERIAL GANGSTERS', 'HARRISON GENTS',
  'ORCHESTRA ALBANY', 'INSANE DRAGONS',
  'MANIAC CAMPBELL BOYS',
];

function getGangNation(name: string): 'people' | 'folk' | 'other' {
  const upper = name.toUpperCase();
  if (PEOPLE_NATION.some(p => upper.includes(p) || p.includes(upper))) return 'people';
  if (FOLK_NATION.some(f => upper.includes(f) || f.includes(upper))) return 'folk';
  return 'other';
}

const NATION_COLORS = {
  people: { fill: '#8B2252', stroke: '#6B1A3E' },  // Deep maroon
  folk:   { fill: '#2B5F8A', stroke: '#1E4468' },  // Deep blue
  other:  { fill: '#5A6A7E', stroke: '#3D4A5C' },  // Slate
};

// ─── Data Cache ─────────────────────────────────────────────────────────

let cachedGeoJSON: GeoJSON.FeatureCollection | null = null;
let fetchPromise: Promise<GeoJSON.FeatureCollection | null> | null = null;

export async function fetchGangBoundaries(): Promise<GeoJSON.FeatureCollection | null> {
  if (cachedGeoJSON) return cachedGeoJSON;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const params = new URLSearchParams({
        outFields: 'GANG_NAME',
        where: '1=1',
        f: 'geojson',
        returnGeometry: 'true',
      });
      const res = await fetch(`${ARCGIS_URL}?${params.toString()}`);
      if (!res.ok) {
        console.error('Gang boundaries fetch failed:', res.status);
        return null;
      }
      const data = await res.json() as GeoJSON.FeatureCollection;
      cachedGeoJSON = data;
      console.log(`Gang boundaries loaded: ${data.features.length} territories`);
      return data;
    } catch (err) {
      console.error('Gang boundaries fetch error:', err);
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// ─── Leaflet Layer Factory ──────────────────────────────────────────────

export function createGangBoundaryLayer(map: L.Map): L.LayerGroup {
  const layerGroup = L.layerGroup();

  fetchGangBoundaries().then(geojson => {
    if (!geojson) return;

    L.geoJSON(geojson, {
      style: (feature) => {
        const name = feature?.properties?.GANG_NAME ?? '';
        const nation = getGangNation(name);
        const colors = NATION_COLORS[nation];
        return {
          fillColor: colors.fill,
          fillOpacity: 0.12,
          color: colors.stroke,
          weight: 1.5,
          opacity: 0.5,
          dashArray: '4,4',
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.GANG_NAME ?? 'Unknown';
        const nation = getGangNation(name);
        const nationLabel = nation === 'people' ? 'People Nation' : nation === 'folk' ? 'Folk Nation' : 'Unaffiliated';
        const colors = NATION_COLORS[nation];

        layer.bindTooltip(
          `<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:600;color:${colors.stroke};letter-spacing:0.02em;">
            ${name}
          </div>
          <div style="font-family:'IBM Plex Sans',sans-serif;font-size:10px;color:#5A6A7E;margin-top:2px;">
            ${nationLabel} · CPD 2024
          </div>`,
          {
            sticky: true,
            direction: 'top',
            offset: [0, -10],
            className: 'gang-boundary-tooltip',
          }
        );

        // Highlight on hover
        layer.on('mouseover', () => {
          (layer as L.Path).setStyle({
            fillOpacity: 0.25,
            weight: 2.5,
            opacity: 0.8,
          });
        });
        layer.on('mouseout', () => {
          (layer as L.Path).setStyle({
            fillOpacity: 0.12,
            weight: 1.5,
            opacity: 0.5,
          });
        });
      },
    }).addTo(layerGroup);
  });

  return layerGroup;
}

// ─── Tooltip CSS ────────────────────────────────────────────────────────

export const GANG_BOUNDARY_CSS = `
.gang-boundary-tooltip {
  background: rgba(255,255,255,0.96) !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 6px !important;
  padding: 6px 10px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
}
.gang-boundary-tooltip::before {
  border-top-color: #E2E8F0 !important;
}
`;
