/**
 * Watch v2 — Lightweight Summary Hook
 * ═══════════════════════════════════════════════════
 * For use by Briefing and Dashboard modules.
 * Fetches Watch data with a 5-minute refresh interval (vs Watch's 2-min)
 * to avoid doubling API load when both modules are mounted.
 *
 * Returns a simplified summary optimized for narrative integration.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { WatchIncident, CampusThreat, NetworkStatus, ThreatLevel } from './types';
import { THREAT_CONFIG, VIOLENT_CRIME_LABELS } from './types';
import { fetchCitizenIncidents, fetchCPDIncidents, fetchNewsIncidents, fetchScannerActivity, fetchWeather } from './fetchers';
import { fuseIncidents, assessCampusThreats, computeNetworkStatus } from './fusion';

const REFRESH_INTERVAL_MS = 300_000; // 5 minutes

export interface WatchSummary {
  // Network level
  overallThreat: ThreatLevel;
  totalActiveIncidents: number;
  campusesElevated: number;          // Campuses at AMBER or above
  campusesRed: number;               // Campuses at RED
  highestThreatCampus: string | null; // Campus short name
  highestThreatLevel: ThreatLevel;

  // Incident breakdown
  incidentsByType: Record<string, number>;  // e.g. { Shooting: 3, Homicide: 1 }
  nearestIncidentDistance: number | null;    // miles, to any campus
  nearestIncidentCampus: string | null;

  // Confidence pipeline
  reportedCount: number;      // Single-source only
  corroboratedCount: number;  // Multi-source
  confirmedCount: number;     // CPD confirmed

  // Source health
  citizenOnline: boolean;
  scannerOnline: boolean;
  newsOnline: boolean;
  cpdOnline: boolean;
  scannerCallCount: number;

  // Campus details (for tables/grids)
  campusThreats: CampusThreat[];

  // Raw data for advanced use
  incidents: WatchIncident[];
  networkStatus: NetworkStatus | null;

  // State
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

// Singleton cache — shared across all consumers to prevent duplicate fetches
let cachedSummary: WatchSummary | null = null;
let lastFetchTime = 0;
let fetchPromise: Promise<WatchSummary> | null = null;

async function fetchWatchSummary(): Promise<WatchSummary> {
  const [citizen, cpd, news, scanner, weather] = await Promise.all([
    fetchCitizenIncidents(),
    fetchCPDIncidents(),
    fetchNewsIncidents(),
    fetchScannerActivity(),
    fetchWeather(),
  ]);

  const allRaw = [...citizen, ...cpd, ...news, ...scanner.incidents];
  const fused = fuseIncidents(allRaw, scanner.spikeZones);
  const threats = assessCampusThreats(fused);
  const netStatus = computeNetworkStatus(threats, fused, weather, scanner.totalCalls);

  // Compute summary
  const elevated = threats.filter(c => c.threatLevel !== 'GREEN');
  const red = threats.filter(c => c.threatLevel === 'RED');
  const highest = threats.reduce<CampusThreat | null>((worst, c) => {
    const order: Record<ThreatLevel, number> = { RED: 0, ORANGE: 1, AMBER: 2, GREEN: 3 };
    if (!worst) return c;
    return order[c.threatLevel] < order[worst.threatLevel] ? c : worst;
  }, null);

  // Incident type breakdown
  const byType: Record<string, number> = {};
  for (const inc of fused) {
    const label = VIOLENT_CRIME_LABELS[inc.crimeType] || inc.crimeType;
    byType[label] = (byType[label] || 0) + 1;
  }

  // Nearest incident to any campus
  let nearestDist: number | null = null;
  let nearestCampus: string | null = null;
  for (const ct of threats) {
    if (ct.nearestDistance !== null && (nearestDist === null || ct.nearestDistance < nearestDist)) {
      nearestDist = ct.nearestDistance;
      nearestCampus = ct.campusShort;
    }
  }

  // Confidence breakdown
  const reported = fused.filter(i => i.corroboratedBy.length === 0).length;
  const corroborated = fused.filter(i => i.corroboratedBy.length > 0 && i.confidence !== 'CONFIRMED').length;
  const confirmed = fused.filter(i => i.confidence === 'CONFIRMED').length;

  return {
    overallThreat: netStatus?.overallThreat ?? 'GREEN',
    totalActiveIncidents: fused.length,
    campusesElevated: elevated.length,
    campusesRed: red.length,
    highestThreatCampus: highest?.campusShort ?? null,
    highestThreatLevel: highest?.threatLevel ?? 'GREEN',
    incidentsByType: byType,
    nearestIncidentDistance: nearestDist,
    nearestIncidentCampus: nearestCampus,
    reportedCount: reported,
    corroboratedCount: corroborated,
    confirmedCount: confirmed,
    citizenOnline: citizen.length > 0,
    scannerOnline: scanner.totalCalls > 0,
    newsOnline: news.length > 0,
    cpdOnline: cpd.length > 0,
    scannerCallCount: scanner.totalCalls,
    campusThreats: threats,
    incidents: fused,
    networkStatus: netStatus,
    isLoading: false,
    lastUpdated: new Date(),
    error: null,
  };
}

export function useWatchSummary(): WatchSummary {
  const [summary, setSummary] = useState<WatchSummary>({
    overallThreat: 'GREEN',
    totalActiveIncidents: 0,
    campusesElevated: 0,
    campusesRed: 0,
    highestThreatCampus: null,
    highestThreatLevel: 'GREEN',
    incidentsByType: {},
    nearestIncidentDistance: null,
    nearestIncidentCampus: null,
    reportedCount: 0,
    corroboratedCount: 0,
    confirmedCount: 0,
    citizenOnline: false,
    scannerOnline: false,
    newsOnline: false,
    cpdOnline: false,
    scannerCallCount: 0,
    campusThreats: [],
    incidents: [],
    networkStatus: null,
    isLoading: true,
    lastUpdated: null,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    // Use cached data if fresh enough (within 4 minutes)
    if (cachedSummary && Date.now() - lastFetchTime < 240_000) {
      setSummary(cachedSummary);
      return;
    }

    // Deduplicate concurrent fetches
    if (!fetchPromise) {
      fetchPromise = fetchWatchSummary().finally(() => { fetchPromise = null; });
    }

    try {
      const result = await fetchPromise;
      cachedSummary = result;
      lastFetchTime = Date.now();
      setSummary(result);
    } catch (err) {
      setSummary(prev => ({ ...prev, isLoading: false, error: String(err) }));
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return summary;
}
