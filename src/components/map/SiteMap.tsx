import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import aerial from '@/assets/renders/aerial.webp';

/** Map image coordinates (the aerial is 2400×1191). Overlays use these units, before OVERLAY scales them onto the campus. */
export const MAP_W = 2400;
export const MAP_H = 1191;

const OVERLAY = { s: 0.75, tx: 334, ty: 251 };

/**
 * The top-view site map in the platform's cyan-rimmed pill frame (as on Fire Detection), with an SVG
 * overlay in map coordinates for markers, heat, routes and zones.
 */
export function SiteMap({ frame, children, radius = 16, dim = 0.15 }: { frame: { x: number; y: number; w: number; h: number }; children?: ReactNode; radius?: number; dim?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="absolute overflow-hidden"
      style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, borderRadius: radius }}
    >
      <img src={aerial} alt="Site aerial view" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: `rgba(1,7,7,${dim})`, boxShadow: 'inset 0 0 60px rgba(2,1,2,0.85)' }} />
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice">
        {/* Overlay positions are in the old map's units: scaled and moved onto the campus of the aerial. */}
        <g transform={`translate(${OVERLAY.tx} ${OVERLAY.ty}) scale(${OVERLAY.s})`}>{children}</g>
      </svg>
      <div className="pointer-events-none absolute inset-0 border border-accent/60" style={{ borderRadius: radius }} />
    </motion.div>
  );
}
