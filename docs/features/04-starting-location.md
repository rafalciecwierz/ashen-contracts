# Feature: Starting location — the Clearing (v0.1)

## Goal
A single accessible location where the character exists after creation. In v0.1 this is mostly a data model and a screen to view it — the ability to run expeditions there comes in v0.2 (`docs/ROADMAP.md`), but the location and its narrative framing need to exist first.

## Business rules
- All new characters start in the same location (the clearing — narrative content in `docs/GAME_DESIGN.md`)
- Locations are data-driven (seeded rows), not hardcoded per-location logic — this matters because v0.5+ adds more locations, and the system should already support that without a rewrite
- For v0.1, a location has: a name, flavor/description text, and a flag for whether it's currently unlocked for a given character (only the starting location is unlocked by default)

## Data (sketch)
```
Location
  id: uuid
  slug: string, unique (e.g. "the-clearing")
  name: string
  description: text

CharacterLocationUnlock
  characterId: uuid (FK → Character)
  locationId: uuid (FK → Location)
  unlockedAt: timestamp
```

Using a join table (`CharacterLocationUnlock`) rather than a flag on `Character` is deliberate — it's what makes adding "unlock a new location" in a future version a data change, not a schema change.

## Endpoints (sketch)
- `GET /locations` — returns all locations, each marked as locked/unlocked for the current character
- `GET /locations/:slug` — full detail for a single unlocked location (404 or 403 if not yet unlocked)

## Edge cases to handle
- Requesting a location the character hasn't unlocked → 403, not a generic 404 (the location exists, they just can't see it yet — useful distinction for the frontend to show "???" instead of nothing)
- New character creation must always seed the `CharacterLocationUnlock` row for the starting location — write a test specifically for this, since a forgotten seed step silently breaks the whole game

## Tests to write
- Integration: new character has exactly one unlocked location (the clearing) immediately after creation
- Integration: fetching a locked location returns 403