/**
 * PULSE 2.0 — ALL TypeScript interfaces — single source of truth.
 * The Campus interface is re-exported from data/campuses.ts.
 */

export type { Campus } from '../data/campuses';

export interface Incident {
  id: string;
  date: string;
  type: string;
  block: string;
  lat: number;
  lng: number;
  description: string;
  source?: 'CPD' | 'CPD_REALTIME' | 'NEWS' | 'CITIZEN' | 'DISPATCH';
  confidence?: 'VERIFIED' | 'NEWS_REPORTED' | 'SCANNER_DERIVED';
  headline?: string;
  url?: string;
}

export interface ShotSpotterEvent {
  id: string;
  date: string;
  lat: number;
  lng: number;
  type: string;
  rounds: number;
}

export interface ContagionZone {
  incidentId: string;
  lat: number;
  lng: number;
  homicideDate: string;
  ageH: number;
  phase: 'ACUTE' | 'ACTIVE' | 'WATCH';
  radius: number;
  retWin: boolean;
  gang: boolean;
  firearm: boolean;
  daysLeft: number;
  distanceFromCampus?: number;
  bearingFromCampus?: number;
  block?: string;
}

export type SchoolPeriod =
  | 'PRE_SCHOOL'
  | 'ARRIVAL'
  | 'SCHOOL_DAY'
  | 'DISMISSAL'
  | 'AFTER_SCHOOL'
  | 'OVERNIGHT'
  | 'NO_SCHOOL';

export interface CampusRisk {
  campusId: number;
  score: number;
  label: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  base: number;
  acute: number;
  seasonal: number;
  shotSpotterBonus: number;
  closeCount: number;
  nearCount: number;
  contagionZones: ContagionZone[];
  inRetaliationWindow: boolean;
  minutesToArrival: number;
  minutesToDismissal: number;
  schoolPeriod: SchoolPeriod;
  statusReason: string;
}

export type NewsTier = 'CAMPUS_PROXIMATE' | 'CHICAGO_VIOLENCE' | 'CHICAGO_GENERAL' | 'NATIONAL_BREAKING';

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  category: 'violence' | 'ice' | 'general';
  tier: NewsTier;
  neighborhoods: string[];
  campusProximity?: { campusId: number; distance: number };
  proximateCampusIds?: number[];
  isBreaking?: boolean;
}

export interface IceAlert {
  id: string;
  timestamp: string;
  source: string;
  confidence: 'CONFIRMED' | 'REPORTED';
  location?: string;
  lat?: number;
  lng?: number;
  nearestCampusId?: number;
  distanceFromCampus?: number;
  description: string;
}

export interface ForecastDay {
  date: string;
  dayName: string;
  label: 'LOW' | 'ELEVATED' | 'HIGH';
  confidence: number;
  drivers: string[];
  contagionPhase?: 'ACUTE' | 'ACTIVE' | 'WATCH' | null;
  weatherRisk: boolean;
  isSchoolDay: boolean;
}

export interface SafeCorridor {
  name: string;
  direction: string;
  status: 'CLEAR' | 'CAUTION' | 'AVOID';
  incidentCount24h: number;
  mostRecentIncident?: Incident;
  waypoints: Array<{ lat: number; lng: number }>;
}

export interface NetworkSummary {
  avgScore: number;
  campusesElevated: number;
  elevatedCount: number;
  totalCampuses: number;
  highestCampus: string;
  highestScore: number;
  acuteZones: number;
  activeZones: number;
  watchZones: number;
  incidents24h: number;
  iceAlerts: number;
  retaliationWindows: number;
  trends: { scoreVsLastWeek: number; incidentsVsLastWeek: number };
}

export interface DailyWeather {
  date: string;
  temp_max: number;
  temp_min: number;
  apparent_temp_max: number;
  precipitation: number;
}

export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  windSpeed: number;
}
