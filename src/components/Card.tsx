/**
 * Slate v3 — Shared UI Components
 * Split theme: dark chrome frame + light content workspace.
 * Cards are white with subtle shadows on warm off-white background.
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
        background: '#FFFFFF',
        borderRadius: radius.lg,
        border: `1px solid ${border.light}`,
        boxShadow: isHovered && hover ? shadow.md : shadow.sm,
        padding: 20,
        transition: transition.fast,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...(accent ? { borderTop: `2px solid ${accent}` } : {}),
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

export function KPICard({ label, value, subValue, trend, icon, accent = 'transparent', onClick }: KPICardProps) {
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
            fontFamily: font.body,
            fontWeight: fontWeight.medium,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: fontSize['3xl'],
            fontWeight: fontWeight.semibold,
            color: text.primary,
            fontFamily: font.mono,
            lineHeight: 1,
          }}>
            {value}
          </div>
          {subValue && (
            <div style={{
              fontSize: fontSize.sm,
              color: text.muted,
              marginTop: 4,
              fontFamily: font.body,
            }}>
              {subValue}
            </div>
          )}
          {trend && (
            <div style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: trend.positive ? status.green : status.red,
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: font.body,
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
            opacity: 0.5,
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
      fontFamily: font.body,
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
      fontWeight: fontWeight.medium,
      color: c.color,
      whiteSpace: 'nowrap',
      fontFamily: font.body,
    }}>
      {label}
    </span>
  );
}

// ─── AI Insight Block ─────────────────────────────────────────────────────
// AI insights keep a subtle warm tint to stand out from regular white cards

interface AIInsightProps {
  content: string;
  loading?: boolean;
  label?: string;
  aiText?: string;
  aiLoading?: boolean;
  aiError?: boolean;
  onRegenerate?: () => void;
  lastGenerated?: Date | null;
}

export function AIInsight({ content, loading, label = 'Slate Analysis', aiText, aiLoading, aiError, onRegenerate, lastGenerated }: AIInsightProps) {
  const displayText = (aiText && aiText.length > 0) ? aiText : content;
  const isLoading = aiLoading || loading;
  const isLive = !!(aiText && aiText.length > 0 && !aiError);

  const formatText = (t: string) => {
    if (!t) return null;
    const paragraphs = t.split(/\n\n+/);
    return paragraphs.map((para, pi) => {
      const chunks = para.split(/(\*\*[^*]+\*\*)/);
      const rendered = chunks.map((chunk, ci) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
          return React.createElement('strong', { key: ci, style: { color: text.primary, fontWeight: fontWeight.semibold } }, chunk.slice(2, -2));
        }
        return chunk;
      });
      return React.createElement('p', { key: pi, style: { margin: pi === 0 ? 0 : '10px 0 0 0' } }, ...rendered);
    });
  };

  return (
    <div style={{
      background: bg.card,
      border: `1px solid ${border.light}`,
      borderLeft: `3px solid ${status.blue}`,
      borderRadius: radius.md,
      padding: 20,
      position: 'relative',
      transition: transition.fast,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: status.blue, fontSize: fontSize.md }}>✦</span>
          <span style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.semibold,
            color: text.muted,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            fontFamily: font.body,
          }}>
            {label}
          </span>
          {isLive && (
            <span style={{
              fontSize: 9,
              fontWeight: fontWeight.medium,
              color: status.green,
              background: status.greenBg,
              padding: '2px 6px',
              borderRadius: radius.full,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontFamily: font.body,
            }}>
              LIVE AI
            </span>
          )}
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            style={{
              fontSize: fontSize.xs,
              color: text.muted,
              background: 'none',
              border: `1px solid ${border.light}`,
              borderRadius: radius.sm,
              padding: '2px 8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              fontFamily: font.body,
              transition: transition.fast,
            }}
          >
            {isLoading ? '...' : '↻'}
          </button>
        )}
      </div>
      {isLoading ? (
        <div style={{
          fontSize: fontSize.sm,
          color: text.muted,
          fontStyle: 'italic',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: font.body,
        }}>
          <span style={{
            display: 'inline-block',
            width: 8, height: 8,
            borderRadius: '50%',
            background: status.blue,
            animation: 'slatePulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ color: text.muted }}>Slate is analyzing your data...</span>
        </div>
      ) : (
        <div style={{
          fontSize: fontSize.md,
          color: text.secondary,
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
          fontFamily: font.body,
          fontWeight: fontWeight.normal,
        }}>
          {formatText(displayText)}
        </div>
      )}
      {lastGenerated && !isLoading && (
        <div style={{
          fontSize: 10,
          color: text.muted,
          marginTop: 8,
          opacity: 0.6,
          fontFamily: font.body,
        }}>
          {isLive ? 'AI analysis' : 'Static analysis'} · {lastGenerated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      )}
      <style>{`@keyframes slatePulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
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

export function ModuleHeader({ title, subtitle, accent = brand.gold, actions, freshness }: ModuleHeaderProps) {
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
          fontWeight: fontWeight.semibold,
          color: text.primary,
          fontFamily: font.body,
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
            fontFamily: font.body,
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
        fontWeight: fontWeight.medium,
        color: text.muted,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `1px solid ${border.light}`,
        fontFamily: font.body,
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
      color: text.muted,
    }}>
      <div style={{ fontSize: '32px', marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.medium, color: text.secondary, marginBottom: 4, fontFamily: font.body }}>
        {title}
      </div>
      <div style={{ fontSize: fontSize.sm, color: text.muted, marginBottom: 16, fontFamily: font.body }}>{description}</div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '8px 20px',
            borderRadius: radius.lg,
            border: `1px solid ${brand.gold}`,
            background: 'transparent',
            color: brand.gold,
            fontWeight: fontWeight.medium,
            fontSize: fontSize.sm,
            cursor: 'pointer',
            fontFamily: font.body,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
