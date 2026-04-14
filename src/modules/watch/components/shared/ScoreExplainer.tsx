/**
 * ScoreExplainer — FICO-style slide-out drawer for risk score transparency.
 *
 * Shows exactly how a campus risk score was calculated:
 *   1. Waterfall bar chart: Contagion → Acute → Environmental → Seasonal = Score
 *   2. Incident attribution: specific events driving each component
 *   3. Label explanation: why the label is what it is
 *   4. How It Works: full methodology with Papachristos citations
 *
 * Design: Right-side drawer, 480px wide, dark overlay, smooth slide animation.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Campus } from '../../data/campuses';
import type { CampusRisk, Incident, ContagionZone, ShotSpotterEvent } from '../../engine/types';
import { haversine, ageInHours, fmtAgo, fmtDist, compassLabel, bearing } from '../../engine/geo';
import {
  CONTAGION_WEIGHTS,
  ENVIRONMENTAL_WEIGHTS,
  recencyMult,
  DOW_BONUS,
  MONTH_BONUS,
  tempBonus,
  isContagionCrime,
  RISK_COLORS,
} from '../../data/weights';
import type { RiskLabel } from '../../data/weights';
import { C, bg, text, brand, border, font, fontSize, fontWeight, shadow, radius, transition, risk as riskTheme } from '../../../../core/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IncidentContribution {
  id: string;
  type: string;
  distance: number;
  ageHours: number;
  weight: number;
  recencyMult: number;
  totalContribution: number;
  block?: string;
  date: string;
  category: 'contagion' | 'environmental';
}

interface ScoreBreakdown {
  contagionBase: number;
  envBase: number;
  acute: number;
  seasonal: number;
  rawScore: number;
  displayScore: number;
  label: RiskLabel;
  labelReason: string;
  dowBonus: number;
  monthBonus: number;
  tempBonusVal: number;
  topContributors: IncidentContribution[];
  acuteEvents: { type: string; distance: number; age: number; points: number; block?: string }[];
  shotSpotterEvents: { distance: number; age: number; points: number }[];
  contagionZoneCount: number;
  retaliationActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  campus: Campus;
  risk: CampusRisk;
  incidents: Incident[];
  acuteIncidents: Incident[];
  shotSpotterEvents: ShotSpotterEvent[];
  tempF: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function computeBreakdown(
  campus: Campus,
  risk: CampusRisk,
  incidents: Incident[],
  acuteIncidents: Incident[],
  shots: ShotSpotterEvent[],
  tempF: number,
): ScoreBreakdown {
  const now = new Date();
  let rawContagionSum = 0;
  let rawEnvSum = 0;
  const contributors: IncidentContribution[] = [];

  for (const inc of incidents) {
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    if (dist > 2.0) continue;
    const ageH = ageInHours(inc.date);
    if (ageH > 720) continue;
    const mult = recencyMult(ageH);

    const cw = isContagionCrime(inc.type) ? getWeight(CONTAGION_WEIGHTS, inc.type, dist) : 0;
    const ew = !isContagionCrime(inc.type) ? getWeight(ENVIRONMENTAL_WEIGHTS, inc.type, dist) : 0;

    if (cw > 0) {
      rawContagionSum += cw * mult;
      contributors.push({
        id: inc.id, type: inc.type, distance: dist, ageHours: ageH,
        weight: cw, recencyMult: mult, totalContribution: cw * mult,
        block: inc.block, date: inc.date, category: 'contagion',
      });
    }
    if (ew > 0) {
      rawEnvSum += ew * mult;
      contributors.push({
        id: inc.id, type: inc.type, distance: dist, ageHours: ageH,
        weight: ew, recencyMult: mult, totalContribution: ew * mult,
        block: inc.block, date: inc.date, category: 'environmental',
      });
    }
  }

  const contagionBase = Math.min(70, Math.round(50 * Math.log10(1 + rawContagionSum / 8)));
  const envBase = Math.min(15, Math.round(15 * Math.log10(1 + rawEnvSum / 5)));

  // Acute events
  const acuteEvents: ScoreBreakdown['acuteEvents'] = [];
  let acuteVal = 0;
  for (const inc of acuteIncidents) {
    if (!isContagionCrime(inc.type)) continue;
    const dist = haversine(campus.lat, campus.lng, inc.lat, inc.lng);
    const ageH = ageInHours(inc.date);
    if (ageH > 72) continue;
    let pts = 0;
    if (inc.type === 'HOMICIDE') {
      if (dist <= 0.25) pts = 40;
      else if (dist <= 0.5) pts = 30;
      else if (dist <= 1.0) pts = 20;
    }
    if ((inc.type === 'WEAPONS VIOLATION' || inc.type === 'CRIM SEXUAL ASSAULT') && dist <= 0.5) {
      pts = 15;
    }
    if (pts > 0) {
      acuteVal = Math.max(acuteVal, pts);
      acuteEvents.push({ type: inc.type, distance: dist, age: ageH, points: pts, block: inc.block });
    }
  }

  // ShotSpotter
  const shotEvents: ScoreBreakdown['shotSpotterEvents'] = [];
  let shotBonus = 0;
  for (const shot of shots) {
    const dist = haversine(campus.lat, campus.lng, shot.lat, shot.lng);
    const ageH = ageInHours(shot.date);
    let pts = 0;
    if (ageH <= 1 && dist <= 0.25) pts = 25;
    else if (ageH <= 2 && dist <= 0.5) pts = 15;
    if (pts > 0) {
      shotBonus = Math.max(shotBonus, pts);
      shotEvents.push({ distance: dist, age: ageH, points: pts });
    }
  }
  acuteVal = Math.max(acuteVal, shotBonus);
  const acute = Math.min(45, acuteVal);

  // Seasonal
  const dow = now.getDay();
  const month = now.getMonth();
  const dowB = DOW_BONUS[dow] ?? 0;
  const monthB = MONTH_BONUS[month] ?? 0;
  const tempB = tempBonus(tempF);
  const seasonal = dowB + monthB + tempB;

  const rawScore = Math.min(100, contagionBase + envBase + acute + seasonal);

  // Label reason
  let labelReason = '';
  if (risk.inRetaliationWindow) {
    labelReason = 'Campus is within a retaliation window (18-72h post-homicide within 0.5mi)';
  } else if (risk.label === 'HIGH') {
    labelReason = 'Homicide detected within 1 mile in the last 72 hours, or elevated 14-day violent crime baseline';
  } else if (risk.label === 'ELEVATED') {
    labelReason = 'Weapons violation within 0.5mi in 48h, ShotSpotter alert, or elevated 14-day baseline';
  } else if (risk.label === 'CRITICAL') {
    labelReason = 'Campus is in peak retaliation window following a nearby homicide';
  } else {
    labelReason = 'No contagion-level events detected near campus in the monitoring window';
  }

  // Sort contributors by contribution descending
  contributors.sort((a, b) => b.totalContribution - a.totalContribution);

  return {
    contagionBase,
    envBase,
    acute,
    seasonal,
    rawScore,
    displayScore: risk.score,
    label: risk.label,
    labelReason,
    dowBonus: dowB,
    monthBonus: monthB,
    tempBonusVal: tempB,
    topContributors: contributors.slice(0, 15),
    acuteEvents,
    shotSpotterEvents: shotEvents,
    contagionZoneCount: risk.contagionZones.length,
    retaliationActive: risk.inRetaliationWindow,
  };
}

function getWeight(table: Record<string, readonly [number, number, number, number]>, type: string, dist: number): number {
  const buckets = table[type];
  if (!buckets) return 0;
  if (dist <= 0.25) return buckets[0];
  if (dist <= 0.5) return buckets[1];
  if (dist <= 1.0) return buckets[2];
  if (dist <= 2.0) return buckets[3];
  return 0;
}

function fmtAge(h: number): string {
  if (h < 1) return '<1h ago';
  if (h < 24) return `${Math.round(h)}h ago`;
  if (h < 168) return `${Math.round(h / 24)}d ago`;
  return `${Math.round(h / 168)}w ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScoreExplainer({ open, onClose, campus, risk, incidents, acuteIncidents, shotSpotterEvents, tempF }: Props) {
  const [tab, setTab] = useState<'breakdown' | 'methodology'>('breakdown');

  const breakdown = useMemo(
    () => computeBreakdown(campus, risk, incidents, acuteIncidents, shotSpotterEvents, tempF),
    [campus, risk, incidents, acuteIncidents, shotSpotterEvents, tempF],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const riskColor = RISK_COLORS[risk.label];
  const maxBar = Math.max(breakdown.contagionBase, breakdown.envBase, breakdown.acute, breakdown.seasonal, 1);

  const components = [
    { label: 'Contagion Proximity', value: breakdown.contagionBase, max: 70, color: '#DC2626', desc: 'Homicides, weapons, CSA within 2mi' },
    { label: 'Acute Threat', value: breakdown.acute, max: 45, color: '#EA580C', desc: 'Active threats in last 72h' },
    { label: 'Environmental Context', value: breakdown.envBase, max: 15, color: '#D97706', desc: 'Battery, assault, robbery (capped)' },
    { label: 'Seasonal Risk', value: breakdown.seasonal, max: 18, color: '#6B7280', desc: 'Day, month, temperature' },
  ];

  const totalMax = 70 + 45 + 15 + 18; // 148 theoretical max, capped at 100

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 520, maxWidth: '100vw',
        zIndex: 9999,
        background: bg.card,
        boxShadow: shadow.xl,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column',
        fontFamily: font.sans,
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${border.light}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.muted, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
              SCORE ANALYSIS
            </div>
            <div style={{ fontSize: '22px', fontWeight: fontWeight.bold, color: text.primary, fontFamily: font.body }}>
              {campus.name}
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 2 }}>
              {campus.addr}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Score badge */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: riskColor.bg, border: `3px solid ${riskColor.color}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '20px', fontWeight: fontWeight.black, color: riskColor.color, lineHeight: 1 }}>
                {risk.score}
              </span>
              <span style={{ fontSize: '8px', fontWeight: fontWeight.bold, color: riskColor.color, letterSpacing: '0.05em' }}>
                {risk.label}
              </span>
            </div>
            {/* Close button */}
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', color: text.muted, padding: 4,
            }}>
              &times;
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${border.light}` }}>
          {(['breakdown', 'methodology'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
              fontSize: fontSize.sm, fontWeight: tab === t ? fontWeight.bold : fontWeight.medium,
              color: tab === t ? text.primary : text.muted,
              background: 'transparent',
              borderBottom: tab === t ? `2px solid ${brand.brass}` : '2px solid transparent',
              fontFamily: font.sans, transition: transition.fast,
            }}>
              {t === 'breakdown' ? 'Score Breakdown' : 'How It Works'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {tab === 'breakdown' ? (
            <BreakdownTab breakdown={breakdown} components={components} risk={risk} campus={campus} />
          ) : (
            <MethodologyTab />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Breakdown Tab ───────────────────────────────────────────────────────────

function BreakdownTab({ breakdown, components, risk, campus }: {
  breakdown: ScoreBreakdown;
  components: { label: string; value: number; max: number; color: string; desc: string }[];
  risk: CampusRisk;
  campus: Campus;
}) {
  return (
    <div>
      {/* Label Explanation */}
      <div style={{
        padding: '12px 16px', borderRadius: radius.md, marginBottom: 20,
        background: RISK_COLORS[risk.label].bg,
        border: `1px solid ${RISK_COLORS[risk.label].color}20`,
      }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: RISK_COLORS[risk.label].color, letterSpacing: '0.06em', marginBottom: 4 }}>
          WHY {risk.label}
        </div>
        <div style={{ fontSize: fontSize.base, color: text.primary, lineHeight: 1.5 }}>
          {breakdown.labelReason}
        </div>
      </div>

      {/* Waterfall Chart */}
      <SectionLabel>Score Components</SectionLabel>
      <div style={{ marginBottom: 24 }}>
        {components.map((comp, i) => {
          const pct = comp.max > 0 ? (comp.value / comp.max) * 100 : 0;
          return (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>
                  {comp.label}
                </span>
                <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: comp.color }}>
                  {comp.value} <span style={{ fontWeight: fontWeight.normal, color: text.muted }}>/ {comp.max}</span>
                </span>
              </div>
              <div style={{ height: 8, background: bg.subtle, borderRadius: radius.full, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: radius.full,
                  background: comp.color,
                  width: `${Math.min(100, pct)}%`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
                {comp.desc}
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div style={{
          marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border.light}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: text.primary }}>
            Raw Score
          </span>
          <span style={{ fontSize: '18px', fontWeight: fontWeight.black, color: text.primary }}>
            {breakdown.rawScore}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
          <span style={{ fontSize: fontSize.sm, color: text.muted }}>
            Display Score (remapped to {risk.label} range)
          </span>
          <span style={{ fontSize: '18px', fontWeight: fontWeight.black, color: RISK_COLORS[risk.label].color }}>
            {breakdown.displayScore}
          </span>
        </div>
      </div>

      {/* Seasonal Detail */}
      <SectionLabel>Seasonal Adjustments</SectionLabel>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <SeasonalCard label={`${DAYS[new Date().getDay()]} Bonus`} value={breakdown.dowBonus} desc="Day of week" />
          <SeasonalCard label={`${MONTHS[new Date().getMonth()]} Bonus`} value={breakdown.monthBonus} desc="Month" />
          <SeasonalCard label="Temp Bonus" value={breakdown.tempBonusVal} desc={`${Math.round(breakdown.rawScore > 0 ? 0 : 0)}F`} />
        </div>
      </div>

      {/* Acute Events */}
      {(breakdown.acuteEvents.length > 0 || breakdown.shotSpotterEvents.length > 0) && (
        <>
          <SectionLabel>Acute Threat Events (72h)</SectionLabel>
          <div style={{ marginBottom: 24 }}>
            {breakdown.acuteEvents.map((evt, i) => (
              <EventRow key={i} color="#EA580C">
                <span style={{ fontWeight: fontWeight.semibold }}>{evt.type}</span>
                <span style={{ color: text.muted }}> {fmtDist(evt.distance)} away</span>
                <span style={{ color: text.muted }}> {fmtAge(evt.age)}</span>
                {evt.block && <span style={{ color: text.muted }}> near {evt.block}</span>}
                <span style={{ fontWeight: fontWeight.bold, color: '#EA580C', marginLeft: 'auto' }}>+{evt.points} pts</span>
              </EventRow>
            ))}
            {breakdown.shotSpotterEvents.map((evt, i) => (
              <EventRow key={`ss-${i}`} color="#DC2626">
                <span style={{ fontWeight: fontWeight.semibold }}>ShotSpotter Alert</span>
                <span style={{ color: text.muted }}> {fmtDist(evt.distance)} away</span>
                <span style={{ color: text.muted }}> {fmtAge(evt.age)}</span>
                <span style={{ fontWeight: fontWeight.bold, color: '#DC2626', marginLeft: 'auto' }}>+{evt.points} pts</span>
              </EventRow>
            ))}
          </div>
        </>
      )}

      {/* Top Incident Contributors */}
      {breakdown.topContributors.length > 0 && (
        <>
          <SectionLabel>Top Incident Contributors (30d)</SectionLabel>
          <div style={{ marginBottom: 24 }}>
            {breakdown.topContributors.map((inc, i) => (
              <EventRow key={i} color={inc.category === 'contagion' ? '#DC2626' : '#D97706'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 5px',
                      borderRadius: radius.sm, color: 'white',
                      background: inc.category === 'contagion' ? '#DC2626' : '#D97706',
                    }}>
                      {inc.category === 'contagion' ? 'CTG' : 'ENV'}
                    </span>
                    <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: text.primary }}>
                      {inc.type}
                    </span>
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
                    {fmtDist(inc.distance)} away &middot; {fmtAge(inc.ageHours)}
                    {inc.block ? ` \u00B7 ${inc.block}` : ''}
                    &nbsp;&middot; Base: {inc.weight.toFixed(1)} &times; {inc.recencyMult.toFixed(1)}x recency
                  </div>
                </div>
                <span style={{
                  fontSize: fontSize.sm, fontWeight: fontWeight.bold,
                  color: inc.category === 'contagion' ? '#DC2626' : '#D97706',
                  whiteSpace: 'nowrap',
                }}>
                  +{inc.totalContribution.toFixed(1)}
                </span>
              </EventRow>
            ))}
          </div>
        </>
      )}

      {/* Contagion Zone Summary */}
      <SectionLabel>Contagion Zone Exposure</SectionLabel>
      <div style={{
        padding: '12px 16px', borderRadius: radius.md, marginBottom: 20,
        background: breakdown.retaliationActive ? '#FEF2F2' : bg.subtle,
        border: `1px solid ${breakdown.retaliationActive ? '#FECACA' : border.light}`,
      }}>
        <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: text.primary }}>
          {breakdown.contagionZoneCount} active zone{breakdown.contagionZoneCount !== 1 ? 's' : ''}
        </div>
        {breakdown.retaliationActive && (
          <div style={{ fontSize: fontSize.sm, color: '#DC2626', fontWeight: fontWeight.semibold, marginTop: 4 }}>
            RETALIATION WINDOW ACTIVE &mdash; Peak danger period (18-72h post-homicide)
          </div>
        )}
        {breakdown.contagionZoneCount === 0 && (
          <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 4 }}>
            No homicide-generated contagion zones currently affect this campus.
          </div>
        )}
        {risk.contagionZones.map((z, i) => (
          <div key={i} style={{
            marginTop: 8, padding: '8px 12px', borderRadius: radius.sm,
            background: bg.card, border: `1px solid ${border.light}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '9px', fontWeight: fontWeight.bold, padding: '2px 6px',
                borderRadius: radius.sm, color: 'white',
                background: z.phase === 'ACUTE' ? '#DC2626' : z.phase === 'ACTIVE' ? '#EA580C' : '#D97706',
              }}>
                {z.phase}
              </span>
              <span style={{ fontSize: fontSize.xs, color: text.muted }}>
                {z.daysLeft}d remaining
              </span>
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.primary, marginTop: 4 }}>
              Homicide {z.distanceFromCampus != null ? `${z.distanceFromCampus.toFixed(2)}mi away` : ''}
              {z.block ? ` near ${z.block}` : ''} &middot; {fmtAgo(z.homicideDate)}
            </div>
            {z.retWin && (
              <div style={{ fontSize: fontSize.xs, color: '#DC2626', fontWeight: fontWeight.semibold, marginTop: 2 }}>
                Retaliation window active
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Methodology Tab ─────────────────────────────────────────────────────────

function MethodologyTab() {
  return (
    <div style={{ lineHeight: 1.7, color: text.primary }}>
      <SectionLabel>PULSE Risk Scoring Methodology</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 16 }}>
        The PULSE (Proximity, Urgency, Lethality, Seasonality, Exposure) risk scoring engine
        produces a 0-100 campus safety score grounded in peer-reviewed criminological research.
        The core principle: <strong>"The data tells the story. We do not engineer outcomes."</strong>
      </p>

      <SectionLabel>Theoretical Foundation</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 8 }}>
        The scoring model is grounded in the <strong>Papachristos Violence Contagion Model</strong> (Green,
        Horel &amp; Papachristos, <em>JAMA Internal Medicine</em>, 2017), which established that gun violence
        follows an epidemic-like process of social contagion. Key findings:
      </p>
      <ul style={{ fontSize: fontSize.base, color: text.secondary, paddingLeft: 20, marginBottom: 16 }}>
        <li>60%+ of gun violence occurs in "cascades" through social networks</li>
        <li>An individual's risk peaks within <strong>125 days</strong> of exposure to violence</li>
        <li>Violence concentrates in specific spatial and social clusters</li>
        <li>Temporal proximity is a critical predictor of subsequent violence</li>
      </ul>
      <p style={{ fontSize: fontSize.xs, color: text.muted, marginBottom: 16, fontStyle: 'italic' }}>
        Green B, Horel T, Papachristos AV. Modeling contagion through social networks to explain and
        predict gunshot violence in Chicago, 2006 to 2014. <em>JAMA Intern Med</em>. 2017;177(3):326-333.
      </p>

      <SectionLabel>Two-Class Crime Taxonomy</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 8 }}>
        Incidents are classified into two distinct categories with fundamentally different scoring impacts:
      </p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', borderRadius: `${radius.md} ${radius.md} 0 0`, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#DC2626' }}>CONTAGION CRIMES (Drive the Label)</div>
          <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4 }}>
            Homicide, Weapons Violation, Criminal Sexual Assault. These are the events that create real,
            measurable risk escalation. They drive both the score AND the risk label.
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: `0 0 ${radius.md} ${radius.md}`, background: '#FFFBEB', border: '1px solid #FDE68A', borderTop: 'none' }}>
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#D97706' }}>ENVIRONMENTAL CRIMES (Context Only)</div>
          <div style={{ fontSize: fontSize.sm, color: text.secondary, marginTop: 4 }}>
            Battery, Assault, Robbery, Narcotics, Motor Vehicle Theft, Criminal Damage.
            Capped at 15 points. <strong>Cannot drive the risk label above LOW</strong> regardless of volume.
          </div>
        </div>
      </div>

      <SectionLabel>Distance Decay Weights</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 8 }}>
        Each incident is weighted by proximity to campus using four distance buckets:
      </p>
      <table style={{ width: '100%', fontSize: fontSize.sm, borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${border.light}` }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: text.muted, fontWeight: fontWeight.semibold }}>Type</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: text.muted }}>0.25mi</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: text.muted }}>0.5mi</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: text.muted }}>1.0mi</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: text.muted }}>2.0mi</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(CONTAGION_WEIGHTS).map(([type, w]) => (
            <tr key={type} style={{ borderBottom: `1px solid ${border.light}` }}>
              <td style={{ padding: '6px 8px', fontWeight: fontWeight.semibold, color: '#DC2626' }}>{type}</td>
              {w.map((v, i) => <td key={i} style={{ textAlign: 'right', padding: '6px 8px' }}>{v}</td>)}
            </tr>
          ))}
          {Object.entries(ENVIRONMENTAL_WEIGHTS).map(([type, w]) => (
            <tr key={type} style={{ borderBottom: `1px solid ${border.light}` }}>
              <td style={{ padding: '6px 8px', fontWeight: fontWeight.semibold, color: '#D97706' }}>{type}</td>
              {w.map((v, i) => <td key={i} style={{ textAlign: 'right', padding: '6px 8px' }}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <SectionLabel>Recency Multipliers</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 8 }}>
        Each incident's base weight is multiplied by a recency factor:
      </p>
      <table style={{ width: '100%', fontSize: fontSize.sm, borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${border.light}` }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: text.muted }}>Age</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: text.muted }}>Multiplier</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: text.muted }}>Rationale</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}><td style={{ padding: '6px 8px' }}>&lt;6 hours</td><td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: fontWeight.bold }}>4.0x</td><td style={{ padding: '6px 8px', color: text.muted }}>Immediate threat window</td></tr>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}><td style={{ padding: '6px 8px' }}>&lt;24 hours</td><td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: fontWeight.bold }}>2.5x</td><td style={{ padding: '6px 8px', color: text.muted }}>Acute awareness period</td></tr>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}><td style={{ padding: '6px 8px' }}>&lt;7 days</td><td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: fontWeight.bold }}>1.5x</td><td style={{ padding: '6px 8px', color: text.muted }}>Active monitoring window</td></tr>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}><td style={{ padding: '6px 8px' }}>&lt;14 days</td><td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: fontWeight.bold }}>1.2x</td><td style={{ padding: '6px 8px', color: text.muted }}>Extended context</td></tr>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}><td style={{ padding: '6px 8px' }}>&lt;30 days</td><td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: fontWeight.bold }}>1.0x</td><td style={{ padding: '6px 8px', color: text.muted }}>Baseline</td></tr>
        </tbody>
      </table>

      <SectionLabel>Event-Driven Label Determination</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 8 }}>
        The risk label is determined by <strong>specific events</strong>, not score thresholds.
        This prevents environmental noise from inflating perceived risk:
      </p>
      <table style={{ width: '100%', fontSize: fontSize.sm, borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${border.light}` }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: text.muted }}>Label</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: text.muted }}>Trigger Condition</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}>
            <td style={{ padding: '6px 8px' }}><span style={{ fontWeight: fontWeight.bold, color: '#DC2626' }}>CRITICAL</span></td>
            <td style={{ padding: '6px 8px' }}>Campus in retaliation window (18-72h post-homicide within 0.5mi)</td>
          </tr>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}>
            <td style={{ padding: '6px 8px' }}><span style={{ fontWeight: fontWeight.bold, color: '#EA580C' }}>HIGH</span></td>
            <td style={{ padding: '6px 8px' }}>Homicide within 1mi in 72h, or elevated 14-day violent baseline</td>
          </tr>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}>
            <td style={{ padding: '6px 8px' }}><span style={{ fontWeight: fontWeight.bold, color: '#D97706' }}>ELEVATED</span></td>
            <td style={{ padding: '6px 8px' }}>Weapons within 0.5mi in 48h, ShotSpotter within 0.25mi in 2h, or moderate 14-day baseline</td>
          </tr>
          <tr style={{ borderBottom: `1px solid ${border.light}` }}>
            <td style={{ padding: '6px 8px' }}><span style={{ fontWeight: fontWeight.bold, color: '#059669' }}>LOW</span></td>
            <td style={{ padding: '6px 8px' }}>No contagion-level events detected (environmental crimes alone cannot trigger above LOW)</td>
          </tr>
        </tbody>
      </table>

      <SectionLabel>Contagion Zone Model</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 8 }}>
        Every homicide within 2 miles of a campus generates a <strong>Contagion Zone</strong> that
        persists for 125 days (per Papachristos), progressing through three phases:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <PhaseCard phase="ACUTE" hours="0-72h" radius="0.5mi" color="#DC2626" desc="Highest risk. Retaliation window 18-72h." />
        <PhaseCard phase="ACTIVE" hours="72h-14d" radius="1.0mi" color="#EA580C" desc="Elevated risk. Active monitoring." />
        <PhaseCard phase="WATCH" hours="14d-125d" radius="1.5mi" color="#D97706" desc="Context only. Extended awareness." />
      </div>

      <SectionLabel>Data Sources</SectionLabel>
      <p style={{ fontSize: fontSize.base, color: text.secondary, marginBottom: 8 }}>
        PULSE integrates 12+ live data sources to build the most complete picture possible:
      </p>
      <ul style={{ fontSize: fontSize.sm, color: text.secondary, paddingLeft: 20, marginBottom: 16 }}>
        <li><strong>Chicago Police Department</strong> &mdash; Official crime reports (8-10 day lag typical)</li>
        <li><strong>ShotSpotter</strong> &mdash; Acoustic gunfire detection (real-time, &lt;60s)</li>
        <li><strong>Citizen App</strong> &mdash; Scanner-derived incidents (2-6h faster than CPD)</li>
        <li><strong>News RSS</strong> &mdash; Breaking news from 15+ Chicago media outlets</li>
        <li><strong>Reddit</strong> &mdash; Community intelligence from Chicago subreddits</li>
        <li><strong>Police Scanner</strong> &mdash; Live dispatch transcription</li>
        <li><strong>Weather</strong> &mdash; Temperature and severe weather alerts</li>
        <li><strong>ICE Activity</strong> &mdash; Immigration enforcement signals</li>
      </ul>

      <div style={{
        padding: '12px 16px', borderRadius: radius.md, marginTop: 20,
        background: bg.subtle, border: `1px solid ${border.light}`,
      }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: text.muted, letterSpacing: '0.06em', marginBottom: 4 }}>
          DATA INTEGRITY PRINCIPLE
        </div>
        <div style={{ fontSize: fontSize.base, color: text.secondary, fontStyle: 'italic' }}>
          "The data tells the story. We do not engineer outcomes." Every score is deterministic,
          reproducible, and traceable to specific incidents. No manual overrides. No subjective adjustments.
          The algorithm applies equally to every campus, every day.
        </div>
      </div>
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

function SeasonalCard({ label, value, desc }: { label: string; value: number; desc: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: radius.md,
      background: bg.subtle, border: `1px solid ${border.light}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '18px', fontWeight: fontWeight.black, color: value > 0 ? '#D97706' : text.muted }}>
        +{value}
      </div>
      <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: text.primary, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function EventRow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', marginBottom: 4,
      borderRadius: radius.sm, background: bg.subtle,
      borderLeft: `3px solid ${color}`,
      fontSize: fontSize.sm, color: text.primary,
      flexWrap: 'wrap',
    }}>
      {children}
    </div>
  );
}

function PhaseCard({ phase, hours, radius: r, color, desc }: {
  phase: string; hours: string; radius: string; color: string; desc: string;
}) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: radius.md,
      background: `${color}08`, border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color }}>
        {phase}
      </div>
      <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
        {hours} &middot; {r}
      </div>
      <div style={{ fontSize: fontSize.xs, color: text.secondary, marginTop: 4 }}>
        {desc}
      </div>
    </div>
  );
}
