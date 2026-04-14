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
// WATCH MAP COMPONENT (extracted from CEOView, adapted for dark mode)
// ═══════════════════════════════════════════════════════════════════════════
interface WatchMapProps {
  campusThreats: WatchDataState['campusThreats'];
  incidents: WatchIncident[];
  selectedCampus: number | null;
  onSelectCampus: (id: number | null) => void;
  onSelectIncident: (inc: WatchIncident) => void;
  newIncidentIds: Set<string>;
  demoIncident: WatchIncident | null;
  showGangBoundaries: boolean;
}

function WatchMap({
  campusThreats, incidents, selectedCampus,
  onSelectCampus, onSelectIncident, newIncidentIds,
  demoIncident, showGangBoundaries,
}: WatchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const gangLayerRef = useRef<L.LayerGroup | null>(null);

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

  // Render markers
  useEffect(() => {
    const lg = layerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!lg || !map) return;
    lg.clearLayers();

    const allIncidents = demoIncident ? [demoIncident, ...incidents] : incidents;

    // Campus markers
    for (const ct of campusThreats) {
      const cfg = W.threat[ct.threatLevel];
      const isSelected = ct.campusId === selectedCampus;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${isSelected ? 44 : 36}px;height:${isSelected ? 44 : 36}px;
          border-radius:50%;
          background:${cfg.bg};
          border:2px solid ${cfg.color};
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
        const marker = L.circleMarker([inc.lat, inc.lng], {
          radius: r,
          fillColor,
          fillOpacity: decayedOpacity,
          color: inc.isEstimatedLocation ? W.amber : 'rgba(255,255,255,0.6)',
          weight: 1.5,
          dashArray: inc.isEstimatedLocation ? '3,3' : undefined,
        }).addTo(lg);
        marker.bindPopup(`
          <div style="min-width:220px;max-width:300px;">
            <div style="font-size:11px;font-weight:600;color:${fillColor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">
              ${VIOLENT_CRIME_LABELS[inc.crimeType]}${isDemo ? ' — DEMO' : ''}
            </div>
            <div style="font-size:14px;font-weight:500;color:${W.textPrimary};line-height:1.4;margin-bottom:8px;">${inc.title}</div>
            <div style="font-size:12px;color:${W.textMuted};margin-bottom:4px;">
              ${fmtAgo(inc.timestamp)} · ${inc.source}
              ${inc.isEstimatedLocation ? ` · <span style="color:${W.amber};font-weight:500;">EST. LOCATION</span>` : ''}
            </div>
            <div style="font-size:12px;color:${W.textMuted};">
              Confidence: <span style="font-weight:600;color:${inc.confidence === 'CONFIRMED' ? W.green : inc.confidence === 'CORROBORATED' ? W.blue : W.amber};">${inc.confidence} ${inc.confidenceScore}%</span>
            </div>
            ${dirStr && nearestCampus ? `<div style="font-size:12px;color:${W.textMuted};margin-top:2px;font-weight:500;">${dirStr} of ${nearestCampus.campusShort}</div>` : ''}
            ${inc.corroboratedBy.length > 0 ? `<div style="font-size:11px;color:${W.green};margin-top:4px;font-weight:500;">+ Corroborated by ${inc.corroboratedBy.join(', ')}</div>` : ''}
          </div>
        `, { maxWidth: 320 });
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
  }, [campusThreats, incidents, onSelectCampus, onSelectIncident, newIncidentIds, demoIncident]);

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
}

function MapTab({
  data, demoIncident, demoPhase, newIncidentIds,
  showGangBoundaries, onToggleGangBoundaries,
  selectedIncident, onSelectIncident, onSelectCampus, selectedCampus,
}: MapTabProps) {
  const feedIncidents = useMemo(() => {
    const real = data.incidents.filter(i => i.ageMinutes <= 360).slice(0, 40);
    return demoIncident ? [demoIncident, ...real] : real;
  }, [data.incidents, demoIncident]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* MAP — 70% */}
      <div style={{ flex: '0 0 70%', position: 'relative' }}>
        <WatchMap
          campusThreats={data.campusThreats}
          incidents={data.incidents.filter(i => i.ageMinutes <= 360)}
          selectedCampus={selectedCampus}
          onSelectCampus={onSelectCampus}
          onSelectIncident={onSelectIncident}
          newIncidentIds={newIncidentIds}
          demoIncident={demoIncident}
          showGangBoundaries={showGangBoundaries}
        />

        {/* Map overlays */}
        {/* Network status pill */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 1000,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
          borderRadius: 10, padding: '10px 16px',
          border: `1px solid ${W.border}`,
          boxShadow: '0 4px 16px rgba(26,35,50,0.12)',
        }}>
          <div style={{
            fontFamily: font.body, fontSize: '10px', fontWeight: 600,
            color: W.textMuted, marginBottom: 4,
          }}>
            Network Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: data.networkStatus
                ? W.threat[data.networkStatus.overallThreat].color
                : W.green,
              boxShadow: `0 0 6px ${data.networkStatus ? W.threat[data.networkStatus.overallThreat].color : W.green}`,
            }} />
            <span style={{
              fontFamily: font.mono, fontSize: '12px', fontWeight: 600,
              color: data.networkStatus
                ? W.threat[data.networkStatus.overallThreat].color
                : W.green,
            }}>
              {data.networkStatus
                ? THREAT_CONFIG[data.networkStatus.overallThreat].label.toUpperCase()
                : 'SCANNING'}
            </span>
          </div>
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

        {/* Gang boundaries toggle */}
        <button
          onClick={onToggleGangBoundaries}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 1000,
          background: showGangBoundaries ? 'rgba(43, 95, 138, 0.9)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${showGangBoundaries ? '#2B5F8A' : W.border}`,
          borderRadius: 8, padding: '8px 14px',
          cursor: 'pointer', fontSize: '11px', fontWeight: 600,
          fontFamily: font.body,
          color: showGangBoundaries ? '#fff' : W.textSecondary,
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          title="Toggle CPD 2024 Gang Territory Boundaries"
        >
          <span style={{ fontSize: '12px' }}>{showGangBoundaries ? '◼' : '◻'}</span>
          GANG TERRITORIES
          <span style={{ fontSize: '9px', opacity: 0.7 }}>CPD 2024</span>
        </button>

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
      </div>

      {/* LIVE FEED — 30% */}
      <div style={{
        flex: '0 0 30%', display: 'flex', flexDirection: 'column',
        borderLeft: `1px solid ${W.border}`, overflow: 'hidden',
      }}>
        {/* Feed header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${W.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{
          fontFamily: font.body, fontSize: '11px', fontWeight: 600,
          color: W.textMuted,
        }}>
          Live Violent Crime Feed
        </div>
          <div style={{
            fontFamily: font.mono, fontSize: '10px', color: W.textDim,
          }}>
            {feedIncidents.length} active
          </div>
        </div>

        {/* Incident detail overlay */}
        {selectedIncident && (
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: '30%', background: W.bgCard,
            borderLeft: `1px solid ${W.border}`,
            zIndex: 100, overflow: 'auto', padding: '20px',
            animation: 'v3SlideIn 0.25s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{
                fontFamily: font.body, fontSize: '11px', fontWeight: 600,
                color: W.textMuted,
              }}>
                Incident Detail
              </span>
              <button
                onClick={() => onSelectIncident(null as unknown as WatchIncident)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: W.textMuted, fontSize: '16px',
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              fontFamily: font.body, fontSize: '12px', fontWeight: 700,
              color: W.red, marginBottom: 10,
            }}>
              {VIOLENT_CRIME_LABELS[selectedIncident.crimeType]}
            </div>
            <div style={{
              fontSize: '15px', fontWeight: 500, color: W.textPrimary,
              lineHeight: 1.5, marginBottom: 12,
            }}>
              {selectedIncident.title}
            </div>
            <div style={{ fontSize: '12px', color: W.textMuted, lineHeight: 1.6 }}>
              {selectedIncident.description}
            </div>
            <div style={{
              marginTop: 16, padding: '12px 14px',
              background: W.bg, borderRadius: 8,
              border: `1px solid ${W.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '11px', color: W.textDim, fontFamily: font.mono }}>Source</span>
                <span style={{ fontSize: '11px', color: W.textSecondary, fontFamily: font.mono }}>{selectedIncident.source}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '11px', color: W.textDim, fontFamily: font.mono }}>Confidence</span>
                <span style={{
                  fontSize: '11px', fontFamily: font.mono, fontWeight: 600,
                  color: selectedIncident.confidence === 'CONFIRMED' ? W.green :
                         selectedIncident.confidence === 'CORROBORATED' ? W.blue : W.amber,
                }}>
                  {selectedIncident.confidence} {selectedIncident.confidenceScore}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: W.textDim, fontFamily: font.mono }}>Time</span>
                <span style={{ fontSize: '11px', color: W.textSecondary, fontFamily: font.mono }}>
                  {fmtAgo(selectedIncident.timestamp)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Feed list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
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
              const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
              const dirStr = nearestCampus && inc.distanceToCampus !== null
                ? dirFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
                : null;
              const incColor = inc.crimeType === 'HOMICIDE' ? '#FF6B6B' :
                               inc.crimeType === 'SHOOTING' ? W.red :
                               inc.crimeType === 'SHOTS_FIRED' ? W.amber : W.textSecondary;
              return (
                <div
                  key={inc.id}
                  className="v3-incident-row"
                  style={{
                    padding: '12px 18px',
                    borderBottom: `1px solid ${W.border}`,
                    cursor: 'pointer', transition: 'background 0.15s ease',
                    background: isDemo ? 'rgba(224, 82, 82, 0.06)' : 'transparent',
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
                        }}>
                          NEW
                        </span>
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
                    fontSize: '12.5px', color: W.textPrimary, lineHeight: 1.4,
                    marginBottom: 5,
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

        {/* Source freshness */}
        <div style={{
          padding: '10px 18px', borderTop: `1px solid ${W.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.sourceStatuses.slice(0, 4).map(s => (
              <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: s.status === 'LIVE' ? W.green : s.status === 'DEGRADED' ? W.amber : W.red,
                }} />
                <span style={{ fontFamily: font.mono, fontSize: '10px', color: W.textDim }}>
                  {s.source}
                </span>
              </div>
            ))}
          </div>
        </div>
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
type WatchTab = 'briefing' | 'map' | 'contagion';

const TABS: { id: WatchTab; label: string; sub: string }[] = [
  { id: 'briefing',  label: 'Briefing',   sub: 'What does this mean?' },
  { id: 'map',       label: 'Map',        sub: 'Where is it happening?' },
  { id: 'contagion', label: 'Contagion',  sub: 'What happens next?' },
];

export const WatchAppV3: React.FC = () => {
  const data = useWatchData();
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
          <BriefingTab
            data={data}
            demoIncident={demoIncident}
            contagionZones={contagionZones}
          />
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
          />
        )}
        {activeTab === 'contagion' && (
          <ContagionWrapper
            contagionZones={contagionZones}
            contagionIncidents={contagionIncidents}
            data={data}
          />
        )}
      </div>
    </div>
  );
};

export default WatchAppV3;
