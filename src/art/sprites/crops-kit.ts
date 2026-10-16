// Shared legend and helpers for the crops group.
//
// Every crop sprite uses one master legend so parts (a soil mound, a seed, a
// packet illustration) can be composed freely. Characters are mnemonic:
//
//   #  ink (black, used for interior separators like the pack's icons)
//   neutrals    1 coal  2 soot  3 ash  4 slate  5 stone  6 pebble  W white
//   cool greys  m mist  f fog  d dusk  t storm  n night  8 abyss  9 deep
//   earth       U umber  L loam  B bark  w wood  c clay  k skin  p peach  C cream
//   harvest     h wheat  r rust  R brick  D blood  F flame  o orange  a amber  y gold  Y butter
//   greens      l lime  s sprout  g leaf  G moss  P pine  T teal  M marsh
//   blues       N navy  b blue  S sky  i cyan  A aqua  I ice
//   magic       J blush  O orchid  v violet  K purple  Q plumdark  q plum  u mauve  j magenta
//   reds        Z rose  z salmon  x coral  e red  E crimson  V wine  X maroon  H hot
import { blank, overlay, type Legend } from '../sprite';

export const L: Legend = {
  '#': 'ink',
  '1': 'coal', '2': 'soot', '3': 'ash', '4': 'slate', '5': 'stone', '6': 'pebble', W: 'white',
  m: 'mist', f: 'fog', d: 'dusk', t: 'storm', n: 'night', '8': 'abyss', '9': 'deep',
  U: 'umber', L: 'loam', B: 'bark', w: 'wood', c: 'clay', k: 'skin', p: 'peach', C: 'cream',
  h: 'wheat', r: 'rust', R: 'brick', D: 'blood', F: 'flame', o: 'orange', a: 'amber', y: 'gold', Y: 'butter',
  l: 'lime', s: 'sprout', g: 'leaf', G: 'moss', P: 'pine', T: 'teal', M: 'marsh',
  N: 'navy', b: 'blue', S: 'sky', i: 'cyan', A: 'aqua', I: 'ice',
  J: 'blush', O: 'orchid', v: 'violet', K: 'purple', Q: 'plumdark', q: 'plum', u: 'mauve', j: 'magenta',
  Z: 'rose', z: 'salmon', x: 'coral', e: 'red', E: 'crimson', V: 'wine', X: 'maroon', H: 'hot',
};

/** Hand-drawn part. Throws if rows are ragged, so typos show up at bake time. */
export function art(name: string, rows: string[]): string[] {
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`crops: part "${name}" row ${i} is ${r.length} wide, expected ${w}`);
  });
  return rows;
}

/** Compose parts onto a fresh w x h canvas. Later parts draw over earlier ones. */
export function compose(w: number, h: number, parts: [string[], number, number][]): string[] {
  return parts.reduce((acc, [rows, dx, dy]) => overlay(acc, rows, dx, dy), blank(w, h));
}

/** A frame drawn to exact size; validates dimensions. */
export function frame(name: string, w: number, h: number, rows: string[]): string[] {
  art(name, rows);
  if (rows.length !== h || rows[0].length !== w)
    throw new Error(`crops: frame "${name}" is ${rows[0].length}x${rows.length}, expected ${w}x${h}`);
  return rows;
}

/** Bottom-align a part inside a w x h canvas (used to drop short stages into tall frames). */
export function bottom(w: number, h: number, rows: string[], dx = 0): string[] {
  return compose(w, h, [[rows, dx, h - rows.length]]);
}
