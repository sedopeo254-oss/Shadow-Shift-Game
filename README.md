# Shadow Shift — 0.5.0

A mobile-first light-and-shadow runner with silent retries, surprising falling hazards, and a player-level workshop.

**Playable web alpha. Not an APK, not a publicly deployed community service.**

## التشغيل

```sh
npm run build
npm start
```

Open `http://localhost:4173`. Or open the generated `dist/Shadow-Shift-Portable.html` directly in a browser that supports local files. The standalone file includes the game, editor, local maps, import/export and example maps, without external libraries.

For the actual shared Player Maps service instead of the static server:

```sh
npm run build
npm run community
```

Then open the same localhost address. The service stores accounts, maps and votes in `data/community.sqlite`. `npm start` and `npm run community` are alternative servers, not commands to run on the same port simultaneously. See `docs/COMMUNITY_DEPLOY.md` before public hosting. Committing to GitHub does not deploy the backend; GitHub Pages alone cannot run this Node service.

## What changed

- Faster auto-run with a short acceleration ramp, controllable jump height and a brisker falling phase. Existing fixed-step simulation, jump buffering and full-stage resets remain.
- Falling cows, meteors and cargo crates: actual simulated falling bodies, landing collisions, material-specific art and impact effects. They appear after the tutorial and can also be placed in custom maps.
- Ground art uses world-positioned rock facets, moss/root accents, glass veins or metal paneling, depending on the stage environment.
- **وضع المطور / Workshop:** place, select, drag, erase, undo/redo, choose a background, route length and speed, set light alignments, test, save, import and export `.ssmap` files.
- **Player Maps:** local library and clearly separated online community. Included examples are labelled as team-created examples, not fake player uploads.
- Shared publication requires a completed author replay. The server simulates the recorded input from the beginning before accepting a map. Changing a certified map requires a new test.
- Like, dislike and undo-vote: one current vote per account per map, no self-voting, persistent totals, quality-ranked/most-liked/newest discovery and report/moderator controls.

## Design rules preserved

Only campaign stage 1 displays teaching and solution hints. Stages 2–30 and all custom maps launch without them. Retry changes are not announced. No checkpoints, paid revival or mid-stage resume. Boy and girl have identical physics. Custom maps do not unlock campaign levels or grant permanent currency. Authored maps stay fixed across retries so their layout and verification remain meaningful; campaign routes still mutate silently.

## Using the editor

Open **وضع المطور**. Choose a tool and tap the playfield to place it. Use **تحديد** to select/drag a hazard or **تحريك** and the bottom timeline to navigate. Set the title, background, route length and speed above. Selected light-sensitive objects expose their direction setting; bridges also expose width. The editor deliberately constrains objects to safe spawn/exit margins, bounded counts and non-overlapping challenge intervals.

Use **اختبار** to play the whole map. Completing it enables publication. **حفظ** adds it to the local library; **تصدير** creates a shareable file. The current editor makes horizontal runner routes with shadow gaps and the supported obstacle vocabulary; it is not a free-form 3D terrain sculptor.

## Development and testing

Node.js 22.13+ is required for the optional built-in SQLite service; Node 22.16.0 was used for this build. No npm packages are needed at runtime.

```sh
npm run check
npm run build
python tools/playtest_05.py
```

The optional browser suite needs Python Playwright and Chromium. It starts its own temporary local community service. See `docs/QA.md` for the precise test method and limitations.

## Architecture

`core.js` owns physics; `content.js` owns campaign generation; `scenery.js` owns scene profiles; `visuals.js` owns new terrain/falling-body art; `maps.js` owns the canonical map schema and deterministic replay validator; `workshop.js` owns editor/community UI; `server/` owns authenticated shared persistence. Rendering never grants completion or decides votes.

## Compatibility and boundaries

Completed campaign saves from 0.3/0.4 remain compatible. Export progress before changing browser origin. Challenge codes are now **SS2** because movement and generated hazards changed. SS1 codes are rejected rather than silently producing a different challenge; use the earlier build for those codes. The map format specifies engine `0.5` and rejects other engines.

The 30 campaign routes are modular, not all the handcrafted narrative encounters from the design document. Backgrounds and characters are original code-rendered art. No public hosting, account recovery, email verification, proven one-human-one-account enforcement, native Android packaging, ads, purchases, real-device FPS/battery data or revenue guarantee is included. The account protections and moderation tools are an initial service foundation, not a full production security audit.
