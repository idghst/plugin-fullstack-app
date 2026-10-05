import { eq } from 'drizzle-orm';
import { createDatabase, projects, users } from './index';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  if (!connectionString || !email)
    throw new Error('Set DATABASE_URL and SEED_USER_EMAIL for an existing registered user.');
  const { db, pool } = createDatabase(connectionString);
  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (!user) throw new Error('Register SEED_USER_EMAIL through the API before running the seed.');
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, user.id));
    if (existing.length) {
      console.log('User already has projects; seed skipped.');
      return;
    }
    await db.insert(projects).values([
      {
        ownerId: user.id,
        name: 'Welcome project',
        description: 'Edit this project to start building your application.',
      },
      {
        ownerId: user.id,
        name: 'Next steps',
        description: 'Add your own domain to packages/core and expose it through the API.',
      },
    ]);
    console.log('Two sample projects created.');
  } finally {
    await pool.end();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
