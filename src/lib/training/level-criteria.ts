import type { ExerciseId, LevelCriteria, VFELevelCriteria } from './types';

// ============================================================
// Training Feature — Level Criteria (22 exercises × 10 levels)
// ============================================================
// Lv.1-4  : Free tier — gentle ramp (spreads old Lv.1-3)
// Lv.5-7  : Pro entry  — maps to old Lv.4-5
// Lv.8-10 : Pro mastery — expert/professional tier (beyond old Lv.5)
// All metrics are strictly monotonic across levels.

// --------------- Warmup Exercises ---------------

/** Breathing: timer-only, no DSP criteria */
const BREATHING_LEVELS: LevelCriteria[] = [
  { duration: 20 },
  { duration: 30 },
  { duration: 40 },
  { duration: 50 },
  { duration: 60 },
  { duration: 70 },
  { duration: 80 },
  { duration: 90 },
  { duration: 105 },
  { duration: 120 },
];

/** Humming: sustained tone with jitter/hnr */
const HUMMING_LEVELS: LevelCriteria[] = [
  { duration: 3, jitterMax: 2.5 },
  { duration: 4, jitterMax: 2.2 },
  { duration: 5, jitterMax: 1.9, hnrMin: 5 },
  { duration: 6, jitterMax: 1.6, hnrMin: 8, centsDeviationMax: 80 },
  { duration: 8, jitterMax: 1.3, hnrMin: 11, centsDeviationMax: 65 },
  { duration: 10, jitterMax: 1.0, hnrMin: 14, f0StdMax: 8, centsDeviationMax: 55 },
  { duration: 12, jitterMax: 0.8, hnrMin: 16, f0StdMax: 6, centsDeviationMax: 45 },
  { duration: 15, jitterMax: 0.65, hnrMin: 18, f0StdMax: 5, centsDeviationMax: 38 },
  { duration: 18, jitterMax: 0.5, hnrMin: 20, f0StdMax: 4, centsDeviationMax: 30 },
  { duration: 20, jitterMax: 0.4, hnrMin: 22, f0StdMax: 3, centsDeviationMax: 25 },
];

/** Lip Trill: jitter thresholds are slightly relaxed vs pure vowel due to trill vibration */
const LIP_TRILL_LEVELS: LevelCriteria[] = [
  { duration: 3, jitterMax: 1.45 },
  { duration: 4, jitterMax: 1.25 },
  { duration: 5, jitterMax: 1.08, hnrMin: 8 },
  { duration: 7, jitterMax: 0.96, shimmerMax: 3.35, hnrMin: 10 },
  { duration: 8, jitterMax: 0.79, shimmerMax: 3.05, hnrMin: 12, centsDeviationMax: 50 },
  { duration: 10, jitterMax: 0.62, shimmerMax: 2.74, hnrMin: 15, centsDeviationMax: 40 },
  { duration: 12, jitterMax: 0.46, shimmerMax: 2.44, hnrMin: 18, centsDeviationMax: 30 },
  { duration: 14, jitterMax: 0.37, shimmerMax: 2.13, hnrMin: 20, centsDeviationMax: 25 },
  { duration: 16, jitterMax: 0.33, shimmerMax: 1.83, hnrMin: 22, centsDeviationMax: 20 },
  { duration: 18, jitterMax: 0.25, shimmerMax: 1.52, hnrMin: 24, centsDeviationMax: 15 },
];

/** Breath Sustain: maximum sustained phonation on a comfortable pitch */
const BREATH_SUSTAIN_LEVELS: LevelCriteria[] = [
  { duration: 5 },
  { duration: 7, hnrMin: 6 },
  { duration: 8, hnrMin: 8 },
  { duration: 10, hnrMin: 10 },
  { duration: 12, hnrMin: 12, centsDeviationMax: 50 },
  { duration: 15, hnrMin: 14, jitterMax: 0.79, centsDeviationMax: 40 },
  { duration: 18, hnrMin: 15, jitterMax: 0.62, centsDeviationMax: 30 },
  { duration: 25, hnrMin: 18, jitterMax: 0.46, centsDeviationMax: 25 },
  { duration: 30, hnrMin: 20, jitterMax: 0.37, centsDeviationMax: 20 },
  { duration: 35, hnrMin: 22, jitterMax: 0.33, centsDeviationMax: 15 },
];

// --------------- Core Exercises ---------------

/** Straw Phonation: sustained with jitter/shimmer/hnr */
const STRAW_LEVELS: LevelCriteria[] = [
  { duration: 3, jitterMax: 1.25 },
  { duration: 4, jitterMax: 1.08 },
  { duration: 5, jitterMax: 0.96, hnrMin: 10 },
  { duration: 8, jitterMax: 0.79, hnrMin: 12 },
  { duration: 10, jitterMax: 0.62, shimmerMax: 2.44, hnrMin: 15, centsDeviationMax: 50 },
  { duration: 15, jitterMax: 0.46, shimmerMax: 2.13, hnrMin: 18, centsDeviationMax: 40 },
  { duration: 20, jitterMax: 0.33, shimmerMax: 1.83, hnrMin: 20, centsDeviationMax: 30 },
  { duration: 25, jitterMax: 0.25, shimmerMax: 1.52, hnrMin: 22, centsDeviationMax: 25 },
  { duration: 28, jitterMax: 0.21, shimmerMax: 1.22, hnrMin: 23, centsDeviationMax: 20 },
  { duration: 30, jitterMax: 0.17, shimmerMax: 1.07, hnrMin: 24, centsDeviationMax: 15 },
];

/** Yawn-Sigh: pitch curve smoothness */
const YAWN_SIGH_LEVELS: LevelCriteria[] = [
  { duration: 2 },
  { duration: 2, hnrMin: 6 },
  { duration: 3, hnrMin: 8 },
  { duration: 3, hnrMin: 10, pitchSmooth: 65 },
  { duration: 4, hnrMin: 10, pitchSmooth: 70 },
  { duration: 5, hnrMin: 12, pitchSmooth: 80 },
  { duration: 5, hnrMin: 15, pitchSmooth: 90 },
  { duration: 6, hnrMin: 17, pitchSmooth: 93 },
  { duration: 7, hnrMin: 19, pitchSmooth: 95 },
  { duration: 8, hnrMin: 20, pitchSmooth: 97 },
];

/** Flow Phonation: sustained with jitter/shimmer/hnr */
const FLOW_LEVELS: LevelCriteria[] = [
  { duration: 5 },
  { duration: 5, jitterMax: 0.96 },
  { duration: 5, jitterMax: 0.79 },
  { duration: 8, jitterMax: 0.62, shimmerMax: 2.74, hnrMin: 10 },
  { duration: 10, jitterMax: 0.62, shimmerMax: 2.44, hnrMin: 12, centsDeviationMax: 50 },
  { duration: 15, jitterMax: 0.46, shimmerMax: 2.13, hnrMin: 18, centsDeviationMax: 40 },
  { duration: 20, jitterMax: 0.33, shimmerMax: 1.83, hnrMin: 22, centsDeviationMax: 30 },
  { duration: 25, jitterMax: 0.25, shimmerMax: 1.52, hnrMin: 24, centsDeviationMax: 25 },
  { duration: 28, jitterMax: 0.21, shimmerMax: 1.22, hnrMin: 25, centsDeviationMax: 20 },
  { duration: 30, jitterMax: 0.17, shimmerMax: 1.07, hnrMin: 26, centsDeviationMax: 15 },
];

/** Resonant Voice Transfer: F0 stability + HNR */
const RESONANT_LEVELS: LevelCriteria[] = [
  { duration: 5 },
  { duration: 5, f0StdMax: 15 },
  { duration: 6, f0StdMax: 12 },
  { duration: 8, f0StdMax: 8, hnrMin: 10 },
  { duration: 10, hnrMin: 12, f0StdMax: 6, centsDeviationMax: 50 },
  { duration: 12, hnrMin: 15, f0StdMax: 4, jitterMax: 0.62, centsDeviationMax: 40 },
  { duration: 15, hnrMin: 18, f0StdMax: 3, jitterMax: 0.46, centsDeviationMax: 30 },
  { duration: 17, hnrMin: 20, f0StdMax: 2.5, jitterMax: 0.37, centsDeviationMax: 25 },
  { duration: 18, hnrMin: 21, f0StdMax: 2.0, jitterMax: 0.33, centsDeviationMax: 20 },
  { duration: 20, hnrMin: 22, f0StdMax: 1.5, jitterMax: 0.25, centsDeviationMax: 15 },
];

/** Vibrato Training: rate, extent, periodicity */
const VIBRATO_LEVELS: LevelCriteria[] = [
  { duration: 3, vibratoRateMin: 4.0, vibratoRateMax: 10, vibratoExtentMin: 20 },
  { duration: 4, vibratoRateMin: 4.0, vibratoRateMax: 9, vibratoExtentMin: 25 },
  { duration: 5, vibratoRateMin: 4.5, vibratoRateMax: 9, vibratoExtentMin: 35, vibratoExtentMax: 130 },
  { duration: 5, vibratoRateMin: 4, vibratoRateMax: 8, vibratoExtentMin: 40, vibratoExtentMax: 120 },
  { duration: 8, vibratoRateMin: 4.5, vibratoRateMax: 7.5, vibratoExtentMin: 45, vibratoExtentMax: 110, vibratoPeriodicity: 0.45 },
  { duration: 8, vibratoRateMin: 4.5, vibratoRateMax: 7, vibratoExtentMin: 50, vibratoExtentMax: 100, vibratoPeriodicity: 0.5 },
  { duration: 10, vibratoRateMin: 5, vibratoRateMax: 7, vibratoExtentMin: 50, vibratoExtentMax: 80, vibratoPeriodicity: 0.6 },
  { duration: 15, vibratoRateMin: 5, vibratoRateMax: 6.5, vibratoExtentMin: 50, vibratoExtentMax: 80, vibratoPeriodicity: 0.7 },
  { duration: 18, vibratoRateMin: 5.2, vibratoRateMax: 6.3, vibratoExtentMin: 50, vibratoExtentMax: 75, vibratoPeriodicity: 0.8 },
  { duration: 20, vibratoRateMin: 5.2, vibratoRateMax: 6.2, vibratoExtentMin: 50, vibratoExtentMax: 70, vibratoPeriodicity: 0.85 },
];

/** Basic Dynamic Control: unidirectional crescendo/decrescendo */
const BASIC_DYNAMIC_LEVELS: LevelCriteria[] = [
  { duration: 4, dynamicRange: 5 },
  { duration: 4, dynamicRange: 6 },
  { duration: 6, dynamicRange: 7, f0DeviationMax: 18 },
  { duration: 6, dynamicRange: 8, f0DeviationMax: 15 },
  { duration: 8, dynamicRange: 10, f0DeviationMax: 12 },
  { duration: 10, dynamicRange: 12, f0DeviationMax: 8 },
  { duration: 12, dynamicRange: 15, f0DeviationMax: 5 },
  { duration: 13, dynamicRange: 17, f0DeviationMax: 4 },
  { duration: 14, dynamicRange: 18, f0DeviationMax: 3.5 },
  { duration: 15, dynamicRange: 20, f0DeviationMax: 3 },
];

// --------------- Advanced Exercises ---------------

/** VFE: 4-part structure (a=sustained, b=ascending glide, c=descending glide, d=sustained) */
const VFE_LEVELS: VFELevelCriteria[] = [
  {
    a: { duration: 5 },
    b: { pitchSmooth: 30, rangeOctaves: 0.4, maxBreaks: 10 },
    c: { pitchSmooth: 30, rangeOctaves: 0.4, maxBreaks: 10 },
    d: { duration: 5 },
  },
  {
    a: { duration: 8 },
    b: { pitchSmooth: 40, rangeOctaves: 0.5, maxBreaks: 6 },
    c: { pitchSmooth: 40, rangeOctaves: 0.5, maxBreaks: 6 },
    d: { duration: 8 },
  },
  {
    a: { duration: 10, jitterMax: 0.96 },
    b: { pitchSmooth: 45, rangeOctaves: 0.6, maxBreaks: 4 },
    c: { pitchSmooth: 45, rangeOctaves: 0.6, maxBreaks: 4 },
    d: { duration: 10, jitterMax: 0.96 },
  },
  {
    a: { duration: 12, jitterMax: 0.79 },
    b: { pitchSmooth: 50, rangeOctaves: 0.7, maxBreaks: 3 },
    c: { pitchSmooth: 50, rangeOctaves: 0.7, maxBreaks: 3 },
    d: { duration: 12, jitterMax: 0.79 },
  },
  {
    a: { duration: 15, jitterMax: 0.62, hnrMin: 15 },
    b: { pitchSmooth: 55, rangeOctaves: 0.8, maxBreaks: 2 },
    c: { pitchSmooth: 55, rangeOctaves: 0.8, maxBreaks: 2 },
    d: { duration: 15, hnrMin: 15 },
  },
  {
    a: { duration: 18, jitterMax: 0.46, hnrMin: 17 },
    b: { pitchSmooth: 60, rangeOctaves: 0, maxBreaks: 1 },
    c: { pitchSmooth: 60, rangeOctaves: 0, maxBreaks: 1 },
    d: { duration: 18, hnrMin: 17 },
  },
  {
    a: { duration: 20, jitterMax: 0.46, hnrMin: 18 },
    b: { pitchSmooth: 70, rangeOctaves: 0, maxBreaks: 1 },
    c: { pitchSmooth: 70, rangeOctaves: 0, maxBreaks: 1 },
    d: { duration: 20, hnrMin: 18 },
  },
  {
    a: { duration: 25, jitterMax: 0.33, hnrMin: 20 },
    b: { pitchSmooth: 80, rangeOctaves: 0, maxBreaks: 0 },
    c: { pitchSmooth: 80, rangeOctaves: 0, maxBreaks: 0 },
    d: { duration: 25, jitterMax: 0.33, hnrMin: 20 },
  },
  {
    a: { duration: 28, jitterMax: 0.25, hnrMin: 22 },
    b: { pitchSmooth: 85, rangeOctaves: 0, maxBreaks: 0 },
    c: { pitchSmooth: 85, rangeOctaves: 0, maxBreaks: 0 },
    d: { duration: 28, jitterMax: 0.25, hnrMin: 22 },
  },
  {
    a: { duration: 30, jitterMax: 0.21, hnrMin: 24 },
    b: { pitchSmooth: 90, rangeOctaves: 0, maxBreaks: 0 },
    c: { pitchSmooth: 90, rangeOctaves: 0, maxBreaks: 0 },
    d: { duration: 30, jitterMax: 0.21, hnrMin: 24 },
  },
];

/**
 * VFE overall duration per level (used by getLevelCriteria for 'vfe').
 * Sum of a + d durations as the primary duration indicator.
 */
const VFE_DURATIONS: number[] = [10, 16, 20, 24, 30, 36, 40, 50, 56, 60];

/** Pitch Glide: range + smoothness + breaks */
const PITCH_GLIDE_LEVELS: LevelCriteria[] = [
  { duration: 3, rangeOctaves: 0.5, maxBreaks: 10 },
  { duration: 3, rangeOctaves: 0.6, maxBreaks: 8 },
  { duration: 4, rangeOctaves: 0.8, pitchSmooth: 55, maxBreaks: 5 },
  { duration: 4, rangeOctaves: 1.0, pitchSmooth: 60, maxBreaks: 3 },
  { duration: 6, rangeOctaves: 1.0, pitchSmooth: 70, maxBreaks: 2 },
  { duration: 8, rangeOctaves: 1.5, pitchSmooth: 80, maxBreaks: 1 },
  { duration: 10, rangeOctaves: 2.0, pitchSmooth: 85, maxBreaks: 1 },
  { duration: 11, rangeOctaves: 2.0, pitchSmooth: 90, maxBreaks: 1 },
  { duration: 12, rangeOctaves: 2.5, pitchSmooth: 93, maxBreaks: 0 },
  { duration: 12, rangeOctaves: 2.5, pitchSmooth: 95, maxBreaks: 0 },
];

/** Messa di Voce: F0 stability + dynamic range */
const MESSA_LEVELS: LevelCriteria[] = [
  { duration: 6, f0DeviationMax: 18, dynamicRange: 5 },
  { duration: 6, f0DeviationMax: 15, dynamicRange: 6 },
  { duration: 8, f0DeviationMax: 12, dynamicRange: 8 },
  { duration: 8, f0DeviationMax: 10, hnrMin: 12, dynamicRange: 10 },
  { duration: 10, f0DeviationMax: 8, hnrMin: 15, dynamicRange: 12 },
  { duration: 12, f0DeviationMax: 5, hnrMin: 15, dynamicRange: 15 },
  { duration: 15, f0DeviationMax: 5, hnrMin: 18, dynamicRange: 18 },
  { duration: 17, f0DeviationMax: 4, hnrMin: 19, dynamicRange: 20 },
  { duration: 18, f0DeviationMax: 3.5, hnrMin: 20, dynamicRange: 21 },
  { duration: 20, f0DeviationMax: 3, hnrMin: 21, dynamicRange: 22 },
];

// --------------- Breath Control Exercises ---------------

/** Breath Allocation: consistent airflow (RMS CV) */
const BREATH_ALLOC_LEVELS: LevelCriteria[] = [
  { duration: 8 },
  { duration: 10 },
  { duration: 12, rmsCVMax: 0.50 },
  { duration: 14, rmsCVMax: 0.42 },
  { duration: 16, rmsCVMax: 0.35 },
  { duration: 20, rmsCVMax: 0.25 },
  { duration: 25, rmsCVMax: 0.18 },
  { duration: 28, rmsCVMax: 0.15 },
  { duration: 32, rmsCVMax: 0.12 },
  { duration: 35, rmsCVMax: 0.10 },
];

/** S/Z Ratio: sustained /s/ vs /z/ duration ratio */
const SZ_RATIO_LEVELS: LevelCriteria[] = [
  { duration: 5, szRatioMin: 0.4, szRatioMax: 2.5 },
  { duration: 6, szRatioMin: 0.5, szRatioMax: 2.0 },
  { duration: 8, szRatioMin: 0.6, szRatioMax: 1.7 },
  { duration: 8, szRatioMin: 0.7, szRatioMax: 1.5 },
  { duration: 10, szRatioMin: 0.8, szRatioMax: 1.3 },
  { duration: 12, szRatioMin: 0.85, szRatioMax: 1.2 },
  { duration: 15, szRatioMin: 0.9, szRatioMax: 1.15 },
  { duration: 17, szRatioMin: 0.92, szRatioMax: 1.12 },
  { duration: 18, szRatioMin: 0.93, szRatioMax: 1.10 },
  { duration: 20, szRatioMin: 0.95, szRatioMax: 1.08 },
];

/** Phrase Simulation: follow breath pattern with RMS contour */
const PHRASE_SIM_LEVELS: LevelCriteria[] = [
  { duration: 10 },
  { duration: 12, rmsContourMin: 30 },
  { duration: 15, rmsContourMin: 40 },
  { duration: 18, rmsContourMin: 50 },
  { duration: 20, rmsContourMin: 55 },
  { duration: 25, rmsContourMin: 70 },
  { duration: 30, rmsContourMin: 80 },
  { duration: 35, rmsContourMin: 85 },
  { duration: 38, rmsContourMin: 90 },
  { duration: 40, rmsContourMin: 92 },
];

/** Airflow Stability: minimal RMS fluctuation */
const AIRFLOW_STABLE_LEVELS: LevelCriteria[] = [
  { duration: 8 },
  { duration: 10, rmsCVMax: 0.45 },
  { duration: 12, rmsCVMax: 0.40 },
  { duration: 15, rmsCVMax: 0.32 },
  { duration: 18, rmsCVMax: 0.28 },
  { duration: 22, rmsCVMax: 0.20 },
  { duration: 28, rmsCVMax: 0.14 },
  { duration: 32, rmsCVMax: 0.11 },
  { duration: 35, rmsCVMax: 0.09 },
  { duration: 38, rmsCVMax: 0.08 },
];

/** MPT (Maximum Phonation Time): sustained phonation + HNR */
const MPT_LEVELS: LevelCriteria[] = [
  { duration: 8 },
  { duration: 10, hnrMin: 6 },
  { duration: 12, hnrMin: 8 },
  { duration: 15, hnrMin: 10 },
  { duration: 18, hnrMin: 12, centsDeviationMax: 50 },
  { duration: 25, hnrMin: 15, centsDeviationMax: 40 },
  { duration: 35, hnrMin: 18, centsDeviationMax: 30 },
  { duration: 40, hnrMin: 19, centsDeviationMax: 25 },
  { duration: 45, hnrMin: 20, centsDeviationMax: 20 },
  { duration: 50, hnrMin: 22, centsDeviationMax: 15 },
];

// --------------- Register & Resonance Exercises ---------------

/** Passaggio Sustain: sustained tone in register transition zone */
const PASSAGGIO_SUSTAIN_LEVELS: LevelCriteria[] = [
  { duration: 3 },
  { duration: 4, jitterMax: 1.25 },
  { duration: 5, jitterMax: 1.08, shimmerMax: 3.35, hnrMin: 6 },
  { duration: 6, jitterMax: 0.96, shimmerMax: 3.05, hnrMin: 8, f0StdMax: 12 },
  { duration: 8, jitterMax: 0.79, shimmerMax: 2.74, hnrMin: 10, f0StdMax: 8, centsDeviationMax: 50 },
  { duration: 10, jitterMax: 0.62, shimmerMax: 2.44, hnrMin: 13, f0StdMax: 6, centsDeviationMax: 40 },
  { duration: 12, jitterMax: 0.58, shimmerMax: 2.13, hnrMin: 16, f0StdMax: 5, centsDeviationMax: 30 },
  { duration: 14, jitterMax: 0.46, shimmerMax: 1.83, hnrMin: 18, f0StdMax: 4, centsDeviationMax: 25 },
  { duration: 16, jitterMax: 0.37, shimmerMax: 1.52, hnrMin: 20, f0StdMax: 3, centsDeviationMax: 20 },
  { duration: 18, jitterMax: 0.33, shimmerMax: 1.22, hnrMin: 22, f0StdMax: 2.5, centsDeviationMax: 15 },
];

/** Vowel Sustain: open vowel resonance with HNR as primary metric */
const VOWEL_SUSTAIN_LEVELS: LevelCriteria[] = [
  { duration: 4 },
  { duration: 5, hnrMin: 8, jitterMax: 0.96 },
  { duration: 6, hnrMin: 10, jitterMax: 0.87, shimmerMax: 3.05 },
  { duration: 8, hnrMin: 12, jitterMax: 0.79, shimmerMax: 2.74 },
  { duration: 10, hnrMin: 15, jitterMax: 0.62, shimmerMax: 2.44, centsDeviationMax: 50 },
  { duration: 12, hnrMin: 17, jitterMax: 0.58, shimmerMax: 2.13, centsDeviationMax: 40 },
  { duration: 15, hnrMin: 19, jitterMax: 0.46, shimmerMax: 1.83, centsDeviationMax: 30 },
  { duration: 18, hnrMin: 21, jitterMax: 0.37, shimmerMax: 1.52, centsDeviationMax: 25 },
  { duration: 20, hnrMin: 23, jitterMax: 0.33, shimmerMax: 1.22, centsDeviationMax: 20 },
  { duration: 22, hnrMin: 25, jitterMax: 0.25, shimmerMax: 1.07, centsDeviationMax: 15 },
];

/** Vowel Transition: f0 stability + formant-based vowel accuracy during vowel changes
 *  Lv.1-2: duration + basic stability only
 *  Lv.3-4: + vowelHitMin (must produce at least N distinct vowels)
 *  Lv.5-6: + vowelDwellMin (must stay in each vowel zone, not just pass through)
 *  Lv.7-10: + formantJitterMax (transitions must be smooth in F1/F2 space)
 */
const VOWEL_TRANSITION_LEVELS: LevelCriteria[] = [
  { duration: 5 },
  { duration: 6, f0StdMax: 15, jitterMax: 1.08 },
  { duration: 7, f0StdMax: 12, hnrMin: 7, jitterMax: 0.96, shimmerMax: 3.35, vowelHitMin: 2 },
  { duration: 8, f0StdMax: 10, hnrMin: 10, jitterMax: 0.79, shimmerMax: 3.05, vowelHitMin: 3 },
  { duration: 10, f0StdMax: 8, hnrMin: 12, jitterMax: 0.62, shimmerMax: 2.74, vowelHitMin: 4, vowelDwellMin: 400 },
  { duration: 12, f0StdMax: 6, hnrMin: 14, jitterMax: 0.58, shimmerMax: 2.44, vowelHitMin: 4, vowelDwellMin: 500 },
  { duration: 14, f0StdMax: 5, hnrMin: 16, jitterMax: 0.46, shimmerMax: 2.13, vowelHitMin: 5, vowelDwellMin: 600, formantJitterMax: 200 },
  { duration: 16, f0StdMax: 4, hnrMin: 18, jitterMax: 0.37, shimmerMax: 1.83, vowelHitMin: 5, vowelDwellMin: 700, formantJitterMax: 150 },
  { duration: 17, f0StdMax: 3, hnrMin: 20, jitterMax: 0.33, shimmerMax: 1.52, vowelHitMin: 5, vowelDwellMin: 800, formantJitterMax: 120 },
  { duration: 18, f0StdMax: 2.5, hnrMin: 22, jitterMax: 0.25, shimmerMax: 1.22, vowelHitMin: 5, vowelDwellMin: 1000, formantJitterMax: 100 },
];

/** Register Blend: pitch_curve + voice quality hybrid (siren through passaggio) */
const REGISTER_BLEND_LEVELS: LevelCriteria[] = [
  { duration: 3, rangeOctaves: 0.5, maxBreaks: 10 },
  { duration: 4, rangeOctaves: 0.6, maxBreaks: 6, jitterMax: 1.08 },
  { duration: 5, pitchSmooth: 55, rangeOctaves: 0.8, maxBreaks: 4, jitterMax: 0.96, hnrMin: 7 },
  { duration: 6, pitchSmooth: 60, rangeOctaves: 0.8, maxBreaks: 3, jitterMax: 0.79, hnrMin: 10 },
  { duration: 8, pitchSmooth: 65, rangeOctaves: 1.0, maxBreaks: 2, jitterMax: 0.62, hnrMin: 12 },
  { duration: 10, pitchSmooth: 70, rangeOctaves: 1.0, maxBreaks: 1, jitterMax: 0.58, hnrMin: 15 },
  { duration: 12, pitchSmooth: 75, rangeOctaves: 1.2, maxBreaks: 1, jitterMax: 0.46, hnrMin: 17 },
  { duration: 14, pitchSmooth: 80, rangeOctaves: 1.5, maxBreaks: 0, jitterMax: 0.37, hnrMin: 19 },
  { duration: 15, pitchSmooth: 85, rangeOctaves: 1.5, maxBreaks: 0, jitterMax: 0.33, hnrMin: 21 },
  { duration: 15, pitchSmooth: 90, rangeOctaves: 2.0, maxBreaks: 0, jitterMax: 0.25, hnrMin: 23 },
];

// --------------- Lookup Map ---------------

const CRITERIA_MAP: Record<ExerciseId, LevelCriteria[]> = {
  breathing: BREATHING_LEVELS,
  humming: HUMMING_LEVELS,
  lip_trill: LIP_TRILL_LEVELS,
  breath_sustain: BREATH_SUSTAIN_LEVELS,
  straw: STRAW_LEVELS,
  yawn_sigh: YAWN_SIGH_LEVELS,
  flow: FLOW_LEVELS,
  resonant: RESONANT_LEVELS,
  vibrato: VIBRATO_LEVELS,
  basic_dynamic: BASIC_DYNAMIC_LEVELS,
  vfe: VFE_DURATIONS.map((duration, i) => ({
    duration,
    ...extractVFEMainCriteria(VFE_LEVELS[i]),
  })),
  pitch_glide: PITCH_GLIDE_LEVELS,
  messa: MESSA_LEVELS,
  breath_alloc: BREATH_ALLOC_LEVELS,
  sz_ratio: SZ_RATIO_LEVELS,
  phrase_sim: PHRASE_SIM_LEVELS,
  airflow_stable: AIRFLOW_STABLE_LEVELS,
  mpt: MPT_LEVELS,
  register_blend: REGISTER_BLEND_LEVELS,
  passaggio_sustain: PASSAGGIO_SUSTAIN_LEVELS,
  vowel_sustain: VOWEL_SUSTAIN_LEVELS,
  vowel_transition: VOWEL_TRANSITION_LEVELS,
};

/** Extract main criteria from VFE sub-a for the flattened lookup */
function extractVFEMainCriteria(
  vfe: VFELevelCriteria,
): Partial<LevelCriteria> {
  const result: Partial<LevelCriteria> = {};
  if (vfe.a.jitterMax !== undefined) result.jitterMax = vfe.a.jitterMax;
  if (vfe.a.hnrMin !== undefined) result.hnrMin = vfe.a.hnrMin;
  return result;
}

// --------------- Level Descriptions (Korean) ---------------

const DESCRIPTIONS: Record<ExerciseId, string[]> = {
  breathing: [
    '4-2-4 호흡 사이클 (20초)',
    '4-2-6 호흡 사이클 (30초)',
    '4-2-6 호흡 사이클 (40초)',
    '4-2-8 호흡 사이클 (50초)',
    '4-2-8 호흡 사이클 5회 (60초)',
    '4-2-10 호흡 사이클 5회 (70초)',
    '4-2-10 호흡 사이클 5회 (80초)',
    '4-2-12 호흡 사이클 5회 (90초)',
    '4-2-14 호흡 사이클 (105초)',
    '4-2-16 호흡 사이클 (120초)',
  ],
  humming: [
    '편한 음으로 3초 유지',
    '편한 음으로 4초 유지, 안정된 발성',
    '5초 유지 + HNR 7dB 이상',
    '6초 유지 + HNR 12dB 이상',
    '8초 유지 + HNR 15dB 이상',
    '10초 유지 + F0 안정성 확보',
    '12초 유지 + 전 지표 안정',
    '15초 유지 + 높은 안정성',
    '18초 유지 + 전문가급 안정성',
    '20초 유지 + 모든 지표 최고 수준',
  ],
  lip_trill: [
    '편한 음으로 3초 유지',
    '4초 유지, 떨림 안정',
    '5초 유지 + HNR 8dB 이상',
    '7초 유지 + 떨림/HNR 안정',
    '8초 유지 + HNR 12dB 이상',
    '10초 유지 + 전 지표 안정',
    '12초 유지 + 높은 안정성',
    '14초 유지 + 매우 안정적 떨림',
    '16초 유지 + 전문가급 안정성',
    '18초 유지 + 모든 지표 최고 수준',
  ],
  breath_sustain: [
    '편한 음으로 5초 유지',
    '7초 유지 + HNR 6dB 이상',
    '8초 유지 + HNR 8dB 이상',
    '10초 유지 + HNR 10dB 이상',
    '12초 유지 + HNR 12dB 이상',
    '15초 유지 + 떨림 2.5% 이하',
    '18초 유지 + 떨림 2.0% 이하',
    '25초 유지 + 높은 음질 유지',
    '30초 유지 + 전문가급 지속력',
    '35초 유지 + 모든 지표 최고 수준',
  ],
  straw: [
    '편한 음으로 3초 유지',
    '4초 유지, 안정된 발성',
    '5초 유지 + HNR 10dB 이상',
    '8초 유지 + HNR 12dB 이상',
    '10초 유지 + HNR 15dB 이상',
    '15초 유지 + 전 지표 안정',
    '20초 유지 + 높은 안정성',
    '25초 유지 + 매우 안정적 발성',
    '28초 유지 + 전문가급 안정성',
    '30초 유지 + 모든 지표 최고 수준',
  ],
  yawn_sigh: [
    '높은음에서 낮은음으로 2초 내려오기',
    '2초, HNR 6dB 이상 유지',
    '3초에 걸쳐 매끄럽게 내려오기',
    '3초 + 끊김 없이 자연스럽게',
    '4초, 끊김 없는 피치 곡선',
    '5초, 매끄러운 피치 곡선',
    '5초, 매우 매끄럽고 HNR 유지',
    '6초 + 높은 HNR, 자연스러운 곡선',
    '7초 + 전문가급 매끄러움',
    '8초 + 모든 지표 최고 수준',
  ],
  flow: [
    '"하—" 소리로 5초 유지',
    '5초 유지 + 안정된 떨림',
    '5초 유지 + 떨림 안정',
    '8초 유지 + HNR 10dB 이상',
    '10초 유지 + HNR 12dB 이상',
    '15초 유지 + 전 지표 안정',
    '20초 유지 + 높은 안정성',
    '25초 유지 + 매우 안정적 발성',
    '28초 유지 + 전문가급 안정성',
    '30초 유지 + 모든 지표 최고 수준',
  ],
  resonant: [
    '음→마→아 전환 1회 (5초)',
    '전환 1회 + F0 안정 유지 (5초)',
    '전환 1회 + F0 안정 유지 (6초)',
    '전환 1회 + HNR 10dB 이상 (8초)',
    '전환 2회 + HNR 12dB 이상 (10초)',
    '전환 2회 + 전 지표 안정 (12초)',
    '전환 3회 + 높은 안정성 (15초)',
    '전환 3회 + 매우 안정적 (17초)',
    '전환 4회 + 전문가급 안정성 (18초)',
    '전환 4회 + 모든 지표 최고 수준 (20초)',
  ],
  vibrato: [
    '비브라토 느껴보기 — 떨림 3초 감지',
    '4Hz 이상 비브라토 4초 유지',
    '4.5-9Hz 범위 비브라토 5초 유지',
    '4-8Hz 범위 + 안정적 진폭 5초',
    '안정적 비브라토 8초, 주기성 45% 이상',
    '안정적 비브라토 8초, 주기성 50% 이상',
    '일정한 비브라토 10초 (5-7Hz, 50-80cents)',
    '정밀 비브라토 15초 + 높은 주기성',
    '정밀 비브라토 18초 + 전문가급 주기성',
    '완벽한 비브라토 20초 + 최고 수준',
  ],
  basic_dynamic: [
    '소리 키우기/줄이기 4초, 5dB 차이',
    '크레센도 4초 + 6dB 차이',
    '크레센도 6초 + 7dB + 피치 유지',
    '크레센도 6초 + 8dB + 피치 안정',
    '크레센도 8초 + 10dB + 피치 유지',
    '크레센도 10초 + 12dB + 피치 안정',
    '양방향 12초 + 15dB + 높은 피치 안정',
    '양방향 13초 + 17dB + 높은 피치 안정',
    '양방향 14초 + 18dB + 전문가급 안정',
    '양방향 15초 + 20dB + 최고 수준',
  ],
  vfe: [
    'A/B/C/D 기본 완주',
    'A/D 8초 유지 + B/C 끊김 4회 이하',
    'A/D 10초 유지 + B/C 끊김 2회 이하',
    'A/D 12초 유지 + B/C 끊김 2회 이하',
    'A/D 15초 + HNR 15dB + B/C 끊김 1회 이하',
    'A/D 18초 + HNR 17dB + B/C 매끄러움 60%',
    'A/D 20초 + HNR 18dB + B/C 매끄러움 70%',
    'A/D 25초 + 전 지표 안정 + B/C 매끄러움 80%',
    'A/D 28초 + 전문가급 안정성 + B/C 매끄러움 85%',
    'A/D 30초 + 모든 지표 최고 수준 + B/C 매끄러움 90%',
  ],
  pitch_glide: [
    '단5도 범위 상행 글라이드 (3초)',
    '5도 범위 상행, 끊김 8회 이하 (3초)',
    '6도 범위, 끊김 5회 이하 (4초)',
    '한 옥타브 상행, 끊김 3회 이하 (4초)',
    '한 옥타브 왕복, 끊김 2회 이하 (6초)',
    '1.5옥타브 왕복, 끊김 1회 이하 (8초)',
    '2옥타브 왕복, 매끄럽게 (10초)',
    '2옥타브 왕복, 높은 매끄러움 (11초)',
    '2.5옥타브 왕복, 끊김 없이 (12초)',
    '2.5옥타브 왕복, 최고 수준 매끄러움 (12초)',
  ],
  messa: [
    'mp→mf→mp 6초, 다이나믹 레인지 5dB',
    'mp→mf→mp 6초, 다이나믹 레인지 6dB',
    'p→f→p 8초, 다이나믹 레인지 8dB',
    'p→f→p 8초 + HNR 12dB, 다이나믹 레인지 10dB',
    'p→f→p 10초 + HNR 15dB, 다이나믹 레인지 12dB',
    'pp→ff→pp 12초, 다이나믹 레인지 15dB',
    'pp→ff→pp 15초 + 높은 안정성, 레인지 18dB',
    'pp→ff→pp 17초, 레인지 20dB + HNR 19dB',
    'pp→ff→pp 18초, 레인지 21dB + 전문가급',
    'pp→ff→pp 20초, 레인지 22dB + 최고 수준',
  ],
  breath_alloc: [
    '편한 음으로 8초 유지',
    '10초 유지',
    '12초 유지 + RMS 변동 50% 이하',
    '14초 유지 + RMS 변동 42% 이하',
    '16초 유지 + RMS 변동 35% 이하',
    '20초 유지 + RMS 변동 25% 이하',
    '25초 유지 + RMS 변동 18% 이하',
    '28초 유지 + RMS 변동 15% 이하',
    '32초 유지 + RMS 변동 12% 이하',
    '35초 유지 + RMS 변동 10% 이하',
  ],
  sz_ratio: [
    '/s/와 /z/ 각 5초, 비율 0.4~2.5',
    '각 6초, 비율 0.5~2.0',
    '각 8초, 비율 0.6~1.7',
    '각 8초, 비율 0.7~1.5',
    '각 10초, 비율 0.8~1.3',
    '각 12초, 비율 0.85~1.2',
    '각 15초, 비율 0.9~1.15',
    '각 17초, 비율 0.92~1.12',
    '각 18초, 비율 0.93~1.10',
    '각 20초, 비율 0.95~1.08',
  ],
  phrase_sim: [
    '프레이즈 패턴 10초 따라하기',
    '12초 패턴 + 컨투어 점수 30점',
    '15초 패턴 + 컨투어 점수 40점',
    '18초 패턴 + 컨투어 점수 50점',
    '20초 패턴 + 컨투어 점수 55점',
    '25초 패턴 + 컨투어 점수 70점',
    '30초 패턴 + 컨투어 점수 80점',
    '35초 패턴 + 컨투어 점수 85점',
    '38초 패턴 + 컨투어 점수 90점',
    '40초 패턴 + 컨투어 점수 92점',
  ],
  airflow_stable: [
    '편한 음으로 8초 유지',
    '10초 유지 + RMS 변동 45% 이하',
    '12초 유지 + RMS 변동 40% 이하',
    '15초 유지 + RMS 변동 32% 이하',
    '18초 유지 + RMS 변동 28% 이하',
    '22초 유지 + RMS 변동 20% 이하',
    '28초 유지 + RMS 변동 14% 이하',
    '32초 유지 + RMS 변동 11% 이하',
    '35초 유지 + RMS 변동 9% 이하',
    '38초 유지 + RMS 변동 8% 이하',
  ],
  mpt: [
    '편한 음으로 8초 유지',
    '10초 유지 + HNR 6dB 이상',
    '12초 유지 + HNR 8dB 이상',
    '15초 유지 + HNR 10dB 이상',
    '18초 유지 + HNR 12dB 이상',
    '25초 유지 + HNR 15dB 이상',
    '35초 유지 + HNR 18dB 이상',
    '40초 유지 + HNR 19dB 이상',
    '45초 유지 + HNR 20dB 이상',
    '50초 유지 + HNR 22dB 이상',
  ],
  register_blend: [
    '편한 범위에서 반 옥타브 사이렌',
    '0.6옥타브 사이렌, 끊김 6회 이하',
    '0.8옥타브 + 피치 부드러움 55% + 음질 유지',
    '0.8옥타브 + 끊김 3회 이하 + HNR 10dB',
    '1옥타브 사이렌 + 전환점 안정성 확보',
    '1옥타브 + 끊김 1회 이하 + 높은 음질',
    '1.2옥타브 + 매끄러운 성구 전환',
    '1.5옥타브 + 끊김 없음 + 전문가급 음질',
    '1.5옥타브 + 최고 수준의 안정성',
    '2옥타브 완벽한 성구 통합',
  ],
  passaggio_sustain: [
    '파사지오 음에서 3초 유지',
    '4초 유지 + Jitter 4% 이하',
    '5초 유지 + HNR 6dB + Shimmer 5.5% 이하',
    '6초 유지 + F0 안정성 + HNR 8dB',
    '8초 유지 + 혼합 발성 안정화',
    '10초 유지 + HNR 13dB + 높은 안정성',
    '12초 유지 + 프로급 파사지오 컨트롤',
    '14초 유지 + 전 지표 높은 수준',
    '16초 유지 + 전문가급 혼합 발성',
    '18초 유지 + 최고 수준의 파사지오 마스터리',
  ],
  vowel_sustain: [
    '편한 모음으로 4초 유지',
    '5초 유지 + HNR 8dB + 안정된 발성',
    '6초 유지 + HNR 10dB + Shimmer 확인',
    '8초 유지 + HNR 12dB + 공명 시작',
    '10초 유지 + HNR 15dB + 풍부한 울림',
    '12초 유지 + HNR 17dB + 효율적 발성',
    '15초 유지 + HNR 19dB + 투사력 확보',
    '18초 유지 + HNR 21dB + 싱어스 포먼트 근접',
    '20초 유지 + HNR 23dB + 고급 공명',
    '22초 유지 + HNR 25dB + 최고 수준 공명',
  ],
  vowel_transition: [
    '3모음 전환 5초 유지',
    '5모음 전환 + F0 안정성 15Hz 이하',
    '7초 유지 + F0 12Hz + HNR 7dB',
    '8초 유지 + F0 10Hz + HNR 10dB',
    '10초 유지 + F0 8Hz + 울림 유지',
    '12초 유지 + F0 6Hz + HNR 14dB',
    '14초 유지 + F0 5Hz + 높은 음질',
    '16초 유지 + F0 4Hz + 프로급 전환',
    '17초 유지 + F0 3Hz + 전문가급',
    '18초 유지 + F0 2.5Hz + 완벽한 모음 전환',
  ],
};

// --------------- Public API ---------------

/**
 * Get the level criteria for a specific exercise at a specific level.
 * @throws if level is not 1-10
 */
export function getLevelCriteria(
  exerciseId: ExerciseId,
  level: number,
): LevelCriteria {
  if (level < 1 || level > 10) {
    throw new Error(`Invalid level ${level}: must be 1-10`);
  }
  return CRITERIA_MAP[exerciseId][level - 1];
}

/**
 * Get the VFE-specific 4-part criteria for a specific level.
 * @throws if level is not 1-10
 */
export function getVFELevelCriteria(level: number): VFELevelCriteria {
  if (level < 1 || level > 10) {
    throw new Error(`Invalid VFE level ${level}: must be 1-10`);
  }
  return VFE_LEVELS[level - 1];
}

/**
 * Get a Korean description of the task for an exercise at a given level.
 * @throws if level is not 1-10
 */
export function getLevelDescription(
  exerciseId: ExerciseId,
  level: number,
): string {
  if (level < 1 || level > 10) {
    throw new Error(`Invalid level ${level}: must be 1-10`);
  }
  return DESCRIPTIONS[exerciseId][level - 1];
}

/**
 * Get all 10 level criteria for a given exercise.
 */
export function getAllLevelCriteria(exerciseId: ExerciseId): LevelCriteria[] {
  return [...CRITERIA_MAP[exerciseId]];
}
