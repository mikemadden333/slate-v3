/**
 * Slate v3 — Unified Design System
 * MEA Brand Guide v1.0 — "Deep navy. Warm gold. Glass-like depth. Quiet authority."
 * Every color, spacing, and typography token lives here.
 * No module defines its own colors. Ever.
 */

// ─── Brand Colors ─────────────────────────────────────────────────────────

export const brand = {
  navy:     '#0A1628',   // Deep Navy — all primary backgrounds
  gold:     '#C9A54E',   // Warm Gold — headlines, accent lines, buttons
  mutedGold:'#D4B978',   // Muted Gold — secondary buttons, hover
  ivory:    '#E8DCC8',   // Soft Ivory — pull quotes, warm emphasis
  white:    '#F0F2F5',   // Signal White — headlines, critical text
  iceBlue:  '#B8C9DB',   // Ice Blue — body text, labels
  slateBlue:'#2A3F5F',   // Slate Blue — cards, elevated surfaces
} as const;

// ─── Backgrounds ──────────────────────────────────────────────────────────

export const bg = {
  app:      '#0A1628',   // Deep Navy — unified background
  card:     '#2A3F5F',   // Slate Blue — glass card surfaces
  cardGlass:'rgba(42, 63, 95, 0.65)', // Glass Card — 50-80% opacity with backdrop blur
  sidebar:  '#0A1628',   // Deep Navy
  sidebarGlass: 'linear-gradient(180deg, #122040 0%, #0E1A32 30%, #0A1628 70%, #081220 100%)',
  header:   '#0F1D35',   // Slightly lighter navy for top bar
  hover:    'rgba(42, 63, 95, 0.4)',
  selected: 'rgba(201, 165, 78, 0.12)',
  subtle:   '#0E1A32',   // Slightly lighter than deep navy
  gradient: 'linear-gradient(180deg, #0A1628 0%, #0E1A32 100%)',
  surface:  'rgba(42, 63, 95, 0.5)', // Glass surface fallback
} as const;

// ─── Text Colors ──────────────────────────────────────────────────────────

export const text = {
  primary:   '#F0F2F5',  // Signal White — headlines, critical text
  secondary: '#B8C9DB',  // Ice Blue — body text, labels
  muted:     '#7A8FA8',  // Muted ice blue
  light:     '#5A6F88',  // Subdued
  inverse:   '#F0F2F5',  // Signal White
  accent:    '#C9A54E',  // Warm Gold
  ivory:     '#E8DCC8',  // Soft Ivory — pull quotes
  link:      '#5B8DB8',  // Steel Blue
} as const;

// ─── Semantic / Functional Colors (Slate Product Only) ────────────────────

export const status = {
  // Positive — Sage Green
  green:     '#4A9B6E',
  greenBg:   'rgba(74, 155, 110, 0.12)',
  greenBorder: 'rgba(74, 155, 110, 0.25)',

  // Negative — Ember Red
  red:       '#D94F4F',
  redBg:     'rgba(217, 79, 79, 0.12)',
  redBorder: 'rgba(217, 79, 79, 0.25)',

  // Warning — Amber
  amber:     '#E8A838',
  amberBg:   'rgba(232, 168, 56, 0.12)',
  amberBorder: 'rgba(232, 168, 56, 0.25)',

  // Info — Steel Blue
  blue:      '#5B8DB8',
  blueBg:    'rgba(91, 141, 184, 0.12)',
  blueBorder: 'rgba(91, 141, 184, 0.25)',

  // Neutral
  gray:      '#7A8FA8',
  grayBg:    'rgba(122, 143, 168, 0.12)',
  grayBorder: 'rgba(122, 143, 168, 0.25)',
} as const;

// ─── Module Accent Colors ─────────────────────────────────────────────────

export const modules = {
  watch:    '#4A9B6E',  // Sage Green — safety, vigilance
  ledger:   '#5B8DB8',  // Steel Blue — financial clarity
  scholar:  '#8B7EC8',  // Soft violet — academic, enrollment
  shield:   '#E8A838',  // Amber — risk, protection
  fund:     '#5B8DB8',  // Steel Blue — fundraising, growth
  grounds:  '#7A8FA8',  // Muted — facilities, physical
  civic:    '#C97A8E',  // Muted rose — public affairs
  signal:   '#D4B978',  // Muted Gold — network health
  draft:    '#6B7EC8',  // Soft indigo — communications
  reports:  '#5B9B8E',  // Teal — reporting
  briefing: '#C9A54E',  // Warm Gold — executive intelligence
  datahub:  '#4A9B6E',  // Sage Green — data management
} as const;

// ─── Borders & Dividers ──────────────────────────────────────────────────

export const border = {
  light:    'rgba(255, 255, 255, 0.08)',  // Glass edge
  medium:   'rgba(255, 255, 255, 0.12)',
  dark:     'rgba(255, 255, 255, 0.18)',
  focus:    '#C9A54E',  // Gold focus ring
  glass:    'rgba(255, 255, 255, 0.08)',  // Glass Card edge catch
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────

export const shadow = {
  sm:   '0 1px 3px rgba(0, 0, 0, 0.3)',
  md:   '0 4px 8px rgba(0, 0, 0, 0.35)',
  lg:   '0 10px 20px rgba(0, 0, 0, 0.4)',
  xl:   '0 20px 40px rgba(0, 0, 0, 0.45)',
  glow: (color: string) => `0 0 12px ${color}30`,
  glassInset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────
// Brand Guide: Cormorant Garamond (display) + Jost (body)
// No bold anywhere. Light weights only.

export const font = {
  display: "'Cormorant Garamond', Georgia, serif",  // Display — editorial, elegant
  body:    "'Jost', system-ui, -apple-system, sans-serif",  // Body — geometric, modern
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
  // Backward compat aliases
  sans:    "'Jost', system-ui, -apple-system, sans-serif",
  serif:   "'Cormorant Garamond', Georgia, serif",
} as const;

export const fontSize = {
  xs:   '10px',
  sm:   '12px',
  base: '13px',
  md:   '14px',
  lg:   '16px',
  xl:   '18px',
  '2xl':'22px',
  '3xl':'28px',
  '4xl':'36px',
} as const;

export const fontWeight = {
  light:    300,  // Primary weight for Cormorant headlines
  normal:   400,  // Cormorant section titles, Jost body
  medium:   500,  // Jost labels
  semibold: 500,  // Mapped to medium — no bold in brand
  bold:     500,  // Mapped to medium — no bold in brand
  black:    500,  // Mapped to medium — no bold in brand
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────

export const space = {
  xs:   '4px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  '2xl':'32px',
  '3xl':'40px',
  '4xl':'56px',
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────

export const radius = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  full: '9999px',
} as const;

// ─── Transitions ──────────────────────────────────────────────────────────

export const transition = {
  fast:   'all 0.15s ease',
  normal: 'all 0.25s ease',
  smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─── Risk Level Colors (Watch) ────────────────────────────────────────────

export const risk = {
  critical: { color: '#D94F4F', bg: 'rgba(217, 79, 79, 0.12)', label: 'CRITICAL' },
  high:     { color: '#E87040', bg: 'rgba(232, 112, 64, 0.12)', label: 'HIGH' },
  elevated: { color: '#E8A838', bg: 'rgba(232, 168, 56, 0.12)', label: 'ELEVATED' },
  low:      { color: '#4A9B6E', bg: 'rgba(74, 155, 110, 0.12)', label: 'LOW' },
  clear:    { color: '#7A8FA8', bg: 'rgba(122, 143, 168, 0.12)', label: 'CLEAR' },
} as const;

// ─── Chart Colors ─────────────────────────────────────────────────────────

export const chart = {
  primary:   '#C9A54E',  // Warm Gold
  secondary: '#5B8DB8',  // Steel Blue
  tertiary:  '#8B7EC8',  // Soft violet
  quaternary:'#4A9B6E',  // Sage Green
  danger:    '#D94F4F',  // Ember Red
  muted:     '#5A6F88',
  grid:      'rgba(255, 255, 255, 0.06)',
  bars: ['#C9A54E', '#5B8DB8', '#8B7EC8', '#4A9B6E', '#D4B978', '#D94F4F', '#5B9B8E', '#C97A8E'],
} as const;

// ─── Convenience: Flat "C" object for quick access (backward compat) ─────

export const C = {
  // Backgrounds
  bg: bg.app,
  white: bg.card,
  subtle: bg.subtle,

  // Text
  deep: text.primary,
  rock: '#0F1D35',
  mid: text.secondary,
  light: text.muted,
  muted: text.light,

  // Brand
  brass: brand.gold,
  gold: brand.gold,
  navy: brand.navy,

  // Borders
  chalk: border.light,
  border: border.light,

  // Status
  green: status.green,
  greenBg: status.greenBg,
  red: status.red,
  redBg: status.redBg,
  amber: status.amber,
  amberBg: status.amberBg,
  blue: status.blue,
  blueBg: status.blueBg,

  // Typography
  fontSans: font.body,
  fontSerif: font.display,
  fontMono: font.mono,
} as const;
