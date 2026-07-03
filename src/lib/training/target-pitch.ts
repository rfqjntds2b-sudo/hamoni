// ============================================================
// TargetPitchDetector — Auto-lock target pitch from first stable F0
// ============================================================
// Used during sustained exercises to measure cents deviation from
// the user's comfortable pitch. Locks onto the median F0 of the
// first ~1.2s of stable voiced frames.

const MIN_VOICED_FRAMES = 6;       // ~1.2s at 200ms accumulation
const MAX_LOCK_FRAMES = 10;        // ~2s fallback window
const STABILITY_THRESHOLD = 10;    // max Hz std-dev among lock frames

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sq = values.reduce((a, v) => a + (v - mean) ** 2, 0);
  return Math.sqrt(sq / (values.length - 1));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function trimmedMean(values: number[], trimPercent = 10): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * (trimPercent / 100));
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  if (trimmed.length === 0) return sorted[Math.floor(sorted.length / 2)];
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

export class TargetPitchDetector {
  private f0Buffer: number[] = [];
  private totalFrames = 0;
  private locked = false;
  private targetHz = 0;

  /** Push a new frame. Only voiced frames with f0 > 0 are buffered. */
  push(f0: number, isVoiced: boolean): void {
    if (this.locked) return;

    this.totalFrames++;

    if (isVoiced && f0 > 0) {
      this.f0Buffer.push(f0);
    }

    // Try to lock once we have enough voiced frames
    if (this.f0Buffer.length >= MIN_VOICED_FRAMES) {
      const sd = stdDev(this.f0Buffer);
      if (sd < STABILITY_THRESHOLD) {
        this.targetHz = median(this.f0Buffer);
        this.locked = true;
        return;
      }
    }

    // Fallback: if we've seen enough total frames, use trimmed mean
    if (this.totalFrames >= MAX_LOCK_FRAMES && this.f0Buffer.length >= 3) {
      this.targetHz = trimmedMean(this.f0Buffer);
      this.locked = true;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  getTargetHz(): number {
    return this.targetHz;
  }

  /** Signed cents deviation: positive = sharp, negative = flat */
  getCentsDeviation(currentF0: number): number {
    if (!this.locked || this.targetHz <= 0 || currentF0 <= 0) return 0;
    return Math.round(1200 * Math.log2(currentF0 / this.targetHz));
  }

  reset(): void {
    this.f0Buffer = [];
    this.totalFrames = 0;
    this.locked = false;
    this.targetHz = 0;
  }
}
