// Seed packets, 14x14 drawn (16x16 after outline). One shared folded-paper
// packet with a crimped top, a tiny species illustration, and a label band
// coloured by crop family. The forbidden kingsmarrow packet is the same base,
// aged, torn and sealed with plum wax.
import { sprite, swapChars, type SpriteDef } from '../sprite';
import { L, art, compose } from './crops-kit';
import { ICON } from './crops-produce';

export type CropFamily = 'vegetable' | 'root' | 'flower' | 'fungi' | 'fruit' | 'grain' | 'vine' | 'forbidden';

/** Family of every seed, for the programmer: the band colour on each packet follows this. */
export const SEED_FAMILY: Record<string, CropFamily> = {
  pea: 'vegetable', thunderpea: 'vegetable', pumpkin: 'vegetable', briargourd: 'vegetable',
  turnip: 'root', carrot: 'root', emberroot: 'root',
  sunflower: 'flower', beebalm: 'flower', sporelight: 'flower',
  choircap: 'fungi',
  tomato: 'fruit', hellfruit: 'fruit', chilli: 'fruit',
  stormcorn: 'grain',
  thornvine: 'vine',
  kingsmarrow: 'forbidden',
};

// Band tones per family: light top edge, base, dark right edge / lettering.
const BAND: Record<CropFamily, [string, string, string]> = {
  vegetable: ['s', 'g', 'G'],
  root: ['a', 'o', 'r'],
  flower: ['O', 'j', 'u'],
  fungi: ['f', 'd', 't'],
  fruit: ['x', 'e', 'E'],
  grain: ['Y', 'y', 'a'],
  vine: ['i', 'S', 'b'],
  forbidden: ['q', 'Q', 'H'],
};

// The packet. 1/2/3 are band placeholders (light, base, dark); the illustration
// window is the cream area x2..x10, y3..y9.
const PACKET = art('packet', [
  '.C.C.C.C.C.p..',
  '.WCCCCCCCCCpk.',
  '.ppppppppppkk.',
  '.WCCCCCCCCCpk.',
  '.WCCCCCCCCCpk.',
  '.CCCCCCCCCCpk.',
  '.CCCCCCCCCCpk.',
  '.CCCCCCCCCCpk.',
  '.CCCCCCCCCCpk.',
  '.CCCCCCCCCCpk.',
  '.11111111111k.',
  '.23233232322k.',
  '.22222222223k.',
  '..kkkkkkkkkc..',
]);

function packet(family: CropFamily, illus: string[]): string[] {
  const [a, b, c] = BAND[family];
  return compose(ICON, ICON, [
    [swapChars(PACKET, { 1: a, 2: b, 3: c }), 0, 0],
    [illus, 2, 3],
  ]);
}

// Aged paper, a torn top-right corner, a wax seal over the crimp, a blot.
function forbiddenPacket(illus: string[]): string[] {
  const aged = swapChars(packet('forbidden', illus), { W: 'C', C: 'p', p: 'k', k: 'c', c: 'w' });
  return compose(ICON, ICON, [
    [aged, 0, 0],
    [art('seal', ['.HqH.', 'qQuQq', '.QQ9.']), 4, 0],
    [art('blot', ['X.', '.X']), 9, 8],
  ]).map((r, y) => (y === 0 ? r.slice(0, 11) + '...' : y === 1 ? r.slice(0, 12) + '..' : r));
}

const MINI = {
  pea: art('m_pea', [
    '......Gg.',
    '.....lsG.',
    '....lsgP.',
    '...lsgP..',
    '..lsgP...',
    '.lsgP....',
    '.gP......',
  ]),
  turnip: art('m_turnip', [
    '...g.g...',
    '..gGgGg..',
    '..juuuq..',
    '.jJuuqqQ.',
    '.ppkuqQQ.',
    '..kkkcc..',
    '....kc...',
  ]),
  carrot: art('m_carrot', [
    '......g.g',
    '.....gGg.',
    '....aoP..',
    '...aorR..',
    '..aorR...',
    '.aoR.....',
    '.r.......',
  ]),
  sunflower: art('m_sunflower', [
    '..YyYyY..',
    '.YyBBByY.',
    '.yBLBLBa.',
    '.YBLBLBa.',
    '.yaBBBaa.',
    '..aaoao..',
    '....G....',
  ]),
  tomato: art('m_tomato', [
    '...GgG...',
    '..xGeGe..',
    '.xWeeeeE.',
    '.xeeeeEV.',
    '.eeeeEEV.',
    '..eEEVV..',
    '...VVV...',
  ]),
  pumpkin: art('m_pumpkin', [
    '....GP...',
    '..aaPor..',
    '.aYorooR.',
    '.aaoroRR.',
    '.ooroRRB.',
    '..rrRRB..',
    '.........',
  ]),
  thornvine: art('m_thornvine', [
    '.E.XVVX.E',
    '..XV..VX.',
    '..or..or.',
    '.oWR.oWR.',
    '.orR.orR.',
    '.rRD.rRD.',
    '..DL..DL.',
  ]),
  choircap: art('m_choircap', [
    '..iISSb..',
    '.iISWSbN.',
    '.bbzn9bN.',
    '...zzk...',
    '...Cpk...',
    '...Cpk...',
    '..gGGGg..',
  ]),
  stormcorn: art('m_stormcorn', [
    '.......A.',
    '......Yi.',
    '.....YyA.',
    '....YAya.',
    '..gYyao..',
    '.gGPa....',
    '.GP......',
  ]),
  beebalm: art('m_beebalm', [
    '.O.O.O.O.',
    '..jOjOj..',
    '.OjqQqjO.',
    '..jjjjj..',
    '.O.uGu.O.',
    '....G....',
    '...gG....',
  ]),
  chilli: art('m_chilli', [
    '.......GP',
    '......gG.',
    '.....xeE.',
    '....xeEV.',
    '...xeEV..',
    '..xeEV...',
    '.eEV.....',
  ]),
  kingsmarrow: art('m_kingsmarrow', [
    '..y.y.y..',
    '..T.T.T..',
    '..uqqqQ..',
    '.uq9Q9Q9.',
    '.uqHQHQ9.',
    '..qQQQ9..',
    '....H....',
  ]),
  emberroot: art('m_emberroot', [
    '......P.T',
    '.....TPT.',
    '....RDP..',
    '...RRDX..',
    '..yRDX...',
    '.YFX.....',
    '.W.......',
  ]),
  sporelight: art('m_sporelight', [
    '..W.I.W..',
    '...mIm...',
    '.WIiSbIW.',
    '...mbNm..',
    '..W.Cp.W.',
    '....G....',
    '....G....',
  ]),
  briargourd: art('m_briargourd', [
    '....wB...',
    '...zPT...',
    '....PTEz.',
    '..GPPPT..',
    'zEGgPPTM.',
    '..GPPTMEz',
    '...TMMM..',
  ]),
  thunderpea: art('m_thunderpea', [
    '......SN.',
    '.....ISN.',
    '....IASN.',
    '...IAS..Y',
    '..IAS..YW',
    '.IAN....Y',
    '.SN......',
  ]),
  hellfruit: art('m_hellfruit', [
    '...FyF...',
    '..FaFaF..',
    '.EzVFVX..',
    '.EVVVVXU.',
    '.VVVVXXU.',
    '..VVXXU..',
    '...XUU...',
  ]),
};

export const SEEDS: SpriteDef[] = (Object.keys(MINI) as (keyof typeof MINI)[]).map((sp) => {
  const fam = SEED_FAMILY[sp];
  const rows = fam === 'forbidden' ? forbiddenPacket(MINI[sp]) : packet(fam, MINI[sp]);
  return sprite(`seed_${sp}`, L, [rows], { outline: true });
});
