// The encounter director. Runs a region's authored acres: spawn rate curves,
// enemy mixes, set-piece events, elites and side objectives; pauses for lulls
// (Mags's cart, the way home); then raises the boss arena.
//
// Spawning adapts within limits: if the player is clearing the field quickly
// it spawns faster, if they are nearly dead it eases off. It never decides
// the encounter on its own: the acre script does.

import { TAU, angleTo, clamp, dist2, lerp } from '../core/math';
import { ENEMIES } from '../data/enemies';
import type { AcreDef, AcreEvent, RegionDef } from '../data/regions';
import type { Enemy } from './entities';
import type { World, Prop } from './world';
import { BOSS_ARENA_RADIUS } from './map';
import { dropSeed, dropSap } from './combat';

export class Director {
  index = 0;
  t = 0;
  budget = 0;
  surgeT = 0;
  surgeMult = 1;
  fired = new Set<number>();
  lullT = 0;
  bossT = 0;
  bossDeathT = -1;
  private waitingPressOn = false;
  pressOnT = -1;

  constructor(private w: World, public region: RegionDef) {
    w.phase = 'acre';
    this.announce();
  }

  get acre(): AcreDef | null {
    return this.region.acres[this.index] ?? null;
  }

  get acreProgress(): number {
    const a = this.acre;
    return a ? clamp(this.t / a.duration, 0, 1) : 1;
  }

  private announce() {
    const a = this.acre;
    if (a) this.w.emit({ type: 'acre', index: this.index, name: a.name, intro: a.intro });
  }

  update(dt: number) {
    const w = this.w;
    if (w.phase === 'acre') this.updateAcre(dt);
    else if (w.phase === 'lull') this.updateLull(dt);
    else if (w.phase === 'boss') this.updateBoss(dt);
  }

  // -------------------------------------------------------------------------

  private updateAcre(dt: number) {
    const w = this.w;
    const a = this.acre!;
    this.t += dt;
    // Events.
    a.events.forEach((ev, i) => {
      if (!this.fired.has(i) && this.t >= ev.at) {
        this.fired.add(i);
        this.runEvent(ev);
      }
    });
    if (this.surgeT > 0) {
      this.surgeT -= dt;
      if (this.surgeT <= 0) this.surgeMult = 1;
    }
    if (!w.noSpawns) this.spawn(dt, a);
    // An elite holds the acre open until it falls (or 45s pass).
    const eliteHolds = w.elite && w.elite.active && this.t < a.duration + 45;
    if (this.t >= a.duration && !eliteHolds) this.endAcre();
  }

  private spawn(dt: number, a: AcreDef) {
    const w = this.w;
    const alive = w.enemies.count;
    const progress = this.acreProgress;
    let rate = lerp(a.rate[0], a.rate[1], progress) * w.tierRate * this.surgeMult;
    // Adaptive pressure, bounded.
    // Expected damage output along a typical run; ahead of the curve means more enemies.
    const elapsed = this.index * 150 + this.t;
    const expected = 12 + elapsed * 0.22;
    const ratio = w.recentDps() > 0 ? clamp(w.recentDps() / expected, 0.85, 1.3) : 1;
    rate *= ratio;
    if (alive < a.maxAlive * 0.2) rate *= 1.3;
    const hpFrac = w.player.hp / w.run.stats.maxHp;
    if (hpFrac < 0.3) rate *= 0.75;
    if (w.elite && w.elite.active) rate *= 0.6;
    if (w.run.curses.some((c) => c.id === 'hungry_soil')) rate *= 1.3;
    this.budget += rate * dt;
    let guard = 0;
    while (this.budget > 0 && w.enemies.count < a.maxAlive && guard++ < 8) {
      const pool = a.table.filter((s) => (s.from ?? 0) <= this.t);
      const pick = w.rng.weighted(pool, (s) => s.weight);
      if (!pick) break;
      const def = ENEMIES[pick.enemy];
      const n = pick.group ? w.rng.int(pick.group[0], pick.group[1]) : 1;
      const cost = def.cost * n;
      if (this.budget < cost && this.budget < 6) break;
      this.budget -= cost;
      const at = this.spawnPoint(340, 420);
      for (let i = 0; i < n; i++) {
        const ox = w.rng.range(-18, 18);
        const oy = w.rng.range(-18, 18);
        w.spawnEnemy(pick.enemy, at.x + ox, at.y + oy);
      }
    }
  }

  /** A point off-screen around the player, inside the map and clear of obstacles. */
  spawnPoint(min: number, max: number): { x: number; y: number } {
    const w = this.w;
    const p = w.player;
    const m = w.map.margin + 16;
    for (let i = 0; i < 24; i++) {
      const a = w.rng.angle();
      const d = w.rng.range(min, max);
      const x = clamp(p.x + Math.cos(a) * d, m, w.map.w - m);
      const y = clamp(p.y + Math.sin(a) * d * 0.75, m, w.map.h - m);
      // If clamping dragged it near the player, try again.
      if (dist2(x, y, p.x, p.y) < 210 * 210) continue;
      if (w.map.obstacles.some((o) => dist2(x, y, o.x, o.y) < (o.r + 10) ** 2)) continue;
      return { x, y };
    }
    const a = w.rng.angle();
    return { x: clamp(p.x + Math.cos(a) * 300, m, w.map.w - m), y: clamp(p.y + Math.sin(a) * 220, m, w.map.h - m) };
  }

  private runEvent(ev: AcreEvent) {
    const w = this.w;
    const p = w.player;
    if (ev.message) w.emit({ type: 'message', text: ev.message, tone: ev.kind === 'objective' ? 'good' : 'warn' });
    switch (ev.kind) {
      case 'encircle': {
        // A ring with a deliberate gap so it can always be escaped.
        const gapAt = w.rng.angle();
        for (let i = 0; i < ev.count; i++) {
          const a = gapAt + 0.6 + ((TAU - 1.2) * i) / (ev.count - 1);
          const x = p.x + Math.cos(a) * ev.radius;
          const y = p.y + Math.sin(a) * ev.radius * 0.8;
          const m = w.map.margin + 12;
          w.spawnEnemy(ev.enemy, clamp(x, m, w.map.w - m), clamp(y, m, w.map.h - m));
        }
        w.sfx('rumble', 0.7);
        break;
      }
      case 'flock':
      case 'stampede': {
        const side = w.rng.angle();
        const cx = p.x + Math.cos(side) * 400;
        const cy = p.y + Math.sin(side) * 260;
        for (let i = 0; i < ev.count; i++) {
          const nx = -Math.sin(side);
          const ny = Math.cos(side);
          const off = (i - (ev.count - 1) / 2) * 28;
          const m = w.map.margin + 12;
          const e = w.spawnEnemy(ev.enemy, clamp(cx + nx * off, m, w.map.w - m), clamp(cy + ny * off, m, w.map.h - m));
          if (e && ev.kind === 'stampede') e.attackCd = 0.2 + i * 0.25;
        }
        break;
      }
      case 'surge':
        this.surgeT = ev.duration;
        this.surgeMult = ev.mult;
        break;
      case 'elite': {
        const at = this.spawnPoint(220, 260);
        // If the player woke the Watcher, it comes instead of the acre's elite.
        const watcher = w.run.flags.watcher && !w.run.flags.watcherSpawned;
        if (watcher) {
          w.run.flags.watcherSpawned = true;
          w.emit({ type: 'message', text: 'A thousand eyes open across the field.', tone: 'warn' });
        }
        const e = w.spawnEnemy(watcher ? 'eyes' : ev.enemy, at.x, at.y);
        if (e) {
          w.elite = e;
          w.emit({ type: 'elite', name: e.def.name });
          if (!watcher) w.emit({ type: 'message', text: ev.message, tone: 'warn' });
          w.sfx('elite', 1);
        }
        break;
      }
      case 'objective': {
        const at = this.spawnPoint(150, 200);
        w.props.push({ kind: 'shrine', x: at.x, y: at.y, r: 14, progress: 0, active: true });
        w.emit({ type: 'message', text: ev.message, tone: 'good' });
        break;
      }
    }
  }

  completeShrine(pr: Prop) {
    const w = this.w;
    pr.active = false;
    w.fx({ type: 'cleanse', x: pr.x, y: pr.y });
    w.sfx('cleanse', 1);
    w.emit({ type: 'objective', done: true });
    w.emit({ type: 'message', text: 'The shrine is cleansed. The Root gives something back.', tone: 'good' });
    dropSeed(w, pr.x, pr.y, { rare: true });
    w.dropPickup('material', pr.x, pr.y, 1, 'root_pollen');
    for (let i = 0; i < 6; i++) w.dropPickup('farthing', pr.x, pr.y, 1);
    dropSap(w, pr.x, pr.y, 25);
    // Pests that were drawn to it scatter.
    for (const e of w.queryEnemies(pr.x, pr.y, 90)) e.fearT = 2;
  }

  private endAcre() {
    const w = this.w;
    w.witherField();
    // Shrines that were not cleansed fade.
    for (const pr of w.props) if (pr.kind === 'shrine') pr.active = false;
    w.phase = 'lull';
    this.lullT = 0;
    this.waitingPressOn = true;
    const final = this.index >= this.region.acres.length - 1;
    // Mags's cart and the way home appear near the player.
    const p = w.player;
    const cart = this.freeSpot(p.x + 70, p.y - 40);
    const exit = this.freeSpot(p.x - 70, p.y - 30);
    w.props = w.props.filter((pr) => pr.kind === 'shrine' && pr.active);
    w.props.push({ kind: 'cart', x: cart.x, y: cart.y, r: 22, active: true });
    w.props.push({ kind: 'exit', x: exit.x, y: exit.y, r: 12, active: true });
    // Wild crops pick a new trait for the next acre.
    for (const wi of w.run.weapons) wi.rollWild(w.rng);
    // Bargain curses expire.
    w.run.curses = w.run.curses.filter((c) => --c.acresLeft > 0);
    if (!w.run.curses.length && Object.keys(w.run.tempMods).length) {
      const keep = w.player.buffAs;
      w.run.tempMods = keep ? { attackSpeed: keep } : {};
      w.run.recompute();
    }
    w.emit({ type: 'lull', index: this.index, final });
    w.sfx('lull', 1);
  }

  private freeSpot(x: number, y: number) {
    const w = this.w;
    const m = w.map.margin + 30;
    let px = clamp(x, m, w.map.w - m);
    let py = clamp(y, m, w.map.h - m);
    for (let i = 0; i < 20; i++) {
      if (!w.map.obstacles.some((o) => dist2(px, py, o.x, o.y) < (o.r + 26) ** 2)) break;
      px = clamp(px + w.rng.range(-40, 40), m, w.map.w - m);
      py = clamp(py + w.rng.range(-40, 40), m, w.map.h - m);
    }
    return { x: px, y: py };
  }

  private updateLull(dt: number) {
    this.lullT += dt;
    if (this.pressOnT >= 0) {
      this.pressOnT -= dt;
      if (this.pressOnT < 0) this.beginNext();
    }
  }

  /** Called when the player rings Mags's bell. */
  pressOn() {
    const w = this.w;
    if (w.phase !== 'lull' || !this.waitingPressOn) return;
    this.waitingPressOn = false;
    this.pressOnT = 2.2;
    w.emit({ type: 'message', text: this.index >= this.region.acres.length - 1 ? 'The ground begins to shake...' : 'Mags rings her bell. Onwards.', tone: 'info' });
    w.sfx('bell', 0.9);
  }

  get canPressOn() {
    return this.waitingPressOn;
  }

  private beginNext() {
    const w = this.w;
    w.props = [];
    if (this.index >= this.region.acres.length - 1) {
      this.startBoss();
      return;
    }
    this.index++;
    this.t = 0;
    this.budget = 4;
    this.fired.clear();
    w.phase = 'acre';
    this.announce();
  }

  // -------------------------------------------------------------------------
  // Boss

  private startBoss() {
    const w = this.w;
    w.phase = 'boss';
    w.arenaCx = w.map.centre.x;
    w.arenaCy = w.map.centre.y;
    w.arenaR = BOSS_ARENA_RADIUS;
    // Walk the player in if they are outside; then the arena closes.
    const p = w.player;
    if (dist2(p.x, p.y, w.arenaCx, w.arenaCy) > (w.arenaR - 40) ** 2) {
      const a = angleTo(w.arenaCx, w.arenaCy, p.x, p.y);
      p.x = w.arenaCx + Math.cos(a) * (w.arenaR - 60);
      p.y = w.arenaCy + Math.sin(a) * (w.arenaR - 60);
      w.fx({ type: 'poof', x: p.x, y: p.y });
    }
    w.arenaOn = true;
    this.bossT = 0;
    // The royal patch is the King's alone.
    for (const e of w.enemies.items) if (e.active) w.enemies.release(e);
    w.elite = null;
    w.clearBullets(false);
    const boss = w.spawnEnemy(this.region.boss, w.arenaCx, w.arenaCy - 40, { instant: true });
    if (boss) {
      w.boss = boss;
      w.emit({ type: 'boss', name: boss.def.name });
      w.emit({ type: 'message', text: this.region.bossIntro, tone: 'warn' });
      w.fx({ type: 'bossrise', x: boss.x, y: boss.y });
      w.sfx('boss_rise', 1);
      w.shake(4, 2.5);
    }
  }

  shrinkArena(r: number) {
    const w = this.w;
    w.arenaR = r;
    w.fx({ type: 'arenashrink', x: w.arenaCx, y: w.arenaCy, c: r });
  }

  private updateBoss(dt: number) {
    const w = this.w;
    this.bossT += dt;
    if (this.bossDeathT >= 0) {
      this.bossDeathT += dt;
      const b = w.boss;
      if (b && this.bossDeathT < 3 && Math.floor(this.bossDeathT * 6) !== Math.floor((this.bossDeathT - dt) * 6)) {
        w.fx({ type: 'explode', x: b.x + w.rng.range(-26, 26), y: b.y - w.rng.range(0, 50), c: 18, s: 'small' });
        w.sfx('boom', 0.5);
      }
      if (this.bossDeathT >= 3.2 && b && b.active) {
        this.bossLoot(b);
        w.enemies.release(b);
      }
      if (this.bossDeathT >= 5.5) {
        w.collectAll();
        w.phase = 'victory';
        w.arenaOn = false;
        w.emit({ type: 'victory' });
      }
      return;
    }
    // Light reinforcements so the fight has texture, never during the intro.
    if (w.boss && w.boss.state !== 'intro' && !w.noSpawns) {
      this.budget += dt * (w.boss.phase === 1 ? 0.9 : 0.6) * w.tierRate;
      if (this.budget >= 3 && w.enemies.count < 26) {
        this.budget -= 3;
        const a = w.rng.angle();
        const id = w.rng.pick(['nibbler', 'nibbler', 'sporeling', 'mudling']);
        w.spawnEnemy(id, w.arenaCx + Math.cos(a) * (w.arenaR - 20), w.arenaCy + Math.sin(a) * (w.arenaR - 20));
      }
    }
  }

  bossDefeated(_e: Enemy) {
    this.bossDeathT = 0;
    const w = this.w;
    w.emit({ type: 'message', text: 'The Marrow King falls.', tone: 'good' });
    for (const e of w.enemies.items) if (e.active && !e.boss) w.enemies.release(e);
  }

  private bossLoot(b: Enemy) {
    const w = this.w;
    w.fx({ type: 'lootburst', x: b.x, y: b.y - 20 });
    w.sfx('loot_legendary', 1);
    dropSap(w, b.x, b.y, 120);
    for (let i = 0; i < 40 + w.rng.int(0, 20); i++) w.dropPickup('farthing', b.x, b.y - 10, 1);
    w.dropPickup('material', b.x, b.y, w.rng.int(1, 2), 'marrow_crown');
    w.dropPickup('material', b.x, b.y, 2, 'root_pollen');
    w.dropPickup('material', b.x, b.y, 1, w.rng.pick(['void_shard', 'red_gem', 'frost_crystal', 'storm_glass']));
    const heart = dropSeed(w, b.x, b.y - 10, { species: 'kingsmarrow' });
    if (heart) heart.rarity = 4;
    for (let i = 0; i < 4; i++) dropSeed(w, b.x, b.y, { rare: true });
    for (let i = 0; i < 20; i++) w.dropPickup('farthing', b.x, b.y - 10, 1);
  }
}
