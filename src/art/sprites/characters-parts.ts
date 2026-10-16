// Shared parts for the three hero classes.
//
// Every hero frame is composed on a 14x18 canvas (16x20 after the outline):
//
//   legs(dir, pose)            shared by all classes, coloured per class
//   far arm   (side only)      behind the torso
//   torso(class, dir)          shifted down by the bob
//   near arm / arms            shifted down by the bob
//   head(class, dir)           shifted down by the bob
//   extras(class, dir, frame)  scarf tails and the like
//
// The leg poses and bob pattern live here, so the walk cycle is identical for
// every class; a class only supplies its colours, torso, arms and head.
//
// Shared leg characters: p/P/o trousers (base/light/shadow), b/B/d boots
// (base/light/dark). Skin is k/K/q (base/light/shadow), eyes e, blush c.

import { blank, overlay } from '../sprite';

export const HW = 14;
export const HH = 18;

export type Dir = 'down' | 'up' | 'side';
export type ArmPose = 'n' | 'f' | 'b'; // neutral, forward, back
export type LegPose = 'stand' | 'liftL' | 'liftR' | 'contactA' | 'passA' | 'contactB' | 'passB';

/** Place partial rows on a full hero canvas starting at row `top`. */
export function at(top: number, rows: string[]): string[] {
  return overlay(blank(HW, HH), rows.map((r) => r.padEnd(HW, '.')), 0, top);
}

// ---------------------------------------------------------------------------
// Legs. Rows 15-17 at rest; the torso hides row 15 when the body bobs down.

const LEGS: Record<Dir, Partial<Record<LegPose, string[]>>> = {
  down: {
    stand: at(14, [
      '....pppppo....',
      '....Ppoppo....',
      '...Bbb..Bbd...',
      '...bbd..bbd...',
    ]),
    // the viewer's-left boot lifts and the leg folds under the body
    liftL: at(14, [
      '....pppppo....',
      '...Bbbopoo....',
      '...bbd..Bbd...',
      '........bbd...',
    ]),
    liftR: at(14, [
      '....pppppo....',
      '....Ppo.Bbd...',
      '...Bbb..bbd...',
      '...bbd........',
    ]),
  },
  up: {
    stand: at(14, [
      '....pppppo....',
      '....Ppoppo....',
      '...dbb..dbb...',
      '...bbd..bbd...',
    ]),
    liftL: at(14, [
      '....pppppo....',
      '...dbbopoo....',
      '...bbd..dbb...',
      '........bbd...',
    ]),
    liftR: at(14, [
      '....pppppo....',
      '....Ppo.dbb...',
      '...dbb..bbd...',
      '...bbd........',
    ]),
  },
  side: {
    stand: at(14, [
      '.....ppppo....',
      '.....oPppo....',
      '.....dBbbb....',
      '.....dbbbbb...',
    ]),
    // near leg forward, far leg back, both feet down
    contactA: at(14, [
      '.....ppppo....',
      '.....oPpppo...',
      '....ddo.Bbbb..',
      '...dddd.bbbbb.',
    ]),
    // far leg swings through, lifted behind; near leg planted under the body
    passA: at(14, [
      '.....ppppo....',
      '....ooPppo....',
      '....dd.Bbbb...',
      '.......bbbbb..',
    ]),
    // far leg forward, near leg back
    contactB: at(14, [
      '.....ppppo....',
      '.....Ppppoo...',
      '....Bbb.oddd..',
      '...bbbb.ddddd.',
    ]),
    // near leg swings through, lifted; far leg planted
    passB: at(14, [
      '.....ppppo....',
      '.....oPPpp....',
      '.....oBbbbb...',
      '.....dddd.....',
    ]),
  },
};

export function legs(dir: Dir, pose: LegPose): string[] {
  const l = LEGS[dir][pose];
  if (!l) throw new Error(`no leg pose ${pose} for ${dir}`);
  return l;
}

// ---------------------------------------------------------------------------
// Animation tables. Each frame says which leg pose, arm pose and bob to use.

export interface FrameSpec {
  legs: LegPose;
  arm: ArmPose; // for down/up: 'f' means viewer's-left arm swings forward
  bob: number;
  t: number; // frame index for extras (scarf flutter etc.)
}

export const IDLE: Record<Dir, FrameSpec[]> = {
  down: [
    { legs: 'stand', arm: 'n', bob: 0, t: 0 },
    { legs: 'stand', arm: 'n', bob: 1, t: 1 },
  ],
  up: [
    { legs: 'stand', arm: 'n', bob: 0, t: 0 },
    { legs: 'stand', arm: 'n', bob: 1, t: 1 },
  ],
  side: [
    { legs: 'stand', arm: 'n', bob: 0, t: 0 },
    { legs: 'stand', arm: 'n', bob: 1, t: 1 },
  ],
};

// contact, pass, contact, pass. Body is lowest on contact, highest on pass.
export const WALK: Record<Dir, FrameSpec[]> = {
  down: [
    { legs: 'stand', arm: 'f', bob: 1, t: 0 },
    { legs: 'liftR', arm: 'n', bob: 0, t: 1 },
    { legs: 'stand', arm: 'b', bob: 1, t: 2 },
    { legs: 'liftL', arm: 'n', bob: 0, t: 3 },
  ],
  up: [
    { legs: 'stand', arm: 'f', bob: 1, t: 0 },
    { legs: 'liftR', arm: 'n', bob: 0, t: 1 },
    { legs: 'stand', arm: 'b', bob: 1, t: 2 },
    { legs: 'liftL', arm: 'n', bob: 0, t: 3 },
  ],
  side: [
    { legs: 'contactA', arm: 'b', bob: 1, t: 0 },
    { legs: 'passA', arm: 'n', bob: 0, t: 1 },
    { legs: 'contactB', arm: 'f', bob: 1, t: 2 },
    { legs: 'passB', arm: 'n', bob: 0, t: 3 },
  ],
};

// ---------------------------------------------------------------------------
// Class art and composition.

export interface HeroArt {
  /** Full-canvas torso per direction (drawn at bob). */
  torso: Record<Dir, string[]>;
  /** Arms per direction and pose, full canvas, drawn over the torso (at bob). */
  arms: Record<Dir, Record<ArmPose, string[]>>;
  /** Side view only: the far arm, drawn behind the torso. */
  farArm?: Record<ArmPose, string[]>;
  /** Full-canvas head per direction (drawn at bob). */
  head: Record<Dir, string[]>;
  /** Optional per-frame overlays (drawn last, already positioned; receive the bob). */
  extras?: (dir: Dir, f: FrameSpec, walking: boolean) => { rows: string[]; bob: boolean; front: boolean }[];
}

export function composeHero(art: HeroArt, dir: Dir, f: FrameSpec, walking: boolean): string[] {
  const extras = art.extras?.(dir, f, walking) ?? [];
  let c = blank(HW, HH);
  for (const e of extras.filter((x) => !x.front)) c = overlay(c, e.rows, 0, e.bob ? f.bob : 0);
  c = overlay(c, legs(dir, f.legs));
  if (dir === 'side' && art.farArm) c = overlay(c, art.farArm[f.arm], 0, f.bob);
  c = overlay(c, art.torso[dir], 0, f.bob);
  c = overlay(c, art.arms[dir][f.arm], 0, f.bob);
  c = overlay(c, art.head[dir], 0, f.bob);
  for (const e of extras.filter((x) => x.front)) c = overlay(c, e.rows, 0, e.bob ? f.bob : 0);
  return c;
}

// ---------------------------------------------------------------------------
// Arm helpers, so every class swings its arms the same way and rests its hands
// on the same row (13, which is y 14 after the outline).

/**
 * Down/up arms drawn as single-pixel columns. `left`/`right` list one
 * character per row starting at `top` (sleeve first, hand last). A forward
 * swing lengthens the viewer's-left arm by a pixel and shortens the right.
 */
export function armsFront(left: string, right: string, xl = 2, xr = 11, top = 11): Record<ArmPose, string[]> {
  const draw = (l: string, r: string) => {
    let c = blank(HW, HH);
    [...l].forEach((ch, i) => (c = overlay(c, [ch], xl, top + i)));
    [...r].forEach((ch, i) => (c = overlay(c, [ch], xr, top + i)));
    return c;
  };
  const longer = (s: string) => s.slice(0, -1) + s.slice(-2, -1) + s.slice(-1);
  const shorter = (s: string) => s.slice(0, -2) + s.slice(-1);
  return { n: draw(left, right), f: draw(longer(left), shorter(right)), b: draw(shorter(left), longer(right)) };
}

/**
 * Side-view near arm: three two-pixel rows (shoulder, forearm, hand) from row
 * `top`. Neutral hangs at x 6, forward reaches to x 8, back swings to x 3.
 */
export function armsSide(rows: [string, string, string], top = 11): Record<ArmPose, string[]> {
  const put = (xs: number[]) => xs.reduce((c, x, i) => overlay(c, [rows[i]], x, top + i), blank(HW, HH));
  return { n: put([6, 6, 6]), f: put([6, 7, 8]), b: put([5, 4, 3]) };
}

/** Side-view far arm, peeking out behind the body on the swing. */
export function farArmSide(sleeve: string, hand: string, top = 11): Record<ArmPose, string[]> {
  return {
    n: blank(HW, HH),
    f: overlay(overlay(blank(HW, HH), [sleeve], 9, top), [hand], 10, top + 1),
    b: overlay(overlay(blank(HW, HH), [sleeve], 3, top), [hand], 3, top + 1),
  };
}
