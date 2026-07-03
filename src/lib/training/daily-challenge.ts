// ============================================================
// Daily Challenge — Deterministic "Exercise of the Day"
// ============================================================
// Picks a daily exercise based on the date, so every user sees the
// same challenge on the same day. No storage needed — pure function.
//
// Also generates a short daily tip that rotates weekly.
// ============================================================

import type { ExerciseId } from './types';

/**
 * Pool of exercises eligible for daily challenge.
 * Ordered from easier to harder so the rotation feels varied.
 */
const CHALLENGE_POOL: ExerciseId[] = [
  'breathing', 'humming', 'lip_trill', 'breath_sustain',
  'straw', 'yawn_sigh', 'flow', 'basic_dynamic',
  'resonant', 'vibrato',
  'passaggio_sustain', 'vowel_sustain', 'vowel_transition',
  'vfe', 'pitch_glide', 'register_blend', 'messa',
  'breath_alloc', 'sz_ratio', 'phrase_sim', 'airflow_stable', 'mpt',
];

/**
 * Simple date-based hash for deterministic pseudo-random selection.
 * Uses the date string "YYYY-MM-DD" to produce a stable index.
 */
function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get today's challenge exercise ID.
 * Deterministic: same date → same exercise for all users.
 */
export function getDailyChallengeExercise(todayDate: string): ExerciseId {
  const pool = CHALLENGE_POOL;
  const seed = dateSeed(todayDate);
  const pick = pool[seed % pool.length];

  // Avoid repeating yesterday's exercise
  const d = new Date(todayDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  const yesterdaySeed = dateSeed(yesterday);
  const yesterdayPick = pool[yesterdaySeed % pool.length];

  if (pick === yesterdayPick) {
    return pool[(seed + 1) % pool.length];
  }
  return pick;
}

/**
 * Daily tip keys rotate on a 7-day cycle.
 * Returns an i18n key like "dailyChallenge.tip1" through "tip7".
 */
export function getDailyTipKey(todayDate: string): string {
  const seed = dateSeed(todayDate);
  const tipIndex = (seed % 7) + 1;
  return `hub.dailyTip${tipIndex}`;
}
