/**
 * The physical model of the site: buildings on the site render, floors of A02, fire zones on the
 * top-view map, and the devices placed on the floor plan per system. Coordinates are design pixels
 * taken from the Figma exports (hotspot paths in Frame 488 / 490 / Fire System-1).
 */

export interface Building {
  id: string;
  label: string;
  /** Polygon on the site render, stage coordinates. */
  outline: string;
  /** Tooltip anchor. */
  anchor: { x: number; y: number };
  floors: FloorDef[];
  detailed: boolean;
  use: string;
}

export interface FloorDef {
  id: string;
  label: string;
}

const A02_FLOORS: FloorDef[] = [
  { id: 'ur', label: 'UR' },
  { id: 'r', label: 'R' },
  { id: 'f3', label: 'F3' },
  { id: 'f2', label: 'F2' },
  { id: 'ff', label: 'FF' },
  { id: 'gf', label: 'GF' },
];

/**
 * Buildings on the site render (site.webp fills the 1920 × 1080 stage). The outlines are the design's
 * hover polygons (reference "New Data/Polygon.svg", drawn on a 718 × 398 box that sits at 611, 236 on
 * the stage). Streets, gardens and the lagoon between them belong to no building.
 */
export const BUILDINGS: Building[] = [
  { id: 'c01', label: 'C01', use: 'Hypermarket & services · 2 levels', detailed: false, outline: 'M735.5 401.5 L713 414.5 L725.5 478 L738 470 L778 479.5 L796.5 461.5 L841.5 471.5 V488 L942.5 417.5 V408 L950 401.5 V378.5 H963 L965.5 374.5 V368 L938.5 345.5 L931.5 344 L925 335.5 H915.5 L913.5 325 H889.5 L885 332 H873.5 L847.5 347.5 H841.5 L812 365.5 L796.5 364 L731.5 399 L735.5 401.5 Z', anchor: { x: 839, y: 330 }, floors: A02_FLOORS.slice(2) },
  { id: 'c02', label: 'C02', use: 'Retail pavilions · 3 levels', detailed: false, outline: 'M777 484 V499 L811 518 L839 499 V473 L798 465 L777 484 Z', anchor: { x: 808, y: 465 }, floors: A02_FLOORS.slice(2) },
  { id: 'b03', label: 'B03', use: 'Offices · 5 levels', detailed: false, outline: 'M1004.5 238 L1002 316 L1044 312 L1047.5 241.5 L1035 236 L1004.5 238 Z', anchor: { x: 1025, y: 236 }, floors: A02_FLOORS.slice(2) },
  { id: 'b02', label: 'B02', use: 'Mixed use · 4 levels', detailed: false, outline: 'M943.5 246 V327 L958.5 339.5 V319 L983.5 316.625 V250 L970 244 L943.5 246 Z', anchor: { x: 964, y: 244 }, floors: A02_FLOORS.slice(2) },
  { id: 'b01', label: 'B01', use: 'Anchor store & cinema · 4 levels', detailed: false, outline: 'M1323 473 L1171.5 509 L1051 415 L996.5 426.5 L951.5 399 V387 L991.5 378 L960 352.5 V321 L1066.5 311 L1120.5 337 L1110.5 339.5 L1127.5 348 L1150.5 344.5 L1164 352.5 V361.5 L1315.5 435.5 V442 L1323 445.5 L1328.5 456 L1323 473 Z', anchor: { x: 1140, y: 318 }, floors: A02_FLOORS.slice(2) },
  { id: 'a01', label: 'A01', use: 'Food court & retail · 3 levels', detailed: false, outline: 'M839 591.5 V603 L954 634 L995 576.5 V558 L895.5 531 L839 591.5 Z', anchor: { x: 917, y: 534 }, floors: A02_FLOORS.slice(2) },
  { id: 'a03', label: 'A03', use: 'Clinics & lifestyle · 4 levels', detailed: false, outline: 'M678.5 562.5 L686 600 L729 618.5 L772.5 583.5 L767 546.5 L720.5 531.5 L678.5 562.5 Z', anchor: { x: 726, y: 534 }, floors: A02_FLOORS.slice(2) },
  { id: 'a02', label: 'A02', use: 'Retail & Offices · 6 levels', detailed: true, outline: 'M611 358 L642 493 L689 505 L725 484 L697 352 L642 342 L611 358 Z', anchor: { x: 668, y: 342 }, floors: A02_FLOORS },
];

export const buildingById = (id: string | undefined) => BUILDINGS.find((b) => b.id === id);

/**
 * Floor bands on A02's render (building-a02.webp cover-fitted into the stage frame). Each floor line is
 * given as its y at the building's left end, front corner and right end; the lines were measured on the
 * render (dark slabs between lit glass) and FF is the design's own band. UR is the set-back rooftop
 * floor, R the roof terrace's parapet and planters.
 */
const EDGE_X = [1059.5, 1410.5, 1801.5] as const;
type FloorLine = readonly [number, number, number];
const LINE = {
  parapet: [530, 590, 505],
  roof: [563, 624, 532],
  f3: [612, 685, 578],
  f2: [660.5, 738.4, 615.2],
  ff: [698.5, 791.9, 653.1],
  ground: [808, 858, 723],
} satisfies Record<string, FloorLine>;

function band(top: FloorLine, bottom: FloorLine) {
  const at = (line: FloorLine, i: number) => `${EDGE_X[i]} ${line[i]}`;
  return `M${at(top, 0)} L${at(top, 1)} L${at(top, 2)} L${at(bottom, 2)} L${at(bottom, 1)} L${at(bottom, 0)} Z`;
}

export const A02_FLOOR_BANDS: Record<string, string> = {
  gf: band(LINE.ff, LINE.ground),
  ff: band(LINE.f2, LINE.ff),
  f2: band(LINE.f3, LINE.f2),
  f3: band(LINE.roof, LINE.f3),
  r: band(LINE.parapet, LINE.roof),
  // The set-back rooftop floor: the main volume, stepping down to a lower section at its left end.
  ur: 'M1055 497 L1115 496 L1116 479 L1285 481 L1285 524 L1055 523 Z',
};

/** Fire zones across the top-view site map (stage coords of the Fire Detection frame). */
export const FIRE_ZONES = [
  { id: 1, label: 'Zone 1', x0: 1260, x1: 1788 },
  { id: 2, label: 'Zone 2', x0: 690, x1: 1260 },
  { id: 3, label: 'Zone 3', x0: 131, x1: 690 },
];

/** The blocks that light up for a Zone 1 alarm (Fire System-1 hotspot paths). */
export const ZONE1_ALARM_BLOCKS = [
  'M1632.5 624.5V699C1632.5 700.1 1633.4 701 1634.5 701H1709C1710.1 701 1711 700.1 1711 699V624.5C1711 623.4 1710.1 622.5 1709 622.5H1634.5C1633.4 622.5 1632.5 623.4 1632.5 624.5Z',
  'M1539 624V698.5C1539 699.6 1539.9 700.5 1541 700.5H1615.5C1616.6 700.5 1617.5 699.6 1617.5 698.5V624C1617.5 622.9 1616.6 622 1615.5 622H1541C1539.9 622 1539 622.9 1539 624Z',
  'M1560.5 788V799.5C1560.5 800.6 1561.4 801.5 1562.5 801.5L1683.5 801.2C1684.6 801.2 1685.5 800.3 1685.5 799.2L1684.5 736C1684.5 734.9 1683.6 734 1682.5 734H1556.5C1555.4 734 1554.5 734.9 1554.5 736V784C1554.5 785.1 1555.4 786 1556.5 786H1558.5C1559.6 786 1560.5 786.9 1560.5 788Z',
];

/* ---------------------------------------------------------------------------------------------
 * Floor-plan devices (coordinates are % of the floor-plan image, so they stay put when it scales).
 * ------------------------------------------------------------------------------------------- */

export type OverlaySystem = 'hvac' | 'elevators' | 'metering' | 'dampers' | 'fire';

export const OVERLAY_SYSTEMS: { id: OverlaySystem; label: string }[] = [
  { id: 'hvac', label: 'HVAC' },
  { id: 'elevators', label: 'Elevators' },
  { id: 'metering', label: 'Metering' },
  { id: 'dampers', label: 'Dampers' },
  { id: 'fire', label: 'Fire Alarm' },
];

export interface PlanDevice {
  id: string;
  system: OverlaySystem;
  label: string;
  x: number;
  y: number;
  /** Opens the equipment view (live AHU). */
  equipment?: string;
}

export const PLAN_DEVICES: PlanDevice[] = [
  { id: 'fcu-01', system: 'hvac', label: 'FCU-01', x: 26, y: 20 },
  { id: 'fcu-02', system: 'hvac', label: 'FCU-02', x: 53, y: 18 },
  { id: 'fcu-03', system: 'hvac', label: 'FCU-03', x: 83, y: 22 },
  { id: 'fcu-04', system: 'hvac', label: 'FCU-04', x: 18, y: 72 },
  { id: 'fcu-05', system: 'hvac', label: 'FCU-05', x: 58, y: 76 },
  { id: 'fcu-06', system: 'hvac', label: 'FCU-06', x: 86, y: 74 },
  { id: 'fahu-01', system: 'hvac', label: 'FAHU-01', x: 72, y: 47, equipment: 'FAHU-01' },
  { id: 'elv-01', system: 'elevators', label: 'Elevator 1', x: 35.5, y: 57 },
  { id: 'elv-02', system: 'elevators', label: 'Elevator 2', x: 40, y: 57 },
  { id: 'elv-03', system: 'elevators', label: 'Elevator 3', x: 76, y: 60 },
  { id: 'mtr-01', system: 'metering', label: 'Main Meter · GF-East', x: 78.5, y: 44 },
  { id: 'mtr-02', system: 'metering', label: 'Tenant Meter · GF-West', x: 20, y: 38 },
  { id: 'mvd-01', system: 'dampers', label: 'MVD #1', x: 21.5, y: 42 },
  { id: 'mvd-02', system: 'dampers', label: 'MVD #2', x: 36, y: 62 },
  { id: 'mvd-03', system: 'dampers', label: 'MVD #3', x: 66, y: 62 },
  { id: 'mvd-04', system: 'dampers', label: 'MVD #4', x: 14, y: 74 },
  { id: 'mvd-05', system: 'dampers', label: 'MVD #5', x: 24, y: 86 },
  { id: 'sd-01', system: 'fire', label: 'SD-01', x: 22, y: 30 },
  { id: 'sd-02', system: 'fire', label: 'SD-02', x: 45, y: 28 },
  { id: 'sd-03', system: 'fire', label: 'SD-03', x: 70, y: 30 },
  { id: 'sd-04', system: 'fire', label: 'SD-04', x: 30, y: 78 },
  { id: 'sd-05', system: 'fire', label: 'SD-05', x: 62, y: 80 },
  { id: 'sd-06', system: 'fire', label: 'SD-06', x: 85, y: 78 },
];
