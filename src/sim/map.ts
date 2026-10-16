// Expedition arena layout, generated from the run seed. Obstacles are
// circles (walls are rows of circles), which keeps collision cheap and
// predictable. The centre is kept clear for the boss's royal patch.

import { Rng } from '../core/rng';
import { dist2 } from '../core/math';

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  /** Tall things stop shots, both ways. */
  blocks: boolean;
  sprite: string;
  frame?: number;
  /** Only the first circle of a multi-circle prop draws its sprite. */
  draw: boolean;
  flip?: boolean;
}

export interface Decor {
  x: number;
  y: number;
  sprite: string;
  flip: boolean;
  /** Lying on the ground (drawn under entities). */
  flat: boolean;
  rot?: number;
}

export interface Patch {
  x: number;
  y: number;
  r: number;
}

export interface ArenaMap {
  w: number;
  h: number;
  margin: number;
  obstacles: Obstacle[];
  decor: Decor[];
  corrupt: Patch[];
  stones: Patch[];
  centre: { x: number; y: number };
  start: { x: number; y: number };
  ground: string;
}

export const BOSS_ARENA_RADIUS = 250;

export function generateMeadow(seed: number, w = 1536, h = 1024): ArenaMap {
  const rng = new Rng(seed ^ 0x51ed);
  const margin = 28;
  const centre = { x: w / 2, y: h / 2 };
  const start = { x: w / 2, y: h / 2 + 60 };
  const obstacles: Obstacle[] = [];
  const decor: Decor[] = [];
  const corrupt: Patch[] = [];
  const stones: Patch[] = [];

  const clearOf = (x: number, y: number, r: number) => {
    if (x < margin + 40 || y < margin + 40 || x > w - margin - 40 || y > h - margin - 40) return false;
    if (dist2(x, y, centre.x, centre.y) < (BOSS_ARENA_RADIUS + 40) ** 2) return false;
    for (const o of obstacles) if (dist2(x, y, o.x, o.y) < (o.r + r + 34) ** 2) return false;
    return true;
  };

  const place = (r: number, tries = 60): [number, number] | null => {
    for (let i = 0; i < tries; i++) {
      const x = rng.range(margin, w - margin);
      const y = rng.range(margin, h - margin);
      if (clearOf(x, y, r)) return [x, y];
    }
    return null;
  };

  // Dry-stone wall runs, each with a break.
  for (let i = 0; i < 9; i++) {
    const horiz = rng.chance(0.6);
    const len = rng.int(3, 7);
    const span = len * 16;
    const at = place(span / 2);
    if (!at) continue;
    const [cx, cy] = at;
    const broken = rng.int(0, len - 1);
    for (let k = 0; k < len; k++) {
      const x = horiz ? cx - span / 2 + k * 16 + 8 : cx;
      const y = horiz ? cy : cy - span / 2 + k * 14 + 7;
      const isBroken = k === broken;
      obstacles.push({ x, y, r: isBroken ? 6 : 8, blocks: !isBroken, sprite: isBroken ? 'd_wall_broken' : 'd_wall_h', draw: true });
    }
  }

  const props: [string, number, boolean, number][] = [
    ['d_pillar', 8, true, 5],
    ['d_tree_dead', 7, true, 7],
    ['d_rock_l', 11, true, 6],
    ['d_well', 11, true, 1],
    ['d_cart_broken', 12, false, 2],
    ['d_stump', 7, false, 6],
    ['d_rock_s', 5, false, 8],
  ];
  for (const [sprite, r, blocks, n] of props) {
    for (let i = 0; i < n; i++) {
      const at = place(r);
      if (!at) continue;
      obstacles.push({ x: at[0], y: at[1], r, blocks, sprite, draw: true, flip: rng.chance(0.5) });
    }
  }

  // Corrupted soil: more of it towards the centre, where the king sleeps.
  for (let i = 0; i < 11; i++) {
    const towardsCentre = rng.chance(0.4);
    const x = towardsCentre ? centre.x + rng.range(-420, 420) : rng.range(margin + 60, w - margin - 60);
    const y = towardsCentre ? centre.y + rng.range(-300, 300) : rng.range(margin + 60, h - margin - 60);
    // Each patch is a cluster of overlapping blobs, so the edges wander.
    const r = rng.range(30, 66);
    corrupt.push({ x, y, r });
    for (let k = 0; k < 3; k++) {
      const a = rng.angle();
      corrupt.push({ x: x + Math.cos(a) * r * 0.7, y: y + Math.sin(a) * r * 0.55, r: r * rng.range(0.45, 0.7) });
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = rng.range(100, w - 100);
    const y = rng.range(100, h - 100);
    const r = rng.range(28, 52);
    stones.push({ x, y, r });
    for (let k = 0; k < 2; k++) {
      const a = rng.angle();
      stones.push({ x: x + Math.cos(a) * r * 0.8, y: y + Math.sin(a) * r * 0.6, r: r * rng.range(0.5, 0.8) });
    }
  }

  // Scatter. Flowers and tufts are flat decoration that never blocks.
  const scatter = (sprite: string, n: number, flat: boolean, avoidCorrupt = false) => {
    for (let i = 0; i < n; i++) {
      const x = rng.range(margin, w - margin);
      const y = rng.range(margin, h - margin);
      if (avoidCorrupt && corrupt.some((p) => dist2(x, y, p.x, p.y) < p.r * p.r)) continue;
      if (obstacles.some((o) => dist2(x, y, o.x, o.y) < (o.r + 6) ** 2)) continue;
      decor.push({ x, y, sprite, flip: rng.chance(0.5), flat });
    }
  };
  scatter('d_tuft_0', 70, true);
  scatter('d_tuft_1', 55, true);
  scatter('d_tuft_2', 40, true);
  scatter('d_flower_0', 18, true, true);
  scatter('d_flower_1', 18, true, true);
  scatter('d_flower_2', 14, true, true);
  scatter('d_flower_3', 14, true, true);
  scatter('d_blightflower_0', 26, true);
  scatter('d_blightflower_1', 26, true);
  scatter('d_mushrooms', 26, true);
  scatter('d_bones', 14, true);
  // Abandoned tools, rusting where they fell.
  const tools = ['cf_152', 'cf_162', 'cf_132', 'cf_142', 'cf_82', 'cf_122'];
  for (let i = 0; i < 12; i++) {
    const at = place(4, 20);
    if (!at) continue;
    decor.push({ x: at[0], y: at[1], sprite: rng.pick(tools), flip: rng.chance(0.5), flat: true, rot: rng.range(-1.2, 1.2) });
  }

  decor.sort((a, b) => a.y - b.y);
  return { w, h, margin, obstacles, decor, corrupt, stones, centre, start, ground: 't_meadow' };
}
