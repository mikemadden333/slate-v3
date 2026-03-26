/**
 * Watch v2 — Type System
 * First principles: Every type serves the question "Are my students in danger right now?"
 * Violent crime ONLY: homicide, shooting, shots fired, weapons, stabbing, sexual assault.
 */

// ─── Source Identity ──────────────────────────────────────────────────────

export type DataSource = 'CITIZEN' | 'SCANNER' | 'NEWS' | 'CPD';

export type ConfidenceLevel =
  | 'CONFIRMED'      // 95%+ — CPD verified OR 2+ sources agree
  | 'CORROBORATED'   // 80%+ — Citizen + Scanner zone spike
  | 'REPORTED'        // 65%+ — Single source (Citizen or News)
  | 'UNVERIFIED';     // <65% — Scanner transcription only, no corroboration

export const CONFIDENCE_SCORE: Record<ConfidenceLevel, number> = {
  CONFIRMED: 95,
  CORROBORATED: 85,
  REPORTED: 70,
  UNVERIFIED: 50,
};

// ─── Violent Crime Types (the ONLY types Watch cares about) ───────────────

export type ViolentCrimeType =
  | 'HOMICIDE'
  | 'SHOOTING'
  | 'SHOTS_FIRED'
  | 'WEAPONS'
  | 'STABBING'
  | 'SEXUAL_ASSAULT';

export const VIOLENT_CRIME_LABELS: Record<ViolentCrimeType, string> = {
  HOMICIDE: 'Homicide',
  SHOOTING: 'Shooting',
  SHOTS_FIRED: 'Shots Fired',
  WEAPONS: 'Weapon',
  STABBING: 'Stabbing',
  SEXUAL_ASSAULT: 'Sexual Assault',
};

// Keywords used to classify raw text into violent crime types
export const VIOLENT_KEYWORDS: Record<ViolentCrimeType, string[]> = {
  HOMICIDE: ['homicide', 'murder', 'killed', 'fatal', 'dead', 'death', 'body found', 'deceased'],
  SHOOTING: ['shooting', 'shot', 'gunshot', 'wounded by gunfire', 'shot and killed', 'shot and wounded'],
  SHOTS_FIRED: ['shots fired', 'gunfire', 'gunshots', 'shots heard', 'shots rang out'],
  WEAPONS: ['gun', 'weapon', 'armed', 'firearm', 'brandishing', 'rifle', 'pistol', 'handgun'],
  STABBING: ['stabbing', 'stabbed', 'knife', 'slashing', 'slashed', 'cut with knife'],
  SEXUAL_ASSAULT: ['sexual assault', 'rape', 'raped', 'sexual abuse', 'sex crime', 'indecent'],
};

// ─── Unified Incident (the core data object) ─────────────────────────────

export interface WatchIncident {
  id: string;
  crimeType: ViolentCrimeType;
  title: string;                   // Human-readable headline
  description: string;             // Detail text
  lat: number;
  lng: number;
  timestamp: string;               // ISO 8601
  source: DataSource;
  confidence: ConfidenceLevel;
  confidenceScore: number;         // 0-100
  corroboratedBy: DataSource[];    // Which other sources confirmed this
  nearestCampusId: number | null;
  distanceToCampus: number | null; // miles
  ageMinutes: number;              // How old is this data point
  url?: string;                    // Link to source
  rawTitle?: string;               // Original title before classification
  scannerAudioUrl?: string;        // If from scanner transcription
  isEstimatedLocation?: boolean;    // True if location is estimated (news/scanner geocoding)
}

// ─── Campus Threat Level ──────────────────────────────────────────────────

export type ThreatLevel = 'GREEN' | 'AMBER' | 'ORANGE' | 'RED';

export const THREAT_CONFIG: Record<ThreatLevel, {
  color: string;
  bgColor: string;
  label: string;
  description: string;
}> = {
  GREEN:  { color: '#2F855A', bgColor: 'rgba(47, 133, 90, 0.08)',  label: 'Clear',    description: 'No active threats within 1 mile' },
  AMBER:  { color: '#C07C1E', bgColor: 'rgba(192, 124, 30, 0.08)', label: 'Monitor',  description: 'Reported activity within 1 mile' },
  ORANGE: { color: '#C05621', bgColor: 'rgba(192, 86, 33, 0.08)',  label: 'Elevated', description: 'Confirmed threat within 0.5 miles' },
  RED:    { color: '#C53030', bgColor: 'rgba(197, 48, 48, 0.08)',  label: 'Alert',    description: 'Active threat within 0.25 miles' },
};

export interface CampusThreat {
  campusId: number;
  campusName: string;
  campusShort: string;
  lat: number;
  lng: number;
  communityArea: string;
  threatLevel: ThreatLevel;
  incidentCount: number;          // Violent incidents within 1 mile in last 6h
  nearestIncident: WatchIncident | null;
  nearestDistance: number | null;  // miles
  incidents: WatchIncident[];     // All incidents within 1 mile
}

// ─── Scanner Transcription ────────────────────────────────────────────────

export interface ScannerTranscript {
  callId: string;
  audioUrl: string;
  talkgroupId: number;
  zoneName: string;
  timestamp: string;
  duration: number;               // seconds
  transcript: string;
  isViolent: boolean;
  crimeType: ViolentCrimeType | null;
  extractedLocation: string | null;
  geocodedLat: number | null;
  geocodedLng: number | null;
  confidence: ConfidenceLevel;
}

// ─── Scanner Raw Call (for call log display) ─────────────────────────────

export interface ScannerRawCall {
  id: string;
  timestamp: string;          // ISO 8601
  talkgroupNum: number;
  zoneName: string;           // Mapped zone name or 'Unknown'
  duration: number;           // seconds
  audioUrl: string | null;
  frequency: number;
  transcript?: string;        // If transcribed
  isViolent?: boolean;        // If classified
}

// ─── Network Summary ──────────────────────────────────────────────────────

export interface NetworkStatus {
  overallThreat: ThreatLevel;
  campusesRequiringAttention: number;
  totalActiveIncidents: number;
  highestThreatCampus: CampusThreat | null;
  lastUpdated: string;
  dataAge: {
    citizen: number;    // minutes since last Citizen data
    scanner: number;    // minutes since last scanner data
    news: number;       // minutes since last news data
    cpd: number;        // hours since last CPD data
  };
  weather: {
    tempF: number;
    condition: string;
    isRiskElevating: boolean;  // temp > 80F or severe weather
  };
}

// ─── Source Health ─────────────────────────────────────────────────────────

export interface SourceStatus {
  source: DataSource;
  status: 'LIVE' | 'DEGRADED' | 'DOWN';
  lastSuccess: string | null;
  itemCount: number;
  latencyMs: number;
  error?: string;
}

// ─── View Mode ────────────────────────────────────────────────────────────

export type WatchView = 'ceo' | 'principal';
