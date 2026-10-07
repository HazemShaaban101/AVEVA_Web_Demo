import { useId } from 'react';
import { motion } from 'framer-motion';
import { useNow } from '@/sim/clock';
import { clsx } from '@/utils/clsx';

export interface CameraSpec {
  id: string;
  name: string;
  zone: string;
  src: string;
  /** Where the camera looks inside the source image (object-position, %) and how far it zooms. */
  focus: [number, number];
  zoom: number;
  /** Slow pan direction (fraction of the frame), for a living feed. */
  pan: [number, number];
  status: 'online' | 'offline';
  /** Simulated motion detections: [x%, y%, w%, h%] boxes that drift. */
  motion?: [number, number, number, number][];
}

/**
 * A simulated CCTV feed: a crop of the site renders under a night-vision grade, with film grain, a
 * slow pan, REC indicator, burnt-in timestamp and drifting motion-detection boxes. Offline cameras
 * show "NO SIGNAL". Swap `src` for a real stream URL later — the overlay stays the same.
 */
export function CameraTile({ cam, selected, onClick, large }: { cam: CameraSpec; selected?: boolean; onClick?: () => void; large?: boolean }) {
  const now = new Date(useNow(1000));
  const grain = useId().replace(/:/g, '');
  const offline = cam.status === 'offline';
  return (
    <button
      onClick={onClick}
      className={clsx('group relative h-full w-full overflow-hidden rounded-[8px] bg-black text-left outline-none', selected ? 'ring-2 ring-accent' : 'ring-1 ring-white/10 hover:ring-white/30')}
    >
      {!offline ? (
        <motion.img
          src={cam.src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${cam.focus[0]}% ${cam.focus[1]}%`, transformOrigin: `${cam.focus[0]}% ${cam.focus[1]}%`, filter: 'grayscale(0.35) contrast(1.15) brightness(1.05) saturate(0.8)' }}
          initial={{ scale: cam.zoom, x: 0, y: 0 }}
          animate={{ scale: cam.zoom, x: [0, cam.pan[0] * 100, 0], y: [0, cam.pan[1] * 100, 0] }}
          transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0b12]">
          <span className="text-[18px] tracking-[4px] text-ink-4">NO SIGNAL</span>
        </div>
      )}

      {/* grain + scanlines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16] mix-blend-overlay">
        <filter id={grain}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(Date.now() / 250) % 50} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grain})`} />
      </svg>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)' }} />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.75)' }} />

      {!offline &&
        cam.motion?.map(([x, y, w, h], i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute border-[1.5px] border-accent"
            style={{ width: `${w}%`, height: `${h}%`, boxShadow: '0 0 8px rgba(157,120,255,0.6)' }}
            initial={{ left: `${x}%`, top: `${y}%`, opacity: 0 }}
            animate={{ left: [`${x}%`, `${x + 6 + i * 3}%`, `${x}%`], top: [`${y}%`, `${y + 2}%`, `${y}%`], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 9 + i * 3, repeat: Infinity, delay: i * 2.2, ease: 'easeInOut' }}
          >
            <span className="absolute -top-[16px] left-0 bg-accent px-[4px] text-[9px] font-semibold text-night-950">MOTION</span>
          </motion.span>
        ))}

      <div className={clsx('absolute left-[10px] top-[8px] flex items-center gap-[8px] font-mono tracking-[0.5px] text-white', large ? 'text-[14px]' : 'text-[11px]')} style={{ textShadow: '0 1px 2px #000000' }}>
        {!offline && <span className="h-[8px] w-[8px] rounded-full bg-[#d96b84]" style={{ animation: 'pf-alarm-blink 1.2s infinite' }} />}
        {offline ? 'OFFLINE' : 'REC'} · {cam.id}
      </div>
      <div className={clsx('absolute right-[10px] top-[8px] font-mono text-white/90', large ? 'text-[14px]' : 'text-[11px]')} style={{ textShadow: '0 1px 2px #000000' }}>
        {now.toLocaleDateString('en-GB')} {now.toLocaleTimeString('en-GB')}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent px-[10px] pb-[8px] pt-[24px]">
        <span className={clsx('text-white', large ? 'text-[18px]' : 'text-[13px]')}>{cam.name}</span>
        <span className={clsx('text-ink-3', large ? 'text-[14px]' : 'text-[11px]')}>{cam.zone}</span>
      </div>
    </button>
  );
}
