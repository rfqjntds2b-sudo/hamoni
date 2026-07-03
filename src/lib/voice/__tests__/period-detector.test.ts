import { describe, it, expect } from 'vitest';
import { PeriodDetector } from '../period-detector';

function makeSine(freq: number, sr: number, samples: number, amplitude = 0.5): Float32Array {
  const data = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    data[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sr);
  }
  return data;
}

function makeHarmonics(f0: number, harmonicAmps: number[], sr: number, samples: number): Float32Array {
  const data = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    let sum = Math.sin(2 * Math.PI * f0 * i / sr);
    harmonicAmps.forEach((amp, idx) => {
      sum += amp * Math.sin(2 * Math.PI * f0 * (idx + 2) * i / sr);
    });
    data[i] = sum * 0.3;
  }
  return data;
}

const SR = 48000;

describe('PeriodDetector', () => {
  it('detects 440Hz pure tone', () => {
    const det = new PeriodDetector();
    const result = det.processFrame(makeSine(440, SR, 4096), SR);
    expect(result.f0).not.toBeNull();
    expect(Math.abs(result.f0! - 440)).toBeLessThan(3);
    expect(result.clarity).toBeGreaterThan(0.9);
  });

  it('detects 100Hz pure tone', () => {
    const det = new PeriodDetector();
    const result = det.processFrame(makeSine(100, SR, 4096), SR);
    expect(result.f0).not.toBeNull();
    expect(Math.abs(result.f0! - 100)).toBeLessThan(2);
    expect(result.clarity).toBeGreaterThan(0.9);
  });

  it('returns null F0 for silence', () => {
    const det = new PeriodDetector();
    const result = det.processFrame(new Float32Array(4096), SR);
    expect(result.f0).toBeNull();
  });

  it('returns low clarity for white noise', () => {
    const det = new PeriodDetector();
    const noise = new Float32Array(4096);
    for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
    const result = det.processFrame(noise, SR);
    expect(result.clarity).toBeLessThan(0.75);
  });

  it('detects F0 with harmonics', () => {
    const det = new PeriodDetector();
    const result = det.processFrame(makeHarmonics(440, [0.5, 0.3], SR, 4096), SR);
    expect(result.f0).not.toBeNull();
    expect(Math.abs(result.f0! - 440)).toBeLessThan(5);
  });

  it('detects 80Hz extreme low', () => {
    const det = new PeriodDetector();
    const result = det.processFrame(makeSine(80, SR, 4096), SR);
    expect(result.f0).not.toBeNull();
    expect(Math.abs(result.f0! - 80)).toBeLessThan(3);
    expect(result.periods.length).toBeGreaterThanOrEqual(2);
  });

  it('treats very quiet signal as silence (amplitude gate)', () => {
    const det = new PeriodDetector();
    const result = det.processFrame(makeSine(440, SR, 4096, 0.005), SR);
    expect(result.f0).toBeNull();
  });

  it('recovers from octave error', () => {
    const det = new PeriodDetector();
    det.processFrame(makeSine(220, SR, 4096), SR);
    det.processFrame(makeSine(220, SR, 4096), SR);
    const result = det.processFrame(makeSine(220, SR, 4096), SR);
    expect(result.f0).not.toBeNull();
    expect(Math.abs(result.f0! - 220)).toBeLessThan(10);
  });

  it('accumulates periods across frames (FIFO)', () => {
    const det = new PeriodDetector();
    det.processFrame(makeSine(110, SR, 4096), SR);
    const r1 = det.processFrame(makeSine(110, SR, 4096), SR);
    // Two frames of 110Hz (~9 periods each) should accumulate >9 periods
    expect(r1.periods.length).toBeGreaterThan(9);
    expect(r1.periods.length).toBeLessThanOrEqual(60); // MAX_PERIODS cap
  });

  it('trims oldest periods when FIFO exceeds MAX_PERIODS', () => {
    const det = new PeriodDetector();
    // 3 frames of 300Hz (~25 periods each, cap 15)
    det.processFrame(makeSine(300, SR, 4096), SR);
    det.processFrame(makeSine(300, SR, 4096), SR);
    const r = det.processFrame(makeSine(300, SR, 4096), SR);
    expect(r.periods.length).toBe(60); // MAX_PERIODS
  });

  it('processFrame completes within 10ms for 4096 samples', () => {
    const det = new PeriodDetector();
    const data = makeSine(220, SR, 4096);
    const start = performance.now();
    for (let i = 0; i < 10; i++) det.processFrame(data, SR);
    const elapsed = (performance.now() - start) / 10;
    expect(elapsed).toBeLessThan(10);
  });

  it('60Hz bass tone achieves clarity > 0.75', () => {
    const det = new PeriodDetector();
    const result = det.processFrame(makeSine(60, SR, 4096), SR);
    expect(result.f0).not.toBeNull();
    expect(result.clarity).toBeGreaterThan(0.75);
  });

  it('adapts to intentional octave jump after 3 frames', () => {
    const det = new PeriodDetector();
    det.processFrame(makeSine(220, SR, 4096), SR);
    det.processFrame(makeSine(220, SR, 4096), SR);
    det.processFrame(makeSine(440, SR, 4096), SR);
    det.processFrame(makeSine(440, SR, 4096), SR);
    const result = det.processFrame(makeSine(440, SR, 4096), SR);
    expect(result.f0).not.toBeNull();
    expect(Math.abs(result.f0! - 440)).toBeLessThan(10);
  });
});
