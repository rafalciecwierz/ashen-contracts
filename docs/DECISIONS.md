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
Context: `@nestjs/jwt` and `@nestjs/swagger` both ship code that includes ES Module `import` syntax somewhere in their dependency tree (`jsonwebtoken`, `reflect-metadata`). Jest's default setup treats `node_modules` as pre-built CommonJS and doesn't transform it, so any spec file importing something that pulls in these packages fails immediately with `SyntaxError: Cannot use import statement outside a module` — a plain unit test failure, not a bug in the application code.
Decision: mock the affected module entirely in each spec file with an explicit factory (`jest.mock('@nestjs/jwt', () => ({ JwtService: jest.fn() }))`), rather than widening Jest's `transformIgnorePatterns` to compile these packages on the fly.
Alternatives considered: a `transformIgnorePatterns` regex targeting the specific packages — tried first, but failed in practice because pnpm's `.pnpm` store nests packages under a second `node_modules` segment (`node_modules/.pnpm/@nestjs+jwt@.../node_modules/@nestjs/jwt/...`), so a naive pattern matches the wrong segment and never reaches the real package path. Widening the pattern further is possible but adds ongoing maintenance cost (a new entry per problematic package) for something unit tests shouldn't need to compile at all.
Consequences: unit tests never execute real JWT-signing or Swagger-decorator code — which is correct for a unit test (that behavior is exercised in `AuthService`'s own logic via injected fakes, not by the library internals). The trade-off: forgetting to add the mock when a new module imports one of these packages produces a real but slightly confusing failure; documented in `CLAUDE.md` under Code conventions so it's applied proactively for Character/Location/Quest modules.

## 005. [Next decision]
...