// Small building blocks for the interface: icons drawn from the game atlas,
// buttons, bars, cost readouts, and arrow-key navigation for every menu.

import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { frameUrl } from '../render/textures';
import { TRAITS } from '../data/traits';
import { MATERIALS } from '../data/materials';
import type { TraitId } from '../data/types';
import { menuArmed } from './menuArm';
import { game } from '../game/state';

export function Icon({ k, scale = 1, title, class: cls }: { k: string; scale?: number; title?: string; class?: string }) {
  const url = frameUrl(k);
  return <img class={`icon ${cls ?? ''}`} src={url} title={title} alt={title ?? ''} style={{ zoom: scale }} draggable={false} />;
}

export function Btn(props: { onClick?: () => void; children: ComponentChildren; disabled?: boolean; class?: string; title?: string; autofocus?: boolean; big?: boolean; sound?: string }) {
  return (
    <button
      class={`btn ${props.big ? 'big' : ''} ${props.class ?? ''}`}
      data-nav
      data-autofocus={props.autofocus ? '' : undefined}
      disabled={props.disabled}
      title={props.title}
      onMouseEnter={() => game.sfx('ui_move', 0.5)}
      onClick={() => {
        if (props.disabled) return;
        game.sfx(props.sound ?? 'ui_select', 0.7);
        props.onClick?.();
      }}
    >
      {props.children}
    </button>
  );
}

export function Bar({ value, max, cls, label, width }: { value: number; max: number; cls: string; label?: string; width: number }) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * 100;
  return (
    <div class={`bar ${cls}`} style={{ width: `${width}px` }}>
      {cls === 'hp' || cls === 'boss' ? <div class="lag" style={{ width: `${pct}%` }} /> : null}
      <div class="fill" style={{ width: `${pct}%` }} />
      {label ? <div class="label">{label}</div> : null}
    </div>
  );
}

export function Traits({ traits }: { traits: TraitId[] | string[] }) {
  if (!traits?.length) return null;
  return (
    <span>
      {(traits as TraitId[]).map((t) => (
        <span class="trait" style={{ color: TRAITS[t]?.colour }} title={TRAITS[t]?.desc}>
          <Icon k={TRAITS[t]?.icon ?? 'ic_star'} />
          {TRAITS[t]?.name ?? t}
        </span>
      ))}
    </span>
  );
}

export function Cost({ cost }: { cost: Record<string, number> }) {
  const p = game.profile;
  return (
    <span class="row" style={{ flexWrap: 'wrap', gap: '0 2px' }}>
      {Object.entries(cost).map(([k, v]) => {
        const have = k === 'farthings' ? (p?.farthings ?? 0) : (p?.materials[k] ?? 0);
        return (
          <span class={`cost ${have < v ? 'short' : ''}`} title={k === 'farthings' ? 'Farthings' : MATERIALS[k]?.name}>
            <Icon k={k === 'farthings' ? 'ic_farthing' : (MATERIALS[k]?.icon ?? 'cf_1')} />
            {v}
            {k !== 'farthings' && <span class="small muted">/{have}</span>}
          </span>
        );
      })}
    </span>
  );
}

export function Modal({ children, width, class: cls, clear, onBack }: { children: ComponentChildren; width?: number; class?: string; clear?: boolean; onBack?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.opened = String(performance.now());
    const first = (el.querySelector('[data-autofocus]') ?? el.querySelector('[data-nav]:not([disabled])')) as HTMLElement | null;
    first?.focus({ preventScroll: true });
  }, []);
  return (
    <div class={`modal-backdrop ${clear ? 'clear' : ''}`} data-ui-block onMouseDown={(e) => e.target === e.currentTarget && onBack?.()}>
      <div ref={ref} class={`modal nav-root ${cls ?? ''}`} style={{ width: width ? `${width}px` : undefined }} data-back={onBack ? '1' : undefined}>
        {children}
      </div>
    </div>
  );
}

/** Arrow keys, WASD, Enter, Tab and Escape for whatever menu is on top. */
export function installMenuNav(getBack: () => (() => void) | null) {
  window.addEventListener(
    'keydown',
    (e) => {
      const roots = document.querySelectorAll('.nav-root');
      const root = roots[roots.length - 1] as HTMLElement | undefined;
      if (!root) return;
      const key = e.code;
      if (key === 'Escape') {
        const back = getBack();
        if (back) {
          // Stop the key here so the game does not also see it and reopen a menu.
          e.preventDefault();
          e.stopPropagation();
          game.sfx('ui_back', 0.6);
          back();
        }
        return;
      }
      const target0 = e.target as HTMLElement;
      const typing = target0?.tagName === 'INPUT' && (target0 as HTMLInputElement).type === 'text';
      // Space is the dash key: in a menu it never presses a button (Enter does).
      if (key === 'Space' && !typing) {
        e.preventDefault();
        return;
      }
      if (key === 'Enter' && !menuArmed(root)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Tab cycles through the menu's own controls and never leaves it.
      if (key === 'Tab') {
        e.preventDefault();
        const items = [...root.querySelectorAll<HTMLElement>('[data-nav]:not([disabled])')].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length];
        next.focus();
        next.scrollIntoView({ block: 'nearest' });
        return;
      }
      const dir =
        key === 'ArrowUp' || key === 'KeyW' ? [0, -1] : key === 'ArrowDown' || key === 'KeyS' ? [0, 1] : key === 'ArrowLeft' || key === 'KeyA' ? [-1, 0] : key === 'ArrowRight' || key === 'KeyD' ? [1, 0] : null;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range' && dir && dir[0] !== 0) return;
      if (target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') return;
      if (dir) {
        e.preventDefault();
        const items = [...root.querySelectorAll<HTMLElement>('[data-nav]:not([disabled])')].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const cur = document.activeElement as HTMLElement;
        if (!root.contains(cur) || !items.includes(cur)) {
          items[0].focus();
          return;
        }
        const a = cur.getBoundingClientRect();
        const ax = a.left + a.width / 2;
        const ay = a.top + a.height / 2;
        let best: HTMLElement | null = null;
        let bestScore = Infinity;
        for (const el of items) {
          if (el === cur) continue;
          const b = el.getBoundingClientRect();
          const dx = b.left + b.width / 2 - ax;
          const dy = b.top + b.height / 2 - ay;
          const along = dx * dir[0] + dy * dir[1];
          if (along <= 2) continue;
          const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
          const score = along + across * 2.2;
          if (score < bestScore) {
            bestScore = score;
            best = el;
          }
        }
        if (best) {
          best.focus();
          best.scrollIntoView({ block: 'nearest' });
          game.sfx('ui_move', 0.4);
        }
        return;
      }
      if (key === 'Enter' && document.activeElement && root.contains(document.activeElement)) {
        const el = document.activeElement as HTMLElement;
        if (el.tagName !== 'BUTTON' && el.hasAttribute('data-nav')) {
          e.preventDefault();
          el.click();
        }
      }
    },
    true,
  );
}

export function Keycap({ code }: { code: string }) {
  return <span class="keycap">{code}</span>;
}

export function Tip({ children, x, y }: { children: ComponentChildren; x: number; y: number }) {
  const style: JSX.CSSProperties = { left: `${Math.min(480, x + 10)}px`, top: `${Math.min(270, y)}px` };
  return (
    <div class="tooltip parch" style={style}>
      {children}
    </div>
  );
}
