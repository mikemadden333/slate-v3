/**
 * RSS News Feed Aggregation — Chicago local outlets.
 * Fetches via CORS proxy, parses with DOMParser, classifies by 4-tier priority.
 *
 * TIER 1 — Campus proximate: neighborhood within 2mi of Noble campus + violence keywords
 * TIER 2 — Chicago violence: Chicago violence not proximate to a specific campus
 * TIER 3 — Chicago general: Chicago news affecting school operations
 * TIER 4 — National breaking: significant national events affecting schools
 * DISCARD — everything else
 */

import type { NewsItem, NewsTier, Incident } from '../engine/types';
import { CAMPUSES } from '../data/campuses';
import { haversine } from '../engine/geo';

/* ═══ Keyword lists ═══ */

const VIOLENCE_KEYWORDS = [
  'shooting', 'shot', 'shots fired', 'gunfire', 'homicide',
  'killed', 'murder', 'stabbing', 'stabbed', 'wounded',
  'fatal', 'body found', 'deceased', 'gang', 'weapons',
  'lockdown', 'active shooter', 'carjacking', 'robbery',
  'assault', 'beaten', 'attacked', 'drive-by', 'driveby',
];

const ICE_KW = /\bICE\b|immigration enforcement|deportation|raid|federal agents|detained|detain|undocumented|sanctuary|rapid response|immigration arrest|immigrant|immigration officer|warrant/i;

const NATIONAL_BREAKING = [
  'national emergency', 'martial law', 'civil unrest',
  'nationwide protest', 'school shooting', 'terror attack',
  'federal raid schools', 'ice schools', 'deportation schools',
  'supreme court schools', 'education department',
];

const VIOLENCE_RE = new RegExp(VIOLENCE_KEYWORDS.join('|'), 'i');
const NATIONAL_RE = new RegExp(NATIONAL_BREAKING.join('|'), 'i');

/* ═══ Campus neighborhood map ═══ */

const CAMPUS_NEIGHBORHOODS: Record<number, string[]> = {
  1:  ['burnside', 'calumet heights', 'south chicago', '89th', '90th'],
  2:  ['near west side', 'west loop', 'united center', 'adams'],
  3:  ['roseland', 'pullman', '103rd', 'west pullman'],
  4:  ['south shore', 'woodlawn', '71st', '72nd', 'chicago ave'],
  5:  ['south shore', 'woodlawn', '72nd', '71st'],
  6:  ['north lawndale', 'homan', 'lawndale', 'douglas park'],
  7:  ['west town', 'wicker park', 'superior', 'noble street'],
  8:  ['auburn gresham', 'chatham', 'aberdeen', '87th', '88th'],
  9:  ['englewood', 'west englewood', '63rd', 'stewart', 'halsted'],
  10: ['brighton park', 'back of the yards', '47th', 'western'],
  11: ['loop', 'downtown', 'state street', 'dearborn', 'michigan ave'],
  12: ['west town', 'noble street', 'division', 'chicago ave'],
  13: ['hermosa', 'belmont cragin', 'cortland', 'kimball'],
  14: ['near west side', 'ohio', 'grand', 'western ave'],
  15: ['humboldt park', 'chicago ave', 'central park', 'pulaski'],
  16: ['belmont cragin', 'grand ave', 'austin', 'grand'],
  17: ['west town', 'ogden', 'milwaukee', 'division'],
  18: ['south lawndale', 'little village', 'millard', 'cermak', '26th'],
};

export function findProximateCampuses(text: string): number[] {
  const lower = text.toLowerCase();
  const ids: number[] = [];
  for (const [id, terms] of Object.entries(CAMPUS_NEIGHBORHOODS)) {
    if (terms.some(t => lower.includes(t))) {
      ids.push(Number(id));
    }
  }
  return ids;
}

/* ═══ Source health tracking ═══ */

export interface SourceHealth {
  name: string;
  status: 'green' | 'amber' | 'red' | 'degraded';
  lastFetch: Date | null;
  itemCount: number;
  consecutiveFailures: number;
}

const sourceHealth: Map<string, SourceHealth> = new Map();

export function getSourceHealth(): SourceHealth[] {
  return Array.from(sourceHealth.values());
}

/* ═══ Server-side proxy (Vercel function — no CORS issues) ═══ */

/* ═══ Classify tier ═══ */

function classifyTier(text: string, proximateCampusIds: number[]): NewsTier {
  const hasViolence = VIOLENCE_RE.test(text);
  if (proximateCampusIds.length > 0 && hasViolence) return 'CAMPUS_PROXIMATE';
  if (hasViolence) return 'CHICAGO_VIOLENCE';
  if (NATIONAL_RE.test(text)) return 'NATIONAL_BREAKING';
  return 'CHICAGO_GENERAL';
}

/* ═══ Classify a single news item ═══ */

export function classifyItem(item: NewsItem): NewsItem {
  const text = `${item.title} ${item.description}`;

  if (ICE_KW.test(text)) {
    item.category = 'ice';
  } else if (VIOLENCE_RE.test(text)) {
    item.category = 'violence';
  }

  const lowerText = text.toLowerCase();
  const communityAreas = CAMPUSES.map(c => c.communityArea.toLowerCase());
  const mentioned = communityAreas.filter(n => lowerText.includes(n));
  item.neighborhoods = [...new Set(mentioned)];

  const proximateIds = findProximateCampuses(text);
  item.proximateCampusIds = proximateIds;

  if (proximateIds.length > 0) {
    const matchedCampus = CAMPUSES.find(c => c.id === proximateIds[0]);
    if (matchedCampus) {
      item.campusProximity = { campusId: matchedCampus.id, distance: 0 };
    }
  }

  item.tier = classifyTier(text, proximateIds);

  const realtimeSources = ['Block Club Chicago', 'ABC7 Chicago', 'NBC5 Chicago', 'CBS Chicago'];
  if (realtimeSources.includes(item.source) && item.tier === 'CAMPUS_PROXIMATE') {
    item.isBreaking = true;
  }

  return item;
}

/* ═══ Strip HTML ═══ */

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

/* ═══ Parse RSS/Atom ═══ */

export function parseRSS(xml: string, sourceName: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items: NewsItem[] = [];

  const rssItems = doc.querySelectorAll('item');
  rssItems.forEach(item => {
    const title = item.querySelector('title')?.textContent ?? '';
    const description = item.querySelector('description')?.textContent ?? '';
    const link = item.querySelector('link')?.textContent ?? '';
    const pubDate = item.querySelector('pubDate')?.textContent ?? '';

    items.push(classifyItem({
      id: link || `${sourceName}-${title.slice(0, 30)}`,
      source: sourceName,
      title,
      description: stripHtml(description),
      link,
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category: 'general',
      tier: 'CHICAGO_GENERAL',
      neighborhoods: [],
    }));
  });

  if (items.length === 0) {
    const entries = doc.querySelectorAll('entry');
    entries.forEach(entry => {
      const title = entry.querySelector('title')?.textContent ?? '';
      const summary = entry.querySelector('summary')?.textContent ?? entry.querySelector('content')?.textContent ?? '';
      const linkEl = entry.querySelector('link');
      const link = linkEl?.getAttribute('href') ?? '';
      const published = entry.querySelector('published')?.textContent ?? entry.querySelector('updated')?.textContent ?? '';

      items.push(classifyItem({
        id: link || `${sourceName}-${title.slice(0, 30)}`,
        source: sourceName,
        title,
        description: stripHtml(summary),
        link,
        pubDate: published ? new Date(published).toISOString() : new Date().toISOString(),
        category: 'general',
        tier: 'CHICAGO_GENERAL',
        neighborhoods: [],
      }));
    });
  }

  return items;
}

/* ═══ Fetch all feeds via Vercel serverless proxy ═══ */

export async function fetchAllFeeds(): Promise<NewsItem[]> {
  const all: NewsItem[] = [];

  try {
    const response = await fetch('/api/news-proxy');
    const { feeds } = await response.json() as {
      feeds: Array<{ name: string; priority: number; ok: boolean; xml: string; error: string | null }>;
    };

    for (const feed of feeds) {
      const health: SourceHealth = {
        name: feed.name,
        status: feed.ok ? 'green' : 'red',
        lastFetch: feed.ok ? new Date() : null,
        itemCount: 0,
        consecutiveFailures: feed.ok ? 0 : (sourceHealth.get(feed.name)?.consecutiveFailures ?? 0) + 1,
      };

      if (feed.ok && feed.xml) {
        const items = parseRSS(feed.xml, feed.name);
        health.itemCount = items.length;
        health.status = items.length > 0 ? 'green' : 'amber';
        if (items.length > 0) {
          console.log(`News proxy success: ${feed.name} — ${items.length} items`);
        }
        all.push(...items);
      } else {
        health.status = health.consecutiveFailures >= 3 ? 'degraded' : 'red';
      }
      sourceHealth.set(feed.name, health);
    }
  } catch (err) {
    console.error('News proxy fetch failed:', err);
  }

 // Reddit as Citizen replacement
  const seen = new Set<string>();
  const unique = all.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  const TIER_ORDER: Record<NewsTier, number> = {
    CAMPUS_PROXIMATE: 0,
    CHICAGO_VIOLENCE: 1,
    CHICAGO_GENERAL: 2,
    NATIONAL_BREAKING: 3,
  };

  unique.sort((a, b) => {
    const tierDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  const t1 = unique.filter(i => i.tier === 'CAMPUS_PROXIMATE').length;
  const t2 = unique.filter(i => i.tier === 'CHICAGO_VIOLENCE').length;
  console.log('News Tier1:', t1, 'campus-proximate items');
  console.log('News Tier2:', t2, 'Chicago violence items');

  return unique;
}

/* ═══ Parse news headlines as real-time incident data ═══ */

const REALTIME_NEWS_SOURCES = [
  'Block Club Chicago',
  'ABC7 Chicago',
  'NBC5 Chicago',
  'CBS Chicago',
];

const VIOLENCE_KW = [
  'shot', 'shooting', 'shoot', 'homicide', 'killed', 'kill',
  'stabbed', 'stab', 'murder', 'wounded', 'fatal', 'weapon',
  'dead', 'death', 'victim', 'gunfire', 'robbery', 'robbed',
  'carjack', 'assault', 'attack', 'violent', 'violence', 'gang',
];

export function parseNewsAsIncidents(newsItems: NewsItem[]): Incident[] {
  const incidents: Incident[] = [];
  const perSource: Record<string, number> = {};
  for (const src of REALTIME_NEWS_SOURCES) perSource[src] = 0;

  for (const item of newsItems) {
    if (!REALTIME_NEWS_SOURCES.includes(item.source)) continue;
    if (item.tier !== 'CAMPUS_PROXIMATE') continue; // already classified as near a campus

    const text = (item.title + ' ' + (item.description ?? '')).toLowerCase();

    // Must contain violence keyword
    if (!VIOLENCE_KW.some(k => text.includes(k))) continue;

    // Use the nearest campus coordinates — proximateCampusIds is set by classifyItem
    const campusId = item.proximateCampusIds?.[0] ?? item.campusProximity?.campusId;
    const campus = campusId != null ? CAMPUSES.find(c => c.id === campusId) : undefined;
    if (!campus) continue;

    // Place incident near campus with random 0-0.5mi offset
    const offsetLat = (Math.random() - 0.5) * 0.008;
    const offsetLng = (Math.random() - 0.5) * 0.008;

    // Classify type
    let type = 'BATTERY';
    if (text.includes('homicide') || text.includes('killed') || text.includes('murder') || text.includes('fatal')) {
      type = 'HOMICIDE';
    } else if (text.includes('shot') || text.includes('shooting') || text.includes('gunfire')) {
      type = 'SHOOTING';
    } else if (text.includes('stab')) {
      type = 'BATTERY';
    } else if (text.includes('weapon') || text.includes('gun')) {
      type = 'WEAPONS VIOLATION';
    }

    const srcTag = item.source.replace(/\s+/g, '').toLowerCase();
    incidents.push({
      id: `news_${srcTag}_${item.id || String(Math.random())}`,
      type,
      date: item.pubDate || new Date().toISOString(),
      block: campus.communityArea.toUpperCase(),
      lat: campus.lat + offsetLat,
      lng: campus.lng + offsetLng,
      description: item.title,
      source: 'NEWS',
      confidence: 'NEWS_REPORTED',
      headline: item.title,
      url: item.link,
    });

    perSource[item.source] = (perSource[item.source] ?? 0) + 1;
  }

  const tier1Count = newsItems.filter(n => REALTIME_NEWS_SOURCES.includes(n.source) && n.tier === 'CAMPUS_PROXIMATE').length;
  const breakdown = REALTIME_NEWS_SOURCES.map(s => `${s.split(' ')[0]}: ${perSource[s]}`).join(', ');
  console.log(`News incidents parsed: ${incidents.length} from ${tier1Count} Tier1 items (${breakdown})`);
  return incidents;
}

/* ═══ Attach proximity ═══ */

export function attachProximity(items: NewsItem[]): NewsItem[] {
  return items.map(item => {
    if (item.campusProximity) return item;
    for (const campus of CAMPUSES) {
      if (item.neighborhoods.includes(campus.communityArea.toLowerCase())) {
        return {
          ...item,
          campusProximity: {
            campusId: campus.id,
            distance: haversine(campus.lat, campus.lng, campus.lat, campus.lng),
          },
        };
      }
    }
    return item;
  });
}
