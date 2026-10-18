import { ConfigService } from '@nestjs/config';
import { hours, minutes, ThrottlerModuleOptions } from '@nestjs/throttler';
import { Env } from '../../config/env.schema';
import { normalizeEmail } from '../decorators/normalizeEmail.decorator';
import { RequestLike, resolveClientIp } from './clientIp';

// Two throttlers. `ip` counts requests per player IP and slows down one
// machine trying many passwords or creating accounts. `email` counts login
// attempts per account, whatever the IP, so a botnet cannot brute-force one
// player's password either.
export const LOGIN_LIMITS = {
  ip: { limit: 5, ttl: minutes(1) },
  email: { limit: 10, ttl: minutes(15) },
};

export const REGISTER_LIMITS = {
  ip: { limit: 3, ttl: hours(1) },
};

export function authThrottlerOptions(
  config: ConfigService<Env, true>,
): ThrottlerModuleOptions {
  const bffSecret = config.get('BFF_SECRET', { infer: true });

  return {
    // Counters live in memory: right for a single API instance. Several
    // instances need a shared store (Redis, once BullMQ adds it in v0.4).
    throttlers: [
      {
        name: 'ip',
        ...LOGIN_LIMITS.ip,
        getTracker: (req) => resolveClientIp(req as RequestLike, bffSecret),
      },
      {
        name: 'email',
        ...LOGIN_LIMITS.email,
        // Guards run before the ValidationPipe, so the body is still raw here:
        // normalize it the same way the DTO will. A body without a string
        // email gets a 400 from the pipe; until then it shares one bucket.
        getTracker: (req: { body?: { email?: unknown } }) => {
          const email = normalizeEmail(req.body?.email);
          return typeof email === 'string' ? email : '';
        },
      },
    ],
    // Only the standard Retry-After header, set by AuthThrottlerGuard.
    setHeaders: false,
  };
}
