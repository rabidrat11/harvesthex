// Plays expeditions headlessly with the autopilot and prints how they went.
//   npm run balance                    3 seeds per class
//   npm run balance -- --seeds 10 --class reaper --skill 0.5
import { World } from '../src/sim/world';
import { Bot, simulate } from '../src/sim/bot';
import type { Loadout } from '../src/sim/run';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : d;
};
const seeds = Number(opt('seeds', '3'));
const classes = opt('class', 'fieldhand,botanist,reaper').split(',');
const skill = Number(opt('skill', '0.7'));
const tier = Number(opt('tier', '1'));
const verbose = args.includes('--verbose');
const reaction = Number(opt('reaction', '0'));

for (const cls of classes) {
  const rows = [];
  for (let s = 0; s < seeds; s++) {
    const loadout: Loadout = { classId: cls, region: 'meadow', tier, seed: 1000 + s * 7919, grafts: [], consumables: [{ id: 'jam', count: 2 }], equipment: {}, heldTier: 0, perks: [] };
    const w = new World(loadout, { autoAim: true, autoFire: true, damageNumbers: 'off', intensity: 'standard' });
    const t0 = Date.now();
    const r = simulate(w, new Bot(w, { skill, shop: true, reaction }));
    rows.push({ ...r, ms: Date.now() - t0 });
  }
  console.log(`\n== ${cls} (skill ${skill}, tier ${tier}) ==`);
  for (const r of rows) {
    console.log(
      `${r.outcome.padEnd(9)} t=${r.time}s acre=${r.acre} lvl=${r.level} kills=${r.kills} sap=${r.sapCollected} boss=${r.bossHpFrac ?? '-'} hp=${r.hp} levels@60/180/300/600=${Object.values(r.levelAt).join('/')} acres@${r.acreTimes.join(',')} (${r.ms}ms)`,
    );
    if (verbose) {
      console.log('   weapons', r.weapons.join(' '));
      console.log('   dmg', r.dps.map((d) => `${d.id}=${d.dmg}`).join(' '));
      console.log('   last hurt by', r.cause);
    }
  }
}
