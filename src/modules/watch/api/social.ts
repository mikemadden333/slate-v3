/**
 * Social & Community Signal APIs
 * X/Twitter geographic signals, Citizen app incidents, OpenMHZ scanner.
 * All degrade gracefully — return [] on any failure.
 */

import type { NewsItem } from '../engine/types';

export interface ScannerCall {
  id: string;
  timestamp: string;
  transcription: string;
  talkgroup: string;
  frequency: number;
}

/** Violence keywords for scanner and social classification */
const VIOLENCE_KW = /shooting|shots fired|person shot|body|homicide|battery in progress|person with gun/i;
const ICE_KW = /immigration|ICE federal/i;

/**
 * Fetch X/Twitter signals for a geographic area.
 * Requires VITE_X_BEARER_TOKEN. Degrades to empty if unavailable.
 */
export async function fetchXSignals(
  lat: number,
  lng: number,
  radiusMi: number = 1,
): Promise<NewsItem[]> {
  const token = import.meta.env.VITE_X_BEARER_TOKEN;
  if (!token) return [];

  try {
    const query = encodeURIComponent(
      `(shooting OR shots OR gunfire OR ICE OR immigration) point_radius:[${lng} ${lat} ${radiusMi}mi] lang:en`,
    );
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=created_at`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];

    const data = await res.json() as {
      data?: Array<{ id: string; text: string; created_at?: string }>;
    };

    if (!data.data) return [];

    return data.data.map(tweet => ({
      id: `x-${tweet.id}`,
      source: 'X (Twitter)',
      title: tweet.text.slice(0, 100),
      description: tweet.text,
      link: `https://x.com/i/status/${tweet.id}`,
      pubDate: tweet.created_at ?? new Date().toISOString(),
      category: 'general' as const,
      tier: 'CHICAGO_GENERAL' as const,
      neighborhoods: [],
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Citizen app incidents near a location.
 * Unofficial API — may change. Return [] on any failure.
 */
export async function fetchCitizenIncidents(
  lat: number,
  lng: number,
): Promise<NewsItem[]> {
  try {
    const url =
      `https://citizen.com/api/v2/incidents` +
      `?insideBoundingBox[0]=${lat + 0.01}` +
      `&insideBoundingBox[1]=${lng - 0.01}` +
      `&insideBoundingBox[2]=${lat - 0.01}` +
      `&insideBoundingBox[3]=${lng + 0.01}`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json() as {
      results?: Array<{
        key: string;
        title: string;
        raw: string;
        ts: number;
        latitude: number;
        longitude: number;
      }>;
    };

    if (!data.results) return [];

    return data.results.map(inc => ({
      id: `citizen-${inc.key}`,
      source: 'Citizen App',
      title: inc.title,
      description: inc.raw ?? inc.title,
      link: '',
      pubDate: new Date(inc.ts * 1000).toISOString(),
      category: 'general' as const,
      tier: 'CHICAGO_GENERAL' as const,
      neighborhoods: [],
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch OpenMHZ CPD scanner transcriptions.
 * Fastest verified-source signal available — precedes CPD Data Portal by 12-24h.
 */
export async function fetchScanner(): Promise<ScannerCall[]> {
  try {
    const since = Math.floor(Date.now() / 1000) - 7200; // last 2 hours
    const url =
      `https://api.openmhz.com/chi/calls` +
      `?time=${since}` +
      `&filter-type=group&filter-code=ZONE4,ZONE6,ZONE8`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json() as {
      calls?: Array<{
        _id: string;
        time: number;
        transcription?: string;
        talkgroupNum: number;
        freq: number;
      }>;
    };

    if (!data.calls) return [];

    return data.calls
      .filter(call => {
        const text = call.transcription ?? '';
        return VIOLENCE_KW.test(text) || ICE_KW.test(text);
      })
      .map(call => ({
        id: call._id,
        timestamp: new Date(call.time * 1000).toISOString(),
        transcription: call.transcription ?? '',
        talkgroup: String(call.talkgroupNum),
        frequency: call.freq,
      }));
  } catch {
    return [];
  }
}
