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

## Tests to write
- Unit: password hashing/verification
- Unit: JWT generation and validation
- Integration: register → login → access a protected route end-to-end
- Integration: duplicate email is rejected