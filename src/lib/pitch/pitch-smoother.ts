const ONSET_SEMITONE_THRESHOLD = 1.5; // semitones

export class PitchSmoother {
  private alpha: number;
  private prevFreq: number | null = null;
  private smoothedFreq: number | null = null;

  // alpha=0.25: ~80ms 지연 (2048/48kHz 기준 ~2프레임)
  constructor(alpha: number = 0.25) {
    this.alpha = alpha;
  }

  push(frequency: number): number {
    if (frequency <= 0 || !isFinite(frequency)) {
      return this.smoothedFreq ?? 0;
    }

    if (this.prevFreq === null || this.smoothedFreq === null) {
      this.prevFreq = frequency;
      this.smoothedFreq = frequency;
      return frequency;
    }

    // Onset detection: if jump exceeds threshold, reset
    const semitoneJump = Math.abs(12 * Math.log2(frequency / this.prevFreq));
    if (semitoneJump >= ONSET_SEMITONE_THRESHOLD) {
      this.smoothedFreq = frequency;
      this.prevFreq = frequency;
      return frequency;
    }

    // EMA
    this.smoothedFreq = this.alpha * frequency + (1 - this.alpha) * this.smoothedFreq;
    this.prevFreq = frequency;
    return this.smoothedFreq;
  }

  reset(): void {
    this.prevFreq = null;
    this.smoothedFreq = null;
  }
}
