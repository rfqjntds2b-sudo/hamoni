// ============================================================
// Training Feature — Supabase Sync (Write-Through)
// ============================================================
// Handles bidirectional sync between localStorage and Supabase.
// localStorage remains the synchronous primary store.
// Supabase is the durable backup, written asynchronously.
//
// Read path (app start): Supabase → localStorage cache
// Write path (session complete): localStorage (sync) → Supabase (async)
// ============================================================

import type { TrainingProgress, ExerciseId, SessionRecord, VoiceCheckDay } from './types';
import { getItem, setItem } from './storage';
import { EXERCISE_IDS } from './exercises';

// ============================================================
// Constants
// ============================================================

const SYNC_FLAG_KEY = 'hamoni:syncedToSupabase';
const LOAD_TIMEOUT_MS = 3000;
const PROGRESS_KEY = 'hamoni:trainingProgress';

// ============================================================
// Serial Sync Queue
// ============================================================
// Prevents network reordering when rapid consecutive saves occur.
// Only the latest payload is sent after the current in-flight request completes.

let pendingSync: Promise<void> = Promise.resolve();
let latestPayload: TrainingProgress | null = null;

function enqueueSyncProgress(progress: TrainingProgress): void {
  latestPayload = progress;
  pendingSync = pendingSync.then(async () => {
    const payload = latestPayload;
    if (!payload) return;
    latestPayload = null;
    try {
      const res = await fetch('/api/training-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[sync] Supabase sync failed:', res.status, err);
      }
    } catch {
      // Silent fail — localStorage already has the data
    }
  });
}

// ============================================================
// saveProgressToSupabase (fire-and-forget)
// ============================================================

/**
 * Enqueue a Supabase sync for the given training progress.
 * This is fire-and-forget: errors are silently ignored.
 * Called from saveTrainingProgress() after the localStorage write.
 */
export function saveProgressToSupabase(progress: TrainingProgress): void {
  if (typeof window === 'undefined') return; // SSR guard
  enqueueSyncProgress(progress);
}

// ============================================================
// loadProgress
// ============================================================

/**
 * Load training progress from Supabase.
 * Returns the TrainingProgress if found, or null if:
 * - Supabase has no data (found: false)
 * - Network/timeout error
 *
 * When data is found, it is also cached to localStorage.
 */
export async function loadProgress(): Promise<TrainingProgress | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

    const response = await fetch('/api/training-progress', {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.found) return null;

    const progress = data.progress as TrainingProgress;

    // Cache to localStorage — but only if Supabase data is newer or equal.
    // If localStorage has a higher _version, it means a session was saved
    // locally but the Supabase write hasn't landed yet. Don't overwrite.
    try {
      const localRaw = getItem(PROGRESS_KEY);
      if (localRaw) {
        const localData = JSON.parse(localRaw) as TrainingProgress;
        const localVersion = localData._version ?? 0;
        const remoteVersion = progress._version ?? 0;
        if (localVersion > remoteVersion) {
          // Local is ahead — skip overwrite, re-enqueue sync
          enqueueSyncProgress(localData);
          return localData;
        }
      }
      setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // localStorage read/write failure is non-critical
    }

    return progress;
  } catch {
    // Network error or timeout — return null for localStorage fallback
    return null;
  }
}

// ============================================================
// migrateLocalToSupabase
// ============================================================

/**
 * One-time migration: push localStorage training data to Supabase.
 * - Skips if already migrated (flag exists)
 * - Skips if localStorage has only default data (no real progress)
 * - On success, sets a localStorage flag to prevent re-migration
 * - On failure, returns false so the next login can retry
 */
export async function migrateLocalToSupabase(): Promise<boolean> {
  // Check if already migrated
  const flag = getItem(SYNC_FLAG_KEY);
  if (flag === '1') return true;

  const progress = readLocalProgress();

  // Skip if no data or default state (no real progress to migrate)
  if (!progress || isDefaultProgress(progress)) {
    setItem(SYNC_FLAG_KEY, '1');
    return true;
  }

  try {
    const response = await fetch('/api/training-progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });

    if (response.ok) {
      setItem(SYNC_FLAG_KEY, '1');
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ============================================================
// initializeProgress
// ============================================================

/**
 * Called once during UserScopeProvider initialization.
 * Handles the full load/migrate/fallback flow with a 3-second timeout.
 *
 * Flow:
 * 1. If not yet synced (no flag):
 *    a. Try loading from Supabase
 *    b. If Supabase has data → cache to localStorage + set flag
 *    c. If Supabase empty + localStorage has data → migrate to Supabase
 *    d. If both empty → nothing to do
 * 2. If already synced (flag exists):
 *    a. Load from Supabase → overwrite localStorage (Supabase authoritative)
 *    b. If load fails → keep localStorage as-is (offline fallback)
 */
export async function initializeProgress(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

    const initPromise = doInitializeProgress();

    // Race against timeout
    await Promise.race([
      initPromise,
      new Promise<void>((resolve) => {
        controller.signal.addEventListener('abort', () => resolve());
      }),
    ]);

    clearTimeout(timeoutId);
  } catch {
    // Timeout or error — proceed with whatever localStorage has
  }
}

async function doInitializeProgress(): Promise<void> {
  const flag = getItem(SYNC_FLAG_KEY);

  if (flag !== '1') {
    // First-time sync
    const supabaseProgress = await loadProgress();

    if (supabaseProgress) {
      setItem(SYNC_FLAG_KEY, '1');
    } else {
      const localProgress = readLocalProgress();
      if (localProgress && !isDefaultProgress(localProgress)) {
        await migrateLocalToSupabase();
      }
    }
  } else {
    await loadProgress();
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Read TrainingProgress directly from localStorage.
 * Avoids importing getTrainingProgress from progress.ts to prevent
 * circular dependency (progress.ts → sync.ts → progress.ts).
 */
function readLocalProgress(): TrainingProgress | null {
  try {
    const raw = getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingProgress;
      // Heal missing exercise keys (same as getTrainingProgress)
      for (const id of EXERCISE_IDS) {
        if (!parsed.exercises?.[id as ExerciseId]) {
          parsed.exercises[id as ExerciseId] = {
            currentLevel: 1,
            bestLevel: 0,
            totalAttempts: 0,
            totalPasses: 0,
            consecutivePasses: 0,
            consecutiveFails: 0,
            lastPracticed: null,
            personalBests: {},
          };
        }
      }
      return parsed;
    }
  } catch {
    // Corrupt data
  }
  return null;
}

/**
 * Check if a TrainingProgress represents the default state (no real data).
 * Used to skip migration when localStorage has only default values.
 */
function isDefaultProgress(progress: TrainingProgress): boolean {
  if (progress.totalXP > 0) return false;

  for (const ex of Object.values(progress.exercises)) {
    if (ex.totalAttempts > 0) return false;
  }

  return true;
}

// ============================================================
// syncTrainingSession (fire-and-forget)
// ============================================================

/**
 * Sync a single training session record to Supabase.
 * Fire-and-forget: errors are silently ignored.
 * localStorage is always the primary store.
 */
export async function syncTrainingSession(record: SessionRecord): Promise<void> {
  try {
    await fetch('/api/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId: record.exerciseId,
        level: record.level,
        passed: record.passed,
        criterionResults: record.criterionResults,
        xpEarned: record.xpEarned,
        duration: record.duration,
        timestamp: record.timestamp,
      }),
    });
  } catch {
    // Silent failure — localStorage is primary
  }
}

// ============================================================
// syncVoiceCheck (fire-and-forget)
// ============================================================

/**
 * Sync a single voice-check day entry to Supabase.
 * Fire-and-forget: errors are silently ignored.
 * localStorage is always the primary store.
 */
export async function syncVoiceCheck(day: VoiceCheckDay): Promise<void> {
  try {
    await fetch('/api/voice-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: day.date,
        overall: day.overall,
        f0Score: day.f0Score,
        jitterScore: day.jitterScore,
        shimmerScore: day.shimmerScore,
        hnrScore: day.hnrScore,
      }),
    });
  } catch {
    // Silent failure
  }
}

// ============================================================
// migrateHistoryToSupabase
// ============================================================

const HISTORY_MIGRATE_FLAG = 'hamoni:historyMigratedToSupabase';

/**
 * One-time migration: push existing localStorage training history
 * and voice-check data to Supabase.
 *
 * - Skips if already migrated (flag exists)
 * - Sends in batches of 10 to avoid overwhelming the API
 * - On success, sets flag to prevent re-migration
 * - On failure, does NOT set flag so the next login can retry
 */
export async function migrateHistoryToSupabase(): Promise<void> {
  const flag = getItem(HISTORY_MIGRATE_FLAG);
  if (flag === '1') return;

  try {
    // Migrate training history
    const historyRaw = getItem('hamoni:trainingHistory');
    if (historyRaw) {
      const sessions: SessionRecord[] = JSON.parse(historyRaw);
      // Send in batches of 10 to avoid overwhelming the API
      for (let i = 0; i < sessions.length; i += 10) {
        const batch = sessions.slice(i, i + 10);
        await Promise.allSettled(
          batch.map(s => syncTrainingSession(s))
        );
      }
    }

    // Migrate voice checks
    const vcRaw = getItem('hamoni:voiceCheck');
    if (vcRaw) {
      const vcData = JSON.parse(vcRaw);
      if (vcData?.days) {
        for (let i = 0; i < vcData.days.length; i += 10) {
          const batch = vcData.days.slice(i, i + 10);
          await Promise.allSettled(
            batch.map((d: VoiceCheckDay) => syncVoiceCheck(d))
          );
        }
      }
    }

    setItem(HISTORY_MIGRATE_FLAG, '1');
  } catch {
    // Don't set flag on failure — will retry next time
  }
}
