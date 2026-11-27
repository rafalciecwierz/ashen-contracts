# Location art: style rules

Every location in Ashen Contracts has one landscape: a layered silhouette scene in the manner of a stage set, lit by a single source and veiled in mist. These rules keep a new scene consistent with the ones already in `docs/design/locations.html`.

## Canvas

- 1200 × 420 (about 20:7), rendered with `preserveAspectRatio="xMidYMid slice"`. Frames crop it: the map thumbnails and phone screens cut the sides, so **keep the subject between x 0.25 and 0.75**. The outer 20% on each side is for framing only.
- The horizon sits between y 0.50 and 0.60. The lower third is ground, water or foreground.
- Coordinates in a spec are fractions of the canvas (`x`, `y`). Sizes (`min`, `max`, `r`, `amp`, `s`) are pixels at height 420 and scale with it.

## Depth: four planes, back to front

The palette has four layer colours, `0` (far, lightest) to `3` (near, darkest). **The nearer a plane, the darker its colour.** A scene is built in this order:

1. **Sky and glow:** set by the tone and `glow` (where the light comes from). Optionally `moon` or `birds`.
2. **Far plane (colour 0):** a `ridge`, often with small, dense `pines` (40 to 80 px). Low contrast.
3. **Mist band:** one `mist` between the far and middle planes. It is what makes the depth read.
4. **Middle plane (colour 1, or 2 for the subject):** the **subject** (`hut`, `mill`, `ruins`, `tower`, `cave`, `graves`) and its surroundings.
5. **Foreground framing (colour 2):** large `pines` with `edges: true`, or `deadtrees` near the sides. They frame, never cover the subject.
6. **Ground (colour 3):** `ground` or `water`, plus small props (`stumps`, `rocks`, `reeds`, `fence`).
7. Optionally, a **second mist** low over the ground for marsh and graveyard moods.

Never put a darker plane behind a lighter one, and never skip the mist between far and middle.

## Light

- **One light source per scene:** the glow, the moon, a fire, a lit window (`hut` with `lit`) or a lit cave mouth (`cave` with `lit`). A warm point light on top of a cool sky is the one allowed contrast.
- Put the glow behind or beside the subject, so its silhouette reads against the brightest sky.
- No scene is fully lit. The sky fades into darkness at the top, and the foreground is near black.

## Tones

The tone carries what the place means to the player, so pick it by mood, not literally by the time of day:

| Tone    | Use for                                               | Example        |
| ------- | ----------------------------------------------------- | -------------- |
| `ember` | safe or warm places: camps, villages, the stronghold  | Clearing       |
| `dusk`  | ordinary wilderness, the default                      | Old forest     |
| `blood` | danger: monster lairs, battlefields, contract targets | Wolves' den    |
| `night` | death, the uncanny, locked or unknown places          | Unknown        |
| `fog`   | water, abandonment, desolation                        | Abandoned mill |

Neighbouring locations on the map should not all share one tone.

## Composition

- **One subject.** A scene shows one place, not a collage. When the description lists several things, pick the one that names the place and turn the rest into props, or leave them out.
- Put the subject off centre (around x 0.35 or 0.62), with the glow on its other side or right behind it. A centred subject is allowed only for symmetric places (a cave, a gate).
- Repetition makes a place: many pines make a forest, many headstones a graveyard. Use `count` before adding more layer types.
- **Pick the seed.** Try a few seeds and keep the one where nothing awkward lines up (a tree trunk through the subject, a bird on the moon).

## Never

- Outlines, strokes around shapes, gradients other than the generator's, or textures. Everything is a flat silhouette.
- Text, people, faces, gore.
- Religious symbols (crosses, stars of David, pentagrams). Headstones are rounded slabs.
- Colours outside the palette. To get a new mood, propose a new tone in `scenes.js` (five colours plus a mist RGB), and check it against the existing ones in the gallery.

## Budget

- At most **14 layers**, and at most **60 kB** per SVG (`render.mjs` enforces both).
- Pines are the costly layer. Keep their total `count` under about 120.

## Layer reference

Fields marked \* are required. `color` (0 to 3) is optional everywhere and defaults to the value in brackets. `spread: [a, b]` limits random x positions to that range of the width. `edges: true` puts them in the outer 22% on each side.

| Type        | Fields                                                    | Notes                                       |
| ----------- | --------------------------------------------------------- | ------------------------------------------- |
| `ridge`     | `y`\*, `amp` (20), `opacity`, color (0)                   | wavy hill line, filled down                 |
| `ground`    | `y`\*, `amp` (8), color (3)                               | the near ground                             |
| `pines`     | `y`\*, `count`\*, `min`\*, `max`\*, `spread`/`edges`, (1) | trees standing on y; sizes are heights      |
| `deadtrees` | `y`\*, `count`\*, `min`\*, `max`\*, `stroke` (5), (2)     | bare forked trees                           |
| `mist`      | `y`\*, `h`\*, `a` (0.8)                                   | a band of haze from y to y + h              |
| `water`     | `y`\*, `glint` (0.7), color (2)                           | still water from y down, glint x            |
| `stumps`    | `y`\*, `at`\* `[[x, size], …]`, color (3)                 | tree stumps                                 |
| `rocks`     | `y`\*, `count`\*, `spread`, color (3)                     | boulders                                    |
| `reeds`     | `y`\*, `count`\*, `min` (30), `max` (70), (3)             | marsh reeds and cattails                    |
| `fence`     | `y`\*, `x0`\*, `x1`\*, color (3)                          | a broken paling fence                       |
| `fire`      | `x`\*, `y`\*                                              | a campfire with a ground glow               |
| `smoke`     | `x`\*, `y`\*                                              | a blurred column rising from x, y           |
| `hut`       | `x`\*, `y`\*, `s` (1), `lit`, color (2)                   | x is its left edge; `lit` lights the window |
| `mill`      | `x`\*, `y`\*, `s` (1), color (2)                          | wheel on its left                           |
| `ruins`     | `x`\*, `y`\*, `s` (1), color (2)                          | a broken wall with an arch                  |
| `tower`     | `x`\*, `y`\*, `s` (1), color (1)                          | a crenellated tower                         |
| `cave`      | `x`\*, `y`\*, `s` (1), `lit`, color (1)                   | a rock mound with a mouth, centred on x     |
| `graves`    | `y`\*, `count`\*, `s` (1), `spread`, color (2)            | leaning headstones                          |
| `moon`      | `x`\*, `y`\*, `r` (26)                                    | uses the glow colour                        |
| `birds`     | `x`\*, `y`\*, `count` (5)                                 | a loose flock around x, y                   |
