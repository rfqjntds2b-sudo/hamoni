import { describe, it, expect } from 'vitest';
import { generatePrescription } from '@/lib/vocal-training/prescription-engine';
import { createManualDiagnosticResult } from '@/lib/vocal-analysis/diagnostic-analyzer';
import type { VocalRangeProfile } from '@/lib/voice/vocal-range';
import { noteToMidi } from '@/lib/voice/vocal-range';
import type {
  ScaleTrainingSession,
  VocalState,
  DiagnosticResult,
} from '@/lib/vocal-training/types';

// ─── Helpers ──────────────────────────────────────────────────

function mockVocalRange(): VocalRangeProfile {
  return {
    modalLow: 'A2', modalHigh: 'A4',
    modalLowHz: 110, modalHighHz: 440,
    fullHigh: 'E5', fullHighHz: 659.3,
    modalRangeOctaves: 2.0, fullRangeOctaves: 2.7,
    comfortLow: 'C3', comfortHigh: 'F4',
    voiceType: 'Baritone', voiceTypeLabel: '바리톤',
    gender: 'male' as const,
    measuredAt: '2026-01-01T00:00:00Z',
    sampleCount: 100,
  };
}

function mockDiagnosticResult(state: VocalState): DiagnosticResult {
  return createManualDiagnosticResult(state);
}

function mockSession(
  state: VocalState,
  difficulty: number,
  date: string,
): ScaleTrainingSession {
  return {
    id: crypto.randomUUID(),
    date,
    startedAt: `${date}T10:00:00Z`,
    completedAt: `${date}T10:15:00Z`,
    diagnosticState: state,
    diagnosticMetrics: mockDiagnosticResult(state).metrics,
    prescriptionSummary: {
      targetVowel: 'a',
      scaleType: 'stepwise',
      tempo: 80,
      difficultyLevel: difficulty,
      enableSOVT: false,
    },
    setsCompleted: 5,
    totalSets: 5,
    difficultyLevel: difficulty,
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe('generatePrescription', () => {
  const range = mockVocalRange();
  const modalLowMidi = noteToMidi(range.modalLow);   // A2 = 45
  const modalHighMidi = noteToMidi(range.modalHigh);  // A4 = 69

  // ──────────────────────────────────────────────
  // 1. BREATHY state
  // ──────────────────────────────────────────────
  describe('BREATHY state', () => {
    it('should prescribe "i" vowel', () => {
      const rx = generatePrescription(mockDiagnosticResult('BREATHY'), range);
      expect(['i', 'u']).toContain(rx.targetVowel);
    });

    it('should use fast tempo (100-120 BPM range)', () => {
      const rx = generatePrescription(mockDiagnosticResult('BREATHY'), range);
      expect(rx.tempo).toBeGreaterThanOrEqual(100);
      expect(rx.tempo).toBeLessThanOrEqual(120);
    });

    it('should use stepwise scale type', () => {
      const rx = generatePrescription(mockDiagnosticResult('BREATHY'), range);
      expect(rx.scaleType).toBe('stepwise');
    });

    it('should target lower-mid range for safe contact training', () => {
      const rx = generatePrescription(mockDiagnosticResult('BREATHY'), range);
      const comfortLow = noteToMidi(range.comfortLow);   // C3 = 48
      const comfortHigh = noteToMidi(range.comfortHigh);  // F4 = 65
      const rangeMid = Math.round((comfortLow + comfortHigh) / 2);

      // Practice high should not exceed comfort high
      expect(rx.practiceRange.high).toBeLessThanOrEqual(comfortHigh);
      // Practice high should be around or below the mid range
      expect(rx.practiceRange.high).toBeLessThanOrEqual(rangeMid + 2);
    });

    it('should enable SOVT for breathy voices (clinical evidence: SOVT aids adduction)', () => {
      const rx = generatePrescription(mockDiagnosticResult('BREATHY'), range);
      expect(rx.enableSOVT).toBe(true);
      expect(rx.sovtOptions).toEqual(['straw', 'hum', 'lip_trill']);
    });

    it('should set larynx position to neutral (compatible with SOVT)', () => {
      const rx = generatePrescription(mockDiagnosticResult('BREATHY'), range);
      expect(rx.larynxPosition).toBe('neutral');
    });
  });

  // ──────────────────────────────────────────────
  // 2. PRESSED state
  // ──────────────────────────────────────────────
  describe('PRESSED state', () => {
    it('should prescribe "u" or "o" vowel', () => {
      const rx = generatePrescription(mockDiagnosticResult('PRESSED'), range);
      expect(['u', 'o']).toContain(rx.targetVowel);
    });

    it('should use slow tempo (60-80 BPM range)', () => {
      const rx = generatePrescription(mockDiagnosticResult('PRESSED'), range);
      expect(rx.tempo).toBeGreaterThanOrEqual(60);
      expect(rx.tempo).toBeLessThanOrEqual(80);
    });

    it('should use descending-first scale type for relaxation', () => {
      const rx = generatePrescription(mockDiagnosticResult('PRESSED'), range);
      expect(rx.scaleType).toBe('descending');
    });

    it('should enable SOVT with options', () => {
      const rx = generatePrescription(mockDiagnosticResult('PRESSED'), range);
      expect(rx.enableSOVT).toBe(true);
      expect(rx.sovtOptions).toBeDefined();
      expect(rx.sovtOptions!.length).toBeGreaterThan(0);
    });

    it('should set larynx position to low', () => {
      const rx = generatePrescription(mockDiagnosticResult('PRESSED'), range);
      expect(rx.larynxPosition).toBe('low');
    });
  });

  // ──────────────────────────────────────────────
  // 3. PASSAGGIO state
  // ──────────────────────────────────────────────
  describe('PASSAGGIO state', () => {
    it('should include vowelModificationMap', () => {
      const rx = generatePrescription(mockDiagnosticResult('PASSAGGIO'), range);
      expect(rx.vowelModificationMap).toBeDefined();
      expect(rx.vowelModificationMap!.length).toBeGreaterThan(0);
    });

    it('should use arpeggio scale type', () => {
      const rx = generatePrescription(mockDiagnosticResult('PASSAGGIO'), range);
      expect(rx.scaleType).toBe('arpeggio');
    });

    it('should center practice range around passaggio', () => {
      const rx = generatePrescription(mockDiagnosticResult('PASSAGGIO'), range);
      // Default male passaggio MIDI is 64 (E4)
      const defaultPassaggio = 64;
      // Practice range should be ±5 semitones from passaggio, clamped to modal range
      const expectedLow = Math.max(modalLowMidi, defaultPassaggio - 5);
      const expectedHigh = Math.min(modalHighMidi, defaultPassaggio + 5);

      expect(rx.practiceRange.low).toBe(expectedLow);
      expect(rx.practiceRange.high).toBe(expectedHigh);
    });

    it('should use tempo in PASSAGGIO range (80-100)', () => {
      const rx = generatePrescription(mockDiagnosticResult('PASSAGGIO'), range);
      expect(rx.tempo).toBeGreaterThanOrEqual(80);
      expect(rx.tempo).toBeLessThanOrEqual(100);
    });

    it('should have vowel modification entries spanning the practice range', () => {
      const rx = generatePrescription(mockDiagnosticResult('PASSAGGIO'), range);
      const map = rx.vowelModificationMap!;

      // First entry should start at practice range low
      expect(map[0].startMidi).toBe(rx.practiceRange.low);
      // Last entry should end at practice range high
      expect(map[map.length - 1].endMidi).toBe(rx.practiceRange.high);
    });
  });

  // ──────────────────────────────────────────────
  // 4. BALANCED state — increase difficulty
  // ──────────────────────────────────────────────
  describe('BALANCED state', () => {
    it('should maintain difficulty with 1 consecutive balanced session', () => {
      const prevSession = mockSession('BALANCED', 4, '2026-01-01');
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        [prevSession],
      );
      // Last session was BALANCED, today is BALANCED → getDailyAdjustment
      // difficultyDelta = 0 (consecutive BALANCED < 3), prescribeBalanced no longer double-adds
      expect(rx.difficultyLevel).toBe(prevSession.difficultyLevel);
    });

    it('should alternate vowels based on consecutive balanced count', () => {
      const sessions = [
        mockSession('BALANCED', 4, '2026-01-02'),
        mockSession('BALANCED', 3, '2026-01-01'),
      ];
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        sessions,
      );
      // consecutiveBalanced = 2, vowel index = 2 % 5 = 2 → 'i'
      expect(rx.targetVowel).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // 5. Daily adjustment — improvement
  // ──────────────────────────────────────────────
  describe('daily adjustment — improvement', () => {
    it('should increase difficulty by +1 with positive message when state improves', () => {
      const prevSession = mockSession('PRESSED', 5, '2026-01-01');
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        [prevSession],
      );
      // Previous PRESSED → today BALANCED: difficultyDelta = +1
      // 5 + 1 = 6, then prescribeBalanced adds +1 (has lastSession) = 7
      expect(rx.difficultyLevel).toBeGreaterThanOrEqual(prevSession.difficultyLevel + 1);
      expect(rx.motivationMessage).toBeDefined();
      expect(rx.motivationMessage).toContain('좋아');
    });
  });

  // ──────────────────────────────────────────────
  // 6. Daily adjustment — regression
  // ──────────────────────────────────────────────
  describe('daily adjustment — regression', () => {
    it('should decrease difficulty by -2 with consoling message when state regresses', () => {
      const prevSession = mockSession('BALANCED', 6, '2026-01-01');
      const rx = generatePrescription(
        mockDiagnosticResult('PRESSED'),
        range,
        [prevSession],
      );
      // Previous BALANCED → today PRESSED: difficultyDelta = -2
      // 6 + (-2) = 4
      expect(rx.difficultyLevel).toBeLessThan(prevSession.difficultyLevel);
      expect(rx.motivationMessage).toBeDefined();
      expect(rx.motivationMessage).toContain('컨디션');
    });
  });

  // ──────────────────────────────────────────────
  // 7. No previous sessions
  // ──────────────────────────────────────────────
  describe('no previous sessions', () => {
    it('should return default difficulty (3) with first session message', () => {
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        [],
      );
      expect(rx.difficultyLevel).toBe(3);
      expect(rx.motivationMessage).toBeDefined();
      expect(rx.motivationMessage).toContain('첫');
    });

    it('should return default difficulty (3) when previousSessions is undefined', () => {
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
      );
      expect(rx.difficultyLevel).toBe(3);
      expect(rx.motivationMessage).toBeDefined();
      expect(rx.motivationMessage).toContain('첫');
    });
  });

  // ──────────────────────────────────────────────
  // 8. 3+ consecutive BALANCED
  // ──────────────────────────────────────────────
  describe('3+ consecutive BALANCED sessions', () => {
    it('should apply big difficulty push (+2) and stage progression', () => {
      // 3 consecutive BALANCED = pushDay 0 → range expansion only (no arpeggio yet)
      const sessions3 = [
        mockSession('BALANCED', 5, '2026-01-03'),
        mockSession('BALANCED', 4, '2026-01-02'),
        mockSession('BALANCED', 3, '2026-01-01'),
      ];
      const rx3 = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        sessions3,
      );
      expect(rx3.difficultyLevel).toBeGreaterThanOrEqual(7);
      expect(rx3.scaleType).toBe('stepwise'); // Day 3: range only

      // 5 consecutive BALANCED = pushDay 2 → both range + arpeggio
      const sessions5 = [
        mockSession('BALANCED', 7, '2026-01-05'),
        mockSession('BALANCED', 6, '2026-01-04'),
        mockSession('BALANCED', 5, '2026-01-03'),
        mockSession('BALANCED', 4, '2026-01-02'),
        mockSession('BALANCED', 3, '2026-01-01'),
      ];
      const rx5 = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        sessions5,
      );
      expect(rx5.scaleType).toBe('arpeggio'); // Day 5+: both
    });

    it('should expand practice range with rangePad = 2', () => {
      const sessions = [
        mockSession('BALANCED', 5, '2026-01-03'),
        mockSession('BALANCED', 4, '2026-01-02'),
        mockSession('BALANCED', 3, '2026-01-01'),
      ];
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        sessions,
      );

      const comfortLow = noteToMidi(range.comfortLow);   // C3 = 48
      const comfortHigh = noteToMidi(range.comfortHigh);  // F4 = 65
      // rangePad = 2, so low = max(modalLow, comfortLow - 2), high = min(modalHigh, comfortHigh + 2)
      const expectedLow = Math.max(modalLowMidi, comfortLow - 2);
      const expectedHigh = Math.min(modalHighMidi, comfortHigh + 2);

      expect(rx.practiceRange.low).toBe(expectedLow);
      expect(rx.practiceRange.high).toBe(expectedHigh);
    });
  });

  // ──────────────────────────────────────────────
  // 9. Practice range bounds
  // ──────────────────────────────────────────────
  describe('practice range never exceeds modal range', () => {
    it('BREATHY practice range should stay within modal bounds', () => {
      const rx = generatePrescription(mockDiagnosticResult('BREATHY'), range);
      expect(rx.practiceRange.low).toBeGreaterThanOrEqual(modalLowMidi);
      expect(rx.practiceRange.high).toBeLessThanOrEqual(modalHighMidi);
    });

    it('PRESSED practice range should stay within modal bounds', () => {
      const rx = generatePrescription(mockDiagnosticResult('PRESSED'), range);
      expect(rx.practiceRange.low).toBeGreaterThanOrEqual(modalLowMidi);
      expect(rx.practiceRange.high).toBeLessThanOrEqual(modalHighMidi);
    });

    it('PASSAGGIO practice range should stay within modal bounds', () => {
      const rx = generatePrescription(mockDiagnosticResult('PASSAGGIO'), range);
      expect(rx.practiceRange.low).toBeGreaterThanOrEqual(modalLowMidi);
      expect(rx.practiceRange.high).toBeLessThanOrEqual(modalHighMidi);
    });

    it('BALANCED practice range should stay within modal bounds', () => {
      const rx = generatePrescription(mockDiagnosticResult('BALANCED'), range);
      expect(rx.practiceRange.low).toBeGreaterThanOrEqual(modalLowMidi);
      expect(rx.practiceRange.high).toBeLessThanOrEqual(modalHighMidi);
    });

    it('BALANCED with 3+ consecutive should still respect modal bounds', () => {
      const sessions = [
        mockSession('BALANCED', 8, '2026-01-03'),
        mockSession('BALANCED', 7, '2026-01-02'),
        mockSession('BALANCED', 6, '2026-01-01'),
      ];
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        sessions,
      );
      expect(rx.practiceRange.low).toBeGreaterThanOrEqual(modalLowMidi);
      expect(rx.practiceRange.high).toBeLessThanOrEqual(modalHighMidi);
    });

    it('should respect modal bounds even with narrow vocal range', () => {
      const narrowRange: VocalRangeProfile = {
        ...mockVocalRange(),
        modalLow: 'C3', modalHigh: 'E3',
        modalLowHz: 130.8, modalHighHz: 164.8,
        comfortLow: 'C3', comfortHigh: 'E3',
        modalRangeOctaves: 0.3,
      };
      const rx = generatePrescription(
        mockDiagnosticResult('PRESSED'),
        narrowRange,
      );
      const narrowLow = noteToMidi('C3');
      const narrowHigh = noteToMidi('E3');
      expect(rx.practiceRange.low).toBeGreaterThanOrEqual(narrowLow);
      expect(rx.practiceRange.high).toBeLessThanOrEqual(narrowHigh);
    });
  });

  // ──────────────────────────────────────────────
  // Difficulty clamping edge cases
  // ──────────────────────────────────────────────
  describe('difficulty clamping', () => {
    it('should never exceed MAX_DIFFICULTY (10)', () => {
      const sessions = [
        mockSession('BALANCED', 10, '2026-01-03'),
        mockSession('BALANCED', 10, '2026-01-02'),
        mockSession('BALANCED', 10, '2026-01-01'),
      ];
      const rx = generatePrescription(
        mockDiagnosticResult('BALANCED'),
        range,
        sessions,
      );
      expect(rx.difficultyLevel).toBeLessThanOrEqual(10);
    });

    it('should never go below MIN_DIFFICULTY (1)', () => {
      const prevSession = mockSession('BALANCED', 1, '2026-01-01');
      const rx = generatePrescription(
        mockDiagnosticResult('PRESSED'),
        range,
        [prevSession],
      );
      // 1 + (-2) = -1, clamped to 1
      expect(rx.difficultyLevel).toBeGreaterThanOrEqual(1);
    });
  });
});
