import { useState } from 'react';
import { Panel } from '@/components/frame/Panel';
import { GalaxyPoints } from '@/components/data/GalaxyPoints';
import { Ats, Breaker, Bus, DEAD, Generator, Label, Legend, LIVE, LoadBox, Source, Transformer, Wire } from '@/components/sld/Sld';
import { row } from '@/screens/layout';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import { EMDB_FEEDERS, GENSETS, MDB_A_FEEDERS, MDB_B_FEEDERS, TRANSFORMERS, gensetPhase, networkState } from '@/model/assets/electrical';
import { DrillControl } from '@/screens/electric/PowerScreens';

const num = (v: unknown) => (typeof v === 'number' ? v : 0);

const TX_X = [150, 290, 480, 620];
const MDB_A_X = [120, 225, 330];
const MDB_B_X = [460, 565, 670];
const GEN_X = [960, 1070, 1180, 1290];
const EMDB_X = [950, 1040, 1130, 1220, 1310];
const LOAD_TEXT: Record<string, string> = {
  CB_FA1: 'SMDB\nRetail East',
  CB_FA2: 'SMDB\nFood Court',
  CB_FA3: 'SMDB\nCar Park',
  CB_FB1: 'SMDB Cinema\n& Anchor',
  CB_FB2: 'SMDB\nOffices',
  CB_E1: 'UPS\ninput',
  CB_E2: 'Fire\npumps',
  CB_E3: 'Smoke\nextract',
  CB_E4: 'Lifts',
  CB_E5: 'Emergency\nlighting',
};

function titleOf(tag: string): string {
  if (tag === 'CB_INC_A' || tag === 'CB_INC_B') return `Incomer ${tag.slice(-1)} · 22 kV`;
  if (tag.startsWith('CB_Q1')) return `Q1${tag.slice(-1)} · TR-${tag.slice(-1)} feeder`;
  if (tag.startsWith('TR_')) return `TR-${Number(tag.slice(-2))} · 1600 kVA`;
  if (tag.startsWith('ACB_T')) return `ACB-T${tag.slice(-1)} · LV incomer`;
  if (tag === 'CB_BC') return 'Bus coupler MDB-A / MDB-B';
  if (tag.startsWith('GEN_')) return `G${Number(tag.slice(-3))} · 1500 kVA`;
  if (tag.startsWith('GCB_')) return `GCB-${tag.slice(-1)} · generator breaker`;
  if (tag === 'ATS_EMDB') return 'ATS · essential board';
  const f = [...MDB_A_FEEDERS, ...MDB_B_FEEDERS, ...EMDB_FEEDERS].find((x) => x.tag === tag);
  return f ? `${f.label} feeder` : tag;
}

/** Electric › SLD: the site's single-line diagram, live from each device's state. */
export function ElectricSldScreen() {
  const now = useNow(1000);
  const mains = useScenario((s) => s.mains);
  const net = networkState(mains, now);
  const [sel, setSel] = useState('ATS_EMDB');
  const [diagram, side] = row(208, 770, [1440, 351]);

  const utility = !mains.failed;
  const gen = gensetPhase(mains, now);
  const gensOnLoad = gen.phase === 'onLoad';
  const emdbLive = net.ATS_EMDB.live;
  const kw = (tag: string) => num(net[tag].values.Active_Power ?? net[tag].values.Output_kW);
  const pick = (tag: string) => ({ selected: sel === tag, onClick: () => setSel(tag), title: titleOf(tag) });
  const brk = (tag: string) => ({ closed: Boolean(net[tag].values.Closed), live: net[tag].live, tripped: Boolean(net[tag].values.Tripped) });
  const device = net[sel];

  return (
    <>
      <Panel frame={diagram} index={0} icon={<SldIcon />} title="Single-Line Diagram" subtitle="22 kV utility → 4 × 1600 kVA → MDB-A / MDB-B · generators → ATS → essential board" action={<DrillControl compact />}>
        <div className="absolute inset-x-[10px] bottom-[6px] top-0">
        <svg viewBox="0 0 1400 680" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          {/* ---- Utility incomers and MV bus ---- */}
          {(['A', 'B'] as const).map((s, i) => {
            const x = i ? 620 : 150;
            const tag = `CB_INC_${s}`;
            return (
              <g key={s}>
                <Source x={x} y={36} live={utility} label={`Utility ${s} · 22 kV`} value={`${fmt(kw(tag))} kW`} />
                <Wire points={[[x, 40], [x, 96]]} live={utility} flow={utility} />
                <Breaker x={x} y={105} {...brk(tag)} label={`INC-${s}`} {...pick(tag)} />
                <Wire points={[[x, 114], [x, 150]]} live={utility} flow={utility} />
              </g>
            );
          })}
          <Bus x1={90} x2={700} y={150} live={utility} />
          <Label x={168} y={140} color="#b4d3d8" weight={600}>
            MV BUS <tspan fill={utility ? '#fff' : '#6f929a'} fontWeight={400}>{utility ? '22.0 kV' : '0 kV'}</tspan>
          </Label>

          {/* ---- Transformers and LV incomers ---- */}
          {TRANSFORMERS.map((t, i) => {
            const x = TX_X[i];
            const tv = net[t.tag].values;
            return (
              <g key={t.tag}>
                <Wire points={[[x, 150], [x, 181]]} live={utility} flow={utility} />
                <Breaker x={x} y={190} {...brk(`CB_Q1${i + 1}`)} label={`Q1${i + 1}`} {...pick(`CB_Q1${i + 1}`)} />
                <Wire points={[[x, 199], [x, 223]]} live={utility} flow={utility} />
                <Transformer x={x} y={248} live={utility} {...pick(t.tag)} />
                <Label x={x + 24} y={240} color="#ffffff">
                  {t.label} · 1600 kVA
                </Label>
                <Label x={x + 24} y={256} color={utility ? '#9be9ff' : '#6f929a'}>
                  {fmt(num(tv.Active_Power))} kW · {fmt(num(tv.Load_Pct))}%
                </Label>
                <Label x={x + 24} y={272}>{fmt(num(tv.Winding_Temp))} °C winding</Label>
                <Wire points={[[x, 274], [x, 296]]} live={utility} flow={utility} />
                <Breaker x={x} y={305} {...brk(`ACB_T${i + 1}`)} label={`ACB-T${i + 1}`} {...pick(`ACB_T${i + 1}`)} />
                <Wire points={[[x, 314], [x, 345]]} live={utility} flow={utility} />
              </g>
            );
          })}

          {/* ---- LV boards and bus coupler ---- */}
          <Bus x1={90} x2={355} y={345} live={utility} />
          <Bus x1={415} x2={700} y={345} live={utility} />
          <Label x={172} y={336} weight={600}>
            MDB-A <tspan fill={utility ? '#fff' : '#6f929a'} fontWeight={400}>{utility ? '400 V' : '0 V'}</tspan>
          </Label>
          <Label x={500} y={336} weight={600}>
            MDB-B <tspan fill={utility ? '#fff' : '#6f929a'} fontWeight={400}>{utility ? '400 V' : '0 V'}</tspan>
          </Label>
          <Wire points={[[355, 345], [376, 345]]} live={false} />
          <Wire points={[[394, 345], [415, 345]]} live={false} />
          <Breaker x={385} y={345} {...brk('CB_BC')} label="Coupler" labelSide="below" {...pick('CB_BC')} />

          {[...MDB_A_FEEDERS.map((f, i) => ({ f, x: MDB_A_X[i] })), ...MDB_B_FEEDERS.slice(0, 2).map((f, i) => ({ f, x: MDB_B_X[i] }))].map(({ f, x }) => (
            <g key={f.tag}>
              <Wire points={[[x, 345], [x, 381]]} live={utility} flow={utility} />
              <Breaker x={x} y={390} {...brk(f.tag)} {...pick(f.tag)} />
              <Wire points={[[x, 399], [x, 425]]} live={utility} flow={utility} />
              <LoadBox x={x} y={425} label={LOAD_TEXT[f.tag]} value={`${fmt(kw(f.tag))} kW`} live={utility} {...pick(f.tag)} />
            </g>
          ))}

          {/* MDB-B → EMDB normal supply, routed to the ATS */}
          <Wire points={[[670, 345], [670, 381]]} live={utility} flow={utility} />
          <Breaker x={670} y={390} {...brk('CB_FB3')} {...pick('CB_FB3')} />
          <Wire points={[[670, 399], [670, 494], [1099, 494]]} live={utility} flow={utility && !gensOnLoad} />
          <Label x={690} y={484}>
            Essential board · normal supply {utility ? `· ${fmt(kw('CB_FB3'))} kW` : ''}
          </Label>

          {/* ---- Generators, generator bus ---- */}
          {GENSETS.map((g, i) => {
            const x = GEN_X[i];
            const v = net[g.tag].values;
            const running = Boolean(v.Status_Running);
            const genLive = net[g.tag].live;
            return (
              <g key={g.tag}>
                <Generator x={x} y={58} live={genLive} running={running} {...pick(g.tag)} />
                <Label x={x + 30} y={52} color="#ffffff" weight={600}>
                  {g.label}
                </Label>
                <Label x={x + 30} y={68} color={genLive ? '#9be9ff' : '#6f929a'}>
                  {running ? `${fmt(num(v.Output_kW))} kW` : 'Standby'}
                </Label>
                <Wire points={[[x, 82], [x, 121]]} live={genLive} />
                <Breaker x={x} y={130} {...brk(`GCB_${i + 1}`)} label={`GCB-${i + 1}`} {...pick(`GCB_${i + 1}`)} />
                <Wire points={[[x, 139], [x, 175]]} live={gensOnLoad} flow={gensOnLoad} />
              </g>
            );
          })}
          <Bus x1={930} x2={1320} y={175} live={gensOnLoad} />
          <Label x={934} y={198} weight={600}>
            GEN BUS <tspan fill={gensOnLoad ? '#fff' : '#6f929a'} fontWeight={400}>{gensOnLoad ? '400 V · 50 Hz' : 'dead'}</tspan>
          </Label>
          <Wire points={[[1125, 175], [1125, 480]]} live={gensOnLoad} flow={gensOnLoad} />

          {/* ---- ATS and essential board ---- */}
          <Ats x={1125} y={500} position={utility ? 'normal' : gensOnLoad ? 'emergency' : 'normal'} live={emdbLive} {...pick('ATS_EMDB')} />
          <Wire points={[[1125, 528], [1125, 560]]} live={emdbLive} flow={emdbLive} />
          <Bus x1={930} x2={1330} y={560} live={emdbLive} />
          <Label x={934} y={550} weight={600}>
            EMDB <tspan fill={emdbLive ? '#fff' : '#6f929a'} fontWeight={400}>{emdbLive ? (utility ? 'on mains' : 'on generators') : 'dead'}</tspan>
          </Label>
          {EMDB_FEEDERS.map((f, i) => {
            const x = EMDB_X[i];
            return (
              <g key={f.tag}>
                <Wire points={[[x, 560], [x, 591]]} live={emdbLive} flow={emdbLive} />
                <Breaker x={x} y={600} {...brk(f.tag)} {...pick(f.tag)} />
                <Wire points={[[x, 609], [x, 620]]} live={emdbLive} />
                <LoadBox x={x} y={620} w={84} label={LOAD_TEXT[f.tag]} value={`${fmt(kw(f.tag))} kW`} live={emdbLive} {...pick(f.tag)} />
              </g>
            );
          })}

          <Legend
            x={20}
            y={640}
            items={[
              { label: 'Energised', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke={LIVE} strokeWidth={3} /> },
              { label: 'De-energised', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke={DEAD} strokeWidth={3} /> },
              { label: 'Breaker closed', swatch: <rect x={2} y={-7} width={14} height={14} rx={2} fill={LIVE} stroke="#fff" /> },
              { label: 'Breaker open', swatch: <rect x={2} y={-7} width={14} height={14} rx={2} fill="#031a1c" stroke="#4ade6b" /> },
              { label: 'Power flow', swatch: <line x1={0} x2={18} y1={0} y2={0} stroke="#fff" strokeDasharray="4 4" strokeWidth={2} /> },
            ]}
          />
          <Label x={20} y={612} color="#79a4aa">
            Click any breaker, transformer, generator or board for its Galaxy points.
          </Label>
        </svg>
        </div>
      </Panel>

      <Panel frame={side} index={1} icon={<SldIcon />} title={titleOf(sel)} subtitle={`${sel} · ${device.template.name}`}>
        <div className="pf-scroll absolute inset-x-[16px] bottom-[14px] top-[2px]">
          <p className="mb-[10px] flex items-center gap-[8px] text-[13px]" style={{ color: device.live ? '#9be9ff' : '#6f929a' }}>
            <span className="h-[8px] w-[8px] rounded-full" style={{ background: device.live ? LIVE : DEAD }} />
            {device.live ? 'Energised' : 'De-energised'} · {device.template.desc}
          </p>
          <GalaxyPoints tag={sel} template={device.template} values={device.values} />
        </div>
      </Panel>
    </>
  );
}

export const SldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M12 2v5M5 7h14M5 7v5M19 7v5M12 7v10M3 17h18" />
    <rect x="3.5" y="11" width="3" height="3" />
    <rect x="17.5" y="11" width="3" height="3" />
  </svg>
);
