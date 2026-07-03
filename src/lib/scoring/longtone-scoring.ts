import type { PitchSample } from '@/lib/pitch/types';

interface LongtoneInput {
  samples: PitchSample[];
  targetFrequency: number;
  targetDurationSeconds: number;
  toleranceCents: number;
}

export interface LongtoneResult {
  sustainedSeconds: number;
  maxSustainStreakSeconds: number;
  averageCents: number;
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
}

export function scoreLongtone(input: LongtoneInput): LongtoneResult {
  const { samples, targetDurationSeconds, toleranceCents } = input;
  const valid = samples.filter((s) => s.clarity >= 0.75);

  if (valid.length === 0) {
    return { sustainedSeconds: 0, maxSustainStreakSeconds: 0, averageCents: 0, passed: false, stars: 0 };
  }

  // 타임스탬프 윈도우 기반 sustain 계산 (샘플 비율 대신 실제 시간 합산)
  const avgInterval = valid.length > 1
    ? (valid[valid.length - 1].timestamp - valid[0].timestamp) / (valid.length - 1)
    : 43; // ~43ms at 48kHz/2048
  let sustainedMs = 0;
  for (let i = 0; i < valid.length; i++) {
    if (Math.abs(valid[i].cents) <= toleranceCents) {
      const dt = i < valid.length - 1
        ? valid[i + 1].timestamp - valid[i].timestamp
        : avgInterval;
      sustainedMs += dt;
    }
  }
  const sustainedSeconds = sustainedMs / 1000;

  // Max streak
  let maxStreak = 0;
  let streakStart = -1;
  for (let i = 0; i < valid.length; i++) {
    if (Math.abs(valid[i].cents) <= toleranceCents) {
      if (streakStart === -1) streakStart = i;
    } else {
      if (streakStart !== -1) {
        const dur = (valid[i - 1].timestamp - valid[streakStart].timestamp) / 1000;
        maxStreak = Math.max(maxStreak, dur);
        streakStart = -1;
      }
    }
  }
  if (streakStart !== -1) {
    const dur = (valid[valid.length - 1].timestamp - valid[streakStart].timestamp) / 1000;
    maxStreak = Math.max(maxStreak, dur);
  }

  const avgCents = valid.reduce((sum, s) => sum + s.cents, 0) / valid.length;
  const sustainRatio = sustainedSeconds / targetDurationSeconds;

  let stars: 0 | 1 | 2 | 3;
  if (sustainRatio >= 0.95) stars = 3;
  else if (sustainRatio >= 0.85) stars = 2;
  else if (sustainRatio >= 0.70) stars = 1;
  else stars = 0;

  return {
    sustainedSeconds: Math.round(sustainedSeconds * 10) / 10,
    maxSustainStreakSeconds: Math.round(maxStreak * 10) / 10,
    averageCents: Math.round(avgCents * 10) / 10,
    passed: stars >= 1,
    stars,
  };
}
