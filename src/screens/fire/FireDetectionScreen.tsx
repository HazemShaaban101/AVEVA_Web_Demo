import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import siteMap from '@/assets/renders/site-map.webp';
import { Panel } from '@/components/frame/Panel';
import { CardIcon } from '@/components/icons/UiIcons';
import { PillStacked } from '@/widgets/Widgets';
import { row } from '@/screens/layout';
import { useScenario } from '@/sim/scenario';
import { FIRE_ZONES, ZONE1_ALARM_BLOCKS } from '@/model/site';

const MAP = { x: 131, y: 534, w: 1657, h: 365 };

/** Fire › Fire Detection: zone overviews and the site map, where alarmed blocks glow red. */
export default function FireDetectionScreen() {
  const fire = useScenario((s) => s.fire);
  const frames = row(208, 262, 3);
  const [hoverZone, setHoverZone] = useState<number | null>(null);

  return (
    <>
      {FIRE_ZONES.map((z, i) => {
        const alarm = fire.active && fire.zone === z.id;
        return (
          <Panel key={z.id} frame={frames[i]} index={i} icon={<CardIcon />} title={`${z.label} Overview`} subtitle="Current Smoke Detection Status">
            <div onMouseEnter={() => setHoverZone(z.id)} onMouseLeave={() => setHoverZone(null)} className="h-full">
              <PillStacked
                capsule={alarm ? `Warning In ${z.label}` : 'Normal'}
                capsuleTone={alarm ? 'alarm' : undefined}
                verdict={alarm ? { text: 'Areas Displayed Below', tone: 'warn' } : { text: 'No Alarmed Areas', tone: 'warn' }}
              />
            </div>
          </Panel>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="absolute overflow-hidden"
        style={{ left: MAP.x, top: MAP.y, width: MAP.w, height: MAP.h, borderRadius: 16 }}
      >
        <img src={siteMap} alt="Site map" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 60px rgba(1,7,7,0.85)' }} />
        <svg className="absolute inset-0" width={MAP.w} height={MAP.h} viewBox={`${MAP.x} ${MAP.y} ${MAP.w} ${MAP.h}`}>
          {FIRE_ZONES.map((z) => (
            <g key={z.id} onMouseEnter={() => setHoverZone(z.id)} onMouseLeave={() => setHoverZone(null)}>
              <rect x={z.x0} y={MAP.y} width={z.x1 - z.x0} height={MAP.h} fill={hoverZone === z.id ? 'rgba(79,220,255,0.08)' : 'transparent'} className="transition-[fill] duration-300" />
              {z.id !== 3 && <line x1={z.x0} x2={z.x0} y1={MAP.y + 20} y2={MAP.y + MAP.h - 20} stroke="rgba(79,220,255,0.35)" strokeDasharray="6 8" />}
              <text x={(z.x0 + z.x1) / 2} y={MAP.y + 34} fill={fire.active && fire.zone === z.id ? '#ff6b6b' : 'rgba(255,255,255,0.7)'} fontSize={16} textAnchor="middle" letterSpacing={2}>
                {z.label.toUpperCase()}
              </text>
            </g>
          ))}
          <AnimatePresence>
            {fire.active &&
              ZONE1_ALARM_BLOCKS.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: [0.55, 1, 0.55], scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ opacity: { duration: 1.2, repeat: Infinity }, scale: { duration: 0.3 } }}
                  fill="#ef4444"
                  fillOpacity={0.4}
                  stroke="#ef4444"
                  strokeWidth={2}
                  style={{ transformOrigin: 'center', transformBox: 'fill-box', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.9))' }}
                />
              ))}
          </AnimatePresence>
        </svg>
        <div className="pointer-events-none absolute inset-0 border border-accent/60" style={{ borderRadius: 16 }} />
      </motion.div>
    </>
  );
}
