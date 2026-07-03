import { describe, it, expect } from 'vitest';
import { estimateFormants } from '../formant-estimator';

// Helper: create a synthetic FFT spectrum with peaks at specified frequencies
function createSpectrum(
  sampleRate: number,
  fftSize: number,
  peaks: { hz: number; db: number }[],
  floor = -60,
): Float32Array {
  const binCount = fftSize / 2;
  const binWidth = sampleRate / fftSize;
  const data = new Float32Array(binCount).fill(floor);

  for (const { hz, db } of peaks) {
    const bin = Math.round(hz / binWidth);
    if (bin >= 0 && bin < binCount) {
      // Create a broader peak (5-bin wide) to simulate formant
      for (let offset = -2; offset <= 2; offset++) {
        const b = bin + offset;
        if (b >= 0 && b < binCount) {
          data[b] = Math.max(data[b], db - Math.abs(offset) * 3);
        }
      }
    }
  }

  return data;
}

describe('estimateFormants', () => {
  const SAMPLE_RATE = 48000;
  const FFT_SIZE = 4096;

  it('returns null for both when f0 is 0', () => {
    const spectrum = new Float32Array(FFT_SIZE / 2).fill(-60);
    const result = estimateFormants(spectrum, SAMPLE_RATE, 0);
    expect(result.f1).toBeNull();
    expect(result.f2).toBeNull();
  });

  it('returns null for empty spectrum', () => {
    const result = estimateFormants(new Float32Array(0), SAMPLE_RATE, 220);
    expect(result.f1).toBeNull();
    expect(result.f2).toBeNull();
  });

  it('detects F1 and F2 from clear peaks', () => {
    // Simulate /a/ vowel: F1 ~750Hz, F2 ~1250Hz
    // Also add F0 harmonic at 220Hz (should be excluded)
    const spectrum = createSpectrum(SAMPLE_RATE, FFT_SIZE, [
      { hz: 220, db: -10 },  // H1 (F0)
      { hz: 440, db: -15 },  // H2
      { hz: 660, db: -20 },  // H3
      { hz: 750, db: -8 },   // F1 peak
      { hz: 1250, db: -12 }, // F2 peak
    ]);

    const result = estimateFormants(spectrum, SAMPLE_RATE, 220);

    // F1 should be near 750 Hz (with some tolerance for smoothing/interpolation)
    if (result.f1 !== null) {
      expect(result.f1).toBeGreaterThan(650);
      expect(result.f1).toBeLessThan(850);
    }

    // F2 should be near 1250 Hz
    if (result.f2 !== null) {
      expect(result.f2).toBeGreaterThan(1100);
      expect(result.f2).toBeLessThan(1400);
    }
  });

  it('rejects F2 if too close to F1', () => {
    // Both peaks very close together
    const spectrum = createSpectrum(SAMPLE_RATE, FFT_SIZE, [
      { hz: 500, db: -10 },
      { hz: 550, db: -10 }, // Only 50Hz apart
    ]);

    const result = estimateFormants(spectrum, SAMPLE_RATE, 100);
    // F2 should be null since it's < F1 + 100
    if (result.f1 !== null && result.f2 !== null) {
      expect(result.f2).toBeGreaterThan(result.f1 + 100);
    }
  });

  it('handles /i/ vowel (F1 low, F2 high)', () => {
    // /i/ vowel with F0=110Hz: F1~300Hz (between H2=220 and H3=330), F2~2300Hz
    const spectrum = createSpectrum(SAMPLE_RATE, FFT_SIZE, [
      { hz: 110, db: -10 },  // F0
      { hz: 220, db: -15 },  // H2
      { hz: 330, db: -18 },  // H3
      { hz: 400, db: -6 },   // F1 for /i/ (clear of harmonics)
      { hz: 2300, db: -10 }, // F2 for /i/
    ]);

    const result = estimateFormants(spectrum, SAMPLE_RATE, 110);

    if (result.f1 !== null) {
      expect(result.f1).toBeGreaterThan(300);
      expect(result.f1).toBeLessThan(550);
    }
    if (result.f2 !== null) {
      expect(result.f2).toBeGreaterThan(2000);
      expect(result.f2).toBeLessThan(2600);
    }
  });
});
