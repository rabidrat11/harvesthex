// Shared legend and a tiny drawing grid for the world group. The grid lets big
// props and buildings be blocked out with rectangles and lines and then
// finished with hand-typed detail stamps, all as plain character rows.
import type { Legend } from '../sprite';

/**
 * One legend for every world sprite, so parts can move between sprites.
 *
 *   greens   l lime  s sprout  g leaf  G moss  p pine  t teal  m marsh
 *   earth    u umber L loam  b bark  w wood  c clay  k skin  e peach  C cream
 *   harvest  h wheat r rust  B brick d blood f flame o orange a amber y gold Y butter
 *   neutral  # ink  v void  0 coal  1 soot  2 ash  3 slate  4 stone  5 pebble  W white
 *   cool     i mist  F fog  D dusk  S storm  N night  A abyss  q deep
 *   blues    n navy  U blue  K sky  x cyan  X aqua  I ice
 *   magic    j blush O orchid V violet 6 purple 7 indigo Q plumdark P plum M mauve
 *            z magenta R rose J salmon 8 coral 9 red T crimson E wine Z maroon H hot
 */
export const WL: Legend = {
  l: 'lime', s: 'sprout', g: 'leaf', G: 'moss', p: 'pine', t: 'teal', m: 'marsh',
  u: 'umber', L: 'loam', b: 'bark', w: 'wood', c: 'clay', k: 'skin', e: 'peach', C: 'cream',
  h: 'wheat', r: 'rust', B: 'brick', d: 'blood', f: 'flame', o: 'orange', a: 'amber', y: 'gold', Y: 'butter',
  '#': 'ink', v: 'void', '0': 'coal', '1': 'soot', '2': 'ash', '3': 'slate', '4': 'stone', '5': 'pebble', W: 'white',
  i: 'mist', F: 'fog', D: 'dusk', S: 'storm', N: 'night', A: 'abyss', q: 'deep',
  n: 'navy', U: 'blue', K: 'sky', x: 'cyan', X: 'aqua', I: 'ice',
  j: 'blush', O: 'orchid', V: 'violet', '6': 'purple', '7': 'indigo', Q: 'plumdark', P: 'plum', M: 'mauve',
  z: 'magenta', R: 'rose', J: 'salmon', '8': 'coral', '9': 'red', T: 'crimson', E: 'wine', Z: 'maroon', H: 'hot',
};

const CLEAR = new Set(['.', ' ']);

export class Grid {
  c: string[][];
  constructor(public w: number, public h: number, fill = '.') {
    this.c = Array.from({ length: h }, () => Array<string>(w).fill(fill));
  }
  static of(rows: string[]): Grid {
    const g = new Grid(Math.max(...rows.map((r) => r.length)), rows.length);
    return g.stamp(rows, 0, 0);
  }
  clone(): Grid {
    const g = new Grid(this.w, this.h);
    g.c = this.c.map((r) => [...r]);
    return g;
  }
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): string {
    return this.inside(x, y) ? this.c[y][x] : '.';
  }
  set(x: number, y: number, ch: string): this {
    if (this.inside(x, y)) this.c[y][x] = ch;
    return this;
  }
  /** Plot several points: `pts` is a flat list x0,y0,x1,y1,... */
  dots(ch: string, ...pts: number[]): this {
    for (let i = 0; i + 1 < pts.length; i += 2) this.set(pts[i], pts[i + 1], ch);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, ch);
    return this;
  }
  hline(x: number, y: number, len: number, ch: string): this {
    return this.rect(x, y, len, 1, ch);
  }
  vline(x: number, y: number, len: number, ch: string): this {
    return this.rect(x, y, 1, len, ch);
  }
  line(x0: number, y0: number, x1: number, y1: number, ch: string): this {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, ch);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }
  /** Filled ellipse centred on (cx, cy); half-pixel centres are fine. */
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / (rx + 0.01);
        const ny = (y - cy) / (ry + 0.01);
        if (nx * nx + ny * ny <= 1) this.set(x, y, ch);
      }
    return this;
  }
  /** Paste character rows; '.' and ' ' are transparent. */
  stamp(rows: string[], x: number, y: number): this {
    rows.forEach((r, yy) => [...r].forEach((ch, xx) => !CLEAR.has(ch) && this.set(x + xx, y + yy, ch)));
    return this;
  }
  /** Paste with toroidal wrap-around, for seamless terrain. */
  stampWrap(rows: string[], x: number, y: number): this {
    rows.forEach((r, yy) =>
      [...r].forEach((ch, xx) => {
        if (CLEAR.has(ch)) return;
        const tx = (((x + xx) % this.w) + this.w) % this.w;
        const ty = (((y + yy) % this.h) + this.h) % this.h;
        this.c[ty][tx] = ch;
      }),
    );
    return this;
  }
  /** Replace characters inside a region (whole grid by default). */
  swap(map: Record<string, string>, x = 0, y = 0, w = this.w, h = this.h): this {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        const ch = this.get(xx, yy);
        if (map[ch] !== undefined) this.set(xx, yy, map[ch]);
      }
    return this;
  }
  /** Only paint where the cell currently holds one of `on`. */
  paintOn(on: string, x: number, y: number, ch: string): this {
    if (on.includes(this.get(x, y))) this.set(x, y, ch);
    return this;
  }
  rows(): string[] {
    return this.c.map((r) => r.join(''));
  }
}

/** Lay frames out on an nx-by-ny grid; `pick(col,row)` chooses the frame. */
export function tileSheet(frames: string[][], nx: number, ny: number, pick: (x: number, y: number) => number): string[] {
  const th = frames[0].length;
  const tw = frames[0][0].length;
  const g = new Grid(tw * nx, th * ny);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) g.stamp(frames[pick(x, y) % frames.length], x * tw, y * th);
  return g.rows();
}

/** Hand-typed art: every row must be exactly `w` wide (catches typos early). */
export function art(name: string, w: number, rows: string[]): string[] {
  const bad = rows.map((r, i) => [i, r.length] as const).filter(([, n]) => n !== w);
  if (bad.length) throw new Error(`${name}: rows ${bad.map(([i, n]) => `${i}(${n})`).join(' ')} are not ${w} wide`);
  return rows;
}

/** Thick tapered stroke from (x0,y0) to (x1,y1), radius r0 -> r1. */
export function stroke(g: Grid, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, ch: string): Grid {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = r0 + (r1 - r0) * t;
    g.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, ch);
  }
  return g;
}

/**
 * Add a 1px ink outline (4-neighbour, like `outline: true`) by hand, for
 * sprites that must join seamlessly with their neighbours. Rows grow by one
 * at top and bottom. `wrapX` treats the art as horizontally periodic (no ink at
 * the side edges); `openLeft` leaves the left edge open but inks and pads the
 * right edge, for end pieces that butt against a tiling run; `openSides`
 * leaves both side edges open (a piece set into the middle of a run).
 */
export function ink(rows: string[], mode: 'wrapX' | 'openLeft' | 'openSides'): string[] {
  const h = rows.length;
  const w = rows[0].length;
  const ow = mode === 'openLeft' ? w + 1 : w;
  const solid = (x: number, y: number): boolean => {
    if (y < 0 || y >= h) return false;
    if (mode === 'wrapX') x = (x + w) % w;
    else if (x < 0) return mode === 'openLeft' || mode === 'openSides' ? !CLEAR.has(rows[y][0]) : false;
    if (x >= w) return mode === 'openSides' ? !CLEAR.has(rows[y][w - 1]) : false;
    return !CLEAR.has(rows[y][x]);
  };
  const out: string[] = [];
  for (let y = -1; y <= h; y++) {
    let r = '';
    for (let x = 0; x < ow; x++) {
      if (solid(x, y)) r += rows[y][x];
      else r += solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1) ? '#' : '.';
    }
    out.push(r);
  }
  return out;
}

export interface Tones {
  deep: string;
  shade: string;
  base: string;
  lit: string;
}

/**
 * Leafy mass from overlapping lobes, drawn back to front. Each lobe is lit on
 * its upper-left and shaded on its lower-right, so the clusters separate.
 */
export function foliage(g: Grid, lobes: [cx: number, cy: number, r: number][], t: Tones): Grid {
  for (const [cx, cy, r] of lobes) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = (x - cx) / (r + 0.01);
        const dy = (y - cy) / (r + 0.01);
        if (dx * dx + dy * dy > 1) continue;
        // distance from a highlight centre up and left of the lobe's middle
        const d = Math.hypot(dx + 0.32, dy + 0.42);
        g.set(x, y, d < 0.42 ? t.lit : d < 0.98 ? t.base : d < 1.3 ? t.shade : t.deep);
      }
  }
  return g;
}
