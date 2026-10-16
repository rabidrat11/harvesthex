// Procedural sound effects. Each sound is a small function that writes
// samples into a buffer once, at first use. Soft attacks, low-passed noise and
// short tails keep repeated sounds from becoming painful.

type Gen = (sr: number) => Float32Array;

const TAU = Math.PI * 2;

function buf(sr: number, dur: number) {
  return new Float32Array(Math.max(1, Math.floor(sr * dur)));
}

/** Seeded noise so sounds are identical every session. */
function noiseGen(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

function env(t: number, a: number, d: number, curve = 2) {
  if (t < a) return t / a;
  const x = (t - a) / d;
  return x >= 1 ? 0 : Math.pow(1 - x, curve);
}

class OnePole {
  y = 0;
  constructor(public k: number) {}
  lp(x: number) {
    this.y += this.k * (x - this.y);
    return this.y;
  }
}

function lpK(sr: number, hz: number) {
  return 1 - Math.exp((-TAU * hz) / sr);
}

function softclip(x: number) {
  return Math.tanh(x);
}

/** Sweep a sine from f0 to f1 (exponential) over the duration. */
function chirp(sr: number, dur: number, f0: number, f1: number, a: number, d: number, vol = 1, shape: 'sine' | 'tri' | 'sq' = 'sine'): Float32Array {
  const out = buf(sr, dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const f = f0 * Math.pow(f1 / f0, Math.min(1, t / dur));
    ph += (TAU * f) / sr;
    let v = Math.sin(ph);
    if (shape === 'tri') v = (2 / Math.PI) * Math.asin(Math.sin(ph));
    if (shape === 'sq') v = softclip(Math.sin(ph) * 3) * 0.6;
    out[i] = v * env(t, a, d) * vol;
  }
  return out;
}

function noise(sr: number, dur: number, lowHz: number, highHz: number, a: number, d: number, vol = 1, seed = 7, sweepTo?: number): Float32Array {
  const out = buf(sr, dur);
  const n = noiseGen(seed);
  const lp = new OnePole(lpK(sr, highHz));
  const hp = new OnePole(lpK(sr, lowHz));
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    if (sweepTo) lp.k = lpK(sr, highHz + (sweepTo - highHz) * Math.min(1, t / dur));
    const x = lp.lp(n());
    const y = x - hp.lp(x);
    out[i] = y * env(t, a, d) * vol * 2.2;
  }
  return out;
}

function mix(...parts: (Float32Array | [Float32Array, number])[]): Float32Array {
  let len = 0;
  for (const p of parts) {
    const [b, off] = Array.isArray(p) ? p : [p, 0];
    len = Math.max(len, b.length + off);
  }
  const out = new Float32Array(len);
  for (const p of parts) {
    const [b, off] = Array.isArray(p) ? p : [p, 0];
    for (let i = 0; i < b.length; i++) out[i + off] += b[i];
  }
  return out;
}

function at(sr: number, s: number) {
  return Math.floor(sr * s);
}

/** Plucked string (Karplus-Strong), used for chimes and the soundtrack. */
export function pluck(sr: number, freq: number, dur: number, bright = 0.5, vol = 1, seed = 3): Float32Array {
  const out = buf(sr, dur);
  const n = noiseGen(seed);
  const period = Math.max(2, Math.round(sr / freq));
  const line = new Float32Array(period);
  const pre = new OnePole(lpK(sr, 1200 + bright * 6000));
  for (let i = 0; i < period; i++) line[i] = pre.lp(n());
  let idx = 0;
  const damp = 0.996 - (1 - bright) * 0.006;
  for (let i = 0; i < out.length; i++) {
    const a = line[idx];
    const b = line[(idx + 1) % period];
    const v = (a + b) * 0.5 * damp;
    line[idx] = v;
    idx = (idx + 1) % period;
    const t = i / sr;
    out[i] = a * vol * Math.min(1, t / 0.002) * (t > dur - 0.05 ? (dur - t) / 0.05 : 1);
  }
  return out;
}

function arp(sr: number, freqs: number[], step: number, dur: number, bright: number, vol: number) {
  return mix(...freqs.map((f, i) => [pluck(sr, f, dur, bright, vol, 11 + i), at(sr, i * step)] as [Float32Array, number]));
}

const N = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export const SFX: Record<string, Gen> = {
  // --- player weapons ---
  sling: (sr) => mix(noise(sr, 0.09, 900, 5000, 0.002, 0.08, 0.35, 2, 1200), chirp(sr, 0.08, 220, 110, 0.002, 0.07, 0.35)),
  pea: (sr) => mix(chirp(sr, 0.07, 720, 260, 0.002, 0.06, 0.45), noise(sr, 0.02, 2000, 6000, 0.001, 0.02, 0.15)),
  cannon: (sr) => mix(chirp(sr, 0.28, 140, 45, 0.003, 0.26, 0.9), noise(sr, 0.2, 60, 900, 0.002, 0.18, 0.5, 4)),
  lance: (sr) => mix(noise(sr, 0.16, 600, 1500, 0.01, 0.14, 0.5, 5, 6000), chirp(sr, 0.1, 900, 1400, 0.005, 0.09, 0.12)),
  petal: (sr) => mix(chirp(sr, 0.18, 1320, 1320, 0.003, 0.17, 0.12), chirp(sr, 0.18, 1980, 1980, 0.003, 0.12, 0.06)),
  lob: (sr) => chirp(sr, 0.14, 240, 520, 0.005, 0.12, 0.4, 'tri'),
  splat: (sr) => mix(noise(sr, 0.18, 120, 1400, 0.002, 0.16, 0.6, 8), chirp(sr, 0.12, 200, 70, 0.002, 0.1, 0.4)),
  mortar: (sr) => mix(chirp(sr, 0.22, 110, 50, 0.003, 0.2, 0.8), noise(sr, 0.12, 80, 700, 0.002, 0.1, 0.4, 9)),
  whip: (sr) => mix(noise(sr, 0.06, 1800, 8000, 0.001, 0.05, 0.6, 10), chirp(sr, 0.06, 1800, 500, 0.001, 0.05, 0.2)),
  swing: (sr) => noise(sr, 0.2, 300, 900, 0.03, 0.16, 0.6, 12, 3500),
  puff: (sr) => noise(sr, 0.16, 200, 1200, 0.02, 0.13, 0.4, 13, 500),
  choir: (sr) => {
    const out = buf(sr, 0.32);
    const f = [N(67), N(71), N(74)];
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      let v = 0;
      for (const ff of f) v += Math.sin(TAU * ff * t * (1 + 0.004 * Math.sin(TAU * 6 * t))) + 0.3 * Math.sin(TAU * ff * 2 * t);
      out[i] = v * 0.06 * env(t, 0.04, 0.28, 1.5);
    }
    return out;
  },
  zap: (sr) => {
    const out = buf(sr, 0.14);
    const n = noiseGen(14);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const sq = Math.sign(Math.sin(TAU * (95 + 40 * Math.sin(TAU * 30 * t)) * t));
      out[i] = (sq * 0.25 + n() * 0.25) * env(t, 0.002, 0.13) * 0.8;
    }
    const lp = new OnePole(lpK(sr, 3000));
    for (let i = 0; i < out.length; i++) out[i] = lp.lp(out[i]);
    return out;
  },
  thunder: (sr) => mix(noise(sr, 0.6, 40, 1200, 0.005, 0.55, 0.9, 15, 300), chirp(sr, 0.3, 90, 40, 0.002, 0.28, 0.6)),
  buzz: (sr) => {
    const out = buf(sr, 0.12);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const f = 230 + 20 * Math.sin(TAU * 40 * t);
      out[i] = ((((t * f) % 1) * 2 - 1) * 0.15) * env(t, 0.01, 0.1);
    }
    return out;
  },
  briar: (sr) => noise(sr, 0.22, 800, 4000, 0.01, 0.2, 0.4, 16),
  crown: (sr) => mix(chirp(sr, 0.25, 600, 900, 0.01, 0.22, 0.2, 'tri'), noise(sr, 0.25, 1500, 5000, 0.02, 0.2, 0.2, 17)),
  flare: (sr) => mix(noise(sr, 0.35, 300, 2500, 0.02, 0.32, 0.5, 18), chirp(sr, 0.35, 330, 660, 0.02, 0.3, 0.2, 'tri')),
  crunch: (sr) => noise(sr, 0.1, 300, 3000, 0.002, 0.09, 0.5, 19),
  crescent: (sr) => noise(sr, 0.25, 400, 1200, 0.02, 0.2, 0.5, 20, 4000),

  // --- impacts and status ---
  boom: (sr) => mix(noise(sr, 0.5, 30, 1600, 0.003, 0.48, 1, 21, 200), chirp(sr, 0.35, 90, 35, 0.003, 0.32, 0.8)),
  detonate: (sr) => mix(noise(sr, 0.4, 100, 3000, 0.002, 0.36, 0.8, 22, 400), chirp(sr, 0.3, 300, 60, 0.002, 0.28, 0.5, 'sq')),
  freeze: (sr) => mix(chirp(sr, 0.3, 2400, 1800, 0.005, 0.28, 0.12), noise(sr, 0.3, 4000, 9000, 0.01, 0.25, 0.15, 23)),
  shatter: (sr) => mix(noise(sr, 0.3, 2500, 9000, 0.001, 0.28, 0.6, 24), ...[3100, 2600, 3700].map((f, i) => [chirp(sr, 0.2, f, f * 0.9, 0.001, 0.18, 0.08), at(sr, i * 0.03)] as [Float32Array, number])),
  pop: (sr) => mix(chirp(sr, 0.09, 520, 160, 0.002, 0.08, 0.35), noise(sr, 0.05, 500, 3000, 0.001, 0.04, 0.15, 25)),
  squelch: (sr) => mix(chirp(sr, 0.16, 330, 70, 0.002, 0.15, 0.45, 'tri'), noise(sr, 0.12, 150, 1500, 0.002, 0.1, 0.35, 26)),
  elite_death: (sr) => mix(noise(sr, 0.9, 40, 1200, 0.005, 0.85, 0.9, 27, 200), chirp(sr, 0.8, 160, 40, 0.005, 0.75, 0.6, 'sq')),
  block: (sr) => mix(chirp(sr, 0.08, 1500, 1200, 0.001, 0.07, 0.25, 'sq'), noise(sr, 0.05, 2000, 6000, 0.001, 0.04, 0.2, 28)),

  // --- enemies ---
  enemy_shot: (sr) => chirp(sr, 0.07, 640, 470, 0.006, 0.06, 0.14, 'tri'),
  rumble: (sr) => noise(sr, 0.5, 20, 220, 0.05, 0.43, 0.9, 29),
  telegraph: (sr) => chirp(sr, 0.18, 480, 520, 0.03, 0.15, 0.12, 'tri'),
  erupt: (sr) => mix(noise(sr, 0.25, 60, 900, 0.002, 0.23, 0.7, 30), chirp(sr, 0.2, 140, 60, 0.002, 0.18, 0.4)),
  thud: (sr) => chirp(sr, 0.15, 110, 50, 0.002, 0.14, 0.6),
  snort: (sr) => noise(sr, 0.2, 200, 900, 0.01, 0.18, 0.5, 31),
  charge: (sr) => noise(sr, 0.4, 100, 600, 0.02, 0.36, 0.5, 32, 1500),
  blink: (sr) => mix(chirp(sr, 0.2, 900, 300, 0.005, 0.18, 0.2, 'tri'), chirp(sr, 0.2, 1350, 450, 0.005, 0.18, 0.1)),
  elite: (sr) => mix(chirp(sr, 0.9, 110, 104, 0.05, 0.8, 0.4, 'sq'), chirp(sr, 0.9, 165, 156, 0.05, 0.8, 0.25, 'sq')),
  boss_cast: (sr) => mix(noise(sr, 0.5, 80, 600, 0.05, 0.4, 0.5, 33), chirp(sr, 0.5, 70, 90, 0.05, 0.45, 0.4, 'sq')),
  boss_laugh: (sr) => mix(...[0, 0.14, 0.28].map((o) => [chirp(sr, 0.12, 180, 130, 0.01, 0.1, 0.4, 'sq'), at(sr, o)] as [Float32Array, number])),
  boss_roar: (sr) => {
    const out = buf(sr, 1.4);
    const n = noiseGen(34);
    const lp = new OnePole(lpK(sr, 700));
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const f = 62 + 8 * Math.sin(TAU * 7 * t);
      const saw = ((t * f) % 1) * 2 - 1;
      out[i] = softclip((saw * 0.9 + n() * 0.5) * 1.6) * env(t, 0.08, 1.3, 1.4) * 0.7;
      out[i] = lp.lp(out[i]);
    }
    return out;
  },
  boss_rise: (sr) => noise(sr, 2.4, 20, 300, 0.4, 2, 1, 35, 900),
  boss_death: (sr) => mix(noise(sr, 2.2, 20, 900, 0.01, 2.1, 1, 36, 100), chirp(sr, 1.8, 120, 30, 0.01, 1.7, 0.7, 'sq')),

  // --- player ---
  hurt: (sr) => mix(chirp(sr, 0.2, 300, 150, 0.002, 0.18, 0.5, 'sq'), noise(sr, 0.1, 300, 2500, 0.002, 0.09, 0.35, 37)),
  dash: (sr) => noise(sr, 0.16, 500, 1200, 0.01, 0.14, 0.4, 38, 4000),
  decoy: (sr) => mix(noise(sr, 0.25, 300, 2000, 0.01, 0.22, 0.3, 39), chirp(sr, 0.2, 300, 200, 0.01, 0.18, 0.2, 'tri')),
  vines: (sr) => mix(noise(sr, 0.5, 100, 1500, 0.02, 0.45, 0.6, 40), chirp(sr, 0.4, 90, 140, 0.02, 0.35, 0.3, 'tri')),
  reap: (sr) => mix(noise(sr, 0.3, 600, 2000, 0.005, 0.26, 0.6, 41, 7000), chirp(sr, 0.25, 400, 1200, 0.005, 0.22, 0.15)),
  drink: (sr) => mix(...[0, 0.08, 0.16].map((o, i) => [chirp(sr, 0.08, 300 + i * 40, 500 + i * 40, 0.005, 0.07, 0.25, 'tri'), at(sr, o)] as [Float32Array, number])),
  heal: (sr) => arp(sr, [N(76), N(81)], 0.06, 0.4, 0.8, 0.3),
  defeat: (sr) => mix(...[N(62), N(58), N(55), N(50)].map((f, i) => [pluck(sr, f, 1.6, 0.4, 0.5, 50 + i), at(sr, i * 0.28)] as [Float32Array, number])),

  // --- loot ---
  sap: (sr) => pluck(sr, N(84), 0.25, 0.9, 0.25, 42),
  coin: (sr) => mix(chirp(sr, 0.12, N(88), N(88), 0.002, 0.1, 0.18, 'tri'), [chirp(sr, 0.2, N(93), N(93), 0.002, 0.18, 0.15, 'tri'), at(sr, 0.06)]),
  loot: (sr) => arp(sr, [N(79), N(83), N(86)], 0.05, 0.5, 0.9, 0.3),
  loot_legendary: (sr) => mix(arp(sr, [N(74), N(78), N(81), N(86), N(90)], 0.07, 1.4, 0.9, 0.35), noise(sr, 1.2, 3000, 9000, 0.3, 0.9, 0.12, 43)),
  chest: (sr) => mix(noise(sr, 0.2, 200, 1500, 0.005, 0.18, 0.4, 44), [arp(sr, [N(72), N(76), N(79), N(84)], 0.07, 0.9, 0.85, 0.3), at(sr, 0.15)]),
  levelup: (sr) => arp(sr, [N(67), N(71), N(74), N(79)], 0.06, 0.8, 0.85, 0.35),
  evolve: (sr) => mix(arp(sr, [N(62), N(69), N(74), N(78), N(81), N(86)], 0.06, 1.8, 0.9, 0.35), noise(sr, 1.5, 800, 6000, 0.4, 1.0, 0.25, 45, 9000)),
  buy: (sr) => mix(chirp(sr, 0.1, N(83), N(83), 0.002, 0.08, 0.2, 'tri'), [chirp(sr, 0.18, N(88), N(88), 0.002, 0.16, 0.2, 'tri'), at(sr, 0.07)]),
  bell: (sr) => mix(chirp(sr, 1.2, 520, 520, 0.002, 1.15, 0.25), chirp(sr, 1.2, 1340, 1340, 0.002, 0.8, 0.1), chirp(sr, 1.2, 790, 790, 0.002, 1.0, 0.08)),
  lull: (sr) => arp(sr, [N(62), N(66), N(69), N(74)], 0.12, 1.4, 0.6, 0.3),
  cleanse: (sr) => mix(arp(sr, [N(69), N(73), N(76), N(81)], 0.09, 1.4, 0.8, 0.3), noise(sr, 1.0, 2000, 7000, 0.2, 0.7, 0.1, 46)),

  // --- farm and interface ---
  till: (sr) => mix(noise(sr, 0.14, 100, 1200, 0.003, 0.12, 0.6, 47), chirp(sr, 0.08, 160, 90, 0.002, 0.07, 0.3)),
  plant: (sr) => mix(noise(sr, 0.08, 200, 1500, 0.003, 0.07, 0.35, 48), [pluck(sr, N(76), 0.3, 0.8, 0.25, 49), at(sr, 0.04)]),
  water: (sr) => {
    const out = buf(sr, 0.4);
    const n = noiseGen(51);
    const lp = new OnePole(lpK(sr, 2500));
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const bubble = Math.sin(TAU * (500 + 300 * Math.sin(TAU * 13 * t)) * t) * 0.15;
      out[i] = (lp.lp(n()) * 0.5 + bubble) * env(t, 0.03, 0.36, 1.5) * 0.6;
    }
    return out;
  },
  harvest: (sr) => mix(noise(sr, 0.12, 300, 2500, 0.002, 0.1, 0.4, 52), [arp(sr, [N(72), N(79)], 0.07, 0.5, 0.85, 0.3), at(sr, 0.05)]),
  mutate: (sr) => mix(noise(sr, 0.7, 400, 3000, 0.05, 0.6, 0.3, 53), chirp(sr, 0.7, 220, 880, 0.05, 0.6, 0.15, 'tri')),
  ui_move: (sr) => chirp(sr, 0.04, 900, 900, 0.002, 0.035, 0.08, 'tri'),
  ui_select: (sr) => mix(chirp(sr, 0.06, 700, 700, 0.002, 0.05, 0.12, 'tri'), [chirp(sr, 0.08, 1050, 1050, 0.002, 0.07, 0.1, 'tri'), at(sr, 0.04)]),
  ui_back: (sr) => chirp(sr, 0.08, 600, 400, 0.002, 0.07, 0.12, 'tri'),
  ui_deny: (sr) => chirp(sr, 0.12, 200, 160, 0.002, 0.11, 0.2, 'sq'),
  page: (sr) => noise(sr, 0.12, 1500, 6000, 0.01, 0.1, 0.25, 54, 2000),
  door: (sr) => mix(chirp(sr, 0.25, 150, 120, 0.01, 0.23, 0.4, 'tri'), noise(sr, 0.2, 200, 1000, 0.01, 0.18, 0.2, 55)),
  footstep: (sr) => noise(sr, 0.05, 150, 900, 0.002, 0.045, 0.25, 56),
};

/** Concurrency and spacing limits so swarms of the same sound stay pleasant. */
export const SFX_LIMITS: Record<string, { max: number; gap: number }> = {
  pea: { max: 4, gap: 0.03 },
  sling: { max: 3, gap: 0.03 },
  enemy_shot: { max: 3, gap: 0.05 },
  sap: { max: 3, gap: 0.03 },
  pop: { max: 4, gap: 0.03 },
  squelch: { max: 4, gap: 0.04 },
  buzz: { max: 2, gap: 0.08 },
  petal: { max: 2, gap: 0.08 },
  zap: { max: 3, gap: 0.05 },
  boom: { max: 3, gap: 0.06 },
  crunch: { max: 2, gap: 0.05 },
  coin: { max: 3, gap: 0.04 },
  footstep: { max: 1, gap: 0.2 },
  erupt: { max: 3, gap: 0.06 },
  telegraph: { max: 2, gap: 0.1 },
  hurt: { max: 1, gap: 0.15 },
};

/** Render a sound, scaled so its peak never exceeds a safe ceiling (no clipping). */
export function renderSfx(id: string, sr: number): Float32Array | null {
  const gen = SFX[id];
  if (!gen) return null;
  const data = gen(sr);
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const ceiling = 0.85;
  if (peak > ceiling) {
    const k = ceiling / peak;
    for (let i = 0; i < data.length; i++) data[i] *= k;
  }
  return data;
}

export { pluck as pluckString, N as midi };
