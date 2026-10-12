# Refactor backlog — Ashen Contracts

A list of improvements found in the project review on 2026-10-12. Every task has a stable ID (e.g. `CRIT-01`). Use that ID in conversation and in commit messages (`fix(ui): normalize component paths [CRIT-01]`).

## How this file is used
- Tasks are done **one at a time, one commit per task**. Large tasks may take several commits, and each one references the ID.
- When a task is finished, change its `Status` line to `✅ DONE (YYYY-MM-DD)` and add a short `**Notes:**` line. The note says what was done and anything that differs from the plan. The status update goes into the same commit as the change. A commit cannot contain its own hash, so find the commit with `git log --grep=<ID>`.
- Never delete tasks. If a task becomes irrelevant, mark it `🚫 DROPPED` and give the reason.
- New tasks go at the end of their section with the next free number. IDs are never reused.

Status legend: ⬜ TODO · 🔶 IN PROGRESS · ✅ DONE · 🚫 DROPPED

## Recommended order
1. **Critical:** CRIT-01 → CRIT-05
2. **Safety net:** REPO-01 (CI), REPO-02 (docker-compose), REPO-03
3. **Docs and AI context in sync:** AI-01, DOC-01, DOC-02, AI-02
4. **API hardening:** API-01 → API-11
5. **Frontend:** WEB-01 → WEB-11, UI-01 → UI-06
6. Everything else, then continue with the v0.1 roadmap (character creation)

---

## CRIT — Breaks the build or the app outside the local machine

### CRIT-01 — Fix file/directory casing in `packages/ui`
**Status:** ✅ DONE (2026-10-12)
**Notes:** The working tree and all imports were already camelCase; only the git index held PascalCase paths. Committed the pending `'use client'`/`sideEffects` change separately first, then renamed all 6 component dirs and their 12 files in the index via temporary names (`git mv`). Verified on a fresh clone on a case-sensitive APFS volume: before the fix, `tsc` in `apps/web` fails because `@ashen-contracts/ui` imports don't resolve; after the fix, `tsc` passes and `next build` succeeds.
**Problem:** The git index stores `packages/ui/src/Modal/Modal.component.tsx` (PascalCase), but on disk the directories are lowercase (`modal/`), and `src/index.ts` imports `./modal/modal.component`. macOS has a case-insensitive filesystem (`core.ignorecase=true`), so this works locally. A Linux checkout (CI, Vercel, a recruiter's clone) breaks `apps/web`'s build.
**Fix:** Commit the pending `'use client'` and `sideEffects` changes first. Then pick one convention: camelCase per CLAUDE.md (`modal/modal.component.tsx`, `userMenu/userMenu.component.tsx`). Rename each path through a temporary name (`git mv Modal tmp && git mv tmp modal`) so git records the rename. Do the same for `*.stories.tsx`.
**Done when:** `git ls-files packages/ui/src` matches the import paths exactly, and the build passes on a case-sensitive filesystem. CI (REPO-01) will guard this from then on.

### CRIT-02 — Fix the API build output path (`start:prod` is broken)
**Status:** ✅ DONE (2026-10-12)
**Notes:** `include: ["src"]` alone was not enough, because `src` imported the Prisma client from `apps/api/generated/`, outside `src`. Changes:
- Prisma now generates the client into `src/generated/prisma`, as in Prisma's NestJS guide. Updated the import, `.gitignore`, the ESLint ignore and Jest coverage exclusion, and the path example in CLAUDE.md.
- `tsconfig.build.json` now sets `include: ["src"]` and `rootDir: "./src"`, so a future import from outside `src` fails the build loudly.
- Found and fixed a second bug in `tsconfig.build.json`: `incremental: false`. With `rootDir` set, the `.tsbuildinfo` file landed outside `dist/`, and because `nest-cli` wipes `dist/`, every second `nest build` produced an empty `dist/`.

Verified: two consecutive builds both produce `dist/main.js`, and `start:prod` boots and serves `GET /` and `POST /auth/login` (DB round-trip). Jest and `tsc` pass. The one remaining lint error (`login.dto.ts` missing a final newline) predates this task and is left for REPO-04.
**Problem:** `nest build` emits `dist/src/main.js` because `prisma7.config.ts` and `generated/` are inside the compilation root. `start:prod` runs `node dist/main`, which does not exist.
**Fix:** Restrict `tsconfig.build.json` to `"include": ["src"]`, or set `rootDir`. Make sure the generated Prisma client is still reachable at runtime, because it is imported via `../../generated/prisma/client`. Delete stale `dist/` before verifying.
**Done when:** `pnpm --filter api build && pnpm --filter api start:prod` boots the API.

### CRIT-03 — Align NestJS major versions
**Status:** ✅ DONE (2026-10-12)
**Notes:** All `@nestjs/*` packages are now 12.x. Versions published on the day of the upgrade (core/common/platform-express/testing 12.1.3, jwt 12.0.3, schematics 12.0.7) fell inside pnpm's `minimumReleaseAge` supply-chain window, so pnpm added them to `minimumReleaseAgeExclude`. To avoid weakening that policy, the upgrade uses the latest versions outside the window instead (12.1.2, 12.0.2, 12.0.6), with no exclusions. Gotcha: `@nestjs/core` and `@nestjs/platform-express` declare each other as peers. pnpm resolved that cycle to the newest version regardless of the policy until both were briefly pinned exactly; once the lockfile held 12.1.2, the ranges went back to `^`. Also upgraded `@types/express` to 5 (Nest 12 runs on Express 5) and `@types/node` to 24.

NestJS 12 is entirely ESM-only, including `@nestjs/testing`, so the old per-module mocks could no longer work at all. The app stays CommonJS and loads ESM at runtime through Node's `require(esm)`, with no flags. API tests moved from Jest to Vitest (5.0.2, the same version `packages/ui` uses):
- explicit `vitest` imports in specs, and `jest.fn` replaced by `vi.fn`;
- `vitest.config.mts` and `vitest.config.integration.mts`; `test/jest-e2e.json` removed;
- the backend "e2e" tests (NestJS template naming) were renamed to what they are, API integration tests: `test:e2e` became `test:integration`, and `*.e2e-spec.ts` became `*.integration-spec.ts`. "e2e" is now reserved for browser tests (WEB-11);
- `jest`, `ts-jest` and `@types/jest` removed.

A first iteration kept Jest 30 with `--experimental-vm-modules`. It was dropped in favour of Vitest to avoid an "experimental" flag in the test script; ADR #006 lists it as a rejected alternative. An SWC plugin, which the NestJS docs recommend for Vitest, turned out to be unnecessary: Vite 8's Oxc transformer emits decorator metadata (`design:paramtypes` verified in a throwaway test).

Node engines are now `^22.22.3 || >=24.15` (the strictest of the NestJS 12 CLI tooling, Vitest and the runtime), and `.nvmrc` is set to 24.

The ESM workaround mocks were removed from the auth specs. ADR #004 is marked superseded by the new ADR #006, which records the root cause and the alternatives. CLAUDE.md (convention and tech stack), README and ARCHITECTURE now say Vitest instead of Jest.

Verified:
- `pnpm test` passes (10/10, no mocks, no flags); `test:cov` excludes the generated client; `tsc` and `nest build` pass; `pnpm install --frozen-lockfile` passes pnpm's supply-chain check.
- `start:prod` serves `/`, the auth endpoints (validation and guard behave as before) and Swagger at `/api`.

Out of scope:
- `test:integration` still fails on the bare `'src/prisma/prisma.module'` import, and after that on a missing `DATABASE_URL` because the integration run does not load `.env`. Both predate the task and are covered by API-10.
- Remaining peer warnings, none from `@nestjs/*`, are tracked as REPO-08 and UI-07.
**Problem:** `@nestjs/core` and `@nestjs/common` are 10.4.x, while `@nestjs/jwt`, `@nestjs/config` and `@nestjs/swagger` are 12.x. `swagger@12` requires core/common `^12` as peers. `jwt@12` and `swagger@12` are `"type": "module"` packages, which is the real root cause of the Jest ESM failures described in ADR #004.
**Fix:** Upgrade all `@nestjs/*` packages, plus `@nestjs/cli`, `schematics` and `testing`, to the same major version (12.x). Then check whether the `jest.mock(..., factory)` workarounds are still needed. If not, remove them and the matching rule in CLAUDE.md. Rewrite ADR #004, or add a superseding ADR, so it states the real cause.
**Done when:** `pnpm install` reports no peer-dependency warnings for `@nestjs/*`, the tests pass, the app boots, and ADR #004 and CLAUDE.md match the new reality.

### CRIT-04 — Add the missing `passwordRequired` translation key
**Status:** ⬜ TODO
**Problem:** `apps/web/app/login/login.schema.ts` uses the error key `passwordRequired`, which does not exist in `messages/en.json`. Submitting an empty password shows a raw key or throws a next-intl error.
**Fix:** Add `validation.passwordRequired`. Optionally make the translation keys type-checked against `en.json` (next-intl `AppConfig` / `Messages` typing) so this class of bug fails at compile time.
**Done when:** Submitting an empty password on `/login` shows a proper message.

### CRIT-05 — Add the `migrate` script and verify the Prisma config file name
**Status:** ⬜ TODO
**Problem:** CLAUDE.md documents `pnpm --filter api migrate`, but `apps/api/package.json` has no such script. The Prisma config is named `prisma7.config.ts`, while the CLI looks for `prisma.config.ts` by default.
**Fix:** Rename to `prisma.config.ts`, or pass `--config` explicitly. Add `migrate` (`prisma migrate dev`), `migrate:deploy` and `prisma:generate` scripts.
**Done when:** `pnpm --filter api migrate` works on a fresh database.

---

## REPO — Monorepo and tooling

### REPO-01 — Continuous integration (GitHub Actions)
**Status:** ⬜ TODO
**Problem:** There is no CI. Bugs like CRIT-01 and CRIT-02 only show up on someone else's machine.
**Fix:** Add a workflow on `ubuntu-latest` that runs `pnpm install --frozen-lockfile`, lint, typecheck, unit tests and the build for all workspaces, with the pnpm store cached. Use Node from `.nvmrc` (≥ 24.9 is required since CRIT-03). Run it on push to `main` and on PRs.
**Done when:** CI is green on `main`, and README shows a CI badge.

### REPO-02 — `docker-compose.yml` for Postgres and Redis
**Status:** ⬜ TODO
**Problem:** README and ARCHITECTURE promise a one-command local setup, but it is only planned. Redis is needed soon for BullMQ.
**Fix:** Add a compose file with Postgres and Redis (named volumes, health checks), and set the matching `DATABASE_URL` in `.env.example`. Update the README "Getting started" section.
**Done when:** A fresh clone runs end-to-end with `docker compose up -d && pnpm install && pnpm --filter api migrate && pnpm dev`.

### REPO-03 — `.env.example` for `apps/web` and env documentation
**Status:** ⬜ TODO
**Problem:** `apps/web` needs `API_URL`, but nothing documents it. The API's `.env.example` does not list `CORS_ORIGIN` or `NODE_ENV`.
**Fix:** Add `apps/web/.env.example` and complete `apps/api/.env.example`. Root `.gitignore` must not ignore `.env.example`; `apps/web/.gitignore` currently has `.env*`.
**Done when:** Every env variable read in the code appears in an `.env.example` file.

### REPO-04 — Unified formatting and linting
**Status:** ⬜ TODO
**Problem:** The API uses ESLint 8 with the legacy `.eslintrc.js`, while web uses ESLint 9 flat config. There is no shared Prettier config, and quote style is mixed across files.
**Fix:** Add a root Prettier config, migrate the API to an ESLint 9 flat config, add a `format` script at the root, and format the codebase in one dedicated commit.
**Done when:** `pnpm lint` and `pnpm format --check` pass across all workspaces.

### REPO-05 — Root scripts and the TypeScript version
**Status:** ⬜ TODO
**Problem:** Root `test`, `lint` and `build` only target `apps/*`, so `packages/ui` is skipped. There is no `typecheck` script. Root `typescript` is pinned to `5.1.3`, but `@nestjs/swagger@12` needs at least 5.5.
**Fix:** Include `packages/*` where relevant, add `typecheck` (`tsc --noEmit` per workspace), and align the TypeScript version across workspaces.
**Done when:** `pnpm typecheck` and `pnpm test` cover every workspace.

### REPO-06 — Add a LICENSE
**Status:** ⬜ TODO
**Fix:** Add a `LICENSE` file (e.g. MIT) and set `license` in the package.json files.

### REPO-07 — Adopt Conventional Commits
**Status:** ⬜ TODO
**Problem:** The current `add: ...` messages don't map to Keep a Changelog sections.
**Fix:** Document the convention (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:` plus a `[TASK-ID]` suffix) in CLAUDE.md. Optionally add commitlint.

### REPO-08 — Resolve remaining peer warnings from the NestJS CLI
**Status:** ⬜ TODO
**Problem:** Found during CRIT-03. `@nestjs/schematics@12` wants `typescript >=6.0.0`, while 5.9 is installed. `@nestjs/cli@12` wants `webpack ^5.105.4`, while 5.97 is installed through a transitive dependency. Both are dev-time tooling (`nest generate`, and webpack is unused because the build uses `tsc`), so nothing is broken today.
**Fix:** Decide on TypeScript 6 for `apps/api` (or the whole repo, together with REPO-05). Check where the old webpack comes from and whether it can be deduplicated or dropped.
**Done when:** `pnpm peers check` reports no issues for `apps/api`.

---

## AI — AI tooling setup

### AI-01 — Sync CLAUDE.md with the actual codebase
**Status:** ⬜ TODO
**Problem:** CLAUDE.md is out of date in several places:
- It says `src/app/play/_components/`, but the code has `app/play/_components/`.
- The naming convention does not match the files in git (see CRIT-01).
- It lists a `migrate` command that does not exist.
- "Current status" still has `[update me]` placeholders.
- It says Jest is used for unit tests, but `packages/ui` uses Vitest.

AI agents trust CLAUDE.md more than the code, so drift here produces wrong code.

**Fix:** Correct every statement. Add a rule: *"When a change alters architecture or conventions, update the relevant `docs/` file (spec, ADR, CLAUDE.md) in the same commit."* Point to `docs/REFACTOR.md`.
**Done when:** Every path and command in CLAUDE.md exists and works.

### AI-02 — Project `.claude/settings.json` with hooks and permissions
**Status:** ⬜ TODO
**Fix:** Add a committed `.claude/settings.json` with:
- a `PostToolUse` hook that runs Prettier and ESLint `--fix` on edited files;
- `deny` rules for reading `.env*` files;
- an allowlist for safe commands (`pnpm test`, `pnpm lint`, `pnpm typecheck`, `git status`, `git diff`).

**Done when:** Edits made by Claude come out formatted, and `.env` contents cannot be read by the agent.

### AI-03 — Project skills or slash commands for repeated workflows
**Status:** ⬜ TODO
**Fix:** Add these to `.claude/skills/`:
- `implement-feature`: reads a `docs/features/*.md` spec, implements it, and ticks off its "Tests to write" list;
- `adr`: appends a DECISIONS.md entry in the defined format;
- `release`: moves CHANGELOG `[Unreleased]` to a version, ticks ROADMAP, and creates the git tag;
- `refactor-task <ID>`: does a task from this file and updates its status.

### AI-04 — Trim the Prisma agent skills
**Status:** ⬜ TODO
**Problem:** The `postinstall` hook (`prisma skills sync`) installs 9 skills into 4 agent directories. Several are irrelevant (`prisma-mongodb-upgrade`, `prisma-compute`, `prisma-driver-adapter-implementation`) and only add noise to the context.
**Fix:** Keep only the relevant skills (CLI, client API, Postgres, upgrade-v7), and decide whether `postinstall` should still sync skills.

### AI-05 — MCP configuration (`.mcp.json`)
**Status:** ⬜ TODO
**Fix:** Add a project `.mcp.json` with the Next.js DevTools MCP (Next 16) and the Playwright MCP, so the agent can inspect runtime errors and verify the UI. Prisma MCP is optional.

### AI-06 — AI code review in CI
**Status:** ⬜ TODO
**Depends on:** REPO-01
**Fix:** Add `anthropics/claude-code-action` for PR reviews, guided by CLAUDE.md conventions.

### AI-07 — README section: "How I use AI in this project"
**Status:** ⬜ TODO
**Fix:** Explain the setup openly: spec-driven development via `docs/features`, ADRs as shared context, CLAUDE.md, hooks and skills, and what is reviewed by hand. This is a deliberate portfolio differentiator.

---

## DOC — Documentation drift

### DOC-01 — Update `docs/features/01-auth.md` to match the implemented auth
**Status:** ⬜ TODO
**Problem:** The spec still describes localStorage, a Bearer token sent from the client, and `NEXT_PUBLIC_API_URL`. All of that was rejected in ADR #005.
**Fix:** Describe the BFF, the httpOnly cookie and `API_URL` as implemented, and mark the "open decision" as resolved, linking to ADR #005.

### DOC-02 — Fix small inconsistencies across docs
**Status:** ⬜ TODO
**Fix:**
- CHANGELOG: change `src/app/api/auth/**` to the real path, and fix the formatting of the `-JWT Guard` bullet.
- ROADMAP: tick "Navbar" (it is already committed).
- ARCHITECTURE and README: settle on one e2e tool (Playwright, see WEB-11).
- `packages/shared/src/types/errors.ts`: remove or fix the reference to a non-existent "type-only shared" ADR, or write that ADR.

### DOC-03 — Status field in feature specs
**Status:** ⬜ TODO
**Fix:** Add `Status: planned | in progress | done` and "Deviations from spec" to each `docs/features/*.md`.

---

## API — Backend (NestJS)

### API-01 — Enable strict TypeScript
**Status:** ⬜ TODO
**Problem:** `apps/api/tsconfig.json` sets `strictNullChecks: false` and `noImplicitAny: false`.
**Fix:** Set `"strict": true` and fix the resulting errors.
**Done when:** `tsc --noEmit` passes in strict mode.

### API-02 — Harden the global `ValidationPipe`
**Status:** ⬜ TODO
**Fix:** Use `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Add a test that confirms unknown fields are rejected.

### API-03 — Validated configuration via `@nestjs/config`
**Status:** ⬜ TODO
**Problem:** `@nestjs/config` is installed but unused. `JWT_SECRET` is read from `process.env` at import time with no validation. A missing secret only fails at the first login.
**Fix:** Use `ConfigModule.forRoot({ isGlobal: true, validate })` with a Zod or Joi schema covering `DATABASE_URL`, `JWT_SECRET`, `PORT` and `CORS_ORIGIN`. Switch to `JwtModule.registerAsync` using `ConfigService`, and remove `import 'dotenv/config'` from `main.ts`.
**Done when:** The app refuses to start with a clear error when a required variable is missing.

### API-04 — Handle the duplicate-email race in `register`
**Status:** ⬜ TODO
**Problem:** The `findUnique` → `create` sequence is not atomic. Two concurrent requests produce a Prisma `P2002` error, which surfaces as a 500 instead of a 409.
**Fix:** Catch `P2002` on `create` and map it to `ConflictException` with `EMAIL_ALREADY_REGISTERED`. Add a unit test for it.

### API-05 — Normalize email addresses
**Status:** ⬜ TODO
**Fix:** Trim and lowercase the email in the DTOs (`@Transform`) for both register and login. Test that `Test@X.com` and `test@x.com` resolve to the same account.

### API-06 — Rate limiting on auth endpoints
**Status:** ⬜ TODO
**Fix:** Add `@nestjs/throttler` with a strict limit on `POST /auth/login` and `/auth/register`.

### API-07 — Avoid user enumeration via login timing
**Status:** ⬜ TODO
**Problem:** When the email does not exist, the response returns immediately without running bcrypt. The timing difference reveals whether an account exists.
**Fix:** Run `bcrypt.compare` against a constant dummy hash when the player is not found.

### API-08 — Consistent error contract: dedicated codes and a global exception filter
**Status:** ⬜ TODO
**Problem:** `JwtAuthGuard` returns `INVALID_CREDENTIALS` for missing or expired tokens. `ValidationPipe` errors and unexpected 500s have no `code` field.
**Fix:**
- Add codes such as `UNAUTHORIZED`, `SESSION_EXPIRED`, `VALIDATION_FAILED` and `INTERNAL_ERROR` to `packages/shared`, perhaps renaming `AuthErrorCode` to `ApiErrorCode`.
- Add a global `ExceptionFilter` that guarantees the `{ code, message, details? }` shape on every error response.
- Update `apps/web` translations to cover the new codes.

### API-09 — Prisma adapter and lifecycle
**Status:** ⬜ TODO
**Problem:** `@prisma/adapter-ppg` targets Prisma Postgres. Railway, Render and local docker Postgres need `@prisma/adapter-pg`. The client is also never disconnected.
**Fix:** Switch to `@prisma/adapter-pg`, implement `OnModuleDestroy` → `$disconnect()`, and call `app.enableShutdownHooks()`.

### API-10 — Cleanup and health check
**Status:** ⬜ TODO
**Fix:**
- In `auth.module.ts`, replace the bare `'src/prisma/prisma.module'` import with a relative one, per CLAUDE.md.
- Remove the stale comment in `jwtAuth.guard.ts` ("to be added when...").
- Replace the Hello World `AppController`, `AppService` and their spec with `GET /health` (`@nestjs/terminus`, DB check, `@Public()`).
- Rewrite the integration test (`test/app.integration-spec.ts`) against `/health`. Note: the integration run does not load `.env` (only `main.ts` imports `dotenv/config`), so `PrismaService` gets no `DATABASE_URL`. Either load env in `vitest.config.integration.mts` (`setupFiles: ['dotenv/config']`) or rely on API-03's `ConfigModule`. Found during CRIT-03.
- Delete the empty `apps/api/mocked_prisma/` directory.
- Replace or remove the `prisma.service.spec.ts` "should be defined" test.

### API-11 — Unit tests for `JwtAuthGuard`
**Status:** ⬜ TODO
**Fix:** Cover four cases:
- a `@Public()` route bypasses the guard;
- a missing header returns 401;
- a malformed or non-Bearer header returns 401;
- an invalid or expired token returns 401, and a valid token sets `request.user`.

---

## SHARED — `packages/shared`

### SHARED-01 — Single source of truth for validation rules
**Status:** ⬜ TODO
**Problem:** The frontend validates with Zod and the backend with class-validator. Rules such as the minimum password length of 8 are duplicated by hand.
**Fix:** The minimum is to export shared constants (`PASSWORD_MIN_LENGTH`) from `packages/shared` and use them on both sides. The target is shared Zod schemas used by web and by the API (via `nestjs-zod`). Record the choice in an ADR.

---

## WEB — Frontend (Next.js)

### WEB-01 — Move `app/` into `src/app/`
**Status:** ⬜ TODO
**Problem:** `apps/web` mixes a root `app/` with `src/`, which produces imports like `@/src/http`. CLAUDE.md already assumes `src/app/`.
**Fix:** Move `app/` to `src/app/`, change the alias to `"@/*": ["./src/*"]`, update imports, and update the `@source` path in `globals.css` if needed.
**Done when:** No import contains `@/src/`, and dev and build both work.

### WEB-02 — Robust BFF route handlers
**Status:** ⬜ TODO
**Problem:** In `api/auth/login` and `api/auth/register`, invalid JSON in the request body, an unreachable backend, or a non-JSON backend response all end in an unhandled 500. `API_URL` is never validated, which yields requests to `"undefined/auth/login"`. The two handlers duplicate each other.
**Fix:** Extract a `proxyToApi()` helper. It should handle body parsing, network errors (return 502 with `{ code: 'INTERNAL_ERROR' }`) and non-JSON responses. Validate `API_URL` once in a server-only env module.
**Depends on:** API-08 (error codes) is nice to have first.

### WEB-03 — Enforce server-only modules and deduplicate `getCurrentUser`
**Status:** ⬜ TODO
**Fix:** Add `import 'server-only'` to `session.ts`, `getCurrentUser.ts` and the `ApiEndpoints` module. Wrap `getCurrentUser` in React `cache()` so it runs once per request.

### WEB-04 — Server/client split for `/register`
**Status:** ⬜ TODO
**Problem:** `/register` is a full client page and does not redirect logged-in users, unlike `/login`.
**Fix:** Turn `page.tsx` into a Server Component that redirects when a session exists. Move the form into `register/_components/registerForm.component.tsx`.

### WEB-05 — Remove duplicated form logic
**Status:** ⬜ TODO
**Problem:** The login and register forms repeat the same code for state, `validate()` with Zod issue mapping, and submit/loading/error handling.
**Fix:** Either use `react-hook-form` with `zodResolver`, or write a small shared `useZodForm` hook. Do this after WEB-06, because Server Actions change the approach.

### WEB-06 — Decide between Server Actions and Route Handlers (ADR)
**Status:** ⬜ TODO
**Fix:** Compare the current Route Handler BFF with Server Actions plus `useActionState`. With Server Actions, the action sets the cookie, the client-side `apiPost` is no longer needed, and forms work without JS. Write an ADR (next free number) with the decision, and implement it if Server Actions win.

### WEB-07 — Remove create-next-app leftovers and fix the fonts
**Status:** ⬜ TODO
**Fix:**
- `layout.tsx` metadata still says "Create Next App"; set a real title and description.
- `app/page.tsx` has a hardcoded Polish string ("Rozpocznij swoja przygode!"); move it to `en.json` and build a minimal landing page.
- Fonts: load Cinzel and Inter via `next/font` to match the `theme.css` tokens. Remove Geist and the `body { font-family: Arial }` override.
- `globals.css`: remove the template's light/dark `--background`/`--foreground` variables that conflict with the design tokens.

### WEB-08 — PlayNavbar fixes
**Status:** ⬜ TODO
**Fix:** Remove the duplicate "Unnamed Hero" (it appears both as text and in UserMenu). Handle logout failures, and call `router.refresh()` after logout so server components re-evaluate.

### WEB-09 — Type-safe error code translation
**Status:** ⬜ TODO
**Problem:** `ApiError.code` is typed as `AuthErrorCode`. `tErrors(err.code)` breaks on any code missing from `en.json`.
**Fix:** Add a mapping function with a `GENERIC` fallback for unknown codes, typed against the shared code union. Align with API-08.

### WEB-10 — Unit and component testing setup for `apps/web`
**Status:** ⬜ TODO
**Fix:**
- Add Vitest (consistent with `packages/ui`) with React Testing Library, and a `test` script.
- Cover `routeHelpers` (especially the `getSafeRedirect` attack cases), the Zod schemas, and both forms: inline errors, server error rendering, and redirect on success.

### WEB-11 — E2E tests with Playwright
**Status:** ⬜ TODO
**Depends on:** REPO-02
**Fix:** Use Playwright, the same tool Storybook tests already use. Cover the flow register → login → `/play` → logout, plus a redirect from `/play` to `/login?redirect=/play` when logged out. Run it in CI.

---

## UI — `packages/ui`

### UI-01 — UserMenu: circular import and keys
**Status:** ⬜ TODO
**Fix:** Import `Avatar` directly from its file, not from the `'..'` barrel. Give `UserMenuItem` an `id` and use it as the React key instead of `label`.

### UI-02 — `cn()` helper and safer Button defaults
**Status:** ⬜ TODO
**Fix:** Add `cn()` (`clsx` + `tailwind-merge`) so a `className` override replaces conflicting classes instead of being concatenated, and use it in every component. Default `Button` to `type="button"`; forms pass `type="submit"` explicitly.

### UI-03 — Localizable Modal close label
**Status:** ⬜ TODO
**Fix:** Replace the hardcoded `aria-label="Close"` with a `closeLabel` prop that has a default value.

### UI-04 — Keep `theme.css` to tokens only
**Status:** ⬜ TODO
**Problem:** `theme.css` runs `@import "tailwindcss"`, and `apps/web/globals.css` imports Tailwind as well, which risks duplicated base styles.
**Fix:** Keep only `@theme` tokens in `theme.css`, and import Tailwind in the consumers (Storybook `preview`, web `globals.css`). Verify that the CSS output contains no duplicates.

### UI-05 — Storybook config cleanup
**Status:** ⬜ TODO
**Fix:** Remove the non-existent `../stories/**` globs and the `addon-onboarding` addon. Load the Cinzel and Inter fonts in Storybook as well. Consider switching a11y `test: 'todo'` to `'error'` once violations are fixed.

### UI-06 — Publish Storybook to Chromatic
**Status:** ⬜ TODO
**Depends on:** REPO-01
**Fix:** Add a Chromatic deploy step in CI, and put the Storybook link in README, replacing "coming soon".

### UI-07 — Storybook Vitest addon peer mismatch
**Status:** ⬜ TODO
**Problem:** Found during CRIT-03 (`pnpm peers check`). `@storybook/addon-vitest@10.6` supports `vitest` and `@vitest/browser-playwright` `^3 || ^4`, but 5.0.2 is installed. Story tests may break or behave unpredictably.
**Fix:** Either upgrade Storybook to a version that supports Vitest 5, or pin Vitest to 4.x in `packages/ui`. Then run the story tests to confirm.
**Done when:** No peer warnings for `packages/ui`, and the story tests run green.

---

## GAME — Product and game design

### GAME-01 — Define what "contracts" are in the game
**Status:** ⬜ TODO
**Problem:** README and CLAUDE.md describe a stronghold with monster-hunting contracts and building/research. GAME_DESIGN and ROADMAP describe narrative expeditions and a mystery-origin character. Contracts don't appear in the roadmap at all, despite the game's name.
**Fix:** Decide what a contract is. One option is an expedition framed as a job taken from a notice board. Then make README, CLAUDE.md, GAME_DESIGN and ROADMAP tell the same story.

### GAME-02 — Bring BullMQ forward to v0.2 expeditions
**Status:** ⬜ TODO
**Problem:** The headline backend feature (ADR #001) first appears in v0.4, after the MVP checkpoint pressure point.
**Fix:** Make expedition resolution in v0.2 the first delayed BullMQ job, with a Socket.io "expedition finished" notification. Update the ROADMAP, ARCHITECTURE and the v0.2 feature spec.

### GAME-03 — Guest / demo account
**Status:** ⬜ TODO
**Problem:** Recruiters will not register to try a portfolio project.
**Fix:** Add a "Play as guest" button that creates a temporary player (or logs into a seeded demo account) with a pre-made character. Write a spec in `docs/features/`.

### GAME-04 — Time acceleration for demos
**Status:** ⬜ TODO
**Fix:** Add a server-side `TIME_SCALE` config (e.g. 60× in demo) applied to energy regeneration and job delays, so a 30-minute expedition resolves in 30 seconds during a live demo. It must never be controllable from the client.

### GAME-05 — Strengthen concurrency and idempotency in the specs
**Status:** ⬜ TODO
**Fix:**
- In `03-energy-resource.md`, specify an atomic spend (`UPDATE ... SET energy = energy - cost WHERE id = ? AND energy >= cost`), rather than read-check-write inside a transaction.
- In `05-first-blood-quest.md`, specify reward idempotency through a DB unique constraint or a conditional status update.
- Plan integration tests against a real Postgres (Testcontainers or the docker-compose DB).

### GAME-06 — Observability for the deployed demo
**Status:** ⬜ TODO
**Fix:** Add structured logging (`nestjs-pino`) with a request ID, and use it to surface errors from the deployed API. This pairs with `/health` from API-10.
