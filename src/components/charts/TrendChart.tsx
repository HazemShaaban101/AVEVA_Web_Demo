import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSize } from '@/utils/useSize';
import { useStageScale } from '@/stage/Stage';
import { fmt } from '@/utils/format';

export interface TrendPoint {
  label: string;
  actual: number | null;
  predictive?: number | null;
}

interface TrendChartProps {
  data: TrendPoint[];
  yTitle: string;
  xTitle?: string;
  unit?: string;
  decimals?: number;
  /** Legend names; the design's defaults. */
  names?: { actual: string; predictive: string };
  showPredictive?: boolean;
  /** Fixed y range; otherwise a rounded range around the data. */
  yMax?: number;
  yMin?: number;
}

const ACTUAL = '#9d78ff';
const PRED = '#b58ce3';
const PRED_LINE = '#7fcf9d';

/** A top that splits into 4 round steps (1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ), so every tick label is exact. */
function niceTop(v: number) {
  if (v <= 0) return 4;
  const raw = v / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * pow).find((st) => st >= raw) ?? 10 * pow;
  return step * 4;
}

/** A smooth curve through the points that never overshoots them (monotone cubic). */
function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const m = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / (dx[i] || 1));
  const t = pts.map((_, i) => (i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : (2 * m[i - 1] * m[i]) / (m[i - 1] + m[i])));
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/**
 * The designs' comparison chart: Actual (cyan, glowing) over Predictive (pale), smooth curves over
 * soft gradient-filled areas, 5 y-ticks, hourly x-labels. Draws in on load, morphs between
 * periods, and shows both values under the pointer.
 */
export function TrendChart({ data, yTitle, xTitle = 'Time (hrs)', unit = '', decimals = 1, names = { actual: 'Actual Value', predictive: 'Predictive Value' }, showPredictive = true, yMax, yMin = 0 }: TrendChartProps) {
  const id = useId().replace(/:/g, '');
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const scale = useStageScale();
  const [hover, setHover] = useState<number | null>(null);

  const PAD_L = 34;
  const PAD_R = 90;
  const PAD_T = 44;
  const PAD_B = 34;
  const plotW = Math.max(10, width - PAD_L - PAD_R);
  const plotH = Math.max(10, height - PAD_T - PAD_B);

  const values = data.flatMap((d) => [d.actual, showPredictive ? d.predictive : null]).filter((v): v is number => v !== null && v !== undefined);
  const top = yMax ?? niceTop(Math.max(...values, 0) * 1.08);
  const bottom = yMin;
  const x = (i: number) => PAD_L + (data.length <= 1 ? 0 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD_T + plotH - ((v - bottom) / (top - bottom || 1)) * plotH;

  const points = (key: 'actual' | 'predictive') => data.map((d, i) => ({ i, v: d[key] })).filter((p): p is { i: number; v: number } => p.v !== null && p.v !== undefined).map((p) => [x(p.i), y(p.v)] as [number, number]);
  const line = (key: 'actual' | 'predictive') => smoothPath(points(key));
  const area = (key: 'actual' | 'predictive') => {
    const pts = points(key);
    if (pts.length < 2) return '';
    return `${smoothPath(pts)} L${pts[pts.length - 1][0].toFixed(1)},${PAD_T + plotH} L${pts[0][0].toFixed(1)},${PAD_T + plotH} Z`;
  };

  const ticks = useMemo(() => Array.from({ length: 5 }, (_, i) => bottom + ((top - bottom) * i) / 4), [top, bottom]);
  const tickStep = (top - bottom) / 4;
  const tickDecimals = Number.isInteger(Math.round(tickStep * 1e6) / 1e6) ? 0 : Number.isInteger(Math.round(tickStep * 10 * 1e6) / 1e6) ? 1 : 2;
  const every = Math.ceil(data.length / 24);
  const ready = width > 0 && data.length > 1;

  return (
    <div ref={ref} className="relative h-full w-full">
      <span className="absolute left-0 top-[12px] text-[12px] font-bold uppercase tracking-[0.12em] text-ink-3">{yTitle}</span>
      <div className="absolute right-[4px] top-[10px] flex items-center gap-[22px] text-[13px] text-white">
        {showPredictive && (
          <span className="flex items-center gap-[8px]">
            <span className="h-[8px] w-[8px] rounded-full bg-[#7fcf9d]" />
            {names.predictive}
          </span>
        )}
        <span className="flex items-center gap-[8px]">
          <span className="h-[8px] w-[8px] rounded-full bg-accent" style={{ boxShadow: '0 0 8px #9d78ff' }} />
          {names.actual}
        </span>
      </div>

      {ready && (
        <svg
          width={width}
          height={height}
          className="absolute inset-0 overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = (e.clientX - rect.left) / scale;
            const i = Math.round(((px - PAD_L) / plotW) * (data.length - 1));
            setHover(i >= 0 && i < data.length ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`${id}-p`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={PRED} stopOpacity={0.12} />
              <stop offset="1" stopColor={PRED} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={ACTUAL} stopOpacity={0.16} />
              <stop offset="1" stopColor={ACTUAL} stopOpacity={0} />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={PAD_L + plotW + 44} y1={y(t)} y2={y(t)} stroke="rgba(171,140,206,0.11)" />
              <text x={PAD_L - 12} y={y(t)} fill="#ffffff" fontSize={12} textAnchor="end" dominantBaseline="middle">
                {fmt(t, Number.isInteger(Math.round(t * 1e6) / 1e6) ? 0 : tickDecimals)}
              </text>
            </g>
          ))}
          <line x1={PAD_L} x2={PAD_L} y1={PAD_T - 8} y2={PAD_T + plotH} stroke="rgba(157,120,255,0.16)" />
          <line x1={PAD_L} x2={PAD_L + plotW + 44} y1={PAD_T + plotH + 8} y2={PAD_T + plotH + 8} stroke="rgba(157,120,255,0.16)" />

          {showPredictive && <motion.path d={area('predictive')} fill={`url(#${id}-p)`} initial={{ opacity: 0 }} animate={{ opacity: 1, d: area('predictive') }} transition={{ duration: 0.8 }} />}
          <motion.path d={area('actual')} fill={`url(#${id}-a)`} initial={{ opacity: 0 }} animate={{ opacity: 1, d: area('actual') }} transition={{ duration: 0.8 }} />

          {showPredictive && (
            <motion.path
              d={line('predictive')}
              fill="none"
              stroke={PRED_LINE}
              strokeWidth={1.6}
              strokeOpacity={0.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, d: line('predictive') }}
              transition={{ pathLength: { duration: 1.4, ease: 'easeInOut' }, d: { duration: 0.6 } }}
            />
          )}
          <motion.path
            d={line('actual')}
            fill="none"
            stroke={ACTUAL}
            strokeWidth={2.2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, d: line('actual') }}
            transition={{ pathLength: { duration: 1.4, ease: 'easeInOut', delay: 0.15 }, d: { duration: 0.6 } }}
            style={{ filter: 'drop-shadow(0 0 5px rgba(157,120,255,0.7))' }}
          />

          {data.map((d, i) => (
            <g key={i}>
              {showPredictive && d.predictive !== null && d.predictive !== undefined && (
                <motion.circle r={0} cx={x(i)} cy={y(d.predictive)} initial={{ r: 0 }} animate={{ r: hover === i ? 4.5 : 0, cx: x(i), cy: y(d.predictive) }} fill="#7fcf9d" stroke="#09050c" strokeWidth={1.5} />
              )}
              {d.actual !== null && (
                <motion.circle r={0} cx={x(i)} cy={y(d.actual)} initial={{ r: 0 }} animate={{ r: hover === i ? 5 : 0, cx: x(i), cy: y(d.actual) }} fill="#e4ccff" stroke={ACTUAL} strokeWidth={2} />
              )}
            </g>
          ))}

          {data.map((d, i) =>
            i % every === 0 ? (
              <text key={d.label + i} x={x(i)} y={PAD_T + plotH + 28} fill="#ffffff" fontSize={12} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
          <text x={width} y={PAD_T + plotH + 29} fill="#b09dc1" fontSize={12} fontWeight={700} letterSpacing="0.1em" textAnchor="end" style={{ textTransform: 'uppercase' }}>
            {xTitle}
          </text>

          {hover !== null && data[hover] && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={PAD_T + plotH} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 4" />
              <g transform={`translate(${Math.min(x(hover) + 12, width - 200)}, ${PAD_T + 6})`}>
                <rect width={188} height={showPredictive ? 74 : 52} rx={2} fill="rgba(4,2,5,0.94)" stroke="rgba(157,120,255,0.4)" />
                <text x={12} y={20} fill="#ffffff" fontSize={13}>
                  {data[hover].label}
                </text>
                <text x={12} y={42} fill={ACTUAL} fontSize={14}>
                  Actual: {fmt(data[hover].actual, decimals)} {unit}
                </text>
                {showPredictive && (
                  <text x={12} y={62} fill={PRED_LINE} fontSize={14}>
                    Predictive: {fmt(data[hover].predictive, decimals)} {unit}
                  </text>
                )}
              </g>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
