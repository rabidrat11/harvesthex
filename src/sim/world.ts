// The expedition simulation. Pure TypeScript: no Phaser, no DOM. The scene
// feeds it input and a dt each frame, reads entities to draw, and drains
// `fxQueue` (sounds and particles) and `events` (UI moments).

import { Rng } from '../core/rng';
import { ITEMS } from '../data/items';
import { TAU, angleTo, approach, clamp, dist, dist2 } from '../core/math';
import { SpatialGrid } from '../core/spatial';
import { ENEMIES } from '../data/enemies';
import { ROT_TIERS, REGIONS } from '../data/regions';
import { WEAPONS } from '../data/weapons';
import { MATERIALS } from '../data/materials';
import type { TraitId } from '../data/types';
import { Bullet, Emitter, Enemy, Hazard, Pickup, Pool, Projectile, Summon, type PickupKind } from './entities';
import { generateMeadow, type ArenaMap, BOSS_ARENA_RADIUS } from './map';
import { RunState, type Loadout } from './run';
import { WeaponInstance, updateWeapon, findNearest, doSweep } from './weapons';
import { applyStatus, damagePlayer, dropSap, dropSeed, explode, healPlayer, hitEnemy, killEnemy, updateStatuses } from './combat';
import { spawnBullet, updateEmitter } from './patterns';
import { updateEnemyAi } from './enemyAi';
import { Director } from './director';
import { classTick, spawnMotes, updateClassSummon, useClassActive } from './classes';

export interface InputState {
  mx: number;
  my: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  dash: boolean;
  active: boolean;
  consumable: boolean;
  interact: boolean;
}

export interface SimSettings {
  autoAim: boolean;
  autoFire: boolean;
  damageNumbers: 'all' | 'crits' | 'off';
  intensity: 'gentle' | 'standard';
}

export interface Fx {
  type: string;
  x: number;
  y: number;
  a?: number;
  b?: number;
  c?: number;
  s?: string;
}

export type GameEvent =
  | { type: 'levelup' }
  | { type: 'acre'; index: number; name: string; intro: string }
  | { type: 'lull'; index: number; final: boolean }
  | { type: 'message'; text: string; tone?: 'warn' | 'good' | 'info' }
  | { type: 'elite'; name: string }
  | { type: 'boss'; name: string }
  | { type: 'bossPhase'; phase: number }
  | { type: 'chest'; x: number; y: number }
  | { type: 'pickup'; kind: PickupKind; id: string; rarity: number; traits?: string[] }
  | { type: 'shop' }
  | { type: 'extractPrompt' }
  | { type: 'victory' }
  | { type: 'defeat'; cause: string }
  | { type: 'objective'; done: boolean };

export type Phase = 'acre' | 'lull' | 'boss' | 'victory' | 'defeat' | 'extracted';

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  kx = 0;
  ky = 0;
  hp = 100;
  aim = 0;
  /** The point being aimed at (the cursor, or the auto-aim target). */
  aimX = 0;
  aimY = 0;
  facingAngle = Math.PI / 2;
  moving = false;
  dashT = 0;
  dashCd = 0;
  dashDx = 0;
  dashDy = 0;
  iframes = 0;
  hurtT = 0;
  dead = false;
  activeCd = 0;
  reapT = 0;
  reapX = 0;
  reapY = 0;
  animT = 0;
  hitbox = 3.5;
  radius = 6;
  buffT = 0;
  buffAs = 0;
  /** The Ploughman's shoulder charge reuses the reaping dash. */
  chargeMode = false;
}

export interface Prop {
  kind: 'cart' | 'exit' | 'shrine' | 'cache';
  x: number;
  y: number;
  r: number;
  progress?: number;
  active: boolean;
}

export const VIEW_W = 640;
export const VIEW_H = 360;

export class World {
  rng: Rng;
  t = 0;
  map: ArenaMap;
  player = new Player();
  run: RunState;
  regionId: string;
  tier: number;
  tierLoot: number;
  tierDmg: number;
  tierHp: number;
  tierRate: number;
  enemies = new Pool(() => new Enemy(), 900);
  projs = new Pool(() => new Projectile(), 2500);
  bullets = new Pool(() => new Bullet(), 2500);
  hazards = new Pool(() => new Hazard(), 600);
  pickups = new Pool(() => new Pickup(), 1500);
  summons = new Pool(() => new Summon(), 200);
  emitters = new Pool(() => new Emitter(), 200);
  grid: SpatialGrid<Enemy>;
  director: Director;
  fxQueue: Fx[] = [];
  events: GameEvent[] = [];
  input: InputState = { mx: 0, my: 0, aimX: 0, aimY: 0, fire: false, dash: false, active: false, consumable: false, interact: false };
  settings: SimSettings;
  phase: Phase = 'acre';
  props: Prop[] = [];
  boss: Enemy | null = null;
  elite: Enemy | null = null;
  arenaCx = 0;
  arenaCy = 0;
  arenaR = 0;
  arenaOn = false;
  targetX = 0;
  targetY = 0;
  decoy: Summon | null = null;
  bulletScale = 1;
  petalShields = 0;
  petalAcc = 0;
  healWindow = 0;
  healWindowT = 0;
  statusDamageAcc = 0;
  bellT = 0;
  godMode = false;
  lastHurtBy = '';
  shakeAmt = 0;
  shakeT = 0;
  hitstopT = 0;
  nearProp: Prop | null = null;
  killsByEnemy: Record<string, number> = {};
  stats = { kills: 0, damageDealt: 0, damageTaken: 0, healed: 0, elites: 0, bosses: 0, chests: 0, dashes: 0 };
  dpsWindow: number[] = [];
  private dpsTimes: number[] = [];
  private nextEnemyId = 1;
  /** Set by tests and the debug overlay to stop the director spawning. */
  noSpawns = false;
  // Class passives (see sim/classes.ts).
  overclockT = 0;
  turretT = 3;
  cacheT = 20;
  stillT = 0;
  rooted = false;
  furrowT = 0;
  millHits = 0;
  hexCount = 0;

  constructor(loadout: Loadout, settings: SimSettings) {
    this.rng = new Rng(loadout.seed);
    const region = REGIONS[loadout.region] ?? REGIONS.meadow;
    this.regionId = region.id;
    this.map = generateMeadow(loadout.seed, region.width, region.height);
    this.grid = new SpatialGrid(this.map.w, this.map.h, 32);
    const tier = ROT_TIERS[Math.max(0, Math.min(ROT_TIERS.length - 1, loadout.tier - 1))];
    this.tier = tier.tier;
    this.settings = settings;
    const gentle = settings.intensity === 'gentle';
    this.tierLoot = tier.loot;
    this.tierDmg = tier.dmg * (gentle ? 0.7 : 1);
    this.tierHp = tier.hp;
    this.tierRate = tier.rate * (gentle ? 0.85 : 1);
    this.run = new RunState(loadout);
    this.player.x = this.map.start.x;
    this.player.y = this.map.start.y;
    this.player.hp = this.run.stats.maxHp;
    this.targetX = this.player.x;
    this.targetY = this.player.y;
    this.director = new Director(this, region);
    for (const wi of this.run.weapons) wi.rollWild(this.rng);
    this.run.recompute();
  }

  // -------------------------------------------------------------------------
  // Helpers used by every system.

  fx(f: Fx) {
    if (this.fxQueue.length < 2000) this.fxQueue.push(f);
  }

  sfx(id: string, vol = 1) {
    this.fx({ type: 'sfx', x: 0, y: 0, s: id, a: vol });
  }

  shake(amount: number, time: number) {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
    this.shakeT = Math.max(this.shakeT, time);
  }

  hitstop(time: number) {
    this.hitstopT = Math.max(this.hitstopT, time);
  }

  emit(e: GameEvent) {
    this.events.push(e);
  }

  /** Enemies near a point. A fresh list each call: hits inside a loop over it may
   *  set off explosions or chains that query again. */
  queryEnemies(x: number, y: number, r: number): Enemy[] {
    return this.grid.query(x, y, r, [], 26);
  }

  spawnEnemy(id: string, x: number, y: number, o: { instant?: boolean; kx?: number; ky?: number; elite?: boolean } = {}): Enemy | null {
    const def = ENEMIES[id];
    if (!def) return null;
    const e = this.enemies.obtain();
    if (!e) return null;
    const acre = this.director.acre;
    const debt = this.run.curses.some((c) => c.id === 'root_debt') ? 1.25 : 1;
    const hpMult = (def.boss || def.elite ? 1 : (acre?.hpMult ?? 1) * debt) * this.tierHp * (def.elite ? 1 + this.director.index * 0.25 : 1);
    e.id = this.nextEnemyId++;
    e.def = def;
    e.x = x;
    e.y = y;
    e.vx = 0;
    e.vy = 0;
    e.kx = o.kx ?? 0;
    e.ky = o.ky ?? 0;
    e.radius = def.radius;
    e.maxHp = Math.round(def.hp * hpMult);
    e.hp = e.maxHp;
    e.speed = def.speed * this.rng.range(0.92, 1.08);
    e.contact = def.contact;
    // Bosses and elites hit a little harder than the crowd around them.
    e.dmgMult = (def.boss || def.elite ? 1.15 : acre?.dmgMult ?? 1) * (def.elite ? 1 + this.director.index * 0.1 : 1);
    e.state = def.boss ? 'intro' : 'move';
    e.stateT = 0;
    e.t = this.rng.range(0, 2);
    e.angle = angleTo(x, y, this.player.x, this.player.y);
    e.facing = this.player.x >= x ? 1 : -1;
    e.attackCd = this.rng.range(1, 2.5);
    e.attackIndex = 0;
    e.attack = null;
    e.attackT = 0;
    e.attackStep = 0;
    e.flash = 0;
    e.spawnT = o.instant || def.boss ? 0 : 0.6;
    e.poisonDps = e.poisonT = e.burnDps = e.burnT = 0;
    e.slow = e.slowT = e.chillStacks = e.chillDecay = e.frozenT = 0;
    e.bleedStacks = e.bleedPower = e.bleedT = e.rootT = e.shock = 0;
    e.dotAcc = 0;
    e.dotTick = 0.5;
    e.dotBy = null;
    e.fearT = 0;
    e.lastHit.fill(-99);
    e.invulnerable = def.ai === 'burrower' || !!def.boss;
    e.hidden = def.ai === 'burrower';
    e.state = def.ai === 'burrower' ? 'burrow' : e.state;
    e.carried = 0;
    e.phase = 0;
    e.memo = 0;
    e.memo2 = 0;
    e.elite = !!def.elite;
    e.boss = !!def.boss;
    e.detonated = false;
    e.numAcc = 0;
    e.cursedT = 0;
    e.lastNum = -1;
    e.lastFlash = -1;
    e.guard = def.ai === 'knight';
    if (e.spawnT > 0) this.fx({ type: 'burrow', x, y });
    return e;
  }

  dropPickup(kind: PickupKind, x: number, y: number, value: number, id = ''): Pickup | null {
    const p = this.pickups.obtain();
    if (!p) return null;
    p.kind = kind;
    p.x = x;
    p.y = y;
    const a = this.rng.angle();
    const s = kind === 'sap' ? this.rng.range(15, 45) : this.rng.range(30, 70);
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.z = 0;
    p.vz = kind === 'sap' ? this.rng.range(50, 90) : this.rng.range(90, 130);
    p.value = value;
    p.id = id;
    p.rarity = kind === 'material' ? ['common', 'uncommon', 'rare', 'legendary'].indexOf(MATERIALS[id]?.rarity ?? 'common') : 0;
    p.traits = [];
    p.magnet = this.phase === 'lull';
    p.age = 0;
    p.life = kind === 'sap' ? 120 : 600;
    p.sprite = '';
    return p;
  }

  spawnMite(x: number, y: number, wi: WeaponInstance) {
    const s = this.summons.obtain();
    if (!s) return;
    s.kind = 'mite';
    s.x = x;
    s.y = y;
    s.vx = s.vy = s.z = 0;
    s.target = null;
    s.life = 4;
    s.t = 0;
    s.cd = 0.2;
    s.weapon = wi;
    s.index = 0;
    this.fx({ type: 'poof', x, y });
  }

  // -------------------------------------------------------------------------
  // Main step.

  step(dt: number) {
    // Sub-step large frames so fast bullets cannot tunnel through the player.
    let left = Math.min(dt, 0.1);
    while (left > 1e-6) {
      const h = Math.min(left, 1 / 60);
      this.tick(h);
      left -= h;
    }
    this.input.dash = false;
    this.input.active = false;
    this.input.consumable = false;
    this.input.interact = false;
  }

  private tick(dt: number) {
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
    if (this.phase === 'victory' || this.phase === 'defeat' || this.phase === 'extracted') {
      this.updateFxOnly(dt);
      return;
    }
    this.t += dt;
    this.healWindowT += dt;
    if (this.healWindowT >= 1) {
      this.healWindowT = 0;
      this.healWindow = 0;
    }

    // Rebuild the spatial grid once per tick.
    this.grid.clear();
    for (const e of this.enemies.items) if (e.active && !e.hidden && e.spawnT <= 0) this.grid.insert(e);

    this.updateTarget();
    this.updatePlayer(dt);
    classTick(this, dt);
    if (!this.player.dead) {
      for (const wi of this.run.weapons) updateWeapon(this, wi, dt);
      updateWeapon(this, this.run.held, dt);
    }
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateBullets(dt);
    this.updateHazards(dt);
    this.updateSummons(dt);
    for (const em of this.emitters.items) if (em.active) updateEmitter(this, em, dt);
    this.updatePickups(dt);
    this.updateItems(dt);
    this.director.update(dt);
    this.updateProps(dt);
  }

  private updateFxOnly(dt: number) {
    for (const e of this.enemies.items) {
      if (!e.active) continue;
      if (e.boss && e.state === 'dying') {
        e.stateT += dt;
      }
    }
  }

  private updateTarget() {
    if (this.decoy && this.decoy.active) {
      this.targetX = this.decoy.x;
      this.targetY = this.decoy.y;
    } else {
      this.decoy = null;
      this.targetX = this.player.x;
      this.targetY = this.player.y;
    }
  }

  // -------------------------------------------------------------------------
  // Player

  private updatePlayer(dt: number) {
    const p = this.player;
    const s = this.run.stats;
    if (p.dead) return;
    p.animT += dt;
    if (p.iframes > 0) p.iframes -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.activeCd > 0) p.activeCd -= dt;
    if (p.buffT > 0) {
      p.buffT -= dt;
      if (p.buffT <= 0 && p.buffAs) {
        this.run.tempMods.attackSpeed = (this.run.tempMods.attackSpeed ?? 0) - p.buffAs;
        p.buffAs = 0;
        this.run.recompute();
      }
    }

    // Aim: mouse by default; nearest enemy with auto-aim.
    let aimX = this.input.aimX;
    let aimY = this.input.aimY;
    if (this.settings.autoAim) {
      const e = findNearest(this, p.x, p.y, 260);
      if (e) {
        aimX = e.x;
        aimY = e.y;
      }
    }
    p.aim = Math.atan2(aimY - (p.y - 4), aimX - p.x);
    p.aimX = aimX;
    p.aimY = aimY;

    // Regeneration.
    if (s.regen > 0 && p.hp < s.maxHp) p.hp = Math.min(s.maxHp, p.hp + s.regen * dt);
    if (p.hp > s.maxHp) p.hp = s.maxHp;

    let mx = this.input.mx;
    let my = this.input.my;
    const ml = Math.hypot(mx, my);
    if (ml > 1) {
      mx /= ml;
      my /= ml;
    }
    p.moving = ml > 0.1;

    // Reaping dash (Reaper active) overrides movement.
    if (p.reapT > 0) {
      p.reapT -= dt;
      const sp = p.chargeMode ? 520 : 620;
      const step = sp * dt;
      const before = { x: p.x, y: p.y };
      p.x += p.dashDx * step;
      p.y += p.dashDy * step;
      this.reapAlong(before.x, before.y, p.x, p.y);
      this.constrain(p, 4);
      if (p.reapT <= 0) {
        p.iframes = Math.max(p.iframes, 0.12);
        p.chargeMode = false;
      }
      return;
    }

    if (this.input.dash && p.dashCd <= 0 && p.dashT <= 0) {
      const dx = p.moving ? mx : Math.cos(p.aim);
      const dy = p.moving ? my : Math.sin(p.aim);
      const l = Math.hypot(dx, dy) || 1;
      p.dashDx = dx / l;
      p.dashDy = dy / l;
      p.dashT = 0.16;
      p.dashCd = Math.max(0.35, 1.15 * (1 - s.dashCooldown));
      p.iframes = Math.max(p.iframes, 0.24);
      this.stats.dashes++;
      this.fx({ type: 'dash', x: p.x, y: p.y, a: Math.atan2(p.dashDy, p.dashDx) });
      this.sfx('dash', 0.8);
    }

    if (this.input.active && p.activeCd <= 0) this.useActive();
    if (this.input.consumable) {
      this.input.consumable = false;
      this.useConsumable();
    }
    if (this.input.interact && this.nearProp) {
      this.input.interact = false;
      this.interact(this.nearProp);
    }

    const speed = 108 * Math.max(0.35, 1 + s.moveSpeed);
    if (p.dashT > 0) {
      p.dashT -= dt;
      const dsp = (72 * (1 + s.dashDistance)) / 0.16;
      p.vx = p.dashDx * dsp;
      p.vy = p.dashDy * dsp;
      if (p.dashT <= 0) {
        p.vx *= 0.35;
        p.vy *= 0.35;
      }
    } else {
      const tx = mx * speed;
      const ty = my * speed;
      const rate = p.moving ? 22 : 28;
      const k = approach(rate, dt);
      p.vx += (tx - p.vx) * k;
      p.vy += (ty - p.vy) * k;
    }
    // Knockback is separate from steering so the player keeps control.
    const kd = approach(11, dt);
    p.x += (p.vx + p.kx) * dt;
    p.y += (p.vy + p.ky) * dt;
    p.kx -= p.kx * kd;
    p.ky -= p.ky * kd;
    if (p.moving) p.facingAngle = Math.atan2(my, mx);
    this.constrain(p, p.radius);
  }

  /** Keep a circle inside the map/arena and out of obstacles. */
  constrain(o: { x: number; y: number }, r: number, flying = false) {
    const m = this.map.margin;
    o.x = clamp(o.x, m + r, this.map.w - m - r);
    o.y = clamp(o.y, m + r, this.map.h - m - r);
    if (this.arenaOn) {
      const d = dist(o.x, o.y, this.arenaCx, this.arenaCy);
      const max = this.arenaR - r;
      if (d > max) {
        const a = angleTo(this.arenaCx, this.arenaCy, o.x, o.y);
        o.x = this.arenaCx + Math.cos(a) * max;
        o.y = this.arenaCy + Math.sin(a) * max;
      }
    }
    if (flying) return;
    for (const ob of this.map.obstacles) {
      const dx = o.x - ob.x;
      const dy = o.y - ob.y;
      const rr = ob.r + r;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        o.x = ob.x + (dx / d) * rr;
        o.y = ob.y + (dy / d) * rr;
      }
    }
  }

  private useActive() {
    const p = this.player;
    const act = this.run.cls.active;
    if (useClassActive(this, act.id)) {
      p.activeCd = this.activeCooldown();
      return;
    }
    const reach = (r: number) => {
      const d = Math.min(r, dist(p.x, p.y, this.input.aimX, this.input.aimY));
      return { x: p.x + Math.cos(p.aim) * d, y: p.y + Math.sin(p.aim) * d };
    };
    if (act.id === 'decoy') {
      const at = reach(110);
      const s = this.summons.obtain();
      if (!s) return;
      s.kind = 'decoy';
      s.x = at.x;
      s.y = at.y;
      this.constrain(s, 6);
      s.life = 5;
      s.hp = 60 + this.run.level * 4;
      s.t = 0;
      s.weapon = null;
      this.decoy = s;
      this.fx({ type: 'poof', x: s.x, y: s.y });
      this.sfx('decoy', 0.8);
    } else if (act.id === 'overgrowth') {
      const at = reach(170);
      const r = 52 * (1 + this.run.stats.area * 0.6);
      this.fx({ type: 'vines', x: at.x, y: at.y, c: r });
      this.sfx('vines', 0.9);
      for (const e of this.queryEnemies(at.x, at.y, r)) {
        if (dist2(at.x, at.y, e.x, e.y) > (r + e.radius) ** 2) continue;
        applyStatus(this, e, { id: 'root', power: 1, duration: 2 }, null);
        applyStatus(this, e, { id: 'poison', power: 7 * (1 + this.run.stats.nature), duration: 3 }, null);
        hitEnemy(this, e, 6, { type: 'nature', source: 'explosion', canCrit: false });
      }
    } else if (act.id === 'reap') {
      p.dashDx = Math.cos(p.aim);
      p.dashDy = Math.sin(p.aim);
      p.reapT = 0.18;
      p.iframes = Math.max(p.iframes, 0.3);
      p.reapX = p.x;
      p.reapY = p.y;
      this.fx({ type: 'reap', x: p.x, y: p.y, a: p.aim });
      this.sfx('reap', 1);
      this.grid.beginStamp();
    }
    p.activeCd = this.activeCooldown();
  }

  /** Dash-recovery bonuses also speed up the class skill (by half); penalties to the dash do not. */
  private activeCooldown(): number {
    return this.run.cls.active.cooldown * (1 - clamp(this.run.stats.dashCooldown * 0.5, 0, 0.5));
  }

  private reapAlong(ax: number, ay: number, bx: number, by: number) {
    const charge = this.player.chargeMode;
    const dmg = this.run.held.damage() * (charge ? 2 : 2.6);
    const list = this.queryEnemies((ax + bx) / 2, (ay + by) / 2, dist(ax, ay, bx, by) / 2 + 18);
    for (const e of list) {
      // Each enemy is struck once per dash, when the dash reaches it.
      if (this.grid.marked(e)) continue;
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy || 1;
      const t = clamp(((e.x - ax) * dx + (e.y - ay) * dy) / l2, 0, 1);
      if (dist2(e.x, e.y, ax + dx * t, ay + dy * t) > (e.radius + 16) ** 2) continue;
      this.grid.seen(e);
      if (charge) {
        hitEnemy(this, e, dmg, { weapon: this.run.held, type: 'physical', kb: 280, fromX: ax, fromY: ay });
        continue;
      }
      const exec = this.run.held.extra.execute ?? 0;
      if (!e.boss && (e.hp - dmg) / e.maxHp < (e.elite ? exec / 2 : exec)) {
        hitEnemy(this, e, e.hp + 1, { weapon: this.run.held, type: 'physical', kb: 80, fromX: ax, fromY: ay, executed: true, canCrit: false });
      } else hitEnemy(this, e, dmg, { weapon: this.run.held, type: 'physical', kb: 80, fromX: ax, fromY: ay });
    }
  }

  private useConsumable() {
    const c = this.run.consumables.find((x) => x.count > 0);
    if (!c) {
      this.emit({ type: 'message', text: 'No jars left.', tone: 'info' });
      return;
    }
    c.count--;
    const max = this.run.stats.maxHp * (this.run.cls.id === 'alchemist' ? 0.7 : 1);
    if (c.id === 'chilli_jam') {
      healPlayer(this, max * 0.2, true, 999);
      this.player.buffT = Math.max(this.player.buffT, 8);
      this.player.buffAs += 0.3;
      this.run.tempMods.attackSpeed = (this.run.tempMods.attackSpeed ?? 0) + 0.3;
      this.run.recompute();
    } else if (c.id === 'balm_tonic') {
      healPlayer(this, max * 0.2, true, 999);
      this.player.iframes = Math.max(this.player.iframes, 2);
    } else {
      healPlayer(this, max * 0.35, true, 999);
    }
    this.fx({ type: 'drink', x: this.player.x, y: this.player.y - 10 });
    this.sfx('drink', 0.9);
  }

  // -------------------------------------------------------------------------
  // Enemies

  private updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies.items) {
      if (!e.active) continue;
      if (e.spawnT > 0) {
        e.spawnT -= dt;
        continue;
      }
      e.t += dt;
      if (e.flash > 0) e.flash -= dt;
      updateStatuses(this, e, dt);
      if (!e.active) continue;

      // AI sets e.vx/e.vy (desired velocity) and handles attacks.
      updateEnemyAi(this, e, dt);
      if (!e.active) continue;

      let mul = 1 - e.slow;
      if (e.frozenT > 0 || e.rootT > 0) mul = 0;
      const kd = approach(9, dt);
      e.x += (e.vx * mul + e.kx) * dt;
      e.y += (e.vy * mul + e.ky) * dt;
      e.kx -= e.kx * kd;
      e.ky -= e.ky * kd;
      if (Math.abs(e.vx) > 2) e.facing = e.vx > 0 ? 1 : -1;
    }
    // Separation so swarms spread instead of stacking.
    for (const e of this.enemies.items) {
      if (!e.active || e.hidden || e.spawnT > 0 || e.boss) continue;
      const list = this.queryEnemies(e.x, e.y, e.radius * 2);
      let n = 0;
      for (const o of list) {
        if (o === e || o.boss) continue;
        const dx = e.x - o.x;
        const dy = e.y - o.y;
        const rr = (e.radius + o.radius) * 0.9;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-4) {
          const d = Math.sqrt(d2);
          const push = ((rr - d) / d) * 0.25;
          e.x += dx * push;
          e.y += dy * push;
          if (++n > 6) break;
        }
      }
      this.constrain(e, e.radius, !!e.def.flying);
    }
    // Contact damage.
    if (!p.dead) {
      for (const e of this.enemies.items) {
        if (!e.active || e.hidden || e.spawnT > 0 || e.state === 'dying' || e.state === 'intro') continue;
        const rr = e.radius + p.hitbox;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
          const mult = e.state === 'charge' ? 1.4 : 1;
          if (damagePlayer(this, e.contact * e.dmgMult * mult, e.x, e.y, e.def.name)) {
            e.kx -= Math.cos(angleTo(e.x, e.y, p.x, p.y)) * 60 * (1 - e.def.kbResist);
            e.ky -= Math.sin(angleTo(e.x, e.y, p.x, p.y)) * 60 * (1 - e.def.kbResist);
          }
        }
      }
      // Decoy takes contact hits.
      const d = this.decoy;
      if (d && d.active) {
        for (const e of this.queryEnemies(d.x, d.y, 12)) {
          if (dist2(e.x, e.y, d.x, d.y) < (e.radius + 6) ** 2) d.hp -= e.contact * e.dmgMult * dt * 3;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Player projectiles

  private updateProjectiles(dt: number) {
    for (const p of this.projs.items) {
      if (!p.active) continue;
      p.age += dt;
      p.rot += p.spin * dt;
      if (p.kind === 'lob' || p.kind === 'shell') {
        const t = clamp(p.age / p.flight, 0, 1);
        p.x = p.sx + (p.tx - p.sx) * t;
        p.y = p.sy + (p.ty - p.sy) * t;
        p.z = Math.sin(t * Math.PI) * (p.kind === 'shell' ? 70 : 36);
        if (t >= 1) this.landProjectile(p);
        continue;
      }
      if (p.kind === 'crown') {
        this.updateCrown(p, dt);
        if (!p.active) continue;
      } else {
        // Seeking shots (motes) bend towards the nearest enemy.
        if (p.homing > 0) {
          const e = findNearest(this, p.x, p.y, 170);
          if (e) {
            const want = angleTo(p.x, p.y, e.x, e.y - 4);
            const cur = Math.atan2(p.vy, p.vx);
            let d = want - cur;
            while (d > Math.PI) d -= TAU;
            while (d < -Math.PI) d += TAU;
            const na = cur + clamp(d, -p.homing * dt, p.homing * dt);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(na) * sp;
            p.vy = Math.sin(na) * sp;
            p.rot = na;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      // Root Staff: roots rip up through the ground along the shot's path.
      if (p.weapon?.extra.rootTrail && p.kind === 'shot') {
        p.trailT -= dt;
        if (p.trailT <= 0) {
          p.trailT = 0.06;
          explode(this, p.x, p.y, p.area || 15, p.damage * 0.6, { weapon: p.weapon, type: 'physical', kb: p.knockback, visual: 'none', canCrit: true });
          this.fx({ type: 'erupt', x: p.x, y: p.y + 3, c: 10, s: 'dirt' });
        }
      }
      if (p.kind === 'roll' && p.weapon) {
        p.dropT -= dt;
        if (p.dropT <= 0) {
          p.dropT = p.weapon.extra.dropEvery ?? 0.25;
          const a = this.rng.angle();
          const c = this.spawnChunk(p, a);
          if (c) c.damage = p.damage * 0.3;
        }
      }
      if (p.weapon?.extra.trailFire && p.kind === 'shot') {
        p.trailT -= dt;
        if (p.trailT <= 0) {
          p.trailT = 0.07;
          this.spawnFire(p.x, p.y, 9, 1.6, p.damage * 0.25, p.weapon);
        }
      }
      if (p.kind !== 'crown' && p.age >= p.life) {
        this.expireProjectile(p);
        continue;
      }
      const m = this.map.margin;
      if (p.x < m - 20 || p.y < m - 20 || p.x > this.map.w - m + 20 || p.y > this.map.h - m + 20) {
        this.projs.release(p);
        continue;
      }
      if (p.kind === 'shot' || p.kind === 'thorn' || p.kind === 'mote' || p.kind === 'shard') {
        let blocked = false;
        for (const ob of this.map.obstacles) {
          if (!ob.blocks) continue;
          if (dist2(p.x, p.y, ob.x, ob.y) < (ob.r + p.radius * 0.5) ** 2) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          this.fx({ type: 'hit', x: p.x, y: p.y });
          this.expireProjectile(p);
          continue;
        }
      }
      // Hit enemies.
      const list = this.queryEnemies(p.x, p.y, p.radius);
      for (const e of list) {
        if (!p.active) break;
        if (e.invulnerable || e.spawnT > 0 || !e.active) continue;
        const rr = p.radius + e.radius;
        if (dist2(p.x, p.y, e.x, e.y - (e.def.hover ?? 0) * 0.5) > rr * rr) continue;
        if (p.hits.includes(e.id)) continue;
        p.hits.push(e.id);
        if (p.hits.length > 64) p.hits.shift();
        const wi = p.weapon;
        const dmgSrc = p.kind === 'thorn' || p.kind === 'shard' ? 'explosion' : 'direct';
        hitEnemy(this, e, p.damage, {
          weapon: wi,
          type: p.dmgType,
          kb: p.knockback,
          fromX: p.x - p.vx * 0.05,
          fromY: p.y - p.vy * 0.05,
          status: p.status,
          canCrit: p.canCrit,
          source: dmgSrc,
        });
        if (p.kind === 'crown' && wi?.extra.drain) healPlayer(this, wi.extra.drain, false, 3);
        if (wi?.extra.heavy && p.kind === 'shot') {
          this.shake(1.5, 0.08);
        }
        if (p.pierce > 0) {
          p.pierce--;
          continue;
        }
        if (p.bounce > 0) {
          p.bounce--;
          const next = this.nearestExcept(p.x, p.y, 120, p.hits);
          if (next) {
            const a = angleTo(p.x, p.y, next.x, next.y);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(a) * sp;
            p.vy = Math.sin(a) * sp;
            p.rot = a;
            p.age = 0;
            continue;
          }
        }
        this.expireProjectile(p);
      }
    }
  }

  private nearestExcept(x: number, y: number, r: number, ex: number[]): Enemy | null {
    let best: Enemy | null = null;
    let bd = r * r;
    for (const e of this.queryEnemies(x, y, r)) {
      if (ex.includes(e.id) || e.invulnerable) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private updateCrown(p: Projectile, dt: number) {
    const pl = this.player;
    if (!p.returning) {
      const sp = Math.hypot(p.vx, p.vy);
      const ns = sp - 320 * dt;
      if (ns <= 20 || p.age > 1.4) {
        p.returning = true;
        p.hits.length = 0;
      } else {
        p.vx *= ns / sp;
        p.vy *= ns / sp;
      }
    } else {
      const a = angleTo(p.x, p.y, pl.x, pl.y - 4);
      const sp = Math.min(420, Math.hypot(p.vx, p.vy) + 600 * dt);
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      if (dist2(p.x, p.y, pl.x, pl.y - 4) < 100) {
        this.projs.release(p);
        return;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  private spawnChunk(p: Projectile, a: number) {
    const c = this.projs.obtain();
    if (!c) return null;
    c.kind = 'chunk';
    c.x = p.x;
    c.y = p.y;
    const sp = this.rng.range(150, 210);
    c.vx = Math.cos(a) * sp;
    c.vy = Math.sin(a) * sp;
    c.z = 0;
    c.sprite = 'p_chunk_' + this.rng.int(0, 2);
    c.scale = 1;
    c.radius = 3;
    c.damage = p.damage * p.splitDamage;
    c.dmgType = p.dmgType;
    c.pierce = p.weapon && p.weapon.level >= 5 && p.weapon.def.id === 'turnip_cannon' ? 1 : 0;
    c.bounce = 0;
    c.life = this.rng.range(0.25, 0.4);
    c.age = 0;
    c.rot = a;
    c.spin = this.rng.range(-12, 12);
    c.knockback = p.knockback * 0.3;
    c.split = 0;
    c.chain = 0;
    c.area = 0;
    c.status = p.status;
    c.weapon = p.weapon;
    c.hits.length = 0;
    c.hits.push(...p.hits.slice(-1));
    c.canCrit = true;
    c.isEcho = true;
    c.returning = false;
    c.homing = 0;
    c.tint = 0;
    return c;
  }

  private expireProjectile(p: Projectile) {
    // A moonberry bursts into seeking motes.
    if (p.weapon?.def.behaviour === 'moon' && p.split > 0 && p.kind === 'shot') {
      spawnMotes(this, p.x, p.y, p.split, p.damage * p.splitDamage, p.weapon.params.pierce, p.weapon);
      this.fx({ type: 'moonstep', x: p.x, y: p.y, c: 16 });
      this.projs.release(p);
      return;
    }
    if (p.split > 0 && (p.kind === 'shot' || p.kind === 'roll')) {
      const base = this.rng.angle();
      for (let i = 0; i < p.split; i++) this.spawnChunk(p, base + (TAU * i) / p.split);
      this.fx({ type: 'chunks', x: p.x, y: p.y });
      this.sfx('crunch', 0.5);
    }
    this.projs.release(p);
  }

  private landProjectile(p: Projectile) {
    const wi = p.weapon;
    const x = p.tx;
    const y = p.ty;
    if (p.kind === 'lob') {
      const r = p.area * 0.75;
      explode(this, x, y, r, p.damage, { weapon: wi, type: p.dmgType, kb: p.knockback, status: p.status, visual: 'none' });
      const fire = !!wi?.extra.firePuddle || p.tint === 3;
      this.fx({ type: 'splat', x, y, c: p.area, s: fire ? 'fire' : 'poison' });
      this.sfx('splat', 0.6);
      if (wi && fire) this.spawnFire(x, y, p.area, wi.params.duration, p.damage * 0.25, wi);
      else this.spawnPuddle(x, y, p.area, wi ? wi.params.duration * (1 + this.run.stats.statusDuration * 0.5) : 3, p.damage * 0.2, wi, p.status);
    } else {
      const r = p.area;
      const isBomblet = p.tint === 1;
      explode(this, x, y, r, p.damage, { weapon: wi, type: p.dmgType, kb: p.knockback, status: p.status, visual: isBomblet ? 'small' : 'big' });
      if (wi?.extra.firePatch) this.spawnFire(x, y, r * 0.8, 3, p.damage * 0.12, wi);
      if (!isBomblet && wi?.extra.bomblets && p.split > 0) {
        for (let i = 0; i < p.split; i++) {
          const b = this.projs.obtain();
          if (!b) break;
          Object.assign(b, { kind: 'shell', sx: x, sy: y, x, y, z: 0, flight: 0.35 + this.rng.range(0, 0.15), age: 0, radius: 4, damage: p.damage * 0.4, dmgType: p.dmgType, pierce: 0, bounce: 0, life: 1, rot: 0, spin: 8, knockback: 40, split: 0, chain: 0, area: r * 0.55, status: p.status, weapon: wi, canCrit: true, isEcho: true, returning: false, homing: 0, tint: 1, sprite: 'p_ember_0', scale: 1 });
          b.hits.length = 0;
          const a = this.rng.angle();
          const d = this.rng.range(28, 70);
          b.tx = x + Math.cos(a) * d;
          b.ty = y + Math.sin(a) * d;
          b.life = b.flight;
        }
      }
      if (!isBomblet && wi?.extra.thornSplit && p.split > 0) {
        for (let i = 0; i < p.split; i++) {
          const t = this.projs.obtain();
          if (!t) break;
          const a = (TAU * i) / p.split;
          Object.assign(t, { kind: 'thorn', x, y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, z: 0, sprite: 'p_thorn', scale: 1, radius: 2.5, damage: p.damage * 0.3, dmgType: 'physical', pierce: wi.params.pierce, bounce: 0, life: 0.5, age: 0, rot: a, spin: 0, knockback: 20, split: 0, chain: 0, area: 0, status: p.status, weapon: wi, canCrit: true, isEcho: true, returning: false, homing: 0, tint: 0 });
          t.hits.length = 0;
        }
      }
    }
    this.projs.release(p);
  }

  spawnPuddle(x: number, y: number, r: number, life: number, dmg: number, wi: WeaponInstance | null, status: import('../data/types').StatusApply[]) {
    const h = this.hazards.obtain();
    if (!h) return;
    h.kind = 'poison';
    h.owner = 'player';
    h.x = x;
    h.y = y;
    h.radius = r;
    h.life = life;
    h.age = 0;
    h.damage = dmg;
    h.tick = 0.5;
    h.tickT = 0;
    h.status = status.find((s) => s.id === 'poison') ?? { id: 'poison', power: 4, duration: 2 };
    h.weapon = wi;
    h.slot = wi?.slot ?? 9;
    h.blocks = false;
    h.reflect = false;
    h.warn = 0;
    h.dmgType = 'nature';
  }

  spawnFire(x: number, y: number, r: number, life: number, dmg: number, wi: WeaponInstance | null) {
    const h = this.hazards.obtain();
    if (!h) return;
    h.kind = 'fire';
    h.owner = 'player';
    h.x = x;
    h.y = y;
    h.radius = r;
    h.life = life;
    h.age = 0;
    h.damage = dmg;
    h.tick = 0.5;
    h.tickT = 0;
    h.status = { id: 'burn', power: Math.max(3, dmg * 0.8), duration: 1.5 };
    h.weapon = wi;
    h.slot = 9;
    h.blocks = false;
    h.reflect = false;
    h.warn = 0;
    h.dmgType = 'elemental';
  }

  // -------------------------------------------------------------------------
  // Enemy bullets

  private updateBullets(dt: number) {
    const p = this.player;
    const hb = p.hitbox;
    for (const b of this.bullets.items) {
      if (!b.active) continue;
      b.age += dt;
      if (b.age >= b.life) {
        this.bullets.release(b);
        continue;
      }
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      if (b.homing && b.homingT > 0) {
        b.homingT -= dt;
        const want = angleTo(b.x, b.y, this.targetX, this.targetY);
        let d = want - b.angle;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        b.angle += clamp(d, -b.homing * dt, b.homing * dt);
      }
      b.speed = clamp(b.speed + b.accel * dt, b.minSpeed, b.maxSpeed);
      b.angle += b.angVel * dt;
      const sp = this.settings.intensity === 'gentle' ? b.speed * 0.85 : b.speed;
      b.x += Math.cos(b.angle) * sp * dt;
      b.y += Math.sin(b.angle) * sp * dt;
      const m = this.map.margin;
      if (b.x < m - 30 || b.y < m - 30 || b.x > this.map.w - m + 30 || b.y > this.map.h - m + 30) {
        this.bullets.release(b);
        continue;
      }
      let gone = false;
      if (!this.arenaOn) {
        for (const ob of this.map.obstacles) {
          if (ob.blocks && dist2(b.x, b.y, ob.x, ob.y) < (ob.r + b.radius * 0.5) ** 2) {
            gone = true;
            break;
          }
        }
      }
      if (gone) {
        this.fx({ type: 'bulletpop', x: b.x, y: b.y });
        this.bullets.release(b);
        continue;
      }
      // Decoy absorbs.
      const d = this.decoy;
      if (d && d.active && dist2(b.x, b.y, d.x, d.y - 6) < (b.radius + 7) ** 2) {
        d.hp -= b.damage;
        this.fx({ type: 'bulletpop', x: b.x, y: b.y });
        this.bullets.release(b);
        continue;
      }
      const rr = b.radius + hb;
      if (!p.dead && dist2(b.x, b.y, p.x, p.y - 4) < rr * rr) {
        // Dashing through a bullet dodges it, and so does the brief grace after a
        // hit: bullets are only spent when they actually hurt (or hit a ward).
        if (p.dashT > 0 || p.reapT > 0) continue;
        if (p.iframes > 0) continue;
        damagePlayer(this, b.damage, b.x, b.y, this.bulletCause(b.sprite));
        this.fx({ type: 'bulletpop', x: b.x, y: b.y });
        this.bullets.release(b);
      }
    }
  }

  private bulletCause(sprite: string): string {
    if (sprite.includes('pollen')) return 'Blight Moth pollen';
    if (sprite.includes('violet') || sprite.includes('small_pink')) return 'a Scarecrow Husk barrage';
    if (sprite.includes('cyan')) return 'a Harvest Wraith ring';
    if (sprite.includes('thorn')) return this.boss ? 'the Marrow King’s roots' : 'flying thorns';
    if (sprite.includes('gold') || sprite.includes('ring')) return 'a Royal Decree';
    if (sprite.includes('mud')) return 'a flung clod of mud';
    if (sprite.includes('spore')) return 'spores';
    return 'an enemy shot';
  }

  clearBullets(fx = true) {
    for (const b of this.bullets.items) {
      if (!b.active) continue;
      if (fx && this.rng.chance(0.3)) this.fx({ type: 'bulletpop', x: b.x, y: b.y });
      this.bullets.release(b);
    }
    for (const e of this.emitters.items) if (e.active) this.emitters.release(e);
    for (const h of this.hazards.items) if (h.active && h.owner === 'enemy') this.hazards.release(h);
  }

  // -------------------------------------------------------------------------
  // Hazards

  private updateHazards(dt: number) {
    const p = this.player;
    for (const h of this.hazards.items) {
      if (!h.active) continue;
      h.age += dt;
      if (h.age >= h.life) {
        if (h.kind === 'seedpod' && h.burst) {
          this.burstRing(h);
        }
        this.hazards.release(h);
        continue;
      }
      if (h.owner === 'player') {
        if (h.kind === 'telegraph') continue;
        h.tickT -= dt;
        if (h.kind === 'briar') {
          this.briarBlock(h);
          if (h.tickT <= 0) {
            h.tickT = h.tick;
            for (const e of this.queryEnemies(h.x, h.y, h.radius)) {
              if (dist2(h.x, h.y, e.x, e.y) > (h.radius + e.radius) ** 2) continue;
              hitEnemy(this, e, h.damage, { weapon: h.weapon, type: 'nature', kb: 30, fromX: h.x, fromY: h.y, status: h.status ? [h.status] : undefined, canCrit: true, source: 'summon' });
            }
          }
          continue;
        }
        if (h.tickT <= 0) {
          h.tickT = h.tick;
          for (const e of this.queryEnemies(h.x, h.y, h.radius)) {
            if (e.def.flying && h.kind !== 'spores') continue;
            if (dist2(h.x, h.y, e.x, e.y) > (h.radius + e.radius * 0.5) ** 2) continue;
            hitEnemy(this, e, h.damage, { weapon: h.weapon, type: h.dmgType, kb: 0, status: h.status ? [h.status] : undefined, canCrit: false, source: 'summon' });
          }
        }
        continue;
      }
      // Enemy hazards.
      if (h.kind === 'zone') {
        if (!h.fired && h.age >= h.warn) {
          h.fired = true;
          this.fx({ type: 'erupt', x: h.x, y: h.y, c: h.radius, s: h.sprite });
          this.sfx('erupt', 0.6);
          if (!p.dead && dist2(h.x, h.y, p.x, p.y) < (h.radius + p.hitbox) ** 2) damagePlayer(this, h.damage, h.x, h.y, this.boss ? 'Root Judgment' : 'erupting roots');
          if (this.decoy && dist2(h.x, h.y, this.decoy.x, this.decoy.y) < h.radius * h.radius) this.decoy.hp -= h.damage;
          if (h.burst && h.burstCount) this.burstRing(h);
        }
      } else if (h.kind === 'seedpod') {
        if (!h.fired && h.age >= h.warn) {
          h.fired = true;
          this.fx({ type: 'seedland', x: h.x, y: h.y, c: h.radius });
          this.sfx('thud', 0.5);
          if (!p.dead && dist2(h.x, h.y, p.x, p.y) < (h.radius + p.hitbox) ** 2) damagePlayer(this, h.damage, h.x, h.y, 'a falling royal seed');
        }
      } else if (h.kind === 'rootwall') {
        if (!p.dead && dist2(h.x, h.y, p.x, p.y) < (h.radius + p.hitbox) ** 2) damagePlayer(this, h.damage, h.x, h.y, 'writhing roots');
      }
    }
  }

  private burstRing(h: Hazard) {
    if (!h.burst) return;
    const base = this.rng.angle();
    for (let i = 0; i < h.burstCount; i++) spawnBullet(this, h.x, h.y - 2, base + (TAU * i) / h.burstCount, h.burst, 1);
    this.sfx('enemy_shot', 0.4);
    h.burst = null;
  }

  private briarBlock(h: Hazard) {
    for (const b of this.bullets.items) {
      if (!b.active) continue;
      if (dist2(b.x, b.y, h.x, h.y) > (h.radius + b.radius) ** 2) continue;
      if (h.reflect && h.weapon) {
        const pr = this.projs.obtain();
        if (pr) {
          const a = b.angle + Math.PI + this.rng.range(-0.3, 0.3);
          Object.assign(pr, { kind: 'reflected', x: b.x, y: b.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, z: 0, sprite: b.sprite, scale: 1, radius: b.radius, damage: b.damage * 1.5 * h.weapon.dmgMult, dmgType: 'nature', pierce: 0, bounce: 0, life: 1.2, age: 0, rot: a, spin: 0, knockback: 20, split: 0, chain: 0, area: 0, status: [], weapon: h.weapon, canCrit: true, isEcho: true, returning: false, homing: 0, tint: 2 });
          pr.hits.length = 0;
          pr.kind = 'shot';
          pr.tint = 2;
        }
      }
      this.fx({ type: 'bulletpop', x: b.x, y: b.y });
      this.bullets.release(b);
    }
    // Briars are semi-solid to enemies.
    for (const e of this.queryEnemies(h.x, h.y, h.radius)) {
      if (e.boss || e.def.flying) continue;
      const dx = e.x - h.x;
      const dy = e.y - h.y;
      const rr = h.radius + e.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 1e-4) {
        const d = Math.sqrt(d2);
        const push = (rr - d) * (e.elite ? 0.1 : 0.4);
        e.x += (dx / d) * push;
        e.y += (dy / d) * push;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Summons owned by the world (mites, decoys). Weapon summons update in weapons.ts.

  private updateSummons(dt: number) {
    for (const s of this.summons.items) {
      if (!s.active) continue;
      if (updateClassSummon(this, s, dt)) continue;
      if (s.kind === 'decoy') {
        s.life -= dt;
        s.t += dt;
        if (s.life <= 0 || s.hp <= 0) {
          this.fx({ type: 'poof', x: s.x, y: s.y - 6 });
          this.summons.release(s);
          if (this.decoy === s) this.decoy = null;
        }
        continue;
      }
      if (s.kind !== 'mite') continue;
      s.life -= dt;
      s.cd -= dt;
      if (s.life <= 0) {
        this.fx({ type: 'poof', x: s.x, y: s.y });
        this.summons.release(s);
        continue;
      }
      if (!s.target || !s.target.active) s.target = findNearest(this, s.x, s.y, 140);
      if (!s.target) continue;
      const a = angleTo(s.x, s.y, s.target.x, s.target.y);
      s.x += Math.cos(a) * 150 * dt;
      s.y += Math.sin(a) * 150 * dt;
      s.facing = Math.cos(a) >= 0 ? 1 : -1;
      if (s.cd <= 0 && dist2(s.x, s.y, s.target.x, s.target.y) < (s.target.radius + 4) ** 2) {
        s.cd = 0.4;
        const wi = s.weapon;
        hitEnemy(this, s.target, 4 + (wi ? wi.damage() * 0.3 : 0), { weapon: wi, type: 'nature', kb: 10, fromX: s.x, fromY: s.y, source: 'summon', mite: true });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pickups

  private updatePickups(dt: number) {
    const p = this.player;
    const reach = 58 * (1 + this.run.stats.pickupRadius);
    const reach2 = reach * reach;
    for (const k of this.pickups.items) {
      if (!k.active) continue;
      k.age += dt;
      if (k.age > k.life) {
        this.pickups.release(k);
        continue;
      }
      if (k.z > 0 || k.vz > 0) {
        k.vz -= 320 * dt;
        k.z = Math.max(0, k.z + k.vz * dt);
        if (k.z === 0 && k.vz < 0) k.vz = 0;
      }
      if (!k.magnet) {
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        const f = approach(5, dt);
        k.vx -= k.vx * f;
        k.vy -= k.vy * f;
        if (k.age > 0.35 && !p.dead && dist2(k.x, k.y, p.x, p.y) < reach2 && k.kind !== 'chest') k.magnet = true;
        // Sap left lying about slowly finds its own way to you.
        if (k.kind === 'sap' && k.age > 3.5 && !p.dead && dist2(k.x, k.y, p.x, p.y) < 160 * 160) k.magnet = true;
        if (k.kind === 'chest' && !p.dead && dist2(k.x, k.y, p.x, p.y) < 18 * 18) this.collect(k);
        continue;
      }
      const a = angleTo(k.x, k.y, p.x, p.y - 4);
      const sp = 140 + k.age * 60 + (this.phase === 'lull' ? 200 : 0);
      // Never step past you: a fast pickup would otherwise orbit forever.
      const d = dist(k.x, k.y, p.x, p.y - 4);
      const step = Math.min(sp * dt, d);
      k.x += Math.cos(a) * step;
      k.y += Math.sin(a) * step;
      if (d - step < 8) this.collect(k);
    }
  }

  private collect(k: Pickup) {
    const run = this.run;
    switch (k.kind) {
      case 'sap': {
        const v = k.value * (1 + run.stats.sapYield);
        run.sap += v;
        run.sapCollected += v;
        const before = run.pendingLevels;
        run.addXp(v);
        if (run.pendingLevels > before) this.emit({ type: 'levelup' });
        this.fx({ type: 'sap', x: k.x, y: k.y, a: k.value });
        break;
      }
      case 'farthing':
        run.loot.farthings += k.value;
        this.fx({ type: 'coin', x: k.x, y: k.y });
        break;
      case 'material':
        run.loot.materials[k.id] = (run.loot.materials[k.id] ?? 0) + k.value;
        this.emit({ type: 'pickup', kind: 'material', id: k.id, rarity: k.rarity });
        this.fx({ type: 'loot', x: k.x, y: k.y, a: k.rarity });
        break;
      case 'seed':
        run.loot.seeds.push({ species: k.id, traits: k.traits as TraitId[] });
        this.emit({ type: 'pickup', kind: 'seed', id: k.id, rarity: k.rarity, traits: k.traits });
        this.fx({ type: 'loot', x: k.x, y: k.y, a: Math.max(2, k.rarity) });
        break;
      case 'heart':
        healPlayer(this, 12, true, 999);
        break;
      case 'chest':
        this.stats.chests++;
        this.emit({ type: 'chest', x: k.x, y: k.y });
        this.fx({ type: 'chest', x: k.x, y: k.y });
        this.sfx('chest', 1);
        break;
      case 'jam':
        run.consumables.push({ id: 'jam', count: 1 });
        break;
    }
    if (k.kind !== 'chest') this.sfx(k.kind === 'sap' ? 'sap' : k.kind === 'farthing' ? 'coin' : k.kind === 'heart' ? 'heal' : 'loot', k.kind === 'sap' ? 0.35 : 0.8);
    this.pickups.release(k);
  }

  // -------------------------------------------------------------------------
  // Items with special behaviour.

  private updateItems(dt: number) {
    const bell = this.run.hookValue('rustyBell');
    if (bell) {
      this.bellT -= dt;
      if (this.bellT <= 0) {
        this.bellT = Math.max(3, 7 - (this.run.hasItem('rusty_bell') - 1));
        const p = this.player;
        this.fx({ type: 'bell', x: p.x, y: p.y - 6, c: 70 });
        this.sfx('bell', 0.8);
        for (const e of this.queryEnemies(p.x, p.y, 70)) {
          const a = angleTo(p.x, p.y, e.x, e.y);
          e.kx += Math.cos(a) * 160 * (1 - e.def.kbResist);
          e.ky += Math.sin(a) * 160 * (1 - e.def.kbResist);
          if (e.def.small) e.fearT = 1.6;
        }
      }
    }
    const hearts = this.run.hasItem('compost_heart');
    const every = ITEMS.compost_heart.hookValue ?? 150;
    if (hearts && this.statusDamageAcc >= every) {
      this.statusDamageAcc -= every;
      healPlayer(this, 3 * hearts, true, 999);
    }
    if (!hearts) this.statusDamageAcc = 0;
    // Recent damage output, for the director.
    this.dpsWindow.push(this.stats.damageDealt);
    this.dpsTimes.push(this.t);
    while (this.dpsTimes.length > 1 && this.t - this.dpsTimes[0] > 15) {
      this.dpsTimes.shift();
      this.dpsWindow.shift();
    }
  }

  recentDps(): number {
    const n = this.dpsTimes.length;
    const span = n > 1 ? this.dpsTimes[n - 1] - this.dpsTimes[0] : 0;
    if (span < 1) return 0;
    return (this.dpsWindow[n - 1] - this.dpsWindow[0]) / span;
  }

  // -------------------------------------------------------------------------
  // Props: Mags's cart, the way home, the Root shrine.

  private updateProps(dt: number) {
    const p = this.player;
    this.nearProp = null;
    for (const pr of this.props) {
      if (!pr.active) continue;
      const d2 = dist2(p.x, p.y, pr.x, pr.y);
      if (pr.kind === 'shrine') {
        if (d2 < 48 * 48 && !p.dead) {
          pr.progress = (pr.progress ?? 0) + dt;
          if (pr.progress >= 12) this.director.completeShrine(pr);
        }
        continue;
      }
      if (d2 < (pr.r + 18) ** 2) this.nearProp = pr;
    }
  }

  /** Sweep up everything still lying on the field (end of a won expedition). */
  collectAll() {
    for (const k of this.pickups.items) if (k.active) this.collect(k);
  }

  private interact(pr: Prop) {
    if (pr.kind === 'cart') this.emit({ type: 'shop' });
    else if (pr.kind === 'exit') this.emit({ type: 'extractPrompt' });
  }

  // -------------------------------------------------------------------------
  // Phase changes.

  onEliteKilled(e: Enemy) {
    this.stats.elites++;
    if (this.elite === e) this.elite = null;
    this.shake(4, 0.3);
    this.hitstop(0.08);
    this.emit({ type: 'message', text: `${e.def.name} defeated.`, tone: 'good' });
  }

  onBossKilled(e: Enemy) {
    if (e.state === 'dying') return;
    e.state = 'dying';
    e.stateT = 0;
    e.invulnerable = true;
    e.hp = 0;
    this.clearBullets();
    this.stats.bosses++;
    this.shake(6, 1.2);
    this.hitstop(0.12);
    this.sfx('boss_death', 1);
    this.fx({ type: 'bossdeath', x: e.x, y: e.y });
    this.director.bossDefeated(e);
  }

  onPlayerDeath(cause: string) {
    const p = this.player;
    p.dead = true;
    this.phase = 'defeat';
    this.fx({ type: 'playerdeath', x: p.x, y: p.y });
    this.sfx('defeat', 1);
    this.shake(5, 0.4);
    this.emit({ type: 'defeat', cause });
  }

  extract() {
    if (this.phase !== 'lull') return;
    this.phase = 'extracted';
    this.emit({ type: 'message', text: 'You load the haycart and head for home.', tone: 'good' });
  }

  pressOn() {
    this.director.pressOn();
  }

  /** Apply a level-up choice; called by the UI layer after the player picks. */
  consumeLevel() {
    if (this.run.pendingLevels > 0) {
      this.run.pendingLevels--;
      this.run.level++;
    }
  }

  // -------------------------------------------------------------------------

  /** Wither the field at the end of an acre: enemies crumble, sap flies home. */
  witherField() {
    for (const e of this.enemies.items) {
      if (!e.active || e.boss) continue;
      if (e.elite) {
        // An elite that outlasted the acre slinks away rather than haunting the lull.
        this.emit({ type: 'message', text: `${e.def.name} withdraws into the hedges.`, tone: 'info' });
        this.fx({ type: 'blink', x: e.x, y: e.y - 10 });
        if (this.elite === e) this.elite = null;
        this.enemies.release(e);
        continue;
      }
      dropSap(this, e.x, e.y, Math.ceil(e.def.sap * 0.5));
      this.fx({ type: 'wither', x: e.x, y: e.y - 4 });
      this.enemies.release(e);
    }
    this.clearBullets(false);
    for (const k of this.pickups.items) if (k.active && k.kind !== 'chest') k.magnet = true;
  }

  /** Total sap the farm will receive as growth, and similar end-of-run numbers. */
  summary() {
    const run = this.run;
    return {
      sapCollected: run.sapCollected,
      sapLeft: run.sap,
      level: run.level,
      kills: this.stats.kills,
      time: this.t,
    };
  }

  /** Debug/test helper: kill everything on screen. */
  debugKillAll() {
    for (const e of this.enemies.items) if (e.active && !e.boss) killEnemy(this, e, null);
  }

  debugWeapon(id: string) {
    if (WEAPONS[id]) this.run.addWeapon(id, [], 1);
  }

  debugSeed() {
    dropSeed(this, this.player.x + 20, this.player.y, { rare: true });
  }
}

export { BOSS_ARENA_RADIUS, doSweep };
