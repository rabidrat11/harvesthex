// Crop species. Every species grows into a weapon (or, for chilli, a gene
// donor). Growth is fed by sap: everything you collect on an expedition also
// soaks into your watered plots at home. `gene` is the trait a species passes
// on when it is crossbred.

import type { Family, Rarity, TraitId } from './types';

export interface CropDef {
  id: string;
  name: string;
  family: Family;
  rarity: Rarity;
  /** Sap needed for each of the three growth steps (seed -> sprout -> growing -> mature). */
  stageSap: number;
  /** Weapon the produce becomes when grafted. */
  weapon: string | null;
  gene: TraitId;
  sprite: string;
  produce: string;
  seed: string;
  tall?: boolean;
  /** Seed price at the Seed Archive, in farthings. Absent = cannot be bought. */
  price?: number;
  hybrid?: [string, string];
  desc: string;
}

export const CROPS: Record<string, CropDef> = {};

function crop(d: Omit<CropDef, 'sprite' | 'produce' | 'seed'> & Partial<Pick<CropDef, 'sprite'>>) {
  CROPS[d.id] = {
    sprite: d.sprite ?? `crop_${d.id}`,
    produce: `produce_${d.id}`,
    seed: `seed_${d.id}`,
    ...d,
  } as CropDef;
}

crop({ id: 'pea', name: 'Pea', family: 'vegetable', rarity: 'common', stageSap: 70, weapon: 'pea_repeater', gene: 'hollow', price: 6, desc: 'Fast-growing and reliable. Grows into a Pea Repeater.' });
crop({ id: 'turnip', name: 'Turnip', family: 'root', rarity: 'common', stageSap: 120, weapon: 'turnip_cannon', gene: 'giant', price: 10, desc: 'Slow and heavy. Grows into a Turnip Cannon.' });
crop({ id: 'carrot', name: 'Carrot', family: 'root', rarity: 'common', stageSap: 95, weapon: 'carrot_lance', gene: 'thorned', price: 8, desc: 'Straight as an arrow. Grows into a Carrot Lance.' });
crop({ id: 'sunflower', name: 'Sunflower', family: 'flower', rarity: 'rare', stageSap: 140, weapon: 'sunflower_halo', gene: 'leeching', tall: true, price: 30, desc: 'Turns to face you. Grows into a Sunflower Halo.' });
crop({ id: 'tomato', name: 'Tomato', family: 'fruit', rarity: 'uncommon', stageSap: 100, weapon: 'rotten_tomato', gene: 'venomous', price: 14, desc: 'Best picked slightly past it. Grows into Rotten Tomatoes.' });
crop({ id: 'pumpkin', name: 'Pumpkin', family: 'vegetable', rarity: 'rare', stageSap: 170, weapon: 'pumpkin_mortar', gene: 'volatile', price: 36, desc: 'Takes its time, then takes the field. Grows into a Pumpkin Mortar.' });
crop({ id: 'thornvine', name: 'Thornvine', family: 'vine', rarity: 'uncommon', stageSap: 110, weapon: 'thorn_whip', gene: 'barbed', tall: true, price: 16, desc: 'Climbs anything, including you. Grows into a Thorn Whip.' });
crop({ id: 'choircap', name: 'Choircap', family: 'fungi', rarity: 'uncommon', stageSap: 110, weapon: 'mushroom_choir', gene: 'infested', price: 18, desc: 'Sings at dusk. Grows into a Mushroom Choir.' });
crop({ id: 'stormcorn', name: 'Stormcorn', family: 'grain', rarity: 'rare', stageSap: 150, weapon: 'lightning_corn', gene: 'charged', tall: true, price: 34, desc: 'Crackles in dry weather. Grows into Lightning Corn.' });
crop({ id: 'beebalm', name: 'Bee Balm', family: 'flower', rarity: 'uncommon', stageSap: 90, weapon: 'honeycomb_hive', gene: 'golden', price: 15, desc: 'Bees adore it. Grows into a Honeycomb Hive.' });
crop({ id: 'chilli', name: 'Chilli', family: 'fruit', rarity: 'uncommon', stageSap: 80, weapon: null, gene: 'burning', price: 12, desc: 'Not a weapon on its own. Crossbreed it to set other crops alight.' });
crop({ id: 'kingsmarrow', name: 'Kingsmarrow', family: 'forbidden', rarity: 'legendary', stageSap: 260, weapon: 'kingsmarrow', gene: 'wild', tall: true, desc: 'The Marrow King’s heart-seed. Something regal and wrong grows from it.' });

// Authored hybrids. Any two species can be crossed; these pairs make named
// cultivars with their own weapon instead of "a carrot carrying a chilli gene".
crop({ id: 'emberroot', name: 'Emberroot', family: 'root', rarity: 'rare', stageSap: 120, weapon: 'emberroot', gene: 'burning', hybrid: ['carrot', 'chilli'], sprite: 'crop_carrot', desc: 'Carrot crossed with chilli. Grows into a burning lance.' });
crop({ id: 'sporelight', name: 'Sporelight', family: 'flower', rarity: 'rare', stageSap: 140, weapon: 'sporelight', gene: 'venomous', hybrid: ['sunflower', 'choircap'], sprite: 'crop_sunflower', tall: true, desc: 'Sunflower crossed with choircap. Grows into orbiting spore-blooms.' });
crop({ id: 'briargourd', name: 'Briar Gourd', family: 'vegetable', rarity: 'rare', stageSap: 170, weapon: 'briar_gourd', gene: 'barbed', hybrid: ['pumpkin', 'thornvine'], sprite: 'crop_pumpkin', desc: 'Pumpkin crossed with thornvine. Grows into thorn-bursting artillery.' });
crop({ id: 'thunderpea', name: 'Thunderpea', family: 'vegetable', rarity: 'rare', stageSap: 100, weapon: 'thunderpea', gene: 'charged', hybrid: ['pea', 'stormcorn'], sprite: 'crop_pea', desc: 'Pea crossed with stormcorn. Grows into crackling repeaters.' });
crop({ id: 'hellfruit', name: 'Hellfruit', family: 'fruit', rarity: 'rare', stageSap: 110, weapon: 'hellfruit', gene: 'burning', hybrid: ['tomato', 'chilli'], sprite: 'crop_tomato', desc: 'Tomato crossed with chilli. Grows into burning puddles.' });

export const BASE_SPECIES = ['pea', 'turnip', 'carrot', 'sunflower', 'tomato', 'pumpkin', 'thornvine', 'choircap', 'stormcorn', 'beebalm', 'chilli', 'kingsmarrow'];
export const HYBRID_SPECIES = ['emberroot', 'sporelight', 'briargourd', 'thunderpea', 'hellfruit'];

export function hybridOf(a: string, b: string): string | null {
  for (const id of HYBRID_SPECIES) {
    const h = CROPS[id].hybrid!;
    if ((h[0] === a && h[1] === b) || (h[0] === b && h[1] === a)) return id;
  }
  return null;
}

/** Growth stages: 0 seed, 1 sprout, 2 growing, 3 mature. */
export const MATURE = 3;
