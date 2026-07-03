import { describe, it, expect } from 'vitest';
import {
  getNormalizedCriteria,
  getNormalizedVFECriteria,
  getNormalizedVoiceCheckParams,
  type VoiceType,
} from '../voice-type-offsets';
import { getLevelCriteria, getVFELevelCriteria } from '../level-criteria';

describe('getNormalizedCriteria', () => {
  it('returns base criteria when voiceType is null', () => {
    const base = getLevelCriteria('humming', 3);
    const normalized = getNormalizedCriteria('humming', 3, null);
    expect(normalized).toEqual(base);
  });

  it('increases jitterMax and decreases hnrMin for Bass', () => {
    const base = getLevelCriteria('humming', 5);
    const normalized = getNormalizedCriteria('humming', 5, 'Bass');

    expect(normalized.jitterMax).toBe(base.jitterMax! + 0.17);
    expect(normalized.hnrMin).toBe(base.hnrMin! + (-4));
  });

  it('decreases jitterMax and increases hnrMin for Soprano', () => {
    const base = getLevelCriteria('straw', 5);
    const normalized = getNormalizedCriteria('straw', 5, 'Soprano');

    expect(normalized.jitterMax).toBe(base.jitterMax! + (-0.04));
    expect(normalized.shimmerMax).toBe(base.shimmerMax! + (-0.15));
    expect(normalized.hnrMin).toBe(base.hnrMin! + 2);
  });

  it('keeps Tenor/Alto identical to base', () => {
    const base = getLevelCriteria('flow', 4);
    expect(getNormalizedCriteria('flow', 4, 'Tenor')).toEqual(base);
    expect(getNormalizedCriteria('flow', 4, 'Alto')).toEqual(base);
  });

  it('does not modify undefined criteria fields (shimmer/hnr still undefined at L1)', () => {
    // humming L1 now has jitterMax but not shimmerMax/hnrMin
    const normalized = getNormalizedCriteria('humming', 1, 'Bass');
    expect(normalized.jitterMax).toBeDefined();
    expect(normalized.shimmerMax).toBeUndefined();
    expect(normalized.hnrMin).toBeUndefined();
  });

  it('clamps jitterMax to minimum 0.17%', () => {
    // humming L10: jitterMax=0.21, soprano offset is -0.04 → 0.17 (at min floor)
    const normalized = getNormalizedCriteria('humming', 10, 'Soprano');
    expect(normalized.jitterMax).toBeGreaterThanOrEqual(0.17);
  });

  it('clamps hnrMin to minimum 3 dB', () => {
    // humming L3 has hnrMin=7, Bass offset is -4 → 3
    const normalized = getNormalizedCriteria('humming', 3, 'Bass');
    expect(normalized.hnrMin).toBe(3);
  });

  it('clamps duration to minimum 2s', () => {
    // yawn_sigh L1 has duration=2, soprano offset is -1 → 1 → clamped to 2
    const normalized = getNormalizedCriteria('yawn_sigh', 1, 'Soprano');
    expect(normalized.duration).toBe(2);
  });

  it('applies f0StdScale as multiplier for Soprano', () => {
    // humming L8 has f0StdMax=5, soprano scale=1.1 → 5.5
    const normalized = getNormalizedCriteria('humming', 8, 'Soprano');
    expect(normalized.f0StdMax).toBeCloseTo(5.5, 5);
  });

  it('adjusts duration with additive offset', () => {
    const base = getLevelCriteria('straw', 3);
    const normalized = getNormalizedCriteria('straw', 3, 'Bass');
    expect(normalized.duration).toBe(base.duration + 1);
  });

  it('adjusts shimmerMax for Baritone', () => {
    const base = getLevelCriteria('lip_trill', 4);
    const normalized = getNormalizedCriteria('lip_trill', 4, 'Baritone');
    expect(normalized.shimmerMax).toBe(base.shimmerMax! + 0.23);
  });

  it('handles timer-only exercises (breathing) - only duration changes', () => {
    const base = getLevelCriteria('breathing', 1);
    const normalized = getNormalizedCriteria('breathing', 1, 'Bass');
    expect(normalized.duration).toBe(base.duration + 1);
    // No DSP fields to adjust
    expect(normalized.jitterMax).toBeUndefined();
  });

  it('applies Mezzo-Soprano offsets correctly', () => {
    const base = getLevelCriteria('straw', 5);
    const normalized = getNormalizedCriteria('straw', 5, 'Mezzo-Soprano');

    expect(normalized.jitterMax).toBe(base.jitterMax! - 0.04);
    expect(normalized.shimmerMax).toBe(base.shimmerMax! - 0.08);
    expect(normalized.hnrMin).toBe(base.hnrMin! + 1);
    expect(normalized.duration).toBe(base.duration - 0.5);
  });
});

describe('getNormalizedVFECriteria', () => {
  it('returns base VFE criteria when voiceType is null', () => {
    const base = getVFELevelCriteria(3);
    const normalized = getNormalizedVFECriteria(3, null);
    expect(normalized).toEqual(base);
  });

  it('applies offsets to sub-exercises A and D only', () => {
    const base = getVFELevelCriteria(5);
    const normalized = getNormalizedVFECriteria(5, 'Bass');

    // A and D should be adjusted
    expect(normalized.a.jitterMax).toBe(base.a.jitterMax! + 0.17);
    expect(normalized.a.hnrMin).toBe(base.a.hnrMin! + (-4));
    expect(normalized.d.hnrMin).toBe(base.d.hnrMin! + (-4));

    // B and C should be unchanged
    expect(normalized.b).toEqual(base.b);
    expect(normalized.c).toEqual(base.c);
  });

  it('does not mutate the original base criteria', () => {
    const baseBefore = getVFELevelCriteria(5);
    getNormalizedVFECriteria(5, 'Bass');
    const baseAfter = getVFELevelCriteria(5);
    expect(baseAfter).toEqual(baseBefore);
  });
});

describe('getNormalizedVoiceCheckParams', () => {
  it('returns default params when voiceType is null', () => {
    const params = getNormalizedVoiceCheckParams(null);
    expect(params.jitterBest).toBe(0.06);
    expect(params.jitterWorst).toBe(1.04);
    expect(params.hnrBest).toBe(25);
    expect(params.hnrWorst).toBe(5);
  });

  it('returns wider jitter range for Bass', () => {
    const params = getNormalizedVoiceCheckParams('Bass');
    expect(params.jitterBest).toBe(0.15);
    expect(params.jitterWorst).toBe(1.33);
    expect(params.hnrBest).toBe(21);
    expect(params.hnrWorst).toBe(3);
  });

  it('returns tighter ranges for Soprano', () => {
    const params = getNormalizedVoiceCheckParams('Soprano');
    expect(params.jitterBest).toBe(0.03);
    expect(params.shimmerBest).toBe(0.38);
    expect(params.hnrBest).toBe(27);
  });

  it('Tenor and Alto return same values as default', () => {
    const defaults = getNormalizedVoiceCheckParams(null);
    expect(getNormalizedVoiceCheckParams('Tenor')).toEqual(defaults);
    expect(getNormalizedVoiceCheckParams('Alto')).toEqual(defaults);
  });

  it('returns distinct params for each voice type', () => {
    const voiceTypes: VoiceType[] = ['Bass', 'Baritone', 'Tenor', 'Alto', 'Mezzo-Soprano', 'Soprano'];
    const paramSets = voiceTypes.map(vt => getNormalizedVoiceCheckParams(vt));

    // Bass should have highest jitterBest (most lenient)
    expect(paramSets[0].jitterBest).toBeGreaterThan(paramSets[1].jitterBest);
    // Soprano should have lowest jitterBest (strictest)
    expect(paramSets[5].jitterBest).toBeLessThan(paramSets[4].jitterBest);
  });
});
