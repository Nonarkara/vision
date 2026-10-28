# Finger playground — 1.24.0

## Found
The custom Gesture room required examples for each pose and separate activation before anything happened. This contradicted the owner's new request for immediate finger play. The earlier 1.23.1 release record retains the teaching workflow's before measurements; it is superseded by this intentional change in task, rather than retained as compulsory setup.

## Changed
/gesture now starts ready-trained, with one or two hands: Celebrate (one finger Hooray, two confetti, additional counts with named celebrations), Music (1–8 diatonic C4–C5), and Color (1–10 linear saturation from full color to grayscale). The color operation affects the picture, preserving readable controls. Close fingers briefly to repeat the same gesture; holding does not endlessly trigger. Button/keyboard examples provide an explicit camera-free alternative and are labelled as examples. Custom model teaching stays one click away at /train.

MediaPipe Hand Landmarker v1 float16 is self-hosted, 7,819,105 bytes, with source/hash in its NOTICE. Inference runs in a worker using the existing vendored0.10.32 runtime. Permission/playback deadlines and camera ownership reuse FrameSource. One frame in flight, worker startup/inference deadlines, bounded70 particles/12-note history/4 audio voices, offscreen and hidden processing skips, stop/pagehide track disposal. No uploads or camera permission granted during this audit.

Independent review found and repaired late camera permission overriding a number example, stale notes after pending audio activation, mute being overridden by number input, and keyboard shortcuts not working with button focus. Shared fullscreen supplies focus isolation/restoration and Escape; a resolved native request that never entered fullscreen now falls back to viewport mode. Shared fullscreen text has Chinese. The translation notice checks the activity/article instead of counting unrelated untranslated footer prose. Regression tests exercise actual deferred camera/audio routines, real public landmark outputs, synthetic rotation/mirror/count combinations, release/repeat timing, grayscale endpoints and fullscreen fallback.

## Verified
Real self-hosted worker initialized under the production-style CSP and processed a blank frame with zero hands. Google's public pointing_up.jpg and victory.jpg were read locally by the worker and counted1 and2. Image originals are not shipped; joint outputs and source URLs are recorded. Geometry fixtures cover0–5 on one hand and totals7/10, rotation and mirroring. These are not claims of physical-camera accuracy.

First-screen hierarchy: camera picture first, finger count/outcome second, mode/input choices third. The number buttons sit next to the outcome on desktop/tablet and immediately under it on phone. No examples, binding dropdowns, arm controls, pretend-house panel or long browser-limits chapter blocks first use. The instrument's gray frame groups camera controls/status; ivory groups choices/readouts, indigo is ink/picture backing, jasper marks recognized output. Three hues are carried; no signal is owed before detection.

| Viewport | Chrome/task geometry | Preservation |
|---|---|---|
|390×844|44px navigation (5.2%); camera, picture and count appear together. Optional ten-button keypad uses two rows of44px targets; Chinese may need a few pixels of scroll for its last row. Fullscreen remains available.|TH/EN/ZH readable; no horizontal overflow; examples visibly labelled; two-digit count has its own4rem column.|
|1024×900|44px navigation (4.9%); picture and number choices/outcome share a row.|All modes and number choices visible without document scrolling; keyboard and expandable tips retained.|
|1440×900|44px navigation (4.9%); camera occupies the dominant column, example buttons grouped with the result.|No orphan controls or stretched statistic cards; full picture has a task reason for its16:9 area.|

Measurements per language are in evidence/gesture-1.24.0/geometry.json. Screenshot files are genuine JPEG, with dimensions independently decoded; initial resize/transition captures were discarded. Verified all nine idle language/width combinations, note repetition Do/Do/Sol, mute persistence, numeric keyboard after button focus, confetti/banner, all grayscale endpoints, full-size mode/Escape and Chinese notice. The initially coloured0% screenshot was captured during the150ms transition; settled filter is saturate(0), with corrected grayscale evidence. Initial fullscreen inherited white text on ivory; explicit indigo now measures correctly and is pictured.

## Remaining
Physical webcams, diverse hands/skin tones, real two-hand gestures, low-light accuracy, audio through physical speakers and long sessions have not been verified. The help explains lighting/cropping/overlap limitations and offers buttons. This is a playful straight-finger heuristic over pretrained hand landmarks, not a sign-language recognizer or identity system. Existing unrelated design/audit/history limitations remain outside this release.

Release-tree gate and live evidence are appended after deployment.

## Shipped result
1.24.0 code5cbacf7 deployed from its detached release tree:406/406 tests,27 pages/97 local references,92 modules/86 resolved imports,17 required palette pairings.1.24.1 code98d2e24 adds back-cache recovery: cancel on pagehide, recreate audio on next user action, resume animation/observer on persisted pageshow and explicitly say camera is off. Its detached release tree passed npm run deploy:407/407 tests, same27/97 references and92/86 module figures, all17 pairings, changed-module URL gate, Published1.24.1. The shared runtime is approximately11 MB uncompressed in addition to the7.8 MB hand model and is cached across the MediaPipe rooms; model size is not a total first-visit transfer claim.

Release-tree slop-lint: OK,1 point, score4; hits long-lines and approved house Thai font. Measured three hues above the floor at both widths (ivory/indigo/gray). The long-line heuristic includes the single desktop instruction line; body explanation stays at65ch, while button choices/readouts have shorter measures. No stretched statistics, modal-on-load, glass or shadows. This is scoped review, not a whole-site design pass.

Local and public health both ok:true/version1.24.1, catalogue loadedAt19:31:35Z/upstreamAt19:26:37Z (fresh within the10-minute cycle). Live3-width checks have no horizontal overflow or observed console errors. Verified repeated Do/Do/highDo, mute remains off until explicitly changed, keyboard after focused button, filter endpoints1/0, version1.24.1 in served footer. Independent review closed source/visual findings, including the two-digit phone count spacing and settled grayscale. Added screenshot/health/deploy/lint evidence beside the initial feature captures. Camera permissions were never granted; real hardware/two-hand accuracy and physical speaker output remain unverified.
