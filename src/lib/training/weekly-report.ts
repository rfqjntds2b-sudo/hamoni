// ============================================================
// Training Feature — Weekly Report Generator
// ============================================================
// Aggregates this week's (Mon–Sun) training data from localStorage
// and compares with the previous week to find improvements.

import { getTrainingHistory } from './history';
import { getDailyActivity, getTrainingProgress } from './progress';
import type { SessionRecord, DayActivity } from './types';

// ============================================================
// Types
// ============================================================

export interface Improvement {
  metric: string; // 'jitter' | 'shimmer' | 'hnr' | 'f0Std'
  before: number; // last week avg
  after: number;  // this week avg
  changePercent: number;
}

export interface WeeklyReport {
  weekStart: string;          // Monday YYYY-MM-DD
  weekEnd: string;            // Sunday YYYY-MM-DD
  activeDays: number;         // 0–7
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  xpEarned: number;
  levelUps: number;
  improvements: Improvement[];  // max 3
  weakPoints: string[];         // max 2
}

// ============================================================
// Helpers
// ============================================================

/** Get Monday of the week containing `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

function isInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

// ============================================================
// Metric extraction from session criteria
// ============================================================

const METRIC_CRITERION_MAP: Record<string, string> = {
  jitter: 'jitterMax',
  shimmer: 'shimmerMax',
  hnr: 'hnrMin',
  f0Std: 'f0StdMax',
};

function extractMetricAverages(sessions: SessionRecord[]): Record<string, number> {
  const sums: Record<string, { total: number; count: number }> = {};

  for (const session of sessions) {
    for (const cr of session.criterionResults) {
      const metricKey = Object.entries(METRIC_CRITERION_MAP).find(
        ([, critName]) => critName === cr.name,
      )?.[0];
      if (metricKey) {
        if (!sums[metricKey]) sums[metricKey] = { total: 0, count: 0 };
        sums[metricKey].total += cr.actual;
        sums[metricKey].count++;
      }
    }
  }

  const result: Record<string, number> = {};
  for (const [key, { total, count }] of Object.entries(sums)) {
    result[key] = total / count;
  }
  return result;
}

// ============================================================
// generateWeeklyReport
// ============================================================

export function generateWeeklyReport(): WeeklyReport {
  const now = new Date();
  const monday = getMonday(now);
  const sunday = getSunday(monday);
  const weekStart = formatDate(monday);
  const weekEnd = formatDate(sunday);

  // Previous week range
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevSunday.getDate() + 6);
  const prevWeekStart = formatDate(prevMonday);
  const prevWeekEnd = formatDate(prevSunday);

  // Get data from localStorage
  const history = getTrainingHistory();
  const activity = getDailyActivity();
  const progress = getTrainingProgress();

  // Filter sessions by week
  const thisWeekSessions = history.filter((s) => {
    const dateStr = s.timestamp.slice(0, 10);
    return isInRange(dateStr, weekStart, weekEnd);
  });

  const prevWeekSessions = history.filter((s) => {
    const dateStr = s.timestamp.slice(0, 10);
    return isInRange(dateStr, prevWeekStart, prevWeekEnd);
  });

  // Filter daily activity by week
  const thisWeekActivity = activity.days.filter((d) =>
    isInRange(d.date, weekStart, weekEnd),
  );

  // Active days
  const activeDays = thisWeekActivity.filter(
    (d) => d.exercisesCompleted.length > 0 || d.minutesPracticed > 0,
  ).length;

  // Total sessions
  const totalSessions = thisWeekSessions.length;

  // Total minutes
  const totalMinutes = Math.round(
    thisWeekActivity.reduce((sum, d) => sum + d.minutesPracticed, 0),
  );

  // XP earned this week
  const xpEarned = thisWeekActivity.reduce((sum, d) => sum + d.xpEarned, 0);

  // Level ups this week (sessions where level increased — detected by isLevelUp not stored,
  // so count sessions that passed where the next session for the same exercise has a higher level)
  const levelUps = countLevelUps(thisWeekSessions);

  // Improvements: compare metric averages between weeks
  const improvements = computeImprovements(thisWeekSessions, prevWeekSessions);

  // Weak points: metrics with worst performance this week (highest jitter/shimmer/f0Std or lowest hnr)
  const weakPoints = findWeakPoints(thisWeekSessions);

  return {
    weekStart,
    weekEnd,
    activeDays,
    totalSessions,
    totalMinutes,
    currentStreak: progress.dailyRoutine.streak,
    xpEarned,
    levelUps,
    improvements,
    weakPoints,
  };
}

// ============================================================
// countLevelUps
// ============================================================

function countLevelUps(sessions: SessionRecord[]): number {
  // Group sessions by exerciseId, ordered by timestamp
  const byExercise: Record<string, SessionRecord[]> = {};
  for (const s of sessions) {
    if (!byExercise[s.exerciseId]) byExercise[s.exerciseId] = [];
    byExercise[s.exerciseId].push(s);
  }

  let count = 0;
  for (const exerciseSessions of Object.values(byExercise)) {
    // Sort chronologically
    const sorted = [...exerciseSessions].sort(
      (a, b) => a.timestamp.localeCompare(b.timestamp),
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].level > sorted[i - 1].level) {
        count++;
      }
    }
  }
  return count;
}

// ============================================================
// computeImprovements
// ============================================================

function computeImprovements(
  thisWeek: SessionRecord[],
  prevWeek: SessionRecord[],
): Improvement[] {
  if (thisWeek.length === 0 || prevWeek.length === 0) return [];

  const thisAvg = extractMetricAverages(thisWeek);
  const prevAvg = extractMetricAverages(prevWeek);

  const improvements: Improvement[] = [];

  for (const metric of Object.keys(METRIC_CRITERION_MAP)) {
    if (thisAvg[metric] === undefined || prevAvg[metric] === undefined) continue;
    if (prevAvg[metric] === 0) continue;

    const before = prevAvg[metric];
    const after = thisAvg[metric];

    // For jitter, shimmer, f0Std: lower is better (negative change = improvement)
    // For hnr: higher is better (positive change = improvement)
    let changePercent: number;
    let isImprovement: boolean;

    if (metric === 'hnr') {
      changePercent = ((after - before) / before) * 100;
      isImprovement = changePercent > 0;
    } else {
      changePercent = ((before - after) / before) * 100;
      isImprovement = changePercent > 0;
    }

    if (isImprovement) {
      improvements.push({
        metric,
        before: Math.round(before * 100) / 100,
        after: Math.round(after * 100) / 100,
        changePercent: Math.round(changePercent),
      });
    }
  }

  // Sort by biggest improvement, return top 3
  improvements.sort((a, b) => b.changePercent - a.changePercent);
  return improvements.slice(0, 3);
}

// ============================================================
// findWeakPoints
// ============================================================

const METRIC_LABELS: Record<string, string> = {
  jitter: 'Jitter',
  shimmer: 'Shimmer',
  hnr: 'HNR',
  f0Std: 'F0 안정성',
};

function findWeakPoints(sessions: SessionRecord[]): string[] {
  if (sessions.length === 0) return [];

  // Count failures per metric
  const failCounts: Record<string, number> = {};

  for (const s of sessions) {
    for (const cr of s.criterionResults) {
      const metricKey = Object.entries(METRIC_CRITERION_MAP).find(
        ([, critName]) => critName === cr.name,
      )?.[0];
      if (metricKey && !cr.passed) {
        failCounts[metricKey] = (failCounts[metricKey] ?? 0) + 1;
      }
    }
  }

  // Sort by most failures, return top 2 labels
  return Object.entries(failCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => METRIC_LABELS[key] ?? key);
}
