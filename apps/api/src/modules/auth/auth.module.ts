import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CONFIG, type AppConfig } from '../../config/environment';
import { AuthService } from './application/auth.service';
import { AUTH_REPOSITORY, type AuthRepository } from './domain/auth.repository';
import { PostgresAuthRepository } from './infrastructure/auth.repository';
import { hashPassword, verifyPassword } from './infrastructure/password';
import { AuthController } from './presentation/auth.controller';
import { AuthGuard } from './presentation/auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.JWT_SECRET,
        signOptions: {
          algorithm: 'HS256',
          issuer: 'starter-api',
          audience: 'starter-clients',
          expiresIn: config.ACCESS_TOKEN_TTL_SECONDS,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthGuard,
    { provide: AUTH_REPOSITORY, useClass: PostgresAuthRepository },
    {
      provide: AuthService,
      inject: [AUTH_REPOSITORY, JwtService, CONFIG],
      useFactory: (repository: AuthRepository, jwt: JwtService, config: AppConfig) =>
        new AuthService(
          repository,
          { sign: (userId, sessionId) => jwt.signAsync({ sub: userId, sid: sessionId }) },
          { hash: hashPassword, verify: verifyPassword },
          config.REFRESH_TOKEN_TTL_SECONDS,
        ),
    },
  ],
  exports: [AuthGuard, JwtModule, AUTH_REPOSITORY],
})
export class AuthModule {}
