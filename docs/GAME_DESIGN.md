# Game Design — Ashen Contracts

## Vision & tone

A narrative-driven, text-heavy idle RPG. The prose carries as much weight as the mechanics — event descriptions, quest text, and location flavor should read like passages from a dark-fantasy novel, not generic game copy.

**Tonal references:** Andrzej Sapkowski's _Witcher_ saga (morally grey world, contracts-for-coin framing, dry/weary narrator voice) and R.A. Salvatore's _Legend of Drizzt_ (a skilled outsider building a reputation and an identity in a world that doesn't know them yet).

**Structural reference:** _A Dark Room_ — proof that minimal visuals + strong text + random narrative events with meaningful choices is a complete, compelling idle game on its own. This project follows that same philosophy rather than a graphics-heavy approach.

## The character

The player starts as someone whose past is deliberately unclear — not a blank slate, but a mystery even to themselves. Early gameplay hints that they are more capable than they first appear; who they _become_ is shaped by the player's choices over time rather than told upfront.

**Character creation (short, at game start):**

- Choose a race/origin (flavor + minor stat bias)
- Choose a small number of starting traits/personality leanings (flavor text + minor effect — not a full skill tree at this stage)

**Opening quest — "First Blood":** the player arrives in an unfamiliar land and stumbles into a low-stakes bandit encounter. Its real purpose is narrative: it reveals to the player (and to the character) that they're not the laypeople they might have assumed — a first hint of the mystery, not an explanation of it.

## Core loop

1. Open the **map** and pick an unlocked location
2. **Go on an adventure** there: it costs energy and resolves **instantly** into an outcome drawn from that location's pool
3. The outcome grants resources, items or XP, and occasionally a cost or consequence
4. From the outcome screen, **go again** (same location, same energy cost) or **return to the map**
5. Spend what you gathered on training, equipment, or unlocking new locations; build reputation, which unlocks the stronghold and further story

Energy is the idle element: it regenerates in real time on the server (`docs/features/03-energy-resource.md`), so it decides how many adventures a player can take, and coming back later is rewarded. Adventures themselves do not take real time.

## Adventures

An adventure is one visit to a location. It is the basic, repeatable action of the game.

- **Cost:** energy, set per location (harder locations cost more). Without enough energy, "go again" is unavailable and the screen shows when the next point of energy arrives.
- **Resolution:** instant and server-side. The server checks and spends the energy, draws one outcome from the location's pool, applies its effects, and returns it.
- **Content is data:** each location has its own outcome pool (text plus effects), stored as data like locations and quests, never hardcoded per location.

**Outcome types**, introduced gradually ("build it simple, then make it harder"):

1. **Ready outcomes** (first version): text plus a fixed effect, with no input from the player. Mundane ("You walk the clearing. Nothing of note happens." small gain), rewarding (coin, an item, XP), or a complication (a cost: lost energy, a minor injury).
2. **Interactive outcomes** (later): the outcome stops on a player choice before its effect is applied. This includes the game's mechanical signature, item-gated alternate resolutions (see below), and stat-based skill checks.

## Contracts

A contract is a **special mission**, not the everyday action. Contracts appear later, as the character grows and reaches harder locations: offered by a place or a person, with requirements (level, reputation, an item), a bigger reward, and a short narrative arc of their own. They give the game its name, but they are **not part of the first versions**: the base loop (map → adventure → outcome) comes first, and contracts are designed on top of it once it works. Their exact shape (duration, steps, failure) is decided then.

## Screen layout

The game is one shell with a fixed frame and a content area driven by the URL.

- **Top bar:** game logo, character name, energy, level (once leveling exists, v0.3), and the player's avatar with a dropdown menu (settings, log out).
- **Left column (fixed): game navigation.** Map, Character, Stronghold (shown locked until unlocked), Ranking, and further features as they arrive.
- **Right column (fixed): the character.** Avatar and basic stats.
- **Center column (widest): the current view**, chosen by the URL: the map (a plain list of locations at first, no graphics), the character's stats, the stronghold, or a single location with the outcome of the last adventure.

Example flow: Map in the navigation → the map in the center → pick the forest → the outcome of an adventure in the forest appears in the center at once → "Go again" or "Back to map".

Visual direction: `docs/DESIGN.md` (brief and style guide), proposals in `docs/design/`.

## World & locations

The player starts with one accessible location (a clearing on the forest's edge). Reputation, quest progress, and items gradually unlock new locations, each with its own outcome pool, narrative flavor and energy cost.

Progression is geographic _and_ narrative: new locations aren't just new resource sources, they're new chapters of the world's text.

## The stronghold (mid-game unlock)

After a triggering quest, the player establishes a base (a keep, hideout, or camp — name TBD). This unlocks:

- **Training** — spend resources and real time to raise stats or unlock skills (functionally similar to a "technology tree" in games like OGame, but framed narratively — e.g. "study forgotten sword forms" rather than "unlock Attack Tier 2"). Training is the first action with a real-world duration, so it is the first use of the job queue (`docs/DECISIONS.md` #001).
- **Blacksmith/armory** — purchase equipment with in-game currency
- Some equipment is **adventure-only loot**, not purchasable — this is what gives adventures long-term value beyond raw resource farming

## Randomness & narrative events

This is the heart of what makes the game distinctive. Adventures in the same location can resolve very differently:

- **Mundane outcome:** "You walk the clearing. Nothing of note happens." (low resource gain, sets a baseline)
- **Complication:** "You trip on an exposed root, strike your head, and wake with a headache and half your strength gone." → an energy cost, not purely negative if it also grants something
- **Choice + conditional item check** (interactive outcome, later): a squirrel is holding something. The player can chase it (risk/reward roll) or, _if they happen to be carrying an acorn from an earlier adventure_, offer it instead — guaranteeing the squirrel drops what it's holding, which is sometimes valuable and sometimes worthless

This last pattern — **item-gated alternate resolutions** — is the mechanical signature the game grows towards: exploration isn't just "roll a number," it's "does the player have what this moment needs." It arrives after ready outcomes work end to end.

### Skill checks (initial approach)

Some interactive outcomes require a check rather than a pure die roll — e.g. a stat threshold determines success (using the character's stats/level, calculated server-side). This delivers "player choices and build matter" without needing real-time input mini-games yet.

## Character progression

- **Energy** — the base time-gated resource, spent on adventures (see `docs/features/03-energy-resource.md`)
- **Experience → Levels** — gained from adventures, quests, and events
- **Stats** — a small set (e.g. Might, Wits, Resolve) that: (a) unlock through leveling and training, and (b) determine outcomes of stat-based skill checks in narrative events

Exact stat list and formulas: to be finalized when we scope v0.2 — deliberately left open here so we don't over-design before building the base loop.

## Deliberately out of scope for v1.0 (stretch goals — revisit later)

These are good ideas, but attempting them alongside the core loop risks the project never shipping. Once v1.0 is live and demoable:

- **PIXI.js-based mini-games** for certain adventure outcomes (visual, real-time)
- **Reflex/memory/logic challenges** (timed clicks, sequence memorization, logic puzzles) as an alternative to stat-based skill checks — this is a genuinely good idea for making player _skill_ matter, not just character stats, but it's a significant scope addition and should come after the core text-driven loop works end-to-end
- **Deep branching origin story** — for v1, the "mystery" is conveyed through flavor text and a handful of hinted reveals, not a full branching narrative tree

## Scope guardrails

- No payment/monetization systems
- No fully branching narrative tree in v1 — a small number of scripted reveals tied to milestones, not a dialogue tree engine
- Resist adding new resource types before the core loop (one resource, adventures, a few locations) is fully working end-to-end
