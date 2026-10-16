import { describe, expect, it } from 'vitest';
import { World } from '../../src/sim/world';
import { Bot, simulate } from '../../src/sim/bot';
import type { Loadout } from '../../src/sim/run';
import { hitEnemy, applyStatus, damagePlayer, ENEMY_DAMAGE } from '../../src/sim/combat';
import { WEAPONS, EVOLUTIONS, SHOP_WEAPONS } from '../../src/data/weapons';
import { rollLevelUp, applyOffer, makeShop, buySlot, rerollShop, STAT_CARDS } from '../../src/sim/upgrades';
import { Rng } from '../../src/core/rng';
import { xpToNext } from '../../src/sim/run';

const SETTINGS = { autoAim: true, autoFire: true, damageNumbers: 'off' as const, intensity: 'standard' as const };

function loadout(over: Partial<Loadout> = {}): Loadout {
  return { classId: 'fieldhand', region: 'meadow', tier: 1, seed: 4242, grafts: [], consumables: [{ id: 'jam', count: 2 }], equipment: {}, heldTier: 0, perks: [], ...over };
}

function fingerprint(w: World) {
  let h = 0;
  for (const e of w.enemies.items) if (e.active) h = (h * 31 + Math.round(e.x * 10) + Math.round(e.y * 10) * 7 + Math.round(e.hp)) | 0;
  return { h, kills: w.stats.kills, sap: Math.round(w.run.sap * 100), px: Math.round(w.player.x * 100), py: Math.round(w.player.y * 100), level: w.run.level };
}

/** A world with spawning off and a crowd of dummies in front of the player. */
function arena(cls = 'fieldhand') {
  const w = new World(loadout({ classId: cls }), SETTINGS);
  w.noSpawns = true;
  w.godMode = true;
  for (const e of w.enemies.items) if (e.active) w.enemies.release(e);
  return w;
}

function crowd(w: World, id = 'mudling', n = 12, hpMult = 50) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = w.spawnEnemy(id, w.player.x + 40 + (i % 4) * 14, w.player.y - 30 + Math.floor(i / 4) * 14, { instant: true })!;
    e.maxHp *= hpMult;
    e.hp = e.maxHp;
    e.speed = 0;
    out.push(e);
  }
  return out;
}

function run(w: World, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    w.input.aimX = w.player.x + 60;
    w.input.aimY = w.player.y - 10;
    w.step(1 / 60);
    w.fxQueue.length = 0;
    w.events.length = 0;
  }
}

describe('simulation', () => {
  it('is deterministic for a seed and input stream', () => {
    const a = new World(loadout(), SETTINGS);
    const b = new World(loadout(), SETTINGS);
    const ba = new Bot(a, { skill: 0.6, shop: true });
    const bb = new Bot(b, { skill: 0.6, shop: true });
    for (let i = 0; i < 60 * 45; i++) {
      ba.think(1 / 60);
      bb.think(1 / 60);
      a.step(1 / 60);
      b.step(1 / 60);
      a.fxQueue.length = 0;
      b.fxQueue.length = 0;
      ba.handleEvents();
      bb.handleEvents();
    }
    expect(fingerprint(a)).toEqual(fingerprint(b));
    expect(a.stats.kills).toBeGreaterThan(10);
  });

  it('plays a whole expedition headlessly to a conclusion', () => {
    const w = new World(loadout({ seed: 99 }), SETTINGS);
    const r = simulate(w, new Bot(w, { skill: 0.6, shop: true }), 1500);
    expect(['victory', 'defeat']).toContain(r.outcome);
    expect(r.kills).toBeGreaterThan(200);
    expect(r.level).toBeGreaterThan(8);
    // No entity should ever end up at an invalid position.
    for (const e of w.enemies.items) if (e.active) expect(Number.isFinite(e.x + e.y)).toBe(true);
  }, 60000);

  it('reaches a lull, sells at Mags and moves to the next acre', () => {
    const w = new World(loadout({ seed: 7 }), SETTINGS);
    w.godMode = true;
    const bot = new Bot(w, { skill: 0.5, shop: false });
    let sawLull = false;
    for (let i = 0; i < 60 * 200 && w.director.index === 0; i++) {
      bot.think(1 / 60);
      w.step(1 / 60);
      w.fxQueue.length = 0;
      if (w.phase === 'lull' && !sawLull) {
        sawLull = true;
        expect(w.props.some((p) => p.kind === 'cart')).toBe(true);
        expect(w.props.some((p) => p.kind === 'exit')).toBe(true);
        expect(w.enemies.count).toBe(0);
        const shop = makeShop(w, new Rng(1));
        expect(shop.slots).toHaveLength(4);
        w.run.sap = 5000;
        expect(buySlot(w, shop.slots[0])).toBe(true);
        expect(shop.slots[0].sold).toBe(true);
        shop.slots[1].locked = true;
        const locked = shop.slots[1].offer;
        expect(rerollShop(w, new Rng(2), shop)).toBe(true);
        expect(shop.slots[1].offer).toBe(locked);
        w.pressOn();
      }
      bot.handleEvents();
    }
    expect(sawLull).toBe(true);
    expect(w.director.index).toBe(1);
  });

  it('only allows extraction during a lull', () => {
    const w = new World(loadout(), SETTINGS);
    w.extract();
    expect(w.phase).toBe('acre');
  });

  it('raises the boss after the last acre and wins when it dies', () => {
    const w = new World(loadout(), SETTINGS);
    w.godMode = true;
    w.director.index = w.director.region.acres.length - 1;
    w.director.t = 9999;
    w.step(1 / 60);
    expect(w.phase).toBe('lull');
    w.pressOn();
    for (let i = 0; i < 60 * 3; i++) w.step(1 / 60);
    expect(w.phase).toBe('boss');
    expect(w.boss?.def.id).toBe('marrow_king');
    expect(w.arenaOn).toBe(true);
    // Skip the intro and hit it past half health: phase two begins.
    for (let i = 0; i < 60 * 3.2; i++) w.step(1 / 60);
    hitEnemy(w, w.boss!, w.boss!.maxHp * 0.55, { type: 'physical', canCrit: false });
    for (let i = 0; i < 10; i++) w.step(1 / 60);
    expect(w.boss!.phase).toBe(1);
    for (let i = 0; i < 60 * 3; i++) w.step(1 / 60);
    hitEnemy(w, w.boss!, w.boss!.maxHp, { type: 'physical', canCrit: false });
    for (let i = 0; i < 60 * 7; i++) w.step(1 / 60);
    expect(w.phase).toBe('victory');
    expect(w.run.loot.seeds.some((s) => s.species === 'kingsmarrow')).toBe(true);
  });
});

describe('the Thousand-Eyed Scarecrow', () => {
  it('replaces the elite when woken, shields itself with eyes, and pays out', () => {
    const w = new World(loadout({ seed: 55 }), SETTINGS);
    w.godMode = true;
    w.run.flags.watcher = true;
    w.director.index = 2;
    w.director.t = 61.9;
    w.director.fired.add(0);
    for (let i = 0; i < 30; i++) w.step(1 / 60);
    const e = w.elite!;
    expect(e.def.id).toBe('eyes');
    // Let its spawn telegraph finish.
    for (let i = 0; i < 45; i++) w.step(1 / 60);
    // Below half health: four eyes tear free.
    hitEnemy(w, e, e.maxHp * 0.55, { type: 'physical', canCrit: false });
    for (let i = 0; i < 5; i++) w.step(1 / 60);
    const orbs = w.enemies.items.filter((x) => x.active && x.def.id === 'eye_orb');
    expect(orbs).toHaveLength(4);
    // While they watch, it barely feels a thing.
    const h0 = e.hp;
    hitEnemy(w, e, 100, { type: 'physical', canCrit: false });
    expect(h0 - e.hp).toBeCloseTo(30, 0);
    for (const o of orbs) hitEnemy(w, o, 99999, { type: 'physical', canCrit: false });
    const h1 = e.hp;
    hitEnemy(w, e, 100, { type: 'physical', canCrit: false });
    expect(h1 - e.hp).toBeCloseTo(100, 0);
    hitEnemy(w, e, 999999, { type: 'physical', canCrit: false });
    expect(e.active).toBe(false);
    const drops = w.pickups.items.filter((p) => p.active);
    expect(drops.some((p) => p.kind === 'chest')).toBe(true);
    expect(drops.some((p) => p.kind === 'material' && p.id === 'eye')).toBe(true);
  });
});

describe('combat', () => {
  it('damages, knocks back and kills, dropping sap', () => {
    const w = arena();
    const [e] = crowd(w, 'nibbler', 1, 1);
    const x0 = e.x;
    hitEnemy(w, e, 3, { type: 'physical', kb: 80, fromX: e.x - 10, fromY: e.y, canCrit: false });
    expect(e.hp).toBeLessThan(e.maxHp);
    w.step(1 / 60);
    expect(e.x).toBeGreaterThan(x0);
    hitEnemy(w, e, 999, { type: 'physical', canCrit: false });
    expect(e.active).toBe(false);
    expect(w.pickups.items.some((p) => p.active && p.kind === 'sap')).toBe(true);
  });

  it('applies armour to damage taken', () => {
    const w = arena();
    w.godMode = false;
    w.run.upgradeMods = { armour: 15 };
    w.run.recompute();
    w.player.iframes = 0;
    const before = w.player.hp;
    // 15 armour halves incoming damage (after the global enemy damage scale).
    const expected = Math.round(20 * ENEMY_DAMAGE * 0.5);
    damagePlayer(w, 20, w.player.x + 10, w.player.y, 'test');
    expect(before - w.player.hp).toBe(expected);
    // Invulnerability frames follow a hit.
    damagePlayer(w, 20, w.player.x + 10, w.player.y, 'test');
    expect(before - w.player.hp).toBe(expected);
  });

  it('detonates poison with fire, once', () => {
    const w = arena();
    const es = crowd(w, 'mudling', 3, 1);
    w.step(1 / 60);
    const [a] = es;
    applyStatus(w, a, { id: 'poison', power: 10, duration: 4 }, null);
    expect(a.poisonDps).toBeGreaterThan(0);
    const hpBefore = es[1].hp;
    applyStatus(w, a, { id: 'burn', power: 4, duration: 2 }, null);
    expect(a.poisonDps).toBe(0);
    expect(a.detonated).toBe(true);
    expect(es[1].hp).toBeLessThan(hpBefore);
  });

  it('freezes after enough chill and shatters on a physical blow', () => {
    const w = arena();
    const [e] = crowd(w, 'mudling', 1, 10);
    for (let i = 0; i < 5; i++) applyStatus(w, e, { id: 'chill', power: 0.3, duration: 2 }, null);
    expect(e.frozenT).toBeGreaterThan(0);
    const hp = e.hp;
    hitEnemy(w, e, 30, { type: 'physical', canCrit: false });
    expect(e.frozenT).toBe(0);
    expect(hp - e.hp).toBeGreaterThan(30);
  });

  it('the bramble knight shield blocks damage from the front', () => {
    const w = arena();
    const k = w.spawnEnemy('knight', w.player.x + 60, w.player.y, { instant: true })!;
    k.angle = Math.PI; // facing the player (to its left)
    k.guard = true;
    const h0 = k.hp;
    hitEnemy(w, k, 100, { type: 'physical', canCrit: false, fromX: k.x - 30, fromY: k.y });
    const front = h0 - k.hp;
    const h1 = k.hp;
    hitEnemy(w, k, 100, { type: 'physical', canCrit: false, fromX: k.x + 30, fromY: k.y });
    const back = h1 - k.hp;
    expect(front).toBeLessThan(back * 0.5);
  });
});

describe('weapons', () => {
  const all = Object.values(WEAPONS).filter((d) => !d.heldBy);
  for (const def of all) {
    it(`${def.name} deals damage (${def.behaviour})`, () => {
      const w = arena();
      w.run.weapons = [];
      const wi = w.run.addWeapon(def.id, [], 3)!;
      if (def.behaviour === 'briar') {
        // Briars grow behind you: put the crowd there.
        for (let i = 0; i < 6; i++) {
          const e = w.spawnEnemy('mudling', w.player.x - 15 + i * 6, w.player.y - 20, { instant: true })!;
          e.speed = 0;
        }
      } else crowd(w);
      run(w, 6);
      expect(wi.damageDealt).toBeGreaterThan(0);
    });
  }

  for (const id of ['seed_sling', 'spore_puffer', 'old_scythe']) {
    it(`held ${id} works when firing`, () => {
      const cls = WEAPONS[id].heldBy!;
      const w = arena(cls);
      w.run.weapons = [];
      crowd(w);
      w.input.fire = true;
      for (let t = 0; t < 4; t += 1 / 60) {
        w.input.fire = true;
        w.input.aimX = w.player.x + 50;
        w.input.aimY = w.player.y - 10;
        w.step(1 / 60);
        w.fxQueue.length = 0;
      }
      expect(w.run.held.damageDealt).toBeGreaterThan(0);
    });
  }

  it('levels change behaviour, not just numbers', () => {
    const w = arena();
    const pea = w.run.weapons[0];
    pea.level = 1;
    w.run.recompute();
    const b1 = pea.params.burst;
    pea.level = 2;
    w.run.recompute();
    expect(pea.params.burst).toBe(b1 + 1);
  });

  it('every evolution is offered once its conditions are met', () => {
    for (const evo of EVOLUTIONS) {
      const w = arena();
      w.run.weapons = [];
      const wi = w.run.addWeapon(evo.from, evo.needs.trait ? [evo.needs.trait] : [], 5)!;
      expect(wi.evolution(w.run)?.into).toBe(evo.into);
      w.run.pendingLevels = 1;
      const offers = rollLevelUp(w, new Rng(3), 3);
      const o = offers.find((x) => x.kind === 'evolve');
      expect(o).toBeTruthy();
      applyOffer(w, o!);
      expect(wi.def.id).toBe(evo.into);
    }
  });

  it('an item tag can stand in for a grown trait', () => {
    const w = arena();
    w.run.weapons = [];
    const wi = w.run.addWeapon('pea_repeater', [], 5)!;
    expect(wi.evolution(w.run)).toBeNull();
    w.run.addItem('pocketwatch');
    expect(wi.evolution(w.run)?.into).toBe('endless_peastorm');
  });
});

describe('upgrades', () => {
  it('never offers stats the build cannot use', () => {
    const w = arena();
    const summonCard = STAT_CARDS.find((c) => c.id === 'hive_mind')!;
    expect(summonCard.relevant!(w.run)).toBe(false);
    for (let i = 0; i < 40; i++) {
      const offers = rollLevelUp(w, new Rng(i), 3);
      expect(offers.some((o) => o.kind === 'stat' && o.card.id === 'hive_mind')).toBe(false);
    }
  });

  it('early levels always show a new weapon', () => {
    const w = arena();
    for (let i = 0; i < 20; i++) {
      const offers = rollLevelUp(w, new Rng(100 + i), 3);
      expect(offers.some((o) => o.kind === 'weaponNew')).toBe(true);
    }
  });

  it('shop weapons are all real cultivars', () => {
    for (const id of SHOP_WEAPONS) expect(WEAPONS[id].heldBy).toBeUndefined();
  });

  it('xp curve grows steadily', () => {
    expect(xpToNext(1)).toBeLessThan(xpToNext(10));
  });
});

describe('classes', () => {
  it('each class has its own held weapon, starter and stats', () => {
    const ids = ['fieldhand', 'botanist', 'reaper'];
    const worlds = ids.map((c) => new World(loadout({ classId: c }), SETTINGS));
    const helds = new Set(worlds.map((w) => w.run.held.def.id));
    const starters = new Set(worlds.map((w) => w.run.weapons[0].def.id));
    const hp = new Set(worlds.map((w) => w.run.stats.maxHp));
    expect(helds.size).toBe(3);
    expect(starters.size).toBe(3);
    expect(hp.size).toBe(3);
  });

  it('grafted produce starts as a levelled, mutated weapon', () => {
    const w = new World(loadout({ grafts: [{ species: 'turnip', weapon: 'turnip_cannon', traits: ['volatile'], quality: 3 }] }), SETTINGS);
    const wi = w.run.weapons.find((x) => x.def.id === 'turnip_cannon')!;
    expect(wi.level).toBe(3);
    expect(wi.hasTrait('volatile')).toBe(true);
  });
});
