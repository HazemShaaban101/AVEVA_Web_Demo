import type { AttrValues, TemplateDef } from '@/model/assets/galaxy';

/* =================================================================================================
 * Parking enforcement
 *
 * The parking guidance system (per-bay ultrasonic sensors), the ANPR cameras and the pay stations
 * share one parking server; its OPC UA interface exposes the day's counters, which the Galaxy reads
 * through the OPC UA OI Server into one $ParkingEnforcement object. Each violation is also an event
 * (plate, bay, type) the server raises, which the screen lists.
 * ================================================================================================= */

export type ViolationType = 'Overstay' | 'Reserved bay' | 'Accessible bay' | 'Double parking' | 'Fire lane' | 'Wrong way' | 'Barrier tailgating';

export const VIOLATION_TYPES: { type: ViolationType; attr: string; detect: string; weight: number; fine: number }[] = [
  { type: 'Overstay', attr: 'Overstay_Today', detect: 'ANPR dwell over 6 h on short-stay levels', weight: 0.26, fine: 150 },
  { type: 'Reserved bay', attr: 'Reserved_Bay_Today', detect: 'Bay sensor + ANPR, plate without permit', weight: 0.16, fine: 200 },
  { type: 'Accessible bay', attr: 'Accessible_Bay_Today', detect: 'Bay sensor + ANPR, no disabled permit', weight: 0.1, fine: 500 },
  { type: 'Double parking', attr: 'Double_Parking_Today', detect: 'CCTV analytics, vehicle stopped in aisle', weight: 0.14, fine: 200 },
  { type: 'Fire lane', attr: 'Fire_Lane_Today', detect: 'CCTV analytics, no-stopping zone', weight: 0.09, fine: 500 },
  { type: 'Wrong way', attr: 'Wrong_Way_Today', detect: 'Ramp loop detectors, reverse sequence', weight: 0.07, fine: 0 },
  { type: 'Barrier tailgating', attr: 'Tailgating_Today', detect: 'Barrier loop + ANPR, exit without payment', weight: 0.18, fine: 100 },
];

export const PARKING_ENF_TAG = 'PARK_ENF_01';

export const PARKING_ENF_TEMPLATE: TemplateDef = {
  name: '$ParkingEnforcement',
  desc: 'Parking violations and enforcement counters',
  io: 'OPC UA OI Server · parking guidance / ANPR server (bay sensors, cameras, pay stations)',
  attrs: [
    { name: 'Violations_Today', type: 'Integer', desc: 'Violations detected since midnight' },
    { name: 'Open_Violations', type: 'Integer', desc: 'Violations not yet handled by a patrol' },
    ...VIOLATION_TYPES.map((v) => ({ name: v.attr, type: 'Integer' as const, desc: `${v.type}: ${v.detect}` })),
    { name: 'Fines_Today', type: 'Float', unit: 'EGP', desc: 'Penalties added at the pay stations', decimals: 0 },
    { name: 'Last_Violation', type: 'String', desc: 'Type of the latest violation' },
    { name: 'Last_Violation_Bay', type: 'String', desc: 'Bay or location of the latest violation' },
  ],
};

export function parkingEnfValues(tally: Record<string, number>, open: number, fines: number, last?: { type: string; bay: string }): AttrValues {
  const v: AttrValues = {
    Violations_Today: Object.values(tally).reduce((a, n) => a + n, 0),
    Open_Violations: open,
  };
  for (const t of VIOLATION_TYPES) v[t.attr] = tally[t.type] ?? 0;
  v.Fines_Today = fines;
  v.Last_Violation = last?.type ?? '';
  v.Last_Violation_Bay = last?.bay ?? '';
  return v;
}

/* =================================================================================================
 * Access channels
 *
 * How each person came through the controlled doors and turnstiles: the access control server tags
 * every event with the credential type, and exposes per-channel counters over OPC UA.
 * ================================================================================================= */

export type AccessChannel = 'QR code' | 'Visitor pass' | 'Employee card' | 'Tenant card' | 'Contractor permit' | 'Face ID';

export const ACCESS_CHANNELS: { id: AccessChannel; attr: string; desc: string; color: string; weight: number }[] = [
  { id: 'QR code', attr: 'QR_Code_Today', desc: 'Mall app or e-invite at the turnstile readers', color: '#9d78ff', weight: 0.24 },
  { id: 'Visitor pass', attr: 'Visitor_Pass_Today', desc: 'Temporary card issued at reception', color: '#b376f9', weight: 0.1 },
  { id: 'Employee card', attr: 'Employee_Card_Today', desc: 'Mall management and FM staff', color: '#7fcf9d', weight: 0.18 },
  { id: 'Tenant card', attr: 'Tenant_Card_Today', desc: 'Shop and office tenants’ staff', color: '#e8a98c', weight: 0.32 },
  { id: 'Contractor permit', attr: 'Contractor_Today', desc: 'Permit-to-work card, time-limited', color: '#f472b6', weight: 0.07 },
  { id: 'Face ID', attr: 'Face_ID_Today', desc: 'Enrolled staff at the lobby readers', color: '#a3e635', weight: 0.09 },
];

export const ACCESS_TAG = 'ACS_SRV_01';

export const ACCESS_TEMPLATE: TemplateDef = {
  name: '$AccessControlServer',
  desc: 'Access control server: entries per credential channel',
  io: 'OPC UA OI Server · access control server event counters',
  attrs: [
    { name: 'Entries_Today', type: 'Integer', desc: 'Granted entries since midnight' },
    ...ACCESS_CHANNELS.map((c) => ({ name: c.attr, type: 'Integer' as const, desc: `${c.id}: ${c.desc}` })),
    { name: 'Denied_Today', type: 'Integer', desc: 'Refused credentials since midnight' },
    { name: 'Visitors_On_Site', type: 'Integer', desc: 'Visitor passes and QR invites checked in, not yet out' },
  ],
};

export function accessValues(granted: Record<string, number>, denied: number, visitorsOnSite: number): AttrValues {
  const v: AttrValues = { Entries_Today: Object.values(granted).reduce((a, n) => a + n, 0) };
  for (const c of ACCESS_CHANNELS) v[c.attr] = granted[c.id] ?? 0;
  v.Denied_Today = denied;
  v.Visitors_On_Site = visitorsOnSite;
  return v;
}

/** Pick an item by weight with a 0..1 random number. */
export function pickWeighted<T extends { weight: number }>(list: readonly T[], r: number): T {
  const total = list.reduce((a, x) => a + x.weight, 0);
  let acc = 0;
  for (const x of list) {
    acc += x.weight / total;
    if (r < acc) return x;
  }
  return list[list.length - 1];
}
