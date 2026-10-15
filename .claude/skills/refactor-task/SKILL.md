---
name: refactor-task
description: Do one task from docs/REFACTOR.md by its ID (e.g. CRIT-05, REPO-02, API-03), verify it, and record the outcome in the file. Use when the user names a REFACTOR.md task ID or asks for "the next task" from that backlog.
argument-hint: <TASK-ID>
---

# Refactor task

`docs/REFACTOR.md` is a backlog of improvement tasks with stable IDs (CRIT, REPO, AI, DOC, API, SHARED, WEB, UI, GAME). The user works through it one task at a time and **commits every task themselves**: they are the gate that decides what goes in.

## Steps

1. **Read the task** (`$ARGUMENTS`, or the next one in the "Order" list at the top of the file if none is given) and any task it depends on or overlaps with. If a dependency isn't done, or the task is ambiguous, say so and ask before starting.
2. **Do only that task.** If you find a problem that belongs to another task, note it there (or tell the user) instead of fixing it now. If the task cannot be done without part of another one, stop and ask how to split it; never fold another task in silently.
3. **Decide, don't survey.** Where the task leaves a choice open, pick the option you can justify, and record why in the notes. Ask only when the choice is the user's to make (licence, scope, anything outward-facing).
4. **Verify for real.** Run what the task's "Done when" names. Prefer the strongest check that fits:
   - `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
   - a **fresh clone** in the scratchpad (`git clone` + apply the diff) for anything touching install, generated code, env files or CI. A working copy hides gitignored artefacts.
   - the running app (`docker compose up -d`, then the API/web flow) for runtime changes; for UI changes, the `playwright` and `next-devtools` MCP servers (`.mcp.json`) give a screenshot, the browser console and the dev server's errors.
     Clean up whatever you started (containers, dev servers, temporary files). Never read real `.env` files; use dummies.
5. **Record the outcome** in the task's section of `docs/REFACTOR.md`:
   - `**Status:** ✅ DONE (YYYY-MM-DD)`, or `🚫 DROPPED (YYYY-MM-DD)` with the reason. Never delete a task.
   - a `**Notes:**` paragraph: what changed, every deviation from the task text and why, how it was verified, and what was left for which other task.
   - Each `**Field:**` (Status, Notes, Problem, Fix, Done when) is its own paragraph with a blank line before it. Without that, GitHub runs the fields together and Prettier folds them into a preceding list.
   - Run `pnpm format:check`: CI checks Markdown too.
6. **Keep docs in sync** (CLAUDE.md rule): if the task changed a convention or command, update CLAUDE.md / README / ARCHITECTURE in the same change. If it involved a real architectural trade-off, offer an ADR (`adr` skill).
7. **Don't commit.** Finish with a short summary for the user: what changed, how it was verified, anything surprising, and a proposed commit message in Conventional Commits format (`type(scope): subject [TASK-ID]`, header ≤ 100 characters; commitlint rejects longer ones). If the work naturally splits into two commits (e.g. tooling, then a mass reformat), stop between them and let the user commit the first.
