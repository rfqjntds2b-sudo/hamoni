// ============================================================
// Training Feature — Week-based Curriculum Engine
// ============================================================
// Deterministic weekly curriculum for the first 8 weeks.
// After week 9+, the existing recommender algorithm takes over.

import type { ExerciseId, TrainingProgress } from './types';
import { getSessionDuration } from './exercises';
import { todayString, dateToUTCMs } from './date-utils';

// ============================================================
// Constants
// ============================================================

/** Core 8 exercises in pedagogical order */
export const CURRICULUM_EXERCISES: ExerciseId[] = [
  'breathing',
  'humming',
  'lip_trill',
  'straw',
  'yawn_sigh',
  'flow',
  'pitch_glide',
  'vibrato',
];

/** Week-based curriculum phases */
interface CurriculumPhase {
  weeks: [number, number]; // inclusive range [start, end]
  unlocked: ExerciseId[];
  dailyRoutine: ExerciseId[];
  estimatedMinutes: number;
  label: string;
  /** Mastery gate: ANY of these exercises must reach minLevel to advance past this phase */
  masteryGate?: { exercises: ExerciseId[]; minLevel: number };
}

const PHASES: CurriculumPhase[] = [
  {
    weeks: [1, 2],
    unlocked: ['breathing', 'humming', 'lip_trill'],
    dailyRoutine: ['breathing', 'humming'],
    estimatedMinutes: 3,
    label: 'phaseFoundation',
    masteryGate: { exercises: ['humming', 'lip_trill'], minLevel: 2 },
  },
  {
    weeks: [3, 4],
    unlocked: ['breathing', 'humming', 'lip_trill', 'straw', 'yawn_sigh'],
    dailyRoutine: ['lip_trill', 'straw'],
    estimatedMinutes: 4,
    label: 'phaseBuildUp',
    masteryGate: { exercises: ['straw', 'lip_trill'], minLevel: 2 },
  },
  {
    weeks: [5, 6],
    unlocked: ['breathing', 'humming', 'lip_trill', 'straw', 'yawn_sigh', 'flow'],
    dailyRoutine: ['straw', 'flow', 'yawn_sigh'],
    estimatedMinutes: 5,
    label: 'phaseStrengthen',
    masteryGate: { exercises: ['flow', 'straw'], minLevel: 2 },
  },
  {
    weeks: [7, 8],
    unlocked: ['breathing', 'humming', 'lip_trill', 'straw', 'yawn_sigh', 'flow', 'pitch_glide', 'vibrato'],
    dailyRoutine: ['flow', 'vibrato', 'pitch_glide'],
    estimatedMinutes: 6,
    label: 'phaseExpression',
  },
];

/** Week threshold above which we defer to the existing recommender */
export const CURRICULUM_WEEKS = 8;

/** Skill-based early unlock: if prerequisite reaches minLevel, unlock extras */
const SKILL_UNLOCK_THRESHOLDS: { prerequisite: ExerciseId; minLevel: number; unlocks: ExerciseId[] }[] = [
  { prerequisite: 'humming', minLevel: 3, unlocks: ['straw', 'yawn_sigh'] },
  { prerequisite: 'lip_trill', minLevel: 3, unlocks: ['straw', 'yawn_sigh'] },
  { prerequisite: 'straw', minLevel: 3, unlocks: ['flow'] },
  { prerequisite: 'flow', minLevel: 3, unlocks: ['pitch_glide', 'vibrato'] },
  // Register & Resonance unlocks
  { prerequisite: 'resonant', minLevel: 3, unlocks: ['vowel_sustain', 'vowel_transition'] },
  { prerequisite: 'flow', minLevel: 4, unlocks: ['passaggio_sustain'] },
  { prerequisite: 'pitch_glide', minLevel: 3, unlocks: ['register_blend'] },
  { prerequisite: 'passaggio_sustain', minLevel: 3, unlocks: ['register_blend'] },
];

// ============================================================
// Core Functions
// ============================================================

/**
 * Calculate which curriculum week the user is in.
 * Returns 0 if no firstSessionDate set (new user who hasn't started yet).
 * Returns week number (1+) based on days since first session.
 */
export function getCurriculumWeek(progress: TrainingProgress): number {
  const firstDate = progress.firstSessionDate;
  if (!firstDate) return 0;

  const firstMs = dateToUTCMs(firstDate);
  const nowMs = dateToUTCMs(todayString());
  const daysDiff = Math.floor((nowMs - firstMs) / 86_400_000);

  return Math.max(1, Math.floor(daysDiff / 7) + 1);
}

/**
 * Check if the user is still within the guided curriculum period (weeks 1-8).
 */
export function isInCurriculum(progress: TrainingProgress): boolean {
  const week = getCurriculumWeek(progress);
  return week >= 0 && week <= CURRICULUM_WEEKS;
}

/**
 * Check if the mastery gate for a phase has been passed.
 * Returns true if ANY of the gate exercises have reached the required minLevel.
 */
function isMasteryGatePassed(
  gate: CurriculumPhase['masteryGate'],
  progress: TrainingProgress,
): boolean {
  if (!gate) return true;
  return gate.exercises.some(
    (id) => (progress.exercises[id]?.currentLevel ?? 1) >= gate.minLevel,
  );
}

/**
 * Get the current curriculum phase for the user's week.
 * Enforces mastery gates: if the user's calendar week is ahead of their mastery,
 * they stay in the highest phase whose gate they've passed.
 * Returns null if week 0 (no first session) or week 9+.
 */
export function getCurrentPhase(progress: TrainingProgress): CurriculumPhase | null {
  const week = getCurriculumWeek(progress);
  if (week > CURRICULUM_WEEKS) return null;
  if (week === 0) return PHASES[0];

  // Find the calendar-based phase
  let calendarPhaseIndex = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (week >= PHASES[i].weeks[0] && week <= PHASES[i].weeks[1]) {
      calendarPhaseIndex = i;
      break;
    }
    if (week > PHASES[i].weeks[1]) {
      calendarPhaseIndex = i + 1;
    }
  }
  calendarPhaseIndex = Math.min(calendarPhaseIndex, PHASES.length - 1);

  // Enforce mastery gates: can't advance past a phase whose gate isn't passed
  let effectivePhaseIndex = 0;
  for (let i = 0; i < calendarPhaseIndex; i++) {
    if (!isMasteryGatePassed(PHASES[i].masteryGate, progress)) {
      break;
    }
    effectivePhaseIndex = i + 1;
  }
  effectivePhaseIndex = Math.min(effectivePhaseIndex, calendarPhaseIndex);

  return PHASES[effectivePhaseIndex];
}

/**
 * Get the list of exercises unlocked at the user's current week.
 * Week 0 (new user): returns first phase's unlocked list.
 * Week 9+: returns all curriculum exercises.
 */
export function getUnlockedExercises(progress: TrainingProgress): ExerciseId[] {
  const week = getCurriculumWeek(progress);

  if (week > CURRICULUM_WEEKS) return [...CURRICULUM_EXERCISES];

  // Time-based unlocks from current phase
  const phase = getCurrentPhase(progress);
  const timeUnlocked = new Set<ExerciseId>(phase ? phase.unlocked : PHASES[0].unlocked);

  // Skill-based early unlocks
  for (const threshold of SKILL_UNLOCK_THRESHOLDS) {
    const ep = progress.exercises[threshold.prerequisite];
    if (ep && ep.currentLevel >= threshold.minLevel) {
      for (const id of threshold.unlocks) {
        timeUnlocked.add(id);
      }
    }
  }

  return Array.from(timeUnlocked);
}

/**
 * Get the recommended daily routine exercises based on curriculum phase.
 * For weeks 1-8, returns phase routine adapted by recent performance:
 *   - Exercises the user recently failed are moved to front (reinforcement)
 *   - Exercises the user is struggling with (adaptive=-1) get priority
 * For week 9+, returns null (caller should use recommender.ts).
 */
export function getCurriculumRoutine(progress: TrainingProgress): ExerciseId[] | null {
  const phase = getCurrentPhase(progress);
  if (!phase) return null;

  const routine = [...phase.dailyRoutine];

  // Sort: struggling exercises first, then recently failed, then default order
  routine.sort((a, b) => {
    const epA = progress.exercises[a];
    const epB = progress.exercises[b];

    // Struggling (adaptive=-1) gets highest priority
    const adaptiveA = epA.recentResults && epA.recentResults.length >= 5
      ? (epA.recentResults.filter(r => r).length / epA.recentResults.length < 0.2 ? -1 : 0)
      : 0;
    const adaptiveB = epB.recentResults && epB.recentResults.length >= 5
      ? (epB.recentResults.filter(r => r).length / epB.recentResults.length < 0.2 ? -1 : 0)
      : 0;
    if (adaptiveA !== adaptiveB) return adaptiveA - adaptiveB; // -1 comes first

    // Recently failed (consecutiveFails > 0) gets next priority
    const failsA = epA.consecutiveFails ?? 0;
    const failsB = epB.consecutiveFails ?? 0;
    if (failsA !== failsB) return failsB - failsA; // more fails first

    return 0; // preserve original order
  });

  return routine;
}

/**
 * Get the estimated daily routine time in minutes.
 * Accounts for level-based session duration scaling.
 */
export function getEstimatedMinutes(progress: TrainingProgress): number {
  const routine = getCurriculumRoutine(progress);
  if (!routine || routine.length === 0) {
    const phase = getCurrentPhase(progress);
    return phase?.estimatedMinutes ?? 15;
  }

  // Sum actual scaled session durations for routine exercises
  let totalSeconds = 0;
  for (const id of routine) {
    const level = progress.exercises[id]?.currentLevel ?? 1;
    totalSeconds += getSessionDuration(id, level);
  }
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

/**
 * Get the label for the current curriculum phase.
 */
/**
 * Get the i18n key for the current curriculum phase label.
 * Returns a key like 'hub.phaseFoundation' for use with t().
 * Falls back to 'hub.phaseCustom' for week 9+.
 */
export function getPhaseLabel(progress: TrainingProgress): string {
  const phase = getCurrentPhase(progress);
  return phase?.label ?? 'phaseCustom';
}

/**
 * Check if an exercise is locked at the user's current curriculum week.
 * Only applies to the 8 core curriculum exercises.
 * Non-curriculum exercises (Tier 2/3) are always "locked" unless week 9+.
 */
export function isExerciseLocked(
  exerciseId: ExerciseId,
  progress: TrainingProgress,
): boolean {
  const unlocked = getUnlockedExercises(progress);
  return !unlocked.includes(exerciseId);
}

