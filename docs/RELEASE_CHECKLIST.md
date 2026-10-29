# Release checklist

## Each change

- [ ] `npm run check` passes.
- [ ] `npm run build` produces a working modular and portable build.
- [ ] No save contains a partial run or checkpoint.
- [ ] All new collision shapes match their visible art.
- [ ] New content has deterministic solver coverage and a human timing review.
- [ ] Content version increments when seed compatibility changes.
- [ ] New save schemas have explicit migrations and fixtures.
- [ ] Update waiting does not interrupt a run.

## Physical Android verification (not completed in this environment)

- [ ] Multi-touch: drag sunlight while holding/releasing jump.
- [ ] Landscape and portrait transitions, display cutouts, gesture bars.
- [ ] Pause/resume after switching apps, phone lock, interruptions and audio focus.
- [ ] Low/mid/high device frame times over extended play; battery and thermal behavior.
- [ ] Browser storage persists, exports, imports and fails gracefully.
- [ ] Installed PWA starts offline after first successful caching.
- [ ] Upgrade keeps progress and changes caches only after old clients close.
- [ ] Test any Android wrapper independently; browser QA is not APK QA.

## Before public store release

- [ ] Choose a production engine/packaging route after the device comparison.
- [ ] Finish curated content and accessibility review.
- [ ] Original art/audio rights and owner-selected license confirmed.
- [ ] Privacy policy matches actual SDKs and collection (currently no analytics).
- [ ] No forced death/retry advertisements, checkpoints or paid shortcuts.
- [ ] Signed APK/AAB, store assets, age/content declarations and testing requirements verified at release time.
- [ ] Costs, retention and revenue described only from real evidence.
