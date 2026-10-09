/**
 * Paths on the REAL backend (apps/api, NestJS). Server-only — these are
 * called exclusively from inside Next.js Route Handlers (src/app/api/**),
 * never directly from a 'use client' component. The browser never sees
 * these; it calls InternalApiRoutes instead.
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

/**
 * Routes on OUR OWN Next.js server (Route Handlers under src/app/api/) that
 * the BROWSER calls. Same origin, no CORS, no base URL needed.
 *
 * NOT the real backend's paths — those are called ApiEndpoints.
 */
export const InternalApiRoutes = {
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
  },
} as const;