import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { DomainError } from '@starter/core';
import type {
  AuthRepository,
  AccessTokenSigner,
  AuthTokens,
  AuthUser,
  InitialSession,
  PasswordHasher,
} from '../domain/auth.repository';

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export class AuthService {
  private readonly dummyPasswordHash: Promise<string>;
  constructor(
    private readonly repository: AuthRepository,
    private readonly signer: AccessTokenSigner,
    private readonly passwords: PasswordHasher,
    private readonly refreshTtlSeconds: number,
  ) {
    this.dummyPasswordHash = this.passwords.hash(randomBytes(32).toString('hex'));
  }
  private newSession(): { refreshToken: string; row: InitialSession } {
    const refreshToken = randomBytes(48).toString('base64url');
    return {
      refreshToken,
      row: {
        id: randomUUID(),
        familyId: randomUUID(),
        tokenHash: tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
      },
    };
  }
  private async tokens(
    user: AuthUser,
    sessionId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    return { user, refreshToken, accessToken: await this.signer.sign(user.id, sessionId) };
  }
  async register(email: string, password: string): Promise<AuthTokens> {
    const session = this.newSession();
    const user = await this.repository.register(
      email.trim().toLowerCase(),
      await this.passwords.hash(password),
      session.row,
    );
    return this.tokens(user, session.row.id, session.refreshToken);
  }
  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.repository.findByEmail(email.trim().toLowerCase());
    const valid = await this.passwords.verify(
      password,
      user?.passwordHash ?? (await this.dummyPasswordHash),
    );
    if (!user || !valid)
      throw new DomainError('UNAUTHORIZED', 'Authentication required or credentials invalid.');
    const session = this.newSession();
    await this.repository.createSession(user.id, session.row);
    return this.tokens({ id: user.id, email: user.email }, session.row.id, session.refreshToken);
  }
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const next = this.newSession();
    const user = await this.repository.rotate(tokenHash(refreshToken), {
      id: next.row.id,
      tokenHash: next.row.tokenHash,
    });
    if (!user)
      throw new DomainError('UNAUTHORIZED', 'Authentication required or credentials invalid.');
    return this.tokens(user, next.row.id, next.refreshToken);
  }
  async logout(refreshToken: string): Promise<void> {
    await this.repository.revoke(tokenHash(refreshToken));
  }
}
