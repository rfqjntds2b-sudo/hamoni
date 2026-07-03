import { describe, it, expect } from 'vitest';
import { generateScaleSequence, SCALE_PATTERNS } from '@/lib/vocal-training/scale-generator';
import type { Prescription } from '@/lib/vocal-training/types';

// ─── Helper ─────────────────────────────────────────────

function mockPrescription(overrides?: Partial<Prescription>): Prescription {
  return {
    targetVowel: 'a',
    vowelDescription: '아',
    larynxPosition: 'neutral',
    larynxGuide: 'test',
    feedbackMessage: 'test',
    tempo: 100,
    scaleType: 'stepwise',
    practiceRange: { low: 48, high: 72 }, // C3 to C5
    enableSOVT: false,
    difficultyLevel: 5,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────

describe('generateScaleSequence', () => {
  // 1. Stepwise pattern: adjacent notes ≤ 2 semitones
  describe('stepwise pattern', () => {
    it('should have adjacent note intervals of at most 2 semitones', () => {
      const seq = generateScaleSequence(mockPrescription({ scaleType: 'stepwise' }));

      for (const set of seq.sets) {
        for (let i = 1; i < set.notes.length; i++) {
          const interval = Math.abs(set.notes[i].midi - set.notes[i - 1].midi);
          expect(interval).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  // 2. Arpeggio pattern: should contain 3rd/5th/octave intervals
  describe('arpeggio pattern', () => {
    it('should contain intervals of a 3rd (4 semitones) and 5th (7 semitones)', () => {
      const seq = generateScaleSequence(
        mockPrescription({ scaleType: 'arpeggio', difficultyLevel: 5 }),
      );

      for (const set of seq.sets) {
        const intervalsFromRoot = set.notes.map((n) => n.midi - set.startMidi);
        expect(intervalsFromRoot).toContain(4); // major 3rd
        expect(intervalsFromRoot).toContain(7); // perfect 5th
      }
    });

    it('should contain octave interval (12 semitones) at high difficulty', () => {
      const seq = generateScaleSequence(
        mockPrescription({ scaleType: 'arpeggio', difficultyLevel: 7 }),
      );

      for (const set of seq.sets) {
        const intervalsFromRoot = set.notes.map((n) => n.midi - set.startMidi);
        expect(intervalsFromRoot).toContain(12); // octave
      }
    });
  });

  // 3. Range validation: no note exceeds practiceRange
  describe('range validation', () => {
    it('should never produce a note MIDI above practiceRange.high', () => {
      const prescription = mockPrescription({
        practiceRange: { low: 48, high: 65 },
      });
      const seq = generateScaleSequence(prescription);

      for (const set of seq.sets) {
        for (const note of set.notes) {
          expect(note.midi).toBeLessThanOrEqual(65);
        }
      }
    });

    it('should never produce a note MIDI below practiceRange.low', () => {
      const prescription = mockPrescription({
        practiceRange: { low: 50, high: 72 },
      });
      const seq = generateScaleSequence(prescription);

      for (const set of seq.sets) {
        for (const note of set.notes) {
          expect(note.midi).toBeGreaterThanOrEqual(50);
        }
      }
    });

    it('should handle a very narrow range without crashing', () => {
      const prescription = mockPrescription({
        practiceRange: { low: 60, high: 62 },
        difficultyLevel: 1,
      });
      const seq = generateScaleSequence(prescription);
      expect(seq.sets.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 4. Vowel modification map: notes in range get correct vowel
  describe('vowel modification map', () => {
    it('should assign the mapped vowel to notes within the entry range', () => {
      const prescription = mockPrescription({
        practiceRange: { low: 48, high: 72 },
        vowelModificationMap: [
          { startMidi: 60, endMidi: 66, vowel: 'o', vowelKorean: '오' },
        ],
      });
      const seq = generateScaleSequence(prescription);

      for (const set of seq.sets) {
        for (const note of set.notes) {
          if (note.midi >= 60 && note.midi <= 66) {
            expect(note.vowel).toBe('o');
            expect(note.vowelKorean).toBe('오');
          }
        }
      }
    });

    it('should apply the correct vowel from multiple map entries', () => {
      const prescription = mockPrescription({
        practiceRange: { low: 48, high: 72 },
        vowelModificationMap: [
          { startMidi: 48, endMidi: 55, vowel: 'u', vowelKorean: '우' },
          { startMidi: 60, endMidi: 72, vowel: 'e', vowelKorean: '에' },
        ],
      });
      const seq = generateScaleSequence(prescription);

      for (const set of seq.sets) {
        for (const note of set.notes) {
          if (note.midi >= 48 && note.midi <= 55) {
            expect(note.vowel).toBe('u');
            expect(note.vowelKorean).toBe('우');
          }
          if (note.midi >= 60 && note.midi <= 72) {
            expect(note.vowel).toBe('e');
            expect(note.vowelKorean).toBe('에');
          }
        }
      }
    });
  });

  // 5. Default vowel: notes without a matching map entry use targetVowel
  describe('default vowel', () => {
    it('should use targetVowel when no vowelModificationMap is provided', () => {
      const seq = generateScaleSequence(
        mockPrescription({ targetVowel: 'i' }),
      );

      for (const set of seq.sets) {
        for (const note of set.notes) {
          expect(note.vowel).toBe('i');
          expect(note.vowelKorean).toBe('이');
        }
      }
    });

    it('should use targetVowel for notes outside all map entries', () => {
      const prescription = mockPrescription({
        targetVowel: 'a',
        practiceRange: { low: 48, high: 72 },
        vowelModificationMap: [
          { startMidi: 65, endMidi: 72, vowel: 'o', vowelKorean: '오' },
        ],
      });
      const seq = generateScaleSequence(prescription);

      for (const set of seq.sets) {
        for (const note of set.notes) {
          if (note.midi < 65) {
            expect(note.vowel).toBe('a');
            expect(note.vowelKorean).toBe('아');
          }
        }
      }
    });
  });

  // 6. Tempo to duration: noteDuration matches BPM calculation
  describe('tempo to duration', () => {
    it('should set noteDuration to 60/bpm * 1000 ms for quarter notes', () => {
      const bpm = 120;
      const expectedMs = Math.round((60 / bpm) * 1000); // 500ms
      const seq = generateScaleSequence(mockPrescription({ tempo: bpm }));

      for (const set of seq.sets) {
        for (const note of set.notes) {
          expect(note.durationMs).toBe(expectedMs);
        }
      }
    });

    it('should produce longer durations at slower tempos', () => {
      const slow = generateScaleSequence(mockPrescription({ tempo: 60 }));
      const fast = generateScaleSequence(mockPrescription({ tempo: 120 }));

      const slowDuration = slow.sets[0].notes[0].durationMs;
      const fastDuration = fast.sets[0].notes[0].durationMs;

      expect(slowDuration).toBeGreaterThan(fastDuration);
      expect(slowDuration).toBe(Math.round((60 / 60) * 1000));  // 1000ms
      expect(fastDuration).toBe(Math.round((60 / 120) * 1000)); // 500ms
    });
  });

  // 7. Rest between sets: each set except last has restAfterMs = 2000
  describe('rest between sets', () => {
    it('should have restAfterMs = 2000 for all sets except the last', () => {
      const seq = generateScaleSequence(mockPrescription());

      expect(seq.sets.length).toBeGreaterThan(1);

      for (let i = 0; i < seq.sets.length - 1; i++) {
        expect(seq.sets[i].restAfterMs).toBe(2000);
      }
    });

    it('should have restAfterMs = 0 for the last set', () => {
      const seq = generateScaleSequence(mockPrescription());

      const lastSet = seq.sets[seq.sets.length - 1];
      expect(lastSet.restAfterMs).toBe(0);
    });
  });

  // 8. Ascending + descending key sequence
  describe('ascending + descending key sequence', () => {
    it('should ascend by consistent step then descend back forming a palindrome', () => {
      const seq = generateScaleSequence(mockPrescription());
      const startMidis = seq.sets.map((s) => s.startMidi);

      expect(startMidis.length).toBeGreaterThan(2);

      // Find the peak (highest startMidi)
      const peakIndex = startMidis.indexOf(Math.max(...startMidis));

      // Ascending portion: each step should be a consistent positive interval
      const ascStep = startMidis[1] - startMidis[0];
      expect(ascStep).toBeGreaterThanOrEqual(1);
      for (let i = 1; i <= peakIndex; i++) {
        expect(startMidis[i]).toBe(startMidis[i - 1] + ascStep);
      }

      // Descending portion: each step should be the same interval, negated
      for (let i = peakIndex + 1; i < startMidis.length; i++) {
        expect(startMidis[i]).toBe(startMidis[i - 1] - ascStep);
      }
    });

    it('should use semitone steps when range fits within max sets', () => {
      // Narrow range that won't exceed the cap
      const seq = generateScaleSequence(
        mockPrescription({ practiceRange: { low: 48, high: 56 } }),
      );
      const startMidis = seq.sets.map((s) => s.startMidi);

      // With stepwise5 (max interval 7), only 48 fits: 48+7=55≤56.
      // Actually 48 and 49 fit: 49+7=56≤56.
      // So ascending: [48, 49], descending: [48] → 3 total, well under cap.
      for (let i = 1; i < startMidis.length; i++) {
        const diff = Math.abs(startMidis[i] - startMidis[i - 1]);
        expect(diff).toBe(1);
      }
    });

    it('should start and end on the same MIDI note', () => {
      const seq = generateScaleSequence(mockPrescription());
      const startMidis = seq.sets.map((s) => s.startMidi);

      expect(startMidis[0]).toBe(startMidis[startMidis.length - 1]);
    });
  });

  // 9. Low difficulty (1-3) should use stepwise3
  describe('low difficulty pattern selection', () => {
    it.each([1, 2, 3])('difficulty %i should use stepwise3 pattern', (level) => {
      const seq = generateScaleSequence(
        mockPrescription({ difficultyLevel: level, scaleType: 'stepwise' }),
      );
      expect(seq.patternName).toBe(SCALE_PATTERNS.stepwise3.nameKorean);

      // stepwise3 intervals are [0, 2, 4, 2, 0] => 5 notes per set
      for (const set of seq.sets) {
        expect(set.notes.length).toBe(SCALE_PATTERNS.stepwise3.intervals.length);
      }
    });
  });

  // 10. High difficulty (6+) should use stepwiseFull
  describe('high difficulty pattern selection', () => {
    it.each([6, 7, 8, 9, 10])('difficulty %i should use stepwiseFull pattern', (level) => {
      const seq = generateScaleSequence(
        mockPrescription({ difficultyLevel: level, scaleType: 'stepwise' }),
      );
      expect(seq.patternName).toBe(SCALE_PATTERNS.stepwiseFull.nameKorean);

      // stepwiseFull intervals are [0,2,4,5,7,9,11,12,11,9,7,5,4,2,0] => 15 notes
      for (const set of seq.sets) {
        expect(set.notes.length).toBe(SCALE_PATTERNS.stepwiseFull.intervals.length);
      }
    });
  });

  // ─── Additional coverage ──────────────────────────────

  describe('sequence metadata', () => {
    it('should pass through scaleType and tempo from the prescription', () => {
      const seq = generateScaleSequence(
        mockPrescription({ scaleType: 'arpeggio', tempo: 80, difficultyLevel: 5 }),
      );
      expect(seq.scaleType).toBe('arpeggio');
      expect(seq.tempo).toBe(80);
    });

    it('should have totalDurationMs > 0', () => {
      const seq = generateScaleSequence(mockPrescription());
      expect(seq.totalDurationMs).toBeGreaterThan(0);
    });

    it('should assign sequential setIndex values', () => {
      const seq = generateScaleSequence(mockPrescription());
      seq.sets.forEach((set, i) => {
        expect(set.setIndex).toBe(i);
      });
    });
  });

  describe('note frequency', () => {
    it('should set frequency matching 440 * 2^((midi-69)/12)', () => {
      const seq = generateScaleSequence(mockPrescription());
      for (const set of seq.sets) {
        for (const note of set.notes) {
          const expected = 440 * Math.pow(2, (note.midi - 69) / 12);
          expect(note.frequency).toBeCloseTo(expected, 2);
        }
      }
    });
  });

  describe('mid difficulty pattern selection', () => {
    it.each([4, 5])('difficulty %i with stepwise should use major or minor stepwise5', (level) => {
      const seq = generateScaleSequence(
        mockPrescription({ difficultyLevel: level, scaleType: 'stepwise' }),
      );
      // Alternates between major and minor for tonal variety
      const validNames = [
        SCALE_PATTERNS.stepwise5.nameKorean,
        SCALE_PATTERNS.minorStepwise5.nameKorean,
      ];
      expect(validNames).toContain(seq.patternName);
    });
  });
});
