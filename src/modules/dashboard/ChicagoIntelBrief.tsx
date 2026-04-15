/**
 * ChicagoIntelBrief — Time-Aware Living Intelligence Card
 * ════════════════════════════════════════════════════════
 *
 * The first thing a CEO or Principal sees when they open Slate.
 * Designed to be the reason they open Slate every single day.
 *
 * Four time periods, each with distinct personality:
 *   OVERNIGHT  10 PM – 5:59 AM  "What happened while you slept"
 *   MORNING     6 AM – 11:59 AM  "Start with the facts"
 *   AFTERNOON  12 PM – 4:59 PM  "The afternoon picture"
 *   EVENING     5 PM – 9:59 PM  "End of day"
 *
 * News sources (all Chicago-specific, confirmed live):
 *   CWB Chicago    — crime, very granular, updates hourly
 *   Block Club     — neighborhood news, schools, community
 *   WTTW           — public media, policy, education, politics
 *   WGN TV         — breaking news, crime, weather
 *
 * Habit loop mechanics:
 *   - "New since last visit" badge via localStorage
 *   - AI-generated one-sentence network status (personalized)
 *   - Auto-refresh every 10 minutes
 *   - "You've been away X hours" re-engagement line
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { bg, text, brand, border, status, font, fontSize, fontWeight, shadow, radius, transition } from '../../core/theme';
import { AI_CONFIG } from '../../core/constants';
import { useNetwork } from '../../data/DataStore';
import { useWatchSummary } from '../watch/v2/useWatchSummary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string;
  title: string;
  source: string;
  pubDate: string;
  link: string;
  category: 'crime' | 'education' | 'politics' | 'schools' | 'general';
  tier: number; // 1=crime, 2=education/schools, 3=politics, 4=general
}

type TimePeriod = 'overnight' | 'morning' | 'afternoon' | 'evening';

interface PeriodConfig {
  label: string;
  sublabel: string;
  accentColor: string;
  accentBg: string;
  greeting: string;
  icon: string;
}

// ─── Time Period Config ───────────────────────────────────────────────────────

function getTimePeriod(): TimePeriod {
  const h = new Date().getHours();
  if (h >= 22 || h < 6) return 'overnight';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const PERIOD_CONFIG: Record<TimePeriod, PeriodConfig> = {
  overnight: {
    label: 'OVERNIGHT WATCH',
    sublabel: 'What happened while you slept',
    accentColor: '#6B7FA3',
    accentBg: 'rgba(107, 127, 163, 0.08)',
    greeting: 'Still watching.',
    icon: '◐',
  },
  morning: {
    label: 'MORNING BRIEF',
    sublabel: 'Start with the facts',
    accentColor: brand.gold,
    accentBg: 'rgba(212, 175, 55, 0.08)',
    greeting: 'Good morning.',
    icon: '◑',
  },
  afternoon: {
    label: 'AFTERNOON UPDATE',
    sublabel: 'The afternoon picture',
    accentColor: '#E8A838',
    accentBg: 'rgba(232, 168, 56, 0.08)',
    greeting: 'Here is where things stand.',
    icon: '◕',
  },
  evening: {
    label: 'EVENING SUMMARY',
    sublabel: 'End of day',
    accentColor: '#C87941',
    accentBg: 'rgba(200, 121, 65, 0.08)',
    greeting: 'The day in review.',
    icon: '●',
  },
};

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<NewsItem['category'], { label: string; color: string; bg: string }> = {
  crime:     { label: 'CRIME',     color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  education: { label: 'EDUCATION', color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  schools:   { label: 'SCHOOLS',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  politics:  { label: 'POLITICS',  color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  general:   { label: 'CHICAGO',   color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
};

// ─── RSS Keyword Filters ──────────────────────────────────────────────────────

const CRIME_KW = /shooting|shot|homicide|murder|stabbing|killed|fatal|gunfire|weapon|gang|violence|assault|robbery|carjack/i;
const EDUCATION_KW = /school|student|teacher|principal|classroom|curriculum|graduation|enrollment|CPS|charter|district|education|learning/i;
const POLITICS_KW = /mayor|alderman|city council|governor|legislation|policy|budget|election|vote|political|CPD|police department/i;
const SCHOOLS_KW = /noble|charter school|public school|private school|academy|campus|board of education/i;

function classifyCategory(title: string, description: string): NewsItem['category'] {
  const text = `${title} ${description}`;
  if (CRIME_KW.test(text)) return 'crime';
  if (SCHOOLS_KW.test(text)) return 'schools';
  if (EDUCATION_KW.test(text)) return 'education';
  if (POLITICS_KW.test(text)) return 'politics';
  return 'general';
}

function getTier(category: NewsItem['category']): number {
  if (category === 'crime') return 1;
  if (category === 'schools') return 2;
  if (category === 'education') return 2;
  if (category === 'politics') return 3;
  return 4;
}

// ─── Time Ago Formatter ───────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Strip HTML ───────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

// ─── Parse RSS XML ────────────────────────────────────────────────────────────

function parseRSSItems(xml: string, sourceName: string): NewsItem[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const items: NewsItem[] = [];
    doc.querySelectorAll('item').forEach(item => {
      const title = stripHtml(item.querySelector('title')?.textContent ?? '');
      const description = stripHtml(item.querySelector('description')?.textContent ?? '');
      const link = item.querySelector('link')?.textContent ?? '';
      const pubDate = item.querySelector('pubDate')?.textContent ?? '';
      if (!title) return;
      const category = classifyCategory(title, description);
      items.push({
        id: link || `${sourceName}-${title.slice(0, 30)}`,
        title,
        source: sourceName,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        link,
        category,
        tier: getTier(category),
      });
    });
    return items;
  } catch {
    return [];
  }
}

// ─── Fetch Chicago News ───────────────────────────────────────────────────────

const CHICAGO_FEEDS = [
  { name: 'CWB Chicago', url: 'https://cwbchicago.com/feed' },
  { name: 'Block Club Chicago', url: 'https://blockclubchicago.org/feed/' },
  { name: 'WTTW Chicago', url: 'https://news.wttw.com/feed' },
  { name: 'WGN TV', url: 'https://wgntv.com/feed/' },
];

async function fetchChicagoNews(): Promise<NewsItem[]> {
  try {
    // Use the existing news-proxy endpoint — pass each URL individually
    const results = await Promise.allSettled(
      CHICAGO_FEEDS.map(async (feed) => {
        const res = await fetch(`/api/news-proxy?url=${encodeURIComponent(feed.url)}`);
        const { feeds } = await res.json() as { feeds: Array<{ name: string; ok: boolean; xml: string }> };
        if (!feeds?.[0]?.ok || !feeds[0].xml) return [];
        return parseRSSItems(feeds[0].xml, feed.name);
      })
    );
    const all: NewsItem[] = [];
    results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });

    // Deduplicate by title similarity, sort by tier then date
    const seen = new Set<string>();
    const deduped = all.filter(item => {
      const key = item.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    deduped.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

    return deduped.slice(0, 8);
  } catch {
    return [];
  }
}

// ─── Last Visit Tracking ──────────────────────────────────────────────────────

const LAST_VISIT_KEY = 'slate_dashboard_last_visit';

function getLastVisitInfo(): { hoursAway: number; isFirstVisitToday: boolean } {
  try {
    const last = localStorage.getItem(LAST_VISIT_KEY);
    if (!last) return { hoursAway: 0, isFirstVisitToday: true };
    const lastDate = new Date(last);
    const now = new Date();
    const hoursAway = Math.floor((now.getTime() - lastDate.getTime()) / 3600000);
    const isFirstVisitToday = lastDate.toDateString() !== now.toDateString();
    return { hoursAway, isFirstVisitToday };
  } catch {
    return { hoursAway: 0, isFirstVisitToday: true };
  }
}

function recordVisit() {
  try {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  } catch { /* ignore */ }
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ChicagoIntelBriefProps {
  onNavigate?: (moduleId: string) => void;
}

export default function ChicagoIntelBrief({ onNavigate }: ChicagoIntelBriefProps) {
  const network = useNetwork();
  const watch = useWatchSummary();

  const [period, setPeriod] = useState<TimePeriod>(getTimePeriod());
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [aiLine, setAiLine] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [visitInfo] = useState(() => getLastVisitInfo());
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = PERIOD_CONFIG[period];

  // ── Load news ──────────────────────────────────────────────────────────────
  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(false);
    try {
      const items = await fetchChicagoNews();
      setNews(items);
      setLastRefresh(new Date());
      if (items.length === 0) setNewsError(true);
    } catch {
      setNewsError(true);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // ── Generate AI status line ────────────────────────────────────────────────
  const generateAiLine = useCallback(async () => {
    if (watch.isLoading) return;
    setAiLoading(true);
    try {
      const periodLabel = config.label.toLowerCase();
      const threatLabel = watch.overallThreat;
      const incidentCount = watch.totalActiveIncidents;
      const campusesElevated = watch.campusesElevated;

      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          max_tokens: 80,
          system: `${AI_CONFIG.systemPrompt}\n\nYou are generating a single sentence (max 20 words) for the ${periodLabel} intelligence card. Be direct, specific, and grounded in the data. No fluff. No em dashes.`,
          messages: [{
            role: 'user',
            content: `Write one sentence summarizing the current safety picture for ${network.name}: threat level is ${threatLabel}, ${incidentCount} active incidents, ${campusesElevated} campuses elevated. Time period: ${periodLabel}.`,
          }],
        }),
      });
      const data = await response.json();
      const line = data?.content?.[0]?.text?.trim() || '';
      if (line) setAiLine(line);
    } catch {
      // Fallback
      const h = watch.campusesElevated;
      const i = watch.totalActiveIncidents;
      if (i === 0) setAiLine(`${network.name} is clear across all ${network.campuses.length} campuses.`);
      else setAiLine(`${h} of ${network.campuses.length} campuses elevated with ${i} active incident${i !== 1 ? 's' : ''} tracked.`);
    } finally {
      setAiLoading(false);
    }
  }, [watch.isLoading, watch.overallThreat, watch.totalActiveIncidents, watch.campusesElevated, network.name, network.campuses.length, config.label]);

  // ── Mount: load news, generate AI line, record visit ──────────────────────
  useEffect(() => {
    loadNews();
    recordVisit();
  }, [loadNews]);

  useEffect(() => {
    if (!watch.isLoading) generateAiLine();
  }, [watch.isLoading, generateAiLine]);

  // ── Auto-refresh every 10 minutes ─────────────────────────────────────────
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      setPeriod(getTimePeriod());
      loadNews();
    }, 10 * 60 * 1000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [loadNews]);

  // ── Displayed news ────────────────────────────────────────────────────────
  const displayedNews = expanded ? news : news.slice(0, 5);

  // ── Story count label for collapsed state ─────────────────────────────────
  const storyLabel = newsLoading
    ? 'Loading Chicago stories...'
    : news.length > 0
    ? `${news.length} Chicago stories · ${news.filter(n => n.category === 'crime').length} crime · ${news.filter(n => n.category === 'schools' || n.category === 'education').length} education`
    : 'No stories loaded';

  // ── Re-engagement line ────────────────────────────────────────────────────
  const reengageLine = visitInfo.hoursAway >= 8
    ? `You've been away ${visitInfo.hoursAway} hours. Here's what changed.`
    : visitInfo.isFirstVisitToday
    ? `First visit today. Here's your ${period === 'morning' ? 'morning' : period === 'afternoon' ? 'afternoon' : period === 'evening' ? 'evening' : 'overnight'} picture.`
    : null;

  // ── Threat color ──────────────────────────────────────────────────────────
  const threatColor = watch.overallThreat === 'RED' ? status.red
    : watch.overallThreat === 'ORANGE' ? '#F97316'
    : watch.overallThreat === 'YELLOW' ? status.amber
    : status.green;

  return (
    <div style={{
      marginBottom: 24,
      borderRadius: radius.lg,
      border: `1px solid ${feedOpen ? config.accentColor + '40' : border.light}`,
      background: bg.card,
      boxShadow: feedOpen ? shadow.md : shadow.sm,
      overflow: 'hidden',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    }}>
      {/* ── Header Bar (always visible, click to toggle) ── */}
      <div
        onClick={() => setFeedOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 20px',
          borderBottom: feedOpen ? `1px solid ${border.light}` : 'none',
          background: config.accentBg,
          borderLeft: `4px solid ${config.accentColor}`,
          cursor: 'pointer',
          userSelect: 'none',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 13,
            color: config.accentColor,
            fontFamily: font.mono,
            letterSpacing: '1.5px',
            fontWeight: fontWeight.bold,
          }}>
            {config.icon} {config.label}
          </span>
          <span style={{
            fontSize: fontSize.xs,
            color: text.muted,
            fontFamily: font.mono,
          }}>
            {config.sublabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live threat dot */}
          {!watch.isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: threatColor,
                boxShadow: watch.overallThreat !== 'GREEN' ? `0 0 6px ${threatColor}80` : 'none',
                animation: watch.overallThreat === 'RED' ? 'pulse 2s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: '10px', color: text.muted, fontFamily: font.mono, letterSpacing: '0.5px' }}>
                {watch.overallThreat}
              </span>
            </div>
          )}
          {/* Last refresh */}
          <span style={{ fontSize: '10px', color: text.light, fontFamily: font.mono }}>
            {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
          {/* Refresh button */}
          <button
            onClick={(e) => { e.stopPropagation(); loadNews(); generateAiLine(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: text.muted, fontSize: 12, padding: '2px 4px',
              borderRadius: radius.sm, transition: transition.fast,
              fontFamily: font.mono,
            }}
            title="Refresh now"
          >
            ↻
          </button>
          {/* Expand chevron */}
          <span style={{
            fontSize: 11,
            color: text.muted,
            fontFamily: font.mono,
            transition: 'transform 0.2s ease',
            display: 'inline-block',
            transform: feedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            marginLeft: 2,
          }}>▼</span>
        </div>
      </div>

      {/* ── Collapsed summary row (always visible when closed) ── */}
      {!feedOpen && (
        <div
          onClick={() => setFeedOpen(true)}
          style={{
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            borderTop: `1px solid ${border.light}`,
          }}
        >
          {aiLoading ? (
            <span style={{ fontSize: fontSize.xs, color: text.light, fontStyle: 'italic' }}>Generating status...</span>
          ) : aiLine ? (
            <span style={{ fontSize: fontSize.xs, color: text.secondary, flex: 1, lineHeight: 1.4 }}>{aiLine}</span>
          ) : null}
          <span style={{
            flexShrink: 0,
            fontSize: '10px',
            color: config.accentColor,
            fontFamily: font.mono,
            fontWeight: fontWeight.semibold,
            letterSpacing: '0.5px',
            marginLeft: 'auto',
          }}>
            {storyLabel} ▼
          </span>
        </div>
      )}

      {/* ── AI Status Line (expanded only) ── */}
      {feedOpen && <div style={{
        padding: '10px 20px',
        borderBottom: `1px solid ${border.light}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 38,
      }}>
        {reengageLine && (
          <span style={{
            fontSize: fontSize.xs,
            color: config.accentColor,
            fontFamily: font.mono,
            fontWeight: fontWeight.semibold,
            marginRight: 4,
            letterSpacing: '0.3px',
          }}>
            {reengageLine}
          </span>
        )}
        {aiLoading ? (
          <span style={{ fontSize: fontSize.xs, color: text.light, fontStyle: 'italic' }}>
            Generating network status...
          </span>
        ) : aiLine ? (
          <span style={{ fontSize: fontSize.xs, color: text.secondary, lineHeight: 1.5 }}>
            {aiLine}
          </span>
        ) : null}
        {onNavigate && !watch.isLoading && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate('watch'); }}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: `1px solid ${border.medium}`,
              borderRadius: radius.sm,
              padding: '2px 8px',
              fontSize: '10px',
              color: text.muted,
              cursor: 'pointer',
              fontFamily: font.mono,
              letterSpacing: '0.5px',
              flexShrink: 0,
              transition: transition.fast,
            }}
          >
            OPEN WATCH
          </button>
        )}
      </div>}

      {/* ── News Items (expanded only) ── */}
      {feedOpen && <div style={{ padding: '4px 0' }}>
        {newsLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 14,
                background: border.light,
                borderRadius: radius.sm,
                marginBottom: 10,
                width: `${70 + (i % 3) * 10}%`,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : newsError || news.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: text.muted, fontSize: fontSize.sm }}>
            Unable to load Chicago news feeds. Check your connection.
          </div>
        ) : (
          displayedNews.map((item, idx) => (
            <NewsRow
              key={item.id}
              item={item}
              isLast={idx === displayedNews.length - 1 && !expanded}
              accentColor={config.accentColor}
            />
          ))
        )}
      </div>}

      {/* ── Footer: Show more / Show less / Close (expanded only) ── */}
      {feedOpen && (
        <div style={{
          borderTop: `1px solid ${border.light}`,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {news.length > 5 && !newsLoading && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: fontSize.xs, color: config.accentColor,
                  fontFamily: font.mono, letterSpacing: '0.5px',
                  fontWeight: fontWeight.semibold, padding: 0,
                }}
              >
                {expanded ? `SHOW LESS ▲` : `+${news.length - 5} MORE STORIES ▼`}
              </button>
            )}
            <button
              onClick={() => { setFeedOpen(false); setExpanded(false); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: fontSize.xs, color: text.muted,
                fontFamily: font.mono, letterSpacing: '0.5px',
                padding: 0,
              }}
            >
              CLOSE ✕
            </button>
          </div>
          <span style={{ fontSize: '10px', color: text.light, fontFamily: font.mono }}>
            CWB · Block Club · WTTW · WGN
          </span>
        </div>
      )}
    </div>
  );
}

// ─── News Row ─────────────────────────────────────────────────────────────────

function NewsRow({ item, isLast, accentColor }: { item: NewsItem; isLast: boolean; accentColor: string }) {
  const [hovered, setHovered] = useState(false);
  const cat = CAT_CONFIG[item.category];

  return (
    <a
      href={item.link || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '9px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${border.light}`,
        textDecoration: 'none',
        background: hovered ? `${accentColor}06` : 'transparent',
        transition: transition.fast,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Category tag */}
      <span style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: radius.sm,
        fontSize: '9px',
        fontFamily: font.mono,
        fontWeight: fontWeight.bold,
        letterSpacing: '0.8px',
        color: cat.color,
        background: cat.bg,
        marginTop: 2,
        minWidth: 62,
        justifyContent: 'center',
      }}>
        {cat.label}
      </span>

      {/* Title */}
      <span style={{
        flex: 1,
        fontSize: fontSize.sm,
        color: hovered ? text.primary : text.secondary,
        lineHeight: 1.45,
        fontFamily: font.body,
        transition: transition.fast,
      }}>
        {item.title}
      </span>

      {/* Source + time */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
        marginTop: 2,
      }}>
        <span style={{ fontSize: '10px', color: text.muted, fontFamily: font.mono, whiteSpace: 'nowrap' }}>
          {item.source.replace('Block Club Chicago', 'Block Club').replace('WGN TV', 'WGN')}
        </span>
        <span style={{ fontSize: '10px', color: text.light, fontFamily: font.mono }}>
          {timeAgo(item.pubDate)}
        </span>
      </div>
    </a>
  );
}
