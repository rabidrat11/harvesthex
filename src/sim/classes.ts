// Class mechanics beyond plain stats: passives that change how a run plays,
// and every right-click skill. Each hook is called from one place in the
// world or combat code, so a class's whole rule set lives here.

import { TAU, angleTo, clamp, dist, dist2, wrapAngle } from '../core/math';
import { MATERIALS } from '../data/materials';
import { ITEMS } from '../data/items';
import { REGIONS } from '../data/regions';
import type { Enemy, Projectile } from './entities';
import type { World } from './world';
import { applyStatus, dropSap, dropSeed, explode, healPlayer, hitEnemy } from './combat';
import { findNearest } from './weapons';

export const TURRET_EVERY = 9;
export const TURRET_MAX = 3;
export const CACHE_EVERY = 40;

/** A plain player shot that belongs to no weapon (turrets, motes, needles). */
export function playerShot(w: World, x: number, y: number, a: number, speed: number, dmg: number, sprite: string, opts: Partial<Projectile> = {}): Projectile | null {
  const p = w.projs.obtain();
  if (!p) return null;
  Object.assign(p, {
    kind: 'shot',
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    z: 0,
    sprite,
    scale: 1,
    radius: 3,
    damage: dmg,
    dmgType: 'physical',
    pierce: 0,
    bounce: 0,
    life: 1.2,
    age: 0,
    rot: a,
    spin: 0,
    knockback: 15,
    split: 0,
    splitDamage: 0,
    chain: 0,
    area: 0,
    status: [],
    weapon: null,
    canCrit: true,
    isEcho: true,
    returning: false,
    homing: 0,
    dropT: 0,
    trailT: 0,
    tint: 0,
    ...opts,
  });
  p.hits.length = 0;
  return p;
}

/** Seeking arcane motes (the Witch's hex, the Moonberry Staff). */
export function spawnMotes(w: World, x: number, y: number, n: number, dmg: number, pierce = 0) {
  const base = w.rng.angle();
  for (let i = 0; i < n; i++) {
    const a = base + (TAU * i) / n;
    playerShot(w, x, y, a, 150, dmg, 'p_moon', { homing: 6, life: 1.6, dmgType: 'arcane', scale: 0.7, radius: 3, pierce, canCrit: true });
  }
}

// ---------------------------------------------------------------------------
// Passives, ticked once per simulation step.

export function classTick(w: World, dt: number) {
  const id = w.run.cls.id;
  const p = w.player;
  if (p.dead) return;
  if (w.overclockT > 0) w.overclockT -= dt;

  if (id === 'tinkerer' && (w.phase === 'acre' || w.phase === 'boss')) {
    w.turretT -= dt;
    if (w.turretT <= 0) {
      w.turretT = TURRET_EVERY;
      const live = w.summons.items.filter((s) => s.active && s.kind === 'turret');
      if (live.length >= TURRET_MAX) {
        // Replace the oldest.
        const old = live.reduce((a, b) => (a.life < b.life ? a : b));
        w.summons.release(old);
      }
      const s = w.summons.obtain();
      if (s) {
        s.kind = 'turret';
        // Set down a step behind you, so it is not hidden under your feet.
        s.x = p.x - Math.cos(p.aim) * 16;
        s.y = p.y + 2 - Math.sin(p.aim) * 12;
        w.constrain(s, 6);
        s.life = 18;
        s.t = 0;
        s.cd = 0.3;
        s.weapon = null;
        s.target = null;
        w.fx({ type: 'poof', x: s.x, y: s.y - 4 });
        w.sfx('till', 0.6);
      }
    }
  }

  if (id === 'forager' && w.phase === 'acre') {
    w.cacheT -= dt;
    if (w.cacheT <= 0) {
      w.cacheT = CACHE_EVERY;
      const a = w.rng.angle();
      const d = w.rng.range(100, 170);
      const m = w.map.margin + 20;
      const x = clamp(p.x + Math.cos(a) * d, m, w.map.w - m);
      const y = clamp(p.y + Math.sin(a) * d * 0.8, m, w.map.h - m);
      w.props.push({ kind: 'cache', x, y, r: 10, active: true });
      w.emit({ type: 'message', text: 'You smell truffles nearby.', tone: 'good' });
    }
  }

  if (id === 'rootspeaker') {
    w.stillT = p.moving || p.dashT > 0 ? 0 : w.stillT + dt;
    const rooted = w.stillT > 0.6;
    if (rooted !== w.rooted) {
      w.rooted = rooted;
      w.run.classMods = rooted ? { damage: 0.35, armour: 5 } : {};
      w.run.recompute();
      if (rooted) {
        w.fx({ type: 'root', x: p.x, y: p.y + 2 });
        w.sfx('vines', 0.4);
      }
    }
  }

  // Ploughman: the dash ploughs a furrow.
  if (id === 'ploughman' && p.dashT > 0) {
    w.furrowT -= dt;
    if (w.furrowT <= 0) {
      w.furrowT = 0.025;
      const h = w.hazards.obtain();
      if (h) {
        Object.assign(h, {
          kind: 'furrow',
          owner: 'player',
          x: p.x - p.dashDx * 6,
          y: p.y + 2 - p.dashDy * 6,
          radius: 10,
          life: 3,
          age: 0,
          damage: w.run.held.damage() * 0.25,
          tick: 0.4,
          tickT: 0,
          status: { id: 'chill', power: 0.5, duration: 0.6 },
          weapon: w.run.held,
          slot: 9,
          blocks: false,
          reflect: false,
          warn: 0,
          dmgType: 'physical',
        });
      }
    }
  }

  // Forager's truffle patches: walk over them to dig.
  for (const pr of w.props) {
    if (!pr.active || pr.kind !== 'cache') continue;
    if (dist2(p.x, p.y, pr.x, pr.y) < 16 * 16) digCache(w, pr);
  }
}

function digCache(w: World, pr: { x: number; y: number; active: boolean }) {
  pr.active = false;
  w.fx({ type: 'erupt', x: pr.x, y: pr.y, c: 14, s: 'dirt' });
  w.fx({ type: 'loot', x: pr.x, y: pr.y, a: 2 });
  w.sfx('harvest', 0.9);
  dropSap(w, pr.x, pr.y, 15 + w.director.index * 8);
  const mats = REGIONS[w.regionId].rewards.filter((r) => r.startsWith('mat:')).map((r) => r.slice(4)).filter((m) => MATERIALS[m]);
  w.dropPickup('material', pr.x, pr.y, w.rng.int(1, 2), w.rng.pick(mats));
  if (w.rng.chance(0.4)) dropSeed(w, pr.x, pr.y, { rare: w.rng.chance(0.35) });
  if (w.rng.chance(0.1)) {
    const pool = Object.values(ITEMS).filter((i) => i.rarity === 'common' || i.rarity === 'uncommon');
    const it = w.rng.pick(pool);
    w.run.addItem(it.id);
    w.emit({ type: 'message', text: `Buried with the truffles: ${it.name}!`, tone: 'good' });
  }
}

/** Turrets and temporary bees (world-owned summons). Returns true if handled. */
export function updateClassSummon(w: World, s: import('./entities').Summon, dt: number): boolean {
  if (s.kind === 'turret') {
    s.life -= dt;
    s.t += dt;
    s.cd -= dt;
    if (s.life <= 0) {
      w.fx({ type: 'poof', x: s.x, y: s.y - 4 });
      w.summons.release(s);
      return true;
    }
    if (s.cd <= 0) {
      const e = findNearest(w, s.x, s.y, 200);
      if (e) {
        const st = w.run.stats;
        s.cd = 0.55 / Math.max(0.3, 1 + st.attackSpeed) / (w.overclockT > 0 ? 3 : 1);
        s.facing = e.x >= s.x ? 1 : -1;
        // Water leaves from the brass nozzle on top.
        const nx = s.x + 3.5 * s.facing;
        const ny = s.y - 13.5;
        const a = angleTo(nx, ny, e.x, e.y - 4);
        playerShot(w, nx, ny, a, 290, 7 * (1 + st.damage + st.physical) * (1 + w.run.level * 0.03), 'p_seed', { tint: 4, life: 0.8 });
        w.sfx('pea', 0.25);
      } else s.cd = 0.2;
    }
    return true;
  }
  if (s.kind === 'wbee') {
    s.life -= dt;
    s.t += dt;
    s.cd -= dt;
    if (s.life <= 0) {
      w.summons.release(s);
      return true;
    }
    if (!s.target || !s.target.active) s.target = findNearest(w, s.x, s.y, 200);
    const tx = s.target ? s.target.x : w.player.x + Math.cos(s.t * 3 + s.index) * 20;
    const ty = s.target ? s.target.y - 4 : w.player.y - 8 + Math.sin(s.t * 3 + s.index) * 14;
    const a = angleTo(s.x, s.y, tx, ty);
    s.x += Math.cos(a) * 200 * dt + Math.sin(s.t * 13 + s.index) * 30 * dt;
    s.y += Math.sin(a) * 200 * dt + Math.cos(s.t * 11 + s.index) * 30 * dt;
    s.facing = Math.cos(a) >= 0 ? 1 : -1;
    if (s.target && s.cd <= 0 && dist2(s.x, s.y, s.target.x, s.target.y - 4) < (s.target.radius + 4) ** 2) {
      s.cd = 0.35;
      hitEnemy(w, s.target, 6 * (1 + w.run.stats.summonPower + w.run.stats.nature), { type: 'nature', kb: 5, fromX: s.x, fromY: s.y, source: 'summon', status: [{ id: 'poison', power: 3, duration: 2 }] });
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Combat hooks

export function onHit(w: World, e: Enemy, src: string, hasWeapon: boolean) {
  const id = w.run.cls.id;
  if (src !== 'direct' && src !== 'explosion' && src !== 'summon') return;
  if (id === 'miller') {
    w.millHits++;
    if (w.millHits % 150 === 0 && (w.run.classMods.attackSpeed ?? 0) < 0.3) {
      w.run.classMods = { ...w.run.classMods, attackSpeed: Math.round(((w.run.classMods.attackSpeed ?? 0) + 0.01) * 100) / 100 };
      w.run.recompute();
    }
  }
  if (id === 'witch' && hasWeapon && src === 'direct') {
    w.hexCount++;
    if (w.hexCount % 6 === 0 && e.active && e.hp > 0 && !e.boss) {
      e.cursedT = 4;
      w.fx({ type: 'hex', x: e.x, y: e.y - e.radius - 4 });
    }
  }
}

export function onKill(w: World, e: Enemy) {
  const id = w.run.cls.id;
  if (e.cursedT > 0) spawnMotes(w, e.x, e.y - 4, 4, 9 * (1 + w.run.stats.arcane + w.run.stats.damage));
  if (id === 'alchemist' && e.burnT > 0) {
    for (const o of w.queryEnemies(e.x, e.y, 40)) {
      if (o === e) continue;
      applyStatus(w, o, { id: 'burn', power: Math.max(4, e.burnDps), duration: 2 }, null);
    }
    w.fx({ type: 'explode', x: e.x, y: e.y - 4, c: 16, s: 'fire' });
  }
}

/** The Strawman bursts whenever it is hurt. */
export function onPlayerHurt(w: World) {
  if (w.run.cls.id !== 'strawman') return;
  const p = w.player;
  const max = w.run.stats.maxHp;
  for (let i = 0; i < 14; i++) {
    const a = (TAU * i) / 14 + w.rng.range(-0.1, 0.1);
    playerShot(w, p.x, p.y - 4, a, 230, 8 + max * 0.08, 'p_thorn', { pierce: 3, life: 0.55, canCrit: false });
  }
  explode(w, p.x, p.y - 4, 60 * (1 + w.run.stats.area * 0.5), max * 0.33, { type: 'physical', kb: 140, visual: 'small', canCrit: false });
  w.fx({ type: 'straw', x: p.x, y: p.y - 6 });
}

// ---------------------------------------------------------------------------
// Right-click skills for the newer classes. Returns false if not handled here.

export function useClassActive(w: World, id: string): boolean {
  const p = w.player;
  const reach = (r: number) => {
    const d = Math.min(r, dist(p.x, p.y, w.input.aimX, w.input.aimY));
    return { x: p.x + Math.cos(p.aim) * d, y: p.y + Math.sin(p.aim) * d };
  };
  switch (id) {
    case 'overclock': {
      w.overclockT = 4;
      p.buffT = 4;
      p.buffAs += 0.4;
      w.run.tempMods.attackSpeed = (w.run.tempMods.attackSpeed ?? 0) + 0.4;
      w.run.recompute();
      w.fx({ type: 'flare', x: p.x, y: p.y - 4, c: 50 });
      w.sfx('zap', 0.9);
      return true;
    }
    case 'swarm': {
      for (let i = 0; i < 10; i++) {
        const s = w.summons.obtain();
        if (!s) break;
        s.kind = 'wbee';
        s.x = p.x + w.rng.range(-8, 8);
        s.y = p.y - 6 + w.rng.range(-8, 8);
        s.life = 6;
        s.t = w.rng.range(0, 2);
        s.cd = 0.1;
        s.index = i;
        s.target = null;
        s.weapon = null;
      }
      w.fx({ type: 'spores', x: p.x, y: p.y - 6, c: 26 });
      w.sfx('buzz', 1);
      return true;
    }
    case 'bramble': {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (TAU * i) / n;
        const h = w.hazards.obtain();
        if (!h) break;
        Object.assign(h, {
          kind: 'briar',
          owner: 'player',
          x: p.x + Math.cos(a) * 38,
          y: p.y + Math.sin(a) * 30,
          radius: 10,
          life: 6,
          age: 0,
          damage: w.run.held.damage() * 0.5,
          tick: 0.4,
          tickT: 0,
          status: { id: 'chill', power: 0.4, duration: 0.6 },
          weapon: w.run.held,
          slot: 9,
          blocks: true,
          reflect: false,
          warn: 0,
          dmgType: 'nature',
        });
      }
      w.sfx('briar', 1);
      return true;
    }
    case 'scare': {
      for (const e of w.queryEnemies(p.x, p.y, 150)) {
        if (e.boss) continue;
        e.fearT = e.elite ? 1 : 2.5;
      }
      w.fx({ type: 'bell', x: p.x, y: p.y - 6, c: 150 });
      w.sfx('boss_laugh', 0.6);
      return true;
    }
    case 'gather': {
      for (const k of w.pickups.items) if (k.active && k.kind !== 'chest') k.magnet = true;
      w.fx({ type: 'bell', x: p.x, y: p.y - 6, c: 90 });
      w.sfx('coin', 1);
      return true;
    }
    case 'winnow': {
      const arc = 1.5;
      const r = 120;
      for (const e of w.queryEnemies(p.x, p.y, r)) {
        if (Math.abs(wrapAngle(angleTo(p.x, p.y, e.x, e.y) - p.aim)) > arc / 2) continue;
        const a = angleTo(p.x, p.y, e.x, e.y);
        e.kx += Math.cos(a) * 320 * (1 - e.def.kbResist);
        e.ky += Math.sin(a) * 320 * (1 - e.def.kbResist);
        hitEnemy(w, e, w.run.held.damage() * 1.5, { type: 'physical', canCrit: false, fromX: p.x, fromY: p.y });
      }
      for (const b of w.bullets.items) {
        if (!b.active || dist2(p.x, p.y, b.x, b.y) > r * r) continue;
        if (Math.abs(wrapAngle(angleTo(p.x, p.y, b.x, b.y) - p.aim)) > arc / 2) continue;
        w.fx({ type: 'bulletpop', x: b.x, y: b.y });
        w.bullets.release(b);
      }
      w.fx({ type: 'sweep', x: p.x, y: p.y - 4, a: p.aim, b: arc, c: r, s: 'arc_scythe' });
      w.sfx('swing', 1);
      return true;
    }
    case 'moonstep': {
      const from = { x: p.x, y: p.y };
      const to = reach(140);
      p.x = to.x;
      p.y = to.y;
      w.constrain(p, p.radius);
      p.iframes = Math.max(p.iframes, 0.45);
      const dmg = w.run.held.damage() * 2;
      for (const at of [from, { x: p.x, y: p.y }]) {
        explode(w, at.x, at.y - 4, 44 * (1 + w.run.stats.area * 0.5), dmg, { type: 'arcane', kb: 70, visual: 'none' });
        w.fx({ type: 'moonstep', x: at.x, y: at.y - 4, c: 44 });
      }
      w.sfx('blink', 1);
      return true;
    }
    case 'charge': {
      p.dashDx = Math.cos(p.aim);
      p.dashDy = Math.sin(p.aim);
      p.reapT = 0.22;
      p.chargeMode = true;
      p.iframes = Math.max(p.iframes, 0.32);
      w.grid.beginStamp();
      w.fx({ type: 'dash', x: p.x, y: p.y, a: p.aim });
      w.sfx('charge', 1);
      return true;
    }
    case 'brew': {
      const r = w.rng.int(0, 2);
      if (r === 0) {
        healPlayer(w, w.run.stats.maxHp * 0.25, true, 999);
        w.emit({ type: 'message', text: 'A healing draught.', tone: 'good' });
      } else if (r === 1) {
        p.buffT = 6;
        p.buffAs += 0.5;
        w.run.tempMods.attackSpeed = (w.run.tempMods.attackSpeed ?? 0) + 0.5;
        w.run.recompute();
        w.emit({ type: 'message', text: 'A fizzing tonic: everything speeds up.', tone: 'good' });
      } else {
        p.iframes = Math.max(p.iframes, 2.5);
        w.emit({ type: 'message', text: 'Something glowing: untouchable for a moment.', tone: 'good' });
      }
      w.fx({ type: 'drink', x: p.x, y: p.y - 10 });
      w.sfx('drink', 1);
      return true;
    }
  }
  return false;
}

/** Damage multiplier a class applies to one of its own weapons. */
export function classWeaponMult(clsId: string, tags: string[], held: boolean): number {
  if (clsId === 'apiarist' && !tags.includes('summon') && !held) return 0.8;
  return 1;
}
