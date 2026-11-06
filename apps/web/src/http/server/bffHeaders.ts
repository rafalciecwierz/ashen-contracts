import 'server-only';
import { headers } from 'next/headers';

/**
 * Headers for a Server Action's request to the API. The API sees every request
 * as coming from this server, so the action forwards the player's IP for rate
 * limiting, and the shared secret that makes the API trust it
 * (docs/DECISIONS.md #017). BFF_SECRET has no NEXT_PUBLIC_ prefix, so Next.js
 * never puts it in the browser bundle.
 */
export async function bffHeaders(): Promise<Record<string, string>> {
  const secret = process.env.BFF_SECRET;
  if (!secret) {
    throw new Error('BFF_SECRET is not set (see apps/web/.env.example)');
  }

  const result: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-BFF-Secret': secret,
  };

  // Vercel sets X-Forwarded-For itself and overwrites any value the client
  // sent, so its first entry is the player's IP. Without it (e.g. `next dev`),
  // the API falls back to the address of this server.
  const clientIp = (await headers())
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  if (clientIp) {
    result['X-Client-IP'] = clientIp;
  }

  return result;
}
