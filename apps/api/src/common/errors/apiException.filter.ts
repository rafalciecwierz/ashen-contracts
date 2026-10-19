import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type {
  ApiErrorCode,
  ApiErrorResponse,
  ValidationErrorDetail,
} from '@ashen-contracts/shared';

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

/**
 * Turns every error into `{ code, message, details? }` (ApiErrorResponse), so
 * the client can always branch on `code`.
 *
 * - An HttpException thrown with a `code` (e.g. `{ code, message }`) keeps it.
 * - One without a code (Nest's own 404 for an unknown route, a bare
 *   `new BadRequestException()`) gets a generic code from its status.
 * - A 5xx HttpException keeps its code, but not its message or details: they
 *   are free text, often built from the error that caused it
 *   (`new InternalServerErrorException(err.message)`).
 * - An "http-errors" error, which is what Express middleware such as the JSON
 *   body parser throws, keeps its status, and its message only when the error
 *   marks it as safe to show (`expose`).
 * - Anything else is an unexpected 500.
 *
 * Every 5xx is logged with its stack and answered with a fixed message, so
 * internals (Prisma errors, SQL, file paths) never reach the client.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const response: unknown = host.switchToHttp().getResponse();
    const { status, body } = this.toErrorResponse(exception);

    if (status >= 500) {
      this.logger.error(exception);
    }

    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }
    httpAdapter.reply(response, body, status);
  }

  private toErrorResponse(exception: unknown): {
    status: number;
    body: ApiErrorResponse;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { status, body: fromHttpException(exception, status) };
    }

    if (isHttpError(exception)) {
      const status = exception.status;
      const message =
        exception.expose && status < 500
          ? exception.message
          : INTERNAL_ERROR_MESSAGE;
      return { status, body: { code: codeForStatus(status), message } };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE },
    };
  }
}

function fromHttpException(
  exception: HttpException,
  status: number,
): ApiErrorResponse {
  const response = exception.getResponse();
  // `new XException('text')` gives `{ statusCode, message: 'text', error }`;
  // `new XException({ code, message })` gives that object as is.
  const fields: Record<string, unknown> =
    typeof response === 'object' && response !== null
      ? (response as Record<string, unknown>)
      : { message: response };

  const code =
    typeof fields.code === 'string'
      ? (fields.code as ApiErrorCode)
      : codeForStatus(status);
  // The code is a literal from a closed union, so it can't carry data; the
  // message and details can.
  if (status >= 500) {
    return { code, message: INTERNAL_ERROR_MESSAGE };
  }
  const message =
    typeof fields.message === 'string' ? fields.message : exception.message;
  const details = Array.isArray(fields.details)
    ? (fields.details as ValidationErrorDetail[])
    : undefined;

  return details ? { code, message, details } : { code, message };
}

// The code for an error thrown without one. Only statuses the API produces
// get their own code; the client still has the exact HTTP status.
function codeForStatus(status: number): ApiErrorCode {
  if (status >= 500) return 'INTERNAL_ERROR';
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'BAD_REQUEST';
  }
}

interface HttpError extends Error {
  status: number;
  expose: boolean;
}

// The signature of the "http-errors" library, used by body-parser and Express.
function isHttpError(error: unknown): error is HttpError {
  return (
    error instanceof Error &&
    typeof (error as Partial<HttpError>).expose === 'boolean' &&
    Number.isInteger((error as Partial<HttpError>).status) &&
    (error as HttpError).status >= 400 &&
    (error as HttpError).status < 600
  );
}
