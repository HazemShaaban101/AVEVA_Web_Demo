import type { MainsState } from '@/sim/scenario';
import { derivedSignal, signal } from '@/sim/catalog';
import { clamp, hash01, wander, type AttrValues, type TemplateDef } from '@/model/assets/galaxy';

/* =================================================================================================
 * Templates (as they would be derived in the Galaxy)
 * ================================================================================================= */

export const GENSET_TEMPLATE: TemplateDef = {
  name: '$Genset',
  desc: 'Standby diesel generator set',
  io: 'Modbus TCP · genset controller (e.g. DSE 8610 / ComAp) via OI Server',
  attrs: [
    { name: 'Status_Running', type: 'Boolean', desc: 'Engine running' },
    { name: 'Status_Available', type: 'Boolean', desc: 'In Auto with no shutdown alarm: will start on mains failure' },
    { name: 'Mode', type: 'Integer', desc: 'Controller mode', states: { 0: 'Off', 1: 'Manual', 2: 'Auto' } },
    { name: 'GCB_Closed', type: 'Boolean', desc: 'Generator circuit breaker closed (on load)' },
    { name: 'Output_kW', type: 'Float', unit: 'kW', desc: 'Active power', decimals: 0 },
    { name: 'Output_kVA', type: 'Float', unit: 'kVA', desc: 'Apparent power', decimals: 0 },
    { name: 'Load_Pct', type: 'Float', unit: '%', desc: 'Load against rating', decimals: 0 },
    { name: 'Voltage_LL', type: 'Float', unit: 'V', desc: 'Line-to-line voltage (average)', decimals: 0 },
    { name: 'Current_Avg', type: 'Float', unit: 'A', desc: 'Phase current (average)', decimals: 0 },
    { name: 'Frequency', type: 'Float', unit: 'Hz', desc: 'Output frequency', decimals: 2 },
    { name: 'Power_Factor', type: 'Float', desc: 'Power factor', decimals: 2 },
    { name: 'Engine_Speed', type: 'Float', unit: 'rpm', desc: 'Engine speed', decimals: 0 },
    { name: 'Oil_Pressure', type: 'Float', unit: 'bar', desc: 'Lube oil pressure', decimals: 1 },
    { name: 'Coolant_Temp', type: 'Float', unit: '°C', desc: 'Jacket water temperature', decimals: 0 },
    { name: 'Battery_Voltage', type: 'Float', unit: 'V', desc: 'Starter battery voltage', decimals: 1 },
    { name: 'Fuel_Level', type: 'Float', unit: '%', desc: 'Day tank level', decimals: 0 },
    { name: 'Run_Hours', type: 'Float', unit: 'h', desc: 'Engine hours', decimals: 1 },
    { name: 'Start_Count', type: 'Integer', desc: 'Number of starts' },
    { name: 'Fuel_Low', type: 'Boolean', desc: 'Day tank below 40% (warning)' },
    { name: 'Alarm_Common', type: 'Boolean', desc: 'Any warning or alarm active' },
    { name: 'Shutdown', type: 'Boolean', desc: 'Shutdown alarm latched' },
  ],
};

export const FUEL_TANK_TEMPLATE: TemplateDef = {
  name: '$FuelTank',
  desc: 'Bulk diesel storage feeding the day tanks',
  io: 'PLC I/O · 4–20 mA level transmitter, leak and pump contacts',
  attrs: [
    { name: 'Level_Pct', type: 'Float', unit: '%', desc: 'Tank level', decimals: 0 },
    { name: 'Volume_L', type: 'Float', unit: 'L', desc: 'Fuel volume', decimals: 0 },
    { name: 'Transfer_Pump_Running', type: 'Boolean', desc: 'Transfer pump to the day tanks running' },
    { name: 'Leak_Alarm', type: 'Boolean', desc: 'Bund leak detector' },
  ],
};

export const UPS_TEMPLATE: TemplateDef = {
  name: '$UPS',
  desc: 'Online double-conversion UPS',
  io: 'SNMP · UPS-MIB (RFC 1628) via OI Server',
  attrs: [
    { name: 'Output_Source', type: 'Integer', desc: 'upsOutputSource', states: { 3: 'Normal', 4: 'Bypass', 5: 'Battery' } },
    { name: 'Input_Voltage', type: 'Float', unit: 'V', desc: 'upsInputVoltage (L-N)', decimals: 0 },
    { name: 'Input_Frequency', type: 'Float', unit: 'Hz', desc: 'upsInputFrequency', decimals: 1 },
    { name: 'Output_Voltage', type: 'Float', unit: 'V', desc: 'upsOutputVoltage (L-N)', decimals: 0 },
    { name: 'Output_Frequency', type: 'Float', unit: 'Hz', desc: 'upsOutputFrequency', decimals: 1 },
    { name: 'Output_Load_Pct', type: 'Float', unit: '%', desc: 'upsOutputPercentLoad (worst phase)', decimals: 0 },
    { name: 'Output_kW', type: 'Float', unit: 'kW', desc: 'upsOutputPower (sum of phases)', decimals: 1 },
    { name: 'Battery_Status', type: 'Integer', desc: 'upsBatteryStatus', states: { 1: 'Unknown', 2: 'Normal', 3: 'Low', 4: 'Depleted' } },
    { name: 'Battery_Charge_Pct', type: 'Float', unit: '%', desc: 'upsEstimatedChargeRemaining', decimals: 0 },
    { name: 'Runtime_Min', type: 'Float', unit: 'min', desc: 'upsEstimatedMinutesRemaining', decimals: 0 },
    { name: 'Battery_Voltage', type: 'Float', unit: 'V', desc: 'upsBatteryVoltage (DC)', decimals: 0 },
    { name: 'Battery_Current', type: 'Float', unit: 'A', desc: 'upsBatteryCurrent (− = discharging)', decimals: 1 },
    { name: 'Battery_Temp', type: 'Float', unit: '°C', desc: 'upsBatteryTemperature', decimals: 1 },
    { name: 'Seconds_On_Battery', type: 'Integer', desc: 'upsSecondsOnBattery' },
    { name: 'Alarms_Present', type: 'Integer', desc: 'upsAlarmsPresent' },
    { name: 'Last_Self_Test', type: 'String', desc: 'Last battery self-test (upsTestResultsSummary)' },
  ],
};

export const BREAKER_TEMPLATE: TemplateDef = {
  name: '$CircuitBreaker',
  desc: 'MV/LV circuit breaker with protection relay',
  io: 'IEC 61850 / Modbus TCP · protection relay or trip unit via OI Server',
  attrs: [
    { name: 'Closed', type: 'Boolean', desc: 'Breaker closed (auxiliary contact)' },
    { name: 'Tripped', type: 'Boolean', desc: 'Protection trip latched' },
    { name: 'Racked_In', type: 'Boolean', desc: 'Withdrawable breaker in service position' },
    { name: 'Remote', type: 'Boolean', desc: 'Local/remote switch in remote' },
    { name: 'Voltage_LL', type: 'Float', unit: 'V', desc: 'Line-to-line voltage', decimals: 0 },
    { name: 'Current_Avg', type: 'Float', unit: 'A', desc: 'Phase current (average)', decimals: 0 },
    { name: 'Active_Power', type: 'Float', unit: 'kW', desc: 'Active power through the breaker', decimals: 0 },
    { name: 'Power_Factor', type: 'Float', desc: 'Power factor', decimals: 2 },
    { name: 'Trip_Count', type: 'Integer', desc: 'Protection operations' },
  ],
};

export const TRANSFORMER_TEMPLATE: TemplateDef = {
  name: '$Transformer',
  desc: 'Cast-resin transformer 22/0.4 kV',
  io: 'PLC I/O · PT100 winding sensors via temperature relay, fan contacts',
  attrs: [
    { name: 'Load_Pct', type: 'Float', unit: '%', desc: 'Load against rating', decimals: 0 },
    { name: 'Active_Power', type: 'Float', unit: 'kW', desc: 'LV side active power', decimals: 0 },
    { name: 'Winding_Temp', type: 'Float', unit: '°C', desc: 'Hottest winding (PT100)', decimals: 0 },
    { name: 'Fans_Running', type: 'Boolean', desc: 'Cooling fans running' },
    { name: 'Temp_Alarm', type: 'Boolean', desc: 'Winding temperature alarm (130 °C)' },
    { name: 'Temp_Trip', type: 'Boolean', desc: 'Winding temperature trip (150 °C)' },
  ],
};

export const ATS_TEMPLATE: TemplateDef = {
  name: '$ATS',
  desc: 'Automatic transfer switch, essential board',
  io: 'Modbus RTU · ATS controller via OI Server',
  attrs: [
    { name: 'Position', type: 'Integer', desc: 'Switch position', states: { 0: 'Normal', 1: 'Emergency', 2: 'Off' } },
    { name: 'Normal_Available', type: 'Boolean', desc: 'Mains side voltage healthy' },
    { name: 'Emergency_Available', type: 'Boolean', desc: 'Generator side voltage healthy' },
    { name: 'Transfer_Count', type: 'Integer', desc: 'Transfers since commissioning' },
  ],
};

/* =================================================================================================
 * The mains-failure sequence (seconds since the utility went down)
 * ================================================================================================= */

const CRANK_S = 3;
const UP_TO_SPEED_S = 7;
/** Generators synchronised and on load; the ATS moves the essential board to them. */
export const ON_LOAD_S = 10;
const COOL_DOWN_S = 60;

export type GenPhase = 'standby' | 'cranking' | 'running' | 'onLoad' | 'coolDown';

export function gensetPhase(mains: MainsState, now: number): { phase: GenPhase; since: number } {
  if (mains.failed && mains.failedAt) {
    const t = (now - mains.failedAt) / 1000;
    if (t < CRANK_S) return { phase: 'cranking', since: t };
    if (t < ON_LOAD_S) return { phase: 'running', since: t };
    return { phase: 'onLoad', since: t };
  }
  if (mains.restoredAt && now - mains.restoredAt < COOL_DOWN_S * 1000) return { phase: 'coolDown', since: (now - mains.restoredAt) / 1000 };
  return { phase: 'standby', since: 0 };
}

/** Load on the essential board (fire pumps, smoke extract, lifts, emergency lighting, UPS input). */
export function essentialLoadKw(now: number) {
  return derivedSignal('emdb.load', { unit: 'kW', low: 1350, high: 2250, profile: 'retail', noise: 0.05, decimals: 0 }).actual(now);
}

/** Site demand from the utility (kW), shared by the four transformers. */
export function siteDemandKw(now: number) {
  return signal('electric.demand').actual(now) * 1000;
}

/* =================================================================================================
 * Generators
 * ================================================================================================= */

export interface Genset {
  tag: string;
  label: string;
  ratedKva: number;
  ratedKw: number;
}

export const GENSETS: Genset[] = [1, 2, 3, 4].map((n) => ({ tag: `GEN_00${n}`, label: `G${n}`, ratedKva: 1500, ratedKw: 1200 }));

/** Fuel left in each day tank before this session (G4 is waiting for a refill). */
const FUEL_BASE = [91, 86, 88, 38];
const RUN_HOURS = [412.6, 398.2, 405.9, 377.4];
const STARTS = [186, 181, 184, 172];

export function gensetValues(g: Genset, index: number, mains: MainsState, now: number): AttrValues {
  const { phase, since } = gensetPhase(mains, now);
  const running = phase !== 'standby';
  const onLoad = phase === 'onLoad';
  const share = onLoad ? (essentialLoadKw(now) / GENSETS.length) * (1 + (hash01(g.tag) - 0.5) * 0.06) : 0;
  const pf = onLoad ? 0.86 + hash01(g.tag + 'pf') * 0.04 : 0;
  const upFrac = phase === 'cranking' ? since / CRANK_S : 1;
  const speed = !running ? 0 : phase === 'cranking' ? 250 + upFrac * 900 : wander(g.tag + 'rpm', now, 1500, 3, 0.5);
  const voltage = !running || phase === 'cranking' ? 0 : phase === 'running' && since < UP_TO_SPEED_S ? 400 * ((since - CRANK_S) / (UP_TO_SPEED_S - CRANK_S)) : wander(g.tag + 'v', now, 401, 2.5, 0.8);
  const hz = voltage > 0 ? wander(g.tag + 'hz', now, 50, 0.04, 0.5) : 0;
  const runSeconds = mains.failedAt ? Math.max(0, ((mains.restoredAt && !mains.failed ? mains.restoredAt + COOL_DOWN_S * 1000 : now) - mains.failedAt) / 1000) : 0;
  const litresPerHourAtLoad = 30 + 280 * (share / g.ratedKw);
  const fuel = clamp(FUEL_BASE[index] - ((runSeconds * litresPerHourAtLoad) / 3600 / 2000) * 100, 0, 100);
  const coolant = running ? 40 + (82 - 40) * (1 - Math.exp(-runSeconds / 180)) : wander(g.tag + 'jw', now, 41, 0.6, 20);
  const battery = phase === 'cranking' ? 19.6 + upFrac * 2 : running ? wander(g.tag + 'bv', now, 28.1, 0.1, 2) : wander(g.tag + 'bv', now, 27.2, 0.05, 30);
  const kva = pf ? share / pf : 0;
  const fuelLow = fuel < 40;
  return {
    Status_Running: running,
    Status_Available: !fuelLow || fuel > 15,
    Mode: 2,
    GCB_Closed: onLoad,
    Output_kW: share,
    Output_kVA: kva,
    Load_Pct: (share / g.ratedKw) * 100,
    Voltage_LL: voltage,
    Current_Avg: voltage > 0 && kva ? (kva * 1000) / (Math.sqrt(3) * voltage) : 0,
    Frequency: hz,
    Power_Factor: pf,
    Engine_Speed: speed,
    Oil_Pressure: running && phase !== 'cranking' ? wander(g.tag + 'oil', now, 4.5, 0.15, 2) : phase === 'cranking' ? 1.2 * upFrac : 0,
    Coolant_Temp: coolant,
    Battery_Voltage: battery,
    Fuel_Level: fuel,
    Run_Hours: RUN_HOURS[index] + runSeconds / 3600,
    Start_Count: STARTS[index] + (mains.failedAt ? 1 : 0),
    Fuel_Low: fuelLow,
    Alarm_Common: fuelLow,
    Shutdown: false,
  };
}

export const BULK_TANK = { tag: 'FUEL_TANK_01', capacityL: 20_000 };

export function bulkTankValues(now: number, gensRunning: boolean): AttrValues {
  const level = wander('bulk.level', now, 72, 0.4, 240);
  return {
    Level_Pct: level,
    Volume_L: (level / 100) * BULK_TANK.capacityL,
    Transfer_Pump_Running: gensRunning,
    Leak_Alarm: false,
  };
}

/* =================================================================================================
 * UPS
 * ================================================================================================= */

export interface UpsUnit {
  tag: string;
  label: string;
  serves: string;
  kva: number;
  /** Typical load (%), and the autonomy (min) its batteries give at that load. */
  load: number;
  autonomy: number;
  batteryV: number;
}

export const UPS_UNITS: UpsUnit[] = [
  { tag: 'UPS_001', label: 'UPS-01', serves: 'Data centre · A side', kva: 200, load: 52, autonomy: 16, batteryV: 540 },
  { tag: 'UPS_002', label: 'UPS-02', serves: 'Data centre · B side', kva: 200, load: 48, autonomy: 18, batteryV: 540 },
  { tag: 'UPS_003', label: 'UPS-03', serves: 'Security & CCTV', kva: 60, load: 64, autonomy: 22, batteryV: 480 },
  { tag: 'UPS_004', label: 'UPS-04', serves: 'BMS & fire panels', kva: 30, load: 38, autonomy: 45, batteryV: 384 },
];

export function upsValues(u: UpsUnit, mains: MainsState, now: number): AttrValues {
  const gen = gensetPhase(mains, now);
  // On battery from the moment the utility fails until the generators carry the essential board.
  const onBattery = mains.failed && gen.phase !== 'onLoad';
  const batterySeconds = mains.failedAt ? Math.min((now - mains.failedAt) / 1000, ON_LOAD_S) : 0;
  const rechargeSeconds = mains.failedAt ? Math.max(0, (now - mains.failedAt) / 1000 - ON_LOAD_S) : 0;
  const dip = batterySeconds * (100 / (u.autonomy * 60)) * 1.4;
  const charge = clamp(100 - dip + rechargeSeconds * 0.06, 0, 100);
  const load = clamp(wander(u.tag + 'load', now, u.load, 3.5, 3), 5, 98);
  const kw = (u.kva * 0.9 * load) / 100;
  const runtime = (u.autonomy * (charge / 100) * u.load) / load;
  const warmRoom = u.tag === 'UPS_003';
  const temp = wander(u.tag + 'temp', now, warmRoom ? 31.4 : 23.8, 0.3, 30);
  return {
    Output_Source: onBattery ? 5 : 3,
    Input_Voltage: onBattery ? 0 : wander(u.tag + 'vin', now, 231, 1.2, 1),
    Input_Frequency: onBattery ? 0 : wander(u.tag + 'fin', now, 50, 0.04, 1),
    Output_Voltage: wander(u.tag + 'vout', now, 230, 0.3, 1),
    Output_Frequency: 50,
    Output_Load_Pct: load,
    Output_kW: kw,
    Battery_Status: charge < 20 ? 3 : 2,
    Battery_Charge_Pct: charge,
    Runtime_Min: runtime,
    Battery_Voltage: u.batteryV * (onBattery ? 0.96 : charge < 100 ? 1.03 : 1.01),
    Battery_Current: onBattery ? -((kw * 1000) / (u.batteryV * 0.96)) : charge < 100 ? 18 : 0.4,
    Battery_Temp: temp,
    Seconds_On_Battery: onBattery ? Math.round(batterySeconds) : 0,
    Alarms_Present: (onBattery ? 1 : 0) + (warmRoom ? 1 : 0),
    Last_Self_Test: warmRoom ? 'Passed · 12 Sep · battery temp high' : 'Passed · 12 Sep',
  };
}

/* =================================================================================================
 * Single-line diagram: the distribution network and each device's state
 * ================================================================================================= */

export interface Feeder {
  tag: string;
  label: string;
  /** Share of its board's load. */
  share: number;
}

export const TRANSFORMERS = [
  { tag: 'TR_01', label: 'TR-1', kva: 1600, share: 0.27 },
  { tag: 'TR_02', label: 'TR-2', kva: 1600, share: 0.24 },
  { tag: 'TR_03', label: 'TR-3', kva: 1600, share: 0.26 },
  { tag: 'TR_04', label: 'TR-4', kva: 1600, share: 0.23 },
];

export const MDB_A_FEEDERS: Feeder[] = [
  { tag: 'CB_FA1', label: 'SMDB Retail East', share: 0.41 },
  { tag: 'CB_FA2', label: 'SMDB Food Court', share: 0.35 },
  { tag: 'CB_FA3', label: 'SMDB Car Park', share: 0.24 },
];
export const MDB_B_FEEDERS: Feeder[] = [
  { tag: 'CB_FB1', label: 'SMDB Cinema & Anchor', share: 0.44 },
  { tag: 'CB_FB2', label: 'SMDB Offices', share: 0.3 },
  { tag: 'CB_FB3', label: 'EMDB normal supply', share: 0.26 },
];
export const EMDB_FEEDERS: Feeder[] = [
  { tag: 'CB_E1', label: 'UPS input', share: 0.18 },
  { tag: 'CB_E2', label: 'Fire pumps', share: 0.22 },
  { tag: 'CB_E3', label: 'Smoke extract', share: 0.26 },
  { tag: 'CB_E4', label: 'Lifts', share: 0.2 },
  { tag: 'CB_E5', label: 'Emergency lighting', share: 0.14 },
];

export interface DeviceState {
  tag: string;
  template: TemplateDef;
  values: AttrValues;
  /** Energised downstream side. */
  live: boolean;
}

/** Every device on the SLD, keyed by tag. */
export function networkState(mains: MainsState, now: number): Record<string, DeviceState> {
  const gen = gensetPhase(mains, now);
  const utility = !mains.failed;
  const gensOnLoad = gen.phase === 'onLoad';
  const siteKw = siteDemandKw(now);
  const essKw = essentialLoadKw(now);
  const out: Record<string, DeviceState> = {};

  const breaker = (tag: string, closed: boolean, live: boolean, kw: number, v = 400): DeviceState => {
    const pf = 0.92;
    const amps = live && kw > 0 ? (kw * 1000) / (Math.sqrt(3) * v * pf) : 0;
    return {
      tag,
      template: BREAKER_TEMPLATE,
      live,
      values: {
        Closed: closed,
        Tripped: false,
        Racked_In: true,
        Remote: true,
        Voltage_LL: live ? wander(tag + 'v', now, v, v * 0.004, 1) : 0,
        Current_Avg: amps,
        Active_Power: live ? kw : 0,
        Power_Factor: live && kw > 0 ? pf : 0,
        Trip_Count: Math.floor(hash01(tag) * 4),
      },
    };
  };

  // MV incomers: both closed; they carry the site between them.
  out.CB_INC_A = breaker('CB_INC_A', true, utility, siteKw * 0.52, 22_000);
  out.CB_INC_B = breaker('CB_INC_B', true, utility, siteKw * 0.48, 22_000);

  const mdbKw = { A: 0, B: 0 };
  TRANSFORMERS.forEach((t, i) => {
    const kw = utility ? siteKw * t.share : 0;
    if (i < 2) mdbKw.A += kw;
    else mdbKw.B += kw;
    out[`CB_Q1${i + 1}`] = breaker(`CB_Q1${i + 1}`, true, utility, kw, 22_000);
    const load = (kw / (t.kva * 0.92)) * 100;
    out[t.tag] = {
      tag: t.tag,
      template: TRANSFORMER_TEMPLATE,
      live: utility,
      values: {
        Load_Pct: load,
        Active_Power: kw,
        Winding_Temp: utility ? 48 + load * 0.55 + wander(t.tag + 'wt', now, 0, 1.5, 15) : wander(t.tag + 'wt', now, 36, 0.5, 30),
        Fans_Running: load > 70,
        Temp_Alarm: false,
        Temp_Trip: false,
      },
    };
    out[`ACB_T${i + 1}`] = breaker(`ACB_T${i + 1}`, true, utility, kw);
  });
  out.CB_BC = breaker('CB_BC', false, false, 0);
  MDB_A_FEEDERS.forEach((f) => (out[f.tag] = breaker(f.tag, true, utility, mdbKw.A * f.share)));
  MDB_B_FEEDERS.forEach((f) => (out[f.tag] = breaker(f.tag, true, utility, f.tag === 'CB_FB3' ? (utility ? essKw : 0) : mdbKw.B * f.share)));

  GENSETS.forEach((g, i) => {
    const v = gensetValues(g, i, mains, now);
    out[g.tag] = { tag: g.tag, template: GENSET_TEMPLATE, live: (v.Voltage_LL as number) > 0, values: v };
    out[`GCB_${i + 1}`] = breaker(`GCB_${i + 1}`, gensOnLoad, gensOnLoad, v.Output_kW as number);
  });

  const emdbLive = utility || gensOnLoad;
  out.ATS_EMDB = {
    tag: 'ATS_EMDB',
    template: ATS_TEMPLATE,
    live: emdbLive,
    values: { Position: utility ? 0 : gensOnLoad ? 1 : 0, Normal_Available: utility, Emergency_Available: gen.phase === 'onLoad' || gen.phase === 'running', Transfer_Count: 38 + (mains.failedAt ? 2 : 0) },
  };
  EMDB_FEEDERS.forEach((f) => (out[f.tag] = breaker(f.tag, true, emdbLive, emdbLive ? essKw * f.share : 0)));
  return out;
}
