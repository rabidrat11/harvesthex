// The expedition: runs the simulation, draws it, and turns its events into
// interface moments (level-ups, Mags's cart, chests, the results screen).

import Phaser from 'phaser';
import { World, type GameEvent } from '../sim/world';
import { ExpeditionRenderer } from '../render/expeditionRenderer';
import { game } from '../game/state';
import { bridge, ui, type ExpeditionHud, type WeaponHud } from '../ui/store';
import { applyOffer, buySlot, evolveWeapon, makeShop, rerollShop, rollLevelUp, takeBargain, buyTea, rollRarity, type Offer, type Shop } from '../sim/upgrades';
import { Rng } from '../core/rng';
import type { Loadout } from '../sim/run';
import type { WeaponInstance } from '../sim/weapons';
import { buildResult, applyResult, checkpointResult, type RunResult } from '../meta/results';
import { ITEMS } from '../data/items';
import { MATERIALS } from '../data/materials';
import { CROPS } from '../data/crops';
import { WEAPONS } from '../data/weapons';
import { TRAITS } from '../data/traits';
import { clamp } from '../core/math';
import { keyLabel } from '../meta/settings';
import { MENU_ARM_MS } from '../ui/menuArm';
import type { TraitId } from '../data/types';

export class ExpeditionScene extends Phaser.Scene {
  w!: World;
  r!: ExpeditionRenderer;
  private loadout!: Loadout;
  private rng!: Rng;
  private hudT = 0;
  private shop: Shop | null = null;
  private shopForLull = -1;
  private levelOffers: Offer[] = [];
  private chestOffers: Offer[] = [];
  /** Chests picked up while another choice was open, shown one after another. */
  private chestsWaiting = 0;
  /** When the current panel opened: a choice made within a blink is a stray click or key. */
  private panelAt = 0;
  private onBlur = () => {
    // Alt-tab or a hidden tab mid-fight: pause rather than play on unseen.
    if (!this.paused && !this.ended && this.scene.isActive()) this.openPanel('pause');
  };
  private onVisibility = () => {
    if (document.hidden) this.onBlur();
  };
  private endT = -1;
  private ended = false;
  /** Set once the player has chosen to go home, so a second press does nothing. */
  private leaving = false;
  private camX = 0;
  private camY = 0;
  private bossShown = false;
  private stepT = 0;
  private frameTimes: number[] = [];
  private banked: RunResult | null = null;
  private checkpointT = 15;
  private errors = 0;

  constructor() {
    super('expedition');
  }

  init(data: { loadout: Loadout }) {
    this.loadout = data.loadout;
  }

  create() {
    const s = game.settings;
    this.w = new World(this.loadout, { autoAim: s.autoAim, autoFire: s.autoFire, damageNumbers: s.damageNumbers, intensity: s.intensity });
    this.rng = new Rng(this.loadout.seed ^ 0x51a7);
    this.r = new ExpeditionRenderer(this, this.w);
    this.ended = false;
    this.leaving = false;
    this.banked = null;
    this.errors = 0;
    this.checkpointT = 15;
    this.endT = -1;
    this.shop = null;
    this.shopForLull = -1;
    this.bossShown = false;
    this.hudT = 0;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.w.map.w, this.w.map.h);
    cam.setRoundPixels(true);
    this.camX = this.w.player.x - 320;
    this.camY = this.w.player.y - 180;
    cam.setScroll(this.camX, this.camY);
    cam.fadeIn(400, 28, 18, 28);
    game.input.clear();
    game.audio.playMusic('meadow');
    game.audio.music?.setIntensity(0);
    this.registerBridge();
    ui.set({ screen: 'expedition', results: null });
    ui.closeAll();
    this.pushHud(true);
    this.events.once('shutdown', () => this.shutdown());
    this.chestsWaiting = 0;
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    if (game.profile && game.profile.stats.runs === 0) {
      const k = (a: 'dash' | 'consumable') => keyLabel(game.settings.keys[a][0]);
      const tips = [
        'WASD to move. Your crops fight by themselves.',
        'Aim with the mouse; hold the left button to use your held weapon.',
        `Press ${k('dash')} to dash: you are untouchable mid-dash, even through bullets.`,
        'Only the small dot at your middle can be hit. Weave through the gaps.',
        'Collect amber sap: it levels you up, buys from Mags, and feeds your farm.',
      ];
      tips.forEach((t, i) => this.time.delayedCall(1500 + i * 5500, () => ui.toast(t, 'info')));
    }
    (window as unknown as { __HX_world?: World }).__HX_world = this.w;
  }

  private shutdown() {
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    bridge.expedition = null;
    this.r?.destroy();
    (window as unknown as { __HX_world?: World }).__HX_world = undefined;
  }

  // -------------------------------------------------------------------------

  private get paused() {
    return ui.get().panel !== null;
  }

  update(time: number, deltaMs: number) {
    try {
      this.frame(time, deltaMs);
      this.errors = 0;
    } catch (err) {
      // Never let one bad frame cost a whole expedition: after a few in a row,
      // bank what the player has and take them home.
      console.error('[expedition] frame error', err);
      if (++this.errors >= 5 && !this.ended) {
        this.ended = true;
        this.endT = 0;
        this.bankSafely(this.w.phase === 'lull');
        ui.toast('Something went wrong out there. Mags brought you, and your haul, home.', 'warn');
      }
      // However the end went wrong, an ended run always reaches its results.
      if (this.ended && this.endT < 0 && !this.leaving && ui.get().panel !== 'results') this.endT = 0;
      if (this.ended && this.errors >= 5) {
        game.input.endFrame();
        if (ui.get().panel !== 'results' && this.banked) this.openPanel('results', { result: this.banked });
      }
    }
  }

  private frame(_time: number, deltaMs: number) {
    const input = game.input;
    const w = this.w;
    let dt = Math.min(0.05, deltaMs / 1000);
    input.pollGamepad(deltaMs / 1000);
    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > 120) this.frameTimes.shift();

    if (input.pressed('pause') && !this.ended) {
      if (!this.paused) this.openPanel('pause');
      else if (ui.get().panel === 'pause') this.resume();
    }
    if (input.pressed('map') && !this.paused && !this.ended) this.openPanel('character', { inRun: true });
    input.blocked = this.paused;

    if (!this.paused) {
      // Input -> sim.
      const m = input.move();
      const cam = this.cameras.main;
      w.input.mx = m.x;
      w.input.my = m.y;
      w.input.aimX = cam.scrollX + input.gameX;
      w.input.aimY = cam.scrollY + input.gameY;
      w.input.fire = input.mouseDown || input.padFire;
      // Gamepad aim: the right stick, or the nearest enemy when it rests.
      if (input.lastDevice === 'pad') {
        if (input.padAim) {
          w.input.aimX = w.player.x + input.padAim.x * 90;
          w.input.aimY = w.player.y - 4 + input.padAim.y * 90;
        } else {
          const e = w.queryEnemies(w.player.x, w.player.y, 240)[0];
          if (e) {
            w.input.aimX = e.x;
            w.input.aimY = e.y;
          }
        }
      }
      if (input.pressed('dash')) w.input.dash = true;
      if (input.rightPressed) w.input.active = true;
      if (input.pressed('consumable')) w.input.consumable = true;
      if (input.pressed('interact')) w.input.interact = true;
      // Hit-stop slows the world for a few frames on heavy moments.
      if (w.hitstopT > 0 && !game.settings.reducedEffects) {
        w.hitstopT -= dt;
        dt *= 0.15;
      } else w.hitstopT = 0;
      w.step(dt);
      this.stepT += dt;
    }

    // Effects and sounds.
    for (const f of w.fxQueue) this.r.handleFx(f);
    w.fxQueue.length = 0;
    this.drainEvents();
    this.r.sync(this.paused ? 0 : dt);
    this.updateCamera(deltaMs / 1000);

    // Keep a checkpoint so a crash or a refresh never loses the whole haul.
    if (!this.ended) {
      this.checkpointT -= deltaMs / 1000;
      if (this.checkpointT <= 0) {
        this.checkpointT = 20;
        this.checkpoint(w.phase === 'lull');
      }
    }

    if (!this.ended && (w.phase === 'victory' || w.phase === 'defeat' || w.phase === 'extracted')) {
      this.ended = true;
      // The results come up after a beat, whatever happens while banking.
      this.endT = w.phase === 'defeat' ? 1.8 : w.phase === 'victory' ? 0.6 : 0.4;
      // Bank immediately, before any screen: the results are already saved.
      this.bankSafely(false);
      if (w.phase === 'victory') {
        game.audio.playMusic('victory');
        this.r.lowerArena();
      }
      if (w.phase === 'defeat') game.audio.playMusic(null);
    }
    // Results wait for any open choice (a last chest, a level-up) to be made.
    if (this.ended && this.endT >= 0 && !this.paused) {
      this.endT -= deltaMs / 1000;
      if (this.endT < 0) this.finishRun();
    }

    this.hudT -= deltaMs / 1000;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.pushHud();
    }
    input.endFrame();
  }

  private updateCamera(dt: number) {
    const cam = this.cameras.main;
    const w = this.w;
    const p = w.player;
    let tx = p.x;
    let ty = p.y;
    // A little look-ahead towards the aim, never more than 28px.
    tx += clamp(Math.cos(p.aim) * 24, -28, 28);
    ty += clamp(Math.sin(p.aim) * 16, -20, 20);
    if (w.arenaOn) {
      // Boss camera: frame the arena, leaning towards the player.
      tx = w.arenaCx + (p.x - w.arenaCx) * 0.55;
      ty = w.arenaCy + (p.y - w.arenaCy) * 0.55 - 10;
    }
    const k = 1 - Math.exp(-(w.arenaOn ? 4 : 9) * dt);
    this.camX += (tx - 320 - this.camX) * k;
    this.camY += (ty - 180 - this.camY) * k;
    let sx = this.camX;
    let sy = this.camY;
    const shake = w.shakeAmt * game.settings.screenShake * (game.settings.reducedEffects ? 0.4 : 1);
    if (shake > 0.2 && w.shakeT > 0 && !this.paused) {
      sx += Math.round((Math.random() - 0.5) * 2 * shake);
      sy += Math.round((Math.random() - 0.5) * 2 * shake);
    }
    cam.setScroll(Math.round(sx), Math.round(sy));
  }

  // -------------------------------------------------------------------------
  // Events

  private drainEvents() {
    const evs = this.w.events.splice(0);
    for (const e of evs) this.onEvent(e);
  }

  private onEvent(e: GameEvent) {
    const w = this.w;
    switch (e.type) {
      case 'acre':
        // The lull's checkpoint banked everything; out in the field again, it must not.
        this.checkpoint(false);
        ui.banner(e.name, e.intro, 'acre');
        game.audio.music?.setIntensity(Math.min(2, e.index));
        break;
      case 'levelup':
        if (!this.paused && !w.player.dead && w.phase !== 'victory' && w.phase !== 'extracted') this.openLevelUp();
        break;
      case 'message':
        ui.toast(e.text, e.tone === 'warn' ? 'warn' : e.tone === 'good' ? 'good' : 'info');
        break;
      case 'elite':
        ui.banner(e.name, 'An elite approaches', 'warn');
        game.audio.duck(0.5, 1.2);
        break;
      case 'boss':
        this.checkpoint(false);
        this.r.raiseArena();
        ui.banner(e.name, 'Sovereign of the Royal Patch', 'boss');
        game.audio.playMusic('boss');
        this.bossShown = true;
        break;
      case 'bossPhase':
        ui.banner('The Great Uprooting', 'The King tears himself open', 'boss');
        game.audio.duck(0.7, 2);
        break;
      case 'lull':
        this.checkpoint(true);
        ui.banner(e.final ? 'The ground is quiet. Too quiet.' : 'The field settles', e.final ? 'Visit Mags, then ring her bell to face what waits.' : 'Mags’s cart rattles up. Shop, or head home.', 'good');
        game.audio.music?.setIntensity(0);
        break;
      case 'shop':
        this.openShop();
        break;
      case 'extractPrompt':
        this.openPanel('extract', { lootSummary: this.lootSummary() });
        break;
      case 'chest':
        // After the run is over a prize would be meaningless: never block the results with one.
        if (!this.ended && w.phase !== 'victory' && w.phase !== 'extracted' && w.phase !== 'defeat') {
          // A second chest while a choice is open waits its turn.
          if (this.paused) this.chestsWaiting++;
          else this.openChest();
        }
        break;
      case 'pickup': {
        if (e.kind === 'seed') {
          const c = CROPS[e.id];
          const traitTxt = e.traits?.length ? ` (${e.traits.map((t) => TRAITS[t as TraitId].name).join(', ')})` : '';
          const tone = e.rarity >= 4 ? 'legendary' : e.rarity >= 2 ? 'rare' : 'loot';
          ui.toast(`${c?.name ?? e.id} seeds${traitTxt}`, tone, c?.seed);
          if (e.rarity >= 3) game.audio.play('loot_legendary', 0.9);
        } else if (e.kind === 'material') {
          const m = MATERIALS[e.id];
          if (m) ui.toast(m.name, e.rarity >= 2 ? 'rare' : 'loot', m.icon);
        }
        break;
      }
      case 'objective':
        break;
      case 'victory':
      case 'defeat':
        break;
    }
    void w;
  }

  // -------------------------------------------------------------------------
  // Panels

  private openPanel(panel: Parameters<typeof ui.open>[0], data: unknown = null) {
    this.panelAt = performance.now();
    game.input.clear();
    game.audio.setMuffled(true);
    ui.open(panel, data);
  }

  private resume() {
    ui.closeAll();
    game.audio.setMuffled(false);
    game.input.clear();
    // A moment of grace so a menu never ends in an unseen hit.
    this.w.player.iframes = Math.max(this.w.player.iframes, 0.35);
    if (this.ended || this.w.phase === 'victory') return;
    if (this.w.run.pendingLevels > 0) this.openLevelUp();
    else if (this.chestsWaiting > 0) {
      this.chestsWaiting--;
      this.openChest();
    }
  }

  /** A choice may only be made in its own panel, and not in the instant it opened. */
  private canChoose(panel: string): boolean {
    return ui.get().panel === panel && performance.now() - this.panelAt >= MENU_ARM_MS;
  }

  private openLevelUp() {
    const w = this.w;
    if (w.run.pendingLevels <= 0) return;
    const count = w.run.stats.luck >= 10 ? 4 : 3;
    this.levelOffers = rollLevelUp(w, this.rng, count);
    w.fx({ type: 'levelup', x: w.player.x, y: w.player.y - 6 });
    game.audio.play('levelup', 0.9);
    this.openPanel('levelup', { offers: this.levelOffers, level: w.run.level + 1, rerollCost: w.run.rerollCost, sap: w.run.sap });
  }

  private openShop() {
    const w = this.w;
    if (this.shopForLull !== w.director.index) {
      this.shop = makeShop(w, this.rng, this.shop);
      this.shopForLull = w.director.index;
    }
    this.openPanel('shop', { shop: this.shop });
  }

  private openChest() {
    const w = this.w;
    const evos = w.run.weapons.map((wi) => ({ wi, e: wi.evolution(w.run) })).filter((x) => x.e);
    const offers: Offer[] = [];
    if (evos.length) {
      // Up to four at once (all that fit); the rest wait for the next chest.
      for (const x of evos.slice(0, 4)) offers.push({ kind: 'evolve', weapon: x.wi, into: x.e!.into });
    } else {
      const seen = new Set<string>();
      const n = 3 + (w.run.hookValue('extraChest') > 0 ? 1 : 0);
      for (let i = 0; i < n * 3 && offers.length < n; i++) {
        const rarity = rollRarity(this.rng, w.run.stats.luck + 8, 'rare');
        const pool = Object.values(ITEMS).filter((it) => it.rarity === rarity && !seen.has(it.id));
        if (!pool.length) continue;
        const it = this.rng.pick(pool);
        seen.add(it.id);
        offers.push({ kind: 'item', id: it.id, rarity: it.rarity });
      }
    }
    this.chestOffers = offers;
    this.openPanel('chest', { offers, evolution: evos.length > 0 });
  }

  private registerBridge() {
    bridge.expedition = {
      chooseOffer: (i: number) => {
        const o = this.levelOffers[i];
        if (!o || !this.canChoose('levelup')) return;
        applyOffer(this.w, o);
        if (o.kind === 'evolve') ui.toast(`${WEAPONS[o.into].name}!`, 'legendary', WEAPONS[o.into].icon);
        this.w.consumeLevel();
        this.w.run.rerollCost = 12 + this.w.run.level * 2;
        game.audio.play('ui_select', 1);
        if (this.w.run.pendingLevels > 0) {
          ui.closeAll();
          this.openLevelUp();
        } else this.resume();
      },
      reroll: () => {
        const run = this.w.run;
        if (run.sap < run.rerollCost) {
          game.audio.play('ui_deny');
          return;
        }
        run.sap -= run.rerollCost;
        run.rerollCost += 10;
        this.levelOffers = rollLevelUp(this.w, this.rng, this.levelOffers.length);
        game.audio.play('page');
        ui.open('levelup', { offers: this.levelOffers, level: run.level + 1, rerollCost: run.rerollCost, sap: run.sap });
      },
      resume: () => this.resume(),
      abandon: () => {
        ui.closeAll();
        this.w.lastHurtBy = 'giving up';
        this.w.onPlayerDeath('abandoned the expedition');
      },
      shopBuy: (i: number) => {
        const s = this.shop?.slots[i];
        if (!s) return;
        if (!buySlot(this.w, s)) game.audio.play('ui_deny');
        ui.bump();
      },
      shopLock: (i: number) => {
        const s = this.shop?.slots[i];
        if (!s || s.sold) return;
        s.locked = !s.locked;
        game.audio.play('ui_move');
        ui.bump();
      },
      shopReroll: () => {
        if (!this.shop || !rerollShop(this.w, this.rng, this.shop)) game.audio.play('ui_deny');
        else game.audio.play('page');
        ui.bump();
      },
      shopTea: () => {
        if (!this.shop || !buyTea(this.w, this.shop)) game.audio.play('ui_deny');
        ui.bump();
      },
      shopBargain: () => {
        if (!this.shop) return;
        const msg = takeBargain(this.w, this.rng, this.shop);
        if (msg) ui.toast(msg, 'rare');
        game.audio.play('mutate');
        ui.bump();
      },
      pressOn: () => {
        this.resume();
        this.w.pressOn();
      },
      extract: () => {
        ui.closeAll();
        game.audio.setMuffled(false);
        this.w.extract();
      },
      chestTake: (i: number) => {
        if (!this.canChoose('chest')) return;
        const o = this.chestOffers[i];
        if (o) {
          if (o.kind === 'evolve') {
            evolveWeapon(this.w, o.weapon, o.into);
            ui.toast(`${WEAPONS[o.into].name}!`, 'legendary', WEAPONS[o.into].icon);
          } else applyOffer(this.w, o);
        }
        this.resume();
      },
      wakeWatcher: () => {
        this.w.run.flags.watcher = true;
        game.audio.play('boss_laugh', 0.8);
        ui.toast('Mags goes pale. “On your own head be it.”', 'warn');
        ui.bump();
      },
      finish: () => {
        if (this.leaving) return;
        this.leaving = true;
        ui.closeAll();
        game.audio.setMuffled(false);
        const r = ui.get().results;
        this.cameras.main.fadeOut(400, 28, 18, 28);
        this.time.delayedCall(420, () => this.scene.start('farm', { fromRun: r }));
      },
    };
  }

  private lootSummary() {
    const run = this.w.run;
    return {
      farthings: run.loot.farthings + Math.floor(run.sap / 12),
      materials: Object.entries(run.loot.materials),
      seeds: run.loot.seeds.length,
      sapCollected: Math.round(run.sapCollected),
    };
  }

  private checkpoint(safe: boolean) {
    const p = game.profile;
    if (!p || this.ended) return;
    try {
      p.pendingRun = checkpointResult(this.w, safe);
      game.save();
    } catch (e) {
      console.error('[expedition] checkpoint failed', e);
    }
  }

  /** Apply the run to the profile and save. Safe to call once. */
  private bank(result: RunResult) {
    if (this.banked) return;
    this.banked = result;
    try {
      if (game.profile) {
        applyResult(game.profile, result);
        game.save();
      }
    } finally {
      // Even if banking failed (the last checkpoint stays saved and is recovered
      // on the farm), the results screen must have something to show.
      ui.set({ results: result });
    }
  }

  /** Bank the run as it stands: its true outcome if it has ended, else a checkpoint. */
  private bankSafely(safe: boolean) {
    const w = this.w;
    const over = w.phase === 'victory' || w.phase === 'defeat' || w.phase === 'extracted';
    try {
      this.bank(over ? buildResult(w) : checkpointResult(w, safe));
    } catch (e) {
      console.error('[expedition] could not bank the run', e);
      if (!this.banked) {
        try {
          this.bank(checkpointResult(w, safe));
        } catch (e2) {
          console.error('[expedition] could not bank a checkpoint either', e2);
        }
      }
    }
  }

  private finishRun() {
    const result = this.banked ?? buildResult(this.w);
    if (!this.banked) this.bank(result);
    game.audio.setMuffled(false);
    ui.closeAll();
    // Pickup toasts from the final sweep would sit on top of the results.
    ui.set({ toasts: [] });
    this.openPanel('results', { result });
  }

  // -------------------------------------------------------------------------

  private weaponHud(wi: WeaponInstance): WeaponHud {
    return {
      id: wi.def.id,
      name: wi.def.name,
      icon: wi.def.icon,
      level: wi.level,
      traits: wi.allTraits,
      cd: wi.def.behaviour === 'orbit' || wi.def.behaviour === 'summoner' || wi.def.behaviour === 'swarm' ? 0 : clamp(wi.cd / wi.cooldown(), 0, 1),
      evolved: !!wi.def.evolvedFrom,
      canEvolve: !!wi.evolution(this.w.run),
    };
  }

  private pushHud(force = false) {
    const w = this.w;
    const run = w.run;
    const p = w.player;
    const d = w.director;
    const boss = w.boss && w.boss.active ? w.boss : null;
    const elite = w.elite && w.elite.active ? w.elite : null;
    let prompt: string | null = null;
    if (w.nearProp?.kind === 'cart') prompt = 'Talk to Mags';
    else if (w.nearProp?.kind === 'exit') prompt = 'Head home with your haul';
    const shrine = w.props.find((x) => x.kind === 'shrine' && x.active);
    const hud: ExpeditionHud = {
      hp: Math.ceil(p.hp),
      maxHp: run.stats.maxHp,
      xp: run.xp,
      xpNext: run.xpNext,
      level: run.level,
      sap: Math.floor(run.sap),
      farthings: run.loot.farthings,
      time: w.t,
      acre: d.index,
      acreName: w.phase === 'boss' || w.phase === 'victory' ? 'The Royal Patch' : (d.acre?.name ?? ''),
      acreProgress: w.phase === 'acre' ? d.acreProgress : w.phase === 'lull' ? 1 : 0,
      phase: w.phase,
      weapons: run.weapons.map((x) => this.weaponHud(x)),
      held: this.weaponHud(run.held),
      dashCd: Math.max(0, p.dashCd),
      dashMax: Math.max(0.35, 1.15 * (1 - run.stats.dashCooldown)),
      activeCd: Math.max(0, p.activeCd),
      activeMax: run.cls.active.cooldown,
      activeName: run.cls.active.name,
      jars: run.consumables.reduce((s, c) => s + c.count, 0),
      boss: boss && this.bossShown ? { name: boss.def.name, hp: boss.hp, max: boss.maxHp, phase: boss.phase } : null,
      elite: elite ? { name: elite.def.name, hp: elite.hp, max: elite.maxHp } : null,
      shields: w.petalShields,
      prompt,
      canPressOn: d.canPressOn,
      region: d.region.name,
      tier: w.tier,
      objective: shrine ? (shrine.progress ?? 0) / 12 : null,
    };
    void force;
    ui.set({ hud });
  }

  /** Average frame time over the last two seconds (for the debug overlay and tests). */
  fps() {
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length);
    return 1000 / Math.max(1, avg);
  }
}
