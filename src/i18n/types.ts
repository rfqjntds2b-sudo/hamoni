export type Locale = 'ko' | 'en' | 'ja';

export const DEFAULT_LOCALE: Locale = 'ko';
export const SUPPORTED_LOCALES: Locale[] = ['ko', 'en', 'ja'];

export const LOCALE_NAMES: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
};

export const COOKIE_NAME = 'NEXT_LOCALE';
