/**
 * Slate v3 — Constants
 * Module metadata, navigation structure, and app-wide constants.
 */

import type { ModuleMeta } from './types';
import { modules } from './theme';

// ─── Module Registry ──────────────────────────────────────────────────────

export const MODULES: ModuleMeta[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '◉',
    color: '#B79145',
    category: 'intelligence',
    description: 'Network overview and intelligence briefing',
  },
  {
    id: 'watch',
    label: 'Watch',
    icon: '◎',
    color: modules.watch,
    category: 'intelligence',
    description: 'Real-time safety intelligence',
  },
  {
    id: 'ledger',
    label: 'Ledger',
    icon: '▤',
    color: modules.ledger,
    category: 'operations',
    description: 'Financial intelligence and scenario modeling',
  },
  {
    id: 'scholar',
    label: 'Scholar',
    icon: '◈',
    color: modules.scholar,
    category: 'operations',
    description: 'Enrollment intelligence and revenue forecasting',
  },
  {
    id: 'shield',
    label: 'Shield',
    icon: '◇',
    color: modules.shield,
    category: 'strategy',
    description: 'Enterprise risk intelligence',
  },
  {
    id: 'fund',
    label: 'Fund',
    icon: '◆',
    color: modules.fund,
    category: 'strategy',
    description: 'Fundraising pipeline and grant intelligence',
  },
  {
    id: 'grounds',
    label: 'Grounds',
    icon: '▣',
    color: modules.grounds,
    category: 'operations',
    description: 'Facilities and capital project intelligence',
  },
  {
    id: 'civic',
    label: 'Civic',
    icon: '◐',
    color: modules.civic,
    category: 'strategy',
    description: 'Public affairs and legislative intelligence',
  },
  {
    id: 'signal',
    label: 'Signal',
    icon: '◉',
    color: modules.signal,
    category: 'intelligence',
    description: 'Network health radar',
  },
  {
    id: 'draft',
    label: 'Draft',
    icon: '▧',
    color: modules.draft,
    category: 'communications',
    description: 'AI-powered communications drafting',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '▥',
    color: modules.reports,
    category: 'communications',
    description: 'Board decks and stakeholder reports',
  },
  {
    id: 'briefing',
    label: 'Briefing',
    icon: '◈',
    color: modules.briefing,
    category: 'intelligence',
    description: 'AI-synthesized intelligence briefing',
  },
  {
    id: 'datahub',
    label: 'Data Hub',
    icon: '⬡',
    color: modules.datahub,
    category: 'operations',
    description: 'Data management and upload center',
  },
];

// ─── Navigation Groups ────────────────────────────────────────────────────

export const NAV_GROUPS = [
  {
    label: 'Intelligence',
    modules: ['dashboard', 'briefing', 'watch', 'signal'],
  },
  {
    label: 'Operations',
    modules: ['ledger', 'scholar', 'grounds'],
  },
  {
    label: 'Strategy',
    modules: ['shield', 'fund', 'civic'],
  },
  {
    label: 'Communications',
    modules: ['draft', 'reports'],
  },
  {
    label: 'System',
    modules: ['datahub'],
  },
];

// ─── App Constants ────────────────────────────────────────────────────────

export const APP_NAME = 'Slate';
export const APP_TAGLINE = 'Intelligence Platform for School Systems';
export const APP_VERSION = '3.0.0';
export const DEMO_NETWORK = 'Veritas Charter Schools';

// ─── Data Freshness Thresholds (days) ─────────────────────────────────────

export const FRESHNESS_THRESHOLDS = {
  enrollment: 30,
  financials: 15,
  staff: 30,
  risks: 60,
  fundraising: 14,
  compliance: 30,
  facilities: 7,
  civic: 14,
} as const;

// ─── AI Configuration ─────────────────────────────────────────────────────

export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.7,
  systemPrompt: `You are Slate, an AI intelligence analyst embedded in a school network operations platform. You speak with authority, precision, and warmth. You understand charter school operations deeply — enrollment economics, bond covenants, campus safety, regulatory compliance, fundraising, and the daily reality of serving students in challenging urban environments. You always connect data to decisions. You never hedge when the data is clear. You are the trusted advisor that every school leader wishes they had.`,
} as const;
