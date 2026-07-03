import type { PitchSample } from '@/lib/pitch/types';
import { midiToNote } from '@/lib/pitch/note-utils';

const STABLE_CENTS_THRESHOLD = 20;

export function filterValidSamples(samples: PitchSample[]): PitchSample[] {
  return samples.filter((s) => s.clarity >= 0.75);
}

export function calculatePitchAccuracyScore(samples: PitchSample[]): number {
  if (samples.length === 0) return 0;
  const stableCount = samples.filter((s) => Math.abs(s.cents) <= STABLE_CENTS_THRESHOLD).length;
  return Math.round((stableCount / samples.length) * 100);
}

export function calculateStabilityScore(samples: PitchSample[]): number {
  if (samples.length < 2) return 100;
  const diffs: number[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    diffs.push(Math.abs(samples[i + 1].cents - samples[i].cents));
  }
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  // 선형 임계값 (초보자에게 더 공정한 평가)
  // avgDiff 0~5: 100, 5~15: 100→70, 15~50: 70→0
  let score: number;
  if (avgDiff <= 5) score = 100;
  else if (avgDiff <= 15) score = 100 - (avgDiff - 5) * 3;
  else score = 70 - (avgDiff - 15) * 2;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function calculateRangeUtilScore(samples: PitchSample[]): number {
  if (samples.length === 0) return 0;
  const midis = samples.map((s) => s.midiNumber);
  const usedSemitones = Math.max(...midis) - Math.min(...midis);
  return Math.round(Math.min(100, usedSemitones * 8.33));
}

export function calculateOverallScore(
  pitchAccuracyScore: number,
  stabilityScore: number,
  rangeUtilScore: number
): number {
  const baseScore = Math.round(pitchAccuracyScore * 0.65 + stabilityScore * 0.35);
  const rangeBonus = Math.floor(rangeUtilScore * 0.05);
  return Math.min(100, baseScore + rangeBonus);
}

export function calculateDriftDirection(
  samples: PitchSample[]
): 'flat' | 'sharp' | 'balanced' {
  if (samples.length === 0) return 'balanced';
  const flatCount = samples.filter((s) => s.cents < -10).length;
  const sharpCount = samples.filter((s) => s.cents > 10).length;
  const total = samples.length;
  const flatRatio = flatCount / total;
  const sharpRatio = sharpCount / total;

  if (flatRatio > sharpRatio + 0.15) return 'flat';
  if (sharpRatio > flatRatio + 0.15) return 'sharp';
  return 'balanced';
}

export function calculateJitterScore(samples: PitchSample[]): number {
  if (samples.length < 2) return 0;
  const diffs: number[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    diffs.push(Math.abs(samples[i + 1].cents - samples[i].cents));
  }
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.min(1, avgDiff / 50);
}

export function calculateWorstBestIntervals(
  samples: PitchSample[]
): { worst: string | null; best: string | null } {
  const groups = new Map<number, number[]>();
  for (const s of samples) {
    const arr = groups.get(s.midiNumber) || [];
    arr.push(Math.abs(s.cents));
    groups.set(s.midiNumber, arr);
  }

  let worstMidi: number | null = null;
  let bestMidi: number | null = null;
  let worstAvg = -1;
  let bestAvg = Infinity;

  for (const [midi, cents] of groups) {
    if (cents.length < 10) continue;
    const avg = cents.reduce((a, b) => a + b, 0) / cents.length;
    if (avg > worstAvg) {
      worstAvg = avg;
      worstMidi = midi;
    }
    if (avg < bestAvg) {
      bestAvg = avg;
      bestMidi = midi;
    }
  }

  return {
    worst: worstMidi !== null ? midiToNote(worstMidi) : null,
    best: bestMidi !== null ? midiToNote(bestMidi) : null,
  };
}

export function calculateLongestStableSeconds(samples: PitchSample[]): number {
  if (samples.length === 0) return 0;
  let maxDuration = 0;
  let streakStart = 0;
  let inStreak = Math.abs(samples[0].cents) <= STABLE_CENTS_THRESHOLD;

  for (let i = 1; i < samples.length; i++) {
    const stable = Math.abs(samples[i].cents) <= STABLE_CENTS_THRESHOLD;
    if (stable && !inStreak) {
      streakStart = i;
      inStreak = true;
    } else if (!stable && inStreak) {
      const duration = (samples[i - 1].timestamp - samples[streakStart].timestamp) / 1000;
      maxDuration = Math.max(maxDuration, duration);
      inStreak = false;
    }
  }

  if (inStreak) {
    const duration = (samples[samples.length - 1].timestamp - samples[streakStart].timestamp) / 1000;
    maxDuration = Math.max(maxDuration, duration);
  }

  return maxDuration;
}

export function calculateComfortZone(
  samples: PitchSample[]
): { low: number; high: number } {
  const groups = new Map<number, { stable: number; total: number }>();
  for (const s of samples) {
    const g = groups.get(s.midiNumber) || { stable: 0, total: 0 };
    g.total++;
    if (Math.abs(s.cents) <= STABLE_CENTS_THRESHOLD) g.stable++;
    groups.set(s.midiNumber, g);
  }

  const stableMidis = new Set<number>();
  for (const [midi, g] of groups) {
    if (g.total >= 10 && g.stable / g.total >= 0.7) {
      stableMidis.add(midi);
    }
  }

  if (stableMidis.size === 0) {
    const midis = samples.map((s) => s.midiNumber);
    return { low: Math.min(...midis), high: Math.max(...midis) };
  }

  const sorted = [...stableMidis].sort((a, b) => a - b);
  let bestLen = 0;
  let bestStart = sorted[0];
  let curStart = sorted[0];
  let curLen = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      curLen++;
    } else {
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
      curStart = sorted[i];
      curLen = 1;
    }
  }
  if (curLen > bestLen) {
    bestLen = curLen;
    bestStart = curStart;
  }

  return { low: bestStart, high: bestStart + bestLen - 1 };
}
