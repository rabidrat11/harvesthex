// Every class does what its card says: one test per passive, skill and
// weakness, measured in the simulation rather than read off the data.

import { describe, expect, it } from 'vitest';
import { World } from '../../src/sim/world';
import { dropSap, hitEnemy } from '../../src/sim/combat';
import { spawnBullet } from '../../src/sim/patterns';
import type { Loadout } from '../../src/sim/run';

const SETTINGS = { autoAim: false, autoFire: false, damageNumbers: 'off' as const, intensity: 'standard' as const };
const DT = 1 / 60;

function fresh(classId: string, consumables = [{ id: 'jam', count: 2 }], seed = 21): World {
  const lo: Loadout = { classId, region: 'meadow', tier: 1, seed, grafts: [], consumables, equipment: {}, heldTier: 0, perks: [] };
  const w = new World(lo, SETTINGS);
  w.noSpawns = true;
  w.godMode = true;
  w.step(DT);
  return w;
}

function dummy(w: World, dx: number, dy: number, hp = 1e6, elite = false) {
  const e = w.spawnEnemy('mudling', w.player.x + dx, w.player.y + dy, { instant: true, elite })!;
  e.maxHp = e.hp = hp;
  return e;
}

function aim(w: World, x: number, y: number) {
  w.input.aimX = x;
  w.input.aimY = y + 4;
}

function skill(w: World) {
  w.player.activeCd = 0;
  w.input.active = true;
  w.step(DT);
}

function run(w: World, seconds: number, each?: () => void) {
  for (let t = 0; t < seconds; t += DT) {
    each?.();
    w.step(DT);
    w.fxQueue.length = 0;
  }
}

const weapon = (w: World, id: string) => w.run.weapons.find((x) => x.def.id === id)!;

describe('Fieldhand', () => {
  it('crop rotation: each new crop family adds 5% to every weapon', () => {
    const w = fresh('fieldhand');
    const pea = weapon(w, 'pea_repeater');
    const before = pea.dmgMult;
    w.run.addWeapon('carrot_lance');
    expect(pea.dmgMult - before).toBeCloseTo(0.05, 5);
    // A second weapon of a family already fielded adds nothing.
    w.run.addWeapon('turnip_cannon');
    expect(pea.dmgMult - before).toBeCloseTo(0.05, 5);
  });

  it('straw decoy: enemies go for it instead of you', () => {
    const w = fresh('fieldhand');
    aim(w, w.player.x + 80, w.player.y);
    skill(w);
    expect(w.decoy?.active).toBe(true);
    w.step(DT);
    expect(w.targetX).toBeCloseTo(w.decoy!.x, 3);
  });

  it('weakness: critical hits deal less', () => {
    expect(fresh('fieldhand').run.held.critMult).toBeCloseTo(1.3, 5);
    expect(fresh('alchemist').run.held.critMult).toBeCloseTo(1.5, 5);
  });
});

describe('Botanist', () => {
  const giantGain = (cls: string) => {
    const w = fresh(cls);
    const plain = w.run.addWeapon('carrot_lance')!;
    const giant = w.run.addWeapon('carrot_lance', ['giant'])!;
    return giant.damage() / plain.damage();
  };

  it('mutations are 50% stronger, stat mutations included', () => {
    expect(giantGain('fieldhand')).toBeCloseTo(1.35, 5);
    expect(giantGain('botanist')).toBeCloseTo(1 + 0.35 * 1.5, 5);
    const poison = (cls: string) => fresh(cls).run.addWeapon('carrot_lance', ['venomous'])!.status.find((s) => s.id === 'poison')!.power;
    expect(poison('botanist')).toBeCloseTo(poison('fieldhand') * 1.5, 5);
  });

  it('poisoned enemies burst into spores when they die', () => {
    const w = fresh('botanist');
    const e = dummy(w, 60, 0, 20);
    e.poisonT = 2;
    e.poisonDps = 1;
    hitEnemy(w, e, 1000, { type: 'physical', canCrit: false });
    expect(w.hazards.items.some((h) => h.active && h.kind === 'spores')).toBe(true);
  });

  it('overgrowth roots and poisons everything where you aim', () => {
    const w = fresh('botanist');
    const e = dummy(w, 90, 0);
    aim(w, e.x, e.y);
    skill(w);
    expect(e.rootT).toBeGreaterThan(0);
    expect(e.poisonT).toBeGreaterThan(0);
  });

  it('weakness: frail, and physical damage is lower', () => {
    const w = fresh('botanist');
    expect(w.run.stats.physical).toBeCloseTo(-0.25, 5);
    expect(w.run.stats.maxHp).toBeLessThan(100);
  });
});

describe('Reaper', () => {
  it('melee kills restore health', () => {
    const w = fresh('reaper');
    w.player.hp = 50;
    const e = dummy(w, 20, 0, 5);
    hitEnemy(w, e, 100, { weapon: w.run.held, type: 'physical', canCrit: false });
    expect(w.player.hp).toBeCloseTo(51, 5);
  });

  it('the scythe reaps anything below 12% outright, through the real swing', () => {
    const swingAt = (fraction: number) => {
      const w = fresh('reaper');
      const e = dummy(w, 16, 0, 1e6);
      e.hp = e.maxHp * fraction;
      run(w, 2, () => {
        aim(w, e.x, e.y);
        w.input.fire = true;
        e.x = w.player.x + 16;
        e.y = w.player.y;
      });
      return e.active;
    };
    expect(swingAt(0.11)).toBe(false);
    expect(swingAt(0.2)).toBe(true);
  });

  it('reaping dash cuts through whatever is in the way', () => {
    const w = fresh('reaper');
    const x0 = w.player.x;
    const e = dummy(w, 60, 0);
    aim(w, e.x, e.y);
    skill(w);
    run(w, 0.2);
    // Struck by the dash itself (2.6x the scythe), not a later swing.
    expect(e.maxHp - e.hp).toBeGreaterThanOrEqual(w.run.held.damage() * 2.6 - 1e-6);
    expect(w.player.x - x0).toBeGreaterThan(40);
  });

  it('weakness: projectile weapons deal 30% less', () => {
    const w = fresh('reaper');
    expect(w.run.addWeapon('pea_repeater')!.dmgMult).toBeCloseTo(0.7, 5);
  });
});

describe('Tinkerer', () => {
  it('sets down turrets that shoot', () => {
    const w = fresh('tinkerer');
    const e = dummy(w, 100, 0);
    run(w, 10);
    expect(w.summons.items.some((s) => s.active && s.kind === 'turret')).toBe(true);
    expect(e.hp).toBeLessThan(e.maxHp);
  });

  it('overclock: +40% attack speed and triple-speed turrets for 4 seconds, then gone', () => {
    const w = fresh('tinkerer');
    const as0 = w.run.stats.attackSpeed;
    skill(w);
    expect(w.overclockT).toBeGreaterThan(3.9);
    expect(w.run.stats.attackSpeed).toBeCloseTo(as0 + 0.4, 5);
    run(w, 4.2);
    expect(w.run.stats.attackSpeed).toBeCloseTo(as0, 5);
  });

  it('weakness: your own weapons deal 15% less', () => {
    expect(fresh('tinkerer').run.held.dmgMult).toBeCloseTo(0.85, 5);
  });
});

describe('Apiarist', () => {
  it('flowers +20% and summons +20%; everything else 20% less', () => {
    const w = fresh('apiarist');
    expect(weapon(w, 'honeycomb_hive').dmgMult).toBeCloseTo(1.2 * 1.2, 5);
    expect(w.run.addWeapon('sunflower_halo')!.dmgMult).toBeCloseTo(1.2 * 0.8, 5);
    expect(w.run.addWeapon('pea_repeater')!.dmgMult).toBeCloseTo(0.8, 5);
    // The held smoker (a flower) is spared the penalty.
    expect(w.run.held.dmgMult).toBeCloseTo(1.2, 5);
  });

  it('the swarm: ten bees that hunt', () => {
    const w = fresh('apiarist');
    const e = dummy(w, 50, 0);
    skill(w);
    expect(w.summons.items.filter((s) => s.active && s.kind === 'wbee')).toHaveLength(10);
    run(w, 2);
    expect(e.hp).toBeLessThan(e.maxHp);
  });
});

describe('Rootspeaker', () => {
  it('bramble ring: twelve briars that stop shots', () => {
    const w = fresh('rootspeaker');
    skill(w);
    expect(w.hazards.items.filter((h) => h.active && h.kind === 'briar' && h.blocks)).toHaveLength(12);
    const b = spawnBullet(w, w.player.x + 90, w.player.y - 4, Math.PI, { sprite: 'b_round', radius: 3, damage: 10, speed: 90 }, 1)!;
    w.godMode = false;
    const hp = w.player.hp;
    run(w, 1.5);
    expect(b.active).toBe(false);
    expect(w.player.hp).toBe(hp);
  });

  it('rooted feet slow the dash, not the skill', () => {
    const w = fresh('rootspeaker');
    skill(w);
    expect(w.player.activeCd).toBeCloseTo(10, 5);
  });

  it('weakness: the dash takes 40% longer to recover', () => {
    const dashCd = (cls: string) => {
      const w = fresh(cls);
      w.input.dash = true;
      w.step(DT);
      return w.player.dashCd;
    };
    expect(dashCd('rootspeaker')).toBeCloseTo(dashCd('fieldhand') * 1.4, 5);
  });
});

describe('Strawman', () => {
  it('scare: nearby enemies flee, elites too (briefly)', () => {
    const w = fresh('strawman');
    const e = dummy(w, 50, 0);
    const el = dummy(w, -50, 0, 1e6, true);
    skill(w);
    expect(e.fearT).toBeGreaterThan(2);
    expect(el.fearT).toBeGreaterThan(0.5);
    run(w, 0.8);
    expect(e.x - w.player.x).toBeGreaterThan(60);
    expect(w.player.x - el.x).toBeGreaterThan(55);
  });

  it('plenty of health, and it grows back', () => {
    const w = fresh('strawman');
    expect(w.run.stats.maxHp).toBeGreaterThan(140);
    w.player.hp = 100;
    run(w, 2);
    expect(w.player.hp).toBeGreaterThan(102);
  });
});

describe('Forager', () => {
  it('gather: everything lying on the field flies to you', () => {
    const w = fresh('forager');
    dropSap(w, w.player.x + 160, w.player.y, 30);
    dropSap(w, w.player.x - 160, w.player.y + 60, 30);
    const sap0 = w.run.sap;
    expect(w.pickups.items.some((k) => k.active)).toBe(true);
    skill(w);
    run(w, 2.5);
    expect(w.pickups.items.some((k) => k.active && k.kind !== 'chest')).toBe(false);
    expect(w.run.sap).toBeGreaterThan(sap0);
  });
});

describe('Miller', () => {
  it('starts with an extra projectile', () => {
    expect(weapon(fresh('miller'), 'pea_repeater').count()).toBe(weapon(fresh('fieldhand'), 'pea_repeater').count() + 1);
  });

  it('winnow blows enemies away and scatters the shots in front', () => {
    const w = fresh('miller');
    const e = dummy(w, 40, 0);
    const x0 = e.x;
    const b = spawnBullet(w, w.player.x + 70, w.player.y - 4, Math.PI, { sprite: 'b_round', radius: 3, damage: 10, speed: 40 }, 1)!;
    aim(w, e.x, e.y);
    skill(w);
    expect(b.active).toBe(false);
    run(w, 0.3);
    expect(e.x - x0).toBeGreaterThan(15);
  });
});

describe('Hedge Witch', () => {
  it('moonlit step: blink to your aim, untouchable, moonfire at both ends', () => {
    const w = fresh('witch');
    const x0 = w.player.x;
    const near = dummy(w, 0, 18);
    const far = dummy(w, 120, 0);
    aim(w, far.x, far.y);
    skill(w);
    expect(w.player.x - x0).toBeGreaterThan(100);
    expect(w.player.iframes).toBeGreaterThan(0);
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(far.hp).toBeLessThan(far.maxHp);
  });

  it('weakness: 3 less armour', () => {
    expect(fresh('witch').run.stats.armour).toBe(-3);
  });
});

describe('Ploughman', () => {
  it('shoulder charge hurls aside whatever is in the way', () => {
    const w = fresh('ploughman');
    const x0 = w.player.x;
    const e = dummy(w, 50, 0);
    aim(w, w.player.x + 200, w.player.y);
    skill(w);
    expect(w.player.iframes).toBeGreaterThan(0);
    run(w, 0.25);
    expect(w.player.x - x0).toBeGreaterThan(60);
    expect(e.maxHp - e.hp).toBeGreaterThanOrEqual(w.run.held.damage() * 2 - 1e-6);
  });

  it('weakness: slower to swing', () => {
    expect(fresh('ploughman').run.stats.attackSpeed).toBeCloseTo(-0.2, 5);
  });
});

describe('Alchemist', () => {
  const spread = (cls: string) => {
    const w = fresh(cls);
    const a = dummy(w, 60, 0, 10);
    const b = dummy(w, 75, 0);
    w.step(DT);
    a.burnT = 2;
    a.burnDps = 5;
    hitEnemy(w, a, 1000, { type: 'physical', canCrit: false });
    return b.burnT;
  };

  it('burning deaths set their neighbours alight', () => {
    expect(spread('alchemist')).toBeGreaterThan(0);
    expect(spread('fieldhand')).toBe(0);
  });

  it('weakness: jars heal 30% less', () => {
    const healed = (cls: string) => {
      const w = fresh(cls);
      w.player.hp = 1;
      w.input.consumable = true;
      w.step(DT);
      return (w.player.hp - 1) / w.run.stats.maxHp;
    };
    expect(healed('alchemist')).toBeCloseTo(healed('fieldhand') * 0.7, 2);
  });

  it('brew always does one of its three things', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const w = fresh('alchemist', undefined, seed);
      w.player.hp = 10;
      const as0 = w.run.stats.attackSpeed;
      skill(w);
      expect(w.player.hp > 10 || w.run.stats.attackSpeed > as0 || w.player.iframes >= 2).toBe(true);
    }
  });
});

describe('temporary boosts', () => {
  it('a chilli jam during Overclock, or two jams in a row, wears off completely', () => {
    const w = fresh('tinkerer', [{ id: 'chilli_jam', count: 3 }]);
    const as0 = w.run.stats.attackSpeed;
    skill(w);
    w.input.consumable = true;
    w.step(DT);
    w.input.consumable = true;
    w.step(DT);
    expect(w.run.stats.attackSpeed).toBeGreaterThan(as0 + 0.9);
    run(w, 10);
    expect(w.run.stats.attackSpeed).toBeCloseTo(as0, 5);
  });
});
