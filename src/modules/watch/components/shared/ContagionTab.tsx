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
import ContagionAnalystChat from './ContagionAnalystChat';
import { NetworkStoryArc } from '../../v3/NetworkStoryArc';

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

  // Determine overall network threat level from zones
  const networkThreat = s.retWindows.length > 0 ? 'CRITICAL'
    : s.acute.length > 0 ? 'HIGH'
    : s.active.length > 0 ? 'ELEVATED'
    : s.total > 0 ? 'WATCH'
    : 'CLEAR';
  const threatConfig: Record<string, { color: string; bg: string; border: string; label: string; desc: string }> = {
    CRITICAL: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'CRITICAL', desc: 'Retaliation window active — peak danger period for follow-on violence.' },
    HIGH:     { color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', label: 'HIGH',     desc: 'ACUTE contagion zone(s) active — homicide within 72 hours of a campus.' },
    ELEVATED: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'ELEVATED', desc: 'ACTIVE zones present — homicide within 14 days. Heightened monitoring.' },
    WATCH:    { color: '#B79145', bg: '#FDFAF3', border: '#E5D9B6', label: 'WATCH',    desc: 'Zones in WATCH phase only — risk above baseline but immediate danger passed.' },
    CLEAR:    { color: '#16A34A', bg: '#F0FDF4', border: '#A7F3D0', label: 'CLEAR',    desc: 'No active contagion zones. Network is at baseline risk.' },
  };
  const tc = threatConfig[networkThreat];

  // Build campus spread data
  const campusSpread = s.exposureMatrix.filter((row: any) => row.zones.length > 0);

  // Recommended actions based on threat level
  const recommendedActions: { priority: string; action: string; color: string }[] = [];
  if (s.retWindows.length > 0) {
    recommendedActions.push({ priority: 'IMMEDIATE', action: `Activate enhanced security protocols at campuses near retaliation windows. Alert principals at: ${s.retWindows.map((z: ContagionZone) => z.block || 'unknown').slice(0, 2).join(', ')}.`, color: '#DC2626' });
  }
  if (s.acute.length > 0) {
    const acuteCampuses = s.exposureMatrix.filter((r: any) => r.zones.some((z: ContagionZone) => z.phase === 'ACUTE')).map((r: any) => r.campus.short).slice(0, 3);
    recommendedActions.push({ priority: 'TODAY', action: `Brief principals at ${acuteCampuses.join(', ')} on ACUTE zone status. Review dismissal routes and after-school programming.`, color: '#EA580C' });
  }
  if (s.active.length > 0) {
    recommendedActions.push({ priority: 'THIS WEEK', action: `Monitor ${s.active.length} ACTIVE zone${s.active.length !== 1 ? 's' : ''} for escalation. Maintain heightened staff awareness at affected campuses.`, color: '#D97706' });
  }
  if (s.total === 0) {
    recommendedActions.push({ priority: 'ROUTINE', action: 'Network is clear. Continue standard monitoring protocols. No additional actions required.', color: '#16A34A' });
  } else {
    recommendedActions.push({ priority: 'ONGOING', action: `Track ${s.total} active zone${s.total !== 1 ? 's' : ''} across ${campusSpread.length} campus${campusSpread.length !== 1 ? 'es' : ''}. Run AI analysis below for pattern detection and strategic guidance.`, color: '#6B7280' });
  }

  return (
    <div>
      {/* ═══ PANEL 1: THREAT LEVEL HEADER ═══ */}
      <div style={{
        padding: '24px 28px', borderRadius: radius.lg, marginBottom: 20,
        background: tc.bg, border: `2px solid ${tc.border}`,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        {/* Pulse dot */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: tc.color, flexShrink: 0,
          boxShadow: `0 0 0 4px ${tc.color}30`,
          animation: networkThreat !== 'CLEAR' ? 'pulse 1.5s ease-in-out infinite' : undefined,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: '11px', fontWeight: fontWeight.bold, color: tc.color, letterSpacing: '0.12em' }}>
              NETWORK CONTAGION STATUS
            </span>
            <span style={{
              fontSize: '11px', fontWeight: fontWeight.bold, padding: '2px 10px',
              borderRadius: radius.sm, background: tc.color, color: '#fff',
              letterSpacing: '0.08em',
            }}>
              {tc.label}
            </span>
          </div>
          <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: 4 }}>
            {tc.desc}
          </div>
          <div style={{ fontSize: fontSize.xs, color: text.muted }}>
            Based on the Papachristos Violence Contagion Model (JAMA 2017) &middot; 125-day window &middot; {s.total} active zone{s.total !== 1 ? 's' : ''}
          </div>
        </div>
        {/* KPI summary */}
        <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          {[
            { label: 'ACUTE', value: s.acute.length, color: '#DC2626' },
            { label: 'ACTIVE', value: s.active.length, color: '#EA580C' },
            { label: 'WATCH', value: s.watch.length, color: '#D97706' },
            { label: 'RET. WIN', value: s.retWindows.length, color: s.retWindows.length > 0 ? '#DC2626' : '#9CA3AF' },
          ].map(kpi => (
            <div key={kpi.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: fontWeight.black, color: kpi.color, lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: '9px', fontWeight: fontWeight.bold, color: text.muted, letterSpacing: '0.06em', marginTop: 2 }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ PANEL 2: CAMPUS SPREAD GRID ═══ */}
      <div style={{
        background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <SectionLabel>CAMPUS SPREAD</SectionLabel>
            <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: -4 }}>
              Which campuses are inside an active contagion zone right now
            </div>
          </div>
          <div style={{ fontSize: fontSize.xs, color: text.muted }}>
            {campusSpread.length} of {s.exposureMatrix.length} campuses affected
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {s.exposureMatrix.map((row: any) => {
            const hasZones = row.zones.length > 0;
            const phaseColor = hasZones ? (PHASE_COLORS[row.maxPhase]?.color || '#6B7280') : '#16A34A';
            const phaseBg = hasZones ? (PHASE_COLORS[row.maxPhase]?.bg || '#F3F4F6') : '#F0FDF4';
            const campusRisk = allRisks.find(r => r.campusId === row.campus.id);
            return (
              <div
                key={row.campus.id}
                onClick={() => hasZones && onToggleCampus(expandedCampus === row.campus.id ? null : row.campus.id)}
                style={{
                  padding: '10px 12px', borderRadius: radius.md,
                  background: phaseBg,
                  border: `1px solid ${row.inRetWin ? '#DC2626' : phaseColor + '40'}`,
                  borderTop: `3px solid ${phaseColor}`,
                  cursor: hasZones ? 'pointer' : 'default',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { if (hasZones) (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              >
                <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: text.primary, marginBottom: 3 }}>
                  {row.campus.short}
                </div>
                <div style={{ fontSize: '9px', fontWeight: fontWeight.bold, color: phaseColor, letterSpacing: '0.06em' }}>
                  {hasZones ? `${row.zones.length} ZONE${row.zones.length !== 1 ? 'S' : ''} · ${row.maxPhase}` : 'CLEAR'}
                </div>
                {row.inRetWin && (
                  <div style={{ fontSize: '9px', fontWeight: fontWeight.bold, color: '#DC2626', marginTop: 2 }}>
                    ⚠ RET. WINDOW
                  </div>
                )}
                {campusRisk && (
                  <div style={{ fontSize: '9px', color: text.muted, marginTop: 2 }}>
                    Score: {campusRisk.score}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Expanded campus detail */}
        {expandedCampus && (() => {
          const row = s.exposureMatrix.find((r: any) => r.campus.id === expandedCampus);
          if (!row) return null;
          const campusRisk = allRisks.find(r => r.campusId === row.campus.id);
          return (
            <div style={{
              marginTop: 16, padding: '16px 18px', borderRadius: radius.md,
              background: bg.subtle, border: `1px solid ${border.light}`,
              borderTop: `3px solid ${PHASE_COLORS[row.maxPhase]?.color || brand.brass}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: text.primary }}>{row.campus.name}</div>
                  <div style={{ fontSize: fontSize.xs, color: text.muted }}>{row.campus.addr} &middot; {row.zones.length} active zone{row.zones.length !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={() => onToggleCampus(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: fontSize.sm, color: text.muted }}>&#x2715;</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {row.zones.map((zone: ContagionZone) => (
                  <div key={zone.incidentId} style={{
                    padding: '10px 14px', borderRadius: radius.sm,
                    background: bg.card, border: `1px solid ${PHASE_COLORS[zone.phase]?.border || border.light}`,
                    borderLeft: `4px solid ${PHASE_COLORS[zone.phase]?.color || '#6B7280'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 6px', borderRadius: 3, background: PHASE_COLORS[zone.phase]?.color, color: '#fff' }}>{zone.phase}</span>
                        {zone.retWin && <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 6px', borderRadius: 3, background: '#DC2626', color: '#fff' }}>RET. WINDOW</span>}
                        {zone.gang && <span style={{ fontSize: '9px', color: '#7C3AED', fontWeight: fontWeight.bold }}>GANG</span>}
                      </div>
                      <div style={{ fontSize: fontSize.sm, color: text.primary }}>
                        Homicide {zone.block ? `near ${zone.block}` : ''}
                      </div>
                      <div style={{ fontSize: fontSize.xs, color: text.muted }}>
                        {fmtAgo(zone.homicideDate)} &middot; {zone.daysLeft}d remaining
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: fontWeight.black, color: PHASE_COLORS[zone.phase]?.color }}>{fmtDist(zone.distanceFromCampus ?? 0)}</div>
                      <div style={{ fontSize: fontSize.xs, color: text.muted }}>{zone.bearingFromCampus != null ? compassLabel(zone.bearingFromCampus) : ''} of campus</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ═══ PANEL 3: RECOMMENDED ACTIONS ═══ */}
      <div style={{
        background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <SectionLabel>RECOMMENDED ACTIONS</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recommendedActions.map((action, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '12px 14px', borderRadius: radius.md,
              background: bg.subtle, border: `1px solid ${border.light}`,
              borderLeft: `4px solid ${action.color}`,
            }}>
              <div style={{
                fontSize: '9px', fontWeight: fontWeight.bold, color: action.color,
                letterSpacing: '0.08em', whiteSpace: 'nowrap', paddingTop: 2,
                minWidth: 80,
              }}>
                {action.priority}
              </div>
              <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.6 }}>
                {action.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ DECAY TIMELINE VISUALIZATION ═══ */}
      <div style={{
        background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>CONTAGION DECAY TIMELINE</SectionLabel>
          <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: -4 }}>
            Each bar represents one active zone — width shows time elapsed in the 125-day window
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {zones.slice(0, 12).map((zone, i) => {
            const pct = Math.min(100, Math.round((zone.ageH / (125 * 24)) * 100));
            const remaining = Math.max(0, 125 - Math.floor(zone.ageH / 24));
            const phaseColor = zone.phase === 'ACUTE' ? '#DC2626' : zone.phase === 'ACTIVE' ? '#EA580C' : '#D97706';
            const phaseBg = zone.phase === 'ACUTE' ? '#FEF2F2' : zone.phase === 'ACTIVE' ? '#FFF7ED' : '#FFFBEB';
            return (
              <div key={zone.incidentId || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 52, flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 5px', borderRadius: 3, background: phaseColor, color: '#fff' }}>
                    {zone.phase}
                  </span>
                </div>
                <div style={{ flex: 1, height: 18, background: phaseBg, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${phaseColor}CC, ${phaseColor}66)`,
                    borderRadius: 4,
                  }} />
                  {zone.retWin && (
                    <div style={{
                      position: 'absolute', right: 4, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '8px', color: '#DC2626', fontWeight: fontWeight.bold,
                    }}>⚠ RET</div>
                  )}
                </div>
                <div style={{ width: 52, flexShrink: 0, fontSize: fontSize.xs, color: text.muted, textAlign: 'right' }}>
                  {remaining}d left
                </div>
                <div style={{ width: 130, flexShrink: 0, fontSize: fontSize.xs, color: text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {zone.block || zone.homicideAddress || 'Unknown block'}
                </div>
              </div>
            );
          })}
          {zones.length > 12 && (
            <div style={{ fontSize: fontSize.xs, color: text.muted, paddingLeft: 62, paddingTop: 4 }}>
              + {zones.length - 12} more zones not shown
            </div>
          )}
          {zones.length === 0 && (
            <div style={{ fontSize: fontSize.sm, color: text.muted, textAlign: 'center', padding: '16px 0' }}>
              No active contagion zones. Network is clear.
            </div>
          )}
        </div>
      </div>

      {/* ═══ NETWORK STORY ARC ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>THE 125-DAY STORY</div>
        <NetworkStoryArc zones={zones} />
      </div>

      {/* ═══ AI CONTAGION ANALYST (CONVERSATIONAL) ═══ */}
      <ContagionAnalystChat
        zones={zones}
        stats={s}
        aiAnalysis={aiAnalysis}
        aiLoading={aiLoading}
        onRunAi={onRunAi}
      />

      {/* ═══ EXPLAINER (COLLAPSED BY DEFAULT) ═══ */}
      <ContagionExplainerPanel />
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
        <div style={{ fontSize: '20px', fontWeight: fontWeight.bold, color: text.primary, fontFamily: font.body }}>
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
