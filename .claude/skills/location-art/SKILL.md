---
name: location-art
description: Draw the landscape for a game location as a static SVG in the house style, from a short description. Use when the user describes a new location (or asks for location art, a scene, a landscape for a place) or wants an existing scene changed.
---

# Location art

Each location has a landscape: layered silhouettes, mist and one light source. A scene is **data**: a JSON spec (a tone, a seed, and layers from a fixed vocabulary), rendered to SVG by the generator in `docs/design/shared/scenes.js`, which the design prototypes use in the browser too. You never draw paths by hand: you choose and place layers.

Files:

- `STYLE.md` (next to this file): the rules and the layer reference. **Read it first, every time.**
- `render.mjs` (next to this file): validates specs and renders them to SVG.
- `docs/design/assets/locations/<slug>.json` and `<slug>.svg`: one pair per location.
- `docs/design/locations.html`: the gallery of every scene, the consistency check.

## Steps

1. **Read the description and decide** the slug (kebab-case English, e.g. `wolf-den`), the tone (by mood, see STYLE.md "Tones"), the one subject, and its props. If the description is too vague to pick a subject, ask one question; otherwise decide yourself.
2. **Map it to the vocabulary.** If the place needs something the vocabulary lacks, first try to build it from existing layers (a lair is a `cave`, a camp is `fire` + `stumps`). Add a new layer type to `scenes.js` only when it will be reused by other locations. A new type is a flat silhouette in the palette's layer colours, takes fractional `x`/`y` and pixel sizes scaled by `c.u`, and draws its randomness from `c.rnd`. Add its required fields to `REQUIRED` in `render.mjs` and a row to the reference in STYLE.md.
3. **Write the spec** to `docs/design/assets/locations/<slug>.json`, following the plane order in STYLE.md.
4. **Render:** `node .claude/skills/location-art/render.mjs docs/design/assets/locations/<slug>.json`. It fails on an unknown tone or layer type, a missing field, or a blown budget; fix the spec and run it again.
5. **Compare in the gallery.** Add a row (`[slug, name, description]`) to `SCENES` in `docs/design/locations.html`. Serve `docs/design` locally (`python3 -m http.server 8765 --bind 127.0.0.1` from that folder; Playwright cannot open `file://`), and take a full-page screenshot of `/locations.html` with the Playwright MCP into `.playwright-mcp/`. Look at it:
   - Is the subject readable at thumbnail size, and inside x 0.25 to 0.75?
   - Are the planes darker towards the front, with mist between them?
   - Is there one light source?
   - Does the scene sit among the others without standing out (brighter, busier, flatter)?

   Adjust the spec (positions, `s`, `count`, `color`, the seed) and re-render, at most about three rounds. If something still looks wrong, say what.

6. **If you changed `scenes.js`**, re-export the built-in scenes (`render.mjs --known docs/design/assets/locations`) and check in the gallery that they did not change.
7. **Report** to the user: the screenshot, the spec's tone and subject in one line, the file size, and anything you could not express with the vocabulary. Don't commit; propose a commit message (`docs(design): add <slug> location art`).

## Notes

- The built-in specs (clearing, forest, mill, unknown) live in `SCENE.SPECS` in `scenes.js`, because the prototypes load it as a classic script from `file://` and cannot fetch JSON. Their JSON and SVG copies are exports (`--known`); edit them in `scenes.js`.
- Output is deterministic: the same spec and seed always give the same SVG, so a diff of the JSON is the review.
- Where the game app will load the SVGs from is decided when the map feature is built (v0.2); until then they live under `docs/design/assets/locations/`.
