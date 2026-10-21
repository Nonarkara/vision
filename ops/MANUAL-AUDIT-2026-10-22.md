# The manual audit — 22 Oct 2026

Release **1.21.0**. The question this release answers: *is the site intuitive?* — measured the way an IKEA instruction manual answers it.

A manual is not a writing style. It is a test of whether a system can be understood at a glance. So the test is: **can a stranger, standing in front of this, draw the flow as a numbered list of single actions over named parts?** One goal. One action per step. The part named with the same words the control itself wears. Five steps at most. No hidden prerequisite. A warning where the risk bites, not in a note somewhere else.

**Where a room cannot be drawn that way, the room is too complicated — and the fix is to simplify it, not to document it better.** That rule decided three rooms this release. They were changed, not annotated.

The full law this audit now sits inside is [MSH.md](../MSH.md) — spatial hallucination, the root cause of the failures below: space that exists because a grid put it there, not because a person needed it there.

## The test, and how it was applied

Five questions, asked of every room:

1. **One goal?** Or several, with no ranking?
2. **One action per step?** Or a step that hides two actions?
3. **Named parts?** Does the instruction name a control with the words that control wears?
4. **≤5 steps?** Or a sheet nobody would read.
5. **Warnings at the point of risk?** Or a disclaimer in the footer?

Two house rules did the measuring:

- **The control count per room**, read off the live pages on the **1.20.2 tree** (TH), before any of this release's changes: Home 40 · Cameras **191** · Colour 24 · Drive 35 · Everyday 48 · Focus 35 · Games 46 · Gesture 44 · Learn 96 · Reconstruct 38 · Research 59 · Story 24 · System 34 · Train 66.
- **The spatial measurement** (MSH): chrome cost above `<main>`, page-head height, the Y of the room's first control, the width and line count of every instruction block, and horizontal overflow — at 390, 1024 and 1440.

## The verdicts

| Room | Verdict | What the test found |
|---|---|---|
| **/learn** | ✔ drawable | 8 chapters, each a complete unit of work. Already a manual. |
| **/home** | ✔ drawable | *Corrected.* The head draws "How a computer sees, in five steps" as a diagram whose stage numbers are the lens buttons 1–5. The five lenses are not five browsable views — they are five stages of one pipeline. Nothing to add. |
| **/everyday** | ✔ drawable | 9 self-contained examples. Each is its own manual. |
| **/story** | ✔ drawable | 4 drills, one act each. |
| **/system** | ✔ drawable | A model card and one optional check. |
| **/drive** | ✔ nearly | The gate is already three numbered tiles. |
| **/gesture** | ✔ nearly | Four steps existed — but step 1 held two actions, and the per-pose dropdowns were never mentioned. |
| **/train** | ✘ **failing** | Three paradigms each with its own sub-flow, plus gesture teaching, plus games, plus a drawing activity, plus a 24-camera judge. Six flows in one room. |
| **/cameras** | ✘ **failing** | 191 controls. Three unranked goals. Three controls on every one of 24+ rows. |
| **/games** | ✘ **failing** | Two games plus six challenge cards — three goals, and no way to tell which one the room is asking for. |
| **/focus** | ~ nearly | Five setup decisions, and the mood rating was an unexplained second goal. |
| **/colour** | ~ nearly | The rating step's purpose was never stated. |
| **/research** | ~ | Four landmarks, three methods, one reward exercise — all prose. |

## The three failing rooms were changed, not annotated

### /train — six flows became one

The chooser asked "What would you like to teach?" and offered four activities **and** the gesture room as a fifth, numbered `05 →`. The gesture room is a different room with its own four-step manual and its own instrument; sitting in the chooser made it look like a fifth way to run *this* flow.

- The gesture room left the chooser and became a quiet line under it — still one click away, no longer pretending to be an activity.
- A line now says the truth about what is left: all four activities run the same steps.
- The lesson's three methods each got a manual of their own, because supervised, unsupervised and reinforcement really are three different procedures and a reader must be told which one they are in.
- The room's four-step `.howto` became a five-step manual, and the optional fourth step ("if you want to try more") was replaced by the check that actually matters: try it on another road camera.

### /cameras — one action per row

- The row had three controls: the name (show on map), **Study this**, and **View at owner ↗**. The owner link is not a step in this room's flow — it is where the camera actually lives, so it moved into the line that says what the camera is. **The row's action column now holds one action.**
- **Study this** became **Point the machine** — the same words as the chapter's title, so the manual and the button say one thing.
- Chapter C got a manual: pick → point → change the lens, with the lens buttons named exactly as they are labelled (`1 Picture` … `5 Objects`).
- Chapter D, the census, got its own manual — so the third goal is no longer unranked, it is a named instrument with a stated procedure, and it carries the warnings that belong with it (18 MB on first run; "not detected" is not "not there").

### /games — one game at a time

Three games stacked on one page, each with its own rules, its own canvas and its own specimen bar: three goals and no entry point.

- A picker at the top names the three games. **One is on screen at a time.**
- Each game carries its own manual, written as single actions over named parts.
- A game is wired the first time it is chosen, so the detector is not loaded for a game nobody plays.

## The component: the manual is now a house component

`.howto` was defined only in `css/pages/train.css`. The gesture room loads only `css/pages/gesture.css` — so **the gesture room's four-step manual rendered completely unstyled**: `list-style: decimal`, 22px IBM Plex Sans, ink-coloured text, and a tick box measuring 0 × 0. The house had two manuals and one of them was invisible.

The manual is now `.manual` in `public/css/vision.css`, loaded by every page:

- the step number in a small solid square, mono — the machine's voice;
- the instruction in the reading face — the house's voice;
- **the named control quoted in mono**, because that is the face the control itself wears on the page, so the word in the sentence and the word on the button are the same word;
- an optional warning line, under the step it belongs to;
- the house's live tick, kept: a step the machine has confirmed fills its marker with Jasper. Jasper means "what the machine sees", and a step the machine has confirmed is the one thing in these rooms it does report.

The manual speaks **Thai and English** — the house's two complete languages. Chinese falls back to the English span, and the page's existing Chinese notice discloses the gap.

`tests/manual.test.js` pins it: the component lives in the house stylesheet and no page may re-declare it (that is how the gesture room lost its manual); every step has exactly one number and one body; the numbers run 1, 2, 3; no manual exceeds five steps; both languages are present; a named part is named the same number of times in both; the live `data-step` keys are exactly the keys the page scripts watch; and every named part names something that is really on the page.

## The part that is easiest to fake: naming a part

A chip that says `Point the machine` proves nothing if no button says that. Every chip in every manual was therefore checked against the rendered page — in **Thai and in English, in a fresh browser context each time**, with the collapsed `<details>` opened, because a control hidden behind a disclosure is still a control but not one a reader can see.

Two chips failed, and both were real:

- **The lesson's buttons are relabelled at runtime.** The markup says `Add frame to group 1`; the lesson replaces the button's contents with the group name and the count, so the button actually reads **`Busy road + Add example · 0 / 3 to start`**. The manual named a label that is gone by the time anyone sees it. The chips now name the action the button really offers — `+ เพิ่มภาพ` / `+ Add example` — and the group by the name it carries: **ถนนรถแน่น** / **Busy road**, **ถนนโล่ง** / **Quiet road**.
- **The gesture room's log had no name on the page.** The manual said read the `log`, and the page had an empty black field with nothing written on it. The log now carries the house's own readout label — `บันทึก` / **Log** — so the part the instruction names is a part the reader can see.

After the fixes, every named part in every manual, in both languages, names something that appears on its page. The check is also in the test suite.

## The four partial failures, fixed

- **/focus** — the setup column became a five-step manual, and the three numbered headings went with it (the manual carries the numbering). The mood rating is now a step whose purpose is stated: the camera cannot know your mood, you tell it yourself, and those notes do not change the measurements. **The session buttons moved out of the instrument column into the column that names them** — "Agree & start" was 800 px away at the bottom of a 530 px black panel, below the fold on a tablet.
- **/colour** — the rating step now says what it is for: your word exists to be compared with other people's, it is not a score for you.
- **/research** — the three methods each got a manual: show the answers; group by shape then by colour; let the robot choose three times.
- **/home** — nothing to add. Recorded above.

## Spatial hallucination, measured

MSH is now wired into `AGENTS.md` and `ANTI-SLOP.md`, with the full law in `MSH.md`. Applying it to this release's own work found four things:

| Found | Measure | Changed |
|---|---|---|
| **The manuals were in the narrow column.** The chapter grid is `0.6fr | 2fr`; a manual dropped into the chapter header landed in the 305 px column at 1440 and the 217 px column at 1024. | 305 × 338, 5 lines per step | The manuals moved into the chapter body — the wide column. Now 845 × 172, 2 lines per step. |
| **A named part forced the page wider than the screen.** `white-space: nowrap` on the chip; "Add this answer to the shared result" pushed /colour to a 418 px scroll width at 390. | scrollWidth 418 > 390 | The chip wraps instead. Overflow 0. |
| **The game picker ran past its content.** The plate was a full-width black band; at 1440 it ran 940 px past the last button, and on a phone the wrapped row left an orphan band under it. | 940 px of empty plate | Each choice is now its own field. |
| **The session buttons were scattered from the steps that name them.** | 800 px, below the fold at 1024 | Moved into the setup column, under the consent they depend on. |
| **The instruction sheet was wider than its own text.** `max-width: 64ch` resolved against an inherited 22 px, so the plate was 845 px holding a 350 px line. | 845 px, 2.4× its content | The measure is set at the reading size: 62ch → 595 px, the house's prose measure. |
| **The named part created two font sizes that existed nowhere else.** A scaled chip is 15.2 px in the body and 11.9 px inside a warning. | /gesture 7 → 9 sizes, /focus 8 → 9 | The chip inherits its context instead of scaling. The manual now adds **no** size to any page. |

Two systemic findings are **measured and recorded, not fixed here**, because a change to the composition of all 27 pages is its own release with its own baseline and its own review:

- **The page head is a stretched row.** `.page-head` is `1.618fr | 1fr` with the standfirst pushed to the far right. At 1440 the title's text ends at x=355 and the standfirst begins at x=890 — **535 px of nothing between the title and the sentence that explains it.** On a 390 × 844 phone the head is 335–395 px, up to 47 % of the screen before the page's work begins.
- **The nav is two stacked bands** on /cameras, /games, /learn and /train: the main nav and the path bar, 101 px at 1440 and 145 px at 390. Two bands where one coherent group would do.

Both are the next release's work, with the numbers above as the baseline.

## What the instrument says

The linter was run over all 27 routes twice — once against the 1.20.2 tree in a worktree, once against this one — and compared route by route.

**68 points before, 68 points after, Δ0, and no route changed verdict.** The house's threshold is 6 and there are no SLOP routes in either. Adding seven manuals and simplifying three rooms cost the site **no** linter points at all, and that is the number worth stating: the instruction sheets did not become slop.

The two regressions the first pass did introduce were found by comparing against the baseline rather than by reading a score, and both are fixed:

- the instruction sheet measured at 845 px for a 350 px line (the `ch` unit resolving against an inherited 22 px), and
- the named part creating a 15.2 px and an 11.9 px size that existed nowhere else, pushing /gesture and /focus over the nine-size threshold.

Both are in the table above. The second is the kind of thing a linter's "type-chaos" flag says almost nothing about, and a baseline measurement says exactly what it is.
