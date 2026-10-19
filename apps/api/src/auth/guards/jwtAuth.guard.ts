import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import type { ApiErrorCode, JwtPayload } from '@ashen-contracts/shared';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractTokenFromHeader(request);

    if (!token) {
      const code: ApiErrorCode = 'UNAUTHORIZED';
      throw new UnauthorizedException({ code, message: 'Missing token' });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      // Attach the decoded payload to the request so route handlers can read
      // who is making it (the @CurrentUser() decorator).
      (request as Request & { user: JwtPayload }).user = payload;
    } catch (error) {
      // An expired session is told apart so the client can say "log in again"
      // instead of a generic error; a forged or malformed token is not.
      if (error instanceof TokenExpiredError) {
        const code: ApiErrorCode = 'SESSION_EXPIRED';
        throw new UnauthorizedException({ code, message: 'Token expired' });
      }
      const code: ApiErrorCode = 'UNAUTHORIZED';
      throw new UnauthorizedException({ code, message: 'Invalid token' });
    }

    return true;
  }
}

function extractTokenFromHeader(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}
