// ============================================================
// Diagnostic Analyzer
// ============================================================
// Analyses a short diagnostic scale and classifies the singer's
// current vocal state as BREATHY / PRESSED / PASSAGGIO / BALANCED.
// ============================================================

import type { VocalRangeProfile, Gender } from '@/lib/voice/vocal-range';
import { noteToMidi, midiToHz } from '@/lib/voice/vocal-range';
import { midiToNote } from '@/lib/pitch/note-utils';
import {
  type VocalState,
  DIAGNOSTIC_THRESHOLDS as T,
  DIAGNOSTIC_CONFIG,
  DEFAULT_PASSAGGIO,
  VOICE_TYPE_PASSAGGIO,
} from './thresholds';

// ─── Public Types ─────────────────────────────────────────

export interface NoteMetrics {
  targetFreq: number;
  actualFreq: number;
  centsOff: number;
  hnr: number;
  h1MinusH2: number;
  spectralTilt: number;
  jitter: number;
  shimmer: number;
  f1Estimate: number | null;
  spectralChangeRate: number;
  state: VocalState;
}

export interface SetResult {
  setIndex: number;
  startNote: string;
  startMidi: number;
  dominantState: VocalState;
  noteByNoteMetrics: NoteMetrics[];
}

export interface DiagnosticMetrics {
  averageHnr: number;
  averageH1MinusH2: number;
  averageSpectralTilt: number;
  averageJitter: number;
  averageShimmer: number;
  pitchAccuracy: number;
  f0Range: { min: number; max: number };
  passaggioDetected: boolean;
  passaggioFrequency?: number;
}

export interface DiagnosticResult {
  primaryState: VocalState;
  /** Secondary state if present in 25%+ of sets (mixed-state detection) */
  secondaryState?: VocalState;
  confidence: number;
  metrics: DiagnosticMetrics;
  setResults: SetResult[];
  /**
   * When BREATHY or PRESSED with elevated perturbation (jitter > 2% or shimmer > 5.5%),
   * signals possible hoarseness from vocal fold pathology (nodules, polyps, reactive lesions).
   * Should prompt ENT referral.
   */
  possibleHoarseness?: boolean;
}

export interface DiagnosticScaleNote {
  midi: number;
  frequency: number;
  noteName: string;
}

export interface DiagnosticScaleSet {
  setIndex: number;
  startMidi: number;
  notes: DiagnosticScaleNote[];
}

// ─── Analyzer Class ───────────────────────────────────────

export class DiagnosticAnalyzer {
  private gender: Gender;
  private passaggioStart: number;  // MIDI
  private passaggioEnd: number;    // MIDI
  private midpoint: number;        // MIDI — middle of modal range
  private modalLow: number;        // MIDI — bottom of modal range

  constructor(vocalRange: VocalRangeProfile) {
    this.gender = vocalRange.gender;

    // Calculate modal range
    const low = noteToMidi(vocalRange.modalLow);
    const high = noteToMidi(vocalRange.modalHigh);
    this.modalLow = low;
    this.midpoint = Math.round((low + high) / 2);

    // Passaggio range — use voice-type-specific ranges when available
    const voiceType = vocalRange.voiceType;
    const vtPassaggio = voiceType ? VOICE_TYPE_PASSAGGIO[voiceType] : null;

    if (vtPassaggio) {
      // Convert Hz to MIDI for voice-type-specific passaggio
      this.passaggioStart = Math.round(12 * Math.log2(vtPassaggio.low / 440) + 69);
      this.passaggioEnd = Math.round(12 * Math.log2(vtPassaggio.high / 440) + 69);
    } else {
      // Fallback to gender defaults
      const defaults = DEFAULT_PASSAGGIO[this.gender];
      this.passaggioStart = defaults.start;
      this.passaggioEnd = defaults.end;
    }
  }

  // ── Scale Generation ──────────────────────────────────

  /**
   * Generate the diagnostic scale sets.
   * Starts 5 semitones below the passaggio start to ensure the diagnostic
   * traverses through the passaggio zone. This covers both ascending into
   * the passaggio and singing above it, addressing soprano/mezzo coverage.
   * Clamped to modal range to avoid notes outside the singer's capability.
   */
  generateDiagnosticScale(): DiagnosticScaleSet[] {
    const { setsCount, semitonesPerSet, scalePattern } = DIAGNOSTIC_CONFIG;
    const sets: DiagnosticScaleSet[] = [];

    // Start 5 semitones below passaggio to ensure traversal through the break.
    // Clamped so the lowest note in the pattern doesn't go below modal range.
    const idealStart = this.passaggioStart - 5;
    const diagnosticStart = Math.max(idealStart, this.modalLow);

    for (let s = 0; s < setsCount; s++) {
      const startMidi = diagnosticStart + s * semitonesPerSet;
      const notes: DiagnosticScaleNote[] = scalePattern.map((interval) => {
        const midi = startMidi + interval;
        return {
          midi,
          frequency: midiToHz(midi),
          noteName: midiToNote(midi),
        };
      });

      sets.push({ setIndex: s, startMidi, notes });
    }

    return sets;
  }

  // ── Note Classification ───────────────────────────────

  /**
   * Classify a single note's metrics into a VocalState.
   */
  classifyNote(metrics: Omit<NoteMetrics, 'state'>): VocalState {
    const {
      hnr, h1MinusH2, spectralTilt, jitter, shimmer,
      centsOff, f1Estimate, targetFreq, spectralChangeRate,
    } = metrics;

    // ── PRESSED check (highest priority — tension is most urgent to address) ──
    const pressedH1H2 = h1MinusH2 < T.pressed.h1MinusH2Max;
    const pressedTilt = spectralTilt > T.pressed.spectralTiltMin;
    const pressedJitter = jitter > T.pressed.jitterMin;
    const pressedShimmer = shimmer > T.pressed.shimmerMin;

    // Require H1-H2 primary + at least 2 of 3 secondary criteria
    const secondaryCount = [pressedTilt, pressedJitter, pressedShimmer].filter(Boolean).length;
    if (pressedH1H2 && secondaryCount >= T.pressed.minSecondaryCriteria) {
      return 'PRESSED';
    }

    // ── PASSAGGIO check ──
    const targetMidi = Math.round(12 * Math.log2(targetFreq / 440) + 69);
    const inPassaggioRange = targetMidi >= this.passaggioStart - 2 &&
                              targetMidi <= this.passaggioEnd + 3;

    if (inPassaggioRange) {
      const f0F1Close = f1Estimate !== null &&
        Math.abs(targetFreq - f1Estimate) / f1Estimate < T.passaggio.f0F1ProximityPercent / 100;
      const timbralBreak = spectralChangeRate > T.passaggio.spectralChangeThreshold;
      const accuracyDrop = centsOff > T.passaggio.pitchAccuracyDropCents;

      if ((f0F1Close && (timbralBreak || accuracyDrop)) ||
          (timbralBreak && accuracyDrop)) {
        return 'PASSAGGIO';
      }
    }

    // ── BREATHY check (require BOTH conditions to reduce false positives) ──
    const breathyHnr = hnr < T.breathy.hnrMax;
    const breathyH1H2 = h1MinusH2 > T.breathy.h1MinusH2Min;

    if (breathyHnr && breathyH1H2) {
      return 'BREATHY';
    }

    return 'BALANCED';
  }

  // ── Set Classification ────────────────────────────────

  /**
   * Determine the dominant state for a set of notes.
   * Uses frequency counting with PASSAGGIO priority.
   */
  classifySet(noteMetrics: NoteMetrics[]): VocalState {
    if (noteMetrics.length === 0) return 'BALANCED';

    const counts: Record<VocalState, number> = {
      BREATHY: 0,
      PRESSED: 0,
      PASSAGGIO: 0,
      BALANCED: 0,
    };

    for (const n of noteMetrics) {
      counts[n.state]++;
    }

    // Fair frequency voting — most frequent non-BALANCED state wins
    // if it appears in 1/3+ of the notes in this set
    const nonBalanced: [VocalState, number][] = [
      ['PRESSED', counts.PRESSED],
      ['PASSAGGIO', counts.PASSAGGIO],
      ['BREATHY', counts.BREATHY],
    ];
    nonBalanced.sort((a, b) => b[1] - a[1]);

    if (nonBalanced[0][1] > 0 && nonBalanced[0][1] >= noteMetrics.length / 3) {
      return nonBalanced[0][0];
    }

    return 'BALANCED';
  }

  // ── Full Diagnosis ────────────────────────────────────

  /**
   * Aggregate all set results into a final DiagnosticResult.
   */
  analyze(setResults: SetResult[]): DiagnosticResult {
    // Flatten all note metrics (only voiced notes — voiceless are already excluded)
    const allNotes = setResults.flatMap((s) => s.noteByNoteMetrics);

    // Total expected notes across all sets
    const totalExpectedNotes = setResults.length * 9; // 9 notes per set
    const voicedRatio = totalExpectedNotes > 0 ? allNotes.length / totalExpectedNotes : 0;

    // Insufficient voice data → confidence 0 (진단 불가)
    if (allNotes.length === 0 || voicedRatio < 0.3) {
      return {
        primaryState: 'BALANCED',
        confidence: 0,
        metrics: emptyMetrics(),
        setResults,
      };
    }

    // Aggregate metrics
    const voicedFreqs = allNotes.map((n) => n.actualFreq).filter((f) => f > 0);
    const metrics: DiagnosticMetrics = {
      averageHnr: avg(allNotes.map((n) => n.hnr)),
      averageH1MinusH2: avg(allNotes.map((n) => n.h1MinusH2)),
      averageSpectralTilt: avg(allNotes.map((n) => n.spectralTilt)),
      averageJitter: avg(allNotes.map((n) => n.jitter)),
      averageShimmer: avg(allNotes.map((n) => n.shimmer)),
      pitchAccuracy: avg(allNotes.map((n) => n.centsOff)),
      f0Range: {
        min: voicedFreqs.length > 0 ? Math.min(...voicedFreqs) : 0,
        max: voicedFreqs.length > 0 ? Math.max(...voicedFreqs) : 0,
      },
      passaggioDetected: false,
    };

    // Check for passaggio
    const passaggioNotes = allNotes.filter((n) => n.state === 'PASSAGGIO');
    if (passaggioNotes.length >= 2) {
      metrics.passaggioDetected = true;
      const sorted = [...passaggioNotes].sort((a, b) => a.targetFreq - b.targetFreq);
      metrics.passaggioFrequency = sorted[0].targetFreq;
    }

    // Determine primary state via set-level voting
    // Only count sets that have voiced notes
    const setsWithVoice = setResults.filter((s) => s.noteByNoteMetrics.length > 0);
    const stateCounts: Record<VocalState, number> = {
      BREATHY: 0, PRESSED: 0, PASSAGGIO: 0, BALANCED: 0,
    };
    for (const s of setsWithVoice) {
      stateCounts[s.dominantState]++;
    }

    // Fair voting — no single state gets unconditional priority
    const votingTotal = setsWithVoice.length;
    const ranked: [VocalState, number][] = [
      ['PRESSED', stateCounts.PRESSED],
      ['PASSAGGIO', stateCounts.PASSAGGIO],
      ['BREATHY', stateCounts.BREATHY],
      ['BALANCED', stateCounts.BALANCED],
    ];
    ranked.sort((a, b) => b[1] - a[1]);
    const primaryState: VocalState = ranked[0][0];

    // Secondary state: if another non-BALANCED state appears in 25%+ of sets
    let secondaryState: VocalState | undefined;
    if (ranked.length > 1 && ranked[1][0] !== 'BALANCED' && ranked[1][0] !== primaryState) {
      const secondaryRatio = votingTotal > 0 ? ranked[1][1] / votingTotal : 0;
      if (secondaryRatio >= 0.25) {
        secondaryState = ranked[1][0];
      }
    }

    // Confidence: set agreement × voiced ratio
    const agreeing = stateCounts[primaryState];
    const setAgreement = votingTotal > 0 ? agreeing / votingTotal : 0;
    const confidence = setAgreement * Math.min(voicedRatio / 0.7, 1); // Scale by voiced ratio (70%+ = full credit)

    // Hoarseness sub-detection: BREATHY or PRESSED + elevated perturbation suggests pathology
    // BREATHY + high perturbation → incomplete glottal closure (nodules, polyps)
    // PRESSED + high perturbation → reactive lesions from chronic hyperfunction
    const possibleHoarseness =
      (primaryState === 'BREATHY' || primaryState === 'PRESSED') &&
      (metrics.averageJitter > 2 || metrics.averageShimmer > 5.5);

    return { primaryState, secondaryState, confidence, metrics, setResults, possibleHoarseness };
  }
}

// ── Default DiagnosticResult for Manual Selection ─────────

export function createManualDiagnosticResult(state: VocalState): DiagnosticResult {
  return {
    primaryState: state,
    confidence: 1,
    metrics: emptyMetrics(),
    setResults: [],
  };
}

// ── Helpers ───────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function emptyMetrics(): DiagnosticMetrics {
  return {
    averageHnr: 0,
    averageH1MinusH2: 0,
    averageSpectralTilt: 0,
    averageJitter: 0,
    averageShimmer: 0,
    pitchAccuracy: 0,
    f0Range: { min: 0, max: 0 },
    passaggioDetected: false,
  };
}
