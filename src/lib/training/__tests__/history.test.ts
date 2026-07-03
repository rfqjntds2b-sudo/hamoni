import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionRecord } from '../types';

// ============================================================
// localStorage mock
// ============================================================

const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function loadModule() {
  vi.resetModules();
  return import('../history');
}

// ============================================================
// Helper: create a SessionRecord
// ============================================================

function makeRecord(
  exerciseId: SessionRecord['exerciseId'],
  timestamp: string,
): SessionRecord {
  return {
    exerciseId,
    level: 1,
    passed: true,
    criterionResults: [],
    xpEarned: 20,
    duration: 30,
    timestamp,
  };
}

// ============================================================
// getTrainingHistory
// ============================================================

describe('getTrainingHistory', () => {
  it('empty localStorage → returns empty array', async () => {
    const { getTrainingHistory } = await loadModule();
    expect(getTrainingHistory()).toEqual([]);
  });
});

// ============================================================
// addSession
// ============================================================

describe('addSession', () => {
  it('adds record, retrievable via getTrainingHistory', async () => {
    const { addSession, getTrainingHistory } = await loadModule();
    const record = makeRecord('humming', '2026-03-22T10:00:00Z');

    addSession(record);

    const history = getTrainingHistory();
    expect(history).toHaveLength(1);
    expect(history[0].exerciseId).toBe('humming');
  });

  it('multiple records → ordered by timestamp (newest first)', async () => {
    const { addSession, getTrainingHistory } = await loadModule();

    addSession(makeRecord('humming', '2026-03-22T08:00:00Z'));
    addSession(makeRecord('lip_trill', '2026-03-22T09:00:00Z'));
    addSession(makeRecord('straw', '2026-03-22T10:00:00Z'));

    const history = getTrainingHistory();
    expect(history).toHaveLength(3);
    // Most recent first (unshifted to front)
    expect(history[0].exerciseId).toBe('straw');
    expect(history[1].exerciseId).toBe('lip_trill');
    expect(history[2].exerciseId).toBe('humming');
  });
});

// ============================================================
// getRecentSessions
// ============================================================

describe('getRecentSessions', () => {
  it('returns only matching exerciseId, max count', async () => {
    const { addSession, getRecentSessions } = await loadModule();

    addSession(makeRecord('humming', '2026-03-22T08:00:00Z'));
    addSession(makeRecord('lip_trill', '2026-03-22T08:30:00Z'));
    addSession(makeRecord('humming', '2026-03-22T09:00:00Z'));
    addSession(makeRecord('humming', '2026-03-22T09:30:00Z'));
    addSession(makeRecord('humming', '2026-03-22T10:00:00Z'));

    const recent = getRecentSessions('humming', 3);
    expect(recent).toHaveLength(3);
    expect(recent.every((r) => r.exerciseId === 'humming')).toBe(true);
    // Newest first
    expect(recent[0].timestamp).toBe('2026-03-22T10:00:00Z');
  });
});

// ============================================================
// FIFO cap at 100
// ============================================================

describe('FIFO cap', () => {
  it('adding 101st record removes oldest (cap at 100)', async () => {
    const { addSession, getTrainingHistory } = await loadModule();

    // Add 100 records
    for (let i = 0; i < 100; i++) {
      addSession(
        makeRecord('humming', `2026-03-01T${String(i).padStart(2, '0')}:00:00Z`),
      );
    }
    expect(getTrainingHistory()).toHaveLength(100);

    // Add 101st
    addSession(makeRecord('lip_trill', '2026-03-22T12:00:00Z'));

    const history = getTrainingHistory();
    expect(history).toHaveLength(100);
    // Newest should be first
    expect(history[0].exerciseId).toBe('lip_trill');
    // Oldest (the very first one added, i=0) should have been evicted
    expect(history[99].timestamp).toBe('2026-03-01T01:00:00Z');
  });
});
