// Level-up offers and Mags's cart. Offers lean towards the current build
// (class preferences, crop families already fielded) and never show stats
// that cannot affect it, so three choices can be read in a few seconds.

import type { Rng } from '../core/rng';
import { ITEMS, ITEM_PRICE } from '../data/items';
import { MAX_WEAPON_LEVEL, SHOP_WEAPONS, WEAPONS, WEAPON_SLOTS } from '../data/weapons';
import { accumulate, type StatMods } from '../data/stats';
import { RARITY_ORDER, type Rarity } from '../data/types';
import { TRAIT_IDS } from '../data/traits';
import type { RunState } from './run';
import type { WeaponInstance } from './weapons';
import type { World } from './world';

export interface StatCard {
  id: string;
  name: string;
  icon: string;
  mods: StatMods;
  /** Only offered when this returns true. */
  relevant?: (run: RunState) => boolean;
  minRarity?: Rarity;
  tradeoff?: boolean;
}

const has = (tag: string) => (run: RunState) => run.weapons.some((w) => w.def.tags.includes(tag)) || run.held.def.tags.includes(tag);
const hasType = (t: string) => (run: RunState) => run.weapons.some((w) => w.def.dmgType === t) || run.held.def.dmgType === t;
const hasStatus = (run: RunState) => run.weapons.some((w) => w.status.length > 0) || run.held.status.length > 0;
const shoots = (run: RunState) => run.weapons.some((w) => w.def.tags.includes('projectile')) || run.held.def.tags.includes('projectile');

export const STAT_CARDS: StatCard[] = [
  { id: 'tilled_muscles', name: 'Tilled Muscles', icon: 'dt_physical', mods: { physical: 0.08 }, relevant: hasType('physical') },
  { id: 'green_thumb', name: 'Green Thumb', icon: 'dt_nature', mods: { nature: 0.09 }, relevant: hasType('nature') },
  { id: 'moonlit', name: 'Moonlit Hours', icon: 'dt_arcane', mods: { arcane: 0.1 }, relevant: hasType('arcane') },
  { id: 'kindling', name: 'Dry Kindling', icon: 'dt_elemental', mods: { elemental: 0.1 }, relevant: hasType('elemental') },
  { id: 'fresh_air', name: 'Fresh Air', icon: 'ic_star', mods: { damage: 0.05 } },
  { id: 'quick_hands', name: 'Quick Hands', icon: 'ic_clock', mods: { attackSpeed: 0.06 } },
  { id: 'thick_skin', name: 'Thick Skin', icon: 'ic_heart', mods: { maxHp: 8 } },
  { id: 'hearty', name: 'Hearty Breakfast', icon: 'ic_heart', mods: { regen: 0.25 } },
  { id: 'patched_coat', name: 'Patched Coat', icon: 'ic_armour', mods: { armour: 1.25 } },
  { id: 'light_feet', name: 'Light Feet', icon: 'ic_speed', mods: { moveSpeed: 0.05 } },
  { id: 'nimble', name: 'Nimble', icon: 'ic_dash', mods: { dashCooldown: 0.08 } },
  { id: 'long_stride', name: 'Long Stride', icon: 'ic_dash', mods: { dashDistance: 0.12 } },
  { id: 'keen_eye', name: 'Keen Eye', icon: 'ic_crit', mods: { critChance: 0.03 } },
  { id: 'sharpened', name: 'Sharpened Edge', icon: 'ic_crit', mods: { critDamage: 0.15 } },
  { id: 'wide_swing', name: 'Wide Swing', icon: 'ic_star', mods: { area: 0.08 }, relevant: (r) => r.weapons.some((w) => w.params.area > 0) || r.held.params.area > 0 },
  { id: 'strong_arm', name: 'Strong Arm', icon: 'ic_star', mods: { range: 0.1 }, relevant: shoots },
  { id: 'fast_seeds', name: 'Hard Seeds', icon: 'ic_seed', mods: { projSpeed: 0.1, damage: 0.02 }, relevant: shoots },
  { id: 'extra_seed', name: 'One More Seed', icon: 'ic_seed', mods: { projCount: 0.6 }, relevant: shoots, minRarity: 'rare' },
  { id: 'heavy_hands', name: 'Heavy Hands', icon: 'dt_physical', mods: { knockback: 0.15 } },
  { id: 'lingering', name: 'Lingering Rot', icon: 'dt_nature', mods: { statusDuration: 0.12 }, relevant: hasStatus },
  { id: 'four_leaf', name: 'Four-Leaf Clover', icon: 'ic_luck', mods: { luck: 2 } },
  { id: 'sappy', name: 'Sappy', icon: 'ic_sap', mods: { sapYield: 0.06 } },
  { id: 'long_reach', name: 'Long Reach', icon: 'ic_hand', mods: { pickupRadius: 0.2 } },
  { id: 'hive_mind', name: 'Hive Mind', icon: 'ic_crown', mods: { summonPower: 0.1 }, relevant: has('summon') },
  { id: 'blood_drinker', name: 'Blood Drinker', icon: 'ic_heart', mods: { lifesteal: 0.02 } },
  { id: 'glass_heart', name: 'Glass Heart', icon: 'ic_star', mods: { damage: 0.16, maxHp: -10 }, minRarity: 'rare', tradeoff: true },
  { id: 'iron_will', name: 'Iron Will', icon: 'ic_armour', mods: { armour: 3, moveSpeed: -0.05 }, minRarity: 'uncommon', tradeoff: true },
  { id: 'frenzy', name: 'Frenzy', icon: 'ic_clock', mods: { attackSpeed: 0.14, armour: -2 }, minRarity: 'rare', tradeoff: true },
];

const RARITY_MULT: Record<Rarity, number> = { common: 1, uncommon: 1.6, rare: 2.4, legendary: 3.5 };

export type Offer =
  | { kind: 'stat'; card: StatCard; rarity: Rarity; mods: StatMods }
  | { kind: 'weaponUp'; weapon: WeaponInstance; desc: string }
  | { kind: 'weaponNew'; id: string; rarity: Rarity }
  | { kind: 'evolve'; weapon: WeaponInstance; into: string }
  | { kind: 'heldUp'; desc: string }
  | { kind: 'item'; id: string; rarity: Rarity };

function scaleMods(mods: StatMods, mult: number): StatMods {
  const out: StatMods = {};
  for (const k in mods) {
    const key = k as keyof StatMods;
    const v = mods[key]!;
    // Negative halves of trade-offs grow more slowly than the upside.
    const m = v < 0 ? 1 + (mult - 1) * 0.5 : mult;
    const flat = key === 'projCount' || key === 'armour' || key === 'maxHp' || key === 'luck';
    out[key] = flat ? Math.sign(v) * Math.max(1, Math.round(Math.abs(v) * (v < 0 ? m : mult))) : Math.round(v * m * 1000) / 1000;
  }
  return out;
}

export function rollRarity(rng: Rng, luck: number, min: Rarity = 'common'): Rarity {
  const l = Math.max(0, luck);
  const w: Record<Rarity, number> = { common: 60, uncommon: 28 + l * 0.8, rare: 10 + l * 0.6, legendary: 2 + l * 0.25 };
  const order = RARITY_ORDER.filter((r) => RARITY_ORDER.indexOf(r) >= RARITY_ORDER.indexOf(min));
  return rng.weighted(order, (r) => w[r]) ?? 'common';
}

function weaponWeight(run: RunState, id: string): number {
  const def = WEAPONS[id];
  let wt = 1;
  if (def.tags.some((t) => run.cls.prefers.includes(t))) wt *= 1.8;
  if (run.families().has(def.family)) wt *= 1.4;
  if (run.cls.id === 'fieldhand' && !run.families().has(def.family)) wt *= 1.4;
  if (def.rarity === 'rare') wt *= 0.7;
  return wt;
}

export function rollLevelUp(world: World, rng: Rng, count = 3): Offer[] {
  const run = world.run;
  const offers: Offer[] = [];
  const taken = new Set<string>();

  // An eligible evolution is always offered.
  for (const wi of run.weapons) {
    const evo = wi.evolution(run);
    if (evo && offers.length < count) {
      offers.push({ kind: 'evolve', weapon: wi, into: evo.into });
      taken.add('evo:' + wi.uid);
      break;
    }
  }

  // Weapon offers: up to two.
  const upgradable = run.weapons.filter((w) => w.level < MAX_WEAPON_LEVEL && !w.def.evolvedFrom);
  const canAdd = run.weapons.length < WEAPON_SLOTS;
  const newPool = SHOP_WEAPONS.filter((id) => !run.weapons.some((w) => w.def.id === id || w.def.evolvedFrom === id));
  let weaponSlots = rng.chance(0.75) ? 2 : 1;
  if (run.level < 4) weaponSlots = 2;
  for (let i = 0; i < weaponSlots && offers.length < count; i++) {
    const upLeft = upgradable.filter((w) => !taken.has('up:' + w.uid)).length;
    // Early on, always show a new weapon: growing the arsenal is the fun part.
    const early = run.level <= 3 && i === 0;
    const preferNew = canAdd && newPool.length > 0 && (early || upLeft === 0 || rng.chance(run.weapons.length < 3 ? 0.6 : 0.35));
    if (preferNew) {
      const id = rng.weighted(
        newPool.filter((id) => !taken.has('new:' + id)),
        (id) => weaponWeight(run, id),
      );
      if (id) {
        taken.add('new:' + id);
        offers.push({ kind: 'weaponNew', id, rarity: WEAPONS[id].rarity });
        continue;
      }
    }
    const w = rng.pick(upgradable.filter((w) => !taken.has('up:' + w.uid)) as WeaponInstance[]);
    if (w) {
      taken.add('up:' + w.uid);
      offers.push({ kind: 'weaponUp', weapon: w, desc: w.def.levels[w.level - 1]?.desc ?? '' });
    }
  }

  // Held weapon, now and then.
  if (offers.length < count && run.held.level < MAX_WEAPON_LEVEL && rng.chance(0.3)) {
    offers.push({ kind: 'heldUp', desc: run.held.def.levels[run.held.level - 1]?.desc ?? '' });
  }

  // Fill with stat cards relevant to this build.
  const pool = STAT_CARDS.filter((c) => !c.relevant || c.relevant(run));
  let guard = 0;
  while (offers.length < count && guard++ < 50) {
    const card = rng.pick(pool);
    if (taken.has('stat:' + card.id)) continue;
    taken.add('stat:' + card.id);
    const rarity = rollRarity(rng, run.stats.luck, card.minRarity);
    offers.push({ kind: 'stat', card, rarity, mods: scaleMods(card.mods, RARITY_MULT[rarity]) });
  }
  return rng.shuffle(offers);
}

export function applyOffer(world: World, o: Offer) {
  const run = world.run;
  switch (o.kind) {
    case 'stat':
      accumulate(run.upgradeMods, o.mods);
      run.upgrades[o.card.id] = (run.upgrades[o.card.id] ?? 0) + 1;
      break;
    case 'weaponUp':
      o.weapon.level = Math.min(MAX_WEAPON_LEVEL, o.weapon.level + 1);
      break;
    case 'heldUp':
      run.held.level = Math.min(MAX_WEAPON_LEVEL, run.held.level + 1);
      break;
    case 'weaponNew':
      run.addWeapon(o.id, [], 1);
      break;
    case 'evolve':
      evolveWeapon(world, o.weapon, o.into);
      break;
    case 'item':
      run.addItem(o.id);
      break;
  }
  run.recompute();
  if (world.player.hp > run.stats.maxHp) world.player.hp = run.stats.maxHp;
}

export function evolveWeapon(world: World, wi: WeaponInstance, into: string) {
  const def = WEAPONS[into];
  if (!def) return;
  // Release any summons the old form owned; the new form makes its own.
  for (const s of wi.summons) world.summons.release(s);
  wi.summons = [];
  wi.def = def;
  wi.level = MAX_WEAPON_LEVEL;
  wi.orbitPos = [];
  wi.cd = 0.2;
  world.run.evolved.push(into);
  world.run.recompute();
  world.fx({ type: 'evolve', x: world.player.x, y: world.player.y - 10, s: into });
  world.sfx('evolve', 1);
  world.shake(4, 0.4);
  world.hitstop(0.1);
}

// ---------------------------------------------------------------------------
// Mags's cart

export interface ShopSlot {
  offer: Offer;
  price: number;
  locked: boolean;
  sold: boolean;
}

export interface Bargain {
  id: string;
  name: string;
  desc: string;
  taken: boolean;
}

export interface Shop {
  slots: ShopSlot[];
  rerolls: number;
  bargain: Bargain;
  teaBought: boolean;
}

const BARGAINS: { id: string; name: string; desc: string }[] = [
  { id: 'root_debt', name: 'Root Debt', desc: 'Sap drops are worth 40% more next acre, but enemies have 25% more health.' },
  { id: 'thorn_oath', name: 'Thorn Oath', desc: 'Deal 25% more damage next acre, and take 20% more.' },
  { id: 'blood_seed', name: 'Blood Seed', desc: 'Lose 15 max health for the rest of this expedition. Take a rare item, free.' },
  { id: 'wild_graft', name: 'Wild Graft', desc: 'A random weapon of yours goes Wild: 10% more damage and a new random trait every acre.' },
  { id: 'hungry_soil', name: 'Hungry Soil', desc: 'Next acre spawns 30% more enemies. Mags hands you a rare seed now.' },
];

export function acreScale(world: World): number {
  return 1 + world.director.index * 0.22;
}

function weaponPrice(world: World, id: string, level: number) {
  const base = { common: 90, uncommon: 140, rare: 220, legendary: 330 }[WEAPONS[id].rarity];
  return Math.round(base * (1 + (level - 1) * 0.5) * acreScale(world));
}

function itemPrice(world: World, id: string) {
  return Math.round(ITEM_PRICE[ITEMS[id].rarity] * acreScale(world));
}

function rollShopOffer(world: World, rng: Rng, exclude: Set<string>): { offer: Offer; price: number } {
  const run = world.run;
  if (rng.chance(0.4)) {
    const candidates = SHOP_WEAPONS.filter((id) => !exclude.has(id));
    const id = rng.weighted(candidates, (id) => weaponWeight(run, id) * (run.weapons.some((w) => w.def.id === id) ? 1.5 : 1));
    if (id) {
      exclude.add(id);
      const owned = run.weapons.find((w) => w.def.id === id && w.level < MAX_WEAPON_LEVEL);
      if (owned) return { offer: { kind: 'weaponUp', weapon: owned, desc: owned.def.levels[owned.level - 1]?.desc ?? '' }, price: weaponPrice(world, id, owned.level + 1) };
      if (run.weapons.length < WEAPON_SLOTS && !run.weapons.some((w) => w.def.id === id || w.def.evolvedFrom === id))
        return { offer: { kind: 'weaponNew', id, rarity: WEAPONS[id].rarity }, price: weaponPrice(world, id, 1) };
    }
  }
  const rarity = rollRarity(rng, run.stats.luck + world.director.index * 2);
  const pool = Object.values(ITEMS).filter((i) => i.rarity === rarity && !exclude.has(i.id) && (!i.max || run.hasItem(i.id) < i.max));
  const it = rng.pick(pool.length ? pool : Object.values(ITEMS).filter((i) => !exclude.has(i.id)));
  exclude.add(it.id);
  return { offer: { kind: 'item', id: it.id, rarity: it.rarity }, price: itemPrice(world, it.id) };
}

/** What an offer is for, so two slots never offer the same weapon or item. */
function offerKey(o: Offer): string {
  if (o.kind === 'item' || o.kind === 'weaponNew') return o.id;
  if (o.kind === 'weaponUp') return o.weapon.def.id;
  return '';
}

/** Whether an offer (perhaps locked in an earlier acre) can still be bought. */
export function offerValid(world: World, o: Offer): boolean {
  const run = world.run;
  if (o.kind === 'weaponNew') return run.weapons.length < WEAPON_SLOTS && !run.weapons.some((w) => w.def.id === o.id || w.def.evolvedFrom === o.id);
  if (o.kind === 'weaponUp') return run.weapons.includes(o.weapon) && !o.weapon.def.evolvedFrom && o.weapon.level < MAX_WEAPON_LEVEL;
  return true;
}

function lockedSlots(shop: { slots: ShopSlot[] } | null | undefined, exclude: Set<string>): (ShopSlot | null)[] {
  return (shop?.slots ?? []).map((s) => {
    if (!s.locked || s.sold) return null;
    exclude.add(offerKey(s.offer));
    return s;
  });
}

export function makeShop(world: World, rng: Rng, prev?: Shop | null): Shop {
  const slots: ShopSlot[] = [];
  const exclude = new Set<string>();
  for (const s of lockedSlots(prev, exclude)) {
    // A locked offer that no longer applies (that weapon was since levelled to
    // the top, evolved, or taken) is dropped rather than sold for nothing.
    if (!s || !offerValid(world, s.offer)) continue;
    const o = s.offer;
    if (o.kind === 'weaponUp') {
      slots.push({ ...s, offer: { ...o, desc: o.weapon.def.levels[o.weapon.level - 1]?.desc ?? '' }, price: weaponPrice(world, o.weapon.def.id, o.weapon.level + 1), locked: true });
    } else slots.push({ ...s, locked: true });
  }
  while (slots.length < 4) {
    const r = rollShopOffer(world, rng, exclude);
    slots.push({ offer: r.offer, price: r.price, locked: false, sold: false });
  }
  const b = rng.pick(BARGAINS);
  return { slots, rerolls: 0, bargain: { ...b, taken: false }, teaBought: false };
}

export function rerollCost(world: World, shop: Shop) {
  return Math.round((16 + shop.rerolls * 12) * acreScale(world));
}

export function rerollShop(world: World, rng: Rng, shop: Shop): boolean {
  const cost = rerollCost(world, shop);
  if (world.run.sap < cost) return false;
  world.run.sap -= cost;
  const exclude = new Set<string>();
  lockedSlots(shop, exclude);
  shop.slots = shop.slots.map((s) => {
    if (s.locked && !s.sold) return s;
    const r = rollShopOffer(world, rng, exclude);
    return { offer: r.offer, price: r.price, locked: false, sold: false };
  });
  shop.rerolls++;
  return true;
}

export function buySlot(world: World, slot: ShopSlot): boolean {
  if (slot.sold || world.run.sap < slot.price) return false;
  if (!offerValid(world, slot.offer)) return false;
  world.run.sap -= slot.price;
  slot.sold = true;
  slot.locked = false;
  applyOffer(world, slot.offer);
  world.sfx('buy', 1);
  return true;
}

export const TEA_PRICE = 45;

export function buyTea(world: World, shop: Shop) {
  if (shop.teaBought || world.run.sap < TEA_PRICE) return false;
  world.run.sap -= TEA_PRICE;
  shop.teaBought = true;
  const p = world.player;
  p.hp = Math.min(world.run.stats.maxHp, p.hp + world.run.stats.maxHp * 0.5);
  world.sfx('drink', 1);
  return true;
}

export function takeBargain(world: World, rng: Rng, shop: Shop): string {
  const b = shop.bargain;
  if (b.taken) return '';
  b.taken = true;
  const run = world.run;
  switch (b.id) {
    case 'root_debt':
      run.tempMods.sapYield = (run.tempMods.sapYield ?? 0) + 0.4;
      run.curses.push({ id: 'root_debt', acresLeft: 1 });
      break;
    case 'thorn_oath':
      run.tempMods.damage = (run.tempMods.damage ?? 0) + 0.25;
      run.curses.push({ id: 'thorn_oath', acresLeft: 1 });
      break;
    case 'blood_seed': {
      run.upgradeMods.maxHp = (run.upgradeMods.maxHp ?? 0) - 15;
      const pool = Object.values(ITEMS).filter((i) => i.rarity === 'rare');
      const it = rng.pick(pool);
      run.addItem(it.id);
      run.recompute();
      world.player.hp = Math.min(world.player.hp, run.stats.maxHp);
      return `Mags slips you ${it.name}.`;
    }
    case 'wild_graft': {
      const cands = run.weapons.filter((w) => !w.traits.includes('wild'));
      const w = cands.length ? rng.pick(cands) : null;
      if (w) {
        w.traits.push('wild');
        w.rollWild(rng);
        run.recompute();
        return `${w.def.name} goes Wild (${w.wildTrait}).`;
      }
      return 'Nothing took the graft.';
    }
    case 'hungry_soil': {
      run.curses.push({ id: 'hungry_soil', acresLeft: 1 });
      run.loot.seeds.push({ species: rng.pick(['sunflower', 'pumpkin', 'stormcorn']), traits: rng.chance(0.4) ? [rng.pick(TRAIT_IDS.filter((t) => t !== 'wild'))] : [] });
      return 'Mags presses a seed into your hand. It is warm.';
    }
  }
  run.recompute();
  return '';
}
