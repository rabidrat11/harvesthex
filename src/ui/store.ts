// A tiny observable store shared by Phaser scenes (writers) and Preact
// components (readers). Per-frame HUD numbers are pushed at a throttled rate.

import { useEffect, useState } from 'preact/hooks';
import type { RunResult } from '../meta/results';

export type Screen = 'loading' | 'title' | 'farm' | 'expedition';

export type Panel =
  | 'settings'
  | 'controls'
  | 'credits'
  | 'newgame'
  | 'corrupt'
  | 'pause'
  | 'levelup'
  | 'shop'
  | 'chest'
  | 'extract'
  | 'results'
  | 'inventory'
  | 'character'
  | 'potting'
  | 'bench'
  | 'archive'
  | 'smithy'
  | 'farmhouse'
  | 'compost'
  | 'shrine'
  | 'dialogue'
  | 'intro';

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'warn' | 'info' | 'loot' | 'rare' | 'legendary';
  icon?: string;
  t: number;
}

export interface WeaponHud {
  id: string;
  name: string;
  icon: string;
  level: number;
  traits: string[];
  cd: number;
  evolved: boolean;
  canEvolve: boolean;
}

export interface ExpeditionHud {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  sap: number;
  farthings: number;
  time: number;
  acre: number;
  acreName: string;
  acreProgress: number;
  phase: string;
  weapons: WeaponHud[];
  held: WeaponHud;
  dashCd: number;
  dashMax: number;
  activeCd: number;
  activeMax: number;
  activeName: string;
  jars: number;
  boss: { name: string; hp: number; max: number; phase: number } | null;
  elite: { name: string; hp: number; max: number } | null;
  shields: number;
  prompt: string | null;
  canPressOn: boolean;
  region: string;
  tier: number;
  objective: number | null;
}

export interface Banner {
  title: string;
  sub?: string;
  tone: 'acre' | 'boss' | 'good' | 'warn';
  t: number;
}

export interface UiState {
  screen: Screen;
  panel: Panel | null;
  panelData: any;
  back: { panel: Panel; data: any }[];
  hud: ExpeditionHud | null;
  farm: { prompt: string | null; tool: number; seed: number; hint: string | null; version: number; plotTip?: string | null } | null;
  toasts: Toast[];
  banner: Banner | null;
  results: RunResult | null;
  version: number;
  zoom: number;
  fade: boolean;
}

let state: UiState = {
  screen: 'loading',
  panel: null,
  panelData: null,
  back: [],
  hud: null,
  farm: null,
  toasts: [],
  banner: null,
  results: null,
  version: 0,
  zoom: 2,
  fade: false,
};

const listeners = new Set<() => void>();
let toastId = 1;

export const ui = {
  get: () => state,
  set(patch: Partial<UiState>) {
    state = { ...state, ...patch };
    for (const l of listeners) l();
  },
  /** Force a re-render after mutating shared game objects in place. */
  bump() {
    ui.set({ version: state.version + 1 });
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  open(panel: Panel, data: any = null) {
    ui.set({ panel, panelData: data });
  },
  /** Open a panel on top of the current one; closing returns to it. */
  push(panel: Panel, data: any = null) {
    const back = state.panel ? [...state.back, { panel: state.panel, data: state.panelData }] : state.back;
    ui.set({ panel, panelData: data, back });
  },
  close() {
    const back = [...state.back];
    const prev = back.pop();
    if (prev) ui.set({ panel: prev.panel, panelData: prev.data, back });
    else ui.set({ panel: null, panelData: null, back: [] });
  },
  closeAll() {
    ui.set({ panel: null, panelData: null, back: [] });
  },
  toast(text: string, tone: Toast['tone'] = 'info', icon?: string) {
    const t: Toast = { id: toastId++, text, tone, icon, t: performance.now() };
    const toasts = [...state.toasts, t].slice(-5);
    ui.set({ toasts });
    setTimeout(() => ui.set({ toasts: state.toasts.filter((x) => x.id !== t.id) }), tone === 'legendary' ? 6000 : 3800);
  },
  banner(title: string, sub: string | undefined, tone: Banner['tone']) {
    const b: Banner = { title, sub, tone, t: performance.now() };
    ui.set({ banner: b });
    setTimeout(() => {
      if (state.banner === b) ui.set({ banner: null });
    }, tone === 'boss' ? 3600 : 2600);
  },
};

export function useUi<T>(sel: (s: UiState) => T): T {
  const [, force] = useState(0);
  useEffect(() => ui.subscribe(() => force((n) => n + 1)), []);
  return sel(state);
}

/** Handlers the active scene exposes to the interface. */
export const bridge: {
  expedition: null | {
    chooseOffer(i: number): void;
    reroll(): void;
    resume(): void;
    abandon(): void;
    shopBuy(i: number): void;
    shopLock(i: number): void;
    shopReroll(): void;
    shopTea(): void;
    shopBargain(): void;
    pressOn(): void;
    extract(): void;
    chestTake(i: number): void;
    finish(): void;
    wakeWatcher(): void;
  };
  farm: null | {
    depart(): void;
    refresh(): void;
    closePanel(): void;
  };
  title: null | { start(newGame: boolean): void };
} = { expedition: null, farm: null, title: null };
