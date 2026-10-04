import { useSyncExternalStore } from 'react';

/**
 * One shared clock for the whole platform. Components subscribe at the granularity they need
 * (`useNow(5000)` re-renders every 5 s, on the 5-second boundary), so a screen full of widgets
 * re-renders in step instead of each widget running its own timer.
 */
type Listener = () => void;

const listeners = new Map<number, Set<Listener>>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function schedule(step: number) {
  const now = Date.now();
  const delay = step - (now % step) + 5;
  timers.set(
    step,
    setTimeout(() => {
      listeners.get(step)?.forEach((l) => l());
      schedule(step);
    }, delay),
  );
}

function subscribe(step: number, listener: Listener) {
  let set = listeners.get(step);
  if (!set) {
    set = new Set();
    listeners.set(step, set);
    schedule(step);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) {
      clearTimeout(timers.get(step));
      timers.delete(step);
      listeners.delete(step);
    }
  };
}

/** Current time, quantized to `step` ms. */
export function useNow(step = 1000): number {
  return useSyncExternalStore(
    (l) => subscribe(step, l),
    () => Math.floor(Date.now() / step) * step,
  );
}
