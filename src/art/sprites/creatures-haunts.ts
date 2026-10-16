// Haunts of the meadow: scarecrow husk, root stalker, harvest wraith.
import { sprite, type SpriteDef } from '../sprite';
import { compose, fit } from './creatures-kit';

// ---------------------------------------------------------------------------
// Scarecrow Husk: hostile ragged scarecrow on a pole, sack head, stitched
// grin, burning violet eyes. 14x24 drawn.
const HUSK = {
  e: 'peach', s: 'skin', y: 'clay', d: 'wood', b: 'bark', l: 'loam', u: 'umber',
  t: 'wheat', g: 'gold', a: 'amber',
  N: 'wine', n: 'maroon', q: 'plumdark', p: 'plum', m: 'mauve',
  v: 'violet', V: 'purple', o: 'orchid', B: 'blush', w: 'white', C: 'crimson',
} as const;

// Floppy wide-brim hat over a tied burlap sack; straw spills from under the
// brim. Eyes are burnt triangular holes with a violet ember in each.
const huskHead = fit([
  '..lbb.......',
  '...bddddb...',
  '...qpmmpq...',
  'lbbddddddbbl',
  'l.tesssssyt.',
  '..esssssssd.',
  '.esuuusuuuyd',
  '.essvosovsyd',
  '.esssssssyyd',
  '.esslslslsyd',
  '.elllllllllyd'.slice(0, 12),
  '..yslslslyd.',
], 12, 12, 'husk head');

const huskHeadBlaze = fit([
  '..lbb.......',
  '...bddddb...',
  '...qpmmpq...',
  'lbbddddddbbl',
  'l.tvssssvyt.',
  '..eossssosd.',
  '.esuuusuuuyd',
  '.essvwsowsyd',
  '.esssssssyyd',
  '.esluuuuulyd',
  '.elvoBBBovyd',
  '..yluuuulyd.',
], 12, 12, 'husk head blazing');

// Narrow torso so the sleeves read as arms tied along the crossbar.
const huskCoat = (droop: boolean) => fit([
  '.....bddb.....',
  '.NNNNNNNNnnnn.',
  droop ? 'tnnnNNNNnnnnnt' : 'gnnnNNNNnnnnng',
  droop ? 'gt..NNpmnn..tg' : 'tg..NNpmnn..gt',
  droop ? 't...NNmpnn...t' : '.t..NNmpnn..t.',
  '....NCNNnn....',
  '...NNNNNnnn...',
  droop ? '...n.NtdnNn...' : '...N.NtdnNn...',
], 14, 8, 'husk coat');

const huskPole = fit(['db', 'db', 'db', 'db', 'bl'], 2, 5, 'husk pole');

// Cast: arms snapped rigid, straw fingers splayed, violet fire in both hands.
const huskCoatCast = fit([
  'v............v',
  'ov..........vo',
  'Bo..........oB',
  'tgNNNbddbnnngt',
  'gNNNNNNNNnnnng',
  '.nnnNNNNnnnnn.',
  '....NNpmnn....',
  '....NNmpnn....',
  '....NCNNnn....',
  '...NNNNNnnn...',
  '..N..NtdnN.n..',
], 14, 11, 'husk coat cast');

const huskIdle = sprite('en_husk_idle', HUSK, [
  compose(14, 24, [huskPole, 6, 19], [huskCoat(false), 0, 12], [huskHead, 1, 0]),
  compose(14, 24, [huskPole, 6, 19], [huskCoat(true), 0, 12], [huskHead, 2, 1]),
], { outline: true, origin: [0.5, 1], fps: 3 });

const huskCast = sprite('en_husk_cast', HUSK, [
  compose(14, 24, [huskPole, 6, 19], [huskCoatCast, 0, 9], [huskHeadBlaze, 1, 0]),
], { outline: true, origin: [0.5, 1] });

// ---------------------------------------------------------------------------
// Root stalker: travels as a mound of corrupted soil with root tips poking
// out, then erupts as a gnarled root creature with a thorn-toothed maw.
const STALK = {
  u: 'umber', l: 'loam', b: 'bark', d: 'wood', y: 'clay', e: 'peach', c: 'cream',
  q: 'plumdark', p: 'plum', n: 'maroon', N: 'wine', m: 'mauve',
  h: 'hot', B: 'blush', w: 'white', r: 'rose',
} as const;

const moundBase = fit([
  '....qnlln...',
  '..lnbdbbnl..',
  '.lbddbbdbbl.',
  'lnbbdbbbbnql',
], 12, 4, 'mound');

const stalkerMound = sprite('en_stalker_mound', STALK, [
  compose(12, 6, [moundBase, 0, 2], [['..c.....e...', '..e..c..y.e.'], 0, 0], [['.b........b.'], 0, 5]),
  compose(12, 6, [moundBase, 0, 2], [['...c....e...', '..y..e...e..'], 0, 0], [['b..........b'], 0, 5]),
], { outline: true, origin: [0.5, 1], fps: 4 });

const emergeSoil = fit([
  '..l.nlln.b....',
  '.lnbbdbbnlbl..',
  'lbdbbbdbbbbnl.',
  'nbbdbbbbdbbbql',
], 14, 4, 'emerge soil');

// Gnarled knot of roots: curling tendril crown, three pinprick eyes, a maw
// ringed with thorn teeth, root arms. Drawn top-down so slices show the head first.
const stalkerBody = fit([
  '..b....d....',
  '.d.y..dy..b.',
  '..dyd.yd.dy.',
  '...dyyyydy..',
  '..dyyyyyddb.',
  '.dyhyyhydhb.',
  '.dyyyyyyddb.',
  'b.dcncncndb.',
  'ydqNhhhhNqby',
  'd.qhBBBhnqb.',
  '..dcncncnb..',
  '..byyddddb..',
  '...dydbdb...',
  '..dydbbdbb..',
], 12, 14, 'stalker body');

const stalkerEmerge = sprite('en_stalker_emerge', STALK, [
  compose(14, 18, [stalkerBody.slice(0, 6), 1, 9], [emergeSoil, 0, 14], [['c...........e.', '.y.........c..'], 0, 8]),
  compose(14, 18, [stalkerBody.slice(0, 11), 1, 4], [emergeSoil, 0, 14], [['e............c'], 0, 2]),
  compose(14, 18, [stalkerBody, 1, 1], [emergeSoil, 0, 14]),
], { outline: true, origin: [0.5, 1], fps: 8 });

// ---------------------------------------------------------------------------
// Harvest Wraith: ghostly wheat sheaf, hollow face, sickle hands, violet core.
const WRAITH = {
  w: 'white', i: 'ice', I: 'mist', f: 'fog', D: 'dusk', S: 'storm', k: 'night',
  v: 'violet', V: 'purple', o: 'orchid', B: 'blush', 6: 'pebble', 5: 'stone',
  t: 'wheat', g: 'gold', c: 'cream',
} as const;

// Three grain ears fan from a narrow neck, a small hollow mask, a binding
// band holding the violet core, stems fraying into a ghost tail, and two
// steel sickles held out at the sides.
const wraithBody = fit([
  '.....i.i......',
  '.i.i..w..i.i..',
  '..w..wcI..w...',
  '.wcI.cwf.wcI..',
  '.cwf.wcf.cwf..',
  '.wcf..f..wcf..',
  '..f.fIfIf.f...',
  '...fIwIIIf....',
  '...IkIIkIf....',
  '...IkIIkIf....',
  '...fIIkIff....',
  '....fIkIf.....',
  '...DSvBvSD....',
  '...fIoVIff....',
  '..fIfIfIfIf...',
  '..IfIfIfIfI...',
  '...fIfIfIf....',
], 14, 17, 'wraith body');

// Sickles: steel blade (white/pebble, stone edge) on a dusk handle.
const sickleL = fit(['.6..', '6...', '6...', '65..', '.5DD', '..DI'], 4, 6, 'sickle L');
const sickleR = fit(['..6.', '...6', '...6', '..56', 'DD5.', 'ID..'], 4, 6, 'sickle R');

const wraithTails = [
  ['...fIfIff.....', '....fIf.......', '...fI.........', '...f..........'],
  ['...fIfIff.....', '....fIIf......', '.....fIf......', '......f.......'],
  ['...fIfIff.....', '....fIIf......', '......fIf.....', '........f.....'],
];
const wraithArms = [
  [[sickleL, 0, 6], [sickleR, 10, 6]],
  [[sickleL, 0, 7], [sickleR, 10, 5]],
  [[sickleL, 0, 6], [sickleR, 10, 6]],
] as const;

const wraithFloat = sprite('en_wraith_float', WRAITH, wraithTails.map((tail, i) => {
  const dy = i === 1 ? 1 : 0;
  const [l, r] = wraithArms[i];
  return compose(14, 20, [wraithBody, 0, dy], [tail, 0, 16 + dy], [l[0], l[1], l[2] + dy], [r[0], r[1], r[2] + dy]);
}), { outline: true, origin: [0.5, 1], fps: 6 });

export const HAUNTS: SpriteDef[] = [huskIdle, huskCast, stalkerMound, stalkerEmerge, wraithFloat];
