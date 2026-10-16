import { sprite, overlay, blank, type SpriteDef, type Legend } from '../sprite';
import { at, armsFront, armsSide, farArmSide, composeHero, IDLE, WALK, type Dir, type HeroArt } from './characters-parts';

// ---------------------------------------------------------------------------
// Fieldhand: straw hat, red neckerchief, blue overalls over a cream shirt.

const FIELDHAND_L: Legend = {
  // straw hat
  W: 'butter', w: 'wheat', a: 'clay', x: 'crimson', X: 'red',
  // skin
  k: 'skin', K: 'peach', q: 'clay', e: 'umber', c: 'salmon',
  // hair
  h: 'wood', H: 'clay', j: 'bark',
  // shirt
  t: 'cream', u: 'peach',
  // overalls (m) and trouser legs (p) are the same denim
  m: 'blue', M: 'sky', n: 'navy', p: 'blue', P: 'sky', o: 'navy', G: 'gold', z: 'clay',
  // neckerchief
  r: 'red', R: 'coral', s: 'crimson',
  // boots
  b: 'bark', B: 'wood', d: 'loam',
};

const FIELDHAND: HeroArt = {
  head: {
    down: at(0, [
      '.....Wwww.....',
      '....WWwwwa....',
      '...wxXxxxxa...',
      '.WWwwwwwwwwwa.',
      'awwwwwwwwwwwwa',
      '..hjaaaaaajh..',
      '..hKkkkkkkkh..',
      '..hkekkkkekh..',
      '..jkekkkkekj..',
      '...kckkkkcq...',
    ]),
    up: at(0, [
      '.....Wwww.....',
      '....WWwwwa....',
      '...wxXxxxxa...',
      '.WWwwwwwwwwwa.',
      'awwwwwwwwwwwwa',
      '..jjjjjjjjjj..',
      '..hHHhhhhhhj..',
      '..kHhhhhhhjq..',
      '..jhhhhjhhjj..',
      '...jjhhhhjj...',
    ]),
    side: at(0, [
      '......Wwww....',
      '.....WWwwwa...',
      '....wxXxxxxa..',
      '..WWwwwwwwwwwa',
      '.awwwwwwwwwwww',
      '...jjjhaaaaa..',
      '...hHhhKkkkk..',
      '...hhhhkkkek..',
      '...jhhjkkkek..',
      '....jjkkkkcq..',
    ]),
  },
  torso: {
    down: at(10, [
      '...trRrrrst...',
      '...tGmrsmGt...',
      '...uMmmmmnu...',
      '...mMmmmmmn...',
      '...mmmmmzmn...',
    ]),
    up: at(10, [
      '...tmtrRtmt...',
      '...tmttstmu...',
      '...umttttmu...',
      '...mMmmmmmn...',
      '...mmmnmmmn...',
    ]),
    side: at(10, [
      '....tttmrR....',
      '....mmmMrrs...',
      '....umMmmn....',
      '....mMmmmn....',
      '....mmmmzn....',
    ]),
  },
  arms: {
    down: {
      n: at(11, ['..t........t..', '..k........k..', '..k........q..']),
      f: at(11, ['..t........t..', '..k........q..', '..k...........', '..q...........']),
      b: at(11, ['..t........t..', '..q........k..', '...........k..', '...........q..']),
    },
    up: {
      n: at(11, ['..t........t..', '..k........k..', '..k........q..']),
      f: at(11, ['..t........t..', '..k........q..', '..k...........', '..q...........']),
      b: at(11, ['..t........t..', '..q........k..', '...........k..', '...........q..']),
    },
    side: {
      n: at(11, ['......tu......', '......kq......', '......kq......']),
      f: at(11, ['......tu......', '.......kk.....', '........kq....']),
      b: at(11, ['.....tu.......', '....kq........', '...kq.........']),
    },
  },
  farArm: {
    n: at(11, []),
    f: at(11, ['.........u....', '..........q...']),
    b: at(11, ['...u..........', '...q..........']),
  },
};

// ---------------------------------------------------------------------------
// Botanist: moss-green hooded mantle with a sprig and a violet bloom, round
// spectacles, satchel strap, plum tunic. The hood is one step lighter than the
// mantle so the two read as separate pieces of cloth.

const BOTANIST_L: Legend = {
  // hood (deep moss, kept darker than farm grass so it reads on it)
  M: 'leaf', m: 'moss', n: 'pine', N: 'teal',
  // mantle
  A: 'moss', a: 'pine', z: 'teal', Z: 'marsh',
  // mantle hem lining
  w: 'plum', W: 'mauve',
  // sprig and bloom
  l: 'lime', g: 'sprout', F: 'orchid', f: 'violet', y: 'butter',
  // skin (warmer, darker than the fieldhand)
  k: 'clay', K: 'skin', q: 'wood', e: 'umber', c: 'brick',
  // spectacles: glint, glass, brass bridge
  L: 'white', i: 'mist', Y: 'gold',
  // hair
  h: 'plum', H: 'mauve', j: 'plumdark',
  // tunic
  v: 'mauve', V: 'magenta', u: 'plum',
  // trousers
  p: 'plum', P: 'mauve', o: 'plumdark',
  // satchel
  s: 'wood', S: 'clay', t: 'bark', T: 'gold',
  // boots
  b: 'wood', B: 'clay', d: 'bark',
};

const BOTANIST: HeroArt = {
  head: {
    down: at(0, [
      '.......lg.....',
      '....MMmgmn....',
      '...MMmmmmmnFf.',
      '..MMmmmmmmnfyf',
      '.MMmNNNNNNnnF.',
      '.MmNjhHhhjNnn.',
      '.MnKkkkkkkkNn.',
      '.mnkLiYYiLqNn.',
      '.mnkiekkeiqNN.',
      '..nqkckkckqN..',
    ]),
    up: at(0, [
      '......gl......',
      '....MMgmmn....',
      '.fFMMmmnmmn...',
      'fyfMmmmnmmmn..',
      '.FMmmmmnmmnnn.',
      '.Mmmmmmmmmnnn.',
      '.mmmmmmmmnnnN.',
      '.mmmmmmmnnnNN.',
      '.nmmmmmnnnNNN.',
      '..nnnnnnnNNN..',
    ]),
    side: at(0, [
      '.......lg.....',
      '.....MMmgm....',
      '..FfMmmmmmn...',
      '.fyfmmmmmmmn..',
      '..FMmmmnNNNNn.',
      '..MmmmnNjhhhN.',
      '.MmmmmnNKkkkk.',
      '.mmmmmnYkLek..',
      '.nmmmnnNkiek..',
      '..nnnnnNqkcq..',
    ]),
  },
  torso: {
    down: at(10, [
      '..AaaaTaaasz..',
      '.AAaaaaassazZ.',
      '.Wwwwwwsswwww.',
      '...SSTvvvvu...',
      '...tttvvvvu...',
    ]),
    up: at(10, [
      '..AssaaaaaaZ..',
      '.AAaassaaaazZ.',
      '.Wwwwwwsswwww.',
      '...vvvvvSSSt..',
      '...vvvvutttt..',
    ]),
    side: at(10, [
      '....AaaTaz....',
      '...AaaaaaazZ..',
      '..AWwwwwwwwZ..',
      '..SSvvvvvvu...',
      '..ttvvvvvu....',
    ]),
  },
  arms: {
    down: {
      n: at(13, ['..k........q..']),
      f: at(13, ['..k........q..', '..q...........']),
      b: at(13, ['..k........q..', '...........q..']),
    },
    up: {
      n: at(13, ['..k........q..']),
      f: at(13, ['..k........q..', '..q...........']),
      b: at(13, ['..k........q..', '...........q..']),
    },
    side: {
      n: at(13, ['......kq......']),
      f: at(12, ['.........w....', '........kq....']),
      b: at(12, ['...w..........', '...kq.........']),
    },
  },
};

// ---------------------------------------------------------------------------
// Reaper: charcoal pointed hood and cowl, pale face, crimson scarf with a
// trailing tail, long patched night-blue coat with a bone buckle.

const REAPER_L: Legend = {
  // hood and cowl
  S: 'stone', A: 'slate', a: 'ash', z: 'soot', Z: 'coal',
  // pale skin
  k: 'peach', K: 'cream', q: 'skin', e: 'umber',
  // scarf
  R: 'red', r: 'crimson', x: 'wine', X: 'maroon',
  // coat
  M: 'storm', m: 'night', n: 'abyss', N: 'deep',
  // patch with a pale stitch
  u: 'wood', U: 'clay',
  // belt and bone buckle
  t: 'loam', w: 'cream', W: 'pebble',
  // trousers and boots
  p: 'soot', P: 'ash', o: 'coal', b: 'bark', B: 'wood', d: 'loam',
};

const REAPER: HeroArt = {
  head: {
    down: at(0, [
      '.....Sa.......',
      '....SAaz......',
      '...SAaaaz.....',
      '...AAaaaazz...',
      '..SAaaaaaazzz.',
      '.AAZZZZZZZZzz.',
      '.AZKkkkkkkkZz.',
      '.aZkekkkkekZz.',
      '.aZkekkkkekZZ.',
      '.zZqkkkkkkqZZ.',
    ]),
    up: at(0, [
      '.....Sa.......',
      '....SAaz......',
      '...SAaaaz.....',
      '...AAaaaazz...',
      '..SAaaaaazzzz.',
      '.SAAaaaaazzzz.',
      '.AAaaaaaazzzZ.',
      '.Aaaaaaazzzzz.',
      '.aaaaaaazzzZZ.',
      '.zaaaaaazzZZZ.',
    ]),
    side: at(0, [
      '..Sa..........',
      '...SAz........',
      '...SAaaz......',
      '..SAaaaaazz...',
      '..AAaaaaaaazz.',
      '.SAaaaaZZZZZz.',
      '.AAaaazZKkkkZ.',
      '.Aaaaazzkkkek.',
      '.aaaazzZkkkek.',
      '.zzzzzZZqkkq..',
    ]),
  },
  torso: {
    down: at(10, [
      '.aRrrrrrrrrxz.',
      '.AaxrrrrrxxzZ.',
      '..MmmmmmmmnN..',
      '..MtttwWtttN..',
      '..MmmmmmuUnN..',
      '..MmmmmNmmnN..',
    ]),
    up: at(10, [
      '.aRrrrrrrrrxz.',
      '.AaxrrRrxxxzZ.',
      '..MmmmmmmmnN..',
      '..MttttttttN..',
      '..MmUummmmnN..',
      '..MmmmmNmmnN..',
    ]),
    side: at(10, [
      '..aRrrrrrrxz..',
      '...xRrrrrxX...',
      '...MmmmmmnN...',
      '...MtttwWtN...',
      '...MmUummnN...',
      '..MMmmmmmnnN..',
    ]),
  },
  arms: {
    down: {
      n: at(12, ['.M..........n.', '.K..........q.']),
      f: at(12, ['.M..........q.', '.M............', '.K............']),
      b: at(12, ['.K..........n.', '............n.', '............q.']),
    },
    up: {
      n: at(12, ['.M..........n.', '.K..........q.']),
      f: at(12, ['.M..........q.', '.M............', '.K............']),
      b: at(12, ['.K..........n.', '............n.', '............q.']),
    },
    side: {
      n: at(12, ['......Mn......', '......kq......']),
      f: at(12, ['.......MMn....', '........kq....']),
      b: at(12, ['....MMn.......', '...kq.........']),
    },
  },
  farArm: {
    n: at(12, []),
    f: at(12, ['.........N....', '..........q...']),
    b: at(12, ['...N..........', '...q..........']),
  },
  extras: (dir, f) => {
    // The scarf tail streams out and flutters between two shapes.
    const a = f.t % 2 === 0;
    if (dir === 'side') {
      return [
        {
          rows: at(10, a ? ['xr............', 'Xxr...........', '.Xx...........'] : ['.xr...........', 'Xxr...........', 'X.............']),
          bob: true,
          front: false,
        },
      ];
    }
    if (dir === 'down') {
      return [{ rows: at(11, a ? ['...........xr.', '............xr', '............Xx'] : ['...........xr.', '...........xr.', '...........Xx.']), bob: true, front: true }];
    }
    return [{ rows: at(11, a ? ['...rx.........', '...rx.........', '..rx..........', '..xX..........'] : ['...rx.........', '...rx.........', '...rx.........', '...xX.........']), bob: true, front: true }];
  },
};

function heroSprites(cls: string, art: HeroArt, legend: Legend): SpriteDef[] {
  const out: SpriteDef[] = [];
  for (const dir of ['down', 'up', 'side'] as Dir[]) {
    out.push(
      sprite(`hero_${cls}_${dir}_idle`, legend, IDLE[dir].map((f) => composeHero(art, dir, f, false)), {
        outline: true,
        origin: [0.5, 1],
        fps: 2,
      }),
    );
    out.push(
      sprite(`hero_${cls}_${dir}_walk`, legend, WALK[dir].map((f) => composeHero(art, dir, f, true)), {
        outline: true,
        origin: [0.5, 1],
        fps: 8,
      }),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Held weapons, pointing right (angle 0). Origins sit on the grip pixel.

const HELD: SpriteDef[] = [
  // Forked hazel slingshot: red leather grip wrap, band pulled taut between
  // the prongs with a leather pouch. Grip at drawing (1,3).
  sprite(
    'held_sling',
    { B: 'clay', b: 'wood', d: 'bark', s: 'blood', S: 'brick', l: 'loam', P: 'clay', p: 'wood', W: 'wheat' },
    [
      [
        '......Bb.',
        '.....Bb.l',
        '....Bb..P',
        'sSSBb...W',
        '....bd..p',
        '.....bd.l',
        '......bd.',
      ],
    ],
    { outline: true, origin: [2.5 / 11, 4.5 / 9] },
  ),
  // Bellows: varnished boards, dark leather pleats, brass nozzle ending in a
  // toadstool cap (gills facing back). Grip between the rear handles, (1,3).
  sprite(
    'held_puffer',
    {
      H: 'clay', h: 'wood', W: 'wheat', w: 'clay', d: 'wood', b: 'wood', B: 'bark', G: 'gold',
      p: 'bark', P: 'wood', g: 'gold', c: 'cream', C: 'peach', R: 'red', r: 'crimson', x: 'wine', o: 'white',
    },
    [
      [
        'H...........',
        'HWWGwd....R.',
        '.pPpPpwd.cRo',
        '.pPpPpPdgcRr',
        '.pPpPpbB.Cor',
        'hbbbbbB...x.',
        'h...........',
      ],
    ],
    { outline: true, origin: [2.5 / 14, 4.5 / 9] },
  ),
  // Old scythe: ash snath with a grip peg, rusty ferrule, curved blade whose
  // sharp edge is on the inside of the curve, two chips out of it and a rust
  // bloom at the heel. Grip at the rear of the 2px snath, drawing (1-2, 2-3).
  sprite(
    'held_scythe',
    {
      W: 'wheat', w: 'clay', b: 'wood', d: 'bark', R: 'rust', r: 'brick',
      H: 'white', S: 'pebble', s: 'stone', t: 'slate', T: 'ash',
    },
    [
      [
        '.....w..............',
        '.....b..............',
        'WWwwwwwwwwwwwwwwRrsT',
        'dbbbbbbbbbbbbbbbrdsT',
        '.................HRt',
        '.................HSt',
        '.................Hst',
        '................HSst',
        '...............HSst.',
        '..............HSst..',
        '.............HSst...',
        '.........HH.Sstt....',
        '......HHSSssst......',
        '..HHSsssttt.........',
      ],
    ],
    { outline: true, origin: [3 / 22, 4 / 16] },
  ),
];

// ---------------------------------------------------------------------------
// NPCs and farm props. Facing the viewer, origin at the feet. Idle frames bob
// the upper body 1px (legs stay planted).

function npcFrame(w: number, h: number, parts: { rows: string[]; x?: number; y: number; bob?: boolean }[], bob: number): string[] {
  let c = blank(w, h);
  for (const p of parts) c = overlay(c, p.rows, p.x ?? 0, p.y + (p.bob ? bob : 0));
  return c;
}

// Bertha, the village blacksmith: stout, arms akimbo to show off the
// forearms, blue headscarf knotted at the back, ginger curls, soot on her
// cheek, sooty leather apron with a hammer hung through a belt loop.
const BERTHA_L: Legend = {
  U: 'sky', u: 'blue', v: 'navy',
  r: 'rust', h: 'brick', H: 'blood',
  k: 'skin', K: 'peach', q: 'clay', Q: 'wood', e: 'umber', c: 'salmon', o: 'slate', m: 'bark',
  F: 'white', f: 'mist', g: 'fog',
  A: 'clay', a: 'wood', z: 'bark', Z: 'loam', x: 'ash',
  t: 'loam', y: 'gold',
  M: 'pebble', N: 'stone', n: 'slate', w: 'wood', W: 'clay',
  p: 'storm', P: 'dusk', l: 'night',
  b: 'bark', B: 'wood', d: 'loam',
};
const BERTHA_HEAD = [
  '.....Uuuuuv.....',
  '....UUuuuuuuv...',
  '...UUuuuuuuuuv..',
  '...Uuuuuuuuuuvuv',
  '..rvvvvvvvvvvhvu',
  '.rrKkkkkkkkkkqh.',
  '..hkkekkkkekkqhh',
  '.hhkkekkkkekkqH.',
  '..hkcckkkkccoqh.',
  '...kkkmkkmkkqq..',
  '....kkkmmkkqq...',
];
const BERTHA_BODY = [
  '.FFffzaAAazfffg.',
  'kKFffzaAAazffgqk',
  'kKk.zaaAaMMN.qqQ',
  'KkkkttttyNNntqqQ',
  '.KkkaaaaaaWaqqq.',
  '...AaaaaaaWZzz..',
  '...AaxaaaawzzZ..',
  '...AaaaaaaaazZ..',
  '...ZzaaaaazzZZ..',
];
const BERTHA_LEGS = ['...ppPp..pppl...', '..BBbbd..Bbbbd..'];
const bertha = (bob: number) =>
  npcFrame(16, 22, [
    { rows: BERTHA_LEGS, y: 20 },
    { rows: BERTHA_BODY, y: 11, bob: true },
    { rows: BERTHA_HEAD, y: 0, bob: true },
  ], bob);

// Mags, the travelling seed pedlar: battered tall hat with feathers and seed
// packets in the band, a sideways glance and a gold-tooth smirk, silver braid,
// patchwork coat, striped stockings.
const MAGS_L: Legend = {
  Y: 'wood', y: 'bark', Z: 'loam', w: 'wine', W: 'blood', J: 'clay', s: 'cream',
  P: 'cream', G: 'leaf', O: 'orange',
  f: 'teal', C: 'cyan', F: 'gold', R: 'rust',
  k: 'skin', K: 'peach', q: 'clay', m: 'bark', e: 'umber', E: 'clay', n: 'white', T: 'gold',
  h: 'pebble', H: 'stone', r: 'wine',
  a: 'pine', A: 'moss', b: 'brick', B: 'rust', j: 'wheat', v: 'mauve', c: 'cream', u: 'wheat', d: 'dusk', D: 'storm', z: 'teal',
  x: 'cream', X: 'wine', L: 'loam', l: 'bark',
};
const MAGS_HEAD = [
  '........yyZ...',
  '.......YyyyZ..',
  '......YyyZyZ..',
  '.C....YyyyyZ..',
  '..C...YJsyyZ..',
  '..fC.YyJJyyZF.',
  '...fCYPPyyPZRF',
  '....wwGGwwOwR.',
  '..YYYyyyyyyyZZ',
  '..hhKkkkkkqhZZ',
  '..hkEEkkEEkh..',
  '..hknekkneqh..',
  '..hkkkqkkmkh..',
  '...hkmTmkqhH..',
  '....kkkkqhHh..',
];
const MAGS_BODY = [
  '..AaabBaaaahH.',
  '.AAaabbaavvhHa',
  '.AaaacaaavvrHa',
  '.kAajjcuuaazzk',
  '..AajjcuuaLzz.',
];
const MAGS_LEGS = ['....xX..Xx....', '...LLl..Lll...'];
const mags = (bob: number, f: number) =>
  npcFrame(14, 22, [
    { rows: MAGS_LEGS, y: 20 },
    { rows: MAGS_BODY, y: 15, bob: true },
    { rows: MAGS_HEAD, y: 0, bob: true },
    // the long feather nods
    ...(f === 1 ? [{ rows: ['C...', '.C..', '.fC.'], x: 0, y: 2, bob: true }] : []),
  ], bob);

// Mags's covered cart: striped canvas over a plank bed, a big spoked wheel,
// seed sacks lashed at the back, a lantern on a crook at the front, pulled by
// a giant snail whose shell is grown over with moss. The eye-stalks wiggle and
// the lantern flame flickers.
const CART_L: Legend = {
  C: 'cream', c: 'peach', k: 'clay', R: 'red', r: 'brick', x: 'blood', j: 'wheat', J: 'clay', o: 'wood',
  W: 'clay', w: 'wood', b: 'bark', B: 'loam', I: 'slate', i: 'ash',
  T: 'wood', t: 'bark', u: 'loam', U: 'umber', h: 'slate', H: 'pebble',
  L: 'gold', l: 'amber', y: 'butter',
  P: 'mist', s: 'fog', S: 'dusk', n: 'storm',
  M: 'sprout', m: 'leaf', g: 'moss', G: 'pine',
  E: 'peach', e: 'skin', f: 'clay', F: 'wood', v: 'umber', V: 'white', z: 'salmon', X: 'wine',
};
const CART_BASE = [
  '......................................................',
  '......................................................',
  '......................................................',
  '.................................Iii..................',
  '.................................i.i..................',
  '...........Rccccrrrrcc...........i....................',
  '.........RRRccccrrrrccck.........i..MMMMmgg...........',
  '........RRRRccccrrrrccckx........iMMMMMMmgggg.........',
  '..BB..CCRRRRccccrrrrccckxxx.....mimGmGGmGGggggg.......',
  '.jjJB.CCRRRRccccrrrrjJckxxx....mmiGPGnsGssGgGggg......',
  'jjjjJoCCRRRRccccrrrrJBckxxxx...mGiPnssPPPPSGnGgg......',
  'jjjJJBCCRRRRccccrrrrccckxxxxk.mGPinsPPPPPPssSnGEEEe...',
  'jjjJjJoCRRRRccccrrrrccckxxxxk.msPisPPnnssnnssEEEeeeef.',
  'JjJJjJoCRRRRccccrrrrccckxxxxkkGPPisPnssPPsSnEEeeeeeeff',
  '.JJoJJoCRRRRccccrrrrccckxxxxkksPPiPPnsPPsssSEEeeeeeeef',
  '..ooJocBrrBrcBccBrrBccBkxBxxBksPPiPPsPnnnnSSEeeeeeeeef',
  '.WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWbsPPnsnnnnSSEeeeeeeeef',
  '.WIwwwwwbwwwwwwwbwwwwwwwbwwwwwwIbnsPnSSSSnSSEeeeeezeef',
  '.WwwwwwwbwwwwwwwbwwwwwwwbwwwwwwwbXXXXXLXXXXXEeeeeeeFef',
  '.WbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbxxxxxlxxxxxEeeeeeeeFf',
  '.WIwwwwwbwwwwwwwbwwwwwwwbwwwwwwIbssnSSSSSSnSSEeeeeeeff',
  '.WBBBBBBBBBBTTtttBBBBBBBBBBBBBBBbSsssnnnnSSSSEeeeeeef.',
  '..........TTTUUUttt............ssnSsSSSSSSSSnEeeeeeef.',
  '.........TTwwUUUwwtt............ssnnSSSSSSnnSEeeeeeef.',
  '.........TUUwwUwwUUt..............sSSnnnnSSSSEeeeeeeff',
  '........TTUUUwUwUUUtt...............SSSSSSS.EEeeeeeeff',
  '........TwwUUHhhUUwwt......................EEeeeeeeeff',
  '........twwwwhHhwwwwt...........EEEEEEEEEEEEEEEEE.....',
  '........twwUUhhhUUwwt........EEEEEEEEEEEEEEEEEEEEEEE..',
  '........ttUUUwUwUUUtt......eeeeeeeeeeeeeeeeeeeeeeeeeee',
  '.........uUUwwUwwUUu.......eeeeeeeeeeeeeeeeeeeeeeeeeee',
  '.........uuwwUUUwwuu.......eeeeeeeeeeeeeeeeeeeeeeeeeee',
  '..........uuuUUUuuu..........fffffffffffffffffffffff..',
  '............uuuuu................fffffffffffffff......',
];
const CART_STALKS = [
  ['..vv...vv', '..Vv...Vv', '...f...e.', '...f..e..', '...f..e..', '...f.e...'],
  ['vv...vv..', 'Vv...Vv..', '.f....e..', '..f...e..', '..f...e..', '...f.e...'],
];
const CART_LANTERN = [
  ['.ii.', 'iIIi', 'iLyi', 'iyLi', 'ilLi', '.ii.'],
  ['.ii.', 'iIIi', 'iyLi', 'iLli', 'ilLi', '.ii.'],
];
const snailCart = (f: number) => overlay(overlay(CART_BASE, CART_STALKS[f], 43, 5), CART_LANTERN[f], 34, 5);

// The farm scarecrow: friendly but a little uncanny. Burlap sack head with
// mismatched button eyes and a too-wide stitched grin, battered straw hat,
// patched coat on a crossbar with straw at the cuffs. The head lolls 1px.
const SCARECROW_L: Legend = {
  W: 'gold', w: 'wheat', a: 'clay', x: 'bark', X: 'brick',
  S: 'wheat', s: 'clay', z: 'wood', m: 'bark',
  B: 'sky', b: 'blue', R: 'red', r: 'crimson',
  y: 'butter', Y: 'gold', t: 'amber',
  C: 'fog', c: 'dusk', d: 'storm', P: 'brick', p: 'blood', Q: 'wheat', q: 'clay', g: 'gold',
  T: 'clay', u: 'wood', U: 'bark', n: 'loam',
};
const SCARECROW_HEAD = [
  '......Wwww......',
  '.....Wwwwwa.....',
  '.....xxXxxx.....',
  '..WWwwwwwwwwa...',
  '.awwwwwwwwww.wa.',
  '...a.zzzzzzz.a..',
  '....SssssssSz...',
  '....sBbsssRrz...',
  '....sbbsssrrz...',
  '....mssssssmz...',
  '....smmmmmmsz...',
  '.....zsssssz....',
];
const SCARECROW_BODY = [
  '....yxzzzzxy....',
  'yYCCCCcQqCCccdYy',
  '.yYCcCcQqcCcdYy.',
  '...tCcccgccdd...',
  '....CcPpccgcd...',
  '....CcPpcccdd...',
  '....CccccccQd...',
  '....Cccgcccqd...',
  '....yCcyccdyd...',
  '....y.tyuUy.t...',
  '.......uU.......',
  '.......uU.......',
  '.......uU.......',
  '.......uU.......',
  '.......uU.......',
  '......TuUn......',
];
const scarecrow = (lean: number) =>
  npcFrame(16, 28, [
    { rows: SCARECROW_BODY, y: 12 },
    { rows: SCARECROW_HEAD, x: lean, y: 0 },
  ], 0);

const NPCS: SpriteDef[] = [
  sprite('npc_bertha', BERTHA_L, [bertha(0), bertha(1)], { outline: true, origin: [0.5, 1], fps: 2 }),
  sprite('npc_mags', MAGS_L, [mags(0, 0), mags(1, 1)], { outline: true, origin: [0.5, 1], fps: 2 }),
  sprite('npc_snail_cart', CART_L, [snailCart(0), snailCart(1)], { outline: true, origin: [0.5, 1], fps: 3 }),
  sprite('farm_scarecrow', SCARECROW_L, [scarecrow(0), scarecrow(1)], { outline: true, origin: [0.5, 1], fps: 1 }),
];

// ---------------------------------------------------------------------------
// Portraits: 32x32 after the outline, bust framing, no background.

const PORTRAITS: SpriteDef[] = [
  // Fieldhand: straw hat with a wheat stalk in the band, freckles, red neckerchief.
  sprite(
    'portrait_fieldhand',
    { W: 'butter', w: 'wheat', a: 'clay', A: 'wood', X: 'red', x: 'crimson', S: 'wine', h: 'wood', H: 'clay', j: 'bark', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', e: 'umber', E: 'white', i: 'bark', c: 'salmon', m: 'bark', M: 'blood', t: 'cream', T: 'white', u: 'peach', o: 'blue', O: 'sky', n: 'navy', G: 'gold', r: 'red', R: 'coral', s: 'crimson' },
    [
      [
        '...........WWWwwwww...........',
        '..........WWWwwwwwwaW.........',
        '.........WWwwwwwwwwwawW.......',
        '.........Wwwwwwwwwwwa.w.......',
        '....WWWWwXXxxxxxxxxxSwwwa.....',
        '.WWWWWwwwwwwwwwwwwwwwwwwwwww.w',
        'WWwwwwwwwwwwwwwwwwwwwwwwwwwww.',
        '.aawwwwwwwwwwwwwwwwwwwwwwwwa..',
        '...aaaaAAAAAAAAAAAAAAAAAAaa...',
        '.....hHhjqhjqqqqqjhqqqjhh.....',
        '.....hhjqjjjkkkkkkjjjqqjh.....',
        '.....hjkkkkkkkkkkkkkkqqqj.....',
        '.....jkKkkEekkkkkkEekqqqj.....',
        '.....kkKKkeekkkkkkeekqqqk.....',
        '....kqkkKkeikkkkkkeikqqqqk....',
        '....kqkkkkkkqkkqkqkkkqqqqk....',
        '.....kkkcckkkqQkqkkkccqqk.....',
        '......kkkkkkkkkkkkkkkqqq......',
        '......kkkkkkmkkkkmkkqqqq......',
        '......kkkkkkkmMMmkkkqqqq......',
        '.......kkkkkkkkkkkkkqqq.......',
        '........kkkkkkkkkkkqqq........',
        '.........rRRRrrrrrrrs.........',
        '.........trRrrrrrrrst.........',
        '....tttttTTsrrrrrrsTTttttt....',
        '..tttttOoottsrrrrsttoonuuuuu..',
        '.ttutttOootutsrrstutoonuuuuuu.',
        '.tuttttOGottutsstuttoGnuuuuuu.',
        '.ttttttOoooooooooooooonuuuuuu.',
        '.ttttttOoooooooooooooonuuuuuu.',
      ],
    ],
    { outline: true },
  ),
  // Botanist: deep moss hood with a sprig and a violet bloom, brass spectacles, satchel strap, leaf pin.
  sprite(
    'portrait_botanist',
    { M: 'leaf', m: 'moss', n: 'pine', N: 'teal', A: 'moss', a: 'pine', z: 'teal', Z: 'marsh', l: 'lime', g: 'sprout', G: 'leaf', F: 'orchid', f: 'violet', y: 'butter', K: 'skin', k: 'clay', q: 'wood', e: 'umber', E: 'white', i: 'mist', c: 'brick', u: 'bark', b: 'bark', h: 'plum', H: 'mauve', j: 'plumdark', Y: 'wheat', v: 'mauve', V: 'magenta', T: 'butter', t: 'gold', s: 'wood', S: 'clay' },
    [
      [
        '............l..lg.............',
        '..........MMMmlgGnnn..........',
        '.......mMMMMmmmGmnnnnnn.......',
        '.....mMMMmmmmmmmmnnnnnFFn.....',
        '....mMMmmmmmmmmmmnnnnFfyFF....',
        '....MMmmmmmmmmmmmnnnnnFfFN....',
        '....MmmmmmmNNNNNNNNnnnnfNN....',
        '....MmmmmNNjhhhhhhjNNnnNNN....',
        '....mmmmNNhHHhhhhhhhjNnNNN....',
        '....mmmmNhHhhjhhhhjhhNnNNN....',
        '....mmmmNhjkkhkkkkjhqNnNNN....',
        '....mmmmNkKkkkkkkkqqqNnNNN....',
        '....mmmmNKYYkkkkkkYYqNnNNN....',
        '....mmmmNYEiYYyyYYEiYNnNNN....',
        '....mmmmYYeeYkkkkYeeYYnNNN....',
        '....mmmmNYeeYkkkkYeeYNnNNN....',
        '....mmmmNkYYkkkqkkYYqNnNNN....',
        '....mmmmmcckkkkkkkqccnnNNN....',
        '....mmmmmmNkkkkkkqqNnnnNNN....',
        '.....mmmmmmNkukkukNnnnnNN.....',
        '......mmmmmmqqqqqqnnnnnN......',
        '.......AAAmvvvVvvvvnnsSb......',
        '.....AAAaaaavvvvvvzzSsbzz.....',
        '...AAaaaaaaaaTttTazsSbzzZZZ...',
        '..AaaazaaaaaaaaaaSsbzzzzZZZZ..',
        '.AaaaazaaaaaaaasSbzzzGzzNZZZZ.',
        '.aaaazaaaaaaaSsbaazzGgzzNZZZZ.',
        'aaaaazaaaaasSbaaaazzzzzzZNZZZZ',
        'aaaazaaaaSsbaaaaaazzzzzzZNZZZZ',
        'aaaazaasSbaaaaaaaazzzzzzZNZZZZ',
      ],
    ],
    { outline: true },
  ),
  // Reaper: pointed charcoal hood flopping left, pale tired face, crimson scarf over the chin, bone toggle, patched coat.
  sprite(
    'portrait_reaper',
    { S: 'stone', A: 'slate', a: 'ash', z: 'soot', Z: 'coal', K: 'cream', k: 'peach', q: 'skin', e: 'umber', E: 'white', R: 'red', r: 'crimson', x: 'wine', X: 'maroon', M: 'storm', m: 'night', n: 'abyss', N: 'deep', u: 'bark', U: 'clay', w: 'cream', W: 'pebble', t: 'loam' },
    [
      [
        '........Sa....................',
        '.......SAaa...................',
        '........AAaaaz................',
        '.........AAaazazz.............',
        '........AAaaaazaazzzzz........',
        '.......AAaaaaaazazzzzzz.......',
        '.....AAaaaaaaaaazzzzzzzZZ.....',
        '....AaaaaaaZZZZZZZZzzzzZZZ....',
        '...AaaaaaZZZZZZZZZZZZzzZZZZ...',
        '...AaaaaZZZZZZZZZZZZZZzZZZZ...',
        '...AaaaaZZZzzzzzzzzZZZzZZZZ...',
        '...AaaaaZZzkKkkkkkqzZZzZZZZ...',
        '...AaaaaZkaaakkkkaaaqZzZZZZ...',
        '...AaaaaZkqqkkkkkkqqqZzZZZZ...',
        '...AaaaaZkEekkkkkkEeqZzZZZZ...',
        '...AaaaaZkeekkkkkkeeqZzZZZZ...',
        '...AaaaaZkeekkkqkkeeqZzZZZZ...',
        '...AaaRRRRRRRRrrrrrrrrxxZZZ...',
        '...AaRrrRRrrxrrrrrrxrxxxxZZ...',
        '...AarrrrrrxrrxxrrxrrxxxxZZ...',
        '....arxxxrrrrrrrxxxxxXXxXZ....',
        '.....aaaXxxxxxxxxxxxxrrxZ.....',
        '.....MaaaaaaaaaaazzzzrrxX.....',
        '...MMmmmmmmwttwmmmnnnRrxnnn...',
        '..MmmmmmmmmWwwWmmmnnnnrxXNNN..',
        '.MmmmmmmmmmwmmWmmmnnnnrxnNNNN.',
        '.MmuUummmmmmmmnmmmnnnRrxnNNNN.',
        'mmmuuummmmmmmmnmmmnnnrrxXNNNNN',
        'mmmUuUmmmmmmmmnmmmnnnnxXnNNNNN',
        'mmmmmmmmmmmmmmnmmmnnnnnXnNNNNN',
      ],
    ],
    { outline: true },
  ),
  // Bertha: blue headscarf knotted on top, ginger curls, soot smudges, toothy grin, apron straps.
  sprite(
    'portrait_bertha',
    { U: 'sky', u: 'blue', v: 'navy', V: 'midnight', r: 'rust', R: 'orange', h: 'brick', H: 'blood', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', e: 'umber', E: 'white', i: 'bark', c: 'salmon', m: 'bark', T: 'white', t: 'mist', o: 'slate', O: 'stone', F: 'white', f: 'mist', g: 'fog', A: 'clay', a: 'wood', z: 'bark', Z: 'loam', x: 'ash' },
    [
      [
        '.....................UuuV.....',
        '..........UUUuuuuvvvUuvuuv....',
        '........UUUUuuuvuvvvvvVvV.....',
        '.......UUuuuuuuvuvvvvvV.......',
        '......UuuuuuuuvuuvvvvvVV......',
        '......UuuuuuuuvuuvvvvvVV......',
        '....rruuuuuuuuvuuvvvvvVVr.....',
        '...rrRrvvvvvvvvvvvvvvvVrRrr...',
        '..rRrrhhkkokkkkkkkkkqqhhrrRh..',
        '...rrhrhkoOkkkkkkkkkqqhrhrrh..',
        '..rrRhhkkHHHHkkkkHHHHqqhhrRh..',
        '...rhhhkkHkkkkkkkkkkHqqhhrh...',
        '..rrhhkKkkEekkkkkkEeqqqqhhrh..',
        '...hhqkKKkeekkkkkkeeqqqqqhh...',
        '....hqkkKkeikkkkkkeiqqOqqh....',
        '......kkkkkkkkkqkkkkqoqq......',
        '......kkcckkkkQqkkkkccoq......',
        '......kkkkmkkkkkkkkmqqqq......',
        '.......kkkkmTTtTTTmkqqq.......',
        '........kkkkmmmmmmkqqq........',
        '..........kkkkkkkkqq..........',
        '..........qqkkkkkqqq..........',
        '......fFFfqqqqqqqqqqgggg......',
        '...fFFffAafqqqqqqqqfazggggg...',
        '.fFFffffAaffffffffffazggggggg.',
        'fFffffffAaffffffffffazgggggggg',
        'ffffffffAaAAAAAzzzzzazgggggggg',
        'ffffffffAaAaZZZZzzzzazgggggggg',
        'ffffffffAaaaZxazzxzzazgggggggg',
        'ffffffffAaaaaaazzzzzazxggggggg',
      ],
    ],
    { outline: true },
  ),
  // Mags: battered tall hat with feathers and seed packets, a squint and a cocked brow, gold-tooth smirk, silver braid, patchwork collar.
  sprite(
    'portrait_mags',
    { Y: 'wood', y: 'bark', Z: 'loam', w: 'wine', W: 'blood', J: 'clay', s: 'cream', P: 'cream', G: 'leaf', O: 'orange', f: 'teal', C: 'cyan', F: 'gold', R: 'rust', r: 'wine', X: 'navy', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', m: 'bark', e: 'umber', E: 'white', n: 'white', T: 'gold', c: 'salmon', h: 'pebble', H: 'stone', i: 'white', A: 'moss', a: 'pine', z: 'teal', b: 'brick', B: 'rust', j: 'wheat', v: 'mauve', V: 'plum' },
    [
      [
        '....CC.........yyyyZZZ........',
        '...CffC.......YyyyyyyzZ.......',
        '....ffffC....YYyyyZyyz.FF.....',
        '.....fXffC...YyyyyyyyzFRF.....',
        '......ffffC.YYyyJsyyyFRF......',
        '........ffF.YyyyJJyyyRF.......',
        '..........F.YyPPyyyPyZ........',
        '............wwGGwwwOwW........',
        '....YYYyyyyyyyyyyyyyyyyyyyZ...',
        '...YYyyyyyyyyyyyyyyyyyyyyyZZ..',
        '.....ZZZhkkkkkkkkHHqqHZZZZZ...',
        '......ihkkkkkkkkkkkqqqHH.ZZ...',
        '......ihkHHHHkkkkqqqqqHH......',
        '......hikKqqqkkkkneEqqHH......',
        '......hhkkneekkqkneeqqHH......',
        '......hhkkkkkkkqkkkqqqHH......',
        '......hhkkkkkkQqkkkQqqHH......',
        '......hhkkckkkkkkkkmcqHH......',
        '......hhhkkkkkkkkmmqqHHH......',
        '.......hhhkmmTmmmqkqHHH.......',
        '........hhhkkkkkqkkHHhH.......',
        '.........hh.qkkkkq.HHHhH......',
        '............ssRRss...hHh......',
        '.......AAaaaasRrsaazHhH.......',
        '....AAAaaaaaaarraaazzHhHzz....',
        '..AsbbBaaaaaaaaaaaazzhHhzzzz..',
        '.AaabBbsaaaaaaaaaaazHhHjJzzzz.',
        'aaasbbbaaaaasvvvaaazzrrJjzzzzz',
        'aaaaabbaaaaaavVvsaazzhhjJzzzzz',
        'aaaaaaaaaaaaaaaaaaazzzzzzzzzzz',
      ],
    ],
    { outline: true },
  ),
  // Old Mother Turnip: leaf crown and moss, serene closed eyes, age lines and root whiskers, candles at her feet.
  sprite(
    'portrait_mother_turnip',
    { L: 'sprout', l: 'leaf', g: 'moss', G: 'pine', V: 'magenta', v: 'mauve', u: 'plum', U: 'plumdark', p: 'rose', W: 'white', w: 'cream', x: 'peach', X: 'clay', M: 'leaf', m: 'moss', y: 'butter', n: 'white', Q: 'plum', q: 'mauve', c: 'salmon', o: 'amber', Y: 'gold', k: 'umber', C: 'white', K: 'peach' },
    [
      [
        '....Ll........LL..............',
        '....LLlg.....LLlg.......gG....',
        '.....LlGgg...LlGg.....gggG....',
        '.....LllGgg.LllGgg..lggGG.....',
        '......llgGggLlgGgg.lgGgGG.....',
        '.......lggmMMmuuuuulgGgg......',
        '........myMMMmmyuuuuuug.......',
        '......vmMMmmmnmmuuuuuuUU......',
        '.....VmMnmmmmGmmmuuuuuUUU.....',
        '....VvmmGmmummumuuuuuuUUUU....',
        '....VvmvvmuuuuuuuuuuuuUUUU....',
        '...vvvvvvuuuuuuuuuuuuuUUUUU...',
        '...vvvvvvuuuuuuuuuuuuUUUUUU...',
        '...ppvvvvuuuuuuuuuuuuuUUUpp...',
        '...vppvppvppvppvppvppvppvpp...',
        '...WWWWwqwwwwwwwwwwwwqxxxxx...',
        '...WWWWwwQwwwQwwQwwwQwxxxxx...',
        '...WWWWwqwQQQwwwwQQQwqxxxxx...',
        '...WWWWwwqwwwwwwwwwwqwxxXXX...',
        '..oWWWWwccwwwwwwwwwwccxxXXX...',
        '.oyoWWWwwwwwwwwwwwwwwwxxXXX...',
        '.oYoWWWwwwwwwqwwqwwwwwxxXXo...',
        '..k.WoWwwwwwwwqqwwwwwwxxXoyo..',
        '.CCcoyowwwwwwwwwwwwwwwXxXoYo..',
        '.CcKoYowwwwwwwwwwwwwwXxx..k...',
        '.CcK.k.wwwwwwwwwwwwwwwx..CCc..',
        '.CcKCCc..xxxxXxxXxxxx....CcK..',
        '.CcKCcK.....xXxxXx.......CcK..',
        '.CcKCcK.......X.x........CcK..',
        '.CcKCcK..................CcK..',
      ],
    ],
    { outline: true },
  ),
];

// ===========================================================================
// The nine further classes. Same 14x18 canvas, same legs, same bob and arm
// swing (armsFront / armsSide / farArmSide), resting hands on row 13.

// ---------------------------------------------------------------------------
// Tinkerer: spiky soot-black hair with brass goggles pushed up, soot on the
// face, leather apron full of tools, a wind-up clockwork box on one shoulder.

const TINKERER_L: Legend = {
  h: 'ash', H: 'slate', j: 'coal',
  Y: 'gold', y: 'amber', l: 'cyan', L: 'ice', t: 'bark',
  k: 'skin', K: 'peach', q: 'clay', e: 'umber', c: 'salmon', x: 'stone',
  s: 'dusk', S: 'fog', n: 'storm',
  A: 'clay', a: 'wood', z: 'bark', W: 'pebble', w: 'slate', r: 'red',
  G: 'gold', g: 'amber', i: 'slate', Z: 'loam',
  p: 'storm', P: 'dusk', o: 'night', b: 'bark', B: 'wood', d: 'loam',
};

const TINKERER: HeroArt = {
  head: {
    down: at(0, [
      '....h..hh.h...',
      '..hhHHhhhhhj..',
      '.hhYYhhhhYYhj.',
      '.tYLlYttYLlYt.',
      '.hhyyhhhhyyhj.',
      '..hhKkxkkkhj..',
      '..hkkkkkkkkj..',
      '..hkekkkkekq..',
      '...kekkkkekq..',
      '...kckkkkcx...',
    ]),
    up: at(0, [
      '....h..hh.h...',
      '..hhHHhhhhhj..',
      '.hhYYhhhhYYhj.',
      '.tttttttttttt.',
      '.hHhhhhhhhhhj.',
      '.hhHhhhhhhhjj.',
      '..hhhhhhhhhj..',
      '..khhhhhhhhq..',
      '..jhhhhhhhjj..',
      '...jjhhhhjj...',
    ]),
    side: at(0, [
      '...h..h.h.....',
      '..hhhhHhhh....',
      '.hhhhhhhhYY...',
      '.hHhhtttYLlY..',
      '.hhhhhhhhyy...',
      '..hhhhhKkxkk..',
      '..hhhhkkkkkk..',
      '..hhhhkkkkek..',
      '..jhhqkkkkek..',
      '...jjqkkkkcx..',
    ]),
  },
  torso: {
    down: at(10, ['...SsAAaasn...', '...SAaWaazn...', '...sAawaazn...', '...Aaraaaaz...', '...Aazaaaaz...']),
    up: at(10, ['...SSsssssn...', '...Sssssssn...', '...ssssssnn...', '...zaaAAaaz...', '...Pppppppo...']),
    side: at(10, ['....SssAan....', '....SssAWa....', '....sssAwa....', '....AaaaraW...', '....Aaaaaaz...']),
  },
  arms: { down: armsFront('Skk', 'nkq'), up: armsFront('Skk', 'nkq'), side: armsSide(['Ss', 'kq', 'kq']) },
  farArm: farArmSide('n', 'q'),
  extras: (dir, f) => {
    // the wind-up key on the clockwork box turns
    const k = f.t % 2 === 0 ? 'i.i' : '.i.';
    const box = (x: number, y: number) => at(y, [k, '.i.', 'GGg', 'gZg'].map((r) => '.'.repeat(x) + r));
    if (dir === 'down') return [{ rows: box(11, 7), bob: true, front: true }];
    if (dir === 'up') return [{ rows: box(0, 7), bob: true, front: true }];
    return [{ rows: box(3, 7), bob: true, front: true }];
  },
};

// ---------------------------------------------------------------------------
// Apiarist: cream bee-hat with a gold band and a mesh veil falling to the
// shoulders, puffy white suit with a honey drip, gold gloves, a bee buzzing.

const APIARIST_L: Legend = {
  W: 'white', w: 'cream', a: 'mist', g: 'gold', G: 'amber',
  M: 'mist', f: 'fog', n: 'dusk', Z: 'storm',
  k: 'clay', K: 'skin', e: 'umber',
  S: 'white', s: 'mist', z: 'fog', H: 'gold', h: 'amber',
  p: 'white', P: 'white', o: 'mist', b: 'wood', B: 'clay', d: 'bark',
  y: 'gold', u: 'coal', i: 'white',
};

const APIARIST: HeroArt = {
  head: {
    down: at(0, [
      '.....WWww.....',
      '....WWwwwa....',
      '...WgggggGa...',
      '.WWwwwwwwwwaa.',
      '..nnnnnnnnnn..',
      '..MfnKkkknfn..',
      '..Mfkekkekfn..',
      '..Mfkekkekfn..',
      '..MfnkkkknfZ..',
      '..MMffffffnn..',
    ]),
    up: at(0, [
      '.....WWww.....',
      '....WWwwwa....',
      '...WgggggGa...',
      '.WWwwwwwwwwaa.',
      '..MMMMMMMMnn..',
      '..MffMfffMnn..',
      '..MffMffffMn..',
      '..MffMffffMn..',
      '..MffMffffMn..',
      '..MMffffffnn..',
    ]),
    side: at(0, [
      '......WWww....',
      '.....WWwwwa...',
      '....WgggggGa..',
      '..WWwwwwwwwwaa',
      '...nnnnnnnnnn.',
      '...MffffffKkn.',
      '...MfffffkkeM.',
      '...MfffffkkeM.',
      '...MffffffkkM.',
      '...MMffffffnn.',
    ]),
  },
  torso: {
    down: at(10, ['...SSSzSSSs...', '..SSSSzSHSss..', '..SSSSzShSss..', '..SSSSzSSSss..', '...sSSzSSsz...']),
    up: at(10, ['...SSSSSSSs...', '..SSSSSSSSss..', '..SSSSzSSSss..', '..SSSSzSSSss..', '...sSSzSSsz...']),
    side: at(10, ['....SSSSSs....', '...SSSSSSss...', '...SSSSSHss...', '...SSSSSShs...', '....SSSSsz....']),
  },
  arms: { down: armsFront('SSH', 'ssh', 1, 12), up: armsFront('SSH', 'ssh', 1, 12), side: armsSide(['Ss', 'Ss', 'Hh']) },
  farArm: farArmSide('z', 'h'),
  extras: (dir, f) => {
    // a bee loops about the hat brim
    const path = dir === 'down' ? [[11, 1], [12, 0], [12, 2], [11, 0]] : dir === 'up' ? [[1, 1], [0, 0], [0, 2], [1, 0]] : [[0, 1], [1, 0], [0, 2], [1, 1]];
    const [x, y] = path[f.t % 4];
    return [{ rows: at(y, ['.'.repeat(x) + 'i.', '.'.repeat(x) + 'yu']), bob: false, front: true }];
  },
};

// ---------------------------------------------------------------------------
// Rootspeaker: old and sturdy, a carved bark mask with ember eyes, twig
// antlers with a leaf, long white hair and beard, a bright moss shawl over a
// brick-red robe.

const ROOTSPEAKER_L: Legend = {
  T: 'clay', t: 'wood', u: 'bark', l: 'sprout',
  K: 'clay', k: 'wood', q: 'bark', y: 'gold', Y: 'amber',
  W: 'white', w: 'mist', v: 'fog',
  M: 'lime', m: 'sprout', n: 'moss',
  R: 'rust', r: 'brick', X: 'blood',
  p: 'blood', P: 'brick', o: 'maroon', b: 'bark', B: 'wood', d: 'loam',
};

const ROOTSPEAKER: HeroArt = {
  head: {
    down: at(0, [
      '.T.T......T.l.',
      '..Tt......tT..',
      '.TTt......tTu.',
      '...ttwwwwtu...',
      '..wKKkkkkkqv..',
      '..wKkqkkqkqv..',
      '..wkyYkkyYqv..',
      '..wkkkqqkkqv..',
      '..vkWWwwWWqv..',
      '...WWwwwwwv...',
    ]),
    up: at(0, [
      '.l.T......T.T.',
      '..Tt......tT..',
      '.TTt......tTu.',
      '...ttwwwwtu...',
      '..wwWwwwwwwv..',
      '..wWwwvwwwvv..',
      '..wwwwvwwvwv..',
      '..wwwvwwwvvv..',
      '..vwwvwwwvvv..',
      '...vwwwwwvv...',
    ]),
    side: at(0, [
      '...T.l..T.....',
      '...Tt..TtT....',
      '....tTtTu.....',
      '....wttuw.....',
      '...wwwKKkkq...',
      '..wwwwKkqkk...',
      '..wwwwkkkyYk..',
      '..wwwwkkqkkkq.',
      '..vwwwwkkWWw..',
      '...vwwwWWwwv..',
    ]),
  },
  torso: {
    down: at(10, ['..MmmWWwwmmn..', '.MMmmmWwvmmnn.', '.nmmnmmwvmnnn.', '..RrrrrrrrrX..', '..RrrrrrrrrX..', '..RrrrrXrrrX..']),
    up: at(10, ['..Mmmwwwwmmn..', '.MMmmmwwvmmnn.', '.nmmnmmvmmnnn.', '..RrrrrrrrrX..', '..RrrrrrrrrX..', '..RrrrrXrrrX..']),
    side: at(10, ['...MmmmWWwn...', '..MMmmmmWwvn..', '..nmmnmmmwnn..', '...RrrrrrrX...', '...RrrrrrrX...', '...RrrrrrrXX..']),
  },
  arms: { down: armsFront('MRk', 'nXq', 1, 12), up: armsFront('MRk', 'nXq', 1, 12), side: armsSide(['mn', 'Rr', 'kq']) },
  farArm: farArmSide('X', 'q'),
};

// ---------------------------------------------------------------------------
// Strawman: a friendly living scarecrow. Golden burlap head with button eyes
// and a stitched smile, little rust bowler, straw ruff at the collar and
// straw tufts for hands, patched red waistcoat over a sky-blue shirt.

const STRAWMAN_L: Legend = {
  A: 'rust', a: 'brick', X: 'blood', g: 'gold',
  S: 'peach', s: 'wheat', z: 'clay', Z: 'wood', e: 'loam', E: 'wood', m: 'bark', c: 'salmon',
  y: 'butter', Y: 'gold', x: 'bark',
  V: 'red', v: 'crimson', u: 'wine', j: 'wheat', G: 'gold',
  F: 'sky', f: 'blue', n: 'navy',
  p: 'dusk', P: 'fog', o: 'storm', b: 'bark', B: 'wood', d: 'loam',
};

const STRAWMAN: HeroArt = {
  head: {
    down: at(0, [
      '.....AAaa.....',
      '.....AggaX....',
      '...AAaaaaaaX..',
      '..ySSsssssZy..',
      '...Sssssssz...',
      '...SEessEez...',
      '...Seesseez...',
      '...Smssssmz...',
      '...zcmmmmcz...',
      '....zssssz....',
    ]),
    up: at(0, [
      '.....AAaa.....',
      '.....AggaX....',
      '...AAaaaaaaX..',
      '..ySSsssssZy..',
      '...SsssZssz...',
      '...SsssZssz...',
      '...SsssZssz...',
      '...SsssZssz...',
      '...zsssZssz...',
      '....zssssz....',
    ]),
    side: at(0, [
      '......AAaa....',
      '......AggaX...',
      '....AAaaaaaaX.',
      '...ySSssssZy..',
      '...Ssssssssz..',
      '...SssssssEe..',
      '...Ssssssseez.',
      '...Ssssssssmz.',
      '...zssssscmm..',
      '....zsssssz...',
    ]),
  },
  torso: {
    down: at(10, ['.yYyxxxxxxyYy.', '...FVvvGvuf...', '...FVjjGvuf...', '...FVvvGvuf...', '...Pppppppo...']),
    up: at(10, ['.yYyxxxxxxyYy.', '...FVvvvvuf...', '...FVvvvvuf...', '...FVvGGvuf...', '...Pppppppo...']),
    side: at(10, ['...yYxxxxyY...', '....FVvGvu....', '....FVjjvu....', '....FVvGvu....', '....Ppppppo...']),
  },
  arms: { down: armsFront('Ffy', 'fnY'), up: armsFront('Ffy', 'fnY'), side: armsSide(['Ff', 'fn', 'yY']) },
  farArm: farArmSide('n', 'Y'),
};

// ---------------------------------------------------------------------------
// Forager: a big wicker backpack basket (mushroom and fern sticking out of
// it), a pointed pine cap with a white feather and a toadstool tucked in, a
// brown cloak with moss lining.

const FORAGER_L: Legend = {
  T: 'moss', t: 'pine', N: 'teal',
  F: 'white', f: 'pebble',
  R: 'red', r: 'crimson', i: 'white', I: 'cream',
  h: 'bark', H: 'wood', j: 'loam',
  k: 'skin', K: 'peach', q: 'clay', e: 'umber', c: 'salmon',
  A: 'wood', a: 'bark', z: 'loam', g: 'moss', G: 'pine',
  W: 'wheat', w: 'clay', u: 'wood', U: 'bark', l: 'leaf', L: 'sprout', s: 'loam',
  p: 'pine', P: 'moss', o: 'teal', b: 'bark', B: 'wood', d: 'loam',
};

const BASKET_BACK = ['WWWWWWWWWWWWWW', 'wwuwwuwwuwwuwU', 'WWuWWuWWuWWuwU', 'wwuwwuwwuwwuwU', 'WWuWWuWWuWWuwU', 'wwuwwuwwuwwuwU', 'WWuWWuWWuWWuwU', 'wwuwwuwwuwwuwU', 'WWuWWuWWuWWuwU', 'UUUUUUUUUUUUUU'];

const FORAGER: HeroArt = {
  head: {
    down: at(0, [
      '...........F..',
      '......tT..Ff..',
      '....TTtttFf...',
      '...RTTttttN...',
      '..hRihhhhhhh..',
      '..hIhKkkkkhh..',
      '..hkkkkkkkkj..',
      '..hkekkkkekq..',
      '..jkekqkkekq..',
      '...kckkkkcq...',
    ]),
    up: at(0, [
      '..F...........',
      '..fF..tTt.....',
      '...fFTTtttt...',
      '...NttttttRR..',
      '..hhHhhhhhRIh.',
      '..hHhhhhhhhh..',
      '..hhhhhhhhhj..',
      '..khhhhhhhhq..',
      '..jhhhhhhhjj..',
      '...jjhhhhjj...',
    ]),
    side: at(0, [
      '.F............',
      '.fF...TTt.....',
      '..fFTTttttt...',
      '...RRttttttN..',
      '...IihhhhKkk..',
      '...hhhhhKkkk..',
      '...hhhhkkkkkk.',
      '...hhhhkkkkek.',
      '...jhhqkkkkek.',
      '....jjkkkkcq..',
    ]),
  },
  torso: {
    down: at(10, ['..AAsggggsaz..', '..AAsgGGgsaz..', '..AasggGgsaz..', '..Aaauuuuaaz..', '..Aaagggaaaz..']),
    up: at(10, ['..AAaaaaaaaz..', '..AAaaaaaaaz..', '..Aaaaaaaaaz..', '..Aaaaaaaaaz..', '..Aaaaaaaaaz..']),
    side: at(10, ['....AsaagzG...', '....Asaggaz...', '....Aagggz....', '....Auuuua....', '....Aaaaaz....']),
  },
  arms: { down: armsFront('Aak', 'zzq', 1, 12), up: armsFront('Aak', 'zzq', 1, 12), side: armsSide(['Aa', 'Aa', 'kq']) },
  farArm: farArmSide('z', 'q'),
  extras: (dir) => {
    if (dir === 'down') return [{ rows: at(3, BASKET_BACK), bob: true, front: false }];
    if (dir === 'side')
      return [{ rows: at(1, ['.L....', 'lRr...', ...BASKET_BACK.map((r) => r.slice(0, 5) + 'U')]), bob: true, front: false }];
    return [
      {
        rows: at(1, ['..L.......l...', '.lLRr....lLl..', ...BASKET_BACK.map((r) => '.' + r.slice(0, 11) + 'U.'), '..............']),
        bob: true,
        front: true,
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Miller: round and broad, floppy white baker's cap, a flour-dusted
// moustache, rosy cheeks, rust shirt with rolled sleeves, white apron.

const MILLER_L: Legend = {
  C: 'white', c: 'mist', N: 'fog',
  h: 'wood', H: 'clay', j: 'bark',
  k: 'skin', K: 'peach', q: 'clay', e: 'umber', r: 'salmon', m: 'wood', W: 'white',
  S: 'rust', s: 'brick', x: 'blood',
  A: 'white', a: 'cream', z: 'mist',
  p: 'wood', P: 'clay', o: 'bark', b: 'loam', B: 'bark', d: 'umber',
};

const MILLER: HeroArt = {
  head: {
    down: at(0, [
      '....CCCccc....',
      '..CCCCccccccN.',
      '..CCcccccccNNN',
      '..ccccccccNNN.',
      '..NNNNNNNNN.N.',
      '..hKkkkkkkkh..',
      '..hkekkkkekh..',
      '..hkekkkkekq..',
      '..hrkmmmmkrq..',
      '...kmWmmWmq...',
    ]),
    up: at(0, [
      '....CCCccc....',
      '.CCCCCccccN...',
      'CCCccccccNN...',
      '.CccccccNNNN..',
      '.N.NNNNNNNNN..',
      '..hhhhhhhhhh..',
      '..hHhhhhhhhj..',
      '..khhhhhhhhq..',
      '..jhhhhhhhjj..',
      '...kkkkkkkq...',
    ]),
    side: at(0, [
      '.....CCCcc....',
      '..NCCCCcccc...',
      '.NNCCccccccN..',
      '..NccccccccN..',
      '...NNNNNNNN...',
      '...hhhhKkkkk..',
      '...hhhkkkkek..',
      '...hhhkkkkek..',
      '...hhqkkkmmmr.',
      '....hkkkmWmm..',
    ]),
  },
  torso: {
    down: at(10, ['..SSAAAAAazs..', '..WsAAaaaazs..', '..sAAaaaaazs..', '..sAaaaaaazs..', '...Aaaaaaaz...']),
    up: at(10, ['..SSssssssxs..', '..SSssssssxs..', '..Sssssssssx..', '..zaaaAAaaaz..', '...PppAapppo..']),
    side: at(10, ['...SSsAAaz....', '...SWsAaaaz...', '...ssAaaaaz...', '...ssAaaaaz...', '....sAaaaz....']),
  },
  arms: { down: armsFront('Skk', 'xkq', 1, 12), up: armsFront('Skk', 'xkq', 1, 12), side: armsSide(['Ss', 'kq', 'kq']) },
  farArm: farArmSide('x', 'q'),
};

// ---------------------------------------------------------------------------
// Witch: tall crooked violet hat with a moonberry sprig on the band, long
// blue-black hair, pale skin, starry night shawl over a plum dress.

const WITCH_L: Legend = {
  V: 'violet', v: 'purple', I: 'indigo', U: 'ultra', n: 'midnight', M: 'ice', N: 'white', g: 'sprout',
  h: 'abyss', H: 'night', j: 'deep',
  k: 'peach', K: 'cream', q: 'skin', e: 'abyss', l: 'rose', c: 'salmon',
  A: 'dusk', a: 'storm', z: 'night', x: 'ice',
  R: 'magenta', r: 'mauve', u: 'plum',
  p: 'plumdark', P: 'plum', o: 'deep', b: 'night', B: 'storm', d: 'abyss',
};

const WITCH: HeroArt = {
  head: {
    down: at(0, [
      '..........vI..',
      '........VvvI..',
      '.......VvvI...',
      '......VvvvIg..',
      '....nnnnMNn...',
      '.VVvvvvvvvvII.',
      '..hhhKkkkhhj..',
      '..hkekkkkekj..',
      '..hkekkkkekj..',
      '..hhkcllckhj..',
    ]),
    up: at(0, [
      '..Vv..........',
      '...vvvI.......',
      '...VvvvI......',
      '...VvvvvI.....',
      '...nnnnnnnn...',
      '.VVvvvvvvvvII.',
      '..hhHhhhhhhj..',
      '..hHhhhhhhhj..',
      '..hhhhhhhhjj..',
      '..hhhhhhhhjj..',
    ]),
    side: at(0, [
      '..........Vv..',
      '........VvvI..',
      '.......VvvI...',
      '......VvvvIg..',
      '.....nnnnnMN..',
      '..VVvvvvvvvvII',
      '...hhhhhKkkk..',
      '...hhhhkkkek..',
      '...hhhhkkkek..',
      '...hhhhhkkl...',
    ]),
  },
  torso: {
    down: at(10, ['..hAaaaxaazj..', '..hAxaaaaaxj..', '..jrzaaaazrj..', '...Rrrzzrru...', '...Rrrrrrru...']),
    up: at(10, ['..Ahhhhhhhhz..', '..Axhhhhhhxz..', '...zjhhhhjz...', '...Rrrrrrru...', '...Rrrrrrru...']),
    side: at(10, ['...hhAaxaz....', '...hhAaaxa....', '...hjzaaaz....', '....Rrrrru....', '....Rrrrrru...']),
  },
  arms: { down: armsFront('Aak', 'zzq', 1, 12), up: armsFront('Aak', 'zzq', 1, 12), side: armsSide(['Aa', 'Az', 'kq']) },
  farArm: farArmSide('z', 'q'),
};

// ---------------------------------------------------------------------------
// Ploughman: an ox of a man. Low grey flat cap, bushy beard, cream sleeveless
// vest with red braces, enormous bare arms that stand out from the body.

const PLOUGHMAN_L: Legend = {
  C: 'stone', c: 'slate', N: 'ash',
  h: 'bark', H: 'wood', j: 'loam',
  k: 'skin', K: 'peach', q: 'clay', Q: 'wood', e: 'umber', r: 'salmon',
  t: 'cream', u: 'pebble', R: 'red', x: 'crimson', G: 'gold',
  p: 'wood', P: 'clay', o: 'bark', b: 'loam', B: 'bark', d: 'umber',
};

// Two-pixel-wide arms, hanging away from the body.
const PLOUGH_ARMS_FRONT: Record<'n' | 'f' | 'b', string[]> = {
  n: at(10, ['Kk..........qQ', 'Kk..........qQ', 'Kk..........qQ', 'kq..........qQ']),
  f: at(10, ['Kk..........qQ', 'Kk..........qQ', 'Kk..........qQ', 'Kk............', 'kq............']),
  b: at(10, ['Kk..........qQ', 'Kk..........qQ', 'kq..........qQ', '............qQ', '............qQ']),
};

const PLOUGHMAN: HeroArt = {
  head: {
    down: at(0, [
      '..............',
      '...CCCCcccN...',
      '..CCCcccccNN..',
      '..NNNNNNNNNNN.',
      '..hjkkkkkkjh..',
      '..hKkkkkkkkh..',
      '..hkekkkkekh..',
      '..hkekkkkekq..',
      '..hhrkQQkrhh..',
      '..hhhhhhhhhh..',
    ]),
    up: at(0, [
      '..............',
      '...CCCCcccN...',
      '..CCCcccccNN..',
      '..cccccccccN..',
      '..hhhhhhhhhh..',
      '..hHhhhhhhhj..',
      '..khhhhhhhhq..',
      '..hkkkkkkkkh..',
      '..hkkkkkkkqh..',
      '...kkkkkkkq...',
    ]),
    side: at(0, [
      '..............',
      '....CCCCccN...',
      '...CCCccccNNN.',
      '...cccccccNNNN',
      '...hhhkkkkkk..',
      '...hhhKkkkkk..',
      '...hhhkkkkek..',
      '...hhqkkkkek..',
      '...hhhhhrkQh..',
      '....hhhhhhhh..',
    ]),
  },
  torso: {
    down: at(10, ['..tthhhhhhtu..', '..tRthhhhtRu..', '..tRtthhttRu..', '..pGpppppoGo..', '..Ppppppppoo..']),
    up: at(10, ['..ttRttttRtu..', '..tttRttRttu..', '..ttttRRtttu..', '..pppGppGpoo..', '..Ppppppppoo..']),
    side: at(10, ['...tttthhhh...', '...ttRtthhh...', '...ttRttthu...', '...ppGpppoo...', '...Pppppppo...']),
  },
  arms: {
    down: PLOUGH_ARMS_FRONT,
    up: PLOUGH_ARMS_FRONT,
    side: {
      n: at(10, ['.....Kkq......', '.....Kkq......', '.....Kkq......', '.....kkq......']),
      f: at(10, ['.....Kkq......', '......Kkq.....', '.......Kkq....', '........kq....']),
      b: at(10, ['.....Kkq......', '....Kkq.......', '...Kkq........', '...kq.........']),
    },
  },
  farArm: farArmSide('Q', 'Q'),
};

// ---------------------------------------------------------------------------
// Alchemist: a wild frizz of orange hair with singed tips, sooty singed
// brows, mismatched aqua and coral lenses, long bottle-green coat with a
// bandolier of coloured vials.

const ALCHEMIST_L: Legend = {
  h: 'orange', H: 'gold', j: 'rust', J: 'ash',
  k: 'skin', K: 'peach', q: 'clay', E: 'coal', c: 'salmon', m: 'bark',
  L: 'aqua', l: 'cyan', R: 'coral', r: 'crimson', Y: 'slate', i: 'white',
  M: 'pine', n: 'marsh', N: 'teal',
  S: 'wood', s: 'bark', v: 'red', V: 'aqua', g: 'lime', u: 'violet',
  p: 'loam', P: 'bark', o: 'umber', b: 'bark', B: 'wood', d: 'loam',
};

const ALCHEMIST: HeroArt = {
  head: {
    down: at(0, [
      '..h.hH.Hh.h...',
      '.hhHhHhHhhhhj.',
      'hhHHhhhhhhhjjj',
      'JhHhhhhhhhhjjJ',
      '.hhhKkkkkkhjj.',
      '.hhEEkkkkEEjj.',
      '.hhkiLYYiRkjj.',
      '.jhkLlkkRrkjJ.',
      '..jkkkqkkkkj..',
      '...kckmmkcq...',
    ]),
    up: at(0, [
      '..h.hH.Hh.h...',
      '.hhHhHhHhhhhj.',
      'hhHHhhhhhhhjjj',
      'JhHhhhhhhhhjjJ',
      '.hhHhhhhhhhjj.',
      '.hhhhhhhhhjjj.',
      '.hhhhhhhhhhjj.',
      '.jhhhhhhhhjjJ.',
      '..jkhhhhhhqj..',
      '...kkkkkkkq...',
    ]),
    side: at(0, [
      '..h.hH.h......',
      '.hhHhHhhhh....',
      'hhHHhhhhhhh...',
      'JhHhhhhhhhhj..',
      '.hhhhhhKkkkk..',
      '.hhhhhkkkEEk..',
      '.hhhhhkkYiLk..',
      '.jhhhhkkkLlk..',
      '..jhhqkkkkkq..',
      '...jjqkkkkc...',
    ]),
  },
  torso: {
    down: at(10, ['...SsvMMMMMn..', '...MMSsVMMMn..', '...MMMMSsgMn..', '...MMMMMMSsn..', '..MMMMMNMMnn..', '..MMMMMnMMnn..']),
    up: at(10, ['...MMMMMMSsn..', '...MMMMSsMMn..', '...MMSsMMMMn..', '...SsMMMMMMn..', '..MMMMMNMMnn..', '..MMMMMnMMnn..']),
    side: at(10, ['....MMSsvn....', '....MMMSsV....', '....MMMMSs....', '....MMMMMn....', '...MMMMMMnn...', '...MMMMMMMnn..']),
  },
  arms: { down: armsFront('MMk', 'nnq'), up: armsFront('MMk', 'nnq'), side: armsSide(['MN', 'MN', 'kq']) },
  farArm: farArmSide('n', 'q'),
};

// ---------------------------------------------------------------------------
// Held weapons for the nine further classes, pointing right, origin on the
// grip. `grip(x, y, w, h)` turns a drawing pixel into an origin fraction of the
// outlined frame.
const grip = (x: number, y: number, w: number, h: number): [number, number] => [(x + 1.5) / (w + 2), (y + 1.5) / (h + 2)];

const HELD9: SpriteDef[] = [
  // Stubby brass rivet gun: riveted barrel, slate muzzle ring, a crank on top
  // and a wooden pistol grip. Grip at drawing (3,7).
  sprite(
    'held_rivet',
    { Y: 'gold', y: 'amber', g: 'clay', o: 'butter', I: 'slate', i: 'coal', n: 'ash', W: 'clay', B: 'wood', b: 'bark', d: 'loam', c: 'rust' },
    [[
      '....Wb......',
      '.....n......',
      '..YYYnYYYy..',
      '.cyyyyyyyyIi',
      '.cyoyyoyyyIi',
      '..gggggggg..',
      '..WBb.......',
      '..BBb.......',
      '...Bd.......',
    ]],
    { outline: true, origin: grip(3, 7, 12, 9) },
  ),
  // Bee smoker: leather bellows behind a tin can, a conical lid and a curl of
  // smoke at the nozzle. Grip on the bellows, drawing (1,4).
  sprite(
    'held_smoker',
    { W: 'clay', w: 'wood', b: 'bark', P: 'pebble', s: 'stone', S: 'slate', n: 'ash', o: 'amber', O: 'gold', M: 'white', m: 'mist', f: 'fog' },
    [[
      '...........mM',
      '...PPPPPs..m.',
      'WWwPssssSS.f.',
      '.bbPsoossSSn.',
      '.wbPsOossSSnm',
      '.bbPssssSSn..',
      'wwbPssssSS...',
      '...sSSSSS....',
    ]],
    { outline: true, origin: grip(1, 4, 13, 8) },
  ),
  // Gnarled rootstaff: knotted shaft whose head splits into curling roots
  // cradling an amber seed. Grip at drawing (3,4).
  sprite(
    'held_rootstaff',
    { T: 'clay', t: 'wood', u: 'bark', U: 'loam', y: 'gold', Y: 'amber', l: 'sprout' },
    [[
      '...............uu...',
      '.............uu..u..',
      '..........l.u.tT.u..',
      'TTtTTttTTtTttTtyYu..',
      'uuttuUuttuutuuTYtu.u',
      '...........U..u.uu.u',
      '...............u..u.',
    ]],
    { outline: true, origin: grip(3, 3.5, 20, 7) },
  ),
  // Three-tined pitchfork on an ash pole, iron collar. Grip at drawing (2,4).
  sprite(
    'held_pitchfork',
    { W: 'wheat', w: 'clay', b: 'wood', d: 'bark', I: 'slate', S: 'pebble', s: 'stone', H: 'white' },
    [[
      '............sSSSSSH.',
      '............I.......',
      '............I.......',
      'WWwwwwwwwwwwISSSSSSH',
      'dbbbbbbbbbbdIsssss..',
      '............I.......',
      '............I.......',
      '............sSSSSSH.',
    ]],
    { outline: true, origin: grip(2, 3.5, 20, 8) },
  ),
  // Forked walking stick with a holed hag-stone charm on a string. Grip at
  // drawing (2,3).
  sprite(
    'held_stick',
    { B: 'clay', b: 'wood', d: 'bark', s: 'loam', P: 'pebble', p: 'stone', o: 'slate', i: 'ash' },
    [[
      '..............Bb',
      '.............Bb.',
      '............Bb..',
      'BBbbBbbBbbbBb...',
      'ddbddbdddbdbd...',
      '...........s.bd.',
      '...........s..bd',
      '..........PPp...',
      '..........PiP...',
      '..........pPo...',
    ]],
    { outline: true, origin: grip(2, 3.5, 16, 10) },
  ),
  // Miller's grain scoop: wooden handle and a deep scoop heaped with wheat.
  // Grip at drawing (2,4).
  sprite(
    'held_chaff',
    { W: 'clay', w: 'wood', b: 'bark', d: 'loam', y: 'butter', Y: 'gold', g: 'wheat', G: 'amber' },
    [[
      '..........yY.....',
      '........yYgyYy...',
      '.......YgGygGgY..',
      '......WwwwwwwwwwW',
      'WWwwwwwbwwwwwwwwb',
      'dbbbbbbbbwwwwwwbd',
      '.........bbbbbbd.',
    ]],
    { outline: true, origin: grip(2, 4.5, 17, 7) },
  ),
  // Moonstaff: slim dark staff with a silver ring, a glowing moonberry held in
  // two leaves. Grip at drawing (2,3).
  sprite(
    'held_moonstaff',
    { b: 'bark', d: 'loam', M: 'mist', g: 'sprout', G: 'moss', I: 'ice', i: 'aqua', W: 'white', c: 'cyan' },
    [[
      '.............gI.....',
      '............GIWIi...',
      '...........gIWWIic..',
      'bbbbbbbbbbbMIIIIic..',
      'ddddddddddMdIiiic...',
      '...........G.icc....',
    ]],
    { outline: true, origin: grip(2, 3.5, 20, 6) },
  ),
  // Plough: a heavy iron share and mouldboard bolted to a thick handle, chips
  // of rust. Grip at drawing (2,5).
  sprite(
    'held_plough',
    { W: 'wheat', w: 'clay', b: 'wood', d: 'bark', H: 'white', P: 'pebble', s: 'stone', S: 'slate', n: 'ash', r: 'rust', o: 'butter' },
    [[
      '..........PPP.....',
      '.........PssSn....',
      '.........PssSSn...',
      '.........PsrsSn...',
      'WWwwwwwwwPssssSn..',
      'WwwwwwwwwPsosSSn..',
      'dbbbbbbbbPsssSSSn.',
      '.........PsssrSSn.',
      '.........HPsssSSSn',
      '..........HHPPssSn',
      '............HHHPPS',
    ]],
    { outline: true, origin: grip(2, 5, 18, 11) },
  ),
  // Round-bottomed flask held by the neck: cork, glass and a bubbling lime
  // brew. Grip on the neck, drawing (2,4).
  sprite(
    'held_flask',
    { C: 'clay', c: 'wood', m: 'mist', f: 'fog', W: 'white', l: 'lime', L: 'sprout', g: 'leaf', G: 'moss' },
    [[
      '.....mmmm..',
      '....mWWfmm.',
      '...mWlLlgfm',
      'Ccmmllalglf',
      'CcmmLlLglgf',
      'Ccmmlglggff',
      '...mgLglGf.',
      '....fggGf..',
      '.....fff...',
    ]].map((f) => f.map((r) => r.replace('a', 'W'))),
    { outline: true, origin: grip(2, 4, 11, 9) },
  ),
];

// ---------------------------------------------------------------------------
// The Tinkerer's sprinkler turret: a riveted copper water tank with a glass
// gauge on a wooden deck, three stubby legs, and a swivelling brass nozzle on
// top. Frame 1 puffs a little spray.
const TURRET_L: Legend = {
  Y: 'gold', y: 'amber', g: 'clay', R: 'orange', r: 'rust', x: 'brick', X: 'blood', o: 'butter',
  W: 'clay', w: 'wood', b: 'bark', d: 'loam', c: 'cyan', C: 'sky', i: 'ice', I: 'white', n: 'slate',
};
const TURRET = [
  '....YYYy....',
  '...YyyyyYn..',
  '....gYyg....',
  '...RRRRrr...',
  '..RrorrrorX.',
  '..RriCrrrrx.',
  '..RrcCrrrrx.',
  '..Rrorrrorx.',
  '...xxxxxxx..',
  '.WWWwwwwwwb.',
  '.dbbbbbbbbd.',
  '..wd.wd.wd..',
  '..wd.wd.wd..',
  '..dd.dd.dd..',
];
const TURRET_SPRAY = ['..........iI', '...........C', '..........c.'];
const TURRETS: SpriteDef[] = [
  sprite('p_turret', TURRET_L, [TURRET, overlay(TURRET, TURRET_SPRAY, 0, 0)], { outline: true, origin: [0.5, 1], fps: 4 }),
];

// ---------------------------------------------------------------------------
// Portraits for the nine further classes (32x32 after outline).

const PORTRAITS9: SpriteDef[] = [
  // Tinkerer: spiky soot-black hair, brass goggles pushed up, soot smudges, tool apron, a wind-up box on the shoulder.
  sprite(
    'portrait_tinkerer',
    { h: 'ash', H: 'slate', j: 'coal', Y: 'gold', y: 'amber', L: 'cyan', l: 'sky', i: 'ice', t: 'bark', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', e: 'umber', E: 'white', c: 'salmon', m: 'bark', x: 'stone', S: 'fog', s: 'dusk', n: 'storm', A: 'clay', a: 'wood', z: 'bark', Z: 'loam', W: 'pebble', w: 'slate', G: 'gold', g: 'amber' },
    [
      [
        '..........h...h....h..........',
        '........h.hh.hhh..hh..h.......',
        '.......hhhhhhhhhhhhhhhh.......',
        '......hhHHhhhhhhhhhhhhhj......',
        '.....hhHHhhhhhhhhhhhhhhjj.....',
        '.....hhhYYYYhhhhhYYYYhhjj.....',
        '....hh.YyiLyY...YyiLyY..jj....',
        '....tt.YLllyYYyyYLllyY.ttt....',
        '.....h.YllllYkkkYllllYk.j.....',
        '.....hkkyyyykkkkkyyyykkkj.....',
        '......kkkkkkkkkkkkkkkqqq......',
        '......kkkjjjkkkkkkjjjqqq......',
        '......kKkkEekkkkkkEekqqq......',
        '.....kkKKkeekkkkkkeekqqqk.....',
        '....kqkkKkeQkkkkkkeQkqqqqk....',
        '....kqkkkkkkkkkqkkkkkqqqqk....',
        '.....kkkcckkkkQkkkkkccqqk.....',
        '......kkkkkkkkkkkkkkxqqq.n.n..',
        '......kkkkkkmkkkkmkkqqqq..n...',
        '......kkkkkkkmEmmkkkqqqqGGGGg.',
        '.......kkkkkkkkkkkkkqqqGGgygg.',
        '........kkkkkkkkkkkqqq.Gg.ggZ.',
        '.......SSzkkkkkkkkkqznngggggZ.',
        '....SSssszssqqqqqqssznnnZZZZ..',
        '..SSssssszssswssssssznnnnnnn..',
        '.SssssssszAAAWAAAAAAznnnnnnnn.',
        '.sssssssszaazzzzZZZZznnnnnnnn.',
        'ssssssssszaazWwzZZZZznnnnnnnnn',
        'ssssssssszaaaaaaZZZZznnnnnnnnn',
        'ssssssssszaaaaaaZZZZznnnnnnnnn',
      ],
    ],
    { outline: true },
  ),
  // Apiarist: domed bee-hat with a gold band, a friendly face behind the mesh veil, puffy suit with a honey drip, two bees.
  sprite(
    'portrait_apiarist',
    { W: 'white', w: 'cream', a: 'mist', g: 'gold', G: 'amber', M: 'mist', f: 'fog', F: 'dusk', N: 'fog', n: 'dusk', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', e: 'umber', E: 'white', c: 'salmon', m: 'bark', S: 'white', s: 'mist', z: 'fog', H: 'gold', h: 'amber', y: 'gold', u: 'coal', i: 'white' },
    [
      [
        '............WWwwww............',
        '....i.....WWWwwwwwwa..........',
        '...yuy...WWwwwwwwwwwa.........',
        '.........WWwwwwwwwwaa.........',
        '........gggggggggggggG........',
        '...WWWWwwwwwwwwwwwwwwwwwwaa...',
        '..aawwwwwwwwwwwwwwwwwwwwaaa...',
        '....nnnnnnnnnnnnnnnnnnnnnn....',
        '....MfMnnnnnnnnnnnnnnnnFfN....',
        '....MfMffffkkkkkkkqfFFFFfi....',
        '....MfMffkkkkkkkkkqqqFFFfyu...',
        '....MfMfkKkkkkkkkkqqqqFFfNy...',
        '....MfMfkKEekkkkkkEeqqFFfN....',
        '....MfMfkkeekkkkkkeeqqFFfN....',
        '....MfMfkkeQkkkkkkeQqqFFfN....',
        '....MfMfkkkkkkkqkkqqqqFFfN....',
        '....MfMffcckkkkkkkqccFFFfN....',
        '....MfMfffkkkmkkmkqqFFFFfN....',
        '....MfMfffffkkmmkkffFFFFfN....',
        '....MfMfffffffffffffFFFFfN....',
        '....MMMMMMMMMMMMMMMMNNNNNN....',
        '.....MMMMMMMMMMMMMMMNNNNN.....',
        '....SWWSSSSSSSzSSSSsssssss....',
        '..SWWSSSSSSSSSzSSSSsssssssss..',
        '.SSSSSSSSSSSSSzSSSSsssssszzzz.',
        '.SSSSSSSSSSSSSzSSSHsssssszzzz.',
        'SSSSSSSSSSSSSSzSSShsssssszzzzz',
        'SSSSSSSSSSSSSSzSSShsssssszzzzz',
        'SSSSSSSSSSSSSSzSSSShssssszzzzz',
        '..............z...............',
      ],
    ],
    { outline: true },
  ),
  // Rootspeaker: twig antlers with new leaves, carved bark mask with ember eyes, long white hair and beard, moss shawl.
  sprite(
    'portrait_rootspeaker',
    { T: 'clay', t: 'wood', u: 'bark', l: 'sprout', L: 'lime', K: 'clay', k: 'wood', q: 'bark', Q: 'loam', y: 'gold', Y: 'amber', W: 'white', w: 'mist', v: 'fog', M: 'lime', m: 'sprout', n: 'moss', r: 'brick', X: 'blood' },
    [
      [
        '.T.T.................T.lL.....',
        '..TtT...............TtT.l.....',
        '.T.tt..T.......T....tt.T......',
        '...TttTt........tTttt.........',
        '.....ttt.......tTt............',
        '......ttu.....ttu.............',
        '......wwwwwwwwwwwvvvvvvv......',
        '.....wWWwwkkkkkkkkqqvvvvv.....',
        '....wWwwwkKKkkkkkkqqqvvvvv....',
        '....WwwwkKKkkkqkkkqqqqvvvv....',
        '....wwwwkKkkkkqkkkqqqqvvvv....',
        '....wwwwkqqqqkkqkqqqqqvvvv....',
        '....wwwwkkyYYkkkkYYyqqvvvv....',
        '....wwwwkkkYkkkkkkYqqqvvvv....',
        '....wwwwkkkkkkQQkkqqqqvvvv....',
        '....wwwwWWwwwwwwvvvvWWvvvv....',
        '....wwwwWWwwwwwwvvvvWWvvvv....',
        '.....wwwwWwwwwvwvvvvWvvvv.....',
        '......wwwWwwwwwwvvvvWvvv......',
        '........wwWwwvwwvvvWvv........',
        '..........wwwwwwvvvv..........',
        '......MMmmmwwwwwvvvnnnmm......',
        '....MMmmlmmwwvvvvvvnnnnnmm....',
        '..Mmmmmmmmmmwvvvvvnnnnnnnlnm..',
        '.mmmmmnmmmmmwvvvvvnnnnnnnnnnn.',
        '.mnmmmrnmmmrmvvvvmrnnnnXnnnnn.',
        'nrrnmrrrnmrrmrvvrmrrnnXXXnnXXn',
        'rrrrrrrrrrrrrrrrrrrrXXXXXXXXXX',
        'rrrrrrrrrrrrrrrrrrrrXXXXXXXXXX',
        'rrrrrrrrrrrrrrrrrrrrXXXXXXXXXX',
      ],
    ],
    { outline: true },
  ),
  // Strawman: tilted rust bowler, burlap face with glinting button eyes and a stitched smile, straw ruff, patched waistcoat.
  sprite(
    'portrait_strawman',
    { A: 'rust', a: 'brick', X: 'blood', g: 'gold', S: 'peach', s: 'wheat', z: 'clay', Z: 'wood', x: 'bark', e: 'loam', E: 'bark', o: 'pebble', m: 'bark', c: 'salmon', y: 'butter', Y: 'gold', V: 'red', v: 'crimson', u: 'wine', j: 'wheat', J: 'clay', G: 'gold', F: 'sky', f: 'blue' },
    [
      [
        '............AAAaa.............',
        '...........AAaaaaaX...........',
        '...........AaaaaaaaX..........',
        '...........ggggggggX..........',
        '......AAaaaaaaaaaaaaaaX.......',
        '.....y.XXXXXXXXXXXXXXX.Y......',
        '....yY..ssssssssssszzz.ZyY....',
        '.......sSSssssssssszzzz.......',
        '......sSSsssssssssszzzzZ......',
        '......sSssssssssssszzzzz......',
        '......sSsseesssssseezzzZ......',
        '......ssseoEesssseoEezzz......',
        '......ssseEeesssseEeezzZ......',
        '......sssseesssssseezzzz......',
        '......ssssmssssssssmzzzZ......',
        '......ssccsmsZssZsmzcczz......',
        '.......sssssmmmmmmszzzzZ......',
        '........ssssssssssszzz........',
        '..........sssssssssz..........',
        '............xxxxxx............',
        '......y.Y.yY......Yy.Y.y......',
        '.....yYyYyYyYy..yYyYyYyYy.....',
        '....yYyyYyyYyyFFyyYyyYyyYy....',
        '....FyFYVVyVVYVvYvvyvvYfyf....',
        '..FFFFFVVVVVVVGvvvvvvvvfffff..',
        '.FFFFFFVxjjJVVVvvvvuuuuffffff.',
        '.FFFFFFVVjJjVVGvvvvuuuuffffff.',
        'FFFFFFFVVJjJVVVvvvvuuuufffffff',
        'FFFFFFFVVVxVVVGvvvvuuuufffffff',
        'FFFFFFFVVVVVVVVvvvvuuuufffffff',
      ],
    ],
    { outline: true },
  ),
  // Forager: the wicker basket rising behind, feather cap with a toadstool tucked in, freckles, moss-lined cloak.
  sprite(
    'portrait_forager',
    { T: 'moss', t: 'pine', N: 'teal', F: 'white', f: 'pebble', R: 'red', r: 'crimson', i: 'white', I: 'cream', h: 'bark', H: 'wood', j: 'loam', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', e: 'umber', E: 'white', c: 'salmon', m: 'bark', A: 'clay', a: 'wood', z: 'bark', g: 'moss', W: 'wheat', w: 'clay', u: 'wood', U: 'bark', l: 'leaf', L: 'sprout', s: 'loam' },
    [
      [
        '........................F.....',
        '..............tTTt.....Ff.....',
        '.L.l...RR..TTTtttttN.FFf..RRr.',
        'LlLl..RiRrTTtttttttNFf...RRiRr',
        '.lLl...IITttttttttNFf......I..',
        '..l....NNNNNNNNNNNNNNN.....I..',
        'WWWWWW.hhhhhhhhhhhhhhhh.WWWWWW',
        'wwuwwuhhhhHhhhhhhhhhhhhhuwwuwU',
        'WWuWWhhHHhhhhhhhhhhhhhhhhWWuWU',
        'wwuwwhhhkkkkkkkkkkkkkkhhhwwuwU',
        'WWuWWhhkkkkkkkkkkkkkkqqhhWWuWU',
        'wwuwwhkkkjjjkkkkkkjjjqqqhwwuwU',
        'WWuWWukKkkEekkkkkkEekqqquWWuWU',
        'wwuwwkkKKkeekkkkkkeekqqqkwwuwU',
        'WWuWkqkkKkeQkkkkkkeQkqqqqkWuWU',
        'wwuwkqkkkkkqkkkqkqkkkqqqqkwuwU',
        'WWuWWkkkcckkkqQkkkkqccqqkWWuWU',
        'wwuwwukkkkkkqkkkkkkkkqqquwwuwU',
        'WWuWWukkkkkkmkkkkmkkqqqquWWuWU',
        'wwuwwukkkkkkkmmmmkkkqqqquwwuwU',
        'WWuWWu.kkkkkkkkkkkkkqqq.uWWuWU',
        'wwuwwu..kkkkkkkkkkkqqq..uwwuwU',
        'WWuWWu.sAgkkkkkkkkkqgzs.uWWuWU',
        'wwuwAAasaaggqqqqqqggzzszzzwuwU',
        '..AAaaasaaagaaaaaagazzszzzzz..',
        '.aaaaaasaaaaaaaaaaaazzszzzzzz.',
        '.aaaaaasaaaaaaaaaaaazzszzzzzz.',
        'aaaaaaasaaaaaaaaaaaazzszzzzzzz',
        'aaaaaaasaaaaaaaaaaaazzszzzzzzz',
        'aaaaaaasaaaaaaaaaaaazzszzzzzzz',
      ],
    ],
    { outline: true },
  ),
  // Miller: floppy baker's cap, a huge flour-dusted moustache, round rosy cheeks, rust shirt and white apron.
  sprite(
    'portrait_miller',
    { C: 'white', c: 'mist', N: 'fog', W: 'white', h: 'wood', j: 'bark', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', e: 'umber', E: 'white', r: 'salmon', m: 'wood', M: 'blood', S: 'rust', s: 'brick', x: 'blood', A: 'white', a: 'cream', z: 'mist' },
    [
      [
        '...........CCCCcccc...........',
        '........CWCCCccccccccN........',
        '.......CWWCcccccccccccNN......',
        '......CWCcccccccccccccNNN.....',
        '......CCcccccccccccccNNNNN....',
        '......Ccccccccccccccc.NNN.....',
        '.......cccccccccccccN..N......',
        '.......NNNNNNNNNNNNNN.........',
        '....hhhkkkkkkkkkkkkkkkkjhh....',
        '....hhhkkkkkkkkkkkkkkkkkjh....',
        '....hhkkkkkkkkkkkkkkkkqqqj....',
        '....hkkkkjjjkkkkkkjjjkqqqj....',
        '.....kKkkkEekkkkkkEekkqqq.....',
        '....kkKKkkeekkkkkkeekkqqqk....',
        '...kqkkKkkeQkkQqkkeQkkqqqqk...',
        '...kqkrrrkkkkkQQkkkkkrrrqqk...',
        '....kkrrrkkmmWmmmmmmmrrrqk....',
        '.....kkkkkmmmmmmWmmmmmqqq.....',
        '.....kkkkmmmWmmmmmmWmmmqq.....',
        '.....kkkkmmkqMMMkkkkqmmqq.....',
        '......kkkkkkkkkkkkkkqkqq......',
        '......kSkkkkkkkkkkkqqqsq......',
        '....SSkSASkkkkkkkkkqszskss....',
        '..SWSSSSASSSqqqqqqSSszsssxxx..',
        '.SSSSSSSASSSSSSSSSSSszsssWxxx.',
        '.SSSSWSSAAAAAAAaaaaaazsssxxxx.',
        'SSSSSSSSAAAAAAAaaazzzzsWsxxxxx',
        'SSWSSSSSAAAAAAAazzzzzzsssxxxxx',
        'SSSSSSSSAAAAAAAazzzzzzsssxxxxx',
        '........AAAAAAAaaazzzz........',
      ],
    ],
    { outline: true },
  ),
  // Witch: crooked violet hat with a glowing moonberry sprig, long blue-black hair, moonlit eyes, starry shawl.
  sprite(
    'portrait_witch',
    { V: 'violet', v: 'purple', I: 'indigo', n: 'midnight', M: 'ice', N: 'white', m: 'aqua', h: 'abyss', H: 'night', j: 'deep', K: 'cream', k: 'peach', q: 'skin', e: 'abyss', E: 'white', c: 'salmon', l: 'rose', L: 'mauve', A: 'dusk', a: 'storm', z: 'night', x: 'ice' },
    [
      [
        '.....................vI.......',
        '....................VvI.......',
        '...................VvvI.......',
        '..................VvvvI.......',
        '.................VVvvvII......',
        '................VVvvMNvI......',
        '...............VVvvMNMmvI.....',
        '.........nnnnnnnnnnnMmn.......',
        '..VVVVvvvvvvvvvvvvvvvvvvvvIII.',
        '.VVvvvvvvvvvvvvvvvvvvvvvvvvvII',
        '....hhHHhkhHhhkkkhhhqjjjjj....',
        '...hhHhhkKKkkkkkkkkqqqjjjjj...',
        '...hHhhhkeeekkkkkkeeeqjjjjj...',
        '...hhhhhkkEekkkkkkEeqqjjjjj...',
        '...hhhhhkkeekkkkkkeeqqjjjjj...',
        '...hhhhhkkeIkkkkkkeIqqjjjjj...',
        '...hHhhhkcckkkkqkkkccqjjjjj...',
        '...hhhhhkkkkkkkkkkkqqqjjjjj...',
        '...hhhhhhkkkkllllkkqqjjjjjj...',
        '...hhhhhhhkkkkLLkkkqjjjjjjj...',
        '...hhHhhhhhhkkkkkkjjjjjjjjj...',
        '...hhhhhhhhqqqqqqqqjjjjjjjj...',
        '...hhhhhhhhqqqqqqqqjjjjjjjj...',
        '...hhhhhhhaaqqqqqqaajjjjjjj...',
        '..AAhhhhhhaaaNaxaaaajjjjjjzz..',
        '.aaaahhhhhaaaaaaaaaajjjjjzzzz.',
        '.aaaaahhhhaaaaaaaaaajjjjzzzzz.',
        'aaaaaaaaaaaaaaaaaaaazzzzzzxzzz',
        'aaaxaaaaaaaaxaaaaaaazzzzzzzzzz',
        'aaaaaaaaaaaaaaaaaaxazzzzzzzzzz',
      ],
    ],
    { outline: true },
  ),
  // Ploughman: low tweed flat cap, bushy beard, enormous bare shoulders, cream vest and red braces.
  sprite(
    'portrait_ploughman',
    { C: 'stone', c: 'slate', N: 'ash', h: 'bark', H: 'wood', j: 'loam', K: 'peach', k: 'skin', q: 'clay', Q: 'wood', e: 'umber', E: 'white', r: 'salmon', m: 'loam', t: 'cream', u: 'pebble', R: 'red', x: 'crimson', G: 'gold' },
    [
      [
        '..............................',
        '..............................',
        '.........CCCCCCcccc...........',
        '.......CCCCCcccccccccN........',
        '......CCccccccccccccccNN......',
        '.....CCcccccccccccccccNNN.....',
        '.....cccccccccccccccccNNN.....',
        '.....NNNNNNNNNNNNNNNNNNNN.....',
        '.....kkkkkkkkkkkkkkkkkkkk.....',
        '.....kkkkhhhhkkkkhhhhkqqq.....',
        '.....kkkkhkkkkkkkkkkhkqqq.....',
        '.....kKkkkEekkkkkkEekkqqq.....',
        '....kkKKkkeekkkkkkeekkqqqk....',
        '...kqkkKkkeQkkkkkkeQkkqqqqk...',
        '...kqkkkrrkkkkrrkkkkrrqqqqk...',
        '....khhkkkkkkkQQkkkkkkqjjk....',
        '.....hHhkkkkkkkkkkkkkkjjj.....',
        '.....hhhhkkkkmmmmkkkqjjjj.....',
        '.....hhhHHhhhhhhjjjjjjjjj.....',
        '......hhhhhHhhhhjjjjjjjj......',
        '......khhhhhhhhhjjjjjjjq......',
        '...KKkkkhhhhhhhhjjjjjjqkqq....',
        '..KKKkkktRhhhhhhjjjjxuqqqqqq..',
        '.KKkkkkktRtthhhhjjuuxuqqqqqqq.',
        '.KkkkkkktRtttttuuuuuxuqqqqqqq.',
        'kkkkkkkktRtttttuuuuuxuqqqqqqqq',
        'kkkkkkkktRtttttuuuuuxuqqqqqqqq',
        'kkkkkkkktRtttttuuuuuxuqqqqqqqq',
        '........tGtttttuuuuuGu........',
        '........tRtttttuuuuuxu........',
      ],
    ],
    { outline: true },
  ),
  // Alchemist: wild singed orange frizz, mismatched aqua and coral lenses, a manic grin, vial bandolier.
  sprite(
    'portrait_alchemist',
    { h: 'orange', H: 'gold', j: 'rust', J: 'ash', K: 'peach', k: 'skin', q: 'clay', E: 'white', c: 'salmon', m: 'bark', x: 'stone', L: 'aqua', l: 'cyan', R: 'coral', r: 'crimson', Y: 'slate', i: 'white', M: 'pine', n: 'teal', N: 'moss', S: 'wood', s: 'bark', v: 'red', u: 'violet' },
    [
      [
        '....h..hH..h.hh..h..hh..h.....',
        '..hhhh.hHhhhhhhhhhhhhhhhhh.J..',
        '.hhHHhhhhHhhhhhhhhhhhhhhhhhj..',
        '.hHHhhhhhhhhhhhhhhhhhhhhhhhjj.',
        '.JhHhhhhhhhhhhhhhhhhhhhhhhjjJ.',
        '..hhhhhhhhhhhhhhhhhhhhhhhhjj..',
        '.hhhhh..............jhhhhjjJ..',
        '.Jhhhhhhhhhhhhhhhhhhhhhhhjj...',
        '..hhh..hhkkkkhkkkkkkhhhjjjJ...',
        '..Jhh.kkkkEkkkkkkkkEkkhhjj....',
        '...hh.kkkEEEEkkkkEEEEqqjjJ....',
        '...Jh.kkkkYYYkkkkkYYYqqjj.....',
        '......kKkYiLLYYYkYiRRYqq......',
        '.....kkKKYLLlYkkkYRRrYqqk.....',
        '....kqkkKYLllYkkkYRrrYqqqk....',
        '....kqkkkkYYYkkkkkYYYqqqqk....',
        '.....kkkcckkkkkqkkkkkqxqk.....',
        '......kkkkkmkkkkkkmkkxqq......',
        '......kkkkkkmEEEEEmkqqqq......',
        '......kkkkkkkmmmmmkkqqqq......',
        '.......kkkkkkkkkkkkkqqq.......',
        '........kkkkkkkkkkkqqq........',
        '.......NNNkkkkkkkkkqNnSs......',
        '....NNMMMNMMqqqqqqMMSsnnnn....',
        '..NNMMMMMMMMiMuMMMSsnnnnnnnn..',
        '.MMMMMMMMMMMvMMMSsMMnnnnnnnnn.',
        '.MMMMMMMMMMMMMSsMMMMnnnnnnnnn.',
        'MMMMMMMMMMMMSsMMMMMMnnnnnnnnnn',
        'MMMMMMMMMMSsMMMMMMMMnnnnnnnnnn',
        'MMMMMMMMSsMMMMMMMMMMnnnnnnnnnn',
      ],
    ],
    { outline: true },
  ),
];

export const SPRITES: SpriteDef[] = [
  ...heroSprites('fieldhand', FIELDHAND, FIELDHAND_L),
  ...heroSprites('botanist', BOTANIST, BOTANIST_L),
  ...heroSprites('reaper', REAPER, REAPER_L),
  ...heroSprites('tinkerer', TINKERER, TINKERER_L),
  ...heroSprites('apiarist', APIARIST, APIARIST_L),
  ...heroSprites('rootspeaker', ROOTSPEAKER, ROOTSPEAKER_L),
  ...heroSprites('strawman', STRAWMAN, STRAWMAN_L),
  ...heroSprites('forager', FORAGER, FORAGER_L),
  ...heroSprites('miller', MILLER, MILLER_L),
  ...heroSprites('witch', WITCH, WITCH_L),
  ...heroSprites('ploughman', PLOUGHMAN, PLOUGHMAN_L),
  ...heroSprites('alchemist', ALCHEMIST, ALCHEMIST_L),
  ...HELD,
  ...HELD9,
  ...TURRETS,
  ...NPCS,
  ...PORTRAITS,
  ...PORTRAITS9,
];
