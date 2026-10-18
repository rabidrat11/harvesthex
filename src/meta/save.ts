// Local persistence. The profile is written to localStorage inside an
// envelope with a version and checksum; the previous good save is kept as a
// backup. Loading migrates old versions, validates every field against the
// default profile, and falls back to the backup if the primary is damaged.

import { hashString } from '../core/rng';
import { newProfile, makePlots, SAVE_VERSION, type Profile } from './profile';
import { CLASS_ORDER } from '../data/classes';
import { CROPS } from '../data/crops';
import { TRAITS } from '../data/traits';
import { EQUIPMENT } from '../data/farm';

const KEY = 'harvesthex.save';
const BACKUP = 'harvesthex.save.bak';

interface Envelope {
  game: 'harvesthex';
  version: number;
  savedAt: number;
  checksum: string;
  data: unknown;
}

export type LoadResult =
  | { ok: true; profile: Profile; migratedFrom?: number; usedBackup?: boolean }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'corrupt'; raw: string };

function checksum(json: string) {
  return hashString(json).toString(36);
}

export function envelope(p: Profile): string {
  const data = JSON.stringify(p);
  const env: Envelope = { game: 'harvesthex', version: SAVE_VERSION, savedAt: Date.now(), checksum: checksum(data), data: p };
  return JSON.stringify(env);
}

/** Older saves are upgraded one version at a time. */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2: held weapon tiers were added.
  1: (d) => ({ ...d, heldTiers: d.heldTiers ?? { fieldhand: 0, botanist: 0, reaper: 0 }, version: 2 }),
  // v2 -> v3: shrine blessing and the "what grew" hint.
  2: (d) => ({ ...d, blessing: d.blessing ?? 0, grewLast: d.grewLast ?? [], version: 3 }),
};

export function migrate(data: Record<string, unknown>, from: number): Record<string, unknown> {
  let d = data;
  for (let v = from; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`no migration from v${v}`);
    d = m(d);
  }
  return d;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Merge `v` onto `def`, keeping only fields whose type matches the default. */
function conform(def: unknown, v: unknown): unknown {
  if (v === undefined) return structuredClone(def);
  if (typeof def === 'number') return typeof v === 'number' && Number.isFinite(v) ? v : def;
  if (typeof def === 'string') return typeof v === 'string' ? v : def;
  if (typeof def === 'boolean') return typeof v === 'boolean' ? v : def;
  if (def === null) return v;
  if (Array.isArray(def)) return Array.isArray(v) ? v : structuredClone(def);
  if (isObj(def)) {
    if (!isObj(v)) return structuredClone(def);
    const out: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(def), ...Object.keys(v)]);
    for (const k of keys) {
      if (k in def) out[k] = conform((def as Record<string, unknown>)[k], v[k]);
      else out[k] = v[k];
    }
    return out;
  }
  return v;
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
/** Only traits the game knows (an old or edited save may name others). */
const traitArr = (v: unknown) => strArr(v).filter((t) => t in TRAITS) as never[];
const isCrop = (v: unknown): v is string => typeof v === 'string' && v in CROPS;

/** Whether a stored run result has everything applyResult reads. */
function isRunResult(v: unknown): boolean {
  if (!isObj(v)) return false;
  const numbers = ['farthings', 'sapCollected', 'time', 'level', 'kills', 'acreReached', 'keptShare', 'day'];
  return (
    ['victory', 'extracted', 'defeat'].includes(v.outcome as string) &&
    numbers.every((k) => typeof v[k] === 'number' && Number.isFinite(v[k])) &&
    isObj(v.materials) &&
    Object.values(v.materials).every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Array.isArray(v.seeds) &&
    v.seeds.every((s) => isObj(s) && typeof s.species === 'string' && Array.isArray(s.traits)) &&
    Array.isArray(v.weapons) &&
    Array.isArray(v.growth) &&
    Array.isArray(v.jarsLeft) &&
    (v.killsByEnemy === undefined || isObj(v.killsByEnemy))
  );
}

export function validate(raw: Record<string, unknown>): Profile {
  const def = newProfile();
  const p = conform(def, raw) as Profile;
  p.version = SAVE_VERSION;
  p.farthings = Math.max(0, Math.floor(num(p.farthings)));
  p.day = Math.max(1, Math.floor(num(p.day, 1)));
  // Materials come from the save alone: merging in the starting stock would
  // refill a material every time it ran out.
  p.materials = (isObj(raw.materials) ? { ...raw.materials } : structuredClone(def.materials)) as Profile['materials'];
  for (const k of Object.keys(p.materials)) {
    const v = Math.floor(num(p.materials[k]));
    if (v > 0) p.materials[k] = v;
    else delete p.materials[k];
  }
  p.seeds = (Array.isArray(p.seeds) ? p.seeds : [])
    .filter((s) => isObj(s) && isCrop(s.species) && num(s.count) > 0)
    .map((s) => ({ species: s.species, traits: traitArr(s.traits), count: Math.floor(num(s.count)) }));
  p.produce = (Array.isArray(p.produce) ? p.produce : [])
    .filter((s) => isObj(s) && isCrop(s.species) && num(s.count) > 0)
    .map((s) => ({ species: s.species, traits: traitArr(s.traits), quality: Math.max(1, Math.min(3, Math.floor(num(s.quality, 1)))) as 1 | 2 | 3, count: Math.floor(num(s.count)) }));
  // Plots: rebuild the grid and copy each saved plot's state onto it by id.
  const fresh = makePlots();
  const saved = Array.isArray(p.plots) ? p.plots : [];
  for (const f of fresh) {
    const s = saved.find((x) => isObj(x) && x.id === f.id) as Partial<typeof f> | undefined;
    if (!s) continue;
    f.unlocked = !!s.unlocked;
    f.tilled = !!s.tilled;
    f.watered = !!s.watered;
    if (isObj(s.crop) && isCrop(s.crop.species)) {
      f.crop = {
        species: s.crop.species,
        traits: traitArr(s.crop.traits),
        growth: Math.max(0, num(s.crop.growth)),
        fertilised: !!s.crop.fertilised,
        dryDays: Math.max(0, Math.floor(num(s.crop.dryDays))),
        blessed: !!s.crop.blessed,
        plantedDay: Math.floor(num(s.crop.plantedDay, 1)),
      };
    }
  }
  if (!fresh.some((x) => x.unlocked)) for (let i = 0; i < 6; i++) fresh[i].unlocked = true;
  p.plots = fresh;
  // Older saves locked most classes behind goals; every class is open now.
  p.classes.unlocked = [...CLASS_ORDER];
  if (!CLASS_ORDER.includes(p.classes.selected)) p.classes.selected = 'fieldhand';
  p.tiers.unlocked = Math.max(1, Math.min(3, Math.floor(num(p.tiers.unlocked, 1))));
  p.tiers.selected = Math.max(1, Math.min(p.tiers.unlocked, Math.floor(num(p.tiers.selected, 1))));
  if (!Array.isArray(p.loadout.grafts) || p.loadout.grafts.length !== 5) p.loadout.grafts = [null, null, null, null, null];
  p.loadout.grafts = p.loadout.grafts.map((g) =>
    isObj(g) && isCrop(g.species) && CROPS[g.species].weapon ? { species: g.species, traits: traitArr(g.traits), quality: Math.max(1, Math.min(3, Math.floor(num(g.quality, 1)))) as 1 | 2 | 3 } : null,
  );
  p.equipment.owned = strArr(p.equipment.owned).filter((id) => id in EQUIPMENT);
  for (const slot of Object.keys(p.equipment.equipped) as (keyof Profile['equipment']['equipped'])[]) {
    const id = p.equipment.equipped[slot];
    if (typeof id !== 'string' || !p.equipment.owned.includes(id) || EQUIPMENT[id].slot !== slot) p.equipment.equipped[slot] = null;
  }
  // A damaged run result is dropped rather than half-applied.
  if (!isRunResult(p.pendingRun)) p.pendingRun = null;
  if (!isRunResult(p.lastRun)) p.lastRun = null;
  return p;
}

export function parseSave(raw: string): { profile: Profile; migratedFrom?: number } {
  const env = JSON.parse(raw) as Envelope;
  if (!isObj(env) || env.game !== 'harvesthex' || !isObj(env.data)) throw new Error('not a HARVESTHEX save');
  const version = num(env.version, 1);
  if (version > SAVE_VERSION) throw new Error('save is from a newer version');
  if (version === SAVE_VERSION && env.checksum !== checksum(JSON.stringify(env.data))) throw new Error('checksum mismatch');
  let data = env.data as Record<string, unknown>;
  if (version < SAVE_VERSION) data = migrate(data, version);
  return { profile: validate(data), migratedFrom: version < SAVE_VERSION ? version : undefined };
}

export function loadProfile(storage: Storage = localStorage): LoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return { ok: false, reason: 'empty' };
  }
  if (!raw) return { ok: false, reason: 'empty' };
  try {
    const r = parseSave(raw);
    return { ok: true, profile: r.profile, migratedFrom: r.migratedFrom };
  } catch {
    try {
      const bak = storage.getItem(BACKUP);
      if (bak) {
        const r = parseSave(bak);
        return { ok: true, profile: r.profile, usedBackup: true };
      }
    } catch {
      /* fall through */
    }
    return { ok: false, reason: 'corrupt', raw };
  }
}

export function saveProfile(p: Profile, storage: Storage = localStorage): boolean {
  p.updatedAt = Date.now();
  try {
    const prev = storage.getItem(KEY);
    if (prev) {
      try {
        parseSave(prev);
        storage.setItem(BACKUP, prev);
      } catch {
        /* never back up a broken save over a good one */
      }
    }
    storage.setItem(KEY, envelope(p));
    return true;
  } catch {
    return false;
  }
}

export function hasSave(storage: Storage = localStorage): boolean {
  try {
    return !!storage.getItem(KEY);
  } catch {
    return false;
  }
}

export function deleteSave(storage: Storage = localStorage) {
  try {
    const cur = storage.getItem(KEY);
    if (cur) storage.setItem(BACKUP, cur);
    storage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function exportSave(p: Profile): Blob {
  return new Blob([envelope(p)], { type: 'application/json' });
}
