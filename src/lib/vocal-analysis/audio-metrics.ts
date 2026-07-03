// ============================================================
// Audio Metrics — Pure DSP Functions
// ============================================================
// Supplements the existing useVoiceAnalyzer pipeline with
// additional spectral measurements needed by the diagnostic.
// All functions are pure (no AudioContext side-effects).
// ============================================================

/**
 * Estimate the first formant frequency (F1) using spectral peak detection.
 *
 * Strategy: smooth the FFT magnitude spectrum with a 3-bin moving average,
 * then search for the first prominent peak above F0 × 1.3.
 *
 * @returns Estimated F1 in Hz, or null if no clear peak found.
 */
export function estimateF1(
  fftData: Float32Array | Uint8Array,
  sampleRate: number,
  f0: number,
): number | null {
  if (!fftData.length || f0 <= 0 || sampleRate <= 0) return null;

  const binCount = fftData.length;
  const binWidth = sampleRate / (binCount * 2); // FFT size = binCount * 2

  // Smooth with 3-bin moving average
  const smoothed = new Float32Array(binCount);
  for (let i = 1; i < binCount - 1; i++) {
    smoothed[i] = (fftData[i - 1] + fftData[i] + fftData[i + 1]) / 3;
  }
  smoothed[0] = (fftData[0] + fftData[1]) / 2;
  smoothed[binCount - 1] = (fftData[binCount - 2] + fftData[binCount - 1]) / 2;

  // Search range: above F0 × 1.3, below 4000 Hz (F1 is typically 200–1000 Hz)
  const startBin = Math.ceil((f0 * 1.3) / binWidth);
  const endBin = Math.min(Math.floor(4000 / binWidth), binCount - 2);

  if (startBin >= endBin) return null;

  // Build harmonic exclusion set (H1–H6, ±2 bins each)
  const harmonicBins: number[] = [];
  for (let h = 1; h <= 6; h++) harmonicBins.push(Math.round((h * f0) / binWidth));
  const isNearHarmonic = (bin: number) =>
    harmonicBins.some(hb => Math.abs(bin - hb) <= 2);

  // Find the most prominent local peak, excluding harmonic bins
  let bestBin = -1;
  let bestValue = -Infinity;

  for (let i = startBin; i <= endBin; i++) {
    if (isNearHarmonic(i)) continue;
    if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
      if (smoothed[i] > bestValue) {
        bestValue = smoothed[i];
        bestBin = i;
      }
    }
  }

  if (bestBin < 0) return null;

  // Parabolic interpolation for sub-bin accuracy
  const alpha = smoothed[bestBin - 1];
  const beta = smoothed[bestBin];
  const gamma = smoothed[bestBin + 1];
  const denom = alpha - 2 * beta + gamma;
  const correction = denom !== 0 ? 0.5 * (alpha - gamma) / denom : 0;

  return (bestBin + correction) * binWidth;
}

/**
 * Compute H1 − H2 from FFT magnitude data.
 * H1 = amplitude at F0, H2 = amplitude at 2×F0.
 * Positive → breathy tendency, negative → pressed tendency.
 */
export function computeH1MinusH2(
  fftData: Float32Array | Uint8Array,
  sampleRate: number,
  f0: number,
): number {
  if (!fftData.length || f0 <= 0 || sampleRate <= 0) return 0;

  const binWidth = sampleRate / (fftData.length * 2);

  const h1Bin = Math.round(f0 / binWidth);
  const h2Bin = Math.round((2 * f0) / binWidth);

  if (h1Bin >= fftData.length || h2Bin >= fftData.length) return 0;

  const h1 = peakInNeighbourhood(fftData, h1Bin, 2);
  const h2 = peakInNeighbourhood(fftData, h2Bin, 2);

  // Input is already in dB (from getFloatFrequencyData), so simple subtraction
  if (!isFinite(h1) || !isFinite(h2)) return 0;
  return h1 - h2;
}

/**
 * Compute spectral tilt — ratio of low-frequency to high-frequency energy.
 * Negative tilt is normal (energy rolls off). Flat/positive → pressed.
 *
 * Returns a value in dB: negative = normal rolloff, positive = excess HF.
 */
export function computeSpectralTilt(
  fftData: Float32Array | Uint8Array,
  sampleRate: number,
  f0: number,
): number {
  if (!fftData.length || f0 <= 0 || sampleRate <= 0) return 0;

  const binWidth = sampleRate / (fftData.length * 2);
  const midFreq = 2000; // Split point between low and high
  const midBin = Math.round(midFreq / binWidth);

  if (midBin <= 0 || midBin >= fftData.length) return 0;

  // Low-band energy (F0 to 2 kHz) — convert dB to linear power
  const startBin = Math.max(1, Math.round(f0 / binWidth));
  let lowEnergy = 0;
  let lowCount = 0;
  for (let i = startBin; i < midBin && i < fftData.length; i++) {
    lowEnergy += Math.pow(10, Math.max(fftData[i], -120) / 10);
    lowCount++;
  }

  // High-band energy (2 kHz to 8 kHz) — convert dB to linear power
  const endBin = Math.min(Math.round(8000 / binWidth), fftData.length);
  let highEnergy = 0;
  let highCount = 0;
  for (let i = midBin; i < endBin; i++) {
    highEnergy += Math.pow(10, Math.max(fftData[i], -120) / 10);
    highCount++;
  }

  if (lowCount === 0 || highCount === 0) return 0;

  const avgLow = lowEnergy / lowCount;
  const avgHigh = highEnergy / highCount;

  if (avgLow <= 0 || avgHigh <= 0) return 0;

  return 10 * Math.log10(avgHigh / avgLow);
}

/**
 * Frame-to-frame spectral change rate (normalised 0–1).
 * High values → timbre discontinuity (register break).
 */
export function computeSpectralChangeRate(
  prevFrame: Float32Array | Uint8Array,
  currFrame: Float32Array | Uint8Array,
): number {
  const len = Math.min(prevFrame.length, currFrame.length);
  if (len === 0) return 0;

  // Convert dB to linear power before computing cosine distance
  let diffSum = 0;
  let normPrev = 0;
  let normCurr = 0;

  for (let i = 0; i < len; i++) {
    const pPrev = Math.pow(10, Math.max(prevFrame[i], -120) / 10);
    const pCurr = Math.pow(10, Math.max(currFrame[i], -120) / 10);
    const d = pCurr - pPrev;
    diffSum += d * d;
    normPrev += pPrev * pPrev;
    normCurr += pCurr * pCurr;
  }

  const norm = Math.sqrt(normPrev * normCurr);
  if (norm === 0) return 0;

  // Normalise to 0–1 via cosine distance
  return Math.min(1, Math.sqrt(diffSum) / norm);
}

/**
 * Pitch accuracy in cents between a target and actual frequency.
 * Always returns the absolute distance.
 */
export function computePitchAccuracy(targetHz: number, actualHz: number): number {
  if (targetHz <= 0 || actualHz <= 0) return Infinity;
  return Math.abs(1200 * Math.log2(actualHz / targetHz));
}

// ── Internal helper ───────────────────────────────────────

/** Return the maximum value within ±radius bins of centre. */
function peakInNeighbourhood(
  data: Float32Array | Uint8Array,
  centre: number,
  radius: number,
): number {
  let max = -Infinity;
  const lo = Math.max(0, centre - radius);
  const hi = Math.min(data.length - 1, centre + radius);
  for (let i = lo; i <= hi; i++) {
    if (data[i] > max) max = data[i];
  }
  return max;
}
