// ============================================================
// Diagnostic Thresholds & Configuration
// ============================================================
// Constants used by the diagnostic analyzer to classify vocal
// state as BREATHY / PRESSED / PASSAGGIO / BALANCED.
// ============================================================

// ─── Vocal State Type ─────────────────────────────────────

export type VocalState = 'BREATHY' | 'PRESSED' | 'PASSAGGIO' | 'BALANCED';

// ─── Classification Thresholds ────────────────────────────

export const DIAGNOSTIC_THRESHOLDS = {
  breathy: {
    /**
     * HNR below this (dB) suggests insufficient cord closure.
     * Calibrated for spectral HNR (harmonic/noise energy ratio from FFT).
     * Normal voice: 20-35 dB, pathological: < 10 dB.
     * Threshold 18 dB allows margin for consumer microphone degradation (3-5 dB).
     */
    hnrMax: 18,
    /** H1-H2 above this (dB) = H1 dominates → breathy */
    h1MinusH2Min: 8,
  },
  pressed: {
    /** H1-H2 below this (dB) = H2 dominates → hyper-adduction */
    h1MinusH2Max: 0,
    /** Jitter above this (%) signals pressed phonation (clinical normal < 1.0%) */
    jitterMin: 1.5,
    /** Shimmer above this (%) signals pressed phonation (clinical normal < 3.8%) */
    shimmerMin: 5,
    /**
     * Spectral tilt above this → flat/positive = high-frequency excess.
     * Now calibrated for correct dB-to-linear conversion in computeSpectralTilt.
     * Normal voice rolloff is -6 to -12 dB. Flat/positive suggests pressed.
     */
    spectralTiltMin: -3,
    /** Minimum secondary criteria that must be true (alongside H1-H2) to classify PRESSED */
    minSecondaryCriteria: 2,
  },
  passaggio: {
    /** F0 within this % of F1 → source-filter coupling zone */
    f0F1ProximityPercent: 15,
    /** Pitch accuracy drop (cents) relative to other notes → register break */
    pitchAccuracyDropCents: 40,
    /** Spectral change rate above this → timbre discontinuity */
    spectralChangeThreshold: 0.4,
  },
  balanced: {
    /** HNR at or above this (dB) in the healthy range */
    hnrMin: 20,
    /** Jitter at or below this (%) */
    jitterMax: 1.5,
    /** Shimmer at or below this (%) */
    shimmerMax: 5,
  },
} as const;

// ─── Gender-specific Passaggio Defaults (MIDI) ───────────

export const DEFAULT_PASSAGGIO = {
  male:   { start: 64, end: 66 },   // E4 – F#4
  female: { start: 76, end: 78 },   // E5 – F#5
} as const;

// ─── Diagnostic Sequence Configuration ────────────────────

export const DIAGNOSTIC_CONFIG = {
  /** Number of scale sets in the diagnostic */
  setsCount: 6,
  /** Notes per set (5-note up-down = 9 total notes) */
  notesPerSet: 9,
  /** Semitones to transpose between sets (wider to cover passaggio) */
  semitonesPerSet: 2,
  /** Rest between sets (ms) */
  restBetweenSets: 2000,
  /** Tempo for diagnostic scale (BPM) — matches actual usage in scale-training-view */
  tempo: 80,
  /** Duration to analyse user voice per note (ms) */
  analysisWindowMs: 800,
  /** Delay after piano note before analysis starts (ms) */
  pianoLeadMs: 600,
  /** Piano note duration (ms) */
  pianoNoteDuration: 600,
  /** 5-note ascending-descending pattern (semitone intervals from root) */
  scalePattern: [0, 2, 4, 5, 7, 5, 4, 2, 0] as readonly number[],
} as const;

// ─── Voice-type Passaggio Ranges (Hz) ─────────────────────
// Used by DiagnosticAnalyzer when voice type is available.

export const VOICE_TYPE_PASSAGGIO: Record<string, { low: number; high: number }> = {
  Bass:            { low: 164, high: 196 },   // E♭3 – G3
  Baritone:        { low: 220, high: 262 },   // A3  – C4
  Tenor:           { low: 311, high: 349 },   // E♭4 – F4
  Alto:            { low: 294, high: 349 },   // D4  – F4
  'Mezzo-Soprano': { low: 330, high: 415 },   // E4  – A♭4
  Soprano:         { low: 349, high: 466 },   // F4  – B♭4
};
