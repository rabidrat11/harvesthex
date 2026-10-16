# HARVESTHEX

*Grow something dangerous.*

A farming bullet-hell action RPG for the browser. Tend a half-abandoned farm
on the edge of the Blighted Meadow, grow crops that turn into weapons, fight
through four acres of mutated countryside to the Marrow King, and bring
everything home to grow the next build.

Play it: **https://rabidrat11.github.io/harvesthex/**

## Run it

```sh
npm install
npm run dev          # http://127.0.0.1:5177
```

### Icons

Item, material, armour and food icons come from the free
[Cute Fantasy Icons](https://kenmi-art.itch.io/) pack by Kenmi, whose licence
forbids redistributing it, so the sheet is not in this repository. Download
the pack and copy `16x16/Free_Icons_all_16x16.png` to
`public/assets/cf-icons-16.png`. Without it the game still runs, showing plain
markers in place of those icons. The GitHub Pages build adds the sheet from
the `CF_ICONS_B64` repository secret.

Production build: `npm run build`, then `npm run preview` (http://127.0.0.1:4177).
No backend, no accounts: progress saves in the browser.

## Controls

| | |
|---|---|
| WASD | move |
| Mouse | aim |
| Left click | held weapon (on the farm: use the current tool) |
| Right click | class skill |
| Space | dash (untouchable while dashing) |
| E | interact |
| Q | drink a jar |
| Tab | character / build |
| I | stores (farm) |
| 1-5, mouse wheel | farm tools, seed choice |
| Esc | pause / back |

All keys can be rebound in Controls. A gamepad works too (left stick move,
right stick aim, triggers fire and skill, A dash, X interact, Y jar, Start
pause; menus navigate with the stick). Auto-aim, auto-fire, gentle intensity,
reduced effects, high-contrast danger and damage-number density are in
Settings.

## Checks

```sh
npm test                 # unit tests (simulation, farm, saves)
npx playwright test      # browser tests against the production build
npm run balance          # bots play whole expeditions and report
npm run art              # sprite contact sheets in .art-preview/
npm run verify           # typecheck + unit tests + build
```

Debug: add `?debug` for an FPS overlay, `?quick=meadow` or `?quick=farm` to
skip the menus, `?god` to be unhurtable. `window.__HX` exposes test hooks
(`startExpedition`, `simulate(seconds)`, `skipToBoss`, `strongBuild`,
`stress`, `state`).

## Layout

```
src/sim/      the simulation: world, weapons, combat, enemies, patterns, director, upgrades, bot
src/data/     weapons, traits, items, enemies, patterns, regions, crops, classes, farm content
src/farm/     farm rules and layout
src/meta/     profile, saves, settings, expedition results
src/render/   texture atlas, expedition and farm renderers, effects
src/scenes/   boot, title, farm, expedition (Phaser)
src/ui/       Preact interface: HUDs, menus, panels
src/audio/    procedural sound effects and music
src/art/      palette, sprite format, font, and every sprite definition
docs/         design notes, art manifest, asset catalogue
```

See `PROGRESS.md` for the current state and `docs/DESIGN.md` for the design.

## Licences

The Cute Fantasy Icons (free version) are by Kenmi, for **non-commercial use
only, with no redistribution**; they are used in the game but not distributed
in this repository. Jersey 10 is SIL OFL. Everything else was made for this
project.
