// Farm buildings: outlined, origin bottom-centre. Built on a grid in layers
// (masses first, then hand-typed detail stamps). Interaction points are noted
// beside each building in pixels from its bottom-centre origin.
import { sprite, type SpriteDef } from '../sprite';
import { Grid, WL, art, ink, stroke } from './world-kit';
import { WALL_INNER } from './world-landscape';

const P: Partial<SpriteDef> = { outline: true, origin: [0.5, 1] };

/** Cheap deterministic hash for scattering texture. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) % 1000;
};

// --- shared detail stamps ----------------------------------------------------

/** Warm lit window, 9x8 glass with a mullion, curtains and a sill plant. */
const GLASS = [
  'RjyywyyjR',
  'RyYYwYYyR',
  'ayYWwYYya',
  'ayYYwYYya',
  'wwwwwwwww',
  'ayyYwYyya',
  'aayywyyaa',
  'aGgawaaaa',
];

/** Painted shutter with a heart cut-out. */
const SHUTTER = [
  'pGGp',
  'pggp',
  'pLLp',
  'pgLp',
  'pGGp',
  'pggp',
  'pGGp',
  'pGGp',
  'pggp',
  'pppp',
];

function windowWithShutters(g: Grid, x: number, y: number, rightShutter: 'hung' | 'askew'): void {
  // frame
  g.rect(x + 4, y, 11, 10, 'C');
  g.vline(x + 14, y, 10, 'e').hline(x + 4, y + 9, 11, 'e');
  g.stamp(GLASS, x + 5, y + 1);
  g.stamp(SHUTTER, x, y);
  if (rightShutter === 'hung') g.stamp(SHUTTER, x + 15, y);
  else {
    // hanging from its top hinge, swung out and sagging
    SHUTTER.forEach((row, i) => g.stamp([row], x + 15 + Math.floor(i / 4), y + 2 + i));
    g.dots('S', x + 15, y + 1, x + 15, y + 8);
  }
}

// --- the farmhouse -------------------------------------------------------------
// Weathered plank house under a big patched thatch, stone chimney, an eyebrow
// dormer with a lamp lit, green shutters (one hanging off), a horseshoe over
// the door, and on the right a cellar bulkhead bound in strange old ironwork:
// root-like straps curling round a boss shaped like a closed eye, with a thread
// of violet light leaking through the seam. It is older than anything else in
// the village.
//
// Offsets below are from the bottom-centre origin of the baked 96x80 sprite.
// Door threshold (-2, -6); cellar hatch front edge (+32, -2), centre (+32, -8);
// window glows (-28, -21) and (+18, -21), dormer glow (0, -50).

const HOUSE_W = 94;
const HOUSE_H = 78;

/** Thatch ramp per roof face: [base, stroke, accent]. */
const FACE = {
  left: ['h', 'e', 'e'],
  front: ['h', 'c', 'e'],
  right: ['c', 'w', 'h'],
} as const;

/**
 * Hipped thatch: a front face flanked by a sunlit left hip and a shaded right
 * hip, straws stroked down the slope, bundle courses, a ridge roll and a thick
 * rounded eave. Returns the face lookup so dormers can be shaded to match.
 */
function thatchRoof(g: Grid, w: number, top: number, eave: number, ridgeInset: number, hipInset: number): void {
  const span = eave - top;
  // the sides bow outward like a soft, heavy thatch
  const outer = (y: number) => Math.round(ridgeInset - (ridgeInset - 1) * Math.pow((y - top) / span, 0.62));
  const hip = (y: number) => Math.round(ridgeInset - ((y - top) * (ridgeInset - hipInset)) / span);
  const face = (x: number, y: number) => (x < hip(y) ? FACE.left : x > w - 1 - hip(y) ? FACE.right : FACE.front);
  for (let y = top; y <= eave; y++)
    for (let x = outer(y); x <= w - 1 - outer(y); x++) g.set(x, y, face(x, y)[0]);
  // straws: short strokes running down the slope
  for (let y = top + 1; y < eave - 3; y++)
    for (let x = outer(y) + 1; x < w - 1 - outer(y); x++) {
      const h = hash(x, y);
      const f = face(x, y);
      if (h < 55) for (let k = 0; k < 3; k++) g.paintOn(f[0], x, y + k, f[1]);
      else if (h < 75) g.paintOn(f[0], x, y, f[2]);
    }
  // bundle courses: a bumpy shadow edge with bundle tips hanging below it
  for (let cy = top + 8; cy < eave - 4; cy += 8)
    for (let x = outer(cy); x <= w - 1 - outer(cy); x++) {
      const f = face(x, cy);
      const shadow = f === FACE.right ? 'w' : 'c';
      g.set(x, cy, shadow);
      if (x % 4 === 1) g.set(x, cy + 1, shadow);
      if (x % 4 === 3 && f !== FACE.right) g.set(x, cy - 1, 'e');
    }
  // hip ridges catch the light
  for (let y = top; y <= eave - 3; y++) {
    g.set(hip(y), y, 'e');
    g.set(w - 1 - hip(y), y, 'h');
  }
  // ridge roll with crossed spars
  const r0 = outer(top);
  const r1 = w - 1 - outer(top);
  g.hline(r0 + 2, top - 3, r1 - r0 - 3, 'h').hline(r0 + 1, top - 2, r1 - r0 - 1, 'h').hline(r0, top - 1, r1 - r0 + 1, 'h');
  g.hline(r0 + 3, top - 3, 12, 'e').hline(r0, top, r1 - r0 + 1, 'w');
  for (let x = r0 + 2; x < r1 - 2; x += 5) g.dots('w', x, top - 2, x + 1, top - 1, x + 2, top - 2);
  g.dots('c', r1, top - 1, r1 - 1, top - 2);
  // thick rounded eave
  g.hline(1, eave - 2, w - 2, 'h').hline(0, eave - 1, w, 'h').hline(0, eave, w, 'c').hline(1, eave + 1, w - 2, 'w');
  for (let x = 0; x < w; x++) {
    if (hash(x, 5) < 380) g.set(x, eave - 2, 'e');
    if (x > w - 14) g.paintOn('h', x, eave - 1, 'c');
    if ((x * 5) % 7 < 2 && x > 0 && x < w - 1) g.set(x, eave + 2, 'w');
  }
  g.dots('w', 0, eave, w - 1, eave);
  g.dots('.', 0, eave - 1, w - 1, eave - 1, 0, eave + 1, w - 1, eave + 1).dots('c', 1, eave + 1).dots('w', w - 2, eave + 1);
}

function farmhouse(): string[] {
  const g = new Grid(HOUSE_W, HOUSE_H);

  // walls: wide weathered boards between corner posts
  const wx0 = 5;
  const wx1 = 88;
  for (let y = 47; y <= 72; y++)
    for (let x = wx0; x <= wx1; x++) {
      const i = x - wx0;
      const board = Math.floor(i / 5);
      const worn = hash(board, 7) < 300;
      g.set(x, y, i % 5 === 4 ? (worn ? 'b' : 'w') : worn ? 'w' : 'c');
    }
  g.dots('b', 13, 62, 33, 55, 71, 66, 84, 68, 26, 70).dots('k', 11, 70, 52, 50, 66, 70);
  // deep shadow under the eave
  g.swap({ c: 'w', w: 'b', b: 'L' }, wx0, 47, wx1 - wx0 + 1, 3);
  g.swap({ c: 'w' }, wx0, 50, wx1 - wx0 + 1, 1);
  // corner posts and sole plate
  g.rect(wx0, 47, 3, 26, 'w').vline(wx0, 47, 26, 'c').vline(wx0 + 2, 47, 26, 'b');
  g.rect(wx1 - 2, 47, 3, 26, 'b').vline(wx1, 47, 26, 'L').vline(wx1 - 2, 47, 26, 'w');
  g.hline(wx0, 72, wx1 - wx0 + 1, 'b');

  // stone footing
  for (let y = 73; y <= 76; y++)
    for (let x = 3; x <= 90; x++) {
      const course = y < 75 ? 0 : 1;
      const joint = (x + course * 3) % 7 === 0;
      g.set(x, y, joint ? '3' : y === 73 ? '5' : y === 76 ? '3' : '4');
    }
  g.dots('G', 3, 75, 4, 76, 5, 76, 30, 76, 31, 76, 62, 76, 89, 75).dots('g', 3, 74, 30, 75);

  thatchRoof(g, HOUSE_W, 7, 45, 25, 15);

  // a ragged square of fresh straw, stitched in with twine
  for (let y = 20; y <= 28; y++)
    for (let x = 21; x <= 32; x++) {
      const ragged = (y === 20 || y === 28) && hash(x, y) < 350;
      if (ragged) continue;
      g.set(x, y, hash(x, y) < 160 ? 'h' : x === 21 || y === 20 ? 'Y' : 'y');
    }
  for (let x = 21; x <= 32; x += 2) g.set(x, 28, 'w');
  for (let y = 21; y <= 27; y += 2) g.set(21, y, 'w').set(32, y, 'w');
  for (let x = 23; x <= 31; x += 3) g.vline(x, 22, 3, 'h');
  // moss on the old thatch
  for (const [x, y, w] of [[60, 39, 7], [62, 38, 4], [8, 41, 6], [9, 40, 3], [44, 12, 5], [84, 42, 4], [14, 26, 3]] as [number, number, number][]) {
    g.hline(x, y, w, 'G');
    g.set(x, y, 'g').set(x + w - 1, y, 'p');
  }
  g.dots('g', 61, 39, 63, 38).dots('p', 64, 40, 10, 42);

  // eyebrow dormer: the thatch swells over a small lamplit window
  for (let y = 17; y <= 32; y++)
    for (let x = 35; x <= 58; x++) {
      const dx = (x - 46.5) / 12;
      const dy = (y - 31) / 13.5;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      g.set(x, y, d > 0.82 ? (dx < 0 ? 'e' : 'w') : dx < -0.45 ? 'e' : dx > 0.55 ? 'c' : 'h');
    }
  for (let x = 37; x <= 56; x++) if (x % 3 === 0) g.set(x, 18 + Math.round(Math.abs(x - 46.5) / 2.4), 'e');
  g.hline(39, 24, 16, 'w').hline(38, 25, 18, 'b');
  g.stamp(
    [
      '..CCCCCC..',
      '.CayyyyaC.',
      'CayYWYyyaC',
      'CyYYwYYyaC',
      'CwwwwwwwwC',
      'CayywYyyaC',
      'eeeeeeeeee',
    ],
    42,
    26,
  );

  // chimney: rough stone with a slate cap, rising through the thatch
  for (let y = 0; y <= 20; y++)
    for (let x = 70; x <= 79; x++) {
      const course = Math.floor(y / 3);
      const joint = y % 3 === 2 || (x + course * 4) % 5 === 0;
      g.set(x, y, joint ? '3' : x === 70 ? '5' : x >= 78 ? '3' : '4');
    }
  g.rect(69, 0, 12, 2, 'S').hline(69, 0, 12, 'D').hline(71, 2, 8, '2');
  g.hline(68, 21, 14, 'w').hline(69, 20, 12, 'c').hline(68, 19, 2, 'h').hline(80, 19, 2, 'c');
  g.dots('G', 79, 17, 79, 18, 78, 18);

  // windows
  windowWithShutters(g, 10, 54, 'hung');
  windowWithShutters(g, 56, 54, 'askew');
  // flower box under the left window
  g.stamp(['.gOg.YgR.jgO.', 'gGRgGygGjgGOg', 'kkkkkkkkkkkkk', 'wwwwbwwwwbwww', '.bbbbbbbbbbb.'], 13, 62);

  // door: arched planks, strap hinges, a lamplit spy-hole, brass knob
  const door = [
    '...LLLLLL...',
    '..LbwwwwbL..',
    '.LbwcayawbL.',
    '.LwcaYWycwL.',
    'LbwcwyywcwbL',
    'LbwcwwbwcwbL',
    'LDDDDDDwcwbL',
    'LSSSSSSwcwbL',
    'LbwcwwbwcwbL',
    'LbwcwwbwcwbL',
    'LbwcwwbwcwbL',
    'LbwcwwbwyabL',
    'LbwcwwbwaabL',
    'LbwcwwbwcwbL',
    'LDDDDDDwcwbL',
    'LSSSSSSwcwbL',
    'LbwcwwbwcwbL',
    'LbwcwwbwcwbL',
    'LbwcwwbwcwbL',
    'LLLLLLLLLLLL',
  ];
  g.stamp(door, 40, 53);
  // horseshoe for luck, nailed points-up
  g.stamp(['D..D', 'F..S', '.FS.'], 44, 49);
  // stone step
  g.rect(38, 73, 16, 3, '4').hline(38, 73, 16, '5').hline(38, 75, 16, '3').dots('3', 45, 74, 46, 74);

  g.stamp(cellarHatch(), 69, 65);

  // firewood stacked against the wall
  const log = ['.ww.', 'wkkw', 'wkcw', '.ww.'];
  for (const [x, y] of [[26, 69], [30, 69], [34, 69], [28, 66], [32, 66]] as [number, number][]) g.stamp(log, x, y);

  return g.rows();
}

/**
 * The cellar bulkhead: two sloping plank doors (lit by the sky, so lighter
 * than the wall), bound with iron straps that wander like roots and curl at
 * the ends, meeting at a boss shaped like a closed eye. A thread of violet
 * light leaks through the seam.
 */
function cellarHatch(): string[] {
  const g = Grid.of(
    art('hatch', 21, [
      '...LLLLLLLQLLLLLLL...',
      '...bkcwkcwMkcwkcwL...',
      '...bDDDDDDQDDDDDDL...',
      '...SSSSSSSQSSSSSSS...',
      '..bkcwkcwSSScwkcwkL..',
      '..bkcwkcSFFFSwkcwkL..',
      '..bkcwkSNFFFNScwkcL..',
      '..bkcwkcSNNNSwkcwkL..',
      '.bDDDDDDDNQNDDDDDDDL.',
      '.SSSSSSSSSQSSSSSSSSS.',
      '.bkcwkcwkcVkcwkcwkcL.',
      'wwwwwwwwwwMwwwwwwwwww',
      'bbbbbbbbbbbbbbbbbbbbb',
    ]),
  );
  // iron tendrils creeping off the straps like roots
  g.dots('S', 5, 4, 4, 5, 4, 6, 15, 4, 16, 5, 16, 6, 3, 10, 17, 10).dots('D', 4, 4, 15, 5);
  // rivets
  g.dots('F', 3, 3, 17, 3, 1, 9, 19, 9);
  return g.rows();
}

// --- Bertha's smithy -----------------------------------------------------------
// Open-fronted shed under a slate lean-to, its forge built into a tall stone
// chimney. The forge lights the dark interior; tongs and hammers hang on the
// back wall beside a watering can of solid, gleaming gold that nobody asks
// about. Anvil on a stump out front, a quench barrel by the right post.
//
// Offsets from the bottom-centre origin of the baked 72x60 sprite: anvil work
// point (+4, -4); forge glow (-14, -20); golden can (+20, -23). The shed is
// open: the floor band y -9..-2 between x -8 and +17 is walkable.

const SMITH_W = 70;
const SMITH_H = 58;

function smithy(): string[] {
  const g = new Grid(SMITH_W, SMITH_H);
  const ix0 = 14;
  const ix1 = 63;

  // interior: dark back wall of boards, warmed by the forge on the left
  for (let y = 28; y <= 49; y++)
    for (let x = ix0; x <= ix1; x++) {
      const d = Math.hypot((x - 22) / 1.7, y - 40);
      const seam = (x - ix0) % 5 === 4;
      // forge light: lit board edges close by, warm boards further out
      g.set(x, y, seam ? (d < 15 ? 'L' : 'u') : d < 9 && (x - ix0) % 5 === 0 ? 'w' : d < 15 ? 'b' : 'L');
    }
  // packed earth floor
  for (let y = 50; y <= 57; y++)
    for (let x = ix0; x <= ix1; x++) g.set(x, y, y === 50 ? 'u' : y === 51 || hash(x, y) < 60 ? 'L' : 'b');
  g.dots('v', 30, 54, 31, 55, 50, 56, 26, 52);

  // tools on the back wall: tongs, two hammers, a pair of horseshoes, a saw
  g.hline(33, 31, 15, 'w').dots('k', 35, 31, 40, 31, 45, 31);
  g.stamp(['F.', 'iF', '.F', '.D', 'F.D', 'i.F', 'F.D'], 34, 32);
  g.stamp(['DFD', 'iiF', '.c.', '.k.', '.c.', '.w.'], 38, 32);
  g.stamp(['FD', 'iF', '.c', '.k', '.w'], 43, 32);
  g.stamp(['F.F', 'D.D', '.D.'], 46, 33);
  g.stamp(['F.F', 'D.D', '.D.'], 46, 37);

  // the golden watering can, much too fine for a smithy
  g.hline(50, 31, 10, 'w').dots('k', 54, 31);
  g.stamp(
    [
      '..yyyy......',
      '.y....y.....',
      '.y....y....Y',
      'aYYYyyya..yY',
      'aYWYyyya.y.y',
      'aYYyyyyay...',
      'aYyyyyyy....',
      'ayyyyyya....',
      '.aaaaaa.....',
    ],
    50,
    32,
  );
  // it glints when nothing else does
  g.dots('W', 48, 31, 62, 32, 59, 41).dots('Y', 48, 30, 47, 31, 49, 31, 62, 31, 62, 33, 61, 32, 63, 32);

  // forge: brick hearth with a glowing firepot, an iron hood up into the chimney
  g.rect(ix0, 41, 14, 17, 'B');
  for (let y = 41; y <= 57; y++)
    for (let x = ix0; x < ix0 + 14; x++) {
      const row = Math.floor((y - 41) / 2);
      const joint = (y - 41) % 2 === 1 || (x + row * 2) % 4 === 0;
      if (joint) g.set(x, y, 'd');
      else if (x === ix0 || y === 41) g.set(x, y, 'r');
    }
  g.hline(ix0, 41, 14, 'r').hline(ix0, 42, 14, 'd');
  g.stamp(['.fofoff.', 'foayaoof', 'oayYyaof', 'faYWYaof', 'ooaayoff'], ix0 + 3, 37);
  g.dots('a', ix0 + 2, 36, ix0 + 9, 35, ix0 + 6, 34).dots('y', ix0 + 5, 35);
  g.rect(ix0, 28, 14, 6, 'S').hline(ix0, 28, 14, 'D').hline(ix0 + 1, 33, 12, 'N').hline(ix0 + 2, 34, 10, 'N');
  g.dots('o', ix0 + 3, 33, ix0 + 6, 33, ix0 + 10, 33).dots('a', ix0 + 7, 33);
  // bellows hanging beside the forge
  g.stamp(['.wc.', 'wcck', 'bwck', 'wbcc', 'bwcw', '.bw.', '..S.', '..S.'], ix0 + 14, 41);

  // anvil on its stump, a hammer left on the face
  g.stamp(
    [
      'FiiiiiiiiF.',
      'SDDDDDDDDSS',
      '.NSSSSSSN..',
      '...NSSN....',
      '...NSSN....',
      '..NSSSSN...',
      '..wkkkcw...',
      '..wcwcww...',
      '..bwbwbb...',
    ],
    34,
    47,
  );
  g.dots('S', 32, 47, 33, 47).dots('D', 33, 48);
  g.stamp(['wc', '.S'], 40, 46).dots('S', 41, 45, 42, 45).dots('D', 42, 44);

  // quench barrel with dark water
  g.stamp(
    [
      '.wwwwwww.',
      'wnnUnnnnw',
      'wnnnnnUnw',
      'cbwwwwwbb',
      'SDDDDDDDS',
      'kcwkcwcwb',
      'kcwkcwcwb',
      'SDDDDDDDS',
      'kcwkcwcwb',
      '.bbbbbbb.',
    ],
    53,
    48,
  );

  // chimney: rough stone, full height, with a scorched mouth at the top
  for (let y = 0; y <= 57; y++)
    for (let x = 1; x <= 12; x++) {
      const course = Math.floor(y / 3);
      const joint = y % 3 === 2 || (x + course * 5) % 6 === 0;
      g.set(x, y, joint ? '3' : x === 1 ? '5' : x >= 11 ? '3' : hash(x, y) < 80 ? '5' : '4');
    }
  g.rect(0, 0, 14, 3, 'S').hline(0, 0, 14, 'D').hline(2, 3, 10, '2').dots('1', 3, 0, 4, 0, 5, 0, 8, 0, 9, 0, 10, 0);
  g.dots('G', 1, 55, 1, 56, 2, 57, 12, 56).dots('g', 1, 54);

  // slate lean-to roof: offset rows of tiles, a few slipped or missing
  const rTop = 8;
  const rEave = 25;
  for (let y = rTop; y <= rEave; y++) {
    const x0 = Math.round(16 - ((y - rTop) * 4) / (rEave - rTop));
    for (let x = x0; x < SMITH_W - (y < rTop + 2 ? 3 : 0); x++) {
      const ty = y - rTop;
      const row = Math.floor(ty / 3);
      const col = Math.floor((x + (row % 2) * 2) / 4);
      const lx = (x + (row % 2) * 2) % 4;
      const ly = ty % 3;
      let ch = ly === 2 ? 'N' : lx === 3 ? 'N' : ly === 0 && lx < 2 ? 'D' : 'S';
      if (hash(col, row) < 45 && ly < 2) ch = lx < 2 ? 'F' : 'D';
      g.set(x, y, ch);
    }
  }
  g.hline(16, rTop - 1, SMITH_W - 19, 'S').hline(17, rTop - 2, SMITH_W - 21, 'D');
  // a missing slate showing the battens, lichen on a few tiles
  g.rect(46, 14, 4, 2, 'b').dots('w', 46, 14, 48, 14).dots('G', 36, 22, 37, 22, 38, 21, 63, 10, 64, 10);
  // front beam and posts
  g.hline(10, 26, SMITH_W - 10, 'w').hline(10, 27, SMITH_W - 10, 'b').hline(12, 26, SMITH_W - 14, 'c');
  g.rect(ix1 + 1, 26, 4, 32, 'w').vline(ix1 + 1, 26, 32, 'c').vline(ix1 + 4, 26, 32, 'b');
  g.dots('b', ix1 + 2, 34, ix1 + 3, 44, ix1 + 2, 52).dots('G', ix1 + 1, 56, ix1 + 1, 57);
  g.rect(ix1 + 5, 26, 1, 2, 'b');
  // the eave throws a shadow on the back wall
  g.swap({ L: 'u', b: 'L', w: 'b' }, ix0, 28, ix1 - ix0 + 1, 2);
  return g.rows();
}

// --- mutation bench ------------------------------------------------------------
// A scarred workbench: an alembic bubbling something violet into a collecting
// jar, specimen jars (a pickled sprout, sorted seeds), the violet light pooling
// on the boards. Pots and a soil sack on the shelf below.
// Work point: front centre, origin offset (0, 0).
function bench(): string[] {
  const g = new Grid(30, 24);
  // tabletop and frame
  g.hline(0, 13, 30, 'k').hline(0, 14, 30, 'c').hline(0, 15, 30, 'w').hline(0, 16, 30, 'b');
  g.dots('w', 4, 14, 11, 14, 19, 14, 25, 14).dots('b', 18, 15, 7, 15);
  g.rect(1, 17, 2, 7, 'w').vline(2, 17, 7, 'b').rect(27, 17, 2, 7, 'w').vline(28, 17, 7, 'b');
  g.hline(1, 21, 28, 'c').hline(1, 22, 28, 'b');
  // shelf: clay pots and a sack of soil
  g.stamp(['BBBB', 'rBBd', '.dd.'], 4, 18).stamp(['.BB.', 'rBBd', '.dd.'], 9, 18);
  g.stamp(['.ke.', 'kkkc', 'kkcw'], 21, 18).dots('L', 22, 18);
  // alembic: round flask of violet, a long neck, a tube to the collecting jar
  g.ellipse(5.5, 9, 3.6, 3.6, 'F');
  g.rect(5, 1, 2, 5, 'F').vline(5, 1, 5, 'i');
  g.rect(3, 9, 6, 4, 'V').hline(3, 9, 6, 'O').dots('6', 7, 11, 8, 10, 6, 12, 8, 12).dots('j', 4, 10);
  g.dots('i', 3, 7, 4, 6).dots('W', 3, 8);
  g.line(7, 1, 13, 4, 'F').line(7, 2, 13, 5, 'i').dots('.', 13, 5);
  g.stamp(['.F..F.', 'iFFFFF', 'i....F', 'iO...F', 'iVVVVF', 'iV6VVF', '.FFFF.'], 12, 6);
  g.dots('O', 14, 8).dots('j', 13, 10);
  // ring stand legs under the flask
  g.dots('S', 2, 12, 9, 12);
  // specimen jars
  g.stamp(['.ww.', 'iFFF', 'iGgF', 'iFsF', 'iCCF', 'iGpF', '.FF.'], 20, 6);
  g.stamp(['.cc.', 'iFFF', 'ihaF', 'iahF', '.FF.'], 25, 8);
  // scrawled notes
  g.stamp(['CCe', 'bCe'], 9, 12);
  // violet light pooling on the boards
  g.dots('M', 2, 13, 9, 13, 11, 13, 17, 13, 18, 13).dots('O', 4, 13, 14, 13);
  return g.rows();
}

// --- seed archive ----------------------------------------------------------------
// A tall painted cabinet-shed full of tiny labelled drawers. A rolling ladder
// leans on it; one drawer is left open with a packet sticking out, one has
// started sprouting on its own. Lamp lit in the gable window.
// Door/interaction: front centre, origin offset (0, -2).
function archive(): string[] {
  const g = new Grid(46, 50);
  // gable roof of wooden shingles
  for (let y = 2; y <= 13; y++) {
    const half = Math.round((y - 1) * 2);
    for (let x = 23 - half; x <= 22 + half; x++) {
      if (x < 0 || x > 45) continue;
      const row = y % 3;
      const seam = (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0 || row === 2;
      g.set(x, y, seam ? 'b' : x < 23 ? (row === 0 ? 'k' : 'c') : 'w');
    }
  }
  g.hline(0, 13, 46, 'b').hline(1, 12, 44, 'w');
  for (let y = 2; y <= 12; y++) {
    const half = Math.round((y - 1) * 2);
    g.set(23 - half, y, 'k').set(22 + half, y, 'L');
  }
  // round gable window with a lamp lit
  g.stamp(['.CCC.', 'CyYaC', 'CYWyC', 'CaywC', '.CCC.'], 21, 5);
  // a sprout weathervane on the apex
  g.dots('w', 22, 1, 23, 1, 22, 0).dots('g', 21, 0, 24, 0).dots('s', 20, 0);
  // painted body
  g.rect(1, 14, 44, 34, 'p');
  g.vline(1, 14, 34, 'G').vline(2, 14, 34, 'G').vline(43, 14, 34, 't').vline(44, 14, 34, 't');
  g.hline(1, 14, 44, 't').hline(1, 15, 44, 'G');
  // name board
  g.rect(15, 16, 16, 3, 'k').hline(15, 18, 16, 'c').dots('b', 17, 17, 18, 17, 20, 17, 22, 17, 23, 17, 25, 17, 27, 17, 28, 17);
  // drawers: 8 x 7 tiny fronts with labels and knobs
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 8; c++) {
      const x = 3 + c * 5;
      const y = 20 + r * 4;
      const h = hash(c, r);
      g.stamp(['kCCk', 'cDSc', 'wwww'], x, y);
      if (h < 120) g.rect(x + 1, y, 2, 1, 'k');
      if (h > 880) g.dots('e', x + 1, y, x + 2, y);
    }
  // an open drawer with a seed packet in it
  g.stamp(['kkkkkk', 'eCChCe', 'cwDScw', 'bbbbbb'], 27, 31);
  g.stamp(['Ch', 'CB'], 29, 29);
  // a drawer that has started to sprout
  g.stamp(['.s.g', 'sgGg', '.Gp.'], 9, 22).dots('G', 10, 25);
  // plinth and feet
  g.rect(0, 47, 46, 2, 'b').hline(0, 47, 46, 'w').rect(1, 49, 4, 1, 'b').rect(41, 49, 4, 1, 'b');
  // rolling ladder leaning on the drawers
  g.line(4, 49, 10, 17, 'c').line(5, 49, 11, 17, 'w');
  g.line(9, 49, 15, 17, 'c').line(10, 49, 16, 17, 'w');
  for (let y = 20; y <= 46; y += 4) {
    const xa = Math.round(4 + ((49 - y) * 6) / 32) + 2;
    g.hline(xa, y, 4, 'k');
  }
  g.dots('S', 4, 49, 9, 49).dots('k', 11, 16, 16, 16);
  return g.rows();
}

// --- irrigation pump ----------------------------------------------------------------
// Cast-iron hand pump on a stone plinth, spout over a wooden trough. Broken:
// the handle has snapped and lies in the grass, the trough is dry and cracked
// with a dead leaf and a cobweb. Repaired: handle splinted with fresh wood and
// twine, water in the trough, a drop at the spout.
// Offsets from the bottom-centre of the baked 24x30 sprite: handle end
// (-11, -17) when repaired; trough (+5, -6).
function pumpBase(): Grid {
  const g = new Grid(22, 28);
  // plinth
  g.rect(3, 22, 10, 6, '4').hline(3, 22, 10, '5').hline(3, 27, 10, '3').vline(12, 22, 6, '3');
  g.dots('3', 7, 24, 8, 24, 5, 26).dots('G', 3, 26, 3, 27, 4, 27);
  // iron column with banded rings
  for (let y = 4; y <= 21; y++) g.stamp(['DSSSN'], 6, y);
  g.dots('F', 7, 6, 7, 7, 7, 13).hline(6, 9, 5, 'N').hline(6, 17, 5, 'N').dots('D', 6, 9, 6, 17);
  g.stamp(['..S..', '.SDS.', 'NSDSN', 'NDSSN'], 6, 0);
  // spout
  g.hline(11, 9, 4, 'S').hline(11, 10, 4, 'N').dots('D', 11, 9).stamp(['SN', 'NN', 'N.'], 14, 9);
  // pivot boss for the handle
  g.dots('N', 5, 5, 5, 6).dots('D', 4, 5);
  // trough
  g.hline(10, 17, 12, 'k').hline(10, 18, 12, 'c');
  g.rect(10, 21, 12, 6, 'c').hline(10, 21, 12, 'k').hline(10, 26, 12, 'b');
  for (const x of [13, 17]) g.vline(x, 21, 5, 'w');
  g.vline(10, 17, 10, 'w').vline(21, 17, 10, 'b');
  g.dots('S', 11, 22, 20, 22, 11, 25, 20, 25);
  return g;
}

function pumpBroken(): string[] {
  const g = pumpBase();
  // dry trough: cracked boards, a dead leaf, a cobweb from the spout
  g.rect(11, 19, 10, 2, 'b').dots('L', 13, 19, 14, 20, 17, 19, 18, 20).dots('r', 15, 19, 16, 20).dots('c', 16, 19);
  g.dots('i', 15, 12, 16, 14, 17, 16, 15, 15).dots('F', 16, 13);
  // snapped handle: a jagged stub, the rest lying in the grass
  g.line(4, 5, 2, 7, 'w').dots('e', 1, 8, 2, 8);
  g.line(0, 27, 6, 25, 'w').line(0, 26, 5, 24, 'c').dots('e', 6, 24).dots('k', 0, 25);
  // rust blooms on the iron
  g.dots('r', 9, 12, 8, 19, 9, 20).dots('B', 9, 13);
  return g.rows();
}

function pumpFixed(): string[] {
  const g = pumpBase();
  // water in the trough with a glint, a drop falling from the spout
  g.rect(11, 19, 10, 2, 'U').hline(11, 19, 10, 'K').dots('I', 13, 19, 18, 19).dots('n', 20, 20, 11, 20);
  g.dots('x', 15, 13, 15, 15).dots('I', 15, 16);
  // whole handle again, splinted with fresh wood and bound with twine
  g.line(4, 5, 0, 12, 'w').line(3, 5, 0, 10, 'c').dots('k', 0, 11, 0, 12);
  g.dots('k', 2, 8, 1, 9).dots('h', 2, 7, 1, 9, 3, 7);
  g.dots('G', 13, 26, 14, 26, 21, 26);
  return g.rows();
}

// --- compost bin --------------------------------------------------------------
// Slatted bin heaped with peelings, a garden fork stuck in the top and a worm
// coming up to see who is there.
// Use point: front centre, origin offset (0, 0).
function compost(): string[] {
  const g = new Grid(22, 18);
  // heap
  g.ellipse(11, 7, 9.5, 4, 'L');
  g.ellipse(10, 6, 7, 2.6, 'b');
  g.dots('o', 6, 5, 7, 5, 14, 7).dots('g', 9, 4, 10, 4, 16, 6, 4, 7).dots('G', 10, 5).dots('P', 12, 5, 13, 5).dots('e', 8, 7, 15, 5).dots('C', 8, 6);
  g.dots('J', 4, 5, 4, 4, 5, 3).dots('8', 5, 3);
  // fork
  g.line(16, 6, 19, 0, 'c').line(17, 6, 20, 0, 'w').dots('S', 15, 7, 16, 7, 17, 7).dots('D', 15, 8, 17, 8);
  // posts and slats
  g.rect(0, 5, 2, 13, 'w').vline(0, 5, 13, 'c').rect(20, 5, 2, 13, 'b').vline(20, 5, 13, 'w');
  g.dots('k', 0, 5, 1, 5).dots('c', 20, 5, 21, 5);
  for (const y of [9, 12, 15]) {
    g.hline(2, y, 18, 'c').hline(2, y + 1, 18, 'w');
    g.dots('k', 3, y, 4, y, 10, y).dots('b', 14, y + 1);
  }
  g.hline(2, 11, 18, 'u').hline(2, 14, 18, 'u').hline(2, 17, 18, 'u').dots('L', 6, 11, 12, 14, 9, 11);
  g.dots('G', 0, 16, 0, 17, 21, 17).dots('g', 1, 17);
  return g.rows();
}

// --- potting bench ----------------------------------------------------------------
// The loadout table: a back board with a shelf of little pots, a seedling in
// a big pot, a trowel stuck in spilled soil, the seed satchel with its buckle,
// and a plain tin watering can underneath (nothing like the smithy's).
// Use point: front centre, origin offset (0, 0).
function potting(): string[] {
  const g = new Grid(30, 20);
  // back board and shelf
  g.rect(2, 0, 26, 9, 'w');
  for (const x of [8, 14, 20]) g.vline(x, 0, 9, 'b');
  g.hline(2, 0, 26, 'c').hline(1, 4, 28, 'k').hline(1, 5, 28, 'b');
  g.stamp(['BB', 'rd'], 4, 2).stamp(['BB', 'rd'], 10, 2).stamp(['.g', 'BB', 'rd'], 22, 1).dots('s', 23, 1);
  g.stamp(['DD', 'FS'], 17, 2);
  // tabletop
  g.hline(0, 9, 30, 'k').hline(0, 10, 30, 'c').hline(0, 11, 30, 'w').hline(0, 12, 30, 'b');
  // big pot with a seedling
  g.stamp(['.s.g.', 'sgGgs', '.GpG.', 'BBBBB', 'rBBBd', '.rBd.'], 3, 3);
  g.dots('L', 4, 6, 5, 6, 6, 6);
  // spilled soil and the trowel
  g.stamp(['.bb.', 'bLLb'], 10, 8).line(11, 7, 14, 4, 'S').dots('F', 12, 6).stamp(['cw', 'wb'], 14, 3);
  // seed satchel
  g.stamp(['.wwww.', 'wccccw', 'wkkkkw', 'wkyakw', 'wcccbw', '.bbbb.'], 19, 3);
  g.line(19, 3, 17, 0, 'b').line(24, 3, 26, 0, 'b');
  // legs and lower shelf
  g.rect(1, 13, 2, 7, 'w').vline(2, 13, 7, 'b').rect(27, 13, 2, 7, 'w').vline(28, 13, 7, 'b');
  g.hline(1, 17, 28, 'c').hline(1, 18, 28, 'b');
  // tin can under the bench
  g.stamp(['..DD...', '.D..D..', 'FDDDS.S', 'FDDSS.S', 'DDSSSS.', '.NNNN..'], 5, 11);
  g.stamp(['BB.BB', 'rd.rd'], 18, 15).dots('B', 20, 14);
  return g.rows();
}

// --- expedition gate ------------------------------------------------------------
// The way out to the Blighted Meadow: a heavy plank gate between two mossy
// stone gateposts, set into a dry-stone wall whose ends join d_wall_h runs. A
// lantern hangs from the left post; from the lintel hangs a warning sign, a
// crude painted turnip wearing a crown, struck through in red.
// Passage: x 18..37 of the 56 wide sprite, i.e. origin offset -10..+9. The wall
// stubs either side are 12px tall and line up with d_wall_h.
function gate(wall: string[]): string[] {
  const W = 56;
  const H = 42;
  const g = new Grid(W, H);
  // wall stubs, phase-matched to d_wall_h at each edge
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < W; x++) {
      if (x > 11 && x < 44) continue;
      const col = x <= 11 ? x % 16 : (((x - W) % 16) + 16) % 16;
      g.set(x, H - 12 + y, wall[y][col]);
    }
  // gate leaves: planks with a Z brace, arched tops
  for (let y = 18; y < H; y++)
    for (let x = 18; x <= 37; x++) {
      const leaf = x <= 27 ? 0 : 1;
      const lx = leaf === 0 ? x - 18 : 37 - x;
      const topY = 18 + Math.round(Math.abs(lx - 4.5) / 2.2);
      if (y < topY) continue;
      g.set(x, y, lx % 3 === 2 ? 'b' : lx % 3 === 0 ? 'c' : 'w');
    }
  g.vline(27, 19, H - 19, 'L').vline(28, 19, H - 19, 'L');
  for (const x0 of [18, 28]) {
    g.hline(x0, 23, 10, 'k').hline(x0, 24, 10, 'w').hline(x0, 35, 10, 'k').hline(x0, 36, 10, 'w');
    g.line(x0 + (x0 === 18 ? 1 : 8), 34, x0 + (x0 === 18 ? 8 : 1), 25, 'k');
  }
  // hinges and the ring latch
  g.hline(18, 23, 3, 'S').hline(18, 35, 3, 'S').hline(35, 23, 3, 'S').hline(35, 35, 3, 'S');
  g.stamp(['.D.', 'D.D', '.S.'], 26, 28).dots('F', 27, 28);
  // gateposts: big mossy stones under cap stones
  for (const px of [10, 38]) {
    for (let y = 6; y < H; y++)
      for (let x = px; x < px + 8; x++) {
        const course = Math.floor((y - 6) / 5);
        const ly = (y - 6) % 5;
        const joint = ly === 4 || x === px + 3 + (course % 2) * 2;
        g.set(x, y, joint ? '2' : ly === 0 ? '5' : x === px + 7 ? '3' : '4');
      }
    g.rect(px - 1, 3, 10, 3, '5').hline(px - 1, 5, 10, '3').hline(px, 2, 8, '4');
    g.dots('G', px, 2, px + 1, 2, px + 1, 1, px + 5, 2, px - 1, 4).dots('g', px + 1, 0, px + 2, 1).dots('p', px + 6, 3);
  }
  g.dots('G', 10, 30, 10, 31, 11, 31, 45, 22, 45, 23, 44, 23).dots('g', 10, 29, 45, 21).dots('p', 11, 32);
  // lintel beam and the warning sign
  g.hline(12, 7, 32, 'c').hline(12, 8, 32, 'w').hline(12, 9, 32, 'b').hline(13, 7, 30, 'k');
  g.dots('S', 23, 10, 23, 11, 32, 10, 32, 11);
  g.stamp(
    [
      'kkkkkkkkkkkk',
      'kc.y.y.y.ckc',
      'kcTyyyyyckwc',
      'kccPMPPcTcwc',
      'kcPMPPTPccwc',
      'kccPPTPcccwc',
      'kcTcCCcccTwc',
      'wwwwwwwwwwww',
    ],
    22,
    12,
  );
  g.swap({ '.': 'c' }, 22, 12, 12, 8);
  // lantern on an iron bracket off the left post
  g.hline(5, 10, 5, 'S').dots('D', 5, 10).vline(6, 11, 1, 'S');
  g.stamp(['.NN.', 'NSSN', 'NyYN', 'NYWN', 'NayN', '.NN.'], 5, 12);
  // flowers at the foot of the posts
  g.dots('Y', 9, 41, 47, 40).dots('O', 8, 40).dots('g', 9, 40, 48, 41, 8, 41);
  return ink(g.rows(), 'openSides');
}

// --- Old Mother Turnip --------------------------------------------------------------
// An enormous ancient turnip half-sunk in the earth: plum shoulders fading to
// cream, moss in her creases, great leaves overhead, eyes serenely closed.
// Offerings at her feet: a seed bowl, a coin, an apple, wildflowers and three
// candles that flicker (2 frames).
// Offering point: front centre, origin offset (0, -3).
function shrine(flick: boolean): string[] {
  const g = new Grid(46, 54);
  // great leaves, two standing, two drooping with age, one young in the middle
  const leaf = (pts: [number, number][], r: number) => {
    for (const [tone, k] of [['t', 1], ['p', 0.8], ['G', 0.5]] as [string, number][])
      for (let i = 0; i + 1 < pts.length; i++) {
        const t = i / (pts.length - 1);
        const t2 = (i + 1) / (pts.length - 1);
        stroke(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], Math.max(0.6, r * k * (1 - t * 0.55)), Math.max(0.5, r * k * (1 - t2 * 0.55)), tone);
      }
    for (let i = 0; i + 1 < pts.length; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'g');
  };
  leaf([[20, 20], [8, 11], [3, 17]], 4);
  leaf([[27, 20], [38, 10], [43, 16]], 4);
  leaf([[21, 20], [17, 9], [14, 2]], 4.4);
  leaf([[26, 20], [29, 9], [33, 2]], 4.4);
  leaf([[23, 20], [23, 11]], 2.6);
  g.dots('s', 14, 3, 15, 4, 31, 4, 32, 3, 8, 11, 9, 11, 37, 11).dots('p', 3, 17, 43, 16);

  // body: plum shoulders, cream below, lit from the upper left
  for (let y = 17; y < 54; y++)
    for (let x = 3; x < 44; x++) {
      const dx = (x - 23) / 19;
      const dy = (y - 35) / 17;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const band = 30 + Math.round(Math.sin(x * 0.5 + 1) * 1.5);
      const lit = Math.hypot(dx + 0.42, dy + 0.62);
      if (y < band) g.set(x, y, lit < 0.3 ? 'z' : lit < 0.72 ? 'M' : d > 0.72 && dx > -0.1 ? 'Q' : 'P');
      else g.set(x, y, y === band ? 'j' : lit < 0.98 ? 'C' : lit < 1.22 ? 'e' : 'k');
    }
  // crown where the leaves spring from, a faded red ribbon tied round it
  g.ellipse(23, 19, 4.6, 1.8, 'G').dots('p', 19, 20, 27, 20, 23, 20).dots('g', 21, 18, 22, 18);
  g.hline(19, 21, 9, 'T').dots('E', 26, 21, 27, 21).dots('T', 18, 22, 17, 23, 17, 24).dots('E', 18, 23, 16, 25);
  // moss draped over her shoulders
  for (let y = 18; y < 34; y++)
    for (let x = 3; x < 44; x++) {
      const c = g.get(x, y);
      if (!'zMPQ'.includes(c) || c === '.') continue;
      const m1 = Math.hypot((x - 11) / 6, (y - 25) / 4);
      const m2 = Math.hypot((x - 36) / 5, (y - 24) / 5);
      const m3 = Math.hypot((x - 25) / 6, (y - 22) / 2);
      const m = Math.min(m1, m2, m3) + (hash(x, y) % 100) / 300;
      if (m < 0.75) g.set(x, y, m < 0.4 ? 'g' : 'G');
      else if (m < 0.95) g.set(x, y, 'p');
    }
  // age: cracks in the cream, lichen
  g.line(8, 36, 10, 40, 'k').line(37, 33, 35, 37, 'k').dots('k', 11, 41);
  g.dots('h', 30, 39, 31, 39, 13, 31).dots('5', 6, 33);
  // serenely closed eyes, a soft smile, a little blush
  g.stamp(['Q...Q', '.QQQ.'], 13, 33).stamp(['Q...Q', '.QQQ.'], 28, 33).dots('Q', 12, 34, 34, 34);
  g.stamp(['P...P', '.PPP.'], 21, 38);
  g.dots('J', 12, 36, 13, 36, 33, 36, 34, 36);

  // the earth she is sunk in, tufted with grass, roots crawling over it
  // the soil line curves round her like the rim of a bowl
  for (let y = 38; y < 54; y++)
    for (let x = 0; x < 46; x++) {
      const dx = (x - 23) / 23;
      const rim = 39 + Math.round(4 * (1 - dx * dx));
      const dy = (y - 49) / 7.5;
      if (y < rim || (Math.abs(dx) > 0.83 && dx * dx + dy * dy > 1)) continue;
      g.set(x, y, y < rim + 2 ? 'c' : y > 51 ? 'b' : 'w');
    }
  for (let x = 1; x < 45; x++) {
    let top = 0;
    while (top < 54 && g.get(x, top) !== 'c' && g.get(x, top) !== 'w') top++;
    if (top < 54 && x % 3 !== 0) g.set(x, top, x % 3 === 1 ? 'G' : 'g');
  }
  g.line(9, 43, 2, 48, 'e').line(37, 43, 44, 48, 'e').line(14, 45, 10, 51, 'k').line(32, 45, 36, 51, 'k');
  g.dots('b', 6, 51, 18, 52, 30, 52, 40, 51, 25, 49);
  g.stamp(['ke', 'C.'], 4, 45).stamp(['k', 'C'], 42, 46);
  // offerings: a bowl of seed, a coin, an apple, wildflowers
  g.stamp(['hayah', 'cccck', '.wcw.'], 17, 46);
  g.dots('y', 23, 48).dots('a', 24, 48);
  g.stamp(['.g', 'T9', 'Td'], 26, 46);
  g.stamp(['O.Y', 'gOg', '.g.'], 30, 46);
  // candles with drips; the flames lean as they flicker
  const flame = flick ? ['.y', 'yW', 'aY'] : ['y.', 'Wy', 'Ya'];
  for (const [x, y, h] of [[8, 42, 6], [36, 41, 7], [40, 45, 4]] as [number, number, number][]) {
    g.rect(x, y, 2, h, 'C').vline(x + 1, y, h, 'e').dots('C', x - 1, y + 2, x + 2, y + 3);
    g.stamp(flame, x, y - 3);
  }
  return g.rows();
}

export const BUILDINGS: SpriteDef[] = [
  sprite('b_farmhouse', WL, [farmhouse()], P),
  sprite('b_smithy', WL, [smithy()], P),
  sprite('b_bench', WL, [bench()], P),
  sprite('b_archive', WL, [archive()], P),
  sprite('b_pump_broken', WL, [pumpBroken()], P),
  sprite('b_pump', WL, [pumpFixed()], P),
  sprite('b_compost', WL, [compost()], P),
  sprite('b_potting', WL, [potting()], P),
  sprite('b_gate', WL, [gate(WALL_INNER)], { outline: false, origin: [0.5, 1] }),
  sprite('b_shrine', WL, [shrine(false), shrine(true)], { ...P, fps: 3 }),
];
