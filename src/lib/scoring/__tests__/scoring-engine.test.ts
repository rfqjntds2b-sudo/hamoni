import { describe, it, expect } from 'vitest';
import {
  calculatePitchAccuracyScore,
  calculateStabilityScore,
  calculateRangeUtilScore,
  calculateOverallScore,
  calculateDriftDirection,
  calculateJitterScore,
  calculateWorstBestIntervals,
  calculateLongestStableSeconds,
  calculateComfortZone,
} from '../scoring-engine';
import type { PitchSample } from '@/lib/pitch/types';

function makeSample(overrides: Partial<PitchSample> = {}): PitchSample {
  return {
    timestamp: 0,
    frequency: 440,
    note: 'A4',
    midiNumber: 69,
    cents: 0,
    clarity: 0.95,
    rms: 0,
    ...overrides,
  };
}

describe('calculatePitchAccuracyScore', () => {
  it('returns 100 when all samples within ±20 cents', () => {
    const samples = [
      makeSample({ cents: 5 }),
      makeSample({ cents: -10 }),
      makeSample({ cents: 15 }),
    ];
    expect(calculatePitchAccuracyScore(samples)).toBe(100);
  });

  it('returns 0 when no samples within ±20 cents', () => {
    const samples = [
      makeSample({ cents: 30 }),
      makeSample({ cents: -40 }),
    ];
    expect(calculatePitchAccuracyScore(samples)).toBe(0);
  });

  it('returns 50 when half are within range', () => {
    const samples = [
      makeSample({ cents: 5 }),
      makeSample({ cents: 30 }),
    ];
    expect(calculatePitchAccuracyScore(samples)).toBe(50);
  });
});

describe('calculateStabilityScore', () => {
  it('returns 100 for perfectly stable samples', () => {
    const samples = [
      makeSample({ cents: 5 }),
      makeSample({ cents: 5 }),
      makeSample({ cents: 5 }),
    ];
    expect(calculateStabilityScore(samples)).toBe(100);
  });

  it('returns 100 for avgDiff exactly 5 (threshold boundary)', () => {
    // avgDiff=5 → 선형: 100 (≤5 구간)
    const samples = [
      makeSample({ cents: 0 }),
      makeSample({ cents: 5 }),
      makeSample({ cents: 0 }),
      makeSample({ cents: 5 }),
    ];
    expect(calculateStabilityScore(samples)).toBe(100);
  });

  it('returns 60 for avgDiff=20 (fairer for beginners)', () => {
    // avgDiff=20 → 선형: 70-(20-15)*2 = 60
    const samples = [
      makeSample({ cents: 0 }),
      makeSample({ cents: 20 }),
      makeSample({ cents: 0 }),
      makeSample({ cents: 20 }),
    ];
    expect(calculateStabilityScore(samples)).toBe(60);
  });

  it('returns 0 for avgDiff of 50', () => {
    const samples = [
      makeSample({ cents: -25 }),
      makeSample({ cents: 25 }),
      makeSample({ cents: -25 }),
      makeSample({ cents: 25 }),
    ];
    expect(calculateStabilityScore(samples)).toBe(0);
  });
});

describe('calculateRangeUtilScore', () => {
  it('returns 100 for 1 octave range', () => {
    const samples = [
      makeSample({ midiNumber: 60 }),
      makeSample({ midiNumber: 72 }),
    ];
    expect(calculateRangeUtilScore(samples)).toBe(100);
  });

  it('returns 0 for single note', () => {
    const samples = [
      makeSample({ midiNumber: 60 }),
      makeSample({ midiNumber: 60 }),
    ];
    expect(calculateRangeUtilScore(samples)).toBe(0);
  });
});

describe('calculateOverallScore', () => {
  it('combines scores with correct weights and bonus', () => {
    // baseScore = round(80 * 0.65 + 70 * 0.35) = round(52 + 24.5) = 77
    // rangeBonus = floor(100 * 0.05) = 5
    // overall = min(100, 77 + 5) = 82
    expect(calculateOverallScore(80, 70, 100)).toBe(82);
  });

  it('caps at 100', () => {
    expect(calculateOverallScore(100, 100, 100)).toBe(100);
  });

  it('gives 0 bonus for 0 range', () => {
    // baseScore = round(80 * 0.65 + 70 * 0.35) = 77
    expect(calculateOverallScore(80, 70, 0)).toBe(77);
  });
});

describe('calculateDriftDirection', () => {
  it('returns flat when significantly more flat samples', () => {
    const samples = [
      makeSample({ cents: -20 }),
      makeSample({ cents: -30 }),
      makeSample({ cents: -15 }),
      makeSample({ cents: 5 }),
    ];
    expect(calculateDriftDirection(samples)).toBe('flat');
  });

  it('returns sharp when significantly more sharp samples', () => {
    const samples = [
      makeSample({ cents: 20 }),
      makeSample({ cents: 30 }),
      makeSample({ cents: 15 }),
      makeSample({ cents: -5 }),
    ];
    expect(calculateDriftDirection(samples)).toBe('sharp');
  });

  it('returns balanced when roughly even', () => {
    const samples = [
      makeSample({ cents: 15 }),
      makeSample({ cents: -15 }),
      makeSample({ cents: 5 }),
      makeSample({ cents: -5 }),
    ];
    expect(calculateDriftDirection(samples)).toBe('balanced');
  });
});

describe('calculateJitterScore', () => {
  it('returns 0 for stable samples', () => {
    const samples = [
      makeSample({ cents: 5 }),
      makeSample({ cents: 5 }),
    ];
    expect(calculateJitterScore(samples)).toBe(0);
  });

  it('clamps to 1 for extreme jitter', () => {
    const samples = [
      makeSample({ cents: -50 }),
      makeSample({ cents: 50 }),
    ];
    expect(calculateJitterScore(samples)).toBe(1);
  });
});

describe('calculateLongestStableSeconds', () => {
  it('finds longest stable streak', () => {
    const samples = [
      makeSample({ timestamp: 0, cents: 5 }),
      makeSample({ timestamp: 100, cents: 10 }),
      makeSample({ timestamp: 200, cents: -5 }),
      makeSample({ timestamp: 300, cents: 30 }),
      makeSample({ timestamp: 400, cents: 5 }),
      makeSample({ timestamp: 500, cents: 10 }),
    ];
    expect(calculateLongestStableSeconds(samples)).toBeCloseTo(0.2, 1);
  });
});

describe('calculateComfortZone', () => {
  it('finds widest stable range', () => {
    const samples: PitchSample[] = [];
    for (let midi = 60; midi <= 63; midi++) {
      for (let i = 0; i < 15; i++) {
        samples.push(makeSample({ midiNumber: midi, cents: 5, note: `note${midi}` }));
      }
    }
    const result = calculateComfortZone(samples);
    expect(result.low).toBe(60);
    expect(result.high).toBe(63);
  });
});

// --- Edge case tests ---

describe('edge cases: empty and single sample', () => {
  it('pitchAccuracyScore returns 0 for empty array', () => {
    expect(calculatePitchAccuracyScore([])).toBe(0);
  });

  it('stabilityScore returns 100 for single sample', () => {
    expect(calculateStabilityScore([makeSample()])).toBe(100);
  });

  it('rangeUtilScore returns 0 for empty array', () => {
    expect(calculateRangeUtilScore([])).toBe(0);
  });

  it('driftDirection returns balanced for empty array', () => {
    expect(calculateDriftDirection([])).toBe('balanced');
  });

  it('jitterScore returns 0 for single sample', () => {
    expect(calculateJitterScore([makeSample()])).toBe(0);
  });

  it('longestStableSeconds returns 0 for empty array', () => {
    expect(calculateLongestStableSeconds([])).toBe(0);
  });

  it('worstBestIntervals returns nulls when all groups < 10 samples', () => {
    const samples = [makeSample({ midiNumber: 60 }), makeSample({ midiNumber: 65 })];
    const result = calculateWorstBestIntervals(samples);
    expect(result.worst).toBeNull();
    expect(result.best).toBeNull();
  });
});
