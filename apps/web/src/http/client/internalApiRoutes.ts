/**
 * Routes on OUR OWN Next.js server (Route Handlers under src/app/api/) that
 * the BROWSER calls. Same origin, no CORS, no base URL needed.
 *
 * NOT the real backend's paths — those are ApiEndpoints (server-only).
 */
export const InternalApiRoutes = {
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
  },
} as const;
