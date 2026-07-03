// --- Utility functions ---

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1); // Bessel correction
  return Math.sqrt(variance);
}

export function findClosestCandidate(candidates: number[], target: number): number {
  return candidates.reduce((best, c) =>
    Math.abs(c - target) < Math.abs(best - target) ? c : best
  );
}

// --- EMA Filter ---

export class EmaFilter {
  private value = 0;
  private initialized = false;
  constructor(private alpha = 0.3) {}

  update(raw: number): number {
    if (!isFinite(raw)) return this.value;
    if (!this.initialized) { this.value = raw; this.initialized = true; return raw; }
    this.value = this.alpha * raw + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset(): void { this.initialized = false; this.value = 0; }
  get current(): number { return this.value; }
}

// --- Types ---

export interface PeriodDetectorResult {
  f0: number | null;
  clarity: number;
  autocorrPeak: number;
  periods: number[];
  amplitudes: number[];
}

export interface SpectralResult {
  h1h2: number | null;
  alphaRatio: number | null;
}

export type Gender = 'male' | 'female';
export type AnalyzerPhase = 'idle' | 'analyzing';

export interface StabilityMetrics {
  f0: number | null;
  jitter: number | null;
  shimmer: number | null;
  hnrDb: number | null;
  f0Std: number | null;
  h1h2: number | null;
  alphaRatio: number | null;
  stabilityScore: number;
  color: string;
  /** Monotonic frame counter for deduplication in diagnostic reads */
  frameId: number;
}

/**
 * Map clarity to quality weight for weighted averaging.
 * >= 0.75: 1.0 (full confidence)
 * 0.5-0.75: linear ramp from 0.1 to 1.0 (partial confidence, wider range after gate lowered to 0.5)
 * < 0.5: 0.0 (below gate, never reached)
 */
export function clarityWeight(clarity: number): number {
  if (clarity >= 0.75) return 1.0;
  if (clarity >= 0.5) return 0.1 + 0.9 * (clarity - 0.5) / 0.25;
  return 0;
}

export const SCORE_THRESHOLDS = {
  jitter:  { worst: 1.04 },  // PPQ5 기준 — Praat 정상 상한 1.04%
  shimmer: { worst: 3.81 },  // APQ3+RMS 기준 — Praat 정상 상한 3.81%
  hnr:     { floor: 5, range: 20 },
  f0Std:   { worst: 15 },
} as const;
