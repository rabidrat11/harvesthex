// Every sprite group, keyed by the name used in docs/ART_MANIFEST.md and
// `npm run art -- <group>`.
import type { SpriteDef } from './sprite';
import { SPRITES as characters } from './sprites/characters';
import { SPRITES as creatures } from './sprites/creatures';
import { SPRITES as crops } from './sprites/crops';
import { SPRITES as world } from './sprites/world';
import { SPRITES as combat } from './sprites/combat';
import { SPRITES as ui } from './sprites/ui';

export const SPRITE_GROUPS: Record<string, SpriteDef[]> = { characters, creatures, crops, world, combat, ui };

export const ALL_SPRITES: SpriteDef[] = Object.values(SPRITE_GROUPS).flat();
