/**
 * Slate v3 — Signal
 * ═══════════════════════════════════════════════════════════════════
 * EXISTENTIAL THREAT INTELLIGENCE ENGINE
 *
 * Signal is the highest-level strategic intelligence module in Slate.
 * It scans across every domain — enrollment, finance, talent, safety,
 * compliance, political, and reputational — to detect converging
 * patterns that precede institutional decline.
 *
 * Think of it as the radar room on an aircraft carrier:
 * a sweeping scope that illuminates threats before they arrive.
 *
 * KEY CAPABILITIES:
 * 1. Animated radar scope visualization with threat positioning
 * 2. AI-powered cross-system pattern detection (Claude)
 * 3. Multi-layer intelligence scanning (National → State → City → CPS → Network)
 * 4. Horizon analysis — what's coming in 6/12/24 months
 * 5. Historical pattern matching — "we've seen this before"
 * 6. Intervention recommendations with urgency timelines
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useRisks, useRole, useNetwork, useEnrollment, useFinancials,
  useStaff, useFundraising, useCompliance, useFacilities, useCivic, useDataStore,
} from '../../data/DataStore';
import { Card, ModuleHeader, StatusBadge, Section } from '../../components/Card';
import { fmt, fmtNum, fmtPct, fmtFull, fmtCompact } from '../../core/formatters';
import { AI_CONFIG } from '../../core/constants';
import { buildNetworkSnapshot } from '../../core/networkSnapshot';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Warning {
  patternId: string;
  patternName: string;
  domain: string;
  severity: 'CRITICAL' | 'HIGH' | 'WATCH';
  headline: string;
  signals: string[];
  whatSignalSees: string;
  historicalContext: string;
  intervention: string;
  daysToAct: number;
  layer: string;
}

interface HorizonThreat {
  id: string;
  threat: string;
  timeframe: string;
  probability: string;
  impact: string;
  description: string;
  earlyIndicators: string[];
}

interface SignalData {
  networkHealth: 'CRITICAL' | 'ELEVATED' | 'STABLE';
  networkSummary: string;
  warnings: Warning[];
  horizonThreats: HorizonThreat[];
  generatedAt: string;
}

// ─── Severity Colors ────────────────────────────────────────────────────────

const sevColor = (s: string) =>
  s === 'CRITICAL' ? statusColor.red : s === 'HIGH' ? statusColor.amber : statusColor.green;

const healthColor = (h: string) =>
  h === 'CRITICAL' ? statusColor.red : h === 'ELEVATED' ? statusColor.amber : statusColor.green;

const layerColors: Record<string, string> = {
  'National': '#DC2626',
  'State': '#EA580C',
  'City': '#D97706',
  'CPS': '#0EA5E9',
  'Network': '#8B5CF6',
};

// ─── Radar Scope Canvas ─────────────────────────────────────────────────────

function RadarScope({
  warnings,
  selected,
  onSelect,
  networkHealth,
}: {
  warnings: Warning[];
  selected: Warning | null;
  onSelect: (w: Warning) => void;
  networkHealth: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweepRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dotsRef = useRef<{ w: Warning; x: number; y: number; glow: number }[]>([]);

  // Position dots on radar based on severity and domain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 600;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 40;

    // Rings: CRITICAL near center, HIGH mid, WATCH outer
    const rings: Record<string, number> = {
      CRITICAL: maxR * 0.25,
      HIGH: maxR * 0.55,
      WATCH: maxR * 0.82,
    };

    // Position dots
    dotsRef.current = warnings.map((w, idx) => {
      const siblings = warnings.filter(ww => ww.severity === w.severity);
      const sidx = siblings.indexOf(w);
      const total = Math.max(siblings.length, 1);
      const baseAngle = (sidx / total) * Math.PI * 2 + (idx * 0.7);
      const r = rings[w.severity] + (((idx * 17) % 20) - 10);
      return {
        w,
        x: cx + Math.cos(baseAngle) * r,
        y: cy + Math.sin(baseAngle) * r,
        glow: idx * 0.8,
      };
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      sweepRef.current += 0.012;
      const sweep = sweepRef.current;

      ctx.clearRect(0, 0, size, size);

      // Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR + 30);
      bgGrad.addColorStop(0, '#0A1628');
      bgGrad.addColorStop(0.7, '#060E1A');
      bgGrad.addColorStop(1, '#030810');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // Concentric rings
      [0.25, 0.55, 0.82, 1.0].forEach((pct, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * pct, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.08 + i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Ring labels
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.textAlign = 'center';
      ctx.fillText('CRITICAL', cx, cy - maxR * 0.25 + 14);
      ctx.fillText('HIGH', cx, cy - maxR * 0.55 + 14);
      ctx.fillText('WATCH', cx, cy - maxR * 0.82 + 14);

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
      ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tick marks
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const inner = maxR - (i % 9 === 0 ? 12 : 6);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Sweep trail
      for (let i = 0; i < 60; i++) {
        const trailAngle = sweep - (i / 60) * 1.2;
        const alpha = (1 - i / 60) * 0.18;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(trailAngle) * maxR,
          cy + Math.sin(trailAngle) * maxR
        );
        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Sweep line
      const lineGrad = ctx.createLinearGradient(
        cx, cy,
        cx + Math.cos(sweep) * maxR,
        cy + Math.sin(sweep) * maxR
      );
      lineGrad.addColorStop(0, 'rgba(16, 185, 129, 0.7)');
      lineGrad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots
      dotsRef.current.forEach(dot => {
        const { x, y, w } = dot;
        dot.glow += 0.04;
        const isSelected = selected && selected.patternId === w.patternId;

        // Check if sweep just passed this dot
        const dotAngle = Math.atan2(y - cy, x - cx);
        const nd = ((dotAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const ns = ((sweep % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const diff = Math.abs(ns - nd);
        const justSwept = diff < 0.3 || diff > Math.PI * 2 - 0.3;

        const glowPulse = isSelected ? 1 : (0.5 + Math.sin(dot.glow) * 0.3);
        const color = sevColor(w.severity);
        const dotSize = isSelected ? 8 : w.severity === 'CRITICAL' ? 6 : 5;

        // Glow
        if (justSwept || isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize + 8, 0, Math.PI * 2);
          ctx.fillStyle = `${color}${isSelected ? '40' : '25'}`;
          ctx.fill();
        }

        // Dot
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = glowPulse;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        if (isSelected || justSwept) {
          const label = w.domain || w.patternName;
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(label.slice(0, 18), x, y - dotSize - 6);
        }
      });

      // Center pulse
      const pulseR = 4 + Math.sin(sweep * 3) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = healthColor(networkHealth);
      ctx.fill();

      // Timestamp
      const now = new Date();
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.textAlign = 'center';
      ctx.fillText(
        now.toTimeString().slice(0, 8) + ' · SLATE SIGNAL',
        cx,
        size - 20
      );

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [warnings, selected, networkHealth]);

  // Click handler
  // Hover handler for cursor feedback
  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = 600 / rect.width;
      const scaleY = 600 / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      let hovering = false;
      dotsRef.current.forEach(dot => {
        const dist = Math.sqrt((dot.x - mx) ** 2 + (dot.y - my) ** 2);
        if (dist < 40) hovering = true;
      });
      canvas.style.cursor = hovering ? 'pointer' : 'crosshair';
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = 600 / rect.width;
      const scaleY = 600 / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      let closest: (typeof dotsRef.current)[0] | null = null;
      let minDist = 40;
      dotsRef.current.forEach(dot => {
        const dist = Math.sqrt((dot.x - mx) ** 2 + (dot.y - my) ** 2);
        if (dist < minDist) {
          minDist = dist;
          closest = dot;
        }
      });
      if (closest) onSelect((closest as any).w);
      else {
        // Click on empty space deselects
      }
    },
    [onSelect]
  );

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      onClick={handleClick}
      onMouseMove={handleMove}
      style={{
        width: '100%',
        maxWidth: 480,
        cursor: 'crosshair',
        borderRadius: radius.lg,
      }}
    />
  );
}

// ─── Intelligence Layer Badge ───────────────────────────────────────────────

function LayerBadge({ layer }: { layer: string }) {
  const color = layerColors[layer] || textColor.muted;
  return (
    <span style={{
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color,
      padding: '2px 8px',
      borderRadius: radius.full,
      border: `1px solid ${color}30`,
      background: `${color}08`,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {layer}
    </span>
  );
}

// ─── Horizon Threat Card ────────────────────────────────────────────────────

function HorizonCard({ threat }: { threat: HorizonThreat }) {
  const [expanded, setExpanded] = useState(false);
  const probColor = threat.probability === 'High' ? statusColor.red
    : threat.probability === 'Medium' ? statusColor.amber : statusColor.green;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: bg.card,
        border: `1px solid ${border.light}`,
        borderLeft: `4px solid ${probColor}`,
        borderRadius: radius.md,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: transition.fast,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.primary, lineHeight: 1.4 }}>
            {threat.threat}
          </div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 4 }}>
            {threat.timeframe} · {threat.impact} impact
          </div>
        </div>
        <div style={{
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          color: probColor,
          padding: '2px 8px',
          borderRadius: radius.full,
          border: `1px solid ${probColor}30`,
          background: `${probColor}08`,
          whiteSpace: 'nowrap',
        }}>
          {threat.probability}
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border.light}` }}>
          <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.7, marginBottom: 12 }}>
            {threat.description}
          </div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
            Early Indicators
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {threat.earlyIndicators.map((ind, i) => (
              <span key={i} style={{
                fontSize: fontSize.xs,
                padding: '3px 8px',
                borderRadius: radius.sm,
                background: `${probColor}08`,
                border: `1px solid ${probColor}20`,
                color: probColor,
              }}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SIGNAL APP
// ═══════════════════════════════════════════════════════════════════════════

export default function SignalApp() {
  const { role } = useRole();
  const network = useNetwork();
  const enrollment = useEnrollment();
  const financials = useFinancials();
  const staffData = useStaff();
  const riskData = useRisks();
  const fundraising = useFundraising();
  const compliance = useCompliance();
  const facilities = useFacilities();
  const civic = useCivic();
  const { store } = useDataStore();

  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Warning | null>(null);
  const [activeTab, setActiveTab] = useState<'radar' | 'horizon' | 'register'>('radar');
  const detailRef = useRef<HTMLDivElement>(null);

  // Build snapshot from all data sources
  const snapshot = useMemo(() => buildNetworkSnapshot(store), [store]);

  // Run Signal AI analysis
  const runSignal = useCallback(async () => {
    setLoading(true);
    setError('');
    setData(null);
    setSelected(null);

    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 4096,
          system: `You are Slate Signal, the existential threat intelligence engine for charter school networks. You operate like a geopolitical risk analyst at a sovereign wealth fund — scanning multiple layers of the environment to detect converging patterns that precede institutional decline, financial crisis, talent loss, authorizer risk, and community trust erosion.

You scan FIVE intelligence layers:
1. NATIONAL — Federal education policy, SCOTUS decisions, DOE actions, national charter school trends, economic indicators
2. STATE — Illinois General Assembly, ISBE actions, state funding formulas, labor law changes, pension impacts
3. CITY — Chicago politics, CPS board actions, aldermanic activity, demographic shifts, crime trends near campuses
4. CPS — Authorizer relationship, renewal timeline, performance framework changes, CPS budget impacts
5. NETWORK — Internal cross-system patterns from enrollment, finance, talent, safety, compliance, and fundraising data

Return ONLY valid JSON with this exact structure:
{
  "networkHealth": "CRITICAL" | "ELEVATED" | "STABLE",
  "networkSummary": "2-3 sentence executive summary connecting the most important cross-domain patterns",
  "warnings": [
    {
      "patternId": "SIG-001",
      "patternName": "Pattern Name",
      "domain": "Which operational domain (Enrollment, Finance, Talent, Safety, Compliance, Political, Reputational)",
      "severity": "CRITICAL" | "HIGH" | "WATCH",
      "headline": "One-line headline",
      "signals": ["signal 1", "signal 2", "signal 3"],
      "whatSignalSees": "2-3 sentences on the converging pattern Signal detects",
      "historicalContext": "What happened when similar patterns emerged at other charter networks",
      "intervention": "Specific recommended action",
      "daysToAct": 30,
      "layer": "National" | "State" | "City" | "CPS" | "Network"
    }
  ],
  "horizonThreats": [
    {
      "id": "HZ-001",
      "threat": "Threat name",
      "timeframe": "6 months" | "12 months" | "24 months",
      "probability": "High" | "Medium" | "Low",
      "impact": "Existential" | "Severe" | "Moderate",
      "description": "2-3 sentences",
      "earlyIndicators": ["indicator 1", "indicator 2"]
    }
  ]
}

Generate 6-8 warnings distributed across all 5 layers (at least 1 from each layer). Generate 4-5 horizon threats across different timeframes. Mix CRITICAL, HIGH, and WATCH severities. Be specific to Chicago charter schools in 2026. Connect dots across domains — that's your superpower.`,
          messages: [{
            role: 'user',
            content: `Analyze ${network.name} (${network.campusCount} campuses, ${network.city}, ${network.authorizer} authorizer):\n\n${JSON.stringify(snapshot, null, 2)}\n\nDetect all active early warning patterns across all five intelligence layers. Connect dots across domains. Identify horizon threats. Be specific and actionable.`,
          }],
        }),
      });

      const d = await res.json();
      const raw = d.content?.find((b: any) => b.type === 'text')?.text || '';
      const clean = raw.replace(/```json\s*|```\s*/g, '').trim();
      const parsed = JSON.parse(clean);
      setData({ ...parsed, generatedAt: new Date().toISOString() });
      if (parsed.warnings?.length > 0) setSelected(parsed.warnings[0]);
    } catch (err) {
      setError('Signal analysis failed: ' + String(err));
    } finally {
      setLoading(false);
    }
  }, [network, snapshot]);

  // Auto-run on mount
  useEffect(() => {
    runSignal();
  }, []);

  // Computed stats from risk register (always available even without AI)
  const tier1Count = riskData.register.filter(r => r.tier.includes('Tier 1')).length;
  const increasingCount = riskData.register.filter(r => r.trend.includes('Increasing')).length;
  const avgScore = riskData.register.length > 0
    ? riskData.register.reduce((s, r) => s + r.likelihood * r.impact, 0) / riskData.register.length
    : 0;

  const tabs = [
    { id: 'radar' as const, label: 'Threat Radar', icon: '◎' },
    { id: 'horizon' as const, label: 'Horizon Scan', icon: '◇' },
    { id: 'register' as const, label: 'Risk Register', icon: '▤' },
  ];

  return (
    <div>
      <ModuleHeader
        title="Signal"
        subtitle="Existential Threat Intelligence Engine"
        accent={modColors.signal}
        freshness={{ lastUpdated: data?.generatedAt || riskData.lastUpdated, source: data ? 'AI Analysis' : riskData.source }}
        actions={
          <button
            onClick={runSignal}
            disabled={loading}
            style={{
              padding: '8px 20px',
              borderRadius: radius.md,
              background: loading ? bg.subtle : `${modColors.signal}12`,
              color: loading ? textColor.muted : modColors.signal,
              border: `1px solid ${loading ? border.light : modColors.signal}40`,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.bold,
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: transition.fast,
            }}
          >
            {loading ? 'SCANNING ALL LAYERS...' : '↻ RESCAN ENVIRONMENT'}
          </button>
        }
      />

      {/* Network Health Status Bar */}
      {data && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px',
          background: `${healthColor(data.networkHealth)}06`,
          border: `1px solid ${healthColor(data.networkHealth)}20`,
          borderRadius: radius.lg,
          marginBottom: 20,
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: healthColor(data.networkHealth),
            boxShadow: `0 0 12px ${healthColor(data.networkHealth)}60`,
            animation: data.networkHealth === 'CRITICAL' ? 'pulse 1.5s infinite' : 'none',
          }} />
          <div style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.bold,
            color: healthColor(data.networkHealth),
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {data.networkHealth}
          </div>
          <div style={{ width: 1, height: 20, background: border.light }} />
          <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.6 }}>
            {data.networkSummary}
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            label: 'ACTIVE SIGNALS',
            value: data ? data.warnings.length.toString() : '—',
            sub: data ? `${data.warnings.filter(w => w.severity === 'CRITICAL').length} critical` : 'Scanning...',
            color: data && data.warnings.filter(w => w.severity === 'CRITICAL').length > 0 ? statusColor.red : modColors.signal,
          },
          {
            label: 'TIER 1 RISKS',
            value: tier1Count.toString(),
            sub: tier1Count > 0 ? 'Board attention required' : 'Clear',
            color: tier1Count > 0 ? statusColor.red : statusColor.green,
          },
          {
            label: 'TRENDING UP',
            value: increasingCount.toString(),
            sub: increasingCount > 0 ? 'Accelerating' : 'Stable',
            color: increasingCount > 0 ? statusColor.amber : statusColor.green,
          },
          {
            label: 'AVG RISK SCORE',
            value: avgScore.toFixed(1),
            sub: avgScore > 12 ? 'Elevated' : 'Acceptable',
            color: avgScore > 12 ? statusColor.amber : statusColor.green,
          },
          {
            label: 'HORIZON THREATS',
            value: data ? data.horizonThreats?.length.toString() || '0' : '—',
            sub: data ? `${data.horizonThreats?.filter(h => h.probability === 'High').length || 0} high probability` : 'Scanning...',
            color: brand.brass,
          },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: bg.card,
            borderRadius: radius.lg,
            border: `1px solid ${border.light}`,
            borderTop: `3px solid ${kpi.color}`,
            padding: '16px 18px',
            boxShadow: shadow.sm,
          }}>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: kpi.color, lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 6 }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 2,
        background: bg.card,
        borderRadius: `${radius.lg} ${radius.lg} 0 0`,
        border: `1px solid ${border.light}`,
        borderBottom: 'none',
        padding: '0 8px',
        marginBottom: 0,
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '14px 24px',
              border: 'none',
              cursor: 'pointer',
              fontSize: fontSize.sm,
              fontWeight: activeTab === t.id ? fontWeight.bold : fontWeight.medium,
              color: activeTab === t.id ? modColors.signal : textColor.muted,
              background: 'transparent',
              borderBottom: `2px solid ${activeTab === t.id ? modColors.signal : 'transparent'}`,
              transition: transition.fast,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: '14px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
            <span style={{ fontSize: fontSize.xs, color: textColor.light }}>
              Last scan: {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div style={{
        background: bg.card,
        border: `1px solid ${border.light}`,
        borderRadius: `0 0 ${radius.lg} ${radius.lg}`,
        minHeight: 500,
        overflow: 'hidden',
      }}>
        {/* Loading State */}
        {loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 80,
            gap: 16,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: `3px solid ${modColors.signal}20`,
              borderTopColor: modColors.signal,
              animation: 'spin 1s linear infinite',
            }} />
            <div style={{ fontSize: fontSize.sm, color: textColor.muted, textAlign: 'center' }}>
              Scanning all intelligence layers...<br />
              <span style={{ fontSize: fontSize.xs, color: textColor.light }}>
                National · State · City · CPS · Network
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: fontSize.md, color: statusColor.red, marginBottom: 12 }}>Signal Analysis Error</div>
            <div style={{ fontSize: fontSize.sm, color: textColor.muted, marginBottom: 16 }}>{error}</div>
            <button onClick={runSignal} style={{
              padding: '8px 20px', borderRadius: radius.md,
              background: modColors.signal, color: '#FFF', border: 'none',
              fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: 'pointer',
            }}>
              Retry Scan
            </button>
          </div>
        )}

        {/* ─── RADAR TAB ─────────────────────────────────────────────── */}
        {activeTab === 'radar' && data && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', minHeight: 500 }}>
            {/* Left: Radar Scope */}
            <div style={{
              background: '#060E1A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              borderRight: `1px solid ${border.light}`,
            }}>
              <RadarScope
                warnings={data.warnings}
                selected={selected}
                onSelect={setSelected}
                networkHealth={data.networkHealth}
              />
              <div style={{
                display: 'flex',
                gap: 16,
                marginTop: 12,
                justifyContent: 'center',
              }}>
                {['CRITICAL', 'HIGH', 'WATCH'].map(sev => (
                  <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor(sev) }} />
                    <span style={{ fontSize: fontSize.xs, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                      {sev}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Signal List + Detail */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Intelligence Layer Filter */}
              <div style={{
                display: 'flex',
                gap: 6,
                padding: '12px 16px',
                borderBottom: `1px solid ${border.light}`,
                background: bg.subtle,
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: fontSize.xs, color: textColor.muted, alignSelf: 'center', marginRight: 4 }}>
                  LAYERS:
                </span>
                {Object.entries(layerColors).map(([layer, color]) => {
                  const count = data.warnings.filter(w => w.layer === layer).length;
                  return (
                    <span key={layer} style={{
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.semibold,
                      color,
                      padding: '3px 10px',
                      borderRadius: radius.full,
                      border: `1px solid ${color}30`,
                      background: `${color}08`,
                    }}>
                      {layer} ({count})
                    </span>
                  );
                })}
              </div>

              {/* Signal List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                <div style={{
                  fontSize: fontSize.xs,
                  color: textColor.light,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  ALL SIGNALS · CLICK TO INSPECT
                </div>
                {data.warnings.map((w, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelected(w);
                      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 12px',
                      marginBottom: 4,
                      borderRadius: radius.md,
                      cursor: 'pointer',
                      border: `1px solid ${selected === w ? sevColor(w.severity) + '40' : border.light}`,
                      background: selected === w ? `${sevColor(w.severity)}06` : 'transparent',
                      transition: transition.fast,
                    }}
                  >
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: sevColor(w.severity),
                      marginTop: 4,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{
                          fontSize: fontSize.sm,
                          color: textColor.primary,
                          lineHeight: 1.4,
                          fontWeight: selected === w ? fontWeight.semibold : fontWeight.normal,
                        }}>
                          {w.headline}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <LayerBadge layer={w.layer} />
                          <StatusBadge
                            label={w.severity}
                            variant={w.severity === 'CRITICAL' ? 'red' : w.severity === 'HIGH' ? 'amber' : 'green'}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 3 }}>
                        {w.domain} · {w.patternName} · Act within {w.daysToAct}d
                      </div>
                    </div>
                  </div>
                ))}

                {/* Detail Panel */}
                {selected && (
                  <div ref={detailRef} style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: `1px solid ${border.light}`,
                  }}>
                    <div style={{
                      fontSize: fontSize.xs,
                      color: modColors.signal,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                      fontWeight: fontWeight.bold,
                    }}>
                      SIGNAL DETAIL
                    </div>
                    <div style={{
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.bold,
                      color: textColor.primary,
                      lineHeight: 1.5,
                      marginBottom: 8,
                      fontFamily: font.serif,
                    }}>
                      {selected.headline}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      {selected.signals?.map((s, i) => (
                        <span key={i} style={{
                          fontSize: fontSize.xs,
                          padding: '3px 8px',
                          border: `1px solid ${sevColor(selected.severity)}30`,
                          color: sevColor(selected.severity),
                          borderRadius: radius.sm,
                          background: `${sevColor(selected.severity)}06`,
                        }}>
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* What Signal Sees */}
                    <div style={{
                      marginBottom: 12,
                      padding: '14px 16px',
                      border: `1px solid ${modColors.signal}20`,
                      borderRadius: radius.md,
                      background: `${modColors.signal}04`,
                    }}>
                      <div style={{
                        fontSize: fontSize.xs,
                        color: modColors.signal,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                        fontWeight: fontWeight.bold,
                      }}>
                        What Signal Sees
                      </div>
                      <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.8 }}>
                        {selected.whatSignalSees}
                      </div>
                    </div>

                    {/* Historical Context */}
                    <div style={{
                      marginBottom: 12,
                      padding: '14px 16px',
                      border: `1px solid ${statusColor.amber}20`,
                      borderRadius: radius.md,
                      background: `${statusColor.amber}04`,
                    }}>
                      <div style={{
                        fontSize: fontSize.xs,
                        color: statusColor.amber,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                        fontWeight: fontWeight.bold,
                      }}>
                        Historical Context — We've Seen This Before
                      </div>
                      <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.8 }}>
                        {selected.historicalContext}
                      </div>
                    </div>

                    {/* Intervention */}
                    <div style={{
                      padding: '14px 16px',
                      border: `1px solid ${statusColor.green}20`,
                      borderRadius: radius.md,
                      background: `${statusColor.green}04`,
                    }}>
                      <div style={{
                        fontSize: fontSize.xs,
                        color: statusColor.green,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                        fontWeight: fontWeight.bold,
                      }}>
                        Recommended Action — Act Within {selected.daysToAct} Days
                      </div>
                      <div style={{ fontSize: fontSize.sm, color: textColor.secondary, lineHeight: 1.8 }}>
                        {selected.intervention}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── HORIZON TAB ───────────────────────────────────────────── */}
        {activeTab === 'horizon' && !loading && (
          <div style={{ padding: 24 }}>
            {data?.horizonThreats && data.horizonThreats.length > 0 ? (
              <>
                <div style={{
                  fontSize: fontSize.xs,
                  color: textColor.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 16,
                }}>
                  Forward-Looking Threat Analysis — What's Coming
                </div>

                {/* Timeframe groups */}
                {['6 months', '12 months', '24 months'].map(tf => {
                  const threats = data.horizonThreats.filter(h => h.timeframe === tf);
                  if (threats.length === 0) return null;
                  return (
                    <div key={tf} style={{ marginBottom: 24 }}>
                      <div style={{
                        fontSize: fontSize.sm,
                        fontWeight: fontWeight.bold,
                        color: textColor.primary,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: `${modColors.signal}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: fontSize.xs,
                          color: modColors.signal,
                          fontWeight: fontWeight.bold,
                        }}>
                          {tf.split(' ')[0]}
                        </span>
                        {tf} Horizon
                      </div>
                      {threats.map(t => (
                        <HorizonCard key={t.id} threat={t} />
                      ))}
                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: textColor.muted }}>
                <div style={{ fontSize: '32px', marginBottom: 12 }}>◇</div>
                <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: 8 }}>
                  No Horizon Analysis Available
                </div>
                <div style={{ fontSize: fontSize.sm }}>
                  Run a Signal scan to generate forward-looking threat analysis.
                </div>
                <button onClick={runSignal} style={{
                  marginTop: 16, padding: '8px 20px', borderRadius: radius.md,
                  background: modColors.signal, color: '#FFF', border: 'none',
                  fontSize: fontSize.sm, fontWeight: fontWeight.semibold, cursor: 'pointer',
                }}>
                  Run Scan
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── RISK REGISTER TAB ─────────────────────────────────────── */}
        {activeTab === 'register' && !loading && (
          <div style={{ padding: 24 }}>
            <div style={{
              fontSize: fontSize.xs,
              color: textColor.muted,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: 16,
            }}>
              Enterprise Risk Register — {riskData.register.length} Risks Tracked
            </div>

            {/* Heat Map Mini */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Tier Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { tier: 'Tier 1', label: 'Board Focus', color: statusColor.red },
                  { tier: 'Tier 2', label: 'Executive Team', color: statusColor.amber },
                  { tier: 'Tier 3', label: 'Working Group', color: statusColor.blue },
                ].map(t => {
                  const count = riskData.register.filter(r => r.tier.includes(t.tier)).length;
                  const increasing = riskData.register.filter(r => r.tier.includes(t.tier) && r.trend.includes('Increasing')).length;
                  return (
                    <div key={t.tier} style={{
                      background: bg.subtle,
                      borderRadius: radius.md,
                      borderTop: `3px solid ${t.color}`,
                      padding: 16,
                    }}>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 6 }}>{t.tier}: {t.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: fontWeight.bold, fontFamily: font.mono, color: t.color }}>
                        {count}
                      </div>
                      {increasing > 0 && (
                        <div style={{ fontSize: fontSize.xs, color: statusColor.red, marginTop: 4 }}>
                          {increasing} trending up
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Risk by Category */}
              <div>
                <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  By Category
                </div>
                {Object.entries(
                  riskData.register.reduce((acc, r) => {
                    acc[r.category] = (acc[r.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0',
                    borderBottom: `1px solid ${border.light}`,
                  }}>
                    <div style={{ flex: 1, fontSize: fontSize.sm, color: textColor.primary }}>{cat}</div>
                    <div style={{ width: 80, height: 4, background: bg.subtle, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(count / riskData.register.length) * 100}%`,
                        height: '100%',
                        background: modColors.signal,
                        borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: textColor.muted, width: 20, textAlign: 'right' }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Rows */}
            {riskData.register
              .sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact))
              .map(risk => {
                const score = risk.likelihood * risk.impact;
                const scoreColor = score >= 20 ? statusColor.red : score >= 12 ? statusColor.amber : score >= 6 ? statusColor.blue : statusColor.green;
                const tierColor = risk.tier.includes('Tier 1') ? statusColor.red
                  : risk.tier.includes('Tier 2') ? statusColor.amber : statusColor.blue;
                const trendColor = risk.trend.includes('Increasing') ? statusColor.red
                  : risk.trend.includes('Decreasing') ? statusColor.green : textColor.muted;

                return (
                  <div key={risk.id} style={{
                    background: bg.card,
                    borderRadius: radius.md,
                    border: `1px solid ${border.light}`,
                    borderLeft: `4px solid ${tierColor}`,
                    marginBottom: 8,
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 100px', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: radius.md,
                        background: `${scoreColor}12`, border: `2px solid ${scoreColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: font.mono, fontWeight: fontWeight.bold, fontSize: fontSize.base, color: scoreColor,
                      }}>
                        {score}
                      </div>
                      <div>
                        <div style={{ fontWeight: fontWeight.semibold, color: textColor.primary, fontSize: fontSize.sm }}>{risk.name}</div>
                        <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>{risk.category} · {risk.lens}</div>
                      </div>
                      <StatusBadge
                        label={risk.tier.replace(' — ', ': ').replace('Tier ', 'T')}
                        variant={risk.tier.includes('Tier 1') ? 'red' : risk.tier.includes('Tier 2') ? 'amber' : 'blue'}
                        size="sm"
                      />
                      <div style={{ fontSize: fontSize.sm, color: trendColor, fontWeight: fontWeight.semibold }}>{risk.trend}</div>
                      <div style={{ fontSize: fontSize.xs, color: textColor.muted }}>{risk.owner}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Empty state when no data and not loading */}
        {!data && !loading && !error && (
          <div style={{ textAlign: 'center', padding: 80, color: textColor.muted }}>
            <div style={{ fontSize: '48px', marginBottom: 16, opacity: 0.3 }}>◎</div>
            <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: textColor.primary, marginBottom: 8 }}>
              Signal Intelligence Engine
            </div>
            <div style={{ fontSize: fontSize.sm, maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
              Signal scans five intelligence layers — National, State, City, CPS, and Network — to detect converging patterns that precede institutional decline.
            </div>
            <button onClick={runSignal} style={{
              marginTop: 20, padding: '10px 28px', borderRadius: radius.md,
              background: modColors.signal, color: '#FFF', border: 'none',
              fontSize: fontSize.sm, fontWeight: fontWeight.bold, cursor: 'pointer',
              letterSpacing: '0.05em',
            }}>
              Initialize Scan
            </button>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
