// ============================================================
// Comprehensive Voice Assessment — Scoring & Storage
// ============================================================

import type { VoiceAssessmentScores, VoiceAssessmentResult } from './types';

/** Clamp `value` to the inclusive range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================================
// Score Calculation
// ============================================================

/**
 * Map a raw metric to 0-100 score.
 * For "lower is better" metrics (jitter, shimmer, f0Std, f0Deviation, pitchBreaks):
 *   score = 100 * (1 - (value - best) / (worst - best))
 * For "higher is better" metrics (hnr, voicedDuration, rangeOctaves, pitchSmooth, dynamicRange):
 *   score = 100 * (value - worst) / (best - worst)
 */
function toScore(value: number, best: number, worst: number, higherIsBetter: boolean): number {
  if (best === worst) return 50;
  const raw = higherIsBetter
    ? (value - worst) / (best - worst)
    : (worst - value) / (worst - best);
  return Math.round(clamp(raw * 100, 0, 100));
}

// Scoring ranges (based on clinical literature + app calibration)
const RANGES = {
  jitter:         { best: 0.3,  worst: 5.0 },    // % — lower is better
  shimmer:        { best: 1.0,  worst: 8.0 },    // % — lower is better
  hnr:            { best: 25,   worst: 5 },       // dB — higher is better
  f0Std:          { best: 0.5,  worst: 12 },      // Hz — lower is better
  voicedDuration: { best: 10,   worst: 3 },       // seconds — higher is better
  rangeOctaves:   { best: 2.5,  worst: 0.3 },     // octaves — higher is better
  pitchSmooth:    { best: 95,   worst: 30 },      // % — higher is better
  pitchBreaks:    { best: 0,    worst: 8 },       // count — lower is better
  dynamicRange:   { best: 20,   worst: 3 },       // dB — higher is better
  f0Deviation:    { best: 2,    worst: 20 },      // Hz — lower is better
} as const;

/**
 * Calculate 5-axis scores from raw metrics collected during the 3-step test.
 */
export function calculateAssessmentScores(raw: VoiceAssessmentResult['rawMetrics']): VoiceAssessmentScores {
  // Axis 1: Stability — jitter + shimmer average (lower = more stable)
  const jitterScore = toScore(raw.jitter, RANGES.jitter.best, RANGES.jitter.worst, false);
  const shimmerScore = toScore(raw.shimmer, RANGES.shimmer.best, RANGES.shimmer.worst, false);
  const stability = Math.round((jitterScore + shimmerScore) / 2);

  // Axis 2: Tone Quality — HNR (higher = cleaner)
  const toneQuality = toScore(raw.hnr, RANGES.hnr.best, RANGES.hnr.worst, true);

  // Axis 3: Flexibility — range + smoothness (wider + smoother = better)
  const rangeScore = toScore(raw.rangeOctaves, RANGES.rangeOctaves.best, RANGES.rangeOctaves.worst, true);
  const smoothScore = toScore(raw.pitchSmooth, RANGES.pitchSmooth.best, RANGES.pitchSmooth.worst, true);
  const flexibility = Math.round((rangeScore + smoothScore) / 2);

  // Axis 4: Control — dynamic range + pitch stability during dynamics
  const dynScore = toScore(raw.dynamicRange, RANGES.dynamicRange.best, RANGES.dynamicRange.worst, true);
  const devScore = toScore(raw.f0Deviation, RANGES.f0Deviation.best, RANGES.f0Deviation.worst, false);
  const control = Math.round((dynScore + devScore) / 2);

  // Axis 5: Endurance — sustained voiced duration
  const endurance = toScore(raw.voicedDuration, RANGES.voicedDuration.best, RANGES.voicedDuration.worst, true);

  // Overall = mean of 5 axes
  const overall = Math.round((stability + toneQuality + flexibility + control + endurance) / 5);

  return { overall, stability, toneQuality, flexibility, control, endurance };
}

/**
 * Get today's date string in KST timezone (YYYY-MM-DD).
 */
export function getKSTDateString(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}
