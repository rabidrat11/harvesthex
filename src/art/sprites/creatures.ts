// Creatures group: Blighted Meadow enemies and the Marrow King.
// See docs/ART_MANIFEST.md ("Group: creatures") for names, sizes and frames.
import type { SpriteDef } from '../sprite';
import { PESTS } from './creatures-pests';
import { BEASTS } from './creatures-beasts';
import { HAUNTS } from './creatures-haunts';
import { ELITES } from './creatures-elites';
import { BOSS } from './creatures-boss';
import { SCARECROW } from './creatures-scarecrow';

export const SPRITES: SpriteDef[] = [...PESTS, ...BEASTS, ...HAUNTS, ...ELITES, ...BOSS, ...SCARECROW];
