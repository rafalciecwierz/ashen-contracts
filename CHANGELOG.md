# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions correspond to git tags (`v0.1.0`, `v0.2.0`, ...).

Each entry should be short — a git-log summary, not a design doc. Detailed reasoning belongs in `docs/DECISIONS.md`; game content belongs in `docs/GAME_DESIGN.md`.

## [Unreleased]

### Added

- `GET /health` on the API (`@nestjs/terminus`, database ping) for the hosting platform's health check, replacing the Hello World route; API integration tests now run in CI against a Postgres service container
- `packages/ui`: Storybook (react-vite) setup with Button, Input, and Modal (built on Radix UI `Dialog`) components
- Shared Tailwind v4 design tokens (`packages/ui/src/styles/theme.css`) consumed by both Storybook and `apps/web`
- `/register` screen: form with Zod validation, typed API client (`apiPost`/`ApiError`), centralized route/endpoint constants (`AppPaths`, `ApiEndpoints`)
- i18n via next-intl (single locale for now, no URL routing) for UI copy, validation messages, and API error codes
- Backend: structured `{ code, message }` error responses with a shared `AuthErrorCode` type, replacing plain error strings
- CORS enabled on the API for local frontend development
- Unit tests for `AuthService` and `AuthController`
- `/login` screen: form with Zod validation, copy that varies by context (`?registered=true` vs. default "unauthorized" framing), `?redirect=` support for sending users back where they came from
- BFF pattern: Next.js Route Handlers (`apps/web/src/app/api/auth/**`, exposed to the browser as `InternalApiRoutes`) proxy auth requests to `apps/api` server-side; the JWT is set as an `httpOnly` cookie by Next.js itself and never reaches client-side JavaScript (see `docs/DECISIONS.md` #005)
- JWT Guard applied globally, opt-out via `@Public()` decorator
- Rate limiting on login and register (`@nestjs/throttler`): per player IP, and per email for login. The BFF forwards the player's IP with a shared `BFF_SECRET`, so players behind the BFF don't share one limit (see `docs/DECISIONS.md` #017)

### Changed

- API configuration goes through `@nestjs/config` with a Zod schema: the API refuses to start if `NODE_ENV`, `DATABASE_URL` or `JWT_SECRET` is missing or invalid. `NODE_ENV` is now required, and Swagger is served only when it is `development`
- `apps/api` compiles in full TypeScript strict mode, `strictPropertyInitialization` included (see `docs/DECISIONS.md` #016 and #023)
- Validation rules are Zod schemas in `packages/shared`, used by both the web app's forms and the API (NestJS 12's built-in Standard Schema validation), replacing `class-validator` DTOs. `details[].constraint` of a validation error is now a Zod issue code, and an empty login password is a 400 (see `docs/DECISIONS.md` #022)
- `/register` is a Server Component that redirects an already logged-in player to `/play`, like `/login`; the form is a client component of its own

### Fixed

- Every API error has the body `{ code, message, details? }`: validation errors, unknown routes, malformed JSON and unexpected 500s had no `code` (now `VALIDATION_FAILED` with per-field details, `NOT_FOUND`, `BAD_REQUEST`, and `INTERNAL_ERROR` without internals, from a global exception filter), and a missing or expired token said `INVALID_CREDENTIALS` (now `UNAUTHORIZED` or `SESSION_EXPIRED`). `AuthErrorCode` is renamed `ApiErrorCode`
- Login takes as long for an unknown email as for a wrong password (bcrypt runs against a dummy hash), so response timing no longer reveals which emails are registered
- Emails are trimmed and lowercased on register and login, so `Test@X.com` and `test@x.com` are the same account instead of two
- `POST /auth/login` returns 200 instead of 201, since it creates nothing
- Two concurrent registrations with the same email return 409 `EMAIL_ALREADY_REGISTERED` for the second one instead of a 500
- API request validation now also runs in apps built from `AppModule` (integration tests): the `ValidationPipe` moved from `main.ts` to an `APP_PIPE` provider. It rejects unknown body fields with 400 and turns bodies into DTO instances

---

<!--
When you cut a version, copy this template above the previous entries:

## [0.1.0] - YYYY-MM-DD
### Added
- Character auth (register/login)
- Character creation flow (race, starting traits)
- Starting location: the clearing
- Server-authoritative energy regeneration
- Opening quest: "First Blood"

### Changed
-

### Fixed
-
-->
