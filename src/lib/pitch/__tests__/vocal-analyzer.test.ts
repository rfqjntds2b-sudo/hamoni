import { describe, it, expect } from 'vitest';
import { VocalAnalyzer } from '../vocal-analyzer';

const balanced = () => ({ externalVocalState: 'balanced' as const });
const breathy = () => ({ externalVocalState: 'breathy' as const });
const pressed = () => ({ externalVocalState: 'pressed' as const });

describe('VocalAnalyzer', () => {
  describe('히스테리시스', () => {
    it('초기 상태는 balanced', () => {
      const analyzer = new VocalAnalyzer();
      expect(analyzer.update(balanced()).vocalState).toBe('balanced');
    });

    it('breathy 1~2프레임이면 상태 유지', () => {
      const analyzer = new VocalAnalyzer();
      analyzer.update(balanced());
      analyzer.update(breathy());
      expect(analyzer.update(breathy()).vocalState).toBe('balanced');
    });

    it('breathy 3프레임 연속이면 전환', () => {
      const analyzer = new VocalAnalyzer();
      analyzer.update(balanced());
      analyzer.update(breathy());
      analyzer.update(breathy());
      expect(analyzer.update(breathy()).vocalState).toBe('breathy');
    });

    it('pressed 3프레임 연속이면 전환', () => {
      const analyzer = new VocalAnalyzer();
      analyzer.update(pressed());
      analyzer.update(pressed());
      expect(analyzer.update(pressed()).vocalState).toBe('pressed');
    });

    it('hysteresisFrames=1이면 2프레임째 전환', () => {
      const analyzer = new VocalAnalyzer({ hysteresisFrames: 1 });
      analyzer.update(breathy());
      expect(analyzer.update(breathy()).vocalState).toBe('breathy');
    });
  });

  describe('hint', () => {
    it('balanced → 안정적', () => {
      expect(new VocalAnalyzer().update(balanced()).hint).toContain('안정적');
    });

    it('pressed → 긴장 (beginner)', () => {
      const a = new VocalAnalyzer({ hysteresisFrames: 1 });
      a.update(pressed());
      expect(a.update(pressed()).hint).toContain('편하게');
    });

    it('pressed → 턱과 혀 (intermediate)', () => {
      const a = new VocalAnalyzer({ vocalLevel: 'intermediate', hysteresisFrames: 1 });
      a.update(pressed());
      expect(a.update(pressed()).hint).toContain('턱과 혀');
    });

    it('breathy → 또렷하게', () => {
      const a = new VocalAnalyzer({ hysteresisFrames: 1 });
      a.update(breathy());
      expect(a.update(breathy()).hint).toContain('또렷하게');
    });
  });

  describe('silence', () => {
    it('23프레임 이후 isSilent() true', () => {
      const a = new VocalAnalyzer();
      a.update(balanced());
      for (let i = 0; i < 23; i++) a.decay();
      expect(a.isSilent()).toBe(false);
      a.decay();
      expect(a.isSilent()).toBe(true);
    });
  });

  describe('reset', () => {
    it('상태 초기화', () => {
      const a = new VocalAnalyzer();
      for (let i = 0; i < 5; i++) a.update(pressed());
      a.reset();
      expect(a.update(balanced()).vocalState).toBe('balanced');
    });
  });
});
