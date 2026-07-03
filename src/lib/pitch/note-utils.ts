const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function frequencyToNote(frequency: number): string {
  return midiToNote(frequencyToMidi(frequency));
}

export function frequencyToCents(frequency: number): number {
  const midi = 12 * Math.log2(frequency / 440) + 69;
  const nearestMidi = Math.round(midi);
  return Math.round((midi - nearestMidi) * 100);
}
