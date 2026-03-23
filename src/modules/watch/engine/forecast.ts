/**
 * 7-Day Violence Forecast Engine
 * Projects risk forward based on contagion zone trajectories,
 * day-of-week patterns, seasonal patterns, and weather forecast.
 */

import type { Campus } from '../data/campuses';
import type { Incident, ContagionZone, ForecastDay, DailyWeather } from './types';
import { DOW_BONUS } from '../data/weights';
import { isSchoolDay, getCalendarContext } from '../data/calendar';
import { getCampusExposure } from './contagion';

/**
 * Build a 7-day forecast for a campus.
 * Pure function — runs client-side, no additional API calls.
 * Rebuilds every time contagion zones are rebuilt (every 10 minutes).
 */
export function buildWeekForecast(
  campus: Campus,
  _incidents: Incident[],
  zones: ContagionZone[],
  weatherForecast: DailyWeather[],
): ForecastDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() + i * 86_400_000);
    const dow = date.getDay();
    const isSD = isSchoolDay(date);
    const wx = weatherForecast[i];
    const calCtx = getCalendarContext(date);

    // Project contagion zones forward — where will they be in i days?
    const projectedZones: ContagionZone[] = zones
      .map(z => {
        const projectedAgeH = z.ageH + i * 24;
        let phase: 'ACUTE' | 'ACTIVE' | 'WATCH' | null;
        let radius: number;
        if (projectedAgeH < 72) {
          phase = 'ACUTE';
          radius = 0.5;
        } else if (projectedAgeH < 336) {
          phase = 'ACTIVE';
          radius = 1.0;
        } else if (projectedAgeH < 3000) {
          phase = 'WATCH';
          radius = 1.5;
        } else {
          phase = null;
          radius = 0;
        }
        if (phase === null) return null;
        return {
          ...z,
          ageH: projectedAgeH,
          phase,
          radius,
          retWin: projectedAgeH >= 18 && projectedAgeH <= 72,
          daysLeft: Math.max(0, Math.ceil((3000 - projectedAgeH) / 24)),
        };
      })
      .filter((z): z is ContagionZone => z !== null);

    const exposedZones = getCampusExposure(campus, projectedZones);
    const hasAcute = exposedZones.some(z => z.phase === 'ACUTE');
    const hasActive = exposedZones.some(z => z.phase === 'ACTIVE');
    const tempRisk = (wx?.apparent_temp_max ?? 0) > 88;
    const fridayPM = dow === 5;

    const drivers: string[] = [];
    if (hasAcute) {
      const retZones = exposedZones.filter(z => z.retWin);
      drivers.push(
        retZones.length > 0
          ? 'Contagion: active retaliation window (18-72h peak risk)'
          : 'Contagion: ACUTE zone within 72h of homicide',
      );
    }
    if (hasActive) drivers.push('Contagion: active zone nearby (elevated risk)');
    if (fridayPM) drivers.push('Friday afternoon pattern');
    if (tempRisk) drivers.push(`${wx!.apparent_temp_max}°F forecast`);
    if (!isSD) drivers.push('No school — network monitoring');
    if (calCtx.includes('Interim') || calCtx.includes('Finals')) {
      drivers.push(calCtx);
    }

    const riskPoints =
      (hasAcute ? 30 : hasActive ? 15 : 0) +
      (fridayPM ? 10 : 0) +
      (tempRisk ? 8 : 0) +
      (DOW_BONUS[dow] ?? 0);

    const label: 'LOW' | 'ELEVATED' | 'HIGH' =
      riskPoints >= 35 ? 'HIGH' : riskPoints >= 18 ? 'ELEVATED' : 'LOW';

    // Confidence decreases with distance into the future
    const confidence = Math.min(
      92,
      60 + drivers.length * 10 - Math.max(0, (i - 2) * 5),
    );

    return {
      date: date.toISOString(),
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      label,
      confidence,
      drivers,
      contagionPhase: hasAcute ? 'ACUTE' : hasActive ? 'ACTIVE' : null,
      weatherRisk: tempRisk,
      isSchoolDay: isSD,
    };
  });
}
