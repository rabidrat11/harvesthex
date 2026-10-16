import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/400-italic.css';
import '@fontsource/atkinson-hyperlegible-next/700.css';
import '@fontsource/jersey-10/400.css';
import './ui/styles.css';
import Phaser from 'phaser';
import { render, h } from 'preact';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { FarmScene } from './scenes/FarmScene';
import { ExpeditionScene } from './scenes/ExpeditionScene';
import { App } from './ui/App';
import { game } from './game/state';
import { ui } from './ui/store';
import { installDebug } from './debug/debug';

export const GAME_W = 640;
export const GAME_H = 360;

const phaser = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1c121c',
  scale: { mode: Phaser.Scale.NONE },
  fps: { target: 60, smoothStep: true },
  input: { keyboard: false, mouse: { preventDefaultWheel: false } },
  audio: { noAudio: true },
  scene: [BootScene, TitleScene, FarmScene, ExpeditionScene],
});

document.body.classList.toggle('font-pixel', game.settings.uiFont === 'pixel');
render(h(App, {}), document.getElementById('ui')!);

// Integer scaling keeps every pixel square; 'fit' fills the window instead.
function layout() {
  const frame = document.getElementById('frame')!;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fit = Math.min(vw / GAME_W, vh / GAME_H);
  // Pixel-perfect needs at least 2x to keep text readable; below that, fit smoothly.
  const zoom = game.settings.scaling === 'pixel' && fit >= 2 ? Math.floor(fit) : Math.max(0.5, fit);
  frame.style.width = `${GAME_W * zoom}px`;
  frame.style.height = `${GAME_H * zoom}px`;
  document.documentElement.style.setProperty('--zoom', String(zoom));
  const canvas = phaser.canvas;
  if (canvas) {
    canvas.style.width = `${GAME_W * zoom}px`;
    canvas.style.height = `${GAME_H * zoom}px`;
    game.input.attach(canvas, zoom);
  }
  ui.set({ zoom });
}
window.addEventListener('resize', layout);
phaser.events.once('ready', layout);
setTimeout(layout, 0);
(window as unknown as { relayout: () => void }).relayout = layout;

// First interaction unlocks audio.
const unlock = () => {
  game.audio.unlock();
  game.audio.warm();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

installDebug(phaser);
