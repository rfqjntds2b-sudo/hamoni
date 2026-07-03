// ============================================================
// Training Feature — Exercise Recommendation Engine
// ============================================================
// Recommends 3 exercises based on voice check scores, practice
// staleness, exercise levels, and difficulty fit.

import type { ExerciseId, TrainingProgress } from './types';

type UserTier = 'free' | 'trialing' | 'premium';

import { getCurriculumRoutine, isInCurriculum } from './curriculum';
import { getExerciseMeta, EXERCISE_IDS } from './exercises';
import { checkAdaptiveDifficulty } from './level-manager';
import { computeSkillProfile, getWeakestAxisExercises } from './unified-profile';
import { todayString, dateToUTCMs } from './date-utils';

// ============================================================
// Constants
// ============================================================

/** Metric → exercises that improve that metric (ordered by effectiveness) */
const METRIC_EXERCISE_MAP: Record<'f0' | 'jitter' | 'shimmer' | 'hnr', ExerciseId[]> = {
  f0: ['breathing', 'humming', 'lip_trill', 'pitch_glide', 'vfe', 'vibrato', 'resonant', 'register_blend', 'vowel_transition', 'messa'],
  jitter: ['yawn_sigh', 'humming', 'straw', 'lip_trill', 'flow', 'vibrato', 'breath_sustain', 'breathing', 'airflow_stable', 'passaggio_sustain', 'register_blend', 'vowel_sustain', 'sz_ratio'],
  shimmer: ['straw', 'flow', 'basic_dynamic', 'lip_trill', 'humming', 'resonant', 'breath_alloc', 'messa', 'phrase_sim', 'vowel_sustain', 'vowel_transition', 'passaggio_sustain'],
  hnr: ['humming', 'resonant', 'straw', 'flow', 'breath_sustain', 'lip_trill', 'mpt', 'sz_ratio', 'phrase_sim', 'vowel_sustain', 'vowel_transition', 'passaggio_sustain', 'register_blend'],
};

const ADVANCED_EXERCISES: ExerciseId[] = ['vfe', 'messa', 'pitch_glide'];
const BEGINNER_EXERCISES: ExerciseId[] = ['breathing', 'humming', 'lip_trill'];

const RECOMMENDATION_COUNT = 3;

/** Free users can only access levels 1–4; premium/trialing get 1–10 */
const FREE_MAX_LEVEL = 4;

/** Max staleness days (matches ACTIVITY_PRUNE_DAYS in progress.ts) */
const MAX_STALE_DAYS = 90;

/** Consecutive-day penalty window — avoid recommending the same exercise 3 days in a row */
const REPEAT_PENALTY_DAYS = 3;
const REPEAT_PENALTY_FACTOR = 0.3;

/**
 * Check if an exercise was practiced on each of the last N days.
 * Returns true if the exercise has been practiced every day for the
 * past `days` consecutive days (indicating repetition fatigue risk).
 */
function isPracticedConsecutively(lastPracticed: string | null, days: number): boolean {
  if (!lastPracticed) return false;
  const stale = staleDays(lastPracticed);
  // If practiced today or yesterday, it's within the window.
  // We use staleDays <= 0 (today) as "practiced today".
  // For a 3-day check we just need lastPracticed to be within the window.
  return stale < days;
}

function staleDays(lastPracticed: string | null): number {
  if (!lastPracticed) return MAX_STALE_DAYS;
  const todayMs = dateToUTCMs(todayString());
  const lastMs = dateToUTCMs(lastPracticed);
  const days = Math.floor((todayMs - lastMs) / 86_400_000);
  return Math.min(Math.max(0, days), MAX_STALE_DAYS);
}

/** Map a voice check score (0-100) to a target exercise difficulty */
function targetDifficulty(score: number): number {
  if (score < 30) return 1.5;
  if (score < 50) return 2.5;
  if (score < 70) return 3.5;
  return 4.5;
}

// ============================================================
// Progress-based fallback (for users without voice check scores)
// ============================================================

/**
 * When no voice check scores exist, recommend exercises based on
 * what the user has actually practiced — sorted by higher difficulty
 * first, then lower level (more room to grow).
 */
function getProgressBasedRecommendations(
  progress: TrainingProgress,
  maxLevel: number,
): ExerciseId[] {
  const practiced = EXERCISE_IDS
    .filter((id) => {
      const ep = progress.exercises[id];
      return ep.totalAttempts > 0 && ep.currentLevel <= maxLevel;
    })
    .map((id) => ({
      id,
      difficulty: getExerciseMeta(id).difficulty,
      level: progress.exercises[id].currentLevel,
      stale: staleDays(progress.exercises[id].lastPracticed),
    }));

  if (practiced.length === 0) return [];

  // Sort: higher difficulty first, then lower level, then more stale
  practiced.sort((a, b) => {
    if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
    if (a.level !== b.level) return a.level - b.level;
    return b.stale - a.stale;
  });

  return practiced.slice(0, RECOMMENDATION_COUNT).map((p) => p.id);
}

// ============================================================
// getRecommendedExercises
// ============================================================

export function getRecommendedExercises(
  progress: TrainingProgress,
  latestScores?: { f0: number; jitter: number; shimmer: number; hnr: number } | null,
  userTier: UserTier = 'free',
): ExerciseId[] {
  // Curriculum-based recommendations for weeks 0-8
  if (isInCurriculum(progress)) {
    const routine = getCurriculumRoutine(progress);
    if (routine && routine.length > 0) return routine;
  }

  const tierMaxLevel = userTier === 'free' ? FREE_MAX_LEVEL : 10;

  function withinTierCap(ids: ExerciseId[]): ExerciseId[] {
    return ids.filter((id) => progress.exercises[id].currentLevel <= tierMaxLevel);
  }

  // No scores → progress-based fallback, then beginner fallback
  if (!latestScores) {
    const progressBased = getProgressBasedRecommendations(progress, tierMaxLevel);
    if (progressBased.length > 0) return progressBased;

    return withinTierCap(BEGINNER_EXERCISES).length > 0
      ? withinTierCap(BEGINNER_EXERCISES).slice(0, RECOMMENDATION_COUNT)
      : [...BEGINNER_EXERCISES].slice(0, RECOMMENDATION_COUNT);
  }

  // Strong scores → advanced set (3+ metrics ≥ 60 AND average ≥ 65)
  const { f0, jitter, shimmer, hnr } = latestScores;
  const allScores = [f0, jitter, shimmer, hnr];
  const above60Count = allScores.filter((s) => s >= 60).length;
  const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  if (above60Count >= 3 && avgScore >= 65) {
    const filtered = withinTierCap(ADVANCED_EXERCISES);
    if (filtered.length >= RECOMMENDATION_COUNT) return filtered.slice(0, RECOMMENDATION_COUNT);
  }

  // Find 2 lowest scoring metrics
  const scoreMap: Record<string, number> = { f0, jitter, shimmer, hnr };
  const metricScores = Object.entries(scoreMap)
    .map(([metric, score]) => ({ metric, score }))
    .sort((a, b) => a.score - b.score);
  const weakestMetrics = metricScores.slice(0, 2).map((m) => m.metric);

  // Collect candidate exercises from weakest metrics
  const candidateSet = new Set<ExerciseId>();
  for (const metric of weakestMetrics) {
    const exercises = METRIC_EXERCISE_MAP[metric as keyof typeof METRIC_EXERCISE_MAP];
    if (exercises) {
      for (const ex of exercises) candidateSet.add(ex);
    }
  }
  const candidates = withinTierCap(Array.from(candidateSet));

  // Target difficulty from weakest scores
  const avgWeakScore = weakestMetrics.reduce((sum, m) => sum + scoreMap[m], 0) / weakestMetrics.length;
  const target = targetDifficulty(avgWeakScore);

  // Compute unified skill profile for cross-module axis boost
  let weakAxisExercises: Set<ExerciseId>;
  try {
    const profile = computeSkillProfile(progress);
    weakAxisExercises = new Set(getWeakestAxisExercises(profile));
  } catch {
    weakAxisExercises = new Set<ExerciseId>();
  }

  // Score each candidate and pick top 3
  const result: ExerciseId[] = [];

  for (let i = 0; i < RECOMMENDATION_COUNT; i++) {
    let bestExercise: ExerciseId | null = null;
    let bestScore = -Infinity;

    for (const exerciseId of candidates) {
      if (result.includes(exerciseId)) continue;

      const ep = progress.exercises[exerciseId];
      const meta = getExerciseMeta(exerciseId);

      // Staleness (0-1): more stale = higher
      const stalenessScore = staleDays(ep.lastPracticed) / MAX_STALE_DAYS;

      // Growth room (0-1): lower level relative to MAX = more room to grow
      const growthRoomScore = Math.max(0, (tierMaxLevel - ep.currentLevel) / (tierMaxLevel - 1));

      // Relevance (0-1): position in METRIC_EXERCISE_MAP
      let metricRelevance = 0;
      for (const metric of weakestMetrics) {
        const metricExercises = METRIC_EXERCISE_MAP[metric as keyof typeof METRIC_EXERCISE_MAP];
        if (metricExercises) {
          const idx = metricExercises.indexOf(exerciseId);
          if (idx >= 0) {
            metricRelevance += (metricExercises.length - idx) / metricExercises.length;
          }
        }
      }
      const relevanceScore = metricRelevance / weakestMetrics.length;

      // Difficulty fit (0-1): closer to target difficulty = higher
      const difficultyFitScore = 1 - Math.abs(meta.difficulty - target) / 4;

      // Needs practice (0-1): adaptive difficulty signals struggling → boost
      const adaptive = checkAdaptiveDifficulty(ep.recentResults);
      const needsPracticeScore = adaptive === -1 ? 1 : adaptive === 0 ? 0.3 : 0;

      // Weakest axis boost (0-1): exercises that target the user's weakest skill axis
      const weakAxisBoost = weakAxisExercises.has(exerciseId) ? 1 : 0;

      // Repeat penalty: if practiced every day for the last 3 days, dampen score
      const repeatPenalty = isPracticedConsecutively(ep.lastPracticed, REPEAT_PENALTY_DAYS)
        ? REPEAT_PENALTY_FACTOR
        : 1;

      const totalScore = (
        stalenessScore * 0.05 +
        growthRoomScore * 0.05 +
        relevanceScore * 0.30 +
        difficultyFitScore * 0.10 +
        needsPracticeScore * 0.30 +
        weakAxisBoost * 0.20
      ) * repeatPenalty;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestExercise = exerciseId;
      }
    }

    if (bestExercise) {
      result.push(bestExercise);
    }
  }

  // Sort by difficulty ascending (light → heavy vocal training principle)
  result.sort((a, b) => getExerciseMeta(a).difficulty - getExerciseMeta(b).difficulty);

  return result;
}
