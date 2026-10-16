import { useUi } from './store';
import { Bar, Icon, Keycap } from './components';
import { fmtTime } from '../core/math';
import { game } from '../game/state';
import { keyLabel } from '../meta/settings';
import { WEAPON_SLOTS } from '../data/weapons';
import type { WeaponHud } from './store';

function WSlot({ w, held }: { w: WeaponHud | null; held?: boolean }) {
  if (!w)
    return (
      <div class="wslot slot" style={{ opacity: 0.45 }}>
        <span />
      </div>
    );
  return (
    <div class={`wslot slot ${held ? 'sel' : ''} ${w.evolved ? 'evolved' : ''}`} title={w.name}>
      <Icon k={w.icon} />
      {w.cd > 0 && <div class="cd" style={{ height: `${Math.round(w.cd * 16)}px` }} />}
      <span class="lvl">{w.evolved ? '★' : w.level}</span>
      {w.canEvolve && <span class="evo-dot" />}
    </div>
  );
}

export function ExpeditionHud() {
  const hud = useUi((s) => s.hud);
  if (!hud) return null;
  const keys = game.settings.keys;
  const slots: (WeaponHud | null)[] = [...hud.weapons];
  while (slots.length < WEAPON_SLOTS) slots.push(null);
  const low = hud.hp / hud.maxHp < 0.3;
  return (
    <div class="hud">
      <div class="hud-tl">
        <div class="row">
          <Icon k="ic_heart" />
          <Bar value={hud.hp} max={hud.maxHp} cls="hp" width={112} label={`${hud.hp} / ${hud.maxHp}`} />
          {hud.shields > 0 && (
            <span class="row" style={{ gap: '0px' }}>
              {Array.from({ length: hud.shields }, () => (
                <Icon k="p_petal_0" />
              ))}
            </span>
          )}
        </div>
        <div class="row">
          <span style={{ width: '9px', textAlign: 'center', color: 'var(--butter)', fontSize: 'calc(10px * var(--fs))' }}>{hud.level}</span>
          <Bar value={hud.xp} max={hud.xpNext} cls="xp" width={112} />
        </div>
        <div class="row" style={{ gap: '8px', marginTop: '1px' }}>
          <span class="row" title="Sap: experience, and Mags's currency. Everything you gather also feeds your farm.">
            <Icon k="ic_sap" />
            <b>{hud.sap}</b>
          </span>
          <span class="row" title="Farthings, banked when you get home">
            <Icon k="ic_farthing" />
            {hud.farthings}
          </span>
          <span class="row" title={`Jars (${keyLabel(keys.consumable[0])})`}>
            <Icon k="cf_61" scale={0.6} />
            {hud.jars}
            <Keycap code={keyLabel(keys.consumable[0])} />
          </span>
        </div>
        {low && <div class="small bad" style={{ marginTop: '1px' }}>Low health! {hud.jars > 0 ? `Press ${keyLabel(keys.consumable[0])} to drink a jar.` : 'Keep moving.'}</div>}
      </div>

      <div class="hud-top">
        {hud.boss ? (
          <div class="col" style={{ alignItems: 'center', gap: '1px' }}>
            <div class="title-font" style={{ fontSize: '20px', lineHeight: 0.8, color: 'var(--orchid)' }}>
              {hud.boss.name}
            </div>
            <Bar value={hud.boss.hp} max={hud.boss.max} cls="boss" width={300} />
            <div class="small muted">{hud.boss.phase ? 'The Great Uprooting' : 'Sovereign of the Royal Patch'}</div>
          </div>
        ) : (
          <div class="col" style={{ alignItems: 'center', gap: '1px' }}>
            <div style={{ fontSize: 'calc(12px * var(--fs))', color: 'var(--wheat)' }}>{hud.acreName}</div>
            <div style={{ width: '120px', height: '3px', background: 'rgba(28,18,28,0.7)', boxShadow: '0 0 0 1px #000' }}>
              <div style={{ width: `${hud.acreProgress * 100}%`, height: '3px', background: hud.phase === 'lull' ? 'var(--leaf)' : 'var(--amber)' }} />
            </div>
            <div class="small">{fmtTime(hud.time)}</div>
            {hud.elite && (
              <div class="col" style={{ alignItems: 'center', gap: '0', marginTop: '2px' }}>
                <div class="small" style={{ color: 'var(--gold)' }}>
                  {hud.elite.name}
                </div>
                <Bar value={hud.elite.hp} max={hud.elite.max} cls="elite" width={160} />
              </div>
            )}
            {hud.objective !== null && (
              <div class="small" style={{ color: 'var(--orchid)', marginTop: '2px' }}>
                Cleansing the shrine {Math.round(hud.objective * 100)}%
              </div>
            )}
            {hud.phase === 'lull' && (
              <div class="small good" style={{ marginTop: '2px' }}>
                Visit Mags <Keycap code={keyLabel(keys.interact[0])} /> to shop or press on
              </div>
            )}
          </div>
        )}
      </div>

      <div class="hud-tr">
        <div class="small muted">
          {hud.region}
          {hud.tier > 1 ? ` · Rot ${hud.tier}` : ''}
        </div>
      </div>

      {hud.prompt && (
        <div class="prompt">
          <Keycap code={keyLabel(keys.interact[0])} /> {hud.prompt}
        </div>
      )}

      <div class="hud-bottom">
        <WSlot w={hud.held} held />
        <div style={{ width: '4px' }} />
        {slots.map((w) => (
          <WSlot w={w} />
        ))}
        <div style={{ width: '6px' }} />
        <div class="ability slot" title="Dash">
          <span class="k">{keyLabel(keys.dash[0])}</span>
          <Icon k="ic_dash" />
          {hud.dashCd > 0 && <div class="cdmask" style={{ height: `${Math.round((hud.dashCd / hud.dashMax) * 18)}px` }} />}
        </div>
        <div class="ability slot" title={hud.activeName}>
          <span class="k">RMB</span>
          <Icon k="ic_star" />
          {hud.activeCd > 0 && <div class="cdmask" style={{ height: `${Math.round((hud.activeCd / hud.activeMax) * 18)}px` }} />}
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div class="toasts">
      {toasts.map((t) => (
        <div class={`toast ${t.tone}`} key={t.id}>
          {t.icon && <Icon k={t.icon} />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function BannerView() {
  const b = useUi((s) => s.banner);
  if (!b) return null;
  return (
    <div class={`banner ${b.tone}`} key={b.t}>
      <div class="t">{b.title}</div>
      {b.sub && <div class="s">{b.sub}</div>}
    </div>
  );
}
