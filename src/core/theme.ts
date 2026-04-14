/**
 * Slate — Unified Design System
 * Source of truth: Slate Redesign Brief (April 2026)
 *
 * Creative directive: "Build Slate so it feels less like software someone
 * designed, and more like clarity itself appearing on the screen."
 *
 * Rules:
 * - 80% neutral, 15% blue family, 5% semantic color
 * - Inter only inside the product (Playfair Display for splash brand mark ONLY)
 * - White surfaces, soft borders, 16px radius cards
 * - NO gold anywhere in the product UI
 * - NO saturated gradients behind content
 * - NO glows except optional subtle focus halo on active inputs
 * - NO serif in product navigation, metrics, tables, or actions
 * - Whitespace is a feature — 30–40% of every screen should breathe
 */

// ─── Brand (splash/marketing only — never used inside product UI) ─────────
export const brand = {
  navy:      '#0A1628',
  gold:      '#C9A54E',
  mutedGold: '#D4B978',
  ivory:     '#E8DCC8',
  white:     '#F0F2F5',
  iceBlue:   '#B8C9DB',
} as const;

// ─── Backgrounds ──────────────────────────────────────────────────────────
export const bg = {
  app:          '#F6F8FB',
  sidebar:      '#FFFFFF',
  sidebarGlass: '#FFFFFF',
  header:       '#FFFFFF',
  card:         '#FFFFFF',
  cardGlass:    '#FFFFFF',
  hover:        'rgba(79, 124, 255, 0.04)',
  selected:     'rgba(79, 124, 255, 0.08)',
  subtle:       '#F1F4F8',
  surface:      '#F6F8FB',
  gradient:     'linear-gradient(180deg, #F6F8FB 0%, #F1F4F8 100%)',
  blueSoft:     '#EAF0FF',
  dark:         '#1C2333',
  darkCard:     '#242D3E',
  darkHover:    'rgba(255, 255, 255, 0.04)',
} as const;

// ─── Text Colors ──────────────────────────────────────────────────────────
export const text = {
  primary:       '#0F1728',
  secondary:     '#4C5A70',
  muted:         '#7A8699',
  light:         '#9CA3AF',
  inverse:       '#F9FAFB',
  accent:        '#4F7CFF',
  gold:          '#C9A54E',
  ivory:         '#E8DCC8',
  link:          '#4F7CFF',
  darkPrimary:   '#F1F5F9',
  darkSecondary: '#94A3B8',
  darkMuted:     '#64748B',
} as const;

// ─── Semantic / Status Colors ─────────────────────────────────────────────
export const status = {
  green:         '#17B26A',
  greenBg:       'rgba(23, 178, 106, 0.08)',
  greenBorder:   'rgba(23, 178, 106, 0.20)',
  red:           '#E5484D',
  redBg:         'rgba(229, 72, 77, 0.08)',
  redBorder:     'rgba(229, 72, 77, 0.20)',
  amber:         '#F59E0B',
  amberBg:       'rgba(245, 158, 11, 0.08)',
  amberBorder:   'rgba(245, 158, 11, 0.20)',
  blue:          '#4F7CFF',
  blueBg:        'rgba(79, 124, 255, 0.08)',
  blueBorder:    'rgba(79, 124, 255, 0.20)',
  gray:          '#7A8699',
  grayBg:        'rgba(122, 134, 153, 0.08)',
  grayBorder:    'rgba(122, 134, 153, 0.20)',
  neutral:       '#7A8699',
  neutralBg:     'rgba(122, 134, 153, 0.08)',
  neutralBorder: 'rgba(122, 134, 153, 0.20)',
} as const;

// ─── Module Accent Colors ─────────────────────────────────────────────────
export const modules = {
  dashboard: '#4F7CFF',
  briefing:  '#4F7CFF',
  watch:     '#E5484D',
  signal:    '#8B7CFF',
  ledger:    '#17B26A',
  scholar:   '#4F7CFF',
  grounds:   '#F59E0B',
  shield:    '#E5484D',
  fund:      '#17B26A',
  civic:     '#5ED3F3',
  reports:   '#7A8699',
  draft:     '#7A8699',
  datahub:   '#17B26A',
} as const;

// ─── Borders ──────────────────────────────────────────────────────────────
export const border = {
  light:       '#E6EBF2',
  medium:      '#D5DDE8',
  dark:        '#B8C4D4',
  focus:       'rgba(79, 124, 255, 0.45)',
  glass:       '#E6EBF2',
  chromLight:  '#E6EBF2',
  chromMedium: '#D5DDE8',
} as const;

// ─── Shadows — soft ambient only ─────────────────────────────────────────
export const shadow = {
  sm:         '0 1px 2px rgba(16, 24, 40, 0.04)',
  md:         '0 6px 18px rgba(16, 24, 40, 0.06)',
  lg:         '0 12px 28px rgba(16, 24, 40, 0.08)',
  xl:         '0 16px 40px rgba(16, 24, 40, 0.10)',
  glow:       (_color: string) => 'none',
  glassInset: 'none',
} as const;

// ─── Typography — Inter only in product ──────────────────────────────────
export const font = {
  display: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  body:    "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', monospace",
  sans:    "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  serif:   "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
} as const;

export const fontSize = {
  xs:    '11px',
  sm:    '12px',
  base:  '13px',
  md:    '14px',
  lg:    '16px',
  xl:    '18px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '28px',
  '5xl': '32px',
  '6xl': '40px',
} as const;

export const fontWeight = {
  light:    300,
  normal:   400,
  medium:   500,
  semibold: 600,
  bold:     700,
  black:    800,
} as const;

// ─── Spacing — 8-point grid ───────────────────────────────────────────────
export const space = {
  '1':  '4px',
  '2':  '8px',
  '3':  '12px',
  '4':  '16px',
  '5':  '24px',
  '6':  '32px',
  '7':  '40px',
  '8':  '48px',
  '9':  '64px',
  '10': '80px',
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
  sm:   '12px',
  md:   '16px',
  lg:   '20px',
  xl:   '20px',
  full: '9999px',
} as const;

// ─── Transitions ──────────────────────────────────────────────────────────
export const transition = {
  fast:   'all 0.12s ease',
  normal: 'all 0.20s ease-out',
  smooth: 'all 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─── Risk Level Colors ────────────────────────────────────────────────────
export const risk = {
  critical: { color: '#E5484D', bg: 'rgba(229, 72, 77, 0.08)', label: 'CRITICAL' },
  high:     { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', label: 'HIGH' },
  elevated: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.06)', label: 'ELEVATED' },
  low:      { color: '#17B26A', bg: 'rgba(23, 178, 106, 0.08)', label: 'LOW' },
  clear:    { color: '#7A8699', bg: 'rgba(122, 134, 153, 0.08)', label: 'CLEAR' },
} as const;

// ─── Chart Colors ─────────────────────────────────────────────────────────
export const chart = {
  primary:    '#4F7CFF',
  secondary:  '#17B26A',
  tertiary:   '#8B7CFF',
  quaternary: '#F59E0B',
  danger:     '#E5484D',
  muted:      '#7A8699',
  grid:       'rgba(0, 0, 0, 0.04)',
  bars: ['#4F7CFF', '#17B26A', '#8B7CFF', '#F59E0B', '#5ED3F3', '#E5484D'],
} as const;

// ─── Convenience: Flat "C" object (backward compat) ──────────────────────
export const C = {
  bg:        bg.app,
  white:     bg.card,
  subtle:    bg.subtle,
  dark:      bg.dark,
  deep:      text.primary,
  rock:      '#0F1728',
  mid:       text.secondary,
  light:     text.muted,
  muted:     text.light,
  brass:     brand.gold,
  gold:      brand.gold,
  navy:      brand.navy,
  chalk:     border.light,
  border:    border.light,
  green:     status.green,
  greenBg:   status.greenBg,
  red:       status.red,
  redBg:     status.redBg,
  amber:     status.amber,
  amberBg:   status.amberBg,
  blue:      status.blue,
  blueBg:    status.blueBg,
  fontSans:  font.body,
  fontSerif: font.body,
  fontMono:  font.mono,
} as const;
