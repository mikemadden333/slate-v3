/**
 * Slate v3 — Ask Slate
 * AI-powered query overlay. The intelligence layer's conversational interface.
 */

import React, { useState, useRef, useEffect } from 'react';
import { bg, text, brand, border, font, fontSize, fontWeight, shadow, radius, transition } from '../core/theme';
import { AI_CONFIG } from '../core/constants';
import { useDataStore } from '../data/DataStore';
import { fmtFull, fmtPct, fmtDscr, fmtNum } from '../core/formatters';

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

export default function AskSlate({ isOpen, onClose, activeModule }: AskSlateProps) {
  const { store } = useDataStore();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build context summary for Claude
  function buildContext(): string {
    const s = store;
    return `
NETWORK: ${s.network.name}, ${s.network.city} — ${s.network.campusCount} campuses, Grades ${s.network.grades}
ENROLLMENT: ${fmtNum(s.enrollment.networkTotal)} students (target: ${fmtNum(s.enrollment.targetEnrollment)})
FINANCIALS (${s.financials.fiscalYear} YTD): Revenue ${fmtFull(s.financials.ytdSummary.revActual * 1_000_000)} vs Budget ${fmtFull(s.financials.ytdSummary.revBudget * 1_000_000)} | Expenses ${fmtFull(s.financials.ytdSummary.expActual * 1_000_000)} vs Budget ${fmtFull(s.financials.ytdSummary.expBudget * 1_000_000)} | Surplus: ${fmtFull(s.financials.ytdSummary.surplus * 1_000_000)} | DSCR: ${fmtDscr(s.financials.ytdSummary.dscr)} | Days Cash: ${s.financials.ytdSummary.daysCash}
STAFF: ${s.staff.activeStaff} active / ${s.staff.totalPositions} positions / ${s.staff.vacancies} vacancies
RISKS: ${s.risks.register.length} risks tracked. Tier 1: ${s.risks.register.filter(r => r.tier.includes('Tier 1')).map(r => r.name).join(', ')}
FUNDRAISING: ${fmtFull(s.fundraising.closedYTD)} closed of ${fmtFull(s.fundraising.goal)} goal. Pipeline: ${s.fundraising.pipeline.length} opportunities.
COMPLIANCE: ${s.compliance.deadlines.filter(d => d.status === 'at-risk').length} at-risk deadlines.
FACILITIES: ${s.facilities.workOrders.filter(w => w.priority === 'urgent').length} urgent work orders.
ACTIVE MODULE: ${activeModule}
VIEW: ${s.role === 'ceo' ? 'CEO / Network Level' : `Principal / ${s.network.campuses.find(c => c.id === s.selectedCampusId)?.name || 'Unknown'}`}
    `.trim();
  }

  async function handleSubmit() {
    if (!query.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: query.trim(), timestamp: new Date() };
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
          system: `${AI_CONFIG.systemPrompt}\n\nCURRENT DATA SNAPSHOT:\n${buildContext()}`,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg.content },
          ],
        }),
      });

      const data = await response.json();
      const assistantContent = data?.content?.[0]?.text || 'I was unable to generate a response. Please try again.';

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please check your network and try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '10vh',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%',
        maxWidth: 680,
        maxHeight: '70vh',
        background: bg.card,
        borderRadius: radius.xl,
        boxShadow: shadow.xl,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${border.light}`,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${border.light}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: fontSize.xl,
              color: brand.gold,
            }}>✦</span>
            <div>
              <div style={{
                fontSize: fontSize.md,
                fontWeight: fontWeight.semibold,
                color: text.primary,
              }}>
                Ask Slate
              </div>
              <div style={{
                fontSize: fontSize.xs,
                color: text.light,
              }}>
                AI intelligence analyst · Powered by Claude
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: fontSize.lg,
              color: text.light,
              padding: '4px 8px',
              borderRadius: radius.sm,
            }}
          >
            Esc
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '32px 0',
              color: text.light,
            }}>
              <div style={{ fontSize: fontSize['2xl'], marginBottom: 8 }}>✦</div>
              <div style={{ fontSize: fontSize.md, color: text.secondary, fontWeight: fontWeight.medium }}>
                What would you like to know?
              </div>
              <div style={{ fontSize: fontSize.sm, marginTop: 4 }}>
                Ask about enrollment trends, financial health, safety conditions, or anything else.
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                marginTop: 20,
              }}>
                {[
                  'What are our biggest financial risks right now?',
                  'Summarize enrollment trends by campus',
                  'Draft a board update on our YTD performance',
                  'Which campuses need the most attention?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setQuery(suggestion); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: radius.full,
                      border: `1px solid ${border.light}`,
                      background: bg.subtle,
                      cursor: 'pointer',
                      fontSize: fontSize.xs,
                      color: text.secondary,
                      fontFamily: font.sans,
                      transition: transition.fast,
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user'
                  ? `${radius.lg} ${radius.lg} ${radius.sm} ${radius.lg}`
                  : `${radius.lg} ${radius.lg} ${radius.lg} ${radius.sm}`,
                background: msg.role === 'user' ? brand.navy : bg.subtle,
                color: msg.role === 'user' ? text.inverse : text.primary,
                fontSize: fontSize.sm,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: text.light,
              fontSize: fontSize.sm,
            }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: brand.gold,
                animation: 'pulse 1.5s infinite',
              }} />
              Analyzing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: `1px solid ${border.light}`,
        }}>
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Ask anything about your network..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: radius.lg,
                border: `1px solid ${border.light}`,
                background: bg.subtle,
                fontSize: fontSize.sm,
                fontFamily: font.sans,
                color: text.primary,
                outline: 'none',
                transition: transition.fast,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = brand.brass; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = border.light; }}
            />
            <button
              onClick={handleSubmit}
              disabled={!query.trim() || loading}
              style={{
                padding: '10px 20px',
                borderRadius: radius.lg,
                border: 'none',
                background: query.trim() ? brand.gold : bg.subtle,
                color: query.trim() ? brand.navy : text.light,
                fontWeight: fontWeight.semibold,
                fontSize: fontSize.sm,
                cursor: query.trim() ? 'pointer' : 'default',
                transition: transition.fast,
                fontFamily: font.sans,
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
