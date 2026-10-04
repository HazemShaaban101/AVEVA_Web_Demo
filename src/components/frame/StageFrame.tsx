import { Fragment, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, HomeIcon } from '@/components/icons/UiIcons';

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * The cyan-framed viewport of the 3D View drill-down (Frame 490/HVAC): 28px corners, 2px #4fdcff,
 * a faint fill, and the breadcrumb in the top-left. Content is clipped to the frame.
 */
export function StageFrame({ crumbs, children, overlay }: { crumbs: Crumb[]; children: ReactNode; overlay?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-[52px] top-[206px] h-[775px] w-[1816px] overflow-hidden rounded-[8px]"
      style={{ background: 'linear-gradient(180deg, rgba(124,123,123,0) 0%, rgba(3,25,26,0.12) 78%)' }}
    >
      {children}
      <div className="pointer-events-none absolute inset-0 rounded-[8px] border border-accent/60" style={{ boxShadow: 'inset 0 0 30px rgba(79,220,255,0.08)' }} />
      <Breadcrumb crumbs={crumbs} />
      {overlay}
    </motion.div>
  );
}

/** Home › A02 › GF › FAHU-01 — aqua trail, current step in cyan (BCrumb/Breadcrumb.svg). */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="absolute left-[26px] top-[20px] z-10 flex items-center gap-[18px] font-[family-name:var(--font-plain)] text-[24px] font-semibold" aria-label="Breadcrumb">
      <Link to="/" className="text-aqua transition-colors hover:text-white" aria-label="Site">
        <HomeIcon size={30} />
      </Link>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <Fragment key={`${c.label}-${i}`}>
            <ChevronRight size={20} className="text-aqua-dim" />
            {last || !c.to ? (
              <motion.span
                key={c.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className={last ? 'text-accent' : 'text-aqua'}
                aria-current={last ? 'page' : undefined}
              >
                {c.label}
              </motion.span>
            ) : (
              <Link to={c.to} className="text-aqua transition-colors hover:text-white">
                {c.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
