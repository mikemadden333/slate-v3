import { CAMPUSES } from '../data/campuses';

interface ZoneInfo {
  zone: number;
  name: string;
  districts: number[];
  campuses: string[];
  talkgroupPatterns: string[];
}

const CPD_ZONES: ZoneInfo[] = [
  {
    zone: 4, name: 'Zone 4 — Loop/Near North',
    districts: [1, 18],
    campuses: ['Muchin', 'TIC'],
    talkgroupPatterns: ['zone 4', 'zone4', 'dist 1 ', 'dist 18'],
  },
  {
    zone: 5, name: 'Zone 5 — Calumet/Far South',
    districts: [2],
    campuses: ['Gary Comer'],
    talkgroupPatterns: ['zone 5', 'zone5', 'dist 2 ', 'calumet'],
  },
  {
    zone: 6, name: 'Zone 6 — Englewood/Grand Crossing',
    districts: [3, 7],
    campuses: ['Golder', 'Comer'],
    talkgroupPatterns: ['zone 6', 'zone6', 'dist 3 ', 'dist 7 '],
  },
  {
    zone: 7, name: 'Zone 7 — Lawndale/Harrison',
    districts: [10, 11],
    campuses: ['DRW', 'Speer', 'Bulls'],
    talkgroupPatterns: ['zone 7', 'zone7', 'dist 10', 'dist 11'],
  },
  {
    zone: 8, name: 'Zone 8 — South Chicago/Auburn Gresham',
    districts: [4, 6],
    campuses: ['Johnson', 'Mansueto', 'Baker'],
    talkgroupPatterns: ['zone 8', 'zone8', 'dist 4 ', 'dist 6 '],
  },
  {
    zone: 9, name: 'Zone 9 — Deering/Bridgeport',
    districts: [9, 12],
    campuses: ['IIT', 'Pritzker'],
    talkgroupPatterns: ['zone 9', 'zone9', 'dist 9 ', 'dist 12'],
  },
  {
    zone: 10, name: 'Zone 10 — Ogden/West Side',
    districts: [10, 11],
    campuses: ['Hansberry', 'Bulls'],
    talkgroupPatterns: ['zone 10', 'zone10', 'ogden'],
  },
  {
    zone: 12, name: 'Zone 12 — North/Shakespeare',
    districts: [14, 25],
    campuses: ['Rowe-Clark', 'Butler', 'Rauner'],
    talkgroupPatterns: ['zone 12', 'zone12', 'dist 14', 'dist 25'],
  },
];

export interface ScannerCall {
  id: string;
  talkgroup: string;
  talkgroupId: number;
  time: string;
  length: number;
  url: string;
  zone: number | null;
  zoneName: string;
}

export interface ZoneActivity {
  zone: number;
  name: string;
  campuses: string[];
  callCount: number;
  totalDuration: number;
  avgCallLength: number;
  isSpike: boolean;
  spikeRatio: number;
  recentCalls: ScannerCall[];
}

export interface ScannerSummary {
  totalCalls: number;
  windowMinutes: number;
  zones: ZoneActivity[];
  activeCampusZones: string[];
  spikeZones: ZoneActivity[];
  lastUpdate: string;
  talkgroupCounts: Record<number, number>;
  error?: string;
}

const BASELINE_CALLS_PER_2H = 40;
const SPIKE_THRESHOLD = 2.0;

export async function fetchScannerActivity(windowMinutes: number = 120): Promise<ScannerSummary> {
  const since = Date.now() - windowMinutes * 60 * 1000;
  const url = `/api/openmhz-proxy?since=${since}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log('Scanner fetch: HTTP ' + res.status);
      return emptySummary(windowMinutes, 'http_' + res.status);
    }

    const data: unknown = await res.json();
    const obj = data as Record<string, unknown>;

    const topKeys = Object.keys(obj);
    console.log('Scanner API response keys: [' + topKeys.join(', ') + ']');

    let rawCalls: unknown[] = [];
    if (Array.isArray(obj.calls)) {
      rawCalls = obj.calls;
    } else if (Array.isArray(data)) {
      rawCalls = data;
    } else {
      const preview = JSON.stringify(data).slice(0, 300);
      console.log('Scanner: unknown response. Preview: ' + preview);
      if (obj.error) console.log('Scanner API error: ' + JSON.stringify(obj.error));
      return emptySummary(windowMinutes, String(obj.error || 'unknown_format'));
    }

    console.log('Scanner: ' + rawCalls.length + ' calls in ' + windowMinutes + 'm window');

    if (rawCalls.length > 0) {
      console.log('Scanner sample call: ' + JSON.stringify(rawCalls[0]).slice(0, 300));
    }

    const calls: ScannerCall[] = [];
    for (const raw of rawCalls) {
      const c = raw as Record<string, unknown>;
      const call = parseCall(c);
      if (call) calls.push(call);
    }

    console.log('Scanner: ' + calls.length + ' parsed calls');
    const tgDist: Record<number, number> = {};
    for (const c of calls) { tgDist[c.talkgroupId] = (tgDist[c.talkgroupId] || 0) + 1; }
    console.log('Scanner talkgroup distribution: ' + JSON.stringify(tgDist));

    const zones = aggregateByZone(calls, windowMinutes);
    const spikeZones = zones.filter(z => z.isSpike);
    const activeCampusZones = spikeZones.flatMap(z => z.campuses);

    if (spikeZones.length > 0) {
      console.log('Scanner ALERT: ' + spikeZones.length + ' zones with unusual activity: ' +
        spikeZones.map(z => z.name + ' (' + z.callCount + ' calls)').join(', ')
      );
    }

    return {
      totalCalls: calls.length,
      windowMinutes,
      zones,
      activeCampusZones,
      spikeZones,
      lastUpdate: new Date().toISOString(),
      talkgroupCounts: tgDist,
    };

  } catch (err) {
    console.log('Scanner fetch error: ' + String(err).slice(0, 100));
    return emptySummary(windowMinutes, 'fetch_failed');
  }
}

function parseCall(c: Record<string, unknown>): ScannerCall | null {
  const id = String(c._id ?? c.id ?? Math.random());
  const talkgroup = String(c.talkgroup ?? c.talkgroupAlpha ?? 'Unknown');
  const talkgroupId = Number(c.talkgroupNum ?? c.talkgroup_num ?? 0);
  const time = String(c.time ?? c.start_time ?? '');
  const length = Number(c.len ?? c.length ?? 0);
  const url = String(c.url ?? c.audio_url ?? '');

  if (!time) return null;

  let matchedZone: ZoneInfo | null = null;
  for (const z of CPD_ZONES) {
    if (z.zone === talkgroupId) {
      matchedZone = z;
      break;
    }
  }

  return {
    id,
    talkgroup,
    talkgroupId,
    time,
    length,
    url,
    zone: matchedZone?.zone ?? null,
    zoneName: matchedZone?.name ?? talkgroup,
  };
}

function aggregateByZone(calls: ScannerCall[], windowMinutes: number): ZoneActivity[] {
  // Dynamic baseline: average calls per active zone from actual data
  const zoneCounts: Record<number, number> = {};
  for (const c of calls) { if (c.zone != null) zoneCounts[c.zone] = (zoneCounts[c.zone] || 0) + 1; }
  const activeZones = Object.keys(zoneCounts).length || 1;
  const zoneMatchedCalls = Object.values(zoneCounts).reduce((a, b) => a + b, 0);
  const baseline = Math.max(zoneMatchedCalls / activeZones, 3); // floor of 3 to avoid false positives on low volume
  console.log("Scanner zone baseline: " + baseline.toFixed(1) + " calls/zone (" + activeZones + " active zones, " + zoneMatchedCalls + " matched calls)");

  return CPD_ZONES
    .filter(z => z.campuses.length > 0)
    .map(zoneInfo => {
      const zoneCalls = calls.filter(c => c.zone === zoneInfo.zone);
      const totalDuration = zoneCalls.reduce((sum, c) => sum + c.length, 0);
      const avgCallLength = zoneCalls.length > 0 ? totalDuration / zoneCalls.length : 0;
      const spikeRatio = zoneCalls.length / Math.max(baseline, 1);
      const isSpike = spikeRatio >= SPIKE_THRESHOLD;

      return {
        zone: zoneInfo.zone,
        name: zoneInfo.name,
        campuses: zoneInfo.campuses,
        callCount: zoneCalls.length,
        totalDuration,
        avgCallLength,
        isSpike,
        spikeRatio,
        recentCalls: zoneCalls.slice(-5),
      };
    })
    .sort((a, b) => b.callCount - a.callCount);
}

function emptySummary(windowMinutes: number, error: string): ScannerSummary {
  return {
    totalCalls: 0,
    windowMinutes,
    zones: [],
    activeCampusZones: [],
    spikeZones: [],
    lastUpdate: new Date().toISOString(),
    talkgroupCounts: {},
    error,
  };
}