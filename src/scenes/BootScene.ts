import Phaser from 'phaser';
import { buildTextures } from '../render/textures';
import { ui } from '../ui/store';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // Licensed icon sheet: present locally and on the deployed site, absent from the repo.
    this.load.image('cf-icons', 'assets/cf-icons-16.png');
    this.load.on('loaderror', (file: { key: string }) => {
      if (file.key === 'cf-icons') console.warn('[art] icon sheet missing; using markers');
    });
  }

  async create() {
    buildTextures(this);
    // Make sure the pixel fonts are ready before any DOM text is measured.
    try {
      await document.fonts.load('20px "Jersey 10"');
    } catch {
      /* fonts fall back gracefully */
    }
    // A test hook (or a quick-start link) may already have started a scene.
    const busy = ['title', 'farm', 'expedition'].some((k) => this.scene.isActive(k));
    if (!busy) {
      ui.set({ screen: 'title' });
      this.scene.start('title');
    } else this.scene.stop();
  }
}
