import { useMemo } from 'react';
import { useNow } from '@/sim/clock';
import { hashString, rand01 } from '@/sim/noise';
import { PROFILES, type ProfileId } from '@/sim/signals';

/**
 * Deterministic event streams (access swipes, plate reads, tickets, posts…). Time is cut into slots;
 * each slot holds an event with a probability that follows the day's profile, and the event's fields
 * are derived from the slot number. So every screen — and every reload — sees the same history, and
 * new events simply appear as slots fill in.
 */
export interface StreamSpec<T> {
  id: string;
  /** Average events per hour at the profile's peak. */
  peakPerHour: number;
  profile?: ProfileId;
  /** Build the event for slot `k` (random helpers are deterministic per slot). */
  make: (k: number, rnd: (salt: number) => number, t: number) => T;
}

export interface StreamEvent<T> {
  key: string;
  t: number;
  data: T;
}

const SLOT_MS = 15_000;

export function eventsBetween<T>(spec: StreamSpec<T>, from: number, to: number, limit = 200): StreamEvent<T>[] {
  const seed = hashString(spec.id);
  const out: StreamEvent<T>[] = [];
  const profile = PROFILES[spec.profile ?? 'flat'];
  for (let k = Math.floor(to / SLOT_MS); k >= Math.floor(from / SLOT_MS) && out.length < limit; k--) {
    const t = k * SLOT_MS;
    const hour = new Date(t).getHours();
    const p = Math.min(1, (spec.peakPerHour * (0.15 + 0.85 * profile[hour]) * SLOT_MS) / 3_600_000);
    // Several events can share a slot at high rates.
    const n = Math.floor(p) + (rand01(k, seed) < p - Math.floor(p) ? 1 : 0);
    for (let j = 0; j < n; j++) {
      const slot = k * 4 + j;
      const rnd = (salt: number) => rand01(slot * 31 + salt, seed);
      out.push({ key: `${spec.id}-${slot}`, t: t + Math.floor(rnd(97) * SLOT_MS), data: spec.make(slot, rnd, t) });
    }
  }
  return out.filter((e) => e.t <= to).sort((a, b) => b.t - a.t);
}

/** The newest `count` events, refreshed as time moves (every 5 s). */
export function useEventStream<T>(spec: StreamSpec<T>, count = 12, lookbackMs = 6 * 3_600_000): StreamEvent<T>[] {
  const now = useNow(5000);
  return useMemo(() => eventsBetween(spec, now - lookbackMs, now, count), [spec, now, count, lookbackMs]);
}

/** Count of events so far today. */
export function useEventCountToday<T>(spec: StreamSpec<T>, filter?: (e: T) => boolean): number {
  const now = useNow(30_000);
  return useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return eventsBetween(spec, start.getTime(), now, 100_000).filter((e) => !filter || filter(e.data)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, now]);
}

/** Today's events counted per key (e.g. per type or channel), in one pass over the day. */
export function useEventTallyToday<T>(spec: StreamSpec<T>, key: (e: T) => string): Record<string, number> {
  const now = useNow(30_000);
  return useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const out: Record<string, number> = {};
    for (const e of eventsBetween(spec, start.getTime(), now, 100_000)) {
      const k = key(e.data);
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, now]);
}

export const pickFrom = <T,>(list: readonly T[], r: number): T => list[Math.floor(r * list.length) % list.length];
