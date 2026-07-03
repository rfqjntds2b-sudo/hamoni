import { describe, it, expect } from 'vitest';
import { getDirectionFeedback } from '../feedback-engine';

describe('getDirectionFeedback', () => {
  it('목표보다 높으면 down', () => {
    expect(getDirectionFeedback(69.5, 69)).toBe('down');
  });

  it('목표보다 낮으면 up', () => {
    expect(getDirectionFeedback(68.5, 69)).toBe('up');
  });

  it('목표 ±0.2 반음 이내면 null', () => {
    expect(getDirectionFeedback(69.1, 69)).toBeNull();
  });

  it('정확히 on-target이면 null', () => {
    expect(getDirectionFeedback(69, 69)).toBeNull();
  });

  it('경계 이내(+0.19)에서는 null', () => {
    expect(getDirectionFeedback(69.19, 69)).toBeNull();
  });

  it('경계 이내(-0.19)에서는 null', () => {
    expect(getDirectionFeedback(68.81, 69)).toBeNull();
  });

  it('경계 초과(+0.25)에서는 down', () => {
    expect(getDirectionFeedback(69.25, 69)).toBe('down');
  });

  it('경계 초과(-0.25)에서는 up', () => {
    expect(getDirectionFeedback(68.75, 69)).toBe('up');
  });
});
