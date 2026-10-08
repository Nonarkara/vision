# Vision away operations

Window: 2026-10-05 through 2026-10-12 23:59 Asia/Bangkok, ending earlier if the user returns. Shared instruction: `/Users/axiom/.codex/away-operations/NOTICE.md`.

## 2026-10-05 18:28 Asia/Bangkok

- Local and public `/api/health` return `ok: true`, production version 1.2.1. App uptime approximately 43 minutes; launchd app PID 76175 and tunnel PID 13443 both running with KeepAlive.
- Catalogue: 4,023 cameras; loaded 11:25:21 UTC, upstream 11:20:28 UTC, checked 11:28 UTC. Refresh runs every ten minutes and retains the last good disk cache on failure.
- Logs show transient upstream timeout/fetch failures at 11:06 and 11:15 UTC, followed by successful refresh at 11:25. No restart or repair justified while fresh and healthy.
- Relay idle, no queued fetches or resting hosts. Do not generate traffic merely to populate relay health; preserve owner quotas and cooldowns.
- Latest workspace and live version are 1.2.1, newer than this chat's NT TAG ID release 1.2.0. Preserve concurrent changes. NT TAG ID research work is complete; no outstanding training workload exists. Browser models run only during user interaction.
- CNX owns two-hour machine-wide monitoring. Vision's scoped thread heartbeat runs every six hours for application health and concrete faults within previously authorized frontend/research work. Stop/pause at the window end or user return. Notify only meaningful failure, completed deliverable or required decision.
- Existing runtime is on internal disk at `~/Library/Application Support/Vision`; app and tunnel plists are in `~/Library/LaunchAgents`. Use `docs/system/operations.md` for recovery. Deployment requires `npm run check`; don't redeploy healthy services merely for notes.
- Requested legacy memory/ECC directories are absent on this Mac; this file is the durable project handoff.

## 2026-10-06 00:31 Asia/Bangkok

- Local and public health both `ok: true`, version 1.2.1, uptime 24,365 seconds. App PID 76175 and tunnel PID 13443 remain running with KeepAlive.
- Catalogue 4,018 cameras, loaded 2026-10-05 17:25:24 UTC; upstream timestamp also 17:25:24 UTC, approximately six minutes old. Last five refreshes succeeded at ten-minute intervals.
- Earlier upstream fetch failures (last at 13:45 UTC) have recovered. Relay has no queued/inflight work or resting hosts; four historical checks, two successful and two failed, do not indicate a current service fault. Memory 13–16 MB.
- No repair, restart, deployment or extra camera requests justified. Existing scoped heartbeat continues; no pending authorized feature work.

## 2026-10-06 06:33 Asia/Bangkok

- Local and public health both `ok: true`, version 1.2.1, uptime 46,054 seconds. App PID 76175 and tunnel PID 13443 remain running with KeepAlive.
- Catalogue 4,016 cameras; loaded 2026-10-05 23:25:25 UTC and upstream 23:25:24 UTC, about seven minutes old. Last five refreshes succeeded on the ten-minute cadence.
- Last logged upstream failure at 20:35 UTC has recovered. Relay idle, no resting hosts; memory 18–20 MB. No current fault or pending authorized implementation work.
- No restart, repair, deployment or additional camera requests needed. Six-hour scoped heartbeat remains active within the away window.

## 2026-10-06 12:33 Asia/Bangkok

- Local/public health both `ok: true`, version 1.2.1, uptime 67,650 seconds. App PID 76175 and tunnel PID 13443 running with KeepAlive.
- Catalogue 4,031 cameras; loaded 05:25:22 UTC, upstream 05:22:36 UTC (about seven and ten minutes old). Last five ten-minute refreshes succeeded.
- Transient timeout at 00:36 UTC and fetch failure at 02:35 UTC recovered. Relay idle with no resting hosts; memory 19 MB.
- No sustained fault, restart, deployment or additional camera requests justified. No pending authorized implementation work; existing heartbeat continues.

## 2026-10-06 · Training usability release 1.3.0

- User tested with a colleague and requested clearer training choices, a demonstration that shows learning, and language children can understand. Published activity buttons for drawn-road demo, hand gestures, cup/no cup and road scenes; existing presets/custom groups remain available.
- Training control now sits with the demonstration and guesses. Demo test buttons generate new drawings with seeds outside the training set and show them through the existing local photo source; drawings are clearly labelled, not real-world evaluation. Learning curve and technical explanations are optional disclosures. Simplified visible Thai/English instructions and group labels.
- Verified local end-to-end: 16 examples, 200-pass training, new empty-road and busy-road drawings produced corresponding guesses. No browser console errors. Five viewport widths (360, 768, 844, 1280, 1920) in both languages showed no page overflow. Deeper explanation and sample map remain accessible.
- Release gates: all 66 tests pass; site assets/imports/model shards and documentation checks pass. Deployed 1.3.0; public activity buttons verified and production HTML matches workspace. No private camera opened or captured during checks.

## 2026-10-06 · Shipability audit and hardening 1.3.1

- Finished the audit the previous session left open (server, client JS, pages, pipeline). Client review found no defects worth changing: sources stop their tracks and destroy their HLS players on close, webcam requests are ticketed so a late permission grant cannot override a newer one, tensor disposal in `ml/` is tidy/dispose-balanced, and every canvas loop skips work while its canvas is off screen or the tab is hidden. Pages are plain navigations, so no cross-page listener accumulation exists.
- Server fixes: pages are gzipped only when the client sent `Accept-Encoding: gzip` (a 45 KB page no longer costs a compress for an identity client); `json()` now always sends `Vary: Accept-Encoding`, so a shared cache cannot hand a gzip body to a client that never asked for one; shutdown calls `closeIdleConnections()` so a deploy no longer waits out a 65 s keep-alive before exiting; `Strict-Transport-Security: max-age=31536000` added (https-only, no subdomains, no preload); `.xml` registered so a sitemap is served as XML.
- Crawler entry points: `robots.txt` gained a `Sitemap:` line (the original `Disallow: /api/` policy kept); `public/sitemap.xml` added, naming exactly the ten routed pages. Open Graph title/description/url, twitter:card and a canonical link are now built from each page's own `<title>` and description by `socialMeta()` in `server/http.js`, so they cannot drift; the 404 page gets `noindex` instead.
- Check gates tightened: language parity is now exact (SVG diagrams excluded, since a diagram may run three English labels against two Thai ones) — one forgotten translation used to pass a two-span tolerance, verified by injecting a Thai-only paragraph and watching `check-site` fail; `data-aria-th`/`data-aria-en` must pair; every room must be linked from the home page; `robots.txt` and `sitemap.xml` must be served with the right type and the sitemap must list exactly the router's pages; every page must carry og and canonical tags.
- Verification: `npm run check` green — 69 tests (three new in `tests/http.test.js`: conditional gzip, social tags and noindex, sitemap/router agreement), 10 pages, 44 local references, documentation links resolve. Headless Chrome rendered all ten routes plus a missing path with no console errors, failed resource loads or CSP refusals. Local curl confirmed gzip vs identity bodies, og/canonical on `/learn`, `noindex` on the 404, `text/plain` robots and `application/xml` sitemap.

## 2026-10-06 18:34 Asia/Bangkok

- Local/public health both `ok: true`, version 1.3.1; app PID 41962 running since the concurrent hardening release at 10:55 UTC. Tunnel PID 13443 remains running. Both launchd services retain KeepAlive. Preserve that release and its audit notes.
- Catalogue 3,987 cameras, loaded/upstream 11:25:54 UTC, approximately eight minutes old. Every refresh since deployment succeeded on the ten-minute cadence.
- No new warning since 02:35 UTC. Relay idle, no resting hosts, memory 16–19 MB. No sustained fault requiring recovery or outstanding work from this chat.
- No restart, deployment, extra camera traffic or machine-wide checks performed. Existing scoped heartbeat continues within the away window; the user's recent testing request did not state that they returned to the Mac.

## 2026-10-06 · Complete training release 1.3.2

- User requested taking the remaining uncommitted training work through shipability after ec6e9b3. Preserved the other agent's server/crawler/gate changes.
- Corrected Thai save/judge labels; interrupted demo loading now exits without announcing completion when its preset or class keys change. Removed an unused training progress variable.
- Deployment gates passed: 69 tests, ten pages, asset/module/model checks and documentation checks. Runtime hashes match package, all four training files, and both audited server files. Public health is 1.3.2 and the served training page contains the corrected Thai label and activity buttons.
- Commit and push include the training work, release version and this operational handoff, so live deployment can be reproduced from Git.

## 2026-10-06 · /train clarity pass 1.3.3

- Page still read as confusing after 1.3.2; user scoped a copy-and-labels-only pass covering four diagnosed causes: no visual order of operations, two score bars with no stated roles, the mechanism hidden inside a collapsed disclosure, and chapter 02 therefore reading 01 → 03 → 04.
- Changes: a four-step "How it works" block (choose groups → add pictures → the frozen network makes a 1,280-number fingerprint → press Train) sits between the activity chooser and the room, reusing the existing `.steps` grid; the bars are relabelled "Guesses right away — from similar examples" and "Guesses after you press Train" with one micro line saying which works when; the mechanism disclosure now opens by default with the summary "How the machine learns"; the post-training toast said "above" while the bars sit below the button — corrected to "below" in both languages. No layout moves.
- Verified: 69 tests, check-site (exact language parity, aria, og, sitemap) and check-docs green; headless render of all ten routes plus a missing path with no console, resource or CSP errors; screenshots at 1280 wide for the new blocks in place, and the map still paints at load because `applyPreset` fires the change that schedules its rebuild.

## 2026-10-07 00:34 Asia/Bangkok

- Local/public health both `ok: true`, version 1.3.3. App PID 56337 and tunnel PID 13443 running with KeepAlive; app restart corresponds to the documented clarity release at 17:04 UTC. Preserve concurrent changes.
- Catalogue 4,008 cameras; loaded 17:24:56 UTC, upstream 17:22:32 UTC, about ten and twelve minutes old. All three refreshes since deployment succeeded.
- No new app warnings since 02:35 UTC. Relay idle, no waiting/inflight requests or resting hosts; memory 20–22 MB. No sustained fault or unfinished implementation owned by this chat.
- No restart, repair, deployment or extra camera traffic needed; scoped heartbeat continues within the away window.

## 2026-10-07 handbook release 1.4.0 (Asia/Bangkok)

- Shipped the handbook: `docs/*.md` now renders to `/handbook` (index, chapters 01–08, glossary, reading list) via `scripts/build-handbook.mjs`, checked by `npm run check` (`build-handbook --check`) and gated for two-hop reachability from `/`.
- Added a hand-drawn `docs/img/06-pipeline.svg` (replacing the only mermaid block) and a bilingual *Try it yourself* exercise in all eight chapters; site links added at `/learn`, footer, and sitemap.
- `npm run check` green: 69/69 tests, 21 pages, 73 local references, docs links resolve. One intermittent test failure observed once (did not recur in five runs); no action taken.

## 2026-10-07 06:35 Asia/Bangkok

- Local/public health both `ok: true`, version 1.4.0, uptime 19,209 seconds. App PID 53388 and tunnel PID 13443 running with KeepAlive. Preserve the concurrent handbook release.
- Catalogue 4,008 cameras; loaded/upstream 2026-10-06 23:34:53 UTC, fresh within seconds of checking. Last five ten-minute refreshes succeeded.
- Earlier upstream timeouts at 17:55 and 20:05 UTC recovered without intervention. Relay idle, no resting hosts, memory 23–25 MB.
- No sustained fault or pending work owned by this chat. No restart, deployment, extra camera traffic or machine-wide checks needed; existing scoped heartbeat continues.

## 2026-10-07 09:11 Asia/Bangkok

- Shipped 1.5.0: new room `/gesture` (room 04) — teach 2–4 gestures with the /train embedding + k-NN stack, bind each to one of eight in-browser actions (beep, vibrate, fullscreen, flash, two pretend SVG lamps, a page-written WAV tone, a handbook link). Firing uses leader-stability + global cooldown (7 new tests in `tests/gesture.test.js`); every refusal is reported bilingually; arming takes one click because the browser's user-gesture rule demands it. Nav/home index//learn where-next/README renumbered to nine rooms (Gestures = 04).
- New handbook reference `/handbook/actions` from `docs/reference/browser-actions.md`: why a page can never open an app or sleep a Mac, the user-gesture rule, what each of the eight actions uses and when it refuses, and what a native helper or server would actually need.
- `npm run check` green: 76/76 tests, 23 pages, 77 local references, docs links resolve. Headless screenshots verified the room (light+dark), arm/log/board, the limits chapter, and the handbook action table; `/gesture` span parity 58/58.

## 2026-10-07 12:36 Asia/Bangkok

- Local/public health both `ok: true`, version 1.5.0, uptime 12,184 seconds. App PID 4549 and tunnel PID 13443 running with KeepAlive. Preserve the other agent's documented gesture-room release.
- Catalogue 4,014 cameras; loaded 05:33:24 UTC, upstream 05:31:06 UTC, about three and five minutes old. Last five ten-minute refreshes succeeded.
- No new application warnings since 2026-10-06 20:05 UTC. Relay idle, no resting hosts; memory 19–21 MB. No sustained fault or pending implementation owned by this chat.
- No restart, deployment, extra camera traffic or machine-wide checks needed. Existing scoped heartbeat continues within the away window.

## 2026-10-07 18:38 Asia/Bangkok

- Local/public health both `ok: true`, version 1.5.0, uptime approximately 33,850 seconds. App PID 4549 and tunnel PID 13443 remain running with KeepAlive.
- Catalogue 3,980 cameras; loaded 11:33:24 UTC, upstream 11:31:07 UTC, about four and six minutes old. Last five ten-minute refreshes succeeded; no new app warning since 2026-10-06 20:05 UTC.
- Relay has ten historical checks (four successful, six failed), but no current inflight/waiting work or resting hosts. Historical camera failures alone do not establish a service fault. Memory 26–29 MB.
- No restart, deployment, extra camera probes or machine-wide checks justified. Shared notice's temporary CNX preview belongs to CNX; no changes made to it. Existing Vision heartbeat continues within the away window.

## 2026-10-08 00:40 Asia/Bangkok

- Local/public health both `ok: true`, version 1.5.0, uptime 55,566 seconds. App PID 4549 and tunnel PID 13443 running with KeepAlive. Catalogue loaded 17:33:25 UTC, upstream 17:31:07 UTC (six/eight minutes old); last five refreshes succeeded.
- Catalogue count declined from 3,980 to 3,427, entirely in view-only entries (774 → 221); video/still/off counts unchanged at 53/2,676/477. Inspected the cached upstream source metadata: all seven sources report live with no error (GISTDA 371, iTIC 164, NST 215, Pakkret 52, Rangsit 1, DWR 130, Maholan 2,697 before deduplication). FloodDash health also returns ok. This check establishes fresh upstream metadata, not the cause of the view-only reduction; no Vision refresh fault is evident. Watch for sustained source errors rather than restoring obsolete entries or probing owner cameras.
- No new app warnings; relay idle without resting hosts; memory 21–24 MB. No repair, restart, deployment or camera requests justified. Existing scoped heartbeat continues.

## 2026-10-08 Drive room and intuition pass, release 1.6.0 (Asia/Bangkok)

- User returned and asked for a human-first pass. Committed the pending diagram work (home/learn/train/gesture flow figures) and re-credited Dr Supakorn as early inspiration only, Dr Non as sole maker (story, home, footer, README).
- New room `/drive` (room 05; Games→06 … Fine print→10, eyebrows now match the nav): top-view track with roundabout, traffic light, three zebras, people and stray dogs; six cars (careful/normal/hasty) narrate what their simulated camera sees and why they brake. IDM speed choice + predict-then-check conflicts (Frenetix idea, credited); day/rain/night; cover-a-camera. 8 tests in `tests/drive.test.js` hold the page's claims (daylight: nobody hit; night: hasty harm > careful harm; covered camera runs reds).
- `/learn`: new "dog, cat or car?" figure (edges → parts → vote). `/train`: shorter lede, link card to gestures, redundant step list removed, "Look inside" folded by default.
- Paused, awaiting the user: a local helper program so a gesture can open System Settings / take a screenshot (needs a CSP connect-src exception for 127.0.0.1). Draft kept outside the repo.

## 2026-10-08 · Usability and illustrated history release 1.7.1

- User requested a final usability/intuitiveness pass after Claude's 1.6.0 changes, with richer explanations and history artifacts. Preserved the gesture, driving, handbook and training features.
- Research now starts with an interactive four-landmark explorer (Roberts 1963, HOG 2005, YOLO 2016, SAM 2023), original downloadable SVG teaching illustrations, plain Thai/English descriptions, limitations, links to relevant classroom activities and original research. Clearly labelled as conceptual illustrations, not running-model outputs; all explanations remain readable without JavaScript. NT TAG ID case study and full timeline retained.
- Home room descriptions now explain the practical starting point. Training readouts identify groups missing pictures, indicate when examples are ready and prompt retraining after edits; renaming groups also refreshes the guidance.
- Verified all four history panels across five screen sizes in both languages (40 checks), keyboard activation, image loading and no console errors. Home/train/gesture/drive at three sizes passed 12 additional width checks. Training completed on drawn examples, classified a new empty-road drawing, prompted retraining after a new example and updated missing-group names after rename. No private camera used.
- Release gates: 84 tests passed, 24 pages, 84 local references, JS/module/model/documentation checks green. Public version 1.7.1 healthy; all ten modified release files match the production runtime. Final version bump ensured browsers received the final CSS refinement. Commit/push records this release.

## 2026-10-08 · Three learning methods release 1.8.1

- Added user-requested bilingual teaching section `/research#learning-kinds`, linked from Research introduction and Training. Explains supervised labels, unsupervised patterns (including the common term non-supervised), reinforcement rewards, and distinguishes self-supervision.
- Interactive examples: reveal labelled shape cards; regroup the same shapes by colour or shape (explicitly a sorting illustration, not trained clustering); real tiny one-step bandit learner tracks sample-average reward, explores both unknown choices and then chooses the highest learned value. Reset forgets observations. Clearly distinguishes this from multi-step RL and the rule-based driving track.
- Unit tests cover exploration and reward-driven preference changes: all 86 tests pass; 24 pages, 84 references and documentation gates green. Browser checked labels, both groupings, choice sequence, learned values, reset, translation and five screen sizes in both languages. Fixed semantic circles being squared by global no-rounded-corners styling using clipping; reward readout inherits the section's contrasting text colour. No live-page console errors.
- Published 1.8.1, public health verified, all six release files match runtime. No private camera or new external workload used. Changes committed/pushed for reproducibility.

## 2026-10-08 11:28 Asia/Bangkok

- Local/public health both `ok: true`, version 1.8.1. App PID 62127 and tunnel PID 13443 running with KeepAlive. Recent app restart is the documented learning-section release, not an unexplained outage.
- Catalogue 3,428 cameras; loaded 04:26:33 UTC and upstream 04:22:28 UTC, roughly two/six minutes old. Startup refresh succeeded. Last upstream fetch warning at 2026-10-07 20:33 UTC recovered.
- Relay idle without waiting/inflight requests or resting hosts; memory 35–36 MB after release. No sustained fault requiring repair. The separately paused local gesture helper remains outside this chat's authorized scope; no CSP or helper changes made.
- No restart, deployment, extra camera probes or machine-wide work needed. Existing scoped heartbeat continues within the away window.

## 2026-10-08 · Drive scenarios and Face & focus, release 1.9.1

- User requested increasing Drive complexity and an opt-in long-running front-camera experiment. Drive starts with a two-lane road; four lanes have separate opposing paths; the existing roundabout/junction and a Bangkok-inspired city with crossing routes offer 6/12/24 cars, weather and roadside activity. Fixed lanes and rule-based decisions remain explicitly described. Pedestrian controls are disabled where no crossings exist. Added bounded traffic, repeatability, lane direction and non-overlapping spawn tests; fixed a city spawn overlap found in the live check.
- New /focus experimental tab uses self-hosted MediaPipe Tasks Vision 0.10.32 and Face Landmarker float16 v1. Explicit consent, front camera only, five-second stable personal calibration, two-frame-per-second worker inference, sustained look-away and face-absent episode counts, long eye closures, movement readouts, bounded minute timeline, self-reported mood notes and explicit JSON download. No identity matching, emotion inference, imagery persistence or uploads. Session wall-clock limits 15 minutes to eight hours; hidden tabs, pause, finish, navigation, frozen frames and failures release tracks/worker. Fullscreen includes consent and results. Repeated screen-reader status announcements suppressed.
- Real model loaded in a worker and processed 20 generated blank frames with no face detections. Separate generated-video/model fixtures verified calibration, away/absent/eyes episode counts and startup cancellation/pause/finish without opening a private camera. Synthetic eight-hour observations verify bounded summary state, not an eight-hour camera soak test. Browser download-event observation was unavailable; JSON export implemented using the existing local Blob/download pattern.
- Native viewport override had no effect, so used same-origin document fixtures to exercise actual CSS media queries at 375/390/768/1440/1920 pixels in Thai and English: 20 checks, no horizontal overflow. These are layout checks, not physical-device camera tests. Fixtures removed before release; only this turn's temporary servers/tabs stopped.
- Gates green: 94 tests, 25 pages, 87 local references, syntax/model/docs checks. Updated fullscreen DOM test to cover session controls; removed a timing-sensitive training assertion that incorrectly assumed two passes always fit in a frame. Changed simulation import is versioned; module checker supports query strings.
- Deployed 1.9.1 and verified local/public health, runtime file equality, WASM MIME and worker-only WASM compilation permission. Live city showed 24 cars with zero initial crashes and no page errors. A brief unrelated tunnel QUIC outage returned public 502s around 05:47 UTC while the app stayed healthy; logs showed all edge connection attempts timing out. TCP 7844 probe succeeded, then QUIC recovered automatically at 05:48:26 UTC. No tunnel restart, credentials or configuration changes were needed. Final public health ok, fresh catalogue 3,426, relay idle, app memory 26 MB.

## 2026-10-08 17:30 Asia/Bangkok

- Local/public health both `ok: true`, version 1.9.1, uptime 16,993 seconds. App PID 15541 and tunnel PID 13443 running with KeepAlive; no unexplained application restart.
- Catalogue 3,426 cameras, loaded/upstream 10:26:52 UTC, about three minutes old. Last eight ten-minute refreshes succeeded. No newer application warning since 2026-10-07 20:33 UTC.
- Tunnel had short QUIC reconnects around 10:07 UTC; affected connections registered again at 10:07:14/26 UTC. Public health now succeeds; no sustained failure justifying a restart or transport change.
- Relay idle with no waiting/inflight requests or resting hosts; memory 23 MB. Working tree was clean before this status entry. Prior requested deliverables are shipped; no concrete frontend/research fault found requiring continuation.
- No repair, deployment, camera probes or machine-wide jobs performed. Preserve the paused local gesture helper and other services. Scoped heartbeat continues within the away window.

## 2026-10-08 23:32 Asia/Bangkok

- Local/public health both `ok: true`, version 1.9.1, uptime 38,723 seconds. App PID 15541 and tunnel PID 13443 remain running with KeepAlive; no unexplained app restart.
- Catalogue 3,430 cameras; loaded/upstream 16:26:51 UTC, about five minutes old. Last twelve ten-minute refreshes succeeded; no new app warning since 2026-10-07 20:33 UTC. Relay idle, no resting hosts; memory 15–20 MB.
- Tunnel connection 1 repeatedly fails its control stream against edge 198.41.192.57; other connections continue serving public health. Connection 3 recovered at 15:29:14 UTC (sin13). This indicates reduced connection redundancy, not a demonstrated public outage. Preserve the working tunnel; watch for broader failures before restarting or changing transport.
- No repair, deployment, camera probes or machine-wide work justified. Other agents' edits preserved; scoped heartbeat continues within the away window.

## 2026-10-09 · Driver views and guided video learning, release 1.10.0

- Implemented the user's new usability request. Each Drive vehicle opens a responsive driver dialog with perspective projection from the actual world coordinates: moving traffic, restrained person/dog silhouettes, tracked-object boxes/confidence, remembered detections, braking lamps and the same gap/acceleration that drives the simulation. Rain has falling streaks and animated wipers; night and sun glare change visibility. Simulated detection and written driving rules remain clearly identified. Controls keep car switching, weather, pause and camera-cover experiments in the dialog; rendering capped near 30 fps and text near 4 fps.
- Training now opens on a local moving practice clip and three plainly explained choices, sharing one selected video: labelled-frame nearest neighbours, genuine two-cluster k-means on 24 collected embeddings, and a human-rewarded one-step contextual bandit for alert/quiet actions. Uses the existing frozen MobileNet; no large model retraining. Custom group names, bounded examples/reward history, visible next steps, source switching, local video files and held-frame feedback thumbnail. Original detailed training tools preserved behind an optional disclosure. Fullscreen includes lesson choices and action controls, plus source attribution. Global gutters/chapter spacing tightened moderately.
- Bounded collection cancels on source/method changes or hidden/off-screen work; late local-video opens cannot overwrite a newer source and release media/object URLs. New practice clip draws only when read, with no independent animation loop. Closed advanced training skips its prediction loop. Changed module import chains versioned because the public edge caches JS beyond the origin cache policy.
- Verification: all 100 tests pass, 25 pages/87 references and documentation gates green. Browser completed supervised examples/learning, 24-frame clustering (10/14 groups in this run), rewarded action/exploration, held-frame display, method switching and lesson fullscreen. One public-camera change succeeded and named the owner/source; no private camera opened. Native phone Training check plus actual same-origin iframe CSS viewports at 375/390/768/1440/1920 in TH/EN: 20 layout checks without horizontal overflow, driver dialog contained at every width. Local video lifecycle covered with browser-primitive unit test; real uploaded-clip decoding not tested on physical devices.
- Deployed 1.10.0; public health ok with fresh 3,430-camera catalogue and idle relay. Live Drive vehicle click opened its rainy windshield with correct braking readout, and live Training displayed all three choices and working fullscreen with source credit; no console errors on either. Proof images /tmp/vision-drive-110.png and /tmp/vision-train-110.png. Temporary layout fixtures removed before deployment; only this turn's preview servers/tabs cleaned up. Existing services and prior work preserved.
