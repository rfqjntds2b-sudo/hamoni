// ============================================================
// Voice Profile v2 ("목BTI") — Core Type Definitions
// ============================================================
// 12 voice types = 4 Tone Axis x 3 Expression Axis
// 3 spectrum positions (0.0-1.0) for nuanced personality mapping
// ============================================================

// --------------- Axis Types ---------------

/** Tone axis — classified from sustained tone DSP data */
export type ToneAxis = 'clear' | 'warm' | 'deep' | 'husky';

/** Expression axis — classified from dynamic/expression test */
export type ExpressionAxis = 'wind' | 'flame' | 'wave';

/** 12 voice type IDs (tone_expression) */
export type VoiceTypeId = `${ToneAxis}_${ExpressionAxis}`;

// --------------- Spectrum ---------------

/** Spectrum positions (0.0 to 1.0), NOT scores */
export interface SpectrumValues {
  /** 0 = cool (차가운), 1 = warm (따뜻한) — from spectral centroid (inv) + HNR */
  temperature: number;
  /** 0 = low-range (저음형), 1 = high-range (고음형) — from base F0 + ceiling */
  range: number;
  /** 0 = stable (안정적), 1 = dynamic (역동적) — from dynamic range + vibrato + RMS CV */
  expression: number;
}

/** Spectrum axis label definition */
export interface SpectrumLabel {
  left: string;
  right: string;
  label: string;
}

export const SPECTRUM_LABELS: Record<keyof SpectrumValues, SpectrumLabel> = {
  temperature: { left: '차가운', right: '따뜻한', label: '음색 온도' },
  range: { left: '저음형', right: '고음형', label: '음역 지대' },
  expression: { left: '안정적', right: '역동적', label: '표현 스타일' },
} as const;

// --------------- Voice Type ---------------

/** Complete voice type definition with content */
export interface VoiceType {
  id: VoiceTypeId;
  toneAxis: ToneAxis;
  expressionAxis: ExpressionAxis;
  /** Korean label, e.g. "맑은 바람" */
  labelKo: string;
  /** English label, e.g. "Clear Wind" */
  labelEn: string;
  /** 1-line Korean tagline */
  tagline: string;
  /** 2-3 sentence Korean MBTI-style description */
  description: string;
  /** 3 Korean trait tags */
  traits: string[];
  /** 1-2 Korean celebrity vocal references */
  celebrities: string[];
  /** Hex color for this type */
  color: string;
}

// --------------- Test Data ---------------

/** Raw DSP data collected during a single test phase */
export interface TestPhaseData {
  f0Values: number[];
  rmsValues: number[];
  jitterValues: number[];
  shimmerValues: number[];
  hnrValues: number[];
  isVoicedValues: boolean[];
}

/** All test data from the 3 profile test phases */
export interface AllTestData {
  /** Phase 1: comfortable sustained tone */
  sustained: TestPhaseData;
  /** Phase 2: pitch sweep (low → high → low) */
  rangeSweep: TestPhaseData;
  /** Phase 3: dynamic expression */
  expression: TestPhaseData;
}

// --------------- Profile Result ---------------

/** Range info extracted from pitch sweep */
export interface RangeInfo {
  lowHz: number;
  highHz: number;
  octaves: number;
}

/** Complete voice profile result */
export interface VoiceProfileResult {
  type: VoiceType;
  spectrums: SpectrumValues;
  /** Personalized description combining type + spectrums */
  description: string;
  rangeInfo: RangeInfo;
  /** Median F0 from sustained phase (Hz) */
  baseF0: number;
  /** Internal stability score (0-100) */
  stabilityScore: number;
  /** All raw computed metrics for debugging */
  rawMetrics: Record<string, number>;
  /** ISO date string of when the profile was generated */
  date: string;
}

// --------------- Test Phase Definition ---------------

/** Definition for a single test phase in the profile test */
export interface TestPhase {
  id: string;
  nameKo: string;
  instruction: string;
  measuresLabel: string;
  durationSec: number;
  icon: string;
}

// --------------- Label Maps ---------------
// These are the default (Korean) labels, kept for backward compatibility.
// For localized labels, use getLocalizedToneLabels/getLocalizedExpressionLabels
// from type-classifier.ts.

export const TONE_LABELS: Record<ToneAxis, string> = {
  clear: '맑은',
  warm: '따뜻한',
  deep: '깊은',
  husky: '허스키',
};

export const EXPRESSION_LABELS: Record<ExpressionAxis, string> = {
  wind: '바람',
  flame: '불꽃',
  wave: '물결',
};
