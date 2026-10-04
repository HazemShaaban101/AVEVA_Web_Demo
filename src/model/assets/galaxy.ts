/**
 * Simulated field assets, modelled the way they would be built in an AVEVA System Platform Galaxy:
 * every asset is an instance (tag name, e.g. GEN_001) of a template ($Genset, $UPS, …) whose
 * attributes are fed by an I/O source (an OI Server / DAServer over Modbus, SNMP, BACnet, DNP3, or
 * PLC I/O). Screens show the real `Tag.Attribute` references next to the values, so binding a view
 * to a live Galaxy object later is a lookup (see model/galaxyBindings.ts for FAHU_001, already live).
 */

export type AttrType = 'Boolean' | 'Integer' | 'Float' | 'String';

export interface AttrDef {
  name: string;
  type: AttrType;
  unit?: string;
  desc: string;
  /** Integer enumerations (e.g. Mode 0/1/2) and their meanings. */
  states?: Record<number, string>;
  /** Decimals shown for Floats. */
  decimals?: number;
}

export interface TemplateDef {
  name: string;
  desc: string;
  /** Where the attributes come from in a real Galaxy. */
  io: string;
  attrs: AttrDef[];
}

export type AttrValue = number | boolean | string | null;
export type AttrValues = Record<string, AttrValue>;

/** Display text for one attribute value. */
export function formatAttr(def: AttrDef | undefined, v: AttrValue): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'string') return v;
  if (def?.states && def.states[v] !== undefined) return `${v} · ${def.states[v]}`;
  const d = def?.type === 'Integer' ? 0 : (def?.decimals ?? 1);
  const text = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return def?.unit ? `${text} ${def.unit}` : text;
}

/** Deterministic 0..1 from a string (stable per tag across reloads). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** A value that wanders smoothly around `base` (± spread), deterministic per key. */
export function wander(key: string, now: number, base: number, spread: number, periodMin = 7): number {
  const seed = hash01(key) * 1000;
  const t = now / (periodMin * 60_000);
  const n = Math.sin(t * 2.1 + seed) * 0.55 + Math.sin(t * 5.3 + seed * 1.7) * 0.3 + Math.sin(t * 13.1 + seed * 2.3) * 0.15;
  return base + n * spread;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
