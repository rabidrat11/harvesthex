// Small Blighted Meadow pests: nibbler, mudling, sporeling, sporelet.
import { sprite, type SpriteDef } from '../sprite';
import { compose, fit } from './creatures-kit';

// ---------------------------------------------------------------------------
// Nibbler: husk-furred vole, seed-pod ears, beady hot-pink eyes. 10x8 drawn.
const NIB = {
  l: 'loam', b: 'bark', d: 'wood', y: 'clay', t: 'wheat', c: 'cream', e: 'peach',
  q: 'plumdark', p: 'plum', m: 'mauve', M: 'magenta', h: 'hot', r: 'rose', n: 'wine',
} as const;

// Round husk-furred loaf, head on the right, two plum seed-pod ears swept
// back (lit edge magenta), beady hot-pink eye, buck tooth. 11x9 drawn.
const nibBody = fit([
  '...m..M....',
  '..pmq.Mm...',
  '..qpttpm...',
  '..ttttttte.',
  '.tttyytthy.',
  'tyyyyyyneyr',
  'dyyydyyyc..',
], 11, 7, 'nib body');

const nibbler = sprite('en_nibbler_walk', NIB, [
  compose(11, 9, [nibBody, 0, 0], [['.bd...bd..', 'b.......b.'], 0, 7], [['b'], 0, 4]),
  compose(11, 9, [nibBody, 0, 1], [['..bd.bd...'], 0, 8], [['b.', '.b'], 0, 3]),
  compose(11, 9, [nibBody, 0, 0], [['.bd...db..', '.b.....b..'], 0, 7], [['b'], 0, 3]),
], { outline: true, origin: [0.5, 1], fps: 12 });

// ---------------------------------------------------------------------------
// Mudling: slow lump of wet mud and pebbles, weed on its head, violet eyes. 14x14.
const MUD = {
  u: 'umber', l: 'loam', b: 'bark', d: 'wood', y: 'clay', e: 'peach',
  4: 'slate', 5: 'stone', 6: 'pebble',
  S: 'sprout', f: 'leaf', F: 'moss', M: 'magenta', m: 'mauve',
  v: 'violet', o: 'orchid', V: 'purple', B: 'blush',
} as const;

const mudBody = fit([
  '.....lbbbl....',
  '...lbddddbbl..',
  '..lbdyyddddbl.',
  '.lbdyeddddddbl',
  '.bd65ddBvddBvl',
  'lbd54ddvVddvVl',
  'lbddyddduuudbl',
  'lbbdddduddduby',
  '.lbbbbbbbbbbl.',
], 14, 9, 'mud body');

const mudWeed = {
  up: ['...Mm.', 'S..F..', 'fS.F.S', '.fSFSf', '...F..'],
  back: ['Mm....', '.F..S.', 'S.F.Sf', 'fSFSf.', '...F..'],
  fwd: ['....mM', 'S...F.', 'fS.F.S', '.fSFf.', '...F..'],
};

const mudling = sprite('en_mudling_walk', MUD, [
  compose(14, 14, [mudWeed.up, 3, 0], [mudBody, 0, 4], [['.ll.....ll....'], 0, 13]),
  compose(14, 14, [mudWeed.back, 3, 0], [mudBody, 0, 3], [['.ll.....ll....', '.........ll...'], 0, 12]),
  compose(14, 14, [mudWeed.fwd, 3, 1], [mudBody, 0, 5]),
  compose(14, 14, [mudWeed.back, 3, 0], [mudBody, 0, 3], [['.ll.....ll....', '.ll...........'], 0, 12]),
], { outline: true, origin: [0.5, 1], fps: 6 });

// ---------------------------------------------------------------------------
// Sporeling: waddling plum toadstool. 12x12 drawn. Splits into sporelets.
const SPORE = {
  q: 'plumdark', p: 'plum', m: 'mauve', M: 'magenta', c: 'cream', B: 'blush',
  w: 'white', e: 'peach', s: 'skin', y: 'clay', n: 'maroon', h: 'hot', l: 'loam',
} as const;

const sporeCap = fit([
  '...ppppp..',
  '.pmmccmpp.',
  'pmccmmppcp',
  'pmmmmppcpq',
  'qpcppppqqq',
  '.nnnnnnnn.',
], 10, 6, 'spore cap');

const sporeStem = fit([
  '.essss.',
  '.chehs.',
  '.ceqes.',
  '..ces..',
], 7, 4, 'spore stem');

const sporeling = sprite('en_sporeling_walk', SPORE, [
  compose(12, 12, [sporeStem, 2, 6], [sporeCap, 0, 1], [['.yy..ss'], 2, 11]),
  compose(12, 12, [sporeStem, 3, 6], [sporeCap, 2, 1], [['ss..yy.'], 3, 11]),
], { outline: true, origin: [0.5, 1], fps: 4 });

// ---------------------------------------------------------------------------
// Sporelet: tiny sporeling. 6x6 drawn.
const sporelet = sprite('en_sporelet_walk', SPORE, [
  ['.pmmp.', 'pmcppq', 'qnnnnq', '.chch.', '.ceey.', '.y..s.'],
  ['.pmmp.', 'pmcppq', 'qnnnnq', '.chch.', '.ceey.', '..ys..'],
], { outline: true, origin: [0.5, 1], fps: 6 });

export const PESTS: SpriteDef[] = [nibbler, mudling, sporeling, sporelet];
