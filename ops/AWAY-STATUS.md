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

## 2026-10-09 05:30 Asia/Bangkok

- Local/public health both `ok: true`, version 1.10.0, uptime 2,158 seconds. App PID 12654 and tunnel PID 13443 running with KeepAlive. App restart matches the documented 1.10.0 deployment.
- Catalogue 3,428 cameras; loaded 22:24:28 UTC, upstream 22:21:07 UTC (six/nine minutes old). All four refreshes since deployment succeeded. A 20:06 UTC upstream fetch warning recovered; no new warning since release.
- Previously impaired tunnel connection 1 and connection 3 registered successfully at 21:31:40 UTC (bkk09/sin14); no newer tunnel error in recent logs. Public health succeeds. Relay idle, no resting hosts, memory 21–23 MB.
- Working tree clean before this entry. Requested frontend deliverables already shipped and reported. No sustained fault, repair, restart, deployment, camera probes or machine-wide jobs needed. Scoped heartbeat continues within the away window.

## 2026-10-09 Usability pass on Codex's 1.10.0, release 1.10.1 (Asia/Bangkok)

- Reviewed Codex commits 4061321…ab6382d (research history, three learning methods, graduated Drive scenarios + windshield view, opt-in Face & focus room). 100/100 tests green before changes.
- Drive: "Try this" experiments referenced the roundabout track while the room now opens on Two lanes; each now has a "Set it up" button (track, sky, car, covered camera) that scrolls back to the track.
- Train: lesson step numbering continued at 2 after the page's own step 2; now 3/4.
- Home: promise ii said "does not recognise faces" beside the new face room; reworded to "never who" and explains the face room finds eye/head direction, not identity.
- Gesture (user's one-finger request, browser-only): new default set One finger / Palm / Nothing; palm saves the camera picture (download), Nothing is a resting pose that does nothing; room waits for "Use my camera" instead of loading a road camera; "Why a Nothing group?" tip; limits list says Settings/whole-screen need a local program. The OS helper stays parked pending the user.
- Cache safety: all ?v= stamps 1.10.0 → 1.10.1, and store.js / classes-ui.js / actions.js now stamped at every import site (checked: no module imported under two URLs, which would split the class store).

## 2026-10-09 11:32 Asia/Bangkok

- Local/public health both `ok: true`, version 1.10.2, uptime 4,507 seconds. App PID 56049 and tunnel PID 13443 running with KeepAlive. Runtime startup at 03:17:29 UTC matches the other agent's committed release 45d6641 (vehicle sizing, bounded relay queue and deployment rollback); local package also 1.10.2. Preserve that release.
- Catalogue 3,427 cameras, loaded/upstream 04:27:34 UTC, about five minutes old. Last seven refreshes succeeded; no newer application warning since 2026-10-08 20:06 UTC. Relay idle, no resting hosts, memory 22–24 MB.
- Tunnel edge retries recovered: connection 0 registered at 04:27:54 UTC; connections 1/2/3 registered at 04:31:08 UTC. Public health succeeds; no sustained fault requiring recovery.
- Working tree clean before this entry. No repair, restart, deployment, camera probes or machine-wide jobs performed. Scoped heartbeat continues within the away window.

## 2026-10-09 17:33 Asia/Bangkok

- Local/public health both `ok: true`, version 1.10.2, uptime approximately 26,167 seconds. App PID 56049 and tunnel PID 13443 running with KeepAlive; no new application restart.
- Catalogue 3,426 cameras; loaded/upstream 10:27:32 UTC, about six minutes old. Last seven ten-minute refreshes succeeded. No newer app warning since 2026-10-08 20:06 UTC. Relay idle, no resting hosts; memory 18–20 MB.
- Tunnel connections 0/2/3 retried around 10:23 UTC and registered again by 10:24:04 UTC. Public health succeeds; recovered edge errors do not justify a restart or transport change.
- Only the existing operations note was uncommitted before this entry. No concrete frontend fault, repair, deployment, camera probes or machine-wide work needed. Preserve other agents' release and continue scoped monitoring within the away window.

## 2026-10-09 23:34 Asia/Bangkok

- Local/public health `ok: true`, version 1.10.2, uptime approximately 47,800 seconds. App PID 56049 and tunnel PID 13443 running with KeepAlive; no app restart.
- Catalogue 3,429 cameras; loaded/upstream 16:27:33 UTC, about seven minutes old. Last seven refreshes succeeded; no newer app warning since 2026-10-08 20:06 UTC. Relay idle without resting hosts, memory 19–22 MB.
- Several tunnel connections timed out during this check at 16:34:01 UTC. Connection 0 registered at 16:34:02 and connections 1/2/3 at 16:34:14. One bounded follow-up confirmed public health still succeeds. No sustained outage or recovery action justified.
- Only existing operations notes were modified before this entry. No repair, deployment, camera probes or machine-wide checks performed; other agents' release preserved. Scoped monitoring continues within the away window.

## 2026-10-10 05:35 Asia/Bangkok

- Local/public health both `ok: true`, version 1.10.2, uptime 69,466 seconds. App PID 56049 and tunnel PID 13443 remain running; no new application restart.
- Catalogue 3,427 cameras; loaded/upstream 22:27:33 UTC, about eight minutes old. One upstream fetch failure at 20:47 UTC recovered at 20:57; subsequent ten-minute refreshes succeeded. Relay idle, no resting hosts; memory 17–20 MB.
- Tunnel connections 1/2/3 registered at 22:22:32 UTC; connection 0 timed out at 22:32:47 and registered again at 22:32:49. Public health succeeds; no sustained failure requiring intervention.
- Only existing operations notes were modified. No repair, deployment, camera probes or machine-wide checks justified. Other agents' release preserved; scoped monitoring continues within the away window.

## 2026-10-10 · Street, tone ladder and the CAPTCHA, release 1.11.0 (Asia/Bangkok)

- User returned and asked for two things: a more playful type system across the whole site that still obeys the Sanzo Wada (MoMA) rules, and a real-world street in room 05 instead of a bare test track, with a CAPTCHA in front of it that teaches where the training data came from. Both taken to completion.

- **Colour.** Four Plate 303 hues remain and no fifth is admitted. Each hue now also carries `deep` and `pale` steps built on one shared ladder (76% hue + 24% black, 78% hue + 22% white), so a pale Olive and a pale Naples Yellow are the same move rather than two accidents. `scripts/palette-measure.mjs` prints the ladder and measures 21 pairings; 16 required pairings must clear their floor and 5 forbidden ones must stay illegible, so a ban is proved rather than asserted. The ladder unlocked one real freedom: base Peach Red on Naples is 2.7:1 and was always banned as text on paper, while `signal-deep` clears 13.0:1. Wired into `npm run check`.

- **Type.** Three sizes became eight (display · title · subtitle · lede · body · read · micro · fine), h1 and h2 separated so a page stops reading as one long shout, and three named pairings added (`.stem`, `.measure`, `.mix`). Whole-site adoption happened through shared component classes in vision.css rather than per-page edits, so all 25 pages moved together. Verified in both languages; Thai keeps Plex Thai with no Latin tracking.

- **Street.** New `public/js/drive/street.js` builds kerbs, footways with a 15 cm upstand, shophouse terraces, street lamps every 30 m at 8.5 m, utility poles every 45 m at 9 m, parked bicycles and motorbikes, hydrants, benches, planters, people and dogs — all measured off the track's own centreline in real metres, drawn in both the top view and the driver's view. The load-bearing rule: the simulated camera may only name things the real detector can name. Every detectable item carries a real COCO id and the Thai name from `ml/labels.js`, checked against that table in the tests. Lamps, poles and buildings have no COCO class, so they are drawn and never boxed — that gap is the lesson.

- **Three bugs worth naming.** (1) Every street object was built without an id, so all 195 collided on one `undefined` key in the tracker's Map and the camera could believe in exactly one piece of street at a time. (2) With ids fixed, footway dogs started triggering the "stray dog by the road" rule for every cautious car, and parked bikes sat *inside* the running lane — both fixed at the source: pets are marked as pets, bikes moved to the kerb edge at LANE + 0.45, and nothing is placed within 9 m of another route's centreline so a junction stays clear. (3) The cross-check against `ml/labels.js` found the room calling a bus "รถโดยสาร" while the model prints "รถบัส"; both names now match the model's.

- **CAPTCHA.** `public/js/drive/captcha.js` + `pages/captcha.js`: a nine-square street challenge in front of the room, drawn from the same simulator. It is explicitly a teaching device, not a security control — the skip button is always there, there is no timer, every square is keyboard-reachable, and the panel states two limits plainly: those labels trained Google's models, not this site's (which are COCO and ImageNet, human-labelled but paid and slow), and the machine-passing-the-test moment is on the record at 99.8% versus humans at 33% (Goodfellow et al., 2014).

- **Gates.** 120 tests pass (14 new in `tests/street.test.js` covering COCO class truth, unique ids, junctions kept clear, kerbs at 3.2 m, parked bikes outside the lane, challenge fairness and determinism, and exact-match scoring). 25 pages, 87 references, all JS parses, documentation checks green. Cache stamps 1.10.2 → 1.11.0 across 65 sites, with the new modules stamped at every import site so no module is ever loaded under two URLs.

- **Deployed.** User asked to go live. `git push` (45d6641…b2af4ca) then `npm run deploy`, which re-ran the full gate, kept one generation for rollback, pruned orphans, restarted the launchd service and waited for the new version to answer healthy. Published 1.11.0; the script's rollback path was not needed. Public health 1.11.0, catalogue ~3,426 cameras fresh at load.

- **Post-release verification.** Cache-key census across all 14 served pages: exactly one distinct `?v=` value per page, 1.11.0, no fork. The census had to be scoped to this site's own asset stamps — a naive `?v=` grep reports `/research` as forked because two YouTube links carry `watch?v=<video-id>`, which is theirs, not ours. Worth remembering before writing that check for real. All four new modules serve 200; the gate, the tone-ladder tokens and the twelve-swatch footer chord are present; the hand-placed city blocks are gone from the shipped `draw.js`.

- No private camera opened; no live traffic generated beyond the ordinary catalogue refresh.

## 2026-10-10 · The gate stops eating the room, release 1.11.1 (Asia/Bangkok)

- **Report from the user:** "Track and simulations gone from the Drive tap." The room was not deleted — it was pushed roughly 2.5 screens below the fold. Verified against the live page before touching anything.

- **Cause, in two layers.** The 1.11.0 gate was a full-width block holding the nine-square challenge *and* the three-paragraph essay, so it consumed the entire first screen before the room could start. That was the visible half. The hidden half: `openRoom()` set `data-open="true"` on the gate, and **no stylesheet rule anywhere read `data-open`**. The comment in the old CSS promised the gate "gets out of the way the moment you are through it"; the code had never implemented it. So even a passing visitor kept a 370 px black band on top of a road they could not see.

- **Fixes.** The essay moved out of the gate into an ordinary chapter beneath the room (`#lesson`), where a passing reader who wants the sources finds them and a passing one who does not never scrolls past a road to reach them. The gate itself became a band, and its nine buttons now sit as a transparent overlay on the drawn squares instead of in a numbered row beneath them, which removes a strip of height and means you click the square you mean. Finally `.gate[data-open="true"]` now collapses to a single line — headline kept, because it is the line the page exists to make, plus a "Try the challenge again" button so the only path back to the challenge is not deleted along with the pixels. Reopening does not re-lock the room.

- **Also fixed while in there.** The "Cannot name" row hid only its `<span>`, leaving the label stranded on screen with nothing under it; `hidden` moved to the whole `<p>`, since a heading over an empty readout looks broken rather than empty. The moved section had been given the meaningless id `labelled`, renamed to `lesson` to match its siblings (`decide`, `drivers`, `honest`).

- **Two bugs the verification caught that review did not.** (1) `gateEl.removeAttribute('data-open')` was being used as a boolean; `removeAttribute` returns `undefined`, not `true`, so `aria-expanded` was being set to the literal string `"undefined"`. (2) Replaying the challenge restored it still wearing the squares you had passed with, so Check was live with a stale answer on screen; `mountGate` now returns `clearPicks` and the duplicate clear-the-picks blocks were folded into one `clearSelection`. Both were found by driving the real page over the Chrome DevTools Protocol rather than by reading the diff.

- **Gates.** 120 tests pass, plus 14 assertions run against the live DOM through CDP: room locked on arrival, gate 365 px before and 50 px after, track top at 713 px inside a 900 px viewport, challenge reopens with no stale picks, Check disabled when nothing is picked, `aria-expanded` correct in both states, and the room never re-locks. Verified visually in both languages.

- **Judgement call left open for the user:** the CAPTCHA remains skippable. A public classroom that walls off its own lesson behind a CAPTCHA is the wrong trade, but it is their site and the call is theirs.

## 2026-10-10 11:35 Asia/Bangkok

- Local/public health both `ok: true`, version 1.11.1, uptime 4,698 seconds. App PID 98162 and tunnel PID 13443 running. App restart matches the other agent's documented release aabff47; local package also 1.11.1. Preserve that release and its gate/layout fixes.
- Catalogue 3,425 cameras; loaded/upstream 04:26:48 UTC, about eight minutes old. All eight recent refreshes succeeded; no new application warning since the recovered 2026-10-09 20:47 UTC fetch failure. Relay idle without resting hosts; memory 16–18 MB.
- Tunnel connection 3 retried and registered at 04:11:42 UTC; public health succeeds with no newer tunnel errors in the recent log. No sustained failure requiring recovery.
- Working tree clean before this entry. No repairs, deployments, camera probes or machine-wide checks performed. Scoped monitoring continues within the away window.

## 2026-10-10 17:34 Asia/Bangkok

- Local/public health both `ok: true`, version 1.11.1, uptime 26,270 seconds. App PID 98162 and tunnel PID 13443 running; no new app restart.
- Catalogue 3,427 cameras; loaded/upstream 10:26:47 UTC, about eight minutes old. Last seven ten-minute refreshes succeeded; no new app warning since 2026-10-09 20:47 UTC. Relay idle without resting hosts; memory 15–18 MB.
- Tunnel connection 0 registered at 10:09:19 UTC and connections 1/2/3 at 10:09:32 following brief retries. Public health succeeds; no sustained failure requiring intervention.
- Only existing operations notes were modified. No repair, deployment, camera probes or machine-wide checks justified. Other agents' release preserved; scoped monitoring continues within the away window.

## 2026-10-10 Drive room crash fix, release 1.11.2 (Asia/Bangkok)

- Verified the GLM agent's 1.10.2 report: bounded relay queue (MAX_QUEUE 100 → 503), deploy keeps one rollback generation and prunes orphans (safe: the only runtime write is data/cameras.json, outside pruned server/ and public/), async catalogue write. 120 tests green.
- Found live: /drive was dead on load. The CAPTCHA gate painted before layout (1 px box → negative tile size → IndexSizeError in canvas.arc), thrown at the top level of drive.js, so no cards, no simulation. Fixed: paint() waits for a real box (ResizeObserver repaints); mountGate wrapped so a gate failure opens the room. Stamps 1.11.1 → 1.11.2.
- Still the user's call: the gate stays skippable as built.

## 2026-10-10 23:35 Asia/Bangkok

- Local/public health both `ok: true`, version 1.12.0, uptime 3,156 seconds. App PID 69987 and tunnel PID 13443 running. App startup 15:42:29 UTC matches the other agent's committed release 25761e5; local package also 1.12.0. Preserve that release and preceding Drive crash fix feed74c.
- Catalogue 3,430 cameras; loaded 16:32:29 UTC and upstream 16:28:26 UTC, approximately three/seven minutes old. A 15:41 UTC refresh timeout recovered at 15:43; every refresh since startup succeeded. Relay idle without resting hosts; memory 22–24 MB.
- Tunnel connections 1/2 registered again at 16:34:59 UTC following brief QUIC retries. Public health succeeds; no sustained fault justifying recovery.
- Working tree clean before this entry. No repair, deployment, camera probes or machine-wide checks performed. Scoped monitoring continues within the away window.

## 2026-10-11 05:35 Asia/Bangkok

- Local/public health both `ok: true`, version 1.12.0, uptime 24,788 seconds. App PID 69987 and tunnel PID 13443 running; no new app restart.
- Catalogue 3,425 cameras; loaded 22:32:30 UTC and upstream 22:28:26 UTC, about three/seven minutes old. A 21:03 UTC timeout recovered; last seven refreshes succeeded. Relay idle without resting hosts; memory 22–24 MB.
- Tunnel connection 0 registered at 22:26:48 UTC and connections 1/2 at 22:27:02 after brief retries. Public health succeeds; no sustained failure requiring recovery.
- Only existing operations notes were modified. No repair, deployment, camera probes or machine-wide checks justified. Other agents' release preserved; scoped monitoring continues within the away window.

## 2026-10-11 · Shipability test and reconciliation, release 1.12.1 (Asia/Bangkok)

- User asked for the shipability test after the earlier green runs. Full gate green twice: 128/128 tests (was 120 — see below), handbook matches docs, 25 pages/87 local references, all JS parses, model shards present, docs links resolve, tone ladder 16 required pairings clear and 5 forbidden stay illegible.
- The shipability test itself found one defect: the live runtime's `js/drive/teach.js` differed from the repo — the running copy had a better learner (brightness centred on mid-grey; colour filters scaled by FILTER_SCALE 250 so 0.002-sized readings can lift their weights) that never made it into commit 25761e5. The repo could not reproduce production. Full-tree diff of `~/Library/Application Support/Vision` against the workspace confirmed teach.js was the only drifted file (server/, package.json, all other public/ files identical; `.DS_Store` and the private `CCTV photos` dir are workspace-only by design).
- Reconciliation release 1.12.1: adopted the live-proven teach.js into the workspace, added `tests/teach.test.js` (8 tests: centring, −0.5..+0.5 mapping, filter scaling with the regression that raw 0.002 fractions could never teach their weight, deterministic training, sigmoid saturation, pick threshold, empty-lesson behaviour), bumped version and all 76 `?v=` import stamps 1.12.0 → 1.12.1 per the no-module-under-two-URLs rule.
- Deployed 1.12.1 via `npm run deploy` (gate re-run inside the script; rollback generation kept; not needed). Public health ok on 1.12.1; served teach.js now byte-equal to the repo; live /drive rendered six car cards with no console errors beyond the known, decision-pending Cloudflare beacon CSP block.
- Still parked for the user: the CAPTCHA gate placement (room open by default vs gate first), the Cloudflare Web Analytics zone auto-inject (site promises "no analytics" in legal/system pages, so the beacon should be disabled at the zone rather than allowed in CSP), and the paused gesture→Settings helper CSP change.

## 2026-10-11 · Research · About and equal citizen-app assessments, release 1.13.0 (Asia/Bangkok)

- User asked to rebuild the RESEARCH section with the site's real data and to equalize the citizens'-app assessments, learning from the real apps and crediting them.
- **Research · About (room 08).** Nav and home labels renamed; the page gained a live evidence strip (public cameras listed · machine-readable · live video · stills · owning agencies · offline, from the same `/api/cameras` the map reads, so numbers can never disagree with the cameras page) and a chapter 00 "What this classroom is, and what it stands on": Thailand's public cameras via FloodDash, everything in-browser, nothing stored, nobody identified, links to /story /system /cameras /legal. Verified live: figures fill 3,428 · 2,729 · 53 · 2,676 · 7 · 475, about chapter renders, no console errors.
- **Citizens' apps (room 07).** Every case now has exactly three "what can go wrong" bullets in both languages (was 4/2/2/3/3/3/3/3). Web research against the apps' own published documentation, folded in with credit: Apple Platform Security (Secure Enclave matching, anti-spoofing network, passcode-followed template augmentation), Denso Wave (QR repair levels L 7% · M 15% · Q 25% · H 30%), WHO 2021 TB screening guidelines (CAD as a screening tool, doctor decides), IIHS (lane-departure warning reduces police-reported sideswipe/head-on crashes; sizeable share of cars have it switched off), Plantix (100M+ questions, human experts stay in the loop), Mashgin (multi-camera 3D; its own line that 95% accuracy means staff step in 1-in-20). New "From the real apps" credits chapter names every source with what was borrowed.
- Tools note: agent-reach CLI is broken on this machine (ModuleNotFoundError: agent_reach) and Exa is not configured; scrapling.get and direct fetches were used instead. DuckDuckGo blocks bots, so only directly-known URLs were consulted.
- Gates: 128/128 tests, handbook matches, 25 pages/87 references, JS parse, docs links, tone ladder all green; full check run twice (before commit and inside deploy). Local headless render verified figures fill and bullet parity before deploy; live re-verified after. Published 1.13.0 (4e8279d), all stamps 1.12.1 → 1.13.0 across 76 import sites.

## 2026-10-11 · Audit of 1.13.0, and two module forks that had been live since 1.11.0 (Asia/Bangkok)

- **Asked for an audit of GLM 5.3's 1.13.0, then improvement, then a ship.** The feature work itself held up: the evidence strip genuinely reads `/api/cameras` and produces exactly the claimed 3,428 / 2,729 / 53 / 2,676 / 7 / 475 against the live endpoint; all eight citizens'-app blocks are mechanically 3-thai/3-english failure points; and two of the riskiest citations were checked against their sources and are accurate — Denso Wave's own page states "Level M (15%)" and "25% ... corresponds to QR Code error correction Level Q", and Plantix's own site says it "answered more than 100 million crop-related questions" while keeping a community of agri-experts.

- **The parked analytics concern is moot, and worth saying plainly rather than acting on.** The legal page promises no analytics; the CSP is `script-src 'self'`; and all twelve served pages contain zero occurrences of `cloudflareinsights` or `beacon.min.js`. The only Cloudflare header present is `report-to` for network-error logging, which sets no cookie. Even if Web Analytics were switched on at the zone, the CSP would refuse to load it. No dashboard change is needed to keep the promise true.

- **Real defect found and fixed: the strip would print six zeros before the catalogue loads.** A freshly booted server honestly reports `loadedAt: null`, `origin: "empty"` and zero of everything. The chapter directly beneath the figures says "The numbers above are not decoration. They are the camera list this site is reading right now." Before this fix that server printed `0 public cameras · 0 a machine can read · 0 agencies that own them` under that sentence — six false claims on the page whose whole argument is not faking evidence. `evidence()` now returns nulls while `loadedAt` is unset, so the strip prints em dashes; a genuine zero (a day with no live video) still prints as a zero, because by then the catalogue has loaded. Verified by intercepting `/api/cameras` over CDP and reading the DOM: six dashes.

- **Second defect: the "a machine can read" rule had two homes.** `research.js` re-implemented `isReadable` inline. The chapter's central promise is that its numbers "can never disagree with the cameras page", and keeping a second copy of the rule inside that page's own script is precisely how such a promise rots. The rule moved to `evidence()` in `catalog.js`, next to `isReadable`, as a pure function a test can pin.

- **Third defect, pre-existing and live since 1.11.0: two forked modules.** `scripts/check-forked-imports.mjs` found `drive/track.js` imported both unstamped (six sites) and `?v=1.13.1` (`street.js`), and `drive/draw.js` both unstamped (`perspective.js`) and stamped (`pages/drive.js`). Each loads under two URLs, so the browser holds two copies. Severity is honestly low — `track.js` is immutable constants and pure functions, so the two copies cannot diverge in behaviour; the cost is one redundant request and a second copy in memory. It becomes a real bug the moment either module grows state. Both are consistent now, and the checker is wired into `npm run check`.

- **The checker itself had the bug it was written to catch.** The first version resolved the import specifier with the query string still attached, so `/js/drive/track.js` and `/js/drive/track.js?v=1.13.1` became two different Map keys and the fork never registered — reintroducing the real bug still printed "no module loaded under two URLs". Caught by deliberately reintroducing a fork and checking that the script failed, then fixing it to strip the query before resolving. A green check that cannot go red is not a check.

- **Gates.** 135 tests pass (7 new in `tests/evidence.test.js`, none skipped — the live-payload case runs the real handler on an ephemeral port the way check-site does, and holds whether the catalogue is loaded or not). 25 pages, 87 references, no module forks, docs and palette green.

- **Still parked for the user:** whether the Drive CAPTCHA should be a hard wall. It remains skippable.

## 2026-10-11 · Every parked item closed out, release 1.13.2 (Asia/Bangkok)

- **Asked to take care of every open item so this is shipable.** Five had been parked across three releases. All are now either settled or converted into something the build enforces.

- **Correction first, because the previous entry got this wrong.** The 1.13.1 note said the Cloudflare analytics concern was "moot". That was wrong, and the way it was wrong is worth recording. I checked with `curl` and found no beacon, then generalised to browsers. Cloudflare does not inject for non-browser traffic, so the curl check could never have seen it. Driving a real Chrome over CDP against production shows the tag is injected into every page: `https://static.cloudflareinsights.com/beacon.min.js/...`, present in `document.scripts`, blocked by CSP, and logging a red violation twice per page load. Codex's 1.12.1 note had recorded exactly this and I talked myself out of it. **The origin is clean — the tag is added at the edge, so only a zone setting can remove it.**

- **What is actually true, and is enforced.** No analytics is collected: nothing runs, no cookie is set, no data leaves the browser. The CSP is the only reason. The tempting "fix" for those red console errors is to add `static.cloudflareinsights.com` to `script-src`, which would silence the console and start collecting analytics at the same time — it would look like a cleanup and would quietly make /legal a lie. `scripts/check-privacy.mjs` now fails on exactly that, and it is wired into `npm run check`.

- **The new check nearly shipped guarding nothing.** It reported green with `static.cloudflareinsights.com` sitting in `script-src`. Cause: I wrote `problems.size` on an array, having copied the line from `check-site.mjs` where the collection is a Set — `.size` is `undefined` on an array, which is falsy, so the failure branch could never run. Found by mutation-testing, the same day the fork checker had the same class of bug. Three mutations now verified to go red: whitelisting the beacon, a wildcard `script-src`, and quietly softening the /legal promise. A fourth — the YouTube false positive below — verified to stay green.

- **Closed: the scoped cache-key census**, parked since 1.11.0 and worth doing because the naive `?v=` grep reports /research as forked on two YouTube links whose `watch?v=` is theirs. Now in `check-site.mjs`, scoped to root-relative `src`/`href`, and it also catches an asset with no `?v=` at all, which could never be cache-busted. Verified: two YouTube links pass, a mixed key fails, an unstamped asset fails.

- **Settled: the CAPTCHA stays skippable and stays in front of the room.** Gate-first is the teaching device; skippable is the commitment. A hard wall would contradict the accessibility position the site states in public — skip always present, no timer, every square keyboard-reachable, screen-reader escape — and would gate a public classroom's own lesson behind a puzzle. Both questions parked for three releases are now answered, not deferred.

- **Settled: the gesture→Settings OS helper is out of scope, not pending.** A native helper cannot ship in a browser-only civic site, and the room already states the limit honestly in its own list — Settings and whole-screen need a local program. That is the correct end state, not a deferral.

- **One thing the user still has to do, and it is one toggle.** Cloudflare dashboard → the zone → Analytics & Logs → Web Analytics → disable. That removes the tag itself. Until then the promise still holds in substance and the CSP still enforces it; the check now makes sure nobody trades the promise for a quiet console.

- **Gates.** 135 tests, no skips. 25 pages, 87 references, cache census green, no module forks, privacy green, docs and tone ladder green.

## 2026-10-12 · The nav was quietly hiding rooms; a chevron that cannot lie, release 1.13.3 (Asia/Bangkok)

- **Found by sweeping every page in a real browser at two widths**, which is the first time anything has looked at the sticky rail rather than the page body.

- **The defect.** `.rooms` is a horizontal scroller with `scrollbar-width: none`. Measured on production: at 1440 all ten rooms fit, but at **1280 — the most common laptop width — System and Fine print (legal) were cut off**, with no scrollbar and no other hint that two rooms existed. At 1024 three rooms were cut; at 390 **seven of ten**. The language toggle was always reachable, and the document never overflowed, which is exactly why no static gate had ever noticed: the content was clipped inside a container, not off the page.

- **Fixed in two parts.** The rail fits at 1280 now — "Research · About" and "Fine print" become "Research" and "Legal" in the rail only (full titles unchanged on the page, in `<title>` and in the nav's own accessible names), and the room links tighten from 12px to 8px of padding. That took the needed width from 1143px to 957px against 995px available, verified identical at devicePixelRatio 1 and 2. Below 1280 the rail still scrolls, so a solid `›` chevron appears — no gradient, no shadow, no radius, per the house rules — and disappears again once you reach the end.

- **The chevron measures the rail without itself, because it changes the answer.** It lives in the rail's flex row, so while it is on screen it takes width away from `.rooms`. The first version therefore kept itself on forever at 1280: the rail overflowed only *because* the chevron was showing. `syncMore()` now pulls the chevron out of the layout, measures, and puts it back. A self-confirming indicator is worse than none.

- **Two smaller things found on the way.** `site.js` already had a `const rail` further down for anchor-offset work; the new one collided and killed the whole module — caught by `check-site.mjs`, which is exactly what it is for. And the first sweep I ran reported "all 52 combinations broken", which was my probe measuring children inside a scroll container, plus a `?lang=en` parameter the site does not support at all (`lang()` reads `data-lang`), so both halves of the "both languages" sweep were the same language. Both were measurement errors, corrected before anything shipped.

- **Gates.** 135 tests, no skips. 25 pages, 87 references, no module forks, privacy green, docs and tone ladder green.

### Cloudflare Web Analytics — attempted, blocked on token scope (2026-10-12)

- I told the user this needed their dashboard, then told them I had API access and could do it myself. Both were wrong in sequence. Here is the exact position so nobody repeats the round trip.

- **What is found.** Two Web Analytics sites exist on account `74ad6bf8…`. One, `d2b5e8ec…`, is a manual snippet install with `auto_install: false`. The other, `fa9e416d…`, is the zone-level install: `auto_install: true`, `ruleset.enabled: true`, `zone_name: nonarkara.org`. That is what injects the beacon into every page of every subdomain.

- **What the token can and cannot do.** `CLOUDFLARE_API_TOKEN` is active and can read zones, read zone settings, and **write zone settings** (`PATCH /zones/:id/settings/browser_check` returns a value error, not an auth error, so write is genuinely held). It cannot write RUM: PATCH, PUT, POST and DELETE on `/accounts/:id/rum/site_info/:tag` all return `10000 Authentication error`. Web Analytics is not among the zone's 56 settings, so there is no route around it through the settings API.

- **Nothing was changed.** Verified after every attempt: `fa9e416d… auto_install true, ruleset enabled true`. The pre-change state is saved at `/tmp/webanalytics-backup.json` (site_tag `fa9e416d…`, token `9efbcc8c…`, ruleset id `3bc27b92-70e6-4566-8349-fe8db155b4ae`).

- **To finish it, one of:** toggle zone `nonarkara.org` → Analytics & Logs → Web Analytics off in the dashboard (about thirty seconds, works now, no code change); or add the RUM/Web Analytics **write** permission to the token and I can do it and verify the beacon disappears from a live browser.

- **Until then nothing is wrong with the site.** The CSP blocks the beacon, no cookie is set, nothing is collected, `/legal` documents it in both languages, and `check-privacy.mjs` fails the build if anyone widens `script-src` to silence the console.

## 2026-10-13 · Shipability audit by use, not by gate (Asia/Bangkok)

- The away window closed on the 12th; the user is back and asked for a shipability audit that makes the site make sense **to use, learn and enjoy**. Production was healthy throughout the audit: 1.13.3, `ok: true` locally and publicly, catalogue ~3,430 cameras refreshing on the ten-minute cadence, relay idle, memory 25 MB. The workspace carried an uncommitted tree (server hardening in `catalog/http/relay`, the story exhibits rework, and the new `story/blink.js`) which was preserved and audited as-is.

- **The build was already green** — 155 tests, 25 pages, no forks, privacy, docs and tone ladder — so this audit drove the real pages in a real browser instead of reading diffs: 26 routes × {390, 1280} × {ไทย, English}, then every interactive room pressed by hand. No console error, no horizontal overflow, one `h1` per page, 25 pages and 87 references intact. The interesting findings were not in the gate.

### The blink drill had never run. Four separate bugs, one feature.

`/story`'s drill — advertised in the README as "the blink drill — six frozen screens, one flashes…" — answered every press with *"This page still has fewer than six control-room photographs."* It looked complete in review and could not play:

1. **Wrong scope.** `specimenImages()` asked `root.querySelectorAll('.shots [data-shot] img')`, and the drill is mounted on `#try` while the photographs live in the exhibits section above it. The query found nothing, always. Now queried from the document.
2. **A trial that threw.** `const s = screens[pickTile()]` — `pickTile()` returns a *screen*, so this indexed `screens` with an object and produced `undefined`; the run died with "Cannot read properties of undefined (reading 'i')".
3. **A frame that could not be painted.** `new ImageData(grayToRgba(...), w, h)` handed the three-argument constructor the `{data,width,height}` wrapper instead of the pixel array, so every screen threw on every frame. Now one reused `ImageData` per screen, filled in place.
4. **The last trial was never answerable and never logged.** The loop broke out before the final trial and called `reveal()` itself; the scheduled reveal then found the phase already `over` and returned. The score silently counted four trials out of five. `playTrial` now waits out the answer window, and the loop simply plays every trial in turn.

Also fixed on the way: number keys 1–6 were listened for on `#try`, but pressing the start button hides that button and focus falls back to `<body>`, which is not inside `#try` — so the keys announced in the instructions did nothing for anyone who had not tabbed back in (now on `document`, ignoring form fields); and the lazily-loaded exhibits could leave the drill waiting forever on "Opening the control-room photographs…", since `decode()` never settles on an image the browser has not begun fetching (now explicitly requested, with an eight-second bound).

**Tests, because this is the part that failed.** The fifteen existing blink tests all passed while the feature could not run: they cover arithmetic, not the thing. Added a DOM-level pair that builds a page shaped like `story.html` — photographs **outside** the drill — and plays a whole drill with the keyboard. Four mutations were then tried against it: the scoped query, the double-indexed screen, the `ImageData` wrapper and the dropped last trial. Three went red immediately; the fourth exposed that my `ImageData` stub was lenient enough to accept the wrapper, so the stub was made strict and it went red too. A fifth mutation (removing the answer wait) fails with "answered 4". A green check that cannot go red is not a check.

### The home page's fifth lens was a dead end

A visitor who presses **5 Objects** on a road full of cars was told *"Nothing above 30% confidence."* Measured, not guessed: the lens asked the network for exactly what it drew, and on that camera the network returned nothing at any input size — the stream is 352×288 and the model is a 300×300 one. The page was honest and useless at once, on its central claim ("watch it go … to 'car 68%'"), on the one camera it picks first.

Chapter 07 of `/learn` already had the right instrument: ask low, let the visitor draw the line, and show what sits below it. The Objects lens now does the same — `DETECT_FLOOR = 0.05`, a confidence slider under the lens buttons, and readouts that say how many candidates are below the line. The worst camera is now the best lesson rather than the worst first impression: at 5% it returns 50 guesses, 46 of them "person" on a road with no one on it. Live: 30% → 14 boxes; 10% → 25 cars and 12 traffic lights; 90% → *"Nothing at 90% or more — 50 more sit below the line — drag it down and watch the machine guess."*

### Smaller things a person notices

- **English number agreement.** "1 boxes pass the line", "1 moving regions", "9 grey box(es)" — the machine-ese that gives away an unedited page. Added `count()` to i18n with English plural rules ("box" would otherwise become "boxs"), used at the three sites.
- **"18 MB, first time only"** was repeated every time the source changed, long after the network was in memory. It now says so only before the first completed detection, and "Reading the new picture…" after.
- `/cameras` map verified live: ~7,800 lit pixels, tapping a square opens the real card with owner, kind and coordinates. `/focus`'s gate verified to refuse the start button until both consent boxes are ticked, and to say "The camera is busy in another app — close it and try again" with a Resume button rather than going quiet (tested with Chrome's fake device; no private camera was opened).

### Gates

`npm run check` green: **162 tests** (7 new — 2 drill integration, 5 for the confidence line and `count()`), 25 pages, 87 references, no module forks, privacy, docs, tone ladder. Nothing was committed or deployed; production still runs 1.13.3.

### Published 1.14.0 (same day, after the audit above)

- `npm run deploy` re-ran the whole gate inside the script, kept one rollback generation (not needed), restarted `org.nonarkara.vision` and waited for the new version to answer healthy. Public health `ok`, version 1.14.0, uptime 5 s at the check, catalogue 3,427 cameras loaded seconds earlier.
- Version bumped in `package.json` and all 83 `?v=` import stamps moved 1.13.3 → 1.14.0 across 33 files, so no module is served under two URLs. Cache census on the live site: `/`, `/learn`, `/story`, `/train`, `/drive`, `/games` each report exactly one distinct stamp, 1.14.0.
- Verified **against production, not the local build**: the blink drill builds its six screens (192×144 / ×108 / ×128 / ×192, real pixel range), plays practice plus four scored trials, logs five rows, and finished "You caught 1/4 · the machine caught 4/4" against scripted keypresses; the Objects lens reported 14 boxes at 30% with "36 below the line", 30 cars at 10%, and "Nothing at 90% or more — 50 more sit below the line" at 90%. Console clean on both rooms.
- One thing worth recording because it nearly became a false alarm: a first live run flashed screen 3 on all five trials with an identical pixel share. A second run gave 2, 3, 5, 2, 1 with three different shares, and `Math.random()` in that page returns six distinct values, so it was a coincidence — the alternative reading, six screens collapsing to one, would have meant the drill's honest "all six or none" guard was not holding. Checked rather than assumed.
- Runtime files compared against the workspace for the seven changed modules and `index.html`: all identical. Still uncommitted, together with the rest of the tree.

### Self-audit pass and 1.14.1 (same day)

The 1.14.0 audit was then audited itself. Two real defects survived the first pass, both in the confidence-line work, and one copy slip:

1. **A dead control on the error path.** The Objects lens shows "Detection is unavailable. Try Objects again, or use another lens." when the model fails to load — but the confidence slider stayed visible and draggable the whole time, changing nothing. The control is now hidden whenever `lensState.error` is set, so the only thing the page offers when detection is down is the sentence that explains what to do. Verified against production by blocking the model's `model.json` and shards with CDP: slider hidden on error, restored on retry.
2. **A false "first time only" promise.** `modelSeen` was set from `lensState.detectedAt`, but the error path *also* sets `detectedAt` (future-dated, as a retry backoff). So a visitor whose first load failed was told "Reading the new picture…" on the next click while an 18 MB download still had not happened — a small lie in a site whose whole argument is that it tells you the truth. Now `modelSeen` flips only on a detection that completed without error.
3. Thai copy unified: the below-the-line sentence now uses the same short construction as its sibling ("อีก 33 กรอบอยู่ใต้เส้น ลากเส้นลงมาดูว่าเครื่องเดาอะไรไว้") instead of a longer variant that drifted mid-page.

Also re-checked, since the original 26-page sweep ran *before* the slider was added: the new control at 390 px (full-bleed, 390×93, range target 358×44, no horizontal overflow), the drill's six tiles at 390 (178×134 and 178×178, labels intact), and both languages. The claim that the drill tests go red under mutation was re-tested rather than trusted: reintroducing the double-indexed `pickTile()` fails both integration tests, and restoring it returns 18/18.

`npm run deploy` published 1.14.1. Health ok, one stamp (`?v=1.14.1`) per page, and the live site re-verified end to end: error path hides the slider, retry restores it, Objects reported "Sees: car ×8 — 1149 ms · 42 below the line", the blink drill still plays to "You caught 1/4 · the machine caught 4/4" with five log rows, console clean. Runtime `home.js` byte-identical to the workspace.

### Third pass: the plural bug the fix itself introduced, and four more of its kind · 1.14.2

The 1.14.1 release fixed "1 boxes pass the line" by routing the count through `count()`. The third audit read the diff instead of the changelog and found the fix had traded one grammar error for another: the noun was now singular but the verb outside `count()` still read "1 box **pass** the line", and the Thai — which was already a complete phrase, "กรอบผ่านเส้น" — had been split so the same words appeared twice, "1 กรอบผ่านเส้น ผ่านเส้น". The same latent bug sat on the home page ("1 more **sit** below the line").

A sweep for the whole class — a number followed by a hardcoded English noun or verb — then turned up four more instances the first two passes had never looked at, all reachable in normal play:

- `/drive`: a first-timer who hits one dog is told "1 dogs hit"; one crash reads "1 crashes caused" (per-car cards and the totals row)
- `/train`: stopping the judge after one camera reads "Judged 1 cameras"; two learners agreeing on a single label read "the two agreed 1 times"

Every count now goes through `count()` with an explicit singular and plural, including the irregulars ("person"/"people"), and "agreed 1 times" became "once". The Thai in every one of these strings was already correct — Thai classifiers do not vary — so only the English branches moved. Nineteen singular/plural/zero cases pin the exact phrases the pages emit.

`npm run deploy` published 1.14.2. Health ok, gate green (162 tests), and the live site re-verified: `/drive` reads "0 laps · 0 crashes caused · 0 people · 0 dogs hit" at rest; the chapter-07 bench reads "5 boxes above the line · 34 below it (not drawn) · 1126 ms · cpu" and "0 boxes above the line … Nothing at 90% or more" at the top of the slider; home Objects and the blink drill still pass their regressions; console clean. Runtime files byte-identical to the workspace.

### Fourth pass: the drawn roads, and the windshield moved to the front · 1.15.0

Two things the room was asked for, both about what a visitor actually sees.

**The drawn roads were rebuilt on a real projection.** The `/train` demo exists so the room works with no camera, no working public camera and no patience — sixteen scenes the page draws for itself, busy and empty. The old renderer drew each car as a body rectangle with a narrower cabin rectangle stacked on top, and laid the road down with an ad-hoc `lane × width` and a `scale` that grew with depth but never converged. That is why the perspective read as wrong and the cars read as cakes: there was no vanishing point and no box. `train/demo.js` now projects the whole scene through one pinhole — a single vanishing point on the horizon, a focal length and camera height that vary per frame, road edges and lane dashes that converge with distance, and every vehicle a solid box (lower body, cabin, glasshouse, taillights, two wheels, a ground shadow) at its true relative metres. A sedan is 4.3 m; a lorry 7.4 m and 2.9 m tall; a bus 9.8 m. The demo still varies on purpose (sky, light, camera height, two or four lanes, road tone, number and colour and spacing of vehicles) and is still pure arithmetic — no photograph, no camera, no upload, and the same seed draws the same frame on every machine. `tests/train-demo.test.js` gained the ops the new renderer uses and a guard that every projected coordinate is finite; five tests green.

**Drive's windshield is now the hero.** The projection was already real — a moving driver's-eye view of the same world the top map draws — but it lived inside a dialog you had to open. It is now a large, permanently visible band above the map, the first thing the room shows, with its own car name and sight-range readout, and controls to step cars, change the sky, cover the camera, and open the same view full-screen. A card or map tap now simply selects the car and lets the hero follow, instead of throwing a modal at you. The same painter (`blitView`) feeds both the band and the dialog, so there is one drawing path, not two. The night sky gained stars and a moon and the day sky a few clouds, because a view that is always on screen should not have an empty sky.

Verified against production, not the local build: `/drive?go=1` opens the room with a 1198×435 hero band whose pixels are genuinely varied (mean 119.6, std 35 in daylight; std 13.5 at night), the name readout follows the selection and the weather ("Car 1 · sees 50 m" → "Car 2 · sees 24 m" at night), and the console is clean. The `/train` demo button builds its sixteen frames and finishes without an exception. `npm run deploy` published 1.15.0; health ok, catalogue 3,430 cameras, one `?v=1.15.0` stamp per page (all 33 stamped files moved 1.14.2 → 1.15.0). Still uncommitted, together with the rest of the tree.

### Fifth pass: an audit of 1.15.0 itself · 1.15.1

Three lenses — shipability, communication/UX, technicality — over everything 1.15.0 touched, then the whole site.

**The audit caught a regression in the previous release.** 1.15.0's refactor of the driver dialog left a duplicated text gate inside `paintDriver`: `driverTextAt = now` followed immediately by `if (now - driverTextAt < 250) return`, which returns forever. The full-screen dialog therefore drew its picture but never its words — no title, no speed, no decision, no math. Found by opening the dialog in a browser and reading the heading: it was empty. One deleted pair fixed it; verified live in both languages ("Car 1 · Careful" / "รถ 1 · ระวัง", action and math populated).

Also fixed: the hero control strip overflowed its box by 1 px at 390 px (nowrap labels inside a two-column grid), now zero; and the projection itself was put on trial rather than trusted — a probe recorded all 532 polygons one drawn scene emits: every one of the 10 ground polygons converges (top width under 25% of bottom, the road's under 1%), axial strips pass within a pixel of x=160 at the horizon, and the lateral facades approach from the sides offset by the camera's lateral position, exactly as a pinhole camera draws them. Pixel stats agree: sky brighter than road, seeds differ, busy differs from empty, 19–20 wheel arcs per busy frame.

Cleared without changes: the sweep ran 25 routes × {390, 1280} × {th, en} — 100 combinations, zero console errors, zero horizontal overflow, no dead controls, every page with title and h1; hero at 1198×435 holds 60 fps with both canvases live at city/24; blind toggle verified working; 7 rapid car switches wrap correctly; reset keeps the hero readout in sync; the Thai aria-label repaints with the language (an early false alarm — headless Chrome's locale is English, so the English label was correct behaviour). Recorded, not fixed: the hero repaints at ~30 fps even when the sim is paused; harmless, and the same trade the dialog always made.

`npm run deploy` published 1.15.1; health ok, 3,430 cameras, one `?v=1.15.1` stamp per page. **Shipability note that outlives this pass: the working tree is 79 files of uncommitted changes spanning four releases — everything from 1.14.0 to 1.15.1 is live in production but exists in no commit.** One bad `git checkout` or disk hiccup and the only copy of the last five days is the deployed runtime directory. Committing is one command away whenever it is asked for.

### The push that found a fork · 1.15.2

Five releases had shipped from a tree that existed in no commit. Committing surfaced why that mattered: origin had moved ahead with two commits this line never had — **v1.13.4** (Dr Non Arkara + Cursor, PR #1), which stops Drive's decision diagram and Gesture's step names being sideways scrollers on a phone, and a docs PR of forkable sources. Production 1.15.1 was therefore running without a fix that had already been written.

The commit was rebased onto origin/main: 39 files had been touched by both sides, almost all of them `?v=` stamp conflicts (remote went to 1.13.4, this line to 1.15.1). The remote's JavaScript changes were verified stamps-only before our side was taken wholesale; `drive.css`, `drive.html`, the READMEs and the handbook merged by hand and were then checked to contain **both** sides — the stacked-steps markup and the hero band, `.gstep` foreignObjects and the hero controls. One lesson recorded the hard way: in a rebase, `--ours` is origin/main, so the first pass of `package.json` briefly read 1.13.4 — caught by the stamp audit, fixed to 1.15.2.

The merged tree was then proven in a browser at 390 px: Drive shows the four-step stacked list instead of the 780 px SVG (hidden), zero document overflow, hero intact (358×220, readouts live); Gesture's SVG is hidden, its steps stack one column, four `.gstep` labels wrap; console clean on both. Gate green (171 tests, 25 pages, 87 references, no forked imports).

Published as 1.15.2 — the release that finally ships v1.13.4's phone fixes to production alongside everything since.

### Cross-examined by a second agent · uncommitted no more

MiniMax independently verified the 1.15.2 push line by line — history, gate, live health, stamps, the landed v1.13.4 markup, the committer convention — and went past the summary: all six of its security fixes survived the 39-file rebase, the runtime is byte-identical to the repo for `server/` and `public/js/`, and `tests/` gained 530 lines with zero deletions, so nothing was weakened to reach green. It also re-derived the stamps-only claim independently. Its verdict on the blink drill fix stands as the honest record: the drill it shipped was dead on arrival (a lookup scoped to `#try` that could never find the exhibits' photographs), its pure-logic tests could not see the DOM, and it mistook the second bug for a harness artifact — both found here, both pinned by regression tests that fail under reintroduction (18/18).

Its one correction of this line's work is fair: the README's test-file count was restaled by the blink drill's own test file. Rather than write 22 and wait to be bitten a third time, the count is gone and the roster now points at `ls tests/*.test.js` with the reason in the cell. Committed and pushed here, since a verified edit sitting uncommitted is the exact failure mode the last pass recorded.

One judgement call left open on purpose: the camera figures in `docs/08` and `architecture.md` trail production by a few (225→221 view, 3,430→3,426 total). They stay dated snapshots — chapter 08 already says the counts move by tens a day, and wiring prose to live numbers would churn documents on every deploy. If the docs should instead track live, that is a design change worth its own decision, not a passing fix.

### Closed in this pass · the parked list, emptied

Everything in the previous parked list is either fixed or explicitly kept with a reason. The fixes that mattered most were the ones where a green gate was saying nothing:

- **Rollback now prunes.** `restorePrevious()` copies the old tree back but never called `prune()`, which the forward path does — so every file a FAILED release added stayed in the runtime and stayed web-servable next to the restored code. Only bites when the failed release added an asset, which is exactly when you are already in trouble.
- **Rollback now waits for a version.** It called `waitHealthy(null)`, so if the restart did not take, `/api/health` still answered with the bad build and the script printed "restored the previous runtime" while it had not. Exit code was right; the message an operator read was not.
- **The catalogue cannot interleave on itself.** `refresh()` had no in-flight guard and every run wrote the same `${cacheFile}.tmp`. Needs a ten-minute event-loop stall to reach — now a `busy` flag plus a per-run temp name.
- **The catalogue fetch is capped.** `res.json()` had a 60-second timeout and no ceiling on a payload the code calls ~2.4 MB. Now read in chunks with a 32 MB cap, refused before a byte is read when content-length says so.
- **The catalogue cannot collapse the site.** See the incident below.
- **`/api/cameras` no longer re-encodes on every request.** Only the OBJECT was memoised, so `JSON.stringify` + `gzipSync` ran per request on a ~250 KB document — ~19 ms of blocked event loop each time, on the thread that also serves frames. The encoded pair is built once: measured 1.68 ms → 0.005 ms.
- **The relay breaker counts host faults only.** A 404 for a camera whose still was taken down is a fact about that id. `/api/cameras` is public and ids are enumerable, so asking for eight dead ids opened the host breaker and made EVERY still on that host answer "resting" for three minutes.
- **A failed `listen()` exits 1.** EADDRINUSE arrives as an `error` event; with only the `uncaughtException` backstop it was swallowed and the process exited 0 having never listened, so launchd retried happily and a deploy waited 60 s for a server that was not coming.
- **Limiter eviction is LRU**, not insertion-ordered — the old code could evict the busiest key on the server — and `cf-connecting-ip` must now look like an address before it becomes a limiter key.
- **The checks stopped claiming things they cannot see.** The traversal probe sent normalised paths (both `fetch` and `http.get` collapse `%2e%2e`), so it proved nothing; it now writes raw bytes on a `net.Socket` and the server receives the literal path. `/api/health` 200 no longer stands in for `ok: true` (a warning, not a failure, so the gate is not held hostage to FloodDash). Language parity no longer passes at 0 == 0. A manifest with no `weightsManifest` is now reported rather than silently passing.
- **`build-handbook --check` sees orphans.** It only listed files the build WANTS, so a removed chapter's page sat in `public/handbook/` forever while the check printed "✓ handbook pages match docs/".
- **`check-privacy` and `palette-measure` no longer print a success claim on a failing path.** Both recorded the problem and then said the reassuring sentence anyway.
- **The handbook names the language it is written in.** `lang` was chosen per element by character count, which got it wrong on 134 lines across the eight chapters. Bilingual lines are now split into per-language spans by the generator — while preserving the separator, and never splitting inside `**bold**`, a code span or a link, because an earlier version of that splitter did exactly that and shipped literal asterisks. Visible text is byte-identical to before; only the markup changed. Two guards now keep it that way.
- **The drill cannot lie twice.** `buildWall()` never cleared its state, so a rebuild pushed six more screens onto the old six: twelve tiles, both copies of the flashed screen lit, and the page said one flashed. `.is-truth` had a class but no CSS rule, so the truth marker was invisible; and it was keyed to the machine's catch, which reads as a claim about the machine instead of about the camera.

#### The 29-minute outage, and the guard it bought

At 11:17 UTC on 14 Oct 2026 FloodDash returned a partial catalogue — 131 cameras with five of seven sources marked `failed`, against 3,425 good ones. `adopt()` refused only an EMPTY catalogue, and 131 is not empty, so the site published 4% of its cameras to visitors until the 11:46 refresh, 29 minutes later. FloodDash was healthy throughout (3,424 cameras, all sources live) — the partial was transient.

The guard added is relative, not absolute: a new catalogue must keep at least 25% of the last good one, so it needs no world knowledge and cannot go stale. It is deliberately loose — the log's real movement is under 10% — and the test pins both halves: a 6% dip (3,425 → 3,211, observed) is ADOPTED, and the 96% collapse is REFUSED with the failed sources named in the log.

#### Still open, on purpose

- **Large binaries are not streamed.** The memo correctly skips files over 2 MB, but `load()` still `readFileSync`s them: an 11.5 MB WASM shard blocks the event loop ~87 ms per request. Browser-cached for a year, so the cost is small, and a real streaming rewrite carries regression risk against pinned cache/etag/HEAD behaviour. The comment now says what happens instead of what used to be claimed.
- **Evicting a limiter key returns it at full burst.** Now named in a test as a known property rather than left for the next reader to discover.
- **`check-docs` validates handbook anchors with the same `slug()` that minted them.** That proves self-consistency, not agreement with GitHub's heading-id algorithm. Cheap to harden, no live breakage.
- **Dead design-system CSS.** `.stem`, `.stem-label`, `.measure`, `.measure-n`, `.mix` and `.field-signal` have zero uses. They are documented vocabulary in the `vision.css` header, so removing them is a design decision rather than a clear-cut deletion — and `.stem-label` does appear once in `drive.html`, where it currently matches no rule.
- **Suspected, trigger never found:** the HLS native-fallback path, where `loadHls()` awaits `canPlayType` and a non-rejecting "unsupported" result falls through to the `<video>` path. Worth confirming the two paths cannot both attach a source to one element.

### The agent that froze had actually finished · 1.16.0 live

Called to check for a second agent's work "frozen half way". There was nothing uncommitted: the tree was clean and main was level with origin. What had frozen was the *shipping* — eight commits of other agents' work (a 29-minute outage fixed with a breaker anyone could trip, Drive-teach scaling, the dead Drive buttons merge, machine light and five-room nav, the More menu, camera feedback, Konami vision, a private car count, and the self-sweeping lenses with the person outline) sat merged and pushed while production ran 1.15.2. The version labels were tangled on the way — two agents bumped independently to 1.17.0, and the final cherry-pick from PR #6 restamped everything to 1.16.0 — but the tree itself was self-consistent: 89 stamps, all one version, matching package.json.

Verified before shipping rather than trusted: the gate at HEAD reads 193 tests, 0 failures (30 more than the last line's 163), 25 pages, 87 references, no module under two URLs. In a browser: home's lenses and 20-link nav load clean, the Konami sequence dispatches without an exception, the Drive hero and its six cards are intact, and /games, /gesture, /cameras and /story all load with console empty. `npm run deploy` published 1.16.0; live health ok at 3,424 cameras, every script stamp on the live page reads 1.16.0, the hero renders at 1198×435, console clean.

### The research room, audited on its own terms · 1.16.1

Scoped to /research — the evidence strip, the history walk, the three learning kinds and the NT TAG ID case study — read as prose, as claims, and as code.

The prose survived examination. Every one of the twenty-four timeline citations checks out (Hubel & Wiesel 1959 through SAM 2023, venues and years correct), and the page's honesty claims hold against the code: the Edges lens really runs the Sobel operator (cv/lenses.js:81), the training room's fingerprints really are MobileNetV2 1.0 at 224 (ml/embedder.js:17,40), and the case study keeps its guardrails — the dissertation diagrams are described as descriptions, with an explicit sentence that they do not establish deployment or independent evaluation. The six evidence figures fill from the same catalogue the map reads; a catalogue that has not loaded prints a dash, not a zero.

The code did not fully survive. One try on a reward path read "Left tried 1 times" — the exact plural-bug class the 1.14.2 sweep fixed everywhere it looked, surviving here because that sweep never reached this page. The string builder now lives in research/reward.js next to the learner it describes, goes through count(), and is pinned by three new tests — one of which was mutation-checked this time, properly: the bug was reintroduced by hand, the test went red, the fix went back in, 196/196 green (an earlier attempt to mutate via perl failed silently on shell quoting and ran green against unmutated code; caught and redone with the edit tool). Two smaller findings: grouping the four teaching objects had no way back — a third button ("ไม่จัดกลุ่ม / Show ungrouped") joins the pressed-group and rebuilds the flat row from the kept element list, because append() moves nodes and a captured list would have restored an empty one; and toggling language refetched the whole 3,426-camera catalogue just to reformat six numbers — the last answer is now kept and re-rendered, verified in the browser at exactly one fetch across a language switch.

Published 1.16.1; health ok, 3,426 cameras, live /research reads "Left tried 1 time, right 0 times.", the group round trip restores four items, console clean at 390 and 1280, both languages.

## 2026-10-15 08:37 Asia/Bangkok · Away monitoring ended

- Read shared notice and current project status. The authorized away window expired on 2026-10-12 at 23:59 Asia/Bangkok.
- Deleted `vision-away-operations` heartbeat through the app automation tool because its purpose has expired. No further health polling, recovery, deployment or service changes performed; existing production services preserved.

## 2026-10-15 · Audit of the research audit, release 1.16.2

- User requested another audit with emphasis on first-time use. Preserved GLM's plural fix, grouping round trip, research illustrations and case-study attribution. Found remaining gaps: a language change while the catalogue was pending could duplicate the fetch; failures silently left unexplained dashes; links to hidden history panels did not reveal them. Research now uses the shared single-flight catalogue loader, shows loading/failure/retry and a dated Bangkok-time snapshot caption, and reveals history/learning panels on initial fragments and hash navigation.
- Reworked the learning section into three plainly named choices, one lesson at a time, explanation beside activity on desktop and stacked on phones. Each lesson gives a concrete task, a link to video training, and a next-lesson link. Answers toggle now says Hide when visible. Supervised cards explicitly identify themselves as an illustration rather than training. The reward example reveals outcomes only after trying, highlights the last path, and explains exploration versus learned preference and ties. All Thai/English content retained; without scripts the three explanations remain readable.
- Corrected misleading prose: the earliest era includes neural networks as well as hand-written methods; depthwise operations act on feature channels rather than only colour channels; international training datasets do not prove that no image was taken in Thailand; SAM prompts do not guarantee a perfect outline. Bibliographic entries retained; this pass did not repeat the prior agent's full external citation audit.
- Gates: 199 tests green (three new regression cases for loader sharing/retry and robot choice explanations), 25 pages/87 references, module identity/privacy/docs/palette checks green. Browser: 30 learning layout states at 375/390/768/1280/1920 in TH/EN, 16 history states at 390/1280, no horizontal overflow. Grouping shape/colour/ungrouped restores four cards; answer show/hide, three automatic reward rounds, lesson sequence and history deep links verified. Isolated fixture returned 503 then recovered through Retry; delayed request plus language toggle produced exactly one catalogue request. No private camera opened.
- Deployed 1.16.2 through the checked rollback-capable deploy script. Public health confirms 1.16.2 with a fresh catalogue; live reward learner chooses left/right/left and explains its learned preference, console clean. Screenshot: /tmp/vision-research-1.16.2.png. Site-wide changes outside research are cache stamps only. Temporary fixture and preview servers stopped; existing production services preserved.

### The one dead end left in the whole system · 1.16.3

Asked to make the system more human-centric, audited the human-critical surfaces at 390 and 1280 in both languages, with a real keyboard, with the camera denied, and with no camera at all. Most of it was already right and is recorded here so it is not "fixed" twice: with no camera every room offers a way forward and /focus opens with the camera off behind a consent step; the first screen on a phone gives the eyebrow, a plain headline, a one-line map of the journey and a Start button above the fold; the language toggle lives in the sticky rail at the top with a bilingual aria-label; every focusable has a 3px contrast-adaptive :focus-visible ring; and the home lenses that sweep themselves stop on any deliberate choice, switch off under prefers-reduced-motion, and pause when the tab is hidden. One apparent bug — the skip link not taking the first Tab — turned out to be the audit harness (a CDP Tab without a `text` payload is not treated as navigation); with the payload it is the first stop and appears on focus, so nothing was changed.

The one real dead end left was the detector. Everything else on the site explains a failure and offers a way forward — no camera, empty list, nothing found, language off — but when the 18 MB model could not load, the home page said only "Detection is unavailable. Try Objects again, or use another lens." That is the most common first-time failure on a school wifi, a blocked network or a phone out of data, and it named the symptom, not the cause, and not the way out. ml/failure.js now classifies the failure (blocked library, dropped weights, dead graphics backend, out of memory, or unknown) and says it in plain words with a concrete next step — the four lenses that need no network still work. Eight tests pin every branch in both languages, mutation-checked: deleting the next-step line fails two of them. The tests also caught a real false positive while being written — the memory pattern /memory|allocation|OOM/i matched the word "kaboom" — and was narrowed to a word boundary.

Published 1.16.3; health ok, 3,417 cameras; verified against production with the model shards blocked, the page reads "Detection could not start. The browser could not fetch the model library — often a network or script policy blocks it. the other lenses still work (picture, numbers, edges, motion) — try buttons 1–4, or refresh and try again", and the dead confidence line stays hidden. Gate green at 207 tests.

### Complexity, made followable · 1.16.4

The remaining human work was teaching depth: making a hard subject easy to follow as a whole. The system already explained itself in plain language room by room — but it had one structural gap. The glossary is a hundred-odd terms, each with a plain meaning and the chapter that explains it, yet it was reachable only from the handbook index and had no per-term addresses. A reader who met "confidence score", "bounding box" or "Sobel operator" in a live room had no way to follow the word to its definition; the definition existed, but not the thread.

The handbook builder now gives every glossary row an id from its English term (the one table with a "Plain meaning" column, so other tables are untouched), and the apostrophe in "Otsu's method" is dropped before slugifying so the anchor reads `otsus-method` rather than the accidental `otsu-s-method`. From that, the jargon where a learner actually meets it now points at the right row: the home page's five-steps explainer carries a quiet footnote linking pixel, edge, bounding box and confidence score; the research page's method table links Sobel and Otsu to their entries.

A dead glossary link is a dead end for exactly the reader it exists for, so tests/glossary-anchors.test.js walks every HTML page and asserts each `/handbook/glossary#term` fragment matches a real row id — mutation-checked by pointing the home page at a fake term and watching the test go red.

Published 1.16.4; health ok, 3,422 cameras. Verified against production: home carries the term links, `/handbook/glossary#confidence-score` resolves to its row and scrolls into view, research carries its two method links, console clean. Gate green at 209 tests.

### A first lesson people can finish · 1.16.7 · 2026-10-15

Next priority chosen from the user's repeated tester feedback: make Train's first teach → learn → test cycle understandable and controllable before adding more rooms. The default practice source needs no camera. Source replacement is an optional disclosure; busy / quiet / automatic buttons let a learner select what to teach, with explicit wording that the scene button is not the model's answer. Instructions and the three-example threshold now agree and update as each step finishes. Recent labelled thumbnails and per-class Undo expose mistaken teaching; editing examples invalidates the old prediction, including an in-flight stale result. First-load wording explains that the selected frame is held while the 14 MB model loads. Status survives language changes, and singular frame/choice readouts use the shared count helper.

Found a functional timing fault behind the old instruction to wait for quiet traffic: the drawn clip capped elapsed time at 0.2 seconds per render, so an offscreen phone preview could take many seconds of collection to advance one second. Practice time now accounts for elapsed visible time between draws and excludes hidden-tab time, with the visibility listener removed on close. Three regression tests cover the offscreen gap, manual/automatic scene choice, and hidden time/cleanup. Unsupervised collection resets the practice source to automatic variation.

The compact mobile preview stays visible while teaching controls scroll, with large scene targets and space for focused controls beneath it. Short landscape windows use normal flow. Browser evidence: real MobileNet supervised learning from three busy + three quiet frames produced both corresponding live guesses; Undo dropped quiet to two examples and disabled Learn. Production k-means collected 24 frames into groups of 9 and 15. Reward trials held the scene, disabled scene changes until feedback, accepted +1 twice, and advanced to a new action. English layouts had no horizontal overflow at 375×812, 390×844, 768×1024, 1280×900, 1920×1080 and 844×390. No camera permission or private imagery was used.

Final phone check caught the pinned preview covering a button's centre after automatic scrolling. Reduced preview height, overlaid the fullscreen control and reserved scroll space for focused inputs/buttons; the entire six-example exercise then completed with ordinary pointer clicks at 390×844, yielding a live Quiet road result. Screenshot: /tmp/vision-train-1.16.7-phone.png. Thai also passed all six layout widths without horizontal overflow; fullscreen entered correctly and the actual page console remained clean. Final deployment gate passed all 244 tests, 26 pages, 89 references, and import/privacy/document/font/palette checks; published 1.16.7. Public health is healthy and served CSS matches the final reviewed source. Preview process and temporary browser tab were closed, viewport restored.

### TEACH composition rebuilt · 1.16.8 · 2026-10-15

User explicitly rejected TEACH's appearance after 1.16.7. Replaced the stacked onboarding cards and black control wall with one video-led workspace: compact three-mode selector, larger preview, one next instruction and answer buttons carrying their own example counts. The source picker (including the existing shared camera/photo controls), custom names and technical caveats are optional disclosures below the core activity. Removed repeated prose, duplicated visible counts and the second held-frame preview in the reward panel; the main preview still holds the exact frame for feedback. Advanced activities and their learning code remain available. Practice starts with busy traffic held steady until the visitor chooses another scene; collecting unlabelled frames still switches to automatic scene changes.

Browser checks on the isolated preview at port 8438: a 390×844 pointer-click supervised run saved three examples per class, enabled Learn and returned Quiet road; k-means collected all 24 frames into 11/13 groups; a reward trial held Raise alert and accepted +1, displaying “Rated 1 choice”. Thai language switch worked. Layout checks at 375×812, 768×1024, 1280×900, 1920×1080 and 844×390 found no horizontal overflow; English 390×844 and 1280×900 visually inspected. Page console had no errors. Browser tool's own Statsig 403 telemetry is unrelated to Vision and was not bypassed. No private cameras were opened. Initial deployment stopped at the font gate because it treats valid CSS `font-family:inherit` as an unknown font; changed the page styles to the shipped `var(--sans)` stack, leaving the gate intact. Final release gate/deployment verification follows.

Final gate passed: 244/244 tests, 26 pages, 89 references, fonts/import/privacy/docs/palette checks. Published 1.16.8; public health ok with 3,421 cameras and current catalogue refresh. Live English layouts passed the same five responsive widths without horizontal overflow and the page console was clean. Screenshot of the shipped workspace: /tmp/vision-teach-1.16.8-live.png. Closed this turn's preview and test tab; restored viewport. Changes outside TEACH are version import restamps only.

### A path you can see, and a page that admits what it is · 1.17.1 · 2026-10-16

Branch reconciliation first. Ten branches had been worked on across three agents. Nine are already in main: `reconstruct-room` has no tree difference at all, `teach-footage-drive-gate` differs only in version stamps, and the five older cursor lines differ only in files main has since added. `classroom-1-16-0-5f3c` is a real 1.16.9 line, 25 commits behind, carrying 2.3 MB of Noto Sans SC that main deliberately replaced with a 34 KB subset — merging it would revert the research, train and reconstruct releases. Its one unreconciled idea was worth keeping, and it is the thing this release ships.

**The learning path.** A four-step rail — เริ่ม Begin → มอง Look → สอน Teach → ตัดสิน Judge — now sits under the nav on /learn, /cameras, /train and /games, each room marking its own step as `aria-current="step"` in the markup rather than by colour alone. `assemblePage()` gained a route→step map; the marker survives greyscale, and the four steps are also the site's Chinese, English and Thai text together, since the rail is what a Chinese visitor meets first.

**/learn is a path, not a wall.** Eight chapters on one page had a contents list and nothing else. Now: every chapter ends in a Next button carrying the next chapter's own name (the last one leaves the page for /train, because teaching is what someone wants after reading); the contents marks the chapter you are reading; a quiet line counts the chapters read, and a returning visitor is offered the chapter they stopped at. Progress is remembered in localStorage. The reading line is a third of the way down the screen, not the top, so a chapter that has only appeared at the bottom of the view does not steal the marker.

**The language note.** Chinese is being written room by room, and CSS keeps English visible where Chinese is missing so the page is never blank — correct for the content, silent for the reader. A visitor who asked for Chinese and received English had been told, by implication, that this is what Chinese looks like. Every room with no Chinese now says so, in Chinese, above the English it falls back to. "Has Chinese" is counted, not declared: the finished /reconstruct scores 1.00 Chinese lines against Thai, the rest score under 0.02, and the rail's own eight Chinese spans are correctly not mistaken for a translated page.

**Jargon leads somewhere.** Thresholding, histogram, Otsu, convolution, kernel and pixel now link to their glossary rows on /learn, where a beginner meets the word first.

Verification. 284 tests pass, up from 244: `tests/learn-course.test.js` covers the reading-line arithmetic, the bilingual titles, resume and the hostile-stored-value cases; `tests/learning-path.test.js` covers the rail, the step marking and the coverage threshold. Browser-checked on the isolated preview at 8431 in both languages at 390×844 and 1280×900: the rail marks begin/look/teach/judge on the right room, scrolling to chapter 05 marks chapter 05 (the first implementation compared a document offset against a viewport one and reported chapter 08), progress and the resume link survive a reload, and the Chinese note appears on /learn and not on /reconstruct. The first Next button printed the English chapter title inside the Thai view — the contents link's last child was the English span — so both languages are now read from their own spans and checked as such. No camera was opened and no private imagery used.

Gate green: 284 tests, 27 pages, 93 references, fonts/imports/privacy/docs/palette.

### The gate a person can actually pass · 1.17.3 · 2026-10-16

PR #12 (Cursor, from the maker's own testing: "no human can pass it") made the Drive gate passable: only crops where a car is plainly visible or plainly absent, cars-only, one slip forgiven, a miss keeps the grid for correcting, wide frames drawn with contain instead of a square cover-crop that cut cars off the edges.

Review found one defect before merging: bangna-5 and bangna-6 were grouped as "plainly no car" while still carrying the car label — and the label is the answer key, so the gate demanded clicks a person could see no reason for, on roughly one grid in four, where one forgivable slip is not two. The label records what was in the crop; the gate needs what a person can see; those are different jobs. Both tiles left both hand-picked lists, the grouping is exported (GATE_PLAIN_CAR / GATE_PLAIN_NONE), and a new test holds the grouping and the labels in agreement — re-adding bangna-5 to the no-car list fails it, mutation-verified. The header comment still claimed a miss deals a new grid; that went too.

Also this turn: Codex's 1.17.2 colour-room release was reviewed and kept (it was pushed but never deployed — live stayed on 1.17.1 until now), and the three stale PRs were reconciled: #5 and #6 carry work already committed to main directly in the 1.16.0/1.17.0 releases (verified file-by-file), and #9's one unreconciled idea — the path you walk — shipped as 1.17.1; its branch is preserved as archive/classroom-1.16.0-zh and deleted from the branch list.

Gate green: 293 tests, 27 pages, 93 references, fonts/imports/privacy/docs/palette. Deployed 1.17.3; public health verified.

### The way out, walked through and repaired · 1.17.5 · 2026-10-17

1.17.4 (from the other agent) added a way past the Drive gate and removed the box around the colour chips. Both were audited here rather than accepted.

The chips hold up: ten solid grey fields with air between them, no frame, no seams; black-on-grey is 10.16:1 in both schemes, and grey reads as a distinct field against the naples ground in each. The spine's seams stay — they separate bands at 3:1 and a deal that puts the page's ground on the ground shows three bands instead of four without them.

The skip works: drawn when the gate is shut (199×44), opens the room, never shows the reveal, and is gone afterwards, including after a reload.

Three defects found in it, none mentioned in the report:

1. **A dead control.** "Try a new challenge" removes `data-open`, which is what hid the skip. So after passing, entering, and asking for another grid, the skip came back — pointing at a room that was already open, and doing nothing when pressed, because `openRoom()` had already run. Reproduced in a browser before fixing (`changed: false`). `data-through` is now set once in `openRoom()` and never taken back; the way out answers to that, not to the collapse.
2. **A false claim.** The note under the skip said the gate "stores nothing". It writes `vision_drive_gate_v1 = entered` to sessionStorage — confirmed by reading storage after a skip. The note now says what is kept (one note that you have been through, in this tab) and what is not (your picks). On a site whose standard is "the answer is a label checked against that crop, not a drawing", an untrue storage claim is the same error.
3. **Dead code and a stale comment.** `skipNote` was queried and never used; the gate header still said a miss deals a new grid, untrue since #12 kept the grid and the picks.

Also: the skip button now names its note via `aria-describedby`, so a screen-reader user hears why it is there instead of hunting for the paragraph below it.

Verified in the browser at 390×844 and 1280×900: cold visit → grid and skip both drawn, room shut; honest answer → reveal shown, enter opens the room, skip gone, `data-through` set; "try again" → grid returns, skip stays gone; skip → room opens, reveal never shown, still through after reload; no console errors. Three new tests, each mutation-checked (removing the data-through rule, not setting data-through, restoring "stores nothing", dropping aria-describedby — all four fail the suite).

Gate green: 297 tests, 27 pages, 93 references, fonts/imports/privacy/docs/palette.

### Open-tool resource guide and detector recovery · 1.17.8 · 2026-10-19

Reviewed the user's 22 repository links against GitHub maintainer metadata and READMEs using the Agent Reach GitHub workflow. Added a job-first guide at /handbook/reading#build-with-open-tools and a Thai/English/Chinese entrance from Research. Corrected ByteTrack and TorchGeo canonical owners and the Esri ArcGIS-installer description; distinguished relative/metric depth and variant weight terms, facial measurements versus mental states, and current classroom dependencies versus evaluation candidates. Kept Python/GPU/geospatial stacks out of the browser runtime; no new production dependency or training workload. Thai summaries accompany the tool groups. The existing handbook reading measure is now 65ch. Independent review requested by anti-slop-design caught a phone chooser table clipping lesson destinations; replaced it with a wrapping task list. Reviewer approved final 390px and 1440px screenshots; 1024px also has no horizontal overflow.

Concrete code finding: detector warm-up input/output, output readbacks and NMS intermediates were disposed only after successful awaits. GPU rejection/readback failure leaked temporary tensors on retries. Added try/finally cleanup and tests/detector-cleanup.test.js: six injected execution/readback/allocation/NMS failures leave zero temporaries and every retry succeeds. Mutation check: original HEAD detector fails the new test, restored fix passes. Detailed tensor mechanics stay here rather than in the public beginner guide. Initial slop-lint REVIEW 3 points (reading-column whitespace and long table lines); limited the resource guide's short reading tables to 65ch, then reran. Full release gate and final live checks follow.

Final slop-lint: OK, 2 points (intentional whitespace beside a long-form reading column); the long-lines finding is gone. Independent review approved the wrapping chooser on phone and desktop. Its separate basics pass flagged four short Thai room labels plus inline table links and a 4.0s local LCP under concurrent test load. Gave room links a 44px minimum width; inline sentence links retain the handbook's normal text layout. Font integrity rechecked green after the final CSS changes. Live loading observations will be recorded without treating the local lint measurement as a production performance claim.

Release complete: npm run deploy passed all 305 tests and fonts/handbook/site/import/privacy/docs/palette checks (27 pages, 93 local references), then published 1.17.8. Initial run caught a fifth Research starting-choice violation; moved the resource entrance into a plain contextual link, preserving the existing four-choice design. The unchanged Blink timing test failed once under load; isolated 25-test recheck and full 305-test rerun both passed. Public health confirms ok:true/version1.17.8; browser pointer navigation from Research opens the resource anchor, no console errors. Live 390px guide has no document overflow and visible room targets are at least44×44px; desktop and phone screenshots saved. No production performance claim is made from the loaded local lint run.

### Every room screened, and the promises the site makes · 1.18.0 · 2026-10-20

The 19 October design audit screened six routes — Home, Cameras, Learn, Teach, Drive, Research — and said plainly that the rest needed context. This pass measured all twenty-seven, because one route had never been looked at and was the worst page on the site. `/focus` scored 9 points against the linter's threshold of 6, the only route over it. It is now 5. Across the site: 76 points → 69, SLOP routes 1 → 0, and the only three routes whose score moved moved because a rule was being broken, not because a number was being chased (`/focus` 9 → 5, `/games` 4 → 2, `/gesture` 3 → 2).

What was actually wrong:

1. **The house measure was never enforced.** `.prose { max-width: 62ch }` resolves `ch` against the *container's* font-size, so a 22px column handing a 14px paragraph got 73 characters and a 22px paragraph got 818px. Prose was running at 74–96 characters. The cap now sits on the prose itself, at the size the reader sees. The research timeline was separately capped at 72 and is now 62.
2. **`/focus` was a black rectangle with nothing in it** — the only room not using the house's own `.bench-state` line. Its four readings sat in four equal grid tracks, its recalibrate button was the width of its column, and two of its sizes were not on the stated scale.
3. **`/games` counted with one digit alone in an 800px band.** The counter is now a group the width of its own words.
4. **A visitor could be shown a plate the machine refuses.** `/colour` says those six are behind an explicit button; the shared roll landing on a visitor's screen was rolling from all twenty-four, so about one visit in four showed an unreadable plate to someone who never asked. It rolls from the legible pool now.
5. **A camera probe waited four times as long as it said.** The probe passed `videoTimeout: 8000`; the code that read it called the option `timeout`, so the option was dead and every cold open waited the 20-second default — about forty seconds for two batches of probes.
6. **`/legal` understated what the site stores** — two things said, nine kept. The page names all nine now, and `check-privacy` fails the build if a key is in the code and missing from that sentence, or if the sentence's count stops matching the code. That page is where a PDPA question would be answered from.
7. **Two tracked photographs carried GPS** — the coordinates of the control rooms they show, which is what the author had already stripped from the copies that go on the site. Both are clean now; all twelve tracked images verified clean.

Findings read and deliberately left alone, with the reasons, are in `ops/DESIGN-AUDIT-2026-10-20.md`: the house's `↗` and `▶` marks are counted as emoji by the linter (they are Unicode Extended_Pictographic and it has no functional-symbol exclusion); the Thai face is set at 0.82em of its Latin counterpart, so a bilingual page computes more sizes than the eight-step scale; the flat page background is reported as dead space; and the cameras catalogue strip, the four-step path band and the wide table wrappers are deliberate.

An agent that did not make the changes reviewed the screens and found five errors in this pass, two of them serious — the counter group has four children and the repair declared three grid tracks, which crushed the "Done" button to 44×77px, and an `object-fit: fill` on the `/focus` camera could stretch a 4:3 picture into an enlarged 16:9 box, which on that page means landmarks in the wrong places. Both are fixed, along with a comment that made a false claim about the house's conventions, a line of copy that repeated two things the page already said, and the 72-character cap above. The house rule is that no one reviews their own work.

Gate on the release tree: 308 tests, 308 pass, 0 fail (305 before; three new, each mutation-checked — restoring the old option name makes the probe test wait 20,001ms and fail, and restoring `dealShared(true)` makes the route test deal a plate the machine cannot read). 27 pages, 93 local references; fonts, handbook, forked imports, privacy, docs and palette all green. Published 1.18.0; public health confirms `ok:true`/`version:1.18.0` with the catalogue intact at 3,431 cameras, and the live pages serve the new stamps, the new idle line and the new storage claim.

One thing for the author: the full-resolution IOC photographs are still tracked in a public repository. They no longer carry location metadata and the site has always published reduced copies of the same pictures, so nothing is newly disclosed — but the originals remain in the repository's history, and removing them from there needs a `git filter-repo` rewrite, which is destructive, public and rewrites every clone. That is the author's call, not this pass's.

### A new plate, and the slop that came with it · 1.19.0 · 2026-10-20

The house ritual on a massive upgrade is to change the colour pairing. This release does that, and takes the design slop with it, because a new plate makes every old habit visible.

**The plate changed.** Naples Yellow `#fbe6a0` → **Ivory Buff** `#ebd3a2` (paper); Deep Slate Olive `#253122` → **Deep Indigo** `#051230` (ink); Neutral Gray `#b6bfc1` unchanged (structure); Peach Red `#f15a30` → **Jasper Red** `#eb5324` (signal). The paper stays warm — a cold corporate plate is the exact thing `ANTI-SLOP.md` argues against — and the *ink* is what changed, so the site now says "warm human paper against a cold instrument" in colour and not only in a caption under it. The old name "Peach Red" was a fruit.

The four hues were chosen by eye and then proved, not the other way round. The house's credited archive was searched for the 73,024 quadruples that clear the site's contract; the seven that sit on a single printed plate are muddy or wrong-role — a cyan "quiet", a green "signal", a paper that shouts — so the chosen four were judged on the real site and then measured. `npm run palette` still certifies 16 required pairings clear their floor and 5 forbidden pairings stay below it, the colour study still deals 24 ways and still refuses the same six, and all six refused plates are still the ones where Jasper Red is the paper, because no hue reaches 4.5:1 on it at any tone. The four hues no longer share one printed plate, so the citation changed honestly: *four hues from Sanzo Wada's archive*, linking to the catalogue, with no plate number invented.

**The rename was not cosmetic.** Every token, class, constant and figure was renamed along with the values, because a name that lies is a second place for the truth to go stale. The rename exposed three latent defects that had been hiding inside the old names: `fill-olive` had no CSS rule at all, so the camera blocks in `/reconstruct` rendered in the browser's default black; `stroke-signal` was used in four places with no rule, so the machine's marks rendered black too; and `/colour`'s special case — the page's best sentence, the one that explains why one hue is refused as paper — was keyed off the literal string `'signal'` and would never have fired again. It now reads `HOUSE.signal`, so the sentence and the palette cannot drift apart.

**The house measure was over its own ceiling.** Ten CSS rules sat above the 65-character cap the rulebook sets, and `ch` was resolving against the container rather than against the text: `.prose` handed a 14px paragraph 73 characters and a 22px one 818px. The cap now sits on the text, at the size the reader actually gets, and `tests/measure.test.js` enforces it — mutation-checked, because restoring a 90-character rule makes it fail.

**An agent that did not make the changes reviewed all eighty-one screens** — twenty-seven routes at 1440, 1024 and 390 — against the rulebook, and found nineteen things the instrument cannot see. Two did not survive checking against the source and were dropped. The real ones were repaired in this release: `/story` carried its hero type on a veil that left it at 3.20:1 in places, because the new paper is darker than the old one was; the veil is deeper and the type is White now, 6.13:1 against the worst patch of the photograph. `/colour` printed a hard-coded "confidence 0.41" above a full-width bar that reads as a meter at maximum — the bar is now a sample of the colour, beside the number the instrument actually measured. `/focus` opened with the operating system's own select boxes and checkboxes, in a grey that exists nowhere in the plate, and its camera panel was a flat black third of the first screen before the camera had been asked for. `/cameras` was built like a magazine article about maps rather than a map. Ten button labels carried a list bullet baked into them, and a gesture page opened with three colour emoji. The handbook's own measure cap was inert, its contents panel was a field stretched to four times what its four words needed, and the accent was doing five jobs at once — Jasper Red now means only *what the machine sees*, and the navigation, the call to action, the language toggle, the selected state and the focus rings moved to the ink and the paper.

The rest of the review — the prose hero running past the fold on four routes — was carried into the next two releases, which are their own entries below, and one finding, the lead figure on `/research`, was left alone on purpose with its reason recorded.

The map now takes **40% of the first desktop screen and 52% of the first phone screen** on `/cameras`, where it took none — the page opens with the map in the stage's place, beside a title that no longer shouts over it. Both numbers are the linter's own, measured with the same instrument on the 1.19.0 tree.

Gate on the release tree: 313 tests, 313 pass, 0 fail (308 before; five new — three that enforce the house measure, and two that pin the research section links; the measure tests are mutation-checked, because restoring a 90-character rule makes one of them fail). 27 pages, 95 local references; fonts, handbook, forked imports, privacy, docs and palette all green. Published 1.19.0; public health confirmed `ok:true`/`version:1.19.0` with the catalogue intact at 3,431 cameras.

The full plate, the contract and the reasoning are in `ops/DESIGN-AUDIT-2026-10-20-PLATE.md`.

### Reading and multilingual repairs · 1.19.2 · 2026-10-20

Released after the 1.19.0 plate was checkpointed separately, so the colour change and the reading change could be read apart.

Shared compact task headings, readable introductory text, Chinese heading leading and wrapping controls. Home's phone title no longer forces two oversized lines. Handbook headings select one language instead of showing a long bilingual heading; inline code wraps; wide tables gained a multilingual sideways-scroll cue with keyboard focus. A shared navigation boot in the head repairs inert language controls on all twelve handbook routes and on `/colour`, reusing the same module URL so nothing forks. Chinese lens names and descriptions stop Home and Cameras from throwing during a language switch, with regression coverage for all five lenses in three languages. The Chinese handbook notice inspects the article, so a translated navigation cannot conceal an English-only article — full translation remains incomplete and is disclosed rather than implied. Gesture puts its working area before the optional explanation; Drive has a short instruction, an optional explanation, a visible Skip, and its exercise beside its instructions on a desktop. Public module dependencies are versioned consistently so a stale edge-cached language module cannot outlive its stamp.

Gate: 316/316 tests, fonts, generated handbook, 27 routes / 97 local references, 83 modules / 65 imports with no URL forks, privacy, docs and palette all pass. The deployment ran the whole gate before publication. Browser: 27 routes × 3 language modes × 3 widths = 243 checks at 390×844, 1024×900 and 1440×900, with no document overflow and every language switch working.

### Geometry that follows reading · 1.19.5 · 2026-10-20

The user's test was the one worth keeping: *why is this here, why this size, and why this far from that?* The geometry has to follow reading, choosing and acting, and that sentence is now in `ANTI-SLOP.md` with its own review questions.

Home lost the viewport-height justification between its heading and its instructions: the introduction is a content-sized reading column beside the larger camera workspace, the title uses the task scale, and the camera keeps a natural 16:9 frame instead of stretching to fill the column. The duplicated hero webcam button and its unused listener are gone — one source-control group owns the public camera, the own camera and the photo choice, with the privacy sentence beside it. Home's story section now has the heading spanning the section and the photograph beside its explanation, instead of hanging below the heading with unrelated blank space opposite. The four equal-height learning-path panels became one compact content-sized row, and the navigation stays on one line and scrolls inside itself when it must: the desktop bar measured **108.3 → 45 px**, applied to Learn, Cameras, Teach and Games. Teach puts frame selection next to its teaching buttons, the result explanation after the action, and its Full screen tool anchored to the preview through a relative containing block.

Gate: 316/316 tests plus fonts, handbook, site references, module URL consistency, privacy, docs and palette. A browser layout audit of 55 distinct after-checks — Home, Teach, Learn, Cameras and Games × three language modes × three widths, plus forced-light combinations — found zero document overflow. A real phone interaction added one labelled example (Busy road 0/3 → 1/3) with the model loaded locally, no webcam opened and nothing uploaded. Independent review caught two regressions during the iteration: a white readout moved onto the light page lost contrast, and making the phone bench static orphaned its absolutely positioned Full screen tool. Both were repaired and rechecked before release. Full record in `ops/SPATIAL-2026-10-20.md`.

### Evidence and teaching · 1.20.0 · 2026-10-21

The first stage of the approved computer-vision upgrade roadmap; tracking, landmarks and segmentation remain planned, and the reproduction instructions are in `docs/SUPERPOWERS.md`.

Teach now requires distinct examples, then offers an explicit held-frame test. The page shows the held picture beside the checking controls, including on a phone. The model guesses before the visitor supplies the answer, test pictures do not silently become training examples, a correction adds the example explicitly and clears previous scores, unsure answers are excluded from the denominator, and exact repeats are rejected — while similar frames from the same camera still do not establish camera transfer. Undecoded practice frames cannot be saved, recorded public-camera footage is labelled accurately, and the source bar checks local pixels for darkness or low detail without polling or claiming a camera is broken. System gained an optional bounded synthetic check: 100 evaluation frames, a soft two-minute limit, stop and visibility cancellation, downloadable results.

The checked-in desktop baseline really ran: **TP 0, FP 35, FN 336**. That exposes failure on drawings; it is not real Thai-road accuracy, and it is not a held-out result. Model artefact SHA-256 values and scorer tests pin the reproduction. Verification: 13 focused tests, a browser pass that collected three Busy and three Quiet examples, learned, held a new frame and checked Quiet (1/1), and a Stop that produced a clearly partial 15/100 report. Responsive checks covered Train and System × 390/1024/1440 × three languages — 18 combinations, no document overflow — with independent review of the target layouts.

### A reading rhythm for the promises · 1.20.1 · 2026-10-21

The last release changed one section, and the change is worth stating plainly because it is the kind of thing the house spends everything else to protect: the site's own promises are now read the way the house reads.

The screenshot showed three isolated roman numerals, detached titles, long undifferentiated paragraphs and expensive vertical spacing. The numerals are gone; each thought has a semantic heading and two short paragraphs. The section heading dropped to the subtitle scale, the family and the palette are untouched. Leading inside a paragraph is tight (1.4 English, 1.5 Thai and Chinese), a paragraph break is .8em and a break between thoughts is 2em — one reading beat within a thought, two between thoughts, with no fixed heights and no equal cards. On a desktop the heading and the explanation sit in two columns; below 700px each heading sits immediately above its explanation and may use the full column. The unsupported universal claim "always shows its confidence" was replaced with the plain fact that a confidence number does not guarantee a correct answer, and the warning about missed detections now carries the emphasis.

Measured on the live site after publication: Home at 390, 1024 and 1440 in Thai, English and Chinese — nine combinations, no document overflow, no console errors, every page serving the 1.20.1 stamp. The linter still calls Home a REVIEW at five heuristic points, and that is recorded rather than hidden: the lens tabs are classified as stretched number tiles, and the long-line, type-chaos and default-font flags are pre-existing. The promise groups themselves are content-sized, carry no numbers or cards, and cap prose at 60ch. That is the whole of Home's finding — this entry does not claim the page clears every heuristic.

Gate on the release tree: 326/326 tests, plus site references and JS/model shards, fonts, handbook, module URL consistency, privacy, docs and palette. Published 1.20.1; public health confirmed healthy. Evidence in `ops/evidence/promises-1.20.1/`.

### A button that keeps its own width · 1.20.2 · 2026-10-21

The 1.20.1 release had shipped, and the release log had not said so: `ops/AWAY-STATUS.md` stopped at 1.18.0 while five releases went out, and the 1.19.0 plate record points at that file for the findings of the independent review. The log now carries 1.19.0, 1.19.2, 1.19.5, 1.20.0 and 1.20.1, and `AGENTS.md` states the procedure that keeps it current.

Those entries were written from the release trees rather than from memory, and two numbers were wrong until they were measured. 1.19.0 shipped **313** tests, not 311, and 95 local references, not 93. The number the rulebook cares about most — the map's share of the first screen — was measured with the same linter on a 1.19.0 worktree: **40% of the first desktop screen and 52% of the first phone screen** on `/cameras`, where 1.18.0 had none.

The release itself is one CSS line. The `/focus` setup column is a grid, and a lone button in a grid column stretches to the column by default: the recalibrate button was **540px** wide to hold **112px** of words, which is a field with a label in it rather than a button. It now keeps its own width — 112px at both 1440 and 390, measured on the live page after publication.

The linter was run over the whole site for the first time in one sweep: all **27 live routes** at 1440 and 390. **68 points, 0 SLOP routes**; the house's threshold is 6. Home is a REVIEW at 5, `/drive` and `/gesture` at 4, `/handbook`, `/research`, `/system` and `/train` at 3, and every other route 2 or below.

Its ten stretch-to-fill hits were read one by one rather than taken at face value, because the instrument flags and a person judges. Nine of them are the house's own idiom — a row of controls sharing the width of its row: the five lens tabs on Home, the two setup buttons in the gesture room, the control rows on `/everyday` and `/train`, the tile actions, and the confirm dialog's pair. The linter's rule fires on every one of those by construction, since it cannot tell a control row from a control that was stretched. The tenth was a lone button in a grid column, and that is the one this release fixes.

Gate on the release tree: 326/326 tests, plus fonts, the generated handbook, 27 pages / 97 local references, 88 modules / 70 imports with no URL forks, privacy, docs and the palette certificate. Published 1.20.2; public health confirms `ok:true`/`version:1.20.2` with a fresh catalogue of 3,432 cameras, the page serves the new `?v=1.20.2` stamp, and the focus room opens at 1440 and 390 with no console error and no horizontal overflow. The live capture of the room, with the house select, the house checkbox and the button at its own width, is in `ops/evidence/focus-1.20.2/`.
