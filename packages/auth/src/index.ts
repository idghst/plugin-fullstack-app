import type { Tokens } from '@starter/contracts';

// Platform adapters decide where tokens live; never import a native SDK here.
export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}
export function createMemoryTokenStore(): TokenStore {
  let tokens: Tokens | null = null;
  return {
    get: async () => tokens,
    set: async (next) => {
      tokens = next;
    },
    clear: async () => {
      tokens = null;
    },
  };
}
