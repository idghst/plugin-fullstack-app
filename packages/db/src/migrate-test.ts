import { requireTestDatabaseUrl } from './test-database';
process.env.DATABASE_URL = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
delete process.env.DATABASE_MIGRATION_URL;
process.env.DATABASE_SSL_MODE = 'disable';
delete process.env.DATABASE_SSL_CA_FILE;
void import('./migrate.js');
