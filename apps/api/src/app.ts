import 'reflect-metadata';
import { Module, RequestMethod } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc, ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { CONFIG, type AppConfig } from './config/environment';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ApiErrorFilter } from './common/http/error.filter';

@Module({ imports: [ConfigModule, DatabaseModule, AuthModule, ProjectsModule] })
class AppModule {}

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = app.get<AppConfig>(CONFIG);
  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableShutdownHooks();
  app.use(helmet());
  app.enableCors({
    origin: config.CORS_ORIGIN,
    credentials: false,
    exposedHeaders: ['x-request-id'],
  });
  app.use((request: Request & { requestId?: string }, response: Response, next: NextFunction) => {
    const supplied = request.headers['x-request-id'];
    request.requestId =
      typeof supplied === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(supplied)
        ? supplied
        : randomUUID();
    response.setHeader('x-request-id', request.requestId);
    const started = performance.now();
    response.on('finish', () =>
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'http_request',
          requestId: request.requestId,
          method: request.method,
          path: request.path,
          status: response.statusCode,
          durationMs: Math.round(performance.now() - started),
        }),
      ),
    );
    next();
  });
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new ApiErrorFilter());
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Starter API')
        .setDescription(
          'Versioned REST API. Use bearer access tokens; refresh tokens rotate after every use.',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .build(),
    ),
  );
  SwaggerModule.setup('api/v1/docs', app, document);
  return app;
}
