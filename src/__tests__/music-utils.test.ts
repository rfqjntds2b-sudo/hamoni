import { describe, it, expect } from 'vitest';
import {
  midiToFrequency,
  noteNameToMidi,
  frequencyToMidi,
  midiToNote,
  frequencyToCents,
  bpmToNoteDuration,
  centsDistance,
} from '@/lib/audio/music-utils';

// ── Re-exported converters (sanity checks) ────────────────

describe('midiToFrequency (re-exported from vocal-range)', () => {
  it('converts MIDI 69 (A4) to 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 1);
  });

  it('converts MIDI 60 (C4) to ~261.63 Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });

  it('converts MIDI 48 (C3) to ~130.81 Hz', () => {
    expect(midiToFrequency(48)).toBeCloseTo(130.81, 1);
  });

  it('converts MIDI 81 (A5) to 880 Hz', () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 0);
  });
});

describe('noteNameToMidi (re-exported from vocal-range)', () => {
  it('converts C4 to 60', () => {
    expect(noteNameToMidi('C4')).toBe(60);
  });

  it('converts A4 to 69', () => {
    expect(noteNameToMidi('A4')).toBe(69);
  });

  it('converts C#4 to 61', () => {
    expect(noteNameToMidi('C#4')).toBe(61);
  });

  it('converts G2 to 43', () => {
    expect(noteNameToMidi('G2')).toBe(43);
  });

  it('throws on invalid input', () => {
    expect(() => noteNameToMidi('Z9')).toThrow();
  });
});

describe('frequencyToMidi (re-exported from note-utils)', () => {
  it('converts 440 Hz to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBe(69);
  });
});

describe('midiToNote (re-exported from note-utils)', () => {
  it('converts MIDI 60 to C4', () => {
    expect(midiToNote(60)).toBe('C4');
  });
});

describe('frequencyToCents (re-exported from note-utils)', () => {
  it('returns 0 for exact A4 (440 Hz)', () => {
    expect(frequencyToCents(440)).toBe(0);
  });
});

// ── New functions ─────────────────────────────────────────

describe('bpmToNoteDuration', () => {
  it('returns 500 ms for quarter note at 120 BPM', () => {
    expect(bpmToNoteDuration(120)).toBe(500);
  });

  it('returns 1000 ms for quarter note at 60 BPM', () => {
    expect(bpmToNoteDuration(60)).toBe(1000);
  });

  it('returns 750 ms for quarter note at 80 BPM', () => {
    expect(bpmToNoteDuration(80)).toBe(750);
  });

  it('returns 250 ms for eighth note at 120 BPM', () => {
    expect(bpmToNoteDuration(120, 8)).toBe(250);
  });

  it('returns 1000 ms for half note at 120 BPM', () => {
    expect(bpmToNoteDuration(120, 2)).toBe(1000);
  });

  it('returns 2000 ms for whole note at 120 BPM', () => {
    expect(bpmToNoteDuration(120, 1)).toBe(2000);
  });

  it('throws for bpm <= 0', () => {
    expect(() => bpmToNoteDuration(0)).toThrow();
    expect(() => bpmToNoteDuration(-10)).toThrow();
  });

  it('throws for noteValue <= 0', () => {
    expect(() => bpmToNoteDuration(120, 0)).toThrow();
    expect(() => bpmToNoteDuration(120, -1)).toThrow();
  });
});

describe('centsDistance', () => {
  it('returns 0 for identical frequencies', () => {
    expect(centsDistance(440, 440)).toBe(0);
  });

  it('returns 1200 for an octave up', () => {
    expect(centsDistance(440, 880)).toBeCloseTo(1200, 1);
  });

  it('returns -1200 for an octave down', () => {
    expect(centsDistance(880, 440)).toBeCloseTo(-1200, 1);
  });

  it('returns ~100 for one semitone up', () => {
    // A4 (440) to A#4 (466.16)
    expect(centsDistance(440, 466.164)).toBeCloseTo(100, 0);
  });

  it('returns 0 for non-positive frequencies', () => {
    expect(centsDistance(0, 440)).toBe(0);
    expect(centsDistance(440, 0)).toBe(0);
    expect(centsDistance(-1, 440)).toBe(0);
  });
});
