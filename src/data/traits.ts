// Mutation traits. Any weapon can carry them; they are grown on the farm (or
// spliced in at the Mutation Bench) and travel with the produce into a run.
// The effects listed under `mult`/`add`/`status` are applied generically by
// sim/weapons.ts; the rest are hooks in sim/combat.ts keyed on the id.

import type { TraitDef, TraitId } from './types';

export const TRAITS: Record<TraitId, TraitDef> = {
  thorned: {
    id: 'thorned',
    name: 'Thorned',
    icon: 'tr_thorned',
    desc: 'Pierces one more enemy. Orbiting and sweeping attacks hit 20% harder.',
    add: { pierce: 1 },
    colour: '#33984b',
  },
  volatile: {
    id: 'volatile',
    name: 'Volatile',
    icon: 'tr_volatile',
    desc: 'Hits have a 20% chance to explode for half damage.',
    colour: '#ff5000',
  },
  hollow: {
    id: 'hollow',
    name: 'Hollow',
    icon: 'tr_hollow',
    desc: 'One more projectile (or petal, bee, singer), but each deals 30% less.',
    add: { count: 1 },
    mult: { damage: 0.7 },
    colour: '#c7cfdd',
  },
  leeching: {
    id: 'leeching',
    name: 'Leeching',
    icon: 'tr_leeching',
    desc: 'Hits have a 5% chance to restore 1 health.',
    colour: '#c42430',
  },
  giant: {
    id: 'giant',
    name: 'Giant',
    icon: 'tr_giant',
    desc: '35% more damage and 30% more area, but 20% slower.',
    mult: { damage: 1.35, area: 1.3, cooldown: 1.2 },
    colour: '#bf6f4a',
  },
  echoing: {
    id: 'echoing',
    name: 'Echoing',
    icon: 'tr_echoing',
    desc: 'Attacks have a 22% chance to repeat a moment later.',
    colour: '#db3ffd',
  },
  frostbound: {
    id: 'frostbound',
    name: 'Frostbound',
    icon: 'tr_frostbound',
    desc: 'Hits chill enemies. Enough chill freezes them solid.',
    status: { id: 'chill', power: 0.35, duration: 1.6 },
    colour: '#94fdff',
  },
  infested: {
    id: 'infested',
    name: 'Infested',
    icon: 'tr_infested',
    desc: 'Kills have a 25% chance to release a mite that fights for you.',
    colour: '#99e65f',
  },
  golden: {
    id: 'golden',
    name: 'Golden',
    icon: 'tr_golden',
    desc: 'Kills drop more sap and sometimes a farthing.',
    colour: '#ffc825',
  },
  wild: {
    id: 'wild',
    name: 'Wild',
    icon: 'tr_wild',
    desc: '10% more damage, and takes on a random other trait each acre.',
    mult: { damage: 1.1 },
    colour: '#f389f5',
  },
  burning: {
    id: 'burning',
    name: 'Burning',
    icon: 'tr_burning',
    desc: 'Hits set enemies alight. Fire detonates poison.',
    status: { id: 'burn', power: 4, duration: 2 },
    colour: '#ed7614',
  },
  venomous: {
    id: 'venomous',
    name: 'Venomous',
    icon: 'tr_venomous',
    desc: 'Hits poison enemies. Poison stacks.',
    status: { id: 'poison', power: 3, duration: 3 },
    colour: '#5ac54f',
  },
  charged: {
    id: 'charged',
    name: 'Charged',
    icon: 'tr_charged',
    desc: 'Hits have a 25% chance to arc lightning to a nearby enemy.',
    colour: '#00cdf9',
  },
  barbed: {
    id: 'barbed',
    name: 'Barbed',
    icon: 'tr_barbed',
    desc: 'Hits cause bleeding.',
    status: { id: 'bleed', power: 2, duration: 3 },
    colour: '#891e2b',
  },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/** Traits that reagents at the Mutation Bench can induce, and what each costs. */
export const REAGENT_TRAITS: { material: string; trait: TraitId }[] = [
  { material: 'frost_crystal', trait: 'frostbound' },
  { material: 'void_shard', trait: 'echoing' },
  { material: 'ember_ore', trait: 'volatile' },
  { material: 'gold_ore', trait: 'golden' },
  { material: 'bone', trait: 'giant' },
  { material: 'eye', trait: 'wild' },
  { material: 'worm', trait: 'infested' },
  { material: 'red_gem', trait: 'leeching' },
  { material: 'storm_glass', trait: 'charged' },
  { material: 'thorn_fibre', trait: 'barbed' },
];
