import { describe, it, expect } from 'vitest';
import type { ExerciseId } from '../types';
import {
  getLevelCriteria,
  getVFELevelCriteria,
  getLevelDescription,
  getAllLevelCriteria,
} from '../level-criteria';

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

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// Exercises that use jitterMax (monotonically decreasing at higher levels)
const JITTER_EXERCISES: ExerciseId[] = [
  'humming',
  'lip_trill',
  'breath_sustain',
  'straw',
  'flow',
  'resonant',
  'passaggio_sustain',
  'vowel_sustain',
  'vowel_transition',
  'register_blend',
];

// Exercises that use hnrMin (monotonically increasing at higher levels)
const HNR_EXERCISES: ExerciseId[] = [
  'humming',
  'lip_trill',
  'breath_sustain',
  'straw',
  'yawn_sigh',
  'flow',
  'resonant',
  'messa',
  'mpt',
  'passaggio_sustain',
  'vowel_sustain',
  'vowel_transition',
  'register_blend',
];

// ============================================================
// Completeness: All 22 exercises × 10 levels = 220 entries
// ============================================================

describe('level criteria completeness', () => {
  it.each(ALL_IDS)(
    '%s has criteria defined for all 10 levels',
    (exerciseId) => {
      const all = getAllLevelCriteria(exerciseId);
      expect(all).toHaveLength(10);
      for (const level of LEVELS) {
        const criteria = getLevelCriteria(exerciseId, level);
        expect(criteria).toBeDefined();
        expect(criteria.duration).toBeGreaterThan(0);
      }
    },
  );

  it('total of 220 level criteria exist (22 exercises × 10 levels)', () => {
    let count = 0;
    for (const id of ALL_IDS) {
      for (const level of LEVELS) {
        const criteria = getLevelCriteria(id, level);
        expect(criteria).toBeDefined();
        count++;
      }
    }
    expect(count).toBe(220);
  });
});

// ============================================================
// Monotonic ordering: duration increases per exercise
// ============================================================

describe('duration monotonically increases', () => {
  it.each(ALL_IDS)(
    '%s: Lv.1 duration ≤ Lv.2 ≤ ... ≤ Lv.10',
    (exerciseId) => {
      for (let i = 1; i < 10; i++) {
        const lower = getLevelCriteria(exerciseId, i);
        const higher = getLevelCriteria(exerciseId, i + 1);
        expect(higher.duration).toBeGreaterThanOrEqual(lower.duration);
      }
    },
  );
});

// ============================================================
// Monotonic ordering: jitterMax decreases (stricter at higher levels)
// ============================================================

describe('jitterMax monotonically decreases', () => {
  it.each(JITTER_EXERCISES)(
    '%s: jitterMax is non-increasing across levels where defined',
    (exerciseId) => {
      const criteria = LEVELS.map((l) => getLevelCriteria(exerciseId, l));
      const withJitter = criteria.filter((c) => c.jitterMax !== undefined);
      for (let i = 0; i < withJitter.length - 1; i++) {
        expect(withJitter[i + 1].jitterMax!).toBeLessThanOrEqual(
          withJitter[i].jitterMax!,
        );
      }
    },
  );
});

// ============================================================
// Monotonic ordering: hnrMin increases (stricter at higher levels)
// ============================================================

describe('hnrMin monotonically increases', () => {
  it.each(HNR_EXERCISES)(
    '%s: hnrMin is non-decreasing across levels where defined',
    (exerciseId) => {
      const criteria = LEVELS.map((l) => getLevelCriteria(exerciseId, l));
      const withHnr = criteria.filter((c) => c.hnrMin !== undefined);
      for (let i = 0; i < withHnr.length - 1; i++) {
        expect(withHnr[i + 1].hnrMin!).toBeGreaterThanOrEqual(
          withHnr[i].hnrMin!,
        );
      }
    },
  );
});

// ============================================================
// VFE: 4-part structure at all 10 levels
// ============================================================

describe('VFE level criteria', () => {
  it.each(LEVELS)(
    'VFE Lv.%d has 4 sub-criteria (a, b, c, d)',
    (level) => {
      const vfe = getVFELevelCriteria(level);
      expect(vfe).toBeDefined();
      expect(vfe.a).toBeDefined();
      expect(vfe.b).toBeDefined();
      expect(vfe.c).toBeDefined();
      expect(vfe.d).toBeDefined();
    },
  );

  it('VFE sub-a duration increases across levels', () => {
    for (let i = 1; i < 10; i++) {
      const lower = getVFELevelCriteria(i);
      const higher = getVFELevelCriteria(i + 1);
      expect(higher.a.duration).toBeGreaterThanOrEqual(lower.a.duration);
    }
  });

  it('VFE sub-d duration increases across levels', () => {
    for (let i = 1; i < 10; i++) {
      const lower = getVFELevelCriteria(i);
      const higher = getVFELevelCriteria(i + 1);
      expect(higher.d.duration).toBeGreaterThanOrEqual(lower.d.duration);
    }
  });

  it('VFE sub-b maxBreaks is non-increasing where defined', () => {
    const bCriteria = LEVELS.map((l) => getVFELevelCriteria(l).b);
    const withBreaks = bCriteria.filter((b) => b.maxBreaks !== undefined);
    for (let i = 0; i < withBreaks.length - 1; i++) {
      expect(withBreaks[i + 1].maxBreaks!).toBeLessThanOrEqual(
        withBreaks[i].maxBreaks!,
      );
    }
  });

  it('VFE sub-c maxBreaks is non-increasing where defined', () => {
    const cCriteria = LEVELS.map((l) => getVFELevelCriteria(l).c);
    const withBreaks = cCriteria.filter((c) => c.maxBreaks !== undefined);
    for (let i = 0; i < withBreaks.length - 1; i++) {
      expect(withBreaks[i + 1].maxBreaks!).toBeLessThanOrEqual(
        withBreaks[i].maxBreaks!,
      );
    }
  });
});

// ============================================================
// getLevelCriteria returns correct values for specific exercises
// ============================================================

describe('getLevelCriteria specific values', () => {
  it('breathing Lv.1 = 20s (timer only, no DSP)', () => {
    const c = getLevelCriteria('breathing', 1);
    expect(c.duration).toBe(20);
    expect(c.jitterMax).toBeUndefined();
    expect(c.hnrMin).toBeUndefined();
  });

  it('breathing Lv.5 = 60s (timer only)', () => {
    const c = getLevelCriteria('breathing', 5);
    expect(c.duration).toBe(60);
  });

  it('humming Lv.3 = 5s, jitterMax 1.9, hnrMin 5', () => {
    const c = getLevelCriteria('humming', 3);
    expect(c.duration).toBe(5);
    expect(c.jitterMax).toBe(1.9);
    expect(c.hnrMin).toBe(5);
  });

  it('lip_trill Lv.2 jitterMax is higher than humming (trill relaxation)', () => {
    const trill = getLevelCriteria('lip_trill', 2);
    expect(trill.jitterMax).toBe(1.25);
  });

  it('pitch_glide Lv.5 = rangeOctaves 1.0, pitchSmooth 70, maxBreaks 2', () => {
    const c = getLevelCriteria('pitch_glide', 5);
    expect(c.rangeOctaves).toBe(1.0);
    expect(c.pitchSmooth).toBe(70);
    expect(c.maxBreaks).toBe(2);
  });

  it('messa Lv.1 = duration 6, f0DeviationMax 18, dynamicRange 5', () => {
    const c = getLevelCriteria('messa', 1);
    expect(c.duration).toBe(6);
    expect(c.f0DeviationMax).toBe(18);
    expect(c.dynamicRange).toBe(5);
  });
});

// ============================================================
// getLevelDescription returns Korean strings
// ============================================================

describe('getLevelDescription', () => {
  it.each(ALL_IDS)(
    '%s: all level descriptions are non-empty Korean strings',
    (exerciseId) => {
      for (const level of LEVELS) {
        const desc = getLevelDescription(exerciseId, level);
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      }
    },
  );
});

// ============================================================
// Edge case: invalid level throws
// ============================================================

describe('edge cases', () => {
  it('throws for level 0', () => {
    expect(() => getLevelCriteria('breathing', 0)).toThrow();
  });

  it('throws for level 11', () => {
    expect(() => getLevelCriteria('breathing', 11)).toThrow();
  });

  it('getVFELevelCriteria throws for level 0', () => {
    expect(() => getVFELevelCriteria(0)).toThrow();
  });
});

// ============================================================
// New exercises: breath_sustain, vibrato, basic_dynamic
// ============================================================

describe('breath_sustain level criteria', () => {
  it('Lv.1 = 5s duration only', () => {
    const c = getLevelCriteria('breath_sustain', 1);
    expect(c.duration).toBe(5);
    expect(c.hnrMin).toBeUndefined();
  });

  it('Lv.5 = 12s + hnrMin 12', () => {
    const c = getLevelCriteria('breath_sustain', 5);
    expect(c.duration).toBe(12);
    expect(c.hnrMin).toBe(12);
    expect(c.jitterMax).toBeUndefined();
  });

  it('duration monotonically increases', () => {
    for (let i = 1; i < 10; i++) {
      const lower = getLevelCriteria('breath_sustain', i);
      const higher = getLevelCriteria('breath_sustain', i + 1);
      expect(higher.duration).toBeGreaterThan(lower.duration);
    }
  });
});

describe('vibrato level criteria', () => {
  it('Lv.1 has wide vibrato rate range (4.0-10Hz)', () => {
    const c = getLevelCriteria('vibrato', 1);
    expect(c.vibratoRateMin).toBe(4.0);
    expect(c.vibratoRateMax).toBe(10);
    expect(c.vibratoExtentMin).toBe(20);
  });

  it('Lv.5 has narrower vibrato rate range (4.5-7.5Hz) + periodicity', () => {
    const c = getLevelCriteria('vibrato', 5);
    expect(c.vibratoRateMin).toBe(4.5);
    expect(c.vibratoRateMax).toBe(7.5);
    expect(c.vibratoPeriodicity).toBe(0.45);
  });

  it('vibrato rate range narrows at higher levels', () => {
    const lv1 = getLevelCriteria('vibrato', 1);
    const lv10 = getLevelCriteria('vibrato', 10);
    const range1 = lv1.vibratoRateMax! - lv1.vibratoRateMin!;
    const range10 = lv10.vibratoRateMax! - lv10.vibratoRateMin!;
    expect(range10).toBeLessThan(range1);
  });
});

describe('basic_dynamic level criteria', () => {
  it('Lv.1 = 4s, dynamicRange 5dB', () => {
    const c = getLevelCriteria('basic_dynamic', 1);
    expect(c.duration).toBe(4);
    expect(c.dynamicRange).toBe(5);
  });

  it('Lv.5 = 8s, dynamicRange 10dB, f0DeviationMax 12Hz', () => {
    const c = getLevelCriteria('basic_dynamic', 5);
    expect(c.duration).toBe(8);
    expect(c.dynamicRange).toBe(10);
    expect(c.f0DeviationMax).toBe(12);
  });

  it('dynamicRange monotonically increases', () => {
    for (let i = 1; i < 10; i++) {
      const lower = getLevelCriteria('basic_dynamic', i);
      const higher = getLevelCriteria('basic_dynamic', i + 1);
      expect(higher.dynamicRange!).toBeGreaterThan(lower.dynamicRange!);
    }
  });

  it('f0DeviationMax monotonically decreases where defined', () => {
    const criteria = [3, 4, 5, 6, 7, 8, 9, 10].map(l => getLevelCriteria('basic_dynamic', l));
    for (let i = 0; i < criteria.length - 1; i++) {
      expect(criteria[i + 1].f0DeviationMax!).toBeLessThanOrEqual(criteria[i].f0DeviationMax!);
    }
  });
});

describe('vibrato L1 safety', () => {
  it('vibrato L1 vibratoRateMin is at least 4.0 (not pathological tremor range)', () => {
    const criteria = getLevelCriteria('vibrato', 1);
    expect(criteria.vibratoRateMin).toBeGreaterThanOrEqual(4.0);
  });
});
