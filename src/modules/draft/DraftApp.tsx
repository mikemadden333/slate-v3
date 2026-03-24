/**
 * Slate v3 — Draft
 * ═══════════════════════════════════════════════════
 * AI Communications Intelligence.
 * Generate board memos, parent letters, stakeholder updates,
 * press releases, and internal communications — all grounded
 * in real-time Slate data.
 *
 * This is where the AI becomes the CEO's speechwriter.
 */

import React, { useState, useCallback } from 'react';
import { useRole, useNetwork, useFinancials, useEnrollment, useRisks, useFacilities, useCivic, useFundraising } from '../../data/DataStore';
import { Card, KPICard, ModuleHeader, AIInsight } from '../../components/Card';
import { fmt, fmtPct, fmtCompact } from '../../core/formatters';
import {
  bg, text as textColor, brand, border, status as statusColor, font, fontSize, fontWeight,
  shadow, radius, transition, modules as modColors,
} from '../../core/theme';

// ─── Template Types ──────────────────────────────────────────────────────

interface DraftTemplate {
  id: string;
  name: string;
  category: 'board' | 'parent' | 'staff' | 'stakeholder' | 'media' | 'internal';
  description: string;
  icon: string;
  dataSources: string[];
  prompt: string;
}

const TEMPLATES: DraftTemplate[] = [
  {
    id: 'board-financial',
    name: 'Board Financial Update',
    category: 'board',
    description: 'Monthly financial summary for the board of directors with covenant status and projections.',
    icon: '📊',
    dataSources: ['Ledger', 'Scholar'],
    prompt: 'Generate a professional board memo summarizing the current financial position.',
  },
  {
    id: 'board-ceo-report',
    name: 'CEO Board Report',
    category: 'board',
    description: 'Comprehensive CEO report covering all operational areas for the board meeting.',
    icon: '📋',
    dataSources: ['All Modules'],
    prompt: 'Generate a comprehensive CEO report for the board meeting.',
  },
  {
    id: 'parent-enrollment',
    name: 'Parent Enrollment Update',
    category: 'parent',
    description: 'Parent-facing letter about enrollment status, upcoming events, and school updates.',
    icon: '👨‍👩‍👧‍👦',
    dataSources: ['Scholar', 'Watch'],
    prompt: 'Generate a warm, professional parent letter about enrollment and school updates.',
  },
  {
    id: 'parent-safety',
    name: 'Parent Safety Communication',
    category: 'parent',
    description: 'Safety update for parents based on Watch intelligence and campus conditions.',
    icon: '🛡️',
    dataSources: ['Watch', 'Shield'],
    prompt: 'Generate a parent safety communication based on current campus conditions.',
  },
  {
    id: 'staff-allhands',
    name: 'Staff All-Hands Brief',
    category: 'staff',
    description: 'Internal all-hands talking points covering organizational health and priorities.',
    icon: '🎤',
    dataSources: ['Ledger', 'Scholar', 'Signal'],
    prompt: 'Generate talking points for an all-hands staff meeting.',
  },
  {
    id: 'stakeholder-authorizer',
    name: 'Authorizer Update',
    category: 'stakeholder',
    description: 'Formal update to the charter authorizer on academic and operational performance.',
    icon: '🏛️',
    dataSources: ['Scholar', 'Ledger', 'Shield'],
    prompt: 'Generate a formal authorizer update on network performance.',
  },
  {
    id: 'media-press',
    name: 'Press Release',
    category: 'media',
    description: 'Press release template for announcements, milestones, or responses.',
    icon: '📰',
    dataSources: ['Civic', 'Scholar'],
    prompt: 'Generate a press release for a network announcement.',
  },
  {
    id: 'internal-incident',
    name: 'Incident Response Brief',
    category: 'internal',
    description: 'Internal incident response communication with facts, actions, and messaging guidance.',
    icon: '⚡',
    dataSources: ['Watch', 'Shield'],
    prompt: 'Generate an internal incident response brief.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'board', label: 'Board' },
  { id: 'parent', label: 'Parent' },
  { id: 'staff', label: 'Staff' },
  { id: 'stakeholder', label: 'Stakeholder' },
  { id: 'media', label: 'Media' },
  { id: 'internal', label: 'Internal' },
];

// ─── Template Card ───────────────────────────────────────────────────────

function TemplateCard({ template, onSelect, isSelected }: { template: DraftTemplate; onSelect: () => void; isSelected: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isSelected ? `${modColors.draft}08` : hover ? bg.hover : bg.card,
        borderRadius: radius.lg,
        border: `1px solid ${isSelected ? modColors.draft : hover ? `${modColors.draft}40` : border.light}`,
        padding: 20, cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 1px ${modColors.draft}40` : shadow.sm,
        transition: transition.fast,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: radius.md,
          background: `${modColors.draft}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', flexShrink: 0,
        }}>
          {template.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: textColor.primary, marginBottom: 4 }}>
            {template.name}
          </div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, lineHeight: 1.5, marginBottom: 8 }}>
            {template.description}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {template.dataSources.map(ds => (
              <span key={ds} style={{
                padding: '2px 8px', borderRadius: radius.full,
                background: bg.subtle, fontSize: '10px', color: textColor.light,
                fontFamily: font.mono, textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {ds}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Draft Workspace ─────────────────────────────────────────────────────

function DraftWorkspace({ template }: { template: DraftTemplate }) {
  const network = useNetwork();
  const financials = useFinancials();
  const enrollment = useEnrollment();
  const risks = useRisks();
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customContext, setCustomContext] = useState('');

  const generateDraft = useCallback(() => {
    setIsGenerating(true);

    // Build a context-rich draft based on template type and real data
    let content = '';
    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    switch (template.id) {
      case 'board-financial':
        content = `MEMORANDUM\n\nTO: Board of Directors, ${network.name}\nFROM: President & CEO\nDATE: ${date}\nRE: Monthly Financial Update — ${financials.fiscalYear}\n\n${'─'.repeat(60)}\n\nDear Board Members,\n\nI am pleased to provide the following financial update for ${network.name}.\n\nFINANCIAL SUMMARY\n\nYear-to-date, the network has generated ${fmt(financials.ytdSummary.revActual)} in revenue against a budget of ${fmt(financials.ytdSummary.revBudget)}, representing ${fmtPct((financials.ytdSummary.revActual / financials.ytdSummary.revBudget) * 100)} of the annual target. Total expenses stand at ${fmt(financials.ytdSummary.expActual)} against a budget of ${fmt(financials.ytdSummary.expBudget)}.\n\nThe current net surplus is ${fmt(financials.ytdSummary.surplus)}.\n\nCOVENANT COMPLIANCE\n\n• Debt Service Coverage Ratio (DSCR): ${financials.ytdSummary.dscr.toFixed(2)}x (minimum: ${financials.covenants.dscrMinimum.toFixed(2)}x) — ${financials.ytdSummary.dscr >= financials.covenants.dscrMinimum ? 'COMPLIANT' : 'WATCH'}\n• Days Cash on Hand: ${financials.ytdSummary.daysCash} days (minimum: ${financials.covenants.daysCashMinimum} days) — ${financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum ? 'COMPLIANT' : 'WATCH'}\n• Current Ratio: ${financials.ytdSummary.currentRatio.toFixed(2)} (minimum: ${financials.covenants.currentRatioMinimum.toFixed(2)}) — ${financials.ytdSummary.currentRatio >= financials.covenants.currentRatioMinimum ? 'COMPLIANT' : 'WATCH'}\n\nENROLLMENT IMPACT\n\nCurrent enrollment stands at ${enrollment.networkTotal.toLocaleString()} students across ${network.campusCount} campuses, against a target of ${enrollment.targetEnrollment.toLocaleString()}. This represents ${fmtPct((enrollment.networkTotal / enrollment.targetEnrollment) * 100)} of our enrollment goal.\n\nI am happy to discuss any of these items in detail at our next meeting.\n\nRespectfully submitted,\n[President & CEO]`;
        break;

      case 'board-ceo-report':
        const tier1Risks = risks.register.filter(r => r.tier === 'Tier 1 — Board Focus');
        content = `CEO REPORT TO THE BOARD\n${network.name}\n${date}\n\n${'─'.repeat(60)}\n\nEXECUTIVE SUMMARY\n\n${network.name} continues to operate across ${network.campusCount} campuses serving ${enrollment.networkTotal.toLocaleString()} students in ${network.city}. This report provides a comprehensive update on organizational health.\n\nFINANCIAL HEALTH\n• YTD Revenue: ${fmt(financials.ytdSummary.revActual)} (${fmtPct((financials.ytdSummary.revActual / financials.ytdSummary.revBudget) * 100)} of budget)\n• YTD Surplus: ${fmt(financials.ytdSummary.surplus)}\n• DSCR: ${financials.ytdSummary.dscr.toFixed(2)}x\n• Days Cash: ${financials.ytdSummary.daysCash}\n\nENROLLMENT\n• Current: ${enrollment.networkTotal.toLocaleString()} / ${enrollment.targetEnrollment.toLocaleString()} target\n• Utilization: ${fmtPct((enrollment.networkTotal / enrollment.targetEnrollment) * 100)}\n\nRISK REGISTER — BOARD-LEVEL ITEMS\n${tier1Risks.length > 0 ? tier1Risks.map(r => `• ${r.name} (Score: ${r.likelihood * r.impact}, Trend: ${r.trend})\n  ${r.description}`).join('\n\n') : '• No Tier 1 risks currently flagged.'}\n\nACTION ITEMS FOR BOARD CONSIDERATION\n1. [Add specific items based on current priorities]\n2. [Add specific items based on current priorities]\n\nRespectfully submitted,\n[President & CEO]`;
        break;

      case 'parent-enrollment':
        content = `Dear ${network.name} Families,\n\nI hope this message finds you and your family well. I am writing to share some important updates about our school community.\n\nENROLLMENT UPDATE\n\nWe are proud to serve ${enrollment.networkTotal.toLocaleString()} students across our ${network.campusCount} campuses this year. Our schools continue to be in high demand, and we are grateful for your trust in ${network.name}.\n\nIMPORTANT DATES\n\n• [Add upcoming events]\n• [Add registration deadlines]\n• [Add community events]\n\nAs always, please do not hesitate to reach out to your campus principal or our central office with any questions or concerns. We are here to serve you and your children.\n\nWith gratitude,\n[President & CEO]\n${network.name}`;
        break;

      case 'parent-safety':
        content = `Dear ${network.name} Families,\n\nThe safety of your children is our highest priority. I am writing to share an update on our ongoing safety efforts.\n\nOUR COMMITMENT\n\n${network.name} maintains comprehensive safety protocols across all ${network.campusCount} campuses. Our safety team monitors conditions 24/7 and works closely with local law enforcement and community partners.\n\nCURRENT STATUS\n\nAll campuses are operating under normal safety conditions. Our monitoring systems are active and our safety teams are fully staffed.\n\nWHAT WE DO EVERY DAY\n\n• 24/7 real-time safety monitoring of all campus neighborhoods\n• Coordination with Chicago Police Department district commanders\n• Regular safety drills and protocol reviews\n• Trained safety personnel at every campus\n\nIF YOU SEE SOMETHING\n\nPlease report any safety concerns to your campus principal immediately. For emergencies, always call 911 first.\n\nYour partnership in keeping our schools safe is invaluable.\n\nSincerely,\n[President & CEO]\n${network.name}`;
        break;

      default:
        content = `[${template.name}]\n\nGenerated for: ${network.name}\nDate: ${date}\n\n${'─'.repeat(60)}\n\nThis draft template is ready for customization. The following data sources are available:\n\n${template.dataSources.map(ds => `• ${ds}`).join('\n')}\n\n[Add your custom context below and regenerate for a data-enriched draft.]`;
    }

    setTimeout(() => {
      setDraft(content);
      setIsGenerating(false);
    }, 800);
  }, [template, network, financials, enrollment, risks]);

  return (
    <div style={{
      background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
      boxShadow: shadow.md, overflow: 'hidden',
    }}>
      {/* Workspace Header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${border.light}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `${modColors.draft}05`,
      }}>
        <div>
          <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: textColor.primary }}>
            {template.icon} {template.name}
          </div>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, marginTop: 2 }}>
            Data sources: {template.dataSources.join(', ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={generateDraft}
            disabled={isGenerating}
            style={{
              padding: '8px 20px', borderRadius: radius.md,
              background: isGenerating ? textColor.muted : modColors.draft,
              color: '#fff', border: 'none', cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
              transition: transition.fast,
            }}
          >
            {isGenerating ? 'Generating...' : draft ? 'Regenerate' : 'Generate Draft'}
          </button>
          {draft && (
            <button
              onClick={() => navigator.clipboard.writeText(draft)}
              style={{
                padding: '8px 16px', borderRadius: radius.md,
                background: 'transparent', color: modColors.draft,
                border: `1px solid ${modColors.draft}`, cursor: 'pointer',
                fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
              }}
            >
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Custom Context Input */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${border.light}`, background: bg.subtle }}>
        <textarea
          value={customContext}
          onChange={e => setCustomContext(e.target.value)}
          placeholder="Add custom context or instructions (e.g., 'Focus on the enrollment gains at our South Side campuses' or 'Tone should be celebratory')..."
          style={{
            width: '100%', minHeight: 48, padding: 12, borderRadius: radius.md,
            border: `1px solid ${border.light}`, background: bg.card,
            color: textColor.primary, fontSize: fontSize.sm, fontFamily: font.sans,
            resize: 'vertical', outline: 'none',
          }}
        />
      </div>

      {/* Draft Output */}
      <div style={{ padding: 20, minHeight: 300 }}>
        {draft ? (
          <pre style={{
            fontFamily: font.sans, fontSize: fontSize.sm, color: textColor.primary,
            lineHeight: 1.7, whiteSpace: 'pre-wrap', wordWrap: 'break-word',
            margin: 0,
          }}>
            {draft}
          </pre>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 260, color: textColor.light, textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: 16, opacity: 0.3 }}>✍️</div>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: textColor.muted, marginBottom: 4 }}>
              Ready to Draft
            </div>
            <div style={{ fontSize: fontSize.xs, color: textColor.light, maxWidth: 400 }}>
              Click "Generate Draft" to create a data-enriched {template.name.toLowerCase()} using live Slate intelligence. Add custom context above to guide the output.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DRAFT APP
// ═══════════════════════════════════════════════════════════════════════════

export default function DraftApp() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate | null>(null);

  const filteredTemplates = selectedCategory === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div>
      <ModuleHeader
        title="Draft"
        subtitle="AI Communications Intelligence"
        accent={modColors.draft}
      />

      {/* Intro */}
      <AIInsight label="Your AI Speechwriter"
        content="Draft generates professional communications grounded in real-time Slate data. Every memo, letter, and report is enriched with live enrollment, financial, safety, and operational intelligence — ensuring accuracy and consistency across all stakeholder communications." />

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, marginTop: 20 }}>
        {/* Left: Template Selector */}
        <div>
          {/* Category Filters */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16,
            padding: '10px 12px', background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
          }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{
                padding: '4px 10px', borderRadius: radius.full,
                border: `1px solid ${selectedCategory === cat.id ? modColors.draft : border.light}`,
                background: selectedCategory === cat.id ? `${modColors.draft}15` : 'transparent',
                color: selectedCategory === cat.id ? modColors.draft : textColor.muted,
                fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
              }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Template List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredTemplates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onSelect={() => setSelectedTemplate(t)}
                isSelected={selectedTemplate?.id === t.id}
              />
            ))}
          </div>
        </div>

        {/* Right: Draft Workspace */}
        <div>
          {selectedTemplate ? (
            <DraftWorkspace key={selectedTemplate.id} template={selectedTemplate} />
          ) : (
            <div style={{
              background: bg.card, borderRadius: radius.lg, border: `1px solid ${border.light}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 500, textAlign: 'center', padding: 40,
            }}>
              <div style={{ fontSize: '64px', marginBottom: 20, opacity: 0.2 }}>✍️</div>
              <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, fontFamily: font.serif, color: textColor.secondary, marginBottom: 8 }}>
                Select a Template
              </div>
              <div style={{ fontSize: fontSize.sm, color: textColor.muted, maxWidth: 400, lineHeight: 1.6 }}>
                Choose a communication template from the left panel. Draft will generate a professional document enriched with live Slate data — ready to review, customize, and send.
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        textAlign: 'center', padding: '20px 0', fontSize: fontSize.xs, color: textColor.light,
        borderTop: `1px solid ${border.light}`, marginTop: 20,
      }}>
        {TEMPLATES.length} templates · AI-powered · Data-enriched · Draft Intelligence
      </div>
    </div>
  );
}
