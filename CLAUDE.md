# Ashen Contracts — project context

## What this project is
A browser-based idle/RPG game set in a dark-fantasy world. The player manages a stronghold, takes on monster-hunting contracts, collects resources that regenerate over time, and progresses through building/research actions that take real time to complete. Full design: `docs/GAME_DESIGN.md`.

Purpose: a portfolio project to demonstrate full-stack engineering (frontend-first) for job applications — not a commercial product. Priority: clean, explainable architecture over feature count. I need to be able to justify every technical decision in an interview.

## Tech stack
- Frontend: Next.js + TypeScript + Tailwind, shared components in Storybook (`packages/ui`)
- Backend: NestJS + PostgreSQL + Redis + BullMQ (job queues for timed actions)
- Real-time: Socket.io
- Testing: Jest (unit), Cypress (e2e)
- Package manager: pnpm (workspaces monorepo)
- Structure: `apps/web`, `apps/api`, `packages/ui`, `packages/shared`

## Code conventions
- All resource/time calculations happen server-side. Never trust client-sent timestamps or resource values.
- Any action with a real-world duration (building, research) goes through the job queue (BullMQ), not `setInterval`/naive polling.
- Write tests for: resource regeneration math, queue/job behavior, action validation (enough resources? valid state?).
- [Add naming conventions, folder structure rules, DTO naming as they solidify]

## Common commands
- `pnpm install` — install all workspace dependencies
- `pnpm dev` — run web + api locally
- `pnpm test` — run unit tests
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