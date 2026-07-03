// ============================================================
// Korean Vowel Formant Reference Data
// ============================================================
// Standard F1/F2 values for the 5 primary Korean vowels.
// Based on published Korean phonetics data (adult male reference).
// Female formants are typically ~15-20% higher.

export interface VowelTarget {
  /** Korean character */
  label: string;
  /** Romanization for accessibility */
  labelRoman: string;
  /** Center F1 in Hz */
  f1: number;
  /** Center F2 in Hz */
  f2: number;
  /** Acceptable zone radius in Hz (Euclidean distance in F1/F2 space) */
  tolerance: number;
}

export const KOREAN_VOWELS: VowelTarget[] = [
  { label: '아', labelRoman: 'a', f1: 750, f2: 1250, tolerance: 120 },
  { label: '에', labelRoman: 'e', f1: 500, f2: 1800, tolerance: 100 },
  { label: '이', labelRoman: 'i', f1: 300, f2: 2300, tolerance: 100 },
  { label: '오', labelRoman: 'o', f1: 450, f2: 900,  tolerance: 100 },
  { label: '우', labelRoman: 'u', f1: 350, f2: 800,  tolerance: 100 },
];

/** Find the nearest Korean vowel to given F1/F2 values */
export function findNearestVowel(
  f1: number,
  f2: number,
): { vowel: VowelTarget; distance: number } {
  let best = KOREAN_VOWELS[0];
  let bestDist = Infinity;

  for (const v of KOREAN_VOWELS) {
    const dist = Math.sqrt((f1 - v.f1) ** 2 + (f2 - v.f2) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      best = v;
    }
  }

  return { vowel: best, distance: bestDist };
}
