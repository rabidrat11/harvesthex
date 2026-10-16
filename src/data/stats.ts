// Character statistics. A run's final stats are the class base plus every
// additive modifier from equipment, items, upgrades and traits. Percent stats
// are stored as fractions (0.12 = +12%).

export const STAT_KEYS = [
  'maxHp',
  'regen',
  'armour',
  'moveSpeed',
  'dashCooldown',
  'dashDistance',
  'attackSpeed',
  'damage',
  'physical',
  'nature',
  'arcane',
  'elemental',
  'area',
  'critChance',
  'critDamage',
  'projSpeed',
  'projCount',
  'range',
  'knockback',
  'statusDuration',
  'luck',
  'sapYield',
  'pickupRadius',
  'summonPower',
  'lifesteal',
  'harvest',
  'mutationStability',
  'famVegetable',
  'famRoot',
  'famFlower',
  'famFungi',
  'famFruit',
  'famGrain',
  'famVine',
  'famForbidden',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;
export type StatMods = Partial<Record<StatKey, number>>;

export function zeroStats(): Stats {
  const s = {} as Stats;
  for (const k of STAT_KEYS) s[k] = 0;
  return s;
}

export function addMods(target: Stats, mods: StatMods | undefined, times = 1): Stats {
  if (!mods) return target;
  for (const k in mods) {
    const key = k as StatKey;
    target[key] += (mods[key] ?? 0) * times;
  }
  return target;
}

export interface StatInfo {
  label: string;
  /** How a value is shown: pct = +12%, flat = +3, per = 0.4/s, mult = x1.5 */
  fmt: 'pct' | 'flat' | 'per' | 'chance' | 'crit';
  desc: string;
  /** Hidden from the summary character sheet unless non-zero. */
  minor?: boolean;
  /** Lower is better (shown in a different colour when negative). */
  invert?: boolean;
}

export const STAT_INFO: Record<StatKey, StatInfo> = {
  maxHp: { label: 'Max health', fmt: 'flat', desc: 'How much punishment you can take.' },
  regen: { label: 'Regeneration', fmt: 'per', desc: 'Health restored every second.' },
  armour: { label: 'Armour', fmt: 'flat', desc: 'Each point cuts incoming damage. 15 armour halves it.' },
  moveSpeed: { label: 'Move speed', fmt: 'pct', desc: 'How quickly you walk.' },
  dashCooldown: { label: 'Dash recovery', fmt: 'pct', desc: 'Shortens the time between dashes.' },
  dashDistance: { label: 'Dash distance', fmt: 'pct', desc: 'How far a dash carries you.' },
  attackSpeed: { label: 'Attack speed', fmt: 'pct', desc: 'All weapons fire and swing faster.' },
  damage: { label: 'Damage', fmt: 'pct', desc: 'All damage dealt.' },
  physical: { label: 'Physical damage', fmt: 'pct', desc: 'Blunt, sharp and thrown things.' },
  nature: { label: 'Nature damage', fmt: 'pct', desc: 'Poison, spores, thorns and stings.' },
  arcane: { label: 'Arcane damage', fmt: 'pct', desc: 'Light, petals and moonlight.' },
  elemental: { label: 'Elemental damage', fmt: 'pct', desc: 'Fire, frost and lightning.' },
  area: { label: 'Area', fmt: 'pct', desc: 'Size of explosions, sweeps, puddles and orbits.' },
  critChance: { label: 'Critical chance', fmt: 'chance', desc: 'Chance for a hit to be critical.' },
  critDamage: { label: 'Critical damage', fmt: 'crit', desc: 'Extra damage dealt by critical hits.' },
  projSpeed: { label: 'Projectile speed', fmt: 'pct', desc: 'How fast shots travel.' },
  projCount: { label: 'Projectiles', fmt: 'flat', desc: 'Extra projectiles for weapons that fire them.' },
  range: { label: 'Range', fmt: 'pct', desc: 'How far weapons reach and seek targets.' },
  knockback: { label: 'Knockback', fmt: 'pct', desc: 'How hard hits shove enemies.' },
  statusDuration: { label: 'Status duration', fmt: 'pct', desc: 'Poison, burns, chills and bleeds last longer.' },
  luck: { label: 'Luck', fmt: 'flat', desc: 'Better upgrade rarities and more loot.' },
  sapYield: { label: 'Sap yield', fmt: 'pct', desc: 'More sap from every drop.' },
  pickupRadius: { label: 'Pickup reach', fmt: 'pct', desc: 'Sap and loot fly to you from further away.' },
  summonPower: { label: 'Summon power', fmt: 'pct', desc: 'Damage dealt by bees, mushrooms and other companions.' },
  lifesteal: { label: 'Life steal', fmt: 'chance', desc: 'Chance for a hit to restore 1 health.' },
  harvest: { label: 'Harvest', fmt: 'pct', desc: 'Chance of extra produce and seeds at home.', minor: true },
  mutationStability: { label: 'Mutation stability', fmt: 'pct', desc: 'Mutations take more reliably at the bench.', minor: true },
  famVegetable: { label: 'Vegetable weapons', fmt: 'pct', desc: 'Damage of vegetable-family weapons.', minor: true },
  famRoot: { label: 'Root weapons', fmt: 'pct', desc: 'Damage of root-family weapons.', minor: true },
  famFlower: { label: 'Flower weapons', fmt: 'pct', desc: 'Damage of flower-family weapons.', minor: true },
  famFungi: { label: 'Fungus weapons', fmt: 'pct', desc: 'Damage of fungus-family weapons.', minor: true },
  famFruit: { label: 'Fruit weapons', fmt: 'pct', desc: 'Damage of fruit-family weapons.', minor: true },
  famGrain: { label: 'Grain weapons', fmt: 'pct', desc: 'Damage of grain-family weapons.', minor: true },
  famVine: { label: 'Vine weapons', fmt: 'pct', desc: 'Damage of vine-family weapons.', minor: true },
  famForbidden: { label: 'Forbidden weapons', fmt: 'pct', desc: 'Damage of forbidden weapons.', minor: true },
};

/** Accumulate into a partial modifier set (missing keys count as zero). */
export function accumulate(target: StatMods, mods: StatMods, times = 1): StatMods {
  for (const k in mods) {
    const key = k as StatKey;
    target[key] = (target[key] ?? 0) + (mods[key] ?? 0) * times;
  }
  return target;
}

export function fmtStat(key: StatKey, v: number, signed = true): string {
  const info = STAT_INFO[key];
  const sign = signed && v > 0 ? '+' : '';
  switch (info.fmt) {
    case 'pct':
    case 'chance':
      return `${sign}${Math.round(v * 100)}%`;
    case 'crit':
      return `${sign}${Math.round(v * 100)}%`;
    case 'per':
      return `${sign}${(Math.round(v * 10) / 10).toString()}/s`;
    default:
      return `${sign}${Math.round(v * 10) / 10}`;
  }
}

export function describeMods(mods: StatMods): string[] {
  return (Object.keys(mods) as StatKey[])
    .filter((k) => mods[k])
    .map((k) => `${fmtStat(k, mods[k]!)} ${STAT_INFO[k].label.toLowerCase()}`);
}
