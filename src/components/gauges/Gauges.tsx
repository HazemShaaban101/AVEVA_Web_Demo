import { useEffect, useId } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { AnimatedNumber } from '@/components/gauges/AnimatedNumber';
import { clamp } from '@/utils/format';
import { TONE_COLOR, type Tone } from '@/components/controls/Controls';

const CYAN = '#9d78ff';

/**
 * The colour of the number a gauge shows: white while healthy, amber / red for a warning / alarm. The
 * moving arc itself never changes colour — the alarm is read on the number.
 */
export const numberColor = (tone: Tone | undefined, normal = '#ffffff') => (tone === 'warn' || tone === 'bad' ? TONE_COLOR[tone] : normal);

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arcPath = (cx: number, cy: number, r: number, from: number, to: number) => {
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
};

/** The dark core shared by every round gauge (design: radial KPI): a lit teal disc inside two hairline rings. */
function Knob({ cx, cy, scale = 1, id }: { cx: number; cy: number; scale?: number; id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-core`} cx="45%" cy="36%" r="72%">
          <stop offset="0" stopColor="#0c0710" />
          <stop offset="1" stopColor="#030103" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={76 * scale} fill="#030103" fillOpacity={0.55} stroke="rgba(157,120,255,0.2)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={69 * scale} fill="none" stroke="rgba(157,120,255,0.2)" strokeWidth={1} strokeDasharray="2 4" />
      <circle cx={cx} cy={cy} r={61 * scale} fill={`url(#${id}-core)`} stroke="rgba(157,120,255,0.3)" strokeWidth={0.8} />
    </g>
  );
}

export interface DialGaugeProps {
  value: number | null;
  min?: number;
  max?: number;
  unit?: string;
  decimals?: number;
  size?: number;
  /** Override the big number (e.g. "115"), defaults to the formatted value. */
  display?: string;
  /** Colours the arc by status (green / amber / red). */
  tone?: Tone;
}

/**
 * The tick-ring dial used across the designs: 270° sweep, minor ticks every 2%, labelled majors
 * every 20%, a cyan arc sweeping up to the value around the metallic knob.
 */
export function DialGauge({ value, min = 0, max = 100, unit = '', decimals = 0, size = 250, display, tone }: DialGaugeProps) {
  const id = useId().replace(/:/g, '');
  const color = CYAN;
  const textColor = numberColor(tone);
  const cx = 130;
  const cy = 130;
  const START = -135;
  const SWEEP = 270;
  // Tick labels on a tidy scale: the range is widened to the next 'nice' step so labels read 0, 300, 600…
  const rawStep = (max - min) / 5;
  const pow = 10 ** Math.floor(Math.log10(Math.max(rawStep, 1e-9)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rawStep) ?? rawStep;
  const top = min + step * 5;
  const labels = Array.from({ length: 6 }, (_, i) => min + step * i);
  const fmtLabel = (v: number) => (Math.abs(v) >= 10_000 ? `${Math.round(v / 1000)}k` : String(Math.round(v * 10) / 10));
  const frac = value === null ? 0 : clamp((value - min) / (top - min), 0, 1);
  // One animated fraction drives both the arc and its tip, so the dot always rides the arc (animating
  // the dot's x and y separately would take it along the straight chord, through the dial).
  const sweep = useMotionValue(0);
  useEffect(() => {
    const run = animate(sweep, frac, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => run.stop();
  }, [sweep, frac]);
  const arcLength = useTransform(sweep, (f) => Math.max(0.001, f));
  const tipX = useTransform(sweep, (f) => polar(cx, cy, 79, START + SWEEP * f).x);
  const tipY = useTransform(sweep, (f) => polar(cx, cy, 79, START + SWEEP * f).y);

  return (
    // Shrinks (never grows) to fit a shorter card: max-height resolves against the card body.
    <svg viewBox="0 0 260 260" width={size} height={size} style={{ maxHeight: '100%', width: 'auto', height: 'auto' }} role="img" aria-label={`${value ?? '—'} ${unit}`}>
      <defs>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ticks */}
      {Array.from({ length: 51 }, (_, i) => {
        const deg = START + (SWEEP * i) / 50;
        const major = i % 5 === 0;
        const a = polar(cx, cy, 86, deg);
        const b = polar(cx, cy, major ? 96 : 91, deg);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={major ? '#9d78ff' : '#b58ce3'} strokeWidth={major ? 1.4 : 0.8} strokeLinecap="round" opacity={major ? 0.9 : 0.45} />;
      })}
      {labels.map((v, i) => {
        const deg = START + (SWEEP * i) / 5;
        const p = polar(cx, cy, 110, deg);
        return (
          <text key={i} x={p.x} y={p.y} fill="#b09dc1" fontSize={12} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${deg} ${p.x} ${p.y})`}>
            {fmtLabel(v)}
          </text>
        );
      })}

      <Knob cx={cx} cy={cy} id={id} />

      {/* track + value arc */}
      <path d={arcPath(cx, cy, 79, START, START + SWEEP)} fill="none" stroke={color} strokeOpacity={0.12} strokeWidth={5} />
      <motion.path
        d={arcPath(cx, cy, 79, START, START + SWEEP)}
        fill="none"
        stroke={color}
        strokeWidth={5}
        filter={`url(#${id}-glow)`}
        style={{ pathLength: arcLength }}
      />
      {/* needle tip */}
      <motion.circle r={4} cx={tipX} cy={tipY} fill={color} filter={`url(#${id}-glow)`} />

      <text x={cx} y={cy - 4} fill={textColor} fontSize={36} textAnchor="middle" dominantBaseline="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {display ?? (value === null ? '—' : <AnimatedNumber value={value} decimals={decimals} />)}
      </text>
      <text x={cx} y={cy + 26} fill="#b09dc1" fontSize={12} textAnchor="middle" letterSpacing="0.14em">
        {unit}
      </text>
    </svg>
  );
}

/** "Main Kpi" arc (Frame 488 / Electric): a thick cyan horseshoe with a darker remainder. */
export function ArcGauge({ value, label = 'Main Kpi', decimals = 1, size = 300, suffix = '%', tone }: { value: number | null; label?: string; decimals?: number; size?: number; suffix?: string; tone?: Tone }) {
  const id = useId().replace(/:/g, '');
  const color = CYAN;
  const textColor = numberColor(tone, '#ffffff');
  const cx = 150;
  const cy = 150;
  const frac = value === null ? 0 : clamp(value / 100, 0, 1);
  const START = -100;
  const SWEEP = 200;
  return (
    <svg viewBox="0 0 300 210" width={size} height={(size * 210) / 300} style={{ maxHeight: '100%', width: 'auto', height: 'auto' }} role="img" aria-label={`${label} ${value ?? '—'}${suffix}`}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b58ce3" />
          <stop offset="0.52" stopColor={color} />
          <stop offset="1" stopColor="#e4ccff" />
        </linearGradient>
      </defs>
      <path d={arcPath(cx, cy, 118, START, START + SWEEP)} fill="none" stroke="rgba(175,151,195,0.14)" strokeWidth={24} strokeLinecap="butt" />
      <motion.path
        d={arcPath(cx, cy, 118, START, START + SWEEP)}
        fill="none"
        stroke={`url(#${id}-g)`}
        strokeWidth={24}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: Math.max(0.001, frac) }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: `drop-shadow(0 0 8px ${color}8c)` }}
      />
      <text x={cx} y={cy + 8} fill={textColor} fontSize={50} fontWeight={500} textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value === null ? '—' : <AnimatedNumber value={value} decimals={decimals} />}
        {suffix}
      </text>
      <text x={cx} y={cy + 42} fill="#b09dc1" fontSize={13} textAnchor="middle" letterSpacing="0.16em" style={{ textTransform: 'uppercase' }}>
        {label}
      </text>
    </svg>
  );
}

/** Knob with a multi-colored ring (Energy Usage Per System). */
export function RingGauge({ segments, value, unit, size = 200 }: { segments: { value: number; color: string }[]; value: string; unit: string; size?: number }) {
  const id = useId().replace(/:/g, '');
  const cx = 110;
  const cy = 110;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const GAP = 2.5;
  return (
    <svg viewBox="0 0 220 220" width={size} height={size}>
      <g transform="translate(-20 -20)">
        <Knob cx={130} cy={130} id={id} scale={1.02} />
      </g>
      {segments.map((s, i) => {
        const from = (acc / total) * 360;
        acc += s.value;
        const to = (acc / total) * 360 - GAP;
        return (
          <motion.path
            key={i}
            d={arcPath(cx, cy, 86, from, Math.max(from + 0.5, to))}
            fill="none"
            stroke={s.color}
            strokeWidth={6}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.12 }}
            style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
          />
        );
      })}
      <text x={cx} y={cy - 2} fill="#ffffff" fontSize={34} textAnchor="middle" dominantBaseline="middle">
        {value}
      </text>
      <text x={cx} y={cy + 24} fill="#b09dc1" fontSize={12} textAnchor="middle" letterSpacing="0.14em">
        {unit}
      </text>
    </svg>
  );
}

/** Knob inside a thick glowing ring holding a count (Ongoing Alarm Count). */
export function CountRing({ value, alarm, size = 150 }: { value: number; alarm?: boolean; size?: number }) {
  const id = useId().replace(/:/g, '');
  const color = CYAN;
  return (
    <svg viewBox="0 0 160 160" width={size} height={size}>
      <g transform="translate(-50 -50)">
        <Knob cx={130} cy={130} id={id} scale={0.9} />
      </g>
      <circle cx={80} cy={80} r={70} fill="none" stroke={color} strokeWidth={7} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      <text x={80} y={82} fill={alarm ? TONE_COLOR.bad : '#ffffff'} fontSize={40} textAnchor="middle" dominantBaseline="middle">
        {value}
      </text>
    </svg>
  );
}

/** Horizontal AVG/Peak bars with a percent grid (Elevator Performance). */
export function BarMeter({ rows, width = 260 }: { rows: { label: string; value: number; color: string }[]; width?: number }) {
  return (
    <div className="relative" style={{ width: width + 62 }}>
      <div className="absolute bottom-[26px] left-[62px] top-0" style={{ width }}>
        {[20, 40, 60, 80, 100].map((p) => (
          <span key={p} className="absolute top-0 h-full border-l border-dashed border-accent/15" style={{ left: `${p}%` }} />
        ))}
        <span className="absolute left-0 top-0 h-full border-l border-accent/30" />
      </div>
      <div className="relative flex flex-col gap-[14px] pt-[34px]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center">
            <span className="w-[62px] text-[16px] text-white">{r.label}</span>
            <div className="relative h-[8px] bg-white/[0.08]" style={{ width }}>
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ background: `linear-gradient(90deg, ${r.color}55, ${r.color})`, boxShadow: `0 0 10px ${r.color}88` }}
                initial={{ width: 0 }}
                animate={{ width: `${clamp(r.value, 0, 100)}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="relative mt-[34px] flex text-[12px] text-ink-3" style={{ marginLeft: 62, width }}>
        {[20, 40, 60, 80, 100].map((p) => (
          <span key={p} className="absolute -translate-x-1/2" style={{ left: `${p}%` }}>
            {p}%
          </span>
        ))}
      </div>
    </div>
  );
}
