/**
 * Slate — Roster Module
 * People intelligence: staff roster, vacancy tracking, benefits AI, handbook AI.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStaff, useNetwork } from '../../data/DataStore';
import { useSlateAI } from '../../core/useSlateAI';
import { KPICard, Card, AIInsight, StatusBadge, EmptyState } from '../../components/Card';
import {
  bg, text as textColor, border, font, fontSize, fontWeight,
  radius, shadow, transition, status, modules as modColors,
} from '../../core/theme';
import { fmtPct, fmtNum } from '../../core/formatters';
import { NOBLE_CONTEXT } from './noble-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  role: string;
  dept: string;
  campus: string;
  campusId: number;
  type: 'Academic' | 'Operations' | 'Admin' | 'Support';
  licensed: boolean;
  yearsOfService: number;
  status: 'Active' | 'On Leave' | 'Vacancy';
}

// ─── Roster Data ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Marcus','Denise','Jamal','Latoya','Kevin','Shanice','Andre','Monique',
  'DeShawn','Tamara','Rasheed','Keisha','Brandon','Aaliyah','Darius','Imani',
  'Terrence','Jasmine','Malik','Brianna','Elijah','Destiny','Jordan','Ciara',
  'Isaiah','Tiffany','Derrick','Vanessa','Tyrone','Alexis','Xavier','Simone',
  'Damien','Rochelle','Quincy','Ebony','Reginald','Natasha','Kendrick','Alicia',
  'Marvin','Crystal','Darnell','Shaniqua','Lionel','Tonya','Cedric','Renee',
  'Frederick','Yolanda','Patrick','Carmen','Gregory','Loretta','Raymond','Gloria',
  'Harold','Shirley','Leonard','Dorothy','Eugene','Mildred','Arthur','Beatrice',
  'Walter','Frances','Howard','Evelyn','Frank','Lillian','Charles','Helen',
  'James','Maria','Robert','Linda','Michael','Barbara','William','Susan',
  'David','Jessica','Richard','Sarah','Joseph','Karen','Thomas','Nancy',
  'Christopher','Lisa','Daniel','Betty','Matthew','Margaret','Anthony','Sandra',
];
const LAST_NAMES = [
  'Johnson','Williams','Brown','Jones','Davis','Miller','Wilson','Moore',
  'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson',
  'Garcia','Martinez','Robinson','Clark','Rodriguez','Lewis','Lee','Walker',
  'Hall','Allen','Young','Hernandez','King','Wright','Lopez','Hill',
  'Scott','Green','Adams','Baker','Gonzalez','Nelson','Carter','Mitchell',
  'Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards',
  'Collins','Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan',
  'Bell','Murphy','Bailey','Rivera','Cooper','Richardson','Cox','Howard',
  'Ward','Torres','Peterson','Gray','Ramirez','James','Watson','Brooks',
  'Kelly','Sanders','Price','Bennett','Wood','Barnes','Ross','Henderson',
  'Coleman','Jenkins','Perry','Powell','Long','Patterson','Hughes','Flores',
];

const ROLES_BY_DEPT: Record<string, { roles: string[]; type: StaffMember['type']; licensed: boolean }> = {
  'Instruction': {
    roles: ['English Teacher','Math Teacher','Science Teacher','Social Studies Teacher','Special Ed. Teacher','AP English Teacher','AP Calculus Teacher','AP Biology Teacher','AP History Teacher','ELL Teacher','Physical Education Teacher','Art Teacher','Music Teacher','Computer Science Teacher'],
    type: 'Academic', licensed: true,
  },
  'Student Services': {
    roles: ['School Counselor','College Advisor','Social Worker','Dean of Students','Attendance Coordinator','MTSS Coordinator','Restorative Justice Coordinator','Student Support Specialist'],
    type: 'Support', licensed: false,
  },
  'Special Ed.': {
    roles: ['Special Ed. Teacher','Special Ed. Case Manager','Speech-Language Pathologist','School Psychologist','Occupational Therapist','Special Ed. Paraprofessional'],
    type: 'Academic', licensed: true,
  },
  'Operations': {
    roles: ['Campus Operations Leader','Office Manager','Registrar','Data Manager','Facilities Coordinator','Security Guard','Custodian','Food Service Coordinator','IT Support Specialist'],
    type: 'Operations', licensed: false,
  },
  'Admin': {
    roles: ['Principal','Assistant Principal','Dean of Instruction','Dean of Culture','Campus Director','Executive Assistant','Administrative Coordinator'],
    type: 'Admin', licensed: false,
  },
};

const CAMPUSES = [
  { id: 1,  name: 'Loop',           total: 112 },
  { id: 6,  name: 'Chatham',        total: 105 },
  { id: 3,  name: 'Woodlawn',       total: 97  },
  { id: 2,  name: 'Englewood',      total: 88  },
  { id: 4,  name: 'Auburn Gresham', total: 84  },
  { id: 7,  name: 'Austin',         total: 84  },
  { id: 9,  name: 'Garfield Park',  total: 79  },
  { id: 10, name: 'Humboldt Park',  total: 62  },
  { id: 5,  name: 'Roseland',       total: 62  },
  { id: 8,  name: 'North Lawndale', total: 38  },
];

// Deterministic pseudo-random seeded generator
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateRoster(): StaffMember[] {
  const rand = seededRand(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const depts = Object.keys(ROLES_BY_DEPT);
  const members: StaffMember[] = [];
  let idCounter = 1;

  // Dept distribution per campus (roughly realistic)
  const deptWeights: Record<string, number> = {
    'Instruction': 0.52,
    'Special Ed.': 0.12,
    'Student Services': 0.10,
    'Operations': 0.16,
    'Admin': 0.10,
  };

  for (const campus of CAMPUSES) {
    // 3 vacancies per campus on average (already in data)
    const activeCount = campus.total - 3;
    const onLeaveCount = Math.floor(rand() * 2) + 1; // 1-2 on leave

    for (let i = 0; i < campus.total; i++) {
      const isVacancy = i >= activeCount;
      const isOnLeave = !isVacancy && i >= activeCount - onLeaveCount;

      // Pick dept by weight
      let dept = 'Instruction';
      const r = rand();
      let cumulative = 0;
      for (const d of depts) {
        cumulative += deptWeights[d];
        if (r < cumulative) { dept = d; break; }
      }

      const deptConfig = ROLES_BY_DEPT[dept];
      const role = pick(deptConfig.roles);
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const yearsOfService = isVacancy ? 0 : Math.floor(rand() * 15) + 1;

      members.push({
        id: `S-${String(idCounter++).padStart(4, '0')}`,
        name: isVacancy ? `[Vacant] ${role}` : `${firstName} ${lastName}`,
        role,
        dept,
        campus: campus.name,
        campusId: campus.id,
        type: deptConfig.type,
        licensed: deptConfig.licensed && !isVacancy,
        yearsOfService,
        status: isVacancy ? 'Vacancy' : isOnLeave ? 'On Leave' : 'Active',
      });
    }
  }

  return members;
}

const FULL_ROSTER = generateRoster();

// ─── Shared styles ────────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted,
  textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 12px',
  textAlign: 'left', borderBottom: `1px solid ${border.medium}`,
  background: bg.subtle,
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const staff = useStaff();
  const ai = useSlateAI({
    prompt: `Analyze the people and staffing health of this charter school network. Cover: total headcount vs. positions, vacancy rate and where vacancies are concentrated, licensure rate and what it means for compliance and CTPF, staff on leave, and the top 2-3 people management priorities the CEO should focus on right now. Be specific and direct.`,
    domain: 'roster-overview',
    fallback: `Network staffing at ${staff.activeStaff} of ${staff.totalPositions} positions filled. Vacancy rate of ${((staff.vacancies / staff.totalPositions) * 100).toFixed(1)}% with Special Education representing the highest concentration of open roles. Licensure rate of ${staff.licensureRate}% has direct implications for CTPF compliance and instructional quality.`,
  });

  const vacancyRate = (staff.vacancies / staff.totalPositions) * 100;
  const fillRate = (staff.activeStaff / staff.totalPositions) * 100;
  const onLeaveRate = (staff.onLeave / staff.totalPositions) * 100;

  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Total Positions"
          value={fmtNum(staff.totalPositions)}
          subValue={`${fmtNum(staff.activeStaff)} active`}
          trend={{ value: 'Network headcount', positive: true }}
          icon="◈"
          accent={modColors.signal}
        />
        <KPICard
          label="Fill Rate"
          value={fmtPct(fillRate)}
          subValue={`${staff.vacancies} vacancies`}
          trend={{ value: fillRate >= 95 ? 'Strong' : fillRate >= 90 ? 'Watch' : 'Critical', positive: fillRate >= 95 }}
          accent={fillRate >= 95 ? status.green : fillRate >= 90 ? status.amber : status.red}
        />
        <KPICard
          label="Vacancy Rate"
          value={fmtPct(vacancyRate)}
          subValue={`${staff.vacancies} open roles`}
          trend={{ value: vacancyRate <= 5 ? 'Healthy' : vacancyRate <= 8 ? 'Elevated' : 'Critical', positive: vacancyRate <= 5 }}
          accent={vacancyRate <= 5 ? status.green : vacancyRate <= 8 ? status.amber : status.red}
        />
        <KPICard
          label="Licensure Rate"
          value={fmtPct(staff.licensureRate)}
          subValue="IL Educator License"
          trend={{ value: staff.licensureRate >= 80 ? 'Compliant' : 'Below target', positive: staff.licensureRate >= 80 }}
          accent={staff.licensureRate >= 80 ? status.green : status.amber}
        />
        <KPICard
          label="On Leave"
          value={fmtNum(staff.onLeave)}
          subValue={fmtPct(onLeaveRate) + ' of staff'}
          trend={{ value: 'Current leaves', positive: staff.onLeave <= 15 }}
          accent={staff.onLeave <= 15 ? status.green : status.amber}
        />
      </div>

      {/* AI Intelligence */}
      <AIInsight loading={ai.loading} text={ai.text} error={ai.error} style={{ marginBottom: 24 }} />

      {/* Campus Staffing Grid */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Campus Staffing Summary
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Campus</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={{ ...th, textAlign: 'right' }}>Active</th>
              <th style={{ ...th, textAlign: 'right' }}>Licensed</th>
              <th style={{ ...th, textAlign: 'right', width: 180 }}>Fill Rate</th>
              <th style={{ ...th, textAlign: 'right' }}>Vacancies</th>
            </tr>
          </thead>
          <tbody>
            {staff.byCampus.map((c) => {
              const active = c.total - c.vacancies;
              const fill = (active / c.total) * 100;
              const licPct = c.total > 0 ? (c.licensed / active) * 100 : 0;
              return (
                <tr key={c.campusId} style={{ borderBottom: `1px solid ${border.light}` }}>
                  <td style={{ padding: '10px 12px', fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: textColor.primary }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: fontSize.sm, fontFamily: font.mono, color: textColor.primary, textAlign: 'right' }}>
                    {c.total}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: fontSize.sm, fontFamily: font.mono, color: textColor.primary, textAlign: 'right' }}>
                    {active}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: fontSize.sm, fontFamily: font.mono, color: licPct >= 75 ? status.green : status.amber, textAlign: 'right' }}>
                    {fmtPct(licPct)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      <div style={{ width: 100, height: 8, background: border.light, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${fill}%`, height: '100%', background: fill >= 95 ? status.green : fill >= 90 ? status.amber : status.red, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                      <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.muted, minWidth: 36, textAlign: 'right' }}>{fmtPct(fill)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: c.vacancies > 3 ? status.red : c.vacancies > 0 ? status.amber : status.green, fontWeight: fontWeight.semibold }}>
                      {c.vacancies}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Vacancies by Department */}
      <Card>
        <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: textColor.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
          Open Vacancies by Department
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {staff.vacanciesByDept.map((v) => {
            const maxCount = Math.max(...staff.vacanciesByDept.map(x => x.count));
            const pct = (v.count / maxCount) * 100;
            return (
              <div key={v.dept} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 120, fontSize: fontSize.sm, color: textColor.secondary, flexShrink: 0 }}>{v.dept}</div>
                <div style={{ flex: 1, height: 10, background: border.light, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: v.count >= 10 ? status.red : v.count >= 5 ? status.amber : modColors.signal, borderRadius: 5, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ width: 28, fontSize: fontSize.sm, fontFamily: font.mono, fontWeight: fontWeight.semibold, color: v.count >= 10 ? status.red : v.count >= 5 ? status.amber : textColor.primary, textAlign: 'right' }}>
                  {v.count}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Roster Tab ───────────────────────────────────────────────────────────────

function RosterTab() {
  const [search, setSearch] = useState('');
  const [filterCampus, setFilterCampus] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const campuses = ['All', ...CAMPUSES.map(c => c.name)];
  const depts = ['All', 'Instruction', 'Special Ed.', 'Student Services', 'Operations', 'Admin'];
  const statuses = ['All', 'Active', 'On Leave', 'Vacancy'];

  const filtered = FULL_ROSTER.filter(m => {
    if (filterCampus !== 'All' && m.campus !== filterCampus) return false;
    if (filterDept !== 'All' && m.dept !== filterDept) return false;
    if (filterStatus !== 'All' && m.status !== filterStatus) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.role.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectStyle: React.CSSProperties = {
    fontSize: fontSize.sm, padding: '6px 10px', borderRadius: radius.md,
    border: `1px solid ${border.medium}`, background: bg.card, color: textColor.primary,
    cursor: 'pointer', outline: 'none',
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or role..."
          style={{ ...selectStyle, width: 220, padding: '6px 12px' }}
        />
        <select value={filterCampus} onChange={e => setFilterCampus(e.target.value)} style={selectStyle}>
          {campuses.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: fontSize.xs, color: textColor.muted, marginLeft: 'auto' }}>
          {filtered.length} of {FULL_ROSTER.length} staff
        </span>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Role</th>
                <th style={th}>Department</th>
                <th style={th}>Campus</th>
                <th style={{ ...th, textAlign: 'center' }}>Licensed</th>
                <th style={{ ...th, textAlign: 'right' }}>Years</th>
                <th style={{ ...th, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((m) => (
                <tr key={m.id} style={{
                  borderBottom: `1px solid ${border.light}`,
                  background: m.status === 'Vacancy' ? `${status.amber}08` : m.status === 'On Leave' ? `${status.blue}06` : 'transparent',
                }}>
                  <td style={{ padding: '9px 12px', fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: m.status === 'Vacancy' ? textColor.muted : textColor.primary }}>
                    {m.name}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: fontSize.sm, color: textColor.secondary }}>{m.role}</td>
                  <td style={{ padding: '9px 12px', fontSize: fontSize.xs, color: textColor.muted }}>{m.dept}</td>
                  <td style={{ padding: '9px 12px', fontSize: fontSize.xs, color: textColor.muted }}>{m.campus}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    {m.status !== 'Vacancy' && (
                      <span style={{ fontSize: fontSize.xs, color: m.licensed ? status.green : textColor.muted }}>
                        {m.licensed ? '✓' : '—'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: fontSize.xs, fontFamily: font.mono, color: textColor.muted, textAlign: 'right' }}>
                    {m.status !== 'Vacancy' ? m.yearsOfService : '—'}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <StatusBadge
                      label={m.status}
                      variant={m.status === 'Active' ? 'green' : m.status === 'On Leave' ? 'blue' : 'amber'}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <div style={{ padding: '10px 16px', fontSize: fontSize.xs, color: textColor.muted, borderTop: `1px solid ${border.light}`, background: bg.subtle }}>
              Showing first 100 of {filtered.length} results. Use filters to narrow.
            </div>
          )}
          {filtered.length === 0 && <EmptyState icon="◈" title="No Results" description="No staff members match the current filters." />}
        </div>
      </Card>
    </div>
  );
}

// ─── AI Assistant Tab ─────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function AIAssistantTab() {
  const staff = useStaff();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello. I'm your People Intelligence assistant. I have full access to the Noble Staff Handbook (SY25-26), the People Management Framework, the Leadership Framework, the Identity Framework, and the current staff roster of ${staff.activeStaff} active staff across 10 campuses.\n\nAsk me anything about benefits, PTO, retirement, licensure, leave policies, the C.A.R²E management framework, or specific staff data.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const staffSummary = `
Current Roster Summary:
- Total Positions: ${staff.totalPositions}
- Active Staff: ${staff.activeStaff}
- Vacancies: ${staff.vacancies}
- On Leave: ${staff.onLeave}
- Licensure Rate: ${staff.licensureRate}%
- Vacancy Rate: ${((staff.vacancies / staff.totalPositions) * 100).toFixed(1)}%
- Vacancies by Dept: ${staff.vacanciesByDept.map(v => `${v.dept}: ${v.count}`).join(', ')}
- Campus with most staff: Loop (112), Chatham (105), Woodlawn (97)
- Campus with fewest staff: North Lawndale (38), Roseland (62), Humboldt Park (62)
  `.trim();

  const systemPrompt = `You are the People Intelligence assistant embedded in Slate, a school network intelligence platform. You have deep knowledge of Noble Schools' HR policies, benefits, and people management frameworks.

${NOBLE_CONTEXT}

${staffSummary}

Answer questions about benefits, PTO, retirement (CTPF and 401k), health insurance, leaves of absence, the C.A.R²E management framework, Noble's core values, licensure requirements, the staff handbook, and staffing data. Be specific, accurate, and cite the relevant policy section when applicable. Keep answers concise and actionable. Never make up policy details — if you're uncertain, say so and direct to HR.`;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // OpenAI requires conversations to start with 'user' — strip the initial assistant welcome message
      const apiMessages = newMessages
        .filter((m, idx) => !(idx === 0 && m.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/anthropic-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 800,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Roster People AI error:', response.status, errText);
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();
      const reply = data?.content?.[0]?.text || data?.choices?.[0]?.message?.content || 'I was unable to generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Roster AI catch:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your network and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTED = [
    'What is the PTO policy for a 5-year employee?',
    'How does the CTPF pension work?',
    'What health benefits does Noble offer?',
    'How many Special Ed vacancies do we have?',
    'What is the C.A.R²E framework?',
    'What is the employee referral bonus?',
  ];

  const msgStyle = (role: 'user' | 'assistant'): React.CSSProperties => ({
    maxWidth: '80%',
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    background: role === 'user' ? modColors.signal : bg.card,
    color: role === 'user' ? '#fff' : textColor.primary,
    padding: '10px 14px',
    borderRadius: role === 'user' ? `${radius.lg} ${radius.lg} 4px ${radius.lg}` : `${radius.lg} ${radius.lg} ${radius.lg} 4px`,
    fontSize: fontSize.sm,
    lineHeight: 1.6,
    boxShadow: shadow.sm,
    border: role === 'assistant' ? `1px solid ${border.light}` : 'none',
    whiteSpace: 'pre-wrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)', minHeight: 500 }}>
      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
            Suggested Questions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUGGESTED.map(q => (
              <button key={q} onClick={() => setInput(q)} style={{
                fontSize: fontSize.xs, padding: '5px 10px', borderRadius: radius.full,
                border: `1px solid ${border.medium}`, background: bg.card, color: textColor.secondary,
                cursor: 'pointer', transition: transition.fast,
              }}
                onMouseEnter={e => (e.currentTarget.style.background = bg.subtle)}
                onMouseLeave={e => (e.currentTarget.style.background = bg.card)}
              >{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0', marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={msgStyle(m.role)}>{m.content}</div>
        ))}
        {loading && (
          <div style={{ ...msgStyle('assistant'), color: textColor.muted }}>
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10, borderTop: `1px solid ${border.light}`, paddingTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about benefits, PTO, retirement, vacancies, the handbook..."
          style={{
            flex: 1, fontSize: fontSize.sm, padding: '10px 14px',
            borderRadius: radius.lg, border: `1px solid ${border.medium}`,
            background: bg.card, color: textColor.primary, outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 20px', borderRadius: radius.lg, border: 'none',
            background: loading || !input.trim() ? border.medium : modColors.signal,
            color: loading || !input.trim() ? textColor.muted : '#fff',
            fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            transition: transition.fast,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'roster',   label: 'Full Roster' },
  { id: 'ai',       label: 'People AI' },
];

export default function RosterApp() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: fontSize.sm,
    fontWeight: activeTab === id ? fontWeight.semibold : fontWeight.normal,
    color: activeTab === id ? modColors.signal : textColor.muted,
    borderBottom: `2px solid ${activeTab === id ? modColors.signal : 'transparent'}`,
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: activeTab === id ? modColors.signal : 'transparent',
    transition: transition.fast,
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ padding: '24px 32px', background: bg.canvas, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: textColor.primary, margin: 0 }}>
            Roster
          </h1>
          <div style={{ fontSize: fontSize.xs, color: textColor.muted, fontFamily: font.mono }}>
            People Intelligence · Veritas Charter Schools
          </div>
        </div>
        <p style={{ fontSize: fontSize.sm, color: textColor.muted, margin: 0 }}>
          Staff roster, vacancy tracking, and AI-powered handbook and benefits assistant.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${border.light}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'roster' && <RosterTab />}
      {activeTab === 'ai' && <AIAssistantTab />}
    </div>
  );
}
