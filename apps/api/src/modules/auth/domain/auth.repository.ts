export interface AuthUser {
  id: string;
  email: string;
}
export interface StoredUser extends AuthUser {
  passwordHash: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
export interface InitialSession {
  id: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encoded: string): Promise<boolean>;
}
export interface AccessTokenSigner {
  sign(userId: string, sessionId: string): Promise<string>;
}
export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
export interface AuthRepository {
  register(email: string, passwordHash: string, session: InitialSession): Promise<AuthUser>;
  findByEmail(email: string): Promise<StoredUser | null>;
  createSession(userId: string, session: InitialSession): Promise<void>;
  rotate(tokenHash: string, next: { id: string; tokenHash: string }): Promise<AuthUser | null>;
  revoke(tokenHash: string): Promise<void>;
  getUserForSession(sessionId: string, userId: string): Promise<AuthUser | null>;
}
