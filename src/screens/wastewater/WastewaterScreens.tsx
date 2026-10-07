import { Panel } from '@/components/frame/Panel';
import { AssetPanel } from '@/components/frame/AssetPanel';
import { Readings } from '@/components/data/Readings';
import { DataTable, Meter, Tag } from '@/components/data/DataTable';
import { RingGauge } from '@/components/gauges/Gauges';
import { Sparkline } from '@/components/charts/Sparkline';
import { Glyph } from '@/components/icons/Glyph';
import { SEWAGE } from '@/components/sld/Sld';
import { KpiBody } from '@/widgets/Widgets';
import { TrendCard } from '@/widgets/TrendCard';
import { row } from '@/screens/layout';
import { derivedSignal } from '@/sim/catalog';
import { useNow } from '@/sim/clock';
import { fmt } from '@/utils/format';
import {
  CARBON_DP_LIMIT,
  GAS_DETECTORS,
  H2S_SENSOR_TEMPLATE,
  LIFT_STATIONS,
  LIFT_STATION_TEMPLATE,
  OCU_TEMPLATE,
  ODOR_UNITS,
  SUB_PUMP_TEMPLATE,
  gasDetectorValues,
  inletH2S,
  liftStationState,
  odorUnitValues,
  type LiftStation,
} from '@/model/assets/wastewater';

const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const icon = <Glyph id="waste" size={20} color="#ffffff" />;

/* =================================================================================================
 * Wastewater › Submersible Pumps
 * ================================================================================================= */

/** Section of a wet well: sewage level, the control levels, and the pumps on the floor. */
function WetWell({ st, level, pumps }: { st: LiftStation; level: number; pumps: boolean[] }) {
  const W = 104;
  const H = 196;
  const top = 6;
  const bottom = H - 26;
  const y = (m: number) => bottom - (m / st.depth) * (bottom - top);
  const marks = [
    { m: st.hh, label: 'HH', color: '#d96b84' },
    { m: st.start, label: 'Start', color: '#9d78ff' },
    { m: st.stop, label: 'Stop', color: '#7fcf9d' },
  ];
  return (
    <svg width={W + 52} height={H} aria-hidden>
      <rect x={2} y={top} width={W} height={bottom - top + 4} rx={6} fill="#060408" stroke="rgba(255,255,255,0.3)" />
      <rect x={4} y={y(level)} width={W - 4} height={bottom + 2 - y(level)} fill={SEWAGE} fillOpacity={0.45} style={{ transition: 'all 1s' }} />
      <line x1={4} x2={W} y1={y(level)} y2={y(level)} stroke="#e0b98a" strokeWidth={1.6} style={{ transition: 'all 1s' }} />
      {marks.map((mk) => (
        <g key={mk.label}>
          <line x1={2} x2={W + 6} y1={y(mk.m)} y2={y(mk.m)} stroke={mk.color} strokeDasharray="4 3" strokeWidth={1.1} />
          <text x={W + 10} y={y(mk.m) + 4} fill={mk.color} fontSize={10.5}>
            {mk.label}
          </text>
        </g>
      ))}
      {pumps.map((on, i) => {
        const cx = 18 + i * ((W - 30) / Math.max(1, pumps.length - 1 || 1));
        return <rect key={i} x={cx - 9} y={bottom - 16} width={18} height={16} rx={3} fill={on ? '#7fcf9d' : '#372c42'} stroke="#060408" />;
      })}
      <text x={2} y={H - 6} fill="#b09dc1" fontSize={10.5}>
        depth {st.depth} m
      </text>
    </svg>
  );
}

export function SubmersiblePumpsScreen() {
  const now = useNow(2000);
  const stations = LIFT_STATIONS.map((st) => ({ st, ...liftStationState(st, now) }));
  const allPumps = stations.flatMap(({ st, pumps }) => st.pumps.map((p, i) => ({ st, p, v: pumps[i] })));
  const running = allPumps.filter((x) => x.v.Running).length;
  const pumped = stations.reduce((a, s) => a + num(s.station.Pumped_Today_m3), 0);
  const alarms = allPumps.filter((x) => x.v.Seal_Leak || x.v.Trip || x.v.Motor_Overtemp);

  const kpis = row(208, 140, 4);
  const cards = row(373, 360, 4);
  const [table, events] = row(758, 220, [1.45, 1]);

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={icon} title="Lift Stations" subtitle="In Auto, level control healthy">
        <KpiBody source={{ fixed: stations.length }} decimals={0} unit={`/ ${stations.length}`} note="No overflow today" />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={icon} title="Pumps Running" subtitle="Duty pumps alternate each cycle">
        <KpiBody source={{ fixed: running }} decimals={0} unit={`/ ${allPumps.length}`} note="Level-controlled" />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={icon} title="Pumped Today" subtitle="Rising mains, all stations">
        <KpiBody source={{ fixed: pumped }} decimals={0} unit="m³" note="To the municipal sewer" />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={icon} title="Active Alarms" subtitle="Pumps and stations">
        <KpiBody source={{ fixed: alarms.length }} decimals={0} unit="" note={alarms.length ? <Tag tone="warn">{alarms.map((a) => `${a.st.label} ${a.p.label} seal`).join(', ')}</Tag> : 'None'} />
      </Panel>

      {stations.map(({ st, station, pumps, history }, i) => {
        const pumping = pumps.some((p) => p.Running);
        return (
          <AssetPanel
            key={st.tag}
            frame={cards[i]}
            index={4 + i}
            icon={icon}
            title={st.label}
            subtitle={`${st.tag} · ${st.serves}`}
            points={[{ tag: st.tag, template: LIFT_STATION_TEMPLATE, values: station }, ...st.pumps.map((p, k) => ({ tag: p.tag, template: SUB_PUMP_TEMPLATE, values: pumps[k] }))]}
          >
            <div className="absolute inset-x-[16px] bottom-[12px] top-[2px] flex flex-col gap-[10px]">
              <div className="flex flex-wrap items-center gap-[8px]">
                <Tag tone={pumping ? 'good' : 'info'}>{pumping ? 'Pumping down' : 'Filling'}</Tag>
                <Tag tone="idle" dot={false}>
                  Auto · P{num(station.Duty_Pump)} duty
                </Tag>
                {pumps.some((p) => p.Seal_Leak) && <Tag tone="warn">Seal leak</Tag>}
              </div>
              <div className="flex gap-[10px]">
                <WetWell st={st} level={num(station.Level_m)} pumps={pumps.map((p) => Boolean(p.Running))} />
                <div className="flex min-w-0 flex-1 flex-col gap-[8px] text-[13px]">
                  <span className="text-[30px] leading-none text-white tabular-nums">
                    {fmt(num(station.Level_m), 2)}
                    <span className="ml-[4px] text-[15px] text-ink-3">m</span>
                  </span>
                  <span className="text-ink-3">
                    In {fmt(num(station.Inflow_m3h), 1)} · out {fmt(num(station.Outflow_m3h), 1)} m³/h
                  </span>
                  {st.pumps.map((p, k) => (
                    <span key={p.tag} className="flex items-center justify-between border-b border-white/[0.06] pb-[3px]">
                      <span className="text-white">
                        {p.label} <span className="text-ink-4">{p.kw} kW</span>
                      </span>
                      <span className={pumps[k].Running ? 'text-ok' : pumps[k].Seal_Leak ? 'text-warn' : 'text-ink-3'}>{pumps[k].Running ? `${fmt(num(pumps[k].Current_A), 1)} A` : pumps[k].Seal_Leak ? 'Seal leak' : 'Standby'}</span>
                    </span>
                  ))}
                  <span className="mt-auto text-[11px] text-ink-4">Level, last hour</span>
                  <Sparkline data={history} width={cards[i].w - 230} height={34} min={0} max={st.hh} color="#e0b98a" refs={[{ value: st.start, color: '#9d78ff' }]} />
                </div>
              </div>
            </div>
          </AssetPanel>
        );
      })}

      <Panel frame={table} index={8} icon={icon} title="Pumps" subtitle="Every submersible pump, by station">
        <div className="absolute inset-x-[4px] bottom-[8px] top-[2px]">
          <DataTable
            dense
            rows={allPumps}
            rowKey={(r) => r.p.tag}
            highlight={(r) => (r.v.Seal_Leak ? 'warn' : null)}
            columns={[
              { key: 'tag', header: 'Tag', width: 110, render: (r) => <span className="font-mono text-[12px] text-white">{r.p.tag}</span> },
              { key: 'st', header: 'Station', render: (r) => r.st.serves },
              { key: 's', header: 'State', width: 110, render: (r) => <Tag tone={r.v.Running ? 'good' : r.v.Seal_Leak ? 'warn' : 'idle'}>{r.v.Running ? 'Running' : r.v.Seal_Leak ? 'Seal leak' : 'Standby'}</Tag> },
              { key: 'a', header: 'Current', width: 80, align: 'right', render: (r) => (r.v.Running ? `${fmt(num(r.v.Current_A), 1)} A` : '—') },
              { key: 'h', header: 'Run hours', width: 90, align: 'right', render: (r) => fmt(num(r.v.Run_Hours)) },
              { key: 'n', header: 'Starts today', width: 100, align: 'right', render: (r) => fmt(num(r.v.Starts_Today)) },
            ]}
          />
        </div>
      </Panel>
      <Panel frame={events} index={9} icon={icon} title="Alarms" subtitle="Active and acknowledged">
        <div className="absolute inset-x-[20px] top-[6px] flex flex-col gap-[10px] text-[14px]">
          {alarms.map((a) => (
            <div key={a.p.tag} className="flex items-center justify-between rounded-[8px] border border-warn/40 bg-warn/[0.06] px-[12px] py-[8px]">
              <span className="text-white">
                {a.st.label} {a.p.label} · seal chamber moisture
              </span>
              <span className="font-mono text-[12px] text-warn">{a.p.tag}.Seal_Leak</span>
            </div>
          ))}
          <p className="text-ink-3">No high-high levels or overflows today. Duty pumps alternate every cycle to even out wear.</p>
        </div>
      </Panel>
    </>
  );
}

/* =================================================================================================
 * Wastewater › Odor Control
 * ================================================================================================= */

const MAIN_OCU = ODOR_UNITS[1];
const outletH2S = derivedSignal(`${MAIN_OCU.tag}.h2s.out`, { unit: 'ppm', low: MAIN_OCU.inlet[0] * (1 - MAIN_OCU.efficiency / 100), high: MAIN_OCU.inlet[1] * (1 - MAIN_OCU.efficiency / 100), profile: 'retail', noise: 0.2, decimals: 2 });

export function OdorControlScreen() {
  const now = useNow(2000);
  const units = ODOR_UNITS.map((u) => ({ u, v: odorUnitValues(u, now) }));
  const detectors = GAS_DETECTORS.map((d) => ({ d, v: gasDetectorValues(d, now) }));
  const avgEff = units.reduce((a, x) => a + num(x.v.Removal_Efficiency), 0) / units.length;
  const worst = units.reduce((m, x) => (num(x.v.H2S_Outlet_ppm) > num(m.v.H2S_Outlet_ppm) ? x : m), units[0]);
  const inAlarm = detectors.filter((x) => x.v.Alarm_Low || x.v.Alarm_High).length;

  const kpis = row(208, 140, 4);
  const cards = row(373, 360, 3);
  const [trend, ambient] = row(758, 220, [1.45, 1]);

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={icon} title="Units Running" subtitle="Extract fans on">
        <KpiBody source={{ fixed: units.filter((x) => x.v.Fan_Running).length }} decimals={0} unit={`/ ${units.length}`} note="Bio-filter + carbon" />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={icon} title="Removal Efficiency" subtitle="Average H₂S removal">
        <KpiBody source={{ fixed: avgEff }} decimals={1} unit="%" note={avgEff > 97 ? 'Within design' : <Tag tone="warn">Below 97%</Tag>} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={icon} title="Stack H₂S" subtitle="Highest outlet reading">
        <KpiBody source={{ fixed: num(worst.v.H2S_Outlet_ppm) }} decimals={2} unit="ppm" note={worst.u.label} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={icon} title="Ambient Detectors" subtitle="In alarm (> 5 ppm)">
        <KpiBody source={{ fixed: inAlarm }} decimals={0} unit={`/ ${detectors.length}`} note={inAlarm ? <Tag tone="bad">Check areas</Tag> : 'All clear'} />
      </Panel>

      {units.map(({ u, v }, i) => {
        const eff = num(v.Removal_Efficiency);
        const carbon = num(v.Carbon_DP_Pa);
        const carbonWarn = carbon > CARBON_DP_LIMIT * 0.85;
        return (
          <AssetPanel key={u.tag} frame={cards[i]} index={4 + i} icon={icon} title={u.label} subtitle={`${u.tag} · ${u.serves}`} points={{ tag: u.tag, template: OCU_TEMPLATE, values: v }}>
            <div className="absolute inset-x-[18px] bottom-[12px] top-[2px] flex flex-col gap-[10px]">
              <div className="flex flex-wrap items-center gap-[8px]">
                <Tag tone={v.Fan_Running ? 'good' : 'bad'}>{v.Fan_Running ? 'Fan running' : 'Fan stopped'}</Tag>
                <Tag tone="idle" dot={false}>
                  Irrigation {v.Irrigation_Running ? 'on' : 'off'}
                </Tag>
                {carbonWarn && <Tag tone="warn">Carbon change due</Tag>}
              </div>
              <div className="flex items-center gap-[18px]">
                <RingGauge size={128} value={`${fmt(eff, 1)}%`} unit="removal" segments={[{ value: eff, color: eff > 97 ? '#7fcf9d' : '#e8a98c' }, { value: 100 - eff, color: 'rgba(255,255,255,0.08)' }]} />
                <div className="flex flex-col gap-[4px]">
                  <span className="text-[13px] text-ink-3">H₂S inlet → stack</span>
                  <span className="text-[26px] leading-none text-white tabular-nums">
                    {fmt(num(v.H2S_Inlet_ppm), 1)} <span className="text-[15px] text-ink-3">→</span> <span className="text-ok">{fmt(num(v.H2S_Outlet_ppm), 2)}</span>
                  </span>
                  <span className="text-[13px] text-ink-3">ppm</span>
                </div>
              </div>
              <Readings
                size={14}
                items={[
                  { label: 'Airflow', value: `${fmt(num(v.Airflow_m3h))} m³/h` },
                  { label: 'Fan speed', value: `${fmt(num(v.Fan_Speed_Pct))} %` },
                  { label: 'Media ΔP', value: `${fmt(num(v.Media_DP_Pa))} Pa` },
                  { label: 'Carbon ΔP', value: `${fmt(carbon)} / ${CARBON_DP_LIMIT} Pa`, tone: carbonWarn ? 'warn' : undefined },
                  { label: 'Recirc pH', value: fmt(num(v.Recirc_pH), 1) },
                  { label: 'Carbon age', value: `${fmt(num(v.Carbon_Days))} days`, tone: carbonWarn ? 'warn' : undefined },
                ]}
              />
            </div>
          </AssetPanel>
        );
      })}

      <TrendCard frame={trend} index={7} icon={icon} title={`H₂S · ${MAIN_OCU.label}`} subtitle="Inlet against stack outlet" sim={inletH2S(MAIN_OCU)} compare={outletH2S} names={{ actual: 'Inlet', predictive: 'Stack' }} yTitle="ppm" decimals={1} />
      <AssetPanel frame={ambient} index={8} icon={icon} title="Ambient H₂S" subtitle="Gas detectors around the plant rooms" points={detectors.map(({ d, v }) => ({ tag: d.tag, template: H2S_SENSOR_TEMPLATE, values: v }))}>
        <div className="absolute inset-x-[20px] top-[4px] flex flex-col gap-[8px] text-[13px]">
          {detectors.map(({ d, v }) => {
            const ppm = num(v.H2S_ppm);
            return (
              <div key={d.tag} className="flex items-center gap-[12px]">
                <span className="w-[170px] truncate text-white">{d.label}</span>
                <Meter value={(ppm / 10) * 100} tone={ppm > 5 ? 'bad' : ppm > 2.5 ? 'warn' : 'good'} width={ambient.w - 330} label={false} />
                <span className="w-[62px] text-right tabular-nums text-ink-2">{fmt(ppm, 1)} ppm</span>
              </div>
            );
          })}
        </div>
      </AssetPanel>
    </>
  );
}
