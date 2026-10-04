import { Panel } from '@/components/frame/Panel';
import { CardIcon, PowerIcon } from '@/components/icons/UiIcons';
import { ArcStacked, BarsBody, DialStacked } from '@/widgets/Widgets';
import { TrendCard } from '@/widgets/TrendCard';
import { loadVerdict } from '@/widgets/verdicts';
import { row } from '@/screens/layout';
import { derivedSignal } from '@/sim/catalog';
import { useSignal } from '@/sim/useSignal';

/** Electric › Transformers (design "electric"). */
export function TransformersScreen() {
  const [a, b, c] = row(208, 400, 3, { gap: 60 });
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
    </>
  );
}

/** 5 generator sets; how many run follows the generator load. */
function GeneratorsOn() {
  const { value } = useSignal('electric.generatorLoad', 5000);
  const on = Math.max(1, Math.min(5, Math.round((value / 100) * 5)));
  const pct = (on / 5) * 100;
  return <ArcStacked source={{ fixed: pct }} decimals={0} verdict={() => ({ text: `${pct}% ON`, tone: 'warn' as const })} />;
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
