import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWeeklyReport } from '../weekly-report';
import type { SessionRecord, DailyActivityLog, TrainingProgress } from '../types';
import { EXERCISE_IDS } from '../exercises';

// ============================================================
// Mocks
// ============================================================

// Mock storage module
vi.mock('../storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

import { getItem, setItem } from '../storage';
const mockGetItem = vi.mocked(getItem);

// ============================================================
// Helpers
// ============================================================

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    exerciseId: 'humming',
    level: 1,
    passed: true,
    criterionResults: [
      { name: 'jitterMax', target: 2, actual: 1.5, unit: '%', passed: true },
      { name: 'shimmerMax', target: 5, actual: 3.0, unit: '%', passed: true },
      { name: 'hnrMin', target: 10, actual: 15, unit: 'dB', passed: true },
    ],
    xpEarned: 20,
    duration: 30,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeDefaultProgress(): TrainingProgress {
  const exercises: Record<string, unknown> = {};
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
    };
  }
  return {
    exercises,
    dailyRoutine: {
      streak: 5,
      bestStreak: 10,
      lastCompleted: null,
      restDays: [],
      restDaysUsed: 0,
      shieldCount: 0,
      shieldsAwarded: [],
      comebackBonusAvailable: false,
    },
    totalXP: 500,
    dailyXP: 0,
  } as TrainingProgress;
}

function getThisMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function setupStorage(
  history: SessionRecord[] = [],
  activity: DailyActivityLog = { days: [] },
  progress?: TrainingProgress,
) {
  mockGetItem.mockImplementation((key: string) => {
    if (key.includes('trainingHistory')) return JSON.stringify(history);
    if (key.includes('dailyActivity')) return JSON.stringify(activity);
    if (key.includes('trainingProgress')) return JSON.stringify(progress ?? makeDefaultProgress());
    return null;
  });
}

// ============================================================
// Tests
// ============================================================

describe('generateWeeklyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty report when no data', () => {
    setupStorage();

    const report = generateWeeklyReport();

    expect(report.activeDays).toBe(0);
    expect(report.totalSessions).toBe(0);
    expect(report.totalMinutes).toBe(0);
    expect(report.xpEarned).toBe(0);
    expect(report.levelUps).toBe(0);
    expect(report.improvements).toEqual([]);
    expect(report.weakPoints).toEqual([]);
  });

  it('counts activeDays correctly for 3 active days', () => {
    const monday = getThisMonday();
    const tue = new Date(monday);
    tue.setDate(tue.getDate() + 1);
    const thu = new Date(monday);
    thu.setDate(thu.getDate() + 3);

    const activity: DailyActivityLog = {
      days: [
        { date: formatDate(monday), exercisesCompleted: ['humming'], minutesPracticed: 10, xpEarned: 20 },
        { date: formatDate(tue), exercisesCompleted: ['breathing'], minutesPracticed: 15, xpEarned: 30 },
        { date: formatDate(thu), exercisesCompleted: ['lip_trill'], minutesPracticed: 5, xpEarned: 10 },
      ],
    };

    const sessions = [
      makeSession({ timestamp: `${formatDate(monday)}T12:00:00.000Z` }),
      makeSession({ timestamp: `${formatDate(tue)}T12:00:00.000Z` }),
      makeSession({ timestamp: `${formatDate(thu)}T12:00:00.000Z` }),
    ];

    setupStorage(sessions, activity);

    const report = generateWeeklyReport();

    expect(report.activeDays).toBe(3);
    expect(report.totalSessions).toBe(3);
    expect(report.totalMinutes).toBe(30);
    expect(report.xpEarned).toBe(60);
  });

  it('computes improvements between weeks correctly', () => {
    const monday = getThisMonday();
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);

    // Last week: jitter avg 3.0
    const prevSessions = [
      makeSession({
        timestamp: `${formatDate(prevMonday)}T12:00:00.000Z`,
        criterionResults: [
          { name: 'jitterMax', target: 2, actual: 3.0, unit: '%', passed: false },
          { name: 'shimmerMax', target: 5, actual: 4.0, unit: '%', passed: true },
        ],
      }),
    ];

    // This week: jitter avg 2.0 (33% improvement)
    const thisWeekSessions = [
      makeSession({
        timestamp: `${formatDate(monday)}T12:00:00.000Z`,
        criterionResults: [
          { name: 'jitterMax', target: 2, actual: 2.0, unit: '%', passed: true },
          { name: 'shimmerMax', target: 5, actual: 3.0, unit: '%', passed: true },
        ],
      }),
    ];

    setupStorage([...thisWeekSessions, ...prevSessions]);

    const report = generateWeeklyReport();

    expect(report.improvements.length).toBeGreaterThan(0);
    const jitterImprovement = report.improvements.find((i) => i.metric === 'jitter');
    expect(jitterImprovement).toBeDefined();
    expect(jitterImprovement!.before).toBe(3);
    expect(jitterImprovement!.after).toBe(2);
    expect(jitterImprovement!.changePercent).toBe(33);
  });

  it('limits improvements to top 3', () => {
    const monday = getThisMonday();
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);

    // Create sessions with all 4 metrics improving
    const prevSessions = [
      makeSession({
        timestamp: `${formatDate(prevMonday)}T12:00:00.000Z`,
        criterionResults: [
          { name: 'jitterMax', target: 2, actual: 4.0, unit: '%', passed: false },
          { name: 'shimmerMax', target: 5, actual: 6.0, unit: '%', passed: false },
          { name: 'hnrMin', target: 15, actual: 10, unit: 'dB', passed: false },
          { name: 'f0StdMax', target: 5, actual: 8.0, unit: 'Hz', passed: false },
        ],
      }),
    ];

    const thisWeekSessions = [
      makeSession({
        timestamp: `${formatDate(monday)}T12:00:00.000Z`,
        criterionResults: [
          { name: 'jitterMax', target: 2, actual: 2.0, unit: '%', passed: true },
          { name: 'shimmerMax', target: 5, actual: 3.0, unit: '%', passed: true },
          { name: 'hnrMin', target: 15, actual: 15, unit: 'dB', passed: true },
          { name: 'f0StdMax', target: 5, actual: 4.0, unit: 'Hz', passed: true },
        ],
      }),
    ];

    setupStorage([...thisWeekSessions, ...prevSessions]);

    const report = generateWeeklyReport();

    expect(report.improvements.length).toBeLessThanOrEqual(3);
  });

  it('includes current streak from progress', () => {
    const progress = makeDefaultProgress();
    progress.dailyRoutine.streak = 12;

    setupStorage([], { days: [] }, progress);

    const report = generateWeeklyReport();
    expect(report.currentStreak).toBe(12);
  });

  it('detects weak points from failed criteria', () => {
    const monday = getThisMonday();

    const sessions = [
      makeSession({
        timestamp: `${formatDate(monday)}T12:00:00.000Z`,
        criterionResults: [
          { name: 'jitterMax', target: 2, actual: 3.5, unit: '%', passed: false },
          { name: 'hnrMin', target: 15, actual: 8, unit: 'dB', passed: false },
          { name: 'shimmerMax', target: 5, actual: 4, unit: '%', passed: true },
        ],
      }),
      makeSession({
        timestamp: `${formatDate(monday)}T12:00:00.000Z`,
        criterionResults: [
          { name: 'jitterMax', target: 2, actual: 3.0, unit: '%', passed: false },
          { name: 'hnrMin', target: 15, actual: 9, unit: 'dB', passed: false },
        ],
      }),
    ];

    setupStorage(sessions);

    const report = generateWeeklyReport();

    expect(report.weakPoints.length).toBeLessThanOrEqual(2);
    expect(report.weakPoints).toContain('Jitter');
    expect(report.weakPoints).toContain('HNR');
  });

  it('sets correct weekStart and weekEnd', () => {
    setupStorage();

    const report = generateWeeklyReport();

    // weekStart should be a Monday
    const start = new Date(report.weekStart);
    expect(start.getDay()).toBe(1); // Monday

    // weekEnd should be Sunday (start + 6)
    const end = new Date(report.weekEnd);
    expect(end.getDay()).toBe(0); // Sunday

    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(6);
  });
});
