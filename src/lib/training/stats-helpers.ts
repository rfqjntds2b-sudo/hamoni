// ============================================================
// Training Feature — Stats Computation Helpers
// ============================================================
// Pure functions for the stats page. No side effects, no storage access.

import type { ExerciseId, TrainingProgress, SessionRecord, CriterionResult, DailyActivityLog } from './types';
import { EXERCISES, getExerciseMeta } from './exercises';
import { localDateString, daysAgoString } from './date-utils';

// ============================================================
// Rolling 7-Day Average Types
// ============================================================

export interface RollingAvgPoint {
  date: string;
  jitter: number | null;
  shimmer: number | null;
  hnr: number | null;
}

// ============================================================
// Pass Rate
// ============================================================

export function computePassRate(
  history: SessionRecord[],
  exerciseId?: ExerciseId,
): { passed: number; total: number; rate: number } {
  const filtered = exerciseId
    ? history.filter((s) => s.exerciseId === exerciseId)
    : history;
  const total = filtered.length;
  const passed = filtered.filter((s) => s.passed).length;
  return { passed, total, rate: total > 0 ? Math.round((passed / total) * 100) : 0 };
}

// ============================================================
// Category Level Averages (for radar chart)
// ============================================================

export interface CategoryLevel {
  category: string;
  label: string;
  avgLevel: number;
  maxLevel: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  warmup: '워밍업',
  core: '코어',
  advanced: '고급',
  breath: '호흡',
};

export function computeCategoryLevels(progress: TrainingProgress): CategoryLevel[] {
  const groups: Record<string, number[]> = {};

  for (const ex of EXERCISES) {
    const cat = ex.category;
    if (!groups[cat]) groups[cat] = [];
    const ep = progress.exercises[ex.id];
    if (ep) groups[cat].push(ep.currentLevel);
  }

  return Object.entries(groups).map(([category, levels]) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    avgLevel: levels.length > 0 ? Math.round((levels.reduce((s, l) => s + l, 0) / levels.length) * 10) / 10 : 0,
    maxLevel: Math.max(0, ...levels),
  }));
}

// ============================================================
// Metric Trends (weekly averages from session history)
// ============================================================

export interface MetricWeek {
  week: string; // "3/18-3/24"
  jitter: number | null;
  shimmer: number | null;
  hnr: number | null;
  f0Std: number | null;
}

export function computeMetricTrends(history: SessionRecord[], weeks: number): MetricWeek[] {
  const now = new Date();
  const result: MetricWeek[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const startStr = localDateString(weekStart);
    const endStr = localDateString(weekEnd);

    const sessions = history.filter((s) => {
      const d = s.timestamp.slice(0, 10);
      return d >= startStr && d <= endStr;
    });

    const jitters: number[] = [];
    const shimmers: number[] = [];
    const hnrs: number[] = [];
    const f0s: number[] = [];

    for (const s of sessions) {
      for (const cr of s.criterionResults) {
        if (cr.name === 'jitterMax') jitters.push(cr.actual);
        if (cr.name === 'shimmerMax') shimmers.push(cr.actual);
        if (cr.name === 'hnrMin') hnrs.push(cr.actual);
        if (cr.name === 'f0StdMax') f0s.push(cr.actual);
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : null;

    const startLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    const endLabel = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

    result.push({
      week: `${startLabel}-${endLabel}`,
      jitter: avg(jitters),
      shimmer: avg(shimmers),
      hnr: avg(hnrs),
      f0Std: avg(f0s),
    });
  }

  return result;
}

// ============================================================
// Practice Summary
// ============================================================

export interface PracticeSummary {
  totalMinutes: number;
  totalSessions: number;
  maxLevelExercises: number;
  mostPracticed: { id: ExerciseId; name: string; count: number } | null;
  overallPassRate: number;
}

export function computePracticeSummary(
  progress: TrainingProgress,
  activity: DailyActivityLog,
  history: SessionRecord[],
): PracticeSummary {
  const totalMinutes = Math.round(
    activity.days.reduce((s, d) => s + d.minutesPracticed, 0),
  );
  const totalSessions = history.length;

  let maxLevelExercises = 0;
  let mostId: ExerciseId | null = null;
  let mostCount = 0;

  for (const ex of EXERCISES) {
    const ep = progress.exercises[ex.id];
    if (!ep) continue;
    if (ep.currentLevel >= 10) maxLevelExercises++;
    if (ep.totalAttempts > mostCount) {
      mostCount = ep.totalAttempts;
      mostId = ex.id;
    }
  }

  const { rate } = computePassRate(history);

  return {
    totalMinutes,
    totalSessions,
    maxLevelExercises,
    mostPracticed: mostId ? { id: mostId, name: getExerciseMeta(mostId).name, count: mostCount } : null,
    overallPassRate: rate,
  };
}

// ============================================================
// Per-Exercise Stats (for exercise grid)
// ============================================================

export interface ExerciseStat {
  id: ExerciseId;
  name: string;
  nameEn: string;
  category: string;
  difficulty: number;
  level: number;
  bestLevel: number;
  passRate: number;
  attempts: number;
  consecutivePasses: number;
  personalBests: Record<string, number>;
}

export function computeExerciseStats(
  progress: TrainingProgress,
  history: SessionRecord[],
): ExerciseStat[] {
  return EXERCISES.map((ex) => {
    const ep = progress.exercises[ex.id];
    const { rate } = computePassRate(history, ex.id);
    return {
      id: ex.id,
      name: ex.name,
      nameEn: ex.nameEn,
      category: ex.category,
      difficulty: ex.difficulty,
      level: ep?.currentLevel ?? 1,
      bestLevel: ep?.bestLevel ?? 1,
      passRate: rate,
      attempts: ep?.totalAttempts ?? 0,
      consecutivePasses: ep?.consecutivePasses ?? 0,
      personalBests: ep?.personalBests ?? {},
    };
  });
}

// ============================================================
// Exercise Metric Timeline (single exercise + criterion over time)
// ============================================================

export interface MetricTimelinePoint {
  date: string;
  actual: number;
  target: number;
  passed: boolean;
}

export function computeExerciseMetricTimeline(
  history: SessionRecord[],
  exerciseId: ExerciseId,
  criterionName: string,
): MetricTimelinePoint[] {
  return history
    .filter((s) => s.exerciseId === exerciseId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .reduce<MetricTimelinePoint[]>((acc, session) => {
      const cr = session.criterionResults.find((c) => c.name === criterionName);
      if (cr) {
        acc.push({
          date: session.timestamp.slice(0, 10),
          actual: cr.actual,
          target: cr.target,
          passed: cr.passed,
        });
      }
      return acc;
    }, []);
}

// ============================================================
// Pass Rate Trend (daily pass rate with 3-day SMA)
// ============================================================

export interface PassRateTrendPoint {
  date: string;
  rate: number;
}

export function computePassRateTrend(
  history: SessionRecord[],
  windowDays: number,
): PassRateTrendPoint[] {
  const cutoffStr = daysAgoString(windowDays);

  // Group sessions by date
  const byDate = new Map<string, { passed: number; total: number }>();
  for (const s of history) {
    const d = s.timestamp.slice(0, 10);
    if (d < cutoffStr) continue;
    const entry = byDate.get(d) ?? { passed: 0, total: 0 };
    entry.total++;
    if (s.passed) entry.passed++;
    byDate.set(d, entry);
  }

  // Sort dates ascending and compute raw daily rates
  const sortedDates = [...byDate.keys()].sort();
  const rawRates = sortedDates.map((date) => {
    const entry = byDate.get(date)!;
    return { date, rate: Math.round((entry.passed / entry.total) * 100) };
  });

  // Apply 3-day simple moving average
  if (rawRates.length === 0) return [];

  return rawRates.map((point, i) => {
    const windowStart = Math.max(0, i - 2);
    const window = rawRates.slice(windowStart, i + 1);
    const avg = window.reduce((sum, p) => sum + p.rate, 0) / window.length;
    return { date: point.date, rate: Math.round(avg) };
  });
}

// ============================================================
// Level Timeline (step-chart data for a single exercise)
// ============================================================

export interface LevelTimelinePoint {
  date: string;
  level: number;
}

export function computeLevelTimeline(
  history: SessionRecord[],
  exerciseId: ExerciseId,
): LevelTimelinePoint[] {
  const filtered = history
    .filter((s) => s.exerciseId === exerciseId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (filtered.length === 0) return [];

  const result: LevelTimelinePoint[] = [
    { date: filtered[0].timestamp.slice(0, 10), level: filtered[0].level },
  ];

  for (let i = 1; i < filtered.length; i++) {
    if (filtered[i].level !== filtered[i - 1].level) {
      result.push({
        date: filtered[i].timestamp.slice(0, 10),
        level: filtered[i].level,
      });
    }
  }

  return result;
}

// ============================================================
// XP Curve (cumulative XP over the activity period)
// ============================================================

export interface XPCurvePoint {
  date: string;
  cumulative: number;
}

export function computeXPCurve(
  activity: DailyActivityLog,
  currentTotalXP: number,
): XPCurvePoint[] {
  const sorted = [...activity.days].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return [];

  const sumActivityXP = sorted.reduce((sum, d) => sum + d.xpEarned, 0);
  const startingXP = currentTotalXP - sumActivityXP;

  let cumulative = startingXP;
  return sorted.map((day) => {
    cumulative += day.xpEarned;
    return { date: day.date, cumulative };
  });
}

// ============================================================
// Growth Highlights (most improved exercise+metric combos)
// ============================================================

export interface GrowthHighlight {
  exerciseId: ExerciseId;
  metric: string;
  before: number;
  after: number;
  changePercent: number;
}

/** Metrics where lower actual values indicate improvement */
const INVERSE_METRICS = new Set(['jitterMax', 'shimmerMax', 'f0StdMax', 'f0DeviationMax', 'rmsCVMax']);

export function computeGrowthHighlights(
  history: SessionRecord[],
  periodDays: number,
): GrowthHighlight[] {
  const cutoffStr = daysAgoString(periodDays);

  // Filter to the period window
  const inPeriod = history.filter((s) => s.timestamp.slice(0, 10) >= cutoffStr);
  if (inPeriod.length < 2) return [];

  // Sort by timestamp ascending and split into first half / second half
  const sorted = [...inPeriod].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const midIndex = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midIndex);
  const secondHalf = sorted.slice(midIndex);

  // Collect average criterion values per exercise+metric in each half
  type MetricAccum = { sum: number; count: number };
  type HalfMap = Map<string, MetricAccum>; // key: "exerciseId|criterionName"

  function buildHalfMap(sessions: SessionRecord[]): HalfMap {
    const map: HalfMap = new Map();
    for (const s of sessions) {
      for (const cr of s.criterionResults) {
        const key = `${s.exerciseId}|${cr.name}`;
        const entry = map.get(key) ?? { sum: 0, count: 0 };
        entry.sum += cr.actual;
        entry.count++;
        map.set(key, entry);
      }
    }
    return map;
  }

  const firstMap = buildHalfMap(firstHalf);
  const secondMap = buildHalfMap(secondHalf);

  // Compare first half vs second half
  const highlights: GrowthHighlight[] = [];

  for (const [key, secondEntry] of secondMap) {
    const firstEntry = firstMap.get(key);
    if (!firstEntry) continue;

    const before = firstEntry.sum / firstEntry.count;
    const after = secondEntry.sum / secondEntry.count;

    // Skip if before is effectively zero (can't compute meaningful percent)
    if (Math.abs(before) < 0.0001) continue;

    const rawChange = ((after - before) / Math.abs(before)) * 100;

    const [exerciseId, metric] = key.split('|') as [ExerciseId, string];

    // For inverse metrics, improvement means the value went down
    const changePercent = INVERSE_METRICS.has(metric)
      ? Math.round(-rawChange)
      : Math.round(rawChange);

    // Only include improvements (positive changePercent)
    if (changePercent > 0) {
      highlights.push({
        exerciseId,
        metric,
        before: Math.round(before * 100) / 100,
        after: Math.round(after * 100) / 100,
        changePercent,
      });
    }
  }

  // Sort by improvement descending, return top 3
  highlights.sort((a, b) => b.changePercent - a.changePercent);
  return highlights.slice(0, 3);
}

// ============================================================
// 7-Day Rolling Average (global jitter/shimmer/hnr)
// ============================================================

/**
 * Compute 7-day rolling averages for jitter, shimmer, and HNR
 * across all exercises within a given period.
 *
 * For each date with session data, a 7-day lookback window is used
 * to smooth out daily noise and reveal improvement trends.
 */
export function computeRolling7DayAvg(
  history: SessionRecord[],
  periodDays: number,
): RollingAvgPoint[] {
  const cutoffStr = daysAgoString(periodDays);

  // Group sessions by date, extracting metric values from criterionResults
  const byDate = new Map<string, { jitters: number[]; shimmers: number[]; hnrs: number[] }>();
  for (const s of history) {
    const d = s.timestamp.slice(0, 10);
    if (d < cutoffStr) continue;
    const entry = byDate.get(d) ?? { jitters: [], shimmers: [], hnrs: [] };
    for (const cr of s.criterionResults) {
      if (cr.name === 'jitterMax') entry.jitters.push(cr.actual);
      if (cr.name === 'shimmerMax') entry.shimmers.push(cr.actual);
      if (cr.name === 'hnrMin') entry.hnrs.push(cr.actual);
    }
    byDate.set(d, entry);
  }

  // Sort dates ascending
  const sortedDates = [...byDate.keys()].sort();
  if (sortedDates.length === 0) return [];

  // Compute daily averages
  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

  const dailyAvgs = new Map<string, { jitter: number | null; shimmer: number | null; hnr: number | null }>();
  for (const date of sortedDates) {
    const entry = byDate.get(date)!;
    dailyAvgs.set(date, {
      jitter: avg(entry.jitters),
      shimmer: avg(entry.shimmers),
      hnr: avg(entry.hnrs),
    });
  }

  // Compute 7-day rolling average for each date
  const result: RollingAvgPoint[] = [];
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    const windowJitters: number[] = [];
    const windowShimmers: number[] = [];
    const windowHnrs: number[] = [];

    // Look back up to 7 days (by index among active dates)
    for (let j = i; j >= 0; j--) {
      const pastDate = sortedDates[j];
      // Check if pastDate is within 6 days before currentDate
      const diffMs = new Date(currentDate).getTime() - new Date(pastDate).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 6) break;

      const dayAvg = dailyAvgs.get(pastDate)!;
      if (dayAvg.jitter !== null) windowJitters.push(dayAvg.jitter);
      if (dayAvg.shimmer !== null) windowShimmers.push(dayAvg.shimmer);
      if (dayAvg.hnr !== null) windowHnrs.push(dayAvg.hnr);
    }

    const round2 = (v: number) => Math.round(v * 100) / 100;

    result.push({
      date: currentDate,
      jitter: windowJitters.length > 0 ? round2(windowJitters.reduce((s, v) => s + v, 0) / windowJitters.length) : null,
      shimmer: windowShimmers.length > 0 ? round2(windowShimmers.reduce((s, v) => s + v, 0) / windowShimmers.length) : null,
      hnr: windowHnrs.length > 0 ? round2(windowHnrs.reduce((s, v) => s + v, 0) / windowHnrs.length) : null,
    });
  }

  return result;
}

// ============================================================
// 7-Day Rolling Average (per-exercise, single criterion)
// ============================================================

/**
 * Compute 7-day rolling average for a specific exercise + criterion.
 * Used to overlay smoothed trend lines on per-exercise metric charts.
 */
export function computeExerciseRolling7DayAvg(
  history: SessionRecord[],
  exerciseId: ExerciseId,
  criterionName: string,
  periodDays: number,
): { date: string; rollingAvg: number }[] {
  const cutoffStr = daysAgoString(periodDays);

  // Group by date, filtered by exercise + criterion
  const byDate = new Map<string, number[]>();
  for (const s of history) {
    if (s.exerciseId !== exerciseId) continue;
    const d = s.timestamp.slice(0, 10);
    if (d < cutoffStr) continue;
    for (const cr of s.criterionResults) {
      if (cr.name !== criterionName) continue;
      const entry = byDate.get(d) ?? [];
      entry.push(cr.actual);
      byDate.set(d, entry);
    }
  }

  const sortedDates = [...byDate.keys()].sort();
  if (sortedDates.length === 0) return [];

  // Compute daily averages
  const dailyAvgs = new Map<string, number>();
  for (const date of sortedDates) {
    const values = byDate.get(date)!;
    dailyAvgs.set(date, values.reduce((s, v) => s + v, 0) / values.length);
  }

  // Compute 7-day rolling average
  const result: { date: string; rollingAvg: number }[] = [];
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    const windowValues: number[] = [];

    for (let j = i; j >= 0; j--) {
      const pastDate = sortedDates[j];
      const diffMs = new Date(currentDate).getTime() - new Date(pastDate).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 6) break;

      const val = dailyAvgs.get(pastDate);
      if (val !== undefined) windowValues.push(val);
    }

    if (windowValues.length > 0) {
      result.push({
        date: currentDate,
        rollingAvg: Math.round((windowValues.reduce((s, v) => s + v, 0) / windowValues.length) * 100) / 100,
      });
    }
  }

  return result;
}

// ============================================================
// Weekly Trend Coaching — compare this week vs last week
// ============================================================

/** Inverse metrics: lower is better */
const TREND_INVERSE = new Set(['jitterMax', 'shimmerMax', 'f0StdMax', 'f0DeviationMax', 'maxBreaks', 'rmsCVMax']);

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface WeeklyTrendItem {
  metric: string;
  direction: TrendDirection;
  /** Percentage change (positive = improvement) */
  changePercent: number;
}

/**
 * Compare a specific exercise's metrics between the most recent 7 days
 * and the previous 7 days. Returns per-metric trend items.
 */
export function getWeeklyTrendCoaching(
  history: SessionRecord[],
  exerciseId: ExerciseId,
): WeeklyTrendItem[] {
  const thisWeekCutoff = daysAgoString(7);
  const lastWeekCutoff = daysAgoString(14);

  const thisWeek: SessionRecord[] = [];
  const lastWeek: SessionRecord[] = [];

  for (const s of history) {
    if (s.exerciseId !== exerciseId) continue;
    const d = s.timestamp.slice(0, 10);
    if (d >= thisWeekCutoff) {
      thisWeek.push(s);
    } else if (d >= lastWeekCutoff) {
      lastWeek.push(s);
    }
  }

  if (thisWeek.length === 0 || lastWeek.length === 0) return [];

  function avgByCriterion(sessions: SessionRecord[]): Map<string, number> {
    const accum = new Map<string, { sum: number; count: number }>();
    for (const s of sessions) {
      for (const cr of s.criterionResults) {
        const entry = accum.get(cr.name) ?? { sum: 0, count: 0 };
        entry.sum += cr.actual;
        entry.count++;
        accum.set(cr.name, entry);
      }
    }
    const avg = new Map<string, number>();
    for (const [name, { sum, count }] of accum) {
      avg.set(name, sum / count);
    }
    return avg;
  }

  const thisAvg = avgByCriterion(thisWeek);
  const lastAvg = avgByCriterion(lastWeek);

  const items: WeeklyTrendItem[] = [];

  for (const [metric, thisVal] of thisAvg) {
    const lastVal = lastAvg.get(metric);
    if (lastVal === undefined || Math.abs(lastVal) < 0.0001) continue;

    const rawChange = ((thisVal - lastVal) / Math.abs(lastVal)) * 100;
    const isInverse = TREND_INVERSE.has(metric);
    const changePercent = isInverse ? -rawChange : rawChange;

    let direction: TrendDirection;
    if (Math.abs(changePercent) < 5) {
      direction = 'stable';
    } else if (changePercent > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    items.push({ metric, direction, changePercent: Math.round(changePercent) });
  }

  const order: Record<TrendDirection, number> = { improving: 0, stable: 1, declining: 2 };
  items.sort((a, b) => order[a.direction] - order[b.direction]);

  return items;
}
