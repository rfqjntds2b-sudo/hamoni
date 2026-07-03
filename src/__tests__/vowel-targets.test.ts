import { describe, it, expect } from 'vitest';
import {
  findNearestVowel,
  getVowelsForLang,
  KOREAN_VOWELS,
  JAPANESE_VOWELS,
  ENGLISH_VOWELS,
} from '@/lib/voice/vowel-targets';

describe('findNearestVowel — Korean', () => {
  it('identifies ㅏ for male at F1=750, F2=1200', () => {
    const r = findNearestVowel(750, 1200, 'male', 'ko');
    expect(r.vowel.label).toBe('ㅏ');
    expect(r.inZone).toBe(true);
  });

  it('identifies ㅣ for male at F1=300, F2=2200', () => {
    const r = findNearestVowel(300, 2200, 'male', 'ko');
    expect(r.vowel.label).toBe('ㅣ');
    expect(r.inZone).toBe(true);
  });

  it('identifies ㅜ for male at F1=320, F2=1000', () => {
    const r = findNearestVowel(320, 1000, 'male', 'ko');
    expect(r.vowel.label).toBe('ㅜ');
    expect(r.inZone).toBe(true);
  });

  it('identifies ㅗ for male at F1=400, F2=850', () => {
    const r = findNearestVowel(400, 850, 'male', 'ko');
    expect(r.vowel.label).toBe('ㅗ');
    expect(r.inZone).toBe(true);
  });

  it('identifies ㅔ for male at F1=500, F2=1800', () => {
    const r = findNearestVowel(500, 1800, 'male', 'ko');
    expect(r.vowel.label).toBe('ㅔ');
    expect(r.inZone).toBe(true);
  });

  it('identifies ㅏ for female at F1=850, F2=1400', () => {
    const r = findNearestVowel(850, 1400, 'female', 'ko');
    expect(r.vowel.label).toBe('ㅏ');
    expect(r.inZone).toBe(true);
  });

  it('reports out of zone for distant F1/F2', () => {
    const r = findNearestVowel(600, 1500, 'male', 'ko');
    expect(r.inZone).toBe(false);
    expect(r.distance).toBeGreaterThan(0);
  });

  it('distance is 0 for exact target match', () => {
    const r = findNearestVowel(750, 1200, 'male', 'ko');
    expect(r.distance).toBe(0);
  });

  it('has 5 Korean vowels', () => {
    expect(KOREAN_VOWELS).toHaveLength(5);
    expect(KOREAN_VOWELS.map((v) => v.label)).toEqual(['ㅏ', 'ㅔ', 'ㅣ', 'ㅗ', 'ㅜ']);
  });
});

describe('findNearestVowel — Japanese', () => {
  it('identifies あ for male at F1=720, F2=1250', () => {
    const r = findNearestVowel(720, 1250, 'male', 'ja');
    expect(r.vowel.label).toBe('あ');
    expect(r.inZone).toBe(true);
  });

  it('identifies う for male at F1=370, F2=1400 (unrounded, central)', () => {
    const r = findNearestVowel(370, 1400, 'male', 'ja');
    expect(r.vowel.label).toBe('う');
    expect(r.inZone).toBe(true);
  });

  it('Japanese う is more central than Korean ㅜ', () => {
    const jaU = JAPANESE_VOWELS.find((v) => v.label === 'う')!;
    const koU = KOREAN_VOWELS.find((v) => v.label === 'ㅜ')!;
    // Japanese う has higher F2 (more front/central) than Korean ㅜ
    expect(jaU.f2Male).toBeGreaterThan(koU.f2Male);
  });

  it('has 5 Japanese vowels', () => {
    expect(JAPANESE_VOWELS).toHaveLength(5);
    expect(JAPANESE_VOWELS.map((v) => v.label)).toEqual(['あ', 'い', 'う', 'え', 'お']);
  });
});

describe('findNearestVowel — English', () => {
  it('identifies I for male at F1=280, F2=2250', () => {
    const r = findNearestVowel(280, 2250, 'male', 'en');
    expect(r.vowel.label).toBe('I');
    expect(r.inZone).toBe(true);
  });

  it('identifies U for male at F1=310, F2=870 (back, rounded)', () => {
    const r = findNearestVowel(310, 870, 'male', 'en');
    expect(r.vowel.label).toBe('U');
    expect(r.inZone).toBe(true);
  });

  it('English U is further back than Japanese う', () => {
    const enU = ENGLISH_VOWELS.find((v) => v.label === 'U')!;
    const jaU = JAPANESE_VOWELS.find((v) => v.label === 'う')!;
    // English U has lower F2 (more back) than Japanese う
    expect(enU.f2Male).toBeLessThan(jaU.f2Male);
  });

  it('has 5 English vowels', () => {
    expect(ENGLISH_VOWELS).toHaveLength(5);
    expect(ENGLISH_VOWELS.map((v) => v.label)).toEqual(['A', 'E', 'I', 'O', 'U']);
  });
});

describe('getVowelsForLang', () => {
  it('returns correct vowels per language', () => {
    expect(getVowelsForLang('ko')).toBe(KOREAN_VOWELS);
    expect(getVowelsForLang('ja')).toBe(JAPANESE_VOWELS);
    expect(getVowelsForLang('en')).toBe(ENGLISH_VOWELS);
  });

  it('all vowels have tint field', () => {
    for (const lang of ['ko', 'ja', 'en'] as const) {
      for (const v of getVowelsForLang(lang)) {
        expect(v.tint).toHaveLength(3);
        expect(v.tint[0]).toBeGreaterThan(0);
      }
    }
  });

  it('all vowels have roman field', () => {
    for (const lang of ['ko', 'ja', 'en'] as const) {
      for (const v of getVowelsForLang(lang)) {
        expect(v.roman.length).toBeGreaterThan(0);
      }
    }
  });
});
