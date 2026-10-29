# 0.5.1 — Input and trap presentation polish

This release includes the 0.5 movement, falling hazards, Workshop and Player Maps service, plus:

- Input ownership for held jump actions: lifting another finger/key does not truncate a jump. Sunlight uses explicit pointer capture and three-position mapping while remaining a keyboard-accessible range.
- Fixed-step render interpolation for the runner/camera. Physics, replay certificates and collision geometry are unchanged from engine 0.5.
- Metallic spikes, layered laser emitters and machined saws. Cow shading, meteor facets and falling streaks. Editor previews now show actual falling-object art rather than placeholder glyphs.
- Editor drags retain the selected object after sorting, and ignore unrelated secondary pointers.
- Hidden tabs skip drawing; disabled sound emits no impact tone.
- Reproducible source ZIP alongside the web build in GitHub Actions.

Validation: 94 Node assertions passed and 37 browser checks passed on 2026-10-29. These are not real-device frame-rate or battery measurements. The browser harness uses an in-memory page and a real temporary HTTP service through a test bridge; public hosting and production cookie behavior remain unverified.

No public backend is deployed by this update. Run `npm run build` then `npm run community` for the shared local service. Public launch still requires a suitable HTTPS host, durable storage and moderation. The independent HTML file supports local creation, testing and file sharing, but cannot hold votes from other players on its own.
