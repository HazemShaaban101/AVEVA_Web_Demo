import { create } from 'zustand';
import type { AuthStatus } from '@/gateway/client';

/** Demo build: always "signed in" as the demo user; there is nothing to sign in to. */
const DEMO_STATUS: AuthStatus = {
  authenticated: true,
  state: 'Ready',
  user: 'Demo',
  lastError: null,
  logoutReason: null,
  reconnectAttempt: 0,
  tree: { loaded: true, phase: 'ready', nodesDiscovered: 0, nodeCount: null },
  writesEnabled: true,
};

interface AuthStore {
  status: AuthStatus | null;
  unreachable: string | null;
  initialized: boolean;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthStore>(() => ({
  status: DEMO_STATUS,
  unreachable: null,
  initialized: true,
  refresh: async () => {},
  login: async () => {},
  logout: async () => {},
}));

export function startAuthPolling(): () => void {
  return () => {};
}
