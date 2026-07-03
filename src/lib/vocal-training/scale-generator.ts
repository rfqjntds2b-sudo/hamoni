// ============================================================
// Scale Generator
// ============================================================
// Converts a Prescription into a concrete ScaleSequence that
// the PianoSynthesizer can play and the UI can visualise.
// ============================================================

import { midiToFrequency, noteNameToMidi } from '@/lib/audio/music-utils';
import { midiToNote } from '@/lib/pitch/note-utils';
import { bpmToNoteDuration } from '@/lib/audio/music-utils';
import type {
  Prescription,
  ScaleNote,
  ScaleSet,
  ScaleSequence,
  ScalePattern,
} from './types';

// ─── Scale Pattern Library ──────────────────────────────

export const SCALE_PATTERNS: Record<string, ScalePattern> = {
  stepwise5: {
    name: '5-note ascending-descending',
    nameKorean: '5음 상행-하행',
    intervals: [0, 2, 4, 5, 7, 5, 4, 2, 0],
  },
  stepwise3: {
    name: '3-note round trip',
    nameKorean: '3음 왕복',
    intervals: [0, 2, 4, 2, 0],
  },
  stepwiseFull: {
    name: 'Full scale',
    nameKorean: '풀스케일',
    intervals: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0],
  },
  triad: {
    name: 'Triad',
    nameKorean: '트라이어드',
    intervals: [0, 4, 7, 4, 0],
  },
  octaveArpeggio: {
    name: 'Octave arpeggio',
    nameKorean: '옥타브 아르페지오',
    intervals: [0, 4, 7, 12, 7, 4, 0],
  },
  fifthOctave: {
    name: '1-5-8',
    nameKorean: '1-5-8',
    intervals: [0, 7, 12, 7, 0],
  },
  // Minor patterns — for tonal variety and different muscular coordination
  minorTriad: {
    name: 'Minor triad',
    nameKorean: '단조 트라이어드',
    intervals: [0, 3, 7, 3, 0],
  },
  minorStepwise5: {
    name: '5-note minor ascending-descending',
    nameKorean: '5음 단조 상행-하행',
    intervals: [0, 2, 3, 5, 7, 5, 3, 2, 0],
  },
  // Descending-first patterns — for PRESSED voices that benefit from
  // singing down from a relaxed high position before ascending
  descending3: {
    name: '3-note pure descent',
    nameKorean: '3음 하행',
    intervals: [4, 2, 0],
  },
  descending5: {
    name: '5-note descending-ascending',
    nameKorean: '5음 하행-상행',
    intervals: [7, 5, 4, 2, 0, 2, 4, 5, 7],
  },
} as const;

// ─── Constants ──────────────────────────────────────────

const REST_BETWEEN_SETS_MS = 2000;
const LEGATO_GAP_MS = 30;    // Near-legato gap between notes in a set

// Max sets to prevent vocal fatigue from excessively long sessions
const MAX_SETS_LOW = 12;     // difficulty 1-4
const MAX_SETS_MID = 20;     // difficulty 5-6
const MAX_SETS_HIGH = 25;    // difficulty 7+

// ─── Main Generator ─────────────────────────────────────

export function generateScaleSequence(prescription: Prescription): ScaleSequence {
  const pattern = selectPattern(prescription);
  const noteDuration = bpmToNoteDuration(prescription.tempo);
  const maxInterval = Math.max(...pattern.intervals);

  const { low, high } = prescription.practiceRange;

  // Generate ascending keys, then descending — capped to prevent vocal fatigue
  const maxSets = prescription.difficultyLevel >= 7 ? MAX_SETS_HIGH
    : prescription.difficultyLevel >= 5 ? MAX_SETS_MID : MAX_SETS_LOW;
  const startKeys = buildKeySequence(low, high, maxInterval, maxSets);

  const sets: ScaleSet[] = [];
  let totalMs = 0;

  for (let i = 0; i < startKeys.length; i++) {
    const startMidi = startKeys[i];
    const notes = buildSetNotes(
      startMidi, pattern, noteDuration, prescription,
    );

    const setDuration = notes.reduce((sum, n) => sum + n.durationMs, 0)
      + (notes.length - 1) * LEGATO_GAP_MS;

    const isLast = i === startKeys.length - 1;
    const rest = isLast ? 0 : REST_BETWEEN_SETS_MS;

    sets.push({
      setIndex: i,
      key: midiToNote(startMidi),
      startMidi,
      notes,
      restAfterMs: rest,
    });

    totalMs += setDuration + rest;
  }

  return {
    sets,
    scaleType: prescription.scaleType,
    tempo: prescription.tempo,
    totalDurationMs: totalMs,
    patternName: pattern.nameKorean,
  };
}

// ─── Pattern Selection ──────────────────────────────────

function selectPattern(prescription: Prescription): ScalePattern {
  if (prescription.scaleType === 'arpeggio') {
    if (prescription.difficultyLevel >= 9) return SCALE_PATTERNS.fifthOctave;
    if (prescription.difficultyLevel >= 7) return SCALE_PATTERNS.octaveArpeggio;
    // Alternate major/minor triads for tonal variety at lower levels
    return prescription.difficultyLevel % 2 === 0
      ? SCALE_PATTERNS.minorTriad
      : SCALE_PATTERNS.triad;
  }

  // Descending-first for PRESSED — relaxation before exertion
  if (prescription.scaleType === 'descending') {
    return prescription.difficultyLevel >= 4
      ? SCALE_PATTERNS.descending5
      : SCALE_PATTERNS.descending3;
  }

  // Stepwise (ascending-descending)
  if (prescription.difficultyLevel >= 6) {
    return SCALE_PATTERNS.stepwiseFull;
  }
  if (prescription.difficultyLevel >= 4) {
    // Alternate major/minor for tonal variety
    return prescription.difficultyLevel % 2 === 0
      ? SCALE_PATTERNS.minorStepwise5
      : SCALE_PATTERNS.stepwise5;
  }
  return SCALE_PATTERNS.stepwise3;
}

// ─── Key Sequence Builder ───────────────────────────────

/**
 * Build the sequence of starting keys:
 * ascend from low, then descend back (palindrome).
 * Ensures the pattern's highest note never exceeds `high`.
 * Uses wider step sizes when the range would exceed maxSets.
 */
function buildKeySequence(
  low: number,
  high: number,
  maxInterval: number,
  maxSets: number = Infinity,
): number[] {
  // Calculate chromatic ascending count
  const maxKey = high - maxInterval;
  const chromaticCount = Math.max(0, maxKey - low + 1);

  if (chromaticCount === 0) {
    return [low];
  }

  // Palindrome total = ascending * 2 - 1
  // Solve for ascending count that keeps palindrome ≤ maxSets:
  //   ascending * 2 - 1 ≤ maxSets → ascending ≤ (maxSets + 1) / 2
  const maxAscending = Math.floor((maxSets + 1) / 2);
  const step = chromaticCount > maxAscending
    ? Math.ceil(chromaticCount / maxAscending)
    : 1;

  // Ascending
  const ascending: number[] = [];
  for (let midi = low; midi + maxInterval <= high; midi += step) {
    ascending.push(midi);
  }

  if (ascending.length === 0) {
    ascending.push(low);
    return ascending;
  }

  // Descending (skip the top key since it was already in ascending)
  const keys = [...ascending];
  for (let i = ascending.length - 2; i >= 0; i--) {
    keys.push(ascending[i]);
  }

  return keys;
}

// ─── Note Builder ───────────────────────────────────────

function buildSetNotes(
  startMidi: number,
  pattern: ScalePattern,
  noteDurationMs: number,
  prescription: Prescription,
): ScaleNote[] {
  return pattern.intervals.map((interval) => {
    const midi = startMidi + interval;
    const { vowel, vowelKorean } = resolveVowel(midi, prescription);

    return {
      midi,
      frequency: midiToFrequency(midi),
      noteName: midiToNote(midi),
      vowel,
      vowelKorean,
      durationMs: Math.round(noteDurationMs),
    };
  });
}

// ─── Vowel Resolution ───────────────────────────────────

function resolveVowel(
  midi: number,
  prescription: Prescription,
): { vowel: string; vowelKorean: string } {
  // If vowel modification map exists, use it
  if (prescription.vowelModificationMap) {
    for (const entry of prescription.vowelModificationMap) {
      if (midi >= entry.startMidi && midi <= entry.endMidi) {
        return { vowel: entry.vowel, vowelKorean: entry.vowelKorean };
      }
    }
  }

  // Default to prescription target vowel
  return {
    vowel: prescription.targetVowel,
    vowelKorean: vowelToKorean(prescription.targetVowel),
  };
}

function vowelToKorean(vowel: string): string {
  const map: Record<string, string> = {
    'a': '아', 'e': '에', 'i': '이', 'o': '오', 'u': '우',
    'ɔ': '오', 'ʌ': '어',
  };
  return map[vowel] ?? vowel;
}
