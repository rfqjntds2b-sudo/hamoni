import { describe, it, expect } from 'vitest';
import type { SessionRecord, ExerciseId } from '../types';
import { analyzePatterns } from '../pattern-analyzer';

// ============================================================
// Helper: Generate mock sessions
// ============================================================

function createSession(
  overrides: Partial<SessionRecord> & { timestamp: string },
): SessionRecord {
  return {
    exerciseId: 'humming' as ExerciseId,
    level: 1,
    passed: false,
    criterionResults: [],
    xpEarned: 10,
    duration: 30,
    ...overrides,
  };
}

/**
 * Generate N sessions spread across dates.
 * By default all fail, timestamps on Mondays at 10am.
 */
function generateSessions(
  count: number,
  overrides?: Partial<SessionRecord>,
): SessionRecord[] {
  const sessions: SessionRecord[] = [];
  const baseDate = new Date('2026-01-05T10:00:00.000Z'); // Monday

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    sessions.push(
      createSession({
        timestamp: date.toISOString(),
        ...overrides,
      }),
    );
  }

  return sessions;
}

// ============================================================
// Tests
// ============================================================

describe('analyzePatterns', () => {
  // ----------------------------------------------------------
  // 1. Returns empty patterns for < 15 sessions
  // ----------------------------------------------------------
  it('returns empty patterns for fewer than 15 sessions', () => {
    const sessions = generateSessions(10);
    const result = analyzePatterns(sessions);
    expect(result.patterns).toHaveLength(0);
    expect(result.sessionCount).toBe(10);
  });

  it('returns sessionCount even with empty input', () => {
    const result = analyzePatterns([]);
    expect(result.patterns).toHaveLength(0);
    expect(result.sessionCount).toBe(0);
  });

  // ----------------------------------------------------------
  // 2. Detects day-of-week pattern
  // ----------------------------------------------------------
  it('detects day-of-week pattern when one day has clearly higher pass rate', () => {
    // Create 15+ sessions: Wednesdays always pass, other days always fail
    const sessions: SessionRecord[] = [];
    const base = new Date('2026-01-01T10:00:00.000Z'); // Thursday

    // Add sessions on different days that fail
    for (let week = 0; week < 4; week++) {
      // Monday (fail)
      const mon = new Date(base);
      mon.setDate(base.getDate() + week * 7 - 3); // Thursday -3 = Monday
      sessions.push(createSession({ timestamp: mon.toISOString(), passed: false }));

      // Tuesday (fail)
      const tue = new Date(base);
      tue.setDate(base.getDate() + week * 7 - 2);
      sessions.push(createSession({ timestamp: tue.toISOString(), passed: false }));

      // Wednesday (pass!) — day index 3
      const wed = new Date(base);
      wed.setDate(base.getDate() + week * 7 - 1);
      sessions.push(createSession({ timestamp: wed.toISOString(), passed: true }));

      // Thursday (fail)
      const thu = new Date(base);
      thu.setDate(base.getDate() + week * 7);
      sessions.push(createSession({ timestamp: thu.toISOString(), passed: false }));
    }

    expect(sessions.length).toBeGreaterThanOrEqual(15);

    const result = analyzePatterns(sessions);
    const dayPattern = result.patterns.find((p) => p.type === 'day_of_week');

    expect(dayPattern).toBeDefined();
    expect(dayPattern!.confidence).toBeGreaterThanOrEqual(0.15);
    expect(dayPattern!.detail).toMatch(/^best_day:3:/); // Wednesday = index 3
    expect(dayPattern!.description.ko).toContain('수요일');
    expect(dayPattern!.description.en).toContain('Wednesday');
    expect(dayPattern!.description.ja).toContain('水曜日');
  });

  // ----------------------------------------------------------
  // 3. Detects time-of-day pattern
  // ----------------------------------------------------------
  it('detects time-of-day pattern when morning sessions have higher pass rate', () => {
    const sessions: SessionRecord[] = [];

    // Morning sessions (6am) — all pass
    for (let i = 0; i < 8; i++) {
      const date = new Date('2026-01-05T06:00:00.000Z');
      date.setDate(date.getDate() + i);
      sessions.push(createSession({ timestamp: date.toISOString(), passed: true }));
    }

    // Evening sessions (20:00) — all fail
    for (let i = 0; i < 8; i++) {
      const date = new Date('2026-01-05T20:00:00.000Z');
      date.setDate(date.getDate() + i);
      sessions.push(createSession({ timestamp: date.toISOString(), passed: false }));
    }

    expect(sessions.length).toBeGreaterThanOrEqual(15);

    const result = analyzePatterns(sessions);
    const timePattern = result.patterns.find((p) => p.type === 'time_of_day');

    expect(timePattern).toBeDefined();
    expect(timePattern!.confidence).toBeGreaterThanOrEqual(0.15);
    expect(timePattern!.detail).toMatch(/^time:morning:/);
    expect(timePattern!.description.ko).toContain('오전');
    expect(timePattern!.description.en).toContain('morning');
    expect(timePattern!.description.ja).toContain('午前');
  });

  // ----------------------------------------------------------
  // 4. Doesn't create patterns when data is evenly distributed
  // ----------------------------------------------------------
  it('does not detect patterns when data is evenly distributed', () => {
    // Create 21 sessions: 3 per day of week, all with 50% pass rate
    const sessions: SessionRecord[] = [];
    const base = new Date('2026-01-04T14:00:00.000Z'); // Sunday

    for (let day = 0; day < 7; day++) {
      for (let j = 0; j < 3; j++) {
        const date = new Date(base);
        date.setDate(base.getDate() + day + j * 7);
        sessions.push(
          createSession({
            timestamp: date.toISOString(),
            // Alternate pass/fail per session within each day to make rates ~33-66%
            passed: j === 0,
          }),
        );
      }
    }

    expect(sessions.length).toBe(21);

    const result = analyzePatterns(sessions);
    // All days have the same pass rate (~33%), so no day should stand out by 20%+
    const dayPattern = result.patterns.find((p) => p.type === 'day_of_week');
    expect(dayPattern).toBeUndefined();
  });

  // ----------------------------------------------------------
  // 5. Exercise synergy detection
  // ----------------------------------------------------------
  it('detects exercise synergy when A→B sequence boosts pass rate', () => {
    const sessions: SessionRecord[] = [];

    // Create 4 days with humming→lip_trill sequences where lip_trill passes
    for (let day = 0; day < 4; day++) {
      const date = new Date('2026-01-05T10:00:00.000Z');
      date.setDate(date.getDate() + day * 2);

      // humming first (doesn't matter if it passes)
      sessions.push(
        createSession({
          exerciseId: 'humming',
          timestamp: date.toISOString(),
          passed: false,
        }),
      );

      // lip_trill after humming — PASS
      const afterDate = new Date(date);
      afterDate.setMinutes(date.getMinutes() + 5);
      sessions.push(
        createSession({
          exerciseId: 'lip_trill',
          timestamp: afterDate.toISOString(),
          passed: true,
        }),
      );
    }

    // Add standalone lip_trill sessions that fail (to lower overall rate)
    for (let i = 0; i < 8; i++) {
      const date = new Date('2026-01-20T10:00:00.000Z');
      date.setDate(date.getDate() + i);
      sessions.push(
        createSession({
          exerciseId: 'lip_trill',
          timestamp: date.toISOString(),
          passed: false,
        }),
      );
    }

    // Pad to 15+ sessions with filler
    while (sessions.length < 16) {
      const date = new Date('2026-02-01T10:00:00.000Z');
      date.setDate(date.getDate() + sessions.length);
      sessions.push(
        createSession({
          exerciseId: 'straw',
          timestamp: date.toISOString(),
          passed: false,
        }),
      );
    }

    expect(sessions.length).toBeGreaterThanOrEqual(15);

    const result = analyzePatterns(sessions);
    const synergyPattern = result.patterns.find((p) => p.type === 'exercise_synergy');

    expect(synergyPattern).toBeDefined();
    expect(synergyPattern!.confidence).toBeGreaterThanOrEqual(0.15);
    expect(synergyPattern!.detail).toMatch(/^synergy:humming:lip_trill:/);
  });

  // ----------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------
  it('patterns are sorted by confidence descending', () => {
    // Create data with both day-of-week and time-of-day patterns
    const sessions: SessionRecord[] = [];

    // Strong morning + Wednesday pattern
    for (let week = 0; week < 5; week++) {
      // Wednesday morning — pass
      const wed = new Date('2026-01-07T07:00:00.000Z'); // Wednesday
      wed.setDate(wed.getDate() + week * 7);
      sessions.push(createSession({ timestamp: wed.toISOString(), passed: true }));

      // Monday evening — fail
      const mon = new Date('2026-01-05T21:00:00.000Z'); // Monday
      mon.setDate(mon.getDate() + week * 7);
      sessions.push(createSession({ timestamp: mon.toISOString(), passed: false }));

      // Tuesday evening — fail
      const tue = new Date('2026-01-06T21:00:00.000Z');
      tue.setDate(tue.getDate() + week * 7);
      sessions.push(createSession({ timestamp: tue.toISOString(), passed: false }));
    }

    expect(sessions.length).toBeGreaterThanOrEqual(15);

    const result = analyzePatterns(sessions);

    if (result.patterns.length >= 2) {
      for (let i = 1; i < result.patterns.length; i++) {
        expect(result.patterns[i - 1].confidence).toBeGreaterThanOrEqual(
          result.patterns[i].confidence,
        );
      }
    }
  });

  it('exactly 15 sessions triggers analysis', () => {
    const sessions = generateSessions(15);
    const result = analyzePatterns(sessions);
    expect(result.sessionCount).toBe(15);
    // No patterns expected (uniform data), but analysis should run
  });
});
