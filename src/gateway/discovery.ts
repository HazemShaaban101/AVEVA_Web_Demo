import type { GalaxyObject } from '@/gateway/galaxy';
import { writeDemo } from '@/gateway/galaxy';
import { DEMO_FCUS } from '@/gateway/demoDevices';

interface ObjectSummary {
  name: string;
  nodeId: string;
  parent: string | null;
  childCount: number;
  variableCount: number;
}

/** Demo build: the demo "Galaxy" objects whose name contains `query` (no network). */
export function useGalaxySearch(query: string): { status: 'loading' | 'done' | 'error'; items: ObjectSummary[] } {
  const q = query.toLowerCase();
  const items = DEMO_FCUS.filter((f) => f.name.toLowerCase().includes(q)).map((f) => ({ name: f.name, nodeId: `demo:${f.name}`, parent: f.parent, childCount: 8, variableCount: 8 }));
  return { status: 'done', items };
}

/** Standard attributes every Galaxy object carries — never mistaken for equipment points. */
const SYSTEM = /^(Alarm|AliasName|Area$|CodeBase|ConfigVersion|ContainedName|Container|Engine|ExecutionRelat|HierarchicalName|Host$|InAlarm|MinorVersion|PropagatedAlarm|ScanState|SecurityGroup|ShortDesc|Tagname|Graphic_)/i;

/** First attribute of the object whose name matches one of the patterns (in order). */
export function findAttr(obj: GalaxyObject | undefined, patterns: RegExp[], exclude?: RegExp): string | undefined {
  if (!obj) return undefined;
  const names = Object.keys(obj.points).filter((n) => !SYSTEM.test(n) && !(exclude && exclude.test(n)));
  for (const p of patterns) {
    const hit = names.find((n) => p.test(n));
    if (hit) return hit;
  }
  return undefined;
}

export interface WriteOutcome {
  accepted: boolean;
  code: string;
  message: string | null;
}

/** Demo build: "FCU_001.SetTemperature" is written to the in-memory demo equipment. */
export async function writeAttribute(fullName: string, value: number | boolean | string): Promise<WriteOutcome> {
  const dot = fullName.indexOf('.');
  const ok = dot > 0 && writeDemo(fullName.slice(0, dot), fullName.slice(dot + 1), value);
  await new Promise((r) => setTimeout(r, 250));
  return ok ? { accepted: true, code: 'ok', message: null } : { accepted: false, code: 'node_not_found', message: `${fullName} is not in the demo.` };
}
