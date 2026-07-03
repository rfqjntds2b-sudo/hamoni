// ============================================================
// Onset Type Detector
// ============================================================
// 발성 시작 방식(onset)을 3유형으로 판정:
//   hard    — 성대 강접촉, 급격한 에너지 상승 + 높은 초반 jitter
//   breathy — 공기 선행, 느린 에너지 상승 + 낮은 초반 HNR
//   balanced — 정상 발성 시작
//
// 판정 기준: 에너지 상승 기울기(rmsSlope) + 시작 구간 HNR + 초반 jitter 조합

import type { SessionMetrics } from './types';

// ── Types ──

export type OnsetType = 'hard' | 'breathy' | 'balanced';

export interface OnsetResult {
  type: OnsetType;
  rmsSlope: number;      // RMS 상승 기울기 (per ms)
  initialHnr: number;    // 첫 voiced 프레임 HNR (dB)
  initialJitter: number; // 첫 voiced 프레임 jitter (%)
}

// ── Thresholds ──

/** 에너지 상승 기울기 (rms/ms) */
const HARD_SLOPE_MIN = 0.15;
const BREATHY_SLOPE_MAX = 0.03;

/** 초반 HNR (dB) */
const BREATHY_HNR_MAX = 8;
const HARD_HNR_MIN = 15;

/** 초반 Jitter PPQ5 (%) */
const HARD_JITTER_MIN = 1.5;
const BREATHY_JITTER_MAX = 0.8;

// ── Detection ──

/**
 * 세션 메트릭에서 onset 유형을 판정.
 * 첫 voiced 프레임 전후의 RMS/HNR/Jitter로 판단.
 *
 * @param metrics - 누적된 세션 메트릭
 * @param intervalMs - 누적 간격 (기본 200ms)
 * @returns OnsetResult 또는 null (voiced 프레임이 없는 경우)
 */
export function detectOnset(
  metrics: SessionMetrics,
  intervalMs = 200,
): OnsetResult | null {
  const { isVoicedValues, rmsValues, hnrValues, jitterValues } = metrics;

  // 첫 voiced 프레임 인덱스 찾기
  const firstVoicedIdx = isVoicedValues.findIndex((v) => v);
  if (firstVoicedIdx < 0) return null;

  // 직전 unvoiced 프레임의 RMS (없으면 0)
  const prevRms = firstVoicedIdx > 0 ? rmsValues[firstVoicedIdx - 1] : 0;
  const firstRms = rmsValues[firstVoicedIdx] ?? 0;

  // RMS 기울기 = (첫voiced RMS - 직전 RMS) / 누적간격(ms)
  const rmsSlope = (firstRms - prevRms) / intervalMs;

  // 초반 HNR: 첫 voiced 프레임 (null이면 0)
  const initialHnr = hnrValues[firstVoicedIdx] ?? 0;

  // 초반 Jitter: 첫 voiced 프레임 (null이면 0)
  const initialJitter = jitterValues[firstVoicedIdx] ?? 0;

  // 3축 판정 — 2/3 이상 조건 충족 시 해당 유형
  const hardSignals = [
    rmsSlope >= HARD_SLOPE_MIN,
    initialHnr >= HARD_HNR_MIN,
    initialJitter >= HARD_JITTER_MIN,
  ].filter(Boolean).length;

  const breathySignals = [
    rmsSlope <= BREATHY_SLOPE_MAX,
    initialHnr <= BREATHY_HNR_MAX,
    initialJitter <= BREATHY_JITTER_MAX,
  ].filter(Boolean).length;

  let type: OnsetType;
  if (hardSignals >= 2) {
    type = 'hard';
  } else if (breathySignals >= 2) {
    type = 'breathy';
  } else {
    type = 'balanced';
  }

  return { type, rmsSlope, initialHnr, initialJitter };
}

/** Onset이 나쁠 때 적용할 점수 배수 (15% 감점) */
export const ONSET_PENALTY_MULTIPLIER = 0.85;
