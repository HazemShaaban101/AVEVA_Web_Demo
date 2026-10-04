import type { ReactNode } from 'react';
import { Panel } from '@/components/frame/Panel';
import { BtuIcon, CardIcon, DropIcon, LeafIcon, PowerIcon } from '@/components/icons/UiIcons';
import { ArcVerdict, BarsBody, DialVerdict, RingGauge } from '@/widgets/Widgets';
import { TrendCard } from '@/widgets/TrendCard';
import { bands, vsAverage } from '@/widgets/verdicts';
import { Hairline } from '@/components/controls/Controls';
import { row } from '@/screens/layout';
import { derivedSignal, type SignalId } from '@/sim/catalog';
import { BUILDING_SHARE, scopeAreas, useScope, type ScopeId } from '@/sim/scope';
import type { SignalDef } from '@/sim/signals';
import { useNow } from '@/sim/clock';
import { fmt } from '@/utils/format';

/**
 * Sector A / Sector B per area — the buildings at project scope, the floors inside a building. Every
 * area's values are its share of the scope's total, so bars always add up to the headline figure.
 */
function sectorGroups(prefix: string, def: SignalDef, scope: ScopeId) {
  const areas = scopeAreas(scope);
  const parent = scope === 'project' ? 1 : (BUILDING_SHARE[scope] ?? 0.12);
  return areas.map((area, i) => {
    const k = area.share * parent * areas.length;
    return {
      label: area.label,
      a: derivedSignal(`${prefix}.${scope}.${area.id}.A`, { ...def, low: def.low * k * 0.55, high: def.high * k * (0.5 + ((i * 53) % 10) / 20) }),
      b: derivedSignal(`${prefix}.${scope}.${area.id}.B`, { ...def, low: def.low * k * 0.45, high: def.high * k * (0.45 + ((i * 71) % 10) / 20) }),
    };
  });
}

interface MeterTemplateProps {
  icon: ReactNode;
  gauge: { title: string; subtitle: string; sim: SignalId; max: number; decimals?: number };
  bars: { title: string; subtitle: string; prefix: string; def: SignalDef; yTitle: string };
  trend: { title: string; subtitle: string; sim: SignalId; yTitle: string };
}

/** Gauge + per-building bars on top, history below (design: Water Metering, BTU). */
function MeterTemplate({ icon, gauge, bars, trend }: MeterTemplateProps) {
  const scope = useScope();
  const [g, b] = row(208, 355, 2);
  const [t] = row(588, 358, 1);
  return (
    <>
      <Panel frame={g} index={0} icon={icon} title={gauge.title} subtitle={gauge.subtitle}>
        <DialVerdict source={{ sim: gauge.sim }} max={gauge.max} decimals={gauge.decimals} verdict={vsAverage(0.03)} />
      </Panel>
      <Panel frame={b} index={1} icon={icon} title={bars.title} subtitle={bars.subtitle}>
        <BarsBody groups={sectorGroups(bars.prefix, bars.def, scope)} names={{ a: 'Sector A', b: 'Sector B' }} yTitle={bars.yTitle} xTitle={scope === 'project' ? 'Building' : 'Floor'} unit={bars.def.unit} />
      </Panel>
      <TrendCard frame={t} index={2} icon={icon} title={trend.title} subtitle={trend.subtitle} sim={trend.sim} yTitle={trend.yTitle} />
    </>
  );
}

export function WaterMeteringScreen() {
  return (
    <MeterTemplate
      icon={<DropIcon />}
      gauge={{ title: 'Water Consumption Today', subtitle: 'Cubic Of Meters Used Today', sim: 'metering.waterToday', max: 3000 }}
      bars={{ title: 'Water Usage Per Building', subtitle: 'Environmental Energy Consumption Comparison Graph', prefix: 'water.area', def: { unit: 'm³', low: 60, high: 320, profile: 'retail', noise: 0.08, decimals: 0 }, yTitle: 'Volume (m3)' }}
      trend={{ title: 'Water Consumption History', subtitle: 'Environmental Energy Consumption Comparison Graph', sim: 'metering.water', yTitle: 'Volume (m3/h)' }}
    />
  );
}

export function BtuScreen() {
  return (
    <MeterTemplate
      icon={<BtuIcon />}
      gauge={{ title: 'BTU Consumption Today', subtitle: 'Thermal Energy Delivered Today', sim: 'metering.btuToday', max: 800 }}
      bars={{ title: 'BTU Usage Per Building', subtitle: 'Environmental Energy Consumption Comparison Graph', prefix: 'btu.area', def: { unit: 'MBTU', low: 20, high: 95, profile: 'hvac', noise: 0.08, decimals: 0 }, yTitle: 'Energy (MBTU)' }}
      trend={{ title: 'BTU Consumption History', subtitle: 'Environmental Energy Consumption Comparison Graph', sim: 'metering.btu', yTitle: 'Load (MBTU/h)' }}
    />
  );
}

/** Metering › Energy Metering (design "Energy Metering"). */
export function EnergyMeteringScreen() {
  const [a, b] = row(208, 290, 2);
  const [t] = row(523, 355, 1);
  return (
    <>
      <Panel frame={a} index={0} icon={<CardIcon />} title="Peak Demand" subtitle="Peak Energy Demand Per Hour This Month">
        <DialVerdict source={{ sim: 'metering.peakDemand' }} max={6000} verdict={vsAverage(0.02)} />
      </Panel>
      <Panel frame={b} index={1} icon={<CardIcon />} title="Energy Consumption Load" subtitle="Today's Energy Consumption">
        <DialVerdict source={{ sim: 'metering.load' }} max={6000} verdict={vsAverage(0.03)} />
      </Panel>
      <TrendCard frame={t} index={2} icon={<PowerIcon />} title="Energy Consumption History" subtitle="Environmental Energy Consumption Comparison Graph" sim="metering.energy" yTitle="Energy (MWh)" decimals={2} />
    </>
  );
}

const SYSTEM_SHARES = [
  { name: 'Plumbing', color: '#4fdcff', low: 90, high: 170 },
  { name: 'Metering', color: '#4fc3d4', low: 20, high: 40 },
  { name: 'Electric', color: '#ef4444', low: 150, high: 260 },
  { name: 'Security', color: '#34d399', low: 60, high: 90 },
  { name: 'HVAC', color: '#5b7cff', low: 520, high: 980 },
  { name: 'Safety', color: '#ffffff', low: 40, high: 70 },
];

/** Metering › Energy Analytics (design "Energy Analytics"). */
export function EnergyAnalyticsScreen() {
  const scope = useScope();
  const parent = scope === 'project' ? 1 : (BUILDING_SHARE[scope] ?? 0.12);
  const [a, b] = row(208, 322, 2);
  const [t] = row(555, 420, 1);
  const areas = scopeAreas(scope);
  const groups = areas.map((area, i) => {
    const base = 26 * area.share * parent;
    const d = scope === 'project' ? 1 : 1000; // kWh inside a building, MWh across the project
    return {
      label: area.label,
      a: derivedSignal(`analytics.${scope}.${area.id}.pred`, { unit: 'MWh', low: base * d, high: base * d, profile: 'flat', noise: 0, decimals: 1 }),
      b: derivedSignal(`analytics.${scope}.${area.id}.act`, { unit: 'MWh', low: base * d * (0.85 + (i % 3) * 0.08), high: base * d * (0.85 + (i % 3) * 0.08), profile: 'flat', noise: 0.25, drift: 400, decimals: 1 }),
    };
  });
  return (
    <>
      <Panel frame={a} index={0} icon={<LeafIcon />} title="Energy Efficiency" subtitle="Peak Energy Usage Efficiency In Mall">
        <ArcVerdict
          source={{ sim: 'metering.efficiency' }}
          label="Main Kpi"
          suffix="%"
          verdict={bands([
            { max: 70, text: 'Below Average', tone: 'bad' },
            { max: 78, text: 'Good', tone: 'good' },
            { max: 100, text: 'Above Average', tone: 'warn' },
          ])}
        />
      </Panel>
      <Panel frame={b} index={1} icon={<LeafIcon />} title="Energy Usage Per System" subtitle="How much Energy each system uses of total">
        <SystemShares />
      </Panel>
      <Panel frame={t} index={2} icon={<LeafIcon />} title="Energy Usage Per Building" subtitle="Environmental Energy Consumption Comparison Graph">
        <BarsBody groups={groups} names={{ a: 'Predictive Value', b: 'Actual Value' }} yTitle={scope === 'project' ? 'Energy (MWh)' : 'Energy (kWh)'} xTitle={scope === 'project' ? 'Building' : 'Floor'} unit={scope === 'project' ? 'MWh' : 'kWh'} fillWidth={0.62} />
      </Panel>
    </>
  );
}

function SystemShares() {
  const now = useNow(10_000);
  const hour = new Date(now).getHours();
  const shape = [0.3, 0.25, 0.25, 0.25, 0.3, 0.35, 0.45, 0.6, 0.75, 0.85, 0.95, 1, 1, 1, 1, 0.98, 0.95, 0.95, 0.97, 1, 0.95, 0.8, 0.6, 0.4][hour];
  const segs = SYSTEM_SHARES.map((s) => ({ ...s, value: s.low + (s.high - s.low) * shape }));
  const total = segs.reduce((a, s) => a + s.value, 0);
  return (
    <div className="flex h-full items-center">
      <div className="flex w-[48%] justify-center">
        <RingGauge segments={segs.map((s) => ({ value: s.value, color: s.color }))} value={fmt(total)} unit="Kw" size={200} />
      </div>
      <Hairline height={190} />
      <ul className="grid flex-1 grid-cols-2 gap-x-[30px] gap-y-[16px] pl-[70px] text-[17px] text-ink-2">
        {segs.map((s) => (
          <li key={s.name} className="flex items-center gap-[8px]" title={`${fmt(s.value)} kW · ${fmt((s.value / total) * 100)}%`}>
            <span className="h-[8px] w-[8px] rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            {s.name}
            <span className="ml-auto pr-[20px] text-[14px] text-ink-4">{fmt((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
