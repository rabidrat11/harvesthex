// Bakes every sprite definition plus the Cute Fantasy icons into a single
// atlas texture (one texture = one batch), registers animations and the
// bitmap fonts, and serves data URLs of any frame to the DOM interface.

import Phaser from 'phaser';
import { ALL_SPRITES } from '../art/registry';
import { bakeDef, type BakedFrame } from '../art/sprite';
import { NUM_FONT, SMALL_FONT, bakeFont, type BakedFont } from '../art/font';

export const ATLAS = 'atlas';

interface Packed {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
}

const baked = new Map<string, BakedFrame>();
const packed = new Map<string, Packed>();
const missingWarned = new Set<string>();
let atlasCanvas: HTMLCanvasElement | null = null;
const dataUrls = new Map<string, string>();

export function hasFrame(key: string): boolean {
  return packed.has(key);
}

/** Frame key to draw; falls back to a visible placeholder in development. */
export function F(key: string): string {
  if (packed.has(key)) return key;
  if (!missingWarned.has(key)) {
    missingWarned.add(key);
    if (import.meta.env?.DEV) console.warn(`[art] missing frame "${key}"`);
  }
  return '__missing';
}

export function originOf(key: string): [number, number] {
  const p = packed.get(key);
  return p ? [p.ox, p.oy] : [0.5, 0.5];
}

export function frameSize(key: string): { w: number; h: number } {
  const p = packed.get(key) ?? packed.get('__missing')!;
  return { w: p.w, h: p.h };
}

export function frameCount(name: string): number {
  if (packed.has(name)) return 1;
  let n = 0;
  while (packed.has(`${name}_${n}`)) n++;
  return n;
}

export function missingFrames(): string[] {
  return [...missingWarned];
}

/** Shelf-pack frames into one canvas. */
function pack(frames: { key: string; w: number; h: number }[], maxW = 2048) {
  const sorted = [...frames].sort((a, b) => b.h - a.h);
  let x = 1;
  let y = 1;
  let rowH = 0;
  const pos = new Map<string, { x: number; y: number }>();
  for (const f of sorted) {
    if (x + f.w + 1 > maxW) {
      x = 1;
      y += rowH + 1;
      rowH = 0;
    }
    pos.set(f.key, { x, y });
    x += f.w + 1;
    rowH = Math.max(rowH, f.h);
  }
  return { pos, height: y + rowH + 1 };
}

export function buildTextures(scene: Phaser.Scene) {
  const tm = scene.textures;
  if (tm.exists(ATLAS)) return;

  // 1. Bake our sprites.
  const frames: BakedFrame[] = [];
  for (const def of ALL_SPRITES) {
    if (def.name.startsWith('preview_')) continue;
    try {
      for (const f of bakeDef(def)) frames.push(f);
    } catch (e) {
      console.error('[art] failed to bake', def.name, e);
    }
  }
  // 2. Pack icons from the Cute Fantasy sheet. The sheet is licensed and is not
  // in the public repository; without it, icons fall back to a plain marker.
  if (tm.exists('cf-icons')) {
    const packImg = tm.get('cf-icons').getSourceImage() as HTMLImageElement;
    const pc = document.createElement('canvas');
    pc.width = packImg.width;
    pc.height = packImg.height;
    const pctx = pc.getContext('2d', { willReadFrequently: true })!;
    pctx.drawImage(packImg, 0, 0);
    for (let i = 0; i < 190; i++) {
      const sx = (i % 10) * 16;
      const sy = Math.floor(i / 10) * 16;
      const id = pctx.getImageData(sx, sy, 16, 16);
      frames.push({ key: `cf_${i + 1}`, w: 16, h: 16, data: id.data, originX: 0.5, originY: 0.5 });
    }
  } else {
    console.warn('[art] public/assets/cf-icons-16.png not found: item icons will show as markers. See README.');
    const marker = makeIconMarker();
    for (let i = 0; i < 190; i++) frames.push({ ...marker, key: `cf_${i + 1}` });
  }
  // 3. Utility frames.
  frames.push(makeMissing());
  frames.push(makeShadow('shadow', 12, 5));
  frames.push(makeShadow('shadow_l', 22, 8));
  frames.push(makeShadow('shadow_xl', 56, 16));
  frames.push(makeDot('px', 1, [255, 255, 255]));
  frames.push(makeDot('dot2', 2, [255, 255, 255]));
  frames.push(makeDot('dot3', 3, [255, 255, 255]));
  frames.push(makeSoftCircle('soft', 16));

  for (const f of frames) baked.set(f.key, f);
  const { pos, height } = pack(frames.map((f) => ({ key: f.key, w: f.w, h: f.h })));
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = Math.max(64, height);
  const ctx = canvas.getContext('2d')!;
  for (const f of frames) {
    const p = pos.get(f.key)!;
    const id = new ImageData(new Uint8ClampedArray(f.data), f.w, f.h);
    ctx.putImageData(id, p.x, p.y);
    packed.set(f.key, { key: f.key, x: p.x, y: p.y, w: f.w, h: f.h, ox: f.originX, oy: f.originY });
  }
  atlasCanvas = canvas;
  const tex = tm.addCanvas(ATLAS, canvas)!;
  for (const p of packed.values()) tex.add(p.key, 0, p.x, p.y, p.w, p.h);
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

  // 4. Animations for every multi-frame sprite.
  for (const def of ALL_SPRITES) {
    if (def.frames.length < 2 || def.name.startsWith('preview_')) continue;
    if (scene.anims.exists(def.name)) continue;
    scene.anims.create({
      key: def.name,
      frames: def.frames.map((_, i) => ({ key: ATLAS, frame: `${def.name}_${i}` })),
      frameRate: def.fps ?? 8,
      repeat: -1,
    });
  }

  // 5. Bitmap fonts.
  for (const f of [NUM_FONT, SMALL_FONT]) registerFont(scene, bakeFont(f));
}

function registerFont(scene: Phaser.Scene, bf: BakedFont) {
  const c = document.createElement('canvas');
  c.width = bf.w;
  c.height = bf.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(bf.data), bf.w, bf.h), 0, 0);
  const tex = scene.textures.addCanvas(bf.key, c)!;
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const chars: Record<number, unknown> = {};
  for (const ch of bf.chars) {
    chars[ch.code] = {
      x: ch.x,
      y: ch.y,
      width: ch.w,
      height: ch.h,
      centerX: Math.floor(ch.w / 2),
      centerY: Math.floor(ch.h / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: ch.advance,
      data: {},
      kerning: {},
      u0: ch.x / bf.w,
      v0: 1 - ch.y / bf.h,
      u1: (ch.x + ch.w) / bf.w,
      v1: 1 - (ch.y + ch.h) / bf.h,
    };
    tex.add(String.fromCharCode(ch.code), 0, ch.x, ch.y, ch.w, ch.h);
  }
  scene.cache.bitmapFont.add(bf.key, {
    data: { font: bf.key, size: bf.lineHeight, lineHeight: bf.lineHeight, retroFont: false, chars },
    texture: bf.key,
    frame: null,
  });
}

/** A neutral stand-in for a pack icon: a small wooden token. */
function makeIconMarker(): BakedFrame {
  const w = 16;
  const data = new Uint8ClampedArray(w * w * 4);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 6.5) continue;
      const i = (y * w + x) * 4;
      const edge = d > 5.5;
      data[i] = edge ? 0 : 138;
      data[i + 1] = edge ? 0 : 72;
      data[i + 2] = edge ? 0 : 54;
      data[i + 3] = 255;
    }
  return { key: 'cf_marker', w, h: w, data, originX: 0.5, originY: 0.5 };
}

function makeMissing(): BakedFrame {
  const w = 8;
  const data = new Uint8ClampedArray(w * w * 4);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const on = x === y || x === w - 1 - y || x === 0 || y === 0 || x === w - 1 || y === w - 1;
      data[i] = on ? 255 : 40;
      data[i + 1] = 0;
      data[i + 2] = on ? 200 : 40;
      data[i + 3] = 255;
    }
  return { key: '__missing', w, h: w, data, originX: 0.5, originY: 1 };
}

function makeShadow(key: string, w: number, h: number): BakedFrame {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - w / 2) / (w / 2);
      const dy = (y + 0.5 - h / 2) / (h / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const i = (y * w + x) * 4;
      data[i] = 20;
      data[i + 1] = 12;
      data[i + 2] = 20;
      data[i + 3] = d < 0.55 ? 110 : 70;
    }
  return { key, w, h, data, originX: 0.5, originY: 0.5 };
}

function makeDot(key: string, s: number, c: [number, number, number]): BakedFrame {
  const data = new Uint8ClampedArray(s * s * 4);
  for (let i = 0; i < s * s; i++) {
    data[i * 4] = c[0];
    data[i * 4 + 1] = c[1];
    data[i * 4 + 2] = c[2];
    data[i * 4 + 3] = 255;
  }
  return { key, w: s, h: s, data, originX: 0.5, originY: 0.5 };
}

function makeSoftCircle(key: string, s: number): BakedFrame {
  const data = new Uint8ClampedArray(s * s * 4);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = (x + 0.5 - s / 2) / (s / 2);
      const dy = (y + 0.5 - s / 2) / (s / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const i = (y * s + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      // Stepped falloff keeps it pixel-art rather than a smooth gradient.
      data[i + 3] = d < 0.5 ? 255 : d < 0.75 ? 150 : 70;
    }
  return { key, w: s, h: s, data, originX: 0.5, originY: 0.5 };
}

/** PNG data URL of a frame at 1x, for <img> and CSS in the DOM interface. */
export function frameUrl(key: string): string {
  const hit = dataUrls.get(key);
  if (hit) return hit;
  const f = baked.get(key) ?? baked.get('__missing');
  if (!f) return '';
  const c = document.createElement('canvas');
  c.width = f.w;
  c.height = f.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.w, f.h), 0, 0);
  const url = c.toDataURL('image/png');
  dataUrls.set(key, url);
  return url;
}

export function atlasReady() {
  return atlasCanvas !== null;
}

const canvases = new Map<string, HTMLCanvasElement>();

/** A canvas holding one frame, for composing larger images (ground, previews). */
export function frameCanvas(key: string): HTMLCanvasElement | null {
  const hit = canvases.get(key);
  if (hit) return hit;
  const f = baked.get(key);
  if (!f) return null;
  const c = document.createElement('canvas');
  c.width = f.w;
  c.height = f.h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.w, f.h), 0, 0);
  canvases.set(key, c);
  return c;
}

export function bakedFrame(key: string): BakedFrame | undefined {
  return baked.get(key);
}

let genCounter = 0;

/** Add a generated canvas texture under a fresh key, freed when the scene shuts down. */
export function addSceneCanvas(scene: Phaser.Scene, base: string, canvas: HTMLCanvasElement): string {
  const key = `${base}_${++genCounter}`;
  scene.textures.addCanvas(key, canvas);
  scene.events.once('shutdown', () => {
    // Remove after this frame so nothing still holding it renders a dead texture.
    setTimeout(() => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
    }, 0);
  });
  return key;
}
