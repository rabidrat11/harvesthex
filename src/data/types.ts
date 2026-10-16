import type { StatMods } from './stats';

export type Family = 'vegetable' | 'root' | 'flower' | 'fungi' | 'fruit' | 'grain' | 'vine' | 'forbidden';
export type DamageType = 'physical' | 'nature' | 'arcane' | 'elemental';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Quality = 1 | 2 | 3;

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

export const FAMILY_LABEL: Record<Family, string> = {
  vegetable: 'Vegetable',
  root: 'Root crop',
  flower: 'Flower',
  fungi: 'Fungus',
  fruit: 'Fruit',
  grain: 'Grain',
  vine: 'Vine',
  forbidden: 'Forbidden',
};

export const QUALITY_LABEL: Record<Quality, string> = { 1: 'Common', 2: 'Fine', 3: 'Prize' };

export type TraitId =
  | 'thorned'
  | 'volatile'
  | 'hollow'
  | 'leeching'
  | 'giant'
  | 'echoing'
  | 'frostbound'
  | 'infested'
  | 'golden'
  | 'wild'
  | 'burning'
  | 'venomous'
  | 'charged'
  | 'barbed';

export type StatusId = 'poison' | 'burn' | 'chill' | 'bleed' | 'root' | 'shock';

/** A status a hit applies: `power` is damage per second for DoTs, slow fraction for chill. */
export interface StatusApply {
  id: StatusId;
  power: number;
  duration: number;
  chance?: number;
}

export type Behaviour =
  | 'shooter'
  | 'lance'
  | 'lobber'
  | 'artillery'
  | 'orbit'
  | 'sweep'
  | 'summoner'
  | 'swarm'
  | 'briar'
  | 'puffer'
  | 'storm'
  | 'crown'
  | 'moon';

export type Targeting = 'nearest' | 'strongest' | 'random' | 'facing' | 'aim' | 'cluster' | 'self';

/** Everything a weapon behaviour reads. Level-ups and traits modify these. */
export interface WeaponParams {
  damage: number;
  cooldown: number;
  speed: number;
  range: number;
  knockback: number;
  count: number;
  pierce: number;
  /** Radius for explosions, sweeps, puddles, orbits (px). */
  area: number;
  spread: number;
  bounce: number;
  /** Seconds a puddle, summon or orbit lasts. */
  duration: number;
  /** Burst: shots fired one after another per trigger. */
  burst: number;
  burstGap: number;
  /** Shrapnel / split count on impact. */
  split: number;
  /** Chain lightning jumps. */
  chain: number;
  critBonus: number;
}

export interface WeaponLevel {
  desc: string;
  /** Added to params. */
  add?: Partial<WeaponParams>;
  /** Multiplies params (after adds). */
  mult?: Partial<WeaponParams>;
  /** Added to `extra`. */
  extra?: Record<string, number>;
}

export interface WeaponDef {
  id: string;
  name: string;
  family: Family;
  dmgType: DamageType;
  rarity: Rarity;
  behaviour: Behaviour;
  targeting: Targeting;
  icon: string;
  proj: string;
  base: WeaponParams;
  /** Levels 2..5. */
  levels: WeaponLevel[];
  status?: StatusApply;
  tags: string[];
  desc: string;
  flavour: string;
  sfx: string;
  /** Not offered in shops/level-ups (class implements, evolutions, forbidden). */
  unique?: boolean;
  /** For held weapons: the class that wields it. */
  heldBy?: string;
  evolvesInto?: string;
  /** Which crop this weapon is grown from (for grafting). */
  crop?: string;
  /** Weapon is an evolution of `evolvedFrom`. */
  evolvedFrom?: string;
  extra?: Record<string, number>;
  /** Stat modifiers granted while equipped (forbidden trade-offs). */
  statMods?: StatMods;
}

export interface EvolutionDef {
  from: string;
  into: string;
  /** Satisfied by a trait on the weapon OR by an item granting this affinity tag. */
  needs: { trait?: TraitId; item?: string; tag?: string; stat?: { key: keyof import('./stats').Stats; min: number } };
  hint: string;
}

export interface TraitDef {
  id: TraitId;
  name: string;
  icon: string;
  desc: string;
  /** Weapon param multipliers/adds applied to any weapon carrying the trait. */
  mult?: Partial<WeaponParams>;
  add?: Partial<WeaponParams>;
  status?: StatusApply;
  colour: string;
}

export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  mods: StatMods;
  desc: string;
  flavour: string;
  /** Affinity tags granted (used by evolutions and synergies). */
  tags?: string[];
  /** Special behaviour hooks implemented in sim/items.ts. */
  hook?: string;
  hookValue?: number;
  max?: number;
  price?: number;
}
