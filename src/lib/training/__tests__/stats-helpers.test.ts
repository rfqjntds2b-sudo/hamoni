import { describe, it, expect } from 'vitest';
import {
  computePassRate,
  computeCategoryLevels,
  computePracticeSummary,
  computeExerciseStats,
  computeExerciseMetricTimeline,
  computePassRateTrend,
  computeLevelTimeline,
  computeXPCurve,
  computeGrowthHighlights,
  computeRolling7DayAvg,
  computeExerciseRolling7DayAvg,
  getWeeklyTrendCoaching,
} from '../stats-helpers';
import type { TrainingProgress, SessionRecord, ExerciseId, DailyActivityLog } from '../types';
import { EXERCISE_IDS } from '../exercises';

// ============================================================
// Helpers
// ============================================================

function makeProgress(overrides: Partial<Record<ExerciseId, Partial<TrainingProgress['exercises'][ExerciseId]>>> = {}): TrainingProgress {
  const exercises = {} as TrainingProgress['exercises'];
  for (const id of EXERCISE_IDS) {
    exercises[id] = {
      currentLevel: 1,
      bestLevel: 1,
      totalAttempts: 0,
      totalPasses: 0,
      consecutivePasses: 0,
      consecutiveFails: 0,
      lastPracticed: null,
      personalBests: {},
      ...overrides[id],
    };
  }
  return {
    exercises,
    dailyRoutine: { streak: 5, bestStreak: 10, lastCompleted: null, restDays: [], restDaysUsed: 0, shieldCount: 0, shieldsAwarded: [], comebackBonusAvailable: false },
    totalXP: 1234,
    dailyXP: 0,
  };
}

function makeSession(id: ExerciseId, passed: boolean, criteria: { name: string; actual: number }[] = []): SessionRecord {
  return {
    exerciseId: id,
    level: 1,
    passed,
    criterionResults: criteria.map(c => ({ ...c, target: 0, unit: '', passed })),
    xpEarned: passed ? 20 : 4,
    duration: 30,
    timestamp: new Date().toISOString(),
  };
}

/** Create a session with a specific date, level, and per-criterion targets/pass status */
function makeDatedSession(
  id: ExerciseId,
  date: string,
  passed: boolean,
  opts: {
    level?: number;
    criteria?: { name: string; actual: number; target: number; unit: string; passed: boolean }[];
    xpEarned?: number;
  } = {},
): SessionRecord {
  return {
    exerciseId: id,
    level: opts.level ?? 1,
    passed,
    criterionResults: opts.criteria ?? [],
    xpEarned: opts.xpEarned ?? (passed ? 20 : 4),
    duration: 30,
    timestamp: `${date}T12:00:00.000Z`,
  };
}

/** Helper: returns a date string N days before today */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const emptyActivity: DailyActivityLog = { days: [] };

// ============================================================
// Tests
// ============================================================

describe('computePassRate', () => {
  it('returns 0 for empty history', () => {
    expect(computePassRate([])).toEqual({ passed: 0, total: 0, rate: 0 });
  });

  it('calculates overall rate', () => {
    const history = [
      makeSession('humming', true),
      makeSession('humming', false),
      makeSession('straw', true),
      makeSession('straw', true),
    ];
    expect(computePassRate(history)).toEqual({ passed: 3, total: 4, rate: 75 });
  });

  it('filters by exerciseId', () => {
    const history = [
      makeSession('humming', true),
      makeSession('humming', false),
      makeSession('straw', true),
    ];
    expect(computePassRate(history, 'humming')).toEqual({ passed: 1, total: 2, rate: 50 });
  });
});

describe('computeCategoryLevels', () => {
  it('returns averages per category', () => {
    const progress = makeProgress({
      breathing: { currentLevel: 3 },
      humming: { currentLevel: 5 },
      lip_trill: { currentLevel: 2 },
    });
    const levels = computeCategoryLevels(progress);
    const warmup = levels.find(l => l.category === 'warmup');
    expect(warmup).toBeDefined();
    expect(warmup!.avgLevel).toBeGreaterThan(1);
    expect(warmup!.maxLevel).toBe(5);
  });

  it('returns 4 categories', () => {
    const levels = computeCategoryLevels(makeProgress());
    expect(levels).toHaveLength(4);
  });
});

describe('computePracticeSummary', () => {
  it('returns zeros for empty data', () => {
    const summary = computePracticeSummary(makeProgress(), emptyActivity, []);
    expect(summary.totalMinutes).toBe(0);
    expect(summary.totalSessions).toBe(0);
    expect(summary.overallPassRate).toBe(0);
  });

  it('counts max level exercises', () => {
    const progress = makeProgress({
      humming: { currentLevel: 10, totalAttempts: 10 },
      straw: { currentLevel: 10, totalAttempts: 8 },
    });
    const summary = computePracticeSummary(progress, emptyActivity, []);
    expect(summary.maxLevelExercises).toBe(2);
  });

  it('finds most practiced exercise', () => {
    const progress = makeProgress({
      humming: { totalAttempts: 20 },
      straw: { totalAttempts: 5 },
    });
    const summary = computePracticeSummary(progress, emptyActivity, []);
    expect(summary.mostPracticed?.id).toBe('humming');
    expect(summary.mostPracticed?.count).toBe(20);
  });
});

describe('computeExerciseStats', () => {
  it('returns stats for all 22 exercises', () => {
    const stats = computeExerciseStats(makeProgress(), []);
    expect(stats).toHaveLength(22);
  });

  it('includes pass rate from history', () => {
    const history = [
      makeSession('humming', true),
      makeSession('humming', true),
      makeSession('humming', false),
    ];
    const stats = computeExerciseStats(makeProgress(), history);
    const humming = stats.find(s => s.id === 'humming');
    expect(humming?.passRate).toBe(67);
  });
});

// ============================================================
// computeExerciseMetricTimeline
// ============================================================

describe('computeExerciseMetricTimeline', () => {
  it('returns empty array for no matching sessions', () => {
    const result = computeExerciseMetricTimeline([], 'humming', 'jitterMax');
    expect(result).toEqual([]);
  });

  it('filters by exerciseId and criterionName', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', '2026-03-20', true, {
        criteria: [
          { name: 'jitterMax', actual: 0.5, target: 1.0, unit: '%', passed: true },
          { name: 'shimmerMax', actual: 2.0, target: 3.0, unit: '%', passed: true },
        ],
      }),
      makeDatedSession('straw', '2026-03-21', true, {
        criteria: [
          { name: 'jitterMax', actual: 0.8, target: 1.0, unit: '%', passed: true },
        ],
      }),
      makeDatedSession('humming', '2026-03-22', false, {
        criteria: [
          { name: 'jitterMax', actual: 1.5, target: 1.0, unit: '%', passed: false },
        ],
      }),
    ];

    const result = computeExerciseMetricTimeline(history, 'humming', 'jitterMax');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2026-03-20', actual: 0.5, target: 1.0, passed: true });
    expect(result[1]).toEqual({ date: '2026-03-22', actual: 1.5, target: 1.0, passed: false });
  });

  it('skips sessions without matching criterion', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', '2026-03-20', true, {
        criteria: [{ name: 'shimmerMax', actual: 2.0, target: 3.0, unit: '%', passed: true }],
      }),
      makeDatedSession('humming', '2026-03-21', true, {
        criteria: [{ name: 'jitterMax', actual: 0.5, target: 1.0, unit: '%', passed: true }],
      }),
    ];

    const result = computeExerciseMetricTimeline(history, 'humming', 'jitterMax');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-03-21');
  });

  it('returns results sorted by date ascending', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', '2026-03-25', true, {
        criteria: [{ name: 'hnrMin', actual: 20, target: 15, unit: 'dB', passed: true }],
      }),
      makeDatedSession('humming', '2026-03-20', true, {
        criteria: [{ name: 'hnrMin', actual: 15, target: 15, unit: 'dB', passed: true }],
      }),
    ];

    const result = computeExerciseMetricTimeline(history, 'humming', 'hnrMin');
    expect(result[0].date).toBe('2026-03-20');
    expect(result[1].date).toBe('2026-03-25');
  });
});

// ============================================================
// computePassRateTrend
// ============================================================

describe('computePassRateTrend', () => {
  it('returns empty array for no sessions', () => {
    expect(computePassRateTrend([], 30)).toEqual([]);
  });

  it('computes daily pass rates within window', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(2), true),
      makeDatedSession('humming', daysAgo(2), true),
      makeDatedSession('straw', daysAgo(2), false),
      makeDatedSession('humming', daysAgo(1), true),
      makeDatedSession('straw', daysAgo(1), false),
    ];

    const result = computePassRateTrend(history, 7);
    expect(result).toHaveLength(2);
    // Day -2: 2 passed / 3 total = 67%
    // Day -1: 1 passed / 2 total = 50%
    // SMA: first point = 67, second = (67+50)/2 = 59 (rounded)
    expect(result[0].rate).toBe(67);
    expect(result[1].rate).toBe(59);
  });

  it('excludes sessions outside the window', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(40), true),
      makeDatedSession('humming', daysAgo(1), false),
    ];

    const result = computePassRateTrend(history, 7);
    expect(result).toHaveLength(1);
    expect(result[0].rate).toBe(0); // Only the recent failed session
  });

  it('applies 3-day SMA correctly with 3+ data points', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(5), true),   // 100%
      makeDatedSession('humming', daysAgo(4), false),  // 0%
      makeDatedSession('humming', daysAgo(3), true),   // 100%
      makeDatedSession('humming', daysAgo(2), true),   // 100%
    ];

    const result = computePassRateTrend(history, 7);
    expect(result).toHaveLength(4);
    // SMA window:
    // i=0: [100] -> 100
    // i=1: [100, 0] -> 50
    // i=2: [100, 0, 100] -> 67
    // i=3: [0, 100, 100] -> 67
    expect(result[0].rate).toBe(100);
    expect(result[1].rate).toBe(50);
    expect(result[2].rate).toBe(67);
    expect(result[3].rate).toBe(67);
  });
});

// ============================================================
// computeLevelTimeline
// ============================================================

describe('computeLevelTimeline', () => {
  it('returns empty array for no matching sessions', () => {
    expect(computeLevelTimeline([], 'humming')).toEqual([]);
  });

  it('includes first entry and subsequent level changes', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', '2026-03-18', true, { level: 1 }),
      makeDatedSession('humming', '2026-03-19', true, { level: 1 }),
      makeDatedSession('humming', '2026-03-20', true, { level: 2 }),
      makeDatedSession('humming', '2026-03-21', true, { level: 2 }),
      makeDatedSession('humming', '2026-03-22', true, { level: 3 }),
    ];

    const result = computeLevelTimeline(history, 'humming');
    expect(result).toEqual([
      { date: '2026-03-18', level: 1 },
      { date: '2026-03-20', level: 2 },
      { date: '2026-03-22', level: 3 },
    ]);
  });

  it('filters by exerciseId', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', '2026-03-18', true, { level: 1 }),
      makeDatedSession('straw', '2026-03-19', true, { level: 3 }),
      makeDatedSession('humming', '2026-03-20', true, { level: 2 }),
    ];

    const result = computeLevelTimeline(history, 'humming');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2026-03-18', level: 1 });
    expect(result[1]).toEqual({ date: '2026-03-20', level: 2 });
  });

  it('handles single session', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', '2026-03-20', true, { level: 3 }),
    ];

    const result = computeLevelTimeline(history, 'humming');
    expect(result).toEqual([{ date: '2026-03-20', level: 3 }]);
  });
});

// ============================================================
// computeXPCurve
// ============================================================

describe('computeXPCurve', () => {
  it('returns empty array for no activity', () => {
    expect(computeXPCurve({ days: [] }, 500)).toEqual([]);
  });

  it('builds cumulative curve from starting XP', () => {
    const activity: DailyActivityLog = {
      days: [
        { date: '2026-03-20', exercisesCompleted: ['humming'], minutesPracticed: 5, xpEarned: 30 },
        { date: '2026-03-21', exercisesCompleted: ['straw'], minutesPracticed: 10, xpEarned: 50 },
        { date: '2026-03-22', exercisesCompleted: ['humming'], minutesPracticed: 8, xpEarned: 20 },
      ],
    };
    const totalXP = 200; // sum of activity: 30+50+20=100, so starting = 100

    const result = computeXPCurve(activity, totalXP);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: '2026-03-20', cumulative: 130 }); // 100 + 30
    expect(result[1]).toEqual({ date: '2026-03-21', cumulative: 180 }); // 130 + 50
    expect(result[2]).toEqual({ date: '2026-03-22', cumulative: 200 }); // 180 + 20
  });

  it('sorts days by date ascending even if unsorted input', () => {
    const activity: DailyActivityLog = {
      days: [
        { date: '2026-03-22', exercisesCompleted: [], minutesPracticed: 0, xpEarned: 10 },
        { date: '2026-03-20', exercisesCompleted: [], minutesPracticed: 0, xpEarned: 20 },
        { date: '2026-03-21', exercisesCompleted: [], minutesPracticed: 0, xpEarned: 30 },
      ],
    };

    const result = computeXPCurve(activity, 160); // sum=60, starting=100
    expect(result[0].date).toBe('2026-03-20');
    expect(result[1].date).toBe('2026-03-21');
    expect(result[2].date).toBe('2026-03-22');
    expect(result[2].cumulative).toBe(160);
  });

  it('handles zero xpEarned in some days', () => {
    const activity: DailyActivityLog = {
      days: [
        { date: '2026-03-20', exercisesCompleted: [], minutesPracticed: 0, xpEarned: 0 },
        { date: '2026-03-21', exercisesCompleted: [], minutesPracticed: 0, xpEarned: 50 },
      ],
    };

    const result = computeXPCurve(activity, 100); // sum=50, starting=50
    expect(result[0]).toEqual({ date: '2026-03-20', cumulative: 50 });
    expect(result[1]).toEqual({ date: '2026-03-21', cumulative: 100 });
  });
});

// ============================================================
// computeGrowthHighlights
// ============================================================

describe('computeGrowthHighlights', () => {
  it('returns empty array for insufficient data', () => {
    expect(computeGrowthHighlights([], 30)).toEqual([]);
    expect(computeGrowthHighlights([makeDatedSession('humming', daysAgo(1), true)], 30)).toEqual([]);
  });

  it('identifies improved normal metrics (higher is better)', () => {
    const history: SessionRecord[] = [
      // First half: hnr = 15
      makeDatedSession('humming', daysAgo(10), true, {
        criteria: [{ name: 'hnrMin', actual: 15, target: 12, unit: 'dB', passed: true }],
      }),
      // Second half: hnr = 20
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'hnrMin', actual: 20, target: 12, unit: 'dB', passed: true }],
      }),
    ];

    const result = computeGrowthHighlights(history, 30);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseId).toBe('humming');
    expect(result[0].metric).toBe('hnrMin');
    expect(result[0].before).toBe(15);
    expect(result[0].after).toBe(20);
    expect(result[0].changePercent).toBe(33); // (20-15)/15 * 100 = 33%
  });

  it('inverts sign for inverse metrics (jitterMax, shimmerMax)', () => {
    const history: SessionRecord[] = [
      // First half: jitter = 2.0
      makeDatedSession('humming', daysAgo(10), false, {
        criteria: [{ name: 'jitterMax', actual: 2.0, target: 1.0, unit: '%', passed: false }],
      }),
      // Second half: jitter = 1.0 (improved — went down)
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'jitterMax', actual: 1.0, target: 1.0, unit: '%', passed: true }],
      }),
    ];

    const result = computeGrowthHighlights(history, 30);
    expect(result).toHaveLength(1);
    expect(result[0].metric).toBe('jitterMax');
    // Raw change: (1.0 - 2.0)/2.0 = -50%, inverted = +50%
    expect(result[0].changePercent).toBe(50);
  });

  it('excludes worsened metrics', () => {
    const history: SessionRecord[] = [
      // First half: hnr = 20 (good)
      makeDatedSession('humming', daysAgo(10), true, {
        criteria: [{ name: 'hnrMin', actual: 20, target: 12, unit: 'dB', passed: true }],
      }),
      // Second half: hnr = 15 (worse)
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'hnrMin', actual: 15, target: 12, unit: 'dB', passed: true }],
      }),
    ];

    const result = computeGrowthHighlights(history, 30);
    expect(result).toHaveLength(0); // hnr went down = not an improvement
  });

  it('returns top 3 highlights sorted by improvement', () => {
    const history: SessionRecord[] = [
      // First half
      makeDatedSession('humming', daysAgo(10), true, {
        criteria: [
          { name: 'hnrMin', actual: 10, target: 12, unit: 'dB', passed: false },
          { name: 'jitterMax', actual: 3.0, target: 1.5, unit: '%', passed: false },
        ],
      }),
      makeDatedSession('straw', daysAgo(10), true, {
        criteria: [
          { name: 'shimmerMax', actual: 6.0, target: 3.0, unit: '%', passed: false },
        ],
      }),
      makeDatedSession('lip_trill', daysAgo(10), true, {
        criteria: [
          { name: 'hnrMin', actual: 8, target: 12, unit: 'dB', passed: false },
        ],
      }),
      // Second half
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [
          { name: 'hnrMin', actual: 20, target: 12, unit: 'dB', passed: true },     // +100%
          { name: 'jitterMax', actual: 1.0, target: 1.5, unit: '%', passed: true },  // inverted: +67%
        ],
      }),
      makeDatedSession('straw', daysAgo(2), true, {
        criteria: [
          { name: 'shimmerMax', actual: 2.0, target: 3.0, unit: '%', passed: true }, // inverted: +67%
        ],
      }),
      makeDatedSession('lip_trill', daysAgo(2), true, {
        criteria: [
          { name: 'hnrMin', actual: 20, target: 12, unit: 'dB', passed: true },     // +150%
        ],
      }),
    ];

    const result = computeGrowthHighlights(history, 30);
    expect(result).toHaveLength(3);
    // Top 3 by changePercent: lip_trill hnrMin +150%, humming hnrMin +100%, then jitterMax or shimmerMax +67%
    expect(result[0].changePercent).toBe(150);
    expect(result[0].exerciseId).toBe('lip_trill');
    expect(result[1].changePercent).toBe(100);
    expect(result[1].exerciseId).toBe('humming');
    expect(result[2].changePercent).toBe(67);
  });

  it('excludes sessions outside the period window', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(60), true, {
        criteria: [{ name: 'hnrMin', actual: 10, target: 12, unit: 'dB', passed: false }],
      }),
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'hnrMin', actual: 20, target: 12, unit: 'dB', passed: true }],
      }),
    ];

    // 7-day window: only the recent session is within range, so < 2 sessions in period
    const result = computeGrowthHighlights(history, 7);
    expect(result).toHaveLength(0);
  });
});

// ============================================================
// computeRolling7DayAvg
// ============================================================

describe('computeRolling7DayAvg', () => {
  it('returns empty array for empty history', () => {
    expect(computeRolling7DayAvg([], 30)).toEqual([]);
  });

  it('returns single-day rolling avg equal to daily avg', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [
          { name: 'jitterMax', actual: 1.0, target: 1.5, unit: '%', passed: true },
          { name: 'shimmerMax', actual: 3.0, target: 4.0, unit: '%', passed: true },
          { name: 'hnrMin', actual: 18, target: 12, unit: 'dB', passed: true },
        ],
      }),
    ];

    const result = computeRolling7DayAvg(history, 7);
    expect(result).toHaveLength(1);
    expect(result[0].jitter).toBe(1.0);
    expect(result[0].shimmer).toBe(3.0);
    expect(result[0].hnr).toBe(18);
  });

  it('computes correct rolling avg across multiple days within 7-day window', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(3), true, {
        criteria: [{ name: 'jitterMax', actual: 2.0, target: 1.5, unit: '%', passed: false }],
      }),
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'jitterMax', actual: 1.0, target: 1.5, unit: '%', passed: true }],
      }),
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [{ name: 'jitterMax', actual: 0.5, target: 1.5, unit: '%', passed: true }],
      }),
    ];

    const result = computeRolling7DayAvg(history, 7);
    expect(result).toHaveLength(3);

    // Day 1 (daysAgo(3)): only itself -> 2.0
    expect(result[0].jitter).toBe(2.0);
    // Day 2 (daysAgo(2)): avg(2.0, 1.0) = 1.5
    expect(result[1].jitter).toBe(1.5);
    // Day 3 (daysAgo(1)): avg(2.0, 1.0, 0.5) = 1.17
    expect(result[2].jitter).toBe(1.17);
  });

  it('skips days with no sessions (null metrics excluded from window)', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(5), true, {
        criteria: [{ name: 'hnrMin', actual: 15, target: 12, unit: 'dB', passed: true }],
      }),
      // No sessions for daysAgo(4), daysAgo(3), daysAgo(2)
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [{ name: 'hnrMin', actual: 20, target: 12, unit: 'dB', passed: true }],
      }),
    ];

    const result = computeRolling7DayAvg(history, 7);
    expect(result).toHaveLength(2);
    // First point: only itself -> 15
    expect(result[0].hnr).toBe(15);
    // Second point: avg(15, 20) = 17.5 (both within 7-day window)
    expect(result[1].hnr).toBe(17.5);
  });

  it('excludes sessions outside the period window', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(40), true, {
        criteria: [{ name: 'jitterMax', actual: 5.0, target: 1.5, unit: '%', passed: false }],
      }),
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [{ name: 'jitterMax', actual: 1.0, target: 1.5, unit: '%', passed: true }],
      }),
    ];

    const result = computeRolling7DayAvg(history, 7);
    expect(result).toHaveLength(1);
    expect(result[0].jitter).toBe(1.0);
  });

  it('handles multiple sessions on the same day', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [{ name: 'jitterMax', actual: 1.0, target: 1.5, unit: '%', passed: true }],
      }),
      makeDatedSession('straw', daysAgo(1), true, {
        criteria: [{ name: 'jitterMax', actual: 3.0, target: 2.0, unit: '%', passed: false }],
      }),
    ];

    const result = computeRolling7DayAvg(history, 7);
    expect(result).toHaveLength(1);
    // Daily avg: (1.0 + 3.0) / 2 = 2.0
    expect(result[0].jitter).toBe(2.0);
  });
});

// ============================================================
// computeExerciseRolling7DayAvg
// ============================================================

describe('computeExerciseRolling7DayAvg', () => {
  it('returns empty array for empty history', () => {
    expect(computeExerciseRolling7DayAvg([], 'humming', 'jitterMax', 30)).toEqual([]);
  });

  it('filters by exerciseId', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'jitterMax', actual: 1.0, target: 1.5, unit: '%', passed: true }],
      }),
      makeDatedSession('straw', daysAgo(2), true, {
        criteria: [{ name: 'jitterMax', actual: 5.0, target: 1.5, unit: '%', passed: false }],
      }),
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [{ name: 'jitterMax', actual: 0.8, target: 1.5, unit: '%', passed: true }],
      }),
    ];

    const result = computeExerciseRolling7DayAvg(history, 'humming', 'jitterMax', 7);
    expect(result).toHaveLength(2);
    // Day 1 (daysAgo(2)): only humming 1.0
    expect(result[0].rollingAvg).toBe(1.0);
    // Day 2 (daysAgo(1)): avg(1.0, 0.8) = 0.9
    expect(result[1].rollingAvg).toBe(0.9);
  });

  it('filters by criterionName', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [
          { name: 'jitterMax', actual: 1.0, target: 1.5, unit: '%', passed: true },
          { name: 'shimmerMax', actual: 3.0, target: 4.0, unit: '%', passed: true },
        ],
      }),
    ];

    const jitterResult = computeExerciseRolling7DayAvg(history, 'humming', 'jitterMax', 7);
    expect(jitterResult).toHaveLength(1);
    expect(jitterResult[0].rollingAvg).toBe(1.0);

    const shimmerResult = computeExerciseRolling7DayAvg(history, 'humming', 'shimmerMax', 7);
    expect(shimmerResult).toHaveLength(1);
    expect(shimmerResult[0].rollingAvg).toBe(3.0);
  });

  it('computes rolling avg across multiple days', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(4), true, {
        criteria: [{ name: 'hnrMin', actual: 10, target: 12, unit: 'dB', passed: false }],
      }),
      makeDatedSession('humming', daysAgo(3), true, {
        criteria: [{ name: 'hnrMin', actual: 14, target: 12, unit: 'dB', passed: true }],
      }),
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'hnrMin', actual: 18, target: 12, unit: 'dB', passed: true }],
      }),
    ];

    const result = computeExerciseRolling7DayAvg(history, 'humming', 'hnrMin', 7);
    expect(result).toHaveLength(3);
    expect(result[0].rollingAvg).toBe(10);
    expect(result[1].rollingAvg).toBe(12); // avg(10, 14)
    expect(result[2].rollingAvg).toBe(14); // avg(10, 14, 18)
  });

  it('excludes sessions outside the period boundary', () => {
    const history: SessionRecord[] = [
      makeDatedSession('humming', daysAgo(20), true, {
        criteria: [{ name: 'jitterMax', actual: 5.0, target: 1.5, unit: '%', passed: false }],
      }),
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [{ name: 'jitterMax', actual: 0.8, target: 1.5, unit: '%', passed: true }],
      }),
    ];

    const result = computeExerciseRolling7DayAvg(history, 'humming', 'jitterMax', 7);
    expect(result).toHaveLength(1);
    expect(result[0].rollingAvg).toBe(0.8);
  });
});

// ============================================================
// getWeeklyTrendCoaching
// ============================================================

describe('getWeeklyTrendCoaching', () => {
  it('returns empty when no sessions in either week', () => {
    expect(getWeeklyTrendCoaching([], 'humming')).toEqual([]);
  });

  it('returns empty when only this week has sessions', () => {
    const history = [
      makeDatedSession('humming', daysAgo(1), true, {
        criteria: [{ name: 'jitterMax', actual: 1.0, target: 2.0, unit: '%', passed: true }],
      }),
    ];
    expect(getWeeklyTrendCoaching(history, 'humming')).toEqual([]);
  });

  it('detects improvement for inverse metrics (jitter decreased)', () => {
    const history = [
      // Last week: jitter 3.0
      makeDatedSession('humming', daysAgo(10), true, {
        criteria: [{ name: 'jitterMax', actual: 3.0, target: 2.0, unit: '%', passed: false }],
      }),
      // This week: jitter 1.5 (50% decrease = improvement)
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'jitterMax', actual: 1.5, target: 2.0, unit: '%', passed: true }],
      }),
    ];
    const items = getWeeklyTrendCoaching(history, 'humming');
    expect(items.length).toBe(1);
    expect(items[0].direction).toBe('improving');
    expect(items[0].changePercent).toBe(50); // 50% improvement
  });

  it('detects improvement for normal metrics (HNR increased)', () => {
    const history = [
      makeDatedSession('humming', daysAgo(10), true, {
        criteria: [{ name: 'hnrMin', actual: 10, target: 15, unit: 'dB', passed: false }],
      }),
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'hnrMin', actual: 15, target: 15, unit: 'dB', passed: true }],
      }),
    ];
    const items = getWeeklyTrendCoaching(history, 'humming');
    expect(items.length).toBe(1);
    expect(items[0].direction).toBe('improving');
    expect(items[0].changePercent).toBe(50); // 50% increase
  });

  it('returns stable for small changes (<5%)', () => {
    const history = [
      makeDatedSession('humming', daysAgo(10), true, {
        criteria: [{ name: 'hnrMin', actual: 20, target: 15, unit: 'dB', passed: true }],
      }),
      makeDatedSession('humming', daysAgo(2), true, {
        criteria: [{ name: 'hnrMin', actual: 20.5, target: 15, unit: 'dB', passed: true }],
      }),
    ];
    const items = getWeeklyTrendCoaching(history, 'humming');
    expect(items.length).toBe(1);
    expect(items[0].direction).toBe('stable');
  });

  it('ignores sessions from other exercises', () => {
    const history = [
      makeDatedSession('straw', daysAgo(10), true, {
        criteria: [{ name: 'jitterMax', actual: 3.0, target: 2.0, unit: '%', passed: false }],
      }),
      makeDatedSession('straw', daysAgo(2), true, {
        criteria: [{ name: 'jitterMax', actual: 1.0, target: 2.0, unit: '%', passed: true }],
      }),
    ];
    expect(getWeeklyTrendCoaching(history, 'humming')).toEqual([]);
  });
});
