// ============================================================
// Rhythm Training — Daily Session Tracker
// ============================================================
// Tracks how many rhythm training sessions the user has done today.
// Uses scoped localStorage via training/storage helpers.
// Count resets at midnight (compares stored date with today).
// ============================================================

import { getItem, setItem } from '@/lib/training/storage';
import { todayString } from '@/lib/training/date-utils';
import type { RhythmDailyRecord } from './types';

const STORAGE_KEY = 'hamoni:rhythmDailyCount';

function today(): string {
  return todayString();
}

/**
 * Get the number of rhythm training sessions completed today.
 * Returns 0 if no record exists or the stored date is not today.
 */
export function getRhythmDailyCount(): number {
  const raw = getItem(STORAGE_KEY);
  if (!raw) return 0;

  try {
    const record: RhythmDailyRecord = JSON.parse(raw);
    if (record.date !== today()) return 0;
    return record.count;
  } catch {
    return 0;
  }
}

/**
 * Increment the daily rhythm training session count.
 * Resets the count if the stored date is not today.
 */
export function incrementRhythmDailyCount(): void {
  const date = today();
  const raw = getItem(STORAGE_KEY);
  let count = 0;

  if (raw) {
    try {
      const record: RhythmDailyRecord = JSON.parse(raw);
      if (record.date === date) count = record.count;
    } catch {
      /* reset */
    }
  }

  const updated: RhythmDailyRecord = { date, count: count + 1 };
  setItem(STORAGE_KEY, JSON.stringify(updated));
}
