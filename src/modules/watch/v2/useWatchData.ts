/**
 * Watch v2 — Central Data Hook
 * Single hook that orchestrates all data fetching, fusion, and state.
 * Auto-refreshes every 2 minutes. Shows loading state honestly.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WatchIncident, CampusThreat, NetworkStatus, SourceStatus } from './types';
import { fetchCitizenIncidents, fetchCPDIncidents, fetchNewsIncidents, fetchScannerActivity, fetchWeather, getSourceStatuses } from './fetchers';
import { fuseIncidents, assessCampusThreats, computeNetworkStatus } from './fusion';

const REFRESH_INTERVAL_MS = 120_000; // 2 minutes

export interface WatchDataState {
  // Core data
  incidents: WatchIncident[];
  campusThreats: CampusThreat[];
  networkStatus: NetworkStatus | null;
  sourceStatuses: SourceStatus[];

  // Scanner metadata
  scannerTotalCalls: number;
  scannerSpikeZones: string[];

  // UI state
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefresh: Date | null;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
}

export function useWatchData(): WatchDataState {
  const [incidents, setIncidents] = useState<WatchIncident[]>([]);
  const [campusThreats, setCampusThreats] = useState<CampusThreat[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>([]);
  const [scannerTotalCalls, setScannerTotalCalls] = useState(0);
  const [scannerSpikeZones, setScannerSpikeZones] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const isFirst = !lastRefresh;
    if (isFirst) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      // Fetch all sources in parallel
      const [citizen, cpd, news, scanner, weather] = await Promise.all([
        fetchCitizenIncidents(),
        fetchCPDIncidents(),
        fetchNewsIncidents(),
        fetchScannerActivity(),
        fetchWeather(),
      ]);

      // Combine all raw incidents
      const allRaw = [...citizen, ...cpd, ...news, ...scanner.incidents];

      // Run fusion engine
      const fused = fuseIncidents(allRaw, scanner.spikeZones);

      // Assess campus threats
      const threats = assessCampusThreats(fused);

      // Compute network status
      const netStatus = computeNetworkStatus(threats, fused, weather, scanner.totalCalls);

      // Update state
      setIncidents(fused);
      setCampusThreats(threats);
      setNetworkStatus(netStatus);
      setSourceStatuses(getSourceStatuses());
      setScannerTotalCalls(scanner.totalCalls);
      setScannerSpikeZones(scanner.spikeZones);
      setLastRefresh(new Date());

      console.log(`Watch v2 refresh complete: ${fused.length} fused incidents, ${threats.filter(t => t.threatLevel !== 'GREEN').length} campuses elevated`);
    } catch (err) {
      setError(String(err));
      console.error('Watch v2 refresh error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + auto-refresh
  useEffect(() => {
    refresh();

    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return {
    incidents,
    campusThreats,
    networkStatus,
    sourceStatuses,
    scannerTotalCalls,
    scannerSpikeZones,
    isLoading,
    isRefreshing,
    lastRefresh,
    error,
    refresh,
  };
}
