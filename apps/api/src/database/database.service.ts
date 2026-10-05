import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { createDatabase } from '@starter/db';
import { CONFIG, type AppConfig } from '../config/environment';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly db;
  readonly pool;
  constructor(@Inject(CONFIG) config: AppConfig) {
    const connection = createDatabase(config.DATABASE_URL);
    this.db = connection.db;
    this.pool = connection.pool;
    this.pool.on('error', () =>
      console.error(JSON.stringify({ level: 'error', event: 'database_connection_error' })),
    );
  }
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
