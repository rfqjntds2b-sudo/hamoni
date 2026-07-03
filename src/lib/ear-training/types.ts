export interface EarTrainingRound {
  noteFrequency: number;
  noteMidi: number;
  noteName: string;       // "C4", "D4", etc.
  solfege: string;        // "도", "레", etc.
  choices: string[];      // 4 solfege choices (shuffled)
  userAnswer: string | null;
  correct: boolean | null;
}

export interface EarTrainingSession {
  rounds: EarTrainingRound[];
  correctCount: number;
  totalRounds: number;
  completedAt: string | null;
}

export interface EarTrainingDailyRecord {
  date: string;           // "YYYY-MM-DD"
  count: number;
}
