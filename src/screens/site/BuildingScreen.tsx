import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import buildingA02 from '@/assets/renders/building-a02.webp';
import { StageFrame } from '@/components/frame/StageFrame';
import { FloorRail } from '@/components/site/SiteControls';
import { A02_FLOOR_BANDS, buildingById } from '@/model/site';

/** 3D View › A02: the building at night; floors light up cyan from the rail or the facade. */
export default function BuildingScreen() {
  const { building } = useParams();
  const b = buildingById(building);
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  if (!b || !b.detailed) return <Navigate to="/" replace />;

  const go = (floor: string) => {
    setLeaving(floor);
    navigate(`/site/${b.id}/${floor}`);
  };

  return (
    <StageFrame crumbs={[{ label: b.label }]}>
      <motion.img
        src={buildingA02}
        alt={`Building ${b.label}`}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ scale: 1.12, opacity: 0 }}
        animate={leaving ? { scale: 1.25, opacity: 0.2 } : { scale: 1, opacity: 1 }}
        transition={{ duration: leaving ? 0.45 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: '75% 70%' }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(2,18,18,0.55) 0%, rgba(2,18,18,0) 22%)' }} />
      <svg className="absolute inset-0" width={1816} height={775} viewBox="52 206 1816 775">
        {b.floors.map((f) => {
          const band = A02_FLOOR_BANDS[f.id];
          if (!band) return null;
          const lit = hover === f.id || leaving === f.id;
          return (
            <path
              key={f.id}
              d={band}
              fill="#4fdcff"
              fillOpacity={lit ? 0.32 : 0.001}
              stroke="#4fdcff"
              strokeOpacity={lit ? 1 : 0}
              strokeWidth={2}
              strokeLinejoin="round"
              className="cursor-pointer transition-[fill-opacity,stroke-opacity] duration-200"
              onMouseEnter={() => setHover(f.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => go(f.id)}
            />
          );
        })}
      </svg>
      <AnimatePresence>
        {hover && (
          <motion.div
            key={hover}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-[120px] top-[80px] rounded-[8px] border border-accent/60 bg-night-900/80 px-[16px] py-[10px] backdrop-blur"
          >
            <p className="text-[20px] text-accent">{b.floors.find((f) => f.id === hover)?.label}</p>
            <p className="text-[14px] text-ink-2">Click to open the floor plan</p>
          </motion.div>
        )}
      </AnimatePresence>
      <FloorRail floors={b.floors} hovered={hover} onHover={setHover} onSelect={go} />
    </StageFrame>
  );
}
