// ============================================================
// Voice Profile v2 ("목BTI") — Profile Analyzer Engine
// ============================================================
// Takes AllTestData (3 phases of raw DSP arrays) and produces:
//   - ToneAxis classification (clear/warm/deep/husky)
//   - ExpressionAxis classification (wind/flame/wave)
//   - 3 spectrum positions (0.0-1.0)
//   - Range info, base F0, stability score
//
// All thresholds are empirically tuned for the HAMONI context
// (browser mic, 100ms rAF polling, Meyda/PeriodDetector pipeline).
// ============================================================

import type {
  AllTestData,
  TestPhaseData,
  ToneAxis,
  ExpressionAxis,
  SpectrumValues,
  RangeInfo,
} from './types';

// ============================================================
// Constants
// ============================================================

/** HNR threshold below which the voice is considered noisy (husky) */
const HUSKY_NOISINESS_THRESHOLD = 0.4;

/** Low-frequency dominance ratio threshold for "deep" classification */
const DEEP_LOW_FREQ_RATIO = 0.7;

/** F0 boundary between "high pitch" and "low pitch" */
const HIGH_PITCH_THRESHOLD_HZ = 250;

/** HNR median threshold for warm (above this + low pitch = warm) */
const WARM_HNR_THRESHOLD = 12;

/** Dynamic range (dB) threshold for "flame" expression */
const FLAME_DYNAMIC_RANGE_DB = 12;

/** RMS coefficient-of-variation threshold for "flame" expression */
const FLAME_RMS_CV = 0.25;

/** Vibrato ratio threshold for "wave" expression */
const WAVE_VIBRATO_RATIO = 0.25;

/** RMS CV floor for "wave" (must have some dynamics along with vibrato) */
const WAVE_RMS_CV_FLOOR = 0.12;

/** Minimum F0 oscillation (Hz) to count as a vibrato direction change */
const VIBRATO_MIN_DELTA_HZ = 3;

/** Minimum voiced samples required for reliable analysis */
const MIN_VOICED_SAMPLES = 5;

/** Minimum RMS to consider a sample as non-silent */
const MIN_RMS_GATE = 0.01;

// ============================================================
// Statistical Helpers
// ============================================================

/** Sort numbers ascending (used by median/percentile) */
function sortedCopy(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

/** Compute the median of a numeric array */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = sortedCopy(arr);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Compute the p-th percentile (0-100) of a numeric array */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = sortedCopy(arr);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** Filter values to only include those at voiced frames */
function voicedOnly(values: number[], isVoiced: boolean[]): number[] {
  return values.filter((_, i) => isVoiced[i]);
}

/** Clamp a number to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// Tone Axis Analysis (from sustained phase)
// ============================================================

export interface ToneAnalysisResult {
  axis: ToneAxis;
  metrics: Record<string, number>;
}

/**
 * Classify the tone axis from the sustained phase data.
 *
 * Decision tree:
 *   noisiness > 0.4        → husky
 *   low-freq ratio > 0.7   → deep
 *   HNR > 12 & low pitch   → warm
 *   otherwise               → clear
 */
export function analyzeToneAxis(data: TestPhaseData): ToneAnalysisResult {
  const voicedHnr = voicedOnly(data.hnrValues, data.isVoicedValues).filter(
    (v) => v > 0,
  );
  const voicedF0 = voicedOnly(data.f0Values, data.isVoicedValues).filter(
    (v) => v > 0,
  );

  const medianHnr = voicedHnr.length > 0 ? median(voicedHnr) : 10;
  const noisiness = clamp(1 - medianHnr / 25, 0, 1);

  // Proportion of voiced frames with F0 below 250 Hz
  const lowFreqRatio =
    voicedF0.length > 0
      ? voicedF0.filter((f) => f < HIGH_PITCH_THRESHOLD_HZ).length /
        voicedF0.length
      : 0;

  const medianF0 = voicedF0.length > 0 ? median(voicedF0) : 200;
  const isHighPitch = medianF0 > HIGH_PITCH_THRESHOLD_HZ;

  let axis: ToneAxis;
  if (noisiness > HUSKY_NOISINESS_THRESHOLD) {
    axis = 'husky';
  } else if (lowFreqRatio > DEEP_LOW_FREQ_RATIO && !isHighPitch) {
    axis = 'deep';
  } else if (medianHnr > WARM_HNR_THRESHOLD && !isHighPitch) {
    axis = 'warm';
  } else {
    axis = 'clear';
  }

  return {
    axis,
    metrics: { medianHnr, noisiness, lowFreqRatio, medianF0 },
  };
}

// ============================================================
// Expression Axis Analysis (from expression phase)
// ============================================================

export interface ExpressionAnalysisResult {
  axis: ExpressionAxis;
  metrics: Record<string, number>;
}

/**
 * Classify the expression axis from the expression phase data.
 *
 * Decision tree:
 *   dynamic range > 12 dB && RMS CV > 0.25   → flame
 *   vibrato ratio > 0.25 && RMS CV >= 0.12   → wave
 *   otherwise                                  → wind
 */
export function analyzeExpressionAxis(
  data: TestPhaseData,
): ExpressionAnalysisResult {
  const voicedRms = voicedOnly(data.rmsValues, data.isVoicedValues).filter(
    (v) => v > MIN_RMS_GATE,
  );
  const voicedF0 = voicedOnly(data.f0Values, data.isVoicedValues).filter(
    (v) => v > 0,
  );

  // Dynamic range in dB (p90/p10 ratio)
  const p90 = voicedRms.length > 3 ? percentile(voicedRms, 90) : 0.1;
  const p10 = voicedRms.length > 3 ? percentile(voicedRms, 10) : 0.05;
  const dynamicRangeDb = p10 > 0.001 ? 20 * Math.log10(p90 / p10) : 0;

  // RMS coefficient of variation (std / mean)
  const meanRms =
    voicedRms.reduce((a, b) => a + b, 0) / (voicedRms.length || 1);
  const rmsStd = Math.sqrt(
    voicedRms.reduce((s, v) => s + (v - meanRms) ** 2, 0) /
      (voicedRms.length || 1),
  );
  const rmsCV = meanRms > 0 ? rmsStd / meanRms : 0;

  // Vibrato detection: count direction changes in F0 with sufficient amplitude
  let vibratoFrames = 0;
  if (voicedF0.length > 10) {
    for (let i = 2; i < voicedF0.length; i++) {
      const d1 = voicedF0[i] - voicedF0[i - 1];
      const d2 = voicedF0[i - 1] - voicedF0[i - 2];
      // Opposite-sign deltas with meaningful amplitude = oscillation
      if (d1 * d2 < 0 && Math.abs(d1) > VIBRATO_MIN_DELTA_HZ) {
        vibratoFrames++;
      }
    }
  }
  const vibratoRatio =
    voicedF0.length > 0 ? vibratoFrames / voicedF0.length : 0;

  let axis: ExpressionAxis;
  if (dynamicRangeDb > FLAME_DYNAMIC_RANGE_DB && rmsCV > FLAME_RMS_CV) {
    axis = 'flame';
  } else if (vibratoRatio > WAVE_VIBRATO_RATIO && rmsCV >= WAVE_RMS_CV_FLOOR) {
    axis = 'wave';
  } else {
    axis = 'wind';
  }

  return {
    axis,
    metrics: { dynamicRangeDb, rmsCV, vibratoRatio },
  };
}

// ============================================================
// Spectrum Calculation
// ============================================================

/**
 * Calculate the 3 spectrum positions (each 0.0 - 1.0).
 *
 * Temperature: low F0 → warm(1), high F0 → cool(0), modified by HNR
 * Range:       base F0 position in 80-380 Hz scale
 * Expression:  composite of dynamic range, vibrato, RMS CV
 */
export function calculateSpectrums(
  allData: AllTestData,
  toneMetrics: Record<string, number>,
  exprMetrics: Record<string, number>,
): SpectrumValues {
  // --- Temperature ---
  // Lower F0 feels warmer; higher HNR adds warmth perception
  const mf0 = toneMetrics.medianF0 ?? 200;
  const mhnr = toneMetrics.medianHnr ?? 12;
  const tempFromF0 = 1 - clamp((mf0 - 80) / 350, 0, 1); // low F0 → warm(1)
  const tempFromHnr = clamp((mhnr - 5) / 20, 0, 1); // high HNR → warm-ish
  const temperature = clamp(tempFromF0 * 0.6 + tempFromHnr * 0.4, 0, 1);

  // --- Range Zone ---
  // From pitch sweep data: where the base F0 sits in the vocal range
  const sweepF0 = allData.rangeSweep.f0Values.filter((v) => v > 0);
  const baseF0 = mf0;
  // Use percentile(95) as the effective ceiling from the sweep
  const _rangeHigh =
    sweepF0.length > MIN_VOICED_SAMPLES
      ? percentile(sweepF0, 95)
      : baseF0 * 1.5;
  // Normalize base F0 into 0-1 (80 Hz = 0, 380 Hz = 1)
  const rangeNorm = clamp((baseF0 - 80) / 300, 0, 1);

  // --- Expression ---
  const dr = exprMetrics.dynamicRangeDb ?? 0;
  const vr = exprMetrics.vibratoRatio ?? 0;
  const cv = exprMetrics.rmsCV ?? 0;
  // Weighted composite: dynamic range 50%, vibrato 30%, RMS CV 20%
  const exprRaw =
    (dr / 25) * 0.5 + vr * 0.3 + clamp(cv / 0.4, 0, 1) * 0.2;
  const expression = clamp(exprRaw, 0, 1);

  return { temperature, range: rangeNorm, expression };
}

// ============================================================
// Range Info Extraction
// ============================================================

function extractRangeInfo(allData: AllTestData): RangeInfo {
  const sweepF0 = allData.rangeSweep.f0Values.filter((v) => v > 0);

  const lowHz =
    sweepF0.length > MIN_VOICED_SAMPLES ? percentile(sweepF0, 5) : 100;
  const highHz =
    sweepF0.length > MIN_VOICED_SAMPLES ? percentile(sweepF0, 95) : 400;
  const octaves = highHz > lowHz ? Math.log2(highHz / lowHz) : 0;

  return {
    lowHz: Math.round(lowHz),
    highHz: Math.round(highHz),
    octaves: Math.round(octaves * 10) / 10,
  };
}

// ============================================================
// Stability Score
// ============================================================

/**
 * Compute an internal stability score (0-100) from the sustained phase.
 * Weighted: jitter 30% + shimmer 30% + HNR 40%
 */
function computeStabilityScore(
  sustained: TestPhaseData,
  medianHnr: number,
): number {
  const voicedJitter = voicedOnly(
    sustained.jitterValues,
    sustained.isVoicedValues,
  );
  const voicedShimmer = voicedOnly(
    sustained.shimmerValues,
    sustained.isVoicedValues,
  );

  const mj = voicedJitter.length > 0 ? median(voicedJitter) : 3;
  const ms = voicedShimmer.length > 0 ? median(voicedShimmer) : 5;

  // Each component scaled 0-1, then weighted
  const jitterComponent = clamp(1 - mj / 5, 0, 1);
  const shimmerComponent = clamp(1 - ms / 8, 0, 1);
  const hnrComponent = clamp(medianHnr / 25, 0, 1);

  const raw =
    jitterComponent * 0.3 + shimmerComponent * 0.3 + hnrComponent * 0.4;

  return Math.round(clamp(raw * 100, 0, 100));
}

// ============================================================
// Main Analysis Entry Point
// ============================================================

export interface ProfileAnalysisResult {
  toneAxis: ToneAxis;
  expressionAxis: ExpressionAxis;
  spectrums: SpectrumValues;
  rangeInfo: RangeInfo;
  baseF0: number;
  stabilityScore: number;
  rawMetrics: Record<string, number>;
}

/**
 * Analyze raw test data from all 3 phases and produce a complete
 * voice profile classification.
 *
 * This is the main entry point for the profile analyzer.
 */
export function analyzeVoiceProfile(
  allData: AllTestData,
): ProfileAnalysisResult {
  // 1. Classify axes
  const toneResult = analyzeToneAxis(allData.sustained);
  const exprResult = analyzeExpressionAxis(allData.expression);

  // 2. Calculate spectrums
  const spectrums = calculateSpectrums(
    allData,
    toneResult.metrics,
    exprResult.metrics,
  );

  // 3. Extract range info
  const rangeInfo = extractRangeInfo(allData);

  // 4. Stability score
  const stabilityScore = computeStabilityScore(
    allData.sustained,
    toneResult.metrics.medianHnr,
  );

  return {
    toneAxis: toneResult.axis,
    expressionAxis: exprResult.axis,
    spectrums,
    rangeInfo,
    baseF0: Math.round(toneResult.metrics.medianF0),
    stabilityScore,
    rawMetrics: {
      ...toneResult.metrics,
      ...exprResult.metrics,
      lowHz: rangeInfo.lowHz,
      highHz: rangeInfo.highHz,
      octaves: rangeInfo.octaves,
    },
  };
}
