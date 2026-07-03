import type { SpectralResult, Gender } from './types';

export function analyzeSpectrum(
  frequencyData: Float32Array,
  f0: number,
  clarity: number,
  sampleRate: number,
  fftSize: number,
  gender: Gender,
): SpectralResult {
  if (clarity < 0.75 || f0 <= 0) return { h1h2: null, alphaRatio: null };

  const suppressAlpha = f0 > 500;

  const binWidth = sampleRate / fftSize;

  // --- H1*-H2* with F1 variable correction ---
  const h1Bin = Math.round(f0 / binWidth);
  const h2Bin = Math.round((2 * f0) / binWidth);
  let h1dB = findPeakInRange(frequencyData, h1Bin, 2);
  let h2dB = findPeakInRange(frequencyData, h2Bin, 2);

  // F1 estimation: peak in 200-1000Hz, excluding harmonic bins (H1~H4)
  const f1LowBin = Math.round(200 / binWidth);
  const f1HighBin = Math.min(Math.round(1000 / binWidth), frequencyData.length - 1);
  const harmonicBins: number[] = [];
  for (let h = 1; h <= 4; h++) harmonicBins.push(Math.round((h * f0) / binWidth));
  const isNearHarmonic = (bin: number) => harmonicBins.some(hb => Math.abs(bin - hb) <= 2);

  let f1Bin = -1;
  let f1Max = -Infinity;
  for (let i = f1LowBin; i <= f1HighBin; i++) {
    if (!isNearHarmonic(i) && frequencyData[i] > f1Max) {
      f1Max = frequencyData[i];
      f1Bin = i;
    }
  }
  // Fallback: if no non-harmonic peak found, skip F1 correction
  if (f1Bin < 0) return { h1h2: h1dB - h2dB, alphaRatio: suppressAlpha ? null : computeAlphaRatio(frequencyData, binWidth) };
  const f1Hz = f1Bin * binWidth;

  // F1 variable correction (prominence-based)
  const f1Peak = frequencyData[f1Bin];
  const f1Floor = getLocalFloor(frequencyData, f1Bin, 5);
  const f1Prominence = Math.max(f1Peak - f1Floor, 0);
  const f1Boost = Math.min(f1Prominence * 0.5, 6); // max 6dB cap
  const f1Bandwidth = 50; // Hz

  if (Math.abs(f0 - f1Hz) <= f1Bandwidth) h1dB -= f1Boost;
  if (Math.abs(2 * f0 - f1Hz) <= f1Bandwidth) h2dB -= f1Boost;

  const h1h2 = h1dB - h2dB;

  return { h1h2, alphaRatio: suppressAlpha ? null : computeAlphaRatio(frequencyData, binWidth) };
}

// Alpha Ratio (floor -120dB to prevent -Infinity → NaN propagation)
function computeAlphaRatio(frequencyData: Float32Array, binWidth: number): number | null {
  let lowEnergy = 0, highEnergy = 0, lowCount = 0, highCount = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    const freq = i * binWidth;
    const power = Math.pow(10, Math.max(frequencyData[i], -120) / 10);
    if (freq >= 80 && freq <= 1000) { lowEnergy += power; lowCount++; }
    if (freq > 1000 && freq <= 5000) { highEnergy += power; highCount++; }
  }
  return lowCount > 0 && highCount > 0 && lowEnergy > 0 && highEnergy > 0
    ? 10 * Math.log10(highEnergy / highCount) - 10 * Math.log10(lowEnergy / lowCount)
    : null;
}

function findPeakInRange(data: Float32Array, centerBin: number, radius: number): number {
  let peak = -Infinity;
  for (let i = Math.max(0, centerBin - radius); i <= Math.min(data.length - 1, centerBin + radius); i++) {
    if (data[i] > peak) peak = data[i];
  }
  return peak;
}

function getLocalFloor(data: Float32Array, centerBin: number, radius: number): number {
  const values: number[] = [];
  for (let i = Math.max(0, centerBin - radius); i <= Math.min(data.length - 1, centerBin + radius); i++) {
    if (i !== centerBin) values.push(data[i]);
  }
  values.sort((a, b) => a - b);
  return values.length > 0 ? values[Math.floor(values.length / 2)] : -100;
}
