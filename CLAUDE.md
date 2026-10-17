# Ashen Contracts — project context

> Rule: keep this file SHORT. Details (game design, roadmap, architecture decisions) live in /docs — Claude Code reads them on demand. Don't duplicate content here, just point to it.

## What this project is

A browser-based idle/RPG game set in a dark-fantasy world. The player manages a stronghold, takes on monster-hunting contracts, collects resources that regenerate over time, and progresses through building/research actions that take real time to complete. Full design: `docs/GAME_DESIGN.md`.

Purpose: a portfolio project to demonstrate full-stack engineering (frontend-first) for job applications — not a commercial product. Priority: clean, explainable architecture over feature count. I need to be able to justify every technical decision in an interview.

## Tech stack

- Frontend: Next.js 16 (App Router) + TypeScript + Tailwind v4, next-intl, Zod; shared components in Storybook (`packages/ui`, built on Radix UI)
- Backend: NestJS 12 + Prisma 7 + PostgreSQL
- Testing: Vitest everywhere: API unit tests, API integration tests via supertest, and Storybook interaction tests in `packages/ui` (browser mode, Playwright)
- Tooling: pnpm workspaces, TypeScript 6 (one version via the pnpm catalog), ESLint 9 + Prettier, commitlint, GitHub Actions CI (`ci.yml`; plus an AI review that only comments on PRs, `claude-review.yml`, which needs an `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` repo secret)
- Agent MCP servers (`.mcp.json`, approved per user on first use): Next.js DevTools (runtime errors, routes and logs of a running `pnpm dev`) and Playwright (headless browser for checking UI changes; needs `pnpm dlx @playwright/mcp@0.0.83 install-browser chrome-for-testing` once)
- Local infra: `docker-compose.yml` runs PostgreSQL and Redis
- Planned, not installed yet: BullMQ on Redis (timed actions, v0.4), Socket.io (real-time), Playwright e2e tests in `apps/e2e` (`docs/DECISIONS.md` #015)
- Structure: `apps/web`, `apps/api`, `packages/ui`, `packages/shared`

## Code conventions

- All resource/time calculations happen server-side. Never trust client-sent timestamps or resource values.
- Any action with a real-world duration (building, research) goes through the job queue (BullMQ), not `setInterval`/naive polling.
- Write tests for: resource regeneration math, queue/job behavior, action validation (enough resources? valid state?).
- Import generated/external code (Prisma client, etc.) with explicit relative paths (`../generated/prisma/client` — the Prisma client is generated into `apps/api/src/generated/prisma`), never bare `src/...` specifiers. `apps/api` has no `baseUrl` (deprecated in TypeScript 6), so those no longer compile; they used to work under `nest start` but not in Vitest.
- **`apps/api` is TypeScript strict, except `strictPropertyInitialization`** (as `nest new --strict` generates in NestJS 12): DTO fields stay plain (`email: string;`), with no `!`. Every required field needs a `class-validator` decorator that rejects a missing value, because the global `ValidationPipe` is what guarantees it. See `docs/DECISIONS.md` #016.
- **NestJS 12 is ESM-only; `apps/api` stays CommonJS** and loads it through Node's `require(esm)`. API tests run on Vitest (`pnpm --filter api test`), not Jest. Spec files import test APIs explicitly (`import { describe, it, expect, vi } from 'vitest'`; no globals). Don't add an SWC plugin, because Vite's transformer already emits decorator metadata. See `docs/DECISIONS.md` #006.
- **Where components live (apps/web):** generic, app-agnostic UI → `packages/ui`. Components used by a single route live next to it in a private `_components/` folder (e.g. `app/play/_components/`). A component used by two or more routes moves to `src/components/` (create it with the first such component). Start local; promote only when a second use appears.
- **Where code lives (apps/web):** routes in `app/` (App Router; `app/api/` holds the BFF route handlers), non-route modules in `src/` (`src/http`, `src/i18n`, `src/routes`), imported as `@/src/...`.
- **File naming (apps/web, packages/ui):** camelCase file names. Suffix by role: `.component.tsx` (React components), `.schema.ts` (Zod schemas), `.types.ts` (type declarations). Non-component modules are plain camelCase (`getCurrentUser.ts`, `routeHelpers.ts`). Stories: `.stories.tsx` next to the component.
- **File naming (apps/api):** camelCase plus the Nest role suffix: `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`, `.guard.ts`, `.decorator.ts`; unit tests `.spec.ts` next to the file, integration tests `test/*.integration-spec.ts`.
- **Keep docs in sync:** when a change alters architecture or conventions, update the relevant `docs/` file (feature spec, ADR in `DECISIONS.md`, `ARCHITECTURE.md`, this file) in the same commit. AI agents trust this file more than the code, so drift here produces wrong code.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, header ≤ 100 characters. The scope and a `[TASK-ID]` suffix are optional. Enforced by commitlint (`commitlint.config.mjs`), both in a local `commit-msg` hook and in CI.

- Types: `feat` and `fix` map to the CHANGELOG's Added and Fixed sections, `refactor` and `perf` to Changed. `docs`, `test`, `chore`, `ci`, `build`, `style` and `revert` usually don't need a CHANGELOG entry.
- Scope (optional): the workspace, i.e. `api`, `web`, `ui` or `shared`. Leave it out for repo-wide changes.
- Subject: imperative, lowercase, no trailing period ("add logout endpoint", not "Added logout endpoint.").
- `[TASK-ID]` suffix (optional, not enforced): only when the commit implements a task from `docs/REFACTOR.md` (e.g. `[REPO-07]`).
- Example: `fix(api): switch to @prisma/adapter-pg [API-09]`

## Common commands

- `docker compose up -d` — start PostgreSQL and Redis (first setup: see README "Getting started")
- `pnpm install` — install all workspace dependencies (also generates the Prisma client and installs the commit hook)
- `pnpm dev` — run web + api locally
- `pnpm test` — unit tests in every workspace (UI story tests need `pnpm --filter @ashen-contracts/ui exec playwright install chromium` once)
- `pnpm typecheck` — `tsc --noEmit` in every workspace
- `pnpm lint` — ESLint in every workspace (`pnpm --filter <name> lint:fix` to auto-fix)
- `pnpm format` / `pnpm format:check` — Prettier for the whole repo (config at the root)
- `pnpm --filter api migrate` — create/apply migrations in development (`migrate:deploy` for deployments)
- `pnpm --filter ui storybook` — run Storybook for the component library

## Where to find more context

- Full game design & mechanics: `docs/GAME_DESIGN.md`
- Version roadmap (what we're building now vs later): `docs/ROADMAP.md`
- Architecture decisions and reasoning: `docs/DECISIONS.md`
- Feature specs, one per feature, each with a `Status` (planned | in progress | done) and "Deviations from spec": `docs/features/`
- System overview, deployment, local development: `docs/ARCHITECTURE.md`
- Refactor/cleanup backlog with task IDs and per-task notes: `docs/REFACTOR.md`
- Agent skills (repeatable procedures: `implement-feature`, `refactor-task`, `adr`, `tdd`, `diagnosing-bugs`, `grilling`; user-only: `/release`, and `/grill-me` as a shortcut to `grilling`): `.claude/skills/`

## Current status (keep this updated)

- Current version in progress: v0.1
- Last completed: auth (register, login, logout, `GET /auth/me`, global JWT guard, BFF with httpOnly cookie); refactor backlog sections CRIT and REPO (`docs/REFACTOR.md`)
- Next step: rest of the refactor backlog (AI, DOC, API, WEB, UI), then v0.1 character creation (`docs/features/02-character-creation.md`)
