import type { VocalState } from './vocal-analyzer';
import { STATUS_HEX, CHART_HEX } from '@/lib/design-tokens';

export interface MeydaThresholds {
  noiseGateRms: number;
  vadNoisiness: number;
  breathyThreshold: number;
  pressedRmsThreshold: number;
  pressedNoisinessThreshold: number;
  pressedCentroidRatio: number; // spectralCentroid / F0 — 이 이상이면 과밀착
}

export const DEFAULT_MEYDA_THRESHOLDS: MeydaThresholds = {
  noiseGateRms: 0.01,
  vadNoisiness: 0.6,
  breathyThreshold: 0.25,
  pressedRmsThreshold: 0.3,
  pressedNoisinessThreshold: 0.1,
  pressedCentroidRatio: 4.0, // centroid가 F0의 4배 이상이면 과밀착 후보
};

export interface MeydaFrame {
  noisiness: number; // HNR 기반 0~1 (0=깨끗, 1=breathy)
  rms: number;
  spectralCentroid: number;
}

// 파사지오 구간에서 breathyThreshold를 점진적으로 상향 (두성 보호)
// 성별에 따라 파사지오 범위가 다름:
//   male:    230-340Hz (바리톤~테너 브레이크)
//   female:  330-500Hz (메조~소프라노 브레이크)
//   unknown: 260-360Hz (기본 범위)
export type VocalGender = 'male' | 'female' | 'unknown';

const PASSAGGIO_RANGES: Record<VocalGender, { low: number; high: number }> = {
  male:    { low: 230, high: 340 },
  female:  { low: 330, high: 500 },
  unknown: { low: 260, high: 360 },
};

const PASSAGGIO_BREATHY_OFFSET_MAX = 0.08;

export function getPassaggioOffset(f0: number, passaggioLow?: number, passaggioHigh?: number, gender: VocalGender = 'unknown'): number {
  const range = PASSAGGIO_RANGES[gender];
  const low = passaggioLow ?? range.low;
  const high = passaggioHigh ?? range.high;
  if (f0 <= low) return 0;
  if (f0 >= high) return PASSAGGIO_BREATHY_OFFSET_MAX;
  return PASSAGGIO_BREATHY_OFFSET_MAX * (f0 - low) / (high - low);
}

/**
 * SF/RMS/centroid/F0를 기반으로 3가지 상태 분류.
 * @param f0 현재 기본 주파수 (Hz). 0이면 피치 미감지 상태.
 * @param centroidRatio spectralCentroid / f0. f0가 0이면 0 전달.
 */
export function classifyMeydaVocalState(
  noisiness: number,
  rms: number,
  thresholds: MeydaThresholds,
  f0: number = 0,
  centroidRatio: number = 0,
  gender: VocalGender = 'unknown',
): VocalState {
  // breathy: 파사지오 위에서는 threshold를 상향해서 두성 보호
  const effectiveBreathyThreshold = thresholds.breathyThreshold + getPassaggioOffset(f0, undefined, undefined, gender);

  if (noisiness > effectiveBreathyThreshold) return 'breathy';

  // pressed: RMS 높고 SF 낮더라도, centroidRatio가 낮으면 건강한 포르테 → balanced
  if (rms > thresholds.pressedRmsThreshold && noisiness < thresholds.pressedNoisinessThreshold) {
    // centroidRatio가 높으면 상위 배음이 강한 과밀착
    // centroidRatio가 낮으면 기본 배음 구조가 유지된 건강한 포르테
    if (centroidRatio >= thresholds.pressedCentroidRatio) {
      return 'pressed';
    }
    // centroid 정보가 없거나(f0=0) ratio가 낮으면 balanced로 유지
    return f0 > 0 ? 'balanced' : 'pressed';
  }

  return 'balanced';
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  return rgbToHex(
    Math.round(r1 + (r2 - r1) * c),
    Math.round(g1 + (g2 - g1) * c),
    Math.round(b1 + (b2 - b1) * c),
  );
}

const COLOR_PRESSED = STATUS_HEX.fail;
const COLOR_BALANCED = STATUS_HEX.success;
const COLOR_BREATHY = CHART_HEX[4];  // blue

/**
 * SF/RMS/centroid/F0를 연속 그라데이션 색상으로 변환.
 */
export function getVocalStateColor(
  noisiness: number,
  rms: number,
  thresholds: MeydaThresholds,
  f0: number = 0,
  centroidRatio: number = 0,
  gender: VocalGender = 'unknown',
): string {
  const effectiveBreathyThreshold = thresholds.breathyThreshold + getPassaggioOffset(f0, undefined, undefined, gender);

  // breathy 영역
  if (noisiness > effectiveBreathyThreshold) {
    const range = thresholds.vadNoisiness - effectiveBreathyThreshold;
    const t = range > 0 ? (noisiness - effectiveBreathyThreshold) / range : 1;
    return lerpColor(COLOR_BALANCED, COLOR_BREATHY, t);
  }

  // pressed 영역 (centroid 조건 포함)
  if (noisiness < thresholds.pressedNoisinessThreshold && rms > thresholds.pressedRmsThreshold) {
    const isPressed = f0 > 0 ? centroidRatio >= thresholds.pressedCentroidRatio : true;
    if (isPressed) {
      const t = thresholds.pressedNoisinessThreshold > 0 ? noisiness / thresholds.pressedNoisinessThreshold : 0;
      return lerpColor(COLOR_PRESSED, COLOR_BALANCED, t);
    }
  }

  // 중간 영역
  const mid = (thresholds.pressedNoisinessThreshold + effectiveBreathyThreshold) / 2;
  if (noisiness < mid) {
    const range = mid - thresholds.pressedNoisinessThreshold;
    const t = range > 0 ? (noisiness - thresholds.pressedNoisinessThreshold) / range : 1;
    return lerpColor(lerpColor(COLOR_PRESSED, COLOR_BALANCED, 0.8), COLOR_BALANCED, t);
  } else {
    const range = effectiveBreathyThreshold - mid;
    const t = range > 0 ? (noisiness - mid) / range : 0;
    return lerpColor(COLOR_BALANCED, lerpColor(COLOR_BALANCED, COLOR_BREATHY, 0.2), t);
  }
}

/**
 * 0~1 위치값. 0=과밀착, 0.5=안정적, 1=숨섞임.
 */
export function getVocalStatePosition(
  noisiness: number,
  rms: number,
  thresholds: MeydaThresholds,
  f0: number = 0,
  centroidRatio: number = 0,
  gender: VocalGender = 'unknown',
): number {
  const effectiveBreathyThreshold = thresholds.breathyThreshold + getPassaggioOffset(f0, undefined, undefined, gender);

  if (noisiness > effectiveBreathyThreshold) {
    const range = thresholds.vadNoisiness - effectiveBreathyThreshold;
    const t = range > 0 ? (noisiness - effectiveBreathyThreshold) / range : 1;
    return 0.5 + Math.min(t, 1) * 0.5;
  }

  if (noisiness < thresholds.pressedNoisinessThreshold && rms > thresholds.pressedRmsThreshold) {
    const isPressed = f0 > 0 ? centroidRatio >= thresholds.pressedCentroidRatio : true;
    if (isPressed) {
      const t = thresholds.pressedNoisinessThreshold > 0 ? noisiness / thresholds.pressedNoisinessThreshold : 0;
      return t * 0.5;
    }
  }

  const mid = (thresholds.pressedNoisinessThreshold + effectiveBreathyThreshold) / 2;
  if (noisiness < mid) {
    const range = mid - thresholds.pressedNoisinessThreshold;
    const t = range > 0 ? (noisiness - thresholds.pressedNoisinessThreshold) / range : 1;
    return 0.35 + t * 0.15;
  } else {
    const range = effectiveBreathyThreshold - mid;
    const t = range > 0 ? (noisiness - mid) / range : 0;
    return 0.5 + t * 0.15;
  }
}

export function shouldPlotPoint(
  frame: MeydaFrame,
  thresholds: MeydaThresholds,
): boolean {
  if (frame.rms < thresholds.noiseGateRms) return false;
  if (frame.noisiness > thresholds.vadNoisiness) return false;
  return true;
}
