# Teach and preprint — 1.27.0 · 6 November 2026

Scope: an assembly-instruction teaching flow in `/train`, plus the requested
Research preprint tab. This is not a claim that every room has been newly
audited, nor that an older learner has already learned the material.

## Found / changed

The two Busy/Quiet control sets meant different things without saying so:
change the moving view versus save one labelled picture. Repeated algorithm
explanations and collapsed, partly outdated manuals did not make that mapping
clear. Replaced them with a current, state-derived three-step sequence. Scene
controls say they do not save; Save buttons name the answer and count saved
pictures. The latest exact snapshot and its supplied label are visible together.
Original examples, undo, custom labels, source choices, model comparison,
qualifications and advanced room remain.

The next action advances through missing examples → Learn → an unseen held
picture → check the answer → Continue. Test controls now precede further
collection after Learn, in DOM/focus order too. Feedback gives an explicit
alert/quiet goal. Unsupervised instructions explain the automatic 24-frame
collection and that similarity may mean light/viewpoint rather than traffic.
External-source instructions no longer point to nonexistent practice controls.

A real initial-navigation failure exposed Save before its first picture was
ready. Capture/Ask/collection/action/test now wait for source readiness and
repaint on its transition. Held-picture judgment remains possible when a live
source stops. New guide copy is TH/EN/ZH; older untranslated text retains the
honest Chinese fallback notice. No camera permission or private camera capture.

Research now has Explore / Preprint task views with keyboard navigation and
preserved ordinary section hashes. The five-page, two-column English preprint
has ten references, three tables, a teaching diagram, a proposed study and
rubric, explicit limitations, source ledger and reproducible calculations.
The owner corrected the timeframe to approximately one month; the paper does
not invent years, participant outcomes, consent, ethics approval or a DOI.
Eight selected audit records are artifacts, not eight people. Historical
geometry and synthetic regression results are not learning or home-safety
validation. Mother's agency and precise questions are the intended outcome.

A native PDF iframe stayed blank in the test browser. Replaced it with local,
lazy PDF.js6.5.438 rendering the actual PDF, one resident page, bounded raster
size, navigation, zoom and shared fullscreen. A real first-page preview covers
loading. Reflowable manuscript, PDF download and data download are preserved.
No CSP widening: PDF is correctly typed; eval, document scripts, remote assets,
PDF actions and font-face injection are unused. The worker stops on actual
unload and survives persisted Back/Forward entries, repainting on restoration.

## Measured task geometry

Evidence: `ops/evidence/teach-1.27.0/` and
`ops/evidence/preprint-1.27.0/`. All nine first-screen images in each matrix were
checked for actual390×844,1024×900,1440×900 dimensions. Three initially stale
viewport captures were replaced before independent signoff.

| English viewport | Title/orientation height before → after | First Save y before → after | Task cost |
|---|---:|---:|---|
|390×844|186.3→113.5|720.5→760.6|Numbered instruction earns40.1px; buttons shrink97.6→77.6px and end838.2, inside844. No additional initial scroll.|
|1024×900|124→65.2|520.9→380.1|Picture and named Save action share the screen;140.8px earlier.|
|1440×900|124→69.4|502.4→341.8|Picture and named Save action share the screen;160.6px earlier.|

Chrome remains44px:5.2% of844 or4.9% of900; no bottom fixed bar. Chinese adds
the accurate partial-translation notice (about44px). Lesson steps are normal
flow, not additional sticky chrome. Reading hierarchy: camera picture → current
human action → saved evidence/result. At390 the initial Save bottoms are
TH805.0/EN838.2/ZH819.8; all nine sampled states have0 document overflow.
The phone is intentionally clearer rather than claiming every coordinate got
smaller. Further scrolling reveals saved examples, tests or deeper comparison.

Research adds one normal-flow task chooser, about49–56px, not sticky chrome.
Paper reading priorities: question/status → download/text choice → actual paper.
Reader tops at390: EN414.7/TH421.4/ZH401.9, height414; the whole operating window
fits844. At1024/1440 the reader is570px high. Chinese344.0+570 extends14px past900;
all controls remain at its top and the remaining document is earned reading,
not an empty expansion. PDF panning/scrolling is the requested document-reader
instrument; Read as text supplies a normal reflowable alternative. The phone
fullscreen label becomes its familiar symbol with a complete accessible name,
keeping the reader controls on one row. No text is shrunk or clipped to fit.

## Exercised preservation / review

Browser: six distinct supervised samples; exact saved snapshot; duplicate
rejection; Learn; training-frame rejection; unused held test, grade, Continue;
one-step action/reward; bounded24-frame unsupervised collection and groups.
Source disclosure and advanced features remain. New guide behavioral tests
cover progression, external sources, automatic collection, reward, translations,
held/checked tests and readiness. These do not establish human comprehension.

PDF: actual render, page1→2, zoom, Fit, phone fullscreen/Escape/focus return,
text expansion, Explore/Paper switching and arrow-key tab navigation. A browser
Back to the paper then Next displayed2/5 without a console error. Persisted
BFCache branching also received independent source review; not every browser's
cache behavior was exhaustively exercised. Five PDF pages rendered and reviewed;
corrected an orphan word, table-header wrap, and incomplete requirement fields.
PDF glyphs/columns/tables/footers have no observed clipping or overlap.

Independent reviewer `/root/resource_review` inspected multilingual screenshots,
all image dimensions, held-test state, readiness guards, seven guide tests,
reader behavior/source and all five PDF renders. Independently recomputed all
eight source hashes, all four geometry differences/percentages, and the synthetic
0TP/35FP/336FN,35.4ms median/57.3ms p95. Reviewed the older-adult primary record.
No reported blocker remains. Other scholarly references were checked against
primary author/publication, arXiv, PMLR or publisher records during drafting.

Remaining/unverified: the user/mother study is proposed; human learning and
home safety are unmeasured. The paper is an English author-review preprint,
not peer reviewed or a tagged PDF accessibility certification. Text alternative
is available. No new whole-site, native desktop fullscreen or enlarged-text
certification is claimed. Automated slop-lint could not launch its headless
Chromium within180s; no aggregate linter score is claimed. Real screenshots and
independent manual reviews provide the scoped layout evidence. New hue/browser
instrument census is not claimed; established declarations/pairings remain
under the palette release gate.

Exact-release gate/deployment/public verification are recorded in
`ops/AWAY-STATUS.md` after publication, not inferred from this draft record.
