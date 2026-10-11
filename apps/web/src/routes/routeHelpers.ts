/**
 * Builds a path with query params, e.g. buildPath(AppPaths.login, { registered: 'true' })
 * → '/login?registered=true'. Centralizes query-string construction so call
 * sites never concatenate "?x=y" by hand.
 */
export function buildPath(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return path;
  return `${path}?${new URLSearchParams(params).toString()}`;
}

/**
 * Validates a user-supplied post-login redirect target (?redirect=...).
 * Accepts only in-app paths: they must start with "/", but not "//" or "/\"
 * (browsers treat both as a protocol-relative URL, i.e. another site).
 * Returns null for anything else so callers can fall back to a default.
 */
export function getSafeRedirect(target: string | null | undefined): string | null {
  if (!target) return null;
  const isInAppPath = target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\');
  return isInAppPath ? target : null;
}