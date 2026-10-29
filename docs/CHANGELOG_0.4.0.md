# 0.4.0 — Quiet play / distinct landscapes

## Player-requested changes

- Only stage 1 teaches sunlight, running and jumping. All later stages start immediately.
- Removed later-stage hint banners, required-direction labels, hazard names, warning underlines, projection guides, progress guidance, control descriptions and replay ghosts.
- Removed mutation announcements from menu copy, results, retries and challenge descriptions. Real trap mutation remains active.
- Simplified the HUD to pause, stage identity, collected shards, sunlight control and jump.
- Added 30 stage-specific landscape profiles with unique primary landmarks, palettes and atmosphere. Long landscapes are indexed in world space rather than repeated screen-space strips.
- Bounded scenery tile cache and offscreen landmark culling; no external art/font/download dependencies.
- Kept full-stage resets and the existing completed-progress save format. Old 0.3.0 saves and SS1 codes remain compatible.

## Development

`src/scenery.js` owns visual profiles, continuous scenery and the tutorial policy. `src/render.js` draws instruction overlays only when that policy permits them. `src/app.js` controls first-stage briefing versus immediate play and suppresses all later solution hints. Tests exercise policy and transition paths, not just CSS visibility.

See `docs/QA.md` for measured results and environment limits. Original reference design documents describe a broader future scope, not what this release claims to contain.
