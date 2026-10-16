import { describe, expect, it } from 'vitest';
import { newProfile, addProduce, addSeeds } from '../../src/meta/profile';
import { till, plant, water, harvest, growFarm, plotStage, mutateCrop, crossbreed, compostProduce, preserve, fertilise, qualityOf, GROWTH_SHARE } from '../../src/farm/farm';
import { Rng } from '../../src/core/rng';
import { CROPS } from '../../src/data/crops';
import { envelope, parseSave, loadProfile, saveProfile, migrate, validate } from '../../src/meta/save';
import { buildResult, applyResult, checkUnlocks, type RunResult } from '../../src/meta/results';
import { CLASS_ORDER } from '../../src/data/classes';
import { World } from '../../src/sim/world';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe('farming', () => {
  it('tills, plants, waters, grows and harvests', () => {
    const p = newProfile();
    const plot = p.plots[3];
    expect(plot.unlocked).toBe(true);
    expect(plant(p, plot, 0).ok).toBe(false);
    expect(till(p, plot).ok).toBe(true);
    const seedsBefore = p.seeds[0].count;
    expect(plant(p, plot, 0).ok).toBe(true);
    expect(p.seeds[0].count).toBe(seedsBefore - 1);
    expect(water(p, plot).ok).toBe(true);
    expect(plotStage(plot)).toBe(0);
    const need = (CROPS.pea.stageSap * 3) / GROWTH_SHARE;
    growFarm(p, need + 1, 1);
    expect(plotStage(plot)).toBe(3);
    expect(p.day).toBe(2);
    const r = harvest(p, plot, new Rng(1));
    expect(r).not.toBeNull();
    expect(p.produce.some((x) => x.species === 'pea')).toBe(true);
    expect(plot.crop).toBeNull();
    // Seeds come back from the harvest.
    expect(p.seeds.find((s) => s.species === 'pea')!.count).toBeGreaterThanOrEqual(seedsBefore);
  });

  it('watered beds grow far more than dry ones, and quality rewards care', () => {
    const p = newProfile();
    const [a, b] = [p.plots[0], p.plots[1]];
    plant(p, a, 0);
    plant(p, b, 0);
    water(p, a);
    growFarm(p, 300, 1);
    expect(a.crop!.growth).toBeGreaterThan(b.crop!.growth * 2);
    expect(b.crop!.dryDays).toBe(1);
    p.fertiliser = 1;
    expect(fertilise(p, a).ok).toBe(true);
    expect(qualityOf(a)).toBe(3);
    expect(qualityOf(b)).toBe(1);
  });

  it('the repaired pump waters everything each morning', () => {
    const p = newProfile();
    p.buildings.pump = 1;
    plant(p, p.plots[0], 0);
    growFarm(p, 10, 1);
    expect(p.plots[0].watered).toBe(true);
  });

  it('mutates growing crops with reagents', () => {
    const p = newProfile();
    p.buildings.bench = 1;
    plant(p, p.plots[0], 0);
    p.materials.void_shard = 3;
    const rng = new Rng(5);
    const r = mutateCrop(p, p.plots[0], 'void_shard', rng);
    expect(r.ok).toBe(true);
    expect(p.plots[0].crop!.traits.length).toBe(1);
    expect(['echoing', 'wild']).toContain(p.plots[0].crop!.traits[0]);
    expect(p.materials.void_shard).toBe(2);
  });

  it('crossbreeds a named hybrid and an unnamed gene cross', () => {
    const p = newProfile();
    p.buildings.bench = 1;
    p.materials.root_pollen = 2;
    addProduce(p, 'carrot', [], 1, 1);
    addProduce(p, 'chilli', [], 1, 1);
    const r = crossbreed(p, { species: 'carrot', traits: [], quality: 1 }, { species: 'chilli', traits: [], quality: 1 }, new Rng(1));
    expect(r.ok && r.result?.species).toBe('emberroot');
    expect(p.seeds.some((s) => s.species === 'emberroot')).toBe(true);
    addProduce(p, 'turnip', [], 1, 1);
    addProduce(p, 'tomato', [], 1, 1);
    const r2 = crossbreed(p, { species: 'turnip', traits: [], quality: 1 }, { species: 'tomato', traits: [], quality: 1 }, new Rng(1));
    expect(r2.ok && r2.result?.species).toBe('turnip');
    expect(r2.ok && r2.result?.traits).toContain('venomous');
    expect(p.materials.root_pollen).toBe(0);
  });

  it('composts and preserves', () => {
    const p = newProfile();
    p.buildings.compost = 1;
    addProduce(p, 'pea', [], 3, 1);
    expect(compostProduce(p, 'pea', [], 3).ok).toBe(true);
    expect(p.fertiliser).toBe(1);
    addProduce(p, 'chilli', [], 1, 1);
    expect(preserve(p, 'chilli_jam', [{ species: 'chilli', traits: [], quality: 1 }]).ok).toBe(true);
    expect(p.jars.chilli_jam).toBe(1);
  });

  it('saved seeds keep traits most of the time', () => {
    let kept = 0;
    for (let i = 0; i < 40; i++) {
      const p = newProfile();
      p.seeds = [];
      addSeeds(p, 'turnip', ['giant'], 1);
      plant(p, p.plots[0], 0);
      growFarm(p, 99999, 1);
      harvest(p, p.plots[0], new Rng(i));
      if (p.seeds.some((s) => s.species === 'turnip' && s.traits.includes('giant'))) kept++;
    }
    expect(kept).toBeGreaterThan(25);
  });
});

describe('saving', () => {
  it('round-trips a profile', () => {
    const p = newProfile();
    p.farthings = 123;
    plant(p, p.plots[0], 0);
    const back = parseSave(envelope(p)).profile;
    expect(back.farthings).toBe(123);
    expect(back.plots[0].crop?.species).toBe('pea');
  });

  it('detects tampering and falls back to the backup', () => {
    const store = new MemStorage();
    const p = newProfile();
    p.farthings = 10;
    saveProfile(p, store);
    p.farthings = 20;
    saveProfile(p, store);
    // Corrupt the primary.
    store.setItem('harvesthex.save', store.getItem('harvesthex.save')!.replace('"farthings":20', '"farthings":99999'));
    const r = loadProfile(store);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.usedBackup).toBe(true);
      expect(r.profile.farthings).toBe(10);
    }
  });

  it('reports a save that cannot be read at all', () => {
    const store = new MemStorage();
    store.setItem('harvesthex.save', '{not json');
    const r = loadProfile(store);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('corrupt');
  });

  it('migrates an old version', () => {
    const p = newProfile() as unknown as Record<string, unknown>;
    delete p.heldTiers;
    delete p.blessing;
    delete p.grewLast;
    const out = migrate(p, 1);
    expect(out.version).toBe(3);
    const v = validate(out);
    expect(v.heldTiers.fieldhand).toBe(0);
    expect(v.blessing).toBe(0);
  });

  it('validates and repairs nonsense fields', () => {
    const v = validate({ farthings: -50, day: 'banana', seeds: [{ species: 'pea', count: 'x' }, { species: 'carrot', count: 2, traits: ['giant', 7] }], plots: 'nope', materials: { wood: 3, bad: -1 } } as unknown as Record<string, unknown>);
    expect(v.farthings).toBe(0);
    expect(v.day).toBe(1);
    expect(v.seeds).toEqual([{ species: 'carrot', traits: ['giant'], count: 2 }]);
    expect(v.plots).toHaveLength(36);
    expect(v.materials).toEqual({ wood: 3 });
  });
});

describe('expedition results', () => {
  const mk = () =>
    new World({ classId: 'fieldhand', region: 'meadow', tier: 1, seed: 3, grafts: [], consumables: [{ id: 'jam', count: 2 }], equipment: {}, heldTier: 0, perks: [] }, { autoAim: true, autoFire: true, damageNumbers: 'off', intensity: 'standard' });

  it('defeat keeps every seed and growth, and part of the rest', () => {
    const w = mk();
    w.run.loot.materials = { wood: 10, bone: 3 };
    w.run.loot.farthings = 50;
    w.run.loot.seeds = [{ species: 'sunflower', traits: [] }];
    w.run.sapCollected = 600;
    w.onPlayerDeath('test');
    const p = newProfile();
    plant(p, p.plots[0], 0);
    water(p, p.plots[0]);
    const r = applyResult(p, buildResult(w));
    expect(r.outcome).toBe('defeat');
    expect(p.materials.wood).toBe(4 + 6);
    expect(p.farthings).toBe(20 + 30);
    expect(p.seeds.some((s) => s.species === 'sunflower')).toBe(true);
    expect(p.plots[0].crop!.growth).toBeCloseTo(600 * GROWTH_SHARE, 3);
    expect(p.jars.jam).toBe(4);
  });

  it('opens all twelve classes from the first day, including for old saves', () => {
    const p = newProfile();
    expect(p.classes.unlocked).toEqual(CLASS_ORDER);
    expect(CLASS_ORDER).toHaveLength(12);
    const old = { ...newProfile(), classes: { unlocked: ['fieldhand'], selected: 'reaper' } };
    const back = validate(JSON.parse(JSON.stringify(old)));
    expect(back.classes.unlocked).toEqual(CLASS_ORDER);
    expect(back.classes.selected).toBe('reaper');
  });

  it('a first victory raises the rot tier', () => {
    const p = newProfile();
    const u = checkUnlocks(p, { outcome: 'victory', tier: 1 } as RunResult);
    expect(p.tiers.unlocked).toBe(2);
    expect(u.length).toBeGreaterThan(0);
  });
});

describe('run recovery', () => {
  const mk = () =>
    new World({ classId: 'fieldhand', region: 'meadow', tier: 1, seed: 8, grafts: [], consumables: [{ id: 'jam', count: 1 }], equipment: {}, heldTier: 0, perks: [] }, { autoAim: true, autoFire: true, damageNumbers: 'off', intensity: 'standard' });

  it('a mid-fight checkpoint banks like a defeat; a lull checkpoint banks everything', async () => {
    const { checkpointResult } = await import('../../src/meta/results');
    const w = mk();
    w.run.loot.materials = { wood: 10 };
    w.run.loot.seeds = [{ species: 'pumpkin', traits: [] }];
    const mid = checkpointResult(w, false);
    const safe = checkpointResult(w, true);
    expect(mid.materials.wood).toBe(6);
    expect(safe.materials.wood).toBe(10);
    expect(mid.seeds).toHaveLength(1);
    expect(w.phase).toBe('acre');
    // Banking a checkpoint survives a save round-trip and clears it.
    const p = newProfile();
    p.pendingRun = mid;
    const back = parseSave(envelope(p)).profile;
    expect(back.pendingRun?.recovered).toBe(true);
    applyResult(back, back.pendingRun!);
    expect(back.pendingRun).toBeNull();
    expect(back.materials.wood).toBe(4 + 6);
    expect(back.stats.runs).toBe(1);
  });
});
