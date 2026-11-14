import 'server-only';
import type { MeResponse } from '@ashen-contracts/shared';
import { cache } from 'react';
import { getServerEnv } from '@/config/serverEnv';
import { ApiEndpoints } from './apiEndpoints';
import { API_TIMEOUT_MS } from './apiTimeout';
import { getSessionToken } from './session';

/**
 * Reads the httpOnly cookie via next/headers. Returns the current user, or
 * null when there is no valid session: no cookie, or the backend rejected the
 * token (expired, forged, account deleted).
 *
 * Any other backend failure (5xx, network, timeout) is thrown rather than
 * reported as "logged out" — a backend outage must not look like a mass
 * logout.
 *
 * Wrapped in React `cache()`, so a layout and a page that both ask for the
 * user in one request share a single call. Next.js would memoize the `fetch`
 * itself, but its timeout signal opts it out.
 */
export const getCurrentUser = cache(async (): Promise<MeResponse | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const res = await fetch(`${getServerEnv().API_URL}${ApiEndpoints.auth.me}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to load current user (${res.status})`);

  return res.json();
});
