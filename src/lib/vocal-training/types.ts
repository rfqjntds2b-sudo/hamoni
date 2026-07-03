// ============================================================
// Vocal Training — Shared Types
// ============================================================
// Types used across the scale-training feature:
// diagnostic → prescription → scale generation → session storage.
// ============================================================

import type { VocalState } from '@/lib/vocal-analysis/thresholds';
import type { DiagnosticResult } from '@/lib/vocal-analysis/diagnostic-analyzer';

// Re-export for convenience
export type { VocalState, DiagnosticResult };
export type {
  NoteMetrics,
  SetResult,
  DiagnosticMetrics,
  DiagnosticScaleNote,
  DiagnosticScaleSet,
} from '@/lib/vocal-analysis/diagnostic-analyzer';

// ─── Prescription ───────────────────────────────────────

export interface VowelModEntry {
  startMidi: number;
  endMidi: number;
  vowel: string;
  vowelKorean: string;
}

export interface Prescription {
  targetVowel: string;
  vowelDescription: string;
  larynxPosition: 'low' | 'neutral' | 'slightly_high';
  larynxGuide: string;
  feedbackMessage: string;
  tempo: number;                         // BPM
  scaleType: 'stepwise' | 'arpeggio' | 'descending';
  practiceRange: { low: number; high: number };  // MIDI
  enableSOVT: boolean;
  sovtOptions?: ('hum' | 'lip_trill' | 'straw')[];
  vowelModificationMap?: VowelModEntry[];
  difficultyLevel: number;               // 1–10
  motivationMessage?: string;
}

// ─── Scale ──────────────────────────────────────────────

export interface ScaleNote {
  midi: number;
  frequency: number;
  noteName: string;
  vowel: string;
  vowelKorean: string;
  durationMs: number;
}

export interface ScaleSet {
  setIndex: number;
  key: string;              // e.g. "C4"
  startMidi: number;
  notes: ScaleNote[];
  restAfterMs: number;
}

export interface ScaleSequence {
  sets: ScaleSet[];
  scaleType: 'stepwise' | 'arpeggio' | 'descending';
  tempo: number;
  totalDurationMs: number;
  patternName: string;
}

// ─── Session ────────────────────────────────────────────

export interface ScaleTrainingSession {
  id: string;                            // crypto.randomUUID()
  date: string;                          // YYYY-MM-DD
  startedAt: string;                     // ISO timestamp
  completedAt: string;
  diagnosticState: VocalState;
  diagnosticMetrics: DiagnosticResult['metrics'];
  prescriptionSummary: {
    targetVowel: string;
    scaleType: 'stepwise' | 'arpeggio' | 'descending';
    tempo: number;
    difficultyLevel: number;
    enableSOVT: boolean;
  };
  setsCompleted: number;
  totalSets: number;
  averagePitchAccuracy?: number;         // cents (mic mode only)
  difficultyLevel: number;
  xpEarned?: number;                     // XP gained from this session
}

// ─── Scale Pattern Definitions ──────────────────────────

export interface ScalePattern {
  name: string;
  nameKorean: string;
  intervals: readonly number[];
}
