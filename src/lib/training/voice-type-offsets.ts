// ============================================================
// Voice-Type Normalization — Offset Table & Criteria Adjuster
// ============================================================
// Adjusts training level criteria based on the user's voice type
// (Bass/Baritone/Tenor/Alto/Mezzo-Soprano/Soprano).
//
// Clinical basis: male voices naturally exhibit higher jitter/shimmer
// and lower HNR due to larger vocal fold mass and wider glottal gap.
// Tenor/Alto are the zero baseline (current criteria were implicitly
// calibrated for mid-range voices).

import type { ExerciseId, LevelCriteria, VFELevelCriteria } from './types';
import { getLevelCriteria, getVFELevelCriteria } from './level-criteria';

// ============================================================
// Types
// ============================================================

export type VoiceType =
  | 'Bass'
  | 'Baritone'
  | 'Tenor'
  | 'Alto'
  | 'Mezzo-Soprano'
  | 'Soprano';

interface VoiceTypeOffset {
  /** Added to jitterMax (positive = more lenient for low voices) */
  jitterMax: number;
  /** Added to shimmerMax (positive = more lenient) */
  shimmerMax: number;
  /** Added to hnrMin (negative = more lenient for low voices) */
  hnrMin: number;
  /** Multiplier for f0StdMax (>1 = more lenient for high voices) */
  f0StdScale: number;
  /** Added to duration (positive = more lenient for large lung capacity) */
  duration: number;
}

// ============================================================
// Offset Table
// ============================================================

const VOICE_TYPE_OFFSETS: Record<VoiceType, VoiceTypeOffset> = {
  Bass:             { jitterMax: 0.17,  shimmerMax: 0.46,  hnrMin: -4, f0StdScale: 1.0, duration: 1   },
  Baritone:         { jitterMax: 0.08,  shimmerMax: 0.23,  hnrMin: -2, f0StdScale: 1.0, duration: 0.5 },
  Tenor:            { jitterMax: 0,     shimmerMax: 0,     hnrMin: 0,  f0StdScale: 1.0, duration: 0   },
  Alto:             { jitterMax: 0,     shimmerMax: 0,     hnrMin: 0,  f0StdScale: 1.0, duration: 0   },
  'Mezzo-Soprano':  { jitterMax: -0.04, shimmerMax: -0.08, hnrMin: 1,  f0StdScale: 1.0, duration: -0.5 },
  Soprano:          { jitterMax: -0.04, shimmerMax: -0.15, hnrMin: 2,  f0StdScale: 1.1, duration: -1  },
};

// ============================================================
// Clamp Constants
// ============================================================

const MIN_JITTER = 0.17;
const MIN_SHIMMER = 0.61;
const MIN_HNR = 3;
const MIN_F0_STD = 1.0;
const MIN_DURATION = 2;

// ============================================================
// Core: Apply offsets to a single LevelCriteria
// ============================================================

function applyOffsets(
  base: LevelCriteria,
  offset: VoiceTypeOffset,
): LevelCriteria {
  const result = { ...base };

  if (result.jitterMax !== undefined) {
    result.jitterMax = Math.max(MIN_JITTER, result.jitterMax + offset.jitterMax);
  }
  if (result.shimmerMax !== undefined) {
    result.shimmerMax = Math.max(MIN_SHIMMER, result.shimmerMax + offset.shimmerMax);
  }
  if (result.hnrMin !== undefined) {
    result.hnrMin = Math.max(MIN_HNR, result.hnrMin + offset.hnrMin);
  }
  if (result.f0StdMax !== undefined) {
    result.f0StdMax = Math.max(MIN_F0_STD, result.f0StdMax * offset.f0StdScale);
  }
  result.duration = Math.max(MIN_DURATION, result.duration + offset.duration);

  return result;
}

// ============================================================
// Public API
// ============================================================

/**
 * Get level criteria normalized for a voice type.
 * If voiceType is null, returns the base criteria unchanged.
 */
export function getNormalizedCriteria(
  exerciseId: ExerciseId,
  level: number,
  voiceType: VoiceType | null,
): LevelCriteria {
  const base = getLevelCriteria(exerciseId, level);
  if (!voiceType) return base;
  return applyOffsets(base, VOICE_TYPE_OFFSETS[voiceType]);
}

/**
 * Get VFE 4-part criteria normalized for a voice type.
 * Offsets only apply to sub-exercises A and D (sustained tone).
 * B and C (pitch smoothness, range, breaks) are voice-type independent.
 */
export function getNormalizedVFECriteria(
  level: number,
  voiceType: VoiceType | null,
): VFELevelCriteria {
  const base = getVFELevelCriteria(level);
  if (!voiceType) return base;

  const offset = VOICE_TYPE_OFFSETS[voiceType];
  return {
    a: applyOffsets(base.a, offset),
    b: base.b,
    c: base.c,
    d: applyOffsets(base.d, offset),
  };
}

// ============================================================
// Voice Check Score Normalization
// ============================================================

export interface VoiceCheckParams {
  jitterBest: number;
  jitterWorst: number;
  shimmerBest: number;
  shimmerWorst: number;
  hnrBest: number;
  hnrWorst: number;
}

// Praat 정상 상한 기준 (PPQ5 1.04%, APQ3+RMS 3.81%)
const VOICE_CHECK_PARAMS: Record<VoiceType, VoiceCheckParams> = {
  Bass:            { jitterBest: 0.15, jitterWorst: 1.33, shimmerBest: 0.76, shimmerWorst: 4.57, hnrBest: 21, hnrWorst: 3   },
  Baritone:        { jitterBest: 0.08, jitterWorst: 1.16, shimmerBest: 0.61, shimmerWorst: 4.19, hnrBest: 23, hnrWorst: 4   },
  Tenor:           { jitterBest: 0.06, jitterWorst: 1.04, shimmerBest: 0.53, shimmerWorst: 3.81, hnrBest: 25, hnrWorst: 5   },
  Alto:            { jitterBest: 0.06, jitterWorst: 1.04, shimmerBest: 0.53, shimmerWorst: 3.81, hnrBest: 25, hnrWorst: 5   },
  'Mezzo-Soprano': { jitterBest: 0.04, jitterWorst: 0.96, shimmerBest: 0.46, shimmerWorst: 3.43, hnrBest: 26, hnrWorst: 5.5 },
  Soprano:         { jitterBest: 0.03, jitterWorst: 0.83, shimmerBest: 0.38, shimmerWorst: 3.05, hnrBest: 27, hnrWorst: 6   },
};

// Praat 정상 상한 기준 (Tenor/Alto 기본)
const DEFAULT_VOICE_CHECK_PARAMS: VoiceCheckParams = {
  jitterBest: 0.06,
  jitterWorst: 1.04,
  shimmerBest: 0.53,
  shimmerWorst: 3.81,
  hnrBest: 25,
  hnrWorst: 5,
};

/**
 * Get voice-check scoring params normalized for a voice type.
 * If voiceType is null, returns the default (Tenor/Alto) params.
 */
export function getNormalizedVoiceCheckParams(
  voiceType: VoiceType | null,
): VoiceCheckParams {
  if (!voiceType) return DEFAULT_VOICE_CHECK_PARAMS;
  return VOICE_CHECK_PARAMS[voiceType];
}

// Export the offset table for testing
export { VOICE_TYPE_OFFSETS };
