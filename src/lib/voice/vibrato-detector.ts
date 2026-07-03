/**
 * Detects vocal vibrato from an F0 time series.
 * Vibrato: periodic F0 modulation at 4-8Hz with consistent amplitude.
 * Uses zero-crossing rate of the detrended F0 signal.
 */
export class VibratoDetector {
  private buffer: number[] = [];
  private readonly BUFFER_SIZE = 30;
  private readonly MIN_RATE = 4;
  private readonly MAX_RATE = 8;
  private readonly SAMPLE_RATE = 10;
  private readonly MIN_EXTENT_CENTS = 50;

  isVibrato = false;
  rate = 0;
  extentCents = 0;

  push(f0: number): void {
    this.buffer.push(f0);
    if (this.buffer.length > this.BUFFER_SIZE) this.buffer.shift();
    if (this.buffer.length < this.BUFFER_SIZE) {
      this.isVibrato = false;
      return;
    }
    this.analyze();
  }

  reset(): void {
    this.buffer = [];
    this.isVibrato = false;
    this.rate = 0;
    this.extentCents = 0;
  }

  private analyze(): void {
    const b = this.buffer;
    const n = b.length;

    // Detrend: subtract linear regression
    const mean = b.reduce((s, v) => s + v, 0) / n;
    const detrended = new Float64Array(n);
    let sumX = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) { sumX += i; sumXY += i * b[i]; sumXX += i * i; }
    const denominator = n * sumXX - sumX * sumX;
    if (Math.abs(denominator) < 1e-10) { this.isVibrato = false; return; }
    const slope = (n * sumXY - sumX * b.reduce((s, v) => s + v, 0)) / denominator;
    const intercept = mean - slope * (n - 1) / 2;
    for (let i = 0; i < n; i++) detrended[i] = b[i] - (intercept + slope * i);

    // Zero-crossing rate → estimate frequency
    let crossings = 0;
    for (let i = 1; i < n; i++) {
      if ((detrended[i - 1] > 0 && detrended[i] <= 0) || (detrended[i - 1] <= 0 && detrended[i] > 0)) {
        crossings++;
      }
    }
    const estimatedFreq = (crossings / 2) * this.SAMPLE_RATE / (n - 1);

    if (estimatedFreq < this.MIN_RATE || estimatedFreq > this.MAX_RATE) {
      this.isVibrato = false;
      this.rate = 0;
      return;
    }

    // Check extent (peak amplitude of detrended signal)
    let maxAmp = 0;
    for (let i = 0; i < n; i++) maxAmp = Math.max(maxAmp, Math.abs(detrended[i]));

    const extentCents = mean > 0 ? 1200 * Math.log2((mean + maxAmp) / mean) : 0;

    if (extentCents < this.MIN_EXTENT_CENTS) {
      this.isVibrato = false;
      return;
    }

    // Check regularity via autocorrelation at estimated period
    const estPeriod = Math.round(this.SAMPLE_RATE / estimatedFreq);
    if (estPeriod < 1 || estPeriod >= n / 2) { this.isVibrato = false; return; }

    let corrSum = 0, energySum = 0;
    for (let i = 0; i < n - estPeriod; i++) {
      corrSum += detrended[i] * detrended[i + estPeriod];
      energySum += detrended[i] * detrended[i];
    }
    const periodicity = energySum > 0 ? corrSum / energySum : 0;

    this.isVibrato = periodicity > 0.6;
    this.rate = estimatedFreq;
    this.extentCents = extentCents;
  }
}
