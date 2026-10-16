import { test, expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    __HX: any;
  }
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message} ${e.stack}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const state = (page: Page) => page.evaluate(() => window.__HX.state());

/** Labels of the open panel's buttons that sit outside the visible frame (unreachable). */
const buttonsOffFrame = (page: Page) =>
  page.evaluate(() => {
    const f = document.getElementById('frame')!.getBoundingClientRect();
    return [...document.querySelectorAll('.modal button')]
      .filter((b) => {
        const r = b.getBoundingClientRect();
        if (r.height === 0) return false;
        // Inside a scrolling panel, a button only counts once it is scrolled to.
        const sc = b.closest('.modal > .wood, .modal > .parch, .scroll') as HTMLElement | null;
        if (sc) {
          const s = sc.getBoundingClientRect();
          if (r.top >= s.bottom || r.bottom <= s.top) return false;
        }
        return r.bottom > f.bottom + 1 || r.top < f.top - 1;
      })
      .map((b) => b.textContent);
  });

async function toScreen(page: Page, scene: string, gx: number, gy: number) {
  return page.evaluate(
    ([sc, x, y]) => {
      const c = window.__HX.phaser.scene.getScene(sc).cameras.main;
      const r = document.querySelector('#game canvas')!.getBoundingClientRect();
      return [r.left + ((x as number) - c.scrollX) * (r.width / 640), r.top + ((y as number) - c.scrollY) * (r.height / 360)];
    },
    [scene, gx, gy] as const,
  );
}

test('boots to the title with every sprite present and no errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  await expect(page.getByText('Grow something dangerous.')).toBeVisible();
  expect(await page.evaluate(() => window.__HX.scene())).toContain('title');
  await page.evaluate(() => window.__HX.startExpedition(5));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__HX.startFarm());
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__HX.missingFrames())).toEqual([]);
  expect(errors).toEqual([]);
});

test('the whole loop: plant, set out, fight, come home, harvest, reload', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.getByText('New game').click();
  await expect(page.getByText('Get to work')).toBeVisible();
  await page.getByText('Get to work').click();
  // Walk to the beds.
  await page.evaluate(() => {
    const s = window.__HX.phaser.scene.getScene('farm');
    s.px = 270;
    s.py = 186;
  });
  await page.waitForTimeout(200);
  for (let i = 0; i < 3; i++) {
    const [x, y] = await toScreen(page, 'farm', 256 + i * 16 + 8, 200);
    await page.mouse.move(x, y);
    await page.waitForTimeout(100);
    await page.mouse.click(x, y);
    await page.waitForTimeout(120);
    await page.mouse.click(x, y);
    await page.waitForTimeout(120);
  }
  const plots = await page.evaluate(() => window.__HX.game.profile.plots.slice(0, 3).map((p: any) => [p.crop?.species, p.watered]));
  expect(plots).toEqual([
    ['pea', true],
    ['pea', true],
    ['pea', true],
  ]);

  // Set out through the gate.
  await page.evaluate(() => {
    const s = window.__HX.phaser.scene.getScene('farm');
    s.px = 384;
    s.py = 82;
  });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.getByText('Set out for the meadow')).toBeVisible();
  await page.getByText('Set out for the meadow').click();
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');

  // The player moves, weapons fire, enemies arrive and die.
  const x0 = (await state(page)).world.x;
  await page.mouse.move(900, 300);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyD');
  const s1 = (await state(page)).world;
  expect(s1.x).toBeGreaterThan(x0 + 30);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  expect((await state(page)).world.projs + (await state(page)).world.kills).toBeGreaterThan(0);

  // Fast-forward the first acre, picking level-ups through the interface.
  await page.evaluate(() => (window.__HX.world().godMode = true));
  let levelUps = 0;
  for (let i = 0; i < 60; i++) {
    await page.evaluate(() => window.__HX.simulate(3));
    await page.waitForTimeout(40);
    const s = await state(page);
    if (s.panel === 'levelup') {
      const level = s.world.level;
      await page.keyboard.press('Digit1');
      await page.waitForTimeout(80);
      expect((await state(page)).world.level).toBe(level + 1);
      levelUps++;
    }
    if (s.world.phase === 'lull') break;
  }
  expect(levelUps).toBeGreaterThan(2);
  const lull = await state(page);
  expect(lull.world.phase).toBe('lull');
  expect(lull.world.kills).toBeGreaterThan(100);

  // How much sap a fast-forwarded acre yields depends on frame timing; fix it
  // so the growth check below measures the farm, not the machine's load.
  await page.evaluate(() => (window.__HX.world().run.sapCollected = Math.max(700, window.__HX.world().run.sapCollected)));

  // Visit Mags, then go home.
  await page.evaluate(() => {
    const w = window.__HX.world();
    const c = w.props.find((p: any) => p.kind === 'cart');
    w.player.x = c.x;
    w.player.y = c.y + 8;
  });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await expect(page.getByRole('heading', { name: 'Mags’s Cart' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const w = window.__HX.world();
    const ex = w.props.find((p: any) => p.kind === 'exit');
    w.player.x = ex.x;
    w.player.y = ex.y + 6;
  });
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await page.getByText('Load the haycart').click();
  await expect(page.getByText('Home with the Haul')).toBeVisible();
  await page.getByText('Return to the farm').click();
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  await page.waitForTimeout(800);
  const home = await state(page);
  expect(home.profile.day).toBe(2);
  expect(home.profile.runs).toBe(1);
  // The peas drank the sap and are ready.
  const stages = await page.evaluate(() => window.__HX.game.profile.plots.slice(0, 3).map((p: any) => Math.round(p.crop?.growth ?? 0)));
  for (const g of stages) expect(g).toBeGreaterThanOrEqual(210);

  // Harvest one by clicking it.
  await page.evaluate(() => {
    const s = window.__HX.phaser.scene.getScene('farm');
    s.px = 270;
    s.py = 186;
    s.tool = 0;
  });
  await page.waitForTimeout(200);
  const [hx, hy] = await toScreen(page, 'farm', 256 + 8, 200);
  await page.mouse.move(hx, hy);
  await page.waitForTimeout(100);
  await page.mouse.click(hx, hy);
  await page.waitForTimeout(300);
  const produce = await page.evaluate(() => window.__HX.game.profile.produce.map((p: any) => p.species));
  expect(produce).toContain('pea');

  // Reload: nothing is lost.
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByText('Continue')).toBeVisible();
  const after = await page.evaluate(() => ({ day: window.__HX.game.profile.day, produce: window.__HX.game.profile.produce.length, runs: window.__HX.game.profile.stats.runs }));
  expect(after).toEqual({ day: 2, produce: 1, runs: 1 });
  await page.getByText('Continue').click();
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  expect(errors).toEqual([]);
});

test('settings take effect and persist', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Settings').click();
  await page.getByRole('button', { name: 'Gameplay' }).click();
  const autoAim = page.locator('.setting', { hasText: 'Auto-aim' }).getByRole('button', { name: 'On' });
  await autoAim.click();
  await page.getByRole('button', { name: 'Display' }).click();
  await page.locator('.setting', { hasText: 'Damage numbers' }).getByRole('button', { name: 'Off' }).click();
  await page.getByText('Done').click();
  await page.reload();
  const s = await page.evaluate(() => ({ autoAim: window.__HX.game.settings.autoAim, dn: window.__HX.game.settings.damageNumbers }));
  expect(s).toEqual({ autoAim: true, dn: 'off' });
  // And the expedition actually uses them.
  await page.evaluate(() => window.__HX.startExpedition(9));
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
  expect(await page.evaluate(() => window.__HX.world().settings.autoAim)).toBe(true);
});

test('the player can be hurt, and defeat brings them home without loss', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  await page.evaluate(() => {
    window.__HX.newGame();
    window.__HX.startExpedition(21);
  });
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
  const seedsBefore = await page.evaluate(() => window.__HX.game.profile.seeds.reduce((a: number, s: any) => a + s.count, 0));
  // Stand still in a crowd.
  await page.evaluate(() => window.__HX.simulate(90));
  await page.waitForTimeout(2500);
  const s = await state(page);
  expect(s.world.phase).toBe('defeat');
  await expect(page.getByText('Carried Home')).toBeVisible();
  await page.getByText('Return to the farm').click();
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  const seedsAfter = await page.evaluate(() => window.__HX.game.profile.seeds.reduce((a: number, s: any) => a + s.count, 0));
  expect(seedsAfter).toBeGreaterThanOrEqual(seedsBefore);
  expect(errors).toEqual([]);
});

test('starting expeditions repeatedly leaks nothing', async ({ page }) => {
  await page.goto('/');
  const counts: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate((s) => window.__HX.startExpedition(s), 100 + i);
    await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
    await page.waitForTimeout(300);
    counts.push(await page.evaluate(() => window.__HX.phaser.scene.getScene('expedition').children.length));
    await page.evaluate(() => window.__HX.startFarm());
    await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  }
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThan(40);
  expect(await page.locator('canvas').count()).toBe(1);
});

test('every farm building opens a working panel', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  await page.evaluate(() => {
    window.__HX.newGame();
    const p = window.__HX.game.profile;
    // Late game: everything built and unlocked, the stores full.
    for (const k of Object.keys(p.buildings)) p.buildings[k] = 2;
    p.tiers.unlocked = 3;
    p.farthings = 2600;
    for (const sp of ['carrot', 'chilli', 'turnip', 'sunflower', 'pumpkin', 'tomato', 'beebalm', 'stormcorn', 'thornvine']) p.produce.push({ species: sp, traits: ['giant'], quality: 3, count: 4 });
    p.materials.root_pollen = 1;
    p.jars = { jam: 4, chilli_jam: 3, balm: 2 };
    window.__HX.startFarm();
  });
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  for (const panel of ['farmhouse', 'archive', 'bench', 'smithy', 'potting', 'compost', 'shrine', 'character', 'pause', 'settings', 'credits']) {
    await page.evaluate((pn) => window.__HX.ui.open(pn), panel);
    await page.waitForTimeout(150);
    await expect(page.locator('.modal').first()).toBeVisible();
    expect(await buttonsOffFrame(page), `${panel}: every button in reach`).toEqual([]);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.__HX.ui.get().panel), `Escape closes ${panel}`).toBeNull();
  }
  expect(errors).toEqual([]);
});

test('holds up under heavy load', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.__HX.startExpedition(77));
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
  const r = await page.evaluate(async () => {
    window.__HX.stress(300, 1000);
    const sc = window.__HX.phaser.scene.getScene('expedition');
    await new Promise((res) => setTimeout(res, 4000));
    const w = window.__HX.world();
    return { fps: sc.fps(), enemies: w.enemies.count, bullets: w.bullets.count };
  });
  console.log('stress fps', r);
  expect(r.enemies).toBeGreaterThan(150);
  expect(r.bullets).toBeGreaterThan(800);
  expect(r.fps).toBeGreaterThan(20);
});

test('a gamepad can move, aim, dash and drive the menus', async ({ page }) => {
  // A scripted controller standing in for the Gamepad API.
  await page.addInitScript(() => {
    const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    (window as any).__pad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
  });
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  // Menus: stick down moves focus, A presses.
  const focused = () => page.evaluate(() => document.activeElement?.textContent?.trim());
  const start = await focused();
  await page.evaluate(() => ((window as any).__pad.axes[1] = 1));
  await page.waitForTimeout(150);
  await page.evaluate(() => ((window as any).__pad.axes[1] = 0));
  await page.waitForTimeout(100);
  expect(await focused()).not.toBe(start);
  // Into an expedition: the left stick walks.
  await page.evaluate(() => window.__HX.startExpedition(31));
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
  await page.evaluate(() => (window.__HX.world().godMode = true));
  const x0 = (await state(page)).world.x;
  await page.evaluate(() => ((window as any).__pad.axes[0] = 1));
  await page.waitForTimeout(700);
  await page.evaluate(() => ((window as any).__pad.axes[0] = 0));
  expect((await state(page)).world.x).toBeGreaterThan(x0 + 30);
  // Right stick aims (and fires when pushed hard), A dashes.
  await page.evaluate(() => ((window as any).__pad.axes[2] = -1));
  await page.waitForTimeout(300);
  const aim = await page.evaluate(() => window.__HX.world().player.aim);
  expect(Math.abs(Math.abs(aim) - Math.PI)).toBeLessThan(0.3);
  await page.evaluate(() => ((window as any).__pad.axes[2] = 0));
  await page.evaluate(() => ((window as any).__pad.buttons[0].pressed = true));
  await page.waitForTimeout(100);
  await page.evaluate(() => ((window as any).__pad.buttons[0].pressed = false));
  expect(await page.evaluate(() => window.__HX.world().stats.dashes)).toBe(1);
  // Start pauses.
  await page.evaluate(() => ((window as any).__pad.buttons[9].pressed = true));
  await page.waitForTimeout(100);
  await page.evaluate(() => ((window as any).__pad.buttons[9].pressed = false));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__HX.ui.get().panel)).toBe('pause');
  expect(errors).toEqual([]);
});

test('audio unlocks on the first click and follows the scenes', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  await page.mouse.click(40, 40);
  await page.waitForTimeout(300);
  const title = await page.evaluate(() => ({ state: window.__HX.game.audio.ctx?.state, track: window.__HX.game.audio.music?.track }));
  expect(title).toEqual({ state: 'running', track: 'title' });
  // Effects play (rendered on demand) without errors.
  await page.evaluate(() => {
    const a = window.__HX.game.audio;
    for (const id of ['pea', 'boom', 'levelup', 'hurt', 'sap', 'boss_roar', 'harvest', 'evolve']) a.play(id, 0.5);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__HX.startExpedition(3));
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__HX.game.audio.music?.track)).toBe('meadow');
  await page.evaluate(() => window.__HX.startFarm());
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__HX.game.audio.music?.track)).toBe('farm');
  expect(errors).toEqual([]);
});

test('beating the King banks the run at once and goes straight to the results', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  await page.evaluate(() => {
    window.__HX.newGame();
    const p = window.__HX.game.profile;
    for (const pl of p.plots.slice(0, 6)) {
      pl.tilled = true;
      pl.crop = { species: 'carrot', traits: [], growth: 20, fertilised: false, dryDays: 0, blessed: false, plantedDay: 1 };
    }
    window.__HX.startExpedition(44);
  });
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
  await page.evaluate(() => {
    const w = window.__HX.world();
    w.godMode = true;
    window.__HX.strongBuild();
    // A big haul: every material and a satchel of seeds, as a long run brings home.
    for (const k of ['wood', 'iron_ore', 'copper_ore', 'leather', 'feather', 'bone', 'worm', 'thorn_fibre', 'ember_ore', 'gold_ore', 'frost_crystal', 'storm_glass', 'red_gem', 'void_shard', 'eye']) w.run.loot.materials[k] = 7;
    for (const sp of ['sunflower', 'tomato', 'pumpkin', 'thornvine', 'choircap', 'stormcorn', 'beebalm', 'chilli', 'emberroot', 'sporelight', 'briargourd', 'thunderpea']) w.run.loot.seeds.push({ species: sp, traits: ['giant'] });
    window.__HX.skipToBoss();
  });
  await page.waitForFunction(() => window.__HX.state().world?.boss?.state === 'move', null, { timeout: 15000 });
  await page.evaluate(() => window.__HX.hitBoss(0.55));
  await page.waitForTimeout(3500);
  await page.evaluate(() => window.__HX.hitBoss(1));
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'victory', null, { timeout: 15000 });
  // Banked before any screen is shown.
  expect(await page.evaluate(() => window.__HX.game.profile.stats.wins)).toBe(1);
  await expect(page.getByText('The King is Fallen')).toBeVisible({ timeout: 5000 });
  expect(await page.evaluate(() => window.__HX.ui.get().panel)).toBe('results');
  const seeds = await page.evaluate(() => window.__HX.game.profile.seeds.map((s: any) => s.species));
  expect(seeds).toContain('kingsmarrow');
  // However big the haul, the way home is on screen.
  expect(await buttonsOffFrame(page)).toEqual([]);
  await expect(page.getByText('Return to the farm')).toBeInViewport();
  await page.getByText('Return to the farm').click();
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  // After a victory the bench offers the rot tiers too; setting out stays in reach.
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__HX.ui.closeAll());
  await page.evaluate(() => window.__HX.ui.open('potting'));
  await expect(page.getByText('Set out for the meadow')).toBeVisible();
  expect(await buttonsOffFrame(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('a run cut short by a reload still brings the haul home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  await page.evaluate(() => {
    window.__HX.newGame();
    window.__HX.startExpedition(45);
  });
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
  // Fight a little, then reach a lull: that takes a safe checkpoint.
  await page.evaluate(() => {
    const w = window.__HX.world();
    w.godMode = true;
    window.__HX.simulate(40);
    w.director.t = 9999;
  });
  await page.waitForFunction(() => window.__HX.state().world?.phase === 'lull');
  await page.waitForTimeout(300);
  const pending = await page.evaluate(() => !!window.__HX.game.profile.pendingRun);
  expect(pending).toBe(true);
  // Oops: the tab reloads mid-expedition.
  await page.reload();
  await page.getByText('Continue').click();
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  await page.waitForTimeout(500);
  const p = await page.evaluate(() => ({ runs: window.__HX.game.profile.stats.runs, pending: window.__HX.game.profile.pendingRun, day: window.__HX.game.profile.day }));
  expect(p).toEqual({ runs: 1, pending: null, day: 2 });
  await expect(page.getByText('Your last expedition was cut short')).toBeVisible();
});

test('every one of the twelve classes has all its art in play', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByText('New game')).toBeVisible();
  const ids = await page.evaluate(() => {
    window.__HX.newGame();
    return ['fieldhand', 'botanist', 'reaper', 'tinkerer', 'apiarist', 'rootspeaker', 'strawman', 'forager', 'miller', 'witch', 'ploughman', 'alchemist'];
  });
  for (const id of ids) {
    await page.evaluate(() => window.__HX.startFarm());
    await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
    await page.evaluate(() => window.__HX.ui.closeAll());
    await page.evaluate((cls) => {
      const p = window.__HX.game.profile;
      if (!p.classes.unlocked.includes(cls)) p.classes.unlocked.push(cls);
      p.classes.selected = cls;
      window.__HX.startExpedition(60);
    }, id);
    await page.waitForFunction(() => window.__HX.state().world?.phase === 'acre');
    // Walk, fire and use the skill so every animation and effect is drawn.
    await page.evaluate(() => {
      const w = window.__HX.world();
      w.godMode = true;
      w.input.fire = true;
    });
    await page.keyboard.down('KeyD');
    await page.mouse.move(900, 300);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.click(900, 300, { button: 'right' });
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyD');
    await page.mouse.up();
    await page.evaluate(() => window.__HX.simulate(12));
    await page.waitForTimeout(300);
    console.log('class ok', id, JSON.stringify(await page.evaluate(() => window.__HX.missingFrames())));
  }
  // And the character screen shows every portrait.
  await page.evaluate(() => window.__HX.startFarm());
  await page.waitForFunction(() => window.__HX.state().scenes.includes('farm'));
  await page.evaluate(() => window.__HX.ui.open('character'));
  await page.waitForTimeout(300);
  expect(await page.locator('.modal .itemslot').count()).toBeGreaterThanOrEqual(12);
  expect(await page.evaluate(() => window.__HX.missingFrames())).toEqual([]);
  expect(errors).toEqual([]);
});
