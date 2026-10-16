// preview_ sprites: the ui frames 9-sliced to real sizes with slots and icons
// inside, so stretching and contrast can be judged on the contact sheet.
// They are kept at the end of the ui group and are not used by the game.
import type { SpriteDef } from '../sprite';
import { Board, nineSlice } from './ui-kit';

export function buildPreviews(defs: SpriteDef[]): SpriteDef[] {
  const get = (n: string) => {
    const d = defs.find((x) => x.name === n);
    if (!d) throw new Error(`preview: no sprite ${n}`);
    return d;
  };
  const sliced = (name: string, b: number, w: number, h: number, f = 0): SpriteDef => {
    const d = get(name);
    return { ...d, frames: [nineSlice(d.frames[f], b, w, h)] };
  };

  // Wooden inventory panel with tabs, slots, a bar and HUD icons.
  const wood = new Board(132, 92);
  wood.sprite(sliced('ui_tab', 4, 30, 12, 1), 0, 8, 0);
  wood.sprite(sliced('ui_tab', 4, 30, 12, 0), 0, 38, 0);
  wood.sprite(sliced('ui_wood', 8, 120, 70), 0, 4, 10);
  const slotX = 14;
  const slotY = 22;
  const inSlots = ['tool_can', 'tool_sickle', 'tool_fert', 'tool_can'];
  for (let i = 0; i < 5; i++) {
    wood.sprite(get(i === 1 ? 'ui_slot_sel' : 'ui_slot'), 0, slotX + i * 21, slotY);
    const item = inSlots[i];
    if (item) wood.sprite(get(item), 0, slotX + i * 21 + 2, slotY + 2);
  }
  // A row of small slots with HUD icons.
  ['ic_heart', 'ic_sap', 'ic_farthing', 'ic_seed', 'ic_bag'].forEach((n, i) => {
    wood.sprite(get(n), 0, 16 + i * 12, 48);
  });
  wood.sprite(sliced('ui_bar', 3, 50, 8), 0, 76, 48);
  wood.rect(79, 51, 30, 2, 'red').rect(79, 51, 30, 1, 'coral');
  wood.sprite(sliced('ui_btn', 4, 40, 14, 0), 0, 16, 62);
  wood.sprite(sliced('ui_btn', 4, 40, 14, 1), 0, 60, 62);
  wood.rect(26, 67, 20, 3, 'cream');
  wood.rect(70, 67, 20, 3, 'cream');

  // Parchment card with trait and damage icons.
  const parch = new Board(112, 62);
  parch.sprite(sliced('ui_parchment', 8, 100, 50), 0, 6, 6);
  ['tr_thorned', 'tr_volatile', 'tr_hollow', 'tr_leeching', 'tr_giant', 'tr_echoing', 'tr_frostbound'].forEach((n, i) =>
    parch.sprite(get(n), 0, 16 + i * 12, 16),
  );
  ['tr_infested', 'tr_golden', 'tr_wild', 'tr_burning', 'tr_venomous', 'tr_charged', 'tr_barbed'].forEach((n, i) =>
    parch.sprite(get(n), 0, 16 + i * 12, 28),
  );
  ['dt_physical', 'dt_nature', 'dt_arcane', 'dt_elemental'].forEach((n, i) => parch.sprite(get(n), 0, 16 + i * 10, 41));
  for (let i = 0; i < 4; i++) parch.sprite(get('ic_rarity'), i, 60 + i * 9, 41);
  parch.rect(16, 50, 40, 1, 'loam').rect(16, 52, 28, 1, 'loam');

  // Cursors and HUD icons over farm grass, meadow, dirt and blight.
  const ground = new Board(120, 30);
  const grounds = ['leaf', 'wheat', 'clay', 'plum'] as const;
  grounds.forEach((g, i) => ground.rect(i * 30, 0, 30, 30, g));
  grounds.forEach((_, i) => {
    ground.sprite(get('cur_cross'), 0, i * 30 + 3, 3);
    ground.sprite(get('cur_hand'), 0, i * 30 + 16, 3);
    ground.sprite(get('ic_heart'), 0, i * 30 + 3, 18);
    ground.sprite(get('ic_heart_empty'), 0, i * 30 + 12, 18);
    ground.sprite(get('ic_water'), 0, i * 30 + 21, 18);
  });

  return [wood.toSprite('preview_wood'), parch.toSprite('preview_parchment'), ground.toSprite('preview_ground')];
}
