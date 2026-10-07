import { useState } from 'react';
import { Panel } from '@/components/frame/Panel';
import { AssetPanel } from '@/components/frame/AssetPanel';
import { Readings } from '@/components/data/Readings';
import { DataTable, Meter, Tag, type TagTone } from '@/components/data/DataTable';
import { SiteMap } from '@/components/map/SiteMap';
import { Glyph } from '@/components/icons/Glyph';
import { Tank } from '@/components/sld/Sld';
import { KpiBody } from '@/widgets/Widgets';
import { TrendCard } from '@/widgets/TrendCard';
import { row } from '@/screens/layout';
import { derivedSignal } from '@/sim/catalog';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import {
  PUMP_SET_TEMPLATE,
  PUMP_TEMPLATE,
  QUALITY_TAG,
  QUALITY_TEMPLATE,
  TANKS,
  TANK_TEMPLATE,
  VALVE_CHAMBERS,
  VALVE_CHAMBER_TEMPLATE,
  VC_FLOODED,
  VC_MAINTENANCE,
  ZONES,
  ZONE_TEMPLATE,
  domesticFlow,
  irrigationFlow,
  pumpSetStates,
  qualityValues,
  tankValues,
  valveChamberValues,
  zoneValues,
  type ValveChamber,
} from '@/model/assets/water';

const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const wrench = <Glyph id="wrench" size={20} color="#ffffff" />;

/* =================================================================================================
 * Plumbing › Domestic / Irrigation
 * ================================================================================================= */

const QUALITY_LIMITS = [
  { attr: 'Free_Chlorine', label: 'Free chlorine', unit: 'mg/L', lo: 0.2, hi: 1.0, max: 1.5, d: 2 },
  { attr: 'Turbidity', label: 'Turbidity', unit: 'NTU', lo: 0, hi: 1, max: 1.5, d: 2 },
  { attr: 'pH', label: 'pH', unit: '', lo: 6.5, hi: 8.5, max: 10, d: 2 },
  { attr: 'Conductivity', label: 'Conductivity', unit: 'µS/cm', lo: 0, hi: 1500, max: 2000, d: 0 },
];

export function DomesticScreen() {
  const now = useNow(2000);
  const tanks = TANKS.map((t) => ({ t, v: tankValues(t, now) }));
  const sets = pumpSetStates(now, false);
  const booster = sets[0];
  const quality = qualityValues(now);
  const zones = ZONES.map((z, i) => ({ z, v: zoneValues(i, now) }));
  const dom = domesticFlow(now);
  const irr = irrigationFlow(now);
  const running = zones.find((x) => x.v.Valve_Open);
  const next = [...zones].sort((a, b) => String(a.v.Next_Start).localeCompare(String(b.v.Next_Start)))[0];
  const hours = new Date(now).getHours() + new Date(now).getMinutes() / 60;

  const kpis = row(208, 140, 4);
  const [tankFrame, qualityFrame] = row(373, 300, [1.25, 1]);
  const [trend, zonesFrame] = row(698, 280, [1.25, 1]);

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={wrench} title="Domestic Tank" subtitle="TANK_DOM_01 · 1,200 m³">
        <KpiBody source={{ fixed: num(tanks[0].v.Level_Pct) }} decimals={0} unit="%" note={`${fmt(num(tanks[0].v.Volume_m3))} m³ · ${tanks[0].v.Inlet_Valve_Open ? 'filling' : 'supplying'}`} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={wrench} title="Network Pressure" subtitle="Booster set header">
        <KpiBody source={{ fixed: num(booster.values.Header_Pressure) }} decimals={2} unit="bar" note={`Set point ${fmt(num(booster.values.Setpoint), 2)} bar`} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={wrench} title="Domestic Demand" subtitle="Ring main flow now">
        <KpiBody source={{ fixed: dom }} decimals={1} unit="m³/h" note={`≈ ${fmt(dom * 0.7 * hours)} m³ today`} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={wrench} title="Irrigation" subtitle="TSE · zone program running">
        <KpiBody source={{ fixed: irr }} decimals={1} unit="m³/h" note={running ? <Tag tone="good">{running.z.label} watering</Tag> : `Next ${next.v.Next_Start} · ${next.z.label}`} />
      </Panel>

      <AssetPanel frame={tankFrame} index={4} icon={wrench} title="Storage Tanks" subtitle="Level, volume and flows" points={tanks.map(({ t, v }) => ({ tag: t.tag, template: TANK_TEMPLATE, values: v }))}>
        <div className="absolute inset-x-[16px] bottom-[10px] top-[4px]">
        <svg viewBox="0 0 690 210" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          {tanks.map(({ t, v }, i) => {
            const x = 30 + i * 225;
            return (
              <g key={t.tag}>
                <Tank x={x} y={26} w={110} h={150} level={num(v.Level_Pct) / 100} label={t.label} value={`${fmt(num(v.Level_Pct))}%`} color={t.tag === 'TANK_FIRE_01' ? '#e59aaa' : t.tag === 'TANK_IRR_01' ? '#7fd67f' : '#7283ff'} />
                <text x={x + 122} y={60} fill="#b09dc1" fontSize={12}>
                  {fmt(num(v.Volume_m3))} m³
                </text>
                <text x={x + 122} y={80} fill="#b09dc1" fontSize={12}>
                  of {fmt(t.capacity)}
                </text>
                <text x={x + 122} y={112} fill={v.Inlet_Valve_Open ? '#7283ff' : '#b09dc1'} fontSize={12}>
                  in {fmt(num(v.Inflow_m3h), 1)}
                </text>
                <text x={x + 122} y={132} fill="#b09dc1" fontSize={12}>
                  out {fmt(num(v.Outflow_m3h), 1)}
                </text>
                <text x={x + 122} y={146} fill="#b09dc1" fontSize={11}>
                  m³/h
                </text>
              </g>
            );
          })}
        </svg>
        </div>
      </AssetPanel>

      <AssetPanel frame={qualityFrame} index={5} icon={wrench} title="Water Quality" subtitle={`${QUALITY_TAG} · domestic supply analyser`} points={{ tag: QUALITY_TAG, template: QUALITY_TEMPLATE, values: quality }}>
        <div className="absolute inset-x-[20px] top-[6px] flex flex-col gap-[14px] text-[14px]">
          {QUALITY_LIMITS.map((q) => {
            const v = num(quality[q.attr]);
            const ok = v >= q.lo && v <= q.hi;
            return (
              <div key={q.attr} className="flex items-center gap-[14px]">
                <span className="w-[112px] text-white">{q.label}</span>
                <Meter value={(v / q.max) * 100} tone={ok ? 'good' : 'bad'} width={qualityFrame.w - 330} label={false} />
                <span className="w-[92px] text-right tabular-nums text-white">
                  {fmt(v, q.d)} <span className="text-[12px] text-ink-3">{q.unit}</span>
                </span>
                <span className="w-[70px] text-right text-[12px] text-ink-4">
                  {q.lo}–{q.hi}
                </span>
              </div>
            );
          })}
          <p className="text-[12px] text-ink-4">Limits: WHO drinking-water guidance and the site's O&M targets.</p>
        </div>
      </AssetPanel>

      <TrendCard frame={trend} index={6} icon={wrench} title="Domestic Water Demand" subtitle="Ring main flow against the expected profile" sim="plumbing.domesticFlow" yTitle="Flow (m³/h)" />

      <AssetPanel frame={zonesFrame} index={7} icon={wrench} title="Irrigation Zones" subtitle="Controller schedule · 20 min per zone" points={zones.map(({ z, v }) => ({ tag: z.tag, template: ZONE_TEMPLATE, values: v }))}>
        <div className="absolute inset-x-[4px] bottom-[8px] top-[0px]">
          <DataTable
            dense
            rows={zones}
            rowKey={(r) => r.z.tag}
            highlight={(r) => (r.v.Valve_Open ? 'warn' : null)}
            columns={[
              { key: 'z', header: 'Zone', width: 48, render: (r) => <span className="text-white">{r.z.label}</span> },
              { key: 'n', header: 'Area', render: (r) => r.z.name },
              { key: 'v', header: 'Valve', width: 84, render: (r) => <Tag tone={r.v.Valve_Open ? 'good' : 'idle'}>{r.v.Valve_Open ? 'Open' : 'Closed'}</Tag> },
              { key: 'm', header: 'Moisture', width: 110, render: (r) => <Meter value={num(r.v.Soil_Moisture)} tone={num(r.v.Soil_Moisture) < 20 ? 'warn' : 'info'} width={54} /> },
              { key: 'x', header: 'Next', width: 56, align: 'right', render: (r) => <span className="text-ink-3">{String(r.v.Next_Start)}</span> },
            ]}
          />
        </div>
      </AssetPanel>
    </>
  );
}

/* =================================================================================================
 * Plumbing › Pumps
 * ================================================================================================= */

const pumpingPower = derivedSignal('water.pumping.kw', { unit: 'kW', low: 12, high: 44, profile: 'retail', noise: 0.08, decimals: 1 });

export function PumpsScreen() {
  const now = useNow(2000);
  const fire = useScenario((s) => s.fire.active);
  const sets = pumpSetStates(now, fire);
  const all = sets.flatMap((s) => s.pumps);
  const running = all.filter((p) => p.values.Running).length;
  const power = all.reduce((a, p) => a + num(p.values.Power_kW), 0);
  const fireSet = sets[sets.length - 1];

  const frames = [...row(373, 290, 3), ...row(688, 290, 3)];
  const kpis = row(208, 140, 4);

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={wrench} title="Pumps Running" subtitle="All water pump sets">
        <KpiBody source={{ fixed: running }} decimals={0} unit={`/ ${all.length}`} note="Duty rotation daily" />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={wrench} title="Domestic Pressure" subtitle="Booster header">
        <KpiBody source={{ fixed: num(sets[0].values.Header_Pressure) }} decimals={2} unit="bar" note={`Set point ${fmt(num(sets[0].values.Setpoint), 2)} bar`} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={wrench} title="Pumping Power" subtitle="Sum of running pumps">
        <KpiBody source={{ fixed: power }} decimals={1} unit="kW" note="VFD sets follow the affinity laws" />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={wrench} title="Fire Main" subtitle="Sprinkler & hydrant pressure">
        <KpiBody source={{ fixed: num(fireSet.values.Header_Pressure) }} decimals={1} unit="bar" note={fire ? <Tag tone="bad">Electric fire pump running</Tag> : 'Jockey maintaining pressure'} />
      </Panel>

      {sets.map(({ set, values, pumps }, i) => (
        <AssetPanel key={set.tag} frame={frames[i]} index={4 + i} icon={wrench} title={set.label} subtitle={set.rating} points={[{ tag: set.tag, template: PUMP_SET_TEMPLATE, values }, ...pumps.map((p) => ({ tag: p.def.tag, template: PUMP_TEMPLATE, values: p.values }))]}>
          <div className="absolute inset-x-[18px] bottom-[10px] top-[0px] flex flex-col gap-[10px]">
            <Readings
              size={13}
              items={[
                { label: 'Header', value: `${fmt(num(values.Header_Pressure), 2)} bar` },
                { label: 'Set point', value: `${fmt(num(values.Setpoint), 2)} bar` },
                { label: 'Flow', value: `${fmt(num(values.Flow_m3h), 1)} m³/h` },
                { label: 'Suction', value: `${fmt(num(values.Suction_Pressure), 2)} bar` },
              ]}
            />
            <div className="flex flex-col gap-[5px] text-[13px]">
              {pumps.map(({ def, values: v }) => {
                const on = Boolean(v.Running);
                const tone: TagTone = v.Trip ? 'bad' : on ? (set.tag === 'BST_FIRE' && def.label !== 'Jockey' ? 'bad' : 'good') : 'idle';
                return (
                  <div key={def.tag} className="flex items-center gap-[10px]" title={`${def.tag} · ${def.kw} kW`}>
                    <span className="w-[74px] text-white">{def.label}</span>
                    <Tag tone={tone}>{v.Trip ? 'Trip' : on ? 'Running' : 'Standby'}</Tag>
                    <span className="ml-auto w-[54px] text-right tabular-nums text-ink-2">{on ? `${fmt(num(v.Speed_Pct))}%` : '—'}</span>
                    <span className="w-[62px] text-right tabular-nums text-ink-2">{on ? `${fmt(num(v.Current_A), 1)} A` : '—'}</span>
                    <span className="w-[62px] text-right tabular-nums text-ink-3">{on ? `${fmt(num(v.Power_kW), 1)} kW` : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </AssetPanel>
      ))}

      <TrendCard frame={frames[5]} index={9} icon={wrench} title="Pumping Power" subtitle="All water pumps against the expected profile" sim={pumpingPower} yTitle="kW" decimals={1} dayHours={12} />
    </>
  );
}

/* =================================================================================================
 * Plumbing › Valve Chambers
 * ================================================================================================= */

function chamberState(vc: ValveChamber, v: Record<string, unknown>): [string, TagTone] {
  if (v.Flood_Alarm) return ['Chamber flooded', 'bad'];
  if (v.Actuator_Fault) return ['Actuator fault', 'bad'];
  if (vc.tag === VC_MAINTENANCE) return ['Closed · maintenance', 'warn'];
  return [v.Valve_Open ? 'Open' : 'Closed', 'good'];
}

const MARKER: Record<TagTone, string> = { good: '#7fcf9d', warn: '#e8a98c', bad: '#d96b84', info: '#7283ff', idle: '#b5a8c0' };

export function ValveChambersScreen() {
  const now = useNow(2000);
  const [sel, setSel] = useState<string>(VC_FLOODED);
  const chambers = VALVE_CHAMBERS.map((vc) => ({ vc, v: valveChamberValues(vc, now) }));
  const normal = chambers.filter(({ vc, v }) => Boolean(v.Valve_Open) === vc.normallyOpen).length;
  const alarms = chambers.filter(({ v }) => v.Flood_Alarm || v.Actuator_Fault || v.Door_Open);
  const ring = chambers.filter(({ vc, v }) => vc.kind === 'Isolation' && v.Valve_Open).map(({ v }) => num(v.Downstream_Pressure));
  const selected = chambers.find((c) => c.vc.tag === sel) ?? chambers[0];
  const [text, tone] = chamberState(selected.vc, selected.v);

  const kpis = row(208, 140, 4);
  const map = { x: 52, y: 373, w: 1180, h: 330 };
  const table = { x: 52, y: 728, w: 1180, h: 250 };
  const detail = { x: 1257, y: 373, w: 611, h: 605 };

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={wrench} title="Chambers Online" subtitle="RTU communications">
        <KpiBody source={{ fixed: chambers.length }} decimals={0} unit={`/ ${chambers.length}`} note="Fibre ring · Modbus TCP" />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={wrench} title="Normal Position" subtitle="Valves as designed">
        <KpiBody source={{ fixed: normal }} decimals={0} unit={`/ ${chambers.length}`} note={<Tag tone="warn">VC-05 shut for repair</Tag>} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={wrench} title="Chamber Alarms" subtitle="Flooding, actuator, intrusion">
        <KpiBody source={{ fixed: alarms.length }} decimals={0} unit="" note={alarms.length ? <Tag tone="bad">{alarms.map((a) => `${a.vc.label} flooded`).join(', ')}</Tag> : 'None'} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={wrench} title="Ring Main Pressure" subtitle="Across the open isolation valves">
        <KpiBody source={{ fixed: Math.min(...ring) }} decimals={2} unit="bar" note={`to ${fmt(Math.max(...ring), 2)} bar`} />
      </Panel>

      <SiteMap frame={map} dim={0.3}>
        {chambers.map(({ vc, v }) => {
          const [, t] = chamberState(vc, v);
          const on = vc.tag === sel;
          return (
            <g key={vc.tag} onClick={() => setSel(vc.tag)} style={{ cursor: 'pointer' }}>
              {t === 'bad' && <circle cx={vc.x} cy={vc.y} r={34} fill="none" stroke={MARKER.bad} strokeWidth={4} style={{ animation: 'pf-alarm-blink 1s infinite' }} />}
              <circle cx={vc.x} cy={vc.y} r={on ? 22 : 17} fill={MARKER[t]} stroke="#ffffff" strokeWidth={on ? 5 : 3} />
              <text x={vc.x} y={vc.y - 30} textAnchor="middle" fill="#ffffff" fontSize={28} fontWeight={600} style={{ paintOrder: 'stroke', stroke: '#020102', strokeWidth: 7 }}>
                {vc.label}
              </text>
            </g>
          );
        })}
      </SiteMap>

      <Panel frame={table} index={4} icon={wrench} title="Valve Chambers" subtitle="Click a row or a marker for the chamber's details">
        <div className="absolute inset-x-[4px] bottom-[8px] top-[0px]">
          <DataTable
            dense
            rows={chambers}
            rowKey={(r) => r.vc.tag}
            onRowClick={(r) => setSel(r.vc.tag)}
            highlight={(r) => (r.v.Flood_Alarm ? 'alarm' : r.vc.tag === VC_MAINTENANCE ? 'warn' : null)}
            columns={[
              { key: 't', header: 'Chamber', width: 80, render: (r) => <span className="text-white">{r.vc.label}</span> },
              { key: 'k', header: 'Type', width: 100, render: (r) => r.vc.kind },
              { key: 'l', header: 'Location', render: (r) => r.vc.location },
              { key: 's', header: 'State', width: 200, render: (r) => { const [tx, tn] = chamberState(r.vc, r.v); return <Tag tone={tn}>{tx}</Tag>; } },
              { key: 'p', header: 'Pressure', width: 110, align: 'right', render: (r) => `${fmt(num(r.v.Downstream_Pressure), 2)} bar` },
              { key: 'f', header: 'Flow', width: 110, align: 'right', render: (r) => (r.v.Flow_m3h === null ? '—' : `${fmt(num(r.v.Flow_m3h), 1)} m³/h`) },
            ]}
          />
        </div>
      </Panel>

      <AssetPanel key={selected.vc.tag} frame={detail} index={5} icon={wrench} title={`${selected.vc.label} · ${selected.vc.kind}`} subtitle={`${selected.vc.tag} · ${selected.vc.location}`} points={{ tag: selected.vc.tag, template: VALVE_CHAMBER_TEMPLATE, values: selected.v }}>
        <div className="absolute inset-x-[20px] top-[4px] flex flex-col gap-[16px]">
          <div className="flex items-center gap-[10px]">
            <Tag tone={tone}>{text}</Tag>
            <Tag tone="idle" dot={false}>
              {selected.v.Remote ? 'Remote' : 'Local'}
            </Tag>
          </div>
          <div className="flex items-end gap-[24px]">
            <span className="text-[48px] leading-none text-white tabular-nums">
              {fmt(num(selected.v.Position_Pct))}
              <span className="ml-[6px] text-[18px] text-ink-3">% open</span>
            </span>
          </div>
          <Meter value={num(selected.v.Position_Pct)} tone={selected.v.Valve_Open ? 'info' : 'warn'} width={detail.w - 60} label={false} />
          <Readings
            cols={1}
            size={15}
            items={[
              { label: 'Upstream pressure', value: `${fmt(num(selected.v.Upstream_Pressure), 2)} bar` },
              { label: 'Downstream pressure', value: `${fmt(num(selected.v.Downstream_Pressure), 2)} bar` },
              { label: 'Flow', value: selected.v.Flow_m3h === null ? 'No flowmeter' : `${fmt(num(selected.v.Flow_m3h), 1)} m³/h` },
              { label: 'Chamber flooding', value: selected.v.Flood_Alarm ? 'Water detected' : 'Dry', tone: selected.v.Flood_Alarm ? 'bad' : 'good' },
              { label: 'Access cover', value: selected.v.Door_Open ? 'Open' : 'Closed', tone: selected.v.Door_Open ? 'bad' : undefined },
              { label: 'RTU battery', value: `${fmt(num(selected.v.RTU_Battery_V), 1)} V` },
            ]}
          />
          {selected.vc.tag === VC_FLOODED && <p className="rounded-[8px] border border-alarm/40 bg-alarm/10 px-[12px] py-[9px] text-[13px] text-alarm-soft">Water in the chamber: check for a leaking flange or groundwater ingress. The valve itself is healthy.</p>}
          {selected.vc.tag === VC_MAINTENANCE && <p className="rounded-[8px] border border-warn/40 bg-warn/10 px-[12px] py-[9px] text-[13px] text-warn-soft">Shut and switched to local for a planned repair on the east ring. The ring is fed from both ends meanwhile.</p>}
        </div>
      </AssetPanel>
    </>
  );
}
