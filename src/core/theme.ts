/**
 * Slate v4 — Unified Design System
 * Slate Redesign Brief v4.0 — "Clarity itself appearing on the screen."
 *
 * Design principles:
 * - 80% neutral, 15% blue family, 5% semantic color
 * - Inter only inside the product (Playfair Display for splash/brand mark only)
 * - White surfaces, soft borders, 16px radius cards
 * - No colored card borders. No gold inside the product UI.
 * - Whitespace is a feature — 30-40% of every screen should breathe
 * - Motion: glide, not bounce. 120ms hover, 200ms transitions.
 *
 * Every color, spacing, and typography token lives here.
 * No module defines its own colors. Ever.
 */

// ─── Brand Colors ─────────────────────────────────────────────────────────
export const brand = {
  navy:      '#0A1628',   // Deep Navy — splash background only
  gold:      '#C9A54E',   // Warm Gold — splash accent, brand mark period only
  mutedGold: '#D4B978',   // Muted Gold — secondary brand use
  ivory:     '#E8DCC8',   // Soft Ivory — splash pull quotes
  white:     '#F0F2F5',   // Signal White — headlines on dark surfaces
  iceBlue:   '#B8C9DB',   // Ice Blue — labels on dark surfaces
} as const;

// ─── Backgrounds ──────────────────────────────────────────────────────────
export const bg = {
  // App shell
  app:      '#F6F8FB',   // Primary content canvas — cool near-white
  sidebar:  '#111827',   // Deep charcoal — sidebar
  sidebarGlass: 'linear-gradient(180deg, #1a2234 0%, #111827 40%, #0d1420 100%)',
  header:   '#111827',   // Deep charcoal — topbar (matches sidebar)
  // Content surfaces
  card:     '#FFFFFF',   // Pure white cards on cool canvas
  cardGlass:'#FFFFFF',
  hover:    'rgba(79, 124, 255, 0.04)',
  selected: 'rgba(79, 124, 255, 0.08)',
  subtle:   '#EEF1F6',   // Section dividers, subtle backgrounds
  gradient: 'linear-gradient(180deg, #F6F8FB 0%, #EEF1F6 100%)',
  surface:  '#F6F8FB',
  // Dark surfaces (Watch instrument mode)
  dark:     '#1C2333',
  darkCard: '#242D3E',
  darkHover:'rgba(255, 255, 255, 0.04)',
} as const;

// ─── Text Colors ──────────────────────────────────────────────────────────
export const text = {
  primary:   '#111827',  // Near-black — headlines, critical text
  secondary: '#374151',  // Dark gray — body text, labels
  muted:     '#6B7280',  // Medium gray — secondary info
  light:     '#9CA3AF',  // Light gray — tertiary info
  inverse:   '#F9FAFB',  // Near-white — text on dark surfaces
  accent:    '#4F7CFF',  // Blue accent — links, active states
  gold:      '#C9A54E',  // Gold — brand mark only
  ivory:     '#E8DCC8',  // Soft Ivory — pull quotes on dark bg
  link:      '#2563EB',  // Blue for links
  // Dark surface text
  darkPrimary:   '#F1F5F9',
  darkSecondary: '#94A3B8',
  darkMuted:     '#64748B',
} as const;

// ─── Semantic / Status Colors ─────────────────────────────────────────────
export const status = {
  // Positive — Green
  green:        '#16A34A',
  greenBg:      'rgba(22, 163, 74, 0.08)',
  greenBorder:  'rgba(22, 163, 74, 0.20)',
  // Negative — Red
  red:          '#DC2626',
  redBg:        'rgba(220, 38, 38, 0.08)',
  redBorder:    'rgba(220, 38, 38, 0.20)',
  // Warning — Amber
  amber:        '#D97706',
  amberBg:      'rgba(217, 119, 6, 0.08)',
  amberBorder:  'rgba(217, 119, 6, 0.20)',
  // Info — Blue
  blue:         '#2563EB',
  blueBg:       'rgba(37, 99, 235, 0.08)',
  blueBorder:   'rgba(37, 99, 235, 0.20)',
  // Neutral
  gray:         '#6B7280',
  grayBg:       'rgba(107, 114, 128, 0.08)',
  grayBorder:   'rgba(107, 114, 128, 0.20)',
  // Backward compat aliases
  neutral:      '#6B7280',
  neutralBg:    'rgba(107, 114, 128, 0.08)',
  neutralBorder:'rgba(107, 114, 128, 0.20)',
} as const;

// ─── Module Accent Colors ─────────────────────────────────────────────────
export const modules = {
  dashboard: '#4F7CFF',  // Blue
  briefing:  '#4F7CFF',  // Blue
  watch:     '#DC2626',  // Red — safety/urgency
  signal:    '#7C3AED',  // Violet
  ledger:    '#16A34A',  // Green — finance
  scholar:   '#2563EB',  // Blue — academics
  grounds:   '#D97706',  // Amber — facilities
  shield:    '#DC2626',  // Red — compliance
  fund:      '#059669',  // Emerald — fundraising
  civic:     '#0891B2',  // Cyan — civic
  reports:   '#6B7280',  // Gray
  draft:     '#6B7280',  // Gray
  datahub:   '#16A34A',  // Green
} as const;

// ─── Borders ──────────────────────────────────────────────────────────────
export const border = {
  light:       '#E6EBF2',
  medium:      '#D1D9E6',
  dark:        '#B8C4D4',
  focus:       'rgba(79, 124, 255, 0.45)',
  glass:       '#E6EBF2',
  // Dark chrome borders (sidebar, topbar)
  chromLight:  'rgba(255, 255, 255, 0.07)',
  chromMedium: 'rgba(255, 255, 255, 0.12)',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────
export const shadow = {
  sm:   '0 1px 2px rgba(16, 24, 40, 0.05)',
  md:   '0 2px 8px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.04)',
  lg:   '0 8px 24px rgba(16, 24, 40, 0.08), 0 2px 8px rgba(16, 24, 40, 0.04)',
  xl:   '0 16px 40px rgba(16, 24, 40, 0.10), 0 4px 12px rgba(16, 24, 40, 0.06)',
  glow: (color: string) => `0 0 0 3px ${color}`,
  glassInset: 'none',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────
// v4: Inter only inside the product.
// Playfair Display reserved for splash screen brand mark ONLY.
// JetBrains Mono for numbers, timestamps, codes.
export const font = {
  display: "'Playfair Display', Georgia, serif",
  body:    "'Inter', system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', monospace",
  sans:    "'Inter', system-ui, -apple-system, sans-serif",
  serif:   "'Playfair Display', Georgia, serif",
} as const;

export const fontSize = {
  xs:   '11px',
  sm:   '12px',
  base: '14px',
  md:   '15px',
  lg:   '16px',
  xl:   '18px',
  '2xl':'22px',
  '3xl':'28px',
  '4xl':'36px',
} as const;

export const fontWeight = {
  light:    300,
  normal:   400,
  medium:   500,
  semibold: 600,
  bold:     700,
  black:    800,
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
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '16px',
  full: '9999px',
} as const;

// ─── Transitions ──────────────────────────────────────────────────────────
export const transition = {
  fast:   'all 0.12s ease',
  normal: 'all 0.20s ease-out',
  smooth: 'all 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─── Risk Level Colors (Watch) ────────────────────────────────────────────
export const risk = {
  critical: { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)', label: 'CRITICAL' },
  high:     { color: '#EA580C', bg: 'rgba(234, 88, 12, 0.08)', label: 'HIGH' },
  elevated: { color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)', label: 'ELEVATED' },
  low:      { color: '#16A34A', bg: 'rgba(22, 163, 74, 0.08)', label: 'LOW' },
  clear:    { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.08)', label: 'CLEAR' },
} as const;

// ─── Chart Colors ─────────────────────────────────────────────────────────
export const chart = {
  primary:    '#4F7CFF',
  secondary:  '#16A34A',
  tertiary:   '#7C3AED',
  quaternary: '#D97706',
  danger:     '#DC2626',
  muted:      '#9CA3AF',
  grid:       'rgba(0, 0, 0, 0.05)',
  bars: ['#4F7CFF', '#16A34A', '#7C3AED', '#D97706', '#2563EB', '#DC2626', '#059669', '#0891B2'],
} as const;

// ─── Convenience: Flat "C" object for quick access (backward compat) ─────
export const C = {
  bg: bg.app,
  white: bg.card,
  subtle: bg.subtle,
  dark: bg.dark,
  deep: text.primary,
  rock: '#111827',
  mid: text.secondary,
  light: text.muted,
  muted: text.light,
  brass: brand.gold,
  gold: brand.gold,
  navy: brand.navy,
  chalk: border.light,
  border: border.light,
  green: status.green,
  greenBg: status.greenBg,
  red: status.red,
  redBg: status.redBg,
  amber: status.amber,
  amberBg: status.amberBg,
  blue: status.blue,
  blueBg: status.blueBg,
  fontSans: font.body,
  fontSerif: font.display,
  fontMono: font.mono,
} as const;
