import { describe, it, expect } from 'vitest';
import { VibratoDetector } from '../vibrato-detector';

describe('VibratoDetector', () => {
  it('detects vibrato at ~5Hz and ±1 semitone', () => {
    // 5Hz exactly equals Nyquist at 10Hz sample rate → use 4.5Hz (still in 4-8Hz vibrato range)
    const vd = new VibratoDetector();
    const extent = 261 * 0.06; // ~15.7Hz → ~1 semitone
    for (let i = 0; i < 40; i++) {
      const t = i * 0.1;
      const f0 = 261 + extent * Math.sin(2 * Math.PI * 4.5 * t);
      vd.push(f0);
    }
    expect(vd.isVibrato).toBe(true);
    expect(vd.rate).toBeGreaterThan(3.5);
    expect(vd.rate).toBeLessThan(6.5);
  });

  it('does not flag steady tone as vibrato', () => {
    const vd = new VibratoDetector();
    for (let i = 0; i < 35; i++) {
      vd.push(261 + Math.random() * 2 - 1);
    }
    expect(vd.isVibrato).toBe(false);
  });

  it('does not flag random pitch drift as vibrato', () => {
    const vd = new VibratoDetector();
    for (let i = 0; i < 35; i++) {
      vd.push(261 + i * 3);
    }
    expect(vd.isVibrato).toBe(false);
  });
});
