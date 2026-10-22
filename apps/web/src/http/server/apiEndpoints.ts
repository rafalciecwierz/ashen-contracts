import 'server-only';

/**
 * Paths on the REAL backend (apps/api, NestJS), called only from Route
 * Handlers (src/app/api/**) and Server Components. `server-only` makes
 * importing this from a 'use client' component a build error; the browser
 * calls InternalApiRoutes instead.
 *
 * Nested by backend module (auth now, character/location/quest later),
 * mirroring apps/api's own module structure.
 */
export const ApiEndpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    register: '/auth/register',
  },
} as const;
