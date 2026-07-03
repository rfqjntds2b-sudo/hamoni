import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';

export interface SessionReportData {
  driftDirection: 'flat' | 'sharp' | 'balanced';
  worstInterval: string | null;
  jitterScore: number;
  comfortZoneLow: string;
  comfortZoneHigh: string;
}

export function generateCoachingNotes(report: SessionReportData, locale: Locale = 'ko'): string[] {
  const t = createT(locale, 'coaching');
  const notes: string[] = [];

  if (report.driftDirection === 'flat') {
    notes.push(t('feedback.driftFlat'));
  } else if (report.driftDirection === 'sharp') {
    notes.push(t('feedback.driftSharp'));
  }

  if (report.worstInterval) {
    notes.push(t('feedback.worstInterval', { interval: report.worstInterval }));
  }

  if (report.jitterScore > 0.7) {
    notes.push(t('feedback.highJitter'));
  }

  notes.push(t('feedback.comfortZone', { low: report.comfortZoneLow, high: report.comfortZoneHigh }));

  return notes;
}

export function generateCoachingNoteSummary(notes: string[], locale: Locale = 'ko'): string {
  const t = createT(locale, 'coaching');
  return notes[0] || t('feedback.defaultSummary');
}
