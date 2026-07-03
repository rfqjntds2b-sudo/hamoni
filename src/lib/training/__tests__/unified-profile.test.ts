import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TrainingProgress, ExerciseId } from '../types';
import { EXERCISE_IDS } from '../exercises';

// ============================================================
// localStorage mock
// ============================================================

const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Dynamic import so mocks are in place before module loads
async function loadModule() {
  vi.resetModules();
  return import('../unified-profile');
}

// ============================================================
// Helpers
// ============================================================

function makeProgress(overrides: Partial<Record<ExerciseId, Partial<TrainingProgress['exercises'][ExerciseId]>>> = {}): TrainingProgress {
  const exercises = {} as TrainingProgress['exercises'];
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
      ...overrides[id],
    };
  }
  return {
    exercises,
    dailyRoutine: { streak: 0, bestStreak: 0, lastCompleted: null, restDays: [], restDaysUsed: 0, shieldCount: 0, shieldsAwarded: [], comebackBonusAvailable: false },
    totalXP: 0,
    dailyXP: 0,
  };
}

// ============================================================
// computeSkillProfile
// ============================================================

describe('computeSkillProfile', () => {
  it('returns all 5 axes as numbers 0-100', async () => {
    const { computeSkillProfile } = await loadModule();
    const profile = computeSkillProfile(makeProgress());
    expect(profile.stability).toBeGreaterThanOrEqual(0);
    expect(profile.stability).toBeLessThanOrEqual(100);
    expect(profile.toneQuality).toBeGreaterThanOrEqual(0);
    expect(profile.flexibility).toBeGreaterThanOrEqual(0);
    expect(profile.breathing).toBeGreaterThanOrEqual(0);
    expect(profile.endurance).toBeGreaterThanOrEqual(0);
    expect(profile.overall).toBeGreaterThanOrEqual(0);
  });

  it('overall is mean of 5 axes', async () => {
    const { computeSkillProfile } = await loadModule();
    const profile = computeSkillProfile(makeProgress());
    const expected = Math.round(
      (profile.stability + profile.toneQuality + profile.flexibility + profile.breathing + profile.endurance) / 5,
    );
    expect(profile.overall).toBe(expected);
  });

  it('weakestAxis is the axis with the lowest score', async () => {
    const { computeSkillProfile } = await loadModule();
    const profile = computeSkillProfile(makeProgress());
    const axes = {
      stability: profile.stability,
      toneQuality: profile.toneQuality,
      flexibility: profile.flexibility,
      breathing: profile.breathing,
      endurance: profile.endurance,
    };
    const minValue = Math.min(...Object.values(axes));
    expect(axes[profile.weakestAxis]).toBe(minValue);
  });

  it('higher exercise levels produce higher axis scores', async () => {
    const { computeSkillProfile } = await loadModule();

    const lowProfile = computeSkillProfile(makeProgress({
      humming: { currentLevel: 1, totalAttempts: 5 } as any,
    }));
    const highProfile = computeSkillProfile(makeProgress({
      humming: { currentLevel: 8, totalAttempts: 50 } as any,
    }));

    expect(highProfile.stability).toBeGreaterThanOrEqual(lowProfile.stability);
  });

  it('streak affects endurance', async () => {
    const { computeSkillProfile } = await loadModule();

    const noStreak = makeProgress();
    noStreak.dailyRoutine.streak = 0;

    const longStreak = makeProgress();
    longStreak.dailyRoutine.streak = 20;

    const p1 = computeSkillProfile(noStreak);
    const p2 = computeSkillProfile(longStreak);

    expect(p2.endurance).toBeGreaterThan(p1.endurance);
  });
});

// ============================================================
// getWeakestAxisExercises
// ============================================================

describe('getWeakestAxisExercises', () => {
  it('returns exercises for the weakest axis', async () => {
    const { computeSkillProfile, getWeakestAxisExercises } = await loadModule();
    const profile = computeSkillProfile(makeProgress());
    const exercises = getWeakestAxisExercises(profile);
    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises.every((id: string) => EXERCISE_IDS.includes(id as ExerciseId))).toBe(true);
  });

  it('returns stability exercises when stability is weakest', async () => {
    const { getWeakestAxisExercises } = await loadModule();
    const exercises = getWeakestAxisExercises({
      stability: 10, toneQuality: 80, flexibility: 80, breathing: 80, endurance: 80,
      overall: 66, weakestAxis: 'stability' as any,
    });
    expect(exercises).toContain('humming');
    expect(exercises).toContain('straw');
  });

  it('returns breathing exercises when breathing is weakest', async () => {
    const { getWeakestAxisExercises } = await loadModule();
    const exercises = getWeakestAxisExercises({
      stability: 80, toneQuality: 80, flexibility: 80, breathing: 10, endurance: 80,
      overall: 66, weakestAxis: 'breathing' as any,
    });
    expect(exercises).toContain('breathing');
    expect(exercises).toContain('mpt');
  });
});
