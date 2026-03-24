/**
 * Watch v2 — CEO Network View (Common Operating Picture)
 * One screen. One question: "Are my students in danger right now?"
 *
 * Layout: Left 60% = Map with campus threat rings | Right 40% = Status + Feed
 * Design: Light content area, dark charcoal text, gold accents, status colors
 */

import React, { useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WatchDataState } from './useWatchData';
import type { WatchIncident, CampusThreat, ThreatLevel } from './types';
import { THREAT_CONFIG, VIOLENT_CRIME_LABELS, CONFIDENCE_SCORE } from './types';
import { brand, bg, text, font, fontSize, fontWeight, border, shadow, radius, space, status, modules } from '../../../core/theme';
import { fmtAgo } from '../engine/geo';

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

  // Left panel — Map
  mapPanel: {
    flex: '0 0 60%',
    position: 'relative' as const,
    background: '#E8E4DD',
    borderRight: `1px solid ${border.light}`,
  } as React.CSSProperties,

  mapContainer: {
    width: '100%',
    height: '100%',
  } as React.CSSProperties,

  // Right panel — Status + Feed
  rightPanel: {
    flex: '0 0 40%',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  // Header bar
  header: {
    padding: `${space.lg} ${space.xl}`,
    borderBottom: `1px solid ${border.light}`,
    background: bg.card,
  } as React.CSSProperties,

  headerTitle: {
    fontFamily: font.display,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.light,
    color: text.primary,
    margin: 0,
    lineHeight: 1.2,
  } as React.CSSProperties,

  headerSubtitle: {
    fontSize: fontSize.sm,
    color: text.muted,
    marginTop: space.xs,
  } as React.CSSProperties,

  // Network status strip
  statusStrip: {
    display: 'flex',
    gap: space.md,
    padding: `${space.md} ${space.xl}`,
    borderBottom: `1px solid ${border.light}`,
    background: bg.card,
  } as React.CSSProperties,

  statusCard: (color: string, bgColor: string) => ({
    flex: 1,
    padding: `${space.sm} ${space.md}`,
    borderRadius: radius.md,
    background: bgColor,
    border: `1px solid ${color}20`,
    textAlign: 'center' as const,
  }),

  statusNumber: (color: string) => ({
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    color,
    lineHeight: 1,
  }),

  statusLabel: {
    fontSize: fontSize.xs,
    color: text.muted,
    marginTop: '2px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  // Campus grid
  campusSection: {
    padding: `${space.md} ${space.xl}`,
    borderBottom: `1px solid ${border.light}`,
    background: bg.card,
  } as React.CSSProperties,

  campusSectionTitle: {
    fontSize: fontSize.xs,
    color: text.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: space.sm,
  } as React.CSSProperties,

  campusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  } as React.CSSProperties,

  campusChip: (threat: ThreatLevel) => ({
    padding: '4px 6px',
    borderRadius: radius.sm,
    background: THREAT_CONFIG[threat].bgColor,
    border: `1px solid ${THREAT_CONFIG[threat].color}20`,
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),

  campusChipName: {
    fontSize: '9px',
    fontWeight: fontWeight.medium,
    color: text.primary,
    lineHeight: 1.2,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  campusChipDot: (color: string) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: color,
    margin: '2px auto 0',
  }),

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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,

  feedItem: {
    padding: `${space.sm} ${space.md}`,
    borderRadius: radius.md,
    background: bg.card,
    border: `1px solid ${border.light}`,
    marginBottom: '6px',
    boxShadow: shadow.sm,
  } as React.CSSProperties,

  feedItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  } as React.CSSProperties,

  feedItemTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: text.primary,
    lineHeight: 1.3,
    flex: 1,
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

  // Source health footer
  sourceFooter: {
    display: 'flex',
    gap: space.md,
    padding: `${space.sm} ${space.xl}`,
    borderTop: `1px solid ${border.light}`,
    background: bg.subtle,
  } as React.CSSProperties,

  sourceDot: (isLive: boolean) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: isLive ? status.green : status.red,
    display: 'inline-block',
    marginRight: '4px',
  }),

  sourceLabel: {
    fontSize: '9px',
    color: text.muted,
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  // Loading state
  loadingOverlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: bg.app,
    flexDirection: 'column' as const,
    gap: space.lg,
  } as React.CSSProperties,

  loadingText: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: text.secondary,
    fontWeight: fontWeight.light,
  } as React.CSSProperties,

  loadingSubtext: {
    fontSize: fontSize.sm,
    color: text.muted,
  } as React.CSSProperties,

  // Refreshing indicator
  refreshBar: {
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${brand.gold}, transparent)`,
    animation: 'pulse 1.5s ease-in-out infinite',
  } as React.CSSProperties,

  // Map overlay — network status
  mapOverlay: {
    position: 'absolute' as const,
    top: space.lg,
    left: space.lg,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(8px)',
    borderRadius: radius.md,
    padding: `${space.md} ${space.lg}`,
    boxShadow: shadow.md,
    border: `1px solid ${border.light}`,
    zIndex: 10,
  } as React.CSSProperties,

  mapOverlayTitle: {
    fontFamily: font.display,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.light,
    color: text.primary,
  } as React.CSSProperties,

  // Weather strip
  weatherStrip: {
    position: 'absolute' as const,
    top: space.lg,
    right: space.lg,
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

// ─── Map Component (Leaflet) ─────────────────────────────────────────────

function WatchMap({ campusThreats, incidents, selectedCampus, onSelectCampus }: {
  campusThreats: CampusThreat[];
  incidents: WatchIncident[];
  selectedCampus: number | null;
  onSelectCampus: (id: number | null) => void;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const layerGroupRef = React.useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map once
  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [41.82, -87.67],
      zoom: 11,
      zoomControl: false,
    });

    // Warm-toned CartoDB tile layer (matches Slate aesthetic)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    // Force a resize after mount to fix any container sizing issues
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update campus markers and threat circles
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    // Clear all layers
    lg.clearLayers();

    // Draw campus markers with threat rings
    for (const ct of campusThreats) {
      const config = THREAT_CONFIG[ct.threatLevel];

      // Threat radius circle (0.5 mile = 804.672 meters)
      if (ct.threatLevel !== 'GREEN') {
        L.circle([ct.lat, ct.lng], {
          radius: 804.672,
          fillColor: config.color,
          fillOpacity: 0.08,
          color: config.color,
          opacity: 0.3,
          weight: 1,
        }).addTo(lg);
      }

      // Campus marker (colored circle)
      const size = ct.threatLevel === 'GREEN' ? 8 : 12;
      const campusIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:${size * 2}px;height:${size * 2}px;border-radius:50%;
          background:${config.color};border:2px solid #fff;
          box-shadow:0 0 6px ${config.color}40;
          cursor:pointer;
        "></div>`,
        iconSize: [size * 2, size * 2],
        iconAnchor: [size, size],
      });

      const marker = L.marker([ct.lat, ct.lng], { icon: campusIcon, zIndexOffset: ct.threatLevel === 'GREEN' ? 0 : 1000 })
        .addTo(lg);
      marker.on('click', () => onSelectCampus(ct.campusId));

      // Campus label
      const labelIcon = L.divIcon({
        className: '',
        html: `<div style="
          font-size:10px;font-weight:500;font-family:${font.body};
          color:${text.primary};white-space:nowrap;
          text-shadow:0 0 4px #fff, 0 0 4px #fff;
          pointer-events:none;text-align:center;
          transform:translateY(4px);
        ">${ct.campusShort}</div>`,
        iconSize: [80, 16],
        iconAnchor: [40, -size],
      });
      L.marker([ct.lat, ct.lng], { icon: labelIcon, interactive: false }).addTo(lg);
    }

    // Draw incident markers
    for (const inc of incidents) {
      if (inc.ageMinutes > 360) continue;

      const severity = inc.crimeType === 'HOMICIDE' || inc.crimeType === 'SHOOTING' ? 'high' : 'medium';
      const r = severity === 'high' ? 6 : 4;
      const opacity = severity === 'high' ? 0.9 : 0.6;

      L.circleMarker([inc.lat, inc.lng], {
        radius: r,
        fillColor: status.red,
        fillOpacity: opacity,
        color: '#FFFFFF',
        weight: 1,
      }).bindTooltip(inc.title, { direction: 'top', offset: [0, -6] }).addTo(lg);
    }
  }, [campusThreats, incidents, onSelectCampus]);

  return <div ref={mapRef} style={S.mapContainer} />;
}

// ─── CEO View Component ───────────────────────────────────────────────────

interface CEOViewProps {
  data: WatchDataState;
  onSelectCampus: (campusId: number) => void;
}

export const CEOView: React.FC<CEOViewProps> = ({ data, onSelectCampus }) => {
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);

  const handleSelectCampus = (id: number | null) => {
    setSelectedCampus(id);
    if (id) onSelectCampus(id);
  };

  // Sort campus threats: RED first, then ORANGE, AMBER, GREEN
  const sortedThreats = useMemo(() => {
    const order: Record<ThreatLevel, number> = { RED: 0, ORANGE: 1, AMBER: 2, GREEN: 3 };
    return [...data.campusThreats].sort((a, b) => order[a.threatLevel] - order[b.threatLevel]);
  }, [data.campusThreats]);

  // Filter incidents for feed (last 6 hours, sorted by proximity to any campus)
  const feedIncidents = useMemo(() => {
    return data.incidents
      .filter(i => i.ageMinutes <= 360)
      .slice(0, 25); // Cap at 25 for performance
  }, [data.incidents]);

  if (data.isLoading) {
    return (
      <div style={S.loadingOverlay}>
        <div style={S.loadingText}>Scanning all sources...</div>
        <div style={S.loadingSubtext}>Citizen · Scanner · News · CPD · Weather</div>
      </div>
    );
  }

  const net = data.networkStatus;
  const threatColor = net ? THREAT_CONFIG[net.overallThreat].color : status.green;
  const threatLabel = net ? THREAT_CONFIG[net.overallThreat].label : 'Loading';

  return (
    <div style={S.container}>
      {/* LEFT: Map */}
      <div style={S.mapPanel}>
        <WatchMap
          campusThreats={data.campusThreats}
          incidents={feedIncidents}
          selectedCampus={selectedCampus}
          onSelectCampus={handleSelectCampus}
        />

        {/* Map overlay — network status */}
        <div style={S.mapOverlay}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: threatColor,
              boxShadow: `0 0 8px ${threatColor}60`,
            }} />
            <span style={S.mapOverlayTitle}>Network: {threatLabel}</span>
          </div>
          {net && net.campusesRequiringAttention > 0 && (
            <div style={{ fontSize: fontSize.xs, color: text.secondary, marginTop: '4px' }}>
              {net.campusesRequiringAttention} campus{net.campusesRequiringAttention !== 1 ? 'es' : ''} require attention
            </div>
          )}
          {net && net.campusesRequiringAttention === 0 && (
            <div style={{ fontSize: fontSize.xs, color: status.green, marginTop: '4px' }}>
              All campuses clear
            </div>
          )}
        </div>

        {/* Weather */}
        {net && (
          <div style={S.weatherStrip}>
            {Math.round(net.weather.tempF)}°F · {net.weather.condition}
            {net.weather.isRiskElevating && (
              <span style={{ color: status.amber, marginLeft: '4px' }}>⚠</span>
            )}
          </div>
        )}

        {/* Refreshing bar */}
        {data.isRefreshing && <div style={{ ...S.refreshBar, position: 'absolute', bottom: 0, left: 0, right: 0 }} />}
      </div>

      {/* RIGHT: Status + Feed */}
      <div style={S.rightPanel}>
        {/* Header */}
        <div style={S.header}>
          <h2 style={S.headerTitle}>Watch</h2>
          <div style={S.headerSubtitle}>
            {data.lastRefresh
              ? `Updated ${fmtAgo(data.lastRefresh.toISOString())} · Auto-refreshes every 2 min`
              : 'Loading...'}
          </div>
        </div>

        {/* Network status cards */}
        <div style={S.statusStrip}>
          <div style={S.statusCard(threatColor, `${threatColor}10`)}>
            <div style={S.statusNumber(threatColor)}>{net?.campusesRequiringAttention ?? 0}</div>
            <div style={S.statusLabel}>Campuses Elevated</div>
          </div>
          <div style={S.statusCard(status.red, status.redBg)}>
            <div style={S.statusNumber(status.red)}>{net?.totalActiveIncidents ?? 0}</div>
            <div style={S.statusLabel}>Active Incidents</div>
          </div>
          <div style={S.statusCard(status.blue, status.blueBg)}>
            <div style={S.statusNumber(status.blue)}>{data.scannerTotalCalls}</div>
            <div style={S.statusLabel}>Scanner Calls</div>
          </div>
        </div>

        {/* Campus grid */}
        <div style={S.campusSection}>
          <div style={S.campusSectionTitle}>Campus Status</div>
          <div style={S.campusGrid}>
            {sortedThreats.map(ct => (
              <div
                key={ct.campusId}
                style={S.campusChip(ct.threatLevel)}
                onClick={() => handleSelectCampus(ct.campusId)}
                title={`${ct.campusShort}: ${THREAT_CONFIG[ct.threatLevel].label} — ${ct.incidentCount} incidents`}
              >
                <div style={S.campusChipName}>{ct.campusShort}</div>
                <div style={S.campusChipDot(THREAT_CONFIG[ct.threatLevel].color)} />
              </div>
            ))}
          </div>
        </div>

        {/* Incident feed */}
        <div style={S.feedSection}>
          <div style={S.feedTitle}>
            <span>Live Feed — Violent Crime Only</span>
            <span style={{ fontSize: '9px', color: text.light }}>{feedIncidents.length} incidents</span>
          </div>

          {feedIncidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: space['2xl'], color: text.muted }}>
              <div style={{ fontSize: fontSize.lg, marginBottom: space.sm }}>No violent incidents reported</div>
              <div style={{ fontSize: fontSize.xs }}>within network radius in the last 6 hours</div>
            </div>
          )}

          {feedIncidents.map(inc => {
            const campusName = data.campusThreats.find(c => c.campusId === inc.nearestCampusId)?.campusShort ?? '';
            const distStr = inc.distanceToCampus !== null ? `${inc.distanceToCampus.toFixed(2)} mi` : '';

            return (
              <div key={inc.id} style={S.feedItem}>
                <div style={S.feedItemHeader}>
                  <div style={S.feedItemTitle}>{inc.title}</div>
                  <div style={{ fontSize: '9px', color: text.muted, whiteSpace: 'nowrap' }}>
                    {fmtAgo(inc.timestamp)}
                  </div>
                </div>
                <div style={S.feedItemMeta}>
                  {/* Crime type */}
                  <span style={S.badge(status.red, status.redBg)}>
                    {VIOLENT_CRIME_LABELS[inc.crimeType]}
                  </span>
                  {/* Confidence */}
                  <span style={S.badge(
                    inc.confidence === 'CONFIRMED' ? status.green :
                    inc.confidence === 'CORROBORATED' ? status.blue :
                    status.amber,
                    inc.confidence === 'CONFIRMED' ? status.greenBg :
                    inc.confidence === 'CORROBORATED' ? status.blueBg :
                    status.amberBg,
                  )}>
                    {inc.confidence} {inc.confidenceScore}%
                  </span>
                  {/* Source */}
                  <span style={S.badge(text.muted, bg.subtle)}>
                    {inc.source}
                  </span>
                  {/* Distance to nearest campus */}
                  {campusName && distStr && (
                    <span style={S.badge(text.secondary, bg.subtle)}>
                      {distStr} from {campusName}
                    </span>
                  )}
                  {/* Corroboration */}
                  {inc.corroboratedBy.length > 0 && (
                    <span style={S.badge(status.green, status.greenBg)}>
                      +{inc.corroboratedBy.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Source health footer */}
        <div style={S.sourceFooter}>
          {data.sourceStatuses.map(ss => (
            <div key={ss.source} style={S.sourceLabel}>
              <span style={S.sourceDot(ss.status === 'LIVE')} />
              {ss.source} {ss.status === 'LIVE' ? `(${ss.itemCount})` : `(${ss.status})`}
            </div>
          ))}
          {data.scannerSpikeZones.length > 0 && (
            <div style={{ ...S.sourceLabel, color: status.amber }}>
              ⚠ Scanner spikes: {data.scannerSpikeZones.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CEOView;
