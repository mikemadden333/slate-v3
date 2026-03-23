/**
 * IntelQuery — Section 10: Ask Watch.
 *
 * Header: "Ask Watch Anything"
 * Prominent input. Suggested questions that update based on conditions.
 * Responses in clean answer cards with data sources.
 */

import { useState, useCallback } from 'react';
import type { CampusRisk } from '../../engine/types';
import type { Campus } from '../../data/campuses';
import { Send, Loader } from 'lucide-react';

interface Props {
  campus: Campus;
  risk: CampusRisk;
}

interface AnswerCard {
  question: string;
  answer: string;
  sources: string;
}

export default function IntelQuery({ campus, risk }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<AnswerCard[]>([]);

  const suggestions = getSuggestions(risk);

  const sendQuery = useCallback(async (queryText?: string) => {
    const question = queryText ?? input.trim();
    if (!question || loading) return;
    if (!queryText) setInput('');
    setLoading(true);

    const acuteCount = risk.contagionZones.filter(z => z.phase === 'ACUTE').length;
    const activeCount = risk.contagionZones.filter(z => z.phase === 'ACTIVE').length;

    const systemPrompt = `You are Watch, a violence intelligence system for the network in Chicago.
You are answering a question from the principal of ${campus.name} in ${campus.communityArea}.

Current data:
- Risk score: ${risk.score} (${risk.label})
- Base ${risk.base} / Acute ${risk.acute} / Seasonal ${risk.seasonal}
- School period: ${risk.schoolPeriod}
- Incidents 0.5mi/24h: ${risk.closeCount}, 1mi/24h: ${risk.nearCount}
- Contagion zones: ${risk.contagionZones.length} (${acuteCount} ACUTE, ${activeCount} ACTIVE)
- Retaliation window: ${risk.inRetaliationWindow}
- Minutes to dismissal: ${risk.minutesToDismissal}

Rules:
- Be concise: 3-5 sentences max
- Use specific numbers
- If asked about a protocol, give specific actionable steps
- Tone: trusted colleague, not robot
- End with one specific recommendation`;

    try {
      const res = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: question }],
        }),
      });

      if (!res.ok) throw new Error(`API: ${res.status}`);
      const data = await res.json() as { content: Array<{ text: string }> };
      const answerText = data.content[0]?.text ?? 'Unable to process query.';

      setAnswers(prev => [...prev, {
        question,
        answer: answerText,
        sources: `Based on: ${risk.closeCount + risk.nearCount} CPD incidents (last 24h), ${risk.contagionZones.length} contagion zones, risk score ${risk.score}`,
      }]);
    } catch {
      setAnswers(prev => [...prev, {
        question,
        answer: 'Query failed — check API key and try again.',
        sources: '',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, campus, risk]);

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#121315' }}>Ask Watch</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
          Ask anything about your campus safety environment
        </div>
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendQuery()}
          placeholder={`What would you like to know about ${campus.short} today?`}
          style={{
            flex: 1, border: '2px solid #E5E7EB', borderRadius: 10,
            padding: '14px 16px', fontSize: 16, outline: 'none',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        />
        <button
          onClick={() => sendQuery()}
          disabled={loading || !input.trim()}
          style={{
            background: '#121315', border: 'none', borderRadius: 10,
            color: '#fff', padding: '14px 16px', cursor: loading ? 'wait' : 'pointer',
            opacity: !input.trim() ? 0.5 : 1, minWidth: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
        </button>
      </div>

      {/* Suggested questions */}
      {answers.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => sendQuery(q)}
              style={{
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid #E5E7EB', background: '#F8F9FA',
                cursor: 'pointer', fontSize: 13, color: '#374151',
                textAlign: 'left', lineHeight: 1.4, minHeight: 44,
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Answer cards */}
      {answers.map((card, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          {/* Question */}
          <div style={{
            fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginBottom: 8,
          }}>
            {card.question}
          </div>
          {/* Answer card */}
          <div style={{
            padding: '16px 18px', background: '#F8F9FA',
            borderRadius: 10, border: '1px solid #E5E7EB',
          }}>
            <div style={{ fontSize: 16, color: '#121315', lineHeight: 1.7 }}>
              {card.answer}
            </div>
            {card.sources && (
              <div style={{
                marginTop: 12, paddingTop: 8, borderTop: '1px solid #E5E7EB',
                fontSize: 12, color: '#9CA3AF',
              }}>
                {card.sources}
              </div>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, color: '#9CA3AF', fontSize: 14, padding: 8,
        }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Processing your question...
        </div>
      )}
    </div>
  );
}

function getSuggestions(risk: CampusRisk): string[] {
  const suggestions: string[] = [];
  if (risk.inRetaliationWindow) {
    suggestions.push('What should I tell my staff about this retaliation window?');
  }
  if (risk.minutesToDismissal > 0 && risk.minutesToDismissal <= 240) {
    suggestions.push('Should I modify dismissal today?');
  }
  suggestions.push('What happened near my campus last weekend?');
  suggestions.push('What is the safest day this week?');
  suggestions.push('How does my campus compare to the rest of the network?');
  return suggestions.slice(0, 5);
}
