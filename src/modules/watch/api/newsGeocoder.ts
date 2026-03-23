/**
 * AI-powered geocoding for breaking news headlines — v2.
 * Sends violence headlines + descriptions to Claude for location extraction,
 * then plots them as real-time map incidents.
 *
 * v2: 77 community areas, street grid, batched processing (10 per call)
 */

import { CAMPUSES } from '../data/campuses';
import type { Incident, NewsItem } from '../engine/types';

const REALTIME_NEWS_SOURCES = [
  'Block Club Chicago',
  'ABC7 Chicago',
  'NBC5 Chicago',
  'CBS Chicago',
  'Chicago Sun-Times',
  'WGN TV',
  'WBEZ',
  'Chalkbeat Chicago',
];

const VIOLENCE_KEYWORDS = [
  'shot', 'shooting', 'shoot', 'homicide', 'killed', 'kill',
  'stabbed', 'stabbing', 'murder', 'wounded', 'gunfire',
  'gunshot', 'firearm', 'slain', 'body found',
  'carjacked', 'carjacking',
  'shot and killed', 'found dead', 'fatal shooting',
];

const DISQUALIFY_KEYWORDS = [
  'bears', 'bulls', 'cubs', 'white sox', 'blackhawks', 'sky ',
  'free agency', 'trade deadline', 'draft pick', 'roster move',
  'box score', 'game recap', 'highlights', 'nfl', 'nba', 'mlb', 'nhl',
  'stock', 'earnings', 'ipo', 'revenue', 'quarterly',
  'recipe', 'restaurant review', 'weather forecast',
  'obituary', 'memorial', 'funeral',  
];

const geocodeCache = new Map<string, Incident[]>();
const CACHE_MAX = 300;

function cacheKey(items: NewsItem[]): string {
  return items.map(i => i.title).sort().join('||');
}

// ---------------------------------------------------------------------------
// MAIN EXPORT — same signature as v1
// ---------------------------------------------------------------------------
// Infer crime type from headline/description text
function inferCrimeType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('kill') || t.includes('murder') || t.includes('homicide') || t.includes('fatal') || t.includes('slain') || t.includes('dies') || t.includes('dead') || t.includes('body found')) return 'HOMICIDE';
  if (t.includes('shot') || t.includes('shooting') || t.includes('gunfire') || t.includes('gunshot') || t.includes('wounded')) return 'SHOOTING';
  if (t.includes('stab') || t.includes('knife')) return 'BATTERY';
  if (t.includes('carjack') || t.includes('robbery') || t.includes('robbed')) return 'ROBBERY';
  if (t.includes('weapon') || t.includes('firearm') || t.includes('gun')) return 'WEAPONS VIOLATION';
  if (t.includes('assault') || t.includes('attack') || t.includes('beat')) return 'BATTERY';
  return 'UNKNOWN';
}

export async function geocodeNewsIncidents(newsItems: NewsItem[]): Promise<Incident[]> {
  if ((geocodeNewsIncidents as any)._running) {
    console.log('News geocoder v2: already running, skipping');
    return [];
  }
  (geocodeNewsIncidents as any)._running = true;
  try {
  const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
  const candidates = newsItems.filter(item => {
    if (!REALTIME_NEWS_SOURCES.includes(item.source)) return false;
    // Must be from last 48 hours
    const pubMs = item.pubDate ? new Date(item.pubDate).getTime() : 0;
    if (pubMs < fortyEightHoursAgo) return false;
    const fullText = (item.title + ' ' + (item.description ?? '')).toLowerCase();
    // Disqualify sports, business, lifestyle stories first
    if (DISQUALIFY_KEYWORDS.some(k => fullText.includes(k))) return false;
    // Must contain a violence keyword
    return VIOLENCE_KEYWORDS.some(k => fullText.includes(k));
  });

  if (candidates.length === 0) {
    console.log('News geocoder v2: no violence headlines found');
    return [];
  }

  const key = cacheKey(candidates);
  if (geocodeCache.has(key)) {
    console.log('News geocoder v2: returning cached results');
    return geocodeCache.get(key)!;
  }

  console.log(`News geocoder v2: ${candidates.length} violence headlines to geocode`);

  // BATCH: 10 headlines per API call (96 at once overwhelms Claude)
  const BATCH_SIZE = 10;
  const allIncidents: Incident[] = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    console.log(`News geocoder v2: batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} headlines)`);
    const result = await geocodeBatch(batch);
    // Rate-limit: pause 1.5s between batches to avoid 429s
    if (i + BATCH_SIZE < candidates.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
    allIncidents.push(...result);
  }

  console.log(`News geocoder v2: ${allIncidents.length} total incidents from ${candidates.length} headlines`);

  geocodeCache.set(key, allIncidents);
  if (geocodeCache.size > CACHE_MAX) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) geocodeCache.delete(firstKey);
  }

 return allIncidents;
  } finally {
    (geocodeNewsIncidents as any)._running = false;
  }
}

// ---------------------------------------------------------------------------
// BATCH GEOCODER — 10 headlines at a time
// ---------------------------------------------------------------------------
async function geocodeBatch(candidates: NewsItem[]): Promise<Incident[]> {
  const prompt = `You are a Chicago geography expert geocoding crime news for a school safety system. For each numbered item, extract the MOST PRECISE location and return coordinates.

CHICAGO STREET GRID:
- Numbered grid: Madison=0 N/S, State=0 E/W. Each block=100. "6300 S"=63rd St.
- N/S streets W→E: Cicero(4800W), Pulaski(4000W), Kedzie(3200W), California(2800W), Western(2400W), Ashland(1600W), Halsted(800W), State(0), Cottage Grove(800E), Stony Island(1600E), Jeffrey(2000E)
- E/W streets: North Ave(1600N), Chicago Ave(800N), Madison(0), Roosevelt(1200S), Cermak(2200S), 35th, Pershing(3900S), 47th, 51st, 55th, 59th, 63rd, 67th, 71st, 75th, 79th, 83rd, 87th, 91st, 95th, 103rd, 111th, 115th

VERITAS CAMPUSES:
Loop:41.882,-87.630 | Englewood:41.779,-87.645 | Woodlawn:41.781,-87.599
Auburn Gresham:41.749,-87.655 | Roseland:41.714,-87.624 | Chatham:41.742,-87.613
Austin:41.893,-87.766 | North Lawndale:41.860,-87.719 | Garfield Park:41.882,-87.702
Humboldt Park:41.902,-87.722

77 COMMUNITY AREAS:
Rogers Park:42.009,-87.670 | West Ridge:41.998,-87.692 | Uptown:41.966,-87.654
Lincoln Square:41.968,-87.689 | North Center:41.955,-87.679 | Lakeview:41.943,-87.654
Lincoln Park:41.922,-87.647 | Near North:41.900,-87.633 | Edison Park:42.009,-87.814
Norwood Park:41.985,-87.807 | Jefferson Park:41.972,-87.767 | Forest Glen:41.980,-87.747
North Park:41.979,-87.725 | Albany Park:41.970,-87.720 | Portage Park:41.957,-87.766
Irving Park:41.953,-87.736 | Dunning:41.946,-87.799 | Montclare:41.928,-87.800
Belmont Cragin:41.929,-87.767 | Hermosa:41.919,-87.737 | Avondale:41.938,-87.711
Logan Square:41.923,-87.699 | Humboldt Park:41.902,-87.722 | West Town:41.896,-87.673
Austin:41.893,-87.766 | West Garfield:41.881,-87.729 | East Garfield:41.882,-87.702
Near West Side:41.877,-87.670 | North Lawndale:41.860,-87.719 | South Lawndale:41.843,-87.712
Lower West Side:41.848,-87.665 | Loop:41.882,-87.630 | Near South:41.856,-87.630
Armour Square:41.842,-87.634 | Douglas:41.835,-87.618 | Oakland:41.823,-87.602
Fuller Park:41.831,-87.631 | Grand Boulevard:41.812,-87.617 | Kenwood:41.809,-87.593
Washington Park:41.793,-87.618 | Hyde Park:41.794,-87.590 | Woodlawn:41.781,-87.599
South Shore:41.762,-87.575 | Chatham:41.742,-87.613 | Avalon Park:41.745,-87.587
South Chicago:41.738,-87.554 | Burnside:41.740,-87.636 | Calumet Heights:41.731,-87.582
Roseland:41.714,-87.624 | Pullman:41.706,-87.609 | South Deering:41.709,-87.564
East Side:41.714,-87.535 | West Pullman:41.690,-87.636 | Riverdale:41.649,-87.624
Hegewisch:41.656,-87.546 | Garfield Ridge:41.791,-87.768 | Archer Heights:41.809,-87.729
Brighton Park:41.819,-87.701 | McKinley Park:41.832,-87.674 | Bridgeport:41.838,-87.651
New City:41.808,-87.657 | West Elsdon:41.795,-87.725 | Gage Park:41.795,-87.696
Clearing:41.782,-87.767 | West Lawn:41.775,-87.723 | Chicago Lawn:41.773,-87.694
West Englewood:41.779,-87.666 | Englewood:41.779,-87.645 | Greater Grand Crossing:41.763,-87.615
Ashburn:41.750,-87.718 | Auburn Gresham:41.749,-87.655 | Beverly:41.722,-87.673
Washington Heights:41.722,-87.650 | Mount Greenwood:41.698,-87.706 | Morgan Park:41.693,-87.668

INTERSECTIONS:
63rd/Halsted:41.779,-87.645 | 79th/Halsted:41.751,-87.645 | 87th/Halsted:41.736,-87.645
95th/Halsted:41.722,-87.645 | 79th/Cottage:41.751,-87.606 | 87th/Dan Ryan:41.737,-87.631
95th/Western:41.722,-87.684 | 47th/King Dr:41.810,-87.615 | 71st/Jeffrey:41.765,-87.576
Chicago/Western:41.896,-87.687 | Madison/Pulaski:41.881,-87.726 | North/Damen:41.910,-87.678
103rd/Halsted:41.707,-87.644 | 111th/Michigan:41.693,-87.623 | Cermak/Wentworth:41.852,-87.632

CONFIDENCE:
- INTERSECTION: two streets or specific address → precise coords
- BLOCK: "6300 block of S Halsted" → midpoint of that block
- NEIGHBORHOOD: only neighborhood name → centroid from list above
- AREA: "South Side" → general center
- UNKNOWN: not Chicago or no location

CRIME TYPE: HOMICIDE | SHOOTING | WEAPONS VIOLATION | BATTERY | ROBBERY | UNKNOWN

CRITICAL: If the story is NOT about a real crime or safety incident (e.g. sports, politics, weather, business, entertainment), return lat:0, lng:0, confidence:UNKNOWN.

Return ONLY a JSON array. No markdown. No backticks. Start with [ end with ]:
[{"id": NUMBER, "lat": NUMBER, "lng": NUMBER, "confidence": "STRING", "type": "STRING"}]

For UNKNOWN confidence, use lat 0 and lng 0.

HEADLINES:
${candidates.map((item, i) => {
    let text = `${i}: [${item.source}] ${item.title}`;
    if (item.description && item.description.length > 20) {
      text += `\n   DETAILS: ${item.description.slice(0, 400)}`;
    }
    return text;
  }).join('\n\n')}`;

  try {
    const response = await fetch('/api/anthropic-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('News geocoder v2 API error:', response.status);
      return [];
    }

    const data = await response.json();
    const text = (data.content?.[0]?.text ?? '').trim();

    console.log(`News geocoder v2 raw (${text.length} chars): ${text.slice(0, 200)}`);

    const clean = text.replace(/```json\s*|```\s*/g, '').trim();
    const arrayStart = clean.indexOf('[');
    const arrayEnd = clean.lastIndexOf(']');
    if (arrayStart === -1 || arrayEnd === -1) {
      console.error('News geocoder v2: no JSON array. Response:', text.slice(0, 500));
      return [];
    }

    const results: Array<{
      id: number; lat: number; lng: number; confidence: string; type: string;
    }> = JSON.parse(clean.slice(arrayStart, arrayEnd + 1));

    const incidents: Incident[] = [];

    for (const r of results) {
      if (r.confidence === 'UNKNOWN' || r.lat === 0 || r.lng === 0) continue;
      if (isNaN(r.lat) || isNaN(r.lng)) continue;
      if (r.lat < 41.6 || r.lat > 42.1 || r.lng < -87.95 || r.lng > -87.5) continue;

      const nearCampus = CAMPUSES.some(c => {
        const dlat = (c.lat - r.lat) * 69;
        const dlng = (c.lng - r.lng) * 55;
        return Math.sqrt(dlat * dlat + dlng * dlng) <= 8.0;
      });
      if (!nearCampus) {
        console.log(`News geocoder: dropping ${r.confidence} incident at ${r.lat},${r.lng} — >5mi from all campuses`);
        continue;
      }

      const item = candidates[r.id];
      if (!item) continue;

      const jitter = r.confidence === 'INTERSECTION' ? 0.0008
        : r.confidence === 'BLOCK' ? 0.0015
        : r.confidence === 'NEIGHBORHOOD' ? 0.004 : 0.008;

      incidents.push({
        id: `news_${item.id ?? item.title.slice(0, 20).replace(/\s/g, '_')}`,
        type: r.type === 'UNKNOWN' ? inferCrimeType(item.title + ' ' + (item.description ?? '')) : r.type,
        date: item.pubDate ?? new Date().toISOString(),
        // Fall back to keyword inference if Claude returned UNKNOWN
        block: `~${r.confidence} — ${item.source}`,
        lat: r.lat + (Math.random() - 0.5) * jitter,
        lng: r.lng + (Math.random() - 0.5) * jitter,
        description: item.title,
        source: 'NEWS' as const,
        confidence: 'NEWS_REPORTED' as const,
        headline: item.title,
        url: item.link,
      });
    }

    console.log(`News geocoder v2 batch: ${incidents.length} incidents from ${candidates.length} headlines`);
    return incidents;

  } catch (err) {
    console.error('News geocoder v2 batch failed:', err);
    return [];
  }
}