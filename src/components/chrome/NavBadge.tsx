import { useId } from 'react';
import { NAV_ICONS } from '@/components/icons/navIcons';
import type { GlyphId } from '@/model/navigation';

interface NavBadgeProps {
  glyph: GlyphId;
  label: string;
  active: boolean;
  alert?: boolean;
  onClick: () => void;
}

/** A pointy-top hexagon of radius `r` around the centre of the 64 × 64 badge. */
const hex = (r: number) => {
  const dx = r * 0.866;
  return `M32 ${32 - r} L${32 + dx} ${32 - r / 2} V${32 + r / 2} L32 ${32 + r} L${32 - dx} ${32 + r / 2} V${32 - r / 2} Z`;
};

/**
 * The top-navigation badge (design: the hexagon badge of "Icons" and its recording): a filled hexagon
 * inside a thin hexagon outline with a bright segment travelling round it, the system's moving glyph,
 * and a small dot under the point. The open system is brighter; under the pointer the badge grows,
 * speeds up and sends out hexagon ripples; an alert turns it red.
 */
export function NavBadge({ glyph, label, active, alert, onClick }: NavBadgeProps) {
  const gid = useId().replace(/:/g, '');
  const hot = alert ? '#e59aaa' : '#9d78ff';
  const line = alert ? '#eaaab9' : active ? '#9d78ff' : '#593781';
  return (
    <button type="button" onClick={onClick} className={`hud-badge i-${glyph} ${active ? 'is-active' : ''} relative flex w-[108px] flex-col items-center gap-[9px] bg-transparent p-0`} aria-current={active ? 'page' : undefined}>
      <svg viewBox="0 0 64 64" width={70} height={70} fill="none" overflow="visible">
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={alert ? '#e59aaa' : active ? '#9d78ff' : '#4b2874'} stopOpacity={active || alert ? 0.95 : 0.6} />
            <stop offset="1" stopColor={alert ? '#5a1010' : active ? '#401f65' : '#100a16'} stopOpacity={active || alert ? 0.75 : 0.55} />
          </linearGradient>
        </defs>
        <path className="ripple" d={hex(29)} stroke={hot} strokeWidth="0.8" strokeLinejoin="round" />
        <path className="ripple r2" d={hex(29)} stroke={hot} strokeWidth="0.8" strokeLinejoin="round" />
        <path d={hex(31.5)} stroke={line} strokeOpacity={active || alert ? 0.5 : 0.3} strokeWidth="1" strokeLinejoin="round" />
        <path className="orbit" d={hex(31.5)} pathLength={100} stroke={alert ? '#eaaab9' : '#e4ccff'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${hot})` }} />
        <g className="halo">
          <path d={hex(25.5)} fill={`url(#${gid}-fill)`} stroke={line} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
        <circle cx="32" cy="68.5" r="1.6" fill={line} opacity={active || alert ? 1 : 0.5} />
        <g className="glyph" transform="translate(17.6 17.6) scale(0.9)">
          {NAV_ICONS[glyph].map((p, i) => (
            <g key={i} className={`a p${i}`}>
              <path d={p.d} fill="#e4ccff" opacity={p.opacity} fillRule={p.evenodd ? 'evenodd' : undefined} clipRule={p.evenodd ? 'evenodd' : undefined} />
            </g>
          ))}
        </g>
      </svg>
      {alert && (
        <>
          <span className="absolute right-[20px] top-[2px] h-3 w-3 rounded-full bg-alarm shadow-[0_0_10px_#d96b84]" />
          <span className="absolute right-[20px] top-[2px] h-3 w-3 rounded-full bg-alarm" style={{ animation: 'pf-pulse-ring 1.4s ease-out infinite' }} />
        </>
      )}
      <span className={`label text-[15px] leading-none tracking-[0.2px] ${active ? 'text-accent' : 'text-white/80'}`} style={{ textShadow: active ? '0 0 8px rgba(157,120,255,.6)' : undefined }}>
        {label}
      </span>
    </button>
  );
}
