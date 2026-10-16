// The Thousand-Eyed Scarecrow: optional second boss. A gaunt field scarecrow
// on a cross-pole, burlap stitched from old grain sacks, a ragged black coat,
// straw bursting from every seam, and eyes sewn all over it. Most sleep under
// stitched lids; when it attacks they open and glow hot pink.
//
// Built like the Marrow King: coat, sleeves, straw and pole are painted with
// the raster toolkit, head, hat, crow and eyes are hand-drawn stamps, and each
// pose only says which eyes are open.
import { sprite, type SpriteDef } from '../sprite';
import { bez, grid, put, rotate, stamp, stroke, taper, toRows, type Grid, type Pt, type Ramp } from './creatures-raster';

const SC = {
  k: 'ink', x: 'deep', Q: 'abyss', L: 'night', K: 'storm', J: 'dusk',
  V: 'soot', A: 'ash', S: 'slate',
  u: 'umber', l: 'loam', b: 'bark', d: 'wood', y: 'clay', s: 'skin', e: 'peach', c: 'cream', W: 'white',
  t: 'wheat', g: 'gold', z: 'butter', a: 'amber', R: 'rust',
  q: 'plumdark', p: 'plum', m: 'mauve', M: 'magenta', o: 'orchid', B: 'blush', h: 'hot', N: 'wine', C: 'crimson',
} as const;

const W = 42;
const H = 58;
const CX = 21;

const COAT: Ramp = ['K', 'L', 'Q', 'x'];
const STRAW: Ramp = ['g', 't', 'a', 'R'];
const WOOD: Ramp = ['y', 'd', 'b', 'l'];

// ---------------------------------------------------------------------------
// Eyes. Every eye has a closed (stitched lid), half (drowsy) and open (glowing)
// look, drawn for the surface it is sewn into.

type EyeState = 'closed' | 'half' | 'open';
type EyeSize = 'tiny' | 'small' | 'large';
type Surface = 'coat' | 'burlap';

const EYES: Record<EyeSize, Record<EyeState | 'closedB', string[][]>> = {
  tiny: {
    open: [['BhB', 'qMq'], ['hBB', 'qMq'], ['BBh', 'qMq']],
    half: [['qqq', 'MhM']],
    closed: [['J.J', '.K.']],
    closedB: [['l.l', '.l.']],
  },
  small: {
    open: [['.MMM.', 'MWhxM', '.MMM.'], ['.MMM.', 'MxhWM', '.MMM.'], ['.MMM.', 'MhxhM', '.MMM.']],
    half: [['.qqq.', 'qMhMq', '.qqq.']],
    closed: [['.....', 'JJJJJ', '.K.K.']],
    closedB: [['.....', 'lllll', '.l.l.']],
  },
  large: {
    open: [
      ['.MMMMM.', 'MBWhhBM', 'MBhxxhM', 'MBBhhBM', '.MMMMM.'],
      ['.MMMMM.', 'MWhhBBM', 'MhxxhBM', 'MBhhBBM', '.MMMMM.'],
      ['.MMMMM.', 'MBBWhhM', 'MBBhxxM', 'MBBBhhM', '.MMMMM.'],
    ],
    half: [
      ['.lllll.', 'lyyyyyl', 'lBhxxhl', 'lBBhhBl', '.lllll.'],
      ['.lllll.', 'lyyyyyl', 'lhxxhBl', 'lBhhBBl', '.lllll.'],
    ],
    closed: [['.......', '.yyyyy.', 'lllllll', '.l.l.l.', '.......']],
    closedB: [['.......', '.yyyyy.', 'lllllll', '.l.l.l.', '.......']],
  },
};

function eyeRows(size: EyeSize, on: Surface, state: EyeState, look = 0): string[] {
  const set = EYES[size];
  if (state === 'closed') return (on === 'burlap' ? set.closedB : set.closed)[0];
  const v = set[state];
  return v[look % v.length];
}

// An old black button sewn on with crimson thread, in place of one eye.
const BUTTON = ['.SAV.', 'SCACV', 'AVCVV', 'VCVCQ', '.VVQ.'];

interface Slot {
  size: EyeSize;
  on: Surface;
  x: number;
  y: number;
  /** Order eyes open in (gaze opens the low numbers) and close in (death). */
  order: number;
}

// ---------------------------------------------------------------------------
// Head: a lumpy grain sack, gathered at the neck, with a stitched side seam,
// a patch from another sack (stencil mark and all), a stitched grin, one
// button eye, one big real eye, a third eye on the brow and one on the cheek.

const HEAD_SLOTS: Slot[] = [
  { size: 'large', on: 'burlap', x: 8, y: 4, order: 0 },
  { size: 'small', on: 'burlap', x: 6, y: 0, order: 3 },
  { size: 'tiny', on: 'burlap', x: 13, y: 9, order: 9 },
];

const MOUTH = ['l.l.l.l..l', '.llllllll.', '..l.l.l...'];
const MOUTH_EYE = ['l.l.l.l..l', '.lMMMMMMl.', '.MBWhxhBM.', '..MMMMMM..'];

function makeHead(eye: (s: Slot) => [EyeState, number], mouthEye = false): string[] {
  const hw = [4.2, 5.6, 6.6, 7, 7.3, 7.3, 7.3, 7.2, 7, 6.5, 5.6, 4.3, 3];
  const g = grid(16, 13);
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8;
      const half = hw[y];
      if (Math.abs(dx) > half) continue;
      const rel = dx / half;
      let c = rel < -0.55 ? 'e' : rel < 0.35 ? 's' : rel < 0.8 ? 'y' : 'd';
      if (y <= 1) c = rel < 0.3 ? 'y' : 'd';
      if (y === 12) c = rel < 0 ? 'y' : 'd';
      g[y][x] = c;
    }
  // Side seam with cross stitches.
  for (let y = 2; y <= 10; y++) {
    g[y][12] = 'l';
    if (y % 2) g[y][13] = 'l';
  }
  // Patch cut from another sack, stencil mark half worn off.
  stamp(g, ['ltttl', 'tttta', 'tRtRa', 'laaal'], 1, 0);
  // Rope tie at the neck.
  stamp(g, ['bdbdb'], 5, 12);
  stamp(g, mouthEye ? MOUTH_EYE : MOUTH, 3, 9);
  stamp(g, BUTTON, 1, 4);
  for (const s of HEAD_SLOTS) {
    const [st, look] = eye(s);
    stamp(g, eyeRows(s.size, s.on, st, look), s.x, s.y);
  }
  return toRows(g);
}

// Tall battered stovepipe hat, dented, a hole with straw poking out, a plum
// band with one more eye sewn into it.
const HAT = [
  '...KLLLLLQ....',
  '...KLLLLLQ....',
  '..KLLLtgLQQ...',
  '..KLLLLLLLQ...',
  '..pmppppppq...',
  '..KLLLLLLLQ...',
  'KKLLLLLLLLLQQx',
  '.QQ.......QQx.',
];
const HAT_SLOT: Slot = { size: 'tiny', on: 'coat', x: 6, y: 4, order: 12 };

function makeHat(eye: (s: Slot) => [EyeState, number]): string[] {
  const g = grid(14, 8);
  stamp(g, HAT, 0, 0);
  const [st, look] = eye(HAT_SLOT);
  const rows = st === 'closed' ? ['K.K', '.K.'] : eyeRows('tiny', 'coat', st, look);
  stamp(g, rows, HAT_SLOT.x, HAT_SLOT.y);
  return toRows(g);
}

// The crow: perched (wings folded) on the right arm, or taking off.
const CROW_PERCH = [
  '...LK..',
  '..LLhSS',
  '..LLL..',
  '.KLLLL.',
  'KLLLLQ.',
  'QLKLQ..',
  'Q..SS..',
];
const CROW_OFF = [
  'K.......K..',
  'KL.....KL..',
  '.LL...LL...',
  '..LLKLLhSS.',
  '...LLLL....',
  '..QLQ......',
];

// ---------------------------------------------------------------------------
// Body.

const COAT_SLOTS: Slot[] = [
  { size: 'small', on: 'burlap', x: 18, y: 21, order: 1 },
  { size: 'tiny', on: 'burlap', x: 20, y: 26, order: 6 },
  { size: 'small', on: 'coat', x: 14, y: 23, order: 2 },
  { size: 'tiny', on: 'coat', x: 16, y: 29, order: 10 },
  { size: 'small', on: 'coat', x: 14, y: 37, order: 5 },
  { size: 'tiny', on: 'coat', x: 16, y: 42, order: 14 },
  { size: 'small', on: 'coat', x: 24, y: 23, order: 4 },
  { size: 'tiny', on: 'coat', x: 25, y: 29, order: 8 },
  { size: 'small', on: 'coat', x: 24, y: 37, order: 7 },
  { size: 'tiny', on: 'coat', x: 25, y: 42, order: 13 },
  { size: 'small', on: 'coat', x: 19, y: 40, order: 11 },
];

// Eyes along the sleeves sit at fractions of the arm curve.
const ARM_SLOTS: { t: number; size: EyeSize; order: number; side: -1 | 1 }[] = [
  { t: 0.35, size: 'small', order: 15, side: -1 },
  { t: 0.7, size: 'tiny', order: 17, side: -1 },
  { t: 0.3, size: 'tiny', order: 16, side: 1 },
  { t: 0.62, size: 'small', order: 18, side: 1 },
];

type ArmKind = 'idle' | 'wide' | 'droop';

function armCurve(kind: ArmKind, side: -1 | 1, sway: number): Pt[] {
  const L: Record<ArmKind, Pt[]> = {
    idle: [[CX - 6, 20], [CX - 10, 19.5], [CX - 14, 20], [5, 21]],
    wide: [[CX - 6, 20], [CX - 11, 17], [CX - 14, 11], [5, 5]],
    droop: [[CX - 6, 21], [CX - 10, 23], [CX - 12, 29], [CX - 11, 35]],
  };
  return L[kind].map(([x, y]) => [side < 0 ? x + sway : 2 * CX - x + sway, y] as Pt);
}

function strawTuft(g: Grid, x: number, y: number, dirs: Pt[]) {
  dirs.forEach(([dx, dy], i) =>
    stroke(g, [[x, y], [x + dx * 0.5, y + dy * 0.5 + (i % 2 ? 0.6 : -0.6)], [x + dx, y + dy]], { width: taper(1.25, 0.6), ramp: i % 2 ? ['t', 't', 'a', 'a'] : ['g', 'g', 't', 't'] }),
  );
}

interface ScPose {
  sway: number;
  head: { dx: number; dy: number; rot: number };
  hat: { dx: number; dy: number; rot: number };
  arms: ArmKind;
  coatTop: number;
  hem: number;
  hemSway: number;
  poleTop: number;
  eye: (s: Slot) => [EyeState, number];
  mouthEye?: boolean;
  crow: 'perch' | 'off' | 'gone';
  crowDy?: number;
}

function paintCoat(g: Grid, p: ScPose) {
  const top = p.coatTop;
  const hem = p.hem;
  for (let y = top; y <= hem + 3; y++) {
    const t = Math.min(1, (y - top) / (hem - top));
    const half = 6.6 + 2.8 * t;
    const cx = CX + p.sway + p.hemSway * t;
    const open = y < top + 15 ? 4.2 * (1 - (y - top) / 15) : -1;
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx;
      if (Math.abs(dx) > half) continue;
      if (y > hem && ((x * 37 + 11) % 5) < y - hem) continue; // tattered hem strips
      const rel = dx / half;
      let c: string;
      if (Math.abs(dx) < open) {
        // Burlap chest showing through the open coat, with a stitched seam.
        c = dx < -1.5 ? 'e' : dx < 1.5 ? 's' : 'y';
        if (Math.abs(dx + 0.3) < 0.5 && y % 2 === 0) c = 'l';
      } else if (Math.abs(dx) < open + 1.2) c = dx < 0 ? 'J' : 'K'; // lapels
      else c = rel < -0.62 ? 'K' : rel < 0.3 ? 'L' : 'Q';
      // Fold creases.
      if (y > top + 6 && (Math.abs(dx + half * 0.42) < 0.5 || Math.abs(dx - half * 0.36) < 0.5)) c = 'Q';
      if (y === top && rel < -0.2) c = 'J';
      put(g, x, y, c);
    }
  }
  // Patches: plum cloth low on the left, a burlap square on the right.
  const sx = Math.round(p.sway + p.hemSway * 0.7);
  stamp(g, ['mpmp', 'pqpq', 'mpmq', 'pqqq'], 14 + sx, 32);
  stamp(g, ['lsyl', 'syyd', 'ldyl'], 24 + sx, 32);
  // A split seam with straw bursting out.
  stamp(g, ['tx', 'gt', 'ax'], 27 + sx, 38);
  strawTuft(g, 28 + sx, 39, [[3, 1], [2, 3]]);
}

function paint(p: ScPose): Grid {
  const g = grid(W, H);
  const sw = p.sway;
  // Pole and crossbar.
  for (let y = p.poleTop; y < H; y++) {
    put(g, 20, y, 'd');
    put(g, 21, y, 'b');
  }
  if (p.arms !== 'droop') for (let x = 3; x < W - 3; x++) {
    put(g, x, 20, 'd');
    put(g, x, 21, 'b');
  }
  // Straw legs dangling from under the coat.
  for (const [x, len] of [[17, 6], [19, 4], [23, 5], [25, 7]] as [number, number][])
    stroke(g, [[x + sw, p.hem], [x + sw + (x < CX ? -1 : 1), p.hem + len / 2], [x + sw, p.hem + len]], { width: taper(1.6, 0.8), ramp: STRAW });
  paintCoat(g, p);
  // Sleeves with tattered strips and straw hands.
  for (const side of [-1, 1] as const) {
    const arm = armCurve(p.arms, side, sw);
    for (const t of [0.3, 0.55, 0.8]) {
      const [x, y] = bez(arm, t);
      stroke(g, [[x, y + 2], [x - side * 0.6, y + 4], [x + side * 0.4, y + 5.5]], { width: taper(2.2, 1), ramp: ['L', 'Q', 'Q', 'x'] });
    }
    stroke(g, arm, { width: taper(6, 4.6), ramp: COAT });
    const [hx, hy] = arm[3];
    const fan: Pt[] = p.arms === 'wide'
      ? [[side * 3, -4], [side * 4, -1], [side * 1, -5], [side * 4, 2]]
      : p.arms === 'droop' ? [[-1, 4], [1, 5], [side * 2, 3]] : [[side * 4, -2], [side * 4.5, 1], [side * 3, 4], [side * 1, 5]];
    strawTuft(g, hx, hy, fan);
    for (const s of ARM_SLOTS.filter((a) => a.side === side)) {
      const [ex, ey] = bez(arm, s.t);
      const slot: Slot = { size: s.size, on: 'coat', x: 0, y: 0, order: s.order };
      const [st, look] = p.eye(slot);
      const rows = eyeRows(s.size, 'coat', st, look);
      stamp(g, rows, Math.round(ex - rows[0].length / 2), Math.round(ey - 1));
    }
  }
  // Straw collar bursting round the neck.
  strawTuft(g, CX + sw - 2, 19, [[-3, 1], [-2, -1]]);
  strawTuft(g, CX + sw + 2, 19, [[3, 1], [2, -1]]);
  // Coat eyes.
  for (const s of COAT_SLOTS) {
    const t = Math.max(0, Math.min(1, (s.y - p.coatTop) / (p.hem - p.coatTop)));
    const dx = Math.round(p.sway + p.hemSway * t);
    const [st, look] = p.eye(s);
    stamp(g, eyeRows(s.size, s.on, st, look), s.x + dx, s.y + (p.coatTop - 19));
  }
  // Head, straw hair under the brim, hat.
  let head = makeHead(p.eye, p.mouthEye);
  if (p.head.rot) head = rotate(head, p.head.rot);
  const hx = 13 + sw + p.head.dx - Math.floor((head[0].length - 16) / 2);
  const hy = 6 + p.head.dy - Math.floor((head.length - 13) / 2);
  strawTuft(g, hx + 2, hy + 2, [[-3, 1], [-2, 4]]);
  strawTuft(g, hx + head[0].length - 2, hy + 2, [[3, 1], [2, 4]]);
  stamp(g, head, hx, hy);
  let hat = makeHat(p.eye);
  if (p.hat.rot) hat = rotate(hat, p.hat.rot);
  stamp(g, hat, 14 + sw + p.hat.dx, p.hat.dy);
  // Crow.
  if (p.crow === 'perch') {
    const [cx, cy] = bez(armCurve(p.arms, 1, sw), 0.78);
    stamp(g, CROW_PERCH, Math.round(cx - 3), Math.round(cy - 9 + (p.crowDy ?? 0)));
  } else if (p.crow === 'off') stamp(g, CROW_OFF, 30, 1 + (p.crowDy ?? 0));
  return g;
}

// ---------------------------------------------------------------------------
// Poses.

const closedAll = (): [EyeState, number] => ['closed', 0];

const IDLE: ScPose = {
  sway: 0, head: { dx: 0, dy: 0, rot: 0 }, hat: { dx: 0, dy: 0, rot: 0 },
  arms: 'idle', coatTop: 19, hem: 46, hemSway: 0, poleTop: 14,
  eye: (s) => (s.order === 0 ? ['half', 0] : ['closed', 0]), crow: 'perch',
};

const idle = [
  IDLE,
  { ...IDLE, sway: 1, hemSway: -1, head: { dx: 0, dy: 1, rot: 0 }, hat: { dx: 0, dy: 1, rot: 0 }, crowDy: 1,
    eye: (s: Slot): [EyeState, number] => (s.order === 0 ? ['half', 1] : s.order === 8 ? ['half', 0] : ['closed', 0]) },
];

const gaze = [0, 1].map((f): ScPose => ({
  ...IDLE, sway: f ? -1 : 0, hemSway: f ? 1 : 0, head: { dx: 0, dy: 1, rot: 0 }, hat: { dx: 0, dy: 1, rot: 0 },
  eye: (s) => (s.order < 13 + f * 2 && s.order !== 9 + f ? ['open', (s.order + f) % 3] : ['half', 0]),
}));

const cast: ScPose = {
  ...IDLE, arms: 'wide', head: { dx: 0, dy: -1, rot: 0 }, hat: { dx: 0, dy: -1, rot: 0 },
  eye: (s) => ['open', s.order % 3], mouthEye: true, crow: 'gone',
};

const death: ScPose[] = [
  { ...IDLE, sway: 1, head: { dx: 1, dy: 1, rot: 8 }, hat: { dx: 2, dy: 0, rot: 10 },
    eye: (s) => (s.order % 2 ? ['closed', 0] : s.order < 8 ? ['half', 0] : ['closed', 0]) },
  { ...IDLE, sway: 2, arms: 'droop', hemSway: 1, head: { dx: 3, dy: 6, rot: 28 }, hat: { dx: 9, dy: 8, rot: 40 },
    eye: (s) => (s.order === 0 ? ['half', 0] : ['closed', 0]), crow: 'off', crowDy: 0 },
];

// Falling apart: head tumbles, coat sinks down the pole, straw everywhere.
function collapse(stage: 2 | 3): Grid {
  const g = grid(W, H);
  const poleTop = stage === 2 ? 26 : 44;
  for (let y = poleTop; y < H; y++) {
    put(g, 20, y, 'd');
    put(g, 21, y, 'b');
  }
  if (stage === 3) stamp(g, ['.b.', 'dbd'], 20, poleTop - 1);
  // Heap of spilled straw along the ground.
  const heapTop = stage === 2 ? 50 : 47;
  for (let i = 0; i < 18; i++) {
    const x0 = 3 + ((i * 23) % 36);
    const y0 = heapTop + ((i * 5) % 7);
    stroke(g, [[x0, y0], [x0 + 3 - (i % 3) * 3, y0 - 2 + (i % 2) * 3], [x0 + 6 - (i % 4) * 3, Math.min(57, y0 + 2)]], { width: taper(1.8, 0.8), ramp: STRAW });
  }
  // The empty coat, slumped.
  const coatTop = stage === 2 ? 32 : 44;
  const coatH = stage === 2 ? 18 : 10;
  for (let y = coatTop; y < coatTop + coatH; y++) {
    const t = (y - coatTop) / coatH;
    const half = (stage === 2 ? 7 : 9) + 6 * t;
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - (CX + 1);
      if (Math.abs(dx) > half) continue;
      if (y > coatTop + coatH - 3 && ((x * 37 + 11) % 5) < y - (coatTop + coatH - 3)) continue;
      const rel = dx / half;
      put(g, x, y, rel < -0.6 ? 'K' : rel < 0.3 ? 'L' : 'Q');
    }
  }
  // Sleeves lying limp.
  stroke(g, [[CX - 4, coatTop + 2], [CX - 10, coatTop + 5], [CX - 14, coatTop + coatH], [4, Math.min(56, coatTop + coatH + 2)]], { width: taper(5, 4), ramp: COAT });
  stroke(g, [[CX + 5, coatTop + 2], [CX + 11, coatTop + 4], [CX + 15, coatTop + coatH - 1], [38, Math.min(56, coatTop + coatH + 1)]], { width: taper(5, 4), ramp: COAT });
  strawTuft(g, 4, Math.min(56, coatTop + coatH + 2), [[-3, -1], [-2, 2]]);
  strawTuft(g, 38, Math.min(56, coatTop + coatH + 1), [[3, -1], [2, 2]]);
  stamp(g, ['mpmp', 'pqpq', 'mpmq'], 15, coatTop + 4);
  // Closed eyes left on the coat.
  stamp(g, eyeRows('small', 'coat', 'closed'), 24, coatTop + 3);
  stamp(g, eyeRows('tiny', 'coat', 'closed'), 13, coatTop + coatH - 4);
  // Head rolled onto the straw, hat beside it.
  const head = rotate(makeHead(closedAll), stage === 2 ? -62 : -84);
  const hat = rotate(makeHat(closedAll), stage === 2 ? 118 : 100);
  if (stage === 2) {
    stamp(g, hat, 27, 41);
    stamp(g, head, 0, 37);
  } else {
    stamp(g, hat, 29, 46);
    stamp(g, head, 1, 42);
  }
  return g;
}

const rowsOf = (p: ScPose) => toRows(paint(p));

const bossIdle = sprite('boss_eyes_idle', SC, idle.map(rowsOf), { outline: true, origin: [0.5, 1], fps: 2 });
const bossGaze = sprite('boss_eyes_gaze', SC, gaze.map(rowsOf), { outline: true, origin: [0.5, 1], fps: 4 });
const bossCast = sprite('boss_eyes_cast', SC, [rowsOf(cast)], { outline: true, origin: [0.5, 1] });
const bossDeath = sprite('boss_eyes_death', SC, [rowsOf(death[0]), rowsOf(death[1]), toRows(collapse(2)), toRows(collapse(3))], { outline: true, origin: [0.5, 1], fps: 4 });

// ---------------------------------------------------------------------------
// Minions and bullets.

// Crow: black with a storm-blue sheen, one glowing pink eye, ragged wings. 10x7.
const crowFly = sprite('en_crow_fly', SC, [
  [
    '...KK.....',
    '...KLL....',
    '....LLL...',
    'QQ.LLLLKhS',
    '.QLLLLLLLS',
    '..QQ......',
    '..........',
  ],
  [
    '..........',
    '..........',
    '.......KK.',
    'QQ.KLLLLhS',
    '.QLLLLLLLS',
    '...KLLQ...',
    '....LQ....',
  ],
], { outline: true, origin: [0.5, 1], fps: 8 });

// Hostile bullet: a staring eyeball. 6x6.
const ebEye = sprite('eb_eye', SC, [[
  '.BWWB.',
  'BWhhWB',
  'WhWxhB',
  'Whxxho',
  'BBhhBo',
  '.oBBo.',
]]);
ebEye.outline = true;

// Detached eye turret: an eyeball in stitched burlap lids with a dangling
// thread, pupil pulsing wide. 10x10.
const eyeOrb = sprite('boss_eye_orb', SC, [
  [
    '...llll...',
    '..lsssyl..',
    '.lsyyyydl.',
    'lMMMMMMMMl',
    'MBWhhhBBBM',
    'MBhhxhhBBM',
    'MBBhhhBBoM',
    'lMMMMMMMMl',
    '.ldyyyydl.',
    '...l.l.C..',
  ],
  [
    '...llll...',
    '..lsssyl..',
    'lMMMMMMMMl',
    'MBWhhhhBBM',
    'MBhxxxhBBM',
    'MBhxxxhBoM',
    'MBBhhhhBoM',
    'lMMMMMMMMl',
    '.ldyyyydl.',
    '...l.lC...',
  ],
], { outline: true, fps: 4 });

export const SCARECROW: SpriteDef[] = [bossIdle, bossGaze, bossCast, bossDeath, crowFly, ebEye, eyeOrb];
void WOOD;
