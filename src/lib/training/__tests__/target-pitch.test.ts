import { describe, it, expect, beforeEach } from 'vitest';
import { TargetPitchDetector } from '../target-pitch';

describe('TargetPitchDetector', () => {
  let detector: TargetPitchDetector;

  beforeEach(() => {
    detector = new TargetPitchDetector();
  });

  it('starts unlocked', () => {
    expect(detector.isLocked()).toBe(false);
    expect(detector.getTargetHz()).toBe(0);
  });

  it('locks on stable voiced frames (std dev < 10Hz)', () => {
    // Push 6 frames at ~220Hz (stable)
    for (let i = 0; i < 6; i++) {
      detector.push(220 + i * 0.5, true); // 220, 220.5, 221, 221.5, 222, 222.5
    }
    expect(detector.isLocked()).toBe(true);
    // Median of [220, 220.5, 221, 221.5, 222, 222.5] = (221 + 221.5) / 2 = 221.25
    expect(detector.getTargetHz()).toBeCloseTo(221.25, 1);
  });

  it('ignores unvoiced frames', () => {
    detector.push(0, false);
    detector.push(0, false);
    detector.push(220, true);
    detector.push(0, false);
    expect(detector.isLocked()).toBe(false);
  });

  it('uses fallback after MAX_LOCK_FRAMES with unstable pitch', () => {
    // Push 10 total frames with high variance (some voiced, some not)
    detector.push(200, true);
    detector.push(0, false);
    detector.push(300, true);
    detector.push(0, false);
    detector.push(250, true);
    detector.push(0, false);
    detector.push(220, true);
    detector.push(0, false);
    detector.push(280, true);
    detector.push(240, true); // 10th frame → fallback

    expect(detector.isLocked()).toBe(true);
    // Uses trimmed mean of [200, 300, 250, 220, 280, 240]
    expect(detector.getTargetHz()).toBeGreaterThan(0);
  });

  it('computes signed cents deviation', () => {
    // Lock at 440 Hz (A4)
    for (let i = 0; i < 6; i++) {
      detector.push(440, true);
    }
    expect(detector.isLocked()).toBe(true);

    // 880 Hz = +1200 cents (one octave up)
    expect(detector.getCentsDeviation(880)).toBe(1200);

    // 220 Hz = -1200 cents (one octave down)
    expect(detector.getCentsDeviation(220)).toBe(-1200);

    // Same pitch = 0 cents
    expect(detector.getCentsDeviation(440)).toBe(0);
  });

  it('returns 0 cents when not locked', () => {
    expect(detector.getCentsDeviation(440)).toBe(0);
  });

  it('resets correctly', () => {
    for (let i = 0; i < 6; i++) {
      detector.push(220, true);
    }
    expect(detector.isLocked()).toBe(true);

    detector.reset();
    expect(detector.isLocked()).toBe(false);
    expect(detector.getTargetHz()).toBe(0);
  });

  it('stops accepting frames after lock', () => {
    for (let i = 0; i < 6; i++) {
      detector.push(220, true);
    }
    const target = detector.getTargetHz();

    // Push more frames — target should not change
    for (let i = 0; i < 10; i++) {
      detector.push(440, true);
    }
    expect(detector.getTargetHz()).toBe(target);
  });
});
