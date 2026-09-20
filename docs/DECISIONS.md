# Architecture Decisions (lightweight ADR log)

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

## 004. [Next decision]
...