import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { bridge, ui, useUi, type Panel } from './store';
import { Btn, Cost, Icon, Keycap, Modal, Traits } from './components';
import { game } from '../game/state';
import { keyLabel } from '../meta/settings';
import { CROPS, BASE_SPECIES, HYBRID_SPECIES, hybridOf, MATURE } from '../data/crops';
import { WEAPONS, EVOLUTIONS } from '../data/weapons';
import { TRAITS, REAGENT_TRAITS } from '../data/traits';
import { MATERIALS } from '../data/materials';
import { CLASSES, CLASS_ORDER, BASE_STATS } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { REPAIRS, EXPANSIONS, HELD_TIERS, EQUIPMENT, JARS, maxJars } from '../data/farm';
import { QUALITY_LABEL, FAMILY_LABEL, type Quality } from '../data/types';
import { ROT_TIERS } from '../data/regions';
import { describeWeapon, weaponSummary } from './describe';
import { addSeeds, hasMaterials, payMaterials, type ProduceStack, type EquipSlot } from '../meta/profile';
import { compostProduce, compostSeed, crossbreed, mutateCrop, plotStage, preserve, clampLoadoutJars } from '../farm/farm';
import { Rng } from '../core/rng';
import { describeMods, fmtStat, STAT_INFO, type StatKey } from '../data/stats';
import { unlockProgress } from '../meta/results';
import { hasFrame } from '../render/textures';
import { fmtTime } from '../core/math';
import type { FarmScene } from '../scenes/FarmScene';

const rng = new Rng((Date.now() ^ 0xbeef) >>> 0);

function farmScene(): FarmScene | null {
  return (window as unknown as { __HX_farm?: FarmScene }).__HX_farm ?? null;
}

function refresh() {
  game.autosave();
  bridge.farm?.refresh();
  ui.bump();
}

// ---------------------------------------------------------------------------
// HUD

const TOOL_ICONS = ['ic_hand', 'cf_162', 'tool_can', 'seed', 'tool_fert'];
const TOOL_NAMES = ['Hand (does whatever makes sense)', 'Hoe', 'Watering can', 'Seeds', 'Compost'];

export function FarmHud() {
  const f = useUi((s) => s.farm) as { prompt: string | null; tool: number; seed: number; hint: string | null; plotTip?: string | null } | null;
  const panel = useUi((s) => s.panel);
  const p = game.profile;
  if (!f || !p) return null;
  const keys = game.settings.keys;
  const seed = p.seeds[f.seed];
  return (
    <div class="hud">
      <div class="hud-tl">
        <div class="title-font" style={{ fontSize: '20px', lineHeight: 0.8, color: 'var(--butter)' }}>
          Day {p.day}
        </div>
        <div class="row" style={{ gap: '7px' }}>
          <span class="row" title="Farthings">
            <Icon k="ic_farthing" />
            <b>{p.farthings}</b>
          </span>
          {p.buildings.compost >= 1 && (
            <span class="row" title={`Fertiliser (compost ${p.compost}/3 to the next bag)`}>
              <Icon k="tool_fert" scale={0.6} />
              {p.fertiliser}
            </span>
          )}
          <span class="row" title="Jars of preserves">
            <Icon k="cf_61" scale={0.6} />
            {Object.values(p.jars).reduce((a, b) => a + b, 0)}
          </span>
        </div>
      </div>
      <div class="hud-tr small" style={{ opacity: 0.8 }}>
        <span>
          <Keycap code={keyLabel(keys.map[0])} /> character · <Keycap code={keyLabel(keys.inventory[0])} /> stores · <Keycap code={keyLabel(keys.pause[0])} /> menu
        </span>
      </div>
      {f.hint && !panel && <div class="hint parch">{f.hint}</div>}
      {f.prompt && !panel && (
        <div class="prompt" style={{ bottom: '58px' }}>
          <Keycap code={keyLabel(keys.interact[0])} /> {f.prompt}
        </div>
      )}
      {f.plotTip && !panel && (
        <div class="prompt" style={{ bottom: f.prompt ? '76px' : '58px', maxWidth: '360px', whiteSpace: 'normal', textAlign: 'center' }}>
          {f.plotTip}
        </div>
      )}
      <div class="hud-bottom" style={{ flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
        {(f.tool === 0 || f.tool === 3) && (
          <div class="small" style={{ textShadow: '1px 1px 0 #000' }}>
            {seed ? (
              <span class="row">
                <Icon k={CROPS[seed.species]?.seed ?? 'seed_pea'} /> {CROPS[seed.species]?.name} x{seed.count} <Traits traits={seed.traits} />
                <span class="muted">(wheel to change)</span>
              </span>
            ) : (
              <span class="muted">No seeds</span>
            )}
          </div>
        )}
        <div class="row" style={{ gap: '2px' }}>
          {TOOL_ICONS.map((ic, i) => (
            <div
              class={`wslot slot interactive ${f.tool === i ? 'sel' : ''}`}
              data-ui-block
              title={TOOL_NAMES[i]}
              onClick={() => farmScene()?.setTool(i)}
              style={{ cursor: 'pointer' }}
            >
              <Icon k={ic === 'seed' ? (seed ? CROPS[seed.species]?.seed ?? 'seed_pea' : 'ic_seed') : ic} />
              <span class="lvl" style={{ color: 'var(--cream)' }}>
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits

function Frame({ title, children, width, portrait, sub }: { title: string; children: ComponentChildren; width?: number; portrait?: string; sub?: string }) {
  const close = () => bridge.farm?.closePanel();
  return (
    <Modal width={width ?? 560} onBack={close}>
      <div class="wood" style={{ padding: '2px 5px 5px' }}>
        <div class="row" style={{ alignItems: 'flex-start', gap: '5px' }}>
          {portrait && <Icon k={portrait} scale={1.25} />}
          <div class="col grow" style={{ gap: '1px' }}>
            <div class="row">
              <h2>{title}</h2>
              <div class="spacer" />
              <span class="row small" title="Farthings">
                <Icon k="ic_farthing" /> {game.profile?.farthings ?? 0}
              </span>
              <Btn onClick={close}>Close</Btn>
            </div>
            {sub && <div class="speech">{sub}</div>}
          </div>
        </div>
        {children}
      </div>
    </Modal>
  );
}

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (t: T) => void }) {
  return (
    <div class="tabs" style={{ marginTop: '3px' }}>
      {tabs.map(([k, l]) => (
        <button
          data-nav
          class={`tab ${value === k ? 'on' : ''}`}
          onClick={() => {
            game.sfx('page', 0.4);
            onChange(k);
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function ProduceSlot({ s, onClick, selected }: { s: ProduceStack; onClick: () => void; selected?: boolean }) {
  const c = CROPS[s.species];
  return (
    <button class={`itemslot slot ${selected ? 'sel' : ''}`} data-nav onClick={onClick} title={`${QUALITY_LABEL[s.quality]} ${c?.name}${s.traits.length ? ' (' + s.traits.map((t) => TRAITS[t].name).join(', ') + ')' : ''}`}>
      <Icon k={c?.produce ?? 'cf_1'} />
      <span class="n">{s.count}</span>
      <span class="q">{'★'.repeat(s.quality - 1)}</span>
      {s.traits.length > 0 && <span style={{ position: 'absolute', left: 0, bottom: 0, width: '4px', height: '4px', background: TRAITS[s.traits[0]].colour, boxShadow: '0 0 0 1px #000' }} />}
    </button>
  );
}

function ProduceDetail({ s }: { s: ProduceStack }) {
  const c = CROPS[s.species];
  const w = c.weapon ? WEAPONS[c.weapon] : null;
  return (
    <div class="col" style={{ gap: '1px' }}>
      <div class="row">
        <Icon k={c.produce} />
        <b>
          {QUALITY_LABEL[s.quality]} {c.name}
        </b>
        <span class={`small r-${c.rarity}`}>{FAMILY_LABEL[c.family]}</span>
      </div>
      <Traits traits={s.traits} />
      {s.traits.map((t) => (
        <div class="small">
          <b>{TRAITS[t].name}:</b> {TRAITS[t].desc}
        </div>
      ))}
      {w ? (
        <div class="small">
          Grafts into <b>{w.name}</b> at level {s.quality}: {w.desc} <span class="muted">({weaponSummary(w, s.quality)})</span>
        </div>
      ) : (
        <div class="small">{c.desc}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function FarmPanel({ panel }: { panel: Panel }) {
  switch (panel) {
    case 'intro':
      return <IntroPanel />;
    case 'pause':
      return <FarmPausePanel />;
    case 'character':
      return <CharacterPanel />;
    case 'potting':
      return <PottingPanel />;
    case 'bench':
      return <BenchPanel />;
    case 'archive':
      return <ArchivePanel />;
    case 'smithy':
      return <SmithyPanel />;
    case 'compost':
      return <CompostPanel />;
    case 'shrine':
      return <ShrinePanel />;
    case 'farmhouse':
      return <FarmhousePanel />;
    default:
      return null;
  }
}

function IntroPanel() {
  return (
    <Modal width={330} onBack={() => bridge.farm?.closePanel()}>
      <div class="parch" style={{ padding: '2px 7px 7px' }}>
        <h2>Gran’s farm</h2>
        <p class="speech">
          It sits on the edge of the Blighted Meadow. Since the Root woke beneath the fields, crops here grow into strange and dangerous things, and the people who farm them have learned to fight with what they grow.
        </p>
        <p class="speech">
          She left you three tilled beds, a handful of peas, and a note in the almanac: <i>“Plant everything. Feed it what you find out there. Trust the turnip.”</i>
        </p>
        <div class="small muted">
          <b>WASD</b> to walk · <b>mouse</b> to tend the beds · <b>E</b> to use buildings
        </div>
        <div class="row" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
          <Btn big class="primary" autofocus onClick={() => bridge.farm?.closePanel()}>
            Get to work
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function FarmPausePanel() {
  return (
    <Modal width={210} onBack={() => bridge.farm?.closePanel()}>
      <div class="wood" style={{ padding: '2px 6px 6px' }}>
        <h2 style={{ textAlign: 'center' }}>Day {game.profile?.day}</h2>
        <div class="col">
          <Btn autofocus onClick={() => bridge.farm?.closePanel()}>
            Back to the farm
          </Btn>
          <Btn onClick={() => ui.push('settings')}>Settings</Btn>
          <Btn onClick={() => ui.push('controls')}>Controls</Btn>
          <Btn
            onClick={() => {
              game.save();
              ui.closeAll();
              const s = farmScene();
              s?.cameras.main.fadeOut(300, 18, 11, 18);
              s?.time.delayedCall(320, () => s.scene.start('title'));
            }}
          >
            Save and return to title
          </Btn>
          <div class="small muted" style={{ textAlign: 'center' }}>
            {game.lastSaveOk ? 'Your farm saves itself as you play.' : 'Warning: the browser is refusing to save.'}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Character and equipment

function computedBase(clsId: string) {
  const c = CLASSES[clsId];
  const mods = game.equipmentMods();
  const s: Partial<Record<StatKey, number>> = { ...BASE_STATS };
  for (const [k, v] of Object.entries(c.base)) s[k as StatKey] = k === 'maxHp' ? (v as number) : (s[k as StatKey] ?? 0) + (v as number);
  for (const [k, v] of Object.entries(mods)) s[k as StatKey] = (s[k as StatKey] ?? 0) + (v as number);
  return s;
}

/** A class portrait, or its standing sprite if the portrait is not drawn. */
function portraitOf(id: string) {
  const k = CLASSES[id].portrait;
  return hasFrame(k) ? k : `hero_${id}_down_idle_0`;
}

function CharacterPanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  const [sel, setSel] = useState(p.classes.selected);
  const c = CLASSES[sel];
  const unlocked = p.classes.unlocked.includes(sel);
  const stats = computedBase(sel);
  const [have, need] = unlockProgress(p, sel);
  const show: StatKey[] = ['maxHp', 'regen', 'armour', 'moveSpeed', 'attackSpeed', 'damage', 'critChance', 'critDamage', 'physical', 'nature', 'arcane', 'elemental', 'summonPower', 'statusDuration', 'area', 'luck', 'sapYield', 'projCount'];
  const shown = show.filter((k) => k === 'maxHp' || k === 'armour' || Math.abs(stats[k] ?? 0) > 1e-6);
  return (
    <Frame title="Who goes out today?" width={612}>
      <div class="row" style={{ gap: '4px', marginTop: '3px', alignItems: 'stretch' }}>
        <div class="grid" style={{ gridTemplateColumns: 'repeat(4, 34px)', gap: '2px', alignContent: 'start' }}>
          {CLASS_ORDER.map((id) => {
            const cc = CLASSES[id];
            const ok = p.classes.unlocked.includes(id);
            return (
              <button
                class={`itemslot slot ${sel === id ? 'sel' : ''}`}
                data-nav
                style={{ width: '34px', height: '34px', opacity: ok ? 1 : 0.5, filter: ok ? undefined : 'grayscale(0.8)' }}
                title={cc.title}
                onClick={() => setSel(id)}
                onFocus={() => setSel(id)}
              >
                <Icon k={portraitOf(id)} scale={0.8} />
                {p.classes.selected === id && <span class="q">{'\u2605'}</span>}
                {!ok && <span class="n"><Icon k="ic_lock" /></span>}
              </button>
            );
          })}
        </div>
        <div class="parch grow" style={{ padding: '0 4px 3px' }}>
          <div class="row" style={{ alignItems: 'flex-start' }}>
            <Icon k={portraitOf(sel)} />
            <div class="col grow" style={{ gap: '1px' }}>
              <h3>{c.name}</h3>
              <div class="small">{c.blurb}</div>
              <div class="small">
                <b>Holds:</b> {WEAPONS[c.held].name} <span class="muted">({WEAPONS[c.held].desc})</span>
              </div>
              <div class="small">
                <b>Starts with:</b> {WEAPONS[c.starter].name}
              </div>
            </div>
          </div>
          <div class="small" style={{ marginTop: '2px' }}>
            <b>{c.passive.name}:</b> {c.passive.desc}
          </div>
          <div class="small">
            <b>Right click, {c.active.name}:</b> {c.active.desc} <span class="muted">({c.active.cooldown}s)</span>
          </div>
          <div class="small bad">
            <b>Weakness:</b> {c.weakness}
          </div>
          {!unlocked && c.unlock && (
            <div class="small" style={{ marginTop: '2px' }}>
              <Icon k="ic_lock" /> <b>To unlock:</b> {c.unlock.desc} <span class="pill">{Math.min(have, need)}/{need}</span>
            </div>
          )}
          {unlocked && p.classes.selected !== sel && (
            <div style={{ marginTop: '3px' }}>
              <Btn
                class="primary"
                onClick={() => {
                  p.classes.selected = sel;
                  refresh();
                }}
              >
                Choose the {c.title}
              </Btn>
            </div>
          )}
          {unlocked && p.classes.selected === sel && <div class="small good" style={{ marginTop: '2px' }}>Going out today.</div>}
        </div>
        <div class="parch" style={{ flex: '0 0 140px', padding: '0 4px 2px' }}>
          <h3>Starting stats</h3>
          <table class="stats">
            <tbody>
              {shown.map((k) => (
                <tr>
                  <td>{STAT_INFO[k].label}</td>
                  <td class={(stats[k] ?? 0) < 0 ? 'bad' : ''}>{k === 'maxHp' || k === 'armour' || k === 'luck' || k === 'projCount' ? Math.round(stats[k] ?? 0) : k === 'critDamage' ? `x${(1 + (stats[k] ?? 0)).toFixed(2)}` : k === 'critChance' ? `${Math.max(0, Math.round((stats[k] ?? 0) * 100))}%` : fmtStat(k, stats[k] ?? 0, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: '4px' }}>
        <EquipmentBlock />
      </div>
    </Frame>
  );
}

function EquipmentBlock() {
  const p = game.profile!;
  const slots: EquipSlot[] = ['head', 'body', 'feet', 'charm'];
  return (
    <div class="parch grow" style={{ padding: '0 4px 2px' }}>
      <h3>Equipment</h3>
      <div class="small muted">Crafted at Bertha’s smithy. Worn on every expedition, never lost.</div>
      {slots.map((slot) => {
        const owned = p.equipment.owned.filter((id) => EQUIPMENT[id]?.slot === slot);
        const cur = p.equipment.equipped[slot];
        return (
          <div class="row" style={{ marginTop: '2px', flexWrap: 'wrap' }}>
            <span style={{ width: '30px', textTransform: 'capitalize' }} class="small">
              {slot}
            </span>
            {owned.length === 0 && <span class="small muted">nothing yet</span>}
            {owned.map((id) => (
              <button
                class={`itemslot slot ${cur === id ? 'sel' : ''}`}
                data-nav
                title={`${EQUIPMENT[id].name}: ${describeMods(EQUIPMENT[id].mods).join(', ')}`}
                onClick={() => {
                  p.equipment.equipped[slot] = cur === id ? null : id;
                  game.sfx('ui_select', 0.5);
                  refresh();
                }}
              >
                <Icon k={EQUIPMENT[id].icon} />
              </button>
            ))}
            {cur && <span class="small">{EQUIPMENT[cur].name}: {describeMods(EQUIPMENT[cur].mods).join(', ')}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Potting bench: the loadout

function PottingPanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  const [picking, setPicking] = useState<number | null>(null);
  const cls = CLASSES[p.classes.selected];
  const grafts = p.loadout.grafts;
  const used = (s: ProduceStack) => grafts.filter((g) => g && g.species === s.species && g.quality === s.quality && g.traits.join() === s.traits.join()).length;
  const weaponProduce = p.produce.filter((s) => CROPS[s.species]?.weapon);
  clampLoadoutJars(p);
  const jarTotal = Object.values(p.loadout.jars).reduce((a, b) => a + b, 0);
  return (
    <Frame title="Potting Bench" sub="Graft what you have grown into your satchel. Each graft fights beside you as a weapon, starting at its quality level, carrying its mutations." width={600}>
      <div class="row" style={{ gap: '4px', alignItems: 'flex-start', marginTop: '3px' }}>
        <div class="parch" style={{ flex: '0 0 200px', padding: '0 4px 3px' }}>
          <h3>Going out</h3>
          <div class="row">
            <Icon k={portraitOf(cls.id)} />
            <div class="col" style={{ gap: 0 }}>
              <b>{cls.name}</b>
              <button class="linkbtn small" data-nav onClick={() => ui.push('character')}>
                change class or gear
              </button>
            </div>
          </div>
          <div class="small" style={{ marginTop: '2px' }}>
            <Icon k={WEAPONS[cls.held].icon} /> {WEAPONS[cls.held].name} (held, level {1 + Math.min(3, p.heldTiers[cls.id] ?? 0)})
          </div>
          <div class="small">
            <Icon k={WEAPONS[cls.starter].icon} /> {WEAPONS[cls.starter].name} (always packed)
          </div>
          <div class="divider" />
          <h3>Jars ({jarTotal}/{maxJars(p.flags)})</h3>
          {Object.values(JARS).map((j) => {
            const have = p.jars[j.id] ?? 0;
            const take = p.loadout.jars[j.id] ?? 0;
            return (
              <div class="row small" style={{ justifyContent: 'space-between' }}>
                <span class="row" title={j.desc}>
                  <Icon k={j.icon} scale={0.75} />
                  {j.name} <span class="muted">({have})</span>
                </span>
                <span class="row">
                  <Btn disabled={take <= 0} onClick={() => ((p.loadout.jars[j.id] = take - 1), refresh())}>
                    -
                  </Btn>
                  <b>{take}</b>
                  <Btn disabled={take >= have || jarTotal >= maxJars(p.flags)} onClick={() => ((p.loadout.jars[j.id] = take + 1), refresh())}>
                    +
                  </Btn>
                </span>
              </div>
            );
          })}
          {p.tiers.unlocked > 1 && (
            <>
              <div class="divider" />
              <h3>Rot</h3>
              <div class="row">
                {ROT_TIERS.filter((t) => t.tier <= p.tiers.unlocked).map((t) => (
                  <Btn class={p.tiers.selected === t.tier ? 'primary' : ''} onClick={() => ((p.tiers.selected = t.tier), refresh())} title={t.desc}>
                    {t.name}
                  </Btn>
                ))}
              </div>
              <div class="small">{ROT_TIERS[p.tiers.selected - 1].desc}</div>
            </>
          )}
        </div>
        <div class="parch grow" style={{ padding: '0 4px 3px' }}>
          <h3>Satchel</h3>
          <div class="row" style={{ gap: '3px' }}>
            {grafts.map((g, i) => (
              <button class={`itemslot slot ${picking === i ? 'sel' : ''}`} data-nav style={{ width: '30px', height: '30px' }} onClick={() => setPicking(picking === i ? null : i)} title={g ? `${CROPS[g.species].name}` : 'Empty: choose a crop'}>
                {g ? <Icon k={CROPS[g.species].produce} /> : <span class="muted">+</span>}
                {g && <span class="q">{'★'.repeat(g.quality - 1)}</span>}
              </button>
            ))}
          </div>
          <div class="col" style={{ gap: '1px', marginTop: '3px', minHeight: '64px' }}>
            {grafts.map((g, i) =>
              g ? (
                <div class="small row">
                  <b>{i + 1}.</b> {WEAPONS[CROPS[g.species].weapon!].name} Lv {g.quality} <Traits traits={g.traits} />
                  <button class="linkbtn" data-nav onClick={() => ((grafts[i] = null), refresh())}>
                    remove
                  </button>
                </div>
              ) : null,
            )}
            {grafts.every((g) => !g) && <div class="small muted">Nothing grafted. You can still find weapons out there, but grown ones start stronger and carry mutations.</div>}
          </div>
          {picking !== null && (
            <div>
              <div class="divider" />
              <div class="small">Choose produce for slot {picking + 1}:</div>
              <div class="row" style={{ flexWrap: 'wrap', gap: '2px', marginTop: '2px' }}>
                {weaponProduce.length === 0 && <span class="small muted">No weapon crops in your stores yet. Harvest something first.</span>}
                {weaponProduce.map((s) => {
                  const left = s.count - used(s);
                  return (
                    <span style={{ opacity: left > 0 ? 1 : 0.4 }}>
                      <ProduceSlot
                        s={{ ...s, count: left }}
                        onClick={() => {
                          if (left <= 0) return;
                          grafts[picking] = { species: s.species, traits: [...s.traits], quality: s.quality };
                          setPicking(null);
                          game.sfx('plant', 0.5);
                          refresh();
                        }}
                      />
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div class="row" style={{ marginTop: '5px' }}>
        <div class="small muted">Destination: <b>The Blighted Meadow</b>. Four acres, then the Marrow King. You can head home at any lull.</div>
        <div class="spacer" />
        <Btn big class="primary" autofocus onClick={() => bridge.farm?.depart()}>
          Set out for the meadow
        </Btn>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Mutation bench

function BenchPanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  const [tab, setTab] = useState<'mutate' | 'cross'>('mutate');
  const [plotId, setPlotId] = useState<number | null>(null);
  const [a, setA] = useState<ProduceStack | null>(null);
  const [b, setB] = useState<ProduceStack | null>(null);
  if (p.buildings.bench < 1) {
    return (
      <Frame title="Mutation Bench" sub="Rotten legs, a cracked alembic, and Gran’s handwriting on every jar. Bertha could rebuild it." width={360}>
        <div class="parch" style={{ padding: '2px 4px 4px', marginTop: '3px' }}>
          <div class="speech">Once rebuilt, the bench lets you feed reagents to growing crops to give them traits, and splice two crops into hybrid seeds.</div>
          <Btn onClick={() => ui.open('smithy', { tab: 'build' })}>Ask Bertha</Btn>
        </div>
      </Frame>
    );
  }
  const growing = p.plots.filter((q) => q.crop && plotStage(q) < MATURE);
  const reagents = REAGENT_TRAITS.filter((r) => (p.materials[r.material] ?? 0) > 0);
  const plot = plotId !== null ? p.plots[plotId] : null;
  const preview = (() => {
    if (!a || !b) return null;
    if (a.species === b.species) return 'Crossing a crop with itself only makes more of the same.';
    const named = hybridOf(a.species, b.species);
    if (named) return `Makes ${CROPS[named].name} seeds: ${CROPS[named].desc}`;
    const gene = CROPS[b.species].gene;
    return `Makes ${CROPS[a.species].name} seeds carrying the ${TRAITS[gene].name} gene from the ${CROPS[b.species].name.toLowerCase()}.`;
  })();
  return (
    <Frame title="Mutation Bench" sub="Feed the Root what it craves, and the crops change." width={580}>
      <Tabs
        tabs={[
          ['mutate', 'Mutate a crop'],
          ['cross', 'Crossbreed'],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'mutate' ? (
        <div class="parch" style={{ padding: '2px 4px 4px' }}>
          <div class="small">Choose a growing crop, then a reagent. It takes about three times in four; otherwise the crop goes Wild. Crops hold two traits at most.</div>
          <div class="row" style={{ alignItems: 'flex-start', gap: '6px', marginTop: '2px' }}>
            <div class="col" style={{ flex: 1, gap: '1px' }}>
              <h3>Growing</h3>
              {growing.length === 0 && <div class="small muted">Nothing is growing. Plant something first.</div>}
              {growing.map((q) => (
                <button class={`seg`} data-nav style={{ font: 'inherit', textAlign: 'left', border: 'none', background: plotId === q.id ? 'rgba(138,72,54,0.25)' : 'none', cursor: 'pointer', padding: '1px 2px' }} onClick={() => setPlotId(q.id)}>
                  <span class="row small">
                    <Icon k={CROPS[q.crop!.species].produce} /> {CROPS[q.crop!.species].name} <span class="muted">({['seed', 'sprout', 'growing'][plotStage(q)]})</span> <Traits traits={q.crop!.traits} />
                  </span>
                </button>
              ))}
            </div>
            <div class="col" style={{ flex: 1, gap: '1px' }}>
              <h3>Reagents</h3>
              {reagents.length === 0 && <div class="small muted">No reagents. Bones, worms, crystals and gems turn up in the meadow.</div>}
              {reagents.map((r) => (
                <button
                  class="seg"
                  data-nav
                  disabled={!plot}
                  style={{ font: 'inherit', textAlign: 'left', border: 'none', background: 'none', cursor: plot ? 'pointer' : 'default', padding: '1px 2px', opacity: plot ? 1 : 0.6 }}
                  onClick={() => {
                    if (!plot) return;
                    const res = mutateCrop(p, plot, r.material, rng);
                    ui.toast(res.msg ?? '', res.ok ? (res.trait === 'wild' ? 'warn' : 'rare') : 'info', res.ok && res.trait ? TRAITS[res.trait].icon : undefined);
                    game.sfx(res.ok ? 'mutate' : 'ui_deny', 0.8);
                    refresh();
                  }}
                >
                  <span class="row small">
                    <Icon k={MATERIALS[r.material].icon} /> {MATERIALS[r.material].name} x{p.materials[r.material]} <span style={{ color: TRAITS[r.trait].colour }}>→ {TRAITS[r.trait].name}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div class="parch" style={{ padding: '2px 4px 4px' }}>
          <div class="small">
            Splice two different crops from your stores into 2-3 hybrid seeds. Uses one Root Pollen <Icon k={MATERIALS.root_pollen.icon} /> (you have {p.materials.root_pollen ?? 0}). Some pairings make named cultivars with their own weapon; any other pairing passes the second crop’s gene to the first.
          </div>
          <div class="row" style={{ gap: '6px', marginTop: '3px', alignItems: 'flex-start' }}>
            <div class="col" style={{ flex: 1 }}>
              <h3>Seed parent {a && `: ${CROPS[a.species].name}`}</h3>
              <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
                {p.produce.map((s) => (
                  <ProduceSlot s={s} selected={a === s} onClick={() => setA(s)} />
                ))}
              </div>
            </div>
            <div class="col" style={{ flex: 1 }}>
              <h3>Pollen parent {b && `: ${CROPS[b.species].name}`}</h3>
              <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
                {p.produce.map((s) => (
                  <ProduceSlot s={s} selected={b === s} onClick={() => setB(s)} />
                ))}
              </div>
            </div>
          </div>
          {p.produce.length === 0 && <div class="small muted">Your stores are empty. Harvest something first.</div>}
          {preview && <div class="small" style={{ marginTop: '3px' }}>{preview}</div>}
          <div class="row" style={{ justifyContent: 'flex-end', marginTop: '3px' }}>
            <Btn
              class="primary"
              disabled={!a || !b || a.species === b.species || (p.materials.root_pollen ?? 0) <= 0 || (a === b && a.count < 2)}
              onClick={() => {
                const res = crossbreed(p, a!, b!, rng);
                if (res.ok && res.result) {
                  const c = CROPS[res.result.species];
                  ui.toast(`${res.result.count} ${c.name} seeds${res.result.named ? ' (a new cultivar!)' : ''}`, res.result.named ? 'legendary' : 'rare', c.seed);
                  game.sfx(res.result.named ? 'evolve' : 'mutate', 0.9);
                } else {
                  ui.toast(res.msg ?? '', 'info');
                  game.sfx('ui_deny');
                }
                setA(null);
                setB(null);
                refresh();
              }}
            >
              Splice
            </Btn>
          </div>
        </div>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Seed archive

function ArchivePanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  const [tab, setTab] = useState<'buy' | 'crops' | 'traits' | 'bestiary' | 'records'>('buy');
  const buyable = BASE_SPECIES.filter((s) => CROPS[s].price && p.almanac.species.includes(s));
  return (
    <Frame title="Seed Archive" sub="Hundreds of tiny drawers, each labelled in Gran’s hand. Most are empty. Some rattle." width={590}>
      <Tabs
        tabs={[
          ['buy', 'Seeds'],
          ['crops', 'Crops'],
          ['traits', 'Mutations'],
          ['bestiary', 'Bestiary'],
          ['records', 'Records'],
        ]}
        value={tab}
        onChange={setTab}
      />
      <div class="parch scroll" style={{ padding: '2px 4px 4px', maxHeight: '240px' }}>
        {tab === 'buy' && (
          <div class="col" style={{ gap: '1px' }}>
            <div class="small">Seeds for any crop you have discovered. You have <Icon k="ic_farthing" /> {p.farthings}.</div>
            {buyable.map((s) => {
              const c = CROPS[s];
              return (
                <div class="row">
                  <Icon k={c.seed} />
                  <div class="grow">
                    <b>{c.name}</b> <span class={`small r-${c.rarity}`}>{FAMILY_LABEL[c.family]}</span>
                    <div class="small">{c.desc} Grows in about {Math.ceil((c.stageSap * 3) / 400)} expedition{c.stageSap * 3 > 400 ? 's' : ''}.</div>
                  </div>
                  <Btn
                    disabled={p.farthings < c.price!}
                    onClick={() => {
                      p.farthings -= c.price!;
                      addSeeds(p, s, [], 1);
                      game.sfx('buy');
                      refresh();
                    }}
                  >
                    Buy <Icon k="ic_farthing" /> {c.price}
                  </Btn>
                  <Btn
                    disabled={p.farthings < c.price! * 4}
                    onClick={() => {
                      p.farthings -= c.price! * 4;
                      addSeeds(p, s, [], 5);
                      game.sfx('buy');
                      refresh();
                    }}
                    title="Five for the price of four"
                  >
                    x5 ({c.price! * 4})
                  </Btn>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'crops' && (
          <div class="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
            {[...BASE_SPECIES, ...HYBRID_SPECIES].map((s) => {
              const known = p.almanac.species.includes(s) || p.almanac.hybrids.includes(s);
              const c = CROPS[s];
              return (
                <div class="row" style={{ opacity: known ? 1 : 0.5 }}>
                  <Icon k={known ? c.produce : 'ic_lock'} />
                  <div class="small">
                    <b>{known ? c.name : '???'}</b> {known && <span class="muted">({FAMILY_LABEL[c.family]})</span>}
                    <div>{known ? (c.weapon ? `Grows into ${WEAPONS[c.weapon].name}. Gene: ${TRAITS[c.gene].name}.` : `Gene: ${TRAITS[c.gene].name}.`) : c.hybrid ? 'A hybrid. Cross two crops at the bench.' : 'Not yet found.'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'traits' && (
          <div class="col" style={{ gap: '1px' }}>
            {Object.values(TRAITS).map((t) => {
              const known = p.almanac.traits.includes(t.id);
              const reagent = REAGENT_TRAITS.find((r) => r.trait === t.id);
              return (
                <div class="row small" style={{ opacity: known ? 1 : 0.55 }}>
                  <Icon k={t.icon} />
                  <b style={{ color: known ? undefined : 'inherit', width: '60px' }}>{t.name}</b>
                  <span class="grow">
                    {t.desc} {reagent && <span class="muted">Reagent: {MATERIALS[reagent.material].name}.</span>}
                  </span>
                </div>
              );
            })}
            <div class="divider" />
            <h3>Evolutions</h3>
            {EVOLUTIONS.map((e) => {
              const seen = p.almanac.evolutions.includes(e.into);
              return (
                <div class="small row">
                  <Icon k={WEAPONS[e.from].icon} />
                  {WEAPONS[e.from].name} → <b>{seen ? WEAPONS[e.into].name : '???'}</b> <span class="muted">({e.hint})</span>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'bestiary' && (
          <div class="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
            {Object.values(ENEMIES).map((e) => {
              const n = p.almanac.enemies[e.id] ?? 0;
              return (
                <div class="row small" style={{ opacity: n ? 1 : 0.5 }}>
                  <div style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {n ? <Icon k={`${e.anims.walk}_0`} scale={e.boss ? 0.4 : 1} /> : <Icon k="ic_skull" />}
                  </div>
                  <div class="grow">
                    <b>{n ? e.name : '???'}</b> {n > 0 && <span class="muted">felled {n}</span>}
                    {n > 0 && <div>{e.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'records' && (
          <table class="stats">
            <tbody>
              <tr><td>Days on the farm</td><td>{p.day}</td></tr>
              <tr><td>Expeditions</td><td>{p.stats.runs}</td></tr>
              <tr><td>Victories over the King</td><td>{p.stats.wins}</td></tr>
              <tr><td>Fastest victory</td><td>{p.stats.bestWinTime ? fmtTime(p.stats.bestWinTime) : '-'}</td></tr>
              <tr><td>Headed home early</td><td>{p.stats.extractions}</td></tr>
              <tr><td>Carried home</td><td>{p.stats.defeats}</td></tr>
              <tr><td>Creatures felled</td><td>{p.stats.kills}</td></tr>
              <tr><td>Crops planted</td><td>{p.stats.planted}</td></tr>
              <tr><td>Crops harvested</td><td>{p.stats.harvested}</td></tr>
              <tr><td>Sap gathered</td><td>{p.stats.sapTotal}</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Bertha's smithy

const BERTHA_LINES = [
  'Watering cans make terrible weapons. Don’t let anyone tell you otherwise.',
  'Bring me timber and ore and I’ll make it worth your while.',
  'Your gran owed me for a hinge. I’ll call it even if you fix that pump.',
  'That can on the wall? Just a can. Stop looking at it.',
  'Iron from the meadow sings when you hit it. Unsettling. Good iron, though.',
];

function SmithyPanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  const data = useUi((s) => s.panelData) as { tab?: string } | null;
  const [tab, setTab] = useState<'build' | 'expand' | 'tools' | 'gear'>((data?.tab as 'build') ?? 'build');
  const [line] = useState(() => BERTHA_LINES[Math.floor(Math.random() * BERTHA_LINES.length)]);
  const cls = p.classes.selected;
  const tier = p.heldTiers[cls] ?? 0;
  const canGift = p.flags.gildedCan && !p.flags.gildedCanOwned;
  return (
    <Frame title="Bertha’s Smithy" portrait="portrait_bertha" sub={canGift ? '“All right. All right. It’s not just a can. You beat the King; you’ve earned it.”' : `“${line}”`} width={580}>
      <Tabs
        tabs={[
          ['build', 'Build and mend'],
          ['expand', 'Clear land'],
          ['tools', 'Your tools'],
          ['gear', 'Armour'],
        ]}
        value={tab}
        onChange={setTab}
      />
      <div class="parch scroll" style={{ padding: '2px 4px 4px', maxHeight: '230px' }}>
        {tab === 'build' && (
          <div class="col" style={{ gap: '3px' }}>
            {canGift && (
              <div class="row">
                <Icon k="tool_can" />
                <div class="grow">
                  <b>The Gilded Watering Can</b>
                  <div class="small">Waters a three-by-three patch with every pour.</div>
                </div>
                <Btn
                  class="primary"
                  onClick={() => {
                    p.flags.gildedCanOwned = true;
                    ui.toast('The Gilded Watering Can is yours.', 'legendary', 'tool_can');
                    game.sfx('loot_legendary');
                    refresh();
                  }}
                >
                  Take it
                </Btn>
              </div>
            )}
            {REPAIRS.map((r) => {
              const done = (p.buildings[r.id] ?? 0) >= 1;
              return (
                <div class="row">
                  <div class="grow">
                    <b>{r.name}</b> {done && <span class="pill">done</span>}
                    <div class="small">{r.desc}</div>
                    {!done && <Cost cost={r.cost} />}
                  </div>
                  {!done && (
                    <Btn
                      disabled={!hasMaterials(p, r.cost)}
                      onClick={() => {
                        if (!payMaterials(p, r.cost)) return;
                        p.buildings[r.id] = 1;
                        game.sfx('till', 1);
                        ui.toast(`${r.name}: done.`, 'good');
                        refresh();
                      }}
                    >
                      Do it
                    </Btn>
                  )}
                </div>
              );
            })}
            {p.buildings.bench >= 1 && (
              <div class="row">
                <div class="grow">
                  <b>Steady the bench</b> {p.buildings.bench >= 2 && <span class="pill">done</span>}
                  <div class="small">Mutations take more often, crops can hold three traits, and saved seeds keep their traits more reliably.</div>
                  {p.buildings.bench < 2 && <Cost cost={{ farthings: 90, iron_ore: 4, frost_crystal: 1 }} />}
                </div>
                {p.buildings.bench < 2 && (
                  <Btn
                    disabled={!hasMaterials(p, { farthings: 90, iron_ore: 4, frost_crystal: 1 })}
                    onClick={() => {
                      if (!payMaterials(p, { farthings: 90, iron_ore: 4, frost_crystal: 1 })) return;
                      p.buildings.bench = 2;
                      game.sfx('mutate');
                      refresh();
                    }}
                  >
                    Do it
                  </Btn>
                )}
              </div>
            )}
          </div>
        )}
        {tab === 'expand' && (
          <div class="col" style={{ gap: '3px' }}>
            <div class="small">More beds mean more crops each day. Every bed drinks the full share of sap you bring home.</div>
            {EXPANSIONS.map((e) => {
              const done = e.plots.every((id) => p.plots[id].unlocked);
              return (
                <div class="row">
                  <div class="grow">
                    <b>{e.name}</b> <span class="small muted">(+{e.plots.length} plots)</span> {done && <span class="pill">done</span>}
                    {!done && <Cost cost={e.cost} />}
                  </div>
                  {!done && (
                    <Btn
                      disabled={!hasMaterials(p, e.cost)}
                      onClick={() => {
                        if (!payMaterials(p, e.cost)) return;
                        for (const id of e.plots) p.plots[id].unlocked = true;
                        game.sfx('till', 1);
                        refresh();
                      }}
                    >
                      Clear it
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === 'tools' && (
          <div class="col" style={{ gap: '3px' }}>
            <div class="small">
              Reinforce the {CLASSES[cls].title}’s {WEAPONS[CLASSES[cls].held].name}. Better tools start every expedition at a higher level.
            </div>
            {HELD_TIERS.map((t, i) => (
              <div class="row">
                <div class="grow">
                  <b>{t.name}</b> {tier > i && <span class="pill">done</span>}
                  <div class="small">{t.desc}</div>
                  {tier === i && <Cost cost={t.cost} />}
                </div>
                {tier === i && (
                  <Btn
                    disabled={!hasMaterials(p, t.cost)}
                    onClick={() => {
                      if (!payMaterials(p, t.cost)) return;
                      p.heldTiers[cls] = i + 1;
                      game.sfx('buy');
                      refresh();
                    }}
                  >
                    Reinforce
                  </Btn>
                )}
              </div>
            ))}
          </div>
        )}
        {tab === 'gear' && (
          <div class="col" style={{ gap: '3px' }}>
            {Object.values(EQUIPMENT).map((e) => {
              const owned = p.equipment.owned.includes(e.id);
              const worn = p.equipment.equipped[e.slot] === e.id;
              return (
                <div class="row">
                  <Icon k={e.icon} />
                  <div class="grow">
                    <b>{e.name}</b> <span class="small muted">({e.slot})</span> {worn && <span class="pill">worn</span>}
                    <div class="small">
                      {describeMods(e.mods).join(', ')} <span class="muted">{e.desc}</span>
                    </div>
                    {!owned && <Cost cost={e.cost} />}
                  </div>
                  {!owned ? (
                    <Btn
                      disabled={!hasMaterials(p, e.cost)}
                      onClick={() => {
                        if (!payMaterials(p, e.cost)) return;
                        p.equipment.owned.push(e.id);
                        p.equipment.equipped[e.slot] = e.id;
                        game.sfx('buy');
                        ui.toast(`${e.name} forged and worn.`, 'good', e.icon);
                        refresh();
                      }}
                    >
                      Forge
                    </Btn>
                  ) : (
                    <Btn
                      onClick={() => {
                        p.equipment.equipped[e.slot] = worn ? null : e.id;
                        refresh();
                      }}
                    >
                      {worn ? 'Take off' : 'Wear'}
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------

function CompostPanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  return (
    <Frame title="Compost Bin" sub={`Spare produce and seeds rot down into fertiliser. Each bag improves one crop’s quality and helps it grow. (${p.compost}/3 towards the next bag, ${p.fertiliser} bags ready.)`} width={460}>
      <div class="parch scroll" style={{ padding: '2px 4px 4px', maxHeight: '220px', marginTop: '3px' }}>
        <h3>Produce</h3>
        <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
          {p.produce.length === 0 && <span class="small muted">None.</span>}
          {p.produce.map((s) => (
            <ProduceSlot
              s={s}
              onClick={() => {
                const r = compostProduce(p, s.species, s.traits, s.quality);
                if (r.ok) game.sfx('plant', 0.5);
                refresh();
              }}
            />
          ))}
        </div>
        <h3>Seeds</h3>
        <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
          {p.seeds.map((s, i) => (
            <button
              class="itemslot slot"
              data-nav
              title={CROPS[s.species]?.name}
              onClick={() => {
                const r = compostSeed(p, i);
                if (r.ok) game.sfx('plant', 0.5);
                refresh();
              }}
            >
              <Icon k={CROPS[s.species]?.seed ?? 'seed_pea'} />
              <span class="n">{s.count}</span>
            </button>
          ))}
        </div>
        <div class="small muted" style={{ marginTop: '2px' }}>
          Click to add one. Use fertiliser with the compost tool (<Keycap code="5" />).
        </div>
      </div>
    </Frame>
  );
}

const MOTHER_LINES = [
  'The Old Mother does not speak. You feel listened to anyway.',
  'Moss in the shape of a smile. Someone left a candle. It is still burning.',
  'They say she was here before the village, before the Root. They say she is the reason the village is still here.',
  'A faint warmth rises from the soil around her, as if something below is breathing slowly.',
];

function ShrinePanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  const [line] = useState(() => MOTHER_LINES[p.day % MOTHER_LINES.length]);
  const offered = p.flags.offerDay === p.day;
  return (
    <Frame title="Old Mother Turnip" portrait="portrait_mother_turnip" sub={line} width={460}>
      <div class="parch" style={{ padding: '2px 4px 4px', marginTop: '3px' }}>
        {offered || p.blessing > 0 ? (
          <div class="speech">The Old Mother has accepted your offering. Your fields will drink a quarter more when you next come home.</div>
        ) : (
          <>
            <div class="speech">Leave something you have grown. Once a day, her blessing makes your fields drink a quarter more sap on your next return.</div>
            <div class="row" style={{ flexWrap: 'wrap', gap: '2px', marginTop: '3px' }}>
              {p.produce.length === 0 && <span class="small muted">You have nothing to offer yet.</span>}
              {p.produce.map((s) => (
                <ProduceSlot
                  s={s}
                  onClick={() => {
                    s.count--;
                    if (s.count <= 0) p.produce.splice(p.produce.indexOf(s), 1);
                    p.blessing = 0.25;
                    p.flags.offerDay = p.day;
                    game.sfx('cleanse', 0.8);
                    ui.toast('The candles flare. The Old Mother is pleased.', 'good');
                    refresh();
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Farmhouse: stores, kitchen, records

function FarmhousePanel() {
  const p = game.profile!;
  useUi((s) => s.version);
  const data = useUi((s) => s.panelData) as { tab?: string } | null;
  const [tab, setTab] = useState<'stash' | 'kitchen' | 'last' | 'cellar'>((data?.tab as 'stash') ?? 'stash');
  const [sel, setSel] = useState<{ kind: 'produce' | 'seed' | 'mat'; i: number | string } | null>(null);
  const [picks, setPicks] = useState<ProduceStack[]>([]);
  const detail = (() => {
    if (!sel) return <div class="small muted">Select something to see what it does.</div>;
    if (sel.kind === 'produce') {
      const s = p.produce[sel.i as number];
      return s ? <ProduceDetail s={s} /> : null;
    }
    if (sel.kind === 'seed') {
      const s = p.seeds[sel.i as number];
      if (!s) return null;
      const c = CROPS[s.species];
      return (
        <div class="col" style={{ gap: '1px' }}>
          <div class="row">
            <Icon k={c.seed} /> <b>{c.name} seeds</b> x{s.count}
          </div>
          <Traits traits={s.traits} />
          <div class="small">{c.desc}</div>
          <div class="small muted">Needs {c.stageSap * 3} sap in total to ripen (about a third of what you gather soaks into each watered bed).</div>
        </div>
      );
    }
    const m = MATERIALS[sel.i as string];
    return (
      <div class="col" style={{ gap: '1px' }}>
        <div class="row">
          <Icon k={m.icon} /> <b>{m.name}</b> x{p.materials[m.id]}
        </div>
        <div class="small">{m.desc}</div>
      </div>
    );
  })();
  return (
    <Frame title="The Farmhouse" sub={p.flags.rootEngine ? 'Low beams, a warm stove, and below them, the slow thrum of the Root Engine.' : 'Low beams, a warm stove, and a cellar door with ironwork older than the village.'} width={580}>
      <Tabs
        tabs={[
          ['stash', 'Stores'],
          ['kitchen', 'Kitchen'],
          ['last', 'Last expedition'],
          ['cellar', 'Cellar'],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'stash' && (
        <div class="row" style={{ alignItems: 'stretch', gap: '4px' }}>
          <div class="parch scroll grow" style={{ padding: '2px 4px 4px', maxHeight: '240px' }}>
            <h3>Produce</h3>
            <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
              {p.produce.length === 0 && <span class="small muted">Nothing harvested yet.</span>}
              {p.produce.map((s, i) => (
                <ProduceSlot s={s} selected={sel?.kind === 'produce' && sel.i === i} onClick={() => setSel({ kind: 'produce', i })} />
              ))}
            </div>
            <h3>Seeds</h3>
            <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
              {p.seeds.length === 0 && <span class="small muted">No seeds.</span>}
              {p.seeds.map((s, i) => (
                <button class={`itemslot slot ${sel?.kind === 'seed' && sel.i === i ? 'sel' : ''}`} data-nav onClick={() => setSel({ kind: 'seed', i })}>
                  <Icon k={CROPS[s.species]?.seed ?? 'seed_pea'} />
                  <span class="n">{s.count}</span>
                  {s.traits.length > 0 && <span style={{ position: 'absolute', left: 0, bottom: 0, width: '4px', height: '4px', background: TRAITS[s.traits[0]].colour, boxShadow: '0 0 0 1px #000' }} />}
                </button>
              ))}
            </div>
            <h3>Materials</h3>
            <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
              {Object.keys(p.materials).length === 0 && <span class="small muted">None yet.</span>}
              {Object.entries(p.materials).map(([k, v]) => (
                <button class={`itemslot slot ${sel?.kind === 'mat' && sel.i === k ? 'sel' : ''}`} data-nav onClick={() => setSel({ kind: 'mat', i: k })} title={MATERIALS[k]?.name}>
                  <Icon k={MATERIALS[k]?.icon ?? 'cf_1'} />
                  <span class="n">{v}</span>
                </button>
              ))}
            </div>
            <h3>Jars</h3>
            <div class="row" style={{ gap: '6px' }}>
              {Object.values(JARS).map((j) => (
                <span class="row small" title={j.desc}>
                  <Icon k={j.icon} scale={0.75} /> {j.name} x{p.jars[j.id] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <div class="parch" style={{ flex: '0 0 170px', padding: '2px 4px 4px' }}>
            {detail}
          </div>
        </div>
      )}
      {tab === 'kitchen' && (
        <div class="parch" style={{ padding: '2px 4px 4px' }}>
          <div class="small">Seal produce into jars for the road. Drink one with {keyLabel(game.settings.keys.consumable[0])} on an expedition.</div>
          {Object.values(JARS).map((j) => {
            const fits = (s: ProduceStack) => j.from === 'any2' || j.from.includes(s.species);
            const need = j.from === 'any2' ? 2 : 1;
            return (
              <div class="row" style={{ marginTop: '3px', alignItems: 'flex-start' }}>
                <Icon k={j.icon} />
                <div class="grow">
                  <b>{j.name}</b> <span class="small">{j.desc}</span>
                  <div class="small muted">{j.from === 'any2' ? 'Any two produce.' : `From ${j.from.map((s) => CROPS[s].name).join(' or ')}.`}</div>
                  <div class="row" style={{ flexWrap: 'wrap', gap: '2px' }}>
                    {p.produce.filter(fits).map((s) => (
                      <ProduceSlot
                        s={s}
                        selected={picks.includes(s)}
                        onClick={() => {
                          const next = picks.includes(s) ? picks.filter((x) => x !== s) : [...picks.filter(fits), s].slice(-need);
                          if (next.length === need) {
                            const r = preserve(p, j.id, next.map((x) => ({ species: x.species, traits: x.traits, quality: x.quality as Quality })));
                            ui.toast(r.msg ?? '', r.ok ? 'good' : 'info', j.icon);
                            game.sfx(r.ok ? 'drink' : 'ui_deny');
                            setPicks([]);
                            refresh();
                          } else setPicks(next);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'cellar' && <Cellar />}
      {tab === 'last' && (
        <div class="parch" style={{ padding: '2px 4px 4px' }}>
          {!p.lastRun ? (
            <div class="small muted">You have not been out yet.</div>
          ) : (
            <div class="col" style={{ gap: '1px' }}>
              <b>
                Day {p.lastRun.day - 1}: {p.lastRun.outcome === 'victory' ? 'Victory over the Marrow King' : p.lastRun.outcome === 'extracted' ? 'Came home with the haul' : `Carried home, felled by ${p.lastRun.cause}`}
              </b>
              <div class="small">
                {CLASSES[p.lastRun.classId]?.title}, level {p.lastRun.level}, {fmtTime(p.lastRun.time)}, {p.lastRun.kills} felled, reached {p.lastRun.acreName}.
              </div>
              <div class="small">Best weapon: {p.lastRun.weapons[0]?.name} ({p.lastRun.weapons[0]?.damage.toLocaleString('en-GB')} damage).</div>
            </div>
          )}
        </div>
      )}
    </Frame>
  );
}

export { describeWeapon };

function Cellar() {
  const p = game.profile!;
  useUi((s) => s.version);
  if (p.stats.wins < 1) {
    return (
      <div class="parch" style={{ padding: '2px 4px 4px' }}>
        <div class="speech">
          The cellar hatch is bolted from the inside. The iron straps are shaped like roots, meeting at a carved eye that is, thankfully, closed. Something beneath the floor hums, very faintly, whenever the meadow stirs.
        </div>
        <div class="small muted" style={{ marginTop: '3px' }}>Gran’s almanac, in the margin: “Not until the King is in the ground.”</div>
      </div>
    );
  }
  return (
    <div class="parch" style={{ padding: '2px 4px 4px' }}>
      <div class="speech">
        With the King fallen, the bolt has rotted through. Below, in a cellar far bigger than the house above it, a great iron root runs from wall to wall, older than the village and warm to the touch. Gran’s handwriting is everywhere: tallies, dates, and one word underlined three times: <i>feed it</i>.
      </div>
      {!p.flags.rootEngine ? (
        <div class="row" style={{ marginTop: '4px' }}>
          <div class="grow small">Wake the Root Engine: pack one more jar on every expedition, from now on.</div>
          <Btn
            class="primary"
            onClick={() => {
              p.flags.rootEngine = true;
              game.sfx('evolve', 0.8);
              ui.toast('The Root Engine shudders awake. You can carry one more jar.', 'legendary', 'cf_80');
              refresh();
            }}
          >
            Wake it
          </Btn>
        </div>
      ) : (
        <div class="small good" style={{ marginTop: '4px' }}>The Root Engine thrums. You carry one more jar on every expedition.</div>
      )}
    </div>
  );
}
