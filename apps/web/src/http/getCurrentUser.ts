import type { MeResponse } from '@ashen-contracts/shared';
import { ApiEndpoints } from './endpoints';
import { getSessionToken } from './session';

const API_URL = process.env.API_URL;

/**
 * Server-only (reads the httpOnly cookie via next/headers). Returns the
 * current user, or null when there is no valid session: no cookie, or the
 * backend rejected the token (expired, forged, account deleted).
 *
 * Any other backend failure (5xx, network) is thrown rather than reported as
 * "logged out" — a backend outage must not look like a mass logout.
 */
export async function getCurrentUser(): Promise<MeResponse | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}${ApiEndpoints.auth.me}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to load current user (${res.status})`);

  return res.json();
}