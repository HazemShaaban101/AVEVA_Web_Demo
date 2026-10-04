import { useMemo } from 'react';
import { signal, type SignalId } from '@/sim/catalog';
import { scopedSignal, useScope } from '@/sim/scope';
import { useNow } from '@/sim/clock';
import type { SeriesPoint, Signal } from '@/sim/signals';

export type Period = 'day' | 'week' | 'month';

export const PERIODS: Record<Period, { count: number; stepMs: number; axis: string; label: (d: Date) => string; name: string }> = {
  day: {
    count: 24,
    stepMs: 3_600_000,
    axis: 'Time (hrs)',
    name: 'Last 24 hours',
    label: (d) => `${String(d.getHours()).padStart(2, '0')}:00`,
  },
  week: {
    count: 7,
    stepMs: 86_400_000,
    axis: 'Day',
    name: 'Last 7 days',
    label: (d) => d.toLocaleDateString('en-US', { weekday: 'short' }),
  },
  month: {
    count: 30,
    stepMs: 86_400_000,
    axis: 'Date',
    name: 'Last 30 days',
    label: (d) => d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
  },
};

export const nextPeriod = (p: Period): Period => (p === 'day' ? 'week' : p === 'week' ? 'month' : 'day');

/** The live value of a simulated signal (for the current scope), refreshed every `step` ms. */
export function useSignal(id: SignalId, step = 2000, opts: { global?: boolean } = {}) {
  const now = useNow(step);
  const scope = useScope();
  const s = opts.global ? signal(id) : scopedSignal(id, scope);
  return { value: s.actual(now), predictive: s.predictive(now), unit: s.def.unit ?? '', def: s.def };
}

export function useSignalOf(s: Signal, step = 2000) {
  const now = useNow(step);
  return { value: s.actual(now), predictive: s.predictive(now), unit: s.def.unit ?? '' };
}

/** A history window of a signal (actual + predictive), recomputed when the window moves. */
export function useSeries(id: SignalId, period: Period = 'day'): SeriesPoint[] {
  const { stepMs, count, label } = PERIODS[period];
  // Refresh at a pace that matches the resolution: the last hourly point moves every minute.
  const now = useNow(period === 'day' ? 60_000 : 600_000);
  const scope = useScope();
  return useMemo(() => scopedSignal(id, scope).series(now, count, stepMs, label), [id, scope, now, count, stepMs, label]);
}

export function useSeriesOf(s: Signal, period: Period = 'day'): SeriesPoint[] {
  const { stepMs, count, label } = PERIODS[period];
  const now = useNow(period === 'day' ? 60_000 : 600_000);
  return useMemo(() => s.series(now, count, stepMs, label), [s, now, count, stepMs, label]);
}
