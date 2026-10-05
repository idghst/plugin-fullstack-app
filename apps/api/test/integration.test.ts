import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  apiErrorSchema,
  projectListSchema,
  projectSchema,
  tokensSchema,
  userSchema,
} from '@starter/contracts';
import { createDatabase, requireTestDatabaseUrl, users, refreshSessions } from '@starter/db';
import { createApp } from '../src/app';

// Never fall back to DATABASE_URL. Refuse production hosts, databases and ports.
const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:3000,tauri://localhost';
const connection = createDatabase(databaseUrl);
let app: INestApplication;
let base: string;
const email = `test-${randomUUID()}@example.com`;
const otherEmail = `other-${randomUUID()}@example.com`;
const password = 'integration-password-strong';
let accessToken: string;
let refreshToken: string;
let projectId: string;

async function call(path: string, method = 'GET', body?: unknown, token?: string) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data: unknown = response.status === 204 ? null : await response.json();
  return { status: response.status, data, headers: response.headers };
}
beforeAll(async () => {
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  try {
    await connection.db.delete(users).where(inArray(users.email, [email, otherEmail]));
  } finally {
    await connection.pool.end();
  }
});

describe('real HTTP and PostgreSQL integration', () => {
  it('registers a user and returns a redacted user and tokens', async () => {
    const result = await call('/auth/register', 'POST', { email, password });
    expect(result.status).toBe(201);
    const tokens = tokensSchema.parse(result.data);
    expect(tokens.user).toEqual({ id: expect.any(String), email });
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    expect(userSchema.parse((await call('/auth/me', 'GET', undefined, accessToken)).data)).toEqual(
      tokens.user,
    );
  });
  it('stores salted password hashes and refresh token digests only', async () => {
    const [user] = await connection.db.select().from(users).where(eq(users.email, email));
    expect(user?.passwordHash).toMatch(/^scrypt:131072:8:1:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(user?.passwordHash).not.toContain(password);
    const digest = createHash('sha256').update(refreshToken).digest('hex');
    const [session] = await connection.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.tokenHash, digest));
    expect(session?.tokenHash).toBe(digest);
    expect(JSON.stringify(session)).not.toContain(refreshToken);
  });
  it('rejects duplicate emails and invalid credentials with standard errors', async () => {
    expect((await call('/auth/register', 'POST', { email, password })).status).toBe(409);
    const result = await call('/auth/login', 'POST', { email, password: 'wrong-password-1234' });
    expect(result.status).toBe(401);
    expect(apiErrorSchema.parse(result.data)).toMatchObject({
      code: 'UNAUTHORIZED',
      requestId: expect.any(String),
    });
    expect(JSON.stringify(result.data)).not.toContain('passwordHash');
  });
  it('validates request data and requires authentication', async () => {
    expect((await call('/projects')).status).toBe(401);
    expect((await call('/auth/me', 'GET', undefined, accessToken + 'x')).status).toBe(401);
    const result = await call('/projects', 'POST', { name: '' }, accessToken);
    expect(result.status).toBe(400);
    expect(apiErrorSchema.parse(result.data).code).toBe('VALIDATION_ERROR');
    expect(result.headers.get('x-request-id')).toBe(apiErrorSchema.parse(result.data).requestId);
  });
  it('creates, lists, reads and updates owned projects', async () => {
    const created = await call('/projects', 'POST', { name: 'First project' }, accessToken);
    expect(created.status).toBe(201);
    const project = projectSchema.parse(created.data);
    expect(project.description).toBe('');
    projectId = project.id;
    expect(
      projectListSchema.parse((await call('/projects', 'GET', undefined, accessToken)).data).items,
    ).toContainEqual(project);
    expect(
      projectSchema.parse(
        (await call(`/projects/${projectId}`, 'GET', undefined, accessToken)).data,
      ),
    ).toEqual(project);
    const updated = await call(`/projects/${projectId}`, 'PATCH', { name: 'Renamed' }, accessToken);
    expect(projectSchema.parse(updated.data).name).toBe('Renamed');
    expect((await call(`/projects/${projectId}`, 'PATCH', {}, accessToken)).status).toBe(400);
  });
  it('isolates owners on list, get, update and delete', async () => {
    const other = tokensSchema.parse(
      (await call('/auth/register', 'POST', { email: otherEmail, password })).data,
    );
    expect(
      projectListSchema.parse((await call('/projects', 'GET', undefined, other.accessToken)).data)
        .items,
    ).toEqual([]);
    expect((await call(`/projects/${projectId}`, 'GET', undefined, other.accessToken)).status).toBe(
      404,
    );
    expect(
      (await call(`/projects/${projectId}`, 'PATCH', { name: 'Stolen' }, other.accessToken)).status,
    ).toBe(404);
    expect(
      (await call(`/projects/${projectId}`, 'DELETE', undefined, other.accessToken)).status,
    ).toBe(404);
  });
  it('rotates refresh tokens and revokes the entire family on replay', async () => {
    const result = await call('/auth/refresh', 'POST', { refreshToken });
    expect(result.status).toBe(200);
    const rotated = tokensSchema.parse(result.data);
    expect(rotated.refreshToken).not.toBe(refreshToken);
    expect((await call('/auth/refresh', 'POST', { refreshToken })).status).toBe(401);
    expect(
      (await call('/auth/refresh', 'POST', { refreshToken: rotated.refreshToken })).status,
    ).toBe(401);
    expect((await call('/auth/me', 'GET', undefined, rotated.accessToken)).status).toBe(401);
  });
  it('handles simultaneous refresh replay without leaving an active successor', async () => {
    const login = tokensSchema.parse((await call('/auth/login', 'POST', { email, password })).data);
    const results = await Promise.all([
      call('/auth/refresh', 'POST', { refreshToken: login.refreshToken }),
      call('/auth/refresh', 'POST', { refreshToken: login.refreshToken }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
    const successful = results.find((result) => result.status === 200);
    const rotated = tokensSchema.parse(successful?.data);
    expect(
      (await call('/auth/refresh', 'POST', { refreshToken: rotated.refreshToken })).status,
    ).toBe(401);
    expect((await call('/auth/me', 'GET', undefined, rotated.accessToken)).status).toBe(401);
  });
  it('rejects expired sessions for both refresh and access', async () => {
    const login = tokensSchema.parse((await call('/auth/login', 'POST', { email, password })).data);
    const digest = createHash('sha256').update(login.refreshToken).digest('hex');
    await connection.db
      .update(refreshSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(refreshSessions.tokenHash, digest));
    expect((await call('/auth/refresh', 'POST', { refreshToken: login.refreshToken })).status).toBe(
      401,
    );
    expect((await call('/auth/me', 'GET', undefined, login.accessToken)).status).toBe(401);
  });
  it('logs in, deletes owned projects and revokes tokens on logout', async () => {
    const result = await call('/auth/login', 'POST', { email, password });
    expect(result.status).toBe(200);
    const login = tokensSchema.parse(result.data);
    expect(
      (await call(`/projects/${projectId}`, 'DELETE', undefined, login.accessToken)).status,
    ).toBe(204);
    expect((await call(`/projects/${projectId}`, 'GET', undefined, login.accessToken)).status).toBe(
      404,
    );
    expect((await call('/auth/logout', 'POST', { refreshToken: login.refreshToken })).status).toBe(
      204,
    );
    expect((await call('/auth/me', 'GET', undefined, login.accessToken)).status).toBe(401);
  });
  it('provides root DB health and documented shared response schemas', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200);
    const response = await fetch(`${base}/api/v1/docs-json`);
    const schema = z.object({
      paths: z.record(z.string(), z.unknown()),
      components: z.object({ schemas: z.record(z.string(), z.unknown()) }),
    });
    const document = schema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(document.paths['/api/v1/projects']).toBeDefined();
    expect(document.components.schemas).toBeDefined();
  });
  it('permits explicit Tauri origins and rejects unrelated origins', async () => {
    const allowed = await fetch(`${base}/health`, { headers: { origin: 'tauri://localhost' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('tauri://localhost');
    const denied = await fetch(`${base}/health`, {
      headers: { origin: 'https://untrusted.example' },
    });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });
});
