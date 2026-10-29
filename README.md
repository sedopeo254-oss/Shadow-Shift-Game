# Shadow Shift

A mysterious mobile puzzle-runner where light creates paths, traps react to failures, and every defeat changes the stage.

**Playable alpha 0.3.0 — not a finished Android store release.**

## العب الآن

- شغّل `npm start` ثم افتح `http://localhost:4173`.
- أو شغّل `npm run build` وافتح `dist/Shadow-Shift-Portable.html` كملف مستقل، دون تحميل مكتبات خارجية. السماح بالملفات المحلية يختلف بين متصفحات الهواتف.
- للموقع الثابت: ارفع محتويات `dist/` أو استخدم جذر المستودع. كل المسارات نسبية وتناسب مجلد GitHub Pages.
- لإتاحة نسخة ويب من المستودع: Settings → Pages → Deploy from a branch → `main` → `/ (root)`. هذا إعداد على GitHub، وليس خطوة ينفذها هذا الكود تلقائيًا.

## What's implemented

- Auto-running, variable-height jump, jump buffer, and coyote time at a fixed 120 Hz simulation step.
- Boy/girl Echo characters with identical physics and original procedural vector art.
- Three sunlight positions, solid shadow bridges, readable fake-bridge cues, spikes, laser fields, saws, light-locked gates, low-gravity zones, and UFO abduction/shields.
- 30 configured routes across five palettes/worlds, approximately 48–190 seconds. Routes are built from modular cells; **they are not all 30 bespoke narrative levels from the design document**.
- A different trap family and shadow alignment after every failure. Campaign retries also use early/late jump history; this is deterministic rule-based adaptation, not machine learning or mind-reading.
- No checkpoints, no paid revival, no mid-level resume, no energy system.
- Three optional shards per run, permanent completion rewards, five cosmetic colorways, and local records.
- A UTC daily challenge, bounded daily reward history, and shareable `SS1` challenge-family codes. Retries within a shared family change deterministically. Scores are local, not an online leaderboard.
- Versioned allowlisted save data, validated import/export, a last-good backup, and graceful storage failure.
- Keyboard and multi-touch controls, landscape/portrait layouts, left-handed layout, reduced effects, procedural audio, and capped/adaptive rendering resolution.
- Offline service-worker code and a dependency-free portable build. HTTPS installation still needs a real-origin/device check; see `docs/QA.md`.

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Sun | Drag the gold slider to left / center / right | 1 / 2 / 3, or A / D |
| Jump | Hold the jump button for a higher jump | Hold Space or Up |
| Pause | Pause button | P or Escape |
| Retry after failure | Retry button | R |

Match a bridge's arrow with the sun. Match a gate or UFO marker to open the gate or form a shadow shield. The dotted golden line is not a solid bridge. Death discards collected run shards and returns to the very beginning.

## Development

Requires Node.js 20+; **no npm dependencies or install step**.

```sh
npm test
npm run check
npm run build
npm start
```

`src/core.js` owns rules, `src/content.js` owns level data/generation, `src/render.js` owns drawing, and `src/app.js` owns browser UI/input. The renderer does not decide collisions or save player position.

See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/QA.md`, and `docs/RELEASE_CHECKLIST.md`.

## Honest boundaries

This is a working foundation, not a promise of permanent popularity or revenue. It does not contain an APK, ad SDK, purchases, cloud accounts, authoritative leaderboard, full cinematic story, interactive replay-ghost puzzles, reversed-gravity ceiling stages, or a finished final boss. Echo ghosts are visual replays only. No device FPS, battery, retention, or income claim is made without measurement.

All game illustrations and sound synthesis in this repository are original procedural code. No downloaded character artwork, font binaries, tracking SDKs, or paid services are required. Repository publication does not by itself grant an open-source license; the owner can choose licensing separately. The previously supplied full design DOCX/PDF are included with the downloadable project package, not duplicated as binary repository assets.
