// ============================================================
// Criterion Coaching — Per-criterion failure coaching tips
// ============================================================

import type { CriterionResult, ExerciseId } from './types';
import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';

export type FailureSeverity = 'near_miss' | 'moderate' | 'far_off';

export interface CriterionCoachingItem {
  criterionName: string;
  label: string;
  tip: string;
  exerciseTip: string | null;
  actual: number;
  target: number;
  unit: string;
  severity: FailureSeverity;
  diagnosis: string;
  bodyGuide: string;
  vfeSub?: string;
}

// ============================================================
// Severity helpers
// ============================================================

const MAX_CRITERIA = new Set([
  'jitterMax', 'shimmerMax', 'f0StdMax', 'f0DeviationMax', 'rmsCVMax', 'maxBreaks', 'centsDeviationMax',
]);
const MIN_CRITERIA = new Set([
  'hnrMin', 'sustainedTimeMin', 'rmsContourMin', 'pitchSmooth',
  'rangeOctaves', 'dynamicRange', 'vibratoPeriodicity', 'vibratoExtent',
]);

export function getCriterionDirection(name: string): 'max' | 'min' {
  if (MAX_CRITERIA.has(name)) return 'max';
  if (MIN_CRITERIA.has(name)) return 'min';
  if (name === 'duration') return 'min';
  return 'max'; // default (vibratoRate, szRatio, unknown)
}

export function getFailureSeverity(
  actual: number,
  target: number,
  direction: 'max' | 'min',
): FailureSeverity {
  const ratio = direction === 'max' ? actual / target : target / actual;
  if (ratio <= 1.2) return 'near_miss';
  if (ratio <= 1.8) return 'moderate';
  return 'far_off';
}

/**
 * Parse VFE compound criterion names like "A: jitterMax" into
 * a sub-exercise label and the base criterion name.
 */
function parseVFEName(name: string): { sub: string | null; baseName: string } {
  const match = name.match(/^([A-D]):\s*(.+)$/);
  if (match) return { sub: match[1], baseName: match[2] };
  return { sub: null, baseName: name };
}

/**
 * Generate per-criterion coaching items for failed criteria in a session.
 * Returns an empty array if all criteria passed.
 */
export function generateCriterionCoaching(
  results: CriterionResult[],
  exerciseId: ExerciseId,
  locale: Locale = 'ko',
): CriterionCoachingItem[] {
  const tc = createT(locale, 'coaching');
  const failed = results.filter(cr => !cr.passed);

  return failed.map(cr => {
    const { sub, baseName } = parseVFEName(cr.name);
    const labelKey = `criterionLabels.${baseName}`;
    const tipKey = `failureCoaching.${baseName}`;
    const exTipKey = `exerciseCoaching.${exerciseId}.${baseName}`;
    const diagnosisKey = `diagnosis.${baseName}`;
    const bodyGuideKey = `bodyGuide.${baseName}`;

    const label = tc(labelKey);
    const tip = tc(tipKey);
    const exTipRaw = tc(exTipKey);
    const diagnosisRaw = tc(diagnosisKey);
    const bodyGuideRaw = tc(bodyGuideKey);
    // If i18n returns the key itself, no translation exists
    const exerciseTip = exTipRaw !== exTipKey ? exTipRaw : null;

    const direction = getCriterionDirection(baseName);
    const severity = getFailureSeverity(cr.actual, cr.target, direction);

    return {
      criterionName: cr.name,
      label: label !== labelKey ? label : baseName,
      tip: tip !== tipKey ? tip : '',
      exerciseTip,
      actual: cr.actual,
      target: cr.target,
      unit: cr.unit ?? '',
      severity,
      diagnosis: diagnosisRaw !== diagnosisKey ? diagnosisRaw : '',
      bodyGuide: bodyGuideRaw !== bodyGuideKey ? bodyGuideRaw : '',
      ...(sub ? { vfeSub: sub } : {}),
    };
  });
}
