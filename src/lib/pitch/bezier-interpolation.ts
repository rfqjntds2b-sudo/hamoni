// ============================================================
// Bezier Interpolation — Monotone Cubic Hermite (Fritsch-Carlson)
// ============================================================
// Shared by pitch-recorder-chart, pitch-recorder-chart-mini,
// and pitch-recorder-live-chart for smooth curve rendering.
// ============================================================

import type { PitchSample } from './types';

export interface Point {
  x: number;
  y: number;
}

export interface BezierSegment {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

/**
 * Compute cubic Bezier control points for monotone interpolation.
 * Uses Fritsch-Carlson method to guarantee no overshoot.
 *
 * @param points - Array of {x, y} data points (must be sorted by x)
 * @returns Array of control point pairs, one per segment (length = points.length - 1)
 */
export function computeBezierControlPoints(points: Point[]): BezierSegment[] {
  const n = points.length;
  if (n < 2) return [];

  // 1. Compute deltas and slopes
  const dx: number[] = [];
  const dy: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    dy.push(points[i + 1].y - points[i].y);
    slopes.push(dx[i] === 0 ? 0 : dy[i] / dx[i]);
  }

  if (n === 2) {
    // Single segment: straight line
    const thirdDx = dx[0] / 3;
    return [{
      cp1x: points[0].x + thirdDx,
      cp1y: points[0].y + slopes[0] * thirdDx,
      cp2x: points[1].x - thirdDx,
      cp2y: points[1].y - slopes[0] * thirdDx,
    }];
  }

  // 2. Compute tangents using Fritsch-Carlson
  const tangents: number[] = new Array(n);

  // First point: one-sided
  tangents[0] = slopes[0];

  // Interior points
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      // Sign change or zero — flat tangent (monotonicity)
      tangents[i] = 0;
    } else {
      // Harmonic mean of slopes
      tangents[i] = 2 / (1 / slopes[i - 1] + 1 / slopes[i]);
    }
  }

  // Last point: one-sided
  tangents[n - 1] = slopes[n - 2];

  // 3. Fritsch-Carlson monotonicity correction
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / slopes[i];
      const beta = tangents[i + 1] / slopes[i];
      // Restrict to circle of radius 3
      const sq = alpha * alpha + beta * beta;
      if (sq > 9) {
        const tau = 3 / Math.sqrt(sq);
        tangents[i] = tau * alpha * slopes[i];
        tangents[i + 1] = tau * beta * slopes[i];
      }
    }
  }

  // 4. Convert tangents to Bezier control points
  const segments: BezierSegment[] = [];
  for (let i = 0; i < n - 1; i++) {
    const d = dx[i] / 3;
    segments.push({
      cp1x: points[i].x + d,
      cp1y: points[i].y + tangents[i] * d,
      cp2x: points[i + 1].x - d,
      cp2y: points[i + 1].y - tangents[i + 1] * d,
    });
  }

  return segments;
}

/**
 * Decimate a PitchSample array to a target number of points.
 * Uses largest-triangle-three-buckets (LTTB) for perceptual quality.
 *
 * @param samples - Original sample array
 * @param targetCount - Desired number of output points
 * @returns Decimated samples
 */
export function decimateSamples(
  samples: PitchSample[],
  targetCount: number,
): PitchSample[] {
  if (samples.length <= targetCount || targetCount < 3) return samples;

  const result: PitchSample[] = [samples[0]]; // Always include first
  const bucketSize = (samples.length - 2) / (targetCount - 2);

  let prevIndex = 0;

  for (let i = 1; i < targetCount - 1; i++) {
    const bucketStart = Math.floor((i - 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor(i * bucketSize) + 1, samples.length - 1);

    // Next bucket average for triangle area calculation
    const nextBucketStart = Math.floor(i * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, samples.length - 1);
    let avgX = 0;
    let avgY = 0;
    let nextBucketCount = 0;
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += samples[j].timestamp;
      avgY += samples[j].midiNumber + samples[j].cents / 100;
      nextBucketCount++;
    }
    if (nextBucketCount > 0) {
      avgX /= nextBucketCount;
      avgY /= nextBucketCount;
    }

    // Find point with max triangle area in current bucket
    const prevX = samples[prevIndex].timestamp;
    const prevY = samples[prevIndex].midiNumber + samples[prevIndex].cents / 100;
    let maxArea = -1;
    let maxIdx = bucketStart;

    for (let j = bucketStart; j < bucketEnd; j++) {
      const x = samples[j].timestamp;
      const y = samples[j].midiNumber + samples[j].cents / 100;
      const area = Math.abs(
        (prevX - avgX) * (y - prevY) - (prevX - x) * (avgY - prevY),
      );
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }

    result.push(samples[maxIdx]);
    prevIndex = maxIdx;
  }

  result.push(samples[samples.length - 1]); // Always include last
  return result;
}

/**
 * Split samples into voiced segments (gaps where silence/unvoiced).
 * A gap is detected when:
 * - consecutive timestamps differ by more than gapThreshold, OR
 * - the sample has `voiced === false` (from IntendedNoteFilter)
 *
 * @param samples - PitchSample array (only voiced samples expected, but handles mixed)
 * @param gapThreshold - Max gap in ms before splitting (default 200ms)
 * @returns Array of segments, each a contiguous PitchSample array
 */
export function splitVoicedSegments(
  samples: PitchSample[],
  gapThreshold = 200,
): PitchSample[][] {
  if (samples.length === 0) return [];

  const segments: PitchSample[][] = [[samples[0]]];
  for (let i = 1; i < samples.length; i++) {
    const isGap = samples[i].timestamp - samples[i - 1].timestamp > gapThreshold;
    const wasUnvoiced = samples[i - 1].voiced === false;
    const isUnvoiced = samples[i].voiced === false;

    if (isGap || wasUnvoiced || isUnvoiced) {
      // Only start a new segment if current sample is voiced
      if (!isUnvoiced) {
        segments.push([samples[i]]);
      }
    } else {
      segments[segments.length - 1].push(samples[i]);
    }
  }
  return segments;
}
