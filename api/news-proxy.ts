/**
 * News RSS Proxy — Vercel Serverless Function
 * 
 * IMPROVED: Added retry logic for flaky feeds, expanded feed list,
 * better error handling, and longer timeouts.
 * 
 * Accepts either:
 *   ?url=<single RSS URL>  — proxies one feed
 *   (no params)            — fetches all 9 Chicago feeds
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const FEEDS = [
  { name: 'Block Club Chicago', url: 'https://blockclubchicago.org/feed/', priority: 1 },
  { name: 'Chalkbeat Chicago', url: 'https://www.chalkbeat.org/chicago/feed/', priority: 1 },
  { name: 'ABC7 Chicago', url: 'https://abc7chicago.com/feed/', priority: 2 },
  { name: 'NBC5 Chicago', url: 'https://www.nbcchicago.com/news/local/?rss=y', priority: 2 },
  { name: 'CBS Chicago', url: 'https://www.cbsnews.com/chicago/latest/rss/main/', priority: 2 },
  { name: 'Chicago Sun-Times', url: 'https://chicago.suntimes.com/rss/index.xml', priority: 2 },
  { name: 'WGN TV', url: 'https://wgntv.com/feed/', priority: 2 },
  { name: 'WBEZ', url: 'https://feeds.simplecast.com/TDnR3rBX', priority: 2 },
  { name: 'Fox 32 Chicago', url: 'https://www.fox32chicago.com/rss/category/news', priority: 3 },
];

const cache: Record<string, { data: any; ts: number }> = {};
const TTL = 5 * 60 * 1000;

async function fetchFeed(url: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SlateWatch/1.0; +https://slateschools.org)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.text();
      if (i < retries) await new Promise(r => setTimeout(r, 1500));
    } catch {
      if (i < retries) await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw new Error(`Failed after ${retries + 1} attempts`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120');

  const singleUrl = req.query.url as string | undefined;

  // Single feed mode
  if (singleUrl) {
    const key = `news_${singleUrl}`;
    const hit = cache[key];
    if (hit && Date.now() - hit.ts < TTL) return res.status(200).json(hit.data);

    const feed = FEEDS.find(f => f.url === singleUrl);
    try {
      const xml = await fetchFeed(singleUrl);
      const data = {
        feeds: [{
          name: feed?.name || 'Unknown',
          priority: feed?.priority || 3,
          ok: true,
          xml,
        }],
      };
      cache[key] = { data, ts: Date.now() };
      return res.status(200).json(data);
    } catch {
      return res.status(200).json({
        feeds: [{
          name: feed?.name || 'Unknown',
          priority: feed?.priority || 3,
          ok: false,
          xml: '',
          error: 'fetch_failed',
        }],
      });
    }
  }

  // All feeds mode
  const key = 'news_all';
  const hit = cache[key];
  if (hit && Date.now() - hit.ts < TTL) return res.status(200).json(hit.data);

  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const xml = await fetchFeed(feed.url);
        return { name: feed.name, priority: feed.priority, ok: true, xml };
      } catch {
        return { name: feed.name, priority: feed.priority, ok: false, xml: '', error: 'fetch_failed' };
      }
    })
  );

  const feeds = results.map(r => r.status === 'fulfilled' ? r.value : { name: 'Unknown', priority: 3, ok: false, xml: '', error: 'rejected' });
  const data = { feeds };
  cache[key] = { data, ts: Date.now() };
  return res.status(200).json(data);
}
