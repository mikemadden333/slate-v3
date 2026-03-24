/**
 * Slate v3 — Unified Design System
 * MEA Brand Guide v1.0 — "Deep navy frame. Light content workspace. Warm gold accents."
 * Split approach: dark sidebar/topbar chrome + light content area for maximum readability.
 * Every color, spacing, and typography token lives here.
 * No module defines its own colors. Ever.
 */

// ─── Brand Colors ─────────────────────────────────────────────────────────

export const brand = {
  navy:     '#0A1628',   // Deep Navy — sidebar, topbar, splash
  gold:     '#C9A54E',   // Warm Gold — headlines, accent lines, buttons
  mutedGold:'#D4B978',   // Muted Gold — secondary buttons, hover
  ivory:    '#E8DCC8',   // Soft Ivory — pull quotes, warm emphasis
  white:    '#F0F2F5',   // Signal White — headlines on dark surfaces
  iceBlue:  '#B8C9DB',   // Ice Blue — labels on dark surfaces
  slateBlue:'#2A3F5F',   // Slate Blue — reserved for dark chrome accents
} as const;

// ─── Backgrounds ──────────────────────────────────────────────────────────

export const bg = {
  // Dark chrome (sidebar, topbar, splash)
  app:      '#F5F3EF',   // Warm off-white — main content area
  sidebar:  '#0A1628',   // Deep Navy — sidebar frame
  sidebarGlass: 'linear-gradient(180deg, #122040 0%, #0E1A32 30%, #0A1628 70%, #081220 100%)',
  header:   '#0A1628',   // Deep Navy — topbar
  // Light content area
  card:     '#FFFFFF',   // White cards on warm off-white
  cardGlass:'#FFFFFF',   // White cards (no glass needed on light bg)
  hover:    'rgba(0, 0, 0, 0.04)',   // Subtle hover on light bg
  selected: 'rgba(201, 165, 78, 0.10)',
  subtle:   '#EDE9E3',   // Slightly darker than off-white for sections
  gradient: 'linear-gradient(180deg, #F5F3EF 0%, #EDE9E3 100%)',
  surface:  '#F5F3EF',   // Light surface fallback
} as const;

// ─── Text Colors ──────────────────────────────────────────────────────────

export const text = {
  primary:   '#1A1A2E',  // Dark charcoal — headlines, critical text on light bg
  secondary: '#4A5568',  // Medium gray — body text, labels on light bg
  muted:     '#718096',  // Muted gray — secondary info on light bg
  light:     '#A0AEC0',  // Subdued — tertiary info on light bg
  inverse:   '#F0F2F5',  // Signal White — text on dark chrome
  accent:    '#C9A54E',  // Warm Gold
  ivory:     '#E8DCC8',  // Soft Ivory — pull quotes on dark bg
  link:      '#2B6CB0',  // Deeper blue for links on light bg
} as const;

// ─── Semantic / Functional Colors (Slate Product Only) ────────────────────

export const status = {
  // Positive — Sage Green (slightly deeper for light bg readability)
  green:     '#2F855A',
  greenBg:   'rgba(47, 133, 90, 0.08)',
  greenBorder: 'rgba(47, 133, 90, 0.20)',

  // Negative — Ember Red
  red:       '#C53030',
  redBg:     'rgba(197, 48, 48, 0.08)',
  redBorder: 'rgba(197, 48, 48, 0.20)',

  // Warning — Amber (slightly deeper for light bg)
  amber:     '#C07C1E',
  amberBg:   'rgba(192, 124, 30, 0.08)',
  amberBorder: 'rgba(192, 124, 30, 0.20)',

  // Info — Steel Blue
  blue:      '#2B6CB0',
  blueBg:    'rgba(43, 108, 176, 0.08)',
  blueBorder: 'rgba(43, 108, 176, 0.20)',

  // Neutral
  gray:      '#718096',
  grayBg:    'rgba(113, 128, 150, 0.08)',
  grayBorder: 'rgba(113, 128, 150, 0.20)',
} as const;

// ─── Module Accent Colors ─────────────────────────────────────────────────
// Slightly deeper for readability on light backgrounds

export const modules = {
  watch:    '#2F855A',  // Sage Green — safety, vigilance
  ledger:   '#2B6CB0',  // Steel Blue — financial clarity
  scholar:  '#6B46C1',  // Violet — academic, enrollment
  shield:   '#C07C1E',  // Amber — risk, protection
  fund:     '#2B6CB0',  // Steel Blue — fundraising, growth
  grounds:  '#5A6F88',  // Muted — facilities, physical
  civic:    '#B83280',  // Rose — public affairs
  signal:   '#B7931E',  // Deep Gold — network health
  draft:    '#4C51BF',  // Indigo — communications
  reports:  '#2C7A7B',  // Teal — reporting
  briefing: '#C9A54E',  // Warm Gold — executive intelligence
  datahub:  '#2F855A',  // Sage Green — data management
} as const;

// ─── Borders & Dividers ──────────────────────────────────────────────────

export const border = {
  light:    'rgba(0, 0, 0, 0.06)',    // Subtle border on light bg
  medium:   'rgba(0, 0, 0, 0.10)',
  dark:     'rgba(0, 0, 0, 0.15)',
  focus:    '#C9A54E',  // Gold focus ring
  glass:    'rgba(0, 0, 0, 0.06)',    // Card edge on light bg
  // Dark chrome borders (sidebar, topbar)
  chromLight: 'rgba(255, 255, 255, 0.08)',
  chromMedium: 'rgba(255, 255, 255, 0.12)',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────

export const shadow = {
  sm:   '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
  md:   '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)',
  lg:   '0 10px 15px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.04)',
  xl:   '0 20px 25px rgba(0, 0, 0, 0.08), 0 10px 10px rgba(0, 0, 0, 0.04)',
  glow: (color: string) => `0 0 12px ${color}20`,
  glassInset: 'none',  // No inset glow needed on light bg
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
  critical: { color: '#C53030', bg: 'rgba(197, 48, 48, 0.08)', label: 'CRITICAL' },
  high:     { color: '#C05621', bg: 'rgba(192, 86, 33, 0.08)', label: 'HIGH' },
  elevated: { color: '#C07C1E', bg: 'rgba(192, 124, 30, 0.08)', label: 'ELEVATED' },
  low:      { color: '#2F855A', bg: 'rgba(47, 133, 90, 0.08)', label: 'LOW' },
  clear:    { color: '#718096', bg: 'rgba(113, 128, 150, 0.08)', label: 'CLEAR' },
} as const;

// ─── Chart Colors ─────────────────────────────────────────────────────────

export const chart = {
  primary:   '#C9A54E',  // Warm Gold
  secondary: '#2B6CB0',  // Steel Blue
  tertiary:  '#6B46C1',  // Violet
  quaternary:'#2F855A',  // Sage Green
  danger:    '#C53030',  // Ember Red
  muted:     '#A0AEC0',
  grid:      'rgba(0, 0, 0, 0.06)',  // Light grid lines
  bars: ['#C9A54E', '#2B6CB0', '#6B46C1', '#2F855A', '#B7931E', '#C53030', '#2C7A7B', '#B83280'],
} as const;

// ─── Convenience: Flat "C" object for quick access (backward compat) ─────

export const C = {
  // Backgrounds
  bg: bg.app,
  white: bg.card,
  subtle: bg.subtle,

  // Text
  deep: text.primary,
  rock: '#1A1A2E',
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
