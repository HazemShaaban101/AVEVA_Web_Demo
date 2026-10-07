import { Panel } from '@/components/frame/Panel';
import { AssetPanel } from '@/components/frame/AssetPanel';
import { Meter, Tag, type TagTone } from '@/components/data/DataTable';
import { TONE_COLOR } from '@/components/controls/Controls';
import { CardIcon, PowerIcon } from '@/components/icons/UiIcons';
import { ArcStacked, BarsBody, DialStacked } from '@/widgets/Widgets';
import { TrendCard } from '@/widgets/TrendCard';
import { loadVerdict } from '@/widgets/verdicts';
import { row } from '@/screens/layout';
import { derivedSignal } from '@/sim/catalog';
import { useSignal } from '@/sim/useSignal';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import { TRANSFORMERS, TRANSFORMER_TEMPLATE, networkState } from '@/model/assets/electrical';

const num = (v: unknown) => (typeof v === 'number' ? v : 0);
/** Status of a reading against its warning and alarm limits (a falling one, like oil level, passes `below`). */
const level = (v: number, warn: number, bad: number, below = false): TagTone => (below ? (v < bad ? 'bad' : v < warn ? 'warn' : 'good') : v >= bad ? 'bad' : v >= warn ? 'warn' : 'good');

/** Electric › Transformers: the site-wide loads, then each transformer's loading, temperatures and oil level. */
export function TransformersScreen() {
  const [a, b, c] = row(208, 320, 3, { gap: 60 });
  const cards = row(543, 435, TRANSFORMERS.length);
  const now = useNow(2000);
  const mains = useScenario((s) => s.mains);
  const net = networkState(mains, now);
  return (
    <>
      <Panel frame={a} index={0} icon={<CardIcon />} title="Transformer Load" subtitle="Current Average Transformer Load">
        <DialStacked source={{ sim: 'electric.transformerLoad' }} unit="%" verdict={loadVerdict} />
      </Panel>
      <Panel frame={b} index={1} icon={<CardIcon />} title="Generator Load" subtitle="Current Average Generator Load">
        <DialStacked source={{ sim: 'electric.generatorLoad' }} unit="%" verdict={loadVerdict} />
      </Panel>
      <Panel frame={c} index={2} icon={<CardIcon />} title="Generators" subtitle="Percentage of Generators On">
        <GeneratorsOn />
      </Panel>

      {TRANSFORMERS.map((t, i) => {
        const d = net[t.tag];
        return (
          <AssetPanel
            key={t.tag}
            frame={cards[i]}
            index={3 + i}
            icon={<PowerIcon />}
            title={t.label}
            subtitle={`${fmt(t.kva)} kVA · feeds ${t.board}`}
            points={{ tag: t.tag, template: TRANSFORMER_TEMPLATE, values: d.values }}
          >
            <TransformerBody live={d.live} v={d.values} />
          </AssetPanel>
        );
      })}
    </>
  );
}

function Metric({ label, hint, value, unit, tone, bar }: { label: string; hint: string; value: number; unit: string; tone: TagTone; bar: number }) {
  const color = tone === 'warn' || tone === 'bad' ? TONE_COLOR[tone] : '#ffffff';
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[15px] text-white">{label}</p>
          <p className="text-[12px] text-ink-3">{hint}</p>
        </div>
        <span className="flex items-baseline gap-[5px]">
          <span className="text-[30px] font-medium leading-none tabular-nums" style={{ color }}>
            {fmt(value)}
          </span>
          <span className="text-[15px] text-ink-3">{unit}</span>
        </span>
      </div>
      <div className="mt-[5px]">
        <Meter value={bar} tone={tone} width={340} label={false} />
      </div>
    </div>
  );
}

/** One transformer: loading against rating, winding and top-oil temperature, and conservator oil level. */
function TransformerBody({ live, v }: { live: boolean; v: Record<string, unknown> }) {
  const load = num(v.Load_Pct);
  const winding = num(v.Winding_Temp);
  const oilTemp = num(v.Oil_Temp);
  const oil = num(v.Oil_Level_Pct);
  return (
    <div className="absolute inset-x-[20px] top-[0px] flex flex-col gap-[8px]">
      <div className="flex items-center gap-[8px]">
        {live ? <Tag tone="good">In service</Tag> : <Tag tone="idle">Not energised</Tag>}
        {v.Fans_Running ? <Tag tone="info" dot={false}>Fans running</Tag> : null}
        {v.Oil_Level_Low ? <Tag tone="warn">Low oil</Tag> : null}
        <span className="ml-auto text-[14px] text-ink-3">{fmt(num(v.Active_Power))} kW</span>
      </div>
      <Metric label="Loading" hint="Against 1,600 kVA rating" value={load} unit="%" tone={live ? level(load, 85, 100) : 'good'} bar={load} />
      <Metric label="Winding temperature" hint="Alarm 130 °C · trip 150 °C" value={winding} unit="°C" tone={level(winding, 110, 130)} bar={(winding / 150) * 100} />
      <Metric label="Top-oil temperature" hint="Limit 95 °C" value={oilTemp} unit="°C" tone={level(oilTemp, 80, 95)} bar={(oilTemp / 95) * 100} />
      <Metric label="Oil level" hint="Low alarm below 65 %" value={oil} unit="%" tone={level(oil, 65, 50, true)} bar={oil} />
    </div>
  );
}

/** 5 generator sets; how many run follows the generator load. */
function GeneratorsOn() {
  const { value } = useSignal('electric.generatorLoad', 5000);
  const on = Math.max(1, Math.min(5, Math.round((value / 100) * 5)));
  const pct = (on / 5) * 100;
  return <ArcStacked source={{ fixed: pct }} decimals={0} verdict={() => ({ text: `${pct}% ON`, tone: 'good' as const })} />;
}

const FEEDERS = ['MDB-01', 'MDB-02', 'MDB-03', 'MDB-04', 'MDB-05', 'MDB-06', 'MDB-07', 'MDB-08'];

/** Electric › MDB (design "Electric-1"), plus feeder loads underneath. */
export function MdbScreen() {
  const [top] = row(208, 360, 1);
  const [bottom] = row(593, 380, 1);
  const groups = FEEDERS.map((f, i) => ({
    label: f,
    a: derivedSignal(`mdb.${f}.rated`, { unit: 'kW', low: 640 + (i % 3) * 120, high: 640 + (i % 3) * 120, profile: 'flat', noise: 0, decimals: 0 }),
    b: derivedSignal(`mdb.${f}.load`, { unit: 'kW', low: 140 + i * 18, high: 470 + (i % 4) * 60, profile: i % 2 ? 'retail' : 'office', noise: 0.08, decimals: 0 }),
  }));
  return (
    <>
      <TrendCard frame={top} index={0} icon={<PowerIcon />} title="Total Power Demand" subtitle="Environmental Power Consumption Comparison Graph" sim="electric.demand" yTitle="Demand (MW)" decimals={2} />
      <Panel frame={bottom} index={1} icon={<CardIcon />} title="Feeder Loads" subtitle="Live Load Against Rated Capacity Per MDB">
        <BarsBody groups={groups} names={{ a: 'Rated Capacity', b: 'Live Load' }} yTitle="Load (kW)" xTitle="Feeder" unit="kW" fillWidth={1} />
      </Panel>
    </>
  );
}
