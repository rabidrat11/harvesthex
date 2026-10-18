// What an expedition brings home. Victory and extraction bank everything;
// defeat keeps all seeds and growth but only part of the farthings and
// materials. Nothing already owned is ever lost.

import type { World } from '../sim/world';
import type { TraitId } from '../data/types';
import { addMaterial, addSeeds, type Profile } from './profile';
import { growFarm } from '../farm/farm';

export interface RunResult {
  outcome: 'victory' | 'extracted' | 'defeat';
  classId: string;
  tier: number;
  time: number;
  acreReached: number;
  acreName: string;
  level: number;
  kills: number;
  elites: number;
  bosses: number;
  damageDealt: number;
  damageTaken: number;
  healed: number;
  sapCollected: number;
  sapLeft: number;
  cause: string;
  weapons: { id: string; name: string; level: number; damage: number; kills: number; traits: TraitId[] }[];
  farthings: number;
  sapFarthings: number;
  materials: Record<string, number>;
  seeds: { species: string; traits: TraitId[] }[];
  keptShare: number;
  growth: { plot: number; before: number; after: number }[];
  unlocks: string[];
  evolved: string[];
  day: number;
  /** Everything applyResult needs, so a saved checkpoint can be banked without the world. */
  killsByEnemy: Record<string, number>;
  jarsLeft: { id: string; count: number }[];
  /** Banked from a checkpoint after the run was cut short (crash, refresh). */
  recovered?: boolean;
}

export const DEFEAT_KEEP = 0.6;

export function buildResult(w: World): RunResult {
  const outcome = w.phase === 'victory' ? 'victory' : w.phase === 'extracted' ? 'extracted' : 'defeat';
  const run = w.run;
  const keep = outcome === 'defeat' ? DEFEAT_KEEP : 1;
  const materials: Record<string, number> = {};
  for (const [k, v] of Object.entries(run.loot.materials)) {
    const n = outcome === 'defeat' ? Math.floor(v * keep + (k === 'marrow_crown' ? 1 : 0)) : v;
    if (n > 0) materials[k] = n;
  }
  const sapFarthings = Math.floor(run.sap / 12);
  return {
    outcome,
    classId: run.cls.id,
    tier: w.tier,
    time: Math.round(w.t),
    acreReached: w.director.index,
    acreName: w.phase === 'victory' ? 'The Royal Patch' : (w.director.acre?.name ?? ''),
    level: run.level,
    kills: w.stats.kills,
    elites: w.stats.elites,
    bosses: w.stats.bosses,
    damageDealt: Math.round(w.stats.damageDealt),
    damageTaken: Math.round(w.stats.damageTaken),
    healed: Math.round(w.stats.healed),
    sapCollected: Math.round(run.sapCollected),
    sapLeft: Math.round(run.sap),
    cause: w.lastHurtBy,
    weapons: [run.held, ...run.weapons]
      .map((x) => ({ id: x.def.id, name: x.def.name, level: x.level, damage: Math.round(x.damageDealt), kills: x.kills, traits: x.traits }))
      .sort((a, b) => b.damage - a.damage),
    farthings: Math.floor((run.loot.farthings + sapFarthings) * keep),
    sapFarthings: Math.floor(sapFarthings * keep),
    materials,
    seeds: [...run.loot.seeds],
    keptShare: keep,
    growth: [],
    unlocks: [],
    evolved: [...run.evolved],
    day: 0,
    killsByEnemy: { ...w.killsByEnemy },
    jarsLeft: run.consumables.filter((c) => c.count > 0).map((c) => ({ ...c })),
  };
}

/**
 * A checkpoint of the run so far. Taken at a lull it banks everything (as if
 * you had headed home); taken mid-fight it banks like a defeat, so refreshing
 * to escape a bad moment is never better than playing on.
 */
export function checkpointResult(w: World, safe: boolean): RunResult {
  const saved = w.phase;
  w.phase = safe ? 'extracted' : 'defeat';
  let r: RunResult;
  try {
    r = buildResult(w);
  } finally {
    w.phase = saved;
  }
  r.outcome = 'extracted';
  r.recovered = true;
  r.cause = '';
  return r;
}

export function applyResult(p: Profile, r: RunResult): RunResult {
  p.pendingRun = null;
  p.farthings += r.farthings;
  for (const [k, v] of Object.entries(r.materials)) addMaterial(p, k, v);
  for (const s of r.seeds) addSeeds(p, s.species, s.traits, 1);
  // Jars you did not drink come back to the pantry.
  for (const c of r.jarsLeft ?? []) if (c.count > 0) p.jars[c.id] = (p.jars[c.id] ?? 0) + c.count;
  // The fields drink what you gathered. A victory feeds them a little extra.
  const mult = (r.outcome === 'victory' ? 1.25 : 1) * (1 + p.blessing);
  r.growth = growFarm(p, r.sapCollected, mult);
  p.blessing = 0;
  p.grewLast = r.growth.map((g) => g.plot);
  r.day = p.day;

  p.stats.runs++;
  p.stats.kills += r.kills;
  p.stats.seedsFound += r.seeds.length;
  p.stats.maxLevel = Math.max(p.stats.maxLevel, r.level);
  p.stats.sapTotal += r.sapCollected;
  p.stats.deepestAcre = Math.max(p.stats.deepestAcre, r.acreReached + (r.outcome === 'victory' ? 1 : 0));
  if (r.outcome === 'victory') {
    p.stats.wins++;
    p.stats.bossKills++;
    if (!p.stats.bestWinTime || r.time < p.stats.bestWinTime) p.stats.bestWinTime = r.time;
  } else if (r.outcome === 'extracted') p.stats.extractions++;
  else p.stats.defeats++;

  for (const [id, n] of Object.entries(r.killsByEnemy ?? {})) p.almanac.enemies[id] = (p.almanac.enemies[id] ?? 0) + n;
  for (const wpn of r.weapons) if (!p.almanac.weapons.includes(wpn.id)) p.almanac.weapons.push(wpn.id);
  for (const e of r.evolved) if (!p.almanac.evolutions.includes(e)) p.almanac.evolutions.push(e);

  r.unlocks = checkUnlocks(p, r);
  p.lastRun = r;
  return r;
}

/** Permanent unlocks earned so far. Returns the messages for new ones. */
export function checkUnlocks(p: Profile, r?: RunResult): string[] {
  const out: string[] = [];
  if (r?.outcome === 'victory') {
    if (p.tiers.unlocked < Math.min(3, r.tier + 1)) {
      p.tiers.unlocked = Math.min(3, r.tier + 1);
      out.push(`Rot tier ${p.tiers.unlocked} unlocked: the meadow grows nastier and richer.`);
    }
    if (!p.flags.gildedCan) {
      p.flags.gildedCan = true;
      out.push('Bertha has something for you. Visit the smithy.');
    }
  }
  if (!p.flags.benchHint && (p.materials.root_pollen ?? 0) > 0) {
    p.flags.benchHint = true;
    out.push('You found Root Pollen. Crossbreed crops at the mutation bench.');
  }
  return out;
}
