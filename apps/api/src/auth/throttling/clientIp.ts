import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { normalizeIp } from '@nestjs/throttler';

export const BFF_SECRET_HEADER = 'x-bff-secret';
export const CLIENT_IP_HEADER = 'x-client-ip';

export type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

function headerValue(req: RequestLike, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

// Hashing first gives both buffers the same length, which timingSafeEqual
// requires, so the comparison leaks neither the secret nor its length.
function secretMatches(received: string, expected: string): boolean {
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(received), digest(expected));
}

/**
 * The IP address to rate limit a request by. Browsers never call the API:
 * every request comes from the Next.js BFF, so `req.ip` is the BFF's address.
 * The BFF forwards the player's IP in `X-Client-IP`, and the API trusts that
 * header only when the request also carries the shared `X-BFF-Secret`. Anyone
 * calling the API directly is limited by their own `req.ip`, so a made-up
 * `X-Client-IP` changes nothing. See docs/DECISIONS.md #017.
 *
 * IPv6 addresses are grouped by their /64 subnet (the throttler's default),
 * because one client usually controls a whole /64.
 */
export function resolveClientIp(req: RequestLike, bffSecret: string): string {
  const secret = headerValue(req, BFF_SECRET_HEADER);
  const clientIp = headerValue(req, CLIENT_IP_HEADER);

  const ip =
    secret !== undefined &&
    secretMatches(secret, bffSecret) &&
    clientIp !== undefined &&
    isIP(clientIp) !== 0
      ? clientIp
      : (req.ip ?? 'unknown');

  return normalizeIp(ip);
}
