import { clamp, standardDeviation, EmaFilter, SCORE_THRESHOLDS } from './types';
import type { StabilityMetrics } from './types';
import { STATUS } from '@/lib/design-tokens';

export class StabilityAnalyzer {
  private f0Buffer: number[] = [];
  private readonly F0_BUFFER_SIZE = 10;
  private _frameId = 0;
  private ema = {
    jitter: new EmaFilter(0.3),
    shimmer: new EmaFilter(0.3),
    hnr: new EmaFilter(0.3),
    f0Stability: new EmaFilter(0.3),
    h1h2: new EmaFilter(0.3),
    tilt: new EmaFilter(0.3),
    overall: new EmaFilter(0.3),
  };

  compute(
    jitter: number | null,
    shimmer: number | null,
    hnrDb: number | null,
    f0: number | null,
    autocorrPeak: number,
    h1h2: number | null,
    alphaRatio: number | null,
    vibratoActive = false,
  ): StabilityMetrics {
    // F0 buffer
    if (f0 !== null) {
      this.f0Buffer.push(f0);
      if (this.f0Buffer.length > this.F0_BUFFER_SIZE) this.f0Buffer.shift();
    }
    const f0Std = this.f0Buffer.length >= 3 ? standardDeviation(this.f0Buffer) : null;

    // HNR from autocorr peak
    const r = clamp(autocorrPeak, 0.001, 0.999);
    const computedHnr = hnrDb ?? 10 * Math.log10(r / (1 - r));

    // Individual scores (0~1)
    const jitterWorst = SCORE_THRESHOLDS.jitter.worst;
    const shimmerWorst = SCORE_THRESHOLDS.shimmer.worst;
    const jitterScore = jitter !== null ? clamp(1 - jitter / jitterWorst, 0, 1) : null;
    const shimmerScore = shimmer !== null ? clamp(1 - shimmer / shimmerWorst, 0, 1) : null;
    const hnrScore = clamp((computedHnr - SCORE_THRESHOLDS.hnr.floor) / SCORE_THRESHOLDS.hnr.range, 0, 1);
    const f0StabScore = f0Std !== null ? clamp(1 - f0Std / SCORE_THRESHOLDS.f0Std.worst, 0, 1) : null;

    // H1-H2 and Tilt: informational only (style/taste), not included in stability score

    // Quality score — weight redistribution for null metrics
    let l1Sum = 0, l1Weight = 0;
    if (jitterScore !== null)  { l1Sum += 0.10 * jitterScore;  l1Weight += 0.10; }
    if (shimmerScore !== null) { l1Sum += 0.08 * shimmerScore;  l1Weight += 0.08; }
    l1Sum += 0.12 * hnrScore; l1Weight += 0.12;  // HNR always available
    if (f0StabScore !== null)  { l1Sum += 0.10 * f0StabScore;  l1Weight += 0.10; }
    const normalizedQuality = l1Weight > 0 ? l1Sum / l1Weight : 0;

    const raw = normalizedQuality;

    const smoothed = this.ema.overall.update(raw);

    // Color
    let color: string;
    if (smoothed >= 0.7) color = STATUS.success;
    else if (smoothed >= 0.4) color = STATUS.warn;
    else color = STATUS.fail;

    // Smooth individual metrics for display
    if (jitter !== null) this.ema.jitter.update(jitter);
    if (shimmer !== null) this.ema.shimmer.update(shimmer);
    this.ema.hnr.update(computedHnr);
    if (f0Std !== null) this.ema.f0Stability.update(f0Std);
    if (h1h2 !== null) this.ema.h1h2.update(h1h2);
    if (alphaRatio !== null) this.ema.tilt.update(alphaRatio);

    return {
      f0, jitter, shimmer, hnrDb: computedHnr, f0Std,
      h1h2, alphaRatio,
      stabilityScore: smoothed, color,
      frameId: ++this._frameId,
    };
  }

  getSmoothedDisplay() {
    return {
      jitter: this.ema.jitter.current,
      shimmer: this.ema.shimmer.current,
      hnr: this.ema.hnr.current,
      f0Stability: this.ema.f0Stability.current,
      h1h2: this.ema.h1h2.current,
      tilt: this.ema.tilt.current,
      overall: this.ema.overall.current,
    };
  }

  reset(): void {
    this.f0Buffer = [];
    Object.values(this.ema).forEach(e => e.reset());
  }
}
