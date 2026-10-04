import type { ReactNode } from 'react';

export interface Reading {
  label: string;
  value: ReactNode;
  /** Colour of the value (alarm / warning). */
  tone?: 'bad' | 'warn' | 'good';
}

const TONE = { bad: '#f87171', warn: '#ffb020', good: '#4ade6b' } as const;

/** A tidy grid of label → value readings inside a card. */
export function Readings({ items, cols = 2, size = 15 }: { items: Reading[]; cols?: number; size?: number }) {
  return (
    <div className="grid gap-x-[22px] gap-y-[7px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, fontSize: size }}>
      {items.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-[8px] border-b border-white/[0.06] pb-[5px]">
          <span className="truncate text-ink-3">{r.label}</span>
          <span className="shrink-0 tabular-nums" style={{ color: r.tone ? TONE[r.tone] : '#fff' }}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
