/**
 * Response shape for `POST /auth/register`.
 * @see docs/features/01-auth.md
 */
export interface RegisterResponse {
  /** UUID of the newly created player. */
  id: string;
  /** The email the player registered with. */
  email: string;
}

/**
 * Response shape for `POST /auth/login`.
 * @see docs/features/01-auth.md
 */
export interface LoginResponse {
  /** JWT to send as `Authorization: Bearer <accessToken>` on subsequent requests. */
  accessToken: string;
}

/**
 * Shape of the decoded JWT payload — what's inside the token once verified.
 * Not returned by any endpoint directly; used internally (e.g. in a Guard) to type `req.user`.
 * @see docs/features/01-auth.md
 */
export interface JwtPayload {
  /** Player id (JWT standard claim name: "subject"). */
  sub: string;
  email: string;
}

/**
 * Response shape for `GET /auth/me` — who the current session belongs to.
 * Account identity only; game data (character name, energy, ...) comes from
 * the character endpoints, not from here.
 * Requires a valid JWT (the route is not `@Public()`).
 * @see docs/features/01-auth.md
 */
export interface MeResponse {
  /** UUID of the authenticated player. */
  id: string;
  /** The email the player registered with. */
  email: string;
}