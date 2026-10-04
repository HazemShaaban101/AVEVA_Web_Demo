import { NavLink } from 'react-router-dom';
import type { SystemDef } from '@/model/navigation';

const TAB_W = 250;

/**
 * The tab bar at the bottom of every system screen: a rounded glass plate, as wide as the number
 * of subsystems. The open tab is a lit pill.
 */
export function SubsystemTabs({ system }: { system: SystemDef }) {
  const width = system.subsystems.length * TAB_W + 16;
  return (
    <nav
      className="absolute bottom-0 flex items-center justify-center rounded-t-[18px] border border-b-0 px-[8px] pt-[8px]"
      style={{ left: (1920 - width) / 2, width, height: 68, borderColor: 'var(--pf-line)', background: 'linear-gradient(180deg, rgba(22,78,92,0.6), rgba(7,34,43,0.85))', boxShadow: '0 -10px 30px rgba(0,0,0,0.25)' }}
      aria-label={`${system.label} subsystems`}
    >
      {system.subsystems.map((sub) => (
        <NavLink key={sub.id} to={`/${system.id}/${sub.id}`} className="flex h-full items-start justify-center outline-none" style={{ width: TAB_W }}>
          {({ isActive }) => (
            <span
              className={`flex h-[44px] w-[calc(100%-8px)] items-center justify-center whitespace-nowrap rounded-[12px] border text-[20px] tracking-[0.2px] transition-colors duration-300 ${
                isActive ? 'border-accent/60 bg-accent/15 font-medium text-accent' : 'border-transparent text-ink-2 hover:bg-white/5 hover:text-white'
              }`}
              style={isActive ? { boxShadow: 'inset 0 0 18px rgba(79,220,255,0.12)' } : undefined}
            >
              {sub.label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
