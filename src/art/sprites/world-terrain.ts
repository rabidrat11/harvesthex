// Terrain tiles: 16x16, no outline, seamless. Every variant of a tile shares
// the same edge pixels (features that cross an edge live in a shared base and
// are stamped with wrap-around) so the engine can scatter variants freely.
// Contrast is kept deliberately low: this is the floor of a bullet-hell.
import { sprite, type SpriteDef } from '../sprite';
import { Grid, WL, tileSheet } from './world-kit';

type Mark = [rows: string[], x: number, y: number];

function tile(fill: string, own: Mark[], shared: Mark[] = []): string[] {
  const g = new Grid(16, 16, fill);
  for (const [r, x, y] of shared) g.stampWrap(r, x, y);
  for (const [r, x, y] of own) g.stamp(r, x, y);
  return g.rows();
}

/** Grass-like tuft shapes in a dark tone `d`. */
function tufts(d: string) {
  return {
    fan: [`${d}..${d}`, `.${d}.${d}`, `.${d}${d}.`],
    pair: [`${d}.${d}`, `${d}.${d}`, `.${d}.`],
    nub: [`.${d}`, `${d}${d}`],
  };
}

// --- farm grass ------------------------------------------------------------
// Moss green with pine tufts and the odd sunlit leaf-green blade. Variant 0 is
// the calm workhorse; 3 has a daisy and should be scattered sparingly.
const gt = tufts('p');
const LIT = ['g'];
const LIT2 = ['g.', '.g'];
const DAISY = ['.C.', 'CyC', '.C.'];

const GRASS: string[][] = [
  tile('G', [[gt.fan, 2, 2], [gt.nub, 11, 9], [LIT, 12, 3], [LIT, 5, 12]]),
  tile('G', [[gt.pair, 9, 2], [gt.fan, 3, 10], [gt.nub, 12, 12], [LIT2, 4, 4]]),
  tile('G', [[gt.nub, 4, 4], [gt.pair, 11, 7], [LIT, 2, 11], [gt.nub, 7, 12]]),
  tile('G', [[gt.fan, 10, 2], [DAISY, 4, 8], [['p'], 5, 11], [gt.nub, 11, 12], [LIT, 2, 3]]),
];

// --- blighted meadow -------------------------------------------------------
// Yellowed grass: green tufts dying back into dry clay-brown ones on a wheat
// ground, bleached tips, the odd fleck of rot.
const mt = tufts('c');
const BLEACH = ['e'];
const DYING = ['G..c', '.G.c', '.Gc.'];
const LAST = ['G.G', 'GpG', '.p.'];
const ROT = ['.b', 'b.'];

const MEADOW: string[][] = [
  tile('h', [[DYING, 2, 2], [mt.nub, 11, 9], [BLEACH, 12, 3], [BLEACH, 6, 12]]),
  tile('h', [[mt.pair, 9, 2], [LAST, 3, 9], [mt.nub, 12, 12], [BLEACH, 2, 3]]),
  tile('h', [[mt.fan, 10, 3], [['.G', 'GG'], 3, 5], [mt.pair, 6, 11], [BLEACH, 13, 13]]),
  tile('h', [[DYING, 10, 9], [ROT, 4, 4], [mt.nub, 2, 11], [BLEACH, 12, 2]]),
];

// --- path dirt -------------------------------------------------------------
// Packed clay with a few rounded pebbles (lit top-left, shadowed below).
const PEBBLE = ['.e.', 'ekc', '.w.'];
const PEB_S = ['k', 'w'];
const SPECK = ['w'];
const LIGHT = ['kk'];

const DIRT: string[][] = [
  tile('c', [[PEB_S, 3, 4], [SPECK, 11, 3], [SPECK, 13, 11], [LIGHT, 6, 12]]),
  tile('c', [[PEBBLE, 9, 7], [SPECK, 3, 3], [PEB_S, 4, 11], [SPECK, 13, 13]]),
  tile('c', [[SPECK, 4, 2], [LIGHT, 10, 4], [PEB_S, 12, 9], [SPECK, 7, 12], [SPECK, 2, 9]]),
];

// --- tilled soil -----------------------------------------------------------
// One raised bed per tile, sitting in a 1px ring of path dirt so neighbouring
// plots read as separate beds. Lit top/left lip, shadowed right side and front
// face, wavy furrows.
const SOIL = [
  'cccccccccccccccc',
  'cckkkkkkkkkkkkcc',
  'ckwwwwwwwwwwwwbc',
  'ckwbbwwwbbwwwbbc',
  'cbbwwbbbwwbbbwbc',
  'ckwwwwwwwwwwwwbc',
  'ckwwbbwwwbbwwwbc',
  'cbbbwwbbbwwbbbbc',
  'ckwwwwwwwwwwwwbc',
  'ckwbbwwwbbwwwbbc',
  'cbbwwbbbwwbbbwbc',
  'ckwwwwwwwwwwwwbc',
  'ckwwwwwwwwwwwwbc',
  'cbbbbbbbbbbbbbbc',
  'ccLLLLLLLLLLLLcc',
  'cccccccccccccccc',
];
// Dry gets a couple of pale clods; wet is the same bed a shade darker (the
// dirt ring stays dry) with a damp sheen and two beads of standing water.
const SOIL_DRY = Grid.of(SOIL).dots('k', 6, 5, 11, 11).dots('c', 7, 5, 12, 11).rows();
const SOIL_WET = Grid.of(SOIL)
  .swap({ w: 'b', k: 'w', b: 'L', L: 'u' }, 1, 1, 14, 14)
  .dots('w', 5, 5, 10, 11)
  .dots('S', 4, 8, 11, 2)
  .dots('D', 5, 8, 12, 2, 8, 11)
  .rows();

// --- corrupted soil ----------------------------------------------------------
// Plum earth mottled with maroon. Pale roots surface and dive back under
// (dark holes at each end), so no vein has to cross a tile edge.
const CORRUPT: string[][] = [
  [
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPZZZPPPPPPPPP',
    'PPPZZZZZPPPPPPPP',
    'PPPPZZZZPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPQjPPPP',
    'PPPPPPPPPPPMjjPP',
    'PPPPPPPPPPPPMMQP',
    'PPPPPPPPPPPPPPPP',
    'PPPMPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
  ],
  [
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPQPPPPP',
    'PPPPPPPPPjMPPPPP',
    'PPPPPPPPjMPPPPPP',
    'PPPPPPPPMPPPPPPP',
    'PPPPPPPjMPPPPPPP',
    'PPPPPPPMPPPPPPPP',
    'PPPPPPjMMjPPPPPP',
    'PPPPPjMPPMPPPPPP',
    'PPPPPQPPPPQPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPZZZPP',
    'PPPPPPPPPPZZZZZP',
    'PPMPPPPPPPPZZZPP',
    'PPPPPPPPPPPPPPPP',
  ],
];

// --- pond water ------------------------------------------------------------
// Short ripple arcs that drift a pixel between frames; one glint.
const WATER: string[][] = [
  tile('U', [[['.KK', 'K..'], 2, 3], [['KKK.', '...I'], 9, 8], [['.KK'], 4, 13]]),
  tile('U', [[['..KK', '.K..'], 2, 3], [['.KKK'], 9, 8], [['KK', '..'], 5, 13], [['I'], 3, 3]]),
];

// --- old flagstones --------------------------------------------------------
// Irregular stones whose seams wrap across tile edges (a stone may straddle two
// tiles), moss creeping along the joints. Only the top edge of each stone is
// lit, and only partly, to keep the floor calm.
const SEAMS = [
  '......#......#..',
  '......#......#..',
  '......#......#..',
  '......#......#..',
  '......#......#..',
  '#########....#..',
  '#.#.....########',
  '..#.........#...',
  '..#.........#...',
  '..#.........#...',
  '..#.........#...',
  '..#.........#...',
  '..#.........#...',
  '..#.........#...',
  '#.#..###########',
  '#######......#..',
];
const FLAG_MOSS: [number, number, string][] = [
  [6, 2, 'p'], [6, 3, 'G'], [5, 3, 'G'], [10, 6, 'p'], [11, 6, 'G'], [8, 14, 'p'], [9, 14, 'G'],
];
function flag(own: Mark[]): string[] {
  const seam = (x: number, y: number) => SEAMS[(y + 16) % 16][(x + 16) % 16] === '#';
  const g = new Grid(16, 16, '4');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (seam(x, y)) g.set(x, y, '3');
      // lit top edge, only along the first few pixels of each stone
      else if (seam(x, y - 1) && [1, 2].some((d) => seam(x - d, y))) g.set(x, y, '5');
    }
  for (const [x, y, ch] of FLAG_MOSS) g.set(x, y, ch);
  for (const [r, x, y] of own) g.stamp(r, x, y);
  return g.rows();
}
const FLAG: string[][] = [
  flag([[['3', '.3'], 9, 2], [['3.', '.3'], 6, 10]]),
  flag([[['.3', '3.'], 9, 9], [['G'], 2, 7], [['3.', '.3'], 1, 1]]),
];

// --- the Marrow King's royal patch -----------------------------------------
// Dark loam laid out like a rotting carpet: a bark-line diamond lattice that
// wraps edge to edge, a four-leaf rot rosette in each diamond, and dull gilt
// studs where the lattice crosses.
function royal(centre: string[]): string[] {
  const g = new Grid(16, 16, 'L');
  for (let i = 0; i < 16; i++) {
    g.set((i + 8) % 16, i, 'b');
    g.set((24 - i) % 16, i, 'b');
  }
  g.dots('w', 8, 0, 0, 8);
  g.stampWrap(['.b.', 'bZb', '.b.'], 15, 15);
  g.stamp(centre, 8 - Math.floor(centre[0].length / 2), 8 - Math.floor(centre.length / 2));
  return g.rows();
}
const ROYAL: string[][] = [
  royal(['...Z...', '..ZbZ..', '.Z.b.Z.', 'ZbbEbbZ', '.Z.b.Z.', '..ZbZ..', '...Z...']),
  royal(['.......', '..ZZ...', '.ZEbZ..', '..Zbbw.', '...Zw..', '....w..', '.......']),
];

const T = { outline: false } as const;

export const TERRAIN: SpriteDef[] = [
  sprite('t_grass', WL, GRASS, T),
  sprite('t_meadow', WL, MEADOW, T),
  sprite('t_dirt', WL, DIRT, T),
  sprite('t_soil_dry', WL, [SOIL_DRY], T),
  sprite('t_soil_wet', WL, [SOIL_WET], T),
  sprite('t_corrupt', WL, CORRUPT, T),
  sprite('t_water', WL, WATER, { ...T, fps: 2 }),
  sprite('t_flagstone', WL, FLAG, T),
  sprite('t_royal', WL, ROYAL, T),
];

// Preview only: 4x4 sheets of scattered variants to check seams.
const scatter = (x: number, y: number) => (x * 7 + y * 3 + ((x * y) % 3)) % 4;
export const TERRAIN_PREVIEW: SpriteDef[] = TERRAIN.map((d) =>
  sprite(`preview_${d.name}`, WL, [tileSheet(d.frames, 4, 4, scatter)], T),
);
