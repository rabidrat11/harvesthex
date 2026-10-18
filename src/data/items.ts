// Passive items, bought from Mags mid-expedition or found in Root Chests.
// Most have a trade-off. `tags` feed weapon evolutions; `hook` names special
// behaviour implemented in sim/items.ts.

import { CF, cf } from '../art/icons';
import type { ItemDef } from './types';

export const ITEMS: Record<string, ItemDef> = {};

function item(d: ItemDef) {
  ITEMS[d.id] = d;
}

// --- common ---------------------------------------------------------------
item({
  id: 'whetstone',
  name: 'Whetstone',
  rarity: 'common',
  icon: cf(CF.whetstone),
  mods: { physical: 0.12 },
  desc: 'Physical damage +12%.',
  flavour: 'Spit on it. That is the whole technique.',
});
item({
  id: 'hearty_stew',
  name: 'Hearty Stew',
  rarity: 'common',
  icon: cf(CF.stew),
  mods: { maxHp: 14 },
  desc: 'Max health +14.',
  flavour: 'Mostly turnip. Mostly.',
});
item({
  id: 'mature_cheese',
  name: 'Mature Cheese',
  rarity: 'common',
  icon: cf(CF.cheese),
  mods: { maxHp: 6, regen: 0.35 },
  desc: 'Max health +6, regenerate 0.35 health a second.',
  flavour: 'Older than you. Wiser, too.',
});
item({
  id: 'magpie_feather',
  name: 'Magpie Feather',
  rarity: 'common',
  icon: cf(CF.feather),
  mods: { pickupRadius: 0.45, luck: 1 },
  desc: 'Pickup reach +45%, luck +1.',
  flavour: 'Shiny things find you.',
});
item({
  id: 'iron_gauntlet',
  name: 'Ploughman’s Gauntlet',
  rarity: 'common',
  icon: cf(CF.gauntlet),
  mods: { armour: 3, moveSpeed: -0.04 },
  desc: 'Armour +3, move speed -4%.',
  flavour: 'One glove. The other was lost to a mudling.',
});
item({
  id: 'juice',
  name: 'Elderflower Cordial',
  rarity: 'common',
  icon: cf(CF.juice),
  mods: { attackSpeed: 0.07 },
  desc: 'Attack speed +7%.',
  flavour: 'Fizzes slightly more than cordial should.',
});
item({
  id: 'drumstick',
  name: 'Cold Drumstick',
  rarity: 'common',
  icon: cf(CF.drumstick),
  mods: { lifesteal: 0.03 },
  desc: '3% chance on hit to restore 1 health.',
  flavour: 'From last Sunday. Still good. Probably.',
});

// --- uncommon -------------------------------------------------------------
item({
  id: 'grandfathers_boots',
  name: 'Grandfather’s Boots',
  rarity: 'uncommon',
  icon: cf(CF.hobnailBoots),
  mods: { moveSpeed: 0.16, maxHp: -10 },
  desc: 'Move speed +16%, max health -10.',
  flavour: 'He walked to market in these every week for sixty years, and he was never once caught.',
});
item({
  id: 'farmers_almanac',
  name: 'Farmer’s Almanac',
  rarity: 'uncommon',
  icon: cf(CF.plank),
  mods: { sapYield: 0.25, luck: 3 },
  desc: 'Sap yield +25%, luck +3.',
  flavour: 'Predicts rain, frost, and the occasional uprising of root vegetables.',
});
item({
  id: 'old_raincoat',
  name: 'Old Raincoat',
  rarity: 'uncommon',
  icon: cf(CF.capedPlate),
  mods: { armour: 5, attackSpeed: -0.08 },
  desc: 'Armour +5, attack speed -8%.',
  flavour: 'Waxed cotton, patched with more waxed cotton.',
});
item({
  id: 'rusty_bell',
  name: 'Rusty Bell',
  rarity: 'uncommon',
  icon: cf(CF.lanternJar),
  mods: {},
  hook: 'rustyBell',
  hookValue: 7,
  desc: 'Every 7 seconds it clangs, shoving nearby enemies away and scaring small pests off.',
  flavour: 'Rung for supper, for fire, and once for a very large hare.',
});
item({
  id: 'bone_meal',
  name: 'Bone Meal',
  rarity: 'uncommon',
  icon: cf(CF.bone),
  mods: { summonPower: 0.22, statusDuration: 0.1 },
  tags: ['giant', 'infested'],
  desc: 'Summon power +22%, status duration +10%. Counts as Giant and Infested for evolutions.',
  flavour: 'Do not ask whose.',
});
item({
  id: 'bonfire_ash',
  name: 'Bonfire Ash',
  rarity: 'uncommon',
  icon: cf(CF.torch),
  mods: { elemental: 0.14, area: 0.08 },
  tags: ['volatile'],
  desc: 'Elemental damage +14%, area +8%. Counts as Volatile for evolutions.',
  flavour: 'From the last harvest bonfire. It never quite went out.',
});
item({
  id: 'old_honey',
  name: 'Jar of Old Honey',
  rarity: 'uncommon',
  icon: cf(CF.jam),
  mods: { regen: 0.6 },
  tags: ['leeching'],
  desc: 'Regenerate 0.6 health a second. Counts as Leeching for evolutions.',
  flavour: 'Honey never spoils. This is testing that claim.',
});
item({
  id: 'thorny_gloves',
  name: 'Thorny Gloves',
  rarity: 'uncommon',
  icon: cf(CF.leather),
  mods: { nature: 0.12, critChance: 0.03 },
  tags: ['keen'],
  desc: 'Nature damage +12%, critical chance +3%. Counts as keen for evolutions.',
  flavour: 'Thorns on the outside. Mostly.',
});
item({
  id: 'ploughmans_pie',
  name: 'Ploughman’s Pie',
  rarity: 'uncommon',
  icon: cf(CF.pie),
  mods: { maxHp: 22, moveSpeed: -0.05 },
  desc: 'Max health +22, move speed -5%.',
  flavour: 'Structurally, it is a building.',
});
item({
  id: 'valley_wine',
  name: 'Wine of the Valley',
  rarity: 'uncommon',
  icon: cf(CF.wine),
  mods: { damage: 0.14, armour: -2 },
  desc: 'Damage +14%, armour -2.',
  flavour: 'Made from the grapes that survived. Tastes like it.',
});
item({
  id: 'tough_steak',
  name: 'Tough Steak',
  rarity: 'uncommon',
  icon: cf(CF.steak),
  mods: { knockback: 0.25, maxHp: 8, physical: 0.06 },
  desc: 'Knockback +25%, max health +8, physical damage +6%.',
  flavour: 'Chewing it counts as exercise.',
});

// --- rare -----------------------------------------------------------------
item({
  id: 'glass_hoe',
  name: 'Glass Hoe',
  rarity: 'rare',
  icon: cf(CF.glassHoe),
  mods: { critDamage: 0.65, critChance: 0.05, armour: -3 },
  tags: ['keen'],
  desc: 'Critical damage +65%, critical chance +5%, armour -3. Counts as keen.',
  flavour: 'Useless for hoeing. Superb for everything else.',
});
item({
  id: 'bee_crown',
  name: 'Bee Crown',
  rarity: 'rare',
  icon: 'produce_beebalm',
  mods: { summonPower: 0.25 },
  hook: 'beeCrown',
  hookValue: 2,
  desc: 'Summon power +25%. Hives gain 2 extra bees.',
  flavour: 'Woven by the bees, for whoever they decide is in charge.',
});
item({
  id: 'compost_heart',
  name: 'Compost Heart',
  rarity: 'rare',
  icon: cf(CF.berries),
  mods: { statusDuration: 0.15 },
  hook: 'compostHeart',
  hookValue: 150,
  desc: 'Every 150 damage dealt by poison, burns or bleeds heals you 3. Status duration +15%.',
  flavour: 'Warm, and it beats if you listen closely.',
});
item({
  id: 'seed_pouch',
  name: 'Bottomless Seed Pouch',
  rarity: 'rare',
  icon: cf(CF.pouch),
  mods: { projCount: 1, damage: -0.08 },
  desc: 'One more projectile for every shooting weapon, damage -8%.',
  flavour: 'There is always one more seed at the bottom.',
});
item({
  id: 'pitchfork_tine',
  name: 'Pitchfork Tine',
  rarity: 'rare',
  icon: cf(CF.ironSpear),
  mods: { damage: 0.05 },
  hook: 'pierce',
  hookValue: 1,
  desc: 'Projectiles pierce one more enemy. Damage +5%.',
  flavour: 'The fork broke. The tine kept going.',
});
item({
  id: 'pocketwatch',
  name: 'Cracked Pocketwatch',
  rarity: 'rare',
  icon: cf(CF.pocketwatch),
  mods: { attackSpeed: 0.1, dashCooldown: 0.1 },
  tags: ['echoing'],
  desc: 'Attack speed +10%, dash recovery +10%. Counts as Echoing.',
  flavour: 'Ticks twice for every second. Sometimes three times.',
});
item({
  id: 'blue_crystal',
  name: 'Hoarfrost Crystal',
  rarity: 'rare',
  icon: cf(CF.frostCrystal),
  mods: {},
  hook: 'frostTouch',
  hookValue: 0.12,
  tags: ['frostbound'],
  desc: 'Hits have a 12% chance to chill. Counts as Frostbound.',
  flavour: 'It is always slightly colder near it, even in August.',
});
item({
  id: 'storm_jar',
  name: 'Storm in a Jar',
  rarity: 'rare',
  icon: cf(CF.bluePotion),
  mods: { elemental: 0.1 },
  tags: ['charged'],
  desc: 'Elemental damage +10%. Counts as Charged.',
  flavour: 'Do not shake. Do not, under any circumstances, open.',
});
item({
  id: 'field_eye',
  name: 'Eye of the Field',
  rarity: 'rare',
  icon: cf(CF.eye),
  mods: { critChance: 0.08 },
  hook: 'statusCrit',
  hookValue: 0.3,
  desc: 'Critical chance +8%. Crits against poisoned, burning or bleeding enemies deal 30% more.',
  flavour: 'It saw everything that happened in this field. It wants to talk about it.',
});
item({
  id: 'splinter_seed',
  name: 'Splinter Seed',
  rarity: 'rare',
  icon: cf(CF.crystalBloom),
  mods: { critChance: 0.03 },
  hook: 'critThorns',
  hookValue: 2,
  desc: 'Critical hits release 2 thorns. Critical chance +3%.',
  flavour: 'Grew from a seed of a seed of a thorn.',
});
item({
  id: 'puffball_pouch',
  name: 'Puffball Pouch',
  rarity: 'rare',
  icon: 'produce_choircap',
  mods: { nature: 0.06 },
  hook: 'explosionSpores',
  hookValue: 1,
  desc: 'Explosions leave a cloud of poisonous spores. Nature damage +6%.',
  flavour: 'Squeeze gently. Then run.',
});
item({
  id: 'pressed_petals',
  name: 'Pressed Petals',
  rarity: 'rare',
  icon: 'produce_sunflower',
  mods: { regen: 0.2 },
  hook: 'petalShield',
  hookValue: 3,
  desc: 'Every 3 health you heal grows a petal ward (up to 3) that blocks one enemy shot.',
  flavour: 'Kept in the almanac, between frost dates and a recipe for jam.',
});
item({
  id: 'lucky_key',
  name: 'Key to Nowhere',
  rarity: 'rare',
  icon: cf(CF.key),
  mods: { luck: 4 },
  hook: 'extraChest',
  hookValue: 1,
  desc: 'Luck +4. Root Chests hold one more prize.',
  flavour: 'Fits no lock in the village. Fits several under it.',
});

// --- legendary ------------------------------------------------------------
item({
  id: 'unseasonal_moon',
  name: 'Unseasonal Moon',
  rarity: 'legendary',
  icon: cf(CF.voidShard),
  mods: { famForbidden: 0.6, arcane: 0.3, famVegetable: -0.15, famRoot: -0.15, famGrain: -0.15, famFruit: -0.15 },
  desc: 'Forbidden weapons +60%, arcane +30%. Vegetable, root, grain and fruit weapons -15%.',
  flavour: 'Rose at noon in the year the Root woke. Has not set since.',
});
item({
  id: 'gilded_jug',
  name: 'The Gilded Jug',
  rarity: 'legendary',
  icon: cf(CF.gildedJug),
  mods: { sapYield: 0.3 },
  hook: 'goldRush',
  hookValue: 2,
  tags: ['golden'],
  desc: 'Sap yield +30%. Farthings drop twice as often. Counts as Golden.',
  flavour: 'Bertha swears it is just a jug.',
});
item({
  id: 'wild_heart',
  name: 'Heart of the Hedgerow',
  rarity: 'legendary',
  icon: cf(CF.orange),
  mods: { damage: 0.2, maxHp: 15, luck: 3 },
  desc: 'Damage +20%, max health +15, luck +3. No catch. Possibly.',
  flavour: 'The hedgerow gave it to you. It will want it back.',
});

export const ITEM_PRICE: Record<string, number> = {
  common: 70,
  uncommon: 120,
  rare: 200,
  legendary: 330,
};
