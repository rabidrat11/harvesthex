// The state of one expedition's build: class, weapons, items, upgrades,
// level, sap, and the loot that will go home. Rebuilds the stat block
// whenever the build changes.

import { CLASSES, BASE_STATS, type ClassDef } from '../data/classes';
import { ITEMS } from '../data/items';
import { WEAPONS, WEAPON_SLOTS } from '../data/weapons';
import { addMods, zeroStats, type StatMods, type Stats } from '../data/stats';
import type { Family, Quality, TraitId } from '../data/types';
import { WeaponInstance } from './weapons';

export interface Graft {
  /** Crop species the produce came from. */
  species: string;
  weapon: string;
  traits: TraitId[];
  quality: Quality;
}

export interface Loadout {
  classId: string;
  region: string;
  tier: number;
  seed: number;
  grafts: Graft[];
  /** Jam jars and preserves taken along (Q). */
  consumables: { id: string; count: number }[];
  /** Permanent equipment bonuses. */
  equipment: StatMods;
  /** Held weapon tier from the smithy (0..3). */
  heldTier: number;
  /** Permanent passive perks unlocked on the farm. */
  perks: string[];
}

export interface LootBag {
  farthings: number;
  materials: Record<string, number>;
  seeds: { species: string; traits: TraitId[] }[];
  relics: string[];
}

export function emptyLoot(): LootBag {
  return { farthings: 0, materials: {}, seeds: [], relics: [] };
}

export const XP_BASE = 10;
export const XP_STEP = 30;

export function xpToNext(level: number): number {
  return XP_BASE + XP_STEP * (level - 1);
}

export class RunState {
  cls: ClassDef;
  loadout: Loadout;
  held: WeaponInstance;
  weapons: WeaponInstance[] = [];
  items: { id: string; count: number }[] = [];
  /** Stat upgrade cards taken: id -> times. */
  upgrades: Record<string, number> = {};
  upgradeMods: StatMods = {};
  stats: Stats = zeroStats();
  level = 1;
  xp = 0;
  sap = 0;
  sapCollected = 0;
  pendingLevels = 0;
  rerollCost = 12;
  loot: LootBag = emptyLoot();
  consumables: { id: string; count: number }[];
  /** Temporary mods (bargains), cleared when their acre ends. */
  tempMods: StatMods = {};
  /** Class passives that change stats mid-run (Deep Roots, Grindstone). */
  classMods: StatMods = {};
  curses: { id: string; acresLeft: number }[] = [];
  evolved: string[] = [];
  /** Choices made this expedition (e.g. waking the Watcher). */
  flags: Record<string, boolean> = {};
  private nextUid = 1;

  constructor(loadout: Loadout) {
    this.loadout = loadout;
    this.cls = CLASSES[loadout.classId] ?? CLASSES.fieldhand;
    this.held = new WeaponInstance(WEAPONS[this.cls.held], [], 1, this.uid());
    this.held.held = true;
    this.held.slot = 6;
    this.held.level = 1 + Math.min(3, loadout.heldTier);
    this.addWeapon(this.cls.starter, [], 1);
    for (const g of loadout.grafts) {
      if (this.weapons.length >= WEAPON_SLOTS) break;
      this.addWeapon(g.weapon, g.traits, g.quality, g.species);
    }
    this.consumables = loadout.consumables.map((c) => ({ ...c }));
    this.recompute();
  }

  uid(): number {
    return this.nextUid++;
  }

  addWeapon(id: string, traits: TraitId[] = [], level = 1, species?: string): WeaponInstance | null {
    const def = WEAPONS[id];
    if (!def) return null;
    if (this.weapons.length >= WEAPON_SLOTS) return null;
    const w = new WeaponInstance(def, traits, level, this.uid());
    w.species = species ?? def.crop ?? null;
    w.slot = this.weapons.length;
    this.weapons.push(w);
    this.recompute();
    return w;
  }

  removeWeapon(w: WeaponInstance) {
    this.weapons = this.weapons.filter((x) => x !== w);
    this.weapons.forEach((x, i) => (x.slot = i));
    this.recompute();
  }

  hasItem(id: string): number {
    return this.items.find((i) => i.id === id)?.count ?? 0;
  }

  addItem(id: string) {
    const ex = this.items.find((i) => i.id === id);
    if (ex) ex.count++;
    else this.items.push({ id, count: 1 });
    this.recompute();
  }

  /** Affinity tags granted by items (for evolutions). */
  tags(): Set<string> {
    const s = new Set<string>();
    for (const it of this.items) for (const t of ITEMS[it.id]?.tags ?? []) s.add(t);
    return s;
  }

  families(): Set<Family> {
    return new Set(this.weapons.map((w) => w.def.family));
  }

  hookValue(hook: string): number {
    let v = 0;
    for (const it of this.items) {
      const d = ITEMS[it.id];
      if (d?.hook === hook) v += (d.hookValue ?? 1) * it.count;
    }
    return v;
  }

  recompute() {
    const s = zeroStats();
    addMods(s, BASE_STATS);
    // Class base values replace the generic ones where given (maxHp), others add.
    const cb = { ...this.cls.base };
    if (cb.maxHp !== undefined) {
      s.maxHp = cb.maxHp;
      delete cb.maxHp;
    }
    addMods(s, cb);
    addMods(s, this.loadout.equipment);
    for (const it of this.items) addMods(s, ITEMS[it.id]?.mods, it.count);
    addMods(s, this.upgradeMods);
    addMods(s, this.tempMods);
    addMods(s, this.classMods);
    for (const w of this.weapons) addMods(s, w.def.statMods);
    s.maxHp = Math.max(10, Math.round(s.maxHp));
    this.stats = s;
    for (const w of this.weapons) w.recompute(this);
    this.held.recompute(this);
  }

  addXp(amount: number) {
    this.xp += amount;
    while (this.xp >= xpToNext(this.level + this.pendingLevels)) {
      this.xp -= xpToNext(this.level + this.pendingLevels);
      this.pendingLevels++;
    }
  }

  get xpNext(): number {
    return xpToNext(this.level + this.pendingLevels);
  }
}
