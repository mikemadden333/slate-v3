/**
 * Reddit — r/chicago and r/CrimeInChicago as near-real-time incident source.
 * Replaces Citizen app which is blocked from Vercel.
 * Posts are filtered by violence keywords and fed into the news geocoder pipeline.
 */
import type { NewsItem } from '../engine/types';

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  created: number;
  subreddit: string;
  url: string;
  score: number;
  numComments: number;
}

const VIOLENCE_KEYWORDS = [
  'shoot', 'shot', 'shooting', 'gunshot', 'gunfire',
  'kill', 'killed', 'murder', 'homicide', 'fatal',
  'stab', 'stabbed', 'stabbing',
  'carjack', 'carjacking', 'hijack',
  'robbery', 'robbed', 'armed',
  'assault', 'attacked', 'beaten',
  'police', 'cpd', 'swat',
  'crime', 'violent', 'weapon',
  'dead', 'body', 'victim',
  'explosion', 'fire', 'arson',
];

function isViolenceRelated(post: RedditPost): boolean {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  return VIOLENCE_KEYWORDS.some(kw => text.includes(kw));
}

export async function fetchRedditPosts(): Promise<NewsItem[]> {
  try {
    const res = await fetch('/api/reddit-proxy');
    if (!res.ok) {
      console.log('Reddit proxy: HTTP', res.status);
      return [];
    }
    const json = await res.json();
    const allPosts: RedditPost[] = [];

    for (const feed of json.feeds ?? []) {
      if (feed.ok && Array.isArray(feed.posts)) {
        console.log(`Reddit r/${feed.subreddit}: ${feed.posts.length} posts`);
        allPosts.push(...feed.posts);
      } else {
        console.log(`Reddit r/${feed.subreddit}: failed — ${feed.error}`);
      }
    }

    // Filter to violence-related posts from last 24 hours
    const cutoff = Date.now() / 1000 - 24 * 3600;
    const relevant = allPosts
      .filter(p => p.created > cutoff)
      .filter(isViolenceRelated);

    console.log(`Reddit: ${allPosts.length} total, ${relevant.length} violence-related (24h)`);

    return relevant.map(p => ({
      title: p.title,
      link: p.url,
      source: `Reddit r/${p.subreddit}`,
      published: new Date(p.created * 1000).toISOString(),
      summary: p.selftext.slice(0, 300) || p.title,
    }));
  } catch (err) {
    console.log('Reddit fetch failed:', err);
    return [];
return [];
  }
}