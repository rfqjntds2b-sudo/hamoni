// ============================================================
// Training Feature — Core Type Definitions
// ============================================================

export type { VoiceType } from './voice-type-offsets';

// --------------- Exercise & Level Types ---------------

/** All exercise identifiers (13 original + 5 breath control + 4 register/resonance) */
export type ExerciseId =
  | 'breathing'
  | 'humming'
  | 'lip_trill'
  | 'breath_sustain'
  | 'straw'
  | 'yawn_sigh'
  | 'flow'
  | 'resonant'
  | 'vibrato'
  | 'basic_dynamic'
  | 'vfe'
  | 'pitch_glide'
  | 'messa'
  // Breath Control (5)
  | 'breath_alloc'
  | 'sz_ratio'
  | 'phrase_sim'
  | 'airflow_stable'
  | 'mpt'
  // Register & Resonance (4)
  | 'register_blend'
  | 'passaggio_sustain'
  | 'vowel_sustain'
  | 'vowel_transition';

/** Exercise metadata (static, never changes at runtime) */
export interface ExerciseMeta {
  id: ExerciseId;
  name: string;
  nameEn: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: 'warmup' | 'core' | 'advanced' | 'breath';
  measuredMetrics: string[];
  measureMode: 'timer' | 'sustained' | 'pitch_curve' | 'vfe_complex' | 'dynamic_range' | 'vibrato' | 'rms_sustained';
  defaultDuration: number;
  iconName: string;
}

/** Level pass/fail criteria for a single sustained-tone exercise */
export interface LevelCriteria {
  duration: number;
  jitterMax?: number;
  shimmerMax?: number;
  hnrMin?: number;
  f0StdMax?: number;
  pitchSmooth?: number;
  rangeOctaves?: number;
  maxBreaks?: number;
  dynamicRange?: number;
  f0DeviationMax?: number;
  vibratoRateMin?: number;
  vibratoRateMax?: number;
  vibratoExtentMin?: number;
  vibratoExtentMax?: number;
  vibratoPeriodicity?: number;
  // Breath control criteria
  rmsCVMax?: number;
  sustainedTimeMin?: number;
  rmsContourMin?: number;
  szRatioMin?: number;
  szRatioMax?: number;
  // Pitch accuracy criteria
  centsDeviationMax?: number;
  // Formant-based criteria (vowel_transition / vowel_sustain)
  /** Minimum number of target vowels hit during session (out of 5) */
  vowelHitMin?: number;
  /** Minimum average dwell time (ms) within each vowel zone */
  vowelDwellMin?: number;
  /** Maximum average F1/F2 jump between consecutive voiced frames (Hz) */
  formantJitterMax?: number;
}

/** VFE has 4 sub-exercises (A/B/C/D), each with its own criteria */
export interface VFELevelCriteria {
  a: LevelCriteria;
  b: { pitchSmooth: number; rangeOctaves: number; maxBreaks: number };
  c: { pitchSmooth: number; rangeOctaves: number; maxBreaks: number };
  d: LevelCriteria;
}

/** Real-time voice metrics streamed from the analyzer */
export interface RealtimeMetrics {
  f0: number;
  rms: number;
  jitter: number;
  shimmer: number;
  hnr: number;
  isVoiced: boolean;
  /** Signed cents deviation from auto-locked target pitch (+ = sharp, - = flat) */
  centsFromTarget?: number;
  /** Auto-locked target pitch in Hz */
  targetF0?: number;
  /** First formant frequency in Hz (resonance exercises only) */
  f1?: number;
  /** Second formant frequency in Hz (resonance exercises only) */
  f2?: number;
}

// --------------- Progress & Session Types ---------------

/** A single level-up event recorded for growth chart display */
export interface LevelEvent {
  date: string; // YYYY-MM-DD
  from: number;
  to: number;
}

/** Per-exercise progress stored in localStorage */
export interface ExerciseProgress {
  currentLevel: number;
  bestLevel: number;
  totalAttempts: number;
  totalPasses: number;
  consecutivePasses: number;
  consecutiveFails: number;
  lastPracticed: string | null;
  personalBests: Record<string, number>;
  levelHistory?: LevelEvent[];
  /** Recent session pass/fail results (FIFO, max 10) for adaptive difficulty */
  recentResults?: boolean[];
}

/** Top-level training progress (localStorage key: hamoni:trainingProgress) */
export interface TrainingProgress {
  exercises: Record<ExerciseId, ExerciseProgress>;
  dailyRoutine: {
    streak: number;
    bestStreak: number;
    lastCompleted: string | null;
    restDays: string[];
    restDaysUsed: number;
    /** Available streak shields (earned at milestones, consumed to prevent streak break) */
    shieldCount: number;
    /** Streak milestones that already awarded shields (e.g. [7, 30]) — prevents double-award */
    shieldsAwarded: number[];
    /** True after streak breaks — consumed on next session for comeback bonus XP */
    comebackBonusAvailable: boolean;
  };
  /** Breath routine daily completion tracking (independent of vocal training streak) */
  breathRoutine?: {
    lastCompleted: string | null; // YYYY-MM-DD
  };
  totalXP: number;
  dailyXP: number;
  /** Date string (YYYY-MM-DD) tracking which day dailyXP belongs to, so it resets once per calendar day */
  _dailyXPDate?: string;
  /** Date of the user's first training session (YYYY-MM-DD), used by curriculum engine */
  firstSessionDate?: string;
  /** Monotonic version counter for multi-tab conflict detection */
  _version?: number;
}

/** Single completed session stored in history */
export interface SessionRecord {
  exerciseId: ExerciseId;
  level: number;
  passed: boolean;
  criterionResults: CriterionResult[];
  xpEarned: number;
  duration: number;
  timestamp: string;
}

/** Result for one criterion within a session */
export interface CriterionResult {
  name: string;
  target: number;
  actual: number;
  unit: string;
  passed: boolean;
  warning?: string;
}

/** Aggregated session outcome shown on the result screen */
export interface SessionResult {
  passed: boolean;
  results: CriterionResult[];
  xpEarned: number;
  duration: number;
  isLevelUp?: boolean;
  isPersonalRecord?: boolean;
}

/** Raw metric arrays collected during a session */
export interface SessionMetrics {
  duration: number;
  jitterValues: number[];
  shimmerValues: number[];
  hnrValues: number[];
  f0Values: number[];
  rmsValues: number[];
  isVoicedValues: boolean[];
  /** Per-frame clarity weights (0-1) for weighted averaging. Optional for backward compat. */
  clarityWeights?: number[];
  /** Absolute cents deviation from target per voiced frame */
  centsDeviationValues?: number[];
  /** First formant (Hz) per voiced frame (resonance exercises only) */
  f1Values?: number[];
  /** Second formant (Hz) per voiced frame (resonance exercises only) */
  f2Values?: number[];
  /** Onset type detected from first voiced frames */
  onsetType?: 'hard' | 'breathy' | 'balanced';
}

// --------------- Voice Check & Activity Types ---------------

/** Single day's voice-check snapshot */
export interface VoiceCheckDay {
  date: string;
  overall: number;
  f0Score: number;
  jitterScore: number;
  shimmerScore: number;
  hnrScore: number;
}

/** Collection of voice-check snapshots */
export interface VoiceCheckData {
  days: VoiceCheckDay[];
}

/** Single day's voice assessment result (from API) */
export interface VoiceAssessmentDay {
  date: string;
  overall: number;
  stability: number;
  toneQuality: number;
  flexibility: number;
  control: number;
  endurance: number;
  rawMetrics?: unknown;
}

/** Collection of voice assessment snapshots */
export interface VoiceAssessmentData {
  days: VoiceAssessmentDay[];
}

/** Single day's training activity */
export interface DayActivity {
  date: string;
  exercisesCompleted: string[];
  minutesPracticed: number;
  xpEarned: number;
  voiceCheckDone?: boolean;
  /** Number of breath routines completed today */
  breathRoutineCount?: number;
}

/** Activity log (localStorage key: hamoni:dailyActivity) */
export interface DailyActivityLog {
  days: DayActivity[];
}

// --------------- XP Types ---------------

/** A single XP bonus modifier */
export interface XPBonus {
  label: string;
  amount: number;
  isMultiplier: boolean;
  value: number;
}

/** Final XP calculation result */
export interface XPResult {
  baseXP: number;
  bonuses: XPBonus[];
  totalXP: number;
}

// ============================================================
// Comprehensive Voice Assessment
// ============================================================

export interface VoiceAssessmentScores {
  overall: number;       // 0-100, mean of 5 axes
  stability: number;     // 0-100, from Step 1 jitter+shimmer
  toneQuality: number;   // 0-100, from Step 1 HNR
  flexibility: number;   // 0-100, from Step 2 range+smoothness
  control: number;       // 0-100, from Step 3 dynamic+f0dev
  endurance: number;     // 0-100, from Step 1 voiced duration
}

export interface VoiceAssessmentResult {
  date: string;          // YYYY-MM-DD
  scores: VoiceAssessmentScores;
  rawMetrics: {
    // Step 1: Sustained tone
    jitter: number;
    shimmer: number;
    hnr: number;
    f0Std: number;
    voicedDuration: number;
    // Step 2: Pitch glide
    rangeOctaves: number;
    pitchSmooth: number;
    pitchBreaks: number;
    // Step 3: Dynamic control
    dynamicRange: number;
    f0Deviation: number;
  };
}
