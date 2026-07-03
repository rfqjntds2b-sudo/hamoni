import { describe, it, expect } from 'vitest';
import {
  RangeMetricsAnalyzer,
  classifyZone,
  linearRegressionSlope,
  zoneQualityScore,
  frequencyToMidiRaw,
} from '@/lib/voice/range-metrics';
import type { VocalRangeProfile } from '@/lib/voice/vocal-range';
import type { RangeMetricFrame, ZoneStability } from '@/lib/voice/range-metrics-types';

// ─── Test fixtures ──────────────────────────────────────

const baritoneProfile: VocalRangeProfile = {
  modalLow: 'A2',
  modalHigh: 'A4',
  modalLowHz: 110,
  modalHighHz: 440,
  fullHigh: 'A5',
  fullHighHz: 880,
  modalRangeOctaves: 2,
  fullRangeOctaves: 3,
  comfortLow: 'C3',
  comfortHigh: 'F4',
  voiceType: 'Baritone',
  voiceTypeLabel: '바리톤',
  gender: 'male',
  measuredAt: '2026-01-01T00:00:00Z',
  sampleCount: 100,
};

function makeFrame(overrides: Partial<RangeMetricFrame> = {}): RangeMetricFrame {
  return {
    f0: 220,
    midi: 57,
    rangePosition: 50,
    jitter: 1.5,
    shimmer: 3.0,
    hnr: 18,
    stabilityScore: 0.7,
    alphaRatio: -2.0,
    isVoiced: true,
    ...overrides,
  };
}

/** Push N identical frames (EMA converges to constant input) */
function pushN(analyzer: RangeMetricsAnalyzer, n: number, overrides: Partial<RangeMetricFrame> = {}) {
  for (let i = 0; i < n; i++) analyzer.pushFrame(makeFrame(overrides));
}

// ─── computeRangePosition ───────────────────────────────

describe('computeRangePosition', () => {
  const analyzer = new RangeMetricsAnalyzer(baritoneProfile);

  it('returns 0% at modalLow (A2 = 110Hz)', () => {
    expect(analyzer.computeRangePosition(110)).toBeCloseTo(0, 0);
  });

  it('returns 100% at modalHigh (A4 = 440Hz)', () => {
    expect(analyzer.computeRangePosition(440)).toBeCloseTo(100, 0);
  });

  it('returns ~50% at midpoint (A3 = 220Hz)', () => {
    expect(analyzer.computeRangePosition(220)).toBeCloseTo(50, 0);
  });

  it('returns negative for below range', () => {
    const pos = analyzer.computeRangePosition(80);
    expect(pos).not.toBeNull();
    expect(pos!).toBeLessThan(0);
  });

  it('returns >100 for above range', () => {
    const pos = analyzer.computeRangePosition(600);
    expect(pos).not.toBeNull();
    expect(pos!).toBeGreaterThan(100);
  });

  it('returns null for invalid f0', () => {
    expect(analyzer.computeRangePosition(0)).toBeNull();
    expect(analyzer.computeRangePosition(-1)).toBeNull();
  });
});

// ─── classifyZone ───────────────────────────────────────

describe('classifyZone', () => {
  it('classifies 0-33 as low', () => {
    expect(classifyZone(0)).toBe('low');
    expect(classifyZone(20)).toBe('low');
    expect(classifyZone(33)).toBe('low');
  });

  it('classifies 34-66 as mid', () => {
    expect(classifyZone(34)).toBe('mid');
    expect(classifyZone(50)).toBe('mid');
    expect(classifyZone(66)).toBe('mid');
  });

  it('classifies 67-100 as high', () => {
    expect(classifyZone(67)).toBe('high');
    expect(classifyZone(85)).toBe('high');
    expect(classifyZone(100)).toBe('high');
  });
});

// ─── Zone stability (EMA-based) ─────────────────────────

describe('zone stability', () => {
  it('converges to constant values with repeated input', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    // Push enough frames for EMA to converge to constant input
    pushN(analyzer, 20, { rangePosition: 15, jitter: 2.0, shimmer: 4.0, hnr: 15 });
    pushN(analyzer, 20, { rangePosition: 80, jitter: 3.0, shimmer: 5.0, hnr: 12 });

    const snap = analyzer.getSnapshot();
    expect(snap.zoneStability.low.avgJitter).toBeCloseTo(2.0, 0);
    expect(snap.zoneStability.low.avgShimmer).toBeCloseTo(4.0, 0);
    expect(snap.zoneStability.low.avgHnr).toBeCloseTo(15, 0);
    expect(snap.zoneStability.low.sampleCount).toBe(20);

    expect(snap.zoneStability.high.avgJitter).toBeCloseTo(3.0, 0);
    expect(snap.zoneStability.high.avgHnr).toBeCloseTo(12, 0);
    expect(snap.zoneStability.high.sampleCount).toBe(20);

    expect(snap.zoneStability.mid.sampleCount).toBe(0);
  });

  it('responds to changes via EMA', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    // Start with high jitter in low zone
    pushN(analyzer, 10, { rangePosition: 15, jitter: 3.5, shimmer: 3.0, hnr: 15 });
    const snap1 = analyzer.getSnapshot();

    // Switch to low jitter — EMA should start dropping
    pushN(analyzer, 5, { rangePosition: 15, jitter: 0.5, shimmer: 3.0, hnr: 15 });
    const snap2 = analyzer.getSnapshot();

    expect(snap2.zoneStability.low.avgJitter).toBeLessThan(snap1.zoneStability.low.avgJitter);
  });

  it('identifies weakest zone from first sample', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    // High zone: bad metrics (1 sample enough for weakestZone)
    pushN(analyzer, 1, { rangePosition: 80, jitter: 3.5, shimmer: 7.0, hnr: 8 });
    // Low zone: good metrics
    pushN(analyzer, 1, { rangePosition: 15, jitter: 0.5, shimmer: 1.0, hnr: 22 });

    const snap = analyzer.getSnapshot();
    expect(snap.zoneStability.weakestZone).toBe('high');
  });

  it('returns null weakest when no zones have data', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    const snap = analyzer.getSnapshot();
    expect(snap.zoneStability.weakestZone).toBeNull();
  });
});

// ─── Passaggio smoothness ───────────────────────────────

describe('passaggio smoothness', () => {
  it('returns null with insufficient passaggio frames (<3)', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 2, { f0: 230, rangePosition: 50 });
    expect(analyzer.getSnapshot().passaggioSmoothness).toBeNull();
  });

  it('gives high score for stable passaggio crossing', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 15, { f0: 233, hnr: 20, rangePosition: 50 });
    pushN(analyzer, 10, { f0: 300, hnr: 20, rangePosition: 70 });
    const snap = analyzer.getSnapshot();
    expect(snap.passaggioSmoothness).not.toBeNull();
    expect(snap.passaggioSmoothness!).toBeGreaterThan(70);
  });

  it('gives low score for unstable passaggio', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    for (let i = 0; i < 15; i++) {
      const f0 = i % 2 === 0 ? 220 : 247;
      analyzer.pushFrame(makeFrame({ f0, hnr: 8, rangePosition: 50 }));
    }
    pushN(analyzer, 10, { f0: 300, hnr: 22, rangePosition: 70 });
    const snap = analyzer.getSnapshot();
    expect(snap.passaggioSmoothness).not.toBeNull();
    expect(snap.passaggioSmoothness!).toBeLessThan(50);
  });
});

// ─── Comfort utilization (EMA-based) ────────────────────

describe('comfort utilization', () => {
  it('returns null before any data', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    expect(analyzer.getSnapshot().comfortUtilization).toBeNull();
  });

  it('shows ~100% when sustained in comfort zone', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    // Comfort: C3 (~130.81Hz) to F4 (~349.23Hz)
    pushN(analyzer, 20, { f0: 200, rangePosition: 50 });
    const snap = analyzer.getSnapshot();
    expect(snap.comfortUtilization).toBeGreaterThanOrEqual(95);
  });

  it('drops when leaving comfort zone', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 20, { f0: 200, rangePosition: 50 }); // in comfort
    const before = analyzer.getSnapshot().comfortUtilization!;

    pushN(analyzer, 10, { f0: 115, rangePosition: 10 }); // out of comfort
    const after = analyzer.getSnapshot().comfortUtilization!;

    expect(after).toBeLessThan(before);
    expect(after).toBeLessThan(70);
  });

  it('shows value from first frame', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 1, { f0: 200, rangePosition: 50 });
    const snap = analyzer.getSnapshot();
    expect(snap.comfortUtilization).not.toBeNull();
    expect(snap.comfortUtilization).toBe(100);
  });
});

// ─── Edge control delta (EMA-based) ─────────────────────

describe('edge control delta', () => {
  it('returns null with no edge frames', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 10, { rangePosition: 50, stabilityScore: 0.8 });
    expect(analyzer.getSnapshot().edgeControlDelta).toBeNull();
  });

  it('returns null with no center frames', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 10, { rangePosition: 10, stabilityScore: 0.5 });
    expect(analyzer.getSnapshot().edgeControlDelta).toBeNull();
  });

  it('computes delta from EMA-smoothed values', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 20, { rangePosition: 50, stabilityScore: 0.8 });
    pushN(analyzer, 20, { rangePosition: 10, stabilityScore: 0.5 });

    const snap = analyzer.getSnapshot();
    expect(snap.edgeControlDelta).not.toBeNull();
    // EMA converges: center≈80, edge≈50, delta≈30
    expect(snap.centerStability).toBeCloseTo(80, -1);
    expect(snap.edgeStability).toBeCloseTo(50, -1);
    expect(snap.edgeControlDelta).toBeCloseTo(30, -1);
  });

  it('shows value from first frame of each partition', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 1, { rangePosition: 50, stabilityScore: 0.7 });
    pushN(analyzer, 1, { rangePosition: 10, stabilityScore: 0.4 });
    const snap = analyzer.getSnapshot();
    expect(snap.edgeControlDelta).not.toBeNull();
    expect(snap.centerStability).toBe(70);
    expect(snap.edgeStability).toBe(40);
  });
});

// ─── Effort gradient ────────────────────────────────────

describe('effort gradient', () => {
  it('returns null with <5 data points', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 4, { rangePosition: 50, alphaRatio: -2 });
    expect(analyzer.getSnapshot().effortGradientSlope).toBeNull();
  });

  it('detects positive slope (straining)', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    for (let i = 0; i < 20; i++) {
      const pos = i * 5;
      analyzer.pushFrame(makeFrame({ rangePosition: pos, alphaRatio: -3 + pos * 0.05 }));
    }
    const snap = analyzer.getSnapshot();
    expect(snap.effortGradientSlope).not.toBeNull();
    expect(snap.effortGradientSlope!).toBeGreaterThan(0.02);
    expect(snap.effortInterpretation).toBe('straining');
  });

  it('detects negative slope (relaxed)', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    for (let i = 0; i < 20; i++) {
      const pos = i * 5;
      analyzer.pushFrame(makeFrame({ rangePosition: pos, alphaRatio: 2 - pos * 0.04 }));
    }
    const snap = analyzer.getSnapshot();
    expect(snap.effortGradientSlope!).toBeLessThan(-0.01);
    expect(snap.effortInterpretation).toBe('relaxed');
  });

  it('detects flat slope (neutral)', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    for (let i = 0; i < 20; i++) {
      analyzer.pushFrame(makeFrame({ rangePosition: i * 5, alphaRatio: -1.5 }));
    }
    const snap = analyzer.getSnapshot();
    expect(snap.effortGradientSlope!).toBeCloseTo(0, 1);
    expect(snap.effortInterpretation).toBe('neutral');
  });

  it('uses bounded buffer (old data drops off)', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    // Push 40 flat frames (buffer=30, first 10 will be evicted)
    for (let i = 0; i < 40; i++) {
      analyzer.pushFrame(makeFrame({ rangePosition: 50, alphaRatio: 0 }));
    }
    // Then push 10 steep frames — should dominate since buffer holds recent 30
    for (let i = 0; i < 10; i++) {
      analyzer.pushFrame(makeFrame({ rangePosition: i * 10, alphaRatio: i * 0.5 }));
    }
    const snap = analyzer.getSnapshot();
    // The flat frames still dominate (20 flat + 10 steep in buffer)
    // but the slope should be noticeably positive
    expect(snap.effortGradientSlope).not.toBeNull();
  });
});

// ─── linearRegressionSlope ──────────────────────────────

describe('linearRegressionSlope', () => {
  it('returns correct slope for perfect line', () => {
    expect(linearRegressionSlope([0, 1, 2, 3, 4], [0, 2, 4, 6, 8])).toBeCloseTo(2);
  });

  it('returns 0 for constant y', () => {
    expect(linearRegressionSlope([0, 1, 2, 3, 4], [5, 5, 5, 5, 5])).toBeCloseTo(0);
  });

  it('returns 0 for fewer than 2 points', () => {
    expect(linearRegressionSlope([1], [2])).toBe(0);
    expect(linearRegressionSlope([], [])).toBe(0);
  });
});

// ─── getPassaggioRange ──────────────────────────────────

describe('getPassaggioRange', () => {
  it('returns correct range for Bass', () => {
    expect(RangeMetricsAnalyzer.getPassaggioRange('Bass')).toEqual({ low: 164, high: 196 });
  });
  it('returns correct range for Baritone', () => {
    expect(RangeMetricsAnalyzer.getPassaggioRange('Baritone')).toEqual({ low: 220, high: 247 });
  });
  it('returns correct range for Tenor', () => {
    expect(RangeMetricsAnalyzer.getPassaggioRange('Tenor')).toEqual({ low: 262, high: 330 });
  });
  it('returns correct range for Alto', () => {
    expect(RangeMetricsAnalyzer.getPassaggioRange('Alto')).toEqual({ low: 294, high: 349 });
  });
  it('returns correct range for Mezzo-Soprano', () => {
    expect(RangeMetricsAnalyzer.getPassaggioRange('Mezzo-Soprano')).toEqual({ low: 330, high: 392 });
  });
  it('returns correct range for Soprano', () => {
    expect(RangeMetricsAnalyzer.getPassaggioRange('Soprano')).toEqual({ low: 349, high: 440 });
  });
  it('returns default for unknown voice type', () => {
    expect(RangeMetricsAnalyzer.getPassaggioRange('Unknown')).toEqual({ low: 260, high: 360 });
  });
});

// ─── zoneQualityScore ───────────────────────────────────

describe('zoneQualityScore', () => {
  it('returns 0 for zone with no samples', () => {
    expect(zoneQualityScore({ avgJitter: 0, avgShimmer: 0, avgHnr: 0, sampleCount: 0 })).toBe(0);
  });
  it('returns high score for good metrics', () => {
    expect(zoneQualityScore({ avgJitter: 0.5, avgShimmer: 1.0, avgHnr: 22, sampleCount: 10 })).toBeGreaterThan(80);
  });
  it('returns low score for bad metrics', () => {
    expect(zoneQualityScore({ avgJitter: 3.5, avgShimmer: 7.0, avgHnr: 7, sampleCount: 10 })).toBeLessThan(25);
  });
});

// ─── reset ──────────────────────────────────────────────

describe('reset', () => {
  it('clears all accumulated data', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 20, { rangePosition: 50, f0: 200 });

    analyzer.reset();
    const snap = analyzer.getSnapshot();

    expect(snap.rangePosition).toBeNull();
    expect(snap.zoneStability.low.sampleCount).toBe(0);
    expect(snap.zoneStability.mid.sampleCount).toBe(0);
    expect(snap.zoneStability.high.sampleCount).toBe(0);
    expect(snap.zoneStability.weakestZone).toBeNull();
    expect(snap.passaggioSmoothness).toBeNull();
    expect(snap.comfortUtilization).toBeNull();
    expect(snap.edgeControlDelta).toBeNull();
    expect(snap.effortGradientSlope).toBeNull();
  });
});

// ─── frequencyToMidiRaw ─────────────────────────────────

describe('frequencyToMidiRaw', () => {
  it('converts A4 (440Hz) to MIDI 69', () => {
    expect(frequencyToMidiRaw(440)).toBeCloseTo(69);
  });
  it('converts A3 (220Hz) to MIDI 57', () => {
    expect(frequencyToMidiRaw(220)).toBeCloseTo(57);
  });
  it('returns non-integer values (sub-semitone)', () => {
    const midi = frequencyToMidiRaw(445);
    expect(midi).toBeGreaterThan(69);
    expect(midi).toBeLessThan(70);
    expect(midi % 1).not.toBeCloseTo(0);
  });
});

// ─── Responsiveness (the whole point of the rewrite) ────

describe('responsiveness', () => {
  it('zone stability shows value from first frame', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 1, { rangePosition: 50, jitter: 2.0, shimmer: 3.0, hnr: 18 });
    const snap = analyzer.getSnapshot();
    expect(snap.zoneStability.mid.sampleCount).toBe(1);
    expect(snap.zoneStability.mid.avgJitter).toBeCloseTo(2.0);
    expect(snap.zoneStability.weakestZone).toBe('mid'); // only zone with data
  });

  it('comfort utilization shows value from first frame', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 1, { f0: 200, rangePosition: 50 });
    expect(analyzer.getSnapshot().comfortUtilization).toBe(100);
  });

  it('edge control shows value from first edge+center frames', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 1, { rangePosition: 50, stabilityScore: 0.8 });
    pushN(analyzer, 1, { rangePosition: 5, stabilityScore: 0.4 });
    const snap = analyzer.getSnapshot();
    expect(snap.edgeControlDelta).not.toBeNull();
  });

  it('effort gradient shows value from 5 pairs', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    for (let i = 0; i < 5; i++) {
      analyzer.pushFrame(makeFrame({ rangePosition: i * 20, alphaRatio: i * 0.5 }));
    }
    expect(analyzer.getSnapshot().effortGradientSlope).not.toBeNull();
  });

  it('cached snapshot avoids redundant computation', () => {
    const analyzer = new RangeMetricsAnalyzer(baritoneProfile);
    pushN(analyzer, 5, { rangePosition: 50 });
    const snap1 = analyzer.getSnapshot();
    const snap2 = analyzer.getSnapshot(); // no new pushFrame → same object
    expect(snap1).toBe(snap2);
  });
});
