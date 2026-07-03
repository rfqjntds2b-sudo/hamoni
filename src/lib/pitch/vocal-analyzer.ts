import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';

export type VocalState = 'balanced' | 'pressed' | 'breathy';

interface VocalAnalyzerConfig {
  hysteresisFrames: number;
  vocalLevel: 'beginner' | 'intermediate';
  locale: Locale;
}

const DEFAULT_CONFIG: VocalAnalyzerConfig = {
  hysteresisFrames: 3,
  vocalLevel: 'beginner',
  locale: DEFAULT_LOCALE,
};

function getHint(state: VocalState, level: string, locale: Locale): string {
  const t = createT(locale, 'training');
  if (state === 'pressed') {
    return level === 'beginner'
      ? t('vocalHints.pressedBeginner')
      : t('vocalHints.pressedIntermediate');
  }
  if (state === 'breathy') {
    return level === 'beginner'
      ? t('vocalHints.breathyBeginner')
      : t('vocalHints.breathyIntermediate');
  }
  return t('vocalHints.balanced');
}

export class VocalAnalyzer {
  private config: VocalAnalyzerConfig;
  private currentState: VocalState = 'balanced';
  private pendingState: VocalState | null = null;
  private pendingCount: number = 0;
  private silentFrames: number = 0;

  constructor(config?: Partial<VocalAnalyzerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  update(input: { externalVocalState: VocalState }): { vocalState: VocalState; hint: string } {
    this.silentFrames = 0;
    this.applyHysteresis(input.externalVocalState);

    return {
      vocalState: this.currentState,
      hint: getHint(this.currentState, this.config.vocalLevel, this.config.locale),
    };
  }

  decay(): void {
    this.silentFrames++;
  }

  private static readonly SILENT_THRESHOLD_FRAMES = 23;

  isSilent(): boolean {
    return this.silentFrames > VocalAnalyzer.SILENT_THRESHOLD_FRAMES;
  }

  getSilentHint(): string {
    const t = createT(this.config.locale, 'training');
    return t('vocalHints.silent');
  }

  reset(): void {
    this.currentState = 'balanced';
    this.pendingState = null;
    this.pendingCount = 0;
    this.silentFrames = 0;
  }

  private applyHysteresis(newState: VocalState): void {
    if (newState !== this.currentState) {
      if (newState === this.pendingState) {
        this.pendingCount++;
        if (this.pendingCount >= this.config.hysteresisFrames) {
          this.currentState = newState;
          this.pendingState = null;
          this.pendingCount = 0;
        }
      } else {
        this.pendingState = newState;
        this.pendingCount = 1;
      }
    } else {
      this.pendingState = null;
      this.pendingCount = 0;
    }
  }
}
