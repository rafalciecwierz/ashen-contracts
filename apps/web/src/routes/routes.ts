export const AppPaths = {
  home: '/',
  login: '/login',
  play: '/play',
  register: '/register',
} as const;

/**
 * Builds a path with query params, e.g. buildPath(AppPaths.login, { registered: 'true' })
 * → '/login?registered=true'. Centralizes query-string construction so call
 * sites never concatenate "?x=y" by hand.
 */
export function buildPath(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return path;
  return `${path}?${new URLSearchParams(params).toString()}`;
}