import { describe, it, expect } from 'vitest';
import { analyzeSpectrum } from '../spectral-analyzer';

function makeFreqData(harmonics: { freq: number; db: number }[], sr: number, fftSize: number): Float32Array {
  const binCount = fftSize / 2 + 1;
  const data = new Float32Array(binCount).fill(-100);
  const binWidth = sr / fftSize;
  for (const { freq, db } of harmonics) {
    const bin = Math.round(freq / binWidth);
    if (bin >= 0 && bin < binCount) {
      // Sharp peak: only exact bin gets full dB, ±1 at -6dB, ±2 at -12dB
      data[bin] = Math.max(data[bin], db);
      for (const off of [-1, 1]) {
        const b = bin + off;
        if (b >= 0 && b < binCount) data[b] = Math.max(data[b], db - 6);
      }
      for (const off of [-2, 2]) {
        const b = bin + off;
        if (b >= 0 && b < binCount) data[b] = Math.max(data[b], db - 12);
      }
    }
  }
  return data;
}

const SR = 48000;
const FFT = 4096;

describe('analyzeSpectrum', () => {
  it('Flow: H1 > H2 moderately → positive H1-H2', () => {
    const data = makeFreqData([{ freq: 440, db: -5 }, { freq: 880, db: -15 }], SR, FFT);
    const result = analyzeSpectrum(data, 440, 0.95, SR, FFT, 'male');
    expect(result.h1h2).not.toBeNull();
    expect(result.h1h2!).toBeGreaterThan(3);
  });

  it('Pressed: H2 > H1 → negative H1-H2', () => {
    const data = makeFreqData([{ freq: 440, db: -20 }, { freq: 880, db: -5 }], SR, FFT);
    const result = analyzeSpectrum(data, 440, 0.95, SR, FFT, 'male');
    expect(result.h1h2).not.toBeNull();
    expect(result.h1h2!).toBeLessThan(-5);
  });

  it('Breathy: H1 >> H2 → very positive H1-H2', () => {
    const data = makeFreqData([{ freq: 440, db: -5 }, { freq: 880, db: -30 }], SR, FFT);
    const result = analyzeSpectrum(data, 440, 0.95, SR, FFT, 'male');
    expect(result.h1h2!).toBeGreaterThan(15);
  });

  it('returns null when clarity < 0.85', () => {
    const data = makeFreqData([{ freq: 440, db: -10 }], SR, FFT);
    const result = analyzeSpectrum(data, 440, 0.5, SR, FFT, 'male');
    expect(result.h1h2).toBeNull();
    expect(result.alphaRatio).toBeNull();
  });

  it('pure tone (no harmonics): very high H1-H2', () => {
    const data = makeFreqData([{ freq: 440, db: -10 }], SR, FFT);
    const result = analyzeSpectrum(data, 440, 0.95, SR, FFT, 'male');
    expect(result.h1h2!).toBeGreaterThan(20);
  });

  it('F1 correction /아/: F1 far from H1/H2 → minimal correction', () => {
    const data = makeFreqData([
      { freq: 200, db: -10 }, { freq: 400, db: -14 }, { freq: 800, db: -5 }
    ], SR, FFT);
    const result = analyzeSpectrum(data, 200, 0.95, SR, FFT, 'male');
    expect(result.h1h2).not.toBeNull();
    expect(Math.abs(result.h1h2! - 4)).toBeLessThan(3);
  });

  it('F1 correction /이/: F1 near H1 → correction applied', () => {
    // Without F1 near H1, raw H1-H2 = -8 - (-14) = 6dB
    // With F1 at 250Hz near H1 at 200Hz, H1 should be corrected down
    // So H1*-H2* < 6
    const data = makeFreqData([
      { freq: 200, db: -8 }, { freq: 400, db: -14 }, { freq: 250, db: 0 }
    ], SR, FFT);
    const result = analyzeSpectrum(data, 200, 0.95, SR, FFT, 'male');
    expect(result.h1h2).not.toBeNull();
    // F1 prominence is high (0dB peak vs ~-100dB floor), so boost ~3dB applied
    // H1*-H2* should be less than raw 6dB
    expect(result.h1h2!).toBeLessThan(6);
  });
});
