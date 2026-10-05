import { z } from 'zod';
import {
  apiErrorSchema,
  createProjectSchema,
  loginSchema,
  projectListSchema,
  projectSchema,
  registerSchema,
  tokensSchema,
  updateProjectSchema,
  userSchema,
  type CreateProject,
  type Login,
  type Register,
  type Tokens,
  type UpdateProject,
} from '@starter/contracts';
import type { TokenStore } from '@starter/auth';
import { createRequestId } from '@starter/utils';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export interface ApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  timeoutMs?: number;
  /** Only GETs retry network/502/503/504 failures; at most two retries. */
  retryCount?: number;
  headers?: Record<string, string>;
}

export function createApiClient(options: ApiClientOptions) {
  const url = new URL(options.baseUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.pathname.replace(/\/$/, '').endsWith('/api/v1') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('API baseUrl must use HTTP(S) and end with /api/v1');
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 10_000;
  const retries = options.retryCount ?? 1;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isInteger(retries) ||
    retries < 0 ||
    retries > 2
  )
    throw new Error('Invalid timeout or retry policy');
  let refreshing: Promise<Tokens> | null = null;
  let sessionVersion = 0;
  let tokenOperations: Promise<unknown> = Promise.resolve();

  function tokenOperation<T>(operation: () => Promise<T>): Promise<T> {
    const pending = tokenOperations.then(operation);
    tokenOperations = pending.catch(() => undefined);
    return pending;
  }

  async function saveTokens(tokens: Tokens, version: number, requestId: string): Promise<void> {
    const ensureCurrent = () => {
      if (sessionVersion !== version)
        throw new ApiError('UNAUTHORIZED', 'Session changed during authentication', 401, requestId);
    };
    await tokenOperation(async () => {
      ensureCurrent();
      await options.tokenStore.set(tokens);
      ensureCurrent();
    });
  }

  function parse<T>(schema: z.ZodType<T>, input: unknown): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      throw new ApiError('VALIDATION_ERROR', 'Invalid request data', 0, createRequestId());
    return parsed.data;
  }

  async function send(
    path: string,
    method: string,
    body: unknown,
    accessToken?: string,
  ): Promise<{ response: Response; data: unknown; requestId: string }> {
    const requestId = createRequestId();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const data: unknown =
        response.status === 204
          ? undefined
          : await response.json().catch((error: unknown) => {
              if (controller.signal.aborted) throw error;
              if (!response.ok) return undefined;
              throw new ApiError(
                'CONTRACT_ERROR',
                'API returned non-JSON data',
                response.status,
                requestId,
              );
            });
      return { response, data, requestId };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        controller.signal.aborted ? 'API request timed out' : 'Cannot reach API',
        0,
        requestId,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  function responseError(data: unknown, status: number, requestId: string): ApiError {
    const parsed = apiErrorSchema.safeParse(data);
    return parsed.success
      ? new ApiError(parsed.data.code, parsed.data.message, status, parsed.data.requestId)
      : new ApiError('HTTP_ERROR', `API request failed (${status})`, status, requestId);
  }

  async function refresh(failedAccessToken: string | undefined): Promise<Tokens> {
    const version = sessionVersion;
    const current = await tokenOperation(() => options.tokenStore.get());
    if (sessionVersion !== version)
      throw new ApiError('UNAUTHORIZED', 'Session changed during refresh', 401, createRequestId());
    if (current && current.accessToken !== failedAccessToken) return current;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      if (!current)
        throw new ApiError('UNAUTHORIZED', 'Sign in to continue', 401, createRequestId());
      const { response, data, requestId } = await send('/auth/refresh', 'POST', {
        refreshToken: current.refreshToken,
      });
      if (!response.ok) throw responseError(data, response.status, requestId);
      const parsed = tokensSchema.safeParse(data);
      if (!parsed.success)
        throw new ApiError('CONTRACT_ERROR', 'Invalid token response', response.status, requestId);
      await saveTokens(parsed.data, version, requestId);
      return parsed.data;
    })();
    try {
      return await refreshing;
    } catch (error) {
      if (
        sessionVersion === version &&
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403 || error.code === 'CONTRACT_ERROR')
      )
        await tokenOperation(async () => {
          if (sessionVersion === version) await options.tokenStore.clear();
        });
      throw error;
    } finally {
      refreshing = null;
    }
  }

  async function request<T>(
    path: string,
    method: string,
    schema: z.ZodType<T>,
    body?: unknown,
    authenticated = true,
  ): Promise<T> {
    let attempt = 0;
    let refreshed = false;
    while (true) {
      const session = authenticated ? await tokenOperation(() => options.tokenStore.get()) : null;
      let result: Awaited<ReturnType<typeof send>>;
      try {
        result = await send(path, method, body, session?.accessToken);
      } catch (error) {
        if (
          method === 'GET' &&
          attempt++ < retries &&
          error instanceof ApiError &&
          error.code === 'NETWORK_ERROR'
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          continue;
        }
        throw error;
      }
      const { response, data, requestId } = result;
      if (response.status === 401 && authenticated && session && !refreshed) {
        await refresh(session.accessToken);
        refreshed = true;
        continue;
      }
      if (method === 'GET' && [502, 503, 504].includes(response.status) && attempt++ < retries) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        continue;
      }
      if (!response.ok) throw responseError(data, response.status, requestId);
      const parsed = schema.safeParse(data);
      if (!parsed.success)
        throw new ApiError(
          'CONTRACT_ERROR',
          'API response does not match the shared contract',
          response.status,
          requestId,
        );
      return parsed.data;
    }
  }

  async function authenticate(path: string, input: Login): Promise<Tokens> {
    const version = ++sessionVersion;
    const tokens = await request(path, 'POST', tokensSchema, input, false);
    await saveTokens(tokens, version, createRequestId());
    return tokens;
  }

  return {
    auth: {
      register: async (input: Register) =>
        authenticate('/auth/register', parse(registerSchema, input)),
      login: async (input: Login) => authenticate('/auth/login', parse(loginSchema, input)),
      logout: async (): Promise<void> => {
        sessionVersion += 1;
        const tokens = await tokenOperation(async () => {
          const current = await options.tokenStore.get();
          await options.tokenStore.clear();
          return current;
        });
        if (tokens)
          await request(
            '/auth/logout',
            'POST',
            z.void(),
            { refreshToken: tokens.refreshToken },
            false,
          );
      },
    },
    user: { getMe: () => request('/auth/me', 'GET', userSchema) },
    project: {
      list: () => request('/projects', 'GET', projectListSchema),
      get: (id: string) => request(`/projects/${encodeURIComponent(id)}`, 'GET', projectSchema),
      create: async (input: CreateProject) =>
        request('/projects', 'POST', projectSchema, parse(createProjectSchema, input)),
      update: async (id: string, input: UpdateProject) =>
        request(
          `/projects/${encodeURIComponent(id)}`,
          'PATCH',
          projectSchema,
          parse(updateProjectSchema, input),
        ),
      delete: (id: string) => request(`/projects/${encodeURIComponent(id)}`, 'DELETE', z.void()),
    },
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
