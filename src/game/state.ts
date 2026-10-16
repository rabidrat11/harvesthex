// Global services shared by scenes and the interface: the profile, settings,
// audio, input and the save routine. Kept deliberately small.

import { Input } from '../core/input';
import { AudioEngine } from '../audio/engine';
import { loadSettings, saveSettings, type Settings } from '../meta/settings';
import { loadProfile, saveProfile, type LoadResult } from '../meta/save';
import type { Profile } from '../meta/profile';
import type { Loadout } from '../sim/run';
import { EQUIPMENT } from '../data/farm';
import { CROPS } from '../data/crops';
import { accumulate, type StatMods } from '../data/stats';
import { applyResult, type RunResult } from '../meta/results';

class GameState {
  settings: Settings = loadSettings();
  profile: Profile | null = null;
  loadResult: LoadResult = { ok: false, reason: 'empty' };
  audio = new AudioEngine();
  input = new Input(() => this.settings);
  lastSaveOk = true;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadResult = loadProfile();
    if (this.loadResult.ok) this.profile = this.loadResult.profile;
    this.applyAudio();
  }

  applyAudio() {
    const s = this.settings;
    this.audio.setVolumes(s.master, s.music, s.sfx);
  }

  saveSettings() {
    saveSettings(this.settings);
    this.applyAudio();
  }

  save(): boolean {
    if (!this.profile) return false;
    this.lastSaveOk = saveProfile(this.profile);
    return this.lastSaveOk;
  }

  /** Debounced autosave for frequent small changes (planting, watering). */
  autosave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 400);
  }

  /** Bank an expedition that never finished (crash, refresh, closed tab). */
  recoverPendingRun(): RunResult | null {
    const p = this.profile;
    if (!p?.pendingRun) return null;
    try {
      const r = applyResult(p, { ...p.pendingRun });
      this.save();
      return r;
    } catch (e) {
      console.error('[save] could not recover the last expedition', e);
      p.pendingRun = null;
      this.save();
      return null;
    }
  }

  sfx(id: string, vol = 1) {
    this.audio.play(id, vol);
  }

  equipmentMods(): StatMods {
    const out: StatMods = {};
    const p = this.profile;
    if (!p) return out;
    for (const id of Object.values(p.equipment.equipped)) if (id && EQUIPMENT[id]) accumulate(out, EQUIPMENT[id].mods);
    return out;
  }

  /** Build the expedition loadout from the potting bench selection. */
  makeLoadout(seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0): Loadout {
    const p = this.profile!;
    const cls = p.classes.selected;
    return {
      classId: cls,
      region: 'meadow',
      tier: p.tiers.selected,
      seed,
      grafts: p.loadout.grafts
        .filter((g): g is NonNullable<typeof g> => !!g && !!CROPS[g.species]?.weapon)
        .map((g) => ({ species: g.species, weapon: CROPS[g.species].weapon!, traits: g.traits, quality: g.quality })),
      consumables: Object.entries(p.loadout.jars)
        .filter(([, n]) => n > 0)
        .map(([id, count]) => ({ id, count })),
      equipment: this.equipmentMods(),
      heldTier: p.heldTiers[cls] ?? 0,
      perks: [],
    };
  }
}

export const game = new GameState();
