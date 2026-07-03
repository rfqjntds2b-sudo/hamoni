// ============================================================
// FormantEstimator — F1/F2 estimation via spectral peak picking
// ============================================================
// Extends the existing F1 estimation pattern from audio-metrics.ts
// to include F2 detection. Uses harmonic exclusion + parabolic
// interpolation for sub-bin accuracy.

export interface FormantResult {
  f1: number | null;
  f2: number | null;
}

// ── Helpers ──────────────────────────────────────────────────

/** 5-bin moving average smoothing */
function smooth(spectrum: Float32Array, windowSize = 5): Float32Array {
  const out = new Float32Array(spectrum.length);
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < spectrum.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < spectrum.length) {
        sum += spectrum[j];
        count++;
      }
    }
    out[i] = sum / count;
  }
  return out;
}

/** Build a set of harmonic bin indices (H1-H8) with ±guard bins to exclude */
function buildHarmonicExclusion(
  f0: number,
  sampleRate: number,
  fftSize: number,
  guard = 2,
  maxHarmonic = 8,
): Set<number> {
  const binWidth = sampleRate / fftSize;
  const excluded = new Set<number>();
  for (let h = 1; h <= maxHarmonic; h++) {
    const centerBin = Math.round((f0 * h) / binWidth);
    for (let g = -guard; g <= guard; g++) {
      const bin = centerBin + g;
      if (bin >= 0) excluded.add(bin);
    }
  }
  return excluded;
}

/** Parabolic interpolation for sub-bin peak frequency */
function parabolicPeak(
  spectrum: Float32Array,
  peakBin: number,
  binWidth: number,
): number {
  if (peakBin <= 0 || peakBin >= spectrum.length - 1) {
    return peakBin * binWidth;
  }
  const alpha = spectrum[peakBin - 1];
  const beta = spectrum[peakBin];
  const gamma = spectrum[peakBin + 1];
  const denom = alpha - 2 * beta + gamma;
  if (Math.abs(denom) < 1e-10) return peakBin * binWidth;
  const p = 0.5 * (alpha - gamma) / denom;
  return (peakBin + p) * binWidth;
}

/** Find highest non-harmonic peak in a frequency range */
function findPeak(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
  minHz: number,
  maxHz: number,
  excluded: Set<number>,
  minProminence = 6,
): { bin: number; freq: number } | null {
  const binWidth = sampleRate / fftSize;
  const minBin = Math.max(1, Math.ceil(minHz / binWidth));
  const maxBin = Math.min(spectrum.length - 2, Math.floor(maxHz / binWidth));

  let bestBin = -1;
  let bestVal = -Infinity;

  for (let i = minBin; i <= maxBin; i++) {
    if (excluded.has(i)) continue;
    if (spectrum[i] > bestVal) {
      bestVal = spectrum[i];
      bestBin = i;
    }
  }

  if (bestBin < 0) return null;

  // Check prominence: peak must be at least minProminence dB above local floor
  // Local floor = min of 20-bin neighborhood
  const floorStart = Math.max(0, bestBin - 10);
  const floorEnd = Math.min(spectrum.length - 1, bestBin + 10);
  let floor = Infinity;
  for (let i = floorStart; i <= floorEnd; i++) {
    if (spectrum[i] < floor) floor = spectrum[i];
  }
  if (bestVal - floor < minProminence) return null;

  const freq = parabolicPeak(spectrum, bestBin, binWidth);
  return { bin: bestBin, freq };
}

// ── Main Function ───────────────────────────────────────────

/**
 * Estimate F1 and F2 formant frequencies from FFT magnitude data.
 *
 * @param freqData - Float32Array from AnalyserNode.getFloatFrequencyData (dB scale)
 * @param sampleRate - Audio context sample rate (e.g. 48000)
 * @param f0 - Fundamental frequency in Hz (must be > 0)
 * @returns FormantResult with f1 and f2 in Hz, or null if not detected
 */
export function estimateFormants(
  freqData: Float32Array,
  sampleRate: number,
  f0: number,
): FormantResult {
  if (f0 <= 0 || freqData.length === 0) {
    return { f1: null, f2: null };
  }

  const fftSize = freqData.length * 2; // frequencyBinCount = fftSize / 2
  const smoothed = smooth(freqData);
  const excluded = buildHarmonicExclusion(f0, sampleRate, fftSize);

  // F1: search 200-1000 Hz
  const f1Result = findPeak(smoothed, sampleRate, fftSize, 200, 1000, excluded);
  const f1 = f1Result ? f1Result.freq : null;

  // F2: search max(F1+200, 800) to 2800 Hz
  const f2MinHz = f1 !== null ? Math.max(f1 + 200, 800) : 800;
  const f2Result = findPeak(smoothed, sampleRate, fftSize, f2MinHz, 2800, excluded);
  const f2 = f2Result ? f2Result.freq : null;

  // Validation: F2 must be at least 100 Hz above F1
  if (f1 !== null && f2 !== null && f2 < f1 + 100) {
    return { f1, f2: null };
  }

  return { f1, f2 };
}
