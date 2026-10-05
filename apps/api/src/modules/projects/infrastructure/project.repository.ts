import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { projects } from '@starter/db';
import type { CreateProject, Project, UpdateProject, ProjectRepository } from '../domain/project';
import { DatabaseService } from '../../../database/database.service';

function toProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
@Injectable()
export class PostgresProjectRepository implements ProjectRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async create(ownerId: string, input: CreateProject): Promise<Project> {
    const [row] = await this.database.db
      .insert(projects)
      .values({ ownerId, ...input })
      .returning();
    if (!row) throw new Error('Project creation failed');
    return toProject(row);
  }
  async list(ownerId: string): Promise<Project[]> {
    return (
      await this.database.db
        .select()
        .from(projects)
        .where(eq(projects.ownerId, ownerId))
        .orderBy(desc(projects.createdAt), desc(projects.id))
    ).map(toProject);
  }
  async get(ownerId: string, id: string): Promise<Project | null> {
    const [row] = await this.database.db
      .select()
      .from(projects)
      .where(and(eq(projects.ownerId, ownerId), eq(projects.id, id)));
    return row ? toProject(row) : null;
  }
  async update(ownerId: string, id: string, input: UpdateProject): Promise<Project | null> {
    const [row] = await this.database.db
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.ownerId, ownerId), eq(projects.id, id)))
      .returning();
    return row ? toProject(row) : null;
  }
  async delete(ownerId: string, id: string): Promise<boolean> {
    return (
      (
        await this.database.db
          .delete(projects)
          .where(and(eq(projects.ownerId, ownerId), eq(projects.id, id)))
          .returning({ id: projects.id })
      ).length > 0
    );
  }
}
