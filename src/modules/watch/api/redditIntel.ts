/**
 * Reddit real-time incident intelligence
 * r/ChicagoScanner — live scanner reports with locations, posted by listeners
 * r/CrimeInChicago — incident reports, often within hours
 * r/chicago — breaking news posts
 * Free, no API key, real-time (posts appear within minutes)
 */
import type { Incident } from '../engine/types';

const VIOLENCE_KEYWORDS = [
  'shooting', 'shot', 'shots fired', 'gunfire', 'gunshot',
  'homicide', 'murder', 'killed', 'stabbing', 'stabbed',
  'robbery', 'carjack', 'assault', 'weapon', 'body found',
  'person down', 'victim', 'wounded', 'multiple victims',
];

const LOCATION_PATTERNS = [
  // "at 79th and Halsted" or "79th/Halsted"
  /(?:at|near|on|corner of)?\s*(\d+(?:st|nd|rd|th)?(?:\s+\w+)*)\s+(?:and|&|\/)\s+(\w+(?:\s+\w+)?)/gi,
  // "3900 W Chicago Ave"
  /\b(\d{3,5})\s+[NSEW]\.?\s+(\w+(?:\s+\w+)?)\s+(?:Ave|St|Blvd|Dr|Rd|Pl|Pkwy)/gi,
  // Neighborhood mentions
  /\b(Englewood|Roseland|Woodlawn|Auburn Gresham|Chatham|South Shore|Lawndale|Humboldt Park|Austin|Pilsen|Bridgeport|Bronzeville|Hyde Park|Kenwood|Pullman|West Pullman|Chicago Lawn|Gage Park|Back of the Yards|Wentworth|Calumet)\b/gi,
];

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  created: number;
  subreddit: string;
  url: string;
}

function isViolencePost(post: RedditPost): boolean {
  const text = (post.title + ' ' + post.selftext).toLowerCase();
  return VIOLENCE_KEYWORDS.some(kw => text.includes(kw));
}

function extractLocations(text: string): string[] {
  const locations: string[] = [];
  for (const pattern of LOCATION_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    for (const m of matches) {
      locations.push(m[0].trim());
    }
  }
  return [...new Set(locations)];
}

function inferType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('homicide') || t.includes('murder') || t.includes('killed') || t.includes('fatal') || t.includes('body found')) return 'HOMICIDE';
  if (t.includes('shooting') || t.includes('shot') || t.includes('gunfire') || t.includes('shots fired')) return 'SHOOTING';
  if (t.includes('stab')) return 'BATTERY';
  if (t.includes('carjack') || t.includes('robbery') || t.includes('robbed')) return 'ROBBERY';
  if (t.includes('weapon') || t.includes('gun')) return 'WEAPONS VIOLATION';
  return 'ASSAULT';
}

// Simple Chicago neighborhood centroid lookup for fallback geocoding
const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
  'Englewood': [41.779, -87.645],
  'Roseland': [41.688, -87.627],
  'Woodlawn': [41.773, -87.600],
  'Auburn Gresham': [41.745, -87.649],
  'Chatham': [41.747, -87.620],
  'South Shore': [41.762, -87.572],
  'Lawndale': [41.854, -87.718],
  'Humboldt Park': [41.900, -87.723],
  'Austin': [41.895, -87.764],
  'Pilsen': [41.854, -87.661],
  'Bridgeport': [41.835, -87.643],
  'Bronzeville': [41.832, -87.614],
  'Hyde Park': [41.796, -87.596],
  'Kenwood': [41.812, -87.601],
  'Pullman': [41.698, -87.607],
  'West Pullman': [41.680, -87.641],
  'Chicago Lawn': [41.773, -87.699],
  'Gage Park': [41.794, -87.699],
  'Back of the Yards': [41.806, -87.663],
  'Wentworth': [41.760, -87.632],
  'Calumet': [41.726, -87.610],
};

async function geocodeRedditPost(post: RedditPost): Promise<{ lat: number; lng: number; confidence: string } | null> {
  const text = post.title + ' ' + post.selftext;

  // Try neighborhood lookup first (fast, free)
  for (const [hood, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    if (text.includes(hood)) {
      return { lat: coords[0], lng: coords[1], confidence: 'NEIGHBORHOOD' };
    }
  }

  // Extract location strings and send to Claude geocoder
  const locations = extractLocations(text);
  if (locations.length === 0) return null;

  try {
    const response = await fetch('/api/anthropic-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Chicago location: "${locations[0]}". Return ONLY JSON: {"lat": number, "lng": number} or {"lat": 0, "lng": 0} if unknown. Chicago bounds: lat 41.6-42.0, lng -88.0 to -87.5.`
        }]
      })
    });
    const data = await response.json();
    const text_resp = data.content?.[0]?.text ?? '';
    const match = text_resp.match(/\{[^}]+\}/);
    if (match) {
      const coords = JSON.parse(match[0]);
      if (coords.lat > 41.6 && coords.lat < 42.0 && coords.lng < -87.5 && coords.lng > -88.0) {
        return { lat: coords.lat, lng: coords.lng, confidence: 'INTERSECTION' };
      }
    }
  } catch { /* geocoding failed */ }

  return null;
}

export async function fetchRedditIntel(maxAgeHours = 24): Promise<Incident[]> {
  try {
    const res = await fetch('/api/reddit-proxy');
    if (!res.ok) throw new Error(`Reddit proxy ${res.status}`);
    const data = await res.json();

    const cutoff = Date.now() - maxAgeHours * 3600000;
    const allPosts: RedditPost[] = [];

    for (const feed of data.feeds ?? []) {
      for (const post of feed.posts ?? []) {
        if (post.created * 1000 < cutoff) continue;
        if (!isViolencePost(post)) continue;
        allPosts.push(post);
      }
    }

    console.log(`Reddit: ${allPosts.length} violence posts in last ${maxAgeHours}h`);

    const incidents: Incident[] = [];
    // Geocode up to 10 posts (Haiku is cheap but limit calls)
    for (const post of allPosts.slice(0, 10)) {
      const coords = await geocodeRedditPost(post);
      if (!coords) continue;

      incidents.push({
        id: `reddit-${post.id}`,
        date: new Date(post.created * 1000).toISOString(),
        type: inferType(post.title + ' ' + post.selftext),
        block: extractLocations(post.title + ' ' + post.selftext)[0] ?? post.subreddit,
        lat: coords.lat,
        lng: coords.lng,
        description: post.title.slice(0, 120),
        source: 'REDDIT',
      });
    }

    console.log(`Reddit: ${incidents.length} geocoded incidents`);
    return incidents;
  } catch (err) {
    console.warn('Reddit intel failed:', err);
    return [];
  }
}
