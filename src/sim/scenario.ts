import { create } from 'zustand';

export type Severity = 'critical' | 'warning' | 'info';

export interface PlatformNotification {
  id: string;
  time: number;
  system: string;
  severity: Severity;
  title: string;
  detail: string;
  /** Where "View" goes. */
  route?: string;
  read: boolean;
}

export interface FireAlarmState {
  active: boolean;
  triggeredAt: number | null;
  /** Detectors in alarm (ids from model/site.ts fireZones). */
  detectors: string[];
  zone: number | null;
  lastAlarmAt: number;
  lastResolvedAt: number | null;
}

/**
 * Utility (mains) failure drill: the MV incomers lose voltage, the generators start and take the
 * essential board through its ATS, and the UPS units ride through on battery until they do.
 */
export interface MainsState {
  failed: boolean;
  /** When the utility went down (null while healthy). */
  failedAt: number | null;
  /** When it came back: the generators keep running unloaded for their cool-down. */
  restoredAt: number | null;
}

export interface FcuState {
  on: boolean;
  fan: 1 | 2 | 3;
  mode: 'Cooling' | 'Heating' | 'Fan';
  setpoint: number;
}

interface ScenarioStore {
  fire: FireAlarmState;
  mains: MainsState;
  notifications: PlatformNotification[];
  fcus: Record<string, FcuState>;
  dampers: Record<string, boolean>;

  triggerFireAlarm: () => void;
  resolveFireAlarm: () => void;
  failMains: () => void;
  restoreMains: () => void;
  notify: (n: Omit<PlatformNotification, 'id' | 'time' | 'read'>) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  setFcu: (id: string, patch: Partial<FcuState>) => void;
  setDamper: (id: string, open: boolean) => void;
}

const yesterdayAt = (h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

let seq = 0;
const nid = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Scenario-driven parts of the simulation: things that happen because someone did something (a fire
 * drill, an operator switching an FCU off) rather than because time passed. Shared by every screen,
 * so a fire alarm raised on the Fire System screen lights up the site map, the 3D view and the bell.
 */
export const useScenario = create<ScenarioStore>((set, get) => ({
  fire: {
    active: false,
    triggeredAt: null,
    detectors: [],
    zone: null,
    lastAlarmAt: yesterdayAt(16, 32),
    lastResolvedAt: yesterdayAt(16, 49),
  },
  notifications: [
    {
      id: nid(),
      time: Date.now() - 42 * 60_000,
      system: 'BMS',
      severity: 'warning',
      title: 'Filter ΔP rising',
      detail: 'FAHU-01 filter differential pressure at 78% of limit. Schedule replacement.',
      route: '/maintenance/mechanical',
      read: false,
    },
    {
      id: nid(),
      time: Date.now() - 3 * 3_600_000,
      system: 'Maintenance',
      severity: 'info',
      title: 'Work order closed',
      detail: 'WO-2291 Escalator E-04 handrail inspection completed.',
      route: '/maintenance/ticketing',
      read: true,
    },
  ],
  mains: { failed: false, failedAt: null, restoredAt: null },
  fcus: {},
  dampers: {},

  triggerFireAlarm: () => {
    if (get().fire.active) return;
    const now = Date.now();
    set((s) => ({
      fire: { ...s.fire, active: true, triggeredAt: now, detectors: ['Z1-D07', 'Z1-D08', 'Z1-D11'], zone: 1, lastAlarmAt: now },
    }));
    get().notify({
      system: 'Fire',
      severity: 'critical',
      title: 'Fire alarm — Zone 1',
      detail: 'Smoke detected by 3 detectors in Zone 1 (east blocks). Fire pumps started automatically.',
      route: '/fire/detection',
    });
  },

  resolveFireAlarm: () => {
    if (!get().fire.active) return;
    set((s) => ({ fire: { ...s.fire, active: false, detectors: [], zone: null, lastResolvedAt: Date.now() } }));
    get().notify({ system: 'Fire', severity: 'info', title: 'Fire alarm resolved', detail: 'Zone 1 reset by operator. Pumps returned to standby.', route: '/fire/system' });
  },

  failMains: () => {
    if (get().mains.failed) return;
    set({ mains: { failed: true, failedAt: Date.now(), restoredAt: null } });
    get().notify({
      system: 'Electric',
      severity: 'critical',
      title: 'Utility supply lost',
      detail: 'Both 22 kV incomers dead. Generators starting; UPS units on battery until the essential board transfers.',
      route: '/electric/sld',
    });
  },

  restoreMains: () => {
    if (!get().mains.failed) return;
    set((s) => ({ mains: { ...s.mains, failed: false, restoredAt: Date.now() } }));
    get().notify({ system: 'Electric', severity: 'info', title: 'Utility supply restored', detail: 'Essential board back on mains. Generators unloaded and cooling down.', route: '/electric/generators' });
  },

  notify: (n) => set((s) => ({ notifications: [{ ...n, id: nid(), time: Date.now(), read: false }, ...s.notifications].slice(0, 50) })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  dismiss: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setFcu: (id, patch) =>
    set((s) => ({ fcus: { ...s.fcus, [id]: { ...(s.fcus[id] ?? DEFAULT_FCU), ...patch } } })),
  setDamper: (id, open) => set((s) => ({ dampers: { ...s.dampers, [id]: open } })),
}));

export const DEFAULT_FCU: FcuState = { on: true, fan: 2, mode: 'Cooling', setpoint: 22 };
