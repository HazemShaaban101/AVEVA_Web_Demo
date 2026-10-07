import { useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import site from '@/assets/renders/site.webp';
import { Wordmark } from '@/components/chrome/Wordmark';
import { BRAND } from '@/config/brand';
import { useAuth } from '@/gateway/auth';
import { GatewayError } from '@/gateway/client';
import { useNow } from '@/sim/clock';

const LOGOUT_REASONS: Record<string, string> = {
  idle: 'You were signed out after a period of inactivity.',
  credentials_rejected: 'The Galaxy no longer accepts your credentials. Please sign in again.',
  shutdown: 'The platform gateway was restarted. Please sign in again.',
};

/**
 * Entry to the demo. The credentials are checked locally (gateway/auth.ts): there is no gateway and
 * no Galaxy in the demo build.
 */
export function LoginPortal() {
  const login = useAuth((s) => s.login);
  const status = useAuth((s) => s.status);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notice = status?.logoutReason ? LOGOUT_REASONS[status.logoutReason] : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) {
      setError('Enter your user name and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setPassword('');
      setError(
        err instanceof GatewayError
          ? err.code === 'invalid_credentials'
            ? 'The user name or password is incorrect.'
            : err.message
          : 'Sign-in failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalBackdrop>
      <motion.form
        onSubmit={submit}
        noValidate
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="pf-panel pf-panel-solid absolute left-1/2 top-[300px] w-[560px] -translate-x-1/2 px-[56px] pb-[48px] pt-[44px]"
      >
        <p className="pf-eyebrow mb-[10px]">Secure access</p>
        <h1 className="text-[34px] font-medium leading-none text-white">Welcome</h1>
        <p className="mt-[12px] text-[17px] text-[#b09dc1]">Sign in to enter the platform demo.</p>

        {notice && !error && (
          <p className="mt-[22px] rounded-[8px] border border-aqua/30 bg-aqua/10 px-[16px] py-[10px] text-[15px] text-aqua-soft">{notice}</p>
        )}

        <Field label="User name" value={username} onChange={setUsername} autoComplete="username" autoFocus disabled={busy} />
        <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete="current-password" disabled={busy} />

        {error && (
          <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} role="alert" className="mt-[20px] rounded-[8px] border border-alarm/50 bg-alarm/10 px-[16px] py-[10px] text-[15px] text-alarm-soft">
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="pf-chip mt-[30px] flex h-[60px] w-full items-center justify-center gap-[12px] text-[20px] font-bold uppercase tracking-[0.12em] text-night-950 transition-all disabled:cursor-wait"
          style={{ background: 'linear-gradient(180deg, #9d78ff, #9d78ff 55%, #512483)', boxShadow: busy ? 'none' : '0 0 26px rgba(157,120,255,0.45), inset 0 1px 0 rgba(255,255,255,0.5)' }}
        >
          {busy && <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-night-950/30 border-t-night-950" />}
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </motion.form>
    </PortalBackdrop>
  );
}

function Field({ label, value, onChange, type = 'text', ...rest }: { label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; autoFocus?: boolean; disabled?: boolean }) {
  return (
    <label className="mt-[26px] block">
      <span className="mb-[10px] block text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[58px] w-full rounded-[8px] border border-accent/25 bg-night-950/60 px-[20px] text-[20px] text-white outline-none transition-[border,box-shadow] focus:border-accent/80 focus:shadow-[0_0_0_3px_rgba(157,120,255,0.15)] disabled:opacity-60"
        style={{ userSelect: 'text' }}
        {...rest}
      />
    </label>
  );
}

/** The site at night behind every pre-login screen, slowly drifting, with wordmark and clock. */
export function PortalBackdrop({ children }: { children: ReactNode }) {
  const now = new Date(useNow(1000));
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.img
        src={site}
        alt=""
        className="absolute inset-0 h-full w-full opacity-70"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: [1.08, 1.02, 1.08], opacity: 0.7 }}
        transition={{ scale: { duration: 40, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.2 } }}
      />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 45% at 50% 52%, rgba(2,1,2,0.55), rgba(2,1,2,0.15) 70%, transparent)' }} />
      <div className="absolute left-[72px] top-[56px]">
        <Wordmark />
      </div>
      <div className="absolute right-[72px] top-[56px] text-right">
        <p className="text-[17px] tabular-nums text-white">{now.toLocaleTimeString('en-US')}</p>
        <p className="mt-[8px] text-[16px] text-ink-3">
          {BRAND.location}
        </p>
      </div>
      <p className="absolute bottom-[40px] left-1/2 -translate-x-1/2 text-[14px] tracking-[2px] text-ink-4">CCTV · ACCESS CONTROL · PARKING · NAVIGATION · BMS · PLC</p>
      {children}
    </div>
  );
}
