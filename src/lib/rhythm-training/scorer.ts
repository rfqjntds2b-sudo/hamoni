// ============================================================
// Rhythm Training — Scoring Algorithm
// ============================================================
// Score = hitRate*0.6*100 + timingScore*0.25 + consistencyBonus*0.15
// Window narrows with level: 150ms * (1.5 - level * 0.08)
// ============================================================

import type { RhythmPattern, BeatResult, RhythmSessionResult, Subdivision } from './types';

/**
 * Get the duration multiplier for a subdivision relative to a quarter note.
 */
function subdivisionDuration(sub: Subdivision): number {
  switch (sub) {
    case 'quarter':
      return 1;
    case 'eighth':
      return 0.5;
    case 'sixteenth':
      return 0.25;
    case 'dotted_quarter':
      return 1.5;
    case 'rest':
      return 1;
    default:
      return 1;
  }
}

/**
 * Calculate expected beat times from pattern and BPM.
 * Returns timestamps in ms relative to start (0ms).
 * Rests are excluded since the user shouldn't tap on them.
 */
function calculateExpectedBeats(
  pattern: RhythmPattern,
  bpm: number,
): { timeMs: number; index: number }[] {
  const quarterMs = 60000 / bpm;
  const expected: { timeMs: number; index: number }[] = [];
  let currentMs = 0;

  for (let i = 0; i < pattern.beats.length; i++) {
    const beat = pattern.beats[i];
    const isRest = beat.subdivision === 'rest';

    if (!isRest) {
      expected.push({ timeMs: currentMs, index: i });
    }

    currentMs += quarterMs * subdivisionDuration(beat.subdivision);
  }

  return expected;
}

/**
 * Score a rhythm training session.
 *
 * @param pattern - The rhythm pattern that was played
 * @param bpm - The tempo in beats per minute
 * @param onsets - Detected onset timestamps in ms (relative to perform start)
 * @param level - Current difficulty level (1-6)
 * @returns Complete session result with per-beat breakdown
 */
export function scoreRhythmSession(
  pattern: RhythmPattern,
  bpm: number,
  onsets: number[],
  level: number,
): RhythmSessionResult {
  const expectedBeats = calculateExpectedBeats(pattern, bpm);
  const totalBeats = expectedBeats.length;

  if (totalBeats === 0) {
    return {
      patternId: pattern.id,
      bpm,
      level,
      totalBeats: 0,
      hits: 0,
      misses: 0,
      avgDeviationMs: 0,
      stdDeviationMs: 0,
      accuracy: 0,
      score: 0,
      beatResults: [],
    };
  }

  // Window narrows with level: 150ms base, shrinks slightly per level
  const windowMs = 150 * (1.5 - level * 0.08);

  // Track which onsets have been matched (greedy nearest-match)
  const usedOnsets = new Set<number>();
  const beatResults: BeatResult[] = [];
  const deviations: number[] = [];

  for (const expected of expectedBeats) {
    let bestOnsetIdx = -1;
    let bestDeviation = Infinity;

    // Find the closest unmatched onset within the window
    for (let j = 0; j < onsets.length; j++) {
      if (usedOnsets.has(j)) continue;

      const deviation = Math.abs(onsets[j] - expected.timeMs);
      if (deviation <= windowMs && deviation < bestDeviation) {
        bestDeviation = deviation;
        bestOnsetIdx = j;
      }
    }

    if (bestOnsetIdx >= 0) {
      usedOnsets.add(bestOnsetIdx);
      deviations.push(bestDeviation);
      beatResults.push({
        expectedMs: expected.timeMs,
        actualMs: onsets[bestOnsetIdx],
        deviationMs: bestDeviation,
        hit: true,
      });
    } else {
      beatResults.push({
        expectedMs: expected.timeMs,
        actualMs: null,
        deviationMs: windowMs, // Max penalty for misses
        hit: false,
      });
    }
  }

  const hits = beatResults.filter((b) => b.hit).length;
  const misses = totalBeats - hits;

  // Average and standard deviation of timing errors (only from hits)
  const avgDeviationMs =
    deviations.length > 0
      ? deviations.reduce((sum, d) => sum + d, 0) / deviations.length
      : windowMs;

  const stdDeviationMs =
    deviations.length > 1
      ? Math.sqrt(
          deviations.reduce((sum, d) => sum + (d - avgDeviationMs) ** 2, 0) /
            (deviations.length - 1),
        )
      : 0;

  // ── Score calculation ──
  // 1. Hit rate component (60% weight)
  const hitRate = totalBeats > 0 ? hits / totalBeats : 0;
  const hitComponent = hitRate * 0.6 * 100;

  // 2. Timing score (25% weight) — how close hits were to expected
  // Perfect = 0ms deviation → 100, at window edge → 0
  const timingScore =
    deviations.length > 0
      ? (deviations.reduce((sum, d) => sum + Math.max(0, 1 - d / windowMs), 0) /
          totalBeats) *
        0.25 *
        100
      : 0;

  // 3. Consistency bonus (15% weight) — low std deviation = bonus
  // stdDev < 20ms → full bonus, stdDev > windowMs → no bonus
  const consistencyRatio =
    deviations.length > 1 ? Math.max(0, 1 - stdDeviationMs / windowMs) : hitRate > 0 ? 1 : 0;
  const consistencyBonus = consistencyRatio * 0.15 * 100;

  const score = Math.round(Math.min(100, Math.max(0, hitComponent + timingScore + consistencyBonus)));
  const accuracy = Math.round(hitRate * 100) / 100;

  return {
    patternId: pattern.id,
    bpm,
    level,
    totalBeats,
    hits,
    misses,
    avgDeviationMs: Math.round(avgDeviationMs * 10) / 10,
    stdDeviationMs: Math.round(stdDeviationMs * 10) / 10,
    accuracy,
    score,
    beatResults,
  };
}
