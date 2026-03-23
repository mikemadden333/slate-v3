/**
 * CPD Realtime — DISABLED
 * The Calls for Service endpoint (x2n5-8w5q) returns HTTP 400.
 * Scanner data via OpenMHz now fills this role with fresher data.
 * Keeping the interface so SentinelApp.tsx doesn't break.
 */
import type { Incident } from '../engine/types';

export async function fetchRealtimeIncidents(): Promise<Incident[]> {
  return [];
}