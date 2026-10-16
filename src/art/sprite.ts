// Sprite definitions are written as rows of characters, one character per
// pixel, with a per-sprite legend mapping characters to palette entries. They
// are baked into RGBA buffers at boot (browser) or by `npm run art` (Node), so
// this module must stay free of DOM and Phaser imports.

import { PAL, PalName, hexToRgb } from './palette';

export type Colour = PalName | `#${string}`;
export type Legend = Record<string, Colour>;

export interface SpriteDef {
  /** Frame key. Single-frame sprites bake to `name`; animations to `name_0`, `name_1`, ... */
  name: string;
  legend: Legend;
  /** One or more frames, each an array of equal-length rows. */
  frames: string[][];
  /** Add a 1px outline (4-neighbour) around opaque pixels. `true` means ink. */
  outline?: boolean | Colour;
  /** Mirror rows to make them symmetric. 'even' duplicates every column; 'odd' shares the last column. */
  mirror?: 'even' | 'odd';
  /** Anchor point as a fraction of the final frame size. Defaults to the centre. */
  origin?: [number, number];
  /** Playback hint for animated sprites. */
  fps?: number;
}

export interface BakedFrame {
  key: string;
  w: number;
  h: number;
  data: Uint8ClampedArray;
  originX: number;
  originY: number;
}

const TRANSPARENT = new Set(['.', ' ']);

function resolve(c: Colour): [number, number, number] {
  if (c.startsWith('#')) return hexToRgb(c);
  const hex = PAL[c as PalName];
  if (!hex) throw new Error(`Unknown palette colour "${c}"`);
  return hexToRgb(hex);
}

function mirrorRows(rows: string[], mode: 'even' | 'odd'): string[] {
  return rows.map((r) => {
    const rev = [...r].reverse().join('');
    return mode === 'even' ? r + rev : r + rev.slice(1);
  });
}

export function bakeFrame(def: SpriteDef, frameIndex: number): BakedFrame {
  let rows = def.frames[frameIndex];
  if (def.mirror) rows = mirrorRows(rows, def.mirror);
  const pad = def.outline ? 1 : 0;
  const ih = rows.length;
  const iw = Math.max(...rows.map((r) => r.length));
  const w = iw + pad * 2;
  const h = ih + pad * 2;
  const data = new Uint8ClampedArray(w * h * 4);
  const opaque = new Uint8Array(w * h);
  for (let y = 0; y < ih; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (TRANSPARENT.has(ch)) continue;
      const c = def.legend[ch];
      if (!c) throw new Error(`Sprite "${def.name}" frame ${frameIndex}: no legend entry for "${ch}"`);
      const [r, g, b] = resolve(c);
      const px = x + pad;
      const py = y + pad;
      const i = (py * w + px) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
      opaque[py * w + px] = 1;
    }
  }
  if (def.outline) {
    const [r, g, b] = resolve(def.outline === true ? 'ink' : def.outline);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (opaque[y * w + x]) continue;
        const n =
          (x > 0 && opaque[y * w + x - 1]) ||
          (x < w - 1 && opaque[y * w + x + 1]) ||
          (y > 0 && opaque[(y - 1) * w + x]) ||
          (y < h - 1 && opaque[(y + 1) * w + x]);
        if (!n) continue;
        const i = (y * w + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
  }
  const [ox, oy] = def.origin ?? [0.5, 0.5];
  const key = def.frames.length === 1 ? def.name : `${def.name}_${frameIndex}`;
  return { key, w, h, data, originX: ox, originY: oy };
}

export function bakeDef(def: SpriteDef): BakedFrame[] {
  return def.frames.map((_, i) => bakeFrame(def, i));
}

// ---------------------------------------------------------------------------
// Authoring helpers. These work on character rows so sprites can be composed
// from parts (a body plus a hat, a stalk plus a fruit) before baking.

/** Make a blank grid of `w` x `h` transparent cells. */
export function blank(w: number, h: number): string[] {
  return Array.from({ length: h }, () => '.'.repeat(w));
}

/** Draw `top` onto `base` at (dx, dy); transparent cells in `top` are skipped. */
export function overlay(base: string[], top: string[], dx = 0, dy = 0): string[] {
  const out = base.map((r) => [...r]);
  top.forEach((row, y) => {
    const ty = y + dy;
    if (ty < 0 || ty >= out.length) return;
    [...row].forEach((ch, x) => {
      const tx = x + dx;
      if (TRANSPARENT.has(ch) || tx < 0 || tx >= out[ty].length) return;
      out[ty][tx] = ch;
    });
  });
  return out.map((r) => r.join(''));
}

/** Shift rows by (dx, dy) within the same size, filling with transparency. */
export function shift(rows: string[], dx: number, dy: number): string[] {
  const w = rows[0].length;
  return overlay(blank(w, rows.length), rows, dx, dy);
}

export function flipX(rows: string[]): string[] {
  return rows.map((r) => [...r].reverse().join(''));
}

/** Swap characters, e.g. to make a palette variant that reuses one legend. */
export function swapChars(rows: string[], map: Record<string, string>): string[] {
  return rows.map((r) => [...r].map((c) => map[c] ?? c).join(''));
}

/** Copy a def with a recoloured legend (palette swap). */
export function recolour(def: SpriteDef, name: string, legend: Partial<Legend>): SpriteDef {
  const merged: Legend = { ...def.legend };
  for (const [k, v] of Object.entries(legend)) if (v) merged[k] = v;
  return { ...def, name, legend: merged };
}

/** Pad every row to the same width so hand-typed art with ragged edges still bakes. */
export function normalise(rows: string[], w?: number): string[] {
  const width = w ?? Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(width, '.'));
}

export function sprite(name: string, legend: Legend, frames: string[][], opts: Partial<SpriteDef> = {}): SpriteDef {
  return { name, legend, frames: frames.map((f) => normalise(f)), ...opts };
}
