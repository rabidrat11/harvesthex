// Tiny raster helpers for the combat group's larger effects. They paint
// legend characters into a mutable grid; the result is ordinary sprite rows.
// Shapes are placed by hand in combat.ts; these only save typing circles.

export type Grid = string[][];

export function grid(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
}

export function rows(g: Grid): string[] {
  return g.map((r) => r.join(''));
}

export function put(g: Grid, x: number, y: number, ch: string): void {
  if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) return;
  g[y][x] = ch;
}

/** Stamp hand-typed rows into a grid ('.' is skipped). */
export function stamp(g: Grid, art: string[], dx: number, dy: number): void {
  art.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && put(g, x + dx, y + dy, ch)));
}

/** Fill a disc with one character. */
export function disc(g: Grid, cx: number, cy: number, r: number, ch: string): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r + 0.3) put(g, x, y, ch);
    }
}

/**
 * A lumpy cloud made of overlapping discs, shaded as one mass. `shades` runs
 * from the outer rim (shows on the lower-right) to the lit core (upper-left).
 */
export function blob(g: Grid, lumps: [number, number, number][], shades: string[]): void {
  const n = shades.length;
  shades.forEach((ch, i) => {
    if (i === 0) {
      for (const [x, y, r] of lumps) disc(g, x, y, r, ch);
      return;
    }
    const t = i / (n - 1); // 0..1 towards the core
    for (const [x, y, r] of lumps) {
      const rr = i === 1 ? r - 0.9 : r * (1 - 0.62 * t);
      const off = r * (0.1 + 0.28 * t);
      if (rr > 0.2) disc(g, x - off, y - off, rr, ch);
    }
  });
}
