// Mid-size meadow beasts: blight moth, bristlehog.
import { sprite, type SpriteDef } from '../sprite';
import { compose, fit, mirror } from './creatures-kit';

// ---------------------------------------------------------------------------
// Blight moth: sickly mustard-green wings with eye spots, powdery body. Seen
// from the front (it flies at you), drawn as a left half and mirrored.
const MOTH = {
  L: 'lime', S: 'sprout', g: 'gold', t: 'wheat', a: 'amber', F: 'moss', P: 'pine', T: 'teal',
  M: 'magenta', q: 'plumdark', B: 'blush', h: 'hot',
  p: 'plum', m: 'mauve', c: 'cream', e: 'peach', y: 'clay',
} as const;

// Left half; column 7 is the centre line.
const mothBody = fit([
  'yy..',
  '.ty.',
  '..pm',
  '..hp',
  '.cee',
  '.ece',
  '..pm',
  '..mp',
  '..pm',
  '...p',
], 4, 10, 'moth body');

const mothWing = {
  up: fit([
    'tg....',
    'tLLg..',
    '.tLMMF',
    '.tMqBF',
    '..FMFF',
    '...PFF',
    '...tFP',
    '..tFFP',
    '...tP.',
  ], 6, 9, 'wing up'),
  mid: fit([
    'tg....',
    'gLLgF.',
    'tLMMFF',
    'tMqBFF',
    '.FMFFP',
    '..PtFP',
    '.tLFFP',
    '..tFP.',
    '...t..',
  ], 6, 9, 'wing mid'),
  down: fit([
    '....FF',
    '..gLFF',
    '.tLMMF',
    'tLMqBF',
    'tFFMFP',
    'gFFPP.',
    '.tFFP.',
    '..tP..',
  ], 6, 8, 'wing down'),
};

const mothHalf = (wing: string[], wy: number, by: number) =>
  mirror(compose(8, 12, [wing, 0, wy], [mothBody, 4, by]), 'odd');

const moth = sprite('en_moth_fly', MOTH, [
  mothHalf(mothWing.up, 0, 2),
  mothHalf(mothWing.mid, 2, 1),
  mothHalf(mothWing.down, 4, 0),
], { outline: true, origin: [0.5, 1], fps: 10 });

// ---------------------------------------------------------------------------
// Bristlehog: boar-hedgehog with a thatch of thistle bristles and tusks.
const HOG = {
  u: 'umber', l: 'loam', b: 'bark', d: 'wood', y: 'clay', e: 'peach', s: 'skin',
  c: 'cream', w: 'white', n: 'wine',
  F: 'moss', P: 'pine', T: 'teal', S: 'sprout', L: 'lime',
  M: 'magenta', m: 'mauve', o: 'orchid', h: 'hot', B: 'blush', r: 'rose', R: 'salmon',
} as const;

// Spines are painted from a silhouette mask: diagonal stripes run along the
// spine direction (up and back), lighter on top where the light hits.
function spines(mask: string[]): string[] {
  const bands = [['F', 'S', 'S', 'L'], ['P', 'F', 'S', 'S'], ['T', 'F', 'F', 'P'], ['T', 'P', 'P', 'T']];
  return mask.map((r, y) => [...r].map((c, x) => {
    if (c === '.') return '.';
    if (c !== 'x') return c;
    const band = bands[Math.min(bands.length - 1, Math.floor((y * 4) / mask.length))];
    return band[(((x - y) % 4) + 4) % 4];
  }).join(''));
}

// Thistle head: green bulb with a magenta tuft.
const thistle = ['oM.', 'MmM', '.F.'];

const hogMask = {
  walk: [
    '.x...x...x....',
    '.xx..xx..xx...',
    'xxxxxxxxxxxxx.',
    'xxxxxxxxxxxxx.',
    'xxxxxxxxxxxxx.',
    '.xxxxxxxxxxx..',
    '..xxxxxxxxx...',
  ],
  raised: [
    'x...x...x.....',
    'xx..xx..xx..x.',
    'xxx.xxx.xxx.xx',
    'xxxxxxxxxxxxx.',
    'xxxxxxxxxxxxx.',
    'xxxxxxxxxxxxx.',
    '.xxxxxxxxxxx..',
    '..xxxxxxxxx...',
  ],
  flat: [
    'xxx...xxx.....',
    '.xxxxx.xxxxx..',
    'xxxxxxxxxxxxx.',
    'xxxxxxxxxxxxx.',
    '.xxxxxxxxxxx..',
    '..xxxxxxxxx...',
  ],
};

const hogHead = fit([
  '.bb....',
  'bddb...',
  'bdyddb.',
  'bdyhdbb',
  'bddddRr',
  'lbddbrn',
  'lbbbcw.',
  '.lll...',
], 7, 8, 'hog head');

const hogHeadBlaze = fit([
  '.bb....',
  'bddb...',
  'bdyldb.',
  'bdhBhbb',
  'bddhdRr',
  'lbddbrn',
  'lbbbcw.',
  '.lll...',
], 7, 8, 'hog head blazing');

const hogBelly = fit([
  '..bdbbdbbdbbd',
  '..lbbbbbbbbbb',
  '...llllllllll',
], 13, 3, 'hog belly');

const hogSpines = (mask: string[]) => spines(mask);

const hogBody = compose(18, 10,
  [hogBelly, 0, 6], [hogSpines(hogMask.walk), 0, 0], [thistle, 3, 0], [thistle, 8, 0], [hogHead, 11, 1]);

const bristlehogWalk = sprite('en_bristlehog_walk', HOG, [
  compose(18, 12, [hogBody, 0, 0], [['..ll.ll...ll.ll...', '..u...u....u...u..'], 0, 10]),
  compose(18, 12, [hogBody, 0, 1], [['...lu.ul...lu.ul..'], 0, 11]),
], { outline: true, origin: [0.5, 1], fps: 6 });

// Windup: crouched low, rump up, spines bristling, eyes blazing.
const bristlehogWindup = sprite('en_bristlehog_windup', HOG, [
  compose(18, 12,
    [hogBelly, 0, 8], [hogSpines(hogMask.raised), 0, 1], [thistle, 2, 0], [thistle, 8, 0], [hogHeadBlaze, 11, 3],
    [['.lu.lu.....lu..lu.'], 0, 11]),
], { outline: true, origin: [0.5, 1] });

// Charge: head down, spines swept flat, legs a blur, dust kicked up behind.
const hogChargeLegs = [
  ['..dbl.lbd..dbl.lbd', '.ud.....ud.....u..'],
  ['.lbd..dbl..lbd..db', '...ud.....u.....ud'],
];
const bristlehogCharge = sprite('en_bristlehog_charge', HOG, hogChargeLegs.map((legs, i) =>
  compose(18, 12,
    [hogBelly, 1, 7], [hogSpines(hogMask.flat), 0, 3], [thistle, i ? 1 : 2, 2], [thistle, 7, 2], [hogHeadBlaze, 11, 3],
    [legs, 0, 10],
    [i ? ['e.', '.c'] : ['.c', 'e.'], 0, i ? 8 : 9]),
), { outline: true, origin: [0.5, 1], fps: 14 });

export const BEASTS: SpriteDef[] = [moth, bristlehogWalk, bristlehogWindup, bristlehogCharge];
