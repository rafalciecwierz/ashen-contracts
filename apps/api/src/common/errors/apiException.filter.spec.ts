import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiExceptionFilter } from './apiException.filter';

describe('ApiExceptionFilter', () => {
  const response = { marker: 'response' };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  let httpAdapter: {
    reply: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    isHeadersSent: ReturnType<typeof vi.fn>;
  };
  let filter: ApiExceptionFilter;
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    httpAdapter = {
      reply: vi.fn(),
      end: vi.fn(),
      isHeadersSent: vi.fn().mockReturnValue(false),
    };
    filter = new ApiExceptionFilter({
      httpAdapter,
    } as unknown as HttpAdapterHost);
    logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  const replyFor = (exception: unknown) => {
    filter.catch(exception, host);
    expect(httpAdapter.reply).toHaveBeenCalledOnce();
    const [res, body, status] = httpAdapter.reply.mock.calls[0] as [
      unknown,
      unknown,
      number,
    ];
    expect(res).toBe(response);
    return { body, status };
  };

  it('keeps the code and message of an HttpException thrown with a code', () => {
    const { body, status } = replyFor(
      new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email already registered',
      }),
    );

    expect(status).toBe(409);
    expect(body).toEqual({
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'Email already registered',
    });
  });

  it('keeps validation details', () => {
    const details = [
      {
        field: 'email',
        constraint: 'isEmail',
        message: 'email must be an email',
      },
    ];
    const { body } = replyFor(
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details,
      }),
    );

    expect(body).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details,
    });
  });

  it.each([
    [new BadRequestException('Bad input'), 400, 'BAD_REQUEST', 'Bad input'],
    [new UnauthorizedException(), 401, 'UNAUTHORIZED', 'Unauthorized'],
    [
      new NotFoundException('Cannot GET /nope'),
      404,
      'NOT_FOUND',
      'Cannot GET /nope',
    ],
  ])(
    'gives an HttpException without a code one from its status (%s)',
    (exception, expectedStatus, code, message) => {
      const { body, status } = replyFor(exception);

      expect(status).toBe(expectedStatus);
      // Only code and message: Nest's statusCode and error fields are dropped.
      expect(body).toEqual({ code, message });
    },
  );

  it('hides the message and details of a 5xx HttpException', () => {
    const { body, status } = replyFor(
      new InternalServerErrorException(
        'connect ECONNREFUSED 10.0.0.5:5432 (user "ashen")',
      ),
    );

    expect(status).toBe(500);
    expect(body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
    expect(logError).toHaveBeenCalledOnce();
  });

  it('keeps the code of a 5xx HttpException thrown with one, but not its message', () => {
    const { body, status } = replyFor(
      new ServiceUnavailableException({
        code: 'INTERNAL_ERROR',
        message: 'Invalid `prisma.player.findUnique()` invocation',
        details: [{ field: 'db', constraint: 'up', message: 'down' }],
      }),
    );

    expect(status).toBe(503);
    expect(body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  it('keeps the status and exposed message of an http-errors error (body parser)', () => {
    const error = Object.assign(new SyntaxError('Unexpected token } in JSON'), {
      status: 400,
      statusCode: 400,
      expose: true,
    });

    const { body, status } = replyFor(error);

    expect(status).toBe(400);
    expect(body).toEqual({
      code: 'BAD_REQUEST',
      message: 'Unexpected token } in JSON',
    });
  });

  it('hides the message of an http-errors error that is not exposed', () => {
    const error = Object.assign(new Error('socket details'), {
      status: 500,
      expose: false,
    });

    const { body, status } = replyFor(error);

    expect(status).toBe(500);
    expect(body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  it('answers an unexpected error with a 500 that leaks nothing, and logs it', () => {
    const error = new Error('relation "Player" does not exist');

    const { body, status } = replyFor(error);

    expect(status).toBe(500);
    expect(body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
    expect(logError).toHaveBeenCalledWith(error);
  });

  it('does not log client errors', () => {
    replyFor(new NotFoundException());

    expect(logError).not.toHaveBeenCalled();
  });

  it('ends the response instead of replying when headers were already sent', () => {
    httpAdapter.isHeadersSent.mockReturnValue(true);

    filter.catch(new Error('late failure'), host);

    expect(httpAdapter.reply).not.toHaveBeenCalled();
    expect(httpAdapter.end).toHaveBeenCalledWith(response);
  });
});
