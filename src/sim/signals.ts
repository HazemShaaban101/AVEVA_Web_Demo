import { fbm, hashString } from '@/sim/noise';

/** Hourly shapes (0..1) of a mall's day. Index = hour of day, local time. */
export const PROFILES = {
  // Open 10:00–23:00, lunch and evening peaks, quiet night with base load.
  retail: [0.18, 0.15, 0.13, 0.12, 0.12, 0.14, 0.2, 0.3, 0.42, 0.58, 0.72, 0.8, 0.88, 0.92, 0.9, 0.86, 0.84, 0.88, 0.95, 1, 0.97, 0.86, 0.62, 0.34],
  // Cooling follows outside temperature: afternoon peak.
  hvac: [0.35, 0.32, 0.3, 0.28, 0.28, 0.3, 0.36, 0.45, 0.56, 0.66, 0.75, 0.83, 0.9, 0.96, 1, 0.98, 0.93, 0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.4],
  // Offices: 08:00–18:00.
  office: [0.1, 0.1, 0.1, 0.1, 0.1, 0.12, 0.2, 0.45, 0.8, 0.95, 1, 0.98, 0.9, 0.94, 0.98, 0.95, 0.85, 0.62, 0.35, 0.22, 0.16, 0.13, 0.12, 0.1],
  // People on site.
  occupancy: [0.02, 0.01, 0.01, 0.01, 0.01, 0.02, 0.04, 0.1, 0.2, 0.34, 0.5, 0.62, 0.74, 0.8, 0.76, 0.7, 0.72, 0.8, 0.92, 1, 0.94, 0.72, 0.4, 0.12],
  // Irrigation runs at dawn and dusk.
  irrigation: [0.1, 0.1, 0.12, 0.2, 0.55, 0.95, 1, 0.7, 0.25, 0.08, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.4, 0.85, 0.95, 0.6, 0.25, 0.12, 0.1],
  // Lights that are on from dusk to dawn.
  night: [1, 1, 1, 1, 1, 1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.9, 1, 1, 1, 1, 1],
  flat: Array.from({ length: 24 }, () => 1),
} as const;

export type ProfileId = keyof typeof PROFILES;

export interface SignalDef {
  /** Display unit, e.g. "kW", "m³", "%". */
  unit?: string;
  /** Value at the profile's 0 and 1. */
  low: number;
  high: number;
  profile?: ProfileId;
  /** Random deviation of the actual value from the prediction, as a fraction of (high - low). */
  noise?: number;
  /** Minutes per noise cycle: small = jittery, large = slow drift. */
  drift?: number;
  /** Day-to-day variation of the whole curve (fraction). */
  dayVariance?: number;
  decimals?: number;
  clampMin?: number;
  clampMax?: number;
}

export interface SeriesPoint {
  t: number;
  label: string;
  actual: number;
  predictive: number;
}

function profileAt(profile: readonly number[], date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  const i = Math.floor(h) % 24;
  const f = h - Math.floor(h);
  return profile[i] + (profile[(i + 1) % 24] - profile[i]) * f;
}

const round = (v: number, d = 1) => {
  const p = 10 ** d;
  return Math.round(v * p) / p;
};

/** A simulated signal: prediction = the day's profile; actual = prediction + slow, bounded noise. */
export class Signal {
  readonly seed: number;
  readonly def: SignalDef;
  readonly id: string;

  constructor(id: string, def: SignalDef) {
    this.id = id;
    this.def = def;
    this.seed = hashString(id);
  }

  predictive(t: number): number {
    const { low, high, profile = 'flat' } = this.def;
    // A constant (low == high) stays constant; everything else varies a little from day to day.
    const dayVariance = this.def.dayVariance ?? (low === high ? 0 : 0.06);
    const date = new Date(t);
    const dayKey = Math.floor(t / 86_400_000);
    const dayFactor = 1 + fbm(dayKey * 0.7, this.seed ^ 0x5bd1e995, 2) * dayVariance;
    return this.clamp((low + (high - low) * profileAt(PROFILES[profile], date)) * dayFactor);
  }

  actual(t: number): number {
    const { low, high, noise = 0.08, drift = 45, decimals = 1 } = this.def;
    const n = fbm(t / (drift * 60_000), this.seed, 3);
    return round(this.clamp(this.predictive(t) + n * noise * (high - low)), decimals);
  }

  /** Configured bounds; a percentage can never leave 0–100. */
  private clamp(v: number): number {
    const pct = this.def.unit === '%';
    const min = this.def.clampMin ?? (pct ? 0 : undefined);
    const max = this.def.clampMax ?? (pct ? 100 : undefined);
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }

  /** Points ending at `end`, `count` of them, `stepMs` apart. Each point averages its bucket. */
  series(end: number, count: number, stepMs: number, label: (d: Date) => string): SeriesPoint[] {
    const out: SeriesPoint[] = [];
    const aligned = Math.floor(end / stepMs) * stepMs;
    const samples = stepMs >= 86_400_000 ? 8 : 3;
    for (let i = count - 1; i >= 0; i--) {
      const t = aligned - i * stepMs;
      let a = 0;
      let p = 0;
      for (let s = 0; s < samples; s++) {
        const ts = t - (s * stepMs) / samples;
        a += this.actual(ts);
        p += this.predictive(ts);
      }
      out.push({ t, label: label(new Date(t)), actual: round(a / samples, this.def.decimals ?? 1), predictive: round(p / samples, this.def.decimals ?? 1) });
    }
    return out;
  }
}
