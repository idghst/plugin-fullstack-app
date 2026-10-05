import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, createApiClient } from '@starter/api-client';
import type { User } from '@starter/contracts';
import { tokenStore } from './token-store';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL!;
export const api = createApiClient({ baseUrl: apiBaseUrl, tokenStore });
type Session = {
  user: User | null;
  ready: boolean;
  startupError: string;
  signIn(email: string, password: string, register: boolean): Promise<void>;
  signOut(): Promise<void>;
  expire(): void;
};
const Context = createContext<Session | null>(null);
export function message(error: unknown) {
  return error instanceof ApiError
    ? `${error.message}${error.requestId ? ` (Reference: ${error.requestId})` : ''}`
    : error instanceof Error
      ? error.message
      : 'Please try again.';
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (await tokenStore.get()) {
          const current = await api.user.getMe();
          if (active) setUser(current);
        }
      } catch (error) {
        if (active) setStartupError(message(error));
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const session: Session = {
    user,
    ready,
    startupError,
    async signIn(email, password, register) {
      const tokens = await api.auth[register ? 'register' : 'login']({
        email: email.trim(),
        password,
      });
      setUser(tokens.user);
      setStartupError('');
    },
    async signOut() {
      try {
        await api.auth.logout();
      } finally {
        setUser(null);
      }
    },
    expire() {
      setUser(null);
    },
  };
  return <Context.Provider value={session}>{children}</Context.Provider>;
}
export function useSession() {
  const context = useContext(Context);
  if (!context) throw new Error('SessionProvider is required');
  return context;
}
