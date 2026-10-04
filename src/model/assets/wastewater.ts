import { derivedSignal } from '@/sim/catalog';
import { clamp, hash01, wander, type AttrValues, type TemplateDef } from '@/model/assets/galaxy';

/* =================================================================================================
 * Templates
 * ================================================================================================= */

export const LIFT_STATION_TEMPLATE: TemplateDef = {
  name: '$LiftStation',
  desc: 'Sewage lift station: wet well, level control and rising main',
  io: 'Modbus TCP · pump controller / PLC I/O (4–20 mA level, float switches) via OI Server',
  attrs: [
    { name: 'Mode', type: 'Integer', desc: 'Station mode', states: { 0: 'Off', 1: 'Hand', 2: 'Auto' } },
    { name: 'Level_m', type: 'Float', unit: 'm', desc: 'Wet well level (hydrostatic transmitter)', decimals: 2 },
    { name: 'Level_Pct', type: 'Float', unit: '%', desc: 'Wet well level against depth', decimals: 0 },
    { name: 'Duty_Pump', type: 'Integer', desc: 'Lead pump this cycle (alternates)' },
    { name: 'Inflow_m3h', type: 'Float', unit: 'm³/h', desc: 'Estimated inflow (level rate of rise)', decimals: 1 },
    { name: 'Outflow_m3h', type: 'Float', unit: 'm³/h', desc: 'Rising main flow (magnetic flowmeter)', decimals: 1 },
    { name: 'Pumped_Today_m3', type: 'Float', unit: 'm³', desc: 'Volume pumped since midnight', decimals: 0 },
    { name: 'Float_Low', type: 'Boolean', desc: 'Dry-run protection float' },
    { name: 'Float_High', type: 'Boolean', desc: 'High level float (assist pump)' },
    { name: 'Float_High_High', type: 'Boolean', desc: 'Overflow float' },
    { name: 'Overflow_Alarm', type: 'Boolean', desc: 'Overflow alarm latched' },
    { name: 'Power_Fail', type: 'Boolean', desc: 'Control panel supply lost' },
  ],
};

export const SUB_PUMP_TEMPLATE: TemplateDef = {
  name: '$SubmersiblePump',
  desc: 'Submersible sewage pump with motor protection',
  io: 'PLC I/O · run/trip contacts, CT, seal-leak and thermal relays via OI Server',
  attrs: [
    { name: 'Running', type: 'Boolean', desc: 'Pump running' },
    { name: 'Auto', type: 'Boolean', desc: 'Selector in Auto' },
    { name: 'Trip', type: 'Boolean', desc: 'Motor protection trip' },
    { name: 'Current_A', type: 'Float', unit: 'A', desc: 'Motor current', decimals: 1 },
    { name: 'Power_kW', type: 'Float', unit: 'kW', desc: 'Motor power', decimals: 1 },
    { name: 'Run_Hours', type: 'Float', unit: 'h', desc: 'Running hours', decimals: 0 },
    { name: 'Starts_Today', type: 'Integer', desc: 'Starts since midnight' },
    { name: 'Seal_Leak', type: 'Boolean', desc: 'Moisture in the seal chamber' },
    { name: 'Motor_Overtemp', type: 'Boolean', desc: 'Winding thermal switch open' },
  ],
};

export const OCU_TEMPLATE: TemplateDef = {
  name: '$OdorControlUnit',
  desc: 'Bio-trickling filter with activated-carbon polishing stage',
  io: 'Modbus TCP · odor-control unit PLC via OI Server',
  attrs: [
    { name: 'Fan_Running', type: 'Boolean', desc: 'Extract fan running' },
    { name: 'Fan_Speed_Pct', type: 'Float', unit: '%', desc: 'Fan VFD speed', decimals: 0 },
    { name: 'Airflow_m3h', type: 'Float', unit: 'm³/h', desc: 'Treated air flow', decimals: 0 },
    { name: 'H2S_Inlet_ppm', type: 'Float', unit: 'ppm', desc: 'H₂S before treatment', decimals: 1 },
    { name: 'H2S_Outlet_ppm', type: 'Float', unit: 'ppm', desc: 'H₂S at the stack', decimals: 2 },
    { name: 'Removal_Efficiency', type: 'Float', unit: '%', desc: '(inlet − outlet) / inlet', decimals: 1 },
    { name: 'Media_DP_Pa', type: 'Float', unit: 'Pa', desc: 'Pressure drop across the bio-media', decimals: 0 },
    { name: 'Carbon_DP_Pa', type: 'Float', unit: 'Pa', desc: 'Pressure drop across the carbon bed', decimals: 0 },
    { name: 'Irrigation_Running', type: 'Boolean', desc: 'Bio-media irrigation pump running' },
    { name: 'Recirc_pH', type: 'Float', unit: 'pH', desc: 'Recirculation water pH', decimals: 1 },
    { name: 'Carbon_Days', type: 'Integer', desc: 'Days since carbon change' },
    { name: 'Alarm_Common', type: 'Boolean', desc: 'Any alarm active' },
  ],
};

export const H2S_SENSOR_TEMPLATE: TemplateDef = {
  name: '$GasDetector',
  desc: 'Electrochemical H₂S detector',
  io: 'Modbus RTU · gas detection controller via OI Server',
  attrs: [
    { name: 'H2S_ppm', type: 'Float', unit: 'ppm', desc: 'Ambient H₂S', decimals: 1 },
    { name: 'Alarm_Low', type: 'Boolean', desc: 'Above 5 ppm (TWA)' },
    { name: 'Alarm_High', type: 'Boolean', desc: 'Above 10 ppm (STEL)' },
    { name: 'Sensor_Fault', type: 'Boolean', desc: 'Detector fault' },
  ],
};

/* =================================================================================================
 * Lift stations
 * ================================================================================================= */

export interface LiftStation {
  tag: string;
  label: string;
  serves: string;
  pumps: { tag: string; label: string; kw: number }[];
  /** Wet well plan area (m²), depth (m), start / stop / high-high levels (m). */
  area: number;
  depth: number;
  start: number;
  stop: number;
  hh: number;
  /** Pump capacity (m³/h) and the inflow range across the day. */
  pumpQ: number;
  inflow: [number, number];
}

const pumps = (st: string, n: number, kw: number) => Array.from({ length: n }, (_, i) => ({ tag: `${st}_P${i + 1}`, label: `P${i + 1}`, kw }));

export const LIFT_STATIONS: LiftStation[] = [
  { tag: 'LS_01', label: 'LS-01', serves: 'Food court line', pumps: pumps('LS_01', 2, 11), area: 6, depth: 3.2, start: 1.9, stop: 0.6, hh: 2.7, pumpQ: 60, inflow: [4, 26] },
  { tag: 'LS_02', label: 'LS-02', serves: 'Car park sump', pumps: pumps('LS_02', 2, 4), area: 4, depth: 2.5, start: 1.4, stop: 0.5, hh: 2.1, pumpQ: 30, inflow: [1.5, 5] },
  { tag: 'LS_03', label: 'LS-03', serves: 'Anchor & cinema', pumps: pumps('LS_03', 2, 7.5), area: 5, depth: 3, start: 1.7, stop: 0.55, hh: 2.5, pumpQ: 45, inflow: [3, 18] },
  { tag: 'LS_04', label: 'LS-04', serves: 'Main · to sewer', pumps: pumps('LS_04', 3, 22), area: 14, depth: 4.2, start: 2.4, stop: 0.8, hh: 3.5, pumpQ: 150, inflow: [18, 85] },
];

function inflowOf(st: LiftStation, t: number) {
  return derivedSignal(`${st.tag}.inflow`, { unit: 'm³/h', low: st.inflow[0], high: st.inflow[1], profile: 'retail', noise: 0.12, decimals: 1 }).actual(t);
}

/** The wet-well sawtooth: fill from stop to start level, pump down, repeat. Deterministic in time. */
function wellAt(st: LiftStation, t: number) {
  const qin = Math.max(0.3, inflowOf(st, t));
  const band = st.start - st.stop;
  const fill = (st.area * band) / qin; // hours
  const drain = (st.area * band) / Math.max(1, st.pumpQ - qin);
  const period = (fill + drain) * 3_600_000;
  const offset = hash01(st.tag) * period;
  const cycle = Math.floor((t + offset) / period);
  const phase = ((t + offset) % period) / period;
  const fillShare = fill / (fill + drain);
  const pumping = phase >= fillShare;
  const level = pumping ? st.start - band * ((phase - fillShare) / (1 - fillShare)) : st.stop + band * (phase / fillShare);
  return { level, pumping, qin, cycle, cyclesPerHour: 3_600_000 / period };
}

/** Seal-leak warning on LS-02 P2: a maintenance item that shows how a real alarm reads. */
const SEAL_LEAK = 'LS_02_P2';

/** A station, its pumps, and the last hour of wet-well level (m, one point a minute). */
export function liftStationState(st: LiftStation, now: number): { station: AttrValues; pumps: AttrValues[]; history: number[] } {
  const w = wellAt(st, now);
  const duty = st.pumps.length ? (w.cycle % st.pumps.length) + 1 : 1;
  const midnight = new Date(now).setHours(0, 0, 0, 0);
  const hoursToday = (now - midnight) / 3_600_000;
  const pumped = inflowOf(st, now) * 0.6 * hoursToday + st.inflow[0] * hoursToday * 0.4;
  const station: AttrValues = {
    Mode: 2,
    Level_m: w.level,
    Level_Pct: (w.level / st.depth) * 100,
    Duty_Pump: duty,
    Inflow_m3h: w.qin,
    Outflow_m3h: w.pumping ? st.pumpQ * (0.96 + hash01(st.tag + 'q') * 0.06) : 0,
    Pumped_Today_m3: pumped,
    Float_Low: w.level > st.stop * 0.7,
    Float_High: w.level > st.start + 0.2,
    Float_High_High: w.level > st.hh,
    Overflow_Alarm: false,
    Power_Fail: false,
  };
  const pumpValues = st.pumps.map((p, i) => {
    const running = w.pumping && duty === i + 1;
    const amps = (p.kw * 1000) / (Math.sqrt(3) * 400 * 0.84 * 0.88);
    return {
      Running: running,
      Auto: true,
      Trip: false,
      Current_A: running ? wander(p.tag + 'a', now, amps, amps * 0.04, 0.5) : 0,
      Power_kW: running ? p.kw * 0.86 : 0,
      Run_Hours: 1800 + hash01(p.tag) * 2400,
      Starts_Today: Math.round((w.cyclesPerHour * hoursToday) / st.pumps.length),
      Seal_Leak: p.tag === SEAL_LEAK,
      Motor_Overtemp: false,
    } satisfies AttrValues;
  });
  const history = Array.from({ length: 61 }, (_, k) => wellAt(st, now - (60 - k) * 60_000).level);
  return { station, pumps: pumpValues, history };
}

/* =================================================================================================
 * Odor control
 * ================================================================================================= */

export interface OdorUnit {
  tag: string;
  label: string;
  serves: string;
  airflow: number;
  inlet: [number, number];
  efficiency: number;
  carbonDays: number;
}

export const ODOR_UNITS: OdorUnit[] = [
  { tag: 'OCU_01', label: 'OCU-01', serves: 'LS-01 · food court', airflow: 1800, inlet: [6, 34], efficiency: 98.6, carbonDays: 64 },
  { tag: 'OCU_02', label: 'OCU-02', serves: 'LS-04 · main lift station', airflow: 3200, inlet: [9, 42], efficiency: 99.1, carbonDays: 21 },
  { tag: 'OCU_03', label: 'OCU-03', serves: 'Grease trap room', airflow: 1200, inlet: [4, 22], efficiency: 96.4, carbonDays: 118 },
];

export function inletH2S(u: OdorUnit) {
  return derivedSignal(`${u.tag}.h2s.in`, { unit: 'ppm', low: u.inlet[0], high: u.inlet[1], profile: 'retail', noise: 0.18, decimals: 1 });
}

export function odorUnitValues(u: OdorUnit, now: number): AttrValues {
  const inlet = Math.max(0.2, inletH2S(u).actual(now));
  const eff = clamp(wander(u.tag + 'eff', now, u.efficiency, 0.3, 30), 90, 99.9);
  const outlet = inlet * (1 - eff / 100);
  const carbonDp = 280 + u.carbonDays * 3.1 + wander(u.tag + 'cdp', now, 0, 6, 20);
  const irrigation = (Math.floor(now / 60_000) + Math.floor(hash01(u.tag) * 10)) % 10 < 3;
  return {
    Fan_Running: true,
    Fan_Speed_Pct: wander(u.tag + 'fan', now, 78, 2, 10),
    Airflow_m3h: wander(u.tag + 'air', now, u.airflow, u.airflow * 0.02, 10),
    H2S_Inlet_ppm: inlet,
    H2S_Outlet_ppm: outlet,
    Removal_Efficiency: eff,
    Media_DP_Pa: wander(u.tag + 'mdp', now, 410, 12, 25),
    Carbon_DP_Pa: carbonDp,
    Irrigation_Running: irrigation,
    Recirc_pH: wander(u.tag + 'ph', now, 6.8, 0.15, 60),
    Carbon_Days: u.carbonDays,
    Alarm_Common: carbonDp > 600,
  };
}

export const CARBON_DP_LIMIT = 600;

export const GAS_DETECTORS = [
  { tag: 'GD_H2S_01', label: 'Loading dock', base: 0.4 },
  { tag: 'GD_H2S_02', label: 'Basement B2 · LS-02', base: 1.1 },
  { tag: 'GD_H2S_03', label: 'Grease trap room', base: 2.3 },
  { tag: 'GD_H2S_04', label: 'LS-04 kiosk', base: 1.6 },
  { tag: 'GD_H2S_05', label: 'Food court service yard', base: 0.7 },
];

export function gasDetectorValues(d: (typeof GAS_DETECTORS)[number], now: number): AttrValues {
  const ppm = Math.max(0, wander(d.tag, now, d.base, d.base * 0.5, 9));
  return { H2S_ppm: ppm, Alarm_Low: ppm > 5, Alarm_High: ppm > 10, Sensor_Fault: false };
}
