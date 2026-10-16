// A simple autopilot that plays an expedition headlessly. Used by unit tests,
// by `npm run balance` and by the in-browser debug overlay. It dodges bullets
// by steering away from them, kites enemies, grabs loot when safe, takes the
// first sensible upgrade and shops a little at every lull.

import { angleTo, dist2 } from '../core/math';
import { Rng } from '../core/rng';
import type { World } from './world';
import { applyOffer, buySlot, makeShop, rollLevelUp, evolveWeapon } from './upgrades';

export interface BotOptions {
  /** 0 = clumsy, 1 = sharp. Scales dodge awareness. */
  skill: number;
  /** Stop at this lull index and extract instead of pressing on. */
  extractAt?: number;
  shop?: boolean;
  /** Seconds before a new bullet is noticed (people are not instant). */
  reaction?: number;
}

export class Bot {
  private rng: Rng;
  private orbit = 1;
  private orbitT = 0;

  constructor(private w: World, private o: BotOptions = { skill: 0.7, shop: true }) {
    this.rng = new Rng(w.run.loadout.seed ^ 0xb07);
  }

  /** Decide input for this frame and handle UI events the bot cares about. */
  think(dt: number) {
    const w = this.w;
    const p = w.player;
    this.orbitT -= dt;
    if (this.orbitT <= 0) {
      this.orbitT = 3 + this.rng.next() * 4;
      if (this.rng.chance(0.4)) this.orbit = -this.orbit;
    }
    let fx = 0;
    let fy = 0;
    const sense = 40 + 60 * this.o.skill;
    let closestBullet = 1e9;
    const reaction = this.o.reaction ?? 0;
    for (const b of w.bullets.items) {
      if (!b.active) continue;
      if (b.age < reaction) continue;
      const d2 = dist2(p.x, p.y - 4, b.x, b.y);
      if (d2 > sense * sense) continue;
      // Only care about bullets heading towards us.
      const bx = Math.cos(b.angle);
      const by = Math.sin(b.angle);
      const toP = { x: p.x - b.x, y: p.y - 4 - b.y };
      if (bx * toP.x + by * toP.y < -4) continue;
      const d = Math.sqrt(d2) + 1;
      closestBullet = Math.min(closestBullet, d);
      // Move perpendicular to its path, away from its line.
      const cross = bx * toP.y - by * toP.x;
      const side = cross >= 0 ? 1 : -1;
      fx += (-by * side * 900) / (d * d) + (toP.x * 300) / (d * d * d);
      fy += (bx * side * 900) / (d * d) + (toP.y * 300) / (d * d * d);
    }
    for (const e of w.enemies.items) {
      if (!e.active || e.hidden) continue;
      const d2 = dist2(p.x, p.y, e.x, e.y);
      const r = 70 + e.radius;
      if (d2 > r * r) continue;
      const d = Math.sqrt(d2) + 1;
      fx += ((p.x - e.x) / d) * (r / d) * 0.9;
      fy += ((p.y - e.y) / d) * (r / d) * 0.9;
    }
    for (const h of w.hazards.items) {
      if (!h.active || h.owner !== 'enemy') continue;
      const d2 = dist2(p.x, p.y, h.x, h.y);
      const r = h.radius + 16;
      if (d2 > r * r) continue;
      const d = Math.sqrt(d2) + 1;
      fx += ((p.x - h.x) / d) * 3;
      fy += ((p.y - h.y) / d) * 3;
    }
    // Circle the centre of mass of the arena so we do not get cornered.
    const cx = w.arenaOn ? w.arenaCx : w.map.w / 2;
    const cy = w.arenaOn ? w.arenaCy : w.map.h / 2;
    const ca = angleTo(cx, cy, p.x, p.y);
    const cd = Math.sqrt(dist2(cx, cy, p.x, p.y));
    const want = w.arenaOn ? w.arenaR * 0.55 : 260;
    fx += -Math.sin(ca) * 0.5 * this.orbit + Math.cos(ca) * (want - cd) * 0.01;
    fy += Math.cos(ca) * 0.5 * this.orbit + Math.sin(ca) * (want - cd) * 0.01;
    // Lulls: walk to the cart.
    if (w.phase === 'lull') {
      const cart = w.props.find((pr) => pr.kind === 'cart');
      if (cart) {
        const a = angleTo(p.x, p.y, cart.x, cart.y);
        fx = Math.cos(a);
        fy = Math.sin(a);
      }
    }
    const l = Math.hypot(fx, fy);
    w.input.mx = l > 0.05 ? fx / l : 0;
    w.input.my = l > 0.05 ? fy / l : 0;
    const target = w.queryEnemies(p.x, p.y, 220)[0];
    w.input.aimX = target ? target.x : p.x + 10;
    w.input.aimY = target ? target.y : p.y;
    w.input.fire = true;
    if (closestBullet < 12 + 10 * this.o.skill && this.rng.chance(this.o.skill)) w.input.dash = true;
    if (this.rng.chance(0.02)) w.input.active = true;
    if (p.hp < w.run.stats.maxHp * 0.35) w.input.consumable = true;
  }

  /** Drain world events, making choices where a player would. */
  handleEvents() {
    const w = this.w;
    const evs = w.events.splice(0);
    for (const ev of evs) {
      if (ev.type === 'levelup') {
        while (w.run.pendingLevels > 0) {
          const offers = rollLevelUp(w, this.rng, 3);
          const evo = offers.find((o) => o.kind === 'evolve');
          const weap = offers.find((o) => o.kind === 'weaponNew' || o.kind === 'weaponUp');
          applyOffer(w, evo ?? weap ?? offers[0]);
          w.consumeLevel();
        }
      } else if (ev.type === 'chest') {
        const evo = w.run.weapons.map((wi) => ({ wi, e: wi.evolution(w.run) })).find((x) => x.e);
        if (evo) evolveWeapon(w, evo.wi, evo.e!.into);
      } else if (ev.type === 'lull') {
        if (this.o.extractAt !== undefined && ev.index >= this.o.extractAt) {
          w.extract();
          continue;
        }
        if (this.o.shop !== false) {
          const shop = makeShop(w, this.rng);
          for (const s of shop.slots) buySlot(w, s);
        }
        w.pressOn();
      }
    }
  }
}

export interface SimReport {
  outcome: string;
  time: number;
  level: number;
  kills: number;
  sapCollected: number;
  hp: number;
  acre: number;
  bossHpFrac: number | null;
  weapons: string[];
  dps: { id: string; dmg: number }[];
  cause: string;
  acreTimes: number[];
  levelAt: Record<string, number>;
}

/** Run a whole expedition headlessly at a fixed timestep. */
export function simulate(w: World, bot: Bot, maxSeconds = 1500): SimReport {
  const dt = 1 / 60;
  const acreTimes: number[] = [];
  const levelAt: Record<string, number> = {};
  let lastAcre = -1;
  let lastPhase = w.phase;
  for (let t = 0; t < maxSeconds; t += dt) {
    bot.think(dt);
    w.step(dt);
    w.fxQueue.length = 0;
    bot.handleEvents();
    if (w.director.index !== lastAcre) {
      lastAcre = w.director.index;
      acreTimes.push(Math.round(w.t));
    }
    for (const mark of [60, 180, 300, 600]) if (levelAt[mark] === undefined && w.t >= mark) levelAt[mark] = w.run.level;
    if (w.phase !== lastPhase) lastPhase = w.phase;
    if (w.phase === 'victory' || w.phase === 'defeat' || w.phase === 'extracted') break;
  }
  return {
    outcome: w.phase,
    time: Math.round(w.t),
    level: w.run.level,
    kills: w.stats.kills,
    sapCollected: Math.round(w.run.sapCollected),
    hp: Math.round(w.player.hp),
    acre: w.director.index,
    bossHpFrac: w.boss ? Math.round((w.boss.hp / w.boss.maxHp) * 100) / 100 : null,
    weapons: w.run.weapons.map((x) => `${x.def.id}:${x.level}`),
    dps: [...w.run.weapons, w.run.held].map((x) => ({ id: x.def.id, dmg: Math.round(x.damageDealt) })).sort((a, b) => b.dmg - a.dmg),
    cause: `${w.lastHurtBy} (taken ${Math.round(w.stats.damageTaken)}, boss@${w.director.region.acres.reduce((s, a) => s + a.duration, 0)})`,
    acreTimes,
    levelAt,
  };
}
