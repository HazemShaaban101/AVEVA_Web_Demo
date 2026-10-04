import { clamp, hash01, wander, type AttrValues, type TemplateDef } from '@/model/assets/galaxy';
import { pumpSetStates } from '@/model/assets/water';

/* =================================================================================================
 * Fire hydrants
 *
 * Each yard hydrant carries a battery smart-hydrant monitor (pressure, cap/nut tamper, acoustic leak,
 * tilt/impact) reporting over LoRaWAN; the network server publishes to MQTT and the Galaxy reads it
 * through the MQTT OI Server. The hydrant's sectional isolation valve has a supervisory switch wired
 * to the fire alarm panel, read over BACnet. Flow-test results are entered by the test crew (NFPA 25:
 * annual flow test) and kept as attributes; a Galaxy script rolls everything into Readiness.
 * ================================================================================================= */

export const HYDRANT_TEMPLATE: TemplateDef = {
  name: '$FireHydrant',
  desc: 'Yard fire hydrant with smart monitor',
  io: 'MQTT OI Server · LoRaWAN hydrant monitor; BACnet · valve supervisory switch via fire panel',
  attrs: [
    { name: 'Static_Pressure', type: 'Float', unit: 'bar', desc: 'Main pressure at the hydrant', decimals: 2 },
    { name: 'Pressure_Low_Alarm', type: 'Boolean', desc: 'Pressure below 7.0 bar' },
    { name: 'Isolation_Valve_Open', type: 'Boolean', desc: 'Sectional isolation valve open (supervisory switch)' },
    { name: 'Flowing', type: 'Boolean', desc: 'Hydrant in use (flow detected)' },
    { name: 'Cap_Tamper', type: 'Boolean', desc: 'Outlet cap removed or operating nut turned' },
    { name: 'Leak_Alarm', type: 'Boolean', desc: 'Acoustic leak signature at the valve seat' },
    { name: 'Impact_Alarm', type: 'Boolean', desc: 'Tilt / vehicle impact' },
    { name: 'Temperature', type: 'Float', unit: '°C', desc: 'Barrel temperature', decimals: 1 },
    { name: 'Battery_Pct', type: 'Integer', unit: '%', desc: 'Monitor battery' },
    { name: 'Last_Uplink_s', type: 'Integer', unit: 's', desc: 'Seconds since the last LoRaWAN uplink' },
    { name: 'Comm_OK', type: 'Boolean', desc: 'Monitor reporting' },
    { name: 'LastTest_Date', type: 'String', desc: 'Last annual flow test' },
    { name: 'LastTest_Flow_Lpm', type: 'Float', unit: 'L/min', desc: 'Flow at the last test (pitot)', decimals: 0 },
    { name: 'LastTest_Residual', type: 'Float', unit: 'bar', desc: 'Residual pressure during the last test', decimals: 2 },
    { name: 'Days_To_Test', type: 'Integer', unit: 'd', desc: 'Days until the next flow test (negative: overdue)' },
    { name: 'Readiness_Score', type: 'Float', unit: '%', desc: 'Readiness score (Galaxy script)', decimals: 0 },
    { name: 'Readiness', type: 'Integer', desc: 'Readiness', states: { 0: 'Ready', 1: 'Attention', 2: 'Not ready' } },
  ],
};

/** Required flow at the test (NFPA 291 basis: 1,900 L/min with at least 1.4 bar residual). */
export const REQUIRED_FLOW_LPM = 1900;
export const MIN_RESIDUAL_BAR = 1.4;
export const LOW_PRESSURE_BAR = 7;

export interface Hydrant {
  tag: string;
  label: string;
  kind: 'Pillar 2 × 65 mm' | 'Underground 80 mm';
  location: string;
  /** Position on the site map (map coordinates, 2400 × 1191). */
  x: number;
  y: number;
}

export const HYDRANTS: Hydrant[] = [
  { tag: 'HYD_01', label: 'H-01', kind: 'Pillar 2 × 65 mm', location: 'West gate', x: 170, y: 610 },
  { tag: 'HYD_02', label: 'H-02', kind: 'Pillar 2 × 65 mm', location: 'North-west car park', x: 380, y: 300 },
  { tag: 'HYD_03', label: 'H-03', kind: 'Pillar 2 × 65 mm', location: 'Hypermarket C01', x: 760, y: 270 },
  { tag: 'HYD_04', label: 'H-04', kind: 'Underground 80 mm', location: 'Service road north', x: 1140, y: 250 },
  { tag: 'HYD_05', label: 'H-05', kind: 'Pillar 2 × 65 mm', location: 'Anchor store B01', x: 1520, y: 280 },
  { tag: 'HYD_06', label: 'H-06', kind: 'Pillar 2 × 65 mm', location: 'North-east car park', x: 1900, y: 320 },
  { tag: 'HYD_07', label: 'H-07', kind: 'Pillar 2 × 65 mm', location: 'East gate', x: 2250, y: 600 },
  { tag: 'HYD_08', label: 'H-08', kind: 'Underground 80 mm', location: 'Clinics A03', x: 2080, y: 900 },
  { tag: 'HYD_09', label: 'H-09', kind: 'Pillar 2 × 65 mm', location: 'A02 south plaza', x: 1640, y: 950 },
  { tag: 'HYD_10', label: 'H-10', kind: 'Pillar 2 × 65 mm', location: 'Food court A01', x: 1200, y: 960 },
  { tag: 'HYD_11', label: 'H-11', kind: 'Underground 80 mm', location: 'Loading bays', x: 760, y: 930 },
  { tag: 'HYD_12', label: 'H-12', kind: 'Pillar 2 × 65 mm', location: 'South-west car park', x: 350, y: 900 },
];

/** Standing conditions: H-07 isolated for a gasket repair, H-04 cap tampered, H-02 weak at its last test, H-10 overdue. */
export const HYD_ISOLATED = 'HYD_07';
export const HYD_TAMPER = 'HYD_04';
export const HYD_LOW_FLOW = 'HYD_02';
export const HYD_OVERDUE = 'HYD_10';
/** The hydrant the brigade connects to during the fire drill. */
export const HYD_DRILL = 'HYD_09';

const DAY = 86_400_000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const isoDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Days since each hydrant's last flow test (tests are spread through the year). */
const testAgeDays = (h: Hydrant) => (h.tag === HYD_OVERDUE ? 402 : Math.round(20 + hash01(h.tag + 'test') * 320));

export interface FlowTest {
  date: string;
  flow: number;
  residual: number;
}

/** The last three annual flow tests (newest first). A hydrant's flow drifts down slowly with scaling. */
export function flowTests(h: Hydrant, now: number): FlowTest[] {
  const age = testAgeDays(h);
  const base = h.tag === HYD_LOW_FLOW ? 1720 : h.kind === 'Underground 80 mm' ? 2050 : 2300 + hash01(h.tag + 'q') * 350;
  return [0, 1, 2].map((i) => {
    const flow = base + i * (h.tag === HYD_LOW_FLOW ? 190 : 40 + hash01(h.tag + i) * 40);
    return {
      date: isoDate(startOfDay(now) - (age + i * 365) * DAY),
      flow: Math.round(flow / 10) * 10,
      residual: 5.9 - (flow - 1900) / 900 + hash01(h.tag + 'r' + i) * 0.4,
    };
  });
}

export function hydrantValues(h: Hydrant, now: number, fireActive: boolean): AttrValues {
  const fire = pumpSetStates(now, fireActive).find((s) => s.set.tag === 'BST_FIRE');
  const header = typeof fire?.values.Header_Pressure === 'number' ? fire.values.Header_Pressure : 10.4;
  // Pressure falls off with distance from the fire pump room (west side) and with any flow on the main.
  const loss = 0.25 + (h.x / 2400) * 0.55 + hash01(h.tag + 'z') * 0.2;
  const flowing = fireActive && h.tag === HYD_DRILL;
  const isolated = h.tag === HYD_ISOLATED;
  const pressure = isolated ? wander(h.tag + 'iso', now, 0.3, 0.05, 30) : fireActive ? header - loss - (flowing ? 2.9 : 1.1) : header - loss + wander(h.tag + 'p', now, 0, 0.04, 3);
  const tests = flowTests(h, now);
  const days = 365 - testAgeDays(h);
  const battery = Math.round(clamp(92 - hash01(h.tag + 'b') * 55, 20, 100));
  const uplink = Math.floor(((now / 1000) + hash01(h.tag + 'u') * 900) % 900);

  const v: AttrValues = {
    Static_Pressure: clamp(pressure, 0, 16),
    Pressure_Low_Alarm: pressure < LOW_PRESSURE_BAR,
    Isolation_Valve_Open: !isolated,
    Flowing: flowing,
    Cap_Tamper: h.tag === HYD_TAMPER,
    Leak_Alarm: false,
    Impact_Alarm: false,
    Temperature: wander(h.tag + 't', now, 29, 2.5, 90),
    Battery_Pct: battery,
    Last_Uplink_s: uplink,
    Comm_OK: uplink < 1800,
    LastTest_Date: tests[0].date,
    LastTest_Flow_Lpm: tests[0].flow,
    LastTest_Residual: tests[0].residual,
    Days_To_Test: days,
  };
  const score = readinessScore(v);
  v.Readiness_Score = score;
  v.Readiness = !v.Isolation_Valve_Open || score < 60 ? 2 : score < 90 ? 1 : 0;
  return v;
}

/**
 * The Galaxy script behind Readiness_Score: start at 100 and take off for each finding. An isolated
 * hydrant cannot deliver water, so it is never "ready" whatever else is fine.
 */
export function readinessScore(v: AttrValues): number {
  let s = 100;
  if (!v.Isolation_Valve_Open) s -= 60;
  // Low pressure only counts against readiness when the main is not simply busy feeding a fire.
  if (v.Pressure_Low_Alarm && v.Isolation_Valve_Open && !v.Flowing) s -= 40;
  if (v.Cap_Tamper) s -= 20;
  if (v.Leak_Alarm) s -= 20;
  if (v.Impact_Alarm) s -= 30;
  if (!v.Comm_OK) s -= 25;
  if (typeof v.Days_To_Test === 'number' && v.Days_To_Test < 0) s -= 20;
  if (typeof v.LastTest_Flow_Lpm === 'number' && v.LastTest_Flow_Lpm < REQUIRED_FLOW_LPM) s -= 15;
  if (typeof v.Battery_Pct === 'number' && v.Battery_Pct < 20) s -= 10;
  return clamp(s, 0, 100);
}

/** The findings behind a hydrant's score, in words (most serious first). */
export function hydrantFindings(v: AttrValues): string[] {
  const out: string[] = [];
  if (!v.Isolation_Valve_Open) out.push('Isolation valve closed');
  if (v.Flowing) out.push('In use · flowing');
  if (v.Pressure_Low_Alarm && v.Isolation_Valve_Open && !v.Flowing) out.push('Low pressure');
  if (v.Impact_Alarm) out.push('Impact detected');
  if (v.Cap_Tamper) out.push('Cap tamper');
  if (v.Leak_Alarm) out.push('Leak');
  if (!v.Comm_OK) out.push('Monitor offline');
  if (typeof v.Days_To_Test === 'number' && v.Days_To_Test < 0) out.push(`Flow test ${-v.Days_To_Test} d overdue`);
  if (typeof v.LastTest_Flow_Lpm === 'number' && v.LastTest_Flow_Lpm < REQUIRED_FLOW_LPM) out.push('Low flow at last test');
  if (typeof v.Battery_Pct === 'number' && v.Battery_Pct < 20) out.push('Battery low');
  return out;
}
