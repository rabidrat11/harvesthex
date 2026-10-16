// Web Audio front end: buses for music and effects, lazy rendering of the
// procedural sounds, voice limits, and a little musicality (sap pickups climb
// a scale while you hoover them up).

import { SFX, SFX_LIMITS, renderSfx } from './synth';
import { Music, type TrackId } from './music';

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private playing = new Map<string, number[]>();
  private lastPlay = new Map<string, number>();
  private voices = 0;
  music: Music | null = null;
  private vol = { master: 0.8, music: 0.6, sfx: 0.8 };
  private sapStep = 0;
  private sapT = 0;
  private pendingTrack: TrackId | null = null;
  muted = false;

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
    } catch {
      return;
    }
    const c = this.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    this.master = c.createGain();
    this.sfxBus = c.createGain();
    this.musicBus = c.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(comp);
    comp.connect(c.destination);
    this.applyVolumes();
    this.music = new Music(c, this.musicBus);
    if (this.pendingTrack) this.music.play(this.pendingTrack);
  }

  setVolumes(master: number, music: number, sfx: number) {
    this.vol = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  }

  private buffer(id: string): AudioBuffer | null {
    const hit = this.buffers.get(id);
    if (hit) return hit;
    if (!SFX[id] || !this.ctx) return null;
    const data = renderSfx(id, this.ctx.sampleRate)!;
    const b = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
    b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    this.buffers.set(id, b);
    return b;
  }

  /** Render every sound ahead of time (called after unlock, spread over frames). */
  warm() {
    if (!this.ctx) return;
    const ids = Object.keys(SFX);
    let i = 0;
    const step = () => {
      for (let k = 0; k < 6 && i < ids.length; k++) this.buffer(ids[i++]);
      if (i < ids.length) setTimeout(step, 16);
    };
    step();
  }

  play(id: string, volume = 1, pitch = 1) {
    const c = this.ctx;
    if (!c || this.muted) return;
    const now = c.currentTime;
    const lim = SFX_LIMITS[id] ?? { max: 6, gap: 0.015 };
    const last = this.lastPlay.get(id) ?? -1;
    if (now - last < lim.gap) return;
    const live = (this.playing.get(id) ?? []).filter((end) => end > now);
    if (live.length >= lim.max) return;
    if (this.voices > 28) return;
    const b = this.buffer(id);
    if (!b) return;
    const src = c.createBufferSource();
    src.buffer = b;
    let rate = pitch * (0.95 + Math.random() * 0.1);
    if (id === 'sap') {
      // Consecutive pickups climb a pentatonic scale.
      if (now - this.sapT > 0.6) this.sapStep = 0;
      this.sapT = now;
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      rate = Math.pow(2, (scale[Math.min(scale.length - 1, this.sapStep)] - 5) / 12);
      this.sapStep++;
    }
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = Math.min(1.2, volume);
    src.connect(g);
    g.connect(this.sfxBus);
    src.start();
    const end = now + b.duration / rate;
    live.push(end);
    this.playing.set(id, live);
    this.lastPlay.set(id, now);
    this.voices++;
    src.onended = () => {
      this.voices--;
      g.disconnect();
    };
  }

  playMusic(track: TrackId | null) {
    this.pendingTrack = track;
    if (this.music) this.music.play(track);
  }

  /** Duck the music under big moments. */
  duck(amount: number, time: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = this.vol.music * 0.55;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(v * (1 - amount), t + 0.05);
    this.musicBus.gain.linearRampToValueAtTime(v, t + time);
  }

  setMuffled(on: boolean) {
    this.music?.setMuffled(on);
  }
}
