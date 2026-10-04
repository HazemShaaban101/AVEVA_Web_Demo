import { useNow } from '@/sim/clock';
import { signal, type SignalId } from '@/sim/catalog';
import { scopedSignal, useScope } from '@/sim/scope';
import type { Signal } from '@/sim/signals';
import { ahuById, type AhuRole } from '@/model/galaxyBindings';
import { pointNumber, useGalaxyObject } from '@/gateway/galaxy';

/**
 * Where a widget's number comes from. Screens describe this declaratively, so switching a gauge from
 * the simulator to a live Galaxy attribute is a one-line change in the screen spec.
 */
export type Source =
  | { sim: SignalId; scale?: number }
  | { signal: Signal }
  | { galaxy: string; role: AhuRole; map?: (v: number) => number; unit?: string }
  | { fixed: number; unit?: string };

export interface SourceValue {
  value: number | null;
  predictive: number | null;
  unit: string;
  live: boolean;
  /** Scoped totals are a fraction of the project's: gauges scale their range by this. */
  rangeScale: number;
  /** For live sources: what's happening with the connection. */
  status?: 'loading' | 'live' | 'reconnecting' | 'not_found' | 'error';
}

export function useSource(src: Source, step = 2000): SourceValue {
  const now = useNow(step);
  const scope = useScope();
  const unit = 'galaxy' in src ? ahuById(src.galaxy) : undefined;
  const obj = useGalaxyObject(unit?.galaxy ?? null);

  if ('sim' in src || 'signal' in src) {
    const s = 'sim' in src ? scopedSignal(src.sim, scope) : src.signal;
    const k = 'sim' in src ? (src.scale ?? 1) : 1;
    const baseHigh = 'sim' in src ? signal(src.sim).def.high : s.def.high;
    const ratio = baseHigh ? s.def.high / baseHigh : 1;
    const rangeScale = Math.abs(ratio - 1) < 0.1 ? 1 : ratio;
    return { value: s.actual(now) * k, predictive: s.predictive(now) * k, unit: s.def.unit ?? '', live: false, rangeScale };
  }
  if ('fixed' in src) return { value: src.fixed, predictive: null, unit: src.unit ?? '', live: false, rangeScale: 1 };

  const raw = pointNumber(obj, unit?.attrs[src.role]);
  return {
    value: raw === null ? null : src.map ? src.map(raw) : raw,
    predictive: null,
    unit: src.unit ?? '',
    live: true,
    rangeScale: 1,
    status: obj?.status ?? 'loading',
  };
}
