import { describe, it, expect } from 'vitest';
import { frequencyToMidi, midiToNote, frequencyToNote, frequencyToCents } from '../note-utils';

describe('frequencyToMidi', () => {
  it('converts A4 (440Hz) to MIDI 69', () => {
    expect(frequencyToMidi(440)).toBe(69);
  });

  it('converts C4 (261.63Hz) to MIDI 60', () => {
    expect(frequencyToMidi(261.63)).toBe(60);
  });
});

describe('midiToNote', () => {
  it('converts MIDI 69 to A4', () => {
    expect(midiToNote(69)).toBe('A4');
  });

  it('converts MIDI 60 to C4', () => {
    expect(midiToNote(60)).toBe('C4');
  });

  it('converts MIDI 61 to C#4', () => {
    expect(midiToNote(61)).toBe('C#4');
  });
});

describe('frequencyToNote', () => {
  it('converts 440Hz to A4', () => {
    expect(frequencyToNote(440)).toBe('A4');
  });
});

describe('frequencyToCents', () => {
  it('returns 0 for exact A4', () => {
    expect(frequencyToCents(440)).toBe(0);
  });

  it('returns positive cents for slightly sharp', () => {
    const cents = frequencyToCents(445);
    expect(cents).toBeGreaterThan(0);
    expect(cents).toBeLessThan(50);
  });

  it('returns negative cents for slightly flat', () => {
    const cents = frequencyToCents(435);
    expect(cents).toBeLessThan(0);
    expect(cents).toBeGreaterThan(-50);
  });
});
