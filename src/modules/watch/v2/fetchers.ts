/**
 * Watch v2 — Data Fetchers
 * Clean wrappers around each data source. Each returns WatchIncident[].
 * The classifier runs here — only violent crime passes through.
 * 
 * v2.1: Enhanced news geocoding with Chicago street/neighborhood dictionary.
 *       Scanner transcription pipeline via Whisper proxy.
 */

import type { WatchIncident, DataSource, SourceStatus, ViolentCrimeType } from './types';
import { CONFIDENCE_SCORE } from './types';
import { classifyCitizenTitle, classifyCPDIncident, classifyNewsHeadline, classifyViolentCrime } from './classifier';
import { CAMPUSES } from '../data/campuses';
import { haversine } from '../engine/geo';

// ─── Helpers ──────────────────────────────────────────────────────────────

function findNearestCampus(lat: number, lng: number): { id: number; dist: number } | null {
  let nearest: { id: number; dist: number } | null = null;
  for (const c of CAMPUSES) {
    const d = haversine(lat, lng, c.lat, c.lng);
    if (!nearest || d < nearest.dist) {
      nearest = { id: c.id, dist: d };
    }
  }
  return nearest;
}

function ageMinutes(timestamp: string): number {
  const ms = Date.now() - new Date(timestamp).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function makeIncident(
  id: string,
  crimeType: ViolentCrimeType,
  title: string,
  description: string,
  lat: number,
  lng: number,
  timestamp: string,
  source: DataSource,
  url?: string,
  audioUrl?: string,
  isEstimatedLocation?: boolean,
): WatchIncident {
  const nearest = findNearestCampus(lat, lng);
  const baseConfidence = source === 'CPD' ? 'CONFIRMED' : 'REPORTED';

  return {
    id,
    crimeType,
    title,
    description,
    lat,
    lng,
    timestamp,
    source,
    confidence: baseConfidence,
    confidenceScore: CONFIDENCE_SCORE[baseConfidence],
    corroboratedBy: [],
    nearestCampusId: nearest?.id ?? null,
    distanceToCampus: nearest?.dist ?? null,
    ageMinutes: ageMinutes(timestamp),
    url,
    rawTitle: title,
    scannerAudioUrl: audioUrl,
    isEstimatedLocation,
  };
}

// ─── Source Health Tracking ───────────────────────────────────────────────

const sourceStatuses: Map<DataSource, SourceStatus> = new Map();

export function getSourceStatuses(): SourceStatus[] {
  return Array.from(sourceStatuses.values());
}

function updateSourceStatus(source: DataSource, ok: boolean, count: number, latency: number, error?: string) {
  sourceStatuses.set(source, {
    source,
    status: ok ? 'LIVE' : (error ? 'DOWN' : 'DEGRADED'),
    lastSuccess: ok ? new Date().toISOString() : (sourceStatuses.get(source)?.lastSuccess ?? null),
    itemCount: count,
    latencyMs: latency,
    error,
  });
}

// ─── Chicago Geocoding Dictionary ────────────────────────────────────────
// Comprehensive neighborhood/street → lat/lng mapping for news geocoding.
// When a news headline mentions "Englewood" or "63rd and Halsted", we can
// approximate the location even without a formal geocoding API.

const CHICAGO_LOCATIONS: Array<{ patterns: string[]; lat: number; lng: number; name: string }> = [
  // Community areas (matching campus neighborhoods + surrounding areas)
  { patterns: ['englewood', 'west englewood'], lat: 41.7797, lng: -87.6448, name: 'Englewood' },
  { patterns: ['woodlawn'], lat: 41.7808, lng: -87.6063, name: 'Woodlawn' },
  { patterns: ['auburn gresham', 'gresham'], lat: 41.7468, lng: -87.6442, name: 'Auburn Gresham' },
  { patterns: ['roseland', 'pullman'], lat: 41.6953, lng: -87.6228, name: 'Roseland' },
  { patterns: ['chatham', 'avalon park'], lat: 41.7444, lng: -87.6063, name: 'Chatham' },
  { patterns: ['austin', 'west austin'], lat: 41.8876, lng: -87.7696, name: 'Austin' },
  { patterns: ['north lawndale', 'lawndale'], lat: 41.8555, lng: -87.7199, name: 'North Lawndale' },
  { patterns: ['garfield park', 'east garfield', 'west garfield'], lat: 41.8752, lng: -87.6919, name: 'Garfield Park' },
  { patterns: ['humboldt park'], lat: 41.9027, lng: -87.7165, name: 'Humboldt Park' },
  { patterns: ['loop', 'downtown'], lat: 41.8807, lng: -87.6299, name: 'Loop' },
  // Additional high-crime areas near campuses
  { patterns: ['back of the yards', 'back of yards', 'new city'], lat: 41.8095, lng: -87.6567, name: 'Back of the Yards' },
  { patterns: ['south shore'], lat: 41.7600, lng: -87.5750, name: 'South Shore' },
  { patterns: ['south chicago'], lat: 41.7395, lng: -87.5545, name: 'South Chicago' },
  { patterns: ['grand crossing'], lat: 41.7623, lng: -87.6147, name: 'Grand Crossing' },
  { patterns: ['washington park'], lat: 41.7930, lng: -87.6180, name: 'Washington Park' },
  { patterns: ['greater grand crossing'], lat: 41.7623, lng: -87.6147, name: 'Greater Grand Crossing' },
  { patterns: ['bronzeville', 'grand boulevard'], lat: 41.8150, lng: -87.6170, name: 'Bronzeville' },
  { patterns: ['hyde park'], lat: 41.7943, lng: -87.5907, name: 'Hyde Park' },
  { patterns: ['pilsen', 'lower west side'], lat: 41.8525, lng: -87.6563, name: 'Pilsen' },
  { patterns: ['little village'], lat: 41.8456, lng: -87.7130, name: 'Little Village' },
  { patterns: ['brighton park'], lat: 41.8192, lng: -87.6990, name: 'Brighton Park' },
  { patterns: ['marquette park', 'chicago lawn'], lat: 41.7700, lng: -87.6950, name: 'Marquette Park' },
  { patterns: ['gage park'], lat: 41.7950, lng: -87.6960, name: 'Gage Park' },
  { patterns: ['west side'], lat: 41.8760, lng: -87.7200, name: 'West Side' },
  { patterns: ['south side'], lat: 41.7500, lng: -87.6300, name: 'South Side' },
  { patterns: ['far south side'], lat: 41.6900, lng: -87.6200, name: 'Far South Side' },
  // Major intersections (common in crime reporting)
  { patterns: ['63rd and halsted', '63rd & halsted'], lat: 41.7797, lng: -87.6448, name: '63rd & Halsted' },
  { patterns: ['79th and halsted', '79th & halsted'], lat: 41.7510, lng: -87.6442, name: '79th & Halsted' },
  { patterns: ['87th and dan ryan', '87th & dan ryan'], lat: 41.7360, lng: -87.6310, name: '87th & Dan Ryan' },
  { patterns: ['95th and western', '95th & western'], lat: 41.7220, lng: -87.6840, name: '95th & Western' },
  { patterns: ['111th and michigan', '111th & michigan'], lat: 41.6920, lng: -87.6230, name: '111th & Michigan' },
  { patterns: ['47th and king', '47th & king', '47th and king drive'], lat: 41.8100, lng: -87.6170, name: '47th & King' },
  { patterns: ['madison and pulaski', 'madison & pulaski'], lat: 41.8808, lng: -87.7267, name: 'Madison & Pulaski' },
  { patterns: ['chicago and western', 'chicago & western'], lat: 41.8956, lng: -87.6867, name: 'Chicago & Western' },
  { patterns: ['division and california', 'division & california'], lat: 41.9030, lng: -87.6970, name: 'Division & California' },
];

function geocodeFromText(text: string): { lat: number; lng: number; name: string } | null {
  const t = text.toLowerCase();
  // Check intersections first (more specific)
  for (const loc of CHICAGO_LOCATIONS) {
    for (const pattern of loc.patterns) {
      if (t.includes(pattern)) {
        // Add slight random offset to prevent exact stacking
        return {
          lat: loc.lat + (Math.random() - 0.5) * 0.003,
          lng: loc.lng + (Math.random() - 0.5) * 0.003,
          name: loc.name,
        };
      }
    }
  }

  // Try to match "NNth street" patterns for major Chicago streets
  const streetMatch = t.match(/(\d{2,3})(?:st|nd|rd|th)\s+(?:street|st\b)/);
  if (streetMatch) {
    const streetNum = parseInt(streetMatch[1]);
    // Approximate south side latitude from street number
    // Chicago's grid: 800 addresses per mile, streets start at Madison (0)
    // 63rd St ≈ 41.780, 79th ≈ 41.751, 95th ≈ 41.722, 111th ≈ 41.692
    if (streetNum >= 30 && streetNum <= 130) {
      const lat = 41.880 - (streetNum / 800) * 0.1;
      return { lat, lng: -87.64, name: `${streetNum}th St area` };
    }
  }

  return null;
}

// ─── CITIZEN FETCHER ──────────────────────────────────────────────────────

export async function fetchCitizenIncidents(): Promise<WatchIncident[]> {
  const start = Date.now();
  const incidents: WatchIncident[] = [];

  try {
    // Fetch from multiple campus locations to cover the full network
    // Use a central Chicago point with wide radius to get all incidents
    const res = await fetch(`/api/citizen-proxy?lat=41.82&lng=-87.67&radius=8`);
    if (!res.ok) {
      updateSourceStatus('CITIZEN', false, 0, Date.now() - start, `HTTP ${res.status}`);
      return [];
    }

    const data: unknown = await res.json();
    const obj = data as Record<string, unknown>;

    // Parse response — Citizen has multiple formats
    let raw: unknown[] = [];
    if (Array.isArray(data)) raw = data;
    else if (Array.isArray(obj.results)) raw = obj.results;
    else if (Array.isArray(obj.incidents)) raw = obj.incidents;
    else if (Array.isArray(obj.hits)) raw = obj.hits;
    else if (typeof obj.results === 'object' && obj.results !== null) {
      raw = Object.values(obj.results as Record<string, unknown>);
    } else if (typeof obj.incidents === 'object' && obj.incidents !== null) {
      raw = Object.values(obj.incidents as Record<string, unknown>);
    }

    for (const item of raw) {
      const i = item as Record<string, unknown>;

      // Extract coordinates
      const coords = i.coordinates as Record<string, number> | undefined;
      const loc = i.location as Record<string, number> | undefined;
      const geo = i.geometry as Record<string, number[]> | undefined;

      let lat = coords?.latitude ?? coords?.lat ?? loc?.latitude ?? loc?.lat ?? (i.latitude as number) ?? (i.lat as number) ?? 0;
      let lng = coords?.longitude ?? coords?.lng ?? loc?.longitude ?? loc?.lng ?? (i.longitude as number) ?? (i.lng as number) ?? 0;

      if (lat === 0 && geo?.coordinates && Array.isArray(geo.coordinates)) {
        lng = geo.coordinates[0];
        lat = geo.coordinates[1];
      }

      if (lat === 0 && lng === 0) continue;
      if (lat < 41.6 || lat > 42.1 || lng < -87.95 || lng > -87.5) continue;

      const title = String(i.title ?? i.raw ?? i.text ?? i.description ?? '');
      const crimeType = classifyCitizenTitle(title);
      if (!crimeType) continue; // NOT violent crime — skip

      // Parse timestamp
      let timestamp: string;
      if (i.cs) timestamp = new Date(i.cs as number).toISOString();
      else if (i.ts) timestamp = new Date((i.ts as number) * 1000).toISOString();
      else if (i.createdAt) timestamp = String(i.createdAt);
      else if (i.created_at) timestamp = String(i.created_at);
      else timestamp = new Date().toISOString();

      // Only include incidents from last 6 hours
      const age = ageMinutes(timestamp);
      if (age > 360) continue;

      incidents.push(makeIncident(
        `citizen_${String(i.key ?? i.id ?? i._id ?? Math.random())}`,
        crimeType,
        title,
        String(i.raw ?? i.text ?? title),
        lat, lng,
        timestamp,
        'CITIZEN',
      ));
    }

    updateSourceStatus('CITIZEN', true, incidents.length, Date.now() - start);
    console.log(`Watch v2 Citizen: ${incidents.length} violent incidents from ${raw.length} total`);
  } catch (err) {
    updateSourceStatus('CITIZEN', false, 0, Date.now() - start, String(err));
    console.error('Watch v2 Citizen fetch error:', err);
  }

  return incidents;
}

// ─── CPD FETCHER ──────────────────────────────────────────────────────────

export async function fetchCPDIncidents(): Promise<WatchIncident[]> {
  const start = Date.now();
  const incidents: WatchIncident[] = [];

  try {
    const since = new Date(Date.now() - 30 * 24 * 3600000).toISOString().slice(0, 19);
    const params = new URLSearchParams({
      '$where': `date > '${since}'`,
      '$order': 'date DESC',
      '$limit': '500',
    });

    const res = await fetch(`https://data.cityofchicago.org/resource/ijzp-q8t2.json?${params}`);
    if (!res.ok) {
      updateSourceStatus('CPD', false, 0, Date.now() - start, `HTTP ${res.status}`);
      return [];
    }

    const rows = await res.json() as Array<Record<string, string>>;

    for (const row of rows) {
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;

      const crimeType = classifyCPDIncident(row.primary_type ?? '', row.description ?? '');
      if (!crimeType) continue;

      const timestamp = row.date ? new Date(row.date).toISOString() : new Date().toISOString();

      incidents.push(makeIncident(
        `cpd_${row.id ?? row.case_number ?? Math.random()}`,
        crimeType,
        `${row.primary_type}: ${row.description}`.slice(0, 120),
        `${row.block ?? ''} — ${row.location_description ?? ''}`,
        lat, lng,
        timestamp,
        'CPD',
      ));
    }

    updateSourceStatus('CPD', true, incidents.length, Date.now() - start);
  } catch (err) {
    updateSourceStatus('CPD', false, 0, Date.now() - start, String(err));
    console.error('Watch v2 CPD fetch error:', err);
  }

  return incidents;
}

// ─── NEWS FETCHER (Enhanced Geocoding) ───────────────────────────────────

export async function fetchNewsIncidents(): Promise<WatchIncident[]> {
  const start = Date.now();
  const incidents: WatchIncident[] = [];

  try {
    const res = await fetch('/api/news-proxy');
    if (!res.ok) {
      updateSourceStatus('NEWS', false, 0, Date.now() - start, `HTTP ${res.status}`);
      return [];
    }

    const { feeds } = await res.json() as {
      feeds: Array<{ name: string; ok: boolean; xml: string }>;
    };

    const parser = new DOMParser();

    for (const feed of feeds) {
      if (!feed.ok || !feed.xml) continue;

      const doc = parser.parseFromString(feed.xml, 'text/xml');
      const items = doc.querySelectorAll('item');

      items.forEach(item => {
        const title = item.querySelector('title')?.textContent ?? '';
        const description = item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '') ?? '';
        const link = item.querySelector('link')?.textContent ?? '';
        const pubDate = item.querySelector('pubDate')?.textContent ?? '';

        const crimeType = classifyNewsHeadline(title, description);
        if (!crimeType) return; // NOT violent crime — skip

        const timestamp = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
        const age = ageMinutes(timestamp);
        if (age > 1440) return; // Skip news older than 24 hours

        // Enhanced geocoding: try dictionary first, then campus matching
        const fullText = `${title} ${description}`;
        const geo = geocodeFromText(fullText);

        let lat = 0, lng = 0;
        let isEstimated = false;

        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          isEstimated = true; // News locations are always estimates
        } else {
          // Fallback: match against campus community areas
          const t = fullText.toLowerCase();
          for (const campus of CAMPUSES) {
            if (t.includes(campus.communityArea.toLowerCase())) {
              lat = campus.lat + (Math.random() - 0.5) * 0.005;
              lng = campus.lng + (Math.random() - 0.5) * 0.005;
              isEstimated = true;
              break;
            }
          }
        }

        // If we couldn't geocode, skip — we can't plot it on the map
        if (lat === 0 && lng === 0) return;

        incidents.push(makeIncident(
          `news_${link || Math.random()}`,
          crimeType,
          `[NEWS] ${title}`,
          description,
          lat, lng,
          timestamp,
          'NEWS',
          link,
          undefined,
          isEstimated,
        ));
      });

      // Also check Atom feeds
      if (items.length === 0) {
        const entries = doc.querySelectorAll('entry');
        entries.forEach(entry => {
          const title = entry.querySelector('title')?.textContent ?? '';
          const summary = entry.querySelector('summary')?.textContent?.replace(/<[^>]*>/g, '') ?? '';
          const linkEl = entry.querySelector('link');
          const link = linkEl?.getAttribute('href') ?? '';
          const published = entry.querySelector('published')?.textContent ?? '';

          const crimeType = classifyNewsHeadline(title, summary);
          if (!crimeType) return;

          const timestamp = published ? new Date(published).toISOString() : new Date().toISOString();
          const age = ageMinutes(timestamp);
          if (age > 1440) return;

          const fullText = `${title} ${summary}`;
          const geo = geocodeFromText(fullText);
          let lat = 0, lng = 0;
          let isEstimated = false;

          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            isEstimated = true;
          } else {
            const t = fullText.toLowerCase();
            for (const campus of CAMPUSES) {
              if (t.includes(campus.communityArea.toLowerCase())) {
                lat = campus.lat + (Math.random() - 0.5) * 0.005;
                lng = campus.lng + (Math.random() - 0.5) * 0.005;
                isEstimated = true;
                break;
              }
            }
          }
          if (lat === 0 && lng === 0) return;

          incidents.push(makeIncident(
            `news_${link || Math.random()}`,
            crimeType,
            `[NEWS] ${title}`,
            summary,
            lat, lng,
            timestamp,
            'NEWS',
            link,
            undefined,
            isEstimated,
          ));
        });
      }
    }

    updateSourceStatus('NEWS', true, incidents.length, Date.now() - start);
    console.log(`Watch v2 News: ${incidents.length} violent incidents from ${feeds.length} feeds`);
  } catch (err) {
    updateSourceStatus('NEWS', false, 0, Date.now() - start, String(err));
    console.error('Watch v2 News fetch error:', err);
  }

  return incidents;
}

// ─── SCANNER FETCHER (with Whisper Transcription) ────────────────────────

// Chicago street/location patterns for extracting addresses from transcripts
const CHICAGO_STREET_PATTERNS = [
  /(\d+)\s+(?:block\s+of\s+)?(?:north|south|east|west|n|s|e|w)?\s*(\w+(?:\s+\w+)?)\s+(?:street|st|avenue|ave|boulevard|blvd|drive|dr|road|rd|place|pl|court|ct|way|parkway|pkwy)/gi,
  /(\d+)\s+(?:north|south|east|west|n|s|e|w)\s+(\w+)/gi,
];

// Simple scanner transcript location extraction
function extractLocationFromTranscript(transcript: string): string | null {
  const t = transcript.toLowerCase();
  
  // Check for known intersections/neighborhoods
  for (const loc of CHICAGO_LOCATIONS) {
    for (const pattern of loc.patterns) {
      if (t.includes(pattern)) return loc.name;
    }
  }
  
  // Try street pattern matching
  for (const pattern of CHICAGO_STREET_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(transcript);
    if (match) return match[0];
  }
  
  return null;
}

export async function fetchScannerActivity(): Promise<{
  incidents: WatchIncident[];
  totalCalls: number;
  spikeZones: string[];
}> {
  const start = Date.now();

  try {
    const since = Date.now() - 120 * 60 * 1000; // 2 hour window
    const res = await fetch(`/api/openmhz-proxy?since=${since}`);
    if (!res.ok) {
      updateSourceStatus('SCANNER', false, 0, Date.now() - start, `HTTP ${res.status}`);
      return { incidents: [], totalCalls: 0, spikeZones: [] };
    }

    const data: unknown = await res.json();
    const obj = data as Record<string, unknown>;

    let rawCalls: unknown[] = [];
    if (Array.isArray(obj.calls)) rawCalls = obj.calls;
    else if (Array.isArray(data)) rawCalls = data as unknown[];

    // Zone mapping for spike detection
    const CPD_ZONES: Record<number, { name: string; campuses: string[] }> = {
      4:  { name: 'Zone 4 — Loop', campuses: ['Loop'] },
      5:  { name: 'Zone 5 — Far South', campuses: ['Chatham'] },
      6:  { name: 'Zone 6 — Englewood', campuses: ['Englewood', 'Woodlawn'] },
      7:  { name: 'Zone 7 — Lawndale', campuses: ['North Lawndale', 'Garfield Park'] },
      8:  { name: 'Zone 8 — South Chicago', campuses: ['Auburn Gresham', 'Roseland'] },
      10: { name: 'Zone 10 — West Side', campuses: ['Humboldt Park', 'Austin'] },
    };

    // Count calls per zone
    const zoneCounts: Record<number, number> = {};
    for (const raw of rawCalls) {
      const c = raw as Record<string, unknown>;
      const tgId = Number(c.talkgroupNum ?? c.talkgroup_num ?? 0);
      if (CPD_ZONES[tgId]) {
        zoneCounts[tgId] = (zoneCounts[tgId] || 0) + 1;
      }
    }

    // Detect spikes (2x average)
    const activeZones = Object.keys(zoneCounts).length || 1;
    const totalMatched = Object.values(zoneCounts).reduce((a, b) => a + b, 0);
    const baseline = Math.max(totalMatched / activeZones, 3);

    const spikeZones: string[] = [];
    for (const [zoneId, count] of Object.entries(zoneCounts)) {
      if (count >= baseline * 2) {
        const zone = CPD_ZONES[Number(zoneId)];
        if (zone) spikeZones.push(zone.name);
      }
    }

    // Attempt Whisper transcription for recent calls with audio
    const scannerIncidents: WatchIncident[] = [];
    const recentCalls = rawCalls
      .filter((c: any) => {
        const ts = c.time ? new Date(c.time).getTime() : 0;
        return Date.now() - ts < 30 * 60 * 1000; // Last 30 minutes only
      })
      .slice(0, 5); // Limit to 5 most recent to avoid API overload

    for (const raw of recentCalls) {
      const c = raw as Record<string, unknown>;
      const audioUrl = c.url as string | undefined;
      if (!audioUrl) continue;

      try {
        const transcribeRes = await fetch('/api/transcribe-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: audioUrl }),
        });
        
        if (transcribeRes.ok) {
          const { transcript, error } = await transcribeRes.json() as { transcript: string; error?: string };
          if (transcript && !error) {
            // Classify the transcript
            const crimeType = classifyViolentCrime(transcript);
            if (crimeType) {
              // Try to extract location
              const locationName = extractLocationFromTranscript(transcript);
              const geo = locationName ? geocodeFromText(locationName) : null;
              
              if (geo) {
                const ts = c.time ? new Date(c.time as string).toISOString() : new Date().toISOString();
                scannerIncidents.push(makeIncident(
                  `scanner_${c._id ?? Math.random()}`,
                  crimeType,
                  `[SCANNER] ${transcript.slice(0, 100)}`,
                  transcript,
                  geo.lat, geo.lng,
                  ts,
                  'SCANNER',
                  undefined,
                  audioUrl,
                  true, // estimated location
                ));
                console.log(`Watch v2 Scanner: Transcribed violent call near ${geo.name}: ${transcript.slice(0, 60)}`);
              }
            }
          }
        }
      } catch {
        // Transcription failed for this call — continue with others
      }
    }

    updateSourceStatus('SCANNER', true, rawCalls.length, Date.now() - start);
    console.log(`Watch v2 Scanner: ${rawCalls.length} calls, ${spikeZones.length} spike zones, ${scannerIncidents.length} transcribed incidents`);

    return { incidents: scannerIncidents, totalCalls: rawCalls.length, spikeZones };
  } catch (err) {
    updateSourceStatus('SCANNER', false, 0, Date.now() - start, String(err));
    console.error('Watch v2 Scanner fetch error:', err);
    return { incidents: [], totalCalls: 0, spikeZones: [] };
  }
}

// ─── WEATHER FETCHER ──────────────────────────────────────────────────────

export async function fetchWeather(): Promise<{
  tempF: number;
  condition: string;
  isRiskElevating: boolean;
}> {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65' +
      '&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code' +
      '&temperature_unit=fahrenheit'
    );

    if (!res.ok) return { tempF: 65, condition: 'Unknown', isRiskElevating: false };

    const data = await res.json() as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        precipitation?: number;
      };
    };

    const temp = data.current?.temperature_2m ?? 65;
    const code = data.current?.weather_code ?? 0;
    const precip = data.current?.precipitation ?? 0;

    let condition = 'Clear';
    if (code >= 95) condition = 'Thunderstorm';
    else if (code >= 71) condition = 'Snow';
    else if (code >= 51) condition = 'Rain';
    else if (code >= 45) condition = 'Fog';
    else if (code >= 2) condition = 'Cloudy';

    const isRiskElevating = temp > 80 || code >= 95 || precip > 5;

    return { tempF: temp, condition, isRiskElevating };
  } catch {
    return { tempF: 65, condition: 'Unknown', isRiskElevating: false };
  }
}
