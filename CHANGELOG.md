# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions correspond to git tags (`v0.1.0`, `v0.2.0`, ...).

Each entry should be short — a git-log summary, not a design doc. Detailed reasoning belongs in `docs/DECISIONS.md`; game content belongs in `docs/GAME_DESIGN.md`.

## [Unreleased]
### Added
- `packages/ui`: Storybook (react-vite) setup with Button, Input, and Modal (built on Radix UI `Dialog`) components
- Shared Tailwind v4 design tokens (`packages/ui/src/styles/theme.css`) consumed by both Storybook and `apps/web`
- `/register` screen: form with Zod validation, typed API client (`apiPost`/`ApiError`), centralized route/endpoint constants (`AppPaths`, `ApiEndpoints`)
- i18n via next-intl (single locale for now, no URL routing) for UI copy, validation messages, and API error codes
- Backend: structured `{ code, message }` error responses with a shared `AuthErrorCode` type, replacing plain error strings
- CORS enabled on the API for local frontend development
- Unit tests for `AuthService` and `AuthController`
- `/login` screen: form with Zod validation, copy that varies by context (`?registered=true` vs. default "unauthorized" framing), `?redirect=` support for sending users back where they came from
- BFF pattern: Next.js Route Handlers (`src/app/api/auth/**`, exposed to the browser as `InternalApiRoutes`) proxy auth requests to `apps/api` server-side; the JWT is set as an `httpOnly` cookie by Next.js itself and never reaches client-side JavaScript (see `docs/DECISIONS.md` #005)

### Changed
-

### Fixed
-

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