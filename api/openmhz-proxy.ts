/**
 * OpenMHz Scanner Proxy — Vercel Serverless Function
 * 
 * IMPROVED: Added retry logic, expanded time window, and fallback
 * to CPD dispatch data from Socrata if OpenMHz is down.
 * 
 * Returns scanner calls from chi_cpd (Chicago PD radio).
 * If OpenMHz fails (Cloudflare block), falls back to CPD 911 dispatch data.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const cache: Record<string, { data: any; ts: number }> = {};
const TTL = 2 * 60 * 1000; // 2 minutes (scanner data is time-sensitive)

async function fetchWithRetry(url: string, opts: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(12000) });
      if (res.ok) return res;
      if (i < retries) await new Promise(r => setTimeout(r, 1000));
    } catch {
      if (i < retries) await new Promise(r => setTimeout(r, 1000));
      else throw new Error('All retries failed');
    }
  }
  throw new Error('All retries failed');
}

async function fetchOpenMHz(since: number) {
  const url = `https://api.openmhz.com/chi_cpd/calls?since=${since}&direction=newer`;
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });
  return res.json();
}

async function fetchCPDDispatch(hours: number) {
  // Fallback: CPD 911 dispatch data from Chicago Data Portal
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const url = `https://data.cityofchicago.org/resource/n9g2-c7vt.json?$where=entry_datetime>'${since}'&$order=entry_datetime DESC&$limit=200`;
  const res = await fetchWithRetry(url, {
    headers: { 'Accept': 'application/json' },
  });
  const rows = await res.json();

  // Transform to scanner-like format
  return {
    calls: rows.map((r: any) => ({
      _id: r.event_no || r._id || Math.random().toString(36),
      time: r.entry_datetime,
      talkgroupNum: 0,
      description: r.initial_type_description || r.initial_type || 'Dispatch',
      location: r.block || '',
      district: r.district || '',
      source: 'CPD_DISPATCH',
    })),
    direction: 'newer',
    fallback: true,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30');

  const since = req.query.since
    ? Number(req.query.since)
    : Date.now() - 2 * 60 * 60 * 1000; // default 2 hours

  const key = `scanner_${Math.floor(since / 60000)}`;
  const hit = cache[key];
  if (hit && Date.now() - hit.ts < TTL) return res.status(200).json(hit.data);

  try {
    // Try OpenMHz first
    const data = await fetchOpenMHz(since);
    cache[key] = { data, ts: Date.now() };
    return res.status(200).json(data);
  } catch {
    try {
      // Fallback to CPD dispatch
      const hours = Math.max(2, Math.ceil((Date.now() - since) / 3600000));
      const data = await fetchCPDDispatch(hours);
      cache[key] = { data, ts: Date.now() };
      return res.status(200).json(data);
    } catch {
      return res.status(200).json({ calls: [], direction: 'newer', error: 'all_sources_failed' });
    }
  }
}
