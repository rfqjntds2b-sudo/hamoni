import { noteToMidi, midiToHz } from '@/lib/voice/vocal-range';
import { clamp, EmaFilter } from '@/lib/voice/types';
import type { VocalRangeProfile } from '@/lib/voice/vocal-range';
import type {
  PassaggioRange,
  ZoneStability,
  RangeAwareMetricsSnapshot,
  RangeMetricFrame,
} from './range-metrics-types';

// ─── Passaggio ranges by voice type ─────────────────────

const PASSAGGIO_RANGES: Record<string, PassaggioRange> = {
  Bass:            { low: 164, high: 196 },
  Baritone:        { low: 220, high: 247 },
  Tenor:           { low: 262, high: 330 },
  Alto:            { low: 294, high: 349 },
  'Mezzo-Soprano': { low: 330, high: 392 },
  Soprano:         { low: 349, high: 440 },
};

const DEFAULT_PASSAGGIO: PassaggioRange = { low: 260, high: 360 };

// ─── Constants ──────────────────────────────────────────

const EMA_ALPHA = 0.3;
const PASSAGGIO_F0_BUFFER = 20;
const EFFORT_BUFFER = 30;
const MIN_PASSAGGIO_FRAMES = 3;
const MIN_EFFORT_PAIRS = 5;

// ─── Zone EMA accumulator ───────────────────────────────

interface ZoneEma {
  jitter: EmaFilter;
  shimmer: EmaFilter;
  hnr: EmaFilter;
  count: number;
}

function createZoneEma(): ZoneEma {
  return {
    jitter: new EmaFilter(EMA_ALPHA),
    shimmer: new EmaFilter(EMA_ALPHA),
    hnr: new EmaFilter(EMA_ALPHA),
    count: 0,
  };
}

function zoneEmaToStability(z: ZoneEma): ZoneStability {
  return {
    avgJitter: z.count > 0 ? z.jitter.current : 0,
    avgShimmer: z.count > 0 ? z.shimmer.current : 0,
    avgHnr: z.count > 0 ? z.hnr.current : 0,
    sampleCount: z.count,
  };
}

// ─── Helpers ────────────────────────────────────────────

/** Raw MIDI without rounding (sub-semitone precision) */
function frequencyToMidiRaw(f0: number): number {
  return 12 * Math.log2(f0 / 440) + 69;
}

function classifyZone(position: number): 'low' | 'mid' | 'high' {
  if (position <= 33) return 'low';
  if (position <= 66) return 'mid';
  return 'high';
}

/** Simple least-squares linear regression slope */
function linearRegressionSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Compute zone quality score (0-100) from zone stability. Higher = better stability. */
function zoneQualityScore(zone: ZoneStability): number {
  if (zone.sampleCount === 0) return 0;
  const jScore = clamp(1 - zone.avgJitter / 4, 0, 1);
  const sScore = clamp(1 - zone.avgShimmer / 8, 0, 1);
  const hScore = clamp((zone.avgHnr - 5) / 20, 0, 1);
  return Math.round((jScore * 0.35 + sScore * 0.30 + hScore * 0.35) * 100);
}

// ─── Main Analyzer Class ────────────────────────────────

export class RangeMetricsAnalyzer {
  private readonly modalLowMidi: number;
  private readonly modalHighMidi: number;
  private readonly modalSpan: number;
  private readonly comfortLowHz: number;
  private readonly comfortHighHz: number;
  private readonly passaggioRange: PassaggioRange;

  // Zone EMAs (replaces cumulative sum/count — responds in real-time)
  private zones = { low: createZoneEma(), mid: createZoneEma(), high: createZoneEma() };

  // Comfort: EMA on binary 0/100 signal (replaces frame count ratio)
  private comfortEma = new EmaFilter(EMA_ALPHA);
  private hasComfortData = false;

  // Edge/Center: separate EMAs (replaces cumulative sum/count)
  private edgeEma = new EmaFilter(EMA_ALPHA);
  private centerEma = new EmaFilter(EMA_ALPHA);
  private edgeCount = 0;
  private centerCount = 0;

  // Effort: circular buffer, max 30 pairs (replaces unbounded arrays)
  private effortBuf: Array<{ x: number; y: number }> = [];

  // Passaggio: F0 circular buffer + HNR EMAs (replaces unbounded arrays)
  private passF0Buf: number[] = [];
  private passHnrEma = new EmaFilter(EMA_ALPHA);
  private outsideHnrEma = new EmaFilter(EMA_ALPHA);
  private passCount = 0;
  private outsideCount = 0;

  // Display
  private lastRangePosition: number | null = null;

  // Cached snapshot (avoids recomputation when getSnapshot called without new data)
  private dirty = false;
  private cache: RangeAwareMetricsSnapshot;

  constructor(private readonly profile: VocalRangeProfile) {
    this.modalLowMidi = noteToMidi(profile.modalLow);
    this.modalHighMidi = noteToMidi(profile.modalHigh);
    this.modalSpan = this.modalHighMidi - this.modalLowMidi;

    this.comfortLowHz = midiToHz(noteToMidi(profile.comfortLow));
    this.comfortHighHz = midiToHz(noteToMidi(profile.comfortHigh));

    this.passaggioRange = RangeMetricsAnalyzer.getPassaggioRange(profile.voiceType);
    this.cache = this.buildSnapshot();
  }

  // ── Static lookups ──

  static getPassaggioRange(voiceType: string): PassaggioRange {
    return PASSAGGIO_RANGES[voiceType] ?? DEFAULT_PASSAGGIO;
  }

  static getPassaggioRangeForProfile(profile: VocalRangeProfile): PassaggioRange {
    return RangeMetricsAnalyzer.getPassaggioRange(profile.voiceType);
  }

  // ── Range position ──

  computeRangePosition(f0Hz: number): number | null {
    if (this.modalSpan <= 0 || f0Hz <= 0) return null;
    const midi = frequencyToMidiRaw(f0Hz);
    return ((midi - this.modalLowMidi) / this.modalSpan) * 100;
  }

  // ── Frame accumulation (all O(1) per call) ──

  pushFrame(frame: RangeMetricFrame): void {
    if (!frame.isVoiced || frame.f0 <= 0) return;

    this.lastRangePosition = frame.rangePosition;
    this.dirty = true;

    // 1. Zone EMA update
    const clampedPos = clamp(frame.rangePosition, 0, 100);
    const zone = classifyZone(clampedPos);
    const z = this.zones[zone];
    if (frame.jitter !== null) z.jitter.update(frame.jitter);
    if (frame.shimmer !== null) z.shimmer.update(frame.shimmer);
    z.hnr.update(frame.hnr);
    z.count++;

    // 2. Comfort EMA (binary signal: in comfort → 100, out → 0)
    this.comfortEma.update(
      frame.f0 >= this.comfortLowHz && frame.f0 <= this.comfortHighHz ? 100 : 0,
    );
    this.hasComfortData = true;

    // 3. Edge / Center EMA
    if (clampedPos < 15 || clampedPos > 85) {
      this.edgeEma.update(frame.stabilityScore * 100);
      this.edgeCount++;
    } else {
      this.centerEma.update(frame.stabilityScore * 100);
      this.centerCount++;
    }

    // 4. Effort circular buffer (bounded at EFFORT_BUFFER)
    if (frame.alphaRatio !== null) {
      if (this.effortBuf.length >= EFFORT_BUFFER) this.effortBuf.shift();
      this.effortBuf.push({ x: frame.rangePosition, y: frame.alphaRatio });
    }

    // 5. Passaggio tracking (F0 buffer bounded, HNR via EMA)
    if (frame.f0 >= this.passaggioRange.low && frame.f0 <= this.passaggioRange.high) {
      if (this.passF0Buf.length >= PASSAGGIO_F0_BUFFER) this.passF0Buf.shift();
      this.passF0Buf.push(frame.f0);
      this.passHnrEma.update(frame.hnr);
      this.passCount++;
    } else {
      this.outsideHnrEma.update(frame.hnr);
      this.outsideCount++;
    }
  }

  // ── Snapshot (returns cached if no new data) ──

  getSnapshot(): RangeAwareMetricsSnapshot {
    if (this.dirty) {
      this.cache = this.buildSnapshot();
      this.dirty = false;
    }
    return this.cache;
  }

  private buildSnapshot(): RangeAwareMetricsSnapshot {
    return {
      rangePosition: this.lastRangePosition !== null
        ? Math.round(clamp(this.lastRangePosition, -10, 110))
        : null,
      zoneStability: this.computeZoneStability(),
      passaggioSmoothness: this.computePassaggioSmoothness(),
      passaggioRange: this.passaggioRange,
      comfortUtilization: this.computeComfortUtilization(),
      ...this.computeEdgeControlDelta(),
      ...this.computeEffortGradient(),
    };
  }

  // ── Individual metric computations ──

  private computeZoneStability() {
    const low = zoneEmaToStability(this.zones.low);
    const mid = zoneEmaToStability(this.zones.mid);
    const high = zoneEmaToStability(this.zones.high);

    // Weakest = lowest quality score among zones with ≥1 sample
    let weakestZone: 'low' | 'mid' | 'high' | null = null;
    let worstScore = Infinity;
    for (const [key, stab] of [['low', low], ['mid', mid], ['high', high]] as const) {
      if (stab.sampleCount < 1) continue;
      const score = zoneQualityScore(stab);
      if (score < worstScore) { worstScore = score; weakestZone = key; }
    }

    return { low, mid, high, weakestZone };
  }

  private computePassaggioSmoothness(): number | null {
    if (this.passCount < MIN_PASSAGGIO_FRAMES) return null;

    // F0 stability from bounded circular buffer
    const buf = this.passF0Buf;
    const n = buf.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += buf[i];
    const mean = sum / n;
    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += (buf[i] - mean) ** 2;
    const f0Std = Math.sqrt(varSum / n);
    const f0Score = clamp(1 - f0Std / 30, 0, 1) * 50;

    // HNR dip from EMAs (O(1) — just read current values)
    const passHnr = this.passHnrEma.current;
    const outsideHnr = this.outsideCount >= 1 ? this.outsideHnrEma.current : passHnr;
    const hnrDip = Math.max(0, outsideHnr - passHnr);
    const hnrScore = clamp(1 - hnrDip / 10, 0, 1) * 50;

    return Math.round(f0Score + hnrScore);
  }

  private computeComfortUtilization(): number | null {
    if (!this.hasComfortData) return null;
    return Math.round(this.comfortEma.current);
  }

  private computeEdgeControlDelta() {
    if (this.edgeCount < 1 || this.centerCount < 1) {
      return { edgeControlDelta: null, edgeStability: null, centerStability: null };
    }
    const edgeAvg = Math.round(this.edgeEma.current);
    const centerAvg = Math.round(this.centerEma.current);
    return {
      edgeControlDelta: centerAvg - edgeAvg,
      edgeStability: edgeAvg,
      centerStability: centerAvg,
    };
  }

  private computeEffortGradient() {
    const n = this.effortBuf.length;
    if (n < MIN_EFFORT_PAIRS) {
      return { effortGradientSlope: null, effortInterpretation: null };
    }

    // Inline regression over bounded buffer (max 30 elements, no array allocation)
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      const { x, y } = this.effortBuf[i];
      sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
    }
    const denom = n * sumXX - sumX * sumX;
    const slope = Math.abs(denom) < 1e-12 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const roundedSlope = Math.round(slope * 100) / 100;

    let interpretation: 'relaxed' | 'neutral' | 'straining';
    if (slope > 0.02) interpretation = 'straining';
    else if (slope < -0.01) interpretation = 'relaxed';
    else interpretation = 'neutral';

    return { effortGradientSlope: roundedSlope, effortInterpretation: interpretation };
  }

  // ── Reset ──

  reset(): void {
    this.zones = { low: createZoneEma(), mid: createZoneEma(), high: createZoneEma() };
    this.comfortEma = new EmaFilter(EMA_ALPHA);
    this.hasComfortData = false;
    this.edgeEma = new EmaFilter(EMA_ALPHA);
    this.centerEma = new EmaFilter(EMA_ALPHA);
    this.edgeCount = 0;
    this.centerCount = 0;
    this.effortBuf = [];
    this.passF0Buf = [];
    this.passHnrEma = new EmaFilter(EMA_ALPHA);
    this.outsideHnrEma = new EmaFilter(EMA_ALPHA);
    this.passCount = 0;
    this.outsideCount = 0;
    this.lastRangePosition = null;
    this.dirty = false;
    this.cache = this.buildSnapshot();
  }
}

// Export helpers for testing
export { classifyZone, linearRegressionSlope, zoneQualityScore, frequencyToMidiRaw };
