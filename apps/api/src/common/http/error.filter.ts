import { ArgumentsHost, Catch, HttpException, type ExceptionFilter } from '@nestjs/common';
import { DomainError } from '@starter/core';
import { ZodValidationException } from 'nestjs-zod';
import type { Response } from 'express';
import type { ZodError } from 'zod';
import type { AuthenticatedRequest } from '../../modules/auth/presentation/auth.guard';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<AuthenticatedRequest>();
    const response = context.getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let details: unknown;
    if (exception instanceof ZodValidationException) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'Request validation failed.';
      details = (exception.getZodError() as ZodError).issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
    } else if (exception instanceof DomainError) {
      status =
        (
          { NOT_FOUND: 404, UNAUTHORIZED: 401, CONFLICT: 409, VALIDATION_ERROR: 400 } as Record<
            string,
            number
          >
        )[exception.code] ?? 400;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code =
        (
          {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            429: 'RATE_LIMITED',
            503: 'UNAVAILABLE',
          } as Record<number, string>
        )[status] ?? 'HTTP_ERROR';
      message =
        (
          {
            400: 'Invalid request.',
            401: 'Authentication required or credentials invalid.',
            403: 'Access denied.',
            404: 'Resource not found.',
            409: 'The resource already exists.',
            429: 'Too many requests.',
            503: 'Service temporarily unavailable.',
          } as Record<number, string>
        )[status] ?? 'Request failed.';
    }
    if (status >= 500)
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'request_failed',
          requestId: request.requestId,
          status,
        }),
      );
    response
      .status(status)
      .json({ code, message, requestId: request.requestId, ...(details ? { details } : {}) });
  }
}
