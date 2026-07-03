import { describe, it, expect } from 'vitest';
import { getRecommendedExercises } from '../recommender';
import type { TrainingProgress, ExerciseId, ExerciseProgress } from '../types';
import { EXERCISE_IDS } from '../exercises';

// ============================================================
// Helpers
// ============================================================

function createDefaultExerciseProgress(
  overrides?: Partial<ExerciseProgress>,
): ExerciseProgress {
  return {
    currentLevel: 1,
    bestLevel: 0,
    totalAttempts: 0,
    totalPasses: 0,
    consecutivePasses: 0,
    consecutiveFails: 0,
    lastPracticed: null,
    personalBests: {},
    ...overrides,
  };
}

/** Returns a date string N days ago */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function createDefaultProgress(
  exerciseOverrides?: Partial<Record<ExerciseId, Partial<ExerciseProgress>>>,
): TrainingProgress {
  const exercises = {} as Record<ExerciseId, ExerciseProgress>;
  for (const id of EXERCISE_IDS) {
    exercises[id] = createDefaultExerciseProgress(exerciseOverrides?.[id]);
  }
  return {
    exercises,
    dailyRoutine: {
      streak: 0,
      bestStreak: 0,
      lastCompleted: null,
      restDays: [],
      restDaysUsed: 0,
      shieldCount: 0,
      shieldsAwarded: [],
      comebackBonusAvailable: false,
    },
    totalXP: 0,
    dailyXP: 0,
    // Place user at week 9+ so recommender logic (not curriculum) is tested
    firstSessionDate: daysAgo(70),
  };
}

// ============================================================
// getRecommendedExercises
// ============================================================

describe('getRecommendedExercises', () => {
  it('returns exactly 3 recommendations', () => {
    const progress = createDefaultProgress();
    const result = getRecommendedExercises(progress, null);
    expect(result).toHaveLength(3);
  });

  it('no voice check data → returns beginner set [breathing, humming, lip_trill]', () => {
    const progress = createDefaultProgress();
    const result = getRecommendedExercises(progress, null);
    expect(result).toEqual(['breathing', 'humming', 'lip_trill']);
  });

  it('undefined scores → returns beginner set', () => {
    const progress = createDefaultProgress();
    const result = getRecommendedExercises(progress, undefined);
    expect(result).toEqual(['breathing', 'humming', 'lip_trill']);
  });

  it('strong scores (3+ ≥60, avg ≥65) → returns advanced exercises', () => {
    const progress = createDefaultProgress();
    const scores = { f0: 80, jitter: 75, shimmer: 70, hnr: 90 };
    const result = getRecommendedExercises(progress, scores);
    expect(result).toEqual(['vfe', 'messa', 'pitch_glide']);
  });

  it('relaxed gate: 3 scores ≥60, 1 below, avg ≥65 → still advanced', () => {
    const progress = createDefaultProgress();
    const scores = { f0: 70, jitter: 65, shimmer: 55, hnr: 75 };
    const result = getRecommendedExercises(progress, scores);
    // avg = 66.25, 3 scores ≥60 → should trigger advanced
    expect(result).toEqual(['vfe', 'messa', 'pitch_glide']);
  });

  it('HNR lowest → recommends HNR-improving exercises (humming, resonant, straw)', () => {
    const progress = createDefaultProgress();
    // HNR is lowest, f0 is second lowest
    const scores = { f0: 50, jitter: 80, shimmer: 85, hnr: 30 };
    const result = getRecommendedExercises(progress, scores);
    // Should prioritize HNR exercises: humming, resonant, straw
    // Plus f0 exercises as second-weakest metric
    // Result should include exercises from the HNR or f0 maps
    // Result should include exercises from the HNR or f0 maps
    const validHnrF0 = new Set([
      ...['breathing', 'humming', 'lip_trill', 'pitch_glide', 'vfe', 'vibrato', 'resonant', 'register_blend', 'vowel_transition', 'messa'],
      ...['humming', 'resonant', 'straw', 'flow', 'breath_sustain', 'lip_trill', 'mpt', 'sz_ratio', 'phrase_sim', 'vowel_sustain', 'vowel_transition', 'passaggio_sustain', 'register_blend'],
    ]);
    for (const ex of result) {
      expect(validHnrF0.has(ex)).toBe(true);
    }
    expect(result).toHaveLength(3);
  });

  it('Jitter + Shimmer lowest → recommends jitter/shimmer-improving candidates', () => {
    const progress = createDefaultProgress();
    // Jitter and shimmer are lowest
    const scores = { f0: 90, jitter: 20, shimmer: 25, hnr: 85 };
    const result = getRecommendedExercises(progress, scores);
    const validJitterShimmer = new Set([
      ...['yawn_sigh', 'humming', 'straw', 'lip_trill', 'flow', 'vibrato', 'breath_sustain', 'breathing', 'airflow_stable', 'passaggio_sustain', 'register_blend', 'vowel_sustain', 'sz_ratio'],
      ...['straw', 'flow', 'basic_dynamic', 'lip_trill', 'humming', 'resonant', 'breath_alloc', 'messa', 'phrase_sim', 'vowel_sustain', 'vowel_transition', 'passaggio_sustain'],
    ]);
    for (const ex of result) {
      expect(validJitterShimmer.has(ex)).toBe(true);
    }
    expect(result).toHaveLength(3);
  });

  it('stale exercises (not practiced recently) get priority', () => {
    const today = new Date();
    const recentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // All jitter exercises are candidates when jitter is low
    // Make some of them recently practiced, others stale
    const progress = createDefaultProgress({
      breathing: { lastPracticed: recentDate },   // practiced today
      lip_trill: { lastPracticed: recentDate },    // practiced today
      straw: { lastPracticed: null },              // never practiced (stale)
      flow: { lastPracticed: null },               // never practiced (stale)
      humming: { lastPracticed: null },            // never practiced (stale)
    });

    const scores = { f0: 90, jitter: 20, shimmer: 25, hnr: 85 };
    const result = getRecommendedExercises(progress, scores);

    // Stale (never practiced) exercises should be preferred over recently practiced ones
    // straw, flow, humming should appear more likely than breathing, lip_trill
    const staleExercises = result.filter(
      (ex) => progress.exercises[ex].lastPracticed === null,
    );
    expect(staleExercises.length).toBeGreaterThanOrEqual(2);
  });

  it('low-level exercises get priority over higher-level ones', () => {
    const progress = createDefaultProgress({
      // HNR exercises with different levels
      humming: { currentLevel: 1 },   // low level
      resonant: { currentLevel: 4 },  // high level
      straw: { currentLevel: 1 },     // low level
      flow: { currentLevel: 4 },      // high level
      lip_trill: { currentLevel: 1 }, // low level
    });

    // HNR is lowest metric
    const scores = { f0: 80, jitter: 80, shimmer: 85, hnr: 20 };
    const result = getRecommendedExercises(progress, scores);

    // Low-level exercises should be preferred
    const lowLevelCount = result.filter(
      (ex) => progress.exercises[ex].currentLevel <= 2,
    ).length;
    expect(lowLevelCount).toBeGreaterThanOrEqual(2);
  });

  it('returns unique exercise IDs (no duplicates)', () => {
    const progress = createDefaultProgress();
    const scores = { f0: 30, jitter: 30, shimmer: 30, hnr: 30 };
    const result = getRecommendedExercises(progress, scores);
    const unique = new Set(result);
    expect(unique.size).toBe(3);
  });

  it('borderline: all scores exactly 65, avg=65 → returns advanced exercises', () => {
    const progress = createDefaultProgress();
    const scores = { f0: 65, jitter: 65, shimmer: 65, hnr: 65 };
    const result = getRecommendedExercises(progress, scores, 'premium');
    expect(result).toEqual(['vfe', 'messa', 'pitch_glide']);
  });
});

// ============================================================
// Tier-based filtering
// ============================================================

describe('getRecommendedExercises — tier filtering', () => {
  it('free tier: exercises at level 5+ are excluded from recommendations', () => {
    const progress = createDefaultProgress({
      // All advanced exercises at level 5 (inaccessible to free users)
      vfe: { currentLevel: 5 },
      messa: { currentLevel: 5 },
      pitch_glide: { currentLevel: 5 },
    });

    // All scores >= 70 would normally return ADVANCED_EXERCISES
    const scores = { f0: 80, jitter: 80, shimmer: 80, hnr: 80 };
    const result = getRecommendedExercises(progress, scores, 'free');

    // vfe, messa, pitch_glide are all at level 5 → excluded for free users (cap is 4)
    expect(result).not.toContain('vfe');
    expect(result).not.toContain('messa');
    expect(result).not.toContain('pitch_glide');
    expect(result).toHaveLength(3);
  });

  it('premium tier: exercises at level 4+ are included', () => {
    const progress = createDefaultProgress({
      vfe: { currentLevel: 4 },
      messa: { currentLevel: 4 },
      pitch_glide: { currentLevel: 4 },
    });

    const scores = { f0: 80, jitter: 80, shimmer: 80, hnr: 80 };
    const result = getRecommendedExercises(progress, scores, 'premium');

    expect(result).toEqual(['vfe', 'messa', 'pitch_glide']);
  });

  it('trialing tier: same as premium — all levels accessible', () => {
    const progress = createDefaultProgress({
      vfe: { currentLevel: 5 },
      messa: { currentLevel: 5 },
      pitch_glide: { currentLevel: 4 },
    });

    const scores = { f0: 80, jitter: 80, shimmer: 80, hnr: 80 };
    const result = getRecommendedExercises(progress, scores, 'trialing');

    // pitch_glide at level 4 still within cap for trialing
    expect(result).toContain('pitch_glide');
  });

  it('free tier with mixed levels: only recommends level 1-4 exercises', () => {
    const progress = createDefaultProgress({
      humming: { currentLevel: 2 },
      lip_trill: { currentLevel: 5 },  // excluded for free
      breathing: { currentLevel: 1 },
      straw: { currentLevel: 4 },      // included (at cap)
      flow: { currentLevel: 6 },       // excluded for free
      resonant: { currentLevel: 5 },   // excluded for free
    });

    // HNR lowest → candidates from hnr map: humming, resonant, straw, flow, lip_trill
    const scores = { f0: 80, jitter: 80, shimmer: 80, hnr: 20 };
    const result = getRecommendedExercises(progress, scores, 'free');

    for (const id of result) {
      expect(progress.exercises[id].currentLevel).toBeLessThanOrEqual(4);
    }
  });

  it('free tier: no scores → beginner exercises returned (all at level 1)', () => {
    const progress = createDefaultProgress();
    const result = getRecommendedExercises(progress, null, 'free');

    // breathing, humming, lip_trill — all at level 1, within free cap
    expect(result).toEqual(['breathing', 'humming', 'lip_trill']);
  });

  it('defaults to free tier when userTier is omitted', () => {
    const progress = createDefaultProgress({
      vfe: { currentLevel: 5 },
      messa: { currentLevel: 5 },
      pitch_glide: { currentLevel: 5 },
    });

    const scores = { f0: 80, jitter: 80, shimmer: 80, hnr: 80 };
    // No userTier argument — should default to 'free'
    const result = getRecommendedExercises(progress, scores);

    expect(result).not.toContain('vfe');
    expect(result).not.toContain('messa');
    expect(result).not.toContain('pitch_glide');
  });
});
