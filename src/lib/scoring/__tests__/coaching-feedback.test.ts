import { describe, it, expect } from 'vitest';
import { generateCoachingNotes } from '../coaching-feedback';
import type { SessionReportData } from '../coaching-feedback';

describe('generateCoachingNotes', () => {
  it('includes flat drift feedback', () => {
    const report: SessionReportData = {
      driftDirection: 'flat',
      worstInterval: 'D4',
      jitterScore: 0.3,
      comfortZoneLow: 'C4',
      comfortZoneHigh: 'E4',
    };
    const notes = generateCoachingNotes(report);
    expect(notes.some((n) => n.includes('낮아지는'))).toBe(true);
  });

  it('includes sharp drift feedback', () => {
    const report: SessionReportData = {
      driftDirection: 'sharp',
      worstInterval: null,
      jitterScore: 0.3,
      comfortZoneLow: 'C4',
      comfortZoneHigh: 'E4',
    };
    const notes = generateCoachingNotes(report);
    expect(notes.some((n) => n.includes('높아지는'))).toBe(true);
  });

  it('includes jitter warning when score > 0.7', () => {
    const report: SessionReportData = {
      driftDirection: 'balanced',
      worstInterval: null,
      jitterScore: 0.8,
      comfortZoneLow: 'C4',
      comfortZoneHigh: 'E4',
    };
    const notes = generateCoachingNotes(report);
    expect(notes.some((n) => n.includes('떨림'))).toBe(true);
  });

  it('always includes positive feedback', () => {
    const report: SessionReportData = {
      driftDirection: 'balanced',
      worstInterval: null,
      jitterScore: 0.2,
      comfortZoneLow: 'C4',
      comfortZoneHigh: 'E4',
    };
    const notes = generateCoachingNotes(report);
    expect(notes.some((n) => n.includes('안정적'))).toBe(true);
  });
});
