// Turns pattern data into bullets, emitters and telegraphed hazards.

import { TAU, angleTo } from '../core/math';
import type { AttackDef, BulletSpec, Pattern } from '../data/patterns';
import type { Enemy } from './entities';
import type { World } from './world';

export function spawnBullet(w: World, x: number, y: number, angle: number, b: BulletSpec, dmgMult: number) {
  const o = w.bullets.obtain();
  if (!o) return null;
  o.x = x;
  o.y = y;
  o.angle = angle;
  o.speed = b.speed;
  o.accel = b.accel ?? 0;
  o.minSpeed = b.minSpeed ?? -9999;
  o.maxSpeed = b.maxSpeed ?? 9999;
  o.angVel = b.angVel ?? 0;
  o.homing = b.homing ?? 0;
  o.homingT = b.homingTime ?? 0;
  o.radius = b.radius * w.bulletScale;
  o.damage = b.damage * dmgMult;
  o.life = b.life ?? 6;
  o.age = 0;
  o.delay = b.delay ?? 0;
  o.sprite = b.sprite;
  o.grazed = false;
  return o;
}

function ringAngles(count: number, base: number, gaps = 0, gapSize = 0): number[] {
  const out: number[] = [];
  const skip = new Set<number>();
  if (gaps > 0) {
    for (let g = 0; g < gaps; g++) {
      const centre = Math.round((g * count) / gaps);
      for (let k = 0; k < gapSize; k++) skip.add((centre + k) % count);
    }
  }
  for (let i = 0; i < count; i++) if (!skip.has(i)) out.push(base + (TAU * i) / count);
  return out;
}

export interface FireCtx {
  x: number;
  y: number;
  aim: number;
  dmgMult: number;
  owner: Enemy | null;
}

export function firePattern(w: World, p: Pattern, c: FireCtx) {
  const px = w.targetX;
  const py = w.targetY;
  switch (p.kind) {
    case 'ring': {
      // Gaps are centred on the aim so the safe opening is predictable, then offset.
      const base = c.aim + (p.offset ?? 0) + (p.spinOffset ? w.rng.range(-p.spinOffset, p.spinOffset) : 0);
      const angles = ringAngles(p.count, base + Math.PI / p.count, p.gaps, p.gapSize);
      for (const a of angles) spawnBullet(w, c.x, c.y, a, p.bullet, c.dmgMult);
      w.sfx('enemy_shot', 0.5);
      break;
    }
    case 'spread': {
      for (let i = 0; i < p.count; i++) {
        const a = c.aim + (p.count === 1 ? 0 : (i / (p.count - 1) - 0.5) * p.arc);
        spawnBullet(w, c.x, c.y, a, p.bullet, c.dmgMult);
      }
      w.sfx('enemy_shot', 0.4);
      break;
    }
    case 'homing': {
      for (let i = 0; i < p.count; i++) {
        const a = c.aim + (p.count === 1 ? 0 : (i / (p.count - 1) - 0.5) * p.arc);
        spawnBullet(w, c.x, c.y, a, p.bullet, c.dmgMult);
      }
      w.sfx('enemy_shot', 0.4);
      break;
    }
    case 'burst':
    case 'spiral':
    case 'fan':
    case 'lanes': {
      const e = w.emitters.obtain();
      if (!e) break;
      e.owner = c.owner;
      e.ownerId = c.owner?.id ?? 0;
      e.x = c.x;
      e.y = c.y;
      e.angle = c.aim;
      e.t = 0;
      e.acc = 0;
      e.fired = 0;
      e.bullet = p.bullet;
      e.dmgMult = c.dmgMult;
      e.kind = p.kind;
      if (p.kind === 'burst') {
        e.count = p.count;
        e.interval = p.interval;
        e.spread = p.spread ?? 0;
        e.duration = p.count * p.interval + 0.01;
      } else if (p.kind === 'spiral') {
        e.arms = p.arms;
        e.rate = p.rate;
        e.spin = p.spin * (w.rng.chance(0.5) ? 1 : -1);
        e.duration = p.duration;
      } else if (p.kind === 'fan') {
        e.count = p.count;
        e.arc = p.arc;
        e.interval = p.interval;
        e.duration = p.count * p.interval + 0.01;
      } else {
        e.lanes = p.lanes;
        e.laneWidth = p.laneWidth;
        e.safeEvery = p.safeEvery;
        e.interval = p.interval;
        e.rows = p.rows;
        e.duration = p.rows * p.interval + 0.01;
        // Lanes come from the arena edge furthest from the player (they march
        // towards the player's side).
        e.angle = Math.round(Math.atan2(w.player.y - w.arenaCy, w.player.x - w.arenaCx) / (Math.PI / 2)) * (Math.PI / 2);
        e.count = w.rng.int(0, p.safeEvery - 1);
      }
      break;
    }
    case 'wall': {
      // A line of bullets perpendicular to the aim, with a deliberate opening.
      const nx = -Math.sin(c.aim);
      const ny = Math.cos(c.aim);
      const gapAt = w.rng.int(2, p.count - p.gap - 2);
      for (let i = 0; i < p.count; i++) {
        if (i >= gapAt && i < gapAt + p.gap) continue;
        const off = (i - (p.count - 1) / 2) * p.spacing;
        spawnBullet(w, c.x + nx * off, c.y + ny * off, c.aim, p.bullet, c.dmgMult);
      }
      w.sfx('enemy_shot', 0.6);
      break;
    }
    case 'sweep': {
      // A wall of roots crossing the whole arena from one side.
      const from = p.from === 'random' ? w.rng.pick(['left', 'right', 'top', 'bottom'] as const) : p.from;
      const cx = w.arenaCx;
      const cy = w.arenaCy;
      const r = w.arenaR + 20;
      const ang = from === 'left' ? 0 : from === 'right' ? Math.PI : from === 'top' ? Math.PI / 2 : -Math.PI / 2;
      const sx = cx - Math.cos(ang) * r;
      const sy = cy - Math.sin(ang) * r;
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      // Gap placed near the player's lateral position so it is reachable but requires moving.
      const lateral = (px - cx) * nx + (py - cy) * ny;
      const gapCentre = Math.round(lateral / p.spacing + (p.count - 1) / 2 + w.rng.int(-4, 4));
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(i - gapCentre) < p.gap / 2 + 0.5) continue;
        const off = (i - (p.count - 1) / 2) * p.spacing;
        spawnBullet(w, sx + nx * off, sy + ny * off, ang, p.bullet, c.dmgMult);
      }
      w.fx({ type: 'rootsweep', x: sx, y: sy, a: ang });
      w.sfx('rumble', 0.8);
      break;
    }
    case 'delayed': {
      for (let i = 0; i < p.count; i++) {
        const a = (TAU * i) / p.count;
        const b = spawnBullet(w, px + Math.cos(a) * p.radius, py + Math.sin(a) * p.radius, a + Math.PI, p.bullet, c.dmgMult);
        if (b) b.delay = p.bullet.delay ?? 0.8;
      }
      break;
    }
    case 'zones': {
      for (let i = 0; i < p.count; i++) {
        let x = p.onPlayer ? px : c.x;
        let y = p.onPlayer ? py : c.y;
        if (p.scatter > 0) {
          const a = w.rng.angle();
          const d = w.rng.range(p.scatter * 0.35, p.scatter);
          x += Math.cos(a) * d;
          y += Math.sin(a) * d;
        }
        const h = w.hazards.obtain();
        if (!h) break;
        h.kind = 'zone';
        h.owner = 'enemy';
        h.x = x;
        h.y = y;
        h.radius = p.radius;
        h.warn = p.warn;
        h.life = p.warn + 0.45;
        h.age = 0;
        h.damage = p.damage * c.dmgMult;
        h.fired = false;
        h.sprite = p.visual;
        h.burst = p.burst ?? null;
        h.burstCount = p.burstCount ?? 0;
      }
      w.sfx('telegraph', 0.5);
      break;
    }
    case 'crownfall': {
      for (let i = 0; i < p.count; i++) {
        const a = w.rng.angle();
        const d = i === 0 ? 0 : w.rng.range(30, p.scatter);
        const h = w.hazards.obtain();
        if (!h) break;
        h.kind = 'seedpod';
        h.owner = 'enemy';
        h.x = clampArena(w, px + Math.cos(a) * d, 'x');
        h.y = clampArena(w, py + Math.sin(a) * d, 'y');
        h.radius = p.radius;
        h.warn = p.warn + i * 0.08;
        h.life = h.warn + p.fuse;
        h.age = 0;
        h.damage = p.damage * c.dmgMult;
        h.fired = false;
        h.sprite = 'boss_seed';
        h.burst = p.burst;
        h.burstCount = p.burstCount;
      }
      w.sfx('telegraph', 0.6);
      break;
    }
    case 'summon': {
      for (let i = 0; i < p.count; i++) {
        const a = (TAU * i) / p.count;
        w.spawnEnemy(p.enemy, c.x + Math.cos(a) * p.radius, c.y + Math.sin(a) * p.radius, { instant: false });
      }
      break;
    }
  }
}

function clampArena(w: World, v: number, axis: 'x' | 'y') {
  const m = w.map.margin + 10;
  return Math.max(m, Math.min((axis === 'x' ? w.map.w : w.map.h) - m, v));
}

export function updateEmitter(w: World, e: import('./entities').Emitter, dt: number) {
  if (e.owner) {
    if (!e.owner.active || e.owner.id !== e.ownerId || e.owner.state === 'dying') {
      w.emitters.release(e);
      return;
    }
    e.x = e.owner.x;
    e.y = e.owner.y - (e.owner.def.hover ?? 0) - e.owner.radius * 0.6;
  }
  e.t += dt;
  switch (e.kind) {
    case 'spiral': {
      e.angle += e.spin * dt;
      e.acc += dt * e.rate;
      while (e.acc >= 1) {
        e.acc -= 1;
        for (let i = 0; i < e.arms; i++) spawnBullet(w, e.x, e.y, e.angle + (TAU * i) / e.arms, e.bullet, e.dmgMult);
      }
      break;
    }
    case 'burst': {
      while (e.fired < e.count && e.t >= e.fired * e.interval) {
        const aim = angleTo(e.x, e.y, w.targetX, w.targetY) + w.rng.range(-e.spread, e.spread);
        spawnBullet(w, e.x, e.y, aim, e.bullet, e.dmgMult);
        e.fired++;
        w.sfx('enemy_shot', 0.3);
      }
      break;
    }
    case 'fan': {
      while (e.fired < e.count && e.t >= e.fired * e.interval) {
        const a = e.angle + (e.count === 1 ? 0 : (e.fired / (e.count - 1) - 0.5) * e.arc);
        spawnBullet(w, e.x, e.y, a, e.bullet, e.dmgMult);
        e.fired++;
      }
      break;
    }
    case 'lanes': {
      // Rows of bullets marching across the arena; every `safeEvery`-th lane is
      // empty, alternating between rows so the player must weave.
      while (e.fired < e.rows && e.t >= e.fired * e.interval) {
        const ang = e.angle;
        const cx = w.arenaCx;
        const cy = w.arenaCy;
        const r = w.arenaR + 16;
        const sx = cx - Math.cos(ang) * r;
        const sy = cy - Math.sin(ang) * r;
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const shift = (e.count + e.fired) % e.safeEvery;
        for (let l = 0; l < e.lanes; l++) {
          if (l % e.safeEvery === shift) continue;
          const off = (l - (e.lanes - 1) / 2) * e.laneWidth;
          for (let k = -1; k <= 1; k++) spawnBullet(w, sx + nx * (off + k * 8), sy + ny * (off + k * 8), ang, e.bullet, e.dmgMult);
        }
        e.fired++;
        w.sfx('enemy_shot', 0.4);
      }
      break;
    }
  }
  if (e.t >= e.duration) w.emitters.release(e);
}

/** Advance an enemy's current attack; returns true when it has finished. */
export function runAttack(w: World, en: Enemy, dt: number): boolean {
  const a = en.attack as AttackDef;
  const prev = en.attackT;
  en.attackT += dt;
  const t0 = a.windup;
  if (prev < t0 && en.attackT >= t0) {
    en.attackAim = angleTo(en.x, en.y, w.targetX, w.targetY);
  }
  for (let i = en.attackStep; i < a.steps.length; i++) {
    const s = a.steps[i];
    if (en.attackT < t0 + s.at) break;
    en.attackStep = i + 1;
    let aim = en.attackAim;
    if (s.aim === 'player') aim = angleTo(en.x, en.y, w.targetX, w.targetY);
    else if (s.aim === 'down') aim = Math.PI / 2;
    else if (s.aim === 'random') aim = w.rng.angle();
    aim += s.angleOffset ?? 0;
    en.attackAim = aim;
    firePattern(w, s.pattern, {
      x: en.x,
      y: en.y - (en.def.hover ?? 0) - en.radius * 0.6,
      aim,
      dmgMult: en.dmgMult,
      owner: en,
    });
  }
  return en.attackStep >= a.steps.length;
}
