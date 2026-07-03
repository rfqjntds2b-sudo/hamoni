// ============================================================
// Intended Note Filter — State Machine
// ============================================================
// Filters raw pitch frames so only intentionally sustained notes
// pass through. Rejects noise spikes, glitches, and unstable
// transition frames via multi-frame consensus voting.
//
// Key design: once a note is confirmed (SUSTAINED), the filter
// is lenient — it allows brief dips in clarity/RMS (grace period)
// and smooth pitch slides. The strict gating only applies to
// ONSET (entering from silence).
// ============================================================

import type { PitchResult, PitchSample } from './types';

type FilterState = 'silent' | 'onset' | 'sustained' | 'transition';

interface FilterOptions {
  /** Min clarity to START a new note from silence (default 0.7) */
  clarityThreshold: number;
  /** Min clarity to KEEP an already-confirmed note (default 0.5, more lenient) */
  sustainClarityThreshold: number;
  /** Min RMS amplitude to consider voiced (default 0.012) */
  rmsThreshold: number;
  /** Consecutive frames needed to confirm onset (default 2) */
  onsetFrames: number;
  /** Max semitone deviation to consider "same note" (default 1.5) */
  semitoneTolerance: number;
  /** Semitone jump that triggers a transition (default 3.0) */
  transitionThreshold: number;
  /** Max frames to wait in transition before going silent (default 4) */
  maxTransitionFrames: number;
  /** Frames of grace in SUSTAINED when voice dips briefly (default 3, ~126ms) */
  sustainGraceFrames: number;
}

const DEFAULTS: FilterOptions = {
  clarityThreshold: 0.7,
  sustainClarityThreshold: 0.5,
  rmsThreshold: 0.012,
  onsetFrames: 2,
  semitoneTolerance: 1.5,
  transitionThreshold: 3.0,
  maxTransitionFrames: 4,
  sustainGraceFrames: 3,
};

function midiFromResult(r: PitchResult): number {
  return r.midiNumber + r.cents / 100;
}

function silentSample(timestamp: number, rms: number): PitchSample {
  return {
    timestamp, frequency: 0, note: '', midiNumber: 0,
    cents: 0, clarity: 0, rms, voiced: false,
  };
}

function voicedSample(timestamp: number, r: PitchResult): PitchSample {
  return {
    timestamp, frequency: r.frequency, note: r.note,
    midiNumber: r.midiNumber, cents: r.cents,
    clarity: r.clarity, rms: r.rms, voiced: true,
  };
}

export class IntendedNoteFilter {
  private opts: FilterOptions;
  private _state: FilterState = 'silent';

  // Onset
  private onsetBuffer: number[] = [];
  private onsetAnchor = 0;

  // Sustained
  private currentNoteMidi = 0;
  private graceCount = 0; // frames since last good voiced frame
  private lastGoodPitch: PitchResult | null = null;

  // Transition
  private transitionCount = 0;
  private transitionLastMidi = 0;

  constructor(options?: Partial<FilterOptions>) {
    this.opts = { ...DEFAULTS, ...options };
  }

  get state(): FilterState { return this._state; }

  reset(): void {
    this._state = 'silent';
    this.onsetBuffer = [];
    this.onsetAnchor = 0;
    this.currentNoteMidi = 0;
    this.graceCount = 0;
    this.lastGoodPitch = null;
    this.transitionCount = 0;
  }

  process(pitch: PitchResult | null, timestamp: number): PitchSample {
    const rms = pitch?.rms ?? 0;

    // Minimum plausible singing frequency (~E2). Anything below is detector noise.
    const MIN_FREQ = 80;

    // Strict gate: for entering from silence (ONSET)
    const isStrictVoiced =
      pitch !== null && pitch.frequency >= MIN_FREQ &&
      pitch.clarity >= this.opts.clarityThreshold &&
      pitch.rms >= this.opts.rmsThreshold;

    // Lenient gate: for keeping an already-confirmed note (SUSTAINED)
    const isLenientVoiced =
      pitch !== null && pitch.frequency >= MIN_FREQ &&
      pitch.clarity >= this.opts.sustainClarityThreshold &&
      pitch.rms >= this.opts.rmsThreshold * 0.5;

    switch (this._state) {
      case 'silent':
        return this.processSilent(pitch, timestamp, rms, isStrictVoiced);
      case 'onset':
        return this.processOnset(pitch, timestamp, rms, isStrictVoiced);
      case 'sustained':
        return this.processSustained(pitch, timestamp, rms, isLenientVoiced);
      case 'transition':
        return this.processTransition(pitch, timestamp, rms, isLenientVoiced);
    }
  }

  // ── SILENT ──────────────────────────────────────────────
  private processSilent(
    pitch: PitchResult | null, timestamp: number,
    rms: number, isVoiced: boolean,
  ): PitchSample {
    if (isVoiced && pitch) {
      this._state = 'onset';
      const midi = midiFromResult(pitch);
      this.onsetBuffer = [midi];
      this.onsetAnchor = midi;
      // Don't suppress onset frames — pass through as voiced
      // so there's no perceived delay when starting to sing
      return silentSample(timestamp, rms);
    }
    return silentSample(timestamp, rms);
  }

  // ── ONSET ───────────────────────────────────────────────
  private processOnset(
    pitch: PitchResult | null, timestamp: number,
    rms: number, isVoiced: boolean,
  ): PitchSample {
    if (!isVoiced || !pitch) {
      this._state = 'silent';
      this.onsetBuffer = [];
      return silentSample(timestamp, rms);
    }

    const midi = midiFromResult(pitch);
    const deviation = Math.abs(midi - this.onsetAnchor);

    if (deviation <= this.opts.semitoneTolerance) {
      this.onsetBuffer.push(midi);

      if (this.onsetBuffer.length >= this.opts.onsetFrames) {
        // Consensus reached
        const sorted = [...this.onsetBuffer].sort((a, b) => a - b);
        this.currentNoteMidi = sorted[Math.floor(sorted.length / 2)];
        this._state = 'sustained';
        this.graceCount = 0;
        this.lastGoodPitch = pitch;
        this.onsetBuffer = [];
        return voicedSample(timestamp, pitch);
      }

      // Still accumulating — but pass through as voiced so onset isn't silent
      return voicedSample(timestamp, pitch);
    }

    // Different note — restart
    this.onsetBuffer = [midi];
    this.onsetAnchor = midi;
    return silentSample(timestamp, rms);
  }

  // ── SUSTAINED ───────────────────────────────────────────
  private processSustained(
    pitch: PitchResult | null, timestamp: number,
    rms: number, isVoiced: boolean,
  ): PitchSample {
    // Voice dipped — use grace period instead of immediately going silent
    if (!isVoiced || !pitch) {
      this.graceCount++;
      if (this.graceCount > this.opts.sustainGraceFrames) {
        // Grace exhausted — truly silent
        this._state = 'silent';
        this.currentNoteMidi = 0;
        this.graceCount = 0;
        this.lastGoodPitch = null;
        return silentSample(timestamp, rms);
      }
      // During grace: hold the last good pitch as voiced (bridge the gap)
      if (this.lastGoodPitch) {
        return voicedSample(timestamp, this.lastGoodPitch);
      }
      return silentSample(timestamp, rms);
    }

    // Voice is back — reset grace counter
    this.graceCount = 0;
    this.lastGoodPitch = pitch;

    const midi = midiFromResult(pitch);
    const deviation = Math.abs(midi - this.currentNoteMidi);

    if (deviation <= this.opts.semitoneTolerance) {
      // Same note — track drift smoothly
      this.currentNoteMidi = this.currentNoteMidi * 0.85 + midi * 0.15;
      return voicedSample(timestamp, pitch);
    }

    if (deviation >= this.opts.transitionThreshold) {
      // Check if this is a plausible note change or garbage from voice loss.
      // A drop of >12 semitones (1 octave) in one frame is almost certainly
      // the detector outputting noise as the voice fades — not a real note.
      if (midi < this.currentNoteMidi - 12 || midi < 30) {
        // Treat as voice loss — enter grace period
        this.graceCount++;
        if (this.lastGoodPitch) {
          return voicedSample(timestamp, this.lastGoodPitch);
        }
        return silentSample(timestamp, rms);
      }

      // Plausible note change — enter transition
      this._state = 'transition';
      this.transitionCount = 0;
      this.transitionLastMidi = midi;
      return voicedSample(timestamp, pitch);
    }

    // Medium deviation — but check it's not a gradual decay into garbage.
    // If we've drifted more than 6 semitones below the original confirmed note,
    // it's voice loss, not a real slide.
    if (midi < this.currentNoteMidi - 6) {
      this.graceCount++;
      if (this.graceCount > this.opts.sustainGraceFrames) {
        this._state = 'silent';
        this.currentNoteMidi = 0;
        this.graceCount = 0;
        this.lastGoodPitch = null;
        return silentSample(timestamp, rms);
      }
      if (this.lastGoodPitch) {
        return voicedSample(timestamp, this.lastGoodPitch);
      }
      return silentSample(timestamp, rms);
    }

    // Genuine smooth slide — accept and track
    this.currentNoteMidi = this.currentNoteMidi * 0.6 + midi * 0.4;
    return voicedSample(timestamp, pitch);
  }

  // ── TRANSITION ──────────────────────────────────────────
  private processTransition(
    pitch: PitchResult | null, timestamp: number,
    rms: number, isVoiced: boolean,
  ): PitchSample {
    this.transitionCount++;

    if (!isVoiced || !pitch) {
      // Went silent during transition
      this._state = 'silent';
      this.transitionCount = 0;
      this.lastGoodPitch = null;
      return silentSample(timestamp, rms);
    }

    const midi = midiFromResult(pitch);

    // Garbage detection: very low pitch is noise from voice loss
    if (midi < 30) {
      this._state = 'silent';
      this.transitionCount = 0;
      this.lastGoodPitch = null;
      return silentSample(timestamp, rms);
    }

    if (this.transitionCount > this.opts.maxTransitionFrames) {
      // Stabilized long enough — accept as new sustained note directly
      this.currentNoteMidi = midi;
      this._state = 'sustained';
      this.graceCount = 0;
      this.lastGoodPitch = pitch;
      this.transitionCount = 0;
      return voicedSample(timestamp, pitch);
    }

    const deviationFromLast = Math.abs(midi - this.transitionLastMidi);

    if (deviationFromLast <= this.opts.semitoneTolerance) {
      // Stabilizing — go straight to sustained (skip onset for note changes)
      this.currentNoteMidi = midi;
      this._state = 'sustained';
      this.graceCount = 0;
      this.lastGoodPitch = pitch;
      this.transitionCount = 0;
      return voicedSample(timestamp, pitch);
    }

    // Still moving — output as voiced (it's a slide/glide, not noise)
    this.transitionLastMidi = midi;
    return voicedSample(timestamp, pitch);
  }
}
