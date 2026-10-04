import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SYSTEMS, systemById, systemPath } from '@/model/navigation';

/**
 * The strip under the header (design: page title with back button and breadcrumb): where the
 * operator is, as Home / System / Subsystem, with a way back. The drill-down views draw their own
 * breadcrumb inside their frame, so the strip stays out of their way.
 */
export function PageTitle() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/site/')) return null;
  const [sysId, subId] = pathname.split('/').filter(Boolean);
  const sys = systemById(sysId) ?? SYSTEMS[0];
  const sub = sys.subsystems.find((x) => x.id === subId);
  const home = pathname === '/';
  const trail = home ? [] : [{ label: 'Home', to: '/' }, ...(sub ? [{ label: sys.label, to: systemPath(sys) }] : [])];

  return (
    <div className="absolute left-[52px] top-[156px] z-30 flex h-[38px] items-center gap-[14px]">
      {!home && (
        <Link
          to="/"
          className="pf-chip flex h-[34px] w-[34px] items-center justify-center border border-accent/40 bg-accent/[0.06] text-accent transition-colors hover:bg-accent/20"
          title="Back to the 3D View"
          aria-label="Back to the 3D View"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 3 4.5 8l5 5M4.5 8h8" />
          </svg>
        </Link>
      )}
      <nav className="flex items-baseline gap-[10px]" aria-label="Breadcrumb">
        {trail.map((c) => (
          <Fragment key={c.to}>
            <Link to={c.to} className="text-[15px] text-aqua transition-colors hover:text-white">
              {c.label}
            </Link>
            <span className="text-[15px] text-ink-4">/</span>
          </Fragment>
        ))}
        <span className="text-[24px] font-medium leading-none text-white" aria-current="page" style={{ textShadow: '0 0 18px rgba(79,220,255,0.25)' }}>
          {sub?.label ?? sys.label}
        </span>
      </nav>
    </div>
  );
}
