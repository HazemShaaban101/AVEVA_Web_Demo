import type { ReactNode } from 'react';
import { Panel } from '@/components/frame/Panel';
import { Glyph } from '@/components/icons/Glyph';
import { PowerIcon, SensorIcon, TicketIcon } from '@/components/icons/UiIcons';
import { DataTable, Meter, Tag, type TagTone } from '@/components/data/DataTable';
import { RingGauge } from '@/components/gauges/Gauges';
import { KpiBody } from '@/widgets/Widgets';
import { TrendCard } from '@/widgets/TrendCard';
import { row, stack } from '@/screens/layout';
import { pickFrom, useEventStream, type StreamSpec } from '@/sim/events';
import { useNow } from '@/sim/clock';
import { rand01, hashString } from '@/sim/noise';

/* =================================================================================================
 * Ticketing
 * ================================================================================================= */

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
const PRIORITY_TONE: Record<Priority, TagTone> = { Critical: 'bad', High: 'warn', Medium: 'info', Low: 'idle' };
const TICKET_TITLES = [
  ['Cooling tower CT-02 fan bearing noise', 'Mechanical'],
  ['FCU-03 not cooling · A02 GF', 'HVAC'],
  ['Lighting circuit trip · B01 L2', 'Electrical'],
  ['Water leak under sink · C01 washroom', 'Plumbing'],
  ['Door A02 Staff Entrance not latching', 'Access'],
  ['Camera CAM-09 offline', 'Security'],
  ['Booster pump 2 vibration high', 'Mechanical'],
  ['Emergency light test failed · A03', 'Electrical'],
  ['Filter replacement due · AHU-03', 'HVAC'],
] as const;
const TECHS = ['M. Adel', 'S. Fawzy', 'H. Samy', 'R. Nabil', 'K. Hosny', 'Unassigned'];

type Ticket = { no: string; title: string; trade: string; priority: Priority; tech: string };
const TICKETS: StreamSpec<Ticket> = {
  id: 'maintenance.tickets',
  peakPerHour: 9,
  profile: 'office',
  make: (k, rnd) => {
    const [title, trade] = pickFrom(TICKET_TITLES, rnd(1));
    const r = rnd(2);
    return { no: `WO-${2200 + (k % 7000)}`, title, trade, priority: r < 0.08 ? 'Critical' : r < 0.25 ? 'High' : r < 0.7 ? 'Medium' : 'Low', tech: pickFrom(TECHS, rnd(3)) };
  },
};

/** A ticket's state follows its age: new → in progress → resolved (or overdue for high priority). */
function ticketState(t: number, now: number, p: Priority, key: string): [string, TagTone] {
  const age = (now - t) / 60_000;
  const r = rand01(hashString(key), 5);
  const sla = p === 'Critical' ? 60 : p === 'High' ? 240 : p === 'Medium' ? 480 : 1440;
  if (age < 15) return ['New', 'info'];
  if (age < sla * (0.3 + r * 0.9)) return ['In Progress', 'warn'];
  if (r < 0.18 && age > sla) return ['Overdue', 'bad'];
  return ['Resolved', 'good'];
}

/** Open / overdue / closed counts of the work-order stream, for the 3D View's ticketing KPI. */
export function useTicketSummary() {
  const now = useNow(10_000);
  const tickets = useEventStream(TICKETS, 40, 3 * 86_400_000);
  const states = tickets.map((e) => ticketState(e.t, now, e.data.priority, e.key)[0]);
  return {
    open: states.filter((s) => s === 'New' || s === 'In Progress').length,
    overdue: states.filter((s) => s === 'Overdue').length,
    closed: states.filter((s) => s === 'Resolved').length,
  };
}

export function TicketingScreen() {
  const now = useNow(10_000);
  const tickets = useEventStream(TICKETS, 40, 3 * 86_400_000);
  const rows = tickets.map((e) => ({ ...e, state: ticketState(e.t, now, e.data.priority, e.key) }));
  const open = rows.filter((r) => r.state[0] !== 'Resolved');
  const kpis = row(208, 150, 4);
  const [table, side] = row(383, 595, [1180, 611]);
  const [trend, trades] = stack(side.x, side.w, 383, [285, 285]);
  const icon = <TicketIcon />;
  const age = (t: number) => {
    const m = Math.round((now - t) / 60_000);
    return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
  };
  const byTrade = [...new Set(open.map((r) => r.data.trade))].map((t) => ({ t, n: open.filter((r) => r.data.trade === t).length })).sort((a, b) => b.n - a.n);

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={icon} title="Open Tickets" subtitle="New + in progress">
        <KpiBody source={{ fixed: open.length }} decimals={0} unit="" note={`${rows.filter((r) => r.state[0] === 'New').length} new`} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={icon} title="Critical" subtitle="Open, critical priority">
        <KpiBody source={{ fixed: open.filter((r) => r.data.priority === 'Critical').length }} decimals={0} unit="" note={<Tag tone="bad">1 h SLA</Tag>} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={icon} title="Overdue" subtitle="Past their SLA">
        <KpiBody source={{ fixed: rows.filter((r) => r.state[0] === 'Overdue').length }} decimals={0} unit="" note="Escalated to supervisor" />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={icon} title="Mean Time To Repair" subtitle="Last 7 days">
        <KpiBody source={{ fixed: 3.4 }} decimals={1} unit="h" note={<Tag tone="good">−12% vs last week</Tag>} />
      </Panel>

      <Panel frame={table} index={4} icon={icon} title="Work Orders" subtitle="Created automatically from alarms, or by staff">
        <div className="absolute inset-x-[4px] bottom-[10px] top-[8px]">
          <DataTable
            rows={rows}
            rowKey={(r) => r.key}
            highlight={(r) => (r.state[0] === 'Overdue' ? 'alarm' : r.data.priority === 'Critical' && r.state[0] !== 'Resolved' ? 'warn' : null)}
            columns={[
              { key: 'no', header: 'Ticket', width: 100, render: (r) => <span className="font-mono text-[13px] text-white">{r.data.no}</span> },
              { key: 'title', header: 'Issue', render: (r) => r.data.title },
              { key: 'trade', header: 'Trade', width: 110, render: (r) => r.data.trade },
              { key: 'p', header: 'Priority', width: 110, render: (r) => <Tag tone={PRIORITY_TONE[r.data.priority]}>{r.data.priority}</Tag> },
              { key: 'tech', header: 'Assignee', width: 110, render: (r) => r.data.tech },
              { key: 's', header: 'Status', width: 130, render: (r) => <Tag tone={r.state[1]}>{r.state[0]}</Tag> },
              { key: 'age', header: 'Age', width: 70, align: 'right', render: (r) => <span className="text-ink-3">{age(r.t)}</span> },
            ]}
          />
        </div>
      </Panel>
      <TrendCard frame={trend} index={5} icon={icon} title="Opened vs Closed" subtitle="Tickets per hour" sim="maintenance.opened" compare="maintenance.closed" names={{ actual: 'Opened', predictive: 'Closed' }} yTitle="Tickets" decimals={0} dayHours={12} />
      <Panel frame={trades} index={6} icon={icon} title="Open By Trade" subtitle="Where the work is">
        <div className="absolute inset-x-[20px] top-[8px] flex flex-col gap-[10px]">
          {byTrade.slice(0, 6).map(({ t, n }) => (
            <div key={t} className="flex items-center justify-between text-[15px] text-ink-2">
              <span className="w-[120px] text-white">{t}</span>
              <Meter value={(n / Math.max(1, open.length)) * 100} tone="info" width={260} />
              <span className="w-[28px] text-right text-ink-3">{n}</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* =================================================================================================
 * Asset health — one template for Mechanical, Electrical, Pumps and Sensors
 * ================================================================================================= */

interface AssetDef {
  prefix: string;
  names: string[];
  locations: string[];
  count: number;
}

interface AssetScreenConfig {
  key: string;
  title: string;
  icon: ReactNode;
  assets: AssetDef;
  /** Sensors show battery and signal instead of preventive maintenance. */
  sensors?: boolean;
}

interface Asset {
  tag: string;
  name: string;
  location: string;
  health: number;
  nextPmDays: number;
  battery: number;
  lastSeenMin: number;
  status: [string, TagTone];
}

function buildAssets(cfg: AssetScreenConfig, day: number): Asset[] {
  const seed = hashString(cfg.key);
  return Array.from({ length: cfg.assets.count }, (_, i) => {
    const r = (s: number) => rand01(i * 13 + s, seed);
    const health = Math.round(35 + r(1) * 65 - (day % 7) * r(2));
    const battery = Math.round(8 + r(3) * 92);
    const lastSeenMin = r(4) < 0.06 ? 60 + Math.round(r(5) * 600) : Math.round(r(6) * 5);
    const status: [string, TagTone] = cfg.sensors
      ? lastSeenMin > 30
        ? ['Offline', 'bad']
        : battery < 20
          ? ['Low Battery', 'warn']
          : ['Online', 'good']
      : health < 45
        ? ['Fault', 'bad']
        : health < 65
          ? ['Attention', 'warn']
          : ['Healthy', 'good'];
    return {
      tag: `${cfg.assets.prefix}-${String(i + 1).padStart(2, '0')}`,
      name: pickFrom(cfg.assets.names, r(7)),
      location: pickFrom(cfg.assets.locations, r(8)),
      health,
      nextPmDays: Math.round(r(9) * 40) - 3,
      battery,
      lastSeenMin,
      status,
    };
  });
}

const LOCS = ['A02 GF', 'A02 R', 'A01 Plant', 'B01 L1', 'B02 Roof', 'C01 Basement', 'Central Plant', 'Car Park B2'];

export const ASSET_SCREENS: Record<string, AssetScreenConfig> = {
  mechanical: {
    key: 'mechanical',
    title: 'Mechanical Assets',
    icon: <Glyph id="gear" size={20} color="#ffffff" />,
    assets: { prefix: 'MEC', names: ['Chiller', 'Cooling Tower', 'AHU', 'Exhaust Fan', 'Fire Shutter', 'Heat Exchanger', 'Air Compressor', 'Smoke Extract Fan'], locations: LOCS, count: 24 },
  },
  electrical: {
    key: 'electrical',
    title: 'Electrical Assets',
    icon: <PowerIcon />,
    assets: { prefix: 'ELC', names: ['Transformer', 'MDB', 'SMDB', 'Generator', 'UPS', 'ATS', 'Capacitor Bank', 'Lighting Panel'], locations: LOCS, count: 22 },
  },
  pumps: {
    key: 'pumps',
    title: 'Pump Assets',
    icon: <Glyph id="wrench" size={20} color="#ffffff" />,
    assets: { prefix: 'PMP', names: ['Booster Pump', 'Chilled Water Pump', 'Condenser Pump', 'Fire Jockey Pump', 'Sump Pump', 'Irrigation Pump', 'Hot Water Pump'], locations: LOCS, count: 18 },
  },
  sensors: {
    key: 'sensors',
    title: 'Sensors',
    icon: <SensorIcon />,
    sensors: true,
    assets: { prefix: 'SNS', names: ['Temp/RH Sensor', 'CO₂ Sensor', 'People Counter', 'Leak Detector', 'Occupancy Sensor', 'Vibration Sensor', 'Motion Sensor'], locations: LOCS, count: 30 },
  },
};

export function AssetHealthScreen({ config }: { config: AssetScreenConfig }) {
  const now = useNow(60_000);
  const assets = buildAssets(config, Math.floor(now / 86_400_000));
  const kpis = row(208, 150, 4);
  const [table, side] = row(383, 595, [1180, 611]);
  const [ring, list] = stack(side.x, side.w, 383, [285, 285]);
  const good = assets.filter((a) => a.status[1] === 'good').length;
  const warn = assets.filter((a) => a.status[1] === 'warn').length;
  const bad = assets.filter((a) => a.status[1] === 'bad').length;
  const due = assets.filter((a) => a.nextPmDays <= 7).sort((a, b) => a.nextPmDays - b.nextPmDays);
  const s = config.sensors;

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={config.icon} title={s ? 'Sensors' : 'Assets'} subtitle="Registered">
        <KpiBody source={{ fixed: assets.length }} decimals={0} unit="" note={config.title} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={config.icon} title={s ? 'Online' : 'Healthy'} subtitle="Share of fleet">
        <KpiBody source={{ fixed: (good / assets.length) * 100 }} decimals={0} unit="%" note={<Tag tone="good">{good} of {assets.length}</Tag>} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={config.icon} title={s ? 'Low Battery' : 'PM Due ≤ 7 Days'} subtitle={s ? 'Below 20%' : 'Preventive maintenance'}>
        <KpiBody source={{ fixed: s ? warn : due.length }} decimals={0} unit="" note={s ? 'Replace on next round' : `${due.filter((d) => d.nextPmDays < 0).length} overdue`} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={config.icon} title={s ? 'Offline' : 'Faults'} subtitle="Need attention now">
        <KpiBody source={{ fixed: bad }} decimals={0} unit="" note={<Tag tone={bad ? 'bad' : 'good'}>{bad ? 'Tickets raised' : 'None'}</Tag>} />
      </Panel>

      <Panel frame={table} index={4} icon={config.icon} title={config.title} subtitle={s ? 'Battery, signal and last report' : 'Condition score from runtime, alarms and inspections'}>
        <div className="absolute inset-x-[4px] bottom-[10px] top-[8px]">
          <DataTable
            dense
            rows={assets}
            rowKey={(a) => a.tag}
            highlight={(a) => (a.status[1] === 'bad' ? 'alarm' : a.status[1] === 'warn' ? 'warn' : null)}
            columns={[
              { key: 'tag', header: 'Tag', width: 90, render: (a) => <span className="font-mono text-[13px] text-white">{a.tag}</span> },
              { key: 'name', header: 'Asset', render: (a) => a.name },
              { key: 'loc', header: 'Location', width: 140, render: (a) => a.location },
              s
                ? { key: 'bat', header: 'Battery', width: 190, render: (a) => <Meter value={a.battery} tone={a.battery < 20 ? 'warn' : 'good'} width={120} /> }
                : { key: 'h', header: 'Health', width: 190, render: (a) => <Meter value={a.health} tone={a.status[1]} width={120} /> },
              s
                ? { key: 'seen', header: 'Last Seen', width: 110, render: (a) => <span className="text-ink-3">{a.lastSeenMin < 1 ? 'now' : `${a.lastSeenMin} min`}</span> }
                : { key: 'pm', header: 'Next PM', width: 110, render: (a) => <span className={a.nextPmDays < 0 ? 'text-alarm-soft' : 'text-ink-3'}>{a.nextPmDays < 0 ? `${-a.nextPmDays} d late` : `in ${a.nextPmDays} d`}</span> },
              { key: 'st', header: 'Status', width: 130, render: (a) => <Tag tone={a.status[1]}>{a.status[0]}</Tag> },
            ]}
          />
        </div>
      </Panel>
      <Panel frame={ring} index={5} icon={config.icon} title={s ? 'Fleet Status' : 'Condition'} subtitle="Distribution">
        <div className="flex h-full items-center pb-[8px]">
          <div className="flex w-[50%] justify-center">
            <RingGauge value={`${Math.round((good / assets.length) * 100)}%`} unit={s ? 'online' : 'healthy'} size={180} segments={[{ value: good, color: '#7fcf9d' }, { value: warn, color: '#9d78ff' }, { value: bad, color: '#d96b84' }]} />
          </div>
          <div className="flex flex-col gap-[12px]">
            <Tag tone="good">{s ? 'Online' : 'Healthy'} · {good}</Tag>
            <Tag tone="warn">{s ? 'Low battery' : 'Attention'} · {warn}</Tag>
            <Tag tone="bad">{s ? 'Offline' : 'Fault'} · {bad}</Tag>
          </div>
        </div>
      </Panel>
      <Panel frame={list} index={6} icon={config.icon} title={s ? 'Recently Offline' : 'Upcoming Maintenance'} subtitle={s ? 'Not reporting' : 'Next 7 days'}>
        <div className="pf-scroll absolute inset-x-[18px] bottom-[10px] top-[8px]">
          {(s ? assets.filter((a) => a.status[0] === 'Offline') : due).slice(0, 7).map((a) => (
            <div key={a.tag} className="flex items-center justify-between border-b border-white/[0.06] py-[7px] text-[14px] text-ink-2">
              <span>
                <span className="font-mono text-[12px] text-white">{a.tag}</span> · {a.name}
              </span>
              <span className={s || a.nextPmDays < 0 ? 'text-alarm-soft' : 'text-warn'}>{s ? `${a.lastSeenMin} min ago` : a.nextPmDays < 0 ? 'overdue' : a.nextPmDays === 0 ? 'today' : `in ${a.nextPmDays} d`}</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

export const MechanicalScreen = () => <AssetHealthScreen config={ASSET_SCREENS.mechanical} />;
export const ElectricalScreen = () => <AssetHealthScreen config={ASSET_SCREENS.electrical} />;
export const MaintenancePumpsScreen = () => <AssetHealthScreen config={ASSET_SCREENS.pumps} />;
export const SensorsScreen = () => <AssetHealthScreen config={ASSET_SCREENS.sensors} />;

