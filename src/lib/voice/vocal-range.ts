import { midiToNote } from '@/lib/pitch/note-utils';
import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';

// ─── Types ───────────────────────────────────────────────

export type Gender = 'male' | 'female';

export interface VoiceTypeEntry {
  type: string;
  label: string;
  low: number;   // MIDI
  high: number;  // MIDI
}

export interface VocalRangeProfile {
  modalLow: string;
  modalHigh: string;
  modalLowHz: number;
  modalHighHz: number;
  fullHigh: string;
  fullHighHz: number;
  modalRangeOctaves: number;
  fullRangeOctaves: number;
  comfortLow: string;
  comfortHigh: string;
  voiceType: string;
  voiceTypeLabel: string;
  gender: Gender;
  measuredAt: string;
  sampleCount: number;
}

// ─── Constants ───────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function noteToMidi(note: string): number {
  const match = note.match(/^([A-G]#?)(-?\d)$/);
  if (!match) throw new Error(`Invalid note: ${note}`);
  const [, name, octStr] = match;
  const noteIndex = NOTE_NAMES.indexOf(name as typeof NOTE_NAMES[number]);
  if (noteIndex === -1) throw new Error(`Invalid note name: ${name}`);
  return (parseInt(octStr) + 1) * 12 + noteIndex;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const VOICE_TYPES: Record<Gender, VoiceTypeEntry[]> = {
  male: [
    { type: 'Bass', label: '베이스', low: noteToMidi('E2'), high: noteToMidi('E4') },
    { type: 'Baritone', label: '바리톤', low: noteToMidi('A2'), high: noteToMidi('A4') },
    { type: 'Tenor', label: '테너', low: noteToMidi('C3'), high: noteToMidi('C5') },
  ],
  female: [
    { type: 'Alto', label: '알토', low: noteToMidi('F3'), high: noteToMidi('F5') },
    { type: 'Mezzo-Soprano', label: '메조소프라노', low: noteToMidi('A3'), high: noteToMidi('A5') },
    { type: 'Soprano', label: '소프라노', low: noteToMidi('C4'), high: noteToMidi('C6') },
  ],
} as const;

// ─── Classification ──────────────────────────────────────

export function classifyVoiceType(
  modalLowMidi: number,
  modalHighMidi: number,
  gender: Gender,
): { type: string; label: string } {
  const types = VOICE_TYPES[gender];
  const userMid = (modalLowMidi + modalHighMidi) / 2;

  let best = types[0];
  let bestDist = Infinity;

  for (const entry of types) {
    const entryMid = (entry.low + entry.high) / 2;
    const dist = Math.abs(userMid - entryMid);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }

  return { type: best.type, label: best.label };
}

/** Get locale-aware voice type label via i18n */
export function getVoiceTypeLabel(voiceType: string, locale: Locale): string {
  const t = createT(locale, 'voice');
  const translated = t(`voiceTypes.${voiceType}`);
  // If translation not found (returns the key), fall back to VOICE_TYPES label
  if (translated === `voiceTypes.${voiceType}`) {
    // Search for the label in VOICE_TYPES
    for (const entries of Object.values(VOICE_TYPES)) {
      for (const entry of entries) {
        if (entry.type === voiceType) return entry.label;
      }
    }
    return voiceType;
  }
  return translated;
}

// ─── Comfort Zone ────────────────────────────────────────

export function calculateComfortZone(
  midiSamples: number[],
): { low: number; high: number } {
  if (midiSamples.length === 0) {
    return { low: 0, high: 0 };
  }

  const sorted = [...midiSamples].sort((a, b) => a - b);
  const n = sorted.length;
  const lowIdx = Math.floor(n * 0.1);
  const highIdx = Math.floor(n * 0.9);

  return {
    low: sorted[lowIdx],
    high: sorted[Math.min(highIdx, n - 1)],
  };
}

// ─── Profile Builder ─────────────────────────────────────

export const MIN_VALID_SAMPLES = 50;

const MIDI_FLOOR = 24;  // C1 — lowest reasonable vocal note
const MIDI_CEIL = 108;  // C8 — highest reasonable vocal note

function sanitizeSamples(samples: number[]): number[] {
  return samples.filter(
    (v) => Number.isFinite(v) && v >= MIDI_FLOOR && v <= MIDI_CEIL,
  );
}

function clampMidi(midi: number): number {
  if (!Number.isFinite(midi)) return 60; // C4 fallback
  return Math.max(MIDI_FLOOR, Math.min(MIDI_CEIL, Math.round(midi)));
}

export function buildProfile(
  gender: Gender,
  modalSamples: number[],
  falsettoSamples: number[],
): VocalRangeProfile | null {
  const cleanModal = sanitizeSamples(modalSamples);
  if (cleanModal.length < MIN_VALID_SAMPLES) {
    return null;
  }

  const cleanFalsetto = sanitizeSamples(falsettoSamples);

  const modalLowMidi = clampMidi(Math.min(...cleanModal));
  const modalHighMidi = clampMidi(Math.max(...cleanModal));

  const allHighSamples = [...cleanModal, ...cleanFalsetto];
  const fullHighMidi = clampMidi(Math.max(...allHighSamples));

  const { type, label } = classifyVoiceType(modalLowMidi, modalHighMidi, gender);
  const comfort = calculateComfortZone(cleanModal);
  const comfortLow = clampMidi(comfort.low);
  const comfortHigh = clampMidi(comfort.high);

  const modalRangeOctaves = Math.min(
    6,
    Math.round(((modalHighMidi - modalLowMidi) / 12) * 10) / 10,
  );
  const fullRangeOctaves = Math.min(
    6,
    Math.round(((fullHighMidi - modalLowMidi) / 12) * 10) / 10,
  );

  return {
    modalLow: midiToNote(modalLowMidi),
    modalHigh: midiToNote(modalHighMidi),
    modalLowHz: Math.round(midiToHz(modalLowMidi) * 10) / 10,
    modalHighHz: Math.round(midiToHz(modalHighMidi) * 10) / 10,
    fullHigh: midiToNote(fullHighMidi),
    fullHighHz: Math.round(midiToHz(fullHighMidi) * 10) / 10,
    modalRangeOctaves,
    fullRangeOctaves,
    comfortLow: midiToNote(comfortLow),
    comfortHigh: midiToNote(comfortHigh),
    voiceType: type,
    voiceTypeLabel: label,
    gender,
    measuredAt: new Date().toISOString(),
    sampleCount: cleanModal.length + cleanFalsetto.length,
  };
}
