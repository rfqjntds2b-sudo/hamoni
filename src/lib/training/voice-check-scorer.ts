// ============================================================
// Training Feature — Voice Check Scorer
// ============================================================
// Calculates per-day voice health scores from raw metrics and
// persists them in localStorage with 90-day retention.

import type { VoiceCheckDay, VoiceCheckData } from './types';
import type { VoiceType } from './voice-type-offsets';
import { getNormalizedVoiceCheckParams } from './voice-type-offsets';
import { toScore } from './utils';
import { getItem, setItem } from './storage';
import { syncVoiceCheck } from './sync';
import { todayString, daysAgoString } from './date-utils';

// ============================================================
// Constants
// ============================================================

const VOICE_CHECK_KEY = 'hamoni:voiceCheck';
const PRUNE_DAYS = 90;

/**
 * Migration version — bump this when scoring thresholds change.
 * v2: PPQ5 1.04% / APQ3+RMS 3.81% (Praat 정상 상한)
 */
const SCORING_VERSION = 2;
const MIGRATION_KEY = 'hamoni:voiceCheckVersion';

/** Standard deviation of a number array */
function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffSum = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return Math.sqrt(sqDiffSum / (values.length - 1)); // sample std
}

// ============================================================
// calculateVoiceCheckScore
// ============================================================

/**
 * Compute a VoiceCheckDay from raw voice metrics.
 *
 * Scoring ranges (mapped to 0-100, PPQ5/APQ3+RMS 기준):
 * - f0Score:      std(f0Values) 1.0 (best) → 10 (worst), inverse
 * - jitterScore:  PPQ5 jitter   best → worst per voice type, inverse
 * - shimmerScore: APQ3 shimmer  best → worst per voice type, inverse
 * - hnrScore:     hnr           worst → best per voice type, normal
 * - overall:      mean of 4 subscores
 */
export function calculateVoiceCheckScore(data: {
  f0Values: number[];
  jitter: number;
  shimmer: number;
  hnr: number;
}, voiceType?: VoiceType | null): VoiceCheckDay {
  const f0Std = std(data.f0Values);
  const params = getNormalizedVoiceCheckParams(voiceType ?? null);

  const f0Score = toScore(f0Std, 1.0, 10, true);
  const jitterScore = toScore(data.jitter, params.jitterBest, params.jitterWorst, true);
  const shimmerScore = toScore(data.shimmer, params.shimmerBest, params.shimmerWorst, true);
  const hnrScore = toScore(data.hnr, params.hnrBest, params.hnrWorst, false);

  const overall = Math.round(
    (f0Score + jitterScore + shimmerScore + hnrScore) / 4,
  );

  return {
    date: todayString(),
    overall,
    f0Score,
    jitterScore,
    shimmerScore,
    hnrScore,
  };
}

// ============================================================
// getVoiceCheckData
// ============================================================

/**
 * Read all voice-check data from localStorage.
 * Returns `{ days: [] }` when no data exists.
 */
export function getVoiceCheckData(): VoiceCheckData {
  try {
    const raw = getItem(VOICE_CHECK_KEY);
    if (raw) {
      return JSON.parse(raw) as VoiceCheckData;
    }
  } catch {
    // Corrupt data — fall through
  }
  return { days: [] };
}

// ============================================================
// saveVoiceCheck
// ============================================================

/**
 * Save a voice-check day entry.
 * - Replaces any existing entry for the same date
 * - Prunes entries older than 90 days
 */
export function saveVoiceCheck(day: VoiceCheckDay): void {
  const data = getVoiceCheckData();

  // Replace existing entry for same date
  const idx = data.days.findIndex((d) => d.date === day.date);
  if (idx >= 0) {
    data.days[idx] = day;
  } else {
    data.days.push(day);
  }

  // Prune entries older than 90 days
  const cutoff = daysAgoString(PRUNE_DAYS);
  data.days = data.days.filter((d) => d.date >= cutoff);

  try {
    setItem(VOICE_CHECK_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }

  // Fire-and-forget sync to Supabase
  syncVoiceCheck(day);
}

// ============================================================
// getTodayVoiceCheck
// ============================================================

/**
 * Get today's voice-check entry, or null if not done yet.
 */
export function getTodayVoiceCheck(): VoiceCheckDay | null {
  const data = getVoiceCheckData();
  return data.days.find((d) => d.date === todayString()) ?? null;
}

// ============================================================
// getLatestVoiceCheck
// ============================================================

/**
 * Get the most recent voice-check entry regardless of date.
 * Used by the recommender so that post-curriculum users don't
 * fall back to beginner exercises just because they haven't
 * done a voice check *today*.
 */
export function getLatestVoiceCheck(): VoiceCheckDay | null {
  const data = getVoiceCheckData();
  if (data.days.length === 0) return null;
  return data.days.reduce((latest, d) => (d.date > latest.date ? d : latest));
}

// ============================================================
// updateFromSessionMetrics — auto-harvest voice data from training sessions
// ============================================================

/**
 * Update today's voice check scores using accumulated session metrics.
 * Called automatically after each sustained-tone training session so
 * the recommender always has fresh data without manual voice checks.
 *
 * Uses exponential moving average with existing today's score to avoid
 * single-session outliers from overriding a full voice check.
 */
export function updateFromSessionMetrics(
  sessionMetrics: {
    jitterValues: number[];
    shimmerValues: number[];
    hnrValues: number[];
    f0Values: number[];
    isVoicedValues: boolean[];
  },
  voiceType?: VoiceType | null,
): void {
  // Only use voiced frames with non-zero values
  const voiced = (vals: number[], mask: boolean[]) =>
    vals.filter((v, i) => i < mask.length && mask[i] && v > 0);

  const jitterVoiced = voiced(sessionMetrics.jitterValues, sessionMetrics.isVoicedValues);
  const shimmerVoiced = voiced(sessionMetrics.shimmerValues, sessionMetrics.isVoicedValues);
  const hnrVoiced = voiced(sessionMetrics.hnrValues, sessionMetrics.isVoicedValues);
  const f0Voiced = voiced(sessionMetrics.f0Values, sessionMetrics.isVoicedValues);

  // Need enough voiced data for reliable measurement
  if (jitterVoiced.length < 5 || f0Voiced.length < 5) return;

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const sessionScore = calculateVoiceCheckScore({
    f0Values: f0Voiced,
    jitter: avg(jitterVoiced),
    shimmer: avg(shimmerVoiced),
    hnr: avg(hnrVoiced),
  }, voiceType);

  // Blend with today's existing score if present (EMA alpha=0.3 for session data)
  const existing = getTodayVoiceCheck();
  if (existing) {
    const alpha = 0.3;
    sessionScore.f0Score = Math.round(existing.f0Score * (1 - alpha) + sessionScore.f0Score * alpha);
    sessionScore.jitterScore = Math.round(existing.jitterScore * (1 - alpha) + sessionScore.jitterScore * alpha);
    sessionScore.shimmerScore = Math.round(existing.shimmerScore * (1 - alpha) + sessionScore.shimmerScore * alpha);
    sessionScore.hnrScore = Math.round(existing.hnrScore * (1 - alpha) + sessionScore.hnrScore * alpha);
    sessionScore.overall = Math.round(
      (sessionScore.f0Score + sessionScore.jitterScore + sessionScore.shimmerScore + sessionScore.hnrScore) / 4,
    );
  }

  saveVoiceCheck(sessionScore);
}

// ============================================================
// Scoring threshold migration
// ============================================================

/**
 * Check if voice check scores need migration due to threshold changes.
 * Clears stale scores that were calculated with old thresholds.
 * Returns true if migration was performed (caller should show notification).
 */
export function migrateVoiceCheckIfNeeded(): boolean {
  try {
    const versionRaw = getItem(MIGRATION_KEY);
    const currentVersion = versionRaw ? Number(versionRaw) : 0;

    if (currentVersion >= SCORING_VERSION) return false;

    // Old scores were calculated with different thresholds — clear them
    const data = getVoiceCheckData();
    const hadData = data.days.length > 0;

    if (hadData) {
      setItem(VOICE_CHECK_KEY, JSON.stringify({ days: [] }));
    }

    setItem(MIGRATION_KEY, String(SCORING_VERSION));
    return hadData;
  } catch {
    return false;
  }
}
