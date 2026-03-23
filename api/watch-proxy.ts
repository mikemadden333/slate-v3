import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Unified Watch Proxy — ONE serverless function for ALL feeds.
 *
 * Usage:
 *   /api/watch-proxy?feed=citizen&lat=41.88&lng=-87.63&radius=2
 *   /api/watch-proxy?feed=cpd&days=30
 *   /api/watch-proxy?feed=vr&days=30
 *   /api/watch-proxy?feed=dispatch&hours=6
 *   /api/watch-proxy?feed=nws
 *   /api/watch-proxy?feed=cwb
 *   /api/watch-proxy?feed=bluesky&actor=cwbchicago.bsky.social&limit=50
 *   /api/watch-proxy?feed=weather
 *   /api/watch-proxy?feed=news
 *   /api/watch-proxy?feed=scanner&since=<timestamp>
 */

// ── In-memory cache ──────────────────────────────────────────
const cache: Record<string, { data: any; ts: number }> = {};
function cached(key: string, ttlMs: number): any | null {
  const hit = cache[key];
  return hit && Date.now() - hit.ts < ttlMs ? hit.data : null;
}
function store(key: string, data: any) { cache[key] = { data, ts: Date.now() }; }

// ── Retry helper ─────────────────────────────────────────────
async function fetchRetry(
  url: string,
  opts: RequestInit = {},
  retries = 2,
  timeoutMs = 15000,
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return res;
    } catch { /* retry */ }
    if (i < retries) await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(`fetch failed after ${retries + 1} tries: ${url.slice(0, 120)}`);
}

// ── CITIZEN ──────────────────────────────────────────────────
async function citizen(req: VercelRequest) {
  const { lat, lng, radius = '2.0' } = req.query;
  if (!lat || !lng) return { error: 'lat and lng required' };
  const delta = Number(radius) / 69;
  const latN = Number(lat); const lngN = Number(lng);
  const key = `citizen_${latN}_${lngN}_${radius}`;
  const hit = cached(key, 60_000); if (hit) return hit;

  const url = `https://citizen.com/api/incident/trending`
    + `?lowerLatitude=${latN - delta}&upperLatitude=${latN + delta}`
    + `&lowerLongitude=${lngN - delta}&upperLongitude=${lngN + delta}`
    + `&fullResponse=true&limit=200`;

  try {
    const res = await fetchRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://citizen.com/', 'Origin': 'https://citizen.com',
      },
    });
    const data = await res.json();
    if (data.results && !Array.isArray(data.results)) data.results = Object.values(data.results);
    store(key, data); return data;
  } catch { return { results: [], error: 'citizen_failed' }; }
}

// ── CPD CRIME DATA ───────────────────────────────────────────
const VIOLENT = ['HOMICIDE','ASSAULT','BATTERY','ROBBERY','CRIM SEXUAL ASSAULT',
  'WEAPONS VIOLATION','KIDNAPPING','HUMAN TRAFFICKING','INTIMIDATION','ARSON'];

async function cpd(req: VercelRequest) {
  const days = Math.min(Number(req.query.days) || 30, 90);
  const limit = Math.min(Number(req.query.limit) || 5000, 10000);
  const key = `cpd_${days}_${limit}`; const hit = cached(key, 600_000); if (hit) return hit;

  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const typeFilter = VIOLENT.map(t => `primary_type='${t}'`).join(' OR ');
  const where = `date>'${since}T00:00:00.000' AND (${typeFilter})`;
  const url = `https://data.cityofchicago.org/resource/ijzp-q8t2.json`
    + `?$where=${encodeURIComponent(where)}&$order=date DESC&$limit=${limit}`;

  try {
    const res = await fetchRetry(url, { headers: { Accept: 'application/json' } }, 3, 20000);
    const rows = await res.json();
    const data = { incidents: rows, count: rows.length, days, mostRecent: rows[0]?.date || null, fetchedAt: new Date().toISOString() };
    store(key, data); return data;
  } catch { return { incidents: [], count: 0, error: 'cpd_failed' }; }
}

// ── VIOLENCE REDUCTION ───────────────────────────────────────
async function vr(req: VercelRequest) {
  const days = Math.min(Number(req.query.days) || 30, 90);
  const key = `vr_${days}`; const hit = cached(key, 600_000); if (hit) return hit;

  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const url = `https://data.cityofchicago.org/resource/gumc-mgzr.json`
    + `?$where=${encodeURIComponent(`date>'${since}T00:00:00.000'`)}&$order=date DESC&$limit=5000`;

  try {
    const res = await fetchRetry(url, { headers: { Accept: 'application/json' } }, 3, 20000);
    const rows = await res.json();
    const data = { incidents: rows, count: rows.length, days, mostRecent: rows[0]?.date || null, fetchedAt: new Date().toISOString() };
    store(key, data); return data;
  } catch { return { incidents: [], count: 0, error: 'vr_failed' }; }
}

// ── CPD DISPATCH (via Crime Reports) ─────────────────────────
// Chicago does not publish real-time 911 dispatch data publicly.
// We use CPD crime reports filtered to violent types as a dispatch proxy.
const PRIORITY_TYPES = ['HOMICIDE','WEAPONS VIOLATION','CRIM SEXUAL ASSAULT','ROBBERY','ASSAULT','BATTERY'];

async function dispatch(req: VercelRequest) {
  const days = Math.min(Number(req.query.days) || 10, 30);
  const key = `dispatch_${days}`; const hit = cached(key, 180_000); if (hit) return hit;

  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const typeFilter = PRIORITY_TYPES.map(t => `primary_type='${t}'`).join(' OR ');
  const where = `date>'${since}T00:00:00.000' AND (${typeFilter}) AND latitude IS NOT NULL`;
  const url = `https://data.cityofchicago.org/resource/ijzp-q8t2.json`
    + `?$where=${encodeURIComponent(where)}&$order=date DESC&$limit=500`;

  try {
    const res = await fetchRetry(url, { headers: { Accept: 'application/json' } }, 3, 20000);
    const rows = await res.json() as any[];
    const dispatches = (rows || []).map((r: any) => {
      const type = (r.primary_type || '').toUpperCase();
      return {
        id: r.id || r.case_number, time: r.date,
        type: r.primary_type || 'Unknown',
        description: r.description || '',
        block: r.block || '', district: r.district || '', beat: r.beat || '',
        ward: r.ward || '',
        isPriority: ['HOMICIDE','WEAPONS VIOLATION','CRIM SEXUAL ASSAULT'].includes(type),
        latitude: Number(r.latitude), longitude: Number(r.longitude),
      };
    });
    const data = { dispatches, count: dispatches.length, priorityCount: dispatches.filter((d: any) => d.isPriority).length, days, source: 'CPD Crime Reports', fetchedAt: new Date().toISOString() };
    store(key, data); return data;
  } catch { return { dispatches: [], count: 0, priorityCount: 0, error: 'dispatch_failed' }; }
}

// ── NWS ALERTS ───────────────────────────────────────────────
async function nws() {
  const key = 'nws'; const hit = cached(key, 300_000); if (hit) return hit;
  const urls = ['https://api.weather.gov/alerts/active?zone=ILZ014', 'https://api.weather.gov/alerts/active?area=IL'];
  for (const url of urls) {
    try {
      const res = await fetchRetry(url, { headers: { 'User-Agent': '(SlateWatch, safety@slateschools.org)', Accept: 'application/geo+json' } }, 2, 10000);
      const raw = await res.json();
      const alerts = (raw.features || []).map((f: any) => ({
        id: f.id, event: f.properties?.event, headline: f.properties?.headline,
        description: f.properties?.description, severity: f.properties?.severity,
        urgency: f.properties?.urgency, effective: f.properties?.effective,
        expires: f.properties?.expires, areaDesc: f.properties?.areaDesc,
      }));
      const data = { alerts, count: alerts.length, fetchedAt: new Date().toISOString() };
      store(key, data); return data;
    } catch { /* try next URL */ }
  }
  return { alerts: [], count: 0, error: 'nws_unavailable' };
}

// ── CWB CHICAGO (RSS + Bluesky fallback) ─────────────────────
const UA_LIST = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

async function cwb() {
  const key = 'cwb'; const hit = cached(key, 600_000); if (hit) return hit;
  for (const ua of UA_LIST) {
    try {
      const res = await fetchRetry('https://cwbchicago.com/feed', { headers: { 'User-Agent': ua, Accept: 'application/rss+xml, text/xml, */*' } }, 1, 12000);
      const text = await res.text();
      if (text.includes('<rss') || text.includes('<feed')) {
        const data = { source: 'rss', xml: text, fetchedAt: new Date().toISOString() };
        store(key, data); return data;
      }
    } catch { /* try next UA */ }
  }
  // Fallback: Bluesky
  try {
    const res = await fetchRetry('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=did%3Aplc%3A3zhi77w7l2dic7ibsq2lof34&limit=30', { headers: { Accept: 'application/json' } });
    const raw = await res.json();
    const posts = (raw.feed || []).map((item: any) => ({
      text: item.post?.record?.text || '', createdAt: item.post?.record?.createdAt || '',
      uri: item.post?.uri || '', author: item.post?.author?.handle || 'cwbchicago.com',
    }));
    const data = { source: 'bluesky', posts, count: posts.length, fetchedAt: new Date().toISOString() };
    store(key, data); return data;
  } catch { return { source: 'none', error: 'cwb_unavailable' }; }
}

// ── BLUESKY ──────────────────────────────────────────────────
async function bluesky(req: VercelRequest) {
  const actor = (req.query.actor as string) || (req.query.handle as string) || 'did:plc:3zhi77w7l2dic7ibsq2lof34';
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const key = `bsky_${actor}_${limit}`; const hit = cached(key, 180_000); if (hit) return hit;

  try {
    const res = await fetchRetry(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}`,
      { headers: { Accept: 'application/json' } },
      3, 12000,
    );
    const raw = await res.json();
    const posts = (raw.feed || []).map((item: any) => ({
      text: item.post?.record?.text || '', createdAt: item.post?.record?.createdAt || '',
      uri: item.post?.uri || '', author: item.post?.author?.handle || 'cwbchicago.bsky.social',
      likeCount: item.post?.likeCount || 0, repostCount: item.post?.repostCount || 0,
    }));
    const data = { posts, count: posts.length, fetchedAt: new Date().toISOString() };
    store(key, data); return data;
  } catch { return { posts: [], count: 0, error: 'bluesky_unavailable' }; }
}

// ── WEATHER ──────────────────────────────────────────────────
async function weather() {
  const key = 'weather'; const hit = cached(key, 900_000); if (hit) return hit;
  try {
    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=41.8781&longitude=-87.6298'
      + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m'
      + '&hourly=temperature_2m,weather_code,precipitation_probability'
      + '&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1&timezone=America/Chicago';
    const res = await fetchRetry(url, {}, 2, 10000);
    const data = { ...(await res.json()), fetchedAt: new Date().toISOString() };
    store(key, data); return data;
  } catch { return { error: 'weather_unavailable' }; }
}

// ── NEWS RSS ─────────────────────────────────────────────────
const FEEDS = [
  { name: 'Block Club Chicago', url: 'https://blockclubchicago.org/feed/' },
  { name: 'Chalkbeat Chicago', url: 'https://www.chalkbeat.org/chicago/feed/' },
  { name: 'ABC7 Chicago', url: 'https://abc7chicago.com/feed/' },
  { name: 'NBC5 Chicago', url: 'https://www.nbcchicago.com/news/local/?rss=y' },
  { name: 'CBS Chicago', url: 'https://www.cbsnews.com/chicago/latest/rss/main/' },
  { name: 'Chicago Sun-Times', url: 'https://chicago.suntimes.com/rss/index.xml' },
  { name: 'WGN TV', url: 'https://wgntv.com/feed/' },
  { name: 'WBEZ', url: 'https://feeds.simplecast.com/TDnR3rBX' },
  { name: 'Fox 32 Chicago', url: 'https://www.fox32chicago.com/rss/category/news' },
];

async function news(req: VercelRequest) {
  const singleUrl = req.query.url as string | undefined;

  if (singleUrl) {
    const key = `news_${singleUrl}`; const hit = cached(key, 300_000); if (hit) return hit;
    const feed = FEEDS.find(f => f.url === singleUrl);
    try {
      const res = await fetchRetry(singleUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SlateWatch/1.0)', Accept: 'application/rss+xml, text/xml, */*' } });
      const xml = await res.text();
      const data = { feeds: [{ name: feed?.name || 'Unknown', ok: true, xml }] };
      store(key, data); return data;
    } catch { return { feeds: [{ name: feed?.name || 'Unknown', ok: false, xml: '', error: 'fetch_failed' }] }; }
  }

  const key = 'news_all'; const hit = cached(key, 300_000); if (hit) return hit;
  const results = await Promise.allSettled(FEEDS.map(async (feed) => {
    try {
      const res = await fetchRetry(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SlateWatch/1.0)', Accept: 'application/rss+xml, text/xml, */*' } });
      return { name: feed.name, ok: true, xml: await res.text() };
    } catch { return { name: feed.name, ok: false, xml: '', error: 'fetch_failed' }; }
  }));
  const feeds = results.map(r => r.status === 'fulfilled' ? r.value : { name: 'Unknown', ok: false, xml: '' });
  const data = { feeds }; store(key, data); return data;
}

// ── SCANNER / DISPATCH ACTIVITY ──────────────────────────────
// OpenMHz is Cloudflare-blocked as of March 2026.
// Uses CPD recent violent crime data as real-time dispatch activity proxy.
// CPD data has ~7-8 day lag, so we pull a 10-day window to ensure coverage.
async function scanner(req: VercelRequest) {
  const key = 'scanner_cpd'; const hit = cached(key, 120_000); if (hit) return hit;

  try {
    const hours = Number(req.query.hours) || 240; // 10 days default — CPD data lags ~8 days
    const since = new Date(Date.now() - hours * 3600000).toISOString().split('T')[0];

    const typeFilter = "primary_type IN('WEAPONS VIOLATION','HOMICIDE','ASSAULT','BATTERY','ROBBERY','CRIM SEXUAL ASSAULT')";
    const where = `date>'${since}T00:00:00.000' AND ${typeFilter} AND latitude IS NOT NULL`;
    const url = `https://data.cityofchicago.org/resource/ijzp-q8t2.json`
      + `?$where=${encodeURIComponent(where)}&$order=date DESC&$limit=500`;

    const res = await fetchRetry(url, { headers: { Accept: 'application/json' } }, 3, 20000);
    const raw = await res.json() as any[];

    const calls = (raw || []).map((r: any) => ({
      id: r.id || r.case_number,
      time: r.date,
      type: r.primary_type,
      description: r.description,
      block: r.block || '',
      district: r.district || '',
      beat: r.beat || '',
      ward: r.ward || '',
      communityArea: r.community_area || '',
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      source: 'CPD_DISPATCH',
    }));

    const data = {
      calls,
      count: calls.length,
      source: 'Chicago Police Department — Crime Reports',
      note: 'Violent crime dispatch activity from CPD (HOMICIDE, ASSAULT, BATTERY, ROBBERY, WEAPONS, CRIM SEXUAL ASSAULT). Data has ~7-8 day lag.',
      fetchedAt: new Date().toISOString(),
    };
    store(key, data); return data;
  } catch { return { calls: [], count: 0, error: 'scanner_failed' }; }
}

// ── ROUTER ───────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60');

  const feed = (req.query.feed as string || '').toLowerCase();

  try {
    switch (feed) {
      case 'citizen':  return res.json(await citizen(req));
      case 'cpd':      return res.json(await cpd(req));
      case 'vr':       return res.json(await vr(req));
      case 'dispatch': return res.json(await dispatch(req));
      case 'nws':      return res.json(await nws());
      case 'cwb':      return res.json(await cwb());
      case 'bluesky':  return res.json(await bluesky(req));
      case 'weather':  return res.json(await weather());
      case 'news':     return res.json(await news(req));
      case 'scanner':  return res.json(await scanner(req));
      default:
        return res.status(400).json({
          error: 'Missing or unknown feed parameter',
          available: ['citizen','cpd','vr','dispatch','nws','cwb','bluesky','weather','news','scanner'],
          usage: '/api/watch-proxy?feed=citizen&lat=41.88&lng=-87.63&radius=2',
        });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
