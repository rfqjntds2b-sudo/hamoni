// ============================================================
// Training Feature — Session Evaluator
// ============================================================
// Pure functions: evaluateSession + evaluateVFESession
// Maps raw SessionMetrics → SessionResult using level criteria.

import type {
  ExerciseId,
  SessionMetrics,
  SessionResult,
  CriterionResult,
  LevelCriteria,
} from './types';
import type { VoiceType } from './voice-type-offsets';
import { ONSET_PENALTY_MULTIPLIER } from './onset-detector';
import { getExerciseMeta } from './exercises';
import { getLevelCriteria, getVFELevelCriteria } from './level-criteria';
import { getNormalizedCriteria, getNormalizedVFECriteria } from './voice-type-offsets';
import {
  calculateStableAverage,
  weightedTrimmedMean,
  calculateSustainedDuration,
  calculatePitchSmoothness,
  calculateDynamicRange,
  calculateF0Deviation,
  calculateRangeOctaves,
  countPitchBreaks,
  calculateMeanCentsDeviation,
} from './analysis';
import {
  calculateRmsCV,
  calculateSustainedAirflow,
  calculateRmsContourScore,
  calculateSZRatio,
} from './breath-analysis';
import { checkSZRatioWarning } from './safety';

// ============================================================
// Constants
// ============================================================

/**
 * Must match ACCUMULATION_INTERVAL in use-training-analyzer.ts.
 * Frames are accumulated at this interval, so duration calculations
 * must use this value instead of the analysis.ts default (100ms).
 */
const ACCUMULATION_INTERVAL_MS = 200;

// ============================================================
// Internal helpers
// ============================================================

/** Standard deviation of non-zero values (sample / Bessel-corrected) */
function stdDev(values: number[]): number {
  const voiced = values.filter((v) => v > 0);
  if (voiced.length < 2) return 0;
  const mean = voiced.reduce((s, v) => s + v, 0) / voiced.length;
  const variance =
    voiced.reduce((s, v) => s + (v - mean) ** 2, 0) / (voiced.length - 1);
  return Math.sqrt(variance);
}

/** Get sustained voiced duration (longest consecutive voiced window) */
function getVoicedDuration(metrics: SessionMetrics): number {
  const frames = metrics.isVoicedValues.map((v) => ({ meetsCriteria: v }));
  return calculateSustainedDuration(frames, ACCUMULATION_INTERVAL_MS);
}

/**
 * Get only voiced, non-zero values from an array based on isVoicedValues mask.
 * The > 0 guard excludes 0-values that originate from null metrics on voiced
 * frames (e.g. jitter is null when there are not enough periods).
 */
function getVoicedValues(
  values: number[],
  isVoiced: boolean[],
): number[] {
  return values.filter((v, i) => i < isVoiced.length && isVoiced[i] && v > 0);
}

/**
 * Get voiced values together with their corresponding clarity weights.
 * Returns both arrays in parallel so they can be passed to weightedTrimmedMean.
 */
function getVoicedValuesWithWeights(
  values: number[],
  isVoiced: boolean[],
  clarityWeights?: number[],
): { vals: number[]; weights: number[] | undefined } {
  const vals: number[] = [];
  const weights: number[] = [];
  const hasWeights = clarityWeights && clarityWeights.length > 0;
  for (let i = 0; i < values.length; i++) {
    if (i < isVoiced.length && isVoiced[i] && values[i] > 0) {
      vals.push(values[i]);
      if (hasWeights) {
        weights.push(clarityWeights[i] ?? 1);
      }
    }
  }
  return { vals, weights: hasWeights ? weights : undefined };
}

// ============================================================
// evaluateCriteria — evaluate a single LevelCriteria against metrics
// ============================================================

function evaluateCriteria(
  criteria: LevelCriteria,
  metrics: SessionMetrics,
  isTimerMode: boolean,
): CriterionResult[] {
  const results: CriterionResult[] = [];

  // --- duration ---
  if (criteria.duration !== undefined) {
    if (isTimerMode) {
      // Timer mode: use raw duration from metrics
      results.push({
        name: 'duration',
        target: criteria.duration,
        actual: metrics.duration,
        unit: 's',
        passed: metrics.duration >= criteria.duration,
      });
    } else {
      // Sustained/pitch modes: use voiced duration
      const actualDuration = getVoicedDuration(metrics);
      results.push({
        name: 'duration',
        target: criteria.duration,
        actual: actualDuration,
        unit: 's',
        passed: actualDuration >= criteria.duration,
      });
    }
  }

  // For timer-only exercises, skip voice metrics entirely
  if (isTimerMode) return results;

  // --- jitterMax ---
  if (criteria.jitterMax !== undefined) {
    const { vals, weights } = getVoicedValuesWithWeights(
      metrics.jitterValues,
      metrics.isVoicedValues,
      metrics.clarityWeights,
    );
    const actual = weights
      ? weightedTrimmedMean(vals, weights)
      : calculateStableAverage(vals);
    results.push({
      name: 'jitterMax',
      target: criteria.jitterMax,
      actual,
      unit: '%',
      passed: actual <= criteria.jitterMax,
    });
  }

  // --- shimmerMax ---
  if (criteria.shimmerMax !== undefined) {
    const { vals, weights } = getVoicedValuesWithWeights(
      metrics.shimmerValues,
      metrics.isVoicedValues,
      metrics.clarityWeights,
    );
    const actual = weights
      ? weightedTrimmedMean(vals, weights)
      : calculateStableAverage(vals);
    results.push({
      name: 'shimmerMax',
      target: criteria.shimmerMax,
      actual,
      unit: '%',
      passed: actual <= criteria.shimmerMax,
    });
  }

  // --- hnrMin ---
  if (criteria.hnrMin !== undefined) {
    const { vals, weights } = getVoicedValuesWithWeights(
      metrics.hnrValues,
      metrics.isVoicedValues,
      metrics.clarityWeights,
    );
    const actual = weights
      ? weightedTrimmedMean(vals, weights)
      : calculateStableAverage(vals);
    results.push({
      name: 'hnrMin',
      target: criteria.hnrMin,
      actual,
      unit: 'dB',
      passed: actual >= criteria.hnrMin,
    });
  }

  // --- f0StdMax ---
  if (criteria.f0StdMax !== undefined) {
    const actual = stdDev(metrics.f0Values);
    results.push({
      name: 'f0StdMax',
      target: criteria.f0StdMax,
      actual,
      unit: 'Hz',
      passed: actual <= criteria.f0StdMax,
    });
  }

  // --- pitchSmooth ---
  if (criteria.pitchSmooth !== undefined) {
    const actual = calculatePitchSmoothness(metrics.f0Values);
    results.push({
      name: 'pitchSmooth',
      target: criteria.pitchSmooth,
      actual,
      unit: '%',
      passed: actual >= criteria.pitchSmooth,
    });
  }

  // --- dynamicRange ---
  if (criteria.dynamicRange !== undefined) {
    const actual = calculateDynamicRange(metrics.rmsValues);
    results.push({
      name: 'dynamicRange',
      target: criteria.dynamicRange,
      actual,
      unit: 'dB',
      passed: actual >= criteria.dynamicRange,
    });
  }

  // --- f0DeviationMax ---
  if (criteria.f0DeviationMax !== undefined) {
    const actual = calculateF0Deviation(metrics.f0Values);
    results.push({
      name: 'f0DeviationMax',
      target: criteria.f0DeviationMax,
      actual,
      unit: 'Hz',
      passed: actual <= criteria.f0DeviationMax,
    });
  }

  // --- rangeOctaves ---
  if (criteria.rangeOctaves !== undefined) {
    const actual = calculateRangeOctaves(metrics.f0Values);
    results.push({
      name: 'rangeOctaves',
      target: criteria.rangeOctaves,
      actual,
      unit: 'oct',
      passed: actual >= criteria.rangeOctaves,
    });
  }

  // --- maxBreaks ---
  if (criteria.maxBreaks !== undefined) {
    const actual = countPitchBreaks(metrics.f0Values);
    results.push({
      name: 'maxBreaks',
      target: criteria.maxBreaks,
      actual,
      unit: 'count',
      passed: actual <= criteria.maxBreaks,
    });
  }

  // --- vibrato criteria (vibratoRateMin/Max, vibratoExtentMin/Max, vibratoPeriodicity) ---
  // These are evaluated by the vibrato measure mode; the actual values are
  // passed through SessionMetrics as f0Values-derived stats from the analyzer.
  // For now we store vibrato metrics in the same SessionMetrics fields:
  //   f0Values[0] = avg vibrato rate (Hz)
  //   rmsValues[0] = avg vibrato extent (cents)
  //   shimmerValues[0] = vibrato periodicity (0-1)
  // This convention is set by use-training-analyzer when measureMode === 'vibrato'.
  if (criteria.vibratoRateMin !== undefined && criteria.vibratoRateMax !== undefined) {
    const actualRate = metrics.f0Values.length > 0 ? metrics.f0Values[0] : 0;
    results.push({
      name: 'vibratoRate',
      target: criteria.vibratoRateMin,
      actual: actualRate,
      unit: 'Hz',
      passed: actualRate >= criteria.vibratoRateMin && actualRate <= criteria.vibratoRateMax,
    });
  }

  if (criteria.vibratoExtentMin !== undefined) {
    const actualExtent = metrics.rmsValues.length > 0 ? metrics.rmsValues[0] : 0;
    const maxExtent = criteria.vibratoExtentMax ?? Infinity;
    results.push({
      name: 'vibratoExtent',
      target: criteria.vibratoExtentMin,
      actual: actualExtent,
      unit: 'cents',
      passed: actualExtent >= criteria.vibratoExtentMin && actualExtent <= maxExtent,
    });
  }

  if (criteria.vibratoPeriodicity !== undefined) {
    const actualPeriodicity = metrics.shimmerValues.length > 0 ? metrics.shimmerValues[0] : 0;
    results.push({
      name: 'vibratoPeriodicity',
      target: criteria.vibratoPeriodicity,
      actual: actualPeriodicity,
      unit: '',
      passed: actualPeriodicity >= criteria.vibratoPeriodicity,
    });
  }

  // --- rmsCVMax (breath control: coefficient of variation) ---
  if (criteria.rmsCVMax !== undefined) {
    const actual = calculateRmsCV(metrics.rmsValues);
    results.push({
      name: 'rmsCVMax',
      target: criteria.rmsCVMax,
      actual: Math.round(actual * 100) / 100,
      unit: '',
      passed: actual <= criteria.rmsCVMax,
    });
  }

  // --- sustainedTimeMin (breath control: longest sustained airflow) ---
  if (criteria.sustainedTimeMin !== undefined) {
    const actual = calculateSustainedAirflow(metrics.rmsValues);
    results.push({
      name: 'sustainedTimeMin',
      target: criteria.sustainedTimeMin,
      actual: Math.round(actual * 10) / 10,
      unit: 's',
      passed: actual >= criteria.sustainedTimeMin,
    });
  }

  // --- rmsContourMin (breath control: RMS contour consistency score) ---
  if (criteria.rmsContourMin !== undefined) {
    const actual = calculateRmsContourScore(metrics.rmsValues);
    results.push({
      name: 'rmsContourMin',
      target: criteria.rmsContourMin,
      actual,
      unit: '%',
      passed: actual >= criteria.rmsContourMin,
    });
  }

  // --- szRatioMin / szRatioMax (breath control: S/Z ratio range) ---
  if (criteria.szRatioMin !== undefined && criteria.szRatioMax !== undefined) {
    const actual = calculateSZRatio(metrics.rmsValues);
    const szWarning = checkSZRatioWarning(actual);
    results.push({
      name: 'szRatio',
      target: criteria.szRatioMin,
      actual: Math.round(actual * 100) / 100,
      unit: '',
      passed: actual >= criteria.szRatioMin && actual <= criteria.szRatioMax,
      ...(szWarning ? { warning: szWarning } : {}),
    });
  }

  // --- centsDeviationMax (pitch accuracy from target) ---
  if (criteria.centsDeviationMax !== undefined) {
    const actual = calculateMeanCentsDeviation(metrics.centsDeviationValues ?? []);
    results.push({
      name: 'centsDeviationMax',
      target: criteria.centsDeviationMax,
      actual: Math.round(actual),
      unit: 'cents',
      passed: actual <= criteria.centsDeviationMax,
    });
  }

  // --- vowelHitMin (formant-based: how many target vowels were reached) ---
  if (criteria.vowelHitMin !== undefined) {
    const actual = countVowelHits(metrics.f1Values ?? [], metrics.f2Values ?? []);
    results.push({
      name: 'vowelHitMin',
      target: criteria.vowelHitMin,
      actual,
      unit: '',
      passed: actual >= criteria.vowelHitMin,
    });
  }

  // --- vowelDwellMin (average dwell time per vowel zone in ms) ---
  if (criteria.vowelDwellMin !== undefined) {
    const actual = averageVowelDwell(metrics.f1Values ?? [], metrics.f2Values ?? [], ACCUMULATION_INTERVAL_MS);
    results.push({
      name: 'vowelDwellMin',
      target: criteria.vowelDwellMin,
      actual: Math.round(actual),
      unit: 'ms',
      passed: actual >= criteria.vowelDwellMin,
    });
  }

  // --- formantJitterMax (average F1/F2 jump between frames) ---
  if (criteria.formantJitterMax !== undefined) {
    const actual = averageFormantJitter(metrics.f1Values ?? [], metrics.f2Values ?? []);
    results.push({
      name: 'formantJitterMax',
      target: criteria.formantJitterMax,
      actual: Math.round(actual),
      unit: 'Hz',
      passed: actual <= criteria.formantJitterMax,
    });
  }

  return results;
}

// ============================================================
// Formant evaluation helpers
// ============================================================

import { KOREAN_VOWELS, getVowelTarget } from '@/lib/voice/vowel-targets';

/**
 * Count how many distinct vowel zones the user visited.
 * A vowel is "hit" if at least 3 consecutive frames fall within its tolerance ellipse.
 */
function countVowelHits(f1s: number[], f2s: number[]): number {
  if (f1s.length === 0) return 0;
  const vowels = KOREAN_VOWELS;
  const hitSet = new Set<string>();
  const consecutiveCount: Record<string, number> = {};
  const HIT_THRESHOLD = 3; // consecutive frames

  for (let i = 0; i < f1s.length; i++) {
    const f1 = f1s[i];
    const f2 = f2s[i];
    if (!f1 || !f2) continue;

    for (const v of vowels) {
      const t = getVowelTarget(v, 'male'); // gender-neutral approx for evaluation
      const nF1 = (f1 - t.f1) / v.toleranceF1;
      const nF2 = (f2 - t.f2) / v.toleranceF2;
      if (nF1 * nF1 + nF2 * nF2 <= 1.0) {
        consecutiveCount[v.label] = (consecutiveCount[v.label] ?? 0) + 1;
        if (consecutiveCount[v.label] >= HIT_THRESHOLD) {
          hitSet.add(v.label);
        }
      } else {
        consecutiveCount[v.label] = 0;
      }
    }
  }

  return hitSet.size;
}

/**
 * Average time (ms) spent within any vowel zone per visit.
 */
function averageVowelDwell(f1s: number[], f2s: number[], intervalMs: number): number {
  if (f1s.length === 0) return 0;
  const vowels = KOREAN_VOWELS;
  let totalDwell = 0;
  let visitCount = 0;
  let currentRun = 0;

  for (let i = 0; i < f1s.length; i++) {
    const f1 = f1s[i];
    const f2 = f2s[i];
    if (!f1 || !f2) { if (currentRun > 0) { totalDwell += currentRun; visitCount++; currentRun = 0; } continue; }

    let inAnyZone = false;
    for (const v of vowels) {
      const t = getVowelTarget(v, 'male');
      const nF1 = (f1 - t.f1) / v.toleranceF1;
      const nF2 = (f2 - t.f2) / v.toleranceF2;
      if (nF1 * nF1 + nF2 * nF2 <= 1.0) { inAnyZone = true; break; }
    }

    if (inAnyZone) {
      currentRun += intervalMs;
    } else if (currentRun > 0) {
      totalDwell += currentRun;
      visitCount++;
      currentRun = 0;
    }
  }
  if (currentRun > 0) { totalDwell += currentRun; visitCount++; }

  return visitCount > 0 ? totalDwell / visitCount : 0;
}

/**
 * Average Euclidean distance between consecutive F1/F2 frames.
 * Lower = smoother transitions.
 */
function averageFormantJitter(f1s: number[], f2s: number[]): number {
  if (f1s.length < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < f1s.length; i++) {
    if (f1s[i] > 0 && f1s[i - 1] > 0 && f2s[i] > 0 && f2s[i - 1] > 0) {
      const d = Math.sqrt((f1s[i] - f1s[i - 1]) ** 2 + (f2s[i] - f2s[i - 1]) ** 2);
      sum += d;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ============================================================
// evaluateSession — main entry point for non-VFE exercises
// ============================================================

/**
 * Evaluate a single exercise session against its level criteria.
 * Returns a SessionResult with pass/fail and per-criterion breakdowns.
 * xpEarned is always 0 — use calculateXPWithBonuses separately.
 */
export function evaluateSession(
  exerciseId: ExerciseId,
  level: number,
  metrics: SessionMetrics,
  voiceType?: VoiceType | null,
): SessionResult {
  const meta = getExerciseMeta(exerciseId);
  const criteria = getNormalizedCriteria(exerciseId, level, voiceType ?? null);
  const isTimerMode = meta.measureMode === 'timer';

  const results = evaluateCriteria(criteria, metrics, isTimerMode);

  // Onset penalty: timer 모드 제외, hard/breathy onset 체크
  // Level 1-2에서는 hard onset을 경고만 표시 (passed: true), level 3+에서만 실패 처리
  if (!isTimerMode && metrics.onsetType && metrics.onsetType !== 'balanced') {
    const isHardOnset = metrics.onsetType === 'hard';
    results.push({
      name: isHardOnset ? 'onsetHard' : 'onsetBreathy',
      target: 0,
      actual: 1,
      unit: '',
      passed: isHardOnset && level >= 3 ? false : true,
    });
  }

  const passed = results.length > 0 && results.every((r) => r.passed);

  return {
    passed,
    results,
    xpEarned: 0,
    duration: metrics.duration,
  };
}

// ============================================================
// evaluateVFESession — VFE 4-part evaluation
// ============================================================

/**
 * Evaluate a VFE session with 4 sub-exercises (A/B/C/D).
 * ALL sub-exercises must pass for overall pass.
 * xpEarned is always 0 — use calculateXPWithBonuses separately.
 */
export function evaluateVFESession(
  level: number,
  vfeMetrics: {
    a: SessionMetrics;
    b: SessionMetrics;
    c: SessionMetrics;
    d: SessionMetrics;
  },
  voiceType?: VoiceType | null,
): SessionResult {
  const vfeCriteria = getNormalizedVFECriteria(level, voiceType ?? null);
  const allResults: CriterionResult[] = [];

  // Sub-exercise A: sustained tone — uses full LevelCriteria
  const aResults = evaluateCriteria(vfeCriteria.a, vfeMetrics.a, false);
  for (const r of aResults) {
    allResults.push({ ...r, name: `A: ${r.name}` });
  }

  // Sub-exercise B: ascending glide — pitchSmooth, rangeOctaves, maxBreaks
  const bCriteria: LevelCriteria = {
    duration: 0,
    pitchSmooth: vfeCriteria.b.pitchSmooth,
    rangeOctaves: vfeCriteria.b.rangeOctaves,
    maxBreaks: vfeCriteria.b.maxBreaks,
  };
  const bResults = evaluateCriteria(bCriteria, vfeMetrics.b, false);
  for (const r of bResults) {
    // Skip the duration=0 criterion
    if (r.name === 'duration') continue;
    allResults.push({ ...r, name: `B: ${r.name}` });
  }

  // Sub-exercise C: descending glide — same structure as B
  const cCriteria: LevelCriteria = {
    duration: 0,
    pitchSmooth: vfeCriteria.c.pitchSmooth,
    rangeOctaves: vfeCriteria.c.rangeOctaves,
    maxBreaks: vfeCriteria.c.maxBreaks,
  };
  const cResults = evaluateCriteria(cCriteria, vfeMetrics.c, false);
  for (const r of cResults) {
    if (r.name === 'duration') continue;
    allResults.push({ ...r, name: `C: ${r.name}` });
  }

  // Sub-exercise D: sustained tone — uses full LevelCriteria
  const dResults = evaluateCriteria(vfeCriteria.d, vfeMetrics.d, false);
  for (const r of dResults) {
    allResults.push({ ...r, name: `D: ${r.name}` });
  }

  const passed = allResults.length > 0 && allResults.every((r) => r.passed);
  const totalDuration =
    vfeMetrics.a.duration +
    vfeMetrics.b.duration +
    vfeMetrics.c.duration +
    vfeMetrics.d.duration;

  return {
    passed,
    results: allResults,
    xpEarned: 0,
    duration: totalDuration,
  };
}
