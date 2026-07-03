import { describe, it, expect } from 'vitest';
import {
  analyzeToneAxis,
  analyzeExpressionAxis,
  calculateSpectrums,
} from '@/lib/voice-profile/profile-analyzer';
import { getVoiceType } from '@/lib/voice-profile/type-classifier';
import { generateDescription } from '@/lib/voice-profile/description-generator';
import type { TestPhaseData, AllTestData, ToneAxis, ExpressionAxis } from '@/lib/voice-profile/types';

// ============================================================
// Test Helpers
// ============================================================

function createTestData(overrides?: Partial<TestPhaseData>): TestPhaseData {
  return {
    f0Values: Array(50).fill(200),
    rmsValues: Array(50).fill(0.15),
    jitterValues: Array(50).fill(1.0),
    shimmerValues: Array(50).fill(3.0),
    hnrValues: Array(50).fill(18),
    isVoicedValues: Array(50).fill(true),
    ...overrides,
  };
}

function createAllTestData(overrides?: {
  sustained?: Partial<TestPhaseData>;
  rangeSweep?: Partial<TestPhaseData>;
  expression?: Partial<TestPhaseData>;
}): AllTestData {
  return {
    sustained: createTestData(overrides?.sustained),
    rangeSweep: createTestData(overrides?.rangeSweep),
    expression: createTestData(overrides?.expression),
  };
}

// ============================================================
// analyzeToneAxis
// ============================================================

describe('analyzeToneAxis', () => {
  it('returns "clear" for high HNR + high F0', () => {
    const data = createTestData({
      hnrValues: Array(50).fill(20),
      f0Values: Array(50).fill(300),
    });
    const result = analyzeToneAxis(data);
    expect(result.axis).toBe('clear');
  });

  it('returns "warm" for high HNR + low F0 (but not deep)', () => {
    // medianF0 must be <= 250 (not high pitch) AND lowFreqRatio must be <= 0.7
    // Use F0 around 220: below 250 threshold, but mix some above to keep lowFreqRatio ~0.6
    const f0Mix = [...Array(30).fill(220), ...Array(20).fill(260)];
    const data = createTestData({
      hnrValues: Array(50).fill(18),
      f0Values: f0Mix,
    });
    const result = analyzeToneAxis(data);
    expect(result.axis).toBe('warm');
  });

  it('returns "deep" for low F0 + high low-freq ratio', () => {
    // All F0 below 250 → lowFreqRatio=1.0, and HNR high enough to avoid husky
    // noisiness = 1 - 15/25 = 0.4 → NOT > 0.4, so passes husky check
    const data = createTestData({
      f0Values: Array(50).fill(120),
      hnrValues: Array(50).fill(15),
    });
    const result = analyzeToneAxis(data);
    expect(result.axis).toBe('deep');
  });

  it('returns "husky" for low HNR', () => {
    // Very low HNR → noisiness > 0.4 → "husky"
    const data = createTestData({
      hnrValues: Array(50).fill(3),
    });
    const result = analyzeToneAxis(data);
    expect(result.axis).toBe('husky');
  });

  it('returns a valid axis for empty/no-voice data (fallback)', () => {
    const data = createTestData({
      f0Values: [],
      rmsValues: [],
      jitterValues: [],
      shimmerValues: [],
      hnrValues: [],
      isVoicedValues: [],
    });
    const result = analyzeToneAxis(data);
    expect(['clear', 'warm', 'deep', 'husky']).toContain(result.axis);
  });

  it('includes metrics in result', () => {
    const data = createTestData();
    const result = analyzeToneAxis(data);
    expect(result.metrics).toBeDefined();
    expect(typeof result.metrics.medianHnr).toBe('number');
    expect(typeof result.metrics.medianF0).toBe('number');
    expect(typeof result.metrics.noisiness).toBe('number');
    expect(typeof result.metrics.lowFreqRatio).toBe('number');
  });
});

// ============================================================
// analyzeExpressionAxis
// ============================================================

describe('analyzeExpressionAxis', () => {
  it('returns "flame" for high dynamic range + high RMS CV', () => {
    // Create RMS values with huge variation for high dynamic range + CV
    const lowRms = Array(25).fill(0.02);
    const highRms = Array(25).fill(0.5);
    const rmsValues = [...lowRms, ...highRms];
    const data = createTestData({
      rmsValues,
      f0Values: Array(50).fill(200),
    });
    const result = analyzeExpressionAxis(data);
    expect(result.axis).toBe('flame');
  });

  it('returns "wave" for high vibrato ratio', () => {
    // Create F0 values with strong oscillation (>3Hz delta, direction changes)
    const f0Values: number[] = [];
    for (let i = 0; i < 50; i++) {
      f0Values.push(200 + Math.sin(i * 1.2) * 20); // large amplitude, fast oscillation
    }
    // Moderate RMS variation to pass RMS CV floor (>0.12)
    const rmsValues: number[] = [];
    for (let i = 0; i < 50; i++) {
      rmsValues.push(0.12 + Math.sin(i * 0.5) * 0.04);
    }
    const data = createTestData({
      f0Values,
      rmsValues,
    });
    const result = analyzeExpressionAxis(data);
    expect(result.axis).toBe('wave');
  });

  it('returns "wind" for low RMS CV and no vibrato', () => {
    const data = createTestData({
      rmsValues: Array(50).fill(0.15),
      f0Values: Array(50).fill(200),
    });
    const result = analyzeExpressionAxis(data);
    expect(result.axis).toBe('wind');
  });

  it('returns a valid axis for empty/no-voice data (fallback)', () => {
    const data = createTestData({
      f0Values: [],
      rmsValues: [],
      jitterValues: [],
      shimmerValues: [],
      hnrValues: [],
      isVoicedValues: [],
    });
    const result = analyzeExpressionAxis(data);
    expect(['wind', 'flame', 'wave']).toContain(result.axis);
  });

  it('includes metrics in result', () => {
    const data = createTestData();
    const result = analyzeExpressionAxis(data);
    expect(result.metrics).toBeDefined();
    expect(typeof result.metrics.dynamicRangeDb).toBe('number');
    expect(typeof result.metrics.rmsCV).toBe('number');
    expect(typeof result.metrics.vibratoRatio).toBe('number');
  });
});

// ============================================================
// calculateSpectrums
// ============================================================

describe('calculateSpectrums', () => {
  it('returns values between 0 and 1', () => {
    const allData = createAllTestData();
    const toneMetrics = { medianF0: 200, medianHnr: 15, noisiness: 0.3, lowFreqRatio: 0.4 };
    const exprMetrics = { dynamicRangeDb: 8, rmsCV: 0.2, vibratoRatio: 0.1 };
    const result = calculateSpectrums(allData, toneMetrics, exprMetrics);
    expect(result.temperature).toBeGreaterThanOrEqual(0);
    expect(result.temperature).toBeLessThanOrEqual(1);
    expect(result.range).toBeGreaterThanOrEqual(0);
    expect(result.range).toBeLessThanOrEqual(1);
    expect(result.expression).toBeGreaterThanOrEqual(0);
    expect(result.expression).toBeLessThanOrEqual(1);
  });

  it('low F0 results in higher temperature (warm)', () => {
    const allData = createAllTestData();
    const lowF0Metrics = { medianF0: 100, medianHnr: 15, noisiness: 0.3, lowFreqRatio: 0.8 };
    const highF0Metrics = { medianF0: 350, medianHnr: 15, noisiness: 0.3, lowFreqRatio: 0.1 };
    const exprMetrics = { dynamicRangeDb: 8, rmsCV: 0.2, vibratoRatio: 0.1 };

    const lowResult = calculateSpectrums(allData, lowF0Metrics, exprMetrics);
    const highResult = calculateSpectrums(allData, highF0Metrics, exprMetrics);
    expect(lowResult.temperature).toBeGreaterThan(highResult.temperature);
  });

  it('high F0 results in lower temperature (cool)', () => {
    const allData = createAllTestData();
    const highF0Metrics = { medianF0: 400, medianHnr: 12, noisiness: 0.5, lowFreqRatio: 0 };
    const exprMetrics = { dynamicRangeDb: 5, rmsCV: 0.1, vibratoRatio: 0.05 };
    const result = calculateSpectrums(allData, highF0Metrics, exprMetrics);
    expect(result.temperature).toBeLessThan(0.5);
  });

  it('handles edge-case metrics without crashing', () => {
    const allData = createAllTestData({
      rangeSweep: { f0Values: [], isVoicedValues: [] },
    });
    const toneMetrics = { medianF0: 0, medianHnr: 0, noisiness: 1, lowFreqRatio: 1 };
    const exprMetrics = { dynamicRangeDb: 0, rmsCV: 0, vibratoRatio: 0 };
    const result = calculateSpectrums(allData, toneMetrics, exprMetrics);
    expect(result.temperature).toBeGreaterThanOrEqual(0);
    expect(result.range).toBeGreaterThanOrEqual(0);
    expect(result.expression).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// getVoiceType
// ============================================================

describe('getVoiceType', () => {
  const TONE_AXES: ToneAxis[] = ['clear', 'warm', 'deep', 'husky'];
  const EXPRESSION_AXES: ExpressionAxis[] = ['wind', 'flame', 'wave'];

  it('returns valid types for all 12 combinations', () => {
    for (const tone of TONE_AXES) {
      for (const expression of EXPRESSION_AXES) {
        const type = getVoiceType(tone, expression);
        expect(type).toBeDefined();
        expect(type.id).toBe(`${tone}_${expression}`);
        expect(type.toneAxis).toBe(tone);
        expect(type.expressionAxis).toBe(expression);
      }
    }
  });

  it('each type has required fields', () => {
    for (const tone of TONE_AXES) {
      for (const expression of EXPRESSION_AXES) {
        const type = getVoiceType(tone, expression);
        expect(type.labelKo).toBeTruthy();
        expect(typeof type.labelKo).toBe('string');
        expect(type.labelEn).toBeTruthy();
        expect(typeof type.labelEn).toBe('string');
        expect(type.tagline).toBeTruthy();
        expect(type.description).toBeTruthy();
        expect(Array.isArray(type.traits)).toBe(true);
        expect(type.traits.length).toBe(3);
        expect(Array.isArray(type.celebrities)).toBe(true);
        expect(type.celebrities.length).toBeGreaterThanOrEqual(1);
        expect(type.color).toBeTruthy();
        expect(type.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('returns unique labels for each type', () => {
    const labels = new Set<string>();
    for (const tone of TONE_AXES) {
      for (const expression of EXPRESSION_AXES) {
        const type = getVoiceType(tone, expression);
        labels.add(type.labelKo);
      }
    }
    expect(labels.size).toBe(12);
  });
});

// ============================================================
// generateDescription
// ============================================================

describe('generateDescription', () => {
  const TONE_AXES: ToneAxis[] = ['clear', 'warm', 'deep', 'husky'];
  const EXPRESSION_AXES: ExpressionAxis[] = ['wind', 'flame', 'wave'];
  const defaultRange = { lowHz: 100, highHz: 400, octaves: 2.0 };

  it('returns non-empty string', () => {
    for (const tone of TONE_AXES) {
      for (const expression of EXPRESSION_AXES) {
        const type = getVoiceType(tone, expression);
        const spectrums = { temperature: 0.5, range: 0.5, expression: 0.5 };
        const desc = generateDescription(type, spectrums, defaultRange);
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      }
    }
  });

  it('contains type-specific content', () => {
    const clearWind = getVoiceType('clear', 'wind');
    const huskyFlame = getVoiceType('husky', 'flame');
    // Use very different spectrum values to ensure different descriptions
    const spectrums1 = { temperature: 0.1, range: 0.9, expression: 0.1 };
    const spectrums2 = { temperature: 0.9, range: 0.1, expression: 0.9 };

    const desc1 = generateDescription(clearWind, spectrums1, defaultRange);
    const desc2 = generateDescription(huskyFlame, spectrums2, { lowHz: 80, highHz: 300, octaves: 1.5 });

    // Very different types + spectrums should produce different descriptions
    expect(desc1).not.toBe(desc2);
  });

  it('adapts to different spectrum values', () => {
    const type = getVoiceType('warm', 'wave');
    const warmSpectrum = { temperature: 0.9, range: 0.3, expression: 0.8 };
    const coolSpectrum = { temperature: 0.1, range: 0.8, expression: 0.2 };

    const desc1 = generateDescription(type, warmSpectrum, defaultRange);
    const desc2 = generateDescription(type, coolSpectrum, defaultRange);

    // Same type with very different spectrums should produce different text
    expect(desc1).not.toBe(desc2);
  });
});
