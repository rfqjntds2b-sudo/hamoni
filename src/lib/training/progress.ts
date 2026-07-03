// ============================================================
// Training Feature — Progress Persistence (localStorage)
// ============================================================
// Manages training progress and daily activity with localStorage.
// All dates are stored as YYYY-MM-DD strings.

import type {
  ExerciseId,
  ExerciseProgress,
  TrainingProgress,
  SessionResult,
  DailyActivityLog,
} from './types';
import { EXERCISE_IDS } from './exercises';
import { checkLevelUp } from './level-manager';
import { getItem, setItem } from './storage';
import { saveProgressToSupabase } from './sync';
import { todayString, yesterdayString, daysAgoString, dateToUTCMs, MS_PER_DAY } from './date-utils';

// ============================================================
// Constants
// ============================================================

const PROGRESS_KEY = 'hamoni:trainingProgress';
const ACTIVITY_KEY = 'hamoni:dailyActivity';
const ACTIVITY_PRUNE_DAYS = 90;

function createDefaultExerciseProgress(): ExerciseProgress {
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
  };
}

function createDefaultProgress(): TrainingProgress {
  const exercises = {} as Record<ExerciseId, ExerciseProgress>;
  for (const id of EXERCISE_IDS) {
    exercises[id] = createDefaultExerciseProgress();
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
    breathRoutine: { lastCompleted: null },
    totalXP: 0,
    dailyXP: 0,
    _version: 0,
  };
}

// ============================================================
// Multi-tab conflict detection
// ============================================================
// Tracks the version of the last-read progress so that writes
// can detect when another tab has modified the data. On conflict,
// the latest version is re-read from storage before the caller
// applies its changes.

/** Version from the most recent getTrainingProgress() call in this tab */
let _lastReadVersion = -1;

// ============================================================
// getTrainingProgress
// ============================================================

/**
 * Read training progress from localStorage.
 * If missing or corrupt, returns a fresh default state with all 10 exercises.
 */
export function getTrainingProgress(): TrainingProgress {
  try {
    const raw = getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingProgress;
      // Heal partially-corrupt data: backfill missing exercise keys
      const defaults = createDefaultProgress();
      for (const id of EXERCISE_IDS) {
        if (!parsed.exercises?.[id]) {
          parsed.exercises[id] = defaults.exercises[id as ExerciseId];
        } else if (!Array.isArray(parsed.exercises[id].levelHistory)) {
          // Heal pre-levelHistory data
          parsed.exercises[id].levelHistory = [];
        }
      }
      // Heal missing version field (pre-versioning data)
      if (typeof parsed._version !== 'number') {
        parsed._version = 0;
      }
      // Heal missing breathRoutine field
      if (!parsed.breathRoutine) {
        parsed.breathRoutine = { lastCompleted: null };
      }
      // Heal missing shield/comeback fields
      if (typeof parsed.dailyRoutine.shieldCount !== 'number') {
        parsed.dailyRoutine.shieldCount = 0;
      }
      if (!Array.isArray(parsed.dailyRoutine.shieldsAwarded)) {
        parsed.dailyRoutine.shieldsAwarded = [];
      }
      if (typeof parsed.dailyRoutine.comebackBonusAvailable !== 'boolean') {
        parsed.dailyRoutine.comebackBonusAvailable = false;
      }
      _lastReadVersion = parsed._version;
      return parsed;
    }
  } catch {
    // Corrupt data — fall through to default
  }

  const defaultProgress = createDefaultProgress();
  _lastReadVersion = defaultProgress._version ?? 0;
  saveTrainingProgress(defaultProgress);
  return defaultProgress;
}

// ============================================================
// saveTrainingProgress
// ============================================================

/**
 * Write training progress to localStorage.
 * Detects multi-tab conflicts: if the stored version has advanced
 * past what this tab last read, a warning is logged. The write
 * still proceeds (last-write-wins) but the version is always
 * incremented so the next reader in any tab sees the change.
 */
export function saveTrainingProgress(progress: TrainingProgress): void {
  try {
    // Detect multi-tab conflict
    const raw = getItem(PROGRESS_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as TrainingProgress;
        const storedVersion = stored._version ?? 0;
        if (_lastReadVersion >= 0 && storedVersion > _lastReadVersion) {
          console.warn(
            `[progress] Multi-tab conflict detected: stored v${storedVersion}, last read v${_lastReadVersion}. Proceeding with write.`,
          );
        }
      } catch {
        // Corrupt stored data — overwrite is fine
      }
    }

    // Increment version before writing
    progress._version = (progress._version ?? 0) + 1;
    _lastReadVersion = progress._version;

    setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or unavailable — silently fail
  }

  // Async Supabase sync (fire-and-forget, never throws)
  void saveProgressToSupabase(progress);
}

// ============================================================
// getExerciseProgress
// ============================================================

/**
 * Get progress for a single exercise.
 */
export function getExerciseProgress(exerciseId: ExerciseId): ExerciseProgress {
  const progress = getTrainingProgress();
  return progress.exercises[exerciseId] ?? createDefaultExerciseProgress();
}

// ============================================================
// updateAfterSession
// ============================================================

/**
 * Update progress after a completed session.
 *
 * 1. Increment totalAttempts
 * 2. If passed: totalPasses++, consecutivePasses++
 * 3. If failed: consecutivePasses = 0
 * 4. Check level-up (3 consecutive passes → level++)
 * 5. Update bestLevel, totalXP, streak, lastPracticed
 * 6. Save and return
 */
export function updateAfterSession(
  exerciseId: ExerciseId,
  result: SessionResult,
): TrainingProgress {
  const progress = getTrainingProgress();
  const ex = progress.exercises[exerciseId];

  // --- Attempts ---
  ex.totalAttempts++;

  if (result.passed) {
    ex.totalPasses++;
    ex.consecutivePasses++;
    ex.consecutiveFails = 0;
  } else {
    ex.consecutivePasses = 0;
    ex.consecutiveFails = (ex.consecutiveFails ?? 0) + 1;
  }

  // --- Recent results (FIFO, max 10) for adaptive difficulty ---
  const recent = ex.recentResults ? [...ex.recentResults] : [];
  recent.push(result.passed);
  if (recent.length > 10) recent.shift();
  ex.recentResults = recent;

  // --- Today's date (used in level-up, daily XP, streak, lastPracticed) ---
  const todayDate = todayString();

  // --- Level-up check ---
  const { leveledUp, newLevel } = checkLevelUp(ex);
  if (leveledUp) {
    ex.currentLevel = newLevel;
    ex.consecutivePasses = 0; // reset after level-up
    if (!ex.levelHistory) ex.levelHistory = [];
    ex.levelHistory.push({
      date: todayDate,
      from: newLevel - 1,
      to: newLevel,
    });
  }

  // --- Best level ---
  ex.bestLevel = Math.max(ex.bestLevel, ex.currentLevel);

  // --- Comeback bonus XP ---
  const COMEBACK_BONUS_XP = 30;
  let comebackBonusGiven = false;
  if (progress.dailyRoutine.comebackBonusAvailable) {
    progress.dailyRoutine.comebackBonusAvailable = false;
    comebackBonusGiven = true;
  }

  // --- XP ---
  progress.totalXP += result.xpEarned + (comebackBonusGiven ? COMEBACK_BONUS_XP : 0);

  // --- Daily XP ---
  if (progress._dailyXPDate !== todayDate) {
    progress.dailyXP = 0;
    progress._dailyXPDate = todayDate;
  }
  progress.dailyXP += result.xpEarned;

  // --- Streak ---
  const { lastCompleted } = progress.dailyRoutine;

  if (lastCompleted === todayDate) {
    // Same day — no streak change
  } else if (lastCompleted === yesterdayString()) {
    // Consecutive day
    progress.dailyRoutine.streak++;
  } else if (lastCompleted) {
    // Gap of 2+ days — check if all gap days are covered by rest days
    // Use UTC arithmetic to avoid DST-induced off-by-one errors
    const lastMs = dateToUTCMs(lastCompleted);
    const todayMs = dateToUTCMs(todayDate);
    const gapDays: string[] = [];
    for (let ms = lastMs + MS_PER_DAY; ms < todayMs; ms += MS_PER_DAY) {
      const dt = new Date(ms);
      gapDays.push(
        `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`,
      );
    }
    const restDays = progress.dailyRoutine.restDays ?? [];
    const allCovered = gapDays.length > 0 && gapDays.every((day) => restDays.includes(day));
    if (allCovered) {
      // Rest days bridge the gap — streak continues
      progress.dailyRoutine.streak++;
    } else if ((progress.dailyRoutine.shieldCount ?? 0) > 0) {
      // Shield absorbs the break — streak continues, consume one shield
      progress.dailyRoutine.shieldCount--;
      progress.dailyRoutine.streak++;
    } else {
      // Streak broken — enable comeback bonus for next session
      if (progress.dailyRoutine.streak >= 3) {
        progress.dailyRoutine.comebackBonusAvailable = true;
      }
      progress.dailyRoutine.streak = 1;
      progress.dailyRoutine.restDaysUsed = 0;
      progress.dailyRoutine.restDays = [];
      // Reset awarded milestones so they can be earned again on new streak
      progress.dailyRoutine.shieldsAwarded = [];
    }
  } else {
    // First time ever
    progress.dailyRoutine.streak = 1;
  }

  // --- Award shields at streak milestones ---
  const SHIELD_MILESTONES = [7, 30, 100];
  const awarded = progress.dailyRoutine.shieldsAwarded ?? [];
  for (const milestone of SHIELD_MILESTONES) {
    if (progress.dailyRoutine.streak >= milestone && !awarded.includes(milestone)) {
      progress.dailyRoutine.shieldCount = (progress.dailyRoutine.shieldCount ?? 0) + 1;
      awarded.push(milestone);
    }
  }
  progress.dailyRoutine.shieldsAwarded = awarded;

  progress.dailyRoutine.bestStreak = Math.max(
    progress.dailyRoutine.bestStreak,
    progress.dailyRoutine.streak,
  );
  progress.dailyRoutine.lastCompleted = todayDate;

  // --- Last practiced ---
  ex.lastPracticed = todayDate;

  // --- First session date (for curriculum engine) ---
  if (!progress.firstSessionDate) {
    progress.firstSessionDate = todayDate;
  }

  // --- Persist ---
  saveTrainingProgress(progress);
  return progress;
}

// ============================================================
// useRestDay
// ============================================================

/**
 * Use a rest day to bridge the streak without practicing.
 * Max 2 rest days per streak period.
 */
export function useRestDay(): { success: boolean; remaining: number } {
  const progress = getTrainingProgress();
  const today = todayString();
  const MAX_REST = 2; // max 2 rest days per streak period
  if (progress.dailyRoutine.restDays.includes(today)) return { success: false, remaining: MAX_REST - progress.dailyRoutine.restDaysUsed };
  if (progress.dailyRoutine.restDaysUsed >= MAX_REST) return { success: false, remaining: 0 };
  progress.dailyRoutine.restDays.push(today);
  progress.dailyRoutine.restDaysUsed++;
  progress.dailyRoutine.lastCompleted = today; // bridge for streak
  saveTrainingProgress(progress);
  return { success: true, remaining: MAX_REST - progress.dailyRoutine.restDaysUsed };
}

// ============================================================
// Breath Routine Completion
// ============================================================

/**
 * Mark today's breath routine as completed.
 * Updates breathRoutine.lastCompleted and increments breathRoutineCount in daily activity.
 */
export function markBreathRoutineComplete(): void {
  const progress = getTrainingProgress();
  const today = todayString();

  if (!progress.breathRoutine) {
    progress.breathRoutine = { lastCompleted: null };
  }
  progress.breathRoutine.lastCompleted = today;
  saveTrainingProgress(progress);

  // Increment breath routine count in daily activity
  const log = getDailyActivity();
  let todayEntry = log.days.find((d) => d.date === today);
  if (!todayEntry) {
    todayEntry = {
      date: today,
      exercisesCompleted: [],
      minutesPracticed: 0,
      xpEarned: 0,
    };
    log.days.push(todayEntry);
  }
  todayEntry.breathRoutineCount = (todayEntry.breathRoutineCount ?? 0) + 1;

  // Prune old entries
  const cutoff = daysAgoString(ACTIVITY_PRUNE_DAYS);
  log.days = log.days.filter((d) => d.date >= cutoff);

  saveDailyActivity(log);
}

/**
 * Get today's breath routine completion count.
 */
export function getTodayBreathRoutineCount(): number {
  const log = getDailyActivity();
  const todayEntry = log.days.find((d) => d.date === todayString());
  return todayEntry?.breathRoutineCount ?? 0;
}

/**
 * Check if breath routine was completed today.
 */
export function isBreathRoutineCompletedToday(): boolean {
  const progress = getTrainingProgress();
  return progress.breathRoutine?.lastCompleted === todayString();
}

// ============================================================
// Daily Activity
// ============================================================

/**
 * Read daily activity log from localStorage.
 */
export function getDailyActivity(): DailyActivityLog {
  try {
    const raw = getItem(ACTIVITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure days is always an array (guard against legacy/corrupt data)
      if (parsed && Array.isArray(parsed.days)) {
        return parsed as DailyActivityLog;
      }
    }
  } catch {
    // Corrupt data — fall through
  }
  return { days: [] };
}

function saveDailyActivity(log: DailyActivityLog): void {
  try {
    setItem(ACTIVITY_KEY, JSON.stringify(log));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Update daily activity after a session.
 * - Creates today's entry if missing
 * - Adds exerciseId to exercisesCompleted (no duplicates)
 * - Accumulates minutesPracticed and xpEarned
 * - Prunes entries older than 90 days
 */
export function updateDailyActivity(
  exerciseId: ExerciseId,
  minutesPracticed: number,
  xpEarned: number,
): void {
  const log = getDailyActivity();
  const todayDate = todayString();

  let todayEntry = log.days.find((d) => d.date === todayDate);
  if (!todayEntry) {
    todayEntry = {
      date: todayDate,
      exercisesCompleted: [],
      minutesPracticed: 0,
      xpEarned: 0,
    };
    log.days.push(todayEntry);
  }

  // Add exercise (no duplicates)
  if (!todayEntry.exercisesCompleted.includes(exerciseId)) {
    todayEntry.exercisesCompleted.push(exerciseId);
  }

  // Accumulate
  todayEntry.minutesPracticed += minutesPracticed;
  todayEntry.xpEarned += xpEarned;

  // Prune entries older than 90 days
  const cutoff = daysAgoString(ACTIVITY_PRUNE_DAYS);
  log.days = log.days.filter((d) => d.date >= cutoff);

  saveDailyActivity(log);
}

/**
 * Mark today's voice check as done in the daily activity log.
 */
export function markVoiceCheckDone(): void {
  const log = getDailyActivity();
  const todayDate = todayString();

  let todayEntry = log.days.find((d) => d.date === todayDate);
  if (!todayEntry) {
    todayEntry = {
      date: todayDate,
      exercisesCompleted: [],
      minutesPracticed: 0,
      xpEarned: 0,
    };
    log.days.push(todayEntry);
  }

  // Set voiceCheckDone flag
  todayEntry.voiceCheckDone = true;

  saveDailyActivity(log);
}

// ============================================================
// addExternalXP
// ============================================================

/**
 * Add XP from non-training sources (e.g. scale training).
 * Updates totalXP, dailyXP, and persists to localStorage + Supabase.
 */
export function addExternalXP(amount: number): void {
  if (amount <= 0) return;

  const progress = getTrainingProgress();
  const todayDate = todayString();

  if (progress._dailyXPDate !== todayDate) {
    progress.dailyXP = 0;
    progress._dailyXPDate = todayDate;
  }

  progress.totalXP += amount;
  progress.dailyXP += amount;

  saveTrainingProgress(progress);
}
