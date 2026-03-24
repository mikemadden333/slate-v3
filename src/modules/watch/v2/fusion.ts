/**
 * Watch v2 — Incident Fusion Engine
 * The brain of Watch. Takes raw incidents from all sources, clusters them,
 * deduplicates, assigns confidence scores, and computes campus threat levels.
 *
 * Rules:
 * - Two incidents within 0.15 miles and 60 minutes = same event
 * - Cross-source corroboration upgrades confidence
 * - CPD confirmation = CONFIRMED (95%)
 * - Citizen + Scanner zone spike = CORROBORATED (85%)
 * - Single source = REPORTED (70%)
 * - Campus threat level based on nearest incident distance + confidence
 */

import type {
  WatchIncident, CampusThreat, ThreatLevel, NetworkStatus,
  ConfidenceLevel, DataSource,
} from './types';
import { CONFIDENCE_SCORE, THREAT_CONFIG } from './types';
import { CAMPUSES } from '../data/campuses';
import { haversine } from '../engine/geo';

// ─── Incident Clustering ──────────────────────────────────────────────────

const CLUSTER_DISTANCE_MI = 0.15;  // ~800 feet
const CLUSTER_TIME_MIN = 60;       // 60 minutes

interface IncidentCluster {
  primary: WatchIncident;
  members: WatchIncident[];
  sources: Set<DataSource>;
}

function clusterIncidents(incidents: WatchIncident[]): IncidentCluster[] {
  // Sort by timestamp descending (newest first)
  const sorted = [...incidents].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const clusters: IncidentCluster[] = [];
  const assigned = new Set<string>();

  for (const incident of sorted) {
    if (assigned.has(incident.id)) continue;

    // Start a new cluster
    const cluster: IncidentCluster = {
      primary: incident,
      members: [incident],
      sources: new Set([incident.source]),
    };
    assigned.add(incident.id);

    // Find all incidents that belong to this cluster
    for (const candidate of sorted) {
      if (assigned.has(candidate.id)) continue;

      const dist = haversine(incident.lat, incident.lng, candidate.lat, candidate.lng);
      const timeDiff = Math.abs(
        new Date(incident.timestamp).getTime() - new Date(candidate.timestamp).getTime()
      ) / 60000;

      if (dist <= CLUSTER_DISTANCE_MI && timeDiff <= CLUSTER_TIME_MIN) {
        cluster.members.push(candidate);
        cluster.sources.add(candidate.source);
        assigned.add(candidate.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

// ─── Confidence Scoring ───────────────────────────────────────────────────

function computeConfidence(
  cluster: IncidentCluster,
  spikeZones: string[],
): { level: ConfidenceLevel; score: number; corroboratedBy: DataSource[] } {
  const sources = cluster.sources;
  const corroboratedBy: DataSource[] = [];

  // CPD present = CONFIRMED
  if (sources.has('CPD')) {
    for (const s of sources) { if (s !== cluster.primary.source) corroboratedBy.push(s); }
    return { level: 'CONFIRMED', score: 95, corroboratedBy };
  }

  // Multiple non-CPD sources = CORROBORATED
  if (sources.size >= 2) {
    for (const s of sources) { if (s !== cluster.primary.source) corroboratedBy.push(s); }
    return { level: 'CORROBORATED', score: 85, corroboratedBy };
  }

  // Single source + scanner zone spike in same area = CORROBORATED
  if (sources.has('CITIZEN') && spikeZones.length > 0) {
    // Check if any spike zone covers this incident's area
    // This is a rough heuristic — zone names contain neighborhood names
    const incidentArea = cluster.primary.nearestCampusId
      ? CAMPUSES.find(c => c.id === cluster.primary.nearestCampusId)?.communityArea ?? ''
      : '';

    for (const zone of spikeZones) {
      if (zone.toLowerCase().includes(incidentArea.toLowerCase().split(' ')[0])) {
        corroboratedBy.push('SCANNER');
        return { level: 'CORROBORATED', score: 80, corroboratedBy };
      }
    }
  }

  // Single source
  return { level: 'REPORTED', score: 70, corroboratedBy: [] };
}

// ─── Fusion Pipeline ──────────────────────────────────────────────────────

export function fuseIncidents(
  allIncidents: WatchIncident[],
  spikeZones: string[],
): WatchIncident[] {
  if (allIncidents.length === 0) return [];

  // Step 1: Cluster
  const clusters = clusterIncidents(allIncidents);

  // Step 2: Score and deduplicate
  const fused: WatchIncident[] = clusters.map(cluster => {
    const { level, score, corroboratedBy } = computeConfidence(cluster, spikeZones);

    // Use the most recent member as the primary
    const primary = cluster.members.reduce((a, b) =>
      new Date(a.timestamp).getTime() > new Date(b.timestamp).getTime() ? a : b
    );

    // Use the most severe crime type from the cluster
    const severityOrder = ['HOMICIDE', 'SHOOTING', 'SEXUAL_ASSAULT', 'SHOTS_FIRED', 'STABBING', 'WEAPONS'];
    const mostSevere = cluster.members.reduce((a, b) =>
      severityOrder.indexOf(a.crimeType) <= severityOrder.indexOf(b.crimeType) ? a : b
    );

    return {
      ...primary,
      crimeType: mostSevere.crimeType,
      confidence: level,
      confidenceScore: score,
      corroboratedBy,
      ageMinutes: Math.round((Date.now() - new Date(primary.timestamp).getTime()) / 60000),
    };
  });

  // Step 3: Sort by severity (distance to campus, then recency)
  return fused.sort((a, b) => {
    // Nearest to any campus first
    const distA = a.distanceToCampus ?? 999;
    const distB = b.distanceToCampus ?? 999;
    if (Math.abs(distA - distB) > 0.1) return distA - distB;
    // Then by recency
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

// ─── Campus Threat Assessment ─────────────────────────────────────────────

export function assessCampusThreats(
  fusedIncidents: WatchIncident[],
): CampusThreat[] {
  return CAMPUSES.map(campus => {
    // Find all incidents within 1 mile, last 6 hours
    const sixHoursAgo = Date.now() - 6 * 3600000;
    const nearby = fusedIncidents.filter(inc => {
      const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      const ts = new Date(inc.timestamp).getTime();
      return dist <= 1.0 && ts >= sixHoursAgo;
    }).map(inc => ({
      ...inc,
      distanceToCampus: haversine(campus.lat, campus.lng, inc.lat, inc.lng),
    }));

    // Sort by distance
    nearby.sort((a, b) => (a.distanceToCampus ?? 999) - (b.distanceToCampus ?? 999));

    const nearest = nearby[0] ?? null;
    const nearestDist = nearest?.distanceToCampus ?? null;

    // Determine threat level
    let threatLevel: ThreatLevel = 'GREEN';

    if (nearest && nearestDist !== null) {
      if (nearestDist <= 0.25 && nearest.confidenceScore >= 70) {
        threatLevel = 'RED';
      } else if (nearestDist <= 0.5 && nearest.confidenceScore >= 80) {
        threatLevel = 'ORANGE';
      } else if (nearestDist <= 0.5 && nearest.confidenceScore >= 65) {
        threatLevel = 'AMBER';
      } else if (nearestDist <= 1.0) {
        threatLevel = 'AMBER';
      }

      // Upgrade if multiple incidents
      if (nearby.length >= 3 && threatLevel === 'AMBER') threatLevel = 'ORANGE';
      if (nearby.length >= 2 && nearby.some(i => i.crimeType === 'HOMICIDE' || i.crimeType === 'SHOOTING')) {
        if (threatLevel === 'AMBER') threatLevel = 'ORANGE';
      }
    }

    return {
      campusId: campus.id,
      campusName: campus.name,
      campusShort: campus.short,
      lat: campus.lat,
      lng: campus.lng,
      communityArea: campus.communityArea,
      threatLevel,
      incidentCount: nearby.length,
      nearestIncident: nearest,
      nearestDistance: nearestDist,
      incidents: nearby,
    };
  });
}

// ─── Network Summary ──────────────────────────────────────────────────────

export function computeNetworkStatus(
  campusThreats: CampusThreat[],
  fusedIncidents: WatchIncident[],
  weather: { tempF: number; condition: string; isRiskElevating: boolean },
  scannerTotalCalls: number,
): NetworkStatus {
  const attention = campusThreats.filter(c =>
    c.threatLevel === 'RED' || c.threatLevel === 'ORANGE' || c.threatLevel === 'AMBER'
  ).length;

  const highest = campusThreats.reduce<CampusThreat | null>((worst, c) => {
    const order: Record<ThreatLevel, number> = { RED: 0, ORANGE: 1, AMBER: 2, GREEN: 3 };
    if (!worst) return c;
    return order[c.threatLevel] < order[worst.threatLevel] ? c : worst;
  }, null);

  // Overall threat = worst campus
  const overallThreat = highest?.threatLevel ?? 'GREEN';

  // Data age tracking
  const now = Date.now();
  const citizenIncidents = fusedIncidents.filter(i => i.source === 'CITIZEN');
  const newsIncidents = fusedIncidents.filter(i => i.source === 'NEWS');
  const cpdIncidents = fusedIncidents.filter(i => i.source === 'CPD');

  const newestCitizen = citizenIncidents.length > 0
    ? Math.round((now - new Date(citizenIncidents[0].timestamp).getTime()) / 60000) : 999;
  const newestNews = newsIncidents.length > 0
    ? Math.round((now - new Date(newsIncidents[0].timestamp).getTime()) / 60000) : 999;
  const newestCPD = cpdIncidents.length > 0
    ? Math.round((now - new Date(cpdIncidents[0].timestamp).getTime()) / 3600000) : 999;

  return {
    overallThreat,
    campusesRequiringAttention: attention,
    totalActiveIncidents: fusedIncidents.filter(i => i.ageMinutes <= 360).length,
    highestThreatCampus: highest,
    lastUpdated: new Date().toISOString(),
    dataAge: {
      citizen: newestCitizen,
      scanner: scannerTotalCalls > 0 ? 2 : 999, // Scanner is always ~2 min old if live
      news: newestNews,
      cpd: newestCPD,
    },
    weather,
  };
}
