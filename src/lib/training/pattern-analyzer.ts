// ============================================================
// Training Feature — Pattern Analyzer (pure utility)
// ============================================================
// Analyzes training session history to discover meaningful
// patterns: best day of week, exercise synergy, and best
// time of day. No React, no localStorage — takes data as input.

import type { SessionRecord, ExerciseId } from './types';
import { getExerciseName } from './exercises';

// ============================================================
// Types
// ============================================================

export interface DiscoveredPattern {
  type: 'day_of_week' | 'exercise_synergy' | 'time_of_day';
  confidence: number; // 0-1
  description: {
    ko: string;
    en: string;
    ja: string;
  };
  detail: string; // machine-readable detail for Pro display
}

export interface PatternAnalysisResult {
  patterns: DiscoveredPattern[];
  sessionCount: number;
}

// ============================================================
// Constants
// ============================================================

const MIN_SESSIONS = 15;
const MIN_DAY_SESSIONS = 3;
const MIN_SYNERGY_OCCURRENCES = 3;
const DAY_OF_WEEK_THRESHOLD = 20; // percentage points above average
const TIME_OF_DAY_THRESHOLD = 20;
const SYNERGY_THRESHOLD = 25;
const MIN_CONFIDENCE = 0.15;

const DAY_NAMES = {
  ko: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
} as const;

type TimePeriod = 'morning' | 'afternoon' | 'evening';

const TIME_PERIOD_NAMES: Record<string, Record<TimePeriod, string>> = {
  ko: { morning: '오전', afternoon: '오후', evening: '저녁' },
  en: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' },
  ja: { morning: '午前', afternoon: '午後', evening: '夜' },
};

// ============================================================
// Helpers
// ============================================================

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  return 'evening';
}

function computePassRate(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;
  return (sessions.filter((s) => s.passed).length / sessions.length) * 100;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// ============================================================
// Pattern 1: Day of Week
// ============================================================

function detectDayOfWeekPattern(history: SessionRecord[]): DiscoveredPattern | null {
  // Group sessions by day of week (0=Sunday to 6=Saturday)
  const byDay: SessionRecord[][] = Array.from({ length: 7 }, () => []);
  for (const session of history) {
    const day = new Date(session.timestamp).getUTCDay();
    byDay[day].push(session);
  }

  // Compute overall average pass rate
  const overallRate = computePassRate(history);

  // Find the best day with 3+ sessions
  let bestDayIndex = -1;
  let bestDayRate = 0;

  for (let i = 0; i < 7; i++) {
    if (byDay[i].length < MIN_DAY_SESSIONS) continue;
    const rate = computePassRate(byDay[i]);
    if (rate > bestDayRate) {
      bestDayRate = rate;
      bestDayIndex = i;
    }
  }

  if (bestDayIndex === -1) return null;

  const diff = bestDayRate - overallRate;
  if (diff < DAY_OF_WEEK_THRESHOLD) return null;

  const confidence = diff / 100;
  if (confidence < MIN_CONFIDENCE) return null;

  const roundedRate = Math.round(bestDayRate);

  return {
    type: 'day_of_week',
    confidence,
    description: {
      ko: `${DAY_NAMES.ko[bestDayIndex]}에 가장 좋은 성과를 보여요`,
      en: `You perform best on ${DAY_NAMES.en[bestDayIndex]}`,
      ja: `${DAY_NAMES.ja[bestDayIndex]}に最も良い成績を出しています`,
    },
    detail: `best_day:${bestDayIndex}:${roundedRate}`,
  };
}

// ============================================================
// Pattern 2: Exercise Synergy
// ============================================================

function detectExerciseSynergy(history: SessionRecord[]): DiscoveredPattern | null {
  // Sort history chronologically (oldest first) for sequence detection
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Find all same-day A→B sequences
  type Pair = { a: ExerciseId; b: ExerciseId };
  const sequenceResults: Map<string, { preceded: SessionRecord[]; all: SessionRecord[] }> = new Map();

  // Track overall pass rate per exercise
  const exerciseSessions: Map<ExerciseId, SessionRecord[]> = new Map();
  for (const session of sorted) {
    const arr = exerciseSessions.get(session.exerciseId) ?? [];
    arr.push(session);
    exerciseSessions.set(session.exerciseId, arr);
  }

  // Scan consecutive pairs within the same day
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (prev.exerciseId === curr.exerciseId) continue;

    const prevDate = new Date(prev.timestamp);
    const currDate = new Date(curr.timestamp);
    if (!isSameDay(prevDate, currDate)) continue;

    const pairKey = `${prev.exerciseId}:${curr.exerciseId}`;
    const existing = sequenceResults.get(pairKey) ?? {
      preceded: [],
      all: exerciseSessions.get(curr.exerciseId) ?? [],
    };
    existing.preceded.push(curr);
    sequenceResults.set(pairKey, existing);
  }

  // Find the best synergy pair
  let bestPair: Pair | null = null;
  let bestBoostedRate = 0;
  let bestOverallRate = 0;

  for (const [key, { preceded, all }] of sequenceResults.entries()) {
    if (preceded.length < MIN_SYNERGY_OCCURRENCES) continue;

    const boostedRate = computePassRate(preceded);
    const overallRate = computePassRate(all);
    const diff = boostedRate - overallRate;

    if (diff >= SYNERGY_THRESHOLD && boostedRate > bestBoostedRate) {
      const [a, b] = key.split(':') as [ExerciseId, ExerciseId];
      bestPair = { a, b };
      bestBoostedRate = boostedRate;
      bestOverallRate = overallRate;
    }
  }

  if (!bestPair) return null;

  const diff = bestBoostedRate - bestOverallRate;
  const confidence = diff / 100;
  if (confidence < MIN_CONFIDENCE) return null;

  const roundedRate = Math.round(bestBoostedRate);

  // Get localized exercise names
  const nameAKo = getExerciseName(bestPair.a, 'ko');
  const nameAEn = getExerciseName(bestPair.a, 'en');
  const nameAJa = getExerciseName(bestPair.a, 'ja');
  const nameBKo = getExerciseName(bestPair.b, 'ko');
  const nameBEn = getExerciseName(bestPair.b, 'en');
  const nameBJa = getExerciseName(bestPair.b, 'ja');

  return {
    type: 'exercise_synergy',
    confidence,
    description: {
      ko: `${nameAKo} 후 ${nameBKo} 통과율이 높아요`,
      en: `Higher pass rate for ${nameBEn} after ${nameAEn}`,
      ja: `${nameAJa}の後の${nameBJa}の合格率が高いです`,
    },
    detail: `synergy:${bestPair.a}:${bestPair.b}:${roundedRate}`,
  };
}

// ============================================================
// Pattern 3: Time of Day
// ============================================================

function detectTimeOfDayPattern(history: SessionRecord[]): DiscoveredPattern | null {
  const byPeriod: Record<TimePeriod, SessionRecord[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const session of history) {
    const hour = new Date(session.timestamp).getUTCHours();
    const period = getTimePeriod(hour);
    byPeriod[period].push(session);
  }

  const overallRate = computePassRate(history);

  let bestPeriod: TimePeriod | null = null;
  let bestPeriodRate = 0;

  for (const period of ['morning', 'afternoon', 'evening'] as TimePeriod[]) {
    if (byPeriod[period].length < MIN_DAY_SESSIONS) continue;
    const rate = computePassRate(byPeriod[period]);
    if (rate > bestPeriodRate) {
      bestPeriodRate = rate;
      bestPeriod = period;
    }
  }

  if (!bestPeriod) return null;

  const diff = bestPeriodRate - overallRate;
  if (diff < TIME_OF_DAY_THRESHOLD) return null;

  const confidence = diff / 100;
  if (confidence < MIN_CONFIDENCE) return null;

  const roundedRate = Math.round(bestPeriodRate);

  return {
    type: 'time_of_day',
    confidence,
    description: {
      ko: `${TIME_PERIOD_NAMES.ko[bestPeriod]}에 연습할 때 성과가 좋아요`,
      en: `You perform better when practicing in the ${TIME_PERIOD_NAMES.en[bestPeriod]}`,
      ja: `${TIME_PERIOD_NAMES.ja[bestPeriod]}に練習すると成績が良いです`,
    },
    detail: `time:${bestPeriod}:${roundedRate}`,
  };
}

// ============================================================
// Main Entry Point
// ============================================================

/**
 * Analyze training session history for meaningful patterns.
 * Returns discovered patterns and total session count.
 *
 * Requires at least 15 sessions to produce results.
 * Only includes patterns with confidence >= 0.15 (15%).
 */
export function analyzePatterns(history: SessionRecord[]): PatternAnalysisResult {
  const sessionCount = history.length;

  if (sessionCount < MIN_SESSIONS) {
    return { patterns: [], sessionCount };
  }

  const patterns: DiscoveredPattern[] = [];

  const dayPattern = detectDayOfWeekPattern(history);
  if (dayPattern) patterns.push(dayPattern);

  const synergyPattern = detectExerciseSynergy(history);
  if (synergyPattern) patterns.push(synergyPattern);

  const timePattern = detectTimeOfDayPattern(history);
  if (timePattern) patterns.push(timePattern);

  // Sort by confidence descending
  patterns.sort((a, b) => b.confidence - a.confidence);

  return { patterns, sessionCount };
}
