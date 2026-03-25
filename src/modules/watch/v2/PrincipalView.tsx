/**
 * Watch v2 — Principal Campus View (Mars Lander)
 * "What's happening near my school right now?"
 *
 * Features:
 * - Clickable incident markers with rich popups
 * - Flashing new alerts
 * - Dismissal risk window
 * - Retaliation window tracker (72h post-shooting)
 * - Enhanced briefing with source attribution
 * - Freshness bar
 *
 * Layout: Left 55% = Campus-centered map | Right 45% = Briefing + Feed
 * Typography: IBM Plex Sans (intelligence-grade)
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WatchDataState } from './useWatchData';
import type { WatchIncident, CampusThreat, ThreatLevel } from './types';
import { THREAT_CONFIG, VIOLENT_CRIME_LABELS, CONFIDENCE_SCORE } from './types';
import { CAMPUSES } from '../data/campuses';
import { haversine, fmtAgo } from '../engine/geo';
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

// ─── Dismissal Window Check ──────────────────────────────────────────────

function isDismissalWindow(): boolean {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  return totalMin >= 870 && totalMin <= 960; // 14:30 - 16:00
}

// ─── Retaliation Window Check ────────────────────────────────────────────
// After a shooting, there's a 72-hour elevated retaliation risk.

function getRetaliationRisk(incidents: WatchIncident[]): { active: boolean; shootingAge: number; description: string } | null {
  const shootings = incidents.filter(i =>
    (i.crimeType === 'SHOOTING' || i.crimeType === 'HOMICIDE') &&
    i.ageMinutes <= 4320 // 72 hours
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
      animation: 'watchFadeIn 0.2s ease-out',
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

// ─── Campus Map ───────────────────────────────────────────────────────────

function CampusMap({ campus, incidents, onSelectIncident, newIncidentIds }: {
  campus: CampusThreat;
  incidents: WatchIncident[];
  onSelectIncident: (inc: WatchIncident) => void;
  newIncidentIds: Set<string>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([campus.lat, campus.lng], 14);
    } else {
      const map = L.map(mapRef.current, {
        center: [campus.lat, campus.lng],
        zoom: 14,
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
    }

    const lg = layerGroupRef.current!;
    lg.clearLayers();

    // Draw radius rings
    L.circle([campus.lat, campus.lng], {
      radius: 402.336, fillColor: '#C53030', fillOpacity: 0.04,
      color: '#C53030', opacity: 0.25, weight: 1,
    }).addTo(lg);

    L.circle([campus.lat, campus.lng], {
      radius: 804.672, fillColor: '#C07C1E', fillOpacity: 0.03,
      color: '#C07C1E', opacity: 0.2, weight: 1,
    }).addTo(lg);

    L.circle([campus.lat, campus.lng], {
      radius: 1609.34, fillColor: '#718096', fillOpacity: 0.02,
      color: '#718096', opacity: 0.15, weight: 1,
    }).addTo(lg);

    // Campus marker (gold circle)
    const campusIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;border-radius:50%;
        background:${brand.gold};border:3px solid #fff;
        box-shadow:0 0 10px ${brand.gold}60;
      "></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([campus.lat, campus.lng], { icon: campusIcon, zIndexOffset: 2000 })
      .bindTooltip(campus.campusShort, { permanent: true, direction: 'top', offset: [0, -16], className: 'campus-tooltip' })
      .addTo(lg);

    // Incident markers (clickable with popups)
    for (const inc of incidents) {
      const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      if (dist > 1.5) continue;

      const isClose = dist <= 0.25;
      const isNew = newIncidentIds.has(inc.id);
      const isEstimated = inc.isEstimatedLocation;

      // Pulsing ring for new incidents
      if (isNew) {
        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:rgba(197,48,48,0.15);
            animation:watchPulseRed 1.5s ease-in-out infinite;
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([inc.lat, inc.lng], { icon: pulseIcon, interactive: false, zIndexOffset: 500 }).addTo(lg);
      }

      const marker = L.circleMarker([inc.lat, inc.lng], {
        radius: isClose ? 7 : 5,
        fillColor: status.red,
        fillOpacity: isClose ? 0.9 : 0.6,
        color: isEstimated ? status.amber : '#FFFFFF',
        weight: isEstimated ? 2 : 1,
        dashArray: isEstimated ? '3,3' : undefined,
      }).addTo(lg);

      // Rich popup
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
          <div style="font-size:12px;color:#5A6A7E;margin-top:2px;">${dist.toFixed(2)} mi from campus</div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 300 });
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
        iconSize: [180, 24],
        iconAnchor: [90, 12],
      });
      L.marker([campus.lat + 0.012, campus.lng], { icon: dismissalIcon, interactive: false, zIndexOffset: 2000 }).addTo(lg);
    }

    return () => {};
  }, [campus, incidents, newIncidentIds, onSelectIncident]);

  // Cleanup on unmount
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

// ─── AI Briefing Generator ────────────────────────────────────────────────

function generateBriefing(campus: CampusThreat, incidents: WatchIncident[]): string {
  const config = THREAT_CONFIG[campus.threatLevel];

  if (campus.threatLevel === 'GREEN') {
    return `No violent incidents have been reported within one mile of ${campus.campusShort} in the last six hours. All data sources are being monitored continuously. Current status: ${config.description.toLowerCase()}.`;
  }

  const nearby = campus.incidents;
  const closest = campus.nearestIncident;

  if (!closest) {
    return `${campus.campusShort} is at ${config.label} status. Monitoring continues across all sources.`;
  }

  const distStr = campus.nearestDistance !== null ? `${campus.nearestDistance.toFixed(2)} miles` : 'nearby';
  const timeStr = fmtAgo(closest.timestamp);

  let briefing = `${campus.campusShort} is at ${config.label} status. `;
  briefing += `The nearest incident is ${distStr} away — ${closest.title.toLowerCase()} — reported ${timeStr}. `;

  if (nearby.length > 1) {
    briefing += `There are ${nearby.length} total violent incidents within one mile in the last six hours. `;
  }

  if (closest.confidence === 'CONFIRMED') {
    briefing += `This has been confirmed by CPD records.`;
  } else if (closest.confidence === 'CORROBORATED') {
    briefing += `This has been corroborated by multiple sources (${closest.corroboratedBy.join(', ')}).`;
  } else {
    briefing += `This is a single-source report (${closest.source}) and has not yet been corroborated.`;
  }

  // Dismissal window warning
  if (isDismissalWindow()) {
    briefing += ' ⚠ DISMISSAL WINDOW — heightened monitoring in effect.';
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
        color: status.red,
        bgColor: status.redBg,
      };
    case 'ORANGE':
      return {
        title: 'Recommended Action: Elevated Awareness',
        text: 'Confirmed activity within 0.5 miles. Ensure security team is briefed. Monitor situation for escalation. Prepare communication templates in case of further developments.',
        color: '#C05621',
        bgColor: 'rgba(192, 86, 33, 0.08)',
      };
    case 'AMBER':
      return {
        title: 'Recommended Action: Monitor',
        text: 'Activity reported within 1 mile. No immediate action required. Continue monitoring. This status will auto-clear if no further incidents are reported.',
        color: status.amber,
        bgColor: status.amberBg,
      };
    default:
      return {
        title: 'Status: All Clear',
        text: 'No violent incidents within 1 mile in the last 6 hours. Normal operations.',
        color: status.green,
        bgColor: status.greenBg,
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

// ─── Principal View Component ─────────────────────────────────────────────

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

  // Track new incidents
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
      <div style={{
        display: 'flex', height: '100%', background: bg.app,
        fontFamily: font.body, alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: text.muted }}>Campus not found</div>
      </div>
    );
  }

  const config = THREAT_CONFIG[campusThreat.threatLevel];
  const briefing = generateBriefing(campusThreat, data.incidents);
  const action = getRecommendedAction(campusThreat);
  const retaliationRisk = getRetaliationRisk(campusThreat.incidents);
  const dismissalActive = isDismissalWindow();

  // Count incidents by radius
  const within025 = campusThreat.incidents.filter(i =>
    haversine(campusInfo.lat, campusInfo.lng, i.lat, i.lng) <= 0.25
  ).length;
  const within05 = campusThreat.incidents.filter(i =>
    haversine(campusInfo.lat, campusInfo.lng, i.lat, i.lng) <= 0.5
  ).length;
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
            <span style={{ color: status.red }}>◯ 0.25 mi</span>
            <span style={{ color: status.amber }}>◯ 0.5 mi</span>
            <span>◯ 1.0 mi</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: brand.gold, display: 'inline-block' }} />
              Campus
            </span>
          </div>
        </div>

        {/* Refreshing bar */}
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
            campusName={campusThreat.campusShort}
            onClose={() => setSelectedIncident(null)}
          />
        )}

        {/* Back button */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: space.xs,
            padding: `${space.sm} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
            background: bg.subtle, fontSize: fontSize.sm, color: text.muted,
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onClick={onBack}
        >
          ← Back to Network View
        </div>

        {/* Campus header */}
        <div style={{
          padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
          background: dismissalActive ? 'rgba(197, 48, 48, 0.04)' : bg.card,
          borderLeft: `3px solid ${config.color}`,
        }}>
          <h2 style={{
            fontFamily: font.display, fontSize: fontSize['2xl'],
            fontWeight: fontWeight.light, color: text.primary, margin: 0,
          }}>
            {campusInfo.name}
          </h2>
          <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: '2px' }}>
            {campusInfo.addr} · {campusInfo.communityArea}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: radius.sm,
            background: config.bgColor, color: config.color,
            fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: space.sm,
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: config.color, display: 'inline-block',
            }} />
            {config.label} — {config.description}
          </div>
          {dismissalActive && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: radius.sm,
              background: status.redBg, color: status.red,
              fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
              marginTop: space.sm, marginLeft: space.sm, letterSpacing: '0.05em',
            }}>
              ⚠ DISMISSAL WINDOW
            </div>
          )}
        </div>

        {/* Radius summary */}
        <div style={{
          display: 'flex', gap: space.md, padding: `${space.md} ${space.xl}`,
          borderBottom: `1px solid ${border.light}`, background: bg.card,
        }}>
          <div style={{
            flex: 1, padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
            background: bg.subtle, textAlign: 'center',
          }}>
            <div style={{
              fontSize: fontSize.xl, fontWeight: fontWeight.semibold,
              color: within025 > 0 ? status.red : status.green, lineHeight: 1,
            }}>
              {within025}
            </div>
            <div style={{
              fontSize: '10px', color: text.muted, marginTop: '2px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Within ¼ mile
            </div>
          </div>
          <div style={{
            flex: 1, padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
            background: bg.subtle, textAlign: 'center',
          }}>
            <div style={{
              fontSize: fontSize.xl, fontWeight: fontWeight.semibold,
              color: within05 > 0 ? status.amber : status.green, lineHeight: 1,
            }}>
              {within05}
            </div>
            <div style={{
              fontSize: '10px', color: text.muted, marginTop: '2px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Within ½ mile
            </div>
          </div>
          <div style={{
            flex: 1, padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
            background: bg.subtle, textAlign: 'center',
          }}>
            <div style={{
              fontSize: fontSize.xl, fontWeight: fontWeight.semibold,
              color: within1 > 0 ? text.secondary : status.green, lineHeight: 1,
            }}>
              {within1}
            </div>
            <div style={{
              fontSize: '10px', color: text.muted, marginTop: '2px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Within 1 mile
            </div>
          </div>
        </div>

        {/* AI Briefing */}
        <div style={{
          padding: `${space.md} ${space.xl}`, borderBottom: `1px solid ${border.light}`,
          background: bg.card,
        }}>
          <div style={{
            fontSize: fontSize.xs, color: text.muted, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: space.sm, fontWeight: fontWeight.medium,
          }}>
            Campus Briefing
          </div>
          <div style={{ fontSize: fontSize.base, color: text.primary, lineHeight: 1.6 }}>
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
              color: status.red, letterSpacing: '0.05em', textTransform: 'uppercase',
              marginBottom: 2,
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
            <div style={{
              fontSize: fontSize.sm, fontWeight: fontWeight.medium,
              color: action.color, marginBottom: '4px',
            }}>
              {action.title}
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.5 }}>
              {action.text}
            </div>
          </div>
        </div>

        {/* Campus incident feed */}
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
            const isNew = newIncidentIds.has(inc.id);

            return (
              <div
                key={inc.id}
                className={`watch-feed-enter ${isNew ? 'watch-new-badge' : ''}`}
                style={{
                  padding: `${space.sm} ${space.md}`, borderRadius: radius.md,
                  background: bg.card, border: `1px solid ${border.light}`,
                  marginBottom: '6px', boxShadow: shadow.sm, cursor: 'pointer',
                  transition: 'all 0.15s ease',
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
                <div style={{ display: 'flex', gap: space.sm, marginTop: '4px', flexWrap: 'wrap' }}>
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
                    {inc.confidence}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                    borderRadius: radius.sm, background: bg.subtle, color: text.secondary,
                    fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  }}>
                    {dist.toFixed(2)} mi away
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
