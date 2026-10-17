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

**Status:** ✅ DONE (2026-10-12)

**Notes:** Added `validation.passwordRequired` ("Enter your password."). Also did the optional part, so this class of bug now fails at compile time:

- `src/i18n/appConfig.types.ts` types next-intl's `AppConfig.Messages` against `en.json`, so every `t('...')` call is checked.
- Zod errors are translation keys stored as plain strings, which typed `t()` cannot check. Schemas now build them with `validationKey('...')` from `src/i18n/validationKey.ts`, which only accepts keys of the `validation` namespace. Field error types use `ValidationMessageKey`.

Verified:

- With the key temporarily removed, `tsc` fails on `validationKey('passwordRequired')`, and in the browser (headless Chrome via Playwright) the form shows the raw `validation.passwordRequired` and logs `MISSING_MESSAGE`.
- With the key, `tsc` and ESLint pass, and an empty password shows "Enter your password." with no console errors.

**Problem:** `apps/web/app/login/login.schema.ts` uses the error key `passwordRequired`, which does not exist in `messages/en.json`. Submitting an empty password shows a raw key or throws a next-intl error.

**Fix:** Add `validation.passwordRequired`. Optionally make the translation keys type-checked against `en.json` (next-intl `AppConfig` / `Messages` typing) so this class of bug fails at compile time.

**Done when:** Submitting an empty password on `/login` shows a proper message.

### CRIT-05 — Add the `migrate` script and verify the Prisma config file name

**Status:** ✅ DONE (2026-10-12)

**Notes:** Renamed `prisma7.config.ts` to `prisma.config.ts` (`git mv`), so every Prisma CLI command finds it without `--config`. Added `migrate` (`prisma migrate dev`), `migrate:deploy` (`prisma migrate deploy`) and `prisma:generate` (`prisma generate`) to `apps/api/package.json`. Verified against a throwaway `postgres:17-alpine` container with `DATABASE_URL` overridden (the `dotenv/config` import does not override variables already set): `pnpm --filter api migrate` applies `init_player` and creates `players`; on a recreated empty database, `migrate:deploy` applies it too; `prisma:generate` writes the client to `src/generated/prisma`. The CLI prints `Loaded Prisma config from prisma.config.ts`.

**Problem:** CLAUDE.md documents `pnpm --filter api migrate`, but `apps/api/package.json` has no such script. The Prisma config is named `prisma7.config.ts`, while the CLI looks for `prisma.config.ts` by default.

**Fix:** Rename to `prisma.config.ts`, or pass `--config` explicitly. Add `migrate` (`prisma migrate dev`), `migrate:deploy` and `prisma:generate` scripts.

**Done when:** `pnpm --filter api migrate` works on a fresh database.

---

## REPO — Monorepo and tooling

### REPO-01 — Continuous integration (GitHub Actions)

**Status:** ✅ DONE (2026-10-13). First run on `main` (commit `474b2af`) passed: https://github.com/rafalciecwierz/ashen-contracts/actions/runs/38449561953

**Notes:** `.github/workflows/ci.yml` runs one `verify` job on `ubuntu-latest` on push to `main` and on PRs. It uses `actions/checkout@v7`, `pnpm/action-setup@v6` (pnpm version from `packageManager`) and `actions/setup-node@v7` (Node from `.nvmrc`, pnpm store cached). It cancels superseded runs and has read-only `contents` permissions. Steps:

- `pnpm install --frozen-lockfile`;
- generate code: the Prisma client (`prisma:generate`) and the Next.js route types (`next typegen`);
- lint: API and web;
- typecheck: `tsc --noEmit` in API, web and UI;
- test: API unit tests and the Storybook interaction tests in `packages/ui`, which need headless Chromium (`playwright install --with-deps --only-shell chromium`);
- build: API, web and Storybook.

The workflow calls per-workspace commands directly instead of root scripts, because the root scripts skip `packages/*` and there is no `typecheck` script yet. REPO-05 can replace these steps with root scripts.

A fresh clone found two failures that a working copy hides:

- `apps/web` `tsc` fails with `Cannot find name 'LayoutProps'`. Next.js declares that global type in the gitignored `.next/types`, which only exists after `next dev`/`next build`. CI now runs `next typegen` first.
- API lint failed on the missing final newline in `login.dto.ts` (noted in CRIT-02). Fixed here, because CI cannot be green without it. The API `lint` script runs `eslint --fix`, which in CI would silently repair errors and pass, so CI calls it with `--no-fix`. REPO-04 should split it into `lint` and `lint:fix`.

Verified on a fresh clone with no `DATABASE_URL` or `API_URL` set: every step passes (API 10/10 tests, UI 14/14 story tests). The YAML parses; actionlint was not available locally. The README has a CI badge.

Not in CI yet: `test:integration` (broken, API-10), lint for `packages/ui` (no ESLint config there; REPO-04), and caching the Playwright browser download.

**Problem:** There is no CI. Bugs like CRIT-01 and CRIT-02 only show up on someone else's machine.

**Fix:** Add a workflow on `ubuntu-latest` that runs `pnpm install --frozen-lockfile`, lint, typecheck, unit tests and the build for all workspaces, with the pnpm store cached. Use Node from `.nvmrc` (≥ 24.9 is required since CRIT-03). Run it on push to `main` and on PRs.

**Done when:** CI is green on `main`, and README shows a CI badge.

### REPO-02 — `docker-compose.yml` for Postgres and Redis

**Status:** ✅ DONE (2026-10-13)

**Notes:** `docker-compose.yml` was already committed with API-09 (`cf9aaf3`). It defines:

- `postgres:17-alpine` and `redis:8-alpine`, each with a health check and a named volume;
- ports bound to `127.0.0.1` only, so the hard-coded dev credentials are not reachable from the network;
- Redis with AOF persistence, so queued jobs survive a restart (ADR #001), and `maxmemory-policy noeviction`, as BullMQ requires.

This commit adds:

- `apps/api/.env.example`: `DATABASE_URL` now matches the compose database.
- `prisma generate` in the API `postinstall`. A fresh clone showed that `migrate dev` in Prisma 7 no longer generates the client, so `pnpm dev` failed on the missing `src/generated/prisma`. CI no longer needs its own generate step, so that step was removed from the workflow.
- README "Getting started" (compose, `.env` copy, migrate) and the ARCHITECTURE "Local development" section.

Verified on a fresh clone with empty volumes: `docker compose up -d`, then `pnpm install`, `cp .env.example .env`, `pnpm --filter api migrate` and `pnpm dev` all work. Through the web app, `/login` returns 200, and register and login go through the Next.js route handlers to the API and Postgres; login sets the session cookie. Redis reports `noeviction`.

The web app still needs `API_URL`, which was set by hand for the test. Documenting it is REPO-03. Besides the `.env` copy, the "Done when" command sequence therefore needs that one extra variable until REPO-03 lands.

**Problem:** README and ARCHITECTURE promise a one-command local setup, but it is only planned. Redis is needed soon for BullMQ.

**Fix:** Add a compose file with Postgres and Redis (named volumes, health checks), and set the matching `DATABASE_URL` in `.env.example`. Update the README "Getting started" section.

**Done when:** A fresh clone runs end-to-end with `docker compose up -d && pnpm install && pnpm --filter api migrate && pnpm dev`.

### REPO-03 — `.env.example` for `apps/web` and env documentation

**Status:** ✅ DONE (2026-10-13)

**Notes:** `git grep process.env` (excluding generated code) finds 7 variables. All of them are now in an `.env.example` file, each with a comment and a working local default:

- `apps/api/.env.example`: `DATABASE_URL`, `PORT`, `JWT_SECRET` (with an `openssl rand -base64 32` hint), `CORS_ORIGIN`, and `NODE_ENV=development`. Its comment notes that `nest start` does not set `NODE_ENV`, so a deployment must set `NODE_ENV=production`, or Swagger stays exposed.
- New `apps/web/.env.example`: `API_URL`, meant to be copied to `.env.local`. `NODE_ENV` is documented in a comment only, because Next.js sets it itself and warns about non-standard values set in env files.
- `apps/web/.gitignore` keeps ignoring `.env*` but adds `!.env.example` (confirmed with `git check-ignore`). The root and API ignore rules never matched `.env.example`.
- README "Getting started" copies both example files.

Verified on a fresh clone with no variables set in the shell, only the copied example files: migrate, then `pnpm dev`. Through the web app, register and login work, Swagger is served at `/api`, and the API returns `Access-Control-Allow-Origin: http://localhost:3000`. This also closes the `API_URL` gap left open in REPO-02.

**Problem:** `apps/web` needs `API_URL`, but nothing documents it. The API's `.env.example` does not list `CORS_ORIGIN` or `NODE_ENV`.

**Fix:** Add `apps/web/.env.example` and complete `apps/api/.env.example`. Root `.gitignore` must not ignore `.env.example`; `apps/web/.gitignore` currently has `.env*`.

**Done when:** Every env variable read in the code appears in an `.env.example` file.

### REPO-04 — Unified formatting and linting

**Status:** ✅ DONE (2026-10-13)

**Notes (part 1, tooling):**

- **Prettier:** one root config. The API's `.prettierrc` (`singleQuote`, `trailingComma: all`) moved to the root, so its style becomes the repo style. `prettier` is a root devDependency. `.prettierignore` excludes the lockfile, the generated Prisma client, SQL migrations and the vendored agent skills; `.gitignore` is respected too. Root scripts are `format` (`prettier . --write`) and `format:check`, the latter instead of the `pnpm format --check` named in "Done when".
- **API:** moved from ESLint 8 (`.eslintrc.js`) to an ESLint 9 flat config (`eslint.config.mjs`), based on the NestJS starter: `@eslint/js` + `typescript-eslint` `recommendedTypeChecked` (type-aware rules, as before via `parserOptions.project`) + `eslint-config-prettier`. Dropped `eslint-plugin-prettier`: Prettier runs on its own, not as a lint rule. The `lint` script no longer has `--fix`, so `lint:fix` was added and CI no longer needs `--no-fix`. The type-aware rules found three issues, all fixed: a floating `bootstrap()` promise (now `void`), an unnecessary `!` on `DATABASE_URL` (`strictNullChecks` is off), and an `any` server in the integration spec (now `INestApplication<Server>`).
- **Web:** added `eslint-config-prettier` to the existing flat config.
- **UI:** new flat config: `typescript-eslint` `recommended`, `react-hooks`, `storybook` and `eslint-config-prettier`, plus `lint` and `lint:fix` scripts. It covers 19 files, including `.storybook/`, which needs an explicit un-ignore. No findings.
- Root `lint` is now `pnpm --recursive lint`, so it includes `packages/ui`. That part overlaps REPO-05. CI runs `pnpm lint`.
- Stayed on ESLint 9, as the task says, although 10.12 is current and pnpm flags 9 as deprecated. Tried 10: `eslint-config-next@16.3.5` pulls in `eslint-plugin-react@7.37.5`, which crashes on ESLint 10 (`detectReactVersion`). Revisit when `eslint-config-next` supports 10.

Verified: `pnpm lint` passes in all 3 workspaces. `tsc` in all 3, API tests and the API and web builds pass.

**Notes (part 2, formatting commit):** `pnpm format` reformatted 66 files and nothing else. In Markdown it changed notation only, not content: `*emphasis*` became `_emphasis_`, tables are aligned, `[X]` became `[x]`, and headings get blank lines after them. One manual touch-up: Prettier split the Redis `command` array in `docker-compose.yml` across 8 lines, so it is now a plain string (`docker compose config` resolves it to the same argv). CI gained a `pnpm format:check` step. `.prettierignore` now also lists `apps/web/next-env.d.ts`: Next.js regenerates it on `build`/`typegen`, and Prettier reads only the root `.gitignore`, not `apps/web/.gitignore`, so CI would have failed right after `next typegen`.

Verified: `format:check` and `lint` pass; `tsc` in all 3 workspaces, API tests (10/10), UI story tests (14/14), and the API and web builds pass. Follow-up for the user: add this commit's hash to `.git-blame-ignore-revs`, so `git blame` skips it.

**Problem:** The API uses ESLint 8 with the legacy `.eslintrc.js`, while web uses ESLint 9 flat config. There is no shared Prettier config, and quote style is mixed across files.

**Fix:** Add a root Prettier config, migrate the API to an ESLint 9 flat config, add a `format` script at the root, and format the codebase in one dedicated commit.

**Done when:** `pnpm lint` and `pnpm format --check` pass across all workspaces.

### REPO-05 — Root scripts and the TypeScript version

**Status:** ✅ DONE (2026-10-13)

**Notes:**

- **Root scripts:** `build`, `test`, `lint` and `typecheck` are `pnpm --recursive <script>`, so each one runs in every workspace that defines that script (`dev` still targets the apps only). New per-workspace scripts:
  - `typecheck`: `tsc --noEmit` in api, ui and shared, and `next typegen && tsc --noEmit` in web (route types such as `LayoutProps` are generated and gitignored);
  - `test`: `vitest run` in ui (Storybook interaction tests; they need Playwright's Chromium once).
- **`packages/shared`:** got a `tsconfig.json` (strict) and a `typescript` devDependency, so it is now type-checked on its own, not only through the apps that import it.
- **TypeScript:** one version, 5.9.3, from a pnpm catalog (`catalog:` in `pnpm-workspace.yaml`, referenced as `"typescript": "catalog:"` in all 5 package.json files). Before, the root pinned 5.1.3, which `packages/ui` silently used through hoisting, while api and web resolved 5.9.3. The latest TypeScript is 7.0.2, but `typescript-eslint` supports only `<6.1`. Moving to TypeScript 6 remains REPO-08's decision.
- **CI:** now calls `pnpm lint`, `format:check`, `typecheck`, `test` and `build` (plus `build-storybook`). The separate `next typegen` step was dropped, because web's `typecheck` script runs it.

Verified: all five root scripts pass, both in the working copy and on a fresh clone with the change applied. That covers API tests 10/10, UI tests 14/14, and `tsc` in 4 workspaces.

**Problem:** Root `test`, `lint` and `build` only target `apps/*`, so `packages/ui` is skipped. There is no `typecheck` script. Root `typescript` is pinned to `5.1.3`, but `@nestjs/swagger@12` needs at least 5.5.

**Fix:** Include `packages/*` where relevant, add `typecheck` (`tsc --noEmit` per workspace), and align the TypeScript version across workspaces.

**Done when:** `pnpm typecheck` and `pnpm test` cover every workspace.

### REPO-06 — Add a LICENSE

**Status:** ✅ DONE (2026-10-13)

**Notes:** Chose MIT: the most common license for portfolio code, short, and it lets anyone read and reuse the code as long as the copyright notice stays. Added `LICENSE` (standard MIT text, `Copyright (c) 2026 Rafał Ciećwierz`). Set `"license": "MIT"` in all 5 package.json files: the API previously said `UNLICENSED`, the others had no field. Added a "License" section to the README.

**Fix:** Add a `LICENSE` file (e.g. MIT) and set `license` in the package.json files.

### REPO-07 — Adopt Conventional Commits

**Status:** ✅ DONE (2026-10-13)

**Notes:** CLAUDE.md now has a "Commit messages" section: `type(scope): subject [TASK-ID]`, a header of at most 100 characters, how types map to the Keep a Changelog sections, workspace scopes, and an example. It is enforced in two places:

- **Locally:** `@commitlint/cli` with `@commitlint/config-conventional` (`commitlint.config.mjs`) runs in a `commit-msg` hook. The hook comes from `simple-git-hooks` and is installed by the root `prepare` script on `pnpm install`. The package's own postinstall is declined in `allowBuilds`, because pnpm blocks dependency build scripts by default and `prepare` does the same job. `SKIP_SIMPLE_GIT_HOOKS=1` skips the hook in an emergency.
- **CI:** a "Lint commit messages" step, with `fetch-depth: 0`, checks only the commits a push or PR adds. For a new branch or a force-push, where the previous tip is unknown, it checks the latest commit. The SHAs are passed through `env`, not interpolated into the script.

Old history is not rewritten. 35 of the 64 commits predate the convention (`add: ...`, `update: ...`).

Verified: the hook accepts `chore: add MIT license [REPO-06]` and `fix(api): ... [API-09]`, and rejects `add: logout functionality` (type-enum), `Fix: Something` (type-case, subject-case) and a 107-character header. The CI range logic was simulated locally for a known previous tip, an unknown one (`--last`) and a range containing an old `add:` commit, which fails. The REPO-05 commit (102 characters) would fail the new rule, but it is already pushed, so CI never checks it again.

**Problem:** The current `add: ...` messages don't map to Keep a Changelog sections.

**Fix:** Document the convention (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:` plus a `[TASK-ID]` suffix) in CLAUDE.md. Optionally add commitlint.

### REPO-08 — Resolve remaining peer warnings from the NestJS CLI

**Status:** ✅ DONE (2026-10-13)

**Notes:**

- **webpack:** nothing in the project used it. `ts-loader`, a NestJS starter leftover only needed for the webpack builder (the build uses `tsc`), pulled it in. Removed `ts-loader` together with three other unused starter devDependencies: `ts-node`, `tsconfig-paths` (the Nest CLI ships its own) and `source-map-support`. The lockfile still held the CLI's optional peers (`webpack`, `ts-loader`, `webpack-node-externals`, `tsconfig-paths-webpack-plugin`) from the old resolution, and neither `pnpm dedupe` nor `pnpm update` dropped them. Removing and re-adding `@nestjs/cli` did. An isolated install of `@nestjs/cli` confirmed that pnpm does not install those optional peers on its own.
- **TypeScript 6:** moved the whole repo to **6.0.3** through the catalog (`~6.0.3`). It satisfies `@nestjs/schematics` (`>=6`), stays inside `typescript-eslint`'s supported range (`<6.1`), and is the stepping stone to TypeScript 7 (7.0.2 is out, but `typescript-eslint` does not support it yet). The only breakage was `baseUrl`, deprecated in 6.0 (error TS5101). Instead of `ignoreDeprecations`, removed `baseUrl` from `apps/api/tsconfig.json` and fixed the one import that relied on it (`'src/prisma/prisma.module'` in `auth.module.ts`, an API-10 item). CLAUDE.md's import rule was updated to match.

Verified: `pnpm peers check` reports nothing for `apps/api`. The two remaining issues come from `@storybook/addon-vitest` (vitest 5 vs `^3 || ^4`) and are UI-07's. On TS 6: `typecheck`, `lint` (no unsupported-TS warning), `format:check`, `test` and `build` pass, `nest g service --dry-run` works, the built API boots and serves `GET /` against the compose Postgres, and `test:integration` passes.

**Problem:** Found during CRIT-03. `@nestjs/schematics@12` wants `typescript >=6.0.0`, while 5.9 is installed. `@nestjs/cli@12` wants `webpack ^5.105.4`, while 5.97 is installed through a transitive dependency. Both are dev-time tooling (`nest generate`, and webpack is unused because the build uses `tsc`), so nothing is broken today.

**Fix:** Decide on TypeScript 6 for `apps/api` (or the whole repo, together with REPO-05). Check where the old webpack comes from and whether it can be deduplicated or dropped.

**Done when:** `pnpm peers check` reports no issues for `apps/api`.

---

## AI — AI tooling setup

### AI-01 — Sync CLAUDE.md with the actual codebase

**Status:** ✅ DONE (2026-10-14)

**Notes:** Of the listed problems, the `migrate` command (CRIT-05), the file naming (CRIT-01) and Jest (CRIT-03) were already fixed by earlier tasks. Changes in this task:

- Fixed the `_components/` example path (`app/play/_components/`, not `src/app/...`). Stated that `src/components/` does not exist yet and is created with the first shared component. Documented where code lives in `apps/web` (`app/` for routes and BFF handlers, `src/` for modules, imported as `@/src/...`).
- Tech stack: now lists only what is installed, with major versions (Next.js 16, NestJS 12, Prisma 7, TypeScript 6, Tailwind v4, next-intl, Zod, Radix UI), the tooling, and the local infra. Redis/BullMQ, Socket.io and Cypress are listed as planned, because none of them is installed. Testing now describes the three Vitest setups.
- Replaced the `[Add naming conventions...]` placeholder with the actual API naming (camelCase plus the Nest role suffix, `.spec.ts`, `test/*.integration-spec.ts`), checked against every file in `apps/api/src`. Web naming now also covers `packages/ui` and stories.
- Added the rule from this task: update the relevant `docs/` file in the same commit when architecture or conventions change.
- Commands: added `docker compose up -d`, noted what `pnpm install` also does, and documented `migrate:deploy`. "Where to find more context" now also points to `ARCHITECTURE.md` and `REFACTOR.md`.
- "Current status": filled in, as a list so the lines don't run together.

Verified with a script: every path in backticks exists, except the planned `src/components/`, which the text marks as such. Every command exists (`pnpm --filter ui` resolves `@ashen-contracts/ui`), and all of them ran during the earlier tasks. `apps/web/CLAUDE.md` / `AGENTS.md` are generated by Next.js and were left alone.

**Problem:** CLAUDE.md is out of date in several places:

- It says `src/app/play/_components/`, but the code has `app/play/_components/`.
- The naming convention does not match the files in git (see CRIT-01).
- It lists a `migrate` command that does not exist.
- "Current status" still has `[update me]` placeholders.
- It says Jest is used for unit tests, but `packages/ui` uses Vitest.

AI agents trust CLAUDE.md more than the code, so drift here produces wrong code.

**Fix:** Correct every statement. Add a rule: _"When a change alters architecture or conventions, update the relevant `docs/` file (spec, ADR, CLAUDE.md) in the same commit."_ Point to `docs/REFACTOR.md`.

**Done when:** Every path and command in CLAUDE.md exists and works.

### AI-02 — Project `.claude/settings.json` with hooks and permissions

**Status:** ✅ DONE (2026-10-14)

**Notes:** Added a committed `.claude/settings.json` (with `$schema` for editor validation) and `.claude/hooks/formatEditedFile.mjs`:

- **Hook:** `PostToolUse` on `Edit|Write` runs the script, which reads the edited path from the hook's stdin JSON. It runs Prettier (`--ignore-unknown`, so `.prettierignore` applies), then `eslint --fix` from the nearest workspace that has an `eslint.config.mjs`. It skips files outside the repo and in `node_modules`, and it never blocks: leftover lint errors are for `pnpm lint` and CI. The script is in Node instead of a `jq` one-liner, so it needs no extra tool and stays readable. It takes about 2.6 s per API file, because the type-aware lint dominates.
- **Deny:** `Read(**/.env)`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production`, `.env.test`. Each name is listed explicitly, because a broad `.env*` deny would also block `.env.example`, and deny rules beat allow rules.
- **Allow:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and `git status` / `git diff` / `git log` (the last one added as another read-only command).

Verified:

- Pipe test: a file with double quotes, bad indentation and `let` came back with single quotes, fixed indentation and `const`.
- Live: an Edit that wrote `return "Hello World!"` with wrong indentation was reformatted immediately (empty `git diff`).
- The Read tool on a dummy `.env.test` (fake content, deleted afterwards) was refused with "denied by your permission settings".
- `jq` and Prettier accept the JSON.

Limitation: `Read(...)` deny rules govern Claude's file tools. A shell command such as `cat .env` was also refused in the test session, but it is unclear whether this rule or the session's permission mode refused it. For a hard guarantee, enable the Bash sandbox, which applies `Read` deny rules to shell commands too. That is a user-level choice, not part of this repo.

**Fix:** Add a committed `.claude/settings.json` with:

- a `PostToolUse` hook that runs Prettier and ESLint `--fix` on edited files;
- `deny` rules for reading `.env*` files;
- an allowlist for safe commands (`pnpm test`, `pnpm lint`, `pnpm typecheck`, `git status`, `git diff`).

**Done when:** Edits made by Claude come out formatted, and `.env` contents cannot be read by the agent.

### AI-03 — Project skills or slash commands for repeated workflows

**Status:** ✅ DONE (2026-10-14), partly: `implement-feature` and `release` are deferred to AI-08 and AI-09.

**Notes:** A hybrid of our own skills for project-specific procedures and a few well-made third-party ones for general techniques. All of them are files in `.claude/skills/`, so they are versioned and reviewed like code.

- **Own:**
  - `refactor-task <ID>`: the process used for this backlog (one task, verify, preferably on a fresh clone, notes in the paragraph format, no commit, Conventional Commits message). It replaces what had lived only in the agent's private memory, which was deleted to keep a single source of truth.
  - `adr`: appends to `DECISIONS.md` in its format, never rewrites, and supersedes by a new entry. When to offer an ADR at all follows three criteria adapted from mattpocock/skills (hard to reverse, surprising, a real trade-off).
- **Third-party** from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT), pinned at `49dd158`: `grill-me` + `grilling` (round-based interview over a decision tree; `grill-me` is user-only), `tdd` (agree on seams first, vertical slices, no tautological tests, mock only at system boundaries) and `diagnosing-bugs` (build a red-capable loop before forming hypotheses). Each folder has the verbatim `LICENSE` (the MIT condition) and a `NOTICE.md` with the source commit and the changes. The changes: references to `GLOSSARY.md`/ADR files now point to `docs/features/` and `DECISIONS.md`, and references to skills not installed here (`codebase-design`, `code-review`) were removed. These folders are in `.prettierignore`, so they stay byte-identical to upstream apart from the documented edits.
- **Not taken:**
  - `domain-modeling` / `grill-with-docs`: they write ADRs as separate `docs/adr/0001-*.md` files in a minimal format, and the model can trigger them on its own, so they would fork the ADR log.
  - The issue-tracker workflow (`setup`, `to-tickets`, `triage`, `implement-spec`): this repo uses `docs/features` and REFACTOR.md instead.
  - Installing through the plugin (it auto-updates prompts without review) or `npx skills add` (it may write copies for several agents, which is the clutter AI-04 removes).
- CLAUDE.md "Where to find more context" lists the skills.

Verified: every SKILL.md has valid frontmatter whose `name` matches its folder. The diff against upstream shows only the documented edits (`grilling` is byte-identical). `pnpm format:check` passes.

**Fix:** Add these to `.claude/skills/`:

- `implement-feature`: reads a `docs/features/*.md` spec, implements it, and ticks off its "Tests to write" list;
- `adr`: appends a DECISIONS.md entry in the defined format;
- `release`: moves CHANGELOG `[Unreleased]` to a version, ticks ROADMAP, and creates the git tag;
- `refactor-task <ID>`: does a task from this file and updates its status.

### AI-04 — Trim the Prisma agent skills

**Status:** ✅ DONE (2026-10-15)

**Notes:** All Prisma skills were removed instead of trimmed, and nothing syncs skills any more. The problem statement was wrong about the mechanism: `prisma skills sync` is not a command in the installed Prisma CLI (7.10.0 prints `Unknown command "skills"`), and `|| exit 0` hid that failure on every install. The skills on disk came from a one-off `npx skills add prisma/skills` on 2026-09-23 (that tool's lockfile is `skills-lock.json`), went into five agent folders (`.agents`, `.claude`, `.cursor`, `.devin`, `.windsurf`), were gitignored, and were never updated. A fresh clone got none of them. Changes:

- `postinstall` is now just `prisma generate`, and `apps/api/skills-lock.json` is removed.
- The agent folders' entries were removed from `apps/api/.gitignore` and `.prettierignore`, so a future stray install shows up in `git status`. The local copies were deleted.
- Deviation from the task: vendoring the "relevant" skills was tried first. `prisma-cli`, `prisma-client-api` and `prisma-upgrade-v7` were copied verbatim from prisma/skills `be16a87` into `apps/api/.claude/skills/`, without `prisma-postgres`, which covers the hosted Prisma Postgres product, not PostgreSQL. That approach was dropped after review: the agent already knows the Client API, the v7 migration is finished, the project uses one model with simple queries, and the copies would go stale with every Prisma release. The project-specific Prisma 7 knowledge is in CLAUDE.md and ADR #008.
- New ADR #014 records the policy: only reviewed, committed skills for the project's own procedures, and no vendor reference skills.

Verified with the vendored variant on a fresh clone: `pnpm install --frozen-lockfile` passes, and `postinstall` generates the Prisma client and creates no agent folders. The final variant only removes those files on top of that, so the same holds; `pnpm format:check` passes.

**Problem:** The `postinstall` hook (`prisma skills sync`) installs 9 skills into 4 agent directories. Several are irrelevant (`prisma-mongodb-upgrade`, `prisma-compute`, `prisma-driver-adapter-implementation`) and only add noise to the context.

**Fix:** Keep only the relevant skills (CLI, client API, Postgres, upgrade-v7), and decide whether `postinstall` should still sync skills.

### AI-05 — MCP configuration (`.mcp.json`)

**Status:** ✅ DONE (2026-10-15)

**Notes:** A project `.mcp.json` with two servers. Claude Code asks each user to approve project servers on first use. They are deliberately not pre-approved in `.claude/settings.json`, so a fresh clone never starts third-party processes on its own.

- **`next-devtools`** (`next-devtools-mcp@0.4.0`): discovers a running Next.js 16 dev server and proxies its built-in `/_next/mcp` endpoint (`get_errors`, `get_logs`, `get_page_metadata`, routes). Its anonymous telemetry is switched off in the server's `env` (`NEXT_TELEMETRY_DISABLED=1`), so nobody's machine reports usage without being asked. Since 0.4.0 its `nextjs_docs` tool only points to the docs Next.js bundles in `node_modules/next/dist/docs/`, and `browser_eval` only points to Vercel's `agent-browser` CLI, which is not installed because the Playwright server covers that.
- **`playwright`** (`@playwright/mcp@0.0.83`): a headless, isolated (in-memory profile) Chromium. Screenshots, snapshots and console logs go to `.playwright-mcp/`, which is gitignored.
- Both run through `pnpm --silent dlx` with exact versions, more than two weeks old, instead of `npx …@latest` as the vendors suggest. Changes to the agent's tooling are then reviewed like dependency bumps (ADR #014). `pnpm` is the repo's package manager anyway, and `npx` failed on the author's machine (root-owned files in `~/.npm`). `--silent` keeps pnpm's output off stdout, which the stdio protocol uses.
- Prisma MCP was not added, for the same reason as the skills in AI-04: the CLI covers it.
- Deviation from ADR #015's "one Playwright version": the MCP server bundles its own Playwright (1.64 alpha) and browser revision. It is agent tooling run by `dlx`, not a project dependency, so the catalog cannot cover it. It needs a one-time `pnpm dlx @playwright/mcp@0.0.83 install-browser chrome-for-testing`, now in CLAUDE.md. Gotcha: that install deleted the Storybook tests' `chromium_headless_shell-1243`, because Playwright removes revisions it believes are unused. Re-running `pnpm --filter @ashen-contracts/ui exec playwright install --only-shell chromium` restored it, and after that both revisions stay side by side.
- CLAUDE.md "Tech stack" lists the servers. The `refactor-task` skill's verification step mentions them for UI changes.

Verified with a stdio probe that starts each server exactly as `.mcp.json` defines it, completes the MCP handshake and calls a tool. Against a running `pnpm dev`, `nextjs_index` found the server on port 3000, and `get_errors` returned a hydration mismatch on `/`. Its diff showed only `bis_skin_checked` attributes, injected by a browser extension, not an app bug: the Playwright server's clean browser loaded `/login` and `/register` with no console errors and produced a correct screenshot. `pnpm --filter @ashen-contracts/ui test` passes (14/14) after the browser restore, and `pnpm format:check` passes. Found along the way: the page title is still "Create Next App", already covered by WEB-07.

**Fix:** Add a project `.mcp.json` with the Next.js DevTools MCP (Next 16) and the Playwright MCP, so the agent can inspect runtime errors and verify the UI. Prisma MCP is optional.

### AI-06 — AI code review in CI

**Status:** ✅ DONE (2026-10-15)

**Notes:** A separate workflow, `.github/workflows/claude-review.yml`, so the review never blocks or slows the `ci.yml` gate. Decisions:

- **Trigger:** `pull_request` `opened`, `reopened` and `ready_for_review`. Drafts are skipped. `synchronize` is left out, so each PR gets one review and the cost stays predictable; closing and reopening the PR asks for another. PRs from forks are skipped, because they get no secrets and the action refuses authors without write access anyway.
- **Credentials:** the step reads both `ANTHROPIC_API_KEY` (billed per token) and `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`, uses a Claude subscription). The action accepts whichever one is set, so the choice is made by creating a secret, not by editing the workflow. Without either secret, the job prints a notice and skips the review instead of failing, so forks and fresh clones stay green. With the OAuth token, the action cannot classify buffered inline comments (that needs the API key) and posts them all.
- **GitHub access:** the workflow's own `GITHUB_TOKEN` with `contents: read` and `pull-requests: write`, instead of installing the Claude GitHub App, which asks for write access to contents and issues too. Comments appear as `github-actions[bot]`.
- **Tools:** `Read`, `Glob`, `Grep`, `gh pr view/diff/comment` and the inline-comment MCP tool only. No Edit, Write or arbitrary Bash, and `--max-turns 40` with a 15-minute timeout caps a runaway run. The action restores `.claude/` and `CLAUDE.md` from the base branch, so a PR cannot rewrite its own review instructions.
- **Prompt:** CLAUDE.md is the standard, with ADRs, ARCHITECTURE and the feature specs as context. It asks for bugs, security (including client-trusted resource or time values), convention and ADR violations, and tests CLAUDE.md requires, most severe first. Anything CI already checks, praise and nitpicks are excluded.
- **Pinning:** `anthropics/claude-code-action` is pinned to the commit of v1.0.238 (2026-09-30), the newest release at least two weeks old, as in AI-05. A commit SHA rather than a tag, because this third-party action receives a secret and a token that can write to PRs. GitHub's own actions stay on major tags, as in `ci.yml`.
- The model is left at the action's default, so the workflow does not name a model ID that goes stale.

Verified with actionlint 1.7.7 (both workflows pass, including the use of `secrets` in job-level `env`) and `pnpm format:check`. The inputs, the `GITHUB_TOKEN` override, the either-secret check and the inline-comment tool were checked against the action's `action.yml` and source at the pinned commit. Not verified: a real run. That needs a repository secret and a PR, which the user does (see the CLAUDE.md "Tech stack" line). The README section on how AI is used in the project is AI-07.

**Depends on:** REPO-01

**Fix:** Add `anthropics/claude-code-action` for PR reviews, guided by CLAUDE.md conventions.

### AI-07 — README section: "How I use AI in this project"

**Status:** ✅ DONE (2026-10-16)

**Notes:** A new README section, placed after "Tech stack & why" and written for a recruiter or interviewer. It covers every point from the task: specs in `docs/features` (including "Tests to write"), CLAUDE.md and the ADRs as shared context with the same-commit sync rule, the `.claude/settings.json` hook and permission rules (ADR 013), the skills with mattpocock attribution (ADR 014), and the MCP servers (AI-05), which the task predates. "What is reviewed by hand" became a "What stays with me" list: commits, decisions, and CI plus the comment-only AI review (AI-06) as the gate. Every file and link in the section was checked to exist, and each statement was checked against the setup files and ADRs. The README's existing claims (e.g. Cypress in the tech stack table) were left alone, because fixing them belongs to DOC-02.

**Fix:** Explain the setup openly: spec-driven development via `docs/features`, ADRs as shared context, CLAUDE.md, hooks and skills, and what is reviewed by hand. This is a deliberate portfolio differentiator.

### AI-08 — `implement-feature` skill

**Status:** ✅ DONE (2026-10-16)

**Notes:** Written ahead of the planned "right before character creation", at the user's request. `.claude/skills/implement-feature/SKILL.md` follows the four steps above, with two decisions from the user:

- **One commit per stage, on a feature branch** (`feat/<spec-name>`, created by the skill if on `main`): first the spec with its open decisions settled (`docs:`), then each slice. The skill stops after each stage and waits for the user to commit. Slices default to API, then web, and the plan may split a large side further.
- **Open decisions are found in the spec text** (specs have no dedicated section: "suggest", "sketch", "finalize when", content missing from GAME_DESIGN, conflicts with an ADR), settled through `grilling`, and written back into the spec, so it describes what is built.

CHANGELOG, ROADMAP and the CLAUDE.md status go into the last slice's commit, per the docs-in-sync rule. Listed in CLAUDE.md and the README's AI section. Deviation from "Done when": the user decided the task is writing the skill, not trying it out. The skill gets its first real run, and the adjustments that brings, with character creation, once the rest of the backlog is done.

**Depends on:** AI-03

**Fix:** A skill that implements a `docs/features/*.md` spec in stages, not autonomously:

1. Read the spec, GAME_DESIGN, DECISIONS and ARCHITECTURE.
2. Present a plan and resolve the spec's open decisions with the user (via `grilling`).
3. Implement in vertical slices (API, then web) with tests from "Tests to write" (via `tdd`).
4. Update CHANGELOG `[Unreleased]`, ROADMAP and, if warranted, an ADR. Never commit.

Write it right before character creation and refine it on that first feature.

**Done when:** Character creation was built with it, and the skill was adjusted with what that revealed.

### AI-09 — `release` skill

**Status:** ✅ DONE (2026-10-16)

**Notes:** `.claude/skills/release/SKILL.md`, user-only (`disable-model-invocation: true`), invoked as `/release 0.1.0`. Three steps: check, prepare, hand over. Decisions:

- **Checks before any edit:** semver higher than the newest tag, a clean `main` that matches `origin/main`, every item of the ROADMAP version ticked (ROADMAP requires complete vertical slices; patch releases skip this), a non-empty `[Unreleased]`, and lint, format, typecheck, tests and build passing. CI status is confirmed by the user, because `gh` isn't installed here.
- **CHANGELOG:** entries move to `## [x.y.z] - date`, empty sections are dropped, and Keep a Changelog link references (`[Unreleased]` compare, the version's release or compare link) are added. ROADMAP gets the ✅ marker and a "Log" line, and CLAUDE.md "Current status" is updated, all in one `chore: release vX.Y.Z` commit.
- **`package.json` versions are not bumped.** Every workspace is private and never published, and they already disagree (root and web 0.1.0, api 0.0.1, packages 0.0.0). The tag and CHANGELOG are the version record.
- **Printed commands:** an annotated tag (`git tag -a`), and `git push origin vX.Y.Z` instead of the task's `git push --tags`, which would push every local tag. A note covers a protected `main` (tag the merge commit).

Listed in CLAUDE.md and the README's AI section. Deviation from "Done when": as with AI-08, the user decided the task is writing the skill; its first run is the v0.1.0 release. The commented-out `[0.1.0]` template in CHANGELOG.md, which lists planned features rather than shipped ones, was left alone: the skill builds the section from `[Unreleased]`, so the template can go once v0.1.0 is cut.

**Fix:** A user-only skill (`disable-model-invocation: true`) that moves CHANGELOG `[Unreleased]` to a version, ticks ROADMAP, and prints the `git tag` / `git push --tags` commands for the user to run. It never tags or pushes itself.

**Done when:** v0.1.0 was released with it.

---

## DOC — Documentation drift

### DOC-01 — Update `docs/features/01-auth.md` to match the implemented auth

**Status:** ✅ DONE (2026-10-15)

**Notes:** Rewrote the spec against the code, keeping its structure. The "Token storage — open decision" section became "Session: BFF and httpOnly cookie", marked as resolved by ADR #005: the three route handlers (`register`, `login`, `logout`), `getCurrentUser()` for Server Components, the cookie flags, and the server-only `API_URL` (no `NEXT_PUBLIC_` variant). The spec also had drifted beyond what the task named, so these were brought in line too: the 7-day expiry is now decided, not a placeholder; `POST /auth/register` returns `{ id, email }` and issues no token; register redirects to `/login?registered=true`, and login to a safe `?redirect=` target or `/play`, not `/`; `/play` is protected and logout exists; the endpoints list the error `code`s; `Input` is built. The "Tests to write" list now marks which tests exist and points the missing ones to API-11, WEB-10 and WEB-11, and the edge cases point to API-07 (login timing) and API-08 (validation errors have no `code`). A `Status` field and a "Deviations from spec" section are left for DOC-03. The ADR #005 text and the comments in `src/http/endpoints.ts` say `src/app/api/**`, while the route handlers live in `app/api/`; the spec uses the real path, and WEB-01 (moving `app/` into `src/app/`) makes the others correct, so they were left alone. Verified by reading every file the spec describes (API auth module, DTOs, guard, BFF route handlers, `src/http`, pages, shared types, `.env.example`), a repo-wide search for `localStorage` and `NEXT_PUBLIC_API_URL` (only ADR #005 mentions them now, as history), and `pnpm format:check`.

**Problem:** The spec still describes localStorage, a Bearer token sent from the client, and `NEXT_PUBLIC_API_URL`. All of that was rejected in ADR #005.

**Fix:** Describe the BFF, the httpOnly cookie and `API_URL` as implemented, and mark the "open decision" as resolved, linking to ADR #005.

### DOC-02 — Fix small inconsistencies across docs

**Status:** ✅ DONE (2026-10-16)

**Notes:** All four points, with two deviations:

- CHANGELOG: the BFF path is now `apps/web/app/api/auth/**`, and the JWT Guard bullet is a top-level item with `@Public()` in code formatting.
- ROADMAP: "Navbar" was only half done. The navbar on `/play` (logo, user menu with logout) exists, but no public page has one with login/register links. The item was split into those two, and only the first is ticked.
- Cypress → Playwright in README (tech stack table), CLAUDE.md ("Planned": Playwright e2e in `apps/e2e`) and ARCHITECTURE (Testing, marked as planned, auth flow first).
- `errors.ts`: the reference to a non-existent ADR was replaced with the actual reason (the package ships raw `.ts` with no build step). No ADR was written, because SHARED-01 plans runtime code in `packages/shared` (shared constants or Zod schemas), which would reverse the decision soon. A note for that was added to SHARED-01.

Verified: `git grep -i cypress` now finds Cypress only in the lockfile (a Storybook peer dependency), the ADR that rejected it, and this file. `pnpm format:check`, `pnpm lint` and `pnpm typecheck` pass.

**Fix:**

- CHANGELOG: change `src/app/api/auth/**` to the real path, and fix the formatting of the `-JWT Guard` bullet.
- ROADMAP: tick "Navbar" (it is already committed).
- ARCHITECTURE, README and CLAUDE.md: replace Cypress with Playwright as the e2e tool (decided in DECISIONS.md #015).
- `packages/shared/src/types/errors.ts`: remove or fix the reference to a non-existent "type-only shared" ADR, or write that ADR.

### DOC-03 — Status field in feature specs

**Status:** ✅ DONE (2026-10-17)

**Notes:** Every spec in `docs/features/` now has a `**Status:**` line under its title (the same bold-field style as this file) and a "Deviations from spec" section at the end. `01-auth.md` is `done`; the other four are `planned`, with "None yet" as their deviations. The auth deviations are measured against the spec as first written (before DOC-01): `localStorage` replaced by the BFF and httpOnly cookie (ADR #005), register returning `{ id, email }` instead of a JWT, and the login redirect going to `/play` instead of `/`. Auth is marked `done` even though some of its tests are missing, because the ROADMAP ticks it and the missing tests already have tasks; a "Known gaps" bullet points to API-07, API-08, API-11, WEB-10 and WEB-11 so the status doesn't overclaim. Beyond the task text: the `implement-feature` skill now sets the status (`in progress` once the spec's decisions are committed, `done` in the last slice) and requires a deviation line whenever a slice changes the spec, because otherwise nothing keeps the field current. README ("Specs before code") and CLAUDE.md ("Where to find more context", which also said `docs/features/` only held the feature currently being built) mention the field. Verified with `pnpm format:check` and by reading the auth deviations against the DOC-01 diff (`git show 7d77571`).

**Fix:** Add `Status: planned | in progress | done` and "Deviations from spec" to each `docs/features/*.md`.

---

## API — Backend (NestJS)

### API-01 — Enable strict TypeScript

**Status:** ✅ DONE (2026-10-17)

**Notes:** `apps/api/tsconfig.json` now sets `"strict": true` with `"strictPropertyInitialization": false`. The explicit opt-outs were removed rather than flipped: `strictNullChecks`, `noImplicitAny` and `strictBindCallApply` (all part of `strict`), and `forceConsistentCasingInFileNames: false` (a NestJS starter leftover; the TypeScript default is `true`, which guards the kind of casing bug fixed in CRIT-01). `noFallthroughCasesInSwitch` is not part of `strict` and was left as it was. Deviation from the task text ("fix the resulting errors"): full strict produced only four errors, all `strictPropertyInitialization` on the fields of `LoginDto` and `RegisterDto`. The first fix, the definite-assignment `!` on every DTO field, was dropped in review: in Nest the DTOs are the only classes with uninitialized fields, so the check would only ever add `!`s. That check is off instead, matching what `nest new --strict` generates since NestJS 12. DTO fields stay plain, and the reasoning, including the research into both options, is in `docs/DECISIONS.md` #016, with a convention line in CLAUDE.md. The tsconfig has no `include`, so `tsc --noEmit` also type-checks the unit and integration specs. Strict mode found no real bug in the current code. Its value is `strictNullChecks` for the code still to come. Verified: `pnpm --filter api typecheck`, `lint`, `test` (10 unit tests) and `build` pass, and so does `pnpm format:check`. The integration tests were not run, because the change only affects types. The ESLint config still has `@typescript-eslint/no-explicit-any` off, which leaves a loophole in `noImplicitAny`. Tightening lint rules is not part of this task.

**Problem:** `apps/api/tsconfig.json` sets `strictNullChecks: false` and `noImplicitAny: false`.

**Fix:** Set `"strict": true` and fix the resulting errors.

**Done when:** `tsc --noEmit` passes in strict mode.

### API-02 — Harden the global `ValidationPipe`

**Status:** ⬜ TODO

**Fix:** Use `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Add a test that confirms unknown fields are rejected.

### API-03 — Validated configuration via `@nestjs/config`

**Status:** ⬜ TODO

**Problem:** `@nestjs/config` is installed but unused. `JWT_SECRET` is read from `process.env` at import time with no validation. A missing secret only fails at the first login.

**Problem (added 2026-10-13, found in REPO-03):** Swagger is fail-open. `main.ts` enables it whenever `NODE_ENV !== 'production'`, so a missing or mistyped value (e.g. `prod`) exposes the API docs in production. `nest start` does not set `NODE_ENV`.

**Fix:** Use `ConfigModule.forRoot({ isGlobal: true, validate })` with a Zod or Joi schema covering `DATABASE_URL`, `JWT_SECRET`, `PORT` and `CORS_ORIGIN`. Switch to `JwtModule.registerAsync` using `ConfigService`, and remove `import 'dotenv/config'` from `main.ts`. Also:

- add `NODE_ENV` to the schema as an enum (`development | production | test`), so a typo stops the app at startup;
- make Swagger fail-closed: enable it only when `NODE_ENV === 'development'`, never just because the value is not `production`;
- update the `NODE_ENV` comment in `apps/api/.env.example`.

**Done when:** The app refuses to start with a clear error when a required variable is missing or `NODE_ENV` is invalid, and a test confirms that `/api` (Swagger) returns 404 unless `NODE_ENV=development`.

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

**Status:** ✅ DONE (2026-10-13)

**Notes:** Done ahead of order because it blocked REPO-02: with `@prisma/adapter-ppg`, the API could not reach the docker-compose Postgres. Migrations worked, because the Prisma CLI uses its own TCP connection, but every query at runtime failed with `ECONNREFUSED 127.0.0.1:443`, since that adapter talks to Prisma Postgres over HTTPS. Changes:

- replaced `@prisma/adapter-ppg` with `@prisma/adapter-pg@^7.10.0` (node-postgres over plain TCP), which works with any Postgres;
- `PrismaService` implements `OnModuleDestroy` → `$disconnect()`;
- `main.ts` calls `app.enableShutdownHooks()`.

Verified on the built `dist/main.js`:

- local compose Postgres: `register` and `login` work;
- the existing Prisma Postgres URL from `apps/api/.env` (TCP on `db.prisma.io:5432`): `login` for an unknown user returns `INVALID_CREDENTIALS`, so the DB round-trip works;
- on SIGTERM the app shuts down cleanly. Postgres goes from 1 to 0 open connections (`pg_stat_activity`), and the exit code is 143, because Nest re-raises the signal after its shutdown hooks run.

Lint, `tsc` and unit tests (10/10) pass. The `pnpm add` reported peer warnings, all of them existing ones from REPO-08 and UI-07.

**Problem:** `@prisma/adapter-ppg` targets Prisma Postgres. Railway, Render and local docker Postgres need `@prisma/adapter-pg`. The client is also never disconnected.

**Fix:** Switch to `@prisma/adapter-pg`, implement `OnModuleDestroy` → `$disconnect()`, and call `app.enableShutdownHooks()`.

### API-10 — Cleanup and health check

**Status:** ⬜ TODO

**Fix:**

- ~~In `auth.module.ts`, replace the bare `'src/prisma/prisma.module'` import with a relative one, per CLAUDE.md.~~ Done in REPO-08, which removed `baseUrl`. Since then `pnpm --filter api test:integration` passes (1/1) even without `DATABASE_URL`, because `GET /` never queries the DB. The `.env` note below still matters once `/health` checks the DB.
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

**Note (from DOC-02):** `packages/shared` is type-only today: it ships raw `.ts` with no build step, and the comment in `src/types/errors.ts` says so. Shared constants or Zod schemas are runtime code, so this task has to give the package a build (or make both apps compile it) and update that comment. Also, `apps/web/src/http/api.ts` imports `AuthErrorCode` without `import type`, which only works because the bundler drops type-only imports.

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

**Depends on:** REPO-02 (done). Decisions are in `docs/DECISIONS.md` #015; this is the setup plan.

**Fix:**

- **Workspace:** create `apps/e2e` (`package.json` with `@playwright/test`, `playwright.config.ts`, `tsconfig.json`, ESLint config, `tests/`). Scripts: `test:e2e`, `lint`, `typecheck`; no `test`, `dev` or `build`, so the recursive root scripts skip it. Root `test:e2e` runs `pnpm --filter e2e test:e2e`.
- **One Playwright version:** add `playwright` and `@playwright/test` to the pnpm catalog and switch `packages/ui` to `catalog:` too.
- **Database:** global setup creates `ashen_contracts_e2e` in the docker-compose PostgreSQL if missing, then runs `prisma migrate deploy` (via `pnpm --filter api`) against it.
- **Servers:** `webServer` entries build and start the API (`nest build` + `start:prod`) and the web app (`next build` + `next start`) on dedicated ports (proposal: API 3101, web 3100), passing `DATABASE_URL`, `JWT_SECRET` (dummy), `PORT`, `CORS_ORIGIN` and `API_URL` through `env`. `dotenv` does not override variables that are already set, so a developer's `.env` cannot leak in. `reuseExistingServer: !process.env.CI`. Check that this works next to a running `pnpm dev` (Next.js 16 keeps dev output in `.next/dev`).
- **Config:** Chromium only, `baseURL` from the web port, `retries: 2` and `trace: 'on-first-retry'` in CI, HTML report.
- **Tests:** register → login → `/play` → logout; logged out, `/play` redirects to `/login?redirect=/play`, and logging in from there lands back on `/play`; a duplicate email shows the inline error. Each test registers its own user with a unique email (a small helper). Prefer role- and label-based locators (`getByRole`, `getByLabel`) over CSS selectors.
- **CI:** an `e2e` job in `ci.yml`, in parallel with `verify`: PostgreSQL 17 as a service container, `pnpm install --frozen-lockfile`, `playwright install --with-deps chromium`, `pnpm test:e2e`, and on failure `actions/upload-artifact` with `playwright-report/` and `test-results/` (short retention).
- **Docs:** README "Getting started" and ARCHITECTURE (how to run e2e, `pnpm --filter e2e exec playwright test --ui` for debugging), CLAUDE.md commands and tech stack.

**Done when:** `pnpm test:e2e` passes locally after `docker compose up -d`, the `e2e` CI job is green, and a deliberately broken assertion produces a downloadable report with a trace.

**Not now:** Firefox/WebKit, a `storageState` setup project, and moving the API integration tests into the job that has a database (a candidate follow-up task once the job exists).

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
