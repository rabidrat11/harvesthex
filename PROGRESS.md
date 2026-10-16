# HARVESTHEX: progress

_Last updated: 16 October 2026_

## Current state

A complete, playable loop: title → farm → potting bench → the Blighted Meadow
(four acres with lulls, an elite, a side objective, the Marrow King) →
results → farm, where everything you gathered grows your crops → harvest →
graft produce into weapons for the next expedition. Saves locally.

## Systems (implemented and exercised by tests)

| System | Where | Notes |
|---|---|---|
| Simulation (pure TS, seeded) | `src/sim/` | World, pools, spatial grid, fixed 60 Hz sub-steps |
| Player movement, dash, i-frames, knockback | `sim/world.ts` | acceleration-based, small hitbox (3.5px) |
| 26 weapons, 12 behaviours | `data/weapons.ts`, `sim/weapons.ts` | 3 held, 11 cultivars, 5 hybrids, 1 forbidden, 8 evolutions |
| 14 mutation traits | `data/traits.ts` | stat mods + hooks (volatile, echoing, charged, leeching...) |
| Status effects + synergies | `sim/combat.ts` | poison→fire detonation, freeze→shatter, crit thorns, spore explosions, petal wards, bees+flowers, briar reflects |
| 12 enemy types + boss | `data/enemies.ts`, `sim/enemyAi.ts` | swarm, chase, ranged, charger, turret, burrower, wraith, knight (shield), witch (blink), taxman |
| Pattern library | `data/patterns.ts`, `sim/patterns.ts` | rings with gaps, spirals, bursts, fans, walls with openings, lanes, sweeps, homing, zones, crownfall, summons |
| Encounter director | `sim/director.ts` | authored acres, adaptive rate (bounded), events (encircle, flock, stampede, surge, elite, shrine), lulls, extraction, boss arena |
| The Marrow King | `sim/enemyAi.ts` | two phases, 9 attacks, arena shrinks at 50%, desperation spiral at 15%, death sequence, loot shower |
| Level-ups / shop / chests | `sim/upgrades.ts` | build-aware offers, rarity, rerolls, locks, Mags's tea, risky bargains, evolutions |
| 33 passive items | `data/items.ts` | trade-offs, evolution tags, hooks |
| 12 classes | `data/classes.ts`, `sim/classes.ts` | each: held weapon, starter, passive rule, active skill, weakness, unlock with progress |
| Farm | `farm/farm.ts`, `scenes/FarmScene.ts` | till/plant/water/fertilise/harvest, growth from sap, quality, seed inheritance |
| Mutation bench, crossbreeding | `farm/farm.ts` | reagents → traits; 5 named hybrids + generic gene crosses |
| Buildings | `data/farm.ts` | pump (auto-water), bench (+upgrade), compost, smithy (repairs, expansions, tool tiers, 9 equipment pieces), archive (seeds, almanac), shrine (blessing), farmhouse (stores, kitchen) |
| Save system | `meta/save.ts` | versioned envelope, checksum, backup slot, migration v1→v3, field validation, export/import; runs bank the moment they end; checkpoints every 20 s and at lulls are recovered after a crash or reload |
| Results | `meta/results.ts` | defeat keeps seeds/growth + 60%; unlocks; jars come home |
| Rendering | `render/` | one atlas, baked ground textures, pooled sprites, fx layer, telegraphs, offscreen arrows |
| UI | `ui/` (Preact) | title, settings (4 tabs), rebinding, HUDs, all panels, keyboard navigation |
| Audio | `audio/` | procedural sfx (60+) with voice limits; procedural music for title/farm/meadow/boss/victory |
| Art | `src/art/sprites/` | 324 original sprites (616 frames) in Endesga 64 + 54 Cute Fantasy icons in use |

## Verification

- `npm test`: 157 unit tests (incl. every synthesised sound and all 12 classes) (determinism, full headless expedition, boss phases, every weapon, every evolution, synergies, farm rules, saves/migration/corruption, results).
- `npx playwright test`: 12 browser tests (all 12 classes play with complete art; beating the King banks at once; a reload mid-run recovers the haul; boot with no missing art, the whole loop through the UI, settings persist and apply, defeat, repeated restarts without leaks, every farm panel, 300 enemies + 1000 live bullets at 60 fps, gamepad, audio).
- `npm run balance`: headless bots play full expeditions per class.
- `npm run art`: contact sheets in `.art-preview/`.

## Balance notes (from `npm run balance` and `scratchpad/dps.ts`)

- Levels: ~3 at 1:00, ~8 at 3:00, ~13 at 5:00, ~24 at the boss.
- Sap per full run ≈ 8–9k; shop prices scaled so a lull buys 2–4 things.
- Boss fight ≈ 2–4 minutes for a mid build; a clumsy bot still wins at tier 1 (the bot kites well: real players will find it harder).

## Recent changes (16 October 2026, after first play)

- Fixed: beating the King could leave the run stuck behind a prize panel and never saved. The King no longer drops a chest; the run banks the instant it ends; checkpoints recover interrupted runs.
- Readability: the interface font is now Jersey 10 (Pixelify Sans's B read as G and its fi ligature as A); larger minimum sizes; outlined HUD text; emphasis by colour, no faux bold.
- Difficulty: enemy damage x1.4, post-hit grace 0.5 s (was 0.8) and bullets no longer vanish harmlessly during it.
- Nine new classes (12 in total).

## Known issues / next priorities

1. Difficulty and the twelve classes are tuned against bots; human play-testing should check the new classes especially (Strawman and Rootspeaker look strongest, Forager weakest).
2. Gamepad: tested with a scripted controller only.
3. Audio: verified technically (clean renders, normalised peaks, tracks follow scenes); nobody has listened to it.

## Technical decisions

- Phaser 4.2.1 (actively maintained, better batching) for rendering only; the sim is independent and unit-testable.
- Preact DOM overlay for menus (readable text, keyboard navigation), scaled with the canvas in game pixels.
- Integer scaling by default ("Fill window" option).
- All randomness in the sim comes from a seeded RNG; the bot is deterministic too.
