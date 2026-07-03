// ============================================================
// Voice Profile v2 ("목BTI") — Personalized Description Generator
// ============================================================
// Generates a 3-4 sentence localized description combining the
// voice type with spectrum positions and range info.
// The output should feel personal, specific, and shareable —
// like an MBTI result that people want to screenshot.
// ============================================================

import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';
import type { VoiceType, SpectrumValues, RangeInfo } from './types';

// ============================================================
// Spectrum-Based Text Fragments
// ============================================================

/** Temperature spectrum text (0=cool, 1=warm) */
function getTemperatureFragment(value: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (value < 0.3) {
    return t('description.temperatureCool');
  }
  if (value < 0.5) {
    return t('description.temperatureNeutral');
  }
  if (value < 0.7) {
    return t('description.temperatureSlightlyWarm');
  }
  return t('description.temperatureWarm');
}

/** Range spectrum text (0=low, 1=high) */
function getRangeFragment(value: number, rangeInfo: RangeInfo, t: (key: string, params?: Record<string, string | number>) => string): string {
  const octaveText =
    rangeInfo.octaves >= 2.0
      ? t('description.octavesWide', { octaves: rangeInfo.octaves })
      : rangeInfo.octaves >= 1.5
        ? t('description.octavesMedium', { octaves: rangeInfo.octaves })
        : t('description.octavesNarrow', { octaves: rangeInfo.octaves });

  if (value < 0.35) {
    return t('description.rangeLow', { octaveText });
  }
  if (value < 0.65) {
    return t('description.rangeMid', { octaveText });
  }
  return t('description.rangeHigh', { octaveText });
}

/** Expression spectrum text (0=stable, 1=dynamic) */
function getExpressionFragment(value: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (value < 0.3) {
    return t('description.expressionStable');
  }
  if (value < 0.5) {
    return t('description.expressionBalanced');
  }
  if (value < 0.7) {
    return t('description.expressionFree');
  }
  return t('description.expressionDynamic');
}

// ============================================================
// Strength Insight (dominant spectrum)
// ============================================================

function getStrengthInsight(spectrums: SpectrumValues, t: (key: string, params?: Record<string, string | number>) => string): string {
  // Find the most extreme spectrum value (furthest from 0.5)
  const deviations: { key: string; deviation: number; value: number }[] = [
    {
      key: 'temperature',
      deviation: Math.abs(spectrums.temperature - 0.5),
      value: spectrums.temperature,
    },
    {
      key: 'range',
      deviation: Math.abs(spectrums.range - 0.5),
      value: spectrums.range,
    },
    {
      key: 'expression',
      deviation: Math.abs(spectrums.expression - 0.5),
      value: spectrums.expression,
    },
  ];
  deviations.sort((a, b) => b.deviation - a.deviation);
  const dominant = deviations[0];

  // Only add strength insight if clearly polarized
  if (dominant.deviation < 0.2) {
    return t('description.strengthAllRound');
  }

  switch (dominant.key) {
    case 'temperature':
      return dominant.value > 0.5
        ? t('description.strengthTempWarm')
        : t('description.strengthTempCool');
    case 'range':
      return dominant.value > 0.5
        ? t('description.strengthRangeHigh')
        : t('description.strengthRangeLow');
    case 'expression':
      return dominant.value > 0.5
        ? t('description.strengthExprDynamic')
        : t('description.strengthExprStable');
    default:
      return '';
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Generate a personalized localized description combining the voice type,
 * spectrum positions, and range info.
 *
 * Output is 3-4 sentences, designed to feel personal and shareable.
 */
export function generateDescription(
  type: VoiceType,
  spectrums: SpectrumValues,
  rangeInfo: RangeInfo,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const t = createT(locale, 'voiceProfile');
  const temperatureLine = getTemperatureFragment(spectrums.temperature, t);
  const rangeLine = getRangeFragment(spectrums.range, rangeInfo, t);
  const expressionLine = getExpressionFragment(spectrums.expression, t);
  const strengthLine = getStrengthInsight(spectrums, t);

  return [temperatureLine, rangeLine, expressionLine, strengthLine]
    .filter(Boolean)
    .join(' ');
}

/**
 * Generate a short share-friendly summary (1 sentence + type name).
 * Intended for social sharing or clipboard copy.
 */
export function generateShareText(
  type: VoiceType,
  spectrums: SpectrumValues,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const t = createT(locale, 'voiceProfile');

  const temperatureWord =
    spectrums.temperature > 0.5
      ? t('share.shareTemperatureWarm')
      : t('share.shareTemperatureCool');
  const rangeWord =
    spectrums.range > 0.65
      ? t('share.shareRangeHigh')
      : spectrums.range < 0.35
        ? t('share.shareRangeLow')
        : t('share.shareRangeMid');
  const expressionWord =
    spectrums.expression > 0.5
      ? t('share.shareExpressionDynamic')
      : t('share.shareExpressionStable');

  const label = t(`types.${type.id}.label`);

  return t('share.shareFormat', {
    label,
    temperature: temperatureWord,
    range: rangeWord,
    expression: expressionWord,
  });
}
