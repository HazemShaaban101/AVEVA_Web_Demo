import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * Demo build: there is no sign-in and no gateway, so the platform opens straight away. It settles in
 * with a short fade and scale (transform only, nothing left behind).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
