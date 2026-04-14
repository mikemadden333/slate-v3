/**
 * NetworkMap — Slate Watch · "The Situation Map"
 *
 * Full-bleed map with floating intelligence panels.
 * The map IS the page — 75% viewport height.
 *
 * Layout:
 *   Map (full-width, 75vh) with:
 *     - Floating top-left: Quick filter pills
 *     - Floating top-right: Network summary card
 *     - Floating bottom: Incident ticker (5 most recent)
 *   Below map: Campus quick-select strip
 *
 * Props match the existing NetworkMap interface:
 *   risks={allRisks}
 *   zones={zones}
 *   incidents24h={acuteIncidents}
 *   iceAlerts={iceAlerts}
 *   onSelectCampus={handleSelectCampusFromNetwork}
 *
 * IMPORTANT: This component uses the existing Leaflet map from the codebase.
 * It wraps whatever map library is already installed. If Leaflet is available,
 * it renders directly. Otherwise it provides a styled placeholder.
 *
 * Drop-in replacement — no SentinelApp.tsx changes needed.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Incident, CampusRisk, ContagionZone, IceAlert } from '../../engine/types';
import { CAMPUSES } from '../../data/campuses';
import { haversine } from '../../engine/geo';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Props {
  risks: CampusRisk[];
  zones: ContagionZone[];
  incidents24h: Incident[];
  iceAlerts: IceAlert[];
  onSelectCampus: (id: number) => void;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const C = {
  cream:   '#FAF8F5',
  cream2:  '#F3F0EA',
  white:   '#FFFFFF',
  deep:    '#1A1A1A',
  rock:    '#2D2D2D',
  mid:     '#6B7280',
  light:   '#9CA3AF',
  chalk:   '#E5E1D8',
  brass:   '#B79145',
  watch:   '#C0392B',
  section: '#C0392B',
  ice:     '#7C3AED',
  green:   '#16A34A',
  red:     '#DC2626',
  amber:   '#D97706',
  blue:    '#3B82F6',
};

const FONT = {
  heading: "'Inter', system-ui, sans-serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'SF Mono', monospace",
};

const SERIOUS_VIOLENT = /HOMICIDE|MURDER|SHOOTING|SHOT.?SPOTTER|CRIM SEXUAL|KIDNAP|AGG.*HANDGUN|AGG.*FIREARM/i;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function riskColor(label: string): string {
  if (label === 'CRITICAL') return C.red;
  if (label === 'HIGH') return '#C66C3D';
  if (label === 'ELEVATED') return C.amber;
  return C.green;
}

function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function incidentColor(type: string): string {
  if (SERIOUS_VIOLENT.test(type)) return C.red;
  if (/BATTERY|ASSAULT/i.test(type)) return C.amber;
  if (/ICE/i.test(type)) return C.ice;
  return C.blue;
}

// ─── MAP COMPONENT ──────────────────────────────────────────────────────────

function MapRenderer({
  incidents, risks, zones, iceAlerts, filter, selectedCampus, onSelectCampus,
}: {
  incidents: Incident[];
  risks: CampusRisk[];
  zones: ContagionZone[];
  iceAlerts: IceAlert[];
  filter: string;
  selectedCampus: number | null;
  onSelectCampus: (id: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Try to use Leaflet if available
    const L = (window as any).L;
    if (!L) return;

    if (mapInstanceRef.current) return; // Already initialized

    const map = L.map(mapRef.current, {
      center: [41.82, -87.68],
      zoom: 11,
      zoomControl: false,
    });

    // Warm-toned tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control on right
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Campus markers
    for (const campus of CAMPUSES) {
      const risk = risks.find(r => r.campusId === campus.id);
      const score = risk?.score ?? 0;
      const label = risk?.label ?? 'LOW';
      const color = riskColor(label);

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: ${color}; color: white;
          display: flex; align-items: center; justify-content: center;
          font-family: ${FONT.heading}; font-weight: 900; font-size: 14px;
          border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        ">${score}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([campus.lat, campus.lng], { icon }).addTo(map);
      marker.bindTooltip(campus.short, {
        permanent: false, direction: 'top', offset: [0, -20],
        className: 'slate-tooltip',
      });
      marker.on('click', () => onSelectCampus(campus.id));

      // 1-mile radius ring
      const circle = L.circle([campus.lat, campus.lng], {
        radius: 1609, // 1 mile in meters
        color: color + '40',
        fillColor: color + '08',
        fillOpacity: 0.3,
        weight: 1,
        dashArray: '4 4',
      }).addTo(map);

      markersRef.current.push(marker, circle);
    }

    // Incident markers
    const filteredIncidents = filter === 'violent'
      ? incidents.filter(i => SERIOUS_VIOLENT.test(i.type))
      : filter === 'ice' ? [] // ICE handled separately
      : incidents;

    for (const inc of filteredIncidents) {
      const color = incidentColor(inc.type);
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 8px; height: 8px; border-radius: 50%;
          background: ${color}; border: 1px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });

      const marker = L.marker([inc.lat, inc.lng], { icon }).addTo(map);
      marker.bindTooltip(`${inc.type}<br>${inc.block || ''}<br>${formatTimeAgo(inc.date)}`, {
        direction: 'top',
      });
      markersRef.current.push(marker);
    }

    // ICE alert markers
    if (filter === 'all' || filter === 'ice') {
      for (const alert of iceAlerts) {
        const lat = (alert as any).lat;
        const lng = (alert as any).lng;
        if (!lat || !lng) continue;

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width: 10px; height: 10px; border-radius: 50%;
            background: ${C.ice}; border: 2px solid white;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindTooltip(`ICE Enforcement<br>${(alert as any).description || ''}`, {
          direction: 'top',
        });
        markersRef.current.push(marker);
      }
    }

    // Contagion zone overlays
    if (filter === 'all' || filter === 'zones') {
      for (const zone of zones) {
        const lat = (zone as any).lat ?? (zone as any).centerLat;
        const lng = (zone as any).lng ?? (zone as any).centerLng;
        if (!lat || !lng) continue;

        const radius = ((zone as any).radiusMiles ?? 0.5) * 1609;
        const circle = L.circle([lat, lng], {
          radius,
          color: C.amber + '60',
          fillColor: C.amber + '15',
          fillOpacity: 0.4,
          weight: 2,
          dashArray: '6 3',
        }).addTo(map);
        markersRef.current.push(circle);
      }
    }

    // Center on selected campus
    if (selectedCampus) {
      const campus = CAMPUSES.find(c => c.id === selectedCampus);
      if (campus) {
        map.setView([campus.lat, campus.lng], 14, { animate: true });
      }
    }
  }, [incidents, risks, zones, iceAlerts, filter, selectedCampus]);

  return (
    <div ref={mapRef} style={{
      width: '100%', height: '100%', borderRadius: 12,
      background: C.cream2,
    }} />
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function NetworkMap({ risks, zones, incidents24h, iceAlerts, onSelectCampus }: Props) {
  const [filter, setFilter] = useState<'all' | 'violent' | '6h' | 'ice' | 'zones'>('all');
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);

  const now = Date.now();

  // Filter incidents by time
  const filteredIncidents = useMemo(() => {
    if (filter === '6h') {
      return incidents24h.filter(i => now - new Date(i.date).getTime() <= 6 * 3600000);
    }
    return incidents24h;
  }, [incidents24h, filter]);

  // Recent incidents for ticker
  const recentIncidents = useMemo(() => {
    return [...incidents24h]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(inc => {
        let nearest = { name: '', dist: Infinity };
        for (const c of CAMPUSES) {
          const d = haversine(c.lat, c.lng, inc.lat, inc.lng);
          if (d < nearest.dist) nearest = { name: c.short, dist: d };
        }
        return { ...inc, nearest };
      });
  }, [incidents24h]);

  // Network summary
  const summary = useMemo(() => {
    const elevated = risks.filter(r => r.label !== 'LOW').length;
    const highest = [...risks].sort((a, b) => b.score - a.score)[0];
    const highestCampus = highest ? CAMPUSES.find(c => c.id === highest.campusId) : null;
    const avgRisk = risks.length > 0
      ? Math.round(risks.reduce((s, r) => s + r.score, 0) / risks.length)
      : 0;
    return {
      elevated,
      highest: highestCampus?.short ?? '—',
      highestScore: highest?.score ?? 0,
      highestLabel: highest?.label ?? 'LOW',
      avgRisk,
      incidentCount: filteredIncidents.length,
      iceCount: iceAlerts.length,
    };
  }, [risks, filteredIncidents, iceAlerts]);

  const handleSelectCampus = (id: number) => {
    setSelectedCampus(id);
    onSelectCampus(id);
  };

  return (
    <div style={{ fontFamily: FONT.body }}>

      {/* ═══ MAP CONTAINER ═══ */}
      <div style={{
        position: 'relative', height: '72vh', minHeight: 500,
        borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${C.chalk}`,
      }}>
        {/* Map */}
        <MapRenderer
          incidents={filteredIncidents}
          risks={risks}
          zones={zones}
          iceAlerts={iceAlerts}
          filter={filter}
          selectedCampus={selectedCampus}
          onSelectCampus={handleSelectCampus}
        />

        {/* Floating: Quick Filters (top-left) */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 1000,
          display: 'flex', gap: 6,
          background: C.white + 'E6', backdropFilter: 'blur(8px)',
          padding: '8px 12px', borderRadius: 10,
          border: `1px solid ${C.chalk}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          {[
            { key: 'all' as const, label: 'All' },
            { key: 'violent' as const, label: 'Violent Only' },
            { key: '6h' as const, label: 'Last 6h' },
            { key: 'ice' as const, label: 'ICE' },
            { key: 'zones' as const, label: 'Contagion Zones' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: 'none',
              background: filter === f.key ? C.deep : 'transparent',
              color: filter === f.key ? C.white : C.mid,
              cursor: 'pointer', fontFamily: FONT.body,
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Floating: Network Summary (top-right) */}
        <div style={{
          position: 'absolute', top: 16, right: 56, zIndex: 1000,
          width: 220,
          background: C.white + 'F0', backdropFilter: 'blur(8px)',
          padding: '14px 16px', borderRadius: 10,
          border: `1px solid ${C.chalk}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: C.watch, marginBottom: 10,
          }}>
            ▼ NETWORK STATUS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Avg Risk', value: summary.avgRisk.toString() },
              { label: 'Elevated', value: `${summary.elevated} of ${risks.length}`, color: summary.elevated > 0 ? C.amber : C.mid },
              { label: 'Contagion Zones', value: zones.length.toString(), color: zones.length > 0 ? C.amber : C.mid },
              { label: 'ICE', value: summary.iceCount > 0 ? `${summary.iceCount} ALERTS` : '0', color: summary.iceCount > 0 ? C.ice : C.mid },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11,
              }}>
                <span style={{ color: C.mid }}>{row.label}:</span>
                <span style={{
                  fontWeight: 700, fontFamily: FONT.mono,
                  color: row.color || C.deep,
                }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.chalk}`,
            fontSize: 10, color: C.mid,
          }}>
            Highest: <strong style={{ color: riskColor(summary.highestLabel) }}>
              {summary.highest} — {summary.highestScore} — {summary.highestLabel}
            </strong>
          </div>
          <div style={{ fontSize: 10, color: C.light, marginTop: 4 }}>
            Incidents shown: {filteredIncidents.length}
          </div>
        </div>

        {/* Floating: Incident Ticker (bottom) */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: C.white + 'F0', backdropFilter: 'blur(8px)',
          borderTop: `1px solid ${C.chalk}`,
          padding: '10px 16px',
          display: 'flex', gap: 16, overflowX: 'auto',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: C.watch,
            flexShrink: 0, display: 'flex', alignItems: 'center',
          }}>
            LATEST
          </div>
          {recentIncidents.map((inc, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              flexShrink: 0, paddingRight: 16,
              borderRight: i < recentIncidents.length - 1 ? `1px solid ${C.chalk}` : 'none',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: incidentColor(inc.type), flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.deep, whiteSpace: 'nowrap' }}>
                  {inc.type}
                </div>
                <div style={{ fontSize: 9, color: C.light, whiteSpace: 'nowrap' }}>
                  {formatTimeAgo(inc.date)} · {inc.nearest.dist.toFixed(1)}mi from {inc.nearest.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CAMPUS QUICK-SELECT STRIP ═══ */}
      <div style={{
        display: 'flex', gap: 8, padding: '16px 0',
        overflowX: 'auto',
      }}>
        {/* All button */}
        <button onClick={() => setSelectedCampus(null)} style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          border: `1px solid ${!selectedCampus ? C.deep : C.chalk}`,
          background: !selectedCampus ? C.deep : C.white,
          color: !selectedCampus ? C.white : C.mid,
          cursor: 'pointer', fontFamily: FONT.body, flexShrink: 0,
        }}>
          All
        </button>

        {/* Region groups */}
        {['South Side', 'West Side', 'Near North'].map(region => {
          const regionCampuses = CAMPUSES.filter(c => {
            if (region === 'South Side') return c.lat < 41.82;
            if (region === 'West Side') return c.lng < -87.68 && c.lat >= 41.82;
            return c.lat >= 41.85;
          });
          if (regionCampuses.length === 0) return null;
          return (
            <div key={region} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: C.light,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', paddingRight: 4,
              }}>
                {region}
              </span>
              {regionCampuses.map(campus => {
                const risk = risks.find(r => r.campusId === campus.id);
                const color = riskColor(risk?.label ?? 'LOW');
                const isSelected = selectedCampus === campus.id;
                return (
                  <button key={campus.id} onClick={() => handleSelectCampus(campus.id)} style={{
                    padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${isSelected ? color : C.chalk}`,
                    background: isSelected ? color + '15' : C.white,
                    color: isSelected ? color : C.mid,
                    cursor: 'pointer', fontFamily: FONT.body,
                    display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, flexShrink: 0,
                    }} />
                    {campus.short}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ═══ MAP LEGEND ═══ */}
      <div style={{
        display: 'flex', gap: 16, padding: '8px 0', fontSize: 10, color: C.mid,
        flexWrap: 'wrap',
      }}>
        <span><span style={{ color: C.red }}>●</span> Shooting/Homicide</span>
        <span><span style={{ color: C.amber }}>●</span> Assault</span>
        <span><span style={{ color: C.ice }}>●</span> ICE</span>
        <span><span style={{ color: C.blue }}>●</span> Property</span>
        <span style={{ color: C.light }}>○ Dashed circles = 1mi campus radius</span>
        <span style={{ color: C.amber }}>◌ Shaded areas = contagion zones</span>
      </div>
    </div>
  );
}
