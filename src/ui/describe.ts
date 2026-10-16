// Turns game data into short, readable text for cards and tooltips.

import { WEAPONS, EVOLUTIONS, DEFAULT_PARAMS } from '../data/weapons';
import { ITEMS } from '../data/items';
import { TRAITS } from '../data/traits';
import { describeMods } from '../data/stats';
import type { Rarity, TraitId, WeaponDef, WeaponParams } from '../data/types';
import { FAMILY_LABEL } from '../data/types';
import type { Offer } from '../sim/upgrades';

export interface Described {
  kind: string;
  name: string;
  icon: string;
  rarity: Rarity;
  lines: string[];
  flavour?: string;
  traits?: TraitId[];
  evolve?: boolean;
  bad?: string[];
}

const BEHAVIOUR_LABEL: Record<string, string> = {
  shooter: 'Shoots',
  lance: 'Lance',
  lobber: 'Lobbed',
  artillery: 'Artillery',
  orbit: 'Orbits you',
  sweep: 'Melee sweep',
  summoner: 'Summons',
  swarm: 'Swarm',
  briar: 'Barrier',
  puffer: 'Spray',
  storm: 'Storm',
  crown: 'Boomerang',
};

export function paramsAt(def: WeaponDef, level: number): WeaponParams {
  const p: WeaponParams = { ...DEFAULT_PARAMS, ...def.base };
  for (let i = 0; i < level - 1 && i < def.levels.length; i++) {
    const l = def.levels[i];
    for (const k in l.add) (p as any)[k] += (l.add as any)[k];
    for (const k in l.mult) (p as any)[k] *= (l.mult as any)[k];
  }
  return p;
}

export function weaponSummary(def: WeaponDef, level: number): string {
  const p = paramsAt(def, level);
  const parts: string[] = [];
  const dmg = Math.round(p.damage);
  const shots = p.burst > 1 ? `${dmg} x${Math.round(p.burst)}` : `${dmg}`;
  parts.push(`${shots} ${def.dmgType}`);
  if (def.behaviour === 'orbit') parts.push(`${p.count} petals`);
  else if (def.behaviour === 'summoner' || def.behaviour === 'swarm') parts.push(`${p.count} allies`);
  else if (def.behaviour !== 'briar' && p.count > 1) parts.push(`${p.count} shots`);
  if (def.behaviour !== 'orbit' && def.behaviour !== 'summoner') parts.push(`every ${p.cooldown.toFixed(2)}s`);
  if (p.pierce > 0 && p.pierce < 50) parts.push(`pierce ${p.pierce}`);
  if (p.pierce >= 50) parts.push('pierces all');
  if (p.chain > 0) parts.push(`chains ${p.chain}`);
  if (p.split > 0) parts.push(`${p.split} shards`);
  return parts.join(' · ');
}

export function describeWeapon(id: string, level = 1, traits: TraitId[] = []): Described {
  const def = WEAPONS[id];
  const evo = EVOLUTIONS.find((e) => e.from === id);
  const lines = [def.desc, weaponSummary(def, level)];
  if (def.statMods) lines.push(...describeMods(def.statMods));
  if (evo) lines.push(`Evolves at Lv 5 with: ${evo.hint}`);
  return {
    kind: `${FAMILY_LABEL[def.family]} · ${BEHAVIOUR_LABEL[def.behaviour] ?? ''}`,
    name: def.name,
    icon: def.icon,
    rarity: def.rarity,
    lines,
    flavour: def.flavour,
    traits,
  };
}

export function describeOffer(o: Offer, heldId: string, heldLevel: number): Described {
  switch (o.kind) {
    case 'stat':
      return {
        kind: o.card.tradeoff ? 'Trade-off' : 'Upgrade',
        name: o.card.name,
        icon: o.card.icon,
        rarity: o.rarity,
        lines: describeMods(o.mods),
      };
    case 'weaponNew': {
      const d = describeWeapon(o.id, 1);
      return { ...d, kind: `New weapon · ${d.kind}`, lines: [d.lines[0], d.lines[1]] };
    }
    case 'weaponUp': {
      const def = o.weapon.def;
      return {
        kind: `Level ${o.weapon.level} → ${o.weapon.level + 1}`,
        name: def.name,
        icon: def.icon,
        rarity: def.rarity,
        lines: [o.desc, weaponSummary(def, o.weapon.level + 1)],
        traits: o.weapon.allTraits,
      };
    }
    case 'heldUp': {
      const def = WEAPONS[heldId];
      return {
        kind: `Your hand · Level ${heldLevel} → ${heldLevel + 1}`,
        name: def.name,
        icon: def.icon,
        rarity: 'uncommon',
        lines: [o.desc],
      };
    }
    case 'evolve': {
      const into = WEAPONS[o.into];
      return {
        kind: 'Evolution',
        name: into.name,
        icon: into.icon,
        rarity: 'legendary',
        lines: [`${o.weapon.def.name} becomes ${into.name}.`, into.desc],
        flavour: into.flavour,
        evolve: true,
      };
    }
    case 'item': {
      const it = ITEMS[o.id];
      return { kind: 'Item', name: it.name, icon: it.icon, rarity: it.rarity, lines: [it.desc], flavour: it.flavour };
    }
  }
}

export function traitLine(t: TraitId) {
  return `${TRAITS[t].name}: ${TRAITS[t].desc}`;
}
