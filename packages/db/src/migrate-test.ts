import { requireTestDatabaseUrl } from './test-database';
process.env.DATABASE_URL = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
void import('./migrate.js');
