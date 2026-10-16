// Preview-only helpers for the combat group: composites baked-looking sprites
// (outline included) onto patches of meadow grass and corrupted soil so bullet
// contrast can be judged on the contact sheet. Nothing here ships as a frame
// the game uses; the sprites it builds are all prefixed `preview_`.
import { PAL, type PalName } from '../palette';
import { blank, overlay, type Legend, type SpriteDef } from '../sprite';

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@%&*+=~^!?<>/|:;';
const NAMES = Object.keys(PAL) as PalName[];
const CHAR_OF = Object.fromEntries(NAMES.map((n, i) => [n, CHARS[i]])) as Record<PalName, string>;

/** One legend covering the whole palette, used by every preview sprite. */
export const GLOBAL: Legend = Object.fromEntries(NAMES.map((n, i) => [CHARS[i], n]));

/** A frame of `def` as rows in the GLOBAL legend, with mirror and outline applied as the baker does. */
export function globalRows(def: SpriteDef, frame = 0): string[] {
  let rows = def.frames[frame];
  if (def.mirror) {
    rows = rows.map((r) => {
      const rev = [...r].reverse().join('');
      return def.mirror === 'even' ? r + rev : r + rev.slice(1);
    });
  }
  const pad = def.outline ? 1 : 0;
  const iw = Math.max(...rows.map((r) => r.length));
  const w = iw + pad * 2;
  const h = rows.length + pad * 2;
  const g = blank(w, h).map((r) => [...r]);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      g[y + pad][x + pad] = CHAR_OF[def.legend[ch] as PalName];
    }),
  );
  if (def.outline) {
    const o = CHAR_OF[(def.outline === true ? 'ink' : def.outline) as PalName];
    const opaque = g.map((r) => r.map((ch) => ch !== '.'));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (opaque[y][x]) continue;
        const n =
          (x > 0 && opaque[y][x - 1]) ||
          (x < w - 1 && opaque[y][x + 1]) ||
          (y > 0 && opaque[y - 1][x]) ||
          (y < h - 1 && opaque[y + 1][x]);
        if (n) g[y][x] = o;
      }
  }
  return g.map((r) => r.join(''));
}

// Small deterministic hash so the ground is stable between previews.
function hash(x: number, y: number, s: number): number {
  let n = x * 374761393 + y * 668265263 + s * 2147483647;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise in [0, 1] with cells of `cell` pixels. */
function smooth(x: number, y: number, cell: number, s: number): number {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = (x % cell) / cell;
  const fy = (y % cell) / cell;
  const a = hash(gx, gy, s);
  const b = hash(gx + 1, gy, s);
  const c = hash(gx, gy + 1, s);
  const d = hash(gx + 1, gy + 1, s);
  const top = a + (b - a) * fx;
  const bot = c + (d - c) * fx;
  return top + (bot - top) * fy;
}

/** Yellowed blighted-meadow grass: wheat base, amber patches, sparse moss and bark blades. */
export function meadow(w: number, h: number, seed = 1): string[] {
  const c = CHAR_OF;
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const patch = smooth(x, y, 7, seed) < 0.38;
      const r = hash(x, y, seed + 7);
      // Short blades: a dark root pixel under a lighter tip.
      if (hash(x, y + 1, seed + 3) < 0.035) return c.gold;
      if (hash(x, y, seed + 3) < 0.035) return hash(x, y, seed + 8) < 0.5 ? c.moss : c.bark;
      if (r < 0.025) return c.moss;
      if (patch) return r < 0.85 ? c.amber : c.wheat;
      return r < 0.06 ? c.amber : c.wheat;
    }).join(''),
  );
}

/** Corrupted soil: plum/maroon mottling with pale root veins. */
export function corrupt(w: number, h: number, seed = 2): string[] {
  const c = CHAR_OF;
  const g = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const r = hash(x, y, seed);
      const patch = smooth(x, y, 6, seed + 1);
      if (patch < 0.33) return r < 0.85 ? c.maroon : c.plumdark;
      if (r < 0.04) return c.plumdark;
      if (r < 0.09) return c.maroon;
      return c.plum;
    }),
  );
  // A few wandering pale root veins.
  for (let v = 0; v < Math.ceil((w * h) / 500); v++) {
    let x = Math.floor(hash(v, 0, seed + 9) * w);
    let y = Math.floor(hash(v, 1, seed + 9) * h);
    for (let s = 0; s < 14; s++) {
      if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = s % 6 === 0 ? c.blush : c.mauve;
      x += 1;
      y += hash(v, s, seed + 5) < 0.3 ? 1 : hash(v, s, seed + 6) < 0.4 ? -1 : 0;
    }
  }
  return g.map((r) => r.join(''));
}

/** Farm grass, the home-field green. */
export function farm(w: number, h: number, seed = 3): string[] {
  const c = CHAR_OF;
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const r = hash(x, y, seed);
      const blade = hash(x, y + 1, seed + 3) < 0.08;
      if (blade) return c.moss;
      if (hash(x, y, seed + 3) < 0.08) return c.sprout;
      return r < 0.25 ? c.moss : c.leaf;
    }).join(''),
  );
}

export type Placement = [SpriteDef, number, number, number?];

/** Paint sprites (centred on x, y) over a ground. */
export function scene(name: string, ground: string[], items: Placement[]): SpriteDef {
  let rows = ground;
  for (const [def, x, y, frame = 0] of items) {
    const r = globalRows(def, frame);
    rows = overlay(rows, r, Math.round(x - r[0].length / 2), Math.round(y - r.length / 2));
  }
  return { name, legend: GLOBAL, frames: [rows] };
}

/** Side-by-side ground strips (meadow | corrupted | farm) for a single row of items. */
export function strips(w: number, h: number): string[] {
  const a = meadow(w, h);
  const b = corrupt(w, h);
  return a.map((r, i) => r + b[i]);
}
