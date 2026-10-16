// The Marrow King: colossal crowned turnip, first boss of the Blighted Meadow.
// Body, mantle, roots, arms and beard are painted with the raster toolkit so
// every pose shares one construction; crown and face are hand-drawn.
import { sprite, swapChars, type SpriteDef } from '../sprite';
import {
  blob, bulb, bulbHalfWidth, fromRows, grid, leafW, put, rng, rotate, shearRows, stamp, stroke, taper, toRows,
  type BulbOpts, type Grid, type Pt, type Ramp,
} from './creatures-raster';

export const KING = {
  x: 'deep', u: 'umber', l: 'loam', b: 'bark', d: 'wood', y: 'clay', s: 'skin', e: 'peach', c: 'cream', W: 'white',
  q: 'plumdark', p: 'plum', m: 'mauve', M: 'magenta', o: 'orchid', B: 'blush', h: 'hot', r: 'rose', N: 'wine', n: 'maroon',
  K: 'marsh', T: 'teal', P: 'pine', F: 'moss', f: 'leaf', S: 'sprout',
  z: 'butter', g: 'gold', a: 'amber', O: 'orange', R: 'rust',
} as const;

const W = 62;
const H = 66;
const CX = 31;

const PLUM: Ramp = ['M', 'm', 'p', 'q', 'q'];
const CREAM: Ramp = ['c', 'c', 'c', 'e', 's'];
const MANTLE: Ramp = ['P', 'T', 'K', 'x'];
const ROOT: Ramp = ['y', 'd', 'b', 'l'];

const mx = (p: Pt): Pt => [2 * CX - p[0], p[1]];
const mirrorPts = (pts: Pt[]) => pts.map(mx);

// Crown carved from old wood: five tapering points with amber orbs, a band
// of amber studs, one crack and one chipped point. Built from rules so the
// shading is consistent, 28x15.
function makeCrown(): string[] {
  const w = 28;
  const g = grid(w, 15);
  const bandTop = 9;
  // Band.
  for (let y = bandTop; y < 15; y++)
    for (let x = 0; x < w; x++) {
      let c = 'd';
      if (y === bandTop) c = x < 15 ? 'y' : 'd';
      if (x === 0) c = 'y';
      if (x === w - 1 || (x === w - 2 && y > bandTop)) c = 'b';
      if (y === 13) c = x === 0 ? 'y' : 'b';
      if (y === 14) c = 'l';
      g[y][x] = c;
    }
  // Studs.
  for (const sx of [2, 7, 12, 17, 22]) {
    g[11][sx] = 'g';
    g[11][sx + 1] = 'a';
    g[12][sx] = 'a';
    g[12][sx + 1] = 'O';
  }
  // Points: [centre x, height above band, orb?]
  const points: [number, number, boolean][] = [[2.5, 3, true], [8, 5, true], [13.5, 8, true], [19, 5, false], [24.5, 3, true]];
  for (const [px, ph, orb] of points) {
    for (let k = 1; k <= ph; k++) {
      const y = bandTop - k;
      const half = 0.6 + (1 - (k - 1) / ph) * 1.9;
      const x0 = Math.round(px - half);
      const x1 = Math.round(px + half) - 1;
      for (let x = x0; x <= x1; x++) g[y][x] = x === x0 ? 'y' : x === x1 ? 'b' : 'd';
    }
    const ty = bandTop - ph - 1;
    const ox = Math.round(px) - 1;
    if (orb) {
      // Amber orb: diamond, lit top-left.
      if (ty - 1 >= 0) g[ty - 1][ox + 1] = 'z';
      g[ty][ox] = 'g';
      g[ty][ox + 1] = 'a';
      g[ty][ox + 2] = 'O';
      if (ty + 1 < bandTop) g[ty + 1][ox + 1] = 'R';
    } else {
      // Chipped: broken tip, splintered.
      g[ty + 1][ox + 1] = 'b';
      g[ty + 1][ox + 2] = '.';
    }
  }
  // Crack down the band.
  g[bandTop][16] = 'u';
  g[bandTop + 1][16] = 'u';
  g[bandTop + 1][17] = 'u';
  g[bandTop + 2][17] = 'u';
  return toRows(g);
}
export const CROWN = makeCrown();

// ---------------------------------------------------------------------------
// Face parts. Eyes are deep hollow sockets with a hot-pink ember (left eye,
// inner side on the right; the right eye is mirrored).
const flip = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));

const EYE = [
  'mmm......',
  'qqqxq....',
  'qxxxxxxq.',
  'xxxhhxxxq',
  'xxhBWhxxx',
  'xxrhhhrx.',
  '.xxxxxxx.',
  '..xxxx...',
];
const EYE_BLAZE = [
  'mmm......',
  'qqqxq....',
  'qxrhhrxq.',
  'xrhBBhrxq',
  'xhBWWBhxx',
  'xrhBBhrx.',
  '.xrhhrxx.',
  '..xxxx...',
];
const EYE_SQUINT = [
  '.........',
  'mmmm.....',
  'qqqqqm...',
  'xxxxxqqm.',
  'xrhBWhxxq',
  '.xxxxxxx.',
];
const EYE_DIM = swapChars(EYE, { W: 'r', B: 'h', h: 'N', r: 'n' });
const EYE_DEAD = swapChars(EYE, { W: 'n', B: 'x', h: 'x', r: 'x' });

// Scowl with two crooked teeth and a maroon tongue.
const MOUTH = [
  '...uuuuuuuuuu...',
  '.uuxcxxxxxxxcxu.',
  'uxxxcxxnNNnxcxxu',
  '.uxxxxnNNNNnxxu.',
  '..uuxxxxxxxxuu..',
  '....uuuuuuuu....',
];
// Roar: crooked teeth top and bottom, throat glowing where seeds come from.
const MOUTH_ROAR = [
  '...uuuuuuuuuu...',
  '.uucxcxxxxcxcuu.',
  'uxxxcxxxxxxcxxxu',
  'uxxxxxNhhNxxxxxu',
  'uxxxxNhBBhNxxxxu',
  'uxxxxNhBWhNxxxxu',
  '.uxxxxNhhNxxxxu.',
  '.uxcxxxxxxxxcxu.',
  '..uucxxxxxxcuu..',
  '....uuuuuuuu....',
];
const MOUTH_GRIT = [
  '..uuuuuuuuuuuu..',
  '.ucceccecceccecu',
  '.useesseesseesu.',
  '..uuuuuuuuuuuu..',
];
const MOUTH_SNARL = swapChars(MOUTH, { n: 'M', N: 'o' });
const MOUTH_AGAPE = [
  '....uuuuuuuu....',
  '..uuxxxxxxxxuu..',
  '.uxxxxxxxxxxxxu.',
  '.uxxxxxnnxxxxxu.',
  '..uxxxxnnxxxxu..',
  '...uuxxxxxxuu...',
  '.....uuuuuu.....',
];

// ---------------------------------------------------------------------------
// Construction.

interface Leaf { pts: Pt[]; w: number }
interface Root { pts: Pt[]; w: number }
interface Arm { pts: Pt[]; fingers: Pt[][] }

interface Pose {
  top: number;
  bottom: number;
  hw: number;
  face: number; // eye row
  crown: { rows: string[]; x: number; y: number }[];
  leaves: Leaf[];
  roots: Root[];
  arms: Arm[];
  eye: string[];
  mouth: string[];
  mouthDy?: number;
  beardDy?: number;
  tache?: 'down' | 'up';
  crack?: { level: number; half: number };
  wither?: number;
  /** Extra layers painted after everything but the crown. */
  extra?: (g: Grid) => void;
}

const PLUM_RAMP = PLUM;
function skinAt(top: number, bottom: number) {
  return (x: number, y: number): Ramp => {
    const edge = top + (bottom - top) * 0.5 + 1.4 * Math.sin(x * 0.8) + 1.1 * Math.sin(x * 0.31 + 1);
    return y < edge ? PLUM_RAMP : CREAM;
  };
}

const ARM: Ramp = ['s', 'y', 'd', 'b'];
const BEARD_A: Ramp = ['F', 'F', 'P', 'T'];
const BEARD_B: Ramp = ['f', 'F', 'P', 'K'];
const BROW: Ramp = ['M', 'm', 'p', 'q'];
const VEIN: Ramp = ['o', 'M', 'M', 'm'];

// Rot pocks on the plum skin (offsets from the eye row).
const POCKS: [number, number][] = [[-15, -4], [13, 5], [-9, 9]];

const WITHER: Record<string, string> = {
  W: 'c', c: 'e', e: 's', s: 'y', M: 'm', m: 'p', p: 'q', q: 'u',
  S: 'f', f: 'F', F: 'P', P: 'T', T: 'K', K: 'x',
  B: 'h', h: 'r', r: 'N', o: 'm',
};

function bulbOpts(p: Pose): BulbOpts {
  const skin = skinAt(p.top, p.bottom);
  // Keep the pale belly evenly lit so its shadow doesn't read as a sash.
  return { cx: CX, top: p.top, bottom: p.bottom, hw: p.hw, belly: 0.47, round: 2.6, skin, bias: (x, y) => {
    if (skin(x, y) !== CREAM) return 0;
    const ny = Math.max(0, Math.min(1, ((y + 0.5 - p.top) / (p.bottom - p.top) - 0.47) * 1.9));
    return 0.1 + ny * 0.55;
  } };
}

/** The phase-two wound: the bulb splits down the middle around a glowing core. */
function splitCore(g: Grid, p: Pose) {
  if (!p.crack) return;
  const { level, half: maxHalf } = p.crack;
  const y0 = p.top + 3;
  const y1 = p.bottom - 4;
  const jag = [0, 1, 1, 0, -1, -1, 0, 1];
  const glow = [['W', 'B', 'o', 'M'], ['B', 'o', 'M', 'p'], ['p', 'q', 'q', 'x']][level];
  const o = bulbOpts(p);
  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const half = maxHalf * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 1.6);
    const xc = CX + jag[y % jag.length] * 0.8;
    const bw = bulbHalfWidth(o, y);
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x + 0.5 - xc);
      if (Math.abs(x + 0.5 - CX) > bw - 1) continue;
      if (d > half + 1) continue;
      let c: string;
      if (half < 0.6) c = d < 0.8 ? 'x' : '.';
      else if (d > half) c = x < xc ? 'c' : 'e';
      else {
        const k = d / half;
        c = glow[k < 0.3 ? 0 : k < 0.6 ? 1 : k < 0.85 ? 2 : 3];
      }
      if (c !== '.') put(g, x, y, c);
    }
  }
  // Glowing veins creeping out from the wound.
  if (level < 2) {
    const ey = p.face;
    const veins: Pt[][] = [
      [[CX - 2, ey + 4], [CX - 6, ey + 1], [CX - 9, ey - 5]],
      [[CX + 2, ey + 16], [CX + 9, ey + 14], [CX + 15, ey + 18]],
      [[CX - 2, ey + 18], [CX - 10, ey + 20], [CX - 14, ey + 26]],
      [[CX + 2, ey + 2], [CX + 7, ey - 2], [CX + 8, ey - 7]],
    ];
    for (const v of veins) stroke(g, v, { width: taper(1.6, 1), ramp: level ? ['m', 'm', 'p', 'p'] : VEIN });
  }
}

function paint(p: Pose): Grid {
  const g = grid(W, H);
  for (const l of p.leaves) stroke(g, l.pts, { width: leafW(l.w), ramp: MANTLE, vein: 'F', crack: 'K', crackEvery: 9 });
  for (const r of p.roots) stroke(g, r.pts, { width: taper(r.w, 1, 0.8), ramp: ROOT, tip: 'q', tipLen: 3 });
  bulb(g, bulbOpts(p));
  const ey = p.face;
  for (const [dx, dy] of POCKS) stamp(g, ['.q.', 'qxp', '.p.'], CX + dx, ey + dy);
  for (const a of p.arms) {
    stroke(g, a.pts, { width: taper(5, 3), ramp: ARM });
    for (const f of a.fingers) stroke(g, f, { width: taper(2.6, 1), ramp: ARM, tip: 'q', tipLen: 1 });
  }
  // Beard: strands of two greens gathered to a point with an amber bead.
  const by = ey + (p.beardDy ?? 13);
  for (let i = 0; i < 6; i++) {
    const sx = CX - 5 + i * 2;
    const len = 12 + (i % 2 ? 0 : 2) - Math.abs(i - 2.5);
    stroke(g, [[sx, by], [sx + (i < 3 ? -1.5 : 1.5), by + 6], [CX + (i - 2.5) * 0.8, by + len]], { width: taper(3, 1.2), ramp: i % 2 ? BEARD_A : BEARD_B });
  }
  stamp(g, ['zg', 'aO', 'RO'], CX - 1, by + 10);
  stroke(g, [[CX, by + 13], [CX - 1, by + 15], [CX + 1, by + 17]], { width: taper(2.4, 1), ramp: BEARD_A });
  const mouthY = ey + (p.mouthDy ?? 10);
  stamp(g, p.mouth, CX - (p.mouth[0].length >> 1), mouthY);
  for (const side of [-1, 1]) {
    const up = p.tache === 'up';
    stroke(g, [[CX, mouthY - 1], [CX + side * 7, mouthY - (up ? 4 : 2)], [CX + side * 12, mouthY + (up ? -5 : 4)]], { width: leafW(4.2), ramp: BEARD_A });
  }
  splitCore(g, p);
  stamp(g, p.eye, CX - 13, ey);
  stamp(g, flip(p.eye), CX + 4, ey);
  // Heavy brows slanting down toward the middle.
  stroke(g, [[CX - 15, ey], [CX - 10, ey - 2], [CX - 3, ey + 2]], { width: taper(3.2, 2.2), ramp: BROW });
  stroke(g, [[CX + 15, ey], [CX + 10, ey - 2], [CX + 3, ey + 2]], { width: taper(3.2, 2.2), ramp: BROW });
  p.extra?.(g);
  let out = toRows(g);
  for (let i = 0; i < (p.wither ?? 0); i++) out = swapChars(out, WITHER);
  const g2 = fromRows(out);
  for (const c of p.crown) stamp(g2, c.rows, c.x, c.y);
  return g2;
}

// Mantle: the King's own turnip greens draping from under the crown, with
// leafy pauldron spikes at the shoulders. Mirrored for the right side.
function makeLeaves(dy = 0, flare = 0, droop = 0): Leaf[] {
  const left: Leaf[] = [
    { pts: [[22, 18 + dy], [6 - flare, 16 + dy + droop], [1 - flare, 34 + dy + droop], [5 - flare, 52 + dy + droop / 2]], w: 11 },
    { pts: [[24, 16 + dy], [12, 12 + dy + droop], [5 - flare, 26 + dy + droop], [9 - flare, 44 + dy + droop]], w: 9 },
    { pts: [[25, 20 + dy], [14, 22 + dy], [11, 38 + dy], [15, 52 + dy]], w: 8 },
    { pts: [[22, 20 + dy], [14, 14 + dy + droop], [7 - flare, 9 + dy - flare + droop * 1.6], [2 - flare, 10 + dy - flare + droop * 2]], w: 6 },
    { pts: [[20, 24 + dy], [12, 22 + dy + droop], [5, 19 + dy + droop * 1.5], [0, 22 + dy + droop * 1.8]], w: 5 },
  ];
  return [...left, ...left.map((l) => ({ ...l, pts: mirrorPts(l.pts) }))];
}

// Skirt of seven writhing roots fanning out from under the bulb.
function makeRoots(o: { by: number; spread?: number; lift?: number; phase?: number; amp?: number; flat?: number }): Root[] {
  const out: Root[] = [];
  const spread = o.spread ?? 1;
  for (let i = -3; i <= 3; i++) {
    const a = Math.abs(i);
    const sx = CX + i * 3.4;
    const sy = o.by - a * 1.3;
    const tx = CX + i * 9.6 * spread;
    const ty = Math.min(65, 65 - (o.lift ?? 0) * a - (a === 3 ? 2 : 0) + (o.flat ?? 0) * (a === 3 ? 2 : 0));
    const w1 = Math.sin((o.phase ?? 0) + i * 1.7) * (o.amp ?? 1);
    out.push({
      pts: [[sx, sy], [sx + i * 2.6 + w1, sy + 6 - (o.flat ?? 0) * 3], [tx - i * 1.2 - w1, ty - 4 + w1], [tx, ty]],
      w: a >= 2 ? 5 : a === 1 ? 4 : 3,
    });
  }
  return out;
}

function armPair(kind: 'idle' | 'raised' | 'slam' | 'limp' | 'flop', dy = 0): Arm[] {
  const L: Record<typeof kind, Arm> = {
    idle: {
      pts: [[12, 34], [6, 36], [4, 42], [7, 47]],
      fingers: [[[7, 47], [4, 50], [3, 53]], [[7, 47], [7, 51], [6, 54]], [[8, 47], [10, 50], [11, 52]]],
    },
    raised: {
      pts: [[12, 32], [4, 30], [2, 20], [6, 11]],
      fingers: [[[6, 11], [3, 7], [2, 3]], [[6, 11], [7, 6], [7, 2]], [[7, 12], [10, 8], [12, 6]]],
    },
    slam: {
      pts: [[11, 42], [4, 45], [2, 55], [6, 62]],
      fingers: [[[6, 62], [2, 63], [0, 65]], [[6, 62], [6, 64], [5, 65]], [[7, 62], [10, 63], [12, 65]]],
    },
    limp: {
      pts: [[12, 37], [8, 42], [7, 50], [9, 56]],
      fingers: [[[9, 56], [7, 59], [7, 62]], [[9, 56], [10, 60], [10, 62]], [[10, 56], [12, 58], [13, 60]]],
    },
    flop: {
      pts: [[14, 54], [9, 58], [5, 62], [2, 64]],
      fingers: [[[2, 64], [0, 65], [0, 65]], [[3, 64], [3, 65], [2, 65]]],
    },
  };
  const a = L[kind];
  const shiftA = (arm: Arm): Arm => ({ pts: arm.pts.map(([x, y]) => [x, y + dy] as Pt), fingers: arm.fingers.map((f) => f.map(([x, y]) => [x, y + dy] as Pt)) });
  const left = shiftA(a);
  return [left, { pts: mirrorPts(left.pts), fingers: left.fingers.map(mirrorPts) }];
}

const crownAt = (x: number, y: number, slope = 0) => ({ rows: slope ? shearRows(CROWN, slope) : CROWN, x, y });

// ---------------------------------------------------------------------------
// Poses.

const IDLE: Pose = {
  top: 13, bottom: 56, hw: 21, face: 22,
  crown: [crownAt(17, 1)],
  leaves: makeLeaves(), roots: makeRoots({ by: 54 }), arms: armPair('idle'),
  eye: EYE, mouth: MOUTH,
};

const idle = [
  IDLE,
  { ...IDLE, top: 14, hw: 21.6, face: 23, crown: [crownAt(17, 2)], leaves: makeLeaves(1), arms: armPair('idle', 1), roots: makeRoots({ by: 54, phase: 0.6 }) },
];

const cast: Pose = {
  top: 10, bottom: 55, hw: 20.5, face: 20,
  crown: [crownAt(17, 0)],
  leaves: makeLeaves(-1, 2), roots: makeRoots({ by: 53, spread: 1.04, lift: 2, amp: 2.5, phase: 1 }), arms: armPair('raised'),
  eye: EYE_BLAZE, mouth: MOUTH_ROAR, mouthDy: 9, beardDy: 17, tache: 'up',
};

const slam: Pose = {
  top: 21, bottom: 59, hw: 24, face: 30,
  crown: [{ rows: shearRows(CROWN, -0.08), x: 18, y: 1 }],
  leaves: makeLeaves(6, 2), roots: makeRoots({ by: 57, spread: 1.12, flat: 2, amp: 0.3 }), arms: armPair('slam'),
  eye: EYE_SQUINT, mouth: MOUTH_GRIT, mouthDy: 9, beardDy: 12,
};

const P2: Pose = {
  ...IDLE,
  crown: [{ rows: shearRows(CROWN, 0.22), x: 13, y: 0 }],
  eye: EYE_BLAZE, mouth: MOUTH_SNARL, crack: { level: 0, half: 4.6 },
  roots: makeRoots({ by: 54, amp: 3.5, phase: 0 }), arms: armPair('idle'),
};
const p2 = [
  P2,
  { ...P2, top: 14, hw: 21.6, face: 23, crown: [{ rows: shearRows(CROWN, 0.25), x: 13, y: 1 }], leaves: makeLeaves(1, 1), arms: armPair('idle', 1), roots: makeRoots({ by: 54, amp: 3.5, phase: 2.6 }) },
];

// Death: the wound gutters, the crown slides off and falls, the King sags,
// collapses and rots into a mulch heap with the crown on top.
const death0: Pose = {
  ...P2,
  crown: [{ rows: shearRows(CROWN, 0.45), x: 7, y: 4 }],
  eye: EYE_DIM, mouth: MOUTH_AGAPE, crack: { level: 1, half: 3.6 }, arms: armPair('limp'),
  roots: makeRoots({ by: 54, amp: 1 }), leaves: makeLeaves(1, 0, 3),
};
const death1: Pose = {
  top: 25, bottom: 59, hw: 23, face: 33,
  crown: [{ rows: rotate(CROWN, -50), x: 0, y: 14 }],
  leaves: makeLeaves(8, 1, 6), roots: makeRoots({ by: 57, spread: 1.05, flat: 1, amp: 0.4 }), arms: armPair('limp', 4),
  eye: EYE_DEAD, mouth: MOUTH_AGAPE, mouthDy: 9, beardDy: 12, crack: { level: 2, half: 3 }, wither: 1,
};
const death2: Pose = {
  top: 40, bottom: 62, hw: 24, face: 44,
  crown: [{ rows: rotate(CROWN, -16), x: 0, y: 48 }],
  leaves: makeLeaves(22, 3, 4), roots: makeRoots({ by: 61, spread: 1.1, flat: 1, amp: 0.2 }), arms: armPair('flop'),
  eye: EYE_DEAD, mouth: MOUTH_AGAPE, mouthDy: 8, beardDy: 10, crack: { level: 2, half: 2.4 }, wither: 2,
};

// The heap: a shaded mound of loam with distinct lumps of rot, leaf scraps
// and root ends, the crown perched on top and one stubborn sprout.
function mulch(): Grid {
  const g = grid(W, H);
  const MOUND: Ramp = ['d', 'b', 'b', 'l', 'u'];
  bulb(g, { cx: CX, top: 44, bottom: 88, hw: 29, belly: 0.5, round: 2, skin: () => MOUND });
  const rnd = rng(11);
  const lumps: [Ramp, number][] = [[['m', 'p', 'q', 'u'], 6], [['T', 'K', 'K', 'x'], 5], [['y', 'd', 'b', 'l'], 5], [['s', 'y', 'd', 'b'], 3]];
  let i = 0;
  for (const [ramp, n] of lumps)
    for (let k = 0; k < n; k++, i++) {
      const x = CX - 22 + ((i * 37) % 44) + rnd() * 3;
      const y = 51 + ((i * 7) % 12) + rnd() * 2;
      const half = bulbHalfWidth({ cx: CX, top: 44, bottom: 88, hw: 29, belly: 0.5, round: 2, skin: () => MOUND }, Math.floor(y));
      if (Math.abs(x - CX) > half - 3) continue;
      blob(g, x, y, 1.6 + rnd() * 1.4, 1.2 + rnd() * 0.8, ramp);
    }
  stroke(g, [[12, 60], [6, 61], [1, 64]], { width: taper(3, 1), ramp: ROOT, tip: 'q' });
  stroke(g, [[50, 60], [56, 61], [61, 64]], { width: taper(3, 1), ramp: ROOT, tip: 'q' });
  stroke(g, [[19, 52], [13, 47], [7, 48]], { width: leafW(4.5), ramp: ['T', 'K', 'K', 'x'], vein: 'P' });
  stroke(g, [[44, 53], [50, 48], [56, 50]], { width: leafW(4.5), ramp: ['T', 'K', 'K', 'x'], vein: 'P' });
  // The last of the glow, and one stubborn little sprout.
  stamp(g, ['.p.', 'pMp', '.p.'], CX + 7, 58);
  stamp(g, ['S..', 'fS.', '.Ff', '.F.'], CX + 11, 42);
  stamp(g, rotate(CROWN, 8), CX - 15, 32);
  return g;
}

const bossIdle = sprite('boss_marrow_idle', KING, idle.map((p) => toRows(paint(p))), { outline: true, origin: [0.5, 1], fps: 2 });
const bossCast = sprite('boss_marrow_cast', KING, [toRows(paint(cast))], { outline: true, origin: [0.5, 1] });
const bossSlam = sprite('boss_marrow_slam', KING, [toRows(paint(slam))], { outline: true, origin: [0.5, 1] });
const bossP2 = sprite('boss_marrow_p2_idle', KING, p2.map((p) => toRows(paint(p))), { outline: true, origin: [0.5, 1], fps: 3 });
const bossDeath = sprite('boss_marrow_death', KING, [
  toRows(paint(death0)), toRows(paint(death1)), toRows(paint(death2)), toRows(mulch()),
], { outline: true, origin: [0.5, 1], fps: 4 });

// ---------------------------------------------------------------------------
// Boss attacks.

// Thrown crown: a small copy of the royal crown. Two frames swap which studs
// and gems catch the light, so it glints as the engine spins it. 12x10 drawn.
const crownSmall = [
  [
    '.....zg.....',
    '.zg..aO..zg.',
    '.aO..yd..aO.',
    '.yd.yddb.yd.',
    'yyyyyyyddddb',
    'ydgadgadgadb',
    'ydaOdaOdaOdb',
    'ydddudddddbb',
    'lbbbbbbbbbbl',
  ],
  [
    '.....ga.....',
    '.ga..Oz..ga.',
    '.Oa..yd..Oa.',
    '.yd.yddb.yd.',
    'yyyyddddyddb',
    'yddgadgaddbb',
    'ydgaOdaOdddb',
    'yddaOddudddb',
    'lbbbbbbbbbbl',
  ],
];
const bossCrown = sprite('boss_crown', KING, crownSmall.map((r) => [...r, '............']), { outline: true, fps: 12 });

// Royal seed pod with a leafy crownlet and a glowing seam, pulsing. 7x7.
const bossSeed = sprite('boss_seed', KING, [
  ['.z.g.a.', '.gaaaO.', '.pmBmp.', 'pmoBopq', 'pmMBMpq', '.ppMpq.', '..qqq..'],
  ['.z.z.g.', '.gzgaO.', '.mmWmp.', 'mmBWBpq', 'pmoWopq', '.poBpq.', '..pqq..'],
], { outline: true, fps: 6 });

// Thorn column erupting from the ground: low, mid, full. 10x26 drawn.
function rootColumn(rise: number): string[] {
  const h = 26;
  const g = grid(10, h);
  const col = grid(10, h + 20);
  const dark: Ramp = ['d', 'b', 'l', 'u'];
  stroke(col, [[5, 25], [4.5, 16], [6, 8], [5, 0.5]], { width: taper(8, 1, 0.9), ramp: dark, crack: 'q', crackEvery: 5 });
  // Bone-pale thorns hooking upward.
  const thorns: [number, number, number][] = [[3, 21, -1], [7, 18, 1], [3, 14, -1], [7, 11, 1], [4, 6, -1], [6, 3, 1]];
  for (const [x, y, side] of thorns) stroke(col, [[x, y], [x + side * 2, y - 0.6], [x + side * 3.4, y - 2.4]], { width: taper(1.6, 0.4), ramp: ['c', 'e', 'e', 's'] });
  stamp(col, ['.M.', 'MoM'], 3, 18);
  const off = 26 - rise;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < 10; x++) {
      const sy = y - off;
      if (sy < 0 || sy >= col.length || y > 22) continue;
      if (col[sy][x] !== '.') g[y][x] = col[sy][x];
    }
  // Burst of soil at the base, bigger while it is still breaking through.
  const clods: Ramp = ['d', 'b', 'l', 'u'];
  blob(g, 2.2, 23.6, 2.4, 1.8, clods);
  blob(g, 7.6, 23.8, 2.4, 1.7, clods);
  blob(g, 5, 24.6, 3.4, 1.6, ['b', 'l', 'l', 'u']);
  if (rise < 20) {
    blob(g, 1, 19 + rise / 4, 1, 1, clods);
    blob(g, 8.6, 18 + rise / 5, 1, 1, clods);
  }
  return toRows(g);
}
const bossRootColumn = sprite('boss_root_column', KING, [rootColumn(8), rootColumn(16), rootColumn(26)], { outline: true, origin: [0.5, 1], fps: 12 });

// Writhing root segment that tiles horizontally (period 16). No automatic
// outline, since that would draw seams at the tile edges; the ink is drawn
// above and below the root only.
function tendril(phase: number): string[] {
  const g = grid(16, 9);
  const ramp = ['y', 'd', 'b', 'l'];
  const cy = (x: number) => 4.5 + 1.6 * Math.sin(((x + 0.5) / 16) * Math.PI * 2 + phase);
  for (let x = 0; x < 16; x++) {
    const c = cy(x);
    const top = Math.round(c - 1.6);
    const bot = Math.round(c + 1.6);
    for (let y = top; y <= bot; y++) {
      const k = y === top ? 0 : y === bot ? 3 : y === top + 1 ? 1 : 2;
      put(g, x, y, ramp[k]);
    }
    // Plum rot rings every half period.
    if (x % 8 === 3) for (let y = top + 1; y < bot; y++) put(g, x, y, 'q');
  }
  // Thorns: one up, one down per tile.
  const tx = Math.round(((((-phase / (Math.PI * 2)) * 16 + 4) % 16) + 16) % 16);
  const ux = (tx + 8) % 16;
  for (const [x, dir] of [[tx, -1], [ux, 1]] as [number, number][]) {
    const c = cy(x);
    const y = dir < 0 ? Math.round(c - 1.6) - 1 : Math.round(c + 1.6) + 1;
    put(g, x, y, 'c');
  }
  // Ink outline above and below (never at the tile edges).
  const out = toRows(g).map((r) => [...r]);
  for (let x = 0; x < 16; x++)
    for (let y = 0; y < 9; y++) {
      if (out[y][x] !== '.') continue;
      const up = y > 0 && g[y - 1][x] !== '.';
      const dn = y < 8 && g[y + 1][x] !== '.';
      const lf = g[y][(x + 15) % 16] !== '.';
      const rt = g[y][(x + 1) % 16] !== '.';
      if (up || dn || lf || rt) out[y][x] = 'k';
    }
  return out.map((r) => r.join(''));
}
const bossTendril = sprite('boss_root_tendril', { ...KING, k: 'ink' }, [tendril(0), tendril(Math.PI)], { fps: 6 });

export const BOSS: SpriteDef[] = [bossIdle, bossCast, bossSlam, bossP2, bossDeath, bossCrown, bossRootColumn, bossSeed, bossTendril];
