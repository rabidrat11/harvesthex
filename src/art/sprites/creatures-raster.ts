// Tiny raster toolkit for the big boss sprites. Shapes are painted onto a
// character grid with palette ramps, so the result is still ordinary sprite
// rows (see ../sprite.ts) and goes through the same baker and outline.
//
// Light comes from the top-left (style guide rule 3). Ramps are listed
// brightest first.

export type Grid = string[][];
export type Pt = [number, number];
export type Ramp = readonly string[];

export function grid(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
}

export function toRows(g: Grid): string[] {
  return g.map((r) => r.join(''));
}

export function fromRows(rows: string[]): Grid {
  return rows.map((r) => [...r]);
}

export function put(g: Grid, x: number, y: number, c: string) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (y < 0 || y >= g.length || x < 0 || x >= g[0].length || c === '.') return;
  g[y][x] = c;
}

export function get(g: Grid, x: number, y: number): string {
  if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) return '.';
  return g[y][x];
}

/** Stamp hand-drawn rows onto the grid; '.' is transparent. */
export function stamp(g: Grid, rows: string[], dx: number, dy: number) {
  rows.forEach((r, y) => [...r].forEach((c, x) => put(g, x + dx, y + dy, c)));
}

const L = (() => {
  const v = [-0.55, -0.68, 0.5];
  const n = Math.hypot(...v);
  return v.map((c) => c / n) as [number, number, number];
})();

/** Quantise a lighting value (-1..1) into a ramp index. */
function band(i: number, cuts: readonly number[]): number {
  for (let k = 0; k < cuts.length; k++) if (i > cuts[k]) return k;
  return cuts.length;
}

// ---------------------------------------------------------------------------
// Turnip bulb: a dome top, widest a little above the middle, tapering to a
// taproot. `skin(x, y)` picks the ramp (plum shoulders vs cream belly).

export interface BulbOpts {
  cx: number;
  top: number;
  bottom: number;
  hw: number;
  skin: (x: number, y: number) => Ramp;
  /** Where the widest point sits, 0..1 from the top. */
  belly?: number;
  /** Exponent for the lower taper: higher keeps the bottom rounder. */
  round?: number;
  /** Per-pixel lighting bias (e.g. to keep a pale belly evenly lit). */
  bias?: (x: number, y: number) => number;
}

export function bulbHalfWidth(o: BulbOpts, y: number): number {
  const t = (y + 0.5 - o.top) / (o.bottom - o.top);
  if (t < 0 || t > 1) return -1;
  const b = o.belly ?? 0.4;
  let f: number;
  if (t < b) {
    const u = (b - t) / b;
    f = Math.sqrt(Math.max(0, 1 - u * u * 0.9));
  } else {
    const u = (t - b) / (1 - b);
    f = Math.max(0, 1 - Math.pow(u, o.round ?? 1.8)) * (1 - 0.2 * u);
  }
  return o.hw * f;
}

export function bulb(g: Grid, o: BulbOpts) {
  const b = o.belly ?? 0.4;
  for (let y = Math.floor(o.top); y <= o.bottom; y++) {
    const half = bulbHalfWidth(o, y);
    if (half <= 0.4) continue;
    const t = (y + 0.5 - o.top) / (o.bottom - o.top);
    for (let x = 0; x < g[0].length; x++) {
      const dx = x + 0.5 - o.cx;
      if (Math.abs(dx) > half) continue;
      const nx = dx / Math.max(half, 1);
      const ny = Math.max(-1, Math.min(1, (t - b) * 1.9));
      const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx * 0.9 - ny * ny * 0.45));
      const n = Math.hypot(nx, ny, nz);
      const i = (nx * L[0] + ny * L[1] + nz * L[2]) / n + (o.bias?.(x, y) ?? 0);
      const ramp = o.skin(x, y);
      let k = band(i, [0.9, 0.7, 0.32, -0.08]);
      if (Math.abs(dx) > half - 1 && k < 2) k = 2;
      put(g, x, y, ramp[Math.min(ramp.length - 1, k)]);
    }
  }
}

/** Shaded ellipse lump (pebbles, clods, seeds), lit from the top-left. */
export function blob(g: Grid, cx: number, cy: number, rx: number, ry: number, ramp: Ramp) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      const i = nx * L[0] + ny * L[1] + nz * L[2];
      put(g, x, y, ramp[Math.min(ramp.length - 1, band(i, [0.85, 0.45, 0.05].slice(0, ramp.length - 1)))]);
    }
}

// ---------------------------------------------------------------------------
// Strokes along a quadratic or cubic Bezier.

export function bez(pts: Pt[], t: number): Pt {
  if (pts.length === 3) {
    const [a, b, c] = pts;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
  }
  const [a, b, c, d] = pts;
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

function curveLen(pts: Pt[]): number {
  let len = 0;
  let prev = bez(pts, 0);
  for (let i = 1; i <= 32; i++) {
    const p = bez(pts, i / 32);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
}

export interface StrokeOpts {
  /** Width at t (0 = start, 1 = end). */
  width: (t: number) => number;
  /** ramp[0] lit edge ... ramp[n-1] dark edge. */
  ramp: Ramp;
  /** Optional midrib / vein colour drawn along the centre line. */
  vein?: string;
  /** Optional crack colour: short dark ticks across the stroke. */
  crack?: string;
  crackEvery?: number;
  /** Colour for the last few pixels (rotting tips). */
  tip?: string;
  tipLen?: number;
}

/**
 * Paint a stroke. Each pixel is shaded by which side of the centre line it
 * sits on relative to the light, and the outermost pixel on the shadow side
 * takes the darkest tone so overlapping strokes stay readable.
 */
export function stroke(g: Grid, pts: Pt[], o: StrokeOpts) {
  const len = curveLen(pts);
  const steps = Math.max(8, Math.ceil(len * 3));
  const r = o.ramp;
  const paint = new Map<string, { k: number; c?: string }>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = bez(pts, t);
    const [x2, y2] = bez(pts, Math.min(1, t + 0.01));
    const [x1, y1] = bez(pts, Math.max(0, t - 0.01));
    let tx = x2 - x1;
    let ty = y2 - y1;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty;
    const ny = tx;
    const half = o.width(t) / 2;
    if (half <= 0) continue;
    // Which normal direction faces the light?
    const facing = nx * L[0] + ny * L[1];
    for (let s = -half; s <= half + 0.001; s += 0.35) {
      const px = Math.floor(x + nx * s);
      const py = Math.floor(y + ny * s);
      const side = (s / Math.max(half, 0.5)) * Math.sign(facing || 1); // +1 = lit edge
      let k: number;
      if (half < 0.9) k = Math.floor((r.length - 1) / 2);
      else if (side > 0.45) k = 0;
      else if (side > -0.2) k = Math.min(1, r.length - 1);
      else if (side > -0.75 || half < 1.6) k = Math.min(2, r.length - 1);
      else k = r.length - 1;
      let c: string | undefined;
      if (o.vein && Math.abs(s) < 0.4 && half > 1.4 && t > 0.08 && t < 0.9) c = o.vein;
      if (o.crack && half > 1.5) {
        const every = o.crackEvery ?? 6;
        const d = (t * len) % every;
        if (d < 0.7 && side < 0.3) c = o.crack;
      }
      if (o.tip && t * len > len - (o.tipLen ?? 3)) c = side > 0.3 ? r[Math.min(1, r.length - 1)] === c ? c : o.tip : o.tip;
      const key = `${px},${py}`;
      const prev = paint.get(key);
      // Keep the lighter reading where samples overlap within one stroke,
      // except veins and cracks which always win.
      if (!prev || c || (!prev.c && k < prev.k)) paint.set(key, { k, c });
    }
  }
  for (const [key, v] of paint) {
    const [px, py] = key.split(',').map(Number);
    put(g, px, py, v.c ?? r[v.k]);
  }
}

/** Width profile helpers. */
export const taper = (w0: number, w1: number, pow = 1) => (t: number) => w0 + (w1 - w0) * Math.pow(t, pow);
export const leafW = (max: number, pow = 0.7) => (t: number) => max * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), pow);

// ---------------------------------------------------------------------------
// Grid transforms.

/** Vertical shear: column x moves down by round((x - pivot) * slope). Cheap small rotation. */
export function shearRows(rows: string[], slope: number, pivot = rows[0].length / 2, pad = 6): string[] {
  const w = rows[0].length;
  const h = rows.length + pad * 2;
  const g = grid(w, h);
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === '.') continue;
      put(g, x, y + pad + Math.round((x - pivot) * slope), c);
    }
  // Trim empty rows top and bottom.
  const out = toRows(g);
  let a = 0;
  let b = out.length - 1;
  while (a < b && !/[^.]/.test(out[a])) a++;
  while (b > a && !/[^.]/.test(out[b])) b--;
  return out.slice(a, b + 1);
}

/** Nearest-neighbour rotation by `deg` (clockwise), cropped to the drawn pixels. */
export function rotate(rows: string[], deg: number): string[] {
  const h = rows.length;
  const w = rows[0].length;
  const a = (deg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const R = Math.ceil(Math.hypot(w, h));
  const g = grid(R, R);
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < R; y++)
    for (let x = 0; x < R; x++) {
      const dx = x + 0.5 - R / 2;
      const dy = y + 0.5 - R / 2;
      const sx = Math.floor(ca * dx + sa * dy + cx);
      const sy = Math.floor(-sa * dx + ca * dy + cy);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      g[y][x] = rows[sy][sx];
    }
  let out = toRows(g);
  while (out.length && !/[^.]/.test(out[0])) out = out.slice(1);
  while (out.length && !/[^.]/.test(out[out.length - 1])) out = out.slice(0, -1);
  let l = 0;
  while (out.every((r) => r[l] === '.')) l++;
  let r = out[0].length - 1;
  while (out.every((row) => row[r] === '.')) r--;
  return out.map((row) => row.slice(l, r + 1));
}

/** Rotate rows 90 degrees clockwise. */
export function rotCW(rows: string[]): string[] {
  const h = rows.length;
  const w = rows[0].length;
  return Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => rows[h - 1 - y][x]).join(''));
}

/** Rotate rows 90 degrees anticlockwise. */
export function rotCCW(rows: string[]): string[] {
  const h = rows.length;
  const w = rows[0].length;
  return Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => rows[y][w - 1 - x]).join(''));
}

/** Deterministic pseudo-random numbers so art is stable between bakes. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
