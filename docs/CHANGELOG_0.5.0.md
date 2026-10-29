# 0.5.0 — Motion, falling surprises and Player Maps

## Implemented

The tutorial runs at 212 world units/s. Campaign stages after it use 240–288 units/s, up from 184–224 in the prior build. Horizontal speed rises smoothly from 72% to the target at run start. Jump release shortens ascent; the downward phase is faster. Simulation remains fixed at 120 updates/s independently of rendering.

Three new hazards have independent per-attempt state: falling cow, meteor and cargo crate. Their shadow/physical fall is the visual cue; there are no extra solution labels after stage one. Each appears early enough to have an avoidable landing obstacle in sampled layouts. Automated clearance is not a substitute for human balancing.

Terrain is rendered from absolute world positions with stage-specific material details. Decorative edges never alter the actual collision baseline.

The workshop supports ten obstacle types plus shards, 30 backgrounds, 2,400–30,000-unit routes, speeds 200–300, up to 128 obstacles and 12 shards, selection/dragging, timeline navigation, undo/redo, local saves and `.ssmap` import/export. It does not execute scripts from maps. All imports are reconstructed through an allowlist.

The community service verifies an author replay on publication, stores unique account votes, rejects self-voting, ranks maps, paginates and supports reporting/hiding. The bundled standalone UI never invents online counts if the backend is absent.

## Version boundaries

Campaign save schema stays 1. Challenge generator becomes 2/SS2. Custom maps have schema 1 and engine 0.5. Certificate contents bind a map to input ticks; the server independently replays them rather than trusting the certificate's existence.

Authored maps intentionally do not mutate after death; the creator's layout and replay must remain reproducible. Campaign mutation remains silent. No checkpoints were introduced.
