# Evidence and teaching milestone · 1.20.0

First stage of the user-approved CV upgrade roadmap; tracking, landmarks and segmentation remain planned. Implementation and reproduction instructions are in docs/SUPERPOWERS.md.

## What changed

Teach now requires distinct examples, then offers an explicit held-frame test. The page shows the held picture beside the checking controls, including on phones. The model guesses before the visitor supplies the answer. Test pictures do not silently become training examples. A correction adds the example explicitly and clears previous scores. Unsure answers are excluded. Exact repeats are rejected; similar frames from the same camera still do not establish camera transfer.

Undecoded practice frames cannot be saved. Recorded public-camera practice footage is labelled accurately. The source bar checks local pixels for darkness/low detail on source renders, without polling or making semantic claims that a camera is broken.

System has an optional bounded synthetic check: 100 evaluation frames, soft two-minute limit, stop/visibility cancellation after the active job, downloadable results. The deterministic 200-frame pack has development/evaluation sequence variants but shares drawing geometry. It is not a real-camera holdout. The checked-in desktop baseline really ran: TP 0, FP 35, FN 336. This exposes failure on drawings; it is not real Thai-road accuracy. Model artifact SHA-256 values and scorer tests pin reproduction.

## Verification

- 13 focused tests passed (evaluation, holdout and practice readiness).
- Browser: collected three Busy and three Quiet examples; learned; held a new frame; checked Quiet; result 1/1. Explicit Teach this answer increased Quiet to four and removed old scores/learned state. Cannot tell excluded from denominator. Normal capture/scene/undo controls stayed disabled during held review.
- Benchmark Stop produced a clearly partial 15/100 report, with download enabled and Stop disabled afterward. Full 100/100 actual baseline saved separately.
- Responsive checks: Train/System × 390/1024/1440 × Thai/English/Chinese, 18 combinations, no document overflow. Independent reviewer approved target mobile/tablet/desktop layouts and held-picture grouping. Forced-light mobile capture also inspected. Chinese article translation remains incomplete; the existing notice is visible.
- A wrong-scope paint branch caused a ReferenceError during iteration; fixed before final release. No new errors in the subsequent browser runs (the tab log retains the earlier entry).
- slop-lint: both routes REVIEW at 3 points. System basics PASS. Teach's control-name findings contradict the named controls in the actual accessibility tree; existing Plex/font/type/symbol findings and panel measurements were reviewed manually. No automated contrast violations. This is not a claim that every lint heuristic passes.
- Screenshots in ops/evidence/reference-1.20.0. File labels use actual viewport/language; the source-bar clue is not a continuous freshness monitor.

Final release gate passed: 326 tests; 27 pages/97 local references; 88 modules/70 resolved imports; fonts, handbook, privacy, docs and palette checks. `npm run deploy` published 1.20.0. Public health confirmed healthy 1.20.0, fresh FloodDash catalogue, 29 MB memory. Live phone Teach completed 3+3 examples, rejected reused test pictures, then accepted a new frame and displayed a checked 1/1 result. No public-route console errors were recorded. Proof: live-teach-mobile.jpg. All testing used existing public practice assets or owned drawings; no visitor camera opened.
