import { describe, expect, it } from 'vitest';
import { World } from '../../src/sim/world';
import { Bot } from '../../src/sim/bot';
import { CLASSES, CLASS_ORDER } from '../../src/data/classes';
import { damagePlayer, hitEnemy } from '../../src/sim/combat';
import type { Loadout } from '../../src/sim/run';

const SETTINGS = { autoAim: true, autoFire: true, damageNumbers: 'off' as const, intensity: 'standard' as const };
const lo = (classId: string, seed = 11): Loadout => ({ classId, region: 'meadow', tier: 1, seed, grafts: [], consumables: [{ id: 'jam', count: 2 }], equipment: {}, heldTier: 0, perks: [] });

function play(w: World, seconds: number, bot = new Bot(w, { skill: 0.6, shop: true })) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    bot.think(1 / 60);
    w.step(1 / 60);
    w.fxQueue.length = 0;
    bot.handleEvents();
  }
}

describe('all twelve classes', () => {
  it('there are twelve, each with its own held weapon', () => {
    expect(CLASS_ORDER).toHaveLength(12);
    expect(new Set(CLASS_ORDER.map((c) => CLASSES[c].held)).size).toBe(12);
    expect(new Set(CLASS_ORDER.map((c) => CLASSES[c].active.id)).size).toBe(12);
  });

  for (const id of CLASS_ORDER) {
    it(`${id} fights, uses its skill and survives a minute`, () => {
      const w = new World(lo(id), SETTINGS);
      w.godMode = true;
      play(w, 20);
      // Use the class skill a few times.
      for (let i = 0; i < 3; i++) {
        w.player.activeCd = 0;
        w.input.active = true;
        w.step(1 / 60);
        play(w, 2);
      }
      play(w, 30);
      expect(w.run.held.damageDealt).toBeGreaterThan(0);
      expect(w.stats.kills).toBeGreaterThan(20);
      expect(Number.isFinite(w.player.x + w.player.y)).toBe(true);
    });
  }
});

describe('class passives', () => {
  it('tinkerer builds turrets that shoot', () => {
    const w = new World(lo('tinkerer'), SETTINGS);
    w.godMode = true;
    play(w, 25);
    expect(w.summons.items.filter((s) => s.active && s.kind === 'turret').length).toBeGreaterThan(0);
  });

  it('rootspeaker takes root when standing still', () => {
    const w = new World(lo('rootspeaker'), SETTINGS);
    w.noSpawns = true;
    const dmg0 = w.run.stats.damage;
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    expect(w.rooted).toBe(true);
    expect(w.run.stats.damage).toBeCloseTo(dmg0 + 0.35, 5);
    w.input.mx = 1;
    w.step(1 / 60);
    w.step(1 / 60);
    expect(w.rooted).toBe(false);
  });

  it('strawman bursts when hurt and cannot crit', () => {
    const w = new World(lo('strawman'), SETTINGS);
    w.noSpawns = true;
    expect(w.run.held.critChance).toBe(0);
    const before = w.projs.count;
    w.player.iframes = 0;
    damagePlayer(w, 10, w.player.x + 5, w.player.y, 'test');
    expect(w.projs.count).toBeGreaterThanOrEqual(before + 10);
  });

  it('witch hexes every sixth hit, and the hexed burst into motes', () => {
    const w = new World(lo('witch'), SETTINGS);
    w.noSpawns = true;
    const e = w.spawnEnemy('mudling', w.player.x + 60, w.player.y, { instant: true })!;
    e.maxHp = e.hp = 10000;
    for (let i = 0; i < 6; i++) hitEnemy(w, e, 1, { weapon: w.run.held, type: 'arcane', canCrit: false });
    expect(e.cursedT).toBeGreaterThan(0);
    const before = w.projs.count;
    hitEnemy(w, e, 99999, { weapon: w.run.held, type: 'arcane', canCrit: false });
    expect(w.projs.count).toBeGreaterThanOrEqual(before + 4);
  });

  it('miller grinds out attack speed', () => {
    const w = new World(lo('miller'), SETTINGS);
    w.noSpawns = true;
    const as0 = w.run.stats.attackSpeed;
    const e = w.spawnEnemy('mudling', w.player.x + 60, w.player.y, { instant: true })!;
    e.maxHp = e.hp = 1e9;
    for (let i = 0; i < 300; i++) hitEnemy(w, e, 1, { weapon: w.run.held, type: 'physical', canCrit: false });
    expect(w.run.stats.attackSpeed).toBeCloseTo(as0 + 0.02, 5);
  });

  it('forager finds truffles', () => {
    const w = new World(lo('forager'), SETTINGS);
    w.godMode = true;
    play(w, 25);
    expect(w.props.some((p) => p.kind === 'cache')).toBe(true);
  });

  it('ploughman ploughs a furrow when dashing', () => {
    const w = new World(lo('ploughman'), SETTINGS);
    w.noSpawns = true;
    w.input.mx = 1;
    w.input.dash = true;
    for (let i = 0; i < 12; i++) w.step(1 / 60);
    expect(w.hazards.items.some((h) => h.active && h.kind === 'furrow')).toBe(true);
  });

  it('apiarist keeps two extra bees', () => {
    const w = new World(lo('apiarist'), SETTINGS);
    w.godMode = true;
    play(w, 3);
    const hive = w.run.weapons.find((x) => x.def.id === 'honeycomb_hive')!;
    expect(hive.summons.length).toBe(hive.count() + 2);
  });
});
