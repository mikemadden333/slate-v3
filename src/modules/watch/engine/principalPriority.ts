/**
 * Principal Priority Engine — "Which principals should I call today?"
 *
 * Not a ranking. A recommendation with reasoning.
 * Returns 0-3 principals based on actual urgency signals.
 * If nothing is urgent, returns empty — silence is good news.
 */

import type { CampusRisk, ContagionZone, Incident } from './types';
import { CAMPUSES, type Campus } from '../data/campuses';
import { haversine } from './geo';

export interface PrincipalCallRecommendation {
  campusId: number;
  campusName: string;
  urgency: 'CALL NOW' | 'CALL TODAY' | 'MONITOR';
  reason: string;
  detail: string;
  suggestedMessage: string;
}

function getCampus(id: number): Campus {
  return CAMPUSES.find(c => c.id === id) ?? CAMPUSES[0];
}

export function getPrincipalCallList(
  campusRisks: CampusRisk[],
  _zones: ContagionZone[],
  incidents: Incident[],
): PrincipalCallRecommendation[] {

  const scored = campusRisks.map(risk => {
    let urgencyScore = 0;
    const reasons: string[] = [];
    const campus = getCampus(risk.campusId);

    // Retaliation window open — highest urgency
    const retZone = risk.contagionZones.find(z => z.retWin && z.ageH >= 18 && z.ageH <= 72);
    if (retZone) {
      const hoursRemaining = Math.round(Math.max(0, 72 - retZone.ageH));
      urgencyScore += 100;
      reasons.push(`Active retaliation window — ${hoursRemaining}h remaining`);
    }

    // Homicide within 0.5mi in last 24h
    const recentHomicide = incidents.find(i => {
      if (!i.type.includes('HOMICIDE')) return false;
      const ms = new Date(i.date).getTime();
      if (isNaN(ms)) return false;
      if ((Date.now() - ms) > 24 * 3600000) return false;
      return haversine(campus.lat, campus.lng, i.lat, i.lng) <= 0.5;
    });
    if (recentHomicide) {
      const dist = haversine(campus.lat, campus.lng, recentHomicide.lat, recentHomicide.lng);
      const hoursAgo = Math.round((Date.now() - new Date(recentHomicide.date).getTime()) / 3600000);
      urgencyScore += 80;
      reasons.push(`Homicide ${dist.toFixed(1)}mi away ${hoursAgo}h ago`);
    }

    // ICE active near campus (via contagion zones isn't direct, check risk label)
    // We check if any contagion zone has the campus flagged
    // The ICE check is done externally — we'll use a signal from the risk label
    // For now, only use the data we have

    // Score jumped significantly — using label severity as proxy
    if (risk.label === 'CRITICAL') {
      urgencyScore += 70;
      if (!reasons.some(r => r.includes('retaliation'))) {
        reasons.push('Campus at CRITICAL risk');
      }
    } else if (risk.label === 'HIGH') {
      urgencyScore += 50;
      if (!reasons.some(r => r.includes('Homicide'))) {
        reasons.push('Campus at HIGH risk');
      }
    }

    // Friday dismissal approaching with elevated conditions
    const now = new Date();
    const isFriday = now.getDay() === 5;
    const hour = now.getHours();
    if (isFriday && hour >= 11 && risk.label !== 'LOW') {
      urgencyScore += 40;
      const hoursToD = Math.max(0, 15 - hour);
      reasons.push(`Friday dismissal in ${hoursToD}h — elevated conditions`);
    }

    // Multiple contagion zones active
    const acuteCount = risk.contagionZones.filter(z => z.phase === 'ACUTE').length;
    if (acuteCount >= 2) {
      urgencyScore += 35;
      reasons.push(`${acuteCount} ACUTE contagion zones near campus`);
    }

    // Risk trending — using score as proxy
    if (risk.score >= 60) {
      urgencyScore += 20;
      if (!reasons.some(r => r.includes('risk') || r.includes('CRITICAL') || r.includes('HIGH'))) {
        reasons.push(`Risk score at ${risk.score} — well above normal`);
      }
    }

    return { risk, campus, urgencyScore, reasons };
  });

  // Sort by urgency, take top 3 with actual urgency
  const top3 = scored
    .filter(s => s.urgencyScore > 0)
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, 3);

  // If nothing is urgent, return empty — not a placeholder
  if (top3.length === 0) return [];

  return top3.map(({ risk, campus, urgencyScore, reasons }) => ({
    campusId: risk.campusId,
    campusName: campus.name,
    urgency: urgencyScore >= 80 ? 'CALL NOW' as const : urgencyScore >= 40 ? 'CALL TODAY' as const : 'MONITOR' as const,
    reason: reasons[0],
    detail: reasons.slice(1, 3).join('. ') || 'No additional context.',
    suggestedMessage: buildSuggestedMessage(campus, reasons),
  }));
}

function buildSuggestedMessage(campus: Campus, reasons: string[]): string {
  return `"Hi, this is [your name] from Noble central office. ` +
    `I'm checking in on ${campus.name} — ` +
    `${reasons[0].toLowerCase()}. ` +
    `Can you give me a status update on conditions this morning?"`;
}
