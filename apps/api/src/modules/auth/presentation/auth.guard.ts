import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import type { Request } from 'express';
import { AUTH_REPOSITORY, type AuthRepository } from '../domain/auth.repository';

export interface AuthenticatedRequest extends Request {
  requestId: string;
  user: { id: string; email: string };
}
const claimsSchema = z.object({ sub: z.uuid(), sid: z.uuid() });
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = request.headers.authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match?.[1]) throw new UnauthorizedException();
    let claims: z.infer<typeof claimsSchema>;
    try {
      claims = claimsSchema.parse(
        await this.jwt.verifyAsync(match[1], {
          algorithms: ['HS256'],
          issuer: 'starter-api',
          audience: 'starter-clients',
        }),
      );
    } catch {
      throw new UnauthorizedException();
    }
    const user = await this.repository.getUserForSession(claims.sid, claims.sub);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}
