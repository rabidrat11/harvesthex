// Helpers for the ui group: 9-slice frame assembly, char-domain outlining and
// a legend-merging composer used by the preview_ sprites.
import { blank, type Colour, type Legend, type SpriteDef } from '../sprite';

const CLEAR = new Set(['.', ' ']);

/** Mirror rows the way the baker does, so composition sees the final pixels. */
function mirrored(def: SpriteDef, rows: string[]): string[] {
  if (!def.mirror) return rows;
  return rows.map((r) => {
    const rev = [...r].reverse().join('');
    return def.mirror === 'even' ? r + rev : r + rev.slice(1);
  });
}

/**
 * Build a w x h frame from edge profiles. Each profile lists `b` characters
 * from the outside edge inwards; edges are uniform along their length so the
 * frame stretches cleanly. Corners are b x b blocks drawn by hand, the centre
 * is a tile repeated to fill.
 */
export function frame(opts: {
  w: number;
  h: number;
  b: number;
  top: string;
  bottom: string;
  left: string;
  right: string;
  centre: string[];
  tl: string[];
  tr: string[];
  bl: string[];
  br: string[];
}): string[] {
  const { w, h, b } = opts;
  const g = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  for (let y = b; y < h - b; y++)
    for (let x = b; x < w - b; x++) {
      const t = opts.centre;
      g[y][x] = t[(y - b) % t.length][(x - b) % t[0].length];
    }
  for (let i = 0; i < b; i++) {
    for (let x = b; x < w - b; x++) {
      g[i][x] = opts.top[i];
      g[h - 1 - i][x] = opts.bottom[i];
    }
    for (let y = b; y < h - b; y++) {
      g[y][i] = opts.left[i];
      g[y][w - 1 - i] = opts.right[i];
    }
  }
  const put = (blk: string[], ox: number, oy: number) =>
    blk.forEach((row, y) => [...row].forEach((ch, x) => (g[oy + y][ox + x] = ch)));
  put(opts.tl, 0, 0);
  put(opts.tr, w - b, 0);
  put(opts.bl, 0, h - b);
  put(opts.br, w - b, h - b);
  return g.map((r) => r.join(''));
}

/** Re-slice a frame to a new size by repeating its edges and centre (CSS border-image: round/repeat). */
export function nineSlice(rows: string[], b: number, W: number, H: number): string[] {
  const w = rows[0].length;
  const h = rows.length;
  const cw = w - 2 * b;
  const ch = h - 2 * b;
  const srcX = (x: number) => (x < b ? x : x >= W - b ? w - (W - x) : b + ((x - b) % cw));
  const srcY = (y: number) => (y < b ? y : y >= H - b ? h - (H - y) : b + ((y - b) % ch));
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => rows[srcY(y)][srcX(x)]).join(''),
  );
}

/** A colour canvas that sprites (any legend) can be stamped onto, then turned back into a SpriteDef. */
export class Board {
  px: (Colour | null)[][];
  constructor(public w: number, public h: number, fill: Colour | null = null) {
    this.px = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }
  /** Stamp raw rows using a legend. */
  rows(rows: string[], legend: Legend, dx: number, dy: number): this {
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (CLEAR.has(ch)) return;
        const X = dx + x;
        const Y = dy + y;
        if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
        this.px[Y][X] = legend[ch];
      }),
    );
    return this;
  }
  /** Stamp a sprite frame exactly as it bakes (mirror + outline), top-left at (dx, dy). */
  sprite(def: SpriteDef, frameIndex: number, dx: number, dy: number): this {
    let rows = mirrored(def, def.frames[frameIndex]);
    let legend = def.legend;
    if (def.outline) {
      const oc = def.outline === true ? 'ink' : def.outline;
      rows = outlineRows(rows, '\u0001');
      legend = { ...legend, '\u0001': oc };
    }
    return this.rows(rows, legend, dx, dy);
  }
  rect(x: number, y: number, w: number, h: number, c: Colour): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.px[yy]?.[xx] !== undefined) this.px[yy][xx] = c;
    return this;
  }
  toSprite(name: string): SpriteDef {
    const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-=?@^~<>/|:;,_()[]{}';
    const legend: Legend = {};
    const back = new Map<string, string>();
    const rows = this.px.map((r) =>
      r
        .map((c) => {
          if (c === null) return '.';
          let k = back.get(c);
          if (!k) {
            k = pool[back.size];
            if (!k) throw new Error(`${name}: too many colours to compose`);
            back.set(c, k);
            legend[k] = c;
          }
          return k;
        })
        .join(''),
    );
    return { name, legend, frames: [rows] };
  }
}

/** Grow rows by 1px on every side and ring opaque cells with `ch` (4-neighbour, like the baker). */
export function outlineRows(rows: string[], ch: string): string[] {
  const h = rows.length + 2;
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const g = blank(w, h).map((r) => [...r]);
  rows.forEach((row, y) => [...row].forEach((c, x) => (g[y + 1][x + 1] = c)));
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !CLEAR.has(g[y][x]) && g[y][x] !== ch;
  const out = g.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!CLEAR.has(g[y][x])) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out[y][x] = ch;
    }
  return out.map((r) => r.join(''));
}
