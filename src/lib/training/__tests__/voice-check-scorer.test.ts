import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Dynamic import so mocks are in place before module loads
async function loadModule() {
  vi.resetModules();
  return import('../voice-check-scorer');
}

// ============================================================
// Helper: date strings
// ============================================================

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function today(): string {
  return toDateString(new Date());
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

// ============================================================
// calculateVoiceCheckScore — subscores
// ============================================================

describe('calculateVoiceCheckScore', () => {
  it('f0Score: f0Std=0.5 -> ~100', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 0.2,
      shimmer: 1,
      hnr: 25,
    });
    expect(result.f0Score).toBeGreaterThanOrEqual(95);
  });

  it('f0Score: f0Std=15 -> ~0', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 15, 50),
      jitter: 0.2,
      shimmer: 1,
      hnr: 25,
    });
    expect(result.f0Score).toBeLessThanOrEqual(5);
  });

  it('jitterScore: jitter=0.08 -> ~95+ (Praat PPQ5 scale)', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 0.08,
      shimmer: 0.6,
      hnr: 25,
    });
    expect(result.jitterScore).toBeGreaterThanOrEqual(95);
  });

  it('jitterScore: jitter=4 -> ~0', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 4,
      shimmer: 0.6,
      hnr: 25,
    });
    expect(result.jitterScore).toBeLessThanOrEqual(5);
  });

  it('shimmerScore: shimmer=0.6 -> ~95+ (Praat APQ3+RMS scale)', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 0.08,
      shimmer: 0.6,
      hnr: 25,
    });
    // shimmer=0.6 with best=0.53, worst=3.81 → score ≈ 98
    expect(result.shimmerScore).toBeGreaterThanOrEqual(90);
  });

  it('shimmerScore: shimmer=8 -> ~0', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 0.08,
      shimmer: 8,
      hnr: 25,
    });
    expect(result.shimmerScore).toBeLessThanOrEqual(5);
  });

  it('hnrScore: hnr=25 -> ~100', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 0.2,
      shimmer: 1,
      hnr: 25,
    });
    expect(result.hnrScore).toBeGreaterThanOrEqual(95);
  });

  it('hnrScore: hnr=5 -> ~0', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 0.2,
      shimmer: 1,
      hnr: 5,
    });
    expect(result.hnrScore).toBeLessThanOrEqual(5);
  });

  it('overall is average of 4 subscores', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 5, 50),
      jitter: 1.5,
      shimmer: 3,
      hnr: 15,
    });
    const expectedOverall = Math.round(
      (result.f0Score + result.jitterScore + result.shimmerScore + result.hnrScore) / 4,
    );
    expect(result.overall).toBe(expectedOverall);
  });

  it('all good values -> overall 80+', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 0.5, 50),
      jitter: 0.2,
      shimmer: 1,
      hnr: 25,
    });
    expect(result.overall).toBeGreaterThanOrEqual(80);
  });

  it('all bad values -> overall 20 or less', async () => {
    const { calculateVoiceCheckScore } = await loadModule();
    const result = calculateVoiceCheckScore({
      f0Values: generateF0WithStd(220, 15, 50),
      jitter: 4,
      shimmer: 8,
      hnr: 5,
    });
    expect(result.overall).toBeLessThanOrEqual(20);
  });
});

// ============================================================
// saveVoiceCheck / getVoiceCheckData / getTodayVoiceCheck
// ============================================================

describe('saveVoiceCheck', () => {
  it('stores correctly in localStorage', async () => {
    const { saveVoiceCheck, getVoiceCheckData } = await loadModule();

    const day = {
      date: today(),
      overall: 85,
      f0Score: 90,
      jitterScore: 80,
      shimmerScore: 85,
      hnrScore: 85,
    };

    saveVoiceCheck(day);
    const data = getVoiceCheckData();
    expect(data.days).toHaveLength(1);
    expect(data.days[0]).toEqual(day);
  });

  it('replaces existing entry for same date', async () => {
    const { saveVoiceCheck, getVoiceCheckData } = await loadModule();

    const day1 = {
      date: today(),
      overall: 70,
      f0Score: 70,
      jitterScore: 70,
      shimmerScore: 70,
      hnrScore: 70,
    };
    const day2 = {
      date: today(),
      overall: 90,
      f0Score: 90,
      jitterScore: 90,
      shimmerScore: 90,
      hnrScore: 90,
    };

    saveVoiceCheck(day1);
    saveVoiceCheck(day2);

    const data = getVoiceCheckData();
    expect(data.days).toHaveLength(1);
    expect(data.days[0].overall).toBe(90);
  });
});

describe('getVoiceCheckData', () => {
  it('returns empty on first call', async () => {
    const { getVoiceCheckData } = await loadModule();
    const data = getVoiceCheckData();
    expect(data).toEqual({ days: [] });
  });
});

describe('getTodayVoiceCheck', () => {
  it('returns null when no data', async () => {
    const { getTodayVoiceCheck } = await loadModule();
    expect(getTodayVoiceCheck()).toBeNull();
  });

  it('returns today entry when it exists', async () => {
    const { saveVoiceCheck, getTodayVoiceCheck } = await loadModule();
    const day = {
      date: today(),
      overall: 75,
      f0Score: 80,
      jitterScore: 70,
      shimmerScore: 75,
      hnrScore: 75,
    };
    saveVoiceCheck(day);
    expect(getTodayVoiceCheck()).toEqual(day);
  });
});

// ============================================================
// 90-day retention
// ============================================================

describe('90-day retention', () => {
  it('entries older than 90 days are pruned on save', async () => {
    const { saveVoiceCheck, getVoiceCheckData } = await loadModule();

    // Seed an old entry (91 days ago)
    const oldDay = {
      date: daysAgo(91),
      overall: 60,
      f0Score: 60,
      jitterScore: 60,
      shimmerScore: 60,
      hnrScore: 60,
    };

    // A recent entry (5 days ago)
    const recentDay = {
      date: daysAgo(5),
      overall: 80,
      f0Score: 80,
      jitterScore: 80,
      shimmerScore: 80,
      hnrScore: 80,
    };

    // Manually seed localStorage with old data
    store['hamoni:voiceCheck'] = JSON.stringify({
      days: [oldDay, recentDay],
    });

    // Save today's entry -> triggers prune
    const todayDay = {
      date: today(),
      overall: 90,
      f0Score: 90,
      jitterScore: 90,
      shimmerScore: 90,
      hnrScore: 90,
    };
    saveVoiceCheck(todayDay);

    const data = getVoiceCheckData();
    // Old entry should be pruned
    expect(data.days.find((d) => d.date === daysAgo(91))).toBeUndefined();
    // Recent and today should remain
    expect(data.days.find((d) => d.date === daysAgo(5))).toBeDefined();
    expect(data.days.find((d) => d.date === today())).toBeDefined();
    expect(data.days).toHaveLength(2);
  });
});

// ============================================================
// Helper: generate f0 array with a target std deviation
// ============================================================

function generateF0WithStd(
  mean: number,
  targetStd: number,
  count: number,
): number[] {
  // Deterministic: alternate above/below mean to approximate target std
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    values.push(mean + (i % 2 === 0 ? targetStd : -targetStd));
  }
  return values;
}

// ============================================================
// updateFromSessionMetrics
// ============================================================

describe('updateFromSessionMetrics', () => {
  const makeVoicedMetrics = (jitter: number, shimmer: number, hnr: number, f0: number, count = 20) => ({
    jitterValues: Array(count).fill(jitter),
    shimmerValues: Array(count).fill(shimmer),
    hnrValues: Array(count).fill(hnr),
    f0Values: Array(count).fill(f0),
    isVoicedValues: Array(count).fill(true),
  });

  it('saves a voice check day from session metrics', async () => {
    const { updateFromSessionMetrics, getTodayVoiceCheck } = await loadModule();
    updateFromSessionMetrics(makeVoicedMetrics(1.0, 2.0, 20, 220));
    const check = getTodayVoiceCheck();
    expect(check).not.toBeNull();
    expect(check!.jitterScore).toBeGreaterThan(0);
    expect(check!.hnrScore).toBeGreaterThan(0);
  });

  it('skips when not enough voiced frames', async () => {
    const { updateFromSessionMetrics, getTodayVoiceCheck } = await loadModule();
    updateFromSessionMetrics(makeVoicedMetrics(1.0, 2.0, 20, 220, 3)); // only 3 frames
    expect(getTodayVoiceCheck()).toBeNull();
  });

  it('blends with existing score via EMA (alpha=0.3)', async () => {
    const { updateFromSessionMetrics, getTodayVoiceCheck, saveVoiceCheck } = await loadModule();
    // First: save a manual voice check
    saveVoiceCheck({ date: today(), overall: 50, f0Score: 50, jitterScore: 50, shimmerScore: 50, hnrScore: 50 });
    // Then: session with perfect metrics
    updateFromSessionMetrics(makeVoicedMetrics(0.2, 1.0, 25, 220));
    const check = getTodayVoiceCheck()!;
    // Blended: 50*0.7 + perfect*0.3 — should be between 50 and perfect
    expect(check.jitterScore).toBeGreaterThan(50);
    expect(check.jitterScore).toBeLessThan(100);
  });
});
