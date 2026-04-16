/**
 * ContagionAnalystChat — Phase 3 Mars Landing
 * Conversational AI interface for the Contagion tab.
 * Replaces the one-shot "Analyze" button with a persistent chat
 * that remembers context and allows follow-up questions.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ContagionZone } from '../../engine/types';
import { AI_CONFIG } from '../../../../core/constants';
import { bg, text, brand, border, font, fontSize, fontWeight, radius, transition } from '../../../../core/theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Stats {
  acute: ContagionZone[];
  active: ContagionZone[];
  watch: ContagionZone[];
  retWindows: ContagionZone[];
  gangRelated: ContagionZone[];
  total: number;
  exposureMatrix: { campus: { name: string }; zones: ContagionZone[]; maxPhase: string; inRetWin: boolean }[];
}

interface Props {
  zones: ContagionZone[];
  stats: Stats;
  /** Legacy one-shot analysis text (shown as first assistant message if present) */
  aiAnalysis: string;
  aiLoading: boolean;
  onRunAi: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Which campus is most at risk right now?',
  'Are we in an escalation or de-escalation cycle?',
  'What should the CEO communicate to principals today?',
  'Explain the retaliation window risk in plain language.',
  'Which zones are most likely to generate follow-on violence?',
];

export default function ContagionAnalystChat({ zones, stats, aiAnalysis, aiLoading, onRunAi }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Seed with legacy one-shot analysis if present
  useEffect(() => {
    if (aiAnalysis && messages.length === 0) {
      setMessages([{ role: 'assistant', content: aiAnalysis }]);
      setExpanded(true);
    }
  }, [aiAnalysis]);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, expanded]);

  const buildSystemPrompt = useCallback(() => {
    const zoneData = zones.slice(0, 20).map(z => ({
      phase: z.phase,
      ageH: Math.round(z.ageH),
      daysLeft: z.daysLeft,
      block: z.block,
      retWin: z.retWin,
      gang: z.gang,
    }));
    const exposureData = stats.exposureMatrix.map(e => ({
      campus: e.campus.name,
      zoneCount: e.zones.length,
      maxPhase: e.maxPhase,
      inRetWin: e.inRetWin,
    }));
    return `${AI_CONFIG.systemPrompt}

You are the Slate AI Contagion Analyst — a world-class violence intelligence expert trained on the Papachristos Violence Contagion Model (JAMA 2017, Green/Horel/Papachristos).

CURRENT NETWORK DATA:
- Total active contagion zones: ${stats.total}
- ACUTE (0-72h): ${stats.acute.length}
- ACTIVE (72h-14d): ${stats.active.length}  
- WATCH (14d-125d): ${stats.watch.length}
- Active retaliation windows: ${stats.retWindows.length}
- Gang-related zones: ${stats.gangRelated.length}

ZONE DETAILS (top 20):
${JSON.stringify(zoneData, null, 2)}

CAMPUS EXPOSURE:
${JSON.stringify(exposureData, null, 2)}

BEHAVIORAL GUIDELINES:
- Be direct, specific, and actionable. No hedging.
- Connect spatial and temporal patterns explicitly.
- Always name specific campuses and locations.
- Distinguish between statistical risk and operational certainty.
- When asked about actions, give role-specific recommendations (CEO / Principal / Safety Director).
- Keep responses concise: 3-5 sentences unless asked for detail.
- Never say "I cannot predict" — say what the data suggests and with what confidence.`;
  }, [zones, stats]);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: userText.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setExpanded(true);

    try {
      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 800,
          system: buildSystemPrompt(),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data?.content?.[0]?.text || 'Analysis unavailable.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Unable to reach the AI analyst. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, buildSystemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div style={{
      background: bg.card,
      border: `1px solid ${border.light}`,
      borderRadius: radius.lg,
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => {
          if (!hasMessages && !expanded) {
            onRunAi();
            setExpanded(true);
          } else {
            setExpanded(e => !e);
          }
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: font.sans,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `${brand.brass}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>
            ✦
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: brand.brass, letterSpacing: '0.08em' }}>
              AI CONTAGION ANALYST
            </div>
            <div style={{ fontSize: fontSize.sm, color: text.muted, marginTop: 1 }}>
              {hasMessages
                ? `${messages.length} message${messages.length !== 1 ? 's' : ''} · Ask a follow-up`
                : 'Pattern detection, risk assessment, strategic recommendations'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(aiLoading || loading) && (
            <div style={{ fontSize: fontSize.xs, color: brand.brass }}>Analyzing...</div>
          )}
          <span style={{
            fontSize: 11, color: text.muted,
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>▼</span>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${border.light}` }}>
          {/* Suggested questions (only when no messages yet) */}
          {!hasMessages && !aiLoading && (
            <div style={{ padding: '12px 20px 0' }}>
              <div style={{ fontSize: fontSize.xs, color: text.muted, marginBottom: 8, letterSpacing: '0.06em', fontWeight: fontWeight.bold }}>
                SUGGESTED QUESTIONS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: radius.sm,
                      border: `1px solid ${border.light}`,
                      background: bg.subtle,
                      fontSize: fontSize.xs,
                      color: text.secondary,
                      cursor: 'pointer',
                      fontFamily: font.sans,
                      transition: transition.fast,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message thread */}
          {hasMessages && (
            <div style={{
              maxHeight: 360,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                }}>
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: `${brand.brass}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, flexShrink: 0, marginTop: 2,
                    }}>✦</div>
                  )}
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? `${radius.md} ${radius.md} 4px ${radius.md}` : `${radius.md} ${radius.md} ${radius.md} 4px`,
                    background: msg.role === 'user' ? `${brand.brass}15` : bg.subtle,
                    border: `1px solid ${msg.role === 'user' ? `${brand.brass}30` : border.light}`,
                    fontSize: fontSize.sm,
                    color: text.primary,
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: `${brand.brass}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0,
                  }}>✦</div>
                  <div style={{
                    padding: '10px 14px', borderRadius: radius.md,
                    background: bg.subtle, border: `1px solid ${border.light}`,
                    display: 'flex', gap: 4, alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: brand.brass,
                        opacity: 0.6,
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: '12px 20px 16px',
            borderTop: hasMessages ? `1px solid ${border.light}` : 'none',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the analyst anything about these zones..."
              rows={1}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: radius.md,
                border: `1px solid ${border.light}`,
                background: bg.subtle,
                fontSize: fontSize.sm,
                color: text.primary,
                fontFamily: font.sans,
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                minHeight: 38,
                maxHeight: 100,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                padding: '9px 16px',
                borderRadius: radius.md,
                background: input.trim() && !loading ? brand.brass : bg.subtle,
                color: input.trim() && !loading ? '#fff' : text.muted,
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                fontFamily: font.sans,
                transition: transition.fast,
                flexShrink: 0,
              }}
            >
              {loading ? '...' : 'Ask'}
            </button>
          </div>

          {/* Clear conversation */}
          {hasMessages && (
            <div style={{ padding: '0 20px 12px', textAlign: 'right' }}>
              <button
                onClick={() => setMessages([])}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: fontSize.xs, color: text.muted, fontFamily: font.sans,
                }}
              >
                Clear conversation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
