/**
 * Layout grid of the design frames (design pixels): content spans x 52 → 1868 and starts at y 208,
 * above the subsystem tabs (y 1007). Screens place cards with these helpers instead of hand-typed
 * coordinates, so every screen shares the same margins and gutters.
 */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const GRID = { left: 52, width: 1816, top: 208, gap: 25, bottom: 985 } as const;

/** Split a row into columns. `spec` is a column count or relative widths (e.g. [2, 1]). */
export function row(y: number, h: number, spec: number | number[], opts: { gap?: number; x?: number; width?: number } = {}): Frame[] {
  const { gap = GRID.gap as number, x = GRID.left as number, width = GRID.width as number } = opts;
  const weights = typeof spec === 'number' ? Array<number>(spec).fill(1) : spec;
  const total = weights.reduce((a, b) => a + b, 0);
  const usable = width - gap * (weights.length - 1);
  let cx = x;
  return weights.map((w) => {
    const fw = (usable * w) / total;
    const f = { x: cx, y, w: fw, h };
    cx += fw + gap;
    return f;
  });
}

/** Stack frames vertically inside one column. */
export function stack(x: number, w: number, y: number, heights: number[], gap: number = GRID.gap): Frame[] {
  let cy = y;
  return heights.map((h) => {
    const f = { x, y: cy, w, h };
    cy += h + gap;
    return f;
  });
}
