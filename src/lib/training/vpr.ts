// ============================================================
// Training Feature — Voice Proficiency Rating (VPR)
// ============================================================
// Real-time skill indicator based on recent training performance.
// Unlike XP (effort accumulation), VPR reflects CURRENT vocal ability.
//
// Data source: CriterionResult.actual values from recent passed sessions.
// Scoring: Training-specific ranges (stricter than voice-check) → 0-100.
//
// Metric weights:
//   HNR 30% — voice clarity is the most holistic quality indicator
//   Jitter 25% — vocal fold stability is foundational
//   Shimmer 20% — volume consistency
//   F0 Stability 15% — pitch control
//   Exercise Diversity 10% — breadth of skill (not just one exercise)

import type { SessionRecord, CriterionResult } from './types';
import { toScore } from './utils';

// ============================================================
// Types
// ============================================================

export interface VPRResult {
  /** Overall VPR score 0-100 */
  score: number;
  /** Component scores 0-100 */
  components: {
    jitter: number;
    shimmer: number;
    hnr: number;
    f0Stability: number;
    diversity: number;
  };
  /** Number of sessions used for calculation */
  sessionCount: number;
  /** True if enough data for a reliable rating */
  reliable: boolean;
}

// ============================================================
// Constants
// ============================================================

/** Minimum passed sessions needed for a reliable VPR */
const MIN_SESSIONS = 10;

/** Maximum sessions to consider (most recent) */
const MAX_SESSIONS = 30;

/** Minimum metric samples needed to include that metric */
const MIN_METRIC_SAMPLES = 5;

/**
 * VPR scoring ranges — stricter than voice-check because these
 * evaluate trained performance, not general vocal health.
 *
 * These ranges determine what "100" and "0" mean for each metric.
 * A VPR of 88+ should genuinely represent professional-level ability.
 */
const VPR_RANGES = {
  //                  best    worst
  jitter:   { best: 0.20, worst: 2.0 },   // % — pro: <0.4, trained: <0.7
  shimmer:  { best: 1.00, worst: 5.0 },   // % — pro: <1.5, trained: <2.5
  hnr:      { best: 25.0, worst: 10.0 },  // dB — pro: >22, trained: >18
  f0Std:    { best: 0.50, worst: 8.0 },   // Hz — pro: <1.5, trained: <3.0
} as const;

/** Metric weights (must sum to 1.0) */
const WEIGHTS = {
  hnr: 0.30,
  jitter: 0.25,
  shimmer: 0.20,
  f0Stability: 0.15,
  diversity: 0.10,
} as const;

/**
 * What each VPR level means in real-world terms:
 *
 * VPR 40 (보컬 수련생):
 *   Jitter ~1.3%, Shimmer ~3.4%, HNR ~16dB, F0 Std ~5.2Hz
 *   → Beginner with basic vocal awareness
 *
 * VPR 55 (발성 장인):
 *   Jitter ~1.0%, Shimmer ~2.8%, HNR ~18.3dB, F0 Std ~4.1Hz
 *   → Hobbyist vocalist, noticeably above average
 *
 * VPR 72 (가왕):
 *   Jitter ~0.65%, Shimmer ~2.1%, HNR ~20.8dB, F0 Std ~2.6Hz
 *   → Trained vocalist, comparable to good choir member or vocal student
 *
 * VPR 88 (비르투오소):
 *   Jitter ~0.42%, Shimmer ~1.5%, HNR ~23.2dB, F0 Std ~1.4Hz
 *   → Professional-level technique, near-clinical-excellent metrics
 */

// ============================================================
// Criterion name → metric extraction
// ============================================================

/** Known criterion names that carry voice quality metrics */
const METRIC_CRITERIA: Record<string, keyof typeof VPR_RANGES> = {
  jitterMax: 'jitter',
  shimmerMax: 'shimmer',
  hnrMin: 'hnr',
  f0StdMax: 'f0Std',
};

interface ExtractedMetrics {
  jitter: number[];
  shimmer: number[];
  hnr: number[];
  f0Std: number[];
  exerciseIds: Set<string>;
}

/**
 * Extract raw metric values from criterion results of passed sessions.
 * Only PASSED sessions contribute — failures don't represent your ability.
 */
function extractMetrics(sessions: SessionRecord[]): ExtractedMetrics {
  const metrics: ExtractedMetrics = {
    jitter: [],
    shimmer: [],
    hnr: [],
    f0Std: [],
    exerciseIds: new Set(),
  };

  for (const session of sessions) {
    if (!session.passed) continue;
    metrics.exerciseIds.add(session.exerciseId);

    for (const cr of session.criterionResults) {
      const metricKey = METRIC_CRITERIA[cr.name];
      if (metricKey && Number.isFinite(cr.actual) && cr.actual > 0) {
        metrics[metricKey].push(cr.actual);
      }
    }
  }

  return metrics;
}

// ============================================================
// Diversity scoring
// ============================================================

/**
 * Score exercise diversity 0-100.
 *   1 exercise  = 0
 *   3 exercises = 30
 *   6 exercises = 60
 *   10+         = 100
 */
function scoreDiversity(uniqueExercises: number): number {
  return Math.min(100, Math.round((uniqueExercises / 10) * 100));
}

// ============================================================
// Trimmed mean — removes top/bottom 10% outliers
// ============================================================

function trimmedMean(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length <= 4) {
    return values.reduce((s, v) => s + v, 0) / values.length;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  return trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
}

// ============================================================
// computeVPR
// ============================================================

/**
 * Compute Voice Proficiency Rating from recent session history.
 *
 * @param sessions - Session records, newest first (will take up to MAX_SESSIONS)
 * @returns VPR result with score, components, and reliability flag
 */
export function computeVPR(sessions: readonly SessionRecord[]): VPRResult {
  // Take most recent sessions up to MAX_SESSIONS
  const recent = sessions.slice(0, MAX_SESSIONS);
  const passedSessions = recent.filter((s) => s.passed);
  const metrics = extractMetrics([...passedSessions]);

  const hasJitter = metrics.jitter.length >= MIN_METRIC_SAMPLES;
  const hasShimmer = metrics.shimmer.length >= MIN_METRIC_SAMPLES;
  const hasHnr = metrics.hnr.length >= MIN_METRIC_SAMPLES;
  const hasF0 = metrics.f0Std.length >= MIN_METRIC_SAMPLES;

  // Score each available metric
  const jitterScore = hasJitter
    ? toScore(trimmedMean(metrics.jitter), VPR_RANGES.jitter.best, VPR_RANGES.jitter.worst, true)
    : 0;
  const shimmerScore = hasShimmer
    ? toScore(trimmedMean(metrics.shimmer), VPR_RANGES.shimmer.best, VPR_RANGES.shimmer.worst, true)
    : 0;
  const hnrScore = hasHnr
    ? toScore(trimmedMean(metrics.hnr), VPR_RANGES.hnr.best, VPR_RANGES.hnr.worst, false)
    : 0;
  const f0Score = hasF0
    ? toScore(trimmedMean(metrics.f0Std), VPR_RANGES.f0Std.best, VPR_RANGES.f0Std.worst, true)
    : 0;
  const diversityScore = scoreDiversity(metrics.exerciseIds.size);

  // Redistribute weights for missing metrics
  let totalWeight = 0;
  const activeWeights: Record<string, number> = {};

  if (hasJitter) { activeWeights.jitter = WEIGHTS.jitter; totalWeight += WEIGHTS.jitter; }
  if (hasShimmer) { activeWeights.shimmer = WEIGHTS.shimmer; totalWeight += WEIGHTS.shimmer; }
  if (hasHnr) { activeWeights.hnr = WEIGHTS.hnr; totalWeight += WEIGHTS.hnr; }
  if (hasF0) { activeWeights.f0Stability = WEIGHTS.f0Stability; totalWeight += WEIGHTS.f0Stability; }
  activeWeights.diversity = WEIGHTS.diversity;
  totalWeight += WEIGHTS.diversity;

  // Normalize weights to sum to 1.0
  const norm = totalWeight > 0 ? 1 / totalWeight : 0;

  const score = Math.round(
    (activeWeights.jitter ?? 0) * norm * jitterScore +
    (activeWeights.shimmer ?? 0) * norm * shimmerScore +
    (activeWeights.hnr ?? 0) * norm * hnrScore +
    (activeWeights.f0Stability ?? 0) * norm * f0Score +
    activeWeights.diversity * norm * diversityScore,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    components: {
      jitter: jitterScore,
      shimmer: shimmerScore,
      hnr: hnrScore,
      f0Stability: f0Score,
      diversity: diversityScore,
    },
    sessionCount: passedSessions.length,
    reliable: passedSessions.length >= MIN_SESSIONS,
  };
}

// ============================================================
// countRecentSessions — activity check for title maintenance
// ============================================================

/**
 * Count sessions (passed or failed) within the last N days.
 */
export function countRecentSessions(
  sessions: readonly SessionRecord[],
  days: number,
): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => new Date(s.timestamp).getTime() >= cutoff).length;
}
