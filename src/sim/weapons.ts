// Weapon instances and behaviours. Each behaviour has its own targeting and
// firing logic, so a Turnip Cannon and a Honeycomb Hive play differently, not
// just look different. Traits and global stats are folded into the numbers in
// `recompute`; behaviour-specific trait hooks live in sim/combat.ts.

import { TAU, angleTo, dist2, wrapAngle } from '../core/math';
import { EVOLUTIONS, MAX_WEAPON_LEVEL } from '../data/weapons';
import { TRAITS, TRAIT_IDS } from '../data/traits';
import type { StatusApply, TraitId, WeaponDef, WeaponParams } from '../data/types';
import type { Stats } from '../data/stats';
import type { Rng } from '../core/rng';
import type { RunState } from './run';
import type { World } from './world';
import type { Enemy, Projectile, Summon } from './entities';
import { explode, hitEnemy, healPlayer, chainLightning } from './combat';
import { classWeaponMult } from './classes';

const PROJ_RADIUS: Record<string, number> = {
  p_pea: 2.5,
  p_seed: 2,
  p_turnip: 5,
  p_chunk: 2.5,
  p_carrot: 3,
  p_kernel: 2.5,
  p_frost: 3,
  boss_crown: 6,
  p_thorn: 2,
  spore: 4,
  p_tomato: 4,
  p_pumpkin: 6,
};

export class WeaponInstance {
  params!: WeaponParams;
  extra: Record<string, number> = {};
  status: StatusApply[] = [];
  held = false;
  slot = 0;
  species: string | null = null;
  cd = 0.3;
  burstLeft = 0;
  burstT = 0;
  burstAim = 0;
  echoT = -1;
  swingCount = 0;
  orbitA = 0;
  orbitPos: { x: number; y: number }[] = [];
  healT = 0;
  flareT = 0;
  sporeT = 0;
  strikeT = 0;
  armT = 0;
  armA = 0;
  threadT = 0;
  summons: Summon[] = [];
  damageDealt = 0;
  kills = 0;
  wildTrait: TraitId | null = null;
  // Effective values with run stats folded in.
  dmgMult = 1;
  critChance = 0.05;
  critMult = 1.5;
  private st: Stats | null = null;
  traitPower = 1;

  constructor(public def: WeaponDef, public traits: TraitId[], public level: number, public uid: number) {
    this.level = Math.max(1, Math.min(MAX_WEAPON_LEVEL, level));
    this.baseParams();
  }

  get allTraits(): TraitId[] {
    return this.wildTrait ? [...this.traits, this.wildTrait] : this.traits;
  }

  hasTrait(t: TraitId): boolean {
    return this.traits.includes(t) || this.wildTrait === t;
  }

  private baseParams() {
    const p: WeaponParams = { ...this.def.base };
    const extra: Record<string, number> = { ...(this.def.extra ?? {}) };
    for (let i = 0; i < this.level - 1 && i < this.def.levels.length; i++) {
      const l = this.def.levels[i];
      for (const k in l.add) (p as any)[k] += (l.add as any)[k];
      for (const k in l.mult) (p as any)[k] *= (l.mult as any)[k];
      for (const k in l.extra) extra[k] = (extra[k] ?? 0) + l.extra[k];
    }
    const status: StatusApply[] = [];
    if (this.def.status) {
      const s = { ...this.def.status };
      if (s.id === 'poison' && extra.poison) s.power += extra.poison;
      if (s.id === 'burn' && extra.burn) s.power += extra.burn;
      status.push(s);
    }
    for (const t of this.allTraits) {
      const td = TRAITS[t];
      for (const k in td.add) (p as any)[k] += (td.add as any)[k];
      for (const k in td.mult) (p as any)[k] *= (td.mult as any)[k];
      if (td.status) status.push({ ...td.status, power: td.status.power * this.traitPower });
    }
    this.params = p;
    this.extra = extra;
    this.status = status;
  }

  recompute(run: RunState) {
    this.traitPower = run.cls.id === 'botanist' ? 1.5 : 1;
    this.baseParams();
    const s = run.stats;
    this.st = s;
    const famKey = ('fam' + this.def.family[0].toUpperCase() + this.def.family.slice(1)) as keyof Stats;
    let m = 1 + s.damage + s[this.def.dmgType] + (s[famKey] ?? 0);
    if (run.cls.id === 'fieldhand' && !this.held) m += 0.05 * run.families().size;
    if (run.cls.id === 'reaper' && this.def.tags.includes('projectile')) m -= 0.3;
    if (this.hasTrait('thorned') && (this.def.behaviour === 'orbit' || this.def.behaviour === 'sweep')) m += 0.2;
    if (this.def.tags.includes('summon')) m *= 1 + s.summonPower;
    m *= classWeaponMult(run.cls.id, this.def.tags, this.held);
    this.dmgMult = Math.max(0.1, m);
    this.critChance = Math.max(0, s.critChance + this.params.critBonus);
    this.critMult = Math.max(1.1, 1 + s.critDamage);
  }

  get stats(): Stats {
    return this.st!;
  }

  damage(): number {
    return this.params.damage * this.dmgMult;
  }

  cooldown(): number {
    return Math.max(0.06, this.params.cooldown / Math.max(0.2, 1 + this.stats.attackSpeed));
  }

  area(): number {
    return this.params.area * (1 + this.stats.area);
  }

  range(): number {
    return this.params.range * (1 + this.stats.range);
  }

  speed(): number {
    return this.params.speed * (1 + this.stats.projSpeed);
  }

  count(): number {
    const shoots = this.def.tags.includes('projectile') || this.def.behaviour === 'lobber' || this.def.behaviour === 'artillery';
    return Math.max(1, Math.round(this.params.count + (shoots ? this.stats.projCount : 0)));
  }

  knockback(): number {
    return this.params.knockback * (1 + this.stats.knockback);
  }

  scale(): number {
    return (this.hasTrait('giant') ? 1.4 : 1) * (this.extra.scale ?? 1);
  }

  evolution(run: RunState) {
    if (this.level < MAX_WEAPON_LEVEL) return null;
    const evo = EVOLUTIONS.find((e) => e.from === this.def.id);
    if (!evo) return null;
    const ok = (evo.needs.trait && this.hasTrait(evo.needs.trait)) || (evo.needs.tag && run.tags().has(evo.needs.tag));
    return ok ? evo : null;
  }

  rollWild(rng: Rng) {
    if (!this.traits.includes('wild')) return;
    const pool = TRAIT_IDS.filter((t) => t !== 'wild' && !this.traits.includes(t));
    this.wildTrait = rng.pick(pool);
  }
}

// ---------------------------------------------------------------------------
// Targeting

function nearestTo(w: World, x: number, y: number, range: number): Enemy | null {
  let best: Enemy | null = null;
  let bd = range * range;
  for (const e of w.enemies.items) {
    if (!e.active || e.invulnerable || e.spawnT > 0) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

function strongest(w: World, x: number, y: number, range: number): Enemy | null {
  let best: Enemy | null = null;
  let hp = -1;
  const r2 = range * range;
  for (const e of w.enemies.items) {
    if (!e.active || e.invulnerable || e.spawnT > 0) continue;
    if (dist2(x, y, e.x, e.y) > r2) continue;
    if (e.hp > hp) {
      hp = e.hp;
      best = e;
    }
  }
  return best;
}

const tmpEnemies: Enemy[] = [];
function randomIn(w: World, x: number, y: number, range: number): Enemy | null {
  tmpEnemies.length = 0;
  const r2 = range * range;
  for (const e of w.enemies.items) {
    if (!e.active || e.invulnerable || e.spawnT > 0) continue;
    if (dist2(x, y, e.x, e.y) <= r2) tmpEnemies.push(e);
  }
  if (!tmpEnemies.length) return null;
  return tmpEnemies[Math.floor(w.rng.next() * tmpEnemies.length)];
}

function cluster(w: World, x: number, y: number, range: number, radius: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestN = 0;
  for (let i = 0; i < 10; i++) {
    const e = randomIn(w, x, y, range);
    if (!e) return null;
    const n = w.queryEnemies(e.x, e.y, radius).length;
    if (n > bestN) {
      bestN = n;
      best = { x: e.x, y: e.y };
    }
  }
  return best;
}

export function acquire(w: World, wi: WeaponInstance): { angle: number; target: Enemy | null; x: number; y: number } | null {
  const p = w.player;
  const range = wi.range();
  switch (wi.def.targeting) {
    case 'aim':
      return { angle: p.aim, target: null, x: p.x + Math.cos(p.aim) * range, y: p.y + Math.sin(p.aim) * range };
    case 'facing':
      return { angle: p.facingAngle, target: null, x: p.x, y: p.y };
    case 'self':
      return { angle: 0, target: null, x: p.x, y: p.y };
    case 'strongest': {
      const e = strongest(w, p.x, p.y, range);
      return e ? { angle: angleTo(p.x, p.y, e.x, e.y), target: e, x: e.x, y: e.y } : null;
    }
    case 'random': {
      const e = randomIn(w, p.x, p.y, range);
      return e ? { angle: angleTo(p.x, p.y, e.x, e.y), target: e, x: e.x, y: e.y } : null;
    }
    case 'cluster': {
      const c = cluster(w, p.x, p.y, range, Math.max(24, wi.area()));
      return c ? { angle: angleTo(p.x, p.y, c.x, c.y), target: null, x: c.x, y: c.y } : null;
    }
    default: {
      const e = nearestTo(w, p.x, p.y, range);
      return e ? { angle: angleTo(p.x, p.y, e.x, e.y), target: e, x: e.x, y: e.y } : null;
    }
  }
}

export function findNearest(w: World, x: number, y: number, range: number) {
  return nearestTo(w, x, y, range);
}

// ---------------------------------------------------------------------------
// Projectile spawning

export function shoot(w: World, wi: WeaponInstance, angle: number, opts: { echo?: boolean; kind?: Projectile['kind']; sprite?: string; speedMul?: number; dmgMul?: number } = {}): Projectile | null {
  const pl = w.player;
  const p = w.projs.obtain();
  if (!p) return null;
  const spd = wi.speed() * (opts.speedMul ?? 1);
  const sprite = opts.sprite ?? wi.def.proj;
  p.kind = opts.kind ?? 'shot';
  p.x = pl.x + Math.cos(angle) * 6;
  p.y = pl.y - 4 + Math.sin(angle) * 6;
  p.vx = Math.cos(angle) * spd;
  p.vy = Math.sin(angle) * spd;
  p.z = 0;
  p.sprite = sprite;
  p.scale = wi.scale();
  p.radius = (PROJ_RADIUS[sprite] ?? 3) * p.scale;
  p.damage = wi.damage() * (opts.dmgMul ?? 1);
  p.dmgType = wi.def.dmgType;
  p.pierce = wi.params.pierce + (wi.def.tags.includes('projectile') ? w.run.hookValue('pierce') : 0);
  p.bounce = wi.params.bounce;
  p.life = wi.range() / Math.max(30, spd);
  p.age = 0;
  p.rot = angle;
  p.spin = 0;
  p.knockback = wi.knockback();
  p.split = wi.params.split;
  p.splitDamage = wi.extra.splitDamage ?? 0.35;
  p.chain = wi.params.chain;
  p.area = wi.area();
  p.status = wi.status;
  p.weapon = wi;
  p.hits.length = 0;
  p.canCrit = true;
  p.isEcho = !!opts.echo;
  p.returning = false;
  p.homing = 0;
  p.dropT = 0;
  p.trailT = 0;
  p.tint = 0;
  return p;
}

function fireVolley(w: World, wi: WeaponInstance, angle: number, echo: boolean) {
  const n = wi.count();
  const spread = wi.params.spread;
  for (let i = 0; i < n; i++) {
    const a = angle + (i - (n - 1) / 2) * spread + (n === 1 ? 0 : 0);
    const p = shoot(w, wi, a, { echo, kind: wi.extra.rolling ? 'roll' : 'shot' });
    if (p && wi.extra.rolling) {
      p.radius = 9 * wi.scale();
      p.life = wi.range() / Math.max(30, wi.speed());
      p.spin = 6;
    }
  }
  w.sfx(wi.def.sfx, wi.held ? 1 : 0.7);
}

function fireLobs(w: World, wi: WeaponInstance, echo: boolean) {
  const pl = w.player;
  const n = wi.count();
  for (let i = 0; i < n; i++) {
    // Aimed lobbers (the Tonic Flask) land where you point; the rest pick a target.
    let tx: number;
    let ty: number;
    if (wi.def.targeting === 'aim') {
      const d = Math.min(wi.range(), Math.hypot(w.input.aimX - pl.x, w.input.aimY - pl.y));
      tx = pl.x + Math.cos(pl.aim) * d + (i ? w.rng.range(-20, 20) : 0);
      ty = pl.y + Math.sin(pl.aim) * d + (i ? w.rng.range(-20, 20) : 0);
    } else {
      const e = randomIn(w, pl.x, pl.y, wi.range());
      if (!e) break;
      tx = e.x + w.rng.range(-8, 8) + e.vx * 0.4;
      ty = e.y + w.rng.range(-8, 8) + e.vy * 0.4;
    }
    const p = shoot(w, wi, angleTo(pl.x, pl.y, tx, ty), { echo, kind: 'lob' });
    if (!p) break;
    p.sx = p.x;
    p.sy = p.y;
    p.tx = tx;
    p.ty = ty;
    if (wi.extra.alternate) {
      wi.swingCount++;
      p.tint = wi.swingCount % 2 ? 3 : 0;
    }
    p.flight = 0.5 + Math.sqrt(dist2(p.x, p.y, p.tx, p.ty)) / 420;
    p.life = p.flight;
    p.spin = w.rng.range(-8, 8);
  }
  w.sfx(wi.def.sfx, 0.6);
}

function fireShells(w: World, wi: WeaponInstance, echo: boolean) {
  const pl = w.player;
  const n = wi.count();
  for (let i = 0; i < n; i++) {
    const c = cluster(w, pl.x, pl.y, wi.range(), Math.max(24, wi.area()));
    if (!c) break;
    const tx = c.x + (i > 0 ? w.rng.range(-30, 30) : 0);
    const ty = c.y + (i > 0 ? w.rng.range(-30, 30) : 0);
    const p = shoot(w, wi, angleTo(pl.x, pl.y, tx, ty), { echo, kind: 'shell' });
    if (!p) break;
    p.sx = p.x;
    p.sy = p.y;
    p.tx = tx;
    p.ty = ty;
    p.flight = (wi.extra.flight ?? 0.8) + i * 0.08;
    p.life = p.flight;
    p.spin = w.rng.range(-4, 4);
    const t = w.hazards.obtain();
    if (t) {
      t.kind = 'telegraph';
      t.owner = 'player';
      t.x = tx;
      t.y = ty;
      t.radius = wi.area();
      t.life = p.flight;
      t.age = 0;
      t.damage = 0;
      t.weapon = wi;
      t.warn = 0;
      t.blocks = false;
      t.reflect = false;
    }
  }
  w.sfx(wi.def.sfx, 0.8);
}

export function doSweep(w: World, wi: WeaponInstance, angle: number) {
  const pl = w.player;
  const range = wi.params.range * (1 + wi.stats.range * 0.5) * (1 + wi.stats.area * 0.5) * (wi.hasTrait('giant') ? 1.2 : 1);
  const arc = wi.extra.arc ?? 1.6;
  const dmg = wi.damage();
  const list = w.queryEnemies(pl.x, pl.y, range + 12);
  let hits = 0;
  for (const e of list) {
    if (e.invulnerable || e.spawnT > 0) continue;
    const d2 = dist2(pl.x, pl.y, e.x, e.y);
    if (d2 > (range + e.radius) ** 2) continue;
    if (arc < TAU - 0.01) {
      const a = angleTo(pl.x, pl.y, e.x, e.y);
      if (Math.abs(wrapAngle(a - angle)) > arc / 2 + 0.15) continue;
    }
    const exec = wi.extra.execute ?? 0;
    if (exec > 0 && !e.boss) {
      const thr = e.elite ? exec * 0.5 : exec;
      if ((e.hp - dmg) / e.maxHp < thr) {
        hitEnemy(w, e, e.hp + 1, { weapon: wi, type: wi.def.dmgType, kb: wi.knockback(), fromX: pl.x, fromY: pl.y, canCrit: false, executed: true });
        hits++;
        continue;
      }
    }
    hitEnemy(w, e, dmg, { weapon: wi, type: wi.def.dmgType, kb: wi.knockback(), fromX: pl.x, fromY: pl.y, status: wi.status });
    hits++;
  }
  w.fx({ type: 'sweep', x: pl.x, y: pl.y - 4, a: angle, b: arc, c: range, s: wi.def.proj });
  w.sfx(wi.def.sfx, wi.held ? 0.9 : 0.6);
  wi.swingCount++;
  if (wi.extra.crescent && wi.swingCount % 3 === 0) {
    const p = shoot(w, wi, angle, { kind: 'crescent', sprite: 'crescent', speedMul: 1, dmgMul: 0.7 });
    if (p) {
      p.vx = Math.cos(angle) * 260;
      p.vy = Math.sin(angle) * 260;
      p.life = 0.7;
      p.radius = 11;
      p.pierce = 99;
      p.knockback = 60;
    }
  }
  return hits;
}

function firePuff(w: World, wi: WeaponInstance, angle: number) {
  const n = wi.count();
  const spread = wi.params.spread;
  for (let i = 0; i < n; i++) {
    const a = angle + w.rng.range(-spread / 2, spread / 2);
    const p = shoot(w, wi, a, { kind: 'mote', sprite: wi.def.proj === 'smoke' ? 'smoke' : 'spore', speedMul: w.rng.range(0.65, 1.1) });
    if (!p) break;
    p.life = wi.range() / Math.max(40, Math.hypot(p.vx, p.vy));
    p.radius = 4.5 * wi.scale();
    p.canCrit = true;
  }
  w.sfx(wi.def.sfx, 0.5);
}

function fireCrown(w: World, wi: WeaponInstance, angle: number, echo: boolean) {
  const n = wi.count();
  for (let i = 0; i < n; i++) {
    const a = angle + (i - (n - 1) / 2) * 0.5;
    const p = shoot(w, wi, a, { echo, kind: 'crown', sprite: 'boss_crown' });
    if (!p) break;
    p.radius = (8 + wi.area() * 0.3) * wi.scale();
    p.life = 6;
    p.spin = 10;
    p.pierce = 999;
  }
  w.sfx('crown', 0.7);
}

function placeBriars(w: World, wi: WeaponInstance) {
  const pl = w.player;
  const dir = pl.moving ? Math.atan2(pl.vy, pl.vx) : pl.facingAngle;
  const n = wi.count();
  const back = 20;
  const cx = pl.x - Math.cos(dir) * back;
  const cy = pl.y - Math.sin(dir) * back;
  const px = -Math.sin(dir);
  const py = Math.cos(dir);
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 13;
    const h = w.hazards.obtain();
    if (!h) break;
    h.kind = 'briar';
    h.owner = 'player';
    h.x = cx + px * off;
    h.y = cy + py * off;
    h.radius = Math.max(8, wi.area());
    h.life = wi.params.duration * (1 + wi.stats.statusDuration * 0.5);
    h.age = 0;
    h.damage = wi.damage();
    h.tick = wi.extra.tick ?? 0.4;
    h.tickT = 0;
    h.status = { id: 'chill', power: 0.4, duration: 0.6 };
    h.weapon = wi;
    h.slot = wi.slot;
    h.blocks = true;
    h.reflect = !!wi.extra.reflect;
    h.warn = 0;
    h.dmgType = 'nature';
  }
  w.sfx('briar', 0.6);
}

// ---------------------------------------------------------------------------
// Per-step update

function triggerFire(w: World, wi: WeaponInstance, echo: boolean): boolean {
  const pl = w.player;
  switch (wi.def.behaviour) {
    case 'shooter':
    case 'lance': {
      const t = acquire(w, wi);
      if (!t) return false;
      if (wi.params.burst > 1) {
        wi.burstLeft = Math.round(wi.params.burst) - 1;
        wi.burstT = wi.params.burstGap;
        wi.burstAim = t.angle;
      }
      fireVolley(w, wi, t.angle, echo);
      return true;
    }
    case 'storm': {
      const t = acquire(w, wi);
      if (!t) return false;
      wi.burstLeft = Math.round(wi.params.burst) - 1;
      wi.burstT = wi.params.burstGap;
      wi.burstAim = t.angle;
      fireVolley(w, wi, t.angle, echo);
      return true;
    }
    case 'lobber':
      if (wi.def.targeting !== 'aim' && !randomIn(w, pl.x, pl.y, wi.range())) return false;
      fireLobs(w, wi, echo);
      return true;
    case 'moon': {
      fireVolley(w, wi, pl.aim, echo);
      return true;
    }
    case 'artillery':
      if (!randomIn(w, pl.x, pl.y, wi.range())) return false;
      fireShells(w, wi, echo);
      return true;
    case 'sweep': {
      let angle = pl.aim;
      if (!wi.held) {
        const e = nearestTo(w, pl.x, pl.y, wi.params.range * (1 + wi.stats.range * 0.5) + 14);
        if (!e) return false;
        angle = angleTo(pl.x, pl.y, e.x, e.y);
      }
      doSweep(w, wi, angle);
      if (wi.params.burst > 1) {
        wi.burstLeft = Math.round(wi.params.burst) - 1;
        wi.burstT = 0.14;
        wi.burstAim = angle;
      }
      return true;
    }
    case 'puffer':
      firePuff(w, wi, pl.aim);
      return true;
    case 'crown': {
      const t = acquire(w, wi);
      if (!t) return false;
      fireCrown(w, wi, t.angle, echo);
      return true;
    }
    case 'briar':
      placeBriars(w, wi);
      return true;
    default:
      return false;
  }
}

export function updateWeapon(w: World, wi: WeaponInstance, dt: number) {
  const pl = w.player;
  if (pl.dead) return;

  // Continuous behaviours.
  if (wi.def.behaviour === 'orbit') return updateOrbit(w, wi, dt);
  if (wi.def.behaviour === 'summoner') return updateSummoner(w, wi, dt);
  if (wi.def.behaviour === 'swarm') return updateSwarm(w, wi, dt);
  if (wi.def.behaviour === 'storm') updateStormArms(w, wi, dt);
  if (wi.extra.strikeEvery) updateStrike(w, wi, dt);

  // Burst follow-ups.
  if (wi.burstLeft > 0) {
    wi.burstT -= dt;
    if (wi.burstT <= 0) {
      wi.burstLeft--;
      wi.burstT = wi.params.burstGap;
      if (wi.def.behaviour === 'sweep') {
        doSweep(w, wi, wi.burstAim + (wi.burstLeft % 2 ? 0.35 : -0.35));
      } else {
        const t = wi.def.targeting === 'aim' ? null : acquire(w, wi);
        fireVolley(w, wi, wi.def.targeting === 'aim' ? pl.aim : t ? t.angle : wi.burstAim, false);
      }
    }
  }

  if (wi.echoT >= 0) {
    wi.echoT -= dt;
    if (wi.echoT < 0) {
      triggerFire(w, wi, true);
      w.fx({ type: 'echo', x: pl.x, y: pl.y - 8 });
    }
  }

  wi.cd -= dt;
  if (wi.cd > 0) return;
  if (wi.held) {
    const firing = w.input.fire || w.settings.autoFire;
    if (!firing) {
      wi.cd = 0;
      return;
    }
    if (w.settings.autoFire && !w.input.fire && wi.def.behaviour !== 'puffer' && !findNearest(w, pl.x, pl.y, wi.range() + 30)) {
      wi.cd = 0;
      return;
    }
  }
  if (triggerFire(w, wi, false)) {
    wi.cd = wi.cooldown();
    if (wi.hasTrait('echoing') && w.rng.chance(0.22 * wi.traitPower)) wi.echoT = 0.16;
  } else {
    wi.cd = 0.1;
  }
}

function updateStormArms(w: World, wi: WeaponInstance, dt: number) {
  const arms = wi.extra.arms ?? 3;
  const rate = (wi.extra.armRate ?? 10) * (1 + wi.stats.attackSpeed * 0.5);
  wi.armA += (wi.extra.armSpin ?? 2.4) * dt;
  wi.armT -= dt;
  while (wi.armT <= 0) {
    wi.armT += 1 / rate;
    for (let i = 0; i < arms; i++) {
      const p = shoot(w, wi, wi.armA + (TAU * i) / arms, { dmgMul: 0.55 });
      if (p) p.life *= 0.7;
    }
  }
}

function updateStrike(w: World, wi: WeaponInstance, dt: number) {
  wi.strikeT -= dt;
  if (wi.strikeT > 0) return;
  wi.strikeT = (wi.extra.strikeEvery ?? 2) / (1 + wi.stats.attackSpeed * 0.5);
  const e = strongest(w, w.player.x, w.player.y, wi.range() * 1.2);
  if (!e) return;
  w.fx({ type: 'strike', x: e.x, y: e.y });
  w.sfx('thunder', 0.9);
  w.shake(2.5, 0.12);
  const dmg = (wi.extra.strikeDamage ?? 40) * wi.dmgMult;
  hitEnemy(w, e, dmg, { weapon: wi, type: 'elemental', kb: 40, fromX: e.x, fromY: e.y - 1, source: 'direct' });
  chainLightning(w, e, dmg * 0.6, wi.params.chain, wi.extra.chainRange ?? 80, wi.extra.chainFalloff ?? 0.8, wi);
}

function updateOrbit(w: World, wi: WeaponInstance, dt: number) {
  const pl = w.player;
  const n = wi.count();
  const R = wi.area();
  wi.orbitA += wi.params.speed * (1 + wi.stats.attackSpeed * 0.3) * dt;
  const petalR = 5 * wi.scale();
  while (wi.orbitPos.length < n) wi.orbitPos.push({ x: pl.x, y: pl.y });
  wi.orbitPos.length = n;
  const hitCd = wi.cooldown();
  const dmg = wi.damage();
  for (let i = 0; i < n; i++) {
    const a = wi.orbitA + (TAU * i) / n;
    const px = pl.x + Math.cos(a) * R;
    const py = pl.y - 4 + Math.sin(a) * R;
    wi.orbitPos[i].x = px;
    wi.orbitPos[i].y = py;
    const list = w.queryEnemies(px, py, petalR + 2);
    for (const e of list) {
      if (e.invulnerable || e.spawnT > 0) continue;
      if (dist2(px, py, e.x, e.y) > (petalR + e.radius) ** 2) continue;
      if (w.t - e.lastHit[wi.slot] < hitCd) continue;
      e.lastHit[wi.slot] = w.t;
      hitEnemy(w, e, dmg, { weapon: wi, type: wi.def.dmgType, kb: wi.knockback(), fromX: pl.x, fromY: pl.y, status: wi.status });
    }
  }
  if (wi.extra.healEvery) {
    wi.healT -= dt;
    if (wi.healT <= 0) {
      wi.healT = wi.extra.healEvery;
      healPlayer(w, wi.extra.heal ?? 2, true);
    }
  }
  if (wi.extra.flareEvery) {
    wi.flareT -= dt;
    if (wi.flareT <= 0) {
      wi.flareT = wi.extra.flareEvery;
      const r = (wi.extra.flareRadius ?? 70) * (1 + wi.stats.area);
      w.fx({ type: 'flare', x: pl.x, y: pl.y - 4, c: r });
      w.sfx('flare', 0.7);
      explode(w, pl.x, pl.y - 4, r, (wi.extra.flareDamage ?? 30) * wi.dmgMult, {
        weapon: wi,
        type: 'arcane',
        kb: 60,
        status: [{ id: 'burn', power: 5, duration: 2 }],
        visual: 'none',
      });
    }
  }
  if (wi.extra.sporeEvery) {
    wi.sporeT -= dt;
    if (wi.sporeT <= 0) {
      wi.sporeT = Math.max(0.6, wi.extra.sporeEvery);
      for (const pos of wi.orbitPos) spawnSporeCloud(w, pos.x, pos.y, 16 * (1 + wi.stats.area), 1.8, wi.damage() * 0.4, wi);
    }
  }
}

export function spawnSporeCloud(w: World, x: number, y: number, r: number, life: number, dmg: number, wi: WeaponInstance | null) {
  const h = w.hazards.obtain();
  if (!h) return;
  h.kind = 'spores';
  h.owner = 'player';
  h.x = x;
  h.y = y;
  h.radius = r;
  h.life = life;
  h.age = 0;
  h.damage = dmg;
  h.tick = 0.5;
  h.tickT = 0;
  h.status = { id: 'poison', power: Math.max(2, dmg * 0.6), duration: 2.5 };
  h.weapon = wi;
  h.slot = 8;
  h.blocks = false;
  h.reflect = false;
  h.warn = 0;
  h.dmgType = 'nature';
}

function syncSummons(w: World, wi: WeaponInstance, kind: Summon['kind'], n: number) {
  wi.summons = wi.summons.filter((s) => s.active);
  while (wi.summons.length < n) {
    const s = w.summons.obtain();
    if (!s) break;
    s.kind = kind;
    s.x = w.player.x + w.rng.range(-12, 12);
    s.y = w.player.y + w.rng.range(-12, 12);
    s.vx = 0;
    s.vy = 0;
    s.z = 0;
    s.target = null;
    s.state = 0;
    s.t = w.rng.range(0, 1);
    s.cd = w.rng.range(0.2, 0.8);
    s.life = Infinity;
    s.weapon = wi;
    s.index = wi.summons.length;
    wi.summons.push(s);
    w.fx({ type: 'poof', x: s.x, y: s.y });
  }
  while (wi.summons.length > n) {
    const s = wi.summons.pop()!;
    w.summons.release(s);
  }
  wi.summons.forEach((s, i) => (s.index = i));
}

function updateSummoner(w: World, wi: WeaponInstance, dt: number) {
  const pl = w.player;
  const n = wi.count();
  syncSummons(w, wi, 'shroom', n);
  const range = wi.range();
  const cd = wi.cooldown();
  for (const s of wi.summons) {
    s.t += dt;
    s.cd -= dt;
    if (!s.target || !s.target.active || s.target.invulnerable) {
      s.target = nearestTo(w, s.x, s.y, range);
      if (s.target && dist2(pl.x, pl.y, s.target.x, s.target.y) > (range * 1.3) ** 2) s.target = null;
    }
    let tx: number;
    let ty: number;
    if (s.target) {
      tx = s.target.x;
      ty = s.target.y;
    } else {
      const a = (TAU * s.index) / Math.max(1, wi.summons.length) + w.t * 0.5;
      tx = pl.x + Math.cos(a) * 22;
      ty = pl.y + Math.sin(a) * 16;
    }
    const d = Math.sqrt(dist2(s.x, s.y, tx, ty));
    const spd = wi.speed();
    // Hop: move in bursts, which is how mushrooms would move if they could.
    const hop = (Math.sin(s.t * 9) + 1) / 2;
    s.z = hop * 4;
    if (d > 3) {
      s.vx = ((tx - s.x) / d) * spd * (0.4 + hop);
      s.vy = ((ty - s.y) / d) * spd * (0.4 + hop);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.facing = s.vx >= 0 ? 1 : -1;
    }
    if (s.target && d < 20 && s.cd <= 0) {
      s.cd = cd;
      const r = wi.area();
      w.fx({ type: 'spores', x: s.x, y: s.y - 3, c: r });
      w.sfx('choir', 0.35);
      explode(w, s.x, s.y, r, wi.damage(), { weapon: wi, type: 'nature', kb: wi.knockback(), status: wi.status, visual: 'none', source: 'summon' });
    }
  }
  if (wi.extra.mycelium && wi.summons.length > 1) {
    wi.threadT -= dt;
    if (wi.threadT <= 0) {
      wi.threadT = 0.5;
      const dmg = (wi.extra.threadDamage ?? 6) * wi.dmgMult;
      for (let i = 0; i < wi.summons.length; i++) {
        const a = wi.summons[i];
        const b = wi.summons[(i + 1) % wi.summons.length];
        threadDamage(w, a.x, a.y, b.x, b.y, dmg, wi);
      }
    }
  }
}

function threadDamage(w: World, ax: number, ay: number, bx: number, by: number, dmg: number, wi: WeaponInstance) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const half = Math.sqrt(dist2(ax, ay, bx, by)) / 2;
  const list = w.queryEnemies(mx, my, half + 8);
  for (const e of list) {
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((e.x - ax) * dx + (e.y - ay) * dy) / l2));
    const qx = ax + dx * t;
    const qy = ay + dy * t;
    if (dist2(e.x, e.y, qx, qy) > (e.radius + 4) ** 2) continue;
    hitEnemy(w, e, dmg, { weapon: wi, type: 'nature', kb: 0, status: wi.status, source: 'summon', canCrit: false });
  }
}

function updateSwarm(w: World, wi: WeaponInstance, dt: number) {
  const pl = w.player;
  const n = wi.count() + w.run.hookValue('beeCrown') + (w.run.cls.id === 'apiarist' ? 2 : 0);
  syncSummons(w, wi, 'bee', n);
  const range = wi.range();
  const spd = wi.speed();
  const flowerAura = w.run.weapons.find((x) => x.def.behaviour === 'orbit' && x.def.family === 'flower');
  const auraR = flowerAura ? flowerAura.area() + 14 : 0;
  for (const s of wi.summons) {
    s.t += dt;
    s.cd -= dt;
    if (s.cd <= 0 && (!s.target || !s.target.active || s.target.invulnerable)) {
      s.target = randomIn(w, pl.x, pl.y, range);
    }
    let tx: number;
    let ty: number;
    if (s.target && s.cd <= 0) {
      tx = s.target.x;
      ty = s.target.y - 4;
    } else {
      const a = s.t * 2.2 + s.index * 1.7;
      tx = pl.x + Math.cos(a) * 18;
      ty = pl.y - 8 + Math.sin(a * 1.3) * 12;
    }
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(s.t * 14 + s.index) * 40;
    s.vx += ((dx / d) * spd - s.vx) * Math.min(1, dt * 7) + (-dy / d) * wob * dt;
    s.vy += ((dy / d) * spd - s.vy) * Math.min(1, dt * 7) + (dx / d) * wob * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.facing = s.vx >= 0 ? 1 : -1;
    if (s.target && s.cd <= 0 && dist2(s.x, s.y, s.target.x, s.target.y - 4) < (s.target.radius + 4) ** 2) {
      let dmg = wi.damage();
      if (flowerAura && dist2(s.x, s.y, pl.x, pl.y) < auraR * auraR) {
        dmg *= 1.3;
        w.fx({ type: 'sparkle', x: s.x, y: s.y });
      }
      hitEnemy(w, s.target, dmg, { weapon: wi, type: 'nature', kb: wi.knockback(), fromX: s.x, fromY: s.y, status: wi.status, source: 'summon' });
      s.cd = wi.cooldown();
      s.vx = -s.vx * 0.6;
      s.vy = -s.vy * 0.6 - 40;
      s.target = null;
    }
  }
}
