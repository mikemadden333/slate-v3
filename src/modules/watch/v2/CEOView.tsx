/**
 * Watch v2 — CEO Network View (Common Operating Picture)
 * $5M Mars Lander Build — "Are my students in danger right now?"
 *
 * Features:
 * - LIVING MAP: Incident markers fade with age, threat rings pulse, severity = glow intensity
 * - INTELLIGENCE NARRATIVE: Briefing tells a story with reasoning chains
 * - CONFIDENCE WATERFALL: Visual pipeline showing how sources build confidence
 * - DEMO MODE: Hidden toggle (Ctrl+Shift+D) injects simulated incident
 * - DIRECTION INDICATORS: "0.3 mi NW of Englewood" with compass bearing
 * - SURPRISE 1: Source Corroboration Timeline — see when each source confirmed
 * - SURPRISE 2: Threat Trajectory — is this campus getting safer or more dangerous?
 * - Flashing red pulse on new alerts
 * - Audio alert on RED campus
 * - Dismissal risk window
 * - Timeline sparkline
 * - Source freshness bar
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
import { fmtAgo, haversine, bearing, compassLabel } from '../engine/geo';

// ─── CSS Animations ─────────────────────────────────────────────────────

const PULSE_CSS = `
@keyframes watchPulseRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(197, 48, 48, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(197, 48, 48, 0); }
}
@keyframes watchPulseRing {
  0%, 100% { opacity: 0.06; }
  50% { opacity: 0.12; }
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
@keyframes watchGlow {
  0%, 100% { box-shadow: 0 0 4px rgba(197, 48, 48, 0.6); }
  50% { box-shadow: 0 0 12px rgba(197, 48, 48, 0.9); }
}
@keyframes watchBreath {
  0%, 100% { transform: scale(1); opacity: 0.06; }
  50% { transform: scale(1.02); opacity: 0.10; }
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

// ─── Dismissal Window ────────────────────────────────────────────────────

function isDismissalWindow(): boolean {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  return totalMin >= 870 && totalMin <= 960; // 14:30 - 16:00
}

// ─── Direction Indicator ─────────────────────────────────────────────────

function directionFromCampus(campusLat: number, campusLng: number, incLat: number, incLng: number, dist: number): string {
  const b = bearing(campusLat, campusLng, incLat, incLng);
  const dir = compassLabel(b);
  return `${dist.toFixed(2)} mi ${dir}`;
}

// ─── Threat Trajectory (SURPRISE 2) ──────────────────────────────────────
// Compares last 3 hours vs previous 3 hours to determine if threat is rising/falling

function getThreatTrajectory(incidents: WatchIncident[], campusLat: number, campusLng: number): 'rising' | 'falling' | 'stable' {
  const now = Date.now();
  const threeHoursAgo = now - 3 * 3600000;
  const sixHoursAgo = now - 6 * 3600000;

  const recent = incidents.filter(i => {
    const ts = new Date(i.timestamp).getTime();
    const dist = haversine(campusLat, campusLng, i.lat, i.lng);
    return ts >= threeHoursAgo && dist <= 1.0;
  }).length;

  const earlier = incidents.filter(i => {
    const ts = new Date(i.timestamp).getTime();
    const dist = haversine(campusLat, campusLng, i.lat, i.lng);
    return ts >= sixHoursAgo && ts < threeHoursAgo && dist <= 1.0;
  }).length;

  if (recent > earlier + 1) return 'rising';
  if (recent < earlier - 1) return 'falling';
  return 'stable';
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

// ─── Intelligence Narrative Generator ────────────────────────────────────
// This is the STORY — not just data, but reasoning.

function generateIntelligenceNarrative(data: WatchDataState): string {
  const net = data.networkStatus;
  if (!net) return 'Initializing intelligence feeds...';

  const elevated = data.campusThreats.filter(c => c.threatLevel !== 'GREEN');
  const red = data.campusThreats.filter(c => c.threatLevel === 'RED');
  const orange = data.campusThreats.filter(c => c.threatLevel === 'ORANGE');
  const totalIncidents = data.incidents.filter(i => i.ageMinutes <= 360).length;
  const corroborated = data.incidents.filter(i => i.corroboratedBy.length > 0 && i.ageMinutes <= 360).length;
  const confirmed = data.incidents.filter(i => i.confidence === 'CONFIRMED' && i.ageMinutes <= 360).length;
  const multiSource = corroborated + confirmed;
  const dismissal = isDismissalWindow();

  // All clear
  if (elevated.length === 0) {
    const sourceCount = [
      net.dataAge.citizen < 999 ? 'Citizen' : null,
      net.dataAge.scanner < 999 ? 'Scanner' : null,
      net.dataAge.news < 999 ? 'News' : null,
      net.dataAge.cpd < 999 ? 'CPD' : null,
    ].filter(Boolean).length;
    return `All ${data.campusThreats.length} campuses clear. ${sourceCount} intelligence sources active and reporting. No violent incidents within network radius in the last 6 hours. ${Math.round(net.weather.tempF)}°F, ${net.weather.condition.toLowerCase()}.`;
  }

  let narrative = '';

  // Lead with the worst news
  if (red.length > 0) {
    const redNames = red.map(c => c.campusShort).join(', ');
    const nearest = red[0].nearestIncident;
    narrative += `ALERT: ${red.length === 1 ? redNames + ' is' : redNames + ' are'} at alert status. `;
    if (nearest) {
      const dir = directionFromCampus(red[0].lat, red[0].lng, nearest.lat, nearest.lng, red[0].nearestDistance ?? 0);
      narrative += `Active ${VIOLENT_CRIME_LABELS[nearest.crimeType].toLowerCase()} ${dir} of ${red[0].campusShort} — ${nearest.confidence.toLowerCase()} by ${nearest.source}${nearest.corroboratedBy.length > 0 ? ` + ${nearest.corroboratedBy.join(', ')}` : ''}. `;
    }
  }

  if (orange.length > 0) {
    narrative += `${orange.length} campus${orange.length > 1 ? 'es' : ''} elevated (${orange.map(c => c.campusShort).join(', ')}). `;
  }

  // Intelligence quality assessment
  if (totalIncidents > 0) {
    narrative += `${totalIncidents} active incident${totalIncidents !== 1 ? 's' : ''} across the network`;
    if (multiSource > 0) {
      narrative += ` — ${multiSource} confirmed by multiple sources`;
    }
    narrative += '. ';
  }

  // Clear campuses
  const clear = data.campusThreats.filter(c => c.threatLevel === 'GREEN');
  if (clear.length > 0 && clear.length <= 8) {
    narrative += `${clear.length} campus${clear.length > 1 ? 'es' : ''} all clear. `;
  }

  // Dismissal window
  if (dismissal) {
    narrative += '⚠ DISMISSAL WINDOW ACTIVE — heightened monitoring in effect.';
  }

  return narrative;
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

// ─── Confidence Waterfall (the holy grail visual) ────────────────────────

function ConfidenceWaterfall({ incident }: { incident: WatchIncident }) {
  const stages: Array<{ source: string; level: string; score: number; color: string; active: boolean }> = [];

  // Primary source
  stages.push({
    source: incident.source,
    level: 'REPORTED',
    score: 70,
    color: status.amber,
    active: true,
  });

  // Corroboration stages
  for (const corr of incident.corroboratedBy) {
    if (corr === 'CPD') {
      stages.push({ source: 'CPD', level: 'CONFIRMED', score: 95, color: status.green, active: true });
    } else {
      stages.push({ source: corr, level: 'CORROBORATED', score: 85, color: status.blue, active: true });
    }
  }

  // Show what's NOT yet confirmed (ghost stages)
  const allSources = ['CITIZEN', 'SCANNER', 'NEWS', 'CPD'] as const;
  const activeSources = new Set([incident.source, ...incident.corroboratedBy]);
  for (const s of allSources) {
    if (!activeSources.has(s)) {
      stages.push({ source: s, level: 'AWAITING', score: 0, color: '#A0AEC0', active: false });
    }
  }

  return (
    <div style={{ marginBottom: space.lg }}>
      <div style={{
        fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 8, fontWeight: fontWeight.medium,
      }}>
        Confidence Pipeline
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stages.map((stage, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Connector line */}
            {i > 0 && (
              <div style={{
                position: 'absolute', marginLeft: 11, marginTop: -18,
                width: 1, height: 12,
                background: stage.active ? stage.color : '#D0D5DD',
              }} />
            )}
            {/* Source dot */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: stage.active ? `${stage.color}15` : '#F0F0F0',
              border: `2px solid ${stage.active ? stage.color : '#D0D5DD'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {stage.active && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: stage.color,
                }} />
              )}
            </div>
            {/* Source label */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                color: stage.active ? text.primary : text.light,
                fontFamily: font.mono,
              }}>
                {stage.source}
              </div>
            </div>
            {/* Status */}
            <div style={{
              padding: '2px 8px', borderRadius: radius.sm,
              background: stage.active ? `${stage.color}12` : '#F5F5F5',
              fontSize: fontSize.xs, fontWeight: fontWeight.medium,
              color: stage.active ? stage.color : text.light,
              fontFamily: font.mono,
            }}>
              {stage.active ? `${stage.level} ${stage.score}%` : 'AWAITING'}
            </div>
          </div>
        ))}
      </div>
      {/* Final confidence bar */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1, height: 6, borderRadius: 3, background: '#EDF2F7',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${incident.confidenceScore}%`, height: '100%',
            borderRadius: 3,
            background: incident.confidence === 'CONFIRMED' ? status.green
              : incident.confidence === 'CORROBORATED' ? status.blue
              : status.amber,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <span style={{
          fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
          color: incident.confidence === 'CONFIRMED' ? status.green
            : incident.confidence === 'CORROBORATED' ? status.blue
            : status.amber,
          fontFamily: font.mono,
          minWidth: 40, textAlign: 'right',
        }}>
          {incident.confidenceScore}%
        </span>
      </div>
    </div>
  );
}

// ─── Incident Detail Panel ───────────────────────────────────────────────

function IncidentDetail({ incident, campusThreat, onClose }: {
  incident: WatchIncident;
  campusThreat: CampusThreat | undefined;
  onClose: () => void;
}) {
  const campusName = campusThreat?.campusShort ?? '';
  const dirStr = campusThreat && incident.distanceToCampus !== null
    ? directionFromCampus(campusThreat.lat, campusThreat.lng, incident.lat, incident.lng, incident.distanceToCampus)
    : incident.distanceToCampus !== null ? `${incident.distanceToCampus.toFixed(2)} mi` : '';

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
        {/* Time */}
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

        {/* CONFIDENCE WATERFALL — the holy grail */}
        <ConfidenceWaterfall incident={incident} />

        {/* Location with direction */}
        <div style={{ marginBottom: space.lg }}>
          <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Location
          </div>
          <div style={{ fontSize: fontSize.base, color: text.primary }}>
            {dirStr && campusName ? (
              <span>
                <strong style={{ fontWeight: fontWeight.semibold }}>{dirStr}</strong>
                <span style={{ color: text.secondary }}> of {campusName}</span>
              </span>
            ) : (
              <span>{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</span>
            )}
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

// ─── Living Map Component (Leaflet) ──────────────────────────────────────

function WatchMap({ campusThreats, incidents, selectedCampus, onSelectCampus, onSelectIncident, newIncidentIds, demoIncident }: {
  campusThreats: CampusThreat[];
  incidents: WatchIncident[];
  selectedCampus: number | null;
  onSelectCampus: (id: number | null) => void;
  onSelectIncident: (inc: WatchIncident) => void;
  newIncidentIds: Set<string>;
  demoIncident: WatchIncident | null;
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

  // Update markers — LIVING MAP
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();

    // Combine real + demo incidents
    const allIncidents = demoIncident ? [...incidents, demoIncident] : incidents;
    const allNewIds = demoIncident ? new Set([...newIncidentIds, demoIncident.id]) : newIncidentIds;

    // Draw campus markers with BREATHING threat rings
    for (const ct of campusThreats) {
      const config = THREAT_CONFIG[ct.threatLevel];

      // Threat radius circle — BREATHING animation for elevated campuses
      if (ct.threatLevel !== 'GREEN') {
        const ringEl = L.circle([ct.lat, ct.lng], {
          radius: 804.672,
          fillColor: config.color,
          fillOpacity: 0.06,
          color: config.color,
          opacity: 0.25,
          weight: 1.5,
          className: ct.threatLevel === 'RED' ? 'watch-ring-pulse' : '',
        }).addTo(lg);

        // Inner ring for RED campuses
        if (ct.threatLevel === 'RED') {
          L.circle([ct.lat, ct.lng], {
            radius: 402.336,
            fillColor: config.color,
            fillOpacity: 0.08,
            color: config.color,
            opacity: 0.35,
            weight: 1,
          }).addTo(lg);
        }
      }

      // Campus marker
      const isElevated = ct.threatLevel !== 'GREEN';
      const size = isElevated ? 14 : 9;
      const pulseAnim = ct.threatLevel === 'RED' ? 'animation:watchPulseRed 1.5s ease-in-out infinite;' : '';

      // Trajectory indicator (SURPRISE 2)
      const trajectory = getThreatTrajectory(allIncidents, ct.lat, ct.lng);
      const trajectoryArrow = trajectory === 'rising' ? '↑' : trajectory === 'falling' ? '↓' : '';
      const trajectoryColor = trajectory === 'rising' ? status.red : trajectory === 'falling' ? status.green : '';

      const campusIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size * 2}px;height:${size * 2}px;border-radius:50%;
          background:${config.color};border:2.5px solid #fff;
          box-shadow:0 0 8px ${config.color}50;
          cursor:pointer;${pulseAnim}
        "></div>`,
        iconSize: [size * 2, size * 2],
        iconAnchor: [size, size],
      });

      const marker = L.marker([ct.lat, ct.lng], { icon: campusIcon, zIndexOffset: isElevated ? 1000 : 0 })
        .addTo(lg);
      marker.on('click', () => onSelectCampus(ct.campusId));

      // Campus label with trajectory arrow
      const labelHtml = trajectoryArrow
        ? `<div style="
            font-size:11px;font-weight:500;font-family:'IBM Plex Sans',sans-serif;
            color:${text.primary};white-space:nowrap;
            text-shadow:0 0 4px #fff, 0 0 4px #fff, 0 0 6px #fff;
            pointer-events:none;text-align:center;
            transform:translateY(4px);
          ">${ct.campusShort} <span style="color:${trajectoryColor};font-weight:600;">${trajectoryArrow}</span></div>`
        : `<div style="
            font-size:11px;font-weight:500;font-family:'IBM Plex Sans',sans-serif;
            color:${text.primary};white-space:nowrap;
            text-shadow:0 0 4px #fff, 0 0 4px #fff, 0 0 6px #fff;
            pointer-events:none;text-align:center;
            transform:translateY(4px);
          ">${ct.campusShort}</div>`;

      const labelIcon = L.divIcon({
        className: '',
        html: labelHtml,
        iconSize: [100, 18],
        iconAnchor: [50, -size],
      });
      L.marker([ct.lat, ct.lng], { icon: labelIcon, interactive: false }).addTo(lg);
    }

    // Draw incident markers — LIVING MAP with age decay
    for (const inc of allIncidents) {
      if (inc.ageMinutes > 360) continue;

      const isNew = allNewIds.has(inc.id);
      const severity = inc.crimeType === 'HOMICIDE' || inc.crimeType === 'SHOOTING' ? 'high' : 'medium';
      const isEstimated = inc.isEstimatedLocation;

      // AGE DECAY: opacity fades from 1.0 (new) to 0.25 (6h old)
      const ageRatio = Math.min(1, inc.ageMinutes / 360);
      const baseOpacity = severity === 'high' ? 0.95 : 0.7;
      const decayedOpacity = baseOpacity * (1 - ageRatio * 0.7);

      // SIZE: high severity = larger
      const baseRadius = severity === 'high' ? 8 : 5;
      const r = isNew ? baseRadius + 2 : baseRadius;

      // Pulsing glow for new incidents
      if (isNew) {
        const glowSize = r * 5;
        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:${glowSize}px;height:${glowSize}px;border-radius:50%;
            background:radial-gradient(circle, rgba(197,48,48,0.25) 0%, rgba(197,48,48,0) 70%);
            animation:watchPulseRed 1.5s ease-in-out infinite;
          "></div>`,
          iconSize: [glowSize, glowSize],
          iconAnchor: [glowSize / 2, glowSize / 2],
        });
        L.marker([inc.lat, inc.lng], { icon: pulseIcon, interactive: false, zIndexOffset: 500 }).addTo(lg);
      }

      const marker = L.circleMarker([inc.lat, inc.lng], {
        radius: r,
        fillColor: status.red,
        fillOpacity: decayedOpacity,
        color: isEstimated ? status.amber : '#FFFFFF',
        weight: isEstimated ? 2 : 1.5,
        dashArray: isEstimated ? '3,3' : undefined,
      }).addTo(lg);

      // Direction from nearest campus
      const nearestCampus = campusThreats.find(c => c.campusId === inc.nearestCampusId);
      const dirStr = nearestCampus && inc.distanceToCampus !== null
        ? directionFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
        : inc.distanceToCampus !== null ? `${inc.distanceToCampus.toFixed(2)} mi` : '';

      // Rich popup with direction
      const popupContent = `
        <div style="min-width:220px;max-width:300px;">
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
            Confidence: <span style="font-weight:600;color:${inc.confidence === 'CONFIRMED' ? status.green : inc.confidence === 'CORROBORATED' ? status.blue : status.amber};">${inc.confidence} ${inc.confidenceScore}%</span>
          </div>
          ${dirStr && nearestCampus ? `<div style="font-size:12px;color:#5A6A7E;margin-top:2px;font-weight:500;">${dirStr} of ${nearestCampus.campusShort}</div>` : ''}
          ${inc.corroboratedBy.length > 0 ? `<div style="font-size:11px;color:${status.green};margin-top:4px;font-weight:500;">+ Corroborated by ${inc.corroboratedBy.join(', ')}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 320, className: 'watch-popup' });
      marker.on('click', () => onSelectIncident(inc));
    }

    // Dismissal window overlay
    if (isDismissalWindow()) {
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
  }, [campusThreats, incidents, onSelectCampus, onSelectIncident, newIncidentIds, demoIncident]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── Demo Mode (Ctrl+Shift+D) ───────────────────────────────────────────

function createDemoIncident(): WatchIncident {
  // Simulate a shooting near Englewood (campus id 2)
  const campus = { lat: 41.7797, lng: -87.6448 };
  const offsetLat = (Math.random() - 0.5) * 0.004;
  const offsetLng = (Math.random() - 0.5) * 0.004;
  const lat = campus.lat + offsetLat;
  const lng = campus.lng + offsetLng;
  const dist = haversine(campus.lat, campus.lng, lat, lng);

  return {
    id: `demo_${Date.now()}`,
    crimeType: 'SHOOTING',
    title: 'Report of Person Shot Near 63rd and Halsted',
    description: 'Multiple callers reporting shots fired with one person down. Police and EMS responding. Area being secured.',
    lat,
    lng,
    timestamp: new Date().toISOString(),
    source: 'CITIZEN',
    confidence: 'REPORTED',
    confidenceScore: 70,
    corroboratedBy: [],
    nearestCampusId: 2,
    distanceToCampus: dist,
    ageMinutes: 0,
    url: undefined,
    isEstimatedLocation: false,
  };
}

// ─── CEO View Component ──────────────────────────────────────────────────

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
  const [demoMode, setDemoMode] = useState(false);
  const [demoIncident, setDemoIncident] = useState<WatchIncident | null>(null);
  const [demoPhase, setDemoPhase] = useState(0); // 0=off, 1=citizen, 2=scanner, 3=confirmed

  const handleSelectCampus = useCallback((id: number | null) => {
    setSelectedCampus(id);
    if (id) onSelectCampus(id);
  }, [onSelectCampus]);

  const handleSelectIncident = useCallback((inc: WatchIncident) => {
    setSelectedIncident(inc);
  }, []);

  // Demo mode keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (!demoMode) {
          setDemoMode(true);
          const inc = createDemoIncident();
          setDemoIncident(inc);
          setDemoPhase(1);
          setNewIncidentIds(prev => new Set([...prev, inc.id]));
          playAlertChime();

          // Phase 2: Scanner corroboration after 8 seconds
          setTimeout(() => {
            setDemoIncident(prev => prev ? {
              ...prev,
              confidence: 'CORROBORATED',
              confidenceScore: 85,
              corroboratedBy: ['SCANNER'],
            } : null);
            setDemoPhase(2);
          }, 8000);

          // Phase 3: CPD confirmation after 16 seconds
          setTimeout(() => {
            setDemoIncident(prev => prev ? {
              ...prev,
              confidence: 'CONFIRMED',
              confidenceScore: 95,
              corroboratedBy: ['SCANNER', 'CPD'],
            } : null);
            setDemoPhase(3);
          }, 16000);

          // Clear demo after 60 seconds
          setTimeout(() => {
            setDemoMode(false);
            setDemoIncident(null);
            setDemoPhase(0);
          }, 60000);
        } else {
          // Toggle off
          setDemoMode(false);
          setDemoIncident(null);
          setDemoPhase(0);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [demoMode]);

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
      setNewIncidentIds(prev => new Set([...prev, ...newIds]));
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

  // Feed incidents (include demo)
  const feedIncidents = useMemo(() => {
    const real = data.incidents.filter(i => i.ageMinutes <= 360).slice(0, 30);
    if (demoIncident) return [demoIncident, ...real];
    return real;
  }, [data.incidents, demoIncident]);

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
  const narrative = generateIntelligenceNarrative(data);
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
          incidents={data.incidents.filter(i => i.ageMinutes <= 360)}
          selectedCampus={selectedCampus}
          onSelectCampus={handleSelectCampus}
          onSelectIncident={handleSelectIncident}
          newIncidentIds={newIncidentIds}
          demoIncident={demoIncident}
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

        {/* Demo mode indicator */}
        {demoMode && (
          <div style={{
            position: 'absolute', bottom: space.lg, left: space.lg,
            background: 'rgba(197,48,48,0.9)', backdropFilter: 'blur(8px)',
            borderRadius: radius.md, padding: `${space.sm} ${space.md}`,
            boxShadow: shadow.md, zIndex: 10,
            fontSize: fontSize.xs, color: '#fff', fontWeight: fontWeight.semibold,
            fontFamily: font.mono, letterSpacing: '0.05em',
            animation: 'watchPulseRed 1.5s ease-in-out infinite',
          }}>
            DEMO MODE · Phase {demoPhase}/3 · {demoPhase === 1 ? 'CITIZEN REPORT' : demoPhase === 2 ? 'SCANNER CORROBORATION' : 'CPD CONFIRMED'}
          </div>
        )}

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
            campusThreat={data.campusThreats.find(c => c.campusId === selectedIncident.nearestCampusId)}
            onClose={() => setSelectedIncident(null)}
          />
        )}

        {/* Intelligence Narrative */}
        <div style={{
          padding: `${space.md} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
          background: dismissalActive ? 'rgba(197, 48, 48, 0.04)' : bg.card,
        }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 6, fontWeight: fontWeight.medium,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>Intelligence Briefing</span>
            <span style={{
              fontSize: '10px', fontFamily: font.mono, color: text.light,
            }}>
              {data.lastRefresh
                ? `${fmtAgo(data.lastRefresh.toISOString())} · Auto 2m`
                : '...'}
            </span>
          </div>
          <div style={{
            fontSize: fontSize.base, color: text.primary, lineHeight: 1.65,
          }}>
            {narrative}
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
              {(net?.totalActiveIncidents ?? 0) + (demoIncident ? 1 : 0)}
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

        {/* Campus grid with trajectory arrows */}
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
              const trajectory = getThreatTrajectory(data.incidents, ct.lat, ct.lng);
              const trajSymbol = trajectory === 'rising' ? '↑' : trajectory === 'falling' ? '↓' : '';
              const trajColor = trajectory === 'rising' ? status.red : trajectory === 'falling' ? status.green : '';

              return (
                <div
                  key={ct.campusId}
                  style={{
                    padding: '5px 6px', borderRadius: radius.sm,
                    background: config.bgColor, border: `1px solid ${config.color}18`,
                    textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleSelectCampus(ct.campusId)}
                  title={`${ct.campusShort}: ${config.label} — ${ct.incidentCount} incidents${trajectory !== 'stable' ? ` (${trajectory})` : ''}`}
                >
                  <div style={{
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                    color: text.primary, lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {ct.campusShort}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 3 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: config.color,
                    }} />
                    {trajSymbol && (
                      <span style={{ fontSize: '10px', fontWeight: fontWeight.semibold, color: trajColor, lineHeight: 1 }}>
                        {trajSymbol}
                      </span>
                    )}
                  </div>
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
            const nearestCampus = data.campusThreats.find(c => c.campusId === inc.nearestCampusId);
            const dirStr = nearestCampus && inc.distanceToCampus !== null
              ? directionFromCampus(nearestCampus.lat, nearestCampus.lng, inc.lat, inc.lng, inc.distanceToCampus)
              : inc.distanceToCampus !== null ? `${inc.distanceToCampus.toFixed(2)} mi` : '';
            const campusName = nearestCampus?.campusShort ?? '';
            const isNew = newIncidentIds.has(inc.id);
            const isExpanded = expandedIncident === inc.id;

            // Age-based opacity for feed cards too
            const ageRatio = Math.min(1, inc.ageMinutes / 360);
            const cardOpacity = 1 - ageRatio * 0.3;

            return (
              <div
                key={inc.id}
                className={`watch-feed-enter ${isNew ? 'watch-new-badge' : ''}`}
                style={{
                  padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
                  background: bg.card, border: `1px solid ${border.light}`,
                  marginBottom: 6, boxShadow: shadow.sm, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: cardOpacity,
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
                  {dirStr && campusName && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                      borderRadius: radius.sm, background: bg.subtle, color: text.secondary,
                      fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                    }}>
                      {dirStr} · {campusName}
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
