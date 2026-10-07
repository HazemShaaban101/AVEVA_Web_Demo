/** A small line chart of recent values, with optional horizontal reference lines. */
export function Sparkline({ data, width, height, min, max, color = '#b58ce3', refs = [] }: { data: number[]; width: number; height: number; min?: number; max?: number; color?: string; refs?: { value: number; color: string; label?: string }[] }) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const y = (v: number) => height - 2 - ((v - lo) / (hi - lo || 1)) * (height - 4);
  const x = (i: number) => (i / (data.length - 1)) * width;
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      {refs.map((r) => (
        <g key={r.value}>
          <line x1={0} x2={width} y1={y(r.value)} y2={y(r.value)} stroke={r.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
          {r.label && (
            <text x={width + 4} y={y(r.value) + 4} fill={r.color} fontSize={10}>
              {r.label}
            </text>
          )}
        </g>
      ))}
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}
