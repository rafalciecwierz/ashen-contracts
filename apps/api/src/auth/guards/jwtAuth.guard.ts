import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthErrorCode, JwtPayload } from '@ashen-contracts/shared';
import { IS_PUBLIC_KEY } from './public.decorator';

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
      const code: AuthErrorCode = 'INVALID_CREDENTIALS';
      throw new UnauthorizedException({ code, message: 'Missing token' });
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      // Attach the decoded payload to the request so route handlers can read
      // "who is making this request" later (e.g. @CurrentUser() decorator,
      // to be added when the first protected endpoint actually needs it).
      (request as Request & { user: JwtPayload }).user = payload;
    } catch {
      const code: AuthErrorCode = 'INVALID_CREDENTIALS';
      throw new UnauthorizedException({
        code,
        message: 'Invalid or expired token',
      });
    }

    return true;
  }
}

function extractTokenFromHeader(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}
