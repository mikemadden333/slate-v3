/**
 * ContagionTab — Dedicated contagion analysis section for Watch.
 *
 * Network view: All active zones across the system, campus exposure matrix,
 *   retaliation window tracker, zone timeline, historical stats.
 * Campus view: Single-campus exposure, zone detail, AI pattern analysis.
 *
 * Based on Papachristos Violence Contagion Model (JAMA 2017):
 *   - 125-day contagion window
 *   - ACUTE (0-72h) → ACTIVE (72h-14d) → WATCH (14d-125d)
 *   - Retaliation window: 18-72h post-homicide
 */

import { useState, useMemo, useCallback } from 'react';

// ─── Explainer Panel ─────────────────────────────────────────────────────────

function ContagionExplainerPanel() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E5E1D8', borderRadius: '12px',
      marginBottom: 24, overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#B79145' }}>?</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
            Understanding This View
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#6B7280', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          \u25BC
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #E5E1D8' }}>
          {/* What is a contagion zone? */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
              WHAT IS A CONTAGION ZONE?
            </div>
            <div style={{ fontSize: 13, color: '#2D2D2D', lineHeight: 1.7 }}>
              A contagion zone is a geographic area of elevated risk created by a <strong>homicide</strong>. Research by
              Green, Horel &amp; Papachristos (JAMA 2017) proved that gun violence spreads like a contagious disease \u2014
              over <strong>60% of shootings occur in cascades</strong>, where one killing triggers retaliatory violence nearby.
              Each homicide within 2 miles of a campus generates a zone that persists for <strong>125 days</strong>.
              When you see a campus \u201cin a contagion zone,\u201d it means a homicide occurred nearby recently enough that
              the statistical risk of follow-on violence is elevated above baseline.
            </div>
          </div>

          {/* The three phases */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
              THE THREE PHASES
            </div>
            <div style={{ fontSize: 13, color: '#2D2D2D', lineHeight: 1.7, marginBottom: 10 }}>
              Every contagion zone progresses through three phases as time passes since the homicide.
              Risk is highest immediately after the event and decays over the 125-day window.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { phase: 'ACUTE', time: '0 \u2013 72 hours', color: '#DC2626', bg: '#FEF2F2',
                  desc: 'Maximum danger. The retaliation window (18-72h) falls within this phase. This is when retaliatory shootings are most likely. Enhanced security protocols should be active.' },
                { phase: 'ACTIVE', time: '72 hours \u2013 14 days', color: '#EA580C', bg: '#FFF7ED',
                  desc: 'Elevated risk. The community is still processing the event. Social media tensions, memorial gatherings, and neighborhood anxiety can trigger secondary violence.' },
                { phase: 'WATCH', time: '14 \u2013 125 days', color: '#D97706', bg: '#FFFBEB',
                  desc: 'Extended awareness. The immediate danger has passed, but the statistical risk of follow-on violence remains above baseline. Routine heightened monitoring continues.' },
              ].map(item => (
                <div key={item.phase} style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: item.bg, borderLeft: `3px solid ${item.color}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: item.color, letterSpacing: '0.06em' }}>
                    {item.phase}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', marginTop: 2 }}>
                    {item.time}
                  </div>
                  <div style={{ fontSize: 11, color: '#2D2D2D', marginTop: 6, lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What the KPIs mean */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
              READING THE NUMBERS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total Zones', desc: 'Total number of active contagion zones across the network. Each zone = one homicide still within its 125-day risk window.' },
                { label: 'Acute / Active / Watch', desc: 'How many zones are in each phase. Acute zones demand immediate attention; Watch zones require routine awareness.' },
                { label: 'Ret. Windows', desc: 'Retaliation windows (18-72h post-homicide). This is the single most dangerous period. If this number is > 0, enhanced security is critical.' },
                { label: 'Gang-Related', desc: 'Zones generated by gang-affiliated homicides. These carry higher retaliation risk due to organized group dynamics.' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: '#F3F0EA', fontSize: 12,
                }}>
                  <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{item.label}: </span>
                  <span style={{ color: '#2D2D2D' }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Campus Exposure Matrix explanation */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
              THE CAMPUS EXPOSURE MATRIX
            </div>
            <div style={{ fontSize: 13, color: '#2D2D2D', lineHeight: 1.7 }}>
              The table below shows every campus and how many contagion zones currently overlap with it.
              <strong> \u201cMax Phase\u201d</strong> shows the most severe phase among all zones affecting that campus.
              <strong> \u201cRet. Window\u201d</strong> flags campuses where a retaliation window is active.
              Click any campus row with zones to expand the detail view showing each zone\u2019s location,
              distance, bearing, and phase. <strong>Risk Score</strong> is the campus\u2019s overall PULSE score \u2014
              contagion proximity is the largest component of this score.
            </div>
          </div>

          {/* Data integrity */}
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: '#F3F0EA', borderLeft: '3px solid #B79145',
          }}>
            <div style={{ fontSize: 12, fontStyle: 'italic', color: '#2D2D2D', lineHeight: 1.6 }}>
              \u201cThe data tells the story. We do not engineer outcomes.\u201d Contagion zones are generated
              deterministically from verified homicide data. No manual overrides. No subjective adjustments.
              The Papachristos model applies equally to every campus, every day.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import type { Campus } from '../../data/campuses';
import { CAMPUSES } from '../../data/campuses';
import type { CampusRisk, ContagionZone, Incident } from '../../engine/types';
import { haversine, bearing, compassLabel, fmtAgo, fmtDist, ageInHours } from '../../engine/geo';
import { getCampusExposure } from '../../engine/contagion';
import { RISK_COLORS } from '../../data/weights';
import { AI_CONFIG } from '../../../../core/constants';
import { C, bg, text, brand, border, font, fontSize, fontWeight, shadow, radius, transition, risk as riskTheme } from '../../../../core/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  zones: ContagionZone[];
  allRisks: CampusRisk[];
  incidents: Incident[];
  /** If set, show campus-level view. If null, show network-level view. */
  selectedCampus: Campus | null;
}

const PHASE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  ACUTE:  { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  ACTIVE: { color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' },
  WATCH:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

const PHASE_LABELS: Record<string, string> = {
  ACUTE:  '0-72 hours',
  ACTIVE: '72h - 14 days',
  WATCH:  '14 - 125 days',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ContagionTab({ zones, allRisks, incidents, selectedCampus }: Props) {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [expandedCampus, setExpandedCampus] = useState<string | null>(null);

  // Network-level stats
  const stats = useMemo(() => {
    const acute = zones.filter(z => z.phase === 'ACUTE');
    const active = zones.filter(z => z.phase === 'ACTIVE');
    const watch = zones.filter(z => z.phase === 'WATCH');
    const retWindows = zones.filter(z => z.retWin);
    const gangRelated = zones.filter(z => z.gang);
    const firearmConfirmed = zones.filter(z => z.firearm);

    // Campus exposure matrix
    const exposureMatrix: { campus: Campus; zones: ContagionZone[]; maxPhase: string; inRetWin: boolean }[] = [];
    for (const campus of CAMPUSES) {
      const exposed = getCampusExposure(campus, zones);
      const maxPhase = exposed.length > 0
        ? (exposed.some(z => z.phase === 'ACUTE') ? 'ACUTE' : exposed.some(z => z.phase === 'ACTIVE') ? 'ACTIVE' : 'WATCH')
        : 'NONE';
      exposureMatrix.push({
        campus,
        zones: exposed,
        maxPhase,
        inRetWin: exposed.some(z => z.retWin),
      });
    }
    exposureMatrix.sort((a, b) => b.zones.length - a.zones.length);

    return { acute, active, watch, retWindows, gangRelated, firearmConfirmed, exposureMatrix, total: zones.length };
  }, [zones]);

  // Campus-specific data
  const campusExposure = useMemo(() => {
    if (!selectedCampus) return [];
    return getCampusExposure(selectedCampus, zones);
  }, [selectedCampus, zones]);

  // AI Analysis
  const runAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const zoneData = zones.map(z => ({
        phase: z.phase, ageH: Math.round(z.ageH), daysLeft: z.daysLeft,
        block: z.block, retWin: z.retWin, gang: z.gang, firearm: z.firearm,
        lat: z.lat.toFixed(4), lng: z.lng.toFixed(4),
      }));
      const exposureData = stats.exposureMatrix.map(e => ({
        campus: e.campus.name, zoneCount: e.zones.length, maxPhase: e.maxPhase, inRetWin: e.inRetWin,
      }));

      const prompt = selectedCampus
        ? `Analyze the contagion zone exposure for ${selectedCampus.name} campus at ${selectedCampus.addr}. This campus is currently exposed to ${campusExposure.length} contagion zone(s). Zone details: ${JSON.stringify(campusExposure.map(z => ({ phase: z.phase, distance: z.distanceFromCampus?.toFixed(2), bearing: z.bearingFromCampus ? compassLabel(z.bearingFromCampus) : 'N/A', daysLeft: z.daysLeft, retWin: z.retWin, block: z.block })))}. Provide: (1) Current threat assessment for this specific campus, (2) Pattern analysis - are these zones clustering or dispersed?, (3) Temporal analysis - are we in an escalation or de-escalation cycle?, (4) Specific operational recommendations for the principal. Be direct and actionable.`
        : `Analyze the network-wide contagion landscape. Total zones: ${zones.length} (${stats.acute.length} ACUTE, ${stats.active.length} ACTIVE, ${stats.watch.length} WATCH). Retaliation windows: ${stats.retWindows.length}. Gang-related: ${stats.gangRelated.length}. Zones: ${JSON.stringify(zoneData)}. Campus exposure: ${JSON.stringify(exposureData)}. Provide: (1) Network threat assessment, (2) Spatial clustering analysis - are homicides concentrating in specific corridors?, (3) Temporal pattern - escalation or de-escalation?, (4) Which campuses need immediate attention and why?, (5) Strategic recommendations for the CEO. Be direct, specific, and connect the dots.`;

      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 1500,
          system: `${AI_CONFIG.systemPrompt}\n\nYou are analyzing contagion zone data based on the Papachristos Violence Contagion Model (JAMA 2017). Contagion zones are generated by homicides and persist for 125 days. ACUTE phase (0-72h) is highest risk with retaliation windows. ACTIVE phase (72h-14d) is elevated. WATCH phase (14d-125d) is context. Be a world-class intelligence analyst. Connect spatial and temporal patterns. Be specific about locations and timelines.`,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      setAiAnalysis(data?.content?.[0]?.text || 'Analysis unavailable.');
    } catch {
      setAiAnalysis('Unable to generate analysis at this time.');
    } finally {
      setAiLoading(false);
    }
  }, [zones, selectedCampus, campusExposure, stats]);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {selectedCampus ? (
        <CampusContagionView
          campus={selectedCampus}
          exposure={campusExposure}
          allZones={zones}
          risk={allRisks.find(r => r.campusId === selectedCampus.id)}
          aiAnalysis={aiAnalysis}
          aiLoading={aiLoading}
          onRunAi={runAiAnalysis}
          expandedZone={expandedZone}
          onToggleZone={setExpandedZone}
        />
      ) : (
        <NetworkContagionView
          stats={stats}
          zones={zones}
          allRisks={allRisks}
          aiAnalysis={aiAnalysis}
          aiLoading={aiLoading}
          onRunAi={runAiAnalysis}
          expandedZone={expandedZone}
          onToggleZone={setExpandedZone}
          expandedCampus={expandedCampus}
          onToggleCampus={setExpandedCampus}
        />
      )}
    </div>
  );
}

// ─── Network-Level View ──────────────────────────────────────────────────────

function NetworkContagionView({ stats, zones, allRisks, aiAnalysis, aiLoading, onRunAi, expandedZone, onToggleZone, expandedCampus, onToggleCampus }: {
  stats: ReturnType<typeof Object>; zones: ContagionZone[]; allRisks: CampusRisk[];
  aiAnalysis: string; aiLoading: boolean; onRunAi: () => void;
  expandedZone: string | null; onToggleZone: (id: string | null) => void;
  expandedCampus: string | null; onToggleCampus: (id: string | null) => void;
}) {
  const s = stats as any;
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: brand.brass, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
          PAPACHRISTOS CONTAGION MODEL
        </div>
        <div style={{ fontSize: '20px', fontWeight: fontWeight.bold, color: text.primary, fontFamily: font.serif }}>
          Network Contagion Landscape
        </div>
        <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 4 }}>
          Tracking homicide-generated violence contagion zones across all campuses.
          Based on the 125-day contagion window established by Green, Horel &amp; Papachristos (JAMA 2017).
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 8 }}>
        <KPICard label="Total Zones" value={s.total} color={s.total > 0 ? '#DC2626' : '#059669'} />
        <KPICard label="Acute" value={s.acute.length} color={PHASE_COLORS.ACUTE.color} sub="0-72h" />
        <KPICard label="Active" value={s.active.length} color={PHASE_COLORS.ACTIVE.color} sub="72h-14d" />
        <KPICard label="Watch" value={s.watch.length} color={PHASE_COLORS.WATCH.color} sub="14-125d" />
        <KPICard label="Ret. Windows" value={s.retWindows.length} color={s.retWindows.length > 0 ? '#DC2626' : '#059669'} sub="18-72h" alert={s.retWindows.length > 0} />
        <KPICard label="Gang-Related" value={s.gangRelated.length} color="#7C3AED" />
      </div>

      {/* KPI Narrative Context */}
      <div style={{
        padding: '10px 14px', borderRadius: radius.sm, marginBottom: 24,
        background: bg.subtle, fontSize: fontSize.xs, color: text.secondary, lineHeight: 1.6,
      }}>
        {s.total === 0 ? (
          <span><strong style={{ color: '#059669' }}>Network clear.</strong> No active contagion zones affecting any campus. This is the safest posture.</span>
        ) : (
          <span>
            <strong>{s.total} homicide{s.total !== 1 ? 's' : ''}</strong> within the last 125 days {s.total !== 1 ? 'have' : 'has'} generated
            active contagion zones near your campuses.
            {s.acute.length > 0 && <> <strong style={{ color: '#DC2626' }}>{s.acute.length} zone{s.acute.length !== 1 ? 's are' : ' is'} in the ACUTE phase</strong> (0-72h) \u2014 this is the highest-risk period.</>}
            {s.retWindows.length > 0 && <> <strong style={{ color: '#DC2626' }}>{s.retWindows.length} retaliation window{s.retWindows.length !== 1 ? 's are' : ' is'} active</strong> \u2014 the 18-72h period when retaliatory violence is most likely.</>}
            {s.acute.length === 0 && s.active.length > 0 && <> <strong style={{ color: '#EA580C' }}>{s.active.length} zone{s.active.length !== 1 ? 's are' : ' is'} in the ACTIVE phase</strong> (72h-14d) \u2014 elevated monitoring recommended.</>}
            {s.acute.length === 0 && s.active.length === 0 && <> All {s.total} zone{s.total !== 1 ? 's are' : ' is'} in the <strong>WATCH phase</strong> (14-125d) \u2014 the immediate danger has passed but statistical risk remains above baseline.</>}
            {' '}Scroll down to see which campuses are affected and how close each zone is.
          </span>
        )}
      </div>

      {/* Retaliation Window Alert */}
      {s.retWindows.length > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: radius.md, marginBottom: 20,
          background: '#FEF2F2', border: '2px solid #DC2626',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: '#DC2626',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div>
            <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#DC2626' }}>
              {s.retWindows.length} RETALIATION WINDOW{s.retWindows.length > 1 ? 'S' : ''} ACTIVE
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 2 }}>
              Peak danger period (18-72h post-homicide). Heightened risk of retaliatory violence near:
              {' '}{s.retWindows.map((z: ContagionZone) => z.block || 'unknown location').join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Understanding This View */}
      <ContagionExplainerPanel />

      {/* Campus Exposure Matrix */}
      <SectionLabel>Campus Exposure Matrix</SectionLabel>
      <div style={{
        fontSize: fontSize.xs, color: text.muted, lineHeight: 1.5, marginBottom: 10,
      }}>
        Which campuses are inside a contagion zone? Click any row with zones to see the specific homicide locations, distances, and phase details.
      </div>
      <div style={{
        borderRadius: radius.md, border: `1px solid ${border.light}`,
        overflow: 'hidden', marginBottom: 24,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.sm }}>
          <thead>
            <tr style={{ background: bg.subtle, borderBottom: `2px solid ${border.light}` }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: text.muted, fontWeight: fontWeight.semibold }}>Campus</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: text.muted, fontWeight: fontWeight.semibold }}>Zones</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: text.muted, fontWeight: fontWeight.semibold }}>Max Phase</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: text.muted, fontWeight: fontWeight.semibold }}>Ret. Window</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', color: text.muted, fontWeight: fontWeight.semibold }}>Risk Score</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: text.muted, fontWeight: fontWeight.semibold }}>Nearest Zone</th>
            </tr>
          </thead>
          <tbody>
            {s.exposureMatrix.map((row: any, i: number) => {
              const campusRisk = allRisks.find(r => r.campusId === row.campus.id);
              const riskColor = campusRisk ? RISK_COLORS[campusRisk.label] : { color: '#6B7280', bg: '#F3F4F6' };
              const nearest = row.zones.length > 0
                ? row.zones.reduce((min: any, z: ContagionZone) =>
                    (z.distanceFromCampus ?? 99) < (min.distanceFromCampus ?? 99) ? z : min, row.zones[0])
                : null;
              const isExpanded = expandedCampus === row.campus.id;
              const hasZones = row.zones.length > 0;
              return (
                <>
                <tr
                  key={row.campus.id}
                  onClick={() => hasZones && onToggleCampus(isExpanded ? null : row.campus.id)}
                  style={{
                    borderBottom: isExpanded ? 'none' : `1px solid ${border.light}`,
                    background: row.inRetWin ? '#FEF2F2' : i % 2 === 0 ? bg.card : bg.subtle,
                    cursor: hasZones ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { if (hasZones) (e.currentTarget as HTMLElement).style.background = row.inRetWin ? '#FEE2E2' : '#F5F0E8'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = row.inRetWin ? '#FEF2F2' : i % 2 === 0 ? bg.card : bg.subtle; }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: fontWeight.semibold, color: text.primary }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {hasZones && <span style={{ fontSize: '10px', color: text.muted, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>{"\u25B6"}</span>}
                      {row.campus.short || row.campus.name}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                    <span style={{
                      fontWeight: fontWeight.bold,
                      color: row.zones.length > 0 ? '#DC2626' : '#059669',
                    }}>
                      {row.zones.length}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                    {row.maxPhase !== 'NONE' ? (
                      <span style={{
                        fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
                        borderRadius: radius.sm, color: 'white',
                        background: PHASE_COLORS[row.maxPhase]?.color || '#6B7280',
                      }}>
                        {row.maxPhase}
                      </span>
                    ) : (
                      <span style={{ fontSize: fontSize.xs, color: text.muted }}>--</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                    {row.inRetWin ? (
                      <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px', borderRadius: radius.sm, color: 'white', background: '#DC2626' }}>
                        ACTIVE
                      </span>
                    ) : (
                      <span style={{ fontSize: fontSize.xs, color: text.muted }}>--</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                    <span style={{
                      fontSize: fontSize.sm, fontWeight: fontWeight.bold,
                      color: riskColor.color,
                    }}>
                      {campusRisk?.score ?? '--'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: fontSize.xs, color: text.muted }}>
                    {nearest ? (
                      <>
                        {fmtDist(nearest.distanceFromCampus ?? 0)} {nearest.bearingFromCampus != null ? compassLabel(nearest.bearingFromCampus) : ''}
                        {nearest.block ? ` near ${nearest.block}` : ''}
                      </>
                    ) : '--'}
                  </td>
                </tr>
                {/* Expanded campus detail drawer */}
                {isExpanded && (
                  <tr key={`${row.campus.id}-detail`}>
                    <td colSpan={6} style={{ padding: 0, borderBottom: `1px solid ${border.light}` }}>
                      <div style={{
                        padding: '16px 20px', background: '#FAFAF5',
                        borderTop: `2px solid ${PHASE_COLORS[row.maxPhase]?.color || brand.brass}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: brand.brass, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                              CAMPUS EXPOSURE DETAIL
                            </div>
                            <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: text.primary, marginTop: 2 }}>
                              {row.campus.name}
                            </div>
                            <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
                              {row.campus.addr} &middot; {row.zones.length} active zone{row.zones.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: fontSize.xs, color: text.muted }}>PULSE Risk Score</div>
                            <div style={{ fontSize: '24px', fontWeight: fontWeight.black, color: riskColor.color }}>
                              {campusRisk?.score ?? '--'}
                            </div>
                          </div>
                        </div>
                        {/* Zone cards inside the drawer */}
                        <div style={{ display: 'grid', gap: 8 }}>
                          {row.zones.map((zone: ContagionZone) => (
                            <div key={zone.incidentId} style={{
                              padding: '12px 16px', borderRadius: radius.md,
                              background: bg.card, border: `1px solid ${PHASE_COLORS[zone.phase]?.border || border.light}`,
                              borderLeft: `4px solid ${PHASE_COLORS[zone.phase]?.color || '#6B7280'}`,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{
                                      fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
                                      borderRadius: radius.sm, color: 'white',
                                      background: PHASE_COLORS[zone.phase]?.color || '#6B7280',
                                    }}>
                                      {zone.phase}
                                    </span>
                                    {zone.retWin && (
                                      <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px', borderRadius: radius.sm, color: 'white', background: '#DC2626' }}>
                                        RET. WINDOW
                                      </span>
                                    )}
                                    {zone.gang && (
                                      <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px', borderRadius: radius.sm, color: '#7C3AED', background: '#EDE9FE' }}>
                                        GANG
                                      </span>
                                    )}
                                    {zone.firearm && (
                                      <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px', borderRadius: radius.sm, color: '#DC2626', background: '#FEF2F2' }}>
                                        FIREARM
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>
                                    Homicide {zone.block ? `near ${zone.block}` : 'location unknown'}
                                  </div>
                                  <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
                                    {fmtAgo(zone.homicideDate)} &middot; {zone.daysLeft}d remaining in 125-day window
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: '16px', fontWeight: fontWeight.black, color: PHASE_COLORS[zone.phase]?.color || '#6B7280' }}>
                                    {fmtDist(zone.distanceFromCampus ?? 0)}
                                  </div>
                                  <div style={{ fontSize: fontSize.xs, color: text.muted }}>
                                    {zone.bearingFromCampus != null ? compassLabel(zone.bearingFromCampus) : ''} of campus
                                  </div>
                                </div>
                              </div>
                              <div style={{
                                marginTop: 8, padding: '6px 10px', borderRadius: radius.sm,
                                background: bg.subtle, fontSize: fontSize.xs, color: text.secondary,
                                display: 'flex', gap: 12, flexWrap: 'wrap' as const,
                              }}>
                                <span><strong>Zone radius:</strong> {zone.radius} mi</span>
                                <span><strong>Distance:</strong> {(zone.distanceFromCampus ?? 0).toFixed(2)} mi</span>
                                <span><strong>Bearing:</strong> {zone.bearingFromCampus != null ? `${Math.round(zone.bearingFromCampus)}\u00B0 (${compassLabel(zone.bearingFromCampus)})` : 'N/A'}</span>
                                <span><strong>Phase window:</strong> {PHASE_LABELS[zone.phase]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Zone Timeline */}
      <SectionLabel>Zone Timeline (125-Day Window)</SectionLabel>
      <div style={{
        fontSize: fontSize.xs, color: text.muted, lineHeight: 1.5, marginBottom: 10,
      }}>
        Each bar represents one homicide-generated zone. The colored portion shows elapsed time; the marker shows the current position in the 125-day window. Zones progress from ACUTE (red) through ACTIVE (orange) to WATCH (amber) as time passes.
      </div>
      <div style={{
        padding: '16px', borderRadius: radius.md,
        background: bg.card, border: `1px solid ${border.light}`,
        marginBottom: 24,
      }}>
        {zones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: text.muted, fontSize: fontSize.sm }}>
            No active contagion zones. The network is clear.
          </div>
        ) : (
          <div>
            {/* Timeline header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, paddingLeft: 120 }}>
              {['0', '72h', '14d', '30d', '60d', '90d', '125d'].map((label, i) => (
                <div key={i} style={{
                  flex: i === 0 ? 0 : 1, fontSize: fontSize.xs, color: text.muted,
                  textAlign: i === 0 ? 'left' : 'center',
                  minWidth: i === 0 ? 0 : undefined,
                }}>
                  {label}
                </div>
              ))}
            </div>
            {/* Zone bars */}
            {zones.map((zone) => {
              const pct = Math.min(100, (zone.ageH / 3000) * 100);
              const remainPct = 100 - pct;
              const phaseColor = PHASE_COLORS[zone.phase];
              return (
                <div
                  key={zone.incidentId}
                  style={{
                    display: 'flex', alignItems: 'center', marginBottom: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => onToggleZone(expandedZone === zone.incidentId ? null : zone.incidentId)}
                >
                  <div style={{
                    width: 120, flexShrink: 0, fontSize: fontSize.xs,
                    color: text.primary, fontWeight: fontWeight.semibold,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    paddingRight: 8,
                  }}>
                    {zone.block || 'Unknown'}
                  </div>
                  <div style={{
                    flex: 1, height: 20, background: bg.subtle, borderRadius: radius.sm,
                    overflow: 'hidden', position: 'relative',
                  }}>
                    {/* Elapsed portion */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${pct}%`,
                      background: phaseColor.color,
                      opacity: 0.3,
                      borderRadius: `${radius.sm} 0 0 ${radius.sm}`,
                    }} />
                    {/* Current position marker */}
                    <div style={{
                      position: 'absolute', left: `${pct}%`, top: 0, bottom: 0,
                      width: 3, background: phaseColor.color,
                      transform: 'translateX(-1.5px)',
                    }} />
                    {/* Phase label */}
                    <div style={{
                      position: 'absolute', left: `${Math.max(2, pct - 15)}%`, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '8px', fontWeight: fontWeight.bold, color: phaseColor.color,
                      letterSpacing: '0.05em',
                    }}>
                      {zone.phase}
                    </div>
                    {/* Days remaining */}
                    <div style={{
                      position: 'absolute', right: 6, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '9px', color: text.muted,
                    }}>
                      {zone.daysLeft}d left
                    </div>
                    {/* Retaliation window indicator */}
                    {zone.retWin && (
                      <div style={{
                        position: 'absolute', left: `${(18/3000)*100}%`, top: 0, bottom: 0,
                        width: `${((72-18)/3000)*100}%`,
                        background: '#DC262640',
                        borderLeft: '1px dashed #DC2626',
                        borderRight: '1px dashed #DC2626',
                      }} />
                    )}
                  </div>
                  <div style={{
                    width: 50, flexShrink: 0, textAlign: 'right',
                    fontSize: fontSize.xs, color: text.muted,
                  }}>
                    {fmtAgo(zone.homicideDate)}
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingLeft: 120 }}>
              {Object.entries(PHASE_COLORS).map(([phase, colors]) => (
                <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.color }} />
                  <span style={{ fontSize: fontSize.xs, color: text.muted }}>
                    {phase} ({PHASE_LABELS[phase]})
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC262660' }} />
                <span style={{ fontSize: fontSize.xs, color: text.muted }}>Retaliation Window</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Zone Detail */}
      <SectionLabel>Active Zones ({zones.length})</SectionLabel>
      <div style={{
        fontSize: fontSize.xs, color: text.muted, lineHeight: 1.5, marginBottom: 10,
      }}>
        Every active contagion zone in the network. Click to expand and see which campuses are exposed, zone radius, and detailed location data.
      </div>
      <div style={{ marginBottom: 24 }}>
        {zones.length === 0 ? (
          <div style={{
            padding: '24px', borderRadius: radius.md,
            background: '#ECFDF5', border: '1px solid #A7F3D0',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#059669' }}>
              Network Clear
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4 }}>
              No active homicide-generated contagion zones affecting any campus.
            </div>
          </div>
        ) : (
          zones.map((zone) => (
            <ZoneCard
              key={zone.incidentId}
              zone={zone}
              expanded={expandedZone === zone.incidentId}
              onToggle={() => onToggleZone(expandedZone === zone.incidentId ? null : zone.incidentId)}
              allRisks={allRisks}
            />
          ))
        )}
      </div>

      {/* AI Analysis */}
      <AIAnalysisSection
        analysis={aiAnalysis}
        loading={aiLoading}
        onRun={onRunAi}
        label={`Analyze ${zones.length} Contagion Zone${zones.length !== 1 ? 's' : ''}`}
      />
    </div>
  );
}

// ─── Campus-Level View ───────────────────────────────────────────────────────

function CampusContagionView({ campus, exposure, allZones, risk, aiAnalysis, aiLoading, onRunAi, expandedZone, onToggleZone }: {
  campus: Campus; exposure: ContagionZone[]; allZones: ContagionZone[];
  risk?: CampusRisk; aiAnalysis: string; aiLoading: boolean; onRunAi: () => void;
  expandedZone: string | null; onToggleZone: (id: string | null) => void;
}) {
  const acuteCount = exposure.filter(z => z.phase === 'ACUTE').length;
  const activeCount = exposure.filter(z => z.phase === 'ACTIVE').length;
  const watchCount = exposure.filter(z => z.phase === 'WATCH').length;
  const retWindows = exposure.filter(z => z.retWin);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: brand.brass, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
          CAMPUS CONTAGION EXPOSURE
        </div>
        <div style={{ fontSize: '20px', fontWeight: fontWeight.bold, color: text.primary, fontFamily: font.serif }}>
          {campus.name}
        </div>
        <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 4 }}>
          {campus.addr} &middot; {exposure.length} active zone{exposure.length !== 1 ? 's' : ''} affecting this campus
        </div>
        {/* Campus-level narrative */}
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: radius.sm,
          background: bg.subtle, fontSize: fontSize.xs, color: text.secondary, lineHeight: 1.6,
        }}>
          {exposure.length === 0 ? (
            <span><strong style={{ color: '#059669' }}>No active exposure.</strong> This campus is not within any homicide-generated contagion zone. This is the safest posture for this location.</span>
          ) : (
            <span>
              <strong>{campus.name}</strong> is currently inside <strong>{exposure.length} contagion zone{exposure.length !== 1 ? 's' : ''}</strong> \u2014
              meaning {exposure.length !== 1 ? 'homicides have' : 'a homicide has'} occurred nearby within the last 125 days, and the statistical risk of
              follow-on violence remains elevated. {retWindows.length > 0 && <><strong style={{ color: '#DC2626' }}>A retaliation window is active</strong> \u2014 this is the most dangerous period (18-72h post-homicide). Enhanced security protocols should be in effect. </>}
              {acuteCount > 0 && retWindows.length === 0 && <><strong style={{ color: '#DC2626' }}>{acuteCount} zone{acuteCount !== 1 ? 's are' : ' is'} in the ACUTE phase</strong> (0-72h). Heightened vigilance is recommended. </>}
              {acuteCount === 0 && activeCount > 0 && <>{activeCount} zone{activeCount !== 1 ? 's are' : ' is'} in the ACTIVE phase (72h-14d). The community is still processing the event. </>}
              {acuteCount === 0 && activeCount === 0 && <>All zones are in the WATCH phase (14-125d). The immediate danger has passed but awareness should continue. </>}
              See details below for each zone\u2019s location, distance, and bearing from campus.
            </span>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        <KPICard label="Zones Exposed" value={exposure.length} color={exposure.length > 0 ? '#DC2626' : '#059669'} />
        <KPICard label="Acute" value={acuteCount} color={PHASE_COLORS.ACUTE.color} sub="0-72h" />
        <KPICard label="Active" value={activeCount} color={PHASE_COLORS.ACTIVE.color} sub="72h-14d" />
        <KPICard label="Watch" value={watchCount} color={PHASE_COLORS.WATCH.color} sub="14-125d" />
        <KPICard label="Ret. Windows" value={retWindows.length} color={retWindows.length > 0 ? '#DC2626' : '#059669'} alert={retWindows.length > 0} />
      </div>

      {/* Retaliation Alert */}
      {retWindows.length > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: radius.md, marginBottom: 20,
          background: '#FEF2F2', border: '2px solid #DC2626',
        }}>
          <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#DC2626' }}>
            RETALIATION WINDOW ACTIVE
          </div>
          <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4 }}>
            {campus.name} is within the 18-72h retaliation window for {retWindows.length} homicide zone{retWindows.length > 1 ? 's' : ''}.
            This is the peak danger period for retaliatory violence.
            {retWindows.map((z, i) => (
              <span key={i}> Zone near {z.block || 'unknown'} ({fmtDist(z.distanceFromCampus ?? 0)} {z.bearingFromCampus != null ? compassLabel(z.bearingFromCampus) : ''}).</span>
            ))}
          </div>
        </div>
      )}

      {/* Exposure Detail */}
      {exposure.length === 0 ? (
        <div style={{
          padding: '24px', borderRadius: radius.md, marginBottom: 24,
          background: '#ECFDF5', border: '1px solid #A7F3D0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#059669' }}>
            No Active Exposure
          </div>
          <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4 }}>
            This campus is not within any active homicide-generated contagion zone.
          </div>
        </div>
      ) : (
        <>
          <SectionLabel>Zone Exposure Detail</SectionLabel>
          <div style={{ marginBottom: 24 }}>
            {exposure.map((zone) => (
              <div key={zone.incidentId} style={{
                padding: '14px 18px', borderRadius: radius.md, marginBottom: 8,
                background: bg.card, border: `1px solid ${PHASE_COLORS[zone.phase].border}`,
                borderLeft: `4px solid ${PHASE_COLORS[zone.phase].color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
                        borderRadius: radius.sm, color: 'white',
                        background: PHASE_COLORS[zone.phase].color,
                      }}>
                        {zone.phase}
                      </span>
                      {zone.retWin && (
                        <span style={{
                          fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
                          borderRadius: radius.sm, color: 'white', background: '#DC2626',
                        }}>
                          RETALIATION WINDOW
                        </span>
                      )}
                      {zone.gang && (
                        <span style={{
                          fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
                          borderRadius: radius.sm, color: '#7C3AED', background: '#EDE9FE',
                        }}>
                          GANG-RELATED
                        </span>
                      )}
                      {zone.firearm && (
                        <span style={{
                          fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
                          borderRadius: radius.sm, color: '#DC2626', background: '#FEF2F2',
                        }}>
                          FIREARM
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary, marginTop: 6 }}>
                      Homicide {zone.block ? `near ${zone.block}` : ''}
                    </div>
                    <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 2 }}>
                      {fmtAgo(zone.homicideDate)} &middot; {zone.daysLeft} days remaining in 125-day window
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: fontWeight.black, color: PHASE_COLORS[zone.phase].color }}>
                      {fmtDist(zone.distanceFromCampus ?? 0)}
                    </div>
                    <div style={{ fontSize: fontSize.xs, color: text.muted }}>
                      {zone.bearingFromCampus != null ? compassLabel(zone.bearingFromCampus) : ''} of campus
                    </div>
                  </div>
                </div>

                {/* Distance context */}
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: radius.sm,
                  background: bg.subtle, fontSize: fontSize.xs, color: text.secondary,
                }}>
                  <strong>Zone radius:</strong> {zone.radius} mi &middot;
                  <strong> Campus distance:</strong> {(zone.distanceFromCampus ?? 0).toFixed(2)} mi &middot;
                  <strong> Bearing:</strong> {zone.bearingFromCampus != null ? `${Math.round(zone.bearingFromCampus)}deg (${compassLabel(zone.bearingFromCampus)})` : 'N/A'} &middot;
                  <strong> Phase:</strong> {PHASE_LABELS[zone.phase]}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Network Context */}
      <SectionLabel>Network Context</SectionLabel>
      <div style={{
        fontSize: fontSize.xs, color: text.muted, lineHeight: 1.5, marginBottom: 10,
      }}>
        How this campus compares to the rest of the network.
      </div>
      <div style={{
        padding: '12px 16px', borderRadius: radius.md, marginBottom: 24,
        background: bg.subtle, border: `1px solid ${border.light}`,
        fontSize: fontSize.sm, color: text.secondary,
      }}>
        {allZones.length} total contagion zone{allZones.length !== 1 ? 's' : ''} active across the network.
        {' '}{campus.name} is exposed to {exposure.length} of them.
        {exposure.length > 0 && allZones.length > 0 && (
          <> This campus accounts for {Math.round((exposure.length / allZones.length) * 100)}% of network-wide zone exposure.</>
        )}
      </div>

      {/* AI Analysis */}
      <AIAnalysisSection
        analysis={aiAnalysis}
        loading={aiLoading}
        onRun={onRunAi}
        label={`Analyze ${campus.short || campus.name} Exposure`}
      />
    </div>
  );
}

// ─── Zone Card (for network view) ────────────────────────────────────────────

function ZoneCard({ zone, expanded, onToggle, allRisks }: {
  zone: ContagionZone; expanded: boolean; onToggle: () => void; allRisks: CampusRisk[];
}) {
  const phaseColor = PHASE_COLORS[zone.phase];

  // Find which campuses this zone exposes
  const exposedCampuses = useMemo(() => {
    const result: { campus: Campus; distance: number; bearing: number }[] = [];
    for (const campus of CAMPUSES) {
      const dist = haversine(campus.lat, campus.lng, zone.lat, zone.lng);
      if (dist <= zone.radius) {
        result.push({
          campus,
          distance: dist,
          bearing: bearing(campus.lat, campus.lng, zone.lat, zone.lng),
        });
      }
    }
    result.sort((a, b) => a.distance - b.distance);
    return result;
  }, [zone]);

  return (
    <div style={{
      borderRadius: radius.md, marginBottom: 8,
      background: bg.card, border: `1px solid ${phaseColor.border}`,
      borderLeft: `4px solid ${phaseColor.color}`,
      overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '14px 18px', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
            borderRadius: radius.sm, color: 'white', background: phaseColor.color,
          }}>
            {zone.phase}
          </span>
          {zone.retWin && (
            <span style={{
              fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 8px',
              borderRadius: radius.sm, color: 'white', background: '#DC2626',
            }}>
              RET. WINDOW
            </span>
          )}
          <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>
            {zone.block || 'Unknown Location'}
          </span>
          <span style={{ fontSize: fontSize.xs, color: text.muted }}>
            {fmtAgo(zone.homicideDate)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: fontSize.sm, color: text.muted }}>
            {exposedCampuses.length} campus{exposedCampuses.length !== 1 ? 'es' : ''}
          </span>
          <span style={{ fontSize: fontSize.sm, color: text.muted }}>
            {zone.daysLeft}d left
          </span>
          <span style={{ fontSize: fontSize.sm, color: text.muted, transform: expanded ? 'rotate(180deg)' : 'none', transition: transition.fast }}>
            &#9660;
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: `1px solid ${border.light}` }}>
          <div style={{ paddingTop: 12 }}>
            {/* Zone details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <DetailCell label="Phase" value={`${zone.phase} (${PHASE_LABELS[zone.phase]})`} />
              <DetailCell label="Radius" value={`${zone.radius} mi`} />
              <DetailCell label="Days Remaining" value={`${zone.daysLeft} of 125`} />
              <DetailCell label="Gang-Related" value={zone.gang ? 'Yes' : 'No'} />
              <DetailCell label="Firearm" value={zone.firearm ? 'Confirmed' : 'Unknown'} />
              <DetailCell label="Retaliation" value={zone.retWin ? 'ACTIVE (18-72h)' : 'No'} />
            </div>

            {/* Exposed campuses */}
            {exposedCampuses.length > 0 && (
              <>
                <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: text.muted, letterSpacing: '0.06em', marginBottom: 6 }}>
                  EXPOSED CAMPUSES
                </div>
                {exposedCampuses.map(({ campus, distance, bearing: b }) => {
                  const campusRisk = allRisks.find(r => r.campusId === campus.id);
                  return (
                    <div key={campus.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 10px', marginBottom: 4, borderRadius: radius.sm,
                      background: bg.subtle,
                    }}>
                      <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>
                        {campus.short || campus.name}
                      </span>
                      <span style={{ fontSize: fontSize.xs, color: text.muted }}>
                        {fmtDist(distance)} {compassLabel(b)} &middot; Score: {campusRisk?.score ?? '--'}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Sub-Components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: text.muted,
      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function KPICard({ label, value, color, sub, alert }: {
  label: string; value: number; color: string; sub?: string; alert?: boolean;
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: radius.md,
      background: bg.card, border: `1px solid ${alert ? '#DC2626' : border.light}`,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '22px', fontWeight: fontWeight.black, color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.primary, marginTop: 4 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: '9px', color: text.muted, marginTop: 1 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '6px 8px', borderRadius: radius.sm, background: bg.subtle }}>
      <div style={{ fontSize: '9px', color: text.muted, fontWeight: fontWeight.semibold, letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: fontSize.sm, color: text.primary, fontWeight: fontWeight.medium, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function AIAnalysisSection({ analysis, loading, onRun, label }: {
  analysis: string; loading: boolean; onRun: () => void; label: string;
}) {
  return (
    <div style={{
      padding: '16px 20px', borderRadius: radius.md,
      background: bg.card, border: `1px solid ${border.light}`,
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: analysis ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: brand.brass, letterSpacing: '0.08em' }}>
            AI CONTAGION ANALYSIS
          </div>
          <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 2 }}>
            Pattern detection and strategic recommendations
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          style={{
            padding: '8px 16px', borderRadius: radius.md,
            background: loading ? bg.subtle : brand.brass,
            color: loading ? text.muted : 'white',
            border: 'none', cursor: loading ? 'default' : 'pointer',
            fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
            fontFamily: font.sans, transition: transition.fast,
          }}
        >
          {loading ? 'Analyzing...' : label}
        </button>
      </div>
      {loading && (
        <div style={{ padding: '16px 0' }}>
          {[80, 100, 60].map((w, i) => (
            <div key={i} style={{
              height: 12, borderRadius: radius.sm, marginBottom: 8,
              background: `linear-gradient(90deg, ${bg.subtle} 0%, ${border.light} 50%, ${bg.subtle} 100%)`,
              width: `${w}%`,
              animation: 'shimmer 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}
      {analysis && !loading && (
        <div style={{
          fontSize: fontSize.base, color: text.secondary, lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {analysis}
        </div>
      )}
    </div>
  );
}
