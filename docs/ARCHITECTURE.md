# Architecture and invariants

## Why this implementation

The previous prototype was browser-based. This alpha continues that path with native Canvas 2D and ES modules, rather than making the game depend on an engine download or a server. This is a deliberate scoped implementation, not the Godot/Unity production comparison proposed in the original design. Canvas can be replaced by a Phaser/native renderer while the deterministic rules and content contracts remain testable.

## Boundaries

- `content.js`: authored world metadata, seeded modular routes, challenge codes. Add mechanics deliberately; changing a content algorithm requires a new content/code version.
- `core.js`: fixed-step simulation, collision, jump buffering, light alignment, progress rewards, save schema. No DOM, renderer, account, network, or audio dependency.
- `scenery.js`: 30 immutable scene profiles, absolute-world geometry, a bounded twelve-tile LRU, cached sky and one-time landmarks. Retry seeds never control stage identity. `tutorialFor` is true only for stage 1.
- `render.js`: cached sky, layered ruins, procedural character animation, bounded particles, culling, resolution cap. All images are original code-generated art.
- `app.js`: ready/play/pause/result/menu state machine, DOM UI, pointer/keyboard bindings, audio and visibility lifecycle.
- `sw.js`: versioned app-shell cache. A new worker waits; an active attempt is never force-reloaded.
- `tools/build.mjs`: copies a static build and emits a single-file version with private module scopes. No external build packages.

## Non-negotiable rules

1. A new run always starts at x=80, y=0, time=0, with zero collected shards. This is the start coordinate, not a checkpoint.
2. Save data never includes run coordinates, partial shards, a checkpoint field, or a resume timer. Import uses a strict allowlist.
3. Boy and girl affect art only.
4. Large layout mutations happen between attempts, never secretly during a jump.
5. UFO failure and ordinary death both use the same reset flow.
6. Campaign rewards require an actual won run. Repeating the same result cannot farm permanent campaign rewards.
7. Adapters may not introduce paid revival, power boosts, or energy limits.

## Extending levels safely

Each challenge cell occupies a bounded interval, with safe separation. Add an obstacle to generation, simulation collision, renderer, readable cue, and tests together. Never render a harmless-looking shape with a larger invisible collider. Run seeded solver tests, then human playtests; the solver proves an automated route, not that reaction timing is comfortable.

Campaign failure history stores only bounded aggregate counters for each of 30 stages. In-session trace storage remains capped at 2,400 samples and never resumes a run. Rendering of replay ghosts is disabled in 0.4.0. Daily records are capped at 14 UTC dates. Particles are capped at 100, backgrounds are cached, and the drawing resolution is capped rather than blindly using devicePixelRatio.

## Saves and compatibility

Schema 1 is validated before writes and imports. Future schema versions are rejected instead of silently corrupting data. Add explicit migrations when introducing schema 2. Legacy V1/V2 prototype saves are not imported automatically. Export before clearing browser data or changing origin. Local saves are editable by the owner, so they must never become authoritative online ranking evidence.

## Offline and hosting

Root and subpath hosting use relative URLs. Service workers require an appropriate secure origin; the portable file does not require a worker. Verify installed behavior, cache updates, and storage on real devices before claiming Android/PWA readiness. Reference: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
