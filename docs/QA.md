# Alpha 0.5.0 verification — 2026-10-29

## Executed

- `npm run check`: **88 tests passed; 0 failed**, Node 22.16.0.
- `npm run build`: successful; fingerprint recorded in `BUILD_INFO.json` in the downloadable package.
- `python tools/playtest_05.py`: **37 browser assertions passed; 0 page errors**, Chromium 144.0.7559.96.

The core suite retains 120 campaign reference-controller runs (30 stages × four attempts) and 36 selected shared-seed runs. The controller was updated to react to the new falling hazards. These are sampled automated paths, not proof of all seeds or a human difficulty assessment. New cases cover acceleration, short/held jumps, falling-state reset, all falling hazard types, map limits, executable-field rejection, custom-map tutorial exclusion, multi-shard results, proof binding, malformed replays, example-map clearances, ranking monotonicity and storage denial.

The real shared-service integration test uses a temporary SQLite database and separate authenticated accounts. It tests publication proof verification, fake-win rejection, cross-account map discovery, no self-vote, idempotent likes, switching/removing votes, ranked discovery, CSRF Origin rejection, reports, private-path denial, persistence after a server restart, moderator hiding and session invalidation on logout.

The browser suite tests actual editor pointer placement, dragging, undo/redo, local saves, character selection and custom-map continuation, author-test completion, proof creation, export, publication/login UI, cross-account vote updates, falling-body screenshots, portrait/landscape layout, two simultaneous touch contacts, pause, tutorial isolation, full retries and offline community disclosure.

## Test harness and limits

Browser URL navigation is blocked by this environment's policy (`ERR_BLOCKED_BY_ADMINISTRATOR`). Tests load the exact generated portable HTML using Playwright `set_content`. An inspection handle and in-memory storage adapter exist only in the test page. For community UI tests, a test-only bridge forwards the UI's API calls to an actual temporary HTTP server. The bridge does not verify browser cookie enforcement, CORS or production networking. Separate Node HTTP tests verify session headers and server-side validation.

Screenshots of the cow/meteor use controlled simulation positions to show the effect clearly. Editor interactions and publication flows are exercised by UI clicks. The account names and votes in `02-player-maps-server-test.png` are test data, not public players or engagement. The temporary service is destroyed after the test; no user database is shipped.

No public deployment, physical Android device test, APK build, long-session frame-time/thermal/battery study, production TLS/cookie test, service-worker upgrade/reload test, real-origin browser persistence test, Docker build or security audit was performed. Do not relabel browser emulation as phone performance evidence.

## Reproduce

```sh
npm run check
npm run build
python tools/playtest_05.py
```

Python Playwright and Chromium are optional development tools, not game runtime dependencies. The browser harness starts and cleans up its own local service. Reports and captures are in `playtest-output-0.5/` in the downloadable package.

## Known scope

Campaign routes remain modular. Authoring is a horizontal-runner editor with a bounded vocabulary, not unrestricted terrain sculpting. Online community works only on the optional server's origin; the portable file remains local/offline. Identity and moderation are an initial foundation, not complete public-service operations. Completed campaign saves are compatible, but old SS1 challenge codes intentionally require the old engine. No checkpoints or paid revival were added.
