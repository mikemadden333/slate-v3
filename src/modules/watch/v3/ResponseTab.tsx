/**
 * ResponseTab — Phase 4 Mars Landing: Alert and Response Engine
 *
 * Four-tier alert system:
 *   TIER 1 — WATCH: Routine monitoring, no action required
 *   TIER 2 — ELEVATED: Enhanced awareness, principals notified
 *   TIER 3 — HIGH: Active protocols, security posture change
 *   TIER 4 — CRITICAL: Full response activation, CEO engaged
 *
 * Features:
 *   - Live tier assessment based on real Watch data
 *   - Role-tagged response playbooks (CEO / Principal / Safety Director)
 *   - AI communication draft engine (parent letters, staff emails, board updates)
 *   - Response log with timestamps
 */
import { useState, useCallback, useMemo } from 'react';
import type { WatchDataState } from '../v2/types';
import type { ContagionZone } from '../engine/types';
import { AI_CONFIG } from '../../../core/constants';
import { bg, text, brand, border, font, fontSize, fontWeight, radius, transition } from '../../../core/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertTier = 1 | 2 | 3 | 4;
type CommType = 'parent_letter' | 'staff_email' | 'board_update' | 'principal_brief' | 'media_statement';
type Role = 'CEO' | 'PRINCIPAL' | 'SAFETY_DIRECTOR';

interface ResponseAction {
  role: Role;
  action: string;
  timeframe: string;
  completed: boolean;
}

interface PlaybookStep {
  id: string;
  role: Role;
  action: string;
  timeframe: string;
  critical: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  role: Role;
  tier: AlertTier;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<AlertTier, {
  label: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
  icon: string;
}> = {
  1: { label: 'WATCH',    color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', desc: 'Routine monitoring. No immediate action required.', icon: '◎' },
  2: { label: 'ELEVATED', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', desc: 'Enhanced awareness. Principals should be notified.', icon: '◉' },
  3: { label: 'HIGH',     color: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', desc: 'Active protocols. Security posture change required.', icon: '⬤' },
  4: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', desc: 'Full response activation. CEO must be engaged.', icon: '⬤' },
};

const PLAYBOOKS: Record<AlertTier, PlaybookStep[]> = {
  1: [
    { id: '1a', role: 'SAFETY_DIRECTOR', action: 'Review overnight incident log and update campus risk scores', timeframe: 'Daily, 7 AM', critical: false },
    { id: '1b', role: 'PRINCIPAL', action: 'Confirm standard security protocols are in place', timeframe: 'Daily, 8 AM', critical: false },
    { id: '1c', role: 'CEO', action: 'Review weekly Slate Watch summary report', timeframe: 'Weekly, Monday', critical: false },
  ],
  2: [
    { id: '2a', role: 'SAFETY_DIRECTOR', action: 'Brief all campus security staff on elevated status and specific locations of concern', timeframe: 'Within 1 hour', critical: true },
    { id: '2b', role: 'PRINCIPAL', action: 'Conduct visual sweep of campus perimeter and confirm all exterior doors secured', timeframe: 'Within 2 hours', critical: true },
    { id: '2c', role: 'PRINCIPAL', action: 'Notify all staff via internal channel — do not use public channels', timeframe: 'Within 2 hours', critical: false },
    { id: '2d', role: 'CEO', action: 'Review affected campus status and confirm principal has been briefed', timeframe: 'Within 3 hours', critical: false },
    { id: '2e', role: 'SAFETY_DIRECTOR', action: 'Increase dismissal monitoring — add staff to exterior positions', timeframe: 'Before dismissal', critical: true },
  ],
  3: [
    { id: '3a', role: 'CEO', action: 'Activate Network Safety Protocol — notify board chair', timeframe: 'Immediately', critical: true },
    { id: '3b', role: 'SAFETY_DIRECTOR', action: 'Contact CPD liaison for situational update and coordinate response', timeframe: 'Within 30 minutes', critical: true },
    { id: '3c', role: 'PRINCIPAL', action: 'Move to modified operations — restrict outdoor activities and gatherings', timeframe: 'Within 1 hour', critical: true },
    { id: '3d', role: 'PRINCIPAL', action: 'Send parent notification via Slate communication system', timeframe: 'Within 2 hours', critical: true },
    { id: '3e', role: 'CEO', action: 'Prepare board communication — use Slate draft engine', timeframe: 'Within 3 hours', critical: false },
    { id: '3f', role: 'SAFETY_DIRECTOR', action: 'Implement enhanced dismissal protocol — staggered release, additional staff', timeframe: 'Before dismissal', critical: true },
    { id: '3g', role: 'PRINCIPAL', action: 'Debrief staff after school — document all observations', timeframe: 'After dismissal', critical: false },
  ],
  4: [
    { id: '4a', role: 'CEO', action: 'Declare network-wide Critical status — all principals on immediate alert', timeframe: 'Immediately', critical: true },
    { id: '4b', role: 'CEO', action: 'Notify board chair and board members — emergency communication', timeframe: 'Within 15 minutes', critical: true },
    { id: '4c', role: 'SAFETY_DIRECTOR', action: 'Activate full emergency response team — all hands', timeframe: 'Within 15 minutes', critical: true },
    { id: '4d', role: 'SAFETY_DIRECTOR', action: 'Direct CPD coordination — request enhanced patrol near affected campuses', timeframe: 'Within 30 minutes', critical: true },
    { id: '4e', role: 'PRINCIPAL', action: 'Consider modified school day or early dismissal — CEO must authorize', timeframe: 'Within 1 hour', critical: true },
    { id: '4f', role: 'CEO', action: 'Send parent emergency notification — all affected campuses', timeframe: 'Within 1 hour', critical: true },
    { id: '4g', role: 'PRINCIPAL', action: 'Activate shelter-in-place protocol if threat is proximate', timeframe: 'As needed', critical: true },
    { id: '4h', role: 'CEO', action: 'Prepare media statement — use Slate draft engine', timeframe: 'Within 2 hours', critical: false },
    { id: '4i', role: 'SAFETY_DIRECTOR', action: 'Implement maximum security dismissal — law enforcement escort if available', timeframe: 'Before dismissal', critical: true },
    { id: '4j', role: 'CEO', action: 'Post-incident board debrief and after-action review', timeframe: 'Within 24 hours', critical: false },
  ],
};

const COMM_TYPES: { id: CommType; label: string; audience: string; icon: string }[] = [
  { id: 'parent_letter',    label: 'Parent Notification',  audience: 'Families',         icon: '👨‍👩‍👧' },
  { id: 'staff_email',      label: 'Staff Communication',  audience: 'All Staff',        icon: '📧' },
  { id: 'principal_brief',  label: 'Principal Brief',      audience: 'Campus Leaders',   icon: '📋' },
  { id: 'board_update',     label: 'Board Update',         audience: 'Board Members',    icon: '🏛' },
  { id: 'media_statement',  label: 'Media Statement',      audience: 'Press/Public',     icon: '📰' },
];

const ROLE_COLORS: Record<Role, { color: string; bg: string }> = {
  CEO:            { color: '#7C3AED', bg: '#F5F3FF' },
  PRINCIPAL:      { color: '#1D4ED8', bg: '#EFF6FF' },
  SAFETY_DIRECTOR:{ color: '#0F766E', bg: '#F0FDFA' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  data: WatchDataState;
  contagionZones: ContagionZone[];
}

export default function ResponseTab({ data, contagionZones }: Props) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeCommType, setActiveCommType] = useState<CommType | null>(null);
  const [commDraft, setCommDraft] = useState('');
  const [commLoading, setCommLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [activeRole, setActiveRole] = useState<Role | 'ALL'>('ALL');

  // ─── Compute live alert tier from data ──────────────────────────────────────
  const alertTier = useMemo((): AlertTier => {
    const campuses = data.campuses || [];
    const redCount = campuses.filter(c => c.status === 'RED').length;
    const orangeCount = campuses.filter(c => c.status === 'ORANGE').length;
    const acuteZones = contagionZones.filter(z => z.phase === 'ACUTE').length;
    const retWindows = contagionZones.filter(z => z.retWin).length;

    if (redCount >= 2 || (redCount >= 1 && retWindows >= 1)) return 4;
    if (redCount >= 1 || acuteZones >= 2) return 3;
    if (orangeCount >= 2 || acuteZones >= 1) return 2;
    return 1;
  }, [data.campuses, contagionZones]);

  const tc = TIER_CONFIG[alertTier];
  const playbook = PLAYBOOKS[alertTier];

  const filteredPlaybook = useMemo(() => {
    if (activeRole === 'ALL') return playbook;
    return playbook.filter(s => s.role === activeRole);
  }, [playbook, activeRole]);

  const completionPct = useMemo(() => {
    const total = playbook.length;
    const done = playbook.filter(s => completedSteps.has(s.id)).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [playbook, completedSteps]);

  const toggleStep = useCallback((step: PlaybookStep) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step.id)) {
        next.delete(step.id);
      } else {
        next.add(step.id);
        setLog(l => [{
          id: `${Date.now()}`,
          timestamp: new Date(),
          action: step.action,
          role: step.role,
          tier: alertTier,
        }, ...l]);
      }
      return next;
    });
  }, [alertTier]);

  const generateComm = useCallback(async (type: CommType) => {
    setActiveCommType(type);
    setCommDraft('');
    setCommLoading(true);

    const campuses = data.campuses || [];
    const redCampuses = campuses.filter(c => c.status === 'RED').map(c => c.name);
    const orangeCampuses = campuses.filter(c => c.status === 'ORANGE').map(c => c.name);
    const acuteZones = contagionZones.filter(z => z.phase === 'ACUTE');
    const retWindows = contagionZones.filter(z => z.retWin);

    const context = `
Network: Veritas Charter Schools (10 campuses, Chicago)
Alert Tier: ${alertTier} — ${tc.label}
Red campuses: ${redCampuses.join(', ') || 'None'}
Orange campuses: ${orangeCampuses.join(', ') || 'None'}
Acute contagion zones: ${acuteZones.length}
Active retaliation windows: ${retWindows.length}
Total incidents tracked (6h): ${data.incidents?.length || 0}
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    `.trim();

    const prompts: Record<CommType, string> = {
      parent_letter: `Write a parent notification letter for Veritas Charter Schools. Tone: calm, reassuring, factual. Do NOT cause alarm. Acknowledge that the school is monitoring the situation, that safety protocols are in place, and that students are safe. Do not mention specific incidents or locations. Close with confidence and a contact for questions. 2-3 short paragraphs. Sign as "The Veritas Charter Schools Safety Team."`,
      staff_email: `Write an internal staff communication for Veritas Charter Schools. Tone: professional, direct, actionable. Include: (1) current situation summary, (2) specific actions staff should take today, (3) dismissal protocol reminder, (4) who to contact with concerns. 3-4 short paragraphs. Sign as "Network Safety Operations."`,
      principal_brief: `Write a principal briefing memo for Veritas Charter Schools. Tone: intelligence-style, direct, specific. Include: (1) current threat assessment, (2) which campuses are most affected and why, (3) specific actions required before end of day, (4) dismissal protocol, (5) reporting requirements. Use bullet points for action items. Sign as "Slate Watch Intelligence."`,
      board_update: `Write a board member update for Veritas Charter Schools. Tone: executive, measured, confident. Include: (1) situation overview without alarmist language, (2) what the network is doing in response, (3) Slate Watch system performance note, (4) next update timing. 2-3 paragraphs. Sign as "Mike Madden, President."`,
      media_statement: `Write a brief media statement for Veritas Charter Schools if contacted by press. Tone: confident, brief, non-specific. Acknowledge awareness of community safety concerns, affirm that student safety is the top priority, note that the school is in communication with law enforcement, decline to provide operational details. 2 short paragraphs. Sign as "Veritas Charter Schools Communications."`,
    };

    try {
      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 600,
          system: `${AI_CONFIG.systemPrompt}\n\nYou are drafting official communications for a charter school network CEO. Write in a clear, professional voice. Never include placeholder text like [NAME] or [DATE] — use the actual data provided. Keep communications concise and actionable.`,
          messages: [{
            role: 'user',
            content: `CONTEXT:\n${context}\n\nTASK:\n${prompts[type]}`,
          }],
        }),
      });
      const result = await response.json();
      setCommDraft(result?.content?.[0]?.text || 'Draft unavailable.');
    } catch {
      setCommDraft('Unable to generate draft. Please try again.');
    } finally {
      setCommLoading(false);
    }
  }, [data, contagionZones, alertTier, tc.label]);

  const copyDraft = useCallback(() => {
    if (commDraft) {
      navigator.clipboard.writeText(commDraft).catch(() => {});
    }
  }, [commDraft]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1080, margin: '0 auto', overflowY: 'auto', height: '100%' }}>

      {/* ═══ TIER HEADER ═══ */}
      <div style={{
        padding: '24px 28px', borderRadius: radius.lg, marginBottom: 24,
        background: tc.bg, border: `2px solid ${tc.border}`,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: '#fff', flexShrink: 0,
          boxShadow: alertTier >= 3 ? `0 0 0 6px ${tc.color}30` : 'none',
          animation: alertTier >= 3 ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}>
          {alertTier}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: '11px', fontWeight: fontWeight.bold, color: tc.color, letterSpacing: '0.12em' }}>
              ALERT TIER {alertTier}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: fontWeight.bold, padding: '2px 10px',
              borderRadius: radius.sm, background: tc.color, color: '#fff', letterSpacing: '0.08em',
            }}>
              {tc.label}
            </span>
          </div>
          <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary, marginBottom: 4 }}>
            {tc.desc}
          </div>
          <div style={{ fontSize: fontSize.xs, color: text.muted }}>
            Auto-assessed from live Watch data · Updates in real time · {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
        {/* Tier ladder */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {([1, 2, 3, 4] as AlertTier[]).map(t => (
            <div key={t} style={{
              width: 28, height: 28, borderRadius: '50%',
              background: t <= alertTier ? TIER_CONFIG[t].color : '#E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: fontWeight.bold,
              color: t <= alertTier ? '#fff' : '#9CA3AF',
              border: t === alertTier ? `2px solid ${TIER_CONFIG[t].color}` : '2px solid transparent',
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RESPONSE PLAYBOOK ═══ */}
      <div style={{
        background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg,
        padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: text.muted, letterSpacing: '0.08em', marginBottom: 2 }}>
              TIER {alertTier} RESPONSE PLAYBOOK
            </div>
            <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: text.primary }}>
              {playbook.length} actions · {completionPct}% complete
            </div>
          </div>
          {/* Role filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['ALL', 'CEO', 'PRINCIPAL', 'SAFETY_DIRECTOR'] as const).map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                style={{
                  padding: '4px 10px', borderRadius: radius.sm,
                  background: activeRole === role ? (role === 'ALL' ? text.primary : ROLE_COLORS[role as Role]?.color || text.primary) : bg.subtle,
                  color: activeRole === role ? '#fff' : text.muted,
                  border: `1px solid ${activeRole === role ? 'transparent' : border.light}`,
                  fontSize: '10px', fontWeight: fontWeight.bold, cursor: 'pointer',
                  fontFamily: font.sans, letterSpacing: '0.04em',
                }}
              >
                {role === 'SAFETY_DIRECTOR' ? 'SAFETY' : role}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${completionPct}%`,
            background: completionPct === 100 ? '#16A34A' : tc.color,
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredPlaybook.map(step => {
            const done = completedSteps.has(step.id);
            const roleStyle = ROLE_COLORS[step.role];
            return (
              <div
                key={step.id}
                onClick={() => toggleStep(step)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px 14px', borderRadius: radius.md,
                  background: done ? '#F0FDF4' : bg.subtle,
                  border: `1px solid ${done ? '#BBF7D0' : border.light}`,
                  borderLeft: `4px solid ${done ? '#16A34A' : (step.critical ? tc.color : border.light)}`,
                  cursor: 'pointer', transition: transition.fast,
                  opacity: done ? 0.7 : 1,
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  background: done ? '#16A34A' : '#fff',
                  border: `2px solid ${done ? '#16A34A' : '#D1D5DB'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#fff',
                }}>
                  {done ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{
                      fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 6px',
                      borderRadius: 3, background: roleStyle.bg, color: roleStyle.color,
                    }}>
                      {step.role === 'SAFETY_DIRECTOR' ? 'SAFETY DIR.' : step.role}
                    </span>
                    {step.critical && (
                      <span style={{ fontSize: '9px', fontWeight: fontWeight.bold, color: tc.color }}>
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: fontSize.sm, color: done ? '#16A34A' : text.primary,
                    textDecoration: done ? 'line-through' : 'none', lineHeight: 1.5,
                  }}>
                    {step.action}
                  </div>
                </div>
                <div style={{
                  fontSize: fontSize.xs, color: text.muted, flexShrink: 0,
                  textAlign: 'right', minWidth: 90,
                }}>
                  {step.timeframe}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ COMMUNICATION DRAFT ENGINE ═══ */}
      <div style={{
        background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg,
        padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: text.muted, letterSpacing: '0.08em', marginBottom: 2 }}>
            AI COMMUNICATION DRAFT ENGINE
          </div>
          <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.bold, color: text.primary }}>
            Generate a communication draft for any audience
          </div>
          <div style={{ fontSize: fontSize.xs, color: text.muted, marginTop: 2 }}>
            Drafts are tailored to the current Tier {alertTier} situation and Veritas network data
          </div>
        </div>

        {/* Comm type buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {COMM_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => generateComm(ct.id)}
              disabled={commLoading}
              style={{
                padding: '10px 16px', borderRadius: radius.md,
                background: activeCommType === ct.id ? brand.brass : bg.subtle,
                color: activeCommType === ct.id ? '#fff' : text.secondary,
                border: `1px solid ${activeCommType === ct.id ? brand.brass : border.light}`,
                cursor: commLoading ? 'default' : 'pointer',
                fontSize: fontSize.sm, fontFamily: font.sans,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: transition.fast,
              }}
            >
              <span>{ct.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>{ct.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>{ct.audience}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Draft output */}
        {(commLoading || commDraft) && (
          <div style={{
            padding: '16px 18px', borderRadius: radius.md,
            background: bg.subtle, border: `1px solid ${border.light}`,
            position: 'relative',
          }}>
            {commLoading ? (
              <div>
                <div style={{ fontSize: fontSize.xs, color: brand.brass, fontWeight: fontWeight.bold, marginBottom: 8 }}>
                  DRAFTING {COMM_TYPES.find(c => c.id === activeCommType)?.label?.toUpperCase()}...
                </div>
                {[90, 75, 85, 60].map((w, i) => (
                  <div key={i} style={{
                    height: 10, borderRadius: 4, marginBottom: 6,
                    background: `linear-gradient(90deg, ${border.light} 0%, #E5E1D8 50%, ${border.light} 100%)`,
                    width: `${w}%`,
                  }} />
                ))}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: brand.brass, letterSpacing: '0.06em' }}>
                    {COMM_TYPES.find(c => c.id === activeCommType)?.label?.toUpperCase()} DRAFT
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={copyDraft}
                      style={{
                        padding: '4px 10px', borderRadius: radius.sm,
                        background: bg.card, border: `1px solid ${border.light}`,
                        fontSize: fontSize.xs, color: text.secondary, cursor: 'pointer',
                        fontFamily: font.sans,
                      }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => { setCommDraft(''); setActiveCommType(null); }}
                      style={{
                        padding: '4px 10px', borderRadius: radius.sm,
                        background: bg.card, border: `1px solid ${border.light}`,
                        fontSize: fontSize.xs, color: text.muted, cursor: 'pointer',
                        fontFamily: font.sans,
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{
                  fontSize: fontSize.sm, color: text.primary, lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                }}>
                  {commDraft}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ RESPONSE LOG ═══ */}
      {log.length > 0 && (
        <div style={{
          background: bg.card, border: `1px solid ${border.light}`, borderRadius: radius.lg,
          overflow: 'hidden', marginBottom: 24,
        }}>
          <button
            onClick={() => setShowLog(l => !l)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: font.sans,
            }}
          >
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: text.primary }}>
              Response Log · {log.length} action{log.length !== 1 ? 's' : ''} completed
            </div>
            <span style={{
              fontSize: 11, color: text.muted,
              transform: showLog ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s', display: 'inline-block',
            }}>▼</span>
          </button>
          {showLog && (
            <div style={{ borderTop: `1px solid ${border.light}`, padding: '12px 20px' }}>
              {log.map(entry => (
                <div key={entry.id} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '8px 0', borderBottom: `1px solid ${border.light}`,
                }}>
                  <div style={{ fontSize: fontSize.xs, color: text.muted, flexShrink: 0, minWidth: 70 }}>
                    {entry.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div style={{
                    fontSize: '9px', fontWeight: fontWeight.bold, padding: '1px 6px',
                    borderRadius: 3, flexShrink: 0, marginTop: 1,
                    background: ROLE_COLORS[entry.role].bg, color: ROLE_COLORS[entry.role].color,
                  }}>
                    {entry.role === 'SAFETY_DIRECTOR' ? 'SAFETY' : entry.role}
                  </div>
                  <div style={{ fontSize: fontSize.sm, color: text.secondary, lineHeight: 1.5 }}>
                    {entry.action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
