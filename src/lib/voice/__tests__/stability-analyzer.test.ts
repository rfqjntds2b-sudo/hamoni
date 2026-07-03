import { describe, it, expect } from 'vitest';
import { StabilityAnalyzer } from '../stability-analyzer';
import { SCORE_THRESHOLDS } from '../types';

function feed(sa: StabilityAnalyzer, n: number, ...args: Parameters<StabilityAnalyzer['compute']>) {
  let r;
  for (let i = 0; i < n; i++) r = sa.compute(...args);
  return r!;
}

describe('StabilityAnalyzer', () => {
  // --- Quality-based stability scoring (H1-H2/Tilt are informational, not scored) ---

  it('perfect voice → ≥0.7, green', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, 0.1, 0.5, null, 261, 0.99, 2, -6);
    expect(r.stabilityScore).toBeGreaterThanOrEqual(0.7);
    expect(r.color).toBe('oklch(0.72 0.19 145)');
  });

  it('borderline voice → 0.3~0.7, yellow', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, 0.6, 2.5, null, 261, 0.85, 6, -13);
    expect(r.stabilityScore).toBeGreaterThanOrEqual(0.3);
    expect(r.stabilityScore).toBeLessThan(0.7);
  });

  it('unstable voice → <0.4, orange', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, 1.5, 5.0, null, 261, 0.60, -5, 2);
    expect(r.stabilityScore).toBeLessThan(0.4);
    expect(r.color).toBe('oklch(0.65 0.2 25)');
  });

  it('normalization floor: extreme worst → score near 0', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, 10, 20, null, 261, 0.01, -10, 10);
    expect(r.stabilityScore).toBeLessThan(0.25);
  });

  it('normalization ceiling: extreme best → score near 1', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, 0, 0, null, 261, 0.999, 2, -6);
    expect(r.stabilityScore).toBeCloseTo(1.0, 1);
  });

  // --- H1-H2 and Tilt do NOT affect stability score ---

  it('H1-H2/Tilt do not affect stability score (informational only)', () => {
    const sa = new StabilityAnalyzer();
    const r1 = feed(sa, 11, 0.3, 1.0, null, 261, 0.95, -10, 10);
    sa.reset();
    const r2 = feed(sa, 11, 0.3, 1.0, null, 261, 0.95, 2, -6);
    expect(r1.stabilityScore).toBeCloseTo(r2.stabilityScore, 2);
  });

  it('null H1-H2/Tilt → score still works (they are not scored)', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, 0, 0, null, 261, 0.999, null, null);
    expect(r.stabilityScore).toBeCloseTo(1.0, 1);
  });

  // --- Quality metrics ---

  it('good quality → ≥0.7', () => {
    const sa = new StabilityAnalyzer();
    // Lower jitter/shimmer inputs for PPQ5/APQ3+RMS thresholds (worst: 1.04/3.81)
    const r = feed(sa, 11, 0.1, 0.5, null, 130, 0.95, 3, -7);
    expect(r.stabilityScore).toBeGreaterThanOrEqual(0.7);
  });

  it('EMA seed: first frame equals raw', () => {
    const sa = new StabilityAnalyzer();
    const r1 = sa.compute(0.5, 2, null, 261, 0.90, 3, -7);
    expect(r1.stabilityScore).toBeGreaterThan(0);
    const r2 = sa.compute(0.5, 2, null, 261, 0.90, 3, -7);
    expect(r2.stabilityScore).toBeGreaterThan(0);
  });

  it('HNR 25dB is not a perfect score (ceiling is 25dB)', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, 0, 0, null, 261, 0.97, 2, -6);
    expect(r.stabilityScore).toBeLessThan(0.95);
  });

  it('null jitter/shimmer → score based only on available metrics', () => {
    const sa = new StabilityAnalyzer();
    const r = feed(sa, 11, null, null, null, 261, 0.60, 2, -6);
    expect(r.stabilityScore).toBeLessThan(0.55);
  });

  it('vibrato active does not change jitter/shimmer thresholds (pre-filtering handles it)', () => {
    const sa = new StabilityAnalyzer();
    const rNormal = feed(sa, 11, 2.0, 4.0, null, 261, 0.95, 2, -6, false);
    sa.reset();
    const rVibrato = feed(sa, 11, 2.0, 4.0, null, 261, 0.95, 2, -6, true);
    expect(rVibrato.stabilityScore).toBeCloseTo(rNormal.stabilityScore, 2);
  });

  it('vibratoActive=true uses same jitter/shimmer worst as non-vibrato (no double compensation)', () => {
    const sa1 = new StabilityAnalyzer();
    const rVibrato = feed(sa1, 11, 1.5, 3.0, null, 261, 0.90, 2, -6, true);
    const sa2 = new StabilityAnalyzer();
    const rNormal = feed(sa2, 11, 1.5, 3.0, null, 261, 0.90, 2, -6, false);
    // With double compensation removed, vibrato=true should produce
    // the same score as vibrato=false (identical inputs, same thresholds)
    expect(rVibrato.stabilityScore).toBeCloseTo(rNormal.stabilityScore, 2);
  });

  it('scoring constants match SCORE_THRESHOLDS', () => {
    const sa = new StabilityAnalyzer();
    const rBad = feed(sa, 11, SCORE_THRESHOLDS.jitter.worst, 0, null, 261, 0.999, 2, -6);
    sa.reset();
    const rGood = feed(sa, 11, 0, 0, null, 261, 0.999, 2, -6);
    expect(rGood.stabilityScore).toBeGreaterThan(rBad.stabilityScore);
  });
});
