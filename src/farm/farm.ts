// Farm rules, as pure functions over the profile so they can be unit tested
// and reused by both the farm scene and the menus.
//
// Growth: everything collected on an expedition is sap, and a share of it
// soaks into every planted plot when you come home (watered plots drink far
// more). Quality: fertiliser and an unbroken watering record each add a
// grade. Seeds saved from a crop inherit its traits, imperfectly.

import type { Rng } from '../core/rng';
import { CROPS, MATURE, hybridOf } from '../data/crops';
import { REAGENT_TRAITS, TRAITS, TRAIT_IDS } from '../data/traits';
import { MATERIALS } from '../data/materials';
import type { Quality, TraitId } from '../data/types';
import { JARS, maxJars } from '../data/farm';
import { addProduce, addSeeds, takeProduce, takeSeed, type Plot, type Profile } from '../meta/profile';

/** Share of collected sap that becomes growth in each plot. */
export const GROWTH_SHARE = 0.35;
export const DRY_SHARE = 0.4;
export const MAX_TRAITS = 2;

export function stageOf(species: string, growth: number): number {
  const sap = CROPS[species]?.stageSap ?? 100;
  return Math.min(MATURE, Math.floor(growth / sap));
}

export function plotStage(p: Plot): number {
  return p.crop ? stageOf(p.crop.species, p.crop.growth) : -1;
}

export function qualityOf(p: Plot): Quality {
  const c = p.crop!;
  let q = 1 + (c.fertilised ? 1 : 0) + (c.dryDays === 0 ? 1 : 0) + (c.blessed ? 1 : 0);
  q = Math.min(3, q);
  return q as Quality;
}

export type ActionResult = { ok: true; msg?: string } | { ok: false; msg: string };

export function till(_pr: Profile, p: Plot): ActionResult {
  if (!p.unlocked) return { ok: false, msg: 'That ground is still overgrown.' };
  if (p.tilled) return { ok: false, msg: 'Already tilled.' };
  p.tilled = true;
  return { ok: true };
}

export function plant(pr: Profile, p: Plot, seedIndex: number): ActionResult {
  if (!p.tilled) return { ok: false, msg: 'Till the soil first.' };
  if (p.crop) return { ok: false, msg: 'Something is already growing here.' };
  const s = takeSeed(pr, seedIndex);
  if (!s) return { ok: false, msg: 'No seeds of that kind left.' };
  p.crop = { species: s.species, traits: [...s.traits], growth: 0, fertilised: false, dryDays: 0, blessed: false, plantedDay: pr.day };
  // The mended pump waters every planted plot, the new ones included.
  if (pr.buildings.pump >= 1) p.watered = true;
  pr.stats.planted++;
  return { ok: true };
}

export function water(_pr: Profile, p: Plot): ActionResult {
  if (!p.tilled) return { ok: false, msg: 'Nothing to water.' };
  if (p.watered) return { ok: false, msg: 'Already watered.' };
  p.watered = true;
  return { ok: true };
}

export function fertilise(pr: Profile, p: Plot): ActionResult {
  if (!p.crop) return { ok: false, msg: 'Plant something first.' };
  if (p.crop.fertilised) return { ok: false, msg: 'Already fertilised.' };
  if (pr.fertiliser <= 0) return { ok: false, msg: 'No compost. Fill the compost bin first.' };
  pr.fertiliser--;
  p.crop.fertilised = true;
  return { ok: true };
}

export interface HarvestResult {
  species: string;
  produce: number;
  seeds: number;
  quality: Quality;
  traits: TraitId[];
  newTrait: TraitId | null;
}

export function harvest(pr: Profile, p: Plot, rng: Rng, harvestBonus = 0): HarvestResult | null {
  if (!p.crop || plotStage(p) < MATURE) return null;
  const c = p.crop;
  const quality = qualityOf(p);
  const traits = [...c.traits];
  // A small chance the Root slips something new in.
  let newTrait: TraitId | null = null;
  if (traits.length < MAX_TRAITS && rng.chance(0.06 + harvestBonus * 0.05)) {
    const pool = TRAIT_IDS.filter((t) => !traits.includes(t) && t !== 'wild');
    newTrait = rng.pick(pool);
    traits.push(newTrait);
  }
  let produce = 1 + (rng.chance(0.2 + harvestBonus) ? 1 : 0);
  if (traits.includes('golden')) produce++;
  addProduce(pr, c.species, traits, quality, produce);
  // Saved seeds keep each trait most of the time.
  const stability = 0.75 + (pr.buildings.bench >= 2 ? 0.15 : 0);
  const seeds = 1 + (rng.chance(0.55 + harvestBonus) ? 1 : 0);
  for (let i = 0; i < seeds; i++) {
    const kept = traits.filter(() => rng.chance(stability));
    addSeeds(pr, c.species, kept, 1);
  }
  pr.stats.harvested++;
  if (CROPS[c.species]?.family === 'flower') pr.stats.flowersHarvested++;
  for (const t of traits) if (!pr.almanac.traits.includes(t)) pr.almanac.traits.push(t);
  p.crop = null;
  p.watered = false;
  return { species: c.species, produce, seeds, quality, traits, newTrait };
}

/** Called when the player returns: a day passes and the fields drink. */
export function growFarm(pr: Profile, sapCollected: number, mult: number): { plot: number; before: number; after: number }[] {
  const growth = sapCollected * GROWTH_SHARE * mult;
  const report: { plot: number; before: number; after: number }[] = [];
  for (const p of pr.plots) {
    if (!p.crop) {
      p.watered = false;
      continue;
    }
    const before = plotStage(p);
    if (before >= MATURE) {
      p.watered = false;
      continue;
    }
    let g = growth * (p.watered ? 1 : DRY_SHARE);
    if (p.crop.fertilised) g *= 1.25;
    if (!p.watered) p.crop.dryDays++;
    p.crop.growth += g;
    p.watered = false;
    const after = plotStage(p);
    if (after !== before) report.push({ plot: p.id, before, after });
  }
  pr.day++;
  // The repaired pump waters everything at dawn.
  if (pr.buildings.pump >= 1) for (const p of pr.plots) if (p.crop && plotStage(p) < MATURE) p.watered = true;
  return report;
}

// ---------------------------------------------------------------------------
// Mutation Bench

export function reagentFor(trait: TraitId): string | null {
  return REAGENT_TRAITS.find((r) => r.trait === trait)?.material ?? null;
}

export function mutateCrop(pr: Profile, p: Plot, material: string, rng: Rng): ActionResult & { trait?: TraitId } {
  if (pr.buildings.bench < 1) return { ok: false, msg: 'The bench needs rebuilding first.' };
  if (!p.crop) return { ok: false, msg: 'Nothing growing there.' };
  if (plotStage(p) >= MATURE) return { ok: false, msg: 'Too late: it has finished growing.' };
  const r = REAGENT_TRAITS.find((x) => x.material === material);
  if (!r) return { ok: false, msg: 'That will not do anything.' };
  if ((pr.materials[material] ?? 0) <= 0) return { ok: false, msg: `You have no ${MATERIALS[material].name}.` };
  if (p.crop.traits.includes(r.trait)) return { ok: false, msg: `It is already ${TRAITS[r.trait].name}.` };
  const max = MAX_TRAITS + (pr.buildings.bench >= 2 ? 1 : 0);
  if (p.crop.traits.length >= max) return { ok: false, msg: 'It cannot hold another trait.' };
  pr.materials[material]--;
  const chance = 0.72 + (pr.buildings.bench >= 2 ? 0.15 : 0);
  if (rng.chance(chance)) {
    p.crop.traits.push(r.trait);
    if (!pr.almanac.traits.includes(r.trait)) pr.almanac.traits.push(r.trait);
    return { ok: true, msg: `The ${CROPS[p.crop.species].name.toLowerCase()} turns ${TRAITS[r.trait].name}.`, trait: r.trait };
  }
  if (!p.crop.traits.includes('wild')) {
    p.crop.traits.push('wild');
    return { ok: true, msg: 'The reagent fizzes wrong. The crop has gone Wild.', trait: 'wild' };
  }
  return { ok: true, msg: 'The reagent fizzes and does nothing.' };
}

export interface CrossResult {
  species: string;
  traits: TraitId[];
  count: number;
  named: boolean;
}

/** Splice two produce into hybrid seeds. `a` is the seed parent. */
export function crossbreed(
  pr: Profile,
  a: { species: string; traits: TraitId[]; quality: Quality },
  b: { species: string; traits: TraitId[]; quality: Quality },
  rng: Rng,
): (ActionResult & { result?: CrossResult }) {
  if (pr.buildings.bench < 1) return { ok: false, msg: 'The bench needs rebuilding first.' };
  if (a.species === b.species) return { ok: false, msg: 'Crossing a crop with itself makes more of the same.' };
  if ((pr.materials.root_pollen ?? 0) <= 0) return { ok: false, msg: 'You need Root Pollen. Elites shed it.' };
  const named = hybridOf(a.species, b.species);
  let species: string;
  let traits: TraitId[];
  if (named) {
    species = named;
    traits = [...new Set([...a.traits, ...b.traits])].filter((t) => t !== CROPS[named].gene).slice(0, MAX_TRAITS);
  } else {
    // An unnamed cross: the seed parent, carrying the other parent's gene.
    species = a.species;
    const gene = CROPS[b.species].gene;
    traits = [...new Set([gene, ...a.traits, ...b.traits])].slice(0, MAX_TRAITS);
  }
  if (!takeProduce(pr, a.species, a.traits, a.quality)) return { ok: false, msg: 'You no longer have the first crop.' };
  if (!takeProduce(pr, b.species, b.traits, b.quality)) {
    addProduce(pr, a.species, a.traits, a.quality, 1);
    return { ok: false, msg: 'You no longer have the second crop.' };
  }
  pr.materials.root_pollen--;
  const count = 2 + (rng.chance(0.3) ? 1 : 0);
  addSeeds(pr, species, traits, count);
  if (named && !pr.almanac.hybrids.includes(named)) pr.almanac.hybrids.push(named);
  return { ok: true, result: { species, traits, count, named: !!named } };
}

// ---------------------------------------------------------------------------
// Compost and preserves

export const COMPOST_PER_BAG = 3;

export function compostProduce(pr: Profile, species: string, traits: TraitId[], quality: Quality): ActionResult {
  if (pr.buildings.compost < 1) return { ok: false, msg: 'Build the compost bin first.' };
  if (!takeProduce(pr, species, traits, quality)) return { ok: false, msg: 'None left.' };
  pr.compost += quality;
  while (pr.compost >= COMPOST_PER_BAG) {
    pr.compost -= COMPOST_PER_BAG;
    pr.fertiliser++;
  }
  return { ok: true };
}

export function compostSeed(pr: Profile, index: number): ActionResult {
  if (pr.buildings.compost < 1) return { ok: false, msg: 'Build the compost bin first.' };
  if (!takeSeed(pr, index)) return { ok: false, msg: 'None left.' };
  pr.compost += 1;
  while (pr.compost >= COMPOST_PER_BAG) {
    pr.compost -= COMPOST_PER_BAG;
    pr.fertiliser++;
  }
  return { ok: true };
}

export function preserve(pr: Profile, jar: string, picks: { species: string; traits: TraitId[]; quality: Quality }[]): ActionResult {
  const def = JARS[jar];
  if (!def) return { ok: false, msg: 'No such recipe.' };
  const need = def.from === 'any2' ? 2 : 1;
  if (picks.length !== need) return { ok: false, msg: `Needs ${need} produce.` };
  if (def.from !== 'any2' && !def.from.includes(picks[0].species)) return { ok: false, msg: 'Wrong ingredient.' };
  const taken: typeof picks = [];
  for (const p of picks) {
    if (!takeProduce(pr, p.species, p.traits, p.quality)) {
      for (const t of taken) addProduce(pr, t.species, t.traits, t.quality, 1);
      return { ok: false, msg: 'Not enough produce.' };
    }
    taken.push(p);
  }
  pr.jars[jar] = (pr.jars[jar] ?? 0) + 1;
  pr.stats.jarsMade++;
  return { ok: true, msg: `You seal a ${def.name.toLowerCase()}.` };
}

export function clampLoadoutJars(pr: Profile) {
  let total = 0;
  for (const k of Object.keys(pr.loadout.jars)) {
    const want = Math.max(0, Math.min(pr.jars[k] ?? 0, pr.loadout.jars[k] ?? 0, maxJars(pr.flags) - total));
    pr.loadout.jars[k] = want;
    total += want;
  }
}

/** Seeds and buildings the player can see in the archive. */
export function seedPrice(species: string): number | null {
  return CROPS[species]?.price ?? null;
}
