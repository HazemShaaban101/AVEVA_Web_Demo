/**
 * Which platform equipment is live from the AVEVA Galaxy, and which Galaxy attribute plays each role.
 * Adding another unit that follows the same template is one more entry here — no screen changes.
 */

export type AhuRole =
  | 'supplyTemp'
  | 'supplyHumd'
  | 'outsideTemp'
  | 'outsideHumd'
  | 'startStop'
  | 'auto'
  | 'fanCmd'
  | 'fanStatus'
  | 'vsdCmd'
  | 'vsdFb'
  | 'trip'
  | 'filter'
  | 'filterDps'
  | 'pressure'
  | 'valveCmd'
  | 'valveFb'
  | 'valveAlarm'
  | 'flow'
  | 'smoke'
  | 'fireAlarm'
  | 'freshDamperCmd'
  | 'freshDamperSts'
  | 'freshDamperFail'
  | 'returnDamperCmd'
  | 'returnDamperSts'
  | 'returnDamperFail'
  | 'inAlarm'
  | 'scan';

export interface AhuUnit {
  /** Platform id / label, as it appears in breadcrumbs. */
  id: string;
  /** Galaxy object name the gateway resolves. */
  galaxy: string;
  building: string;
  floor: string;
  /** Rated fan speed, to express the VSD feedback (%) as rpm. */
  ratedFanRpm: number;
  /** Filter ΔP at which the filter counts as fully loaded (for "filter health"). */
  filterDirtyPa: number;
  attrs: Record<AhuRole, string>;
}

/** FAHU template attribute names as deployed in the Galaxy (object FAHU_001). */
const FAHU_TEMPLATE: Record<AhuRole, string> = {
  supplyTemp: 'Supply_Temp',
  supplyHumd: 'Supply_Humd',
  outsideTemp: 'Outside_Temp',
  outsideHumd: 'Outside_Humd',
  startStop: 'StartStop',
  auto: 'FAHU_Auto',
  fanCmd: 'FAHU_Fan_SS',
  fanStatus: 'FAHU_Fan_STS',
  vsdCmd: 'VSD_Signal',
  vsdFb: 'VSD_FB',
  trip: 'Trip',
  filter: 'Filter',
  filterDps: 'Filter_DPS',
  pressure: 'FAHU_DPT',
  valveCmd: 'PICV_Signal',
  valveFb: 'PICV_FB',
  valveAlarm: 'PICV_Alarm',
  flow: 'Flow_DPS',
  smoke: 'SmokeDetector_STS',
  fireAlarm: 'FAP',
  freshDamperCmd: 'Damper1_SS',
  freshDamperSts: 'Damper1_STS',
  freshDamperFail: 'FreshDamper_FTO1',
  returnDamperCmd: 'Damper2_SS',
  returnDamperSts: 'Damper2_STS',
  returnDamperFail: 'ReturnDamper2_FTO2',
  inAlarm: 'InAlarm',
  scan: 'ScanState',
};

export const AHU_UNITS: AhuUnit[] = [
  { id: 'FAHU-01', galaxy: 'FAHU_001', building: 'a02', floor: 'r', ratedFanRpm: 1450, filterDirtyPa: 250, attrs: FAHU_TEMPLATE },
];

export const ahuById = (id: string | undefined) => AHU_UNITS.find((u) => u.id.toLowerCase() === id?.toLowerCase());

/** Roles that mean "something is wrong" when their value is 1/true. */
export const AHU_ALARM_ROLES: AhuRole[] = ['trip', 'filter', 'filterDps', 'valveAlarm', 'smoke', 'fireAlarm', 'freshDamperFail', 'returnDamperFail', 'inAlarm'];

export const AHU_ROLE_LABELS: Record<AhuRole, string> = {
  supplyTemp: 'Supply Temperature',
  supplyHumd: 'Supply Humidity',
  outsideTemp: 'Outside Temperature',
  outsideHumd: 'Outside Humidity',
  startStop: 'Unit Start / Stop',
  auto: 'Auto / Manual',
  fanCmd: 'Fan Command',
  fanStatus: 'Fan Status',
  vsdCmd: 'VSD Command',
  vsdFb: 'VSD Feedback',
  trip: 'Fan Trip',
  filter: 'Filter Alarm',
  filterDps: 'Filter ΔP Switch',
  pressure: 'Filter ΔP',
  valveCmd: 'PICV Command',
  valveFb: 'PICV Feedback',
  valveAlarm: 'PICV Alarm',
  flow: 'Airflow Switch',
  smoke: 'Smoke Detector',
  fireAlarm: 'Fire Alarm Panel',
  freshDamperCmd: 'Fresh Damper Cmd',
  freshDamperSts: 'Fresh Damper Status',
  freshDamperFail: 'Fresh Damper Fail',
  returnDamperCmd: 'Return Damper Cmd',
  returnDamperSts: 'Return Damper Status',
  returnDamperFail: 'Return Damper Fail',
  inAlarm: 'Object In Alarm',
  scan: 'On Scan',
};

/* ---------------------------------------------------------------------------------------------
 * FCUs — the Galaxy's FCU template (FCU_001…): command attributes and their _Status feedback.
 * ------------------------------------------------------------------------------------------- */

export interface FcuTemplate {
  command: string;
  commandStatus: string;
  fanSpeed: string;
  fanSpeedStatus: string;
  fanMode: string;
  fanModeStatus: string;
  setpoint: string;
  temperature: string;
}

export const FCU_TEMPLATE: FcuTemplate = {
  command: 'CMD',
  commandStatus: 'CMD_Status',
  fanSpeed: 'FanSpeed',
  fanSpeedStatus: 'FanSpeed_Status',
  fanMode: 'FanMode',
  fanModeStatus: 'FanMode_Status',
  setpoint: 'SetTemperature',
  temperature: 'Temperature',
};

/** Galaxy search term for FCU instances. */
export const FCU_QUERY = 'FCU';

/** Platform floor → the Galaxy Area its equipment is assigned to. */
export const FLOOR_AREAS: Record<string, string> = {
  gf: 'Ground_Floor',
  ff: 'First_Floor',
  f2: 'Second_Floor',
  f3: 'Third_Floor',
  r: 'Roof_Floor',
  ur: 'Upper_Roof',
};

/** FCU operating mode values (FanMode / FanMode_Status), cycled in this order by the card. */
export const FCU_FAN_MODES: Record<number, string> = { 0: 'Cooling', 1: 'Heating', 2: 'Auto' };

/**
 * Which Galaxy FCU a plan marker shows: the floor's own FCUs (by Galaxy Area) in order, or — for
 * floors without any — the whole list, reused cyclically.
 */
export function bindFcu(items: { name: string; parent: string | null }[], floor: string, markerIndex: number): string | null {
  if (!items.length) return null;
  const own = items.filter((i) => i.parent === FLOOR_AREAS[floor]);
  const pool = own.length ? own : items;
  return pool[markerIndex % pool.length].name;
}
