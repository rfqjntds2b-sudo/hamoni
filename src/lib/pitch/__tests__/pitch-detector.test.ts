import { describe, it, expect } from 'vitest';
import { PitchyDetector } from '../pitch-detector';

describe('PitchyDetector', () => {
  it('returns null for silence', async () => {
    const detector = new PitchyDetector();
    await detector.ensureLoaded();
    const silence = new Float32Array(2048);
    const result = detector.detect(silence, 48000);
    expect(result).toBeNull();
  });

  it('detects a 440Hz sine wave', async () => {
    const detector = new PitchyDetector();
    await detector.ensureLoaded();
    const sampleRate = 48000;
    const buffer = new Float32Array(2048);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }
    const result = detector.detect(buffer, sampleRate);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBeCloseTo(440, 0);
    expect(result!.note).toBe('A4');
    expect(result!.midiNumber).toBe(69);
  });
});
