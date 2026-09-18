# The Ashen Contracts

A browser-based idle/RPG game where players manage a stronghold, fulfill monster-hunting contracts, and grow their influence over time — built as a full-stack portfolio project to demonstrate production-grade frontend and backend engineering, not just another CRUD demo.

**Live demo:** _coming soon_
**Storybook (component library):** _coming soon_

![status](https://img.shields.io/badge/status-in%20development-orange)
![frontend](https://img.shields.io/badge/frontend-Next.js%20%2B%20TypeScript-blue)
![backend](https://img.shields.io/badge/backend-NestJS%20%2B%20PostgreSQL-green)

---

## Why this project exists

I'm a frontend-focused software engineer with 5+ years of commercial experience (React, TypeScript, component libraries, Agile teams). I built this project to go deeper into full-stack architecture — specifically the kind of problems that don't show up in typical CRUD portfolio apps: server-authoritative time-based resource systems, background job queues, and real-time state sync.

Every architectural decision below is documented with reasoning in [`docs/DECISIONS.md`](./docs/DECISIONS.md) — happy to walk through any of them in an interview.

## What it does

Players manage a stronghold in a dark-fantasy world. Resources regenerate over time (calculated server-side, not trusted from the client), contracts can be accepted and completed for rewards, and longer-running actions — building, research — use a proper job queue rather than naive polling.

| Feature | Status |
|---|---|
| Auth & player state | 🔶 in progress |
| Time-based resource regeneration (server-authoritative) | 🔶 in progress |
| Contracts & inventory system | 🔲 planned |
| Delayed actions via job queue (BullMQ + Redis) | 🔲 planned |
| Real-time notifications (Socket.io) | 🔲 planned |
| Player-to-player interaction (leaderboard/trading) | 🔲 planned |

Full roadmap with milestones: [`docs/ROADMAP.md`](./docs/ROADMAP.md)
Game design & mechanics: [`docs/GAME_DESIGN.md`](./docs/GAME_DESIGN.md)

## Tech stack & why

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + TypeScript | Type-safe, SSR where useful, industry-standard for React roles |
| UI components | Custom library + Storybook | Mirrors real production work — isolated, testable, reusable components |
| Backend | NestJS + PostgreSQL | Structured, testable architecture over a bare Express app |
| Background jobs | Redis + BullMQ | Reliable, restart-safe handling of timed actions (builds, research) — the naive `setInterval` approach doesn't survive a server restart |
| Real-time | Socket.io | Push updates to the client without polling |
| Testing | Jest (unit) + Cypress / Playwright (e2e) | Coverage on the logic that actually matters: resource math, queue behavior |

This is a monorepo (`apps/web`, `apps/api`, `packages/ui`, `packages/shared`) managed with pnpm workspaces — full reasoning in [`docs/DECISIONS.md`](./docs/DECISIONS.md).

## Screenshots

_Coming as soon as v0.1 has a UI worth showing — placeholder for now._

## Getting started locally

```bash
# clone
git clone https://github.com/rafalciecwierz/ashen-contracts.git
cd ashen-contracts

# install (workspace-aware)
pnpm install

# run everything
pnpm dev
```

Requires Node.js 20+, pnpm, and a local PostgreSQL + Redis instance (or see `docker-compose.yml` for a one-command setup — _planned_).

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