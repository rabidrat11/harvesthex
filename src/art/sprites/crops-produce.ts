// Produce icons, 14x14 drawn (16x16 after outline), in the Cute Fantasy pack's
// inventory style: chunky, black outline, 3-4 tones lit from the top-left,
// bright highlights, black interior lines between separate parts.
import { sprite, swapChars, type SpriteDef } from '../sprite';
import { L, art, compose } from './crops-kit';

export const ICON = 14;

function icon(name: string, rows: string[]): SpriteDef {
  art(name, rows);
  if (rows.length !== ICON || rows[0].length !== ICON) throw new Error(`crops: ${name} must be ${ICON}x${ICON}`);
  return sprite(name, L, [rows], { outline: true });
}

export const PEA_POD = art('pea_pod', [
  '...........gG.',
  '.........sPG..',
  '........sPPg..',
  '.......slsPg..',
  '......sPsggG..',
  '.....slsPgGP..',
  '....sPsggGP...',
  '...slsPgGP....',
  '..sPsggGP.....',
  '.slsPgGP......',
  '.PsggGP.......',
  '..PgGP........',
  '..gGP.........',
  '.gP...........',
]);

export const TURNIP = art('turnip', [
  '..sg..sg......',
  '..sgG.gGs..sg.',
  '...gGPgGP.sgG.',
  '....GPgPG.gGP.',
  '.....PGPGGP...',
  '....jjuuuq....',
  '..jJjjuuuuqq..',
  '.jJJjuuuuuqqQ.',
  '.jjjuuuuuqqqQ.',
  '.WCCCuuuqqqQQ.',
  '.CCCCCCCpppkk.',
  '..CCCCCpppkk..',
  '...CCpppkkk...',
  '......pk......',
]);

export const CARROT = art('carrot', [
  '..........s.g.',
  '.........sg.gG',
  '.........gGsGP',
  '.......aaoGPG.',
  '......aYaooP..',
  '.....aYaooor..',
  '....aYaoorrR..',
  '....YaororR...',
  '...aYaoorR....',
  '..aYoroR......',
  '..aaorR.......',
  '.aorR.........',
  '.oR...........',
  '..............',
]);

export const SUNFLOWER = art('sunflower', [
  '....y.Y..Y.y..',
  '...YyYYyYYya..',
  '..YYyBBBByya..',
  '.YYyBLBLBBya..',
  'YYyBLBLBLBLaa.',
  '.YyLBLBLBLBay.',
  'YyaBwBLBLwLaao',
  '.yaLBwwwwBBao.',
  '..yaBLBLBLaao.',
  '..yaaLBBLaao..',
  '...a.aoGPo.o..',
  '..sgg.gP......',
  '.sgGGPgP......',
  '..GPP.gP......',
]);

export const TOMATO = art('tomato', [
  '..............',
  '......GP......',
  '....gGgGGg....',
  '...gGGPPGGP...',
  '...xgGeeGPe...',
  '..xWxGeeePeE..',
  '.xWWxeeeeeeEE.',
  '.xWxeeeeeeEEV.',
  '.xxeeeeeeEEEV.',
  '.xeeeeeeeEEEV.',
  '.eeeeeeeEEEVV.',
  '..eeeeeEEEVV..',
  '...eEEEEEVV...',
  '.....EVVV.....',
]);

export const PUMPKIN = art('pumpkin', [
  '..........sg..',
  '.....GP..s..g.',
  '......GP..sg..',
  '...aao#P#oor..',
  '..aYar#aa#orr.',
  '.aYYorYaaoroRr',
  '.aYaorYaoorrRR',
  'aaYaoraaoorRRR',
  'aaaorroaoorRRB',
  '.aooroooorrRRB',
  '.oooroooorRRB.',
  '..oorrorrRRBB.',
  '...rrRRRRRBB..',
  '..............',
]);

// Rosehips: elongated orange-red hips with dried calyx tufts, on a thorny twig.
const HIP = art('hip', ['.or.', 'oWrR', 'orRR', 'rRRD', 'RRDX', '.DX.', '.LB.']);
export const ROSEHIPS = compose(ICON, ICON, [
  [art('rosehip_twig', [
    '..........gGg.',
    '.E.......gGPPX',
    '.XVE....XXPT..',
    '..XVVEVVX.E...',
    '...E.X.X......',
  ]), 0, 0],
  [HIP, 1, 5],
  [HIP, 6, 6],
  [art('hip_s', ['.o.', 'oWR', 'rRD', 'RDX', '.L.']), 10, 3],
]);

export const CHOIRCAP = art('choircap', [
  '..............',
  '...IiiSS......',
  '..IiWiSSSb....',
  '.iiSSSSWSbb...',
  '.iSSzzSSbbN...',
  'iSSznnzSbbNN..',
  'bbbzn9zbbNNN..',
  '...bzzbN..iSS.',
  '....Cppk.iIWSb',
  '....Cppk.Sz9bN',
  '....Cppk.bzzN.',
  '...CCppkk.Cpk.',
  '..gCppkkGgCpk.',
  '..GGgGGGPGGPP.',
]);

export const STORMCORN = art('stormcorn', [
  '...........W.I',
  '..........I.A.',
  '.........YyA..',
  '........YyYa..',
  '.......YyAyao.',
  '......YyYayo..',
  '.....YAyyao...',
  '..g.YyYaio....',
  '.gGsyYyao.....',
  'gGsGGAyo.s....',
  'gGGPGyo.sg....',
  '.GPTGGsgG.....',
  '..TPGgGP......',
  '...TPPT.......',
]);

export const BEEBALM = art('beebalm', [
  '...O.O.O.O....',
  '.O.jOjOjOj.O..',
  '..jjOjjjjjj...',
  '.OjjuqqqujjO..',
  '..jjqQQQqjj...',
  '.O.uqQQQqu.O..',
  '...u.u.u.u....',
  '.....sGs......',
  '......G.......',
  '...sg.G.......',
  '..sgGGG.......',
  '...GP.G.gs....',
  '......GGgGP...',
  '......G.......',
]);

export const CHILLI = art('chilli', [
  '...........GP.',
  '..........GP..',
  '........gGGP..',
  '.......#ggGPG.',
  '......xxeE#...',
  '.....xWeeEV...',
  '.....xeeEEV...',
  '....xeeEEV....',
  '....xeeEV.....',
  '...xeeEV......',
  '..xeeEV.......',
  '.xeEV.........',
  '.eEV..........',
  '..V...........',
]);

export const KINGSMARROW = art('kingsmarrow', [
  '...y..y..y....',
  '...T..T..T....',
  '..PTP.TP.TP...',
  '...MTPTTPTM...',
  '....MTMTMM....',
  '....uqqqqQ....',
  '..uqqqqqqQQ9..',
  '.uqqqqZqqQQ99.',
  '.uq99qqQ99Q99.',
  '.uqHqqQQHQQ99.',
  '..qqZqQQZQ99..',
  '...qQQZQQ99...',
  '....QQHQ99....',
  '......H9......',
]);

// ---------------------------------------------------------------- hybrids
export const EMBERROOT = art('emberroot', [
  '..........a.o.',
  '.........aP.TP',
  '.........PTaTM',
  '.......RRDPTP.',
  '......RrRDDM..',
  '.....RrRDDDX..',
  '....RrRDDDX...',
  '....rRDRDX....',
  '...yrRDDX.....',
  '..YyFRDX......',
  '..YyFFX.......',
  '.WYyF.........',
  '.Yy...........',
  '..............',
]);

export const SPORELIGHT = art('sporelight', [
  '......WI......',
  '..mW..Wm..Wm..',
  '..WIm.Im.WIf..',
  '...ImfmImIf...',
  'WIm.iISSb.mIW.',
  '.mIfIWSbN.fmf.',
  '...miSSbbNf...',
  '.WImfbbNNmImW.',
  '.mf..CpkfmIf..',
  '...WI.Cp..fm..',
  '..mIf.Cp.mf...',
  '..mf..Gs......',
  '......GsG.....',
  '......G.......',
]);

// Briargourd: a dark, striped bottle gourd bristling with crimson briar thorns.
export const BRIARGOURD = swapChars(art('briargourd', [
  '......wB......',
  '...z...Bw.....',
  '....EGsPT.....',
  '.....GsPTEz...',
  '....gGsPT.....',
  '...gGGsPTT....',
  'zEgGsGGsPTT...',
  '..GgsGGsPTTM..',
  '.GgsGgGsPPTMEz',
  '.GgGGgGsPPTMM.',
  '.GGGgGPsPPTMM.',
  'zEGGgGPsPTMM..',
  '..PGGPPPTMM...',
  '...TPPTTMM....',
]), { g: 'G', G: 'P', P: 'T', T: 'M', s: 'g' });

// The pea pod re-cut in storm colours, glowing peas, with a crackle of lightning.
export const THUNDERPEA = compose(ICON, ICON, [
  [swapChars(PEA_POD, { l: 'W', s: 'I', g: 'A', G: 'S', P: 'N' }), 0, 0],
  [art('bolt', ['..YW', '.YW.', 'YWYY', '..WY', '.WY.', '.Y..']), 9, 7],
  [art('spark', ['Y.', '.W']), 1, 1],
]);

// Hellfruit: a near-black tomato with a crimson sheen and a calyx of flame.
export const HELLFRUIT = swapChars(art('hellfruit', [
  '......Y.......',
  '...F..yF..Y...',
  '...FyFayFyF...',
  '....FaoFaoF...',
  '...EVFoFoFX...',
  '..EzEVFVFXVX..',
  '.EzzEVVVVVVXX.',
  '.EzEVVVVVVXXU.',
  '.EEVVVVVVXXXU.',
  '.EVVVVVVVXXXU.',
  '.VVVVVVVXXXUU.',
  '..VVVVVXXXUU..',
  '...VXXXXXUU...',
  '.....XUUU.....',
]), { X: 'U', U: '1' });

export const PRODUCE: SpriteDef[] = [
  icon('produce_pea', PEA_POD),
  icon('produce_turnip', TURNIP),
  icon('produce_carrot', CARROT),
  icon('produce_sunflower', SUNFLOWER),
  icon('produce_tomato', TOMATO),
  icon('produce_pumpkin', PUMPKIN),
  icon('produce_thornvine', ROSEHIPS),
  icon('produce_choircap', CHOIRCAP),
  icon('produce_stormcorn', STORMCORN),
  icon('produce_beebalm', BEEBALM),
  icon('produce_chilli', CHILLI),
  icon('produce_kingsmarrow', KINGSMARROW),
  icon('produce_emberroot', EMBERROOT),
  icon('produce_sporelight', SPORELIGHT),
  icon('produce_briargourd', BRIARGOURD),
  icon('produce_thunderpea', THUNDERPEA),
  icon('produce_hellfruit', HELLFRUIT),
];
