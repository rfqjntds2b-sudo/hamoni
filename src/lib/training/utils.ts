// ============================================================
// Training Feature — Shared Utility Functions
// ============================================================

import { STATUS } from '@/lib/design-tokens';

/**
 * Normalize a raw metric value to a 0-100 score.
 *
 * @param value  - the measured value
 * @param best   - the value that maps to score 100
 * @param worst  - the value that maps to score 0
 * @param inverse - when true, lower `value` yields a higher score
 *                  (useful for metrics like jitter where less is better)
 * @returns clamped integer in [0, 100]
 */
export function toScore(
  value: number,
  best: number,
  worst: number,
  inverse = false,
): number {
  if (best === worst) return 0;

  let v = value;
  let b = best;
  let w = worst;

  if (inverse) {
    // Flip so that lower value = higher score
    v = -v;
    b = -b;
    w = -w;
  }

  const range = b - w;
  const raw = ((v - w) / range) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Map a score (0-100) to a traffic-light colour (oklch).
 *
 * - < 40  : fail (destructive)
 * - 40-69 : warn (warm-amber-dim)
 * - >= 70 : success (green)
 */
export function scoreColor(score: number): string {
  if (score < 40) return STATUS.fail;
  if (score < 70) return STATUS.warn;
  return STATUS.success;
}

// ---- Note names for freqToNote ----
const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

/**
 * Convert a frequency (Hz) to the nearest musical note name.
 * Uses A4 = 440 Hz equal temperament.
 *
 * @param freq - frequency in Hz (must be > 0)
 * @returns note name with octave, e.g. "A4", "C#3"
 */
export function freqToNote(freq: number): string {
  if (!Number.isFinite(freq) || freq <= 0) return '--';

  // Semitones from A4
  const semitones = 12 * Math.log2(freq / 440);
  const rounded = Math.round(semitones);

  // MIDI note number (A4 = 69)
  const midi = 69 + rounded;
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;

  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Format a duration in seconds to "M:SS" string.
 *
 * @param seconds - non-negative number of seconds
 * @returns formatted string, e.g. 65 -> "1:05", 0 -> "0:00"
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const totalSec = Math.floor(seconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
