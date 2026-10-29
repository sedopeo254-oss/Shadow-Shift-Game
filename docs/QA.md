# Alpha 0.4.0 verification — 2026-10-29

## Executed results

- `npm run check`: 60 tests passed, zero failed (Node.js 22.16.0).
- `npm run build`: succeeded; runtime fingerprint `d505926c2780`.
- `python tools/playtest.py`: 40 browser assertions passed, zero page errors, Chromium 144.0.7559.96.

The existing 53 rules tests still include 120 reference-controller campaign runs (30 stages × four attempts) and 36 selected shared-seed runs. They cover only sampled routes, not every possible seed or human difficulty. Seven new tests cover tutorial-only policy, unique scene descriptions, stable stage identity across retries, non-wrapping world cells, absence of mutation copy, old-save compatibility, and build/cache inclusion.

The browser suite exercises the level-1 tutorial, actual first-level completion with the reference controller, immediate level-2 entry, hint removal, absence of canvas labels, silent death/retry, actual trap mutation, UFO reset, return to the tutorial, all 30 rendered scene fingerprints, bounded scenery cache, portrait/landscape resizing, simultaneous two-contact touch input, settings, and storage-denial fallback. Screenshot sizes include 1440×900, 430×932, 932×430 and 360×640. Distinct image fingerprints demonstrate different renderings, not a subjective quality score.

## Test environment limits

Browser URL navigation is blocked by environment policy. The harness loads the exact generated portable HTML through Playwright `set_content`, injecting an inspection handle and a memory-backed storage adapter for UI flow tests only. A separate page verifies the original storage-denied path. Gallery captures use controlled positions and frozen simulation with physically supported bridge placement. None of these test-only adapters is in the distributed game.

HTTPS hosting, service-worker installation and upgrades, actual-origin persistence, physical Android multi-touch, thermal behavior, battery consumption and sustained frame rates were NOT verified. No APK was built. Do not turn browser emulation into device-performance claims.

## Reproduce

```sh
npm run check
npm run build
python tools/playtest.py
```

Optional developer dependency: Python Playwright and a Chromium executable (or `CHROMIUM_EXECUTABLE`). The game itself still has no external runtime packages. Reports/screenshots go in ignored `playtest-output/`.

## Presentation acceptance criteria

Only level 1 may display a briefing, context hints, control descriptions, route labels, failure advice, or projection lines. Stages 2–30 launch directly. Later failure screens contain only neutral outcome text and actions; retries never announce new obstacles or play a mutation notification sound. Cosmetic motion, physical hazard appearance and control focus/accessibility are not solutions.

There are 30 code-rendered scene compositions with distinct palettes, primary landmarks, atmosphere and seeded geometry. They are not 30 hand-painted raster artworks. Absolute-position landscape tiles use a twelve-entry LRU cache; geometry does not reset using a camera modulo period. Shared shape vocabulary and repeatable environmental particles remain intentional. Scenery is independent of attempt seeds, so a retry retains the identity of its stage.

## Unchanged scope

The 30 gameplay routes remain modular. They do not yet implement all handcrafted story scenarios from the original GDD. Adaptation is local rules, not trained AI. No checkpoints, revival purchase, analytics, cloud save or online leaderboard. Save schema and challenge-family algorithm remain version 1 for compatibility.
