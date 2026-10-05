import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { refreshSessions, users } from '@starter/db';
import { DomainError } from '@starter/core';
import { DatabaseService } from '../../../database/database.service';
import type {
  AuthRepository,
  AuthUser,
  InitialSession,
  StoredUser,
} from '../domain/auth.repository';

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; cause?: unknown };
  return value.code === '23505' || (value.cause !== undefined && isUniqueViolation(value.cause));
}
@Injectable()
export class PostgresAuthRepository implements AuthRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async register(email: string, passwordHash: string, session: InitialSession): Promise<AuthUser> {
    try {
      return await this.database.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({ email, passwordHash })
          .returning({ id: users.id, email: users.email });
        if (!user) throw new Error('User creation failed');
        await tx.insert(refreshSessions).values({ ...session, userId: user.id });
        return user;
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DomainError('CONFLICT', 'The resource already exists.');
      throw error;
    }
  }
  async findByEmail(email: string): Promise<StoredUser | null> {
    const [user] = await this.database.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }
  async createSession(userId: string, session: InitialSession): Promise<void> {
    await this.database.db.insert(refreshSessions).values({ ...session, userId });
  }
  async rotate(
    tokenHash: string,
    next: { id: string; tokenHash: string },
  ): Promise<AuthUser | null> {
    return this.database.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(refreshSessions)
        .where(eq(refreshSessions.tokenHash, tokenHash));
      if (!candidate) return null;
      // A family lock also serializes operations on different token generations.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${candidate.familyId}, 0))`,
      );
      const [previous] = await tx
        .select()
        .from(refreshSessions)
        .where(eq(refreshSessions.id, candidate.id))
        .for('update');
      if (!previous) return null;
      if (previous.consumedAt || previous.revokedAt || previous.expiresAt.getTime() <= Date.now()) {
        await tx
          .update(refreshSessions)
          .set({ revokedAt: new Date() })
          .where(eq(refreshSessions.familyId, previous.familyId));
        return null; // Commit revocation before the application returns 401.
      }
      const [user] = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, previous.userId));
      if (!user) return null;
      await tx
        .update(refreshSessions)
        .set({ consumedAt: new Date() })
        .where(eq(refreshSessions.id, previous.id));
      await tx.insert(refreshSessions).values({
        ...next,
        userId: previous.userId,
        familyId: previous.familyId,
        expiresAt: previous.expiresAt,
      });
      return user;
    });
  }
  async revoke(tokenHash: string): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(refreshSessions)
        .where(eq(refreshSessions.tokenHash, tokenHash));
      if (!session) return;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${session.familyId}, 0))`);
      await tx
        .update(refreshSessions)
        .set({ revokedAt: new Date() })
        .where(eq(refreshSessions.familyId, session.familyId));
    });
  }
  async getUserForSession(sessionId: string, userId: string): Promise<AuthUser | null> {
    const [user] = await this.database.db
      .select({ id: users.id, email: users.email })
      .from(refreshSessions)
      .innerJoin(users, eq(users.id, refreshSessions.userId))
      .where(
        and(
          eq(refreshSessions.id, sessionId),
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
          gt(refreshSessions.expiresAt, new Date()),
        ),
      );
    return user ?? null;
  }
}
