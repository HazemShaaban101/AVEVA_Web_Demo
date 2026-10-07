import { create } from 'zustand';
import { GatewayError, type AuthStatus } from '@/gateway/client';

/**
 * Demo build: there is no gateway and no Galaxy. The sign-in is a fixed local account so the demo has
 * a login screen like the real platform; the session lasts until the tab is closed or the user signs out.
 */
export const DEMO_USER = 'administrator';
const DEMO_PASSWORD = '000000';
const SESSION_KEY = 'pf-demo-user';

const SIGNED_OUT: AuthStatus = {
  authenticated: false,
  state: 'LoggedOut',
  user: null,
  lastError: null,
  logoutReason: null,
  reconnectAttempt: 0,
  tree: { loaded: false, phase: 'idle', nodesDiscovered: 0, nodeCount: null },
  writesEnabled: false,
};

const signedIn = (user: string): AuthStatus => ({
  authenticated: true,
  state: 'Ready',
  user,
  lastError: null,
  logoutReason: null,
  reconnectAttempt: 0,
  tree: { loaded: true, phase: 'ready', nodesDiscovered: 0, nodeCount: null },
  writesEnabled: true,
});

function storedUser(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function remember(user: string | null) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, user);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: the session just won't survive a reload */
  }
}

interface AuthStore {
  status: AuthStatus | null;
  unreachable: string | null;
  initialized: boolean;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  status: (() => {
    const user = storedUser();
    return user ? signedIn(user) : SIGNED_OUT;
  })(),
  unreachable: null,
  initialized: true,

  refresh: async () => {},

  login: async (username, password) => {
    // A short pause, like a real sign-in round trip.
    await new Promise((r) => setTimeout(r, 650));
    if (username.trim().toLowerCase() !== DEMO_USER || password !== DEMO_PASSWORD) {
      throw new GatewayError(401, 'invalid_credentials', 'The user name or password is incorrect.');
    }
    remember(DEMO_USER);
    set({ status: signedIn(DEMO_USER) });
  },

  logout: async () => {
    remember(null);
    try {
      sessionStorage.removeItem('pf-preview');
    } catch {
      /* storage unavailable */
    }
    set({ status: SIGNED_OUT });
  },
}));

export function startAuthPolling(): () => void {
  return () => {};
}
