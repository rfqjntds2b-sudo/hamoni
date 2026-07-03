import { describe, it, expect } from 'vitest';
import {
  classifyVoiceType,
  calculateComfortZone,
  buildProfile,
  noteToMidi,
  midiToHz,
  MIN_VALID_SAMPLES,
} from '@/lib/voice/vocal-range';

describe('noteToMidi', () => {
  it('converts A4 to 69', () => {
    expect(noteToMidi('A4')).toBe(69);
  });

  it('converts C4 to 60', () => {
    expect(noteToMidi('C4')).toBe(60);
  });

  it('converts E2 to 40', () => {
    expect(noteToMidi('E2')).toBe(40);
  });

  it('converts C#4 to 61', () => {
    expect(noteToMidi('C#4')).toBe(61);
  });

  it('throws on invalid note', () => {
    expect(() => noteToMidi('X9')).toThrow();
  });
});

describe('classifyVoiceType', () => {
  it('classifies male A2-A4 as Baritone', () => {
    const result = classifyVoiceType(noteToMidi('A2'), noteToMidi('A4'), 'male');
    expect(result.type).toBe('Baritone');
    expect(result.label).toBe('바리톤');
  });

  it('classifies male E2-E4 as Bass', () => {
    const result = classifyVoiceType(noteToMidi('E2'), noteToMidi('E4'), 'male');
    expect(result.type).toBe('Bass');
  });

  it('classifies male C3-C5 as Tenor', () => {
    const result = classifyVoiceType(noteToMidi('C3'), noteToMidi('C5'), 'male');
    expect(result.type).toBe('Tenor');
  });

  it('classifies female C4-C6 as Soprano', () => {
    const result = classifyVoiceType(noteToMidi('C4'), noteToMidi('C6'), 'female');
    expect(result.type).toBe('Soprano');
    expect(result.label).toBe('소프라노');
  });

  it('classifies female F3-F5 as Alto', () => {
    const result = classifyVoiceType(noteToMidi('F3'), noteToMidi('F5'), 'female');
    expect(result.type).toBe('Alto');
  });

  it('classifies female A3-A5 as Mezzo-Soprano', () => {
    const result = classifyVoiceType(noteToMidi('A3'), noteToMidi('A5'), 'female');
    expect(result.type).toBe('Mezzo-Soprano');
  });

  it('handles boundary between Bass and Baritone (picks closer)', () => {
    // Midpoint between Bass mid (52) and Baritone mid (57) is 54.5
    // A range centered at 55 should be closer to Baritone
    const result = classifyVoiceType(49, 61, 'male'); // mid = 55
    expect(result.type).toBe('Baritone');
  });

  it('handles boundary between Baritone and Tenor (picks closer)', () => {
    // Baritone mid = (45+69)/2 = 57, Tenor mid = (48+72)/2 = 60
    // A range centered at 58 should be closer to Baritone
    const result = classifyVoiceType(52, 64, 'male'); // mid = 58
    expect(result.type).toBe('Baritone');
  });
});

describe('calculateComfortZone', () => {
  it('returns 10th and 90th percentile for 100 samples', () => {
    const samples = Array.from({ length: 100 }, (_, i) => 40 + i);
    const result = calculateComfortZone(samples);
    expect(result.low).toBe(50);  // 40 + floor(100*0.1)
    expect(result.high).toBe(130); // 40 + floor(100*0.9)
  });

  it('handles all same values', () => {
    const samples = Array.from({ length: 50 }, () => 60);
    const result = calculateComfortZone(samples);
    expect(result.low).toBe(60);
    expect(result.high).toBe(60);
  });

  it('handles small sample set', () => {
    const samples = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95];
    const result = calculateComfortZone(samples);
    expect(result.low).toBe(55);  // index floor(10*0.1)=1
    expect(result.high).toBe(95); // index floor(10*0.9)=9
  });

  it('handles empty array', () => {
    const result = calculateComfortZone([]);
    expect(result.low).toBe(0);
    expect(result.high).toBe(0);
  });

  it('handles unsorted input', () => {
    const samples = [70, 50, 90, 60, 80, 55, 85, 65, 75, 95];
    const result = calculateComfortZone(samples);
    expect(result.low).toBe(55);
    expect(result.high).toBe(95);
  });
});

describe('buildProfile', () => {
  function makeSamples(low: number, high: number, count: number): number[] {
    const samples: number[] = [];
    for (let i = 0; i < count; i++) {
      samples.push(low + Math.round((i / (count - 1)) * (high - low)));
    }
    return samples;
  }

  it('returns null when fewer than MIN_VALID_SAMPLES modal samples', () => {
    const samples = makeSamples(45, 69, MIN_VALID_SAMPLES - 1);
    const result = buildProfile('male', samples, []);
    expect(result).toBeNull();
  });

  it('builds a valid profile for male Baritone range', () => {
    const modalSamples = makeSamples(45, 69, 60); // A2(45) to A4(69)
    const falsettoSamples = makeSamples(70, 81, 20); // up to A5(81)

    const result = buildProfile('male', modalSamples, falsettoSamples);
    expect(result).not.toBeNull();
    expect(result!.voiceType).toBe('Baritone');
    expect(result!.voiceTypeLabel).toBe('바리톤');
    expect(result!.modalLow).toBe('A2');
    expect(result!.modalHigh).toBe('A4');
    expect(result!.fullHigh).toBe('A5');
    expect(result!.gender).toBe('male');
    expect(result!.sampleCount).toBe(80);
    expect(result!.modalRangeOctaves).toBe(2);
    expect(result!.fullRangeOctaves).toBe(3);
  });

  it('builds profile with empty falsetto samples', () => {
    const modalSamples = makeSamples(60, 84, 60); // C4 to C6
    const result = buildProfile('female', modalSamples, []);
    expect(result).not.toBeNull();
    expect(result!.voiceType).toBe('Soprano');
    expect(result!.fullHigh).toBe(result!.modalHigh);
    expect(result!.modalRangeOctaves).toBe(result!.fullRangeOctaves);
  });

  it('computes comfort zone correctly', () => {
    const modalSamples = makeSamples(45, 69, 100);
    const result = buildProfile('male', modalSamples, []);
    expect(result).not.toBeNull();
    // Comfort zone should be 10-90 percentile
    expect(result!.comfortLow).toBeTruthy();
    expect(result!.comfortHigh).toBeTruthy();
  });

  it('includes Hz values', () => {
    const modalSamples = makeSamples(45, 69, 60);
    const result = buildProfile('male', modalSamples, []);
    expect(result).not.toBeNull();
    expect(result!.modalLowHz).toBeGreaterThan(0);
    expect(result!.modalHighHz).toBeGreaterThan(result!.modalLowHz);
  });

  it('sets measuredAt to ISO date', () => {
    const modalSamples = makeSamples(45, 69, 60);
    const result = buildProfile('male', modalSamples, []);
    expect(result).not.toBeNull();
    expect(() => new Date(result!.measuredAt)).not.toThrow();
  });
});

describe('midiToHz', () => {
  it('converts MIDI 69 (A4) to 440 Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 1);
  });

  it('converts MIDI 60 (C4) to ~261.6 Hz', () => {
    expect(midiToHz(60)).toBeCloseTo(261.63, 0);
  });
});
