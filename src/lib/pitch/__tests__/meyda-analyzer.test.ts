import { describe, it, expect } from 'vitest';
import { classifyMeydaVocalState, shouldPlotPoint, type MeydaThresholds } from '../meyda-analyzer';

const defaults: MeydaThresholds = {
  noiseGateRms: 0.01,
  vadNoisiness: 0.6,
  breathyThreshold: 0.25,
  pressedRmsThreshold: 0.3,
  pressedNoisinessThreshold: 0.1,
  pressedCentroidRatio: 4.0,
};

describe('classifyMeydaVocalState', () => {
  // 기존 테스트 (f0/centroid 없이 호출 — 하위 호환)
  it('returns breathy when noisiness (HNR-based) > breathyThreshold', () => {
    expect(classifyMeydaVocalState(0.3, 0.1, defaults)).toBe('breathy');
  });

  it('returns pressed when rms > pressedRms AND sf < pressedSf (no f0)', () => {
    // f0=0이면 centroid 판단 불가 → 기존 로직대로 pressed
    expect(classifyMeydaVocalState(0.05, 0.5, defaults)).toBe('pressed');
  });

  it('returns balanced for normal values', () => {
    expect(classifyMeydaVocalState(0.2, 0.15, defaults)).toBe('balanced');
  });

  it('breathy takes priority over pressed (high SF + high RMS)', () => {
    expect(classifyMeydaVocalState(0.3, 0.5, defaults)).toBe('breathy');
  });

  it('balanced when rms is high but SF is not low enough for pressed', () => {
    expect(classifyMeydaVocalState(0.2, 0.5, defaults)).toBe('balanced');
  });

  // centroid 관련 테스트
  describe('spectralCentroid 기반 pressed 판정', () => {
    it('높은 RMS + 낮은 SF + 높은 centroid ratio → pressed', () => {
      // centroidRatio=5.0 > pressedCentroidRatio=4.0 → 과밀착
      expect(classifyMeydaVocalState(0.05, 0.5, defaults, 220, 5.0)).toBe('pressed');
    });

    it('높은 RMS + 낮은 SF + 낮은 centroid ratio → balanced (건강한 포르테)', () => {
      // centroidRatio=2.5 < pressedCentroidRatio=4.0 → 건강한 큰 소리
      expect(classifyMeydaVocalState(0.05, 0.5, defaults, 220, 2.5)).toBe('balanced');
    });

    it('centroid ratio가 정확히 threshold이면 pressed', () => {
      expect(classifyMeydaVocalState(0.05, 0.5, defaults, 220, 4.0)).toBe('pressed');
    });

    it('f0가 0이면 centroid 판단 불가 → 기존 로직(pressed)', () => {
      expect(classifyMeydaVocalState(0.05, 0.5, defaults, 0, 0)).toBe('pressed');
    });
  });

  // 파사지오 두성 보호 테스트 (260~360Hz ramp)
  describe('파사지오 breathyThreshold 점진적 상향', () => {
    it('파사지오 아래(220Hz)에서 SF=0.27 → breathy (오프셋 0)', () => {
      // 220 < 260 → offset=0, threshold=0.25, 0.27 > 0.25 → breathy
      expect(classifyMeydaVocalState(0.27, 0.1, defaults, 220, 2.0)).toBe('breathy');
    });

    it('파사지오 위(440Hz)에서 SF=0.27 → balanced (오프셋 최대 0.08)', () => {
      // 440 > 360 → offset=0.08, threshold=0.33, 0.27 < 0.33 → balanced
      expect(classifyMeydaVocalState(0.27, 0.1, defaults, 440, 2.0)).toBe('balanced');
    });

    it('파사지오 위(440Hz)에서 SF=0.35 → breathy (실제 숨섞임)', () => {
      // 0.35 > 0.33 → breathy
      expect(classifyMeydaVocalState(0.35, 0.1, defaults, 440, 2.0)).toBe('breathy');
    });

    it('ramp 시작점(260Hz)에서 오프셋 0 → breathy', () => {
      // 260 <= 260 → offset=0, threshold=0.25, 0.27 > 0.25 → breathy
      expect(classifyMeydaVocalState(0.27, 0.1, defaults, 260, 2.0)).toBe('breathy');
    });

    it('ramp 중간(310Hz)에서 부분 오프셋 → balanced', () => {
      // 310: offset = 0.08 * (310-260)/(360-260) = 0.08 * 0.5 = 0.04
      // threshold = 0.25 + 0.04 = 0.29, 0.27 < 0.29 → balanced
      expect(classifyMeydaVocalState(0.27, 0.1, defaults, 310, 2.0)).toBe('balanced');
    });

    it('ramp 끝(360Hz)에서 오프셋 최대 → balanced', () => {
      // 360 >= 360 → offset=0.08, threshold=0.33, 0.27 < 0.33 → balanced
      expect(classifyMeydaVocalState(0.27, 0.1, defaults, 360, 2.0)).toBe('balanced');
    });
  });
});

describe('shouldPlotPoint (voice filter)', () => {
  it('rejects when rms below noise gate', () => {
    expect(shouldPlotPoint({ rms: 0.005, noisiness: 0.2, spectralCentroid: 500 }, defaults)).toBe(false);
  });

  it('rejects when noisiness above VAD threshold', () => {
    expect(shouldPlotPoint({ rms: 0.1, noisiness: 0.8, spectralCentroid: 500 }, defaults)).toBe(false);
  });

  it('passes when both thresholds satisfied', () => {
    expect(shouldPlotPoint({ rms: 0.05, noisiness: 0.2, spectralCentroid: 500 }, defaults)).toBe(true);
  });

  it('rejects when both fail', () => {
    expect(shouldPlotPoint({ rms: 0.001, noisiness: 0.8, spectralCentroid: 500 }, defaults)).toBe(false);
  });
});
