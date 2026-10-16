// Larger decor: rocks, stump, bush, trees, walls, pillar, well, cart, tool
// rack. Outlined, origin bottom-centre. The wall pieces are inked by hand so
// runs join without seams.
import { sprite, type SpriteDef } from '../sprite';
import { Grid, WL, art, ink, foliage, stroke, type Tones } from './world-kit';

const P: Partial<SpriteDef> = { outline: true, origin: [0.5, 1] };

// --- rocks and stump ---------------------------------------------------------

// A two-lobed boulder: lit top facets, a moss blanket draped over the big lobe,
// a crack down the front, rusty lichen, moss at its foot.
const ROCK_L = Grid.of(
  art('rock_l', 22, [
    '.......ssgg...........',
    '.....sggGGgg5.........',
    '....gGGGGGGp555.54....',
    '...5GGpGGpG555535544..',
    '..55Gp5pGp55555355444.',
    '.5555G555555554444433.',
    '.55444444444443444433.',
    '5444444444344434444333',
    '4444444444344434443333',
    '4444444444433434443332',
    '3444444444434444433332',
    '3444444444344444433332',
    '3344444444344444333332',
    '3334444444444433333322',
    '.3Gp33333333333333322.',
    '..GG2222222222222222..',
  ]),
)
  .dots('c', 3, 9, 4, 9, 17, 8)
  .dots('h', 4, 8)
  .rows();

const STUMP = art('stump', 14, [
  '...wwwwwwww...',
  '.wwkeekkkkkww.',
  'wkkkcccccckkcw',
  'wkeckkckkkckcw',
  'wkkkcccccckccw',
  'bwkkkkkkkkkcwb',
  'cwcwbwwbwwbekk',
  'cwcwbwwbwwbkcc',
  'gGcwbwwbwwbLLb',
  'GGwc.bwb.wbbLL',
]);

// --- bush ----------------------------------------------------------------------

const LEAF: Tones = { deep: 'p', shade: 'G', base: 'g', lit: 's' };
const LEAF_LOW: Tones = { deep: 't', shade: 'p', base: 'G', lit: 'g' };
const LEAF_HIGH: Tones = { deep: 'G', shade: 'g', base: 'g', lit: 's' };

const BUSH = (() => {
  const g = new Grid(18, 14);
  foliage(g, [[5, 6, 4.6], [12.5, 5.5, 4.8], [9, 3.6, 3.8], [3.6, 9.4, 3.6], [9, 9.4, 4.4], [14.3, 9.2, 3.6]], LEAF);
  // blackberries, each a dark body with a glint
  g.dots('T', 6, 7, 11, 5, 14, 10, 4, 11).dots('J', 6, 6, 11, 4, 14, 9);
  return g.rows();
})();

// --- oak -----------------------------------------------------------------------
// Clustered canopy over a sturdy trunk. Under it hangs an old plank swing gone
// green with moss: somebody used to play here.
const OAK = (() => {
  const g = new Grid(38, 48);
  // trunk and roots first so the canopy overlaps the top of the trunk
  g.rect(16, 24, 6, 20, 'w');
  g.vline(16, 24, 20, 'c').vline(21, 24, 20, 'b').vline(20, 26, 16, 'b');
  stroke(g, 16, 42, 12, 47, 1.6, 1, 'w');
  stroke(g, 21, 42, 25, 47, 1.6, 1, 'b');
  stroke(g, 18, 43, 18, 47, 1.4, 1.2, 'w');
  g.dots('c', 12, 46, 13, 45, 17, 46).dots('b', 24, 46, 19, 46);
  // bark grooves and a knothole
  g.vline(18, 33, 5, 'b').vline(17, 38, 4, 'b').dots('b', 19, 29, 19, 30);
  g.rect(18, 36, 2, 2, 'L').dots('u', 18, 37);
  // swing branch reaching right under the canopy
  stroke(g, 21, 30, 31, 29, 1.1, 0.7, 'b');
  // canopy: the lower clusters sit in their own shade, the crown catches the sun
  foliage(g, [[3.6, 21, 3.6], [34.2, 21, 3.4], [9, 23, 7], [29, 23, 7], [19, 24.5, 7.6]], LEAF_LOW);
  foliage(g, [[5.6, 15, 6], [32, 14.5, 5.8], [18.5, 14, 8.5]], LEAF);
  foliage(g, [[12, 8, 7], [25, 7, 7.5], [18.5, 4.6, 6]], LEAF_HIGH);
  // dappled bright leaves on the lit side of a few clusters
  g.dots('l', 9, 3, 10, 3, 21, 1, 22, 1, 3, 11, 15, 8, 16, 8);
  // shadow where the canopy meets the trunk
  g.dots('t', 17, 30, 18, 30, 19, 30, 17, 31, 18, 31, 20, 31);
  // an old plank swing, moss on the seat
  g.vline(27, 31, 9, 'e').vline(31, 31, 9, 'e').dots('k', 27, 34, 31, 36);
  g.hline(26, 40, 7, 'c').hline(26, 41, 7, 'w').dots('G', 28, 40, 29, 40).dots('k', 26, 40);
  return g.rows();
})();

// --- dead tree -------------------------------------------------------------------
// Bleached and twisted, a bracket fungus on the trunk, a hollow, and a red rag
// tied to a low branch by someone who wanted to find their way back.
const DEAD = (() => {
  const g = new Grid(30, 42);
  const W = 'D';
  stroke(g, 15, 41, 14, 24, 3.4, 2.4, W);
  stroke(g, 14, 40, 7, 41, 1.6, 0.7, W);
  stroke(g, 16, 40, 23, 41, 1.6, 0.7, W);
  stroke(g, 14, 25, 7, 14, 2.1, 1.2, W);
  stroke(g, 7, 14, 3, 5, 1.2, 0.5, W);
  stroke(g, 7, 15, 11, 8, 0.8, 0.5, W);
  stroke(g, 4, 9, 1, 7, 0.6, 0.5, W);
  stroke(g, 15, 24, 22, 15, 2, 1.1, W);
  stroke(g, 22, 15, 26, 5, 1.1, 0.5, W);
  stroke(g, 22, 16, 28, 13, 0.7, 0.5, W);
  stroke(g, 25, 9, 28, 7, 0.5, 0.5, W);
  stroke(g, 14, 25, 15, 8, 1.7, 0.8, W);
  stroke(g, 15, 9, 13, 1, 0.7, 0.5, W);
  stroke(g, 15, 11, 19, 4, 0.6, 0.5, W);
  // light from the left, shadow on the right
  const src = g.clone();
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (src.get(x, y) !== W) continue;
      if (src.get(x + 1, y) === '.') g.set(x, y, 'S');
      else if (src.get(x - 1, y) === '.') g.set(x, y, 'F');
      else if (src.get(x + 2, y) === '.' && y > 22) g.set(x, y, 'S');
    }
  // bark splits
  g.vline(15, 27, 6, 'S').vline(13, 34, 4, 'S').dots('N', 15, 33, 16, 38);
  // hollow
  g.ellipse(13.5, 30.5, 1.2, 1.6, 'A').dots('N', 12, 29, 15, 31).dots('q', 13, 31, 14, 31);
  // bracket fungus, plum with a blush rim
  g.stamp(['jjM', 'PPQ'], 17, 26).stamp(['jM', 'PQ'], 17, 29);
  // the red rag
  g.dots('T', 6, 14, 7, 14, 5, 15, 5, 16).dots('9', 6, 15).dots('E', 4, 17);
  // a few last leaves
  g.dots('c', 3, 4, 26, 4, 28, 12).dots('r', 12, 0);
  return g.rows();
})();

// --- walls ---------------------------------------------------------------------
// Dry-stone wall: mossy cap, then irregular flat stones in rough courses. 16
// wide and tiles horizontally; stones and joints wrap across the edge.
type Stone = [x: number, y: number, w: number, h: number];
function stones(g: Grid, list: Stone[]): void {
  for (const [x0, y0, w, h] of list)
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const x = (x0 + i) % g.w;
        const top = j === 0;
        const bottom = j === h - 1;
        const right = i === w - 1;
        g.set(x, y0 + j, top && i < Math.ceil(w * 0.6) ? '5' : bottom || right ? '3' : '4');
      }
}
export const WALL_INNER = (() => {
  const g = new Grid(16, 12, '2');
  g.rect(0, 0, 16, 1, '.').stamp(['....gsgG........'], 0, 0);
  g.stamp(['5545GgGG55545555', '554GGpGG5545G555', '4434pGp34443G444'], 0, 1);
  stones(g, [
    [1, 4, 5, 2], [7, 4, 5, 3], [13, 4, 3, 2],
    [14, 7, 6, 2], [5, 7, 4, 3], [10, 7, 3, 2],
    [15, 10, 4, 2], [4, 10, 5, 2], [10, 10, 4, 2],
  ]);
  g.dots('G', 6, 4, 6, 5, 12, 6, 13, 7, 9, 9, 3, 11).dots('p', 0, 6, 9, 8, 14, 11).dots('g', 6, 3);
  return g.rows();
})();
const WALL_H = ink(WALL_INNER, 'wrapX');

// The end of a run: its left edge continues d_wall_h, then it crumbles away to
// the right into a heap of fallen stones. Flip it for the left-hand end.
const WALL_BROKEN = (() => {
  const g = Grid.of(WALL_INNER.map((r) => r.slice(0, 15)));
  // knock the wall down in steps
  g.rect(6, 0, 9, 4, '.');
  g.rect(9, 4, 6, 3, '.');
  g.rect(12, 7, 3, 3, '.');
  // broken stone edges catching light
  g.dots('5', 6, 4, 7, 4, 9, 7, 10, 7).dots('3', 8, 4, 11, 7).dots('G', 5, 3, 6, 3);
  // fallen stones at the foot
  g.stamp(['.54.', '5443', '4332'], 11, 9);
  g.stamp(['54', '43'], 9, 10);
  g.dots('g', 14, 8);
  return ink(g.rows(), 'openLeft');
})();

// --- ruined pillar -------------------------------------------------------------
// Pale ancient stone, fluted, snapped off near the top; ivy climbing it; a worn
// spiral knot carved into the plinth (the same mark as the farmhouse cellar).
const PILLAR = art('pillar', 14, [
  '.....Gg.......',
  '...gGiF.......',
  '...iFiFD......',
  '...iFiFDF.....',
  '...iFiFDFD....',
  '...iFiFDFDS...',
  '...iFiFDFDS...',
  '...iFiFDSDS...',
  '...iFiFDFSS...',
  '...iFiFDFDS...',
  '...iFiFDFDS...',
  '...iFiFDFDS...',
  '...GFiFDFDS...',
  '..gGFiFDFDS...',
  '...pFiFDFDS...',
  '...iGiFDFDS...',
  '..GgpiFDFDS...',
  '...piFFDFDS...',
  '..gGiFiDFDS...',
  '...pFiFDFDS...',
  '..GpFiFDFDS...',
  '...piFiDFDS...',
  '..iiiiFFFDDS..',
  '..FFFFFFDDSS..',
  '.iiiiiiiiFFFD.',
  'GFFDDDDFFFDDDS',
  'pGFDFFDFFFDDSS',
  'GpSSSSSSSSSSSS',
]);

// --- well ----------------------------------------------------------------------
const WELL = (() => {
  const g = new Grid(22, 26);
  // stone body and rim
  g.rect(0, 16, 22, 6, '4');
  g.ellipse(10.5, 21.6, 10.5, 3.4, '4');
  g.ellipse(10.5, 15.4, 10.5, 3.6, '5');
  g.ellipse(10.5, 15.1, 7.4, 2, 'A');
  g.hline(5, 14, 12, 'N');
  g.dots('n', 9, 16, 10, 16, 11, 16).dots('U', 12, 16);
  // shading: right side in shade, a lip shadow under the rim
  for (let y = 16; y < 26; y++)
    for (let x = 0; x < 22; x++) {
      const ch = g.get(x, y);
      if (ch !== '4') continue;
      if (x >= 17) g.set(x, y, '3');
      if (x <= 1 && y < 23) g.set(x, y, '5');
    }
  g.hline(1, 19, 20, '3');
  // stone courses on the body
  for (const [y, xs] of [
    [21, [4, 9, 14, 19]],
    [23, [2, 7, 12, 17]],
  ] as [number, number[]][]) {
    g.hline(1, y, 20, '3');
    for (const x of xs) g.vline(x, y - 2, 2, '3');
  }
  g.dots('3', 6, 13, 15, 13, 3, 17, 18, 17);
  // moss
  g.dots('G', 0, 17, 0, 18, 1, 24, 2, 25, 3, 25, 19, 13, 20, 14).dots('g', 1, 23, 20, 13).dots('p', 2, 24);
  // posts
  g.rect(2, 5, 2, 11, 'c').vline(3, 5, 11, 'w');
  g.rect(18, 5, 2, 11, 'w').vline(19, 5, 11, 'b');
  // axle with a coil of rope, and the crank
  g.hline(4, 8, 14, 'w').hline(4, 9, 14, 'b');
  g.stamp(['ekek', 'kckc'], 9, 8);
  g.dots('S', 20, 8, 21, 8, 21, 9).dots('D', 21, 10, 21, 11);
  // rope down to the bucket
  g.vline(11, 10, 2, 'e');
  g.stamp(['SDDDS', 'wkccw', 'wcccb', '.SSS.'], 9, 12);
  // roof: two shingle courses on a ridge, gable ends showing at the sides
  g.hline(3, 0, 16, 'b').hline(4, 0, 14, 'k');
  const courses: [number, number, string, string][] = [
    [1, 2, 'k', 'c'],
    [2, 1, 'c', 'w'],
    [3, 1, 'c', 'w'],
    [4, 0, 'w', 'b'],
  ];
  for (const [y, x0, a, b] of courses)
    for (let x = x0; x < 22 - x0; x++) g.set(x, y, (x + y * 2) % 4 === 0 ? b : x < 11 ? a : b === 'b' ? 'b' : 'w');
  g.dots('b', 1, 2, 20, 2, 1, 3, 20, 3).dots('L', 0, 4, 21, 4);
  g.hline(0, 5, 22, 'b').dots('L', 0, 5, 21, 5);
  return g.rows();
})();

// --- broken cart ---------------------------------------------------------------
// Tipped on its nose where a wheel snapped off (it lies in the grass in front),
// shafts broken, hay and a seed sack spilling out. Nobody came back for it.
const CART = (() => {
  const g = new Grid(30, 18);
  // bed seen from above: back wall, floor planks, front wall; the left end has
  // sagged down to the ground
  for (let x = 2; x <= 25; x++) {
    const sag = x < 10 ? Math.round((10 - x) * 0.35) : 0;
    const y = 2 + sag;
    g.set(x, y, 'w');
    g.rect(x, y + 1, 1, 5, x % 5 === 0 ? 'c' : 'k');
    g.set(x, y + 3, 'c');
    g.set(x, y + 6, 'k');
    g.rect(x, y + 7, 1, 3, 'c');
    g.set(x, y + 9, 'w');
    g.set(x, y + 10, 'b');
  }
  g.vline(2, 3, 10, 'w').vline(25, 2, 10, 'b').vline(24, 3, 5, 'w');
  for (const x of [8, 17]) g.vline(x, 2 + (x < 10 ? 1 : 0) + 7, 3, 'w');
  // spilled hay and a sack lolling out of the low end
  g.stamp(['.Yh..', 'YhhaY', 'hahh.'], 4, 5).stamp(['.Y.h', 'Yhah'], 13, 4);
  g.stamp(['.ke.', 'kekc', 'kkcw', 'kccw'], 0, 12);
  g.dots('h', 4, 15, 5, 16, 6, 15).dots('y', 5, 15);
  // the wheel that held
  g.ellipse(21.5, 12.5, 5.2, 5.2, 'b');
  g.ellipse(21.5, 12.5, 4.1, 4.1, 'w');
  g.ellipse(21.5, 12.5, 3.1, 3.1, '.');
  for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0], [-2, -2], [2, 2], [-2, 2], [2, -2]]) g.line(21, 12, 21 + dx, 12 + dy, 'w');
  g.rect(21, 12, 2, 2, 'S').dots('D', 21, 12).dots('c', 17, 10, 18, 9, 19, 8, 18, 10);
  // broken wheel flat in the grass with a gap in the rim
  g.ellipse(10.5, 16, 4.8, 1.6, 'b');
  g.ellipse(10.5, 16, 3.4, 0.6, '.');
  g.dots('w', 7, 15, 9, 14, 11, 14, 13, 15).dots('.', 15, 16, 15, 17).line(8, 16, 12, 16, 'w');
  // snapped shafts
  g.line(26, 7, 29, 5, 'w').line(26, 8, 29, 9, 'c').dots('e', 29, 4);
  return g.rows();
})();

// --- tool rack ----------------------------------------------------------------
// A plank board under a little shingle hood, with a pitchfork, spade and sickle
// hanging from pegs. Bright tool heads against dark boards so they read.
const TOOLRACK = (() => {
  const g = new Grid(18, 18);
  // board
  g.rect(1, 2, 16, 14, 'b');
  for (const x of [5, 9, 13]) g.vline(x, 3, 13, 'L');
  g.hline(1, 15, 16, 'L');
  // hood
  g.hline(1, 0, 16, 'w').hline(0, 1, 18, 'c').hline(0, 2, 18, 'w').dots('k', 2, 1, 3, 1, 4, 1, 9, 1, 10, 1);
  // legs
  g.rect(1, 16, 2, 2, 'w').rect(15, 16, 2, 2, 'b').vline(1, 2, 14, 'w').vline(16, 2, 14, 'L');
  // pegs
  g.dots('k', 4, 3, 9, 3, 13, 3);
  // pitchfork
  g.vline(4, 4, 8, 'c');
  g.stamp(['iFD', 'i.D', 'i.D', 'F.S'], 3, 11).dots('F', 4, 11);
  // spade with a D-grip
  g.stamp(['kck', 'k.c'], 8, 3).vline(9, 5, 5, 'c');
  g.stamp(['iFFD', 'iFFD', 'iFDD', '.FD.'], 8, 10);
  // sickle
  g.vline(13, 4, 3, 'w').dots('c', 13, 4);
  g.stamp(['.iiF', 'i..F', 'i...', 'iF..', '.F..'], 11, 7);
  g.dots('G', 0, 17, 17, 16, 17, 17).dots('g', 0, 16);
  return g.rows();
})();

export const LANDSCAPE: SpriteDef[] = [
  sprite('d_rock_l', WL, [ROCK_L], P),
  sprite('d_stump', WL, [STUMP], P),
  sprite('d_bush', WL, [BUSH], P),
  sprite('d_tree_oak', WL, [OAK], P),
  sprite('d_tree_dead', WL, [DEAD], P),
  sprite('d_wall_h', WL, [WALL_H], { outline: false, origin: [0.5, 1] }),
  sprite('d_wall_broken', WL, [WALL_BROKEN], { outline: false, origin: [0.5, 1] }),
  sprite('d_pillar', WL, [PILLAR], P),
  sprite('d_well', WL, [WELL], P),
  sprite('d_cart_broken', WL, [CART], P),
  sprite('d_toolrack', WL, [TOOLRACK], P),
];
