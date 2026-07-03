import { getItem, setItem } from '@/lib/training/storage';
import { todayString } from '@/lib/training/date-utils';
import type { EarTrainingDailyRecord } from './types';

const STORAGE_KEY = 'hamoni:earTrainingDaily';

function today(): string {
  return todayString();
}

export function getDailyCount(): number {
  const raw = getItem(STORAGE_KEY);
  if (!raw) return 0;

  try {
    const record: EarTrainingDailyRecord = JSON.parse(raw);
    if (record.date !== today()) return 0;
    return record.count;
  } catch {
    return 0;
  }
}

export function incrementDailyCount(): void {
  const date = today();
  const raw = getItem(STORAGE_KEY);
  let count = 0;

  if (raw) {
    try {
      const record: EarTrainingDailyRecord = JSON.parse(raw);
      if (record.date === date) count = record.count;
    } catch { /* reset */ }
  }

  const updated: EarTrainingDailyRecord = { date, count: count + 1 };
  setItem(STORAGE_KEY, JSON.stringify(updated));
}
