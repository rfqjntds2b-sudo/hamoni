// ============================================================
// Vowel Targets — F1/F2 reference values per language
// ============================================================
// Korean: Yang (1996), Shin et al. (2012)
// Japanese: Keating & Huffman (1984), Hirahara & Kato (1992)
// English: Hillenbrand et al. (1995), Peterson & Barney (1952)
//
// Each language has distinct vowel positions in F1/F2 space.
// e.g. Japanese /u/ is unrounded (central) vs Korean /ㅜ/ (rounded, back).

export type VowelLang = 'ko' | 'en' | 'ja';

export interface VowelTarget {
  label: string;
  roman: string;
  f1Male: number;
  f2Male: number;
  f1Female: number;
  f2Female: number;
  toleranceF1: number;
  toleranceF2: number;
  tint: [number, number, number]; // RGB accent color
}

// ── Korean 5 vowels (ㅏ ㅔ ㅣ ㅗ ㅜ) ──
const KOREAN_VOWELS: VowelTarget[] = [
  { label: 'ㅏ', roman: 'a',  f1Male: 750, f2Male: 1200, f1Female: 850, f2Female: 1400, toleranceF1: 65, toleranceF2: 130, tint: [220, 160, 60] },
  { label: 'ㅔ', roman: 'e',  f1Male: 500, f2Male: 1800, f1Female: 580, f2Female: 2050, toleranceF1: 65, toleranceF2: 130, tint: [190, 145, 80] },
  { label: 'ㅣ', roman: 'i',  f1Male: 300, f2Male: 2200, f1Female: 340, f2Female: 2600, toleranceF1: 55, toleranceF2: 130, tint: [160, 130, 200] },
  { label: 'ㅗ', roman: 'o',  f1Male: 400, f2Male: 850,  f1Female: 450, f2Female: 950,  toleranceF1: 60, toleranceF2: 120, tint: [130, 170, 160] },
  { label: 'ㅜ', roman: 'u',  f1Male: 320, f2Male: 1000, f1Female: 370, f2Female: 1100, toleranceF1: 55, toleranceF2: 120, tint: [140, 155, 190] },
];

// ── Japanese 5 vowels (あ い う え お) ──
// Key differences from Korean:
//   - /u/ (う) is unrounded and more central (higher F2 than Korean ㅜ)
//   - /e/ (え) is more open than Korean ㅔ (higher F1)
//   - /o/ (お) is slightly more front than Korean ㅗ
const JAPANESE_VOWELS: VowelTarget[] = [
  { label: 'あ', roman: 'a',  f1Male: 720, f2Male: 1250, f1Female: 830, f2Female: 1450, toleranceF1: 70, toleranceF2: 130, tint: [220, 150, 65] },
  { label: 'い', roman: 'i',  f1Male: 310, f2Male: 2150, f1Female: 360, f2Female: 2550, toleranceF1: 55, toleranceF2: 140, tint: [165, 125, 200] },
  { label: 'う', roman: 'u',  f1Male: 370, f2Male: 1400, f1Female: 420, f2Female: 1550, toleranceF1: 65, toleranceF2: 150, tint: [140, 160, 195] },
  { label: 'え', roman: 'e',  f1Male: 530, f2Male: 1750, f1Female: 600, f2Female: 2000, toleranceF1: 65, toleranceF2: 130, tint: [195, 150, 75] },
  { label: 'お', roman: 'o',  f1Male: 450, f2Male: 900,  f1Female: 510, f2Female: 1000, toleranceF1: 65, toleranceF2: 120, tint: [130, 175, 155] },
];

// ── English 5 cardinal vowels (approximate: /ɑ/ /ɛ/ /i/ /oʊ/ /u/) ──
// Mapped to practical AEIOU that singers use.
// English vowels are more spread than Korean/Japanese.
// Key differences:
//   - /æ/ (A as in "cat") has very high F1 + high F2 — unique to English
//   - /ɛ/ (E as in "bed") is more open than Korean ㅔ or Japanese え
//   - /u/ is further back and more rounded than Japanese う
const ENGLISH_VOWELS: VowelTarget[] = [
  { label: 'A',  roman: 'ɑ',  f1Male: 730, f2Male: 1090, f1Female: 850, f2Female: 1220, toleranceF1: 70, toleranceF2: 130, tint: [220, 155, 55] },
  { label: 'E',  roman: 'ɛ',  f1Male: 580, f2Male: 1800, f1Female: 660, f2Female: 2050, toleranceF1: 70, toleranceF2: 140, tint: [195, 145, 85] },
  { label: 'I',  roman: 'i',  f1Male: 280, f2Male: 2250, f1Female: 310, f2Female: 2790, toleranceF1: 55, toleranceF2: 150, tint: [155, 130, 205] },
  { label: 'O',  roman: 'oʊ', f1Male: 500, f2Male: 910,  f1Female: 560, f2Female: 1000, toleranceF1: 65, toleranceF2: 120, tint: [135, 170, 155] },
  { label: 'U',  roman: 'u',  f1Male: 310, f2Male: 870,  f1Female: 360, f2Female: 950,  toleranceF1: 55, toleranceF2: 120, tint: [140, 150, 195] },
];

// ── Language map ──
const VOWEL_MAP: Record<VowelLang, VowelTarget[]> = {
  ko: KOREAN_VOWELS,
  ja: JAPANESE_VOWELS,
  en: ENGLISH_VOWELS,
};

export function getVowelsForLang(lang: VowelLang): VowelTarget[] {
  return VOWEL_MAP[lang];
}

// Re-export for backward compat
export { KOREAN_VOWELS, JAPANESE_VOWELS, ENGLISH_VOWELS };

// ── Nearest vowel finder ──

interface NearestVowelResult {
  vowel: VowelTarget;
  distance: number;
  inZone: boolean;
}

export function findNearestVowel(
  f1: number,
  f2: number,
  gender: 'male' | 'female',
  lang: VowelLang = 'ko',
): NearestVowelResult {
  const vowels = getVowelsForLang(lang);
  let bestDistance = Infinity;
  let bestVowel = vowels[0];
  let bestInZone = false;

  for (const vowel of vowels) {
    const targetF1 = gender === 'male' ? vowel.f1Male : vowel.f1Female;
    const targetF2 = gender === 'male' ? vowel.f2Male : vowel.f2Female;

    const dF1 = f1 - targetF1;
    const dF2 = f2 - targetF2;
    const distance = Math.sqrt(dF1 * dF1 + dF2 * dF2);

    const normalizedF1 = dF1 / vowel.toleranceF1;
    const normalizedF2 = dF2 / vowel.toleranceF2;
    const inZone = (normalizedF1 * normalizedF1 + normalizedF2 * normalizedF2) <= 1.0;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestVowel = vowel;
      bestInZone = inZone;
    }
  }

  return { vowel: bestVowel, distance: Math.round(bestDistance), inZone: bestInZone };
}

export function getVowelTarget(
  vowel: VowelTarget,
  gender: 'male' | 'female',
): { f1: number; f2: number } {
  return {
    f1: gender === 'male' ? vowel.f1Male : vowel.f1Female,
    f2: gender === 'male' ? vowel.f2Male : vowel.f2Female,
  };
}
