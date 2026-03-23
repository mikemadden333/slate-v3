/**
 * Slate v3 — Ask Slate 2.0
 * ═══════════════════════════════════════════════════
 * Context-aware AI intelligence layer.
 * Knows what module you're in, what emergencies are active,
 * and has deep access to all network data.
 *
 * Moonshot: The conversational brain of Slate.
 * "What's the financial impact of the roof collapse?"
 * "Draft a parent letter about the emergency."
 * "Which campuses are below 85% capacity?"
 */

import React, { useState, useRef, useEffect } from 'react';
import { bg, text, brand, border, status, font, fontSize, fontWeight, shadow, radius, transition, modules as modColors } from '../core/theme';
import { AI_CONFIG } from '../core/constants';
import { useDataStore, useEmergencies } from '../data/DataStore';
import { fmtFull, fmtPct, fmtDscr, fmtNum, fmtCompact, fmt } from '../core/formatters';

interface AskSlateProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Module-Aware Suggestions ───────────────────────────────────────────

const MODULE_SUGGESTIONS: Record<string, string[]> = {
  dashboard: [
    'What needs my attention today?',
    'Give me a 30-second executive summary',
    'Which campuses are underperforming?',
    'What are the top 3 risks to the network?',
  ],
  watch: [
    'Are there any active safety threats?',
    'Summarize the safety posture across all campuses',
    'Which campus has the highest risk profile?',
    'Draft a safety update for the board',
  ],
  scholar: [
    'Which campuses are below 85% capacity?',
    'What is the revenue impact of our enrollment gap?',
    'Compare attrition rates across campuses',
    'Project enrollment for next year',
  ],
  ledger: [
    'Are we on track to meet our budget?',
    'What happens if enrollment drops 5%?',
    'Explain our DSCR position to a board member',
    'Which expense categories are over budget?',
  ],
  shield: [
    'What are our Tier 1 risks?',
    'Which risks are trending upward?',
    'Draft a risk summary for the board',
    'What compliance deadlines are at risk?',
  ],
  grounds: [
    'What is the total deferred maintenance backlog?',
    'Which campuses need the most facilities work?',
    'Summarize all urgent work orders',
    'What is the financial impact of the emergency?',
  ],
  fund: [
    'Are we on track to meet our fundraising goal?',
    'What is our weighted pipeline value?',
    'Which opportunities are closest to closing?',
    'Draft a donor update on our progress',
  ],
  briefing: [
    'Regenerate the executive briefing',
    'What changed since yesterday?',
    'Draft a board meeting opening statement',
    'Summarize the key action items',
  ],
  default: [
    'What are our biggest financial risks right now?',
    'Summarize enrollment trends by campus',
    'Draft a board update on our YTD performance',
    'Which campuses need the most attention?',
  ],
};

const MODULE_LABELS: Record<string, { label: string; color: string }> = {
  dashboard: { label: 'Dashboard', color: brand.navy },
  watch: { label: 'Watch', color: modColors.watch },
  scholar: { label: 'Scholar', color: modColors.scholar },
  ledger: { label: 'Ledger', color: modColors.ledger },
  shield: { label: 'Shield', color: modColors.shield },
  grounds: { label: 'Grounds', color: modColors.grounds },
  fund: { label: 'Fund', color: modColors.fund },
  briefing: { label: 'Briefing', color: modColors.briefing },
  signal: { label: 'Signal', color: modColors.signal },
  civic: { label: 'Civic', color: modColors.civic },
  draft: { label: 'Draft', color: brand.brass },
  reports: { label: 'Reports', color: brand.navy },
};

export default function AskSlate({ isOpen, onClose, activeModule }: AskSlateProps) {
  const { store } = useDataStore();
  const { activeEvents } = useEmergencies();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build deep context for AI
  function buildContext(): string {
    const s = store;
    const enrollGap = s.enrollment.targetEnrollment - s.enrollment.networkTotal;
    const tier1Risks = s.risks.register.filter(r => r.tier.includes('Tier 1'));
    const urgentWOs = s.facilities.workOrders.filter(w => w.priority === 'urgent' && w.status !== 'completed');
    const atRiskDeadlines = s.compliance.deadlines.filter(d => d.status === 'at-risk');
    const overBudgetProjects = s.facilities.capitalProjects.filter(p => p.status === 'over-budget');

    let ctx = `
NETWORK: ${s.network.name}, ${s.network.city} — ${s.network.campusCount} campuses, Grades ${s.network.grades}
ENROLLMENT: ${fmtNum(s.enrollment.networkTotal)} students (target: ${fmtNum(s.enrollment.targetEnrollment)}, gap: ${enrollGap > 0 ? '-' : '+'}${Math.abs(enrollGap)}, revenue impact: ${fmtFull(enrollGap * s.network.revenuePerPupil)})
CAMPUS ENROLLMENT: ${s.enrollment.byCampus.map(c => `${c.short}: ${c.enrolled}/${c.capacity} (${fmtPct(c.enrolled/c.capacity*100)} util, ${fmtPct(c.attrition)} attrition)`).join(' | ')}
FINANCIALS (${s.financials.fiscalYear} YTD): Revenue ${fmtFull(s.financials.ytdSummary.revActual * 1_000_000)} vs Budget ${fmtFull(s.financials.ytdSummary.revBudget * 1_000_000)} | Expenses ${fmtFull(s.financials.ytdSummary.expActual * 1_000_000)} vs Budget ${fmtFull(s.financials.ytdSummary.expBudget * 1_000_000)} | Surplus: ${fmtFull(s.financials.ytdSummary.surplus * 1_000_000)} | DSCR: ${fmtDscr(s.financials.ytdSummary.dscr)} (min: ${s.financials.covenants.dscrMinimum}) | Days Cash: ${s.financials.ytdSummary.daysCash} (min: ${s.financials.covenants.daysCashMinimum}) | Current Ratio: ${s.financials.ytdSummary.currentRatio.toFixed(2)} (min: ${s.financials.covenants.currentRatioMinimum})
STAFF: ${s.staff.activeStaff} active / ${s.staff.totalPositions} positions / ${s.staff.vacancies} vacancies / Licensure: ${fmtPct(s.staff.licensureRate)}
RISKS: ${s.risks.register.length} total risks. Tier 1 (Board Focus): ${tier1Risks.length > 0 ? tier1Risks.map(r => `${r.name} (score: ${r.likelihood * r.impact}, trend: ${r.trend}, owner: ${r.owner})`).join('; ') : 'None'}
FUNDRAISING: ${fmtFull(s.fundraising.closedYTD)} closed of ${fmtFull(s.fundraising.goal)} goal (${fmtPct(s.fundraising.closedYTD / s.fundraising.goal * 100)}). Pipeline: ${s.fundraising.pipeline.length} opportunities, weighted: ${fmtFull(s.fundraising.pipeline.reduce((sum, p) => sum + p.weighted, 0))}
COMPLIANCE: ${atRiskDeadlines.length} at-risk deadlines. Audit readiness: ${fmtPct(s.compliance.auditReadiness)}
FACILITIES: ${urgentWOs.length} urgent work orders. ${s.facilities.capitalProjects.length} capital projects (${overBudgetProjects.length} over budget). Network FCI: ${s.facilities.networkFCI || 'N/A'}. Deferred maintenance: ${fmtFull(s.facilities.totalDeferredMaintenance || 0)}
ACTIVE MODULE: ${activeModule}
VIEW: ${s.role === 'ceo' ? 'CEO / Network Level' : `Principal / ${s.network.campuses.find(c => c.id === s.selectedCampusId)?.name || 'Unknown'}`}`.trim();

    // Golden Thread: Emergency context
    if (activeEvents.length > 0) {
      ctx += `\n\nACTIVE EMERGENCIES (CRITICAL — user may ask about these):\n${activeEvents.map(e => `- ${e.title}: ${e.description} | Severity: ${e.severity} | Campus: ${e.campus} | Est. Cost: $${e.estimatedCost.toLocaleString()} | Occupancy Impact: ${e.occupancyImpact ? 'YES' : 'No'} | Reported: ${new Date(e.timestamp).toLocaleString()} | Status: ${e.status}`).join('\n')}`;
    }

    return ctx;
  }

  async function handleSubmit(customQuery?: string) {
    const q = customQuery || query.trim();
    if (!q || loading) return;

    const userMsg: Message = { role: 'user', content: q, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: AI_CONFIG.maxTokens,
          system: `${AI_CONFIG.systemPrompt}

You are the AI intelligence analyst for Slate, an executive intelligence platform for charter school networks. You have access to real-time data across all modules. The user is currently viewing the "${activeModule}" module.

${activeEvents.length > 0 ? 'IMPORTANT: There are active facility emergencies. If the user asks about impact, costs, or emergencies, provide detailed analysis incorporating the emergency data.' : ''}

CURRENT DATA SNAPSHOT:
${buildContext()}

INSTRUCTIONS:
- Be direct, specific, and data-driven. Use exact numbers from the data.
- When asked to "draft" something, write it in full — letters, board updates, summaries.
- Connect data points across modules to provide cross-functional insights.
- If asked about financial impact of emergencies, calculate using the emergency cost data.
- Use the Slate voice: authoritative, warm, precise. No fluff.
- Format responses with clear paragraphs. Use bold for key metrics.`,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: q },
          ],
        }),
      });

      const data = await response.json();
      const assistantContent = data?.content?.[0]?.text || 'I was unable to generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent, timestamp: new Date() }]);
    } catch (err) {
      // Intelligent fallback based on query intent
      let fallback = 'Connection error. Here is what I can tell you from the data:\n\n';
      const ql = q.toLowerCase();
      if (ql.includes('emergency') || ql.includes('impact') || ql.includes('roof') || ql.includes('collapse')) {
        if (activeEvents.length > 0) {
          const e = activeEvents[0];
          fallback += `**Active Emergency:** ${e.title}\n\n**Estimated Cost:** $${e.estimatedCost.toLocaleString()}\n**Severity:** ${e.severity}\n**Occupancy Impact:** ${e.occupancyImpact ? 'Yes — building affected' : 'No'}\n**Campus:** ${e.campus}\n\nThis emergency has been threaded to Watch (alert sent), Briefing (flagged), Shield (risk entry created), and Ledger (financial impact modeled).`;
        } else {
          fallback += 'No active emergencies at this time.';
        }
      } else if (ql.includes('enrollment') || ql.includes('student')) {
        const s = store;
        fallback += `**Network Enrollment:** ${fmtNum(s.enrollment.networkTotal)} of ${fmtNum(s.enrollment.targetEnrollment)} target.\n\n`;
        s.enrollment.byCampus.forEach(c => {
          const pct = (c.enrolled / c.capacity * 100).toFixed(1);
          fallback += `- **${c.short}:** ${fmtNum(c.enrolled)} / ${c.capacity} (${pct}% capacity)\n`;
        });
      } else if (ql.includes('financial') || ql.includes('budget') || ql.includes('dscr')) {
        const ytd = store.financials.ytdSummary;
        fallback += `**YTD Revenue:** ${fmtFull(ytd.revActual * 1_000_000)} vs ${fmtFull(ytd.revBudget * 1_000_000)} budget\n**YTD Expenses:** ${fmtFull(ytd.expActual * 1_000_000)} vs ${fmtFull(ytd.expBudget * 1_000_000)} budget\n**Surplus:** ${fmtFull(ytd.surplus * 1_000_000)}\n**DSCR:** ${fmtDscr(ytd.dscr)} (min: ${store.financials.covenants.dscrMinimum})\n**Days Cash:** ${ytd.daysCash} (min: ${store.financials.covenants.daysCashMinimum})`;
      } else {
        fallback += `The network serves ${fmtNum(store.enrollment.networkTotal)} students across ${store.network.campusCount} campuses with a YTD surplus of ${fmtFull(store.financials.ytdSummary.surplus * 1_000_000)}.`;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: fallback, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const suggestions = MODULE_SUGGESTIONS[activeModule] || MODULE_SUGGESTIONS.default;
  const modInfo = MODULE_LABELS[activeModule];

  // If there are active emergencies, add emergency-specific suggestions
  const emergencySuggestions = activeEvents.length > 0
    ? ['What is the financial impact of the emergency?', 'Draft a parent letter about the emergency']
    : [];
  const allSuggestions = [...emergencySuggestions, ...suggestions].slice(0, 4);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: 720, maxHeight: '75vh',
        background: bg.card, borderRadius: radius.xl, boxShadow: shadow.xl,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: `1px solid ${border.light}`,
        animation: 'askSlateIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${border.light}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${bg.subtle} 0%, ${bg.card} 100%)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: fontSize.xl, color: brand.gold }}>✦</span>
            <div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: text.primary }}>Ask Slate</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <span style={{ fontSize: fontSize.xs, color: text.light }}>AI intelligence analyst</span>
                {modInfo && (
                  <>
                    <span style={{ fontSize: fontSize.xs, color: text.light }}>·</span>
                    <span style={{
                      fontSize: '9px', padding: '1px 6px', borderRadius: radius.full,
                      background: `${modInfo.color}15`, color: modInfo.color, fontWeight: fontWeight.semibold,
                    }}>{modInfo.label}</span>
                  </>
                )}
                {activeEvents.length > 0 && (
                  <>
                    <span style={{ fontSize: fontSize.xs, color: text.light }}>·</span>
                    <span style={{
                      fontSize: '9px', padding: '1px 6px', borderRadius: radius.full,
                      background: status.redBg, color: status.red, fontWeight: fontWeight.bold,
                      border: `1px solid ${status.redBorder}`,
                    }}>{activeEvents.length} EMERGENCY</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{
                background: bg.subtle, border: `1px solid ${border.light}`, cursor: 'pointer',
                fontSize: fontSize.xs, color: text.muted, padding: '4px 10px', borderRadius: radius.full,
                fontFamily: font.sans,
              }}>Clear</button>
            )}
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: fontSize.sm, color: text.light, padding: '4px 8px', borderRadius: radius.sm,
              fontFamily: font.mono,
            }}>Esc</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: text.light }}>
              <div style={{ fontSize: '32px', marginBottom: 8, color: brand.gold }}>✦</div>
              <div style={{ fontSize: fontSize.md, color: text.secondary, fontWeight: fontWeight.medium }}>
                What would you like to know?
              </div>
              <div style={{ fontSize: fontSize.sm, marginTop: 4, color: text.muted }}>
                I have access to all {store.network.name} data across every module.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                {allSuggestions.map((suggestion) => (
                  <button key={suggestion} onClick={() => handleSubmit(suggestion)} style={{
                    padding: '8px 16px', borderRadius: radius.full,
                    border: `1px solid ${border.light}`, background: bg.subtle,
                    cursor: 'pointer', fontSize: fontSize.xs, color: text.secondary,
                    fontFamily: font.sans, transition: transition.fast, lineHeight: 1.4,
                  }}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: `${brand.gold}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: fontSize.sm, color: brand.gold, flexShrink: 0, marginRight: 8, marginTop: 2,
                }}>✦</div>
              )}
              <div style={{
                maxWidth: '80%', padding: '12px 16px',
                borderRadius: msg.role === 'user'
                  ? `${radius.lg} ${radius.lg} ${radius.sm} ${radius.lg}`
                  : `${radius.lg} ${radius.lg} ${radius.lg} ${radius.sm}`,
                background: msg.role === 'user' ? brand.navy : bg.subtle,
                color: msg.role === 'user' ? text.inverse : text.primary,
                fontSize: fontSize.sm, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                border: msg.role === 'assistant' ? `1px solid ${border.light}` : 'none',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: text.light, fontSize: fontSize.sm }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: brand.gold, animation: `askDot 1.4s infinite ${i * 0.2}s`,
                  }} />
                ))}
              </div>
              Analyzing across {store.network.campusCount} campuses...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${border.light}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={activeEvents.length > 0 ? 'Ask about the emergency, finances, enrollment...' : 'Ask anything about your network...'}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: radius.lg,
                border: `1px solid ${border.light}`, background: bg.subtle,
                fontSize: fontSize.sm, fontFamily: font.sans, color: text.primary,
                outline: 'none', transition: transition.fast,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = brand.brass; e.currentTarget.style.boxShadow = `0 0 0 3px ${brand.brass}20`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = border.light; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button onClick={() => handleSubmit()} disabled={!query.trim() || loading} style={{
              padding: '12px 24px', borderRadius: radius.lg, border: 'none',
              background: query.trim() ? brand.gold : bg.subtle,
              color: query.trim() ? brand.navy : text.light,
              fontWeight: fontWeight.bold, fontSize: fontSize.sm,
              cursor: query.trim() ? 'pointer' : 'default',
              transition: transition.fast, fontFamily: font.sans,
            }}>
              ↵
            </button>
          </div>
          <div style={{ fontSize: '9px', color: text.light, marginTop: 6, textAlign: 'center' }}>
            ⌘K to open · Esc to close · Context: {modInfo?.label || 'Global'} {activeEvents.length > 0 ? `· ${activeEvents.length} active emergency` : ''}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes askSlateIn { from { opacity: 0; transform: translateY(-10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes askDot { 0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
