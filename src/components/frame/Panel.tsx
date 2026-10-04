import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from '@/utils/clsx';

export interface PanelProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Next to the title (e.g. a Mode button). */
  action?: ReactNode;
  /** "inline": right after the title block (design's Mode button); "end": far right. */
  actionPlacement?: 'inline' | 'end';
  /** Absolute placement on the 1920×1080 stage, in design pixels. */
  frame?: { x: number; y: number; w: number; h: number };
  className?: string;
  style?: CSSProperties;
  /** Entrance order (staggered fade-up). */
  index?: number;
  children?: ReactNode;
  bodyClassName?: string;
  /** Makes the whole card a link-like target (e.g. KPI → its vertical). */
  onClick?: () => void;
  /** Tooltip for clickable cards. */
  hint?: string;
}

/**
 * The card every dashboard widget sits in (design: full-page mockup): a rounded glass panel with a
 * soft cyan line; in the header a boxed icon, the title and a muted detail line.
 */
export function Panel({ title, subtitle, icon, action, actionPlacement = 'end', frame, className, style, index = 0, children, bodyClassName, onClick, hint }: PanelProps) {
  // Narrow cards (the 3D View overlay) use the design's smaller title size so titles never truncate.
  const narrow = (frame?.w ?? 1000) < 420;
  const placement: CSSProperties = frame ? { position: 'absolute', left: frame.x, top: frame.y, width: frame.w, height: frame.h } : {};
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('pf-panel flex flex-col', onClick && 'pf-panel-link', className)}
      onClick={onClick}
      title={hint}
      role={onClick ? 'link' : undefined}
      style={{ ...placement, ...style }}
    >
      <header className={clsx('relative flex items-start gap-[12px] px-[18px] pt-[14px]', subtitle ? 'min-h-[70px]' : 'min-h-[46px]')}>
        {icon && (
          <span
            className={clsx('flex shrink-0 items-center justify-center rounded-[9px] border border-accent/45 text-accent-soft', narrow ? 'h-[30px] w-[30px]' : 'h-[34px] w-[34px]')}
            style={{ background: 'rgba(79,220,255,0.1)' }}
          >
            <span className="flex h-[20px] w-[20px] items-center justify-center [&>*]:max-h-full [&>*]:max-w-full" style={{ filter: 'drop-shadow(0 0 3px rgba(79,220,255,0.45))' }}>
              {icon}
            </span>
          </span>
        )}
        <div className="min-w-0">
          <h2 className={clsx('font-medium leading-[1.2] text-white', narrow ? 'whitespace-nowrap text-[19px]' : 'truncate text-[23px]')}>{title}</h2>
          {subtitle && <p className={clsx('mt-[3px] leading-tight text-[#79a4aa]', narrow ? 'text-[13px]' : 'text-[15px]')}>{subtitle}</p>}
        </div>
        {action && <div className={actionPlacement === 'inline' ? 'ml-[58px] pt-[2px]' : 'ml-auto pl-[16px] pt-[2px]'}>{action}</div>}
      </header>
      <div className={clsx('relative min-h-0 flex-1', bodyClassName)}>{children}</div>
    </motion.section>
  );
}
