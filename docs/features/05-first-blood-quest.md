# Feature: Opening quest — "First Blood" (v0.1)

## Goal
A scripted, one-time quest that fires shortly after character creation: a low-stakes bandit encounter that narratively reveals the character is more capable than they appear. This is the first taste of the event/narrative system that expeditions will use more broadly from v0.2 onward — worth building deliberately, since its structure gets reused.

## Business rules
- Triggers automatically once, after character creation completes (no player action needed to "start" it — it's part of the onboarding narrative)
- Structure: a short sequence of narrative text beats, ending in exactly one player choice (e.g. how to handle the bandit), each choice leading to a resolution text — no branching beyond this single choice point for v0.1
- Reward on completion: a small, fixed amount of XP and/or a starting item (exact values: decide when `docs/GAME_DESIGN.md` stat/XP numbers are finalized in v0.3 — a placeholder constant is fine for now)
- Completing the quest sets a flag on the character so it never re-triggers
- Content (the actual text, choice options, outcomes) should be stored as data (DB rows or a structured content file), not hardcoded strings inline in controller/service code — this is the same principle as locations, and sets the pattern for the larger event system coming in v0.2

## Data (sketch)
```
Quest
  id: uuid
  slug: string, unique (e.g. "first-blood")
  content: jsonb  -- narrative beats, the choice, and outcome text/effects

CharacterQuestProgress
  characterId: uuid (FK → Character)
  questId: uuid (FK → Quest)
  status: enum (not_started | in_progress | completed)
  completedAt: timestamp, nullable
```

## Endpoints (sketch)
- `GET /quests/first-blood` — returns the quest's current text/state for the character (which beat they're on, or the choice screen)
- `POST /quests/first-blood/choice` — { choiceId } → resolves the choice, applies rewards, marks the quest completed

## Edge cases to handle
- Player tries to submit a choice for a quest already marked completed → reject (409), don't double-award rewards
- Player tries to skip straight to `/choice` without having triggered the quest → reject, quest must exist in `in_progress` state first
- New character creation must reliably create the `CharacterQuestProgress` row for this quest — same class of bug as the location-seeding edge case in `04-starting-location.md`, test it the same way

## Tests to write
- Integration: character creation → quest is immediately available in `in_progress` state
- Integration: submitting a choice completes the quest and grants the reward exactly once
- Integration: submitting a second choice after completion is rejected