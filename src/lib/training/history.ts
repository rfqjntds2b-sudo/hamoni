// ============================================================
// Training Feature — Session History (localStorage)
// ============================================================
// Stores up to 100 session records in FIFO order (newest first).

import type { ExerciseId, SessionRecord } from './types';
import { getItem, setItem } from './storage';
import { syncTrainingSession } from './sync';

// ============================================================
// Constants
// ============================================================

const HISTORY_KEY = 'hamoni:trainingHistory';
const MAX_HISTORY = 100;

// ============================================================
// getTrainingHistory
// ============================================================

/**
 * Read all session records from localStorage.
 * Returns empty array if missing or corrupt.
 * Records are ordered newest-first.
 */
export function getTrainingHistory(): SessionRecord[] {
  try {
    const raw = getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw) as SessionRecord[];
    }
  } catch {
    // Corrupt data — fall through
  }
  return [];
}

// ============================================================
// addSession
// ============================================================

/**
 * Add a session record to the front of the history.
 * If the history exceeds 100 records, the oldest is removed (FIFO).
 */
export function addSession(record: SessionRecord): void {
  const history = getTrainingHistory();

  // Insert at front (newest first)
  history.unshift(record);

  // Cap at MAX_HISTORY
  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }

  try {
    setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Storage full or unavailable
  }

  // Fire-and-forget sync to Supabase
  syncTrainingSession(record);
}

// ============================================================
// getRecentSessions
// ============================================================

/**
 * Get the most recent sessions for a specific exercise.
 * Returns up to `count` records, filtered by exerciseId.
 */
export function getRecentSessions(
  exerciseId: ExerciseId,
  count = 10,
): SessionRecord[] {
  const history = getTrainingHistory();
  return history.filter((r) => r.exerciseId === exerciseId).slice(0, count);
}
