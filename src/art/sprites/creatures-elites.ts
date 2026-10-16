// Elites and courtiers: bramble knight, taxman, orchard witch.
import { sprite, swapChars, type SpriteDef } from '../sprite';
import { compose, fit } from './creatures-kit';

// ---------------------------------------------------------------------------
// Bramble Knight: rusted armour overgrown with brambles, woven-thorn shield
// carried on its front (right) side, rusty sword in the back hand. 22x24.
const KNIGHT = {
  3: 'ash', 4: 'slate', 5: 'stone', 6: 'pebble', w: 'white', I: 'mist',
  r: 'rust', R: 'brick', x: 'blood', u: 'umber', l: 'loam', b: 'bark', d: 'wood', y: 'clay',
  P: 'pine', T: 'teal', F: 'moss', S: 'sprout', C: 'crimson', N: 'wine',
  p: 'plum', q: 'plumdark', h: 'hot', B: 'blush', M: 'magenta', c: 'cream', m: 'mauve', g: 'gold',
} as const;

// Great helm, 3/4 facing right: rust stains running down, a single visor slit
// with two embers, breathing holes, and a circlet of brambles round the brow.
const knightHelm = fit([
  '...445544...',
  '..45666654..',
  '.4566666654.',
  '.4566rR66554',
  '456666xR6554',
  '4566uuuuuuu4',
  '4566uhBuhBu4',
  '45666555554.',
  '4566u5u5u54.',
  '.4R65555544.',
  '..44x44444..',
], 12, 11, 'knight helm');

const knightCirclet = fit([
  '..C...C...C...',
  '.TPF.TPF.TPF..',
  'CPTPPTPPPTBBC.',
  '.TPTTPTTPTBgq.',
  '..T........pq.',
], 14, 5, 'knight circlet');

// Breastplate with a bramble vine wound diagonally across it.
const knightTorso = fit([
  '..34444443..',
  '.4566665544.',
  '4566F6665PT.',
  '456CPF66554.',
  '45RxTPF6554.',
  '45RRxTPF544.',
  '.45555CTPF..',
  '..433433TP..',
], 12, 8, 'knight torso');

// Woven-thorn round shield: twisted bark rope rim, a ring of green vine, a
// boss of blackberries, thorns bristling out. Generated so the weave is even.
function wovenShield(): string[] {
  const w = 10;
  const h = 12;
  const g = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  const cx = 5;
  const cy = 6;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx;
      const dy = (y + 0.5 - cy) * 0.92;
      const r = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const lit = dx + dy < -1.5;
      const seg = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 14);
      let c = '.';
      if (r < 4.9 && r >= 3.5) c = seg % 2 ? (lit ? 'y' : 'd') : lit ? 'd' : 'b';
      else if (r < 3.5 && r >= 2.1) c = (seg + 1) % 2 ? (lit ? 'F' : 'P') : 'T';
      else if (r < 2.1) c = r < 0.8 ? 'm' : lit ? 'p' : 'q';
      g[y][x] = c;
    }
  // Thorns.
  for (const [x, y] of [[0, 3], [9, 4], [1, 10], [8, 10], [4, 0], [9, 8]] as [number, number][]) g[y][x] = 'C';
  return g.map((r) => r.join(''));
}
const knightShield = wovenShield();

// Notched rusty broadsword dragged in the back hand, tip trailing (walk).
const knightSwordLow = fit([
  '..445.',
  '.45544',
  '..by4.',
  '.Rddb.',
  '..w5..',
  '..65..',
  '.w6R..',
  '.65...',
  '.6x...',
  'w65...',
  '65....',
  '6.....',
], 6, 12, 'sword low');

const knightLegs = [
  ['.4554..4554', '.4554..4554', '.3443..3443', '33443..34433'],
  ['..45544554.', '..45544554.', '..34433443.', '..3344.3443'],
  ['.4554..4554', '.4554..4554', '.3443..3443', '33443..34433'],
  ['..45544554.', '..45544554.', '..34433443.', '..3443.3344'],
];

const knightFrame = (i: number) => {
  const up = i % 2;
  return compose(22, 24,
    [knightSwordLow, 0, 12 - up],
    [knightLegs[i], 4, 20],
    [knightTorso, 4, 12 - up],
    [knightHelm, 5, 2 - up],
    [knightCirclet, 4, i === 1 ? 0 : 1 - up],
    [knightShield, 12, 10 - up],
  );
};

const knightWalk = sprite('en_knight_walk', KNIGHT, [0, 1, 2, 3].map(knightFrame), { outline: true, origin: [0.5, 1], fps: 6 });

// Swing: frame 0 sword hauled up overhead behind, frame 1 swept through in
// front with a pale arc.
const swordUp = fit([
  '65......',
  '565.....',
  '.R65....',
  '..565...',
  '...x65..',
  '....5yd.',
  '.....yb4',
  '.....445',
  '......44',
], 8, 9, 'sword up');

const swordSweep = fit([
  '..445.........',
  '.44by656566x6w',
  '..4.b.........',
], 14, 3, 'sword sweep');

// Pale crescent left by the blade.
const swoosh = fit([
  '..wwwww....',
  '.....IIww..',
  '.......Iww.',
  '........Iww',
  '.........Iw',
  '.........Iw',
  '........Iw.',
], 11, 7, 'swoosh');

const knightSwing = sprite('en_knight_swing', KNIGHT, [
  compose(22, 24, [swordUp, 0, 3], [knightLegs[0], 4, 20], [knightTorso, 4, 12], [knightHelm, 5, 2], [knightCirclet, 4, 1], [knightShield, 12, 10]),
  compose(22, 24, [knightLegs[0], 4, 20], [knightTorso, 5, 13], [knightShield, 1, 12], [knightHelm, 6, 3], [knightCirclet, 5, 2], [swoosh, 11, 9], [swordSweep, 8, 15]),
], { outline: true, origin: [0.5, 1], fps: 8 });

// ---------------------------------------------------------------------------
// Taxman: the King's tiny turnip courtier. Top hat, monocle, ledger. 10x12.
const TAX = {
  1: 'coal', 2: 'soot', 3: 'ash', q: 'plumdark', p: 'plum', m: 'mauve', M: 'magenta',
  c: 'cream', e: 'peach', w: 'white', s: 'skin', y: 'clay',
  F: 'moss', S: 'sprout', f: 'leaf', h: 'hot', g: 'gold', a: 'amber',
  R: 'brick', x: 'blood', b: 'bark', d: 'wood',
} as const;

// Top hat with a quill in the band, turnip greens peeking out behind, a gold
// monocle on the front eye, a smirk, and the red ledger under one arm.
const taxBody = fit([
  '...1221...',
  '...1221.c.',
  '...pmmp.c.',
  '..122221e.',
  '.FSpmmmmp.',
  '..pmmmgmpq',
  '.pmhmghgq.',
  '.pmmqqgaRx',
  '.ccccccRcx',
  '.eccccsRcx',
  '..ecsyyRxx',
], 10, 11, 'tax body');

const taxman = sprite('en_taxman_walk', TAX, [
  compose(10, 12, [taxBody, 0, 0], [['...y..s...'], 0, 11]),
  compose(10, 12, [taxBody, 0, 1], [['..y....s..'], 0, 11]),
], { outline: true, origin: [0.5, 1], fps: 6 });

// ---------------------------------------------------------------------------
// Orchard Witch: apple-wood crone in a leafy shawl, glowing core-lantern. 14x24.
const WITCH = {
  u: 'umber', l: 'loam', b: 'bark', d: 'wood', y: 'clay', s: 'skin',
  P: 'pine', F: 'moss', f: 'leaf', S: 'sprout',
  C: 'crimson', r: 'red', N: 'wine', n: 'maroon', q: 'plumdark', p: 'plum',
  h: 'hot', M: 'magenta', B: 'blush', w: 'white', o: 'orchid', c: 'cream',
} as const;

// Crooked bark hat with an apple on the band, apple-wood face with a hooked
// nose and one snaggle tooth, twig hair, leafy shawl studded with apples,
// ragged plum robe, root toes.
const witchBody = fit([
  'bb............',
  '.bd...........',
  '..bdb.........',
  '..bddb........',
  '...bddb.......',
  '...bdddb......',
  '..bddddbb.....',
  '..bdrCddbb....',
  'ldddbbbbbbbl..',
  '.l.dsssyyd....',
  '.lbshsshyyyy..',
  '.l.dysyyyddb..',
  '..dyucuuyd....',
  '.PfFbddbfFP...',
  'PfSfFfPFfSfP..',
  'PFrwfFPfFrwFP.',
  '.PFfFPfPFfP...',
  '..qppppppq....',
  '..qppnppppq...',
  '.qppppnpppq...',
  '.qpnppppnppq..',
  'qqppnpppnpqq..',
  'q.qp.qp.qpq...',
], 14, 23, 'witch body');

// Dark bark hat over a paler apple-wood face, so the hooked nose reads.
const witchPainted = [
  ...swapChars(witchBody.slice(0, 9), { b: 'l', d: 'b', l: 'u' }),
  ...witchBody.slice(9, 13),
  ...witchBody.slice(13),
];
const witchFeet = ['..bl..bl......'];

// Hollowed apple lantern on a twig, carved windows glowing.
const witchLantern = [
  fit(['.bb.', '..bf', 'CrrC', 'rBwr', 'CMBC', '.CC.'], 4, 6, 'lantern a'),
  fit(['.bb.', '..bf', 'CrrC', 'rhBr', 'CBMC', '.CC.'], 4, 6, 'lantern b'),
];
const witchHand = ['dd.', '.dd'];

const witchIdle = sprite('en_witch_idle', WITCH, [
  compose(14, 24, [witchPainted, 0, 0], [witchFeet, 0, 23], [witchLantern[0], 10, 12], [witchHand, 8, 14]),
  compose(14, 24, [witchPainted.slice(13), 0, 13], [witchPainted.slice(0, 13), 0, 1], [witchFeet, 0, 23], [witchLantern[1], 10, 13], [witchHand, 8, 15]),
], { outline: true, origin: [0.5, 1], fps: 3 });

export const ELITES: SpriteDef[] = [knightWalk, knightSwing, taxman, witchIdle];
