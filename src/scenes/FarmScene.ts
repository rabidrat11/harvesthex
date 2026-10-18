// The home farm. Walk around, tend the beds, visit the buildings, and set
// out through the gate. Coming home plays back what grew while you were away.

import Phaser from 'phaser';
import { FarmView } from '../render/farmView';
import { ATLAS, F, frameCount, originOf } from '../render/textures';
import { game } from '../game/state';
import { bridge, ui, type Panel } from '../ui/store';
import { BUILDINGS, FARM_H, FARM_W, PLAYER_HOME, PLAYER_START } from '../farm/layout';
import { fertilise, harvest, plant, plotStage, till, water } from '../farm/farm';
import { CROPS, MATURE } from '../data/crops';
import { QUALITY_LABEL } from '../data/types';
import { Rng } from '../core/rng';
import { pruneGrafts, takeProduce, type Plot } from '../meta/profile';
import type { RunResult } from '../meta/results';
import { checkUnlocks } from '../meta/results';
import { clampLoadoutJars } from '../farm/farm';
import { TRAITS } from '../data/traits';

export const TOOLS = ['hand', 'hoe', 'can', 'seeds', 'compost'] as const;
export type Tool = (typeof TOOLS)[number];

const REACH = 46;

export class FarmScene extends Phaser.Scene {
  view!: FarmView;
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private facing: 'down' | 'up' | 'side' = 'down';
  private flip = false;
  private animT = 0;
  private moving = false;
  tool = 0;
  seedIndex = 0;
  private near: (typeof BUILDINGS)[number] | null = null;
  private nearScarecrow = false;
  private rng = new Rng(Date.now() >>> 0);
  private hoverPlot: Plot | null = null;
  private stepT = 0;
  private uiT = 0;
  private dashT = 0;
  private dashCd = 0;
  private leaving = false;

  constructor() {
    super('farm');
  }

  create(data: { intro?: boolean; fromRun?: RunResult | null }) {
    const p = game.profile!;
    this.leaving = false;
    this.view = new FarmView(this, p);
    // The scarecrow has moved again overnight.
    const spot = this.view.placeScarecrow(p.day);
    if (p.scarecrow.tx !== spot.tx || p.scarecrow.ty !== spot.ty) {
      p.scarecrow.tx = spot.tx;
      p.scarecrow.ty = spot.ty;
      p.scarecrow.clicks = 0;
    }
    const start = data?.fromRun ? { x: PLAYER_START.x, y: PLAYER_START.y } : PLAYER_HOME;
    this.px = start.x;
    this.py = start.y;
    this.shadow = this.add.image(this.px, this.py, ATLAS, 'shadow').setDepth(40);
    this.player = this.add.image(this.px, this.py, ATLAS, '__missing');
    const cam = this.cameras.main;
    cam.setBounds(0, 0, FARM_W, FARM_H);
    cam.setRoundPixels(true);
    cam.centerOn(this.px, this.py);
    cam.fadeIn(500, 28, 18, 28);
    game.input.clear();
    game.audio.playMusic('farm');
    game.audio.setMuffled(false);
    ui.set({ screen: 'farm', hud: null, results: null });
    ui.closeAll();
    this.syncFarmUi();
    this.registerBridge();
    this.events.once('shutdown', () => {
      bridge.farm = null;
    });

    const recovered = game.recoverPendingRun();
    if (recovered) {
      this.view.refreshPlots(p);
      this.homecoming(recovered);
      this.time.delayedCall(400, () => ui.toast('Your last expedition was cut short. Mags found you and brought your haul home.', 'good'));
    } else if (data?.fromRun) this.homecoming(data.fromRun);
    else if (data?.intro) this.time.delayedCall(600, () => ui.open('intro'));
    const unlocks = checkUnlocks(p);
    for (const u of unlocks) ui.toast(u, 'good');
    game.save();
    (window as unknown as { __HX_farm?: FarmScene }).__HX_farm = this;
  }

  private homecoming(r: RunResult) {
    const p = game.profile!;
    const grown = r.growth.map((g) => g.plot);
    this.view.refreshPlots(p);
    // Crops that grew pop one after another.
    grown.forEach((id, i) => {
      this.time.delayedCall(700 + i * 160, () => {
        this.view.refreshPlots(p, [id]);
        const pl = p.plots[id];
        game.sfx('plant', 0.5);
        this.view.fx.sprite('fx_levelup', pl.tx * 16 + 8, pl.ty * 16 + 8, { fps: 14, depth: 8000, scale: 0.6 });
      });
    });
    const ready = p.plots.filter((pl) => pl.crop && plotStage(pl) >= MATURE).length;
    this.time.delayedCall(900, () => {
      ui.banner(`Day ${p.day}`, ready ? `${ready} crop${ready > 1 ? 's are' : ' is'} ready to harvest` : 'The fields drank deep', 'good');
    });
  }

  // -------------------------------------------------------------------------

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const input = game.input;
    input.pollGamepad(dt);
    const panelOpen = ui.get().panel !== null;
    input.blocked = panelOpen;
    this.view.update(dt);

    if (!panelOpen && !this.leaving) {
      if (input.pressed('pause')) {
        ui.open('pause');
        input.endFrame();
        return;
      }
      if (input.pressed('map')) this.openPanel('character');
      if (input.pressed('inventory')) this.openPanel('farmhouse', { tab: 'stash' });
      for (let i = 0; i < 5; i++) if (input.pressed(`tool${i + 1}` as 'tool1')) this.setTool(i);
      if (input.wheel !== 0) {
        if (TOOLS[this.tool] === 'seeds' || TOOLS[this.tool] === 'hand') this.cycleSeed(input.wheel);
        else this.setTool((this.tool + input.wheel + 5) % 5);
      }
      this.move(dt);
      this.findNear();
      if (input.pressed('interact')) this.interact();
      this.updateHover();
      const padUse = input.padFire && !this.padWasFiring;
      this.padWasFiring = input.padFire;
      if (input.leftPressed || padUse) this.useTool();
    } else {
      this.view.setHover(null, true);
    }
    this.drawPlayer(dt);
    const cam = this.cameras.main;
    const k = 1 - Math.exp(-8 * dt);
    const cx = cam.scrollX + (this.px - 320 - cam.scrollX) * k;
    const cy = cam.scrollY + (this.py - 190 - cam.scrollY) * k;
    cam.setScroll(Math.round(cx), Math.round(cy));
    this.uiT -= dt;
    if (this.uiT <= 0) {
      this.uiT = 0.1;
      this.syncFarmUi();
    }
    input.endFrame();
  }

  private move(dt: number) {
    const m = game.input.move();
    const speed = 92;
    this.dashCd -= dt;
    if (game.input.pressed('dash') && this.dashCd <= 0 && (m.x || m.y)) {
      this.dashT = 0.14;
      this.dashCd = 0.6;
      this.view.fx.sprite('fx_dust', this.px, this.py + 2, { fps: 14, depth: 50 });
      game.sfx('dash', 0.5);
    }
    let tx = m.x * speed;
    let ty = m.y * speed;
    if (this.dashT > 0) {
      this.dashT -= dt;
      tx *= 2.6;
      ty *= 2.6;
    }
    const k = 1 - Math.exp(-20 * dt);
    this.vx += (tx - this.vx) * k;
    this.vy += (ty - this.vy) * k;
    this.moving = Math.hypot(m.x, m.y) > 0.1;
    if (this.moving) {
      if (Math.abs(m.x) > Math.abs(m.y) * 0.8) {
        this.facing = 'side';
        this.flip = m.x < 0;
      } else this.facing = m.y < 0 ? 'up' : 'down';
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.32;
        game.sfx('footstep', 0.25);
      }
    }
    // Axis-separated collision against rectangles and circles.
    const r = 5;
    const tryMove = (nx: number, ny: number) => {
      for (const s of this.view.rects) {
        if (nx + r > s.x && nx - r < s.x + s.w && ny + 2 > s.y && ny - 3 < s.y + s.h) return false;
      }
      for (const c of this.view.circles) {
        const dx = nx - c.x;
        const dy = ny - c.y;
        if (dx * dx + dy * dy < (c.r + r) ** 2) return false;
      }
      return true;
    };
    const nx = this.px + this.vx * dt;
    if (tryMove(nx, this.py)) this.px = nx;
    else this.vx = 0;
    const ny = this.py + this.vy * dt;
    if (tryMove(this.px, ny)) this.py = ny;
    else this.vy = 0;
  }

  private drawPlayer(dt: number) {
    this.animT += dt;
    const cls = game.profile!.classes.selected;
    const base = `hero_${cls}_${this.facing}_${this.moving ? 'walk' : 'idle'}`;
    const n = Math.max(1, frameCount(base));
    const key = `${base}_${Math.floor(this.animT * (this.moving ? 8 : 2)) % n}`;
    this.player.setFrame(F(key));
    const [ox, oy] = originOf(F(key));
    this.player.setOrigin(ox, oy).setFlipX(this.facing === 'side' && this.flip).setPosition(Math.round(this.px), Math.round(this.py + 2)).setDepth(1000 + this.py);
    this.shadow.setPosition(Math.round(this.px), Math.round(this.py + 2));
  }

  private findNear() {
    let best: (typeof BUILDINGS)[number] | null = null;
    let bd = 26 * 26;
    for (const b of BUILDINGS) {
      const ux = b.x + b.use[0];
      const uy = b.y + b.use[1];
      const d = (ux - this.px) ** 2 + (uy - this.py) ** 2;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    // Bertha herself counts as the smithy.
    if (!best && (this.px - 560) ** 2 + (this.py - 168) ** 2 < 22 * 22) best = BUILDINGS.find((b) => b.id === 'smithy')!;
    this.near = best;
    const sc = this.view.scarecrow;
    this.nearScarecrow = !best && (sc.x - this.px) ** 2 + (sc.y + 4 - this.py) ** 2 < 20 * 20;
  }

  private interact() {
    const p = game.profile!;
    if (this.nearScarecrow) {
      this.scarecrowSecret();
      return;
    }
    const b = this.near;
    if (!b) return;
    game.sfx('door', 0.5);
    switch (b.id) {
      case 'gate':
      case 'potting':
        this.openPanel('potting');
        break;
      case 'pump':
        if (p.buildings.pump < 1) {
          ui.toast('The pump is seized with rust. Bertha could mend it.', 'info');
          this.openPanel('smithy', { tab: 'build' });
        } else ui.toast('The pump creaks happily. Every planted bed will be watered each morning.', 'good');
        break;
      case 'compost':
        if (p.buildings.compost < 1) {
          ui.toast('Just a heap of old planks. Bertha could knock a compost bin together.', 'info');
          this.openPanel('smithy', { tab: 'build' });
        } else this.openPanel('compost');
        break;
      case 'bench':
        this.openPanel('bench');
        break;
      default:
        this.openPanel(b.id as Panel);
    }
  }

  private scarecrowSecret() {
    const p = game.profile!;
    p.scarecrow.clicks++;
    const lines = ['The scarecrow is exactly where you did not leave it.', 'Its button eyes follow you. Probably a trick of the light.', 'You hear, very faintly: “plant the forbidden one.”'];
    ui.toast(lines[Math.min(lines.length - 1, p.scarecrow.clicks - 1)], 'info');
    game.sfx('page', 0.5);
    if (p.scarecrow.clicks === 3) {
      p.scarecrow.found++;
      if (p.scarecrow.found % 3 === 0) {
        p.materials.eye = (p.materials.eye ?? 0) + 1;
        ui.toast('Something has been left in its pocket: a Watching Eye.', 'rare', 'cf_182');
        game.sfx('loot', 0.8);
      }
      game.autosave();
    }
  }

  openPanel(panel: Panel, data: unknown = null) {
    game.input.clear();
    ui.open(panel, data);
  }

  setTool(i: number) {
    this.tool = i;
    game.sfx('ui_move', 0.5);
    this.syncFarmUi();
  }

  cycleSeed(d: number) {
    const n = game.profile!.seeds.length;
    if (!n) return;
    this.seedIndex = (this.seedIndex + d + n) % n;
    game.sfx('ui_move', 0.4);
    this.syncFarmUi();
  }

  // -------------------------------------------------------------------------
  // Tending the beds

  private worldMouse() {
    const cam = this.cameras.main;
    return { x: cam.scrollX + game.input.gameX, y: cam.scrollY + game.input.gameY };
  }

  private inReach(pl: Plot) {
    const cx = pl.tx * 16 + 8;
    const cy = pl.ty * 16 + 8;
    return (cx - this.px) ** 2 + (cy - this.py) ** 2 < REACH * REACH;
  }

  private padWasFiring = false;

  private updateHover() {
    let m = this.worldMouse();
    if (game.input.lastDevice === 'pad') {
      // With a controller, tend whichever bed is just in front of you.
      const dx = this.facing === 'side' ? (this.flip ? -1 : 1) : 0;
      const dy = this.facing === 'up' ? -1 : this.facing === 'down' ? 1 : 0;
      m = { x: this.px + dx * 12, y: this.py - 2 + dy * 12 };
    }
    const pl = this.view.plotAt(m.x, m.y);
    this.hoverPlot = pl;
    this.view.setHover(pl, !!pl && this.inReach(pl) && pl.unlocked);
  }

  plotInfo(pl: Plot | null): string | null {
    if (!pl) return null;
    if (!pl.unlocked) return 'Overgrown. Bertha can help clear this bed.';
    if (!pl.tilled) return 'Untilled ground. Hoe it (or click with your hand).';
    if (!pl.crop) return `Tilled soil${pl.watered ? ', watered' : ''}. Ready for seeds.`;
    const c = CROPS[pl.crop.species];
    const st = plotStage(pl);
    const pct = st >= MATURE ? 100 : Math.round(((pl.crop.growth % c.stageSap) / c.stageSap) * 100);
    const stage = ['Seed', 'Sprout', 'Growing', 'Ready to harvest'][st];
    const traits = pl.crop.traits.map((t) => TRAITS[t].name).join(', ');
    const q = 1 + (pl.crop.fertilised ? 1 : 0) + (pl.crop.dryDays === 0 ? 1 : 0) + (pl.crop.blessed ? 1 : 0);
    return `${c.name}${traits ? ` (${traits})` : ''}: ${stage}${st < MATURE ? ` ${pct}%` : ''}. ${pl.watered ? 'Watered.' : st < MATURE ? 'Dry: water it.' : ''} Quality: ${QUALITY_LABEL[Math.min(3, q) as 1]}`;
  }

  private useTool() {
    const pl = this.hoverPlot;
    if (!pl) return;
    const p = game.profile!;
    if (!this.inReach(pl)) {
      ui.toast('Too far away. Walk closer.', 'info');
      game.sfx('ui_deny', 0.5);
      return;
    }
    const tool = TOOLS[this.tool];
    let res: { ok: boolean; msg?: string } = { ok: false, msg: '' };
    let act: 'till' | 'plant' | 'water' | 'harvest' | 'fert' | null = null;
    if (tool === 'hand') {
      if (pl.crop && plotStage(pl) >= MATURE) act = 'harvest';
      else if (!pl.tilled) act = 'till';
      else if (!pl.crop) act = 'plant';
      else if (!pl.watered) act = 'water';
      else {
        ui.toast(this.plotInfo(pl) ?? '', 'info');
        return;
      }
    } else act = tool === 'hoe' ? 'till' : tool === 'can' ? 'water' : tool === 'seeds' ? 'plant' : 'fert';
    const x = pl.tx * 16 + 8;
    const y = pl.ty * 16 + 8;
    switch (act) {
      case 'till':
        res = till(p, pl);
        if (res.ok) {
          game.sfx('till', 0.8);
          this.view.fx.burst('dot2', x, y + 4, 6, 40, { tint: 0x8a4836, depth: 8000 });
        }
        break;
      case 'plant': {
        if (!p.seeds.length) {
          res = { ok: false, msg: 'No seeds. Find some in the meadow, or buy them at the Seed Archive.' };
          break;
        }
        this.seedIndex = Math.min(this.seedIndex, p.seeds.length - 1);
        const s = p.seeds[this.seedIndex];
        res = plant(p, pl, this.seedIndex);
        if (res.ok) {
          game.sfx('plant', 0.8);
          this.view.fx.sprite(CROPS[s.species].seed, x, y, { life: 0.5, vz: 40, grav: 120, depth: 8000, scale: 0.6 });
          if (!p.flags.tut_plant) p.flags.tut_plant = true;
          this.seedIndex = Math.min(this.seedIndex, Math.max(0, p.seeds.length - 1));
        }
        break;
      }
      case 'water': {
        const gilded = !!p.flags.gildedCanOwned;
        const targets = gilded ? p.plots.filter((q) => Math.abs(q.tx - pl.tx) <= 1 && Math.abs(q.ty - pl.ty) <= 1 && q.tilled && !q.watered) : [pl];
        let any = false;
        for (const q of targets) if (water(p, q).ok) any = true;
        res = any ? { ok: true } : water(p, pl);
        if (any) {
          game.sfx('water', 0.8);
          for (const q of targets) this.view.fx.burst('dot2', q.tx * 16 + 8, q.ty * 16 + 4, 5, 30, { tint: 0x0098dc, depth: 8000, vz: 50 });
          if (!p.flags.tut_water) p.flags.tut_water = true;
        }
        break;
      }
      case 'fert':
        res = fertilise(p, pl);
        if (res.ok) {
          game.sfx('plant', 0.6);
          this.view.fx.burst('dot2', x, y, 8, 30, { tint: 0x5d2c28, depth: 8000 });
        }
        break;
      case 'harvest': {
        const h = harvest(p, pl, this.rng, game.equipmentMods().harvest ?? 0);
        if (h) {
          res = { ok: true };
          const c = CROPS[h.species];
          game.sfx('harvest', 0.9);
          this.view.fx.sprite(c.produce, x, y - 4, { life: 0.7, vx: (this.px - x) * 1.2, vy: (this.py - 10 - y) * 1.2, vz: 60, grav: 160, depth: 8000 });
          this.view.fx.burst('dot2', x, y, 6, 50, { tint: 0x99e65f, depth: 8000 });
          const traitTxt = h.traits.length ? ` (${h.traits.map((t) => TRAITS[t].name).join(', ')})` : '';
          ui.toast(`+${h.produce} ${QUALITY_LABEL[h.quality]} ${c.name}${traitTxt}, +${h.seeds} seeds`, h.traits.length ? 'rare' : 'loot', c.produce);
          if (h.newTrait) ui.toast(`The Root slipped something in: ${TRAITS[h.newTrait].name}!`, 'rare', TRAITS[h.newTrait].icon);
          if (!p.flags.tut_harvest) p.flags.tut_harvest = true;
          for (const u of checkUnlocks(p)) ui.toast(u, 'good');
        }
        break;
      }
    }
    if (!res.ok) {
      if (res.msg) ui.toast(res.msg, 'info');
      game.sfx('ui_deny', 0.5);
    }
    this.view.refreshPlots(p);
    game.autosave();
    this.syncFarmUi();
  }

  // -------------------------------------------------------------------------

  private hint(): string | null {
    const p = game.profile!;
    const f = p.flags;
    const open = p.plots.filter((q) => q.unlocked);
    if (!f.tut_plant && open.some((q) => q.tilled && !q.crop) && p.seeds.length) return 'Click the tilled soil to plant your peas. Scroll the mouse wheel to choose other seeds.';
    if (!f.tut_water && open.some((q) => q.crop && !q.watered)) return 'Click again to water them. Watered beds drink far more.';
    if (!f.tut_gate && p.stats.runs === 0) return 'Everything you gather in the meadow feeds what grows here. Head north through the gate when you are ready.';
    if (!f.tut_harvest && open.some((q) => q.crop && plotStage(q) >= MATURE)) return 'Something is ready! Click a ripe crop to harvest it.';
    if (f.tut_harvest && !f.tut_graft && p.produce.some((x) => CROPS[x.species]?.weapon)) return 'Take your harvest to the potting bench: grafted produce becomes a weapon on your next expedition.';
    return null;
  }

  syncFarmUi() {
    const p = game.profile;
    if (!p) return;
    let prompt: string | null = null;
    if (this.near) prompt = `${this.near.verb} · ${this.near.label}`;
    else if (this.nearScarecrow) prompt = 'Look at the scarecrow';
    const plotTip = this.hoverPlot ? this.plotInfo(this.hoverPlot) : null;
    ui.set({ farm: { prompt, tool: this.tool, seed: Math.min(this.seedIndex, Math.max(0, p.seeds.length - 1)), hint: this.hint(), version: (ui.get().farm?.version ?? 0) + 1, plotTip } as never });
  }

  private registerBridge() {
    bridge.farm = {
      depart: () => this.depart(),
      refresh: () => {
        this.view.refreshPlots(game.profile!);
        this.view.refreshBuildings();
        this.syncFarmUi();
      },
      closePanel: () => {
        ui.closeAll();
        game.input.clear();
        this.view.refreshPlots(game.profile!);
        this.view.refreshBuildings();
        game.autosave();
      },
    };
  }

  depart() {
    const p = game.profile!;
    if (this.leaving) return;
    // Grafts whose produce has gone (eaten, composted, crossed) come off the
    // satchel first, so nothing is taken from the stores unless you can leave.
    const gone = pruneGrafts(p);
    if (gone.length) {
      ui.toast(`No longer in the stores, so taken off the satchel: ${gone.map((s) => CROPS[s]?.name ?? s).join(', ')}.`, 'warn');
      ui.bump();
      return;
    }
    // Grafted produce and packed jars leave the stores with you.
    for (const g of p.loadout.grafts) if (g) takeProduce(p, g.species, g.traits, g.quality);
    clampLoadoutJars(p);
    const loadout = game.makeLoadout();
    for (const [k, n] of Object.entries(p.loadout.jars)) p.jars[k] = Math.max(0, (p.jars[k] ?? 0) - n);
    p.loadout.grafts = [null, null, null, null, null];
    p.flags.tut_gate = true;
    if (loadout.grafts.length) p.flags.tut_graft = true;
    game.save();
    this.leaving = true;
    ui.closeAll();
    game.sfx('door', 0.8);
    this.cameras.main.fadeOut(600, 28, 18, 28);
    this.time.delayedCall(650, () => this.scene.start('expedition', { loadout }));
  }
}
