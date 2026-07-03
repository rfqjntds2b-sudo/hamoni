import type { PeriodDetectorResult } from './types';
import { findClosestCandidate } from './types';

export class PeriodDetector {
  private periodBuffer: number[] = [];
  private amplitudeBuffer: number[] = [];
  private hanningWindow: Float32Array | null = null;
  private windowedBuf: Float32Array | null = null;
  private fftRe: Float32Array | null = null;
  private fftIm: Float32Array | null = null;
  private acfBuf: Float32Array | null = null;
  private prevF0 = 0;
  private jumpCandidate = 0;
  private jumpCount = 0;

  private readonly MAX_PERIODS = 60;
  private readonly MIN_RMS = 0.01;
  private readonly CLARITY_THRESHOLD = 0.5;
  private readonly JUMP_CONFIRM = 3;
  private readonly MIN_F0 = 50;
  private readonly MAX_F0 = 1500;

  processFrame(timeDomainData: Float32Array, sampleRate: number): PeriodDetectorResult {
    const nullResult: PeriodDetectorResult = {
      f0: null, clarity: 0, autocorrPeak: 0,
      periods: [...this.periodBuffer], amplitudes: [...this.amplitudeBuffer],
    };

    // Amplitude gate
    const rms = Math.sqrt(timeDomainData.reduce((s, v) => s + v * v, 0) / timeDomainData.length);
    if (rms < this.MIN_RMS) return nullResult;

    // Hanning window for autocorrelation
    const windowed = this.applyWindow(timeDomainData);

    // Autocorrelation
    const acf = this.autocorrelate(windowed);

    // Find candidate peaks
    const candidates = this.findCandidatePeaks(acf, sampleRate);
    if (candidates.length === 0) return nullResult;

    // Best candidate with octave guard
    const best = this.applyOctaveGuard(candidates);
    if (best.peak < this.CLARITY_THRESHOLD) return nullResult;

    const f0 = best.f0;
    const periodSamples = Math.round(sampleRate / f0);

    // Extract individual periods from RAW data (not windowed — preserves amplitude)
    this.extractPeriodsFromFrame(timeDomainData, periodSamples, sampleRate);

    return {
      f0,
      clarity: best.peak,
      autocorrPeak: best.peak,
      periods: [...this.periodBuffer],
      amplitudes: [...this.amplitudeBuffer],
    };
  }

  reset(): void {
    this.periodBuffer = [];
    this.amplitudeBuffer = [];
    this.prevF0 = 0;
    this.jumpCandidate = 0;
    this.jumpCount = 0;
  }

  private applyWindow(data: Float32Array): Float32Array {
    const N = data.length;
    if (!this.hanningWindow || this.hanningWindow.length !== N) {
      this.hanningWindow = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        this.hanningWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
      }
    }
    if (!this.windowedBuf || this.windowedBuf.length !== N) {
      this.windowedBuf = new Float32Array(N);
    }
    for (let i = 0; i < N; i++) this.windowedBuf[i] = data[i] * this.hanningWindow[i];
    return this.windowedBuf;
  }

  private autocorrelate(data: Float32Array): Float32Array {
    const N = data.length;
    // Pad to next power of 2 * 2 for linear (non-circular) correlation
    const fftLen = 1 << (Math.ceil(Math.log2(N)) + 1);
    if (!this.fftRe || this.fftRe.length !== fftLen) {
      this.fftRe = new Float32Array(fftLen);
      this.fftIm = new Float32Array(fftLen);
    }
    if (!this.acfBuf || this.acfBuf.length !== N) {
      this.acfBuf = new Float32Array(N);
    }
    this.fftRe.fill(0);
    this.fftIm!.fill(0);
    for (let i = 0; i < N; i++) this.fftRe[i] = data[i];

    // Forward FFT
    this.fft(this.fftRe, this.fftIm!, false);

    // Power spectrum: |FFT(x)|²
    for (let i = 0; i < fftLen; i++) {
      this.fftRe[i] = this.fftRe[i] * this.fftRe[i] + this.fftIm![i] * this.fftIm![i];
      this.fftIm![i] = 0;
    }

    // Inverse FFT
    this.fft(this.fftRe, this.fftIm!, true);

    // Normalize: acf[lag] / acf[0] with lag-dependent compensation
    this.acfBuf.fill(0);
    const energy = this.fftRe[0];
    if (energy < 1e-10) return this.acfBuf;
    for (let i = 0; i < N; i++) {
      this.acfBuf[i] = this.fftRe[i] / energy;
    }
    return this.acfBuf;
  }

  /** In-place Cooley-Tukey radix-2 FFT / IFFT */
  private fft(re: Float32Array, im: Float32Array, inverse: boolean): void {
    const n = re.length;
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    // Butterfly
    const sign = inverse ? -1 : 1;
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const angle = sign * (2 * Math.PI) / len;
      const wRe = Math.cos(angle), wIm = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let curRe = 1, curIm = 0;
        for (let j = 0; j < half; j++) {
          const a = i + j, b = a + half;
          const tRe = curRe * re[b] - curIm * im[b];
          const tIm = curRe * im[b] + curIm * re[b];
          re[b] = re[a] - tRe; im[b] = im[a] - tIm;
          re[a] += tRe; im[a] += tIm;
          const nextRe = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe;
          curRe = nextRe;
        }
      }
    }
    if (inverse) {
      for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
    }
  }

  private findCandidatePeaks(acf: Float32Array, sampleRate: number): { f0: number; peak: number }[] {
    const minLag = Math.floor(sampleRate / this.MAX_F0); // ~32 samples for 1500Hz
    const maxLag = Math.ceil(sampleRate / this.MIN_F0);  // ~960 samples for 50Hz
    const candidates: { f0: number; peak: number; lag: number }[] = [];

    // Find peaks: local maxima above 0
    for (let lag = minLag + 1; lag < Math.min(maxLag, acf.length - 1); lag++) {
      if (acf[lag] > acf[lag - 1] && acf[lag] > acf[lag + 1] && acf[lag] > 0.3) {
        candidates.push({
          f0: sampleRate / lag,
          peak: acf[lag],
          lag,
        });
      }
    }

    // Sort by peak height, take top 5
    candidates.sort((a, b) => b.peak - a.peak);
    return candidates.slice(0, 5);
  }

  private applyOctaveGuard(candidates: { f0: number; peak: number }[]): { f0: number; peak: number } {
    const top = candidates[0];
    if (this.prevF0 <= 0) {
      this.prevF0 = top.f0;
      return top;
    }

    const ratio = top.f0 / this.prevF0;
    const isJump = ratio > 1.5 || ratio < 0.667;

    if (!isJump) {
      this.prevF0 = top.f0;
      this.jumpCount = 0;
      return top;
    }

    // Jump detected — check consecutive count
    if (Math.abs(top.f0 - this.jumpCandidate) / top.f0 < 0.1) {
      this.jumpCount++;
    } else {
      this.jumpCandidate = top.f0;
      this.jumpCount = 1;
    }

    if (this.jumpCount >= this.JUMP_CONFIRM) {
      // Confirmed intentional change
      this.prevF0 = top.f0;
      this.jumpCount = 0;
      this.periodBuffer = [];
      this.amplitudeBuffer = [];
      return top;
    }

    // Not confirmed — find closest to prevF0
    const f0s = candidates.map(c => c.f0);
    const closestF0 = findClosestCandidate(f0s, this.prevF0);
    const closest = candidates.find(c => c.f0 === closestF0) ?? top;
    this.prevF0 = closest.f0;
    return closest;
  }

  private extractPeriodsFromFrame(data: Float32Array, estimatedPeriodSamples: number, sampleRate: number): void {
    const searchRadius = Math.floor(estimatedPeriodSamples * 0.25);
    const peaks: number[] = [];

    for (let center = 0; center < data.length; center += estimatedPeriodSamples) {
      const lo = Math.max(0, center - searchRadius);
      const hi = Math.min(data.length - 1, center + searchRadius);
      let peakIdx = lo;
      for (let i = lo; i <= hi; i++) {
        if (data[i] > data[peakIdx]) peakIdx = i;
      }
      peaks.push(peakIdx);
    }

    for (let i = 1; i < peaks.length; i++) {
      const periodSamples = peaks[i] - peaks[i - 1];
      if (periodSamples <= 0) continue;
      this.periodBuffer.push(periodSamples / sampleRate);

      // RMS amplitude (Praat 표준) — peak-to-peak 대비 노이즈/클리핑에 강건
      let sumSq = 0;
      let count = 0;
      for (let j = peaks[i - 1]; j < peaks[i] && j < data.length; j++) {
        sumSq += data[j] * data[j];
        count++;
      }
      this.amplitudeBuffer.push(count > 0 ? Math.sqrt(sumSq / count) : 0);
    }

    // FIFO trim
    while (this.periodBuffer.length > this.MAX_PERIODS) {
      this.periodBuffer.shift();
      this.amplitudeBuffer.shift();
    }
  }
}
