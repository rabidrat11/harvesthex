import { useState } from 'preact/hooks';
import { bridge, ui } from './store';
import { Btn, Icon, Keycap, Modal } from './components';
import { game } from '../game/state';
import { ACTION_LABEL, DEFAULT_KEYS, keyLabel, type Action, type Settings } from '../meta/settings';
import { exportSave, parseSave } from '../meta/save';
import type { ComponentChildren } from 'preact';

export function TitleMenu() {
  const hasSave = !!game.profile;
  return (
    <>
    <div class="title-tag">Grow something dangerous.</div>
    <div class="version">v0.1 · a farming bullet hell</div>
    <div class="title-menu nav-root" data-ui-block>
      {hasSave && (
        <Btn big class="primary" autofocus onClick={() => bridge.title?.start(false)}>
          Continue
        </Btn>
      )}
      <Btn big class={hasSave ? '' : 'primary'} autofocus={!hasSave} onClick={() => (hasSave ? ui.open('newgame') : bridge.title?.start(true))}>
        New game
      </Btn>
      <Btn onClick={() => ui.open('settings')}>Settings</Btn>
      <Btn onClick={() => ui.open('controls')}>Controls</Btn>
      <Btn onClick={() => ui.open('credits')}>Credits</Btn>
    </div>
    </>
  );
}

export function NewGamePanel() {
  return (
    <Modal width={260} onBack={() => ui.close()}>
      <div class="parch" style={{ padding: '2px 6px 6px' }}>
        <h2>Start afresh?</h2>
        <p class="speech">Your current farm, seeds and unlocks will be set aside. A backup of the old save is kept, and you can export it first from Settings.</p>
        <div class="row" style={{ justifyContent: 'flex-end' }}>
          <Btn autofocus onClick={() => ui.close()}>
            Keep my farm
          </Btn>
          <Btn
            onClick={() => {
              ui.close();
              bridge.title?.start(true);
            }}
          >
            Start a new farm
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export function CorruptPanel() {
  return (
    <Modal width={300} onBack={() => ui.close()}>
      <div class="parch" style={{ padding: '2px 6px 6px' }}>
        <h2>The save is damaged</h2>
        <p class="speech">Your save could not be read, and neither could its backup. You can download the damaged data (in case it can be repaired) and then start a new farm.</p>
        <div class="row" style={{ justifyContent: 'flex-end' }}>
          <Btn
            onClick={() => {
              const lr = game.loadResult;
              if (lr.ok || lr.reason !== 'corrupt') return;
              download(new Blob([lr.raw], { type: 'application/json' }), 'harvesthex-damaged-save.json');
            }}
          >
            Download damaged save
          </Btn>
          <Btn autofocus onClick={() => ui.close()}>
            Close
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <span class="seg">
      {options.map(([v, l]) => (
        <button data-nav class={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </span>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: ComponentChildren }) {
  return (
    <div class="setting">
      <label>{label}</label>
      <div class="col" style={{ gap: 0 }}>
        {children}
        {desc && <span class="desc">{desc}</span>}
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const [tab, setTab] = useState<'sound' | 'display' | 'play' | 'save'>('sound');
  const [, force] = useState(0);
  const s = game.settings;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    (s as Settings)[k] = v;
    game.saveSettings();
    if (k === 'scaling') (window as unknown as { relayout: () => void }).relayout?.();
    if (k === 'uiFont') document.body.classList.toggle('font-pixel', v === 'pixel');
    force((n) => n + 1);
  };
  const slider = (k: 'master' | 'music' | 'sfx' | 'screenShake') => (
    <input data-nav type="range" min={0} max={100} value={Math.round(s[k] * 100)} onInput={(e) => set(k, Number((e.target as HTMLInputElement).value) / 100)} />
  );
  const [msg, setMsg] = useState('');
  return (
    <Modal width={420} onBack={() => ui.close()}>
      <div class="tabs">
        {(
          [
            ['sound', 'Sound'],
            ['display', 'Display'],
            ['play', 'Gameplay'],
            ['save', 'Save data'],
          ] as const
        ).map(([k, l]) => (
          <button data-nav class={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div class="parch" style={{ padding: '2px 6px 6px', minHeight: '190px' }}>
        {tab === 'sound' && (
          <div class="col">
            <Row label={`Master ${Math.round(s.master * 100)}%`}>{slider('master')}</Row>
            <Row label={`Music ${Math.round(s.music * 100)}%`}>{slider('music')}</Row>
            <Row label={`Effects ${Math.round(s.sfx * 100)}%`}>{slider('sfx')}</Row>
            <div class="small muted">Every sound and every note of music is synthesised in your browser as you play.</div>
          </div>
        )}
        {tab === 'display' && (
          <div class="col">
            <Row label="Scaling" desc="Pixel-perfect keeps every pixel square; fill uses the whole window.">
              <Seg value={s.scaling} options={[['pixel', 'Pixel-perfect'], ['fit', 'Fill window']]} onChange={(v) => set('scaling', v)} />
            </Row>
            <Row label="Interface font" desc="Clear is easiest to read; pixel matches the art.">
              <Seg value={s.uiFont} options={[['clear', 'Clear'], ['pixel', 'Pixel']]} onChange={(v) => set('uiFont', v)} />
            </Row>
            <Row label={`Screen shake ${Math.round(s.screenShake * 100)}%`}>{slider('screenShake')}</Row>
            <Row label="Damage numbers">
              <Seg value={s.damageNumbers} options={[['all', 'All'], ['crits', 'Big hits only'], ['off', 'Off']]} onChange={(v) => set('damageNumbers', v)} />
            </Row>
            <Row label="Reduced effects" desc="Fewer particles, no hit-stop, gentler flashes.">
              <Seg value={s.reducedEffects ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]} onChange={(v) => set('reducedEffects', v === 'on')} />
            </Row>
            <Row label="High-contrast danger" desc="Larger, haloed enemy shots and bolder warning zones.">
              <Seg value={s.highContrast ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]} onChange={(v) => set('highContrast', v === 'on')} />
            </Row>
            <Row label="Show hitbox" desc="A dot marks the small spot that bullets must hit.">
              <Seg value={s.showHitbox ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]} onChange={(v) => set('showHitbox', v === 'on')} />
            </Row>
            <Row label="Fullscreen">
              <Btn
                onClick={() => {
                  if (document.fullscreenElement) void document.exitFullscreen();
                  else void document.documentElement.requestFullscreen?.();
                }}
              >
                Toggle fullscreen
              </Btn>
            </Row>
          </div>
        )}
        {tab === 'play' && (
          <div class="col">
            <Row label="Auto-aim" desc="Your held weapon and aimed crops target the nearest enemy.">
              <Seg value={s.autoAim ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]} onChange={(v) => set('autoAim', v === 'on')} />
            </Row>
            <Row label="Auto-fire" desc="Your held weapon fires without holding the button.">
              <Seg value={s.autoFire ? 'on' : 'off'} options={[['off', 'Off'], ['on', 'On']]} onChange={(v) => set('autoFire', v === 'on')} />
            </Row>
            <Row label="Combat intensity" desc="Gentle: enemy shots are slower, hurt less, and fewer enemies come.">
              <Seg value={s.intensity} options={[['standard', 'Standard'], ['gentle', 'Gentle']]} onChange={(v) => set('intensity', v)} />
            </Row>
            <div class="small muted">Auto-aim, auto-fire and intensity apply from the next expedition.</div>
          </div>
        )}
        {tab === 'save' && (
          <div class="col">
            <div class="speech">Your farm saves itself after everything you do. You can keep a copy, or move it to another browser.</div>
            <div class="row">
              <Btn disabled={!game.profile} onClick={() => game.profile && download(exportSave(game.profile), `harvesthex-day${game.profile.day}.json`)}>
                Export save
              </Btn>
              <label class="btn" data-nav tabIndex={0} style={{ cursor: 'pointer' }}>
                Import save
                <input
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (!f) return;
                    try {
                      const r = parseSave(await f.text());
                      game.profile = r.profile;
                      game.save();
                      setMsg(`Imported a farm on day ${r.profile.day}.${r.migratedFrom ? ` (Upgraded from an older version.)` : ''} Returning to the title screen.`);
                      setTimeout(() => location.reload(), 1500);
                    } catch (err) {
                      setMsg(`That file could not be read: ${(err as Error).message}`);
                    }
                  }}
                />
              </label>
            </div>
            {msg && <div class="small">{msg}</div>}
          </div>
        )}
      </div>
      <div class="row" style={{ justifyContent: 'flex-end', marginTop: '3px' }}>
        <Btn autofocus onClick={() => ui.close()}>
          Done
        </Btn>
      </div>
    </Modal>
  );
}

export function ControlsPanel() {
  const [waiting, setWaiting] = useState<Action | null>(null);
  const [, force] = useState(0);
  const keys = game.settings.keys;
  const listen = (a: Action) => {
    setWaiting(a);
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('keydown', onKey, true);
      if (e.code !== 'Escape' || a === 'pause') {
        // Unbind the key from anything else first.
        for (const k of Object.keys(keys) as Action[]) keys[k] = keys[k].filter((c) => c !== e.code);
        keys[a] = [e.code, ...keys[a].filter((c) => c !== e.code)].slice(0, 2);
        game.saveSettings();
      }
      game.input.consume(e.code);
      setWaiting(null);
      force((n) => n + 1);
    };
    window.addEventListener('keydown', onKey, true);
  };
  const actions = Object.keys(ACTION_LABEL) as Action[];
  return (
    <Modal width={440} onBack={() => !waiting && ui.close()}>
      <div class="parch" style={{ padding: '2px 6px 6px' }}>
        <h2>Controls</h2>
        <div class="row small" style={{ flexWrap: 'wrap', gap: '2px 10px', marginBottom: '3px' }}>
          <span>
            <b>Mouse</b> aim
          </span>
          <span>
            <b>Left click</b> use your held weapon (or farm tool)
          </span>
          <span>
            <b>Right click</b> class skill
          </span>
          <span>Your grown crops fight by themselves.</span>
        </div>
        <div class="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1px 10px' }}>
          {actions.map((a) => (
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span class="small">{ACTION_LABEL[a]}</span>
              <button class="seg" data-nav style={{ font: 'inherit', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => listen(a)}>
                {waiting === a ? <span class="keycap">press a key</span> : keys[a].map((k) => <Keycap code={keyLabel(k)} />)}
              </button>
            </div>
          ))}
        </div>
        <div class="row" style={{ justifyContent: 'space-between', marginTop: '5px' }}>
          <Btn
            onClick={() => {
              game.settings.keys = structuredClone(DEFAULT_KEYS);
              game.saveSettings();
              force((n) => n + 1);
            }}
          >
            Reset to defaults
          </Btn>
          <Btn autofocus onClick={() => ui.close()}>
            Done
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export function CreditsPanel() {
  return (
    <Modal width={360} onBack={() => ui.close()}>
      <div class="parch scroll" style={{ padding: '2px 6px 6px', maxHeight: '300px' }}>
        <h2>Credits</h2>
        <p class="speech">
          <b>HARVESTHEX</b>: grow something dangerous. Designed, written, drawn and composed as one piece: game code, pixel art for characters, creatures, crops, buildings and effects, procedural sound and music.
        </p>
        <h3>Icons</h3>
        <p class="small">
          Items, ores, armour, tools, food and potions use the <b>Cute Fantasy Icons (free version)</b> pack by Kenmi. Licence: non-commercial use, modification allowed, no redistribution. This build is for personal, non-commercial play.
        </p>
        <h3>Fonts</h3>
        <p class="small">
          Atkinson Hyperlegible Next by the Braille Institute, and Jersey 10 by Sarah Cadigan-Fried, both under the SIL Open Font License.
        </p>
        <h3>Engine</h3>
        <p class="small">Phaser 4 (MIT), Preact (MIT), built with Vite and TypeScript.</p>
        <h3>Palette</h3>
        <p class="small">Endesga 64 by Endesga, the palette the icon pack is painted in.</p>
        <div class="row" style={{ justifyContent: 'flex-end' }}>
          <Btn autofocus onClick={() => ui.close()}>
            Close
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export function IconRow({ k, children }: { k: string; children: ComponentChildren }) {
  return (
    <span class="row">
      <Icon k={k} />
      {children}
    </span>
  );
}
