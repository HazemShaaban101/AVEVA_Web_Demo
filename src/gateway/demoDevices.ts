import type { OpcValue } from '@/gateway/client';
import { AHU_UNITS, FCU_TEMPLATE as T, FLOOR_AREAS } from '@/model/galaxyBindings';
import { hash01, wander } from '@/model/assets/galaxy';

/**
 * Demo build: the equipment that would be live from the Galaxy (the FAHU and the FCUs), simulated.
 * Values move smoothly and deterministically with time; writes from the FCU card are kept in memory
 * and their _Status feedback follows a moment later, as real equipment would answer.
 */

export interface DemoPoint {
  value: OpcValue;
  dataType: string;
}

export type DemoValues = Record<string, DemoPoint>;

const num = (v: number, decimals = 1): DemoPoint => ({ value: Math.round(v * 10 ** decimals) / 10 ** decimals, dataType: 'Double' });
const bool = (v: boolean): DemoPoint => ({ value: v, dataType: 'Boolean' });
const int = (v: number): DemoPoint => ({ value: Math.round(v), dataType: 'Int32' });

/* ---- FAHU ------------------------------------------------------------------------------------ */

const FAHU = AHU_UNITS[0];

function fahuValues(t: number): DemoValues {
  const a = FAHU.attrs;
  const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
  const outside = 27 + 6 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
  const valve = 52 + (outside - 27) * 3 + wander('fahu.v', t, 0, 4, 9);
  const vsd = 70 + wander('fahu.vsd', t, 0, 3, 6);
  return {
    [a.supplyTemp]: num(wander('fahu.sat', t, 14.6, 0.5, 5)),
    [a.supplyHumd]: num(wander('fahu.sah', t, 52, 3, 8)),
    [a.outsideTemp]: num(outside + wander('fahu.oat', t, 0, 0.4, 4)),
    [a.outsideHumd]: num(wander('fahu.oah', t, 44, 6, 20)),
    [a.startStop]: bool(true),
    [a.auto]: bool(true),
    [a.fanCmd]: bool(true),
    [a.fanStatus]: bool(true),
    [a.vsdCmd]: num(72, 0),
    [a.vsdFb]: num(vsd),
    [a.trip]: bool(false),
    [a.filter]: bool(false),
    [a.filterDps]: bool(false),
    // About 78 % of the 250 Pa limit, as the sample notification says.
    [a.pressure]: num(wander('fahu.dp', t, 195, 6, 7), 0),
    [a.valveCmd]: num(valve),
    [a.valveFb]: num(valve - 1.2),
    [a.valveAlarm]: bool(false),
    [a.flow]: bool(true),
    [a.smoke]: bool(false),
    [a.fireAlarm]: bool(false),
    [a.freshDamperCmd]: bool(true),
    [a.freshDamperSts]: bool(true),
    [a.freshDamperFail]: bool(false),
    [a.returnDamperCmd]: bool(true),
    [a.returnDamperSts]: bool(true),
    [a.returnDamperFail]: bool(false),
    [a.inAlarm]: bool(false),
    [a.scan]: bool(true),
  };
}

/* ---- FCUs ------------------------------------------------------------------------------------ */

const AREAS = [FLOOR_AREAS.gf, FLOOR_AREAS.gf, FLOOR_AREAS.gf, FLOOR_AREAS.ff, FLOOR_AREAS.ff, FLOOR_AREAS.ff, FLOOR_AREAS.f2, FLOOR_AREAS.f2, FLOOR_AREAS.f3, FLOOR_AREAS.f3, FLOOR_AREAS.r, FLOOR_AREAS.r];

/** The FCU instances the demo "Galaxy" holds, with the Area each is assigned to. */
export const DEMO_FCUS = AREAS.map((area, i) => ({ name: `FCU_${String(i + 1).padStart(3, '0')}`, parent: area }));

function fcuValues(name: string, t: number, w: Record<string, OpcValue> | undefined): DemoValues {
  const h = hash01(name);
  const pick = (attr: string, fallback: number) => (typeof w?.[attr] === 'number' ? (w[attr] as number) : fallback);
  const on = pick(T.command, h < 0.8 ? 1 : 0);
  const speed = pick(T.fanSpeed, 1 + Math.floor(h * 3));
  const mode = pick(T.fanMode, h < 0.6 ? 0 : 2);
  const sp = pick(T.setpoint, 22 + Math.round(h * 4) / 2);
  // Running units hold the room near the set point; stopped ones drift up towards the corridor.
  const room = on ? sp + 0.4 + wander(name + 't', t, 0, 0.35, 6) : 26.4 + wander(name + 't', t, 0, 0.4, 12);
  return {
    [T.command]: int(on),
    [T.commandStatus]: int(pick(T.commandStatus, on)),
    [T.fanSpeed]: int(speed),
    [T.fanSpeedStatus]: int(pick(T.fanSpeedStatus, speed)),
    [T.fanMode]: int(mode),
    [T.fanModeStatus]: int(pick(T.fanModeStatus, mode)),
    [T.setpoint]: num(sp),
    [T.temperature]: num(room),
  };
}

/** Current values of a demo object, or null when the demo has no such object. */
export function demoValues(name: string, t: number, writes?: Record<string, OpcValue>): DemoValues | null {
  if (name === FAHU.galaxy) return fahuValues(t);
  if (DEMO_FCUS.some((f) => f.name === name)) return fcuValues(name, t, writes);
  return null;
}

/** For a command attribute, the _Status attribute that reports it back (FCU template). */
export const FEEDBACK: Record<string, string> = {
  [T.command]: T.commandStatus,
  [T.fanSpeed]: T.fanSpeedStatus,
  [T.fanMode]: T.fanModeStatus,
};
