import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUBREDDITS = [
  'chicago',
  'CrimeInChicago',
  'ChicagoScanner',
  'ChicagoAlarum',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const results = await Promise.allSettled(
    SUBREDDITS.map(async sub => {
      const url = `https://www.reddit.com/r/${sub}/new.json?limit=50`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Sentinel/2.0; +https://nobleschools.org)',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`${response.status}`);
      const json = await response.json();
      const posts = (json?.data?.children ?? []).map((c: any) => ({
        id: c.data?.id ?? '',
        title: c.data?.title ?? '',
        selftext: (c.data?.selftext ?? '').slice(0, 500),
        created: c.data?.created_utc ?? 0,
        subreddit: sub,
        url: `https://www.reddit.com${c.data?.permalink ?? ''}`,
        score: c.data?.score ?? 0,
        numComments: c.data?.num_comments ?? 0,
      }));
      return { subreddit: sub, posts, ok: true };
    })
  );

  const feeds = results.map((r, i) => ({
    subreddit: SUBREDDITS[i],
    ok: r.status === 'fulfilled',
    posts: r.status === 'fulfilled' ? r.value.posts : [],
    error: r.status === 'rejected' ? String(r.reason) : null,
  }));

  return res.status(200).json({ feeds, timestamp: new Date().toISOString() });
}