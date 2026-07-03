// ============================================================
// Training Feature — Breath Control Analysis Functions
// ============================================================
// Pure functions for RMS-based breath control metrics.
// Used by the evaluator for breath_alloc, sz_ratio, phrase_sim,
// airflow_stable, and mpt exercises.

/**
 * Coefficient of variation of RMS values (lower = more consistent airflow).
 * Filters out silent frames (rms < minRms).
 */
export function calculateRmsCV(rmsValues: number[], minRms = 0.01): number {
  const voiced = rmsValues.filter((v) => v >= minRms);
  if (voiced.length < 5) return 1; // not enough data
  const mean = voiced.reduce((a, b) => a + b, 0) / voiced.length;
  if (mean < 0.001) return 1;
  const variance =
    voiced.reduce((sum, v) => sum + (v - mean) ** 2, 0) / voiced.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Duration of sustained airflow above minimum threshold (seconds).
 * Returns the longest consecutive run of frames above minRms.
 */
export function calculateSustainedAirflow(
  rmsValues: number[],
  minRms = 0.01,
  intervalMs = 200,
): number {
  let maxRun = 0;
  let currentRun = 0;
  for (const rms of rmsValues) {
    if (rms >= minRms) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }
  return (maxRun * intervalMs) / 1000;
}

/**
 * RMS contour consistency score (0-100).
 * For 'flat' pattern: measures how stable the RMS is over time.
 * For 'descending': measures smooth decay.
 * For 'phrase': measures even segments separated by brief dips.
 */
export function calculateRmsContourScore(
  rmsValues: number[],
  pattern: 'flat' | 'descending' | 'phrase' = 'flat',
): number {
  const voiced = rmsValues.filter((v) => v >= 0.01);
  if (voiced.length < 5) return 0;

  if (pattern === 'flat') {
    const cv = calculateRmsCV(voiced, 0);
    return Math.round(Math.max(0, Math.min(100, (1 - cv * 2) * 100)));
  }

  if (pattern === 'descending') {
    // Check if RMS generally decreases over time
    let decreasing = 0;
    for (let i = 1; i < voiced.length; i++) {
      if (voiced[i] <= voiced[i - 1] + 0.01) decreasing++;
    }
    return Math.round((decreasing / (voiced.length - 1)) * 100);
  }

  // 'phrase' pattern: treat as flat for now (simplified)
  return calculateRmsContourScore(voiced, 'flat');
}

/**
 * S/Z ratio: ratio of sustained /s/ duration to sustained /z/ duration.
 * Normal ~1.0. >1.4 suggests poor laryngeal valving.
 *
 * Splits the rmsValues at the midpoint: first half = /s/, second half = /z/.
 */
export function calculateSZRatio(
  rmsValues: number[],
  intervalMs = 200,
  minRms = 0.01,
): number {
  const mid = Math.floor(rmsValues.length / 2);
  const sPhase = rmsValues.slice(0, mid);
  const zPhase = rmsValues.slice(mid);

  const sDuration =
    (sPhase.filter((v) => v >= minRms).length * intervalMs) / 1000;
  const zDuration =
    (zPhase.filter((v) => v >= minRms).length * intervalMs) / 1000;

  if (zDuration < 0.5) return 0; // too short
  return sDuration / zDuration;
}
