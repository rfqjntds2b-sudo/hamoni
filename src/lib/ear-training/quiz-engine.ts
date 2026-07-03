import { midiToFrequency } from '@/lib/audio/music-utils';
import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';
import type { EarTrainingRound, EarTrainingSession } from './types';

// White keys from C3 (MIDI 48) to B4 (MIDI 71)
// C=0, D=2, E=4, F=5, G=7, A=9, B=11 offsets within octave
const WHITE_KEY_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

const NOTE_LETTER_BY_OFFSET: Record<number, string> = {
  0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B',
};

const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

interface WhiteKey {
  midi: number;
  name: string;
  /** Note letter (C, D, E, etc.) used for solfege lookup */
  letter: string;
}

// Build white key list for C3~B4
const WHITE_KEYS: WhiteKey[] = [];
for (let octave = 3; octave <= 4; octave++) {
  for (const offset of WHITE_KEY_OFFSETS) {
    const midi = (octave + 1) * 12 + offset;
    const letter = NOTE_LETTER_BY_OFFSET[offset];
    WHITE_KEYS.push({
      midi,
      name: `${letter}${octave}`,
      letter,
    });
  }
}

function getSolfegeMap(locale: Locale): Record<string, string> {
  const t = createT(locale, 'earTraining');
  const result: Record<string, string> = {};
  for (const letter of NOTE_LETTERS) {
    result[letter] = t(`solfege.${letter}`);
  }
  return result;
}

function getAllSolfege(locale: Locale): string[] {
  const t = createT(locale, 'earTraining');
  return t('allSolfege').split(',');
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickDistractors(correctSolfege: string, allOptions: string[], count: number): string[] {
  const pool = allOptions.filter((s) => s !== correctSolfege);
  return shuffle(pool).slice(0, count);
}

export function generateRound(previousMidi?: number, locale: Locale = DEFAULT_LOCALE): EarTrainingRound {
  const solfegeMap = getSolfegeMap(locale);
  const allSolfege = getAllSolfege(locale);

  // Pick a random white key, avoid repeating the same note
  let candidates = WHITE_KEYS;
  if (previousMidi !== undefined) {
    candidates = WHITE_KEYS.filter((k) => k.midi !== previousMidi);
  }

  const note = candidates[Math.floor(Math.random() * candidates.length)];
  const solfege = solfegeMap[note.letter];
  const distractors = pickDistractors(solfege, allSolfege, 3);
  const choices = shuffle([solfege, ...distractors]);

  return {
    noteFrequency: midiToFrequency(note.midi),
    noteMidi: note.midi,
    noteName: note.name,
    solfege,
    choices,
    userAnswer: null,
    correct: null,
  };
}

export function generateSession(totalRounds: number = 10, locale: Locale = DEFAULT_LOCALE): EarTrainingSession {
  const rounds: EarTrainingRound[] = [];

  for (let i = 0; i < totalRounds; i++) {
    const prevMidi = i > 0 ? rounds[i - 1].noteMidi : undefined;
    rounds.push(generateRound(prevMidi, locale));
  }

  return {
    rounds,
    correctCount: 0,
    totalRounds,
    completedAt: null,
  };
}
