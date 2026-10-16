// Debug and test hooks. `window.__HX` lets Playwright drive the real game:
// start expeditions, fast-forward the simulation, inspect state. URL flags:
//   ?debug           fps and entity counts overlay
//   ?quick=meadow    skip the menus into a fresh expedition
//   ?quick=farm      skip into the farm with a new profile
//   ?god             the player cannot be hurt

import type Phaser from 'phaser';
import { game } from '../game/state';
import { ui } from '../ui/store';
import { newProfile } from '../meta/profile';
import type { World } from '../sim/world';
import { missingFrames } from '../render/textures';
import { spawnBullet } from '../sim/patterns';
import { hitEnemy } from '../sim/combat';

export function installDebug(phaser: Phaser.Game) {
  const params = new URLSearchParams(location.search);
  const world = () => (window as unknown as { __HX_world?: World }).__HX_world ?? null;
  const api = {
    game,
    ui,
    phaser,
    world,
    missingFrames,
    scene: () => phaser.scene.getScenes(true).map((s) => s.scene.key),
    newGame() {
      game.profile = newProfile();
      game.save();
    },
    ready: () => ['title', 'farm', 'expedition'].some((k) => phaser.scene.isActive(k)),
    startExpedition(seed = 12345) {
      if (!game.profile) api.newGame();
      const loadout = game.makeLoadout(seed);
      phaser.scene.getScenes(true).forEach((s) => s.scene.stop());
      phaser.scene.start('expedition', { loadout });
    },
    startFarm(intro = false) {
      if (!game.profile) api.newGame();
      phaser.scene.getScenes(true).forEach((s) => s.scene.stop());
      phaser.scene.start('farm', { intro });
    },
    /** Advance the expedition by `seconds` of sim time as fast as possible. */
    simulate(seconds: number, dt = 1 / 60) {
      const w = world();
      if (!w) return null;
      for (let t = 0; t < seconds; t += dt) {
        w.step(dt);
        w.fxQueue.length = 0;
        if (w.phase === 'victory' || w.phase === 'defeat' || w.phase === 'extracted') break;
      }
      return api.state();
    },
    /** Jump to the last lull, then ring the bell so the boss rises. */
    skipToBoss() {
      const w = world();
      if (!w) return;
      w.director.index = w.director.region.acres.length - 1;
      w.director.t = 9999;
      w.elite = null;
      w.step(1 / 60);
      w.pressOn();
    },
    /** Deal damage to the boss through the normal combat path. */
    hitBoss(fraction = 1) {
      const w = world();
      if (!w?.boss) return false;
      hitEnemy(w, w.boss, w.boss.maxHp * fraction, { type: 'physical', canCrit: false });
      return true;
    },
    /** Give the current run a ready-made late-game build. */
    strongBuild() {
      const w = world();
      if (!w) return;
      for (const id of ['sunflower_halo', 'pumpkin_mortar', 'lightning_corn', 'honeycomb_hive', 'carrot_lance']) w.run.addWeapon(id, [], 4);
      for (const wi of w.run.weapons) wi.level = 4;
      w.run.upgradeMods = { maxHp: 60, damage: 0.8, attackSpeed: 0.3, armour: 4 };
      w.run.level = 22;
      w.run.recompute();
      w.player.hp = w.run.stats.maxHp;
    },
    /** Fill the screen with enemies and live bullets for performance checks. */
    stress(enemies = 300, bullets = 1000) {
      const w = world();
      if (!w) return null;
      w.godMode = true;
      w.noSpawns = true;
      for (let i = 0; i < enemies; i++) w.spawnEnemy(i % 3 ? 'nibbler' : 'mudling', w.player.x + Math.cos(i) * (80 + (i % 7) * 30), w.player.y + Math.sin(i) * (60 + (i % 5) * 25), { instant: true });
      w.input.fire = true;
      const spec = { sprite: 'eb_orb_pink', radius: 3.5, damage: 0, speed: 30, life: 30 };
      let n = 0;
      const tick = () => {
        for (let k = 0; k < 60 && n < bullets; k++, n++) spawnBullet(w, w.player.x + Math.cos(n * 0.7) * (40 + (n % 9) * 30), w.player.y + Math.sin(n * 0.7) * (30 + (n % 7) * 22), n * 0.37, spec, 1);
        if (n < bullets) requestAnimationFrame(tick);
      };
      tick();
      return { enemies: w.enemies.count };
    },
    state() {
      const w = world();
      return {
        scenes: api.scene(),
        panel: ui.get().panel,
        screen: ui.get().screen,
        world: w
          ? {
              t: w.t,
              phase: w.phase,
              acre: w.director.index,
              hp: w.player.hp,
              x: w.player.x,
              y: w.player.y,
              level: w.run.level,
              pending: w.run.pendingLevels,
              sap: w.run.sap,
              enemies: w.enemies.count,
              bullets: w.bullets.count,
              projs: w.projs.count,
              kills: w.stats.kills,
              weapons: w.run.weapons.map((x) => `${x.def.id}:${x.level}`),
              boss: w.boss ? { hp: w.boss.hp, max: w.boss.maxHp, phase: w.boss.phase, state: w.boss.state } : null,
            }
          : null,
        profile: game.profile ? { day: game.profile.day, farthings: game.profile.farthings, seeds: game.profile.seeds.length, produce: game.profile.produce.length, runs: game.profile.stats.runs } : null,
      };
    },
  };
  (window as unknown as { __HX: typeof api }).__HX = api;
  if (params.has('god')) {
    setInterval(() => {
      const w = world();
      if (w) w.godMode = true;
    }, 500);
  }
  const quick = params.get('quick');
  if (quick) {
    const go = () => {
      if (!phaser.scene.isActive('title')) return setTimeout(go, 100);
      if (quick === 'farm') api.startFarm(params.has('intro'));
      else api.startExpedition(Number(params.get('seed') ?? 12345));
    };
    setTimeout(go, 100);
  }
  if (params.has('debug')) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:4px;bottom:4px;color:#ffeb57;font:12px monospace;background:rgba(0,0,0,.6);padding:2px 6px;z-index:99;pointer-events:none;white-space:pre';
    document.body.appendChild(el);
    setInterval(() => {
      const w = world();
      el.textContent = `fps ${Math.round(phaser.loop.actualFps)}` + (w ? `  enemies ${w.enemies.count}  bullets ${w.bullets.count}  shots ${w.projs.count}  fx ${w.fxQueue.length}  t ${w.t.toFixed(0)}` : '');
    }, 250);
  }
}
