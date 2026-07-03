// ============================================================
// Music Utility Functions
// ============================================================
// Centralised entry-point for music-theory helpers used by
// the scale-training module. Re-exports existing converters
// from vocal-range.ts / note-utils.ts and adds new ones.
// ============================================================

export { noteToMidi as noteNameToMidi, midiToHz as midiToFrequency } from '@/lib/voice/vocal-range';
export { frequencyToMidi, midiToNote, frequencyToCents } from '@/lib/pitch/note-utils';

/**
 * Convert a BPM tempo + note value into a duration in milliseconds.
 *
 * @param bpm      Beats per minute (quarter-note = 1 beat)
 * @param noteValue  Rhythmic denominator: 4 = quarter, 8 = eighth, etc.
 * @returns Duration in ms
 */
export function bpmToNoteDuration(bpm: number, noteValue: number = 4): number {
  if (bpm <= 0) throw new RangeError('bpm must be positive');
  if (noteValue <= 0) throw new RangeError('noteValue must be positive');
  return (60 / bpm) * (4 / noteValue) * 1000;
}

/**
 * Signed cent distance from freq1 to freq2.
 * Positive when freq2 > freq1 (sharp), negative when flat.
 */
export function centsDistance(freq1: number, freq2: number): number {
  if (freq1 <= 0 || freq2 <= 0) return 0;
  return 1200 * Math.log2(freq2 / freq1);
}
