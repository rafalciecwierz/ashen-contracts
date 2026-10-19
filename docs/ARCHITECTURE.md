# Architecture — Ashen Contracts

High-level technical overview. The _why_ behind each choice lives in `docs/DECISIONS.md` — this file is the _what_ and _how_.

## System overview

```mermaid
flowchart LR
    subgraph Client
        Web[Next.js web app]
    end

    subgraph Server
        API[NestJS API]
        Queue[BullMQ workers]
    end

    DB[(PostgreSQL)]
    Redis[(Redis)]

    Web -- REST --> API
    Web -- WebSocket --> API
    API -- reads/writes --> DB
    API -- enqueues jobs --> Redis
    Queue -- consumes --> Redis
    Queue -- writes results --> DB
    Queue -- pushes updates --> API
```

## Repository structure (pnpm workspaces monorepo)

```
apps/
  web/          Next.js frontend (TypeScript)
  api/          NestJS backend (TypeScript)
packages/
  ui/           Shared component library, documented in Storybook
  shared/       Shared types/DTOs used by both web and api
docs/           Game design, roadmap, architecture, decisions
```

A single repo keeps `apps/web` and `apps/api` in sync on shared types (`packages/shared`) without manual duplication or publishing an internal npm package — see `docs/DECISIONS.md` #002 for the full reasoning.

## Frontend (`apps/web`)

- **Next.js + TypeScript**, styled with Tailwind
- Components consumed from `packages/ui` (`import { Button } from "@ashen-contracts/ui"`) rather than duplicated locally
- Talks to the API over REST for standard requests, and over a WebSocket connection (Socket.io client) for real-time push (e.g. "your training has finished")

## Component library (`packages/ui`)

- Documented and developed in isolation with **Storybook**
- Published/hosted separately via **Chromatic** so the design system has its own shareable, public link independent of the game itself
- Consumed by `apps/web` as a workspace package (`workspace:*`), not copy-pasted

## Backend (`apps/api`)

- **NestJS** for structure (modules, DI, testability) over a bare Express app
- **PostgreSQL** as the primary data store (players, characters, inventory, world state)
- All time-and-resource-sensitive logic (energy regeneration, skill checks, action costs) is calculated **server-side only** — the client is never trusted with authoritative state (`docs/DECISIONS.md` #003)

### Requests from the BFF and rate limiting

The browser never calls the API: the Next.js route handlers in `apps/web/app/api/` do (`docs/DECISIONS.md` #005), so the API sees the BFF's address, not the player's. For rate limiting, the BFF forwards the player's IP in `X-Client-IP`, together with `X-BFF-Secret`, which carries the `BFF_SECRET` both apps share. The API trusts the forwarded IP only with a matching secret, and otherwise limits by `req.ip`, which `TRUST_PROXY_HOPS` makes the address the platform proxy saw. Login and register are limited per IP, and login also per email (`@nestjs/throttler`, in-memory counters); see `docs/DECISIONS.md` #017.

### Error responses

Every error the API returns has the body `{ code, message, details? }` (`ApiErrorResponse` in `@ashen-contracts/shared`); the HTTP status is not repeated in it. `code` is an `ApiErrorCode`, which the web app translates (`apps/web/messages/en.json`, checked against the union at compile time); `message` is English for developers. Code throws an `HttpException` with `{ code, message }`. The global `ApiExceptionFilter` (`src/common/errors/apiException.filter.ts`, an `APP_FILTER` in `AppModule`) keeps that code, gives errors thrown without one (Nest's 404 for an unknown route, a malformed JSON body) a generic code from their status, and turns anything unexpected into a 500 `INTERNAL_ERROR`. Every 5xx, a deliberately thrown one included, is answered with a fixed message and no `details`, and the real error is logged. Validation errors are 400 `VALIDATION_FAILED`, with one `details` entry per violated rule (`field`, class-validator `constraint`, `message`). See `docs/DECISIONS.md` #018.

## Background jobs (Redis + BullMQ)

Any player action with a real-world duration (training, crafting, later: building) is handled as a queued, delayed job rather than a timer trusted to survive in memory:

1. API receives the action request, validates it, enqueues a job with the resolve time
2. A BullMQ worker picks up the job when it's due, applies the result to the database
3. The result is pushed to the client via WebSocket if they're connected, or fetched on next load otherwise

This survives server restarts and scales past a single process — see `docs/DECISIONS.md` #001.

## Real-time (Socket.io)

Used for push notifications only (action completed, event triggered) — not for gameplay-critical state. If a socket connection drops, the client falls back to fetching current state on reconnect/reload, so the game never depends on the socket staying alive.

## Testing

- **Vitest** — unit tests, focused on the logic that actually carries risk: resource math, queue job handlers, skill-check resolution
- **Vitest + supertest** — API integration tests (`apps/api/test/*.integration-spec.ts`, `pnpm --filter api test:integration`): boot the whole NestJS app and send real HTTP requests through guards, pipes and controllers to the database. NestJS templates call these "e2e"; here "e2e" is reserved for browser tests of the full system. Most replace `PrismaService` with an in-memory fake (`test/fakePrisma.ts`), but `GET /health` pings the real database, so they need Postgres running (`docker compose up -d` locally; a `postgres` service container in CI)
- **Playwright** — browser end-to-end tests of the whole system in `apps/e2e`, run with `pnpm test:e2e` (planned, see `docs/DECISIONS.md` #015): the auth flow first, then the core loop (create character → run expedition → resolve event)

## Deployment

| Component                 | Platform                          | Notes                                                                                                                                                      |
| ------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                | Vercel                            | Root Directory set to `apps/web`; Vercel installs from the workspace root so `packages/ui` and `packages/shared` resolve correctly                         |
| `apps/api`                | Railway / Render                  | Deployed via Dockerfile (multi-stage build copying required `packages/*`). Health check path: `GET /health` (200, or 503 when the database is unreachable) |
| PostgreSQL                | Railway / Render managed instance |                                                                                                                                                            |
| Redis                     | Railway / Render managed instance | Required by BullMQ                                                                                                                                         |
| `packages/ui` (Storybook) | Chromatic                         | Separate public link, independent of the game deployment                                                                                                   |

## Local development

`docker-compose.yml` runs PostgreSQL and Redis in containers, so `pnpm dev` works end-to-end without installing either service. The apps themselves run on the host. Ports are bound to `127.0.0.1` only, and the data lives in named volumes (`docker compose down -v` wipes it). Redis runs with AOF persistence and `maxmemory-policy noeviction`, as BullMQ requires. Setup steps: README, "Getting started locally".
