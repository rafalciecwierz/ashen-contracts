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

## 014. Agent skills: only reviewed, committed copies of the project's own procedures; no vendor reference skills

Date: 15.10.2026

Context: the repo had two kinds of agent skills. AI-03 added skills for this project's procedures (`refactor-task`, `adr`) and a few general techniques copied from mattpocock/skills (`tdd`, `diagnosing-bugs`, `grilling`). Separately, a one-off `npx skills add prisma/skills` had installed 11 Prisma reference skills into five agent folders in `apps/api` (`.agents`, `.claude`, `.cursor`, `.devin`, `.windsurf`). Those were gitignored and never updated, and `postinstall` ran `prisma skills sync || exit 0`, which is not a command in Prisma CLI 7.10.0 and failed silently on every install. Some of them covered products the project doesn't use (Prisma Compute, hosted Prisma Postgres, MongoDB).

Decision: `.claude/skills/` holds only skills that encode how this project works, or general techniques it adopts on purpose. Each is a committed file, and third-party ones are copied from a pinned commit with a `NOTICE.md`, so updates are manual and reviewed. Library and vendor reference skills (Prisma, and by the same rule NestJS, Next.js and so on) are not installed. The project's own way of using a library (Prisma 7's driver adapter, the generated client path, ESM) is written down in CLAUDE.md and the ADRs, and the code itself is the reference. Nothing installs or syncs skills automatically.

Alternatives considered:

- Vendor the three relevant Prisma skills (`prisma-cli`, `prisma-client-api`, `prisma-upgrade-v7`) into `apps/api/.claude/skills/`. Tried first, then rejected: the agent already knows the Prisma Client API, the v7 migration is finished, and the project uses one model with simple queries. In exchange for about 125 KB of third-party text that goes stale with every Prisma release, they would have saved almost nothing.
- Keep the auto-installed, gitignored skills. Rejected: a fresh clone gets none of them, they cover irrelevant products, and the silently failing `postinstall` made them look maintained when they weren't.
- Install skills through a plugin or `npx skills add`. Rejected: prompts change without review, and the tool writes copies for several agents.

Consequences: the agent's context in this repo contains only instructions someone has reviewed, and every skill is visible in `git diff`. The cost is that library-specific knowledge the agent lacks has to be added by hand, to CLAUDE.md or an ADR, once a real gap shows up; an MCP server (AI-05) is the alternative for live documentation. `postinstall` is now just `prisma generate`.

## 015. Browser e2e tests on Playwright, in a separate `apps/e2e` workspace

Date: 15.10.2026

Context: the docs disagreed on the e2e tool (README: "Cypress / Playwright", ARCHITECTURE and CLAUDE.md: Cypress, REFACTOR.md WEB-11: Playwright), and nothing said where the tests live or how they run. An e2e test here exercises the whole system: the browser talks to the Next.js BFF, which talks to the NestJS API, which talks to PostgreSQL. Playwright is already in the repo, but only as the browser driver for the Storybook interaction tests in `packages/ui` (Vitest browser mode); those are component tests, not e2e.

Decision:

- **Tool:** Playwright Test (`@playwright/test`). `playwright` and `@playwright/test` get one version for the whole repo through the pnpm catalog (as TypeScript does, #011), shared with `packages/ui`.
- **Location:** a separate workspace, `apps/e2e`, with its own `package.json`, `playwright.config.ts` and specs. It depends on neither app's code, only on their URLs.
- **Running:** root `pnpm test:e2e`. The workspace defines no `test`, `dev` or `build` script, so `pnpm test`, `pnpm dev` and `pnpm build` stay fast and need no database.
- **Database:** a separate `ashen_contracts_e2e` database in the existing docker-compose PostgreSQL, created if missing and migrated with `prisma migrate deploy` in Playwright's global setup. Tests never touch development data.
- **Servers:** Playwright's `webServer` builds and starts the API and the web app with production builds (`nest build` + `start:prod`, `next build` + `next start`) on dedicated ports, with the e2e environment (database URL, dummy JWT secret, `API_URL`) passed in by the config. Production builds cost nothing extra and catch bugs that `next dev` hides. Separate ports keep it from colliding with a running `pnpm dev`. Locally, already-running e2e servers are reused; in CI they always start fresh.
- **Isolation:** every test registers its own user with a unique email; no table truncation, so tests can run in parallel.
- **Login in tests:** through the UI for now; a `setup` project with `storageState` once many tests need a logged-in user.
- **Browsers:** Chromium only to start with.
- **CI:** its own `e2e` job in `ci.yml`, in parallel with `verify`, with PostgreSQL as a service container. On failure it uploads the HTML report and traces as an artifact. Traces are recorded on the first retry; CI retries twice.

Alternatives considered:

- Cypress. Rejected: Playwright is already a dependency, runs several browsers and parallel workers for free, and its `webServer` option starts both apps from the config. The author also wants to learn the tool that has become the default for new projects.
- Specs inside `apps/web` (`apps/web/e2e/`). Rejected: the tests cover web, API and database together, so they would sit in one app while depending on all of it, and they would add Playwright to the web app's dependencies.
- Running against `next dev`. Rejected for CI: slower on first load and not what gets deployed.
- A separate PostgreSQL container for tests. Rejected: one more service to run, while a second database in the existing container gives the same isolation.

Consequences: `pnpm test:e2e` needs `docker compose up -d` first and takes longer than unit tests, because it builds both apps. The CI job adds a few minutes, in parallel with the existing one. The detailed setup plan is REFACTOR.md WEB-11, and the docs still naming Cypress are fixed by DOC-02.

## 016. TypeScript strict mode in `apps/api`, with `strictPropertyInitialization` off

Date: 17.10.2026

Context: `apps/api` came from an older NestJS starter with `strictNullChecks`, `noImplicitAny` and `strictBindCallApply` turned off, while `apps/web`, `packages/ui` and `packages/shared` all use `"strict": true`. Without `strictNullChecks`, a Prisma `findUnique` result is typed `Player`, not `Player | null`, so a missing null check compiles and fails at runtime. Turning on full strict mode (REFACTOR.md API-01) produced four errors, all TS2564 ("Property 'email' has no initializer and is not definitely assigned in the constructor") on the fields of `LoginDto` and `RegisterDto`. Nobody calls a DTO's constructor: the global `ValidationPipe` copies the request body into the class and returns 400 before the controller runs if a decorated field is missing or invalid. Neither of the usual fixes for TS2564 works for a DTO: a default value hides a missing field from `class-validator`, and Nest calls the constructor without arguments.

Decision: `apps/api/tsconfig.json` sets `"strict": true` and `"strictPropertyInitialization": false`, with a comment pointing here. This is the configuration the NestJS 12 CLI generates: since [nestjs/schematics `d303b735`](https://github.com/nestjs/schematics/commit/d303b735) (March 2026), the application template has `"strict": <%= strict %>` and always `"strictPropertyInitialization": false`, so `nest new --strict` produces exactly these two lines. DTO fields stay plain (`email: string;`), as in the NestJS docs. Every required DTO field must have a `class-validator` decorator that rejects a missing value, and an optional one is typed `field?: T` with `@IsOptional()`.

Alternatives considered:

- Full strict, with the definite-assignment assertion on every DTO field (`email!: string`), as the TypeScript handbook suggests for fields set outside the constructor. Most blog posts and Q&A answers recommend this, because turning the flag off weakens every class. Rejected: in a NestJS app the DTOs are the only classes with uninitialized fields (services get their dependencies through constructor parameters, and Prisma returns plain objects, not class instances), so the check would add `!` to every DTO field, always for the same reason, and catch nothing. It would also make this project differ from what the framework generates. This `!` is not the non-null assertion (`user!.name`), and `@typescript-eslint/no-non-null-assertion` does not flag it, so lint would not guard either option.
- Keep the old starter settings (no strict). Rejected: `strictNullChecks` is where strict mode catches real bugs, and the API, which computes resources and time, would have weaker types than the frontend.

Consequences: `strictNullChecks`, `noImplicitAny` and the other strict checks apply to all API code, including the specs. Turning the flag off makes the same promise as `!`, but implicitly and for every class: `class Foo { bar: Bar }` compiles, and `new Foo().bar` is `undefined` at runtime. A service field set outside the constructor (e.g. in `onModuleInit`) has to be caught in review. A DTO's types are only as true as its validation, and this relies on `ValidationPipe` staying global. Revisit this decision if the API gets domain classes with fields of their own (e.g. a `Character` class with methods). Verified with `pnpm --filter api typecheck`, `lint`, `test` and `build`.

## 017. Rate limiting in the API, keyed by the player IP that the BFF forwards with a shared secret

Date: 18.10.2026

Context: `POST /auth/login` and `/auth/register` had no rate limit (REFACTOR.md API-06). The browser never calls the API: every request goes through the Next.js BFF (#005), so the API sees the BFF's address, and a plain per-IP limit puts all players in one bucket (five wrong passwords from anyone would lock everyone out). The API itself will be publicly reachable on Railway/Render, so anyone can also call it directly and set any header. The web app runs on Vercel, a different provider, so the two can't share a private network, and Vercel's egress IPs are dynamic and shared by all its customers, so an IP allowlist would admit any Vercel project.

Decision: `@nestjs/throttler` in the API, with an `AuthThrottlerGuard` on login and register only, and two named throttlers. `ip`: 5 logins per minute, 3 registrations per hour. `email`: 10 logins per 15 minutes per normalized email (API-05), whatever the IP, against a botnet trying one account. The BFF route handlers send the player's IP in `X-Client-IP` (from the `X-Forwarded-For` that Vercel sets) together with `X-BFF-Secret`, the value of `BFF_SECRET`, an env var set to the same value in both apps. The API trusts `X-Client-IP` only when the secret matches (`timingSafeEqual` over SHA-256 digests), and otherwise uses `req.ip` (`src/auth/throttling/clientIp.ts`). `req.ip` comes from Express `trust proxy`, set from `TRUST_PROXY_HOPS` (0 locally, 1 behind the platform proxy), so it is the address the platform proxy saw, not one the client wrote. A 429 has `code: TOO_MANY_REQUESTS` and a standard `Retry-After`. Counters live in memory.

Alternatives considered:

- A plain per-IP limit on `req.ip`, as the task first said. Rejected: behind the BFF every player shares one bucket.
- A rate limiter in the Next.js BFF. Rejected: the API is public, so a limiter in front of it can be bypassed, and on Vercel route handlers run as serverless functions, each with its own memory, so an in-memory counter does not work there without a shared store (Upstash, Vercel KV). It could come back later as an extra layer.
- The BFF sets `X-Forwarded-For` and the API trusts it through `trust proxy`. Rejected: the platform proxy appends to the same header, and an attacker calling the API directly can put any value in it. Without a secret, the API cannot tell the BFF's entry from a forged one.
- Limiting the network: a private network or an IP allowlist. Rejected: no shared private network across Vercel and Railway/Render, and Vercel's IPs are shared and change (static IPs are a paid add-on).
- Rejecting every request without the BFF secret, so the API is closed to everyone but the BFF. Not rejected, but deferred to its own task: it changes the API's security model and affects the planned browser WebSocket connection to the API.

Consequences: only login and register are limited, and only for the BFF's requests is the limit per player. The BFF's other calls (logout, `GET /auth/me`) don't send the secret yet. The secret travels only on the server-to-server hop, over HTTPS in production (`API_URL` must be `https://`), and never reaches the browser: it has no `NEXT_PUBLIC_` prefix. If it leaks, it is rotated in both apps' env. Trusting Vercel's `X-Forwarded-For` depends on Vercel overwriting it: a self-hosted Next.js would need a proxy that does the same, because `next start` passes a client-sent value through. In-memory counters are per API instance and reset on restart, which is fine for one instance; several instances need the Redis store, which BullMQ brings in v0.4. The per-email limit cannot tell the owner from an attacker, so it is a lockout anyone can trigger: 10 login requests with a player's email, any password, spread over IPs to stay under the per-IP limit, make every login for that email return 429 for 15 minutes, the owner's correct password included. Repeated every 15 minutes, this locks the account out indefinitely. Successful logins count towards the 10 as well. This is accepted as the price of protection against distributed guessing. A fix (device cookies, so a device that logged in before skips the per-email limit, and counting only failed attempts) was planned as REFACTOR.md API-13 and dropped there by the measure of #019: for this project it costs more than the risk. Verified with unit tests for `resolveClientIp`, integration tests through `AppModule` (each limit, a forged `X-Client-IP` with no or a wrong secret, two players behind the BFF, `trust proxy` 1 against a forged `X-Forwarded-For`; turning off the secret check or setting `trust proxy` to `true` makes them fail), and by hand with the built API and web app.

## 018. One error body for the whole API, `{ code, message, details? }`, guaranteed by a global exception filter

Date: 19.10.2026

Context: the web app translates API errors by `code` (`apps/web/messages/en.json`), not by English text. Before REFACTOR.md API-08, only errors the auth code threw by hand had a `code`. Everything else had Nest's default body `{ statusCode, message, error }`: `ValidationPipe` errors, with `message` as an array of English sentences; Nest's 404 for an unknown route; body-parser's 400 for malformed JSON; and every unexpected exception, as a 500. So the client couldn't rely on `code`, and `message` was sometimes a string and sometimes an array. `JwtAuthGuard` also returned `INVALID_CREDENTIALS` for a missing or expired token, so the client couldn't tell "wrong password" from "session expired".

Decision: every error response has the body `ApiErrorResponse` from `@ashen-contracts/shared`: `{ code, message, details? }`. `code` is an `ApiErrorCode` union, `message` is English text for developers, and the HTTP status is not repeated in the body. Code that throws an error passes `{ code, message }` to an `HttpException`. `ApiExceptionFilter` (`@Catch()` everything, registered as an `APP_FILTER` in `AppModule`) keeps that code. An error thrown without a code gets a generic one from its status: 401 `UNAUTHORIZED`, 404 `NOT_FOUND`, 429 `TOO_MANY_REQUESTS`, other 4xx `BAD_REQUEST`, 5xx `INTERNAL_ERROR`. Any other exception becomes a 500 `INTERNAL_ERROR` with a fixed message, and the real error is only logged. Validation errors are 400 `VALIDATION_FAILED`, with `details` as a flat list of `{ field, constraint, message }`, one entry per violated rule (`constraint` is the class-validator name, e.g. `minLength`; nested fields are dotted paths). The `ValidationPipe`'s `exceptionFactory` builds them, so the filter doesn't need to know about validation. The web app types `ApiError.code` as `ApiErrorCode`. next-intl checks message keys against `en.json`, so a code with no message fails `tsc`.

Alternatives considered:

- RFC 9457 Problem Details (`application/problem+json` with `type`, `title`, `status`, `detail`). Rejected for now: the only client is our own BFF and web app, and they only need a stable code to branch on and translate. `type` would have to be a URI per error, and the body would repeat the HTTP status. The contract is small enough to map to Problem Details later if the API gets outside consumers.
- Keep Nest's default body and add a `code` only where errors are thrown by hand. Rejected: that is the state the task fixed. Errors from the framework, from middleware and unexpected ones would still have no code, and `message` would still change type.
- A code for every HTTP status (`FORBIDDEN`, `METHOD_NOT_ALLOWED`, `PAYLOAD_TOO_LARGE`, …). Rejected: it repeats the status, which the client already has. Only statuses the API produces today get a code; a new one is added when something needs to branch on it.
- Validation details as Nest's array of sentences, or as an object keyed by field (`{ email: ['…'] }`). Rejected: sentences have to be parsed to tell which rule failed. An object keyed by field drops the rule name, unless each message becomes a nested object, which a flat list already is.
- One custom `ApiException` class instead of Nest's built-in exceptions. Rejected: Nest's own exceptions already carry a status and a response object. The filter handles them, and errors thrown by libraries, without the code having to use a project class.

Consequences: a client can always read `code`, and a 500 never shows internals (Prisma errors, SQL, file paths); the real cause is only in the server log. `INVALID_CREDENTIALS` now only means a wrong email or password at login. A missing or forged token is `UNAUTHORIZED`, and an expired one is `SESSION_EXPIRED`. The cost: the filter also rewrites bodies from libraries that have their own. The planned `@nestjs/terminus` health check would lose its per-check 503 body (noted in REFACTOR.md API-10). A new code needs a change to the shared union and to `en.json`. The web app still trusts the code it gets at runtime, so a code it doesn't know is REFACTOR.md WEB-09. Verified by unit tests for the filter and the validation factory, and by integration tests through `AppModule` (validation, token cases, unknown route, malformed JSON, a Prisma failure). Without the filter and the factory, 9 of them fail. Also checked by hand with the built API, including a 500 with Postgres stopped.

## 019. The API stays publicly reachable; no gate that admits only the BFF

Date: 19.10.2026

Context: since #017, the BFF sends `X-BFF-Secret`, but the API uses it only to trust the forwarded player IP. Anyone can call any endpoint directly. #017 deferred the question of rejecting every request without the secret to REFACTOR.md API-12. The project is a portfolio piece on free hosting (#020) without a custom domain, and its owner wants a real-time WebSocket connection from the browser to the API.

Decision: the API stays public. The JWT guard is the security boundary: every route needs a valid token unless it is marked `@Public()`, and only login, register and `/health` are. Login and register are rate limited by caller IP (#017). The BFF secret keeps its one job, which is making the forwarded IP trustworthy.

Alternatives considered:

- A global guard that rejects requests without the secret, with exceptions for `/health` and Swagger. Rejected: it is defence in depth, not a new boundary. It stops scanners and an endpoint marked `@Public()` by mistake, but not a logged-in player scripting the game, who can send the same requests through the BFF. It costs a static key to rotate in both apps, a header for every curl call, Swagger request and test, and a separate way in for the browser's WebSocket, which can't hold the secret. For this project that cost is higher than the risk.
- A Vercel-issued OIDC token instead of a static secret. Rejected: it ties the API to Vercel and still needs a fallback for local development.
- Network isolation (private network, IP allowlist). Rejected in #017: Vercel and Render share no private network, and Vercel's IPs are shared and change.

Consequences: what protects the API is the JWT guard with `@Public()` as a visible opt-out, the `ValidationPipe`, rate limits on the public auth routes, and error bodies that never show internals (#018). A new public route has to be reviewed with that in mind. The Socket.io connection will authenticate with a short-lived token that the BFF fetches from the API, because the browser can't read the httpOnly session cookie (#005), and that cookie is not sent to the API's domain. Revisit this decision if the API gets data worth protecting beyond a player's own account, or a cost that grows with traffic.

## 020. Free hosting: Vercel for the web app, Render's free plan for the API, Prisma Postgres for the database

Date: 19.10.2026

Context: the project has to run for free for as long as it sits in a portfolio, at low traffic (a few recruiters). The plan said "Railway/Render (api + db)", but nobody had checked it against current free tiers. As of October 2026, from third-party summaries to be confirmed on the official pricing pages: Railway's free plan has about $1 of credit a month after a one-time trial, which can't keep an API and its database running. Render's free Postgres expires 30 days after creation and is then deleted. Render's free web service spins down after 15 minutes without traffic and takes up to about a minute to wake. The database already runs on Prisma Postgres's free plan, which doesn't expire: 500 MB, and an operation quota that sources give as 100k–200k a month. The API reaches it over TCP through `@prisma/adapter-pg` (REFACTOR.md API-09).

Decision: `apps/web` on Vercel, `apps/api` on a free Render web service (Docker), PostgreSQL on Prisma Postgres (free). The API is not kept awake with pings. A sleeping API is accepted, and the web app should show that it is waking up. Where Redis runs for BullMQ is decided before v0.4, when it is first needed.

Alternatives considered:

- Railway for the API and the database. Rejected: about $5 a month after the trial.
- Render's free Postgres. Rejected: it expires after 30 days, and a portfolio project has to last months.
- Pinging `/health` to keep the API awake. Rejected: every ping is a database operation (`SELECT 1`) against the Prisma quota, uptime pings are a grey area on free plans, and a few recruiters a day don't justify it.

Consequences: no hosting cost and no bill to fear, since a free service that runs out of quota stops instead of charging. In exchange, the first request after 15 idle minutes waits up to about a minute, and an open WebSocket drops when the API sleeps, which ARCHITECTURE already handles by refetching state on reconnect. The Prisma operation quota must be watched in its dashboard (one community report describes a suspension well below the stated limit). Render free services have an ephemeral filesystem, which the API doesn't use. Open for v0.4: a free Redis host. BullMQ polls Redis constantly, which can exhaust command quotas on free plans, and Render's free Key Value doesn't persist data, while delayed jobs must survive restarts (#001).

Trade-off forced by free hosting: BullMQ's workers run in the API process (no second paid service), so they sleep with it. A job due while the API sleeps, e.g. a training that ends at 14:00, runs only when the next request wakes the API, up to the next player visit. This is accepted because nothing in the game needs to happen at the exact moment, only to be correct when the player looks. It sets a rule for v0.4: a job handler computes its result from the time the action was scheduled to finish (stored with the job), never from the time the handler happens to run, and reading the player's state settles any action whose end time has passed, so the result doesn't depend on whether the worker ran yet. A WebSocket "your training is done" notification may arrive late or never, which ARCHITECTURE already allows: the socket is for notifications only. On a paid always-on instance, the same code would just run on time.

## 021. `packages/shared` is compiled to JavaScript (ES modules), and the apps import its build

Date: 20.10.2026

Context: `packages/shared` held only types and shipped raw `.ts`: types are erased at compile time, so nothing ever ran its code. REFACTOR.md SHARED-01 moves validation schemas into it, which is runtime code. In production the API runs plain `node dist/main` (CommonJS, built by `nest build`, which compiles only the API's own `src/`), and Node won't run TypeScript from a dependency. The web app's bundler could compile raw `.ts` (`transpilePackages`, as for `packages/ui`), but the API can't.

Decision: `tsc` compiles `packages/shared/src` into `dist/` as ES modules with `.d.ts` files and source maps (`declarationMap`, so "go to definition" lands in `src/`). `main`, `types` and `exports` point to `dist/`, and both apps import the build. The API, which stays CommonJS (#006), loads it through Node's `require(esm)`, as it already does NestJS 12. The package builds in its `postinstall` (a fresh clone, CI, Vercel), `pnpm dev` runs `tsc --watch` for it, and the root `test`, `lint` and `typecheck` scripts rebuild it first (`pnpm build:shared`): in an existing checkout `pnpm install` with an unchanged lockfile skips `postinstall`, so after a `git pull` the build would otherwise be stale.

Relative imports in the package end in `.js` (`export * from './types/auth.js'`), although the files are `.ts`. The import names the file that will exist at runtime: `tsc` compiles `auth.ts` to `dist/types/auth.js` and leaves import paths as written. Node's ES module loader adds no extension and no `index.js`, so `'./types/auth'` would fail at runtime. At compile time TypeScript maps `./types/auth.js` back to `./types/auth.ts` for types. `"module": "nodenext"` in the package's `tsconfig.json` makes a missing extension a compile error, not a crash in production.

Alternatives considered:

- Raw `.ts` compiled by each consumer. Rejected: works for the web app and Vitest, but not for the API in production, which runs compiled JavaScript with `node`. Relying on Node's type stripping would need `.ts` imports and runs only on files outside `node_modules`.
- Pointing the API at the package's source through `paths`. Rejected: `nest build` would compile files outside the API's `rootDir`, and the output layout would change.
- Emitting CommonJS instead of ES modules. Rejected: the web app's bundler prefers ES modules, and the API already depends on `require(esm)` for NestJS 12, so ES modules serve both without a dual build.
- `.ts` extensions in imports, with `rewriteRelativeImportExtensions` (TypeScript 5.7+) rewriting them to `.js` in the output. Rejected: `.js` is the form TypeScript documents for `nodenext`, and the source then says exactly what `dist/` contains, with no rewriting step to explain.
- A build orchestrator (Turborepo, Nx) to rebuild dependencies before each task. Rejected: one compiled package doesn't justify another tool; three root scripts call `build:shared` instead.

Consequences: runtime code can live in `packages/shared`. The cost is a build step: running an app's script directly (`pnpm --filter api test`) uses whatever is in `dist/`, so after changing the package outside `pnpm dev`, run `pnpm build:shared`. A future API Dockerfile has to install (or build) the package before `nest build`. Verified on a fresh clone with a temporary runtime export: `pnpm install --frozen-lockfile` built `dist/`, and the value loaded in `node dist/main` after `nest build` (CommonJS through `require(esm)`), in Vitest and in `next build`.
