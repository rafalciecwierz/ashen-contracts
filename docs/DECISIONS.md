# Architecture Decisions (lightweight ADR log)

> Short "why we chose this" log. This is interview prep material — every decision here is a plausible question from a recruiter or interviewer.

## Entry format

```
## [Number]. [Decision title]
Date:
Context: what problem we're solving
Decision: what we chose
Alternatives considered: what we rejected and why
Consequences: what this means in practice (trade-offs)
```

---

## 001. Job queue (BullMQ + Redis) instead of naive cron/polling for timed actions

Date: 20.09.2026.

Context: Player actions (building, research/training) take real time to complete and must resolve correctly even if the server restarts in the meantime.

Decision: BullMQ + Redis to manage delayed jobs.

Alternatives considered: a `setTimeout`/cron job scanning the database every minute — rejected because it doesn't scale cleanly and gives weaker guarantees around server restarts and duplicate execution.

Consequences: an extra infrastructure dependency (Redis), but much more reliable behavior under restarts/scaling — and a stronger interview talking point than "I used setInterval."

## 002. Monorepo instead of separate frontend/backend repos

Date: 20.09.2026.

Context: Solo portfolio project; frontend and backend need to share TypeScript types (DTOs) without duplicating them.

Decision: single repo with `apps/web`, `apps/api`, `packages/ui`, `packages/shared`, managed via pnpm workspaces.

Alternatives considered: two separate repos (the more common setup in team environments) — rejected as unnecessary overhead for a one-person project.

Consequences: simpler CI, one link to share with recruiters, shared types with no manual syncing. Less representative of a typical multi-team repo split — worth naming as a conscious trade-off if asked in an interview.

## 003. Server-authoritative resource calculation (never trust the client)

Date: 20.09.2026.

Context: The energy resource regenerates over time; a naive implementation could let a client fake elapsed time or a locally-tracked value.

Decision: energy is always recalculated server-side from `lastEnergyUpdate`, never sent from or trusted from the client.

Alternatives considered: tracking regeneration client-side and syncing periodically — rejected, trivially exploitable.

Consequences: slightly more server logic per request, but the resource system can't be cheated — a deliberate security-minded choice, not an afterthought.

## 004. Mock ESM-published NestJS libraries wholesale in unit tests, rather than fighting Jest's transform config

Date: 26.09.2026.

Status: **Superseded by #006.** The diagnosis below was incomplete: the failures came from mixing NestJS majors (core 10 with jwt/swagger 12), not from something unit tests inherently need to work around.

Context: `@nestjs/jwt` and `@nestjs/swagger` both ship code that includes ES Module `import` syntax somewhere in their dependency tree (`jsonwebtoken`, `reflect-metadata`). Jest's default setup treats `node_modules` as pre-built CommonJS and doesn't transform it, so any spec file importing something that pulls in these packages fails immediately with `SyntaxError: Cannot use import statement outside a module` — a plain unit test failure, not a bug in the application code.

Decision: mock the affected module entirely in each spec file with an explicit factory (`jest.mock('@nestjs/jwt', () => ({ JwtService: jest.fn() }))`), rather than widening Jest's `transformIgnorePatterns` to compile these packages on the fly.

Alternatives considered: a `transformIgnorePatterns` regex targeting the specific packages — tried first, but failed in practice because pnpm's `.pnpm` store nests packages under a second `node_modules` segment (`node_modules/.pnpm/@nestjs+jwt@.../node_modules/@nestjs/jwt/...`), so a naive pattern matches the wrong segment and never reaches the real package path. Widening the pattern further is possible but adds ongoing maintenance cost (a new entry per problematic package) for something unit tests shouldn't need to compile at all.

Consequences: unit tests never execute real JWT-signing or Swagger-decorator code — which is correct for a unit test (that behavior is exercised in `AuthService`'s own logic via injected fakes, not by the library internals). The trade-off: forgetting to add the mock when a new module imports one of these packages produces a real but slightly confusing failure; documented in `CLAUDE.md` under Code conventions so it's applied proactively for Character/Location/Quest modules.

## 005. BFF pattern with an httpOnly cookie instead of returning the JWT to the client for localStorage

Date: 06.10.2026

Context: v0.1 originally stored the JWT in `localStorage` after login (flagged as an open decision in `docs/features/01-auth.md`, deliberately not silently carried forward). `localStorage` is readable by any JavaScript running on the page — including anything injected via an XSS vulnerability in a dependency, not just a bug of our own — so the token is trivially stealable if that ever happens. The safer browser mechanism, an `httpOnly` cookie, can only be set by a server response, and `apps/api` (NestJS) lives on a different origin/port than `apps/web` (Next.js), which would require fragile cross-origin cookie configuration (`SameSite=None; Secure`, exact-origin CORS) that gets more brittle once deployed to separate production domains (Vercel + Railway).

Decision: `apps/web` never lets the browser call `apps/api` directly for auth. Instead, Next.js Route Handlers under `src/app/api/auth/**` act as a thin backend-for-frontend (BFF): the browser calls these same-origin routes, the route handler does a server-to-server `fetch` to the real backend (`ApiEndpoints`, server-only paths), and on success sets the JWT as an `httpOnly` cookie itself — the raw token is never sent back to the browser at all. The browser only ever sees `InternalApiRoutes` (`/api/auth/login`, `/api/auth/register`); it has no knowledge of `apps/api`'s address or of the token's existence.

Alternatives considered:

- Keep `localStorage` — rejected per the XSS exposure above; this is exactly the kind of security-relevant decision not to leave as "how it's always been" once actually facing it.
- Have NestJS set the cookie directly (cross-origin) — technically possible, but adds real fragility (cookie flags, exact CORS origin matching, same-site complications after deploying to separate production domains) for no benefit over the BFF approach, which sidesteps cross-origin cookies entirely by keeping the browser's only relationship same-origin.

Consequences: any request needing the token (currently: login) must round-trip through a Next.js Route Handler rather than hitting `apps/api` directly from a client component — slightly more code per auth-sensitive action (one small, repetitive route file), and `apps/api`'s CORS config (added earlier) is no longer exercised by the browser for these flows at all, since server-to-server fetches aren't subject to CORS. In exchange, the token is never reachable by any client-side JavaScript, which is the entire point. Reading protected data on page load (not yet built) won't need this same round-trip — a Server Component can read the cookie and call `apps/api` directly during rendering, without an extra visible request from the browser; only client-side _actions_ (forms, button clicks) need a dedicated Route Handler.

## 006. NestJS 12 on a CommonJS app, with API tests on Vitest instead of Jest

Date: 12.10.2026

Context: `apps/api` mixed NestJS majors: `@nestjs/core`/`common` 10.x alongside `@nestjs/jwt`, `config` and `swagger` 12.x. The 12.x packages are ESM-only (`"type": "module"`), and `swagger@12` requires core/common `^12` as peers. This was the real cause of the Jest `SyntaxError: Cannot use import statement outside a module` failures that ADR #004 worked around by mocking whole modules. Aligning on NestJS 12 makes _every_ `@nestjs/*` package ESM-only, including `@nestjs/testing`, so mocking individual packages stops being an option at all.

Decision: upgrade all `@nestjs/*` packages to 12.x and keep the app itself CommonJS (`module: commonjs`). At runtime, Node.js loads the ESM-only dependencies natively through `require(esm)`, which NestJS 12 officially supports, so `node dist/main` needs no flags. Move the API unit and integration tests from Jest to Vitest, which handles ESM natively. Vitest is also what NestJS 12 itself defaults to for ESM projects, and what `packages/ui` already uses, so the monorepo now has a single test runner. Spec files import the test API explicitly from `vitest` (no globals). The ESM workaround mocks from ADR #004 are removed.

Alternatives considered:

- Keep Jest (30) and run it with `--experimental-vm-modules`, which on Node ≥ 24.9 lets Jest's module loader use `require(esm)`. This was implemented first and works, but it bakes an "experimental" Node flag into the test script, raises the minimum Node version just for tests, and keeps the project on the runner NestJS is moving away from.
- Stay on NestJS 10 and downgrade jwt/config/swagger to their 10-compatible majors. Rejected: it moves the project backwards, and the next upgrade would hit the same wall.
- `transformIgnorePatterns` to compile `node_modules` ESM with ts-jest. Rejected for the reasons in #004, and it would now have to cover all of `@nestjs/*`.
- Convert the app itself to ESM as well. Not needed to solve this problem, and it would require `.js` extensions on every relative import. Can be done later as a separate change.

Consequences: tests run with plain `vitest run`, with no flags and faster feedback in watch mode. Unit tests import the real `@nestjs/jwt` and `@nestjs/swagger` code again, so new modules (Character, Location, Quest) need no mock boilerplate. Gotcha worth knowing: the NestJS docs recommend an SWC plugin for Vitest because esbuild does not emit decorator metadata, but Vitest 5 runs on Vite 8, whose Oxc transformer honors `emitDecoratorMetadata` from `tsconfig.json`. DI works without SWC (verified by checking `design:paramtypes` in a test), so no plugin is installed. Node must be `^22.22.3 || >=24.15`, the strictest requirement among the NestJS 12 CLI tooling, Vitest and the runtime.

## 007. CI on GitHub Actions, running the same root scripts as local development

Date: 13.10.2026

Context: Bugs like the PascalCase/camelCase path mismatch (CRIT-01) and the broken `start:prod` path (CRIT-02) only showed up on someone else's machine: a case-sensitive Linux checkout, or a fresh clone without gitignored generated code.

Decision: a single GitHub Actions job on `ubuntu-latest`, triggered on push to `main` and on pull requests. It runs `pnpm install --frozen-lockfile`, then the root scripts: commit message lint, `lint`, `format:check`, `typecheck`, `test` (including the Storybook tests in headless Chromium) and `build`. Node comes from `.nvmrc` and pnpm from `packageManager`, the pnpm store is cached, superseded runs are cancelled, and the job only has read access.

Alternatives considered:

- Separate parallel jobs per workspace or per check. Rejected for now: each job repeats the install, and the whole pipeline is a few minutes on one runner.
- Workspace-specific commands written into the workflow. Used at first, then replaced by root scripts (REPO-05), so `pnpm lint` locally and in CI are the same command.

Consequences: anything that only works on one machine fails in CI. The fresh-clone checks done while setting this up already caught two problems: Next.js route types missing for `tsc`, and the Prisma client not being generated. CI is free for this public repository.

## 008. `@prisma/adapter-pg` (node-postgres) as the Prisma driver adapter

Date: 13.10.2026

Context: Prisma 7 talks to the database through a driver adapter. The project started with `@prisma/adapter-ppg`, which is specific to the hosted Prisma Postgres service and connects over HTTPS. Against the local docker-compose Postgres, every runtime query failed with `ECONNREFUSED 127.0.0.1:443`, while migrations still worked, because the Prisma CLI opens its own TCP connection. The planned hosts (Railway/Render) are plain Postgres too.

Decision: use `@prisma/adapter-pg`, the standard node-postgres driver over TCP. `PrismaService` disconnects in `onModuleDestroy`, and `main.ts` calls `enableShutdownHooks()`, so the connection pool is closed on SIGTERM.

Alternatives considered:

- Keep `adapter-ppg` and only use Prisma Postgres. Rejected: it ties local development and every deployment target to one hosted vendor.
- Switch adapters by environment. Rejected: two code paths for the same database, and the production one would never be tested locally.

Consequences: one adapter works with local Docker, CI, the existing Prisma Postgres database (over its TCP URL) and any managed Postgres. Verified: on SIGTERM the open connections drop from 1 to 0.

## 009. docker-compose for local infrastructure only; apps run on the host

Date: 13.10.2026

Context: The README promised a one-command local setup, and Redis will be needed for BullMQ (#001). Installing PostgreSQL and Redis by hand differs per OS and is easy to get wrong.

Decision: `docker-compose.yml` runs only PostgreSQL 17 and Redis 8, with health checks and named volumes. The apps run on the host with `pnpm dev`. Ports are bound to `127.0.0.1`, so the hard-coded development credentials (fine for a throwaway local database) are not reachable from the network. Redis runs with AOF persistence (queued jobs survive a restart) and `maxmemory-policy noeviction`, which BullMQ requires. The API's `postinstall` runs `prisma generate`, because Prisma 7's `migrate dev` no longer generates the client.

Alternatives considered:

- Containerize the apps too. Rejected for development: slower hot reload and file watching through Docker on macOS, for no benefit in a solo project.
- Testcontainers for tests. Still an option for integration tests later; it does not replace a database for `pnpm dev`.

Consequences: a fresh clone runs end-to-end with `docker compose up -d`, `pnpm install`, copying the `.env.example` files, `pnpm --filter api migrate` and `pnpm dev`. Real secrets never go in the compose file; production credentials come from the hosting platform's environment variables.

## 010. Prettier for formatting, ESLint 9 flat config for code quality

Date: 13.10.2026

Context: The API used ESLint 8 with a legacy `.eslintrc.js` and ran Prettier as an ESLint rule (`eslint-plugin-prettier`), while web used an ESLint 9 flat config, and there was no shared Prettier config. Quote style was mixed, and the API `lint` script ran `--fix`, so in CI it would have silently repaired errors and passed.

Decision: one root Prettier config for the whole repo, run on its own (`pnpm format` / `format:check`), and ESLint only for code quality, with `eslint-config-prettier` switching off the conflicting stylistic rules. Every workspace uses an ESLint 9 flat config: the API is based on the NestJS starter with type-aware `recommendedTypeChecked` rules, and `packages/ui` gets React Hooks and Storybook rules. `lint` never fixes; `lint:fix` does. The codebase was reformatted in one dedicated commit, which is listed in `.git-blame-ignore-revs`.

Alternatives considered:

- Keep `eslint-plugin-prettier`. Rejected: slower, mixes two concerns, and reports formatting as lint errors. Prettier's own docs advise against it.
- ESLint 10, the current major. Tried and rolled back: `eslint-config-next@16.3.5` pulls in `eslint-plugin-react@7.37.5`, which crashes on ESLint 10. Revisit when Next.js supports it.

Consequences: formatting is never discussed in review; `pnpm format` settles it. The type-aware rules immediately found three real issues (a floating promise, an unnecessary non-null assertion and an `any` in a test). ESLint 9 shows as deprecated in pnpm until the Next.js ecosystem moves.

## 011. One TypeScript version for the whole monorepo via a pnpm catalog, on TypeScript 6

Date: 13.10.2026

Context: The root pinned TypeScript 5.1.3, which `packages/ui` silently used through hoisting, while `apps/api` and `apps/web` resolved 5.9.3. `@nestjs/schematics@12` requires TypeScript `>=6`. TypeScript 7 (the native Go port) is out, but `typescript-eslint` supports only `<6.1`.

Decision: define the version once in the `catalog` of `pnpm-workspace.yaml` (`typescript: ~6.0.3`) and reference it as `"typescript": "catalog:"` in every package.json. TypeScript 6 deprecates `baseUrl`, so it was removed from `apps/api` together with the one import that relied on it. Every workspace has a `typecheck` script, and the root `pnpm typecheck` runs them all.

Alternatives considered:

- Stay on 5.9 and silence the schematics peer warning. Rejected: it hides a real incompatibility instead of resolving it.
- TypeScript 7. Not possible yet, because `typescript-eslint` does not support it.
- `ignoreDeprecations: "6.0"` to keep `baseUrl`. Rejected: it only postpones the break to TypeScript 7, and CLAUDE.md already forbade the bare `src/...` imports that `baseUrl` enabled.

Consequences: a TypeScript upgrade is one line in one file, and no package can drift onto another version. Moving to TypeScript 7 later is the same one-line change, once `typescript-eslint` supports it.

## 012. Conventional Commits, enforced by commitlint locally and in CI

Date: 13.10.2026

Context: Commit messages like `add: ...` and `update: ...` don't map to the CHANGELOG's Keep a Changelog sections, and a convention that is only documented erodes over time.

Decision: Conventional Commits (`type(scope): subject`, header ≤ 100 characters, optional workspace scope and `[TASK-ID]` suffix), checked by `@commitlint/config-conventional` in two places. Locally, a `commit-msg` git hook from `simple-git-hooks` rejects a bad message before the commit exists; the root `prepare` script installs it on `pnpm install`. In CI, every commit a push or PR adds is checked (`fetch-depth: 0`); the SHAs reach the script through `env`, not inline `${{ }}` interpolation.

Alternatives considered:

- Husky. Works, but `simple-git-hooks` is smaller and fits a single hook with zero configuration.
- Only CI, no hook. Rejected: on a solo project that pushes straight to `main`, CI would only flag the message after it is already in history.
- Rewrite the old history. Rejected: those commits are already pushed; CI only checks new commits.

Consequences: the commit log can drive CHANGELOG entries, since `feat` and `fix` map to Added and Fixed. `SKIP_SIMPLE_GIT_HOOKS=1` is the emergency bypass.

## 013. Claude Code project settings committed to the repo: guardrails and an auto-format hook

Date: 14.10.2026

Context: Much of this project is developed with an AI coding agent (Claude Code). Without project-level settings, every session relies on the agent remembering conventions, it can read `.env` files (which would put secrets into the model's context), and it needs approval for every harmless command.

Decision: a committed `.claude/settings.json` with three parts. A `PostToolUse` hook runs `.claude/hooks/formatEditedFile.mjs`, which applies Prettier and `eslint --fix` to every file the agent edits. `deny` rules block reading real env files (`.env`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`, `.env.test`), listed one by one so that `.env.example` stays readable. `allow` rules cover read-only commands (`pnpm test`, `lint`, `typecheck`, `format:check`, `git status/diff/log`).

Alternatives considered:

- Rely on CLAUDE.md instructions alone. Rejected: instructions are advice, while hooks and permission rules are enforced.
- Keep the settings in the user's local config only. Rejected: invisible in the repo, not reviewable, and lost on another machine.

Consequences: the agent's output passes through the same formatting and lint gates as hand-written code, and changes to the agent's permissions show up in `git diff` and go through review like any other change. Limitation: `Read` deny rules govern the agent's file tools; a hard guarantee for shell commands needs the Bash sandbox, a user-level setting.
