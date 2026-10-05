import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto, ZodValidationPipe } from 'nestjs-zod';
import {
  ApiErrorDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  TokensDto,
  UserDto,
} from '../../../common/http/dto';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import { AuthService } from '../application/auth.service';

@ApiTags('Authentication')
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: TokensDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ZodSerializerDto(TokensDto)
  register(@Body(new ZodValidationPipe(RegisterDto)) input: RegisterDto) {
    return this.auth.register(input.email, input.password);
  }

  @Post('login')
  @HttpCode(200)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: TokensDto })
  @ZodSerializerDto(TokensDto)
  login(@Body(new ZodValidationPipe(LoginDto)) input: LoginDto) {
    return this.auth.login(input.email, input.password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({ type: TokensDto })
  @ZodSerializerDto(TokensDto)
  refresh(@Body(new ZodValidationPipe(RefreshDto)) input: RefreshDto) {
    return this.auth.refresh(input.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBody({ type: RefreshDto })
  @ApiNoContentResponse()
  logout(@Body(new ZodValidationPipe(RefreshDto)) input: RefreshDto) {
    return this.auth.logout(input.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  @ZodSerializerDto(UserDto)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
