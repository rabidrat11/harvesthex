// A small procedural soundtrack. Each track is a loop of chords and hand-
// written melodies, scheduled ahead on the audio clock and played by synth
// instruments: a plucked lute, a fiddle, a breathy flute, a bodhran.
//
//   farm    gentle D major, faintly mysterious (a borrowed minor chord)
//   meadow  driving 6/8 jig in D dorian; layers build with intensity
//   boss    percussive E phrygian with a drone
//   title   the farm theme, sparser

import { pluckString } from './synth';

export type TrackId = 'farm' | 'meadow' | 'boss' | 'title' | 'victory';

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Inst = 'lute' | 'bass' | 'harp' | 'flute' | 'fiddle' | 'pad' | 'bodhran' | 'tap' | 'shaker' | 'tom' | 'drone';

interface Ev {
  step: number;
  inst: Inst;
  midi?: number;
  len: number;
  vel: number;
  layer?: number;
}

interface Track {
  bpm: number;
  stepsPerBeat: number;
  steps: number;
  events: Ev[];
}

// --- composition helpers -----------------------------------------------------

const D = 62;
function chordTones(root: number, minor: boolean) {
  return [root, root + (minor ? 3 : 4), root + 7];
}

/** "D4 . E4 F#4" style melody: one token per step, '.' sustains, '-' rests. */
function melody(inst: Inst, start: number, tokens: string, vel: number, layer = 0): Ev[] {
  const names: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const out: Ev[] = [];
  const toks = tokens.trim().split(/\s+/);
  let cur: Ev | null = null;
  toks.forEach((t, i) => {
    if (t === '.') {
      if (cur) cur.len++;
      return;
    }
    cur = null;
    if (t === '-') return;
    const m = /^([A-G])([#b]?)(\d)$/.exec(t);
    if (!m) return;
    const midi = 12 * (Number(m[3]) + 1) + names[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    cur = { step: start + i, inst, midi, len: 1, vel, layer };
    out.push(cur);
  });
  return out;
}

function farmTrack(sparse: boolean): Track {
  const ev: Ev[] = [];
  // D | Bm | G | A | D | F#m | Gm | A   (bar 7 borrows G minor: the mystery)
  const bars: [number, boolean][] = [
    [D, false],
    [D - 3, true],
    [D - 7, false],
    [D - 5, false],
    [D, false],
    [D + 4 - 12, true],
    [D - 7, true],
    [D - 5, false],
  ];
  bars.forEach(([root, minor], b) => {
    const s = b * 16;
    const [r, t, f] = chordTones(root, minor);
    const arp = [r, f, r + 12, t + 12, r + 12, f, t + 12, f];
    arp.forEach((n, i) => {
      if (sparse && i % 2 === 1) return;
      ev.push({ step: s + i * 2, inst: 'lute', midi: n, len: 2, vel: i === 0 ? 0.5 : 0.32 });
    });
    ev.push({ step: s, inst: 'bass', midi: r - 12, len: 8, vel: 0.5 });
    ev.push({ step: s + 8, inst: 'bass', midi: f - 12, len: 8, vel: 0.35 });
    ev.push({ step: s, inst: 'pad', midi: r, len: 16, vel: 0.12 });
    ev.push({ step: s, inst: 'pad', midi: t, len: 16, vel: 0.1 });
    if (!sparse && b % 2 === 1) ev.push({ step: s + 14, inst: 'shaker', len: 1, vel: 0.12 });
  });
  if (!sparse) {
    // A wandering flute line over bars 1-8, played on the second pass only.
    ev.push(
      ...melody(
        'flute',
        0,
        `- - - - - - - - A4 . . . B4 . A4 .
         F#4 . . . . . . . - - D4 . E4 . F#4 .
         G4 . . . F#4 . E4 . D4 . . . B3 . . .
         C#4 . . . E4 . . . A4 . . . . . . .
         A4 . . . D5 . . . C#5 . A4 . B4 . A4 .
         F#4 . . . . . . . A4 . . . F#4 . E4 .
         D4 . . . Bb3 . . . D4 . G4 . . . . .
         E4 . . . . . . . C#4 . . . . . . .`,
        0.16,
        1,
      ),
    );
  }
  return { bpm: sparse ? 70 : 80, stepsPerBeat: 4, steps: 128, events: ev };
}

function meadowTrack(): Track {
  const ev: Ev[] = [];
  // 6/8: six eighths per bar. Dm | C | Dm | Am | Dm | C | Bb | C
  const roots: [number, boolean][] = [
    [D, true],
    [D - 2, false],
    [D, true],
    [D + 7 - 12, true],
    [D, true],
    [D - 2, false],
    [D - 4, false],
    [D - 2, false],
  ];
  roots.forEach(([root, minor], b) => {
    const s = b * 6;
    const [r, t, f] = chordTones(root, minor);
    // Bodhran: DUM . ta ka DUM .
    ev.push({ step: s, inst: 'bodhran', len: 1, vel: 0.7 });
    ev.push({ step: s + 2, inst: 'tap', len: 1, vel: 0.35 });
    ev.push({ step: s + 3, inst: 'bodhran', len: 1, vel: 0.45 });
    ev.push({ step: s + 5, inst: 'tap', len: 1, vel: 0.3 });
    ev.push({ step: s, inst: 'bass', midi: r - 24, len: 3, vel: 0.55 });
    ev.push({ step: s + 3, inst: 'bass', midi: f - 24, len: 3, vel: 0.4 });
    ev.push({ step: s, inst: 'lute', midi: r, len: 2, vel: 0.28 });
    ev.push({ step: s + 1, inst: 'lute', midi: t, len: 2, vel: 0.2 });
    ev.push({ step: s + 3, inst: 'lute', midi: f, len: 2, vel: 0.24 });
    ev.push({ step: s + 4, inst: 'lute', midi: t + 12, len: 2, vel: 0.18 });
    for (let k = 0; k < 6; k++) ev.push({ step: s + k, inst: 'shaker', len: 1, vel: k % 3 === 0 ? 0.14 : 0.08, layer: 2 });
  });
  // The jig. Layer 1 comes in once the fight is on.
  ev.push(
    ...melody(
      'fiddle',
      0,
      `D5 . A4 F4 A4 D5
       E5 . C5 G4 C5 E5
       F5 E5 D5 C5 A4 F4
       E4 . A4 C5 . E5
       D5 . A4 F4 G4 A4
       C5 . E5 G5 F5 E5
       D5 C5 Bb4 A4 . G4
       A4 . . G4 . E4`,
      0.17,
      1,
    ),
  );
  return { bpm: 76 * 3, stepsPerBeat: 1, steps: 48, events: ev };
}

function bossTrack(): Track {
  const ev: Ev[] = [];
  const E = 40;
  for (let b = 0; b < 4; b++) {
    const s = b * 16;
    for (const k of [0, 3, 6, 8, 10, 11, 14]) ev.push({ step: s + k, inst: 'tom', len: 1, vel: k === 0 || k === 8 ? 0.8 : 0.45 });
    for (let k = 0; k < 16; k += 2) ev.push({ step: s + k + 1, inst: 'shaker', len: 1, vel: 0.1 });
    ev.push({ step: s, inst: 'drone', midi: E, len: 16, vel: 0.22 });
    if (b % 2 === 1) {
      for (const n of [E + 24, E + 25, E + 31]) ev.push({ step: s, inst: 'harp', midi: n, len: 4, vel: 0.22 });
      for (const n of [E + 24, E + 25, E + 30]) ev.push({ step: s + 6, inst: 'harp', midi: n, len: 4, vel: 0.2 });
    }
    ev.push({ step: s, inst: 'bass', midi: E - 12 + (b === 2 ? 1 : 0), len: 4, vel: 0.6 });
    ev.push({ step: s + 8, inst: 'bass', midi: E - 12 + (b === 3 ? 3 : 0), len: 4, vel: 0.5 });
  }
  ev.push(...melody('fiddle', 0, `E4 . . . F4 . . . G4 . F4 . E4 . . . D4 . . . E4 . . . F4 . . . . . . . E4 . . . F4 . . . Bb4 . A4 . G4 . F4 . E4 . . . . . . . . . . . . . . .`, 0.13, 1));
  return { bpm: 140, stepsPerBeat: 4, steps: 64, events: ev };
}

function victoryTrack(): Track {
  const ev: Ev[] = [];
  const notes = [62, 66, 69, 74, 78, 81, 86];
  notes.forEach((n, i) => ev.push({ step: i, inst: 'harp', midi: n, len: 4, vel: 0.3 }));
  ev.push({ step: 8, inst: 'pad', midi: 62, len: 24, vel: 0.15 }, { step: 8, inst: 'pad', midi: 66, len: 24, vel: 0.12 }, { step: 8, inst: 'pad', midi: 69, len: 24, vel: 0.12 });
  ev.push(...melody('flute', 8, `A4 . . . D5 . . . F#5 . . . E5 . D5 . E5 . . . . . . .`, 0.18));
  return { bpm: 100, stepsPerBeat: 4, steps: 64, events: ev };
}

const TRACKS: Record<TrackId, () => Track> = {
  farm: () => farmTrack(false),
  title: () => farmTrack(true),
  meadow: meadowTrack,
  boss: bossTrack,
  victory: victoryTrack,
};

// --- playback -------------------------------------------------------------------

export class Music {
  private out: GainNode;
  private filter: BiquadFilterNode;
  private cache = new Map<string, AudioBuffer>();
  private current: { id: TrackId; track: Track; gain: GainNode; nextStep: number; nextTime: number; loop: number } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  intensity = 0;
  private noiseBuf: AudioBuffer;

  constructor(private ctx: AudioContext, dest: AudioNode) {
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 18000;
    this.out = ctx.createGain();
    this.out.connect(this.filter);
    this.filter.connect(dest);
    const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = n.getChannelData(0);
    let s = 9;
    for (let i = 0; i < d.length; i++) {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      d[i] = ((s >>> 0) / 4294967296) * 2 - 1;
    }
    this.noiseBuf = n;
  }

  /** The track currently playing, if any. */
  get track(): TrackId | null {
    return this.current?.id ?? null;
  }

  setMuffled(on: boolean) {
    this.filter.frequency.setTargetAtTime(on ? 650 : 18000, this.ctx.currentTime, 0.15);
  }

  setIntensity(n: number) {
    this.intensity = n;
  }

  play(id: TrackId | null) {
    if (this.current?.id === id) return;
    const t = this.ctx.currentTime;
    if (this.current) {
      const g = this.current.gain;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => g.disconnect(), 1500);
      this.current = null;
    }
    if (!id) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(1, t + 1.0);
    gain.connect(this.out);
    this.current = { id, track: TRACKS[id](), gain, nextStep: 0, nextTime: t + 0.1, loop: 0 };
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }

  private schedule() {
    const c = this.current;
    if (!c) return;
    const ahead = this.ctx.currentTime + 0.18;
    const stepDur = 60 / c.track.bpm / c.track.stepsPerBeat;
    while (c.nextTime < ahead) {
      const step = c.nextStep;
      for (const e of c.track.events) {
        if (e.step !== step) continue;
        if (e.layer === 1 && c.loop === 0 && c.id !== 'boss' && c.id !== 'victory') continue;
        if (e.layer === 2 && this.intensity < 2) continue;
        this.note(e, c.nextTime, stepDur, c.gain);
      }
      c.nextStep++;
      c.nextTime += stepDur;
      if (c.nextStep >= c.track.steps) {
        c.nextStep = 0;
        c.loop++;
        if (c.id === 'victory') {
          this.play(null);
          return;
        }
      }
    }
  }

  private pluckBuf(midi: number, bright: number, dur: number) {
    const key = `${midi}:${bright}:${dur}`;
    let b = this.cache.get(key);
    if (!b) {
      const data = pluckString(this.ctx.sampleRate, midiHz(midi), dur, bright, 1, midi);
      b = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
      b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      this.cache.set(key, b);
    }
    return b;
  }

  private playBuf(b: AudioBuffer, t: number, vel: number, dest: AudioNode, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vel;
    s.connect(g);
    g.connect(dest);
    s.start(t);
    s.onended = () => g.disconnect();
  }

  private drum(kind: 'bodhran' | 'tap' | 'shaker' | 'tom', t: number, vel: number, dest: AudioNode) {
    const c = this.ctx;
    if (kind === 'shaker' || kind === 'tap') {
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = kind === 'shaker' ? 'highpass' : 'bandpass';
      f.frequency.value = kind === 'shaker' ? 6000 : 1800;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel * 0.6, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'shaker' ? 0.05 : 0.04));
      s.connect(f);
      f.connect(g);
      g.connect(dest);
      s.start(t, Math.random() * 0.5, 0.1);
      return;
    }
    const o = c.createOscillator();
    const g = c.createGain();
    const f0 = kind === 'tom' ? 130 : 95;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(kind === 'tom' ? 55 : 52, t + 0.18);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'tom' ? 0.42 : 0.3));
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + 0.5);
    // A puff of skin noise on top.
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const lf = c.createBiquadFilter();
    lf.type = 'lowpass';
    lf.frequency.value = 900;
    const ng = c.createGain();
    ng.gain.setValueAtTime(vel * 0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(lf);
    lf.connect(ng);
    ng.connect(dest);
    s.start(t, Math.random() * 0.5, 0.1);
  }

  private note(e: Ev, t: number, stepDur: number, dest: AudioNode) {
    const c = this.ctx;
    const dur = e.len * stepDur;
    switch (e.inst) {
      case 'lute':
        this.playBuf(this.pluckBuf(e.midi!, 0.5, 1.8), t, e.vel, dest);
        break;
      case 'harp':
        this.playBuf(this.pluckBuf(e.midi!, 0.85, 2.2), t, e.vel, dest);
        break;
      case 'bass':
        this.playBuf(this.pluckBuf(e.midi!, 0.2, 1.6), t, e.vel * 1.1, dest);
        break;
      case 'bodhran':
      case 'tap':
      case 'shaker':
      case 'tom':
        this.drum(e.inst, t, e.vel, dest);
        break;
      case 'flute':
      case 'fiddle':
      case 'pad':
      case 'drone': {
        const o = c.createOscillator();
        o.type = e.inst === 'fiddle' || e.inst === 'drone' ? 'sawtooth' : e.inst === 'pad' ? 'triangle' : 'sine';
        o.frequency.value = midiHz(e.midi!);
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = e.inst === 'fiddle' ? 5.5 : 4.5;
        lg.gain.setValueAtTime(0, t);
        lg.gain.linearRampToValueAtTime(midiHz(e.midi!) * (e.inst === 'pad' ? 0.002 : 0.006), t + Math.min(0.3, dur * 0.5));
        lfo.connect(lg);
        lg.connect(o.frequency);
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = e.inst === 'fiddle' ? 2200 : e.inst === 'drone' ? 420 : 3000;
        f.Q.value = e.inst === 'fiddle' ? 2 : 0.7;
        const g = c.createGain();
        const atk = e.inst === 'pad' ? 0.5 : e.inst === 'drone' ? 0.8 : e.inst === 'flute' ? 0.07 : 0.03;
        const rel = e.inst === 'pad' || e.inst === 'drone' ? 0.9 : 0.12;
        const vel = e.vel * (e.inst === 'fiddle' ? 0.5 : 1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vel, t + atk);
        g.gain.setValueAtTime(vel, t + Math.max(atk, dur - 0.02));
        g.gain.linearRampToValueAtTime(0, t + dur + rel);
        o.connect(f);
        f.connect(g);
        g.connect(dest);
        o.start(t);
        lfo.start(t);
        o.stop(t + dur + rel + 0.05);
        lfo.stop(t + dur + rel + 0.05);
        o.onended = () => g.disconnect();
        break;
      }
    }
  }
}
