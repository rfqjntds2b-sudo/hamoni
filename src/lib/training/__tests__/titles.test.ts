import { describe, it, expect } from 'vitest';
import { getCurrentTitle, getNextTitle, getTitleProgress, TITLES } from '../titles';
import type { TitleContext } from '../titles';

// Helper: create exercise levels map with N exercises at given level
function makeLevels(count: number, level: number): Record<string, number> {
  const levels: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    levels[`exercise_${i}`] = level;
  }
  return levels;
}

describe('getCurrentTitle', () => {
  it('returns 첫 걸음 for 0 XP', () => {
    expect(getCurrentTitle(0).title).toBe('첫 걸음');
  });

  it('returns 첫 걸음 for 199 XP (just below next tier)', () => {
    expect(getCurrentTitle(199).title).toBe('첫 걸음');
  });

  it('returns 목소리 탐험가 at exactly 200 XP', () => {
    expect(getCurrentTitle(200).title).toBe('목소리 탐험가');
  });

  it('returns 보컬 수련생 at 1500 XP (lenient, no ctx)', () => {
    expect(getCurrentTitle(1500).title).toBe('보컬 수련생');
  });

  // XP-only checks (no exerciseLevels) — lenient mode
  it('returns 비르투오소 at 100000+ XP without level data (lenient)', () => {
    expect(getCurrentTitle(100000).title).toBe('비르투오소');
    expect(getCurrentTitle(150000).title).toBe('비르투오소');
  });

  it('returns 가왕 at 75000 XP (below 비르투오소 threshold)', () => {
    expect(getCurrentTitle(75000).title).toBe('가왕');
  });

  // With level gates — 보컬 수련생: 3 at Lv3
  it('blocks 보컬 수련생 when level gate not met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(2, 3) }; // need 3
    expect(getCurrentTitle(1500, ctx).title).toBe('소리 여행자');
  });

  it('grants 보컬 수련생 when level gate met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(3, 3) };
    expect(getCurrentTitle(1500, ctx).title).toBe('보컬 수련생');
  });

  // 발성 장인: 8 at Lv5
  it('blocks 발성 장인 when level gate not met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(7, 5) }; // need 8
    expect(getCurrentTitle(8000, ctx).title).toBe('보컬 수련생');
  });

  it('grants 발성 장인 when level gate met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(8, 5) };
    expect(getCurrentTitle(8000, ctx).title).toBe('발성 장인');
  });

  // 가왕: 12 at Lv7
  it('blocks 가왕 when level gate not met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(11, 7) }; // need 12
    // Falls back to 발성 장인 (11 at lv7 >= 8 at lv5)
    expect(getCurrentTitle(25000, ctx).title).toBe('발성 장인');
  });

  it('grants 가왕 when both XP and level gate met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(12, 7) };
    expect(getCurrentTitle(25000, ctx).title).toBe('가왕');
  });

  // 비르투오소: 18 at Lv9
  it('blocks 비르투오소 when level gate not met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(17, 9) }; // need 18
    // Falls back to 가왕 (17 at lv9 >= 12 at lv7)
    expect(getCurrentTitle(100000, ctx).title).toBe('가왕');
  });

  it('grants 비르투오소 when fully qualified', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(18, 9) };
    expect(getCurrentTitle(100000, ctx).title).toBe('비르투오소');
  });

  it('higher-level exercises count toward lower gates', () => {
    // 12 exercises at lv8 satisfy the lv7 gate for 가왕
    const ctx: TitleContext = { exerciseLevels: makeLevels(12, 8) };
    expect(getCurrentTitle(25000, ctx).title).toBe('가왕');
  });
});

describe('getNextTitle', () => {
  it('returns 목소리 탐험가 as next for 0 XP', () => {
    const next = getNextTitle(0);
    expect(next).not.toBeNull();
    expect(next!.title.title).toBe('목소리 탐험가');
    expect(next!.xpNeeded).toBe(200);
  });

  it('returns correct xpNeeded for mid-tier XP', () => {
    const next = getNextTitle(300);
    expect(next).not.toBeNull();
    expect(next!.title.title).toBe('소리 여행자');
    expect(next!.xpNeeded).toBe(300);
  });

  it('returns null at the highest tier (lenient)', () => {
    expect(getNextTitle(100000)).toBeNull();
    expect(getNextTitle(150000)).toBeNull();
  });

  it('includes levelNeeded when XP sufficient but levels lacking', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(5, 5) }; // need 8 at lv5
    const next = getNextTitle(8000, ctx);
    expect(next).not.toBeNull();
    expect(next!.title.title).toBe('발성 장인');
    expect(next!.xpNeeded).toBe(0);
    expect(next!.levelNeeded).toBeDefined();
    expect(next!.levelNeeded!.minLevel).toBe(5);
    expect(next!.levelNeeded!.minExercises).toBe(8);
    expect(next!.levelNeeded!.current).toBe(5);
  });

  it('includes levelNeeded for next title when its gate is not met', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(8, 5) };
    // 발성 장인 is current (8 at Lv5 met), next is 가왕 (12 at Lv7)
    const next = getNextTitle(8000, ctx);
    expect(next).not.toBeNull();
    expect(next!.title.title).toBe('가왕');
    expect(next!.xpNeeded).toBe(17000); // 25000 - 8000
    expect(next!.levelNeeded).toBeDefined(); // lv7 gate not met with lv5 exercises
  });
});

describe('getTitleProgress', () => {
  it('returns 0 at exact tier boundary start', () => {
    expect(getTitleProgress(0)).toBe(0);
  });

  it('returns 100 at highest tier (lenient)', () => {
    expect(getTitleProgress(100000)).toBe(100);
    expect(getTitleProgress(150000)).toBe(100);
  });

  it('returns value between 0 and 100 mid-tier', () => {
    // 100 XP out of 200 range (0→200) = 50%
    const p = getTitleProgress(100);
    expect(p).toBe(50);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
  });

  it('returns correct progress near boundary', () => {
    // 199 out of 200 range = 100% rounded
    expect(getTitleProgress(199)).toBe(100);
    // 1 out of 200 range = 1% rounded
    expect(getTitleProgress(1)).toBe(1);
  });

  it('handles all tier boundaries', () => {
    for (let i = 0; i < TITLES.length - 1; i++) {
      const boundary = TITLES[i].minXP;
      const progress = getTitleProgress(boundary);
      expect(progress).toBe(0);
    }
  });

  it('caps at 100% when XP exceeds next tier but level gate blocks', () => {
    const ctx: TitleContext = { exerciseLevels: makeLevels(2, 3) };
    // XP 10000 > 1500 but only 2 at lv3 (need 3 for 보컬 수련생)
    // Current stays at 소리 여행자, progress overflows → caps at 100%
    const p = getTitleProgress(10000, ctx);
    expect(p).toBe(100);
  });
});
