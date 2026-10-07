import 'reflect-metadata';
import {
  Controller,
  Get,
  Module,
  Post,
  UseGuards,
  UseInterceptors,
  type INestApplication,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthRateLimitGuard,
  AuthRateLimiter,
} from '../src/modules/auth/presentation/auth-rate-limit.guard';
import { CONFIG } from '../src/config/environment';
import { ApiErrorFilter } from '../src/common/http/error.filter';

describe('bounded single-process auth rate limits', () => {
  it('blocks repeated auth requests until their window expires', () => {
    const limiter = new AuthRateLimiter(2, 1000, 2);
    expect(limiter.consume('first', 0)).toBe(0);
    expect(limiter.consume('first', 10)).toBe(0);
    expect(limiter.consume('first', 20)).toBe(1);
    expect(limiter.consume('second', 20)).toBe(0);
    expect(limiter.consume('first', 1000)).toBe(0);
  });
  it('fails closed at the key bound instead of evicting blocked clients', () => {
    const limiter = new AuthRateLimiter(1, 1000, 2);
    expect(limiter.consume('first', 0)).toBe(0);
    expect(limiter.consume('second', 0)).toBe(0);
    expect(limiter.consume('third', 10)).toBe(1);
    expect(limiter.consume('first', 10)).toBe(1);
    expect(limiter.consume('third', 1000)).toBe(0);
  });
});

let app: INestApplication | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});
@Controller('auth')
@UseGuards(AuthRateLimitGuard)
@UseInterceptors(AuthRateLimitGuard)
class AuthTestController {
  @Post('login') login() {
    return { ok: true };
  }
  @Post('slow') async slow() {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { ok: true };
  }
  @Get('me') me() {
    return { ok: true };
  }
}
async function start(max = 2, concurrency = 2) {
  @Module({
    controllers: [AuthTestController],
    providers: [
      AuthRateLimitGuard,
      {
        provide: CONFIG,
        useValue: {
          AUTH_RATE_LIMIT_MAX: max,
          AUTH_RATE_LIMIT_WINDOW_MS: 60_000,
          AUTH_RATE_LIMIT_MAX_KEYS: 2,
          AUTH_MAX_CONCURRENT_REQUESTS: concurrency,
        },
      },
    ],
  })
  class TestModule {}
  app = await NestFactory.create(TestModule, { logger: false });
  app.useGlobalFilters(new ApiErrorFilter());
  await app.listen(0, '127.0.0.1');
  return app.getUrl();
}
describe('HTTP auth throttling', () => {
  it('returns a standard 429 and cannot be bypassed with untrusted forwarded IPs', async () => {
    const base = await start();
    for (let i = 0; i < 2; i++)
      expect(
        (
          await fetch(`${base}/auth/login`, {
            method: 'POST',
            headers: { 'x-forwarded-for': `192.0.2.${i}` },
          })
        ).status,
      ).toBe(201);
    const response = await fetch(`${base}/auth/login`, { method: 'POST' });
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(await response.json()).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Too many requests.',
    });
    expect((await fetch(`${base}/auth/me`)).status).toBe(200);
  });
  it('bounds concurrent auth work and releases the slot after completion', async () => {
    const base = await start(20, 1);
    const first = fetch(`${base}/auth/slow`, { method: 'POST' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect((await fetch(`${base}/auth/slow`, { method: 'POST' })).status).toBe(429);
    expect((await first).status).toBe(201);
    expect((await fetch(`${base}/auth/login`, { method: 'POST' })).status).toBe(201);
  });
  it('releases a disconnected request only after its work settles', async () => {
    const base = await start(20, 1);
    const controller = new AbortController();
    const pending = fetch(`${base}/auth/slow`, { method: 'POST', signal: controller.signal }).catch(
      () => undefined,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    controller.abort();
    await pending;
    expect((await fetch(`${base}/auth/login`, { method: 'POST' })).status).toBe(429);
    await new Promise((resolve) => setTimeout(resolve, 160));
    expect((await fetch(`${base}/auth/login`, { method: 'POST' })).status).toBe(201);
  });
});
