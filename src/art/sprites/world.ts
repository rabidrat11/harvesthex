import type { SpriteDef } from '../sprite';
import { TERRAIN, TERRAIN_PREVIEW } from './world-terrain';
import { PROPS_SMALL } from './world-props';
import { LANDSCAPE } from './world-landscape';
import { BUILDINGS } from './world-buildings';

const SHOW_PREVIEWS = false;

export const SPRITES: SpriteDef[] = [...TERRAIN, ...PROPS_SMALL, ...LANDSCAPE, ...BUILDINGS, ...(SHOW_PREVIEWS ? TERRAIN_PREVIEW : [])];
