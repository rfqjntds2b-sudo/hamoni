import { describe, it, expect } from 'vitest';
import { calculateBaseXP, calculateXPWithBonuses } from '../xp';

// ============================================================
// calculateBaseXP
// ============================================================

describe('calculateBaseXP', () => {
  it('humming Lv.1: 10 + 1*3*1 = 13', () => {
    // humming difficulty=1, level=1
    expect(calculateBaseXP('humming', 1)).toBe(13);
  });

  it('messa Lv.5: 10 + 5*3*5 = 85', () => {
    // messa difficulty=5, level=5
    expect(calculateBaseXP('messa', 5)).toBe(85);
  });

  it('breathing Lv.1: 10 + 1*3*1 = 13', () => {
    // breathing difficulty=1, level=1
    expect(calculateBaseXP('breathing', 1)).toBe(13);
  });

  it('vfe Lv.3: 10 + 3*3*4 = 46', () => {
    // vfe difficulty=4, level=3
    expect(calculateBaseXP('vfe', 3)).toBe(46);
  });
});

// ============================================================
// calculateXPWithBonuses — pass scenarios
// ============================================================

describe('calculateXPWithBonuses — pass', () => {
  it('basic pass: no bonuses → just baseXP', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: true,
      streak: 0,
      allGreen: false,
      isPersonalRecord: false,
      isLevelUp: false,
    });

    expect(result.baseXP).toBe(13);
    expect(result.bonuses).toHaveLength(0);
    expect(result.totalXP).toBe(13);
  });

  it('streak 7 days bonus: baseXP * 1.2', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: true,
      streak: 7,
      allGreen: false,
      isPersonalRecord: false,
      isLevelUp: false,
    });

    // baseXP=13, total = 13 * 1.2 = 15.6 → floor → 15
    expect(result.totalXP).toBe(15);
    expect(result.bonuses.some((b) => b.label === 'streak' && b.isMultiplier)).toBe(true);
  });

  it('streak 30 days bonus: baseXP * 1.5 (takes highest tier only)', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: true,
      streak: 30,
      allGreen: false,
      isPersonalRecord: false,
      isLevelUp: false,
    });

    // baseXP=13, total = 13 * 1.5 = 19.5 → floor → 19
    expect(result.totalXP).toBe(19);
  });

  it('all-green bonus: baseXP * 1.5', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: true,
      streak: 0,
      allGreen: true,
      isPersonalRecord: false,
      isLevelUp: false,
    });

    // baseXP=13, total = 13 * 1.5 = 19.5 → floor → 19
    expect(result.totalXP).toBe(19);
  });

  it('combined: 7-day streak + all-green = baseXP * 1.7', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: true,
      streak: 7,
      allGreen: true,
      isPersonalRecord: false,
      isLevelUp: false,
    });

    // baseXP=13, total = 13 * 1.7 = 22.1 → floor → 22
    expect(result.totalXP).toBe(22);
  });

  it('PR bonus: +10 flat', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: true,
      streak: 0,
      allGreen: false,
      isPersonalRecord: true,
      isLevelUp: false,
    });

    // baseXP=13 + 10 = 23
    expect(result.totalXP).toBe(23);
    expect(result.bonuses.some((b) => b.label === 'personalRecord' && !b.isMultiplier)).toBe(true);
  });

  it('level-up bonus: +50 flat', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: true,
      streak: 0,
      allGreen: false,
      isPersonalRecord: false,
      isLevelUp: true,
    });

    // baseXP=13 + 50 = 63
    expect(result.totalXP).toBe(63);
    expect(result.bonuses.some((b) => b.label === 'levelUp' && !b.isMultiplier)).toBe(true);
  });

  it('all bonuses combined', () => {
    const result = calculateXPWithBonuses('messa', 5, {
      passed: true,
      streak: 30,
      allGreen: true,
      isPersonalRecord: true,
      isLevelUp: true,
    });

    // baseXP = 10 + 5*3*5 = 85
    // multiplier = 1.0 + 0.5 (streak 30d) + 0.5 (allGreen) = 2.0
    // multiplied = 85 * 2.0 = 170
    // flat = +10 (PR) + 50 (levelUp) = +60
    // total = 170 + 60 = 230
    expect(result.baseXP).toBe(85);
    expect(result.totalXP).toBe(230);
  });
});

// ============================================================
// calculateXPWithBonuses — failure scenario
// ============================================================

describe('calculateXPWithBonuses — failure', () => {
  it('failure: floor(baseXP * 0.2), no bonuses', () => {
    const result = calculateXPWithBonuses('humming', 1, {
      passed: false,
      streak: 30,
      allGreen: true,
      isPersonalRecord: true,
      isLevelUp: true,
    });

    // baseXP=13, failure = floor(13 * 0.2) = floor(2.6) = 2
    // All bonuses ignored on failure
    expect(result.baseXP).toBe(13);
    expect(result.bonuses).toHaveLength(0);
    expect(result.totalXP).toBe(2);
  });

  it('failure with higher base XP', () => {
    const result = calculateXPWithBonuses('messa', 5, {
      passed: false,
      streak: 0,
      allGreen: false,
      isPersonalRecord: false,
      isLevelUp: false,
    });

    // baseXP = 85, failure = floor(85 * 0.2) = floor(17) = 17
    expect(result.totalXP).toBe(17);
    expect(result.bonuses).toHaveLength(0);
  });
});
