// HARVESTHEX palette.
//
// Everything original in the game is drawn from Endesga 64, which is the same
// palette the Cute Fantasy icon pack is painted in, so our sprites sit next to
// the pack's icons without looking pasted in. Outlines are pure black (`ink`),
// again matching the pack.

export const PAL = {
  ink: '#000000',

  // neutrals
  void: '#131313',
  coal: '#1b1b1b',
  soot: '#272727',
  ash: '#3d3d3d',
  slate: '#5d5d5d',
  stone: '#858585',
  pebble: '#b4b4b4',
  white: '#ffffff',

  // cool greys
  mist: '#c7cfdd',
  fog: '#92a1b9',
  dusk: '#657392',
  storm: '#424c6e',
  night: '#2a2f4e',
  abyss: '#1a1932',
  deep: '#0e071b',

  // earth and skin
  umber: '#1c121c',
  loam: '#391f21',
  bark: '#5d2c28',
  wood: '#8a4836',
  clay: '#bf6f4a',
  skin: '#e69c69',
  peach: '#f6ca9f',
  cream: '#f9e6cf',

  // harvest
  wheat: '#edab50',
  rust: '#e07438',
  brick: '#c64524',
  blood: '#8e251d',
  flame: '#ff5000',
  orange: '#ed7614',
  amber: '#ffa214',
  gold: '#ffc825',
  butter: '#ffeb57',

  // greens
  lime: '#d3fc7e',
  sprout: '#99e65f',
  leaf: '#5ac54f',
  moss: '#33984b',
  pine: '#1e6f50',
  teal: '#134c4c',
  marsh: '#0c2e44',

  // blues
  navy: '#00396d',
  blue: '#0069aa',
  sky: '#0098dc',
  cyan: '#00cdf9',
  aqua: '#0cf1ff',
  ice: '#94fdff',

  // magic
  blush: '#fdd2ed',
  orchid: '#f389f5',
  violet: '#db3ffd',
  purple: '#7a09fa',
  indigo: '#3003d9',
  ultra: '#0c0293',
  midnight: '#03193f',
  plumdark: '#3b1443',
  plum: '#622461',
  mauve: '#93388f',
  magenta: '#ca52c9',
  rose: '#c85086',
  salmon: '#f68187',
  coral: '#f5555d',
  red: '#ea323c',
  crimson: '#c42430',
  wine: '#891e2b',
  maroon: '#571c27',
  hot: '#ff0040',
} as const;

export type PalName = keyof typeof PAL;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Phaser-style 0xRRGGBB for a palette entry. */
export function col(name: PalName): number {
  return hexToInt(PAL[name]);
}
