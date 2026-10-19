# Frontend design audit · 19 October 2026

Release: 1.17.9. Scope: live automated screening of Home, Cameras, Learn,
Teach, Drive and Research; source review of shared styles; manual Teach and
Research screenshots at 1440, 1024 and 390px. This is not a claim that every
route or interaction is free of defects.

## Repairs

- Teach's inactive methods were black on dark olive (1.40:1). Use semantic
  text/ground roles, including hover and the expanded workspace.
- Remove glowing, opacity-animated Home lens controls. Their labels faded with
  the decoration. Keep the selected state solid; keep lens numbers opaque.
- Home glossary links use readable page ink instead of light grey on Naples.
- Learning choices and scene buttons fit their labels rather than equal tracks.
- Catalogue facts wrap at content width, with the total leading the smaller facts.
- Compact the four-step learning path on phones. Method explanations remain in
  accessible names and lesson text; provenance remains in the existing details.
  The experiment is visible without scrolling past two grids of navigation.
- Bring Research prose and Teach notes/credits within 65ch; reuse the shared
  type scale for the teaching workspace.
- Footer and project links have 44px targets; Drive's check/reset row fits its
  actions rather than filling its grid cell.

## Evidence and limits

Baseline slop-lint: Home REVIEW 3 points, Cameras REVIEW 4, Learn OK 0,
Teach REVIEW 5, Drive REVIEW 4, Research SLOP 7. Research's stretch finding
cleared after the repairs (REVIEW 5); Teach's measured stretch finding cleared
(REVIEW 5). Screenshots were independently reviewed and approved after
retaking a transient empty-video capture and an incorrectly sized tablet image.

Treat these reports as screening evidence, not acceptance certificates:
- Symbol heuristics classify functional Unicode navigation/full-screen marks.
- IBM Plex is the deliberate house family, not a system-font fallback.
- The teaching path is a sequence, not four statistic tiles.
- Basics flags controls inside closed Teach details as unnamed. Visible controls
  were inspected in the accessibility tree and method switches tested by keyboard.
- Research's initial progressive enhancement still produces a layout-shift
  warning. This pass does not claim a Core Web Vitals fix.
- Remaining long-line/flat-region/type findings need context; no empty ornaments
  or extra boxes were added to manufacture a lower pixel score.

Browser checks: no page overflow at inspected widths; loaded practice video;
Research and Teach method switching; expanded Teach view uses readable dark
colours. Full release gate and public verification recorded below.

The first gate reached 304/305 passing tests; only the existing Blink full-drill
real-time test missed a short flash under host scheduling load. Its test now
advances mocked timers and performance.now together with the animation-frame
pump. Production code and outcome assertions are unchanged. Disabling the
frame pump made the test fail on the missing machine observation; restoring it
passes. Independent review confirmed the change still exercises real drawing,
observation and logging, rather than substituting the flashed screen as truth.

Final gate: 305/305 tests, 27 pages, 93 references; fonts, generated handbook,
imports, privacy, docs and palette checks passed. Published 1.17.9. Public health
returned ok:true/version1.17.9. Public Teach at390px shows a loaded practice
frame, content-width method choices and no page overflow; public Research at
1440px uses wrapping choices/facts, switches to Find patterns by keyboard and
has no page overflow. No console errors in either inspected live page.
