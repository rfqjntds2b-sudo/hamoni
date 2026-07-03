const DIRECTION_THRESHOLD = 0.2; // semitones

/**
 * 목표음 대비 방향 피드백.
 * @returns 'up' | 'down' | null
 */
export function getDirectionFeedback(
  currentMidiFloat: number,
  targetMidi: number,
): 'up' | 'down' | null {
  const diff = currentMidiFloat - targetMidi;
  if (diff > DIRECTION_THRESHOLD) return 'down';
  if (diff < -DIRECTION_THRESHOLD) return 'up';
  return null;
}
