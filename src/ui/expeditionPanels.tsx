import { useEffect, useState } from 'preact/hooks';
import { bridge, ui, useUi } from './store';
import { Btn, Icon, Keycap, Modal, Traits, Bar } from './components';
import { describeOffer, type Described } from './describe';
import type { Offer, Shop } from '../sim/upgrades';
import { rerollCost, TEA_PRICE } from '../sim/upgrades';
import { game } from '../game/state';
import { fmtTime } from '../core/math';
import { MATERIALS } from '../data/materials';
import { CROPS } from '../data/crops';
import { WEAPONS } from '../data/weapons';
import { hasFrame } from '../render/textures';
import type { RunResult } from '../meta/results';
import type { World } from '../sim/world';
import { keyLabel } from '../meta/settings';

function world(): World | null {
  return (window as unknown as { __HX_world?: World }).__HX_world ?? null;
}

function OfferCard({ d, onPick, index, price, sold, locked, onLock, afford }: { d: Described; onPick: () => void; index?: number; price?: number; sold?: boolean; locked?: boolean; onLock?: () => void; afford?: boolean }) {
  return (
    <button
      class={`card parch ${d.evolve ? 'evolve' : ''}`}
      data-nav
      disabled={sold}
      onMouseEnter={() => game.sfx('ui_move', 0.4)}
      onClick={() => !sold && onPick()}
      style={{ opacity: sold ? 0.45 : 1 }}
    >
      <div class={`rarity-bar bg-${d.rarity}`} />
      <div class="card-head">
        <div class="slot" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 24px' }}>
          <Icon k={d.icon} />
        </div>
        <div class="col" style={{ gap: 0 }}>
          <div class={`card-kind r-${d.rarity}`}>{d.kind}</div>
          <div class="card-name">{d.name}</div>
        </div>
      </div>
      {d.traits && d.traits.length > 0 && (
        <div>
          <Traits traits={d.traits} />
        </div>
      )}
      <ul>
        {d.lines.map((l) => (
          <li>{l}</li>
        ))}
      </ul>
      {d.flavour && <div class="flavour small" style={{ marginTop: 'auto' }}>{d.flavour}</div>}
      {price !== undefined && (
        <div class="row" style={{ marginTop: 'auto', justifyContent: 'space-between' }}>
          <span class={`row ${afford ? '' : 'bad'}`} >
            <Icon k="ic_sap" />
            {sold ? 'Sold' : price}
          </span>
          {onLock && !sold && (
            <span
              class="pill"
              role="button"
              title="Keep this offer for the next visit"
              onClick={(e) => {
                e.stopPropagation();
                onLock();
              }}
              style={{ cursor: 'pointer', background: locked ? 'var(--gold)' : undefined, color: locked ? 'var(--loam)' : undefined }}
            >
              {locked ? 'Locked' : 'Lock'}
            </span>
          )}
        </div>
      )}
      {index !== undefined && <span class="key">{index + 1}</span>}
    </button>
  );
}

export function LevelUpPanel() {
  const data = useUi((s) => s.panelData) as { offers: Offer[]; level: number; rerollCost: number; sap: number };
  const w = world();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= data.offers.length) bridge.expedition?.chooseOffer(n - 1);
      if (e.code === 'KeyR') bridge.expedition?.reroll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data]);
  if (!data || !w) return null;
  const sap = Math.floor(w.run.sap);
  return (
    <Modal clear>
      <div class="col" style={{ alignItems: 'center', gap: '6px' }}>
        <div style={{ textAlign: 'center', textShadow: '1px 1px 0 #000' }}>
          <h2 class="display">Level {data.level}</h2>
          <div class="small">Choose one. {w.run.pendingLevels > 1 ? `(${w.run.pendingLevels - 1} more to come)` : ''}</div>
        </div>
        <div class="cards">
          {data.offers.map((o, i) => (
            <OfferCard d={describeOffer(o, w.run.held.def.id, w.run.held.level)} index={i} onPick={() => bridge.expedition?.chooseOffer(i)} />
          ))}
        </div>
        <div class="row" style={{ gap: '8px', textShadow: '1px 1px 0 #000' }}>
          <Btn onClick={() => bridge.expedition?.reroll()} disabled={sap < data.rerollCost} sound="page">
            <Icon k="ic_reroll" /> Reroll ({data.rerollCost} <Icon k="ic_sap" />)
          </Btn>
          <span class="small muted">
            You have {sap} sap · <Keycap code="1" />-<Keycap code={String(data.offers.length)} /> pick · <Keycap code="R" /> reroll
          </span>
        </div>
      </div>
    </Modal>
  );
}

const MAGS_LINES = [
  'Seeds of entirely legitimate provenance. Mostly.',
  'Don’t mind the snail. Barnaby bites only people he likes.',
  'Everything’s for sale except Barnaby, and he’s negotiable.',
  'You look like someone who needs a pumpkin that explodes.',
  'I found these in a field. The field was not happy about it.',
  'Buy now, dear. The meadow gets meaner further in.',
  'No refunds. Not since the turnip incident.',
];

export function ShopPanel() {
  const data = useUi((s) => s.panelData) as { shop: Shop };
  useUi((s) => s.version);
  const [line] = useState(() => MAGS_LINES[Math.floor(Math.random() * MAGS_LINES.length)]);
  const w = world();
  if (!data || !w) return null;
  const shop = data.shop;
  const sap = Math.floor(w.run.sap);
  const rc = rerollCost(w, shop);
  const final = w.director.index >= w.director.region.acres.length - 1;
  return (
    <Modal width={600} onBack={() => bridge.expedition?.resume()}>
      <div class="wood" style={{ padding: '2px 4px 4px' }}>
        <div class="row" style={{ alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
          <Icon k="portrait_mags" scale={1.5} />
          <div class="col grow" style={{ gap: '2px' }}>
            <h2>Mags’s Cart</h2>
            <div class="speech">“{line}”</div>
            <div class="row small">
              <Icon k="ic_sap" /> <b>{sap}</b> sap to spend <span class="muted">· whatever you keep turns into farthings at home</span>
            </div>
          </div>
        </div>
        <div class="cards">
          {shop.slots.map((s, i) => (
            <OfferCard
              d={describeOffer(s.offer, w.run.held.def.id, w.run.held.level)}
              price={s.price}
              sold={s.sold}
              locked={s.locked}
              afford={sap >= s.price}
              onPick={() => bridge.expedition?.shopBuy(i)}
              onLock={() => bridge.expedition?.shopLock(i)}
            />
          ))}
        </div>
        <div class="row" style={{ marginTop: '5px', gap: '4px', flexWrap: 'wrap' }}>
          <Btn onClick={() => bridge.expedition?.shopReroll()} disabled={sap < rc} sound="page">
            <Icon k="ic_reroll" /> New stock ({rc})
          </Btn>
          <Btn onClick={() => bridge.expedition?.shopTea()} disabled={shop.teaBought || sap < TEA_PRICE} title="Restores half your health">
            <Icon k="cf_57" scale={0.6} /> {shop.teaBought ? 'Tea drunk' : `Mags’s tea, heals 50% (${TEA_PRICE})`}
          </Btn>
          <Btn onClick={() => bridge.expedition?.shopBargain()} disabled={shop.bargain.taken} title={shop.bargain.desc} class={shop.bargain.taken ? '' : 'primary'}>
            <Icon k="ic_skull" /> {shop.bargain.taken ? 'Bargain struck' : `Bargain: ${shop.bargain.name}`}
          </Btn>
          <div class="spacer" />
          <Btn onClick={() => bridge.expedition?.resume()}>Browse the field</Btn>
          <Btn big class="primary" onClick={() => bridge.expedition?.pressOn()} autofocus>
            {final ? 'Ring the bell: face the King' : 'Ring the bell: press on'}
          </Btn>
        </div>
        {!shop.bargain.taken && <div class="small muted" style={{ marginTop: '2px' }}>{shop.bargain.desc}</div>}
        {w.director.index === 1 && hasFrame('boss_eyes_idle_0') && hasFrame('en_crow_fly_0') && hasFrame('eb_eye') && hasFrame('boss_eye_orb_0') && (
          <div class="parch row" style={{ marginTop: '4px', padding: '0 4px 2px', gap: '6px' }}>
            <Icon k="cf_182" />
            <div class="grow small">
              <b>Something with a thousand eyes is watching the old walls.</b> Wake it, and it comes for you in the next acre instead of the Bramble Knight. Far harder; far richer: Watching Eyes, Root Pollen, a Void Shard and a deep chest.
            </div>
            <Btn class={w.run.flags.watcher ? '' : 'primary'} disabled={!!w.run.flags.watcher} onClick={() => bridge.expedition?.wakeWatcher()}>
              {w.run.flags.watcher ? 'It is awake' : 'Wake the Watcher'}
            </Btn>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ChestPanel() {
  const data = useUi((s) => s.panelData) as { offers: Offer[]; evolution: boolean };
  const w = world();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (data && n >= 1 && n <= data.offers.length) bridge.expedition?.chestTake(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data]);
  if (!data || !w) return null;
  return (
    <Modal clear>
      <div class="col" style={{ alignItems: 'center', gap: '6px' }}>
        <div style={{ textAlign: 'center', textShadow: '1px 1px 0 #000' }}>
          <h2 class="display">{data.evolution ? 'The Root Chest hums' : 'A Root Chest'}</h2>
          <div class="small">{data.evolution ? 'Something you carry is ready to change.' : 'Take one prize.'}</div>
        </div>
        <div class="cards">
          {data.offers.map((o, i) => (
            <OfferCard d={describeOffer(o, w.run.held.def.id, w.run.held.level)} index={i} onPick={() => bridge.expedition?.chestTake(i)} />
          ))}
        </div>
        {data.offers.length === 0 && <Btn onClick={() => bridge.expedition?.resume()}>Close</Btn>}
      </div>
    </Modal>
  );
}

export function PausePanel() {
  const [confirm, setConfirm] = useState(false);
  const w = world();
  return (
    <Modal width={220} onBack={() => bridge.expedition?.resume()}>
      <div class="wood" style={{ padding: '2px 6px 6px' }}>
        <h2 style={{ textAlign: 'center' }}>Paused</h2>
        {w && (
          <div class="small" style={{ textAlign: 'center', marginBottom: '4px' }}>
            {w.director.region.name} · {fmtTime(w.t)} · level {w.run.level} · {w.stats.kills} felled
          </div>
        )}
        <div class="col">
          <Btn autofocus onClick={() => bridge.expedition?.resume()}>
            Resume
          </Btn>
          <Btn onClick={() => ui.push('character', { inRun: true })}>Your build</Btn>
          <Btn onClick={() => ui.push('settings')}>Settings</Btn>
          <Btn onClick={() => ui.push('controls')}>Controls</Btn>
          {!confirm ? (
            <Btn onClick={() => setConfirm(true)}>Abandon expedition</Btn>
          ) : (
            <div class="col" style={{ gap: '2px' }}>
              <div class="small" style={{ textAlign: 'center' }}>
                Counts as a defeat: you keep your seeds and 60% of other finds.
              </div>
              <div class="row" style={{ justifyContent: 'center' }}>
                <Btn onClick={() => bridge.expedition?.abandon()}>Yes, give up</Btn>
                <Btn onClick={() => setConfirm(false)}>No</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ExtractPanel() {
  const data = useUi((s) => s.panelData) as { lootSummary: { farthings: number; materials: [string, number][]; seeds: number; sapCollected: number } };
  if (!data) return null;
  const l = data.lootSummary;
  return (
    <Modal width={300} onBack={() => bridge.expedition?.resume()}>
      <div class="parch" style={{ padding: '2px 6px 6px' }}>
        <h2>Head home?</h2>
        <p class="speech" style={{ margin: '2px 0 4px' }}>
          The haycart will take you and everything you carry back to the farm. Nothing is lost by leaving now, but the deeper acres, and the King, hold richer seeds.
        </p>
        <div class="row" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <span class="row">
            <Icon k="ic_farthing" /> {l.farthings}
          </span>
          <span class="row">
            <Icon k="seed_pea" /> {l.seeds} seeds
          </span>
          {l.materials.map(([k, v]) => (
            <span class="row">
              <Icon k={MATERIALS[k]?.icon ?? 'cf_1'} /> {v}
            </span>
          ))}
        </div>
        <div class="small" style={{ marginTop: '3px' }}>
          Your fields will drink {l.sapCollected} sap.
        </div>
        <div class="row" style={{ marginTop: '6px', justifyContent: 'flex-end' }}>
          <Btn onClick={() => bridge.expedition?.resume()}>Stay a while</Btn>
          <Btn class="primary" autofocus onClick={() => bridge.expedition?.extract()}>
            Load the haycart
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

const OUTCOME = {
  victory: { title: 'The King is Fallen', sub: 'The royal patch is quiet. Take his heart home and plant it.', colour: 'var(--butter)' },
  extracted: { title: 'Home with the Haul', sub: 'You left while the leaving was good.', colour: 'var(--sprout)' },
  defeat: { title: 'Carried Home', sub: 'Mags found you in a furrow and brought you back on the cart.', colour: 'var(--coral)' },
};

export function ResultsPanel() {
  const r = useUi((s) => s.results) as RunResult | null;
  if (!r) return null;
  const o = OUTCOME[r.outcome];
  const maxDmg = Math.max(1, ...r.weapons.map((x) => x.damage));
  const grew = r.growth.length;
  const ready = r.growth.filter((g) => g.after >= 3).length;
  const seeds = new Map<string, { species: string; traits: string[]; n: number }>();
  for (const s of r.seeds) {
    const k = `${s.species}|${s.traits.join(',')}`;
    const g = seeds.get(k);
    if (g) g.n++;
    else seeds.set(k, { species: s.species, traits: s.traits, n: 1 });
  }
  const home = () => bridge.expedition?.finish();
  return (
    // However big the haul, the way home stays on screen: the middle scrolls,
    // and Escape also returns to the farm.
    <Modal width={560} onBack={home}>
      <div class="wood col" style={{ padding: '2px 6px 6px', gap: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 class="display" style={{ color: o.colour, fontSize: '30px' }}>{o.title}</h2>
          <div class="small">{o.sub}</div>
          {r.outcome === 'defeat' && <div class="small bad">Felled by {r.cause || 'the meadow'}. You kept all seeds and growth, and {Math.round(r.keptShare * 100)}% of farthings and materials.</div>}
        </div>
        <div class="scroll results-body">
        <div class="row" style={{ alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
          <div class="parch" style={{ flex: '0 0 170px', padding: '0 4px 2px' }}>
            <h3>The expedition</h3>
            <table class="stats">
              <tbody>
                <tr><td>Time</td><td>{fmtTime(r.time)}</td></tr>
                <tr><td>Reached</td><td>{r.acreName}</td></tr>
                <tr><td>Level</td><td>{r.level}</td></tr>
                <tr><td>Felled</td><td>{r.kills}</td></tr>
                <tr><td>Elites</td><td>{r.elites}</td></tr>
                <tr><td>Bosses</td><td>{r.bosses}</td></tr>
                <tr><td>Damage dealt</td><td>{r.damageDealt.toLocaleString('en-GB')}</td></tr>
                <tr><td>Damage taken</td><td>{r.damageTaken}</td></tr>
                <tr><td>Healed</td><td>{r.healed}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="parch" style={{ flex: 1, padding: '0 4px 2px' }}>
            <h3>Most effective</h3>
            <div class="col" style={{ gap: '1px' }}>
              {r.weapons.slice(0, 6).map((wp) => (
                <div class="row" style={{ gap: '3px' }}>
                  <Icon k={WEAPONS[wp.id]?.icon ?? 'ic_star'} />
                  <div style={{ width: '82px', fontSize: 'calc(10px * var(--fs))' }}>
                    {wp.name} <span class="muted">{wp.level}</span>
                  </div>
                  <div class="grow" style={{ height: '5px', background: 'rgba(57,31,33,0.15)' }}>
                    <div style={{ width: `${(wp.damage / maxDmg) * 100}%`, height: '5px', background: 'var(--wood)' }} />
                  </div>
                  <div class="small" style={{ width: '34px', textAlign: 'right' }}>
                    {wp.damage.toLocaleString('en-GB')}
                  </div>
                </div>
              ))}
            </div>
            {r.evolved.length > 0 && (
              <div class="small good" style={{ marginTop: '2px' }}>
                Evolved: {r.evolved.map((e) => WEAPONS[e]?.name).join(', ')}
              </div>
            )}
          </div>
        </div>
        <div class="parch" style={{ marginTop: '4px', padding: '0 4px 2px' }}>
          <h3>Brought home</h3>
          <div class="row" style={{ flexWrap: 'wrap', gap: '1px 8px' }}>
            <span class="row" title={r.sapFarthings ? `${r.sapFarthings} from leftover sap` : ''}>
              <Icon k="ic_farthing" /> <b>{r.farthings}</b> farthings
            </span>
            {Object.entries(r.materials).map(([k, v]) => (
              <span class="row" title={MATERIALS[k]?.name ?? k}>
                <Icon k={MATERIALS[k]?.icon ?? 'cf_1'} /> {v}
                {Object.keys(r.materials).length <= 6 && ` ${MATERIALS[k]?.name ?? k}`}
              </span>
            ))}
          </div>
          {seeds.size > 0 && (
            <div class="row" style={{ flexWrap: 'wrap', gap: '1px 8px', marginTop: '2px' }}>
              {[...seeds.values()].map((s) => (
                <span class={`row r-${CROPS[s.species]?.rarity}`}>
                  <Icon k={CROPS[s.species]?.seed ?? 'seed_pea'} />
                  {CROPS[s.species]?.name ?? s.species}
                  {s.n > 1 && <span class="muted">x{s.n}</span>}
                  <Traits traits={s.traits} />
                </span>
              ))}
            </div>
          )}
          <div class="small" style={{ marginTop: '2px' }}>
            Your fields drank <b>{r.sapCollected}</b> sap{r.outcome === 'victory' ? ' (and a victory’s worth more)' : ''}. {grew ? `${grew} crop${grew > 1 ? 's' : ''} grew${ready ? `, ${ready} ready to harvest` : ''}.` : 'Nothing was planted to drink it.'}
          </div>
        </div>
        {r.unlocks.length > 0 && (
          <div class="parch" style={{ marginTop: '4px', padding: '0 4px 2px' }}>
            {r.unlocks.map((u) => (
              <div class="good">✦ {u}</div>
            ))}
          </div>
        )}
        </div>
        <div class="row" style={{ justifyContent: 'center', marginTop: '5px', flex: '0 0 auto' }}>
          <Btn big class="primary" autofocus onClick={home}>
            Return to the farm
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export function RunBuildPanel({ onBack }: { onBack: () => void }) {
  const w = world();
  if (!w) return null;
  const run = w.run;
  const s = run.stats;
  const rows: [string, string][] = [
    ['Health', `${Math.ceil(w.player.hp)} / ${s.maxHp}`],
    ['Regeneration', `${s.regen.toFixed(1)}/s`],
    ['Armour', `${s.armour}`],
    ['Damage', `${Math.round(s.damage * 100)}%`],
    ['Attack speed', `${Math.round(s.attackSpeed * 100)}%`],
    ['Crit', `${Math.round(s.critChance * 100)}% for x${(1 + s.critDamage).toFixed(2)}`],
    ['Move speed', `${Math.round(s.moveSpeed * 100)}%`],
    ['Area', `${Math.round(s.area * 100)}%`],
    ['Luck', `${s.luck}`],
    ['Sap yield', `${Math.round(s.sapYield * 100)}%`],
  ];
  return (
    <Modal width={520} onBack={onBack}>
      <div class="wood" style={{ padding: '2px 6px 6px' }}>
        <div class="row">
          <h2>Your build</h2>
          <div class="spacer" />
          <span class="small">{run.cls.name} · level {run.level}</span>
        </div>
        <div class="row" style={{ alignItems: 'flex-start', gap: '6px' }}>
          <div class="parch" style={{ flex: '0 0 170px', padding: '0 4px 2px' }}>
            <h3>Stats</h3>
            <table class="stats">
              <tbody>
                {rows.map(([a, b]) => (
                  <tr>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div class="small" style={{ marginTop: '2px' }}>
              <b>{run.cls.passive.name}:</b> {run.cls.passive.desc}
            </div>
          </div>
          <div class="parch scroll" style={{ flex: 1, padding: '0 4px 2px', maxHeight: '250px' }}>
            <h3>Weapons</h3>
            {[run.held, ...run.weapons].map((wi) => (
              <div class="row" style={{ alignItems: 'flex-start', marginBottom: '2px' }}>
                <Icon k={wi.def.icon} />
                <div class="grow">
                  <b>{wi.def.name}</b> <span class="muted">Lv {wi.level}</span> <Traits traits={wi.allTraits} />
                  <div class="small">{wi.def.desc}</div>
                  {wi.evolution(run) && <div class="small good">Ready to evolve into {WEAPONS[wi.evolution(run)!.into].name}: a level-up or Root Chest will offer it.</div>}
                </div>
              </div>
            ))}
            {run.items.length > 0 && <h3>Items</h3>}
            <div class="row" style={{ flexWrap: 'wrap' }}>
              {run.items.map((it) => (
                <span class="row small" title={it.id}>
                  <Icon k={ITEM_ICON(it.id)} />x{it.count}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div class="row" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
          <span class="small muted">
            <Keycap code={keyLabel(game.settings.keys.pause[0])} /> back
          </span>
          <Btn autofocus onClick={onBack}>
            Back
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

import { ITEMS } from '../data/items';
function ITEM_ICON(id: string) {
  return ITEMS[id]?.icon ?? 'ic_star';
}

export { Bar };
