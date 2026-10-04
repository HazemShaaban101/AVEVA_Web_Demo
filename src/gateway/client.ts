/**
 * Demo build: there is no gateway. This module keeps the shapes the rest of the app uses, and nothing
 * in it opens a network connection. Equipment values come from src/gateway/demoDevices.ts instead.
 */

export class GatewayError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type GatewayState = 'LoggedOut' | 'Connecting' | 'LoadingTree' | 'Ready' | 'Reconnecting';

export interface AuthStatus {
  authenticated: boolean;
  state: GatewayState;
  user: string | null;
  lastError: string | null;
  logoutReason: string | null;
  reconnectAttempt: number;
  tree: { loaded: boolean; phase: string; nodesDiscovered: number; nodeCount: number | null };
  writesEnabled: boolean;
}

export type OpcValue = string | number | boolean | null | (string | number | boolean | null)[];
