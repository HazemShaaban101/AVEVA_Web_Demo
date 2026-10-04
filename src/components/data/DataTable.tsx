import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from '@/utils/clsx';

export interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
}

/**
 * The platform's table: transparent rows on the glass card, hairline separators, a aqua header,
 * and new rows sliding in from the top (live logs). Rows are keyed so only new ones animate.
 */
export function DataTable<T>({ columns, rows, rowKey, highlight, onRowClick, dense }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; highlight?: (r: T) => 'alarm' | 'warn' | null; onRowClick?: (r: T) => void; dense?: boolean }) {
  const template = columns.map((c) => (typeof c.width === 'number' ? `${c.width}px` : (c.width ?? '1fr'))).join(' ');
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 gap-[12px] border-b border-accent/15 px-[16px] pb-[9px] text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3" style={{ gridTemplateColumns: template }}>
        {columns.map((c) => (
          <span key={c.key} style={{ textAlign: c.align ?? 'left' }}>
            {c.header}
          </span>
        ))}
      </div>
      <div className="pf-scroll min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const hl = highlight?.(r);
            return (
              <motion.div
                key={rowKey(r)}
                layout="position"
                initial={{ opacity: 0, y: -12, backgroundColor: 'rgba(79,220,255,0.18)' }}
                animate={{ opacity: 1, y: 0, backgroundColor: hl === 'alarm' ? 'rgba(239,68,68,0.10)' : hl === 'warn' ? 'rgba(255,176,32,0.07)' : 'rgba(0,0,0,0)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={clsx('grid items-center gap-[12px] border-b border-white/[0.06] px-[16px] text-[15px] text-ink-2', dense ? 'py-[7px]' : 'py-[10px]', onRowClick && 'cursor-pointer hover:bg-white/[0.04]')}
                style={{ gridTemplateColumns: template }}
              >
                {columns.map((c) => (
                  <span key={c.key} className="min-w-0 truncate" style={{ textAlign: c.align ?? 'left' }}>
                    {c.render(r)}
                  </span>
                ))}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export type TagTone = 'good' | 'bad' | 'warn' | 'info' | 'idle';

const TAG: Record<TagTone, { bg: string; fg: string; border: string }> = {
  good: { bg: 'rgba(74,222,107,0.12)', fg: '#4ade6b', border: 'rgba(74,222,107,0.35)' },
  bad: { bg: 'rgba(239,68,68,0.14)', fg: '#ff6b6b', border: 'rgba(239,68,68,0.5)' },
  warn: { bg: 'rgba(255,176,32,0.12)', fg: '#ffbe45', border: 'rgba(255,176,32,0.45)' },
  info: { bg: 'rgba(79,220,255,0.08)', fg: '#6fe3ff', border: 'rgba(79,220,255,0.45)' },
  idle: { bg: 'rgba(121,164,170,0.07)', fg: '#8fb4ba', border: 'rgba(121,164,170,0.25)' },
};

/** Small status tag for tables and lists (the Status.svg pills, shrunk). */
export function Tag({ tone, children, dot = true }: { tone: TagTone; children: ReactNode; dot?: boolean }) {
  const t = TAG[tone];
  return (
    <span className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border px-[9px] py-[1px] text-[10.5px] font-bold uppercase leading-[18px] tracking-[0.07em]" style={{ background: t.bg, color: t.fg, borderColor: t.border }}>
      {dot && <span className="h-[6px] w-[6px] rounded-full" style={{ background: t.fg, boxShadow: `0 0 6px ${t.fg}` }} />}
      {children}
    </span>
  );
}

/** Thin horizontal meter (health, occupancy, progress). */
export function Meter({ value, tone = 'info', width = 120, label = true }: { value: number; tone?: TagTone; width?: number; label?: boolean }) {
  const color = TAG[tone].fg;
  return (
    <span className="inline-flex items-center gap-[8px]">
      <span className="relative inline-block h-[4px] overflow-hidden rounded-full bg-white/[0.08]" style={{ width }}>
        <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 0.8 }} />
      </span>
      {label && <span className="w-[38px] text-right text-[13px] tabular-nums text-ink-2">{Math.round(value)}%</span>}
    </span>
  );
}

export const clockTime = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
