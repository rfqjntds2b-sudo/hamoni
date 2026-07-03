import { describe, it, expect } from 'vitest';
import { checkLevelUp, isPersonalRecord, checkAdaptiveDifficulty, pushRecentResult } from '../level-manager';
import type { ExerciseProgress } from '../types';

// ============================================================
// Helper: create default ExerciseProgress with overrides
// ============================================================

function makeProgress(overrides: Partial<ExerciseProgress> = {}): ExerciseProgress {
  return {
    currentLevel: 1,
    bestLevel: 1,
    totalAttempts: 0,
    totalPasses: 0,
    consecutivePasses: 0,
    consecutiveFails: 0,
    lastPracticed: null,
    personalBests: {},
    ...overrides,
  };
}

// ============================================================
// checkLevelUp
// ============================================================

describe('checkLevelUp', () => {
  it('3 consecutive passes → leveledUp=true, newLevel=currentLevel+1', () => {
    const progress = makeProgress({
      currentLevel: 1,
      consecutivePasses: 3,
    });

    const result = checkLevelUp(progress);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
  });

  it('more than 3 consecutive passes → still levels up', () => {
    const progress = makeProgress({
      currentLevel: 2,
      consecutivePasses: 5,
    });

    const result = checkLevelUp(progress);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(3);
  });

  it('2 passes then fail → leveledUp=false', () => {
    const progress = makeProgress({
      currentLevel: 1,
      consecutivePasses: 2,
    });

    const result = checkLevelUp(progress);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
  });

  it('0 consecutive passes → leveledUp=false', () => {
    const progress = makeProgress({
      currentLevel: 3,
      consecutivePasses: 0,
    });

    const result = checkLevelUp(progress);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(3);
  });

  it('Lv.10 + 3 passes → leveledUp=false (cap at 10)', () => {
    const progress = makeProgress({
      currentLevel: 10,
      consecutivePasses: 3,
    });

    const result = checkLevelUp(progress);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(10);
  });

  it('Lv.9 + 3 passes → levels up to 10', () => {
    const progress = makeProgress({
      currentLevel: 9,
      consecutivePasses: 3,
    });

    const result = checkLevelUp(progress);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(10);
  });
});

// ============================================================
// isPersonalRecord
// ============================================================

describe('isPersonalRecord', () => {
  it('currentLevel > bestLevel → true', () => {
    const progress = makeProgress({
      currentLevel: 3,
      bestLevel: 2,
    });

    expect(isPersonalRecord(progress)).toBe(true);
  });

  it('currentLevel === bestLevel → false', () => {
    const progress = makeProgress({
      currentLevel: 3,
      bestLevel: 3,
    });

    expect(isPersonalRecord(progress)).toBe(false);
  });

  it('currentLevel < bestLevel → false', () => {
    const progress = makeProgress({
      currentLevel: 2,
      bestLevel: 4,
    });

    expect(isPersonalRecord(progress)).toBe(false);
  });
});

// ============================================================
// checkAdaptiveDifficulty
// ============================================================

describe('checkAdaptiveDifficulty', () => {
  it('returns 0 with undefined recentResults', () => {
    expect(checkAdaptiveDifficulty(undefined)).toBe(0);
  });

  it('returns 0 with fewer than 5 results', () => {
    expect(checkAdaptiveDifficulty([true, true, true, true])).toBe(0);
  });

  it('returns +1 when pass rate >= 80%', () => {
    // 8/10 passes = 80%
    expect(checkAdaptiveDifficulty([true, true, true, true, true, true, true, true, false, false])).toBe(1);
    // 5/5 = 100%
    expect(checkAdaptiveDifficulty([true, true, true, true, true])).toBe(1);
  });

  it('returns -1 when pass rate < 20%', () => {
    // 0/5 = 0%
    expect(checkAdaptiveDifficulty([false, false, false, false, false])).toBe(-1);
    // 1/10 = 10%
    expect(checkAdaptiveDifficulty([false, false, false, false, false, false, false, false, false, true])).toBe(-1);
  });

  it('returns 0 for moderate pass rates', () => {
    // 5/10 = 50%
    expect(checkAdaptiveDifficulty([true, false, true, false, true, false, true, false, true, false])).toBe(0);
    // 3/5 = 60%
    expect(checkAdaptiveDifficulty([true, true, true, false, false])).toBe(0);
  });

  it('returns 0 at boundary (1/5 = 20%)', () => {
    // 1/5 = 20% — exactly at threshold, should return 0 (< not <=)
    expect(checkAdaptiveDifficulty([true, false, false, false, false])).toBe(0);
  });
});

// ============================================================
// pushRecentResult
// ============================================================

describe('pushRecentResult', () => {
  it('creates array from undefined', () => {
    expect(pushRecentResult(undefined, true)).toEqual([true]);
  });

  it('appends to existing array', () => {
    expect(pushRecentResult([true, false], true)).toEqual([true, false, true]);
  });

  it('maintains max 10 entries (FIFO)', () => {
    const full = Array(10).fill(true) as boolean[];
    const result = pushRecentResult(full, false);
    expect(result).toHaveLength(10);
    expect(result[9]).toBe(false);
    expect(result[0]).toBe(true); // shifted out the first true, but 2nd true remains
  });

  it('does not mutate original array', () => {
    const original = [true, false];
    pushRecentResult(original, true);
    expect(original).toHaveLength(2);
  });
});
