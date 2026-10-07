import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { FloorDef, OverlaySystem } from '@/model/site';
import { OVERLAY_SYSTEMS } from '@/model/site';
import { clsx } from '@/utils/clsx';

/** Vertical floor selector (UR … GF): aqua tiles, the current floor white. */
export function FloorRail({ floors, active, hovered, onHover, onSelect }: { floors: FloorDef[]; active?: string; hovered?: string | null; onHover?: (id: string | null) => void; onSelect: (id: string) => void }) {
  return (
    <div className="absolute left-[24px] top-[155px] z-10 flex flex-col gap-[24px]">
      {floors.map((f, i) => {
        const on = f.id === active;
        const hot = f.id === hovered;
        return (
          <motion.button
            key={f.id}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            onMouseEnter={() => onHover?.(f.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onSelect(f.id)}
            className={clsx('h-[64px] w-[64px] rounded-[8px] text-[24px] transition-all duration-200', on ? 'bg-white text-[#482a6a]' : 'text-[#a6a8ff] hover:text-white')}
            style={
              on
                ? { boxShadow: '0 0 20px rgba(255,255,255,0.35)' }
                : { background: hot ? 'rgba(181,140,227,0.65)' : 'rgba(181,140,227,0.42)', boxShadow: hot ? '0 0 16px rgba(181,140,227,0.6)' : 'inset 0 1px 0 rgba(255,255,255,0.12)' }
            }
            aria-current={on ? 'page' : undefined}
          >
            {f.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/** "Systems" radio card on the floor plan (white card, aqua header). */
export function SystemsPicker({ value, onChange }: { value: OverlaySystem; onChange: (s: OverlaySystem) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="absolute right-[15px] top-[19px] z-10 w-[172px] overflow-hidden rounded-[8px] bg-white font-[family-name:var(--font-plain)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
    >
      <div className="bg-[#482a6a] py-[10px] text-center text-[20px] font-medium text-white">Systems</div>
      <div className="flex flex-col gap-[18px] px-[16px] py-[18px]" role="radiogroup">
        {OVERLAY_SYSTEMS.map((s) => {
          const on = s.id === value;
          return (
            <button key={s.id} role="radio" aria-checked={on} onClick={() => onChange(s.id)} className="flex items-center gap-[12px] text-left text-[18px] text-[#07050a]">
              <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full" style={{ border: on ? '5px solid #b58ce3' : '1.5px solid #e4d6f5', background: '#ffffff' }} />
              {s.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/** White popover card with a aqua title bar (FCU / Elevator / equipment panels). */
export function InfoCard({ title, children, className, style, onClose }: { title: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties; onClose?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={clsx('absolute z-20 rounded-[8px] bg-white p-[6px] font-[family-name:var(--font-plain)] text-[#07050a] shadow-[0_14px_40px_rgba(0,0,0,0.45)]', className)}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-[8px] rounded-[8px] bg-[#e6e7ff] px-[10px] py-[7px] text-[17px] text-[#482a6a]">
        {title}
        {onClose && (
          <button onClick={onClose} className="ml-auto text-[18px] leading-none text-[#b58ce3] hover:text-[#482a6a]" aria-label="Close">
            ×
          </button>
        )}
      </div>
      <div className="px-[6px] pb-[4px] pt-[8px]">{children}</div>
    </motion.div>
  );
}

/** White status chip at the bottom of the plan ("Fire Alarm System ● Normal", damper legend). */
export function LegendChip({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-[22px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-[18px] rounded-[8px] border border-[#d5d6ff] bg-white px-[14px] py-[8px] font-[family-name:var(--font-plain)] text-[20px] text-[#482a6a] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
    >
      {children}
    </motion.div>
  );
}
