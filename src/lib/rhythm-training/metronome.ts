// ============================================================
// Rhythm Training — Web Audio Metronome
// ============================================================
// Sample-accurate scheduling using AudioContext.currentTime.
// Uses a look-ahead pattern: schedule 100ms ahead, check every 25ms.
// Strong beat: 880Hz sine, 60ms
// Weak beat: 660Hz sine, 40ms
// Rest: no sound, but still fires onBeat callback
// ============================================================

import type { RhythmPattern, Subdivision } from './types';

export interface MetronomeOptions {
  bpm: number;
  pattern: RhythmPattern;
  audioContext: AudioContext;
  onBeat?: (beatIndex: number) => void;
  volume?: number; // 0-1
}

/**
 * Get the duration multiplier for a subdivision relative to a quarter note.
 */
function subdivisionDuration(sub: Subdivision): number {
  switch (sub) {
    case 'quarter':
      return 1;
    case 'eighth':
      return 0.5;
    case 'sixteenth':
      return 0.25;
    case 'dotted_quarter':
      return 1.5;
    case 'rest':
      return 1;
    default:
      return 1;
  }
}

export class Metronome {
  private _bpm: number;
  private _pattern: RhythmPattern;
  private _audioContext: AudioContext;
  private _onBeat: ((beatIndex: number) => void) | undefined;
  private _volume: number;

  private _isPlaying = false;
  private _currentBeatIndex = 0;
  private _timerHandle: ReturnType<typeof setInterval> | null = null;

  // Scheduling state
  private _nextNoteTime = 0; // AudioContext time of next scheduled beat
  private _scheduledBeatIndex = 0;
  private _startTime = 0;

  // Look-ahead parameters (seconds)
  private readonly SCHEDULE_AHEAD = 0.1; // 100ms
  private readonly CHECK_INTERVAL = 25;  // 25ms

  constructor(options: MetronomeOptions) {
    this._bpm = options.bpm;
    this._pattern = options.pattern;
    this._audioContext = options.audioContext;
    this._onBeat = options.onBeat;
    this._volume = options.volume ?? 0.7;
  }

  /**
   * Compute the time duration (in seconds) for a given beat subdivision.
   */
  private beatDurationSec(sub: Subdivision): number {
    const quarterSec = 60 / this._bpm;
    return quarterSec * subdivisionDuration(sub);
  }

  /**
   * Schedule a click sound at the given AudioContext time.
   */
  private scheduleClick(time: number, accent: boolean, isRest: boolean): void {
    if (isRest) return; // No sound for rests

    const ctx = this._audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = accent ? 880 : 660;
    osc.type = 'sine';

    const clickVolume = accent ? this._volume : this._volume * 0.5;
    const clickDuration = accent ? 0.06 : 0.04;

    gain.gain.setValueAtTime(clickVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + clickDuration);

    osc.start(time);
    osc.stop(time + clickDuration + 0.01);
  }

  /**
   * Look-ahead scheduler: check if we need to schedule upcoming beats.
   */
  private scheduler(): void {
    const beats = this._pattern.beats;

    while (
      this._scheduledBeatIndex < beats.length &&
      this._nextNoteTime < this._audioContext.currentTime + this.SCHEDULE_AHEAD
    ) {
      const beat = beats[this._scheduledBeatIndex];
      const isRest = beat.subdivision === 'rest';

      this.scheduleClick(this._nextNoteTime, beat.accent, isRest);

      // Fire callback on the main thread for UI updates
      const beatIdx = this._scheduledBeatIndex;
      const delay = Math.max(0, (this._nextNoteTime - this._audioContext.currentTime) * 1000);
      setTimeout(() => {
        this._currentBeatIndex = beatIdx;
        this._onBeat?.(beatIdx);
      }, delay);

      // Advance to next beat
      this._nextNoteTime += this.beatDurationSec(beat.subdivision);
      this._scheduledBeatIndex++;
    }

    // Auto-stop when pattern completes
    if (this._scheduledBeatIndex >= beats.length) {
      // Schedule a final stop after the last beat finishes
      const lastBeat = beats[beats.length - 1];
      const finalDelay = Math.max(
        0,
        (this._nextNoteTime - this._audioContext.currentTime) * 1000 + this.beatDurationSec(lastBeat.subdivision) * 1000,
      );
      setTimeout(() => {
        this.stop();
      }, finalDelay);
    }
  }

  start(): void {
    if (this._isPlaying) return;

    this._isPlaying = true;
    this._currentBeatIndex = 0;
    this._scheduledBeatIndex = 0;
    this._startTime = this._audioContext.currentTime;
    this._nextNoteTime = this._startTime;

    this._timerHandle = setInterval(() => this.scheduler(), this.CHECK_INTERVAL);
  }

  stop(): void {
    if (!this._isPlaying) return;

    this._isPlaying = false;

    if (this._timerHandle !== null) {
      clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get currentBeatIndex(): number {
    return this._currentBeatIndex;
  }

  get totalBeats(): number {
    return this._pattern.beats.length;
  }

  /**
   * Get the total duration of the pattern in milliseconds.
   */
  get patternDurationMs(): number {
    let total = 0;
    for (const beat of this._pattern.beats) {
      total += this.beatDurationSec(beat.subdivision) * 1000;
    }
    return total;
  }

  /**
   * Get an array of expected beat times in ms (relative to start = 0).
   * Rests are included with their times but can be filtered by the caller.
   */
  getExpectedBeatTimesMs(): { timeMs: number; isRest: boolean; accent: boolean }[] {
    const times: { timeMs: number; isRest: boolean; accent: boolean }[] = [];
    let currentMs = 0;

    for (const beat of this._pattern.beats) {
      times.push({
        timeMs: currentMs,
        isRest: beat.subdivision === 'rest',
        accent: beat.accent,
      });
      currentMs += this.beatDurationSec(beat.subdivision) * 1000;
    }

    return times;
  }
}
