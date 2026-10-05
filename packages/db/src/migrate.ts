import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from './index';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  const { db, pool } = createDatabase(connectionString);
  try {
    await migrate(db, { migrationsFolder: resolve(__dirname, '../migrations') });
    console.log('Database migrations applied.');
  } finally {
    await pool.end();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration failed');
  process.exitCode = 1;
});
