// ============================================================
// Training Feature — DSP Analysis Helper Functions
// ============================================================
// All functions are pure (no side effects) and handle edge cases
// (empty arrays, all-zero, single element) by returning 0.

/**
 * Convert the interval between two frequencies to cents.
 * 1200 cents = 1 octave.
 */
function hzToCents(f1: number, f2: number): number {
  if (f1 <= 0 || f2 <= 0) return 0;
  return 1200 * Math.log2(f2 / f1);
}

/**
 * Calculate pitch smoothness as a percentage (0-100).
 *
 * Filters out 0/unvoiced frames, computes inter-frame cents difference,
 * and returns the percentage of transitions within the threshold.
 *
 * @param f0Values - array of F0 values in Hz (0 = unvoiced)
 * @param threshold - max cents jump to consider "smooth" (default 50)
 * @returns percentage 0-100 (0 if insufficient data)
 */
export function calculatePitchSmoothness(
  f0Values: number[],
  threshold = 50,
): number {
  const voiced = f0Values.filter((v) => v > 0);
  if (voiced.length < 2) return 0;

  let smoothCount = 0;
  const totalTransitions = voiced.length - 1;

  for (let i = 0; i < totalTransitions; i++) {
    const cents = Math.abs(hzToCents(voiced[i], voiced[i + 1]));
    if (cents <= threshold) {
      smoothCount++;
    }
  }

  return (smoothCount / totalTransitions) * 100;
}

/**
 * Calculate the dynamic range of an RMS array in decibels.
 *
 * Filters out silent frames (< 0.001), then computes 20 * log10(max/min).
 *
 * @param rmsValues - array of RMS amplitude values
 * @returns dynamic range in dB (0 if insufficient data)
 */
export function calculateDynamicRange(rmsValues: number[]): number {
  const audible = rmsValues.filter((v) => v >= 0.001);
  if (audible.length < 1) return 0;

  const max = Math.max(...audible);
  const min = Math.min(...audible);
  if (min <= 0 || max <= 0) return 0;

  return 20 * Math.log10(max / min);
}

/**
 * Count the number of pitch breaks (jumps exceeding a threshold in cents).
 *
 * Filters out 0/unvoiced frames before counting.
 *
 * @param f0Values - array of F0 values in Hz (0 = unvoiced)
 * @param threshold - cents jump threshold to count as a break (default 200)
 * @returns number of breaks (0 if insufficient data)
 */
export function countPitchBreaks(
  f0Values: number[],
  threshold = 200,
): number {
  const voiced = f0Values.filter((v) => v > 0);
  if (voiced.length < 2) return 0;

  let breaks = 0;
  for (let i = 0; i < voiced.length - 1; i++) {
    const cents = Math.abs(hzToCents(voiced[i], voiced[i + 1]));
    if (cents > threshold) {
      breaks++;
    }
  }

  return breaks;
}

/**
 * Calculate the maximum F0 deviation from a baseline.
 *
 * Uses the average of up to the first 10 non-zero frames as the baseline,
 * then returns the maximum absolute deviation in Hz across all frames.
 *
 * @param f0Values - array of F0 values in Hz (0 = unvoiced)
 * @returns max deviation in Hz (0 if insufficient data)
 */
export function calculateF0Deviation(f0Values: number[]): number {
  const voiced = f0Values.filter((v) => v > 0);
  if (voiced.length < 2) return 0;

  // Baseline: average of up to the first 10 voiced frames
  const baselineFrames = voiced.slice(0, Math.min(10, voiced.length));
  const baseline =
    baselineFrames.reduce((sum, v) => sum + v, 0) / baselineFrames.length;

  let maxDeviation = 0;
  for (const v of voiced) {
    const deviation = Math.abs(v - baseline);
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
    }
  }

  return maxDeviation;
}

/**
 * Calculate the pitch range in octaves from an array of F0 values.
 *
 * Filters out zero/unvoiced values, then computes log2(max/min).
 *
 * @param f0Values - array of F0 values in Hz (0 = unvoiced)
 * @returns range in octaves (0 if insufficient data)
 */
export function calculateRangeOctaves(f0Values: number[]): number {
  const voiced = f0Values.filter((v) => v > 0);
  if (voiced.length < 2) return 0;

  const max = Math.max(...voiced);
  const min = Math.min(...voiced);
  if (min <= 0) return 0;

  return Math.log2(max / min);
}

/**
 * Compute a weighted trimmed mean.
 * If weights are not provided, falls back to equal-weight mean.
 */
export function weightedTrimmedMean(
  values: number[],
  weights?: number[],
  trimPercent = 10,
): number {
  if (values.length === 0) return 0;

  const w = weights ?? values.map(() => 1);
  const pairs = values.map((v, i) => ({ v, w: w[i] ?? 1 }));
  pairs.sort((a, b) => a.v - b.v);

  const trimCount = Math.floor(pairs.length * trimPercent / 100);
  const trimmed = pairs.slice(trimCount, pairs.length - trimCount || undefined);

  if (trimmed.length === 0) return 0;

  let sumVW = 0;
  let sumW = 0;
  for (const p of trimmed) {
    sumVW += p.v * p.w;
    sumW += p.w;
  }

  return sumW > 0 ? sumVW / sumW : 0;
}

/**
 * Calculate a trimmed (stable) average of a numeric array.
 *
 * Sorts the values, removes the top and bottom trimPercent%, then
 * computes the mean of the remaining values.
 *
 * @param values - array of numeric values
 * @param trimPercent - percentage to trim from each end (default 5)
 * @returns trimmed mean (0 if empty)
 */
export function calculateStableAverage(
  values: number[],
  trimPercent = 5,
): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor((sorted.length * trimPercent) / 100);

  const trimmed =
    trimCount > 0
      ? sorted.slice(trimCount, sorted.length - trimCount)
      : sorted;

  // If trimming removed all elements, fall back to full array
  if (trimmed.length === 0) {
    return sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  }

  return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
}

/**
 * Calculate the longest sustained duration where all criteria are met.
 *
 * Finds the longest consecutive run of frames with meetsCriteria=true
 * and converts to seconds using intervalMs.
 *
 * @param frames - array of frame objects with meetsCriteria boolean
 * @param intervalMs - time interval per frame in milliseconds (default 100)
 * @returns sustained duration in seconds (0 if no frames meet criteria)
 */
export function calculateSustainedDuration(
  frames: { meetsCriteria: boolean }[],
  intervalMs = 100,
): number {
  if (frames.length === 0) return 0;

  let maxRun = 0;
  let currentRun = 0;

  for (const frame of frames) {
    if (frame.meetsCriteria) {
      currentRun++;
      if (currentRun > maxRun) {
        maxRun = currentRun;
      }
    } else {
      currentRun = 0;
    }
  }

  return (maxRun * intervalMs) / 1000;
}

/**
 * Calculate mean absolute cents deviation from target pitch.
 * Uses trimmed mean (5%) to exclude outlier frames.
 *
 * @param centsValues - array of absolute cents deviation values
 * @returns trimmed mean of absolute cents (0 if empty)
 */
export function calculateMeanCentsDeviation(centsValues: number[]): number {
  if (centsValues.length === 0) return 0;
  return calculateStableAverage(centsValues, 5);
}
