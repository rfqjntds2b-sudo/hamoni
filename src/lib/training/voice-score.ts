// ============================================================
// Training Feature — Composite Voice Score
// ============================================================
// Pure utility that computes a 0-100 composite "voice score"
// from voice check metrics (Jitter/Shimmer/HNR/F0 stability).
// Used by the Pro stats page.

import type { VoiceCheckData } from './types';

// ============================================================
// Types
// ============================================================

export interface VoiceScoreResult {
  /** Composite score 0-100, or null if no voice check data */
  score: number | null;
  /** Point change from last week (e.g., +5 or -3) */
  trend: number;
  trendDirection: 'up' | 'stable' | 'down';
  components: {
    jitterScore: number | null;   // 0-100
    shimmerScore: number | null;  // 0-100
    hnrScore: number | null;      // 0-100
    f0Score: number | null;       // 0-100
  };
}

export type HumanMetricKey =
  | 'voiceStability'
  | 'volumeConsistency'
  | 'voiceClarity'
  | 'pitchAccuracy';

export const METRIC_HUMAN_MAP: Record<string, HumanMetricKey> = {
  jitter: 'voiceStability',
  shimmer: 'volumeConsistency',
  hnr: 'voiceClarity',
  f0Std: 'pitchAccuracy',
  Jitter: 'voiceStability',
  Shimmer: 'volumeConsistency',
  HNR: 'voiceClarity',
};

// ============================================================
// Constants
// ============================================================

const WEIGHT_JITTER = 0.25;
const WEIGHT_SHIMMER = 0.25;
const WEIGHT_HNR = 0.30;
const WEIGHT_F0 = 0.20;

const TREND_STABLE_THRESHOLD = 5;

// ============================================================
// Helpers
// ============================================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function avgScoreForDays(
  days: VoiceCheckData['days'],
  from: Date,
  to: Date,
): number | null {
  const filtered = (days ?? []).filter((d) => {
    const date = new Date(d.date + 'T00:00:00');
    return date >= from && date < to;
  });
  if (filtered.length === 0) return null;
  const sum = filtered.reduce((acc, d) => acc + d.overall, 0);
  return Math.round(sum / filtered.length);
}

// ============================================================
// Main function
// ============================================================

/**
 * Compute voice score from voice check metrics.
 *
 * voiceScore = jitter*0.25 + shimmer*0.25 + hnr*0.30 + f0*0.20
 *
 * Uses the most recent voice check day. Returns null score if no data.
 */
export function computeVoiceScore(
  voiceCheck: VoiceCheckData,
): VoiceScoreResult {
  const days = voiceCheck.days ?? [];

  if (days.length === 0) {
    return {
      score: null,
      trend: 0,
      trendDirection: 'stable',
      components: { jitterScore: null, shimmerScore: null, hnrScore: null, f0Score: null },
    };
  }

  // Latest day (sorted newest first in storage)
  const latest = days[0];
  const { jitterScore, shimmerScore, hnrScore, f0Score } = latest;

  const score = Math.round(
    jitterScore * WEIGHT_JITTER +
    shimmerScore * WEIGHT_SHIMMER +
    hnrScore * WEIGHT_HNR +
    f0Score * WEIGHT_F0,
  );

  // ---- Trend: this week avg vs last week avg ----
  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const thisWeekAvg = avgScoreForDays(days, thisWeekStart, nextWeekStart);
  const lastWeekAvg = avgScoreForDays(days, lastWeekStart, thisWeekStart);

  let trend = 0;
  let trendDirection: 'up' | 'stable' | 'down' = 'stable';

  if (thisWeekAvg !== null && lastWeekAvg !== null) {
    trend = thisWeekAvg - lastWeekAvg;
    if (trend >= TREND_STABLE_THRESHOLD) {
      trendDirection = 'up';
    } else if (trend <= -TREND_STABLE_THRESHOLD) {
      trendDirection = 'down';
    }
  }

  return {
    score,
    trend,
    trendDirection,
    components: { jitterScore, shimmerScore, hnrScore, f0Score },
  };
}
