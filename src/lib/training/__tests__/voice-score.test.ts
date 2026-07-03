import { describe, it, expect } from 'vitest';
import type { VoiceCheckData, VoiceCheckDay } from '../types';
import {
  computeVoiceScore,
  METRIC_HUMAN_MAP,
  type HumanMetricKey,
} from '../voice-score';

// ============================================================
// Helpers
// ============================================================

function mockDay(overrides: Partial<VoiceCheckDay> = {}): VoiceCheckDay {
  return {
    date: new Date().toISOString().slice(0, 10),
    overall: 70,
    f0Score: 80,
    jitterScore: 70,
    shimmerScore: 65,
    hnrScore: 75,
    ...overrides,
  };
}

function emptyVoiceCheck(): VoiceCheckData {
  return { days: [] };
}

function thisMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const d = new Date(now);
  d.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================================
// Tests
// ============================================================

describe('computeVoiceScore', () => {
  it('returns null score for empty voice check data', () => {
    const result = computeVoiceScore(emptyVoiceCheck());

    expect(result.score).toBeNull();
    expect(result.components.jitterScore).toBeNull();
    expect(result.components.shimmerScore).toBeNull();
    expect(result.components.hnrScore).toBeNull();
    expect(result.components.f0Score).toBeNull();
    expect(result.trend).toBe(0);
    expect(result.trendDirection).toBe('stable');
  });

  it('computes weighted average from 4 metrics', () => {
    const vc: VoiceCheckData = {
      days: [mockDay({ jitterScore: 80, shimmerScore: 60, hnrScore: 90, f0Score: 70 })],
    };

    const result = computeVoiceScore(vc);

    // 80*0.25 + 60*0.25 + 90*0.30 + 70*0.20 = 20+15+27+14 = 76
    expect(result.score).toBe(76);
  });

  it('uses the most recent day (first in array)', () => {
    const vc: VoiceCheckData = {
      days: [
        mockDay({ date: '2026-03-27', jitterScore: 90, shimmerScore: 90, hnrScore: 90, f0Score: 90 }),
        mockDay({ date: '2026-03-26', jitterScore: 50, shimmerScore: 50, hnrScore: 50, f0Score: 50 }),
      ],
    };

    const result = computeVoiceScore(vc);

    // Should use first day (90 all): 90*0.25 + 90*0.25 + 90*0.30 + 90*0.20 = 90
    expect(result.score).toBe(90);
  });

  it('trend: up when this week avg is 5+ points above last week', () => {
    const mon = thisMonday();
    // Add 1 day to be safely inside this week
    const thisWeekDay = new Date(mon);
    thisWeekDay.setDate(thisWeekDay.getDate() + 1);
    const lastWeekDay = new Date(mon);
    lastWeekDay.setDate(lastWeekDay.getDate() - 3);

    const vc: VoiceCheckData = {
      days: [
        mockDay({ date: thisWeekDay.toISOString().slice(0, 10), overall: 80 }),
        mockDay({ date: lastWeekDay.toISOString().slice(0, 10), overall: 60 }),
      ],
    };

    const result = computeVoiceScore(vc);

    expect(result.trend).toBe(20);
    expect(result.trendDirection).toBe('up');
  });

  it('trend: stable when no last week data', () => {
    const mon = thisMonday();
    const thisWeekDay = new Date(mon);
    thisWeekDay.setDate(thisWeekDay.getDate() + 1);
    const vc: VoiceCheckData = {
      days: [mockDay({ date: thisWeekDay.toISOString().slice(0, 10), overall: 75 })],
    };

    const result = computeVoiceScore(vc);

    expect(result.trend).toBe(0);
    expect(result.trendDirection).toBe('stable');
  });

  it('trend: stable when difference < 5 points', () => {
    const mon = thisMonday();
    const thisWeekDay = new Date(mon);
    thisWeekDay.setDate(thisWeekDay.getDate() + 1);
    const lastWeekDay = new Date(mon);
    lastWeekDay.setDate(lastWeekDay.getDate() - 3);

    const vc: VoiceCheckData = {
      days: [
        mockDay({ date: thisWeekDay.toISOString().slice(0, 10), overall: 72 }),
        mockDay({ date: lastWeekDay.toISOString().slice(0, 10), overall: 70 }),
      ],
    };

    const result = computeVoiceScore(vc);

    expect(result.trend).toBe(2);
    expect(result.trendDirection).toBe('stable');
  });

  it('trend: down when this week is 5+ points below last week', () => {
    const mon = thisMonday();
    const thisWeekDay = new Date(mon);
    thisWeekDay.setDate(thisWeekDay.getDate() + 1);
    const lastWeekDay = new Date(mon);
    lastWeekDay.setDate(lastWeekDay.getDate() - 3);

    const vc: VoiceCheckData = {
      days: [
        mockDay({ date: thisWeekDay.toISOString().slice(0, 10), overall: 55 }),
        mockDay({ date: lastWeekDay.toISOString().slice(0, 10), overall: 75 }),
      ],
    };

    const result = computeVoiceScore(vc);

    expect(result.trend).toBe(-20);
    expect(result.trendDirection).toBe('down');
  });

  it('components expose individual metric scores', () => {
    const vc: VoiceCheckData = {
      days: [mockDay({ jitterScore: 85, shimmerScore: 72, hnrScore: 91, f0Score: 68 })],
    };

    const result = computeVoiceScore(vc);

    expect(result.components.jitterScore).toBe(85);
    expect(result.components.shimmerScore).toBe(72);
    expect(result.components.hnrScore).toBe(91);
    expect(result.components.f0Score).toBe(68);
  });
});

// ============================================================
// METRIC_HUMAN_MAP
// ============================================================

describe('METRIC_HUMAN_MAP', () => {
  it('covers all 4 human metric keys', () => {
    const allHumanKeys: HumanMetricKey[] = [
      'voiceStability',
      'volumeConsistency',
      'voiceClarity',
      'pitchAccuracy',
    ];

    const mappedValues = new Set(Object.values(METRIC_HUMAN_MAP));

    for (const key of allHumanKeys) {
      expect(mappedValues).toContain(key);
    }
  });

  it('maps lowercase jitter to voiceStability', () => {
    expect(METRIC_HUMAN_MAP['jitter']).toBe('voiceStability');
  });

  it('maps capitalized Shimmer to volumeConsistency', () => {
    expect(METRIC_HUMAN_MAP['Shimmer']).toBe('volumeConsistency');
  });

  it('maps hnr to voiceClarity', () => {
    expect(METRIC_HUMAN_MAP['hnr']).toBe('voiceClarity');
  });

  it('maps f0Std to pitchAccuracy', () => {
    expect(METRIC_HUMAN_MAP['f0Std']).toBe('pitchAccuracy');
  });
});
