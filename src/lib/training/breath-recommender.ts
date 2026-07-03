// ============================================================
// Breath Exercise Recommendation Engine
// ============================================================
// Selects 3 of 5 breath exercises per daily routine using
// slot-based selection with pedagogical ordering:
//   Slot 1 (warm-up):  breath_alloc | sz_ratio
//   Slot 2 (mid):      sz_ratio | airflow_stable
//   Slot 3 (maximal):  mpt | phrase_sim
//
// Scoring considers staleness, growth room, and adaptive
// difficulty (struggling exercises get priority).

import type { ExerciseId, TrainingProgress } from './types';
import { getSessionDuration } from './exercises';
import { checkAdaptiveDifficulty } from './level-manager';
import { computeSkillProfile } from './unified-profile';
import { todayString, dateToUTCMs } from './date-utils';

const SLOT_1: ExerciseId[] = ['breath_alloc', 'sz_ratio'];
const SLOT_2: ExerciseId[] = ['sz_ratio', 'airflow_stable'];
const SLOT_3: ExerciseId[] = ['mpt', 'phrase_sim'];

const MAX_STALE_DAYS = 90;
const MAX_LEVEL = 10;

export function getBreathRoutineExercises(progress: TrainingProgress): ExerciseId[] {
  // If breathing is the weakest axis, prioritize MPT/airflow (maximal slot first)
  let slots = [SLOT_1, SLOT_2, SLOT_3];
  try {
    const profile = computeSkillProfile(progress);
    if (profile.weakestAxis === 'breathing') {
      slots = [SLOT_3, SLOT_2, SLOT_1]; // maximal first for breathing-weak users
    }
  } catch { /* profile unavailable — use default order */ }

  const picked: ExerciseId[] = [];
  for (const slot of slots) {
    picked.push(pickFromSlot(slot, progress, picked));
  }
  return picked;
}

/**
 * Estimate total routine time in minutes based on actual session durations.
 */
export function getBreathRoutineMinutes(progress: TrainingProgress): number {
  const exercises = getBreathRoutineExercises(progress);
  let totalSeconds = 0;
  for (const id of exercises) {
    const level = progress.exercises[id]?.currentLevel ?? 1;
    totalSeconds += getSessionDuration(id, level);
  }
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

function pickFromSlot(
  candidates: ExerciseId[],
  progress: TrainingProgress,
  exclude: ExerciseId[],
): ExerciseId {
  const available = candidates.filter((id) => !exclude.includes(id));
  if (available.length === 0) {
    const ALL_BREATH: ExerciseId[] = ['breath_alloc', 'sz_ratio', 'airflow_stable', 'phrase_sim', 'mpt'];
    const fallback = ALL_BREATH.filter((id) => !exclude.includes(id));
    return fallback.length > 0 ? scoreBest(fallback, progress) : candidates[0];
  }
  return scoreBest(available, progress);
}

function scoreBest(candidates: ExerciseId[], progress: TrainingProgress): ExerciseId {
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const id of candidates) {
    const ep = progress.exercises[id];
    const stale = staleDays(ep?.lastPracticed ?? null);
    const growthRoom = Math.max(0, (MAX_LEVEL - (ep?.currentLevel ?? 1)) / (MAX_LEVEL - 1));

    // Struggling exercises get a boost (adaptive difficulty)
    const adaptive = checkAdaptiveDifficulty(ep?.recentResults);
    const needsPractice = adaptive === -1 ? 1 : adaptive === 0 ? 0.3 : 0;

    const score =
      (stale / MAX_STALE_DAYS) * 0.15 +
      growthRoom * 0.15 +
      needsPractice * 0.70;

    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

function staleDays(lastPracticed: string | null): number {
  // Never practiced → treat as maximally stale (strictly beyond any
  // practiced exercise, which is clamped to MAX_STALE_DAYS) so brand-new
  // exercises are always prioritized regardless of how long ago others ran.
  if (!lastPracticed) return MAX_STALE_DAYS + 1;
  const todayMs = dateToUTCMs(todayString());
  const lastMs = dateToUTCMs(lastPracticed);
  const days = Math.floor((todayMs - lastMs) / 86_400_000);
  return Math.min(Math.max(0, days), MAX_STALE_DAYS);
}
