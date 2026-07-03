import { describe, it, expect } from 'vitest';
import {
  getCurriculumWeek,
  isInCurriculum,
  getCurrentPhase,
  getUnlockedExercises,
  getCurriculumRoutine,
  getEstimatedMinutes,
  isExerciseLocked,
  CURRICULUM_EXERCISES,
} from '../curriculum';
import type { TrainingProgress, ExerciseId } from '../types';
import { EXERCISE_IDS } from '../exercises';

// ============================================================
// Helpers
// ============================================================

function makeProgress(overrides: Partial<TrainingProgress> = {}): TrainingProgress {
  const exercises = {} as Record<ExerciseId, TrainingProgress['exercises'][ExerciseId]>;
  for (const id of EXERCISE_IDS) {
    exercises[id] = {
      currentLevel: 1,
      bestLevel: 1,
      totalAttempts: 0,
      totalPasses: 0,
      consecutivePasses: 0,
      consecutiveFails: 0,
      lastPracticed: null,
      personalBests: {},
    };
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
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================================
// Tests
// ============================================================

describe('getCurriculumWeek', () => {
  it('returns 0 when no firstSessionDate', () => {
    const progress = makeProgress();
    expect(getCurriculumWeek(progress)).toBe(0);
  });

  it('returns 1 for today', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(0) });
    expect(getCurriculumWeek(progress)).toBe(1);
  });

  it('returns 1 for 6 days ago', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(6) });
    expect(getCurriculumWeek(progress)).toBe(1);
  });

  it('returns 2 for 7 days ago', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(7) });
    expect(getCurriculumWeek(progress)).toBe(2);
  });

  it('returns 4 for 25 days ago', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(25) });
    expect(getCurriculumWeek(progress)).toBe(4);
  });

  it('returns 9 for 56 days ago', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(56) });
    expect(getCurriculumWeek(progress)).toBe(9);
  });
});

describe('isInCurriculum', () => {
  it('returns true for no firstSessionDate (week 0 = new user in curriculum)', () => {
    expect(isInCurriculum(makeProgress())).toBe(true);
  });

  it('returns true for week 1', () => {
    expect(isInCurriculum(makeProgress({ firstSessionDate: daysAgo(0) }))).toBe(true);
  });

  it('returns true for week 8', () => {
    expect(isInCurriculum(makeProgress({ firstSessionDate: daysAgo(49 + 6) }))).toBe(true);
  });

  it('returns false for week 9', () => {
    expect(isInCurriculum(makeProgress({ firstSessionDate: daysAgo(56) }))).toBe(false);
  });
});

describe('getCurrentPhase', () => {
  it('returns phase 1 for no firstSessionDate (new user)', () => {
    const phase = getCurrentPhase(makeProgress());
    expect(phase?.label).toBe('phaseFoundation');
  });

  it('returns phase 1 for week 1', () => {
    const phase = getCurrentPhase(makeProgress({ firstSessionDate: daysAgo(0) }));
    expect(phase?.label).toBe('phaseFoundation');
    expect(phase?.estimatedMinutes).toBe(3);
  });

  it('returns phase 2 for week 3 when mastery gate passed', () => {
    const p = makeProgress({ firstSessionDate: daysAgo(14) });
    p.exercises.humming.currentLevel = 2; // pass mastery gate
    const phase = getCurrentPhase(p);
    expect(phase?.label).toBe('phaseBuildUp');
  });

  it('stays at phase 1 in week 3 when mastery gate NOT passed', () => {
    const p = makeProgress({ firstSessionDate: daysAgo(14) });
    // humming and lip_trill both at level 1 — gate requires 2
    const phase = getCurrentPhase(p);
    expect(phase?.label).toBe('phaseFoundation');
  });

  it('returns phase 4 for week 7 when all gates passed', () => {
    const p = makeProgress({ firstSessionDate: daysAgo(42) });
    p.exercises.humming.currentLevel = 2;  // gate 1
    p.exercises.straw.currentLevel = 2;     // gate 2
    p.exercises.flow.currentLevel = 2;      // gate 3
    const phase = getCurrentPhase(p);
    expect(phase?.label).toBe('phaseExpression');
  });

  it('stays at phase 2 in week 7 when phase 2 gate not passed', () => {
    const p = makeProgress({ firstSessionDate: daysAgo(42) });
    p.exercises.humming.currentLevel = 2;  // gate 1 passed
    // straw and lip_trill both at 1 — gate 2 NOT passed
    const phase = getCurrentPhase(p);
    expect(phase?.label).toBe('phaseBuildUp');
  });
});

describe('getUnlockedExercises', () => {
  it('returns phase 1 exercises for new user (week 0)', () => {
    const unlocked = getUnlockedExercises(makeProgress());
    expect(unlocked).toEqual(['breathing', 'humming', 'lip_trill']);
  });

  it('returns phase 2 exercises for week 3 when mastery gate passed', () => {
    const p = makeProgress({ firstSessionDate: daysAgo(14) });
    p.exercises.humming.currentLevel = 2; // pass phase 1 mastery gate
    const unlocked = getUnlockedExercises(p);
    expect(unlocked).toContain('straw');
    expect(unlocked).toContain('yawn_sigh');
    expect(unlocked).not.toContain('flow');
  });

  it('returns all curriculum exercises for week 9+', () => {
    const unlocked = getUnlockedExercises(makeProgress({ firstSessionDate: daysAgo(56) }));
    expect(unlocked).toEqual(CURRICULUM_EXERCISES);
  });
});

describe('getCurriculumRoutine', () => {
  it('returns null for week 9+', () => {
    expect(getCurriculumRoutine(makeProgress({ firstSessionDate: daysAgo(56) }))).toBeNull();
  });

  it('returns breathing + humming for week 1', () => {
    const routine = getCurriculumRoutine(makeProgress({ firstSessionDate: daysAgo(0) }));
    expect(routine).toEqual(['breathing', 'humming']);
  });

  it('returns lip_trill + straw for week 3 when mastery gate passed', () => {
    const p = makeProgress({ firstSessionDate: daysAgo(14) });
    p.exercises.humming.currentLevel = 2; // pass phase 1 gate
    const routine = getCurriculumRoutine(p);
    expect(routine).toEqual(['lip_trill', 'straw']);
  });
});

describe('isExerciseLocked', () => {
  it('breathing is unlocked in week 1', () => {
    expect(isExerciseLocked('breathing', makeProgress({ firstSessionDate: daysAgo(0) }))).toBe(false);
  });

  it('flow is locked in week 1', () => {
    expect(isExerciseLocked('flow', makeProgress({ firstSessionDate: daysAgo(0) }))).toBe(true);
  });

  it('flow is unlocked in week 5 when mastery gates passed', () => {
    const p = makeProgress({ firstSessionDate: daysAgo(28) });
    p.exercises.humming.currentLevel = 2;  // phase 1 gate
    p.exercises.straw.currentLevel = 2;    // phase 2 gate
    expect(isExerciseLocked('flow', p)).toBe(false);
  });
});

describe('skill-based early unlock', () => {
  it('unlocks straw when humming reaches L3 in week 1', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(0) });
    progress.exercises.humming.currentLevel = 3;
    const unlocked = getUnlockedExercises(progress);
    expect(unlocked).toContain('straw');
    expect(unlocked).toContain('yawn_sigh');
  });

  it('unlocks flow when straw reaches L3 in week 1', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(0) });
    progress.exercises.straw.currentLevel = 3;
    const unlocked = getUnlockedExercises(progress);
    expect(unlocked).toContain('flow');
  });

  it('unlocks vibrato+pitch_glide when flow reaches L3', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(0) });
    progress.exercises.flow.currentLevel = 3;
    const unlocked = getUnlockedExercises(progress);
    expect(unlocked).toContain('vibrato');
    expect(unlocked).toContain('pitch_glide');
  });

  it('does not unlock straw when humming is only L2', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(0) });
    progress.exercises.humming.currentLevel = 2;
    const unlocked = getUnlockedExercises(progress);
    expect(unlocked).not.toContain('straw');
  });

  it('daily routine is unchanged even with skill unlocks', () => {
    const progress = makeProgress({ firstSessionDate: daysAgo(0) });
    progress.exercises.humming.currentLevel = 5;
    const routine = getCurriculumRoutine(progress);
    expect(routine).toEqual(['breathing', 'humming']);
  });
});

describe('week 0 new user', () => {
  it('gets curriculum routine even without firstSessionDate', () => {
    const routine = getCurriculumRoutine(makeProgress());
    expect(routine).toEqual(['breathing', 'humming']);
  });

  it('gets phase 1 unlocked exercises', () => {
    const unlocked = getUnlockedExercises(makeProgress());
    expect(unlocked).toEqual(expect.arrayContaining(['breathing', 'humming', 'lip_trill']));
  });
});

describe('CURRICULUM_EXERCISES constant', () => {
  it('contains exactly 8 exercises', () => {
    expect(CURRICULUM_EXERCISES).toHaveLength(8);
  });

  it('all exercise IDs are valid', () => {
    for (const id of CURRICULUM_EXERCISES) {
      expect(EXERCISE_IDS).toContain(id);
    }
  });
});
