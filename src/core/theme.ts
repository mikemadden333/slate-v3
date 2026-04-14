/**
 * Slate — Unified Design System
 * Final palette: Deep Navy shell · Cream canvas · White cards · Gold accents
 *
 * Creative directive: "Build Slate so it feels less like software someone
 * designed, and more like clarity itself appearing on the screen."
 *
 * 3-Surface System:
 *   Shell  (sidebar + topbar) — deep navy #0B1629
 *   Canvas (page background)  — warm cream #F5F0E8
 *   Cards  (content surfaces) — pure white #FFFFFF
 *
 * Rules:
 * - Navy shell, cream canvas, white cards
 * - Gold (#D4AF37) as the single accent — used sparingly
 * - Inter only inside the product
 * - NO slate gray anywhere
 * - NO saturated gradients behind content
 */

// ─── Brand ────────────────────────────────────────────────────────────────
export const brand = {
  navy:      '#0B1629',
  navyLight: '#142038',
  navyMid:   '#1C2E4A',
  gold:      '#D4AF37',
  goldLight: '#E8C84A',
  goldMuted: '#B8962E',
  ivory:     '#F5F0E8',
  cream:     '#EDE8DC',
  white:     '#FFFFFF',
} as const;

// ─── Backgrounds — 3-surface system ──────────────────────────────────────
export const bg = {
  // Shell — sidebar + topbar (deep navy)
  sidebar:      '#0B1629',
  sidebarGlass: '#142038',
  header:       '#0B1629',
  // Canvas — warm cream (not glaring white)
  app:          '#F5F0E8',
  surface:      '#F5F0E8',
  subtle:       '#EDE8DC',
  gradient:     'linear-gradient(180deg, #F5F0E8 0%, #EDE8DC 100%)',
  // Cards — pure white pops off the cream canvas
  card:         '#FFFFFF',
  cardGlass:    '#FFFFFF',
  // Interaction states
  hover:        'rgba(212, 175, 55, 0.06)',
  selected:     'rgba(212, 175, 55, 0.10)',
  blueSoft:     '#EAF0FF',
  // Dark surfaces (for shell-level elements only)
  dark:         '#0B1629',
  darkCard:     '#142038',
  darkHover:    'rgba(255, 255, 255, 0.06)',
  darkSelected: 'rgba(255, 255, 255, 0.12)',
} as const;

// ─── Text Colors ──────────────────────────────────────────────────────────
export const text = {
  primary:       '#0B1629',
  secondary:     '#3D4F6B',
  muted:         '#6B7A94',
  light:         '#9AA5B8',
  inverse:       '#F5F0E8',
  accent:        '#D4AF37',
  gold:          '#D4AF37',
  ivory:         '#F5F0E8',
  link:          '#2563EB',
  darkPrimary:   '#F5F0E8',
  darkSecondary: '#B8C4D4',
  darkMuted:     '#7A8FAA',
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
  blue:          '#2563EB',
  blueBg:        'rgba(37, 99, 235, 0.08)',
  blueBorder:    'rgba(37, 99, 235, 0.20)',
  gray:          '#6B7A94',
  grayBg:        'rgba(107, 122, 148, 0.08)',
  grayBorder:    'rgba(107, 122, 148, 0.20)',
  neutral:       '#6B7A94',
  neutralBg:     'rgba(107, 122, 148, 0.08)',
  neutralBorder: 'rgba(107, 122, 148, 0.20)',
} as const;

// ─── Module Accent Colors ─────────────────────────────────────────────────
export const modules = {
  dashboard: '#2563EB',
  briefing:  '#2563EB',
  watch:     '#E5484D',
  signal:    '#C9A84C',
  ledger:    '#17B26A',
  scholar:   '#2563EB',
  grounds:   '#F59E0B',
  shield:    '#E5484D',
  fund:      '#17B26A',
  civic:     '#0891B2',
  reports:   '#6B7A94',
  draft:     '#6B7A94',
  datahub:   '#17B26A',
  roster:    '#7C5CBF',
} as const;

// ─── Borders ──────────────────────────────────────────────────────────────
export const border = {
  light:       '#E8E2D8',
  medium:      '#D8D0C4',
  dark:        '#C4BAA8',
  focus:       'rgba(212, 175, 55, 0.45)',
  glass:       '#E8E2D8',
  chromLight:  '#E8E2D8',
  chromMedium: '#D8D0C4',
} as const;

// ─── Shadows — crisp lift for white cards on cream canvas ─────────────────
export const shadow = {
  sm:         '0 1px 3px rgba(11, 22, 41, 0.06), 0 1px 2px rgba(11, 22, 41, 0.04)',
  md:         '0 4px 12px rgba(11, 22, 41, 0.08), 0 2px 4px rgba(11, 22, 41, 0.04)',
  lg:         '0 8px 24px rgba(11, 22, 41, 0.10), 0 4px 8px rgba(11, 22, 41, 0.06)',
  xl:         '0 16px 40px rgba(11, 22, 41, 0.12), 0 8px 16px rgba(11, 22, 41, 0.08)',
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
  clear:    { color: '#6B7A94', bg: 'rgba(107, 122, 148, 0.08)', label: 'CLEAR' },
} as const;

// ─── Chart Colors ─────────────────────────────────────────────────────────
export const chart = {
  primary:    '#2563EB',
  secondary:  '#17B26A',
  tertiary:   '#7C3AED',
  quaternary: '#F59E0B',
  danger:     '#E5484D',
  muted:      '#6B7A94',
  grid:       'rgba(11, 22, 41, 0.05)',
  bars: ['#2563EB', '#17B26A', '#7C3AED', '#F59E0B', '#0891B2', '#E5484D'],
} as const;

// ─── Convenience: Flat "C" object (backward compat) ──────────────────────
export const C = {
  bg:        bg.app,
  white:     bg.card,
  subtle:    bg.subtle,
  dark:      bg.dark,
  deep:      text.primary,
  rock:      '#0B1629',
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
