// Permanent materials: what expeditions bring home besides seeds and sap.
// Used by Bertha's smithy, buildings, and the Mutation Bench.

import { CF, cf } from '../art/icons';
import type { Rarity } from './types';

export interface MaterialDef {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  desc: string;
}

export const MATERIALS: Record<string, MaterialDef> = {};

function m(id: string, name: string, icon: string, rarity: Rarity, desc: string) {
  MATERIALS[id] = { id, name, icon, rarity, desc };
}

m('wood', 'Old Timber', cf(CF.log), 'common', 'Seasoned wood from fallen fences. Bertha always wants more.');
m('iron_ore', 'Field Iron', cf(CF.ironOre), 'common', 'Rusted ploughshares and nails, melted down.');
m('copper_ore', 'Copper Ore', cf(CF.copperOre), 'common', 'Green-streaked lumps turned up by the Root.');
m('leather', 'Hogs’ Hide', cf(CF.leather), 'common', 'Tough, bristly hide from a bristlehog.');
m('feather', 'Moth Plume', cf(CF.feather), 'common', 'Dusty with pollen. Sneezable.');
m('bone', 'Old Bone', cf(CF.bone), 'uncommon', 'Ground into meal, it makes crops grow Giant.');
m('worm', 'Fat Worm', cf(CF.worm), 'uncommon', 'Wriggles with purpose. Makes crops Infested.');
m('thorn_fibre', 'Thorn Fibre', cf(CF.vineBerry), 'uncommon', 'Stripped from a Bramble Knight. Makes crops Barbed.');
m('ember_ore', 'Ember Ore', cf(CF.amberOre), 'uncommon', 'Warm to the touch. Makes crops Volatile.');
m('gold_ore', 'Gold Fleck', cf(CF.goldOre), 'uncommon', 'Panned from the meadow streams. Makes crops Golden.');
m('frost_crystal', 'Frost Crystal', cf(CF.frostCrystal), 'rare', 'Never melts. Makes crops Frostbound.');
m('storm_glass', 'Storm Glass', cf(CF.diamondOre), 'rare', 'Fused where lightning struck a scarecrow. Makes crops Charged.');
m('red_gem', 'Heartgarnet', cf(CF.rubyOre), 'rare', 'Beats faintly. Makes crops Leeching.');
m('void_shard', 'Void Shard', cf(CF.voidShard), 'rare', 'Sounds come out of it a second late. Makes crops Echoing.');
m('eye', 'Watching Eye', cf(CF.eye), 'rare', 'Do not leave it facing the bed. Makes crops Wild.');
m('root_pollen', 'Root Pollen', cf(CF.crystalBloom), 'rare', 'Shed by elites. Needed to crossbreed two crops.');
m('marrow_crown', 'Marrow Crown Shard', 'boss_crown_0', 'legendary', 'A splinter of the Marrow King’s crown. Still regal. Still sticky.');
