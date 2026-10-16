// HARVESTHEX crops group: growth stages, produce icons and seed packets.
// See docs/ART_MANIFEST.md, "Group: crops".
import type { SpriteDef } from '../sprite';
import { PLANTS } from './crops-plants';
import { PRODUCE } from './crops-produce';
import { SEEDS } from './crops-seeds';

export { SEED_FAMILY, type CropFamily } from './crops-seeds';

export const SPRITES: SpriteDef[] = [...PLANTS, ...PRODUCE, ...SEEDS];
