// Expedition regions and their authored encounter scripts. An expedition is a
// sequence of acres separated by lulls (Mags's cart, extraction), ending in the
// region boss. Each acre has its own enemy mix, spawn rate curve and events, so
// the pacing changes rather than every number simply climbing.

export interface SpawnEntry {
  enemy: string;
  weight: number;
  /** Seconds into the acre before this enemy joins the mix. */
  from?: number;
  /** Spawn as a pack of this many. */
  group?: [number, number];
}

export type AcreEvent =
  | { at: number; kind: 'encircle'; enemy: string; count: number; radius: number; message?: string }
  | { at: number; kind: 'flock'; enemy: string; count: number; message?: string }
  | { at: number; kind: 'surge'; duration: number; mult: number; message?: string }
  | { at: number; kind: 'elite'; enemy: string; message: string }
  | { at: number; kind: 'objective'; objective: 'shrine'; message: string }
  | { at: number; kind: 'stampede'; enemy: string; count: number; message?: string };

export interface AcreDef {
  name: string;
  duration: number;
  /** Spawn points per second at the start and end of the acre. */
  rate: [number, number];
  maxAlive: number;
  hpMult: number;
  dmgMult: number;
  table: SpawnEntry[];
  events: AcreEvent[];
  intro: string;
}

export interface RegionDef {
  id: string;
  name: string;
  width: number;
  height: number;
  ground: string;
  acres: AcreDef[];
  boss: string;
  bossIntro: string;
  /** Materials and seeds typical of the region (shown in the expedition board). */
  rewards: string[];
  seedTable: { species: string; weight: number }[];
  desc: string;
}

export const REGIONS: Record<string, RegionDef> = {
  meadow: {
    id: 'meadow',
    name: 'The Blighted Meadow',
    width: 1536,
    height: 1024,
    ground: 't_meadow',
    boss: 'marrow_king',
    bossIntro: 'The royal patch heaves. Something old is getting up.',
    rewards: ['mat:copper_ore', 'mat:leather', 'mat:feather', 'mat:bone', 'mat:worm', 'mat:thorn_fibre', 'mat:root_pollen'],
    seedTable: [
      { species: 'pea', weight: 10 },
      { species: 'carrot', weight: 9 },
      { species: 'turnip', weight: 8 },
      { species: 'tomato', weight: 7 },
      { species: 'chilli', weight: 6 },
      { species: 'thornvine', weight: 6 },
      { species: 'beebalm', weight: 5 },
      { species: 'choircap', weight: 5 },
      { species: 'sunflower', weight: 4 },
      { species: 'stormcorn', weight: 3 },
      { species: 'pumpkin', weight: 3 },
    ],
    desc: 'Yellowing grass, old walls and soil gone purple. Close to home, and closer every year.',
    acres: [
      {
        name: 'The Lower Field',
        intro: 'Nibblers in the furrows.',
        duration: 130,
        rate: [2.4, 6],
        maxAlive: 110,
        hpMult: 1,
        dmgMult: 1,
        table: [
          { enemy: 'nibbler', weight: 10, group: [3, 5] },
          { enemy: 'mudling', weight: 3, from: 25 },
        ],
        events: [
          { at: 55, kind: 'encircle', enemy: 'nibbler', count: 18, radius: 150, message: 'They are all around you.' },
          { at: 100, kind: 'surge', duration: 14, mult: 1.8, message: 'The field stirs.' },
        ],
      },
      {
        name: 'The Hedgerows',
        intro: 'Moths drift out of the hedges.',
        duration: 150,
        rate: [5, 10],
        maxAlive: 150,
        hpMult: 1.7,
        dmgMult: 1.2,
        table: [
          { enemy: 'nibbler', weight: 7, group: [3, 6] },
          { enemy: 'mudling', weight: 3 },
          { enemy: 'moth', weight: 4 },
          { enemy: 'sporeling', weight: 3, from: 35 },
          { enemy: 'bristlehog', weight: 2.5, from: 80 },
        ],
        events: [
          { at: 60, kind: 'flock', enemy: 'moth', count: 7, message: 'A cloud of moths on the wind.' },
          { at: 115, kind: 'stampede', enemy: 'bristlehog', count: 4, message: 'Hooves. Lots of hooves.' },
        ],
      },
      {
        name: 'The Old Walls',
        intro: 'Scarecrows that nobody put up.',
        duration: 165,
        rate: [8, 14],
        maxAlive: 190,
        hpMult: 3.0,
        dmgMult: 1.5,
        table: [
          { enemy: 'nibbler', weight: 5, group: [4, 7] },
          { enemy: 'mudling_thrower', weight: 3 },
          { enemy: 'moth', weight: 3 },
          { enemy: 'sporeling', weight: 3 },
          { enemy: 'bristlehog', weight: 2.5 },
          { enemy: 'husk', weight: 2 },
          { enemy: 'stalker', weight: 2.5, from: 30 },
        ],
        events: [
          { at: 18, kind: 'objective', objective: 'shrine', message: 'A Root Shrine pulses nearby. Stand by it to cleanse it.' },
          { at: 62, kind: 'elite', enemy: 'knight', message: 'A Bramble Knight blocks the old road.' },
          { at: 135, kind: 'surge', duration: 18, mult: 1.6 },
        ],
      },
      {
        name: 'The Rot Line',
        intro: 'The soil is purple here. The wraiths walk.',
        duration: 170,
        rate: [11, 19],
        maxAlive: 240,
        hpMult: 4.8,
        dmgMult: 1.75,
        table: [
          { enemy: 'nibbler', weight: 5, group: [5, 8] },
          { enemy: 'mudling_thrower', weight: 3 },
          { enemy: 'moth', weight: 3 },
          { enemy: 'sporeling', weight: 3 },
          { enemy: 'bristlehog', weight: 2 },
          { enemy: 'husk', weight: 2.5 },
          { enemy: 'stalker', weight: 2.5 },
          { enemy: 'wraith', weight: 2.5 },
        ],
        events: [
          { at: 45, kind: 'encircle', enemy: 'mudling', count: 14, radius: 170, message: 'The ground closes in.' },
          { at: 95, kind: 'elite', enemy: 'witch', message: 'The Orchard Witch has come to see what you are growing.' },
          { at: 140, kind: 'surge', duration: 20, mult: 1.7, message: 'The Root is listening.' },
        ],
      },
    ],
  },
};

/** Difficulty tiers ("Rot"): unlocked by beating the region boss. */
export const ROT_TIERS = [
  { tier: 1, name: 'Fallow', hp: 1, dmg: 1, rate: 1, loot: 1, desc: 'The meadow as it is.' },
  { tier: 2, name: 'Blighted', hp: 1.6, dmg: 1.35, rate: 1.2, loot: 1.6, desc: 'Tougher, angrier, richer. Rare seeds drop more often.' },
  { tier: 3, name: 'Rotten', hp: 2.4, dmg: 1.7, rate: 1.35, loot: 2.3, desc: 'For gardeners who have stopped being afraid.' },
];
