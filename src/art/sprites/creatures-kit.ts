// Shared helpers for the creatures group. Everything here works on character
// rows (see ../sprite.ts) so frames can be composed from hand-drawn parts.
import { blank, overlay, flipX } from '../sprite';

/** Pad (never crop) rows to exactly w x h; throws if the art is too big, so typos surface early. */
export function fit(rows: string[], w: number, h: number, what = 'part'): string[] {
  if (rows.length > h) throw new Error(`${what}: ${rows.length} rows > ${h}`);
  rows.forEach((r, i) => {
    if (r.length > w) throw new Error(`${what}: row ${i} is ${r.length} wide > ${w}: "${r}"`);
  });
  return [...rows.map((r) => r.padEnd(w, '.')), ...blank(w, h - rows.length)];
}

/** Mirror left halves into full rows ('odd' shares the centre column). */
export function mirror(rows: string[], mode: 'odd' | 'even'): string[] {
  return rows.map((r) => {
    const rev = [...r].reverse().join('');
    return mode === 'even' ? r + rev : r + rev.slice(1);
  });
}

export type Layer = [rows: string[], dx?: number, dy?: number];

/** Stack layers bottom-to-top onto a blank w x h canvas. */
export function compose(w: number, h: number, ...layers: Layer[]): string[] {
  let out = blank(w, h);
  for (const [rows, dx = 0, dy = 0] of layers) out = overlay(out, rows, dx, dy);
  return out;
}

/** Replace every non-transparent cell of `rows` with `ch` (for masks and silhouettes). */
export function solid(rows: string[], ch: string): string[] {
  return rows.map((r) => [...r].map((c) => (c === '.' || c === ' ' ? '.' : ch)).join(''));
}

/** Remove rows [from, from+count) from a part: a cheap vertical squash for chunky bodies. */
export function dropRows(rows: string[], from: number, count: number): string[] {
  return [...rows.slice(0, from), ...rows.slice(from + count)];
}

/** Repeat column `at` `count` extra times: a cheap horizontal stretch. */
export function widen(rows: string[], at: number, count: number): string[] {
  return rows.map((r) => r.slice(0, at) + r[at].repeat(count) + r.slice(at));
}

export { flipX };
