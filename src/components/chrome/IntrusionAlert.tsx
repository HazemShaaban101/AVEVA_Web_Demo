import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import aerial from '@/assets/renders/aerial.webp';
import { CameraTile, type CameraSpec } from '@/components/media/CameraTile';
import { useScenario } from '@/sim/scenario';
import { useNow } from '@/sim/clock';

const CAMERA: CameraSpec = { id: 'CAM-06', name: 'Loading Dock · B01', zone: 'Service', src: aerial, focus: [24, 63], zoom: 3.4, pan: [0.01, 0.01], status: 'online', motion: [[44, 38, 14, 40]] };

const BRACKETS = ['M30 22v-8h8', 'M90 22v-8h-8', 'M30 96v8h8', 'M90 96v8h-8'];

/** A person's head and shoulders, as the camera's face-capture frame shows them. */
function Face({ known }: { known: boolean }) {
  const color = known ? '#e8a98c' : '#d96b84';
  return (
    <svg viewBox="0 0 120 140" className="h-full w-full">
      <defs>
        <linearGradient id="face-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1226" />
          <stop offset="1" stopColor="#0b0710" />
        </linearGradient>
      </defs>
      <rect width="120" height="140" fill="url(#face-bg)" />
      <path d="M14 140c2-30 20-46 46-46s44 16 46 46z" fill="#2a1d38" />
      <ellipse cx="60" cy="58" rx="24" ry="30" fill="#4a3858" />
      <path d="M36 52c2-20 14-28 24-28s22 8 24 28c-6-10-14-14-24-14s-18 4-24 14z" fill="#150d1d" />
      <circle cx="51" cy="60" r="2.6" fill="#0b0710" />
      <circle cx="69" cy="60" r="2.6" fill="#0b0710" />
      <path d="M52 76c5 4 11 4 16 0" stroke="#0b0710" strokeWidth="2" fill="none" strokeLinecap="round" />
      {BRACKETS.map((d) => (
        <path key={d} d={d} stroke={color} strokeWidth="2.2" fill="none" />
      ))}
      <rect x="28" y="20" width="64" height="2" fill={color} opacity="0.7">
        <animate attributeName="y" values="20;98;20" dur="2.6s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

/**
 * Forced-door drill: wherever the operator is, the camera covering the door pops up with the
 * captured face and the badge/face-database match (the name and ID if known).
 */
export function IntrusionAlert() {
  const intrusion = useScenario((s) => s.intrusion);
  const clear = useScenario((s) => s.clearIntrusion);
  const navigate = useNavigate();
  const now = useNow(1000);
  const identity = intrusion.identity;
  const elapsed = intrusion.at ? Math.max(0, Math.floor((now - intrusion.at) / 1000)) : 0;

  return (
    <AnimatePresence>
      {intrusion.active && (
        <motion.section
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="pf-panel pf-panel-solid absolute right-[52px] top-[206px] z-50 w-[560px] border-alarm/70 p-[16px]"
          style={{ boxShadow: '0 0 40px rgba(217,107,132,0.4), 0 24px 60px rgba(0,0,0,0.6)' }}
          role="alert"
        >
          <header className="mb-[12px] flex items-center gap-[10px]">
            <span className="h-[11px] w-[11px] rounded-full bg-[#d96b84]" style={{ animation: 'pf-alarm-blink 0.9s infinite', boxShadow: '0 0 12px #d96b84' }} />
            <h2 className="text-[20px] font-medium text-alarm-soft">Door forced · {intrusion.door}</h2>
            <span className="ml-auto font-mono text-[14px] text-ink-3">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </header>
          <div className="flex gap-[14px]">
            <div className="h-[190px] w-[300px] shrink-0">
              <CameraTile cam={CAMERA} large />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex gap-[12px]">
                <div className="h-[104px] w-[88px] shrink-0 overflow-hidden rounded-[8px] border" style={{ borderColor: identity ? '#e8a98c' : '#d96b84' }}>
                  <Face known={identity !== null} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] tracking-[0.12em] text-ink-3">FACE CAPTURED</p>
                  {identity ? (
                    <>
                      <p className="mt-[4px] text-[19px] leading-tight text-white">{identity.name}</p>
                      <p className="font-mono text-[14px] text-warn">ID {identity.id}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-[4px] text-[19px] leading-tight text-alarm-soft">Unknown person</p>
                      <p className="text-[14px] text-ink-3">No match · ID unknown</p>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-[10px] text-[13px] leading-snug text-ink-2">{identity ? identity.role : 'Not in the badge or face database. Security officer dispatched.'}</p>
            </div>
          </div>
          <footer className="mt-[14px] flex justify-end gap-[10px]">
            <button onClick={() => navigate('/security/cctv')} className="pf-chip h-[38px] border border-accent/40 bg-accent/[0.06] px-[16px] text-[15px] text-accent hover:bg-accent/15">
              Open CCTV
            </button>
            <button onClick={clear} className="pf-chip h-[38px] border border-alarm/60 bg-alarm/15 px-[16px] text-[15px] text-alarm-soft hover:bg-alarm/25">
              Acknowledge
            </button>
          </footer>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
