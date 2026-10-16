// The home farm, laid out by hand. 48x30 tiles of 16px. Building positions
// are bottom-centre (the sprites' origin); `solid` rectangles are relative to
// that point; `use` is where the player stands to interact.

export const FARM_W = 768;
export const FARM_H = 480;

export interface Building {
  id: string;
  sprite: string;
  x: number;
  y: number;
  solid: [number, number, number, number];
  use: [number, number];
  label: string;
  verb: string;
}

export const BUILDINGS: Building[] = [
  { id: 'farmhouse', sprite: 'b_farmhouse', x: 112, y: 150, solid: [-44, -40, 87, 40], use: [-2, 6], label: 'Farmhouse', verb: 'Go inside' },
  { id: 'archive', sprite: 'b_archive', x: 208, y: 146, solid: [-23, -30, 45, 30], use: [0, 8], label: 'Seed Archive', verb: 'Browse the archive' },
  { id: 'bench', sprite: 'b_bench', x: 270, y: 144, solid: [-16, -14, 32, 14], use: [0, 10], label: 'Mutation Bench', verb: 'Use the bench' },
  { id: 'gate', sprite: 'b_gate', x: 384, y: 66, solid: [-28, -30, 56, 18], use: [0, 14], label: 'The Meadow Gate', verb: 'Set out' },
  { id: 'smithy', sprite: 'b_smithy', x: 584, y: 146, solid: [-36, -40, 72, 32], use: [4, 10], label: 'Bertha’s Smithy', verb: 'Talk to Bertha' },
  { id: 'potting', sprite: 'b_potting', x: 452, y: 196, solid: [-16, -10, 32, 10], use: [0, 10], label: 'Potting Bench', verb: 'Prepare your loadout' },
  { id: 'pump', sprite: 'b_pump', x: 182, y: 278, solid: [-9, -8, 19, 8], use: [10, 8], label: 'Irrigation Pump', verb: 'Check the pump' },
  { id: 'compost', sprite: 'b_compost', x: 404, y: 290, solid: [-12, -9, 24, 9], use: [0, 10], label: 'Compost Bin', verb: 'Open the compost bin' },
  { id: 'shrine', sprite: 'b_shrine', x: 640, y: 330, solid: [-20, -12, 40, 12], use: [0, 10], label: 'Old Mother Turnip', verb: 'Pay your respects' },
];

/** Pond tiles (water). */
export const POND: [number, number, number, number] = [5, 16, 5, 5];

/** Dirt paths as tile rectangles [tx, ty, w, h]. */
export const PATHS: [number, number, number, number][] = [
  [23, 4, 2, 7], // from the gate down
  [6, 9, 36, 2], // the main lane in front of the buildings
  [14, 11, 2, 11], // along the west side of the beds
  [22, 11, 2, 11], // along the east side of the beds
  [14, 21, 10, 1], // below the beds
  [10, 15, 4, 2], // to the pond
  [24, 13, 6, 1], // to the potting bench
  [28, 11, 2, 1],
  [24, 18, 2, 1], // towards the compost bin
  [26, 18, 1, 1],
  [30, 11, 2, 9], // down to the shrine
  [30, 19, 8, 2],
];

export interface DecorPlacement {
  sprite: string;
  x: number;
  y: number;
  solid?: number;
  flip?: boolean;
  anim?: boolean;
}

export const DECOR: DecorPlacement[] = [
  // Top wall either side of the gate.
  ...Array.from({ length: 22 }, (_, i) => ({ sprite: 'd_wall_h', x: 8 + i * 16, y: 66 })),
  ...Array.from({ length: 22 }, (_, i) => ({ sprite: 'd_wall_h', x: 420 + i * 16, y: 66 })),
  // Around the farmhouse.
  { sprite: 'd_barrel', x: 52, y: 154, solid: 6 },
  { sprite: 'd_crate', x: 66, y: 156, solid: 6 },
  { sprite: 'd_flower_0', x: 80, y: 160 },
  { sprite: 'd_flower_1', x: 90, y: 158 },
  { sprite: 'd_flower_2', x: 136, y: 160 },
  { sprite: 'd_flower_3', x: 146, y: 158 },
  { sprite: 'd_lantern', x: 160, y: 160, solid: 3, anim: true },
  { sprite: 'd_sack', x: 240, y: 150, solid: 5 },
  // The smithy yard.
  { sprite: 'd_toolrack', x: 636, y: 140, solid: 7 },
  { sprite: 'd_barrel', x: 646, y: 156, solid: 6 },
  { sprite: 'd_haybale', x: 508, y: 150, solid: 9 },
  { sprite: 'd_crate', x: 526, y: 154, solid: 6 },
  { sprite: 'd_lantern', x: 352, y: 108, solid: 3, anim: true },
  { sprite: 'd_lantern', x: 416, y: 108, solid: 3, anim: true },
  { sprite: 'd_signpost', x: 410, y: 96, solid: 4 },
  // Fences around the beds (gaps where paths enter).
  ...Array.from({ length: 8 }, (_, i) => ({ sprite: 'd_fence_h', x: 248 + i * 16, y: 180, solid: 6 })).filter((_, i) => i !== 0 && i !== 7),
  { sprite: 'd_fence_post', x: 238, y: 180, solid: 3 },
  { sprite: 'd_fence_post', x: 374, y: 180, solid: 3 },
  // Pond side.
  { sprite: 'd_rock_l', x: 66, y: 352, solid: 10 },
  { sprite: 'd_rock_s', x: 152, y: 350, solid: 4 },
  { sprite: 'd_mushrooms', x: 60, y: 300 },
  { sprite: 'd_tuft_0', x: 168, y: 300 },
  // Shrine grove.
  { sprite: 'd_tree_oak', x: 700, y: 300, solid: 7 },
  { sprite: 'd_tree_oak', x: 580, y: 360, solid: 7, flip: true },
  { sprite: 'd_bush', x: 610, y: 300, solid: 7 },
  { sprite: 'd_flower_1', x: 618, y: 336 },
  { sprite: 'd_flower_3', x: 662, y: 340 },
  { sprite: 'd_flower_0', x: 676, y: 334 },
  { sprite: 'd_stump', x: 520, y: 330, solid: 6 },
  // Edges of the farm.
  ...[30, 90, 150, 210, 270, 330, 390, 450].map((y, i) => ({ sprite: i % 2 ? 'd_bush' : 'd_tree_oak', x: 10, y: y + 30, solid: 7 })),
  ...[100, 160, 220, 280, 340, 400].map((y, i) => ({ sprite: i % 2 ? 'd_tree_oak' : 'd_bush', x: 758, y: y + 40, solid: 7, flip: true })),
  ...[60, 130, 200, 270, 330, 470, 540].map((x, i) => ({ sprite: i % 3 === 0 ? 'd_tree_oak' : 'd_bush', x, y: 478, solid: 7 })),
  { sprite: 'd_haybale', x: 470, y: 400, solid: 9 },
  { sprite: 'd_cart_broken', x: 300, y: 420, solid: 10 },
  { sprite: 'd_well', x: 520, y: 260, solid: 10 },
  { sprite: 'd_tuft_1', x: 470, y: 330 },
  { sprite: 'd_tuft_2', x: 360, y: 380 },
  { sprite: 'd_tuft_0', x: 230, y: 400 },
  { sprite: 'd_flower_2', x: 420, y: 360 },
  { sprite: 'd_flower_0', x: 250, y: 360 },
];

/** Tiles where the scarecrow may appear overnight. */
export const SCARECROW_SPOTS: [number, number][] = [
  [23, 12],
  [15, 17],
  [27, 16],
  [12, 24],
  [34, 24],
  [20, 25],
  [26, 22],
  [9, 13],
];

export const PLAYER_START = { x: 384, y: 112 };
export const PLAYER_HOME = { x: 112, y: 168 };
