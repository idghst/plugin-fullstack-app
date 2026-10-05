import { createZodDto } from 'nestjs-zod';
import {
  createProjectSchema,
  updateProjectSchema,
  projectSchema,
  projectListSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
  tokensSchema,
  userSchema,
  apiErrorSchema,
} from '@starter/contracts';

export class CreateProjectDto extends createZodDto(createProjectSchema) {}
export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
export class ProjectDto extends createZodDto(projectSchema) {}
export class ProjectListDto extends createZodDto(projectListSchema) {}
export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class RefreshDto extends createZodDto(refreshSchema) {}
export class TokensDto extends createZodDto(tokensSchema) {}
export class UserDto extends createZodDto(userSchema) {}
export class ApiErrorDto extends createZodDto(apiErrorSchema) {}
