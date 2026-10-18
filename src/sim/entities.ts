// Simulation entities. Plain mutable objects, pooled and reused, so a heavy
// fight does not churn the garbage collector. The renderer reads these; it
// never writes to them.

import type { EnemyDef } from '../data/enemies';
import type { BulletSpec, AttackDef } from '../data/patterns';
import type { DamageType, StatusApply } from '../data/types';
import type { WeaponInstance } from './weapons';

export interface Poolable {
  active: boolean;
  _i?: number;
}

export class Pool<T extends Poolable> {
  readonly items: T[] = [];
  private free: number[] = [];
  count = 0;

  constructor(private readonly make: () => T, private readonly cap = 100000) {}

  obtain(): T | null {
    const i = this.free.pop();
    let o: T;
    if (i !== undefined) o = this.items[i];
    else {
      if (this.items.length >= this.cap) return null;
      o = this.make();
      o._i = this.items.length;
      this.items.push(o);
    }
    o.active = true;
    this.count++;
    return o;
  }

  release(o: T): void {
    if (!o.active) return;
    o.active = false;
    this.count--;
    this.free.push(o._i!);
  }

  clear(): void {
    for (const o of this.items) if (o.active) this.release(o);
  }
}

export type EnemyState =
  | 'move'
  | 'windup'
  | 'charge'
  | 'recover'
  | 'attack'
  | 'burrow'
  | 'emerge'
  | 'flee'
  | 'dying'
  | 'spawning'
  | 'frozen'
  | 'intro';

export class Enemy implements Poolable {
  active = false;
  _i?: number;
  id = 0;
  def!: EnemyDef;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  kx = 0;
  ky = 0;
  radius = 6;
  hp = 1;
  maxHp = 1;
  speed = 0;
  contact = 0;
  dmgMult = 1;
  state: EnemyState = 'move';
  stateT = 0;
  t = 0;
  angle = 0;
  facing = 1;
  attackCd = 0;
  attackIndex = 0;
  attack: AttackDef | null = null;
  attackT = 0;
  attackStep = 0;
  attackAim = 0;
  flash = 0;
  /** Seconds left of the spawn telegraph before the enemy becomes real. */
  spawnT = 0;
  // statuses
  poisonDps = 0;
  poisonT = 0;
  burnDps = 0;
  burnT = 0;
  slow = 0;
  slowT = 0;
  chillStacks = 0;
  chillDecay = 0;
  frozenT = 0;
  bleedStacks = 0;
  bleedPower = 0;
  bleedT = 0;
  rootT = 0;
  shock = 0;
  dotAcc = 0;
  dotTick = 0;
  /** The weapon that last poisoned, burned or bled this enemy: its damage over time is credited there. */
  dotBy: WeaponInstance | null = null;
  fearT = 0;
  /** Last time each weapon slot touched this enemy (orbits, hazards). */
  lastHit = new Float64Array(10);
  invulnerable = false;
  hidden = false;
  /** Sap carried by taxmen. */
  carried = 0;
  /** Boss phase etc. */
  phase = 0;
  memo = 0;
  memo2 = 0;
  elite = false;
  boss = false;
  lastDamageType: DamageType = 'physical';
  detonated = false;
  lastFlash = -1;
  /** The Witch's hex. */
  cursedT = 0;
  numAcc = 0;
  lastNum = -1;
  /** Whether the knight's shield is up (for rendering). */
  guard = false;
}

export type ProjKind = 'shot' | 'lob' | 'shell' | 'chunk' | 'mote' | 'crown' | 'roll' | 'thorn' | 'crescent' | 'shard' | 'reflected';

export class Projectile implements Poolable {
  active = false;
  _i?: number;
  kind: ProjKind = 'shot';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Height above the ground for lobbed shots. */
  z = 0;
  sx = 0;
  sy = 0;
  tx = 0;
  ty = 0;
  flight = 0;
  radius = 3;
  damage = 0;
  dmgType: DamageType = 'physical';
  pierce = 0;
  bounce = 0;
  life = 1;
  age = 0;
  sprite = '';
  rot = 0;
  spin = 0;
  scale = 1;
  knockback = 0;
  split = 0;
  splitDamage = 0;
  chain = 0;
  area = 0;
  status: StatusApply[] = [];
  weapon: WeaponInstance | null = null;
  hits: number[] = [];
  canCrit = true;
  /** Echo copies cannot echo again. */
  isEcho = false;
  returning = false;
  homing = 0;
  dropT = 0;
  trailT = 0;
  tint = 0;
}

export class Bullet implements Poolable {
  active = false;
  _i?: number;
  x = 0;
  y = 0;
  angle = 0;
  speed = 0;
  accel = 0;
  minSpeed = -9999;
  maxSpeed = 9999;
  angVel = 0;
  homing = 0;
  homingT = 0;
  radius = 3;
  damage = 5;
  life = 5;
  age = 0;
  delay = 0;
  sprite = '';
  grazed = false;
}

export type HazardKind = 'poison' | 'fire' | 'spores' | 'briar' | 'zone' | 'seedpod' | 'telegraph' | 'thread' | 'frost' | 'rootwall' | 'furrow';

export class Hazard implements Poolable {
  active = false;
  _i?: number;
  kind: HazardKind = 'poison';
  /** 'player' hazards hurt enemies; 'enemy' hazards hurt the player. */
  owner: 'player' | 'enemy' = 'player';
  x = 0;
  y = 0;
  x2 = 0;
  y2 = 0;
  radius = 10;
  /** Seconds of warning before it becomes dangerous (enemy zones). */
  warn = 0;
  life = 1;
  age = 0;
  damage = 0;
  tick = 0.5;
  tickT = 0;
  status: StatusApply | null = null;
  weapon: WeaponInstance | null = null;
  slot = 9;
  sprite = '';
  reflect = false;
  blocks = false;
  fired = false;
  burst: BulletSpec | null = null;
  burstCount = 0;
  hp = 0;
  dmgType: DamageType = 'nature';
}

export type PickupKind = 'sap' | 'farthing' | 'material' | 'seed' | 'jam' | 'chest' | 'heart';

export class Pickup implements Poolable {
  active = false;
  _i?: number;
  kind: PickupKind = 'sap';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Pop-out height for the drop arc. */
  z = 0;
  vz = 0;
  value = 1;
  id = '';
  rarity = 0;
  traits: string[] = [];
  magnet = false;
  age = 0;
  life = 90;
  sprite = '';
}

export type SummonKind = 'shroom' | 'bee' | 'mite' | 'decoy' | 'sporeling' | 'turret' | 'wbee';

export class Summon implements Poolable {
  active = false;
  _i?: number;
  kind: SummonKind = 'shroom';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  z = 0;
  target: Enemy | null = null;
  state = 0;
  t = 0;
  cd = 0;
  life = 0;
  hp = 0;
  index = 0;
  weapon: WeaponInstance | null = null;
  facing = 1;
}

export class Emitter implements Poolable {
  active = false;
  _i?: number;
  owner: Enemy | null = null;
  /** The owner's id when the emitter began: a reused enemy slot is not the same enemy. */
  ownerId = 0;
  x = 0;
  y = 0;
  angle = 0;
  t = 0;
  duration = 0;
  acc = 0;
  rate = 0;
  arms = 1;
  spin = 0;
  bullet!: BulletSpec;
  dmgMult = 1;
  // lanes
  rows = 0;
  rowT = 0;
  interval = 0;
  lanes = 0;
  laneWidth = 0;
  safeEvery = 0;
  kind: 'spiral' | 'burst' | 'fan' | 'lanes' = 'spiral';
  count = 0;
  fired = 0;
  arc = 0;
  spread = 0;
}
