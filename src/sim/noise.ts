/**
 * Deterministic noise: the same signal at the same instant always has the same value, on every
 * screen and after a reload. That keeps the simulation coherent (a KPI on the overview agrees with
 * the chart on the detail screen) and lets any historical window be computed on demand.
 */

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Uniform [0, 1) for an integer lattice point. */
function lattice(i: number, seed: number): number {
  let x = Math.imul(i ^ seed, 0x27d4eb2d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise in [-1, 1]; `x` in lattice units. */
export function valueNoise(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = lattice(i, seed);
  const b = lattice(i + 1, seed);
  return (a + (b - a) * smooth(f)) * 2 - 1;
}

/** Fractal noise: a few octaves so signals wander slowly and jitter a little. */
export function fbm(x: number, seed: number, octaves = 3): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, seed + o * 1013) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

/** Stable pseudo-random pick for discrete things (which plate, which door). */
export function pick<T>(items: readonly T[], key: number, seed: number): T {
  return items[Math.floor(lattice(key, seed) * items.length) % items.length];
}

export function rand01(key: number, seed: number): number {
  return lattice(key, seed);
}
