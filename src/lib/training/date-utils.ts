// ============================================================
// Training Feature — Shared Date Utilities
// ============================================================
// All functions use the user's LOCAL time zone for "today" determination.
// Daily records reset at the user's local midnight (00:00).
//
// IMPORTANT: Every file that needs a "today" string or date arithmetic
// for daily records should import from this module instead of defining
// its own helpers. This avoids LOCAL/UTC inconsistencies.

/**
 * Format a Date as YYYY-MM-DD using LOCAL time.
 */
export function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Today's date string in user's LOCAL time (YYYY-MM-DD).
 */
export function todayString(): string {
  return localDateString(new Date());
}

/**
 * Yesterday's date string in user's LOCAL time.
 */
export function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateString(d);
}

/**
 * N days ago date string in user's LOCAL time.
 */
export function daysAgoString(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

/**
 * Parse a YYYY-MM-DD date string into a UTC timestamp (ms).
 * Using UTC avoids DST-induced off-by-one errors in gap calculations.
 */
export function dateToUTCMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Milliseconds in one calendar day */
export const MS_PER_DAY = 86_400_000;
