// The permanent save: farm, inventory, unlocks, records. Everything the
// player keeps between expeditions lives here. Nothing in it is ever deleted
// by failure; defeat only reduces what a single run brings home.

import type { Quality, TraitId } from '../data/types';
import type { RunResult } from './results';
import { CLASS_ORDER } from '../data/classes';

export interface SeedStack {
  species: string;
  traits: TraitId[];
  count: number;
}

export interface ProduceStack {
  species: string;
  traits: TraitId[];
  quality: Quality;
  count: number;
}

export interface CropState {
  species: string;
  traits: TraitId[];
  growth: number;
  fertilised: boolean;
  dryDays: number;
  blessed: boolean;
  plantedDay: number;
}

export interface Plot {
  id: number;
  tx: number;
  ty: number;
  bed: number;
  unlocked: boolean;
  tilled: boolean;
  watered: boolean;
  crop: CropState | null;
}

export type EquipSlot = 'head' | 'body' | 'feet' | 'charm';

export interface Profile {
  version: number;
  createdAt: number;
  updatedAt: number;
  day: number;
  farthings: number;
  materials: Record<string, number>;
  seeds: SeedStack[];
  produce: ProduceStack[];
  jars: Record<string, number>;
  fertiliser: number;
  compost: number;
  plots: Plot[];
  buildings: Record<string, number>;
  equipment: { owned: string[]; equipped: Record<EquipSlot, string | null> };
  heldTiers: Record<string, number>;
  classes: { unlocked: string[]; selected: string };
  tiers: { unlocked: number; selected: number };
  almanac: {
    species: string[];
    traits: string[];
    hybrids: string[];
    evolutions: string[];
    enemies: Record<string, number>;
    weapons: string[];
  };
  loadout: { grafts: ({ species: string; traits: TraitId[]; quality: Quality } | null)[]; jars: Record<string, number> };
  stats: {
    runs: number;
    wins: number;
    extractions: number;
    defeats: number;
    kills: number;
    bestWinTime: number;
    harvested: number;
    planted: number;
    bossKills: number;
    deepestAcre: number;
    sapTotal: number;
    seedsFound: number;
    maxLevel: number;
    flowersHarvested: number;
    jarsMade: number;
  };
  flags: Record<string, boolean | number>;
  lastRun: RunResult | null;
  scarecrow: { tx: number; ty: number; found: number; clicks: number };
  blessing: number;
  /** Plots that grew during the last return, for the harvest-ready hint. */
  grewLast: number[];
  /** A checkpoint of an expedition in progress; banked if the run never finished. */
  pendingRun: RunResult | null;
}

export const SAVE_VERSION = 3;

/** Farm beds: 3 beds of 2 rows x 6 plots. Bed 0 row 0 is open from the start. */
export function makePlots(): Plot[] {
  const plots: Plot[] = [];
  let id = 0;
  for (let bed = 0; bed < 3; bed++) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 6; col++) {
        plots.push({
          id: id++,
          tx: 16 + col,
          ty: 12 + bed * 3 + row,
          bed,
          unlocked: bed === 0 && row === 0,
          tilled: false,
          watered: false,
          crop: null,
        });
      }
    }
  }
  return plots;
}

export function newProfile(): Profile {
  const now = Date.now();
  const plots = makePlots();
  // Three plots arrive tilled so the first thing the player does is plant.
  for (let i = 0; i < 3; i++) plots[i].tilled = true;
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    day: 1,
    farthings: 20,
    materials: { wood: 4 },
    seeds: [
      { species: 'pea', traits: [], count: 4 },
      { species: 'carrot', traits: [], count: 2 },
      { species: 'turnip', traits: [], count: 2 },
    ],
    produce: [],
    jars: { jam: 2 },
    fertiliser: 0,
    compost: 0,
    plots,
    buildings: { farmhouse: 1, potting: 1, archive: 1, smithy: 1, pump: 0, bench: 0, compost: 0 },
    equipment: { owned: [], equipped: { head: null, body: null, feet: null, charm: null } },
    heldTiers: { fieldhand: 0, botanist: 0, reaper: 0 },
    // Every farmer is available from the first day.
    classes: { unlocked: [...CLASS_ORDER], selected: 'fieldhand' },
    tiers: { unlocked: 1, selected: 1 },
    almanac: { species: ['pea', 'carrot', 'turnip'], traits: [], hybrids: [], evolutions: [], enemies: {}, weapons: ['seed_sling', 'pea_repeater'] },
    loadout: { grafts: [null, null, null, null, null], jars: { jam: 2 } },
    stats: { runs: 0, wins: 0, extractions: 0, defeats: 0, kills: 0, bestWinTime: 0, harvested: 0, planted: 0, bossKills: 0, deepestAcre: 0, sapTotal: 0, seedsFound: 0, maxLevel: 0, flowersHarvested: 0, jarsMade: 0 },
    flags: {},
    lastRun: null,
    scarecrow: { tx: 23, ty: 12, found: 0, clicks: 0 },
    blessing: 0,
    grewLast: [],
    pendingRun: null,
  };
}

// ---------------------------------------------------------------------------
// Inventory helpers

export function sameTraits(a: TraitId[], b: TraitId[]) {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export function addSeeds(p: Profile, species: string, traits: TraitId[], n = 1) {
  const s = p.seeds.find((x) => x.species === species && sameTraits(x.traits, traits));
  if (s) s.count += n;
  else p.seeds.push({ species, traits: [...traits], count: n });
  if (!p.almanac.species.includes(species)) p.almanac.species.push(species);
  for (const t of traits) if (!p.almanac.traits.includes(t)) p.almanac.traits.push(t);
}

export function takeSeed(p: Profile, index: number): SeedStack | null {
  const s = p.seeds[index];
  if (!s || s.count <= 0) return null;
  s.count--;
  const out = { ...s, count: 1 };
  if (s.count <= 0) p.seeds.splice(index, 1);
  return out;
}

export function addProduce(p: Profile, species: string, traits: TraitId[], quality: Quality, n = 1) {
  const s = p.produce.find((x) => x.species === species && x.quality === quality && sameTraits(x.traits, traits));
  if (s) s.count += n;
  else p.produce.push({ species, traits: [...traits], quality, count: n });
}

export function takeProduce(p: Profile, species: string, traits: TraitId[], quality: Quality): boolean {
  const i = p.produce.findIndex((x) => x.species === species && x.quality === quality && sameTraits(x.traits, traits));
  if (i < 0) return false;
  p.produce[i].count--;
  if (p.produce[i].count <= 0) p.produce.splice(i, 1);
  return true;
}

/**
 * Drop grafts whose produce has left the stores (composted, eaten, offered,
 * crossbred). Each graft needs its own piece of produce. Returns the species dropped.
 */
export function pruneGrafts(p: Profile): string[] {
  const left = p.produce.map((s) => s.count);
  const dropped: string[] = [];
  p.loadout.grafts = p.loadout.grafts.map((g) => {
    if (!g) return null;
    const i = p.produce.findIndex((x, j) => left[j] > 0 && x.species === g.species && x.quality === g.quality && sameTraits(x.traits, g.traits));
    if (i < 0) {
      dropped.push(g.species);
      return null;
    }
    left[i]--;
    return g;
  });
  return dropped;
}

export function addMaterial(p: Profile, id: string, n: number) {
  p.materials[id] = (p.materials[id] ?? 0) + n;
}

export function hasMaterials(p: Profile, cost: Record<string, number>): boolean {
  return Object.entries(cost).every(([k, v]) => (k === 'farthings' ? p.farthings >= v : (p.materials[k] ?? 0) >= v));
}

export function payMaterials(p: Profile, cost: Record<string, number>): boolean {
  if (!hasMaterials(p, cost)) return false;
  for (const [k, v] of Object.entries(cost)) {
    if (k === 'farthings') p.farthings -= v;
    else p.materials[k] -= v;
  }
  return true;
}
