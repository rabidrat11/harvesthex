// Player settings, stored separately from the profile so a corrupted save
// never resets someone's volume or key bindings (and vice versa).

export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'dash'
  | 'interact'
  | 'consumable'
  | 'map'
  | 'pause'
  | 'inventory'
  | 'tool1'
  | 'tool2'
  | 'tool3'
  | 'tool4'
  | 'tool5';

export const ACTION_LABEL: Record<Action, string> = {
  up: 'Move up',
  down: 'Move down',
  left: 'Move left',
  right: 'Move right',
  dash: 'Dash',
  interact: 'Interact',
  consumable: 'Drink a jar',
  map: 'Loadout / character',
  pause: 'Pause',
  inventory: 'Inventory',
  tool1: 'Tool: hand',
  tool2: 'Tool: hoe',
  tool3: 'Tool: watering can',
  tool4: 'Tool: seeds',
  tool5: 'Tool: compost',
};

export interface Settings {
  version: number;
  master: number;
  music: number;
  sfx: number;
  screenShake: number;
  damageNumbers: 'all' | 'crits' | 'off';
  autoAim: boolean;
  autoFire: boolean;
  highContrast: boolean;
  reducedEffects: boolean;
  intensity: 'gentle' | 'standard';
  scaling: 'pixel' | 'fit';
  showHitbox: boolean;
  quality: 'high' | 'low';
  keys: Record<Action, string[]>;
}

export const DEFAULT_KEYS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  dash: ['Space'],
  interact: ['KeyE'],
  consumable: ['KeyQ'],
  map: ['Tab'],
  pause: ['Escape', 'KeyP'],
  inventory: ['KeyI'],
  tool1: ['Digit1'],
  tool2: ['Digit2'],
  tool3: ['Digit3'],
  tool4: ['Digit4'],
  tool5: ['Digit5'],
};

export function defaultSettings(): Settings {
  return {
    version: 1,
    master: 0.8,
    music: 0.6,
    sfx: 0.8,
    screenShake: 1,
    damageNumbers: 'all',
    autoAim: false,
    autoFire: false,
    highContrast: false,
    reducedEffects: false,
    intensity: 'standard',
    scaling: 'pixel',
    showHitbox: true,
    quality: 'high',
    keys: structuredClone(DEFAULT_KEYS),
  };
}

const KEY = 'harvesthex.settings';

export function loadSettings(): Settings {
  const d = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw) as Partial<Settings>;
    const out: Settings = { ...d };
    for (const k of Object.keys(d) as (keyof Settings)[]) {
      if (k === 'keys') continue;
      if (s[k] !== undefined && typeof s[k] === typeof d[k]) (out as unknown as Record<string, unknown>)[k] = s[k];
    }
    out.keys = { ...d.keys };
    if (s.keys && typeof s.keys === 'object') {
      for (const a of Object.keys(d.keys) as Action[]) {
        const v = (s.keys as Record<string, unknown>)[a];
        if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out.keys[a] = v as string[];
      }
    }
    for (const k of ['master', 'music', 'sfx', 'screenShake'] as const) out[k] = Math.max(0, Math.min(1, Number(out[k]) || 0));
    return out;
  } catch {
    return d;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: settings simply do not persist */
  }
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: 'Space',
    Escape: 'Esc',
    Tab: 'Tab',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ShiftLeft: 'Shift',
    ShiftRight: 'R Shift',
    ControlLeft: 'Ctrl',
    Enter: 'Enter',
    Backquote: '`',
  };
  return map[code] ?? code;
}
