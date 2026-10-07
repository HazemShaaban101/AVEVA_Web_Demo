import { useState } from 'react';
import { Panel } from '@/components/frame/Panel';
import { GalaxyPoints } from '@/components/data/GalaxyPoints';
import { Glyph } from '@/components/icons/Glyph';
import { DEAD, Instrument, Label, Legend, Pump, Source, Tank, Valve, WATER, Wire } from '@/components/sld/Sld';
import { row } from '@/screens/layout';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import type { AttrValues, TemplateDef } from '@/model/assets/galaxy';
import {
  PUMP_SET_TEMPLATE,
  PUMP_TEMPLATE,
  QUALITY_TAG,
  QUALITY_TEMPLATE,
  TANKS,
  TANK_TEMPLATE,
  VALVE_CHAMBERS,
  VALVE_CHAMBER_TEMPLATE,
  ZONES,
  ZONE_TEMPLATE,
  pumpSetStates,
  qualityValues,
  tankValues,
  valveChamberValues,
  zoneValues,
} from '@/model/assets/water';

const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const FIRE = '#e59aaa';
const TSE = '#7fd67f';

interface Device {
  title: string;
  template: TemplateDef;
  values: AttrValues;
}

const ZONE_X = ZONES.map((_, k) => 836 + k * 70);
const TAPS = [
  { x: 850, label: 'C01 · C02' },
  { x: 930, label: 'B03 · B02' },
  { x: 1100, label: 'B01' },
  { x: 1170, label: 'A01' },
  { x: 1240, label: 'A02' },
  { x: 1305, label: 'A03' },
];

/** Plumbing › SLD: the water network as a process schematic, live from each device. */
export function WaterSldScreen() {
  const now = useNow(2000);
  const fire = useScenario((s) => s.fire.active);
  const [sel, setSel] = useState('BST_DOM');
  const [diagram, side] = row(208, 770, [1440, 351]);

  const tanks = Object.fromEntries(TANKS.map((t) => [t.tag, tankValues(t, now)]));
  const sets = pumpSetStates(now, fire);
  const setBy = Object.fromEntries(sets.map((s) => [s.set.tag, s]));
  const chambers = Object.fromEntries(VALVE_CHAMBERS.map((vc) => [vc.tag, valveChamberValues(vc, now)]));
  const zones = ZONES.map((_, i) => zoneValues(i, now));

  const devices: Record<string, Device> = {};
  TANKS.forEach((t) => (devices[t.tag] = { title: `${t.label} tank`, template: TANK_TEMPLATE, values: tanks[t.tag] }));
  sets.forEach((s) => {
    devices[s.set.tag] = { title: s.set.label, template: PUMP_SET_TEMPLATE, values: s.values };
    s.pumps.forEach((p) => (devices[p.def.tag] = { title: `${s.set.label} · ${p.def.label}`, template: PUMP_TEMPLATE, values: p.values }));
  });
  VALVE_CHAMBERS.forEach((vc) => (devices[vc.tag] = { title: `${vc.label} · ${vc.kind}`, template: VALVE_CHAMBER_TEMPLATE, values: chambers[vc.tag] }));
  ZONES.forEach((z, i) => (devices[z.tag] = { title: `${z.label} · ${z.name}`, template: ZONE_TEMPLATE, values: zones[i] }));
  devices[QUALITY_TAG] = { title: 'Water quality analyser', template: QUALITY_TEMPLATE, values: qualityValues(now) };
  const device = devices[sel] ?? devices.BST_DOM;
  const pick = (tag: string) => ({ selected: sel === tag, onClick: () => setSel(tag), title: devices[tag]?.title ?? tag });

  const running = (tag: string) => Boolean(devices[tag]?.values.Running);
  const dom = setBy.BST_DOM;
  const domFlow = num(dom.values.Pumps_Running) > 0;
  const fillDom = Boolean(tanks.TANK_DOM_01.Inlet_Valve_Open);
  const trf = num(setBy.BST_TRF.values.Pumps_Running) > 0;
  const irr = num(setBy.BST_IRR.values.Pumps_Running) > 0;
  const fireFlow = num(setBy.BST_FIRE.values.Pumps_Running) > 0;
  const open = (tag: string) => Boolean(chambers[tag].Valve_Open);

  return (
    <>
      <Panel frame={diagram} index={0} icon={<Glyph id="wrench" size={20} color="#ffffff" />} title="Water Network" subtitle="Utility main → domestic tank → booster set → ring main · TSE → irrigation · fire water">
        <div className="absolute inset-x-[10px] bottom-[6px] top-0">
          <svg viewBox="0 0 1400 690" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
            {/* ---- Utility main → domestic tank ---- */}
            <Source x={50} y={100} live label="Utility main · DN200" value={`${fmt(num(chambers.VC_01.Flow_m3h), 1)} m³/h`} color={WATER} {...pick('VC_01')} />
            <Wire points={[[50, 104], [50, 120], [140, 120]]} live color={WATER} flow={fillDom} />
            <Valve x={150} y={120} open={open('VC_01')} label="VC-01" {...pick('VC_01')} />
            <Wire points={[[160, 120], [300, 120]]} live color={WATER} flow={fillDom} />
            <Instrument x={230} y={160} code="FT" value={`${fmt(num(chambers.VC_01.Flow_m3h), 1)} m³/h`} {...pick('VC_01')} />
            <line x1={230} y1={120} x2={230} y2={146} stroke="#b09dc1" strokeDasharray="2 2" />
            <Tank x={300} y={70} w={110} h={150} level={num(tanks.TANK_DOM_01.Level_Pct) / 100} label="Domestic tank" value={`${fmt(num(tanks.TANK_DOM_01.Level_Pct))}%`} {...pick('TANK_DOM_01')} />
            <Instrument x={355} y={250} code="AT" value="Cl · pH · NTU" side="right" {...pick(QUALITY_TAG)} />

            {/* ---- Booster set ---- */}
            <Wire points={[[410, 200], [480, 200]]} live color={WATER} flow={domFlow} />
            <Wire points={[[480, 140], [480, 260]]} live color={WATER} />
            <Wire points={[[600, 140], [600, 260]]} live color={WATER} />
            {dom.pumps.map((p, i) => {
              const y = 140 + i * 60;
              const on = Boolean(p.values.Running);
              return (
                <g key={p.def.tag}>
                  <Wire points={[[480, y], [524, y]]} live color={WATER} flow={on} />
                  <Pump x={540} y={y} running={on} {...pick(p.def.tag)} />
                  <Wire points={[[556, y], [600, y]]} live color={WATER} flow={on} />
                  <Label x={540} y={y - 22} anchor="middle" color={on ? '#ffffff' : '#b09dc1'}>
                    {p.def.label} {on ? `${fmt(num(p.values.Speed_Pct))}%` : ''}
                  </Label>
                </g>
              );
            })}
            <Label x={540} y={300} anchor="middle" color="#d0c0df" weight={600}>
              BOOSTER SET
            </Label>
            <g onClick={() => setSel('BST_DOM')} style={{ cursor: 'pointer' }}>
              <rect x={462} y={100} width={156} height={210} rx={10} fill="transparent" stroke={sel === 'BST_DOM' ? '#9d78ff' : 'rgba(255,255,255,0.12)'} strokeDasharray="4 4" />
            </g>
            <Wire points={[[600, 200], [690, 200]]} live color={WATER} flow={domFlow} />
            <Instrument x={640} y={160} code="PT" value={`${fmt(num(dom.values.Header_Pressure), 2)} bar`} side="above" {...pick('BST_DOM')} />
            <Valve x={700} y={200} open={open('VC_02')} label="VC-02 PRV" {...pick('VC_02')} />
            <Wire points={[[710, 200], [800, 200]]} live color={WATER} flow={domFlow} />
            <Instrument x={755} y={240} code="PT" value={`${fmt(num(chambers.VC_02.Downstream_Pressure), 2)}`} {...pick('VC_02')} />

            {/* ---- Ring main ---- */}
            <Wire points={[[800, 200], [800, 90], [1340, 90], [1340, 330], [1250, 330]]} live color={WATER} flow={domFlow} />
            <Wire points={[[800, 200], [800, 330], [1230, 330]]} live color={WATER} flow={domFlow} />
            {TAPS.map((t) => (
              <g key={t.x}>
                <Wire points={[[t.x, 90], [t.x, 56]]} live color={WATER} width={2} />
                <Label x={t.x} y={46} anchor="middle" color="#e4d6f5">
                  {t.label}
                </Label>
              </g>
            ))}
            <Label x={808} y={118} color="#d0c0df" weight={600}>
              RING MAIN
            </Label>
            <Valve x={1010} y={90} open={open('VC_08')} vertical label="VC-08 air" {...pick('VC_08')} />
            <Valve x={900} y={330} open={open('VC_03')} label="VC-03" {...pick('VC_03')} />
            <Valve x={1070} y={330} open={open('VC_04')} label="VC-04" {...pick('VC_04')} />
            <Valve x={1240} y={330} open={open('VC_05')} label="VC-05" {...pick('VC_05')} />
            <Label x={1240} y={360} anchor="middle" color="#9d78ff">
              shut · repair
            </Label>
            <Wire points={[[1340, 270], [1372, 270]]} live={false} />
            <Valve x={1380} y={270} open={open('VC_06')} vertical normallyClosed label="" {...pick('VC_06')} />
            <Label x={1340} y={296} anchor="end">
              VC-06 washout
            </Label>
            <Instrument x={1180} y={130} code="PT" value={`${fmt(num(chambers.VC_04.Downstream_Pressure), 2)} bar`} {...pick('VC_04')} />
            <line x1={1180} y1={90} x2={1180} y2={116} stroke="#b09dc1" strokeDasharray="2 2" />

            {/* ---- TSE → irrigation tank ---- */}
            <Source x={50} y={400} live label="TSE supply" value="treated effluent" color={TSE} />
            <Wire points={[[50, 404], [50, 470], [120, 470]]} live color={TSE} flow={trf} />
            <Wire points={[[120, 440], [120, 500]]} live color={TSE} />
            <Wire points={[[220, 440], [220, 500]]} live color={TSE} />
            {setBy.BST_TRF.pumps.map((p, i) => {
              const y = 440 + i * 60;
              const on = Boolean(p.values.Running);
              return (
                <g key={p.def.tag}>
                  <Wire points={[[120, y], [154, y]]} live color={TSE} flow={on} />
                  <Pump x={170} y={y} running={on} color={TSE} label={i === 1 ? 'Transfer' : undefined} {...pick(p.def.tag)} />
                  <Wire points={[[186, y], [220, y]]} live color={TSE} flow={on} />
                </g>
              );
            })}
            <Wire points={[[220, 470], [300, 470]]} live color={TSE} flow={trf} />
            <Tank x={300} y={420} w={110} h={150} level={num(tanks.TANK_IRR_01.Level_Pct) / 100} label="Irrigation tank" value={`${fmt(num(tanks.TANK_IRR_01.Level_Pct))}%`} color={TSE} {...pick('TANK_IRR_01')} />

            {/* ---- Irrigation pumps → zones ---- */}
            <Wire points={[[410, 540], [480, 540]]} live color={TSE} flow={irr} />
            <Wire points={[[480, 490], [480, 550]]} live color={TSE} />
            <Wire points={[[600, 490], [600, 550]]} live color={TSE} />
            {setBy.BST_IRR.pumps.map((p, i) => {
              const y = 490 + i * 60;
              const on = Boolean(p.values.Running);
              return (
                <g key={p.def.tag}>
                  <Wire points={[[480, y], [524, y]]} live color={TSE} flow={on} />
                  <Pump x={540} y={y} running={on} color={TSE} {...pick(p.def.tag)} />
                  <Wire points={[[556, y], [600, y]]} live color={TSE} flow={on} />
                </g>
              );
            })}
            <Label x={540} y={594} anchor="middle" weight={600}>
              IRRIGATION PUMPS
            </Label>
            <Wire points={[[600, 520], [700, 520]]} live color={TSE} flow={irr} />
            <Instrument x={650} y={480} code="FT" value={`${fmt(num(setBy.BST_IRR.values.Flow_m3h), 1)} m³/h`} side="above" {...pick('BST_IRR')} />
            <Valve x={710} y={520} open={open('VC_07')} label="VC-07 ⚠ flooded" {...pick('VC_07')} />
            <Wire points={[[720, 520], [1336, 520]]} live color={TSE} flow={irr} />
            {ZONES.map((z, k) => {
              const x = ZONE_X[k];
              const v = zones[k];
              const on = Boolean(v.Valve_Open);
              return (
                <g key={z.tag}>
                  <Wire points={[[x, 520], [x, 562]]} live color={TSE} flow={on} width={2} />
                  <Valve x={x} y={574} open={on} vertical normallyClosed {...pick(z.tag)} />
                  <Wire points={[[x, 586], [x, 606]]} live={on} color={TSE} flow={on} width={2} />
                  <Label x={x} y={624} anchor="middle" color="#ffffff" weight={600}>
                    {z.label}
                  </Label>
                  <Label x={x} y={640} anchor="middle" color={on ? '#9d78ff' : '#5f526d'}>
                    {on ? `${fmt(num(v.Flow_m3h), 0)} m³/h` : String(v.Next_Start)}
                  </Label>
                </g>
              );
            })}
            <Label x={836} y={506} weight={600}>
              IRRIGATION ZONES
            </Label>

            {/* ---- Fire water ---- */}
            <Tank x={40} y={600} w={80} h={62} level={num(tanks.TANK_FIRE_01.Level_Pct) / 100} label="Fire tank" color={FIRE} {...pick('TANK_FIRE_01')} />
            <Wire points={[[120, 655], [310, 655]]} live color={FIRE} />
            <Wire points={[[170, 615], [370, 615]]} live color={FIRE} flow={fireFlow} />
            {setBy.BST_FIRE.pumps.map((p, i) => {
              const x = 170 + i * 70;
              const on = Boolean(p.values.Running);
              return (
                <g key={p.def.tag}>
                  <Wire points={[[x, 655], [x, 648]]} live color={FIRE} flow={on} />
                  <Pump x={x} y={636} running={on} color={FIRE} {...pick(p.def.tag)} />
                  <Wire points={[[x, 624], [x, 615]]} live color={FIRE} flow={on} />
                  <Label x={x + 20} y={654} color="#b09dc1" size={10.5}>
                    {p.def.label === 'Jockey' ? 'JP' : p.def.label === 'Electric' ? 'EP' : 'DP'}
                  </Label>
                </g>
              );
            })}
            <Instrument x={395} y={615} code="PT" value={`${fmt(num(setBy.BST_FIRE.values.Header_Pressure), 1)} bar · fire main`} {...pick('BST_FIRE')} />

            <Legend
              x={560}
              y={672}
              items={[
                { label: 'Domestic', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke={WATER} strokeWidth={3} /> },
                { label: 'TSE / irrigation', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke={TSE} strokeWidth={3} /> },
                { label: 'Fire water', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke={FIRE} strokeWidth={3} /> },
                { label: 'Flowing', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke="#ffffff" strokeDasharray="4 4" strokeWidth={2} /> },
                { label: 'Valve shut (abnormal)', swatch: <path d="M0 -8 L0 8 L18 -8 L18 8 Z" fill="#060408" stroke="#d96b84" strokeWidth={1.5} /> },
                { label: 'Idle', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke={DEAD} strokeWidth={3} /> },
              ]}
            />
          </svg>
        </div>
      </Panel>

      <Panel frame={side} index={1} icon={<Glyph id="wrench" size={20} color="#ffffff" />} title={device.title} subtitle={`${sel} · ${device.template.name}`}>
        <div className="pf-scroll absolute inset-x-[16px] bottom-[14px] top-[2px]">
          <p className="mb-[10px] text-[13px] text-ink-3">{device.template.desc} · click any tank, pump, valve or instrument.</p>
          <GalaxyPoints tag={sel} template={device.template} values={device.values} />
          {running(sel) && <p className="mt-[10px] text-[12px] text-ok">Running now</p>}
        </div>
      </Panel>
    </>
  );
}
