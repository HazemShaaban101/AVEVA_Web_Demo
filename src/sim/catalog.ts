import { Signal, type SignalDef } from '@/sim/signals';

/**
 * Every simulated measurement on the platform, by id. Screens reference these ids, never numbers,
 * so a widget can be re-pointed at a live source (see data/binding.ts) without touching the screen.
 * Ranges are plausible for a large open-air mall (Cairo).
 */
const DEFS = {
  'weather.temp': { unit: '°C', low: 19, high: 29, profile: 'hvac', noise: 0.08, drift: 180, decimals: 0 },

  // ---- Site-wide KPIs (3D View overlay) -------------------------------------------------------
  'site.power': { unit: 'MW', low: 1.6, high: 4.6, profile: 'retail', noise: 0.05, decimals: 1 },
  'site.hvacCop': { unit: 'COP', low: 5.4, high: 4.6, profile: 'hvac', noise: 0.06, decimals: 1 },
  'site.parkingFree': { unit: 'Free', low: 1650, high: 180, profile: 'occupancy', noise: 0.04, decimals: 0, clampMin: 0 },
  'site.energyToday': { unit: 'MWh', low: 12.8, high: 15.6, profile: 'flat', noise: 0.03, drift: 600, decimals: 1 },
  'site.waterToday': { unit: 'm³', low: 1900, high: 2400, profile: 'flat', noise: 0.03, drift: 600, decimals: 0 },
  'elevator.avg': { unit: '%', low: 8, high: 58, profile: 'occupancy', noise: 0.06, decimals: 0 },
  'elevator.peak': { unit: '%', low: 20, high: 88, profile: 'occupancy', noise: 0.05, decimals: 0 },
  'env.co2': { unit: 'ppm', low: 410, high: 620, profile: 'occupancy', noise: 0.05, decimals: 0 },
  'env.humidity': { unit: '%', low: 42, high: 50, profile: 'hvac', noise: 0.2, decimals: 0 },
  'env.oxygen': { unit: '%', low: 20.9, high: 20.7, profile: 'occupancy', noise: 0.2, decimals: 1 },
  'env.pm25': { unit: 'µg/m³', low: 9, high: 18, profile: 'retail', noise: 0.15, decimals: 0 },
  'power.transformerKpi': { unit: '%', low: 48, high: 82, profile: 'retail', noise: 0.04, decimals: 1 },
  'power.active': { unit: 'kW', low: 2400, high: 6400, profile: 'retail', noise: 0.04, decimals: 0 },
  'power.reactive': { unit: 'kVAR', low: 520, high: 1250, profile: 'retail', noise: 0.05, decimals: 0 },
  'water.irrigation.daily': { unit: 'm³', low: 60, high: 95, profile: 'flat', noise: 0.25, drift: 2000, decimals: 0 },
  'water.consumption.daily': { unit: 'm³', low: 70, high: 100, profile: 'flat', noise: 0.25, drift: 2000, decimals: 0 },

  // ---- Electric ---------------------------------------------------------------------------------
  'electric.transformerLoad': { unit: '%', low: 42, high: 84, profile: 'retail', noise: 0.04, decimals: 0 },
  // Peak-shaving: generators share load in the evening peak (as in the design, not standby-only).
  'electric.generatorLoad': { unit: '%', low: 52, high: 84, profile: 'retail', noise: 0.05, decimals: 0 },
  'electric.demand': { unit: 'MW', low: 1.7, high: 4.5, profile: 'retail', noise: 0.06, decimals: 2 },
  'electric.pf': { unit: 'PF', low: 0.97, high: 0.93, profile: 'retail', noise: 0.05, decimals: 2 },

  // ---- Metering ---------------------------------------------------------------------------------
  'metering.peakDemand': { unit: 'kW', low: 4100, high: 4700, profile: 'flat', noise: 0.05, drift: 900, decimals: 0 },
  'metering.load': { unit: 'kW', low: 1500, high: 4300, profile: 'retail', noise: 0.05, decimals: 0 },
  'metering.energy': { unit: 'MWh', low: 1.4, high: 4.4, profile: 'retail', noise: 0.07, decimals: 2 },
  'metering.efficiency': { unit: '%', low: 86, high: 74, profile: 'retail', noise: 0.05, decimals: 1 },
  'metering.water': { unit: 'm³/h', low: 18, high: 140, profile: 'retail', noise: 0.08, decimals: 1 },
  'metering.waterToday': { unit: 'm³', low: 1950, high: 2350, profile: 'flat', noise: 0.04, drift: 600, decimals: 0 },
  'metering.btu': { unit: 'MBTU/h', low: 8, high: 34, profile: 'hvac', noise: 0.07, decimals: 1 },
  'metering.btuToday': { unit: 'MBTU', low: 480, high: 560, profile: 'flat', noise: 0.04, drift: 600, decimals: 0 },

  // ---- Plumbing ---------------------------------------------------------------------------------
  'plumbing.domesticFlow': { unit: 'm³/h', low: 6, high: 48, profile: 'retail', noise: 0.09, decimals: 1 },
  'plumbing.irrigationFlow': { unit: 'm³/h', low: 0, high: 36, profile: 'irrigation', noise: 0.06, decimals: 1, clampMin: 0 },
  'pumps.booster': { unit: '%', low: 25, high: 75, profile: 'retail', noise: 0.08, decimals: 0 },
  'pumps.cooling': { unit: '%', low: 40, high: 90, profile: 'hvac', noise: 0.06, decimals: 0 },
  'pumps.fire': { unit: '%', low: 100, high: 100, profile: 'flat', noise: 0, decimals: 0 },
  'pumps.hotWater': { unit: '%', low: 30, high: 55, profile: 'retail', noise: 0.08, decimals: 0 },
  'pumps.submersible': { unit: '%', low: 18, high: 42, profile: 'irrigation', noise: 0.1, decimals: 0 },

  // ---- HVAC -------------------------------------------------------------------------------------
  'hvac.chwSupply': { unit: '°C', low: 6.6, high: 7.4, profile: 'hvac', noise: 0.25, decimals: 1 },
  'hvac.chwReturn': { unit: '°C', low: 11.2, high: 13.4, profile: 'hvac', noise: 0.2, decimals: 1 },
  'hvac.pumpFlow': { unit: 'm³/h', low: 260, high: 520, profile: 'hvac', noise: 0.05, decimals: 0 },
  'hvac.coolingLoad': { unit: 'TR', low: 620, high: 1650, profile: 'hvac', noise: 0.06, decimals: 0 },
  'hvac.co2': { unit: 'ppm', low: 420, high: 780, profile: 'occupancy', noise: 0.08, decimals: 0 },
  'hvac.airflow': { unit: '%', low: 45, high: 92, profile: 'hvac', noise: 0.05, decimals: 0 },
  'hvac.runtimeA': { unit: 'Hrs', low: 2340, high: 2340, profile: 'flat', noise: 0, decimals: 0 },
  'hvac.runtimeB': { unit: 'Hrs', low: 2500, high: 2500, profile: 'flat', noise: 0, decimals: 0 },
  'hvac.occupancyA': { unit: 'People', low: 20, high: 380, profile: 'occupancy', noise: 0.06, decimals: 0, clampMin: 0 },
  'hvac.occupancyB': { unit: 'People', low: 30, high: 720, profile: 'occupancy', noise: 0.06, decimals: 0, clampMin: 0 },
  'hvac.power': { unit: 'MW', low: 0.6, high: 2.1, profile: 'hvac', noise: 0.06, decimals: 2 },

  // ---- Community --------------------------------------------------------------------------------
  'community.activeUsers': { unit: 'users', low: 40, high: 2600, profile: 'occupancy', noise: 0.06, decimals: 0, clampMin: 0 },
  'community.sessions': { unit: 'sessions', low: 30, high: 1800, profile: 'occupancy', noise: 0.08, decimals: 0, clampMin: 0 },
  'community.visitors': { unit: 'people', low: 150, high: 14500, profile: 'occupancy', noise: 0.05, decimals: 0, clampMin: 0 },
  'community.kioskQueries': { unit: 'queries', low: 2, high: 260, profile: 'occupancy', noise: 0.1, decimals: 0, clampMin: 0 },
  'community.mentions': { unit: 'mentions', low: 12, high: 180, profile: 'retail', noise: 0.15, decimals: 0, clampMin: 0 },
  'community.sentiment': { unit: '%', low: 78, high: 84, profile: 'flat', noise: 0.3, drift: 300, decimals: 0 },

  // ---- Security ---------------------------------------------------------------------------------
  'security.entries': { unit: 'swipes', low: 4, high: 210, profile: 'office', noise: 0.1, decimals: 0, clampMin: 0 },
  'security.parkingIn': { unit: 'cars/h', low: 5, high: 420, profile: 'occupancy', noise: 0.08, decimals: 0, clampMin: 0 },
  'security.parkingOut': { unit: 'cars/h', low: 8, high: 360, profile: 'retail', noise: 0.1, decimals: 0, clampMin: 0 },
  'security.gateTraffic': { unit: 'vehicles/h', low: 10, high: 520, profile: 'occupancy', noise: 0.08, decimals: 0, clampMin: 0 },

  // ---- Maintenance ------------------------------------------------------------------------------
  'maintenance.opened': { unit: 'tickets', low: 1, high: 14, profile: 'office', noise: 0.25, decimals: 0, clampMin: 0 },
  'maintenance.closed': { unit: 'tickets', low: 1, high: 13, profile: 'office', noise: 0.25, decimals: 0, clampMin: 0 },
} satisfies Record<string, SignalDef>;

export type SignalId = keyof typeof DEFS;

const signals = new Map<string, Signal>(Object.entries(DEFS).map(([id, def]) => [id, new Signal(id, def)]));

export function signal(id: SignalId): Signal {
  return signals.get(id)!;
}

/** Ad-hoc signals for repeated things (area 1..8, tenant 1..40) derived from a template. */
export function derivedSignal(id: string, def: SignalDef): Signal {
  let s = signals.get(id);
  if (!s) {
    s = new Signal(id, def);
    signals.set(id, s);
  }
  return s;
}
