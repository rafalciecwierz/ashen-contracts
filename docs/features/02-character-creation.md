# Feature: Character creation (v0.1)

## Goal
A short creation flow that sets up the player's character: a race/origin choice and a small number of starting traits. Keep it brief and flavorful — this is scene-setting for the mystery-origin narrative, not a deep character-builder.

## Business rules
- Triggered once, right after first login, before the character can do anything else
- Player picks exactly one **race/origin** from a fixed list (content lives in `docs/GAME_DESIGN.md`, not hardcoded narrative in this spec)
- Player picks a small number of **starting traits** (suggest: exactly 2, from a short fixed list) — flavor text plus a minor stat bias each
- Race and traits together produce a small starting stat spread (exact formula: finalize when `docs/GAME_DESIGN.md`'s stat list is locked in v0.3 — for v0.1, a simple flat bonus per choice is enough)
- Character name: player-chosen, free text, with basic validation (length, no profanity filter needed for a portfolio project — but do sanitize for XSS on display)
- Once created, race/origin and traits are **permanent** for v0.1 (no respec) — this is a scope decision worth noting in `docs/DECISIONS.md` if it changes later

## Data (sketch)
```
Character
  id: uuid
  playerId: uuid (FK → Player)
  name: string
  race: enum (from GAME_DESIGN.md list)
  traits: string[] (fixed-size, e.g. exactly 2)
  currentLocationId: uuid (FK → Location, defaults to the starting location)
  createdAt: timestamp
```

## Endpoints (sketch)
- `GET /character-creation/options` — returns the available races and traits (with flavor text) so the frontend doesn't hardcode game content
- `POST /characters` — { name, race, traits } → creates the Character for the authenticated player, sets starting location and initial stats

## Edge cases to handle
- Player already has a character → reject creation (409), redirect to the game instead
- Invalid race/trait combination (not in the allowed list) → 400
- Character name empty, too long, or containing only whitespace → validation error
- Race/trait options list should be driven by data (seeded in the DB or a config file), not hardcoded in the endpoint logic — makes it easy to add more later without touching business logic

## Tests to write
- Unit: stat calculation from a given race + trait combination
- Integration: full creation flow end-to-end, including the "already has a character" rejection
- Integration: creation fails gracefully with an invalid race/trait value