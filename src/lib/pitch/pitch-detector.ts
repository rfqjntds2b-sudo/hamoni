import type { PitchDetector as PitchyAnalyzerType } from 'pitchy';
import type { PitchDetector, PitchResult } from './types';
import { frequencyToMidi, midiToNote, frequencyToCents } from './note-utils';

// 0.5: Praat 표준 수준. 0.5-0.75 구간은 clarityWeight()로 가중 감쇠 적용.
const CLARITY_THRESHOLD = 0.5;

// Lazy-loaded pitchy constructor — cached at module level
let PitchyAnalyzer: typeof import('pitchy').PitchDetector | null = null;

export class PitchyDetector implements PitchDetector {
  private analyzer: PitchyAnalyzerType<Float32Array> | null = null;

  /** Preload the pitchy module. Call from async contexts (e.g. PitchEngine.start). */
  async ensureLoaded(): Promise<void> {
    if (!PitchyAnalyzer) {
      const mod = await import('pitchy');
      PitchyAnalyzer = mod.PitchDetector;
    }
  }

  detect(buffer: Float32Array, sampleRate: number): Omit<PitchResult, 'rms'> | null {
    // If pitchy hasn't been preloaded yet, skip this frame
    if (!PitchyAnalyzer) return null;

    if (!this.analyzer || this.analyzer.inputLength !== buffer.length) {
      this.analyzer = PitchyAnalyzer.forFloat32Array(buffer.length);
    }

    const [frequency, clarity] = this.analyzer.findPitch(buffer, sampleRate);

    if (clarity < CLARITY_THRESHOLD || frequency <= 0) {
      return null;
    }

    const midiNumber = frequencyToMidi(frequency);
    const note = midiToNote(midiNumber);
    const cents = frequencyToCents(frequency);

    return { frequency, clarity, note, midiNumber, cents };
  }
}
