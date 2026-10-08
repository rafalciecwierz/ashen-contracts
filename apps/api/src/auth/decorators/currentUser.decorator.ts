import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '@ashen-contracts/shared';

/**
 * Injects the decoded JWT payload of the current request into a controller
 * parameter. Only meaningful on routes that went through JwtAuthGuard (i.e.
 * anything not marked @Public()) — the guard is what sets `request.user`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
