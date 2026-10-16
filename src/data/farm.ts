// Farm-side content: buildings and their repairs, plot expansions, held
// weapon tiers, equipment recipes and preserves.

import { CF, cf } from '../art/icons';
import type { StatMods } from './stats';
import type { EquipSlot } from '../meta/profile';

export type Cost = Record<string, number>;

export interface Repair {
  id: string;
  name: string;
  desc: string;
  cost: Cost;
  requires?: string;
}

export const REPAIRS: Repair[] = [
  { id: 'pump', name: 'Mend the irrigation pump', desc: 'Every planted plot is watered automatically at the start of each day.', cost: { farthings: 25, wood: 4 } },
  { id: 'bench', name: 'Rebuild the mutation bench', desc: 'Apply reagents to growing crops, and crossbreed produce into hybrid seeds.', cost: { farthings: 40, wood: 3, copper_ore: 2 } },
  { id: 'compost', name: 'Knock together a compost bin', desc: 'Turn spare produce and seeds into fertiliser for better harvests.', cost: { farthings: 15, wood: 5 } },
];

export interface Expansion {
  id: string;
  name: string;
  plots: number[];
  cost: Cost;
}

/** Plot ids by bed (see makePlots): bed 0 = 0..11, bed 1 = 12..23, bed 2 = 24..35. */
export const EXPANSIONS: Expansion[] = [
  { id: 'bed0b', name: 'Clear the second row', plots: [6, 7, 8, 9, 10, 11], cost: { farthings: 30, wood: 2 } },
  { id: 'bed1', name: 'Break ground on the east bed', plots: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], cost: { farthings: 80, wood: 6, iron_ore: 3 } },
  { id: 'bed2', name: 'Reclaim the old south bed', plots: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35], cost: { farthings: 160, wood: 10, iron_ore: 6, root_pollen: 1 } },
];

export const HELD_TIERS: { name: string; cost: Cost; desc: string }[] = [
  { name: 'Copper-bound', cost: { farthings: 35, copper_ore: 4 }, desc: 'Starts each expedition one level higher.' },
  { name: 'Iron-shod', cost: { farthings: 90, iron_ore: 6, leather: 2 }, desc: 'Starts each expedition two levels higher.' },
  { name: 'Crowned', cost: { farthings: 180, marrow_crown: 1, thorn_fibre: 2 }, desc: 'Starts each expedition three levels higher.' },
];

export interface EquipDef {
  id: string;
  name: string;
  slot: EquipSlot;
  icon: string;
  mods: StatMods;
  cost: Cost;
  desc: string;
}

export const EQUIPMENT: Record<string, EquipDef> = {};
function eq(d: EquipDef) {
  EQUIPMENT[d.id] = d;
}

eq({ id: 'tin_pot', name: 'Tin Pot Helm', slot: 'head', icon: cf(CF.openHelm), mods: { armour: 2, moveSpeed: -0.02 }, cost: { farthings: 30, iron_ore: 4 }, desc: 'A cooking pot with ambitions.' });
eq({ id: 'sallet', name: 'Hedge Knight’s Sallet', slot: 'head', icon: cf(CF.knightHelm), mods: { armour: 3, critChance: 0.03 }, cost: { farthings: 90, iron_ore: 6, thorn_fibre: 2 }, desc: 'Prised off a Bramble Knight. Smells of hedges.' });
eq({ id: 'mended_cuirass', name: 'Mended Cuirass', slot: 'body', icon: cf(CF.breastplate), mods: { maxHp: 15 }, cost: { farthings: 40, iron_ore: 5, leather: 2 }, desc: 'More patches than plate.' });
eq({ id: 'rust_cape', name: 'Rust-Caped Plate', slot: 'body', icon: cf(CF.capedPlate), mods: { maxHp: 25, armour: 2, moveSpeed: -0.06 }, cost: { farthings: 120, iron_ore: 8, leather: 4, marrow_crown: 1 }, desc: 'Heavy, warm, and impressively dramatic.' });
eq({ id: 'greaves', name: 'Hedger’s Greaves', slot: 'feet', icon: cf(CF.greaves), mods: { armour: 1, dashCooldown: 0.1 }, cost: { farthings: 35, copper_ore: 4 }, desc: 'For leaping hedges. And things in hedges.' });
eq({ id: 'sabatons', name: 'Ploughman’s Sabatons', slot: 'feet', icon: cf(CF.sabatons), mods: { moveSpeed: 0.06, dashDistance: 0.15 }, cost: { farthings: 60, leather: 4, feather: 3 }, desc: 'Light enough to run in, heavy enough to kick with.' });
eq({ id: 'wood_buckler', name: 'Barrel-Lid Buckler', slot: 'charm', icon: cf(CF.woodShield), mods: { armour: 2 }, cost: { farthings: 25, wood: 4 }, desc: 'It used to keep the rain out of the cider.' });
eq({ id: 'gold_buckler', name: 'Harvest Festival Shield', slot: 'charm', icon: cf(CF.goldShield), mods: { luck: 3, sapYield: 0.1 }, cost: { farthings: 100, gold_ore: 3, wood: 2 }, desc: 'Awarded for Best Marrow, 1714.' });
eq({ id: 'lucky_compass', name: 'Grandmother’s Compass', slot: 'charm', icon: cf(CF.pocketwatch), mods: { pickupRadius: 0.3, luck: 1 }, cost: { farthings: 50, feather: 2, copper_ore: 2 }, desc: 'Points towards whatever you have lost.' });

export interface JarDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Produce species that can be preserved into it (any quality). */
  from: string[] | 'any2';
}

export const JARS: Record<string, JarDef> = {
  jam: { id: 'jam', name: 'Jar of Jam', icon: cf(CF.jam), desc: 'Restores 35% health.', from: 'any2' },
  chilli_jam: { id: 'chilli_jam', name: 'Chilli Jam', icon: cf(CF.orangePotion), desc: 'Restores 20% health and fires you up: +30% attack speed for 8s.', from: ['chilli', 'hellfruit'] },
  balm_tonic: { id: 'balm_tonic', name: 'Balm Tonic', icon: cf(CF.redPotion), desc: 'Restores 20% health and makes you untouchable for 2s.', from: ['beebalm', 'sunflower'] },
};

export const MAX_JARS = 3;

/** The Root Engine in the cellar adds a jar to every expedition. */
export function maxJars(flags: Record<string, boolean | number>) {
  return MAX_JARS + (flags.rootEngine ? 1 : 0);
}
