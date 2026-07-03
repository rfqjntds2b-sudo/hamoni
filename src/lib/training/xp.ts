// ============================================================
// Training Feature — XP Calculator
// ============================================================
// Pure functions for computing earned XP with streak/bonus multipliers.

import type { ExerciseId, XPBonus, XPResult } from './types';
import { getExerciseMeta } from './exercises';

// ============================================================
// Constants
// ============================================================

const BASE_XP = 10;
const XP_PER_LEVEL_PER_DIFFICULTY = 3;

const STREAK_7D_MULTIPLIER = 0.2; // +20%
const STREAK_30D_MULTIPLIER = 0.5; // +50%
const ALL_GREEN_MULTIPLIER = 0.5; // +50%

const PR_FLAT_BONUS = 10;
const LEVEL_UP_FLAT_BONUS = 50;

const FAILURE_RATIO = 0.2;

export const MILESTONE_BONUS = 15;
export const MILESTONE_SESSIONS = [4, 10, 25, 50, 100] as const;

/**
 * Check if a session count is a milestone and return the bonus XP.
 * Returns 0 if not a milestone.
 */
export function getMilestoneBonus(sessionCount: number): number {
  return MILESTONE_SESSIONS.includes(sessionCount as typeof MILESTONE_SESSIONS[number])
    ? MILESTONE_BONUS : 0;
}

// Scale Training XP (modest, separate from main training exercises)
const SCALE_XP_BASE = 8;
const SCALE_XP_PER_DIFFICULTY = 2;

// ============================================================
// calculateBaseXP
// ============================================================

/**
 * Calculate the base XP for an exercise at a given level.
 * Formula: 10 + level * 5 * difficulty
 */
export function calculateBaseXP(exerciseId: ExerciseId, level: number): number {
  const meta = getExerciseMeta(exerciseId);
  return BASE_XP + level * XP_PER_LEVEL_PER_DIFFICULTY * meta.difficulty;
}

// ============================================================
// calculateXPWithBonuses
// ============================================================

/**
 * Calculate total XP with all applicable bonuses.
 *
 * Multiplier bonuses (additive with each other, applied to baseXP):
 * - streak 7d: +20%
 * - streak 30d: +50% (takes highest tier only, not both)
 * - allGreen: +50%
 *
 * Flat bonuses (added after multiplier):
 * - personalRecord: +10
 * - levelUp: +50
 *
 * On failure: floor(baseXP * 0.2), no bonuses applied.
 */
export function calculateXPWithBonuses(
  exerciseId: ExerciseId,
  level: number,
  context: {
    passed: boolean;
    streak: number;
    allGreen: boolean;
    isPersonalRecord: boolean;
    isLevelUp: boolean;
  },
): XPResult {
  const baseXP = calculateBaseXP(exerciseId, level);

  // Failure: 20% of base, no bonuses
  if (!context.passed) {
    return {
      baseXP,
      bonuses: [],
      totalXP: Math.floor(baseXP * FAILURE_RATIO),
    };
  }

  // Collect bonuses
  const bonuses: XPBonus[] = [];
  let multiplier = 1.0;
  let flatBonus = 0;

  // Streak bonus (highest tier only)
  if (context.streak >= 30) {
    multiplier += STREAK_30D_MULTIPLIER;
    bonuses.push({
      label: 'streak',
      amount: STREAK_30D_MULTIPLIER,
      isMultiplier: true,
      value: STREAK_30D_MULTIPLIER,
    });
  } else if (context.streak >= 7) {
    multiplier += STREAK_7D_MULTIPLIER;
    bonuses.push({
      label: 'streak',
      amount: STREAK_7D_MULTIPLIER,
      isMultiplier: true,
      value: STREAK_7D_MULTIPLIER,
    });
  }

  // All-green bonus
  if (context.allGreen) {
    multiplier += ALL_GREEN_MULTIPLIER;
    bonuses.push({
      label: 'allGreen',
      amount: ALL_GREEN_MULTIPLIER,
      isMultiplier: true,
      value: ALL_GREEN_MULTIPLIER,
    });
  }

  // Personal record flat bonus
  if (context.isPersonalRecord) {
    flatBonus += PR_FLAT_BONUS;
    bonuses.push({
      label: 'personalRecord',
      amount: PR_FLAT_BONUS,
      isMultiplier: false,
      value: PR_FLAT_BONUS,
    });
  }

  // Level-up flat bonus
  if (context.isLevelUp) {
    flatBonus += LEVEL_UP_FLAT_BONUS;
    bonuses.push({
      label: 'levelUp',
      amount: LEVEL_UP_FLAT_BONUS,
      isMultiplier: false,
      value: LEVEL_UP_FLAT_BONUS,
    });
  }

  const totalXP = Math.floor(baseXP * multiplier) + flatBonus;

  return {
    baseXP,
    bonuses,
    totalXP,
  };
}

// ============================================================
// calculateScaleTrainingXP
// ============================================================

/**
 * Calculate XP earned for completing a scale training session.
 * Intentionally modest (6–24 XP) compared to main training exercises.
 */
export function calculateScaleTrainingXP(
  difficultyLevel: number,
  setsCompleted: number,
  totalSets: number,
): number {
  const completionRatio = Math.max(0.5, totalSets > 0 ? setsCompleted / totalSets : 1);
  return Math.ceil((SCALE_XP_BASE + difficultyLevel * SCALE_XP_PER_DIFFICULTY) * completionRatio);
}
