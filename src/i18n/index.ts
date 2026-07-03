// ============================================================
// i18n — locale dictionaries + framework-agnostic translator
// ============================================================

import type { Locale } from './types';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, COOKIE_NAME } from './types';

type Dict = Record<string, unknown>;

// Synchronously bundled locale namespaces used by the engine.
import koCoaching from './locales/ko/coaching';
import enCoaching from './locales/en/coaching';
import jaCoaching from './locales/ja/coaching';
import koTraining from './locales/ko/training';
import enTraining from './locales/en/training';
import jaTraining from './locales/ja/training';
import koExerciseContent from './locales/ko/exerciseContent';
import enExerciseContent from './locales/en/exerciseContent';
import jaExerciseContent from './locales/ja/exerciseContent';
import koScaleTraining from './locales/ko/scaleTraining';
import enScaleTraining from './locales/en/scaleTraining';
import jaScaleTraining from './locales/ja/scaleTraining';
import koEarTraining from './locales/ko/earTraining';
import enEarTraining from './locales/en/earTraining';
import jaEarTraining from './locales/ja/earTraining';
import koRhythmTraining from './locales/ko/rhythmTraining';
import enRhythmTraining from './locales/en/rhythmTraining';
import jaRhythmTraining from './locales/ja/rhythmTraining';
import koVoiceProfile from './locales/ko/voiceProfile';
import enVoiceProfile from './locales/en/voiceProfile';
import jaVoiceProfile from './locales/ja/voiceProfile';
import koVoice from './locales/ko/voice';
import enVoice from './locales/en/voice';
import jaVoice from './locales/ja/voice';

const syncRegistry: Record<Locale, Record<string, Dict>> = {
  ko: {
    coaching: koCoaching,
    training: koTraining,
    exerciseContent: koExerciseContent,
    scaleTraining: koScaleTraining,
    earTraining: koEarTraining,
    rhythmTraining: koRhythmTraining,
    voiceProfile: koVoiceProfile,
    voice: koVoice,
  },
  en: {
    coaching: enCoaching,
    training: enTraining,
    exerciseContent: enExerciseContent,
    scaleTraining: enScaleTraining,
    earTraining: enEarTraining,
    rhythmTraining: enRhythmTraining,
    voiceProfile: enVoiceProfile,
    voice: enVoice,
  },
  ja: {
    coaching: jaCoaching,
    training: jaTraining,
    exerciseContent: jaExerciseContent,
    scaleTraining: jaScaleTraining,
    earTraining: jaEarTraining,
    rhythmTraining: jaRhythmTraining,
    voiceProfile: jaVoiceProfile,
    voice: jaVoice,
  },
};

/** Register a namespace dictionary at runtime. */
export function registerNamespace(locale: Locale, ns: string, dict: Dict): void {
  syncRegistry[locale] = syncRegistry[locale] || {};
  syncRegistry[locale][ns] = dict;
}

/**
 * Resolve a dotted key path from a dictionary.
 * e.g. 'nav.dashboard' → dict.nav.dashboard
 */
function resolve(dict: Dict, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

/** Interpolate {param} placeholders in a string. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

/**
 * Create a translation function for a given locale and namespace.
 * Fallback chain: locale[key] → ko[key] → key string
 */
export function createT(locale: Locale, ns: string) {
  const dict = syncRegistry[locale]?.[ns];
  const fallbackDict = locale !== DEFAULT_LOCALE ? syncRegistry[DEFAULT_LOCALE]?.[ns] : undefined;

  return function t(key: string, params?: Record<string, string | number>): string {
    const value = (dict && resolve(dict, key))
      ?? (fallbackDict && resolve(fallbackDict, key))
      ?? key;
    return interpolate(value, params);
  };
}

/**
 * Extract the locale from a request's cookies (framework-agnostic).
 */
export function getLocaleFromRequest(request: { headers: { get(name: string): string | null } }): Locale {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const candidate = match?.[1] as string | undefined;
  if (candidate && (SUPPORTED_LOCALES as readonly string[]).includes(candidate)) {
    return candidate as Locale;
  }
  return DEFAULT_LOCALE;
}
