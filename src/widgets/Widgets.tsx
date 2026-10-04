import type { ReactNode } from 'react';
import { Capsule, Hairline, StatusPill, Verdict, type PillState, type Tone } from '@/components/controls/Controls';
import { ArcGauge, BarMeter, CountRing, DialGauge, RingGauge } from '@/components/gauges/Gauges';
import { AnimatedNumber } from '@/components/gauges/AnimatedNumber';
import { PairedBarChart, type BarGroup } from '@/components/charts/PairedBarChart';
import { useSource, type Source } from '@/widgets/source';
import type { VerdictResult, VerdictRule } from '@/widgets/verdicts';
import type { Signal } from '@/sim/signals';
import { useNow } from '@/sim/clock';
import { fmt } from '@/utils/format';

/* ------------------------------------------------------------------------------------------------
 * Widget bodies: the recurring layouts inside the design's cards. Every screen is assembled from
 * these (see screens/specs). Each takes a data Source, not a number, so it stays live by itself.
 * ---------------------------------------------------------------------------------------------- */

function LiveBadge({ status }: { status?: string }) {
  const text = status === 'live' ? 'LIVE · SIMULATED' : status === 'reconnecting' ? 'RECONNECTING' : status === 'not_found' ? 'NOT IN GALAXY' : 'CONNECTING';
  const color = status === 'live' ? '#4ade6b' : status === 'reconnecting' || status === 'not_found' ? '#ffb020' : '#4fc3d4';
  return (
    <span className="absolute right-[16px] top-[8px] flex items-center gap-[6px] text-[11px] tracking-[1px]" style={{ color }}>
      <span className="h-[6px] w-[6px] rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}`, animation: status === 'live' ? 'pf-alarm-blink 2s infinite' : undefined }} />
      {text}
    </span>
  );
}

/** Round a scaled gauge maximum to a tidy number. */
const tidy = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1)));
  return Math.ceil(v / p) * p;
};

/** Gauge on the left, hairline, verdict on the right — the most common card. */
export function DialVerdict({ source, min = 0, max = 100, decimals = 0, unit, verdict, display }: { source: Source; min?: number; max?: number; decimals?: number; unit?: string; verdict: VerdictRule; display?: (v: number) => string }) {
  const v = useSource(source);
  const r = verdict(v.value, v.predictive);
  return (
    <div className="flex h-full items-center">
      {v.live && <LiveBadge status={v.status} />}
      <div className="flex h-full w-[48%] items-center justify-center py-[2px]">
        <DialGauge value={v.value} min={min} max={v.rangeScale === 1 ? max : tidy(max * v.rangeScale)} unit={unit ?? v.unit} decimals={decimals} display={display && v.value !== null ? display(v.value) : undefined} />
      </div>
      <Hairline />
      <div className="flex flex-1 justify-center px-[12px]">
        <Verdict text={r.text} tone={r.tone} />
      </div>
    </div>
  );
}

/** Gauge centered with the verdict under a divider (Electric cards). */
export function DialStacked({ source, min = 0, max = 100, decimals = 0, unit, verdict }: { source: Source; min?: number; max?: number; decimals?: number; unit?: string; verdict: VerdictRule }) {
  const v = useSource(source);
  const r = verdict(v.value, v.predictive);
  return (
    <div className="flex h-full flex-col items-center pb-[24px] pt-[6px]">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <DialGauge value={v.value} min={min} max={v.rangeScale === 1 ? max : tidy(max * v.rangeScale)} unit={unit ?? v.unit} decimals={decimals} size={262} />
      </div>
      <span className="my-[14px] h-px w-[268px] shrink-0 bg-accent/15" />
      <Verdict text={r.text} tone={r.tone} />
    </div>
  );
}

export function ArcStacked({ source, label, decimals = 0, verdict }: { source: Source; label?: string; decimals?: number; verdict: VerdictRule | ((v: number | null) => VerdictResult) }) {
  const v = useSource(source);
  const r = verdict(v.value, v.predictive);
  return (
    <div className="flex h-full flex-col items-center pb-[24px] pt-[6px]">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <ArcGauge value={v.value} label={label} decimals={decimals} size={290} />
      </div>
      <span className="my-[14px] h-px w-[268px] shrink-0 bg-accent/15" />
      <Verdict text={r.text} tone={r.tone} />
    </div>
  );
}

export function ArcVerdict({ source, label, unit, decimals = 0, verdict, suffix = '' }: { source: Source; label?: string; unit?: string; decimals?: number; verdict: VerdictRule; suffix?: string }) {
  const v = useSource(source);
  const r = verdict(v.value, v.predictive);
  return (
    <div className="flex h-full items-center">
      <div className="flex w-[64%] justify-center">
        <ArcGauge value={v.value} label={label ?? unit ?? v.unit} decimals={decimals} size={260} suffix={suffix} />
      </div>
      <Hairline />
      <div className="flex flex-1 justify-center">
        <Verdict text={r.text} tone={r.tone} />
      </div>
    </div>
  );
}

/** "Alarms │ Normal": capsule on the left, colored state on the right (Fire System status cards). */
export function CapsuleState({ capsule, state, tone }: { capsule: string; state: string; tone: Tone }) {
  return (
    <div className="flex h-full items-center justify-center gap-[40px] pb-[8px]">
      <Capsule size={30}>{capsule}</Capsule>
      <Hairline height={54} />
      <span className="min-w-[180px]">
        <Verdict text={state} tone={tone} size={34} />
      </span>
    </div>
  );
}

/** Centered pill (or capsule) over a divider and a verdict (Domestic Pump, Zone overviews, Last Alarm). */
export function PillStacked({ pill, capsule, capsuleTone, verdict }: { pill?: PillState; capsule?: ReactNode; capsuleTone?: 'alarm'; verdict: VerdictResult }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[20px] pb-[20px]">
      {pill ? <StatusPill state={pill} size={30} /> : <Capsule size={30} tone={capsuleTone}>{capsule}</Capsule>}
      <span className="h-px w-[268px] bg-accent/15" />
      <Verdict text={verdict.text} tone={verdict.tone} size={34} />
    </div>
  );
}

export function CountStacked({ count, alarm, verdict }: { count: number; alarm?: boolean; verdict: VerdictResult }) {
  return (
    <div className="flex h-full flex-col items-center pb-[24px] pt-[6px]">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <CountRing value={count} alarm={alarm} size={150} />
      </div>
      <span className="my-[14px] h-px w-[268px] shrink-0 bg-accent/15" />
      <Verdict text={verdict.text} tone={verdict.tone} size={34} />
    </div>
  );
}

/** Paired bars for N areas/buildings, each a derived signal pair (Sector A vs B, predictive vs actual…). */
export function BarsBody({ groups, names, yTitle, xTitle, unit, compact, fillWidth }: { groups: { label: string; a: Signal; b: Signal }[]; names: { a: string; b: string }; yTitle?: string; xTitle?: string; unit?: string; compact?: boolean; fillWidth?: number }) {
  const now = useNow(10_000);
  const data: BarGroup[] = groups.map((g) => ({ label: g.label, a: g.a.actual(now), b: g.b.actual(now) }));
  return (
    <div className="absolute inset-x-[18px] bottom-[12px] top-[2px]">
      <PairedBarChart data={data} names={names} yTitle={yTitle} xTitle={xTitle} unit={unit} compact={compact} fillWidth={fillWidth} />
    </div>
  );
}

/** Big number + unit, a hairline, and a side note (bottom KPI tiles of the 3D View overlay). */
export function KpiBody({ source, decimals = 1, unit, note, noteTone = 'aqua', extra }: { source: Source; decimals?: number; unit?: string; note: ReactNode | ((v: number | null, p: number | null) => ReactNode); noteTone?: Tone; extra?: ReactNode }) {
  const v = useSource(source);
  return (
    <div className="flex h-full items-center px-[18px] pb-[10px]">
      <span className="font-medium leading-none text-[#6fe3ff]" style={{ fontSize: 54, letterSpacing: '-0.02em' }}>
        {v.value === null ? '—' : <AnimatedNumber value={v.value} decimals={decimals} />}
      </span>
      <span className="ml-[6px] self-end pb-[6px] text-[20px] font-medium text-ink-3">{unit ?? v.unit}</span>
      <span className="mx-[22px] h-[64px] w-px" style={{ background: 'var(--pf-line-soft)' }} />
      <span className="text-[17px]" style={{ color: noteTone === 'aqua' ? '#8fb4ba' : undefined }}>
        {typeof note === 'function' ? note(v.value, v.predictive) : note}
      </span>
      {extra && <span className="ml-auto">{extra}</span>}
    </div>
  );
}

/** Label/value rows (Air Quality details, Power Infrastructure). */
export function KeyValues({ rows, dense }: { rows: { label: string; source?: Source; text?: string; decimals?: number; unit?: string }[]; dense?: boolean }) {
  return (
    <dl className={`flex flex-col px-[18px] ${dense ? 'gap-[9px] text-[15px]' : 'gap-[14px] text-[17px]'}`}>
      {rows.map((r) => (
        <KeyValueRow key={r.label} {...r} />
      ))}
    </dl>
  );
}

function KeyValueRow({ label, source, text, decimals = 0, unit }: { label: string; source?: Source; text?: string; decimals?: number; unit?: string }) {
  const v = useSource(source ?? { fixed: 0 });
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[#b4d3d8]">{label}</dt>
      <dd className="tabular-nums text-white">{text ?? `${fmt(v.value, decimals)}${unit ?? v.unit ? ` ${unit ?? v.unit}` : ''}`}</dd>
    </div>
  );
}

export { BarMeter, RingGauge };
