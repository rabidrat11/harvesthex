// Enemy behaviours. Each sets the enemy's desired velocity and drives its
// attacks through the pattern system. Telegraphs (windups, warning circles,
// charge lines) always precede danger.

import { TAU, angleTo, dist, dist2, turnTowards } from '../core/math';
import { ATTACKS } from '../data/patterns';
import type { Enemy } from './entities';
import type { World } from './world';
import { runAttack, firePattern, spawnBullet } from './patterns';
import { damagePlayer } from './combat';

function seek(w: World, e: Enemy, speed: number, curve = 0) {
  const a = angleTo(e.x, e.y, w.targetX, w.targetY) + curve;
  e.vx = Math.cos(a) * speed;
  e.vy = Math.sin(a) * speed;
  e.angle = a;
}

function startAttack(w: World, e: Enemy, id: string) {
  const a = ATTACKS[id];
  if (!a) return;
  e.attack = a;
  e.attackT = 0;
  e.attackStep = 0;
  e.attackAim = angleTo(e.x, e.y, w.targetX, w.targetY);
  e.state = 'attack';
  e.stateT = 0;
  if (a.windup > 0.3 && (e.elite || e.boss)) w.fx({ type: 'windup', x: e.x, y: e.y - e.radius - 6, a: a.windup });
}

/** Common attack loop: count down, pick the next attack in range, run it. Returns true while attacking. */
function attackLoop(w: World, e: Enemy, dt: number, opts: { range?: number; freeze?: boolean } = {}): boolean {
  if (e.state === 'attack' && e.attack) {
    if (opts.freeze !== false) {
      e.vx = 0;
      e.vy = 0;
    }
    if (runAttack(w, e, dt)) {
      e.attackCd = e.attack.cooldown * (0.85 + w.rng.next() * 0.3);
      e.attack = null;
      e.state = 'move';
    }
    return true;
  }
  const atks = e.def.attacks;
  if (!atks || !atks.length) return false;
  e.attackCd -= dt;
  if (e.attackCd > 0) return false;
  const d = dist(e.x, e.y, w.targetX, w.targetY);
  const id = atks[e.attackIndex % atks.length];
  const a = ATTACKS[id];
  if (a.range && d > a.range) return false;
  // Do not shoot from far off-screen.
  if (Math.abs(e.x - w.player.x) > 360 || Math.abs(e.y - w.player.y) > 210) return false;
  e.attackIndex++;
  startAttack(w, e, id);
  return true;
}

export function updateEnemyAi(w: World, e: Enemy, dt: number) {
  if (e.fearT > 0 && !e.boss && !e.elite) {
    const a = angleTo(w.player.x, w.player.y, e.x, e.y);
    e.vx = Math.cos(a) * e.speed * 1.2;
    e.vy = Math.sin(a) * e.speed * 1.2;
    return;
  }
  switch (e.def.ai) {
    case 'swarm': {
      // Packs curve in from the sides rather than queueing in a line.
      const curve = ((e.id % 5) - 2) * 0.12 * Math.min(1, dist(e.x, e.y, w.targetX, w.targetY) / 120);
      seek(w, e, e.speed, curve);
      break;
    }
    case 'chase':
      if (!attackLoop(w, e, dt)) seek(w, e, e.speed);
      break;
    case 'ranged':
      ranged(w, e, dt, 110, 165);
      break;
    case 'charger':
      charger(w, e, dt);
      break;
    case 'turret':
      turret(w, e, dt);
      break;
    case 'burrower':
      burrower(w, e, dt);
      break;
    case 'wraith':
      if (!attackLoop(w, e, dt, { freeze: false })) seek(w, e, e.speed);
      else {
        e.vx *= 0.92;
        e.vy *= 0.92;
      }
      break;
    case 'knight':
      knight(w, e, dt);
      break;
    case 'witch':
      witch(w, e, dt);
      break;
    case 'taxman':
      taxman(w, e, dt);
      break;
    case 'boss_marrow':
      marrowKing(w, e, dt);
      break;
    case 'watcher':
      watcher(w, e, dt);
      break;
    case 'eye_orb':
      eyeOrb(w, e, dt);
      break;
  }
}

function ranged(w: World, e: Enemy, dt: number, near: number, far: number) {
  if (attackLoop(w, e, dt)) return;
  const d = dist(e.x, e.y, w.targetX, w.targetY);
  const a = angleTo(e.x, e.y, w.targetX, w.targetY);
  // Keep a comfortable distance and drift sideways.
  const strafe = Math.sin(e.t * 0.9 + e.id) > 0 ? 1 : -1;
  let fwd = 0;
  if (d > far) fwd = 1;
  else if (d < near) fwd = -1;
  const sx = -Math.sin(a) * strafe * 0.6;
  const sy = Math.cos(a) * strafe * 0.6;
  e.vx = (Math.cos(a) * fwd + sx) * e.speed;
  e.vy = (Math.sin(a) * fwd + sy) * e.speed;
  e.angle = a;
}

function charger(w: World, e: Enemy, dt: number) {
  e.stateT += dt;
  switch (e.state) {
    case 'move': {
      seek(w, e, e.speed);
      e.attackCd -= dt;
      const d = dist(e.x, e.y, w.targetX, w.targetY);
      if (d < 170 && e.attackCd <= 0 && Math.abs(e.x - w.player.x) < 330) {
        e.state = 'windup';
        e.stateT = 0;
        e.angle = angleTo(e.x, e.y, w.targetX, w.targetY);
        w.sfx('snort', 0.5);
      }
      break;
    }
    case 'windup': {
      // Telegraph: tracks the player for most of the windup, then locks.
      e.vx = 0;
      e.vy = 0;
      if (e.stateT < 0.5) e.angle = turnTowards(e.angle, angleTo(e.x, e.y, w.targetX, w.targetY), 3 * dt);
      e.facing = Math.cos(e.angle) >= 0 ? 1 : -1;
      if (e.stateT >= 0.75) {
        e.state = 'charge';
        e.stateT = 0;
        w.sfx('charge', 0.6);
      }
      break;
    }
    case 'charge': {
      const sp = 275;
      e.vx = Math.cos(e.angle) * sp;
      e.vy = Math.sin(e.angle) * sp;
      if (e.stateT % 0.08 < dt) w.fx({ type: 'dust', x: e.x, y: e.y + 2 });
      // Charging into a wall stuns it.
      const hit = w.map.obstacles.some((o) => dist2(e.x, e.y, o.x, o.y) < (o.r + e.radius + 2) ** 2);
      const edge = e.x < w.map.margin + 12 || e.y < w.map.margin + 12 || e.x > w.map.w - w.map.margin - 12 || e.y > w.map.h - w.map.margin - 12;
      if (hit || edge || e.stateT > 0.7) {
        e.state = 'recover';
        e.stateT = hit || edge ? -0.7 : 0;
        if (hit || edge) {
          w.fx({ type: 'stun', x: e.x, y: e.y - 10 });
          w.sfx('thud', 0.6);
        }
      }
      break;
    }
    case 'recover':
      e.vx *= 0.8;
      e.vy *= 0.8;
      if (e.stateT >= 0.8) {
        e.state = 'move';
        e.stateT = 0;
        e.attackCd = 1.2 + w.rng.next();
      }
      break;
    default:
      e.state = 'move';
  }
}

function turret(w: World, e: Enemy, dt: number) {
  if (attackLoop(w, e, dt)) return;
  const d = dist(e.x, e.y, w.targetX, w.targetY);
  // Hops: moves in short lurches.
  const hop = Math.max(0, Math.sin(e.t * 4));
  if (d > 150) seek(w, e, e.speed * 2.2 * hop);
  else {
    e.vx = 0;
    e.vy = 0;
  }
}

function burrower(w: World, e: Enemy, dt: number) {
  e.stateT += dt;
  if (e.state === 'burrow') {
    e.invulnerable = true;
    e.hidden = true;
    seek(w, e, e.speed);
    const d = dist(e.x, e.y, w.targetX, w.targetY);
    if ((d < 26 && e.stateT > 0.8) || e.stateT > 4.5) {
      e.state = 'emerge';
      e.stateT = 0;
      e.vx = 0;
      e.vy = 0;
      w.fx({ type: 'rumble', x: e.x, y: e.y, c: 20 });
      w.sfx('rumble', 0.5);
    }
  } else if (e.state === 'emerge') {
    // The mound bulges for 0.6s before erupting.
    e.vx = 0;
    e.vy = 0;
    if (e.stateT >= 0.6) {
      e.state = 'attack';
      e.stateT = 0;
      e.invulnerable = false;
      e.hidden = false;
      w.fx({ type: 'erupt', x: e.x, y: e.y, c: 18, s: 'dirt' });
      w.sfx('erupt', 0.6);
      if (dist2(e.x, e.y, w.player.x, w.player.y) < (18 + w.player.hitbox) ** 2) damagePlayer(w, 14 * e.dmgMult, e.x, e.y, 'a Root Stalker');
      e.attack = ATTACKS.stalker_ring;
      e.attackT = 0;
      e.attackStep = 0;
    }
  } else if (e.state === 'attack') {
    e.vx = 0;
    e.vy = 0;
    if (e.attack) {
      if (runAttack(w, e, dt)) e.attack = null;
    }
    if (e.stateT >= 2.4) {
      e.state = 'burrow';
      e.stateT = 0;
      w.fx({ type: 'burrow', x: e.x, y: e.y });
    }
  } else e.state = 'burrow';
}

function knight(w: World, e: Enemy, dt: number) {
  // The shield follows the player slowly: circling behind it is the answer.
  const want = angleTo(e.x, e.y, w.targetX, w.targetY);
  e.angle = turnTowards(e.angle, want, 1.25 * dt);
  e.facing = Math.cos(e.angle) >= 0 ? 1 : -1;
  e.stateT += dt;
  if (e.state === 'windup') {
    // Sword sweep telegraph.
    e.vx = 0;
    e.vy = 0;
    e.guard = false;
    if (e.stateT >= 0.55) {
      const fx = e.x + Math.cos(e.angle) * 22;
      const fy = e.y + Math.sin(e.angle) * 22;
      w.fx({ type: 'sweep', x: e.x, y: e.y - 8, a: e.angle, b: 2.4, c: 40, s: 'arc_enemy' });
      w.sfx('swing', 0.8);
      if (dist2(fx, fy, w.player.x, w.player.y) < 30 * 30) damagePlayer(w, 22 * e.dmgMult, e.x, e.y, 'a Bramble Knight’s sword');
      e.state = 'recover';
      e.stateT = 0;
    }
    return;
  }
  if (e.state === 'recover') {
    e.vx = 0;
    e.vy = 0;
    e.guard = false;
    if (e.stateT > 0.6) {
      e.state = 'move';
      e.stateT = 0;
    }
    return;
  }
  if (e.state === 'attack') e.guard = false;
  if (attackLoop(w, e, dt)) return;
  e.guard = true;
  const d = dist(e.x, e.y, w.targetX, w.targetY);
  if (d < 38 && e.memo <= 0) {
    e.state = 'windup';
    e.stateT = 0;
    e.memo = 2.2;
    w.fx({ type: 'telegraph_arc', x: e.x, y: e.y - 8, a: e.angle, b: 2.4, c: 40 });
    return;
  }
  e.memo -= dt;
  e.vx = Math.cos(e.angle) * e.speed;
  e.vy = Math.sin(e.angle) * e.speed;
}

function witch(w: World, e: Enemy, dt: number) {
  e.memo -= dt;
  if (e.memo <= 0 && e.state !== 'attack') {
    // Blink to a new spot around the player.
    e.memo = 6.5;
    const a = w.rng.angle();
    w.fx({ type: 'blink', x: e.x, y: e.y - 10 });
    e.x = w.player.x + Math.cos(a) * 170;
    e.y = w.player.y + Math.sin(a) * 120;
    w.constrain(e, e.radius, true);
    w.fx({ type: 'blink', x: e.x, y: e.y - 10 });
    w.sfx('blink', 0.6);
    e.attackCd = Math.max(e.attackCd, 0.8);
  }
  ranged(w, e, dt, 130, 200);
}

function taxman(w: World, e: Enemy, dt: number) {
  const boss = w.boss;
  if (e.carried >= 8 || !boss || !boss.active) {
    if (!boss || !boss.active) {
      seek(w, e, e.speed);
      return;
    }
    const a = angleTo(e.x, e.y, boss.x, boss.y);
    e.vx = Math.cos(a) * e.speed;
    e.vy = Math.sin(a) * e.speed;
    if (dist2(e.x, e.y, boss.x, boss.y) < (boss.radius + 6) ** 2) {
      boss.hp = Math.min(boss.maxHp, boss.hp + e.carried * 18);
      w.fx({ type: 'heal', x: boss.x, y: boss.y - 40, a: e.carried * 18 });
      w.emit({ type: 'message', text: 'The King collects his tax.', tone: 'warn' });
      w.enemies.release(e);
    }
    return;
  }
  // Find the nearest sap on the ground.
  let best: import('./entities').Pickup | null = null;
  let bd = 260 * 260;
  for (const k of w.pickups.items) {
    if (!k.active || k.kind !== 'sap' || k.magnet) continue;
    const d = dist2(e.x, e.y, k.x, k.y);
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  if (!best) {
    seek(w, e, e.speed * 0.8);
    return;
  }
  const a = angleTo(e.x, e.y, best.x, best.y);
  e.vx = Math.cos(a) * e.speed;
  e.vy = Math.sin(a) * e.speed;
  if (bd < 64) {
    e.carried += best.value;
    w.pickups.release(best);
    w.fx({ type: 'coin', x: e.x, y: e.y - 6 });
  }
}

// ---------------------------------------------------------------------------
// The Thousand-Eyed Scarecrow: stands still, blinks about the field, and at half
// health sends out eyes that shield it until they are put out.

function watcher(w: World, e: Enemy, dt: number) {
  e.vx = 0;
  e.vy = 0;
  e.facing = w.player.x >= e.x ? 1 : -1;
  e.memo -= dt;
  if (e.phase === 0 && e.hp < e.maxHp * 0.5) {
    e.phase = 1;
    w.emit({ type: 'message', text: 'Its eyes tear free and take up a watch.', tone: 'warn' });
    w.sfx('boss_roar', 0.8);
    w.shake(4, 0.6);
    for (let i = 0; i < 4; i++) {
      const o = w.spawnEnemy('eye_orb', e.x, e.y - 30, { instant: true });
      if (o) {
        o.memo = (Math.PI * 2 * i) / 4;
        o.memo2 = e.id;
        o.attackCd = 1 + i * 0.4;
      }
    }
  }
  if (e.state === 'attack') {
    attackLoop(w, e, dt);
    return;
  }
  // Blink to a new vantage point now and then.
  if (e.memo <= 0 && e.state === 'move') {
    e.memo = e.phase ? 7 : 9;
    const a = w.rng.angle();
    w.fx({ type: 'blink', x: e.x, y: e.y - 20 });
    e.x = w.player.x + Math.cos(a) * 150;
    e.y = w.player.y + Math.sin(a) * 100;
    w.constrain(e, e.radius);
    w.fx({ type: 'blink', x: e.x, y: e.y - 20 });
    w.sfx('blink', 0.8);
    e.attackCd = Math.max(e.attackCd, 1);
  }
  attackLoop(w, e, dt);
}

function eyeOrb(w: World, e: Enemy, dt: number) {
  const owner = w.enemies.items.find((x) => x.active && x.id === e.memo2);
  if (!owner) {
    hitEnemyLater(w, e);
    return;
  }
  e.memo += dt * 0.8;
  const tx = owner.x + Math.cos(e.memo) * 62;
  const ty = owner.y - 18 + Math.sin(e.memo) * 40;
  e.vx = (tx - e.x) * 6;
  e.vy = (ty - e.y) * 6;
  attackLoop(w, e, dt, { freeze: false });
}

function hitEnemyLater(w: World, e: Enemy) {
  // The scarecrow is gone: its eyes close.
  w.fx({ type: 'poof', x: e.x, y: e.y - 10 });
  w.enemies.release(e);
}

// ---------------------------------------------------------------------------
// The Marrow King

const P1 = ['mk_decree', 'mk_judgment', 'mk_crownfall', 'mk_decree', 'mk_tax', 'mk_crownthrow', 'mk_judgment', 'mk_crownfall'];
const P2 = ['mk_decree2', 'mk_uprooting', 'mk_judgment', 'mk_lanes', 'mk_crownthrow', 'mk_decree2', 'mk_crownfall', 'mk_uprooting', 'mk_tax'];

function marrowKing(w: World, e: Enemy, dt: number) {
  e.stateT += dt;
  const cx = w.arenaCx;
  const cy = w.arenaCy;
  if (e.state === 'intro') {
    e.vx = 0;
    e.vy = 0;
    e.invulnerable = true;
    if (e.stateT > 3) {
      e.state = 'move';
      e.stateT = 0;
      e.invulnerable = false;
      e.attackCd = 0.8;
    }
    return;
  }
  if (e.state === 'dying') {
    e.vx = 0;
    e.vy = 0;
    return;
  }
  // Phase change at half health.
  if (e.phase === 0 && e.hp < e.maxHp * 0.5) {
    e.phase = 1;
    e.state = 'windup';
    e.stateT = 0;
    e.invulnerable = true;
    e.attack = null;
    w.clearBullets();
    w.emit({ type: 'bossPhase', phase: 2 });
    w.sfx('boss_roar', 1);
    w.shake(5, 1.6);
    w.fx({ type: 'bossphase', x: e.x, y: e.y });
    return;
  }
  if (e.state === 'windup') {
    e.vx = 0;
    e.vy = 0;
    if (e.stateT > 1.0 && e.memo2 === 0) {
      e.memo2 = 1;
      // The arena tightens; roots rise around the edge.
      w.director.shrinkArena(205);
      const p = w.player;
      const a = angleTo(e.x, e.y, p.x, p.y);
      p.kx += Math.cos(a) * 260;
      p.ky += Math.sin(a) * 260;
    }
    if (e.stateT > 2.6) {
      e.state = 'move';
      e.stateT = 0;
      e.invulnerable = false;
      e.attackCd = 0.6;
      e.attackIndex = 0;
    }
    return;
  }
  if (e.state === 'attack' && e.attack) {
    e.vx *= 0.9;
    e.vy *= 0.9;
    if (runAttack(w, e, dt)) {
      const pace = e.phase === 1 ? 0.62 : 0.85;
      e.attackCd = (e.attack.cooldown - (e.attack.steps[e.attack.steps.length - 1]?.at ?? 0) - e.attack.windup) * pace;
      e.attackCd = Math.max(0.55, e.attackCd);
      e.attack = null;
      e.state = 'move';
    }
    // Desperation: below 15% a slow spiral never stops.
    desperation(w, e, dt);
    return;
  }
  desperation(w, e, dt);
  // Drift: keep near the centre but lean towards the player.
  const tx = cx + (w.player.x - cx) * 0.35;
  const ty = cy - 30 + (w.player.y - cy) * 0.25;
  const d = dist(e.x, e.y, tx, ty);
  if (d > 6) {
    e.vx = ((tx - e.x) / d) * e.speed;
    e.vy = ((ty - e.y) / d) * e.speed;
  } else {
    e.vx = 0;
    e.vy = 0;
  }
  e.facing = w.player.x >= e.x ? 1 : -1;
  e.attackCd -= dt;
  if (e.attackCd <= 0) {
    const list = e.phase === 1 ? P2 : P1;
    const id = list[e.attackIndex % list.length];
    e.attackIndex++;
    startAttack(w, e, id);
    const a = ATTACKS[id];
    if (a.name) w.emit({ type: 'message', text: a.name, tone: 'warn' });
    w.sfx(id === 'mk_tax' ? 'boss_laugh' : 'boss_cast', 0.8);
  }
}

function desperation(w: World, e: Enemy, dt: number) {
  if (e.hp > e.maxHp * 0.15) return;
  e.memo += dt;
  const rate = 3.2;
  if (e.memo >= 1 / rate) {
    e.memo -= 1 / rate;
    const a = w.t * 0.9;
    for (let i = 0; i < 2; i++) {
      spawnBullet(w, e.x, e.y - 30, a + Math.PI * i, { sprite: 'eb_small_pink', radius: 2.5, damage: 10, speed: 48, life: 8 }, e.dmgMult);
    }
  }
}

export function bossSlam(w: World, e: Enemy) {
  firePattern(w, { kind: 'ring', bullet: { sprite: 'eb_orb_gold', radius: 3.5, damage: 13, speed: 60 }, count: 24, gaps: 2, gapSize: 2 }, { x: e.x, y: e.y - 20, aim: angleTo(e.x, e.y, w.player.x, w.player.y), dmgMult: e.dmgMult, owner: e });
  void TAU;
}
