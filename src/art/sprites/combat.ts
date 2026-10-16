// Combat sprites: player projectiles, ground hazards, enemy bullets, pickups
// and effects.
//
// Readability contract (bullet hell):
// - Enemy bullets use hostile hues (hot pink, violet, cyan, gold, crimson,
//   magenta), a PURE WHITE glint/core and a black outline. Compact, round-ish.
// - Player projectiles look like the crop they come from, are a step more
//   muted, and never use white or pink/magenta; their highlights are cream,
//   butter or sprout instead. White on a moving thing means "dodge this".
// - Effects front-load their energy in the first frame or two and then break
//   up into sparse bits so they never sit on top of a bullet for long.
import { sprite, recolour, type SpriteDef } from '../sprite';
import { grid, rows, put, stamp, blob } from './combat-draw';
import { scene, meadow, corrupt, farm, type Placement } from './combat-preview';

// ---------------------------------------------------------------------------
// Player projectiles

const p_pea = sprite('p_pea', { s: 'sprout', L: 'leaf', M: 'moss', p: 'pine' }, [['sLM', 'LMM', 'MMp']], {
  outline: true,
});

const p_seed = sprite('p_seed', { w: 'wheat', c: 'clay', b: 'wood' }, [['wc', 'cb']], { outline: true });

const CHUNK = { c: 'cream', k: 'peach', s: 'skin', m: 'mauve', p: 'plum' } as const;
const p_chunk = sprite(
  'p_chunk',
  CHUNK,
  [
    ['.mp', 'cck', 'cks'],
    ['cc.', 'ckp', '.pp'],
    ['mc.', 'pck', '.ks'],
  ],
  { outline: true },
);

const p_turnip = sprite(
  'p_turnip',
  { s: 'sprout', g: 'leaf', G: 'moss', m: 'mauve', P: 'plum', d: 'plumdark', c: 'cream', k: 'peach', K: 'skin' },
  [
    [
      '...sg...',
      '..sgGG..',
      '.mmPGPP.',
      'mmPPPPPd',
      'cmmPPPdd',
      'cccccckK',
      '.ccckkK.',
      '...kK...',
    ],
  ],
  { outline: true },
);

const p_carrot = sprite(
  'p_carrot',
  { s: 'sprout', g: 'leaf', G: 'moss', w: 'wheat', o: 'rust', r: 'brick' },
  [['gs.wwowwo..', 'GGwoooroooo', 'Gg.rrrorr..']],
  { outline: true },
);

const p_petal = sprite(
  'p_petal',
  { u: 'butter', g: 'gold', a: 'amber' },
  [
    ['..ugg', '.uggg', 'ugga.', 'gaa..', 'a....'],
    ['uug..', 'uggg.', '.ugga', '..gaa', '....a'],
  ],
  { outline: true, fps: 10 },
);

const p_tomato = sprite(
  'p_tomato',
  { g: 'leaf', G: 'moss', h: 'peach', l: 'rust', R: 'brick', b: 'blood' },
  [['...g..', '.lgGgl', 'lhlGRR', 'llRRRb', 'lRRRbb', '.Rbbb.']],
  { outline: true },
);

const p_pumpkin = sprite(
  'p_pumpkin',
  { w: 'wood', W: 'bark', g: 'leaf', G: 'moss', u: 'wheat', a: 'amber', o: 'orange', r: 'rust', R: 'brick' },
  [
    [
      '....wWgG..',
      '....wW.g..',
      '..uawWao..',
      '.uarauroR.',
      'uaraaooRoR',
      'aaraoooRrR',
      'aorooorRrR',
      'ooRoorrRRR',
      '.orRrrRrR.',
      '..RRRRRR..',
    ],
  ],
  { outline: true },
);

const p_kernel = sprite(
  'p_kernel',
  { i: 'aqua', b: 'butter', g: 'gold', a: 'amber', k: 'cream' },
  [['ibg', 'bgg', 'gga', '.k.']],
  { outline: true },
);

const p_bee = sprite(
  'p_bee',
  { m: 'mist', f: 'fog', a: 'amber', g: 'gold', s: 'loam', h: 'soot' },
  [
    ['..mf.', '.mmf.', 'sgsgh', '.asa.'],
    ['.....', 'mmf..', 'sgsgh', '.asa.'],
  ],
  { outline: true, fps: 16 },
);

// Choircap companion: brown cap, cream stem with a little face singing "o".
// Faces right like every side-view sprite. Frames: squash, stretch, airborne.
const SHROOM = { c: 'clay', p: 'peach', C: 'wood', d: 'bark', s: 'cream', S: 'peach', e: 'loam', o: 'bark', f: 'skin' } as const;
const CAP = ['..cppc..', '.cpcCpC.', 'cCCCCCCd', '.dddddd.'];
const p_shroom = sprite(
  'p_shroom',
  SHROOM,
  [
    ['........', '........', ...CAP, '.ssosoS.', '.ssssSS.'], // eyes squeezed shut
    [...CAP, '..sese..', '..ssoS..', '..sssS..', '..f..f..'],
    ['..cppc..', '.cpcCpC.', 'cCCCCCCd', '.dddddd.', '..sese..', '..ssoS..', '..f..f..', '........'],
  ],
  { outline: true, fps: 8 },
);

const p_thorn = sprite('p_thorn', { p: 'pine', m: 'moss', w: 'wood', c: 'clay', k: 'peach' }, [['pmwwwck']], {
  outline: true,
});

const p_ember = sprite(
  'p_ember',
  { y: 'butter', a: 'amber', o: 'orange', r: 'brick', b: 'bark' },
  [
    ['.y..', 'yao.', 'aoor', '.rb.'],
    ['..y.', '.ya.', 'aoor', '.rrb'],
  ],
  { outline: true, fps: 10 },
);

const p_frost = sprite(
  'p_frost',
  { i: 'ice', m: 'mist', f: 'fog', d: 'dusk' },
  [['..m..', '.imf.', 'mmffd', '.ffd.', '..d..']],
  { outline: true },
);

// A coil of barbed bramble; several in a row read as a briar fence.
const BRIAR = { l: 'leaf', m: 'moss', p: 'pine', t: 'teal', k: 'peach', c: 'clay', b: 'brick', g: 'sprout' } as const;
const p_briar = sprite(
  'p_briar',
  BRIAR,
  [
    [
      '...k..k.g.',
      '..llmmmpg.',
      '.lmmtmlmp.',
      'klm....mpc',
      '.lt....tp.',
      '.mt....mp.',
      'kmp....tpc',
      '.bmptmppt.',
      '..ppttpp..',
      '...c..c...',
    ],
    [
      '....k..kg.',
      '..lmmlmpg.',
      '.llmtmmpp.',
      '.lm....mp.',
      'kmt....tpc',
      '.lt....mp.',
      '.mp....tpc',
      'kbpmtmppt.',
      '..pttppp..',
      '....c..c..',
    ],
  ],
  { outline: true, fps: 4 },
);

const p_moon = sprite(
  'p_moon',
  { c: 'cream', m: 'mist', f: 'fog', d: 'dusk', s: 'storm' },
  [['.mds.', 'mcdfs', 'mcdss', 'mfdss', '.mds.']],
  { outline: true },
);

// ---------------------------------------------------------------------------
// Enemy bullets

const ORB = ['.BBBB.', 'BWWLBB', 'BWLLBD', 'BLLBBD', 'BBBBDD', '.BDDD.'];
const SMALL = ['.LB.', 'LWBB', 'BBBD', '.BD.'];

const eb_orb_pink = sprite('eb_orb_pink', { W: 'white', L: 'blush', B: 'hot', D: 'mauve' }, [ORB], { outline: true });
const eb_orb_gold = recolour(eb_orb_pink, 'eb_orb_gold', { L: 'butter', B: 'gold', D: 'orange' });
const eb_orb_violet = recolour(eb_orb_pink, 'eb_orb_violet', { L: 'orchid', B: 'violet', D: 'purple' });
const eb_orb_cyan = recolour(eb_orb_pink, 'eb_orb_cyan', { L: 'ice', B: 'cyan', D: 'sky' });
const eb_small_pink = sprite('eb_small_pink', { W: 'white', L: 'blush', B: 'hot', D: 'mauve' }, [SMALL], {
  outline: true,
});
const eb_small_gold = recolour(eb_small_pink, 'eb_small_gold', { L: 'butter', B: 'gold', D: 'orange' });

const eb_pollen = sprite(
  'eb_pollen',
  { W: 'white', l: 'lime', s: 'sprout', y: 'butter' },
  [['.y.y.', 'yWlly', '.lls.', 'ylssy', '.y.s.']],
  { outline: true },
);

const eb_thorn = sprite(
  'eb_thorn',
  { W: 'white', c: 'coral', r: 'red', d: 'crimson' },
  [['..crr...', 'cWccrrrr', '..ddd...']],
  { outline: true },
);

const eb_mud = sprite(
  'eb_mud',
  { W: 'white', c: 'clay', w: 'wood', b: 'bark', v: 'violet' },
  [['.cwc.', 'cWwbv', 'wwvbv', 'wbbvv', '.vvv.']],
  { outline: true },
);

const eb_ring = sprite(
  'eb_ring',
  { W: 'white', L: 'butter', B: 'gold', D: 'orange' },
  [['..LLB..', '.WLBBB.', 'LL...BD', 'LB...BD', 'BB...DD', '.BBBDD.', '..DDD..']],
  { outline: true },
);

const eb_spore = sprite(
  'eb_spore',
  { W: 'white', o: 'orchid', M: 'magenta', m: 'mauve', p: 'plum' },
  [['.oMM.', 'oWoMM', 'MoMpM', 'MpMMm', '.Mmm.']],
  { outline: true },
);

// ---------------------------------------------------------------------------
// Hazards (ground decals, no outline; draw them under bullets)

const POISON = { k: 'teal', p: 'pine', m: 'moss', l: 'leaf', s: 'sprout', L: 'lime', v: 'mauve', P: 'plum', d: 'plumdark' } as const;
const h_poison = sprite(
  'h_poison',
  POISON,
  [
    [
      '............................',
      '.............Ls.............',
      '......kkkkk..sm.....kkkk....',
      '....kkllllmkkkkkkkkkllmmkk..',
      '..kklssllmmmmmmmmmmmlmmmppk.',
      '.klslmmmmvvvvmmmmmmmmmmmmppk',
      'klsmmmmvvPPPvvmmmmLsmmmmmppk',
      'klmmmmvPPmmmPPvmmmssmmmmpppk',
      'kmmmmmvPmmmmmvPmmmmmmmmmppk.',
      '.kpmmmmvvmmmmmvvmmmmmmmpppk.',
      '..kppmmmmvvvvvvmmmmmmppppk..',
      '...kkpppppppppppppppppkkk...',
      '.....kkkkkpppppppkkkkk......',
      '..........kkkkkkk...........',
    ],
    [
      '............................',
      '............L..L............',
      '......kkkkk...s.....kkkk....',
      '....kkllllmkkkkkkkkkllmmkk..',
      '..kklssllmmmmmmmmmmmlmmmppk.',
      '.klslmmmmmvvvvmmmmmmmmmmmppk',
      'klsmmmmmvvPPPvvmmmmmmmmmmppk',
      'klmmmmmvPPmmmPPvmmmmmmLsmppk',
      'kmmLsmmvPmmmmmvPmmmmmmssmpk.',
      '.kpssmmmvvmmmmmvvmmmmmmpppk.',
      '..kppmmmmmvvvvvvmmmmmppppk..',
      '...kkpppppppppppppppppkkk...',
      '.....kkkkkpppppppkkkkk......',
      '..........kkkkkkk...........',
    ],
  ],
  { fps: 3 },
);

// Flames are built from a width profile so the three frames sway coherently.
const FIRE = { U: 'umber', L: 'loam', B: 'bark', R: 'blood', r: 'brick', o: 'orange', a: 'amber', g: 'gold', y: 'butter', e: 'flame' } as const;
type Flame = [cx: number, base: number, widths: number[], sway?: number[]];
function fireFrame(flames: Flame[], embers: [number, number, string][]): string[] {
  const g = grid(24, 12);
  // scorched ground
  stamp(
    g,
    [
      '.....LLBLLBBLLBLLL......',
      '..LLBBUBBLBBUBBLBBLLL...',
      '.LBUBBLUBBBUBBLBUBBBLL..',
      '..LLBBUBLBBUBBBLBBLL....',
      '.....LLLBLLBLLLLL.......',
    ],
    0,
    7,
  );
  for (const [cx, base, widths, sway = []] of flames) {
    widths.forEach((hw, k) => {
      const y = base - k;
      const x0 = cx + (sway[k] ?? 0);
      const n = widths.length;
      for (let j = -hw; j <= hw; j++) {
        const d = hw - Math.abs(j); // 0 at the edge
        let ch: string;
        if (hw === 0) ch = k === n - 1 ? 'r' : 'o';
        else if (d === 0) ch = hw === 1 ? 'r' : 'R';
        else if (d === 1 && hw >= 2) ch = 'o';
        else if (j === 0 && k <= n * 0.4) ch = 'y';
        else ch = 'a';
        put(g, x0 + j, y, ch);
      }
    });
  }
  for (const [x, y, ch] of embers) put(g, x, y, ch);
  return rows(g);
}
const h_fire = sprite(
  'h_fire',
  FIRE,
  [
    fireFrame(
      [
        [5, 10, [2, 3, 2, 2, 1, 1, 0, 0], [0, 0, 0, -1, -1, -1, -2, -2]],
        [12, 10, [3, 3, 3, 2, 2, 2, 1, 1, 0, 0], [0, 0, 0, 0, 1, 1, 1, 2, 2, 2]],
        [18, 10, [2, 3, 2, 2, 1, 1, 0, 0, 0], [0, 0, 0, 0, 0, 1, 1, 1, 2]],
      ],
      [[8, 2, 'a'], [21, 3, 'o'], [15, 10, 'e'], [2, 9, 'o']],
    ),
    fireFrame(
      [
        [5, 10, [2, 2, 2, 1, 1, 0, 0], [0, 0, 0, 0, 1, 1, 1]],
        [12, 10, [3, 3, 2, 2, 2, 1, 1, 1, 0, 0], [0, 0, 0, -1, -1, -1, -2, -2, -2, -3]],
        [18, 10, [2, 3, 2, 2, 2, 1, 1, 0, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 1, 1]],
      ],
      [[9, 1, 'o'], [2, 4, 'a'], [15, 10, 'e'], [21, 9, 'o']],
    ),
    fireFrame(
      [
        [5, 10, [2, 3, 2, 2, 1, 1, 1, 0, 0], [0, 0, 0, 0, 1, 1, 1, 0, 0]],
        [12, 10, [3, 3, 2, 2, 2, 1, 1, 0, 0], [0, 0, 0, 1, 1, 2, 2, 2, 3]],
        [18, 10, [2, 2, 2, 1, 1, 0, 0], [0, 0, 0, -1, -1, -2, -2]],
      ],
      [[14, 1, 'a'], [8, 3, 'o'], [4, 10, 'e'], [21, 8, 'o']],
    ),
  ],
  { fps: 8 },
);

// Spore cloud: loose motes swirling on small circles, never a solid blob, so
// bullets under it still read. Each mote is [x, y, big, phase].
const SPORE = { L: 'lime', s: 'sprout', m: 'moss', p: 'pine', c: 'cream' } as const;
const MOTES: [number, number, boolean, number][] = [
  [8, 6, true, 0], [11, 8, true, 2], [6, 9, true, 4], [12, 4, true, 1], [9, 11, true, 3], [14, 9, true, 5], [5, 5, true, 2],
  [2, 8, false, 1], [17, 8, false, 3], [9, 1, false, 0], [10, 15, false, 4], [4, 3, false, 2], [15, 3, false, 5],
  [4, 13, false, 0], [15, 13, false, 2], [12, 1, false, 3], [7, 15, false, 4], [1, 5, false, 1], [18, 11, false, 3],
  [10, 6, false, 5], [7, 12, false, 1], [13, 12, false, 0],
];
function sporeFrame(t: number): string[] {
  const g = grid(20, 16);
  for (const [x, y, big, ph] of MOTES) {
    const a = ((ph + t * 2) * Math.PI) / 3;
    const mx = Math.round(x + Math.cos(a) * 1.1);
    const my = Math.round(y + Math.sin(a) * 0.9 - t * 0.4);
    if (big) stamp(g, ['Ls', 'sm', '.p'].slice(0, (ph + t) % 3 === 0 ? 2 : 3), mx, my);
    else put(g, mx, my, (ph + t) % 4 === 0 ? 'c' : (ph + t) % 2 ? 's' : 'L');
  }
  return rows(g);
}
const h_spores = sprite('h_spores', SPORE, [sporeFrame(0), sporeFrame(1), sporeFrame(2)], { fps: 4 });

// ---------------------------------------------------------------------------
// Pickups

const SAP = { W: 'white', y: 'butter', g: 'gold', a: 'amber', o: 'orange', r: 'rust' } as const;
const pk_sap_s = sprite('pk_sap_s', SAP, [['.y..', '.ga.', 'yWao', 'gaao', '.or.']], { outline: true });
const pk_sap_m = sprite(
  'pk_sap_m',
  SAP,
  [['..y...', '..ga..', '.yWao.', 'yWgaao', 'ggaaoo', 'gaaoor', '.aoor.']],
  { outline: true },
);
const pk_sap_l = sprite(
  'pk_sap_l',
  SAP,
  [
    [
      '...y....',
      '...ga...',
      '..ygaa..',
      '.yWgaao.',
      '.Wggaao.',
      'ygggaaoo',
      'ggaaaoor',
      'gaaaaoor',
      '.yaaoor.',
      '..oorr..',
    ],
  ],
  { outline: true },
);

const COIN = { h: 'peach', s: 'skin', c: 'clay', w: 'wood', b: 'bark' } as const;
const pk_farthing = sprite(
  'pk_farthing',
  COIN,
  [
    ['.hhsc.', 'hssccw', 'hscwcw', 'scchww', 'sccwwb', '.cwwb.'],
    ['..hs..', '.hscw.', '.shcw.', '.swcw.', '.scwb.', '..wb..'],
    ['..hs..', '..sw..', '..sw..', '..sw..', '..sw..', '..wb..'],
    ['..hs..', '.hscw.', '.scwb.', '.scwb.', '.scwb.', '..wb..'],
  ],
  { outline: true, fps: 8 },
);

const CHEST = {
  k: 'peach', c: 'clay', w: 'wood', W: 'bark', L: 'loam',
  g: 'leaf', v: 'moss', V: 'pine', s: 'sprout', y: 'gold', Y: 'amber', u: 'umber', b: 'butter',
} as const;
// Body rows shared by both frames so the chest does not jump when it opens.
const CHEST_FRONT = [
  'kcccvccccccvgcwW',
  'wwwwVwwwwwwVwwwW',
  'ccccvccccccvccwW',
  'WwwwVwgwwwwVwwWW',
  'LWL.V.L....V.LWL',
];
const pk_chest = sprite(
  'pk_chest',
  CHEST,
  [
    [
      '................',
      '................',
      '..kcvccccccvcw..',
      '.kcsvccccccvccw.',
      'kcwcVcwccwcVgwwW',
      'WWWWvWWyYWWvWWWW',
      'ckccgccYWccgccwW',
      ...CHEST_FRONT,
    ],
    [
      '.WwwvwwwwwwvwwW.',
      'WwwwVwwwwwwVwwwW',
      'WwwwvwwwwwwvwwwW',
      'WLLLvLLLLLLvLLLW',
      'WuYyyybbbbyyyYuW',
      'WWWWvWWWWWWvWWWW',
      'ckccgccYYccgccwW',
      ...CHEST_FRONT,
    ],
  ],
  { outline: true },
);

// ---------------------------------------------------------------------------
// Effects (no outline: they flash and break up, and must never mask a bullet)

const fx_hit = sprite(
  'fx_hit',
  { W: 'white', y: 'butter', o: 'orange', r: 'rust' },
  [
    [
      '....o....',
      '....y....',
      '.o..y..o.',
      '...yWy...',
      'oyyWWWyyo',
      '...yWy...',
      '.o..y..o.',
      '....y....',
      '....o....',
    ],
    [
      '....y....',
      '.y.....y.',
      '..o...o..',
      '.........',
      'y...W...y',
      '.........',
      '..o...o..',
      '.y.....y.',
      '....y....',
    ],
    [
      '....r....',
      '.........',
      '.r.....r.',
      '.........',
      'r.......r',
      '.........',
      '.r.....r.',
      '.........',
      '....r....',
    ],
  ],
  { fps: 20 },
);

const DUST = { c: 'cream', p: 'pebble', n: 'stone' } as const;
const fx_dust = sprite(
  'fx_dust',
  DUST,
  [
    ['.........', '.........', '.........', '...cc....', '..cccpc..', '.cpppppc.', '..nnnnn..'],
    ['.........', '....cc...', '..cccpc..', '.ccppppc.', '.cpppnpn.', '..pn.nn..', '.........'],
    ['...c.....', '..cp..c..', '......pc.', '.c.......', '.p....p..', '.........', '.........'],
  ],
  { fps: 12 },
);

const POOF = { c: 'cream', p: 'pebble', n: 'stone', s: 'sprout', g: 'leaf', G: 'moss', w: 'wood' } as const;
function poofFrame(lumps: [number, number, number][], bits: [number, number, string[]][]): string[] {
  const g = grid(16, 16);
  blob(g, lumps, ['p', 'c']);
  for (const [x, y, art] of bits) stamp(g, art, x, y);
  return rows(g);
}
const LEAF_A = ['sg', '.G'];
const LEAF_B = ['gs', 'G.'];
const LEAF_C = ['sG'];
const fx_poof = sprite(
  'fx_poof',
  POOF,
  [
    poofFrame(
      [[8, 8, 3.6], [4.5, 8.5, 2.6], [11.5, 8.5, 2.6], [6, 5, 2.4], [10.5, 5.5, 2.2], [8, 11.5, 2.4]],
      [[1, 2, LEAF_A], [13, 3, LEAF_B], [2, 13, LEAF_B], [12, 13, LEAF_C], [7, 0, ['w']]],
    ),
    poofFrame(
      [[3.5, 8, 2.6], [12.5, 8, 2.6], [8, 3.5, 2.4], [8, 12.5, 2.2], [5, 4.5, 1.6], [11, 12, 1.6]],
      [[0, 1, LEAF_A], [14, 2, LEAF_B], [1, 13, LEAF_B], [13, 14, LEAF_C], [9, 0, ['w']]],
    ),
    poofFrame(
      [[2, 7, 1.5], [14, 7.5, 1.5], [8, 1.6, 1.4], [8.5, 14, 1.4], [4, 12, 1]],
      [[0, 3, LEAF_C], [14, 4, ['G', 's']], [3, 15, LEAF_C], [12, 15, ['g']]],
    ),
    poofFrame(
      [[1, 6, 0.6], [14.5, 8, 0.6], [9, 0.6, 0.6]],
      [[1, 10, ['g']], [14, 12, ['s']]],
    ),
  ],
  { fps: 12 },
);

const BURROW = { c: 'clay', w: 'wood', b: 'bark', L: 'loam', u: 'umber', n: 'stone', p: 'peach' } as const;
const fx_burrow = sprite(
  'fx_burrow',
  BURROW,
  [
    [
      '................',
      '................',
      '................',
      '................',
      '.......pc.......',
      '.....cpwwcb.....',
      '..n.cwwLuwwbw.n.',
      '.LbwbwbuLbwbbwL.',
    ],
    [
      '...cw.....pc....',
      '...bL..c..wb..c.',
      '.c.....pw.....b.',
      '.b....cwwb......',
      '.....cwLLwb.....',
      '...ccwLuuLwbb...',
      '.bcwwLuuuuLwwbb.',
      'LbwbwbLuuLbwbwbL',
    ],
    [
      '................',
      '................',
      '..cw........c...',
      '..bL........b...',
      '.......pc.......',
      '....c.cwwb..w...',
      '.cw.cwbLLbwb.cb.',
      'LbwbbwbLLbbwbwbL',
    ],
  ],
  { fps: 10 },
);

const BOOM = {
  W: 'white', y: 'butter', g: 'gold', a: 'amber', o: 'orange', R: 'brick', b: 'blood',
  p: 'pebble', n: 'stone', c: 'clay', w: 'wood', B: 'bark', L: 'loam',
} as const;
const CLOD = ['.c.', 'cwB', '.BL'];
const CLOD_M = ['cw', 'BL'];
const CLOD_S = ['c', 'B'];
const SMOKE = ['n', 'p'];
type Lump = [number, number, number];
function boomFrame(layers: [Lump[], string[]][], clods: [number, number, string[]][]): string[] {
  const g = grid(32, 32);
  for (const [lumps, shades] of layers) blob(g, lumps, shades);
  for (const [x, y, art] of clods) stamp(g, art, x, y);
  return rows(g);
}
function rays(g: string[], ch: string, inner: number, len: number): string[] {
  const out = g.map((r) => [...r]);
  for (let d = 0; d < 8; d++) {
    const a = (d * Math.PI) / 4 + Math.PI / 8;
    for (let k = 0; k < len; k++) {
      const x = Math.round(15.5 + Math.cos(a) * (inner + k));
      const y = Math.round(15.5 + Math.sin(a) * (inner + k));
      if (out[y]?.[x] === '.') out[y][x] = k === len - 1 ? 'a' : ch;
    }
  }
  return out.map((r) => r.join(''));
}
const BLAST: Lump[] = [[16, 17, 8.5], [9, 14, 4.5], [23, 14, 4.5], [12, 9, 4.5], [20, 9, 4.5], [10, 21, 4], [22, 22, 4], [16, 24, 4]];
const grow = (l: Lump[], d: number): Lump[] => l.map(([x, y, r]) => [x, y, r + d]);
const fx_explosion = sprite(
  'fx_explosion',
  BOOM,
  [
    rays(
      boomFrame(
        [[[[16, 16, 6], [16, 9.5, 2], [22.5, 16, 2], [16, 22.5, 2], [9.5, 16, 2]], ['a', 'g', 'y', 'W']]],
        [[8, 9, CLOD_S], [23, 9, CLOD_S], [9, 22, CLOD_S], [22, 22, CLOD_S]],
      ),
      'y',
      8,
      2,
    ),
    boomFrame(
      [
        [grow(BLAST, 0.8), ['b']],
        [BLAST, ['R', 'o', 'a']],
        [[[15, 15, 7]], ['a', 'g', 'y', 'W']],
      ],
      [[3, 5, CLOD], [27, 6, CLOD], [2, 22, CLOD], [27, 24, CLOD], [15, 1, CLOD_S], [16, 29, CLOD_S]],
    ),
    boomFrame(
      [
        [
          [
            [8, 11, 3], [10.5, 8, 2], [5.5, 13, 2], [24, 10, 3], [21.5, 7.5, 2], [6, 20, 2.6], [8, 23, 1.8],
            [26, 20, 2.6], [24, 23, 1.8], [16, 5, 3], [19, 4, 2], [17, 27, 2.6], [14, 28, 1.8],
          ],
          SMOKE,
        ],
        [[[16, 16, 5.5], [19, 19, 3], [13, 18, 3]], ['b', 'R', 'o', 'a']],
      ],
      [[1, 2, CLOD], [28, 3, CLOD], [0, 25, CLOD_M], [29, 27, CLOD], [15, 0, CLOD_S]],
    ),
    boomFrame(
      [
        [[[6.5, 9.5, 2.2], [4.5, 11, 1.2], [26.5, 9.5, 1.8], [4.5, 18.5, 1.8], [28.5, 19.5, 1.8], [12.5, 4.5, 1.8], [21.5, 4.5, 2.2], [10.5, 27.5, 1.8], [22.5, 27.5, 1.8]], SMOKE],
      ],
      [[0, 6, CLOD_M], [30, 8, CLOD_M], [1, 29, CLOD_S], [29, 30, CLOD_M], [15, 13, ['a']], [18, 18, ['o']], [13, 20, ['R']]],
    ),
    boomFrame(
      [[[[4.5, 7.5, 1.2], [28.5, 8.5, 1.2], [12.5, 2.5, 1.2], [24.5, 28.5, 1.2]], ['n', 'p']]],
      [[0, 30, ['B']], [31, 31, ['B']], [17, 17, ['R']]],
    ),
  ],
  { fps: 14 },
);

const fx_sparkle = sprite(
  'fx_sparkle',
  { W: 'white', y: 'butter', g: 'gold' },
  [
    ['.......', '.......', '...y...', '..yWy..', '...y...', '.......', '.......'],
    ['...y...', '...y...', '..yWy..', 'yyWWWyy', '..yWy..', '...y...', '...y...'],
    ['.......', '.g...g.', '...y...', '..yWy..', '...y...', '.g...g.', '.......'],
    ['.......', '.......', '.......', '...g...', '.......', '.......', '.......'],
  ],
  { fps: 12 },
);

// Level-up: a ring of seeds pops up as seedlings, whose leaves then lift away.
const LVL = { L: 'lime', s: 'sprout', g: 'leaf', G: 'moss', y: 'butter', W: 'white', w: 'wheat', c: 'clay' } as const;
const SEEDLING = ['LL.LL', 'sgGgs', '..G..'];
function ringFrame(r: number, art: string[], extra: [number, number, string][] = [], dots: [number, string][] = [], lift = 0): string[] {
  const g = grid(24, 24);
  for (const [dr, ch] of dots)
    for (let k = 0; k < 32; k++) {
      if (k % 4 === 0) continue; // leave room for the seedlings
      const a = (k * Math.PI) / 16;
      put(g, Math.round(11.5 + Math.sin(a) * (r + dr)), Math.round(11.5 - Math.cos(a) * (r + dr)), ch);
    }
  for (let d = 0; d < 8; d++) {
    const a = (d * Math.PI) / 4;
    const x = 11.5 + Math.sin(a) * r;
    const y = 11.5 - Math.cos(a) * r - lift;
    stamp(g, art, Math.round(x - (art[0].length - 1) / 2), Math.round(y - (art.length - 1) / 2));
  }
  for (const [x, y, ch] of extra) put(g, x, y, ch);
  return rows(g);
}
const fx_levelup = sprite(
  'fx_levelup',
  LVL,
  [
    ringFrame(5, ['w', 'c'], [[11, 11, 'W'], [12, 11, 'y'], [11, 12, 'y'], [11, 10, 'y'], [10, 11, 'y'], [12, 12, 'y']], [[0, 'L']]),
    ringFrame(7.5, ['L', 's', 'G'], [[11, 11, 'y'], [12, 12, 'y'], [4, 4, 'W'], [19, 19, 'y']], [[0, 'L'], [0.9, 'g']]),
    ringFrame(9.5, SEEDLING, [[5, 4, 'y'], [18, 5, 'W'], [4, 18, 'W'], [18, 18, 'y'], [11, 0, 'y'], [0, 11, 'y']], [[0, 'g']]),
    ringFrame(10, ['L.L', '.s.'], [[6, 2, 'y'], [20, 3, 'W'], [2, 20, 'y'], [21, 15, 'y']], [], 1.5),
  ],
  { fps: 10 },
);

const SHARD = { W: 'white', i: 'ice', m: 'mist', f: 'fog', d: 'dusk' } as const;
function shatterFrame(parts: [number, number, string[]][]): string[] {
  const g = grid(12, 12);
  for (const [x, y, art] of parts) stamp(g, art, x, y);
  return rows(g);
}
const fx_shatter = sprite(
  'fx_shatter',
  SHARD,
  [
    shatterFrame([
      [3, 3, ['.im..', 'imWmf', 'mWiWf', '.mWfd', '..fd.']],
      [1, 1, ['i']],
      [9, 1, ['m']],
      [1, 9, ['f']],
      [9, 9, ['d']],
    ]),
    shatterFrame([
      [1, 1, ['iW', 'mf']],
      [5, 0, ['i', 'm']],
      [9, 1, ['Wi', 'fm']],
      [0, 5, ['im']],
      [10, 6, ['mf']],
      [1, 9, ['im', '.f']],
      [6, 10, ['m', 'd']],
      [9, 9, ['mf', 'fd']],
    ]),
    shatterFrame([
      [0, 0, ['i']],
      [5, 0, ['m']],
      [11, 0, ['i']],
      [0, 6, ['m']],
      [11, 5, ['f']],
      [0, 11, ['f']],
      [6, 11, ['d']],
      [11, 11, ['d']],
      [3, 3, ['W']],
      [8, 8, ['i']],
    ]),
    shatterFrame([
      [1, 1, ['W']],
      [10, 2, ['i']],
      [2, 10, ['i']],
      [10, 10, ['W']],
    ]),
  ],
  { fps: 14 },
);

const fx_zap = sprite(
  'fx_zap',
  { W: 'white', i: 'ice', a: 'aqua', c: 'cyan', y: 'butter' },
  [
    ['....c...', '...cW...', 'y..Wi..c', '.aWWWiW.', '..iWWW..', '.Wi.aWa.', 'c...iW..', '.....y..'],
    ['........', '..c...y.', '...W.W..', '...iWi..', '..WiWa..', '.c...Wc.', '........', '........'],
    ['........', '.c......', '......a.', '...y....', '........', '..a...c.', '........', '....c...'],
  ],
  { fps: 18 },
);

// ---------------------------------------------------------------------------
// Preview scenes (contact-sheet only; every name starts with preview_)

const PLAYER = [p_pea, p_seed, p_chunk, p_turnip, p_carrot, p_petal, p_tomato, p_pumpkin, p_kernel, p_bee, p_shroom, p_thorn, p_ember, p_frost, p_briar, p_moon];
const ENEMY = [eb_orb_pink, eb_orb_gold, eb_orb_violet, eb_orb_cyan, eb_small_pink, eb_small_gold, eb_pollen, eb_thorn, eb_mud, eb_ring, eb_spore];

function lineup(name: string, ground: string[]): SpriteDef {
  const items: Placement[] = [];
  let x = 4;
  for (const d of PLAYER) {
    const w = d.frames[0][0].length + 2;
    items.push([d, x + w / 2, 10]);
    x += w + 2;
  }
  x = 6;
  for (const d of ENEMY) {
    const w = d.frames[0][0].length + 2;
    items.push([d, x + w / 2, 26]);
    x += w + 4;
  }
  return scene(name, ground, items);
}

function swarm(name: string, ground: string[]): SpriteDef {
  const items: Placement[] = [];
  let k = 0;
  for (let y = 6; y < 64; y += 11)
    for (let x = 6; x < 120; x += 13) {
      const enemy = (k + Math.floor(y / 11)) % 2 === 0;
      const list = enemy ? ENEMY : PLAYER;
      const d = list[(k * 7 + y) % list.length];
      items.push([d, x + ((y * 5) % 7), y]);
      k++;
    }
  return scene(name, ground, items);
}

const HAZARDS = [h_poison, h_fire, h_spores];
const PICKUPS = [pk_sap_s, pk_sap_m, pk_sap_l, pk_farthing, pk_chest];
const EFFECTS = [fx_hit, fx_dust, fx_poof, fx_burrow, fx_explosion, fx_sparkle, fx_levelup, fx_shatter, fx_zap];

/** A busy moment: hazards underneath, a ring of enemy fire, player volleys, effects and drops. */
function battle(name: string, ground: string[]): SpriteDef {
  const items: Placement[] = [
    [h_poison, 26, 62, 0],
    [h_fire, 104, 66, 1],
    [h_spores, 66, 54, 0],
    [pk_sap_m, 12, 40],
    [pk_farthing, 20, 44, 0],
    [pk_sap_s, 118, 44],
    [fx_explosion, 40, 30, 1],
    [fx_hit, 112, 20, 0],
    [fx_poof, 82, 66, 1],
  ];
  // enemy ring around (88, 30)
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    items.push([k % 2 ? eb_orb_violet : eb_orb_pink, 88 + Math.cos(a) * 17, 32 + Math.sin(a) * 15]);
  }
  for (let k = 0; k < 7; k++) items.push([eb_small_gold, 60 + k * 9, 8 + (k % 2) * 4]);
  for (let k = 0; k < 4; k++) items.push([eb_thorn, 14 + k * 12, 74 - k * 2]);
  items.push([eb_pollen, 70, 72], [eb_spore, 58, 66], [eb_mud, 120, 58], [eb_ring, 74, 46], [eb_orb_cyan, 50, 50], [eb_orb_gold, 102, 50]);
  // player volleys streaming right from (6, 22)
  for (let k = 0; k < 6; k++) items.push([p_pea, 10 + k * 8, 20 + (k % 2)]);
  items.push([p_carrot, 30, 12], [p_turnip, 60, 26], [p_tomato, 72, 18], [p_petal, 50, 40, 0], [p_petal, 58, 38, 1]);
  items.push([p_kernel, 22, 52], [p_kernel, 30, 54], [p_bee, 112, 32, 0], [p_ember, 84, 52, 0], [p_frost, 96, 40], [p_moon, 38, 64]);
  items.push([p_thorn, 64, 60], [p_seed, 8, 60], [p_chunk, 66, 30, 1], [p_chunk, 54, 22, 2], [p_shroom, 92, 74, 2]);
  return scene(name, ground, items);
}

export const SPRITES: SpriteDef[] = [
  ...PLAYER,
  ...HAZARDS,
  ...ENEMY,
  ...PICKUPS,
  ...EFFECTS,
  lineup('preview_line_meadow', meadow(176, 34)),
  lineup('preview_line_corrupt', corrupt(176, 34)),
  lineup('preview_line_farm', farm(176, 34)),
  battle('preview_battle_meadow', meadow(128, 82, 9)),
  battle('preview_battle_corrupt', corrupt(128, 82, 10)),
  swarm('preview_swarm_meadow', meadow(124, 68, 5)),
  swarm('preview_swarm_corrupt', corrupt(124, 68, 6)),
];
