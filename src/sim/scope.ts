import { create } from 'zustand';
import { BUILDINGS, buildingById } from '@/model/site';
import { derivedSignal, signal, type SignalId } from '@/sim/catalog';
import { hashString } from '@/sim/noise';
import type { Signal, SignalDef } from '@/sim/signals';

/**
 * What the KPIs on screen describe: the entire project, or one building. Entering a building (3D View
 * › A02) scopes every vertical to that building; the home page and the scope switcher return to the
 * project. Screens never compute this themselves — they ask for scoped signals.
 */
export type ScopeId = 'project' | string;

interface ScopeStore {
  scope: ScopeId;
  setScope: (s: ScopeId) => void;
}

export const useScopeStore = create<ScopeStore>((set) => ({
  scope: 'project',
  setScope: (scope) => set({ scope }),
}));

export const useScope = () => useScopeStore((s) => s.scope);

/** Each building's share of the project's totals (sums to 1). */
export const BUILDING_SHARE: Record<string, number> = {
  a02: 0.16,
  a01: 0.12,
  a03: 0.15,
  b01: 0.18,
  b02: 0.12,
  b03: 0.11,
  c01: 0.1,
  c02: 0.06,
};

/** Units that are totals (they add up across buildings); everything else is a rate or a condition. */
const EXTENSIVE = new Set(['kW', 'MW', 'MWh', 'm³', 'm³/h', 'MBTU', 'MBTU/h', 'TR', 'People', 'people', 'users', 'sessions', 'queries', 'mentions', 'cars/h', 'swipes', 'vehicles/h', 'tickets', 'Free', 'kVAR']);

export function scopeLabel(scope: ScopeId): string {
  return scope === 'project' ? 'Entire Project' : `Building ${buildingById(scope)?.label ?? scope.toUpperCase()}`;
}

export function scopedSignal(id: SignalId, scope: ScopeId): Signal {
  const base = signal(id);
  if (scope === 'project') return base;
  const def = base.def;
  const share = BUILDING_SHARE[scope] ?? 1 / BUILDINGS.length;
  let scoped: SignalDef;
  if (def.unit && EXTENSIVE.has(def.unit)) {
    const small = def.unit === 'MW' || def.unit === 'MWh';
    scoped = {
      ...def,
      low: def.low * share * (small ? 1000 : 1),
      high: def.high * share * (small ? 1000 : 1),
      unit: small ? (def.unit === 'MW' ? 'kW' : 'kWh') : def.unit,
      decimals: small ? 0 : def.decimals,
      clampMax: def.clampMax !== undefined ? def.clampMax * share : undefined,
    };
  } else {
    // Conditions differ a little between buildings, deterministically.
    const k = 1 + (((hashString(scope + id) % 9) - 4) / 100);
    scoped = { ...def, low: def.low * k, high: def.high * k };
  }
  return derivedSignal(`${id}@${scope}`, scoped);
}

/** Sub-areas for per-area charts: the buildings at project scope, the floors inside one building. */
export function scopeAreas(scope: ScopeId): { id: string; label: string; share: number }[] {
  if (scope === 'project') {
    return BUILDINGS.map((b) => ({ id: b.id, label: b.label, share: BUILDING_SHARE[b.id] ?? 0.1 }));
  }
  const b = buildingById(scope);
  const floors = (b?.floors ?? []).slice().reverse();
  const weights = floors.map((f) => (f.id === 'gf' ? 1.6 : f.id === 'ff' ? 1.3 : f.id === 'r' || f.id === 'ur' ? 0.35 : 1));
  const total = weights.reduce((a, w) => a + w, 0) || 1;
  return floors.map((f, i) => ({ id: f.id, label: f.label, share: weights[i] / total }));
}
