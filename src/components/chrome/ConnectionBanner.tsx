import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/gateway/auth';

/** Thin strip while the gateway is re-establishing the OPC UA session (live values marked bad meanwhile). */
export function ConnectionBanner() {
  const status = useAuth((s) => s.status);
  const reconnecting = status?.state === 'Reconnecting';
  return (
    <AnimatePresence>
      {reconnecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-[80px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-[10px] rounded-full border border-warn/50 bg-night-900/85 px-[22px] py-[8px] text-[15px] text-accent-soft"
        >
          <span className="h-[8px] w-[8px] rounded-full bg-warn" style={{ animation: 'pf-alarm-blink 1s infinite' }} />
          Galaxy connection lost — reconnecting{status && status.reconnectAttempt > 0 ? ` (attempt ${status.reconnectAttempt})` : ''}. Live values are paused.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
