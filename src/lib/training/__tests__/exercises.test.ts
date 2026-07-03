import { describe, it, expect } from 'vitest';
import type { ExerciseId } from '../types';
import {
  EXERCISES,
  EXERCISE_IDS,
  getExerciseMeta,
  getExercisesByCategory,
  getSessionDuration,
} from '../exercises';
import { getExerciseContent } from '../exercise-content';
import { toScore, scoreColor, freqToNote, formatDuration } from '../utils';

// All 22 canonical exercise IDs
const ALL_IDS: ExerciseId[] = [
  'breathing',
  'humming',
  'lip_trill',
  'breath_sustain',
  'straw',
  'yawn_sigh',
  'flow',
  'resonant',
  'vibrato',
  'basic_dynamic',
  'passaggio_sustain',
  'vowel_sustain',
  'vowel_transition',
  'vfe',
  'pitch_glide',
  'register_blend',
  'messa',
  'breath_alloc',
  'sz_ratio',
  'phrase_sim',
  'airflow_stable',
  'mpt',
];

// ============================================================
// Exercise Metadata
// ============================================================

describe('exercises metadata', () => {
  it('EXERCISE_IDS contains exactly 22 ids', () => {
    expect(EXERCISE_IDS).toHaveLength(22);
    expect(new Set(EXERCISE_IDS).size).toBe(22);
  });

  it('EXERCISES array contains exactly 22 entries', () => {
    expect(EXERCISES).toHaveLength(22);
  });

  it.each(ALL_IDS)('getExerciseMeta(%s) returns valid metadata', (id) => {
    const meta = getExerciseMeta(id);
    expect(meta).toBeDefined();
    expect(meta.id).toBe(id);
    expect(meta.name).toBeTruthy();
    expect(meta.nameEn).toBeTruthy();
    expect(meta.defaultDuration).toBeGreaterThan(0);
    expect(meta.iconName).toBeTruthy();
  });

  it.each(ALL_IDS)('difficulty of %s is in range 1-5', (id) => {
    const meta = getExerciseMeta(id);
    expect(meta.difficulty).toBeGreaterThanOrEqual(1);
    expect(meta.difficulty).toBeLessThanOrEqual(5);
  });

  it.each(ALL_IDS)('category of %s is valid', (id) => {
    const meta = getExerciseMeta(id);
    expect(['warmup', 'core', 'advanced', 'breath']).toContain(meta.category);
  });

  it('getExercisesByCategory("warmup") returns exactly warmup exercises', () => {
    const warmups = getExercisesByCategory('warmup');
    const warmupIds = warmups.map((e) => e.id);
    expect(warmupIds).toEqual(
      expect.arrayContaining(['breathing', 'humming', 'lip_trill', 'breath_sustain']),
    );
    expect(warmups).toHaveLength(4);
    warmups.forEach((e) => expect(e.category).toBe('warmup'));
  });

  it('getExercisesByCategory("core") returns exactly core exercises', () => {
    const cores = getExercisesByCategory('core');
    expect(cores).toHaveLength(9);
    cores.forEach((e) => expect(e.category).toBe('core'));
  });

  it('getExercisesByCategory("advanced") returns exactly advanced exercises', () => {
    const advanced = getExercisesByCategory('advanced');
    expect(advanced).toHaveLength(4);
    advanced.forEach((e) => expect(e.category).toBe('advanced'));
  });

  it('getExercisesByCategory("breath") returns exactly breath control exercises', () => {
    const breath = getExercisesByCategory('breath');
    expect(breath).toHaveLength(5);
    breath.forEach((e) => expect(e.category).toBe('breath'));
  });
});

// ============================================================
// Session Duration Scaling
// ============================================================

describe('getSessionDuration', () => {
  // Formula: SESSION_FLOOR(120) + (level - 1) * SESSION_STEP(30)

  it('returns 120s (2 min) at level 1 for non-timer exercises', () => {
    expect(getSessionDuration('humming', 1)).toBe(120);
    expect(getSessionDuration('straw', 1)).toBe(120);
    expect(getSessionDuration('vfe', 1)).toBe(120);
  });

  it('returns 240s (4 min) at level 5', () => {
    expect(getSessionDuration('humming', 5)).toBe(240);
  });

  it('returns 390s (6.5 min) at level 10', () => {
    expect(getSessionDuration('humming', 10)).toBe(390);
  });

  it('returns defaultDuration unchanged for timer-mode exercises', () => {
    const meta = getExerciseMeta('breathing');
    expect(meta.measureMode).toBe('timer');
    expect(getSessionDuration('breathing', 1)).toBe(meta.defaultDuration);
    expect(getSessionDuration('breathing', 10)).toBe(meta.defaultDuration);
  });

  it('is the same formula for all non-timer exercises regardless of defaultDuration', () => {
    // VFE has defaultDuration=60, humming=30, but getSessionDuration ignores it
    expect(getSessionDuration('vfe', 1)).toBe(getSessionDuration('humming', 1));
    expect(getSessionDuration('vfe', 5)).toBe(getSessionDuration('humming', 5));
  });

  it('is strictly monotonically increasing across levels for non-timer exercises', () => {
    for (const ex of EXERCISES) {
      if (ex.measureMode === 'timer') continue;
      let prev = 0;
      for (let lv = 1; lv <= 10; lv++) {
        const dur = getSessionDuration(ex.id, lv);
        expect(dur).toBeGreaterThan(prev);
        prev = dur;
      }
    }
  });

  it('minimum 120s ensures training feel even at level 1', () => {
    for (const ex of EXERCISES) {
      if (ex.measureMode === 'timer') continue;
      expect(getSessionDuration(ex.id, 1)).toBeGreaterThanOrEqual(120);
    }
  });
});

// ============================================================
// Exercise Content
// ============================================================

describe('exercise content', () => {
  it.each(ALL_IDS)('getExerciseContent(%s) returns valid content', (id) => {
    const content = getExerciseContent(id);
    expect(content).toBeDefined();
    expect(content.id).toBe(id);
    expect(content.description).toBeTruthy();
    expect(content.sensations.length).toBeGreaterThan(0);
    expect(content.soundDescription).toBeTruthy();
    expect(content.commonMistakes.length).toBeGreaterThan(0);
    content.commonMistakes.forEach((m) => {
      expect(m.mistake).toBeTruthy();
      expect(m.fix).toBeTruthy();
    });
  });
});

// ============================================================
// Utils — toScore
// ============================================================

describe('toScore', () => {
  it('returns 100 when value equals best', () => {
    expect(toScore(0, 0, 10)).toBe(100);
  });

  it('returns 0 when value equals worst', () => {
    expect(toScore(10, 0, 10)).toBe(0);
  });

  it('returns 50 at midpoint', () => {
    expect(toScore(5, 0, 10)).toBe(50);
  });

  it('clamps to 0 when value exceeds worst', () => {
    expect(toScore(20, 0, 10)).toBe(0);
  });

  it('clamps to 100 when value exceeds best', () => {
    expect(toScore(-5, 0, 10)).toBe(100);
  });

  it('handles inverse mode (lower value = higher score)', () => {
    // inverse: value 0 is best, value 10 is worst
    expect(toScore(0, 0, 10, true)).toBe(100);
    expect(toScore(10, 0, 10, true)).toBe(0);
    expect(toScore(5, 0, 10, true)).toBe(50);
  });

  it('returns 0 when best equals worst (degenerate)', () => {
    expect(toScore(5, 5, 5)).toBe(0);
  });
});

// ============================================================
// Utils — scoreColor
// ============================================================

describe('scoreColor', () => {
  it('returns fail color for scores < 40', () => {
    expect(scoreColor(0)).toBe('oklch(0.65 0.2 25)');
    expect(scoreColor(39)).toBe('oklch(0.65 0.2 25)');
  });

  it('returns warn color for scores 40-69', () => {
    expect(scoreColor(40)).toBe('oklch(0.65 0.12 70)');
    expect(scoreColor(69)).toBe('oklch(0.65 0.12 70)');
  });

  it('returns success color for scores >= 70', () => {
    expect(scoreColor(70)).toBe('oklch(0.72 0.19 145)');
    expect(scoreColor(100)).toBe('oklch(0.72 0.19 145)');
  });
});

// ============================================================
// Utils — freqToNote
// ============================================================

describe('freqToNote', () => {
  it('converts 440 Hz to A4', () => {
    expect(freqToNote(440)).toBe('A4');
  });

  it('converts 880 Hz to A5', () => {
    expect(freqToNote(880)).toBe('A5');
  });

  it('returns -- for non-positive frequency', () => {
    expect(freqToNote(0)).toBe('--');
    expect(freqToNote(-100)).toBe('--');
  });

  it('returns -- for non-finite frequency', () => {
    expect(freqToNote(Infinity)).toBe('--');
    expect(freqToNote(-Infinity)).toBe('--');
    expect(freqToNote(NaN)).toBe('--');
  });
});

// ============================================================
// Utils — formatDuration
// ============================================================

describe('formatDuration', () => {
  it('formats 0 seconds to 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats 65 seconds to 1:05', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('returns 0:00 for negative seconds', () => {
    expect(formatDuration(-10)).toBe('0:00');
  });

  it('returns 0:00 for non-finite seconds', () => {
    expect(formatDuration(Infinity)).toBe('0:00');
    expect(formatDuration(-Infinity)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
  });
});
