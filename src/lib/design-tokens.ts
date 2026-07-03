// ============================================================
// Design Tokens — JS-accessible mirror of globals.css
// For Canvas/SVG contexts that cannot read CSS custom properties.
// Keep in sync with globals.css :root block.
// ============================================================

/** Surface hierarchy (darkest → brightest) */
export const SURFACE = {
  0: 'oklch(0.08 0.005 270)',
  1: 'oklch(0.10 0.005 270)',
  2: 'oklch(0.12 0.005 270)',
  3: 'oklch(0.16 0.005 270)',
} as const;

/** Text colors */
export const TEXT = {
  foreground: 'oklch(0.93 0 0)',
  muted: 'oklch(0.55 0 0)',
} as const;

/** Accent */
export const ACCENT = {
  warmAmber: 'oklch(0.78 0.15 70)',
  warmAmberDim: 'oklch(0.65 0.12 70)',
} as const;

/** Semantic status */
export const STATUS = {
  success: 'oklch(0.72 0.19 145)',
  warn: 'oklch(0.65 0.12 70)',      // warm-amber-dim
  fail: 'oklch(0.65 0.2 25)',        // destructive
} as const;

/** Chart palette (--chart-1 ~ --chart-5) */
export const CHART = {
  1: 'oklch(0.78 0.15 70)',   // warm-amber
  2: 'oklch(0.7 0.12 160)',   // teal
  3: 'oklch(0.65 0.14 280)',  // purple
  4: 'oklch(0.72 0.1 210)',   // blue
  5: 'oklch(0.6 0.08 300)',   // pink
} as const;

/** Border */
export const BORDER = 'oklch(1 0 0 / 8%)';

/**
 * Map a score (0-100) to a semantic status color.
 * pass (>=70) → success, mid (40-69) → warn, fail (<40) → destructive
 */
export function scoreColor(score: number): string {
  if (score >= 70) return STATUS.success;
  if (score >= 40) return STATUS.warn;
  return STATUS.fail;
}

/**
 * Linearly interpolate between two hex colors.
 * Only used when Canvas requires hex (e.g., gradient stops).
 */
export function lerpHex(hex1: string, hex2: string, t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const parse = (h: string) => {
    const s = h.replace('#', '');
    return [
      parseInt(s.slice(0, 2), 16),
      parseInt(s.slice(2, 4), 16),
      parseInt(s.slice(4, 6), 16),
    ] as [number, number, number];
  };
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r1 + (r2 - r1) * c)}${toHex(g1 + (g2 - g1) * c)}${toHex(b1 + (b2 - b1) * c)}`;
}

/**
 * Hex equivalents of status colors for Canvas gradient contexts
 * that cannot use oklch.
 */
export const STATUS_HEX = {
  success: '#34a853',
  warn: '#c2882a',
  fail: '#d93025',
} as const;

export const CHART_HEX = {
  1: '#c9913a',  // warm-amber approx
  2: '#3da87a',  // teal approx
  3: '#8b5fc7',  // purple approx
  4: '#5a9ec7',  // blue approx
  5: '#9b6ab0',  // pink approx
} as const;

export const SURFACE_HEX = {
  0: '#121318',
  1: '#17181e',
  2: '#1c1d24',
  3: '#26272f',
} as const;

export const TEXT_HEX = {
  foreground: '#ececec',
  muted: '#828282',
} as const;

export const ACCENT_HEX = {
  warmAmber: '#c9913a',
  warmAmberDim: '#a07430',
} as const;
