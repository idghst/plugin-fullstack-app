import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { HealthController } from './health.controller';
@Global()
@Module({
  providers: [DatabaseService],
  controllers: [HealthController],
  exports: [DatabaseService],
})
export class DatabaseModule {}
