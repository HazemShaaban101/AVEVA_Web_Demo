import { useState } from 'react';
import { Panel, type PanelProps } from '@/components/frame/Panel';
import { ModeButton } from '@/components/controls/Controls';
import { TrendChart, type TrendPoint } from '@/components/charts/TrendChart';
import { nextPeriod, PERIODS, useSeriesOf, type Period } from '@/sim/useSignal';
import type { SignalId } from '@/sim/catalog';
import { scopedSignal, useScope } from '@/sim/scope';
import type { Signal } from '@/sim/signals';

export interface TrendCardProps extends Omit<PanelProps, 'children' | 'action' | 'actionPlacement'> {
  sim: SignalId | Signal;
  /** Plot another signal instead of the prediction (e.g. supply vs return). */
  compare?: SignalId | Signal;
  yTitle?: string;
  names?: { actual: string; predictive: string };
  decimals?: number;
  /** Hours shown in the day view (the chilled-water design shows 15). */
  dayHours?: number;
}

/** A trend card: title, the "Mode" period switch, and the actual-vs-predictive chart. */
export function TrendCard({ sim, compare, yTitle, names, decimals = 1, dayHours, ...panel }: TrendCardProps) {
  const [period, setPeriod] = useState<Period>('day');
  const scope = useScope();
  const s = typeof sim === 'string' ? scopedSignal(sim, scope) : sim;
  const c = compare ? (typeof compare === 'string' ? scopedSignal(compare, scope) : compare) : s;
  const series = useSeriesOf(s, period);
  const other = useSeriesOf(c, period);

  let data: TrendPoint[] = series.map((p, i) => ({ label: p.label, actual: p.actual, predictive: compare ? other[i].actual : p.predictive }));
  if (dayHours && period === 'day') data = data.slice(-dayHours);

  return (
    <Panel {...panel} actionPlacement="inline" action={<ModeButton label={PERIODS[period].name} onClick={() => setPeriod(nextPeriod(period))} />}>
      <div className="absolute inset-x-[18px] bottom-[10px] top-[4px]">
        <TrendChart data={data} yTitle={yTitle ?? `Volume (${s.def.unit})`} xTitle={PERIODS[period].axis} unit={s.def.unit} names={names} decimals={decimals} />
      </div>
    </Panel>
  );
}
