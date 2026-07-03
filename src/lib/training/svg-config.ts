// ============================================================
// Training Feature — Per-Exercise SVG Animation Configuration
// ============================================================

import type { ExerciseId } from './types';

export interface SvgAnimConfig {
  exerciseId: ExerciseId;
  particleCount: number;
  colorMetric: 'hnr' | 'jitter' | 'composite';
  description: string;
}

/** SVG animation configuration for each of the 18 exercises. */
export const SVG_CONFIGS: Record<ExerciseId, SvgAnimConfig> = {
  breathing: {
    exerciseId: 'breathing',
    particleCount: 0,
    colorMetric: 'hnr', // timer-driven, no color metric used in practice
    description: 'Timer-driven breathing circle — inhale/exhale animation',
  },
  humming: {
    exerciseId: 'humming',
    particleCount: 0, // uses ripples instead
    colorMetric: 'hnr',
    description: 'Concentric ripples expanding from center',
  },
  lip_trill: {
    exerciseId: 'lip_trill',
    particleCount: 10,
    colorMetric: 'hnr',
    description: 'Vibrating lip particle burst',
  },
  breath_sustain: {
    exerciseId: 'breath_sustain',
    particleCount: 0,
    colorMetric: 'hnr',
    description: 'Expanding breath ring — sustained phonation visualization',
  },
  straw: {
    exerciseId: 'straw',
    particleCount: 25,
    colorMetric: 'hnr',
    description: 'Rising bubbles through straw visualization',
  },
  yawn_sigh: {
    exerciseId: 'yawn_sigh',
    particleCount: 0,
    colorMetric: 'hnr',
    description: 'Descending wave arc — yawn-to-sigh transition',
  },
  flow: {
    exerciseId: 'flow',
    particleCount: 40,
    colorMetric: 'hnr',
    description: 'Flowing particle stream visualization',
  },
  resonant: {
    exerciseId: 'resonant',
    particleCount: 0,
    colorMetric: 'hnr',
    description: 'Resonance rings with harmonic overtones',
  },
  vibrato: {
    exerciseId: 'vibrato',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Oscillating ring — vibrato rate and extent visualization',
  },
  basic_dynamic: {
    exerciseId: 'basic_dynamic',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Volume arc — crescendo/decrescendo amplitude envelope',
  },
  vfe: {
    exerciseId: 'vfe',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'VFE multi-task composite score indicator',
  },
  pitch_glide: {
    exerciseId: 'pitch_glide',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Pitch path curve with real-time tracking',
  },
  messa: {
    exerciseId: 'messa',
    particleCount: 0, // uses waveform points
    colorMetric: 'composite',
    description: 'Waveform amplitude envelope — crescendo/decrescendo',
  },
  breath_alloc: {
    exerciseId: 'breath_alloc',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Vertical breath gauge — consistent airflow visualization',
  },
  sz_ratio: {
    exerciseId: 'sz_ratio',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Vertical breath gauge — S/Z ratio visualization',
  },
  phrase_sim: {
    exerciseId: 'phrase_sim',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Vertical breath gauge — phrase pattern visualization',
  },
  airflow_stable: {
    exerciseId: 'airflow_stable',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Vertical breath gauge — airflow stability visualization',
  },
  mpt: {
    exerciseId: 'mpt',
    particleCount: 0,
    colorMetric: 'hnr',
    description: 'Vertical breath gauge — maximum phonation time visualization',
  },
  register_blend: {
    exerciseId: 'register_blend',
    particleCount: 0,
    colorMetric: 'composite',
    description: 'Spectrum bridge — chest(amber) to head(blue) with quality-driven brightness',
  },
  passaggio_sustain: {
    exerciseId: 'passaggio_sustain',
    particleCount: 0,
    colorMetric: 'hnr',
    description: 'Tightrope balance — walker stability driven by F0 deviation and HNR',
  },
  vowel_sustain: {
    exerciseId: 'vowel_sustain',
    particleCount: 0,
    colorMetric: 'hnr',
    description: 'Resonance rings — concentric expanding rings with HNR-driven fill opacity',
  },
  vowel_transition: {
    exerciseId: 'vowel_transition',
    particleCount: 0,
    colorMetric: 'hnr',
    description: 'Morphing vowel shape — 5 vowel forms cycling with F0 stability controlling smoothness',
  },
};
