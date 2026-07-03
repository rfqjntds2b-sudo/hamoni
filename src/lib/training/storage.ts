// ============================================================
// Training Feature — User-scoped localStorage helpers
// ============================================================
// Centralised localStorage access with per-user key namespacing.
// All training modules must use these helpers instead of raw
// localStorage to prevent cross-account data leakage.
// ============================================================

let _userId: string | null = null;

export function setCurrentUserId(userId: string | null): void {
  _userId = userId;
}

export function getCurrentUserId(): string | null {
  return _userId;
}

/**
 * Build a user-scoped localStorage key.
 * Input keys follow the convention `hamoni:<name>`.
 * Output: `hamoni:<userId>:<name>` (or the original key when no user is set).
 */
function scopedKey(key: string): string {
  if (!_userId) {
    // Fallback to unscoped key if no user (shouldn't happen in protected routes)
    return key;
  }
  return `hamoni:${_userId}:${key.replace('hamoni:', '')}`;
}

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(scopedKey(key));
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(scopedKey(key), value);
  } catch {
    /* storage full or unavailable */
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(scopedKey(key));
  } catch {
    /* noop */
  }
}

// ============================================================
// One-time migration of unscoped (legacy) keys
// ============================================================

const KEYS_TO_MIGRATE = [
  'hamoni:trainingProgress',
  'hamoni:trainingHistory',
  'hamoni:dailyActivity',
  'hamoni:voiceCheck',
  'hamoni:bestScores',
  'hamoni:dailyBest',
];

/**
 * Copy data from old unscoped keys into new user-scoped keys.
 * Only copies when the old key has data and the new scoped key does not.
 * Old unscoped keys are deleted after successful migration to prevent
 * the same data being copied to every subsequent user who logs in.
 */
export function migrateUnscopedData(userId: string): void {
  for (const key of KEYS_TO_MIGRATE) {
    try {
      const oldData = localStorage.getItem(key);
      if (!oldData) continue;

      const newKey = `hamoni:${userId}:${key.replace('hamoni:', '')}`;
      const newData = localStorage.getItem(newKey);

      // Only migrate if new scoped key doesn't already have data
      if (!newData) {
        localStorage.setItem(newKey, oldData);
      }
      // Delete unscoped key so it won't be copied to other users
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }
}
