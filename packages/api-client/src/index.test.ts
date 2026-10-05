import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './index';
import { createMemoryTokenStore } from '@starter/auth';

const user = { id: 'ea10b2b1-7701-4d2b-aeb6-90ecc92d6104', email: 'dev@example.com' };
const tokens = { user, accessToken: 'old-access', refreshToken: 'old-refresh' };
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
afterEach(() => vi.unstubAllGlobals());

describe('shared API client', () => {
  it.each([502, 503, 504])(
    'retries GETs after HTML or empty gateway responses (%s)',
    async (status) => {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(new Response('<html>Unavailable</html>', { status }))
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(reply({ items: [] }));
      vi.stubGlobal('fetch', fetcher);
      const api = createApiClient({
        baseUrl: 'http://localhost:4000/api/v1',
        tokenStore: createMemoryTokenStore(),
        retryCount: 2,
      });
      expect(await api.project.list()).toEqual({ items: [] });
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );
  it('keeps a contract error for successful invalid JSON responses', async () => {
    const fetcher = vi.fn(async () => new Response('<html>Unexpected</html>', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const api = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      tokenStore: createMemoryTokenStore(),
    });
    await expect(api.project.list()).rejects.toMatchObject({ code: 'CONTRACT_ERROR', status: 200 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['login', 'register'] as const)(
    'does not save a delayed %s response after logout',
    async (method) => {
      const response = deferred<Response>();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => response.promise),
      );
      const store = createMemoryTokenStore();
      const api = createApiClient({ baseUrl: 'http://localhost:4000/api/v1', tokenStore: store });
      const login = api.auth[method]({ email: user.email, password: 'test-password-1234' });
      await api.auth.logout();
      response.resolve(reply(tokens));
      await expect(login).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      expect(await store.get()).toBeNull();
    },
  );
  it('keeps the latest login when responses finish in reverse order', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    );
    const store = createMemoryTokenStore();
    const api = createApiClient({ baseUrl: 'http://localhost:4000/api/v1', tokenStore: store });
    const initial = api.auth.login({ email: user.email, password: 'test-password-1234' });
    const latest = api.auth.login({ email: user.email, password: 'test-password-5678' });
    const next = { ...tokens, accessToken: 'latest-access', refreshToken: 'latest-refresh' };
    second.resolve(reply(next));
    await expect(latest).resolves.toEqual(next);
    first.resolve(reply(tokens));
    await expect(initial).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(await store.get()).toEqual(next);
  });
  it('serializes an in-flight token write before logout clears storage', async () => {
    const writing = deferred<void>();
    const release = deferred<void>();
    const store = createMemoryTokenStore();
    const delayedStore = {
      ...store,
      set: async (next: typeof tokens) => {
        writing.resolve();
        await release.promise;
        await store.set(next);
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/auth/logout') ? new Response(null, { status: 204 }) : reply(tokens),
      ),
    );
    const api = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      tokenStore: delayedStore,
    });
    const login = api.auth.login({ email: user.email, password: 'test-password-1234' });
    const loginResult = expect(login).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await writing.promise;
    const logout = api.auth.logout();
    release.resolve();
    await Promise.all([loginResult, logout]);
    expect(await store.get()).toBeNull();
  });
  it('validates server responses against the contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply({ items: [{ id: 'invalid' }] })),
    );
    const api = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      tokenStore: createMemoryTokenStore(),
    });
    await expect(api.project.list()).rejects.toMatchObject({ code: 'CONTRACT_ERROR' });
  });
  it('refreshes once for concurrent unauthorized requests and retries with the new access token', async () => {
    const store = createMemoryTokenStore();
    await store.set(tokens);
    let refreshes = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (url.endsWith('/auth/refresh')) {
          refreshes += 1;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return reply({ ...tokens, accessToken: 'new-access', refreshToken: 'new-refresh' });
        }
        if (new Headers(init.headers).get('Authorization') === 'Bearer old-access')
          return reply({ code: 'UNAUTHORIZED', message: 'Expired', requestId: 'r1' }, 401);
        return reply({ items: [] });
      }),
    );
    const api = createApiClient({ baseUrl: 'http://localhost:4000/api/v1', tokenStore: store });
    expect(await Promise.all([api.project.list(), api.project.list()])).toEqual([
      { items: [] },
      { items: [] },
    ]);
    expect(refreshes).toBe(1);
    expect((await store.get())?.accessToken).toBe('new-access');
  });
  it('does not retry mutations on service failure', async () => {
    const fetcher = vi.fn(async () =>
      reply({ code: 'UNAVAILABLE', message: 'Unavailable', requestId: 'r2' }, 503),
    );
    vi.stubGlobal('fetch', fetcher);
    const api = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      tokenStore: createMemoryTokenStore(),
    });
    await expect(api.project.create({ name: 'New', description: '' })).rejects.toMatchObject({
      status: 503,
      requestId: 'r2',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('preserves gateway status without retrying mutations when the response is HTML', async () => {
    const fetcher = vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 }));
    vi.stubGlobal('fetch', fetcher);
    const api = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      tokenStore: createMemoryTokenStore(),
    });
    await expect(api.project.create({ name: 'New', description: '' })).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 502,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('clears invalid sessions when refresh fails', async () => {
    const store = createMemoryTokenStore();
    await store.set(tokens);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        reply({ code: 'UNAUTHORIZED', message: 'Invalid session', requestId: 'r3' }, 401),
      ),
    );
    const api = createApiClient({ baseUrl: 'http://localhost:4000/api/v1', tokenStore: store });
    await expect(api.user.getMe()).rejects.toMatchObject({ status: 401 });
    expect(await store.get()).toBeNull();
  });
  it('times out each attempt and maps aborted fetches to a stable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const api = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      tokenStore: createMemoryTokenStore(),
      timeoutMs: 10,
      retryCount: 0,
    });
    await expect(api.project.list()).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('never retries validation errors or sends invalid input', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const api = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      tokenStore: createMemoryTokenStore(),
    });
    await expect(api.project.create({ name: ' ', description: '' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
