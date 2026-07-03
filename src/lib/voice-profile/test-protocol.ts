// ============================================================
// Voice Profile v2 ("목BTI") — Test Protocol
// ============================================================
// Defines the 3 test phases for voice profile classification.
// Each phase targets different vocal characteristics:
//   1. Sustained tone -> tone axis (clear/warm/deep/husky)
//   2. Range sweep -> pitch range + flexibility
//   3. Expression -> expression axis (wind/flame/wave)
// ============================================================

import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';
import type { TestPhase } from './types';

// ============================================================
// Test Phase Definitions (locale-independent data)
// ============================================================

interface TestPhaseConfig {
  id: string;
  durationSec: number;
  icon: string;
}

const TEST_PHASE_CONFIGS: TestPhaseConfig[] = [
  { id: 'sustained', durationSec: 10, icon: '🎵' },
  { id: 'rangeSweep', durationSec: 15, icon: '🏔️' },
  { id: 'expression', durationSec: 12, icon: '🔥' },
];

// ============================================================
// Localized Accessors
// ============================================================

export interface LocalizedTestPhase {
  id: string;
  name: string;
  instruction: string;
  measuresLabel: string;
  durationSec: number;
  icon: string;
}

/**
 * Get all test phases with localized text.
 */
export function getLocalizedTestPhases(locale: Locale = DEFAULT_LOCALE): LocalizedTestPhase[] {
  const t = createT(locale, 'voiceProfile');
  return TEST_PHASE_CONFIGS.map((config) => ({
    id: config.id,
    name: t(`testPhases.${config.id}.name`),
    instruction: t(`testPhases.${config.id}.instruction`),
    measuresLabel: t(`testPhases.${config.id}.measuresLabel`),
    durationSec: config.durationSec,
    icon: config.icon,
  }));
}

/**
 * Get a single localized test phase by id.
 */
export function getLocalizedTestPhase(id: string, locale: Locale = DEFAULT_LOCALE): LocalizedTestPhase | undefined {
  return getLocalizedTestPhases(locale).find((phase) => phase.id === id);
}

// ============================================================
// Legacy API (backward compatible)
// ============================================================

/**
 * Static test phases with Korean text (default locale).
 * Kept for backward compatibility with existing callers.
 */
export const TEST_PHASES: TestPhase[] = TEST_PHASE_CONFIGS.map((config) => {
  const t = createT(DEFAULT_LOCALE, 'voiceProfile');
  return {
    id: config.id,
    nameKo: t(`testPhases.${config.id}.name`),
    instruction: t(`testPhases.${config.id}.instruction`),
    measuresLabel: t(`testPhases.${config.id}.measuresLabel`),
    durationSec: config.durationSec,
    icon: config.icon,
  };
});

/** Total duration of all test phases in seconds */
export const TOTAL_TEST_DURATION_SEC = TEST_PHASE_CONFIGS.reduce(
  (sum, config) => sum + config.durationSec,
  0,
);

/** Look up a test phase by id (legacy Korean) */
export function getTestPhase(id: string): TestPhase | undefined {
  return TEST_PHASES.find((phase) => phase.id === id);
}
