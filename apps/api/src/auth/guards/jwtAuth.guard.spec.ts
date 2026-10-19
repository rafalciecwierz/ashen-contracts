import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@ashen-contracts/shared';
import { Public } from '../decorators';
import { JwtAuthGuard } from './jwtAuth.guard';

const SECRET = 'unit-test-jwt-secret';
const payload: JwtPayload = { sub: 'player-1', email: 'player@example.com' };

// Real classes, so the Reflector reads the metadata the real @Public() sets.
class ProtectedController {
  handler() {}
  @Public()
  publicHandler() {}
}

@Public()
class PublicController {
  handler() {}
}

type FakeRequest = {
  headers: { authorization?: string };
  user?: JwtPayload;
};

function contextFor(
  request: FakeRequest,
  controller: new () => object = ProtectedController,
  handler = 'handler',
): ExecutionContext {
  return {
    getHandler: () =>
      (controller.prototype as Record<string, () => void>)[handler],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// The guard throws { code, message } inside an UnauthorizedException.
async function rejectionOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => {
      throw new Error('expected the guard to reject');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(UnauthorizedException);
  return (error as UnauthorizedException).getResponse();
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: SECRET });
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(jwt, new Reflector());
  });

  const bearer = (token: string): FakeRequest => ({
    headers: { authorization: `Bearer ${token}` },
  });

  describe('@Public()', () => {
    it.each([
      ['on the handler', ProtectedController, 'publicHandler'],
      ['on the controller', PublicController, 'handler'],
    ])(
      'lets a request through without a token when set %s',
      async (_, controller, handler) => {
        const verify = vi.spyOn(jwt, 'verifyAsync');

        await expect(
          guard.canActivate(contextFor({ headers: {} }, controller, handler)),
        ).resolves.toBe(true);
        expect(verify).not.toHaveBeenCalled();
      },
    );

    it('does not check a token that is sent anyway', async () => {
      await expect(
        guard.canActivate(
          contextFor(bearer('not-a-jwt'), ProtectedController, 'publicHandler'),
        ),
      ).resolves.toBe(true);
    });
  });

  it('rejects a request without an Authorization header', async () => {
    const response = await rejectionOf(
      guard.canActivate(contextFor({ headers: {} })),
    );

    expect(response).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Missing token',
    });
  });

  it.each([
    ['another scheme', 'Basic dXNlcjpwYXNz'],
    ['a scheme with no token', 'Bearer'],
    ['a token with no scheme', 'eyJhbGciOiJIUzI1NiJ9.e30.sig'],
    ['an empty header', ''],
  ])('treats %s as a missing token', async (_, authorization) => {
    const response = await rejectionOf(
      guard.canActivate(contextFor({ headers: { authorization } })),
    );

    expect(response).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Missing token',
    });
  });

  it('rejects a token that is not a JWT', async () => {
    const response = await rejectionOf(
      guard.canActivate(contextFor(bearer('not-a-jwt'))),
    );

    expect(response).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Invalid token',
    });
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await new JwtService({
      secret: 'attacker-secret',
    }).signAsync(payload);

    const response = await rejectionOf(
      guard.canActivate(contextFor(bearer(forged))),
    );

    expect(response).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Invalid token',
    });
  });

  it('rejects an expired token with SESSION_EXPIRED', async () => {
    const expired = await jwt.signAsync(payload, { expiresIn: -60 });

    const response = await rejectionOf(
      guard.canActivate(contextFor(bearer(expired))),
    );

    expect(response).toEqual({
      code: 'SESSION_EXPIRED',
      message: 'Token expired',
    });
  });

  it('accepts a valid token and puts its payload on request.user', async () => {
    const request = bearer(await jwt.signAsync(payload, { expiresIn: 60 }));

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toMatchObject(payload);
  });
});
