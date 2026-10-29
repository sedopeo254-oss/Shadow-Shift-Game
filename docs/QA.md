# Alpha 0.3.0 verification — 2026-10-29

## Results

`npm run check`: **53 tests passed, 0 failed** on Node.js 22.16.0. `npm run build` succeeded; the runtime source fingerprint was `c6771f4ac14d`.

The tests include 120 complete reference-controller runs (30 levels × four attempts), plus 36 complete shared-seed runs (three seeds × four later levels × three variants). Four attempts exercise three mutation families and a wraparound; they are not four unique trap families. The controller proves these sampled routes are traversable, not that all possible seeds are proven or that human difficulty is balanced.

Other checks cover full UFO resets, correct shadow shielding, shadow-gap support, frozen ready/dead states, identical character physics, nonoverlapping obstacle envelopes, challenge codes, UTC daily selection, reward limits, invalid imports, backup recovery, storage denial, and exclusion of all in-level positions from save data.

## Browser smoke test

Chromium 144.0.7559.96; 15 checks completed with no JavaScript page errors. Desktop viewport 1440×900; mobile emulation 430×932 and 932×430. Exercised menu boot, both characters, keyboard jump, pause, deliberate gap failure, full restart, visible trap mutation, UFO shield/capture/reset, touch jump, orientation resize, left-handed controls, reduced motion, and portable-build boot/play.

The original environment blocked browser URL navigation. The harness therefore loads the exact built portable HTML through Playwright `set_content`, adding an inspection handle in memory only. Controlled placement is used to reproduce collisions quickly. This does **not** test real-origin storage/reload, HTTPS hosting, service-worker installation, offline cache upgrades, phone hardware, battery, thermal performance, or a signed APK. The storage-denied fallback visible in screenshots is expected in this test context.

Run the optional browser suite after building:

```sh
python -m pip install playwright
python -m playwright install chromium
python tools/playtest.py
```

An existing Chromium can be selected with `CHROMIUM_EXECUTABLE`. These are optional developer-only dependencies, not game runtime dependencies. Output is written to ignored `playtest-output/`. The downloadable source package includes the screenshots and JSON report from the recorded run.

## Known scope limits

- The 30 routes are modular variations, not 30 fully handcrafted story encounters.
- Stars currently measure completion and shard collection. Since auto-run fixes route duration, efficiency uses jumps/sun changes rather than pretending to offer meaningful speedrun times.
- Daily challenges use the device's UTC date. No trusted server time, anti-cheat, cloud synchronization or online leaderboard is present.
- Adaptation is a local rule system; it is not a trained AI.
- Echoes are visual replays; low gravity is implemented, full gravity inversion is not.
- Mobile installation, simultaneous two-finger controls on physical hardware, and long-session performance remain release gates.
- Browser saves depend on the browser's origin/storage policy. Export a backup before moving origins or clearing data.

See `RELEASE_CHECKLIST.md` for the remaining production checks. No revenue, lifetime popularity, or real-device frame-rate guarantee is made.
