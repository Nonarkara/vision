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
