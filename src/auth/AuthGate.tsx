import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { startAuthPolling, useAuth } from '@/gateway/auth';
import { LoginPortal, PortalBackdrop } from '@/auth/LoginPortal';

/**
 * Nothing of the platform is rendered until the gateway confirms this browser holds a valid Galaxy
 * login; while the gateway prepares the address space a progress card is shown instead.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, unreachable, initialized } = useAuth();
  useEffect(() => startAuthPolling(), []);

  // Development only (stripped from production builds): `?preview` renders the simulated screens
  // without a Galaxy login, for layout work. Live widgets simply show "connecting".
  if (import.meta.env.DEV && devPreview()) return <Enter>{children}</Enter>;
  if (!initialized) return <PortalBackdrop>{null}</PortalBackdrop>;
  if (unreachable) return <Waiting title="Platform gateway unavailable" detail={unreachable} tone="alarm" />;
  if (!status?.authenticated) return <LoginPortal />;
  if (status.state === 'Connecting' || status.state === 'LoadingTree' || !status.tree.loaded) {
    return (
      <Waiting
        title="Preparing the platform"
        detail={
          status.state === 'Connecting'
            ? 'Connecting to the Galaxy…'
            : status.tree.nodesDiscovered > 0
              ? `Reading the Galaxy · ${status.tree.nodesDiscovered.toLocaleString()} points discovered`
              : 'Loading the Galaxy model…'
        }
      />
    );
  }
  return <Enter>{children}</Enter>;
}

/** The platform settles in from the portal: a short fade and scale (transform only, nothing left behind). */
function Enter({ children }: { children: ReactNode }) {
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function Waiting({ title, detail, tone }: { title: string; detail: string; tone?: 'alarm' }) {
  return (
    <PortalBackdrop>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="pf-panel pf-panel-solid absolute left-1/2 top-[380px] w-[620px] -translate-x-1/2 px-[48px] py-[40px] text-center"
      >
        <p className={`text-[30px] ${tone === 'alarm' ? 'text-alarm-soft' : 'text-white'}`}>{title}</p>
        <p className="mt-[14px] text-[17px] text-[#b09dc1]">{detail}</p>
        <div className="relative mx-auto mt-[28px] h-[3px] w-[360px] overflow-hidden rounded-full bg-white/10">
          <motion.span
            className="absolute inset-y-0 w-[120px] rounded-full"
            style={{ background: tone === 'alarm' ? '#d96b84' : 'linear-gradient(90deg, transparent, #9d78ff, transparent)' }}
            animate={{ x: [-120, 360] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        {tone === 'alarm' && <p className="mt-[18px] text-[14px] text-ink-4">Retrying automatically…</p>}
      </motion.div>
    </PortalBackdrop>
  );
}

/** Dev-only: `?preview` once per browser tab keeps the preview on while navigating. */
function devPreview(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('preview')) sessionStorage.setItem('pf-preview', '1');
    return sessionStorage.getItem('pf-preview') === '1';
  } catch {
    return false;
  }
}
