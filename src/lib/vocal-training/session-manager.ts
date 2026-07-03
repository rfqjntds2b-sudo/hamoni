// ============================================================
// Scale Training — Session Manager
// ============================================================
// Manages persistence of scale training sessions using the
// same write-through sync pattern as existing training:
//   localStorage (synchronous primary) → Supabase (async backup)
// ============================================================

import { getItem, setItem } from '@/lib/training/storage';
import type { ScaleTrainingSession, VocalState } from './types';

// ─── Constants ──────────────────────────────────────────

const STORAGE_KEY = 'hamoni:scaleTrainingSessions';
const MAX_SESSIONS = 100;
const DAILY_FREE_LIMIT = 1;

// ─── Read ───────────────────────────────────────────────

export function getRecentScaleSessions(limit: number = MAX_SESSIONS): ScaleTrainingSession[] {
  const raw = getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const sessions = JSON.parse(raw) as ScaleTrainingSession[];
    return sessions.slice(0, limit);
  } catch {
    return [];
  }
}

export function getScaleSessionByDate(date: string): ScaleTrainingSession | null {
  const sessions = getRecentScaleSessions();
  return sessions.find((s) => s.date === date) ?? null;
}

export function getLatestScaleSession(): ScaleTrainingSession | null {
  const sessions = getRecentScaleSessions(1);
  return sessions[0] ?? null;
}

// ─── Write ──────────────────────────────────────────────

export function saveScaleSession(session: ScaleTrainingSession): void {
  const sessions = getRecentScaleSessions();

  // Prepend new session (newest first)
  sessions.unshift(session);

  // Trim to max
  if (sessions.length > MAX_SESSIONS) {
    sessions.length = MAX_SESSIONS;
  }

  setItem(STORAGE_KEY, JSON.stringify(sessions));

  // Fire-and-forget Supabase sync
  syncToSupabase(session);
}

// ─── Streak ─────────────────────────────────────────────

export function getScaleTrainingStreak(): number {
  const sessions = getRecentScaleSessions();
  if (sessions.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk backwards from today
  for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - dayOffset);
    const dateStr = formatDate(checkDate);

    const hasSession = sessions.some((s) => s.date === dateStr);

    if (hasSession) {
      streak++;
    } else if (dayOffset === 0) {
      // Today hasn't trained yet — that's ok, check yesterday
      continue;
    } else {
      break;
    }
  }

  return streak;
}

// ─── State History ──────────────────────────────────────

export function getStateHistory(days: number): { date: string; state: VocalState }[] {
  const sessions = getRecentScaleSessions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = formatDate(cutoff);

  return sessions
    .filter((s) => s.date >= cutoffStr)
    .map((s) => ({ date: s.date, state: s.diagnosticState }))
    .reverse(); // chronological order
}

// ─── Safety: ENT Referral Warning ───────────────────────

/** Soft warning: N consecutive sessions with the same problematic state */
const SOFT_REFERRAL_CONSECUTIVE = 3;
/** Hard warning: N problematic sessions within the rolling window */
const HARD_REFERRAL_COUNT = 5;
/** Rolling window size for hard referral check */
const HARD_REFERRAL_WINDOW = 7;

/**
 * Count consecutive sessions with the given diagnostic state from most recent backwards.
 */
export function getConsecutiveStateCount(state: VocalState): number {
  const sessions = getRecentScaleSessions();
  let count = 0;

  for (const s of sessions) {
    if (s.diagnosticState === state) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Count how many of the last N sessions have the given state (rolling window).
 */
function getRollingStateCount(state: VocalState, window: number): number {
  const sessions = getRecentScaleSessions(window);
  return sessions.filter((s) => s.diagnosticState === state).length;
}

export type ReferralLevel = 'none' | 'soft' | 'hard';

/**
 * Check if ENT referral is warranted for any problematic state.
 *
 * - **soft**: 3+ consecutive sessions with the same problematic state.
 *   Suggests temporary concern that warrants attention.
 * - **hard**: 5 of the last 7 sessions show the same problematic state.
 *   Strong signal of persistent vocal difficulty requiring ENT evaluation.
 */
export function checkReferralWarning(): {
  level: ReferralLevel;
  /** @deprecated Use `level` instead. True when level is 'soft' or 'hard'. */
  shouldWarn: boolean;
  state: VocalState | null;
  count: number;
} {
  for (const state of ['BREATHY', 'PRESSED'] as const) {
    const consecutive = getConsecutiveStateCount(state);
    const rolling = getRollingStateCount(state, HARD_REFERRAL_WINDOW);

    // Hard warning takes priority
    if (rolling >= HARD_REFERRAL_COUNT) {
      return { level: 'hard', shouldWarn: true, state, count: rolling };
    }

    // Soft warning
    if (consecutive >= SOFT_REFERRAL_CONSECUTIVE) {
      return { level: 'soft', shouldWarn: true, state, count: consecutive };
    }
  }

  return { level: 'none', shouldWarn: false, state: null, count: 0 };
}

// ─── Daily Limit Check ──────────────────────────────────

const DAILY_STARTED_KEY = 'hamoni:scaleTrainingStartedToday';

export function getTodaySessionCount(): number {
  const todayStr = formatDate(new Date());
  const sessions = getRecentScaleSessions();
  return sessions.filter((s) => s.date === todayStr).length;
}

/** Mark that a free user has started training today (consumes daily quota). */
export function markTrainingStarted(): void {
  setItem(DAILY_STARTED_KEY, formatDate(new Date()));
}

/** Check if training was already started today (regardless of completion). */
export function hasStartedToday(): boolean {
  const saved = getItem(DAILY_STARTED_KEY);
  return saved === formatDate(new Date());
}

export function canTrainToday(isPremium: boolean): boolean {
  if (isPremium) return true;
  // Block if already started OR already completed today
  if (hasStartedToday()) return false;
  return getTodaySessionCount() < DAILY_FREE_LIMIT;
}

// ─── Cross-device Initialization ─────────────────────────

/**
 * Load scale training sessions from Supabase and merge with localStorage.
 * Merges by id deduplication so multi-device sessions are unified.
 * Call once on login.
 */
export async function initializeScaleSessions(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/api/scale-training?limit=100');
    if (!res.ok) return;

    const { sessions } = await res.json() as { sessions: Array<Record<string, unknown>> };
    if (!sessions || sessions.length === 0) return;

    // Map server rows back to client format
    const serverSessions: ScaleTrainingSession[] = sessions.map((s) => ({
      id: s.id as string,
      date: s.date as string,
      startedAt: s.started_at as string,
      completedAt: s.completed_at as string,
      diagnosticState: s.diagnostic_state as VocalState,
      diagnosticMetrics: s.diagnostic_metrics as ScaleTrainingSession['diagnosticMetrics'],
      prescriptionSummary: s.prescription as ScaleTrainingSession['prescriptionSummary'],
      setsCompleted: s.sets_completed as number,
      totalSets: s.total_sets as number,
      averagePitchAccuracy: s.average_pitch_accuracy as number | undefined,
      difficultyLevel: s.difficulty_level as number,
    }));

    // Merge: local wins on id conflict, then add server-only sessions
    const local = getRecentScaleSessions();
    const localIds = new Set(local.map((s) => s.id));
    const serverOnly = serverSessions.filter((s) => !localIds.has(s.id));

    if (serverOnly.length === 0) return;

    const merged = [...local, ...serverOnly]
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
      .slice(0, MAX_SESSIONS);

    setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Silent fail — user keeps local data as-is
  }
}

// ─── Supabase Sync (queue-based with retry) ─────────────

const DIRTY_KEY = 'hamoni:scaleTrainingDirty';
const MAX_RETRIES = 3;

const syncQueue: ScaleTrainingSession[] = [];
let isSyncing = false;

function syncToSupabase(session: ScaleTrainingSession): void {
  if (typeof window === 'undefined') return;

  syncQueue.push(session);
  drainSyncQueue();
}

async function drainSyncQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  while (syncQueue.length > 0) {
    const payload = syncQueue.shift()!;
    const ok = await syncWithRetry(payload);

    if (!ok) {
      // Mark as dirty for retry on next app load
      saveDirtySession(payload);
    }
  }

  isSyncing = false;
}

async function syncWithRetry(payload: ScaleTrainingSession): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('/api/scale-training', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;

      // 4xx errors (except 429) are permanent — don't retry
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.warn('[scale-sync] Permanent failure:', res.status);
        return false;
      }
    } catch {
      // Network error — retry
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }

  return false;
}

function saveDirtySession(session: ScaleTrainingSession): void {
  try {
    const raw = getItem(DIRTY_KEY);
    const dirty: ScaleTrainingSession[] = raw ? JSON.parse(raw) : [];
    dirty.push(session);
    setItem(DIRTY_KEY, JSON.stringify(dirty.slice(-20))); // cap at 20
  } catch { /* noop */ }
}

/** Retry any previously failed syncs. Call on app init. */
export async function retryDirtySessions(): Promise<void> {
  if (typeof window === 'undefined') return;

  const raw = getItem(DIRTY_KEY);
  if (!raw) return;

  try {
    const dirty: ScaleTrainingSession[] = JSON.parse(raw);
    if (dirty.length === 0) return;

    // Clear the dirty list first to avoid re-processing
    setItem(DIRTY_KEY, '[]');

    const stillDirty: ScaleTrainingSession[] = [];
    for (const session of dirty) {
      const ok = await syncWithRetry(session);
      if (!ok) stillDirty.push(session);
    }

    if (stillDirty.length > 0) {
      setItem(DIRTY_KEY, JSON.stringify(stillDirty));
    }
  } catch { /* noop */ }
}

// ─── Helpers ────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
