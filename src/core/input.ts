// Keyboard and mouse, read through the player's bindings. Scenes poll it;
// while a menu is open the game sees nothing (the DOM interface owns input).

import type { Action, Settings } from '../meta/settings';

export class Input {
  private down = new Set<string>();
  private pressedOnce = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  /** Mouse position in game pixels (640x360 space). */
  gameX = 0;
  gameY = 0;
  mouseDown = false;
  rightDown = false;
  rightPressed = false;
  leftPressed = false;
  blocked = false;
  wheel = 0;
  private canvas: HTMLElement | null = null;
  private zoom = 1;
  lastDevice: 'keyboard' | 'mouse' | 'pad' = 'keyboard';
  /** Gamepad: left stick movement and right stick aim (unit vector or null). */
  padMove = { x: 0, y: 0 };
  padAim: { x: number; y: number } | null = null;
  padFire = false;
  private padPrev: boolean[] = [];
  private padNavT = 0;
  private padActions = new Set<string>();

  constructor(private settings: () => Settings) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressedOnce.add(e.code);
      this.lastDevice = 'keyboard';
      // Tab and Space would move focus or scroll the page.
      if (!this.blocked && (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouseDown = false;
      this.rightDown = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateGamePos();
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        if (!this.overUi(e)) this.leftPressed = true;
      }
      if (e.button === 2) {
        this.rightDown = true;
        if (!this.overUi(e)) this.rightPressed = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    window.addEventListener('wheel', (e) => (this.wheel += Math.sign(e.deltaY)), { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private overUi(e: MouseEvent) {
    const t = e.target as HTMLElement | null;
    return !!t?.closest?.('[data-ui-block]');
  }

  attach(canvas: HTMLElement, zoom: number) {
    this.canvas = canvas;
    this.zoom = zoom;
    this.updateGamePos();
  }

  private updateGamePos() {
    if (!this.canvas) return;
    const r = this.canvas.getBoundingClientRect();
    this.gameX = ((this.mouseX - r.left) / r.width) * 640;
    this.gameY = ((this.mouseY - r.top) / r.height) * 360;
    void this.zoom;
  }

  /** Read the first connected gamepad. Call once per frame before using input. */
  pollGamepad(dt: number) {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
    if (!gp) {
      this.padMove = { x: 0, y: 0 };
      this.padAim = null;
      this.padFire = false;
      return;
    }
    const dz = (v: number) => (Math.abs(v) < 0.22 ? 0 : v);
    let mx = dz(gp.axes[0] ?? 0);
    let my = dz(gp.axes[1] ?? 0);
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    if (b(14)) mx = -1;
    if (b(15)) mx = 1;
    if (b(12)) my = -1;
    if (b(13)) my = 1;
    const ax = dz(gp.axes[2] ?? 0);
    const ay = dz(gp.axes[3] ?? 0);
    const al = Math.hypot(ax, ay);
    this.padMove = { x: mx, y: my };
    this.padAim = al > 0.3 ? { x: ax / al, y: ay / al } : null;
    this.padFire = b(7) || b(5) || al > 0.85;
    const edge = (i: number) => b(i) && !this.padPrev[i];
    if (gp.buttons.some((x) => x.pressed) || Math.hypot(mx, my) > 0) this.lastDevice = 'pad';
    // Map buttons onto the same actions as the keyboard.
    if (edge(0)) this.padActions.add('dash');
    if (edge(2)) this.padActions.add('interact');
    if (edge(3)) this.padActions.add('consumable');
    if (edge(9)) this.padActions.add('pause');
    if (edge(8)) this.padActions.add('map');
    if (edge(6) || edge(4)) this.rightPressed = !this.blocked;
    // In menus, the pad drives the same arrow-key navigation.
    if (this.blocked || document.querySelector('.nav-root')) {
      this.padNavT -= dt;
      const dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'ArrowRight' : mx < 0 ? 'ArrowLeft' : '') : my > 0 ? 'ArrowDown' : my < 0 ? 'ArrowUp' : '';
      if (dir && this.padNavT <= 0) {
        this.padNavT = 0.18;
        window.dispatchEvent(new KeyboardEvent('keydown', { code: dir, key: dir }));
      }
      if (!dir) this.padNavT = 0;
      if (edge(0)) (document.activeElement as HTMLElement | null)?.click?.();
      if (edge(1)) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
    }
    this.padPrev = gp.buttons.map((x) => x.pressed);
  }

  held(a: Action): boolean {
    if (this.blocked) return false;
    return this.settings().keys[a].some((k) => this.down.has(k));
  }

  /** True once per key press. */
  pressed(a: Action): boolean {
    if (this.padActions.has(a)) {
      this.padActions.delete(a);
      if (!this.blocked || a === 'pause') return true;
    }
    const keys = this.settings().keys[a];
    for (const k of keys) {
      if (this.pressedOnce.has(k)) {
        this.pressedOnce.delete(k);
        return !this.blocked || a === 'pause';
      }
    }
    return false;
  }

  /** The interface handled this key; the game should not also see it. */
  consume(code: string) {
    this.pressedOnce.delete(code);
  }

  /** Raw key query used by menus regardless of blocking. */
  isDown(code: string) {
    return this.down.has(code);
  }

  /** Call at the end of each frame. */
  endFrame() {
    this.pressedOnce.clear();
    this.padActions.clear();
    this.leftPressed = false;
    this.rightPressed = false;
    this.wheel = 0;
  }

  move(): { x: number; y: number } {
    if (!this.blocked && (this.padMove.x || this.padMove.y)) {
      const l = Math.hypot(this.padMove.x, this.padMove.y);
      return l > 1 ? { x: this.padMove.x / l, y: this.padMove.y / l } : { ...this.padMove };
    }
    let x = 0;
    let y = 0;
    if (this.held('left')) x -= 1;
    if (this.held('right')) x += 1;
    if (this.held('up')) y -= 1;
    if (this.held('down')) y += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  clear() {
    this.down.clear();
    this.pressedOnce.clear();
    this.mouseDown = false;
    this.rightDown = false;
  }
}
