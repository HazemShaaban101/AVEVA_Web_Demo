import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScenario } from '@/sim/scenario';
import { Glyph } from '@/components/icons/Glyph';
import { useNow } from '@/sim/clock';

/**
 * Platform-wide fire alarm strip: wherever the operator is, an active alarm is visible and one click
 * away. Hidden on the Fire screens themselves, which already show it.
 */
export function AlertBanner() {
  const fire = useScenario((s) => s.fire);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const now = useNow(1000);
  const show = fire.active && !pathname.startsWith('/fire');
  const elapsed = fire.triggeredAt ? Math.max(0, Math.floor((now - fire.triggeredAt) / 1000)) : 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          onClick={() => navigate('/fire/system')}
          className="absolute left-1/2 top-[150px] z-40 flex -translate-x-1/2 items-center gap-[14px] rounded-full border border-alarm/70 px-[26px] py-[10px] text-[18px] text-white"
          style={{ background: 'linear-gradient(90deg, rgba(110,22,48,0.85), rgba(66,12,36,0.85))', boxShadow: '0 0 30px rgba(217,107,132,0.45)' }}
        >
          <span style={{ animation: 'pf-alarm-blink 0.9s infinite' }}>
            <Glyph id="flame" size={20} color="#e59aaa" />
          </span>
          Fire alarm in Zone {fire.zone} · {fire.detectors.length} detectors · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          <span className="text-accent">View ›</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
