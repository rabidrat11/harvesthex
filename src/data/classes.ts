// Playable classes. Each changes the whole run: base stats, a held weapon,
// a starting cultivar, a passive, a right-click skill, a weakness, and which
// upgrades the level-up roller leans towards.

import type { StatMods } from './stats';

export type ActiveId = 'decoy' | 'overgrowth' | 'reap' | 'overclock' | 'swarm' | 'bramble' | 'scare' | 'gather' | 'winnow' | 'moonstep' | 'charge' | 'brew';

export interface ClassDef {
  id: string;
  name: string;
  title: string;
  held: string;
  starter: string;
  base: StatMods;
  passive: { name: string; desc: string };
  weakness: string;
  active: { id: ActiveId; name: string; desc: string; cooldown: number };
  /** Weapon/upgrade tags this class is nudged towards. */
  prefers: string[];
  portrait: string;
  sprite: string;
  blurb: string;
}

export const BASE_STATS: StatMods = {
  maxHp: 100,
  regen: 0,
  armour: 0,
  critChance: 0.05,
  critDamage: 0.5,
};

export const CLASSES: Record<string, ClassDef> = {
  fieldhand: {
    id: 'fieldhand',
    name: 'The Fieldhand',
    title: 'Fieldhand',
    held: 'seed_sling',
    starter: 'pea_repeater',
    base: { maxHp: 100, armour: 1, sapYield: 0.1, critDamage: -0.2 },
    passive: {
      name: 'Crop Rotation',
      desc: 'Each different crop family among your weapons adds 5% damage to all of them.',
    },
    weakness: 'Plain folk: critical hits deal 20% less than anyone else’s.',
    active: {
      id: 'decoy',
      name: 'Straw Decoy',
      desc: 'Plant a scarecrow decoy at your aim. Enemies attack it instead of you for 5 seconds.',
      cooldown: 14,
    },
    prefers: ['projectile', 'rapid', 'heavy'],
    portrait: 'portrait_fieldhand',
    sprite: 'hero_fieldhand',
    blurb: 'Steady hands and a good sling. Benefits from growing a bit of everything.',
  },
  botanist: {
    id: 'botanist',
    name: 'The Botanist',
    title: 'Botanist',
    held: 'spore_puffer',
    starter: 'mushroom_choir',
    base: { maxHp: 94, armour: 0, moveSpeed: -0.04, statusDuration: 0.25, nature: 0.1, physical: -0.25 },
    passive: {
      name: 'Cross-Pollination',
      desc: 'Mutation traits on your weapons are 50% stronger. Poisoned enemies burst into spores when they die.',
    },
    weakness: 'Delicate: less health, a little slower, and physical damage is 25% lower.',
    active: {
      id: 'overgrowth',
      name: 'Overgrowth',
      desc: 'Vines erupt at your aim, rooting enemies in place for 2 seconds and poisoning them.',
      cooldown: 11,
    },
    prefers: ['poison', 'summon', 'flower', 'aura'],
    portrait: 'portrait_botanist',
    sprite: 'hero_botanist',
    blurb: 'Grows trouble. Mutations, poisons and singing mushrooms.',
  },
  reaper: {
    id: 'reaper',
    name: 'The Reaper',
    title: 'Reaper',
    held: 'old_scythe',
    starter: 'thorn_whip',
    base: { maxHp: 86, armour: -1, moveSpeed: 0.08, critChance: 0.06 },
    passive: {
      name: 'Last Harvest',
      desc: 'Melee kills restore 2 health. The scythe reaps any enemy below 12% health outright.',
    },
    weakness: 'Brittle: low health and armour, and projectile weapons deal 30% less.',
    active: {
      id: 'reap',
      name: 'Reaping Dash',
      desc: 'Dash towards your aim, untouchable, cutting through everything in your path.',
      cooldown: 6,
    },
    prefers: ['melee', 'bleed', 'heal'],
    portrait: 'portrait_reaper',
    sprite: 'hero_reaper',
    blurb: 'Close, fast and fatal. Lives on the edge of the blade.',
  },
  tinkerer: {
    id: 'tinkerer',
    name: 'The Tinkerer',
    title: 'Tinkerer',
    held: 'rivet_gun',
    starter: 'lightning_corn',
    base: { maxHp: 92, armour: 1, attackSpeed: 0.05, damage: -0.15 },
    passive: {
      name: 'Contraptions',
      desc: 'Every 9 seconds you set down a sprinkler turret beside you (up to 3). Turrets shoot the nearest enemy and grow stronger with your damage and attack speed.',
    },
    weakness: 'Hands-off: your own weapons deal 15% less damage.',
    active: { id: 'overclock', name: 'Overclock', desc: 'Every turret fires three times as fast for 4 seconds, and so do you (+40% attack speed).', cooldown: 12 },
    prefers: ['projectile', 'hazard', 'defence', 'chain'],
    portrait: 'portrait_tinkerer',
    sprite: 'hero_tinkerer',
    blurb: 'Builds the fight around them. Turrets do the heavy lifting.',
  },
  apiarist: {
    id: 'apiarist',
    name: 'The Apiarist',
    title: 'Apiarist',
    held: 'smoker',
    starter: 'honeycomb_hive',
    base: { maxHp: 86, summonPower: 0.2, famFlower: 0.2, moveSpeed: 0.03 },
    passive: {
      name: 'Queen\u2019s Favour',
      desc: 'Every hive has 2 extra bees, and flower weapons deal 20% more. Summons are 20% stronger.',
    },
    weakness: 'Gentle hands: weapons that are not summons deal 20% less.',
    active: { id: 'swarm', name: 'The Swarm', desc: 'Release ten angry bees that hunt for 6 seconds.', cooldown: 14 },
    prefers: ['summon', 'bees', 'flower', 'aura'],
    portrait: 'portrait_apiarist',
    sprite: 'hero_apiarist',
    blurb: 'Never fights alone. Smoke slows the field while the bees do the rest.',
  },
  rootspeaker: {
    id: 'rootspeaker',
    name: 'The Rootspeaker',
    title: 'Rootspeaker',
    held: 'root_staff',
    starter: 'briar_wall',
    base: { maxHp: 112, armour: 3, moveSpeed: -0.12, knockback: 0.5, dashCooldown: -0.4 },
    passive: {
      name: 'Deep Roots',
      desc: 'Stand still for a moment and you take root: +35% damage and +5 armour until you move.',
    },
    weakness: 'Rooted: slow on your feet, and your dash takes 40% longer to recover.',
    active: { id: 'bramble', name: 'Bramble Ring', desc: 'A ring of briars bursts up around you for 6 seconds, stopping shots and tearing at anything that crosses.', cooldown: 10 },
    prefers: ['defence', 'hazard', 'heavy', 'knockback'],
    portrait: 'portrait_rootspeaker',
    sprite: 'hero_rootspeaker',
    blurb: 'Plants their feet and lets the meadow come to them.',
  },
  strawman: {
    id: 'strawman',
    name: 'The Strawman',
    title: 'Strawman',
    held: 'pitchfork',
    starter: 'sunflower_halo',
    base: { maxHp: 145, regen: 0.9, critChance: -1, damage: -0.2 },
    passive: {
      name: 'Stuffed',
      desc: 'Every time you are hurt you burst: straw needles fly out and the blast hits for a third of your max health. Plenty of health, and it grows back.',
    },
    weakness: 'Hollow: weapons deal 20% less damage, and you can never land a critical hit.',
    active: { id: 'scare', name: 'Scare', desc: 'Every nearby enemy flees in terror for 2.5 seconds.', cooldown: 10 },
    prefers: ['orbit', 'aura', 'defence', 'heal'],
    portrait: 'portrait_strawman',
    sprite: 'hero_strawman',
    blurb: 'Wants to be hit. Every blow scatters needles everywhere.',
  },
  forager: {
    id: 'forager',
    name: 'The Forager',
    title: 'Forager',
    held: 'walking_stick',
    starter: 'carrot_lance',
    base: { maxHp: 96, luck: 6, sapYield: 0.25, pickupRadius: 0.4, damage: -0.05 },
    passive: {
      name: 'Truffle Nose',
      desc: 'Every 40 seconds a truffle patch turns up nearby: walk over it for sap, materials and often seeds. Seeds drop 50% more often.',
    },
    weakness: 'Light pockets: 5% less damage and a little less health.',
    active: { id: 'gather', name: 'Gather', desc: 'Everything lying on the field flies straight to you.', cooldown: 8 },
    prefers: ['projectile', 'pierce', 'poison'],
    portrait: 'portrait_forager',
    sprite: 'hero_forager',
    blurb: 'Comes home with the best seeds. Lives off the land.',
  },
  miller: {
    id: 'miller',
    name: 'The Miller',
    title: 'Miller',
    held: 'chaff_thrower',
    starter: 'pea_repeater',
    base: { maxHp: 100, attackSpeed: 0.25, projCount: 1, damage: -0.25 },
    passive: {
      name: 'Grindstone',
      desc: 'Every 150 hits you land grinds out +1% attack speed for the rest of the expedition (up to +30%). Starts with an extra projectile.',
    },
    weakness: 'Fine flour: every hit deals 25% less.',
    active: { id: 'winnow', name: 'Winnow', desc: 'A great gust in front of you blows enemies away and scatters every enemy shot it touches.', cooldown: 9 },
    prefers: ['projectile', 'rapid', 'chain'],
    portrait: 'portrait_miller',
    sprite: 'hero_miller',
    blurb: 'Hundreds of little hits, faster and faster as the stone turns.',
  },
  witch: {
    id: 'witch',
    name: 'The Hedge Witch',
    title: 'Hedge Witch',
    held: 'moonberry_staff',
    starter: 'rotten_tomato',
    base: { maxHp: 80, armour: -3, arcane: 0.3, critChance: 0.03, statusDuration: 0.1 },
    passive: {
      name: 'Hex',
      desc: 'Every sixth hit hexes its target: hexed enemies take 30% more damage, and when they die they burst into seeking motes.',
    },
    weakness: 'Frail: less health and 3 less armour.',
    active: { id: 'moonstep', name: 'Moonlit Step', desc: 'Step through the moonlight to your aim, untouchable, leaving a burst of moonfire where you were and where you land.', cooldown: 7 },
    prefers: ['projectile', 'poison', 'aura'],
    portrait: 'portrait_witch',
    sprite: 'hero_witch',
    blurb: 'Curses spread. Moonlight seeks. Stay out of reach.',
  },
  ploughman: {
    id: 'ploughman',
    name: 'The Ploughman',
    title: 'Ploughman',
    held: 'plough_blade',
    starter: 'turnip_cannon',
    base: { maxHp: 140, armour: 3, attackSpeed: -0.2, moveSpeed: -0.08, knockback: 0.4, physical: 0.15 },
    passive: {
      name: 'Furrow',
      desc: 'Your dash ploughs a furrow behind you that tears at and slows anything standing in it. +15% physical damage.',
    },
    weakness: 'Heavy: slower to move and 20% slower to swing.',
    active: { id: 'charge', name: 'Shoulder Charge', desc: 'Charge towards your aim, untouchable, hurling everything in your path aside.', cooldown: 7 },
    prefers: ['melee', 'heavy', 'knockback'],
    portrait: 'portrait_ploughman',
    sprite: 'hero_ploughman',
    blurb: 'Big, slow and immovable. Everything else moves out of the way.',
  },
  alchemist: {
    id: 'alchemist',
    name: 'The Alchemist',
    title: 'Alchemist',
    held: 'tonic_flask',
    starter: 'pumpkin_mortar',
    base: { maxHp: 88, elemental: 0.2, statusDuration: 0.3, area: 0.15 },
    passive: {
      name: 'Volatile Mixtures',
      desc: 'Burning enemies that die set their neighbours alight. Status effects last 30% longer and every blast is bigger.',
    },
    weakness: 'Fumes: less health, and jars heal 30% less.',
    active: { id: 'brew', name: 'Brew', desc: 'Drink something from the satchel: a healing draught, a rush of speed, or a moment of being untouchable.', cooldown: 15 },
    prefers: ['area', 'explosion', 'fire', 'poison', 'hazard'],
    portrait: 'portrait_alchemist',
    sprite: 'hero_alchemist',
    blurb: 'Fire on poison, poison on fire. The meadow burns green.',
  },
};

export const CLASS_ORDER = ['fieldhand', 'botanist', 'reaper', 'tinkerer', 'apiarist', 'rootspeaker', 'strawman', 'forager', 'miller', 'witch', 'ploughman', 'alchemist'];
