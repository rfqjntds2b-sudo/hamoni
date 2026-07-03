import type { ExerciseId, ExerciseMeta } from './types';
import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';

// ============================================================
// 10 Exercise Metadata Constants
// ============================================================

export const EXERCISES: readonly ExerciseMeta[] = [
  // ---- Warmup (3) ----
  {
    id: 'breathing',
    name: '복식호흡',
    nameEn: 'Diaphragmatic Breathing',
    difficulty: 1,
    category: 'warmup',
    measuredMetrics: [],
    measureMode: 'timer',
    defaultDuration: 36,
    iconName: 'breathing',
  },
  {
    id: 'humming',
    name: '허밍',
    nameEn: 'Humming',
    difficulty: 1,
    category: 'warmup',
    measuredMetrics: ['jitter', 'shimmer', 'hnr'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'humming',
  },
  {
    id: 'lip_trill',
    name: '립 트릴',
    nameEn: 'Lip Trill',
    difficulty: 2,
    category: 'warmup',
    measuredMetrics: ['jitter', 'shimmer', 'hnr'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'lip_trill',
  },
  {
    id: 'breath_sustain',
    name: '호흡 지속',
    nameEn: 'Breath Sustain',
    difficulty: 2,
    category: 'warmup',
    measuredMetrics: ['hnr'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'breath_sustain',
  },

  // ---- Core (6) ----
  {
    id: 'straw',
    name: '스트로 발성',
    nameEn: 'Straw Phonation',
    difficulty: 2,
    category: 'core',
    measuredMetrics: ['jitter', 'shimmer', 'hnr'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'straw',
  },
  {
    id: 'yawn_sigh',
    name: '하품-한숨',
    nameEn: 'Yawn-Sigh',
    difficulty: 2,
    category: 'core',
    measuredMetrics: ['f0', 'pitchSmooth'],
    measureMode: 'pitch_curve',
    defaultDuration: 30,
    iconName: 'yawn_sigh',
  },
  {
    id: 'flow',
    name: '플로우 발성',
    nameEn: 'Flow Phonation',
    difficulty: 3,
    category: 'core',
    measuredMetrics: ['jitter', 'shimmer', 'hnr'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'flow',
  },
  {
    id: 'resonant',
    name: '공명 전환',
    nameEn: 'Resonant Voice Transfer',
    difficulty: 3,
    category: 'core',
    measuredMetrics: ['f0Std', 'hnr'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'resonant',
  },
  {
    id: 'vibrato',
    name: '비브라토',
    nameEn: 'Vibrato Training',
    difficulty: 3,
    category: 'core',
    measuredMetrics: ['vibratoRate', 'vibratoExtent'],
    measureMode: 'vibrato',
    defaultDuration: 30,
    iconName: 'vibrato',
  },
  {
    id: 'basic_dynamic',
    name: '기초 다이나믹',
    nameEn: 'Basic Dynamic Control',
    difficulty: 2,
    category: 'core',
    measuredMetrics: ['dynamicRange', 'f0Deviation'],
    measureMode: 'dynamic_range',
    defaultDuration: 30,
    iconName: 'basic_dynamic',
  },

  // ---- Core — Register & Resonance (3) ----
  {
    id: 'passaggio_sustain',
    name: '파사지오 유지',
    nameEn: 'Passaggio Sustain',
    difficulty: 3,
    category: 'core',
    measuredMetrics: ['jitter', 'shimmer', 'hnr', 'f0Std'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'passaggio_sustain',
  },
  {
    id: 'vowel_sustain',
    name: '모음 공명',
    nameEn: 'Vowel Resonance',
    difficulty: 3,
    category: 'core',
    measuredMetrics: ['hnr', 'jitter', 'shimmer'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'vowel_sustain',
  },
  {
    id: 'vowel_transition',
    name: '모음 전환',
    nameEn: 'Vowel Transition',
    difficulty: 3,
    category: 'core',
    measuredMetrics: ['f0Std', 'hnr', 'jitter', 'shimmer'],
    measureMode: 'sustained',
    defaultDuration: 30,
    iconName: 'vowel_transition',
  },

  // ---- Advanced (4) ----
  {
    id: 'vfe',
    name: '성대 기능 운동',
    nameEn: 'Vocal Function Exercises',
    difficulty: 4,
    category: 'advanced',
    measuredMetrics: ['jitter', 'hnr', 'pitchSmooth'],
    measureMode: 'vfe_complex',
    defaultDuration: 60,
    iconName: 'vfe',
  },
  {
    id: 'pitch_glide',
    name: '피치 글라이드',
    nameEn: 'Pitch Glides',
    difficulty: 4,
    category: 'advanced',
    measuredMetrics: ['pitchSmooth', 'rangeOctaves'],
    measureMode: 'pitch_curve',
    defaultDuration: 30,
    iconName: 'pitch_glide',
  },
  {
    id: 'register_blend',
    name: '성구 전환',
    nameEn: 'Register Blending',
    difficulty: 4,
    category: 'advanced',
    measuredMetrics: ['pitchSmooth', 'jitter', 'hnr', 'maxBreaks'],
    measureMode: 'pitch_curve',
    defaultDuration: 30,
    iconName: 'register_blend',
  },
  {
    id: 'messa',
    name: '메사 디 보체',
    nameEn: 'Messa di Voce',
    difficulty: 5,
    category: 'advanced',
    measuredMetrics: ['dynamicRange', 'f0Deviation'],
    measureMode: 'dynamic_range',
    defaultDuration: 30,
    iconName: 'messa',
  },

  // ---- Breath Control (5) ----
  {
    id: 'breath_alloc',
    name: '호흡 분배',
    nameEn: 'Breath Allocation',
    difficulty: 2,
    category: 'breath',
    measuredMetrics: ['rmsCV', 'sustainedTime'],
    measureMode: 'rms_sustained',
    defaultDuration: 30,
    iconName: 'breath_alloc',
  },
  {
    id: 'sz_ratio',
    name: 'S/Z 비율',
    nameEn: 'S/Z Ratio',
    difficulty: 2,
    category: 'breath',
    measuredMetrics: ['szRatio'],
    measureMode: 'rms_sustained',
    defaultDuration: 30,
    iconName: 'sz_ratio',
  },
  {
    id: 'phrase_sim',
    name: '프레이즈 시뮬레이션',
    nameEn: 'Phrase Simulation',
    difficulty: 3,
    category: 'breath',
    measuredMetrics: ['rmsContour', 'sustainedTime'],
    measureMode: 'rms_sustained',
    defaultDuration: 40,
    iconName: 'phrase_sim',
  },
  {
    id: 'airflow_stable',
    name: '기류 안정성',
    nameEn: 'Airflow Stability',
    difficulty: 3,
    category: 'breath',
    measuredMetrics: ['rmsCV', 'sustainedTime'],
    measureMode: 'rms_sustained',
    defaultDuration: 30,
    iconName: 'airflow_stable',
  },
  {
    id: 'mpt',
    name: '최대 발성 시간',
    nameEn: 'Maximum Phonation Time',
    difficulty: 2,
    category: 'breath',
    measuredMetrics: ['sustainedTime', 'hnr'],
    measureMode: 'sustained',
    defaultDuration: 45,
    iconName: 'mpt',
  },
] as const;

/** All 22 exercise IDs in canonical order */
export const EXERCISE_IDS: readonly ExerciseId[] = EXERCISES.map((e) => e.id);

// Pre-build a lookup map for O(1) access
const META_MAP = new Map<ExerciseId, ExerciseMeta>(
  EXERCISES.map((e) => [e.id, e]),
);

/** Get metadata for a single exercise. Throws if id is unknown. */
export function getExerciseMeta(id: ExerciseId): ExerciseMeta {
  const meta = META_MAP.get(id);
  if (!meta) {
    throw new Error(`Unknown exercise id: ${id}`);
  }
  return meta;
}

// ============================================================
// Level-based Session Duration
// ============================================================
// Session duration uses a floor + linear ramp so even Lv.1 sessions
// feel like genuine training (minimum 2 minutes), scaling up to
// 6+ minutes at Lv.10.
//
// Timer-mode exercises (breathing) are excluded — they use their
// own cycle-based duration logic in training-session.tsx.
//
// Reference — vocal motor learning research:
//   5-15 min continuous practice per exercise is ideal.
//   2 min is the absolute minimum for proprioceptive feedback.

/** Minimum session duration in seconds for non-timer exercises */
const SESSION_FLOOR = 120; // 2 minutes

/** Additional seconds added per level above 1 */
const SESSION_STEP = 30;

/**
 * Get session duration (seconds) for an exercise at a given level.
 *
 * Lv.1: 120s (2 min)  — builds awareness
 * Lv.5: 240s (4 min)  — motor learning threshold
 * Lv.10: 390s (6.5 min) — sustained training
 *
 * Timer-mode exercises return defaultDuration unchanged.
 */
export function getSessionDuration(id: ExerciseId, level: number): number {
  const meta = getExerciseMeta(id);
  if (meta.measureMode === 'timer') return meta.defaultDuration;
  return SESSION_FLOOR + (Math.max(1, level) - 1) * SESSION_STEP;
}

/** Return all exercises matching the given category */
export function getExercisesByCategory(
  category: ExerciseMeta['category'],
): ExerciseMeta[] {
  return EXERCISES.filter((e) => e.category === category);
}

/** Get locale-aware exercise name via i18n */
export function getExerciseName(id: ExerciseId, locale: Locale): string {
  const t = createT(locale, 'training');
  return t(`exerciseNames.${id}`);
}
