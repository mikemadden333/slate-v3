/**
 * Gang Boundaries API Proxy
 * ═══════════════════════════════════════════════════
 * Proxies the CPD 2024 Gang Boundaries from ArcGIS.
 * Caches the response for 24 hours since this data rarely changes.
 *
 * Source: Chicago Office of Public Safety Administration
 * Dataset: 2024 Gang Boundaries (published Jan 2025)
 * URL: https://gis.chicagopolice.org/datasets/ChicagoPD::2024-gang-boundaries
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ARCGIS_URL = 'https://services2.arcgis.com/t3tlzCPfmaQzSWAk/arcgis/rest/services/2024_Gang_Bundaries/FeatureServer/0/query';

let cachedData: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Return cached data if fresh
    if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).send(cachedData);
    }

    const params = new URLSearchParams({
      outFields: 'GANG_NAME',
      where: '1=1',
      f: 'geojson',
      returnGeometry: 'true',
    });

    const response = await fetch(`${ARCGIS_URL}?${params.toString()}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `ArcGIS returned ${response.status}` });
    }

    const text = await response.text();
    cachedData = text;
    cacheTime = Date.now();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Source', 'CPD CLEARMAP 2024 Gang Boundaries');
    return res.status(200).send(text);
  } catch (err) {
    console.error('Gang boundaries fetch error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
