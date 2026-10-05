import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectService } from './application/project.service';
import { PostgresProjectRepository } from './infrastructure/project.repository';
import { ProjectController } from './presentation/project.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProjectController],
  providers: [
    PostgresProjectRepository,
    {
      provide: ProjectService,
      inject: [PostgresProjectRepository],
      useFactory: (repository: PostgresProjectRepository) => new ProjectService(repository),
    },
  ],
})
export class ProjectsModule {}
