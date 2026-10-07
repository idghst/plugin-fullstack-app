import {
  HttpException,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  type CallHandler,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { finalize } from 'rxjs';
import { CONFIG, type AppConfig } from '../../../config/environment';

// One process only. Full maps fail closed; active clients are never evicted to admit new keys.
export class AuthRateLimiter {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();
  private nextCleanup = 0;
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxKeys: number,
  ) {}
  consume(key: string, now = Date.now()): number {
    if (now >= this.nextCleanup) {
      for (const [client, entry] of this.entries)
        if (entry.expiresAt <= now) this.entries.delete(client);
      this.nextCleanup = now + this.windowMs;
    }
    let entry = this.entries.get(key);
    if (entry && entry.expiresAt <= now) {
      this.entries.delete(key);
      entry = undefined;
    }
    if (!entry) {
      if (this.entries.size >= this.maxKeys)
        return Math.max(1, Math.ceil((this.nextCleanup - now) / 1000));
      entry = { count: 0, expiresAt: now + this.windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= this.max) return Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
    entry.count++;
    return 0;
  }
}
@Injectable()
export class AuthRateLimitGuard implements CanActivate, NestInterceptor {
  private readonly limiter;
  private activeRequests = 0;
  private readonly releases = new WeakMap<Request, () => void>();
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {
    this.limiter = new AuthRateLimiter(
      config.AUTH_RATE_LIMIT_MAX,
      config.AUTH_RATE_LIMIT_WINDOW_MS,
      config.AUTH_RATE_LIMIT_MAX_KEYS,
    );
  }
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'POST') return true;
    const response = context.switchToHttp().getResponse<Response>();
    const retryAfter = this.limiter.consume(
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
    if (retryAfter || this.activeRequests >= this.config.AUTH_MAX_CONCURRENT_REQUESTS) {
      response.setHeader('retry-after', String(retryAfter || 1));
      throw new HttpException('Too many requests.', 429);
    }
    this.activeRequests++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.activeRequests--;
    };
    this.releases.set(request, release);
    return true;
  }
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    // HTTP disconnects must not free a slot while scrypt/database work is still running.
    return next.handle().pipe(
      finalize(() => {
        this.releases.get(request)?.();
        this.releases.delete(request);
      }),
    );
  }
}
