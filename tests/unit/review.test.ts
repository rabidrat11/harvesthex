// Regression tests for bugs found in the October 2026 code review.

import { describe, expect, it } from 'vitest';
import { World } from '../../src/sim/world';
import { explode, hitEnemy } from '../../src/sim/combat';
import { spawnBullet } from '../../src/sim/patterns';
import { buySlot, makeShop, rerollShop, offerValid } from '../../src/sim/upgrades';
import { Rng } from '../../src/core/rng';
import { MAX_WEAPON_LEVEL } from '../../src/data/weapons';
import { newProfile, addProduce, pruneGrafts } from '../../src/meta/profile';
import { validate } from '../../src/meta/save';
import { plant, till } from '../../src/farm/farm';
import { keyLabel, loadSettings } from '../../src/meta/settings';
import type { Loadout } from '../../src/sim/run';

const SETTINGS = { autoAim: false, autoFire: false, damageNumbers: 'off' as const, intensity: 'standard' as const };

function fresh(classId = 'fieldhand', grafts: Loadout['grafts'] = []): World {
  const lo: Loadout = { classId, region: 'meadow', tier: 1, seed: 5, grafts, consumables: [], equipment: {}, heldTier: 0, perks: [] };
  const w = new World(lo, SETTINGS);
  w.noSpawns = true;
  w.godMode = true;
  w.step(1 / 60);
  return w;
}

describe('combat', () => {
  it('an area hit reaches everything in it, even when a hit sets off another blast', () => {
    const w = fresh();
    const cx = w.player.x + 120;
    const cy = w.player.y;
    // A wide ring: each detonation (radius 34) is too small to reach a neighbour,
    // so every enemy must be reached by the outer blast itself.
    const ring = Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 8;
      const e = w.spawnEnemy('mudling', cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, { instant: true })!;
      e.maxHp = e.hp = 1e6;
      e.poisonT = 3;
      e.poisonDps = 5;
      return e;
    });
    w.step(1 / 60);
    // Fire on poison detonates it: each hit sets off a nested explosion.
    explode(w, cx, cy, 75, 1, { type: 'elemental', status: [{ id: 'burn', power: 4, duration: 2 }], visual: 'none' });
    expect(ring.filter((e) => e.detonated)).toHaveLength(8);
  });

  it('mites never breed more mites', () => {
    const w = fresh('fieldhand', [{ weapon: 'carrot_lance', traits: ['infested'], quality: 1, species: 'carrot' }]);
    const wi = w.run.weapons.find((x) => x.hasTrait('infested'))!;
    for (let i = 0; i < 60; i++) {
      const e = w.spawnEnemy('mudling', w.player.x + 100, w.player.y, { instant: true })!;
      hitEnemy(w, e, 1e6, { weapon: wi, type: 'nature', source: 'summon', mite: true });
    }
    expect(w.summons.items.filter((s) => s.active && s.kind === 'mite')).toHaveLength(0);
  });

  it('a second Compost Heart heals twice as much, as often', () => {
    const healFrom = (hearts: number) => {
      const w = fresh();
      for (let i = 0; i < hearts; i++) w.run.addItem('compost_heart');
      w.player.hp = 10;
      w.statusDamageAcc = 150;
      w.step(1 / 60);
      return w.player.hp - 10;
    };
    expect(healFrom(1)).toBeCloseTo(3, 5);
    expect(healFrom(2)).toBeCloseTo(6, 5);
  });
});

describe('the simulation', () => {
  it('pulled-in loot reaches you, however fast it flies', () => {
    const w = fresh();
    const k = w.dropPickup('sap', w.player.x + 100, w.player.y, 5)!;
    k.age = 40;
    k.magnet = true;
    for (let i = 0; i < 120 && k.active; i++) w.step(1 / 60);
    expect(k.active).toBe(false);
  });

  it('one press drinks one jar, even at a low frame rate', () => {
    const lo: Loadout = { classId: 'fieldhand', region: 'meadow', tier: 1, seed: 5, grafts: [], consumables: [{ id: 'jam', count: 3 }], equipment: {}, heldTier: 0, perks: [] };
    const w = new World(lo, SETTINGS);
    w.noSpawns = true;
    w.player.hp = 10;
    w.input.consumable = true;
    w.step(0.05);
    expect(w.run.consumables[0].count).toBe(2);
  });

  it('a petal ward is spent by a bullet that would hurt, and only then', () => {
    const w = fresh();
    w.godMode = false;
    w.petalShields = 2;
    w.player.iframes = 1;
    const b = spawnBullet(w, w.player.x, w.player.y - 4, 0, { sprite: 'b_round', radius: 3, damage: 10, speed: 0 }, 1)!;
    w.step(1 / 60);
    expect(b.active).toBe(true);
    expect(w.petalShields).toBe(2);
  });

  it('a Bramble Knight keeps attacking from beyond its shield bash', () => {
    const w = fresh();
    w.godMode = true;
    const e = w.spawnEnemy('knight', w.player.x + 200, w.player.y, { instant: true })!;
    e.maxHp = e.hp = 1e9;
    let attacks = 0;
    let last = e.attackIndex;
    for (let t = 0; t < 30; t += 1 / 60) {
      e.x = w.player.x + 200;
      e.y = w.player.y;
      w.step(1 / 60);
      if (e.attackIndex !== last) attacks++;
      last = e.attackIndex;
    }
    expect(attacks).toBeGreaterThan(2);
  });

  it('the director reads damage per second the same at any frame rate', () => {
    const dps = (hz: number) => {
      const w = fresh();
      for (let t = 0; t < 10; t += 1 / hz) {
        w.stats.damageDealt += 100 / hz;
        w.step(1 / hz);
      }
      return w.recentDps();
    };
    expect(dps(144)).toBeCloseTo(dps(60), 0);
    expect(dps(60)).toBeGreaterThan(90);
  });
});

describe('weapons and traits', () => {
  it('Hollow on a sweep swings once more rather than doing nothing', () => {
    const w = fresh();
    const plain = w.run.addWeapon('thorn_whip')!;
    const hollow = w.run.addWeapon('thorn_whip', ['hollow'])!;
    expect(hollow.params.burst).toBe(plain.params.burst + 1);
  });

  it("a Wild weapon's trait counts from the very start", () => {
    const w = fresh('fieldhand', [{ weapon: 'carrot_lance', traits: ['wild'], quality: 1, species: 'carrot' }]);
    const wi = w.run.weapons.find((x) => x.hasTrait('wild'))!;
    expect(wi.wildTrait).toBeTruthy();
    const params = { ...wi.params };
    wi.recompute(w.run);
    expect(wi.params).toEqual(params);
  });
});

describe('the shop', () => {
  it('never offers the same weapon twice, locked slots and rerolls included', () => {
    const w = fresh();
    const rng = new Rng(3);
    w.run.sap = 1e9;
    for (let n = 0; n < 300; n++) {
      const shop = makeShop(w, rng);
      shop.slots[0].locked = true;
      for (let r = 0; r < 4; r++) {
        rerollShop(w, rng, shop);
        const keys = shop.slots.map((s) => (s.offer.kind === 'weaponUp' ? s.offer.weapon.def.id : 'id' in s.offer ? s.offer.id : ''));
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it('will not sell a weapon you already have, or an upgrade past the top level', () => {
    const w = fresh();
    w.run.sap = 1000;
    const owned = w.run.weapons[0];
    const dup = { offer: { kind: 'weaponNew' as const, id: owned.def.id, rarity: owned.def.rarity }, price: 10, locked: false, sold: false };
    expect(offerValid(w, dup.offer)).toBe(false);
    expect(buySlot(w, dup)).toBe(false);
    owned.level = MAX_WEAPON_LEVEL;
    const up = { offer: { kind: 'weaponUp' as const, weapon: owned, desc: '' }, price: 10, locked: false, sold: false };
    expect(buySlot(w, up)).toBe(false);
    expect(w.run.sap).toBe(1000);
  });
});

describe('the farm and saves', () => {
  it('a graft whose produce is gone comes off the satchel, and nothing else is taken', () => {
    const p = newProfile();
    p.produce = [];
    addProduce(p, 'pea', [], 1, 1);
    addProduce(p, 'carrot', [], 1, 1);
    p.loadout.grafts = [
      { species: 'pea', traits: [], quality: 1 },
      { species: 'carrot', traits: [], quality: 1 },
      { species: 'carrot', traits: [], quality: 1 },
      null,
      null,
    ];
    expect(pruneGrafts(p)).toEqual(['carrot']);
    expect(p.loadout.grafts.filter(Boolean)).toHaveLength(2);
    expect(p.produce.reduce((n, s) => n + s.count, 0)).toBe(2);
  });

  it('running out of a material does not refill it on reload', () => {
    const p = newProfile();
    p.materials = {};
    const once = validate(JSON.parse(JSON.stringify(p)));
    const twice = validate(JSON.parse(JSON.stringify(once)));
    expect(twice.materials).toEqual({});
  });

  it('a damaged expedition record is dropped, not half-applied', () => {
    const p = newProfile();
    const raw = JSON.parse(JSON.stringify(p));
    raw.pendingRun = { outcome: 'defeat', farthings: 'lots' };
    raw.loadout.grafts = [true, { species: 'nonsense' }, null, null, null];
    const v = validate(raw);
    expect(v.pendingRun).toBeNull();
    expect(v.loadout.grafts).toEqual([null, null, null, null, null]);
  });

  it('the mended pump waters what you plant', () => {
    const p = newProfile();
    p.buildings.pump = 1;
    const plot = p.plots.find((x) => x.unlocked)!;
    till(p, plot);
    plot.watered = false;
    expect(plant(p, plot, 0).ok).toBe(true);
    expect(plot.watered).toBe(true);
  });
});

describe('settings', () => {
  it('an action is never left without a key', () => {
    expect(keyLabel(undefined)).toBe('?');
    const store = new Map<string, string>([['harvesthex.settings', JSON.stringify({ keys: { interact: [] } })]]);
    const g = globalThis as unknown as { localStorage: unknown };
    const before = g.localStorage;
    g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: () => {} };
    try {
      expect(loadSettings().keys.interact.length).toBeGreaterThan(0);
    } finally {
      g.localStorage = before;
    }
  });
});
