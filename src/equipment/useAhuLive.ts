import { useGalaxyObject, type GalaxyObject, type GalaxyPoint } from '@/gateway/galaxy';
import type { AhuRole, AhuUnit } from '@/model/galaxyBindings';

export interface AhuLive {
  unit: AhuUnit;
  obj: GalaxyObject | undefined;
  status: GalaxyObject['status'] | 'loading';
  /** Numeric reading of a role, or null when missing / bad quality. */
  num: (role: AhuRole) => number | null;
  /** True when the role reads 1 / true. */
  on: (role: AhuRole) => boolean;
  point: (role: AhuRole) => GalaxyPoint | undefined;
  /** The derived state the 3D model animates from. */
  model: {
    running: boolean;
    speed: number; // 0..1 from VSD feedback
    freshOpen: boolean;
    returnOpen: boolean;
    valve: number; // 0..1
    filterAlarm: boolean;
    tripped: boolean;
    smoke: boolean;
    flow: boolean;
  };
}

const toNum = (p: GalaxyPoint | undefined): number | null => {
  if (!p || p.quality === 'bad') return null;
  const v = p.value;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
};

/** Live readings of one AHU from the Galaxy, by role (attribute names come from the binding). */
export function useAhuLive(unit: AhuUnit): AhuLive {
  const obj = useGalaxyObject(unit.galaxy);
  const point = (role: AhuRole) => obj?.points[unit.attrs[role]];
  const num = (role: AhuRole) => toNum(point(role));
  const on = (role: AhuRole) => (num(role) ?? 0) > 0;
  const pct = (role: AhuRole) => Math.max(0, Math.min(1, (num(role) ?? 0) / 100));

  const running = on('fanStatus');
  return {
    unit,
    obj,
    status: obj?.status ?? 'loading',
    num,
    on,
    point,
    model: {
      running,
      speed: running ? Math.max(0.15, pct('vsdFb') || pct('vsdCmd')) : 0,
      freshOpen: point('freshDamperSts') ? on('freshDamperSts') : running,
      returnOpen: on('returnDamperSts'),
      valve: pct('valveFb') || pct('valveCmd'),
      filterAlarm: on('filterDps') || on('filter'),
      tripped: on('trip'),
      smoke: on('smoke'),
      flow: on('flow'),
    },
  };
}
