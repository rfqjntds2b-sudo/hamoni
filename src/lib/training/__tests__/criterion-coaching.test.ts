import { describe, it, expect } from 'vitest';
import { generateCriterionCoaching, getFailureSeverity, getCriterionDirection } from '../criterion-coaching';
import type { CriterionResult, ExerciseId } from '../types';

// Helper: create a CriterionResult
function makeCriterion(
  name: string,
  passed: boolean,
  actual = 2.5,
  target = 1.0,
  unit = '%',
): CriterionResult {
  return { name, passed, actual, target, unit };
}

describe('generateCriterionCoaching', () => {
  it('returns empty array when all criteria passed', () => {
    const results: CriterionResult[] = [
      makeCriterion('jitterMax', true),
      makeCriterion('shimmerMax', true),
      makeCriterion('hnrMin', true),
    ];
    const items = generateCriterionCoaching(results, 'humming', 'ko');
    expect(items).toHaveLength(0);
  });

  it('returns 1 coaching item for a single failed criterion with correct label and tip', () => {
    const results: CriterionResult[] = [
      makeCriterion('jitterMax', false, 3.5, 2.0, '%'),
      makeCriterion('shimmerMax', true),
    ];
    const items = generateCriterionCoaching(results, 'humming', 'ko');
    expect(items).toHaveLength(1);
    expect(items[0].criterionName).toBe('jitterMax');
    expect(items[0].label).toBe('주파수 변동 (Jitter)');
    expect(items[0].tip).toBeTruthy();
    expect(items[0].tip.length).toBeGreaterThan(0);
    expect(items[0].actual).toBe(3.5);
    expect(items[0].target).toBe(2.0);
    expect(items[0].unit).toBe('%');
    // New fields
    expect(items[0].severity).toBe('moderate');
    expect(items[0].diagnosis).toBeTruthy();
    expect(items[0].bodyGuide).toBeTruthy();
  });

  it('returns items for each failed criterion when multiple fail', () => {
    const results: CriterionResult[] = [
      makeCriterion('jitterMax', false, 3.0, 2.0, '%'),
      makeCriterion('shimmerMax', false, 5.0, 3.0, '%'),
      makeCriterion('hnrMin', true, 22, 15, 'dB'),
    ];
    const items = generateCriterionCoaching(results, 'straw', 'ko');
    expect(items).toHaveLength(2);
    expect(items[0].criterionName).toBe('jitterMax');
    expect(items[1].criterionName).toBe('shimmerMax');
  });

  it('parses VFE compound name "A: jitterMax" correctly', () => {
    const results: CriterionResult[] = [
      makeCriterion('A: jitterMax', false, 3.0, 2.0, '%'),
    ];
    const items = generateCriterionCoaching(results, 'vfe', 'ko');
    expect(items).toHaveLength(1);
    expect(items[0].vfeSub).toBe('A');
    expect(items[0].label).toBe('주파수 변동 (Jitter)');
    expect(items[0].criterionName).toBe('A: jitterMax');
  });

  it('returns exercise-specific tip when present', () => {
    const results: CriterionResult[] = [
      makeCriterion('jitterMax', false, 3.0, 2.0, '%'),
    ];
    // humming has an exerciseCoaching.humming.jitterMax entry
    const items = generateCriterionCoaching(results, 'humming', 'ko');
    expect(items).toHaveLength(1);
    expect(items[0].exerciseTip).toBeTruthy();
    expect(items[0].exerciseTip!.length).toBeGreaterThan(0);
  });

  it('returns null exerciseTip when not present for exercise', () => {
    const results: CriterionResult[] = [
      makeCriterion('jitterMax', false, 3.0, 2.0, '%'),
    ];
    // breathing has no exerciseCoaching entry for jitterMax
    const items = generateCriterionCoaching(results, 'breathing', 'ko');
    expect(items).toHaveLength(1);
    expect(items[0].exerciseTip).toBeNull();
  });

  it('falls back gracefully for unknown criterion name', () => {
    const results: CriterionResult[] = [
      makeCriterion('unknownMetric', false, 5.0, 3.0, ''),
    ];
    const items = generateCriterionCoaching(results, 'humming', 'ko');
    expect(items).toHaveLength(1);
    // label falls back to baseName, tip falls back to empty string
    expect(items[0].label).toBe('unknownMetric');
    expect(items[0].tip).toBe('');
    expect(items[0].exerciseTip).toBeNull();
    // severity still computed, diagnosis/bodyGuide fallback to empty
    expect(items[0].severity).toBe('moderate');
    expect(items[0].diagnosis).toBe('');
    expect(items[0].bodyGuide).toBe('');
  });

  it('works with English locale', () => {
    const results: CriterionResult[] = [
      makeCriterion('shimmerMax', false, 5.0, 3.0, '%'),
    ];
    const items = generateCriterionCoaching(results, 'straw', 'en');
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Amplitude Variation (Shimmer)');
    expect(items[0].tip).toBeTruthy();
    expect(items[0].exerciseTip).toBeTruthy();
  });

  it('works with Japanese locale', () => {
    const results: CriterionResult[] = [
      makeCriterion('hnrMin', false, 8, 15, 'dB'),
    ];
    const items = generateCriterionCoaching(results, 'humming', 'ja');
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('HNR (信号対雑音比)');
    expect(items[0].tip).toBeTruthy();
    expect(items[0].exerciseTip).toBeTruthy();
  });

  it('does not include vfeSub for non-VFE criterion names', () => {
    const results: CriterionResult[] = [
      makeCriterion('duration', false, 3.0, 5.0, '초'),
    ];
    const items = generateCriterionCoaching(results, 'breathing', 'ko');
    expect(items).toHaveLength(1);
    expect(items[0].vfeSub).toBeUndefined();
  });

  it('handles new breath-control criterion keys', () => {
    const results: CriterionResult[] = [
      makeCriterion('rmsCVMax', false, 35, 25, '%'),
      makeCriterion('szRatio', false, 0.6, 0.8, ''),
    ];
    const items = generateCriterionCoaching(results, 'sz_ratio' as ExerciseId, 'ko');
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('기류 일관성');
    expect(items[0].tip).toBeTruthy();
    expect(items[0].severity).toBeDefined();
    expect(items[0].diagnosis).toBeTruthy();
    expect(items[0].bodyGuide).toBeTruthy();
    expect(items[1].label).toBe('S/Z 비율');
    expect(items[1].tip).toBeTruthy();
    expect(items[1].severity).toBeDefined();
  });

  it('computes near_miss severity for jitter slightly over threshold', () => {
    const results: CriterionResult[] = [
      makeCriterion('jitterMax', false, 2.2, 2.0, '%'),
    ];
    const items = generateCriterionCoaching(results, 'humming', 'ko');
    expect(items[0].severity).toBe('near_miss');
  });

  it('computes far_off severity for jitter far over threshold', () => {
    const results: CriterionResult[] = [
      makeCriterion('jitterMax', false, 5.0, 2.0, '%'),
    ];
    const items = generateCriterionCoaching(results, 'humming', 'ko');
    expect(items[0].severity).toBe('far_off');
  });

  it('computes severity for min-direction criterion (hnrMin)', () => {
    // target = 15, actual = 8 => ratio = 15/8 = 1.875 => far_off
    const results: CriterionResult[] = [
      makeCriterion('hnrMin', false, 8, 15, 'dB'),
    ];
    const items = generateCriterionCoaching(results, 'humming', 'ko');
    expect(items[0].severity).toBe('far_off');
  });

  it('computes severity for duration (min direction)', () => {
    // target = 5, actual = 4.5 => ratio = 5/4.5 = 1.11 => near_miss
    const results: CriterionResult[] = [
      makeCriterion('duration', false, 4.5, 5.0, 's'),
    ];
    const items = generateCriterionCoaching(results, 'breathing', 'ko');
    expect(items[0].severity).toBe('near_miss');
  });
});

describe('getFailureSeverity', () => {
  it('returns near_miss when ratio <= 1.2', () => {
    expect(getFailureSeverity(2.3, 2.0, 'max')).toBe('near_miss');
  });

  it('returns moderate when ratio > 1.2 and <= 1.8', () => {
    expect(getFailureSeverity(3.0, 2.0, 'max')).toBe('moderate');
  });

  it('returns far_off when ratio > 1.8', () => {
    expect(getFailureSeverity(4.0, 2.0, 'max')).toBe('far_off');
  });

  it('handles min direction correctly', () => {
    // target / actual: 15 / 12 = 1.25 => moderate
    expect(getFailureSeverity(12, 15, 'min')).toBe('moderate');
  });

  it('returns near_miss for min direction close to target', () => {
    // target / actual: 15 / 14 = 1.07 => near_miss
    expect(getFailureSeverity(14, 15, 'min')).toBe('near_miss');
  });
});

describe('getCriterionDirection', () => {
  it('returns max for jitterMax', () => {
    expect(getCriterionDirection('jitterMax')).toBe('max');
  });

  it('returns max for shimmerMax', () => {
    expect(getCriterionDirection('shimmerMax')).toBe('max');
  });

  it('returns min for hnrMin', () => {
    expect(getCriterionDirection('hnrMin')).toBe('min');
  });

  it('returns min for duration', () => {
    expect(getCriterionDirection('duration')).toBe('min');
  });

  it('returns min for pitchSmooth', () => {
    expect(getCriterionDirection('pitchSmooth')).toBe('min');
  });

  it('returns max for vibratoRate (default)', () => {
    expect(getCriterionDirection('vibratoRate')).toBe('max');
  });

  it('returns max for unknown criteria (default)', () => {
    expect(getCriterionDirection('unknownThing')).toBe('max');
  });
});
