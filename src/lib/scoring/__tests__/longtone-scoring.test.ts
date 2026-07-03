import { describe, it, expect } from 'vitest';
import { scoreLongtone } from '../longtone-scoring';
import type { PitchSample } from '@/lib/pitch/types';

function makeSample(overrides: Partial<PitchSample> = {}): PitchSample {
  return { timestamp: 0, frequency: 440, note: 'A4', midiNumber: 69, cents: 0, clarity: 0.95, rms: 0, ...overrides };
}

describe('scoreLongtone', () => {
  it('gives 3 stars for 95%+ sustain', () => {
    const result = scoreLongtone({
      samples: Array.from({ length: 100 }, (_, i) => makeSample({ timestamp: i * 100, cents: 5 })),
      targetFrequency: 440,
      targetDurationSeconds: 10,
      toleranceCents: 30,
    });
    expect(result.stars).toBe(3);
    expect(result.passed).toBe(true);
  });

  it('gives 0 stars for < 70% sustain', () => {
    const samples = [
      ...Array.from({ length: 30 }, (_, i) => makeSample({ timestamp: i * 100, cents: 5 })),
      ...Array.from({ length: 70 }, (_, i) => makeSample({ timestamp: 3000 + i * 100, cents: 45 })),
    ];
    const result = scoreLongtone({
      samples,
      targetFrequency: 440,
      targetDurationSeconds: 10,
      toleranceCents: 30,
    });
    expect(result.stars).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('gives 2 stars for 85-94% sustain', () => {
    // 90% 인 톨러런스 → 2 stars
    const samples = [
      ...Array.from({ length: 90 }, (_, i) => makeSample({ timestamp: i * 100, cents: 5 })),
      ...Array.from({ length: 10 }, (_, i) => makeSample({ timestamp: 9000 + i * 100, cents: 45 })),
    ];
    const result = scoreLongtone({
      samples,
      targetFrequency: 440,
      targetDurationSeconds: 10,
      toleranceCents: 30,
    });
    expect(result.stars).toBe(2);
    expect(result.passed).toBe(true);
  });

  it('gives 1 star for 70-84% sustain', () => {
    const samples = [
      ...Array.from({ length: 75 }, (_, i) => makeSample({ timestamp: i * 100, cents: 5 })),
      ...Array.from({ length: 25 }, (_, i) => makeSample({ timestamp: 7500 + i * 100, cents: 45 })),
    ];
    const result = scoreLongtone({
      samples,
      targetFrequency: 440,
      targetDurationSeconds: 10,
      toleranceCents: 30,
    });
    expect(result.stars).toBe(1);
    expect(result.passed).toBe(true);
  });

  it('clarity 드롭 구간이 있어도 인톨러런스 유지 시간을 정확히 계산', () => {
    const samples = [
      ...Array.from({ length: 95 }, (_, i) => makeSample({ timestamp: i * 100, cents: 5 })),
      ...Array.from({ length: 5 }, (_, i) => makeSample({ timestamp: 9500 + i * 100, cents: 5, clarity: 0.5 })),
    ];
    const result = scoreLongtone({
      samples,
      targetFrequency: 440,
      targetDurationSeconds: 10,
      toleranceCents: 30,
    });
    // 95개 유효 샘플, 전부 인톨러런스 내, 9400ms 범위
    expect(result.stars).toBe(3);
  });

  it('returns 0 for empty samples', () => {
    const result = scoreLongtone({
      samples: [],
      targetFrequency: 440,
      targetDurationSeconds: 10,
      toleranceCents: 30,
    });
    expect(result.stars).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.sustainedSeconds).toBe(0);
  });
});
