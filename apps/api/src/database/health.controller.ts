import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from './database.service';
import { ApiErrorDto } from '../common/http/dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get()
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['status', 'database'],
      properties: {
        status: { type: 'string', enum: ['ok'] },
        database: { type: 'string', enum: ['ok'] },
      },
    },
  })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto })
  async health() {
    try {
      await this.database.pool.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
