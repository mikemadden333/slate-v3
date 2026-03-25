/**
 * Watch v2 — CEO Network View (Common Operating Picture)
 * Mars Lander Build — "Are my students in danger right now?"
 *
 * Features:
 * - Flashing red pulse on new alerts (map markers + feed cards)
 * - Clickable incident details (popup on map, expandable in feed)
 * - Data freshness bar (per-source, color-coded)
 * - Timeline sparkline (24h incident volume)
 * - Auto network briefing (3-sentence AI summary)
 * - Audio alert on RED campus
 * - Estimated location labels for news/scanner
 * - Dismissal risk window highlight
 *
 * Layout: Left 58% = Map | Right 42% = Status + Feed + Freshness
 * Typography: IBM Plex Sans (intelligence-grade)
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WatchDataState } from './useWatchData';
import type { WatchIncident, CampusThreat, ThreatLevel } from './types';
import { THREAT_CONFIG, VIOLENT_CRIME_LABELS, CONFIDENCE_SCORE } from './types';
import { brand, bg, text, font, fontSize, fontWeight, border, shadow, radius, space, status, modules } from '../../../core/theme';
import { fmtAgo } from '../engine/geo';

// ─── CSS Animations (injected once) ─────────────────────────────────────

const PULSE_CSS = `
@keyframes watchPulseRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(197, 48, 48, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(197, 48, 48, 0); }
}
@keyframes watchPulseNew {
  0% { background: rgba(197, 48, 48, 0.12); }
  50% { background: rgba(197, 48, 48, 0.04); }
  100% { background: rgba(197, 48, 48, 0.12); }
}
@keyframes watchFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes watchSlideIn {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}
.watch-new-badge {
  animation: watchPulseNew 1.5s ease-in-out infinite;
  border-left: 3px solid #C53030 !important;
}
.watch-feed-enter {
  animation: watchFadeIn 0.3s ease-out;
}
.leaflet-popup-content-wrapper {
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  font-family: 'IBM Plex Sans', sans-serif !important;
}
.leaflet-popup-content {
  margin: 12px 16px !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
}
.leaflet-popup-tip {
  box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
}
`;

// ─── Audio Alert ─────────────────────────────────────────────────────────

function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    // Second tone
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

// ─── Dismissal Window Check ──────────────────────────────────────────────

function isDismissalWindow(): boolean {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;
  // Dismissal window: 2:30 PM - 4:00 PM (150-240 minutes after noon)
  return totalMin >= 870 && totalMin <= 960; // 14:30 - 16:00
}

// ─── Timeline Sparkline ──────────────────────────────────────────────────

function TimelineSparkline({ incidents }: { incidents: WatchIncident[] }) {
  const hours = 24;
  const buckets = useMemo(() => {
    const now = Date.now();
    const b = new Array(hours).fill(0);
    for (const inc of incidents) {
      const age = (now - new Date(inc.timestamp).getTime()) / 3600000;
      const bucket = Math.min(hours - 1, Math.floor(age));
      if (bucket >= 0 && bucket < hours) b[hours - 1 - bucket]++;
    }
    return b;
  }, [incidents]);

  const max = Math.max(...buckets, 1);
  const barWidth = 100 / hours;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: 28, gap: 1, padding: '0 2px' }}>
      {buckets.map((count, i) => {
        const height = Math.max(2, (count / max) * 24);
        const isRecent = i >= hours - 2;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height,
              background: count === 0 ? border.light : isRecent ? status.red : `${status.red}80`,
              borderRadius: '1px 1px 0 0',
              transition: 'height 0.3s ease',
            }}
            title={`${hours - i}h ago: ${count} incident${count !== 1 ? 's' : ''}`}
          />
        );
      })}
    </div>
  );
}

// ─── Network Briefing Generator ──────────────────────────────────────────

function generateNetworkBriefing(data: WatchDataState): string {
  const net = data.networkStatus;
  if (!net) return 'Loading intelligence data...';

  const elevated = data.campusThreats.filter(c => c.threatLevel !== 'GREEN');
  const red = data.campusThreats.filter(c => c.threatLevel === 'RED');
  const totalIncidents = data.incidents.filter(i => i.ageMinutes <= 360).length;

  if (elevated.length === 0) {
    return `All ${data.campusThreats.length} campuses are clear. No violent incidents reported within network radius in the last 6 hours. ${net.weather.tempF}°F and ${net.weather.condition.toLowerCase()}.`;
  }

  let briefing = '';

  if (red.length > 0) {
    briefing += `${red.length} campus${red.length > 1 ? 'es' : ''} at ALERT status: ${red.map(c => c.campusShort).join(', ')}. `;
  }

  if (elevated.length > red.length) {
    const nonRed = elevated.filter(c => c.threatLevel !== 'RED');
    briefing += `${nonRed.length} additional campus${nonRed.length > 1 ? 'es' : ''} elevated. `;
  }

  briefing += `${totalIncidents} active violent incident${totalIncidents !== 1 ? 's' : ''} across the network. `;

  const clear = data.campusThreats.filter(c => c.threatLevel === 'GREEN');
  if (clear.length > 0) {
    briefing += `${clear.length} campus${clear.length > 1 ? 'es' : ''} all clear.`;
  }

  if (isDismissalWindow()) {
    briefing += ' ⚠ DISMISSAL WINDOW ACTIVE — heightened monitoring in effect.';
  }

  return briefing;
}

// ─── Source Freshness Bar ────────────────────────────────────────────────

function FreshnessBar({ data }: { data: WatchDataState }) {
  const net = data.networkStatus;
  if (!net) return null;

  const sources = [
    { name: 'CITIZEN', age: net.dataAge.citizen, unit: 'm', threshold: [5, 15] },
    { name: 'SCANNER', age: net.dataAge.scanner, unit: 'm', threshold: [5, 15] },
    { name: 'NEWS', age: net.dataAge.news, unit: 'm', threshold: [30, 120] },
    { name: 'CPD', age: net.dataAge.cpd, unit: 'h', threshold: [24, 168] },
  ];

  return (
    <div style={{
      display: 'flex', gap: 2, padding: `6px ${space.xl}`,
      borderTop: `1px solid ${border.light}`, background: bg.subtle,
    }}>
      {sources.map(s => {
        const isLive = s.age < s.threshold[0];
        const isStale = s.age >= s.threshold[1];
        const color = s.age >= 999 ? '#A0AEC0' : isLive ? status.green : isStale ? status.red : status.amber;
        const ageStr = s.age >= 999 ? '—' : s.unit === 'h' ? `${s.age}h` : `${s.age}m`;

        return (
          <div key={s.name} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 6px', borderRadius: radius.sm,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: color,
              boxShadow: isLive ? `0 0 4px ${color}` : 'none',
            }} />
            <span style={{
              fontSize: fontSize.xs, fontFamily: font.mono, color: text.muted,
              fontWeight: fontWeight.medium,
            }}>
              {s.name}
            </span>
            <span style={{
              fontSize: fontSize.xs, fontFamily: font.mono, color,
              fontWeight: fontWeight.medium, marginLeft: 'auto',
            }}>
              {ageStr}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Incident Detail Panel ───────────────────────────────────────────────

function IncidentDetail({ incident, campusName, onClose }: {
  incident: WatchIncident;
  campusName: string;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%',
      background: bg.card, zIndex: 20, display: 'flex', flexDirection: 'column',
      animation: 'watchSlideIn 0.2s ease-out',
      boxShadow: '-4px 0 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
            color: status.red, textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 4,
          }}>
            {VIOLENT_CRIME_LABELS[incident.crimeType]}
          </div>
          <div style={{
            fontSize: fontSize.lg, fontWeight: fontWeight.medium,
            color: text.primary, lineHeight: 1.3,
          }}>
            {incident.title}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: `1px solid ${border.light}`,
          borderRadius: radius.sm, padding: '4px 10px', cursor: 'pointer',
          fontSize: fontSize.sm, color: text.muted, fontFamily: font.body,
        }}>
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: `${space.lg} ${space.xl}` }}>
        {/* Time & Source */}
        <div style={{ marginBottom: space.lg }}>
          <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Reported
          </div>
          <div style={{ fontSize: fontSize.base, color: text.primary }}>
            {new Date(incident.timestamp).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit', hour12: true,
            })}
            <span style={{ color: text.muted, marginLeft: 8 }}>({fmtAgo(incident.timestamp)})</span>
          </div>
        </div>

        {/* Source & Confidence */}
        <div style={{ marginBottom: space.lg }}>
          <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Intelligence Source
          </div>
          <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', borderRadius: radius.sm,
              background: bg.subtle, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
              color: text.primary,
            }}>
              {incident.source}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: radius.sm,
              background: incident.confidence === 'CONFIRMED' ? status.greenBg : incident.confidence === 'CORROBORATED' ? status.blueBg : status.amberBg,
              color: incident.confidence === 'CONFIRMED' ? status.green : incident.confidence === 'CORROBORATED' ? status.blue : status.amber,
              fontSize: fontSize.sm, fontWeight: fontWeight.medium,
            }}>
              {incident.confidence} — {incident.confidenceScore}%
            </span>
          </div>
          {incident.corroboratedBy.length > 0 && (
            <div style={{ fontSize: fontSize.sm, color: status.green, marginTop: 6 }}>
              Corroborated by: {incident.corroboratedBy.join(', ')}
            </div>
          )}
        </div>

        {/* Location */}
        <div style={{ marginBottom: space.lg }}>
          <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Location
          </div>
          <div style={{ fontSize: fontSize.base, color: text.primary }}>
            {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
            {incident.isEstimatedLocation && (
              <span style={{
                marginLeft: 8, padding: '1px 6px', borderRadius: radius.sm,
                background: status.amberBg, color: status.amber,
                fontSize: fontSize.xs, fontWeight: fontWeight.medium,
              }}>
                ESTIMATED
              </span>
            )}
          </div>
          {campusName && incident.distanceToCampus !== null && (
            <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4 }}>
              {incident.distanceToCampus.toFixed(2)} miles from {campusName}
            </div>
          )}
        </div>

        {/* Description */}
        {incident.description && incident.description !== incident.title && (
          <div style={{ marginBottom: space.lg }}>
            <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Details
            </div>
            <div style={{
              fontSize: fontSize.base, color: text.primary, lineHeight: 1.6,
              padding: space.md, background: bg.subtle, borderRadius: radius.md,
            }}>
              {incident.description}
            </div>
          </div>
        )}

        {/* Scanner Audio */}
        {incident.scannerAudioUrl && (
          <div style={{ marginBottom: space.lg }}>
            <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Scanner Audio
            </div>
            <audio controls src={incident.scannerAudioUrl} style={{ width: '100%' }} />
          </div>
        )}

        {/* Source Link */}
        {incident.url && (
          <div>
            <a href={incident.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: radius.md,
              background: status.blueBg, color: status.blue,
              fontSize: fontSize.sm, fontWeight: fontWeight.medium,
              textDecoration: 'none', border: `1px solid ${status.blueBorder}`,
            }}>
              View Source →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Map Component (Leaflet) ─────────────────────────────────────────────

function WatchMap({ campusThreats, incidents, selectedCampus, onSelectCampus, onSelectIncident, newIncidentIds }: {
  campusThreats: CampusThreat[];
  incidents: WatchIncident[];
  selectedCampus: number | null;
  onSelectCampus: (id: number | null) => void;
  onSelectIncident: (inc: WatchIncident) => void;
  newIncidentIds: Set<string>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [41.82, -87.67],
      zoom: 11,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();

    // Draw campus markers with threat rings
    for (const ct of campusThreats) {
      const config = THREAT_CONFIG[ct.threatLevel];

      // Threat radius circle
      if (ct.threatLevel !== 'GREEN') {
        L.circle([ct.lat, ct.lng], {
          radius: 804.672,
          fillColor: config.color,
          fillOpacity: 0.06,
          color: config.color,
          opacity: 0.25,
          weight: 1.5,
        }).addTo(lg);
      }

      // Campus marker
      const isElevated = ct.threatLevel !== 'GREEN';
      const size = isElevated ? 14 : 9;
      const pulseClass = ct.threatLevel === 'RED' ? 'animation:watchPulseRed 1.5s ease-in-out infinite;' : '';

      const campusIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size * 2}px;height:${size * 2}px;border-radius:50%;
          background:${config.color};border:2.5px solid #fff;
          box-shadow:0 0 8px ${config.color}50;
          cursor:pointer;${pulseClass}
        "></div>`,
        iconSize: [size * 2, size * 2],
        iconAnchor: [size, size],
      });

      const marker = L.marker([ct.lat, ct.lng], { icon: campusIcon, zIndexOffset: isElevated ? 1000 : 0 })
        .addTo(lg);
      marker.on('click', () => onSelectCampus(ct.campusId));

      // Campus label
      const labelIcon = L.divIcon({
        className: '',
        html: `<div style="
          font-size:11px;font-weight:500;font-family:'IBM Plex Sans',sans-serif;
          color:${text.primary};white-space:nowrap;
          text-shadow:0 0 4px #fff, 0 0 4px #fff, 0 0 6px #fff;
          pointer-events:none;text-align:center;
          transform:translateY(4px);
        ">${ct.campusShort}</div>`,
        iconSize: [90, 18],
        iconAnchor: [45, -size],
      });
      L.marker([ct.lat, ct.lng], { icon: labelIcon, interactive: false }).addTo(lg);
    }

    // Draw incident markers (clickable with popups)
    for (const inc of incidents) {
      if (inc.ageMinutes > 360) continue;

      const isNew = newIncidentIds.has(inc.id);
      const severity = inc.crimeType === 'HOMICIDE' || inc.crimeType === 'SHOOTING' ? 'high' : 'medium';
      const r = severity === 'high' ? 7 : 5;
      const opacity = severity === 'high' ? 0.9 : 0.6;
      const isEstimated = inc.isEstimatedLocation;

      // Pulsing for new incidents
      if (isNew) {
        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:${r * 4}px;height:${r * 4}px;border-radius:50%;
            background:rgba(197,48,48,0.15);
            animation:watchPulseRed 1.5s ease-in-out infinite;
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
          "></div>`,
          iconSize: [r * 4, r * 4],
          iconAnchor: [r * 2, r * 2],
        });
        L.marker([inc.lat, inc.lng], { icon: pulseIcon, interactive: false, zIndexOffset: 500 }).addTo(lg);
      }

      const marker = L.circleMarker([inc.lat, inc.lng], {
        radius: r,
        fillColor: status.red,
        fillOpacity: opacity,
        color: isEstimated ? status.amber : '#FFFFFF',
        weight: isEstimated ? 2 : 1,
        dashArray: isEstimated ? '3,3' : undefined,
      }).addTo(lg);

      // Rich popup content
      const popupContent = `
        <div style="min-width:200px;max-width:280px;">
          <div style="font-size:11px;font-weight:600;color:${status.red};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">
            ${VIOLENT_CRIME_LABELS[inc.crimeType]}
          </div>
          <div style="font-size:14px;font-weight:500;color:#1A1A2E;line-height:1.4;margin-bottom:8px;">
            ${inc.title}
          </div>
          <div style="font-size:12px;color:#5A6A7E;margin-bottom:4px;">
            ${fmtAgo(inc.timestamp)} · ${inc.source}
            ${isEstimated ? ' · <span style="color:#C07C1E;font-weight:500;">EST. LOCATION</span>' : ''}
          </div>
          <div style="font-size:12px;color:#5A6A7E;">
            Confidence: <span style="font-weight:500;color:${inc.confidence === 'CONFIRMED' ? status.green : inc.confidence === 'CORROBORATED' ? status.blue : status.amber};">${inc.confidence} ${inc.confidenceScore}%</span>
          </div>
          ${inc.distanceToCampus !== null ? `<div style="font-size:12px;color:#5A6A7E;margin-top:2px;">${inc.distanceToCampus.toFixed(2)} mi from nearest campus</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300, className: 'watch-popup' });
      marker.on('click', () => onSelectIncident(inc));
    }

    // Dismissal window overlay
    if (isDismissalWindow()) {
      // Add a subtle overlay text
      const dismissalIcon = L.divIcon({
        className: '',
        html: `<div style="
          background:rgba(197,48,48,0.08);border:1px solid rgba(197,48,48,0.2);
          border-radius:6px;padding:4px 10px;white-space:nowrap;
          font-size:11px;font-weight:600;color:${status.red};
          font-family:'IBM Plex Sans',sans-serif;letter-spacing:0.05em;
        ">⚠ DISMISSAL WINDOW</div>`,
        iconSize: [160, 24],
        iconAnchor: [80, 12],
      });
      L.marker([41.92, -87.67], { icon: dismissalIcon, interactive: false, zIndexOffset: 2000 }).addTo(lg);
    }
  }, [campusThreats, incidents, onSelectCampus, onSelectIncident, newIncidentIds]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── CEO View Component ───────────────────────────────────────────────────

interface CEOViewProps {
  data: WatchDataState;
  onSelectCampus: (campusId: number) => void;
}

export const CEOView: React.FC<CEOViewProps> = ({ data, onSelectCampus }) => {
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<WatchIncident | null>(null);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const previousIncidentIds = useRef<Set<string>>(new Set());
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());
  const hasPlayedAlert = useRef(false);

  const handleSelectCampus = useCallback((id: number | null) => {
    setSelectedCampus(id);
    if (id) onSelectCampus(id);
  }, [onSelectCampus]);

  const handleSelectIncident = useCallback((inc: WatchIncident) => {
    setSelectedIncident(inc);
  }, []);

  // Track new incidents for flashing
  useEffect(() => {
    const currentIds = new Set(data.incidents.map(i => i.id));
    const newIds = new Set<string>();

    for (const id of currentIds) {
      if (!previousIncidentIds.current.has(id)) {
        newIds.add(id);
      }
    }

    if (newIds.size > 0 && previousIncidentIds.current.size > 0) {
      setNewIncidentIds(newIds);
      // Clear "new" status after 60 seconds
      setTimeout(() => setNewIncidentIds(new Set()), 60000);
    }

    previousIncidentIds.current = currentIds;
  }, [data.incidents]);

  // Audio alert when any campus goes RED
  useEffect(() => {
    const hasRed = data.campusThreats.some(c => c.threatLevel === 'RED');
    if (hasRed && !hasPlayedAlert.current) {
      playAlertChime();
      hasPlayedAlert.current = true;
    }
    if (!hasRed) {
      hasPlayedAlert.current = false;
    }
  }, [data.campusThreats]);

  // Sort campus threats
  const sortedThreats = useMemo(() => {
    const order: Record<ThreatLevel, number> = { RED: 0, ORANGE: 1, AMBER: 2, GREEN: 3 };
    return [...data.campusThreats].sort((a, b) => order[a.threatLevel] - order[b.threatLevel]);
  }, [data.campusThreats]);

  // Feed incidents
  const feedIncidents = useMemo(() => {
    return data.incidents
      .filter(i => i.ageMinutes <= 360)
      .slice(0, 30);
  }, [data.incidents]);

  if (data.isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: bg.app, flexDirection: 'column', gap: space.lg,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: `3px solid ${border.light}`, borderTopColor: brand.gold,
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontFamily: font.display, fontSize: fontSize.xl, color: text.secondary, fontWeight: fontWeight.light }}>
          Scanning all sources...
        </div>
        <div style={{ fontSize: fontSize.sm, color: text.muted, fontFamily: font.body }}>
          Citizen · Scanner · News · CPD · Weather
        </div>
      </div>
    );
  }

  const net = data.networkStatus;
  const threatColor = net ? THREAT_CONFIG[net.overallThreat].color : status.green;
  const threatLabel = net ? THREAT_CONFIG[net.overallThreat].label : 'Loading';
  const briefing = generateNetworkBriefing(data);
  const dismissalActive = isDismissalWindow();

  return (
    <div style={{
      display: 'flex', height: '100%', background: bg.app,
      fontFamily: font.body, color: text.primary, overflow: 'hidden',
    }}>
      <style>{PULSE_CSS}</style>

      {/* LEFT: Map (58%) */}
      <div style={{
        flex: '0 0 58%', position: 'relative',
        background: '#E8E4DD', borderRight: `1px solid ${border.light}`,
      }}>
        <WatchMap
          campusThreats={data.campusThreats}
          incidents={feedIncidents}
          selectedCampus={selectedCampus}
          onSelectCampus={handleSelectCampus}
          onSelectIncident={handleSelectIncident}
          newIncidentIds={newIncidentIds}
        />

        {/* Map overlay — network status */}
        <div style={{
          position: 'absolute', top: space.lg, left: space.lg,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          borderRadius: radius.md, padding: `${space.md} ${space.lg}`,
          boxShadow: shadow.md, border: `1px solid ${border.light}`, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: threatColor, boxShadow: `0 0 8px ${threatColor}60`,
            }} />
            <span style={{ fontFamily: font.display, fontSize: fontSize.lg, fontWeight: fontWeight.light, color: text.primary }}>
              Network: {threatLabel}
            </span>
          </div>
          {net && net.campusesRequiringAttention > 0 && (
            <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4 }}>
              {net.campusesRequiringAttention} campus{net.campusesRequiringAttention !== 1 ? 'es' : ''} require attention
            </div>
          )}
          {net && net.campusesRequiringAttention === 0 && (
            <div style={{ fontSize: fontSize.sm, color: status.green, marginTop: 4 }}>
              All campuses clear
            </div>
          )}
        </div>

        {/* Weather + Dismissal */}
        <div style={{
          position: 'absolute', top: space.lg, right: space.lg,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          borderRadius: radius.md, padding: `${space.sm} ${space.md}`,
          boxShadow: shadow.sm, border: `1px solid ${border.light}`, zIndex: 10,
          fontSize: fontSize.sm, color: text.secondary,
        }}>
          {net && (
            <span>
              {Math.round(net.weather.tempF)}°F · {net.weather.condition}
              {net.weather.isRiskElevating && <span style={{ color: status.amber, marginLeft: 4 }}>⚠</span>}
            </span>
          )}
          {dismissalActive && (
            <div style={{
              marginTop: 4, fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
              color: status.red, letterSpacing: '0.05em',
            }}>
              ⚠ DISMISSAL WINDOW
            </div>
          )}
        </div>

        {/* Refreshing bar */}
        {data.isRefreshing && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${brand.gold}, transparent)`,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* RIGHT: Status + Feed (42%) */}
      <div style={{
        flex: '0 0 42%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Incident detail overlay */}
        {selectedIncident && (
          <IncidentDetail
            incident={selectedIncident}
            campusName={data.campusThreats.find(c => c.campusId === selectedIncident.nearestCampusId)?.campusShort ?? ''}
            onClose={() => setSelectedIncident(null)}
          />
        )}

        {/* Network Briefing */}
        <div style={{
          padding: `${space.md} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
          background: dismissalActive ? 'rgba(197, 48, 48, 0.04)' : bg.card,
        }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 6, fontWeight: fontWeight.medium,
          }}>
            Network Briefing
          </div>
          <div style={{
            fontSize: fontSize.base, color: text.primary, lineHeight: 1.6,
          }}>
            {briefing}
          </div>
          <div style={{
            fontSize: fontSize.xs, color: text.light, marginTop: 6,
          }}>
            {data.lastRefresh
              ? `Updated ${fmtAgo(data.lastRefresh.toISOString())} · Auto-refreshes every 2 min`
              : 'Loading...'}
          </div>
        </div>

        {/* Timeline Sparkline */}
        <div style={{
          padding: `${space.sm} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
          background: bg.card,
        }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 4, fontWeight: fontWeight.medium,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>24-Hour Activity</span>
            <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: text.light }}>
              {data.incidents.length} total
            </span>
          </div>
          <TimelineSparkline incidents={data.incidents} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '10px', color: text.light, marginTop: 2,
          }}>
            <span>24h ago</span>
            <span>Now</span>
          </div>
        </div>

        {/* Status cards */}
        <div style={{
          display: 'flex', gap: space.sm, padding: `${space.sm} ${space.xl}`,
          borderBottom: `1px solid ${border.light}`, background: bg.card,
        }}>
          <div style={{
            flex: 1, padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
            background: `${threatColor}08`, border: `1px solid ${threatColor}15`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: threatColor, lineHeight: 1 }}>
              {net?.campusesRequiringAttention ?? 0}
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Elevated
            </div>
          </div>
          <div style={{
            flex: 1, padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
            background: status.redBg, border: `1px solid ${status.red}15`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: status.red, lineHeight: 1 }}>
              {net?.totalActiveIncidents ?? 0}
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Incidents
            </div>
          </div>
          <div style={{
            flex: 1, padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
            background: status.blueBg, border: `1px solid ${status.blue}15`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: status.blue, lineHeight: 1 }}>
              {data.scannerTotalCalls}
            </div>
            <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Scanner
            </div>
          </div>
        </div>

        {/* Campus grid */}
        <div style={{
          padding: `${space.sm} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
          background: bg.card,
        }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 6, fontWeight: fontWeight.medium,
          }}>
            Campus Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {sortedThreats.map(ct => {
              const config = THREAT_CONFIG[ct.threatLevel];
              return (
                <div
                  key={ct.campusId}
                  style={{
                    padding: '5px 6px', borderRadius: radius.sm,
                    background: config.bgColor, border: `1px solid ${config.color}18`,
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleSelectCampus(ct.campusId)}
                  title={`${ct.campusShort}: ${config.label} — ${ct.incidentCount} incidents`}
                >
                  <div style={{
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                    color: text.primary, lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ct.campusShort}
                  </div>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: config.color, margin: '3px auto 0',
                  }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident feed */}
        <div style={{ flex: 1, overflow: 'auto', padding: `${space.sm} ${space.xl} ${space.md}` }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 6, fontWeight: fontWeight.medium,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Live Feed — Violent Crime Only</span>
            <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: text.light }}>
              {feedIncidents.length}
            </span>
          </div>

          {feedIncidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: space['2xl'], color: text.muted }}>
              <div style={{ fontSize: fontSize.lg, marginBottom: space.sm, color: status.green }}>No violent incidents reported</div>
              <div style={{ fontSize: fontSize.sm }}>within network radius in the last 6 hours</div>
            </div>
          )}

          {feedIncidents.map(inc => {
            const campusName = data.campusThreats.find(c => c.campusId === inc.nearestCampusId)?.campusShort ?? '';
            const distStr = inc.distanceToCampus !== null ? `${inc.distanceToCampus.toFixed(2)} mi` : '';
            const isNew = newIncidentIds.has(inc.id);
            const isExpanded = expandedIncident === inc.id;

            return (
              <div
                key={inc.id}
                className={`watch-feed-enter ${isNew ? 'watch-new-badge' : ''}`}
                style={{
                  padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
                  background: bg.card, border: `1px solid ${border.light}`,
                  marginBottom: 6, boxShadow: shadow.sm, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setExpandedIncident(isExpanded ? null : inc.id);
                  setSelectedIncident(inc);
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm }}>
                  <div style={{ flex: 1 }}>
                    {isNew && (
                      <span style={{
                        display: 'inline-block', padding: '1px 5px', borderRadius: radius.sm,
                        background: status.red, color: '#fff', fontSize: '9px',
                        fontWeight: fontWeight.semibold, marginBottom: 3, letterSpacing: '0.05em',
                      }}>
                        NEW
                      </span>
                    )}
                    <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary, lineHeight: 1.3 }}>
                      {inc.title}
                    </div>
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: text.muted, whiteSpace: 'nowrap', fontFamily: font.mono }}>
                    {fmtAgo(inc.timestamp)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: space.sm, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                    borderRadius: radius.sm, background: status.redBg, color: status.red,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {VIOLENT_CRIME_LABELS[inc.crimeType]}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                    borderRadius: radius.sm,
                    background: inc.confidence === 'CONFIRMED' ? status.greenBg : inc.confidence === 'CORROBORATED' ? status.blueBg : status.amberBg,
                    color: inc.confidence === 'CONFIRMED' ? status.green : inc.confidence === 'CORROBORATED' ? status.blue : status.amber,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {inc.confidence} {inc.confidenceScore}%
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                    borderRadius: radius.sm, background: bg.subtle, color: text.muted,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {inc.source}
                  </span>
                  {inc.isEstimatedLocation && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                      borderRadius: radius.sm, background: status.amberBg, color: status.amber,
                      fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                    }}>
                      EST. LOC
                    </span>
                  )}
                  {campusName && distStr && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                      borderRadius: radius.sm, background: bg.subtle, color: text.secondary,
                      fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                    }}>
                      {distStr} · {campusName}
                    </span>
                  )}
                  {inc.corroboratedBy.length > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                      borderRadius: radius.sm, background: status.greenBg, color: status.green,
                      fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                    }}>
                      +{inc.corroboratedBy.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Source Freshness Bar */}
        <FreshnessBar data={data} />
      </div>
    </div>
  );
};

export default CEOView;
