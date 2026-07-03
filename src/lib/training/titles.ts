// ============================================================
// Training Feature — XP Title System (v2: VPR-gated)
// ============================================================
// Maps cumulative XP to progression titles (7 tiers).
//
// Title unlocking requires ALL conditions simultaneously:
//   1. XP threshold (dedication / time invested)
//   2. Level gate (broad skill coverage across exercises)
//   3. VPR gate (actual vocal proficiency — tiers 4+ only)
//   4. Activity gate (recent practice — tiers 5+ only)
//
// This ensures a "가왕" truly sounds like a 가왕, and a "비르투오소"
// has genuinely professional-level vocal technique.
//
// Easter egg: "가희" title for female profiles with 3+ years and 150k+ XP.

import type { TrainingProgress } from './types';
import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';

// ============================================================
// Types
// ============================================================

export interface Title {
  readonly minXP: number;
  readonly title: string;
  readonly icon: string;
  readonly levelGate?: {
    readonly minLevel: number;
    readonly minExercises: number;
  };
  /** Minimum Voice Proficiency Rating (0-100) required */
  readonly vprGate?: number;
  /** Minimum sessions in last 30 days to maintain this title */
  readonly activityGate?: number;
}

/** Context for title checks (level gates + VPR + Easter egg) */
export interface TitleContext {
  gender?: 'male' | 'female';
  /** ISO date string when vocal range was first measured */
  vocalRangeMeasuredAt?: string;
  /** Exercise ID → currentLevel map for level-gate checks */
  exerciseLevels?: Record<string, number>;
  /** Current Voice Proficiency Rating (0-100) from vpr.ts */
  vpr?: number;
  /** Number of sessions in last 30 days */
  recentSessionCount?: number;
}

// ============================================================
// Title definitions
// ============================================================

/** Hidden Easter egg title — 가희 (Songstress) */
const EASTER_EGG_GAHEE: Title = {
  minXP: 150000,
  title: '가희',
  icon: '🎙️',
  vprGate: 88,
  activityGate: 20,
};
const GAHEE_MIN_YEARS = 3;

/**
 * Title progression with VPR gates.
 *
 * What each VPR requirement means in practice:
 *
 * VPR 40 (보컬 수련생):
 *   Jitter ~1.3%  | Shimmer ~3.4%  | HNR ~16dB  | F0 Std ~5.2Hz
 *   → Beginner with basic vocal awareness, clearly trying
 *
 * VPR 55 (발성 장인):
 *   Jitter ~1.0%  | Shimmer ~2.8%  | HNR ~18.3dB | F0 Std ~4.1Hz
 *   → Hobbyist vocalist, noticeably above average person
 *
 * VPR 72 (가왕):
 *   Jitter ~0.65% | Shimmer ~2.1%  | HNR ~20.8dB | F0 Std ~2.6Hz
 *   → Trained vocalist, comparable to vocal student or skilled choir member
 *
 * VPR 88 (비르투오소):
 *   Jitter ~0.42% | Shimmer ~1.5%  | HNR ~23.2dB | F0 Std ~1.4Hz
 *   → Professional-level technique. Near-clinical-excellent metrics.
 *     This is genuine 성악과 졸업생 / 프로 가수 territory.
 */
export const TITLES: readonly Title[] = [
  { minXP: 0,      title: '첫 걸음',     icon: '🌱' },
  { minXP: 200,    title: '목소리 탐험가', icon: '🔍' },
  { minXP: 600,    title: '소리 여행자',   icon: '🎵' },
  { minXP: 1500,   title: '보컬 수련생',   icon: '🎤',
    levelGate: { minLevel: 3, minExercises: 3 },
    vprGate: 40 },
  { minXP: 8000,   title: '발성 장인',    icon: '⭐',
    levelGate: { minLevel: 5, minExercises: 8 },
    vprGate: 55,
    activityGate: 10 },
  { minXP: 25000,  title: '가왕',        icon: '👑',
    levelGate: { minLevel: 7, minExercises: 12 },
    vprGate: 72,
    activityGate: 15 },
  { minXP: 100000, title: '비르투오소',    icon: '🏆',
    levelGate: { minLevel: 9, minExercises: 18 },
    vprGate: 88,
    activityGate: 20 },
] as const;

// ============================================================
// Helpers
// ============================================================

/** Count exercises that have reached at least the given level */
function countExercisesAtLevel(
  levels: Record<string, number>,
  minLevel: number,
): number {
  return Object.values(levels).filter((lv) => lv >= minLevel).length;
}

/** Check if a title's level gate is satisfied */
function meetsLevelGate(title: Title, ctx?: TitleContext): boolean {
  if (!title.levelGate) return true;
  if (!ctx?.exerciseLevels) return true; // lenient when no level data
  return (
    countExercisesAtLevel(ctx.exerciseLevels, title.levelGate.minLevel) >=
    title.levelGate.minExercises
  );
}

/** Check if a title's VPR gate is satisfied */
function meetsVprGate(title: Title, ctx?: TitleContext): boolean {
  if (!title.vprGate) return true;
  if (ctx?.vpr === undefined) return true; // lenient when no VPR data
  return ctx.vpr >= title.vprGate;
}

/** Check if a title's activity gate is satisfied */
function meetsActivityGate(title: Title, ctx?: TitleContext): boolean {
  if (!title.activityGate) return true;
  if (ctx?.recentSessionCount === undefined) return true; // lenient when no data
  return ctx.recentSessionCount >= title.activityGate;
}

/** Check ALL gates for a title */
function meetsAllGates(title: Title, ctx?: TitleContext): boolean {
  return (
    meetsLevelGate(title, ctx) &&
    meetsVprGate(title, ctx) &&
    meetsActivityGate(title, ctx)
  );
}

/**
 * Extract exercise levels from TrainingProgress for use with title functions.
 */
export function extractExerciseLevels(
  progress: TrainingProgress,
): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const [id, ep] of Object.entries(progress.exercises)) {
    levels[id] = ep.currentLevel;
  }
  return levels;
}

/**
 * Check if the hidden 가희 Easter egg conditions are met:
 * 1. Female vocal range profile
 * 2. Profile measured 3+ years ago (sustained commitment)
 * 3. 150,000+ total XP
 * 4. Meets 비르투오소 level gate + VPR gate
 */
function isGaheeUnlocked(totalXP: number, ctx?: TitleContext): boolean {
  if (!ctx?.gender || ctx.gender !== 'female') return false;
  if (totalXP < EASTER_EGG_GAHEE.minXP) return false;
  if (!ctx.vocalRangeMeasuredAt) return false;
  const measured = new Date(ctx.vocalRangeMeasuredAt);
  const yearsElapsed =
    (Date.now() - measured.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsElapsed < GAHEE_MIN_YEARS) return false;
  // Must also meet 비르투오소 gates
  const virtuoso = TITLES[TITLES.length - 1];
  return meetsAllGates(virtuoso, ctx);
}

// ============================================================
// getCurrentTitle
// ============================================================

/**
 * Get the current title for a given total XP.
 * Returns the highest title whose XP + level gate + VPR gate + activity gate are ALL met.
 *
 * When ctx fields are omitted, their gates are skipped (lenient).
 * Pass full context for accurate title resolution.
 */
export function getCurrentTitle(totalXP: number, ctx?: TitleContext): Title {
  if (isGaheeUnlocked(totalXP, ctx)) return EASTER_EGG_GAHEE;
  let current = TITLES[0];
  for (const t of TITLES) {
    if (totalXP >= t.minXP && meetsAllGates(t, ctx)) {
      current = t;
    }
  }
  return current;
}

// ============================================================
// getNextTitle
// ============================================================

export interface NextTitleInfo {
  title: Title;
  xpNeeded: number;
  /** Non-null when the title has an unmet level gate */
  levelNeeded?: {
    minLevel: number;
    minExercises: number;
    current: number;
  };
  /** Non-null when the title has an unmet VPR gate */
  vprNeeded?: {
    required: number;
    current: number;
  };
  /** Non-null when the title has an unmet activity gate */
  activityNeeded?: {
    required: number;
    current: number;
  };
}

/**
 * Get the next title to unlock, or null if already at the highest tier.
 * Returns XP needed and, if applicable, unmet gate requirements.
 */
export function getNextTitle(
  totalXP: number,
  ctx?: TitleContext,
): NextTitleInfo | null {
  if (isGaheeUnlocked(totalXP, ctx)) return null;
  const current = getCurrentTitle(totalXP, ctx);
  const idx = TITLES.indexOf(current);
  if (idx >= TITLES.length - 1) return null;
  const next = TITLES[idx + 1];

  const result: NextTitleInfo = {
    title: next,
    xpNeeded: Math.max(0, next.minXP - totalXP),
  };

  // Level gate info
  if (next.levelGate && ctx?.exerciseLevels) {
    const currentCount = countExercisesAtLevel(
      ctx.exerciseLevels,
      next.levelGate.minLevel,
    );
    if (currentCount < next.levelGate.minExercises) {
      result.levelNeeded = {
        minLevel: next.levelGate.minLevel,
        minExercises: next.levelGate.minExercises,
        current: currentCount,
      };
    }
  }

  // VPR gate info
  if (next.vprGate && ctx?.vpr !== undefined) {
    if (ctx.vpr < next.vprGate) {
      result.vprNeeded = {
        required: next.vprGate,
        current: ctx.vpr,
      };
    }
  }

  // Activity gate info
  if (next.activityGate && ctx?.recentSessionCount !== undefined) {
    if (ctx.recentSessionCount < next.activityGate) {
      result.activityNeeded = {
        required: next.activityGate,
        current: ctx.recentSessionCount,
      };
    }
  }

  return result;
}

// ============================================================
// Title display helpers
// ============================================================

// Title key mapping for i18n lookup
const TITLE_KEYS: Record<string, string> = {
  '첫 걸음': 'firstStep',
  '목소리 탐험가': 'explorer',
  '소리 여행자': 'traveler',
  '보컬 수련생': 'apprentice',
  '발성 장인': 'master',
  '가왕': 'king',
  '비르투오소': 'virtuoso',
  '가희': 'songstress',
};

/** Get locale-aware title display name via i18n */
export function getTitleDisplayName(title: Title, locale: Locale): string {
  const key = TITLE_KEYS[title.title];
  if (!key) return title.title;
  const t = createT(locale, 'training');
  return t(`titleNames.${key}`);
}

/**
 * Get progress percentage toward the next title (0–100).
 * Based on XP only (level/VPR/activity gates shown separately in UI).
 * Returns 100 if already at the highest tier.
 */
export function getTitleProgress(totalXP: number, ctx?: TitleContext): number {
  if (isGaheeUnlocked(totalXP, ctx)) return 100;
  const current = getCurrentTitle(totalXP, ctx);
  const idx = TITLES.indexOf(current);
  if (idx >= TITLES.length - 1) return 100;
  const next = TITLES[idx + 1];
  const range = next.minXP - current.minXP;
  const progress = totalXP - current.minXP;
  return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
}
