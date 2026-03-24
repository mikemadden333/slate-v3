/**
 * Watch v2 — Principal Campus View
 * Your school at the center. "What's happening near my school right now?"
 *
 * Layout: Left 55% = Campus-centered map with radius rings | Right 45% = Briefing + Feed
 * Design: Light content area, campus-focused, actionable
 */

import React, { useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WatchDataState } from './useWatchData';
import type { WatchIncident, CampusThreat, ThreatLevel } from './types';
import { THREAT_CONFIG, VIOLENT_CRIME_LABELS } from './types';
import { CAMPUSES } from '../data/campuses';
import { haversine, fmtAgo } from '../engine/geo';
import { brand, bg, text, font, fontSize, fontWeight, border, shadow, radius, space, status } from '../../../core/theme';

// ─── Styles ───────────────────────────────────────────────────────────────

const S = {
  container: {
    display: 'flex',
    height: '100%',
    background: bg.app,
    fontFamily: font.body,
    color: text.primary,
    overflow: 'hidden',
  } as React.CSSProperties,

  mapPanel: {
    flex: '0 0 55%',
    position: 'relative' as const,
    background: '#E8E4DD',
    borderRight: `1px solid ${border.light}`,
  } as React.CSSProperties,

  mapContainer: {
    width: '100%',
    height: '100%',
  } as React.CSSProperties,

  rightPanel: {
    flex: '0 0 45%',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  // Campus header
  campusHeader: (threatColor: string) => ({
    padding: `${space.lg} ${space.xl}`,
    borderBottom: `1px solid ${border.light}`,
    background: bg.card,
    borderLeft: `3px solid ${threatColor}`,
  }),

  campusName: {
    fontFamily: font.display,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.light,
    color: text.primary,
    margin: 0,
  } as React.CSSProperties,

  campusAddr: {
    fontSize: fontSize.xs,
    color: text.muted,
    marginTop: '2px',
  } as React.CSSProperties,

  threatBadge: (color: string, bgColor: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: radius.sm,
    background: bgColor,
    color,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: space.sm,
  }),

  // Briefing section
  briefingSection: {
    padding: `${space.lg} ${space.xl}`,
    borderBottom: `1px solid ${border.light}`,
    background: bg.card,
  } as React.CSSProperties,

  briefingTitle: {
    fontSize: fontSize.xs,
    color: text.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: space.sm,
  } as React.CSSProperties,

  briefingText: {
    fontSize: fontSize.base,
    color: text.primary,
    lineHeight: 1.6,
  } as React.CSSProperties,

  // Radius summary
  radiusSummary: {
    display: 'flex',
    gap: space.md,
    padding: `${space.md} ${space.xl}`,
    borderBottom: `1px solid ${border.light}`,
    background: bg.card,
  } as React.CSSProperties,

  radiusCard: {
    flex: 1,
    padding: `${space.sm} ${space.md}`,
    borderRadius: radius.md,
    background: bg.subtle,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  radiusNumber: (color: string) => ({
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    color,
    lineHeight: 1,
  }),

  radiusLabel: {
    fontSize: '9px',
    color: text.muted,
    marginTop: '2px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  // Incident feed
  feedSection: {
    flex: 1,
    overflow: 'auto',
    padding: `${space.md} ${space.xl}`,
  } as React.CSSProperties,

  feedTitle: {
    fontSize: fontSize.xs,
    color: text.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: space.sm,
  } as React.CSSProperties,

  feedItem: {
    padding: `${space.sm} ${space.md}`,
    borderRadius: radius.md,
    background: bg.card,
    border: `1px solid ${border.light}`,
    marginBottom: '6px',
    boxShadow: shadow.sm,
  } as React.CSSProperties,

  feedItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: text.primary,
    lineHeight: 1.3,
  } as React.CSSProperties,

  feedItemMeta: {
    display: 'flex',
    gap: space.sm,
    marginTop: '4px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  badge: (color: string, bgColor: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 6px',
    borderRadius: radius.sm,
    background: bgColor,
    color,
    fontSize: '9px',
    fontWeight: fontWeight.medium,
    letterSpacing: '0.03em',
    lineHeight: 1.6,
  }),

  // Action recommendation
  actionBox: (color: string, bgColor: string) => ({
    padding: `${space.md} ${space.lg}`,
    borderRadius: radius.md,
    background: bgColor,
    border: `1px solid ${color}30`,
    marginBottom: space.md,
  }),

  actionTitle: (color: string) => ({
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color,
    marginBottom: '4px',
  }),

  actionText: {
    fontSize: fontSize.xs,
    color: text.secondary,
    lineHeight: 1.5,
  } as React.CSSProperties,

  // Back button
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    padding: `${space.sm} ${space.xl}`,
    borderBottom: `1px solid ${border.light}`,
    background: bg.subtle,
    fontSize: fontSize.xs,
    color: text.muted,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  // Map overlay
  mapOverlay: {
    position: 'absolute' as const,
    bottom: space.lg,
    left: space.lg,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(8px)',
    borderRadius: radius.md,
    padding: `${space.sm} ${space.md}`,
    boxShadow: shadow.sm,
    border: `1px solid ${border.light}`,
    zIndex: 10,
    fontSize: fontSize.xs,
    color: text.secondary,
  } as React.CSSProperties,
} as const;

// ─── Campus Map ───────────────────────────────────────────────────────────

function CampusMap({ campus, incidents }: {
  campus: CampusThreat;
  incidents: WatchIncident[];
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const layerGroupRef = React.useRef<L.LayerGroup | null>(null);

  // Initialize map
  React.useEffect(() => {
    if (!mapRef.current) return;

    // If map already exists, just update the view
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
    // 0.25 mile ring (RED zone)
    L.circle([campus.lat, campus.lng], {
      radius: 402.336,
      fillColor: '#C53030',
      fillOpacity: 0.04,
      color: '#C53030',
      opacity: 0.25,
      weight: 1,
    }).addTo(lg);

    // 0.5 mile ring (AMBER zone)
    L.circle([campus.lat, campus.lng], {
      radius: 804.672,
      fillColor: '#C07C1E',
      fillOpacity: 0.03,
      color: '#C07C1E',
      opacity: 0.2,
      weight: 1,
    }).addTo(lg);

    // 1 mile ring (monitoring zone)
    L.circle([campus.lat, campus.lng], {
      radius: 1609.34,
      fillColor: '#718096',
      fillOpacity: 0.02,
      color: '#718096',
      opacity: 0.15,
      weight: 1,
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

    // Incident markers
    for (const inc of incidents) {
      const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
      if (dist > 1.5) continue;

      const isClose = dist <= 0.25;
      L.circleMarker([inc.lat, inc.lng], {
        radius: isClose ? 7 : 5,
        fillColor: status.red,
        fillOpacity: isClose ? 0.9 : 0.6,
        color: '#FFFFFF',
        weight: 1,
      }).bindTooltip(`${inc.title} (${dist.toFixed(2)} mi)`, { direction: 'top', offset: [0, -6] })
        .addTo(lg);
    }

    return () => {
      // Cleanup on unmount only
    };
  }, [campus, incidents]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} style={S.mapContainer} />;
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

  return briefing;
}

function getRecommendedAction(campus: CampusThreat): { title: string; text: string; color: string; bgColor: string } {
  switch (campus.threatLevel) {
    case 'RED':
      return {
        title: 'Recommended Action: Heightened Alert',
        text: 'Active threat within 0.25 miles. Consider enhanced security posture, communication to staff, and monitoring of student movement. Contact local law enforcement liaison for situational update.',
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

// ─── Principal View Component ─────────────────────────────────────────────

interface PrincipalViewProps {
  data: WatchDataState;
  campusId: number;
  onBack: () => void;
}

export const PrincipalView: React.FC<PrincipalViewProps> = ({ data, campusId, onBack }) => {
  const campusThreat = data.campusThreats.find(c => c.campusId === campusId);
  const campusInfo = CAMPUSES.find(c => c.id === campusId);

  if (!campusThreat || !campusInfo) {
    return (
      <div style={{ ...S.container, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: text.muted }}>Campus not found</div>
      </div>
    );
  }

  const config = THREAT_CONFIG[campusThreat.threatLevel];
  const briefing = generateBriefing(campusThreat, data.incidents);
  const action = getRecommendedAction(campusThreat);

  // Count incidents by radius
  const within025 = campusThreat.incidents.filter(i =>
    haversine(campusInfo.lat, campusInfo.lng, i.lat, i.lng) <= 0.25
  ).length;
  const within05 = campusThreat.incidents.filter(i =>
    haversine(campusInfo.lat, campusInfo.lng, i.lat, i.lng) <= 0.5
  ).length;
  const within1 = campusThreat.incidents.length;

  return (
    <div style={S.container}>
      {/* LEFT: Campus Map */}
      <div style={S.mapPanel}>
        <CampusMap campus={campusThreat} incidents={data.incidents} />

        {/* Map legend */}
        <div style={S.mapOverlay}>
          <div style={{ display: 'flex', gap: space.md, alignItems: 'center' }}>
            <span>◯ 0.25 mi</span>
            <span>◯ 0.5 mi</span>
            <span>◯ 1.0 mi</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: brand.gold, display: 'inline-block' }} />
              Campus
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: Briefing + Feed */}
      <div style={S.rightPanel}>
        {/* Back button */}
        <div style={S.backButton} onClick={onBack}>
          ← Back to Network View
        </div>

        {/* Campus header */}
        <div style={S.campusHeader(config.color)}>
          <h2 style={S.campusName}>{campusInfo.name}</h2>
          <div style={S.campusAddr}>{campusInfo.addr} · {campusInfo.communityArea}</div>
          <div style={S.threatBadge(config.color, config.bgColor)}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: config.color, display: 'inline-block',
            }} />
            {config.label} — {config.description}
          </div>
        </div>

        {/* Radius summary */}
        <div style={S.radiusSummary}>
          <div style={S.radiusCard}>
            <div style={S.radiusNumber(within025 > 0 ? status.red : status.green)}>{within025}</div>
            <div style={S.radiusLabel}>Within ¼ mile</div>
          </div>
          <div style={S.radiusCard}>
            <div style={S.radiusNumber(within05 > 0 ? status.amber : status.green)}>{within05}</div>
            <div style={S.radiusLabel}>Within ½ mile</div>
          </div>
          <div style={S.radiusCard}>
            <div style={S.radiusNumber(within1 > 0 ? text.secondary : status.green)}>{within1}</div>
            <div style={S.radiusLabel}>Within 1 mile</div>
          </div>
        </div>

        {/* AI Briefing */}
        <div style={S.briefingSection}>
          <div style={S.briefingTitle}>Campus Briefing</div>
          <div style={S.briefingText}>{briefing}</div>
        </div>

        {/* Recommended action */}
        <div style={{ padding: `${space.md} ${space.xl}`, borderBottom: `1px solid ${border.light}` }}>
          <div style={S.actionBox(action.color, action.bgColor)}>
            <div style={S.actionTitle(action.color)}>{action.title}</div>
            <div style={S.actionText}>{action.text}</div>
          </div>
        </div>

        {/* Campus incident feed */}
        <div style={S.feedSection}>
          <div style={S.feedTitle}>
            Incidents Near {campusThreat.campusShort} — Last 6 Hours
          </div>

          {campusThreat.incidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: space['2xl'], color: text.muted }}>
              <div style={{ fontSize: fontSize.lg, marginBottom: space.sm, color: status.green }}>All Clear</div>
              <div style={{ fontSize: fontSize.xs }}>No violent incidents within 1 mile</div>
            </div>
          )}

          {campusThreat.incidents.map(inc => {
            const dist = haversine(campusInfo.lat, campusInfo.lng, inc.lat, inc.lng);
            return (
              <div key={inc.id} style={S.feedItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={S.feedItemTitle}>{inc.title}</div>
                  <div style={{ fontSize: '9px', color: text.muted, whiteSpace: 'nowrap' }}>
                    {fmtAgo(inc.timestamp)}
                  </div>
                </div>
                <div style={S.feedItemMeta}>
                  <span style={S.badge(status.red, status.redBg)}>
                    {VIOLENT_CRIME_LABELS[inc.crimeType]}
                  </span>
                  <span style={S.badge(
                    inc.confidence === 'CONFIRMED' ? status.green : status.amber,
                    inc.confidence === 'CONFIRMED' ? status.greenBg : status.amberBg,
                  )}>
                    {inc.confidence}
                  </span>
                  <span style={S.badge(text.secondary, bg.subtle)}>
                    {dist.toFixed(2)} mi away
                  </span>
                  <span style={S.badge(text.muted, bg.subtle)}>
                    {inc.source}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PrincipalView;
