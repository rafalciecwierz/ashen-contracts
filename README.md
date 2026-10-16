# The Ashen Contracts

A browser-based idle/RPG game where players manage a stronghold, fulfill monster-hunting contracts, and grow their influence over time — built as a full-stack portfolio project to demonstrate production-grade frontend and backend engineering, not just another CRUD demo.

**Live demo:** _coming soon_
**Storybook (component library):** _coming soon_

[![CI](https://github.com/rafalciecwierz/ashen-contracts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rafalciecwierz/ashen-contracts/actions/workflows/ci.yml)
![status](https://img.shields.io/badge/status-in%20development-orange)
![frontend](https://img.shields.io/badge/frontend-Next.js%20%2B%20TypeScript-blue)
![backend](https://img.shields.io/badge/backend-NestJS%20%2B%20PostgreSQL-green)

---

## Why this project exists

I'm a frontend-focused software engineer with 5+ years of commercial experience (React, TypeScript, component libraries, Agile teams). I built this project to go deeper into full-stack architecture — specifically the kind of problems that don't show up in typical CRUD portfolio apps: server-authoritative time-based resource systems, background job queues, and real-time state sync.

Every architectural decision below is documented with reasoning in [`docs/DECISIONS.md`](./docs/DECISIONS.md) — happy to walk through any of them in an interview.

## What it does

Players manage a stronghold in a dark-fantasy world. Resources regenerate over time (calculated server-side, not trusted from the client), contracts can be accepted and completed for rewards, and longer-running actions — building, research — use a proper job queue rather than naive polling.

| Feature                                                 | Status         |
| ------------------------------------------------------- | -------------- |
| Auth & player state                                     | 🔶 in progress |
| Time-based resource regeneration (server-authoritative) | 🔶 in progress |
| Contracts & inventory system                            | 🔲 planned     |
| Delayed actions via job queue (BullMQ + Redis)          | 🔲 planned     |
| Real-time notifications (Socket.io)                     | 🔲 planned     |
| Player-to-player interaction (leaderboard/trading)      | 🔲 planned     |

Full roadmap with milestones: [`docs/ROADMAP.md`](./docs/ROADMAP.md)
Game design & mechanics: [`docs/GAME_DESIGN.md`](./docs/GAME_DESIGN.md)

## Tech stack & why

| Layer           | Choice                                                               | Why                                                                                                                                     |
| --------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | Next.js + TypeScript                                                 | Type-safe, SSR where useful, industry-standard for React roles                                                                          |
| UI components   | Custom library + Storybook                                           | Mirrors real production work — isolated, testable, reusable components                                                                  |
| Backend         | NestJS + PostgreSQL                                                  | Structured, testable architecture over a bare Express app                                                                               |
| Background jobs | Redis + BullMQ                                                       | Reliable, restart-safe handling of timed actions (builds, research) — the naive `setInterval` approach doesn't survive a server restart |
| Real-time       | Socket.io                                                            | Push updates to the client without polling                                                                                              |
| Testing         | Vitest (unit + API integration) + Cypress / Playwright (browser e2e) | Coverage on the logic that actually matters: resource math, queue behavior                                                              |

This is a monorepo (`apps/web`, `apps/api`, `packages/ui`, `packages/shared`) managed with pnpm workspaces — full reasoning in [`docs/DECISIONS.md`](./docs/DECISIONS.md).

## How I use AI in this project

Much of the code here is written with an AI coding agent ([Claude Code](https://claude.com/claude-code)). I'm open about that, because how the agent is set up and kept in check is part of what this project shows. The setup is all in the repo, and changes to it are reviewed like any other change.

**Specs before code.** Each feature starts as a spec in [`docs/features/`](./docs/features/): business rules, data, endpoints, edge cases and the tests to write. The agent builds against the spec, and the spec is updated when the implementation changes it, so the docs describe what the code actually does.

**Shared context instead of re-explaining.** [`CLAUDE.md`](./CLAUDE.md) is kept short. It holds the conventions (file placement and naming, server-side resource math, timed actions through the job queue) and points to the rest. [`docs/DECISIONS.md`](./docs/DECISIONS.md) records every architecture decision with the alternatives I rejected. That makes it context for the agent and interview for me to revise on the topic. The rule is that a change to a convention updates these files in the same commit: the agent trusts CLAUDE.md more than the code, so a stale line there produces wrong code.

**Guardrails that are enforced, not just asked for.** [`.claude/settings.json`](./.claude/settings.json) runs Prettier and `eslint --fix` on every file the agent edits, keeps its file tools away from real `.env` files (not a hard guarantee for shell commands), and pre-approves only read-only commands (tests, lint, typecheck, `git status/diff/log`). See ADR 013.

**Skills for repeated procedures.** [`.claude/skills/`](./.claude/skills/) holds step-by-step procedures the agent follows: `refactor-task` (one backlog task from [`docs/REFACTOR.md`](./docs/REFACTOR.md), verified and written up), `adr`, `tdd`, `diagnosing-bugs` and `grilling`, where the agent questions my plan until the open decisions are settled. Some are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) and pinned to a commit. No vendor skills get installed automatically (ADR 014).

**Tools to check its own work.** [`.mcp.json`](./.mcp.json) gives the agent a headless browser (Playwright) and the Next.js dev server's errors and logs, so it can confirm a UI change in the running app instead of assuming it works.

**What stays with me:**

- **Every commit.** By my own rule, not a technical lock, the agent doesn't commit. I read the diff, make my own code enhancements, decide what goes in and write the commit message. One backlog task means one commit, and each task's notes record what changed, what differs from the plan and how it was verified.
- **Decisions.** The agent proposes options and argues for one, but each ADR is a decision I made.
- **The gate.** CI ([`ci.yml`](./.github/workflows/ci.yml): lint, format, typecheck, tests, build, commit messages) checks agent-written and hand-written code the same way. An AI review ([`claude-review.yml`](./.github/workflows/claude-review.yml)) comments on each PR against CLAUDE.md and the ADRs, but it can only read and comment. Merging is my call.

## Screenshots

_Coming as soon as v0.1 has a UI worth showing — placeholder for now._

## Getting started locally

```bash
# clone
git clone https://github.com/rafalciecwierz/ashen-contracts.git
cd ashen-contracts

# start PostgreSQL and Redis in Docker
docker compose up -d

# install (workspace-aware; also generates the Prisma client)
pnpm install

# configure env variables (the defaults work locally; each file documents its variables)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# create the database schema
pnpm --filter api migrate

# run everything
pnpm dev
```

Requires Node.js 24 (see `.nvmrc`; 22.22.3+ also works), pnpm, and Docker. To use your own PostgreSQL instead, point `DATABASE_URL` in `apps/api/.env` at it.

`docker compose down` stops the containers and keeps the data; `docker compose down -v` also wipes it.

## Project structure

```
apps/
  web/          → Next.js frontend
  api/          → NestJS backend
packages/
  ui/           → shared component library (Storybook)
  shared/       → shared TypeScript types/DTOs
docs/           → game design, roadmap, architecture decisions
```

## About me

**Rafał Ciećwierz** — Frontend Software Engineer, 5+ years building production React/TypeScript applications.

- [LinkedIn](https://www.linkedin.com/in/rafalciecwierz)
- [GitHub](https://github.com/rafalciecwierz)
- rafal.ciecwierz4@gmail.com

## License

[MIT](./LICENSE) © Rafał Ciećwierz
