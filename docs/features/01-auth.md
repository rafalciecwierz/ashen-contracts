# Feature: Authentication (v0.1)

## Goal
Players can register and log in. Every subsequent feature (character, energy, expeditions) is scoped to an authenticated player.

## Business rules
- Register with email + password (no social login for v0.1 — out of scope)
- Passwords hashed with bcrypt (never stored/logged in plain text)
- Login issues a JWT; the client sends it as a Bearer token on every subsequent request
- Token expiry: [decide — suggest 7 days for a solo portfolio project, refresh flow is out of scope for v0.1]
- One player account = one character for v0.1 (multiple characters per account is a future version, not now)

## Data (sketch)
```
Player
  id: uuid
  email: string, unique
  passwordHash: string
  createdAt: timestamp
```

## Endpoints (sketch)
- `POST /auth/register` — { email, password } → creates Player, returns JWT
- `POST /auth/login` — { email, password } → validates, returns JWT
- `GET /auth/me` — returns the authenticated player's basic info (requires valid JWT)

## Edge cases to handle
- Duplicate email on register → 409, clear error message
- Wrong password on login → 401, generic error (don't reveal whether the email exists — basic security hygiene)
- Missing/expired/invalid JWT on a protected route → 401
- Password too short/weak → validation error before hitting the database

## Frontend (apps/web)

### Screens
- `/register` — email, password, confirm-password fields. On success: store the token and redirect (to `/` until character creation exists, then to the creation flow).
- `/login` — email, password fields. On success: store the token and redirect the same way.

### Token storage — open decision, flagged not silently chosen
For v0.1, store the JWT in `localStorage` — simplest to implement on a solo timeline. Trade-off: readable by any injected script (XSS risk), vs. an httpOnly cookie which is safer but requires the backend to set the cookie directly (CORS `credentials`, cookie flags) instead of just returning JSON. Acceptable for now; revisit as a `docs/DECISIONS.md` entry before a public deploy, not silently carried forward as "how it's always been."

### States each screen must handle
- Loading (submit button disabled/spinner while the request is in flight)
- Field-level validation errors (email format, password too short) — mirror the backend's `class-validator` rules so the user gets instant feedback, not just a failed round-trip
- Server error (409 duplicate email on register, 401 bad credentials on login) — shown inline on the form, never a full-page crash
- Success — token stored, redirect fires

### Components needed (packages/ui)
Reuses `Button` (already built). Needs a new `Input` component (text + password variant, with an error-message slot) — first non-dummy addition to `packages/ui` after Button.

### API calls
Call the API at `NEXT_PUBLIC_API_URL` (see `docs/ARCHITECTURE.md`); type the request/response with `RegisterResponse`/`LoginResponse` from `@ashen-contracts/shared` rather than inline types.

## Tests to write
- Unit: password hashing/verification
- Unit: JWT generation and validation
- Integration: register → login → access a protected route end-to-end
- Integration: duplicate email is rejected
- Frontend: invalid input blocks submit with the correct inline error
- Frontend: successful register/login stores the token and redirects
- Frontend: a server error (409/401) renders inline without crashing the page