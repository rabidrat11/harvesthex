// Damage, status effects, synergies, kills and drops.
//
// Synergy rules (each guarded against recursion):
//  - Fire on a poisoned enemy detonates the poison (once per enemy).
//  - Enough chill freezes; a hard physical hit on a frozen enemy shatters it.
//  - Volatile hits explode; explosions never trigger Volatile again.
//  - Charged hits arc; arcs never trigger Charged again.
//  - Echoes never echo; mites never breed mites.

import { angleTo, dist2, TAU } from '../core/math';
import type { DamageType, StatusApply } from '../data/types';
import { ENEMIES } from '../data/enemies';
import { REGIONS } from '../data/regions';
import { CROPS } from '../data/crops';
import { TRAIT_IDS } from '../data/traits';
import type { Enemy } from './entities';
import type { World } from './world';
import type { WeaponInstance } from './weapons';
import { spawnSporeCloud } from './weapons';
import { onHit, onKill, onPlayerHurt } from './classes';

export interface HitOpts {
  weapon?: WeaponInstance | null;
  type: DamageType;
  kb?: number;
  fromX?: number;
  fromY?: number;
  status?: StatusApply[];
  source?: 'direct' | 'explosion' | 'dot' | 'chain' | 'summon' | 'shatter';
  canCrit?: boolean;
  executed?: boolean;
  forceCrit?: boolean;
  /** Struck by an Infested mite: its kills never release more mites. */
  mite?: boolean;
}

const STATUS_CAP = { poisonStacks: 8, bleedStacks: 10 };

/** Global scale on everything that hurts the player. */
export const ENEMY_DAMAGE = 1.4;
/** Invulnerability after being hit, in seconds. */
export const HURT_IFRAMES = 0.5;

export function hitEnemy(w: World, e: Enemy, base: number, o: HitOpts): number {
  if (!e.active || e.invulnerable || e.hp <= 0) return 0;
  const wi = o.weapon ?? null;
  const src = o.source ?? 'direct';
  let dmg = base;
  let crit = false;
  if (o.canCrit !== false && src !== 'dot') {
    const chance = wi ? wi.critChance : w.run.stats.critChance;
    if (o.forceCrit || w.rng.chance(chance)) {
      crit = true;
      dmg *= wi ? wi.critMult : 1 + w.run.stats.critDamage;
      const statusCrit = w.run.hookValue('statusCrit');
      if (statusCrit && (e.poisonT > 0 || e.burnT > 0 || e.bleedT > 0)) dmg *= 1 + statusCrit;
    }
  }
  // Positional armour: the Bramble Knight's shield faces the way it walks.
  if (e.def.armour && e.guard && o.fromX !== undefined && o.fromY !== undefined && src !== 'dot') {
    const a = angleTo(e.x, e.y, o.fromX, o.fromY);
    let d = Math.abs(a - e.angle) % TAU;
    if (d > Math.PI) d = TAU - d;
    if (d < 1.15) {
      dmg *= 1 - e.def.armour;
      if (w.rng.chance(0.25)) w.fx({ type: 'block', x: e.x + e.facing * 8, y: e.y - 10 });
    }
  }
  // The Watcher's detached eyes shield it.
  if (e.def.ai === 'watcher' && e.phase === 1 && w.enemies.items.some((x) => x.active && x.def.id === 'eye_orb')) {
    dmg *= 0.3;
    if (w.rng.chance(0.1)) w.fx({ type: 'block', x: e.x, y: e.y - 20 });
  }
  if (e.cursedT > 0) dmg *= 1.3;
  if (e.shock > 0 && src !== 'dot') {
    dmg *= 1.25;
    e.shock = 0;
  }
  const frailty = w.run.held.extra.frailty ?? 0;
  if (frailty && e.poisonT > 0) dmg *= 1 + frailty;
  if (e.frozenT > 0 && o.type === 'physical') dmg *= 1.5;

  dmg = Math.max(0, dmg);
  onHit(w, e, src, !!wi);
  e.hp -= dmg;
  e.lastDamageType = o.type;
  // Big foes glint now and then rather than strobing white under constant fire.
  if (src !== 'dot') {
    if (!e.boss && !e.elite) e.flash = 0.09;
    else if (w.t - e.lastFlash > 0.22) {
      e.flash = 0.06;
      e.lastFlash = w.t;
    }
  }
  if (wi) wi.damageDealt += dmg;
  w.stats.damageDealt += dmg;
  if (src === 'dot') w.statusDamageAcc += dmg;
  // Numbers are batched per enemy into short windows so a swarm stays readable;
  // crits always show at once.
  if (w.settings.damageNumbers !== 'off') {
    e.numAcc += dmg;
    const big = crit || (w.settings.damageNumbers === 'crits' ? e.numAcc >= 40 : true);
    if (big && (crit || w.t - e.lastNum > 0.3 || e.hp <= 0)) {
      w.fx({ type: 'dmg', x: e.x, y: e.y - e.radius - (e.def.hover ?? 0) - 4, a: e.numAcc, b: crit ? 1 : 0, s: o.type, c: src === 'dot' ? 1 : 0 });
      e.numAcc = 0;
      e.lastNum = w.t;
    }
  }
  if (src !== 'dot' && src !== 'chain') {
    if (crit) w.fx({ type: 'crit', x: e.x, y: e.y - 6 });
    else w.fx({ type: 'hit', x: e.x, y: e.y - 6 });
  }

  // Knockback.
  const kb = (o.kb ?? 0) * (1 - e.def.kbResist);
  if (kb > 0 && o.fromX !== undefined && o.fromY !== undefined && e.hp > 0) {
    const a = angleTo(o.fromX, o.fromY, e.x, e.y);
    e.kx += Math.cos(a) * kb;
    e.ky += Math.sin(a) * kb;
  }

  // Statuses.
  if (o.status) for (const s of o.status) applyStatus(w, e, s, wi);

  if (src !== 'dot') {
    // Frozen shatter.
    if (e.frozenT > 0 && (o.type === 'physical' || (wi?.extra.shatterBonus ?? 0) > 0) && dmg >= Math.min(18, e.maxHp * 0.08)) shatter(w, e, wi);
    // Trait hooks.
    if (wi && src !== 'explosion' && src !== 'chain' && src !== 'shatter') {
      if (wi.hasTrait('volatile') && w.rng.chance(0.2 * wi.traitPower)) {
        explode(w, e.x, e.y, 24 * (1 + w.run.stats.area), base * 0.5, { weapon: wi, type: 'elemental', kb: 40, visual: 'small' });
      }
      if (wi.hasTrait('charged') && w.rng.chance(0.25 * wi.traitPower)) chainLightning(w, e, base * 0.5, 1, 70, 0.5, wi);
      if (wi.hasTrait('leeching') && w.rng.chance(0.05 * wi.traitPower)) healPlayer(w, 1, false);
      const frost = w.run.hookValue('frostTouch');
      if (frost && e.active && w.rng.chance(frost)) applyStatus(w, e, { id: 'chill', power: 0.35, duration: 1.6 }, wi);
      if (wi.params.chain > 0 && wi.def.tags.includes('chain')) {
        chainLightning(w, e, base * (wi.extra.chainFalloff ?? 0.7), wi.params.chain, wi.extra.chainRange ?? 70, wi.extra.chainFalloff ?? 0.7, wi);
      }
    }
    if (w.rng.chance(w.run.stats.lifesteal)) healPlayer(w, 1, false);
    const thorns = w.run.hookValue('critThorns');
    if (crit && thorns && src !== 'explosion') {
      for (let i = 0; i < thorns; i++) spawnThorn(w, e.x, e.y, w.rng.angle(), base * 0.35, null);
    }
    if (crit && wi?.extra.critBurst && e.bleedT > 0 && e.bleedStacks > 0) {
      const burst = e.bleedStacks * e.bleedPower * e.bleedT * 0.9 + base * 0.5;
      e.bleedStacks = 0;
      e.bleedT = 0;
      w.fx({ type: 'blood', x: e.x, y: e.y - 4 });
      explode(w, e.x, e.y, 26, burst, { weapon: wi, type: 'physical', kb: 30, visual: 'blood' });
    }
  }

  if (e.hp <= 0) killEnemy(w, e, wi, o);
  return dmg;
}

export function applyStatus(w: World, e: Enemy, s: StatusApply, wi: WeaponInstance | null) {
  if (s.chance !== undefined && !w.rng.chance(s.chance)) return;
  const dur = s.duration * (1 + w.run.stats.statusDuration);
  if (wi && (s.id === 'poison' || s.id === 'burn' || s.id === 'bleed')) e.dotBy = wi;
  switch (s.id) {
    case 'poison': {
      e.poisonDps = Math.min(e.poisonDps + s.power, s.power * STATUS_CAP.poisonStacks + 4);
      e.poisonT = Math.max(e.poisonT, dur);
      break;
    }
    case 'burn': {
      if (e.poisonT > 0 && e.poisonDps > 0 && !e.detonated) {
        // Poison + fire: the rot ignites.
        e.detonated = true;
        const boom = e.poisonDps * e.poisonT * 0.8 + 12;
        e.poisonDps = 0;
        e.poisonT = 0;
        w.fx({ type: 'detonate', x: e.x, y: e.y - 4 });
        w.sfx('detonate', 0.7);
        explode(w, e.x, e.y, 34 * (1 + w.run.stats.area * 0.5), boom, { weapon: wi, type: 'elemental', kb: 60, visual: 'toxic' });
      }
      e.burnDps = Math.max(e.burnDps, s.power);
      e.burnT = Math.max(e.burnT, dur);
      break;
    }
    case 'chill': {
      if (e.boss) {
        e.slow = Math.max(e.slow, s.power * 0.4);
        e.slowT = Math.max(e.slowT, dur);
        break;
      }
      e.slow = Math.max(e.slow, s.power);
      e.slowT = Math.max(e.slowT, dur);
      e.chillStacks += 1;
      e.chillDecay = 2;
      if (e.chillStacks >= (e.elite ? 12 : 5) && e.frozenT <= 0) {
        e.frozenT = e.elite ? 0.8 : 1.4;
        e.chillStacks = 0;
        w.fx({ type: 'freeze', x: e.x, y: e.y - 4 });
        w.sfx('freeze', 0.5);
      }
      break;
    }
    case 'bleed': {
      const stacks = 1 + (wi?.extra.bleedStacks ?? 0);
      e.bleedStacks = Math.min(STATUS_CAP.bleedStacks, e.bleedStacks + stacks);
      e.bleedPower = Math.max(e.bleedPower, s.power);
      e.bleedT = Math.max(e.bleedT, dur);
      break;
    }
    case 'root': {
      if (!e.boss) e.rootT = Math.max(e.rootT, e.elite ? dur * 0.4 : dur);
      break;
    }
    case 'shock':
      e.shock = 1;
      break;
  }
}

function shatter(w: World, e: Enemy, wi: WeaponInstance | null) {
  e.frozenT = 0;
  const bonus = Math.min(140, e.maxHp * 0.3) * (1 + (wi?.extra.shatterBonus ?? 0));
  w.fx({ type: 'shatter', x: e.x, y: e.y - 4 });
  w.sfx('shatter', 0.7);
  hitEnemy(w, e, bonus, { weapon: wi, type: 'elemental', source: 'shatter', canCrit: false });
  for (let i = 0; i < 6; i++) {
    const p = spawnThorn(w, e.x, e.y, (TAU * i) / 6, 8 + bonus * 0.15, wi);
    if (p) {
      p.sprite = 'p_frost';
      p.kind = 'shard';
      p.dmgType = 'elemental';
    }
  }
}

export function spawnThorn(w: World, x: number, y: number, a: number, dmg: number, wi: WeaponInstance | null) {
  const p = w.projs.obtain();
  if (!p) return null;
  p.kind = 'thorn';
  p.x = x;
  p.y = y;
  p.vx = Math.cos(a) * 240;
  p.vy = Math.sin(a) * 240;
  p.z = 0;
  p.sprite = 'p_thorn';
  p.scale = 1;
  p.radius = 2.5;
  p.damage = dmg;
  p.dmgType = 'physical';
  p.pierce = 1;
  p.bounce = 0;
  p.life = 0.45;
  p.age = 0;
  p.rot = a;
  p.spin = 0;
  p.knockback = 10;
  p.split = 0;
  p.chain = 0;
  p.area = 0;
  p.status = [];
  p.weapon = wi;
  p.hits.length = 0;
  p.canCrit = false;
  p.isEcho = true;
  p.returning = false;
  p.homing = 0;
  p.tint = 0;
  return p;
}

export interface ExplodeOpts extends HitOpts {
  visual?: 'big' | 'small' | 'none' | 'toxic' | 'blood' | 'fire';
}

export function explode(w: World, x: number, y: number, r: number, dmg: number, o: ExplodeOpts) {
  if (o.visual !== 'none') {
    w.fx({ type: 'explode', x, y, c: r, s: o.visual ?? 'big' });
    if (o.visual !== 'small') w.sfx('boom', Math.min(1, 0.4 + r / 80));
    if (r >= 30) w.shake(Math.min(4, r / 14), 0.12);
  }
  const list = w.queryEnemies(x, y, r);
  for (const e of list) {
    if (dist2(x, y, e.x, e.y) > (r + e.radius) ** 2) continue;
    hitEnemy(w, e, dmg, { ...o, source: o.source ?? 'explosion', fromX: x, fromY: y });
  }
  if (o.source !== 'summon' && w.run.hookValue('explosionSpores') && (o.visual === 'big' || o.visual === 'fire' || (o.visual === 'small' && w.rng.chance(0.35)))) {
    spawnSporeCloud(w, x, y, r * 0.8, 2.5, 4 * (1 + w.run.stats.nature), null);
  }
}

const chainSeen = new Set<Enemy>();
export function chainLightning(w: World, from: Enemy, dmg: number, jumps: number, range: number, falloff: number, wi: WeaponInstance | null) {
  chainSeen.clear();
  chainSeen.add(from);
  let cur = from;
  let d = dmg;
  for (let j = 0; j < jumps; j++) {
    let best: Enemy | null = null;
    let bd = range * range;
    const list = w.queryEnemies(cur.x, cur.y, range);
    for (const e of list) {
      if (chainSeen.has(e) || e.invulnerable || e.spawnT > 0) continue;
      const dd = dist2(cur.x, cur.y, e.x, e.y);
      if (dd < bd) {
        bd = dd;
        best = e;
      }
    }
    if (!best) break;
    chainSeen.add(best);
    w.fx({ type: 'zap', x: cur.x, y: cur.y - 6, a: best.x, b: best.y - 6 });
    hitEnemy(w, best, d, { weapon: wi, type: 'elemental', source: 'chain', kb: 10, fromX: cur.x, fromY: cur.y, status: [{ id: 'shock', power: 1, duration: 1 }] });
    d *= falloff;
    cur = best;
  }
  if (jumps > 0) w.sfx('zap', 0.35);
}

// ---------------------------------------------------------------------------
// Status ticking

export function updateStatuses(w: World, e: Enemy, dt: number) {
  let dps = 0;
  let type: DamageType = 'nature';
  if (e.poisonT > 0) {
    e.poisonT -= dt;
    dps += e.poisonDps * (1 + w.run.stats.nature * 0.5);
    if (e.poisonT <= 0) e.poisonDps = 0;
  }
  if (e.burnT > 0) {
    e.burnT -= dt;
    dps += e.burnDps * (1 + w.run.stats.elemental * 0.5);
    type = 'elemental';
    if (e.burnT <= 0) e.burnDps = 0;
  }
  if (e.bleedT > 0) {
    e.bleedT -= dt;
    dps += e.bleedStacks * e.bleedPower * (1 + w.run.stats.physical * 0.5);
    if (e.bleedT <= 0) e.bleedStacks = 0;
  }
  if (e.slowT > 0) {
    e.slowT -= dt;
    if (e.slowT <= 0) e.slow = 0;
  }
  if (e.chillDecay > 0) {
    e.chillDecay -= dt;
    if (e.chillDecay <= 0) e.chillStacks = 0;
  }
  if (e.frozenT > 0) e.frozenT -= dt;
  if (e.rootT > 0) e.rootT -= dt;
  if (e.fearT > 0) e.fearT -= dt;
  if (e.cursedT > 0) e.cursedT -= dt;
  if (dps > 0) {
    e.dotAcc += dps * dt;
    e.dotTick -= dt;
    if (e.dotTick <= 0) {
      e.dotTick = 0.5;
      const amount = e.dotAcc;
      e.dotAcc = 0;
      hitEnemy(w, e, amount, { type, source: 'dot', canCrit: false, weapon: e.dotBy });
    }
  } else {
    e.dotAcc = 0;
  }
}

// ---------------------------------------------------------------------------
// Kills and drops

export function killEnemy(w: World, e: Enemy, wi: WeaponInstance | null, o?: HitOpts) {
  if (!e.active) return;
  const def = e.def;
  w.stats.kills++;
  if (wi) wi.kills++;
  w.killsByEnemy[def.id] = (w.killsByEnemy[def.id] ?? 0) + 1;

  if (e.boss) {
    w.onBossKilled(e);
    return;
  }

  w.fx({ type: 'death', x: e.x, y: e.y - 4, s: def.id, a: e.facing, c: e.radius });
  w.sfx(e.elite ? 'elite_death' : def.small ? 'pop' : 'squelch', e.elite ? 1 : 0.45);

  // Sap.
  let sap = def.sap;
  if (wi?.hasTrait('golden') && w.rng.chance(0.5 * wi.traitPower)) sap += 1;
  if (def.id === 'taxman') sap += e.carried * 1.5;
  dropSap(w, e.x, e.y, sap);

  // Region drops.
  const tierLoot = w.tierLoot;
  const luck = 1 + w.run.stats.luck * 0.04;
  for (const d of def.drops ?? []) {
    const chance = d.chance >= 1 ? 1 : d.chance * tierLoot * luck;
    if (!w.rng.chance(chance)) continue;
    const n = w.rng.int(d.min ?? 1, d.max ?? 1);
    if (d.what === 'chest') w.dropPickup('chest', e.x, e.y, 1);
    else if (d.what === 'farthing') for (let i = 0; i < n; i++) w.dropPickup('farthing', e.x, e.y, 1);
    else if (d.what.startsWith('mat:')) w.dropPickup('material', e.x, e.y, n, d.what.slice(4));
  }
  const farthingChance = (0.012 + (wi?.hasTrait('golden') ? 0.04 * wi.traitPower : 0)) * (1 + w.run.hookValue('goldRush') * 0.5) * tierLoot;
  if (w.rng.chance(farthingChance)) w.dropPickup('farthing', e.x, e.y, 1);
  const foragerNose = w.run.cls.id === 'forager' ? 1.5 : 1;
  if (!def.small && w.rng.chance(0.0045 * tierLoot * luck * foragerNose * (e.elite ? 40 : 1))) dropSeed(w, e.x, e.y);
  if (w.rng.chance(0.004 * (def.small ? 0.3 : 1))) w.dropPickup('heart', e.x, e.y, 1);

  // On-kill hooks.
  if (wi?.hasTrait('infested') && !o?.mite && w.rng.chance(0.25 * wi.traitPower)) w.spawnMite(e.x, e.y, wi);
  if (w.run.cls.id === 'reaper' && wi && (wi.def.tags.includes('melee') || o?.executed)) {
    healPlayer(w, 1, false, 4);
  }
  if (w.run.cls.id === 'botanist' && e.poisonT > 0) spawnSporeCloud(w, e.x, e.y, 18, 1.5, 3 * (1 + w.run.stats.nature), null);
  if (o?.executed) w.fx({ type: 'execute', x: e.x, y: e.y - 6 });
  onKill(w, e);

  if (def.splitInto) {
    for (let i = 0; i < def.splitInto.count; i++) {
      const a = (TAU * i) / def.splitInto.count + w.rng.range(-0.3, 0.3);
      w.spawnEnemy(def.splitInto.id, e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6, { instant: true, kx: Math.cos(a) * 90, ky: Math.sin(a) * 90 });
    }
  }
  if (e.elite) w.onEliteKilled(e);

  w.enemies.release(e);
}

export function dropSap(w: World, x: number, y: number, amount: number) {
  let left = Math.round(amount);
  while (left > 0) {
    const v = left >= 5 ? 5 : left >= 3 ? 3 : 1;
    w.dropPickup('sap', x, y, v);
    left -= v;
  }
}

export function dropSeed(w: World, x: number, y: number, opts: { rare?: boolean; species?: string } = {}) {
  const region = REGIONS[w.regionId];
  const table = region.seedTable.map((s) => ({ ...s, weight: opts.rare && CROPS[s.species].rarity === 'common' ? s.weight * 0.2 : s.weight }));
  const species = opts.species ?? w.rng.weighted(table, (s) => s.weight)!.species;
  const traits: string[] = [];
  if (w.rng.chance(0.12 + w.run.stats.luck * 0.01 + (opts.rare ? 0.25 : 0))) traits.push(w.rng.pick(TRAIT_IDS.filter((t) => t !== 'wild')));
  const p = w.dropPickup('seed', x, y, 1, species);
  if (p) {
    p.traits = traits;
    const r = CROPS[species].rarity;
    p.rarity = (r === 'legendary' ? 3 : r === 'rare' ? 2 : r === 'uncommon' ? 1 : 0) + (traits.length ? 1 : 0);
  }
  return p;
}

// ---------------------------------------------------------------------------
// The player

export function damagePlayer(w: World, amount: number, fromX: number, fromY: number, cause: string) {
  const p = w.player;
  if (p.dead || p.iframes > 0 || w.godMode) return false;
  if (w.petalShields > 0) {
    w.petalShields--;
    p.iframes = 0.25;
    w.fx({ type: 'petalblock', x: p.x, y: p.y - 6 });
    w.sfx('block', 0.6);
    return false;
  }
  const a = w.run.stats.armour;
  const mult = a >= 0 ? 1 / (1 + a / 15) : 1 + -a / 15;
  const oath = w.run.curses.some((c) => c.id === 'thorn_oath') ? 1.2 : 1;
  const dmg = Math.max(1, Math.round(amount * ENEMY_DAMAGE * mult * w.tierDmg * oath));
  p.hp -= dmg;
  p.iframes = HURT_IFRAMES;
  p.hurtT = 0.3;
  w.stats.damageTaken += dmg;
  w.lastHurtBy = cause;
  const ang = angleTo(fromX, fromY, p.x, p.y);
  p.kx += Math.cos(ang) * 130;
  p.ky += Math.sin(ang) * 130;
  w.fx({ type: 'hurt', x: p.x, y: p.y - 8, a: dmg, b: ang });
  onPlayerHurt(w);
  w.sfx('hurt', 1);
  w.shake(3, 0.16);
  w.hitstop(0.05);
  if (p.hp <= 0) {
    p.hp = 0;
    w.onPlayerDeath(cause);
  }
  return true;
}

/** `capPerSec` limits sustain from frequent small heals. */
export function healPlayer(w: World, amount: number, show: boolean, capPerSec = 6) {
  const p = w.player;
  if (p.dead) return;
  if (w.healWindow + amount > capPerSec) amount = Math.max(0, capPerSec - w.healWindow);
  if (amount <= 0) return;
  w.healWindow += amount;
  const before = p.hp;
  p.hp = Math.min(w.run.stats.maxHp, p.hp + amount);
  const healed = p.hp - before;
  if (healed <= 0) return;
  w.stats.healed += healed;
  if (show) w.fx({ type: 'heal', x: p.x, y: p.y - 14, a: healed });
  const per = w.run.hookValue('petalShield');
  if (per) {
    w.petalAcc += healed;
    while (w.petalAcc >= 3 && w.petalShields < 3) {
      w.petalAcc -= 3;
      w.petalShields++;
    }
    if (w.petalShields >= 3) w.petalAcc = 0;
  }
}

export function enemyDef(id: string) {
  return ENEMIES[id];
}
