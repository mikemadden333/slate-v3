/**
 * ICE Intelligence Layer
 *
 * Three-tier verification filter:
 *   1. REQUIRED_PHRASES — must contain at least one
 *   2. PROHIBITED_TERMS — must NOT contain any (false positive filter)
 *   3. CHICAGO_REQUIRED — must reference Chicago geography
 *
 * Campus proximity: only surface if within 3 miles of a Noble campus.
 */

import type { IceAlert, NewsItem } from '../engine/types';
import { CAMPUSES } from '../data/campuses';
import { haversine } from '../engine/geo';

/** Tier 1: Must contain at least one of these phrases */
const REQUIRED_PHRASES = [
  'ice agents',
  'ice raid',
  'ice enforcement',
  'immigration enforcement',
  'immigration and customs enforcement',
  'deportation raid',
  'deportation arrest',
  'federal immigration',
  'immigration arrest',
  'detained by ice',
  'ice detainer',
  'immigration officers',
  'customs enforcement',
  'ice operation',
  'ice checkpoint',
  'immigration raid',
  'undocumented immigrant',
  'undocumented workers',
  'sanctuary city',
  'rapid response network',
];

/** Tier 2: If any of these appear, it's a false positive */
const PROHIBITED_TERMS = [
  'ice cream',
  'ice hockey',
  'ice skating',
  'ice rink',
  'ice fishing',
  'dry ice',
  'black ice',
  'ice storm',
  'icy roads',
  'icy conditions',
  'ice sculpture',
  'ice bucket',
  'vanilla ice',
  'ice cube',
  'ice tea',
  'on thin ice',
  'break the ice',
];

/** Tier 3: Must reference Chicago geography */
const CHICAGO_REQUIRED = [
  'chicago',
  'illinois',
  'cook county',
  'south side',
  'west side',
  'north side',
  'loop',
  'bronzeville',
  'englewood',
  'auburn gresham',
  'chatham',
  'south shore',
  'west lawn',
  'gage park',
  'back of the yards',
  'brighton park',
  'little village',
  'pilsen',
  'humboldt park',
  'austin',
  'garfield park',
  'lawndale',
  'roseland',
  'pullman',
  'burnside',
  'washington heights',
  'morgan park',
  'noble schools',
  'noble network',
  'cpd',
  'chicago police',
];

export type IceClassification = 'CONFIRMED' | 'REPORTED' | 'DISCARD';

/**
 * Three-tier ICE classification.
 * Returns 'CONFIRMED' if all three tiers pass with high-confidence phrases.
 * Returns 'REPORTED' if all three tiers pass.
 * Returns 'DISCARD' if any tier fails.
 */
export function classifyIceItem(text: string): IceClassification {
  const lower = text.toLowerCase();

  // Tier 2 first (fast reject): check for false positives
  for (const term of PROHIBITED_TERMS) {
    if (lower.includes(term)) return 'DISCARD';
  }

  // Tier 1: must contain at least one required phrase
  let hasRequired = false;
  let hasHighConfidence = false;
  const HIGH_CONFIDENCE = ['ice agents', 'ice raid', 'ice enforcement', 'deportation raid', 'detained by ice', 'ice detainer', 'ice operation'];

  for (const phrase of REQUIRED_PHRASES) {
    if (lower.includes(phrase)) {
      hasRequired = true;
      if (HIGH_CONFIDENCE.includes(phrase)) hasHighConfidence = true;
    }
  }
  if (!hasRequired) return 'DISCARD';

  // Tier 3: must reference Chicago geography
  let hasChicago = false;
  for (const geo of CHICAGO_REQUIRED) {
    if (lower.includes(geo)) {
      hasChicago = true;
      break;
    }
  }
  if (!hasChicago) return 'DISCARD';

  return hasHighConfidence ? 'CONFIRMED' : 'REPORTED';
}

/**
 * Check if text passes the three-tier ICE relevance filter.
 */
export function isIceRelevant(text: string): boolean {
  return classifyIceItem(text) !== 'DISCARD';
}

/**
 * Extract ICE alerts from classified news items.
 * Re-classifies using three-tier filter for extra safety.
 */
export function extractIceAlertsFromNews(newsItems: NewsItem[]): IceAlert[] {
  const alerts: IceAlert[] = [];

  for (const item of newsItems) {
    if (item.category !== 'ice') continue;

    const classification = classifyIceItem(`${item.title} ${item.description}`);
    if (classification === 'DISCARD') continue;

    // Campus proximity check: only surface if within 3 miles
    // Discard any alert where distanceFromCampus === 0.0 — means geocoding failed
    let nearestCampusId: number | undefined;
    let distanceFromCampus: number | undefined;

    if (
      item.campusProximity &&
      item.campusProximity.distance > 0 &&
      !isNaN(item.campusProximity.distance) &&
      item.campusProximity.distance <= 3.0
    ) {
      nearestCampusId = item.campusProximity.campusId;
      distanceFromCampus = item.campusProximity.distance;
    }

    alerts.push({
      id: `ice-news-${item.id}`,
      timestamp: item.pubDate,
      source: item.source,
      confidence: classification,
      location: item.neighborhoods.length > 0
        ? item.neighborhoods.join(', ')
        : undefined,
      nearestCampusId,
      distanceFromCampus,
      description: item.title,
    });
  }

  return alerts;
}

/**
 * Perform proximity analysis: does a reported ICE location fall
 * within 3 miles of any Noble campus?
 */
export function analyzeIceProximity(
  lat: number,
  lng: number,
): { campusId: number; campusName: string; distance: number } | null {
  let nearest: { campusId: number; campusName: string; distance: number } | null = null;

  for (const campus of CAMPUSES) {
    const dist = haversine(campus.lat, campus.lng, lat, lng);
    if (dist <= 3.0 && (nearest === null || dist < nearest.distance)) {
      nearest = { campusId: campus.id, campusName: campus.name, distance: dist };
    }
  }

  return nearest;
}

/**
 * Fetch all ICE signals — aggregates news-derived alerts.
 * X API and tracker APIs added when credentials are available.
 */
export async function fetchIceSignals(
  newsItems: NewsItem[],
): Promise<IceAlert[]> {
  const alerts: IceAlert[] = [];

  // Extract from already-fetched news items
  alerts.push(...extractIceAlertsFromNews(newsItems));

  // X API signals (requires VITE_X_BEARER_TOKEN)
  const xToken = import.meta.env.VITE_X_BEARER_TOKEN;
  if (xToken) {
    try {
      const xAlerts = await fetchXIceSignals(xToken);
      alerts.push(...xAlerts);
    } catch {
      // X API unavailable — degrade gracefully
    }
  }

  // Sort by timestamp descending
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return alerts;
}

/** Fetch ICE-related signals from X API (when token is available) */
async function fetchXIceSignals(bearerToken: string): Promise<IceAlert[]> {
  try {
    const query = encodeURIComponent(
      '(ICE agents OR immigration enforcement OR deportation raid) (Chicago OR Illinois) lang:en',
    );
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=created_at,geo`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });

    if (!res.ok) return [];

    const data = await res.json() as {
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        geo?: { coordinates?: { coordinates?: number[] } };
      }>;
    };

    if (!data.data) return [];

    const alerts: IceAlert[] = [];
    for (const tweet of data.data) {
      if (!isIceRelevant(tweet.text)) continue;

      const coords = tweet.geo?.coordinates?.coordinates;
      const proximity = coords
        ? analyzeIceProximity(coords[1], coords[0])
        : null;

      // Skip if beyond 3mi of any campus or if distance is 0 (geocoding failure)
      if (proximity && (proximity.distance > 3.0 || proximity.distance === 0 || isNaN(proximity.distance))) continue;

      const classification = classifyIceItem(tweet.text);

      alerts.push({
        id: `ice-x-${tweet.id}`,
        timestamp: tweet.created_at ?? new Date().toISOString(),
        source: 'X (Twitter)',
        confidence: classification === 'DISCARD' ? 'REPORTED' : classification,
        lat: coords ? coords[1] : undefined,
        lng: coords ? coords[0] : undefined,
        nearestCampusId: proximity?.campusId,
        distanceFromCampus: proximity?.distance,
        description: tweet.text.slice(0, 200),
      });
    }
    return alerts;
  } catch {
    return [];
  }
}
