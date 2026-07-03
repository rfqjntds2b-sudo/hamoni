// ============================================================
// Training Feature — Level Manager
// ============================================================
// Pure functions for level progression, personal records,
// and adaptive difficulty (V2 stub).

import type { ExerciseProgress } from './types';

// ============================================================
// Constants
// ============================================================

const MAX_LEVEL = 10;
const PASSES_REQUIRED_FOR_LEVEL_UP = 3;

// ============================================================
// checkLevelUp
// ============================================================

/**
 * Check if the player should level up based on their progress.
 * Requires 3 consecutive passes and current level below cap (5).
 *
 * @returns { leveledUp, newLevel }
 */
export function checkLevelUp(progress: ExerciseProgress): {
  leveledUp: boolean;
  newLevel: number;
} {
  if (
    progress.consecutivePasses >= PASSES_REQUIRED_FOR_LEVEL_UP &&
    progress.currentLevel < MAX_LEVEL
  ) {
    return {
      leveledUp: true,
      newLevel: progress.currentLevel + 1,
    };
  }

  return {
    leveledUp: false,
    newLevel: progress.currentLevel,
  };
}

// ============================================================
// isPersonalRecord
// ============================================================

/**
 * Check if the current level exceeds the player's best recorded level.
 */
export function isPersonalRecord(progress: ExerciseProgress): boolean {
  return progress.currentLevel > progress.bestLevel;
}

// ============================================================
// checkAdaptiveDifficulty
// ============================================================

const ADAPTIVE_MIN_SESSIONS = 5;
const ADAPTIVE_PROMOTE_THRESHOLD = 0.8;  // 80%+ pass rate → suggest next level
const ADAPTIVE_DEMOTE_THRESHOLD = 0.2;   // <20% pass rate → suggest review

/**
 * Suggest a difficulty adjustment based on recent session results.
 *
 * @param recentResults - Array of recent pass/fail booleans (newest last, max 10)
 * @returns  +1 if user should try next level, -1 if review previous, 0 if stay
 */
export function checkAdaptiveDifficulty(recentResults: boolean[] | undefined): number {
  if (!recentResults || recentResults.length < ADAPTIVE_MIN_SESSIONS) return 0;

  const passCount = recentResults.reduce((sum, r) => sum + (r ? 1 : 0), 0);
  const passRate = passCount / recentResults.length;

  if (passRate >= ADAPTIVE_PROMOTE_THRESHOLD) return 1;
  if (passRate < ADAPTIVE_DEMOTE_THRESHOLD) return -1;
  return 0;
}

/**
 * Push a new result into recentResults, maintaining FIFO max 10.
 */
export function pushRecentResult(recentResults: boolean[] | undefined, passed: boolean): boolean[] {
  const results = recentResults ? [...recentResults] : [];
  results.push(passed);
  if (results.length > 10) results.shift();
  return results;
}
