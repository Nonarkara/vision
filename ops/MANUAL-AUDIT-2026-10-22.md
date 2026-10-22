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

- **The control count per room.** A count is not a number until you say which elements you count, so: *every interactive element in the document — `button`, `a[href]`, `input`, `select`, `textarea`, `[role="button"]`, `label.btn` — that is visible at 1440 px in Thai, with the catalogue loaded.* Measured on the 1.20.2 tree and again on this one:

  | Room | 1.20.2 | 1.21.0 | Page height |
  |---|---|---|---|
  | /games | 52 | **35** | 5494 → **2441 px** |
  | /research | 59 | 59 | 15089 → 15166 |
  | /cameras | 194 | 194 | 7585 → 8040 |
  | /gesture | 46 | 46 | 3583 → 3723 |
  | /everyday | 50 | 50 | 10523 |
  | /learn | 98 | 98 | 11424 |
  | /handbook | 58 | 58 | 4270 |
  | /reconstruct | 38 | 38 | 6675 |
  | /drive | 35 | 35 | 4436 |
  | /focus | 35 | 35 | 2882 → 3029 |
  | /colour | 24 | 24 | 2490 → 3220 |
  | /story | 24 | 24 | 6542 |
  | /system | 34 | 34 | 9500 |
  | /train | 72 | 72 | 1595 → 1827 |
  | / | 51 | 51 | 4559 |

  **Only /games got smaller.** The other rooms got a manual, and a manual is text: the control counts did not move and the pages got taller. That is the honest result, and it is not the result the first draft of this record claimed.

  **The whole table was re-measured on both trees before publishing, and four of the first draft's numbers did not survive it** — /research's 1.20.2 count was 59 and not 60, /learn's was 98 and not 97 at both ends, /system's 1.20.2 height was 9500 and not 9181, and /colour's was 2490 and not 2462. All four were figures carried over from an earlier release rather than measured on the tree, which is exactly how a log starts lying.
- **The spatial measurement** (MSH): chrome cost above `<main>`, page-head height, the Y of the room's first control, the width and line count of every instruction block, and horizontal overflow — at 390, 1024 and 1440.

> **Corrections to this record.** This file was written, then measured, then measured again by people who did not write it, and a good part of it did not survive. Every figure below was wrong when first written and is corrected here rather than quietly dropped.
>
> - **The manual's width.** Reported as 845 px; then as 595 px; the shipped answer is that the plate is **as wide as its own longest step** — /colour 372 px, /research 379 px, /train 470 px, /gesture 489 px, /focus 498 px, /games 556 px — with the 62ch prose measure as the cap, not the width.
> - **The narrow column.** "305 × 338, five lines per step" described an *intermediate build of this release*, not 1.20.2 and not the shipped tree. Measured: a manual constrained to the 305 px header column is **305 × 505, five lines per step**.
> - **The control counts.** /cameras was reported as 191 — not a count of anything reproducible; the figure is **194 visible**, and it did not fall. The whole table was then re-measured on both trees, and four more numbers turned out to be carried over from an earlier release rather than measured: /research's 1.20.2 count was **59** and not 60, /learn's was **98** and not 97 at both ends, /system's 1.20.2 height was **9500** and not 9181, and /colour's was **2490** and not 2462.
> - **/home.** "The head draws 'How a computer sees, in five steps' as a diagram whose stage numbers are the lens buttons 1–5" is **wrong**: the head's `<h1>` is "How a computer sees", and the figure in that head is the **handbook path**, labelled "Chapter 01, Chapter 02, Chapters 04–05, Chapter 06, Chapter 07". /home passes for a different reason: its lede states the sequence in words and the lens buttons are numbered 1–5 to match.
> - **"Below the fold on a tablet."** **False.** The focus button sat at y=709 in a 768 px viewport, on screen with 59 px to spare. The distance was the real problem; the fold was not.
> - **The nav bands.** "101 px at 1440 and 145 px at 390" does not reproduce. Measured on the published site: the rail is 56 px and the path bar 56 px, so **112 px** at 1440, and 100 px plus 49 px, so **149 px** at 390.
> - **The page-head void.** "The title's text ends at x=355 and the standfirst begins at x=890 — 535 px of nothing" does not match any room on the current tree. The standfirst does start at **x=888** on every room that has one, but the title's text ends at 214–721 depending on the room, so the gap runs **167 px to 674 px**.
> - **The phone head.** "335–395 px, up to 47 % of the screen" is wrong: measured, it is **186 px to 416 px, 22 % to 49 %**.
> - **The distances.** Every figure first written for "how far is the control from the step that names it" was measured on a dev server with a probe that toggled the language rather than setting it. Re-measured on the published site, in Thai, on the phone: /train `▶ Start this game` **5372 px**, /games `+` **2069 px**, /gesture `+ Add example` **1621 px**, /gesture `Arm the actions` **1021 px**, /focus `Recalibrate` **762 px**, /games `Start` **785 px**, /cameras `Point the machine` **493 px**.
> - **The named parts.** "Checked in Thai and in English, in a fresh browser context each time" was not what the probe did: the site takes its language from the browser locale on the first visit and keeps it, so clicking the toggle walks th → en → zh. Set outright, the count is **78 named parts across seven rooms in two languages, 72 of them resolving** to something visible.

## The verdicts

| Room | Verdict | What the test found |
|---|---|---|
| **/learn** | ✔ drawable | 8 chapters, each a complete unit of work. Already a manual. |
| **/home** | ✔ drawable | *Corrected twice.* The first draft said the head draws "How a computer sees, in five steps" as a diagram whose stage numbers are the lens buttons 1–5. It does not: that figure is the **handbook path**, labelled "Chapter 01, Chapter 02, Chapters 04–05, Chapter 06, Chapter 07", and it is not in the head. The head's `<h1>` is "How a computer sees". /home passes for a different reason: its lede states the sequence in words — light, then numbers, then edges, then motion, then a guess — and the lens buttons are numbered 1–5 to match. The five lenses are five stages of one pipeline, so the room has one goal and no steps to draw. A manual here would be a list of the stages, which the buttons already are. |
| **/everyday** | ✔ drawable | 9 self-contained examples. Each is its own manual. |
| **/story** | ✔ drawable | 4 drills, one act each. |
| **/system** | ✔ drawable | A model card and one optional check. |
| **/drive** | ✔ nearly | The gate is already three numbered tiles. |
| **/gesture** | ✔ nearly | Four steps existed — but step 1 held two actions, and the two dropdowns that make the room work (the pose set and what each pose *does*) were never mentioned. |
| **/train** | ✘ **failing** | Three paradigms each with its own sub-flow, plus gesture teaching, plus games, plus a drawing activity, plus a 24-camera judge. Six flows in one room. |
| **/cameras** | ✘ **failing** | 194 visible controls. Three unranked goals. Every row carried three clickable things. |
| **/games** | ✘ **failing** | Two games plus six challenge cards — three goals, and no way to tell which one the room is asking for. |
| **/focus** | ~ nearly | Five setup decisions, and the mood rating was an unexplained second goal. |
| **/colour** | ~ nearly | The rating step's purpose was never stated. |
| **/research** | ~ | Four landmarks, three methods, one reward exercise — all prose. |

## The three failing rooms were changed, not annotated

### /train — the gesture room left the chooser

The chooser asked "What would you like to teach?" and offered four activities **and** the gesture room as a fifth, numbered `05 →`. The gesture room is a different room with its own four-step manual and its own instrument; sitting in the chooser made it look like a fifth way to run *this* flow.

- The gesture room left the chooser and became a line under it — still one click away, no longer pretending to be an activity. *(First attempt failed the spatial test: the line was left inside a five-column grid and landed in the fifth cell as a tile-shaped hole, 268 × 165 px of a paragraph dressed as a choice. It now sits below the grid, and the grid is four columns wide because there are four choices.)*
- A line now says the truth about what is left: all four activities run the same steps.
- The lesson's three methods each got a manual of their own, because supervised, unsupervised and reinforcement really are three different procedures and a reader must be told which one they are in.
- The room's four-step `.howto` became a five-step manual, and the optional fourth step ("if you want to try more") was replaced by the check that actually matters: try it on another road camera.

**What did not get simpler.** The room still has two choosers — "How will you teach it?" above the bench and "What would you like to teach?" inside a collapsed disclosure — and the second is not really a second flow, because the first is the visible one. The visible control count did not move (72 before, 72 after) and the page grew from 1595 to 1827 px, because a manual is text. The gesture room's removal from the chooser is a real simplification; the rest of this room is documentation.

### /cameras — one action per row, and a manual where the button is

- The row had three clickable things: the name (show on map), **Study this**, and **View at owner ↗**. The owner link is not a step in this room's flow — it is where the camera actually lives — so it moved into the line that says what the camera is. **The row's action column now holds one action.** The clickable count did not fall: the owner link is still a link, it is simply metadata now. 194 visible controls before, 194 after.
- **Study this** became **Point the machine** — the same words as the chapter's title, so the manual and the button say one thing.
- **The manual moved.** It was in chapter C, and it told the reader to press `Point the machine` — a button that lives in the list, 2415 px above, in a different chapter. A manual that names a control the reader cannot see is the release's own rule broken. The room's manual now sits in the atlas, above the list that carries the button, and it has two steps: pick a camera, press `Point the machine`. Chapter C got its own two-step manual for the bench's own controls: choose a picture, change the lens.
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

**The plate is as wide as its own longest step, and the prose measure only caps it.** A fixed 62ch field is a card whose rows all span 595px whether the step wants 209px of Thai or 470px — the house's own rule 9, worn by the release's own component. So the content decides the width: /colour 372 px, /research 379 px, /train 470 px, /gesture 489 px, /focus 498 px, /games 556 px, and on a phone the full column. The rows stay equal width inside that plate, so the numbers still line up down the side.

The manual speaks **Thai and English** — the house's two complete languages. Chinese falls back to the English span, and the page's existing Chinese notice discloses the gap.

`tests/manual.test.js` pins it: the component lives in the house stylesheet and no page may re-declare it (that is how the gesture room lost its manual); every step has exactly one number and one body; the numbers run 1, 2, 3; no manual exceeds five steps; both languages are present; a named part is named the same number of times in both; the live `data-step` keys are exactly the keys the page scripts watch; every named part names something that is really on the page; the plate is content-sized and no step row sets its own width; and the manual adds no font size of its own. Each of those pins was checked by injecting the bug it claims to catch and watching it fail.

## The part that is easiest to fake: naming a part

A chip that says `Point the machine` proves nothing if no button says that. Every chip in every manual was therefore checked against the rendered page — in **Thai and in English**, with the collapsed `<details>` opened, because a control hidden behind a disclosure is still a control but not one a reader can see. The language has to be *set*, not toggled: the site takes its language from the browser locale on the first visit and keeps it, so a fresh browser context still arrives in whichever language the context asked for, and one click on the toggle walks th → en → zh. A check that "switches language" by clicking is a check that measures the wrong language.

Two chips failed, and both were real:

- **The lesson's buttons are relabelled at runtime.** The markup says `Add frame to group 1`; the lesson replaces the button's contents with the group name and the count, so the button actually reads **`Busy road + Add example · 0 / 3 to start`**. The manual named a label that is gone by the time anyone sees it. The chips now name the action the button really offers — `+ เพิ่มภาพ` / `+ Add example` — and the group by the name it carries: **ถนนรถแน่น** / **Busy road**, **ถนนโล่ง** / **Quiet road**.
- **The gesture room's log had no name on the page.** The manual said read the `log`, and the page had an empty black field with nothing written on it. The log now carries the house's own readout label — `บันทึก` / **Log** — so the part the instruction names is a part the reader can see.

A third chip failed later, and it was the sharpest one in the release: the /cameras manual named `Point the machine`, and that button lives in the atlas list, **2415 px above the manual in a different chapter**. The string was on the page, so every string-based check passed — but the reader was told to press a button that was not on screen. The fix was to move the manual, not to reword it.

After the fixes, every named part in every manual names something that appears on its page. Measured on the live site with the language set outright rather than by clicking the toggle — the site takes its language from the browser locale on the first visit and keeps it, so a toggle click walks th → en → zh and lands somewhere else entirely — **78 named parts across seven rooms in two languages: 72 resolve to something visible, 62 of them a button, 9 a field or a checkbox label, 1 a readout (`บันทึก` / **Log**).** Every chip is **one indivisible box** that fits the viewport at every width.

The six that do not resolve are three controls seen twice, and they are the same three in both languages: `ฉันใกล้กว่า` / **I was closer** and `เครื่องใกล้กว่า` / **The machine was closer** appear after a round is played, and `ค้างภาพใหม่แล้วให้ทาย` / **Hold a new frame & guess** is a button that stays disabled until a picture is open. All three are in the markup with those exact labels (`public/games.html:87`, `public/train.html:45`). That is not a defect: the step before them is the one that produces the control.

**How far is the control from the step that names it?** Measured on the phone, in Thai, on the published site, for every chip in every manual, against the nearest visible control carrying the same words: /train `▶ เริ่มเกมนี้` / **▶ Start this game** 5372 px, /games `+` 2069 px, /train `+ เพิ่มตัวอย่าง` / **+ Add example** 1770 px, /gesture `+ เพิ่มตัวอย่าง` 1621 px, /gesture `เปิดใช้การกระทำ` / **Arm the actions** 1021 px, /focus `ตั้งท่าปกติใหม่` / **Recalibrate** 762 px, /gesture `ใช้กล้องของฉัน` / **Use my camera** 758 px, /games `เริ่มเกม` / **Start** 785 px, /games `นับยานพาหนะ` / **Count vehicles** 726 px, /focus `ยินยอมและเริ่ม` / **Agree & start** 516 px, /cameras `ให้เครื่องมอง` / **Point the machine** 493 px. Every one resolves **on its own page**; none crosses a section boundary. That boundary is the release's rule — a manual may name a control further down its own room, because that is what a printed instruction sheet does, but it may not name one in a different chapter. The distance itself is the next release's work.

## The four partial failures, fixed

- **/focus** — the setup column became a five-step manual, and the three numbered headings went with it (the manual carries the numbering). The mood rating is now a step whose purpose is stated: the camera cannot know your mood, you tell it yourself, and those notes do not change the measurements. **The session buttons moved out of the instrument column into the column that names them** — "Agree & start" sat at x=46, under a 530 px black panel, and is now at x=854 beside the step that names it: **808 px closer to the instruction that tells the reader to press it.** (The first draft of this record also claimed the button was "below the fold on a tablet". It was not: at 1024 × 768 it sat at y=709, on screen with 59 px to spare. The distance was the real problem.)
- **/colour** — the rating step now says what it is for: your word exists to be compared with other people's, it is not a score for you.
- **/research** — the three methods each got a manual: show the answers; group by shape then by colour; let the robot choose three times.
- **/home** — nothing to add. Recorded above.

## Spatial hallucination, measured

MSH is now wired into `AGENTS.md` and `ANTI-SLOP.md`, with the full law in `MSH.md`. Applying it to this release's own work found seven things:

| Found | Measure | Changed |
|---|---|---|
| **The manuals were in the narrow column.** The chapter grid is `0.6fr` / `2fr`; a manual dropped into the chapter header landed in the 305 px column at 1440 and the 217 px column at 1024. | 305 × 505, 5 lines per step | The manuals moved into the chapter body — the wide column. /gesture now measures 489 × 343, 2 lines per step. |
| **A named part forced the page wider than the screen.** `white-space: nowrap` on the chip; "Add this answer to the shared result" pushed /colour to a 418 px scroll width at 390. | scrollWidth 418 > 390 | The chip never breaks *inside*. When it does not fit the line it drops to its own line instead. Overflow 0 at every width. |
| **The game picker ran past its content.** The plate was a full-width black band; at 1440 it ran 940 px past the last button, and on a phone the wrapped row left an orphan band under it. | 940 px of empty plate | The picker is an instrument strip: it hugs its choices, sits on the page gutter, and scrolls inside itself. |
| **The session buttons were scattered from the steps that name them.** | 808 px, measured: x=46 → x=854 | Moved into the setup column, under the consent they depend on. |
| **The instruction sheet was wider than its own text.** `max-width: 64ch` resolved against an inherited 22 px, so the plate was 845 px holding a 350 px line. | 845 px, 2.4× its content | The measure is set at the reading size, and then the content decides the width: 62ch is the cap, not the width. /colour's plate is 372 px. |
| **The named part created two font sizes that existed nowhere else.** A scaled chip is 15.2 px in the body and 11.9 px inside a warning. | /gesture 7 → 9 sizes, /focus 8 → 9 | The chip wears the house's small mono instead of scaling. Measured across all fifteen rooms, the full size inventory is **identical** to 1.20.2 — the manual adds no size to any page — and /focus loses one. |
| **Every step row was a stretched band.** The plate was a fixed 62ch field, so a row held its text and nothing else — step 4 of /colour is 209 px of Thai in a 595 px field. | 595 px row, 209 px of text | The plate is as wide as its own longest step and the measure only caps it. /colour 372 px, /research 379 px, /train 470 px, /gesture 489 px, /focus 498 px, /games 556 px. |

Three systemic findings are **measured and recorded, not fixed here**, because a change to the composition of all 27 pages is its own release with its own baseline and its own review. All three were measured on the published site in one pass, and the numbers here are that pass's:

- **The page head is a stretched row.** `.page-head` is `1.618fr` / `1fr` with the standfirst pushed to the far right. At 1440 the standfirst starts at **x=888 on every room that has one**, and the title's text ends at 214–721 depending on the room, so the gap between the title and the sentence that explains it runs **167 px (/drive) to 674 px (/colour)**. On a 390 × 844 phone the head is **186 px (/train) to 416 px (/learn)** — 22 % to 49 % of the screen before the page's work begins.
- **The nav is two stacked bands** on /cameras, /games, /learn and /train: the main nav and the path bar. Measured at 1440 the rail is 56 px and the path bar 56 px, so **112 px** of chrome before the page's work; at 390 the rail is 100 px and the path bar 49 px, so **149 px**. Two bands where one coherent group would do.
- **The chapter track is wider than the card in it.** The manual's plate is as wide as its own longest step — 372 px on /colour, 429 px on /cameras — and it sits in a grid track of **1017 px** on /colour, /cameras, /games and /train. The gap beside the card runs **30 px (/train's first manual) to 645 px (/colour)**. The card no longer stretches; the track beside it still does, and the honest note is that fixing the card made the void beside it larger, not smaller: /colour's plate was 595 px before this change, so the same track held 422 px of nothing and now holds 645. Same class as the two above: a change to the chapter grid is its own release.

All three are the next release's work, with these numbers as the baseline.

## The independent review

The house rule is that a designer does not review their own work. A separate agent read `MSH.md`, `ANTI-SLOP.md` and this record, read the 28 screenshots, and drove the live tree at 1.21.0 against the 1.20.2 baseline at 390, 1024 and 1440 with the catalogue loaded. It returned **PARTIAL**: /focus, /colour and /research passed; /gesture, /train, /cameras and /games needed work. Its findings are the ones that mattered — **nine of them, and all nine are fixed here.**

**Found** — the reviewer's list, with the task cost it measured:

| Found | Where | Task cost |
|---|---|---|
| The "quiet line" under the teaching chooser was the fifth cell of a still-five-column grid — a 268 × 165 px tile-shaped hole | /train, every width | The reader saw a fifth *choice* that was a sentence |
| The title and the sentence that explains it were separated by 262 px of ivory | /cameras | The room's first sentence sat a third of a screen below its title |
| The selected game was ivory on ivory — byte-identical to the page ground | /games | The picker could not say which game was on screen |
| The picker ran out of the page gutter | /games, 390 | A black field touched the edge of the screen |
| The manual named `Point the machine`, a button **2415 px above it in another chapter** | /cameras | The reader was told to press a button that was not on screen |
| The named part broke into two boxes at every width — "4 Motion" became a chip `4` and a chip `Motion` | all seven | The release's central promise is that the chip carries the control's exact words |
| The line the release added was 152 characters of monospace | /train | A new rule-2 breach, 1.44× the line the release removed |
| The two dropdowns that make the gesture room work were never named | /gesture | A reader following the five steps literally never learns a pose must be picked |
| The finished manual was itself a stretch-to-fill example | /colour, /train | The release's own component broke the house's own rule 9 |

**Changed** — the grid is four columns and the line is a line again; the title and its explanation sit together; the selected game is Jasper on black; the picker sits on the gutter and scrolls inside itself; the manual moved to the atlas and chapter C got its own bench manual; the chip is one indivisible box that drops to its own line rather than breaking; the long line is capped at 58ch; step 1 of the gesture manual now names the actions list; and the plate is as wide as its own longest step.

**Verified** — 27 routes × 390 / 1024 / 1440 = 81 combinations plus the three `/404` ones: status 200 (404 for the 404), no horizontal overflow, no console error, `?v=1.21.0` on all 468 assets. The linter sits at its 1.20.2 baseline on all seven manual rooms. Eleven tests pin the component, and each pin was checked by **injecting the bug it claims to catch** and watching it fail.

The type scale was measured two ways, because the two disagree and the disagreement is the point. **The full-document inventory** — every element that carries a computed font size, on all fifteen rooms — is **identical on both trees**, except /focus, which loses one: the three numbered headings the manual replaced, at 18 px. **The linter's own count** differs on four rooms, because it only measures the first two viewports of a page: /cameras 5 → 6 and /research 9 → 10 as the manual's `--fine` warning line moves up into the window, and /focus 8 → 7 and /train 12 → 10 as the removed headings and the old `.howto` sizes leave it. **No page gained a size that was not already in its own inventory.**

**Remaining** — honest, and none of it is hidden:

- **A named control is still a scroll away.** Measured on the phone in Thai, on the published site: /train `▶ Start this game` 5372 px, /games `+` 2069 px, /gesture `+ Add example` 1621 px, /gesture `Arm the actions` 1021 px, /focus `Recalibrate` 762 px, /games `Start` 785 px, /cameras `Point the machine` 493 px. Every one of them resolves **on its own page** and none crosses a section boundary — that was the release's rule, and it holds. The distance itself is the next release's work.
- **The chapter track is 1017 px around a card that is 372 px**, and the gap beside the card reaches 645 px on /colour. The card no longer stretches; the track beside it still does. **Fixing the card made the void beside it bigger, not smaller** — /colour's plate was 595 px before, so the same track held 422 px of nothing and now holds 645. That trade is the honest cost of sizing the card by its content, and it is recorded rather than hidden. Same class as the page head and the nav.
- **The pin "a named part names something on the page" is a substring test** over the markup and the scripts, not a check against a rendered control — so it cannot catch a chip that names a control in another section. The /cameras chip was fixed by moving the manual, not by making the test clever. The test is still worth widening.
- **Full-resolution IOC originals remain in the public history.** Carried since 1.18.0; removing them needs a destructive `git filter-repo` rewrite, which is the author's call.

## What the instrument says

The linter was run over all 27 routes twice — once against the 1.20.2 tree in a worktree, once against this one — and compared route by route.

**68 points before, 68 points after, Δ0, and no route changed verdict.** The house's threshold is 6 and there are no SLOP routes in either. Adding seven manuals and simplifying three rooms cost the site **no** linter points at all, and that is the number worth stating: the instruction sheets did not become slop.

Room by room, on the seven rooms that carry a manual:

| Room | 1.20.2 | 1.21.0 | Changed |
|---|---|---|---|
| /colour | OK 2 | OK 2 | — |
| /focus | OK 2 | OK 2 | — |
| /games | OK 2 | OK 2 | — |
| /cameras | REVIEW 4 | REVIEW 4 | — |
| /research | REVIEW 3 | REVIEW 3 | — |
| /train | REVIEW 3 | REVIEW 3 | — |
| /gesture | REVIEW 4 | REVIEW 4 | one fewer stretch example: the "■ พักไว้ก่อน" button de-stretched from 341 px to its content width |

The three regressions the first pass did introduce were found by comparing against the baseline rather than by reading a score, and all three are fixed:

- the instruction sheet measured at 845 px for a 350 px line (the `ch` unit resolving against an inherited 22 px),
- the named part creating a 15.2 px and an 11.9 px size that existed nowhere else, pushing /gesture and /focus over the nine-size threshold, and
- the finished plate itself becoming a stretch-to-fill example: /colour and /train were picking up the house's own rule 9 from the manual's own step rows, because a fixed 62ch field holds a short step in a wide band.

The third is the one worth remembering. The fix for "the sheet was wider than its text" — 845 px → 595 px — did not remove the stretch, it only made it less visible: the chip got smaller, so the row's content got narrower, so the gap between them got wider. **A linter's "type-chaos" flag says almost nothing about this; a baseline measurement says exactly what it is.**
