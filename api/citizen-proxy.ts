/**
 * Citizen Proxy — Vercel Serverless Function
 * 
 * FIXED: Switched from /api/v2/incidents with insideBoundingBox[] to
 * /api/incident/trending with named bounding box params.
 * Added response normalization (object → array) and 5-min cache.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const cache: Record<string, { data: any; ts: number }> = {};
const TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60');

  const { lat, lng, radius = '2.0' } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  const delta = Number(radius) / 69;
  const latN = Number(lat);
  const lngN = Number(lng);

  const key = `${latN.toFixed(3)}_${lngN.toFixed(3)}_${radius}`;
  const hit = cache[key];
  if (hit && Date.now() - hit.ts < TTL) return res.status(200).json(hit.data);

  const url = `https://citizen.com/api/incident/trending` +
    `?lowerLatitude=${latN - delta}` +
    `&upperLatitude=${latN + delta}` +
    `&lowerLongitude=${lngN - delta}` +
    `&upperLongitude=${lngN + delta}` +
    `&fullResponse=true&limit=200`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://citizen.com/',
        'Origin': 'https://citizen.com',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return res.status(200).json({ results: [], error: 'upstream_failed' });

    const data = await response.json();

    // Normalize: new endpoint returns { results: { key: incident } } not array
    if (data.results && !Array.isArray(data.results)) {
      data.results = Object.values(data.results);
    }

    cache[key] = { data, ts: Date.now() };
    return res.status(200).json(data);
  } catch {
    return res.status(200).json({ results: [], error: 'fetch_failed' });
  }
}
