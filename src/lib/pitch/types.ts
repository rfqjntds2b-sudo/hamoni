export interface PitchSample {
  timestamp: number;
  frequency: number;
  note: string;
  midiNumber: number;
  cents: number;
  clarity: number;
  rms: number;
  /** Whether this sample passed the intended-note filter */
  voiced?: boolean;
}

// PitchEngine이 최종 조립하는 결과. rms 포함.
export interface PitchResult {
  frequency: number;
  clarity: number;
  note: string;
  midiNumber: number;
  cents: number;
  rms: number;
}

// Detector는 rms를 모른다. PitchEngine이 rms를 붙여 PitchResult를 완성한다.
export interface PitchDetector {
  detect(buffer: Float32Array, sampleRate: number): Omit<PitchResult, 'rms'> | null;
  /** Preload heavy dependencies (e.g. pitchy WASM). No-op if already loaded. */
  ensureLoaded(): Promise<void>;
}
