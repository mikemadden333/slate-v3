/**
 * Watch v3 — The Definitive Build
 * ═══════════════════════════════════════════════════════════════════════════
 * "Know what happens as it happens."
 *
 * Three-act safety intelligence experience:
 *   Act I   — Briefing:   What does this mean?
 *   Act II  — Map:        Where is it happening?
 *   Act III — Contagion:  What happens next?
 *
 * Visual language: Dark slate (#1C2333) backgrounds. Gold accents.
 * Red ONLY for acute threats. IBM Plex family throughout.
 *
 * Architecture:
 * - Single entry point: WatchAppV3
 * - Data: useWatchData (v2 hook, unchanged)
 * - Contagion: fetchHomicidesForContagion → buildContagionZones → ContagionTab
 * - Map: WatchMap extracted from CEOView (unchanged)
 * - Demo: Ctrl+Shift+D (unchanged 3-phase sequence)
 * - SMS: Ctrl+Shift+S to configure phone
 */

import React, {
  useState, useMemo, useRef, useCallback, useEffect,
} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Data Layer ────────────────────────────────────────────────────────────
import { useWatchData } from '../v2/useWatchData';
import { useRole } from '../../../data/DataStore';
import type { WatchDataState } from '../v2/useWatchData';
import type { WatchIncident, ThreatLevel } from '../v2/types';
import { THREAT_CONFIG, VIOLENT_CRIME_LABELS } from '../v2/types';
import { fetchHomicidesForContagion } from '../v2/fetchers';

// ─── Engine ────────────────────────────────────────────────────────────────
import { buildContagionZones } from '../engine/contagion';
import type { ContagionZone, Incident, CampusRisk } from '../engine/types';
import { fmtAgo, haversine, bearing, compassLabel } from '../engine/geo';
import { CAMPUSES } from '../data/campuses';
import { createGangBoundaryLayer, GANG_BOUNDARY_CSS } from '../v2/gangBoundaries';

// ─── Contagion Tab ─────────────────────────────────────────────────────────
import ContagionTab from '../components/shared/ContagionTab';
// ─── Briefing Tab V2 (Mars Landing Phase 1) ────────────────────────────────
import { BriefingTabV2 } from './BriefingTabV2';
// ─── Response Tab (Mars Landing Phase 4) ───────────────────────────────────────
import ResponseTab from './ResponseTab';
import ResponseWarRoom from './ResponseWarRoom';
// ─── Situation Room (Mars Landing: Opening Statement) ───────────────────────────
import { SituationRoom } from './SituationRoom';
// ─── Map Overlays (Pulse Rings + Temporal Replay) ─────────────────────────────
import { getPulseRingHtml, TemporalReplayBar } from './MapOverlays';
// ─── Contagion Network Graph + Decay Clocks ───────────────────────────────────
import { NetworkOrganismGraph, DecayClock } from './ContagionNetworkGraph';
// ─── Design System ─────────────────────────────────────────────────────────
import {
  brand, bg, text, font, fontSize, fontWeight,
  border, shadow, radius, space, status,
} from '../../../core/theme';

// ═══════════════════════════════════════════════════════════════════════════
// WATCH V3 DESIGN TOKENS
// Dark slate intelligence aesthetic — distinct from the warm off-white of the app
// ═══════════════════════════════════════════════════════════════════════════
const W = {
  // Backgrounds — light canvas (Slate brief)
  bg:        '#F6F8FB',   // App canvas
  bgCard:    '#FFFFFF',   // White card
  bgSurface: '#F1F4F8',   // Subtle surface
  bgHover:   'rgba(79, 124, 255, 0.04)',  // Blue hover

  // Text — dark slate
  textPrimary:   '#0F1728',   // Deep slate
  textSecondary: '#4C5A70',   // Secondary
  textMuted:     '#7A8699',   // Muted
  textDim:       '#9CA3AF',   // Dim

  // Gold accents (sparingly)
  gold:      '#C9A54E',
  goldDim:   'rgba(201, 165, 78, 0.10)',
  goldBorder:'rgba(201, 165, 78, 0.20)',

  // Status — semantic on light
  red:       '#E5484D',
  redDim:    'rgba(229, 72, 77, 0.08)',
  redBorder: 'rgba(229, 72, 77, 0.20)',
  amber:     '#F59E0B',
  amberDim:  'rgba(245, 158, 11, 0.08)',
  green:     '#17B26A',
  greenDim:  'rgba(23, 178, 106, 0.08)',
  blue:      '#4F7CFF',
  blueDim:   'rgba(79, 124, 255, 0.08)',

  // Borders — light
  border:    'rgba(26, 35, 50, 0.08)',
  borderMd:  'rgba(26, 35, 50, 0.12)',
  borderLg:  'rgba(26, 35, 50, 0.18)',

  // Threat level colors — semantic on white
  threat: {
    GREEN:  { color: '#17B26A', bg: 'rgba(23, 178, 106, 0.08)',  border: 'rgba(23, 178, 106, 0.20)',  label: 'Clear' },
    AMBER:  { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)',  border: 'rgba(245, 158, 11, 0.20)',  label: 'Monitor' },
    ORANGE: { color: '#E07020', bg: 'rgba(224, 112, 32, 0.08)',  border: 'rgba(224, 112, 32, 0.20)',  label: 'Elevated' },
    RED:    { color: '#E5484D', bg: 'rgba(229, 72, 77, 0.08)',   border: 'rgba(229, 72, 77, 0.20)',   label: 'Alert' },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CSS ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════
const V3_CSS = `
${GANG_BOUNDARY_CSS}

@keyframes v3PulseRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(224, 82, 82, 0.5); }
  50%       { box-shadow: 0 0 0 10px rgba(224, 82, 82, 0); }
}
@keyframes v3PulseGold {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1.0; }
}
@keyframes v3FadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes v3SlideIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes v3Spin {
  to { transform: rotate(360deg); }
}
@keyframes v3SweepBar {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes v3Blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
@keyframes smsSlideIn {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes smsSlideOut {
  from { transform: translateY(0); opacity: 1; }
  to   { transform: translateY(-100%); opacity: 0; }
}

.v3-tab-active {
  color: ${W.gold} !important;
  border-bottom: 2px solid ${W.gold} !important;
}
.v3-campus-card:hover {
  background: ${W.bgHover} !important;
  border-color: ${W.borderMd} !important;
}
.v3-incident-row:hover {
  background: ${W.bgHover} !important;
}
.v3-new-badge {
  animation: v3Blink 1.5s ease-in-out infinite;
}

/* Leaflet light mode */
.leaflet-popup-content-wrapper {
  background: ${W.bgCard} !important;
  border: 1px solid ${W.borderMd} !important;
  border-radius: 10px !important;
  box-shadow: 0 8px 24px rgba(26,35,50,0.12) !important;
  font-family: 'Inter', sans-serif !important;
  color: ${W.textPrimary} !important;
}
.leaflet-popup-content {
  margin: 14px 18px !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
  color: ${W.textPrimary} !important;
}
.leaflet-popup-tip {
  background: ${W.bgCard} !important;
}
.leaflet-popup-close-button {
  color: ${W.textMuted} !important;
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function isDismissalWindow(): boolean {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  return totalMin >= 870 && totalMin <= 960; // 14:30–16:00
}

function dirFromCampus(cLat: number, cLng: number, iLat: number, iLng: number, dist: number): string {
  const b = bearing(cLat, cLng, iLat, iLng);
  return `${dist.toFixed(2)} mi ${compassLabel(b)}`;
}

function getThreatTrajectory(incidents: WatchIncident[], cLat: number, cLng: number): 'rising' | 'falling' | 'stable' {
  const now = Date.now();
  const recent = incidents.filter(i => {
    const ts = new Date(i.timestamp).getTime();
    return (now - ts) < 3 * 3600000 && haversine(cLat, cLng, i.lat, i.lng) <= 1.0;
  }).length;
  const earlier = incidents.filter(i => {
    const ts = new Date(i.timestamp).getTime();
    return (now - ts) >= 3 * 3600000 && (now - ts) < 6 * 3600000 && haversine(cLat, cLng, i.lat, i.lng) <= 1.0;
  }).length;
  if (recent > earlier + 1) return 'rising';
  if (recent < earlier - 1) return 'falling';
  return 'stable';
}

function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch { /* Audio not available */ }
}

async function sendSMSAlert(message: string): Promise<{ success: boolean; error?: string }> {
  const phone = sessionStorage.getItem('slate_demo_phone');
  if (!phone) return { success: false, error: 'No phone configured' };
  try {
    const resp = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message }),
    });
    const data = await resp.json();
    return { success: data.success ?? resp.ok };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function generateIntelligenceNarrative(data: WatchDataState): string {
  const elevated = data.campusThreats.filter(c => c.threatLevel !== 'GREEN');
  const red = data.campusThreats.filter(c => c.threatLevel === 'RED');
  const orange = data.campusThreats.filter(c => c.threatLevel === 'ORANGE');
  const totalIncidents = data.incidents.filter(i => i.ageMinutes <= 360).length;
  const corroborated = data.incidents.filter(i => i.corroboratedBy.length > 0 && i.ageMinutes <= 360).length;
  const confirmed = data.incidents.filter(i => i.confidence === 'CONFIRMED' && i.ageMinutes <= 360).length;
  const dismissal = isDismissalWindow();

  if (data.campusThreats.length === 0) {
    return 'Scanning all sources. Awaiting first data cycle — typically completes within 30 seconds.';
  }

  if (red.length > 0) {
    const redNames = red.map(c => c.campusShort).join(', ');
    const nearest = red[0].nearestIncident;
    let dirStr = '';
    if (nearest && red[0].nearestDistance !== null) {
      dirStr = ` — ${dirFromCampus(red[0].lat, red[0].lng, nearest.lat, nearest.lng, red[0].nearestDistance)}`;
    }
    return `🔴 ALERT: ${redNames} ${red.length === 1 ? 'is' : 'are'} at RED status${dirStr}. ${dismissal ? '⚠ Dismissal window is active — heightened exposure for students departing campus. ' : ''}${totalIncidents} violent incident${totalIncidents !== 1 ? 's' : ''} tracked in the last 6 hours across the network, ${confirmed} CPD-confirmed. Immediate situational awareness recommended.`;
  }

  if (orange.length > 0) {
    const orangeNames = orange.map(c => c.campusShort).join(', ');
    return `⚠ ${orangeNames} ${orange.length === 1 ? 'is' : 'are'} at ELEVATED status. ${totalIncidents} violent incident${totalIncidents !== 1 ? 's' : ''} in the last 6 hours, ${corroborated} corroborated by multiple sources. ${dismissal ? 'Dismissal window active — monitor student departure routes. ' : ''}Monitor for escalation.`;
  }

  if (elevated.length > 0) {
    const elevNames = elevated.map(c => c.campusShort).join(', ');
    return `${elevNames} ${elevated.length === 1 ? 'is' : 'are'} at AMBER — reported activity within 1 mile. ${totalIncidents} violent incident${totalIncidents !== 1 ? 's' : ''} tracked in the last 6 hours, ${confirmed} CPD-confirmed. ${dismissal ? 'Dismissal window active. ' : ''}Situation is being monitored.`;
  }

  const clear = data.campusThreats.filter(c => c.threatLevel === 'GREEN');
  return `All ${clear.length} campuses are GREEN. ${totalIncidents > 0 ? `${totalIncidents} incident${totalIncidents !== 1 ? 's' : ''} tracked in the last 6 hours — none within critical proximity of campuses.` : 'No violent incidents detected near campuses in the last 6 hours.'} ${dismissal ? 'Dismissal window is active — routine monitoring in effect.' : 'Network status: nominal.'}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS CONFIG PANEL
// ═══════════════════════════════════════════════════════════════════════════
function SMSConfigPanel({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState(sessionStorage.getItem('slate_demo_phone') || '');
  const [saved, setSaved] = useState(false);
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: W.bgCard, border: `1px solid ${W.borderMd}`,
        borderRadius: 16, padding: 32, width: 380,
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontFamily: font.body, fontSize: '18px', color: W.textPrimary, marginBottom: 8 }}>
          SMS Alert Configuration
        </div>
        <div style={{ fontSize: '13px', color: W.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
          Enter your mobile number to receive real-time Slate Watch alerts during demo mode.
        </div>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 (312) 555-0100"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: `1px solid ${W.borderMd}`, background: W.bg,
            color: W.textPrimary, fontFamily: font.mono, fontSize: '14px',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={() => {
              const cleaned = phone.replace(/[^+\d]/g, '');
              sessionStorage.setItem('slate_demo_phone', cleaned);
              setSaved(true);
              setTimeout(onClose, 1200);
            }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8,
              background: W.gold, border: 'none', cursor: 'pointer',
              fontFamily: font.body, fontSize: '13px', fontWeight: 600,
              color: '#1A1A2E',
            }}
          >
            {saved ? '✓ Saved' : 'Save & Enable'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${W.border}`,
              cursor: 'pointer', fontFamily: font.body, fontSize: '13px',
              color: W.textMuted,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO INCIDENT FACTORY
// ═══════════════════════════════════════════════════════════════════════════
function createDemoIncident(): WatchIncident {
  const campus = { lat: 41.7797, lng: -87.6448 }; // Englewood
  const lat = campus.lat + (Math.random() - 0.5) * 0.004;
  const lng = campus.lng + (Math.random() - 0.5) * 0.004;
  const dist = haversine(campus.lat, campus.lng, lat, lng);
  return {
    id: `demo_${Date.now()}`,
    crimeType: 'SHOOTING',
    title: 'Report of Person Shot Near 63rd and Halsted',
    description: 'Multiple callers reporting shots fired with one person down. Police and EMS responding.',
    lat, lng,
    timestamp: new Date().toISOString(),
    source: 'CITIZEN',
    confidence: 'REPORTED',
    confidenceScore: 70,
    corroboratedBy: [],
    nearestCampusId: 2,
    distanceToCampus: dist,
    ageMinutes: 0,
    isEstimatedLocation: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED INCIDENTS — always-visible incidents for demo / cold-start
// These appear immediately on the map so pulse rings are visible on load.
// They are injected into the live data stream and age normally.
// ═══════════════════════════════════════════════════════════════════════════
const SEED_INCIDENTS: WatchIncident[] = [
  {
    id: 'seed_001',
    crimeType: 'SHOOTING',
    title: 'Shots Fired — 63rd & Halsted',
    description: 'Multiple callers reporting shots fired. One person down. Police and EMS responding.',
    lat: 41.7791, lng: -87.6441,
    timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
    source: 'CITIZEN',
    confidence: 'CORROBORATED',
    confidenceScore: 85,
    corroboratedBy: ['SCANNER'],
    nearestCampusId: 2,
    distanceToCampus: 0.08,
    ageMinutes: 42,
    isEstimatedLocation: false,
  },
  {
    id: 'seed_002',
    crimeType: 'HOMICIDE',
    title: 'Fatal Shooting — 79th & Cottage Grove',
    description: 'CPD reports one male victim, pronounced at scene. Area canvassed. Investigation ongoing.',
    lat: 41.7503, lng: -87.6068,
    timestamp: new Date(Date.now() - 118 * 60000).toISOString(),
    source: 'CPD',
    confidence: 'CONFIRMED',
    confidenceScore: 97,
    corroboratedBy: ['SCANNER', 'NEWS'],
    nearestCampusId: 6,
    distanceToCampus: 0.31,
    ageMinutes: 118,
    isEstimatedLocation: false,
  },
  {
    id: 'seed_003',
    crimeType: 'SHOOTING',
    title: 'Person Shot — Garfield Park Area',
    description: 'Scanner traffic indicates shots fired on West Side. Victim transported to Stroger Hospital.',
    lat: 41.8748, lng: -87.6912,
    timestamp: new Date(Date.now() - 27 * 60000).toISOString(),
    source: 'SCANNER',
    confidence: 'CORROBORATED',
    confidenceScore: 80,
    corroboratedBy: ['CITIZEN'],
    nearestCampusId: 9,
    distanceToCampus: 0.05,
    ageMinutes: 27,
    isEstimatedLocation: false,
  },
  {
    id: 'seed_004',
    crimeType: 'STABBING',
    title: 'Stabbing — Austin Neighborhood',
    description: 'Citizen report of stabbing incident. Victim conscious and breathing. Police on scene.',
    lat: 41.8882, lng: -87.7688,
    timestamp: new Date(Date.now() - 73 * 60000).toISOString(),
    source: 'CITIZEN',
    confidence: 'REPORTED',
    confidenceScore: 70,
    corroboratedBy: [],
    nearestCampusId: 7,
    distanceToCampus: 0.09,
    ageMinutes: 73,
    isEstimatedLocation: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// WATCH MAP COMPONENT (extracted from CEOView, adapted for dark mode)
// ═══════════════════════════════════════════════════════════════════════════
interface WatchMapProps {
  campusThreats: WatchDataState['campusThreats'];
  incidents: WatchIncident[];
  selectedCampus: number | null;
  onSelectCampus: (id: number | null) => void;
  onSelectIncident: (inc: WatchIncident) => void;
  selectedIncidentId?: string | null;
  newIncidentIds: Set<string>;
  demoIncident: WatchIncident | null;
  showGangBoundaries: boolean;
  contagionZones?: ContagionZone[];
  showContagionRings?: boolean;
  showSafetyPerimeters?: boolean;
}

function WatchMap({
  campusThreats, incidents, selectedCampus,
  onSelectCampus, onSelectIncident, selectedIncidentId,
  newIncidentIds,
  demoIncident, showGangBoundaries,
  contagionZones = [], showContagionRings = true, showSafetyPerimeters = true,
}: WatchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const gangLayerRef = useRef<L.LayerGroup | null>(null);
  const contagionRingLayerRef = useRef<L.LayerGroup | null>(null);
  const safetyPerimeterLayerRef = useRef<L.LayerGroup | null>(null);
  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [41.82, -87.67],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const lg = L.layerGroup().addTo(map);
    layerGroupRef.current = lg;
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Pan to selected incident when it changes
  useEffect(() => {
    if (!selectedIncidentId || !mapInstanceRef.current) return;
    const allInc = demoIncident ? [demoIncident, ...incidents] : incidents;
    const inc = allInc.find(i => i.id === selectedIncidentId);
    if (inc) {
      mapInstanceRef.current.setView([inc.lat, inc.lng], Math.max(mapInstanceRef.current.getZoom(), 14), { animate: true });
    }
  }, [selectedIncidentId, incidents, demoIncident]);

  // Pan to selected campus when it changes (e.g. principal view campus switch)
  useEffect(() => {
    if (!selectedCampus || !mapInstanceRef.current) return;
    const campus = campusThreats.find(c => c.campusId === selectedCampus);
    if (campus) {
      mapInstanceRef.current.setView([campus.lat, campus.lng], 14, { animate: true });
    }
  }, [selectedCampus, campusThreats]);

  // Gang boundaries
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (gangLayerRef.current) {
      gangLayerRef.current.remove();
      gangLayerRef.current = null;
    }
    if (showGangBoundaries) {
      const gl = createGangBoundaryLayer();
      gl.addTo(map);
      gangLayerRef.current = gl;
    }
  }, [showGangBoundaries]);

  // Contagion rings — animated Papachristos decay zones
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (contagionRingLayerRef.current) {
      contagionRingLayerRef.current.remove();
      contagionRingLayerRef.current = null;
    }
    if (!showContagionRings || contagionZones.length === 0) return;
    const cl = L.layerGroup().addTo(map);
    contagionRingLayerRef.current = cl;
    for (const zone of contagionZones) {
      const phaseColor = zone.phase === 'ACUTE' ? '#E5484D' : zone.phase === 'ACTIVE' ? '#E07020' : '#F59E0B';
      const radiusMiles = zone.phase === 'ACUTE' ? 0.35 : zone.phase === 'ACTIVE' ? 0.7 : 1.1;
      const radiusMeters = radiusMiles * 1609.34;
      const opacity = zone.phase === 'ACUTE' ? 0.22 : zone.phase === 'ACTIVE' ? 0.14 : 0.09;
      // Outer ring
      L.circle([zone.lat, zone.lng], {
        radius: radiusMeters,
        color: phaseColor,
        weight: zone.phase === 'ACUTE' ? 2 : 1.5,
        opacity: zone.phase === 'ACUTE' ? 0.7 : 0.5,
        fillColor: phaseColor,
        fillOpacity: opacity,
        dashArray: zone.phase === 'WATCH' ? '4,6' : undefined,
      }).addTo(cl).bindPopup(`
        <div style="min-width:200px;">
          <div style="font-size:11px;font-weight:700;color:${phaseColor};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">
            ${zone.phase} CONTAGION ZONE
          </div>
          <div style="font-size:13px;font-weight:500;color:#0F1728;margin-bottom:6px;">${zone.homicideAddress || 'Homicide location'}</div>
          <div style="font-size:11px;color:#7A8699;">
            Risk radius: ${radiusMiles} mi · Decay: ${Math.round((1 - zone.decayFactor) * 100)}% elapsed
          </div>
          ${zone.retWin ? '<div style="font-size:11px;color:#E5484D;font-weight:600;margin-top:4px;">⚠ RETALIATION WINDOW ACTIVE</div>' : ''}
        </div>
      `, { maxWidth: 280 });
      // Retaliation window pulse ring (inner)
      if (zone.retWin) {
        L.circle([zone.lat, zone.lng], {
          radius: radiusMeters * 0.4,
          color: '#E5484D',
          weight: 1,
          opacity: 0.6,
          fillColor: '#E5484D',
          fillOpacity: 0.08,
          dashArray: '2,4',
        }).addTo(cl);
      }
    }
  }, [contagionZones, showContagionRings]);

  // Safety perimeters — 0.25mi campus radius
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (safetyPerimeterLayerRef.current) {
      safetyPerimeterLayerRef.current.remove();
      safetyPerimeterLayerRef.current = null;
    }
    if (!showSafetyPerimeters) return;
    const pl = L.layerGroup().addTo(map);
    safetyPerimeterLayerRef.current = pl;
    for (const ct of campusThreats) {
      const cfg = { GREEN: '#17B26A', AMBER: '#F59E0B', ORANGE: '#E07020', RED: '#E5484D' };
      const color = cfg[ct.threatLevel] || '#17B26A';
      const opacity = ct.threatLevel === 'RED' ? 0.12 : ct.threatLevel === 'ORANGE' ? 0.08 : 0.05;
      L.circle([ct.lat, ct.lng], {
        radius: 402, // 0.25mi in meters
        color,
        weight: 1,
        opacity: 0.4,
        fillColor: color,
        fillOpacity: opacity,
        dashArray: '3,5',
        interactive: false,
      }).addTo(pl);
    }
  }, [campusThreats, showSafetyPerimeters]);

  // Render markers
  useEffect(() => {
    const lg = layerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!lg || !map) return;
    lg.clearLayers();

    const allIncidents = demoIncident ? [demoIncident, ...incidents] : incidents;

    // Campus markers
    const anyCampusSelected = selectedCampus !== null;
    for (const ct of campusThreats) {
      const cfg = W.threat[ct.threatLevel];
      const isSelected = ct.campusId === selectedCampus;
      // Dim non-selected campuses when one is selected — creates visual hierarchy
      const campusOpacity = anyCampusSelected && !isSelected ? 0.35 : 1.0;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${isSelected ? 44 : 36}px;height:${isSelected ? 44 : 36}px;
          border-radius:50%;
          background:${cfg.bg};
          border:${isSelected ? '2.5px' : '2px'} solid ${cfg.color};
          display:flex;align-items:center;justify-content:center;
          font-family:'IBM Plex Sans',sans-serif;
          font-size:9px;font-weight:600;
          color:${cfg.color};
          text-align:center;
          box-shadow:0 0 ${ct.threatLevel === 'RED' ? '16px' : '8px'} ${cfg.color}40;
          ${ct.threatLevel === 'RED' ? 'animation:v3PulseRed 2s ease-in-out infinite;' : ''}
          cursor:pointer;
          line-height:1.1;
          padding:2px;
          opacity:${campusOpacity};
          transition:opacity 0.3s ease;
        ">${ct.campusShort.split(' ')[0]}</div>`,
        iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
        iconAnchor: [isSelected ? 22 : 18, isSelected ? 22 : 18],
      });
      const m = L.marker([ct.lat, ct.lng], { icon }).addTo(lg);
      m.bindPopup(`
        <div style="min-width:200px;">
          <div style="font-size:11px;font-weight:600;color:${cfg.color};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${cfg.label}</div>
          <div style="font-size:15px;font-weight:500;color:${W.textPrimary};margin-bottom:6px;">${ct.campusName}</div>
          <div style="font-size:12px;color:${W.textMuted};">${ct.incidentCount} incident${ct.incidentCount !== 1 ? 's' : ''} within 1 mi</div>
          ${ct.nearestDistance !== null ? `<div style="font-size:12px;color:${W.textMuted};margin-top:2px;">Nearest: ${ct.nearestDistance.toFixed(2)} mi</div>` : ''}
        </div>
      `, { maxWidth: 280 });
      m.on('click', () => onSelectCampus(ct.campusId));
    }

    // Incident markers
    const now = Date.now();
    const clusters: Map<string, WatchIncident[]> = new Map();
    for (const inc of allIncidents) {
      const key = `${inc.lat.toFixed(3)}_${inc.lng.toFixed(3)}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(inc);
    }

    for (const [, group] of clusters) {
      const inc = group[0];
      const ageH = (now - new Date(inc.timestamp).getTime()) / 3600000;
      const decayedOpacity = Math.max(0.25, 1 - (ageH / 24) * 0.75);
      const isNew = newIncidentIds.has(inc.id);
      const isDemo = inc.id.startsWith('demo_');
      const r = inc.crimeType === 'HOMICIDE' ? 10 :
                inc.crimeType === 'SHOOTING' ? 8 :
                inc.crimeType === 'SHOTS_FIRED' ? 7 : 6;

      const fillColor = isDemo ? W.red :
                        inc.crimeType === 'HOMICIDE' ? '#8B0000' :
                        inc.crimeType === 'SHOOTING' ? W.red :
                        inc.crimeType === 'SHOTS_FIRED' ? W.amber :
                        inc.crimeType === 'SEXUAL_ASSAULT' ? '#9B2C8C' :
                        inc.crimeType === 'STABBING' ? '#E07020' : W.amber;

      const nearestCampus = campusThreats.find(c => c.campusId === inc.nearestCampusId);
      const dirStr = nearestCampus && inc.distanceToCampus !== null
        ? dirFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
        : '';

      if (group.length > 1) {
        const clusterIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${fillColor};
            border:2px solid rgba(255,255,255,0.6);
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:700;color:#fff;
            opacity:${decayedOpacity};
            ${isNew ? 'animation:v3PulseRed 1s ease-in-out infinite;' : ''}
          ">${group.length}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const m = L.marker([inc.lat, inc.lng], { icon: clusterIcon }).addTo(lg);
        m.bindPopup(`
          <div style="min-width:240px;max-width:300px;">
            <div style="font-size:11px;font-weight:600;color:${fillColor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${group.length} INCIDENTS IN THIS AREA</div>
            ${group.map(mem => `
              <div style="padding:5px 0;border-bottom:1px solid ${W.border};">
                <div style="font-size:13px;font-weight:500;color:${W.textPrimary};">${mem.title}</div>
                <div style="font-size:11px;color:${W.textMuted};">${fmtAgo(mem.timestamp)} · ${mem.source}</div>
              </div>
            `).join('')}
          </div>
        `, { maxWidth: 320 });
        m.on('click', () => onSelectIncident(inc));
      } else {
        const isSelected = selectedIncidentId === inc.id;
        // Hit-area size must match the ring size so clicks register anywhere on the ring
        const hitSize = inc.crimeType === 'HOMICIDE' ? 64 : inc.crimeType === 'SHOOTING' ? 52 : 40;
        const pulseIcon = L.divIcon({
          className: '',
          html: isSelected
            ? getPulseRingHtml(inc.crimeType, inc.ageMinutes, true, true)
            : getPulseRingHtml(inc.crimeType, inc.ageMinutes, isNew),
          // Give the icon a real bounding box so Leaflet registers pointer events
          iconSize: [hitSize, hitSize],
          iconAnchor: [hitSize / 2, hitSize / 2],
        });
        const marker = L.marker([inc.lat, inc.lng], { icon: pulseIcon, zIndexOffset: isSelected ? 1000 : 0 }).addTo(lg);
        marker.on('click', () => onSelectIncident(inc));
      }
    }

    // Dismissal window overlay
    if (isDismissalWindow()) {
      const dismissalIcon = L.divIcon({
        className: '',
        html: `<div style="
          background:rgba(224,82,82,0.15);border:1px solid rgba(224,82,82,0.35);
          border-radius:6px;padding:4px 10px;white-space:nowrap;
          font-size:11px;font-weight:600;color:${W.red};
          font-family:'IBM Plex Sans',sans-serif;letter-spacing:0.05em;
        ">⚠ DISMISSAL WINDOW</div>`,
        iconSize: [160, 24],
        iconAnchor: [80, 12],
      });
      L.marker([41.92, -87.67], { icon: dismissalIcon, interactive: false, zIndexOffset: 2000 }).addTo(lg);
    }
  }, [campusThreats, incidents, onSelectCampus, onSelectIncident, newIncidentIds, demoIncident, selectedIncidentId, selectedCampus]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT I: BRIEFING TAB
// ═══════════════════════════════════════════════════════════════════════════
interface BriefingTabProps {
  data: WatchDataState;
  demoIncident: WatchIncident | null;
  contagionZones: ContagionZone[];
}

function BriefingTab({ data, demoIncident, contagionZones }: BriefingTabProps) {
  const narrative = generateIntelligenceNarrative(data);
  const net = data.networkStatus;
  const dismissalActive = isDismissalWindow();
  const [expandedIncId, setExpandedIncId] = useState<string | null>(null);
  const [incAiText, setIncAiText] = useState<Record<string, string>>({});
  const [incAiLoading, setIncAiLoading] = useState<Record<string, boolean>>({});
  const [selectedCampusId, setSelectedCampusId] = useState<number | null>(null);

  const handleIncidentAi = async (e: React.MouseEvent, inc: WatchIncident) => {
    e.stopPropagation();
    if (incAiText[inc.id] || incAiLoading[inc.id]) return;
    setIncAiLoading(prev => ({ ...prev, [inc.id]: true }));
    const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: 'You are a school safety intelligence analyst. Provide a concise 2-3 sentence analysis of what this incident means for nearby school campuses. Focus on: (1) immediate safety implications, (2) whether staff/students should be notified, (3) one specific action recommendation. Be direct and actionable.',
          messages: [{ role: 'user', content: `Incident: ${inc.crimeType}${inc.title ? ' — ' + inc.title : ''}. Confidence: ${inc.confidence} (${inc.confidenceScore}%). Time: ${inc.ageMinutes < 60 ? inc.ageMinutes + ' minutes ago' : Math.round(inc.ageMinutes / 60) + ' hours ago'}. Nearest campus: ${nearestCampus?.campusShort ?? 'Unknown'} (${inc.distanceToCampus?.toFixed(1) ?? '?'} miles away). What does this mean for campus safety?` }],
        }),
      });
      const data2 = await res.json();
      setIncAiText(prev => ({ ...prev, [inc.id]: data2?.content?.[0]?.text || 'Analysis unavailable.' }));
    } catch {
      setIncAiText(prev => ({ ...prev, [inc.id]: 'Unable to generate analysis at this time.' }));
    } finally {
      setIncAiLoading(prev => ({ ...prev, [inc.id]: false }));
    }
  };

  const sortedThreats = useMemo(() => {
    const order: Record<ThreatLevel, number> = { RED: 0, ORANGE: 1, AMBER: 2, GREEN: 3 };
    return [...data.campusThreats].sort((a, b) => order[a.threatLevel] - order[b.threatLevel]);
  }, [data.campusThreats]);

  const criticalIncidents = useMemo(() => {
    const all = demoIncident
      ? [demoIncident, ...data.incidents]
      : data.incidents;
    return all
      .filter(i => (i.crimeType === 'HOMICIDE' || i.crimeType === 'SHOOTING') && i.ageMinutes <= 1440)
      .filter(i => selectedCampusId == null || i.nearestCampusId === selectedCampusId)
      .slice(0, 12);
  }, [data.incidents, demoIncident, selectedCampusId]);

  const activeContagionZones = contagionZones.filter(z => z.phase === 'ACUTE' || z.phase === 'ACTIVE').length;

  // Status bar values
  const totalIncidents = data.incidents.filter(i => i.ageMinutes <= 360).length + (demoIncident ? 1 : 0);
  const elevatedCount = data.campusThreats.filter(c => c.threatLevel !== 'GREEN').length;
  const overallThreat = net?.overallThreat ?? 'GREEN';
  const overallCfg = W.threat[overallThreat];

  return (
    <div style={{
      flex: 1, overflow: 'auto', padding: '24px 32px',
      display: 'flex', flexDirection: 'column', gap: 24,
      animation: 'v3FadeIn 0.3s ease-out',
    }}>
      {/* STATUS BAR */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }}>
        {[
          {
            label: 'Network Status',
            value: overallCfg.label.toUpperCase(),
            color: overallCfg.color,
            bg: overallCfg.bg,
            sub: `${CAMPUSES.length} campuses monitored`,
          },
          {
            label: 'Elevated Campuses',
            value: String(elevatedCount),
            color: elevatedCount > 0 ? W.amber : W.green,
            bg: elevatedCount > 0 ? W.amberDim : W.greenDim,
            sub: `of ${CAMPUSES.length} total`,
          },
          {
            label: 'Violent Incidents 6h',
            value: String(totalIncidents),
            color: totalIncidents > 0 ? W.red : W.green,
            bg: totalIncidents > 0 ? W.redDim : W.greenDim,
            sub: 'shootings, homicides, weapons',
          },
          {
            label: 'Active Contagion Zones',
            value: String(activeContagionZones),
            color: activeContagionZones > 0 ? W.amber : W.green,
            bg: activeContagionZones > 0 ? W.amberDim : W.greenDim,
            sub: 'ACUTE + ACTIVE phases',
          },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: kpi.bg,
            border: `1px solid ${kpi.color}30`,
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{
              fontFamily: font.body, fontSize: '11px',
              color: W.textMuted, marginBottom: 8, fontWeight: 500,
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontFamily: font.body, fontSize: '28px', fontWeight: 300,
              color: kpi.color, lineHeight: 1, marginBottom: 6,
            }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '11px', color: W.textDim }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* INTELLIGENCE NARRATIVE */}
      <div style={{
        background: dismissalActive ? 'rgba(224, 82, 82, 0.06)' : W.bgCard,
        border: `1px solid ${dismissalActive ? W.redBorder : W.border}`,
        borderRadius: 12, padding: '20px 24px',
      }}>
        <div style={{
          fontFamily: font.body, fontSize: '11px', fontWeight: 600,
          color: W.textMuted, marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Intelligence Briefing</span>
          <span style={{ color: W.textDim, fontSize: '10px' }}>
            {data.lastRefresh
              ? `${fmtAgo(data.lastRefresh.toISOString())} · Auto 2m`
              : 'Loading...'}
          </span>
        </div>
        <div style={{
          fontFamily: font.body, fontSize: '15px', color: W.textPrimary,
          lineHeight: 1.7, letterSpacing: '0.01em',
        }}>
          {narrative}
        </div>
      </div>

      {/* CAMPUS MATRIX */}
      <div>
        <div style={{
          fontFamily: font.body, fontSize: '12px', fontWeight: 600,
          color: W.textMuted, marginBottom: 14,
        }}>
          Campus Status Matrix
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10,
        }}>
          {sortedThreats.map(ct => {
            const cfg = W.threat[ct.threatLevel];
            const traj = getThreatTrajectory(data.incidents, ct.lat, ct.lng);
            const trajSymbol = traj === 'rising' ? '↑' : traj === 'falling' ? '↓' : '—';
            const trajColor = traj === 'rising' ? W.red : traj === 'falling' ? W.green : W.textDim;
            return (
              <div
                key={ct.campusId}
                className="v3-campus-card"
                onClick={() => setSelectedCampusId(selectedCampusId === ct.campusId ? null : ct.campusId)}
                style={{
                  background: selectedCampusId === ct.campusId ? W.bgSurface : W.bgCard,
                  border: `1px solid ${selectedCampusId === ct.campusId ? W.goldBorder : W.border}`,
                  borderTop: `3px solid ${cfg.color}`,
                  borderRadius: 10, padding: '12px 14px',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  fontSize: '11px', fontWeight: 600, color: W.textSecondary,
                  marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {ct.campusShort}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cfg.color,
                    boxShadow: ct.threatLevel === 'RED' ? `0 0 6px ${cfg.color}` : 'none',
                  }} />
                  <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{
                  marginTop: 6, display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '10px', color: W.textDim }}>
                    {ct.incidentCount} inc
                  </span>
                  <span style={{
                    fontSize: '13px', fontWeight: 700, color: trajColor,
                    title: `Trend: ${traj}`,
                  }}>
                    {trajSymbol}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CRITICAL INCIDENTS */}
      <div>
        <div style={{
          fontFamily: font.body, fontSize: '12px', fontWeight: 600,
          color: W.textMuted, marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Critical Incidents — Last 24 Hours{selectedCampusId ? ` · ${sortedThreats.find(c => c.campusId === selectedCampusId)?.campusShort ?? ''}` : ''}</span>
          <span style={{ color: W.textDim, fontSize: '11px', fontWeight: 400 }}>
            {selectedCampusId ? <span onClick={() => setSelectedCampusId(null)} style={{ cursor: 'pointer', color: W.gold }}>Clear filter ×</span> : 'Tap campus to filter · Tap card to expand'}
          </span>
        </div>
        {criticalIncidents.length === 0 ? (
          <div style={{
            background: W.bgCard, border: `1px solid ${W.border}`,
            borderRadius: 10, padding: '20px 24px', textAlign: 'center',
            color: W.textMuted, fontSize: '13px',
          }}>
            No shootings or homicides detected near campuses in the last 24 hours.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {criticalIncidents.map(inc => {
              const isDemo = inc.id.startsWith('demo_');
              const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
              const dirStr = nearestCampus && inc.distanceToCampus !== null
                ? dirFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
                : null;
              const incColor = inc.crimeType === 'HOMICIDE' ? '#FF6B6B' : W.red;
              const isExpanded = expandedIncId === inc.id;
              const aiText = incAiText[inc.id];
              const aiLoading = incAiLoading[inc.id];
              return (
                <div
                  key={inc.id}
                  style={{
                    background: isDemo ? 'rgba(224, 82, 82, 0.08)' : W.bgCard,
                    border: `1px solid ${isDemo ? W.redBorder : isExpanded ? W.goldBorder : W.border}`,
                    borderLeft: `4px solid ${incColor}`,
                    borderRadius: 10,
                    animation: isDemo ? 'v3FadeIn 0.4s ease-out' : undefined,
                    overflow: 'hidden',
                  }}
                >
                  {/* Clickable header */}
                  <div
                    className="v3-incident-row"
                    onClick={() => setExpandedIncId(isExpanded ? null : inc.id)}
                    style={{
                      padding: '14px 18px',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontFamily: font.body, fontSize: '11px', fontWeight: 700,
                          color: incColor,
                        }}>
                          {VIOLENT_CRIME_LABELS[inc.crimeType]}
                          {isDemo && ' — DEMO'}
                        </span>
                        <span style={{
                          fontFamily: font.mono, fontSize: '10px',
                          color: inc.confidence === 'CONFIRMED' ? W.green :
                                 inc.confidence === 'CORROBORATED' ? W.blue : W.amber,
                          fontWeight: 600,
                        }}>
                          {inc.confidence} {inc.confidenceScore}%
                        </span>
                        {inc.corroboratedBy.length > 0 && (
                          <span style={{ fontSize: '10px', color: W.green, fontFamily: font.mono }}>
                            +{inc.corroboratedBy.join(', ')}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '14px', fontWeight: 500, color: W.textPrimary,
                        lineHeight: 1.4, marginBottom: 6,
                      }}>
                        {inc.title}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {dirStr && nearestCampus && (
                          <span style={{ fontSize: '11px', color: W.textMuted, fontFamily: font.mono }}>
                            {dirStr} of {nearestCampus.campusShort}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: W.textDim, fontFamily: font.mono }}>
                          {inc.source}
                        </span>
                        {inc.isEstimatedLocation && (
                          <span style={{ fontSize: '11px', color: W.amber, fontFamily: font.mono }}>
                            EST. LOCATION
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ fontFamily: font.mono, fontSize: '11px', color: W.textDim, whiteSpace: 'nowrap' }}>
                        {fmtAgo(inc.timestamp)}
                      </div>
                      <span style={{ fontSize: '10px', color: W.textDim }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 18px 16px', borderTop: `1px solid ${W.border}`,
                      background: W.bgSurface,
                    }}>
                      {/* Detail grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '12px 0 12px' }}>
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.06em', marginBottom: 3 }}>NEAREST CAMPUS</div>
                          <div style={{ fontSize: '12px', color: W.textPrimary, fontFamily: font.body }}>
                            {nearestCampus?.campusShort ?? 'Unknown'}{inc.distanceToCampus != null ? ` — ${inc.distanceToCampus.toFixed(2)} mi` : ''}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.06em', marginBottom: 3 }}>SOURCES</div>
                          <div style={{ fontSize: '12px', color: W.textPrimary, fontFamily: font.body }}>
                            {[inc.source, ...inc.corroboratedBy].filter(Boolean).join(', ')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.06em', marginBottom: 3 }}>CONFIDENCE</div>
                          <div style={{ fontSize: '12px', fontFamily: font.body,
                            color: inc.confidence === 'CONFIRMED' ? W.green : inc.confidence === 'CORROBORATED' ? W.blue : W.amber,
                            fontWeight: 600,
                          }}>
                            {inc.confidence} — {inc.confidenceScore}%
                          </div>
                        </div>
                      </div>
                      {/* AI button */}
                      {!aiText && !aiLoading && (
                        <button
                          onClick={(e) => handleIncidentAi(e, inc)}
                          style={{
                            padding: '6px 14px', borderRadius: 6,
                            background: W.gold, color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 700,
                            fontFamily: font.body, letterSpacing: '0.04em',
                          }}
                        >
                          ✨ What does this mean?
                        </button>
                      )}
                      {aiLoading && (
                        <div style={{ fontSize: '11px', color: W.textMuted, fontStyle: 'italic', padding: '4px 0' }}>Analyzing…</div>
                      )}
                      {aiText && (
                        <div style={{
                          fontSize: '13px', color: W.textSecondary, lineHeight: 1.65,
                          borderTop: `1px solid ${W.border}`, paddingTop: 10, marginTop: 4,
                        }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: W.gold, letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>SLATE ANALYSIS</span>
                          {aiText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT II: MAP TAB
// ═══════════════════════════════════════════════════════════════════════════
interface MapTabProps {
  data: WatchDataState;
  demoIncident: WatchIncident | null;
  demoPhase: number;
  newIncidentIds: Set<string>;
  showGangBoundaries: boolean;
  onToggleGangBoundaries: () => void;
  selectedIncident: WatchIncident | null;
  onSelectIncident: (inc: WatchIncident) => void;
  onSelectCampus: (id: number | null) => void;
  selectedCampus: number | null;
  contagionZones?: ContagionZone[];
  role?: string;
  principalCampusId?: number | null;
}

function MapTab({
  data, demoIncident, demoPhase, newIncidentIds,
  showGangBoundaries, onToggleGangBoundaries,
  selectedIncident, onSelectIncident, onSelectCampus, selectedCampus,
  contagionZones = [],
  role = 'ceo',
  principalCampusId = null,
}: MapTabProps) {
  const isPrincipal = role === 'principal';
  const [showContagionRings, setShowContagionRings] = useState(true);
  const [showSafetyPerimeters, setShowSafetyPerimeters] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [replayMinutesAgo, setReplayMinutesAgo] = useState<number | null>(null);
  const feedListRef = useRef<HTMLDivElement>(null);

  // In Principal View, filter the feed to only incidents near the selected campus
  const principalCampus = isPrincipal && principalCampusId
    ? data.campusThreats.find(c => c.campusId === principalCampusId) ?? null
    : null;

  const feedIncidents = useMemo(() => {
    let real = data.incidents.filter(i => i.ageMinutes <= 360);
    if (isPrincipal && principalCampusId) {
      // Show incidents within 1 mile of the principal's campus
      real = real.filter(i => i.nearestCampusId === principalCampusId ||
        (i.distanceToCampus !== null && i.distanceToCampus <= 1.0 && i.nearestCampusId === principalCampusId));
    }
    real = real.slice(0, 40);
    return demoIncident ? [demoIncident, ...real] : real;
  }, [data.incidents, demoIncident, isPrincipal, principalCampusId]);

  // When selectedIncident changes (e.g. from map ring click), scroll the feed row into view
  useEffect(() => {
    if (!selectedIncident || !feedListRef.current) return;
    const el = feedListRef.current.querySelector(`[data-incident-id="${selectedIncident.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIncident]);
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* MAP — 70% */}
      <div style={{ flex: '0 0 70%', position: 'relative' }}>
        <WatchMap
          campusThreats={data.campusThreats}
          incidents={
            isPrincipal && principalCampusId
              ? data.incidents.filter(i => i.ageMinutes <= 360 && i.nearestCampusId === principalCampusId)
              : data.incidents.filter(i => i.ageMinutes <= 360)
          }
          selectedCampus={isPrincipal && principalCampusId ? principalCampusId : selectedCampus}
          onSelectCampus={onSelectCampus}
          onSelectIncident={onSelectIncident}
          selectedIncidentId={selectedIncident?.id ?? null}
          newIncidentIds={newIncidentIds}
          demoIncident={demoIncident}
          showGangBoundaries={showGangBoundaries}
          contagionZones={contagionZones}
          showContagionRings={showContagionRings}
          showSafetyPerimeters={showSafetyPerimeters}
        />

        {/* Map overlays */}
        {/* Status pill — Network Status (CEO) or Campus Status (Principal) */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 1000,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
          borderRadius: 10, padding: '10px 16px',
          border: `1px solid ${W.border}`,
          boxShadow: '0 4px 16px rgba(26,35,50,0.12)',
        }}>
          {isPrincipal && principalCampus ? (() => {
            const cfg = W.threat[principalCampus.threatLevel];
            return (
              <>
                <div style={{ fontFamily: font.body, fontSize: '10px', fontWeight: 600, color: W.textMuted, marginBottom: 2 }}>
                  {principalCampus.campusShort}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: '9px', color: W.textDim, marginBottom: 4 }}>Your Campus</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                  <span style={{ fontFamily: font.mono, fontSize: '12px', fontWeight: 600, color: cfg.color }}>
                    {principalCampus.threatLevel}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: '11px', color: W.textMuted }}>
                  {feedIncidents.length} incident{feedIncidents.length !== 1 ? 's' : ''} nearby
                </div>
              </>
            );
          })() : (
            <>
              <div style={{ fontFamily: font.body, fontSize: '10px', fontWeight: 600, color: W.textMuted, marginBottom: 4 }}>
                Network Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: data.networkStatus ? W.threat[data.networkStatus.overallThreat].color : W.green,
                  boxShadow: `0 0 6px ${data.networkStatus ? W.threat[data.networkStatus.overallThreat].color : W.green}`,
                }} />
                <span style={{ fontFamily: font.mono, fontSize: '12px', fontWeight: 600, color: data.networkStatus ? W.threat[data.networkStatus.overallThreat].color : W.green }}>
                  {data.networkStatus ? THREAT_CONFIG[data.networkStatus.overallThreat].label.toUpperCase() : 'SCANNING'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Demo phase indicator */}
        {demoIncident && (
          <div style={{
            position: 'absolute', top: 16, left: '50%',
            transform: 'translateX(-50%)', zIndex: 1000,
            background: 'rgba(224, 82, 82, 0.92)', backdropFilter: 'blur(12px)',
            borderRadius: 10, padding: '8px 20px',
            border: `1px solid ${W.redBorder}`,
            boxShadow: '0 4px 16px rgba(224,82,82,0.4)',
            animation: 'v3FadeIn 0.3s ease-out',
          }}>
            <div style={{
              fontFamily: font.mono, fontSize: '11px', fontWeight: 600,
              color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {demoPhase === 1 ? '🔴 DEMO: Incident Reported — Monitoring' :
               demoPhase === 2 ? '🟡 DEMO: Scanner Corroboration — 85% Confidence' :
               demoPhase === 3 ? '🟢 DEMO: CPD Confirmed — 95% Confidence' :
               '◎ DEMO MODE ACTIVE'}
            </div>
          </div>
        )}

        {/* Layer Control Panel */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
          <button
            onClick={() => setShowLayerPanel(p => !p)}
            style={{
              background: showLayerPanel ? 'rgba(201,165,78,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${showLayerPanel ? W.gold : W.border}`,
              borderRadius: 8, padding: '8px 14px',
              cursor: 'pointer', fontSize: '11px', fontWeight: 600,
              fontFamily: font.body,
              color: showLayerPanel ? '#1A1A2E' : W.textSecondary,
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>⊞</span> LAYERS
          </button>
          {showLayerPanel && (
            <div style={{
              position: 'absolute', top: 44, right: 0,
              background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
              border: `1px solid ${W.border}`, borderRadius: 10,
              padding: '12px 0', minWidth: 220,
              boxShadow: '0 8px 24px rgba(26,35,50,0.14)',
              animation: 'v3FadeIn 0.2s ease-out',
            }}>
              <div style={{ padding: '0 14px 8px', fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.1em' }}>MAP LAYERS</div>
              {[
                { key: 'contagion', label: 'Contagion Rings', sub: 'Papachristos decay zones', active: showContagionRings, color: '#E07020', toggle: () => setShowContagionRings(v => !v) },
                { key: 'perimeters', label: 'Safety Perimeters', sub: '0.25mi campus radius', active: showSafetyPerimeters, color: W.blue, toggle: () => setShowSafetyPerimeters(v => !v) },
                { key: 'gang', label: 'Gang Territories', sub: 'CPD 2024 boundaries', active: showGangBoundaries, color: '#2B5F8A', toggle: onToggleGangBoundaries },
              ].map(layer => (
                <div
                  key={layer.key}
                  onClick={layer.toggle}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 10, transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,35,50,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                    background: layer.active ? layer.color : 'transparent',
                    border: `2px solid ${layer.color}`,
                    transition: 'all 0.15s ease',
                  }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: W.textPrimary }}>{layer.label}</div>
                    <div style={{ fontSize: '10px', color: W.textDim }}>{layer.sub}</div>
                  </div>
                </div>
              ))}
              {/* Contagion legend */}
              {showContagionRings && contagionZones.length > 0 && (
                <div style={{ margin: '8px 14px 0', paddingTop: 8, borderTop: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: W.textDim, letterSpacing: '0.1em', marginBottom: 6 }}>CONTAGION PHASES</div>
                  {[
                    { phase: 'ACUTE',  color: '#E5484D', label: 'Acute (0-72h)',   count: contagionZones.filter(z => z.phase === 'ACUTE').length },
                    { phase: 'ACTIVE', color: '#E07020', label: 'Active (3-14d)',  count: contagionZones.filter(z => z.phase === 'ACTIVE').length },
                    { phase: 'WATCH',  color: '#F59E0B', label: 'Watch (14-30d)', count: contagionZones.filter(z => z.phase === 'WATCH').length },
                  ].map(p => p.count > 0 && (
                    <div key={p.phase} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${p.color}`, background: `${p.color}20` }} />
                      <span style={{ fontSize: '10px', color: W.textSecondary }}>{p.label}</span>
                      <span style={{ fontSize: '10px', color: W.textDim, marginLeft: 'auto' }}>{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── MAP LEGEND (collapsible pill) ───────────────────────── */}
        {(() => {
          const [legendOpen, setLegendOpen] = React.useState(false);
          return (
            <div style={{ position: 'absolute', bottom: 56, left: 16, zIndex: 1000 }}>
              {/* Collapsed pill — always visible */}
              <div
                onClick={() => setLegendOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(11,18,32,0.82)', backdropFilter: 'blur(10px)',
                  borderRadius: 20, padding: '5px 12px 5px 8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', userSelect: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {[{ c: '#E5484D', s: 10 }, { c: '#E07020', s: 8 }, { c: '#F59E0B', s: 7 }].map((r, i) => (
                  <div key={i} style={{ width: r.s, height: r.s, borderRadius: '50%', border: `1.5px solid ${r.c}`, background: `${r.c}30`, flexShrink: 0 }} />
                ))}
                <span style={{ fontFamily: font.mono, fontSize: '10px', color: 'rgba(232,228,220,0.6)', marginLeft: 2 }}>
                  {legendOpen ? 'HIDE' : 'LEGEND'}
                </span>
              </div>

              {/* Expanded panel */}
              {legendOpen && (
                <div style={{
                  position: 'absolute', bottom: 36, left: 0,
                  background: 'rgba(11,18,32,0.92)', backdropFilter: 'blur(14px)',
                  borderRadius: 10, padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  minWidth: 220, animation: 'v3FadeIn 0.15s ease-out',
                }}>
                  <div style={{ fontFamily: font.mono, fontSize: '9px', fontWeight: 700, color: 'rgba(232,228,220,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>How to read this map</div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: font.mono, fontSize: '9px', color: 'rgba(232,228,220,0.4)', letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase' }}>Incident rings — click any ring</div>
                    {[
                      { color: '#E5484D', label: 'Homicide', size: 13 },
                      { color: '#E07020', label: 'Shooting', size: 10 },
                      { color: '#F59E0B', label: 'Shots Fired / Stabbing', size: 8 },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: r.size, height: r.size, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${r.color}`, background: `${r.color}18` }} />
                        <span style={{ fontFamily: font.body, fontSize: '11px', color: 'rgba(232,228,220,0.8)' }}>{r.label}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: '10px', color: 'rgba(232,228,220,0.35)', fontFamily: font.body, marginTop: 2 }}>Bright = recent · faded = older</div>
                  </div>

                  <div style={{ marginBottom: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontFamily: font.mono, fontSize: '9px', color: 'rgba(232,228,220,0.4)', letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase' }}>Campus badges — click any campus</div>
                    {[
                      { color: '#E5484D', label: 'RED — Immediate threat' },
                      { color: '#E07020', label: 'ORANGE — Elevated' },
                      { color: '#17B26A', label: 'GREEN — Clear' },
                    ].map(b => (
                      <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, flexShrink: 0, background: b.color }} />
                        <span style={{ fontFamily: font.body, fontSize: '11px', color: 'rgba(232,228,220,0.8)' }}>{b.label}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontFamily: font.mono, fontSize: '9px', color: 'rgba(232,228,220,0.4)', letterSpacing: '0.08em', marginBottom: 5, textTransform: 'uppercase' }}>Confidence (in feed)</div>
                    {[
                      { color: '#17B26A', label: 'CONFIRMED — CPD (97%)' },
                      { color: '#4F7CFF', label: 'CORROBORATED — 2+ sources (85%)' },
                      { color: '#F59E0B', label: 'REPORTED — 1 source (70%)' },
                    ].map(c => (
                      <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: c.color }} />
                        <span style={{ fontFamily: font.body, fontSize: '11px', color: 'rgba(232,228,220,0.8)' }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Refreshing sweep */}
        {data.isRefreshing && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: '40%',
              background: `linear-gradient(90deg, transparent, ${W.gold}, transparent)`,
              animation: 'v3SweepBar 1.5s ease-in-out infinite',
            }} />
          </div>
        )}
        {/* Temporal Replay Bar */}
        <TemporalReplayBar
          incidents={feedIncidents}
          currentMinutesAgo={replayMinutesAgo}
          onTimeChange={setReplayMinutesAgo}
        />
      </div>

      {/* RIGHT PANEL — 30%: Feed + Rich Incident Detail */}
      <div style={{
        flex: '0 0 30%', display: 'flex', flexDirection: 'column',
        borderLeft: `1px solid ${W.border}`, overflow: 'hidden', position: 'relative',
      }}>

        {/* ── RICH INCIDENT DETAIL PANEL ─────────────────────────────── */}
        {selectedIncident ? (() => {
          const inc = selectedIncident;
          const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
          const dirStr = nearestCampus && inc.distanceToCampus !== null
            ? dirFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
            : null;
          const incColor = inc.crimeType === 'HOMICIDE' ? '#E5484D' :
                           inc.crimeType === 'SHOOTING' ? W.red :
                           inc.crimeType === 'SHOTS_FIRED' ? W.amber :
                           inc.crimeType === 'STABBING' ? '#E07020' :
                           inc.crimeType === 'SEXUAL_ASSAULT' ? '#9B2C8C' : W.textSecondary;
          const confColor = inc.confidence === 'CONFIRMED' ? W.green :
                            inc.confidence === 'CORROBORATED' ? W.blue : W.amber;
          const confBg = inc.confidence === 'CONFIRMED' ? W.greenDim :
                         inc.confidence === 'CORROBORATED' ? W.blueDim : W.amberDim;

          // Build confidence pipeline stages
          const allSources = ['CITIZEN', 'SCANNER', 'NEWS', 'CPD'] as const;
          const activeSources = new Set([inc.source, ...inc.corroboratedBy]);
          const stages = [
            { source: inc.source, level: 'REPORTED', score: 70, active: true },
            ...inc.corroboratedBy.map(s => ({
              source: s,
              level: s === 'CPD' ? 'CONFIRMED' : 'CORROBORATED',
              score: s === 'CPD' ? 97 : 85,
              active: true,
            })),
            ...allSources.filter(s => !activeSources.has(s)).map(s => ({
              source: s, level: 'AWAITING', score: 0, active: false,
            })),
          ];

          // AI reasoning
          const reasons: string[] = [];
          if (nearestCampus) {
            const nearby = nearestCampus.incidents;
            const within025 = nearby.filter(i => i.distanceToCampus !== null && i.distanceToCampus <= 0.25);
            const within05  = nearby.filter(i => i.distanceToCampus !== null && i.distanceToCampus <= 0.5);
            if (within025.length > 0) {
              reasons.push(`CRITICAL: ${within025.length} incident${within025.length > 1 ? 's' : ''} within ¼ mile of ${nearestCampus.campusShort} — immediate campus proximity.`);
            } else if (within05.length > 0) {
              reasons.push(`${within05.length} incident${within05.length > 1 ? 's' : ''} within ½ mile of ${nearestCampus.campusShort} — elevated proximity.`);
            } else if (dirStr) {
              reasons.push(`Incident is ${dirStr} of ${nearestCampus.campusShort}.`);
            }
            const confirmed = nearby.filter(i => i.confidence === 'CONFIRMED').length;
            const corroborated = nearby.filter(i => i.confidence === 'CORROBORATED').length;
            if (confirmed > 0) reasons.push(`${confirmed} CPD-confirmed incident${confirmed > 1 ? 's' : ''} in this area (97% confidence).`);
            if (corroborated > 0) reasons.push(`${corroborated} multi-source corroborated incident${corroborated > 1 ? 's' : ''} (85% confidence).`);
            const trajectory = getThreatTrajectory(data.incidents, nearestCampus.lat, nearestCampus.lng);
            if (trajectory === 'rising') reasons.push('TRAJECTORY: Rising — more activity in the last 3 hours than the previous 3.');
            else if (trajectory === 'falling') reasons.push('TRAJECTORY: Falling — activity decreasing over time.');
            if (isDismissalWindow()) reasons.push('⚠ DISMISSAL WINDOW ACTIVE — heightened risk during student movement.');
            const cfg = THREAT_CONFIG[nearestCampus.threatLevel];
            reasons.push(`ASSESSMENT: ${nearestCampus.threatLevel} — ${cfg.description}`);
          } else {
            reasons.push('Incident detected outside mapped campus radius.');
            if (inc.confidence === 'CONFIRMED') reasons.push('CPD-confirmed incident — high reliability (97%).');
            else if (inc.confidence === 'CORROBORATED') reasons.push('Multi-source corroboration — elevated reliability (85%).');
            else reasons.push('Single-source report — awaiting corroboration (70%).');
          }

          return (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              animation: 'v3SlideIn 0.22s ease-out',
            }}>
              {/* Detail header */}
              <div style={{
                padding: '14px 18px', borderBottom: `1px solid ${W.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{
                    fontFamily: font.body, fontSize: '10px', fontWeight: 700,
                    color: incColor, textTransform: 'uppercase', letterSpacing: '0.08em',
                    marginBottom: 3,
                  }}>
                    {VIOLENT_CRIME_LABELS[inc.crimeType]}
                    {inc.id.startsWith('demo_') && <span style={{ color: W.textDim }}> — DEMO</span>}
                  </div>
                  <div style={{
                    fontSize: '14px', fontWeight: 600, color: W.textPrimary, lineHeight: 1.35,
                  }}>
                    {inc.title}
                  </div>
                </div>
                <button
                  onClick={() => onSelectIncident(null as unknown as WatchIncident)}
                  style={{
                    background: 'none', border: `1px solid ${W.border}`,
                    borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                    color: W.textMuted, fontSize: '14px', flexShrink: 0, marginLeft: 8,
                  }}
                >✕</button>
              </div>

              {/* Detail body — scrollable */}
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>

                {/* Reported time */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                    letterSpacing: '0.07em', marginBottom: 4, fontFamily: font.mono,
                  }}>Reported</div>
                  <div style={{ fontSize: '13px', color: W.textPrimary }}>
                    {new Date(inc.timestamp).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                    <span style={{ color: W.textDim, marginLeft: 8, fontSize: '12px' }}>({fmtAgo(inc.timestamp)})</span>
                  </div>
                </div>

                {/* Confidence pipeline */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                    letterSpacing: '0.07em', marginBottom: 8, fontFamily: font.mono,
                  }}>Confidence Pipeline</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {stages.map((stage, i) => {
                      const sc = stage.level === 'CONFIRMED' ? W.green :
                                 stage.level === 'CORROBORATED' ? W.blue :
                                 stage.level === 'REPORTED' ? W.amber : W.textDim;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            background: stage.active ? `${sc}18` : W.bgSurface,
                            border: `2px solid ${stage.active ? sc : W.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {stage.active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc }} />}
                          </div>
                          <div style={{ flex: 1, fontSize: '11px', fontFamily: font.mono, color: stage.active ? W.textPrimary : W.textDim }}>
                            {stage.source}
                          </div>
                          <div style={{
                            padding: '2px 7px', borderRadius: 4,
                            background: stage.active ? `${sc}12` : W.bgSurface,
                            fontSize: '10px', fontFamily: font.mono, fontWeight: 600,
                            color: stage.active ? sc : W.textDim,
                          }}>
                            {stage.active ? `${stage.level} ${stage.score}%` : 'AWAITING'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: W.bgSurface, overflow: 'hidden' }}>
                      <div style={{
                        width: `${inc.confidenceScore}%`, height: '100%', borderRadius: 3,
                        background: confColor, transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: font.mono, fontWeight: 700, color: confColor, minWidth: 36, textAlign: 'right' }}>
                      {inc.confidenceScore}%
                    </span>
                  </div>
                </div>

                {/* AI Reasoning */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                    letterSpacing: '0.07em', marginBottom: 8, fontFamily: font.mono,
                  }}>AI Assessment</div>
                  <div style={{
                    padding: '10px 12px', background: W.bgSurface, borderRadius: 8,
                    borderLeft: `3px solid ${W.blue}`,
                  }}>
                    {reasons.map((r, i) => (
                      <div key={i} style={{
                        fontSize: '11.5px', lineHeight: 1.55,
                        marginBottom: i < reasons.length - 1 ? 4 : 0,
                        fontWeight: r.startsWith('CRITICAL') || r.startsWith('ASSESSMENT') ? 600 : 400,
                        color: r.startsWith('CRITICAL') ? W.red :
                               r.startsWith('ASSESSMENT') ? W.textPrimary :
                               r.startsWith('⚠') ? W.amber : W.textSecondary,
                      }}>{r}</div>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                    letterSpacing: '0.07em', marginBottom: 4, fontFamily: font.mono,
                  }}>Location</div>
                  <div style={{ fontSize: '13px', color: W.textPrimary }}>
                    {dirStr && nearestCampus ? (
                      <span>
                        <strong style={{ fontWeight: 600 }}>{dirStr}</strong>
                        <span style={{ color: W.textMuted }}> of {nearestCampus.campusShort}</span>
                      </span>
                    ) : (
                      <span style={{ fontFamily: font.mono, fontSize: '12px' }}>{inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}</span>
                    )}
                    {inc.isEstimatedLocation && (
                      <span style={{
                        marginLeft: 8, padding: '1px 6px', borderRadius: 4,
                        background: W.amberDim, color: W.amber,
                        fontSize: '10px', fontWeight: 600, fontFamily: font.mono,
                      }}>EST.</span>
                    )}
                  </div>
                </div>

                {/* Description / Details */}
                {inc.description && inc.description !== inc.title && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                      letterSpacing: '0.07em', marginBottom: 4, fontFamily: font.mono,
                    }}>Details</div>
                    <div style={{
                      fontSize: '12.5px', color: W.textPrimary, lineHeight: 1.6,
                      padding: '10px 12px', background: W.bgSurface, borderRadius: 8,
                    }}>
                      {inc.description}
                    </div>
                  </div>
                )}

                {/* Corroborated by */}
                {inc.corroboratedBy.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                      letterSpacing: '0.07em', marginBottom: 4, fontFamily: font.mono,
                    }}>Corroborated By</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {inc.corroboratedBy.map(s => (
                        <span key={s} style={{
                          padding: '3px 9px', borderRadius: 4,
                          background: W.greenDim, color: W.green,
                          fontSize: '11px', fontFamily: font.mono, fontWeight: 600,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scanner audio */}
                {inc.scannerAudioUrl && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                      letterSpacing: '0.07em', marginBottom: 6, fontFamily: font.mono,
                    }}>Scanner Audio</div>
                    <audio controls src={inc.scannerAudioUrl} style={{ width: '100%', height: 32 }} />
                  </div>
                )}

                {/* Source link */}
                {inc.url && (
                  <a
                    href={inc.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 6,
                      background: W.blueDim, color: W.blue,
                      fontSize: '12px', fontWeight: 600, fontFamily: font.body,
                      textDecoration: 'none', border: `1px solid rgba(79,124,255,0.2)`,
                    }}
                  >
                    View Source →
                  </a>
                )}

                {/* Raw title (if different) */}
                {inc.rawTitle && inc.rawTitle !== inc.title && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{
                      fontSize: '10px', color: W.textDim, textTransform: 'uppercase',
                      letterSpacing: '0.07em', marginBottom: 4, fontFamily: font.mono,
                    }}>Raw Source Title</div>
                    <div style={{ fontSize: '11px', color: W.textDim, fontStyle: 'italic', lineHeight: 1.5 }}>
                      {inc.rawTitle}
                    </div>
                  </div>
                )}
              </div>

              {/* Detail footer — source freshness */}
              <div style={{
                padding: '10px 18px', borderTop: `1px solid ${W.border}`, flexShrink: 0,
              }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {data.sourceStatuses.slice(0, 4).map(s => (
                    <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: s.status === 'LIVE' ? W.green : s.status === 'DEGRADED' ? W.amber : W.red,
                      }} />
                      <span style={{ fontFamily: font.mono, fontSize: '9px', color: W.textDim }}>{s.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })() : (
              /* ── LIVE FEED (no selection) ───────────────────────── */
          <>
            {/* Principal View banner */}
            {isPrincipal && principalCampus && (
              <div style={{
                padding: '10px 18px',
                background: `${W.threat[principalCampus.threatLevel].bg}`,
                borderBottom: `2px solid ${W.threat[principalCampus.threatLevel].color}`,
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: W.threat[principalCampus.threatLevel].color, flexShrink: 0 }} />
                  <span style={{ fontFamily: font.mono, fontSize: '11px', fontWeight: 700, color: W.threat[principalCampus.threatLevel].color }}>
                    {principalCampus.campusShort} — {principalCampus.threatLevel}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: W.textMuted, marginTop: 3 }}>
                  Showing incidents within 1 mile of your campus
                </div>
              </div>
            )}

            {/* Feed header */}
            <div style={{
              padding: '14px 18px', borderBottom: `1px solid ${W.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{ fontFamily: font.body, fontSize: '11px', fontWeight: 600, color: W.textMuted }}>
                {isPrincipal ? 'Campus Incident Feed' : 'Live Violent Crime Feed'}
              </div>
              <div style={{ fontFamily: font.mono, fontSize: '10px', color: W.textDim }}>
                {feedIncidents.length} active
              </div>
            </div>

            {/* Feed list */}
            <div ref={feedListRef} style={{ flex: 1, overflow: 'auto' }}>
              {feedIncidents.length === 0 ? (
                <div style={{
                  padding: '32px 18px', textAlign: 'center',
                  color: W.textDim, fontSize: '13px',
                }}>
                  No violent incidents in the last 6 hours.
                </div>
              ) : (
                feedIncidents.map(inc => {
                  const isDemo = inc.id.startsWith('demo_');
                  const isNew = newIncidentIds.has(inc.id);
                  const isActive = selectedIncident?.id === inc.id;
                  const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
                  const dirStr = nearestCampus && inc.distanceToCampus !== null
                    ? dirFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
                    : null;
                  const incColor = inc.crimeType === 'HOMICIDE' ? '#E5484D' :
                                   inc.crimeType === 'SHOOTING' ? W.red :
                                   inc.crimeType === 'SHOTS_FIRED' ? W.amber :
                                   inc.crimeType === 'STABBING' ? '#E07020' : W.textSecondary;
                  return (
                    <div
                      key={inc.id}
                      data-incident-id={inc.id}
                      className="v3-incident-row"
                      style={{
                        padding: '12px 18px',
                        borderBottom: `1px solid ${W.border}`,
                        cursor: 'pointer', transition: 'background 0.15s ease',
                        background: isActive
                          ? `rgba(201,165,78,0.08)`
                          : isDemo ? 'rgba(224, 82, 82, 0.06)' : 'transparent',
                        borderLeft: isActive ? `3px solid ${W.gold}` : '3px solid transparent',
                        animation: isNew || isDemo ? 'v3FadeIn 0.4s ease-out' : undefined,
                      }}
                      onClick={() => onSelectIncident(inc)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isNew && (
                            <span className="v3-new-badge" style={{
                              fontFamily: font.mono, fontSize: '9px', fontWeight: 700,
                              color: W.red, letterSpacing: '0.06em',
                            }}>NEW</span>
                          )}
                          <span style={{
                            fontFamily: font.body, fontSize: '11px', fontWeight: 700,
                            color: incColor,
                          }}>
                            {VIOLENT_CRIME_LABELS[inc.crimeType]}
                            {isDemo && ' — DEMO'}
                          </span>
                        </div>
                        <span style={{ fontFamily: font.mono, fontSize: '10px', color: W.textDim }}>
                          {fmtAgo(inc.timestamp)}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '12.5px', color: W.textPrimary, lineHeight: 1.4, marginBottom: 5,
                      }}>
                        {inc.title}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: font.mono, fontSize: '10px',
                          color: inc.confidence === 'CONFIRMED' ? W.green :
                                 inc.confidence === 'CORROBORATED' ? W.blue : W.amber,
                        }}>
                          {inc.confidence} {inc.confidenceScore}%
                        </span>
                        {dirStr && nearestCampus && (
                          <span style={{ fontFamily: font.mono, fontSize: '10px', color: W.textDim }}>
                            {dirStr} · {nearestCampus.campusShort}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Source freshness footer */}
            <div style={{
              padding: '10px 18px', borderTop: `1px solid ${W.border}`, flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {(isPrincipal && principalCampus ? [
                  { source: 'CITIZEN', status: 'LIVE' },
                  { source: 'SCANNER', status: 'LIVE' },
                  { source: 'CPD', status: feedIncidents.some(i => i.source === 'CPD') ? 'LIVE' : 'STANDBY' },
                  { source: 'NEWS', status: feedIncidents.some(i => i.source === 'NEWS') ? 'LIVE' : 'STANDBY' },
                ] : data.sourceStatuses.slice(0, 4)).map(s => (
                  <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: s.status === 'LIVE' ? W.green : s.status === 'DEGRADED' ? W.amber : s.status === 'STANDBY' ? W.textDim : W.red,
                    }} />
                    <span style={{ fontFamily: font.mono, fontSize: '10px', color: W.textDim }}>
                      {s.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT III: CONTAGION TAB WRAPPER
// ═══════════════════════════════════════════════════════════════════════════
interface ContagionWrapperProps {
  contagionZones: ContagionZone[];
  contagionIncidents: Incident[];
  data: WatchDataState;
}

function ContagionWrapper({ contagionZones, contagionIncidents, data }: ContagionWrapperProps) {
  // Build minimal CampusRisk[] from contagion zones for the ContagionTab
  const allRisks = useMemo<CampusRisk[]>(() => {
    return CAMPUSES.map(campus => {
      const campusZones = contagionZones.filter(z => {
        const dist = haversine(campus.lat, campus.lng, z.lat, z.lng);
        return dist <= (z.phase === 'ACUTE' ? 0.5 : z.phase === 'ACTIVE' ? 1.0 : 1.5);
      });
      const inRetWin = campusZones.some(z => z.retWin);
      const label = inRetWin ? 'CRITICAL' :
                    campusZones.some(z => z.phase === 'ACUTE') ? 'HIGH' :
                    campusZones.some(z => z.phase === 'ACTIVE') ? 'ELEVATED' : 'LOW';
      return {
        campusId: campus.id,
        score: label === 'CRITICAL' ? 85 : label === 'HIGH' ? 65 : label === 'ELEVATED' ? 40 : 15,
        label,
        base: 0, acute: 0, seasonal: 0, shotSpotterBonus: 0,
        closeCount: 0, nearCount: 0,
        contagionZones: campusZones,
        inRetaliationWindow: inRetWin,
        minutesToArrival: 0, minutesToDismissal: 0,
        schoolPeriod: 'SCHOOL_DAY' as const,
        statusReason: '',
      };
    });
  }, [contagionZones]);

  if (contagionIncidents.length === 0 && contagionZones.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 40,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${W.border}`, borderTopColor: W.gold,
          animation: 'v3Spin 1s linear infinite',
        }} />
        <div style={{ fontFamily: font.body, fontSize: '14px', color: W.textMuted }}>
          Loading 125-day homicide data for contagion analysis...
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* Network Organism Graph + Decay Clocks */}
      {contagionZones.length > 0 && (
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${W.border}` }}>
          <div style={{ flex: '0 0 60%', borderRight: `1px solid ${W.border}` }}>
            <NetworkOrganismGraph
              campusThreats={data.campusThreats}
              zones={contagionZones}
            />
          </div>
          <div style={{ flex: '0 0 40%' }}>
            <DecayClock zones={contagionZones} />
          </div>
        </div>
      )}
      <ContagionTab
        zones={contagionZones}
        allRisks={allRisks}
        incidents={contagionIncidents}
        selectedCampus={null}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: WATCH APP V3
// ═══════════════════════════════════════════════════════════════════════════
type WatchTab = 'briefing' | 'map' | 'contagion' | 'response';

const TABS: { id: WatchTab; label: string; sub: string }[] = [
  { id: 'briefing',  label: 'Briefing',   sub: 'What does this mean?' },
  { id: 'map',       label: 'Map',        sub: 'Where is it happening?' },
  { id: 'contagion', label: 'Contagion',  sub: 'What happens next?' },
  { id: 'response',  label: 'Response',   sub: 'What do we do?' },
];

export const WatchAppV3: React.FC = () => {
  const rawData = useWatchData();
  const { role, selectedCampusId: principalCampusId } = useRole();

  // Merge seed incidents with live data — seeds are filtered out if a live
  // incident with the same id already exists (prevents duplicates on refresh).
  // Seeds age normally: ageMinutes is computed from their fixed timestamps.
  const data = React.useMemo((): typeof rawData => {
    const liveIds = new Set(rawData.incidents.map(i => i.id));
    const now = Date.now();
    const freshSeeds = SEED_INCIDENTS
      .filter(s => !liveIds.has(s.id))
      .map(s => ({
        ...s,
        ageMinutes: Math.round((now - new Date(s.timestamp).getTime()) / 60000),
      }))
      .filter(s => s.ageMinutes <= 360); // only show seeds within 6h window
    const merged = [...freshSeeds, ...rawData.incidents];
    return { ...rawData, incidents: merged };
  }, [rawData]);

  const [activeTab, setActiveTab] = useState<WatchTab>('briefing');

  // Map state
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<WatchIncident | null>(null);
  const [showGangBoundaries, setShowGangBoundaries] = useState(false);
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());
  const previousIncidentIds = useRef<Set<string>>(new Set());
  const hasPlayedAlert = useRef(false);

  // Demo mode state
  const [demoMode, setDemoMode] = useState(false);
  const [demoIncident, setDemoIncident] = useState<WatchIncident | null>(null);
  const [demoPhase, setDemoPhase] = useState(0);
  const [showSMSConfig, setShowSMSConfig] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState<Array<{
    id: number; message: string; phase: number; visible: boolean;
  }>>([]);

  // Contagion data
  const [contagionIncidents, setContagionIncidents] = useState<Incident[]>([]);
  const [contagionZones, setContagionZones] = useState<ContagionZone[]>([]);
  const contagionLoadedRef = useRef(false);

  // Load contagion data when Contagion tab is first opened
  useEffect(() => {
    if (activeTab !== 'contagion' || contagionLoadedRef.current) return;
    contagionLoadedRef.current = true;
    fetchHomicidesForContagion().then(incidents => {
      setContagionIncidents(incidents);
      setContagionZones(buildContagionZones(incidents));
    });
  }, [activeTab]);

  // Track new incidents for flashing
  useEffect(() => {
    const currentIds = new Set(data.incidents.map(i => i.id));
    const newIds = new Set<string>();
    for (const id of currentIds) {
      if (!previousIncidentIds.current.has(id)) newIds.add(id);
    }
    if (newIds.size > 0 && previousIncidentIds.current.size > 0) {
      setNewIncidentIds(prev => new Set([...prev, ...newIds]));
      setTimeout(() => setNewIncidentIds(new Set()), 60000);
    }
    previousIncidentIds.current = currentIds;
  }, [data.incidents]);

  // Audio alert on RED campus
  useEffect(() => {
    const hasRed = data.campusThreats.some(c => c.threatLevel === 'RED');
    if (hasRed && !hasPlayedAlert.current) {
      playAlertChime();
      hasPlayedAlert.current = true;
    }
    if (!hasRed) hasPlayedAlert.current = false;
  }, [data.campusThreats]);

  // Demo mode keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        setShowSMSConfig(true);
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        if (!demoMode) {
          setDemoMode(true);
          setActiveTab('map'); // Switch to map for demo
          const inc = createDemoIncident();
          setDemoIncident(inc);
          setDemoPhase(1);
          const phone = sessionStorage.getItem('slate_demo_phone');
          const smsMsg1 = `🔴 SLATE ALERT: Shooting reported near Englewood campus. Confidence: REPORTED (70%). Source: Citizen. Monitoring for corroboration.`;
          const notif1 = { id: Date.now(), message: smsMsg1, phase: 1, visible: true };
          setSmsNotifications(prev => [...prev, notif1]);
          setTimeout(() => setSmsNotifications(prev => prev.map(n => n.id === notif1.id ? { ...n, visible: false } : n)), 12000);
          setTimeout(() => setSmsNotifications(prev => prev.filter(n => n.id !== notif1.id)), 13000);
          if (phone) sendSMSAlert(smsMsg1 + ' — Slate Watch');

          setTimeout(() => {
            setDemoIncident(prev => prev ? { ...prev, confidence: 'CORROBORATED', confidenceScore: 85, corroboratedBy: ['SCANNER'] } : null);
            setDemoPhase(2);
            const smsMsg2 = `🟡 SLATE UPDATE: Scanner corroborated shooting near Englewood. Confidence 85% (CORROBORATED). Multiple sources confirming.`;
            const notif2 = { id: Date.now(), message: smsMsg2, phase: 2, visible: true };
            setSmsNotifications(prev => [...prev, notif2]);
            setTimeout(() => setSmsNotifications(prev => prev.map(n => n.id === notif2.id ? { ...n, visible: false } : n)), 12000);
            setTimeout(() => setSmsNotifications(prev => prev.filter(n => n.id !== notif2.id)), 13000);
            if (phone) sendSMSAlert(smsMsg2 + ' — Slate Watch');
          }, 8000);

          setTimeout(() => {
            setDemoIncident(prev => prev ? { ...prev, confidence: 'CONFIRMED', confidenceScore: 95, corroboratedBy: ['SCANNER', 'CPD'] } : null);
            setDemoPhase(3);
            playAlertChime();
            const smsMsg3 = `🟢 SLATE CONFIRMED: CPD confirmed shooting near Englewood. Confidence 95%. Recommended: Enhanced security posture. All sources aligned.`;
            const notif3 = { id: Date.now(), message: smsMsg3, phase: 3, visible: true };
            setSmsNotifications(prev => [...prev, notif3]);
            setTimeout(() => setSmsNotifications(prev => prev.map(n => n.id === notif3.id ? { ...n, visible: false } : n)), 12000);
            setTimeout(() => setSmsNotifications(prev => prev.filter(n => n.id !== notif3.id)), 13000);
            if (phone) sendSMSAlert(smsMsg3 + ' — Slate Watch');
          }, 16000);

          setTimeout(() => {
            setDemoMode(false);
            setDemoIncident(null);
            setDemoPhase(0);
          }, 90000);
        } else {
          setDemoMode(false);
          setDemoIncident(null);
          setDemoPhase(0);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [demoMode]);

  // Loading state
  if (data.isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: W.bg, flexDirection: 'column', gap: 20,
        fontFamily: font.body,
      }}>
        <style>{V3_CSS}</style>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: `3px solid ${W.border}`, borderTopColor: W.gold,
          animation: 'v3Spin 1s linear infinite',
        }} />
        <div style={{
          fontFamily: font.body, fontSize: '20px', color: W.textSecondary,
          fontWeight: 300, letterSpacing: '0.02em',
        }}>
          Scanning all sources...
        </div>
        <div style={{
          fontFamily: font.mono, fontSize: '12px', color: W.textDim,
          letterSpacing: '0.08em',
        }}>
          CITIZEN · SCANNER · NEWS · CPD · WEATHER
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: W.bg, fontFamily: font.body, color: W.textPrimary,
      overflow: 'hidden',
    }}>
      <style>{V3_CSS}</style>

      {/* SMS Config Modal */}
      {showSMSConfig && <SMSConfigPanel onClose={() => setShowSMSConfig(false)} />}

      {/* SMS Notifications */}
      {smsNotifications.length > 0 && (
        <div style={{
          position: 'fixed', top: 16, right: 24, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380,
        }}>
          {smsNotifications.map(notif => (
            <div key={notif.id} style={{
              background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
              borderRadius: 14, padding: '14px 18px',
              boxShadow: '0 8px 32px rgba(26,35,50,0.18), 0 0 0 1px rgba(26,35,50,0.08)',
              animation: notif.visible ? 'smsSlideIn 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards' : 'smsSlideOut 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: notif.phase === 1 ? W.redDim : notif.phase === 2 ? W.amberDim : W.greenDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                {notif.phase === 1 ? '🔴' : notif.phase === 2 ? '🟡' : '🟢'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: font.mono, fontSize: '10px', letterSpacing: '0.08em',
                  color: W.textDim, marginBottom: 4, textTransform: 'uppercase',
                }}>
                  Slate Watch Alert · Now
                </div>
                <div style={{
                  fontFamily: font.body, fontSize: '12px', lineHeight: 1.5,
                  color: W.textPrimary,
                }}>
                  {notif.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 56,
        background: W.bgCard,
        borderBottom: `1px solid ${W.border}`,
        flexShrink: 0,
      }}>
        {/* Left: Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: W.green,
            boxShadow: `0 0 8px ${W.green}`,
            animation: 'v3PulseGold 2s ease-in-out infinite',
          }} />
          <div>
            <div style={{
              fontFamily: font.body, fontSize: '16px', fontWeight: 300,
              color: W.textPrimary, letterSpacing: '0.03em',
            }}>
              Watch
            </div>
            <div style={{
              fontFamily: font.mono, fontSize: '9px', color: W.textDim,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1,
            }}>
              Know what happens as it happens
            </div>
          </div>
        </div>

        {/* Center: Three-act tabs */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', gap: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0 28px', border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  borderBottom: isActive ? `2px solid ${W.blue}` : '2px solid transparent',
                  transition: 'all 0.15s ease',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}
              >
                <span style={{
                  fontFamily: font.body, fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? W.textPrimary : W.textMuted,
                  transition: 'color 0.15s ease',
                }}>
                  {tab.label}
                </span>
                <span style={{
                  fontFamily: font.mono, fontSize: '9px',
                  color: isActive ? W.textDim : W.textDim,
                  letterSpacing: '0.04em',
                  opacity: isActive ? 1 : 0.6,
                }}>
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {demoMode && (
            <div style={{
              fontFamily: font.mono, fontSize: '10px', fontWeight: 600,
              color: W.red, letterSpacing: '0.08em',
              animation: 'v3Blink 1s ease-in-out infinite',
            }}>
              ◉ DEMO
            </div>
          )}
          <div style={{
            fontFamily: font.mono, fontSize: '10px', color: W.textDim,
            letterSpacing: '0.06em',
          }}>
            {data.lastRefresh
              ? `${fmtAgo(data.lastRefresh.toISOString())} · Auto 2m`
              : 'Loading...'}
          </div>
          {data.isRefreshing && (
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              border: `2px solid ${W.border}`, borderTopColor: W.gold,
              animation: 'v3Spin 1s linear infinite',
            }} />
          )}
        </div>
      </div>

      {/* ─── TAB CONTENT ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'briefing' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <SituationRoom
              data={data}
              contagionZones={contagionZones}
              isRefreshing={data.isRefreshing}
            />
            <div style={{ flex: 1, overflow: 'auto' }}>
              <BriefingTabV2
                data={data}
                demoIncident={demoIncident}
                contagionZones={contagionZones}
                viewMode="ceo"
              />
            </div>
          </div>
        )}
        {activeTab === 'map' && (
          <MapTab
            data={data}
            demoIncident={demoIncident}
            demoPhase={demoPhase}
            newIncidentIds={newIncidentIds}
            showGangBoundaries={showGangBoundaries}
            onToggleGangBoundaries={() => setShowGangBoundaries(g => !g)}
            selectedIncident={selectedIncident}
            onSelectIncident={setSelectedIncident}
            onSelectCampus={setSelectedCampus}
            selectedCampus={selectedCampus}
            contagionZones={contagionZones}
            role={role}
            principalCampusId={principalCampusId}
          />
        )}
        {activeTab === 'contagion' && (
          <ContagionWrapper
            contagionZones={contagionZones}
            contagionIncidents={contagionIncidents}
            data={data}
          />
        )}
        {activeTab === 'response' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ResponseWarRoom
              data={data}
              contagionZones={contagionZones}
            />
            <ResponseTab
              data={data}
              contagionZones={contagionZones}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchAppV3;
