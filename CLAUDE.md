# Ashen Contracts — project context

> Rule: keep this file SHORT. Details (game design, roadmap, architecture decisions) live in /docs — Claude Code reads them on demand. Don't duplicate content here, just point to it.

## What this project is

A browser-based idle/RPG game set in a dark-fantasy world. The player manages a stronghold, takes on monster-hunting contracts, collects resources that regenerate over time, and progresses through building/research actions that take real time to complete. Full design: `docs/GAME_DESIGN.md`.

Purpose: a portfolio project to demonstrate full-stack engineering (frontend-first) for job applications — not a commercial product. Priority: clean, explainable architecture over feature count. I need to be able to justify every technical decision in an interview.

## Tech stack

- Frontend: Next.js + TypeScript + Tailwind, shared components in Storybook (`packages/ui`)
- Backend: NestJS + PostgreSQL + Redis + BullMQ (job queues for timed actions)
- Real-time: Socket.io
- Testing: Vitest (unit + API integration via supertest), Cypress (browser e2e)
- Package manager: pnpm (workspaces monorepo)
- Structure: `apps/web`, `apps/api`, `packages/ui`, `packages/shared`

## Code conventions

- All resource/time calculations happen server-side. Never trust client-sent timestamps or resource values.
- Any action with a real-world duration (building, research) goes through the job queue (BullMQ), not `setInterval`/naive polling.
- Write tests for: resource regeneration math, queue/job behavior, action validation (enough resources? valid state?).
- Import generated/external code (Prisma client, etc.) with explicit relative paths (`../generated/prisma/client` — the Prisma client is generated into `apps/api/src/generated/prisma`), never bare `src/...` specifiers. `apps/api` has no `baseUrl` (deprecated in TypeScript 6), so those no longer compile; they used to work under `nest start` but not in Vitest.
- **NestJS 12 is ESM-only; `apps/api` stays CommonJS** and loads it through Node's `require(esm)`. API tests run on Vitest (`pnpm --filter api test`), not Jest. Spec files import test APIs explicitly (`import { describe, it, expect, vi } from 'vitest'`; no globals). Don't add an SWC plugin, because Vite's transformer already emits decorator metadata. See `docs/DECISIONS.md` #006.
- [Add naming conventions, folder structure rules, DTO naming as they solidify]
- **Where components live (apps/web):** generic, app-agnostic UI → `packages/ui`. Components used by a single route live next to it in a private `_components/` folder (e.g. `src/app/play/_components/`). A component used by two or more routes moves to `src/components/`. Start local; promote only when a second use appears.
- **File naming (apps/web):** camelCase file names. Suffix by role: `.component.tsx` (React components), `.schema.ts` (Zod schemas), `.types.ts` (type declarations). Non-component modules are plain camelCase (`getCurrentUser.ts`, `routeHelpers.ts`).

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, header ≤ 100 characters. The scope and a `[TASK-ID]` suffix are optional. Enforced by commitlint (`commitlint.config.mjs`), both in a local `commit-msg` hook and in CI.

- Types: `feat` and `fix` map to the CHANGELOG's Added and Fixed sections, `refactor` and `perf` to Changed. `docs`, `test`, `chore`, `ci`, `build`, `style` and `revert` usually don't need a CHANGELOG entry.
- Scope (optional): the workspace, i.e. `api`, `web`, `ui` or `shared`. Leave it out for repo-wide changes.
- Subject: imperative, lowercase, no trailing period ("add logout endpoint", not "Added logout endpoint.").
- `[TASK-ID]` suffix (optional, not enforced): only when the commit implements a task from `docs/REFACTOR.md` (e.g. `[REPO-07]`).
- Example: `fix(api): switch to @prisma/adapter-pg [API-09]`

## Common commands

- `pnpm install` — install all workspace dependencies
- `pnpm dev` — run web + api locally
- `pnpm test` — unit tests in every workspace (UI story tests need `pnpm --filter @ashen-contracts/ui exec playwright install chromium` once)
- `pnpm typecheck` — `tsc --noEmit` in every workspace
- `pnpm lint` — ESLint in every workspace (`pnpm --filter <name> lint:fix` to auto-fix)
- `pnpm format` / `pnpm format:check` — Prettier for the whole repo (config at the root)
- `pnpm --filter api migrate` — run database migrations
- `pnpm --filter ui storybook` — run Storybook for the component library

## Where to find more context

- Full game design & mechanics: `docs/GAME_DESIGN.md`
- Version roadmap (what we're building now vs later): `docs/ROADMAP.md`
- Architecture decisions and reasoning: `docs/DECISIONS.md`
- Detailed spec for the feature currently being built: `docs/features/`

## Current status (keep this updated)

Current version in progress: v0.1
Last completed: [update me]
Next step: [update me]
