// ============================================================
// Training Safety Guards
// ============================================================
// Throat condition check, daily practice limit, consecutive
// fail detection, and microphone consent persistence.
// ============================================================

import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';

export function checkThroatCondition(rating: number, locale: Locale = DEFAULT_LOCALE): { blocked: boolean; message: string } | null {
  const t = createT(locale, 'training');
  if (rating <= 2) return { blocked: true, message: t('safety.throatBad') };
  if (rating === 3) return { blocked: false, message: t('safety.throatFair') };
  return null; // 4-5: good, no warning
}

export interface DailyLimitResult {
  blocked: boolean;
  message: string;
}

export function checkDailyLimit(minutesToday: number, locale: Locale = DEFAULT_LOCALE): DailyLimitResult | null {
  if (minutesToday >= 30) {
    const t = createT(locale, 'training');
    return {
      blocked: true,
      message: t('safety.dailyLimit'),
    };
  }
  return null;
}

export function checkConsecutiveFails(fails: number, locale: Locale = DEFAULT_LOCALE): string | null {
  if (fails >= 3) {
    const t = createT(locale, 'training');
    return t('safety.consecutiveFails');
  }
  return null;
}

// ============================================================
// Intra-Session Vocal Fatigue Detection
// ============================================================

export interface FatigueBaseline {
  hnrMean: number;
  jitterMean: number;
  sampleCount: number;
}

export interface FatigueCheck {
  fatigued: boolean;
  message: string | null;
}

const FATIGUE_HNR_DROP = 5;
const FATIGUE_JITTER_MULTIPLIER = 1.5;
const FATIGUE_JITTER_ABS_MIN = 0.5;
const FATIGUE_MIN_SAMPLES = 100;

export function detectVocalFatigue(
  baseline: FatigueBaseline,
  recentHnr: number,
  recentJitter: number,
  locale: Locale = DEFAULT_LOCALE,
): FatigueCheck {
  if (
    baseline.sampleCount < FATIGUE_MIN_SAMPLES ||
    baseline.hnrMean <= 0 ||
    baseline.jitterMean <= 0
  ) {
    return { fatigued: false, message: null };
  }

  const hnrDrop = baseline.hnrMean - recentHnr;
  const jitterRatio = recentJitter / baseline.jitterMean;

  const hnrFatigued = hnrDrop >= FATIGUE_HNR_DROP;
  const jitterFatigued =
    jitterRatio >= FATIGUE_JITTER_MULTIPLIER &&
    recentJitter >= FATIGUE_JITTER_ABS_MIN;

  if (hnrFatigued || jitterFatigued) {
    const t = createT(locale, 'training');
    return {
      fatigued: true,
      message: t('safety.vocalFatigue'),
    };
  }

  return { fatigued: false, message: null };
}

// ============================================================
// S/Z Ratio Clinical Screening
// ============================================================

const SZ_RATIO_CLINICAL_THRESHOLD = 1.4;

export function checkSZRatioWarning(ratio: number, locale: Locale = DEFAULT_LOCALE): string | null {
  if (ratio > SZ_RATIO_CLINICAL_THRESHOLD) {
    const t = createT(locale, 'training');
    return t('safety.szRatioWarning');
  }
  return null;
}

/**
 * Mic consent is intentionally device-scoped (not user-scoped) because the
 * browser permission prompt applies to the whole origin, not per user.
 * Using raw localStorage here is deliberate — do NOT replace with scoped helpers.
 */
export function getMicConsent(): boolean {
  try { return localStorage.getItem('hamoni:micConsentAccepted') === 'true'; } catch { return false; }
}

export function setMicConsent(accepted: boolean): void {
  try { localStorage.setItem('hamoni:micConsentAccepted', String(accepted)); } catch { /* noop */ }
}
