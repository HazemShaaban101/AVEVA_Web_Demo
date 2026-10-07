import { BUILDINGS, type Building } from '@/model/site';
import { hashString, rand01 } from '@/sim/noise';

/**
 * The fire alarm system's field devices, per building: what each building's addressable loop holds,
 * and what state each device is in right now. The fire drill (sim/scenario.ts) puts the detectors
 * of buildings A01 and A02 into alarm; everything else is a deterministic mix of normal devices and
 * the occasional trouble (dust, low battery) or a device a technician has disabled.
 */

export type FireDeviceKind = 'Smoke detector' | 'Heat detector' | 'Manual call point' | 'Sounder / strobe';
export type FireDeviceState = 'Normal' | 'Alarm' | 'Sounding' | 'Fault' | 'Disabled';

export interface FireDevice {
  tag: string;
  kind: FireDeviceKind;
  building: string;
  floor: string;
  location: string;
  /** Loop address on the building's fire panel. */
  address: string;
}

const KINDS: { kind: FireDeviceKind; code: string; perFloor: number }[] = [
  { kind: 'Smoke detector', code: 'SD', perFloor: 4 },
  { kind: 'Heat detector', code: 'HD', perFloor: 1 },
  { kind: 'Manual call point', code: 'MCP', perFloor: 1 },
  { kind: 'Sounder / strobe', code: 'SND', perFloor: 2 },
];

const AREAS = ['East corridor', 'West corridor', 'Atrium', 'Plant room', 'Back of house', 'Stair core', 'Retail unit', 'Lobby'];

const cache = new Map<string, FireDevice[]>();

/** Every fire alarm device in a building, floor by floor (GF first). */
export function devicesOf(building: Building): FireDevice[] {
  const hit = cache.get(building.id);
  if (hit) return hit;
  const out: FireDevice[] = [];
  let addr = 1;
  for (const floor of building.floors.slice().reverse()) {
    for (const k of KINDS) {
      for (let i = 1; i <= k.perFloor; i++) {
        const tag = `${building.label}-${floor.label}-${k.code}-${String(i).padStart(2, '0')}`;
        const area = AREAS[hashString(tag) % AREAS.length];
        out.push({ tag, kind: k.kind, building: building.id, floor: floor.label, location: `${floor.label} · ${area}`, address: `L1.${String(addr++).padStart(3, '0')}` });
      }
    }
  }
  cache.set(building.id, out);
  return out;
}

export const allDevices = () => BUILDINGS.flatMap(devicesOf);

/** Detectors the fire drill puts into alarm: Zone 1 spans A01 and A02 (the same blocks the 3D view lights red). */
const DRILL_ALARMS = new Set(['A02-GF-SD-01', 'A02-GF-SD-02', 'A01-GF-SD-01']);
const DRILL_SOUNDING_FLOORS = new Set(['A02-GF', 'A01-GF']);

export interface FireDeviceValues {
  state: FireDeviceState;
  /** Why the device is in trouble or disabled. */
  note: string | null;
  battery: number;
  /** Chamber contamination for smoke detectors (%), temperature (°C) for heat detectors. */
  reading: number | null;
  signal: number;
  lastTest: string;
}

export function deviceValues(d: FireDevice, fireActive: boolean, now: number): FireDeviceValues {
  const r = rand01(hashString(d.tag), 11);
  const r2 = rand01(hashString(d.tag), 12);
  const day = Math.floor(now / 86_400_000);
  const alarm = fireActive && DRILL_ALARMS.has(d.tag);
  const sounding = fireActive && d.kind === 'Sounder / strobe' && DRILL_SOUNDING_FLOORS.has(d.tag.split('-').slice(0, 2).join('-'));
  let state: FireDeviceState = 'Normal';
  let note: string | null = null;
  if (alarm) state = 'Alarm';
  else if (sounding) state = 'Sounding';
  else if (r < 0.025) {
    state = 'Fault';
    note = d.kind === 'Smoke detector' ? 'Chamber contamination high: clean or replace' : 'Loop communication trouble';
  } else if (r < 0.04) {
    state = 'Fault';
    note = 'Low battery';
  } else if (r > 0.985) {
    state = 'Disabled';
    note = 'Disabled by technician for maintenance';
  }
  const reading = d.kind === 'Smoke detector' ? Math.round(6 + r2 * 22 + (state === 'Fault' && note?.startsWith('Chamber') ? 40 : 0)) : d.kind === 'Heat detector' ? Math.round((alarm ? 62 : 24 + r2 * 6) * 10) / 10 : null;
  const tested = new Date((day - 20 - Math.floor(r2 * 300)) * 86_400_000);
  return {
    state,
    note,
    battery: note === 'Low battery' ? 12 + Math.floor(r2 * 6) : 76 + Math.floor(r2 * 22),
    reading: alarm && d.kind === 'Smoke detector' ? 88 : reading,
    signal: 82 + Math.floor(r * 17),
    lastTest: tested.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
}

export interface BuildingFireSummary {
  building: Building;
  devices: number;
  alarms: number;
  faults: number;
  disabled: number;
}

export function summaryOf(building: Building, fireActive: boolean, now: number): BuildingFireSummary {
  const states = devicesOf(building).map((d) => deviceValues(d, fireActive, now).state);
  return {
    building,
    devices: states.length,
    alarms: states.filter((s) => s === 'Alarm').length,
    faults: states.filter((s) => s === 'Fault').length,
    disabled: states.filter((s) => s === 'Disabled').length,
  };
}
