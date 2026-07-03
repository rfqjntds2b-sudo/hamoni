import { describe, it, expect } from 'vitest';
import {
  calculatePitchSmoothness,
  calculateDynamicRange,
  countPitchBreaks,
  calculateF0Deviation,
  calculateRangeOctaves,
  calculateStableAverage,
  calculateSustainedDuration,
} from '../analysis';

// ============================================================
// calculatePitchSmoothness
// ============================================================

describe('calculatePitchSmoothness', () => {
  it('returns ~100 for a perfectly linear F0 array', () => {
    // Linear ramp from 200 to 210 Hz in small steps — all jumps < 50 cents
    const f0 = Array.from({ length: 50 }, (_, i) => 200 + i * 0.2);
    expect(calculatePitchSmoothness(f0)).toBeGreaterThanOrEqual(95);
  });

  it('returns low value for step-like jumps', () => {
    // Alternating 200 Hz and 400 Hz — every frame is a ~1200 cent jump
    const f0 = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? 200 : 400,
    );
    expect(calculatePitchSmoothness(f0)).toBeLessThan(10);
  });

  it('returns 0 for empty array', () => {
    expect(calculatePitchSmoothness([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(calculatePitchSmoothness([440])).toBe(0);
  });

  it('filters out zero values before computing', () => {
    // Zeros should be ignored; remaining values are smooth
    const f0 = [0, 200, 200.5, 201, 0, 201.5, 202, 0];
    expect(calculatePitchSmoothness(f0)).toBeGreaterThanOrEqual(90);
  });

  it('accepts a custom threshold', () => {
    // 200 → 210 Hz ≈ 85 cents. With threshold=100, all smooth. With threshold=50, not all smooth.
    const f0 = [200, 210, 220, 230, 240];
    expect(calculatePitchSmoothness(f0, 100)).toBeGreaterThanOrEqual(75);
    expect(calculatePitchSmoothness(f0, 30)).toBeLessThanOrEqual(50);
  });
});

// ============================================================
// calculateDynamicRange
// ============================================================

describe('calculateDynamicRange', () => {
  it('returns high dB for wide RMS range', () => {
    // RMS from 0.01 to 1.0 → 20*log10(100) = 40 dB
    const rms = [0.01, 0.1, 0.5, 1.0];
    const result = calculateDynamicRange(rms);
    expect(result).toBeCloseTo(40, 0);
  });

  it('returns ~0 dB for flat RMS', () => {
    const rms = [0.5, 0.5, 0.5, 0.5];
    expect(calculateDynamicRange(rms)).toBeCloseTo(0, 1);
  });

  it('returns 0 for empty array', () => {
    expect(calculateDynamicRange([])).toBe(0);
  });

  it('returns 0 for all-silent array (values below threshold)', () => {
    const rms = [0.0001, 0.0005, 0.0009];
    expect(calculateDynamicRange(rms)).toBe(0);
  });

  it('returns 0 for single valid value', () => {
    expect(calculateDynamicRange([0.5])).toBeCloseTo(0, 1);
  });

  it('filters out silent frames (< 0.001)', () => {
    // Only non-silent: 0.01 and 0.1 → 20 dB
    const rms = [0.0001, 0.01, 0.0005, 0.1];
    expect(calculateDynamicRange(rms)).toBeCloseTo(20, 0);
  });
});

// ============================================================
// countPitchBreaks
// ============================================================

describe('countPitchBreaks', () => {
  it('returns 0 for smooth glide', () => {
    // Smooth ramp — no jumps > 200 cents
    const f0 = Array.from({ length: 50 }, (_, i) => 200 + i * 1);
    expect(countPitchBreaks(f0)).toBe(0);
  });

  it('counts 200+ cent jumps correctly', () => {
    // 200 → 400 → 200 → 400 → 200 = 4 jumps of ~1200 cents each
    const f0 = [200, 400, 200, 400, 200];
    expect(countPitchBreaks(f0)).toBe(4);
  });

  it('returns 0 for empty array', () => {
    expect(countPitchBreaks([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(countPitchBreaks([440])).toBe(0);
  });

  it('filters out zero values', () => {
    // Without zeros: 200, 200, 200 — no breaks
    const f0 = [200, 0, 200, 0, 200];
    expect(countPitchBreaks(f0)).toBe(0);
  });

  it('accepts a custom threshold', () => {
    // 200→220 = ~165 cents. With threshold=100, it's a break. With default 200, it's not.
    const f0 = [200, 220];
    expect(countPitchBreaks(f0, 100)).toBe(1);
    expect(countPitchBreaks(f0, 200)).toBe(0);
  });
});

// ============================================================
// calculateF0Deviation
// ============================================================

describe('calculateF0Deviation', () => {
  it('returns ~0 for perfectly stable F0', () => {
    const f0 = Array.from({ length: 50 }, () => 200);
    expect(calculateF0Deviation(f0)).toBeCloseTo(0, 1);
  });

  it('returns high Hz for drifting F0', () => {
    // Baseline ~200 Hz (first 10 frames), then drifts to 230 Hz
    const f0 = [
      ...Array.from({ length: 10 }, () => 200),
      210,
      220,
      230,
    ];
    expect(calculateF0Deviation(f0)).toBeGreaterThanOrEqual(25);
  });

  it('returns 0 for empty array', () => {
    expect(calculateF0Deviation([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(calculateF0Deviation([440])).toBe(0);
  });

  it('detects negative deviations (downward drift)', () => {
    const f0 = [
      ...Array.from({ length: 10 }, () => 300),
      280,
      260,
    ];
    expect(calculateF0Deviation(f0)).toBeGreaterThanOrEqual(35);
  });
});

// ============================================================
// calculateRangeOctaves
// ============================================================

describe('calculateRangeOctaves', () => {
  it('returns ~1.0 for one octave range', () => {
    // 200 to 400 Hz = 1 octave
    const f0 = [200, 250, 300, 350, 400];
    expect(calculateRangeOctaves(f0)).toBeCloseTo(1.0, 1);
  });

  it('returns ~2.0 for two octaves', () => {
    // 100 to 400 Hz = 2 octaves
    const f0 = [100, 200, 300, 400];
    expect(calculateRangeOctaves(f0)).toBeCloseTo(2.0, 1);
  });

  it('returns 0 for empty array', () => {
    expect(calculateRangeOctaves([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(calculateRangeOctaves([440])).toBe(0);
  });

  it('filters out zero values', () => {
    // With zeros removed: 200, 400 = 1 octave
    const f0 = [0, 200, 0, 400, 0];
    expect(calculateRangeOctaves(f0)).toBeCloseTo(1.0, 1);
  });

  it('returns 0 for all-zero array', () => {
    expect(calculateRangeOctaves([0, 0, 0])).toBe(0);
  });
});

// ============================================================
// calculateStableAverage
// ============================================================

describe('calculateStableAverage', () => {
  it('removes outliers and returns accurate mean', () => {
    // Core values are all 100, with outliers at extremes
    const values = [1, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
      100, 100, 100, 100, 100, 100, 100, 100, 999];
    const avg = calculateStableAverage(values, 5);
    // After removing top/bottom 5% (1 each), remaining are all 100
    expect(avg).toBeCloseTo(100, 0);
  });

  it('returns 0 for empty array', () => {
    expect(calculateStableAverage([])).toBe(0);
  });

  it('returns the single value for single-element array', () => {
    expect(calculateStableAverage([42])).toBe(42);
  });

  it('handles small arrays without trimming issues', () => {
    const values = [10, 20, 30];
    const avg = calculateStableAverage(values, 5);
    expect(avg).toBeCloseTo(20, 0);
  });

  it('returns accurate mean with default trim (5%)', () => {
    const values = Array.from({ length: 100 }, () => 50);
    values[0] = 0;
    values[99] = 1000;
    const avg = calculateStableAverage(values);
    expect(avg).toBeCloseTo(50, 0);
  });
});

// ============================================================
// calculateSustainedDuration
// ============================================================

describe('calculateSustainedDuration', () => {
  it('returns longest consecutive window in seconds', () => {
    // 10 frames at 100ms = 1.0 second
    const frames = [
      { meetsCriteria: false },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: false },
    ];
    expect(calculateSustainedDuration(frames, 100)).toBeCloseTo(1.0, 2);
  });

  it('returns 0 for empty array', () => {
    expect(calculateSustainedDuration([])).toBe(0);
  });

  it('returns 0 when no frames meet criteria', () => {
    const frames = Array.from({ length: 10 }, () => ({
      meetsCriteria: false,
    }));
    expect(calculateSustainedDuration(frames)).toBe(0);
  });

  it('returns full duration when all frames meet criteria', () => {
    // 50 frames at 100ms = 5.0 seconds
    const frames = Array.from({ length: 50 }, () => ({
      meetsCriteria: true,
    }));
    expect(calculateSustainedDuration(frames, 100)).toBeCloseTo(5.0, 2);
  });

  it('finds the longest run among multiple runs', () => {
    // Run of 3, then gap, then run of 5 — longest is 5 frames = 0.5s
    const frames = [
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: false },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: true },
      { meetsCriteria: false },
    ];
    expect(calculateSustainedDuration(frames, 100)).toBeCloseTo(0.5, 2);
  });

  it('respects custom intervalMs', () => {
    // 10 frames at 50ms = 0.5 seconds
    const frames = Array.from({ length: 10 }, () => ({
      meetsCriteria: true,
    }));
    expect(calculateSustainedDuration(frames, 50)).toBeCloseTo(0.5, 2);
  });
});
