// ============================================================
// Rhythm Training — RMS-based Onset Detection
// ============================================================
// Detects percussive onsets (claps, taps, vocal attacks) from
// audio RMS values. Uses a simple derivative threshold approach
// with a minimum inter-onset interval to prevent double triggers.
// ============================================================

export interface OnsetDetectorConfig {
  rmsThreshold?: number;        // Minimum RMS to consider (default 0.04)
  derivativeThreshold?: number; // Minimum RMS increase to trigger onset (default 0.02)
  minInterOnsetMs?: number;     // Minimum ms between onsets (default 100)
}

const DEFAULT_CONFIG: Required<OnsetDetectorConfig> = {
  rmsThreshold: 0.04,
  derivativeThreshold: 0.02,
  minInterOnsetMs: 100,
};

export class OnsetDetector {
  private _config: Required<OnsetDetectorConfig>;
  private _onsets: number[] = [];
  private _prevRms = 0;
  private _lastOnsetMs = -Infinity;

  constructor(config?: OnsetDetectorConfig) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Process a single frame of audio data.
   * Call every ~16ms (requestAnimationFrame) with the current RMS and timestamp.
   *
   * @param rms - Current RMS value (0-1)
   * @param timestampMs - Current timestamp in milliseconds
   * @returns true if an onset was detected in this frame
   */
  processFrame(rms: number, timestampMs: number): boolean {
    const derivative = rms - this._prevRms;
    this._prevRms = rms;

    // Check all onset conditions:
    // 1. RMS is above the noise floor threshold
    // 2. RMS derivative is above the detection threshold (rising edge)
    // 3. Enough time has passed since the last onset
    if (
      rms >= this._config.rmsThreshold &&
      derivative >= this._config.derivativeThreshold &&
      timestampMs - this._lastOnsetMs >= this._config.minInterOnsetMs
    ) {
      this._onsets.push(timestampMs);
      this._lastOnsetMs = timestampMs;
      return true;
    }

    return false;
  }

  /**
   * Get all detected onset timestamps in milliseconds.
   */
  get onsets(): number[] {
    return [...this._onsets];
  }

  /**
   * Get the number of detected onsets.
   */
  get count(): number {
    return this._onsets.length;
  }

  /**
   * Reset detector state, clearing all recorded onsets.
   */
  reset(): void {
    this._onsets = [];
    this._prevRms = 0;
    this._lastOnsetMs = -Infinity;
  }
}
