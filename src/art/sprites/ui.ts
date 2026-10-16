// HARVESTHEX ui group: 9-slice wooden and parchment frames, slots, buttons,
// bar frames, HUD icons, damage-type and mutation-trait icons, rarity gems,
// farm tool icons, cursors and the logo.
//
// 9-slice frames are built from edge profiles (outside -> inside) so every edge
// is uniform along its length and stretches cleanly; corners are hand drawn.
import type { PalName } from '../palette';
import { sprite, type SpriteDef } from '../sprite';
import { frame } from './ui-kit';
import { LOGO } from './ui-logo';
import { buildPreviews } from './ui-preview';

// ---------------------------------------------------------------------------
// Wood panel: honey-wood frame built like the real thing, two long boards
// nailed across two uprights and overhanging them by a pixel, with dark
// planks inside. The uprights sit 1px in, so the left and right bands start
// with a transparent column.
const WOOD_LEGEND = {
  k: 'ink', u: 'umber', l: 'loam', b: 'bark', w: 'wood', c: 'clay', s: 'skin', p: 'peach',
  n: 'pebble', N: 'stone', d: 'slate', h: 'white',
} as const;

const woodRows = frame({
  w: 24, h: 24, b: 8,
  top: 'kscwcbkl',
  left: '.kscwbkl',
  bottom: 'kbcwcskb',
  right: '.kbwcskb',
  centre: ['bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'bbbbbbbb', 'llllllll'],
  tl: [
    '.kkkkkkk',
    'ksssssss',
    'kschNccc',
    'kswNdwww',
    'kccccccc',
    'kbbbbbbb',
    '.kkkkkkk',
    '.kscwbkl',
  ],
  tr: [
    'kkkkkkk.',
    'sssssssk',
    'ccchNcck',
    'wwwNdwbk',
    'ccccccbk',
    'bbbbbbbk',
    'kkkkkkk.',
    'lkscwbk.',
  ],
  bl: [
    '.kscwbkl',
    '.kkkkkkk',
    'ksssssss',
    'kschNccc',
    'kswNdwww',
    'kccccccc',
    'kbbbbbbb',
    '.kkkkkkk',
  ],
  br: [
    'bkscwbk.',
    'kkkkkkk.',
    'sssssssk',
    'ccchNcck',
    'wwwNdwbk',
    'ccccccbk',
    'bbbbbbbk',
    'kkkkkkk.',
  ],
});

// ---------------------------------------------------------------------------
// Parchment: cream sheet, scorched edge, one inked rule with little corner
// boxes. Wear lives in the corners only (dog-ear top right, scorch nick bottom
// right) so the edges stay uniform.
const PARCH_LEGEND = {
  k: 'ink', l: 'loam', b: 'bark', w: 'wood', c: 'clay', t: 'skin', p: 'peach', e: 'cream', h: 'white',
} as const;

const parchRows = frame({
  w: 24, h: 24, b: 8,
  top: 'ktpeebee',
  left: 'ktpeebee',
  bottom: 'ktpeebee',
  right: 'ktpeebee',
  centre: ['eeeeeeee'],
  tl: [
    '..kkkkkk',
    '.ktttttt',
    'ktpppppp',
    'ktpbbbee',
    'ktpbebee',
    'ktpbbbbb',
    'ktpeebee',
    'ktpeebee',
  ],
  tr: [
    'kkkk....',
    'ttptk...',
    'pppthk..',
    'eepteek.',
    'eepttttk',
    'bbbppptk',
    'eebeeptk',
    'eebeeptk',
  ],
  bl: [
    'ktpeebee',
    'ktpeebee',
    'ktpbbbbb',
    'ktpbebee',
    'ktpbbbee',
    'ktpppppp',
    '.ktttttt',
    '..kkkkkk',
  ],
  br: [
    'eebeeptk',
    'eebeeptk',
    'bbbbbtk.',
    'eebebtk.',
    'eebbbptk',
    'pppppptk',
    'ttttttk.',
    'kkkkkk..',
  ],
});

// ---------------------------------------------------------------------------
// Slots: a recess cut into the board. Top/left walls in shadow, bottom/right lip lit.
const SLOT_LEGEND = {
  k: 'ink', u: 'umber', l: 'loam', b: 'bark', w: 'wood', c: 'clay',
  y: 'butter', g: 'gold', a: 'amber', o: 'orange', h: 'white',
} as const;

function slotRows(ring1: [string, string, string], glint?: string): string[] {
  // ring1 = [top/left, mitre, bottom/right]; glint replaces its top-left corner.
  const [t, m, r] = ring1;
  const k = 'k';
  const g = glint ?? t;
  return frame({
    w: 20, h: 20, b: 4,
    top: `${k}${t}ul`,
    left: `${k}${t}ul`,
    bottom: `${k}${r}bl`,
    right: `${k}${r}bl`,
    centre: ['l'],
    tl: [`.${k}${k}${k}`, `${k}${g}${t}${t}`, `${k}${t}uu`, `${k}${t}ul`],
    tr: [`${k}${k}${k}.`, `${t}${t}${m}${k}`, `ul${r}${k}`, `lb${r}${k}`],
    bl: [`${k}${t}ul`, `${k}${t}lb`, `${k}${m}${r}${r}`, `.${k}${k}${k}`],
    br: [`lb${r}${k}`, `bb${r}${k}`, `${r}${r}${r}${k}`, `${k}${k}${k}.`],
  });
}

// ---------------------------------------------------------------------------
// Buttons: a raised wooden plaque with a two-pixel lip. Face stays `wood` in
// every state so cream text keeps its contrast.
const BTN_LEGEND = { k: 'ink', l: 'loam', b: 'bark', w: 'wood', c: 'clay', s: 'skin', h: 'white', y: 'butter', g: 'gold', a: 'amber' } as const;

const btnNormal = frame({
  w: 24, h: 14, b: 4,
  top: 'kcww', left: 'kcww', bottom: 'klbw', right: 'kbww',
  centre: ['w'],
  tl: ['.kkk', 'kscc', 'kcww', 'kcww'],
  tr: ['kkk.', 'ccwk', 'wwbk', 'wwbk'],
  bl: ['kcww', 'kbbb', 'klll', '.kkk'],
  br: ['wwbk', 'bbbk', 'lllk', 'kkk.'],
});
// Hover: the same plaque with a gilt rim (gold = "this one", as on ui_slot_sel).
const btnHover = frame({
  w: 24, h: 14, b: 4,
  top: 'kyww', left: 'kgww', bottom: 'klba', right: 'kaww',
  centre: ['w'],
  tl: ['.kkk', 'khyy', 'kgww', 'kgww'],
  tr: ['kkk.', 'yyak', 'wwak', 'wwak'],
  bl: ['kgww', 'kbbb', 'klll', '.kkk'],
  br: ['aaak', 'bbbk', 'lllk', 'kkk.'],
});
const btnPressed = frame({
  w: 24, h: 14, b: 4,
  top: '.klw', left: 'klww', bottom: 'kbww', right: 'kbww',
  centre: ['w'],
  tl: ['....', '.kkk', 'klll', 'klww'],
  tr: ['....', 'kkk.', 'llbk', 'wwbk'],
  bl: ['klww', 'klww', 'kbbb', '.kkk'],
  br: ['wwbk', 'wwbk', 'bbbk', 'kkk.'],
});

// ---------------------------------------------------------------------------
// Bar frame: wooden rim between ink lines, brass end caps, dark trough inside.
const BAR_LEGEND = { k: 'ink', u: 'umber', w: 'wood', c: 'clay', y: 'butter', g: 'gold', a: 'amber', o: 'orange' } as const;
const barRows = frame({
  w: 32, h: 8, b: 3,
  top: 'kck', left: 'kgk', bottom: 'kwk', right: 'kak',
  centre: ['u'],
  tl: ['.kk', 'kyc', 'kgk'],
  tr: ['kk.', 'cak', 'kak'],
  bl: ['kgk', 'kgw', '.kk'],
  br: ['kak', 'wok', 'kk.'],
});

// ---------------------------------------------------------------------------
// Tabs: frame 0 resting (lower, darker), frame 1 active (raised, lit).
const TAB_LEGEND = { k: 'ink', l: 'loam', b: 'bark', w: 'wood', c: 'clay', s: 'skin' } as const;
const tabIdle = frame({
  w: 24, h: 12, b: 4,
  top: '..kw', left: 'kwbb', bottom: 'klbb', right: 'klbb',
  centre: ['b'],
  tl: ['....', '....', '.kkk', 'kwww'],
  tr: ['....', '....', 'kkk.', 'wwlk'],
  bl: ['kwbb', 'kwbb', 'kwll', 'kkkk'],
  br: ['bblk', 'bblk', 'lllk', 'kkkk'],
});
const tabActive = frame({
  w: 24, h: 12, b: 4,
  top: 'kscw', left: 'kcww', bottom: 'kbww', right: 'kbww',
  centre: ['w'],
  tl: ['..kk', '.kss', 'kscc', 'kscw'],
  tr: ['kk..', 'sck.', 'ccbk', 'wwbk'],
  bl: ['kcww', 'kcww', 'kcbb', 'kkkk'],
  br: ['wwbk', 'wwbk', 'bbbk', 'kkkk'],
});

const FRAMES: SpriteDef[] = [
  sprite('ui_wood', WOOD_LEGEND, [woodRows]),
  sprite('ui_parchment', PARCH_LEGEND, [parchRows]),
  sprite('ui_slot', SLOT_LEGEND, [slotRows(['u', 'b', 'w'])]),
  sprite('ui_slot_sel', SLOT_LEGEND, [slotRows(['y', 'g', 'a'], 'h')]),
  sprite('ui_btn', BTN_LEGEND, [btnNormal, btnHover, btnPressed]),
  sprite('ui_bar', BAR_LEGEND, [barRows]),
  sprite('ui_tab', TAB_LEGEND, [tabIdle, tabActive]),
];

// ---------------------------------------------------------------------------
// HUD icons: 7x7 drawings, outlined to 9x9.
const ic = (name: string, legend: Record<string, PalName>, rows: string[]): SpriteDef =>
  sprite(name, legend, [rows], { outline: true });

const ICONS: SpriteDef[] = [
  ic('ic_heart', { R: 'red', c: 'crimson', w: 'white', s: 'salmon' }, [
    '.RR.RR.',
    'RwsRRRR',
    'RsRRRRc',
    'RRRRRcc',
    '.RRRcc.',
    '..Rcc..',
    '...c...',
  ]),
  ic('ic_heart_empty', { a: 'ash', s: 'soot', l: 'slate' }, [
    '.aa.aa.',
    'alaaaaa',
    'aaaaaas',
    'aaaaass',
    '.aaass.',
    '..ass..',
    '...s...',
  ]),
  ic('ic_sap', { y: 'butter', g: 'gold', a: 'amber', o: 'orange', w: 'white' }, [
    '...y...',
    '..yga..',
    '..gaa..',
    '.ygaaa.',
    '.wgaao.',
    '.gaayo.',
    '..aoo..',
  ]),
  ic('ic_farthing', { s: 'skin', p: 'peach', r: 'rust', b: 'brick', h: 'loam' }, [
    '..sss..',
    '.sppprb',
    'spbbbrb',
    'spbhbrb',
    'spbbbrb',
    '.rrrrb.',
    '..bbb..',
  ]),
  ic('ic_sprout', { l: 'lime', s: 'sprout', g: 'leaf', m: 'moss', w: 'wood', b: 'bark' }, [
    '.ls....',
    'lssg.ls',
    '.ggmgsg',
    '...m.g.',
    '...m...',
    '.bwwwb.',
    'bbbbbbb',
  ]),
  ic('ic_clock', { y: 'butter', g: 'gold', a: 'amber', o: 'orange', e: 'cream', p: 'peach', l: 'loam' }, [
    '..ygg..',
    '.yeeea.',
    'yeeleea',
    'geellea',
    'geeeeeo',
    '.apppo.',
    '..ooo..',
  ]),
  ic('ic_skull', { h: 'white', m: 'mist', f: 'fog', k: 'ink' }, [
    '.hhhhh.',
    'hhhhhhm',
    'hkkhkkm',
    'hkkhkkm',
    '.hhkhm.',
    '.mhmhm.',
    '.m.m.m.',
  ]),
  ic('ic_dash', { h: 'white', i: 'ice', c: 'cyan', s: 'sky' }, [
    'h..i...',
    'hi.ic..',
    '.ii.ic.',
    '..ic.cs',
    '.ic.cs.',
    'ic.cs..',
    'c..s...',
  ]),
  ic('ic_star', { y: 'butter', g: 'gold', a: 'amber', o: 'orange', w: 'white' }, [
    '...y...',
    '..ywg..',
    'yyyygga',
    '.yggga.',
    '..gga..',
    '.ga.ao.',
    '.a...o.',
  ]),
  ic('ic_lock', { n: 'pebble', s: 'stone', d: 'slate', y: 'butter', g: 'gold', a: 'amber', k: 'loam' }, [
    '..nns..',
    '.n...s.',
    '.s...d.',
    'yyyyyya',
    'yggkgga',
    'gggkgga',
    'aaaaaaa',
  ]),
  ic('ic_reroll', { h: 'white', e: 'cream', p: 'peach', k: 'loam' }, [
    '.hhhhh.',
    'hkeeekp',
    'heeeeep',
    'heekeep',
    'heeeeep',
    'hkeeekp',
    '.ppppp.',
  ]),
  ic('ic_water', { i: 'ice', c: 'cyan', s: 'sky', b: 'blue', w: 'white' }, [
    '...i...',
    '..ic...',
    '..ccs..',
    '.iwcss.',
    '.icsss.',
    '.csssb.',
    '..sbb..',
  ]),
  ic('ic_seed', { h: 'cream', p: 'peach', s: 'skin', c: 'clay', w: 'wood' }, [
    '...h...',
    '..hpc..',
    '.hpssc.',
    '.psssc.',
    '.pshsc.',
    '..scw..',
    '...w...',
  ]),
  ic('ic_hand', { p: 'peach', s: 'skin', c: 'clay', w: 'wood' }, [
    '.p.p.p.',
    '.s.s.s.',
    'ps.s.sc',
    'ssssssc',
    '.sssssc',
    '.ssscc.',
    '..scc..',
  ]),
  ic('ic_exit', { c: 'clay', w: 'wood', b: 'bark', l: 'loam', h: 'cream' }, [
    'cccc...',
    'cllw...',
    'cllw.h.',
    'cllhhhh',
    'cllw.h.',
    'cllw...',
    'cwww...',
  ]),
  ic('ic_bag', { s: 'skin', c: 'clay', w: 'wood', g: 'gold', y: 'butter', p: 'peach' }, [
    '..www..',
    '.w...w.',
    'psssssc',
    'pcccccw',
    'scgycww',
    'sccccww',
    '.wwwww.',
  ]),
  ic('ic_crown', { h: 'white', y: 'butter', g: 'gold', a: 'amber', o: 'orange', r: 'red' }, [
    '.......',
    'h..y..g',
    'yy.g.ga',
    'yggggga',
    'gyrgrga',
    'aaaaaao',
    '.......',
  ]),
  ic('ic_armour', { h: 'white', n: 'pebble', s: 'stone', d: 'slate' }, [
    'nnnnnns',
    'nhhnssd',
    'nhnnssd',
    'nnnnssd',
    '.nnssd.',
    '..nsd..',
    '...d...',
  ]),
  ic('ic_speed', { h: 'white', m: 'mist', c: 'clay', w: 'wood', s: 'skin', b: 'bark' }, [
    'h..scw.',
    'hh.scw.',
    'mhhscw.',
    '.mmscw.',
    '...sccw',
    '..scccw',
    '..bbbbb',
  ]),
  ic('ic_crit', { r: 'red', c: 'crimson', h: 'white' }, [
    '..rrr..',
    '.rhhhr.',
    'rhrrrhc',
    'rhrhrhc',
    'rhrrrhc',
    '.chhhc.',
    '..ccc..',
  ]),
  ic('ic_luck', { l: 'lime', s: 'sprout', g: 'leaf', m: 'moss', p: 'pine' }, [
    '.ss.sg.',
    'slsgsgg',
    'ssgmggm',
    '..mpm..',
    'sggmggm',
    'sgm.gmm',
    '...p...',
  ]),
];

// Damage types: 5x5 drawings, outlined to 7x7 (the fist carries its own ink so
// its knuckles can be split by the outline colour).
const DAMAGE: SpriteDef[] = [
  sprite('dt_physical', { k: 'ink', p: 'peach', s: 'skin', c: 'clay' }, [[
    '.kkkkk.',
    'kpkpkpk',
    'kskskck',
    'kpppsck',
    'kssccck',
    '.kscck.',
    '..kkk..',
  ]]),
  ic('dt_nature', { l: 'lime', s: 'sprout', g: 'leaf', m: 'moss' }, [
    '...sg',
    '.ssgg',
    'sgmgm',
    'gmgm.',
    'm....',
  ]),
  ic('dt_arcane', { o: 'orchid', v: 'violet', w: 'white' }, [
    '..o..',
    '..o..',
    'oowvv',
    '..v..',
    '..v..',
  ]),
  ic('dt_elemental', { y: 'butter', g: 'gold', f: 'flame', o: 'orange' }, [
    '..f..',
    '.ff.f',
    '.fgff',
    'fgygf',
    '.fyf.',
  ]),
];

// Mutation traits: 7x7 drawings, outlined to 9x9.
const TRAITS: SpriteDef[] = [
  ic('tr_thorned', { g: 'leaf', m: 'moss', p: 'pine', r: 'red', c: 'crimson' }, [
    '.....gm',
    '.r..gm.',
    '..rgm..',
    '..gmrc.',
    '.gm....',
    'gmc....',
    'mc.....',
  ]),
  ic('tr_volatile', { a: 'ash', s: 'soot', l: 'slate', h: 'white', y: 'butter', o: 'orange', f: 'flame' }, [
    '.....y.',
    '....lo.',
    '..aal..',
    '.alhaa.',
    '.ahaas.',
    '.aaass.',
    '..sss..',
  ]),
  ic('tr_hollow', { h: 'white', m: 'mist', f: 'fog', d: 'dusk' }, [
    '..hmm..',
    '.hmmmf.',
    'hm...fd',
    'mm...fd',
    'mf...dd',
    '.ffddd.',
    '..ddd..',
  ]),
  ic('tr_leeching', { h: 'white', r: 'red', c: 'crimson', w: 'wine', s: 'salmon' }, [
    '.wwwww.',
    'whwwwhw',
    '.h...h.',
    '...r...',
    '..rrr..',
    '.rsrrc.',
    '..rcc..',
  ]),
  ic('tr_giant', { s: 'sprout', g: 'leaf', m: 'moss', l: 'lime' }, [
    '...l...',
    '..lsg..',
    '.lssgg.',
    'lssgggm',
    '..sgm..',
    '..sgm..',
    '..sgm..',
  ]),
  ic('tr_echoing', { o: 'orchid', v: 'violet', b: 'blush', m: 'magenta' }, [
    '....v..',
    '..o..v.',
    '...o..v',
    'b..o..m',
    '...o..m',
    '..o..m.',
    '....m..',
  ]),
  ic('tr_frostbound', { h: 'white', i: 'ice', c: 'cyan', s: 'sky' }, [
    '.i.i.i.',
    '..iii..',
    'ii.i.ic',
    '.iihic.',
    'ic.c.cc',
    '..ccc..',
    '.c.c.s.',
  ]),
  ic('tr_infested', { o: 'orchid', m: 'magenta', v: 'mauve', p: 'plum', d: 'plumdark' }, [
    '.d...d.',
    '..ddd..',
    '.omdmv.',
    '.mmpmv.',
    '.mvpvv.',
    '.mvpvp.',
    '..vpp..',
  ]),
  ic('tr_golden', { h: 'white', y: 'butter', g: 'gold', a: 'amber', o: 'orange', l: 'leaf', b: 'bark' }, [
    '...bl..',
    '.yy.gg.',
    'yhyggga',
    'yygggga',
    'yggggga',
    '.gggao.',
    '..aao..',
  ]),
  ic('tr_wild', { s: 'clay', c: 'wood', p: 'skin' }, [
    '.p...s.',
    '.s.p.s.',
    '...s...',
    'p.....c',
    '..pss..',
    '.psscc.',
    '.scccc.',
  ]),
  ic('tr_burning', { h: 'cream', y: 'butter', g: 'gold', o: 'orange', f: 'flame', r: 'brick' }, [
    '...f...',
    '..ff.f.',
    '.fof.ff',
    '.foofff',
    'foyyoof',
    'foyhyor',
    '.ryyyr.',
  ]),
  ic('tr_venomous', { s: 'sprout', g: 'leaf', m: 'moss', r: 'red', k: 'ink' }, [
    '...ssg.',
    '..sk.gr',
    '..gm...',
    '...gm..',
    '.s..gm.',
    '.gm.gm.',
    '..gmm..',
  ]),
  ic('tr_charged', { h: 'white', a: 'aqua', c: 'cyan', s: 'sky' }, [
    '...aac.',
    '..aac..',
    '.ahac..',
    'aaaaac.',
    '...ac..',
    '..ac...',
    '.as....',
  ]),
  ic('tr_barbed', { h: 'white', n: 'pebble', s: 'stone', d: 'slate' }, [
    '.......',
    '.h...n.',
    '..h.n..',
    'nnnnsss',
    '..s.d..',
    '.s...d.',
    '.......',
  ]),
];

// Rarity gems: 5x5 drawings, outlined to 7x7. Frames: common, uncommon, rare, legendary.
const GEM = ['.lmm.', 'lwmmd', 'mmmdd', '.mdd.', '..d..'];
const RARITY: SpriteDef = sprite(
  'ic_rarity',
  {
    w: 'white',
    a: 'pebble', b: 'stone', c: 'slate',
    e: 'lime', f: 'sprout', g: 'moss',
    i: 'ice', j: 'cyan', m: 'blue',
    n: 'butter', o: 'gold', q: 'orange',
  },
  [
    GEM.map((r) => r.replace(/l/g, 'a').replace(/m/g, 'b').replace(/d/g, 'c')),
    GEM.map((r) => r.replace(/l/g, 'e').replace(/m/g, 'f').replace(/d/g, 'g')),
    GEM.map((r) => r.replace(/l/g, 'i').replace(/m/g, 'j').replace(/d/g, 'm')),
    GEM.map((r) => r.replace(/l/g, 'n').replace(/m/g, 'o').replace(/d/g, 'q')),
  ],
  { outline: true },
);

// ---------------------------------------------------------------------------
// Farm tools: 14x14 drawings, outlined to 16x16.
const TOOLS: SpriteDef[] = [
  sprite('tool_can', {
    P: 'pine', M: 'moss', L: 'leaf', S: 'sprout', l: 'lime',
    y: 'butter', g: 'gold', a: 'amber', o: 'orange',
  }, [[
    '.............a',
    '...MMMMM....ya',
    '..M.....M..yga',
    '..M.....M.MMao',
    '.ygggggggaMM..',
    '.SllSSLLLMMM..',
    '.SlSLLLLLMM...',
    '.SSLLLLLLMM...',
    '.SLLLLLLLMP...',
    '.SgggggggaP...',
    '.SLLLLLLMMP...',
    '.LLLLLLMMMP...',
    '..PPPPPPPP....',
    '..............',
  ]], { outline: true }),
  sprite('tool_sickle', {
    h: 'white', n: 'pebble', s: 'stone', d: 'slate', f: 'stone', F: 'slate',
    c: 'clay', w: 'wood', r: 'brick',
  }, [[
    '..............',
    '....dddddd....',
    '...dssssssdd..',
    '..dhhhhhhssdd.',
    '.dh......hssd.',
    '.h........hsd.',
    '...........nsd',
    '...........nsd',
    '..........nsd.',
    '.........nsd..',
    '........fFd...',
    '.......rrf....',
    '.....crr......',
    '...cww........',
  ]], { outline: true }),
  sprite('tool_fert', {
    h: 'cream', p: 'peach', s: 'wheat', c: 'clay', w: 'wood', b: 'bark',
    u: 'umber', l: 'loam', g: 'leaf', m: 'moss', S: 'sprout', r: 'brick',
  }, [[
    '.......S.g....',
    '......SmSg....',
    '....lulmulb...',
    '..hslluulllsc.',
    '..hsssssssscc.',
    '...rrrrrrrrr..',
    '..hssssssscc..',
    '.hssshhhssccw.',
    '.hssshgShsccw.',
    '.ssssmghscccw.',
    '.sssshhhscccw.',
    '.sssssscccccw.',
    '..cccccccwww..',
    '..............',
  ]], { outline: true }),
];

// ---------------------------------------------------------------------------
// Cursors. The reticle is drawn with its own ink so the aim gap stays open.
const CURSORS: SpriteDef[] = [
  sprite('cur_cross', { k: 'ink', h: 'white', e: 'cream', r: 'red' }, [[
    '.....k.....',
    '....khk....',
    '....khk....',
    '....kek....',
    '.kkk.k.kkk.',
    'khhek.kehhk',
    '.kkk.k.kkk.',
    '....kek....',
    '....khk....',
    '....khk....',
    '.....k.....',
  ]]),
  sprite('cur_hand', { p: 'peach', s: 'skin', c: 'clay', w: 'wood', b: 'bark', n: 'blue', N: 'navy' }, [[
    '...ps.....',
    '..psc.....',
    '..psc.....',
    '..pscpsps.',
    '.ppscsccsc',
    'pspsssssc.',
    'psssssssc.',
    '.psssssc..',
    '..nnnnnN..',
    '..nnnnNN..',
  ]], { outline: true }),
];

const GAME_SPRITES: SpriteDef[] = [
  ...FRAMES,
  ...ICONS,
  ...DAMAGE,
  ...TRAITS,
  RARITY,
  ...TOOLS,
  ...CURSORS,
  LOGO,
];

export const SPRITES: SpriteDef[] = [...GAME_SPRITES, ...buildPreviews(GAME_SPRITES)];
