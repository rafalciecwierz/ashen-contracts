# Feature: Authentication (v0.1)

**Status:** done

## Goal

Players can register and log in. Every subsequent feature (character, energy, expeditions) is scoped to an authenticated player.

## Business rules

- Register with email + password (no social login for v0.1 — out of scope)
- Passwords hashed with bcrypt (never stored/logged in plain text)
- Login issues a JWT. The browser never sees it: the Next.js BFF stores it in an httpOnly cookie and sends it to the API as a Bearer token server-to-server (see "Session: BFF and httpOnly cookie" below)
- Token expiry: 7 days (JWT `expiresIn` and cookie `maxAge` match). No refresh flow in v0.1; after expiry the player logs in again
- One player account = one character for v0.1 (multiple characters per account is a future version, not now)

## Data

```
Player (table "players")
  id: uuid
  email: string, unique
  passwordHash: string
  createdAt: timestamp
```

## Endpoints (apps/api)

Every route requires a valid JWT by default (global `JwtAuthGuard`); public routes opt out with `@Public()`.

- `POST /auth/register` (public) — { email, password } → creates Player, returns `RegisterResponse` ({ id, email }). Does not log the player in: no token is issued.
- `POST /auth/login` (public) — { email, password } → validates, returns 200 with `LoginResponse` ({ accessToken })
- `GET /auth/me` — `Authorization: Bearer <token>` → returns `MeResponse` ({ id, email }) of the authenticated player

Error responses carry a stable `code` (`ApiErrorCode` in `@ashen-contracts/shared`) next to the human-readable `message`, so the frontend translates by code instead of parsing English text. Every error body has the shape `{ code, message, details? }` (`ApiErrorResponse`; see "Error responses" in `docs/ARCHITECTURE.md`). Request bodies are validated against `registerSchema` and `loginSchema` (Zod, `packages/shared/src/schemas/auth.schema.ts`) by the global `StandardSchemaValidationPipe` (an `APP_PIPE` provider in `AppModule`; `docs/DECISIONS.md` #022): 400 `VALIDATION_FAILED`, with one `details` entry per violated rule. It rejects fields the schema does not declare and passes the parsed, normalized body on.

## Edge cases to handle

- Duplicate email on register → 409, `EMAIL_ALREADY_REGISTERED`, also when two requests register the same email at once (the unique index rejects the second `create`, Prisma `P2002`)
- Wrong password or unknown email on login → 401, `INVALID_CREDENTIALS` (same response and the same response time for both, so it doesn't reveal whether the email exists: an unknown email is compared against a dummy bcrypt hash of the same cost)
- Missing, malformed or forged JWT on a protected route → 401, `UNAUTHORIZED`; an expired one → 401, `SESSION_EXPIRED`
- Valid JWT for an account that no longer exists → 401, `UNAUTHORIZED` on `GET /auth/me`
- Password shorter than 8 characters on register → 400, `VALIDATION_FAILED`, before hitting the database
- Missing `email` or `password`, an empty login password, or a field the schema does not declare → 400, `VALIDATION_FAILED`, on register and login
- Too many attempts → 429, `TOO_MANY_REQUESTS`, with a `Retry-After` header in seconds: login allows 5 per minute per player IP and 10 per 15 minutes per email, register 3 per hour per player IP. Behind the BFF the player IP comes from `X-Client-IP`, trusted only with the BFF secret (`docs/DECISIONS.md` #017); the form shows the error inline
- Email casing and surrounding whitespace → ignored: register and login trim and lowercase the email in the shared `emailSchema`, so `Test@X.com` and `test@x.com` are one account and the stored email is lowercase

## Frontend (apps/web)

### Session: BFF and httpOnly cookie

Resolved in `docs/DECISIONS.md` #005 (originally an open decision here, with `localStorage` as the v0.1 placeholder). The browser never makes HTTP requests to `apps/api` and never holds the token (the planned Socket.io connection is the one exception to the first part, see `docs/DECISIONS.md` #019):

- **Client actions** (form submits, logout) call same-origin Next.js route handlers under `src/app/api/auth/` (`InternalApiRoutes` in `src/http/client/internalApiRoutes.ts`):
  - `POST /api/auth/register` — proxies to `POST /auth/register` and passes the response and status through.
  - `POST /api/auth/login` — proxies to `POST /auth/login`; on success sets the token as the session cookie and returns `{ success: true }`, never the token.
  - Both go through `proxyToApi()` (`src/http/server/proxyToApi.ts`): the body is forwarded unparsed, so invalid JSON gets the API's 400 `BAD_REQUEST`, and an unreachable API or a response that isn't JSON becomes a 502 `INTERNAL_ERROR` with the cause in the server log.
  - `POST /api/auth/logout` — deletes the session cookie. POST, not GET, because it changes state. Stateless JWT: the token itself stays valid until it expires.
- **Reading the session on page load** happens in Server Components: `getCurrentUser()` (`src/http/server/getCurrentUser.ts`) reads the cookie and calls `GET /auth/me`. It returns `null` on a missing cookie or a 401, and throws on any other failure, so a backend outage doesn't look like a logout. It is wrapped in React `cache()`, so a layout and a page that both call it share one call per request.
- **Cookie** (`src/http/server/session.ts`): `ashen_contracts_session`, `httpOnly`, `sameSite=lax`, `path=/`, `maxAge` 7 days, `secure` in production.
- **Backend address:** `API_URL` (server-only env variable, `apps/web/.env.example`), read through `getServerEnv()` (`src/config/serverEnv.ts`), which checks on first use that it is a URL. There is no `NEXT_PUBLIC_` variant; backend paths live in `ApiEndpoints` (`src/http/server/apiEndpoints.ts`), which imports `server-only`, so a client component that imports it fails the build.

### Screens

- `/register` — email, password, confirm-password fields. On success: redirect to `/login?registered=true`, which greets the new player. (Character creation will change this target once it exists.) An already logged-in player is redirected to `/play`.
- `/login` — email, password fields. On success: redirect to the `?redirect=` target if it is a safe in-app path (`getSafeRedirect`), otherwise to `/play`. An already logged-in player is redirected away from the form.
- `/play` — protected: its layout calls `getCurrentUser()` and redirects to `/login?redirect=/play` without a session. The navbar's user menu has the logout action.

### States each screen must handle

- Loading (submit button disabled, label changes while the request is in flight)
- Field-level validation errors — the forms parse with the API's own schemas from `@ashen-contracts/shared` (register adds the confirmation field), so the user gets instant feedback, not just a failed round-trip, and the rules can't drift. Each route's `*.schema.ts` maps every field to its translation key. Register requires a valid email and a password of at least 8 characters, plus a matching confirmation; login only requires a valid email and a non-empty password, so the login form never reveals password rules
- Server error (409 duplicate email on register, 401 bad credentials on login) — translated from the error `code` and shown inline on the form, never a full-page crash
- Success — redirect fires (after login, the cookie is already set)

### Components (packages/ui)

`Button` and `Input` (label, text/password variants, error-message slot) for the forms; `Navbar` and `UserMenu` for the `/play` header.

### API calls

Client components call `InternalApiRoutes` through `apiPost` (`src/http/client/api.ts`), which turns error responses into an `ApiError` with `status` and `code`. Request/response types come from `@ashen-contracts/shared` (`RegisterResponse`, `LoginResponse`, `MeResponse`, `JwtPayload`, `ApiErrorCode`), not inline types.

## Tests to write

- Unit: password hashing/verification — done (`auth.service.spec.ts`)
- Unit: register/login/me service behavior, including duplicate email and wrong credentials — done (`auth.service.spec.ts`)
- Unit: an unknown email on login still runs bcrypt, and gets the same error as a wrong password — done (`auth.service.spec.ts`)
- Unit: JWT validation in `JwtAuthGuard` (`@Public()` bypass, missing or non-Bearer header, invalid, forged and expired tokens, `request.user` on success) — done (`jwtAuth.guard.spec.ts`)
- Integration: register → login → access a protected route end-to-end — not yet
- Integration: duplicate email is rejected — not yet
- Integration: a register/login body with a missing field or an unknown field returns 400 `VALIDATION_FAILED` with details — done (`test/auth.integration-spec.ts`)
- Integration: `GET /auth/me` returns `UNAUTHORIZED` without a token, with a malformed one and for a deleted account, and `SESSION_EXPIRED` with an expired one — done (`test/errorContract.integration-spec.ts`)
- Integration: each rate limit returns 429, a forged `X-Client-IP` doesn't bypass it, and players behind the BFF are counted separately — done (`test/authThrottling.integration-spec.ts`)
- Integration: emails that differ only in case or whitespace resolve to the same account — done (`test/emailNormalization.integration-spec.ts`, with an in-memory `PrismaService`)
- Frontend: invalid input blocks submit with the correct inline error — not yet (WEB-10)
- Frontend: successful register/login redirects, and login sets the session cookie — not yet (WEB-10, WEB-11)
- Frontend: a server error (409/401) renders inline without crashing the page — not yet (WEB-10)

## Deviations from spec

Where the implementation differs from the spec as first written (see `git log -- docs/features/01-auth.md`):

- **Token storage:** the spec planned `localStorage`, with the client sending the JWT as a Bearer token to `NEXT_PUBLIC_API_URL`. Built instead as a BFF with an httpOnly cookie and a server-only `API_URL` (`docs/DECISIONS.md` #005), so the browser never holds the token or knows the API's address.
- **Register does not log in:** the spec had `POST /auth/register` return a JWT. It returns `{ id, email }`, and the player logs in once after registering (`/login?registered=true`).
- **Redirect target:** the spec redirected to `/` until character creation exists. Login redirects to a safe `?redirect=` target or `/play`, the first protected route.
- **Known gaps:** the tests marked "not yet" above are still missing (WEB-10, WEB-11).
