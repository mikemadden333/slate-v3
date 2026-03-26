/**
 * Watch v2 — Principal Campus View ($5M Mars Lander)
 * "What's happening near my school right now?"
 *
 * Features:
 * - LIVING MAP: Age-decayed markers, breathing threat rings
 * - CONFIDENCE WATERFALL: Visual pipeline showing source corroboration
 * - DIRECTION INDICATORS: "0.3 mi NW of campus" with compass bearing
 * - THREAT TRAJECTORY: Rising/falling/stable indicator
 * - Retaliation window tracker (72h post-shooting)
 * - Dismissal risk window
 * - Flashing new alerts + audio chime
 * - Source freshness bar
 *
 * Layout: Left 55% = Campus-centered map | Right 45% = Briefing + Feed
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WatchDataState } from './useWatchData';
import type { WatchIncident, CampusThreat, ThreatLevel } from './types';
import { THREAT_CONFIG, VIOLENT_CRIME_LABELS, CONFIDENCE_SCORE } from './types';
import { CAMPUSES } from '../data/campuses';
import { haversine, fmtAgo, bearing, compassLabel } from '../engine/geo';
import { brand, bg, text, font, fontSize, fontWeight, border, shadow, radius, space, status } from '../../../core/theme';

// ─── CSS Animations ──────────────────────────────────────────────────────

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
`;

// ─── Helpers ─────────────────────────────────────────────────────────────

function isDismissalWindow(): boolean {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  return totalMin >= 870 && totalMin <= 960;
}

function directionFromCampus(campusLat: number, campusLng: number, incLat: number, incLng: number, dist: number): string {
  const b = bearing(campusLat, campusLng, incLat, incLng);
  const dir = compassLabel(b);
  return `${dist.toFixed(2)} mi ${dir}`;
}

function getThreatTrajectory(incidents: WatchIncident[], campusLat: number, campusLng: number): 'rising' | 'falling' | 'stable' {
  const now = Date.now();
  const threeHoursAgo = now - 3 * 3600000;
  const sixHoursAgo = now - 6 * 3600000;
  const recent = incidents.filter(i => {
    const ts = new Date(i.timestamp).getTime();
    return ts >= threeHoursAgo && haversine(campusLat, campusLng, i.lat, i.lng) <= 1.0;
  }).length;
  const earlier = incidents.filter(i => {
    const ts = new Date(i.timestamp).getTime();
    return ts >= sixHoursAgo && ts < threeHoursAgo && haversine(campusLat, campusLng, i.lat, i.lng) <= 1.0;
  }).length;
  if (recent > earlier + 1) return 'rising';
  if (recent < earlier - 1) return 'falling';
  return 'stable';
}

function getRetaliationRisk(incidents: WatchIncident[]): { active: boolean; shootingAge: number; description: string } | null {
  const shootings = incidents.filter(i =>
    (i.crimeType === 'SHOOTING' || i.crimeType === 'HOMICIDE') && i.ageMinutes <= 4320
  );
  if (shootings.length === 0) return null;
  const newest = shootings.reduce((a, b) =>
    new Date(a.timestamp).getTime() > new Date(b.timestamp).getTime() ? a : b
  );
  const ageHours = newest.ageMinutes / 60;
  const remaining = Math.max(0, 72 - ageHours);
  return {
    active: remaining > 0,
    shootingAge: ageHours,
    description: remaining > 0
      ? `Retaliation window active — ${Math.round(remaining)}h remaining after ${newest.crimeType.toLowerCase()} ${fmtAgo(newest.timestamp)}`
      : '',
  };
}

// ─── Confidence Waterfall ────────────────────────────────────────────────

function ConfidenceWaterfall({ incident }: { incident: WatchIncident }) {
  const stages: Array<{ source: string; level: string; score: number; color: string; active: boolean }> = [];
  stages.push({ source: incident.source, level: 'REPORTED', score: 70, color: status.amber, active: true });
  for (const corr of incident.corroboratedBy) {
    if (corr === 'CPD') {
      stages.push({ source: 'CPD', level: 'CONFIRMED', score: 95, color: status.green, active: true });
    } else {
      stages.push({ source: corr, level: 'CORROBORATED', score: 85, color: status.blue, active: true });
    }
  }
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
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: stage.active ? `${stage.color}15` : '#F0F0F0',
              border: `2px solid ${stage.active ? stage.color : '#D0D5DD'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {stage.active && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
              )}
            </div>
            <div style={{ flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: stage.active ? text.primary : text.light, fontFamily: font.mono }}>
              {stage.source}
            </div>
            <div style={{
              padding: '2px 8px', borderRadius: radius.sm,
              background: stage.active ? `${stage.color}12` : '#F5F5F5',
              fontSize: fontSize.xs, fontWeight: fontWeight.medium,
              color: stage.active ? stage.color : text.light, fontFamily: font.mono,
            }}>
              {stage.active ? `${stage.level} ${stage.score}%` : 'AWAITING'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#EDF2F7', overflow: 'hidden' }}>
          <div style={{
            width: `${incident.confidenceScore}%`, height: '100%', borderRadius: 3,
            background: incident.confidence === 'CONFIRMED' ? status.green : incident.confidence === 'CORROBORATED' ? status.blue : status.amber,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <span style={{
          fontSize: fontSize.sm, fontWeight: fontWeight.semibold, fontFamily: font.mono, minWidth: 40, textAlign: 'right',
          color: incident.confidence === 'CONFIRMED' ? status.green : incident.confidence === 'CORROBORATED' ? status.blue : status.amber,
        }}>
          {incident.confidenceScore}%
        </span>
      </div>
    </div>
  );
}

// ─── Incident Detail Panel ───────────────────────────────────────────────

function IncidentDetail({ incident, campus, onClose }: {
  incident: WatchIncident;
  campus: CampusThreat;
  onClose: () => void;
}) {
  const dirStr = incident.distanceToCampus !== null
    ? directionFromCampus(campus.lat, campus.lng, incident.lat, incident.lng, incident.distanceToCampus)
    : '';

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%',
      background: bg.card, zIndex: 20, display: 'flex', flexDirection: 'column',
      animation: 'watchSlideIn 0.2s ease-out', boxShadow: '-4px 0 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{
            fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
            color: status.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
          }}>
            {VIOLENT_CRIME_LABELS[incident.crimeType]}
          </div>
          <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: text.primary, lineHeight: 1.3 }}>
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
          <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Reported</div>
          <div style={{ fontSize: fontSize.base, color: text.primary }}>
            {new Date(incident.timestamp).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
            <span style={{ color: text.muted, marginLeft: 8 }}>({fmtAgo(incident.timestamp)})</span>
          </div>
        </div>

        {/* CONFIDENCE WATERFALL */}
        <ConfidenceWaterfall incident={incident} />

        {/* Location with direction */}
        <div style={{ marginBottom: space.lg }}>
          <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Location</div>
          <div style={{ fontSize: fontSize.base, color: text.primary }}>
            {dirStr ? (
              <span>
                <strong style={{ fontWeight: fontWeight.semibold }}>{dirStr}</strong>
                <span style={{ color: text.secondary }}> of {campus.campusShort}</span>
              </span>
            ) : (
              <span>{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</span>
            )}
            {incident.isEstimatedLocation && (
              <span style={{
                marginLeft: 8, padding: '1px 6px', borderRadius: radius.sm,
                background: status.amberBg, color: status.amber,
                fontSize: fontSize.xs, fontWeight: fontWeight.medium,
              }}>ESTIMATED</span>
            )}
          </div>
        </div>

        {/* Description */}
        {incident.description && incident.description !== incident.title && (
          <div style={{ marginBottom: space.lg }}>
            <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Details</div>
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
            <div style={{ fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Scanner Audio</div>
            <audio controls src={incident.scannerAudioUrl} style={{ width: '100%' }} />
          </div>
        )}

        {/* Source Link */}
        {incident.url && (
          <a href={incident.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: radius.md,
            background: status.blueBg, color: status.blue,
            fontSize: fontSize.sm, fontWeight: fontWeight.medium,
            textDecoration: 'none', border: `1px solid ${status.blueBorder}`,
          }}>
            View Source →
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Campus Map (Living Map) ─────────────────────────────────────────────

function CampusMap({ campus, incidents, onSelectIncident, newIncidentIds }: {
  campus: CampusThreat;
  incidents: WatchIncident[];
  onSelectIncident: (inc: WatchIncident) => void;
  newIncidentIds: Set<string>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([campus.lat, campus.lng], 14);
    } else {
      const map = L.map(mapRef.current, { center: [campus.lat, campus.lng], zoom: 14, zoomControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '', maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
      setTimeout(() => map.invalidateSize(), 100);
    }

    const lg = layerGroupRef.current!;
    lg.clearLayers();

    // Radius rings with breathing for elevated status
    const isElevated = campus.threatLevel !== 'GREEN';
    L.circle([campus.lat, campus.lng], {
      radius: 402.336, fillColor: '#C53030', fillOpacity: isElevated ? 0.06 : 0.04,
      color: '#C53030', opacity: isElevated ? 0.3 : 0.2, weight: 1,
    }).addTo(lg);
    L.circle([campus.lat, campus.lng], {
      radius: 804.672, fillColor: '#C07C1E', fillOpacity: 0.03,
      color: '#C07C1E', opacity: 0.2, weight: 1,
    }).addTo(lg);
    L.circle([campus.lat, campus.lng], {
      radius: 1609.34, fillColor: '#718096', fillOpacity: 0.02,
      color: '#718096', opacity: 0.15, weight: 1,
    }).addTo(lg);

    // Campus marker
    const campusIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;border-radius:50%;
        background:${brand.gold};border:3px solid #fff;
        box-shadow:0 0 10px ${brand.gold}60;
      "></div>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    });
    L.marker([campus.lat, campus.lng], { icon: campusIcon, zIndexOffset: 2000 })
      .bindTooltip(campus.campusShort, { permanent: true, direction: 'top', offset: [0, -16] })
      .addTo(lg);

    // Incident markers — LIVING MAP with age decay
    for (const inc of incidents) {
      const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      if (dist > 1.5 || inc.ageMinutes > 360) continue;

      const isNew = newIncidentIds.has(inc.id);
      const severity = inc.crimeType === 'HOMICIDE' || inc.crimeType === 'SHOOTING' ? 'high' : 'medium';
      const isEstimated = inc.isEstimatedLocation;

      // AGE DECAY
      const ageRatio = Math.min(1, inc.ageMinutes / 360);
      const baseOpacity = severity === 'high' ? 0.95 : 0.7;
      const decayedOpacity = baseOpacity * (1 - ageRatio * 0.7);
      const baseRadius = severity === 'high' ? 8 : 5;
      const r = isNew ? baseRadius + 2 : baseRadius;

      // Pulsing glow for new
      if (isNew) {
        const glowSize = r * 5;
        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:${glowSize}px;height:${glowSize}px;border-radius:50%;
            background:radial-gradient(circle, rgba(197,48,48,0.25) 0%, rgba(197,48,48,0) 70%);
            animation:watchPulseRed 1.5s ease-in-out infinite;
          "></div>`,
          iconSize: [glowSize, glowSize], iconAnchor: [glowSize / 2, glowSize / 2],
        });
        L.marker([inc.lat, inc.lng], { icon: pulseIcon, interactive: false, zIndexOffset: 500 }).addTo(lg);
      }

      const marker = L.circleMarker([inc.lat, inc.lng], {
        radius: r, fillColor: status.red, fillOpacity: decayedOpacity,
        color: isEstimated ? status.amber : '#FFFFFF',
        weight: isEstimated ? 2 : 1.5,
        dashArray: isEstimated ? '3,3' : undefined,
      }).addTo(lg);

      // Direction from campus
      const dirStr = directionFromCampus(campus.lat, campus.lng, inc.lat, inc.lng, dist);

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
          <div style="font-size:12px;color:#5A6A7E;margin-top:2px;font-weight:500;">${dirStr} of ${campus.campusShort}</div>
          ${inc.corroboratedBy.length > 0 ? `<div style="font-size:11px;color:${status.green};margin-top:4px;font-weight:500;">+ Corroborated by ${inc.corroboratedBy.join(', ')}</div>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent, { maxWidth: 320 });
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
        ">⚠ DISMISSAL WINDOW ACTIVE</div>`,
        iconSize: [180, 24], iconAnchor: [90, 12],
      });
      L.marker([campus.lat + 0.012, campus.lng], { icon: dismissalIcon, interactive: false, zIndexOffset: 2000 }).addTo(lg);
    }

    return () => {};
  }, [campus, incidents, newIncidentIds, onSelectIncident]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── Briefing Generator (Intelligence Narrative) ─────────────────────────

function generateBriefing(campus: CampusThreat, allIncidents: WatchIncident[]): string {
  const config = THREAT_CONFIG[campus.threatLevel];

  if (campus.threatLevel === 'GREEN') {
    return `No violent incidents within one mile of ${campus.campusShort} in the last six hours. All intelligence sources are active and reporting. Current status: ${config.description.toLowerCase()}.`;
  }

  const closest = campus.nearestIncident;
  if (!closest) return `${campus.campusShort} is at ${config.label} status. Monitoring continues across all sources.`;

  const dirStr = campus.nearestDistance !== null
    ? directionFromCampus(campus.lat, campus.lng, closest.lat, closest.lng, campus.nearestDistance)
    : 'nearby';

  let briefing = `${campus.campusShort} is at ${config.label} status. `;
  briefing += `Nearest incident: ${closest.title.toLowerCase()} — ${dirStr} of campus — reported ${fmtAgo(closest.timestamp)}. `;

  if (campus.incidents.length > 1) {
    briefing += `${campus.incidents.length} total violent incidents within one mile. `;
  }

  // Source attribution — the holy grail
  if (closest.confidence === 'CONFIRMED') {
    briefing += `This has been confirmed by CPD records (${closest.confidenceScore}% confidence). `;
  } else if (closest.confidence === 'CORROBORATED') {
    briefing += `Corroborated by ${closest.corroboratedBy.join(' + ')} (${closest.confidenceScore}% confidence). `;
  } else {
    briefing += `Single-source report from ${closest.source} — not yet corroborated (${closest.confidenceScore}% confidence). `;
  }

  // Trajectory
  const trajectory = getThreatTrajectory(allIncidents, campus.lat, campus.lng);
  if (trajectory === 'rising') {
    briefing += 'Threat trajectory is RISING — more activity in the last 3 hours than the previous 3. ';
  } else if (trajectory === 'falling') {
    briefing += 'Threat trajectory is falling — activity decreasing. ';
  }

  if (isDismissalWindow()) {
    briefing += '⚠ DISMISSAL WINDOW — heightened monitoring in effect.';
  }

  return briefing;
}

function getRecommendedAction(campus: CampusThreat): { title: string; text: string; color: string; bgColor: string } {
  const dismissal = isDismissalWindow();
  switch (campus.threatLevel) {
    case 'RED':
      return {
        title: dismissal ? 'CRITICAL: Active Threat During Dismissal' : 'Recommended Action: Heightened Alert',
        text: dismissal
          ? 'Active threat within 0.25 miles DURING DISMISSAL. Consider holding students, enhanced security at exits, and immediate communication to families. Contact law enforcement liaison.'
          : 'Active threat within 0.25 miles. Consider enhanced security posture, communication to staff, and monitoring of student movement. Contact local law enforcement liaison for situational update.',
        color: status.red, bgColor: status.redBg,
      };
    case 'ORANGE':
      return {
        title: 'Recommended Action: Elevated Awareness',
        text: 'Confirmed activity within 0.5 miles. Ensure security team is briefed. Monitor situation for escalation. Prepare communication templates in case of further developments.',
        color: '#C05621', bgColor: 'rgba(192, 86, 33, 0.08)',
      };
    case 'AMBER':
      return {
        title: 'Recommended Action: Monitor',
        text: 'Activity reported within 1 mile. No immediate action required. Continue monitoring. This status will auto-clear if no further incidents are reported.',
        color: status.amber, bgColor: status.amberBg,
      };
    default:
      return {
        title: 'Status: All Clear',
        text: 'No violent incidents within 1 mile in the last 6 hours. Normal operations.',
        color: status.green, bgColor: status.greenBg,
      };
  }
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
          <div key={s.name} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', borderRadius: radius.sm }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: isLive ? `0 0 4px ${color}` : 'none' }} />
            <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: text.muted, fontWeight: fontWeight.medium }}>{s.name}</span>
            <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color, fontWeight: fontWeight.medium, marginLeft: 'auto' }}>{ageStr}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Principal View Component ────────────────────────────────────────────

interface PrincipalViewProps {
  data: WatchDataState;
  campusId: number;
  onBack: () => void;
}

export const PrincipalView: React.FC<PrincipalViewProps> = ({ data, campusId, onBack }) => {
  const [selectedIncident, setSelectedIncident] = useState<WatchIncident | null>(null);
  const previousIncidentIds = useRef<Set<string>>(new Set());
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());

  const campusThreat = data.campusThreats.find(c => c.campusId === campusId);
  const campusInfo = CAMPUSES.find(c => c.id === campusId);

  const handleSelectIncident = useCallback((inc: WatchIncident) => {
    setSelectedIncident(inc);
  }, []);

  useEffect(() => {
    const currentIds = new Set(data.incidents.map(i => i.id));
    const newIds = new Set<string>();
    for (const id of currentIds) {
      if (!previousIncidentIds.current.has(id)) newIds.add(id);
    }
    if (newIds.size > 0 && previousIncidentIds.current.size > 0) {
      setNewIncidentIds(newIds);
      setTimeout(() => setNewIncidentIds(new Set()), 60000);
    }
    previousIncidentIds.current = currentIds;
  }, [data.incidents]);

  if (!campusThreat || !campusInfo) {
    return (
      <div style={{ display: 'flex', height: '100%', background: bg.app, fontFamily: font.body, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: text.muted }}>Campus not found</div>
      </div>
    );
  }

  const config = THREAT_CONFIG[campusThreat.threatLevel];
  const briefing = generateBriefing(campusThreat, data.incidents);
  const action = getRecommendedAction(campusThreat);
  const retaliationRisk = getRetaliationRisk(campusThreat.incidents);
  const dismissalActive = isDismissalWindow();
  const trajectory = getThreatTrajectory(data.incidents, campusInfo.lat, campusInfo.lng);

  const within025 = campusThreat.incidents.filter(i => haversine(campusInfo.lat, campusInfo.lng, i.lat, i.lng) <= 0.25).length;
  const within05 = campusThreat.incidents.filter(i => haversine(campusInfo.lat, campusInfo.lng, i.lat, i.lng) <= 0.5).length;
  const within1 = campusThreat.incidents.length;

  return (
    <div style={{
      display: 'flex', height: '100%', background: bg.app,
      fontFamily: font.body, color: text.primary, overflow: 'hidden',
    }}>
      <style>{PULSE_CSS}</style>

      {/* LEFT: Campus Map */}
      <div style={{
        flex: '0 0 55%', position: 'relative',
        background: '#E8E4DD', borderRight: `1px solid ${border.light}`,
      }}>
        <CampusMap
          campus={campusThreat}
          incidents={data.incidents}
          onSelectIncident={handleSelectIncident}
          newIncidentIds={newIncidentIds}
        />

        {/* Map legend */}
        <div style={{
          position: 'absolute', bottom: space.lg, left: space.lg,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          borderRadius: radius.md, padding: `${space.sm} ${space.md}`,
          boxShadow: shadow.sm, border: `1px solid ${border.light}`,
          zIndex: 10, fontSize: fontSize.xs, color: text.secondary,
        }}>
          <div style={{ display: 'flex', gap: space.md, alignItems: 'center' }}>
            <span style={{ color: status.red }}>◯ ¼ mi</span>
            <span style={{ color: status.amber }}>◯ ½ mi</span>
            <span>◯ 1 mi</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: brand.gold, display: 'inline-block' }} />
              Campus
            </span>
          </div>
        </div>

        {data.isRefreshing && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${brand.gold}, transparent)`,
          }} />
        )}
      </div>

      {/* RIGHT: Briefing + Feed */}
      <div style={{
        flex: '0 0 45%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Incident detail overlay */}
        {selectedIncident && (
          <IncidentDetail
            incident={selectedIncident}
            campus={campusThreat}
            onClose={() => setSelectedIncident(null)}
          />
        )}

        {/* Back button */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: space.xs,
            padding: `${space.sm} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
            background: bg.subtle, fontSize: fontSize.sm, color: text.muted,
            cursor: 'pointer',
          }}
          onClick={onBack}
        >
          ← Back to Network View
        </div>

        {/* Campus header with trajectory */}
        <div style={{
          padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
          background: dismissalActive ? 'rgba(197, 48, 48, 0.04)' : bg.card,
          borderLeft: `3px solid ${config.color}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{
                fontFamily: font.display, fontSize: fontSize['2xl'],
                fontWeight: fontWeight.light, color: text.primary, margin: 0,
              }}>
                {campusInfo.name}
              </h2>
              <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 2 }}>
                {campusInfo.addr} · {campusInfo.communityArea}
              </div>
            </div>
            {/* Trajectory indicator */}
            {trajectory !== 'stable' && (
              <div style={{
                padding: '4px 10px', borderRadius: radius.sm,
                background: trajectory === 'rising' ? status.redBg : status.greenBg,
                color: trajectory === 'rising' ? status.red : status.green,
                fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: '14px' }}>{trajectory === 'rising' ? '↑' : '↓'}</span>
                {trajectory === 'rising' ? 'RISING' : 'FALLING'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: radius.sm,
              background: config.bgColor, color: config.color,
              fontSize: fontSize.xs, fontWeight: fontWeight.medium,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
              {config.label} — {config.description}
            </div>
            {dismissalActive && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: radius.sm,
                background: status.redBg, color: status.red,
                fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: '0.05em',
              }}>
                ⚠ DISMISSAL WINDOW
              </div>
            )}
          </div>
        </div>

        {/* Radius summary */}
        <div style={{
          display: 'flex', gap: space.md, padding: `${space.md} ${space.xl}`,
          borderBottom: `1px solid ${border.light}`, background: bg.card,
        }}>
          {[
            { count: within025, label: 'Within ¼ mile', color: within025 > 0 ? status.red : status.green },
            { count: within05, label: 'Within ½ mile', color: within05 > 0 ? status.amber : status.green },
            { count: within1, label: 'Within 1 mile', color: within1 > 0 ? text.secondary : status.green },
          ].map(({ count, label, color }) => (
            <div key={label} style={{
              flex: 1, padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
              background: bg.subtle, textAlign: 'center',
            }}>
              <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: '10px', color: text.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Intelligence Briefing */}
        <div style={{
          padding: `${space.md} ${space.xl}`, borderBottom: `1px solid ${border.light}`, background: bg.card,
        }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: space.sm, fontWeight: fontWeight.medium,
          }}>
            Campus Briefing
          </div>
          <div style={{ fontSize: fontSize.base, color: text.primary, lineHeight: 1.65 }}>
            {briefing}
          </div>
        </div>

        {/* Retaliation risk warning */}
        {retaliationRisk?.active && (
          <div style={{
            padding: `${space.sm} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
            background: 'rgba(197, 48, 48, 0.04)',
          }}>
            <div style={{
              fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
              color: status.red, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2,
            }}>
              ⚠ Retaliation Risk Window
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.5 }}>
              {retaliationRisk.description}
            </div>
          </div>
        )}

        {/* Recommended action */}
        <div style={{ padding: `${space.md} ${space.xl}`, borderBottom: `1px solid ${border.light}` }}>
          <div style={{
            padding: `${space.md} ${space.lg}`, borderRadius: radius.md,
            background: action.bgColor, border: `1px solid ${action.color}30`,
          }}>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: action.color, marginBottom: 4 }}>
              {action.title}
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.5 }}>
              {action.text}
            </div>
          </div>
        </div>

        {/* Incident feed with direction indicators */}
        <div style={{ flex: 1, overflow: 'auto', padding: `${space.md} ${space.xl}` }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: space.sm, fontWeight: fontWeight.medium,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Incidents Near {campusThreat.campusShort} — Last 6 Hours</span>
            <span style={{ fontFamily: font.mono, color: text.light }}>{campusThreat.incidents.length}</span>
          </div>

          {campusThreat.incidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: space['2xl'], color: text.muted }}>
              <div style={{ fontSize: fontSize.lg, marginBottom: space.sm, color: status.green }}>All Clear</div>
              <div style={{ fontSize: fontSize.sm }}>No violent incidents within 1 mile</div>
            </div>
          )}

          {campusThreat.incidents.map(inc => {
            const dist = haversine(campusInfo.lat, campusInfo.lng, inc.lat, inc.lng);
            const dirStr = directionFromCampus(campusInfo.lat, campusInfo.lng, inc.lat, inc.lng, dist);
            const isNew = newIncidentIds.has(inc.id);
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
                  opacity: cardOpacity,
                }}
                onClick={() => setSelectedIncident(inc)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {isNew && (
                      <span style={{
                        display: 'inline-block', padding: '1px 5px', borderRadius: radius.sm,
                        background: status.red, color: '#fff', fontSize: '9px',
                        fontWeight: fontWeight.semibold, marginBottom: 3, letterSpacing: '0.05em',
                      }}>NEW</span>
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
                    display: 'inline-flex', padding: '1px 6px', borderRadius: radius.sm,
                    background: status.redBg, color: status.red,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {VIOLENT_CRIME_LABELS[inc.crimeType]}
                  </span>
                  <span style={{
                    display: 'inline-flex', padding: '1px 6px', borderRadius: radius.sm,
                    background: inc.confidence === 'CONFIRMED' ? status.greenBg : inc.confidence === 'CORROBORATED' ? status.blueBg : status.amberBg,
                    color: inc.confidence === 'CONFIRMED' ? status.green : inc.confidence === 'CORROBORATED' ? status.blue : status.amber,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {inc.confidence} {inc.confidenceScore}%
                  </span>
                  <span style={{
                    display: 'inline-flex', padding: '1px 6px', borderRadius: radius.sm,
                    background: bg.subtle, color: text.secondary,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {dirStr}
                  </span>
                  <span style={{
                    display: 'inline-flex', padding: '1px 6px', borderRadius: radius.sm,
                    background: bg.subtle, color: text.muted,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {inc.source}
                  </span>
                  {inc.isEstimatedLocation && (
                    <span style={{
                      display: 'inline-flex', padding: '1px 6px', borderRadius: radius.sm,
                      background: status.amberBg, color: status.amber,
                      fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                    }}>EST. LOC</span>
                  )}
                  {inc.corroboratedBy.length > 0 && (
                    <span style={{
                      display: 'inline-flex', padding: '1px 6px', borderRadius: radius.sm,
                      background: status.greenBg, color: status.green,
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

export default PrincipalView;
