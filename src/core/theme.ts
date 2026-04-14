/**
 * Slate — Unified Design System
 * Source of truth: Slate Redesign Brief (April 2026)
 *
 * Creative directive: "Build Slate so it feels less like software someone
 * designed, and more like clarity itself appearing on the screen."
 *
 * 3-Surface System:
 *   Shell  (sidebar + topbar) — deep slate #1A2332
 *   Canvas (page background)  — warm off-white #EEF0F4
 *   Cards  (content surfaces) — pure white #FFFFFF
 *
 * Rules:
 * - 80% neutral, 15% blue family, 5% semantic color
 * - Inter only inside the product
 * - White cards on warm canvas on dark shell
 * - NO gold anywhere in the product UI
 * - NO saturated gradients behind content
 * - NO glows except optional subtle focus halo on active inputs
 * - NO serif in product navigation, metrics, tables, or actions
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

// ─── Backgrounds — 3-surface system ──────────────────────────────────────
export const bg = {
  // Shell — sidebar + topbar (deep slate, not navy)
  sidebar:      '#1A2332',
  sidebarGlass: '#1E2A3D',
  header:       '#1A2332',
  // Canvas — the page background (warm, not glaring white)
  app:          '#EEF0F4',
  surface:      '#EEF0F4',
  subtle:       '#E4E7ED',
  gradient:     'linear-gradient(180deg, #EEF0F4 0%, #E4E7ED 100%)',
  // Cards — pure white pops off the warm canvas
  card:         '#FFFFFF',
  cardGlass:    '#FFFFFF',
  // Interaction states
  hover:        'rgba(79, 124, 255, 0.06)',
  selected:     'rgba(79, 124, 255, 0.10)',
  blueSoft:     '#EAF0FF',
  // Dark surfaces (for shell-level elements)
  dark:         '#1A2332',
  darkCard:     '#243044',
  darkHover:    'rgba(255, 255, 255, 0.06)',
  darkSelected: 'rgba(255, 255, 255, 0.12)',
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
  light:       '#E2E7EF',
  medium:      '#CDD4DF',
  dark:        '#B0BCC9',
  focus:       'rgba(79, 124, 255, 0.45)',
  glass:       '#E2E7EF',
  chromLight:  '#E2E7EF',
  chromMedium: '#CDD4DF',
} as const;

// ─── Shadows — crisp lift for white cards on warm canvas ──────────────────
export const shadow = {
  sm:         '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
  md:         '0 4px 12px rgba(16, 24, 40, 0.08), 0 2px 4px rgba(16, 24, 40, 0.04)',
  lg:         '0 8px 24px rgba(16, 24, 40, 0.10), 0 4px 8px rgba(16, 24, 40, 0.06)',
  xl:         '0 16px 40px rgba(16, 24, 40, 0.12), 0 8px 16px rgba(16, 24, 40, 0.08)',
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
  sm:   '10px',
  md:   '14px',
  lg:   '18px',
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
  grid:       'rgba(0, 0, 0, 0.05)',
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
