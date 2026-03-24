/**
 * Watch v2 — Violent Crime Classifier
 * The ONLY filter. If it doesn't pass this, it doesn't exist in Watch.
 * Violent crime ONLY: homicide, shooting, shots fired, weapons, stabbing, sexual assault.
 * NO battery, NO assault, NO carjacking, NO theft, NO property crime.
 */

import type { ViolentCrimeType } from './types';
import { VIOLENT_KEYWORDS } from './types';

/**
 * Classify raw text into a violent crime type, or return null if not violent.
 * Order matters — check most severe first.
 */
export function classifyViolentCrime(text: string): ViolentCrimeType | null {
  const t = text.toLowerCase();

  // Explicit exclusions — these are NOT violent crime for Watch purposes
  const EXCLUSIONS = [
    'carjack', 'car jack', 'motor vehicle theft', 'auto theft',
    'battery', 'assault', 'simple assault', 'aggravated assault',
    'theft', 'burglary', 'robbery', 'larceny', 'shoplifting',
    'vandalism', 'criminal damage', 'trespass', 'disorderly',
    'narcotics', 'drug', 'dui', 'traffic',
  ];

  // Check for violent keywords first
  const priorities: ViolentCrimeType[] = [
    'HOMICIDE', 'SHOOTING', 'SHOTS_FIRED', 'SEXUAL_ASSAULT', 'STABBING', 'WEAPONS',
  ];

  let matchedType: ViolentCrimeType | null = null;

  for (const crimeType of priorities) {
    const keywords = VIOLENT_KEYWORDS[crimeType];
    if (keywords.some(kw => t.includes(kw))) {
      matchedType = crimeType;
      break;
    }
  }

  if (!matchedType) return null;

  // If the text ONLY matches an exclusion and not a violent keyword, reject it
  // But if it matches both (e.g., "shot during robbery"), keep it
  // This is the right behavior — the shooting matters even if robbery was the context

  return matchedType;
}

/**
 * Classify a CPD primary_type string.
 * CPD uses standardized type codes.
 */
export function classifyCPDType(primaryType: string): ViolentCrimeType | null {
  const t = primaryType.toUpperCase().trim();

  if (t === 'HOMICIDE') return 'HOMICIDE';
  if (t === 'CRIM SEXUAL ASSAULT' || t === 'CRIMINAL SEXUAL ASSAULT') return 'SEXUAL_ASSAULT';

  // For other CPD types, check description too
  if (t.includes('HOMICIDE')) return 'HOMICIDE';
  if (t.includes('SEXUAL')) return 'SEXUAL_ASSAULT';

  // CPD doesn't have a "SHOOTING" type — shootings come through as
  // BATTERY with description "FIRST DEGREE MURDER" or WEAPONS VIOLATION
  // We need the description field to classify properly
  return null;
}

/**
 * Classify a CPD incident using both primary_type and description.
 */
export function classifyCPDIncident(primaryType: string, description: string): ViolentCrimeType | null {
  // First check primary type
  const fromType = classifyCPDType(primaryType);
  if (fromType) return fromType;

  const combined = `${primaryType} ${description}`.toLowerCase();

  // Check for weapons violations (CPD primary_type)
  if (primaryType.toUpperCase().includes('WEAPONS VIOLATION')) return 'WEAPONS';

  // Check combined text
  return classifyViolentCrime(combined);
}

/**
 * Check if a Citizen incident title is violent crime.
 */
export function classifyCitizenTitle(title: string): ViolentCrimeType | null {
  return classifyViolentCrime(title);
}

/**
 * Check if a news headline describes violent crime.
 */
export function classifyNewsHeadline(title: string, description: string): ViolentCrimeType | null {
  return classifyViolentCrime(`${title} ${description}`);
}
