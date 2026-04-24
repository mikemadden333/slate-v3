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

  const buildDataContext = useCallback(() => {
    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const tier1Risks = risks.register.filter((r: { tier: string }) => r.tier === 'Tier 1 — Board Focus');
    return [
      `Network: ${network.name}`,
      `Date: ${date}`,
      `Campuses: ${network.campusCount} campuses in ${network.city}`,
      `Enrollment: ${enrollment.networkTotal.toLocaleString()} students (target: ${enrollment.targetEnrollment.toLocaleString()}, ${fmtPct((enrollment.networkTotal / enrollment.targetEnrollment) * 100)} of goal)`,
      `Financials: YTD Revenue ${fmt(financials.ytdSummary.revActual)} (${fmtPct((financials.ytdSummary.revActual / financials.ytdSummary.revBudget) * 100)} of budget), Surplus ${fmt(financials.ytdSummary.surplus)}, DSCR ${financials.ytdSummary.dscr.toFixed(2)}x, Days Cash ${financials.ytdSummary.daysCash}`,
      `Covenant compliance: DSCR ${financials.ytdSummary.dscr >= financials.covenants.dscrMinimum ? 'COMPLIANT' : 'WATCH'}, Days Cash ${financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum ? 'COMPLIANT' : 'WATCH'}`,
      tier1Risks.length > 0 ? `Board-level risks: ${tier1Risks.map((r: { name: string; trend: string }) => `${r.name} (${r.trend})`).join(', ')}` : 'No Tier 1 risks flagged',
    ].join('\n');
  }, [network, enrollment, financials, risks]);

  const generateFallback = useCallback((context: string) => {
    const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const hasContext = context.trim().length > 0;

    // Detect intent from the user's context
    const ctx = context.toLowerCase();
    const isSafety = ctx.includes('gun') || ctx.includes('shot') || ctx.includes('weapon') || ctx.includes('incident') || ctx.includes('safe') || ctx.includes('police') || ctx.includes('cpd') || ctx.includes('lock') || ctx.includes('threat');
    const isFinancial = ctx.includes('budget') || ctx.includes('financial') || ctx.includes('revenue') || ctx.includes('surplus') || ctx.includes('covenant') || ctx.includes('cash');
    const isEnrollment = ctx.includes('enroll') || ctx.includes('student') || ctx.includes('registration') || ctx.includes('application');
    const isStaff = ctx.includes('staff') || ctx.includes('teacher') || ctx.includes('employee') || ctx.includes('all-hands') || ctx.includes('team');

    if (isSafety || template.id === 'parent-safety' || template.id === 'internal-incident') {
      const isGun = ctx.includes('gun') || ctx.includes('weapon') || ctx.includes('firearm');
      const isAllSafe = ctx.includes('all safe') || ctx.includes('no injur') || ctx.includes('safe');
      const campus = ctx.match(/veritas (\w+)/i)?.[1] || ctx.match(/at (\w+)/i)?.[1] || 'one of our campuses';
      const isParent = template.category === 'parent';

      if (isParent) {
        return `Dear ${network.name} Families,

I am writing to inform you of an incident that occurred earlier today${hasContext ? ` at ${campus}` : ''} and to assure you that your children are safe.

${hasContext ? `WHAT HAPPENED\n\n${context.trim()}\n\n` : ''}OUR RESPONSE

Upon being notified, our safety team responded immediately and coordinated with the Chicago Police Department. ${isAllSafe ? 'All students and staff are safe, and the situation has been resolved.' : 'The situation was addressed promptly and all students remained secure.'} ${isGun ? 'The item was secured and removed from campus. CPD conducted a thorough sweep and cleared the building.' : ''}

At no point were students in danger. Our protocols worked exactly as designed.

WHAT THIS MEANS FOR TOMORROW

School will operate on a normal schedule tomorrow. Our safety team will be at heightened awareness, and we will have additional support on campus. If you have any concerns, please contact your campus principal directly.

OUR COMMITMENT

The safety of your children is not a program or a policy. It is a promise. We take every incident seriously, we communicate with you honestly, and we will always tell you the truth about what happened and what we did about it.

Thank you for your trust.

Sincerely,
[President & CEO]
${network.name}
${date}`;
      } else {
        return `INTERNAL INCIDENT BRIEF — CONFIDENTIAL

TO: Campus Leadership, Safety Directors
FROM: Central Office
DATE: ${date}
RE: ${hasContext ? context.trim() : 'Campus Safety Incident'}

${'─'.repeat(60)}

SITUATION SUMMARY

${hasContext ? context.trim() : '[Incident description]'}

IMMEDIATE ACTIONS TAKEN

• Campus principal notified immediately
• Chicago Police Department contacted and responded
• ${isGun ? 'Firearm secured and removed from campus premises' : 'Situation assessed and contained'}
• ${isAllSafe ? 'All students and staff confirmed safe' : 'Student and staff safety verified'}
• Parent communication issued
• Incident documented per protocol

CURRENT STATUS

${isAllSafe ? 'Situation resolved. Campus secure. Normal operations continuing.' : 'Situation under control. Monitoring in effect.'}

FOLLOW-UP REQUIRED

• Complete incident report within 24 hours
• Debrief with campus principal and safety director
• Review and update safety protocols as needed
• Authorizer notification if required by charter agreement

COMMUNICATIONS GUIDANCE

All external communications should go through the central office. Do not speak to media. Direct all press inquiries to [Communications Director].

For questions, contact the central office immediately.

[President & CEO]
${network.name}`;
      }
    }

    if (isFinancial || template.id === 'board-financial') {
      return `MEMORANDUM

TO: Board of Directors, ${network.name}
FROM: President & CEO
DATE: ${date}
RE: Financial Update${hasContext ? ` — ${context.trim()}` : ` — ${financials.fiscalYear}`}

${'─'.repeat(60)}

Dear Board Members,

${hasContext ? `${context.trim()}\n\n` : ''}FINANCIAL SUMMARY

Year-to-date, the network has generated ${fmt(financials.ytdSummary.revActual)} in revenue against a budget of ${fmt(financials.ytdSummary.revBudget)}, representing ${fmtPct((financials.ytdSummary.revActual / financials.ytdSummary.revBudget) * 100)} of the annual target. Total expenses stand at ${fmt(financials.ytdSummary.expActual)} against a budget of ${fmt(financials.ytdSummary.expBudget)}. The current net surplus is ${fmt(financials.ytdSummary.surplus)}.

COVENANT COMPLIANCE

• DSCR: ${financials.ytdSummary.dscr.toFixed(2)}x (minimum: ${financials.covenants.dscrMinimum.toFixed(2)}x) — ${financials.ytdSummary.dscr >= financials.covenants.dscrMinimum ? 'COMPLIANT' : 'WATCH'}
• Days Cash on Hand: ${financials.ytdSummary.daysCash} days (minimum: ${financials.covenants.daysCashMinimum} days) — ${financials.ytdSummary.daysCash >= financials.covenants.daysCashMinimum ? 'COMPLIANT' : 'WATCH'}
• Current Ratio: ${financials.ytdSummary.currentRatio.toFixed(2)} — ${financials.ytdSummary.currentRatio >= financials.covenants.currentRatioMinimum ? 'COMPLIANT' : 'WATCH'}

I am happy to discuss any of these items at our next meeting.

Respectfully submitted,
[President & CEO]`;
    }

    if (isEnrollment || template.id === 'parent-enrollment') {
      return `Dear ${network.name} Families,

I hope this message finds you well. I am writing to share an update on our school community.

${hasContext ? `${context.trim()}\n\n` : ''}ENROLLMENT UPDATE

We are proud to serve ${enrollment.networkTotal.toLocaleString()} students across our ${network.campusCount} campuses this year. Our schools continue to be in high demand, and we are grateful for your trust in ${network.name}.

Looking ahead, registration for the upcoming school year is now open. We encourage all current families to re-enroll early to secure your spot.

As always, please do not hesitate to reach out to your campus principal with any questions.

With gratitude,
[President & CEO]
${network.name}
${date}`;
    }

    if (isStaff || template.id === 'staff-allhands') {
      return `STAFF ALL-HANDS BRIEF
${network.name}
${date}

${'─'.repeat(60)}

${hasContext ? `CONTEXT\n\n${context.trim()}\n\n` : ''}WHERE WE STAND

We are serving ${enrollment.networkTotal.toLocaleString()} students across ${network.campusCount} campuses. Financially, we are at ${fmtPct((financials.ytdSummary.revActual / financials.ytdSummary.revBudget) * 100)} of our revenue target with a surplus of ${fmt(financials.ytdSummary.surplus)}.

WHAT IS WORKING

• Strong enrollment demand across the network
• Financial covenants in compliance
• Safety protocols operating as designed

WHAT WE ARE FOCUSED ON

• [Add current priorities]
• [Add current priorities]

THANK YOU

The work you do every day matters. Thank you for your commitment to our students and families.

[President & CEO]`;
    }

    // Generic fallback that incorporates the user's context
    return `${template.name.toUpperCase()}
${network.name}
${date}

${'─'.repeat(60)}

${hasContext ? `${context.trim()}\n\n` : ''}This communication has been prepared for ${network.name}, serving ${enrollment.networkTotal.toLocaleString()} students across ${network.campusCount} campuses in ${network.city}.

Data sources: ${template.dataSources.join(', ')}

[Continue drafting or add more context above and regenerate.]`;
  }, [template, network, enrollment, financials]);

  const generateDraft = useCallback(async () => {
    setIsGenerating(true);
    const dataCtx = buildDataContext();
    const systemPrompt = `You are the AI speechwriter for ${network.name}, a charter school network in ${network.city}. You write professional, warm, and direct communications for the CEO. Write in first person as the CEO. Be specific, use the real data provided, and incorporate the user's instructions precisely. Do not use em dashes. Do not use generic placeholder text. Output only the final communication, ready to send.`;
    const userMessage = `Template: ${template.name}\nLive data:\n${dataCtx}\n\nUser instructions: ${customContext.trim() || 'Generate a complete, professional ' + template.name.toLowerCase() + ' using the data above.'}`;

    try {
      const resp = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.length > 100) {
          setDraft(text.trim());
          setIsGenerating(false);
          return;
        }
      }
    } catch { /* fall through to local */ }

    // Local fallback — always produces context-aware output
    setTimeout(() => {
      setDraft(generateFallback(customContext));
      setIsGenerating(false);
    }, 600);
  }, [template, network, customContext, buildDataContext, generateFallback]);

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
              <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, fontFamily: font.body, color: textColor.secondary, marginBottom: 8 }}>
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
