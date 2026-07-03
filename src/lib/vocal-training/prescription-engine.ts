// ============================================================
// Prescription Engine
// ============================================================
// Generates a training prescription based on diagnostic results,
// user vocal range, and previous session history.
//
// Theory (Non-linear Source-Filter):
//   - BREATHY  -> increase inertance via high-tongue vowels + fast tempo
//   - PRESSED  -> reduce adduction via open vowels + slow tempo + SOVT
//   - PASSAGGIO -> vowel modification map for smooth register transition
//   - BALANCED -> progressive difficulty increase
// ============================================================

import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';
import type { VocalRangeProfile } from '@/lib/voice/vocal-range';
import { noteToMidi } from '@/lib/voice/vocal-range';
import type {
  Prescription,
  VowelModEntry,
  ScaleTrainingSession,
  VocalState,
  DiagnosticResult,
} from './types';

// ─── Constants ──────────────────────────────────────────

const BASE_DIFFICULTY = 3;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const CONSECUTIVE_BALANCED_THRESHOLD = 3;

// Tempo ranges per state
const TEMPO = {
  BREATHY:    { min: 100, max: 120 },
  PRESSED:    { min: 60,  max: 80 },
  PASSAGGIO:  { min: 80,  max: 100 },
  BALANCED:   { min: 80,  max: 120 },
} as const;

// Passaggio vowel modification semitone offsets from detected passaggio
const PASSAGGIO_MOD = {
  preStart: -2,    // start blending 2 semitones below
  postEnd: 3,      // finish blending 3 semitones above
} as const;

// Default passaggio MIDI (fallback when not detected)
const DEFAULT_PASSAGGIO_MIDI = {
  male: 64,    // E4
  female: 76,  // E5
} as const;

// ─── Main Function ──────────────────────────────────────

export function generatePrescription(
  diagnostic: DiagnosticResult,
  vocalRange: VocalRangeProfile,
  previousSessions?: ScaleTrainingSession[],
  locale: Locale = DEFAULT_LOCALE,
): Prescription {
  const t = createT(locale, 'scaleTraining');
  const state = diagnostic.primaryState;
  const sorted = previousSessions
    ? [...previousSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    : [];
  const lastSession = sorted[0] ?? null;

  // Calculate practice range from vocal range
  const modalLow = noteToMidi(vocalRange.modalLow);
  const modalHigh = noteToMidi(vocalRange.modalHigh);
  const comfortLow = noteToMidi(vocalRange.comfortLow);
  const comfortHigh = noteToMidi(vocalRange.comfortHigh);

  // Base difficulty from last session or default
  let difficulty = lastSession?.difficultyLevel ?? BASE_DIFFICULTY;

  // Daily adjustment
  const motivation = getDailyAdjustment(state, lastSession, sorted, t);
  difficulty = clampDifficulty(difficulty + motivation.difficultyDelta);

  let rx: Prescription;

  switch (state) {
    case 'BREATHY':
      rx = prescribeBreathy(
        difficulty, modalLow, comfortLow, comfortHigh, t, motivation.message,
      );
      break;

    case 'PRESSED':
      rx = prescribePressed(
        difficulty, modalLow, modalHigh, comfortLow, comfortHigh, t, motivation.message,
      );
      break;

    case 'PASSAGGIO':
      rx = prescribePassaggio(
        difficulty, diagnostic, vocalRange, t, motivation.message,
      );
      break;

    case 'BALANCED':
    default:
      rx = prescribeBalanced(
        difficulty, modalLow, modalHigh, comfortLow, comfortHigh,
        lastSession, sorted, t, motivation.message,
      );
      break;
  }

  // Blend secondary state: ensure SOVT is available when secondary is PRESSED or BREATHY
  const secondary = diagnostic.secondaryState;
  if (secondary && secondary !== state) {
    if ((secondary === 'PRESSED' || secondary === 'BREATHY') && !rx.enableSOVT) {
      rx = { ...rx, enableSOVT: true, sovtOptions: ['hum', 'lip_trill'] };
    }
  }

  return rx;
}

// ─── Translation helper type ────────────────────────────

type TFn = (key: string, params?: Record<string, string | number>) => string;

// ─── State-specific Prescriptions ───────────────────────

function prescribeBreathy(
  difficulty: number,
  modalLow: number,
  comfortLow: number,
  comfortHigh: number,
  t: TFn,
  motivationMessage?: string,
): Prescription {
  // Practice in lower-mid range where contact training is safest
  const rangeMid = Math.round((comfortLow + comfortHigh) / 2);
  const practiceHigh = Math.min(rangeMid + 2, comfortHigh);

  return {
    targetVowel: 'i',
    vowelDescription: t('prescription.breathyVowelDesc'),
    larynxPosition: 'neutral',
    larynxGuide: t('prescription.breathyLarynxGuide'),
    feedbackMessage: t('prescription.breathyFeedback'),
    tempo: scaleTempo(TEMPO.BREATHY, difficulty),
    scaleType: 'stepwise',
    practiceRange: { low: Math.max(modalLow, comfortLow - 2), high: practiceHigh },
    enableSOVT: true,
    sovtOptions: ['straw', 'hum', 'lip_trill'],
    difficultyLevel: difficulty,
    motivationMessage,
  };
}

function prescribePressed(
  difficulty: number,
  modalLow: number,
  modalHigh: number,
  comfortLow: number,
  comfortHigh: number,
  t: TFn,
  motivationMessage?: string,
): Prescription {
  // Practice in mid range, avoid extremes
  const midLow = Math.round((comfortLow + comfortHigh) / 2) - 3;
  const midHigh = Math.round((comfortLow + comfortHigh) / 2) + 3;

  return {
    targetVowel: 'u',
    vowelDescription: t('prescription.pressedVowelDesc'),
    larynxPosition: 'low',
    larynxGuide: t('prescription.pressedLarynxGuide'),
    feedbackMessage: t('prescription.pressedFeedback'),
    // PRESSED: keep tempo slow regardless of difficulty (60-70 BPM).
    // Difficulty increases via pattern complexity, not speed.
    tempo: Math.round(TEMPO.PRESSED.min + Math.min(difficulty / MAX_DIFFICULTY, 0.5) * (TEMPO.PRESSED.max - TEMPO.PRESSED.min)),
    scaleType: 'descending',
    practiceRange: {
      low: Math.max(modalLow, midLow),
      high: Math.min(modalHigh, midHigh),
    },
    enableSOVT: true,
    sovtOptions: ['lip_trill', 'straw', 'hum'],
    difficultyLevel: difficulty,
    motivationMessage,
  };
}

function prescribePassaggio(
  difficulty: number,
  diagnostic: DiagnosticResult,
  vocalRange: VocalRangeProfile,
  t: TFn,
  motivationMessage?: string,
): Prescription {
  const gender = vocalRange.gender;
  const passaggioMidi = diagnostic.metrics.passaggioFrequency
    ? Math.round(12 * Math.log2(diagnostic.metrics.passaggioFrequency / 440) + 69)
    : DEFAULT_PASSAGGIO_MIDI[gender];

  // Practice range: +/-5 semitones around passaggio
  const modalLow = noteToMidi(vocalRange.modalLow);
  const modalHigh = noteToMidi(vocalRange.modalHigh);

  const practiceLow = Math.max(modalLow, passaggioMidi - 5);
  const practiceHigh = Math.min(modalHigh, passaggioMidi + 5);

  // Build vowel modification map
  const modStart = passaggioMidi + PASSAGGIO_MOD.preStart;
  const modEnd = passaggioMidi + PASSAGGIO_MOD.postEnd;

  const vowelModificationMap: VowelModEntry[] = [
    { startMidi: practiceLow, endMidi: modStart - 1, vowel: 'a', vowelKorean: t('prescription.vowelA') },
    { startMidi: modStart, endMidi: passaggioMidi - 1, vowel: 'ɔ', vowelKorean: t('prescription.vowelOpenO') },
    { startMidi: passaggioMidi, endMidi: modEnd, vowel: 'o', vowelKorean: t('prescription.vowelRoundO') },
    { startMidi: modEnd + 1, endMidi: practiceHigh, vowel: 'u', vowelKorean: t('prescription.vowelU') },
  ];

  return {
    targetVowel: 'a->ɔ->o->u',
    vowelDescription: t('prescription.passaggioVowelDesc'),
    larynxPosition: 'neutral',
    larynxGuide: t('prescription.passaggioLarynxGuide'),
    feedbackMessage: t('prescription.passaggioFeedback'),
    tempo: scaleTempo(TEMPO.PASSAGGIO, difficulty),
    scaleType: 'arpeggio',
    practiceRange: { low: practiceLow, high: practiceHigh },
    enableSOVT: true,
    sovtOptions: ['hum', 'lip_trill'],
    vowelModificationMap,
    difficultyLevel: difficulty,
    motivationMessage,
  };
}

function prescribeBalanced(
  difficulty: number,
  modalLow: number,
  modalHigh: number,
  comfortLow: number,
  comfortHigh: number,
  lastSession: ScaleTrainingSession | null,
  sorted: ScaleTrainingSession[],
  t: TFn,
  motivationMessage?: string,
): Prescription {
  // Count consecutive BALANCED days
  let consecutiveBalanced = 0;
  for (const s of sorted) {
    if (s.diagnosticState === 'BALANCED') consecutiveBalanced++;
    else break;
  }

  // High-water-mark: recover previous range expansion when returning to BALANCED
  // Look at recent BALANCED sessions for the widest range pad used
  const recentBalanced = sorted
    .filter((s) => s.diagnosticState === 'BALANCED')
    .slice(0, 10);
  let maxHistoricalPad = 0;
  for (const s of recentBalanced) {
    const summary = s.prescriptionSummary as Record<string, unknown> | undefined;
    if (summary && typeof summary.rangePad === 'number') {
      maxHistoricalPad = Math.max(maxHistoricalPad, summary.rangePad);
    }
  }
  // Decay: lose 1 semitone per 3 non-balanced days since last balanced
  let nonBalancedDays = 0;
  for (const s of sorted) {
    if (s.diagnosticState !== 'BALANCED') nonBalancedDays++;
    else break;
  }
  const decayedPad = Math.max(0, maxHistoricalPad - Math.floor(nonBalancedDays / 3));

  // Progressive expansion -- one dimension per day to avoid overwhelming jumps
  let rangePad = 0;
  let useArpeggio = false;

  if (consecutiveBalanced >= CONSECUTIVE_BALANCED_THRESHOLD) {
    // Stage the push: day 3 = range, day 4 = pattern, day 5+ = both
    const pushDay = consecutiveBalanced - CONSECUTIVE_BALANCED_THRESHOLD;
    if (pushDay >= 2) {
      // Day 5+: both range expansion + arpeggio
      rangePad = 2;
      useArpeggio = true;
    } else if (pushDay >= 1) {
      // Day 4: pattern complexity (arpeggio) only
      rangePad = 1;
      useArpeggio = true;
    } else {
      // Day 3: range expansion only
      rangePad = 2;
    }
  } else if (lastSession) {
    rangePad = 1;
  }

  // Apply high-water-mark: don't regress below previously achieved range
  rangePad = Math.max(rangePad, decayedPad);

  // Alternate vowels for variety
  const vowelCycle = ['a', 'e', 'i', 'o', 'u'];
  const vowelKeyMap = ['vowelA', 'vowelE', 'vowelI', 'vowelO', 'vowelU'];
  const idx = (consecutiveBalanced) % vowelCycle.length;
  const localizedVowel = t(`prescription.${vowelKeyMap[idx]}`);

  return {
    targetVowel: vowelCycle[idx],
    vowelDescription: t('prescription.balancedVowelDesc', { vowel: localizedVowel }),
    larynxPosition: 'neutral',
    larynxGuide: t('prescription.balancedLarynxGuide'),
    feedbackMessage: t('prescription.balancedFeedback'),
    tempo: scaleTempo(TEMPO.BALANCED, difficulty),
    scaleType: useArpeggio ? 'arpeggio' : 'stepwise',
    practiceRange: {
      low: Math.max(modalLow, comfortLow - rangePad),
      high: Math.min(modalHigh, comfortHigh + rangePad),
    },
    enableSOVT: false,
    difficultyLevel: difficulty,
    motivationMessage,
  };
}

// ─── Daily Adjustment ───────────────────────────────────

interface DailyAdjustment {
  difficultyDelta: number;
  message?: string;
}

function getDailyAdjustment(
  todayState: VocalState,
  lastSession: ScaleTrainingSession | null,
  sorted: ScaleTrainingSession[],
  t: TFn,
): DailyAdjustment {
  if (!lastSession) {
    return { difficultyDelta: 0, message: t('prescription.motivationFirst') };
  }

  const prevState = lastSession.diagnosticState;

  // Improvement: was problematic, now balanced
  if (prevState !== 'BALANCED' && todayState === 'BALANCED') {
    return {
      difficultyDelta: 1,
      message: t('prescription.motivationImproved'),
    };
  }

  // Regression: was balanced, now problematic
  if (prevState === 'BALANCED' && todayState !== 'BALANCED') {
    return {
      difficultyDelta: -2,
      message: t('prescription.motivationRegressed'),
    };
  }

  // Same problematic state -> micro-progression (+0.5 per consecutive session, capped at +2)
  if (prevState === todayState && todayState !== 'BALANCED') {
    let consecutiveSame = 0;
    for (const s of sorted) {
      if (s.diagnosticState === todayState) consecutiveSame++;
      else break;
    }
    const microDelta = Math.min(Math.round(consecutiveSame * 0.5), 2);
    return {
      difficultyDelta: microDelta,
      message: microDelta > 0
        ? t('prescription.motivationSameIncreased')
        : t('prescription.motivationSameSteady'),
    };
  }

  // Consecutive balanced -> progressive push
  let consecutiveBalanced = 0;
  for (const s of sorted) {
    if (s.diagnosticState === 'BALANCED') consecutiveBalanced++;
    else break;
  }

  if (consecutiveBalanced >= CONSECUTIVE_BALANCED_THRESHOLD) {
    return {
      difficultyDelta: 2,
      message: t('prescription.motivationStreak', { days: consecutiveBalanced }),
    };
  }

  return { difficultyDelta: 0 };
}

// ─── Helpers ────────────────────────────────────────────

function scaleTempo(
  range: { min: number; max: number },
  difficulty: number,
): number {
  // Higher difficulty -> faster tempo (within the state's range)
  const ratio = (difficulty - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY);
  return Math.round(range.min + ratio * (range.max - range.min));
}

function clampDifficulty(d: number): number {
  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, Math.round(d)));
}

// ============================================================
// Custom Practice — bypass diagnosis, build Prescription directly
// ============================================================

export interface CustomScaleOptions {
  difficultyLevel: number;       // 1-10
  tempo: number;                 // 50-120 BPM
  scaleType: 'stepwise' | 'arpeggio' | 'descending';
  rangeLow: number;              // MIDI (e.g. 48 = C3)
  rangeHigh: number;             // MIDI (e.g. 72 = C5)
  vowel?: string;                // default: 'a'
}

/** Build a Prescription from user-selected parameters (no diagnostic). */
export function buildCustomPrescription(options: CustomScaleOptions): Prescription {
  const low = Math.min(options.rangeLow, options.rangeHigh);
  const high = Math.max(options.rangeLow, options.rangeHigh);
  return {
    targetVowel: options.vowel ?? 'a',
    vowelDescription: '',
    larynxPosition: 'neutral',
    larynxGuide: '',
    feedbackMessage: '',
    tempo: Math.max(50, Math.min(120, Math.round(options.tempo))),
    scaleType: options.scaleType,
    practiceRange: { low, high },
    enableSOVT: false,
    difficultyLevel: clampDifficulty(options.difficultyLevel),
  };
}
