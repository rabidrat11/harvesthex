// Decor props: outlined, origin bottom-centre. Small things first; the
// bigger landscape pieces (trees, walls, well, cart) follow.
import { sprite, swapChars, type SpriteDef } from '../sprite';
import { WL, art } from './world-kit';

const P: Partial<SpriteDef> = { outline: true, origin: [0.5, 1] };

// --- ground clutter ----------------------------------------------------------

const TUFT = [
  art('tuft0', 6, [
    's..g..',
    'g.sG.g',
    'GgGGgG',
    '.pGGp.',
  ]),
  art('tuft1', 6, [
    '..s.g.',
    '.sg.G.',
    'sgGgGg',
    '.GGpG.',
  ]),
  // a dry one for the meadow
  art('tuft2', 6, [
    'Y...h.',
    'h.Yah.',
    'ahhaha',
    '.caac.',
  ]),
];

const FLOWER = [
  // ox-eye daisy
  art('flower0', 5, [
    '..W..',
    '.WyC.',
    '..Cg.',
    '.gG..',
    '..G..',
  ]),
  // buttercup
  art('flower1', 5, [
    '.Y.Y.',
    '.yay.',
    '..G..',
    '.gG..',
    '..Gg.',
  ]),
  // cornflower
  art('flower2', 5, [
    '.K.K.',
    'KxIxK',
    '.KxK.',
    '..G..',
    '.gG..',
  ]),
  // red clover
  art('flower3', 5, [
    '.jO..',
    'ORO..',
    '.RRg.',
    '..Gg.',
    '.gG..',
  ]),
];

const BLIGHTFLOWER = [
  // a drooping bell whose mouth glows like a downcast eye, dripping
  art('blight0', 9, [
    '..pppt...',
    '.p....t..',
    '.p...ZPZ.',
    'Gp..ZPMPZ',
    'Gp..ZPMPZ',
    '.pG.ZQHQZ',
    '..p...z..',
    '.pG......',
    '.p.......',
    '..p......',
  ]),
  // a thistle that looks back at you
  art('blight1', 9, [
    '.M..M..M.',
    '..MPPPM..',
    '.MPjHjPM.',
    '..MPPPM..',
    '...QtQ...',
    '....t....',
    '...t.p...',
    '..pt.pG..',
    '...t.....',
    '....t....',
  ]),
];

const ROCK_S = art('rock_s', 8, [
  '..55gG..',
  '.5555G4.',
  '54444443',
  '44444433',
  '34444332',
  '.333322.',
]);

// three field mushrooms of different ages
const MUSHROOMS = art('mushrooms', 10, [
  '.kek......',
  'kekkc..kc.',
  'wwwww.kekc',
  '.Ce....ww.',
  '.Ce....Ce.',
  '.Ce.ek.Ce.',
  '.Ce..C.Ce.',
]);

const BONES = art('bones', 10, [
  '.CCe......',
  'CbCCk.e..e',
  'CCkkk.CeeC',
  '.kw.k.e..e',
]);

// --- farm clutter --------------------------------------------------------------

const BARREL = art('barrel', 12, [
  '..wwwwwwww..',
  '.wkkkkkkkkw.',
  'wkekkkkckkcw',
  'wckkkkkkcccw',
  'bwwwwwwwwwwb',
  'SDDDDDDDDDDS',
  'ckcwkcwckcwb',
  'ckcwkcwckcwb',
  'ckcwkcwckcwb',
  'ckcwkcwckcwb',
  'SDDDDDDDDDSS',
  'ckcwkcwckcwb',
  '.kcwkcwckcb.',
  '..bbbbbbbb..',
]);

// a braced crate of this year's turnips, leaves poking out
const CRATE = art('crate', 12, [
  '...gG...sg..',
  '...Gg...gG..',
  'wwwPMwwwPMww',
  'LPMPPCLPMPCL',
  'kkkkkkkkkkkc',
  'kccccccckcwb',
  'kcccccckwcwb',
  'kwwwwwkwwwwb',
  'kccckwccccwb',
  'kcckwcccccwb',
  'kckwccccccwb',
  'bbbbbbbbbbbb',
]);

const SACK = art('sack', 10, [
  '...k.e....',
  '..kek.ck..',
  '...wwbw...',
  '...kcwc...',
  '..kkkkcc..',
  '.kekkkkcc.',
  'kekkkkkkcw',
  'kkkkUUkkcw',
  'kkkkUnkkcw',
  'kkkkkkkccw',
  '.kkkkkkccw',
  '..cccccwwy',
]);

const HAYBALE = art('haybale', 18, [
  '..Y.h...Y....h....',
  '.YYYYbYYYYYYbYYYY.',
  'YYyYYbYYyYYYbYyYYa',
  'yyYyybyyyyYybyyyya',
  'hhhhhbhhhhhhbhhhha',
  'hahhwbahhahhwbhhar',
  'hhrhwbhhrhhhwbrhar',
  'hahhwbhahhahwbhhar',
  'hhhrwbhhhrhhwbhrar',
  'hahhwbahhhahwbhhar',
  'rhhhwbhhrhhhwbhhrr',
  '.r.rrbrr.rrrwbr.r.',
]);

// --- lantern, sign, fence -------------------------------------------------

const LANTERN_ON = art('lantern', 8, [
  '...NN...',
  '..NSSN..',
  '.NSDDSN.',
  'NSSSSSSN',
  '.NayyaN.',
  '.NyWYyN.',
  '.NyYYyN.',
  '.NayyaN.',
  '.NSSSSN.',
  '..NwcN..',
  '...wc...',
  '...wc...',
  '..gwc...',
  '...wcG..',
  '...wcg..',
  '..Gwc...',
  '..gbc...',
  '...wc...',
  '...wc...',
  '...wc...',
  '..bwcb..',
  '.bwwccb.',
]);
const LANTERN_DIM = swapChars(LANTERN_ON, { W: 'Y', Y: 'y', y: 'a' });

const SIGNPOST = art('signpost', 14, [
  '......Gc......',
  '......kc......',
  '.kkkkkkkkkk...',
  '.kbbkbbkbkkk..',
  '.kkkkkkkkkkkc.',
  '.ccccccccccw..',
  '......wc......',
  '......wc......',
  '...kkkkkkkkkk.',
  '..kkbkbbkbbkk.',
  '.ckkkkkkkkkkc.',
  '..wccccccccww.',
  '......wc......',
  '......wc......',
  '......wc......',
  '......bc......',
  '.....bwcb.....',
  '....GbwccG....',
]);

// d_fence_h tiles horizontally, so it is inked by hand: the rails run off both
// edges with no outline cap. Post in front, rails behind.
const FENCE_H = art('fence_h', 16, [
  '..###...........',
  '.#eGc#..........',
  '##kcw###########',
  'c#kcw#cccckccccc',
  'w#kcw#wwwwwwbwww',
  '##kcw###########',
  '.#kbw#..........',
  '##kcw###########',
  'c#kcw#ccccccckcc',
  'w#kcw#wwbwwwwwww',
  '##kcw###########',
  '..###...........',
]);

const FENCE_POST = art('fence_post', 4, [
  'ekkc',
  'kccw',
  'kccw',
  'kSDw',
  'kccw',
  'kcbw',
  'kccw',
  'kccw',
  'kSDw',
  'kccw',
  'Gccw',
  'gGcw',
]);

export const PROPS_SMALL: SpriteDef[] = [
  sprite('d_tuft', WL, TUFT, P),
  sprite('d_flower', WL, FLOWER, P),
  sprite('d_blightflower', WL, BLIGHTFLOWER, P),
  sprite('d_rock_s', WL, [ROCK_S], P),
  sprite('d_mushrooms', WL, [MUSHROOMS], P),
  sprite('d_bones', WL, [BONES], P),
  sprite('d_barrel', WL, [BARREL], P),
  sprite('d_crate', WL, [CRATE], P),
  sprite('d_sack', WL, [SACK], P),
  sprite('d_haybale', WL, [HAYBALE], P),
  sprite('d_lantern', WL, [LANTERN_ON, LANTERN_DIM], { ...P, fps: 4 }),
  sprite('d_signpost', WL, [SIGNPOST], P),
  sprite('d_fence_h', WL, [FENCE_H], { outline: false, origin: [0.5, 1] }),
  sprite('d_fence_post', WL, [FENCE_POST], P),
];
