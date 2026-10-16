// Pooled one-shot visual effects: flipbook sprites, simple particles,
// floating numbers, and short-lived vector shapes (arcs, bolts, rings).
// Everything here is cosmetic and capped, so it can never slow the sim.

import Phaser from 'phaser';
import { ATLAS, F, frameCount } from './textures';

interface Particle {
  img: Phaser.GameObjects.Image;
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ax: number;
  ay: number;
  drag: number;
  life: number;
  age: number;
  anim: string | null;
  frames: number;
  fps: number;
  fade: boolean;
  s0: number;
  s1: number;
  spin: number;
  grav: number;
}

interface FloatText {
  txt: Phaser.GameObjects.BitmapText;
  alive: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  age: number;
  scale: number;
}

interface Shape {
  kind: 'arc' | 'bolt' | 'ring' | 'line' | 'disc' | 'flash';
  x: number;
  y: number;
  a: number;
  b: number;
  c: number;
  x2: number;
  y2: number;
  life: number;
  age: number;
  colour: number;
  colour2: number;
  pts?: number[];
  width: number;
}

export interface EmitOpts {
  vx?: number;
  vy?: number;
  vz?: number;
  z?: number;
  life?: number;
  fps?: number;
  scale?: number;
  scaleTo?: number;
  tint?: number;
  alpha?: number;
  depth?: number;
  fade?: boolean;
  spin?: number;
  rot?: number;
  drag?: number;
  grav?: number;
  add?: boolean;
  flipX?: boolean;
}

export class FxLayer {
  private parts: Particle[] = [];
  private texts: FloatText[] = [];
  private shapes: Shape[] = [];
  private gfx: Phaser.GameObjects.Graphics;
  reduced = false;
  maxParticles = 700;

  constructor(private scene: Phaser.Scene, depth = 8000) {
    this.gfx = scene.add.graphics().setDepth(depth + 1);
  }

  /** Play a flipbook sprite once (or a static frame for `life` seconds). */
  sprite(key: string, x: number, y: number, o: EmitOpts = {}): Particle | null {
    const n = frameCount(key);
    const anim = n > 1 ? key : null;
    const fps = o.fps ?? 14;
    const life = o.life ?? (anim ? n / fps : 0.4);
    return this.spawn(anim ? `${key}_0` : key, x, y, { ...o, life }, anim, n, fps);
  }

  private spawn(frame: string, x: number, y: number, o: EmitOpts, anim: string | null, frames: number, fps: number): Particle | null {
    let p = this.parts.find((q) => !q.alive);
    if (!p) {
      if (this.parts.length >= this.maxParticles) return null;
      const img = this.scene.add.image(0, 0, ATLAS, F(frame));
      p = { img, alive: false } as Particle;
      this.parts.push(p);
    }
    p.alive = true;
    p.x = x;
    p.y = y;
    p.z = o.z ?? 0;
    p.vx = o.vx ?? 0;
    p.vy = o.vy ?? 0;
    p.vz = o.vz ?? 0;
    p.ax = 0;
    p.ay = 0;
    p.drag = o.drag ?? 0;
    p.grav = o.grav ?? 0;
    p.life = o.life ?? 0.4;
    p.age = 0;
    p.anim = anim;
    p.frames = frames;
    p.fps = fps;
    p.fade = o.fade ?? !anim;
    p.s0 = o.scale ?? 1;
    p.s1 = o.scaleTo ?? p.s0;
    p.spin = o.spin ?? 0;
    const img = p.img;
    img.setFrame(F(frame));
    img.setVisible(true).setAlpha(o.alpha ?? 1).setScale(p.s0).setRotation(o.rot ?? 0).setDepth(o.depth ?? 8000);
    img.setFlipX(!!o.flipX);
    img.setOrigin(0.5, 0.5);
    if (o.tint !== undefined) img.setTint(o.tint);
    else img.clearTint();
    img.setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    img.setPosition(Math.round(x), Math.round(y - p.z));
    return p;
  }

  /** A burst of small dots/frames flying outwards. */
  burst(frame: string, x: number, y: number, n: number, speed: number, o: EmitOpts = {}) {
    if (this.reduced) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.spawn(frame, x, y, { life: 0.35 + Math.random() * 0.25, drag: 4, ...o, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, vz: o.vz ?? 30 + Math.random() * 40, grav: o.grav ?? 160 }, null, 1, 0);
    }
  }

  number(text: string, x: number, y: number, colour: number, scale = 1, life = 0.7) {
    let t = this.texts.find((q) => !q.alive);
    if (!t) {
      if (this.texts.length > 120) {
        t = this.texts.reduce((a, b) => (a.age > b.age ? a : b));
      } else {
        const txt = this.scene.add.bitmapText(0, 0, 'font_num', '', 8).setOrigin(0.5, 1).setDepth(9000);
        t = { txt, alive: false } as FloatText;
        this.texts.push(t);
      }
    }
    t.alive = true;
    t.x = x + (Math.random() - 0.5) * 6;
    t.y = y;
    t.vy = -38 - scale * 10;
    t.life = life;
    t.age = 0;
    t.scale = scale;
    t.txt.setText(text).setTint(colour).setVisible(true).setAlpha(1).setScale(scale);
  }

  arc(x: number, y: number, angle: number, arc: number, radius: number, colour: number, life = 0.14, inner = 0.45) {
    this.shapes.push({ kind: 'arc', x, y, a: angle, b: arc, c: radius, x2: inner, y2: 0, life, age: 0, colour, colour2: 0, width: 0 });
  }

  bolt(x1: number, y1: number, x2: number, y2: number, colour = 0x94fdff, life = 0.12) {
    const pts: number[] = [x1, y1];
    const segs = Math.max(3, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 10));
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push(x1 + (x2 - x1) * t + (Math.random() - 0.5) * 8, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 8);
    }
    pts.push(x2, y2);
    this.shapes.push({ kind: 'bolt', x: x1, y: y1, a: 0, b: 0, c: 0, x2, y2, life, age: 0, colour, colour2: 0xffffff, pts, width: 2 });
  }

  ring(x: number, y: number, r0: number, r1: number, colour: number, life = 0.35, width = 2) {
    this.shapes.push({ kind: 'ring', x, y, a: r0, b: r1, c: 0, x2: 0, y2: 0, life, age: 0, colour, colour2: 0, width });
  }

  disc(x: number, y: number, r: number, colour: number, life = 0.2) {
    this.shapes.push({ kind: 'disc', x, y, a: r, b: 0, c: 0, x2: 0, y2: 0, life, age: 0, colour, colour2: 0, width: 0 });
  }

  update(dt: number) {
    for (const p of this.parts) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        p.img.setVisible(false);
        continue;
      }
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.grav) {
        p.vz -= p.grav * dt;
        p.z = Math.max(0, p.z + p.vz * dt);
      }
      const t = p.age / p.life;
      if (p.anim) p.img.setFrame(F(`${p.anim}_${Math.min(p.frames - 1, Math.floor(p.age * p.fps))}`));
      if (p.fade) p.img.setAlpha(1 - t * t);
      if (p.s0 !== p.s1) p.img.setScale(p.s0 + (p.s1 - p.s0) * t);
      if (p.spin) p.img.rotation += p.spin * dt;
      p.img.setPosition(Math.round(p.x), Math.round(p.y - p.z));
    }
    for (const t of this.texts) {
      if (!t.alive) continue;
      t.age += dt;
      if (t.age >= t.life) {
        t.alive = false;
        t.txt.setVisible(false);
        continue;
      }
      t.vy *= Math.exp(-5 * dt);
      t.y += t.vy * dt;
      const k = t.age / t.life;
      // Pop in, then hold, then fade.
      const pop = k < 0.12 ? 1 + (1 - k / 0.12) * 0.6 : 1;
      t.txt.setScale(Math.max(1, Math.round(t.scale * pop)));
      t.txt.setAlpha(k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
      t.txt.setPosition(Math.round(t.x), Math.round(t.y));
    }
    const g = this.gfx;
    g.clear();
    this.shapes = this.shapes.filter((s) => (s.age += dt) < s.life);
    for (const s of this.shapes) {
      const k = s.age / s.life;
      const alpha = 1 - k;
      switch (s.kind) {
        case 'arc': {
          const r = s.c * (0.85 + 0.15 * Math.min(1, k * 3));
          g.fillStyle(s.colour, 0.55 * alpha);
          g.beginPath();
          const a0 = s.a - s.b / 2;
          const a1 = s.a + s.b / 2;
          const steps = Math.max(6, Math.ceil(s.b * 8));
          for (let i = 0; i <= steps; i++) {
            const a = a0 + ((a1 - a0) * i) / steps;
            const px = s.x + Math.cos(a) * r;
            const py = s.y + Math.sin(a) * r;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          for (let i = steps; i >= 0; i--) {
            const a = a0 + ((a1 - a0) * i) / steps;
            g.lineTo(s.x + Math.cos(a) * r * s.x2, s.y + Math.sin(a) * r * s.x2);
          }
          g.closePath();
          g.fillPath();
          g.lineStyle(1, 0xffffff, 0.8 * alpha);
          g.beginPath();
          for (let i = 0; i <= steps; i++) {
            const a = a0 + ((a1 - a0) * i) / steps;
            const px = s.x + Math.cos(a) * r;
            const py = s.y + Math.sin(a) * r;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.strokePath();
          break;
        }
        case 'bolt': {
          const pts = s.pts!;
          for (const [w, c, a] of [
            [3, s.colour, 0.5],
            [1, 0xffffff, 1],
          ] as const) {
            g.lineStyle(w, c, a * alpha);
            g.beginPath();
            g.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
            g.strokePath();
          }
          break;
        }
        case 'ring': {
          const r = s.a + (s.b - s.a) * (1 - (1 - k) * (1 - k));
          g.lineStyle(s.width, s.colour, alpha);
          g.strokeCircle(s.x, s.y, r);
          break;
        }
        case 'disc':
          g.fillStyle(s.colour, 0.35 * alpha);
          g.fillCircle(s.x, s.y, s.a * (0.6 + 0.4 * k));
          break;
      }
    }
  }

  clear() {
    for (const p of this.parts) {
      p.alive = false;
      p.img.setVisible(false);
    }
    for (const t of this.texts) {
      t.alive = false;
      t.txt.setVisible(false);
    }
    this.shapes = [];
    this.gfx.clear();
  }
}
