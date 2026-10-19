import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import type { ApiErrorCode } from '@ashen-contracts/shared';

/**
 * ThrottlerGuard with the API's error contract: a 429 carries a `code` like
 * every other auth error, and the standard `Retry-After` header (in seconds)
 * instead of the library's per-throttler `Retry-After-<name>`.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    context: ExecutionContext,
    { timeToBlockExpire }: ThrottlerLimitDetail,
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);
    this.setResponseHeader(res, 'Retry-After', timeToBlockExpire);

    const code: ApiErrorCode = 'TOO_MANY_REQUESTS';
    throw new HttpException(
      { code, message: 'Too many attempts. Try again later.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
