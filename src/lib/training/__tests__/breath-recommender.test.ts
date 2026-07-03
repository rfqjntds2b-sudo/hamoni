import { describe, it, expect } from 'vitest';
import { getBreathRoutineExercises } from '../breath-recommender';
import type { TrainingProgress, ExerciseProgress } from '../types';

const BREATH_IDS = ['breath_alloc', 'sz_ratio', 'airflow_stable', 'phrase_sim', 'mpt'] as const;
const SLOT1 = ['breath_alloc', 'sz_ratio'];
const SLOT3 = ['mpt', 'phrase_sim'];

function mockExerciseProgress(overrides?: Partial<ExerciseProgress>): ExerciseProgress {
  return {
    currentLevel: 1,
    bestLevel: 0,
    totalAttempts: 0,
    totalPasses: 0,
    consecutivePasses: 0,
    consecutiveFails: 0,
    lastPracticed: null,
    personalBests: {},
    levelHistory: [],
    ...overrides,
  };
}

function mockProgress(breathOverrides?: Partial<Record<string, Partial<ExerciseProgress>>>): TrainingProgress {
  const exercises: Record<string, ExerciseProgress> = {};
  const allIds = [
    'breathing', 'humming', 'lip_trill', 'breath_sustain',
    'straw', 'yawn_sigh', 'flow', 'resonant', 'vibrato', 'basic_dynamic',
    'vfe', 'pitch_glide', 'messa',
    ...BREATH_IDS,
  ];
  for (const id of allIds) {
    exercises[id] = mockExerciseProgress(breathOverrides?.[id]);
  }
  return {
    exercises,
    dailyRoutine: { streak: 0, bestStreak: 0, lastCompleted: null, restDays: [], restDaysUsed: 0, shieldCount: 0, shieldsAwarded: [], comebackBonusAvailable: false },
    breathRoutine: { lastCompleted: null },
    totalXP: 0,
    dailyXP: 0,
    _version: 0,
  } as TrainingProgress;
}

describe('getBreathRoutineExercises', () => {
  it('returns exactly 3 exercises', () => {
    const result = getBreathRoutineExercises(mockProgress());
    expect(result).toHaveLength(3);
  });

  it('returns no duplicates', () => {
    const result = getBreathRoutineExercises(mockProgress());
    expect(new Set(result).size).toBe(3);
  });

  it('only returns breath exercise IDs', () => {
    const result = getBreathRoutineExercises(mockProgress());
    for (const id of result) {
      expect(BREATH_IDS).toContain(id);
    }
  });

  it('slot 1 is breath_alloc or sz_ratio (warm-up)', () => {
    const result = getBreathRoutineExercises(mockProgress());
    expect(SLOT1).toContain(result[0]);
  });

  it('slot 3 is mpt or phrase_sim (maximal effort)', () => {
    const result = getBreathRoutineExercises(mockProgress());
    expect(SLOT3).toContain(result[2]);
  });

  it('prefers less recently practiced exercises (staleness)', () => {
    const progress = mockProgress({
      breath_alloc: { lastPracticed: '2026-03-25' },
      sz_ratio: { lastPracticed: null },
    });
    const result = getBreathRoutineExercises(progress);
    expect(result[0]).toBe('sz_ratio');
  });

  it('prefers lower-level exercises as tie-breaker', () => {
    const progress = mockProgress({
      mpt: { currentLevel: 1 },
      phrase_sim: { currentLevel: 3 },
    });
    const result = getBreathRoutineExercises(progress);
    expect(result[2]).toBe('mpt');
  });

  it('no exercise appears in multiple slots', () => {
    const progress = mockProgress({
      breath_alloc: { lastPracticed: '2026-03-25' },
      sz_ratio: { lastPracticed: null },
    });
    const result = getBreathRoutineExercises(progress);
    expect(new Set(result).size).toBe(3);
  });
});
