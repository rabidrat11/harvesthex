// Creatures of the Blighted Meadow, and its king. Numbers are tier-1 base
// values; the encounter director scales health and damage per acre.

export type AiKind =
  | 'swarm'
  | 'chase'
  | 'ranged'
  | 'charger'
  | 'turret'
  | 'burrower'
  | 'wraith'
  | 'knight'
  | 'witch'
  | 'taxman'
  | 'watcher'
  | 'eye_orb'
  | 'boss_marrow';

export interface DropDef {
  /** `mat:<id>`, `farthing`, `seed`, `chest`, `jam` */
  what: string;
  chance: number;
  min?: number;
  max?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  /** Base sprite key; animations are `<sprite>_<anim>` (see render/enemies.ts). */
  sprite: string;
  anims: Record<string, string>;
  radius: number;
  hp: number;
  speed: number;
  contact: number;
  armour?: number;
  /** 0..1, fraction of knockback ignored. */
  kbResist: number;
  sap: number;
  flying?: boolean;
  ai: AiKind;
  attacks?: string[];
  drops?: DropDef[];
  elite?: boolean;
  boss?: boolean;
  splitInto?: { id: string; count: number };
  /** Point cost for the spawn director. */
  cost: number;
  /** Small pests that the Rusty Bell can frighten. */
  small?: boolean;
  /** Pixels the sprite's feet sit below the collision centre. */
  foot: number;
  hover?: number;
  desc: string;
}

export const ENEMIES: Record<string, EnemyDef> = {};

function enemy(d: EnemyDef) {
  ENEMIES[d.id] = d;
}

enemy({
  id: 'nibbler',
  name: 'Nibbler',
  sprite: 'en_nibbler',
  anims: { walk: 'en_nibbler_walk' },
  radius: 5,
  hp: 6,
  speed: 80,
  contact: 6,
  kbResist: 0,
  sap: 1,
  ai: 'swarm',
  cost: 1,
  small: true,
  foot: 4,
  drops: [{ what: 'mat:wood', chance: 0.012 }],
  desc: 'Seed-husk voles that strip a field in a night. Never alone.',
});

enemy({
  id: 'mudling',
  name: 'Mudling',
  sprite: 'en_mudling',
  anims: { walk: 'en_mudling_walk' },
  radius: 8,
  hp: 40,
  speed: 34,
  contact: 11,
  kbResist: 0.6,
  sap: 3,
  ai: 'chase',
  cost: 3,
  foot: 7,
  drops: [
    { what: 'mat:worm', chance: 0.04 },
    { what: 'mat:iron_ore', chance: 0.03 },
  ],
  desc: 'A walking clod of wet field. Slow, stubborn, and heavier than it looks.',
});

enemy({
  id: 'mudling_thrower',
  name: 'Clodhurler',
  sprite: 'en_mudling',
  anims: { walk: 'en_mudling_walk' },
  radius: 8,
  hp: 46,
  speed: 30,
  contact: 11,
  kbResist: 0.6,
  sap: 4,
  ai: 'chase',
  attacks: ['mud_toss'],
  cost: 4,
  foot: 7,
  drops: [{ what: 'mat:worm', chance: 0.05 }],
  desc: 'A mudling that has learned to throw itself, a bit at a time.',
});

enemy({
  id: 'moth',
  name: 'Blight Moth',
  sprite: 'en_moth',
  anims: { walk: 'en_moth_fly' },
  radius: 6,
  hp: 16,
  speed: 58,
  contact: 6,
  kbResist: 0.2,
  sap: 2,
  flying: true,
  ai: 'ranged',
  attacks: ['moth_pollen'],
  cost: 3,
  foot: 4,
  hover: 6,
  drops: [{ what: 'mat:feather', chance: 0.06 }],
  desc: 'Its pollen slows as it drifts. Watch where it settles.',
});

enemy({
  id: 'bristlehog',
  name: 'Bristlehog',
  sprite: 'en_bristlehog',
  anims: { walk: 'en_bristlehog_walk', windup: 'en_bristlehog_windup', charge: 'en_bristlehog_charge' },
  radius: 8,
  hp: 44,
  speed: 46,
  contact: 15,
  kbResist: 0.5,
  sap: 3,
  ai: 'charger',
  cost: 4,
  foot: 6,
  drops: [{ what: 'mat:leather', chance: 0.08 }],
  desc: 'Paws the ground before it charges, and cannot turn once it has started.',
});

enemy({
  id: 'husk',
  name: 'Scarecrow Husk',
  sprite: 'en_husk',
  anims: { walk: 'en_husk_idle', cast: 'en_husk_cast' },
  radius: 7,
  hp: 72,
  speed: 20,
  contact: 9,
  kbResist: 0.8,
  sap: 5,
  ai: 'turret',
  attacks: ['husk_ring', 'husk_spiral'],
  cost: 7,
  foot: 12,
  drops: [
    { what: 'mat:bone', chance: 0.06 },
    { what: 'mat:storm_glass', chance: 0.012 },
  ],
  desc: 'Nobody remembers putting it up. It remembers you.',
});

enemy({
  id: 'sporeling',
  name: 'Sporeling',
  sprite: 'en_sporeling',
  anims: { walk: 'en_sporeling_walk' },
  radius: 6,
  hp: 22,
  speed: 44,
  contact: 8,
  kbResist: 0.2,
  sap: 2,
  ai: 'chase',
  splitInto: { id: 'sporelet', count: 3 },
  cost: 3,
  foot: 6,
  desc: 'Splits when it dies. So do its children, emotionally.',
});

enemy({
  id: 'sporelet',
  name: 'Sporelet',
  sprite: 'en_sporelet',
  anims: { walk: 'en_sporelet_walk' },
  radius: 4,
  hp: 5,
  speed: 72,
  contact: 4,
  kbResist: 0,
  sap: 1,
  ai: 'swarm',
  cost: 1,
  small: true,
  foot: 3,
  desc: 'Tiny, fast and furious.',
});

enemy({
  id: 'stalker',
  name: 'Root Stalker',
  sprite: 'en_stalker',
  anims: { walk: 'en_stalker_mound', emerge: 'en_stalker_emerge' },
  radius: 7,
  hp: 36,
  speed: 72,
  contact: 10,
  kbResist: 0.7,
  sap: 3,
  ai: 'burrower',
  attacks: ['stalker_ring'],
  cost: 5,
  foot: 4,
  drops: [{ what: 'mat:copper_ore', chance: 0.06 }],
  desc: 'Moves beneath the soil. When the ground bulges under you, move.',
});

enemy({
  id: 'wraith',
  name: 'Harvest Wraith',
  sprite: 'en_wraith',
  anims: { walk: 'en_wraith_float' },
  radius: 7,
  hp: 64,
  speed: 46,
  contact: 10,
  kbResist: 0.4,
  sap: 5,
  flying: true,
  ai: 'wraith',
  attacks: ['wraith_ring'],
  cost: 7,
  foot: 8,
  hover: 4,
  drops: [
    { what: 'mat:frost_crystal', chance: 0.02 },
    { what: 'mat:void_shard', chance: 0.01 },
  ],
  desc: 'The last sheaf of a harvest nobody brought in. Its rings speed up as they spread.',
});

enemy({
  id: 'knight',
  name: 'Bramble Knight',
  sprite: 'en_knight',
  anims: { walk: 'en_knight_walk', swing: 'en_knight_swing' },
  radius: 11,
  hp: 6000,
  speed: 38,
  contact: 18,
  armour: 0.8,
  kbResist: 0.95,
  sap: 40,
  ai: 'knight',
  attacks: ['knight_wall', 'knight_burst'],
  elite: true,
  cost: 0,
  foot: 12,
  drops: [
    { what: 'chest', chance: 1 },
    { what: 'mat:thorn_fibre', chance: 1, min: 2, max: 3 },
    { what: 'mat:root_pollen', chance: 1 },
    { what: 'farthing', chance: 1, min: 12, max: 18 },
  ],
  desc: 'Armour gone to briar. The woven shield turns aside anything from the front.',
});

enemy({
  id: 'witch',
  name: 'Orchard Witch',
  sprite: 'en_witch',
  anims: { walk: 'en_witch_idle' },
  radius: 8,
  hp: 6500,
  speed: 30,
  contact: 12,
  kbResist: 0.9,
  sap: 36,
  ai: 'witch',
  attacks: ['witch_rotor', 'witch_apples'],
  elite: true,
  cost: 0,
  foot: 12,
  drops: [
    { what: 'chest', chance: 1 },
    { what: 'mat:red_gem', chance: 1 },
    { what: 'mat:root_pollen', chance: 1 },
    { what: 'farthing', chance: 1, min: 10, max: 16 },
  ],
  desc: 'She keeps the old orchard, and she does not like what you are growing.',
});

enemy({
  id: 'eyes',
  name: 'The Thousand-Eyed Scarecrow',
  sprite: 'boss_eyes',
  anims: { walk: 'boss_eyes_idle', cast: 'boss_eyes_cast', gaze: 'boss_eyes_gaze', death: 'boss_eyes_death' },
  radius: 14,
  hp: 16000,
  speed: 0,
  contact: 18,
  kbResist: 1,
  sap: 80,
  ai: 'watcher',
  attacks: ['eyes_gaze', 'eyes_crows', 'eyes_cross', 'eyes_stare'],
  elite: true,
  cost: 0,
  foot: 20,
  drops: [
    { what: 'chest', chance: 1 },
    { what: 'mat:eye', chance: 1, min: 2, max: 3 },
    { what: 'mat:root_pollen', chance: 1, min: 2, max: 2 },
    { what: 'mat:void_shard', chance: 1 },
    { what: 'farthing', chance: 1, min: 30, max: 40 },
  ],
  desc: 'Nobody remembers putting it up either. Every one of its eyes remembers you.',
});

enemy({
  id: 'eye_orb',
  name: 'Watching Eye',
  sprite: 'boss_eye_orb',
  anims: { walk: 'boss_eye_orb' },
  radius: 6,
  hp: 520,
  speed: 0,
  contact: 8,
  kbResist: 1,
  sap: 6,
  flying: true,
  ai: 'eye_orb',
  attacks: ['orb_shot'],
  cost: 0,
  foot: 0,
  hover: 10,
  desc: 'While one of these watches over it, the Scarecrow barely feels a thing.',
});

enemy({
  id: 'crow',
  name: 'Carrion Crow',
  sprite: 'en_crow',
  anims: { walk: 'en_crow_fly' },
  radius: 4,
  hp: 14,
  speed: 118,
  contact: 7,
  kbResist: 0.1,
  sap: 1,
  flying: true,
  ai: 'swarm',
  cost: 1,
  small: true,
  foot: 2,
  hover: 8,
  desc: 'The Scarecrow\u2019s only friends. They are not friendly.',
});

enemy({
  id: 'taxman',
  name: 'Royal Taxman',
  sprite: 'en_taxman',
  anims: { walk: 'en_taxman_walk' },
  radius: 5,
  hp: 18,
  speed: 92,
  contact: 4,
  kbResist: 0.1,
  sap: 1,
  ai: 'taxman',
  cost: 0,
  small: true,
  foot: 5,
  desc: 'Collects your sap on behalf of the Crown. Drops it all, with interest, if stopped.',
});

enemy({
  id: 'marrow_king',
  name: 'The Marrow King',
  sprite: 'boss_marrow',
  anims: { walk: 'boss_marrow_idle', cast: 'boss_marrow_cast', slam: 'boss_marrow_slam', p2: 'boss_marrow_p2_idle', death: 'boss_marrow_death' },
  radius: 22,
  hp: 45000,
  speed: 26,
  contact: 20,
  kbResist: 1,
  sap: 0,
  ai: 'boss_marrow',
  boss: true,
  cost: 0,
  foot: 30,
  desc: 'The oldest turnip in the county, crowned by the Root itself.',
});
