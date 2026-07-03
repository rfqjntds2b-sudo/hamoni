// ============================================================
// Rhythm Training — Pattern Definitions
// ============================================================
// 6 levels of rhythm patterns with progressive difficulty.
// Level 1: Simple quarter notes
// Level 2: Quarter + eighth note mix
// Level 3: Quarter/eighth with rests
// Level 4: Syncopation (off-beat accents)
// Level 5: Compound meter (6/8)
// Level 6: Sixteenth notes, dotted rhythms
// ============================================================

import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';
import type { RhythmPattern, RhythmBeat } from './types';

// Helpers for concise beat definitions
const q = (accent = false): RhythmBeat => ({ subdivision: 'quarter', accent });
const e = (accent = false): RhythmBeat => ({ subdivision: 'eighth', accent });
const r = (): RhythmBeat => ({ subdivision: 'rest', accent: false });
const dq = (accent = false): RhythmBeat => ({ subdivision: 'dotted_quarter', accent });
const s = (accent = false): RhythmBeat => ({ subdivision: 'sixteenth', accent });

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  // ── Level 1: Simple quarter notes, 4/4, 2 measures ──
  {
    id: 'l1_basic_4',
    name: 'Basic Four',
    nameKo: '기본 4박',
    level: 1,
    timeSignature: [4, 4],
    beats: [
      q(true), q(), q(), q(),
      q(true), q(), q(), q(),
    ],
    measures: 2,
  },
  {
    id: 'l1_accent_1_3',
    name: 'Accent 1 & 3',
    nameKo: '1·3박 강세',
    level: 1,
    timeSignature: [4, 4],
    beats: [
      q(true), q(), q(true), q(),
      q(true), q(), q(true), q(),
    ],
    measures: 2,
  },
  {
    id: 'l1_waltz',
    name: 'Waltz Basic',
    nameKo: '왈츠 기본',
    level: 1,
    timeSignature: [3, 4],
    beats: [
      q(true), q(), q(),
      q(true), q(), q(),
    ],
    measures: 2,
  },

  // ── Level 2: Quarter + eighth note mix ──
  {
    id: 'l2_eighth_pair',
    name: 'Eighth Pair',
    nameKo: '8분음표 조합',
    level: 2,
    timeSignature: [4, 4],
    beats: [
      q(true), q(), e(), e(), q(),
      q(true), q(), e(), e(), q(),
    ],
    measures: 2,
  },
  {
    id: 'l2_running_eighths',
    name: 'Running Eighths',
    nameKo: '연속 8분음표',
    level: 2,
    timeSignature: [4, 4],
    beats: [
      q(true), e(), e(), e(), e(), q(),
      q(true), e(), e(), e(), e(), q(),
    ],
    measures: 2,
  },
  {
    id: 'l2_mixed_rhythm',
    name: 'Mixed Rhythm',
    nameKo: '혼합 리듬',
    level: 2,
    timeSignature: [4, 4],
    beats: [
      e(true), e(), q(), e(), e(), q(),
      e(true), e(), q(), e(), e(), q(),
    ],
    measures: 2,
  },

  // ── Level 3: Quarter/eighth with rests ──
  {
    id: 'l3_rest_beat_2',
    name: 'Rest on Beat 2',
    nameKo: '2박 쉼표',
    level: 3,
    timeSignature: [4, 4],
    beats: [
      q(true), r(), q(), q(),
      q(true), r(), q(), q(),
    ],
    measures: 2,
  },
  {
    id: 'l3_rest_and_go',
    name: 'Rest and Go',
    nameKo: '쉬고 가기',
    level: 3,
    timeSignature: [4, 4],
    beats: [
      q(true), q(), r(), e(), e(),
      q(true), q(), r(), e(), e(),
    ],
    measures: 2,
  },
  {
    id: 'l3_scattered_rest',
    name: 'Scattered Rests',
    nameKo: '흩어진 쉼표',
    level: 3,
    timeSignature: [4, 4],
    beats: [
      q(true), r(), e(), e(), r(),
      q(true), r(), e(), e(), r(),
    ],
    measures: 2,
  },

  // ── Level 4: Syncopation (off-beat accents) ──
  {
    id: 'l4_offbeat_accent',
    name: 'Offbeat Accent',
    nameKo: '엇박 강세',
    level: 4,
    timeSignature: [4, 4],
    beats: [
      e(), e(true), e(), e(true), e(), e(true), e(), e(),
      e(), e(true), e(), e(true), e(), e(true), e(), e(),
    ],
    measures: 2,
  },
  {
    id: 'l4_synco_basic',
    name: 'Basic Syncopation',
    nameKo: '기본 당김음',
    level: 4,
    timeSignature: [4, 4],
    beats: [
      q(true), e(), e(true), r(), q(),
      q(true), e(), e(true), r(), q(),
    ],
    measures: 2,
  },
  {
    id: 'l4_push_rhythm',
    name: 'Push Rhythm',
    nameKo: '밀어내기 리듬',
    level: 4,
    timeSignature: [4, 4],
    beats: [
      r(), e(true), q(), e(true), q(),
      r(), e(true), q(), e(true), q(),
    ],
    measures: 2,
  },

  // ── Level 5: Compound meter (6/8) ──
  {
    id: 'l5_compound_basic',
    name: 'Compound Basic',
    nameKo: '6/8 기본',
    level: 5,
    timeSignature: [6, 8],
    beats: [
      e(true), e(), e(), e(true), e(), e(),
      e(true), e(), e(), e(true), e(), e(),
    ],
    measures: 2,
  },
  {
    id: 'l5_jig',
    name: 'Jig Pattern',
    nameKo: '지그 패턴',
    level: 5,
    timeSignature: [6, 8],
    beats: [
      q(true), e(), q(true), e(),
      q(true), e(), q(true), e(),
    ],
    measures: 2,
  },
  {
    id: 'l5_compound_rest',
    name: 'Compound with Rest',
    nameKo: '6/8 쉼표',
    level: 5,
    timeSignature: [6, 8],
    beats: [
      e(true), e(), r(), e(true), e(), e(),
      e(true), e(), r(), e(true), e(), e(),
    ],
    measures: 2,
  },

  // ── Level 6: Sixteenth notes, dotted rhythms ──
  {
    id: 'l6_sixteenth_run',
    name: 'Sixteenth Run',
    nameKo: '16분음표 연속',
    level: 6,
    timeSignature: [4, 4],
    beats: [
      q(true), s(), s(), s(), s(), q(), q(),
      q(true), s(), s(), s(), s(), q(), q(),
    ],
    measures: 2,
  },
  {
    id: 'l6_dotted_quarter',
    name: 'Dotted Quarter',
    nameKo: '점4분음표',
    level: 6,
    timeSignature: [4, 4],
    beats: [
      dq(true), e(), dq(), e(),
      dq(true), e(), dq(), e(),
    ],
    measures: 2,
  },
  {
    id: 'l6_mixed_advanced',
    name: 'Advanced Mix',
    nameKo: '고급 혼합',
    level: 6,
    timeSignature: [4, 4],
    beats: [
      e(true), s(), s(), q(), e(), s(), s(), q(),
      e(true), s(), s(), q(), e(), s(), s(), q(),
    ],
    measures: 2,
  },
];

/**
 * Get all patterns for a given level.
 */
export function getPatternsByLevel(level: number): RhythmPattern[] {
  return RHYTHM_PATTERNS.filter((p) => p.level === level);
}

/**
 * Get a random pattern for a given level.
 * Falls back to level 1 if no patterns exist for the requested level.
 */
export function getRandomPattern(level: number): RhythmPattern {
  const patterns = getPatternsByLevel(level);
  if (patterns.length === 0) {
    const fallback = getPatternsByLevel(1);
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Get the localized name for a rhythm pattern.
 */
export function getLocalizedPatternName(patternId: string, locale: Locale = DEFAULT_LOCALE): string {
  const t = createT(locale, 'rhythmTraining');
  return t(`patternNames.${patternId}`);
}
