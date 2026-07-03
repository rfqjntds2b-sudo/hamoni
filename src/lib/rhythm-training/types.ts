// ============================================================
// Rhythm Training — Type Definitions
// ============================================================

export type Subdivision = 'quarter' | 'eighth' | 'rest' | 'dotted_quarter' | 'sixteenth';

export interface RhythmBeat {
  subdivision: Subdivision;
  accent: boolean;
}

export interface RhythmPattern {
  id: string;
  name: string;
  nameKo: string;
  level: number;
  timeSignature: [number, number];
  beats: RhythmBeat[];
  measures: number;
}

export interface BeatResult {
  expectedMs: number;
  actualMs: number | null;
  deviationMs: number;
  hit: boolean;
}

export interface RhythmSessionResult {
  patternId: string;
  bpm: number;
  level: number;
  totalBeats: number;
  hits: number;
  misses: number;
  avgDeviationMs: number;
  stdDeviationMs: number;
  accuracy: number;
  score: number;
  beatResults: BeatResult[];
}

export interface RhythmDailyRecord {
  date: string; // "YYYY-MM-DD"
  count: number;
}
