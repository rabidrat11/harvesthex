// Draws the home farm: ground, paths and pond baked to one texture; then
// buildings, props, plots and crops as y-sorted images. Shared by the farm
// scene and the title screen (which shows your own farm at dusk).

import Phaser from 'phaser';
import { ATLAS, F, addSceneCanvas, frameCanvas, frameCount, hasFrame, originOf } from './textures';
import { BUILDINGS, DECOR, FARM_H, FARM_W, PATHS, POND, SCARECROW_SPOTS, type Building } from '../farm/layout';
import type { Plot, Profile } from '../meta/profile';
import { CROPS } from '../data/crops';
import { TRAITS } from '../data/traits';
import { plotStage } from '../farm/farm';
import { FxLayer } from './fx';
import { hexToInt } from '../art/palette';

export interface Solid {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CircleSolid {
  x: number;
  y: number;
  r: number;
}

interface PlotView {
  soil: Phaser.GameObjects.Image;
  crop: Phaser.GameObjects.Image;
  weeds: Phaser.GameObjects.Image;
  stage: number;
  species: string | null;
  bounce: number;
  sparkT: number;
}

export class FarmView {
  rects: Solid[] = [];
  circles: CircleSolid[] = [];
  fx: FxLayer;
  private plots = new Map<number, PlotView>();
  private water: Phaser.GameObjects.Image[] = [];
  private anims: { img: Phaser.GameObjects.Image; key: string; fps: number; t: number }[] = [];
  private buildingImgs = new Map<string, Phaser.GameObjects.Image>();
  scarecrow!: Phaser.GameObjects.Image;
  bertha!: Phaser.GameObjects.Image;
  private hover: Phaser.GameObjects.Graphics;
  private t = 0;
  private ambientT = 0;
  night = false;

  constructor(private scene: Phaser.Scene, private profile: Profile | null) {
    this.buildGround();
    this.buildWater();
    this.buildBuildings();
    this.buildDecor();
    this.buildPlots();
    this.buildNpcs();
    this.hover = scene.add.graphics().setDepth(990);
    this.fx = new FxLayer(scene, 8000);
    // Solid map edges.
    this.rects.push({ x: -20, y: -20, w: FARM_W + 40, h: 26 }, { x: -20, y: FARM_H - 6, w: FARM_W + 40, h: 30 }, { x: -20, y: 0, w: 26, h: FARM_H }, { x: FARM_W - 6, y: 0, w: 30, h: FARM_H });
    // The top wall (except the gate passage).
    this.rects.push({ x: 0, y: 46, w: 370, h: 22 }, { x: 398, y: 46, w: 370, h: 22 });
    const [px, py, pw, ph] = POND;
    this.rects.push({ x: px * 16 + 2, y: py * 16 + 2, w: pw * 16 - 4, h: ph * 16 - 4 });
  }

  // -------------------------------------------------------------------------

  private buildGround() {
    const c = document.createElement('canvas');
    c.width = FARM_W;
    c.height = FARM_H;
    const ctx = c.getContext('2d')!;
    const grass = [0, 1, 2, 3].map((i) => frameCanvas(`t_grass_${i}`)).filter(Boolean) as HTMLCanvasElement[];
    const dirt = [0, 1, 2].map((i) => frameCanvas(`t_dirt_${i}`)).filter(Boolean) as HTMLCanvasElement[];
    let s = 99;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let ty = 0; ty < FARM_H / 16; ty++)
      for (let tx = 0; tx < FARM_W / 16; tx++) {
        const r = rnd();
        const v = r < 0.55 ? 0 : r < 0.75 ? 1 : r < 0.95 ? 2 : 3;
        if (grass.length) ctx.drawImage(grass[Math.min(v, grass.length - 1)], tx * 16, ty * 16);
        else {
          ctx.fillStyle = '#5ac54f';
          ctx.fillRect(tx * 16, ty * 16, 16, 16);
        }
      }
    // Paths with soft, worn edges.
    const isPath = (tx: number, ty: number) => PATHS.some(([x, y, w, h]) => tx >= x && tx < x + w && ty >= y && ty < y + h);
    for (let ty = 0; ty < FARM_H / 16; ty++)
      for (let tx = 0; tx < FARM_W / 16; tx++) {
        if (!isPath(tx, ty)) continue;
        const src = dirt[(tx * 3 + ty * 7) % Math.max(1, dirt.length)];
        for (let py = 0; py < 16; py += 2)
          for (let px = 0; px < 16; px += 2) {
            // Fray the edge where the path meets grass.
            const edgeL = !isPath(tx - 1, ty) && px < 3;
            const edgeR = !isPath(tx + 1, ty) && px > 12;
            const edgeT = !isPath(tx, ty - 1) && py < 3;
            const edgeB = !isPath(tx, ty + 1) && py > 12;
            if ((edgeL || edgeR || edgeT || edgeB) && ((tx * 31 + ty * 17 + px * 7 + py * 13) % 5) < 2) continue;
            if (src) ctx.drawImage(src, px, py, 2, 2, tx * 16 + px, ty * 16 + py, 2, 2);
            else {
              ctx.fillStyle = '#bf6f4a';
              ctx.fillRect(tx * 16 + px, ty * 16 + py, 2, 2);
            }
          }
      }
    const key = addSceneCanvas(this.scene, 'farm_ground', c);
    this.scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(0);
  }

  private buildWater() {
    const [px, py, pw, ph] = POND;
    for (let y = 0; y < ph; y++)
      for (let x = 0; x < pw; x++) {
        // Round the corners of the pond.
        if ((x === 0 || x === pw - 1) && (y === 0 || y === ph - 1)) continue;
        const img = this.scene.add.image((px + x) * 16, (py + y) * 16, ATLAS, F('t_water_0')).setOrigin(0, 0).setDepth(2);
        this.water.push(img);
      }
    // A reed or two.
    for (const [x, y] of [
      [px * 16 + 4, (py + 1) * 16 + 4],
      [(px + pw) * 16 - 6, (py + ph - 1) * 16 + 8],
    ])
      this.scene.add.image(x, y, ATLAS, F('d_tuft_1')).setOrigin(0.5, 1).setDepth(1000 + y);
  }

  private spriteFor(b: Building): string {
    const lv = this.profile?.buildings[b.id] ?? 1;
    if (b.id === 'pump') return lv >= 1 ? 'b_pump' : 'b_pump_broken';
    return b.sprite;
  }

  private buildBuildings() {
    for (const b of BUILDINGS) {
      const key = this.spriteFor(b);
      const k = hasFrame(key) ? key : `${key}_0`;
      const img = this.scene.add.image(b.x, b.y, ATLAS, F(k));
      const [ox, oy] = originOf(F(k));
      img.setOrigin(ox, oy).setDepth(1000 + b.y);
      this.buildingImgs.set(b.id, img);
      if (frameCount(key) > 1) this.anims.push({ img, key, fps: 3, t: 0 });
      const [sx, sy, sw, sh] = b.solid;
      this.rects.push({ x: b.x + sx, y: b.y + sy, w: sw, h: sh });
    }
    this.refreshBuildings();
  }

  /** Broken or missing buildings look the part. */
  refreshBuildings() {
    const p = this.profile;
    for (const b of BUILDINGS) {
      const img = this.buildingImgs.get(b.id)!;
      const lv = p?.buildings[b.id] ?? 1;
      img.setFrame(F(hasFrame(this.spriteFor(b)) ? this.spriteFor(b) : `${this.spriteFor(b)}_0`));
      if (b.id === 'bench' || b.id === 'compost') {
        if (lv < 1) {
          img.setTint(0x857766).setAlpha(b.id === 'compost' ? 0.55 : 0.85).setAngle(b.id === 'bench' ? -4 : 0);
        } else img.clearTint().setAlpha(1).setAngle(0);
      }
    }
  }

  private buildDecor() {
    for (const d of DECOR) {
      const key = hasFrame(d.sprite) ? d.sprite : hasFrame(`${d.sprite}_0`) ? `${d.sprite}_0` : '__missing';
      const img = this.scene.add.image(d.x, d.y, ATLAS, key);
      const [ox, oy] = originOf(key);
      img.setOrigin(ox, oy).setDepth(1000 + d.y).setFlipX(!!d.flip);
      if (d.anim && frameCount(d.sprite) > 1) this.anims.push({ img, key: d.sprite, fps: 4, t: Math.random() });
      if (d.solid) this.circles.push({ x: d.x, y: d.y - d.solid * 0.5, r: d.solid });
      if (d.sprite.startsWith('d_lantern')) {
        // A warm pool of light.
        this.scene.add.image(d.x, d.y - 18, ATLAS, 'soft').setTint(0xffa214).setAlpha(0.18).setScale(3).setDepth(999 + d.y).setBlendMode(Phaser.BlendModes.ADD);
      }
    }
  }

  private buildPlots() {
    const plots = this.profile?.plots ?? [];
    for (const p of plots) {
      const x = p.tx * 16;
      const y = p.ty * 16;
      const soil = this.scene.add.image(x, y, ATLAS, F('t_soil_dry')).setOrigin(0, 0).setDepth(3);
      const weeds = this.scene.add.image(x + 8, y + 14, ATLAS, F('d_tuft_0')).setOrigin(0.5, 1).setDepth(1000 + y + 14);
      const crop = this.scene.add.image(x + 8, y + 16, ATLAS, '__missing').setOrigin(0.5, 1).setDepth(1000 + y + 15).setVisible(false);
      this.plots.set(p.id, { soil, crop, weeds, stage: -1, species: null, bounce: 0, sparkT: Math.random() * 2 });
    }
    if (this.profile) this.refreshPlots(this.profile);
  }

  refreshPlots(profile: Profile, grew: number[] = []) {
    this.profile = profile;
    for (const p of profile.plots) {
      const v = this.plots.get(p.id);
      if (!v) continue;
      this.drawPlot(p, v);
      if (grew.includes(p.id)) v.bounce = 0.6;
    }
  }

  private drawPlot(p: Plot, v: PlotView) {
    if (!p.unlocked) {
      v.soil.setVisible(false);
      v.crop.setVisible(false);
      v.weeds.setVisible(true).setFrame(F(`d_tuft_${p.id % 3}`));
      return;
    }
    v.weeds.setVisible(!p.tilled);
    v.weeds.setFrame(F(`d_tuft_${(p.id + 1) % 3}`)).setAlpha(0.7);
    v.soil.setVisible(true);
    if (!p.tilled) {
      v.soil.setFrame(F('t_dirt_1')).setAlpha(1);
    } else {
      v.soil.setFrame(F(p.watered ? 't_soil_wet' : 't_soil_dry')).setAlpha(1);
    }
    if (!p.crop) {
      v.crop.setVisible(false);
      v.stage = -1;
      v.species = null;
      return;
    }
    const def = CROPS[p.crop.species];
    const stage = plotStage(p);
    const base = def?.sprite ?? 'crop_pea';
    v.crop.setVisible(true).setFrame(F(`${base}_${stage}`));
    // Hybrids grown from a parent's sprite get a tint so they read as different.
    if (def?.hybrid) v.crop.setTint(def.id === 'emberroot' || def.id === 'hellfruit' ? 0xffb38a : def.id === 'thunderpea' ? 0xb8f6ff : def.id === 'sporelight' ? 0xe8ddff : 0xc9e8b0);
    else v.crop.clearTint();
    v.stage = stage;
    v.species = p.crop.species;
  }

  private buildNpcs() {
    const sc = this.profile?.scarecrow ?? { tx: 23, ty: 12 };
    this.scarecrow = this.scene.add.image(sc.tx * 16 + 8, sc.ty * 16 + 16, ATLAS, F('farm_scarecrow_0')).setOrigin(0.5, 1).setDepth(1000 + sc.ty * 16 + 16);
    this.circles.push({ x: this.scarecrow.x, y: this.scarecrow.y - 3, r: 5 });
    this.anims.push({ img: this.scarecrow, key: 'farm_scarecrow', fps: 1, t: 0 });
    this.bertha = this.scene.add.image(560, 160, ATLAS, F('npc_bertha_0')).setOrigin(0.5, 1).setDepth(1000 + 160);
    this.anims.push({ img: this.bertha, key: 'npc_bertha', fps: 2, t: 0 });
    this.circles.push({ x: 560, y: 157, r: 6 });
  }

  /** Move the scarecrow to its spot for the day (it wanders at night). */
  placeScarecrow(day: number) {
    const spot = SCARECROW_SPOTS[(day * 5 + 3) % SCARECROW_SPOTS.length];
    const x = spot[0] * 16 + 8;
    const y = spot[1] * 16 + 16;
    this.scarecrow.setPosition(x, y).setDepth(1000 + y);
    const c = this.circles.find((q) => Math.abs(q.r - 5) < 0.01);
    if (c) {
      c.x = x;
      c.y = y - 3;
    }
    return { tx: spot[0], ty: spot[1] };
  }

  plotAt(x: number, y: number): Plot | null {
    if (!this.profile) return null;
    const tx = Math.floor(x / 16);
    const ty = Math.floor(y / 16);
    return this.profile.plots.find((p) => p.tx === tx && p.ty === ty) ?? null;
  }

  setHover(p: Plot | null, ok: boolean) {
    const g = this.hover;
    g.clear();
    if (!p) return;
    const x = p.tx * 16;
    const y = p.ty * 16;
    const c = ok ? 0xffeb57 : 0xea323c;
    const a = 0.75 + 0.25 * Math.sin(this.t * 8);
    g.lineStyle(1, c, a);
    // Corner brackets rather than a box.
    const L = 4;
    for (const [cx, cy, dx, dy] of [
      [x, y, 1, 1],
      [x + 16, y, -1, 1],
      [x, y + 16, 1, -1],
      [x + 16, y + 16, -1, -1],
    ]) {
      g.lineBetween(cx, cy, cx + dx * L, cy);
      g.lineBetween(cx, cy, cx, cy + dy * L);
    }
  }

  update(dt: number) {
    this.t += dt;
    const wf = Math.floor(this.t * 1.5) % 2;
    for (const w of this.water) w.setFrame(F(`t_water_${wf}`));
    for (const a of this.anims) {
      a.t += dt;
      const n = frameCount(a.key);
      if (n > 1) a.img.setFrame(F(`${a.key}_${Math.floor(a.t * a.fps) % n}`));
    }
    // Crop life: grown crops bounce, mature ones glint, mutated ones shimmer.
    if (this.profile) {
      for (const p of this.profile.plots) {
        const v = this.plots.get(p.id);
        if (!v || !p.crop) continue;
        if (v.bounce > 0) {
          v.bounce -= dt;
          const k = Math.max(0, v.bounce / 0.6);
          v.crop.setScale(1 + Math.sin(k * Math.PI * 3) * 0.15 * k, 1 - Math.sin(k * Math.PI * 3) * 0.1 * k);
        } else v.crop.setScale(1, 1);
        v.sparkT -= dt;
        if (v.sparkT <= 0) {
          v.sparkT = 1.2 + Math.random() * 2;
          const x = p.tx * 16 + 8 + (Math.random() - 0.5) * 10;
          const y = p.ty * 16 + 4 - Math.random() * 8;
          if (v.stage >= 3) this.fx.sprite('fx_sparkle', x, y, { fps: 10, depth: 8000 });
          if (p.crop.traits.length) {
            const t = p.crop.traits[Math.floor(Math.random() * p.crop.traits.length)];
            this.fx.burst('dot2', x, y + 4, 2, 10, { tint: hexToInt(TRAITS[t].colour), depth: 8000, vz: 20, grav: 0, life: 0.8 });
          }
        }
      }
    }
    // Ambient life: fireflies at dusk, the odd butterfly-petal by day.
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = this.night ? 0.25 : 1.2;
      const x = Math.random() * FARM_W;
      const y = 80 + Math.random() * (FARM_H - 100);
      if (this.night) this.fx.sprite('dot2', x, y, { life: 3, tint: 0xd3fc7e, vx: (Math.random() - 0.5) * 12, vy: -4 - Math.random() * 6, add: true, depth: 8500 });
      else this.fx.sprite('p_petal_0', x, y, { life: 4, vx: 14 + Math.random() * 8, vy: 4, spin: 2, depth: 8500, scale: 0.7, alpha: 0.8 });
    }
    this.fx.update(dt);
  }

  building(id: string) {
    return this.buildingImgs.get(id);
  }
}
