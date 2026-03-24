/**
 * Slate v3 — useSlateAI Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * The shared AI intelligence engine for the entire platform.
 *
 * Every module calls this hook with a domain-specific prompt and receives
 * live AI-generated prose. The hook:
 *   1. Builds a full network data context from the DataStore
 *   2. Sends it to the AI proxy (OpenAI-compatible via Vercel serverless)
 *   3. Returns streaming-style text with loading state
 *   4. Falls back to a smart static response if the API is unavailable
 *   5. Caches responses to avoid redundant calls
 *
 * Usage:
 *   const { text, loading, regenerate } = useSlateAI({
 *     prompt: 'Analyze the financial health of the network',
 *     domain: 'financials',
 *     label: 'Financial Intelligence',
 *   });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataStore } from '../data/DataStore';
import { buildNetworkSnapshot } from './networkSnapshot';
import { AI_CONFIG } from './constants';
import type { EmergencyEvent } from './types';

// ─── Types ───────────────────────────────────────────────────────────────

export interface SlateAIOptions {
  /** The specific analysis prompt for this module/section */
  prompt: string;
  /** Domain identifier for caching (e.g., 'ledger-overview', 'grounds-facilities') */
  domain: string;
  /** Optional: override the system prompt suffix */
  systemSuffix?: string;
  /** Optional: skip auto-fetch on mount (manual trigger only) */
  manual?: boolean;
  /** Optional: static fallback text if AI is unavailable */
  fallback?: string;
  /** Optional: max tokens for this specific call */
  maxTokens?: number;
}

export interface SlateAIResult {
  text: string;
  loading: boolean;
  error: boolean;
  regenerate: () => void;
  lastGenerated: Date | null;
}

// ─── In-memory cache ─────────────────────────────────────────────────────
// Keyed by domain — prevents redundant API calls within a session.
// Cache is invalidated when emergencies change or on manual regenerate.

const aiCache = new Map<string, { text: string; timestamp: number; emergencyCount: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Global pulse tracker ────────────────────────────────────────────────
// Tracks the last AI call time for the Pulse heartbeat indicator

let lastAICallTime: Date | null = null;
const pulseListeners = new Set<(time: Date) => void>();

export function getLastAICallTime() { return lastAICallTime; }
export function onAIPulse(listener: (time: Date) => void) {
  pulseListeners.add(listener);
  return () => { pulseListeners.delete(listener); };
}

function notifyPulse() {
  lastAICallTime = new Date();
  pulseListeners.forEach(fn => fn(lastAICallTime!));
}

// ─── The Hook ────────────────────────────────────────────────────────────

export function useSlateAI(options: SlateAIOptions): SlateAIResult {
  const { prompt, domain, systemSuffix, manual, fallback, maxTokens } = options;
  const { store } = useDataStore();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Count active emergencies for cache invalidation
  const emergencyCount = (store.emergencyEvents || []).filter(
    (e: EmergencyEvent) => e.status === 'active'
  ).length;

  const generate = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      const cached = aiCache.get(domain);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL) && cached.emergencyCount === emergencyCount) {
        setText(cached.text);
        setLoading(false);
        setError(false);
        setLastGenerated(new Date(cached.timestamp));
        return;
      }
    }

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(false);

    try {
      // Build the full network context
      const snapshot = buildNetworkSnapshot(store);

      // Add emergency context
      const activeEmergencies = (store.emergencyEvents || []).filter(
        (e: EmergencyEvent) => e.status === 'active'
      );
      const emergencyContext = activeEmergencies.length > 0
        ? `\n\nACTIVE EMERGENCIES (${activeEmergencies.length}):\n${activeEmergencies.map((e: EmergencyEvent) =>
            `- ${e.type} at ${e.campus} | Severity: ${e.severity} | Est. Cost: $${(e.estimatedCost || 0).toLocaleString()} | Occupancy Affected: ${e.occupancyAffected ? 'YES' : 'No'} | ${e.description}`
          ).join('\n')}`
        : '';

      const systemPrompt = `${AI_CONFIG.systemPrompt}

${systemSuffix || 'Respond in 2-4 concise paragraphs. Use **bold** for key metrics and findings. Be direct, specific, and connect data points across domains. Every sentence should either state a fact or recommend an action. No filler.'}`;

      const userMessage = `${prompt}

NETWORK DATA SNAPSHOT:
${JSON.stringify(snapshot, null, 2)}${emergencyContext}`;

      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: maxTokens || 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`API ${response.status}`);

      const data = await response.json();
      const aiText = data?.content?.[0]?.text || '';

      if (!aiText) throw new Error('Empty response');

      if (mountedRef.current) {
        setText(aiText);
        setLoading(false);
        setLastGenerated(new Date());
        notifyPulse();

        // Cache the result
        aiCache.set(domain, { text: aiText, timestamp: Date.now(), emergencyCount });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      if (mountedRef.current) {
        // Use fallback if provided, otherwise generate a smart static response
        setText(fallback || '');
        setLoading(false);
        setError(true);
        setLastGenerated(new Date());
      }
    }
  }, [prompt, domain, systemSuffix, fallback, maxTokens, store, emergencyCount]);

  // Auto-generate on mount (unless manual)
  useEffect(() => {
    if (!manual) generate();
    return () => { mountedRef.current = false; };
  }, [manual]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate when emergencies change
  useEffect(() => {
    if (!manual && emergencyCount > 0) {
      generate(true); // Skip cache — emergency state changed
    }
  }, [emergencyCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerate = useCallback(() => generate(true), [generate]);

  return { text, loading, error, regenerate, lastGenerated };
}

// ─── Standalone AI call (for Draft, AskSlate, etc.) ──────────────────────

export async function callSlateAI(options: {
  prompt: string;
  context: string;
  systemSuffix?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { prompt, context, systemSuffix, maxTokens, signal } = options;

  const systemPrompt = `${AI_CONFIG.systemPrompt}

${systemSuffix || 'Be direct, specific, and professional. Format with clear paragraphs and **bold** for key metrics.'}`;

  const response = await fetch('/api/anthropic-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      max_tokens: maxTokens || 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `${prompt}\n\n${context}` }],
    }),
    signal,
  });

  if (!response.ok) throw new Error(`API ${response.status}`);

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty response');

  notifyPulse();
  return text;
}
