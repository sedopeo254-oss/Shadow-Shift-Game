# Player Maps service: setup and operational limits

## Local run

Use Node 22.13 or later (tested with 22.16.0):

```sh
npm run build
npm run community
# http://localhost:4173
```

This starts the static game and `/api/v1/` on the same origin. Account creation, publication and voting use this server, not localStorage. Only editor drafts and local maps use browser storage.

## Public hosting

No paid service or public deployment was provisioned by this update. GitHub stores the code; a separate running host is required for community APIs. Keep the website and API on the same origin. Supply a TLS reverse proxy, durable storage and backups.

Configuration:

```sh
HOST=0.0.0.0 PORT=4173 \
PUBLIC_ORIGIN=https://your-game-domain.example \
DB_PATH=/persistent/shadow-shift/community.sqlite \
node server/index.mjs
```

`PUBLIC_ORIGIN` is an example that must be replaced, not a working address. Non-local public origins must be HTTPS. The proxy must preserve the configured Host and browser Origin. Do not expose the database or the repository folder through a generic file server. The included server serves only `dist/` and explicit API routes. API responses are `no-store` and the service worker never caches them.

The Dockerfile is provided but was not built in this environment. Build and test it on your host, mount a persistent writable volume at `/app/data`, and set `PUBLIC_ORIGIN`. The container runs as the unprivileged `node` user. Back up the SQLite database consistently (including its WAL state); stop writes or use SQLite's backup facilities rather than copying an actively written single file carelessly. Plan a restore drill before accepting user creations.

## Publication and discovery

Users must complete the map from its beginning in the current engine. The browser records bounded input events. A separate server worker re-simulates those events using the same canonical map and physics. It rejects incomplete runs, mismatched versions, invalid inputs and oversize payloads. This establishes one recorded route through a map; it does not prove the map is pleasant, its text is appropriate, or that a human—not an automated controller—completed it.

Each account has one vote row per map. Repeating a like does not multiply votes. A dislike replaces a like; clicking the selected vote removes it. Authors cannot vote on their own maps. Default discovery uses a Wilson lower-bound quality score (80% confidence), with likes and recency tie-breakers. There are explicit most-liked and newest tabs. Increasing likes with the same dislike count increases ranking, without claiming a guaranteed number of impressions.

Reports are recorded once per reporting account and map. They do not automatically hide a map, avoiding trivial report-abuse takedowns. An operator reviews them:

```sh
node server/moderate.mjs reports
node server/moderate.mjs hide <map-id>
node server/moderate.mjs restore <map-id>
```

Set the same DB_PATH when running the operator CLI on a custom database. These are server-local maintenance commands, not unauthenticated web endpoints.

## Security model and release gates

Passwords are salted with scrypt. Random session tokens are stored as SHA-256 digests, expire after 30 days, and are sent in HttpOnly/SameSite=Strict cookies, with Secure on configured HTTPS origins. Mutation requests require the matching Origin and JSON content type. SQL values use prepared statements. Map fields are allowlisted, titles/descriptions are escaped in the UI, body sizes and map complexity are bounded, verification workers have memory/time/concurrency limits, and request counters throttle account creation, auth and votes.

This is **one account, one vote**, not proof of one person. Multiple accounts and botting remain possible. There is no email verification, password reset, identity provider, CAPTCHA, ban-management UI, automated content moderation, audit trail or complete account-deletion/export workflow yet. These are explicit public-release gates. Basic request limits are process-local and use the direct socket IP; behind a proxy they may conservatively rate-limit multiple users together. Add a trusted edge limiter deliberately rather than blindly trusting spoofable forwarding headers. For multi-instance scaling use shared rate limiting, queueing and a suitable shared datastore.

The test environment verified real HTTP API persistence and cross-account behavior, but browser HTTPS cookies, proxy deployment and long-running operations need host-side validation. Run a security review and publish a privacy policy reflecting the actual hosted data practices before inviting the public.

Primary technical references:
- Node 22 SQLite: https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html
- Cookie attributes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
