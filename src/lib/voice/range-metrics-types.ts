import type { VocalRangeProfile } from '@/lib/voice/vocal-range';

// ─── Passaggio ──────────────────────────────────────────

/** Voice-type-specific passaggio range in Hz */
export interface PassaggioRange {
  low: number;
  high: number;
}

// ─── Zone Stability ─────────────────────────────────────

/** Per-zone stability metrics */
export interface ZoneStability {
  avgJitter: number;
  avgShimmer: number;
  avgHnr: number;
  sampleCount: number;
}

// ─── Snapshot (all 6 metrics) ───────────────────────────

export interface RangeAwareMetricsSnapshot {
  /** 1. Range Position (0-100%) */
  rangePosition: number | null;

  /** 2. Zone Stability Profile */
  zoneStability: {
    low: ZoneStability;
    mid: ZoneStability;
    high: ZoneStability;
    weakestZone: 'low' | 'mid' | 'high' | null;
  };

  /** 3. Passaggio Smoothness (0-100) */
  passaggioSmoothness: number | null;
  passaggioRange: PassaggioRange;

  /** 4. Comfort Zone Utilization (0-100%) */
  comfortUtilization: number | null;

  /** 5. Edge Control Delta */
  edgeControlDelta: number | null;
  edgeStability: number | null;
  centerStability: number | null;

  /** 6. Vocal Effort Gradient */
  effortGradientSlope: number | null;
  effortInterpretation: 'relaxed' | 'neutral' | 'straining' | null;
}

// ─── Frame-level accumulation ───────────────────────────

export interface RangeMetricFrame {
  f0: number;
  midi: number;
  rangePosition: number;
  jitter: number | null;
  shimmer: number | null;
  hnr: number;
  stabilityScore: number;
  alphaRatio: number | null;
  isVoiced: boolean;
}

// ─── Session persistence ────────────────────────────────

export interface RangeMetricsSessionSummary {
  date: string;
  edgeControlDelta: number | null;
  zoneStability: {
    low: number;
    mid: number;
    high: number;
  };
  effortSlope: number | null;
}

// Re-export for convenience
export type { VocalRangeProfile };
