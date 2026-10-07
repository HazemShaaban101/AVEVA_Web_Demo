import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

const ScaleContext = createContext(1);

/** Current stage scale (screen pixels per design pixel) — needed to convert pointer positions. */
export function useStageScale() {
  return useContext(ScaleContext);
}

/**
 * The platform is laid out on the design's fixed 1920×1080 canvas and scaled to fit any screen,
 * letterboxed, so every screen matches the Figma frames exactly on a video wall, a kiosk or a laptop.
 * The background (teal gradient, perspective floor) extends to the edges of the real viewport so
 * letterboxing never shows bars.
 */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  const root = useRef<HTMLDivElement>(null);

  // Measure the real viewport box, not just window resize events: moving the window to another
  // monitor, DPI changes and browser zoom can change the space without a resize event.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      setScale(Math.min(w / STAGE_WIDTH, h / STAGE_HEIGHT));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  return (
    <div ref={root} className="fixed inset-0 overflow-hidden bg-night-950">
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 55% at 50% 0%, #0d0a13 0%, rgba(13,10,19,0) 70%), linear-gradient(180deg, #070509 0%, #050307 38%, #040206 70%, #030104 100%)' }} />
      {/* The floor: a wide grid receding to the horizon behind the cards. */}
      <div
        aria-hidden
        className="pointer-events-none absolute opacity-[0.07]"
        style={{
          inset: '38% -30% -45%',
          transform: 'perspective(700px) rotateX(62deg)',
          background: 'linear-gradient(rgba(179,118,250,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(179,118,250,.55) 1px, transparent 1px)',
          backgroundSize: '150px 110px',
          maskImage: 'linear-gradient(180deg, transparent 0%, #000000 35%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000000 35%)',
        }}
      />
      <ScaleContext.Provider value={scale}>
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {children}
        </div>
      </ScaleContext.Provider>
    </div>
  );
}
