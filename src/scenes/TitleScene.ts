import Phaser from 'phaser';
import { FarmView } from '../render/farmView';
import { ATLAS, F } from '../render/textures';
import { game } from '../game/state';
import { bridge, ui } from '../ui/store';
import { newProfile, type Profile } from '../meta/profile';
import { CROPS } from '../data/crops';
import { FARM_W } from '../farm/layout';

/** A farm to show behind the title when there is no save yet. */
function showcase(): Profile {
  const p = newProfile();
  const crops = ['sunflower', 'pumpkin', 'turnip', 'stormcorn', 'carrot', 'beebalm', 'tomato', 'choircap', 'pea', 'thornvine', 'chilli', 'sunflower'];
  p.plots.forEach((pl, i) => {
    if (i >= 12) return;
    pl.unlocked = true;
    pl.tilled = true;
    pl.watered = i % 3 !== 0;
    const sp = crops[i];
    pl.crop = { species: sp, traits: i % 5 === 0 ? ['volatile'] : [], growth: CROPS[sp].stageSap * (i % 4 === 0 ? 2 : 3), fertilised: false, dryDays: 0, blessed: false, plantedDay: 1 };
  });
  p.buildings.pump = 1;
  p.buildings.bench = 1;
  p.buildings.compost = 1;
  return p;
}

export class TitleScene extends Phaser.Scene {
  private view!: FarmView;
  private t = 0;
  private logo!: Phaser.GameObjects.Image;

  constructor() {
    super('title');
  }

  create() {
    const profile = game.profile ?? showcase();
    this.view = new FarmView(this, profile);
    this.view.night = true;
    this.view.placeScarecrow(profile.day);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, FARM_W, 480);
    cam.setScroll(40, 120);
    cam.fadeIn(800, 18, 11, 18);
    // Dusk: a plum wash over the farm, with warm windows and lanterns.
    this.add.rectangle(0, 0, 640, 360, 0x1d1236, 0.55).setOrigin(0, 0).setScrollFactor(0).setDepth(9000);
    // Darker towards the top so the logo sits on the night, not the farm.
    const g = this.add.graphics().setScrollFactor(0).setDepth(9001);
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0x0e071b, 0.05);
      g.fillRect(0, 0, 640, 150 - i * 11);
    }
    // Warm light from windows, the forge and the lanterns, above the dusk wash.
    for (const [x, y, s] of [
      [84, 129, 2.5],
      [130, 129, 2.5],
      [112, 100, 2],
      [566, 126, 4],
      [160, 142, 3],
      [352, 90, 3],
      [416, 90, 3],
    ] as const)
      this.add.image(x, y, ATLAS, 'soft').setTint(0xffa214).setAlpha(0.42).setScale(s).setDepth(9002).setBlendMode(Phaser.BlendModes.ADD);
    // Mother Turnip's candles.
    this.add.image(640, 318, ATLAS, 'soft').setTint(0xffc825).setAlpha(0.4).setScale(3).setDepth(9002).setBlendMode(Phaser.BlendModes.ADD);
    this.logo = this.add.image(320, 58, ATLAS, F('logo')).setScrollFactor(0).setDepth(9100).setScale(2);
    ui.set({ screen: 'title' });
    if (!game.loadResult.ok && game.loadResult.reason === 'corrupt') ui.open('corrupt');
    game.audio.playMusic('title');
    bridge.title = {
      start: (newGame: boolean) => {
        if (newGame) {
          game.profile = newProfile();
          game.save();
        }
        game.audio.unlock();
        ui.closeAll();
        bridge.title = null;
        cam.fadeOut(500, 18, 11, 18);
        this.time.delayedCall(520, () => this.scene.start('farm', { intro: newGame }));
      },
    };
    this.events.once('shutdown', () => (bridge.title = null));
  }

  update(_t: number, dms: number) {
    const dt = dms / 1000;
    this.t += dt;
    this.view.update(dt);
    // Every key on the title screen belongs to its menus.
    game.input.blocked = true;
    game.input.pollGamepad(dt);
    // A slow drift across the farm and back.
    const cam = this.cameras.main;
    const x = 20 + (Math.sin(this.t * 0.05) * 0.5 + 0.5) * (FARM_W - 640 - 20);
    cam.setScroll(Math.round(x), Math.round(70 + Math.sin(this.t * 0.07) * 18));
    this.logo.y = Math.round(58 + Math.sin(this.t * 1.2) * 2);
    game.input.endFrame();
  }
}
