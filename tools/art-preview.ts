// Bakes every sprite definition and writes labelled contact sheets to
// .art-preview/<group>.png so art can be reviewed without running the game.
//
//   npm run art                 all groups
//   npm run art -- crops enemies  just those groups
//   npm run art -- --scale 6     bigger pixels
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePng, decodePng } from './png';
import { bakeDef, BakedFrame, SpriteDef } from '../src/art/sprite';

const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '6': '011100110101010', '7': '111001010010010', '8': '010101010101010', '9': '010101011001110',
  _: '000000000000111', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000',
};

class Canvas {
  data: Uint8ClampedArray;
  constructor(public w: number, public h: number, bg: [number, number, number]) {
    this.data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      this.data[i * 4] = bg[0];
      this.data[i * 4 + 1] = bg[1];
      this.data[i * 4 + 2] = bg[2];
      this.data[i * 4 + 3] = 255;
    }
  }
  rect(x: number, y: number, w: number, h: number, c: [number, number, number]) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.w || yy >= this.h) continue;
        const i = (yy * this.w + xx) * 4;
        this.data[i] = c[0];
        this.data[i + 1] = c[1];
        this.data[i + 2] = c[2];
      }
  }
  blit(f: { w: number; h: number; data: Uint8ClampedArray }, x: number, y: number, s: number) {
    for (let fy = 0; fy < f.h; fy++)
      for (let fx = 0; fx < f.w; fx++) {
        const si = (fy * f.w + fx) * 4;
        const a = f.data[si + 3] / 255;
        if (a === 0) continue;
        for (let dy = 0; dy < s; dy++)
          for (let dx = 0; dx < s; dx++) {
            const X = x + fx * s + dx;
            const Y = y + fy * s + dy;
            if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
            const di = (Y * this.w + X) * 4;
            for (let k = 0; k < 3; k++) this.data[di + k] = f.data[si + k] * a + this.data[di + k] * (1 - a);
          }
      }
  }
  text(s: string, x: number, y: number, c: [number, number, number], scale = 1) {
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch];
      if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') this.rect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, c);
      cx += 4 * scale;
    }
  }
}

const args = process.argv.slice(2);
let scale = 4;
const si = args.indexOf('--scale');
if (si >= 0) {
  scale = Number(args[si + 1]);
  args.splice(si, 2);
}
const GROUPS = ['characters', 'creatures', 'crops', 'world', 'combat', 'ui'];
const wanted = args.filter((a) => a !== 'icons').length ? args.filter((a) => a !== 'icons') : GROUPS;
const out = join(process.cwd(), '.art-preview');
mkdirSync(out, { recursive: true });

const BG: [number, number, number] = [74, 86, 64];
const BG2: [number, number, number] = [96, 112, 82];

for (const group of wanted) {
  if (!GROUPS.includes(group)) {
    console.error(`unknown group ${group}; have ${GROUPS.join(', ')}`);
    continue;
  }
  // Each group is imported on its own so a broken file only breaks its own sheet.
  let defs: SpriteDef[];
  try {
    defs = (await import(`../src/art/sprites/${group}.ts`)).SPRITES;
  } catch (e) {
    console.error(`group ${group} failed to load:`, e);
    process.exitCode = 1;
    continue;
  }
  const rows: { label: string; frames: BakedFrame[] }[] = [];
  for (const d of defs) {
    try {
      rows.push({ label: d.name, frames: bakeDef(d) });
    } catch (e) {
      console.error(String(e));
      process.exitCode = 1;
    }
  }
  if (rows.length === 0) {
    console.log(`group ${group}: no sprites yet`);
    continue;
  }
  const labelW = 4 * 26 + 8;
  const maxW = Number(process.env.ART_WIDTH ?? 1600);
  type Placed = { label: string; frames: BakedFrame[]; x: number; y: number; h: number; w: number };
  const placed: Placed[] = [];
  let x = 4;
  let y = 4;
  let lineH = 0;
  for (const r of rows) {
    const fw = r.frames.reduce((s, f) => s + f.w * scale + 6, 0);
    const w = Math.max(labelW, fw) + 10;
    const h = Math.max(...r.frames.map((f) => f.h)) * scale + 16;
    if (x + w > maxW) {
      x = 4;
      y += lineH + 6;
      lineH = 0;
    }
    placed.push({ ...r, x, y, w, h });
    x += w;
    lineH = Math.max(lineH, h);
  }
  const W = Math.min(maxW, Math.max(...placed.map((p) => p.x + p.w)) + 4);
  const H = y + lineH + 8;
  const c = new Canvas(W, H, [40, 36, 44]);
  for (const p of placed) {
    c.rect(p.x, p.y, p.w - 6, p.h, BG);
    c.text(p.label, p.x + 3, p.y + 3, [255, 236, 140]);
    let fx = p.x + 3;
    for (const f of p.frames) {
      c.rect(fx, p.y + 12, f.w * scale, f.h * scale, BG2);
      c.blit(f, fx, p.y + 12, scale);
      fx += f.w * scale + 6;
    }
  }
  writeFileSync(join(out, `${group}.png`), encodePng(W, H, c.data));
  console.log(`wrote .art-preview/${group}.png (${rows.length} sprites)`);
}

// The pack sheet, indexed, for reference while choosing icons.
if (args.length === 0 || args.includes('icons')) {
  // eslint-disable-next-line no-lone-blocks
  const pack = decodePng(readFileSync(join(process.cwd(), 'public/assets/cf-icons-16.png')));
  const s = 4;
  const cols = 10;
  const cell = 16 * s + 8;
  const c = new Canvas(cols * cell, 19 * (cell + 8), [40, 36, 44]);
  for (let i = 0; i < 190; i++) {
    const cx = (i % cols) * cell;
    const cy = Math.floor(i / cols) * (cell + 8);
    const tile = new Uint8ClampedArray(16 * 16 * 4);
    for (let yy = 0; yy < 16; yy++)
      for (let xx = 0; xx < 16; xx++) {
        const sx = (i % 10) * 16 + xx;
        const sy = Math.floor(i / 10) * 16 + yy;
        tile.set(pack.data.subarray((sy * pack.w + sx) * 4, (sy * pack.w + sx) * 4 + 4), (yy * 16 + xx) * 4);
      }
    c.rect(cx + 2, cy + 10, 16 * s, 16 * s, BG);
    c.blit({ w: 16, h: 16, data: tile }, cx + 2, cy + 10, s);
    c.text(String(i + 1), cx + 2, cy + 2, [255, 236, 140]);
  }
  writeFileSync(join(out, `icons.png`), encodePng(c.w, c.h, c.data));
}
