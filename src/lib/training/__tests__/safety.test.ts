import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkThroatCondition,
  checkDailyLimit,
  checkConsecutiveFails,
  getMicConsent,
  setMicConsent,
  detectVocalFatigue,
  checkSZRatioWarning,
} from '../safety';

// ============================================================
// Mock localStorage
// ============================================================
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ============================================================
// checkThroatCondition
// ============================================================
describe('checkThroatCondition', () => {
  it('returns blocked=true for rating 1', () => {
    const result = checkThroatCondition(1);
    expect(result).not.toBeNull();
    expect(result!.blocked).toBe(true);
    expect(result!.message).toContain('쉬는 것을 권장');
  });

  it('returns blocked=true for rating 2', () => {
    const result = checkThroatCondition(2);
    expect(result).not.toBeNull();
    expect(result!.blocked).toBe(true);
  });

  it('returns blocked=false with warning for rating 3', () => {
    const result = checkThroatCondition(3);
    expect(result).not.toBeNull();
    expect(result!.blocked).toBe(false);
    expect(result!.message).toContain('무리하지 마세요');
  });

  it('returns null for rating 4', () => {
    expect(checkThroatCondition(4)).toBeNull();
  });

  it('returns null for rating 5', () => {
    expect(checkThroatCondition(5)).toBeNull();
  });
});

// ============================================================
// checkDailyLimit
// ============================================================
describe('checkDailyLimit', () => {
  it('returns null when under 30 minutes', () => {
    expect(checkDailyLimit(29)).toBeNull();
  });

  it('returns blocked=true at exactly 30 minutes', () => {
    const result = checkDailyLimit(30);
    expect(result).not.toBeNull();
    expect(result!.blocked).toBe(true);
    expect(result!.message).toContain('30분 이상');
  });

  it('returns blocked=true above 30 minutes', () => {
    const result = checkDailyLimit(45);
    expect(result).not.toBeNull();
    expect(result!.blocked).toBe(true);
  });
});

// ============================================================
// checkConsecutiveFails
// ============================================================
describe('checkConsecutiveFails', () => {
  it('returns null for 2 fails', () => {
    expect(checkConsecutiveFails(2)).toBeNull();
  });

  it('returns warning at exactly 3 fails', () => {
    const result = checkConsecutiveFails(3);
    expect(result).not.toBeNull();
    expect(result).toContain('3회 연속');
  });

  it('returns warning above 3 fails', () => {
    expect(checkConsecutiveFails(5)).not.toBeNull();
  });
});

// ============================================================
// getMicConsent / setMicConsent round-trip
// ============================================================
describe('mic consent persistence', () => {
  it('returns false when no consent stored', () => {
    expect(getMicConsent()).toBe(false);
  });

  it('round-trips setMicConsent(true) → getMicConsent()', () => {
    setMicConsent(true);
    expect(getMicConsent()).toBe(true);
  });

  it('round-trips setMicConsent(false) → getMicConsent()', () => {
    setMicConsent(true);
    setMicConsent(false);
    expect(getMicConsent()).toBe(false);
  });
});

// ============================================================
// detectVocalFatigue
// ============================================================
describe('detectVocalFatigue', () => {
  it('returns fatigued=false when baseline has insufficient samples', () => {
    const result = detectVocalFatigue(
      { hnrMean: 18, jitterMean: 1.0, sampleCount: 50 },
      12, 2.0,
    );
    expect(result.fatigued).toBe(false);
    expect(result.message).toBeNull();
  });

  it('returns fatigued=false when baseline hnrMean is 0', () => {
    const result = detectVocalFatigue(
      { hnrMean: 0, jitterMean: 1.0, sampleCount: 100 },
      12, 2.0,
    );
    expect(result.fatigued).toBe(false);
  });

  it('returns fatigued=false when baseline jitterMean is 0', () => {
    const result = detectVocalFatigue(
      { hnrMean: 18, jitterMean: 0, sampleCount: 100 },
      12, 2.0,
    );
    expect(result.fatigued).toBe(false);
  });

  it('detects fatigue when HNR drops by 5dB from baseline', () => {
    const result = detectVocalFatigue(
      { hnrMean: 20, jitterMean: 1.0, sampleCount: 100 },
      14.5, 1.0,
    );
    expect(result.fatigued).toBe(true);
    expect(result.message).toContain('지치고');
  });

  it('detects fatigue when jitter increases 1.5x AND exceeds absolute minimum', () => {
    const result = detectVocalFatigue(
      { hnrMean: 20, jitterMean: 1.0, sampleCount: 100 },
      20, 1.6,
    );
    expect(result.fatigued).toBe(true);
  });

  it('does NOT trigger on jitter increase when absolute value is below 0.5', () => {
    const result = detectVocalFatigue(
      { hnrMean: 20, jitterMean: 0.1, sampleCount: 100 },
      20, 0.2,
    );
    expect(result.fatigued).toBe(false);
  });

  it('returns fatigued=false when metrics are stable', () => {
    const result = detectVocalFatigue(
      { hnrMean: 18, jitterMean: 1.5, sampleCount: 100 },
      17, 1.8,
    );
    expect(result.fatigued).toBe(false);
  });
});

// ============================================================
// checkSZRatioWarning
// ============================================================
describe('checkSZRatioWarning', () => {
  it('returns null for ratio 1.0 (normal)', () => {
    expect(checkSZRatioWarning(1.0)).toBeNull();
  });

  it('returns null for ratio 1.39', () => {
    expect(checkSZRatioWarning(1.39)).toBeNull();
  });

  it('returns null for ratio exactly 1.4 (boundary)', () => {
    expect(checkSZRatioWarning(1.4)).toBeNull();
  });

  it('returns warning for ratio 1.41', () => {
    const result = checkSZRatioWarning(1.41);
    expect(result).not.toBeNull();
    expect(result).toContain('이비인후과');
  });

  it('returns warning for ratio 2.0', () => {
    expect(checkSZRatioWarning(2.0)).not.toBeNull();
  });
});
