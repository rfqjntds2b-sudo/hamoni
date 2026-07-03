import { describe, it, expect } from 'vitest';
import { PitchSmoother } from '../pitch-smoother';

describe('PitchSmoother', () => {
  it('smooths values with EMA', () => {
    const smoother = new PitchSmoother(0.15);
    smoother.push(440);
    const smoothed = smoother.push(445);
    // EMA: 0.15 * 445 + 0.85 * 440 = 66.75 + 374 = 440.75
    expect(smoothed).toBeCloseTo(440.75, 1);
  });

  it('resets on onset detection (large jump)', () => {
    const smoother = new PitchSmoother(0.15);
    smoother.push(440);
    smoother.push(442);
    // Big jump — should reset and return new value directly
    const result = smoother.push(880);
    expect(result).toBeCloseTo(880, 0);
  });

  it('detects onset based on semitone threshold', () => {
    const smoother = new PitchSmoother(0.15);
    smoother.push(440);    // A4
    const result = smoother.push(494);  // B4 — 2 semitones up
    expect(result).toBeCloseTo(494, 0); // onset reset
  });

  it('returns first value directly', () => {
    const smoother = new PitchSmoother(0.15);
    expect(smoother.push(440)).toBe(440);
  });

  it('resets state', () => {
    const smoother = new PitchSmoother(0.15);
    smoother.push(440);
    smoother.push(442);
    smoother.reset();
    // After reset, next push should return the value directly
    expect(smoother.push(300)).toBe(300);
  });
});
