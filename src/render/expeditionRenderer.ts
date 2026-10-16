// Draws the expedition simulation. The sim owns all state; this file only
// mirrors it into pooled Phaser images each frame and turns fx events into
// particles and sounds.
//
// Depth bands: ground 0, flat hazards 10-20, telegraphs 30, shadows 40,
// y-sorted bodies 1000+y, player shots 6000, enemy bullets 7000 (always on
// top of anything friendly, for readability), effects 8000, numbers 9000.

import Phaser from 'phaser';
import type { World, Fx } from '../sim/world';
import type { Enemy } from '../sim/entities';
import { ATLAS, F, addSceneCanvas, frameCanvas, frameCount, hasFrame, originOf } from './textures';
import { FxLayer } from './fx';
import { MATERIALS } from '../data/materials';
import { CROPS } from '../data/crops';
import { col } from '../art/palette';
import { game } from '../game/state';
import { TAU, angleTo } from '../core/math';
import { BOSS_ARENA_RADIUS } from '../sim/map';

type Img = Phaser.GameObjects.Image;

const DMG_COLOUR: Record<string, number> = {
  physical: 0xf9e6cf,
  nature: 0x99e65f,
  arcane: 0xf389f5,
  elemental: 0xffa214,
};

const RARITY_COLOUR = [0xc7cfdd, 0x5ac54f, 0x0098dc, 0xffc825, 0xff0040];

function animFrame(key: string, t: number, fps: number): string {
  const n = frameCount(key);
  if (n <= 1) return n === 1 ? key : key;
  return `${key}_${Math.floor(t * fps) % n}`;
}

class Pooled {
  imgs: (Img | undefined)[] = [];
  constructor(private scene: Phaser.Scene) {}
  get(i: number): Img {
    let img = this.imgs[i];
    if (!img) {
      img = this.scene.add.image(0, 0, ATLAS, '__missing');
      this.imgs[i] = img;
    }
    img.setVisible(true);
    return img;
  }
  hide(i: number) {
    const img = this.imgs[i];
    if (img && img.visible) img.setVisible(false);
  }
  hideFrom(used: Set<number>) {
    this.imgs.forEach((img, i) => {
      if (img && img.visible && !used.has(i)) img.setVisible(false);
    });
  }
  destroy() {
    for (const i of this.imgs) i?.destroy();
    this.imgs = [];
  }
}

export class ExpeditionRenderer {
  fx: FxLayer;
  private enemySpr: Pooled;
  private enemyShadow: Pooled;
  private projSpr: Pooled;
  private projShadow: Pooled;
  private bulletSpr: Pooled;
  private bulletHalo: Pooled;
  private pickupSpr: Pooled;
  private hazardSpr: Pooled;
  private summonSpr: Pooled;
  private petalSpr: Pooled;
  private propSpr: Pooled;
  private gfx: Phaser.GameObjects.Graphics;
  private royal: Img | null = null;
  private ring: Img[] = [];
  private player!: Img;
  private playerShadow!: Img;
  private held!: Img;
  private hitDot!: Img;
  private overlay: Phaser.GameObjects.Graphics;
  /** Marks over the prop the player can interact with. */
  private marks!: Phaser.GameObjects.Graphics;
  private t = 0;
  private afterT = 0;
  private dustT = 0;
  private dying = false;
  ringR = 0;

  constructor(private scene: Phaser.Scene, private w: World) {
    this.fx = new FxLayer(scene, 8000);
    this.fx.reduced = game.settings.reducedEffects;
    this.enemySpr = new Pooled(scene);
    this.enemyShadow = new Pooled(scene);
    this.projSpr = new Pooled(scene);
    this.projShadow = new Pooled(scene);
    this.bulletSpr = new Pooled(scene);
    this.bulletHalo = new Pooled(scene);
    this.pickupSpr = new Pooled(scene);
    this.hazardSpr = new Pooled(scene);
    this.summonSpr = new Pooled(scene);
    this.petalSpr = new Pooled(scene);
    this.propSpr = new Pooled(scene);
    this.buildGround();
    this.buildObstacles();
    this.gfx = scene.add.graphics().setDepth(30);
    this.overlay = scene.add.graphics().setDepth(9500).setScrollFactor(0);
    this.marks = scene.add.graphics().setDepth(9100);
    this.playerShadow = scene.add.image(0, 0, ATLAS, 'shadow').setDepth(40).setAlpha(0.9);
    this.held = scene.add.image(0, 0, ATLAS, F(w.run.held.def.icon));
    this.player = scene.add.image(0, 0, ATLAS, '__missing');
    this.hitDot = scene.add.image(0, 0, ATLAS, 'dot2').setDepth(7600).setTint(0xffffff);
  }

  // -------------------------------------------------------------------------
  // Static layers

  private buildGround() {
    const map = this.w.map;
    const c = document.createElement('canvas');
    c.width = map.w;
    c.height = map.h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const rng = mulberry(map.w * 31 + map.h);
    const tile = (base: string, n: number) => {
      const variants: HTMLCanvasElement[] = [];
      for (let i = 0; i < n; i++) {
        const fc = frameCanvas(`${base}_${i}`) ?? frameCanvas(base);
        if (fc) variants.push(fc);
      }
      return variants;
    };
    const meadow = tile('t_meadow', 4);
    const corrupt = tile('t_corrupt', 2);
    const stones = tile('t_flagstone', 2);
    const cols = Math.ceil(map.w / 16);
    const rows = Math.ceil(map.h / 16);
    for (let ty = 0; ty < rows; ty++)
      for (let tx = 0; tx < cols; tx++) {
        const x = tx * 16;
        const y = ty * 16;
        if (meadow.length) {
          // Mostly the calm variants, with the busier ones sprinkled in.
          const r = rng();
          const v = r < 0.45 ? 0 : r < 0.8 ? 1 : r < 0.93 ? 2 : 3;
          ctx.drawImage(meadow[Math.min(v, meadow.length - 1)], x, y);
        } else {
          ctx.fillStyle = '#b08a3e';
          ctx.fillRect(x, y, 16, 16);
        }
      }
    // Patches of the old green grass survive in the yellowing meadow.
    const grass = tile('t_grass', 3);
    const greens = this.w.map.stones.map((p) => ({ x: p.x * 0.97 + 20, y: p.y * 1.01, r: p.r * 1.6 }));
    // Corrupted soil with a dithered, organic edge.
    const blend = (patches: { x: number; y: number; r: number }[], variants: HTMLCanvasElement[], fallback: string) => {
      for (const p of patches) {
        const x0 = Math.max(0, Math.floor((p.x - p.r - 8) / 16));
        const x1 = Math.min(cols - 1, Math.ceil((p.x + p.r + 8) / 16));
        const y0 = Math.max(0, Math.floor((p.y - p.r - 8) / 16));
        const y1 = Math.min(rows - 1, Math.ceil((p.y + p.r + 8) / 16));
        for (let ty = y0; ty <= y1; ty++)
          for (let tx = x0; tx <= x1; tx++) {
            const src = variants[(tx * 7 + ty * 13) % Math.max(1, variants.length)];
            for (let py = 0; py < 16; py += 2)
              for (let px = 0; px < 16; px += 2) {
                const gx = tx * 16 + px + 1;
                const gy = ty * 16 + py + 1;
                const dx = gx - p.x;
                const dy = gy - p.y;
                const wobble = Math.sin(gx * 0.11 + p.y) * 6 + Math.cos(gy * 0.09 + p.x) * 6;
                const d = Math.sqrt(dx * dx + dy * dy) + wobble;
                const edge = (p.r - d) / 10;
                if (edge <= 0) continue;
                if (edge < 1 && hash2(gx, gy) > edge) continue;
                if (src) ctx.drawImage(src, px, py, 2, 2, tx * 16 + px, ty * 16 + py, 2, 2);
                else {
                  ctx.fillStyle = fallback;
                  ctx.fillRect(tx * 16 + px, ty * 16 + py, 2, 2);
                }
              }
          }
      }
    };
    blend(greens, grass, '#5ac54f');
    // Dry the whole field: desaturate and darken so hostile shots stand out.
    const img = ctx.getImageData(0, 0, map.w, map.h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      d[i] = (d[i] + (lum - d[i]) * 0.38) * 0.8;
      d[i + 1] = (d[i + 1] + (lum - d[i + 1]) * 0.38) * 0.8;
      d[i + 2] = (d[i + 2] + (lum - d[i + 2]) * 0.38) * 0.8;
    }
    ctx.putImageData(img, 0, 0);
    blend(map.stones.slice(0, 2).map((p) => ({ ...p, r: p.r * 0.35 })), stones, '#6b6b6b');
    blend(map.corrupt, corrupt, '#4a1f3c');
    // The rot is dark and sullen rather than neon.
    {
      const im = ctx.getImageData(0, 0, map.w, map.h);
      const px = im.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        if (!(b > g + 20 && r > g + 10)) continue;
        const lum = r * 0.3 + g * 0.59 + b * 0.11;
        px[i] = (r + (lum - r) * 0.3) * 0.82;
        px[i + 1] = (g + (lum - g) * 0.3) * 0.82;
        px[i + 2] = (b + (lum - b) * 0.3) * 0.82;
      }
      ctx.putImageData(im, 0, 0);
    }
    // Flat decor baked into the ground.
    for (const d of map.decor) {
      const fc = frameCanvas(d.sprite);
      if (!fc) continue;
      const [ox, oy] = originOf(d.sprite);
      ctx.save();
      ctx.translate(Math.round(d.x), Math.round(d.y));
      if (d.rot) ctx.rotate(d.rot);
      if (d.flip) ctx.scale(-1, 1);
      if (d.sprite.startsWith('cf_')) {
        // Rusting tools: darken and desaturate the pack icon so it reads as junk.
        ctx.globalAlpha = 0.75;
        ctx.filter = 'saturate(0.5) brightness(0.8)';
      }
      ctx.drawImage(fc, -Math.round(fc.width * ox), -Math.round(fc.height * oy));
      ctx.restore();
    }
    // Darken the margin so the playable area reads clearly.
    ctx.fillStyle = 'rgba(28,18,28,0.55)';
    const m = map.margin;
    ctx.fillRect(0, 0, map.w, m);
    ctx.fillRect(0, map.h - m, map.w, m);
    ctx.fillRect(0, m, m, map.h - 2 * m);
    ctx.fillRect(map.w - m, m, m, map.h - 2 * m);
    const key = addSceneCanvas(this.scene, 'ground', c);
    this.scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(0);
  }

  private buildObstacles() {
    const map = this.w.map;
    for (const o of map.obstacles) {
      if (!o.draw) continue;
      const key = hasFrame(o.sprite) ? o.sprite : hasFrame(`${o.sprite}_0`) ? `${o.sprite}_0` : '__missing';
      const img = this.scene.add.image(Math.round(o.x), Math.round(o.y + o.r * 0.6), ATLAS, key);
      const [ox, oy] = originOf(key);
      img.setOrigin(ox, oy).setDepth(1000 + o.y).setFlipX(!!o.flip);
      if (o.r > 7) this.scene.add.image(Math.round(o.x), Math.round(o.y + o.r * 0.5), ATLAS, o.r > 10 ? 'shadow_l' : 'shadow').setDepth(40);
    }
    // A hedge of trees and bushes around the edge of the meadow.
    const rng = mulberry(7);
    const place = (x: number, y: number, key: string) => {
      const k = hasFrame(key) ? key : '__missing';
      const [ox, oy] = originOf(k);
      this.scene.add.image(Math.round(x), Math.round(y), ATLAS, k).setOrigin(ox, oy).setDepth(1000 + y).setFlipX(rng() < 0.5);
    };
    for (let x = -10; x < map.w + 20; x += 26 + rng() * 10) {
      place(x, map.margin + 2 + rng() * 6, rng() < 0.6 ? 'd_tree_dead' : 'd_bush');
      place(x + 12, map.h - 2 - rng() * 6, 'd_bush');
    }
    for (let y = map.margin + 30; y < map.h; y += 24 + rng() * 10) {
      place(map.margin - 8 + rng() * 4, y, rng() < 0.4 ? 'd_tree_dead' : 'd_bush');
      place(map.w - map.margin + 8 - rng() * 4, y, rng() < 0.4 ? 'd_tree_dead' : 'd_bush');
    }
  }

  /** The royal patch and its ring of roots rise when the boss arrives. */
  raiseArena() {
    const w = this.w;
    const r = BOSS_ARENA_RADIUS;
    const size = r * 2 + 32;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const royal = [frameCanvas('t_royal_0') ?? frameCanvas('t_royal'), frameCanvas('t_royal_1') ?? frameCanvas('t_royal')].filter(Boolean) as HTMLCanvasElement[];
    for (let y = 0; y < size; y += 2)
      for (let x = 0; x < size; x += 2) {
        const dx = x - size / 2;
        const dy = y - size / 2;
        const d = Math.sqrt(dx * dx + dy * dy);
        const edge = (r + 6 - d) / 14;
        if (edge <= 0 || (edge < 1 && hash2(x, y) > edge)) continue;
        const src = royal[((x >> 4) + (y >> 4)) % Math.max(1, royal.length)];
        if (src) ctx.drawImage(src, x % 16, y % 16, 2, 2, x, y, 2, 2);
        else {
          ctx.fillStyle = '#391f21';
          ctx.fillRect(x, y, 2, 2);
        }
      }
    const key = addSceneCanvas(this.scene, 'royal_patch', c);
    this.royal = this.scene.add.image(w.arenaCx, w.arenaCy, key).setDepth(5).setAlpha(0);
    this.scene.tweens.add({ targets: this.royal, alpha: 1, duration: 1800 });
    this.setRing(w.arenaR);
  }

  setRing(r: number) {
    this.ringR = r;
    for (const i of this.ring) i.destroy();
    this.ring = [];
    const w = this.w;
    const n = Math.ceil((TAU * r) / 15);
    for (let i = 0; i < n; i++) {
      const a = (TAU * i) / n;
      const x = w.arenaCx + Math.cos(a) * (r + 4);
      const y = w.arenaCy + Math.sin(a) * (r + 4);
      const img = this.scene.add.image(x, y, ATLAS, F(`boss_root_tendril_${i % 2}`)).setRotation(a + Math.PI / 2).setDepth(1000 + y).setScale(1, 1.2);
      img.setAlpha(0);
      this.scene.tweens.add({ targets: img, alpha: 1, duration: 300, delay: i * 12 });
      this.ring.push(img);
    }
  }

  lowerArena() {
    for (const i of this.ring) this.scene.tweens.add({ targets: i, alpha: 0, duration: 800 });
  }

  // -------------------------------------------------------------------------
  // Per frame

  sync(dt: number) {
    this.t += dt;
    const w = this.w;
    const t = this.t;
    const g = this.gfx;
    g.clear();
    this.drawHazards();
    this.drawPickups();
    this.drawEnemies();
    this.drawPlayer(dt);
    this.drawProjectiles();
    this.drawSummons();
    this.drawBullets();
    this.drawProps();
    // Mycelium threads.
    for (const wi of w.run.weapons) {
      if (!wi.extra.mycelium || wi.summons.length < 2) continue;
      g.lineStyle(1, 0xd3fc7e, 0.5 + 0.2 * Math.sin(t * 6));
      g.beginPath();
      wi.summons.forEach((s, i) => (i === 0 ? g.moveTo(s.x, s.y - 3) : g.lineTo(s.x, s.y - 3)));
      g.closePath();
      g.strokePath();
    }
    this.fx.update(dt);
    this.drawOverlay();
  }

  private drawHazards() {
    const w = this.w;
    const g = this.gfx;
    const used = new Set<number>();
    for (const h of w.hazards.items) {
      if (!h.active) continue;
      const i = h._i!;
      const fade = Math.min(1, (h.life - h.age) / 0.4);
      switch (h.kind) {
        case 'poison':
        case 'fire':
        case 'spores': {
          used.add(i);
          const key = h.kind === 'poison' ? 'h_poison' : h.kind === 'fire' ? 'h_fire' : 'h_spores';
          const img = this.hazardSpr.get(i);
          img.setFrame(F(animFrame(key, this.t + i * 0.13, h.kind === 'fire' ? 10 : 4)));
          const base = h.kind === 'poison' ? 13 : h.kind === 'fire' ? 11 : 9;
          const s = Math.max(0.5, h.radius / base);
          img.setPosition(Math.round(h.x), Math.round(h.y)).setOrigin(0.5, 0.5).setScale(s, s * (h.kind === 'spores' ? 1 : 0.9)).setDepth(h.kind === 'spores' ? 6500 : 12).setAlpha(fade * (h.kind === 'spores' ? 0.8 : 0.9));
          break;
        }
        case 'furrow': {
          used.add(i);
          const img = this.hazardSpr.get(i);
          img.setFrame(F('fx_burrow_2')).setOrigin(0.5, 0.5).setPosition(Math.round(h.x), Math.round(h.y)).setScale(1).setDepth(15).setAlpha(fade * 0.85).setTint(0x8a4836);
          break;
        }
        case 'briar': {
          used.add(i);
          const img = this.hazardSpr.get(i);
          img.setFrame(F(animFrame('p_briar', this.t + i * 0.3, 3)));
          const grow = Math.min(1, h.age / 0.15);
          img.setPosition(Math.round(h.x), Math.round(h.y + 6)).setOrigin(0.5, 1).setScale(grow).setDepth(1000 + h.y).setAlpha(fade);
          break;
        }
        case 'telegraph': {
          // The player's own artillery landing marks: friendly green, thin.
          const k = h.age / h.life;
          g.lineStyle(1, 0xd3fc7e, 0.5);
          g.strokeCircle(h.x, h.y, h.radius);
          g.fillStyle(0x33984b, 0.12 + 0.12 * k);
          g.fillCircle(h.x, h.y, h.radius * k);
          break;
        }
        case 'zone': {
          if (!h.fired) {
            const k = Math.min(1, h.age / h.warn);
            const hc = game.settings.highContrast;
            g.fillStyle(hc ? 0xff0040 : 0xc42430, 0.12 + 0.18 * k);
            g.fillCircle(h.x, h.y, h.radius);
            g.fillStyle(0xff0040, 0.22 + 0.2 * k);
            g.fillCircle(h.x, h.y, h.radius * k);
            g.lineStyle(hc ? 2 : 1, 0xff0040, 0.7 + 0.3 * Math.sin(this.t * 30));
            g.strokeCircle(h.x, h.y, h.radius);
          } else {
            used.add(i);
            const img = this.hazardSpr.get(i);
            const since = h.age - h.warn;
            const n = Math.max(1, frameCount(h.sprite));
            const fr = Math.min(n - 1, Math.floor(since * 16));
            img.setFrame(F(n > 1 ? `${h.sprite}_${fr}` : h.sprite));
            img.setPosition(Math.round(h.x), Math.round(h.y + 4)).setOrigin(0.5, 1).setScale(Math.max(1, h.radius / 14)).setDepth(1000 + h.y).setAlpha(Math.min(1, (h.life - h.age) / 0.2));
          }
          break;
        }
        case 'seedpod': {
          if (!h.fired) {
            // Falling seed: shadow grows, seed drops from the sky.
            const k = Math.min(1, h.age / h.warn);
            g.fillStyle(0x1c121c, 0.25 + 0.3 * k);
            g.fillEllipse(h.x, h.y, h.radius * 2 * (0.4 + 0.6 * k), h.radius * (0.4 + 0.6 * k));
            g.lineStyle(1, 0xff0040, 0.8);
            g.strokeCircle(h.x, h.y, h.radius);
            used.add(i);
            const img = this.hazardSpr.get(i);
            img.setFrame(F('boss_seed_0')).setOrigin(0.5, 0.5).setScale(1).setDepth(7100).setAlpha(1);
            img.setPosition(Math.round(h.x), Math.round(h.y - (1 - k) * 160));
          } else {
            used.add(i);
            const img = this.hazardSpr.get(i);
            const fuse = (h.age - h.warn) / (h.life - h.warn);
            img.setFrame(F(animFrame('boss_seed', this.t, 4 + fuse * 14)));
            img.setPosition(Math.round(h.x), Math.round(h.y - 2)).setOrigin(0.5, 0.5).setScale(1 + fuse * 0.4).setDepth(1000 + h.y).setAlpha(1);
            g.lineStyle(1, 0xff0040, 0.3 + fuse * 0.6);
            g.strokeCircle(h.x, h.y, 10 + fuse * 6);
          }
          break;
        }
      }
    }
    this.hazardSpr.hideFrom(used);
  }

  private drawPickups() {
    const used = new Set<number>();
    for (const k of this.w.pickups.items) {
      if (!k.active) continue;
      const i = k._i!;
      used.add(i);
      const img = this.pickupSpr.get(i);
      let key = '';
      let bob = Math.sin(this.t * 4 + i) * 1;
      switch (k.kind) {
        case 'sap':
          key = k.value >= 5 ? 'pk_sap_l' : k.value >= 3 ? 'pk_sap_m' : 'pk_sap_s';
          break;
        case 'farthing':
          key = animFrame('pk_farthing', this.t + i * 0.1, 10);
          break;
        case 'material':
          key = MATERIALS[k.id]?.icon ?? 'cf_1';
          break;
        case 'seed':
          key = CROPS[k.id]?.seed ?? 'seed_pea';
          break;
        case 'heart':
          key = 'cf_61';
          break;
        case 'chest':
          key = 'pk_chest_0';
          bob = 0;
          break;
        case 'jam':
          key = 'cf_61';
          break;
      }
      const big = k.kind === 'material' || k.kind === 'seed' || k.kind === 'heart';
      img.setFrame(F(key)).setOrigin(0.5, 1).setScale(big ? 0.75 : k.kind === 'sap' ? 0.85 : 1);
      img.setPosition(Math.round(k.x), Math.round(k.y - k.z + bob)).setDepth(1000 + k.y - 2);
      if (k.age > k.life - 5) img.setAlpha(Math.floor(this.t * 8) % 2 ? 0.3 : 1);
      else img.setAlpha(1);
      // Rare loot announces itself with a light column.
      if ((k.kind === 'seed' || k.kind === 'material' || k.kind === 'chest') && (k.rarity >= 2 || k.kind === 'chest')) {
        const c = k.kind === 'chest' ? 0xffc825 : RARITY_COLOUR[Math.min(4, k.rarity)];
        this.gfx.fillStyle(c, 0.12 + 0.06 * Math.sin(this.t * 5));
        this.gfx.fillRect(k.x - 3, k.y - 70, 6, 66);
        this.gfx.fillStyle(c, 0.25);
        this.gfx.fillRect(k.x - 1, k.y - 70, 2, 66);
        if (Math.random() < 0.08) this.fx.sprite('fx_sparkle', k.x + (Math.random() - 0.5) * 10, k.y - 6 - Math.random() * 30, { depth: 8000, fps: 12 });
      }
    }
    this.pickupSpr.hideFrom(used);
  }

  private enemyKey(e: Enemy): string {
    const a = e.def.anims;
    let anim = a.walk;
    let fps = 8;
    switch (e.state) {
      case 'windup':
        anim = a.windup ?? a.swing ?? a.cast ?? a.walk;
        break;
      case 'charge':
        anim = a.charge ?? a.walk;
        fps = 14;
        break;
      case 'attack':
        anim = a.cast ?? a.walk;
        break;
      case 'emerge':
        return 'en_stalker_mound_' + (Math.floor(this.t * 16) % 2);
      case 'intro':
        anim = a.walk;
        break;
    }
    if (e.def.ai === 'burrower') {
      if (e.state === 'burrow') return animFrame('en_stalker_mound', e.t, 6);
      const n = frameCount('en_stalker_emerge');
      if (e.stateT < 0.25) return `en_stalker_emerge_${Math.min(n - 1, Math.floor((e.stateT / 0.25) * n))}`;
      return `en_stalker_emerge_${n - 1}`;
    }
    if (e.boss) {
      if (e.state === 'dying') {
        const n = frameCount(a.death!);
        return `${a.death}_${Math.min(n - 1, Math.floor(e.stateT / 0.7))}`;
      }
      if (e.state === 'attack' && e.attack) {
        const slam = e.attack.id === 'mk_judgment' || e.attack.id === 'mk_uprooting';
        if (e.attackT < e.attack.windup) return slam ? (a.cast ?? a.walk) : (a.cast ?? a.walk);
        return slam ? (a.slam ?? a.walk) : (a.cast ?? a.walk);
      }
      if (e.phase === 1) anim = a.p2 ?? a.walk;
      fps = 3;
    }
    if (e.def.ai === 'watcher') {
      if (e.state === 'attack' && e.attack) return e.attackT < e.attack.windup ? (a.cast ?? a.walk) : animFrame(a.gaze ?? a.walk, e.t, 4);
      return animFrame(e.phase ? (a.gaze ?? a.walk) : a.walk, e.t, 2);
    }
    if (e.def.ai === 'knight' && e.state === 'windup') return `${a.swing}_0`;
    if (e.def.ai === 'knight' && e.state === 'recover') return `${a.swing}_1`;
    if (e.def.id === 'nibbler' || e.def.id === 'sporelet') fps = 12;
    if (e.def.flying) fps = 10;
    if (e.def.ai === 'turret') fps = 3;
    return animFrame(anim, e.t, fps);
  }

  private drawEnemies() {
    const w = this.w;
    const used = new Set<number>();
    const g = this.gfx;
    for (const e of w.enemies.items) {
      if (!e.active) continue;
      const i = e._i!;
      if (e.spawnT > 0) {
        // Spawn telegraph: a churning dirt mound.
        used.add(i);
        const img = this.enemySpr.get(i);
        img.clearTint();
        img.setFrame(F(`fx_burrow_${Math.floor(this.t * 8) % 2}`)).setOrigin(0.5, 1).setPosition(Math.round(e.x), Math.round(e.y + 3)).setDepth(20).setFlipX(false).setAlpha(1).setScale(1);
        this.enemyShadow.hide(i);
        continue;
      }
      used.add(i);
      const img = this.enemySpr.get(i);
      const key = this.enemyKey(e);
      img.setFrame(F(key));
      const [ox, oy] = originOf(F(key));
      img.setOrigin(ox, oy);
      const hover = e.def.hover ? e.def.hover + Math.sin(e.t * 5) * 1.5 : 0;
      let y = e.y + e.def.foot * 0.35 - hover;
      let alpha = 1;
      if (e.boss && e.state === 'intro') {
        const k = Math.min(1, e.stateT / 2.6);
        y += (1 - k) * 40;
        alpha = k;
      }
      img.setPosition(Math.round(e.x), Math.round(y));
      img.setDepth(1000 + e.y);
      img.setFlipX(e.facing < 0 && !e.boss);
      img.setAlpha(alpha);
      img.setScale(e.state === 'windup' && e.def.ai === 'charger' ? 1 + Math.sin(this.t * 40) * 0.05 : 1);
      if (e.flash > 0 && (e.boss || e.elite)) img.setTint(0x7a6a6a).setTintMode(Phaser.TintModes.ADD);
      else if (e.flash > 0) img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else if (e.frozenT > 0) img.setTint(0x94fdff).setTintMode(Phaser.TintModes.MULTIPLY);
      else if (e.state === 'windup' && Math.floor(this.t * 14) % 2 === 0) img.setTint(0xff8080).setTintMode(Phaser.TintModes.ADD);
      else if (e.cursedT > 0 && !e.boss && Math.floor(this.t * 5 + i) % 3 === 0) img.setTint(0xdb3ffd).setTintMode(Phaser.TintModes.MULTIPLY);
      // Status tints on small foes only; on bosses they would just look like a different colour.
      else if (!e.elite && !e.boss && e.burnT > 0 && Math.floor(this.t * 10 + i) % 3 === 0) img.setTint(0xffa214).setTintMode(Phaser.TintModes.MULTIPLY);
      else if (!e.elite && !e.boss && e.poisonT > 0 && Math.floor(this.t * 6 + i) % 4 === 0) img.setTint(0x99e65f).setTintMode(Phaser.TintModes.MULTIPLY);
      else img.clearTint();
      // Shadow.
      if (!e.hidden) {
        const sh = this.enemyShadow.get(i);
        sh.setFrame(e.boss ? 'shadow_xl' : e.radius > 9 ? 'shadow_l' : 'shadow').setPosition(Math.round(e.x), Math.round(e.y + e.def.foot * 0.35)).setDepth(40).setAlpha(e.def.flying ? 0.5 : 0.9);
      } else this.enemyShadow.hide(i);
      // Telegraphs.
      if (e.def.ai === 'charger' && e.state === 'windup') {
        const k = Math.min(1, e.stateT / 0.75);
        const len = 200;
        g.lineStyle(game.settings.highContrast ? 3 : 2, 0xff0040, 0.25 + 0.5 * k);
        g.lineBetween(e.x, e.y, e.x + Math.cos(e.angle) * len, e.y + Math.sin(e.angle) * len);
        g.fillStyle(0xff0040, 0.1 + 0.15 * k);
        const nx = -Math.sin(e.angle) * 8;
        const ny = Math.cos(e.angle) * 8;
        g.fillPoints(
          [
            { x: e.x + nx, y: e.y + ny },
            { x: e.x + Math.cos(e.angle) * len * k + nx, y: e.y + Math.sin(e.angle) * len * k + ny },
            { x: e.x + Math.cos(e.angle) * len * k - nx, y: e.y + Math.sin(e.angle) * len * k - ny },
            { x: e.x - nx, y: e.y - ny },
          ] as Phaser.Math.Vector2[],
          true,
        );
      }
      if (e.def.ai === 'burrower' && e.state === 'emerge') {
        g.lineStyle(1, 0xff0040, 0.9);
        g.strokeCircle(e.x, e.y, 18);
        g.fillStyle(0xff0040, 0.2 + 0.3 * (e.stateT / 0.6));
        g.fillCircle(e.x, e.y, 18 * (e.stateT / 0.6));
      }
      if (e.def.ai === 'knight' && e.state === 'windup') {
        const k = Math.min(1, e.stateT / 0.55);
        g.fillStyle(0xff0040, 0.12 + 0.25 * k);
        g.slice(e.x, e.y - 4, 44, e.angle - 1.2, e.angle + 1.2, false);
        g.fillPath();
      }
      if (e.elite && !e.boss) {
        // A slow ring marks elites at a glance.
        g.lineStyle(1, 0xffc825, 0.35 + 0.2 * Math.sin(this.t * 3));
        g.strokeEllipse(e.x, e.y + e.def.foot * 0.35, e.radius * 3.2, e.radius * 1.3);
      }
      // Health bars on wounded mid-size foes.
      if (!e.boss && !e.elite && e.maxHp >= 30 && e.hp < e.maxHp && !e.hidden) {
        const bw = 14;
        const bx = Math.round(e.x - bw / 2);
        const by = Math.round(y - frameSizeH(key) - 3);
        g.fillStyle(0x1c121c, 0.85);
        g.fillRect(bx - 1, by - 1, bw + 2, 4);
        g.fillStyle(0xea323c, 1);
        g.fillRect(bx, by, Math.max(1, Math.round((e.hp / e.maxHp) * bw)), 2);
      }
    }
    this.enemySpr.hideFrom(used);
    this.enemyShadow.hideFrom(used);
  }

  private drawPlayer(dt: number) {
    const w = this.w;
    const p = w.player;
    const cls = w.run.cls.id;
    const a = p.aim;
    const c = Math.cos(a);
    const s = Math.sin(a);
    let dir: 'side' | 'up' | 'down' = 'down';
    if (Math.abs(c) > 0.62) dir = 'side';
    else if (s < 0) dir = 'up';
    const moving = p.moving || p.dashT > 0;
    const base = `hero_${cls}_${dir}_${moving ? 'walk' : 'idle'}`;
    const key = animFrame(base, p.animT, moving ? 9 : 2);
    this.player.setFrame(F(key));
    const [ox, oy] = originOf(F(key));
    const flip = dir === 'side' && c < 0;
    this.player.setOrigin(ox, oy).setFlipX(flip);
    const squash = p.dashT > 0 ? 0.85 : 1;
    this.player.setScale(p.dashT > 0 ? 1.12 : 1, squash);
    const px = Math.round(p.x);
    const py = Math.round(p.y + 4);
    this.player.setPosition(px, py).setDepth(1000 + p.y);
    // Hurt flicker (not during a dash, which has its own afterimages).
    if (p.dead) this.player.setVisible(false);
    if (p.hurtT > 0) this.player.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else this.player.clearTint();
    this.player.setAlpha(p.iframes > 0 && p.dashT <= 0 && p.reapT <= 0 && Math.floor(this.t * 20) % 2 === 0 ? 0.35 : 1);
    this.playerShadow.setPosition(px, py).setVisible(!p.dead);
    // Dust from running feet.
    this.dustT -= dt;
    if (p.moving && p.dashT <= 0 && this.dustT <= 0 && !p.dead) {
      this.dustT = 0.28;
      if (!game.settings.reducedEffects) this.fx.sprite('fx_dust', p.x - Math.sign(p.vx) * 3, p.y + 3, { fps: 12, depth: 45, alpha: 0.6, scale: 0.7 });
    }
    // Dash and reap afterimages.
    this.afterT -= dt;
    if ((p.dashT > 0 || p.reapT > 0) && this.afterT <= 0) {
      this.afterT = 0.03;
      this.fx.sprite(key, px, py - 10, { life: 0.18, tint: p.reapT > 0 ? 0xea323c : 0x94fdff, alpha: 0.5, depth: 999 + p.y, flipX: flip });
    }
    // Held weapon at the hand, rotated to aim. Drawn behind when facing up.
    const held = this.held;
    const wi = w.run.held;
    held.setFrame(F(wi.def.icon));
    const [hox, hoy] = originOf(F(wi.def.icon));
    held.setOrigin(hox, hoy);
    const handX = dir === 'side' ? 0 : c >= 0 ? 4.5 : -4.5;
    const handY = -6;
    let rot = a;
    if (wi.def.behaviour === 'sweep') {
      // Swing through the arc for a moment after each cut.
      const since = wi.cooldown() - wi.cd;
      const k = Math.min(1, Math.max(0, since / 0.14));
      rot = a - 1.1 + 2.2 * k;
      if (wi.cd <= 0) rot = a - 0.9;
    }
    // A little kick back along the aim each time it fires.
    let kick = 0;
    if (wi.def.behaviour !== 'sweep') {
      const since = wi.cooldown() - wi.cd;
      if (wi.cd > 0 && since < 0.08) kick = 2.5 * (1 - since / 0.08);
    }
    held.setRotation(rot).setFlipY(c < 0).setPosition(Math.round(p.x + handX * (flip ? -1 : 1) - c * kick), Math.round(p.y + 4 + handY - s * kick));
    held.setDepth(dir === 'up' ? 999 + p.y : 1001 + p.y).setVisible(!p.dead);
    // The true hitbox, so players can learn how small they are.
    this.hitDot.setVisible(game.settings.showHitbox && !p.dead).setPosition(Math.round(p.x), Math.round(p.y - 4));
    this.hitDot.setTint(Math.floor(this.t * 4) % 2 ? 0xffffff : 0xf9e6cf);
    // Petal wards.
    let n = 0;
    const used = new Set<number>();
    for (let i = 0; i < w.petalShields; i++) {
      used.add(200 + n);
      const img = this.petalSpr.get(200 + n++);
      const ang = this.t * 3 + (i * TAU) / Math.max(1, w.petalShields);
      img.setFrame(F('p_petal_0')).setPosition(Math.round(p.x + Math.cos(ang) * 11), Math.round(p.y - 4 + Math.sin(ang) * 8)).setDepth(1002 + p.y).setTint(0xfdd2ed).setScale(0.8);
    }
    // Orbiting petals, with a faint trace of their path.
    for (const wi2 of w.run.weapons) {
      if (wi2.def.behaviour !== 'orbit') continue;
      this.gfx.lineStyle(1, wi2.def.id === 'sporelight' ? 0xc7cfdd : 0xffeb57, 0.18);
      this.gfx.strokeCircle(p.x, p.y - 4, wi2.area());
      const solstice = wi2.def.id === 'solstice_crown';
      const spore = wi2.def.id === 'sporelight';
      wi2.orbitPos.forEach((pos, k) => {
        const id = wi2.slot * 30 + k;
        used.add(id);
        const img = this.petalSpr.get(id);
        img.setFrame(F(`p_petal_${Math.floor(this.t * 6 + k) % 2}`)).setPosition(Math.round(pos.x), Math.round(pos.y)).setDepth(1000 + pos.y).setScale(wi2.scale() * (solstice ? 2 : 1.6)).setRotation(this.t * 4 + k);
        if (solstice) img.setTint(0xffeb57);
        else if (spore) img.setTint(0xc7cfdd);
        else img.clearTint();
      });
    }
    this.petalSpr.hideFrom(used);
  }

  private drawProjectiles() {
    const used = new Set<number>();
    const shadows = new Set<number>();
    for (const p of this.w.projs.items) {
      if (!p.active) continue;
      const i = p._i!;
      used.add(i);
      const img = this.projSpr.get(i);
      let key = p.sprite;
      if (key === 'none') {
        img.setVisible(false);
        continue;
      }
      if (key === 'smoke') {
        img.setFrame('soft').setTint(0xc7cfdd).setAlpha(0.5 * (1 - p.age / p.life)).setScale(0.6 + p.age * 1.4).setRotation(0);
        img.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(6000).setOrigin(0.5, 0.5);
        continue;
      }
      if (key === 'spore') {
        img.setFrame('soft').setTint(0x99e65f).setAlpha(0.55 * (1 - p.age / p.life)).setScale(0.5 + p.age * 1.2).setRotation(0);
        img.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(6000).setOrigin(0.5, 0.5);
        continue;
      }
      if (key === 'crescent') {
        img.setFrame('soft').setTint(0xf9e6cf).setAlpha(0.7).setScale(1.4, 0.6).setRotation(Math.atan2(p.vy, p.vx) + Math.PI / 2);
        img.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(6000).setOrigin(0.5, 0.5);
        continue;
      }
      if (!hasFrame(key) && hasFrame(`${key}_0`)) key = `${key}_${Math.floor(p.age * 10) % frameCount(key)}`;
      img.setFrame(F(key)).setOrigin(0.5, 0.5);
      const directional = key.startsWith('p_carrot') || key.startsWith('p_thorn') || key === 'p_frost' || key.startsWith('eb_thorn');
      img.setRotation(directional ? Math.atan2(p.vy, p.vx) : p.rot * (p.spin ? 1 : 0));
      img.setScale(p.scale * (p.kind === 'roll' ? 1 : 1));
      img.setAlpha(1);
      if (p.tint === 2) img.setTint(0x99e65f).setTintMode(Phaser.TintModes.MULTIPLY);
      else if (p.tint === 4) img.setTint(0x94fdff).setTintMode(Phaser.TintModes.MULTIPLY);
      else if (p.tint === 3) img.setTint(0xffa214).setTintMode(Phaser.TintModes.MULTIPLY);
      else img.clearTint();
      if (key === 'held_flask') img.setRotation(p.age * 14);
      img.setPosition(Math.round(p.x), Math.round(p.y - p.z));
      img.setDepth(p.z > 0 ? 6100 : 6000);
      if (p.kind === 'lob' || p.kind === 'shell') {
        shadows.add(i);
        const sh = this.projShadow.get(i);
        sh.setFrame('shadow').setPosition(Math.round(p.x), Math.round(p.y)).setDepth(40).setScale(0.6 + 0.4 * (1 - p.z / 70)).setAlpha(0.7);
      }
    }
    this.projSpr.hideFrom(used);
    this.projShadow.hideFrom(shadows);
  }

  private drawSummons() {
    const used = new Set<number>();
    for (const s of this.w.summons.items) {
      if (!s.active) continue;
      const i = s._i!;
      used.add(i);
      const img = this.summonSpr.get(i);
      let key = '';
      let y = s.y;
      let depth = 1000 + s.y;
      switch (s.kind) {
        case 'shroom':
          key = `p_shroom_${Math.floor(s.t * 9) % 3}`;
          y -= s.z;
          break;
        case 'bee':
          key = `p_bee_${Math.floor(s.t * 20) % 2}`;
          depth = 6200;
          break;
        case 'mite':
          key = `en_sporelet_walk_${Math.floor(s.life * 10) % 2}`;
          break;
        case 'wbee':
          key = `p_bee_${Math.floor(s.t * 20) % 2}`;
          depth = 6200;
          break;
        case 'turret':
          key = hasFrame('p_turret_0') ? `p_turret_${s.cd > 0.4 ? 0 : 1}` : 'b_pump';
          break;
        case 'decoy':
          key = `farm_scarecrow_${Math.floor(s.t * 2) % 2}`;
          break;
      }
      img.setFrame(F(key));
      const [ox, oy] = originOf(F(key));
      img.setOrigin(s.kind === 'shroom' ? 0.5 : ox, s.kind === 'shroom' ? 1 : oy).setPosition(Math.round(s.x), Math.round(y + (s.kind === 'decoy' ? 4 : 0))).setDepth(depth).setFlipX(s.facing < 0);
      if (s.kind === 'mite') img.setTint(0x99e65f);
      else img.clearTint();
      if (s.kind === 'turret' && !hasFrame('p_turret_0')) img.setScale(0.55);
      else img.setScale(1);
      if (s.kind === 'turret' && s.life < 2) img.setAlpha(Math.floor(this.t * 10) % 2 ? 0.4 : 1);
      img.setAlpha(s.kind === 'decoy' && s.life < 1 ? 0.5 + 0.5 * Math.sin(this.t * 20) : 1);
    }
    this.summonSpr.hideFrom(used);
  }

  private drawBullets() {
    const hc = game.settings.highContrast;
    const used = new Set<number>();
    for (const b of this.w.bullets.items) {
      if (!b.active) continue;
      const i = b._i!;
      used.add(i);
      const img = this.bulletSpr.get(i);
      img.setFrame(F(b.sprite)).setOrigin(0.5, 0.5);
      img.setRotation(b.sprite === 'eb_thorn' ? b.angle : b.sprite === 'eb_ring' ? b.age * 12 : 0);
      img.setPosition(Math.round(b.x), Math.round(b.y));
      img.setDepth(7000 + (b.y % 100) * 0.001);
      const spawnPop = b.age < 0.08 ? 0.6 + (b.age / 0.08) * 0.4 : 1;
      img.setScale((hc ? 1.25 : 1) * spawnPop);
      img.setAlpha(b.delay > 0 ? (Math.floor(b.age * 16) % 2 ? 0.5 : 1) : 1);
      if (hc) {
        const halo = this.bulletHalo.get(i);
        halo.setFrame('soft').setTint(0x000000).setAlpha(0.55).setScale(0.75).setPosition(Math.round(b.x), Math.round(b.y)).setDepth(6999);
      }
    }
    this.bulletSpr.hideFrom(used);
    if (hc) this.bulletHalo.hideFrom(used);
    else this.bulletHalo.hideFrom(new Set());
  }

  private drawProps() {
    const w = this.w;
    const used = new Set<number>();
    this.marks.clear();
    w.props.forEach((pr, i) => {
      if (!pr.active) return;
      const base = i * 3;
      if (pr.kind === 'cart') {
        used.add(base);
        used.add(base + 1);
        const cart = this.propSpr.get(base);
        cart.setFrame(F(animFrame('npc_snail_cart', this.t, 2))).setOrigin(0.5, 1).setPosition(Math.round(pr.x), Math.round(pr.y + 14)).setDepth(1000 + pr.y + 14);
        const mags = this.propSpr.get(base + 1);
        mags.setFrame(F(animFrame('npc_mags', this.t, 2))).setOrigin(0.5, 1).setPosition(Math.round(pr.x - 34), Math.round(pr.y + 16)).setDepth(1000 + pr.y + 16);
      } else if (pr.kind === 'exit') {
        used.add(base);
        const sign = this.propSpr.get(base);
        sign.setFrame(F('d_signpost')).setOrigin(0.5, 1).setPosition(Math.round(pr.x), Math.round(pr.y + 8)).setDepth(1000 + pr.y + 8);
      } else if (pr.kind === 'cache') {
        used.add(base);
        const c = this.propSpr.get(base);
        c.setFrame(F('d_mushrooms')).setOrigin(0.5, 1).setPosition(Math.round(pr.x), Math.round(pr.y + 4)).setDepth(1000 + pr.y + 4).clearTint();
        this.gfx.lineStyle(1, 0xffc825, 0.5 + 0.3 * Math.sin(this.t * 5));
        this.gfx.strokeEllipse(pr.x, pr.y + 3, 22, 9);
        if (Math.random() < 0.1) this.fx.sprite('fx_sparkle', pr.x + (Math.random() - 0.5) * 16, pr.y - Math.random() * 10, { depth: 8000 });
      } else if (pr.kind === 'shrine') {
        used.add(base);
        const s = this.propSpr.get(base);
        s.setFrame(F('d_pillar')).setOrigin(0.5, 1).setPosition(Math.round(pr.x), Math.round(pr.y + 8)).setDepth(1000 + pr.y + 8);
        s.setTint(0xca52c9);
        const k = (pr.progress ?? 0) / 12;
        this.gfx.lineStyle(1, 0xf389f5, 0.6);
        this.gfx.strokeCircle(pr.x, pr.y, 48);
        this.gfx.lineStyle(3, 0xd3fc7e, 0.9);
        this.gfx.beginPath();
        this.gfx.arc(pr.x, pr.y - 34, 7, -Math.PI / 2, -Math.PI / 2 + TAU * k, false);
        this.gfx.strokePath();
        if (Math.random() < 0.2) this.fx.sprite('fx_sparkle', pr.x + (Math.random() - 0.5) * 30, pr.y - Math.random() * 30, { depth: 8000, tint: 0xf389f5 });
      }
      // The interaction prompt itself is DOM text in the HUD (readable at any
      // scale); the world only marks which prop it belongs to.
      if (w.nearProp === pr) {
        const y = pr.y - (pr.kind === 'cart' ? 40 : 30) + Math.sin(this.t * 6) * 1.5;
        this.marks.fillStyle(0x000000, 1);
        this.marks.fillTriangle(pr.x - 5, y - 5, pr.x + 5, y - 5, pr.x, y + 1);
        this.marks.fillStyle(0xffeb57, 1);
        this.marks.fillTriangle(pr.x - 3, y - 4, pr.x + 3, y - 4, pr.x, y - 0.5);
      }
    });
    this.propSpr.hideFrom(used);
  }

  /** Arrows at the screen edge pointing to important things off-screen. */
  private drawOverlay() {
    const o = this.overlay;
    o.clear();
    const cam = this.scene.cameras.main;
    const w = this.w;
    const targets: { x: number; y: number; c: number }[] = [];
    if (w.elite?.active) targets.push({ x: w.elite.x, y: w.elite.y, c: 0xffc825 });
    for (const pr of w.props) if (pr.active) targets.push({ x: pr.x, y: pr.y, c: pr.kind === 'shrine' ? 0xf389f5 : pr.kind === 'cache' ? 0xffc825 : 0xd3fc7e });
    for (const k of w.pickups.items) if (k.active && k.kind === 'chest') targets.push({ x: k.x, y: k.y, c: 0xffc825 });
    for (const t of targets) {
      const sx = t.x - cam.scrollX;
      const sy = t.y - cam.scrollY;
      if (sx > 8 && sx < 632 && sy > 8 && sy < 352) continue;
      const cx = 320;
      const cy = 180;
      const a = Math.atan2(sy - cy, sx - cx);
      const ex = Math.max(14, Math.min(626, cx + Math.cos(a) * 400));
      const ey = Math.max(14, Math.min(346, cy + Math.sin(a) * 400));
      o.fillStyle(0x1c121c, 0.9);
      o.fillTriangle(ex + Math.cos(a) * 8, ey + Math.sin(a) * 8, ex + Math.cos(a + 2.4) * 7, ey + Math.sin(a + 2.4) * 7, ex + Math.cos(a - 2.4) * 7, ey + Math.sin(a - 2.4) * 7);
      o.fillStyle(t.c, 1);
      o.fillTriangle(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6, ex + Math.cos(a + 2.4) * 5, ey + Math.sin(a + 2.4) * 5, ex + Math.cos(a - 2.4) * 5, ey + Math.sin(a - 2.4) * 5);
    }
    // Low health vignette.
    const hp = w.player.hp / w.run.stats.maxHp;
    if (hp < 0.3 && !w.player.dead) {
      const pulse = 0.12 + 0.1 * Math.sin(this.t * 6);
      o.lineStyle(10, 0xc42430, pulse);
      o.strokeRect(5, 5, 630, 350);
    }
  }

  // -------------------------------------------------------------------------
  // Effects

  handleFx(f: Fx) {
    const fx = this.fx;
    const reduced = game.settings.reducedEffects;
    switch (f.type) {
      case 'sfx':
        game.audio.play(f.s!, f.a ?? 1);
        break;
      case 'hit':
        if (!reduced || Math.random() < 0.4) fx.sprite('fx_hit', f.x, f.y, { fps: 24, depth: 8000 });
        break;
      case 'crit':
        fx.sprite('fx_hit', f.x, f.y, { fps: 20, scale: 1.6, tint: 0xffeb57, depth: 8000 });
        break;
      case 'block':
        fx.sprite('fx_hit', f.x, f.y, { fps: 24, tint: 0x92a1b9, depth: 8000 });
        break;
      case 'dmg': {
        const v = Math.round(f.a ?? 0);
        if (v <= 0) break;
        const crit = f.b === 1;
        const dot = f.c === 1;
        fx.number(crit ? `${v}!` : String(v), f.x, f.y, crit ? 0xffc825 : DMG_COLOUR[f.s ?? 'physical'] ?? 0xffffff, crit ? 2 : 1, dot ? 0.5 : 0.7);
        break;
      }
      case 'heal':
        fx.number(`+${Math.round(f.a ?? 0)}`, f.x, f.y, 0x5ac54f, 1, 0.8);
        break;
      case 'death': {
        fx.sprite('fx_poof', f.x, f.y, { fps: 16, depth: 8000, scale: Math.max(1, (f.c ?? 6) / 7) });
        if (!reduced) fx.burst('dot2', f.x, f.y, 4, 60, { tint: f.s === 'sporeling' || f.s === 'sporelet' ? 0x93388f : f.s === 'mudling' ? 0x5d2c28 : 0xbf6f4a, depth: 7990 });
        break;
      }
      case 'wither':
        fx.sprite('fx_poof', f.x, f.y, { fps: 10, depth: 8000, tint: 0x857766 });
        break;
      case 'explode': {
        const r = f.c ?? 24;
        const variant = f.s;
        const tint = variant === 'toxic' ? 0x99e65f : variant === 'blood' ? 0xea323c : undefined;
        fx.sprite('fx_explosion', f.x, f.y, { fps: 16, scale: Math.max(0.5, r / 15), tint, depth: 7950 });
        if (!reduced) fx.burst('dot2', f.x, f.y, variant === 'small' ? 3 : 8, r * 3, { tint: 0x5d2c28, depth: 7940 });
        fx.disc(f.x, f.y, r, tint ?? 0xffa214, 0.15);
        break;
      }
      case 'detonate':
        fx.ring(f.x, f.y, 4, 34, 0x99e65f, 0.3, 2);
        break;
      case 'splat':
        if (!reduced) fx.burst('dot2', f.x, f.y, 6, 70, { tint: f.s === 'fire' ? 0xff5000 : 0xc42430, depth: 7900, grav: 200 });
        break;
      case 'chunks':
        fx.burst('dot2', f.x, f.y, 5, 90, { tint: 0xf9e6cf, depth: 7900 });
        break;
      case 'spores':
        fx.sprite('h_spores', f.x, f.y, { fps: 8, life: 0.4, scale: (f.c ?? 20) / 10, alpha: 0.8, depth: 6500 });
        break;
      case 'sweep': {
        const colour = f.s === 'arc_thorn' ? 0x33984b : f.s === 'arc_blood' ? 0xc42430 : f.s === 'arc_enemy' ? 0xff0040 : 0xf9e6cf;
        fx.arc(f.x, f.y, f.a ?? 0, Math.min(TAU, f.b ?? 1.6), f.c ?? 40, colour, 0.13);
        break;
      }
      case 'telegraph_arc':
        break;
      case 'zap':
        fx.bolt(f.x, f.y, f.a ?? f.x, f.b ?? f.y);
        fx.sprite('fx_zap', f.a ?? f.x, f.b ?? f.y, { fps: 20, depth: 8000 });
        break;
      case 'strike':
        fx.bolt(f.x + (Math.random() - 0.5) * 20, f.y - 200, f.x, f.y - 4, 0xffeb57, 0.2);
        fx.bolt(f.x + (Math.random() - 0.5) * 20, f.y - 200, f.x, f.y - 4, 0x94fdff, 0.16);
        fx.sprite('fx_explosion', f.x, f.y, { fps: 20, scale: 0.8, tint: 0x94fdff, depth: 7950 });
        break;
      case 'freeze':
        fx.sprite('fx_shatter', f.x, f.y, { fps: 10, life: 0.2, depth: 8000 });
        break;
      case 'shatter':
        fx.sprite('fx_shatter', f.x, f.y, { fps: 14, depth: 8000, scale: 1.5 });
        break;
      case 'poof':
        fx.sprite('fx_poof', f.x, f.y, { fps: 16, depth: 8000 });
        break;
      case 'dash':
        fx.sprite('fx_dust', f.x, f.y + 3, { fps: 14, depth: 50 });
        break;
      case 'hurt':
        if (!reduced) fx.burst('dot2', f.x, f.y, 6, 80, { tint: 0xea323c, depth: 7990 });
        break;
      case 'sap':
        break;
      case 'coin':
        fx.sprite('fx_sparkle', f.x, f.y - 4, { fps: 18, depth: 8000, tint: 0xffc825 });
        break;
      case 'loot': {
        const r = Math.min(4, f.a ?? 0);
        fx.ring(f.x, f.y - 6, 2, 18 + r * 4, RARITY_COLOUR[r], 0.4, 2);
        for (let i = 0; i < 3 + r * 2; i++) fx.sprite('fx_sparkle', f.x + (Math.random() - 0.5) * 24, f.y - 6 - Math.random() * 20, { fps: 12, depth: 8000 });
        break;
      }
      case 'chest':
        fx.sprite('pk_chest_1', f.x, f.y - 7, { life: 1.2, depth: 1000 + f.y });
        fx.ring(f.x, f.y - 6, 4, 50, 0xffc825, 0.6, 3);
        for (let i = 0; i < 12; i++) fx.sprite('fx_sparkle', f.x + (Math.random() - 0.5) * 40, f.y - Math.random() * 40, { fps: 10, depth: 8000 });
        break;
      case 'evolve':
      case 'levelup':
        fx.sprite('fx_levelup', f.x, f.y, { fps: 12, depth: 8000, scale: f.type === 'evolve' ? 2 : 1 });
        if (f.type === 'evolve') {
          fx.ring(f.x, f.y, 6, 120, 0xffc825, 0.7, 3);
          fx.ring(f.x, f.y, 4, 80, 0xf9e6cf, 0.5, 2);
        }
        break;
      case 'erupt':
        fx.sprite('fx_burrow', f.x, f.y, { fps: 14, depth: 50, scale: Math.max(1, (f.c ?? 16) / 10) });
        if (!reduced) fx.burst('dot2', f.x, f.y, 6, 70, { tint: 0x5d2c28, depth: 7900 });
        break;
      case 'rumble':
        fx.burst('dot2', f.x, f.y, 4, 30, { tint: 0x5d2c28, depth: 60, vz: 20 });
        break;
      case 'burrow':
        fx.sprite('fx_burrow', f.x, f.y, { fps: 10, depth: 30 });
        break;
      case 'seedland':
        fx.sprite('fx_dust', f.x, f.y, { fps: 14, depth: 50, scale: 1.5 });
        break;
      case 'stun':
        fx.sprite('fx_sparkle', f.x, f.y, { fps: 8, depth: 8000 });
        break;
      case 'windup':
        break;
      case 'bulletpop':
        if (!reduced && Math.random() < 0.6) fx.sprite('fx_hit', f.x, f.y, { fps: 30, scale: 0.6, tint: 0xfdd2ed, depth: 7050 });
        break;
      case 'vines':
        fx.ring(f.x, f.y, 6, f.c ?? 50, 0x33984b, 0.5, 3);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          fx.sprite('p_briar_0', f.x + Math.cos(a) * (f.c ?? 50) * 0.6, f.y + Math.sin(a) * (f.c ?? 50) * 0.45, { life: 1.8, depth: 1000 + f.y, fade: true });
        }
        break;
      case 'reap':
        fx.arc(f.x, f.y - 6, f.a ?? 0, 1.4, 34, 0xc42430, 0.2);
        break;
      case 'bell':
        fx.ring(f.x, f.y, 6, f.c ?? 70, 0xffa214, 0.5, 2);
        break;
      case 'flare':
        fx.ring(f.x, f.y, 10, f.c ?? 70, 0xffeb57, 0.45, 3);
        fx.disc(f.x, f.y, f.c ?? 70, 0xffa214, 0.25);
        break;
      case 'echo':
        fx.ring(f.x, f.y, 2, 14, 0xdb3ffd, 0.25, 1);
        break;
      case 'execute':
        fx.number('x', f.x, f.y - 6, 0xc42430, 2, 0.6);
        break;
      case 'petalblock':
        fx.burst('dot2', f.x, f.y, 6, 60, { tint: 0xfdd2ed, depth: 8000 });
        break;
      case 'drink':
        fx.burst('dot2', f.x, f.y, 6, 30, { tint: 0x5ac54f, depth: 8000, vz: 60 });
        break;
      case 'sparkle':
        if (Math.random() < 0.3) fx.sprite('fx_sparkle', f.x, f.y, { fps: 16, depth: 8000 });
        break;
      case 'blink':
        fx.sprite('fx_poof', f.x, f.y, { fps: 14, tint: 0xca52c9, depth: 8000 });
        break;
      case 'cleanse':
        fx.ring(f.x, f.y, 6, 90, 0xd3fc7e, 0.8, 3);
        fx.sprite('fx_levelup', f.x, f.y, { fps: 10, depth: 8000, scale: 2 });
        break;
      case 'lootburst':
        fx.ring(f.x, f.y, 6, 140, 0xffc825, 1, 4);
        fx.ring(f.x, f.y, 6, 90, 0xff0040, 0.8, 2);
        break;
      case 'bossrise':
        fx.burst('dot3', f.x, f.y + 20, 30, 140, { tint: 0x5d2c28, depth: 7900, vz: 80 });
        break;
      case 'bossphase':
        fx.ring(f.x, f.y - 30, 10, 260, 0xff0040, 0.9, 4);
        break;
      case 'bossdeath':
        fx.ring(f.x, f.y - 30, 10, 300, 0xffc825, 1.4, 4);
        break;
      case 'arenashrink':
        this.setRing(f.c ?? 200);
        break;
      case 'rootsweep':
        fx.burst('dot3', f.x, f.y, 10, 60, { tint: 0x5d2c28, depth: 7900 });
        break;
      case 'root':
        fx.ring(f.x, f.y, 4, 22, 0x33984b, 0.4, 2);
        fx.burst('dot2', f.x, f.y, 6, 30, { tint: 0x5d2c28, depth: 50 });
        break;
      case 'hex':
        fx.ring(f.x, f.y, 2, 10, 0xdb3ffd, 0.35, 1);
        break;
      case 'straw':
        fx.burst('dot2', f.x, f.y, 14, 110, { tint: 0xedab50, depth: 8000 });
        fx.ring(f.x, f.y, 6, 50, 0xffc825, 0.3, 2);
        break;
      case 'moonstep':
        fx.ring(f.x, f.y, 4, f.c ?? 40, 0x94fdff, 0.4, 2);
        fx.disc(f.x, f.y, f.c ?? 40, 0xdb3ffd, 0.2);
        break;
      case 'playerdeath':
        fx.sprite('fx_poof', f.x, f.y - 6, { fps: 8, scale: 2, depth: 8000 });
        fx.burst('dot3', f.x, f.y - 6, 14, 90, { tint: 0xf9e6cf, depth: 8000 });
        this.dying = true;
        break;
    }
  }

  destroy() {
    this.fx.clear();
  }

  get playerDead() {
    return this.dying;
  }
}

function frameSizeH(key: string) {
  const k = F(key);
  return k === '__missing' ? 8 : (originOf(k), 16);
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export { col, angleTo };
