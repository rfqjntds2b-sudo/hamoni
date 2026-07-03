// ============================================================
// Unified Skill Profile — 5-axis vocal ability assessment
// ============================================================
// Combines data from training, breath control, and scale training
// into a single profile for cross-module recommendations.
//
// Axes:
//   1. Stability  — jitter/shimmer control (voice check + pass rate)
//   2. ToneQuality — HNR / harmonic clarity (voice check + exercise levels)
//   3. Flexibility — pitch range and smooth transitions (scale + pitch exercises)
//   4. Breathing   — breath control and sustain (breath exercises + MPT)
//   5. Endurance   — consistency and training volume (streak + daily time)

import type { TrainingProgress, ExerciseId } from './types';
import { getLatestVoiceCheck } from './voice-check-scorer';
import { getRecentScaleSessions } from '@/lib/vocal-training/session-manager';
import { computePassRate } from './stats-helpers';
import { getTrainingHistory } from './history';

// ============================================================
// Types
// ============================================================

export interface SkillProfile {
  stability: number;    // 0-100
  toneQuality: number;  // 0-100
  flexibility: number;  // 0-100
  breathing: number;    // 0-100
  endurance: number;    // 0-100
  overall: number;      // mean of 5 axes
  weakestAxis: SkillAxis;
}

export type SkillAxis = 'stability' | 'toneQuality' | 'flexibility' | 'breathing' | 'endurance';

// ============================================================
// Constants
// ============================================================

const MAX_LEVEL = 10;

/** Exercise IDs relevant to each axis */
const STABILITY_EXERCISES: ExerciseId[] = ['humming', 'straw', 'flow', 'lip_trill'];
const TONE_EXERCISES: ExerciseId[] = ['resonant', 'humming', 'vowel_sustain', 'vowel_transition'];
const FLEXIBILITY_EXERCISES: ExerciseId[] = ['pitch_glide', 'register_blend', 'yawn_sigh', 'vibrato', 'basic_dynamic'];
const BREATHING_EXERCISES: ExerciseId[] = ['breathing', 'breath_sustain', 'breath_alloc', 'airflow_stable', 'mpt', 'sz_ratio', 'phrase_sim'];

// ============================================================
// Helpers
// ============================================================

/** Average exercise level for a set of exercise IDs (0-100 scale) */
function avgLevelScore(progress: TrainingProgress, ids: ExerciseId[]): number {
  let sum = 0;
  let count = 0;
  for (const id of ids) {
    const ep = progress.exercises[id];
    if (ep && ep.totalAttempts > 0) {
      sum += (ep.currentLevel / MAX_LEVEL) * 100;
      count++;
    }
  }
  return count > 0 ? Math.round(sum / count) : 0;
}

// ============================================================
// computeSkillProfile
// ============================================================

/**
 * Compute a unified 5-axis skill profile from all available data.
 * Each axis is 0-100. The weakest axis drives cross-module recommendations.
 */
export function computeSkillProfile(progress: TrainingProgress): SkillProfile {
  const voiceCheck = getLatestVoiceCheck();
  const history = getTrainingHistory();
  const scaleSessions = getRecentScaleSessions(30);

  // --- 1. Stability (jitter/shimmer from voice check + exercise levels) ---
  const vcStability = voiceCheck
    ? Math.round((voiceCheck.jitterScore + voiceCheck.shimmerScore) / 2)
    : 0;
  const exStability = avgLevelScore(progress, STABILITY_EXERCISES);
  const stability = voiceCheck
    ? Math.round(vcStability * 0.6 + exStability * 0.4)
    : exStability;

  // --- 2. Tone Quality (HNR from voice check + resonance exercise levels) ---
  const vcTone = voiceCheck ? voiceCheck.hnrScore : 0;
  const exTone = avgLevelScore(progress, TONE_EXERCISES);
  const toneQuality = voiceCheck
    ? Math.round(vcTone * 0.6 + exTone * 0.4)
    : exTone;

  // --- 3. Flexibility (scale training state + pitch exercise levels) ---
  const exFlex = avgLevelScore(progress, FLEXIBILITY_EXERCISES);
  // Scale training: count consecutive BALANCED sessions as a bonus
  const balancedCount = scaleSessions.filter(s => s.diagnosticState === 'BALANCED').length;
  const scaleBonus = Math.min(30, Math.round((balancedCount / Math.max(1, scaleSessions.length)) * 30));
  const flexibility = Math.min(100, exFlex + scaleBonus);

  // --- 4. Breathing (breath exercise levels) ---
  const breathing = avgLevelScore(progress, BREATHING_EXERCISES);

  // --- 5. Endurance (streak + pass rate) ---
  const streakScore = Math.min(100, Math.round((progress.dailyRoutine.streak / 30) * 50));
  const passRate = history.length > 0
    ? computePassRate(history).rate
    : 0;
  const endurance = Math.round(streakScore * 0.5 + passRate * 0.5);

  // --- Overall ---
  const overall = Math.round(
    (stability + toneQuality + flexibility + breathing + endurance) / 5,
  );

  // --- Weakest axis ---
  const axes: Record<SkillAxis, number> = { stability, toneQuality, flexibility, breathing, endurance };
  const weakestAxis = (Object.entries(axes) as [SkillAxis, number][])
    .sort((a, b) => a[1] - b[1])[0][0];

  return { stability, toneQuality, flexibility, breathing, endurance, overall, weakestAxis };
}

// ============================================================
// getWeakestAxisExercises
// ============================================================

/** Map weakest axis to exercises that improve it */
const AXIS_EXERCISE_MAP: Record<SkillAxis, ExerciseId[]> = {
  stability: STABILITY_EXERCISES,
  toneQuality: TONE_EXERCISES,
  flexibility: FLEXIBILITY_EXERCISES,
  breathing: BREATHING_EXERCISES,
  endurance: ['breathing', 'humming', 'lip_trill'], // foundational exercises for building habit
};

/**
 * Get exercise IDs that target the weakest skill axis.
 * Used by recommender to prioritize cross-module improvement.
 */
export function getWeakestAxisExercises(profile: SkillProfile): ExerciseId[] {
  return AXIS_EXERCISE_MAP[profile.weakestAxis];
}
