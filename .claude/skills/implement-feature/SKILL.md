---
name: implement-feature
description: Implement a feature spec from docs/features/ in reviewed stages (decisions, then API, then web), never autonomously. Use when the user asks to build or implement a feature from docs/features (e.g. "implement 02-character-creation") or the next feature on the roadmap.
argument-hint: <spec file or number, e.g. 02-character-creation>
---

# Implement a feature

A spec in `docs/features/` describes one feature: business rules, data, endpoints, edge cases and the tests to write. This skill turns it into code **in stages**. Each stage ends with a diff the user reads and commits on a feature branch before the next one starts. The user is the gate; you never commit, push or open a PR.

## 1. Read

- The spec (`$ARGUMENTS`, or the next unchecked feature in `docs/ROADMAP.md` if none is given).
- `CLAUDE.md`, `docs/GAME_DESIGN.md` (game content the spec points to), `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, and the feature's line in `docs/ROADMAP.md`.
- The code the feature extends. The closest existing feature (auth, at first) is the reference for module layout, request schemas, error codes, shared types, BFF handlers and tests: follow its patterns rather than inventing new ones.
- Check that what the spec depends on exists (e.g. a location the character starts in). If it doesn't, say so and ask before going on.

If you're on `main`, create a branch `feat/<spec-name>` (e.g. `feat/character-creation`).

## 2. Plan and settle the open decisions

Specs leave decisions open in the text rather than in a dedicated section. Find them: words like "suggest", "e.g.", "sketch", "finalize when", "TBD", "worth noting in DECISIONS.md", content the spec says lives in GAME_DESIGN but doesn't exist there yet, and anything that conflicts with CLAUDE.md, an ADR or the existing code.

Present:

- **The open decisions**, each with your recommendation.
- **The slices**: by default one API slice and one web slice. Propose a split into smaller slices when one side is large, so each diff stays readable.
- **Per slice**: the files it adds or changes, and the test seams from the spec's "Tests to write" (the `tdd` skill confirms seams before any test is written).

Settle the decisions with the user through the `grilling` skill. Then **write the answers back into the spec**: replace the sketches and suggestions with what will be built, so the spec describes the real feature, and set its `**Status:**` to `in progress`. A decision that meets the ADR criteria (see the `adr` skill) is offered as an ADR.

**Stop.** The user commits the updated spec (`docs: ...`) before any code is written.

## 3. Build one slice at a time

**API slice:** request schemas (Zod), response types and error codes in `packages/shared`; Prisma schema change and migration (`pnpm --filter api migrate`); module, controller (schemas attached with `@Body({ schema })`) and service in `apps/api`; unit tests next to the code and integration tests in `apps/api/test/`.

**Web slice:** BFF route handlers in `src/app/api/`, the route and its components (placement rule in CLAUDE.md: `_components/` first, `packages/ui` only for generic UI, with a story), Zod schemas, i18n messages, error codes translated by code.

For every slice:

- Build it test-first with the `tdd` skill, covering the spec's "Tests to write" and edge cases that belong to this slice.
- Keep CLAUDE.md's rules: resource and time values are computed on the server and never taken from the client; timed actions go through the job queue.
- Stay inside the spec. A problem in unrelated code goes to `docs/REFACTOR.md` as a note or to the user, not into this diff. If the implementation proves the spec wrong, stop, agree the change with the user, and update the spec in the same slice: the rule itself, plus a line under "Deviations from spec" saying what changed and why.
- Verify: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`. For the API slice, also run the flow against the running API (`docker compose up -d`, `pnpm dev`). For the web slice, check the screens with the `playwright` and `next-devtools` MCP servers (screenshot, console, dev server errors). Clean up what you started.

**Stop after each slice** with a short summary: what changed, how it was verified, any deviation from the spec, and a proposed commit message (`feat(api): ...`, `feat(web): ...`, header ≤ 100 characters). Wait for the user to commit before starting the next slice.

## 4. Finish

In the last slice, before its stop:

- `CHANGELOG.md`: short lines under `[Unreleased]` → `### Added` (a git-log summary, not a design doc).
- `docs/ROADMAP.md`: tick the feature's checkbox.
- The spec: `**Status:** done`. "Deviations from spec" lists every difference from the spec as committed in stage 2, and known gaps with their `docs/REFACTOR.md` IDs (or "None.").
- `CLAUDE.md` "Current status": last completed and next step.
- Re-read the spec against the code: endpoints, edge cases and tests must match what was built.

Then tell the user the branch is ready for a PR (the `claude-review` workflow comments on it; CI is the gate).
