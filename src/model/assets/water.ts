import { signal } from '@/sim/catalog';
import { clamp, hash01, wander, type AttrValues, type TemplateDef } from '@/model/assets/galaxy';

/* =================================================================================================
 * Templates
 * ================================================================================================= */

export const TANK_TEMPLATE: TemplateDef = {
  name: '$WaterTank',
  desc: 'Water storage tank',
  io: 'PLC I/O · radar level transmitter (4–20 mA), inlet valve limit switches',
  attrs: [
    { name: 'Level_m', type: 'Float', unit: 'm', desc: 'Water level', decimals: 2 },
    { name: 'Level_Pct', type: 'Float', unit: '%', desc: 'Level against overflow', decimals: 0 },
    { name: 'Volume_m3', type: 'Float', unit: 'm³', desc: 'Stored volume', decimals: 0 },
    { name: 'Inlet_Valve_Open', type: 'Boolean', desc: 'Inlet (filling) valve open' },
    { name: 'Inflow_m3h', type: 'Float', unit: 'm³/h', desc: 'Filling flow', decimals: 1 },
    { name: 'Outflow_m3h', type: 'Float', unit: 'm³/h', desc: 'Draw-off flow', decimals: 1 },
    { name: 'High_Level_Alarm', type: 'Boolean', desc: 'High level switch' },
    { name: 'Low_Level_Alarm', type: 'Boolean', desc: 'Low level switch (pump dry-run protection)' },
  ],
};

export const QUALITY_TEMPLATE: TemplateDef = {
  name: '$WaterQuality',
  desc: 'Multi-parameter water quality analyser',
  io: 'Modbus RTU · analyser controller via OI Server',
  attrs: [
    { name: 'Free_Chlorine', type: 'Float', unit: 'mg/L', desc: 'Free chlorine residual', decimals: 2 },
    { name: 'Turbidity', type: 'Float', unit: 'NTU', desc: 'Turbidity', decimals: 2 },
    { name: 'pH', type: 'Float', desc: 'pH', decimals: 2 },
    { name: 'Conductivity', type: 'Float', unit: 'µS/cm', desc: 'Conductivity', decimals: 0 },
    { name: 'Temperature', type: 'Float', unit: '°C', desc: 'Water temperature', decimals: 1 },
    { name: 'Analyzer_Fault', type: 'Boolean', desc: 'Analyser fault / sample flow lost' },
  ],
};

export const PUMP_SET_TEMPLATE: TemplateDef = {
  name: '$PumpSet',
  desc: 'Pump set controller',
  io: 'Modbus TCP · pump-set controller (e.g. Grundfos CU 352) via OI Server',
  attrs: [
    { name: 'Mode', type: 'Integer', desc: 'Controller mode', states: { 0: 'Off', 1: 'Manual', 2: 'Auto' } },
    { name: 'Header_Pressure', type: 'Float', unit: 'bar', desc: 'Discharge header pressure', decimals: 2 },
    { name: 'Setpoint', type: 'Float', unit: 'bar', desc: 'Pressure set point', decimals: 2 },
    { name: 'Suction_Pressure', type: 'Float', unit: 'bar', desc: 'Suction pressure', decimals: 2 },
    { name: 'Flow_m3h', type: 'Float', unit: 'm³/h', desc: 'Set flow', decimals: 1 },
    { name: 'Pumps_Running', type: 'Integer', desc: 'Pumps in operation' },
    { name: 'Low_Suction_Alarm', type: 'Boolean', desc: 'Dry-run / low suction pressure' },
    { name: 'Alarm_Common', type: 'Boolean', desc: 'Any alarm on the set' },
  ],
};

export const PUMP_TEMPLATE: TemplateDef = {
  name: '$Pump',
  desc: 'Centrifugal pump with VFD or starter',
  io: 'Modbus TCP · VFD, PLC I/O run/trip contacts via OI Server',
  attrs: [
    { name: 'Running', type: 'Boolean', desc: 'Pump running' },
    { name: 'Remote', type: 'Boolean', desc: 'Selector in Auto / remote' },
    { name: 'Trip', type: 'Boolean', desc: 'VFD or overload trip' },
    { name: 'Speed_Pct', type: 'Float', unit: '%', desc: 'Speed reference', decimals: 0 },
    { name: 'Frequency_Hz', type: 'Float', unit: 'Hz', desc: 'Output frequency', decimals: 1 },
    { name: 'Current_A', type: 'Float', unit: 'A', desc: 'Motor current', decimals: 1 },
    { name: 'Power_kW', type: 'Float', unit: 'kW', desc: 'Input power', decimals: 1 },
    { name: 'Run_Hours', type: 'Float', unit: 'h', desc: 'Running hours', decimals: 0 },
    { name: 'Starts_Today', type: 'Integer', desc: 'Starts since midnight' },
  ],
};

export const ZONE_TEMPLATE: TemplateDef = {
  name: '$IrrigationZone',
  desc: 'Irrigation zone valve and soil sensor',
  io: 'Modbus TCP · irrigation controller via OI Server',
  attrs: [
    { name: 'Valve_Open', type: 'Boolean', desc: 'Zone solenoid valve open' },
    { name: 'Flow_m3h', type: 'Float', unit: 'm³/h', desc: 'Zone flow', decimals: 1 },
    { name: 'Soil_Moisture', type: 'Float', unit: '%', desc: 'Volumetric soil moisture', decimals: 0 },
    { name: 'Next_Start', type: 'String', desc: 'Next scheduled start' },
    { name: 'Duration_min', type: 'Integer', desc: 'Programmed run time' },
  ],
};

export const VALVE_CHAMBER_TEMPLATE: TemplateDef = {
  name: '$ValveChamber',
  desc: 'Valve chamber with RTU',
  io: 'Modbus TCP / DNP3 · chamber RTU over fibre via OI Server',
  attrs: [
    { name: 'Valve_Open', type: 'Boolean', desc: 'Open limit switch' },
    { name: 'Valve_Closed', type: 'Boolean', desc: 'Closed limit switch' },
    { name: 'Position_Pct', type: 'Float', unit: '%', desc: 'Actuator position feedback', decimals: 0 },
    { name: 'Actuator_Fault', type: 'Boolean', desc: 'Actuator fault / torque trip' },
    { name: 'Remote', type: 'Boolean', desc: 'Actuator in remote' },
    { name: 'Upstream_Pressure', type: 'Float', unit: 'bar', desc: 'Pressure upstream of the valve', decimals: 2 },
    { name: 'Downstream_Pressure', type: 'Float', unit: 'bar', desc: 'Pressure downstream of the valve', decimals: 2 },
    { name: 'Flow_m3h', type: 'Float', unit: 'm³/h', desc: 'Flow (chambers with a flowmeter)', decimals: 1 },
    { name: 'Flood_Alarm', type: 'Boolean', desc: 'Water in the chamber' },
    { name: 'Door_Open', type: 'Boolean', desc: 'Access cover open (intrusion)' },
    { name: 'RTU_Battery_V', type: 'Float', unit: 'V', desc: 'RTU backup battery', decimals: 1 },
  ],
};

/* =================================================================================================
 * Helpers
 * ================================================================================================= */

const hourOf = (t: number) => {
  const d = new Date(t);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

/** Piecewise-linear daily profile: [hour, value] pairs. */
function daily(t: number, pts: [number, number][]) {
  const h = hourOf(t);
  for (let i = 0; i < pts.length - 1; i++) {
    const [h0, v0] = pts[i];
    const [h1, v1] = pts[i + 1];
    if (h >= h0 && h <= h1) return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0 || 1);
  }
  return pts[pts.length - 1][1];
}

const dayIndex = (t: number) => Math.floor((t - new Date(t).getTimezoneOffset() * 60_000) / 86_400_000);

export const domesticFlow = (t: number) => signal('plumbing.domesticFlow').actual(t);

/* =================================================================================================
 * Tanks and water quality
 * ================================================================================================= */

export const TANKS = [
  { tag: 'TANK_DOM_01', label: 'Domestic water', capacity: 1200, depth: 4, profile: [[0, 70], [6, 86], [10, 84], [14, 76], [18, 72], [22, 66], [24, 70]] as [number, number][] },
  { tag: 'TANK_IRR_01', label: 'Irrigation (TSE)', capacity: 800, depth: 3.5, profile: [[0, 70], [2, 76], [5, 78], [7.7, 62], [9, 62], [15, 80], [18.5, 80], [21.2, 64], [24, 70]] as [number, number][] },
  { tag: 'TANK_FIRE_01', label: 'Fire water reserve', capacity: 900, depth: 4, profile: [[0, 97], [24, 97]] as [number, number][] },
];

export type TankDef = (typeof TANKS)[number];

export function tankValues(tank: TankDef, now: number): AttrValues {
  const pct = clamp(daily(now, tank.profile) + wander(tank.tag, now, 0, 0.8, 20), 0, 100);
  const filling = tank.tag === 'TANK_DOM_01' ? hourOf(now) < 6 || pct < 72 : tank.tag === 'TANK_IRR_01' ? (hourOf(now) >= 9 && hourOf(now) < 15) || hourOf(now) < 5 : pct < 96;
  const outflow = tank.tag === 'TANK_DOM_01' ? domesticFlow(now) : tank.tag === 'TANK_IRR_01' ? irrigationFlow(now) : 0;
  return {
    Level_m: (pct / 100) * tank.depth,
    Level_Pct: pct,
    Volume_m3: (pct / 100) * tank.capacity,
    Inlet_Valve_Open: filling,
    Inflow_m3h: filling ? (tank.tag === 'TANK_FIRE_01' ? 5 : wander(tank.tag + 'in', now, tank.tag === 'TANK_DOM_01' ? 42 : 30, 2, 5)) : 0,
    Outflow_m3h: outflow,
    High_Level_Alarm: pct > 98,
    Low_Level_Alarm: pct < 20,
  };
}

export const QUALITY_TAG = 'WQ_DOM_01';

export function qualityValues(now: number): AttrValues {
  return {
    Free_Chlorine: wander('wq.cl', now, 0.62, 0.12, 40),
    Turbidity: wander('wq.tu', now, 0.32, 0.08, 25),
    pH: wander('wq.ph', now, 7.4, 0.12, 60),
    Conductivity: wander('wq.ec', now, 520, 25, 90),
    Temperature: wander('wq.t', now, 26.4, 0.6, 120),
    Analyzer_Fault: false,
  };
}

/* =================================================================================================
 * Irrigation zones (controller schedule: 20 min per zone at dawn and at dusk)
 * ================================================================================================= */

export const ZONES = [
  'North boulevard lawn',
  'Central plaza palms',
  'Main entrance beds',
  'Food court planters',
  'Rooftop garden A02',
  'West pavilions',
  'East car park verge',
  'South verge',
].map((name, i) => ({ tag: `IRR_Z${i + 1}`, label: `Z${i + 1}`, name }));

const WINDOWS = [5, 18.5];
const ZONE_MIN = 20;

function zoneOpen(i: number, t: number) {
  const h = hourOf(t);
  return WINDOWS.some((w) => h >= w + (i * ZONE_MIN) / 60 && h < w + ((i + 1) * ZONE_MIN) / 60);
}

export function irrigationFlow(t: number) {
  return ZONES.some((_, i) => zoneOpen(i, t)) ? wander('irr.flow', t, 26, 2, 3) : 0;
}

export function zoneValues(i: number, now: number): AttrValues {
  const open = zoneOpen(i, now);
  const h = hourOf(now);
  const starts = WINDOWS.map((w) => w + (i * ZONE_MIN) / 60);
  const next = starts.find((s) => s > h) ?? starts[0];
  const hh = Math.floor(next);
  const mm = Math.round((next - hh) * 60);
  const sinceWatered = Math.min(...starts.map((s) => (h - s + 24) % 24));
  return {
    Valve_Open: open,
    Flow_m3h: open ? irrigationFlow(now) : 0,
    Soil_Moisture: clamp(38 - sinceWatered * 0.9 + wander(`z${i}`, now, 0, 1.2, 30), 14, 45),
    Next_Start: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    Duration_min: ZONE_MIN,
  };
}

/* =================================================================================================
 * Pump sets
 * ================================================================================================= */

export interface PumpDef {
  tag: string;
  label: string;
  kw: number;
}

export interface PumpSet {
  tag: string;
  label: string;
  serves: string;
  pumps: PumpDef[];
  setpoint: number;
  rating: string;
}

const pumpList = (base: string, n: number, kw: number, labels?: string[]): PumpDef[] => Array.from({ length: n }, (_, i) => ({ tag: `${base}_0${i + 1}`, label: labels?.[i] ?? `P${i + 1}`, kw }));

export const PUMP_SETS: PumpSet[] = [
  { tag: 'BST_DOM', label: 'Domestic Booster Set', serves: 'Domestic tank → ring main', pumps: pumpList('PMP_DOM', 3, 15), setpoint: 4.5, rating: '3 × 15 kW VFD · 2 duty + 1 standby' },
  { tag: 'BST_IRR', label: 'Irrigation Pumps', serves: 'TSE tank → zone valves', pumps: pumpList('PMP_IRR', 2, 11), setpoint: 3.5, rating: '2 × 11 kW VFD · duty/standby' },
  { tag: 'BST_TRF', label: 'TSE Transfer Pumps', serves: 'TSE supply → irrigation tank', pumps: pumpList('PMP_TRF', 2, 5.5), setpoint: 2.5, rating: '2 × 5.5 kW DOL · duty/standby' },
  { tag: 'BST_HWC', label: 'Hot-Water Circulation', serves: 'Kitchens & washrooms loop', pumps: pumpList('PMP_HWC', 2, 1.5), setpoint: 2.2, rating: '2 × 1.5 kW · duty/standby' },
  {
    tag: 'BST_FIRE',
    label: 'Fire Pumps',
    serves: 'Fire tank → sprinkler & hydrant main',
    pumps: [
      { tag: 'PMP_FIRE_JP', label: 'Jockey', kw: 7.5 },
      { tag: 'PMP_FIRE_EP', label: 'Electric', kw: 110 },
      { tag: 'PMP_FIRE_DP', label: 'Diesel', kw: 110 },
    ],
    setpoint: 10.4,
    rating: 'Jockey 7.5 kW · electric 110 kW · diesel 110 kW',
  },
];

function pumpRunning(pumpTag: string, speed: number, kw: number, running: boolean, startsToday: number, affinity = true): AttrValues {
  const s = running ? speed : 0;
  const power = running ? (affinity ? kw * Math.pow(s / 100, 3) : kw * 0.88) : 0;
  const amps = (power * 1000) / (Math.sqrt(3) * 400 * 0.86 * 0.9);
  return {
    Running: running,
    Remote: true,
    Trip: false,
    Speed_Pct: s,
    Frequency_Hz: (s / 100) * 50,
    Current_A: running ? Math.max(amps, 1) : 0,
    Power_kW: power,
    Run_Hours: 1200 + hash01(pumpTag) * 9000,
    Starts_Today: startsToday,
  };
}

export interface PumpSetState {
  set: PumpSet;
  values: AttrValues;
  pumps: { def: PumpDef; values: AttrValues }[];
}

export function pumpSetStates(now: number, fireActive: boolean): PumpSetState[] {
  const h = hourOf(now);
  const day = dayIndex(now);
  const dom = domesticFlow(now);
  const irr = irrigationFlow(now);
  const domTank = tankValues(TANKS[0], now);
  const irrTank = tankValues(TANKS[1], now);

  return PUMP_SETS.map((set) => {
    let flow = 0;
    let running: boolean[] = set.pumps.map(() => false);
    let speed = 0;
    let affinity = true;
    let header = set.setpoint + wander(set.tag + 'p', now, 0, 0.04, 2);
    let suction = 0.3;
    let starts = 0;

    if (set.tag === 'BST_DOM') {
      flow = dom;
      const count = flow < 25 ? 1 : 2;
      const lead = day % 3;
      running = set.pumps.map((_, i) => (i - lead + 3) % 3 < count);
      speed = 45 + 50 * Math.min(1, flow / count / 30);
      suction = 0.1 + (domTank.Level_m as number) * 0.098;
      starts = 6 + Math.floor(h / 3);
    } else if (set.tag === 'BST_IRR') {
      flow = irr;
      running = set.pumps.map((_, i) => irr > 0 && i === day % 2);
      speed = 78;
      suction = 0.1 + (irrTank.Level_m as number) * 0.098;
      header = irr > 0 ? header : 0.35;
      starts = h > 18.5 ? 2 : h > 5 ? 1 : 0;
    } else if (set.tag === 'BST_TRF') {
      const on = (h >= 9 && h < 15) || h < 5;
      flow = on ? wander('trf.q', now, 30, 1.5, 4) : 0;
      running = set.pumps.map((_, i) => on && i === day % 2);
      speed = 100;
      affinity = false;
      header = on ? header : 0.2;
      starts = h > 9 ? 2 : 1;
    } else if (set.tag === 'BST_HWC') {
      const on = h >= 6;
      flow = on ? wander('hwc.q', now, 6.5, 0.3, 6) : 0;
      running = set.pumps.map((_, i) => on && i === Math.floor(day / 7) % 2);
      speed = 100;
      affinity = false;
      header = on ? header : 0.8;
      starts = h >= 6 ? 1 : 0;
    } else if (set.tag === 'BST_FIRE') {
      // The jockey pump tops the main up for ~45 s every 20 min; a fire starts the electric pump.
      const jockey = !fireActive && ((now / 1000 + hash01('jockey') * 1200) % 1200) < 45;
      running = [jockey, fireActive, false];
      flow = fireActive ? wander('fire.q', now, 150, 6, 1) : jockey ? 3 : 0;
      speed = 100;
      affinity = false;
      header = fireActive ? wander('fire.p', now, 11.6, 0.15, 1) : jockey ? 10.1 : 10.4 + wander('fire.p0', now, 0, 0.08, 5);
      suction = 0.35;
      starts = Math.floor(h * 3);
    }

    const pumps = set.pumps.map((def, i) => ({
      def,
      values: pumpRunning(def.tag, speed, def.kw, running[i], set.tag === 'BST_FIRE' ? (i === 0 ? starts : fireActive && i === 1 ? 1 : 0) : running[i] ? starts : Math.max(0, starts - 2), affinity),
    }));
    const values: AttrValues = {
      Mode: 2,
      Header_Pressure: header,
      Setpoint: set.setpoint,
      Suction_Pressure: suction,
      Flow_m3h: flow,
      Pumps_Running: running.filter(Boolean).length,
      Low_Suction_Alarm: false,
      Alarm_Common: false,
    };
    return { set, values, pumps };
  });
}

/* =================================================================================================
 * Valve chambers
 * ================================================================================================= */

export interface ValveChamber {
  tag: string;
  label: string;
  kind: 'Meter' | 'PRV' | 'Isolation' | 'Washout' | 'Air release';
  location: string;
  /** Position on the site map (map coordinates, 2400 × 1191). */
  x: number;
  y: number;
  normallyOpen: boolean;
  flowmeter: boolean;
}

export const VALVE_CHAMBERS: ValveChamber[] = [
  { tag: 'VC_01', label: 'VC-01', kind: 'Meter', location: 'Utility inlet · west gate', x: 200, y: 930, normallyOpen: true, flowmeter: true },
  { tag: 'VC_02', label: 'VC-02', kind: 'PRV', location: 'Ring main PRV', x: 470, y: 870, normallyOpen: true, flowmeter: true },
  { tag: 'VC_03', label: 'VC-03', kind: 'Isolation', location: 'West ring', x: 780, y: 820, normallyOpen: true, flowmeter: false },
  { tag: 'VC_04', label: 'VC-04', kind: 'Isolation', location: 'Central ring', x: 1180, y: 840, normallyOpen: true, flowmeter: true },
  { tag: 'VC_05', label: 'VC-05', kind: 'Isolation', location: 'East ring', x: 1660, y: 830, normallyOpen: true, flowmeter: false },
  { tag: 'VC_06', label: 'VC-06', kind: 'Washout', location: 'East low point', x: 2120, y: 870, normallyOpen: false, flowmeter: false },
  { tag: 'VC_07', label: 'VC-07', kind: 'Isolation', location: 'Irrigation branch', x: 1420, y: 330, normallyOpen: true, flowmeter: true },
  { tag: 'VC_08', label: 'VC-08', kind: 'Air release', location: 'North high point', x: 900, y: 320, normallyOpen: true, flowmeter: false },
];

/** VC-05 is shut for a planned repair on the east ring; VC-07 has water in the chamber. */
export const VC_MAINTENANCE = 'VC_05';
export const VC_FLOODED = 'VC_07';

export function valveChamberValues(vc: ValveChamber, now: number): AttrValues {
  const open = vc.tag === VC_MAINTENANCE ? false : vc.normallyOpen;
  const ringP = 4.25 - (vc.x / 2400) * 0.25;
  const up = vc.kind === 'Meter' ? wander(vc.tag + 'u', now, 5.9, 0.08, 4) : vc.kind === 'PRV' ? wander(vc.tag + 'u', now, 6.1, 0.1, 4) : wander(vc.tag + 'u', now, ringP, 0.05, 4);
  const down = !open ? (vc.kind === 'Washout' ? 0 : wander(vc.tag + 'd', now, 0.4, 0.05, 20)) : vc.kind === 'PRV' ? wander(vc.tag + 'd', now, 4.2, 0.03, 3) : up - 0.04;
  const flow = !vc.flowmeter || !open ? (vc.flowmeter ? 0 : null) : vc.tag === 'VC_07' ? irrigationFlow(now) : vc.tag === 'VC_04' ? domesticFlow(now) * 0.55 : domesticFlow(now) + (vc.tag === 'VC_01' ? 12 : 0);
  return {
    Valve_Open: open,
    Valve_Closed: !open,
    Position_Pct: open ? 100 : 0,
    Actuator_Fault: false,
    Remote: vc.tag !== VC_MAINTENANCE,
    Upstream_Pressure: up,
    Downstream_Pressure: down,
    Flow_m3h: flow,
    Flood_Alarm: vc.tag === VC_FLOODED,
    Door_Open: false,
    RTU_Battery_V: wander(vc.tag + 'b', now, 13.1, 0.15, 60),
  };
}
