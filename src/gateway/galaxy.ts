import { useMemo } from 'react';
import { create } from 'zustand';
import type { OpcValue } from '@/gateway/client';
import { demoValues, FEEDBACK } from '@/gateway/demoDevices';
import { useNow } from '@/sim/clock';

export interface GalaxyPoint {
  name: string;
  nodeId: string;
  dataType: string | null;
  value: OpcValue;
  quality: string;
  statusCode: string;
  sourceTimestamp: string | null;
}

export interface GalaxyObject {
  name: string;
  status: 'loading' | 'live' | 'reconnecting' | 'not_found' | 'error';
  error: string | null;
  /** Attribute name (relative, e.g. "VSD_FB") → point. */
  points: Record<string, GalaxyPoint>;
  /** History of numeric/boolean attributes (last hour). */
  history: Record<string, { t: number; v: number }[]>;
}

/** Demo build: values written from the screens, per object and attribute (kept until reload). */
const useDemoWrites = create<{ values: Record<string, Record<string, OpcValue>> }>(() => ({ values: {} }));

function setWrite(name: string, attr: string, value: OpcValue) {
  useDemoWrites.setState((s) => ({ values: { ...s.values, [name]: { ...s.values[name], [attr]: value } } }));
}

/** Accept a write like the Galaxy would; the matching _Status point follows after a moment. */
export function writeDemo(name: string, attr: string, value: OpcValue): boolean {
  const now = demoValues(name, Date.now(), useDemoWrites.getState().values[name]);
  if (!now || !(attr in now)) return false;
  setWrite(name, attr, value);
  const feedback = FEEDBACK[attr];
  if (feedback) setTimeout(() => setWrite(name, feedback, value), 1500);
  return true;
}

const toNumber = (v: OpcValue): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'boolean' ? (v ? 1 : 0) : null);

function build(name: string, now: number, writes: Record<string, OpcValue> | undefined): GalaxyObject {
  const values = demoValues(name, now, writes);
  if (!values) return { name, status: 'not_found', error: `${name} is not in the demo.`, points: {}, history: {} };
  const stamp = new Date(now).toISOString();
  const points: Record<string, GalaxyPoint> = {};
  for (const [attr, p] of Object.entries(values)) {
    points[attr] = { name: attr, nodeId: `demo:${name}.${attr}`, dataType: p.dataType, value: p.value, quality: 'good', statusCode: 'Good', sourceTimestamp: stamp };
  }
  // The last hour, one sample every two minutes.
  const history: Record<string, { t: number; v: number }[]> = {};
  for (let k = 30; k >= 0; k--) {
    const t = now - k * 120_000;
    const past = k === 0 ? values : demoValues(name, t, writes);
    for (const [attr, p] of Object.entries(past ?? {})) {
      const v = toNumber(p.value);
      if (v !== null) (history[attr] ??= []).push({ t, v });
    }
  }
  return { name, status: 'live', error: null, points, history };
}

/** Live view of one demo object (e.g. "FAHU_001"), refreshed every two seconds. */
export function useGalaxyObject(name: string | null): GalaxyObject | undefined {
  const now = useNow(2000);
  const writes = useDemoWrites((s) => (name ? s.values[name] : undefined));
  return useMemo(() => (name ? build(name, now, writes) : undefined), [name, now, writes]);
}

/** Numeric reading of an attribute, or null when missing/bad. */
export function pointNumber(o: GalaxyObject | undefined, attr: string | undefined): number | null {
  if (!o || !attr) return null;
  const p = o.points[attr];
  if (!p || p.quality === 'bad') return null;
  return toNumber(p.value);
}
