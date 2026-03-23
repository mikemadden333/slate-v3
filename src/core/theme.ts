/**
 * Slate v3 — Unified Design System
 * Every color, spacing, and typography token lives here.
 * No module defines its own colors. Ever.
 */

// ─── Brand Colors ─────────────────────────────────────────────────────────

export const brand = {
  navy:     '#151C28',   // Rich dark slate — deep charcoal with cool blue undertone
  gold:     '#F0B429',
  brass:    '#B79145',
  white:    '#FFFFFF',
  parchment:'#F7F5F1',
} as const;

// ─── Backgrounds ──────────────────────────────────────────────────────────

export const bg = {
  app:      '#F7F5F1',
  card:     '#FFFFFF',
  sidebar:  '#151C28',   // Rich dark slate
  sidebarGlass: 'linear-gradient(180deg, #1E2735 0%, #171F2C 30%, #131A25 70%, #101620 100%)', // Glossy glass gradient — highlight at top fading to deep
  header:   '#1E2735',   // Slightly lighter slate for top bar
  hover:    '#F0EDE6',
  selected: '#FEF9E7',
  subtle:   '#F5F3EF',
  gradient: 'linear-gradient(180deg, #F7F5F1 0%, #F0EDE6 100%)',
} as const;

// ─── Text Colors ──────────────────────────────────────────────────────────

export const text = {
  primary:   '#121315',
  secondary: '#2D3748',
  muted:     '#6B7280',
  light:     '#9CA3AF',
  inverse:   '#FFFFFF',
  accent:    '#B79145',
  link:      '#0EA5E9',
} as const;

// ─── Semantic Colors ──────────────────────────────────────────────────────

export const status = {
  // Positive
  green:     '#059669',
  greenBg:   '#ECFDF5',
  greenBorder: '#A7F3D0',

  // Negative
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  redBorder: '#FECACA',

  // Warning
  amber:     '#D97706',
  amberBg:   '#FFFBEB',
  amberBorder: '#FDE68A',

  // Info
  blue:      '#0EA5E9',
  blueBg:    '#EFF6FF',
  blueBorder: '#BFDBFE',

  // Neutral
  gray:      '#6B7280',
  grayBg:    '#F3F4F6',
  grayBorder: '#E5E7EB',
} as const;

// ─── Module Accent Colors ─────────────────────────────────────────────────

export const modules = {
  watch:    '#10B981',  // Emerald — safety, vigilance
  ledger:   '#0EA5E9',  // Sky blue — financial clarity
  scholar:  '#8B5CF6',  // Violet — academic, enrollment
  shield:   '#F59E0B',  // Amber — risk, protection
  fund:     '#06B6D4',  // Cyan — fundraising, growth
  grounds:  '#78716C',  // Stone — facilities, physical
  civic:    '#EC4899',  // Pink — public affairs, advocacy
  signal:   '#F97316',  // Orange — network health
  draft:    '#6366F1',  // Indigo — communications
  reports:  '#14B8A6',  // Teal — reporting
  briefing: '#B79145',  // Brass — executive intelligence
  datahub:  '#059669',  // Green — data management
} as const;

// ─── Borders & Dividers ──────────────────────────────────────────────────

export const border = {
  light:    '#E7E2D8',
  medium:   '#D1CBC0',
  dark:     '#9CA3AF',
  focus:    '#B79145',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────

export const shadow = {
  sm:   '0 1px 2px rgba(0, 0, 0, 0.05)',
  md:   '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  lg:   '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
  xl:   '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  glow: (color: string) => `0 0 12px ${color}30`,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────

export const font = {
  sans:    "'Inter', system-ui, -apple-system, sans-serif",
  serif:   "'Playfair Display', Georgia, serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
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
  normal: 400,
  medium: 500,
  semibold: 600,
  bold:   700,
  black:  800,
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
  critical: { color: '#DC2626', bg: '#FEF2F2', label: 'CRITICAL' },
  high:     { color: '#EA580C', bg: '#FFF7ED', label: 'HIGH' },
  elevated: { color: '#D97706', bg: '#FFFBEB', label: 'ELEVATED' },
  low:      { color: '#059669', bg: '#ECFDF5', label: 'LOW' },
  clear:    { color: '#6B7280', bg: '#F3F4F6', label: 'CLEAR' },
} as const;

// ─── Chart Colors ─────────────────────────────────────────────────────────

export const chart = {
  primary:   '#F0B429',
  secondary: '#0EA5E9',
  tertiary:  '#8B5CF6',
  quaternary:'#10B981',
  danger:    '#EF4444',
  muted:     '#94A3B8',
  grid:      '#E8EDF2',
  bars: ['#F0B429', '#0EA5E9', '#8B5CF6', '#10B981', '#F97316', '#EF4444', '#06B6D4', '#EC4899'],
} as const;

// ─── Convenience: Flat "C" object for quick access (backward compat) ─────

export const C = {
  // Backgrounds
  bg: bg.app,
  white: bg.card,
  subtle: bg.subtle,

  // Text
  deep: text.primary,
  rock: '#1E2735',
  mid: text.secondary,
  light: text.muted,
  muted: text.light,

  // Brand
  brass: brand.brass,
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
  fontSans: font.sans,
  fontSerif: font.serif,
  fontMono: font.mono,
} as const;
