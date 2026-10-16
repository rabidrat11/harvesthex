// The HARVESTHEX logo. Chunky capitals built from polygons, each with its own
// lean, baseline, hand-cut nicks and chisel gouges so the word looks carved by
// hand rather than typeset. Faces are gilded gold-to-rust with a highlight edge
// and sit on a carved wooden depth face. A vine grows from a turnip at the left,
// garlands HARVES, coils down the T and, once the Root has got into it, runs
// plum and thorned under HEX before curling shut around a hot-pink bud.
import { type Colour, type SpriteDef } from '../sprite';
import { Board, outlineRows } from './ui-kit';

type Pt = [number, number];
interface Glyph {
  w: number;
  fill: Pt[][];
  cut?: Pt[][];
}

const CAP = 30;

const GLYPHS: Record<string, Glyph> = {
  H: {
    w: 19,
    fill: [
      [[1, 0], [7, 0], [7, 30], [0, 30]],
      [[12, 0], [18, 0], [19, 30], [12, 30]],
      [[6, 12.5], [13, 11.5], [13, 17.5], [6, 18.5]],
    ],
  },
  A: {
    w: 21,
    fill: [[[7.5, 0], [13.5, 0], [21, 30], [14.6, 30], [13.4, 24.5], [7.6, 24.5], [6.4, 30], [0, 30]]],
    cut: [[[10.5, 12.5], [12.4, 19], [8.6, 19]]],
  },
  R: {
    w: 19,
    fill: [
      [[1, 0], [7, 0], [7, 30], [0, 30]],
      [[1, 0], [14, 0], [19, 4.5], [19, 12], [15, 17], [7, 17], [7, 0]],
      [[8.5, 15], [15, 15], [19.5, 30], [12.8, 30]],
    ],
    cut: [[[7, 6.5], [11.5, 6.5], [12.5, 7.5], [12.5, 10.5], [11.5, 11.5], [7, 11.5]]],
  },
  V: {
    w: 21,
    fill: [[[0, 0], [6.8, 0], [10.5, 16.5], [14.2, 0], [21, 0], [13.6, 30], [7.4, 30]]],
  },
  E: {
    w: 16,
    fill: [
      [[1, 0], [7, 0], [7, 30], [0, 30]],
      [[1, 0], [16, 0], [16, 8], [13.5, 6.5], [7, 6.5], [7, 0]],
      [[6, 12], [13, 11.5], [13.5, 17.5], [6, 18]],
      [[0, 23.5], [13, 23.5], [16.5, 21.5], [16.5, 30], [0, 30]],
    ],
  },
  S: {
    w: 18,
    fill: [
      [
        [3, 0], [15, 0], [18, 3], [18, 9.5], [12, 9.5], [12, 7], [7.5, 7], [7.5, 9.5],
        [18, 15.5], [18, 27], [15, 30], [3, 30], [0, 27], [0, 20.5], [6, 20.5], [6, 23],
        [10.5, 23], [10.5, 20.5], [0, 14], [0, 3],
      ],
    ],
  },
  T: {
    w: 19,
    fill: [
      [[0, 0], [19, 0], [19, 8.5], [16, 7], [3, 7], [0, 8.5]],
      [[6, 0], [13, 0], [13.5, 30], [5.5, 30]],
    ],
  },
  X: {
    w: 21,
    fill: [
      [[0, 0], [7, 0], [21, 30], [14, 30]],
      [[14, 0], [21, 0], [7, 30], [0, 30]],
    ],
  },
};

function inside(poly: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

type Mask = boolean[][];
const newMask = (w: number, h: number): Mask => Array.from({ length: h }, () => Array(w).fill(false));

// Letter layout: x advance, baseline bounce and lean (px of top shift).
const WORD = 'HARVESTHEX';
const LAYOUT: { dy: number; lean: number; gap: number }[] = [
  { dy: 0, lean: 0, gap: 0 },
  { dy: -1, lean: -1.5, gap: 1 },
  { dy: 1, lean: 0.5, gap: 0 },
  { dy: 0, lean: 1.5, gap: -1 },
  { dy: -1, lean: 0, gap: 1 },
  { dy: 1, lean: -1, gap: 1 },
  { dy: -1, lean: 0.5, gap: 1 },
  { dy: 0, lean: 1, gap: 1 },
  { dy: 1, lean: -0.5, gap: 0 },
  { dy: -1, lean: -1.5, gap: 1 },
];

// Hand-cut nicks per letter (glyph coords), so no two letters are identical.
const NICKS: Pt[][][] = [
  [[[-1, 18], [1.6, 20], [-1, 22]], [[19, 3], [17.4, 5], [19, 7]]],
  [[[12, -1], [13.8, -1], [14, 1.6]]],
  [[[-1, 25], [1.5, 27], [-1, 29]]],
  [[[21.5, -1], [19, -1], [21.5, 2.5]]],
  [[[17, 22], [15, 22.5], [17, 25]]],
  [[[19, 18], [16.8, 20], [19, 22]]],
  [[[-1, -1], [2.2, -1], [-1, 2.2]]],
  [[[11, 30.5], [13, 28.6], [13, 30.5]], [[-1, 6], [1.4, 8], [-1, 10]]],
  [[[17, -1], [17, 3], [14.5, -1]]],
  [[[-1, -1], [2.6, -1], [-1, 1.6]]],
];

// Chisel gouges: short strokes in the next-darker gilding tone (glyph coords).
const GOUGES: Pt[][] = [
  [[3, 5], [15, 22]],
  [[11, 4], [4, 25]],
  [[3, 21], [15, 5]],
  [[5, 4], [12, 22]],
  [[3, 14]],
  [[10, 3], [12, 24]],
  [[9, 18]],
  [[3, 6], [15, 23]],
  [[3, 22]],
  [[4, 3], [16, 24]],
];

const LOGO_W = 224;
const LOGO_H = 52;
const TOP = 11; // cap top

function buildLetters() {
  const letters: { mask: Mask; x0: number; y0: number; gouges: Pt[] }[] = [];
  let x = 10;
  for (let i = 0; i < WORD.length; i++) {
    const g = GLYPHS[WORD[i]];
    const L = LAYOUT[i];
    x += L.gap;
    const mask = newMask(LOGO_W, LOGO_H);
    const tx = (p: Pt): Pt => [p[0] + x + (L.lean * (CAP - p[1])) / CAP, p[1] + TOP + L.dy];
    const fills = g.fill.map((p) => p.map(tx));
    const cuts = [...(g.cut ?? []), ...NICKS[i]].map((p) => p.map(tx));
    for (let yy = 0; yy < LOGO_H; yy++)
      for (let xx = 0; xx < LOGO_W; xx++) {
        const px = xx + 0.5;
        const py = yy + 0.5;
        if (fills.some((p) => inside(p, px, py)) && !cuts.some((p) => inside(p, px, py))) mask[yy][xx] = true;
      }
    const gouges = GOUGES[i].map(tx).map(([gx, gy]) => [Math.round(gx), Math.round(gy)] as Pt);
    letters.push({ mask, x0: x, y0: TOP + L.dy, gouges });
    x += g.w + 1;
  }
  return letters;
}

// ---------------------------------------------------------------------------
// The vine: a Catmull-Rom path through hand-placed points [x, y, inFront]. A
// segment takes the flag of its first point: true passes in front of the
// letters, false goes behind them.
type VPt = [number, number, boolean];
/** Past this column the vine has been touched by the Root: plum, thorned. */
const ROT_X = 158;
const THORN_XS = [170, 193];
const VINE: VPt[] = [
  // from the turnip, up the left of the H and over its shoulder
  [8, 36, true],
  [4, 29, true],
  [6, 19, true],
  [12, 10, true],
  [20, 6, true],
  // a garland over HARVES, dipping in front of the A, behind the V, in front of the E
  [30, 5, true],
  [37, 9, true],
  [43, 12, true],
  [50, 7, true],
  [60, 3, true],
  [70, 5, false],
  [78, 13, false],
  [85, 16, false],
  [92, 8, true],
  [99, 9, true],
  [106, 13, true],
  [113, 7, true],
  [123, 3, true],
  [133, 5, true],
  [141, 4, true],
  // behind the T's bar, then coiled down its stem
  [150, 9, false],
  [150, 20, true],
  [136, 26, false],
  [150, 31, true],
  [136, 37, true],
  [143, 46, true],
  // under HEX, where the Root has got into it
  [153, 47, true],
  [164, 46, true],
  [176, 47, true],
  [187, 46, true],
  [198, 47, true],
  [209, 46, true],
  // up the X and curled shut around a bud
  [217, 41, true],
  [220, 30, true],
  [219, 19, true],
  [215, 12, true],
  [210, 14, true],
  [212, 18, true],
  [215, 16, true],
];

function vineSamples(): { x: number; y: number; tx: number; ty: number; front: boolean }[] {
  const out: { x: number; y: number; tx: number; ty: number; front: boolean }[] = [];
  const P = VINE;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.02) {
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const g = (a: number, b: number, c: number, d: number) =>
        0.5 * (-a + c + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t2);
      const x = f(p0[0], p1[0], p2[0], p3[0]);
      const y = f(p0[1], p1[1], p2[1], p3[1]);
      const tx = g(p0[0], p1[0], p2[0], p3[0]);
      const ty = g(p0[1], p1[1], p2[1], p3[1]);
      out.push({ x, y, tx, ty, front: p1[2] });
    }
  }
  return out;
}

/** Rasterise the vine into front and back colour layers (null = empty). */
function vineLayers(W: number, H: number) {
  const samples = vineSamples();
  const layer = (front: boolean) => {
    const px: (Colour | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let best = Infinity;
        let bs = samples[0];
        for (const s of samples) {
          const d = (x + 0.5 - s.x) ** 2 + (y + 0.5 - s.y) ** 2;
          if (d < best) {
            best = d;
            bs = s;
          }
        }
        if (best > 1.45 || bs.front !== front) continue;
        // Which side of the stem is this pixel on? Upper side is lit.
        const len = Math.hypot(bs.tx, bs.ty) || 1;
        let nx = -bs.ty / len;
        let ny = bs.tx / len;
        if (ny > 0 || (ny === 0 && nx > 0)) {
          nx = -nx;
          ny = -ny;
        }
        const side = (x + 0.5 - bs.x) * nx + (y + 0.5 - bs.y) * ny;
        const rot = x > ROT_X ? 2 : x > ROT_X - 8 ? 1 : 0;
        const ramp: [Colour, Colour, Colour][] = [['sprout', 'leaf', 'moss'], ['leaf', 'moss', 'pine'], ['magenta', 'mauve', 'plum']];
        const [hi, mid, lo] = ramp[rot];
        px[y][x] = side > 0.55 ? hi : side > -0.45 ? mid : lo;
      }
    if (front) {
      // Hooked thorns on the corrupted stretch, pointing away from the letters.
      for (const tx0 of THORN_XS) {
        const sIdx = samples.findIndex((q) => q.x >= tx0 && q.y > 40);
        if (sIdx < 0) continue;
        const q = samples[sIdx];
        const bx = Math.round(q.x);
        const by = Math.round(q.y) + 1;
        const pts: [number, number, Colour][] = [
          [bx - 1, by, 'plum'], [bx, by, 'plum'], [bx + 1, by, 'plumdark'],
          [bx, by + 1, 'plum'], [bx + 1, by + 1, 'plumdark'], [bx + 1, by + 2, 'crimson'],
        ];
        for (const [x, y, c] of pts) if (y >= 0 && x < W) px[y][x] = c;
      }
    }
    return px;
  };
  return { front: layer(true), back: layer(false) };
}

function stampOutlined(board: Board, rows: string[], legend: Record<string, Colour>, dx: number, dy: number) {
  board.rows(outlineRows(rows, '#'), { ...legend, '#': 'ink' }, dx - 1, dy - 1);
}

function stampLayer(board: Board, px: (Colour | null)[][]) {
  const H = px.length;
  const W = px[0].length;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (px[y][x]) continue;
      const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < W && yy < H && px[yy][xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) board.px[y][x] = 'ink';
    }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[y][x]) board.px[y][x] = px[y][x];
}

const LEAF_LEGEND: Record<string, Colour> = { s: 'sprout', g: 'leaf', m: 'moss', p: 'pine', l: 'lime' };
// Leaves, pointing up-right / down-right; mirrored for the other side.
const LEAF_UR = [
  '....sg',
  '..sslg',
  '.slgmg',
  '.sgmg.',
  '.gmm..',
  'm.....',
];
const LEAF_DR = [
  'm.....',
  '.slgg.',
  '.slmgg',
  '..sgmg',
  '...ggm',
  '.....m',
];
const flip = (r: string[]) => r.map((x) => [...x].reverse().join(''));
const LEAF_S = ['..sg', '.slg', 'sgm.', 'm...'];
const LEAVES: { rows: string[]; x: number; y: number }[] = [
  { rows: flip(LEAF_DR), x: 0, y: 19 },
  { rows: flip(LEAF_UR), x: 22, y: 0 },
  { rows: LEAF_S, x: 31, y: 1 },
  { rows: flip(LEAF_UR), x: 55, y: 0 },
  { rows: LEAF_UR, x: 63, y: 0 },
  { rows: flip(LEAF_S), x: 89, y: 3 },
  { rows: LEAF_UR, x: 115, y: 0 },
  { rows: flip(LEAF_S), x: 123, y: 0 },
  { rows: LEAF_S, x: 134, y: 0 },
];
const ROT_LEGEND: Record<string, Colour> = { s: 'magenta', l: 'orchid', g: 'mauve', m: 'plum', p: 'plumdark' };
const ROT_LEAVES: { rows: string[]; x: number; y: number }[] = [
  { rows: LEAF_DR, x: 177, y: 46 },
  { rows: flip(LEAF_DR), x: 200, y: 46 },
];
// A hot-pink Root bud where the vine curls shut.
const BUD_LEGEND: Record<string, Colour> = { h: 'hot', b: 'blush', w: 'wine', c: 'crimson' };
const BUD = ['.hh.', 'hbhc', 'hhcw', '.ww.'];

const TURNIP_LEGEND: Record<string, Colour> = {
  s: 'sprout', g: 'leaf', m: 'moss', n: 'pine', p: 'plum', P: 'mauve', M: 'magenta', o: 'orchid',
  b: 'blush', e: 'cream', h: 'white', c: 'peach', k: 'skin', d: 'plumdark',
};
const TURNIP = [
  '...sg..s..gs.',
  '..sgm.sgm.gm.',
  '..sggmsgmgmn.',
  '...gmmgmmmn..',
  '.....mmmn....',
  '...pPPPPPp...',
  '..PoMPPPPPpp.',
  '.PoMPPPPPPppd',
  '.PMPPPPPPpppd',
  '.bbPPPPPpppd.',
  '.heebbbbbcck.',
  '.heeeeeeeeck.',
  '..heeeeeeck..',
  '...eeeeeeck..',
  '....eeeeck...',
  '.....eeck....',
  '......kc.....',
  '.......k.....',
];

function buildLogo(): SpriteDef {
  const W = LOGO_W;
  const H = LOGO_H;
  const letters = buildLetters();
  const face = newMask(W, H);
  letters.forEach((l) => l.mask.forEach((r, y) => r.forEach((v, x) => v && (face[y][x] = true))));

  // Depth face: the carved side, down and slightly right.
  const depth = newMask(W, H);
  const offs: Pt[] = [[0, 1], [1, 2], [1, 3]];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (face[y][x]) for (const [dx, dy] of offs) if (y + dy < H && x + dx < W) depth[y + dy][x + dx] = true;

  const board = new Board(W, H);
  const vine = vineLayers(W, H);
  stampLayer(board, vine.back);
  const solid = (m: Mask, x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && m[y][x];

  // Outline ring around face + depth.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const any = (xx: number, yy: number) => solid(face, xx, yy) || solid(depth, xx, yy);
      if (any(x, y)) continue;
      if (any(x - 1, y) || any(x + 1, y) || any(x, y - 1) || any(x, y + 1)) board.px[y][x] = 'ink';
    }
  // Depth colours by distance below the face.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!depth[y][x] || face[y][x]) continue;
      const d = solid(face, x, y - 1) ? 1 : solid(face, x - 1, y - 2) || solid(face, x, y - 2) ? 2 : 3;
      board.px[y][x] = d === 1 ? 'wood' : d === 2 ? 'bark' : 'loam';
    }
  // Faces: gilded in clean bands from gold at the crown to rust at the foot,
  // a highlight edge that fades down the left side, a shade edge bottom/right.
  letters.forEach((l) => {
    const m = l.mask;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!m[y][x]) continue;
        const yRel = y - l.y0;
        const up = !solid(m, x, y - 1);
        const left = !solid(m, x - 1, y);
        const down = !solid(m, x, y + 1);
        const right = !solid(m, x + 1, y);
        let c: Colour = yRel < 11 ? 'gold' : yRel < 20 ? 'amber' : yRel < 27 ? 'orange' : 'rust';
        if (right && !up) c = yRel < 11 ? 'amber' : yRel < 20 ? 'orange' : 'rust';
        if (down) c = 'brick';
        if (up && left && yRel < 4) c = 'white';
        else if (up) c = yRel < 16 ? 'butter' : 'gold';
        else if (left && !down) c = yRel < 12 ? 'butter' : yRel < 22 ? 'gold' : 'amber';
        board.px[y][x] = c;
      }
    const darker: Partial<Record<string, Colour>> = { gold: 'amber', amber: 'orange', orange: 'rust', rust: 'brick' };
    for (const [gx, gy] of l.gouges)
      for (const [x, y] of [[gx, gy], [gx + 1, gy + 1]] as Pt[]) {
        const c = board.px[y]?.[x];
        if (m[y]?.[x] && c && darker[c]) board.px[y][x] = darker[c]!;
      }
  });
  stampLayer(board, vine.front);
  for (const l of LEAVES) stampOutlined(board, l.rows, LEAF_LEGEND, l.x, l.y);
  for (const l of ROT_LEAVES) stampOutlined(board, l.rows, ROT_LEGEND, l.x, l.y);
  stampOutlined(board, BUD, BUD_LEGEND, 212, 14);
  stampOutlined(board, TURNIP, TURNIP_LEGEND, 1, 32);
  return board.toSprite('logo');
}

export const LOGO: SpriteDef = buildLogo();
