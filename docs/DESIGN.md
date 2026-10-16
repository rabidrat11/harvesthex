# HARVESTHEX design notes

## The idea

The Root woke beneath the fields, and crops began to grow into dangerous
things. You farm on the edge of the Blighted Meadow. **The farm is the build:**
what you grow becomes what you fight with, and everything you gather while
fighting grows the farm.

Three signature mechanics carry that:

1. **Sap feeds both halves.** Every enemy drops sap. In a run it is
   experience *and* Mags's currency (spend it or keep it). Everything you
   collected also soaks into your watered beds at home: a third of it, into
   every planted bed, when you come back. Fight harder, grow more.
2. **Grafting.** Harvested produce goes into the satchel at the potting bench
   and becomes a weapon on your next expedition, starting at its quality level
   and carrying its mutations. Grown weapons start stronger than bought ones
   and are the only way to bring traits into a run.
3. **Mutations and evolutions.** Traits are grown, not found: bench reagents,
   crossbreeding and the odd surprise at harvest. A fully levelled weapon
   evolves when it carries the right trait (or, as a fallback, when you hold
   an item with the matching tag). So a Pea Repeater grown Echoing becomes the
   Endless Peastorm without spending an item slot.

## The loop

Farm (plant, water, mutate, graft) → Meadow: four acres, each with its own
mix, events and pace → lulls between acres (Mags's cart, the way home, risky
bargains, the optional Watcher) → the Marrow King → results → home, where the
fields drink what you gathered → harvest → graft → again.

Short session: one acre and home (≈3 minutes) still matures peas and buys
seeds. Full expedition: ≈13–16 minutes.

## Systems at a glance

- **Classes** (12), all available from the first day: each has its own held
  weapon, starting cultivar, a rule that changes how the run plays, a
  right-click skill and a real weakness. Chosen at the Potting Bench or in the
  character panel (Tab).

  | Class | Holds | Passive | Skill | Weakness |
  |---|---|---|---|---|
  | Fieldhand | Seed Sling | +5% damage per crop family fielded | Straw Decoy | weak crits |
  | Botanist | Spore Puffer | traits 50% stronger; poisoned foes burst into spores | Overgrowth (root) | fragile, poor physical |
  | Reaper | Old Scythe | melee kills heal; scythe executes below 12% | Reaping Dash | low health, poor projectiles |
  | Tinkerer | Rivet Gun | a sprinkler turret every 9 s (max 3) | Overclock | own weapons -15% |
  | Apiarist | Bee Smoker | +2 bees per hive, flowers +20%, summons +20% | The Swarm | non-summons -20% |
  | Rootspeaker | Root Staff | stand still: +35% damage, +5 armour | Bramble Ring | slow, slow dash |
  | Strawman | Pitchfork | bursts into needles and a blast when hurt | Scare | -20% damage, never crits |
  | Forager | Walking Stick | truffle patches every 40 s; seeds +50% | Gather | -5% damage, less health |
  | Miller | Grain Scoop | every 150 hits: +1% attack speed (to +30%) | Winnow (clears shots) | -25% per hit |
  | Hedge Witch | Moonberry Staff | every 6th hit hexes: +30% damage taken, motes on death | Moonlit Step | -3 armour, less health |
  | Ploughman | Plough Blade | dashing ploughs a damaging furrow; +15% physical | Shoulder Charge | slow to move and swing |
  | Alchemist | Tonic Flask (fire/poison) | burning deaths spread fire; bigger blasts | Brew | less health, jars heal 30% less |
- **Weapons**: 12 behaviours: shooter, lance, lobber, artillery, orbit,
  sweep, summoner, swarm, briar, puffer, storm, crown boomerang.
- **Synergies**: poison + fire detonates; chill → freeze → physical shatter;
  crits release thorns (item); explosions leave spores (item); bees near a
  flower orbit sting harder; briars destroy (and later reflect) enemy shots;
  healing grows petal wards (item). Each is guarded against recursion.
- **Enemies**: swarmers, tanks, ranged spread, telegraphed chargers, pattern
  turrets, splitting fungi, burrowing ambushers, accelerating ring casters, a
  shielded knight (circle behind it), a blinking witch, and the King's
  taxmen who steal your sap.

## Encounter pacing (tier 1)

| Acre | Duration | Mix | Set pieces |
|---|---|---|---|
| The Lower Field | 2:10 | nibblers, mudlings | ring encirclement at 0:55, surge at 1:40 |
| The Hedgerows | 2:30 | + moths, sporelings, bristlehogs | moth flock, bristlehog stampede |
| The Old Walls | 2:45 | + husks, stalkers, clodhurlers | Root Shrine objective, Bramble Knight (or the Watcher), surge |
| The Rot Line | 2:50 | + wraiths | mudling encirclement, Orchard Witch, final surge |
| The Royal Patch | ≈2–3 min | the Marrow King + light reinforcements | phase change at 50%, desperation at 15% |

The director's spawn rate follows each acre's curve, nudged within ±30% by
recent damage output, eased when the player is below 30% health, and slowed
while an elite is alive. Spawns appear off-screen with a burrow telegraph.

## Balance model

Measured with `npm run balance` (bots) and the DPS probe:

| Moment | Target | Measured |
|---|---|---|
| First level-up | within 10 s | ≈5 s (10 sap) |
| Levels at 1:00 / 3:00 / 5:00 | 3 / 8 / 13 | 2–4 / 8–9 / 13 |
| Levels at the boss | ≈24 | 23–26 |
| Damage output | 30 → ≈600 over a run | 27 → 500–1000 |
| Boss fight | 2–3 min | 2.5–4.5 min for bot builds |
| Win rate, weakest bot (no dodge skill, 0.4 s reaction) | low | 1 of 4 (usually falls in the Old Walls) |
| Win rate, decent bot (0.2 s reaction) | about half | 3 of 6; per class 1–3 of 3 |
| Sap per full run | ≈8–9k | 7.4–9.5k |
| Shop | 2–4 buys per lull | prices: items 70–330, weapons 90–330, ×1.22 per acre |

XP to next level: `10 + 30 × (level − 1)`. Enemy health ×1, 1.7, 3.0, 4.8
per acre; damage ×1, 1.2, 1.5, 1.75 (bosses and elites ×1.15), all ×1.4 on top.
After a hit the player has 0.5 s of grace; bullets pass through during it rather than being spent. Rot tiers multiply on top (health ×1.6 /
×2.4, damage ×1.35 / ×1.7, loot ×1.6 / ×2.3).

Crop growth: a third of collected sap per bed (dry beds 40% of that).
Peas need 210 sap (≈ a two-minute run); turnips 360; pumpkins 510;
Kingsmarrow 780 (a full run). Defeat keeps all seeds and growth and 60% of
farthings and materials.

## Bosses

### The Marrow King (implemented)

A colossal crowned turnip, part harvest deity, part rotting woodland lord.
Rises from the royal patch at the meadow's heart; roots close the arena.

- **Phase 1**: Royal Decree (three rings with four gaps that rotate),
  Root Judgment (telegraphed thorn columns on and around you, then thorn
  bursts), Crownfall (royal seeds fall on marked spots and burst into rings),
  Harvest Tax (taxmen run for your sap; if they reach him, he heals), Crown
  Throw (returning crowns).
- **At 50%**: he tears himself open, clears the field, shoves you back, and
  the arena tightens. Faster cadence.
- **Phase 2**: faster decrees, The Great Uprooting (root walls sweep across
  the arena with one gap, under a triple spiral), Furrows (marching lanes),
  everything else faster. Below 15% a slow double spiral never stops.
- **Reward**: the Kingsmarrow seed (forbidden: a returning crown that drains
  life, at the cost of max health), crown shards for the best armour and tool
  tier, Rot tier 2, the Gilded Watering Can, and the cellar opens.

### The Thousand-Eyed Scarecrow (implemented, optional)

Offered by Mags at the second lull. If woken, it replaces the Bramble Knight.
It never walks: it blinks between vantage points. The Gaze (staggered aimed
volleys from different eyes), A Murder of Crows (summons a crow swarm under a
slow ring), Crossed Eyes (rotating four-arm cross), Unblinking (a ring of eyes
that holds still around you, then closes in). At half health four eyes tear
free and orbit it, firing; while any watches, it takes 70% less damage.

### The Rotmother (concept)

A vast fungal sow in the Sporefen. Mechanic: rot spreads across the arena
floor as she fights; standing in rot poisons you but your own fungal weapons
grow stronger there. Phases change the ratio of safe to rotten ground.

### The Harvest Engine (concept)

The machinery under the farmhouse cellar, woken wrong. A boss that is an
arena: conveyor lanes, threshing drums that fire bullet walls in rhythm with
the music, and a heart you can only reach between beats.

## What is deliberately not here yet

Further regions (the Hollow Orchard, the Sundered Greenhouse, the Sporefen,
the Midnight Harvest) are not presented anywhere in the game. The data
structures (regions, seed tables, bosses) support them.
