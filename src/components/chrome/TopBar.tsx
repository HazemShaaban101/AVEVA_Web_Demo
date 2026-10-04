import { useLocation, useNavigate } from 'react-router-dom';
import { NavBadge } from '@/components/chrome/NavBadge';
import { Wordmark } from '@/components/chrome/Wordmark';
import { BRAND } from '@/config/brand';
import { NotificationBell } from '@/components/chrome/NotificationBell';
import { ClockIcon, CloudSunIcon } from '@/components/icons/UiIcons';
import { SYSTEMS, systemPath } from '@/model/navigation';
import { useNow } from '@/sim/clock';
import { useSignal } from '@/sim/useSignal';
import { useScenario } from '@/sim/scenario';

/** Header shared by every screen: a lighter band with the wordmark, the nine system badges, alerts, clock and weather. */
export function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeSystem = pathname === '/' || pathname.startsWith('/site') ? 'site' : pathname.split('/')[1];
  const fireActive = useScenario((s) => s.fire.active);

  // Above the strip under it and the banners, so the notification panel opens over them.
  return (
    <header className="absolute inset-x-0 top-0 z-[45] h-[150px]">
      <span aria-hidden className="absolute inset-x-[-2000px] top-[-2000px] h-[2141px] border-b" style={{ background: 'linear-gradient(180deg, rgba(40,120,140,0.28), rgba(40,120,140,0.14))', borderColor: 'var(--pf-line)' }} />
      <div className="absolute left-[52px] top-[46px]">
        <Wordmark />
      </div>

      <nav className="absolute left-[474px] top-[26px] flex" aria-label="Systems">
        {SYSTEMS.map((s) => (
          <NavBadge
            key={s.id}
            glyph={s.glyph}
            label={s.label}
            active={activeSystem === s.id}
            alert={s.id === 'fire' && fireActive}
            onClick={() => navigate(systemPath(s))}
          />
        ))}
      </nav>

      <div className="absolute right-[52px] top-[44px] flex items-center">
        <NotificationBell />
        <Clock />
        <span className="mx-[20px] h-[52px] w-px" style={{ background: 'var(--pf-line)' }} aria-hidden />
        <Weather />
      </div>
    </header>
  );
}

function Clock() {
  const now = new Date(useNow(1000));
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const [wd, ...rest] = date.split(', ');
  return (
    <div className="ml-[36px] flex flex-col items-end">
      <div className="flex items-center gap-[12px] text-[19px] font-medium tabular-nums tracking-[0.5px] text-accent">
        <ClockIcon size={22} className="text-white" />
        <span className="min-w-[106px] text-right">{time}</span>
      </div>
      <span className="mt-[8px] text-[13px] tracking-[1.2px] text-ink-3">{`${wd.toUpperCase()}, ${rest.join(', ').toUpperCase()}`}</span>
    </div>
  );
}

function Weather() {
  const { value } = useSignal('weather.temp', 60_000, { global: true });
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-[10px] text-[17px] text-white">
        <CloudSunIcon size={26} />
        <span>{value}°C</span>
      </div>
      <span className="mt-[8px] text-[13px] tracking-[1.2px] text-ink-3">{BRAND.location.toUpperCase()}</span>
    </div>
  );
}
