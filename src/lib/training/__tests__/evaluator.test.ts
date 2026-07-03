import { describe, it, expect } from 'vitest';
import { evaluateSession, evaluateVFESession } from '../evaluator';
import type { SessionMetrics } from '../types';

// ============================================================
// Helper: create a default SessionMetrics with overrides
// ============================================================

function makeMetrics(overrides: Partial<SessionMetrics> = {}): SessionMetrics {
  return {
    duration: 10,
    jitterValues: [1.0, 1.0, 1.0, 1.0, 1.0],
    shimmerValues: [2.0, 2.0, 2.0, 2.0, 2.0],
    hnrValues: [20, 20, 20, 20, 20],
    f0Values: [200, 200, 200, 200, 200],
    rmsValues: [0.5, 0.5, 0.5, 0.5, 0.5],
    isVoicedValues: [true, true, true, true, true],
    ...overrides,
  };
}

// ============================================================
// evaluateSession — humming
// ============================================================

describe('evaluateSession — humming', () => {
  it('Lv.1: metrics meeting all criteria → passed=true', () => {
    // Humming Lv.1 only requires duration >= 3s
    // We provide voiced frames that yield sustained duration >= 3s
    const metrics = makeMetrics({
      duration: 5,
      isVoicedValues: Array.from({ length: 50 }, () => true),
      f0Values: Array.from({ length: 50 }, () => 200),
      jitterValues: Array.from({ length: 50 }, () => 1.0),
      shimmerValues: Array.from({ length: 50 }, () => 2.0),
      hnrValues: Array.from({ length: 50 }, () => 20),
      rmsValues: Array.from({ length: 50 }, () => 0.5),
    });

    const result = evaluateSession('humming', 1, metrics);
    expect(result.passed).toBe(true);
    expect(result.results.every((r) => r.passed)).toBe(true);
  });

  it('Lv.2: jitter=4 (above max 1.08) → passed=false, jitter criterion failed', () => {
    // Humming Lv.2: duration=4, jitterMax=1.08
    const metrics = makeMetrics({
      duration: 10,
      isVoicedValues: Array.from({ length: 100 }, () => true),
      f0Values: Array.from({ length: 100 }, () => 200),
      jitterValues: Array.from({ length: 100 }, () => 4.0), // exceeds 1.08
      shimmerValues: Array.from({ length: 100 }, () => 2.0),
      hnrValues: Array.from({ length: 100 }, () => 15),
      rmsValues: Array.from({ length: 100 }, () => 0.5),
    });

    const result = evaluateSession('humming', 2, metrics);
    expect(result.passed).toBe(false);

    const jitterCriterion = result.results.find((r) => r.name === 'jitterMax');
    expect(jitterCriterion).toBeDefined();
    expect(jitterCriterion!.passed).toBe(false);
    expect(jitterCriterion!.actual).toBeCloseTo(4.0, 0);
  });
});

// ============================================================
// evaluateSession — breathing (timer-only)
// ============================================================

describe('evaluateSession — breathing', () => {
  it('timer mode: only duration criterion is checked', () => {
    // Breathing Lv.1: duration=36
    const metrics = makeMetrics({ duration: 40 });

    const result = evaluateSession('breathing', 1, metrics);
    expect(result.passed).toBe(true);
    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe('duration');
    expect(result.results[0].passed).toBe(true);
  });

  it('timer mode: duration below target → fails', () => {
    const metrics = makeMetrics({ duration: 15 });

    const result = evaluateSession('breathing', 1, metrics);
    expect(result.passed).toBe(false);
    expect(result.results[0].name).toBe('duration');
    expect(result.results[0].passed).toBe(false);
  });
});

// ============================================================
// evaluateSession — empty/silent session
// ============================================================

describe('evaluateSession — empty/silent session', () => {
  it('all zeros → passed=false', () => {
    const metrics: SessionMetrics = {
      duration: 0,
      jitterValues: [],
      shimmerValues: [],
      hnrValues: [],
      f0Values: [],
      rmsValues: [],
      isVoicedValues: [],
    };

    const result = evaluateSession('humming', 1, metrics);
    expect(result.passed).toBe(false);
  });
});

// ============================================================
// evaluateSession — boundary: exactly meeting criteria
// ============================================================

describe('evaluateSession — boundary values', () => {
  it('exactly meeting criteria → passed=true', () => {
    // Humming Lv.2: duration=4, jitterMax=1.08
    // Provide exactly 40 voiced frames (40 * 100ms = 4.0s) with jitter exactly 1.08
    const metrics = makeMetrics({
      duration: 4,
      isVoicedValues: Array.from({ length: 40 }, () => true),
      f0Values: Array.from({ length: 40 }, () => 200),
      jitterValues: Array.from({ length: 40 }, () => 1.08),
      shimmerValues: Array.from({ length: 40 }, () => 2.0),
      hnrValues: Array.from({ length: 40 }, () => 10),
      rmsValues: Array.from({ length: 40 }, () => 0.5),
    });

    const result = evaluateSession('humming', 2, metrics);
    expect(result.passed).toBe(true);
  });
});

// ============================================================
// evaluateSession — advanced exercises
// ============================================================

describe('evaluateSession — messa di voce', () => {
  it('Lv.1: meets f0DeviationMax and dynamicRange → passed=true', () => {
    // Messa Lv.1: duration=6, f0DeviationMax=15, dynamicRange=6
    const metrics = makeMetrics({
      duration: 8,
      isVoicedValues: Array.from({ length: 80 }, () => true),
      // Stable F0 with small deviation (< 15 Hz)
      f0Values: Array.from({ length: 80 }, (_, i) => 200 + (i % 3) * 2),
      jitterValues: Array.from({ length: 80 }, () => 1.0),
      shimmerValues: Array.from({ length: 80 }, () => 2.0),
      hnrValues: Array.from({ length: 80 }, () => 20),
      // Wide dynamic range: 0.01 to 0.1 → 20 dB (well above 6)
      rmsValues: [
        ...Array.from({ length: 20 }, () => 0.01),
        ...Array.from({ length: 40 }, () => 0.1),
        ...Array.from({ length: 20 }, () => 0.01),
      ],
    });

    const result = evaluateSession('messa', 1, metrics);
    expect(result.passed).toBe(true);
  });
});

describe('evaluateSession — pitch_glide', () => {
  it('Lv.1: meets rangeOctaves and maxBreaks → passed=true', () => {
    // Pitch Glide Lv.1: duration=3, rangeOctaves=0.6, maxBreaks=5
    // Smooth ramp from 200 to 310 Hz ≈ 0.63 octaves
    const f0 = Array.from({ length: 50 }, (_, i) => 200 + i * (110 / 49));
    const metrics = makeMetrics({
      duration: 5,
      isVoicedValues: Array.from({ length: 50 }, () => true),
      f0Values: f0,
      jitterValues: Array.from({ length: 50 }, () => 1.0),
      shimmerValues: Array.from({ length: 50 }, () => 2.0),
      hnrValues: Array.from({ length: 50 }, () => 20),
      rmsValues: Array.from({ length: 50 }, () => 0.5),
    });

    const result = evaluateSession('pitch_glide', 1, metrics);
    expect(result.passed).toBe(true);
  });
});

// ============================================================
// evaluateVFESession
// ============================================================

// ============================================================
// evaluateSession — breath_sustain
// ============================================================

describe('evaluateSession — breath_sustain', () => {
  it('Lv.1: sustained voice >= 5s → passed=true', () => {
    const metrics = makeMetrics({
      duration: 8,
      isVoicedValues: Array.from({ length: 80 }, () => true),
      f0Values: Array.from({ length: 80 }, () => 180),
      jitterValues: Array.from({ length: 80 }, () => 1.0),
      shimmerValues: Array.from({ length: 80 }, () => 2.0),
      hnrValues: Array.from({ length: 80 }, () => 18),
      rmsValues: Array.from({ length: 80 }, () => 0.3),
    });
    const result = evaluateSession('breath_sustain', 1, metrics);
    expect(result.passed).toBe(true);
  });

  it('Lv.1: sustained voice < 5s → passed=false', () => {
    // 24 frames × 200ms accumulation interval = 4.8s < 5s threshold
    const metrics = makeMetrics({
      duration: 3,
      isVoicedValues: Array.from({ length: 24 }, () => true),
      f0Values: Array.from({ length: 24 }, () => 180),
      jitterValues: Array.from({ length: 24 }, () => 1.0),
      shimmerValues: Array.from({ length: 24 }, () => 2.0),
      hnrValues: Array.from({ length: 24 }, () => 18),
      rmsValues: Array.from({ length: 24 }, () => 0.3),
    });
    const result = evaluateSession('breath_sustain', 1, metrics);
    expect(result.passed).toBe(false);
  });
});

// ============================================================
// evaluateSession — basic_dynamic
// ============================================================

describe('evaluateSession — basic_dynamic', () => {
  it('Lv.1: meets dynamicRange >= 6dB → passed=true', () => {
    const metrics = makeMetrics({
      duration: 6,
      isVoicedValues: Array.from({ length: 60 }, () => true),
      f0Values: Array.from({ length: 60 }, () => 200),
      jitterValues: Array.from({ length: 60 }, () => 1.0),
      shimmerValues: Array.from({ length: 60 }, () => 2.0),
      hnrValues: Array.from({ length: 60 }, () => 20),
      // Wide dynamic range: 0.01 → 0.1 = 20dB
      rmsValues: [
        ...Array.from({ length: 30 }, () => 0.01),
        ...Array.from({ length: 30 }, () => 0.1),
      ],
    });
    const result = evaluateSession('basic_dynamic', 1, metrics);
    expect(result.passed).toBe(true);
  });
});

// ============================================================
// evaluateSession — vibrato
// ============================================================

describe('evaluateSession — vibrato', () => {
  it('Lv.1: vibrato detected in range → passed=true', () => {
    // Vibrato mode uses f0Values[0]=rate, rmsValues[0]=extent, shimmerValues[0]=periodicity
    const metrics = makeMetrics({
      duration: 5,
      isVoicedValues: Array.from({ length: 50 }, () => true),
      f0Values: [5.5],       // 5.5 Hz rate (within 3-9)
      rmsValues: [60],       // 60 cents extent (>= 30)
      shimmerValues: [0.6],  // periodicity
      hnrValues: [20],
    });
    const result = evaluateSession('vibrato', 1, metrics);
    // Check vibrato criteria passed
    const rateCrit = result.results.find(r => r.name === 'vibratoRate');
    const extentCrit = result.results.find(r => r.name === 'vibratoExtent');
    expect(rateCrit?.passed).toBe(true);
    expect(extentCrit?.passed).toBe(true);
  });

  it('Lv.1: vibrato rate out of range → vibratoRate fails', () => {
    const metrics = makeMetrics({
      duration: 5,
      isVoicedValues: Array.from({ length: 50 }, () => true),
      f0Values: [2.0],       // 2 Hz — below min 3
      rmsValues: [60],
      shimmerValues: [0.6],
      hnrValues: [20],
    });
    const result = evaluateSession('vibrato', 1, metrics);
    const rateCrit = result.results.find(r => r.name === 'vibratoRate');
    expect(rateCrit?.passed).toBe(false);
  });
});

describe('evaluateVFESession', () => {
  const makeVFEMetrics = (
    overrides: Partial<SessionMetrics> = {},
  ): SessionMetrics =>
    makeMetrics({
      duration: 10,
      isVoicedValues: Array.from({ length: 100 }, () => true),
      f0Values: Array.from({ length: 100 }, () => 200),
      jitterValues: Array.from({ length: 100 }, () => 1.0),
      shimmerValues: Array.from({ length: 100 }, () => 2.0),
      hnrValues: Array.from({ length: 100 }, () => 20),
      rmsValues: Array.from({ length: 100 }, () => 0.5),
      ...overrides,
    });

  // Smooth glide from 200→270Hz (~0.43 octaves) for B/C parts.
  // Satisfies pitchSmooth>=30, rangeOctaves>=0.4, maxBreaks<=10.
  const makeGlideMetrics = (
    overrides: Partial<SessionMetrics> = {},
  ): SessionMetrics =>
    makeVFEMetrics({
      f0Values: Array.from({ length: 100 }, (_, i) => 200 + (70 * i) / 99),
      ...overrides,
    });

  it('Lv.1: all 4 sub-exercises pass → passed=true', () => {
    // VFE Lv.1: a={duration:5}, b/c={pitchSmooth:30, rangeOctaves:0.4, maxBreaks:10}, d={duration:5}
    const result = evaluateVFESession(1, {
      a: makeVFEMetrics(),
      b: makeGlideMetrics(),
      c: makeGlideMetrics(),
      d: makeVFEMetrics(),
    });

    expect(result.passed).toBe(true);
  });

  it('Lv.1: only 3 of 4 pass → passed=false, shows which failed', () => {
    // Sub-exercise 'a' fails due to insufficient duration
    const result = evaluateVFESession(1, {
      a: makeVFEMetrics({
        duration: 1,
        isVoicedValues: [true, true],
        f0Values: [200, 200],
        jitterValues: [1.0, 1.0],
        shimmerValues: [2.0, 2.0],
        hnrValues: [20, 20],
        rmsValues: [0.5, 0.5],
      }),
      b: makeGlideMetrics(),
      c: makeGlideMetrics(),
      d: makeVFEMetrics(),
    });

    expect(result.passed).toBe(false);
    // Should have some failing criterion from sub-exercise A
    const failedResults = result.results.filter((r) => !r.passed);
    expect(failedResults.length).toBeGreaterThan(0);
  });

  it('xpEarned defaults to 0', () => {
    const result = evaluateVFESession(1, {
      a: makeVFEMetrics(),
      b: makeGlideMetrics(),
      c: makeGlideMetrics(),
      d: makeVFEMetrics(),
    });
    expect(result.xpEarned).toBe(0);
  });
});
