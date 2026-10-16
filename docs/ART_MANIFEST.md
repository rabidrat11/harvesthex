# HARVESTHEX art manifest and style guide

HARVESTHEX is a farming bullet-hell action RPG. A strange underground force,
**the Root**, has mutated the countryside: crops grow into weapons, fields grow
hostile ecosystems. Home is a cosy, half-abandoned farm; expeditions go into the
**Blighted Meadow**: yellowing grass, twisted wildflowers, old stone walls,
abandoned tools, corrupted purple-maroon soil. The first boss is **the Marrow
King**, a colossal crowned turnip, part harvest deity and part rotting woodland
ruler.

Tone: warm, earthy, a little eccentric, occasionally unsettling. Handcrafted
rustic fantasy pixel art. Never generic, never "AI fantasy". No emoji-like
shapes, no plain geometric blobs. Every sprite needs a readable silhouette and
some specific detail (a patch on a coat, a cracked pot, a sprouting leaf).

## Format (read `src/art/sprite.ts`)

Sprites are typed as rows of characters with a per-sprite legend:

```ts
import { sprite, overlay, flipX, shift, blank, type SpriteDef } from '../sprite';

sprite('crop_turnip',
  { w: 'cream', p: 'plum', P: 'mauve', g: 'leaf', G: 'moss' },   // char -> palette name
  [ frame0Rows, frame1Rows, ... ],                                   // one or more frames
  { outline: true, origin: [0.5, 1] },
)
```

- `.` and space are transparent. Every other character must be in the legend.
- Legend values are names from `src/art/palette.ts` (`PAL`). That palette is
  **Endesga 64**, the same palette the Cute Fantasy icon pack uses. Use only it.
- `outline: true` adds a 1px **black** 4-neighbour outline outside the shape
  (the pack's outline style). It grows the sprite by 1px on every side, so a
  14x18 drawing becomes 16x20. Design sizes below are **after** the outline.
- `mirror: 'odd' | 'even'` mirrors left halves for symmetric sprites.
- Frames of one sprite must all be the same size. Multi-frame sprites bake to
  `name_0`, `name_1`, ...
- Feel free to write TypeScript helpers to compose frames from parts
  (`overlay`, `shift`, `flipX`, `swapChars`) - animation from shared parts keeps
  frames consistent. Keep it readable.
- Preview with `npm run art -- <group>` (run from the project root),
  which writes `.art-preview/<group>.png` at 4x. Use `--scale 6` for detail.
  Look at the PNG with the Read tool. Iterate until it is genuinely good.
- `.art-preview/icons.png` shows the 190 Cute Fantasy pack icons (indexed 1-190)
  for style reference. The game uses those icons directly for items, ores,
  armour, weapons, food and potions, so **do not redraw them**; match their
  style instead (chunky, cute, black outline, soft 3-tone shading, bright
  saturated highlights).

## Style rules

1. **Pixel density**: 1 art pixel = 1 game pixel. The game renders at 640x360
   and scales up by whole numbers. Never draw something meant to be scaled.
2. **Outline**: pure black via `outline: true` on characters, creatures,
   props, buildings, icons, projectiles, pickups. Terrain tiles have **no**
   outline. Interior lines use the darkest tone of that material, not black.
3. **Light** comes from the top-left. 2-4 tones per material (shadow, base,
   light, occasional highlight). No pillow shading. Avoid noise dithering.
4. **Proportions**: chibi, like the pack: big heads (~45% of height), stubby
   limbs. Creatures are cute-but-wrong rather than gory.
5. **Readability**: hostile creatures carry a corruption accent - glowing
   magenta/violet/hot-pink eyes or plum-maroon rot - so they read as enemies
   against cosy farm colours. Player-side things are warm and earthy.
6. **Ground contrast**: farm grass is mid green (`leaf`/`moss`), meadow grass
   is yellowed (`wheat`, `amber`, `moss`, `bark`). Sprites must read on both.
7. **No baked ground shadows** under standing sprites. The engine draws a soft
   ellipse shadow.
8. **Facing**: side-view sprites face **right**; the engine flips for left.
9. **Origin**: standing things use `origin: [0.5, 1]` (bottom centre = feet).
   Projectiles, bullets, effects and icons use the default centre.

## Palette quick reference

neutrals `ink void coal soot ash slate stone pebble white`;
cool greys `mist fog dusk storm night abyss deep`;
earth/skin `umber loam bark wood clay skin peach cream`;
harvest `wheat rust brick blood flame orange amber gold butter`;
greens `lime sprout leaf moss pine teal marsh`;
blues `navy blue sky cyan aqua ice`;
magic `blush orchid violet purple indigo ultra midnight plumdark plum mauve magenta rose salmon coral red crimson wine maroon hot`.

---

## Group: characters (`src/art/sprites/characters.ts`)

Player classes. Each class has a different silhouette, readable at 1x:

- **fieldhand**: practical farmer. Wide-brimmed straw hat (`wheat`/`amber`),
  rolled sleeves, blue work overalls (`blue`/`navy`) over a cream shirt, brown
  boots, a red neckerchief.
- **botanist**: herbalist. Moss-green hooded mantle with a sprig of leaves or a
  small flower on the hood, round spectacles, a satchel strap, plum/violet
  accents.
- **reaper**: grim harvester who is still clearly a person. Deep charcoal hood
  and cowl, pale face, crimson scarf trailing, patched dark coat, bone buckle.

For each class `<c>` in `fieldhand botanist reaper`:

| name | frames | size (after outline) |
|---|---|---|
| `hero_<c>_down_idle` | 2 (breathing bob: body/head 1px) | 16x20 |
| `hero_<c>_down_walk` | 4 (contact, pass, contact, pass) | 16x20 |
| `hero_<c>_up_idle` | 2 | 16x20 |
| `hero_<c>_up_walk` | 4 | 16x20 |
| `hero_<c>_side_idle` | 2 (facing right) | 16x20 |
| `hero_<c>_side_walk` | 4 (facing right) | 16x20 |

Hands stay empty (the engine draws the held weapon). Keep feet on the bottom
row. All `origin: [0.5, 1]`. Build them from shared parts (body per direction
plus a class head/outfit) so the walk cycle is identical across classes.

Held weapons, drawn pointing **right** (angle 0), with `origin` at the grip:

| name | size | notes |
|---|---|---|
| `held_sling` | ~11x9 | forked hazel slingshot, leather pouch |
| `held_puffer` | ~13x9 | bellows with a toadstool-shaped nozzle |
| `held_scythe` | ~22x16 | old scythe, long snath, curved notched blade |

NPCs and props (`origin: [0.5, 1]`):

| name | frames | size | notes |
|---|---|---|---|
| `npc_bertha` | 2 idle | ~18x24 | village blacksmith: stout, sooty leather apron, headscarf, huge forearms, hammer on belt |
| `npc_mags` | 2 idle | ~16x24 | travelling seed pedlar: tall battered hat with feathers and seed packets tucked in band, patchwork coat, sly grin |
| `npc_snail_cart` | 2 (eye-stalks wiggle) | ~56x36 | Mags's covered cart pulled by a giant moss-shelled snail, hanging lantern, seed sacks |
| `farm_scarecrow` | 2 (slight sway) | ~18x30 | friendly-but-uncanny scarecrow on a post, burlap face, button eyes, patched coat |

Portraits, 32x32 after outline, bust framing, no background:
`portrait_fieldhand`, `portrait_botanist`, `portrait_reaper`, `portrait_bertha`,
`portrait_mags`, `portrait_mother_turnip` (the ancient turnip deity, serene,
moss and candles).

## Group: creatures (`src/art/sprites/creatures.ts`)

All `origin: [0.5, 1]`, side views face right. Sizes after outline.

| name | frames | size | notes |
|---|---|---|---|
| `en_nibbler_walk` | 3 | ~12x10 | fast swarming pest: a husk-furred vole with seed-pod ears, beady hot-pink eyes |
| `en_mudling_walk` | 4 | ~16x16 | slow tough lump of wet mud and pebbles, a weed sprouting from its head, glowing violet eyes |
| `en_moth_fly` | 3 | ~18x14 | blight moth: sickly mustard-green wings with eye spots, powdery, flies |
| `en_bristlehog_walk` | 2 | ~20x14 | boar-hedgehog with thistle bristles, tusks |
| `en_bristlehog_windup` | 1 | ~20x14 | crouched, bristles raised, eyes blazing |
| `en_bristlehog_charge` | 2 | ~20x14 | lowered head, legs blurred, motion |
| `en_husk_idle` | 2 | ~16x26 | Scarecrow Husk: hostile ragged scarecrow on a pole, sack head with stitched grin, burning violet eyes |
| `en_husk_cast` | 1 | ~16x26 | arms flung out, eyes blazing brighter |
| `en_sporeling_walk` | 2 | ~14x14 | waddling toadstool, plum cap with spots, splits on death |
| `en_sporelet_walk` | 2 | ~8x8 | tiny sporeling |
| `en_stalker_mound` | 2 | ~14x8 | moving dirt mound with root tips poking out (burrowed) |
| `en_stalker_emerge` | 3 | ~16x20 | gnarled root creature erupting from soil, thorn-toothed maw |
| `en_wraith_float` | 3 | ~16x22 | Harvest Wraith: ghostly wheat sheaf, hollow face, sickle hands, pale ice/fog with a violet core |
| `en_knight_walk` | 4 | ~24x26 | Bramble Knight elite: rusted armour overgrown with brambles, woven-thorn shield on its right (front) side |
| `en_knight_swing` | 2 | ~24x26 | sword sweep |
| `en_taxman_walk` | 2 | ~12x14 | the King's servant: a tiny turnip courtier with a ledger and a little hat |
| `en_witch_idle` | 2 | ~16x26 | Orchard Witch elite: apple-wood crone in a leafy shawl, glowing core-lantern |

Boss **the Marrow King**: colossal crowned turnip. Plum-and-cream turnip body,
cracked bark-like regal mantle of dark leaves, moss beard, crown carved from
old wood studded with amber, writhing roots splayed like a royal skirt, two
deep hollow eyes glowing hot-pink. Must read clearly in a storm of bullets:
strong silhouette, the crown is iconic.

| name | frames | size | notes |
|---|---|---|---|
| `boss_marrow_idle` | 2 | ~64x68 | regal breathing |
| `boss_marrow_cast` | 1 | ~64x68 | roots/arms raised, mouth open |
| `boss_marrow_slam` | 1 | ~64x68 | squashed down, roots slammed |
| `boss_marrow_p2_idle` | 2 | ~64x68 | phase 2: body split open showing glowing core, crown askew, roots writhing |
| `boss_marrow_death` | 4 | ~64x68 | withers and collapses into mulch; crown falls |
| `boss_crown` | 2 | ~14x12 | thrown spinning crown (`origin` centre) |
| `boss_root_column` | 3 | ~12x28 | thorn column erupting from ground (low, mid, full) |
| `boss_seed` | 2 | ~9x9 | royal seed pod, pulsing (`origin` centre) |
| `boss_root_tendril` | 2 | ~16x9 | horizontally tileable writhing root segment |

## Group: crops (`src/art/sprites/crops.ts`)

Species: `pea turnip carrot sunflower tomato pumpkin thornvine choircap
stormcorn beebalm chilli kingsmarrow`.

- `pea`: climbing pea vine on a little cane, fat green pods.
- `turnip`: purple-shouldered cream turnip.
- `carrot`: frilly tops, fat orange root.
- `sunflower` (tall): big golden face, slight smile in the seed pattern.
- `tomato`: bushy plant with red fruit, one gone a bit overripe/brown.
- `pumpkin`: sprawling vine, a squat ribbed pumpkin.
- `thornvine` (tall): dark crimson-green vine wound around a stake, hooked thorns, small rosehip berries.
- `choircap`: cluster of mushrooms with mouth-like gills, as if singing.
- `stormcorn` (tall): corn with cyan-glinting kernels and crackling silk.
- `beebalm`: shaggy magenta flower clusters, tiny bee optional.
- `chilli`: small bush with fiery red-orange chillies.
- `kingsmarrow` (tall, forbidden): eerie plum-black turnip-like plant with a tiny crown of leaves and faintly glowing hot-pink veins.

| name | frames | size | notes |
|---|---|---|---|
| `crop_<sp>` | 4 growth stages | 16x16, tall species 16x24 | stage 0 freshly planted seed in a small mound, 1 sprout, 2 growing, 3 mature with produce clearly visible. `origin: [0.5, 1]` |
| `produce_<sp>` | 1 | 16x16 | inventory icon in the pack's style, outlined |
| `seed_<sp>` | 1 | 16x16 | seed packet: folded paper packet with a tiny illustration of the crop, family-coloured band |

Hybrids (produce and seed only): `emberroot` (carrot x chilli: a carrot
glowing ember-red at the tip), `sporelight` (sunflower x choircap: a pale
glowing flower with a mushroom centre), `briargourd` (pumpkin x thornvine:
thorny dark-green gourd), `thunderpea` (pea x stormcorn: crackling cyan pea
pod), `hellfruit` (tomato x chilli: black-red tomato with a flame-shaped
calyx). Names `produce_<hybrid>`, `seed_<hybrid>`.

## Group: world (`src/art/sprites/world.ts`)

Terrain tiles, 16x16, **no outline**, must tile seamlessly with themselves.
Provide multiple variants as frames of one sprite; the engine scatters them.

| name | frames | notes |
|---|---|---|
| `t_grass` | 4 | farm grass, lush mid green, subtle blades; variants mostly calm, one with a tiny flower |
| `t_meadow` | 4 | blighted meadow grass: yellowed, patchy, dry |
| `t_dirt` | 3 | worn path dirt, pebbles |
| `t_soil_dry` | 1 | tilled plot, ridged furrows, framed so neighbouring plots read as separate beds |
| `t_soil_wet` | 1 | the same, darker and glistening (watered) |
| `t_corrupt` | 2 | corrupted soil: plum/maroon with pale root veins |
| `t_water` | 2 | pond water, 2-frame shimmer animation |
| `t_flagstone` | 2 | old ruined flagstones, cracked, moss in seams |
| `t_royal` | 2 | the Marrow King's royal patch: dark rich loam with ornamental rotting leaf patterns |

Decor (outlined, `origin: [0.5, 1]`):
`d_tuft` (3 variants, ~8x6), `d_flower` (4 variants, ~7x7, small wildflowers),
`d_blightflower` (2 variants, twisted sinister wildflowers), `d_rock_s` (~10x8),
`d_rock_l` (~24x18), `d_stump` (~16x12), `d_bush` (~20x16), `d_tree_oak`
(~40x50, canopy), `d_tree_dead` (~32x44), `d_barrel`, `d_crate`, `d_sack`,
`d_haybale`, `d_lantern` (2 frames flicker, ~10x24 post lantern),
`d_signpost`, `d_fence_h` (16x12, tileable horizontally), `d_fence_post`
(~6x14), `d_wall_h` (16x14 mossy dry-stone wall, tileable), `d_wall_broken`
(~16x14), `d_pillar` (~16x30 ruined overgrown pillar), `d_well` (~24x28),
`d_cart_broken` (~32x20), `d_mushrooms` (~10x8), `d_bones` (~12x6),
`d_toolrack` (~20x20 wall rack with hanging tools).

Buildings (outlined, `origin: [0.5, 1]`):

| name | size | notes |
|---|---|---|
| `b_farmhouse` | ~96x80 | weathered timber farmhouse, thatch roof, warm window glow, chimney, cellar hatch with odd old ironwork |
| `b_smithy` | ~72x60 | Bertha's blacksmith shed: open front, anvil, forge glow, hanging tools, a suspicious golden watering can on the wall |
| `b_bench` | ~32x26 | mutation bench: workbench with alembic, jars, faintly glowing violet liquid |
| `b_archive` | ~48x52 | seed archive: tall wooden cabinet-shed with many tiny labelled drawers |
| `b_pump_broken` | ~24x30 | irrigation hand pump, broken handle, dry trough |
| `b_pump` | ~24x30 | repaired, water in the trough |
| `b_compost` | ~24x20 | slatted compost bin |
| `b_potting` | ~32x22 | potting bench with pots, trowel, seed satchel (the loadout table) |
| `b_gate` | ~56x44 | expedition gate: old wooden gate in a stone wall, lantern, sign |
| `b_shrine` | ~48x56, 2 frames | Old Mother Turnip: enormous ancient turnip half-sunk in the earth, moss, serene closed eyes, little offerings and candles (candles flicker) |

## Group: combat (`src/art/sprites/combat.ts`)

Player projectiles: earthy, slightly muted, outlined. Enemy bullets must be
**much** more prominent: bright saturated body, white glint, black outline.
Directional sprites point **right**. Origins centre.

Player projectiles: `p_pea` (5x5), `p_turnip` (10x10), `p_chunk` (3 variants,
5x5), `p_carrot` (13x5), `p_petal` (2 frames, 7x7), `p_tomato` (8x8),
`p_pumpkin` (12x12), `p_kernel` (5x6, electric yellow), `p_seed` (4x4 sling
seed), `p_bee` (2 frames, 7x6), `p_shroom` (3 frames, 10x10 hopping mushroom
companion), `p_thorn` (9x3), `p_ember` (2 frames, 6x6), `p_frost` (7x7),
`p_briar` (2 frames, 12x12 briar wall segment), `p_moon` (7x7 moonberry orb).

Hazards (no outline is fine, soft): `h_poison` (2 frames, ~28x14 bubbling
green-violet poison puddle), `h_fire` (3 frames, ~24x12 burning patch),
`h_spores` (3 frames, ~20x16 drifting spore cloud).

Enemy bullets: `eb_orb_pink`, `eb_orb_gold`, `eb_orb_violet`, `eb_orb_cyan`
(8x8), `eb_small_pink`, `eb_small_gold` (6x6), `eb_pollen` (7x7 yellow-green),
`eb_thorn` (10x5 crimson, pointing right), `eb_mud` (7x7), `eb_ring` (9x9 gold
ring), `eb_spore` (7x7 magenta).

Pickups: `pk_sap_s` (6x7), `pk_sap_m` (8x9), `pk_sap_l` (10x12) amber sap
droplets with glints; `pk_farthing` (4 frames spin, 8x8 old copper coin);
`pk_chest` (2 frames: closed, open; ~18x14 rooty wooden chest bound with vine).

Effects: `fx_hit` (3 frames, 9x9), `fx_dust` (3 frames, 9x7), `fx_poof` (4
frames, 16x16, death puff of leaf bits and dust), `fx_burrow` (3 frames, 16x8,
dirt eruption marking a spawn), `fx_explosion` (5 frames, 32x32, earthy
orange with dirt clods), `fx_sparkle` (4 frames, 7x7), `fx_levelup` (4 frames,
24x24 ring of sprouting leaves), `fx_shatter` (4 frames, 12x12 ice shards),
`fx_zap` (3 frames, 8x8 lightning spark).

## Group: ui (`src/art/sprites/ui.ts`)

9-slice frames (no outline; draw the border into the art):
`ui_wood` (24x24, 8px border: dark wood frame, nail heads in corners, planks
inside), `ui_parchment` (24x24, 8px border: parchment interior, inked edge,
slightly worn), `ui_slot` (20x20 recessed wooden slot), `ui_slot_sel`
(20x20, golden highlighted), `ui_btn` (3 frames 24x14: normal, hover,
pressed; 4px border), `ui_bar` (32x8, 3px border, bar frame), `ui_tab` (2
frames, 24x12).

Icons, 9x9, outlined: `ic_heart`, `ic_heart_empty`, `ic_sap`, `ic_farthing`,
`ic_sprout`, `ic_clock`, `ic_skull`, `ic_dash`, `ic_star`, `ic_lock`,
`ic_reroll`, `ic_water`, `ic_seed`, `ic_hand`, `ic_exit`, `ic_bag`,
`ic_crown`, `ic_armour`, `ic_speed`, `ic_crit`, `ic_luck`.

Damage-type icons 7x7: `dt_physical` (fist), `dt_nature` (leaf),
`dt_arcane` (star), `dt_elemental` (flame).

Mutation trait icons 9x9: `tr_thorned tr_volatile tr_hollow tr_leeching
tr_giant tr_echoing tr_frostbound tr_infested tr_golden tr_wild tr_burning
tr_venomous tr_charged tr_barbed`.

Rarity gems 7x7: `ic_rarity` (4 frames: common grey, uncommon green, rare
blue, legendary gold).

Farm tool icons 16x16, outlined: `tool_can` (watering can), `tool_sickle`,
`tool_fert` (sack of compost). The hoe comes from the pack.

Cursors: `cur_cross` (11x11 aiming reticle, readable on any ground),
`cur_hand` (12x12 pointing hand for the farm).

Logo: `logo`, roughly 220x52: the word HARVESTHEX in chunky carved,
slightly irregular rustic capitals (warm gold-to-rust fill, dark outline,
highlight edge), with a vine curling through the letters and a small turnip
or sprout worked into it. This is the first thing players see; make it great.
