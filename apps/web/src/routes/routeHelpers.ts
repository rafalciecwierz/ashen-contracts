/**
 * Builds a path with query params, e.g. buildPath(AppPaths.login, { registered: 'true' })
 * → '/login?registered=true'. Centralizes query-string construction so call
 * sites never concatenate "?x=y" by hand.
 */
export function buildPath(
  path: string,
  params?: Record<string, string>,
): string {
  if (!params || Object.keys(params).length === 0) return path;
  return `${path}?${new URLSearchParams(params).toString()}`;
}

// Only a base for parsing, never requested: `.invalid` is a reserved TLD
// (RFC 6761). It must use a special scheme (http) so "\" parses as "/", as
// it does in a browser. getSafeRedirect only checks a target stays on it.
const REDIRECT_BASE = 'http://app.invalid';

/**
 * Validates a user-supplied post-login redirect target (?redirect=...).
 * Accepts only in-app paths: it must start with "/" and still resolve to this
 * origin when parsed the way a browser parses it. A string check alone isn't
 * enough: "//evil.com" and "/\evil.com" are protocol-relative URLs, and a
 * browser strips tabs and newlines, so "/\t/evil.com" becomes "//evil.com".
 * Returns the parsed path (control characters gone), or null for anything
 * else so callers can fall back to a default.
 */
export function getSafeRedirect(
  target: string | null | undefined,
): string | null {
  if (!target?.startsWith('/')) return null;
  let url: URL;
  try {
    url = new URL(target, REDIRECT_BASE);
  } catch {
    return null;
  }
  if (url.origin !== REDIRECT_BASE) return null;
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.startsWith('//') ? null : path;
}
