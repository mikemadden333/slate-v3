/**
 * Slate v3 — Shared UI Components
 * Every reusable component lives here.
 */

import React, { type ReactNode, type CSSProperties } from 'react';
import { bg, text, brand, border, status, font, fontSize, fontWeight, shadow, radius, transition, modules as moduleColors } from '../core/theme';
import type { FreshnessLevel } from '../core/types';
import { getFreshness } from '../core/types';
import { fmtRelative } from '../core/formatters';

// ─── Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  accent?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, style, accent, onClick, hover }: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: bg.card,
        borderRadius: radius.lg,
        border: `1px solid ${border.light}`,
        boxShadow: isHovered && hover ? shadow.md : shadow.sm,
        padding: 20,
        transition: transition.fast,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: { value: string; positive: boolean };
  icon?: string;
  accent?: string;
  onClick?: () => void;
}

export function KPICard({ label, value, subValue, trend, icon, accent = brand.brass, onClick }: KPICardProps) {
  return (
    <Card accent={accent} onClick={onClick} hover={!!onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: fontSize.xs,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 8,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: fontSize['3xl'],
            fontWeight: fontWeight.bold,
            color: text.primary,
            fontFamily: font.sans,
            lineHeight: 1,
          }}>
            {value}
          </div>
          {subValue && (
            <div style={{
              fontSize: fontSize.sm,
              color: text.muted,
              marginTop: 4,
            }}>
              {subValue}
            </div>
          )}
          {trend && (
            <div style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: trend.positive ? status.green : status.red,
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <span>{trend.positive ? '▲' : '▼'}</span>
              {trend.value}
            </div>
          )}
        </div>
        {icon && (
          <span style={{
            fontSize: '24px',
            color: accent,
            opacity: 0.6,
          }}>
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

// ─── Data Freshness Indicator ─────────────────────────────────────────────

interface DataFreshnessProps {
  lastUpdated: string;
  source: string;
  thresholdDays?: number;
}

export function DataFreshness({ lastUpdated, source, thresholdDays = 30 }: DataFreshnessProps) {
  const level = getFreshness(lastUpdated, thresholdDays);
  const colors: Record<FreshnessLevel, string> = {
    fresh: status.green,
    aging: status.amber,
    stale: status.red,
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: fontSize.xs,
      color: text.light,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: colors[level],
        display: 'inline-block',
      }} />
      <span>{source}</span>
      <span style={{ color: text.light }}>·</span>
      <span>{fmtRelative(lastUpdated)}</span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────

interface StatusBadgeProps {
  label: string;
  variant: 'green' | 'red' | 'amber' | 'blue' | 'gray';
  size?: 'sm' | 'md';
}

export function StatusBadge({ label, variant, size = 'sm' }: StatusBadgeProps) {
  const colorMap = {
    green: { bg: status.greenBg, color: status.green, border: status.greenBorder },
    red: { bg: status.redBg, color: status.red, border: status.redBorder },
    amber: { bg: status.amberBg, color: status.amber, border: status.amberBorder },
    blue: { bg: status.blueBg, color: status.blue, border: status.blueBorder },
    gray: { bg: status.grayBg, color: status.gray, border: status.grayBorder },
  };
  const c = colorMap[variant];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: radius.full,
      background: c.bg,
      border: `1px solid ${c.border}`,
      fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: c.color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─── AI Insight Block ─────────────────────────────────────────────────────

interface AIInsightProps {
  content: string;
  loading?: boolean;
  label?: string;
}

export function AIInsight({ content, loading, label = 'Slate Analysis' }: AIInsightProps) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${bg.subtle} 0%, ${bg.card} 100%)`,
      border: `1px solid ${brand.brass}30`,
      borderRadius: radius.lg,
      padding: 16,
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}>
        <span style={{ color: brand.gold, fontSize: fontSize.md }}>✦</span>
        <span style={{
          fontSize: fontSize.xs,
          fontWeight: fontWeight.semibold,
          color: brand.brass,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {label}
        </span>
      </div>
      {loading ? (
        <div style={{
          fontSize: fontSize.sm,
          color: text.light,
          fontStyle: 'italic',
        }}>
          Analyzing data...
        </div>
      ) : (
        <div style={{
          fontSize: fontSize.sm,
          color: text.secondary,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

// ─── Module Header ────────────────────────────────────────────────────────

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  accent?: string;
  actions?: ReactNode;
  freshness?: { lastUpdated: string; source: string; thresholdDays?: number };
}

export function ModuleHeader({ title, subtitle, accent = brand.brass, actions, freshness }: ModuleHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    }}>
      <div>
        <h1 style={{
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          color: text.primary,
          fontFamily: font.serif,
          margin: 0,
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: fontSize.sm,
            color: text.muted,
            margin: '4px 0 0 0',
          }}>
            {subtitle}
          </p>
        )}
        {freshness && (
          <div style={{ marginTop: 6 }}>
            <DataFreshness {...freshness} />
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}

export function Section({ title, children, style }: SectionProps) {
  return (
    <div style={{ marginBottom: 32, ...style }}>
      <div style={{
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: text.muted,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `1px solid ${border.light}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = '◇', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      color: text.light,
    }}>
      <div style={{ fontSize: '32px', marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.medium, color: text.secondary, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: fontSize.sm, marginBottom: 16 }}>{description}</div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '8px 20px',
            borderRadius: radius.lg,
            border: `1px solid ${brand.brass}`,
            background: 'transparent',
            color: brand.brass,
            fontWeight: fontWeight.semibold,
            fontSize: fontSize.sm,
            cursor: 'pointer',
            fontFamily: font.sans,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
