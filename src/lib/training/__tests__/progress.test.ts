import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionResult } from '../types';

// ============================================================
// localStorage mock
// ============================================================

const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Dynamic import so mocks are in place before module loads
async function loadModule() {
  // Clear module cache so each test gets a fresh module
  vi.resetModules();
  return import('../progress');
}

// ============================================================
// Helper: today / yesterday date strings
// ============================================================

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function today(): string {
  return toDateString(new Date());
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

// ============================================================
// Helper: minimal SessionResult
// ============================================================

function makeResult(passed: boolean, xp = 20): SessionResult {
  return {
    passed,
    results: [],
    xpEarned: xp,
    duration: 30,
  };
}

// ============================================================
// getTrainingProgress
// ============================================================

describe('getTrainingProgress', () => {
  it('first call returns 22 exercises, all currentLevel=1, bestLevel=0, totalXP=0', async () => {
    const { getTrainingProgress } = await loadModule();
    const progress = getTrainingProgress();

    const ids = Object.keys(progress.exercises);
    expect(ids).toHaveLength(22);

    for (const id of ids) {
      const ex = progress.exercises[id as keyof typeof progress.exercises];
      expect(ex.currentLevel).toBe(1);
      expect(ex.bestLevel).toBe(0);
      expect(ex.totalAttempts).toBe(0);
      expect(ex.totalPasses).toBe(0);
      expect(ex.consecutivePasses).toBe(0);
      expect(ex.lastPracticed).toBeNull();
    }

    expect(progress.totalXP).toBe(0);
    expect(progress.dailyXP).toBe(0);
    expect(progress.dailyRoutine.streak).toBe(0);
  });

  it('second call returns same data (reads from localStorage)', async () => {
    const { getTrainingProgress } = await loadModule();
    const first = getTrainingProgress();
    const second = getTrainingProgress();

    expect(second).toEqual(first);
    // localStorage.getItem should have been called on second invocation
    expect(localStorage.getItem).toHaveBeenCalled();
  });
});

// ============================================================
// updateAfterSession — pass / fail
// ============================================================

describe('updateAfterSession', () => {
  it('passed=true: consecutivePasses++, totalPasses++, totalAttempts++', async () => {
    const { updateAfterSession } = await loadModule();
    const result = makeResult(true);

    const updated = updateAfterSession('humming', result);
    const ex = updated.exercises.humming;

    expect(ex.totalAttempts).toBe(1);
    expect(ex.totalPasses).toBe(1);
    expect(ex.consecutivePasses).toBe(1);
  });

  it('passed=false: consecutivePasses=0, totalAttempts++', async () => {
    const { updateAfterSession } = await loadModule();
    const result = makeResult(false);

    const updated = updateAfterSession('humming', result);
    const ex = updated.exercises.humming;

    expect(ex.totalAttempts).toBe(1);
    expect(ex.totalPasses).toBe(0);
    expect(ex.consecutivePasses).toBe(0);
  });

  it('3 consecutive passes → currentLevel goes 1→2 (auto level-up)', async () => {
    const { updateAfterSession } = await loadModule();

    updateAfterSession('humming', makeResult(true));
    updateAfterSession('humming', makeResult(true));
    const final = updateAfterSession('humming', makeResult(true));

    const ex = final.exercises.humming;
    expect(ex.currentLevel).toBe(2);
    expect(ex.bestLevel).toBe(2);
    // consecutivePasses should reset to 0 after level-up
    expect(ex.consecutivePasses).toBe(0);
  });
});

// ============================================================
// Streak logic
// ============================================================

describe('streak logic', () => {
  it('first practice today → streak=1', async () => {
    const { updateAfterSession } = await loadModule();
    const updated = updateAfterSession('humming', makeResult(true));

    expect(updated.dailyRoutine.streak).toBe(1);
    expect(updated.dailyRoutine.lastCompleted).toBe(today());
  });

  it('practiced yesterday and today → streak incremented', async () => {
    const { getTrainingProgress, saveTrainingProgress, updateAfterSession } =
      await loadModule();

    // Seed: practiced yesterday with streak=3
    const progress = getTrainingProgress();
    progress.dailyRoutine.streak = 3;
    progress.dailyRoutine.bestStreak = 3;
    progress.dailyRoutine.lastCompleted = yesterday();
    saveTrainingProgress(progress);

    const updated = updateAfterSession('humming', makeResult(true));
    expect(updated.dailyRoutine.streak).toBe(4);
  });

  it('gap of 2+ days → streak resets to 1', async () => {
    const { getTrainingProgress, saveTrainingProgress, updateAfterSession } =
      await loadModule();

    // Seed: last practiced 3 days ago with streak=5
    const progress = getTrainingProgress();
    progress.dailyRoutine.streak = 5;
    progress.dailyRoutine.bestStreak = 5;
    progress.dailyRoutine.lastCompleted = daysAgo(3);
    saveTrainingProgress(progress);

    const updated = updateAfterSession('humming', makeResult(true));
    expect(updated.dailyRoutine.streak).toBe(1);
  });

  it('multiple sessions same day → streak unchanged', async () => {
    const { updateAfterSession } = await loadModule();

    const first = updateAfterSession('humming', makeResult(true));
    expect(first.dailyRoutine.streak).toBe(1);

    const second = updateAfterSession('lip_trill', makeResult(true));
    expect(second.dailyRoutine.streak).toBe(1);
  });
});

// ============================================================
// updateDailyActivity
// ============================================================

describe('updateDailyActivity', () => {
  it('adds exercise to today, accumulates minutes and XP', async () => {
    const { updateDailyActivity, getDailyActivity } = await loadModule();

    updateDailyActivity('humming', 5, 20);
    updateDailyActivity('lip_trill', 3, 15);
    // humming again — should not duplicate in exercisesCompleted
    updateDailyActivity('humming', 2, 10);

    const log = getDailyActivity();
    const todayEntry = log.days.find((d) => d.date === today());

    expect(todayEntry).toBeDefined();
    expect(todayEntry!.exercisesCompleted).toContain('humming');
    expect(todayEntry!.exercisesCompleted).toContain('lip_trill');
    expect(todayEntry!.exercisesCompleted).toHaveLength(2);
    expect(todayEntry!.minutesPracticed).toBe(10);
    expect(todayEntry!.xpEarned).toBe(45);
  });
});

// ============================================================
// dailyXP reset (Bug 3 fix: uses _dailyXPDate, not per-exercise lastPracticed)
// ============================================================

describe('dailyXP accumulation', () => {
  it('does NOT reset dailyXP when switching to a different exercise on the same day', async () => {
    const { updateAfterSession, getTrainingProgress } = await loadModule();

    // Exercise A: earn 20 XP
    updateAfterSession('humming', makeResult(true, 20));
    const after1 = getTrainingProgress();
    expect(after1.dailyXP).toBe(20);

    // Exercise B: earn 15 XP — dailyXP should accumulate, not reset
    updateAfterSession('lip_trill', makeResult(true, 15));
    const after2 = getTrainingProgress();
    expect(after2.dailyXP).toBe(35);
  });

  it('tracks _dailyXPDate and resets when a new day begins', async () => {
    const { getTrainingProgress, saveTrainingProgress, updateAfterSession } =
      await loadModule();

    // Simulate: yesterday's session left dailyXP=50
    const progress = getTrainingProgress();
    progress.dailyXP = 50;
    progress._dailyXPDate = yesterday();
    saveTrainingProgress(progress);

    // Today's first session — dailyXP should reset then add new XP
    const updated = updateAfterSession('humming', makeResult(true, 20));
    expect(updated.dailyXP).toBe(20);
    expect(updated._dailyXPDate).toBe(today());
  });
});

// ============================================================
// markVoiceCheckDone
// ============================================================

// ============================================================
// consecutiveFails
// ============================================================

describe('consecutiveFails', () => {
  it('increments on fail, resets on pass', async () => {
    const { updateAfterSession } = await loadModule();

    // Fail 3 times
    updateAfterSession('humming', makeResult(false));
    updateAfterSession('humming', makeResult(false));
    const after3Fails = updateAfterSession('humming', makeResult(false));
    expect(after3Fails.exercises.humming.consecutiveFails).toBe(3);

    // Pass once — should reset to 0
    const afterPass = updateAfterSession('humming', makeResult(true));
    expect(afterPass.exercises.humming.consecutiveFails).toBe(0);
  });
});

// ============================================================
// useRestDay
// ============================================================

describe('useRestDay', () => {
  it('preserves streak when rest day bridges the gap', async () => {
    const { getTrainingProgress, saveTrainingProgress, useRestDay, updateAfterSession } =
      await loadModule();

    // Seed: practiced yesterday with streak=3
    const progress = getTrainingProgress();
    progress.dailyRoutine.streak = 3;
    progress.dailyRoutine.bestStreak = 3;
    progress.dailyRoutine.lastCompleted = yesterday();
    saveTrainingProgress(progress);

    // Use rest day today
    const result = useRestDay();
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(1); // 2 max - 1 used = 1

    // Verify lastCompleted is set to today (bridge)
    const after = getTrainingProgress();
    expect(after.dailyRoutine.lastCompleted).toBe(today());
    expect(after.dailyRoutine.restDaysUsed).toBe(1);
  });

  it('enforces max 2 rest days limit', async () => {
    const { getTrainingProgress, saveTrainingProgress, useRestDay } =
      await loadModule();

    // Seed: already used 2 rest days
    const progress = getTrainingProgress();
    progress.dailyRoutine.restDaysUsed = 2;
    progress.dailyRoutine.restDays = [daysAgo(2), daysAgo(1)];
    progress.dailyRoutine.lastCompleted = daysAgo(1);
    progress.dailyRoutine.streak = 3;
    saveTrainingProgress(progress);

    // Try to use a 3rd — should fail
    const result = useRestDay();
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('rejects duplicate rest day for same date', async () => {
    const { getTrainingProgress, saveTrainingProgress, useRestDay } =
      await loadModule();

    const progress = getTrainingProgress();
    progress.dailyRoutine.restDays = [today()];
    progress.dailyRoutine.restDaysUsed = 1;
    progress.dailyRoutine.lastCompleted = yesterday();
    progress.dailyRoutine.streak = 2;
    saveTrainingProgress(progress);

    // Try to use rest day for today again
    const result = useRestDay();
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(1);
  });
});

// ============================================================
// Rest day streak bridge
// ============================================================

describe('rest day streak bridge', () => {
  it('streak continues when gap day is covered by rest day', async () => {
    const { getTrainingProgress, saveTrainingProgress, updateAfterSession } =
      await loadModule();

    // Seed: last practiced 2 days ago, streak=5, yesterday is a rest day
    const progress = getTrainingProgress();
    progress.dailyRoutine.streak = 5;
    progress.dailyRoutine.bestStreak = 5;
    progress.dailyRoutine.lastCompleted = daysAgo(2);
    progress.dailyRoutine.restDays = [yesterday()];
    progress.dailyRoutine.restDaysUsed = 1;
    saveTrainingProgress(progress);

    // Practice today — gap of 1 day (yesterday) is covered by rest day
    const updated = updateAfterSession('humming', makeResult(true));
    expect(updated.dailyRoutine.streak).toBe(6); // continues from 5
  });

  it('streak resets when gap day is NOT covered by rest day', async () => {
    const { getTrainingProgress, saveTrainingProgress, updateAfterSession } =
      await loadModule();

    // Seed: last practiced 3 days ago, streak=5, only 1 of 2 gap days covered
    const progress = getTrainingProgress();
    progress.dailyRoutine.streak = 5;
    progress.dailyRoutine.bestStreak = 5;
    progress.dailyRoutine.lastCompleted = daysAgo(3);
    progress.dailyRoutine.restDays = [daysAgo(2)]; // only covers 1 of 2 gap days
    progress.dailyRoutine.restDaysUsed = 1;
    saveTrainingProgress(progress);

    // Practice today — gap has uncovered day → streak resets
    const updated = updateAfterSession('humming', makeResult(true));
    expect(updated.dailyRoutine.streak).toBe(1);
    expect(updated.dailyRoutine.restDaysUsed).toBe(0); // reset on break
  });
});

// ============================================================
// markVoiceCheckDone
// ============================================================

describe('markVoiceCheckDone', () => {
  it('sets voiceCheckDone for today in dailyActivity', async () => {
    const { markVoiceCheckDone, getDailyActivity } = await loadModule();

    markVoiceCheckDone();

    const log = getDailyActivity();
    const todayEntry = log.days.find((d) => d.date === today());
    expect(todayEntry).toBeDefined();
    expect(todayEntry!.voiceCheckDone).toBe(true);
  });
});
