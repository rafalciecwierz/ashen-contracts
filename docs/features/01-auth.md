# Feature: Authentication (v0.1)

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
- `POST /auth/login` (public) — { email, password } → validates, returns `LoginResponse` ({ accessToken })
- `GET /auth/me` — `Authorization: Bearer <token>` → returns `MeResponse` ({ id, email }) of the authenticated player

Error responses carry a stable `code` (`AuthErrorCode` in `@ashen-contracts/shared`) next to the human-readable `message`, so the frontend translates by code instead of parsing English text. Validation errors come from the global `ValidationPipe` (`message` is an array, no `code` yet; see API-08 in `docs/REFACTOR.md`).

## Edge cases to handle

- Duplicate email on register → 409, `EMAIL_ALREADY_REGISTERED`
- Wrong password or unknown email on login → 401, `INVALID_CREDENTIALS` (same response for both, so it doesn't reveal whether the email exists; response timing still differs, see API-07)
- Missing/expired/invalid JWT on a protected route → 401, `INVALID_CREDENTIALS`
- Valid JWT for an account that no longer exists → 401 on `GET /auth/me`
- Password shorter than 8 characters on register → 400 validation error before hitting the database

## Frontend (apps/web)

### Session: BFF and httpOnly cookie

Resolved in `docs/DECISIONS.md` #005 (originally an open decision here, with `localStorage` as the v0.1 placeholder). The browser never calls `apps/api` and never holds the token:

- **Client actions** (form submits, logout) call same-origin Next.js route handlers under `app/api/auth/` (`InternalApiRoutes` in `src/http/endpoints.ts`):
  - `POST /api/auth/register` — proxies to `POST /auth/register` and passes the response and status through.
  - `POST /api/auth/login` — proxies to `POST /auth/login`; on success sets the token as the session cookie and returns `{ success: true }`, never the token.
  - `POST /api/auth/logout` — deletes the session cookie. POST, not GET, because it changes state. Stateless JWT: the token itself stays valid until it expires.
- **Reading the session on page load** happens in Server Components: `getCurrentUser()` (`src/http/getCurrentUser.ts`) reads the cookie and calls `GET /auth/me`. It returns `null` on a missing cookie or a 401, and throws on any other failure, so a backend outage doesn't look like a logout.
- **Cookie** (`src/http/session.ts`): `ashen_contracts_session`, `httpOnly`, `sameSite=lax`, `path=/`, `maxAge` 7 days, `secure` in production.
- **Backend address:** `API_URL` (server-only env variable, `apps/web/.env.example`). There is no `NEXT_PUBLIC_` variant; backend paths live in `ApiEndpoints` and are only used server-side.

### Screens

- `/register` — email, password, confirm-password fields. On success: redirect to `/login?registered=true`, which greets the new player. (Character creation will change this target once it exists.)
- `/login` — email, password fields. On success: redirect to the `?redirect=` target if it is a safe in-app path (`getSafeRedirect`), otherwise to `/play`. An already logged-in player is redirected away from the form.
- `/play` — protected: its layout calls `getCurrentUser()` and redirects to `/login?redirect=/play` without a session. The navbar's user menu has the logout action.

### States each screen must handle

- Loading (submit button disabled, label changes while the request is in flight)
- Field-level validation errors (Zod schemas next to each route) — mirror the backend's `class-validator` rules so the user gets instant feedback, not just a failed round-trip. Register requires a valid email and a password of at least 8 characters, plus a matching confirmation; login only requires a valid email and a non-empty password, so the login form never reveals password rules
- Server error (409 duplicate email on register, 401 bad credentials on login) — translated from the error `code` and shown inline on the form, never a full-page crash
- Success — redirect fires (after login, the cookie is already set)

### Components (packages/ui)

`Button` and `Input` (label, text/password variants, error-message slot) for the forms; `Navbar` and `UserMenu` for the `/play` header.

### API calls

Client components call `InternalApiRoutes` through `apiPost` (`src/http/api.ts`), which turns error responses into an `ApiError` with `status` and `code`. Request/response types come from `@ashen-contracts/shared` (`RegisterResponse`, `LoginResponse`, `MeResponse`, `JwtPayload`, `AuthErrorCode`), not inline types.

## Tests to write

- Unit: password hashing/verification — done (`auth.service.spec.ts`)
- Unit: register/login/me service behavior, including duplicate email and wrong credentials — done (`auth.service.spec.ts`)
- Unit: JWT validation in `JwtAuthGuard` — not yet (API-11)
- Integration: register → login → access a protected route end-to-end — not yet
- Integration: duplicate email is rejected — not yet
- Frontend: invalid input blocks submit with the correct inline error — not yet (WEB-10)
- Frontend: successful register/login redirects, and login sets the session cookie — not yet (WEB-10, WEB-11)
- Frontend: a server error (409/401) renders inline without crashing the page — not yet (WEB-10)
