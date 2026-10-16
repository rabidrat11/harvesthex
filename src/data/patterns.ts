// Enemy projectile patterns, as data. Every hostile attack in the game is a
// list of timed pattern steps; sim/patterns.ts turns them into bullets,
// emitters and telegraphed hazards. Designed for readable dodges: rings have
// gaps, walls have openings, eruptions are telegraphed.

export interface BulletSpec {
  sprite: string;
  radius: number;
  damage: number;
  speed: number;
  accel?: number;
  maxSpeed?: number;
  minSpeed?: number;
  /** Curving bullets: radians per second. */
  angVel?: number;
  life?: number;
  /** Bullet waits this long before moving (delayed detonation feel). */
  delay?: number;
  /** Turn rate towards the player, radians per second. */
  homing?: number;
  homingTime?: number;
}

export type Pattern =
  | { kind: 'ring'; bullet: BulletSpec; count: number; gaps?: number; gapSize?: number; offset?: number; spinOffset?: number }
  | { kind: 'spread'; bullet: BulletSpec; count: number; arc: number }
  | { kind: 'burst'; bullet: BulletSpec; count: number; interval: number; spread?: number }
  | { kind: 'spiral'; bullet: BulletSpec; arms: number; rate: number; spin: number; duration: number }
  | { kind: 'fan'; bullet: BulletSpec; count: number; arc: number; interval: number }
  | { kind: 'wall'; bullet: BulletSpec; count: number; spacing: number; gap: number; back?: number }
  | { kind: 'lanes'; bullet: BulletSpec; lanes: number; perLane: number; laneWidth: number; safeEvery: number; interval: number; rows: number }
  | { kind: 'homing'; bullet: BulletSpec; count: number; arc: number }
  | { kind: 'delayed'; bullet: BulletSpec; count: number; radius: number }
  | { kind: 'zones'; count: number; radius: number; warn: number; damage: number; scatter: number; onPlayer?: boolean; visual: string; burst?: BulletSpec; burstCount?: number }
  | { kind: 'summon'; enemy: string; count: number; radius: number }
  | { kind: 'crownfall'; count: number; scatter: number; warn: number; damage: number; radius: number; burst: BulletSpec; burstCount: number; fuse: number }
  | { kind: 'sweep'; bullet: BulletSpec; count: number; spacing: number; gap: number; from: 'left' | 'right' | 'top' | 'bottom' | 'random' };

export interface AttackStep {
  at: number;
  pattern: Pattern;
  /** How the step is aimed: at the player, a fixed angle, or relative to the previous step. */
  aim?: 'player' | 'down' | 'random' | 'keep';
  angleOffset?: number;
}

export interface AttackDef {
  id: string;
  /** Telegraph time before the first step: the enemy flashes and freezes. */
  windup: number;
  steps: AttackStep[];
  /** Time after the attack begins before the enemy may attack again. */
  cooldown: number;
  /** Only used when the target is within this range. */
  range?: number;
  /** Shown above bosses as the attack begins. */
  name?: string;
}

// --- bullet presets --------------------------------------------------------

const POLLEN: BulletSpec = { sprite: 'eb_pollen', radius: 3, damage: 7, speed: 95, accel: -45, minSpeed: 38, life: 5 };
const HUSK_ORB: BulletSpec = { sprite: 'eb_orb_violet', radius: 3.5, damage: 9, speed: 52, life: 7 };
const HUSK_SMALL: BulletSpec = { sprite: 'eb_small_pink', radius: 2.5, damage: 7, speed: 62, life: 6 };
const THORN: BulletSpec = { sprite: 'eb_thorn', radius: 2.5, damage: 8, speed: 80, life: 5 };
const WRAITH: BulletSpec = { sprite: 'eb_orb_cyan', radius: 3.5, damage: 10, speed: 18, accel: 55, maxSpeed: 105, life: 7 };
const KNIGHT_THORN: BulletSpec = { sprite: 'eb_thorn', radius: 3, damage: 12, speed: 72, life: 7 };
const SPORE: BulletSpec = { sprite: 'eb_spore', radius: 3, damage: 7, speed: 48, accel: -14, minSpeed: 22, life: 6 };
const MUD: BulletSpec = { sprite: 'eb_mud', radius: 3, damage: 9, speed: 90, life: 4 };
const DECREE: BulletSpec = { sprite: 'eb_orb_gold', radius: 3.5, damage: 13, speed: 64, life: 9 };
const DECREE_FAST: BulletSpec = { sprite: 'eb_orb_gold', radius: 3.5, damage: 13, speed: 82, life: 9 };
const ROYAL_SMALL: BulletSpec = { sprite: 'eb_small_gold', radius: 2.5, damage: 10, speed: 70, life: 8 };
const ROYAL_PINK: BulletSpec = { sprite: 'eb_orb_pink', radius: 3.5, damage: 14, speed: 58, life: 9 };
const SEED_BURST: BulletSpec = { sprite: 'eb_small_pink', radius: 2.5, damage: 10, speed: 58, life: 5 };
const ROOT_WALL: BulletSpec = { sprite: 'eb_thorn', radius: 3, damage: 14, speed: 62, life: 12 };
const CROWN: BulletSpec = { sprite: 'eb_ring', radius: 4.5, damage: 16, speed: 150, accel: -120, minSpeed: -150, life: 3.2 };
const WITCH_APPLE: BulletSpec = { sprite: 'eb_orb_pink', radius: 3.5, damage: 11, speed: 70, homing: 1.6, homingTime: 1.6, life: 6 };
const WITCH_ROTOR: BulletSpec = { sprite: 'eb_small_gold', radius: 2.5, damage: 9, speed: 66, life: 7 };

export const ATTACKS: Record<string, AttackDef> = {};

function attack(a: AttackDef) {
  ATTACKS[a.id] = a;
}

// --- meadow creatures -------------------------------------------------------

attack({
  id: 'moth_pollen',
  windup: 0.35,
  cooldown: 2.8,
  range: 220,
  steps: [{ at: 0, pattern: { kind: 'spread', bullet: POLLEN, count: 3, arc: 0.55 }, aim: 'player' }],
});

attack({
  id: 'moth_pollen_late',
  windup: 0.35,
  cooldown: 2.6,
  range: 230,
  steps: [
    { at: 0, pattern: { kind: 'spread', bullet: POLLEN, count: 5, arc: 0.85 }, aim: 'player' },
  ],
});

attack({
  id: 'husk_ring',
  windup: 0.55,
  cooldown: 3.8,
  range: 260,
  steps: [
    { at: 0, pattern: { kind: 'ring', bullet: HUSK_ORB, count: 16, gaps: 2, gapSize: 2 }, aim: 'player' },
    { at: 0.55, pattern: { kind: 'ring', bullet: HUSK_ORB, count: 16, gaps: 2, gapSize: 2, offset: 0.2 }, aim: 'keep' },
  ],
});

attack({
  id: 'husk_spiral',
  windup: 0.55,
  cooldown: 4.6,
  range: 240,
  steps: [{ at: 0, pattern: { kind: 'spiral', bullet: HUSK_SMALL, arms: 2, rate: 7, spin: 1.7, duration: 2.4 }, aim: 'player' }],
});

attack({
  id: 'stalker_ring',
  windup: 0.0,
  cooldown: 99,
  steps: [{ at: 0.25, pattern: { kind: 'ring', bullet: THORN, count: 10 }, aim: 'random' }],
});

attack({
  id: 'wraith_ring',
  windup: 0.45,
  cooldown: 3.4,
  range: 260,
  steps: [{ at: 0, pattern: { kind: 'ring', bullet: WRAITH, count: 20, gaps: 3, gapSize: 2, spinOffset: 0.7 }, aim: 'player' }],
});

attack({
  id: 'mud_toss',
  windup: 0.4,
  cooldown: 3.2,
  range: 170,
  steps: [{ at: 0, pattern: { kind: 'burst', bullet: MUD, count: 2, interval: 0.18 }, aim: 'player' }],
});

attack({
  id: 'sporeling_pop',
  windup: 0,
  cooldown: 99,
  steps: [{ at: 0, pattern: { kind: 'ring', bullet: SPORE, count: 6 }, aim: 'random' }],
});

// --- elites -----------------------------------------------------------------

attack({
  id: 'knight_wall',
  name: 'Bramble Wall',
  windup: 0.6,
  cooldown: 3.6,
  range: 300,
  steps: [
    { at: 0, pattern: { kind: 'wall', bullet: KNIGHT_THORN, count: 15, spacing: 11, gap: 3 }, aim: 'player' },
    { at: 0.7, pattern: { kind: 'wall', bullet: KNIGHT_THORN, count: 15, spacing: 11, gap: 3 }, aim: 'player' },
  ],
});

attack({
  id: 'knight_burst',
  name: 'Shield Bash',
  windup: 0.7,
  cooldown: 4.2,
  range: 120,
  steps: [
    { at: 0, pattern: { kind: 'ring', bullet: KNIGHT_THORN, count: 22, gaps: 1, gapSize: 3 }, aim: 'player' },
    { at: 0.35, pattern: { kind: 'ring', bullet: KNIGHT_THORN, count: 22, gaps: 1, gapSize: 3, offset: 0.14 }, aim: 'keep' },
  ],
});

attack({
  id: 'witch_rotor',
  name: 'Orchard Rotor',
  windup: 0.6,
  cooldown: 5,
  range: 300,
  steps: [{ at: 0, pattern: { kind: 'spiral', bullet: WITCH_ROTOR, arms: 4, rate: 6, spin: 1.2, duration: 3.2 }, aim: 'player' }],
});

attack({
  id: 'witch_apples',
  name: 'Bad Apples',
  windup: 0.5,
  cooldown: 4,
  range: 300,
  steps: [{ at: 0, pattern: { kind: 'homing', bullet: WITCH_APPLE, count: 4, arc: 1.6 }, aim: 'player' }],
});

// --- the Thousand-Eyed Scarecrow -------------------------------------------

const EYE: BulletSpec = { sprite: 'eb_eye', radius: 3.5, damage: 12, speed: 78, life: 7 };
const EYE_SLOW: BulletSpec = { sprite: 'eb_eye', radius: 3.5, damage: 12, speed: 48, accel: 30, maxSpeed: 95, life: 8 };
const ORB_SHOT: BulletSpec = { sprite: 'eb_small_pink', radius: 2.5, damage: 9, speed: 70, life: 6 };

attack({
  id: 'eyes_gaze',
  name: 'The Gaze',
  windup: 0.6,
  cooldown: 3.4,
  steps: [0, 0.22, 0.44, 0.66, 0.88].map((at, i) => ({ at, pattern: { kind: 'spread', bullet: EYE, count: 3, arc: 0.32 } as Pattern, aim: 'player' as const, angleOffset: (i - 2) * 0.12 })),
});

attack({
  id: 'eyes_crows',
  name: 'A Murder of Crows',
  windup: 0.5,
  cooldown: 4,
  steps: [
    { at: 0, pattern: { kind: 'summon', enemy: 'crow', count: 7, radius: 26 } },
    { at: 0.4, pattern: { kind: 'ring', bullet: EYE_SLOW, count: 14, gaps: 2, gapSize: 2 }, aim: 'player' },
  ],
});

attack({
  id: 'eyes_cross',
  name: 'Crossed Eyes',
  windup: 0.7,
  cooldown: 4.4,
  steps: [{ at: 0, pattern: { kind: 'spiral', bullet: EYE, arms: 4, rate: 5, spin: 0.85, duration: 3.2 }, aim: 'player' }],
});

attack({
  id: 'eyes_stare',
  name: 'Unblinking',
  windup: 0.6,
  cooldown: 4,
  steps: [{ at: 0, pattern: { kind: 'delayed', bullet: { ...EYE, delay: 0.9, speed: 85 }, count: 16, radius: 70 } }],
});

attack({
  id: 'orb_shot',
  windup: 0.3,
  cooldown: 2.4,
  range: 320,
  steps: [{ at: 0, pattern: { kind: 'burst', bullet: ORB_SHOT, count: 2, interval: 0.15 }, aim: 'player' }],
});

// --- the Marrow King ---------------------------------------------------------

attack({
  id: 'mk_decree',
  name: 'Royal Decree',
  windup: 0.8,
  cooldown: 4.4,
  steps: [
    { at: 0, pattern: { kind: 'ring', bullet: DECREE, count: 32, gaps: 4, gapSize: 3 }, aim: 'player' },
    { at: 0.6, pattern: { kind: 'ring', bullet: DECREE, count: 32, gaps: 4, gapSize: 3, offset: 0.25 }, aim: 'keep' },
    { at: 1.2, pattern: { kind: 'ring', bullet: DECREE, count: 32, gaps: 4, gapSize: 3, offset: 0.5 }, aim: 'keep' },
  ],
});

attack({
  id: 'mk_judgment',
  name: 'Root Judgment',
  windup: 0.6,
  cooldown: 4.2,
  steps: [
    { at: 0, pattern: { kind: 'zones', count: 1, radius: 20, warn: 0.9, damage: 18, scatter: 0, onPlayer: true, visual: 'boss_root_column' }, aim: 'player' },
    { at: 0.35, pattern: { kind: 'zones', count: 4, radius: 18, warn: 0.9, damage: 18, scatter: 70, onPlayer: true, visual: 'boss_root_column' }, aim: 'player' },
    { at: 0.8, pattern: { kind: 'zones', count: 4, radius: 18, warn: 0.9, damage: 18, scatter: 90, onPlayer: true, visual: 'boss_root_column', burst: THORN, burstCount: 6 }, aim: 'player' },
  ],
});

attack({
  id: 'mk_crownfall',
  name: 'Crownfall',
  windup: 0.7,
  cooldown: 5.2,
  steps: [
    { at: 0, pattern: { kind: 'crownfall', count: 7, scatter: 130, warn: 1.0, damage: 16, radius: 14, burst: SEED_BURST, burstCount: 8, fuse: 1.6 } },
  ],
});

attack({
  id: 'mk_tax',
  name: 'Harvest Tax',
  windup: 0.6,
  cooldown: 9,
  steps: [
    { at: 0, pattern: { kind: 'summon', enemy: 'taxman', count: 4, radius: 46 } },
    { at: 0.3, pattern: { kind: 'spread', bullet: ROYAL_SMALL, count: 7, arc: 1.2 }, aim: 'player' },
    { at: 0.8, pattern: { kind: 'spread', bullet: ROYAL_SMALL, count: 7, arc: 1.2 }, aim: 'player' },
  ],
});

attack({
  id: 'mk_crownthrow',
  name: 'Crown Throw',
  windup: 0.5,
  cooldown: 3.2,
  steps: [
    { at: 0, pattern: { kind: 'spread', bullet: CROWN, count: 3, arc: 0.7 }, aim: 'player' },
    { at: 0.2, pattern: { kind: 'ring', bullet: ROYAL_SMALL, count: 12 }, aim: 'player' },
  ],
});

attack({
  id: 'mk_uprooting',
  name: 'The Great Uprooting',
  windup: 1.0,
  cooldown: 7.5,
  steps: [
    { at: 0, pattern: { kind: 'sweep', bullet: ROOT_WALL, count: 26, spacing: 14, gap: 4, from: 'random' } },
    { at: 0.3, pattern: { kind: 'spiral', bullet: ROYAL_PINK, arms: 3, rate: 5, spin: 1.1, duration: 3.6 }, aim: 'player' },
    { at: 2.0, pattern: { kind: 'sweep', bullet: ROOT_WALL, count: 26, spacing: 14, gap: 4, from: 'random' } },
  ],
});

attack({
  id: 'mk_decree2',
  name: 'Royal Decree',
  windup: 0.6,
  cooldown: 3.6,
  steps: [
    { at: 0, pattern: { kind: 'ring', bullet: DECREE_FAST, count: 36, gaps: 4, gapSize: 3 }, aim: 'player' },
    { at: 0.45, pattern: { kind: 'ring', bullet: DECREE_FAST, count: 36, gaps: 4, gapSize: 3, offset: -0.22 }, aim: 'keep' },
    { at: 0.9, pattern: { kind: 'ring', bullet: DECREE_FAST, count: 36, gaps: 4, gapSize: 3, offset: -0.44 }, aim: 'keep' },
    { at: 1.35, pattern: { kind: 'ring', bullet: DECREE_FAST, count: 36, gaps: 4, gapSize: 3, offset: -0.66 }, aim: 'keep' },
  ],
});

attack({
  id: 'mk_lanes',
  name: 'Furrows',
  windup: 0.8,
  cooldown: 5.5,
  steps: [{ at: 0, pattern: { kind: 'lanes', bullet: ROYAL_SMALL, lanes: 9, perLane: 1, laneWidth: 30, safeEvery: 3, interval: 0.42, rows: 6 } }],
});
