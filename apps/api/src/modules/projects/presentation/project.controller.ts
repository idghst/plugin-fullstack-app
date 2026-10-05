import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProjectService } from '../application/project.service';
import { ZodSerializerDto, ZodValidationPipe } from 'nestjs-zod';
import { AuthGuard, type AuthenticatedRequest } from '../../auth/presentation/auth.guard';
import {
  ApiErrorDto,
  CreateProjectDto,
  ProjectDto,
  ProjectListDto,
  UpdateProjectDto,
} from '../../../common/http/dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller('projects')
export class ProjectController {
  constructor(@Inject(ProjectService) private readonly service: ProjectService) {}
  @Post()
  @ApiBody({ type: CreateProjectDto })
  @ApiCreatedResponse({ type: ProjectDto })
  @ZodSerializerDto(ProjectDto)
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CreateProjectDto)) input: CreateProjectDto,
  ) {
    return this.service.create(request.user.id, input);
  }
  @Get()
  @ApiOkResponse({ type: ProjectListDto })
  @ZodSerializerDto(ProjectListDto)
  async list(@Req() request: AuthenticatedRequest) {
    return { items: await this.service.list(request.user.id) };
  }
  @Get(':id')
  @ApiOkResponse({ type: ProjectDto })
  @ZodSerializerDto(ProjectDto)
  get(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.get(request.user.id, id);
  }
  @Patch(':id')
  @ApiBody({ type: UpdateProjectDto })
  @ApiOkResponse({ type: ProjectDto })
  @ZodSerializerDto(ProjectDto)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateProjectDto)) input: UpdateProjectDto,
  ) {
    return this.service.update(request.user.id, id, input);
  }
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async delete(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.delete(request.user.id, id);
  }
}
