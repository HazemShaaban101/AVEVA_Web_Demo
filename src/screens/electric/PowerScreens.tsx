import { Panel } from '@/components/frame/Panel';
import { AssetPanel } from '@/components/frame/AssetPanel';
import { Readings } from '@/components/data/Readings';
import { Meter, Tag, type TagTone } from '@/components/data/DataTable';
import { RingGauge } from '@/components/gauges/Gauges';
import { KpiBody } from '@/widgets/Widgets';
import { row } from '@/screens/layout';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import {
  BULK_TANK,
  FUEL_TANK_TEMPLATE,
  GENSET_TEMPLATE,
  GENSETS,
  UPS_TEMPLATE,
  UPS_UNITS,
  bulkTankValues,
  essentialLoadKw,
  gensetPhase,
  gensetValues,
  upsValues,
  type GenPhase,
} from '@/model/assets/electrical';

const num = (v: unknown) => (typeof v === 'number' ? v : 0);

export const GenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 9.5A4 4 0 1 0 16 13h-3.5" strokeLinecap="round" />
  </svg>
);

export const BatteryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" aria-hidden>
    <rect x="3" y="7" width="16" height="10" rx="2" />
    <path d="M21 10.5v3M7 12h6M10 9v6" strokeLinecap="round" />
  </svg>
);

const PHASE_TAG: Record<GenPhase, [string, TagTone]> = {
  standby: ['Standby', 'idle'],
  cranking: ['Cranking', 'warn'],
  running: ['Running · no load', 'info'],
  onLoad: ['On load', 'good'],
  coolDown: ['Cooling down', 'info'],
};

/* =================================================================================================
 * Utility failure drill (shared by Generators, UPS and the SLD)
 * ================================================================================================= */

export function DrillControl({ compact }: { compact?: boolean }) {
  const now = useNow(1000);
  const mains = useScenario((s) => s.mains);
  const fail = useScenario((s) => s.failMains);
  const restore = useScenario((s) => s.restoreMains);
  const { phase, since } = gensetPhase(mains, now);
  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const status = mains.failed
    ? phase === 'cranking'
      ? 'Utility lost · generators cranking'
      : phase === 'running'
        ? 'Generators up to speed · synchronising'
        : `Essential board on generators · ${mmss(since)}`
    : phase === 'coolDown'
      ? `Utility restored · generators cooling down (${Math.ceil(60 - since)} s)`
      : 'Utility healthy · both 22 kV incomers live';
  return (
    <div className={compact ? 'flex items-center gap-[14px]' : 'flex h-full flex-col justify-center gap-[14px] px-[22px] pb-[14px]'}>
      <span className="flex items-center gap-[10px] text-[15px]" style={{ color: mains.failed ? '#e0889b' : phase === 'coolDown' ? '#f0c3ab' : '#bbaacb' }}>
        <span className="h-[9px] w-[9px] rounded-full" style={{ background: 'currentColor', boxShadow: '0 0 10px currentColor', animation: mains.failed ? 'pf-alarm-blink 1s infinite' : undefined }} />
        {status}
      </span>
      <button
        onClick={mains.failed ? restore : fail}
        className="h-[40px] self-start rounded-[8px] border px-[18px] text-[15px] transition-colors"
        style={{ borderColor: 'rgba(157,120,255,0.5)', color: '#e4ccff', background: 'rgba(157,120,255,0.08)' }}
      >
        {mains.failed ? 'Restore utility supply' : 'Simulate utility failure'}
      </button>
    </div>
  );
}

/* =================================================================================================
 * Electric › Generators
 * ================================================================================================= */

export function GeneratorsScreen() {
  const now = useNow(1000);
  const mains = useScenario((s) => s.mains);
  const { phase } = gensetPhase(mains, now);
  const gens = GENSETS.map((g, i) => ({ g, v: gensetValues(g, i, mains, now) }));
  const ready = gens.filter((x) => x.v.Status_Available && x.v.Mode === 2).length;
  const onLoad = gens.filter((x) => x.v.GCB_Closed).length;
  const ess = essentialLoadKw(now);
  const capacity = GENSETS.reduce((a, g) => a + g.ratedKw, 0);
  const tank = bulkTankValues(now, phase !== 'standby');
  const litresPerHour = GENSETS.length * 30 + (280 * ess) / GENSETS[0].ratedKw;
  const autonomyH = num(tank.Volume_L) / litresPerHour;

  const kpis = row(208, 140, 4);
  const cards = row(373, 395, 4);
  const [fuel, drill] = row(793, 185, [1.45, 1]);
  const icon = <GenIcon />;

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={icon} title="Generators Ready" subtitle="In Auto, no shutdown alarm">
        <KpiBody source={{ fixed: ready }} decimals={0} unit={`/ ${GENSETS.length}`} note={ready === GENSETS.length ? 'Start on mains failure' : 'Check controller'} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={icon} title="On Load" subtitle="Generator breakers closed">
        <KpiBody source={{ fixed: onLoad }} decimals={0} unit={`/ ${GENSETS.length}`} note={onLoad ? <Tag tone="warn">Essential board on generators</Tag> : 'Mains supplying the site'} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={icon} title="Essential Load" subtitle="Fire, smoke extract, lifts, UPS">
        <KpiBody source={{ fixed: ess }} decimals={0} unit="kW" note={`${fmt((ess / capacity) * 100)}% of ${fmt(capacity)} kW`} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={icon} title="Fuel Autonomy" subtitle="Bulk tank at essential load">
        <KpiBody source={{ fixed: autonomyH }} decimals={1} unit="h" note={`${fmt(num(tank.Volume_L))} L in bulk tank`} />
      </Panel>

      {gens.map(({ g, v }, i) => {
        const [text, tone] = PHASE_TAG[phase];
        const load = num(v.Load_Pct);
        return (
          <AssetPanel key={g.tag} frame={cards[i]} index={4 + i} icon={icon} title={`${g.label} · ${g.ratedKva} kVA`} subtitle={`${g.tag} · Energy centre`} points={{ tag: g.tag, template: GENSET_TEMPLATE, values: v }}>
            <div className="absolute inset-x-[18px] bottom-[14px] top-[2px] flex flex-col gap-[12px]">
              <div className="flex flex-wrap items-center gap-[8px]">
                <Tag tone={tone}>{text}</Tag>
                <Tag tone="idle" dot={false}>
                  Auto
                </Tag>
                <Tag tone={v.GCB_Closed ? 'good' : 'idle'} dot={false}>
                  {v.GCB_Closed ? 'GCB closed' : 'GCB open'}
                </Tag>
                {v.Fuel_Low && <Tag tone="warn">Fuel low</Tag>}
              </div>
              <div className="flex items-end justify-between">
                <span className="text-[44px] leading-none text-white tabular-nums">
                  {fmt(num(v.Output_kW))}
                  <span className="ml-[6px] text-[18px] text-ink-3">kW</span>
                </span>
                <span className="pb-[4px] text-[14px] text-ink-3">
                  {fmt(load)}% of {fmt(g.ratedKw)} kW
                </span>
              </div>
              <Meter value={load} tone={load > 85 ? 'bad' : load > 0 ? 'good' : 'idle'} width={cards[i].w - 40} label={false} />
              <Readings
                size={14}
                items={[
                  { label: 'Voltage L-L', value: `${fmt(num(v.Voltage_LL))} V` },
                  { label: 'Current', value: `${fmt(num(v.Current_Avg))} A` },
                  { label: 'Frequency', value: `${fmt(num(v.Frequency), 2)} Hz` },
                  { label: 'Power factor', value: num(v.Power_Factor) ? fmt(num(v.Power_Factor), 2) : '—' },
                  { label: 'Engine speed', value: `${fmt(num(v.Engine_Speed))} rpm` },
                  { label: 'Oil pressure', value: `${fmt(num(v.Oil_Pressure), 1)} bar` },
                  { label: 'Coolant', value: `${fmt(num(v.Coolant_Temp))} °C` },
                  { label: 'Battery', value: `${fmt(num(v.Battery_Voltage), 1)} V`, tone: num(v.Battery_Voltage) < 22 ? 'warn' : undefined },
                  { label: 'Day tank', value: `${fmt(num(v.Fuel_Level))} %`, tone: v.Fuel_Low ? 'warn' : undefined },
                  { label: 'Run hours', value: `${fmt(num(v.Run_Hours), 1)} h` },
                ]}
              />
            </div>
          </AssetPanel>
        );
      })}

      <AssetPanel frame={fuel} index={8} icon={icon} title="Fuel System" subtitle={`${BULK_TANK.tag} · 20,000 L bulk tank → day tanks`} points={{ tag: BULK_TANK.tag, template: FUEL_TANK_TEMPLATE, values: tank }}>
        <div className="absolute inset-x-[20px] top-[6px] flex items-start gap-[36px]">
          <div className="flex w-[300px] flex-col gap-[8px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[30px] leading-none text-white tabular-nums">{fmt(num(tank.Level_Pct))}%</span>
              <span className="text-[13px] text-ink-3">{fmt(num(tank.Volume_L))} L</span>
            </div>
            <Meter value={num(tank.Level_Pct)} tone="info" width={300} label={false} />
            <span className="text-[13px] text-ink-3">Transfer pump {tank.Transfer_Pump_Running ? <span className="text-ok">running</span> : 'idle'} · no leak</span>
          </div>
          <div className="flex flex-1 justify-between">
            {gens.map(({ g, v }) => (
              <div key={g.tag} className="flex flex-col items-center gap-[6px] text-[13px]">
                <span className="text-ink-3">{g.label} day tank</span>
                <Meter value={num(v.Fuel_Level)} tone={v.Fuel_Low ? 'warn' : 'good'} width={110} label={false} />
                <span className={v.Fuel_Low ? 'text-warn' : 'text-white'}>{fmt(num(v.Fuel_Level))}%</span>
              </div>
            ))}
          </div>
        </div>
      </AssetPanel>
      <Panel frame={drill} index={9} icon={icon} title="Utility Failure Drill" subtitle="Both 22 kV incomers lost → generators take the essential board">
        <DrillControl />
      </Panel>
    </>
  );
}

/* =================================================================================================
 * Electric › UPS
 * ================================================================================================= */

const SOURCE_TAG: Record<number, [string, TagTone]> = { 3: ['Online', 'good'], 4: ['Bypass', 'warn'], 5: ['On battery', 'bad'] };
const REQUIRED_MIN = 15;

export function UpsScreen() {
  const now = useNow(1000);
  const mains = useScenario((s) => s.mains);
  const units = UPS_UNITS.map((u) => ({ u, v: upsValues(u, mains, now) }));
  const online = units.filter((x) => x.v.Output_Source === 3).length;
  const critical = units.reduce((a, x) => a + num(x.v.Output_kW), 0);
  const shortest = units.reduce((m, x) => (num(x.v.Runtime_Min) < num(m.v.Runtime_Min) ? x : m), units[0]);
  const alarms = units.filter((x) => num(x.v.Alarms_Present) > 0);

  const kpis = row(208, 140, 4);
  const cards = row(373, 395, 4);
  const [autonomy, drill] = row(793, 185, [1.45, 1]);
  const icon = <BatteryIcon />;

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={icon} title="UPS Online" subtitle="Double conversion, on mains">
        <KpiBody source={{ fixed: online }} decimals={0} unit={`/ ${units.length}`} note={online === units.length ? 'All loads protected' : <Tag tone="bad">{units.length - online} on battery</Tag>} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={icon} title="Critical Load" subtitle="Sum of UPS outputs">
        <KpiBody source={{ fixed: critical }} decimals={0} unit="kW" note="Data centre, security, BMS" />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={icon} title="Shortest Autonomy" subtitle="Battery runtime at present load">
        <KpiBody source={{ fixed: num(shortest.v.Runtime_Min) }} decimals={0} unit="min" note={shortest.u.label} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={icon} title="Battery Alarms" subtitle="upsAlarmsPresent > 0">
        <KpiBody source={{ fixed: alarms.length }} decimals={0} unit="" note={alarms.length ? <Tag tone="warn">{alarms.map((a) => a.u.label).join(', ')}</Tag> : 'None'} />
      </Panel>

      {units.map(({ u, v }, i) => {
        const [text, tone] = SOURCE_TAG[num(v.Output_Source)] ?? ['Unknown', 'idle'];
        const load = num(v.Output_Load_Pct);
        const charge = num(v.Battery_Charge_Pct);
        const hot = num(v.Battery_Temp) > 30;
        return (
          <AssetPanel key={u.tag} frame={cards[i]} index={4 + i} icon={icon} title={`${u.label} · ${u.kva} kVA`} subtitle={`${u.tag} · ${u.serves}`} points={{ tag: u.tag, template: UPS_TEMPLATE, values: v }}>
            <div className="absolute inset-x-[18px] bottom-[14px] top-[2px] flex flex-col gap-[10px]">
              <div className="flex items-center gap-[8px]">
                <Tag tone={tone}>{text}</Tag>
                {hot && <Tag tone="warn">Battery temp high</Tag>}
              </div>
              <div className="flex items-center gap-[16px]">
                <RingGauge size={132} value={`${fmt(load)}%`} unit="load" segments={[{ value: load, color: load > 80 ? '#e8a98c' : '#b58ce3' }, { value: 100 - load, color: 'rgba(255,255,255,0.08)' }]} />
                <div className="flex flex-1 flex-col gap-[6px]">
                  <span className="text-[13px] text-ink-3">Battery</span>
                  <span className="text-[32px] leading-none text-white tabular-nums">
                    {fmt(charge)}
                    <span className="ml-[4px] text-[16px] text-ink-3">%</span>
                  </span>
                  <Meter value={charge} tone={charge < 30 ? 'bad' : charge < 99 ? 'warn' : 'good'} width={cards[i].w - 190} label={false} />
                  <span className="text-[14px] text-ink-2">
                    {fmt(num(v.Runtime_Min))} min runtime
                  </span>
                </div>
              </div>
              <Readings
                size={14}
                items={[
                  { label: 'Input', value: num(v.Input_Voltage) ? `${fmt(num(v.Input_Voltage))} V · ${fmt(num(v.Input_Frequency), 1)} Hz` : 'No input', tone: num(v.Input_Voltage) ? undefined : 'bad' },
                  { label: 'Output', value: `${fmt(num(v.Output_Voltage))} V · ${fmt(num(v.Output_kW), 1)} kW` },
                  { label: 'Battery', value: `${fmt(num(v.Battery_Voltage))} V · ${fmt(num(v.Battery_Current), 1)} A` },
                  { label: 'Battery temp', value: `${fmt(num(v.Battery_Temp), 1)} °C`, tone: hot ? 'warn' : undefined },
                  { label: 'On battery', value: `${fmt(num(v.Seconds_On_Battery))} s`, tone: num(v.Seconds_On_Battery) ? 'bad' : undefined },
                  { label: 'Self-test', value: String(v.Last_Self_Test).split(' · ').slice(0, 2).join(' · ') },
                ]}
              />
            </div>
          </AssetPanel>
        );
      })}

      <Panel frame={autonomy} index={8} icon={icon} title="Autonomy vs Requirement" subtitle={`Battery runtime at present load · ${REQUIRED_MIN} min required`}>
        <div className="absolute inset-x-[22px] top-[8px] flex flex-col gap-[10px]">
          {units.map(({ u, v }) => {
            const rt = num(v.Runtime_Min);
            const scale = 60;
            return (
              <div key={u.tag} className="flex items-center gap-[14px] text-[13px]">
                <span className="w-[64px] text-white">{u.label}</span>
                <div className="relative h-[8px] flex-1 rounded-full bg-white/[0.07]">
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (rt / scale) * 100)}%`, background: rt < REQUIRED_MIN ? '#d96b84' : '#b58ce3', transition: 'width .6s' }} />
                  <span className="absolute -top-[4px] h-[16px] w-[2px] bg-accent" style={{ left: `${(REQUIRED_MIN / scale) * 100}%` }} title={`${REQUIRED_MIN} min required`} />
                </div>
                <span className={`w-[64px] text-right tabular-nums ${rt < REQUIRED_MIN ? 'text-alarm-soft' : 'text-ink-2'}`}>{fmt(rt)} min</span>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel frame={drill} index={9} icon={icon} title="Utility Failure Drill" subtitle="See the UPS units ride through until the generators take over">
        <DrillControl />
      </Panel>
    </>
  );
}
